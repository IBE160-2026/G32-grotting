---
title: 'Story 1.8: Read what JobAssistant does on Hjem'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '2885ece2545b1e7f748b98ce3b738ff2c5611243'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hjem is only the `h1` «JobAssistant». A Student who opens the app cannot see what it does before pasting anything.

**Approach:** Replace `src/app/page.tsx` with the before-S6 Hjem from EXPERIENCE.md and the S01 mock: headline, lede, primary «Lag skreddersydd søknad» going to Søknad, the three outputs, the stance, and the line about trying the example. No plot yet (Story 2.9) and nothing for deferred features. Covers NFR-1, NFR-2, NFR-3, D2, D20, UX-DR33 (before-S6), UX-DR34.

## Boundaries & Constraints

**Always:**
- Branch `story/1.8-read-what-jobassistant-does-on-hjem` off `main`. Commits cite `1.8` and the IDs. Stage by explicit path.
- Server component; every string comes from `messages.nb.ts` under a new `home` key, using the wording in EXPERIENCE.md, Key strings (headline, lede with «samsvar», outputs «ATS-samsvar» · «Gapanalyse med omformuleringer» · «Utkast til søknadsbrev», stance, before-S6 line). Output descriptions and the three stance points are taken from the S01 mock.
- Headings: one `h1` (the headline), `h2` for the outputs section, `h3` per output, `h2` for the stance; no skipped levels. The title stays `Hjem – JobAssistant`.
- The primary «Lag skreddersydd søknad» is a real `<a href="/soknad">` (S01 mock) with the primary button look, so Button and Link share one style source instead of a copy. «Du kan prøve med eksempelet først. Det krever ingen konto.» sits under it, as plain text.
- Layout at ≤ 640 px is one column; at 1280 px the hero text keeps `max-w-measure`, outputs as a ruled ordered list, stance two columns as in the mock. Use only existing tokens; no horizontal scroll down to 320 px.

**Never:**
- No pulse plot, no «Bruk eksempelet» action, no «Vurder CV» or «Vurder søknad» card or placeholder (D2), no login or register route (D20), no state, no client component, no new dependency, no new route.
- No code-strip component; the «Regnet ut av kode» and «Skrevet med KI» labels are left out until a story builds the strip.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Hjem, accounts off | GET `/` | `h1` = headline; lede, three outputs, stance and the example line visible | N/A |
| Primary action | Click or Enter on «Lag skreddersydd søknad» | Navigates to `/soknad` (404 until Story 1.9) | N/A |
| Phone | 360 px, then 320 px | one column; no horizontal scroll | N/A |
| Deferred features | Page text | does not contain «Vurder CV» or «Vurder søknad» | N/A |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- the stub `h1`; keep `metadata` and `pageTitle(messages.nav.home)`; layout already supplies `<main>` and page padding.
- `src/shared/ui/messages.nb.ts` -- add `home: { headline, lede, primaryAction, outputsHeading, outputs[3] {title, body}, stanceHeading, stancePoints[3], tryExample }`.
- `src/shared/ui/components/button.tsx` -- extract the class-building (variant, small, disabled) into an exported `buttonClasses()`; `Button` keeps behaviour and output.
- `src/shared/ui/components/link.tsx` -- add `kind: "button"`, which uses `buttonClasses("primary")`; the existing kinds are unchanged. `button.test.ts` shows the test style.
- `e2e/home.spec.ts` -- the old test expects `h1` «JobAssistant»; replace. `e2e/shell.spec.ts` and `e2e/access.spec.ts` hold `seriousFindings` (axe) and the 320 px check to copy. Also check any other test that reads Hjem's `h1`.
- `src/app/globals.css` -- tokens `text-display`, `text-statement`, `text-lede`, `max-w-measure`, `text-heading`, `text-subheading`, `max-640`; do not add tokens.

## Tasks & Acceptance

**Execution:**
- [ ] `src/shared/ui/messages.nb.ts` -- `home` strings -- NFR-1
- [ ] `src/shared/ui/components/button.tsx`, `link.tsx`, `button.test.ts` -- shared `buttonClasses()`, `Link kind="button"`, tests that Button's classes are unchanged and the link renders `<a>` with the primary classes -- UX-DR34
- [ ] `src/app/page.tsx` -- Hjem layout -- UX-DR33, UX-DR34, D2
- [ ] `e2e/home.spec.ts` -- cover the matrix: headline `h1`, title, outputs, stance, example line, button `href="/soknad"` and its focus ring, no «Vurder», one column at 360 px, no sideways scroll at 320 px, axe 0 serious or critical at 1280 and 360 px -- NFR-2, NFR-3

**Acceptance Criteria:**
- Given accounts are off, when Hjem renders, then it shows the headline as `h1`, the lede, the three outputs, the stance and the example line, and the primary button goes to Søknad.
- Given Hjem, when checked against D2, then no card or placeholder for a deferred feature appears.
- Given 360 px, when Hjem renders, then it is one column with no horizontal scroll (also at 320 px).
- Given `npm test` and `docker compose run --rm --build test`, then Biome, typecheck, Vitest and Playwright pass.

