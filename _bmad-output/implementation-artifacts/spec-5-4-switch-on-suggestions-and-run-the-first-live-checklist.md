---
title: 'Story 5.4: Switch on suggestions and run the first live checklist'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: '37204b13f6be8f3e435617dd72db78e30fce7b3e'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Rewording suggestions (5.1-5.3) are built but off by default, so a Student never sees them; `qa-compare` has no G4 count; and the first full §9.2 checklist run, which feeds the 3 December decision, has no place to be recorded.

**Approach:** Set `FEATURE_DEFAULTS.rewording = true`, force it off on Hosted (no AI, D23), run UJ-1 with the Example pair in Playwright with suggestions on by default, extend `scripts/qa-compare.ts` with the G4 count, and add `docs/qa/rewording-manual-checks.md` with every §9.2 row open.

## Boundaries & Constraints

**Always:** Hosted keeps `rewording` off whatever `FEATURE_REWORDING` says. Existing specs and tests that assumed rewording off are adjusted to the new default, never skipped or deleted. `qa:compare` still judges G2 on the Answer key's must-never-suggest keywords; G4 is a count, not a verdict. Manual-check rows stay `ikke kjørt` / `ikke vurdert`, with no date, tester or result.

**Never:** Set `FEATURE_REWORDING` in `compose.yaml`, `.env.example` or README. Touch `PROMPT_VERSION`, the gaps prompt or `data/fixtures/*/cached/gaps.json`; re-record; loosen `canonVerbatim`/`checkCitation`/FR-17; make live AI calls or run a live Fixture; change Hosted settings; touch PRD §11.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default local | no `FEATURE_REWORDING` | `features.rewording` is true | n/a |
| Override off | `FEATURE_REWORDING=false` | `features.rewording` is false | n/a |
| Hosted | `APP_ENV=hosted`, `FEATURE_REWORDING=true`, false or unset | `features.rewording` is false | n/a |
| G4 hit | expected Rewordable gap, Rewordable after FR-15, suggestion passed FR-17 | counted in `g4Found` | n/a |
| G4 miss | suggestion discarded by FR-17, no suggestion, FR-15 downgrade, or the Gap is Real | not counted; listed as «G4 not shown» | n/a |
| G2 with G4 | must-never-suggest keyword is Rewordable | «G2 FAIL» and the G4 count in one report; the run fails on G2 only | exit code 1 on G2 failure or unreadable output |

</intent-contract>

## Code Map

- `src/shared/server/config.ts` -- `FEATURE_DEFAULTS.rewording`, `parseConfig` features block (Hosted forced off like `gaps`)
- `src/shared/server/config.test.ts`, `run-mode.test.ts` -- default, override and Hosted tests; run-mode mapping test sets the flag off explicitly
- `scripts/qa-compare.ts`, `scripts/qa-compare.test.ts` -- `evaluateGaps` now reads suggestions (structure, FR-15, FR-17 via `checkGapSuggestions`) and returns `g4Expected`, `g4Found`, `discarded`; report lines and the G4 summary; planted data in `data/fixtures/_planted/gaps-fr17-*.json`
- `playwright.config.ts` -- port 3106 server now has `FEATURE_REWORDING=false`
- `e2e/suggestions.spec.ts` -- suggestion specs run on the default server; one flag-off describe on 3106
- `e2e/gaps.spec.ts`, `e2e/letter-actions.spec.ts`, `e2e/letter-check.spec.ts` -- adjusted to the default (progress line, Real-gap button count, Letter «Kopier» locator)
- `docs/qa/rewording-manual-checks.md` -- L1-L8, G1-G5, R1-R3 and the 3 December row

## Tasks & Acceptance

**Execution:**
- `src/shared/server/config.ts` -- default true, Hosted forced off
- `src/shared/server/config.test.ts`, `run-mode.test.ts` -- matrix tests
- `scripts/qa-compare.ts`, `scripts/qa-compare.test.ts` -- G4 and tests on planted and Cached data
- `playwright.config.ts`, `e2e/**` -- default server runs with suggestions; flag-off server
- `docs/qa/rewording-manual-checks.md` -- open rows
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- 5-4 done, `epic-5` stays in-progress

**Acceptance Criteria:**
- Given `FEATURE_DEFAULTS`, then `rewording` is true and no `compose.yaml`, `.env.example` or README sets `FEATURE_REWORDING`.
- Given the Example pair in Test mode, when UJ-1 runs in Playwright, then the Gapanalyse shows the suggestions with «Kopier», copying gives only the suggestion text, and axe passes.
- Given `APP_ENV=hosted`, then `features.rewording` is false.
- Given live outputs in a folder, then `qa:compare -- --dir` reports G2 failures and the G4 count together.
- Given one live run of every Fixture, then L1-L8, G1-G5 and R1-R3 are recorded by Helene (open at merge), and the 3 December decision row is `ikke vurdert`.

## Spec Change Log

## Review Triage Log

