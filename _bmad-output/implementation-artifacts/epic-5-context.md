# Epic 5 Context: Get rewording suggestions to copy

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

For each Rewordable gap, the Student gets one concrete phrasing of the cited CV line in the employer's words, using only facts already in that CV entry, with a «Kopier» button. Code discards any suggestion that invents a fact or upgrades the kind of work or role, so the Student never copies a line they could not defend in an interview. The epic also switches suggestions on by default and runs the first full live checklist early enough to fix prompts before the 3 December stability decision.

## Stories

- Story 5.1: Ask for a rewording suggestion with each Rewordable gap
- Story 5.2: Discard suggestions that invent or upgrade
- Story 5.3: Copy a suggestion from the Gapanalyse
- Story 5.4: Switch on suggestions and run the first live checklist

## Requirements & Constraints

- Never invent (P1): a suggestion may reword what the Student learned or did into the employer's terms, but may not add facts, upgrade the kind of work (an exam paper is not research) or the role (taking part is not leading). Real gaps get no suggestion.
- The student decides (P3): suggestions are hedged («Linjen din dekker trolig dette – vurder å ta det med.»), there is no "add to CV" action, and nothing is sent automatically. Only plain text is copied.
- A suggestion is discarded if it names a Missing keyword other than its own Gap's, or contains an Upgrade word that the cited CV entry lacks (any word form counts as the same word, e.g. «forsket»/«forsker»/«forskning»). A discard is logged as a count only, never content.
- A discarded suggestion leaves the citation and explanation in place and shows a fixed «no suggestion» line instead of the box.
- Success measures: zero invented qualifications on the live checklist (L2, G2, R1 failures must be fixed with a prompt change); a minimum share of expected Rewordable gaps found and shown with a suggestion that passed the FR-17 guard (G4), so the app cannot be "honest" by saying nothing.
- Decision point 3 December: automated tests for FR-13 to FR-17 pass and one live Fixture run has no G2 or R1 failures. If not, 4-11 December goes to finishing Gaps and suggestions, accounts/history (S6+S7) are dropped (cut 1) and the cut is logged in the PRD.
- All Student-facing text is bokmål (NFR-1).

## Technical Decisions

- Flag `FEATURE_REWORDING` gates this epic. Its default lives only in `FEATURE_DEFAULTS` in `config.ts`, and it is turned on by the last story. While off, every `suggestion` is `null` and the guard is skipped. Automated tests set the flag explicitly until then.
- The `Gap` shape is unchanged: `{ keyword, kind: 'rewordable'|'real', explanation, citation, suggestion: string|null }`. Suggestions come from the same single gaps AI request, not a new one.
- There is one gaps prompt. Extending it bumps `PROMPT_VERSION`, and `gaps.json` is re-recorded once for every Fixture via `scripts/record-cached.ts`. CI fails if the Example pair's cached prompt version differs from the current one.
- Recorder Missing list per Fixture: the Answer key's Missing list plus any Missing keyword phase 1 finds in Test mode (saved AI keyword list), deduplicated, Answer-key words first, in one request. After this, the `it.fails` in `test/gaps-test-mode.test.ts` is removed. `qa:compare` still judges G2 on the Answer key's must-never-suggest keywords only.
- All AI-output checks live in `integrity/core` (imports neither `letter` nor `gaps`): add `checkSuggestion` there, reusing `cvEntries` (the only CV-entry splitter), the Upgrade-word list and word comparison through `keywords/core`. The cited entry is the `cvEntries` block around the citation.
- Order in `gaps/server`: structure step, then citation check (FR-15), then suggestion check (FR-17). Discards and downgrades are logged as counts only.
- Planted bad responses go in `data/fixtures/_planted/` (read only by tests). Example cases: «Forsket på sårvurdering» for the nursing Fixture's exam-paper entry is discarded, «Kompetanse i sårvurdering» is kept, and a suggestion naming another Missing keyword is discarded.
- `scripts/qa-compare.ts` gains the G4 count. Live outputs and checklist results (L1-L8, G1-G5, R1-R3) are committed under `docs/qa/` with dates.

## UX & Interaction Patterns

- Suggestion box (`gaps/ui/suggestion-box`): inside a Rewordable gap, after the Evidence quote, a raised surface headed «Omformuleringsforslag» holding the suggestion and a small «Kopier», followed by the fixed hedge line. Reuse the existing copy button, evidence quote and `announce()`.
- Copy feedback matches the Letter's: label becomes «Kopiert» for about 1.8 s, polite live region says «Kopiert til utklippstavlen.», focus stays on the button; if the clipboard is blocked, select the text and show «Kopier med Ctrl+C, eller hold inne på mobil.».
- Discarded suggestion: box replaced by «Ingen forslag her. Vurder selv om og hvordan du vil formulere det.»; the citation stays.
- With rewording on, the phase-2 progress line reads «Skriver gapanalyse, omformuleringer og søknadsbrev … dette tar under ett minutt.» Rewordings live inside the single «Gapanalyse» section, not a separate placeholder.
- The Example pair's end-to-end Playwright run must show suggestions with «Kopier» and pass the axe scan.

## Cross-Story Dependencies

- Builds on Epic 4: the gaps route and prompt, `checkCitation`, `cvEntries`, cached `gaps.json`, the Gapanalyse UI and the `FEATURE_GAPS` flag (on since Story 4.6).
- 5.1 comes first (prompt and re-recorded Cached responses). 5.2 needs suggestions to exist to guard. 5.3 renders both outcomes (kept or discarded). 5.4 needs 5.1-5.3 and uses live keys for the checklist.
- Cached Letter checks (Epic 3/4.5) are unaffected, but re-recording `gaps.json` must keep Story 4.3's structure tests passing.
