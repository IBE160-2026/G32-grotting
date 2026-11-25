import { z } from "zod";
import { getApplicationDetail } from "@/modules/application";
import { handleStudent } from "@/modules/identity";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";

const ROUTE = "/api/applications/[id]";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// Story 6.9: one stored Application, for «reopen» (read-only). Found by
// `(id, studentId)` with the id of the session. A missing id, another Student's
// id and a malformed id take the same path and answer the same NOT_FOUND: a
// malformed id is turned away before the database, and a row that is not the
// Student's is never decrypted. The answer holds decrypted text, so it is for
// the requesting Student only: `no-store`, not logged.
export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { id } = await params;
  return handleStudent(ROUTE, async (_req, ctx) => {
    ctx.responseHeaders.set("Cache-Control", "no-store");
    if (!z.uuid().safeParse(id).success) throw new ApiError("NOT_FOUND");
    const detail = await getApplicationDetail(
      ctx.session.studentId,
      await getDb(),
      id,
    );
    if (detail === null) throw new ApiError("NOT_FOUND");
    return detail;
  })(request);
}
