---
title: 'Story 2.1: Write the Example pair Fixture (frontend, English terms)'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: '2885ece2545b1e7f748b98ce3b738ff2c5611243'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Keyword engine has nothing to be tested against. There is no Fixture folder format, no Answer-key schema, and no way to keep a `cv.txt` in step with its `cv.pdf`.

**Approach:** Add the first Fixture, `data/fixtures/example-nordic-digital/` (Violet Hansen, Junior frontendutvikler at Nordic Digital, English terms in a Norwegian ad), the shared zod Answer-key schema, `scripts/extract-fixture-cv.ts`, and a Vitest test that checks every Fixture. Covers FR-28, FR-27 (Example pair files), SM-2, AD-15.

## Boundaries & Constraints

**Always:**
- Branch `story/2.1-example-pair-fixture` off `main`. Commits cite `2.1` and the IDs. Stage by explicit path.
- Helene writes `answer-key.json` by hand. Claude never drafts, suggests or pre-fills any Answer-key content, including in tests, docs or comments.
- Claude drafts `cv.txt`, `ad.txt` and `meta.json` (decision, Helene 2026-11-16). The session log says AI drafted the texts and Helene wrote the key.
- Helene makes `cv.pdf` herself from the draft `cv.txt`: a single-column PDF exported from a word processor (decision, Helene 2026-11-16). No PDF-writing dependency.
- Everything is fictional: no real person, employer or contact detail. A fake email on `example.com` is fine.
- The ad is bokmål with English technical terms common in Norwegian ads («React», «TypeScript», «Agile», «stakeholder»), 200–15,000 characters. The CV is 200–20,000 characters: courses and one semester group project. Some ad terms the CV covers in Norwegian, some in English, some not at all.
- `meta.json` is `{ "jobTitle", "employer" }`.
- The schema lives in `src/shared/core/answer-key.ts` and is pure (no I/O).
- `unpdf` 2.1.0 is added to `dependencies`, pinned exactly (the spine pins it; Story 1.11 reuses it).

**Never:**
- No Keyword engine, vocabulary, `data-files.ts` or `cached/` folder here. No UI. No change to `canon.ts`.
- No second Fixture, and no other `data/fixtures/*` folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid key | Matched + Missing lists, score = round(100 × matched ÷ total), Missing split exactly into Rewordable and Real | Parses | N/A |
| Score off | Score differs from the lists | Parse fails, naming `score` | zod issue |
| Lists overlap | A Keyword is in both Matched and Missing, or repeated (ignoring case) | Parse fails | zod issue |
| Gaps don't cover Missing | A Missing Keyword is in neither gap list, or a gap isn't Missing | Parse fails | zod issue |
| Never-suggest not Real | A must-never-suggest item isn't a Real gap | Parse fails | zod issue |
| Evidence not in CV | A Rewordable gap's evidence isn't in `cv.txt` (ignoring case and whitespace) | Fixture test fails | names the Fixture and keyword |
| PDF and text drift | `cv.txt` differs from the unpdf extraction of `cv.pdf` | Fixture test fails | says to run the script |
| Missing file | A Fixture folder lacks `ad.txt`, `meta.json`, `cv.txt` or `answer-key.json` | Fixture test fails | names the file |

</frozen-after-approval>

## Code Map

- `src/shared/core/canon.ts` -- reuse `canon` for case/whitespace-insensitive comparison. Do not change.
- `src/shared/core/result.ts`, `message-key.ts` -- existing style for shared core (pure, zod, plain doc comments).
- `vitest.config.ts` -- already includes `src/**/*.test.ts` and `scripts/**/*.test.ts`. The tests may read `data/` directly.
- `scripts/setup.ts` + `package.json` -- script style: TypeScript run with `tsx --conditions=react-server`; add an `fixtures:extract` script entry.
- `Dockerfile` test stage -- `COPY . .` already carries `data/`. No change.
- `biome.json` -- covers `data/**`, so the JSON files must be formatted.
- `.gitattributes` -- `*.pdf binary` is already set.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `package-lock.json` -- add `unpdf` 2.1.0 (exact) and the script `fixtures:extract` -- extraction for the script and the test
- [x] `src/shared/core/answer-key.ts` -- zod `answerKeySchema` and `fixtureMetaSchema`; refinements from the matrix -- shared by keywords, gaps and QA code
- [x] `scripts/extract-fixture-cv.ts` -- for each Fixture folder with a `cv.pdf`, write `cv.txt` from the unpdf extraction (pages merged, CRLF to LF, one trailing newline); export `extractCvText` so the test uses the same code -- the two never drift
- [x] `data/fixtures/example-nordic-digital/{ad.txt,meta.json,cv.txt}` -- draft the fictional ad, meta and CV text
- [x] `src/shared/core/answer-key.test.ts` -- schema unit tests for every matrix row, using inline objects that are made up and not a draft of Helene's key
- [x] `src/shared/core/fixtures.test.ts` -- for every folder under `data/fixtures/` not starting with `_`: required files exist, key and meta parse, evidence is in `cv.txt`, `cv.txt` equals the extraction of `cv.pdf` when one exists
- [ ] Helene (hand-off) -- export `cv.pdf` from the draft, run `npm run fixtures:extract`, write `answer-key.json` by hand; the story stays `in-review` until both exist and the tests pass

