import { splitParagraphs } from "@/modules/keywords/core";

/**
 * The entries of a CV text: the blocks of lines bounded by blank lines (a line
 * with only white space is blank), in order. Line breaks inside an entry are
 * kept (as LF) and the entry is trimmed. This is the only CV-entry splitter in
 * the code (FR-15, FR-17): the same blank-line split `keywords/core` uses for
 * paragraphs, so the two cannot drift apart.
 */
export function cvEntries(text: string): string[] {
  return splitParagraphs(text).map((block) => block.trim());
}
