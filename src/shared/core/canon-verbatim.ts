/**
 * The form in which a quote is compared with the text it claims to come from
 * (FR-15): case ignored, and every run of white space (line breaks included)
 * read as one space. Nothing else is ignored: no Unicode normalisation, no
 * punctuation, no inflection, no stemming. A citation that differs in a single
 * letter is a different citation. Do not loosen this to make a check pass.
 */
export function canonVerbatim(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}
