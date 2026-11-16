import { stemmer } from "@orama/stemmers/norwegian";
import { normalise } from "./normalise";

// Marker kept on nouns in «-else» so «ledelse» and «leder» stay apart.
// normalise() removes every dash, so no ordinary stem can contain it.
const ELSE_MARKER = "-else";

const ELSE_ENDING = /^(.{2,})else(?:n|r|ne|s|ns|rs|nes)?$/u;
const AGENT_ENDING = /^(.{3,}er)(?:e|ne|en|ens)$/u;

/**
 * Pre-steps for the two gaps in Snowball Norwegian.
 *
 * 1. Plural and definite forms of agent nouns in «-er» fall back to the «-er»
 *    form (Snowball leaves «utviklere» as «utvikler» but cuts «utvikler» to
 *    «utvikl»).
 * 2. Nouns in «-else» keep a marker (Snowball cuts both «ledelse» and
 *    «leder» to «led»).
 */
function stemWord(word: string): string {
  const elseNoun = ELSE_ENDING.exec(word);
  if (elseNoun) {
    return stemmer(elseNoun[1]) + ELSE_MARKER;
  }
  const agent = AGENT_ENDING.exec(word);
  return stemmer(agent ? agent[1] : word);
}

/**
 * The stem of a term: normalise, pre-steps, then Snowball Norwegian. A term
 * that still has spaces after normalise (a space next to a digit or symbol) is
 * stemmed word by word.
 */
export function stem(term: string): string {
  return normalise(term).split(" ").map(stemWord).join(" ");
}

/** The one judge of «the same word» (AD-5): equal stems. */
export function sameWord(a: string, b: string): boolean {
  return stem(a) === stem(b);
}
