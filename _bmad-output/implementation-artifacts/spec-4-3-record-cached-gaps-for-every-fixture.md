---
title: 'Record Cached Gaps for every Fixture'
type: 'feature'
created: '2026-11-20'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_commit: 'd6a587085b8674c42d2b89fc016ebc780441e3aa'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Gap analysis (Stories 4.1 and 4.2) only works against a live key. Without Cached Gaps, Test mode has no Gapanalyse to show (Story 4.4, Story 4.6 Playwright), and nothing compares the Gap output with the Answer keys (SC4, checklist G2).

**Approach:** The cached adapter answers a Gaps request from `data/fixtures/<id>/cached/gaps.json` by the AD-15 Gaps key (CV and ad, no title, employer or Tone); any other input is `TEST_MODE_UNAVAILABLE`. `scripts/record-cached.ts --gaps` records one live request per Fixture, raw and labelled. `scripts/qa-compare.ts` reports every G2 failure per Fixture. Fixture tests judge the recordings after the guards; CI fails when the Example pair's `promptVersion` differs from `PROMPT_VERSION`. Behind `features.gaps` (off by default until Story 4.6).

## Boundaries & Constraints

**Always:** A Cached file is a raw `AiOutput<T>` (before the structure step and FR-15), written only by `scripts/record-cached.ts`, labelled with provider, model, prompt version and date. The Gaps key is `lookupKeyOf({ task: "gaps", cvText, jobAd })`, indexed under `cv.txt` and `cv.pdf` text. One live request per Fixture, `maxRetries: 0`, no repeat. The key from `.env` is never printed, logged or committed. After recording, neither an Answer key nor the prompt is changed to make a test pass.

**Never:** No change of `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` or README. No UI (Story 4.4), no change of `/letter-check` (Story 4.5), no suggestion (Epic 5). No second live request for any Fixture, whatever the outcome. No deploy or setting change on Hosted/Vercel.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Example, Test mode | Example CV (`cv.txt` or the text of `cv.pdf`) and ad | The recorded Gaps, through the structure step and FR-15 | none |
| Other input | A CV or ad that is not a Fixture's | `TEST_MODE_UNAVAILABLE`, not retryable | `CachedMissError` becomes the code in `runAi` |
| Fixture with Gaps only | `cached/` holds `gaps.json` and no Letter | Served for Gaps; its Letter is a miss | none |
| Bad Cached file | `gaps.json` is not JSON or not an `AiOutput` | Startup of the index throws naming the file, never its content | `Invalid Cached response <id>/gaps.json` |
| Recording | One Fixture, live key | One request, raw answer written with its meta; a failed request writes nothing and is not retried | exit code 1, code only on stderr |
| G2, Rewordable and in the CV | Must-never-suggest keyword Rewordable, citation in the CV | Reported as G2 failure with Fixture and keyword; exit 1 | none |
| G2, caught by FR-15 | Must-never-suggest keyword Rewordable, citation not in the CV | Reported as «caught»; the Student never sees it Rewordable; exit 0 | none |
| Prompt version | Example's `promptVersion` differs from `PROMPT_VERSION` | The test run fails | none |

</intent-contract>

## Code Map

- `src/modules/ai/core/lookup-key.ts` -- `GAPS_TASK`.
- `src/modules/ai/server/adapters/cached.ts` -- Gaps index (own index per task: Letter, Keywords, Gaps); `cvTextsOf` shared by the Letter and Gaps indexes.
- `src/shared/server/data-files.ts` -- `CachedGapsFile`, `cachedGaps` on `FixtureFiles`; a folder with only `gaps.json` is a Test-mode source.
- `src/modules/gaps/server/prompts/gaps.ts` -- `gapsOutputSchema` (moved here from `analyse.ts` so the recorder can import it without server-only code; item shape now typed and lenient via `.catch`); prompt text and `PROMPT_VERSION` `gaps-2` (see Design Notes).
- `scripts/record-cached.ts` -- `--gaps` task (`recordGaps`).
- `scripts/qa-compare.ts` (+ test) -- `evaluateGaps`, `compareAll`, `npm run qa:compare`.
- `test/cached-gaps.test.ts` -- Fixture tests: structure, FR-15, G2, Test-mode lookup, prompt-version CI check.
- `data/fixtures/*/cached/gaps.json` -- the four recordings (written by the recorder).
- `data/fixtures/_planted/gaps-g2-rest-api-{rewordable,invented-citation}.json` -- planted outputs for qa-compare.

