---
title: 'Story 1.9: Enter the job ad, job title and employer on Søknad'
type: 'feature'
created: '2026-11-16'
baseline_commit: '2885ece2545b1e7f748b98ce3b738ff2c5611243'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The nav links to `/soknad`, but the page does not exist. A Student cannot give the app the Job ad, job title and employer, and nothing yet checks them or keeps them over a refresh.

**Approach:** Add Søknad with the form «Ny søknad»: Stillingstittel, Arbeidsgiver, Stillingsannonse and «Analyser og skriv utkast». One zod schema (`AnalysisInputs`, job fields only) is checked on the client now and by the server later. Inputs live in `ja.session.v1` through `client-session.ts`; a valid submit makes an `applicationId` and sends nothing. Covers FR-4, NFR-5, NFR-7, AD-6, AD-8, AD-16, UX-DR9, UX-DR18, UX-DR36.

## Boundaries & Constraints

**Always:**
- Branch `story/1.9-enter-job-ad-on-soknad` off `main`. Commits cite `1.9` and the IDs. Stage by explicit path.
- Every UI string in `messages.nb.ts`; exact texts from the story ACs and EXPERIENCE.md. `h1` «Ny søknad» is the page's only `h1`; title `Søknad – JobAssistant` via `pageTitle`.
- `application/contracts.ts` holds `analysisInputsSchema` (`jobAd` 200–15 000 chars, `jobTitle` and `employer` required, ≤ 200) and `normaliseNewlines` (CRLF to LF). It sends codes (`JOB_AD_LENGTH`, `JOB_TITLE_REQUIRED`, `EMPLOYER_REQUIRED`, `TOO_LONG`), never prose; the UI maps them to the nb texts. Required and the 200-char minimum are judged on the trimmed text; the counter counts the text as typed (after CRLF to LF).
- Validation on blur and on submit, never per keystroke. Errors tied with `aria-describedby`, `aria-invalid`; first invalid field gets focus on submit and the error is also announced with `announce("action", …)`. Input is never cleared; no `maxLength` and paste never blocked. The counter «N av 15 000 tegn» (space as thousands separator) is announced on blur of the ad field.
- `client-session.ts` is the only code that touches `sessionStorage`; key `ja.session.v1`, shape per AD-16 `{ v: 1, applicationId?, inputs: { jobAd?, jobTitle?, employer?, … } }`. Unknown keys (later `cvText`, `tone`, …) are kept when it writes. Every access is in try/catch; a missing, corrupt or blocked store reads as empty. The page renders empty first and fills from the store after mount; nothing is written before that read.
- `applicationId` is made with `crypto.randomUUID()` on a valid submit when none exists; it is removed when any job field changes, so a double submit reuses it. No request is sent and nothing visible changes on a valid submit.
- Text fields: reuse `TextField` and `Button`. A multi-line variant (`TextArea`, same label, hint, error, `aria-*` rules) is added beside `TextField` in `text-field.tsx`, sharing its parts.

**Never:**
- No CV field, Tone, «Bruk eksempelet» or credits list (1.10, 1.11, Epic 2, Epic 3). No file or URL import for the ad. No API route, no server action, no new dependency, no cookie or localStorage.
- No `cvText` in the schema (Story 1.10 extends it from `cv/contracts.ts`). No catalogue number (accounts are Epic 6). No edit to the gate, `config.ts`, `/api/*`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Empty submit | all fields empty | three errors, focus on Stillingstittel | inputs kept |
| Ad too short | 199 chars, blur | «Stillingsannonsen må være mellom 200 og 15 000 tegn.» | text kept |
| Ad too long | 15 001 chars | same error, counter reads «15 001 av 15 000 tegn» | text kept, not cut |
| Title over 200 | 201 chars | «Maks 200 tegn.» | text kept |
| Whitespace only | title `   ` | «Fyll inn stillingstittelen.» | kept |
| CRLF paste | `a\r\nb` | stored and counted as `a\nb` | N/A |
| Refresh | fields filled | same values back | corrupt store → empty form |
| Valid submit | all valid | `applicationId` in store, no request | N/A |
| Edit after submit | any job field | `applicationId` removed | N/A |
| Double submit | valid twice | one id, reused | N/A |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.9; spine AD-6, AD-8, AD-16; PRD §9.3; EXPERIENCE.md Key strings, Søknad focus order; DESIGN.md catalogue-heading. From Story 1.7 continuity: tests named by requirement ID, English docs, UI strings Norwegian.

