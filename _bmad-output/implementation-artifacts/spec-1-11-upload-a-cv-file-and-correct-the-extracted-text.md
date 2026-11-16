---
title: 'Story 1.11: Upload a CV file and correct the extracted text'
type: 'feature'
created: '2026-11-16'
baseline_commit: 'afd69005aaa6a9e69a6482b1b8550eb64404bf0e'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The CV can only be pasted. Students have the CV as a PDF or text file, and retyping it is slow and error-prone.

**Approach:** Add the shared file picker above the CV field. A valid .pdf or .txt (≤ 2 MB) goes to `POST /api/cv/extract`, which extracts in memory and returns `{ text, noText }`. The text fills the CV field as an unconfirmed edit, to be corrected and confirmed as in Story 1.10. A PDF with no text shows an alert and asks for pasted text. Covers FR-1, FR-3, FR-23 (file discarded), NFR-5, NFR-7, UX-DR11, UX-DR15 (alert).

## Boundaries & Constraints

**Always:**
- Branch `story/1.11-upload-cv-file` off `main`. Commits cite `1.11` and the IDs. Stage by explicit path.
- Every UI string in `messages.nb.ts`, from the ACs and EXPERIENCE.md: «Velg fil», «Velg en annen fil», input name «Velg fil, PDF eller TXT, maks 2 MB», «Bare PDF- og TXT-filer støttes.», «Filen er for stor.», «Henter ut teksten fra CV-en …», the scanned-PDF alert, hint «Lim inn teksten her. Minst 200 tegn.». No other new strings.
- `cv/contracts.ts` holds `CV_FILE_MAX_BYTES` (2 × 1024 × 1024), the allowed extensions, `cvFileError(name, size)` (code `FILE_TYPE` or `FILE_TOO_LARGE`, type judged first, by extension, case-insensitive) and the response schema `{ text, noText }`. The client and the route use the same check. The route answers a wrong file with `INVALID_INPUT`, field `file.type` or `file.size`, and a PDF unpdf cannot open as `file.type`.
- `cv/server/extract.ts` works on bytes in memory: a PDF must start with `%PDF-`; PDF text from unpdf with pages merged, TXT as UTF-8 with a BOM removed; CRLF and CR become LF. `noText` is true when the trimmed text is empty, and `text` is then `""`. Nothing is written to disk or the database, nothing from the file is logged, the file is never served back. `cv/index.ts` (`import 'server-only'`) exports the extractor for the route.
- The route is `handle("/api/cv/extract", …)`, reads `multipart/form-data` field `file`, rejects a `Content-Length` above the limit plus 64 KB before reading the body, and checks type and size again on the bytes.
- `callApi` accepts a `FormData` body (no JSON header, no stringify); the 15 s timeout and the envelope are unchanged.
- File picker (`shared/ui/components/file-picker.tsx`): one tab stop, a native `<input type="file" accept=".pdf,.txt">` visually hidden (not `display:none`) with the accessible name from messages, the visible button text as its `<label>` styled as `button-secondary`, the amber ring on the label via `:has(input:focus-visible)`, rust border on error. It shows the file name and size in mono. It reports the chosen file and resets the input value, so the same file can be chosen again.
- Alert (`shared/ui/components/alert.tsx`): rust outline on alert-ground, «Feil» strip, `role="alert"`. The inline alert in `tilgang/access-form.tsx` moves to it; looks and tests unchanged.
- Type or size errors are judged in the browser before any request and shown under the picker, tied to the input with `aria-describedby`. The CV text is not touched. A network or other failure shows the existing `messages.networkFailure` alert; focus stays on the picker.
- While extracting, the file name shows with «Henter ut teksten fra CV-en …». The newest choice wins; an answer to an older choice is ignored.
- Success: the text, normalised, replaces the field as an edit through the form's `changeCv` path (confirmation and `applicationId` cleared, `cvDraft` stored), the length error is judged at once, and focus moves to the CV field. Replacing text already typed is intended.
- No text: the alert shows, the picker border is rust, the button reads «Velg en annen fil», the CV field shows the hint and takes focus. Typed text stays. The state clears on the next file choice. It is never stored.
- Focus order: «Velg fil» → CV-tekst → «Bekreft CV-teksten» → Stillingstittel → … (EXPERIENCE.md). The picker shows with the open CV slot, not on the collapsed confirmed line.
- The file name and file are never stored: not in `ja.session.v1`, not on the server.

