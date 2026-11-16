import { err, ok, type Result } from "@/shared/core/result";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { normalise } from "./normalise";
import { stem } from "./stem";
import { splitParagraphs, tokenise } from "./tokenise";

export type KeywordStage = "exact" | "inflection" | "compound" | "alias";

export type KeywordPosition = {
  readonly paragraph: number;
  readonly start: number;
  readonly end: number;
};

export type Keyword = {
  readonly term: string;
  /** The stage of the first position. */
  readonly stage: KeywordStage;
  readonly positions: readonly KeywordPosition[];
};

// An ad span of 1 to 4 tokens is compared with the vocabulary.
const MAX_SPAN = 4;

// Lower is better: a term form beats an alias on the same span.
const STAGE_RANK: Record<KeywordStage, number> = {
  exact: 0,
  inflection: 1,
  compound: 2,
  alias: 3,
};

// Between two tokens of one span there may be only spaces and dashes, or a
// lone dot or slash with no space («Node.js», «CI/CD»). A sentence end, comma,
// bullet or line break stops a span.
const SPAN_GAP = /^(?:[ \t\xA0\-\u{2010}-\u{2015}]*|[./])$/u;

// One written form of a vocabulary entry: the term itself or one alias.
type Entry = {
  readonly termIndex: number;
  readonly viaAlias: boolean;
  readonly normalised: string;
  /** Token-wise stems joined by a space: finds inflections. */
  readonly stems: string;
  /** Stem of the joined text: finds split and compound forms. */
  readonly joinedStem: string;
};

type Candidate = {
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
function buildIndex(vocabulary: Vocabulary): Map<string, Entry[]> {
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

function indexOf(vocabulary: Vocabulary): Map<string, Entry[]> {
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

function candidatesIn(
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
 * The Keywords of a job ad: vocabulary terms and aliases found through the
 * normalise and stem pipeline (FR-5). Pure and synchronous; the same ad and
 * vocabulary always give the same list (NFR-6), in order of first position.
 * Fewer than 3 distinct Keywords is an error (FR-4).
 */
export function extractKeywords(
  adText: string,
  vocabulary: Vocabulary,
): Result<Keyword[], "TOO_FEW_KEYWORDS"> {
  const index = indexOf(vocabulary);
  const stems = new Map<string, string>();

  const kept: Candidate[] = [];
  splitParagraphs(adText).forEach((paragraph, paragraphIndex) => {
    // Longest span first, then earliest, then vocabulary order; keep the
    // ones that do not overlap a kept one.
    const all = candidatesIn(paragraph, paragraphIndex, index, stems);
    // A wider span of a term is dropped when a span of the same term lies
    // inside it, so a short word cannot glue on («sykehjem er»).
    const candidates = all
      .filter(
        (wide) =>
          !all.some(
            (inner) =>
              inner.termIndex === wide.termIndex &&
              inner.length < wide.length &&
              inner.first >= wide.first &&
              inner.first + inner.length <= wide.first + wide.length,
          ),
      )
      .sort(
        (a, b) =>
          b.length - a.length || a.first - b.first || a.termIndex - b.termIndex,
      );
    const taken = new Set<number>();
    for (const candidate of candidates) {
      const slots = Array.from(
        { length: candidate.length },
        (_, offset) => candidate.first + offset,
      );
      if (slots.some((slot) => taken.has(slot))) continue;
      for (const slot of slots) taken.add(slot);
      kept.push(candidate);
    }
  });

  kept.sort((a, b) => a.paragraph - b.paragraph || a.start - b.start);

  const byTerm = new Map<
    number,
    { stage: KeywordStage; positions: KeywordPosition[] }
  >();
  for (const candidate of kept) {
    const position = {
      paragraph: candidate.paragraph,
      start: candidate.start,
      end: candidate.end,
    };
    const existing = byTerm.get(candidate.termIndex);
    if (existing) {
      existing.positions.push(position);
    } else {
      byTerm.set(candidate.termIndex, {
        stage: candidate.stage,
        positions: [position],
      });
    }
  }

  const keywords: Keyword[] = Array.from(byTerm, ([termIndex, found]) => ({
    term: vocabulary.terms[termIndex],
    stage: found.stage,
    positions: found.positions,
  }));
  return keywords.length < 3 ? err("TOO_FEW_KEYWORDS") : ok(keywords);
}
