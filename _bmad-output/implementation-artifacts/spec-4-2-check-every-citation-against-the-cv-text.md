---
title: 'Check every citation against the CV text'
type: 'feature'
created: '2026-11-20'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_commit: '5ce9cf816395c48f967501a6a228fe7ecd3dcfba'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: []
deferred:
  - summary: >-
      Genuine quotes may be downgraded when PDF text carries soft hyphens, zero-width characters or hyphenated line breaks, or the AI adds quote marks, a bullet marker or an ellipsis.
    evidence: |-
      canonVerbatim must ignore only case and white space (hard requirement), so these are not folded. Unverified; the downgrade count on the live Fixture run (Story 4.3 recording, Story 4.6 checks) settles it, and a prompt fix with a new PROMPT_VERSION follows if it shows.
    location: >-
      src/shared/core/canon-verbatim.ts
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** The Gap analysis (Story 4.1) lets a Rewordable gap through with whatever citation the AI wrote. If the quote is not really in the CV, the app tells the Student they have experience their CV does not show.

**Approach:** Add the FR-15 step in `gaps/server` after the structure step: every Rewordable gap's citation is checked word for word against the CV text that was sent (`checkCitation` in `integrity/core`, on `canonVerbatim` text: case and white space ignored, nothing looser). A citation that is not found turns the Gap into the fixed Real-gap template; only a count of downgrades is logged. Behind `features.gaps` (off by default until Story 4.6).

## Boundaries & Constraints

**Always:** `canonVerbatim` (`src/shared/core/canon-verbatim.ts`) ignores only case and white space, never looser, and the check is a substring test against `sentCvText` (the stripped CV text `runAi` returns). `cvEntries(text)` in `integrity/core` returns the blocks of lines bounded by blank lines and is the only CV-entry splitter in the code. `integrity/core` takes structural inputs (`CheckableGap`) and imports neither `letter` nor `gaps`. A downgraded Gap is the template Real gap (`explanation: { key: "REAL_GAP", params: { keyword } }`, `citation: null`, `suggestion: null`). The log carries a count only, never a citation, keyword or CV text. Planted Cached responses live in `data/fixtures/_planted/` and are read only by tests.

**Never:** No change of `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` or README. No live AI call. No Cached `gaps.json` for the Fixtures (Story 4.3), no UI (Story 4.4), no change of `/letter-check` or `checkLetter` (Story 4.5), no suggestion check (Epic 5). Do not loosen the citation check to get a test green.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exact citation | Rewordable gap, citation in the CV text word for word | Gap kept unchanged | none |
| Case and line breaks | Same words, other case and white space | Gap kept | none |
| Paraphrase | Citation reworded | Template Real gap | none |
| From the ad | Citation is a line of the Job ad | Template Real gap | none |
| One changed word | One word differs | Template Real gap | none |
| Empty citation | Blank or missing citation on a Rewordable gap | Not found (an empty string is in every text) | Already the template from the structure step |
| Real gap | `kind: real` | Passes through untouched, never counted | none |
| Log | Any run that made an AI request | One `{ kind: "gaps", downgraded: n }` event; none when no request is made or the request fails | none |

</intent-contract>

## Code Map

