import "server-only";
import { getProfileSummary } from "@/modules/profile";
import { ApiError } from "@/shared/server/handle";
import type { SessionView } from "../contracts";
import type { Executor } from "./executor";
import { getStudentEmail } from "./students";

// `SessionView { studentId, name, email, noticeVersion, expiresAt }` (AD-12).
// The name comes from the Profile, the only place it lives. A Student without
// an email or a Profile row cannot exist (one transaction, cascade), so a miss
// answers SESSION_EXPIRED rather than showing half a view.
export async function buildSessionView(
  studentId: string,
  expiresAt: Date,
  db: Executor,
): Promise<SessionView> {
  const [email, profile] = await Promise.all([
    getStudentEmail(studentId, db),
    getProfileSummary(studentId, db),
  ]);
  if (email === null || profile === null) {
    throw new ApiError("SESSION_EXPIRED");
  }
  return {
    studentId,
    name: profile.name,
    email,
    noticeVersion: profile.noticeVersion,
    expiresAt: expiresAt.toISOString(),
  };
}