**Never:**
- No file or URL import for the job ad. No Profil, no OCR, no .docx, no drag and drop. No change to the gate, `config.ts`, or CV confirmation rules from 1.10. No new dependency.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Text PDF | valid small PDF | field filled, unconfirmed, focus in field | N/A |
| TXT, CRLF | `a\r\nb` file | field holds `a\nb` | N/A |
| Scanned PDF | PDF without text | alert, rust border, «Velg en annen fil», hint, focus in field, no text change | typed text kept |
| Wrong type | `.docx` | «Bare PDF- og TXT-filer støttes.», no request | CV field untouched |
| Too large | 2 MB + 1 byte | «Filen er for stor.», no request | CV field untouched |
| Server recheck | wrong type or size posted | 400 `INVALID_INPUT`, field `file.type`/`file.size` | nothing stored or logged |
| Broken PDF | bytes not a PDF | `INVALID_INPUT`, `file.type` | N/A |
| Edit after fill | confirmed text, new file | confirmation and `applicationId` cleared | N/A |
| Network down | request fails | network-failure alert | text kept |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.11; spine route inventory; EXPERIENCE.md Key strings (Extracting, Scanned PDF), Component Patterns (File picker, Scanned PDF), Focus order; DESIGN.md `file-picker`, `alert`. From Story 1.10: the form owns CV state and session writes; `CvInput` owns open/closed and focus; `mousedown` guard on «Bekreft»; e2e `openForm` and `confirmCv`.

- `src/modules/cv/contracts.ts` + test -- add file limits, `cvFileError`, response schema
- `src/modules/cv/server/extract.ts` + test, `src/modules/cv/index.ts` -- in-memory extraction (unpdf 2.1.0 `getDocumentProxy` + `extractText`, as in `scripts/extract-fixture-cv.ts`)
- `src/app/api/cv/extract/route.ts` + `route.test.ts` -- `handle()`, multipart, rechecks; pattern of `api/access/route.ts`; `dynamic = "force-dynamic"`
- `src/shared/ui/api-client.ts` + test -- FormData body
- `src/shared/ui/components/{file-picker.tsx, alert.tsx}`; `src/app/tilgang/access-form.tsx` -- new components; use Alert
- `src/shared/ui/messages.nb.ts` -- `cv.file*` texts
- `src/modules/cv/ui/cv-input.tsx` -- picker above the open field, extraction state, hint; new prop `onExtracted(text)`
- `src/modules/application/ui/application-form.tsx` -- `onExtracted`: `changeCv` + length error
- `e2e/files/` -- small fictional `text-cv.pdf`, `scanned.pdf`, `cv.docx`; the over-2 MB file is built in the test
- `e2e/application.spec.ts` -- replace "offers no file upload" (the ad still has none); update the focus-order test
- Check `next build` bundles unpdf in the route; if not, add it to `serverExternalPackages` in `next.config.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/cv/contracts.ts` + test -- limits, `cvFileError`, schema -- FR-1
- [x] `src/modules/cv/server/extract.ts`, `index.ts` + test -- extraction, `noText`, CRLF, broken PDF -- FR-1, FR-23
- [x] `src/app/api/cv/extract/route.ts` + test -- route, rechecks, nothing written -- FR-1, NFR-7
- [x] `src/shared/ui/api-client.ts` + test -- FormData -- AD-7
- [x] `src/shared/ui/components/{file-picker.tsx, alert.tsx}`, `access-form.tsx`, `messages.nb.ts` -- shared UI -- UX-DR11, UX-DR15
- [x] `src/modules/cv/ui/cv-input.tsx`, `application-form.tsx` -- wiring, focus, states -- FR-3, NFR-5
- [x] `e2e/files/*`, `e2e/application.spec.ts` -- picker render and one tab stop, wrong-input tour inputs 2 and 3, text PDF fills and needs confirmation, scanned PDF state, focus order, no file name in the session, axe at 1280 and 360 px, no scroll at 320 px -- FR-1, NFR-2, NFR-5

**Acceptance Criteria:**
- Given a valid PDF or TXT, when it is chosen, then its text fills the CV field and cannot be used until confirmed
- Given the scanned-PDF state, when the Student chooses another file, then the alert, hint and rust border clear
- Given `npm test`, then Biome, typecheck, Vitest and Playwright pass; run `docker compose run --rm --build test` too if Docker is available

