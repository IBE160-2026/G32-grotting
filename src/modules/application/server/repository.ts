import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { z } from "zod";
import type { Gap } from "@/modules/gaps/contracts";
import type { Letter, LetterCheck } from "@/modules/letter/contracts";
import type { AnalysisResult } from "@/modules/match/contracts";
import { openSection, type Section } from "@/shared/server/crypto";
import {
  APPLICATIONS_PAGE_SIZE,
  type ApplicationEntry,
  type ApplicationList,
} from "../contracts";
import { applications } from "./schema";

// The database or the `tx` of a transaction (AD-10).
export type Executor = PgDatabase<PgQueryResultHKT>;

// The version of the data inside every encrypted section (AD-11). One constant
// for all five: they change together or not at all.
export const SECTION_VERSION = 1;

function section(data: unknown): Section {
  return { available: true, contractVersion: SECTION_VERSION, data };
}

// What phase 1 saves of the Job. The CV text is never part of it.
export type JobSection = {
  readonly jobAd: string;
  readonly jobTitle: string;
  readonly employer: string;
};

export type SaveAnalysisInput = {
  readonly id: string;
  readonly fingerprint: string;
  readonly job: JobSection;
  readonly analysis: AnalysisResult;
};

export type SaveAnalysisResult =
  | { readonly status: "saved" | "unchanged"; readonly seq: number }
  | { readonly status: "foreign" };

const SEQ_ATTEMPTS = 5;
const UNIQUE_VIOLATION = "23505";
const SEQ_CONSTRAINT = "applications_student_id_seq_unique";

// postgres-js and PGlite errors carry the SQLSTATE `code`; Drizzle may wrap
// them, so `.cause` is followed. A named constraint must be the `seq` one.
export function isSeqConflict(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Object; depth++) {
    const record = current as Record<string, unknown>;
    if (record.code === UNIQUE_VIOLATION) {
      const constraint = record.constraint_name ?? record.constraint;
      return constraint === undefined || constraint === SEQ_CONSTRAINT;
    }
    current = record.cause;
  }
  return false;
}

// AD-8: phase 1 as one conditional upsert. A new id inserts a row whose `seq`
// is the Student's highest plus one, from a subquery in the same statement. An
// existing id of this Student with another fingerprint has its inputs replaced
// and its AI parts cleared (the `seq` stays); the same fingerprint changes
// nothing, so a double submit is a no-op. An id that belongs to another Student
// writes nothing and is `foreign`, the same answer as an unknown id would be
// for a read. A `(student_id, seq)` collision with a concurrent save is retried.
export async function saveAnalysis(
  studentId: string,
  db: Executor,
  input: SaveAnalysisInput,
): Promise<SaveAnalysisResult> {
  const job = section(input.job);
  const analysis = section(input.analysis);
  for (let attempt = 1; ; attempt++) {
    try {
      const [written] = await db
        .insert(applications)
        .values({
          id: input.id,
          studentId,
          job,
          analysis,
          fingerprint: input.fingerprint,
          matchScore: input.analysis.score,
          seq: sql`(select coalesce(max(${applications.seq}), 0) + 1 from ${applications} where ${applications.studentId} = ${studentId})`,
        })
        .onConflictDoUpdate({
          target: applications.id,
          set: {
            job: sql`excluded.job`,
            analysis: sql`excluded.analysis`,
            fingerprint: sql`excluded.fingerprint`,
            matchScore: sql`excluded.match_score`,
            letter: sql`null`,
            gaps: sql`null`,
            letterCheck: sql`null`,
            letterRev: sql`0`,
            gapsRev: sql`0`,
            updatedAt: sql`now()`,
          },
          setWhere: sql`${applications.fingerprint} <> excluded.fingerprint and ${applications.studentId} = excluded.student_id`,
        })
        .returning({ seq: applications.seq });
      if (written !== undefined) return { status: "saved", seq: written.seq };
      const [existing] = await db
        .select({ seq: applications.seq })
        .from(applications)
        .where(
          and(
            eq(applications.id, input.id),
            eq(applications.studentId, studentId),
          ),
        )
        .limit(1);
      return existing === undefined
        ? { status: "foreign" }
        : { status: "unchanged", seq: existing.seq };
    } catch (error) {
      if (attempt >= SEQ_ATTEMPTS || !isSeqConflict(error)) throw error;
    }
  }
}

export type ApplicationMeta = {
  readonly id: string;
  readonly seq: number;
  readonly fingerprint: string;
  readonly letterRev: number;
  readonly gapsRev: number;
};

// The plain columns of one Application, found by `(id, studentId)`; nothing is
// decrypted. Null for a missing row and for another Student's row alike.
export async function getApplicationMeta(
  studentId: string,
  db: Executor,
  id: string,
): Promise<ApplicationMeta | null> {
  const [row] = await db
    .select({
      id: applications.id,
      seq: applications.seq,
      fingerprint: applications.fingerprint,
      letterRev: applications.letterRev,
      gapsRev: applications.gapsRev,
    })
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.studentId, studentId)))
    .limit(1);
  return row ?? null;
}

// The number the Student's next Application will get: highest plus one.
export async function nextSeq(
  studentId: string,
  db: Executor,
): Promise<number> {
  const [row] = await db
    .select({
      next: sql<number>`coalesce(max(${applications.seq}), 0)::int + 1`,
    })
    .from(applications)
    .where(eq(applications.studentId, studentId));
  return row?.next ?? 1;
}

