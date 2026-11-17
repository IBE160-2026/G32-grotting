# Answer key-gjennomgang for nøkkelordmotoren

## 2026-11-17 kl. 22:23 — Helise-26

### Oppgave
Helene hadde oppdatert `answer-key.json` for alle fire Fixtures (nordic-digital, held-out-regnskap-kvale, nursing-sarvurdering, two-column-fjord-analytics) som mål for nøkkelordmotoren, og ba om en gjennomgang. Deretter: fiks kommaer og score, og kjør testene.

### Plan
- Sjekke at JSON er gyldig og at score følger `round(100 × matched ÷ (matched + missing))` (schema i `src/shared/core/answer-key.ts`).
- Lese hver fasit mot `ad.txt` og `cv.txt`.
- Fikse bare kommaer og score, kjøre `npx vitest run`.

### Resultat
- Gjennomgang: held-out og nursing var ugyldig JSON (manglende komma mellom objekter); score var utdatert i tre filer.
- Fikset (ukommittert, Heleses egne fasit-filer): kommaer i held-out og nursing; score held-out 77→50, nursing 50→31, nordic 64→57; kjørt gjennom prettier.
- `fixtures.test.ts` (fasit-schema og evidence i cv.txt) går grønt. Totalt 11 tester feiler, 534 passerer, i 7 filer: sm2, match/core/analyse, ui, pulse-plot, route, analyse (server), example-parity. Alle feil er motoren mot de nye fasitlistene (motoren gir fortsatt gamle lister), ikke feil i fasitfilene.
- Nordic: «Bachelor i informatikk» ble flyttet til Missing/Rewordable, men CV-en har linjen «Bachelor i informatikk, Høgskolen i Oslo …». Motoren (og `docs/qa/example-pair-manual-checks.md` rad 8) har den som Matched, og da er riktig score 64, ikke 57. Heleses valg, ikke endret.
- Nursing: motoren forventes å matche «pasientjournal», «smertelindring» som Missing osv.; forskjellene står i sm2-testens utskrift.
- `docs/qa/example-pair-manual-checks.md`: Result-kolonnen i FR-3-radene 1–5 er fylt med kopi av «Expected»; Matched-radene 1–9 har ikke dato/tester.

### Åpne punkter
- ~~Avgjør «Bachelor i informatikk»~~ og ~~tilpass motoren~~: løst senere samme dag, se under.
- Verifiser at Result-kolonnen i `example-pair-manual-checks.md` er faktiske resultater og ikke kopi av Expected.

## 2026-11-17 kl. 22:50 — Helise-26

### Oppgave
Helene: sett «Bachelor i informatikk» tilbake til Matched, og deretter «fix the engine and tick the box».

### Plan
- Nordic-fasit: Bachelor tilbake i Matched, score 64.
- Motoren er styrt av `data/vocabulary/nb.json`; tilpass termer og aliaser til de nye fasitene for nordic og nursing, uten å tune mot held-out.

### Resultat
- `example-nordic-digital/answer-key.json`: «Bachelor i informatikk» Matched, fjernet fra Missing og Rewordable, score 64.
- `data/vocabulary/nb.json` (versjon `v1-d3a1887d` → `v1-bbb32bad`):
  - fjernet termene «samarbeid i pull requests» (finnes som «pull requests»), «smertelindring hos eldre» (finnes som «smertelindring»), «dokumenterer i pasientjournal»;
  - «responsive mobil» → «responsive nettsider»; la til «pasientjournal» (alias «journalføring») og «infeksjonsforebygging»;
  - fjernet aliaset «norsk morsmål» på «norskkunnskaper», og aliasene «trykksår» og «diabetessår» på «behandling av trykksår og diabetessår», slik at disse blir Missing som fasiten sier.
- `extract.test.ts`: forventet nordic-term «responsive nettsider» (exact). `docs/qa/example-pair-manual-checks.md`: nye nøkkelordnavn (rad 11–12) og vokabularversjon.
- `npx vitest run`: 545 passert, 2 expected fail (held-out), 0 feil. `tsc --noEmit` og `biome check data src` rene.
- Held-out-fixturen ble ikke brukt til å tune vokabularet; testen er fortsatt `it.fails`. Fjerning av aliaset «norsk morsmål» berører likevel held-out (norskkunnskaper er Missing i fasiten også der). `docs/qa/fr-5b-decision.md` nevner fortsatt den gamle versjonen `v1-d3a1887d` som historikk.
- Kode- og datafilene er ikke committet.

### Åpne punkter
- Helene: sjekk at Result-kolonnen i `docs/qa/example-pair-manual-checks.md` er faktiske resultater (se issues.md).
- Vokabularet er endret etter at held-out ble kjørt; vurder om FR-5b-dokumentet skal få en merknad om ny versjon.
