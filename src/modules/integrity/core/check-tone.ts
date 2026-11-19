import { sameWord, tokenise } from "@/modules/keywords/core";
import { ANECDOTE_MARKERS, MOTIVATION_PHRASES } from "./word-lists";

// The Tones, as the Letter slice names them. integrity/core imports no slice,
// so the three names are written out here.
export type ToneName = "Formell" | "Personlig" | "Direkte";

export const DIREKTE_MAX_WORDS = 300;

export type ToneProblem =
  | { readonly code: "ANECDOTE_MARKER"; readonly marker: string }
  | { readonly code: "NO_MOTIVATION_PHRASE" }
  | {
      readonly code: "TOO_MANY_WORDS";
      readonly words: number;
      readonly max: number;
    }
  | { readonly code: "NO_KEYWORD_IN_FIRST_SENTENCE" };

export type ToneCheck = {
  readonly ok: boolean;
  readonly problems: readonly ToneProblem[];
};

const SIGNATURE = /\{\{\s*signatur\w*\s*\}\}/gi;

/** The words of a Letter: runs of non-white-space, the sign-off token aside. */
export function countWords(text: string): number {
  return text.replace(SIGNATURE, " ").split(/\s+/).filter(Boolean).length;
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole words only: a letter or digit on either side means a longer word.
function phraseRegExp(phrase: string): RegExp {
  const body = phrase.trim().split(/\s+/).map(escapeRegExp).join("\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "iu");
}

/** The first phrase of `phrases` the text holds, or undefined. */
function findPhrase(
  text: string,
  phrases: readonly string[],
): string | undefined {
  return phrases.find((phrase) => phraseRegExp(phrase).test(text));
}

// A greeting or subject line is short and ends in no sentence mark.
const GREETING_MAX_WORDS = 10;
const SENTENCE_END = /[.!?](?=\s|$)/;

function isGreetingLine(line: string): boolean {
  return (
    line === "" ||
    (countWords(line) <= GREETING_MAX_WORDS && !/[.!?]$/.test(line))
  );
}

/**
 * The first sentence of the Letter's body: leading blank lines and short lines
 * without a sentence mark («Kjære Nordic Digital,») are skipped.
 */
export function firstSentenceOf(text: string): string {
  const lines = text
    .replace(SIGNATURE, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());
  let start = 0;
  while (start < lines.length && isGreetingLine(lines[start] ?? "")) start++;
  const rest = lines.slice(start).join(" ").trim();
  const end = SENTENCE_END.exec(rest);
  return end === null ? rest : rest.slice(0, end.index + 1);
}

// A Keyword is in the sentence when some run of its words is the same word as
// the term (`sameWord`: inflections, hyphen and space variants). A run may be
// one word longer than the term's words, so a split compound is found.
function hasKeyword(sentence: string, terms: readonly string[]): boolean {
  const words = tokenise(sentence).map((token) => token.text);
  return terms.some((term) => {
    const length = tokenise(term).length;
    if (length === 0) return false;
    for (let from = 0; from < words.length; from++) {
      for (let size = 1; size <= length + 1; size++) {
        if (from + size > words.length) break;
        if (sameWord(words.slice(from, from + size).join(" "), term)) {
          return true;
        }
      }
    }
    return false;
  });
}

/**
 * The testable Tone rules (FR-10). Formell: no anecdote marker. Personlig: at
 * least one motivation phrase. Direkte: at most 300 words and a Matched
 * keyword in the first sentence; with no Matched keyword the prompt asks for
 * none, so that part is not checked. Pure; names every problem it finds.
 */
export function checkTone(
  text: string,
  tone: ToneName,
  matchedTerms: readonly string[],
): ToneCheck {
  const problems: ToneProblem[] = [];
  switch (tone) {
    case "Formell": {
      const marker = findPhrase(text, ANECDOTE_MARKERS);
      if (marker !== undefined) {
        problems.push({ code: "ANECDOTE_MARKER", marker });
      }
      break;
    }
    case "Personlig":
      if (findPhrase(text, MOTIVATION_PHRASES) === undefined) {
        problems.push({ code: "NO_MOTIVATION_PHRASE" });
      }
      break;
    case "Direkte": {
      const words = countWords(text);
      if (words > DIREKTE_MAX_WORDS) {
        problems.push({
          code: "TOO_MANY_WORDS",
          words,
          max: DIREKTE_MAX_WORDS,
        });
      }
      if (
        matchedTerms.length > 0 &&
        !hasKeyword(firstSentenceOf(text), matchedTerms)
      ) {
        problems.push({ code: "NO_KEYWORD_IN_FIRST_SENTENCE" });
      }
      break;
    }
  }
  return { ok: problems.length === 0, problems };
}
