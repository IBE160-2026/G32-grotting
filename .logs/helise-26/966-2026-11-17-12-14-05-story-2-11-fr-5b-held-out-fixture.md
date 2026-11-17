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

## 2026-11-17 kl. 17:12 — Helise-26 (fortsettelse, fase 2)

### Oppgave
Fortsette 2.11 etter at Helene hadde skrevet fasiten for hånd: kjøre SM-2, ta FR-5b-beslutningen, endre planleggingsdokumentene, review med subagenter, PR og merge.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-2-11-decide-whether-code-alone-extracts-keywords-well-enough.md` (Fail-grenen).
- Sjekke fasiten mot schemaet (uten motoren), committe den, så første motorkjøring. Helene bekrefter beslutningen. Deretter dokumentendringer, tre reviewere (Blind Hunter, Edge Case Hunter, Verification Gap), PR og merge.

### Resultat
- Fasiten (skrevet av Helene for hånd, rettet etter fire sjekker) ble committet før første motorkjøring: `5bf585e`. Biome formaterte bare mellomrom i fila (parset innhold sjekket likt).
- SM-2: de tre tunede Fixtures består, den held-out feiler med 13 avvik (Altinn, lønnskjøring, mva-oppgjør og bokføring er bokstavelig i annonsen og blir ikke hentet ut). Helene bekreftet «FR-5b gjelder». Notat: `docs/qa/fr-5b-decision.md` (`1c3b07e`).
- Planleggingsdokumenter (`3590388`): PRD (FR-5b gjelder, FR-8, NFR-4, SM-7, P6, NFR-8, FR-24, FR-25, FR-27, UJ-3, NFR-6, D24, OQ2 løst), epics (Story 3.11 beholdt), arkitekturspine, `docs/architecture.md`, EXPERIENCE.md, addendum og PRD `.memlog.md` (U24). `FEATURE_KEYWORD_FALLBACK` er fortsatt av.
- Review (tre subagenter): viktigste funn var at held-out-testen ville gjøre CI rød. Rettet i `2598b06`: begge listetestene (`sm2.test.ts`, `analyse.test.ts`) har held-out som forventet feil (`it.fails`). Foreldede «only if FR-5b applies» og UX-tekster rettet. Detaljer i spekkens Review Triage Log.
- Verifisert: `biome check`, `typecheck`, `vitest run` (54 filer, 545 bestått, 2 forventet feil). Docker kjørt ikke.
- Ikke committet og ikke med i denne storyen: Helenes endringer i `docs/qa/example-pair-manual-checks.md` (2.10-sjekkene).

### Åpne punkter
- Helene: vurder svake `mustNotMatch` («med», «regnskapssystemet») og tom `mustNeverSuggest` i held-out-fasiten, og om noen Matched-nøkkelord (f.eks. «utdanning innen regnskap», «norskkunnskaper») er for frie parafraser. Endrer ikke beslutningen (se `docs/qa/fr-5b-decision.md`).
- Story 3.11: fjern `expectedToFail`-oppføringen for held-out i `sm2.test.ts` og `analyse.test.ts` når listene stemmer; avklar hva som skjer når Studenten ikke godtar KI-varselet (FR-24 sier at varselet må godtas, FR-5b faller tilbake til kodeliste); regn kostnaden på nytt i `docs/architecture.md` for den tredje forespørselen.
- Produktbeslutning ikke tatt: Daglig tak på 30 forespørsler gir nå 10 nye søknader per dag (3 forespørsler per søknad), ikke vurdert på nytt.
- Ikke verifisert: `docker compose run --rm --build test` og e2e for 2.11.
