import { type NextRequest, NextResponse } from "next/server";
import {
  gateDecision,
  isValidAccessCookie,
  sessionDecision,
} from "@/modules/identity";
import { ACCESS_COOKIE, SESSION_COOKIE } from "@/modules/identity/contracts";
import { getConfig } from "@/shared/server/config";
import { errorResponse } from "@/shared/server/handle";

// Wires the pure gate decisions up (AD-12): reads config and the cookies, asks
// `gateDecision` and `sessionDecision`, acts on the answer.
export function proxy(request: NextRequest) {
  const config = getConfig();
  const { pathname } = request.nextUrl;
  const decision = gateDecision({
    hosted: config.hosted,
    accountsOn: config.features.accounts,
    path: pathname,
    cookieValid:
      config.accessCode !== undefined &&
      isValidAccessCookie(
        request.cookies.get(ACCESS_COOKIE)?.value,
        config.accessCode,
      ),
  });

  if (decision === "api-401") return errorResponse("ACCESS_REQUIRED", false);
  if (decision === "redirect-to-gate") {
    return NextResponse.redirect(new URL("/tilgang", request.url));
  }

  // With accounts on, an API call needs a session cookie (AD-12). The proxy
  // cannot reach the database, so the route checks that the session is alive.
  const session = sessionDecision({
    accountsOn: config.features.accounts,
    path: pathname,
    hasSessionCookie: Boolean(request.cookies.get(SESSION_COOKIE)?.value),
  });
  if (session === "api-401") return errorResponse("SESSION_EXPIRED", false);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static/|_next/image$|favicon\\.ico$).*)"],
};
