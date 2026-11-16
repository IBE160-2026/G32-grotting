---
title: 'Story 2.4: Normalise and stem Norwegian words'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: 'ad28448dbcfa8f631c545ee1409082cfd7507ed1'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing decides when two Norwegian word forms are the same word. Keyword extraction, matching (2.5, 2.6) and the later guards need one judge, or the score and the guards will disagree.

**Approach:** Add `normalise`, `stem` and `sameWord` to `src/modules/keywords/core`, exported from `core/index.ts`. Pipeline: case folding, æøå handling, hyphen and space normalisation, a suffix pre-step for forms Snowball misses, then Snowball Norwegian from `@orama/stemmers/norwegian`. Turn Biome's core ban list into allow-lists. Covers FR-6, NFR-6, AD-5.

## Boundaries & Constraints

**Always:**
- Branch `story/2.4-normalise-and-stem` off `main`. Commits cite `2.4`. Stage by explicit path. No push.
- Add `@orama/stemmers` at the exact version `3.1.18` (already in `package.json` and the lockfile).
- Functions are synchronous and pure: no I/O, clock, randomness or module state. Same input, same output (NFR-6).
- `normalise(term)`: NFC, lower case, drop soft hyphens and zero-width characters (PDF artefacts), turn every dash variant and any whitespace between two letters into nothing («front-end», «front end», «frontend» and «data analyse», «dataanalyse» all alike). Digits and other punctuation stay. Trim. No ASCII folding of æøå: «aa», «oe» and «ae» stay what they are, because looser matching raises scores dishonestly.
- `stem(term)`: normalise, then a pre-step, then Snowball. Pre-step 1: a trailing plural or definite ending on an agent noun in «-er» (`-ere`, `-erne`, `-eren`, `-erens`) falls back to the «-er» form, so «utvikler», «utviklere» and «utviklerne» stem alike. Pre-step 2: nouns in «-else» (`-else`, `-elsen`, `-elser`, `-elsene`) keep a marker so «ledelse» and «leder», «prosjektledelse» and «prosjektleder» stay different (Snowball reduces both to the same stem).
- `sameWord(a, b)` is `stem(a) === stem(b)`. Outside `keywords/core`, nothing stems or compares words.
- Biome: `keywords/core` may import only `shared/core`, own-slice relative paths and `@orama/stemmers/norwegian`; `integrity/core` only `keywords/core`, `shared/core` and relative paths; `src/shared/core/**` only `zod`, relative paths and itself (purity, no `@/modules`). Any other package or Node built-in fails. `@orama/stemmers` outside `keywords/core` fails.
- The «must stay different» table has real cases, not filler. Do not read or copy `answer-key.json` content into tests.

