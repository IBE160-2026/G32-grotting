# Story 4.2: sjekk hver sitering mot CV-teksten

## 2026-11-20 kl. 18:30 — Helise-26

### Oppgave
Autonom kjøring (`goal.md`), Story 4.2: en Rewordable gap vises bare når siteringen står ordrett i CV-en (FR-15).

### Plan
- Gren `story/4.2-check-every-citation-against-the-cv-text` fra oppdatert `main` (etter 4.1). Spec: `_bmad-output/implementation-artifacts/spec-4-2-check-every-citation-against-the-cv-text.md`.

### Resultat
- Commit `2deb471` (merget som PR #73, `ci` grønn på 6m31s). `npm test` og `npm run typecheck` grønne; `docker compose run --rm --build test` grønn (rører `data/`): Vitest 1182 bestått, 2 forventet feil, 1 hoppet over; Playwright 201.
- Nytt: `src/shared/core/canon-verbatim.ts` (bare store/små bokstaver og mellomrom, ingen NFC, ingen tegnsettfolding), `integrity/core/{check-citation,cv-entries}.ts` (`cvEntries` bygger på `splitParagraphs`; ingen annen CV-oppføringsdeler finnes i koden), FR-15-steget `checkGapCitations` i `gaps/server/analyse.ts` etter strukturtrinnet (nedgradert gap blir mal-Real gap, bare et tall logges, `GapsLogEvent` i `log.ts`), fire planted-svar i `data/fixtures/_planted/` (omskrevet, fra annonsen, ett endret ord, riktig sitering med annen casing/linjeskift).
- Review: fire review-underagenter, to rettelser; ett funn utsatt (se under). Ord-grense- og minstelengde-ideene ble avvist (nye regler utenfor AC).
- `FEATURE_GAPS` er ikke slått på noe sted. Ingen live KI-kall. Hosted ikke rørt.

### Åpne punkter
- 4.3: følg med på nedgraderingstallet ved innspilling; høyt tall betyr prompt-rettelse og ny `PROMPT_VERSION`, ikke løsere `canonVerbatim`.
- Ekte sitater kan nedgraderes av PDF-artefakter eller sitattegn KI-en legger til (ubekreftet).
- Hoppet over eller ubrukelige elementer fra strukturtrinnet telles ikke (AD-14 nevner bare FR-15-nedgraderinger).
