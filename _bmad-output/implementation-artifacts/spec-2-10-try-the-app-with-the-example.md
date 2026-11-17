---
title: 'Story 2.10: Try the app with the example'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
baseline_commit: '1a6c64c5c1534b711db59fc2204cbfcae662c67f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Examiner has to write or find a CV and a job ad before seeing the flow. FR-27 asks for one click that fills in the Example pair, and nothing proves that the PDF, the TXT and that click reach the same result (FR-27, FR-3, FR-8, AD-2, AD-15, UX-DR36).

**Approach:** A secondary button «Bruk eksempelet» on the Søknad form fills job title, employer, Job ad and CV text from the Example pair Fixture, which the server component page reads and passes as props. A Vitest test proves the three CV routes agree. The two manual checks (FR-3, FR-8) get a record file in `docs/qa/` for Helene to run and fill in.

## Boundaries & Constraints

**Always:**
- Branch `story/2.10-try-the-app-with-the-example` off `main`. Commits cite `2.10`. Stage by explicit path. PR, review, then merge.
- `app/soknad/page.tsx` becomes async, reads the pair through `loadExamplePair` in `shared/server/data-files.ts` (the only runtime reader of `data/`, AD-15) and passes it as a plain prop to `ApplicationForm`. No new route, no browser request for the Example. `next.config.ts` traces `data/fixtures/example-nordic-digital/**` for `/soknad`. If the read fails, log it (as Hjem does) and render the form without the button; the page still works.
- Button `variant="secondary"`, `type="button"`, between Arbeidsgiver and Stillingsannonse (EXPERIENCE.md focus order). Always shown, with or without login and in every mode; no feature flag.
- On press: set job title, employer, Job ad and CV draft from the pair (through `normaliseNewlines`), set the CV as confirmed (`{ draft, confirmed: true }`, it is not extraction output), clear field errors, `adUnclear` and `failed`, write them to the session (`applicationId: null`, `cvDraft` and `cvText`), move focus to the submit button, `announce("action", "Eksempelet er fylt inn.")`. Remount `CvInput` (a `key` that counts presses) so it collapses to the confirmed line and drops picker state and any late file answer.
- The «Bruk eksempelet» text goes through the same canon path as pasted text. A server test (`application/server/example-parity.test.ts`) feeds the Example ad with the CV text from `cv.pdf` (via `extractCvText`), from `cv.txt` (via `extractCvText`) and from `loadExamplePair()` (after `normaliseNewlines`), and asserts equal `canon` text, equal `result.score` and matched/missing lists, and equal fingerprints through `analyseInputs`.
- Text in `messages.nb.ts` (`application.useExample`, `application.exampleFilled`). WCAG 2.2 AA, axe clean at 360 px; button is at least the touch target size.
- `docs/qa/example-pair-manual-checks.md`: two tables, each row with date, tester, steps, expected result, result (left blank for Helene): FR-3 (upload `two-column-fjord-analytics/cv.pdf`, fix the scrambled lines, confirm, check the analysis uses the corrected text) and FR-8 (Example pair result: every Evidence line and ad line is correct). Pre-fill the FR-8 table with the Keywords and the lines the engine shows, from a real run, for her to tick. Never write a result she has not observed.

**Never:**
- No change to `keywords/core`, scoring, the route, contracts, fingerprint or the Example Fixture. No AI, no Cached response, no Tone, no account or Profile code (Epic 4). No second place that reads `data/`. No automatic submit after the fill.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fill empty form | Press the button | Four fields filled, CV shows «CV-tekst bekreftet · N tegn», focus on submit, region says «Eksempelet er fylt inn.» | N/A |
| Fill over own text | Typed values, CV reopened, errors showing | All replaced, errors gone, CV collapsed and confirmed | N/A |
| Submit after fill | Press «Analyser og skriv utkast» | Result equals the Answer key (score, matched, missing) | N/A |
| Edit CV after fill | Change one character in the CV text | Confirmation drops (FR-3) | N/A |
| Reload after fill | Reload the page | Session restores the values and the confirmed CV | N/A |
| Fixture unreadable | `loadExamplePair` throws | Form renders without the button; error logged | `log` kind error, code `UNEXPECTED` |
| Three CV routes | `cv.pdf`, `cv.txt`, example text, same ad | Same canon text, score, lists, fingerprint | Test fails on any difference |

</frozen-after-approval>

## Code Map

