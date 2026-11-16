# Story 2.1: Example pair Fixture

## 2026-11-16 kl. 14:31 — Helise-26

### Oppgave
Kjør `bmad-build` på story 2.1 (Example pair som første Fixture, med Answer-key-skjema og skript som lager `cv.txt` fra `cv.pdf`).

### Plan
- Satt av 1.8-utkastet og `epic-1-context.md`-endringene i `git stash` ("1.8 draft spec + epic-1-context edits (before 2.1)"), lagde `story/2.1-example-pair-fixture` fra `main`.
- Kompilerte `epic-2-context.md` (fantes ikke).
- Spec: [spec-2-1-write-the-example-pair-fixture-frontend-english-terms.md](../../_bmad-output/implementation-artifacts/spec-2-1-write-the-example-pair-fixture-frontend-english-terms.md).
- Beslutninger fra Helene: Claude skriver utkast til CV og annonse; Helene eksporterer `cv.pdf` selv fra Word/Docs; Helene skriver `answer-key.json` for hånd; én story, spec på ~1800 tokens beholdt.

### Resultat
- Commit `e200a90` på `story/2.1-example-pair-fixture`: `unpdf` 2.1.0 (eksakt) + skript `fixtures:extract`, `src/shared/core/answer-key.ts` (zod-skjema med score-, overlapp-, gap- og must-never-suggest-regler, pluss `fixtureMetaSchema`), `scripts/extract-fixture-cv.ts`, `src/shared/core/answer-key.test.ts` og `fixtures.test.ts`, og `data/fixtures/example-nordic-digital/{ad.txt,cv.txt,meta.json}` (KI-utkast).
- Verifisert lokalt: biome, tsc og 180 av 181 tester grønne. `extractCvText` og avvikstesten er prøvd mot en håndlaget PDF. Docker-kjøringen (`docker compose run --rm --build test`) er ikke kjørt.
- Den ene røde testen er med vilje: «example-nordic-digital has nothing wrong» feiler med `answer-key.json is missing`.
- Svaret (fasit) er IKKE skrevet av Claude. Annonsen og CV-en er KI-utkast; Helene skriver `answer-key.json` selv.
- Ingen uavhengige review-subagenter ble kjørt (ikke bedt om); egenvurdering ligger i spec-ens Review Triage Log.
- Spec står som `in-review` og sprint-status som `review`, ikke `done`, fordi akseptansen krever Helenes to filer.

### Åpne punkter
- Helene: les og rediger utkastene `cv.txt` og `ad.txt`, lag single-column `cv.pdf` av CV-teksten, kjør `npm run fixtures:extract`, og skriv `answer-key.json` for hånd. Så grønn test, og spec/sprint-status til `done`.
- Story 2.7 må avrunde score likt (`Math.round`, .5 opp) som Answer-key-skjemaet.
- `git stash` inneholder 1.8-utkastet og `epic-1-context.md`-endringene; hent dem tilbake med `git stash pop` på 1.8-grenen.
