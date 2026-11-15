import { cookies } from "next/headers";
import {
  accessCookieValue,
  gateIsActive,
  isAccessCodeCorrect,
} from "@/modules/identity";
import {
  ACCESS_COOKIE,
  accessRequestSchema,
} from "@/modules/identity/contracts";
import { getConfig } from "@/shared/server/config";
import { ApiError, handle } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// A wrong code is INVALID_INPUT on the field `code`; AD-7 has no code of its
// own for it. Where the gate is not in use the endpoint does not exist.
export const POST = handle("/api/access", async (request) => {
  const config = getConfig();
  const { accessCode } = config;
  if (
    accessCode === undefined ||
    !gateIsActive({
      hosted: config.hosted,
      accountsOn: config.features.accounts,
    })
  ) {
    throw new ApiError("NOT_FOUND");
  }

  const { code } = accessRequestSchema.parse(
    await request.json().catch(() => undefined),
  );
  if (!isAccessCodeCorrect(code, accessCode)) {
    throw new ApiError("INVALID_INPUT", { field: "code" });
  }

  // No maxAge or expires: a session cookie, asked for once per browser session.
  (await cookies()).set(ACCESS_COOKIE, accessCookieValue(accessCode), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  return { opened: true as const };
});
