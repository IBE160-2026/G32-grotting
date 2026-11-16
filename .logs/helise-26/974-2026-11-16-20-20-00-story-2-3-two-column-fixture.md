# Story 2.3: Two-column Fixture

## 2026-11-16 kl. 20:20 — Helise-26

### Oppgave
Kjør `bmad-build` på story 2.3 (Fixture med tospalte-PDF, delte sammensetninger og «prosjektledelse»-caset for UJ-2-annonsen, Junior produktanalytiker hos Fjord Analytics).

### Plan
- Gjenbrukte `epic-2-context.md` (gyldig) og spec 2.2 som kontinuitet. Arbeidstreet var rent på `main` (34439d3); lagde `story/2.3-two-column-fixture`.
- Spec: [spec-2-3-write-the-two-column-fixture-split-compounds-prosjektledelse.md](../../_bmad-output/implementation-artifacts/spec-2-3-write-the-two-column-fixture-split-compounds-prosjektledelse.md). Dispatch-rute. Helene godkjente spec-en («Approve and continue»).
- Beslutninger videreført fra 2.1/2.2: Claude skriver utkast til annonse, CV og meta; Helene eksporterer `cv.pdf` i to spalter, kjører `npm run fixtures:extract` og skriver `answer-key.json` for hånd. Claude foreslår ikke om «prosjektledelse» er Rewordable eller Real gap.
- Ekstra vakt i spec-en: CV-en skriver heller ikke «prosjektleder», «prosjektlederen» eller «prosjektledere», fordi stemmeren gir samme stamme som «prosjektledelse».

### Resultat
- Commit `934c967` på `story/2.3-two-column-fixture`: `data/fixtures/two-column-fjord-analytics/{ad.txt,cv.txt,meta.json}` (Fjord Analytics, «Junior produktanalytiker»; CV for Ingrid Moen), spec-filen og sprint-status (`2-3` → `review`). Ingen kodeendringer.
- Utkast-CV-en (i tospalte-leserekkefølge) har «Data analyse» (delt sammensetning for «dataanalyse»), «datamodellene», «dashbordene», «rapporten», «dataene» og et alenestående «ledelse» («Organisasjon og ledelse»). Prosjektoppføringen er nøytral: oppgavene ble delt og gruppen møttes hver uke, uten angitt planleggings- eller koordineringsrolle. Verken «prosjektledelse», «prosjekt ledelse», «prosjektleder*» eller «python» står i CV-en.
- Verifisert: biome grønn; `fixtures.test.ts` 8 grønne og 1 rød med vilje (`two-column-fjord-analytics has nothing wrong (SM-2)` melder `answer-key.json is missing`). Docker-kjøringen er ikke kjørt.
- Fasiten er IKKE skrevet av Claude. Annonsen, CV-teksten og meta er KI-utkast; Helene skriver `answer-key.json` selv.
- Ingen uavhengige review-subagenter ble kjørt (ikke bedt om); egenvurdering ligger i spec-ens Review Triage Log (fem funn, alle `low`, ingen endringer).
- Spec står som `in-review` og sprint-status som `review`, ikke `done`, fordi akseptansen krever Helenes PDF og fasit.

### Åpne punkter
- Helene: les og rediger utkastene, lag `cv.pdf` i to spalter og kjør `npm run fixtures:extract` (den overskriver `cv.txt`). Kontroller at minst én linje blir stokket, og at «prosjektledelse», «prosjekt ledelse» og «prosjektleder*» fortsatt ikke står i `cv.txt`. Skriv deretter `answer-key.json` for hånd («prosjektledelse» som Rewordable eller Real gap med begrunnelse, «ledelse» som must-not-match). Evidens i fasiten må siteres fra `cv.txt` slik den ble hentet ut, ikke fra utkastet. Så grønn test, og spec/sprint-status til `done`. Sesjonsloggen for den økten må si at du skrev fasiten selv.
- Story 2.3 er ikke pushet og har ingen PR ennå (branch `story/2.3-two-column-fixture`).