**Acceptance Criteria:**
- Given the Example pair, when it is read, then the ad uses English terms, the CV covers some in Norwegian, some in English and some not at all, and `meta.json` holds the job title and employer.
- Given `answer-key.json`, when it is parsed with the shared schema, then all five parts are present and the score follows from the two lists.
- Given an invalid Answer key, when the Vitest run parses every `answer-key.json`, then it fails.
- Given `cv.pdf`, when the script runs, then `cv.txt` equals the unpdf extraction.
- Given the Answer key, when it is reviewed, then Helene wrote it by hand and the session log says so.

## Implementation Notes

- Implemented directly in the session (no subagent). `unpdf` 2.1.0 pinned in `dependencies`; script entry `fixtures:extract`.
- `fixtures.test.ts` has one `problems(folder)` check, run on every real Fixture and on made-up temp-folder Fixtures, so the matrix rows for evidence, drift and missing files are covered without Helene's files. The temp PDF is a hand-built one-page PDF inside the test.
- Verified `extractCvText` on a hand-built PDF; the real `cv.pdf` is Helene's.
- Open hand-off: `cv.pdf` and `answer-key.json`. Until `answer-key.json` exists, `example-nordic-digital has nothing wrong (SM-2)` fails by design (it reports `answer-key.json is missing`). Everything else passes: biome, tsc, 180 tests.
- Draft texts: the ad has React, TypeScript, HTML/CSS, Git, Agile, stakeholders, testing, universell utforming, REST API and Figma as candidate terms; the CV states its own coverage. These are AI drafts for Helene to read and edit before writing the key.

- 2026-11-16: Helene exported `cv.pdf`, ran `npm run fixtures:extract` and wrote `answer-key.json` by hand (9 Matched, 5 Missing, score 64). All 181 tests pass; the Example pair check is green. Status set to done.

## Spec Change Log

## Review Triage Log

No independent reviewer subagents were run (not authorised in this session). Inline self-review of the diff, one row per finding:

| Finding | Verdict | Evidence |
|---|---|---|
| `extractCvText` copies the bytes before pdfjs reads them | false | pdfjs may detach the buffer it is given; the copy keeps the caller's `Uint8Array` usable, and the test reads it twice. |
| Score uses `Math.round` (half rounds up) | low | Matches "rounded to a whole number"; Story 2.7 must round the same way, which the Answer-key test pins for the Fixtures. No change. |
| Real Fixture test fails until `answer-key.json` exists | low | Intended: the story stays `in-review` until Helene's files land. |
| Script entry check `process.argv[1] === import.meta.url` | false | Verified by running `npm run fixtures:extract` on Windows; not triggered on import from Vitest. |

## Design Notes

Answer-key shape (the shape only; the contents are Helene's):

```json
{
  "keywords": { "matched": [], "missing": [] },
  "score": 0,
  "mustNotMatch": [{ "term": "", "reason": "" }],
  "gaps": { "rewordable": [{ "keyword": "", "evidence": "" }], "real": [] },
  "mustNeverSuggest": [{ "keyword": "", "reason": "" }]
}
```

`gaps.real` and `gaps.rewordable[].keyword` together are exactly `keywords.missing`. Every `mustNeverSuggest` keyword is a Real gap (checklist G2). `evidence` is a CV line quoted word for word.

## Verification

**Commands:**
- `docker compose run --rm --build test` -- expected: lint, typecheck and tests pass once Helene's two files exist
- `npm run fixtures:extract` -- expected: `cv.txt` rewritten from `cv.pdf` with no further diff on a second run

**Manual checks (if no CLI):**
- Open `cv.pdf`: one column, selectable text, matches the draft text.
