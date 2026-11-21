export type { CheckableGap } from "./check-citation";
export { checkCitation } from "./check-citation";
export type {
  CheckLetterInput,
  LetterFlag,
  LetterFlagKind,
  LetterSpan,
} from "./check-letter";
export { checkLetter } from "./check-letter";
export type {
  CheckSuggestionInput,
  SuggestibleGap,
  SuggestionVerdict,
} from "./check-suggestion";
export { checkSuggestion } from "./check-suggestion";
export type { ToneCheck, ToneName, ToneProblem } from "./check-tone";
export {
  checkTone,
  countWords,
  DIREKTE_MAX_WORDS,
  firstSentenceOf,
} from "./check-tone";
export { cvEntries } from "./cv-entries";
export {
  ANECDOTE_MARKERS,
  MOTIVATION_PHRASES,
  UPGRADE_WORD_CV_FORMS,
  UPGRADE_WORD_SAME_FORMS,
  UPGRADE_WORDS,
} from "./word-lists";
