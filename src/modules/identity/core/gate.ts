export type GateInput = {
  readonly hosted: boolean;
  readonly accountsOn: boolean;
  readonly path: string;
  readonly cookieValid: boolean;
};

export type GateDecision = "pass" | "redirect-to-gate" | "api-401";

const EXEMPT_PATHS = [
  "/tilgang",
  "/api/access",
  "/api/health",
  "/_next/image",
  "/favicon.ico",
];
const EXEMPT_PREFIXES = ["/_next/static/"];

function isExempt(path: string): boolean {
  return (
    EXEMPT_PATHS.includes(path) ||
    EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

function isApi(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

// Pure (AD-12): the proxy only reads the request and acts on this answer. The
// gate applies on Hosted while accounts are off; after that the code is asked
// for at registration instead.
export function gateDecision(input: GateInput): GateDecision {
  if (!input.hosted || input.accountsOn) return "pass";
  if (isExempt(input.path) || input.cookieValid) return "pass";
  return isApi(input.path) ? "api-401" : "redirect-to-gate";
}

// True while the Access-code screen and endpoint are in use.
export function gateIsActive(input: {
  readonly hosted: boolean;
  readonly accountsOn: boolean;
}): boolean {
  return input.hosted && !input.accountsOn;
}
