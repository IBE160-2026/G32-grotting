---
title: 'Story 4.4: Read the Gapanalyse on Søknad'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: '6ec4bc591f47ac7920860d4ce248c6f4e0e32bf2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Gaps route (4.1-4.3) answers, but nothing on Søknad asks for it or shows it. The Student sees the Missing list and the Letter but no per-keyword gap review.

**Approach:** With `features.gaps` on and at least one Missing keyword, phase 2 sends the Gaps and Letter requests in parallel. A new `gaps/ui` slice renders the «Gapanalyse» section (placeholder, Gap entries, failure treatments); `match/ui` gets an optional link target per Missing entry, passed in by the Søknad composition (`ApplicationForm`); `match` never imports `gaps`.

## Boundaries & Constraints

**Always:** All texts verbatim from the acceptance criteria and EXPERIENCE.md, in `messages.nb.ts`. `Gap.explanation` is `{ text }` or `{ key: "REAL_GAP", params }`, mapped through `messages.gaps.template`. Response `meta` may be `null` and is not used. A downgraded or skipped Gap (`explanation.key`) shows only the template line under its `h3`. A Rewordable gap shows explanation, citation (Evidence quote «Sitert ordrett fra CV-en din · sjekket mot CV-teksten») and the hedge line; `suggestion` is never rendered. A Real gap with an AI `text` shows explanation plus the no-copy note. One live-region line («phase» region) when both sections have settled, naming any failed section. Gaps failure, timeout, cap and Test mode use the Letter section's treatments; score and Letter are unaffected. Without accounts, no «Lagret i Historikk» sentence.

**Never:** Turn on `FEATURE_GAPS` in `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` or README (Story 4.6). Touch `PROMPT_VERSION`, the gaps prompt or `data/fixtures/*/cached/gaps.json`. Loosen integrity checks. Make live AI calls. Send the letter check with Gaps (Story 4.5). Import `gaps` from `match`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Flag on, Missing keywords | phase 1 rendered | Progress line «Skriver gapanalyse og søknadsbrev …», placeholders «Gapanalyse» + «Søknadsbrev» (real `h2`, `aria-busy`), both requests sent | n/a |
| Gaps arrive | 3 rewordable + 2 real | `h2` + sand strip «Skrevet med KI»; `h3` per Gap with strip; links «Se gapanalysen» on each Missing entry focus the `h3` | n/a |
| Flag off, or no Missing keyword | n/a | Unchanged Letter-only phase 2; no Gaps request, no Gapanalyse, no links | n/a |
| Gaps fail | AI_TIMEOUT, AI_PROVIDER_ERROR, UNEXPECTED | Alert «Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.» + «Prøv igjen» (focus to `h2`) | Retry sends only Gaps |
| Cap / Test mode | DAILY_CAP_REACHED / TEST_MODE_UNAVAILABLE | Notice «Dagens grense» / «Testmodus» | no retry |
| Stale fingerprint | ANALYSIS_STALE | silent phase-1 rerun, resend once (as Letter) | second stale is the failure |

</intent-contract>

## Code Map

- `src/modules/gaps/contracts.ts` -- `Gap`, `gapsRequestSchema`, `gapsResponseSchema`, `REAL_GAP_KEY` (read-only)
- `src/app/api/analyses/[id]/gaps/route.ts` -- the route phase 2 calls (read-only)
- `src/modules/letter/ui/{request-letter.ts,letter-section.tsx}` -- pattern to mirror (stale rerun, section failure treatments); `LetterSection` gets `showProgress`
- `src/modules/application/ui/application-form.tsx` -- Søknad composition: phase 2 state, live regions, notice handling
- `src/modules/match/ui/{keyword-entry.tsx,phase-one-line.ts}` -- optional link target; phase-1 line variant
- `src/shared/ui/components/{ai-placeholder,code-strip}.tsx` -- optional strip beside `h2`; amber «rewordable» strip
- `src/shared/ui/messages.nb.ts` -- all new texts (`gaps.*`, `result.missing.gapLink`)
- `playwright.config.ts` -- fifth server (Test mode, `FEATURE_GAPS=true`)

## Tasks & Acceptance

