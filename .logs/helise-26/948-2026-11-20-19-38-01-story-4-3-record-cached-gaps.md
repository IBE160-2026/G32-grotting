# Story 4.3: Record Cached Gaps for every Fixture

## 2026-11-20 kl. 19:38 — Helise-26

### Oppgave
Bygge story 4.3 autonomt via `bmad-build-auto`: Test mode svarer på Gaps fra `data/fixtures/*/cached/gaps.json` (AD-15-nøkkel), `record-cached.ts --gaps`, `qa-compare.ts` (G2), fixture-tester og CI-sjekk av `promptVersion`. Eneste story som får gjøre live KI-kall: ett per Fixture, ingen gjentak.

### Plan
- Adapter, data-files, recorder og qa-compare først, grønt med mock.
- Gjennomgå `gaps-1`-prompten før innspillingen (låses etter), så fire live kall, så tester, review og Docker.
- Spec: `_bmad-output/implementation-artifacts/spec-4-3-record-cached-gaps-for-every-fixture.md`.

### Resultat
- Cached-adapteren har egen Gaps-indeks (CV + annonse, `cv.txt` og `cv.pdf`); `data-files` leser `cached/gaps.json`.
- Prompten ble endret før innspilling (ingen sitattegn rundt sitatet; svar «real» når sitat ikke kan kopieres eksakt) og `PROMPT_VERSION` er nå `gaps-2`; `gapsOutputSchema` flyttet til `prompts/gaps.ts` med typede elementer (`.catch` beholder lenient oppførsel).
- Fire live innspillinger (openrouter, anthropic/claude-sonnet-5.5), ett kall hver, alle lyktes: Example 5 gaps (3 rewordable), held-out 7 (3), nursing 9 (3), Fjord 3 (0). 0 FR-15-nedgraderinger, 0 G2-feil (`npm run qa:compare`).
- OpenRouter-forbruk: 0,7287765 til 0,7585745 USD (differanse 0,029798 USD), grense 20 USD.
- Nytt: `scripts/qa-compare.ts` (+ test), `test/cached-gaps.test.ts`, `test/gaps-test-mode.test.ts`, planted G2-filer. Review med fire subagenter: 6 patcher (bl.a. recorder skriver rå adapter-output, tom/ødelagt item tar ikke plassen til en brukbar).
- Verifisering: `npm run typecheck` og `npm test` grønne (Vitest 107 filer, 1251 bestått, 3 forventet feil; Playwright 201), `docker compose run --rm --build test` grønn. `FEATURE_GAPS` er fortsatt av som standard. Ingen push.

### Åpne punkter
- Beslutning til 4.4/4.6: i standardflyten (keywordFallback på, lagret KI-liste, også i Test mode) er Missing-lista en annen enn Answer-key-lista for tre av fire Fixtures, så Gaps for de andre ordene blir mal-Real-gap i Test mode. Alternativer: ny `PROMPT_VERSION` og fire nye betalte innspillinger mot lagret liste, løsere nøkkelmatch i strukturtrinnet, eller bruke kodeliste. Forventet feil i `test/gaps-test-mode.test.ts` dokumenterer det.
- Menneskesjekk i 4.6 (G/L/R for Gap-teksten): Example «responsive nettsider»-sitatet stopper midt i setningen, og nursing «legemiddelhåndtering» siterer en linje om å følge med på medisinering.
- Kjør `npm run qa:compare -- --dir <mappe>` på ferske live-svar ved 4.6s live Fixture-kjøring.
