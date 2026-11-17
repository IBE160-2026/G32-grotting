---
title: 'Story 2.7: Score the inputs on the server (phase 1)'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
baseline_commit: 'c74f22aab93142ea3ead7e59c4309f3666ddcec3'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Keyword engine can extract and find Keywords, but nothing turns a CV and a Job ad into a score, a Verdict and explanation keys, and no route answers a submit (FR-4, FR-5, FR-7, FR-8, NFR-4, NFR-6, AD-5, AD-6, AD-7).

**Approach:** Add `match/core` (score, Verdict, explanation keys, CV lookup per Keyword), `keywords/server` (`KeywordSource.resolve`), `application/core` (fingerprint) and `POST /api/analyses`. Phase 1 is pure code on the server; no AI request.

## Boundaries & Constraints

**Always:**
- Branch `story/2.7-score-inputs-on-server` off `main`. Commits cite `2.7`. Stage by explicit path. PR, review, then merge.
- Respect the slice rules (biome `noRestrictedImports`): other slices only through `index.ts` / `contracts.ts`; `match/core` may import `@/modules/keywords/core`.
- `match/core`: `scoreOf(matched, total)` = `Math.round(100 × matched ÷ total)`, 0–100, equal weights, throws `RangeError` when `total` is 0. `verdictOf(score)` = `"strong"` at 70 or above, else `"needs-work"`, judged on the rounded score; it is never part of a wire or stored shape. Explanations are `{ key, params }` only, no Norwegian text: formula `{ key: "MATCH_FORMULA", params: { matched, total, score } }`, per Missing keyword `{ key: "MISSING_KEYWORD", params: { keyword } }`.
- `analyse(cvText, keywords, vocabulary)` in `match/core`: each Keyword is looked up in the CV with `findKeyword`; a Keyword with at least one hit is Matched with its first hit as Evidence `{ stage, line, text, start, end }`, otherwise Missing. Both carry the ad `stage` and `positions` from extraction. Lists keep the order of the extracted Keywords. Result (`analysisResultSchema` in `match/contracts.ts`): `{ keywordSource, score, matchedCount, totalCount, adParagraphs, formula, matched[], missing[] }`; Missing entries carry `explanation`. No Verdict field. `adParagraphs` is the paragraph count of the ad (`splitParagraphs`).
- `keywords/server/keyword-source.ts`: `resolveKeywords(jobAd, { vocabulary })` returns `Result<{ keywords, keywordSource: "code" }, "TOO_FEW_KEYWORDS">` and is the only way Keywords reach `match`. `keywordSourceSchema` (`code | saved | code-fallback`) lives in `keywords/contracts.ts`; only `code` is produced now.
- `application/core/fingerprint.ts`: `fingerprintOf(inputs, vocabularyVersion, keywordSource)` = hex sha256 of `JSON.stringify([canon(cvText), canon(jobAd), canon(jobTitle), canon(employer), vocabularyVersion, keywordSource, CONTRACT_VERSION])`; `CONTRACT_VERSION = 1` in `application/contracts.ts`. Only this file computes it.
- `POST /api/analyses` (`src/app/api/analyses/route.ts`), inside `handle()`: body `{ applicationId: uuid, fingerprint?: string, inputs: AnalysisInputs }` parsed with zod (a client fingerprint is ignored in phase 1); the vocabulary comes from `loadVocabulary()`; returns `{ result: AnalysisResult, fingerprint }`. Sets `export const maxDuration = 120` and `dynamic = "force-dynamic"`. Makes no network request.
- Fewer than 3 Keywords: `ApiError("INVALID_INPUT", { field: "inputs.jobAd" })`, no score. Invalid inputs or body: the existing ZodError path gives a 400 with the field path. Nothing is stored.

