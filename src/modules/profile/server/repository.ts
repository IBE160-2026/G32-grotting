import "server-only";
import { eq } from "drizzle-orm";
import type { ProfileView } from "../contracts";
import type { Executor } from "./profiles";
import { profiles } from "./schema";

// The name and the CV text of the Student in the session (Story 6.3). The row
// is found by its key, `student_id`; the id comes from the session, never from
// a body or a URL (AD-10). A value that cannot be decrypted throws: it is never
// shown as if it were empty.
export async function getProfile(
  studentId: string,
  db: Executor,
): Promise<ProfileView | null> {
  const [row] = await db
    .select({ name: profiles.name, cvText: profiles.cvText })
    .from(profiles)
    .where(eq(profiles.studentId, studentId))
    .limit(1);
  return row === undefined ? null : { name: row.name, cvText: row.cvText };
}

// Replaces the stored CV text and returns the Profile as it now is, from the
// same statement. The text goes through `encryptedText`, so it is stored only
// encrypted. Null when the Student has no Profile row.
export async function saveCvText(
  studentId: string,
  db: Executor,
  text: string,
): Promise<ProfileView | null> {
  const [row] = await db
    .update(profiles)
    .set({ cvText: text })
    .where(eq(profiles.studentId, studentId))
    .returning({ name: profiles.name, cvText: profiles.cvText });
  return row === undefined ? null : { name: row.name, cvText: row.cvText };
}