## Implementation Notes

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; reject = no action. No intent_gap, bad_spec or defer findings.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | A late answer is not ignored after the component unmounts, so `onExtracted` can rewrite the session (EC) | low | patch: unmount cleanup bumps `latestChoice` |
| 2 | A rejected file is not announced; focus stays on the input and `aria-describedby` is read only on refocus (EC) | medium | patch: `announce("action", …)` on every file error (UX-DR19, as the form does) |
| 3 | A long file name without break points (underscores) overflows at 320 px (EC) | medium | patch: name wraps anywhere; e2e at 320 px with an unbroken name |
| 4 | The BOM regex after `TextDecoder` is redundant and holds an invisible character (BH) | low | patch: removed; BOM test kept |
| 5 | The confirm-time picker reset and the discarded late answer have no test (VG) | medium | patch: two e2e tests; (a) checked to fail without `latestChoice.current++` |
| 6 | A missing or invalid `Content-Length` skips the pre-read guard, so `formData()` buffers the body (BH, EC, VG) | low | reject: the spec asks for a `Content-Length` check and browsers always send it for FormData; a streaming limit or a required header adds guards and breaks direct `Request` tests; the 2 MB size check still runs on the file |
| 7 | The second size check on `bytes.length` is redundant (BH, VG) | low | reject: the spec asks to check again on the bytes; harmless |
| 8 | Windows-1252 or UTF-16 TXT decodes with U+FFFD (BH, EC) | low | reject: the AC says UTF-8; the Student reviews and corrects the text (FR-3). A decoding fallback is a later improvement |
| 9 | An empty TXT shows the scanned-PDF alert (BH, EC) | low | reject: rare, and a TXT-specific text is a new string the spec rules out |
| 10 | An encrypted PDF, junk before `%PDF-` or a zero-byte PDF reports a wrong type (BH, EC) | low | reject: decided in the spec (unreadable PDF is `file.type`) |
| 11 | A 2 MB PDF with thousands of pages or heavy content has no page or time limit (BH, EC) | low | reject: abuse case on a closed app; limits add guards and a new error path |
| 12 | Every non-validation failure shows the network-failure alert (BH, EC) | low | reject: the spec says network or other failure shows that alert; `ACCESS_REQUIRED` mid-session is the open point from Story 1.6 |
| 13 | A late answer overwrites text typed during extraction and pulls focus (BH, EC) | low | reject: «replacing text already typed is intended» and the newest choice wins (spec) |
| 14 | The scanned state stays after valid text is pasted (EC) | low | reject: spec says it clears on the next file choice (it also clears on confirm) |
| 15 | The input name does not contain «Velg en annen fil» (WCAG 2.5.3) and hardcodes 2 MB (BH) | low | reject: the spec and UX-DR11 fix the name |
| 16 | `aria-invalid` missing in the scanned case, status line not in `aria-describedby`, success not announced, earlier request not aborted (BH) | low | reject: no new strings allowed; the alert is `role="alert"`; the wasted request is small |
| 17 | `messages.fileSize` is an extra string (EC) | low | reject: the file picker shows name and size (DESIGN.md); the rule is about wording |
| 18 | Brittle e2e details (`waitForTimeout(500)`, RGB constants, unit tests reading `e2e/files`) and no component tests for `CvInput` (BH, VG) | low | reject: the tests passed in two full runs; Vitest is node-only by design (Story 1.10) |
| 19 | No `unpdf` dependency in the diff (BH) | false | `package.json` already pins `unpdf` 2.1.0 since Story 1.1 |

## Design Notes

- **Extracted text is an edit, not a confirmation.** It goes through the same path as typing, so FR-3 holds with no special case.
- **Type by extension, then bytes.** Browsers report empty or wrong MIME types, so the extension decides; a PDF must also start with `%PDF-`.
- **Proxy body limit.** Next buffers about 10 MB for `proxy.ts`; the 2 MB limit is below that.

## Verification

**Commands:**
- `npm test` -- expected: Biome, typecheck, Vitest and Playwright pass
- `docker compose run --rm --build test` -- expected: passes

**Manual checks:**
- Keyboard walk: «Velg fil» takes focus with the amber ring on its label, Enter or Space opens the chooser. Screen-reader check that the input is named «Velg fil, PDF eller TXT, maks 2 MB» and the alert is read.
