# FR-5b: does code alone extract Keywords well enough?

Story 2.11 (FR-5, FR-5b, SM-2, NFR-10, PRD Open questions 2 and 6). **Decision (Helene, 2026-11-17): FR-5b applies.** Helene first looked at the failures below, then confirmed.

## Run

- Date: 2026-11-17
- Vocabulary: `data/vocabulary/nb.json`, version `v1-d3a1887d` (not changed in this story)
- Command: `npx vitest run src/modules/keywords/core/sm2.test.ts src/shared/core/fixtures.test.ts`
- Order of events: the held-out Fixture's ad and CV were drafted (commit `649ac82`), Helene wrote `answer-key.json` by hand, it was committed (`5bf585e`), and only then was the engine run on it. The vocabulary was tuned against the other three Fixtures before the held-out Fixture existed.

## SM-2 per Fixture (Matched and Missing lists equal the Answer key)

| Fixture | Lists equal the Answer key | Second run identical (NFR-6) | Must-not-match terms |
| --- | --- | --- | --- |
| `example-nordic-digital` | yes | yes | none matched |
| `nursing-sarvurdering` | yes | yes | none matched |
| `two-column-fjord-analytics` | yes | yes | none matched |
| `held-out-regnskap-kvale` | **no, 13 differences** | yes | none matched |

Test files: 27 of 28 tests pass; the one failure is the held-out list test.

## Differences on the held-out Fixture

Written as the test prints them (words are compared without spaces and punctuation).

Answer key says Matched, the engine does not extract it from the ad (7):
- utdanning innen regnskap
- Altinn
- mva-oppgjør
- årsavslutning og skatteoppgjør for aksjeselskaper
- lønnskjøring
- regnskapsmedarbeider
- avstemming av bank og reskontro

Answer key says Missing, the engine does not extract it (2):
- automatisering av rutiner
- bokføring

The engine extracts and Matches, but the Answer key does not list it (2): regnskap, skatt og avgift.

The engine extracts and marks Missing, but the Answer key does not list it (2): bachelor i økonomi, rapportering.

Reading of the pattern (for Helene to judge, not a conclusion): 9 of the 13 differences are Answer-key Keywords the vocabulary has no entry for, including words that are in both the ad and the CV (Altinn, lønnskjøring, mva-oppgjør). The accounting field is outside what the vocabulary was tuned on. Some Answer-key Keywords are longer phrases than a vocabulary term, and the key's phrasing is a choice that also shapes the result.

## Does the failure depend on how the key is phrased?

Raised in review, checked against `ad.txt` and `cv.txt`. Some Answer-key Keywords are not literal CV strings («utdanning innen regnskap» against «Fagskole i regnskap og økonomi», «norskkunnskaper» against «Norsk (morsmål)», «årsavslutning og skatteoppgjør for aksjeselskaper» against «Årsregnskap … aksjeselskaper»), and several are long phrases. If those entries are set aside, the failure still stands: **Altinn, lønnskjøring and mva-oppgjør** are written exactly the same way in the ad and the CV, and the engine does not extract them from the ad. **bokføring** is in the ad and is not extracted either. The decision therefore does not rest on the key's phrasing alone. The key's content was not changed after the run, by the held-out rule (only its whitespace was reformatted by Biome, with the parsed content checked equal).

Weak negative cases in the key (`mustNotMatch` «med», «regnskapssystemet») and an empty `mustNeverSuggest` are Helene's to revise in a later story; they do not change the lists.

## The held-out test stays in the suite

`src/modules/keywords/core/sm2.test.ts` and `src/modules/match/core/analyse.test.ts` mark the held-out Fixture's list test as an expected failure (`it.fails`), so CI stays green and the failure is pinned. It turns red the day the lists agree, which is the cue to remove the marker; Story 3.11 (saved Keyword lists) is where that is expected.

## Decision

SM-2 failed on one Fixture, so under the story's rules FR-5b applies. Changes made for it (commit message names the IDs): FR-5b written into FR-8, NFR-4, SM-7, P6, NFR-8, FR-24, FR-25, FR-27, UJ-3 and NFR-6; Open question 2 resolved; D24 logged in PRD §11; Story 3.11 kept; `FEATURE_KEYWORD_FALLBACK` stays off until Story 3.11 switches it on. The vocabulary was not changed to make the held-out Fixture pass.

| Date | Decided by | Outcome | Note |
| --- | --- | --- | --- |
| 2026-11-17 | Helene | FR-5b applies | After reading the 13 differences above |
