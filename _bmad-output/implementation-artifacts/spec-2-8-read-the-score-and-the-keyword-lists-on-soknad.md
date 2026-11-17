---
title: 'Story 2.8: Read the score and the keyword lists on Søknad'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
baseline_commit: 'd34c2fca9dc4561cd329542460bfce7297cb91fc'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `POST /api/analyses` returns a score, but Søknad only validates the form: the Student cannot see the score, its formula, the Verdict, or the CV and ad lines behind each keyword (FR-4, FR-7, FR-8, NFR-2, NFR-4, NFR-5, AD-6, AD-8, AD-16, UX-DR12, 14, 15, 18, 19, 23, 24, 37, 39).

**Approach:** On a valid submit the form sends one `POST /api/analyses` through `callApi`; the result replaces the form on the same page and shows the score block and both keyword lists. Phase 1 only: no AI, no letter, no gaps. Bokmål texts exactly as the Story 2.8 acceptance criteria in `epics.md` give them.

## Boundaries & Constraints

**Always:**
- Branch `story/2.8-read-score-and-keyword-lists` off `main`. Commits cite `2.8`. Stage by explicit path. PR, review, then merge.
- Respect biome `noRestrictedImports`: `shared/ui` must not import `@/modules/**` (its new components take plain props); other slices only through `index.ts` / `contracts.ts` / `ui/index.ts`; client code never imports `server-only` modules (`@/modules/match` index, `application` index). `match/ui` gets `verdictOf` and `scoreOf` types through a relative import of the pure `match/core/score.ts`. Add a lint-boundary fixture if a rule changes.
- All UI text in `messages.nb.ts`; the wire result stays text-free (`formula` and `explanation` are `{key, params}` — the UI builds the sentences). Verdict comes from `verdictOf(score)`, never from the wire.
- Add `@tanstack/react-query` at the pinned `5.107.1` (architecture, AD-16); a `QueryProvider` in `shared/ui` wraps the root layout children; the submit is one `useMutation`. Server state lives there; inputs stay in `client-session`.
- Submit: valid and confirmed inputs → button `busy`, a second click does nothing while pending, one request with `applicationId` from the session (made as today), `inputs` from the form. The result replaces the form on the same page; focus moves to the `h1`; the `h1` is the employer alone (no number). Credits list: Stilling, Dato (today, nb), Annonse («14 avsnitt · 7 nøkkelord» from `adParagraphs`, `totalCount`).
- Score block: `h2` «71 % samsvar – 5 av 7 nøkkelord»; Verdict strip (moss «Sterkt samsvar» / outline «Bør forbedres») with threshold sentence; «Formel» + «5 av 7 nøkkelord funnet = 71 %»; the disclaimer from the epic. No fallback notice (source is always `code`).
- Lists: `h2` «Funnet i CV-en» / «Mangler i CV-en», `h3` per Keyword with the strip inside it. Matched: Evidence quote (Keyword marked), «Bevis · CV-linje N · annonsen avsnitt NN». Missing: «Annonsen ber om «X». CV-en din viser det ikke ennå.», quoted ad line, «Fra annonsen · avsnitt NN». Paragraph numbers are two-digit, 1-based, from `positions[0].paragraph`. The ad line is the ad paragraph at that position. Quotes over ~160 characters trim at a word boundary with «…», keeping the marked Keyword in view. An empty list shows no `h2`.
- The first live region (`announce("phase", …)`) says the score sentence and the Verdict once. «Endre annonsen» returns the form with every input kept, focus on its `h1`.
- Too few Keywords (`INVALID_INPUT`, field `inputs.jobAd`): the epic's alert at the Job ad field, focus there, no result view. `NETWORK_ERROR`: «Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.» as a `role="alert"` at the top, inputs kept, focus unchanged. Any other failure shows the generic error alert from existing keys. No raw error or stack trace anywhere.
- A refresh shows the form with its inputs (the result is not stored). Edits still reset `applicationId`. WCAG 2.2 AA, single column at 360 px, no colour-only meaning.

