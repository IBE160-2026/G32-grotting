---
title: 'Story 2.6: Find each Keyword in the CV text, with its Evidence'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
baseline_commit: '9b3adb7'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app can list the Keywords of a job ad but cannot say which ones the CV really contains, so there is no Matched/Missing split to score (FR-6, SM-2, NFR-6).

**Approach:** Add a pure `findKeyword(text, keyword, vocabulary)` in `keywords/core` that looks a Keyword up in the CV through the 2.4/2.5 pipeline and returns each hit with its match stage and Evidence (the CV line and its number). Prove it with an SM-2 test over every Fixture: extraction plus CV lookup must give exactly the Answer key's Matched and Missing lists. Tune the vocabulary against the Answer keys to get there (the epic allows only the Answer keys to justify matching changes).

## Boundaries & Constraints

**Always:**
- Branch `story/2.6-find-keyword-in-cv` off `main`. Commits cite `2.6`. Stage by explicit path. PR, review, then merge.
- `findKeyword(text, keyword: { term: string }, vocabulary: Vocabulary): KeywordHit[]`, pure and synchronous, imports only `shared/core` and own files. `KeywordHit = { stage, line, text, start, end }`: `line` is the 1-based number of the line in the CV text after CRLF/CR→LF; `text` is that whole line; `start`/`end` are offsets in that line (end exclusive). Hits are in text order. An empty array means the Keyword is Missing.
- Search uses the term and its aliases only, with the same token, span, stage and gap rules as `extractKeywords` (one engine, shared code in `keywords/core`; no second matcher). A span never crosses a line break, so a Keyword is found on one line. Overlapping hits of the term: the longest wins, then the earliest.
- `tokenise` keeps soft hyphen, zero-width and similar PDF artefacts inside a word (not as a split) and `normalise` removes them; this closes the 2.5 deferred item.
- `MAX_SPAN` becomes 5 tokens (the Answer key has «behandling av trykksår og diabetessår»).
- The vocabulary is tuned against the three Answer keys and `vocabularyVersion` bumped. A phrase Keyword from an Answer key is a vocabulary term; aliases carry the wording the CV or ad uses. Terms the Answer keys leave out are removed from the vocabulary, not special-cased in code.
- SM-2 test per Fixture (`data/fixtures/*`): extract `ad.txt`, look each Keyword up in `cv.txt`; the Matched set and Missing set equal the Answer key's, compared by `normalise`, and no must-not-match term is an extracted Keyword or the matched text of any hit. A failure names the Keyword and the Fixture. A second run gives identical lists (NFR-6).

**Never:**
- No scoring, route, UI or `answer-key.json` change. No second stemmer, no per-word exception list, no AI, no looser matching than the Answer keys justify.
- «ledelse» alone must not find «prosjektledelse»; a CV word that only shares part of a compound never matches.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inflection | Term «sårstell», CV line «Utførte sårstellene til …» | One hit, stage `inflection`, correct line number and offsets | N/A |
| Split compound | Term «dataanalyse», CV «Data analyse: …» | Hit, stage `exact` (2.5 rule: equal once spaces between letters are ignored); «Data analysene» gives `compound` | N/A |
| Alias | Term «Agile», alias «smidig», CV «smidig utvikling» | Hit, stage `alias` | N/A |
| Case | CV «REACT» for term «React» | Hit, stage `exact` | N/A |
| Part of compound | Term «prosjektledelse», CV has only «ledelse» | `[]` | N/A |
| Several hits | Term on lines 3 and 9 | Two hits, in text order | N/A |
| Not on one line | Words of a term split by a line break | `[]` | N/A |
| CRLF | Same CV with CRLF | Same line numbers and offsets as LF | N/A |
| PDF artefact | CV word with a soft hyphen or zero-width space inside | Found | N/A |
| Empty CV | `""` | `[]` | No throw |

</frozen-after-approval>

## Code Map

