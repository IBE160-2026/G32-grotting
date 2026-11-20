---
title: 'Story 3.8: Copy, download and regenerate the Letter'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '708bea2cd861d017575872a0f9529d986c842786'
review_loop_iteration: 0
followup_review_recommended: false
deferred:
  - summary: >-
      A new draft answered with AI_NOTICE_REQUIRED shows the plain failure alert instead of re-opening the AI notice.
    evidence: |-
      Rare: the notice was accepted earlier in the session and only a mid-session config change causes it. Story 3.9 owns the full failure design.
    location: >-
      src/modules/application/ui/application-form.tsx (runLetter, again branch)
    severity: low
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** The Letter is on screen (Story 3.7) but read-only with no way out of the app: no copy, no Word file, no new draft.

**Approach:** An action stack under the Letter: «Kopier» (primary, a new shared `copy-button`), «Last ned (.docx)» (built in the browser with the `docx` package, loaded on click) and «Lag nytt utkast» (a second Letter request with the form's Tone and `previousRev`, old Letter kept on screen until the new one arrives).

## Boundaries & Constraints

**Always:**
- Copy puts `renderLetter(text, null)` as plain text on the clipboard; label «Kopiert» for 1.8 s; «Kopiert til utklippstavlen.» in the second live region (`action`); focus stays on the button. A blocked clipboard selects the Letter text and shows and announces «Kopier med Ctrl+C, eller hold inne på mobil.».
- The .docx is built from `renderLetter(text, null)` in the browser and saved under `letterFileName({ employer, year }, null)` (ASCII only).
- «Lag nytt utkast» is busy while it runs, the old Letter stays, the progress line returns («Skriver et nytt utkast …»), exactly one Letter request is sent with the form's Tone and `previousRev` = the rev shown. Success replaces the Letter and announces «Det nye utkastet er klart.» (second region); failure keeps the old Letter, shows an alert with «Prøv igjen» and announces «Det nye utkastet kunne ikke lages. Det forrige brevet står fortsatt.».
- Test mode: the Cached Letter for the Tone comes back again. Actions go full width at 640 px or less. All text from `messages.nb.ts`. No live AI request in any test.

**Never:**
- No Letter flags (3.10), no full failure design (3.9), no Hosted change, no AI_*, FEATURE_* or ENCRYPTION_KEY change.

</intent-contract>

## Code Map

- `src/shared/ui/components/copy-button.tsx`, `src/shared/ui/clipboard.ts` -- new shared copy button; reused later by suggestions and Historikk.
- `src/modules/letter/ui/{build-docx.ts,download-letter.ts,letter-actions.tsx}` -- new; `letter-section.tsx`, `letter-view.tsx`, `request-letter.ts`, `index.ts` -- extended (`previousRev`, article ref, regenerating state).
- `src/modules/application/ui/application-form.tsx` -- `runLetter(job, again)`, `regen` state, «Lag nytt utkast» handler.
- `src/shared/ui/messages.nb.ts` -- texts. `package.json`, `package-lock.json` -- `docx`, dev `fflate` (unit-test unzip).
- Read-only: `letter/core/{render-letter,file-name}.ts`, `announce.ts`, the letter route (`rev = previousRev + 1`).
- Tests: unit next to files; `e2e/letter-actions.spec.ts`; `docs/qa/letter-manual-checks.md`.

## Tasks & Acceptance

- [x] `package.json`, lockfile -- add `docx`; Docker test image stays in sync (`docker compose run --rm --build test` is the done criterion)
- [x] `clipboard.ts`, `copy-button.tsx`, messages -- shared copy button with tests
- [x] `build-docx.ts`, `download-letter.ts` -- .docx builder with unit test that unzips and reads the text
- [x] `letter-actions.tsx`, `letter-section.tsx`, `letter-view.tsx`, `request-letter.ts`, `application-form.tsx` -- action stack and regeneration
- [x] `e2e/letter-actions.spec.ts`, `docs/qa/letter-manual-checks.md`

**Acceptance Criteria:** Given the ACs of Story 3.8 in `epics.md`, when `npm test` and the Docker test run, then each is covered by a passing test, and the manual rows that need a person are listed as open.

## Spec Change Log

## Verification

**Commands:** `npx biome check`, `npm run typecheck`, `npx vitest run`, `npx playwright test`, `docker compose run --rm --build test` -- expected: pass

## Review Triage Log

### 2026-11-20 - Review pass
- verdicts: about 35 raw findings across four layers (Blind Hunter 10, Edge Case Hunter 11, Verification Gap 3 plus 1 other, Intent Alignment descriptive), grouped by root cause into the 16 rows below: medium 3, low 11, false 2 (6 patched, 1 deferred, 9 rejected)
- findings:
  - `[medium]` `[patch]` Double press before React renders the busy button could send two Letter requests (two cap units) - found by Blind Hunter and Edge Case Hunter. `regenerate()` now guards with a ref, reset on success, failure and «Endre annonsen».
  - `[medium]` `[patch]` Download failure path (alert, announcement, button not stuck busy) had no test - found by Verification Gap. e2e makes `URL.createObjectURL` throw and asserts all three.
  - `[medium]` `[patch]` Regenerate combined with `ANALYSIS_STALE` untested - found by Verification Gap. e2e stubs one stale answer and asserts the rerun, the new Letter and `previousRev` kept on the resend.
  - `[low]` `[patch]` The first Letter's delayed «Søknadsbrevet er klart.» line was cancelled when «Lag nytt utkast» ran inside the 1.5 s gap - `runLetter` clears the timer only for a first draft.
  - `[low]` `[patch]` The «Kopier med Ctrl+C» notice, «Kopiert» and the download alert stayed on after a new Letter - copy state is now keyed to its text and the download failure to the Letter's rev (focus survives, since nothing is remounted).
  - `[low]` `[patch]` «Kopiert» for 1.8 s was only asserted as a constant - e2e uses `page.clock`: still «Kopiert» at 1.7 s, «Kopier» at 1.9 s.
  - `[low]` `[defer]` New draft answered with `AI_NOTICE_REQUIRED` shows the plain alert, not the notice - rare, already accepted in this session, owned by Story 3.9 (see `deferred`).
  - `[low]` `[reject]` Regenerate ignores the error code (cap, retryable) - the Story 3.8 AC specifies one failure design for it (alert, «Prøv igjen»); the «Dagens grense» and retryable variants are Story 3.9.
  - `[low]` `[reject]` Tone of «Lag nytt utkast» may differ from the Tone shown - not reachable: the Tone radio is not on the page while a Letter is shown, and «Endre annonsen» drops the Letter (Intent Alignment confirmed).
  - `[low]` `[reject]` Alert plus live line speak the failure twice, for regenerate and download - specified by the ACs (alert and announcement) and accepted in the Story 3.7 triage.
  - `[low]` `[reject]` No success announcement for a download - the AC gives none; the browser's own download UI reports it.
  - `[low]` `[reject]` `writeText` that never settles, iOS or webview downloads that ignore a programmatic anchor, XML-illegal control characters or empty text in the .docx, `retry()` focusing the button when `onRegenerate` returned early - each needs a situation not shown to be reachable (the server guarantees non-empty text, `retry()` only shows with a Letter and no request running), and the fix adds branches.
  - `[low]` `[reject]` Letter hint, docx `creator` and `title` outside `messages.nb.ts`, speculative `CopyButton` props, rendering duplicated in three places, `waitForTimeout(500)`, brittle class-string assertions, no bundle-size test - cosmetic, or the props are the spec's reuse requirement («reused by suggestions and Historikk»).
  - `[low]` `[reject]` `requestLetter` may send two requests on a stale rerun - the AC's «one new request» is one user action; the stale resend is the AD-6 behaviour and is now tested.
  - `[false]` `[reject]` Dependencies unchecked - `docx@9.16.0` and `fflate@0.8.3` exist, install, and the lockfile is in the commit; the Docker test run passed.
  - `[false]` `[reject]` «Kopier» copy text may differ from the screen - both use `renderLetter(text, null)`, and the e2e compares the clipboard to the cached Letter text.

## Auto Run Result

Status: done. Built in-line by the main agent (as in Story 3.7, the build agent already held the context); the four review layers ran as subagents (the harness ran them in the background; results were triaged only after all four had reported).

- Summary: an action stack under the Letter: «Kopier» (primary, new shared `copy-button`, plain text via `renderLetter(text, null)`, «Kopiert» 1.8 s, second live region, blocked-clipboard selection and notice), «Last ned (.docx)» (`docx` loaded on click, built in the browser, saved under `letterFileName`), «Lag nytt utkast» (busy, old Letter kept, «Skriver et nytt utkast …», one request with the form's Tone and `previousRev`, outcomes announced in the second region, failure alert with «Prøv igjen»). Full width at 640 px or less.
- Files: `src/shared/ui/{clipboard.ts,components/copy-button.tsx}`, `src/modules/letter/ui/{build-docx,download-letter,letter-actions,letter-section,letter-view,request-letter,index}`, `application-form.tsx`, `messages.nb.ts`, `package.json`, `package-lock.json` (`docx`, dev `fflate` for tests), `e2e/letter-actions.spec.ts`, `docs/qa/letter-manual-checks.md` (rows 4 to 7).
- Review: 3 medium and 3 low patches, 1 deferred, the rest rejected with reasons above.
- Follow-up review recommended: false.
- Verification: `npx biome check`, `npm run typecheck`, `npx vitest run` (85 files, 956 passed, 2 expected fail), `docker compose run --rm --build test` passed on the final code (exit 0; vitest 85 files, 955 passed, 2 expected fail, 1 skipped; Playwright 169 passed). Locally the three new e2e additions pass (11 in `letter-actions.spec.ts`).
- Residual risks: manual rows 4 to 7 in `docs/qa/letter-manual-checks.md` are open (screen reader, Word and LibreOffice, mobile clipboard); a new draft refused with `AI_NOTICE_REQUIRED` shows the alert, not the notice (deferred, Story 3.9).
