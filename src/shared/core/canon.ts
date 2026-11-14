/**
 * Canonical form of a text, used wherever two texts must compare or hash
 * the same: Unicode NFC, then every run of whitespace (CRLF, CR and LF
 * included) collapsed to one space, then trimmed. Line breaks do not survive.
 */
export function canon(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}
