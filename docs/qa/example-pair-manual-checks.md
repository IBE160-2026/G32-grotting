# Example pair: manual checks (FR-3, FR-8)

Story 2.10 (FR-27, FR-3, FR-8). The automated tests prove that `cv.pdf`, `cv.txt` and «Bruk eksempelet» give the same canon text, score, lists and fingerprint (`src/modules/application/server/example-parity.test.ts`). Two things only a person can judge are recorded here. **Nothing below is a result until Helene has done the check and filled in the Date, Tester and Result columns.** A blank Result means open, not passed.

How to run: `npm run dev`, open `/soknad`. Use a fresh tab, so no old session values are in the form.

## FR-3: the extracted CV text can be corrected and the analysis uses the correction

The two-column Fixture is the one where the PDF reader scrambles lines.

| # | Date        | Tester  | Steps                                                                                                                                                                                                                               | Expected result                                                                                                                                                                                       | Result                                                                                                                                                                                                 |
| - | ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | 2026-11-17  | Helene  | On Søknad press «Velg fil» and choose `data/fixtures/two-column-fjord-analytics/cv.pdf`.                                                                                                                                       | The CV text field fills with the extracted text, unconfirmed, with focus in the field. «Bekreft CV-teksten» is shown. Some lines are in the wrong order or run together.                            | The CV text field fills with the extracted text, unconfirmed, with focus in the field. «Bekreft CV-teksten» is shown. Some lines are in the wrong order or run together.                             |
| 2 | 2026-11-17  | Helene  | Fix the scrambled lines by hand in the CV text field (put each line back where it belongs; for example a heading that landed in the middle of another section).                                                                     | The field keeps your edits. The counter updates. The text still counts as unconfirmed.                                                                                                                | The field keeps your edits. The counter updates. The text still counts as unconfirmed.                                                                                                                 |
| 3 | 2026-11-17  | Helene  | Fill Stillingstittel and Arbeidsgiver from `meta.json` in the same folder (Junior produktanalytiker, Fjord Analytics) and paste `ad.txt` into Stillingsannonse. Press «Analyser og skriv utkast» **before** confirming. | The submit is blocked with «Bekreft CV-teksten før du går videre.», focus goes to the CV field, and no result appears.                                                                            | The submit is blocked with «Bekreft CV-teksten før du går videre.», focus goes to the CV field, and no result appears.                                                                             |
| 4 | 2026-11-17  | Helene  | Press «Bekreft CV-teksten», then «Analyser og skriv utkast».                                                                                                                                                                    | The slot collapses to «CV-tekst bekreftet · N tegn». The result appears. A Matched keyword whose line you corrected shows the corrected line under «Bevis · CV-linje N», not the scrambled one. | The slot collapses to «CV-tekst bekreftet · N tegn». The result appears. A Matched keyword whose line you corrected shows the corrected line under «Bevis · CV-linje N», not the scrambled one.  |
| 5 | 2026-11-17  | Helene  | Press «Endre annonsen», then «Endre CV-teksten», and change one character in the text.                                                                                                                                          | «Bekreft CV-teksten» is shown again: the confirmation dropped with the edit.                                                                                                                        | «Bekreft CV-teksten» is shown again: the confirmation dropped with the edit.                                                                                                                         |

## FR-8: the Example pair result is correct line by line

Values taken on 2026-11-17 with vocabulary version `v1-bbb32bad` (`data/vocabulary/nb.json`). If the vocabulary version or the Example Fixture has changed since, the pre-filled text may be out of date: compare against what the page shows, not the pre-filled text.

Steps for every row: open Søknad, press «Bruk eksempelet», press «Analyser og skriv utkast». Expected before you begin: «64 % samsvar – 9 av 14 nøkkelord», Verdict «Bør forbedres» (the Answer key in `data/fixtures/example-nordic-digital/answer-key.json`).

