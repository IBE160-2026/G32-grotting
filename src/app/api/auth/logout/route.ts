import {
  assertAccountsOn,
  clearedSessionCookie,
  deleteSessionByToken,
  readSessionToken,
} from "@/modules/identity";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { handle } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// FR-18: deletes the session row and clears the cookie. Works without a valid
// session, with any cookie or none.
export const POST = handle("/api/auth/logout", async (request, ctx) => {
  assertAccountsOn();
  const token = readSessionToken(request);
  if (token !== undefined) await deleteSessionByToken(await getDb(), token);
  ctx.responseHeaders.append(
    "Set-Cookie",
    clearedSessionCookie(getConfig().hosted),
  );
  return { loggedOut: true as const };
});
