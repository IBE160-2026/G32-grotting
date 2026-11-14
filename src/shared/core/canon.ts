/**
 * Canonical form of a text, used wherever two texts must compare or hash
 * the same: Unicode NFC, CRLF and CR to LF, trimmed, every run of
 * whitespace collapsed to one space.
 */
export function canon(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}
