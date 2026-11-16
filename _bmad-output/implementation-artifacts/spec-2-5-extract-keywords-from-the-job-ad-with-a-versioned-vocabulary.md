---
title: 'Story 2.5: Extract Keywords from the job ad with a versioned vocabulary'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: 'cf2fc79a7d7f114d2838f4d9a4c75afa25f89b31'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app cannot say which skills and terms a job ad asks for, so there is nothing to score. Extraction must be code only and give the same list every time (FR-5, NFR-6).

**Approach:** Add a versioned vocabulary in `data/vocabulary/`, a pure `extractKeywords(adText, vocabulary)` in `keywords/core` that finds vocabulary terms and aliases in the ad through the 2.4 pipeline, and a server loader in `shared/server/data-files.ts`. Covers FR-5, FR-4 (fewer than 3), NFR-6, AD-5, AD-15.

## Boundaries & Constraints

**Always:**
- Branch `story/2.5-extract-keywords` off `main`. Commits cite `2.5`. Stage by explicit path. No push until review is done.
- Vocabulary file `data/vocabulary/nb.json`: `{ vocabularyVersion, terms: string[], aliases: Record<term, string[]> }`. Terms are written as displayed («React», «universell utforming», «sårvurdering»); every alias key is a term. `vocabularyVersion` is `v1-<first 8 hex of sha256 of JSON.stringify({terms, aliases})>`; a test recomputes it and fails with the expected value when contents changed. Zod schema `vocabularySchema` in `src/shared/core/vocabulary.ts`.
- Curated core list of about 250 terms, any field: web and software, data and analytics, health and nursing, economics and business, methods, qualifications. Seed the nursing terms and the three Fixtures' fields; English terms common in Norwegian ads («Agile», «stakeholder») with aliases («smidig»). No stop words, no places, no benefits words, no single letters («R», «C»).
- `extractKeywords(adText, vocabulary)` is pure and synchronous, imports only `shared/core` and own files, and returns `Result<Keyword[], "TOO_FEW_KEYWORDS">`: fewer than 3 distinct Keywords is the error (FR-4). `Keyword = { term, stage, positions: { paragraph, start, end }[] }`.
- Tokens are letters and digits (with trailing `+`/`#`); hyphens split tokens. A term matches a span of 1–4 ad tokens within one paragraph. Stage: `alias` if found through an alias; else `exact` when the normalised joined text is equal; else `inflection` when token count is equal and every token stem is equal; else `compound` when only the joined stems are equal. A Keyword's stage is that of its first position.
- Overlaps: sort candidates by span length (tokens) descending, then start, then vocabulary order; keep the non-overlapping ones. One Keyword per term however many forms or places it appears. The list is in order of first position.
- Paragraphs split on blank lines after CRLF→LF; `start`/`end` are offsets in that paragraph (end exclusive). Export `splitParagraphs(text)` so the UI uses the same split.
- `loadVocabulary()` in `src/shared/server/data-files.ts` (`server-only`) reads `data/vocabulary/nb.json` from `process.cwd()`, validates it with `vocabularySchema`, and throws on an invalid file. `keywords/core` never reads files.
- `next.config.ts` sets `outputFileTracingIncludes` for `./data/vocabulary/**` on `/api/**`; a test pins it.

**Never:**
- No CV matching (`findKeyword`, 2.6), scoring, UI, route or `answer-key.json` change. No second stemmer, no per-word exception lists, no AI.
- The Norwegian ESCO backup list is not in this story; record it in `deferred-work.md`.
- Do not copy `answer-key.json` text into tests; Fixture tests read the `ad.txt` files only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inflection | Ad has «prosjektlederen», vocabulary «prosjektleder» | One Keyword, stage `inflection`, one position | N/A |
| Spelling and split | Ad has «front-end», «front end» or «frontend» for term «frontend»; «data analyse» for «dataanalyse» | One Keyword each, stage `exact` | N/A |
| Alias | Ad has «smidig»; «Agile» has alias «smidig» | Keyword «Agile», stage `alias` | N/A |
| Repeats | «React» three times in two paragraphs | One Keyword, three positions with correct paragraph and offsets | N/A |
| Must stay apart | Ad has «ledelse» only; vocabulary has «prosjektledelse» and «leder» | Neither found | N/A |
| Longest span | «universell utforming» and a term «utforming» both match | Only «universell utforming» | N/A |
| Too few | Ad with fewer than 3 distinct Keywords | `err("TOO_FEW_KEYWORDS")` | No throw |
| Deterministic | Each Fixture `ad.txt` extracted twice | Identical lists; at least 3 Keywords each | N/A |
| Invalid vocabulary | `loadVocabulary` reads a file with an alias key that is not a term | Throws | Test with a temp file |

</frozen-after-approval>

## Code Map

