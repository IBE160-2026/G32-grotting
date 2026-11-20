---
title: 'Let AI propose Keywords when code alone falls short (FR-5b applies)'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: 'cf4b2f8e62ecac87d53642aef97acbef8e97b5fb'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/docs/qa/fr-5b-decision.md'
warnings: []
deferred:
  - summary: >-
      The form's consent hand-off to the letter-check phase-1 rerun has no e2e test.
    evidence: |-
      Unit tests cover requestLetterCheck with a consent; nothing forces a stale check on the fallback server and reads the rerun body. Narrow: the first phase 1 normally saved the list, so the rerun finds it without AI.
    location: >-
      src/modules/application/ui/application-form.tsx
    severity: low
  - summary: >-
      Proposed terms that overlap or nest (for example «regnskap» and «regnskapssystem», an alias and its term) count as separate Keywords.
    evidence: |-
      proposeKeywords dedupes by canon text only. Overlap handling across terms would be a product decision about the list; it also shifts the recorded lists.
    location: >-
      src/modules/keywords/core/propose.ts
    severity: medium (unverified)
  - summary: >-
      The keywords prompt says «same words as the ad, in the base form» and «6 to 30» while MAX_PROPOSED is 60.
    evidence: |-
      Changing the wording means bumping PROMPT_VERSION and recording the four Fixtures again (paid requests); not done in this story.
    location: >-
      src/modules/keywords/server/prompts/keywords.ts
    severity: low
  - summary: >-
      Repeated submits of an ad that cannot get a list spend a Daily cap slot each time.
    evidence: |-
      A failed Keyword request is not remembered, so the next run asks again. Bounded by the cap of 30.
    location: >-
      src/modules/keywords/server/keyword-source.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Code-only extraction failed SM-2 on the held-out Fixture (decision 17 Nov, `docs/qa/fr-5b-decision.md`), so FR-5b applies: for a new Job ad the Keyword list must come from AI, checked against the ad, saved by ad hash, and reused.

**Approach:** `KeywordSource.resolve` gets the FR-5b path: saved list in `keyword_lists`, else one `runAi` request (ad only, never the CV) whose Keywords must each pass `findKeyword` against the ad, saved under `contentHash(canon(ad))`; otherwise the code-only list marked `code-fallback`. `keywordFallback` defaults on (not on Hosted) and the AI notice and its version change.

## Boundaries & Constraints

**Always:** Slices import each other only through the allowed entry points. Phase 1 stays free of the CV in any AI request. Test mode answers from `cached/keywords.json` (key `contentHash(canon(ad))`); a miss, a missing notice, the cap or a failed request gives the code list with `code-fallback`. Phase 2 never asks AI for Keywords: it reads the saved list only, so its fingerprint matches phase 1. Same ad gives the same saved list and score (NFR-6). No test makes a paid request; only `scripts/record-cached.ts` does, once per Fixture.

**Never:** No Hosted change: Hosted keeps no AI, so `keywordFallback` is forced off there. No edit of a Cached file by hand. No change of the vocabulary or Answer keys.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New ad, notice accepted, live, under cap | not in `keyword_lists` | one `runAi`; proposed terms kept only if found in the ad; list saved; `saved` | none |
| Same ad again | saved row | no `runAi`; same list; `saved` | none |
| Planted bad term | proposed term not in the ad | term dropped; others kept; second run identical | none |
| No notice / cap reached / provider error / fewer than 3 valid terms | new ad | code list, `code-fallback`; score block shows the less-precise line | none |
| Test mode, Fixture ad | `cached/keywords.json` | `saved` from the cached list | none |
| Test mode, other ad | cache miss | code list, `code-fallback` | none |
| Ad with under 3 code Keywords, AI available | new ad | AI list rescues it | `TOO_FEW_KEYWORDS` only when both fail |

</intent-contract>

## Code Map

- `src/modules/keywords/server/keyword-source.ts` -- `resolveKeywords` becomes async with the FR-5b path.
- `src/modules/keywords/server/schema.ts` (new), `drizzle/0001_*.sql` -- `keyword_lists`.
- `src/modules/keywords/server/prompts/keywords.ts` (new) -- prompt, `PROMPT_VERSION`, output schema.
- `src/modules/keywords/core/{find,propose}.ts` -- `findKeyword` accepts a term outside the vocabulary; `proposeKeywords` keeps proposals found in the ad with positions.
- `src/shared/server/content-hash.ts` (new), `src/modules/ai/core/lookup-key.ts` -- `contentHash`; keywords lookup key.
- `src/shared/server/data-files.ts`, `src/modules/ai/server/adapters/cached.ts` -- load and index `cached/keywords.json`.
- `scripts/record-cached.ts` -- `--keywords` mode (one request, raw output).
- `src/shared/server/config.ts`, `src/shared/ui/messages.nb.ts`, `src/modules/ai/ui/ai-notice.tsx` -- default on (off on Hosted), `notice-3`, ad-only sentence.
- `src/modules/application/{contracts,server/analyse,ui/application-form}.ts*`, `src/app/api/analyses/**` -- consent in phase 1, saved-only in phase 2, progress line.
- `src/modules/match/ui/score-block.tsx` -- «Mindre presist: nøkkelordene er hentet ut uten KI.»

