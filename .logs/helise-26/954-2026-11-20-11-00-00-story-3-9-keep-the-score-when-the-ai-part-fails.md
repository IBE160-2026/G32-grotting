# Story 3.9: Behold poengsummen når KI-delen feiler

## 2026-11-20 kl. 11:00 — Helise-26

### Oppgave
Bygg story 3.9 («Keep the score when the AI part fails») autonomt via `bmad-build-auto`, med tre overføringer fra 3.7 og 3.8: (a) «Lag nytt utkast» med `AI_NOTICE_REQUIRED` skal åpne KI-varselet på nytt, og «Dagens grense» og feil med retry mangler for nytt utkast; (b) alarmen og den andre live-regionen leser feilsetningen to ganger; (c) en stille `ANALYSIS_STALE`-omkjøring kan endre poengsummen uten opplesning. Ingen live KI-kall.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-9-keep-the-score-when-the-ai-part-fails.md` (skrevet i hovedøkta). Bare klientkode; ingen endring i server, `package.json`, lockfil, Dockerfile eller `data/`, så `docker compose run --rm --build test` er ikke påkrevd og ikke kjørt.
- Bygget direkte i hovedøkta; review med fire subagenter (Blind Hunter, Edge Case Hunter, Verification Gap, Intent Alignment). Harnessen kjørte dem i bakgrunnen; triage først da alle fire var levert.
- Branch `story/3.9-keep-the-score-when-the-ai-part-fails`, PR #58; denne loggen og sprint-status på `chore/log-3.9`.

### Resultat
- `application-form.tsx`: hver fase 2-forespørsel har en modus (`first`, `retry`, `again`) som bestemmer hvor utfallet leses opp og hvordan et avslag vises; én Letter-forespørsel om gangen (ref-vakt `letterBusy`). «Prøv igjen» leser utfallet i den andre regionen og fokus går til `h2`. «Lag nytt utkast»: `AI_NOTICE_REQUIRED` åpner varselet på nytt (godta sender utkastet, «Avbryt» eller andre avslag gir alarm med «Prøv igjen», det gamle brevet blir stående), «Dagens grense» og «Testmodus» som varsler uten retry. En stille omkjøring som endrer poengsum eller nøkkelordlister leses opp som «Samsvaret er oppdatert: …» sammen med utfallet.
- `Alert` fikk `silent` (ingen `role="alert"`): feilboksene i brevseksjonen, nytt utkast og nedlastingsfeil er stille, live-regionen sier feilen én gang. `letter-actions.tsx` (`RegenState` + `cap`/`testMode`), `letter-section.tsx`, `phase-one-line.ts` (`resultChanged`, `updatedLine`), `messages.nb.ts` (nye linjer).
- Tester: Vitest 85 filer, 960 bestått, 2 forventet feil; Playwright 182 bestått (nye tester for første feil, retry, dobbelttrykk, «Dagens grense»/«Testmodus» for nytt utkast, varsel på nytt, stale med ny poengsum, dobbeltklikk og refresh). Eksisterende e2e-lokatorer byttet fra `getByRole("alert")` til tekst (`failureBox`), fordi Next.js sin rute-announcer også er en `role="alert"`. `npx biome check` og `npm run typecheck` rene. CI `ci` grønn (4 min 57 s). PR #58 merget (merge-commit f975ccc). Hosted ikke rørt.
- Review: 2 middels patcher (stale-linja ble overstyrt av utfallslinja i samme region; første brevs utsatte fase 2-linje kunne komme etter «Prøv igjen») og 1 lav (QA-rader), resten avvist med begrunnelse i triage-loggen i spec-fila.
- Docs: `docs/qa/letter-manual-checks.md` rad 8 til 13.
- Lukket i `issues.md`: tre punkter fra 3.7 og 3.8 om full feilhåndtering, stille stale og dobbel opplesning.

### Åpne punkter
- Fyll ut rad 8 til 13 i `docs/qa/letter-manual-checks.md` (skjermleser: feil leses én gang, «Prøv igjen», nytt utkast med cap/Testmodus/varsel, «Samsvaret er oppdatert»).
- 90 s-tidsavbruddet og Test mode for ikke-Fixture testes mot stubbede svar i nettleseren; selve serverbegrensningen eies av 3.1, 3.4 og 3.5.
