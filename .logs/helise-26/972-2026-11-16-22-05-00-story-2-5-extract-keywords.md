# Story 2.5: trekk ut nøkkelord fra annonsen med et versjonert vokabular

## 2026-11-16 kl. 22:05 — Helise-26

### Oppgave
Bygge story 2.5 med `bmad-build`: et versjonert vokabular og en ren `extractKeywords(adText, vocabulary)` som gir de samme nøkkelordene hver gang, uten KI (FR-5, NFR-6). Anbefalt spec skulle brukes, reviewet skulle kjøres med subagenter, og grenen skulle merges til slutt.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-2-5-extract-keywords-from-the-job-ad-with-a-versioned-vocabulary.md` (branch `story/2.5-extract-keywords`).
- En subagent implementerte spesifikasjonen. Tre uavhengige reviewere (blind, edge-case, verification-gap) leste diffen; samme subagent la inn rettingene.
- Hovedsesjonen triagerte funnene (se Review Triage Log i spec-en) og førte det utsatte i `deferred-work.md`.

### Resultat
- Nytt: `data/vocabulary/nb.json` (255 termer, 62 med aliaser, versjon `v1-4268793b`), `shared/core/vocabulary.ts` (zod-skjema), `keywords/core/tokenise.ts` og `extract.ts`, `shared/server/data-files.ts` (`loadVocabulary`), `outputFileTracingIncludes` for `/api/**` i `next.config.ts`, tester ved hver fil.
- `extractKeywords` returnerer `Result<Keyword[], "TOO_FEW_KEYWORDS">`; hvert nøkkelord har trinn (`exact`/`inflection`/`compound`/`alias`) og posisjoner `{ paragraph, start, end }`. Trangere spenn: mellomrom, bindestrek eller én enslig `.`/`/` er eneste tillatte mellomrom mellom ord, og et spenn droppes når samme nøkkelord finnes i et mindre spenn inni det.
- Review-rettinger: komma/punktum/linjeskift stopper et spenn, «sykehjem er» og «REST API-er» gir tette posisjoner, `Object.hasOwn` på aliaser, «HTML+CSS», CR og NBSP-linjer, bedre feilmeldinger fra lasteren, fixture-tester med forventede termer, trinn og posisjonstekst. Aliaset «helse, miljø og sikkerhet» på HMS ble fjernet.
- Commit: 074e44f (implementasjon og rettinger). Verifisert lokalt: `npm test` (biome, typecheck, 366 vitest-tester og 91 Playwright-tester) grønt. `docker compose run --rm --build test` ble ikke kjørt lokalt; CI kjører den på PR-en.
- Fasit-filene ble ikke lest inn i tester. KI skrev vokabularlista (255 termer) og alle tester; fasiten er fortsatt skrevet av Helene.
- Løste punkter fra story 2.4: «R og Python»-liming (nå per ord) og «ISO-27001» mot «ISO 27001» (tokeniseringen deler på bindestrek).

### Åpne punkter
- Helene har ikke gjennomgått vokabularlista (`data/vocabulary/nb.json`); KI valgte termer og aliaser (blant annet `trykksår`, `diabetessår`, `dobbeltkontroll`, `tilgjengelighet`). Les og stram inn før 2.7.
- Uttrekket er ikke sammenlignet med fasitene i noen test. Manuell kjøring finner hovedtermene, men også ekstra (infeksjonsforebygging, autorisasjon, sykehjem, dashbord, frontend, webutvikling, stakeholder) og bommer på frasenøkkelord som «skriver rapporter» og «responsive mobil». Tuning er story 2.7 og 2.11, og krever ny `vocabularyVersion`.
- Norsk ESCO-liste som reserve i vokabularet er ikke med (utsatt til 2.11 hvis kode alene ikke holder).
- `tokenise` deler ord ved bløt bindestrek og nullbredde-tegn, så PDF-ekstrahert CV-tekst kan bomme; håndteres i story 2.6.
- Noen vokabularord er tvetydige i løpende tekst («Spark», «Swift», «Lean», «Ruby», «salg»), og det mangler myke ferdigheter og Office-termer.
- Ikke verifisert: `@orama/stemmers/norwegian` løses i Next-bygget og Docker-imaget (ingen rute importerer motoren før story 2.7); `outputFileTracingIncludes` på Vercel.
