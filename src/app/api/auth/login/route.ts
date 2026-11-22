import {
  assertAccountsOn,
  loginAccount,
  sessionCookie,
} from "@/modules/identity";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { handle, SESSION_EXPIRES_HEADER } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// FR-18: a right email and password start a session: the token goes into the
// `ja_sid` cookie and only its hash into the database. Wrong credentials give
// one field error that does not say which part was wrong.
export const POST = handle("/api/auth/login", async (request, ctx) => {
  assertAccountsOn();
  const body = await request.json().catch(() => undefined);
  const { token, view } = await loginAccount(await getDb(), body, new Date());
  ctx.responseHeaders.append(
    "Set-Cookie",
    sessionCookie(token, getConfig().hosted),
  );
  ctx.responseHeaders.set(SESSION_EXPIRES_HEADER, view.expiresAt);
  return view;
});
