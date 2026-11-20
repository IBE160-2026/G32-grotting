---
title: 'Story 3.9: Keep the score when the AI part fails'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: 'e36da4907bf529d0e4a0874f1ae45d4ce817e86d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Stories 3.7 and 3.8 built a simple failure path for the Letter: the section alert and the live region both speak the failure (read twice), «Prøv igjen» reports its outcome in the first live region, «Lag nytt utkast» has one failure variant (no «Dagens grense», no «Testmodus», no AI notice reopen), a double press on «Prøv igjen» can send two Letter requests, and a silent `ANALYSIS_STALE` rerun can change the score without anyone being told.

**Approach:** Finish the failure design in the existing client code (`application-form.tsx`, `letter/ui`), no server change. Every failure keeps the score; the section alert is silent (the live region speaks once); each phase-2 request has a mode (first Letter, retry, new draft) that decides where its outcome is announced and how a refusal is shown.

## Boundaries & Constraints

**Always:**
- The score and every phase-1 element stay on screen in every failure (NFR-5, AD-6).
- A failure sentence is spoken once: the section alert (and the new-draft alert) carry no `role="alert"`; the live region speaks. First Letter: first live region (phase 2 line, names «Søknadsbrevet»). «Prøv igjen» and «Lag nytt utkast»: second live region (UX-DR39).
- «Prøv igjen» resends only the Letter request and moves focus to the «Søknadsbrev» `h2`. A new draft keeps the old Letter and focus stays on its busy button.
- `DAILY_CAP_REACHED`: «Dagens grense» notice, no retry, for the first Letter and for a new draft (old Letter kept). `TEST_MODE_UNAVAILABLE`: «Testmodus» notice for both.
- `AI_NOTICE_REQUIRED` on a new draft reopens the AI notice once (as for the first Letter) and sends the new draft after «Godta og fortsett»; «Avbryt» or a second refusal gives the new-draft alert with «Prøv igjen».
- One Letter request in flight at a time (ref guard): a double press on «Prøv igjen», «Lag nytt utkast» or a notice accept starts one request (AD-6, NFR-5).
- A silent `ANALYSIS_STALE` rerun that changes the score or either keyword list is announced once in the second live region («Samsvaret er oppdatert: …»); an unchanged result says nothing.
- All text from `messages.nb.ts`.

**Never:** change server routes, the error envelope, the Daily cap logic or the Test-mode adapter; add a visible stale banner; show «Prøv igjen» for the cap or Test mode.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First Letter fails | `AI_TIMEOUT` / `AI_PROVIDER_ERROR` / network | Silent alert «Søknadsbrevet kunne ikke lages. Samsvaret over er fortsatt riktig.» + «Prøv igjen»; first region: «Søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.» once | Score stays |
| Retry | «Prøv igjen» | One Letter request only, focus on `h2`, outcome in second region (done or failed again) | Double press = one request |
| Cap, first or new draft | `DAILY_CAP_REACHED` | «Dagens grense» notice, no retry button; new draft keeps old Letter | Spoken once (first region / second region) |
| Test mode non-Fixture | `TEST_MODE_UNAVAILABLE` | «Testmodus» notice | — |
| New draft, notice refused | `AI_NOTICE_REQUIRED` | AI notice opens; accept sends the draft; cancel gives the alert with retry, old Letter stays | Second refusal: alert, no loop |
| Silent stale rerun | `ANALYSIS_STALE` then new score | Score updates, second region says «Samsvaret er oppdatert: …» | Unchanged result: silent |
| Double submit / refresh while writing | two clicks / reload | One analyses call and one Letter call; after reload the form returns with its inputs and the same Application id, no error page | — |

</intent-contract>

## Code Map

- `src/modules/application/ui/application-form.tsx` -- `runLetter`, `retryLetter`, `regenerate`, notice accept/cancel, `show`; gets modes, guard, stale announcement.
- `src/modules/letter/ui/letter-section.tsx` -- `FailedLetter` uses the silent alert; `letterLine` stays the first-region line.
- `src/modules/letter/ui/letter-actions.tsx` -- `RegenState` gains `cap` and `testMode`; notices replace the alert and retry.
- `src/shared/ui/components/alert.tsx` -- `silent` prop (no `role="alert"`).
- `src/modules/match/ui/phase-one-line.ts` -- `resultChanged`, `updatedLine`.
- `src/shared/ui/messages.nb.ts` -- new regenerate cap and Test-mode lines, `result.liveUpdated`.
- `e2e/letter.spec.ts`, `e2e/letter-actions.spec.ts` -- alert locators change from role to text; new failure tests.
- Read-only: `request-letter.ts` (stale rerun), `api-client.ts`, `route.ts` (letter).

