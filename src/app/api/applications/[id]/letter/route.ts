import { z } from "zod";
import { getApplicationLetterText } from "@/modules/application";
import { handleStudent } from "@/modules/identity";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";

const ROUTE = "/api/applications/[id]/letter";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// Story 6.8: the stored Letter of one Historikk row, for «Kopier brev» and «Last
// ned (.docx)». Found by `(id, studentId)` with the id of the session. A missing
// id, another Student's id, a malformed id and an entry without a Letter all
// answer the same NOT_FOUND. The text is decrypted here and goes to the
// requesting Student only; it is not logged.
export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { id } = await params;
  return handleStudent(ROUTE, async (_req, ctx) => {
    // The decrypted Letter is for this answer only: nothing keeps a copy.
    ctx.responseHeaders.set("Cache-Control", "no-store");
    if (!z.uuid().safeParse(id).success) throw new ApiError("NOT_FOUND");
    const text = await getApplicationLetterText(
      ctx.session.studentId,
      await getDb(),
      id,
    );
    if (text === null) throw new ApiError("NOT_FOUND");
    return { text };
  })(request);
}
