# Tone and Letter on Søknad: manual checks (FR-9, FR-10)

Story 3.7 (FR-9, FR-10, NFR-2, NFR-4, UX-DR25, UX-DR28, UX-DR30). The automated tests prove the Tone radio group (fieldset, «Formell» preselected, arrow keys, kept in `ja.session.v1`), phase 2 after the score (request body with inputs, fingerprint, Tone and consent, progress line, «Søknadsbrev» placeholder with `aria-busy`), the read-only Letter view, `ANALYSIS_STALE` handling, the AI_NOTICE_REQUIRED re-prompt, the trace limits and axe at 1280 px and 360 px (`e2e/letter.spec.ts`, `e2e/ai-notice.spec.ts`, `src/modules/letter/ui/*.test.ts`). What only a person can judge is recorded here. **A row is a result only when the Date, Tester and Result columns are filled in. A blank Result means open, not passed.**

How to run: `docker compose up` (Test mode, no key). Use «Bruk eksempelet».

| # | Date | Tester | Steps | Expected result | Result |
| - | ---- | ------ | ----- | --------------- | ------ |
| 1 |      |        | With a screen reader on, choose «Personlig» in «Tone i brevet» with the arrow keys, then press «Analyser og skriv utkast». | The group is announced as «Tone i brevet» with each option read as «Personlig – Varm, med «jeg» i front». After the score appears, the phase-1 line is read and ends with «Søknadsbrevet skrives nå.». A moment later «Søknadsbrevet er klart.» is read once. Focus stays on the heading «Nordic Digital» and is not moved to the Letter. |        |
| 2 |      |        | Turn on «reduce motion» in the operating system and repeat. | The pulse trace in the progress line is still (fully drawn). | |
| 3 |      |        | Read the Letter in the screen reader's document mode. | The «Søknadsbrev» heading, then the label «Utkast skrevet med KI – les gjennom og tilpass før du sender.», then the Letter, which ends «[Navnet ditt]». It cannot be edited. | |

## Copy, download and new draft (Story 3.8, FR-12, UX-DR13, UX-DR28, UX-DR39)

The automated tests prove the plain-text copy with the sign-off rendered, «Kopiert» for 1.8 s, the second live region, focus staying on the button, the blocked-clipboard fallback, the .docx file name (ASCII) and its text, «Lag nytt utkast» (busy, old Letter kept, progress line, success, failure with «Prøv igjen», Test mode showing the Cached Letter again) and full-width actions at 360 px (`e2e/letter-actions.spec.ts`, `src/modules/letter/ui/*.test.ts`, `src/shared/ui/*.test.ts`). What only a person can judge is recorded here. **A row is a result only when the Date, Tester and Result columns are filled in. A blank Result means open, not passed.**

| # | Date | Tester | Steps | Expected result | Result |
| - | ---- | ------ | ----- | --------------- | ------ |
| 4 |      |        | With a screen reader on, press «Kopier». | «Kopiert til utklippstavlen.» is read once; focus stays on «Kopier», which reads «Kopiert» for a moment. | |
| 5 |      |        | Press «Lag nytt utkast» with a screen reader on. | The button is announced as busy or unavailable; when the new Letter is in place «Det nye utkastet er klart.» is read once; focus stays on the button. | |
| 6 |      |        | Press «Last ned (.docx)» and open the file in Word, LibreOffice and Google Docs. | The file is named `soknadsbrev-<arbeidsgiver>-<år>.docx`, opens without a repair prompt, and holds the Letter paragraphs and «[Navnet ditt]». | |
| 7 |      |        | On a phone, block clipboard access for the site and press «Kopier». | The Letter text is selected and the notice «Kopier med Ctrl+C, eller hold inne på mobil.» shows. | |
