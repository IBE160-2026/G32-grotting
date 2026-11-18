// FR-26: emails and phone numbers never go to the provider. Matches are deleted,
// nothing is inserted. Plain years, year ranges, percentages and numbers of any
// other length are left alone: a bare number counts as a phone number only when
// it is eight digits starting 2-9, written solid or grouped 2-2-2-2 / 3-2-3 with
// the same single separator between every group (so "2019 2022" stays).
// A separator is a space, a non-breaking space, a dot or a hyphen, never a line
// break, so a number cannot swallow the year on the next line.
const EMAIL =
  /[\p{L}\p{M}\p{N}._%+'-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;

// +47 or 0047, then exactly eight digits, with up to two separators before each.
const NORWEGIAN_PREFIXED = /(?<![\d+])(?:\+|00)47(?:[  .-]{0,2}\d){8}(?!\d)/g;

// Any other +cc: 7 to 12 more digits, with separators and brackets.
const INTERNATIONAL =
  /(?<![\d+])(?:\+|00)[1-9]\d{0,2}(?:[  .-]{0,2}\(?\d\)?){7,12}(?!\d)/g;

const NORWEGIAN_BARE =
  /(?<!\d)[2-9]\d{7}(?!\d)|(?<!\d)[2-9]\d([  .-])\d{2}\1\d{2}\1\d{2}(?!\d)|(?<!\d)[2-9]\d{2}([  .-])\d{2}\2\d{3}(?!\d)/g;

export function stripContactDetails(text: string): string {
  return text
    .replace(EMAIL, "")
    .replace(NORWEGIAN_PREFIXED, "")
    .replace(INTERNATIONAL, "")
    .replace(NORWEGIAN_BARE, "");
}
