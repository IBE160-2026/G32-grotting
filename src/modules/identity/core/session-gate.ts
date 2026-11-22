export type SessionGateInput = {
  readonly accountsOn: boolean;
  readonly path: string;
  readonly hasSessionCookie: boolean;
};

export type SessionGateDecision = "pass" | "api-401";

// What an API caller may reach without a session: the three account routes,
// the health check and the Access-code endpoint (which answers 404 once
// accounts are on).
const PUBLIC_API_PATHS = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/api/access",
];

function isApi(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

function withoutTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

// Pure (AD-12): the proxy cannot reach the database, so it asks only whether a
// session cookie is there; the route checks that it is a live session. Pages
// are not gated here: each Student page asks `requireStudentPage` for a live
// session and sends a logged-out Student to Logg inn (Story 6.4). With accounts
// off nothing changes.
export function sessionDecision(input: SessionGateInput): SessionGateDecision {
  if (!input.accountsOn || !isApi(input.path)) return "pass";
  if (input.hasSessionCookie) return "pass";
  return PUBLIC_API_PATHS.includes(withoutTrailingSlash(input.path))
    ? "pass"
    : "api-401";
}
