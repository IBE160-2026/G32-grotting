# Story 2.4: normalise og stem norske ord

## 2026-11-16 kl. 21:37 — Helise-26

### Oppgave
Bygge story 2.4 med `bmad-build`: én pipeline i `keywords/core` som avgjør når to norske ordformer er samme ord, slik at skåren og de senere vaktene er enige. Spesifikasjonen ble godkjent som foreslått, og reviewet skulle kjøres med subagenter. Til slutt skulle det merges.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-2-4-normalise-and-stem-norwegian-words.md` (branch `story/2.4-normalise-and-stem`).
- En subagent implementerte spesifikasjonen. Tre uavhengige reviewere (blind, edge-case, verification-gap) leste diffen.
- Hovedsesjonen triagerte funnene, rettet det som var rettet, og utsatte resten i `deferred-work.md`.

### Resultat
- Nytt i `src/modules/keywords/core/`: `normalise.ts`, `stem.ts`, `index.ts` (eksporterer `normalise`, `stem`, `sameWord`) med tester. Pipeline: NFC + små bokstaver, bindestrek og mellomrom mellom bokstaver fjernes, deretter forsteg for «-er»-former og «-else»-substantiv, deretter Snowball norsk (`@orama/stemmers` 3.1.18, fastpinnet).
- `biome.json`: tillatelseslister for `keywords/core`, `integrity/core` og ny `shared/core`-regel; stemmeren er forbudt utenfor `keywords/core`. 17 nye boundary-fixtures i `test/lint-boundaries.test.ts`. To utsatte punkter fra 1.1 er løst og fjernet fra `deferred-work.md`.
- Commits: 34eea0c (implementasjon), cc12971 (review-rettinger: genitiv av «-else», PDF-ligaturer og retningsmerker, alle 11 bindestrekvarianter testet, \u-escapes i kilden, spec og deferred-work).
- Verifisert lokalt: `biome check`, `npm run typecheck`, `vitest run` (290 tester) grønne. Docker-testen og Playwright ble ikke kjørt lokalt; CI kjører dem på PR-en.
- Fasit-filene ble ikke lest eller endret. Funn ble triagert i spec-ens Review Triage Log; avviste: «-ere»-steget treffer også verb («analysere»), tegnsetting hengende på ord, İ, zod-subpaths.
- `issues.md` var endret ved oppstart av committen ([x] → [X] på flere linjer). Det var ikke jeg som gjorde det; endringen følger med i loggcommiten.

### Åpne punkter
- `normalise` limer sammen alle mellomrom mellom bokstaver, så flerordsuttrykk stemmes bare på siste ord og enkeltbokstavsord limes på («R og Python» → «rogpython»). Story 2.5/2.6 bør matche per ord først og bruke den sammenlimte formen bare for sammensetninger.
- `normalise` fjerner bindestrek ved siden av tall («ISO-27001» ≠ «ISO 27001», «2020-2024» → «20202024»). Avgjør i 2.5/2.6 med et fasit-tilfelle som begrunnelse.
- Relative importer ut av en `core`-mappe (`../../integrity/core` fra `keywords/core`) slipper gjennom tillatelseslistene; samme hull som det eldre punktet om korte relative importer.
- Ingen test viser at `@orama/stemmers/norwegian` løses i Next-bygget eller Docker-imaget; ingen app-kode importerer stemmeren ennå. Sjekk når 2.5 tar den i bruk på serveren.