## Tasks & Acceptance

**Execution:**
- `alert.tsx` -- `silent` prop -- the live region already speaks the sentence
- `messages.nb.ts` -- new lines -- cap and Test mode for new draft, updated score
- `phase-one-line.ts` -- `resultChanged`, `updatedLine` -- stale announcement
- `letter-section.tsx`, `letter-actions.tsx` -- silent alerts, new-draft notices
- `application-form.tsx` -- modes, guard, notice reopen for new draft, stale announcement
- Unit tests for the new helpers and components; e2e for every row of the matrix
- `docs/qa/letter-manual-checks.md` -- manual rows for screen-reader checks of the failure and retry announcements

**Acceptance Criteria:**
- Given a failing Letter request, when the section settles, then the silent alert with «Prøv igjen» is shown, the score stays and the failure is spoken once.
- Given «Prøv igjen», when pressed (even twice), then one Letter request is sent, focus is on the `h2` and the outcome is in the second live region.
- Given the cap, Test mode, a refused notice or a stale rerun with a new score, then the matrix rows hold.

## Spec Change Log

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 24 findings — high 0, medium 2, low 4, false 3, maybe-false 0, rejected-as-low-or-design 15
- findings:
  - `[medium]` `patch` Stale-rerun line in the second live region is overwritten by the outcome line in retry and new-draft modes (Blind, Edge, Gap, Intent) — outcome and note are now spoken as one line (`say`, `updateNote`); e2e added in `letter-actions.spec.ts`.
  - `[medium]` `patch` The first Letter's delayed phase-2 line can fire after «Prøv igjen» was pressed (Blind, Edge) — the timer is now cleared for every mode except a new draft.
  - `[low]` `reject` «Prøv igjen» double-press test cannot prove the guard, since the button leaves the DOM at once (Gap) — true, and for the same reason a double press cannot reach the handler in a browser; the guard is defensive, the new-draft double press is covered by an existing test.
  - `[low]` `reject` «Unchanged rerun says nothing» is a point-in-time negative check (Gap) — the helper is unit-tested and the changed case is positive-tested; a race, not a defect.
  - `[low]` `reject` Cap notice leaves «Lag nytt utkast» enabled (Edge) — a refused request is not counted (reservation fails), and the cap resets at midnight without a reload; by design.
  - `[false]` `reject` Held job orphaned if the dialog is dismissed another way (Edge) — the dialog closes only through accept or cancel (Esc is cancel).
  - `[false]` `reject` `failRegenerate(code: MessageKey)` is the wrong type (Blind) — `MessageKey` is the wire error-code union (`MESSAGE_KEYS`).
  - `[false]` `reject` AC4/AC1 timeout not exercised against the real server (Intent) — the 90 s limit and the Test-mode adapter belong to Stories 3.1, 3.4 and 3.5 and are tested there; this story changes the client only.
  - `[low]` `patch` Manual QA lacked rows for the notices, the notice reopen and the updated-score line (Blind) — rows 11 to 13 added.
  - `[low]` `reject` Sighted users get no signal on a score change (Blind) — accepted: the score itself changes on screen; recorded in QA row 13. A banner is forbidden by the spec.
  - Remaining 10 items (ref mirrors state, `failureBox` looseness, test ordering case, refresh test timing, message template duplication, `letterBusy` spread over five places, missing retry-with-cap e2e, bookkeeping, focus after «Avbryt» on a new draft, spec log blanks) — `reject`, low: no user-visible harm and the fix adds structure; `letterBusy` and `shownResult` must be refs (callbacks close over stale state).


## Design Notes

A silent rerun (`ANALYSIS_STALE`) is announced, not shown: the score on screen is already the new one, so a banner would say what the Student sees. The announcement joins the outcome line in the second region, since a second `announce` there replaces the first. The section failure boxes carry no `role="alert"` because a live region speaks the same failure (UX-DR39); the cap, Test mode and notice states were never alerts.

## Verification

**Commands:**
- `npx biome check`, `npm run typecheck`, `npm test` -- clean; Vitest 85 files, 960 passed, 2 expected fail; Playwright 182 passed
- Docker run not required: no change to package.json, lockfile, Dockerfile or `data/`

## Auto Run Result

Status: done. The failure design of Story 3.9 is finished in the client; the three carry-overs are handled (new draft: notice reopen, cap, Test mode, retry alert; failure heard once; stale rerun announced). Review: 2 medium patches and 1 low patch applied, 0 deferred, rest rejected with reasons above. Follow-up review recommended: false.