**Execution:**
- `src/shared/ui/messages.nb.ts` -- add gaps/phase-two/link texts -- verbatim strings
- `src/shared/ui/components/{ai-placeholder,code-strip}.tsx` -- optional `strip`, `rewordable` kind
- `src/modules/gaps/ui/{gap-entry,no-copy-note,gaps-section,request-gaps,index}.ts(x)` -- slice UI + Gaps request
- `src/modules/match/ui/keyword-entry.tsx`, `phase-one-line.ts` -- `gapTargets`, phase-1 line with Gaps
- `src/modules/letter/ui/letter-section.tsx` -- `showProgress`
- `src/modules/application/ui/{application-form.tsx,phase-two-line.ts}` -- Gaps mutation, state, combined live line
- `playwright.config.ts`, `e2e/gaps.spec.ts`, unit tests -- coverage (Playwright runs under `npm test`)

**Acceptance Criteria:**
- Given flag on and phase 1 rendered, when phase 2 starts, then both requests are sent in parallel with the stated progress line and two placeholders.
- Given the Gaps arrive, then strips, citation, hedge, no-copy note and template-only rendering are as in the story, and each Missing entry links to its Gap `h3`.
- Given failure/cap/Test mode, then the Letter-style treatments appear and the score and Letter are untouched.
- Given both sections settled, then the first live region speaks the phase-2 line once.

## Design Notes

No Missing keyword means no Gaps request and no section (the server would return an empty list with `meta: null`). The combined phase-2 line lives in `application/ui` because it names both sections; `gaps/ui` and `letter/ui` stay independent. Import other slices only via `index.ts`, `contracts.ts` or `ui/index.ts` (biome `noRestrictedImports`; `test/lint-boundaries.test.ts`). `gaps/index.ts` is server-only: UI imports `@/modules/gaps/contracts`.

Decisions from planning:
- **Texts** (EXPERIENCE.md Key strings, verbatim): progress «Skriver gapanalyse og søknadsbrev … dette tar under ett minutt.»; strips «Skrevet med KI» (sand `CodeStrip`), «Omformulerbart gap» (new amber `rewordable` kind, `bg-amber text-ground`), «Reelt gap» (rust `missing` kind); «Sitert ordrett fra CV-en din · sjekket mot CV-teksten»; «Linjen din dekker trolig dette – vurder å ta det med.»; «Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.»; failure «Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.» + «Prøv igjen»; cap and Test-mode notices reuse `messages.letter.cap` / `messages.letter.testMode`. The existing `messages.gaps.template.REAL_GAP` stays.
- **Phase-1 line** with Gaps: «Samsvaret er klart: …. Gapanalysen og søknadsbrevet skrives nå.» (`phaseOneLine(result, true, withGaps)`; keep existing 2-arg behaviour and tests).
- **Phase-2 line** (`phase` live region, once, after both settle, same 1.5 s gap rule as today): both done «Gapanalysen og søknadsbrevet er klare.»; one failed «Søknadsbrevet er klart. Gapanalysen kunne ikke lages.» (and the mirror «Gapanalysen er klar. Søknadsbrevet kunne ikke lages.»); both failed «Gapanalysen og søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.»; both cap «Dagens grense for KI er nådd. Samsvaret står fortsatt.»; both Test mode «Gapanalysen og søknadsbrevet er ikke tilgjengelige i testmodus.»; other mixes: one sentence per section («Søknadsbrevet er ikke tilgjengelig i testmodus.», «Dagens grense for KI er nådd.»), done sections first. Retry outcomes of Gaps go to the `action` region: «Gapanalysen er klar.» or the section's failure sentence. Write a pure `phaseTwoLine(letterKind, gapsKind)` in `application/ui/phase-two-line.ts` with unit tests; kinds are `done | failed | cap | testMode`.
- **Gaps request** (`gaps/ui/request-gaps.ts`, mirror `request-letter.ts`): POST `/api/analyses/${applicationId}/gaps` with `{ applicationId, fingerprint, inputs, consent }`, `callApi` + `gapsResponseSchema`, 105 s timeout; ANALYSIS_STALE reruns phase 1 once via `analyseResponseSchema` and resends; injectable IO for unit tests. In `ApplicationForm` run it as a `useMutation` next to the Letter mutation, with its own busy ref, a `gapsPhase` state (`pending | done | failed`), a retry that moves focus to the Gapanalyse `h2`, silent rerun adoption via the existing `adoptRerun` (base it on `lastJob.current`), and AI_NOTICE_REQUIRED handled like the Letter (hold the request, one notice dialog, resend on accept, alert on cancel). `show()` resets the section outcomes; `backToForm` resets Gaps state. The Letter section keeps working unchanged when Gaps is off.
- **Placeholders**: `AiPlaceholder` gets an optional `strip` shown beside the `h2` (a flex row) only when given, so the Letter markup is unchanged. `LetterSection` gets `showProgress` (default true); with Gaps on, the composition renders one `ProgressLine` above both sections while either is pending.
- **Gap `h3`**: `id="gap-<index>"` (export a helper), `tabIndex={-1}`, keyword plus strip inside, as the Missing entries do. A Rewordable gap whose `citation` is null or whose explanation is the template key renders as the template-only Real gap (defensive).
- **Link**: `KeywordList` (missing) takes optional `gapTargets: Record<term, elementId>`; each Missing entry with a target ends with a standalone link «Se gapanalysen» (visually hidden « for <term>» suffix as in the mockups, min height 24 px) whose click prevents default and focuses the target `h3`. `match/ui` never imports `gaps`.
- **Playwright**: the default server (3100) keeps Gaps off so existing specs stay valid. Add a fifth server (port 3104, `next start`, `TEST_MODE=true`, `APP_ENV=local`, `DATABASE_URL=pglite://memory`, `FEATURE_GAPS=true`) and `e2e/gaps.spec.ts` using `test.use({ baseURL })`. The Example pair's Cached Gaps are 2 Real, 3 Rewordable (`data/fixtures/example-nordic-digital/cached/gaps.json`, never edited). Cover: two placeholders and progress line, parallel requests, strips/texts/citation/hedge/no-copy, links move focus, failure/retry/cap/Test-mode via route stubs (`**/api/analyses/*/gaps`), the single phase-2 live line, axe scan, no copyable text in a Real gap.

