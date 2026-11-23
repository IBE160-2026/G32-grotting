import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Gap } from "@/modules/gaps/contracts";
import type { Letter, LetterCheck } from "@/modules/letter/contracts";
import type { AnalysisResult } from "@/modules/match/contracts";
import { closeDb, getDb } from "@/shared/server/db";
import {
  type Executor,
  getApplicationMeta,
  isSeqConflict,
  nextSeq,
  type SaveAnalysisInput,
  SECTION_VERSION,
  saveAnalysis,
  saveGaps,
  saveLetter,
  saveLetterCheck,
} from "./repository";
import { applications } from "./schema";

// Story 6.7: the Application repository against PGlite (migrations applied).

afterAll(closeDb);

function rowsOf(result: unknown): Record<string, unknown>[] {
  return (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as Record<string, unknown>[];
}

// `students` belongs to identity: this slice's tests make one with plain SQL.
let counter = 0;
async function newStudent(): Promise<string> {
  const db = await getDb();
  const result = await db.execute(
    sql`insert into students (email, password_hash) values (${`app${++counter}@example.test`}, 'x') returning id`,
  );
  return String(rowsOf(result)[0]?.id);
}

let idCounter = 0;
function newId(): string {
  return `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`;
}

function analysisOf(
  score: number,
  term = "Kubernetesplattform",
): AnalysisResult {
  return {
    keywordSource: "code",
    score,
    matchedCount: 1,
    totalCount: 2,
    adParagraphs: 3,
    formula: { key: "MATCH_FORMULA", params: { matched: 1, total: 2, score } },
    matched: [
      {
        term,
        stage: "exact",
        positions: [],
        evidence: {
          stage: "exact",
          line: 1,
          text: `Erfaring med ${term}`,
          start: 0,
          end: 5,
        },
      },
    ],
    missing: [],
  } as unknown as AnalysisResult;
}

function inputFor(
  id: string,
  fingerprint = "fp-1",
  score = 71,
): SaveAnalysisInput {
  return {
    id,
    fingerprint,
    job: {
      jobAd: "Vi søker en Hemmeligstilling-utvikler med Kubernetes.",
      jobTitle: "Hemmeligstilling",
      employer: "Skjult Arbeidsgiver AS",
    },
    analysis: analysisOf(score),
  };
}

const LETTER: Letter = {
  text: "Kjære Skjult Arbeidsgiver, jeg skriver et hemmeligbrev.",
  tone: "Formell",
  rev: 1,
};
const GAPS: Gap[] = [
  {
    keyword: "Hemmeliggap",
    kind: "real",
    explanation: { key: "REAL_GAP", params: { keyword: "Hemmeliggap" } },
    citation: null,
    suggestion: null,
  },
];
const CHECK = (letterRev: number, gapsRev: number): LetterCheck => ({
  flags: [
    { kind: "UNSUPPORTED_CLAIM", term: "Hemmeligflagg", word: "x", spans: [] },
  ],
  letterRev,
  gapsRev,
});

async function rowOf(id: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id));
  return row;
}

