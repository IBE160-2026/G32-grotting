---
title: 'Story 1.10: Paste and confirm the CV text on Søknad'
type: 'feature'
created: '2026-11-16'
baseline_commit: '9dff2a63649c9aa8eacae1392bf8b7be629934c7'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Søknad has the job fields but no CV. The analysis must only ever use CV text the Student has pasted, read and approved, and nothing yet enforces that or keeps the text over a refresh.

**Approach:** Add the CV slot above the job fields: the field «CV-tekst» (DM Mono), a counter and «Bekreft CV-teksten». Confirming collapses it to «CV-tekst bekreftet · N tegn» with a button to reopen; any edit clears the confirmation; submit is blocked until it is confirmed. The text lives in `ja.session.v1` only. `cvText` joins `AnalysisInputs` from `cv/contracts.ts`. Covers FR-2, FR-3, NFR-5, AD-6, AD-16, UX-DR9, UX-DR26, UX-DR36.

## Boundaries & Constraints

**Always:**
- Branch `story/1.10-paste-confirm-cv-text` off `main`. Commits cite `1.10` and the IDs. Stage by explicit path.
- Every UI string in `messages.nb.ts`. Texts from the story ACs and EXPERIENCE.md: «CV-tekst», «Bekreft CV-teksten», «CV-tekst bekreftet · 3 412 tegn», «CV-teksten må være mellom 200 og 20 000 tegn.», «Bekreft CV-teksten før du går videre.». The reopen button reads «Endre CV-teksten» (not in the UX spec; decided here). `N av 20 000 tegn` uses the same builder as the ad counter, hoisted to `messages.counter`.
- `cv/contracts.ts` holds `CV_MIN` 200, `CV_MAX` 20 000, `cvTextSchema` and the codes `CV_LENGTH`, `CV_NOT_CONFIRMED` (codes, never prose). The minimum is judged on the trimmed text, the maximum and the counter on the text as typed (CRLF to LF first). `application/contracts.ts` adds `cvText` to `analysisInputsSchema` from `cv/contracts` and renames `JobInput*`/`jobInputErrors` to `Input*`/`inputErrors` to cover all four fields.
- State per AD-16: `inputs.cvDraft` is the text as typed, `inputs.cvText` the confirmed text. Confirm writes both; any edit writes `cvDraft` and removes `cvText`. A valid confirmed state means `cvText === cvDraft`. On load the CV is confirmed only if the stored `cvText` is valid and equals the draft. Nothing goes to the server or disk.
- Validation on blur, on «Bekreft» and on submit, never per keystroke; error tied with `aria-describedby`, `aria-invalid`; input never cleared, no `maxLength`, paste never blocked. Pressing «Bekreft» on invalid text shows `CV_LENGTH` and keeps focus in the field. Submit with unconfirmed valid text shows `CV_NOT_CONFIRMED` at the CV field, focuses it, sends nothing. Errors are also announced with `announce("action", …)`.
- Focus order: CV-tekst → «Bekreft CV-teksten» → Stillingstittel → Arbeidsgiver → Stillingsannonse → «Analyser og skriv utkast» (the «Velg fil» stop arrives in 1.11). First invalid field on submit gets focus, CV first. After «Bekreft» focus moves to «Endre CV-teksten»; on reopen it moves to the field. Confirming announces the confirmed line.
- «Bekreft» is `type="button"`; Enter in the field only adds a line. Reopening alone does not clear the confirmation; an edit does. Any CV edit removes `applicationId` (AD-8).
- `cv/ui/index.ts` is the only export the form imports. The CV field is a controlled `TextArea` with `font-mono text-mono-cv`; the form owns state and session writes.