**Never:**
- No UI, `messages.nb.ts`, database, session or Verdict storage. No second stemmer or word comparison outside `keywords/core`. No change to the vocabulary, Answer keys or `keywords/core` behaviour. No AI, no `saved` / `code-fallback` source logic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Example pair | Example CV + ad, valid body | 200, `{ ok, data: { result, fingerprint } }`; score and lists equal the Answer key | N/A |
| Rounding | 5 of 7; 1 of 8; 7 of 10; 2 of 3 | 71; 13; 70; 67 | N/A |
| Verdict edge | score 69 / 70 | `needs-work` / `strong` | N/A |
| Repeat | Same body twice | Identical `result` and `fingerprint` | N/A |
| Input change | Any one input differs (even job title) | Different `fingerprint`; score may be equal | N/A |
| Too few | Ad of 200+ characters with under 3 Keywords | 400 `INVALID_INPUT`, field `inputs.jobAd`, no result | N/A |
| Invalid | CV under 200 characters, bad `applicationId`, non-JSON body | 400 `INVALID_INPUT` with field (none for non-JSON) | N/A |
| No Keywords in CV | CV with none | score 0, all Missing, each with an explanation | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/keywords/core/{extract,find,index}.ts` -- `extractKeywords` (returns `Result`, positions `{ paragraph, start, end }`), `findKeyword(text, { term }, vocabulary)`, `splitParagraphs`. Reuse; do not change.
- `src/shared/core/{canon,result,vocabulary}.ts`, `src/shared/server/{handle,data-files}.ts` -- `canon`, `Result`, `Vocabulary`, `handle`/`ApiError`, `loadVocabulary`.
- `src/modules/application/contracts.ts` -- `analysisInputsSchema`; add `CONTRACT_VERSION`, request and response schemas.
- `src/app/api/cv/extract/route.ts` + `route.test.ts` -- pattern for a route and its test. `src/modules/cv/index.ts` -- pattern for a `server-only` slice index.
- New: `src/modules/match/{contracts.ts,index.ts,core/{score.ts,analyse.ts,index.ts}}`, `src/modules/keywords/{contracts.ts,index.ts,server/keyword-source.ts}`, `src/modules/application/{core/fingerprint.ts,server/analyse.ts,index.ts}`, `src/app/api/analyses/route.ts`; each with `*.test.ts`.
- `data/fixtures/*/{cv.txt,ad.txt,answer-key.json,meta.json}` -- test input (read directly in tests).

## Tasks & Acceptance

**Execution:**
- [x] `match/core/score.ts`, `analyse.ts`, `match/contracts.ts`, `match/index.ts` + tests -- score, Verdict, explanations, `analyse`, result schema; tests per matrix and over every Fixture (score, Matched and Missing equal the Answer key)
- [x] `keywords/contracts.ts`, `keywords/server/keyword-source.ts`, `keywords/index.ts` + test -- `KeywordSource.resolve`
- [x] `application/contracts.ts`, `application/core/fingerprint.ts`, `application/server/analyse.ts`, `application/index.ts` + tests -- request/response schemas, fingerprint, phase-1 orchestration
- [x] `app/api/analyses/route.ts` + test -- the route; matrix rows end to end; `fetch` not called
- [x] `next.config.ts` -- confirm `/api/**` tracing already lists `data/vocabulary`; no change expected

**Acceptance Criteria:**
- Given the Example pair, when posted, then score, Matched and Missing equal its Answer key, and the same post twice gives identical bodies.
- Given any one input changed, when posted, then the fingerprint differs.
- Given the repository, when `npx biome check`, `npm run typecheck` and `npx vitest run` run, then all pass.

## Implementation Notes

- Implemented by a subagent from this spec; reviewed by three subagents in step 4. Files: `match/{contracts.ts,index.ts,core/{score,analyse,index}.ts}`, `keywords/{contracts.ts,index.ts,server/keyword-source.ts}`, `application/{contracts.ts,index.ts,core/fingerprint.ts,server/analyse.ts}`, `app/api/analyses/route.ts`, each with tests.
- `analyse` takes a fourth argument `{ keywordSource, adParagraphs }`: the result needs both and the keywords alone do not carry them. `resolveKeywords(jobAd, { vocabulary })` returns a `Result` (the Boundaries text), not an object named `KeywordSource.resolve`.
- Tests compare terms through `normalise` («REST API» in the vocabulary, «REST-API» in the Answer key), as the SM-2 test does.
- Verified: `biome check`, `npm run typecheck`, `vitest run` (46 files, 449 tests) pass. Playwright and Docker not run.

## Spec Change Log

## Review Triage Log

Three reviewer subagents (Blind Hunter, Edge Case Hunter, Verification Gap) ran on the diff.

| Finding | Verdict | Evidence / route |
|---|---|---|
| Fingerprint uses `canon` text, so newline-only changes give one fingerprint but different Evidence lines/offsets (Blind, Edge) | medium | Real, but only once results are stored or cached by fingerprint (AD-8); the formula is in the frozen spec and AD-6. Defer, recorded. |
| `adParagraphs` wiring in `analyseInputs` not pinned by a test (Verification Gap, pre-verified) | medium | Patch: test asserts it equals the ad's paragraph count, not the CV's. |
| Vocabulary version not shown to reach the fingerprint via `analyseInputs` (Verification Gap, pre-verified) | medium | Patch: test with a second `vocabularyVersion`; expects the fingerprint from `fingerprintOf`. |
| `analyse` takes a fourth `context` argument; spec lists three (Edge) | low | Real deviation, no bad outcome: callers are type-checked and the spec's own result shape needs both fields. Recorded in Implementation Notes, no code change. |
| Muddled comment in `score.test.ts`; hard-coded `64` in `analyse.test.ts` (Blind, Verification Gap) | low | Direct corrections applied (comment; value read from the Answer key). |
| Route maps every non-ok result to `inputs.jobAd` (Blind, Edge) | low | Rejected: `TOO_FEW_KEYWORDS` is the only member of the error type; a new code arrives with its own story. |
| Route response not parsed against `analyseResponseSchema`; result schema allows impossible states; `formula` typed as the whole union (Blind) | low | Rejected: producer-only schema, `analyse.test.ts` already parses the result and checks the lists against the Answer keys. |
| `scoreOf` guards only `total === 0`; `analyse` scores a Keyword not in the vocabulary as Missing; `adParagraphs` unchecked (Blind, Edge) | low | Rejected: internal callers pass extracted Keywords and counts; the 2.6 JSDoc documents the unknown-term case. |
| `CONTRACT_VERSION` has no test; client `fingerprint` unbounded string; no body-size cap (Blind, Edge) | low | Deferred with the hardening item, recorded. |
| Missing route tests for upper bounds, `loadVocabulary` failure, method, timing; `applicationId` unused; vocabulary re-read per request (Blind) | low | Rejected: bounds are tested in `contracts.test.ts`, `handle()` covers 500, `applicationId` is part of the AD-6 request shape for later phases, the file is small. |

## Design Notes

Verdict stays out of the wire result (AD-7): the UI calls `verdictOf(score)` from `@/modules/match`. The too-few field is `inputs.jobAd` to match the path zod gives for other `jobAd` errors, so Story 2.8 maps one field name. The fingerprint hashes a JSON array so field boundaries cannot be confused.

## Verification

**Commands:**
- `npx biome check` -- expected: no diagnostics
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