describe("Story 6.7 saveAnalysis", () => {
  it("saves a first Application as seq 1 with the score and no AI parts", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const id = newId();
    expect(await saveAnalysis(studentId, db, inputFor(id, "fp-1", 71))).toEqual(
      { status: "saved", seq: 1 },
    );
    const row = await rowOf(id);
    expect(row).toMatchObject({
      id,
      studentId,
      seq: 1,
      matchScore: 71,
      fingerprint: "fp-1",
      letter: null,
      gaps: null,
      letterCheck: null,
      letterRev: 0,
      gapsRev: 0,
    });
    expect(row?.job).toEqual({
      available: true,
      contractVersion: SECTION_VERSION,
      data: inputFor(id).job,
    });
    expect(row?.analysis).toMatchObject({
      available: true,
      data: { score: 71 },
    });
  });

  it("numbers the Student's next Application max plus one, per Student", async () => {
    const db = await getDb();
    const a = await newStudent();
    const b = await newStudent();
    expect(await nextSeq(a, db)).toBe(1);
    await saveAnalysis(a, db, inputFor(newId()));
    expect(await saveAnalysis(a, db, inputFor(newId()))).toEqual({
      status: "saved",
      seq: 2,
    });
    expect(await nextSeq(a, db)).toBe(3);
    expect(await saveAnalysis(b, db, inputFor(newId()))).toEqual({
      status: "saved",
      seq: 1,
    });
    expect(await nextSeq(b, db)).toBe(2);
  });

  it("changes nothing on a true double submit and answers the row's own seq", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const id = newId();
    await saveAnalysis(studentId, db, inputFor(id));
    await saveAnalysis(studentId, db, inputFor(newId()));
    const before = rowsOf(
      await db.execute(sql`select * from applications where id = ${id}`),
    );
    expect(await saveAnalysis(studentId, db, inputFor(id))).toEqual({
      status: "unchanged",
      seq: 1,
    });
    const after = rowsOf(
      await db.execute(sql`select * from applications where id = ${id}`),
    );
    expect(after).toEqual(before);
  });

  it("replaces the inputs and clears the AI parts when the fingerprint changes, keeping seq", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await saveAnalysis(studentId, db, inputFor(newId()));
    const id = newId();
    await saveAnalysis(studentId, db, inputFor(id, "fp-1", 71));
    const target = { id, fingerprint: "fp-1" };
    await saveLetter(studentId, db, target, LETTER);
    await saveGaps(studentId, db, { ...target, gapsRev: 1 }, GAPS);
    await saveLetterCheck(
      studentId,
      db,
      { ...target, letterRev: 1, gapsRev: 1 },
      CHECK(1, 1),
    );
    const full = await rowOf(id);
    expect(full?.letter).not.toBeNull();
    expect(full?.gaps).not.toBeNull();
    expect(full?.letterCheck).not.toBeNull();

    expect(await saveAnalysis(studentId, db, inputFor(id, "fp-2", 40))).toEqual(
      { status: "saved", seq: 2 },
    );
    const row = await rowOf(id);
    expect(row).toMatchObject({
      seq: 2,
      fingerprint: "fp-2",
      matchScore: 40,
      letter: null,
      gaps: null,
      letterCheck: null,
      letterRev: 0,
      gapsRev: 0,
    });
    expect(row?.analysis).toMatchObject({ data: { score: 40 } });
  });

  it("writes nothing for an id that is another Student's", async () => {
    const db = await getDb();
    const a = await newStudent();
    const b = await newStudent();
    const id = newId();
    await saveAnalysis(b, db, inputFor(id, "fp-b", 55));
    const before = rowsOf(
      await db.execute(sql`select * from applications where id = ${id}`),
    );
    // Same and different fingerprints alike: no leak, no write.
    expect(await saveAnalysis(a, db, inputFor(id, "fp-b", 99))).toEqual({
      status: "foreign",
    });
    expect(await saveAnalysis(a, db, inputFor(id, "fp-a", 99))).toEqual({
      status: "foreign",
    });
    expect(
      rowsOf(
        await db.execute(sql`select * from applications where id = ${id}`),
      ),
    ).toEqual(before);
    expect(await nextSeq(a, db)).toBe(1);
  });

  it("gives two simultaneous saves of one Student different numbers", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const results = await Promise.all(
      [1, 2, 3, 4].map(() => saveAnalysis(studentId, db, inputFor(newId()))),
    );
    const seqs = results.map((r) => (r.status === "foreign" ? -1 : r.seq));
    expect(new Set(seqs).size).toBe(4);
    expect([...seqs].sort()).toEqual([1, 2, 3, 4]);
  });
});

