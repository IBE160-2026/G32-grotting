---
title: 'Ask for a rewording suggestion with each Rewordable gap'
type: 'feature'
created: '2026-11-21'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_commit: 'ef61d8a9f630ea280cd64e576d1d49e1fb92a18a'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: []
deferred:
  - summary: >-
      A suggestion's length, single-line form and absence of quotation marks are asked for by the prompt but checked by no code.
    evidence: |-
      gapOf only trims the string; FR-17 (Story 5.2) is about invention and upgrade. A long or multi-line suggestion would reach the Gap payload as is.
    location: >-
      src/modules/gaps/server/analyse.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** A Rewordable gap tells the Student the CV already covers a keyword, but gives no wording (FR-16). The Cached Gaps were also recorded for the Answer key's Missing list only, so in Test mode, where phase 1 uses the saved AI Keyword list, some Missing keywords the app shows get the template Real gap (the `it.fails` in `test/gaps-test-mode.test.ts`).

**Approach:** Extend the one gaps prompt (`gaps-3`): each Rewordable gap also gets one suggested phrasing of the cited CV entry, a Real gap none. `gaps/server` returns the `suggestion` string for Rewordable gaps only when `features.rewording` is on, else `null` (Epic 4 behaviour). The recorder asks about the Answer key's Missing list plus the Missing keywords phase 1 finds in Test mode (saved AI list), once per Fixture, and all four `gaps.json` are re-recorded once. No suggestion reaches the screen before Story 5.3.

## Boundaries & Constraints

**Always:** `Gap` shape unchanged (AD-7). A suggestion uses only facts from the cited CV entry, may use the employer's words, never upgrades the kind of work or role. One live request per Fixture, `maxRetries: 0`, no repeat, key from `.env` never printed. Prompt reviewed (read as a critic and fixed) BEFORE recording; recording is the last implementation step. `qa:compare` judges G2 on the Answer key's must-never-suggest list. Test-mode tests set `features.rewording` explicitly.

**Never:** No change of `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` or README (rewording stays off by default). No FR-17 check (5.2), no UI (5.3). `letter-*.json` and `keywords.json` are not touched. Prompt and Answer key are not adjusted to get green after recording; `canonVerbatim`/`checkCitation` are not loosened. No Hosted/Vercel change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rewording on, Rewordable | item `rewordable` with citation and suggestion | `suggestion` is the trimmed string | none |
| Rewording on, Real | item `real`, even with a suggestion | `suggestion` is `null` | none |
| Rewording on, no suggestion | Rewordable item with null, blank or missing suggestion | `suggestion` is `null` | none |
| Rewording off | any item | every `suggestion` is `null`; the prompt does not ask for one | none |
| FR-15 downgrade | citation not in CV | template Real gap, `suggestion` `null` | none |
| Old cached file | item with no `suggestion` field | parses, `suggestion` `null` | `.catch(null)` |
| Recorder list | Answer key Missing + Test-mode phase-1 Missing | Answer key words first, no duplicates (case/space-insensitive), one request | failed request writes nothing |
| Test mode | every Missing keyword in phase 1 for the Example pair and each Fixture | a Gap from the recording, no template | none |

</intent-contract>

## Code Map

- `src/modules/gaps/server/prompts/gaps.ts` -- `gapItemSchema` (add `suggestion`), prompt text, `PROMPT_VERSION` (`gaps-2` to `gaps-3`), builder option `rewording`.
- `src/modules/gaps/server/analyse.ts` -- `gapOf`, `structureGaps`, `analyseGaps` (new `rewording` input); `itemSchema`.
- `src/app/api/analyses/[id]/gaps/route.ts` -- passes `getConfig().features.rewording`.
- `scripts/record-cached.ts` (+ test) -- Missing list = Answer key + Test-mode phase 1 (reads `cached/keywords.json`, `proposeKeywords`, `analyse`), prompt with `rewording: true`.
- `test/gaps-test-mode.test.ts` -- remove `it.fails`; every Fixture and the Example pair have a Gap for each Missing keyword.
- `test/cached-gaps.test.ts` -- structure tests stay; add: recorded Rewordable items carry a suggestion, Real none.
- `scripts/qa-compare.ts` -- unchanged judgement (G2 on the Answer key list).
- `data/fixtures/*/cached/gaps.json` -- re-recorded once by the recorder.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- 5-1 `done`, `epic-5` `in-progress`.

