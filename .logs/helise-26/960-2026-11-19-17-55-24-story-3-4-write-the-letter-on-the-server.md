# Story 3.4: Skriv brevet på serveren

## 2026-11-19 kl. 17:55 — Helise-26

### Oppgave
Helene kjørte `/bmad-build` for story 3.4 («Write the Letter on the server») med anbefalt spec, subagenter til review og «merge when done». Målet er at serveren kan skrive et bokmål-utkast til søknadsbrev fra CV og annonse i valgt tone.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-4-write-the-letter-on-the-server.md` (ingen åpne spørsmål, godkjent som anbefalt).
- Undersøkelse via Explore-subagent, implementering via én subagent, review med tre subagenter (Blind Hunter, Edge Case Hunter, Verification Gap), patcher av samme implementeringsagent.
- Branch `story/3.4-write-the-letter-on-the-server`, så PR og merge til `main`.

### Resultat
- Ny `letter`-slice: `contracts.ts` (Tone, Letter, request/response), `core/{normalise-letter, render-letter, file-name}.ts`, `server/prompts/letter.ts` (`PROMPT_VERSION = letter-1`), `server/generate.ts`, `index.ts`, og `src/app/api/analyses/[id]/letter/route.ts` (recompute av fase 1, `ANALYSIS_STALE` 409, ett `runAi`-kall, `maxDuration = 120`).
- `rev` = `previousRev + 1`, der klienten sender `previousRev` (ikke i epic-teksten; valgt fordi det ikke finnes lager før kontoer).
- Review: 10 funn patchet (delimiter-omgåelse, tittel/arbeidsgiver med linjeskift, «Med hilsen», siste avslutningsfrase, token-varianter, Direkte uten nøkkelord, `previousRev`-tak, filnavn ß/ł m.fl., consent-test, AD-15-kommentar), ett utsatt, resten avvist i triage-loggen i spec-fila.
- Verifisert: `npx biome check`, `npm run typecheck`, `npx vitest run` (69 filer, 781 bestått, 2 forventet feil), `npm run db:check`. Docker-kjøring ikke nødvendig (ingen endring i `package.json`, `Dockerfile`, lockfile eller `data/`).
- Commit `bbbd2c1` (story-arbeidet). Sprint-status: 3-4 satt til `done`. Merge til `main` via PR ble bedt om i økten.

### Åpne punkter
- Validering av AI-svaret (lengde 250–400 ord, språk, restplassholdere som «[Ditt navn]») er ikke gjort; hører til `checkTone` (3.5) og integritetsvakta (3.10). Ført i `deferred-work.md`.
- Uten nøkkel velger appen Test mode og den cachede adapteren, som ikke finnes før story 3.5; ruta svarer derfor ikke i ekte kjøring før da.
