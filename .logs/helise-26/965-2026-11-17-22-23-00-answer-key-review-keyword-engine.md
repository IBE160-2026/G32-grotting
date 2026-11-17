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
- Avgjør om «Bachelor i informatikk» i nordic-digital skal være Matched (score 64) eller Missing (57); fasit og motor må stemme.
- Motoren må tilpasses de nye fasitlistene (nordic, nursing; 11 feilende tester), eller fasiten justeres der motoren har rett.
- Verifiser at Result-kolonnen i `example-pair-manual-checks.md` er faktiske resultater og ikke kopi av Expected.
