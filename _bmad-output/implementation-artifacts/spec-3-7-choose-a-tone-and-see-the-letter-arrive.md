---
title: 'Story 3.7: Choose a Tone and see the Letter arrive'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '3343bf255877c1624416203b69a9fa743d6fef69'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The server writes the Letter (Stories 3.4, 3.5) and asks for consent (3.2, 3.6), but no screen lets the Student pick a Tone or see the Letter. `consentFor` from Story 3.6 has no caller, and nothing re-asks the notice when the server answers `AI_NOTICE_REQUIRED`.

**Approach:** Add the «Tone i brevet» radio group to the Søknad form (kept in `ja.session.v1`). After phase 1 renders, start phase 2 as one TanStack Query mutation that sends inputs, fingerprint, Tone and `consentFor(...)`, with a progress line and a «Søknadsbrev» placeholder while it runs, then the read-only Letter view. `ANALYSIS_STALE` reruns phase 1 once silently. `AI_NOTICE_REQUIRED` re-opens the notice once, then resends. The before-S4 variant is built: one slot, no Gapanalyse.

## Boundaries & Constraints

**Always:**
- All text from `messages.nb.ts`; the server sends codes only. The Letter is an `<article aria-labelledby="letter-h2" aria-describedby="letter-ai-label">`, never a textarea or `contenteditable`; the sign-off is `renderLetter(text, null)`.
- Focus is not moved when the Letter arrives. The first live region speaks the phase-1 line (ending with the AI sentence) and then the phase-2 line, each once. The progress line has no role and no live region.
- The trace animates at most 5 s and is static under `prefers-reduced-motion`.
- The Tone shown in the credits list is `letter.tone` from the response, so it equals the Tone requested.
- Only `client-session.ts` touches `ja.session.v1`. `progress-line` and `ai-placeholder` are shared components.
- Tests make no live AI request: Test mode on cached responses; the live-settings server's phase-2 requests are intercepted in the browser.

**Never:**
- No copy, download or «Lag nytt utkast» (Story 3.8). No Letter flags (3.10). No Gapanalyse slot. No Hosted change, no new package.
- A full failure design is Story 3.9; here a failed Letter only shows a plain alert with «Prøv igjen», the «Dagens grense» notice, or the «Testmodus» notice, so no state is blank.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default Tone | Fresh session | «Formell» checked; arrows move within the group; the Tone is written to `ja.session.v1` | N/A |
| Letter arrives | Phase 1 done, answer `ok` | Letter view under the label, credits show the Tone, progress line gone, focus unchanged, phase-2 line spoken once | N/A |
| Request body | Any phase-2 call | `{ applicationId, fingerprint, inputs, tone, consent }` with `consent = consentFor(runMode, accepted)` | N/A |
| Stale | `ANALYSIS_STALE` | Phase 1 rerun once, Letter resent with the new fingerprint, no message | A second `ANALYSIS_STALE` shows the section alert |
| Notice required | `AI_NOTICE_REQUIRED` | Notice opens; «Godta og fortsett» saves the version and resends | «Avbryt» or a second refusal shows the section alert with «Prøv igjen» |
| Cap / Test mode | `DAILY_CAP_REACHED` / `TEST_MODE_UNAVAILABLE` | Notice «Dagens grense» / «Testmodus», score stays, no retry | N/A |
| Provider failure | `AI_TIMEOUT`, `AI_PROVIDER_ERROR`, network | Alert «Søknadsbrevet kunne ikke lages …» with «Prøv igjen» | Retry resends the Letter request only |
| Back to the form | «Endre annonsen» while pending | Result dropped, no stale Letter appears | N/A |

</intent-contract>

## Code Map