## Tasks & Acceptance

**Execution:**
- [x] `lookup-key.ts`, `cached.ts`, `data-files.ts` (+ tests) -- the cached adapter answers Gaps by the Gaps key.
- [x] `prompts/gaps.ts`, `analyse.ts` -- schema moved; prompt reviewed before recording.
- [x] `scripts/record-cached.ts` (+ tests) -- `--gaps`.
- [x] `scripts/qa-compare.ts`, `package.json` (+ tests, planted data) -- G2 report.
- [x] `test/cached-gaps.test.ts` -- fixture tests and the CI check.
- [x] Record the four Fixtures live (one request each).

**Acceptance Criteria:**
- Given a live key, when `scripts/record-cached.ts` runs the gaps task for every Fixture, then each gets a `gaps.json` holding raw `AiOutput<T>` labelled with provider, model, prompt version and date.
- Given Test mode, when the Example pair or a Fixture is analysed, then the request is answered from `gaps.json` by the Gaps key, and any other input returns `TEST_MODE_UNAVAILABLE`.
- Given the Cached Gaps after the guards, then each Fixture has exactly one Gap per Missing keyword, every Rewordable gap's citation passes FR-15, and none of the Answer key's must-never-be-Rewordable keywords is Rewordable.
- Given `scripts/qa-compare.ts` run on a set of live outputs, then it reports every G2 failure per Fixture.
- Given CI, when the Example pair's cached gaps `promptVersion` differs from the current one, then CI fails.

## Spec Change Log

## Review Triage Log

### 2026-11-20 - Review pass

The four review layers ran as subagents (blind hunter, edge-case hunter, verification gap, intent alignment). The implementation was done inline in the main session (precedent: Stories 3.12, 4.1 and 4.2: the live recording needs the key and a one-shot discipline in one session), so there was no implementation subagent to re-engage and the patches were applied directly.

