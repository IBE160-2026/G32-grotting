# Story 2.11: FR-5b-beslutning og held-out-fixture

## 2026-11-17 kl. 12:14 — Helise-26

### Oppgave
`/bmad-build` på story 2.11 («Decide whether code alone extracts Keywords well enough», FR-5b), med anbefalt spec, subagenter til review og merge til slutt. Storyen krever en held-out Fixture skrevet etter vokabular-tuningen, der **Helene skriver fasiten for hånd før motoren kjøres på den**.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-2-11-decide-whether-code-alone-extracts-keywords-well-enough.md`.
- Fase 1 (gjort): utkast til held-out-paret (annonse, CV, meta) av Claude. Fasiten skrives av Helene.
- Fase 2 (gjenstår): kjør SM-2 to ganger på alle fire Fixtures, skriv `docs/qa/fr-5b-decision.md`, og følg Pass- eller Fail-grenen i PRD, epics, arkitektur og EXPERIENCE.md. Deretter review med subagenter, PR og merge.

### Resultat
- Branch `story/2.11-decide-whether-code-alone-extracts-keywords`, commit `649ac82`.
- Ny Fixture `data/fixtures/held-out-regnskap-kvale/` med `ad.txt` (243 ord), `cv.txt` (188 ord) og `meta.json` (Regnskapsmedarbeider, Kvale Regnskap; fiktiv CV «Ola Brekke»). Feltet er regnskap, annerledes enn de tre eksisterende. **Claude skrev annonse og CV; ingen fasit finnes ennå.**
- Vokabularfila ble ikke åpnet under utkastet, og verken tester eller motoren er kjørt på Fixturen.
- Spec satt til `in-progress`, sprint-status 2-11 satt til `in-progress`.
- Stoppet bevisst: `merge when done` er ikke oppfylt. Review, PR og merge er ikke gjort.

### Åpne punkter
- Helene: skriv `data/fixtures/held-out-regnskap-kvale/answer-key.json` for hånd fra `ad.txt` og `cv.txt` (Matched, Missing, score, mustNotMatch, gaps, mustNeverSuggest; schema i `src/shared/core/answer-key.ts`), uten å kjøre motoren. Ikke kjør `vitest` før nøkkelen finnes. Du kan endre annonse og CV først.
- Etter fasiten: kjør `/bmad-build` på spec 2.11 igjen for fase 2 (SM-2, beslutning, dokumentendringer, review, merge).
