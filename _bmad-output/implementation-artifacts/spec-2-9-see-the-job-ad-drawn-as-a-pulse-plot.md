---
title: 'Story 2.9: See the job ad drawn as a pulse plot'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
baseline_commit: '5c1eab2f8e6d17da1e93e78065a7272f31da4b9e'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Student reads two keyword lists but cannot see where in the job ad the Matched and Missing words sit, and Hjem shows nothing of what the result looks like (FR-8, NFR-2, NFR-3, UX-DR22, UX-DR34).

**Approach:** A deterministic SVG pulse plot, drawn in the browser from the ad paragraphs and the phase-1 lists: full above 640 px, compact at ≤ 640 px, flat on the Søknad form. It shows on the Søknad result, flat on the form, and on Hjem for the Example ad, whose phase-1 data the server computes from the Example pair Fixture.

## Boundaries & Constraints

**Always:**
- Branch `story/2.9-see-the-job-ad-as-a-pulse-plot` off `main`. Commits cite `2.9`. Stage by explicit path. PR, review, then merge.
- Geometry lives in pure `match/core/pulse-layout.ts` (no DOM, clock, random, I/O; imports only `shared/core` and its own slice's core). One ad plus lists always gives identical geometry. Text width comes in as an injected `measure(text, px)` function; the component supplies a canvas measure after fonts load, tests supply a fixed one.
- Geometry per DESIGN.md → Pulse plot and the 2.9 acceptance criteria in `epics.md`: a baseline per paragraph, 23 px apart (21 on Hjem); ripple derived from the paragraph's characters; a Keyword's peak 62 px high (54 on Hjem) at its first position in that paragraph (x from `start` over paragraph length), stretch thick 2.8 px (Matched) or dashed 1.5 px `3.5 3` (Missing), neutral 1.15 px; lower lines hide upper ones with a `ground`-filled occluder; paragraph numbers `01…` down the left; labels: 9 px code-colour square (moss/rust), Keyword, «FUNNET» / «MANGLER», on a ground plate at 0.94 opacity. Colours only from tokens in `globals.css`; line weight and dashes carry the state.
- Compact (≤ 640 px): `viewBox="0 0 328 …"`, `width: 100%`, draws only paragraphs with Keywords, lines end at x = 160, labels in a column at x = 174 with dotted leaders, one row per Keyword, long Keywords shrink font to fit; figcaption «Viser de 6 av 14 avsnittene som har nøkkelord. Tallet til venstre er avsnittet.» (counts from data). Never horizontal scroll at 320 px.
- Legend under the full plot explains thick / dashed / thin in text (compact: legend stacks). Full mode has no figcaption.
- Accessibility: figure `role="img"` with `aria-label` «14 avsnitt i annonsen tegnet som puls. Funnet i CV-en: A, B. Mangler: C, D.» (compact starts «6 av 14 avsnitt …»; omit an empty list's sentence); no hover, title, tooltip or focusable part; the flat variant is `aria-hidden`. The plot is not in the focus order.
- Redraw after `document.fonts.ready` and on resize, debounced 150 ms; mode comes from the container width, first render is the full variant, switching after mount. Helper for debounce is pure and unit-tested.
- Placement: Søknad result — after «Endre annonsen», before the score block; Søknad form — flat plot of the live `jobAd` paragraphs below the submit button, nothing when the ad has no paragraph; Hjem — a figure for the Example ad between the primary action block and «Dette får du …», built from props.
- Hjem data: `application` exposes a server function that analyses the Example pair (`data/fixtures/example-nordic-digital/{cv.txt,ad.txt,meta.json}`) through `analyseInputs`; the file read goes only through `shared/server/data-files.ts`; `next.config.ts` traces `data/fixtures/example-nordic-digital` and the vocabulary for `/`. Hjem passes plain props (paragraphs, matched and missing terms with positions) to `match/ui`.
- All text in `messages.nb.ts`. Respect biome `noRestrictedImports`; add a lint-boundary fixture if a rule changes. WCAG 2.2 AA; axe clean.

**Never:**
- No change to `keywords/core`, scoring, the route or contracts (except exports). No hover, zoom, click or animation. No «Bruk eksempelet» button (Story 2.10). No second place that computes a score.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Example result | Example pair, 1280 px | Full plot, peaks for all 7 Keywords, labels FUNNET/MANGLER, legend | N/A |
| Compact | Same, 360 px | `viewBox 0 0 328`, only Keyword paragraphs, figcaption with counts, no horizontal scroll | N/A |
| Same input twice | Same ad and lists | Identical geometry | N/A |
| Two Keywords, one paragraph | Both in paragraph 3 | Peaks at own positions, labels on separate rows | N/A |
| No Keywords / empty list | Lists empty | Baselines only; aria-label omits the empty list sentence | N/A |
| Form, empty ad | No paragraphs | No plot drawn | N/A |
| Form, ad typed | Paragraphs, no lists | Flat plot, `aria-hidden` | N/A |
| Resize / fonts load | Width crosses 640 px | Redraw once after 150 ms | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/keywords/core/tokenise.ts` -- `splitParagraphs` (exported via `keywords/core`): the paragraph order `positions[].paragraph` counts. `src/modules/match/{contracts.ts,ui/index.ts,ui/keyword-entry.tsx}` -- `MatchedKeyword`/`MissingKeyword` types, `paragraphNumber` pattern; add `core/pulse-layout.ts`, `ui/pulse-plot.tsx` and export it.
- `src/modules/application/{index.ts,server/analyse.ts,ui/application-form.tsx}` -- add a server `analyseExample()`; mount plot in the result and flat on the form.
- `src/shared/server/data-files.ts` (+ test) -- add the Example-pair reader beside `loadVocabulary`. `next.config.ts` -- `outputFileTracingIncludes`.
- `src/app/page.tsx` -- Hjem; becomes async, calls the server function. `src/app/globals.css` -- tokens `plot-flat`, `plot-label`, `plot-state`, `plot-index` exist.
- `src/shared/ui/messages.nb.ts` -- add `plot` texts. `e2e/application.spec.ts` and a new Hjem e2e -- extend.

## Tasks & Acceptance

**Execution:**
- [ ] `src/modules/match/core/pulse-layout.ts` + test -- pure geometry for full, compact and flat, from paragraphs, lists, mode and `measure` -- determinism and label collision tests
- [ ] `src/shared/ui/debounce.ts` + test -- small pure debounce helper -- 150 ms redraw
- [ ] `src/modules/match/ui/pulse-plot.tsx`, `index.ts` + test -- SVG, legend, figcaption, aria, resize/fonts effect -- `renderToStaticMarkup` tests for each mode and aria
- [ ] `src/shared/ui/messages.nb.ts` -- legend, figcaption, aria-label, Hjem figure texts -- one text source
- [ ] `src/shared/server/data-files.ts` (+ test), `src/modules/application/{server/analyse.ts,index.ts}` (+ test), `next.config.ts` -- Example-pair phase-1 data -- server API for Hjem
- [ ] `src/app/page.tsx`, `src/modules/application/ui/application-form.tsx` -- mount plots in the three places
- [ ] `e2e/` -- result plot at 1280 and 360 px, flat on form, Hjem plot, no horizontal scroll, axe; run if Playwright can start

**Acceptance Criteria:**
- Given the Example pair, when the result shows, then the plot's Matched and Missing terms equal the Answer key and the keyword lists below.
- Given Hjem, when it loads, then it shows the Example ad's plot without login and without a request from the browser.
- Given the repository, when `npx biome check`, `npm run typecheck` and `npx vitest run` run, then all pass.

## Implementation Notes

- Implemented by a subagent from this spec, then patched after review. Files: `match/core/pulse-layout.ts` (pure geometry; `measure` injected), `match/ui/pulse-plot.tsx` (`PulsePlot` with mode and font effects, stateless `PulsePlotView`), `shared/ui/debounce.ts`, `shared/server/data-files.ts` (`loadExamplePair`), `application/server/analyse.ts` (`analyseExample`), `next.config.ts` (`/` traces vocabulary and the Example folder), `app/page.tsx` (Hjem plot, guarded), `application-form.tsx` (result plot, flat form plot), messages, unit and e2e tests.
- `max-w-measure` moved from `app/soknad/page.tsx` into `ApplicationForm`, so the plot spans the content width (it was always compact inside 62ch) while text blocks keep the measure.
- The Example ad has 7 paragraphs and 14 Keywords (the «14 / 7» in the epic text is its illustration); a Keyword gets a peak in every paragraph it occurs in, at its first position there.
- Verified: `biome check`, `npm run typecheck`, `vitest run` (52 files, 534 tests), `playwright test e2e/application.spec.ts e2e/home.spec.ts` (76 tests) pass. Docker not run.

## Spec Change Log

## Review Triage Log

Three reviewer subagents (Blind Hunter, Edge Case Hunter, Verification Gap) ran on the diff.

| Finding | Verdict | Evidence / route |
|---|---|---|
| Compact legend draws 2.8 / 1.5 / «3.5 3», compact plot draws 2.4 / «3 2.5» (Blind) | low | Real; patch: legend reads `layout.stroke`. |
| Floating labels pushed below the last baseline do not raise `height` (Edge) | medium | Real; patch plus a test. |
| Hjem has no fallback if the Example fixture fails; `/` is rendered per request, not prerendered (Blind, Edge) | medium | Real (no `index.html` in `.next/server/app`); patch: try/catch, log, render without the plot. |
| No test that label text fits its plate after fonts load (Verification Gap; Blind on state-word font) | medium | Real; patch: e2e getBBox test. |
| `/` file tracing only checked as config text (Verification Gap) | false | `.next/server/app/page.js.nft.json` lists the vocabulary and the Example fixture files. |
| First render is the full variant, so phones see a swap to compact (Edge, Blind) | low | Spec prescribes it; deferred. |
| Breakpoint is the container width, not the viewport; resize only via `window` (Edge, Blind) | low | Container width is the design intent (plot fills its column); deferred with the swap. |
| Compact mode with no Keyword paragraph draws nothing (Edge, Blind) | low | Rejected: the result needs ≥ 3 Keywords with positions and Hjem uses a fixed Fixture; the fix adds a branch for an unreachable state. |
| Floating-label fallback ignores width / compact labels may stack above y = 0 (Edge, Blind) | low | Rejected: 60 rows are never exhausted by ≤ 14 labels; compact rows are tested on the Example's 11-label paragraph. |
| Flat plot re-lays out on every keystroke (Edge, Blind) | low | Rejected: ads are ≤ 20 000 characters and a few dozen paragraphs; the fix adds deferral for no named harm. |
| Hjem intro shows when the Example has no paragraphs (Edge) | false | The Fixture has 7 paragraphs and a test pins the Answer key. |
| Clientwidth 0 at mount keeps compact (Edge) | false | The plot is never mounted hidden. |
| `placement` not re-read, dead exports (`SQUARE`, `ExampleAnalysis`), magic numbers in `trace`, `segmentsOf` last point, `compactCaption` bypasses `formatCount`, config test key order, loose `toThrow`, e2e regex / `networkidle` brittleness, aria-label duplicates the lists (Blind, Edge) | low | Rejected: cosmetic or spec-given (UX gives the figcaption and aria-label text); no named harm. |

## Design Notes

Compact label rows are stacked per paragraph by the layout, so labels cannot collide whatever the font. The layout takes `measure` as an argument to stay pure: server render uses a character-count estimate, the browser re-lays out with real font metrics after fonts load.

## Verification

**Commands:**
- `npx biome check` -- expected: no diagnostics
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npx playwright test e2e/application.spec.ts` -- expected: pass (if the environment allows)