- `src/app/soknad/page.tsx` -- server component; becomes async, calls `loadExamplePair`, passes `example` prop. Pattern for the guarded read and `log` call: `src/app/page.tsx`.
- `src/modules/application/ui/application-form.tsx` -- add `example?: AnalysisInputs` prop, `useExample()`, submit-button ref, `exampleRuns` key for `CvInput`. Reuses `announce`, `writeSession`, `normaliseNewlines`, `setCv`, `setValues`, `setErrors`.
- `src/modules/cv/ui/cv-input.tsx` -- not changed; remounted by `key`. Its `collapsed = confirmed && !reopened` is why the key is needed.
- `src/shared/server/data-files.ts` -- `loadExamplePair` exists (2.9); do not change.
- `src/modules/cv/server/extract.ts` -- `extractCvText(name, bytes)` for the PDF and TXT routes in the parity test. `src/modules/application/server/analyse.test.ts` -- test style to follow.
- `src/shared/ui/messages.nb.ts` -- `application` block gets the two texts. `src/shared/ui/components/button.tsx` -- takes `ref` and `type`.
- `next.config.ts` -- `outputFileTracingIncludes`: add `/soknad` (vocabulary is read by `/api/**`, the Example folder by the page).
- `e2e/application.spec.ts` -- already reads the Example pair and Answer key; add the button tests there. Existing config test for `next.config.ts` (grep `outputFileTracingIncludes` in `src`) -- extend.
- `docs/qa/` -- existing files show the record style.

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/ui/messages.nb.ts` -- `application.useExample` «Bruk eksempelet», `application.exampleFilled` «Eksempelet er fylt inn.» -- one text source
- [x] `src/app/soknad/page.tsx`, `next.config.ts` (+ config test) -- read and pass the pair, trace its folder for `/soknad`, fallback without the button
- [x] `src/modules/application/ui/application-form.tsx` -- button, fill, confirm CV, clear errors, session write, focus, announce, `CvInput` key
- [x] `src/modules/application/server/example-parity.test.ts` -- the three-route test
- [x] `e2e/application.spec.ts` -- fill and focus and live-region text, submit gives the Answer key's score and lists, over typed text with an error showing, edit drops confirmation, reload restores, 360 px with no horizontal scroll, axe
- [x] `docs/qa/example-pair-manual-checks.md` -- the FR-3 and FR-8 rows as above

**Acceptance Criteria:**
- Given Søknad with or without login and in every mode, when «Bruk eksempelet» is pressed, then title, employer, ad and CV text fill in, the CV counts as confirmed, focus is on «Analyser og skriv utkast» and the action live region says «Eksempelet er fylt inn.».
- Given `cv.pdf`, `cv.txt` and «Bruk eksempelet» with the same ad, when each is analysed, then score, lists and fingerprint are equal (automated).
- Given the repository, when `npx biome check`, `npm run typecheck` and `npx vitest run` run, then all pass; e2e passes if Playwright can start.
- Given the manual checks, then `docs/qa/` holds the FR-3 and FR-8 rows, results blank until Helene records them (reported as open, not as done).

## Implementation Notes

- Implemented by a subagent from this spec, then patched after review. `SoknadPage` reads the pair (guarded, logs `UNEXPECTED`, form renders without the button on failure). `ApplicationForm` gets the `example` prop, `fillExample` (secondary button between Arbeidsgiver and the ad; `onMouseDown` prevented like «Bekreft CV-teksten»), a submit-button ref and `key={exampleRuns}` on `CvInput`. The handler is `fillExample`, not `useExample`, because a `use*` name trips the hooks lint.
- `/soknad` is traced for the Example folder; a build shows the files in `.next/server/app/soknad/page.js.nft.json`, and the route is dynamic.
- Parity test (`example-parity.test.ts`) also checks the score and lists against the Answer key. `cv.txt` and the button share one source by design.
- `docs/qa/example-pair-manual-checks.md` holds the FR-3 and FR-8 rows with Date, Tester and Result blank. They are Helene's to run: AC 3 and 4 are open until she records them.
- Verified: `biome check`, `npm run typecheck`, `vitest run` (54 files, 538 tests), `playwright test e2e/application.spec.ts e2e/home.spec.ts` (85 tests), `npm run build`. Docker not run.

## Spec Change Log

## Review Triage Log

Three reviewer subagents (Blind Hunter, Edge Case Hunter, Verification Gap) ran on the diff.

| Finding | Verdict | Evidence / route |
|---|---|---|
| No test for the unreadable-pair fallback on `/soknad` (Blind, Edge, Verification Gap) | medium | Real; patch: `src/app/soknad/page.test.ts`. |
| No test that a late file answer after «Bruk eksempelet» is dropped (Verification Gap) | medium | Real; patch: e2e with a held `/api/cv/extract`. |
| Parity test compares routes only with each other (Blind); txt and example share `cv.txt` (Edge) | medium | Real for the vacuous-pass risk; patch: assert against the Answer key. The shared source is the design: «Bruk eksempelet» reads `cv.txt`. |
| FR-8 pre-filled values go stale; tester anchoring (Blind, Verification Gap) | low | Real; patch: vocabulary version, date and compare-with-the-page line. |
| `/soknad` prerendered at build would bake in a failed read (Edge) | false | `.next/server/app` holds no `soknad.html`; the route renders per request, as Hjem does. |
| Fill during an in-flight analysis; fill before session restore (Edge, Blind) | low | Rejected: the busy submit ignores clicks and a late answer shows the inputs that were sent; the restore effect runs on mount before a click is possible; the fix adds guards for no reachable harm. |
| Example not checked with `inputErrors` (Edge) | false | A Vitest test parses the Example Fixture and the server analyses it; a short Fixture fails those tests first. |
| Overwrites typed text with no undo; announcement may not repeat; example shipped in page payload; config key order; `networkidle`; manual-table columns; `applicationId` undefined in e2e (Blind) | low | Rejected: overwrite is the specified behaviour; `announce` empties the region first so repeats are spoken; props are the specified route; the rest are cosmetic or false (`writeSession` maps `null` to unset). |
| `/soknad` tracing checked only as config text (Verification Gap) | low | Checked by a build and the page's `.nft.json` at verification. |
| Task list, notes and logs empty (Blind) | false | Filled by this step. |

## Verification

**Commands:**
- `npx biome check` -- expected: no diagnostics
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npx playwright test e2e/application.spec.ts` -- expected: pass (if the environment allows)
