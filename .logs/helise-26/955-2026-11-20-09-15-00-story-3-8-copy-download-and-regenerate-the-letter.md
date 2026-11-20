# Story 3.8: Kopier, last ned og lag nytt utkast

## 2026-11-20 kl. 09:15 — Helise-26

### Oppgave
Bygg story 3.8 («Copy, download and regenerate the Letter») autonomt via `bmad-build-auto`: «Kopier», «Last ned (.docx)» og «Lag nytt utkast» under brevet. Ingen live KI-kall; `docker compose run --rm --build test` er ferdig-kriteriet fordi `docx` kom inn i `package.json` og lockfila. Økta ble avbrutt av en rate limit og tatt opp igjen med treet urørt.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-8-copy-download-and-regenerate-the-letter.md`. Bygget direkte i hovedøkta (som i 3.7), review med fire subagenter (Blind Hunter, Edge Case Hunter, Verification Gap, Intent Alignment; harnessen kjørte dem i bakgrunnen, triage først da alle fire var levert).
- Branch `story/3.8-copy-download-and-regenerate-the-letter`, PR #56; denne loggen og sprint-status på `chore/log-3.8`.

### Resultat
- Nytt delt `src/shared/ui/components/copy-button.tsx` og `src/shared/ui/clipboard.ts`: ren tekst via `renderLetter(text, null)`, «Kopiert» i 1,8 s, «Kopiert til utklippstavlen.» i den andre live-regionen, fokus blir på knappen; blokkert utklippstavle markerer brevteksten og viser og leser opp «Kopier med Ctrl+C, eller hold inne på mobil.».
- `src/modules/letter/ui/`: `build-docx.ts` (pakken `docx`, lastet først ved trykk), `download-letter.ts` (filnavn fra `letterFileName`, bare ASCII), `letter-actions.tsx` (knappestabel og hint, full bredde ved 640 px eller mindre). `LetterJob` fikk `previousRev`.
- `application-form.tsx`: `runLetter(job, again)`; «Lag nytt utkast» er opptatt mens det går, det gamle brevet blir stående, fremdriftslinja «Skriver et nytt utkast …», én forespørsel med skjemaets tone og `previousRev`; suksess og feil leses opp i den andre regionen, feil gir alarm med «Prøv igjen». I Test mode kommer det cachede brevet igjen.
- Pakker: `docx@9.16.0` (kjøretid) og `fflate@0.8.3` (dev, til å pakke ut .docx i tester). Lockfila er oppdatert.
- Tester: Vitest 85 filer, 956 bestått, 2 forventet feil; nye Playwright-tester i `e2e/letter-actions.spec.ts` (11). `npx biome check` og `npm run typecheck` rene. `docker compose run --rm --build test` bestått på sluttkoden (exit 0; Vitest 955 bestått, 2 forventet feil, 1 hoppet over; Playwright 169 bestått). CI `ci` grønn (5 min 5 s). PR #56 merget (merge-commit b342194). Hosted ikke rørt.
- Review: 3 middels og 3 lave patcher (dobbelttrykk-vakt med ref, test av nedlastingsfeil, regenerering med `ANALYSIS_STALE`, første brevs opplesing ble avbrutt av nytt utkast, utdaterte kopi- og nedlastingsmeldinger, 1,8 s målt med `page.clock`), 1 utsatt, resten avvist med begrunnelse i triage-loggen i spec-fila.
- Docs: `docs/qa/letter-manual-checks.md` fikk rad 4 til 7.
- Docker Desktop hadde stoppet etter avbruddet og ble startet på nytt for sluttkjøringen.

### Åpne punkter
- Fyll ut rad 4 til 7 i `docs/qa/letter-manual-checks.md` (skjermleser ved kopi og nytt utkast, åpne .docx i Word, LibreOffice og Google Docs, utklippstavle blokkert på mobil).
- Nytt utkast som får `AI_NOTICE_REQUIRED` viser vanlig alarm i stedet for å åpne KI-varselet igjen; vurder i story 3.9 (utsatt i spec-fila).
- Story 3.9 eier full feilhåndtering for nytt utkast også («Dagens grense» uten retry, retryable); 3.8 har én felles feilvariant.
- Alarmen og den andre live-regionen leser feilsetningen to ganger (som i 3.7); vurder i 3.9.