The «What the engine shows» column was copied from a real run of the engine on 2026-11-17 (the same code the route runs). It is **not** a check by a person. For each row, read the CV line (Matched) or the ad line (Missing) on the page and decide whether the line really shows that Keyword, and whether the ad paragraph is the right one. Write the date, your name and OK or the problem in Result.

Matched keywords, 9, each with its Evidence line in the CV:

| # | Date | Tester | Keyword                 | What the engine shows                                                                                                      | Is the line the right Evidence? Result |
| - | ---- | ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1 |      |        | junior frontendutvikler | Bevis · CV-linje 2 · annonsen avsnitt 01: «Junior frontendutvikler»                                                    | ok                                     |
| 2 |      |        | Agile                   | Bevis · CV-linje 15 · annonsen avsnitt 03: «- Programvareutvikling: Agile og Scrum i praksis, med to ukers sprinter»   | ok                                     |
| 3 |      |        | React                   | Bevis · CV-linje 12 · annonsen avsnitt 04: «- Webutvikling 2: React og komponenter. Bygde en liten app med state og»   | ok                                     |
| 4 |      |        | HTML                    | Bevis · CV-linje 10 · annonsen avsnitt 04: «- Webutvikling 1: HTML, CSS og JavaScript. Bygde en nettside som»          | ok                                     |
| 5 |      |        | CSS                     | Bevis · CV-linje 10 · annonsen avsnitt 04: «- Webutvikling 1: HTML, CSS og JavaScript. Bygde en nettside som»          | ok                                     |
| 6 |      |        | Git                     | Bevis · CV-linje 25 · annonsen avsnitt 04: «- Vi brukte Git og GitHub, og alle endringer ble gjennomgått av et annet» | ok                                     |
| 7 |      |        | universell utforming    | Bevis · CV-linje 17 · annonsen avsnitt 04: «- Brukeropplevelse: Prototyping i Figma og universell utforming av»        | ok                                     |
| 8 |      |        | bachelor i informatikk  | Bevis · CV-linje 8 · annonsen avsnitt 04: «Bachelor i informatikk, Høgskolen i Oslo (fiktiv), 2023–2026»             | ok                                     |
| 9 |      |        | Figma                   | Bevis · CV-linje 17 · annonsen avsnitt 05: «- Brukeropplevelse: Prototyping i Figma og universell utforming av»        | ok                                     |

Missing keywords, 5, each with the ad line it comes from:

| #  | Date       | Tester | Keyword                   | What the engine shows                                                                                          | Is it really missing from the CV, and is the ad line right? Result |
| -- | ---------- | ------ | ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 10 | 2026-11-17 | Helene | TypeScript                | Fra annonsen · avsnitt 04: «Annonsen ber om «TypeScript». CV-en din viser det ikke ennå.»                | ok                                                                 |
| 11 | 2026-11-17 | Helene | responsive nettsider          | Fra annonsen · avsnitt 04: «Annonsen ber om «responsive nettsider». CV-en din viser det ikke ennå.»          | ok                                                                 |
| 12 | 2026-11-17 | Helene | pull requests | Fra annonsen · avsnitt 04: «Annonsen ber om «pull requests». CV-en din viser det ikke ennå.» | ok                                                                 |
| 13 | 2026-11-17 | Helene | testing                   | Fra annonsen · avsnitt 04: «Annonsen ber om «testing». CV-en din viser det ikke ennå.»                   | ok                                                                 |
| 14 | 2026-11-17 | Helene | REST API                  | Fra annonsen · avsnitt 04: «Annonsen ber om «REST API». CV-en din viser det ikke ennå.»                  | ok                                                                 |

Notes for the tester:

- The paragraph numbers are the engine's (the ad's paragraphs counted from 01). Check against `data/fixtures/example-nordic-digital/ad.txt`.
- The Answer key spells two terms in another case (`REACT`, `GIT`) and one with a hyphen (`REST-API`); the engine shows the form it found in the ad. The automated Answer key test (SM-2) compares the lists; if you see a real difference in what a line proves, record it.
- Any wrong line is a finding for Story 2.11 (FR-5b) and the vocabulary, not something to fix in this story.
