import "server-only";
import { eq } from "drizzle-orm";
import type { ProfileView } from "../contracts";
import type { Executor } from "./profiles";
import { profiles } from "./schema";

const VIEW_COLUMNS = {
  name: profiles.name,
  cvText: profiles.cvText,
  cvSavedAt: profiles.cvSavedAt,
  aiNoticeVersion: profiles.aiNoticeVersion,
};

function toView(row: {
  name: string;
  cvText: string | null;
  cvSavedAt: Date | null;
  aiNoticeVersion: string | null;
}): ProfileView {
  return {
    name: row.name,
    cvText: row.cvText,
    cvSavedAt: row.cvSavedAt === null ? null : row.cvSavedAt.toISOString(),
    aiNoticeVersion: row.aiNoticeVersion,
  };
}

// The name, the CV text and the accepted AI notice of the Student in the
// session (Stories 6.3, 6.6). The row is found by its key, `student_id`; the id
// comes from the session, never from a body or a URL (AD-10). A value that
// cannot be decrypted throws: it is never shown as if it were empty.
export async function getProfile(
  studentId: string,
  db: Executor,
): Promise<ProfileView | null> {
  const [row] = await db
    .select(VIEW_COLUMNS)
    .from(profiles)
    .where(eq(profiles.studentId, studentId))
    .limit(1);
  return row === undefined ? null : toView(row);
}

// Replaces the stored CV text and the save date and returns the Profile as it
// now is, from the same statement. The text goes through `encryptedText`, so it
// is stored only encrypted. Null when the Student has no Profile row.
export async function saveCvText(
  studentId: string,
  db: Executor,
  text: string,
): Promise<ProfileView | null> {
  const [row] = await db
    .update(profiles)
    .set({ cvText: text, cvSavedAt: new Date() })
    .where(eq(profiles.studentId, studentId))
    .returning(VIEW_COLUMNS);
  return row === undefined ? null : toView(row);
}

// Stores the AI notice version the Student has accepted (Story 6.6), so the
// notice is shown once per account. Null when the Student has no Profile row.
export async function saveNoticeVersion(
  studentId: string,
  db: Executor,
  version: string,
): Promise<string | null> {
  const [row] = await db
    .update(profiles)
    .set({ aiNoticeVersion: version })
    .where(eq(profiles.studentId, studentId))
    .returning({ version: profiles.aiNoticeVersion });
  return row?.version ?? null;
}
