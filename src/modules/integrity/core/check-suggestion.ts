import { findKeyword, stem, tokenise } from "@/modules/keywords/core";
import { canon } from "@/shared/core/canon";
import { canonVerbatim } from "@/shared/core/canon-verbatim";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { cvEntries } from "./cv-entries";
import { hasRun, stemsOf } from "./stem-runs";
import {
  UPGRADE_WORD_CV_FORMS,
  UPGRADE_WORD_SAME_FORMS,
  UPGRADE_WORDS,
} from "./word-lists";

/**
 * The structural part of a Gap that the suggestion check reads. `integrity`
 * imports neither `gaps` nor `letter`; a Gap fits this shape.
 */
export type SuggestibleGap = {
  readonly keyword: string;
  readonly citation: string | null;
};

export type CheckSuggestionInput = {
  readonly suggestion: string;
  // The Gap the suggestion belongs to: its own Keyword and its citation.
  readonly gap: SuggestibleGap;
  // Every Missing keyword of the analysis, the Gap's own one included.
  readonly missing: readonly string[];
  // The CV text the AI was sent (the one FR-15 checks the citation against).
  readonly sentCvText: string;
  readonly vocabulary: Vocabulary;
};

/**
 * Why a suggestion is discarded. `UNSUPPORTED_CLAIM`: it names a Missing
 * keyword other than its own Gap's. `UPGRADE_WORD`: it uses an Upgrade word
 * that the cited CV entry holds in no form. `NO_CITED_ENTRY`: no single CV
 * entry holds the citation, so there is nothing to hold the suggestion against.
 */
export type SuggestionVerdict =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "UNSUPPORTED_CLAIM" | "UPGRADE_WORD" | "NO_CITED_ENTRY";
    };

const keyOf = (text: string) => canon(text).toLowerCase();

// The text with every hit of the Gap's own Keyword blanked out (spaces, line
// breaks kept), so a longer Missing keyword that holds the own one, or the
// other way round, does not count as a second keyword.
function withoutOwnKeyword(
  text: string,
  keyword: string,
  vocabulary: Vocabulary,
): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  for (const hit of findKeyword(text, { term: keyword }, vocabulary)) {
    const line = lines[hit.line - 1] ?? "";
    lines[hit.line - 1] =
      line.slice(0, hit.start) +
      " ".repeat(hit.end - hit.start) +
      line.slice(hit.end);
  }
  return lines.join("\n");
}

// The CV entries (`cvEntries`) that hold the citation, with the case and white
// space tolerance of FR-15: the entry around the citation, not the whole CV.
// A quote that stands in two entries has two: the suggestion must hold against
// each of them.
function citedEntries(citation: string | null, sentCvText: string): string[] {
  const quote = canonVerbatim(citation ?? "");
  if (quote === "") return [];
  return cvEntries(sentCvText).filter((entry) =>
    canonVerbatim(entry).includes(quote),
  );
}

// Every form of an Upgrade word, as runs of stems: the word, the CV phrases
// that mean the same, and the other forms of the same word (FR-17).
function upgradeForms(term: string): string[][] {
  return [
    term,
    ...(UPGRADE_WORD_CV_FORMS[term] ?? []),
    ...(UPGRADE_WORD_SAME_FORMS[term] ?? []),
  ].map((form) => tokenise(form).map((token) => stem(token.text)));
}

/**
 * FR-17, the integrity guard on a rewording suggestion (AD-14). A suggestion is
 * discarded when it names a Missing keyword other than its own Gap's (an
 * Unsupported claim), or uses an Upgrade word that the cited CV entry holds in
 * no form (a bigger kind of work or role than the CV shows). Any word form is
 * the same word: «forsket», «forsker» and «forskning». Flags only: the caller
 * decides what a discard does. Pure, and the order of the two checks is fixed:
 * the keyword first, then the Upgrade words.
 */
export function checkSuggestion(
  input: CheckSuggestionInput,
): SuggestionVerdict {
  const { suggestion, gap, missing, sentCvText, vocabulary } = input;

  const ownKey = keyOf(gap.keyword);
  const rest = withoutOwnKeyword(suggestion, gap.keyword, vocabulary);
  for (const term of missing) {
    const key = keyOf(term);
    if (key === "" || key === ownKey) continue;
    // A longer keyword that holds the own one («REST-API» holds «API») is
    // looked for in the whole suggestion: blanking the own keyword breaks it.
    const text = key.includes(ownKey) ? suggestion : rest;
    if (findKeyword(text, { term }, vocabulary).length > 0) {
      return { ok: false, reason: "UNSUPPORTED_CLAIM" };
    }
  }

  const suggestionStems = stemsOf(suggestion);
  const entries = citedEntries(gap.citation, sentCvText).map(stemsOf);
  for (const term of UPGRADE_WORDS) {
    const forms = upgradeForms(term).filter((form) => form.length > 0);
    if (!forms.some((form) => hasRun(suggestionStems, form))) continue;
    if (entries.length === 0) return { ok: false, reason: "NO_CITED_ENTRY" };
    if (entries.some((stems) => !forms.some((form) => hasRun(stems, form)))) {
      return { ok: false, reason: "UPGRADE_WORD" };
    }
  }
  return { ok: true };
}
