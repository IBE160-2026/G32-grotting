---
title: 'Discard suggestions that invent or upgrade'
type: 'feature'
created: '2026-11-21'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_commit: 'a745eee48248751503bc5f00f5b058891600aeb7'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-1-ask-for-a-rewording-suggestion-with-each-rewordable-gap.md'
warnings: []
deferred:
  - summary: >-
      The Fixture CVs have no blank lines, so the cited entry is the whole CV there; invented numbers, employers, tools and Upgrade-like verbs outside the list («utviklet», «drev», «koordinerte») are not seen by FR-17.
    evidence: |-
      `cvEntries` splits on blank lines only (the only splitter, by intent); the Upgrade list has five words (FR-11); the AC names only another Missing keyword and an Upgrade word.
    location: >-
      src/modules/integrity/core/check-suggestion.ts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** A rewording suggestion (Story 5.1) can invent a fact or make the Student's work or role sound bigger, and the Student would copy a line they cannot defend in an interview (FR-17, P1, SM-3).

**Approach:** `checkSuggestion` in `integrity/core` judges one suggestion: it is discarded when it names a Missing keyword other than its own Gap's (Unsupported claim), or uses an Upgrade word that the cited CV entry (the `cvEntries` block around the citation) holds in no form. `gaps/server` runs it after the structure step and FR-15; a discarded suggestion becomes `null` while citation and explanation stay, and only a count is logged.

## Boundaries & Constraints

**Always:** Order: structure, FR-15, FR-17. `cvEntries` stays the only CV-entry splitter. Upgrade words come from the existing list and `keywords/core` (`stem`, `tokenise`, `findKeyword`); «forsket», «forsker» and «forskning» are one word. Only counts are logged. Tests set `features.rewording` explicitly.

**Never:** No live AI call. No change of cached responses (`gaps.json`), the gaps prompt or `PROMPT_VERSION` (`gaps-3` is locked). `canonVerbatim`/`checkCitation` and the Letter check (FR-11) behave as before. `FEATURE_REWORDING` stays off by default. No UI (5.3). No check of suggestion length or form (not FR-17).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Other keyword | suggestion names another Missing keyword (word, alias or inflection) | discarded, reason `UNSUPPORTED_CLAIM` | none |
| Own keyword | names only its own Keyword, also when a shorter Missing keyword is part of it | kept | none |
| Upgrade word lacking | «Forsket på sårvurdering», entry has no form of «forsket» | discarded, `UPGRADE_WORD` | none |
| Upgrade word present | the entry holds «forsket», «forsker» or «forskning» (any form) | kept | none |
| Clean | «Kompetanse i sårvurdering» | kept | none |
| No single entry holds the citation | Upgrade word used | discarded, `NO_CITED_ENTRY` | fail closed |
| Real gap or `null` suggestion | any | unchanged, not counted | none |
| Rewording off | every suggestion already `null` | no discard | none |

</intent-contract>

## Code Map

- `src/modules/integrity/core/check-suggestion.ts` (+ test) -- new `checkSuggestion`; exported through `index.ts`.
- `src/modules/integrity/core/stem-runs.ts` -- `stemsOf` and `hasRun`, shared with `check-letter.ts` (replaces its private `cvHas`).
- `src/modules/integrity/core/word-lists.ts` -- `UPGRADE_WORD_SAME_FORMS` (forsket: forsker, forskning); the Letter check does not read it.
- `src/modules/gaps/server/analyse.ts` -- `checkGapSuggestions`, FR-17 step after `checkGapCitations`, optional `vocabulary` input.
- `src/app/api/analyses/[id]/gaps/route.ts` -- passes the vocabulary already loaded for phase 1.
- `src/shared/server/log.ts` -- `GapsLogEvent` gains `discarded` (count).
- `data/fixtures/_planted/gaps-fr17-*.json` -- planted nursing responses (read by tests only).
- `test/cached-gaps.test.ts` -- recordings through FR-17, no edit of any recording.

## Tasks & Acceptance

**Execution:**
- [x] `check-suggestion.ts`, `stem-runs.ts`, `word-lists.ts`, `index.ts` (+ unit tests) -- the check and its matrix rows.
- [x] `analyse.ts`, `route.ts`, `log.ts` (+ tests) -- FR-17 step, order, count-only log.
- [x] `data/fixtures/_planted/gaps-fr17-*.json` + tests -- exam paper as research discarded, «Kompetanse i sårvurdering» kept, another Missing keyword discarded.
- [x] `sprint-status.yaml` -- 5-2 `done` in this PR.