**Never:**
- No Keyword extraction, matching, vocabulary, UI, `data/` or `answer-key.json` change. No change to `shared/core/answer-key.ts`.
- No second stemmer, no ASCII folding, no per-word exception lists.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Agent-noun forms | «utvikler», «utviklere», «utviklerne»; «prosjektleder», «prosjektlederen», «prosjektledere» | One stem per group | N/A |
| Hyphen and space variants | «front-end», «front end», «frontend», «Front‑End» (U+2011) | Same `normalise` and same `stem` | N/A |
| Split compound | «data analyse», «dataanalyse» | Same stem | N/A |
| Must stay different | «ledelse» vs «leder», «prosjektledelse» vs «prosjektleder», «data» vs «dataanalyse», «analyse» vs «analytiker», «utvikling» vs «utvikler» | Different stems | N/A |
| Case and æøå | «SÅRVURDERING», «sårvurdering», decomposed «sårvurdering» | Same stem; «aa» not folded to «å» | N/A |
| Empty or whitespace | `""`, `"  "` | `""` | No throw |
| Boundary rules | A core file imports `lodash`, `node:fs` or `@orama/stemmers/norwegian` from outside `keywords/core` | Biome fails; the stemmer import passes inside `keywords/core` | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/keywords/core/` -- empty; create `normalise.ts`, `stem.ts`, `index.ts` and tests beside them.
- `src/shared/core/canon.ts` -- NFC and whitespace helper. `normalise` may reuse it; do not change it.
- `src/shared/core/answer-key.ts` -- has its own `sameWord` for fixture duplicates (canon + lower case). Leave it; it is not keyword matching.
- `biome.json` -- overrides for `keywords/core`, `integrity/core` (ban lists today) and `src/shared/**` (slice ban only). Replace the ban lists with allow-lists; add a `src/shared/core/**` override.
- `test/lint-boundaries.test.ts` -- fixture table linted with the real `biome.json`. Add failing and passing cases for the new rules.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- two 2.4 items (allow-list, `shared/core` purity). Remove them when done.
- Probe of `@orama/stemmers/norwegian` 3.1.18: «utvikler»→«utvikl» but «utviklere»→«utvikler»; «ledelse» and «leder»→«led»; «sykepleier»→«sykeplei».

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/keywords/core/normalise.ts` -- `normalise` per the Always rules
- [x] `src/modules/keywords/core/stem.ts` -- pre-steps, Snowball, `stem` and `sameWord`
- [x] `src/modules/keywords/core/index.ts` -- export the three functions only
- [x] `src/modules/keywords/core/normalise.test.ts`, `stem.test.ts` -- table tests for every matrix row, including determinism (run twice) and the must-stay-different table
- [x] `biome.json` -- allow-lists for `keywords/core`, `integrity/core`, `src/shared/core/**`; stemmer restricted to `keywords/core`
- [x] `test/lint-boundaries.test.ts` -- cases for each new rule, both failing and passing
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- delete the two resolved entries

**Acceptance Criteria:**
- Given the word-form table, when it runs, then every same-word group stems alike and every must-stay-different pair differs.
- Given Biome's boundary rules, when `keywords/core` imports anything outside the allow-list, then `biome check` fails.
- Given the repository, when `docker compose run --rm --build test` (or `npm test` locally) runs, then lint, typecheck and all tests pass.

## Implementation Notes

- Implemented by a subagent, committed as 34eea0c; review patches applied in the main session. Files: `keywords/core/{normalise,stem,index}.ts` with tests, `biome.json` allow-lists (`keywords/core`, `integrity/core`, new `shared/core`; stemmer banned elsewhere), 17 boundary fixtures, two deferred-work entries resolved.
- The three core overrides exclude `*.test.ts`, because core tests import `vitest` and `node:fs`.
- Probed Snowball stems: «utvikler»→«utvikl», «utviklere»→«utvikler», «ledelse» and «leder»→«led». Pre-steps: «-er» plural and definite forms fall back to «-er»; «-else» nouns (incl. genitive «-elses», «-elsens») keep the marker «-else».
- Review patches: genitive «-else» forms; PDF ligatures (U+FB00-FB06) and direction marks in `normalise`; all 11 dash variants tested; special characters written as Unicode escapes in source; stale deferred-work entry removed.
- Verified: `biome check`, `npm run typecheck`, `vitest run` (290 tests) pass. `docker compose run --rm --build test` and Playwright were not run locally.

## Spec Change Log

## Review Triage Log

Three independent reviewer subagents (blind, edge-case, verification-gap) ran on the diff.

| Finding | Verdict | Evidence / route |
|---|---|---|
| Multi-word terms stemmed on last word only; single-letter words glue («R og Python») | medium | Real (joined string). The spec chose joining; defer to 2.5/2.6 token matching. Deferred. |
| Dash next to digits removed («ISO-27001» vs «ISO 27001», «2020-2024») | medium | Real. The frozen intent says every dash goes. Deferred, decide with an Answer-key case. |
| «-else» genitives («ledelses», «ledelsens») not marked | medium | Real: stemmed alike with «leder». Patched, test added. |
| PDF ligatures and LRM/RLM not handled | medium | Real for LaTeX PDFs. Patched (ligature map, marks), tests added. |
| Only 6 of 11 dashes tested | medium | Mutation survived 26/26. Patched, all 11 tested. |
| Raw invisible and decomposed characters in source; duplicated-looking test lines | low | Patched: Unicode escapes. |
| Allow-list entry in deferred-work.md not removed | low | Real. Patched. |
| Relative cross-slice import from a core folder passes | medium | Pre-existing hole, same as the 1.1 deferred item. Deferred. |
| «-ere/-erne/-eren» pre-step hits verbs («analysere», «operere») | low | Real, but it merges inflections of one lemma and the spec forbids exception lists; a guard adds complexity. Rejected. |
| Attached punctuation («utviklere.») is not stripped | low | Tokenising is 2.5/2.6; `stem` takes terms. Rejected. |
| İ (U+0130) lower-cases to i + U+0307 | low | Not reachable in Norwegian text. Rejected. |
| zod subpaths, spec/tsx test files, dynamic import fixtures, tests exempt from all boundary rules | low | Speculative or deliberate (core tests need node:fs). Rejected. |
| Two functions named sameWord; stems not pinned; no Docker/Next smoke for the deep import | low | Spec leaves answer-key.ts alone; versions are exact-pinned; no app code imports the stemmer yet. Rejected. |
| Spec file unfinished (tasks, notes, triage log) | low | Fixed in this step. |

## Design Notes

Snowball Norwegian has no «-ere/-erne» rule for agent nouns and strips «-else», so «utviklere» and «utvikler» split while «ledelse» and «leder» merge. The pre-steps fix exactly those two gaps. Joining spaces in `normalise` makes split compounds compare equal to whole ones; whether a Keyword is found as a compound is stage-tagged in 2.6, not decided here.

## Verification

**Commands:**
- `npx biome check` -- expected: no diagnostics
- `npx vitest run src/modules/keywords test/lint-boundaries.test.ts` -- expected: all pass
- `npm run typecheck` -- expected: no errors
