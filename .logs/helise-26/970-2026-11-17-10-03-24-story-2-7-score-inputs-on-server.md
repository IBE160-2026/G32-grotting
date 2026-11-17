# Story 2.7: skår inputene på serveren (fase 1)

## 2026-11-17 kl. 10:03 — Helise-26

### Oppgave
Bygge story 2.7 med `bmad-build`: `POST /api/analyses` som gir skår, lister, forklaringsnøkler og fingeravtrykk med vanlig kode og uten KI (FR-4, FR-5, FR-7, FR-8, NFR-6, AD-5, AD-6, AD-7). Anbefalt spec skulle brukes, review skulle gå via subagenter, og grenen skulle merges til slutt.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-2-7-score-the-inputs-on-the-server-phase-1.md` (branch `story/2.7-score-inputs-on-server`). Jeg skrev spec-en med anbefalte valg og godkjente den på vegne av Helene etter «use recommended spec»; ingen åpne spørsmål.
- Implementasjon via en subagent fra spec-en; jeg leste diffen selv og kjørte biome, typecheck og vitest.
- Tre reviewere (blind, edge-case, verification-gap) leste diffen; jeg triagerte og rettet selv (se Review Triage Log i spec-en).

### Resultat
- Nytt: `match/{contracts.ts, core/{score,analyse}.ts, index.ts}` (`scoreOf`, `verdictOf`, `analyse`, `analysisResultSchema`, forklaringer som `{ key, params }`, ingen Verdict på ledningen); `keywords/{contracts.ts, server/keyword-source.ts, index.ts}` (`resolveKeywords`); `application/{core/fingerprint.ts, server/analyse.ts, index.ts}` og `CONTRACT_VERSION`, request/response-skjema i `application/contracts.ts`; `src/app/api/analyses/route.ts` (`maxDuration = 120`, ingen nettverkskall, under 3 nøkkelord gir 400 på `inputs.jobAd`). Tester ved hver fil, inkludert fasitene på alle tre fixtures og to like kjøringer.
- Avvik fra spec-teksten (notert i Implementation Notes): `analyse` tar et fjerde argument `{ keywordSource, adParagraphs }`.
- Review-funn rettet: test som låser `adParagraphs` til annonsens avsnitt, test som viser at `vocabularyVersion` når fingeravtrykket, kommentar i `score.test.ts`, skår i `analyse.test.ts` leses fra fasiten.
- Commit: 27b6c7d (implementasjon, review-rettinger, spec, sprint-status, deferred-work). Verifisert: `biome check`, `npm run typecheck`, `vitest run` (46 filer, 449 tester) grønt. Sprint-status 2-7 satt til done.
- KI skrev all kode og alle tester; ingen `answer-key.json` eller vokabular er endret.

### Åpne punkter
- Fingeravtrykket hasher `canon`-tekst (AD-6), som slår sammen linjeskift: to CV-er/annonser som bare skiller seg i linjeskift får samme fingeravtrykk men ulike Evidence-linjer. Ufarlig i fase 1; må avgjøres når analysen lagres etter konto (AD-8). Står i deferred-work.md.
- `POST /api/analyses` har ingen grense på body-størrelse, klientens `fingerprint` har ingen lengdegrense, og `CONTRACT_VERSION` er en manuell konstant uten test mot skåringsatferd. Står i deferred-work.md.
- Ikke verifisert: `npm test` (Playwright) og Docker-testen ikke kjørt for 2.7; CI kjører dem på PR-en.
