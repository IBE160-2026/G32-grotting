# Story 3.12: sjekkpunkt og orakelvalg

## 2026-11-20 kl. 14:15 — Helise-26

### Oppgave
Helene ba om hjelp til å se hvor prosjektet står (`bmad-help`), valgte alternativ (a) for orakelet (fasiten gjelder bare kode-motoren) og ba om å starte story 3.12 (`bmad-build`). Målet var å gjøre agent-delen av 3.12: føre beslutningen inn i dokumentene, kjøre sjekkpunktet på lokal app og finne ut av den flaky letter-check-testen.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-12-freeze-the-hosted-version-and-pass-the-core-flow-checkpoint.md` (godkjent av Helene før koding).
- Beslutning (a) i PRD (SM-1, SM-2, ny D25), `epics.md`, `docs/qa/fr-5b-decision.md` og Example-sjekklista.
- Flaky-test: årsaksundersøkelse (CI-logg fra PR #65, probe mot lagret KI-liste), så rettelse av testen og ny innspilling av brevet.
- Sjekkpunkt: Docker-testkjøring, live-kjøring av én Fixture mot lokal app, SM-2 og feil-input-turen ført i `docs/qa/core-flow-checkpoint-2026-11-20.md`.
- Menneskesjekker ble ikke gjort, bare listet.

### Resultat
- Commit `24832b0` på branchen `story/3.12-checkpoint-and-sm-decision` (lokal, ikke pushet): spec, PRD/epics/QA-dokumenter, `data/fixtures/example-nordic-digital/cached/letter-formell.json`, `e2e/letter-check.spec.ts`, sprint-status (3.12 = `review`).
- **Flaky-testen var et ekte flagg:** det lagrede Formell-brevet nevnte «tilgjengelighet», som er Missing i den lagrede KI-listen for Example-annonsen, så `checkLetter` flagget det. Testen sjekket «ingen liste» før svaret var tegnet. Testen venter nå på svaret og feilet 15 av 15 mot det gamle brevet; brevet er spilt inn på nytt med `fixtures:record` (første forsøk rent, 273 ord), og testen går 20 av 20. Alle tre Cached-brev gir null flagg mot sin lagrede KI-liste.
- **Beslutning (a)** ført: PRD SM-1 og SM-2 omformulert til kodelisten, ny D25 i §11, sjekkpunkt-teksten, `epics.md`, `fr-5b-decision.md` (datert rad) og en merknad i `example-pair-manual-checks.md`. SM-2 er omformulert ut over SM-1 (held-out-feilen er kjent grunnlag for FR-5b, D24).
- **Tester:** `docker compose run --rm --build test` grønn (Biome 280 filer; Vitest 96 filer, 1101 bestått, 2 forventet feil, 1 hoppet over fordi `DESIGN.md` ikke ligger i imaget; Playwright 200 bestått). Docker Desktop var av og ble startet av økten.
- **Live-kjøring (SM-1):** Fixture `nursing-sarvurdering` mot lokal app med nøkkel fra `.env`, på API-nivå: fase 1 39 % (7 Matched, 11 Missing, listen lagret, andre kall gir samme fingeravtrykk og poengsum), brev Formell 267 ord live på 13,6 s, brevsjekk ett flagg («langtidsavdeling»). 4 betalte forespørsler, ca. 0,022 USD lest tilbake fra OpenRouter (0,4263 til 0,4479 USD; måneden står på 0,45 av 20 USD).
- Utkast til FR-30-rad lagt i `docs/qa/hosted-deployment.md`, merket ubekreftet. Hosted ble ikke rørt.
- Review var inline (ingen subagenter); logget i spec-ens Review Triage Log.
- Lukket i `issues.md`: orakelvalget, det formelle brevets flagg og den flaky testen.

### Åpne punkter
- Helene: bekreft FR-30-raden i `docs/qa/hosted-deployment.md` etter egen titt i Vercel-dashbordet.
- Helene: UJ-1 på laptop og ekte telefon mot lokal app.
- Helene: se over SM-2-omformuleringen i PRD.
- Story 3.12 står som `review` til menneskesjekkene er ført; sett `done` etter det.
- Valgfritt: live-flyten i nettleseren for alle tre Toner.
- Review kjørt inline; `bmad-code-review` i ny økt gir uavhengig blikk.
- De manuelle radene for 3.6–3.11 (skjermleser, 360 px, .docx, utklippstavle) ligger fortsatt åpne fra før.

## 2026-11-20 kl. 16:00 — Helise-26

### Oppgave
UJ-1 på telefon: appen åpnet seg på `http://192.168.68.121:3000`, men «Analyser og skriv utkast» gjorde ingenting. Fungerte på laptopen.

