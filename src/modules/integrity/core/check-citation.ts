import { canonVerbatim } from "@/shared/core/canon-verbatim";

/**
 * The structural part of a Gap that the integrity checks read. `integrity`
 * imports neither `gaps` nor `letter`; a Gap fits this shape.
 */
export type CheckableGap = {
  readonly keyword: string;
  readonly kind: "rewordable" | "real";
  readonly citation: string | null;
};

/**
 * FR-15: true only for a Rewordable gap whose citation stands in the CV text
 * word for word. A substring test on `canonVerbatim` text, so only case and
 * white space (line breaks included) are ignored, never anything looser. A
 * Real gap, a missing citation and an empty citation are false: an empty quote
 * is a substring of everything and must never pass. `sentCvText` is the CV
 * text the AI was sent.
 */
export function checkCitation(gap: CheckableGap, sentCvText: string): boolean {
  if (gap.kind !== "rewordable" || gap.citation === null) return false;
  const citation = canonVerbatim(gap.citation);
  if (citation === "") return false;
  return canonVerbatim(sentCvText).includes(citation);
}
