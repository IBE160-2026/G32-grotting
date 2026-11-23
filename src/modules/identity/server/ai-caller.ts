import "server-only";
import type { AiConsent, AiContext } from "@/modules/ai";
import { getProfileSummary, type ProfileExecutor } from "@/modules/profile";
import { ApiError } from "@/shared/server/handle";
import type { StudentSession } from "./handle-student";

// Who an AI request is made for (Story 6.6). With no session (accounts off) it
// is the installation: no Student, and the consent the body carries. With a
// session the Student is the session's, never one from a body, and the consent
// is the notice version stored on that Student's Profile; a body consent is
// ignored. The Daily cap follows `studentId` (`runAi` derives the scope). A
// missing Profile cannot exist (one transaction, cascade), so it ends the
// session.
export async function aiContextFor(
  session: Pick<StudentSession, "studentId"> | undefined,
  bodyConsent: AiConsent | null | undefined,
  db: ProfileExecutor,
): Promise<AiContext> {
  if (session === undefined) {
    return { studentId: null, consent: bodyConsent ?? null };
  }
  const profile = await getProfileSummary(session.studentId, db);
  if (profile === null) throw new ApiError("SESSION_EXPIRED");
  return {
    studentId: session.studentId,
    consent:
      profile.noticeVersion === null
        ? null
        : { noticeVersion: profile.noticeVersion },
  };
}