- `src/modules/keywords/core/{normalise,stem,index}.ts` -- 2.4 pipeline. `stem(term)` splits on spaces and stems each word, `normalise` joins letters across spaces and dashes. Reuse; do not change. Extraction goes in `extract.ts`, `tokenise.ts` beside them, exported through `index.ts`.
- `src/shared/core/answer-key.ts` -- pattern for a zod schema in `shared/core`; `result.ts` has `ok`/`err`.
- `src/shared/server/` -- `config.ts` and `db.ts` show the `server-only` pattern; add `data-files.ts` and its test. Vitest aliases `server-only` to a stub.
- `next.config.ts` -- add `outputFileTracingIncludes`. Docker keeps the full source tree, so runtime reads work there.
- `data/fixtures/*/ad.txt` -- test input; their answer keys show which terms the fields need.
- Deferred items from 2.4 apply here: match per token first, joined only for the compound stage (done by the design above); dash next to digits stays as is.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- add the ESCO entry; remove the 2.4 entry on token-first matching once done.

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/core/vocabulary.ts` + test -- `vocabularySchema` (terms non-empty and unique by canon, alias keys are terms, version format)
- [x] `data/vocabulary/nb.json` -- curated list, version computed
- [x] `src/modules/keywords/core/tokenise.ts`, `extract.ts`, `index.ts` -- tokens, paragraphs, extraction
- [x] `src/modules/keywords/core/extract.test.ts`, `tokenise.test.ts` -- every matrix row; offsets checked against the paragraph text; vocabulary contents test (version hash, no two entries with the same stem form, every term finds itself)
- [x] `src/shared/server/data-files.ts` + test -- `loadVocabulary`
- [x] `next.config.ts` + test -- tracing include
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- ESCO entry; remove the resolved 2.4 entry

**Acceptance Criteria:**
- Given the vocabulary file, when its contents change without a new `vocabularyVersion`, then the test fails and prints the expected version.
- Given each Fixture ad, when extracted twice, then both results are equal and hold at least 3 Keywords with positions inside the ad.
- Given the repository, when `npm run lint`, `npm run typecheck` and `npx vitest run` run, then all pass.

## Implementation Notes

- Implemented by a subagent, review patches applied by the same subagent. Files: `shared/core/vocabulary.ts` (schema), `data/vocabulary/nb.json` (255 terms, 62 with aliases, version `v1-4268793b`), `keywords/core/{tokenise,extract}.ts`, `shared/server/data-files.ts` (`loadVocabulary`), `next.config.ts` (`/api/**` tracing of `data/vocabulary`), tests beside each.
- Tokens split on hyphens, dots and slashes. A span may extend over a gap only when it holds spaces, dashes or one lone `.` or `/` (keeps «Node.js», «CI/CD»). A candidate is dropped when another candidate of the same term lies strictly inside it, so «sykehjem er» and «REST API-er» give tight positions.
- The alias «helse, miljø og sikkerhet» of HMS was removed: a comma now stops a span.
- ESCO backup list left out on purpose (deferred-work.md). Extraction was not compared with the Answer keys in a test; a manual run finds the main terms and some extras (infeksjonsforebygging, autorisasjon, sykehjem, dashbord, frontend, webutvikling, stakeholder) and misses phrase keywords such as «skriver rapporter». Tuning is for 2.7 and 2.11.
- Verified: `biome check`, `npm run typecheck`, `vitest run` (38 files, 366 tests) pass. `npm test` (including Playwright, 91 tests) passed locally; `docker compose run --rm --build test` was not run.

## Spec Change Log

## Review Triage Log

Three independent reviewer subagents (blind, edge-case, verification-gap) ran on the diff.

| Finding | Verdict | Evidence / route |
|---|---|---|
| Spans join tokens across sentence ends, commas, bullets and newlines | medium | Real: «data. Analyse» reaches the compound stage. Patch: gap rule. |
| Short word glues on («sykehjem er», «REST API-er»); wider span can block a neighbour | medium | Real, seen in Fixture runs. Patch: drop a span that strictly contains a span of the same term. |
| Fixture test checks only count and bounds | medium | Real; 17/14/9 Keywords against a floor of 3. Patch: seeded terms, stage and position text. |
| `aliases[term]` reads inherited keys | low | Real for «constructor». One-line patch (`Object.hasOwn`). |
| «HTML+CSS» keeps the trailing «+» | low | Real. Patch in TOKEN. |
| Lone CR, NBSP and form-feed blank lines not split | low | Real. Patch. |
| Local `sameWord` in vocabulary.ts; duplicate version regex in tests; loader error context | low | Direct corrections. Patch. |
| Missing edge tests (MAX_SPAN, NFD, inflected alias, gap) | low | Patch, added with the fixes above. |
| Stale 2.4 ISO-27001 deferred entry; glue entry | low | Patch: both removed (tokenising splits dashes; glue fixed). |
| Index rebuilt per `loadVocabulary()` call | low | Rejected: about 400 stems, a few ms; a loader cache would break tests that swap `process.cwd()`. |
| Version hash not re-checked at runtime; schema does not check 1–4 tokens, alias clashes | low | Rejected: developer error, caught by the vocabulary-file tests in CI. |
| Cache goes stale if a vocabulary object is mutated | low | Rejected: speculative; the parsed object is never mutated. |
| Tracing include covers `/api/**` only | low | Rejected: the spec fixes it, and phase 1 is a route handler (2.7). |
| Alias stage loses to a term-form stage on the same span | low | Rejected: the span matched the term itself, so its own stage is the honest one. |
| Soft hyphen and zero-width characters split tokens | low | Deferred: PDFs matter for the CV side (2.6), not pasted ads. |
| Ambiguous vocabulary entries («Spark», «Swift», «Lean», «salg»); no soft skills or Office terms; aliases fitted to Fixtures | low | Deferred: precision and coverage are tuned against the Answer keys in 2.7 and 2.11. |
| No script to regenerate `vocabularyVersion` | low | Rejected: the test prints the expected value. |
| Parsing at `describe` time; bookkeeping empty in spec | low | Rejected / fixed in this step. |

## Design Notes

Two lookup keys per vocabulary entry make extraction a map lookup instead of terms × tokens: the token-wise stems joined by a space (finds inflections of multi-word terms, which 2.4 noted joining misses) and `stem` of the joined text (finds split and compound forms). Ad spans of 1–4 tokens are looked up in both.

## Verification

**Commands:**
- `npx biome check` -- expected: no diagnostics
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
