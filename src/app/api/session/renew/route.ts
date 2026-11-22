import {
  buildSessionView,
  handleStudent,
  renewSession,
} from "@/modules/identity";
import { getDb } from "@/shared/server/db";
import { ApiError, SESSION_EXPIRES_HEADER } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// AD-12: "Fortsett økten". Always extends the session; the header and the body
// carry the new end.
export const POST = handleStudent("/api/session/renew", async (_r, ctx) => {
  const db = await getDb();
  const { studentId, sessionId } = ctx.session;
  const expiresAt = await renewSession(studentId, sessionId, new Date(), db);
  if (expiresAt === null) throw new ApiError("SESSION_EXPIRED");
  ctx.responseHeaders.set(SESSION_EXPIRES_HEADER, expiresAt.toISOString());
  return buildSessionView(studentId, expiresAt, db);
});
