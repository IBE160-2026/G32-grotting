---
title: 'Story 2.3: Write the two-column Fixture (split compounds, «prosjektledelse»)'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: '34439d31ef2760ffa642621668a15b319acac98e'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No Fixture has a two-column PDF CV, split compounds or the brief's «prosjektledelse» case. PDF correction (FR-3), compound matching (FR-6) and the hardest Rewordable-gap judgement have nothing to be tested against.

**Approach:** Add the third Fixture, `data/fixtures/two-column-fjord-analytics/` (`ad.txt`, `meta.json`, `cv.pdf`, `cv.txt`, `answer-key.json`) for the UJ-2 ad, Junior produktanalytiker at Fjord Analytics. It reuses the Answer-key schema, the Fixture test and `extract-fixture-cv.ts` from 2.1; no code changes. Covers FR-28, FR-3, FR-6, SM-2.

## Boundaries & Constraints

**Always:**
- Branch `story/2.3-two-column-fixture` off `main`. Commits cite `2.3` and the IDs. Stage by explicit path.
- Helene writes `answer-key.json` by hand. Claude never drafts, suggests or pre-fills any Answer-key content, including in tests, docs or comments. This includes whether «prosjektledelse» is a Rewordable or a Real gap.
- Claude drafts `ad.txt`, `meta.json` and a draft CV text. The session log says AI drafted the texts and Helene wrote the key.
- Helene makes `cv.pdf` herself from the draft CV text: laid out in two columns in a word processor and exported as PDF (same decision as 2.1). She runs `npm run fixtures:extract`, which overwrites `cv.txt`. No PDF-writing dependency.
- Everything is fictional: no real person, employer or contact detail; a fake email on `example.com` is fine.
- The ad is bokmål, 200–15,000 characters, and names «prosjektledelse» among its Keywords. The CV is 200–20,000 characters.
- The CV has split compounds that should match the ad («data analyse» for «dataanalyse») and definite and plural noun forms of ad Keywords.
- The CV holds a lone «ledelse» and never writes «prosjektledelse», «prosjekt ledelse», «prosjektleder», «prosjektlederen» or «prosjektledere» (the stemmer reduces all of them to the same stem as «prosjektledelse»).
- The CV has one semester-long group project entry. Whether it shows planning or coordination is for Helene to settle when she edits it.
- After extraction, at least one line of `cv.txt` is scrambled by the two columns, so the FR-3 correction can be shown by hand. Helene checks this.
- `meta.json` is `{ "jobTitle", "employer" }`.

**Never:**
- No Keyword engine, vocabulary, UI, schema change, test change or `cached/` folder.
- No other `data/fixtures/*` folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Complete Fixture | Five files present, `cv.txt` equals the extraction of `cv.pdf`, key parses, Rewordable evidence found in `cv.txt` | `two-column-fjord-analytics has nothing wrong (SM-2)` passes | N/A |
| Key or PDF not yet made | `answer-key.json` absent | Fixture test fails, saying `answer-key.json is missing` | By design until Helene's hand-off |
| PDF and text drift | `cv.txt` edited by hand after export | Fixture test fails, says to run the script | Run `npm run fixtures:extract` |
| Evidence typo | A Rewordable gap's evidence differs from the scrambled `cv.txt` | Fixture test fails, naming the keyword | Helene copies the line from `cv.txt` |

</frozen-after-approval>

## Code Map

- `src/shared/core/answer-key.ts` -- `answerKeySchema` and `fixtureMetaSchema` from 2.1. Reuse; do not change.
- `src/shared/core/fixtures.test.ts` -- checks every folder under `data/fixtures/` not starting with `_`, including the `cv.txt`/`cv.pdf` drift check. Do not change.
- `scripts/extract-fixture-cv.ts` -- writes `cv.txt` from `cv.pdf` (`npm run fixtures:extract`). Reuse; do not change.
- `data/fixtures/example-nordic-digital/` and `nursing-sarvurdering/` -- the format to follow (file names, `meta.json` shape, line-wrapped CV text, bokmål ad structure).
- `biome.json` -- covers `data/**`, so the JSON files must be formatted.

## Tasks & Acceptance

**Execution:**
- [x] `data/fixtures/two-column-fjord-analytics/ad.txt` -- draft a fictional ad, Junior produktanalytiker at Fjord Analytics, with «prosjektledelse» and «dataanalyse» among its Keywords
- [x] `data/fixtures/two-column-fjord-analytics/meta.json` -- job title and employer
- [x] `data/fixtures/two-column-fjord-analytics/cv.txt` -- draft a fictional CV (text in two-column reading order) with split compounds, inflected forms, a lone «ledelse», and a semester group project entry
- [x] Helene (hand-off) -- read and edit the drafts, lay out `cv.pdf` in two columns, run `npm run fixtures:extract`, check that a line is scrambled, then write `answer-key.json` by hand; the story stays `in-review` until all exist and the tests pass

