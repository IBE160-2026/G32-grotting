# Story 3.5: Kjør hele flyten i Test mode på lagrede svar

## 2026-11-19 kl. 18:34 — Helise-26

### Oppgave
Helene kjørte `/bmad-build` for story 3.5 («Run the full flow in Test mode on Cached responses») med anbefalt spec, subagenter til review og «merge when done» (vent på grønn CI først). Målet er at Examiner kan få et ekte brev i alle tre toner uten API-nøkkel.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-5-run-the-full-flow-in-test-mode-on-cached-responses.md` (ingen åpne spørsmål, godkjent som anbefalt; kun Example-paret spilles inn).
- Implementering via én subagent. Den ble nektet å kjøre den betalte innspillingen (permission-sjekk), så jeg spurte Helene; hun svarte ja, og jeg kjørte `npm run fixtures:record -- example-nordic-digital` selv.
- Review med tre subagenter (Blind Hunter, Edge Case Hunter, Verification Gap); patcher gjort i hovedøkten. Branch `story/3.5-run-the-full-flow-in-test-mode-on-cached-responses`, så PR og merge.

### Resultat
- Ny cachet adapter `ai/server/adapters/cached.ts` med Fixture-indeks under `cv.txt` og tekst fra `cv.pdf`; treff-mangel gir `TEST_MODE_UNAVAILABLE` (nytt i `AiFailure`/`runAi`). `loadFixtures()` i `data-files.ts`.
- `scripts/record-cached.ts` (+ `fixtures:record`, valgfri `--tone`); tre innspilte brev i `data/fixtures/example-nordic-digital/cached/` (Formell måtte spilles inn på nytt: første svar hadde 246 ord). Rundt fire betalte forespørsler.
- `integrity/core`: `checkTone` og ordlister. Banner `shared/ui/components/banner.tsx` i `layout.tsx`. Tester for Tone-regler, lengde, ett `{{SIGNATUR}}`-token, `promptVersion === PROMPT_VERSION` (CI-sjekken) og paritet cv.pdf/cv.txt/«Bruk eksempelet». `docs/qa/test-mode-manual-checks.md` med tomme resultatrader.
- Review-patcher: e2e-sjekk av banneret, `loadFixtures` hopper over mapper uten cachede brev, duplikatnøkkel kaster feil. Resten avvist med begrunnelse i triage-loggen i spec-fila.
- Verifisert: `npx biome check`, `npm run typecheck`, `npx vitest run` (75 filer, 899 bestått, 2 forventet feil), `npm run db:check`, `docker compose run --rm --build test` (121 e2e bestått, kjørt etter patchene). Commit `c1c45b7`.
- Merge til `main` etter grønn CI er bedt om i økten (se sluttoppsummeringen for utfall).

### Åpne punkter
- Manuelle rader i `docs/qa/test-mode-manual-checks.md` er ikke fylt ut (banner på hver side, lese gjennom de tre brevene).
- Bare Example-paret har cachede brev; de andre Fixtures gir `TEST_MODE_UNAVAILABLE` (bevisst).
- Validering av AI-svaret ved kjøring (lengde, språk, restplassholdere) er fortsatt ikke gjort; hører til integritetsvakta (3.10).
