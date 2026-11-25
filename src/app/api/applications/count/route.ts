import { countApplications } from "@/modules/application";
import { handleStudent } from "@/modules/identity";
import { getDb } from "@/shared/server/db";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// Story 6.8: how many entries the Student has, for the count by «Historikk» in
// the app bar. Nothing is decrypted; the Student is the session's.
export const GET = handleStudent(
  "/api/applications/count",
  async (_request, ctx) => {
    ctx.responseHeaders.set("Cache-Control", "no-store");
    return {
      total: await countApplications(ctx.session.studentId, await getDb()),
    };
  },
);