**Acceptance Criteria:**
- Given the UJ-2 ad and the two-column `cv.pdf`, when the script extracts it, then at least one line of `cv.txt` is scrambled.
- Given `cv.txt`, when it is read, then it has «data analyse», definite and plural noun forms of ad Keywords, and a lone «ledelse», and it never writes «prosjektledelse» or «prosjekt ledelse».
- Given the Answer key, when it is parsed, then it says whether «prosjektledelse» is a Rewordable or a Real gap with the reason, and lists «ledelse» as a must-not-match term.
- Given the Answer key, when it is reviewed, then Helene wrote it by hand and the session log says so.
- Given the Fixture test, when it runs, then the Fixture has nothing wrong.

## Implementation Notes

- Implemented directly in the session (no subagent; none were authorised). Files added: `data/fixtures/two-column-fjord-analytics/{ad.txt,meta.json,cv.txt}` (Fjord Analytics, «Junior produktanalytiker»; CV for Ingrid Moen). No code changed. `cv.txt` is a draft in two-column reading order; the script overwrites it once Helene exports `cv.pdf`.
- Ad Keyword candidates: dataanalyse, SQL, dashbord, Power BI, statistikk, datamodellering, prosjektledelse, rapporter, Python (a plus), Excel/R are not in the ad. These are AI drafts for Helene to read and edit before she writes the key.
- CV draft: «Data analyse» (split compound for «dataanalyse»), «datamodellene», «dashbordene», «rapporten», «dataene» (definite forms), a lone «ledelse» in «Organisasjon og ledelse». The group project entry is neutral: it says tasks were shared and the group met weekly, and names no planning or coordination role. Whether it counts is Helene's call. Nothing in the CV names an Answer-key item.
- Checked: «prosjektledelse», «prosjekt ledelse», «prosjektleder*» and «python» are absent from `cv.txt`. Biome passes. `fixtures.test.ts`: 8 pass, 1 fails by design (`two-column-fjord-analytics has nothing wrong (SM-2)` reports `answer-key.json is missing`) until Helene's hand-off.

- 2026-11-16: Helene exported a two-column `cv.pdf`, ran `npm run fixtures:extract` and wrote `answer-key.json` by hand (6 Matched, 3 Missing, score 67). The extraction reads the left column first, so «Utdanning», «Ferdigheter» and «Språk» come before «Profil», and the email and a few lines break mid-word (FR-3 correction case). «prosjektledelse» is a Real gap and must-never-suggest (no leadership role in the project entry); «ledelse» is a must-not-match term. Claude made only mechanical fixes to the key (a missing comma, `score`, `biome format`). biome, tsc and all 246 tests pass.

## Spec Change Log

## Review Triage Log

No independent reviewer subagents were run (not authorised in this session). Inline self-review of the diff, one row per finding:

| Finding | Verdict | Evidence |
|---|---|---|
| The CV has «dashbordene» and «datamodellene» (definite plural) but no indefinite plural of an ad Keyword | low | «Definite and plural forms» is met by the definite plurals; Helene edits the drafts and the exported PDF replaces this text. No change. |
| «Data analyse» sits in the «Relevante emner» list as a course title | low | Intended: it is the split compound the story needs. No change. |
| The ad itself says «for eksempel fra et studieprosjekt» next to «prosjektledelse», which nudges toward Rewordable | low | It is the ad's wording for the UJ-2 case; the key stays Helene's call. No change. |
| Fixture test fails until `cv.pdf` and the key exist | low | Intended by the matrix row «Key or PDF not yet made». |
| `cv.txt` here is not yet the extraction of a PDF, so it is not scrambled | low | Intended: the script overwrites it after Helene exports the two-column PDF. |

## Design Notes

The unpdf extraction orders text by position, so a two-column page can interleave left and right column lines. Helene's export decides which line is scrambled; the key's evidence must quote `cv.txt` as extracted, not the draft.

## Verification

**Commands:**
- `npm run fixtures:extract` -- expected: `cv.txt` rewritten from `cv.pdf`, no further diff on a second run
- `docker compose run --rm --build test` -- expected: lint, typecheck and tests pass once Helene's files exist

**Manual checks (if no CLI):**
- Open `cv.pdf`: two columns, selectable text. Open `cv.txt`: at least one line is out of order, and «prosjektledelse», «prosjekt ledelse» and «prosjektleder*» appear nowhere.
