import { findKeyword, stem, tokenise } from "@/modules/keywords/core";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { type CheckableGap, checkCitation } from "./check-citation";
import { UPGRADE_WORD_CV_FORMS, UPGRADE_WORDS } from "./word-lists";

export type LetterFlagKind = "UNSUPPORTED_CLAIM" | "UPGRADE_WORD";

/** Offsets in the Letter text (CRLF and lone CR counted as LF), end exclusive. */
export type LetterSpan = { start: number; end: number };

/**
 * One thing to check in the Letter. `term` is the Keyword or Upgrade word,
 * `word` is the form as it stands in the Letter (its first occurrence) and
 * `spans` are all its occurrences, none across a line.
 */
export type LetterFlag = {
  kind: LetterFlagKind;
  term: string;
  word: string;
  spans: LetterSpan[];
};

export type CheckLetterInput = {
  readonly letter: string;
  readonly cvText: string;
  readonly jobTitle: string;
  readonly employer: string;
  // The Missing keywords of the server's own phase-1 analysis.
  readonly missing: readonly { readonly term: string }[];
  // The Gap analysis the Student sees, or `null` when it failed or is off: then
  // every Missing keyword in the Letter is an Unsupported claim. With it, a
  // Missing keyword that is a Rewordable gap whose citation passes
  // `checkCitation` against `cvText` again is let through (FR-11, FR-15).
  readonly gaps: readonly CheckableGap[] | null;
  readonly vocabulary: Vocabulary;
};

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The sign-off token, as in `countWords` (the Letter slice owns the constant).
const SIGNATURE = /\{\{\s*signatur\w*\s*\}\}/giu;

// A name as it may stand in the Letter: case ignored, any white space between
// its words.
function namePattern(name: string): RegExp | undefined {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  // Whole words only, as `phraseRegExp` in check-tone.ts: a title like «Data»
  // must not blank the start of «Datasystemer».
  const body = words.map(escapeRegExp).join("\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "giu");
}

// Replaces a match with spaces of the same length, new lines kept, so every
// offset in the text still holds.
function blank(text: string, pattern: RegExp | undefined): string {
  if (pattern === undefined) return text;
  return text.replace(pattern, (match) => match.replace(/[^\n]/g, " "));
}

const SPACES_ONLY = /^[ \t\xA0]+$/;

type Line = { readonly text: string; readonly offset: number };

function linesOf(text: string): Line[] {
  const lines: Line[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    lines.push({ text: line, offset });
    offset += line.length + 1;
  }
  return lines;
}

// The spans of every run of tokens in the Letter that is the same word as the
// Upgrade word (by stem), per line; the words of a run sit next to each other.
function upgradeSpans(lines: readonly Line[], wordStems: string[]) {
  const spans: LetterSpan[] = [];
  const size = wordStems.length;
  for (const line of lines) {
    const tokens = tokenise(line.text);
    const stems = tokens.map((token) => stem(token.text));
    for (let from = 0; from + size <= tokens.length; from++) {
      let same = true;
      for (let offset = 0; offset < size && same; offset++) {
        same = stems[from + offset] === wordStems[offset];
        const next = tokens[from + offset + 1];
        if (same && offset + 1 < size && next !== undefined) {
          same = SPACES_ONLY.test(
            line.text.slice(tokens[from + offset].end, next.start),
          );
        }
      }
      if (!same) continue;
      spans.push({
        start: line.offset + tokens[from].start,
        end: line.offset + tokens[from + size - 1].end,
      });
      from += size - 1;
    }
  }
  return spans;
}

// Whether the CV, read as one stream of words, holds a run that is the same
// word as the Upgrade word.
function cvHas(cvStems: readonly string[], wordStems: readonly string[]) {
  for (let from = 0; from + wordStems.length <= cvStems.length; from++) {
    if (wordStems.every((value, offset) => cvStems[from + offset] === value)) {
      return true;
    }
  }
  return false;
}

// The Gap analysis stands behind a keyword only when it is a Rewordable gap
// whose citation is found in the CV text word for word, checked now (FR-15).
function supportedByCv(
  term: string,
  gaps: readonly CheckableGap[] | null,
  cvText: string,
): boolean {
  if (gaps === null) return false;
  return gaps.some((gap) => gap.keyword === term && checkCitation(gap, cvText));
}

/**
 * The integrity guard on the Letter (FR-11, AD-14). Flags every Missing keyword
 * the Letter names (an Unsupported claim), unless the Gap analysis holds it as
 * a Rewordable gap whose citation passes `checkCitation` again, and every
 * Upgrade word it uses that the CV text holds in no form (a bigger role than
 * the CV shows). The job
 * title, the employer and the sign-off are skipped. Flags only; the Letter is
 * never changed. One flag per term, ordered by its first span. Pure.
 */
export function checkLetter(input: CheckLetterInput): LetterFlag[] {
  const text = input.letter.replace(/\r\n?/g, "\n");
  // Skipping = blanking with spaces of the same length, so offsets hold.
  const scanned = [
    namePattern(input.jobTitle),
    namePattern(input.employer),
    SIGNATURE,
  ].reduce(blank, text);

  const flags: LetterFlag[] = [];
  const lines = linesOf(scanned);

  for (const { term } of input.missing) {
    if (supportedByCv(term, input.gaps, input.cvText)) continue;
    const hits = findKeyword(scanned, { term }, input.vocabulary);
    if (hits.length === 0) continue;
    const spans = hits.map((hit) => {
      const offset = lines[hit.line - 1]?.offset ?? 0;
      return { start: offset + hit.start, end: offset + hit.end };
    });
    flags.push({
      kind: "UNSUPPORTED_CLAIM",
      term,
      word: text.slice(spans[0].start, spans[0].end),
      spans,
    });
  }

  const cvStems = tokenise(input.cvText).map((token) => stem(token.text));
  for (const term of UPGRADE_WORDS) {
    const wordStems = tokenise(term).map((token) => stem(token.text));
    if (wordStems.length === 0) continue;
    // A CV phrase that means the same clears the word too.
    const cvForms = [term, ...(UPGRADE_WORD_CV_FORMS[term] ?? [])].map((form) =>
      tokenise(form).map((token) => stem(token.text)),
    );
    if (cvForms.some((forms) => cvHas(cvStems, forms))) continue;
    const spans = upgradeSpans(lines, wordStems);
    if (spans.length === 0) continue;
    flags.push({
      kind: "UPGRADE_WORD",
      term,
      word: text.slice(spans[0].start, spans[0].end),
      spans,
    });
  }

  return flags.sort(
    (a, b) =>
      a.spans[0].start - b.spans[0].start || a.spans[0].end - b.spans[0].end,
  );
}
