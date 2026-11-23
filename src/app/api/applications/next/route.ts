import { nextSeq } from "@/modules/application";
import { handleStudent } from "@/modules/identity";
import { getDb } from "@/shared/server/db";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// Story 6.7: the number the Student's next Application will get, highest plus
// one (1 when there is none). The id is the session's, never one from the
// query or URL (AD-10). The Student sees it on the form; the result heading
// shows the number the save really gave.
export const GET = handleStudent(
  "/api/applications/next",
  async (_request, ctx) => ({
    seq: await nextSeq(ctx.session.studentId, await getDb()),
  }),
);
