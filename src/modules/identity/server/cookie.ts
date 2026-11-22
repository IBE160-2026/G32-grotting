import "server-only";
import { SESSION_COOKIE } from "../contracts";

// The session cookie by hand, so a handler needs no `next/headers` (AD-12):
// httpOnly, SameSite=Lax, Secure when hosted, and no Max-Age, so it lasts one
// browser session while the row decides the real end.
function attributes(hosted: boolean): string {
  return `Path=/; HttpOnly; SameSite=Lax${hosted ? "; Secure" : ""}`;
}

export function sessionCookie(token: string, hosted: boolean): string {
  return `${SESSION_COOKIE}=${token}; ${attributes(hosted)}`;
}

export function clearedSessionCookie(hosted: boolean): string {
  return `${SESSION_COOKIE}=; ${attributes(hosted)}; Max-Age=0`;
}

// The token in a `Cookie` header, or undefined.
export function readSessionToken(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (header === null) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    return value === "" ? undefined : value;
  }
  return undefined;
}
