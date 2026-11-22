import "server-only";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { ProfileSummary } from "../contracts";
import { profiles } from "./schema";

// The database or the `tx` of a transaction (AD-10).
export type Executor = PgDatabase<PgQueryResultHKT>;

// Runs inside the registration transaction, right after `identity.createStudent`.
// The name goes through `encryptedText`, so it is stored only encrypted.
export async function createProfile(
  tx: Executor,
  studentId: string,
  name: string,
): Promise<void> {
  await tx.insert(profiles).values({ studentId, name });
}

// The name and the accepted AI notice of the Student in the session. The row is
// found by its key, `student_id`. A name that cannot be decrypted throws: it is
// never shown as if it were empty.
export async function getProfileSummary(
  studentId: string,
  db: Executor,
): Promise<ProfileSummary | null> {
  const [row] = await db
    .select({ name: profiles.name, noticeVersion: profiles.aiNoticeVersion })
    .from(profiles)
    .where(eq(profiles.studentId, studentId))
    .limit(1);
  return row === undefined
    ? null
    : { name: row.name, noticeVersion: row.noticeVersion };
}