- `src/modules/keywords/core/extract.ts` -- holds the index, span and stage logic (`buildIndex`, `candidatesIn`, overlap filter). Move the shared parts to `spans.ts` and import them in both; behaviour of `extractKeywords` must not change except `MAX_SPAN`.
- `src/modules/keywords/core/tokenise.ts` -- `TOKEN` regex; add invisible characters inside a word. Tests in `tokenise.test.ts`.
- `src/modules/keywords/core/find.ts`, `find.test.ts` -- new: `findKeyword`, `KeywordHit`; export through `index.ts`.
- `src/modules/keywords/core/sm2.test.ts` -- new: Fixture test (reads `data/fixtures/*` and `data/vocabulary/nb.json` directly; tests may).
- `data/vocabulary/nb.json` -- tune; new version. Needed from the keys: add «junior frontendutvikler», «samarbeid i pull requests», «behandling av trykksår og diabetessår» (aliases sårbehandling, trykksår, diabetessår), «dokumenterer i pasientjournal» (aliases pasientjournal, journalføring), «smertelindring hos eldre», «erfaring med demens», «erfaring med forskning», «skriver rapporter»; rename «responsiv design» to «responsive mobil» (aliases responsive, responsiv design); aliases «norsk morsmål» on norskkunnskaper and «datamodell» on datamodellering; remove frontend, stakeholder, webutvikling, dashbord, autorisasjon, infeksjonsforebygging, sårbehandling, pasientjournal.
- `src/modules/keywords/core/extract.test.ts` -- update: 5-token limit, `1 to 5 tokens`, Fixture expectations that named removed terms («stakeholder»).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- remove the resolved soft-hyphen entry and the vocabulary-precision entry's tuned part; add open points.

## Tasks & Acceptance

**Execution:**
- [x] `keywords/core/spans.ts`, `extract.ts` -- share the span engine; `MAX_SPAN` 5
- [x] `keywords/core/tokenise.ts` + test -- invisible characters inside words
- [x] `keywords/core/find.ts`, `index.ts` -- `findKeyword`
- [x] `keywords/core/find.test.ts` -- every matrix row
- [x] `data/vocabulary/nb.json`, `extract.test.ts` -- tuning and version
- [x] `keywords/core/sm2.test.ts` -- SM-2 and NFR-6 over every Fixture
- [x] `deferred-work.md` -- bookkeeping

**Acceptance Criteria:**
- Given every Fixture, when the SM-2 test runs, then Matched and Missing equal the Answer key and no must-not-match term matches; a failure names Keyword and Fixture.
- Given every Fixture run twice, then the lists are identical.
- Given the repository, when `npx biome check`, `npm run typecheck` and `npx vitest run` run, then all pass.

## Implementation Notes

- Implemented directly (not by a subagent); review by subagents in step 4. Files: `keywords/core/spans.ts` (span engine moved out of `extract.ts`, plus `orderCandidates`/`keepNonOverlapping`, `MAX_SPAN` 5), `find.ts` (`findKeyword`, `KeywordHit`), `tokenise.ts` (PDF artefacts stay inside words; regex built from code points), tests `find.test.ts`, `sm2.test.ts`, additions in `tokenise.test.ts`, `extract.test.ts`.
- `findKeyword(text, { term }, vocabulary)` searches line by line over a one-term vocabulary (the term and its own aliases), so extraction and lookup share one engine.
- Plain matching cannot reproduce the hand-written keys. Vocabulary `v1-d3a1887d` (255 terms): added 9 phrase terms, renamed «responsiv design» to «responsive mobil», aliases «norsk morsmål» and «datamodell», removed frontend, stakeholder, webutvikling, dashbord, autorisasjon, infeksjonsforebygging, sårbehandling, pasientjournal.
- Matching change justified by the keys: span gaps may hold parentheses («norsk (morsmål)»). A bare alias «norsk» was tried and dropped: it extracted «norskkunnskaper» from «norske nettbutikker» in the Fjord ad.
- A split compound is stage `exact` (2.5 rule); `compound` needs a split inflected form («Data analysene»).
- Open for Helene (also in deferred-work.md): the trykksår alias reading, the fitted vocabulary, phrase Keywords found only through aliases.
- Verified: `biome check`, `npm run typecheck`, `vitest run` (40 files, 402 tests) pass. Playwright and Docker not run.

