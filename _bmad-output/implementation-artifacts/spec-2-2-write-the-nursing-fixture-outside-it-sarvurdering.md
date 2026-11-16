---
title: 'Story 2.2: Write the nursing Fixture (outside IT, «sårvurdering»)'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: '107093a771d80c5d2259ff66661f9cac6151e4d7'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The only Fixture is an IT one. The engine and the later guards have nothing from outside IT, and nothing to test the «forsket» upgrade case (an exam paper is not research) against.

**Approach:** Add the second Fixture, `data/fixtures/nursing-sarvurdering/` (`ad.txt`, `cv.txt`, `meta.json`, `answer-key.json`), built around the FR-16 example. It reuses the Answer-key schema and the Fixture test from 2.1; no code changes. Covers FR-28, FR-16, SM-2.

## Boundaries & Constraints

**Always:**
- Branch `story/2.2-nursing-fixture` off `main`. Commits cite `2.2` and the IDs. Stage by explicit path.
- Helene writes `answer-key.json` by hand, from her own nursing knowledge. Claude never drafts, suggests or pre-fills any Answer-key content, including in tests, docs or comments.
- Claude drafts `ad.txt`, `cv.txt` and `meta.json` (carried over from 2.1). The session log says AI drafted the texts and Helene wrote the key.
- There is no `cv.pdf`: `cv.txt` is the source, written directly. The 2.1 Fixture test already skips the drift check when no PDF exists.
- Everything is fictional: no real person, employer or contact detail; a fake email on `example.com` is fine.
- The ad is bokmål, 200–15,000 characters, a nursing job built around «sårvurdering». The CV is 200–20,000 characters.
- The CV contains this entry word for word: «Skrev eksamensoppgave om diabetiske fotsår vs trykksår (likheter og forskjeller)». Its other lines use Norwegian inflected forms (definite, plural, verb forms) of Keywords in the ad.
- The CV never writes «sårvurdering», and never contains «forsket», «forsker» or «forskning» in any form, so the upgrade case is a Gap-analysis judgement and the must-never-suggest item stays valid.
- The CV also holds a few near-miss words (a different word that shares a stem or a part with an ad term), so a must-not-match term is possible. Which ones count is Helene's call.
- `meta.json` is `{ "jobTitle", "employer" }`.

**Never:**
- No Keyword engine, vocabulary, UI, schema change, test change or `cached/` folder.
- No other `data/fixtures/*` folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Complete Fixture | All four files present, key parses, Rewordable evidence found in `cv.txt` | `nursing-sarvurdering has nothing wrong (SM-2)` passes | N/A |
| Key not yet written | `answer-key.json` absent | Fixture test fails, saying `answer-key.json is missing` | By design until Helene's hand-off |
| Evidence typo | The exam-paper line in the key differs from `cv.txt` | Fixture test fails, naming the keyword | Helene copies the line from `cv.txt` |

</frozen-after-approval>

## Code Map

- `src/shared/core/answer-key.ts` -- `answerKeySchema` and `fixtureMetaSchema` from 2.1. Reuse; do not change.
- `src/shared/core/fixtures.test.ts` -- checks every folder under `data/fixtures/` not starting with `_`; handles a folder without `cv.pdf`. Do not change.
- `scripts/extract-fixture-cv.ts` -- only writes `cv.txt` for folders with a `cv.pdf`, so it leaves this Fixture alone. Do not change.
- `data/fixtures/example-nordic-digital/` -- the format to follow (file names, `meta.json` shape, line-wrapped `cv.txt`, Norwegian ad structure).
- `biome.json` -- covers `data/**`, so the JSON files must be formatted.

## Tasks & Acceptance

**Execution:**
- [x] `data/fixtures/nursing-sarvurdering/ad.txt` -- draft a fictional nursing ad in bokmål with «sårvurdering» among its Keywords
- [x] `data/fixtures/nursing-sarvurdering/meta.json` -- job title and employer for the ad
- [x] `data/fixtures/nursing-sarvurdering/cv.txt` -- draft a fictional nursing student CV with the exam-paper entry and inflected forms of ad Keywords
- [x] Helene (hand-off) -- read and edit the drafts, then write `answer-key.json` by hand; the story stays `in-review` until it exists and the tests pass