type Target = {
  readonly id: string;
  readonly fingerprint: string;
};

// Writes the Letter with the rev the client works with (`letter.rev`, the
// request's `previousRev` plus one), only while the row is the Student's and
// still holds the analysis this request was made for. The rev is written, not
// incremented, so it stays equal to the client's after a resubmit or a failed
// write. True when a row changed.
export async function saveLetter(
  studentId: string,
  db: Executor,
  target: Target,
  letter: Letter,
): Promise<boolean> {
  const rows = await db
    .update(applications)
    .set({
      letter: section(letter),
      letterRev: letter.rev,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(applications.id, target.id),
        eq(applications.studentId, studentId),
        eq(applications.fingerprint, target.fingerprint),
      ),
    )
    .returning({ id: applications.id });
  return rows.length > 0;
}

// As `saveLetter`, for the Gap analysis: `gapsRev` is the client's counter after
// this analysis (its `previousRev` plus one).
export async function saveGaps(
  studentId: string,
  db: Executor,
  target: Target & { readonly gapsRev: number },
  gaps: readonly Gap[],
): Promise<boolean> {
  const rows = await db
    .update(applications)
    .set({
      gaps: section(gaps),
      gapsRev: target.gapsRev,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(applications.id, target.id),
        eq(applications.studentId, studentId),
        eq(applications.fingerprint, target.fingerprint),
      ),
    )
    .returning({ id: applications.id });
  return rows.length > 0;
}

// Stores the Letter check only while both revs are the ones the check was made
// for; a Letter or Gap analysis written since makes it stale and nothing is
// stored.
export async function saveLetterCheck(
  studentId: string,
  db: Executor,
  target: Target & { readonly letterRev: number; readonly gapsRev: number },
  check: LetterCheck,
): Promise<boolean> {
  const rows = await db
    .update(applications)
    .set({ letterCheck: section(check), updatedAt: sql`now()` })
    .where(
      and(
        eq(applications.id, target.id),
        eq(applications.studentId, studentId),
        eq(applications.fingerprint, target.fingerprint),
        eq(applications.letterRev, target.letterRev),
        eq(applications.gapsRev, target.gapsRev),
      ),
    )
    .returning({ id: applications.id });
  return rows.length > 0;
}

// Story 6.8: what Historikk reads. Only the Student's own rows, found by
// `student_id` taken from the session. The register shows the job title and the
// employer (`job`) and the score counts (`analysis`), so those two sections are
// decrypted here on the server and only those fields leave it: the Job ad, the
// keyword lists, the Gaps and the Letter text stay out of the answer. The
// Letter is only tested for existence (`letter is not null`), never read.
const jobTitleSchema = z.object({
  jobTitle: z.string(),
  employer: z.string(),
});
const countsSchema = z.object({
  matchedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().positive(),
});

export async function listApplications(
  studentId: string,
  db: Executor,
  page: number,
  pageSize: number = APPLICATIONS_PAGE_SIZE,
): Promise<ApplicationList> {
  const [summary] = await db
    .select({
      total: sql<number>`count(*)::int`,
      firstSeq: sql<number | null>`min(${applications.seq})`,
      lastSeq: sql<number | null>`max(${applications.seq})`,
    })
    .from(applications)
    .where(eq(applications.studentId, studentId));
  const rows = await db
    .select({
      id: applications.id,
      seq: applications.seq,
      createdAt: applications.createdAt,
      matchScore: applications.matchScore,
      job: applications.job,
      analysis: applications.analysis,
      hasLetter: sql<boolean>`${applications.letter} is not null`,
    })
    .from(applications)
    .where(eq(applications.studentId, studentId))
    .orderBy(desc(applications.seq))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const entries: ApplicationEntry[] = rows.map((row) => {
    const job = openSection(row.job, (data) => jobTitleSchema.parse(data));
    const counts = openSection(row.analysis, (data) =>
      countsSchema.parse(data),
    );
    return {
      id: row.id,
      seq: row.seq,
      createdAt: row.createdAt.toISOString(),
      score: row.matchScore,
      matchedCount: counts.available ? counts.value.matchedCount : null,
      totalCount: counts.available ? counts.value.totalCount : null,
      jobTitle: job.available ? job.value.jobTitle : null,
      employer: job.available ? job.value.employer : null,
      hasLetter: row.hasLetter === true,
    };
  });
  return {
    page,
    pageSize,
    total: summary?.total ?? 0,
    firstSeq: summary?.firstSeq ?? null,
    lastSeq: summary?.lastSeq ?? null,
    entries,
  };
}

// How many entries the Student has, for the app bar; nothing is decrypted.
export async function countApplications(
  studentId: string,
  db: Executor,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(applications)
    .where(eq(applications.studentId, studentId));
  return row?.total ?? 0;
}

// The stored Letter text of one entry, found by `(id, studentId)`; the sign-off
// token is still in it. Null for a missing row, another Student's row, a row
// without a Letter and a Letter that cannot be read: the caller cannot tell
// them apart. Nothing else of the row is selected or decrypted.
export async function getApplicationLetterText(
  studentId: string,
  db: Executor,
  id: string,
): Promise<string | null> {
  const [row] = await db
    .select({ letter: applications.letter })
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.studentId, studentId)))
    .limit(1);
  if (row === undefined || row.letter === null) return null;
  const opened = openSection(row.letter, (data) =>
    z.object({ text: z.string() }).parse(data),
  );
  return opened.available ? opened.value.text : null;
}
