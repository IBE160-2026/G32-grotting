import { handleStudent } from "@/modules/identity";
import { getProfile, saveCvText } from "@/modules/profile";
import { saveProfileRequestSchema } from "@/modules/profile/contracts";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// A Student whose Profile row is missing cannot exist (one transaction,
// cascade), so a miss ends the session rather than showing half a view.
async function view(studentId: string) {
  const profile = await getProfile(studentId, await getDb());
  if (profile === null) throw new ApiError("SESSION_EXPIRED");
  return profile;
}

// Story 6.3: the Student's name and saved CV text. The id is the session's,
// never one from the body, query or URL (AD-10).
export const GET = handleStudent("/api/profile", (_request, ctx) =>
  view(ctx.session.studentId),
);

// Replaces the saved CV text. Only `cvText` is read: the name, or any other key
// in the body, is ignored. A text of the wrong length is a field error and the
// old text stays.
export const PUT = handleStudent("/api/profile", async (request, ctx) => {
  const body: unknown = await request.json().catch(() => undefined);
  const { cvText } = saveProfileRequestSchema.parse(body);
  const saved = await saveCvText(ctx.session.studentId, await getDb(), cvText);
  if (saved === null) throw new ApiError("SESSION_EXPIRED");
  return saved;
});
