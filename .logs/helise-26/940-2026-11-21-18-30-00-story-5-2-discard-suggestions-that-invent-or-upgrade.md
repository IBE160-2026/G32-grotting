# Story 5.2: discard suggestions that invent or upgrade

## 2026-11-21 kl. 18:30 — Helise-26

### Oppgave
Del av autonom Epic 5-kjøring (`goal.md`): FR-17-steget som forkaster omformuleringsforslag som nevner et annet Missing-ord eller bruker et Upgrade-ord som CV-oppføringen ikke har.

### Plan
- Blokkerende underagent med `bmad-build-auto` på `story/5-2-discard-suggestions-that-invent-or-upgrade`; spec: `_bmad-output/implementation-artifacts/spec-5-2-discard-suggestions-that-invent-or-upgrade.md`. Ingen live-kall.

### Resultat
- PR #85, merge-commit `d9ebe92` (storycommit `9d06b3e`); `ci` grønn; `sprint-status.yaml` 5-2 `done`, `epic-5` uendret `in-progress`.
- `integrity/core/check-suggestion.ts` (`checkSuggestion`, eksportert via `index.ts`): forkaster forslag med annet Missing-ord (alias, store/små bokstaver, bøyning) eller Upgrade-ord CV-oppføringen mangler; `UPGRADE_WORD_SAME_FORMS` i `word-lists.ts` (forsket/forsker/forskning); `stem-runs.ts` delt hjelper (brevsjekken uendret).
- FR-17-steg i `gaps/server/analyse.ts` etter struktur og FR-15; forkastet forslag blir `null` med sitat og forklaring urørt; logger `{kind:"gaps", downgraded, discarded}` (bare tall). Ruta sender vokabularet videre.
- Planted svar i `data/fixtures/_planted/gaps-fr17-*.json` (forsket forkastes, «Kompetanse i sårvurdering» beholdes, annet Missing-ord forkastes).
- Innspilte `gaps-3`-forslag gjennom FR-17: 0 forkastet; beholdt Example 6, regnskap-kvale 5, nursing 5, Fjord 0 (låst av test).
- `npm test` grønn (1363 Vitest, 228 Playwright), typecheck og Biome grønne, docker-suiten grønn på andre kjøring (første: kjent flaky «route.fetch: Test ended»). Reviewlag: 5 patcher (1 medium: test av at ruta sender vokabularet; 4 lave).
- Avvik: underagenten implementerte inline; reviewlagene startet i bakgrunnen, men triage ventet på alle fire. `vocabulary` er valgfri på `analyseGaps`; ekstra sikring `NO_CITED_ENTRY` (forkaster ved Upgrade-ord hvis ingen oppføring inneholder sitatet).
- Lukket i `issues.md`: «Story 5.1: legg forslaget til prompten … FR-17».

### Åpne punkter
- Fixture-CV-ene har ingen blanke linjer, så `cvEntries` gir hele CV-en som én oppføring; entry-avgrensningen virker bare for CV-er med blank-linje-delte oppføringer.
- FR-17 ser ikke oppfunnede fakta utenfor Missing-lista (tall, arbeidsgivere, verb som «utviklet», «drev», «koordinerte») eller Upgrade-ord utenfor lista med fem ord; «med fokus på tilgjengelighet», «som var interessent i prosjektet» og «Fulgte med på legemiddelhåndtering i praksis» slipper gjennom (Helenes G-sjekker).
- Bare «forsket» har ekstra former i `UPGRADE_WORD_SAME_FORMS`; «ledelse», «publikasjon», «grunnlegger» er ikke dekket.
- `vocabulary` kan glemmes av en framtidig kaller av `analyseGaps`, og aliassøket svekkes da stille.
- Lengdesjekk av forslag (25 ord, én linje, ingen anførselstegn) gjøres av ingen kode; vurder i 5.3 eller Helenes sjekker.
