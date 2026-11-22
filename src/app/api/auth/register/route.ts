import { assertAccountsOn, registerAccount } from "@/modules/identity";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { handle } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// FR-18, FR-22, FR-31: registers a Student with name, email and password. On
// Hosted the Access code is required and checked first. Does not log in. The
// route does not exist while accounts are off.
export const POST = handle("/api/auth/register", async (request) => {
  assertAccountsOn();
  const { hosted, accessCode } = getConfig();
  const body = await request.json().catch(() => undefined);
  return registerAccount(await getDb(), body, { hosted, accessCode });
});
