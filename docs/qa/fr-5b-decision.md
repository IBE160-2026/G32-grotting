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

## Later change to the vocabulary (2026-11-17)

After this decision, PR #36 changed `data/vocabulary/nb.json` from `v1-d3a1887d` to `v1-bbb32bad`. The change aligned the nordic and nursing Fixtures with their updated Answer keys: the fixture-fitted terms «samarbeid i pull requests», «responsive mobil», «smertelindring hos eldre» and «dokumenterer i pasientjournal» were renamed or removed, «pasientjournal» and «infeksjonsforebygging» were added, and three aliases that made Missing keywords match («norsk morsmål», «trykksår», «diabetessår») were removed. The held-out Fixture was not used to tune any of it. The run and the 13 differences above are from `v1-d3a1887d` and are kept as they were; the held-out list test is still an expected failure.

## Later change to the held-out Answer key (2026-11-17)

After the decision, commit `a518058` (PR #36) changed `data/fixtures/held-out-regnskap-kvale/answer-key.json`. Helene's reason: it fixed mistakes in the key (invalid JSON, outdated score), not a change of mind about what counts as Matched or Missing. The numbers moved: Matched 10 → 7 («utdanning innen regnskap», «norskkunnskaper» and «årsavslutning og skatteoppgjør for aksjeselskaper» moved to Missing or were split, «avstemming av bank og reskontro» became «reskontro»), Missing 3 → 7, score 77 → 50, three more Rewordable gaps, «skatteoppgjør» added as a Real gap, and «lønn» added as must-not-match. The sentence above that the key's content was not changed after the run holds only up to commit `2598b06`; the 13 differences listed earlier were computed against the key before `a518058`.

Re-check on 2026-11-18, vocabulary `v1-bbb32bad`, current key: the engine extracts 8 Keywords (Matched: regnskap, skatt og avgift, Visma, Excel; Missing: bachelor i økonomi, rapportering, Power BI, norskkunnskaper). Altinn, mva-oppgjør, lønnskjøring, regnskapsmedarbeider, reskontro and bokføring are in the key and are not extracted from the ad. The held-out list test still fails, so **FR-5b still applies**. Helene decided on 2026-11-18 that Story 3.11 uses this same held-out Fixture, with the key as it stands.


## Story 3.11: the AI lists are recorded (2026-11-20)

FR-5b is built: for a new Job ad one `runAi` request proposes the Keyword list, every term must be found in the ad by the Keyword engine (`proposeKeywords`, which uses `findKeyword`) or it is dropped, and the list is saved in `keyword_lists` under `contentHash(canon(ad))`. Without the accepted notice, at the cap, on a failed request, or in Test mode for an ad that is not a Fixture, the code-only list is used and marked `code-fallback`.

Recording: `npm run fixtures:record -- <id> --keywords`, once per Fixture (4 paid requests in all, no retries), model `anthropic/claude-sonnet-5.5` through OpenRouter, prompt version `keywords-1`. The files are `data/fixtures/<id>/cached/keywords.json`, raw and unedited. The held-out Fixture was recorded with the same prompt as the others, and the prompt was not tuned against any Answer key.

| Fixture | Proposed | Kept after the ad check | Dropped | Score on the AI list | Score in the Answer key |
| --- | --- | --- | --- | --- | --- |
| `example-nordic-digital` | 19 | 19 | none | 63 % | 64 % |
| `held-out-regnskap-kvale` | 20 | 20 | none | 40 % | 50 % |
| `nursing-sarvurdering` | 17 | 17 | none | 41 % | 31 % |
| `two-column-fjord-analytics` | 14 | 11 | «produktanalyse», «bachelor i statistikk», «bachelor i informatikk» | 82 % | 67 % |

What this says, for Helene to judge:

- **The AI lists do not equal any Answer key.** The keys were written against what the vocabulary can find, and the AI picks other words (for example «frontendutvikler», «sprinter» and «retrospektiv» in the Example ad, which the key lists as «Agile» or marks must-not-match). The held-out list does not reach the key either: the AI proposes «regnskap», «fagskole» and «regnskapssystem» that the key does not list, and splits «avstemming av bank og reskontro» and «skatteoppgjør for aksjeselskaper» into longer phrases than the key's «reskontro» and «skatteoppgjør».
- **The held-out test stays an expected failure.** `sm2.test.ts` and `analyse.test.ts` test the code-only engine against the Answer key, and that engine is unchanged, so the marker stays. The vocabulary and the Answer keys were not changed.
- **In Test mode the Example pair therefore shows the AI list (63 %), not the Answer key's 64 %.** The e2e tests take the Example counts from the Cached list through the Keyword engine (`e2e/support/application.ts`), and the code-only counts from the Answer key for the one server that has the fallback off. SM-1's «score equals the Answer key» is only true for the code-only list. Decision needed: keep the Answer key as the oracle for code, and accept that a saved list is judged by its own checks (every term in the ad, the same list and score on a second run), or write a second key for the saved lists.
- Cost: 4 short requests (the ad only, no CV). The spend was not read back from OpenRouter; it is expected to be a few cents in all.
