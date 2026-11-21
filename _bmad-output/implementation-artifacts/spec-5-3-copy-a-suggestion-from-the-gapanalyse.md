---
title: 'Copy a suggestion from the Gapanalyse'
type: 'feature'
created: '2026-11-21'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_commit: 'a99a244c2415f154872163d0f0ed20fa425b7fd6'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-2-discard-suggestions-that-invent-or-upgrade.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-retro-2026-11-20.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A Rewordable gap's suggestion (5.1, guarded by 5.2) reaches no screen, and the Student cannot copy it (FR-16, P3). Also, the Gaps/Letter requests of an earlier submission keep sending requests after a new submission started (Epic 4 retro item 12), and no browser test covers the consent wiring of the Gaps request in live mode.

**Approach:** `gaps/ui/suggestion-box` shows the suggestion in a raised box after the citation with the shared copy button, then the hedge line; a discarded suggestion shows the «Ingen forslag her …» line instead of the box. With `features.rewording` on the progress line names the rewordings. First, phase 2 drops answers that do not belong to the current submission, and a Playwright test covers the Gaps consent.

## Boundaries & Constraints

**Always:** Strings via `messages.nb.ts`, verbatim from the AC. Reuse `CopyButton`, `EvidenceQuote`, `announce()`. «Kopier» copies only the suggestion text. Tests set rewording explicitly. The flag reaches the client through `RunMode`, as `gaps` does. With rewording off nothing changes on screen.

**Never:** No «add to CV» action. No live AI call (stubs, Cached responses, Test mode only). No change of the gaps prompt, `gaps.json`, `canonVerbatim`/`checkCitation` or FR-17. `FEATURE_REWORDING` stays off in `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example`, README. No check of suggestion length or form.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Suggestion | rewordable, citation, `suggestion` string | citation, box «Omformuleringsforslag» with text and small «Kopier», then hedge | clipboard blocked: select text, Ctrl+C notice |
| Discarded | rewording on, rewordable, `suggestion` null | citation, «Ingen forslag her …», hedge | none |
| Rewording off | `suggestion` null | as Epic 4: citation, hedge | none |
| Real or template gap | any | no box, no line | none |
| Stale answer | answer with `ANALYSIS_STALE` for an earlier submission | no rerun, no resend, not adopted | none |
| Gaps consent | live server, Gaps on | request carries `consent: { noticeVersion }`; `AI_NOTICE_REQUIRED` reopens the notice, score unchanged | none |

</intent-contract>

## Code Map

- `src/modules/gaps/ui/suggestion-box.tsx` -- new; exported through `index.ts`.
- `src/modules/gaps/ui/gap-entry.tsx`, `gaps-section.tsx` -- box or discard line; `rewording` prop.
- `src/modules/application/ui/use-phase-two.ts` -- submission counter; `rewording` returned; `result-view.tsx` picks the progress line.
- `src/modules/gaps/ui/request-gaps.ts`, `src/modules/letter/ui/request-letter.ts` -- `isCurrent` stops the stale rerun/resend.
- `src/shared/ui/clipboard.ts` -- `selectContents` (moved from `letter-actions.tsx`).
- `src/shared/ui/messages.nb.ts` -- `gaps.progressRewording`, `gaps.suggestion`.
- `playwright.config.ts` -- servers 3105 (live, Gaps on) and 3106 (Test mode, rewording on).
- `e2e/suggestions.spec.ts`, `e2e/ai-notice.spec.ts`, `e2e/gaps.spec.ts` -- browser tests.

## Tasks & Acceptance

**Execution:**
- [x] Retro item 12 (a): `isCurrent` in both request clients and a submission counter in the hook, tests that failed first.
- [x] Retro item 12 (b): Gaps consent tests on a live server with Gaps on.
- [x] `suggestion-box.tsx`, `gap-entry.tsx`, `gaps-section.tsx`, `result-view.tsx`, `messages.nb.ts` (+ tests) -- the box, discard line, progress line.
- [x] `sprint-status.yaml` -- 5-3 and retro item 12 `done` in this PR.