## Implementation Notes

- Implemented by a subagent in a separate git worktree (`C:\IBE160\JobAssistant-1.8`), because another session moved the main checkout to the Story 2.1 branch during the run. Three review patches (reading-measure bound, computed `text-decoration`, fresh load at 320 px) were applied by the same subagent.
- Verified: `npm test` on the host (Biome, typecheck, Vitest, 44 Playwright tests incl. the rewritten `e2e/home.spec.ts`) passes. `docker compose run --rm --build test` was **not** run: Docker Desktop was not running.
- Not verified: the page in a real browser at 1280 px and 360 px, a real phone, a screen reader.
- Left out on purpose: the arrow icon inside the button, the A1–A3 side labels and the «Regnet ut av kode» / «Skrevet med KI» strips from the S01 mock. `/soknad` is a 404 until Story 1.9. The pulse plot and «Bruk eksempelet» arrive with 2.9 and 2.10.
- `epic-1-context.md` was recompiled because `epics.md` and the PRD were newer; it now says the README run is the delivery (D23).

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; defer = `deferred-work.md`; reject = no action. No intent_gap or bad_spec findings.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | Reading-measure test allows `62 * 16` px, about twice the real `62ch`, so it cannot catch a widened or dropped `max-w-measure` (BH, EC, VG) | medium | patch: test reads the wrapper's computed `max-width` and bounds the lede by it |
| 2 | Nothing proves the primary `<a>` is not underlined; the unit test only checks the class string (BH, EC) | low | patch: e2e asserts `text-decoration-line: none`. Preflight sets `a { text-decoration: inherit }`, so it holds today |
| 3 | The 320 px overflow check resizes after the last load instead of loading at 320 px (EC) | low | patch: `goto` after `setViewportSize` |
| 4 | Copy promises behaviour that does not exist yet: example, verbatim quotes, consent before AI, tone choice (BH, VG) | low | reject: the acceptance criteria and EXPERIENCE.md Key strings require this wording; each promise is built by a later story. Surfaced in the summary |
| 5 | «Du kan prøve med eksempelet først» has no link, and ignores the Access code on Hosted (BH) | low | reject: the spec fixes it as plain text until Story 2.10; the Access code gate is outside Hjem's wording |
| 6 | The Enter test passes on the 404 at `/soknad` (BH, VG) | low | reject: the spec states `/soknad` is a 404 until Story 1.9; the issue is already in `issues.md` |
| 7 | Axe fails only on serious or critical; one scheme; no zoom or text-spacing check (BH) | low | reject: the same filter as `shell.spec.ts` and `access.spec.ts`; the app has one dark theme; zoom and spacing belong to Story 7.2 |
| 8 | Hard-coded outline colour, exact float equality, no 640–1000 px check (BH) | low | reject: the colour check copies `shell.spec.ts`; the left edges are integer grid tracks; no evidence the middle width breaks |
| 9 | Unit test pins the full class string (BH) | low | reject: it guards that extracting `buttonClasses` changed no pixel; the next assertions would still catch drift |
| 10 | `Link kind="button"` is fixed to primary; `link.tsx` imports `button.tsx` (BH, EC) | low | reject: the spec says primary; `button.tsx` has no client code. Revisit when a secondary link-button is needed |
| 11 | `<ol>` for the outputs implies a sequence (BH) | low | reject: the spec (Always) says «ruled ordered list», as in the S01 mock |
| 12 | Stance list has no closing rule; D2 test checks only two strings (EC) | false / low | reject: the mock's `.stance ul li` has `border-top` only; the matrix row names those two strings |
| 13 | Tab loop capped at 10 presses (EC) | low | reject: the other specs use fixed Tab counts too |
| 14 | DESIGN.md, sprint status, story-number comments, scaffold test lost its h1 line (BH) | false | reject: sprint status is updated (`1-8` in-progress); the h1 assertion moved to «UX-DR33»; code comments citing stories are the project style |

## Design Notes

- **A link, not a `<button>`.** The mock draws the primary action as `<a class="btn btn-primary">`. EXPERIENCE.md says navigation is a real `<a href>`. The class string moves to one function so Button and Link cannot drift apart.
- **The example line comes before the example.** The line points to «Bruk eksempelet», which Story 2.10 builds. The acceptance criteria require the line now; it stays as plain text, with no link, until then.

## Verification

**Commands:**
- `npm test` -- expected: Biome, typecheck, Vitest and Playwright pass
- `docker compose run --rm --build test` -- expected: passes

**Manual checks:**
- Open `/` at 1280 px and 360 px: reads in order headline → lede → button → example line → outputs → stance; Tab reaches the button with the amber ring.