## Tasks & Acceptance

**Execution:** as the Code Map; tests next to each file; update sm2/analyse held-out marker according to the recorded list; record `cached/keywords.json` for the four Fixtures.

**Acceptance Criteria:** the five Story 3.11 ACs in `epics.md`, plus: Hosted still resolves to no AI; `docker compose run --rm --build test` passes.

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 35 findings (Blind Hunter 18, Edge Case Hunter 14, Verification Gap 3; Intent Alignment is descriptive and filed none) — high 0, medium 3, low 31, false 1, maybe-false 0
- findings:
  - `[medium]` `patch` Route hand-off of consent to `runAi` untested (VG) — added `src/app/api/analyses/route.consent.test.ts`
  - `[medium]` `patch` Failing database path in `resolveKeywords` untested (VG) — two tests mock `getDb` (read fails, save fails)
  - `[medium]` `patch` A saved row the engine finds no usable list in is kept by `onConflictDoNothing`, so every run pays and falls back (EC) — replaced by an update; test added
  - `[low]` `patch` `catch {}` hides a broken database (BH) — logs the error name through `log`
  - `[low]` `patch` `recordKeywords` accepts an empty list (EC) — refuses it, test added
  - `[low]` `patch` Test name «ignores a bad one» said the opposite of what it asserts (BH) — renamed
  - `[low]` `defer` Consent hand-off for the check rerun lacks an e2e (VG), overlapping proposed terms (BH, EC), prompt wording vs MAX_PROPOSED (BH), repeated failing submits spend cap (EC)
  - `[false]` `reject` Letter index extracts PDFs for Fixtures with only keywords.json (EC) — `buildIndex` skips folders with no Letters before the PDF
  - `[false]` `reject` Cached Letters not re-recorded so they disagree with the AI list (BH) — Letters are recorded once per Fixture; the check on them is the integrity guard (the Formell Example Letter now gets one flag, «tilgjengelighet», which is the guard working)
  - `[low]` `reject` Test-mode Cached list is saved to `keyword_lists` (BH, EC) — needed so phase 2 finds the list phase 1 used; it is a recorded live list
  - `[low]` `reject` `readSaved` ignores `prompt_version` (BH, EC) — NFR-6: a saved list is reused by ad hash; columns are for audit
  - `[low]` `reject` Phase 1 can spend a request on any consenting caller (BH) — same cap and consent model as the Letter route
  - `[low]` `reject` Progress line is silent for screen readers (BH) — the AC says «unannounced», NFR-2
  - `[low]` `reject` Stale fingerprint if a list is saved between phase 1 and 2 (BH, EC) — `ANALYSIS_STALE` reruns phase 1 once, by design (AD-6)
  - `[low]` `reject` e2e and unit oracles use the engine (BH), recorder bypasses `resolveKeywords` (BH), core imports server hash (BH), duplicate Cached ad takes Test mode down (BH), hand-typed numbers in the doc (BH), planted file shape unchecked (BH), cwd-relative paths (BH), `analyseInputs` seam (BH), Hjem plot before the list is saved outside Test mode (EC), held-out marker (EC), spec Code Map path (EC) — design choices stated in the spec or decision doc, or not worth the code; the Code Map path was corrected

## Auto Run Result

Summary: FR-5b is built. `resolveKeywords` is async: with `keywordFallback` on it reads `keyword_lists`, else makes one `runAi` request (Job ad only), keeps the proposed terms `findKeyword` finds in the ad, saves the list under `contentHash(canon(ad))` (`saved`), else falls back to code (`code-fallback`). Test mode answers Fixture ads from `cached/keywords.json`. New: `keyword_lists` and migration `0001`, keywords prompt `keywords-1`, `proposeKeywords`, `--keywords` in the record script, four recorded lists (4 paid requests), the notice sentence and `notice-3`, progress line, less-precise line, consent in phase 1, the default on (off on Hosted).

Verification: `npx biome check`, `npm run typecheck`, `npm run db:check`, `npx vitest run`, `npx playwright test` (200 passed), `docker compose run --rm --build test`.

Residual risks: the AI lists do not equal any Answer key (see `docs/qa/fr-5b-decision.md`); in Test mode the Example pair shows 63 %, not the key's 64 %.

## Verification

**Commands:** `npx biome check`, `npm run typecheck`, `npm run db:check`, `npm test`, `docker compose run --rm --build test`.
