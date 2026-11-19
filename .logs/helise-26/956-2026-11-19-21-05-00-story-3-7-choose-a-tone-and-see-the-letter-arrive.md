# Story 3.7: Velg en tone og se brevet komme

## 2026-11-19 kl. 21:05 — Helise-26

### Oppgave
Bygg story 3.7 («Choose a Tone and see the Letter arrive») autonomt via `bmad-build-auto`: tonevalg på Søknad, fase 2 med brevet under poengsummen, og overføringen fra 3.6 (fase 2-forespørselen må bære `consent: { noticeVersion }` via `consentFor`, og varselet må komme på nytt ved `AI_NOTICE_REQUIRED`). Ingen live KI-kall.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-7-choose-a-tone-and-see-the-letter-arrive.md` (skrevet i hovedøkten).
- Bygget direkte i hovedøkten (ingen implementeringssubagent); review med fire subagenter (Blind Hunter, Edge Case Hunter, Verification Gap, Intent Alignment). Subagentene kjørte i bakgrunnen i denne harnessen, ikke blokkerende som workflowen ber om; resultatene ble vurdert først da alle fire var levert.
- Branch `story/3.7-choose-a-tone-and-see-the-letter-arrive`, PR #54; denne loggen og sprint-status på `chore/log-3.7`.

### Resultat
- Nytt `src/modules/letter/ui/` (`tone-choice`, `letter-view`, `letter-section`, `request-letter`) og delte `progress-line`, `ai-placeholder`, `notice` i `src/shared/ui/components/`. Sporet i `globals.css` går fem ganger à ett sekund og bare når bevegelse er tillatt.
- `application-form.tsx`: tonevalg før send-knappen (lagres i `ja.session.v1`, ukjent verdi leses som «Formell»); fase 2 starter rett etter poengsummen som én `useMutation`; samtykke fra `consentFor(runMode, readSession().noticeVersion)`; `ANALYSIS_STALE` kjører fase 1 på nytt én gang uten melding; `AI_NOTICE_REQUIRED` åpner varselet på nytt én gang og sender igjen (andre avslag, eller «Avbryt», gir seksjonsalarm med «Prøv igjen»); enkle feiltilstander («Dagens grense», «Testmodus», alarm med retry). Fase 1-linja slutter nå med «Søknadsbrevet skrives nå.»; fase 2-linja («Søknadsbrevet er klart.») ventes 1,5 s så den ikke overstyrer fase 1-linja.
- `api-client.ts` fikk `timeoutMs` (brevet venter 105 s). `client-session.ts` fikk `tone`.
- Tester: Vitest 81 filer, 941 bestått, 2 forventet feil; Playwright 158 bestått (`e2e/letter.spec.ts`: UJ-1 per tone fra «Bruk eksempelet» i Test mode, tonevalg, ventetilstand, 5 s og redusert bevegelse, stale, feil, axe ved 1280/360 px). `e2e/ai-notice.spec.ts` svarer på fase 2 i nettleseren (stubbet), så ingenting når OpenRouter med den oppdiktede nøkkelen. Eksisterende tester oppdatert: fokusrekkefølge (tone før send) og fase 1-linja (brevet holdes tilbake). `npx biome check` og `npm run typecheck` rene. Ingen endring i package.json, lockfil, Dockerfile eller `data/`, så `docker compose run --rm --build test` ikke kjørt. CI `ci` grønn (4 min 10 s). Hosted ikke rørt.
- Review: 1 høy patch (fokus mistet fordi `h2` ble byttet ut; nå ett `section`/`h2` i `AiPlaceholder`), 4 lave patcher, resten avvist med begrunnelse i triage-loggen i spec-fila. PR #54 merget (merge-commit 96ca478).
- Docs: ny `docs/qa/letter-manual-checks.md`; `ai-notice-manual-checks.md` fikk riktig oppskrift (fase 2 feiler nå med den oppdiktede nøkkelen).

### Åpne punkter
- Fyll ut rad 1 til 3 i `docs/qa/letter-manual-checks.md` (skjermleser, redusert bevegelse).
- Story 3.9 eier full feilhåndtering; 3.7 har bare en enkel variant (alarm med retry, to varsler).
- En stille omkjøring ved `ANALYSIS_STALE` kan endre poengsummen uten ny opplesning; vurder i 3.9.
- Fra 3.6 gjenstår manuelle rader 2 til 5 og FR-24-ordlyden (se issues.md).
