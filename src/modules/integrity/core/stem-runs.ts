import { stem, tokenise } from "@/modules/keywords/core";

/** The stems of the words of a text, in order. */
export function stemsOf(text: string): string[] {
  return tokenise(text).map((token) => stem(token.text));
}

/**
 * Whether the stems hold a run that is the same word as `wordStems` (a phrase
 * is compared word by word, the words next to each other). The text is read as
 * one stream of words, so a run may cross a line break.
 */
export function hasRun(
  stems: readonly string[],
  wordStems: readonly string[],
): boolean {
  if (wordStems.length === 0) return false;
  for (let from = 0; from + wordStems.length <= stems.length; from++) {
    if (wordStems.every((value, offset) => stems[from + offset] === value)) {
      return true;
    }
  }
  return false;
}
