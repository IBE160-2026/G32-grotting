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
