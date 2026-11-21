// The word lists of the Tone rules (FR-10), in bokmål. Code, not AI, judges the
// Tone, so the lists are plain constants anyone can read and extend. A phrase
// is matched case-insensitively as whole words; the spaces in it match any run
// of white space.

// Formell has none of these: they open a personal story from the Student's life.
export const ANECDOTE_MARKERS = [
  "Da jeg var",
  "Som barn",
  "Som liten",
  "Som ung",
  "Som tenåring",
  "Jeg husker",
  "Jeg minnes",
  "Når jeg tenker tilbake",
  "Siden jeg var liten",
  "Fra jeg var liten",
  "I barndommen",
  "En gang jeg",
] as const;

// Personlig has at least one of these: they say why the Student wants the job.
export const MOTIVATION_PHRASES = [
  "Jeg brenner for",
  "Brenner jeg for",
  "Jeg har lyst til",
  "Jeg har lyst på",
  "Jeg har stor lyst til",
  "Det motiverer meg",
  "Det som motiverer meg",
  "Jeg er motivert for",
  "Jeg er motivert til",
  "Jeg drives av",
  "Det som driver meg",
  "Jeg er engasjert i",
  "Jeg er begeistret for",
  "Jeg gleder meg til",
] as const;

// Words that make the Student's role bigger than a CV usually shows (FR-11).
// The Letter uses one of them while the CV text holds no form of it: flagged,
// never removed. Short and low-risk on purpose; a phrase is compared word by
// word by stem (`sameWord`), so «ledet» is cleared by «leder» in the CV.
export const UPGRADE_WORDS = [
  "forsket",
  "ledet",
  "ansvarlig for",
  "publiserte",
  "grunnla",
] as const;

// CV phrases that mean the same as an Upgrade word although they stem
// differently («ansvar» and «ansvarlig» do not): the CV holding one of them
// clears the word like the word itself would.
export const UPGRADE_WORD_CV_FORMS: Readonly<
  Record<string, readonly string[]>
> = { "ansvarlig for": ["ansvar for"] };

// Other word forms that count as the same Upgrade word when a Suggestion is
// checked (FR-17): «forsket», «forsker» and «forskning» are one word to a
// Student, although «forskning» stems differently. A form here clears the word
// when the CV entry holds it, and makes the word count when the Suggestion
// uses it. The Letter check (FR-11) does not read this list.
export const UPGRADE_WORD_SAME_FORMS: Readonly<
  Record<string, readonly string[]>
> = { forsket: ["forsker", "forskning"] };
