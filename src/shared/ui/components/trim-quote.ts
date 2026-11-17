// The longest quote shown whole (EXPERIENCE.md, Evidence quote).
export const QUOTE_MAX = 160;

export type MarkSpan = { readonly start: number; readonly end: number };

export type TrimmedQuote = {
  readonly text: string;
  /** The marked span in `text`, end exclusive. */
  readonly mark: MarkSpan | undefined;
};

const WHITESPACE = /\s/;

/**
 * Trims a quote past `max` characters at word boundaries, with «…» where text
 * was left out, keeping the marked span in view. The text stays word for word:
 * only its ends are cut. Pure.
 */
export function trimQuote(
  text: string,
  mark: MarkSpan | undefined,
  max: number = QUOTE_MAX,
): TrimmedQuote {
  if (text.length <= max) return { text, mark };

  // A window of `max` characters around the mark, or at the start without one.
  const markStart = mark ? Math.min(mark.start, text.length) : 0;
  const markEnd = mark ? Math.min(mark.end, text.length) : 0;
  const markLength = markEnd - markStart;
  const room = Math.max(0, max - markLength);
  let from = Math.max(
    0,
    Math.min(markStart - Math.floor(room / 2), text.length - max),
  );
  let to = Math.min(text.length, from + max);

  // Move each cut inward to a word boundary, never past the mark.
  if (from > 0 && !WHITESPACE.test(text[from - 1])) {
    let next = from;
    while (next < markStart && !WHITESPACE.test(text[next])) next++;
    while (next < markStart && WHITESPACE.test(text[next])) next++;
    from = next;
  }
  if (to < text.length && !WHITESPACE.test(text[to])) {
    let previous = to;
    while (previous > markEnd && !WHITESPACE.test(text[previous - 1])) {
      previous--;
    }
    to = previous;
  }
  while (from < markStart && WHITESPACE.test(text[from])) from++;
  while (to > markEnd && WHITESPACE.test(text[to - 1])) to--;
  // A mark longer than `max` stays whole, and a run with no space in it is cut
  // hard rather than leaving only «…».
  if (to < markEnd) to = markEnd;
  if (to <= from) to = Math.min(text.length, from + max);

  const before = from > 0 ? "…" : "";
  const after = to < text.length ? "…" : "";
  return {
    text: `${before}${text.slice(from, to)}${after}`,
    mark: mark
      ? {
          start: markStart - from + before.length,
          end: markEnd - from + before.length,
        }
      : undefined,
  };
}
