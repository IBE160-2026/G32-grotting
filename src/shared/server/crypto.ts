import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { customType } from "drizzle-orm/pg-core";

// Encryption of personal fields at rest (AD-11): AES-256-GCM with one 32-byte
// key. Stored form `v1.<iv>.<tag>.<ciphertext>`, each part base64url. This file
// never imports config: `db.ts` hands it the key when the database first opens.
// No error here carries a key, a hash, a plaintext or a ciphertext.

const VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const ALGORITHM = "aes-256-gcm";

// Kept on globalThis like the database: a second copy of this module (route
// bundles, dev reloads) reuses a database that was opened by the first, so it
// must see the same key.
const holder = globalThis as typeof globalThis & {
  __jobassistantCryptoKey?: Buffer;
};

export class DecryptError extends Error {
  constructor() {
    super("A stored value could not be decrypted");
    this.name = "DecryptError";
  }
}

// The key as base64 text of exactly 32 bytes.
export function initCrypto(base64Key: string): void {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_BYTES || key.toString("base64") !== base64Key) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes, base64");
  }
  holder.__jobassistantCryptoKey = key;
}

function requireKey(): Buffer {
  const key = holder.__jobassistantCryptoKey;
  if (key === undefined) throw new Error("crypto is not initialised");
  return key;
}

// What `local_meta` holds to tell whether a database belongs to this key.
export function hashKey(base64Key: string): string {
  return createHash("sha256").update(base64Key).digest("hex");
}

export function encryptText(plaintext: string): string {
  const key = requireKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

// Decodes one part and insists on the canonical text, so a changed character
// that decodes to the same bytes still counts as tampering.
function decodePart(part: string): Buffer {
  const bytes = Buffer.from(part, "base64url");
  if (bytes.toString("base64url") !== part) throw new DecryptError();
  return bytes;
}

export function decryptText(stored: string): string {
  const key = requireKey();
  const parts = stored.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) throw new DecryptError();
  const [, ivPart = "", tagPart = "", ciphertextPart = ""] = parts;
  const iv = decodePart(ivPart);
  const tag = decodePart(tagPart);
  const ciphertext = decodePart(ciphertextPart);
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new DecryptError();
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new DecryptError();
  }
}

// A text column stored encrypted. It fails loudly: a name or a CV that cannot
// be decrypted must not be shown as if it were empty.
export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => encryptText(value),
  fromDriver: (value) => decryptText(value),
});

export type SectionUnavailableReason = "decrypt" | "parse";

// A section that cannot be read, so the rest of the query still returns.
export type Section =
  | {
      readonly available: true;
      readonly contractVersion: number;
      data: unknown;
    }
  | { readonly available: false; readonly reason: SectionUnavailableReason };

function isStoredSection(
  value: unknown,
): value is { contractVersion: number; data: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.contractVersion === "number" &&
    Number.isFinite(record.contractVersion) &&
    "data" in record
  );
}

// A JSON column stored encrypted. `{ contractVersion, data }` exists only inside
// the ciphertext. A value that does not decrypt, or decrypts to something else,
// reads as `{ available: false }`; only an unusable crypto setup throws.
export const encryptedJson = customType<{
  data: Section;
  driverData: string;
}>({
  dataType: () => "text",
  toDriver: (value) => {
    if (!value.available) {
      throw new Error("An unavailable section cannot be stored");
    }
    // What would not read back: a version that is not an integer (JSON turns
    // NaN into null) or data that JSON drops.
    if (!Number.isInteger(value.contractVersion) || value.data === undefined) {
      throw new Error("Invalid section");
    }
    return encryptText(
      JSON.stringify({
        contractVersion: value.contractVersion,
        data: value.data,
      }),
    );
  },
  fromDriver: (value): Section => {
    let plaintext: string;
    try {
      plaintext = decryptText(value);
    } catch (error) {
      if (error instanceof DecryptError) {
        return { available: false, reason: "decrypt" };
      }
      throw error;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(plaintext);
    } catch {
      return { available: false, reason: "parse" };
    }
    if (!isStoredSection(parsed)) return { available: false, reason: "parse" };
    return {
      available: true,
      contractVersion: parsed.contractVersion,
      data: parsed.data,
    };
  },
});

export type OpenedSection<T> =
  | { readonly available: true; readonly value: T }
  | { readonly available: false; readonly reason: SectionUnavailableReason };

// For the owning repository: runs its parser over the section's data for the
// stored contract version. A parser that throws makes the section unavailable.
export function openSection<T>(
  section: Section,
  parse: (data: unknown, contractVersion: number) => T,
): OpenedSection<T> {
  if (!section.available) return section;
  try {
    return {
      available: true,
      value: parse(section.data, section.contractVersion),
    };
  } catch {
    return { available: false, reason: "parse" };
  }
}