## Verification

**Commands:**
- `npm test` -- expected: biome, typecheck, vitest and Playwright all pass
- `npm run typecheck` -- expected: no errors

## Spec Change Log

(empty)

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: four layers reported; findings below are grouped by claim (duplicates across layers share a row) — high 0, medium 3, low 8, false 2, maybe-false 0
- findings:
  - `[medium]` `patch` Heading remounts when the sand strip appears, so focus from «Prøv igjen» is lost — fixed: `GapsSection` passes `strip={null}` while pending, so the wrapper stays
  - `[medium]` `patch` AI-notice path for Gaps (accept, cancel, once) untested — added two e2e tests
  - `[medium]` `patch` Retry before the Letter has settled and the single phase-2 line untested — added e2e test
  - `[low]` `patch` `NoCopyNote` not exported through `gaps/ui/index.ts` — exported
  - `[low]` `patch` `gapTargets[entry.term]` reads inherited keys (e.g. «constructor») — `Object.hasOwn`
  - `[low]` `patch` Modified clicks on «Se gapanalysen» swallowed, missing target does nothing — guarded
  - `[low]` `reject` Combined progress line shown during a single-section retry — spec says the line shows while any AI section is pending; a retry text is not specified
  - `[low]` `reject` Letter «Prøv igjen» clears a pending phase-2 timer — same behaviour as before this story; the retry outcome is spoken in the second region
  - `[low]` `reject` Gap keyword case or duplicate mismatch, empty explanation or citation, empty Gap list — the server builds one Gap per Missing term; no reachable state
  - `[false]` `reject` `settle()` early return breaks «Lag nytt utkast» — regenerate never calls `settle`; it has its own path
  - `[false]` `reject` Double ANALYSIS_STALE rerun speaks the update note twice — `adoptRerun` compares against `shownResult`, which the first rerun already updated
  - `[low]` `reject` Cap sentence does not name the section, `phaseOneLine` boolean signature, e2e style points (`waitForTimeout`, hard-coded port), redundant branches — cosmetic; no named harm
  - `[low]` `reject` Notices reuse Letter strings — intended by the story («same treatments as the Letter section»)

## Auto Run Result

Status: done. Gaps phase 2 on Søknad behind `FEATURE_GAPS`: new `gaps/ui` slice, optional link target in `match/ui`, combined phase-2 live line, fifth Playwright server (port 3104). Verification: `npm test` (biome, typecheck, vitest, 220 Playwright) and `npm run typecheck` pass. Patches applied: 3 medium, 3 low. Follow-up review recommended: false. Residual risk: the Example pair's Cached Gaps cover only 3 of 7 Missing keywords in Test mode (the rest render as template Real gaps); logged in `.logs/helise-26/issues.md`.
