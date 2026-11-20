---
title: 'Story 4.6: Switch on Gap analysis'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: '81f91e22d41e532c07e84e3fbc3bce1b4e24d4e4'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: []
deferred:
  - summary: >-
      No browser test covers the Gaps request's consent wiring on a live-mode server with the flag on.
    evidence: |-
      The call (`application-form.tsx` runGaps) uses the same `consentFor` as the Letter; the live and fallback Playwright servers set `FEATURE_GAPS=false`, and Test-mode e2e skips the consent check. Surfaced by the default flip.
    location: >-
      src/modules/application/ui/application-form.tsx:265
    severity: low
---

<intent-contract>

## Intent

**Problem:** Gap analysis (4.1-4.5) is built but off by default, so a Student never sees the Gapanalyse unless `FEATURE_GAPS` is set.

**Approach:** Set `FEATURE_DEFAULTS.gaps = true`, force it off on Hosted (no AI, D23), cover UJ-1 with the Example pair in Playwright on the default server, and record the human G1/G2/G3/G5 checks as open rows in `docs/qa/`.

## Boundaries & Constraints

**Always:** Hosted keeps `gaps` off whatever `FEATURE_GAPS` says. Playwright counts come from the Missing list on screen. Existing specs that assumed Gaps off are adjusted, never skipped or deleted. The manual-check rows stay `ikke kjørt` with no date or result.

**Never:** Set `FEATURE_GAPS` in `compose.yaml`, `.env.example` or README. Touch `PROMPT_VERSION`, the gaps prompt or `data/fixtures/*/cached/gaps.json`; re-record; loosen `canonVerbatim`/`checkCitation`; make live AI calls; change Hosted settings.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default local | no `FEATURE_GAPS` | `features.gaps` is true | n/a |
| Override off | `FEATURE_GAPS=false` | `features.gaps` is false | n/a |
| Hosted | `APP_ENV=hosted`, `FEATURE_GAPS=true` or unset | `features.gaps` is false | n/a |

</intent-contract>

## Code Map

- `src/shared/server/config.ts` -- `FEATURE_DEFAULTS`, `parseConfig` features block
- `src/shared/server/config.test.ts` -- default, override and Hosted tests
- `playwright.config.ts` -- servers; the port-3104 server becomes the Letter-only one (`FEATURE_GAPS=false`); the made-up-key servers (3102, 3103) set `FEATURE_GAPS=false`
- `e2e/gaps.spec.ts`, `e2e/letter.spec.ts`, `e2e/letter-check.spec.ts`, `e2e/application-result.spec.ts`, `e2e/support/application.ts` -- specs adjusted to the default
- `docs/qa/gaps-manual-checks.md` -- G1, G2, G3, G5 rows, `ikke kjørt`
- `test/gaps-test-mode.test.ts` -- expected failure for the saved-list mismatch stays

## Tasks & Acceptance

**Execution:**
- `src/shared/server/config.ts` -- default true, Hosted forced off
- `src/shared/server/config.test.ts` -- matrix tests
- `playwright.config.ts`, `e2e/**` -- default server runs Gaps; Letter-only specs and made-up-key servers use `FEATURE_GAPS=false`; UJ-1 Example test added
- `docs/qa/gaps-manual-checks.md` -- open rows and the two 4.3 findings

**Acceptance Criteria:**
- Given `FEATURE_DEFAULTS`, then `gaps` is true and no `compose.yaml`, `.env.example` or README sets `FEATURE_GAPS`.
- Given the Example pair in Test mode, when UJ-1 runs in Playwright, then the Gapanalyse shows Rewordable and Real gaps, «Se gapanalysen» moves focus and axe passes.
- Given `APP_ENV=hosted`, then `features.gaps` is false.
- Given one live Fixture run, then G1, G2, G3 and G5 are recorded by Helene (open at merge).

## Verification

**Commands:**
- `npm test` -- expected: biome, typecheck, vitest and Playwright pass
- `npm run typecheck` -- expected: no errors

## Spec Change Log

(empty)

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 4 layers reported, grouped by claim — high 0, medium 1, low 6, false 0, maybe-false 0
- findings:
  - `[medium]` `patch` letter-check spec mock answered `gapsRev: 0` with Gaps on, so the client dropped it as stale and the test did not verify a settled check — mock now echoes `body.gapsRev`; spec passes
  - `[low]` `patch` QA doc named `gaps-test-mode.test.ts` as proof of the default; the default is asserted in `config.test.ts` — added to the list
  - `[low]` `defer` consent wiring of the Gaps request not browser-tested in live mode — same `consentFor` as the Letter; see `deferred`
  - `[low]` `reject` nothing enforces "no `FEATURE_GAPS` in compose/.env.example/README" — static text; `.env.example` holds only a commented name in its override list, nothing sets it
  - `[low]` `reject` invalid `FEATURE_GAPS` value on Hosted still throws — same as `FEATURE_KEYWORD_FALLBACK`, existing behaviour, fail-loud is intended
  - `[low]` `reject` UJ-1 test could assert more (citation text, Real-gap link, loading-state axe) — those are asserted in the sibling tests of the same file
  - `[low]` `reject` hard-coded port 3104 and repeated `test.use`; remaining default-server specs not intercepting the Gaps route (Tone, ANALYSIS_STALE, keyword-fallback) — they ran and pass with Gaps on; a shared constant already exists in `support/application.ts`
  - `[low]` `reject` doc style points (G4 omitted, language mix, no owner/threshold, hard-coded counts, kill switch note) — G4 is outside the story's G1/G2/G3/G5; counts are dated findings; cosmetic
  - `[low]` `reject` intent audit: Letter specs now run flag-off, 3104 inverted not removed — deliberate; the flag-off path is a supported config and the default phase 2 is covered by `gaps.spec.ts`, `letter-check.spec.ts` and `application-result.spec.ts`

## Auto Run Result

Status: done. `FEATURE_DEFAULTS.gaps = true`; `gaps` forced off on Hosted (test added); Playwright: the default server now runs the Gaps, the 3104 server became the Letter-only one (`FEATURE_GAPS=false`) used by the Letter-only specs, 3102 and 3103 set `FEATURE_GAPS=false`; new UJ-1 Example test; `docs/qa/gaps-manual-checks.md` with G1, G2, G3, G5 `ikke kjørt`. Prompt, `PROMPT_VERSION` and cached gaps untouched. Verification: `npm test` and `npm run typecheck` pass. Patches 2, deferred 1. Follow-up review recommended: false.
