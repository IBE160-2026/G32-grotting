import { SIGNATURE_TOKEN } from "../contracts";

// Longest first, so «med hilsen» wins over «hilsen».
const CLOSING_PHRASES = [
  "med vennlig hilsen",
  "med vennleg hilsen",
  "høflig hilsen",
  "vennlig hilsen",
  "beste hilsen",
  "med hilsen",
  "hilsen",
  "mvh",
] as const;

// The token as we write it, or a variant the AI may write.
const TOKEN_VARIANTS = /\{\{\s*signatur\w*\s*\}\}/gi;

const WINDOW_LINES = 6;
const DEFAULT_CLOSING = "Med vennlig hilsen";
const ONLY_PUNCTUATION = /^[\s,.:;!-]*$/;

// The closing phrase at the start of a line, as a whole word, in any case.
function closingPhraseOf(line: string): string | null {
  const lower = line.toLowerCase();
  for (const phrase of CLOSING_PHRASES) {
    if (!lower.startsWith(phrase)) continue;
    const next = lower.charAt(phrase.length);
    if (next === "" || /[\s,.:;!-]/.test(next)) {
      return line.slice(0, phrase.length);
    }
  }
  return null;
}

/**
 * Gives the Letter exactly one sign-off token at the end (FR-12). Any token the
 * AI wrote is removed. A written name after a closing phrase is dropped; with
 * no closing phrase in the last 6 lines «Med vennlig hilsen» is added. Returns
 * null when nothing is left but the token, so the caller can treat it as a
 * failed answer.
 */
export function normaliseLetter(text: string): string | null {
  const body = text.replace(/\r\n?/g, "\n").replace(TOKEN_VARIANTS, "").trim();
  if (body === "") return null;

  const lines = body.split("\n");
  const from = Math.max(0, lines.length - WINDOW_LINES);
  // The last closing line wins: an earlier body line may start with «Hilsen».
  for (let index = lines.length - 1; index >= from; index--) {
    const line = (lines[index] ?? "").trim();
    const phrase = closingPhraseOf(line);
    if (phrase === null) continue;
    // «Hilsen,» stays as written; «Hilsen Ola» keeps only the phrase.
    const closing = ONLY_PUNCTUATION.test(line.slice(phrase.length))
      ? line
      : phrase;
    const kept = [...lines.slice(0, index), closing];
    return `${kept.join("\n")}\n${SIGNATURE_TOKEN}`;
  }
  return `${body}\n\n${DEFAULT_CLOSING}\n${SIGNATURE_TOKEN}`;
}