- `src/shared/core/canon-verbatim.ts` -- `canonVerbatim`: lower case, any run of white space is one space, nothing else (no NFC, no punctuation or hyphen folding). `canon` (NFC + white space, case kept) stays the cached-key function.
- `src/modules/integrity/core/{check-citation.ts, cv-entries.ts, index.ts}` -- `checkCitation(gap: CheckableGap, sentCvText)`; `cvEntries`, built on `splitParagraphs` of `keywords/core` (the same blank-line rule, one implementation). `splitParagraphs` itself only splits the Job ad and stays; no other CV-entry splitter exists in the code.
- `src/modules/gaps/server/analyse.ts` -- `checkGapCitations` (FR-15 step, pure) and its call in `analyseGaps` after `structureGaps`, using `run.value.sentCvText`; the log call.
- `src/shared/server/log.ts` -- `GapsLogEvent` in the `LogEvent` union (the deferred item from Story 4.1).
- `data/fixtures/_planted/gaps-citation-{paraphrased,from-ad,one-word-changed,exact-case-and-line-breaks}.json` -- raw `AiOutput` for the Example pair's five Missing keywords.
- Read-only: `src/modules/ai/server/run-ai.ts` (`sentCvText`), `data/fixtures/example-nordic-digital/{cv,ad}.txt`.

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/core/canon-verbatim.ts` (+ test) -- `canonVerbatim`.
- [x] `src/modules/integrity/core/check-citation.ts`, `cv-entries.ts`, `index.ts` (+ tests) -- `checkCitation`, `cvEntries`.
- [x] `src/modules/gaps/server/analyse.ts` -- FR-15 step and count log; `src/shared/server/log.ts` -- `GapsLogEvent`.
- [x] `data/fixtures/_planted/gaps-citation-*.json` -- the four planted responses.
- [x] `src/modules/gaps/server/analyse.test.ts` -- step unit tests, count-only log, planted responses end to end.

**Acceptance Criteria:**
- Given `checkCitation`, when it checks a Rewordable gap's citation, then it is a substring test on `canonVerbatim` text against `sentCvText`, ignoring only case and white space.
- Given a citation not in the CV text word for word, when `gaps/server` runs FR-15 after the structure step, then the Gap is the template Real gap, its AI explanation and suggestion are dropped, and only a count of downgrades is logged.
- Given `cvEntries(text)`, then it returns the blocks of lines bounded by blank lines and is the only CV-entry splitter.
- Given the planted responses, then a paraphrased citation, a citation from the ad and a citation with one changed word are each downgraded, and an exact citation with different case and line breaks passes.

## Spec Change Log

## Review Triage Log

### 2026-11-20 - Review pass

The four review layers ran as subagents (blind hunter, edge-case hunter, verification gap, intent alignment). The implementation was done inline in the main session (precedent: Stories 3.12 and 4.1), so there was no implementation subagent to re-engage and the patches were applied directly.

- verdicts: 21 findings - high 0, medium 1, low 12, false 2, maybe-false 0, descriptive 6 (intent alignment readings, no defect); the one medium is `maybe-false`-like and deferred as unverified
- findings:
  - `[low]` `reject` Blind/Edge/Gap: the substring has no word boundary or minimum length, so a citation starting or ending mid-word ("skrev enkle test") or a single word ("Git") passes. AC and the hard requirement define the check as a plain substring test on `canonVerbatim` text; a word-boundary rule would be a new rule outside the AC, and a truncated quote is still word for word text of the CV. Not changed.
  - `[low]` `reject` Blind: the citation is not tied to the keyword (a "Jeg brukte Git." quote passes for TypeScript). FR-15 checks that the quote exists in the CV; whether it supports the keyword is the AI's judgement and manual checklist G (Story 4.6).
  - `[low]` `reject` Edge: a near-empty citation ("." or "e") is a substring of almost any CV. Only the empty case is guarded because an empty quote is the one that is never a quote; a minimum length is a new rule outside the AC.
  - `[low]` `reject` Edge: a quote joined across a deleted contact detail or across two CV entries passes. The AI saw exactly `sentCvText`, the AC fixes the check as a substring test on it, and `cvEntries` is not part of the check by AC.
  - `[medium]` `defer` Blind/Edge: genuine quotes may be downgraded when PDF text carries soft hyphens, zero-width characters or hyphenated line breaks, or when the AI adds quote marks, a bullet marker or an ellipsis. `canonVerbatim` must not be loosened (hard requirement); the prompt already says word for word, no ellipsis. Unverified. What would settle it: the downgrade count on the live Fixture run (Story 4.3 recording, manual checks in Story 4.6); a prompt fix and a new `PROMPT_VERSION` if it shows.
  - `[low]` `false` Blind: the NFC/NFD test might be vacuous after a formatter normalises the file. The test builds both forms from `\u` escapes, and the gap reviewer confirmed the decomposed form is really `a` + U+030A.
  - `[low]` `patch` Blind: the planted explanations were copied from the pull-requests case and did not fit their keyword. Rewritten per keyword.
  - `[low]` `patch` Blind: nothing tied a plant to what it claims (a from-ad citation in the ad, not in the CV; the exact plant in the CV only in other case and line breaks). Assertions added to the planted tests.
  - `[low]` `reject` Blind: the CV text is canonicalised once per gap. At most five Gaps and a CV of some kB; no measurable cost.
  - `[low]` `reject` Blind: the count is only tested through a mocked `log`, and the `not.toContain` assertions are weak. `GapsLogEvent` has only `kind` and a number, so no content can reach it by type; the real `log` is unchanged.
  - `[low]` `reject` Blind: the downgrade is invisible to the caller. AC and UX: nothing but the Real-gap template tells the Student; the count goes to the log only.
  - `[low]` `reject` Blind/Edge/Intent: `cvEntries` has no caller and gives one entry for the Example CV (no blank lines). The AC requires it as the shared splitter for Story 4.5 and Epic 5; tested in its own file.
  - `[low]` `reject` Blind: tests read fixtures by cwd-relative path and parse the planted file twice. Same as the other Fixture tests in the repo.
  - `[false]` `reject` Intent: `integrity/core` importing `keywords/core` may break the boundary. `biome.json` explicitly allows it and `check-letter.ts` already does it.
  - `[descriptive]` Intent alignment (x6): readings implemented as described; divergences noted and accepted: the tests exercise `analyseGaps` with a stub adapter, not the gated route (the route only passes `analyseGaps` through and is unchanged); the log is a count on every request that returns (also zero) and nothing when no request is made or it fails; `checkCitation` takes the Gap and is false for a Real gap.
  - `[low]` `reject` Verification gap: no verification gaps; its one extra finding is the word-boundary point above.

## Design Notes

Citations are checked against `sentCvText` (contact lines stripped), not the raw CV, because that is the text the AI saw. The check does not require the quote to lie inside one `cvEntries` block: AC and AD-14 define it as a substring test on the whole text. `cvEntries` is the shared splitter for Epic 5 (rewording) and the Letter check.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: Biome, typegen and tsc, Vitest and Playwright all green
- `docker compose run --rm --build test` -- expected: green (`data/` changed)

## Auto Run Result

Status: done

**Summary:** Story 4.2 adds the FR-15 step. `canonVerbatim` (shared/core) ignores only case and white space; `checkCitation` and `cvEntries` live in `integrity/core`. In `gaps/server`, `checkGapCitations` runs after `structureGaps` on `sentCvText` and turns every Rewordable gap whose citation is not in the CV word for word into the template Real gap (explanation, citation and suggestion dropped). `analyseGaps` logs one `{ kind: "gaps", downgraded }` event per request that returns, a count only. Four planted Cached responses cover paraphrase, citation from the ad, one changed word, and exact citation in other case and line breaks. `features.gaps` is still off by default.

**Files:**
- `src/shared/core/canon-verbatim.ts` (+ test) - `canonVerbatim`.
- `src/modules/integrity/core/check-citation.ts`, `cv-entries.ts`, `index.ts` (+ tests) - `checkCitation`, `CheckableGap`, `cvEntries` (built on `splitParagraphs`; no other CV-entry splitter exists, `splitParagraphs` splits the Job ad).
- `src/modules/gaps/server/analyse.ts` (+ test) - `checkGapCitations`, the FR-15 step and the count log.
- `src/shared/server/log.ts` - `GapsLogEvent`.
- `data/fixtures/_planted/gaps-citation-{paraphrased,from-ad,one-word-changed,exact-case-and-line-breaks}.json`.
- This spec, `sprint-status.yaml`.

**Review:** 2 patches applied (planted explanations per keyword, assertions tying each plant to what it claims); 1 deferred (genuine quotes downgraded by PDF artefacts or AI quote marks: watch the count on the live run); the rest rejected with reasons above. Follow-up review recommended: false.

**Verification:** `npm run typecheck`, `npm test` (Biome, tsc, Vitest, Playwright) green; `docker compose run --rm --build test` green (`data/` changed).

**Deviations and hand-offs:**
- None from the AC. The log event is new (`kind: "gaps"`), also for zero downgrades; skipped or unusable items from the structure step are not counted (still open from Story 4.1; only FR-15 downgrades are named in AD-14).
- Story 4.3: Cached `gaps.json` goes through the same `analyseGaps`, so FR-15 runs on it; check the downgrade count when recording. `canonVerbatim` and `canon` differ on purpose (`canon` keeps case and does NFC for the cache key).
- Story 4.5: `checkCitation(gap, sentCvText)` is ready for `/letter-check`; it is false for any Real gap. `cvEntries` has no caller yet (Story 4.5 / Epic 5).
