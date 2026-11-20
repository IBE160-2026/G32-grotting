type RandomSource = Pick<Crypto, "getRandomValues"> & {
  randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
};

/**
 * A new random id in the UUID v4 form the API checks (`z.uuid()`). Browsers
 * only offer `crypto.randomUUID` on a secure origin (https or localhost); the
 * app is also opened on a phone over plain http on the local network, where it
 * is missing and a click on submit would otherwise throw. `getRandomValues` is
 * available everywhere, so it is the fallback.
 */
export function newId(source: RandomSource = globalThis.crypto): string {
  if (typeof source.randomUUID === "function") return source.randomUUID();
  const bytes = source.getRandomValues(new Uint8Array(16));
  // Version 4 and the RFC 4122 variant.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}
