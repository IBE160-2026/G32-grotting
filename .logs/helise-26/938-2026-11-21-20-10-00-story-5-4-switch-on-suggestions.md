# Story 5.4: switch on suggestions and run the first live checklist

## 2026-11-21 kl. 20:10 — Helise-26

### Oppgave
Siste story i den autonome Epic 5-kjøringen (`goal.md`): slå på omformuleringsforslag som standard, G4 i `qa:compare`, og lag sjekklista for menneskesjekken (live Fixture-kjøring er Helenes).

### Plan
- Blokkerende underagent med `bmad-build-auto` på `story/5-4-switch-on-suggestions-and-first-live-checklist`; spec: `_bmad-output/implementation-artifacts/spec-5-4-switch-on-suggestions-and-run-the-first-live-checklist.md`. Ingen live-kall.

### Resultat
- PR #87, merge-commit `79f58bf` (storycommit `9ac892f`); `ci` grønn (7m46s, første forsøk); `sprint-status.yaml`: 5-4 `done`, `epic-5` `in-progress`, `epic-5-retrospective` `optional`.
- `FEATURE_DEFAULTS.rewording = true`; `rewording` tvinges av når `APP_ENV=hosted`, med test. Ingen `FEATURE_REWORDING` lagt i `compose.yaml` eller README; `.env.example` hadde det kommenterte navnet fra før (1.2) og er urørt.
- `scripts/qa-compare.ts`: G4 (forventede Rewordable gaps funnet og vist med forslag som besto FR-17) per Fixture og totalt med prosent, rapportert sammen med G2; G2 dømmes fortsatt på must-never-suggest og er det eneste som feiler kjøringen. Tester med planted data (nursing, og et REST-API-tilfelle med G2 og G4 sammen).
- G4 på cachede gaps (ikke live): 9 av 15 (60 %): Example 3/3, held-out regnskap 3/4, nursing 3/7, two-column 0/1. Alle seks bom er Gaps modellen kalte Real; FR-17 forkastet ingenting. Under SM-5-målet på 70 %. Ingen G2-feil.
- Playwright: UJ-1 med Example i Test mode viser forslagene med «Kopier» (kopiering gir bare forslagsteksten, axe består); port 3106-serveren kjører nå med `FEATURE_REWORDING=false` og én test for flagg-av-banen.
- Eksisterende tester rettet til nytt standardoppsett: `run-mode.test.ts`, `config.test.ts`, to tester i `e2e/gaps.spec.ts`, `letter-actions.spec.ts` og `letter-check.spec.ts` (Kopier-locator ekskluderer «Kopier forslaget for …»). Testen «rewording off (the default)» i `e2e/gaps.spec.ts` ble fjernet, dekket nå av 3106-testen i `e2e/suggestions.spec.ts` (som også sjekker `suggestion: null`).
- `docs/qa/rewording-manual-checks.md`: L1–L8, G1–G5, R1–R3 som `ikke kjørt`, 3. desember-raden som `ikke vurdert`; `qa:compare -- --dir <mappe>`, commit av live-utdata, og prompt-fiks/ny `PROMPT_VERSION`/ny innspilling/ny kjøring ved feil på L2, G1, G2 eller R1. PRD §11 er ikke rørt.
- `npm test` grønn (243 Playwright; første kjøring traff kjent `route.fetch`-flake, omkjøring ren); typecheck grønn; Docker-suiten ikke kjørt (rører ikke `package.json`, lockfil, `Dockerfile` eller `data/`).
- Avvik: en staging-feil gjorde at første reviewrunde bare leste sjekkliste-dokumentet; alle fire lag ble kjørt på nytt på hele diffen, begge runder triagert (se spec). Lagene kjørte i bakgrunnen, men underagenten ventet på alle fire.
- Epic 5 er ferdig i kode: 5.1–5.4 merget (PR #84–#87). Menneskesjekken i 5.4 står åpen.

### Åpne punkter
- Helene: kjør hver Fixture live og sjekk utdataene med §9.2-sjekklista (L1–L8, G1–G5, R1–R3) etter `docs/qa/rewording-manual-checks.md`: `npm run qa:compare -- --dir <mappe>` på ferske live-svar, commit live-utdataene ved siden av resultatene, og beslutningspunktet 3. desember (FR-13 til FR-17 grønne + én live Fixture uten G2- eller R1-feil; ellers 4.–11. desember for S4 og S5 og S6 + S7 droppes som kutt 1 i PRD §11). Radene står `ikke kjørt`/`ikke vurdert`. Feil på L2, G1, G2 eller R1 gir prompt-fiks, ny `PROMPT_VERSION`, ny innspilling og ny kjøring.
- G4 på cachede gaps er 9 av 15 (60 %), under SM-5-målet på 70 %; alle bom er Gaps modellen kalte Real. Bekrefter en live-kjøring det, trengs prompt-endring (Helenes avgjørelse).
- `rewording` er på som standard mens `FEATURE_GAPS=false` gir ingen synlige forslag (flagget leses bare i Gaps-veien); ikke rettet.
- Epic 5-retro (`epic-5-retrospective`) er Helenes.
