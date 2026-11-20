---
title: 'Classify each Missing keyword on the server'
type: 'feature'
created: '2026-11-20'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_commit: '26fb09e3b614fc87c8c5df2e2f3c8db223655f84'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Student sees which Keywords the CV is missing but not whether the CV already shows them in other words (Rewordable) or truly lacks them (Real). Nothing on the server classifies a Missing keyword.

**Approach:** A new `gaps` slice with `POST /api/analyses/[id]/gaps`, built like the Letter route: recompute phase 1, check the fingerprint, make exactly one `runAi` request with a versioned bokmål prompt, then a structure step that gives exactly one `Gap` per Missing keyword. Behind `features.gaps` (off by default until Story 4.6).

## Boundaries & Constraints

**Always:** One `runAi` call per request, `maxDuration = 120` literal. `features.gaps` off: `NOT_FOUND`, no AI request, checked before anything else. The Missing keywords come from the server's own phase 1, never from the client. The gaps slice imports `ai` only through `@/modules/ai`; `application` and `gaps` meet in the route. Structure step: one Gap per Missing keyword in Missing-list order, extra AI items dropped, an absent or unusable item becomes a template Real gap (`explanation: { key: "REAL_GAP", params: { keyword } }`, `citation: null`). `suggestion` is `null` (no suggestion is asked for in this story; Story 5.1 adds it, and it is `null` while `features.rewording` is off). The prompt is in English, asks for bokmål output, and carries `PROMPT_VERSION`. Lookup key is the Gaps key of AD-15: no job title, employer or tone goes into the `runAi` request.

**Never:** No change of `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` or README. No live AI call. No FR-15 citation check, no `integrity` change, no Cached `gaps.json`, no UI (Stories 4.2 to 4.4). No suggestion handling (Epic 5). No change of `/letter-check`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | `features.gaps` on, fingerprint matches, AI returns one item per Missing keyword | `{ gaps: Gap[], meta }`, one Gap per Missing keyword in Missing order, one `runAi` call | none |
| Flag off | `features.gaps` off, any body | `NOT_FOUND` (404), `runAi` not called | none |
| Stale | fingerprint differs from the recomputed one | `ANALYSIS_STALE` (409), no AI call | none |
| Extra and reordered items | AI returns items in another order, unknown keywords or duplicates | Gaps in Missing order; extras dropped; first item per keyword wins | none |
| Skipped keyword | AI leaves a Missing keyword out | template Real gap for it | none |
| Unusable item | Rewordable with no citation, unknown kind, or blank explanation | template Real gap | none |
| Rewording off | AI item carries a `suggestion` | `suggestion` is `null` | none |
| Nothing missing | phase 1 has no Missing keyword | `{ gaps: [], meta: null }`, no AI call | none |
| AI failure | timeout, provider error, notice or cap, Test-mode miss | `ApiError` with the `AiFailure` code and `retryable` | as the Letter route |
| Bad body | wrong shape or `id` != `applicationId` | `INVALID_INPUT` | as the Letter route |

</intent-contract>

## Code Map