// An executor whose first inserts fail the way a lost `(student_id, seq)` race
// does; every later call is the real one.
function failingInserts(real: Executor, error: unknown, times: number) {
  let left = times;
  let calls = 0;
  const wrapped = new Proxy(real, {
    get(target, prop) {
      if (prop === "insert") {
        return (...args: Parameters<Executor["insert"]>) => {
          calls++;
          if (left-- > 0) {
            return {
              values: () => ({
                onConflictDoUpdate: () => ({
                  returning: async () => {
                    throw error;
                  },
                }),
              }),
            };
          }
          return target.insert(...args);
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { db: wrapped as Executor, calls: () => calls };
}

describe("Story 6.7 seq retry", () => {
  const uniqueViolation = Object.assign(new Error("duplicate key"), {
    code: "23505",
    constraint_name: "applications_student_id_seq_unique",
  });

  it("retries a unique violation on (student_id, seq)", async () => {
    const real = await getDb();
    const studentId = await newStudent();
    const { db, calls } = failingInserts(real, uniqueViolation, 1);
    expect(await saveAnalysis(studentId, db, inputFor(newId()))).toEqual({
      status: "saved",
      seq: 1,
    });
    expect(calls()).toBe(2);
  });

  it("finds the violation under a Drizzle wrapper's cause", async () => {
    const real = await getDb();
    const studentId = await newStudent();
    const wrapped = new Error("Failed query", { cause: uniqueViolation });
    const { db } = failingInserts(real, wrapped, 2);
    expect(await saveAnalysis(studentId, db, inputFor(newId()))).toMatchObject({
      status: "saved",
    });
  });

  it("gives up after a few attempts", async () => {
    const real = await getDb();
    const studentId = await newStudent();
    const { db, calls } = failingInserts(real, uniqueViolation, 100);
    await expect(saveAnalysis(studentId, db, inputFor(newId()))).rejects.toBe(
      uniqueViolation,
    );
    expect(calls()).toBeLessThan(10);
  });

  it("propagates any other error at once", async () => {
    const real = await getDb();
    const studentId = await newStudent();
    const other = Object.assign(new Error("connection lost"), {
      code: "08006",
    });
    const { db, calls } = failingInserts(real, other, 1);
    await expect(saveAnalysis(studentId, db, inputFor(newId()))).rejects.toBe(
      other,
    );
    expect(calls()).toBe(1);
    const otherConstraint = Object.assign(new Error("duplicate"), {
      code: "23505",
      constraint_name: "applications_pkey",
    });
    const second = failingInserts(real, otherConstraint, 1);
    await expect(
      saveAnalysis(studentId, second.db, inputFor(newId())),
    ).rejects.toBe(otherConstraint);
    expect(second.calls()).toBe(1);
  });
});

describe("Story 6.7 isSeqConflict with the real driver", () => {
  const section = { available: true, contractVersion: 1, data: {} } as const;
  const row = (id: string, studentId: string, seq: number) => ({
    id,
    studentId,
    job: section,
    analysis: section,
    fingerprint: "fp",
    seq,
    matchScore: 1,
  });

  async function violation(run: () => Promise<unknown>): Promise<unknown> {
    try {
      await run();
    } catch (error) {
      return error;
    }
    throw new Error("expected a unique violation");
  }

  it("recognises a real unique violation on (student_id, seq)", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await db.insert(applications).values(row(newId(), studentId, 1));
    const error = await violation(() =>
      db.insert(applications).values(row(newId(), studentId, 1)),
    );
    expect(isSeqConflict(error)).toBe(true);
  });

  it("does not take a violation of the primary key for a seq conflict", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const id = newId();
    await db.insert(applications).values(row(id, studentId, 1));
    const error = await violation(() =>
      db.insert(applications).values(row(id, studentId, 2)),
    );
    expect(isSeqConflict(error)).toBe(false);
  });
});

describe("Story 6.7 getApplicationMeta", () => {
  it("finds the Student's own row by plain columns and nobody else's", async () => {
    const db = await getDb();
    const a = await newStudent();
    const b = await newStudent();
    const id = newId();
    await saveAnalysis(a, db, inputFor(id, "fp-1"));
    expect(await getApplicationMeta(a, db, id)).toEqual({
      id,
      seq: 1,
      fingerprint: "fp-1",
      letterRev: 0,
      gapsRev: 0,
    });
    // Another Student's row and a missing row are the same answer.
    expect(await getApplicationMeta(b, db, id)).toBeNull();
    expect(await getApplicationMeta(a, db, newId())).toBeNull();
  });
});

describe("Story 6.7 phase-2 writes", () => {
  async function saved(fingerprint = "fp-1") {
    const db = await getDb();
    const studentId = await newStudent();
    const id = newId();
    await saveAnalysis(studentId, db, inputFor(id, fingerprint));
    return { db, studentId, id, target: { id, fingerprint } };
  }

  it("writes the Letter and counts it; a second write counts again", async () => {
    const { db, studentId, id, target } = await saved();
    expect(await saveLetter(studentId, db, target, LETTER)).toBe(true);
    let row = await rowOf(id);
    expect(row?.letterRev).toBe(1);
    expect(row?.letter).toEqual({
      available: true,
      contractVersion: SECTION_VERSION,
      data: LETTER,
    });
    await saveLetter(studentId, db, target, { ...LETTER, rev: 2 });
    row = await rowOf(id);
    expect(row?.letterRev).toBe(2);
    expect(row?.gapsRev).toBe(0);
  });

  it("writes the Gaps and counts them", async () => {
    const { db, studentId, id, target } = await saved();
    expect(await saveGaps(studentId, db, { ...target, gapsRev: 1 }, GAPS)).toBe(
      true,
    );
    const row = await rowOf(id);
    expect(row?.gapsRev).toBe(1);
    expect(row?.letterRev).toBe(0);
    expect(row?.gaps).toMatchObject({ available: true, data: GAPS });
  });

  it("stores the client's rev, not a count, so a repeated write keeps it", async () => {
    const { db, studentId, id, target } = await saved();
    await saveLetter(studentId, db, target, LETTER);
    await saveLetter(studentId, db, target, LETTER);
    await saveGaps(studentId, db, { ...target, gapsRev: 1 }, GAPS);
    await saveGaps(studentId, db, { ...target, gapsRev: 1 }, GAPS);
    const row = await rowOf(id);
    expect(row?.letterRev).toBe(1);
    expect(row?.gapsRev).toBe(1);
  });

  it("writes nothing when the fingerprint is not the row's, or the Student is another", async () => {
    const { db, studentId, id } = await saved("fp-1");
    const other = await newStudent();
    const stale = { id, fingerprint: "fp-old" };
    expect(await saveLetter(studentId, db, stale, LETTER)).toBe(false);
    expect(await saveGaps(studentId, db, { ...stale, gapsRev: 1 }, GAPS)).toBe(
      false,
    );
    const own = { id, fingerprint: "fp-1" };
    expect(await saveLetter(other, db, own, LETTER)).toBe(false);
    expect(await saveGaps(other, db, { ...own, gapsRev: 1 }, GAPS)).toBe(false);
    expect(
      await saveLetterCheck(
        other,
        db,
        { ...own, letterRev: 0, gapsRev: 0 },
        CHECK(0, 0),
      ),
    ).toBe(false);
    const row = await rowOf(id);
    expect(row).toMatchObject({
      letter: null,
      gaps: null,
      letterCheck: null,
      letterRev: 0,
      gapsRev: 0,
    });
  });

  it("stores the check only while both revs are the row's", async () => {
    const { db, studentId, id, target } = await saved();
    await saveLetter(studentId, db, target, LETTER);
    await saveGaps(studentId, db, { ...target, gapsRev: 1 }, GAPS);
    const stale = [
      { letterRev: 0, gapsRev: 1 },
      { letterRev: 1, gapsRev: 0 },
      { letterRev: 2, gapsRev: 1 },
    ];
    for (const revs of stale) {
      expect(
        await saveLetterCheck(
          studentId,
          db,
          { ...target, ...revs },
          CHECK(revs.letterRev, revs.gapsRev),
        ),
      ).toBe(false);
    }
    expect((await rowOf(id))?.letterCheck).toBeNull();
    expect(
      await saveLetterCheck(
        studentId,
        db,
        { ...target, letterRev: 1, gapsRev: 1 },
        CHECK(1, 1),
      ),
    ).toBe(true);
    expect((await rowOf(id))?.letterCheck).toMatchObject({
      available: true,
      data: CHECK(1, 1),
    });
    // A new Letter makes the stored check stale for the next write only.
    await saveLetter(studentId, db, target, { ...LETTER, rev: 2 });
    expect(
      await saveLetterCheck(
        studentId,
        db,
        { ...target, letterRev: 1, gapsRev: 1 },
        CHECK(1, 1),
      ),
    ).toBe(false);
  });
});

describe("Story 6.7 raw rows", () => {
  it("holds no plain text of the ad, title, employer, keywords, letter, gaps or flags", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const id = newId();
    await saveAnalysis(studentId, db, inputFor(id));
    const target = { id, fingerprint: "fp-1" };
    await saveLetter(studentId, db, target, LETTER);
    await saveGaps(studentId, db, { ...target, gapsRev: 1 }, GAPS);
    await saveLetterCheck(
      studentId,
      db,
      { ...target, letterRev: 1, gapsRev: 1 },
      CHECK(1, 1),
    );
    const raw = await db.execute(
      sql`select * from applications where id = ${id}`,
    );
    const [row] = rowsOf(raw);
    for (const column of [
      "job",
      "analysis",
      "gaps",
      "letter",
      "letter_check",
    ]) {
      expect(String(row?.[column])).toMatch(/^v1\./);
    }
    // No column holds a CV text, a name, or any readable content.
    expect(Object.keys(row ?? {}).sort()).toEqual(
      [
        "id",
        "student_id",
        "job",
        "analysis",
        "gaps",
        "letter",
        "letter_check",
        "fingerprint",
        "seq",
        "match_score",
        "letter_rev",
        "gaps_rev",
        "created_at",
        "updated_at",
      ].sort(),
    );
    const dump = JSON.stringify(raw);
    for (const word of [
      "Hemmeligstilling",
      "Skjult",
      "Arbeidsgiver",
      "Kubernetes",
      "hemmeligbrev",
      "Hemmeliggap",
      "Hemmeligflagg",
      "Kjære",
      "UNSUPPORTED_CLAIM",
      "REAL_GAP",
    ]) {
      expect(dump).not.toContain(word);
    }
  });
});
