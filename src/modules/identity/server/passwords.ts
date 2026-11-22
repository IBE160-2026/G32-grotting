import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Passwords are stored only as `scrypt$N$r$p$salt$hash` (AD-11): a random
// 16-byte salt per Student, a 64-byte hash, both base64url. Nothing here logs
// or throws a password, a salt or a hash.

const N = 16384;
const R = 8;
const P = 1;
const SALT_BYTES = 16;
const HASH_BYTES = 64;

// What a stored hash may ask of `verifyPassword`: bounds, so a damaged or
// planted value cannot make a login allocate gigabytes.
const MAX_N = 2 ** 16;
const MAX_R = 8;
const MAX_P = 4;
const MAX_MEMORY = 128 * 1024 * 1024;

function derive(
  password: string,
  salt: Buffer,
  length: number,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      length,
      { N: n, r, p, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await derive(password, salt, HASH_BYTES, N, R, P);
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

type Parsed = {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
};

function isPowerOfTwo(value: number): boolean {
  return value >= 2 && (value & (value - 1)) === 0;
}

function decodePart(part: string): Buffer | null {
  const bytes = Buffer.from(part, "base64url");
  return bytes.toString("base64url") === part ? bytes : null;
}

function parseStored(stored: string): Parsed | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [, nText = "", rText = "", pText = "", saltText = "", hashText = ""] =
    parts;
  if (![nText, rText, pText].every((text) => /^[1-9]\d{0,7}$/.test(text))) {
    return null;
  }
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (!isPowerOfTwo(n) || n > MAX_N || r > MAX_R || p > MAX_P) return null;
  const salt = decodePart(saltText);
  const hash = decodePart(hashText);
  if (salt === null || hash === null) return null;
  if (salt.length < 8 || salt.length > 64) return null;
  if (hash.length < 16 || hash.length > 128) return null;
  return { n, r, p, salt, hash };
}

// A fixed hash of a password nobody knows (random, then discarded), with the
// same parameters as a real one: an unknown email is verified against it, so
// the answer takes as long as for a known one from the first request on.
const DUMMY_HASH =
  "scrypt$16384$8$1$dBRpIeu3Pu01zFXzkyF6gA$iaeKE3CPUz5f25tcJ5cRHy4kyQ0DrVWdwEGTs8So3Xzi3SugzfFlm16fxevGheDSzZ87MvzOSoMu0QEVqUoNFQ";

// `stored` is undefined for an email that has no account: the work is done all
// the same and the answer is false.
export async function verifyPassword(
  password: string,
  stored: string | undefined,
): Promise<boolean> {
  const real = stored === undefined ? undefined : parseStored(stored);
  const parsed = real ?? parseStored(DUMMY_HASH);
  if (parsed === null) return false;
  const key = await derive(
    password,
    parsed.salt,
    parsed.hash.length,
    parsed.n,
    parsed.r,
    parsed.p,
  );
  const same = timingSafeEqual(key, parsed.hash);
  return real !== undefined && real !== null && same;
}