## Tasks & Acceptance

**Execution:**
- [x] `prompts/gaps.ts`, `analyse.ts`, route (+ tests) -- suggestion in schema, prompt and structure step, flag handling, with planted/mock answers.
- [x] `scripts/record-cached.ts` (+ tests) -- the extended Missing list.
- [x] Review the prompt as a critic, fix, then record the four Fixtures live (one request each).
- [x] `test/gaps-test-mode.test.ts`, `test/cached-gaps.test.ts` -- tests that depend on the new files.
- [x] `sprint-status.yaml`.

**Acceptance Criteria:**
- Given the extended prompt, then it asks for one suggestion per Rewordable gap (only facts from the entry, employer's words allowed, no upgrade of work or role) and none for a Real gap.
- Given `features.rewording` on, then Rewordable `suggestion` is a string and Real `null`; off, every `suggestion` is `null`.
- Given the new `PROMPT_VERSION`, then all four `gaps.json` are re-recorded, CI's prompt-version check and the 4.3 structure tests pass.
- Given the recorder, then its list is Answer key Missing plus Test-mode phase-1 Missing, deduplicated, in one request per Fixture; in Test mode every Missing keyword shown has a Gap from the recording and the `it.fails` is gone; `qa:compare` still judges G2 on the Answer key's must-never-suggest list.

## Spec Change Log

## Review Triage Log

### 2026-11-21 - Review pass

The four layers ran as subagents (blind hunter, edge-case hunter, verification gap, intent alignment), all launched before any result was read. The implementation was done inline in the main session (precedent: Stories 3.12 and 4.3: the live recording needs the key and a one-shot discipline in one session), so there was no implementation subagent to re-engage and the patches were applied directly. The recording was the last implementation step; no reviewer could ask for a re-recording.

- verdicts: 3 patched, 1 deferred, the rest rejected; high 0, medium 0, low 21, false 0, descriptive 1 (intent alignment readings, no defect)
- findings:
  - `[low]` `patch` Blind/Verification gap: the route test "rewording off" only checked the prompt, not the returned suggestions - it now also checks that every `suggestion` of the response is `null`.
  - `[low]` `patch` Blind/Edge: `test/cached-gaps.test.ts` was weaker (prefix and no duplicates only) - it now asserts the whole raw list equals `gapsMissingList(Answer key, testModeMissingTerms)`.
  - `[low]` `patch` Blind: `gaps.json` depends on `cached/keywords.json` and the order was not documented - noted in the recorder header comment.
  - `[low]` `defer` Blind/Edge: a suggestion's length (25 words), single line and no quotes are asked for by the prompt but checked nowhere. FR-17 (Story 5.2) covers invention and upgrade only. Hand-off to 5.2/5.3.
  - `[low]` `reject` Blind/Edge: `testModeMissingTerms` re-implements the Keyword-list choice of `resolveKeywords`. It cannot import it (server-only, database). The route test on all four Fixtures in `test/gaps-test-mode.test.ts` runs the real path and fails if the two disagree.
  - `[low]` `reject` Blind/Edge: a broken `keywords.json` makes the recorder throw, and no usable list gives `[]`. The throw happens before the one request and costs nothing; `[]` is not reachable for the four Fixtures, and the route test would show template Gaps.
  - `[low]` `reject` Blind: `gaps-3` with rewording off has the same text as `gaps-2`. Intended: one version, one recording; a test pins that the off prompt has no suggestion text.
  - `[low]` `reject` Blind: prompt wording (the "do not suggest wording" rule next to the suggestion field, mixed language, literal-phrase tests). The prompt was reviewed before recording and is locked after it; the field spec says "For real, always null".
  - `[low]` `reject` Blind/Edge: nothing checks that recorded suggestions name another Missing keyword. That is the FR-17 step of Story 5.2.
  - `[low]` `reject` Blind/Edge: `MIN_KEYWORDS` moved without a re-export. No other importer exists (grep), and a re-export would keep two homes.
  - `[low]` `reject` Blind: the spec file was unfinished while reviewed. It is completed here.
  - `[low]` `reject` Edge: no cap on the number of listed words (14 at most, for the held-out Fixture); the four requests succeeded.
  - `[low]` `reject` Edge: with two items for one keyword the first wins even if its suggestion is blank. Same rule as for every other field (Story 4.1); a blank suggestion is `null`, which 5.3 shows as the no-suggestion line.
  - `[low]` `reject` Edge: near-duplicate words (REST-API and REST API-er) are both listed. They are different keywords for the app and each needs its own Gap.
  - `[low]` `reject` Edge: `testModeMissingTerms` ignores `keywordFallback`/Hosted config. Test mode has no Hosted, and the Fixtures' default flow is the saved list.
  - `[low]` `reject` Edge: the deleted sorted-equality assertion in `cached-gaps.test.ts` (same as the second patch above).
  - `[low]` `reject` Intent alignment: the Test-mode route test uses `cv.txt`, not the `cv.pdf` text (Example and Fjord also index the PDF text). Epic 4's tests had the same scope; the Gaps key is the CV text.
  - `[low]` `reject` Intent alignment: `gaps-test-mode.test.ts` runs with rewording on; the off state is tested at `analyseGaps` and route level.
  - `[low]` `reject` Intent alignment: no test asserts that the UI omits suggestions. `gap-entry.tsx` does not read the field and no UI is added before 5.3.
  - `[low]` `reject` Intent alignment: the recordings were judged for shape, not content. G1-G5 are the human checks and FR-17 is Story 5.2.
  - `[low]` `reject` Intent alignment: the recorder tests compare the recorder with its own helpers. The independent check is the route test.
  - `[descriptive]` Intent alignment: readings A (prompt and structure), B (app flow) and C (route output) are implemented and tested at the route layer, not in the browser.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: green
- `docker compose run --rm --build test` -- expected: green (`data/` changed)
- `npm run qa:compare` -- expected: no G2 failure

## Auto Run Result

Status: done

**Summary:** The gaps prompt (`gaps-3`) asks, with `features.rewording` on, for one suggestion per Rewordable gap (only facts from the cited entry, the employer's words allowed, no upgrade of work or role) and none for a Real gap. `analyseGaps` gets a `rewording` input (the route passes `getConfig().features.rewording`): a Rewordable gap gets its trimmed suggestion string; a Real gap, a blank or missing suggestion and everything with rewording off get `null`. The `Gap` shape is unchanged. `scripts/record-cached.ts --gaps` asks about the Answer key's Missing list plus the Missing keywords phase 1 finds in Test mode (saved AI list from `cached/keywords.json`), Answer key first, no duplicates, in one request per Fixture. The prompt was read as a critic and corrected before the recording. All four `gaps.json` were re-recorded once. The `it.fails` is gone and a route test over all four Fixtures shows no template Real gap in Test mode. `FEATURE_REWORDING` is still off by default; no suggestion reaches the screen.

**Live recordings** (provider `openrouter`, model `anthropic/claude-sonnet-5.5`, `gaps-3`, 2026-11-21, one request each, `maxRetries: 0`, no repeat, all succeeded): example-nordic-digital 9 words, held-out-regnskap-kvale 14, nursing-sarvurdering 13, two-column-fjord-analytics 3. `npm run qa:compare`: no G2 failure, 0 FR-15 downgrades.

**Files:** `src/modules/gaps/server/prompts/gaps.ts`, `analyse.ts`, `contracts.ts` (comment), `src/app/api/analyses/[id]/gaps/route.ts` (+ tests); `scripts/record-cached.ts` (+ test); `src/modules/keywords/server/prompts/keywords.ts` and `keyword-source.ts` (`MIN_KEYWORDS` moved so the recorder can import it); `test/gaps-test-mode.test.ts`, `test/cached-gaps.test.ts`; `data/fixtures/*/cached/gaps.json`; `sprint-status.yaml`; `epic-5-context.md`.

**Review:** 3 patches (all low), 1 deferred, the rest rejected with reasons (see the triage log). Follow-up review recommended: false.

**Verification:** `npm test` green (Biome, typegen, tsc, Vitest, Playwright 228). `docker compose run --rm --build test` green on the third run (the first ran under load from the parallel review layers and had 6 Playwright failures; the second had one unhandled "route.fetch: Test ended" error in the Story 4.5 specs of `e2e/gaps.spec.ts` and one test did not run; this story touches no UI).

**Residual risks:** a recorded suggestion can still add or upgrade (FR-17 is Story 5.2); the recorder's copy of phase 1 can drift from `resolveKeywords` (the route test would fail); a flaky Playwright teardown error in the Story 4.5 specs.
