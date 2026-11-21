# Story 5.1: ask for a rewording suggestion with each Rewordable gap

## 2026-11-21 kl. 17:50 — Helise-26

### Oppgave
Bygg Epic 5 autonomt fra 5.1 til 5.4 etter `goal.md`. Denne økten dekker 5.1: prompten (`gaps-3`) ber om ett omformuleringsforslag per Rewordable gap, og alle fire `gaps.json` spilles inn på nytt.

### Plan
- Blokkerende underagent kjørte `bmad-build-auto` på gren `story/5-1-rewording-suggestion-with-each-rewordable-gap` (plan: `goal.md`, spec: `_bmad-output/implementation-artifacts/spec-5-1-ask-for-a-rewording-suggestion-with-each-rewordable-gap.md`).
- Prompt gjennomgått før innspilling; innspilling som siste implementasjonssteg; fire reviewlag, triage; PR; `ci`; merge.

### Resultat
- PR #84, merge-commit `3cc0254` (storycommit `0004b69`). `sprint-status.yaml`: 5-1 `done`, `epic-5` `in-progress`.
- `PROMPT_VERSION = "gaps-3"`: forslag for Rewordable bare når `features.rewording` er på, `null` for Real, alltid `null` når flagget er av. `Gap`-formen er uendret.
- `scripts/record-cached.ts --gaps`: lista er Answer keyens Missing-liste pluss fase 1-ord i Test mode, uten duplikater, Answer key-ord først, én forespørsel per Fixture. `MIN_KEYWORDS` flyttet til `prompts/keywords.ts`.
- Fire live-kall 2026-11-21 (`anthropic/claude-sonnet-5.5` via OpenRouter, `maxRetries: 0`), alle lyktes: example (9 ord), held-out-regnskap-kvale (14), nursing (13), two-column (3). Ingen retry.
- `it.fails` fjernet; ny rutetest over alle fire Fixtures. `test/cached-gaps.test.ts` tilpasset til ny rålistestruktur.
- `npm test` og `npm run typecheck` grønne; `docker compose run --rm --build test` grønn på tredje kjøring (første kjøring hadde 6 Playwright-feil mens reviewlagene gikk parallelt, andre hadde én «route.fetch: Test ended»); `qa:compare` uten G2-feil og 0 FR-15-nedgraderinger; `ci` grønn.
- Flagget er ikke slått på noe sted. Ingenting går til skjermen.
- Avvik: underagenten bygde inline (ikke implementasjonsunderagent) fordi innspillingen krever nøkkelen; reviewlagene ble startet i bakgrunnen av harnessen, men underagenten ventet på alle fire før triage. Triage: 3 patcher (low), 1 utsatt, resten avvist (se spec-filen).
- Lukket i `issues.md`: tre Epic 4-punkter om Test mode-lista og `it.fails` (4.3, 4.4, 4.6).

### Åpne punkter
- Et forslags lengde (25 ord), enkeltlinje og ingen anførselstegn ber prompten om, men ingen kode sjekker det; FR-17 i 5.2 dekker bare oppfinnelse og oppgradering. Vurder i 5.2/5.3.
- Innspilte forslag kan fortsatt legge til noe eller oppgradere («med fokus på tilgjengelighet», «som var interessent i prosjektet» i Example; «Fulgte med på legemiddelhåndtering i praksis» i nursing). Det er FR-17 i 5.2 og Helenes G-sjekker; prompten er låst.
- Flaky Playwright: «route.fetch: Test ended» i 4.5-testene i `e2e/gaps.spec.ts` (`letter-check`-stubben) under docker-kjøring; kan gjøre at en etterfølgende test ikke kjører.
- Opptakerens fase 1-kopi (`testModeMissingTerms`) kan skille seg fra `resolveKeywords` hvis den endres; `test/gaps-test-mode.test.ts` feiler da. Test mode-testen bruker `cv.txt`, ikke tekst fra `cv.pdf` (Example og Fjord).