- verdicts: 25 rows (13 blind, 7 edge, 1 verification gap plus 3 of its other findings, 1 intent-alignment summary) - high 0, medium 2, low 20, false 1, maybe-false 0, descriptive 1 (the intent alignment readings, no defect); 6 patched, 19 rejected with reasons
- findings:
  - `[medium]` `patch` Blind/Edge: `recordGaps` wrote the schema-parsed copy, not the adapter output, so a malformed item could be rewritten by the `.catch` in the recording. Fixed: it writes `generated.output`; the parse is only a presence check; test with a malformed item added. The four files written live are identical either way (the SDK already returns the schema-parsed output, and the parse is idempotent).
  - `[medium]` `patch` Verification gap: nothing tested the Gaps route in Test mode against the Missing list the app computes. Added `test/gaps-test-mode.test.ts`: the route with the cached adapter answers the Example (3 Rewordable, TypeScript and REST API Real), and an expected failure (`it.fails`) documents that with the saved AI Keyword list (the default flow) 3 of 4 Fixtures get template Real gaps for words the recording does not hold (see Design Notes and the hand-off).
  - `[low]` `patch` Edge/Blind: the `.catch` in `gapsOutputSchema` let a malformed item with a valid keyword take the first-wins slot from a later valid duplicate (before, `itemSchema` rejected it). Fixed in `analyseGaps`: items with an empty keyword or kind are dropped before the structure step; test added.
  - `[low]` `patch` Edge: one unreadable `gaps.json` made `compareAll` throw and hid the other Fixtures' G2 failures. Fixed: the Fixture is named as unreadable, the run fails, the others are still compared; test added.
  - `[low]` `patch` Blind: the `"gaps"` task string was spelled out in `analyse.ts` and the recorder. Both use `GAPS_TASK`.
  - `[low]` `patch` Blind: reflowed comments ragged or over 80 columns. Rewrapped.
  - `[low]` `reject` Blind: recorded citations are weak. Example «responsive nettsider» quotes "Webutvikling 1: HTML, CSS og JavaScript. Bygde en nettside som" (cut mid-sentence, the supporting words «tilpasser seg mobilskjermer» are on the next line), and nursing «legemiddelhåndtering» quotes "Fulgte med på legemidlene som ble gitt, ..." (observing, not handling; the Answer key itself lists it Rewordable). FR-15 only asks that the quote is in the CV, and the prompt must not be tuned to the recordings. Not changed; listed as checks for the human G/L/R items (Story 4.6) and noted in the hand-off.
  - `[low]` `reject` Blind/Verification: the new fixture tests use the Answer key's Missing list. The AC says so («exactly one Gap per Missing keyword» with the Answer key as oracle). The other list is covered by the route test and the expected failure above.
  - `[low]` `reject` Blind: the G2 test is vacuous for the held-out Fixture (its `mustNeverSuggest` is empty) and thin for the others. That is the Answer key's content, which must not be edited; the Example (REST-API), nursing (2) and Fjord (2) are checked.
  - `[low]` `reject` Blind: `qa-compare` passes silently if a must-never keyword is spelled differently in the output. The structure step makes one Gap per Answer key Missing keyword and the Answer key schema requires every must-never keyword to be a Real-gap Missing keyword, so a Gap always exists; a differently spelled item is a skipped keyword, so a template Real gap, which is what the Student would see.
  - `[low]` `reject` Blind/Verification: `qa-compare` CLI (`--dir` parsing, entry point) is untested, reads `cv.txt` only, and does not warn on a `promptVersion` that differs. Thin wrapper around tested functions, run by hand on the recordings and on `_planted`; the version check is the Example CI test.
  - `[low]` `reject` Blind: recorder branches (empty Missing list, missing `answer-key.json`) untested and there is no `--all`. Both fail loudly before any request; one Fixture per run is the one-shot discipline of this story.
  - `[low]` `reject` Blind: two schemas describe the Gap item (`gapItemSchema` and `itemSchema`) and can drift. `itemSchema` stays as the structure step's input type (`AiGapItem`, unchanged public type); the comment now says why both exist.
  - `[low]` `reject` Blind: planted files carry a hand-bumped `promptVersion`. Planted data is labelling only and read only by tests; nothing depends on the version in it.
  - `[low]` `reject` Blind: new commands are only in script header comments. The README may not change in this story; `docs/qa/` rows are Story 4.6's manual checks.
  - `[low]` `reject` Edge: a second `--gaps` run overwrites `gaps.json`. Re-recording is legitimate (new `PROMPT_VERSION`, Epic 5's re-record); the one-request rule is kept by the operator, as for Letters and Keywords.
  - `[low]` `reject` Edge: `--dir --foo` takes the flag as a folder. The result is every Fixture skipped with a clear message and exit 1.
  - `[low]` `reject` Edge: `buildGapsIndex` does not check the shape of `data`. The Letter and Keyword indexes do not either; `runAi` checks the shape and a bad file becomes `AI_PROVIDER_ERROR`, tested by the shape test on the real files.
  - `[low]` `reject` Edge: the PDF text is extracted by each index separately. Once per process per index, on a lazy first request; no measurable cost.
  - `[low]` `reject` Verification gap (other): `qa-compare` and `analyseGaps` filter items differently. The two now agree after the empty-item patch above.
  - `[low]` `reject` Verification gap (other): the G2 assertion in the fixture test shares `evaluateGaps` with the report tool. The other G2 assertion reads the Gaps through `analyseGaps` and is independent.
  - `[false]` `reject` Blind: «the spec file is unfinished». It was in progress at review time and is completed below.
  - `[descriptive]` Intent alignment: readings A/B (data, unit and module surface) implemented, with G2 judged after the guards and the recordings as default input. Divergences accepted: (1) «analysed in Test mode» is exercised below the route by the fixture tests and at the route by the new route test for the Example only; (2) «Missing keyword» is the Answer key's list, not the app's computed list, which differs in the default flow (hand-off); (3) `qa-compare` has no fresh live outputs to run on except the recordings; (4) the schema change is not tracked by `PROMPT_VERSION` (the text of the prompt is unchanged by it, and the version was bumped for the text change before recording).

## Design Notes

**Missing list used for recording.** The Gaps key has no Missing list in it, so one recording serves whatever list phase 1 produces. The recorder asks about the Answer key's Missing keywords, in the Answer key's order (only the `keywords.missing` field is read, never the Gap verdicts or `mustNeverSuggest`). For three Fixtures this equals the code-only list (Example spells «REST-API» for the code term «REST API»); for the held-out Fixture the code-only list is the known FR-5b failure and differs from the Answer key. Where the app's Missing list uses other words (the saved AI Keyword list, or «REST API»), the structure step does not find the recorded item and gives the template Real gap. This is a hand-off to Stories 4.4 and 4.6.

**Prompt review before recording (gaps-1 to gaps-2).** `gaps-1` had never been recorded. Two real defects were fixed before the one-shot recording: the citation rule did not forbid quotation marks around the quote (the deferred item of Story 4.2: quote marks would fail FR-15), and the model was not told to answer «real» when it cannot copy a supporting entry exactly. `PROMPT_VERSION` is `gaps-2` and is locked now. Nothing was tuned to the recorded outputs.

**Request schema.** `gapsOutputSchema` was `z.array(z.unknown())`, which a provider sees as `items: {}` under `strict: true`; whether a provider accepts that could not be tested without a paid request. Items are now typed (`keyword`, `kind`, `explanation`, `citation`), each field and the item itself with `.catch`, so a malformed item still becomes an empty one that `gaps/server` turns into the template Real gap (Story 4.1's behaviour is unchanged).

**qa-compare and FR-15.** «Became Rewordable» is judged as the app does: raw answer, structure step, FR-15. A must-never-suggest keyword still Rewordable afterwards is a G2 failure (exit 1). One the model called Rewordable that FR-15 caught is printed as «caught» (the safety net held, the prompt did not) and does not fail the run.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: Biome, typegen and tsc, Vitest and Playwright all green
- `docker compose run --rm --build test` -- expected: green (`data/` changed)
- `npm run qa:compare` -- expected: the four recordings listed, no G2 failure

## Auto Run Result

Status: done

**Summary:** Story 4.3 makes Gap analysis work in Test mode and records the Cached Gaps. The cached adapter has a Gaps index (own index per task) keyed by `lookupKeyOf({ task: "gaps", cvText, jobAd })` and registered under `cv.txt` and `cv.pdf` text; any other input is `TEST_MODE_UNAVAILABLE`. `scripts/record-cached.ts --gaps` asks one live request per Fixture (`maxRetries: 0`) and writes the raw output with provider, model, prompt version and date. `scripts/qa-compare.ts` (`npm run qa:compare [-- --dir <folder>]`) reports every G2 failure per Fixture. `test/cached-gaps.test.ts` checks one Gap per Missing keyword, FR-15, G2, the Test-mode lookup and the Example's prompt-version CI check. The four Fixtures were recorded live, once each. `features.gaps` is still off by default.

**Prompt (locked at `gaps-2`):** reviewed before recording; two real defects fixed (no quotation marks around the citation; answer «real» when no supporting entry can be copied exactly) and `PROMPT_VERSION` bumped from the never-recorded `gaps-1`. The request schema now types the items (strict-mode providers may refuse `items: {}`, which could not be tested without a paid call). Nothing was changed after the recordings.

**Live recordings** (provider `openrouter`, model `anthropic/claude-sonnet-5.5`, `gaps-2`, 2026-11-20, one request each, no retries, all succeeded):

| Fixture | Gaps | Rewordable | Real | FR-15 downgrades | G2 failures |
|---|---|---|---|---|---|
| example-nordic-digital | 5 | 3 (pull requests, testing, responsive nettsider) | 2 | 0 | 0 (REST-API Real) |
| held-out-regnskap-kvale | 7 | 3 (bokføring, utdanning innen regnskap, norskkunnskaper) | 4 | 0 | 0 (no must-never keyword in its Answer key) |
| nursing-sarvurdering | 9 | 3 (legemiddelhåndtering, tverrfaglig samarbeid, norskkunnskaper) | 6 | 0 | 0 (demens, forskning Real) |
| two-column-fjord-analytics | 3 | 0 | 3 | 0 | 0 (prosjektledelse, Python Real) |

`npm run qa:compare`: «G2: no must-never-suggest keyword is Rewordable». The model was more conservative than the Answer key's Rewordable list (the Answer key lists 4, 7 and 1 Rewordable gaps for held-out, nursing and Fjord; the model gave 3, 3 and 0). No test requires them to match.

**OpenRouter usage** (`/key` endpoint, numbers only): before 0.7287765 USD (monthly 0.7287765, daily 0.318018), after 0.7585745 USD (monthly 0.7585745, daily 0.347816), difference 0.029798 USD for four requests, of a 20 USD monthly limit (19.2414255 USD left).

**Files:**
- `src/modules/ai/core/lookup-key.ts`, `src/modules/ai/index.ts` - `GAPS_TASK`.
- `src/modules/ai/server/adapters/cached.ts` (+ test) - Gaps index.
- `src/shared/server/data-files.ts` (+ test) - `cachedGaps`.
- `src/modules/gaps/server/prompts/gaps.ts` (+ test), `src/modules/gaps/server/analyse.ts` (+ test) - prompt `gaps-2`, `gapsOutputSchema`, empty-item filter.
- `scripts/record-cached.ts` (+ test) - `--gaps`.
- `scripts/qa-compare.ts` (+ test), `package.json` - `qa:compare`.
- `test/cached-gaps.test.ts`, `test/gaps-test-mode.test.ts` - Fixture tests, the route in Test mode, the expected failure below.
- `data/fixtures/*/cached/gaps.json` (4), `data/fixtures/_planted/gaps-g2-rest-api-{rewordable,invented-citation}.json`, the four existing `_planted/gaps-citation-*.json` (label `gaps-2`).
- `src/app/api/analyses/[id]/gaps/route.test.ts` - label only.
- This spec, `sprint-status.yaml`.

**Review:** 6 patched (recorder writes the adapter output unparsed; route test in Test mode; malformed item no longer displaces a later usable one; qa-compare survives one unreadable file; `GAPS_TASK`; comment wrapping), 0 deferred, 19 rejected with reasons above. Follow-up review recommended: false.

**Verification:** `npm run typecheck` green. `npm test` green: Biome, typegen and tsc, Vitest 107 files, 1251 passed and 3 expected fail (two earlier ones plus the new one below), Playwright 201 passed. `docker compose run --rm --build test` green (107 files, 1250 passed, 3 expected fail, 1 skipped in `test/design-tokens.test.ts` as before in the container, Playwright 201 passed). `npm run qa:compare` on the four recordings: no G2 failure.

**Deviations and hand-offs:**
- No deviation from the AC. The Missing list used for recording is the Answer key's (see Design Notes).
- **Needs a decision (Stories 4.4 and 4.6):** in the app's default flow (`keywordFallback` on, so phase 1 uses the saved AI Keyword list, also in Test mode), the Missing keywords for three of the four Fixtures are other words than the Answer key's (Example: «stakeholders», «testing av frontend-kode», «tilgjengelighet», «REST API-er» are not in the recording; held-out 7 of 12; nursing 4 of 10; Fjord all found). The structure step gives each of those the template Real gap, so Test mode would show the Real-gap template for them instead of the recorded explanation. The recordings cannot be changed in this story (one-shot, `gaps-2` locked). Options: a new `PROMPT_VERSION` and four new paid recordings asked about the saved lists, or a looser keyword match in the structure step (Story 4.1's code), or a Gaps path that reads the code-only Missing list. `test/gaps-test-mode.test.ts` holds an expected failure (`it.fails`) that turns into a failing test the day the two agree. Under the code-only list the Example route test passes: 3 Rewordable, TypeScript and «REST API» Real («REST API» differs from «REST-API» and is the template, also Real).
- Human checks (not done, Story 4.6): the manual rows G (and L, R for the Gap output) of the §9.2 checklist, now on real recorded text. Things to look at: the Example's «responsive nettsider» citation stops mid-sentence ("... Bygde en nettside som", the supporting words are on the next line), and nursing «legemiddelhåndtering» cites a line about watching medicines being given (the Answer key lists it Rewordable).
- Open from 4.2: no FR-15 downgrade occurred on the live run (0 of 9 Rewordable), so the deferred concern about quote marks, soft hyphens or ellipsis did not show up here.
- `qa-compare` has no fresh live outputs to run on except the recordings; run it with `--dir` on a folder of new outputs when Story 4.6's live Fixture run is done.
