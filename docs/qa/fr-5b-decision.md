# FR-5b: does code alone extract Keywords well enough?

Story 2.11 (FR-5, FR-5b, SM-2, NFR-10, PRD Open questions 2 and 6). **Decision: not yet taken.** Helene has seen the result below and wants to look at the failures before confirming. Nothing in the PRD, epics or architecture has been changed.

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

## Decision

Open. Under the story's rules, SM-2 failing on any Fixture means FR-5b applies (the FR-5b table is written into FR-8, NFR-4, P6, NFR-8, FR-24, FR-25, FR-27 and NFR-6, the change is logged in PRD §11, Story 3.11 is kept). Passing on every Fixture would delete FR-5b instead.

| Date | Decided by | Outcome | Note |
| --- | --- | --- | --- |
|  |  |  |  |