### Plan
- Finn årsaken i klientkoden, rett den på egen branch `fix/application-id-insecure-context`, med enhetstest og e2e.

### Resultat
- Årsak: `crypto.randomUUID()` i `application-form.tsx` finnes bare på sikre opphav (https og localhost). Over vanlig http på lokalnettet er den `undefined`, og klikkhåndtereren kastet.
- Rettelse: `src/shared/ui/new-id.ts` (`newId()`, reserve med `getRandomValues`, gyldig UUID v4), brukt i skjemaet; enhetstest `new-id.test.ts` (4) og e2e «submits where crypto.randomUUID is missing …» (feiler uten rettelsen, går med). Biome, typecheck, 105 enhetstester og 68 e2e grønne. Commit på branchen `fix/application-id-insecure-context` (lokal, ikke pushet). Helenes egne ukommitterte endringer i tre `docs/qa`-filer ble ikke rørt.
- Windows-brannmuren tillater Node (Private og Public); porten var nåbar på LAN-adressen fra laptopen.

### Åpne punkter
- Serveren på port 3000 kjører gammelt bygg: `next build` og restart (`npm run serve`) før telefonen prøves på nytt.
- Rettelsen er ikke pushet eller merget (PR gjenstår).

## 2026-11-20 kl. 17:30 — Helise-26

### Oppgave
Hjelpe med de manuelle feiltestene i `letter-manual-checks.md` (rad 8–17), føre rad 13 som bestått uten skjermleser, og se på Helenes test av rad 17.

### Plan
- Stubbe feilene med en proxy foran appen i stedet for nettverkspanelet (`scripts/qa-stub-proxy.ts`, how-to i `docs/qa/stubbed-failure-checks-howto.md`).
- Kjøre rad 13 i nettleser, og måle rad 17 (fokus mot live-region) i nettleser.

### Resultat
- Proxy og how-to er committet lokalt på `chore/qa-stub-proxy` (ikke pushet). Alle moduser ble kjørt mot appen i Test mode i nettleser; rad 13-oppskriften (endre `vocabularyVersion` til `v1-00000013`, fjern «Git», kodeliste uten fallback) ga 64 til 62 % og linja «Samsvaret er oppdatert: 62 % …».
- Rad 13 ført i `letter-manual-checks.md`: bestått uten skjermleser, tester Claude (nettleserkjøring). Ikke committet (filene i `docs/qa` har Helenes ubekreftede endringer).
- Rad 17 (Helenes resultat: «Fant …»-linja ble ikke lest, og «Brevet er ikke sjekket mot CV-en.» ble lest igjen i stedet for «… fortsatt …»): ført som feil, med den ødelagte teksten i resultatcella skrevet om uten tegnfeil. Målt i nettleser: live-linja ble satt 20 ms etter at fokus kom til «Søknadsbrev»-overskriften i «igjen»-tilfellet (237 ms ved vellykket sjekk), mot 464 ms for «Prøv igjen» (rad 9, bestått). Antatt årsak: skjermleseren avbrøt linja til fordel for fokus-opplesingen.
- Rettelse på `fix/check-retry-announcement` (commit `c3e5cd1`, lokal): utfallet av «Sjekk igjen» holdes til 600 ms etter klikket (`CHECK_RETRY_SPEECH_MS`), som fase 2-linja holdes bak fase 1-linja. Målt etterpå: linja kommer ca. 595 ms etter klikket. Biome grønn, 59 e2e (letter-check, letter, letter-actions) grønne. Skjermleser ikke prøvd.

### Åpne punkter
- Helene: kjør rad 17 på nytt med skjermleser etter at serveren er bygd på nytt med rettelsen; rettelsen er en antakelse om årsaken.
- Rad 13 med skjermleser (hva som faktisk leses opp) er ikke gjort.
- `fix/check-retry-announcement` og `chore/qa-stub-proxy` er ikke pushet eller merget.