**Acceptance Criteria:**
- Given the nursing ad, when the CV is read, then it contains the exam-paper entry word for word and its other lines use inflected forms of ad Keywords.
- Given the Answer key, when it is parsed, then «sårvurdering» is a Rewordable gap backed by the exam-paper entry, «Forsket på sårvurdering» (or any upgrade from exam paper to research) is a must-never-suggest item, and at least one must-not-match term exists.
- Given the Answer key, when it is reviewed, then Helene wrote it by hand and the session log says so.
- Given the Fixture test, when it runs, then the nursing Fixture has nothing wrong.

## Implementation Notes

- Implemented directly in the session (no subagent; none were authorised). Files added: `data/fixtures/nursing-sarvurdering/{ad.txt,meta.json,cv.txt}` (Solbakken sykehjem, «Sykepleier»; CV for Mina Haugen). No code changed.
- Ad Keyword candidates: sårvurdering, sårstell, legemiddelhåndtering, smertelindring, pasientjournal, infeksjonsforebygging, tverrfaglig samarbeid, pårørende, autorisasjon, trykksår/diabetessår, bandasjer. The CV states its own coverage; these are AI drafts for Helene to read and edit before she writes the key.
- CV inflections used: «sårstellene», «pasientjournalene», «pårørende», «bandasjer», «legemidlene». Near-miss words in the CV: «smertekartlegging» (ad: «smertelindring»), «Legemiddelregning» (ad: «legemiddelhåndtering»). Whether either counts as a must-not-match term is Helene's call. Nothing in the CV names an Answer-key item.
- Checked: «sårvurdering», «forsket», «forsker», «forskning» and «vurder*» are absent from `cv.txt`. The only `forsk` match is «forskjeller» inside the mandated exam-paper entry. Exam-paper entry is on one line, word for word.
- Biome passes. `fixtures.test.ts`: 7 pass, 1 fails by design (`nursing-sarvurdering has nothing wrong (SM-2)` reports `answer-key.json is missing`) until Helene's hand-off.
- 2026-11-16: Helene wrote `answer-key.json` by hand (6 Matched, 6 Missing, score 50). The key needed «erfaring med forskning» as a Real gap for the must-never-suggest item (the schema requires it, checklist G2), so Claude added one bullet about forskning to `ad.txt` at her request. The CV is unchanged. biome and all 204 tests pass. Status set to done.

## Spec Change Log

## Review Triage Log

No independent reviewer subagents were run (not authorised in this session). Inline self-review of the diff, one row per finding:

| Finding | Verdict | Evidence |
|---|---|---|
| CV named «Høgskolen på Vestlandet (fiktiv)», a real institution | low | Patched: now «Vestfjord høgskole (fiktiv)». The repository holds only fictional CVs. |
| The exam-paper entry sits in the «Relevante emner» list, among courses | low | Intended: the story needs the entry word for word, and Helene edits the drafts. No change. |
| «trykksår» is in both the ad and the exam-paper entry, so it may count as Matched | low | Helene's call when she writes the key; the draft only supplies the words. No change. |
| «legemidlene» / «dobbeltsjekke» in the CV sit near the ad's «legemiddelhåndtering» / «dobbeltkontroll» | low | A near-miss for Helene to rule on (Matched, Missing or must-not-match). No change. |
| Fixture test fails until the key exists | low | Intended by the matrix row «Key not yet written». |

## Verification

**Commands:**
- `docker compose run --rm --build test` -- expected: lint, typecheck and tests pass once Helene's key exists

**Manual checks (if no CLI):**
- Open `cv.txt`: the exam-paper entry is there word for word, and «sårvurdering», «forsket», «forsker» and «forskning» appear nowhere.