- `src/shared/ui/components/text-field.tsx` -- `TextField` (label, hint, rust «Feil» strip, ids); add `TextArea` using the same parts. Reuse; do not change `TextField` behaviour (access form uses it)
- `src/shared/ui/components/button.tsx` -- reuse as is (`type="submit"`)
- `src/shared/ui/components/catalogue-heading.tsx` -- new: `h1` in `text-catalogue max-640:text-catalogue-mobile`, no number yet
- `src/shared/ui/client-session.ts` -- new: `readSession`, `writeSession(patch)`, key and zod schema; takes a `Storage` for tests
- `src/shared/ui/messages.nb.ts` -- add `application` texts (heading, labels, hint, counter, submit, errors); `nav.application` exists
- `src/shared/ui/announce.ts` -- reuse `announce("action", …)` (UX-DR19)
- `src/modules/application/contracts.ts` -- `analysisInputsSchema`, `normaliseNewlines`, `JOB_AD_MAX`, `TEXT_MAX`
- `src/modules/application/ui/application-form.tsx` -- client form; `ui/index.ts` exports it (the only import path for the page)
- `src/app/soknad/page.tsx` -- server page: metadata and `<ApplicationForm />`, `max-w-measure` like `tilgang`
- `src/shared/core/format-count.ts` + test -- new: `formatCount(n)` with a space as thousands separator, used for «N av 15 000 tegn»; Story 1.10 reuses it
- `e2e/application.spec.ts` -- new; `e2e/shell.spec.ts` is the pattern (axe helper, 1280 and 360 px)
- Vitest is node-only (no DOM): schema, newline and session logic are pure and tested in `*.test.ts`; the form is tested with Playwright

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/application/contracts.ts` + `contracts.test.ts` -- schema, codes, CRLF helper; every row of the matrix at the schema level -- FR-4, AD-6
- [x] `src/shared/ui/client-session.ts` + `client-session.test.ts` -- guarded read/write, key kept, unknown keys kept, corrupt/blocked store -- AD-16, NFR-5
- [x] `src/shared/ui/messages.nb.ts`, `components/text-field.tsx` (`TextArea`), `components/catalogue-heading.tsx` -- shared parts -- UX-DR9, UX-DR18
- [x] `src/modules/application/ui/{application-form.tsx, index.ts}`, `src/app/soknad/page.tsx` -- the form, errors, focus, announce, counter, session fill, `applicationId` -- FR-4, NFR-5, AD-8, UX-DR36
- [x] `e2e/application.spec.ts` -- render texts, wrong-input tour inputs 1, 4, 5 (kept text, error, focus), refresh keeps values, valid submit sends no `/api/` request and stores an id, no file input, axe clean at 1280 and 360 px, no horizontal scroll at 320 px -- NFR-5, NFR-2

**Acceptance Criteria:**
- Given Søknad with accounts off, when it renders, then the AC texts show and the nav marks «Søknad» as current
- Given a Windows-line-ending paste, when it enters the form, then it is stored as LF
- Given `npm test` and `docker compose run --rm --build test`, then Biome, typecheck, Vitest and Playwright pass

## Implementation Notes

- Implemented directly in the main session (no subagent), as in Stories 1.4 to 1.7. Verified on the host: Biome, typecheck, Vitest (180) and Playwright (51, 12 of them new) pass. `docker compose run --rm --build test` was not run: Docker Desktop was not running.
- `TextField` was split into a shared `Field` (label, hint, counter, error, ids) with `TextField` and `TextArea` on top; `TextField` markup is unchanged, and the Tilgangskode tests still pass.
- The e2e helper `openForm` waits for `networkidle` because the form fills from `sessionStorage` after mount; typing earlier would be overwritten.
- CRLF to LF is covered by a unit test only: a browser textarea already returns LF from `.value`, so an e2e check would prove nothing.
- Known limit of validate-on-blur (UX-DR9): leaving the ad with an error pushes the submit button down, so a mouse click that began on the button can miss. The first submit then needs a second click; keyboard use is unaffected. The e2e test presses Enter for that reason.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG; no gaps found). Routes: patch = fixed in this story; reject = no action. No intent_gap, bad_spec or defer findings.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | `readSession` returns one shared `EMPTY` object (BH, EC) | low | patch: now a fresh object per read |
| 2 | Errors raised on blur are not announced; only the count is (BH) | low | reject: UX-DR9 tie the error with `aria-describedby` and announce the count on blur; the error is read on return to the field, and submit announces the first error |
| 3 | A valid submit shows nothing (BH) | false | reject: the story says no analysis request and no visible step yet; recorded as a decision in the spec |
| 4 | `crypto.randomUUID()` unguarded outside secure contexts (BH, EC) | low | reject: `localhost` and HTTPS are secure contexts, which are the only two ways to run the app (Docker, Vercel); AD-8 names this call |
| 5 | Blocked or full storage: no id kept, each submit mints one (BH, EC) | low | reject: nothing is sent in this story, so no duplicate Application can result; the later submit story owns this |
| 6 | Full session read/parse/write per keystroke (BH) | low | reject: at most 15 KB of JSON; no measurable cost |
| 7 | Length counted in UTF-16 code units, an emoji counts as 2 (BH, VG, EC) | low | reject: rare input, off by a few characters at the limits; the server will use the same `length` |
| 8 | Schema does not normalise CRLF, so server and form could disagree (BH) | low | reject: a browser textarea always sends LF; only a non-browser caller could differ |
| 9 | Limits repeated as literals in `messages.nb.ts` (BH) | low | reject: the texts are fixed by the ACs and EXPERIENCE.md |
| 10 | Title and employer not trimmed; 200 characters plus a space gives `TOO_LONG`; same for an ad of 15 000 plus spaces (BH, EC) | low | reject: spec decision, «Maks 200 tegn.» is judged on the text as typed |
| 11 | Restore after mount: empty flash, typing or submitting before it runs is overwritten or shows errors (BH, EC) | low | reject: the window is the time between first paint and hydration of a small page; a lazy initial state would be wrong on the server render; e2e waits for it |
| 12 | Restored values are not validated until blur (BH) | false | reject: validation on blur and submit only (UX-DR9) |
| 13 | Counter has no over-limit style (BH) | low | reject: the error appears on blur and on submit |
| 14 | One bad stored field resets the session and the next write drops unknown keys (BH, EC) | low | reject: only foreign or hand-edited data; sessionStorage is per tab |
| 15 | Missing tests: component test, blocked storage e2e, CRLF e2e, `TextArea` test (BH) | low | reject: Vitest is node-only; blocked storage and CRLF are unit-tested; a textarea cannot hold CR in e2e |
| 16 | e2e uses `networkidle`, a literal key and a long id test (BH, EC) | low | reject: works and is stable in 3 runs; style only |
| 17 | `Field` render prop is indirect (BH) | low | reject: style; `TextField` markup is unchanged and covered by the Tilgangskode tests |
| 18 | `data/` untracked is unexplained (BH) | false | reject: not part of this change; it belongs to Story 2.1 |
| 19 | Zero-width characters pass the 200 minimum; newlines pass in single-line fields; `message` cast when a field is missing (EC) | low | reject: not reachable from the form; the server story builds on the schema |
| 20 | `formatCount` with non-integers; plain space may wrap mid-number (EC) | low | reject: only called with string lengths; a plain space is what the AC writes |
| 21 | Textarea can be dragged wider than the column (EC) | false | reject: Tailwind preflight sets `resize: vertical` (`node_modules/tailwindcss/preflight.css:308`) |
| 22 | A click on the button that starts when a blur error shifts it is lost (EC) | low | reject: a blur error means the form is invalid, so the submit would have failed anyway and the Student sees the error; recorded in Implementation Notes |
| 23 | Edit before restore leaves a stale id (EC, claim) | low | reject: same window as 11 |
| 24 | Repeated same error announcement untested (EC) | low | reject: `announce()` has its own tests (`announce.test.ts`) |

## Design Notes

- **Codes, not prose, in the schema.** The server will return the same codes (AD-7); one message map in the UI keeps «Maks 200 tegn.» in one place.
- **Why `applicationId` is dropped on change, not compared.** The spine says «until the inputs change»; removing the id on any edit is the simplest reading and cannot reuse an id for different inputs.

## Verification

**Commands:**
- `npm test` -- expected: Biome, typecheck, Vitest and Playwright pass
- `docker compose run --rm --build test` -- expected: passes

**Manual checks:**
- Keyboard walk of the form: skip link, nav, Stillingstittel, Arbeidsgiver, Stillingsannonse, submit. The wrong-input tour (inputs 1, 4, 5) is covered by Playwright here; the full tour and its `docs/qa/` row come with the later stories.