### 2026-11-21 - Review pass
- note: the first launch of the layers read a diff holding only the checklist doc (a staging slip); their doc findings were triaged here too, then all four layers were run again on the full diff.
- verdicts: 36 findings across the layers - high 0, medium 3, low 14, false 6, maybe-false 0, rest merged duplicates
- findings:
  - `[medium]` `patch` Real-gap e2e check compared the section's button count with its own «Kopier forslaget» count, so 0 equals 0 passes if rewording silently turned off - now asserts the count is not 0 (e2e/gaps.spec.ts)
  - `[medium]` `patch` flag-off coverage narrower after the old «rewording off (the default)» test moved to the 3106 server - the off test now asserts no button at all in the section, the old progress line, and that the Gaps response carries `suggestion: null` for every gap
  - `[medium]` `patch` doc step 2 did not say how to get the raw live Gaps answer, how to keep three runs apart, or that `qa:compare` ignores the Letter - rewritten (recorder, run folders, hand-read L2/L3/L7), plus a precheck that rewording and live mode are on
  - `[low]` `patch` UJ-1 Example test in `gaps.spec.ts` did not assert the suggestion boxes and «Kopier» - added
  - `[low]` `patch` G4 summary gave no percentage against the 70 % of SM-5 - percentage added, still «a count, not a verdict»
  - `[low]` `patch` test pinned the Cached Example pair to «3 of 3», which breaks on a re-recording - now `\d of 3`; exact counts are pinned on planted outputs
  - `[low]` `reject` vocabulary parse outside the per-Fixture try in `compareAll` - a missing vocabulary file is a broken checkout, failing loud is intended (same as the other required files)
  - `[low]` `reject` `evaluateGaps` takes an optional vocabulary - same optional shape as `analyseGaps`; `compareAll` always passes it
  - `[low]` `reject` rewording defaults true with `FEATURE_GAPS=false` - rewording is read only inside the Gaps path and the Gaps progress line (`result-view.tsx`), so with Gaps off nothing shows; the 3104 Letter-only server runs this combination green
  - `[false]` `reject` expected Rewordable keyword absent from the Missing list - `answerKeySchema` requires Rewordable and Real gaps to equal the Missing list
  - `[false]` `reject` `suggestions.spec.ts` holds a stale `PROGRESS` - it holds the rewording line
  - `[false]` `reject` other e2e specs and stubbed servers not adjusted - the full Playwright run passes; the stubbed Gaps answers are Real gaps with a null suggestion
  - `[low]` `reject` story marked done with the live checklist open - the task and the 4.6 pattern put `done` in this PR with the human rows open; `epic-5` stays in-progress
  - `[low]` `reject` 3 December gate names only G2 and R1 - the PRD text (§5.2) does; L2 and G1 are prompt-fix triggers, not decision criteria
  - `[low]` `reject` baseline section reports figures and a date - labelled as not a result and not live; it gives Helene the G4 baseline of the Cached Gaps
  - `[low]` `reject` doc style (mixed English and Norwegian, table padding, `<mappe>` placeholder, un-glossed S4/S5, no per-Fixture G4 cells) - cosmetic or the task's own wording
  - `[low]` `reject` mechanically checkable rows (L3, L5, L8) are manual - PRD §9.2 lists them as manual
  - `[low]` `reject` `/^Kopier(?! forslaget)/` duplicated in two specs - two one-line locators
  - `[low]` `reject` intent audit: the «UJ-1» labelled test sat on the Gaps surface - covered by the UJ-1 patch above

## Auto Run Result

Status: done. `FEATURE_DEFAULTS.rewording = true`; `rewording` forced off on Hosted (tests); `qa-compare` counts G4 next to G2 (structure, FR-15, FR-17 as the app does) with tests on planted and Cached data; Playwright runs the suggestion specs on the default server, the port-3106 server is now the flag-off one; `docs/qa/rewording-manual-checks.md` holds L1-L8, G1-G5, R1-R3 (`ikke kjørt`) and the 3 December row (`ikke vurdert`). No live call, no recording, no prompt or cached-response change.

Files changed: `src/shared/server/config.ts`, `config.test.ts`, `run-mode.test.ts`; `scripts/qa-compare.ts`, `qa-compare.test.ts`; `playwright.config.ts`; `e2e/suggestions.spec.ts`, `gaps.spec.ts`, `letter-actions.spec.ts`, `letter-check.spec.ts`; `docs/qa/rewording-manual-checks.md`; `sprint-status.yaml`.

Review: patches 6 (3 medium, 3 low), deferred 0, rejected 12 with reasons in the log. Follow-up review recommended: false.

Verification: `npm test` (biome, typecheck, vitest, Playwright) and `npm run typecheck` pass; `npm run qa:compare` on the Cached Gaps: G2 no failure, G4 9 of 15.

Residual risks: the cached G4 is 60 %, below the 70 % of SM-5; only the live run shows whether that holds.

## Design Notes

FR-17 in `qa-compare` holds each suggestion against the Answer key's Missing list plus any other keyword the output answers (the recorder adds the words phase 1 finds in Test mode), so G4 is never higher than what the app would show.

## Verification

**Commands:**
- `npm test` -- expected: biome, typecheck, vitest and Playwright pass
- `npm run typecheck` -- expected: no errors
- `npm run qa:compare` -- expected: no G2 failure on the Cached Gaps, a G4 line per Fixture and a G4 total