**Never:**
- No file picker, alert, extraction or `/api/cv/*` (Story 1.11). No hint about scanned PDFs. No Profil, no accounts branch, no «Bruk eksempelet», Tone or credits.
- No server action, no new dependency, no cookie or localStorage, no edit to the gate, `config.ts` or `/api/*`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Too short | 199 chars (trimmed), blur or «Bekreft» | «CV-teksten må være mellom 200 og 20 000 tegn.» | text kept, not confirmed |
| Too long | 20 001 chars | same error, counter «20 001 av 20 000 tegn» | text kept, not cut |
| Confirm | 3 412 valid chars, «Bekreft» | collapsed «CV-tekst bekreftet · 3 412 tegn», `cvText` stored | N/A |
| Edit after confirm | reopen, type | confirmation gone, `cvText` removed, `applicationId` removed | N/A |
| Submit unconfirmed | valid text, not confirmed | «Bekreft CV-teksten før du går videre.», focus in CV field, no id made | job errors also shown |
| Submit empty | all empty | CV length error first, focus in CV field | inputs kept |
| Refresh confirmed | confirmed, reload | collapsed line back from store | corrupt store → empty |
| Refresh draft | typed, not confirmed, reload | text back, not confirmed | N/A |
| Re-confirm | edit, confirm again | held `cvText` is the edited text | N/A |
| CRLF paste | `a\r\nb` | stored and counted as `a\nb` | N/A |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.10; spine AD-6, AD-16; EXPERIENCE.md Key strings (CV rows), Component Patterns (CV disclosure), Accessibility Floor (Focus order); DESIGN.md `text-mono-cv`. From Story 1.9: schema codes not prose, `TextArea` with `counter`, `formatCount`, session read after mount, e2e `openForm` waits for `networkidle`, Enter instead of click when blur shifts the button.

