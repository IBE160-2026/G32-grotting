import { buildSessionView, handleStudent } from "@/modules/identity";
import { getDb } from "@/shared/server/db";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// AD-12: who is logged in and when the session ends. Reading it extends the
// session at most every 5 minutes, like any Student route.
export const GET = handleStudent("/api/session", async (_request, ctx) =>
  buildSessionView(ctx.session.studentId, ctx.session.expiresAt, await getDb()),
);
