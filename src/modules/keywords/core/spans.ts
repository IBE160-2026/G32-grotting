import type { Vocabulary } from "@/shared/core/vocabulary";
import { normalise } from "./normalise";
import { stem } from "./stem";
import { tokenise } from "./tokenise";

// The span engine shared by extractKeywords (job ad) and findKeyword (CV): one
// place decides what counts as «the same word» in running text (AD-5).

/**
 * How a span matched, best first: `exact` (same text once case, dashes and
 * spaces between letters are ignored, so «data analyse» is exact for
 * «dataanalyse»), `inflection` (same word by word after stemming), `compound`
 * (only the joined stems are equal: a split and inflected form) or `alias`.
 */
export type KeywordStage = "exact" | "inflection" | "compound" | "alias";

// A span of 1 to 5 tokens is compared with the vocabulary.
export const MAX_SPAN = 5;

// Lower is better: a term form beats an alias on the same span.
const STAGE_RANK: Record<KeywordStage, number> = {
  exact: 0,
  inflection: 1,
  compound: 2,
  alias: 3,
};

// Between two tokens of one span there may be only spaces and dashes, an
// opening parenthesis after a space («norsk (morsmål)»), or a lone dot or slash
// with no space («Node.js», «CI/CD»). A closing parenthesis, sentence end,
// comma, bullet or line break stops a span.
const SPAN_GAP =
  /^(?:[ \t\xA0\-\u{2010}-\u{2015}]*|[ \t\xA0]\([ \t\xA0]*|[./])$/u;

// One written form of a vocabulary entry: the term itself or one alias.
export type Entry = {
  readonly termIndex: number;
  readonly viaAlias: boolean;
  readonly normalised: string;
  /** Token-wise stems joined by a space: finds inflections. */
  readonly stems: string;
  /** Stem of the joined text: finds split and compound forms. */
  readonly joinedStem: string;
};

export type Candidate = {
  readonly termIndex: number;
  readonly stage: KeywordStage;
  readonly paragraph: number;
  /** Index of the first token of the span, and the span's token count. */
  readonly first: number;
  readonly length: number;
  readonly start: number;
  readonly end: number;
};

function entryOf(
  form: string,
  termIndex: number,
  viaAlias: boolean,
): Entry | undefined {
  const words = tokenise(form).map((token) => token.text);
  if (words.length === 0) return undefined;
  const joined = words.join(" ");
  return {
    termIndex,
    viaAlias,
    normalised: normalise(joined),
    stems: words.map(stem).join(" "),
    joinedStem: stem(joined),
  };
}

// Two lookup keys per entry make extraction a map lookup instead of
// terms x tokens.
export function buildIndex(vocabulary: Vocabulary): Map<string, Entry[]> {
  const byKey = new Map<string, Entry[]>();
  const add = (key: string, entry: Entry) => {
    const list = byKey.get(key);
    if (list) list.push(entry);
    else byKey.set(key, [entry]);
  };
  vocabulary.terms.forEach((term, termIndex) => {
    const aliases = Object.hasOwn(vocabulary.aliases, term)
      ? vocabulary.aliases[term]
      : [];
    const forms = [
      { form: term, viaAlias: false },
      ...aliases.map((form) => ({ form, viaAlias: true })),
    ];
    for (const { form, viaAlias } of forms) {
      const entry = entryOf(form, termIndex, viaAlias);
      if (!entry) continue;
      add(entry.stems, entry);
      if (entry.joinedStem !== entry.stems) add(entry.joinedStem, entry);
    }
  });
  return byKey;
}

// Built once per vocabulary object; extraction does not depend on the cache.
const indexes = new WeakMap<Vocabulary, Map<string, Entry[]>>();

export function indexOf(vocabulary: Vocabulary): Map<string, Entry[]> {
  let index = indexes.get(vocabulary);
  if (!index) {
    index = buildIndex(vocabulary);
    indexes.set(vocabulary, index);
  }
  return index;
}

function stageOf(
  entry: Entry,
  spanNormalised: string,
  spanStems: string,
): KeywordStage {
  if (entry.viaAlias) return "alias";
  if (spanNormalised === entry.normalised) return "exact";
  // Equal stems word by word also mean equal token counts.
  if (spanStems === entry.stems) return "inflection";
  return "compound";
}

export function candidatesIn(
  paragraph: string,
  paragraphIndex: number,
  index: Map<string, Entry[]>,
  stems: Map<string, string>,
): Candidate[] {
  const stemOf = (text: string) => {
    let value = stems.get(text);
    if (value === undefined) {
      value = stem(text);
      stems.set(text, value);
    }
    return value;
  };
  const tokens = tokenise(paragraph);
  const found: Candidate[] = [];
  for (let first = 0; first < tokens.length; first++) {
    const longest = Math.min(MAX_SPAN, tokens.length - first);
    for (let length = 1; length <= longest; length++) {
      if (length > 1) {
        const gap = paragraph.slice(
          tokens[first + length - 2].end,
          tokens[first + length - 1].start,
        );
        if (!SPAN_GAP.test(gap)) break;
      }
      const span = tokens.slice(first, first + length);
      const words = span.map((token) => token.text);
      const joined = words.join(" ");
      const spanStems = words.map(stemOf).join(" ");
      const spanJoinedStem = stemOf(joined);
      const entries = new Set([
        ...(index.get(spanStems) ?? []),
        ...(index.get(spanJoinedStem) ?? []),
      ]);
      if (entries.size === 0) continue;
      const spanNormalised = normalise(joined);

      // One candidate per term and span: the best stage among its forms.
      const best = new Map<number, KeywordStage>();
      for (const entry of entries) {
        if (entry.stems !== spanStems && entry.joinedStem !== spanJoinedStem) {
          continue;
        }
        const stage = stageOf(entry, spanNormalised, spanStems);
        const current = best.get(entry.termIndex);
        if (current === undefined || STAGE_RANK[stage] < STAGE_RANK[current]) {
          best.set(entry.termIndex, stage);
        }
      }
      for (const [termIndex, stage] of best) {
        found.push({
          termIndex,
          stage,
          paragraph: paragraphIndex,
          first,
          length,
          start: span[0].start,
          end: span[length - 1].end,
        });
      }
    }
  }
  return found;
}

/**
 * Drops a wider span of a term when a span of the same term lies inside it and
 * is at least as good a match, so a short word cannot glue on («sykehjem er»).
 * A wider span with a better stage stays: the whole phrase beats its own alias
 * («dokumenterer i pasientjournal» over «pasientjournal»). Sorted longest span
 * first, then earliest, then vocabulary order.
 */
export function orderCandidates(all: Candidate[]): Candidate[] {
  return all
    .filter(
      (wide) =>
        !all.some(
          (inner) =>
            inner.termIndex === wide.termIndex &&
            STAGE_RANK[wide.stage] >= STAGE_RANK[inner.stage] &&
            inner.length < wide.length &&
            inner.first >= wide.first &&
            inner.first + inner.length <= wide.first + wide.length,
        ),
    )
    .sort(
      (a, b) =>
        b.length - a.length || a.first - b.first || a.termIndex - b.termIndex,
    );
}

/** Keeps, in order, the candidates that overlap no earlier kept one. */
export function keepNonOverlapping(ordered: Candidate[]): Candidate[] {
  const taken = new Set<number>();
  const kept: Candidate[] = [];
  for (const candidate of ordered) {
    const slots = Array.from(
      { length: candidate.length },
      (_, offset) => candidate.first + offset,
    );
    if (slots.some((slot) => taken.has(slot))) continue;
    for (const slot of slots) taken.add(slot);
    kept.push(candidate);
  }
  return kept;
}