- `src/app/api/analyses/[id]/letter/route.ts` -- the pattern to copy (handle, recompute, stale, one AI call, `maxDuration`, `dynamic`).
- `src/modules/letter/{contracts.ts,index.ts,server/generate.ts,server/prompts/letter.ts}` -- the shape of a slice, `runAi` use, prompt builder with `asData`/`asLine`.
- `src/modules/ai/server/run-ai.ts` -- `AiRequest`; the Gaps lookup key is built from `cvText` + `jobAd` only.
- `src/modules/match/contracts.ts` -- `MissingKeyword`; `explanationSchema` is the pattern for template `{ key, params }`.
- `src/shared/server/config.ts` -- `getConfig().features.gaps`.
- `src/shared/ui/messages.nb.ts` -- gets the Real-gap template text under `gaps`.
- Created: `src/modules/gaps/contracts.ts`, `index.ts`, `server/analyse.ts`, `server/prompts/gaps.ts`, `src/app/api/analyses/[id]/gaps/route.ts` and their tests.

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/gaps/contracts.ts` -- `gapSchema`, `gapsRequestSchema`, `gapsResponseSchema` (meta nullable), `REAL_GAP_KEY`.
- [x] `src/modules/gaps/server/prompts/gaps.ts` -- `PROMPT_VERSION = "gaps-1"`, `gapsPromptBuilder`.
- [x] `src/modules/gaps/server/analyse.ts` -- `analyseGaps` (one `runAi`) and the pure `structureGaps`.
- [x] `src/modules/gaps/index.ts` -- server entry.
- [x] `src/app/api/analyses/[id]/gaps/route.ts` -- the route.
- [x] `src/shared/ui/messages.nb.ts` -- Real-gap template text.
- [x] Tests: contracts, prompt, structure step, `analyseGaps`, route (flag off/on, stale, one call, `maxDuration`).

**Acceptance Criteria:**
- Given the route with `features.gaps` on, when called with a matching fingerprint, then it makes exactly one `runAi` request with the CV text, the Job ad and the Missing keywords, and `maxDuration` is 120.
- Given the built prompt, then it asks for kind, a one or two sentence bokmål explanation in the order missing / why it matters / covering CV entry, a word-for-word citation for a Rewordable gap, formal requirements Rewordable only if the CV states them explicitly, hedged Rewordable explanations, and no ATS claim.
- Given the AI answer, when the structure step runs, then there is exactly one Gap per Missing keyword in Missing order, extras are dropped, a skipped keyword is a template Real gap, and every `suggestion` is `null`.
- Given `features.gaps` off, when the route is called, then `NOT_FOUND` and no AI request.

## Spec Change Log

## Review Triage Log

### 2026-11-20 - Review pass

The four review layers ran as subagents (blind hunter, edge-case hunter, verification gap, intent alignment). The implementation was done inline in the main session (precedent: Story 3.12), so there was no implementation subagent to re-engage and the patches were applied directly.

- verdicts: 27 rows - high 0, medium 4, low 17, false 4, maybe-false 0, descriptive 1 (intent alignment, no defect)
- findings:
  - `[medium]` `patch` Blind/Edge: one malformed AI item (missing `kind` or `keyword`, `explanation: null`) failed the whole answer with a 502, against the AC that a skipped keyword becomes a template Real gap. Items are now parsed one by one; a bad item is a skipped Keyword (test added).
  - `[medium]` `patch` Gap: the route-to-`runAi` pass-through of `consent` and `studentId: null` was untested. Test added, mirrors the Letter route.
  - `[medium]` `patch` Gap: the phase-1 failure branch (`INVALID_INPUT`, `inputs.jobAd`) was untested. Short-ad test added.
  - `[medium]` `patch` Blind: the prompt never stated the top-level `{ "gaps": [...] }` shape, so a bare array would give a 502. The prompt now says it; test added.
  - `[low]` `patch` Edge: `asLine` did not collapse U+2028, U+2029 and U+0085. Regex widened; test added.
  - `[low]` `patch` Gap: no test ties `REAL_GAP_KEY` to `messages.nb.ts`. The gap reviewer routed it to defer; it is a three-line test, so it was added now.
  - `[low]` `reject` Blind/Edge: keyword matching is exact after canon and lower case. A mismatched echo only costs a safe template Real gap, never a false Rewordable; fuzzy matching would add the risk of matching the wrong keyword.
  - `[low]` `reject` Blind: the template says "vi fant ingen linje" also for a skipped keyword. The AC and AD-7 require one template for skipped and downgraded Gaps, and the UX spec says a skipped Gap shows only the Real-gap template line.
  - `[low]` `defer` Blind: skipped or unusable items are not counted in the log. AD-14 names counts for FR-15 downgrades and FR-17 discards; the log union gets a gaps event in Story 4.2 together with the FR-15 count.
  - `[low]` `reject` Blind/Edge: no server check of the explanation text for ATS claims, length, exclamation marks or language. Not in the AC; the prompt carries the rules and the manual checklist (Story 4.6) checks them.
  - `[low]` `reject` Blind/Edge: citation not checked against the CV. That is Story 4.2 (FR-15) and excluded by the intent.
  - `[low]` `reject` Blind: `gapSchema` does not enforce the kind/citation invariants and the schemas are not used to validate the output. The structure step is the only producer; the shape is the fixed AD-7 shape.
  - `[low]` `reject` Blind/Edge: `await params` sits outside `handle`. Identical to the Letter route; Next passes a resolved promise.
  - `[low]` `reject` Blind: the `INVALID_INPUT` field is hard-coded to `inputs.jobAd`. `analyseInputs` has one failure code (`TOO_FEW_KEYWORDS`), an ad problem; same as the Letter route.
  - `[low]` `reject` Blind: tests coupled to prompt wording, thin 429 and timeout route coverage, no API doc. `runAi` failure codes are covered in `run-ai.test.ts`; wording tests are the AC's check; the repo has no API doc.
  - `[low]` `reject` Blind/Edge: unauthenticated paid route, unbounded `fingerprint` string, duplicate Missing terms, very large Missing list. The same holds for the Letter route (Access code, Daily cap, 90 s abort); phase 1 yields a unique term list.
  - `[low]` `reject` Blind: the citation is checked against the stripped CV text in FR-15. `runAi` already returns `sentCvText` for this; Story 4.2 uses it.
  - `[low]` `reject` Edge: delimiter variants with attributes (`<cv x>`) stay in the data block. The block is delimited by the exact tags the prompt names, as in the Letter prompt; no path beyond what the Letter prompt accepts.
  - `[low]` `reject` Edge: U+0085 and attribute variants beyond the patch above need no further guard.
  - `[false]` `reject` Edge: "the flag must be checked before anything else, but `await params` runs first". `params` is a resolved promise; the flag check runs before the body is read.
  - `[false]` `reject` Blind: "gapSchema and gapsResponseSchema are only used in tests". Correct, but they are the wire contract for Story 4.4; no harm.
  - `[false]` `reject` Edge: "the comment claims leniency that does not hold". True before the first patch, now fixed.
  - `[false]` `reject` Blind: "nothing outside code changed". The spec, context file and sprint status are in the final commit.
  - `[descriptive]` Intent alignment: readings A and C are implemented. Divergences noted and accepted: the flag is tested through a mocked `getConfig` (the default is guarded by the unchanged `FEATURE_DEFAULTS`); `suggestion` is `null` unconditionally because this story asks for none (Epic 5 wires it); the empty-Missing case makes no request and returns `meta: null`; consent is required in the body like the Letter route; the template also covers unusable items.

## Design Notes

The AI item shape is `{ keyword, kind, explanation, citation }` (kind `rewordable` or `real`). Items are matched to Missing keywords by canonical lower-case keyword text. A Rewordable item without a citation cannot be Rewordable and becomes the template Real gap; whether the citation is really in the CV is Story 4.2 (FR-15). A Real item keeps its AI explanation as `{ text }` and has `citation: null`.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: Biome, typecheck, Vitest and Playwright all green

## Auto Run Result

Status: done

**Summary:** Story 4.1 adds the `gaps` slice and `POST /api/analyses/[id]/gaps`. Behind `features.gaps` (off by default): `NOT_FOUND` with no AI request when off; otherwise it recomputes phase 1, answers `ANALYSIS_STALE` on a fingerprint mismatch and makes one `runAi` request (`maxDuration = 120`). The `gaps-1` prompt asks for kind, a hedged bokmål explanation and a word-for-word citation, with the formal-requirement rule and no ATS claim. The structure step gives one Gap per Missing keyword in order, drops extras and turns a skipped or unusable item into the template Real gap `{ key: "REAL_GAP", params: { keyword } }`. `suggestion` is always `null`.

**Files:**
- `src/modules/gaps/contracts.ts` - Gap, request and response schemas, `REAL_GAP_KEY`.
- `src/modules/gaps/index.ts` - server entry (`analyseGaps`).
- `src/modules/gaps/server/analyse.ts` - `analyseGaps` (one `runAi`) and `structureGaps`.
- `src/modules/gaps/server/prompts/gaps.ts` - `PROMPT_VERSION = "gaps-1"`, `gapsPromptBuilder`.
- `src/app/api/analyses/[id]/gaps/route.ts` - the route.
- `src/shared/ui/messages.nb.ts` - `gaps.template.REAL_GAP` text.
- Tests: `contracts.test.ts`, `server/analyse.test.ts`, `server/prompts/gaps.test.ts`, `route.test.ts`.
- `_bmad-output/implementation-artifacts/epic-4-context.md`, this spec, `sprint-status.yaml`.

**Review:** 6 patches applied (malformed AI item, consent pass-through test, phase-1 failure test, top-level JSON shape in the prompt, Unicode line separators, message-key test); 1 deferred (log counts for structure-step downgrades, with Story 4.2); the rest rejected with reasons above. Follow-up review recommended: false.

**Verification:** `npm test` (Biome, typegen and tsc, Vitest, Playwright) green. No `package.json`, lockfile, Dockerfile or `data/` change, so no Docker run.

**Deviations and hand-offs:**
- With no Missing keyword the route makes no AI request and returns `{ gaps: [], meta: null }` (the AC's "exactly one request" is read as "one request when there is something to judge").
- `suggestion` is `null` unconditionally; `features.rewording` is not read yet. Story 5.1 adds the suggestion to the prompt (new `PROMPT_VERSION`), schema and FR-17.
- Test mode: a Gaps request currently misses the cached adapter and answers `TEST_MODE_UNAVAILABLE`; Story 4.3 adds `gaps.json` indexed by the AD-15 Gaps key (`runAi` already builds it from CV and ad only).
- Story 4.2 adds FR-15 (`checkCitation` on `sentCvText`) after `structureGaps`, plus the count log of downgrades.
- `/letter-check` still takes `gaps: null` (Story 4.5).
