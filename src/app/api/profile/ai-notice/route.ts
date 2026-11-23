import { handleStudent } from "@/modules/identity";
import { saveNoticeVersion } from "@/modules/profile";
import { aiNoticeRequestSchema } from "@/modules/profile/contracts";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// Story 6.6: the Student has accepted the AI notice. The version is stored on
// the Profile of the Student in the session (never one from the body, query or
// URL, AD-10), so the notice is shown once per account and the server reads the
// consent from there. Only the version this server runs is accepted.
export const POST = handleStudent(
  "/api/profile/ai-notice",
  async (request, ctx) => {
    const body: unknown = await request.json().catch(() => undefined);
    const { noticeVersion } = aiNoticeRequestSchema.parse(body);
    if (noticeVersion !== getConfig().aiNotice.version) {
      throw new ApiError("INVALID_INPUT", { field: "noticeVersion" });
    }
    const stored = await saveNoticeVersion(
      ctx.session.studentId,
      await getDb(),
      noticeVersion,
    );
    if (stored === null) throw new ApiError("SESSION_EXPIRED");
    return { noticeVersion: stored };
  },
);