**Acceptance Criteria:**
- Given a suggestion naming another Missing keyword, when checked, then it is discarded as an Unsupported claim.
- Given an Upgrade word the cited entry lacks in any form, when checked, then it is discarded; «forsket», «forsker», «forskning» are the same word.
- Given the Gaps are processed, when FR-17 runs, then it runs after structure and FR-15; a discard is `null` with citation and explanation kept; only a count is logged.
- Given the planted responses, when the tests run, then «Forsket på sårvurdering» (nursing exam paper) is discarded, «Kompetanse i sårvurdering» kept, and a suggestion naming another Missing keyword discarded.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 17 findings (Blind 10, Edge 6, Verification gap 1; Intent Alignment descriptive) — high 0, medium 2, low 9, false 4, maybe-false 0 (rows below group some of them)
- findings:
  - `[medium]` `patch` Verification gap: no test pins that the route passes the vocabulary to FR-17 — route test added with a real alias from `data/vocabulary/nb.json`; verified it fails when the route stops passing `vocabulary`.
  - `[low]` `patch` Edge: own keyword «API» inside a longer Missing keyword «REST-API» — blanking the own hit hid the longer one; a longer keyword that holds the own one is now searched in the whole suggestion; test added.
  - `[low]` `patch` Blind/Edge: a citation that stands in two entries joined their words, so one entry with the Upgrade word cleared the other — the suggestion must now hold against every entry that holds the citation; test added.
  - `[low]` `patch` Edge: an empty Missing term could match everything — skipped; covered by the same test.
  - `[low]` `patch` Blind: header comment of the recordings test contradicted its zero-discard assertion — comment corrected.
  - `[low]` `reject` Blind/Edge/Intent: `vocabulary` optional on `analyseGaps` (fails open without aliases) — the only production caller (the route) passes it and a test pins that; a required field would touch every test call for no everyday harm. Reported as an open point.
  - `[low]` `reject` Blind: only `forsket` has same-form entries — the AC names exactly these three forms; other words are open points.
  - `[low]` `reject` Blind: per-reason counts in the log — the AC says only a count of discards.
  - `[low]` `reject` Blind: more tests (real gap with suggestion, two discards, planted alias/NO_CITED_ENTRY, repeated filler in planted files, duplicated `keyOf`) — unit tests cover these; cosmetic.
  - `[false]` `reject` Blind: offsets in `withoutOwnKeyword` may be off for CRLF/NBSP — `findKeyword` reports offsets per line of the CRLF-normalised text, the same convention `check-letter.ts` uses with the same hits; the function splits the same way.
  - `[false]` `reject` Edge: own keyword containing an Upgrade word («erfaring med forskning») makes a faithful suggestion fail — that is the intended discard (an exam paper is not research).
  - `[false]` `reject` Edge: Rewordable gap with null citation judged without entry — the structure step already makes a Rewordable without citation the template; with an Upgrade word `NO_CITED_ENTRY` discards.
  - `[false]` `reject` Blind: spec bookkeeping (status, sprint-status `done`, no log) — `done` is set at finalize; the log is the main loop's task.
  - `[maybe→defer]` `defer` Blind: Fixture CVs have no blank lines, so the «entry» is the whole CV there (see Design Notes); invention beyond Missing keywords and the five Upgrade words (numbers, employers, «utviklet»/«drev») is not FR-17 as specified.
  - Descriptive (Intent Alignment): reading A/C/D1/E2/F1 implemented; planted tests run at `analyseGaps` level, the route test at HTTP level.

## Design Notes

The Fixture CVs have no blank lines, so `cvEntries` returns the whole CV as one entry there; the entry scoping bites on CVs with blank-line separated entries. Not widened here: `cvEntries` stays the only splitter.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: green
- `docker compose run --rm --build test` -- expected: green (`data/` changed)

## Auto Run Result

Status: done

**Summary:** `checkSuggestion` (`integrity/core`) discards a suggestion that names a Missing keyword other than its own Gap's (also by alias, case and inflection) or uses an Upgrade word the cited CV entry holds in no form («forsket», «forsker», «forskning» are one word). `gaps/server` runs it after the structure step and FR-15 (`checkGapSuggestions`); a discard is `null` with citation and explanation kept, and the log carries only counts (`downgraded`, `discarded`). The route passes the vocabulary. Planted nursing responses in `data/fixtures/_planted/gaps-fr17-*.json`. The recorded `gaps-3` suggestions all pass FR-17 (0 discards in all four Fixtures).

**Files:** see the Code Map.

**Review:** 5 patches (1 medium, 4 low), 1 deferred, rest rejected with reasons in the triage log. Follow-up review recommended: false.

**Verification:** `npm run typecheck`, `npm test`, `docker compose run --rm --build test` (see the PR).

**Residual risks:** entry scoping is whole-CV on the Fixtures; FR-17 does not see invented facts that are not Missing keywords; suggestion length and form are checked by nothing.