**Never:**
- No change to `match/core`, `keywords/core`, the route or the contracts (except exports). No pulse plot, gap analysis, letter, database, history or Verdict storage. No second place that computes a score or Verdict.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Example pair | Valid confirmed inputs, submit | Result view; counts equal the Answer key; one request | N/A |
| Double click | Submit while pending | Still one request; button busy | N/A |
| Strong / weak | Score 70 / 69 | «Sterkt samsvar» / «Bør forbedres» | N/A |
| All missing | Score 0 | «0 % samsvar – 0 av 7 nøkkelord»; no «Funnet» list | N/A |
| Too short ad | < 3 Keywords | Alert at Job ad, focus there, form stays | `inputs.jobAd` mapped |
| Network failure | `NETWORK_ERROR` | Top alert, inputs kept, focus unchanged | N/A |
| Edit annonsen | Press «Endre annonsen» | Form with all inputs, focus on `h1` | N/A |
| Long quote | Line > 160 chars | Trimmed at word, «…», Keyword visible | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/application/ui/application-form.tsx` -- holds the form state and `onSubmit` (no fetch yet); add mutation, result/form switch, alerts and focus. `src/app/soknad/page.tsx` -- page; `CatalogueHeading` (`shared/ui/components/catalogue-heading.tsx`) takes only `children`, so give it a ref/`tabIndex=-1`.
- `src/shared/ui/{api-client.ts,announce.ts,client-session.ts,messages.nb.ts}`, `src/app/layout.tsx` -- reuse `callApi(path, schema, {method, body})`, `announce("phase"|"action")`; add messages and the provider.
- `src/shared/ui/components/{alert,button}.tsx` -- reuse. New: `code-strip.tsx`, `evidence-quote.tsx`, `credits-list.tsx`, `src/shared/ui/query-provider.tsx`.
- `src/modules/match/{contracts.ts,core/score.ts}` -- `AnalysisResult` types, `verdictOf`. New: `match/ui/{score-block,keyword-entry}.tsx`, `match/ui/index.ts`.
- `src/modules/application/contracts.ts` -- `analyseRequestSchema`, `analyseResponseSchema`, `normaliseNewlines`.
- `e2e/application.spec.ts` -- has `openForm()`, `NETWORK_FAILURE`, `AD`; extend. Unit tests use `renderToStaticMarkup` (no jsdom); `test/lint-boundaries.test.ts` for rule fixtures.

## Tasks & Acceptance

**Execution:**
- [ ] `package.json` + `src/shared/ui/query-provider.tsx` + `src/app/layout.tsx` -- add `@tanstack/react-query@5.107.1`, provider -- server state per AD-16
- [ ] `src/shared/ui/messages.nb.ts` -- result, score, formula, Verdict, evidence, too-short and «Endre annonsen» texts -- one text source
- [ ] `src/shared/ui/components/{code-strip,evidence-quote,credits-list}.tsx` + tests -- generic presentational components; trimming helper is pure and tested
- [ ] `src/modules/match/ui/{score-block,keyword-entry}.tsx`, `index.ts` + tests -- result presentation from `AnalysisResult`
- [ ] `src/modules/application/ui/application-form.tsx`, `catalogue-heading.tsx` -- mutation, result view, alerts, focus, live region, «Endre annonsen»
- [ ] `e2e/application.spec.ts` -- Example pair result, double click, too-short ad, network failure, back to form, axe; run if Playwright can start

**Acceptance Criteria:**
- Given valid confirmed inputs, when submitted, then one request is sent, the result view shows the score block and lists matching the Answer key, and focus is on the `h1`.
- Given a too-short ad or a network failure, when submitted, then the matrix behaviour holds and no result is shown.
- Given the repository, when `npx biome check`, `npm run typecheck` and `npx vitest run` run, then all pass.

## Implementation Notes

- Implemented by a subagent from this spec. Files: `shared/ui/{query-provider.tsx,messages.nb.ts,components/{code-strip,evidence-quote,credits-list,trim-quote}}`, `match/ui/{score-block,keyword-entry,phase-one-line,index}`, `application/ui/application-form.tsx` (now owns the `h1`, so `app/soknad/page.tsx` no longer renders the heading), `catalogue-heading.tsx` (ref, employer variant), e2e and unit tests.
- No generic error text exists in `messages.nb.ts`, so every failure other than the too-short ad shows the network-failure alert, as `access-form` and `cv-input` already do.
- Verified: `biome check`, `npm run typecheck`, `vitest run` (49 files, 471 tests), `playwright test e2e/application.spec.ts` (57 tests) pass. Docker and a by-eye browser check not run.

## Spec Change Log

## Review Triage Log

Three reviewer subagents (Blind Hunter, Edge Case Hunter, Verification Gap) ran on the diff.

| Finding | Verdict | Evidence / route |
|---|---|---|
| `trimQuote`: a long run with no space and no mark leaves only «…»; a mark longer than `max` is cut inside the mark (Edge, Blind) | low | Real; patched with two guards and two tests. |
| Threshold sentence «Under 70 % gir bør forbedres» is ungrammatical (Blind) | low | Real copy defect; Verdict names now quoted; message and unit test updated. |
| No `#live-action` assertion for the too-short ad announce (Verification Gap) | medium | Patched: assertion added to the e2e test. |
| Applicationid e2e test could race the reload (Edge) | low | Patched: `expect.poll(sent.length)` before reload. |
| Every non-ad failure shows the network-failure text, incl. any future Daily cap (Blind, Edge, Verification Gap) | low | Spec says «existing keys», none exists; consistent with other forms; no cap in phase 1. Deferred with a generic-error text. |
| `sending.current` guard not pinned by a test past the busy button; non-network failure branch untested (Verification Gap) | low | Deferred. |
| Late result or too-short answer after edits during the request (Edge) | low | Rejected: phase 1 is local code and fast; the result shows the inputs as submitted. |
| Client `splitParagraphs` can differ from the server's (Blind, Edge) | false | Same function on the same text; the schema does not transform `jobAd`. |
| Resend of same `applicationId` double-counts; identical live line not re-read; callbacks skipped on unmount (Edge) | false | No cap in phase 1; `announce` empties the region first; the ref dies with the component. |
| Empty list shows no section; provider wraps the whole app; class-name assertions; `formatCount` inconsistency; `failed` not cleared on edit; e2e paragraph regex; busy has no announcement; alert not scrolled (Blind) | low | Rejected: the first two are in the spec; the rest are cosmetic or have no named harm. |
| `EvidenceQuote` does not clamp a mark past the text; validation runs on a submit while busy (Edge) | low | Rejected: offsets come from the same text; the guard needs more than a direct correction. |

## Design Notes

The result is held in component state only (not stored), so a refresh returns the form with its inputs; storage of results belongs to later stories (AD-8). The Example-pair Answer key, not hand-typed numbers, feeds test expectations.

## Verification

**Commands:**
- `npx biome check` -- expected: no diagnostics
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npx playwright test e2e/application.spec.ts` -- expected: pass (if the environment allows)