## Spec Change Log

- Matrix row «Split compound» said stage `compound`; the 2.5 stage rule (kept, not changed) gives `exact` for «Data analyse». Found by the Edge Case Hunter and confirmed in `stageOf`. The row was a drafting error, amended with the user's delegation to use the recommended spec; the matrix test now asserts `exact` and the `compound` case. KEEP: stage rules of 2.5 unchanged.
- The alias for norskkunnskaper in the Code Map is «norsk morsmål», not «norsk» (bare «norsk» extracted the Keyword from «norske nettbutikker»).

## Review Triage Log

Three reviewer subagents (Blind Hunter, Edge Case Hunter, Verification Gap) ran on the diff; Edge Case Hunter and Verification Gap agree on the first two rows.

| Finding | Verdict | Evidence / route |
|---|---|---|
| Phrase term with its own alias (`dokumenterer i pasientjournal` / `pasientjournal`) reports only the alias, wrong stage and offsets; contradicts «longest wins» | medium | Real: `orderCandidates` dropped the wider span. Patch: keep a wider span whose stage is better; tests in `find.test.ts`, `extract.test.ts`. |
| Parentheses in `SPAN_GAP` bridge «Power) BI», «Power(BI)» and change extraction with no test | medium | Real. Patch: only « (» after whitespace; tests in `find.test.ts` and `extract.test.ts`. |
| Matrix row says `compound` for a split compound, code gives `exact` | medium (bad_spec in the matrix) | Real, see Spec Change Log. Matrix row amended. |
| SM-2 test computes a score; spec says no scoring | low | Real, direct deletion: the Answer-key schema already checks the score. Removed. |
| Evidence test near-tautology; no Matched Keyword asserted to have a hit | low | Real. Patch: each Matched Keyword has a hit, slice not empty, a pinned Figma Evidence case. |
| `compound` stage naming misleading; JSDoc silent | low | Real. Patch: `KeywordStage` doc. |
| Code Map says alias «norsk» | low | Real; Code Map corrected (see Spec Change Log). |
| Unknown term gives `[]` like Missing | low | Rejected as a code change: callers pass extracted Keywords. Documented in the JSDoc. |
| Index cache defeated; CV re-tokenised per Keyword | low | Rejected: 255 terms, a few ms; a batch API belongs to 2.7 if it measures slow. |
| Line separators U+2028/2029/0085, vertical tab, form feed not line breaks | low | Deferred: PDF text from unpdf gives LF/CRLF; recorded. |
| Line-end hyphenation, bidi controls, artefact list in two files | low | Deferred / rejected: not needed by any Fixture; recorded. |
| Offsets stop before «)» in «norsk (morsmål» | low | Rejected: the span is the tokens; the Evidence is the whole line. |
| Vocabulary fitted to the Fixtures; single-word aliases make a phrase Matched; phrase keywords found through aliases only | low | Known and deferred in the story's own items. |
| SM-2 test paths relative to cwd, `>= 3` magic number, must-not-match substring check | low | Rejected: same convention as the other Fixture tests; the Never list is covered by «ledelse» tests. |

## Design Notes

`findKeyword` builds a one-term vocabulary (term plus its aliases from the full vocabulary) and runs the same index and span search per line, so extraction and CV lookup can never disagree on «the same word». The vocabulary now fits the three Fixtures; Story 2.11's held-out Fixture is what shows whether it also holds elsewhere.

## Verification

**Commands:**
- `npx biome check` -- expected: no diagnostics
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
