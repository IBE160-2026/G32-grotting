import { listApplications } from "@/modules/application";
import {
  APPLICATIONS_PAGE_SIZE,
  applicationListQuerySchema,
} from "@/modules/application/contracts";
import { handleStudent } from "@/modules/identity";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// Story 6.8: the Student's Applications for Historikk, newest first, 20 per
// page, with the total. The Student is the session's, never a query or URL
// value (AD-10). A row carries what the register shows and nothing more: the
// Letter text is fetched per row from `[id]/letter`.
export const GET = handleStudent("/api/applications", async (request, ctx) => {
  // Titles and employers are the Student's own: nothing keeps a copy.
  ctx.responseHeaders.set("Cache-Control", "no-store");
  const query = applicationListQuerySchema.safeParse({
    page: new URL(request.url).searchParams.get("page") ?? undefined,
  });
  if (!query.success) throw new ApiError("INVALID_INPUT", { field: "page" });
  return listApplications(
    ctx.session.studentId,
    await getDb(),
    query.data.page,
    APPLICATIONS_PAGE_SIZE,
  );
});