**Acceptance Criteria:**
- Given a Rewordable gap with a suggestion, when it renders, then after the citation come a raised box «Omformuleringsforslag» with the suggestion and a small «Kopier», then the hedge; no «add to CV» action.
- Given «Kopier», when pressed, then only the suggestion text is copied with the Letter's feedback.
- Given a discarded suggestion, when it renders, then «Ingen forslag her. Vurder selv om og hvordan du vil formulere det.» replaces the box and the citation stays.
- Given rewording on, when phase 2 runs, then the progress line reads «Skriver gapanalyse, omformuleringer og søknadsbrev … dette tar under ett minutt.»
- Given an answer from an earlier submission, when a new one has started, then it is not adopted and nothing more is sent for it.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 15 findings (Blind 11, Edge 3, Verification gap 0; Intent Alignment descriptive) — high 0, medium 0, low 3, false 7, maybe-false 0 (rows below group some of them; 5 rejected as low with no everyday harm)
- findings:
  - `[low]` `patch` Edge/Blind: the box showed for any non-null suggestion whatever the client flag said, and «Ingen forslag her» depended on the flag — the box is now gated on `rewording` too (the safe direction: a skewed client hides, never shows); unit test added for a suggestion string with the flag off.
  - `[low]` `reject` Blind: `null` means both «discarded» and «not asked for», so client/server config drift could show «Ingen forslag her» — both flags come from the same server config through `RunMode`; the AC defines the line for the flag on; a separate «discarded» signal would change the `Gap` shape (AD-7).
  - `[low]` `reject` Blind: no abort of the in-flight request — the request has left; abort would not stop the server's cap count; the fix stops the follow-up rerun and resend, which is what is avoidable.
  - `[low]` `reject` Blind/Intent: the `isCurrent` guards in `onSuccess`/`onError` partly duplicate React Query's own dropping of an older mutation's callbacks, and an ok answer from an earlier submission has no test of its own — defence in depth; the observed path (ANALYSIS_STALE chain) is covered by unit and e2e tests that failed first; the hook has no jsdom test setup.
  - `[low]` `reject` Edge: `begin()` does not clear `pendingLetter` — `begin` only runs after `reset()` (which clears it) and the notice dialog is modal, so no held Letter of an earlier submission can be resumed.
  - `[low]` `reject` Blind: `waitForTimeout` for negative assertions, `held` never released on failure, no test for `selectContents` null branches, no assertion that no unstubbed request leaves — same pattern as 4.4/4.5 tests; the e2e covers the blocked-clipboard path; Playwright closes the page on failure.
  - `[false]` `reject` Blind: early return in `onSuccess`/`onError` leaves busy flags set — `begin()` and `reset()` clear `letterBusy`/`gapsBusy` (the only way a new submission starts).
  - `[false]` `reject` Blind: fixed `aria-label` hides «Kopiert» — the name contains the visible «Kopier» and the live region speaks «Kopiert til utklippstavlen.»; same as the Historikk pattern in EXPERIENCE.md.
  - `[false]` `reject` Blind: progress line says «omformuleringer» when no gap is Rewordable — the line is shown before the Gaps are known; the AC ties it to the flag only.
  - `[false]` `reject` Blind: `SuggestionBox` exported but used by relative import; `rewording` default false — the AC asks for the export; the default keeps the Epic 4 look.
  - `[false]` `reject` Blind: sprint-status flips the Epic 4 retro item, dark-by-default feature — the item and `done` for 5.3 are required in this PR by the task.
  - `[false]` `reject` Blind: «sixth»/«seventh» server comments brittle, more servers cost — cosmetic; the new servers are needed (3102 has Gaps off).
  - Descriptive (Intent Alignment): the consent tests run on a new server (3105, Gaps on) because 3102 sets `FEATURE_GAPS=false`; the phase-1 live line is unchanged, only the visible progress line switches with the flag; no test covers an ok answer from an earlier submission at hook level.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: green

## Auto Run Result

Status: done

**Summary:** Retro item 12: `requestGaps`/`requestLetter` take `isCurrent` and send nothing more (no phase-1 rerun, no resend) once a new submission has started; `usePhaseTwo` counts submissions (`begin`, `reset`) and drops answers of an earlier one. Gaps consent is covered in the browser on a live-settings server with Gaps on. Story 5.3: `SuggestionBox` (raised box, `h4` «Omformuleringsforslag», suggestion as given, small shared `CopyButton`), the discard line, the hedge after both, the rewording progress line; the flag comes from `RunMode` as `gaps` does. `FEATURE_REWORDING` is still off by default.

**Files:** see the Code Map.

**Review:** 1 patch (low), 0 deferred, rest rejected with reasons in the triage log. Follow-up review recommended: false.

**Verification:** `npm run typecheck`, `npm test` (the new unit tests for item 12 failed first: 4 unit tests, 2 e2e tests), see the PR.

**Residual risks:** the e2e negative assertions wait 1 s; no hook-level test of an ok answer from an earlier submission; the Letter check's silent rerun is not guarded by `isCurrent` (code only); the discard case keeps the hedge line after «Ingen forslag her …».
