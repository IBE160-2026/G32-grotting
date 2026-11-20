# Story 4.6: slå på Gap-analysen

## 2026-11-20 kl. 21:36 — Helise-26

### Oppgave
`goal.md`, siste story (4.4–4.6): slå på `FEATURE_DEFAULTS.gaps`, tving `gaps` av på Hosted, Playwright for UJ-1 med Example-paret, og lag `docs/qa/gaps-manual-checks.md` for menneskesjekken.

### Plan
- Blokkerende underagent med `bmad-build-auto` på gren `story/4.6-switch-on-gap-analysis` fra ren `main`.
- Spec: `_bmad-output/implementation-artifacts/spec-4-6-switch-on-gap-analysis.md`.

### Resultat
- PR #78 merget som 74962ea, `ci` grønn (6m29s); sprint-status `4-6: done` lå i PR-en. `epic-4` står bevisst på `in-progress` (retrospektivet `epic-4-retrospective` er `optional`; epic-statusen er ditt valg).
- `FEATURE_DEFAULTS.gaps = true`; `config.ts` tvinger `gaps` av når `APP_ENV=hosted`; `config.test.ts` dekker default på, `FEATURE_GAPS=false` og Hosted med true/false/unset. Ingen `FEATURE_GAPS` satt i `compose.yaml`/README; `.env.example` har bare den gamle kommenterte navnelinja fra 1.2 (urørt).
- Playwright: standardserver (3100) kjører nå Gaps; 3104 er nå «bare brev» (`FEATURE_GAPS=false`); 3102/3103 (oppdiktet nøkkel) har også `FEATURE_GAPS=false`. Fire Letter-describes i `e2e/letter.spec.ts` kjører mot bare-brev-serveren. Ny UJ-1-test med Example i Test mode i `e2e/gaps.spec.ts`: Rewordable + Real gap, «Se gapanalysen» flytter fokus, axe rent (tall fra Missing-lista på skjermen). `letter-check.spec.ts`-mocken ekkoer nå `gapsRev` (en reviewer fant at testen ellers besto uten å verifisere).
- `npm test` (biome, typecheck, 1291 vitest + 3 forventet feil, 228 Playwright) og `npm run typecheck` grønne. Docker-test ikke nødvendig.
- `docs/qa/gaps-manual-checks.md` opprettet med G1, G2, G3, G5 som `ikke kjørt`, de to 4.3-funnene og `qa:compare`-notisen. Ikke markert som kjørt.
- Rørt ikke: `PROMPT_VERSION`, `data/fixtures/*/cached/gaps.json`, integritetssjekker. Ingen live KI-kall, ingen endring på Hosted.
- Avvik: bare Example-paret dekkes i Playwright; `it.fails` i `test/gaps-test-mode.test.ts` står som markør for lagret-liste-avviket for de tre andre Fixtures.
- Review: fire lag; underagenten startet dem i bakgrunnen mot workflowen, men samlet alle resultatene før triage.
- Goal.md-løkka (4.4–4.6) er ferdig. Epic 5 er ikke startet.

### Åpne punkter
- Helene: G1, G2, G3, G5 for hånd mot én live Fixture (se issues.md).
- Avvik fra AC: Test mode-standardflyten gir mal-Reelt gap for 3 av 4 Fixtures (og Example dekkes bare 3 av 7); vurder ny innspilling ved neste prompt-versjon (5.1).
- Ingen nettleser-test dekker samtykke-koblingen for Gaps-forespørselen på live-modus-server med flagget på (samme `consentFor` som brevet); utsatt i spec 4.6.
