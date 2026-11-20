# Story 3.11: La KI foreslå nøkkelord når koden alene ikke holder

## 2026-11-20 kl. 10:47 — Helise-26

### Oppgave
Bygge story 3.11 («Let AI propose Keywords when code alone falls short», FR-5b gjelder) autonomt via `bmad-build-auto`: tabellen `keyword_lists` med migrasjon, FR-5b-stien i `KeywordSource.resolve`, en nøkkelordprompt med `PROMPT_VERSION`, `cached/keywords.json` for alle Fixtures (innspilt live, ett kall per Fixture), `keywordFallback` på som standard, og varselet om at annonsen, aldri CV-en, sendes for nøkkelord med ny `aiNotice.version`. Hosted skal forbli frosset uten KI.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-11-let-ai-propose-keywords-when-code-alone-falls-short.md` (skrevet i hovedøkten, ingen åpne spørsmål).
- Bygget direkte i hovedøkten, uten implementeringssubagent (som i 3.6): konteksten var stor og samlet, og en kald subagent ville måttet utlede alt på nytt. Fire reviewere (Blind Hunter, Edge Case Hunter, Verification Gap, Intent Alignment); patcher i hovedøkten.
- Branch `story/3.11-let-ai-propose-keywords-when-code-alone-falls-short`, PR #62, merge etter grønn CI. Denne loggen og sprint-status på `chore/log-3.11`.

### Resultat
- `keywords/server/keyword-source.ts`: `resolveKeywords` er nå async. Med `keywordFallback` på leses `keyword_lists` (nøkkel `contentHash(canon(annonse))`); ellers ett `runAi`-kall (bare annonsen), hvert foreslått ord må finnes i annonsen via `proposeKeywords`/`findKeyword`, listen lagres (`saved`), ellers kodelisten med `code-fallback` (ingen varsel godtatt, tak nådd, feilet kall, Test-mode-bom). Fase 2 og brevsjekken leser bare lagret liste, så de bruker ingen forespørsel og får samme fingeravtrykk.
- Nytt: `keywords/server/schema.ts` + `drizzle/0001_keyword_lists.sql`, `prompts/keywords.ts` (`keywords-1`), `core/propose.ts`, `shared/server/content-hash.ts`. `findKeyword` finner nå også et ord utenfor vokabularet (uten aliaser); `checkLetter` flagger derfor Missing-ord utenfor vokabularet.
- Cached adapter: egen nøkkelordindeks (ingen PDF-lesing), `task` sendt med fra `runAi`, `loadFixtures` tar med mapper som bare har `keywords.json`. `scripts/record-cached.ts --keywords`. `data/fixtures/_planted/keywords-unsupported.json` til FR-5b-testen.
- `config.ts`: `keywordFallback` på som standard, tvunget av på Hosted; prefikset `notice-3`. Varselet har et sjette punkt når fallback er på. Fremdriftslinja «Henter nøkkelord fra annonsen …» (ikke annonsert) og «Mindre presist: nøkkelordene er hentet ut uten KI.» under formelen. `consent` følger med fase 1 (og med stille omkjøring ved `ANALYSIS_STALE`).
- Innspilling: 4 betalte forespørsler (en per Fixture, `anthropic/claude-sonnet-5.5` via OpenRouter, ingen gjentak), ca. noen få cent; forbruket er ikke lest tilbake fra OpenRouter. Resultatet står i `docs/qa/fr-5b-decision.md`: KI-listene er lik ingen av fasitene (Example 63 mot 64 %, held-out 40 mot 50 %, nursing 41 mot 31 %, two-column 82 mot 67 %). Held-out-testen i `sm2.test.ts`/`analyse.test.ts` står derfor fortsatt som forventet feil (de tester kodemotoren).
- Tester: vitest 96 filer, 1097 bestått, 2 forventet feil; Playwright 200 bestått (ny `e2e/keyword-fallback.spec.ts` og en fjerde server på port 3103; live-serveren 3102 har fallback av); `vitest.config.ts` fikk `testTimeout` 40 s og `hookTimeout` 60 s etter at Docker-kjøringen ga PGlite-timeouts. `docker compose run --rm --build test` bestått (96 filer, 1096 bestått, 200 e2e). `npx biome check`, `npm run typecheck`, `npm run db:check` grønne. CI `ci` grønn (6 min 34 s). Commit `aabf284`, merget som PR #62 (merge-commit `1e60cf3`). Hosted ikke rørt.
- Review: 35 funn, 3 medium (rute-testen for samtykke, DB-feil-stien, utdatert lagret rad), 6 patcher, 4 utsatt (se spec-fila), resten avvist med begrunnelse.

### Åpne punkter
- Helene: KI-listene stemmer ikke med noen fasit. I Test mode viser Example-paret 63 %, ikke fasitens 64 %, og SM-1 («score lik fasiten») gjelder nå bare kodelisten. Velg: behold fasiten som orakel for koden, eller skriv en egen fasit for lagrede lister (se `docs/qa/fr-5b-decision.md`).
- Det formelle brevet for Example-paret får nå ett flagg i Test mode («tilgjengelighet», Missing i KI-listen men nevnt i det innspilte brevet). Brevene er ikke spilt inn på nytt; avgjør om de skal det.
- Overlappende foreslåtte ord (f.eks. «regnskap» og «regnskapssystem», alias og term) teller som egne nøkkelord; ikke håndtert.
- Prompten sier «samme ord som annonsen, i grunnform» og «6 til 30» mens `MAX_PROPOSED` er 60; endring krever ny `PROMPT_VERSION` og nye innspillinger (betalte kall).
- Gjentatte innsendinger av en annonse som ikke gir liste bruker ett tak-sted hver gang (feilet kall huskes ikke).
- Ingen e2e for samtykke i den stille omkjøringen etter `ANALYSIS_STALE` i brevsjekken.
- Hosted-migrasjonen `0001` kjøres først ved neste Hosted-bygg (frosset); `keyword_lists` brukes ikke på Hosted (fallback er tvunget av).
- Fyll ut rad i `docs/qa/ai-notice-manual-checks.md` for den nye setningen (skjermleser, 360 px) sammen med de åpne radene fra 3.6.
