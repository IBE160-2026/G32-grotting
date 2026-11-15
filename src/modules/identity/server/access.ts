import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_MESSAGE = "ja_access.v1";

// The cookie value is derived from the code, so the code itself never leaves
// the server and a changed `ACCESS_CODE` closes every open session (AD-12).
export function accessCookieValue(code: string): string {
  return createHmac("sha256", code).update(COOKIE_MESSAGE).digest("hex");
}

function sameDigest(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isValidAccessCookie(
  value: string | undefined,
  code: string,
): boolean {
  return value !== undefined && sameDigest(value, accessCookieValue(code));
}

// Both sides are hashed first, so the compare is constant-time whatever the
// length of the submitted text. SHA-256 and not the HMAC above: an HMAC key
// is zero-padded, so a code with trailing NUL bytes would match.
export function isAccessCodeCorrect(submitted: string, code: string): boolean {
  const digest = (text: string) =>
    createHash("sha256").update(text, "utf8").digest("hex");
  return sameDigest(digest(submitted), digest(code));
}