- `src/modules/application/ui/application-form.tsx` -- owns phase 1 and now the phase-2 mutation, the notice re-prompt and the result layout; `show()` starts phase 2.
- `src/modules/ai/ui/notice-consent.ts` -- `consentFor`, `noticeRequired` (from 3.6); `AiNotice` is rendered in the result branch too.
- `src/modules/letter/ui/{tone-choice,letter-view,letter-section,request-letter}.tsx|ts`, `index.ts` -- new; `request-letter.ts` holds the stale rerun, unit-tested with injected senders.
- `src/shared/ui/components/{progress-line,ai-placeholder,notice}.tsx` -- new shared parts; trace keyframes in `src/app/globals.css`.
- `src/shared/ui/api-client.ts` -- `timeoutMs` option (the Letter needs more than 15 s); `client-session.ts` -- `tone`; `messages.nb.ts` -- all texts; `phase-one-line.ts` -- AI sentence.
- `src/modules/letter/core/render-letter.ts`, `src/modules/letter/contracts.ts`, `src/app/api/analyses/[id]/letter/route.ts` -- read-only, already built.
- `e2e/letter.spec.ts` (UJ-1), `e2e/ai-notice.spec.ts` (intercept phase 2 on the live-settings server), `docs/qa/`.

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/ui/{client-session,api-client,messages.nb}.ts`, `src/modules/match/ui/phase-one-line.ts` -- tone field, timeout option, texts, AI sentence
- [x] `src/shared/ui/components/{progress-line,ai-placeholder,notice}.tsx`, `globals.css` -- shared parts with tests
- [x] `src/modules/letter/ui/*` -- tone choice, Letter view, section states, `requestLetter` with tests
- [x] `src/modules/application/ui/application-form.tsx` -- Tone in form, phase-2 mutation, consent, stale, notice re-prompt
- [x] `e2e/letter.spec.ts`, `e2e/ai-notice.spec.ts`, `e2e/support/application.ts` -- UJ-1 per Tone, states, axe, intercepts
- [x] `docs/qa/` -- manual rows for the screen-reader and reduced-motion checks that need a person

**Acceptance Criteria:**
- Given the ACs of Story 3.7 in `epics.md`, when `npm test` runs, then each is covered by a passing unit or e2e test, and the manual rows that need a person are listed as open.

## Spec Change Log

## Review Triage Log

### 2026-11-19 - Review pass
- verdicts: about 40 findings across four layers (Blind Hunter 14, Verification Gap 4, Intent Alignment descriptive, Edge Case Hunter 11): high 1, medium 0, low 6, false 0
- findings:
  - `[high]` `[patch]` Focus sent to the placeholder `h2` on retry or notice close was lost when the Letter replaced it (separate `<section>`/`h2`) - found by Blind Hunter, Edge Case Hunter and Verification Gap. `AiPlaceholder` now takes `children` and keeps one `section` and `h2` across pending, done and failed; e2e asserts the heading is focused after «Prøv igjen» and after cancelling the second notice.
  - `[low]` `[patch]` Phase-1 line could be overwritten at once in the common fast Test-mode case: the 1.5 s gap existed but had no test - e2e now records `#live-phase` and asserts both lines in order.
  - `[low]` `[patch]` Stored Tone that is not a Tone had no test - e2e seeds «Humoristisk» and expects «Formell».
  - `[low]` `[patch]` A delayed announcement could be spoken after a retry started - `runLetter` clears the timer.
  - `[low]` `[patch]` Contradicting `biome-ignore` comment, no-op `seconds` helper, `test` variable shadowing the global, `session()` possibly null, `previousRev: 0` and Tone-at-submit comments.
  - `[low]` `[reject]` Retry ignores `retryable`, alert plus live line speak twice, no abort of an in-flight request, always «skrives nå», silent score change after a stale rerun, «30» hardcoded, «under ett minutt» copy, Tone only in credits when done - each is specified by the Story 3.7 ACs or EXPERIENCE.md, or belongs to Story 3.9; an abort would not refund the reserved cap request.
  - `[low]` `[reject]` Reprompt with the same version cannot succeed - handled on purpose: a second refusal shows the alert; the Design Notes say a reload fetches fresh config.
  - `[low]` `[reject]` Stale-rerun adoption and form-level orchestration have no direct test - covered by `request-letter.test.ts` and the stubbed e2e; a different-score rerun is rare while phase 1 is deterministic.
  - `[low]` `[reject]` Intent audit: stubbed server answers in the live-settings e2e do not prove the real route enforces consent - the route and `runAi` are tested in Story 3.2/3.4; here only the client side is the story.
  - `[low]` `[reject]` Thin manual-check file, weak `waitForTimeout`, regex on `globals.css`, `checked=""` match - cosmetic.


## Auto Run Result

Status: done. Built in-line by the main agent (no implementation subagent, since the build agent already held the context); the four review layers ran as subagents.

- Summary: «Tone i brevet» radio group on Søknad (kept in `ja.session.v1`); phase 2 starts after the score, as one TanStack Query mutation carrying inputs, fingerprint, Tone and `consentFor(...)`; progress line and «Søknadsbrev» placeholder, then the read-only Letter view with the credits showing the Tone; `ANALYSIS_STALE` reruns phase 1 once silently; `AI_NOTICE_REQUIRED` reopens the notice once; minimal failure states (alert with retry, «Dagens grense», «Testmodus»).
- Files: `src/modules/letter/ui/*`, `src/shared/ui/components/{progress-line,ai-placeholder,notice}.tsx`, `application-form.tsx`, `client-session.ts`, `api-client.ts`, `messages.nb.ts`, `phase-one-line.ts`, `globals.css`, `e2e/letter.spec.ts`, `e2e/ai-notice.spec.ts` (phase 2 stubbed in the browser), `docs/qa/letter-manual-checks.md`.
- Review: 1 high patch (focus), 4 low patches, rest rejected with reasons above; nothing deferred.
- Follow-up review recommended: false.
- Verification: `npx biome check`, `npm run typecheck`, `npx vitest run` (81 files, 941 passed, 2 expected fail), `npx playwright test` (158 passed). No package.json, lockfile, Dockerfile or `data/` change, so the Docker run is not required.
- Residual risks: manual rows 1 to 3 in `docs/qa/letter-manual-checks.md` are open (screen reader, reduced motion); Story 3.9 owns the full failure design; a stale rerun that changes the score is silent.

## Design Notes

Phase-2 state is local to the form (`letterPhase`: pending, done or failed) and driven by one mutation, so «Endre annonsen» can drop it. The re-prompt is allowed once per refusal: a second `AI_NOTICE_REQUIRED` after the Student accepted means the page's RunMode is older than the server, so it shows the alert instead of looping; a reload fetches fresh config.

## Verification

**Commands:**
- `npx biome check`, `npm run typecheck`, `npx vitest run`, `npx playwright test` -- expected: pass