- `src/modules/cv/contracts.ts` + test -- new: limits, `cvTextSchema`, codes, `cvTextError`, `restoreCv(inputs)`
- `src/modules/cv/ui/{cv-input.tsx, index.ts}` -- new: controlled slot (field + counter + «Bekreft», collapsed line + reopen), owns only the open/closed state and focus moves
- `src/modules/application/contracts.ts` + test -- add `cvText`, rename types and `inputErrors`
- `src/modules/application/ui/application-form.tsx` -- add CV state, session restore and writes, submit gate, focus order; import `CvInput` from `@/modules/cv/ui`
- `src/shared/ui/client-session.ts` + test -- add `cvText?`, `cvDraft?` to the inputs schema; keep removal through `undefined`
- `src/shared/ui/messages.nb.ts` -- add `cv` texts; hoist `application.counter` to `counter`
- `src/shared/ui/components/text-field.tsx`, `button.tsx` -- reuse as is
- `src/app/soknad/page.tsx` -- drop the «arrives with Story 1.10» comment
- `e2e/application.spec.ts` -- confirm the CV first in tests that need a valid or focus-ordered form; add CV tests
- Vitest is node-only: schema, restore and session logic are unit-tested; the slot is tested with Playwright

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/cv/contracts.ts` + `contracts.test.ts` -- schema, codes, `restoreCv`, matrix rows at logic level -- FR-2, FR-3, AD-6
- [x] `src/shared/ui/client-session.ts` + test -- `cvText`/`cvDraft` kept, removed by `undefined`, unknown keys kept -- AD-16, NFR-5
- [x] `src/modules/application/contracts.ts` + test -- `cvText` in `AnalysisInputs`, renames -- AD-6
- [x] `src/shared/ui/messages.nb.ts`, `src/modules/cv/ui/{cv-input.tsx, index.ts}` -- texts and the slot -- UX-DR9, UX-DR26
- [x] `src/modules/application/ui/application-form.tsx`, `src/app/soknad/page.tsx` -- state, session, submit gate, focus, announce -- FR-3, NFR-5, UX-DR36
- [x] `e2e/application.spec.ts` -- render texts and order, CV length errors kept, confirm collapses to «3 412 tegn», reopen, edit clears, submit blocked without confirmation with focus and message, refresh keeps confirmed and draft, edit then re-confirm holds the edited text, no `/api/` request, axe at 1280 and 360 px, no scroll at 320 px -- FR-3, NFR-2

**Acceptance Criteria:**
- Given Søknad with accounts off, when it renders, then the CV slot sits above the job fields with «CV-tekst» in DM Mono, «0 av 20 000 tegn» and «Bekreft CV-teksten»
- Given confirmed CV text and a page refresh, then the line comes back from `ja.session.v1` and no request is sent
- Given `npm test` and `docker compose run --rm --build test`, then Biome, typecheck, Vitest and Playwright pass

## Implementation Notes

- Implemented directly in the main session (no subagent), as in Stories 1.4 to 1.9. Verified on the host: Biome, typecheck, Vitest (217) and Playwright (69, 15 of them new or changed in `application.spec.ts`) pass. `docker compose run --rm --build test` was not run in this session.
- «Bekreft CV-teksten» cancels `mousedown`, so the field does not blur before the click. Without it, fixing a too-short CV and clicking the button lost the first click: the blur cleared the error, the button moved up, and the click missed (the limit noted in Story 1.9).
- The «Velg fil» tab stop is not in the focus order yet (Story 1.11). The CRLF rule is unit-tested in `application/contracts.test.ts`; a browser textarea cannot hold CR, so there is no e2e check for it.
- `normaliseNewlines` stays in `application/contracts.ts`; `CvInput` passes the raw value up and the form normalises it, because `cv` must not import `application`.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; reject = no action. No intent_gap, bad_spec or defer findings.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | No test clicks «Bekreft» while a CV error is on screen, so the `mousedown` guard can regress unseen (VG) | medium | patch: new e2e test «confirms on the first click after fixing a CV error»; it fails with the guard removed (checked) and passes with it |
| 2 | `blurCv` comment says the missing-confirmation message stays «until the Student confirms or edits», but an edit does not clear it (BH, EC, VG) | low | patch: comment corrected. The message stays true after an edit, because the text is still unconfirmed |
| 3 | 320 px test does not cover the collapsed confirmed row (BH) | low | patch: the test now confirms the CV before measuring overflow |
| 4 | A stale `cvText` stays in the store when restore finds it invalid or different from the draft (BH, EC) | low | reject: edit and confirm write both keys together, so only a hand-edited store gets there; the later submit story reads the confirmed state, and a guard would add a write on load |
| 5 | `cvText` alone, without `cvDraft`, restores as confirmed (EC) | low | reject: the same hand-edited store; the draft falls back to `cvText`, and `contracts.test.ts` pins this on purpose |
| 6 | Blur-time CV errors are not announced (BH, EC) | low | reject: same decision as Story 1.9 triage #2. The error is tied with `aria-describedby` and read on return to the field; «Bekreft» and submit announce it (UX-DR9) |
| 7 | Full storage or a huge paste: `writeSession` swallows the failure, so «bekreftet» may not survive a refresh (BH, EC) | low | reject: same as Story 1.9 triage #5. Only text of 20 000 characters or less can be confirmed, so the confirm write is small; nothing is sent |
| 8 | `confirmCv` writes without the `restored` guard (EC) | low | reject: same window as Story 1.9 triage #11, between first paint and hydration |
| 9 | No hint on the CV field (BH) | low | reject: the spec says no scanned-PDF hint; hint texts for the CV field come with Story 1.11 |
| 10 | After «Endre CV-teksten» nothing says the text is still confirmed (BH) | low | reject: decided in Design Notes (reopen is not an edit); submit is correct because the text is confirmed |
| 11 | Characters counted as UTF-16 code units (BH) | low | reject: same as Story 1.9 triage #7 |
| 12 | Newline normalisation is left to the caller; `restoreCv` does not normalise (BH) | low | reject: `cv` must not import `application`; Story 1.11 normalises at extraction (its AC) and the form normalises every edit |
| 13 | `InputErrorCode` is wider than the schema emits; the CV rule sits in schema and `cvSubmitError` (BH) | low | reject: `cvSubmitError` calls the same schema, so the length rule has one source; `CV_NOT_CONFIRMED` is documented in the type |
| 14 | Spec status, route and sprint-status disagree; Docker test not run; Triage Log empty; reopen text in the frozen block (BH) | false | reject: sprint sync is step 5; the route and the unrun Docker test are recorded as in Story 1.9; the log is this table; the text was decided at planning, before approval |
| 15 | Missing e2e: Enter in the CV field, confirm above 20 000, job errors shown with an unconfirmed CV, realistic CV with newlines (BH, VG) | low | reject: Enter in a textarea is the browser default; length is unit-tested and one code path; the matrix row needs no job-field error to prove the gate |

## Design Notes

- **Two keys, one invariant.** `cvDraft` keeps what the Student typed so a refresh loses nothing; `cvText` exists only while it equals the draft and has been confirmed. Submit and later analysis read `cvText`, so edited-but-unconfirmed text can never be used (FR-3).
- **Reopen is not an edit.** Only a changed value clears the confirmation, matching «any edit».

## Verification

**Commands:**
- `npm test` -- expected: Biome, typecheck, Vitest and Playwright pass
- `docker compose run --rm --build test` -- expected: passes

**Manual checks:**
- Keyboard walk: skip link, nav, CV-tekst, «Bekreft CV-teksten», Stillingstittel, Arbeidsgiver, Stillingsannonse, submit. Screen-reader check that confirm announces the line and focus lands on «Endre CV-teksten». Add a row to `docs/qa/` only if the sprint-level QA doc exists by then.
