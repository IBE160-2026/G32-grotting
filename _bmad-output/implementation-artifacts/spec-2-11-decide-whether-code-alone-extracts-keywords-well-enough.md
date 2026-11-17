---
title: 'Story 2.11: Decide whether code alone extracts Keywords well enough (FR-5b)'
type: 'feature'
created: '2026-11-17'
status: 'in-progress'
route: 'dispatch'
baseline_commit: '287eb05a3bd298678619343702960c7897e88e4f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** FR-5b (AI-proposed Keywords) stays «pending» in the PRD until a held-out test shows whether code-only extraction passes SM-2 on every Fixture. The decision is due 17 November (FR-5, FR-5b, SM-2, NFR-10, PRD Open questions 2 and 6).

**Approach:** Add one held-out Fixture written after the vocabulary was tuned. Helene writes its Answer key by hand before the engine is run on it. Run SM-2 on all four Fixtures, record the result and the decision in `docs/qa/`, then change the planning documents for the outcome.

## Boundaries & Constraints

**Always:**
- Branch `story/2.11-decide-whether-code-alone-extracts-keywords` off `main`. Commits cite `2.11`. Stage by explicit path. PR, review, then merge.
- Held-out Fixture `data/fixtures/held-out-regnskap-kvale/` (`ad.txt`, `cv.txt`, `meta.json`, `answer-key.json`; no `cv.pdf`). Field: accounting, outside IT and unlike the three existing Fixtures. Fictional CV only. An AI may draft `ad.txt`, `cv.txt` and `meta.json`; **`answer-key.json` is written by Helene by hand**, and the session log says who wrote what.
- Order is fixed: draft ad and CV, then Helene's Answer key, then the first engine run on the Fixture. Nobody runs `vitest`, SM-2 or the engine while the Fixture lacks its Answer key. The Fixture's files are not tuned toward the vocabulary after the draft is committed.
- `data/vocabulary/nb.json` and `keywords/core` are **not** changed in this story. If SM-2 fails on the held-out Fixture, that failure is the evidence for the decision; do not fix the vocabulary to make it pass.
- The record `docs/qa/fr-5b-decision.md` holds: date, vocabulary version, one row per Fixture (Matched/Missing equal to the Answer key: yes/no, differences), the run-twice check (NFR-6), the decision and who took it. Helene confirms the decision; a result nobody observed is never written.
- Commit messages for planning-document edits name the changed IDs. The PRD `.memlog.md` gets an entry.

**Never:**
- No AI-written Answer key, no change to scoring, matching or any existing Fixture, no feature-flag change (`FEATURE_KEYWORD_FALLBACK` stays off in both outcomes), no Epic 3 code.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pass | SM-2 passes on all four Fixtures, twice | PRD: FR-5b deleted, Open questions 2 and 6 closed, references removed; epics: Story 3.11 dropped; flag stays off | N/A |
| Fail | SM-2 fails on any Fixture | FR-5b table written into FR-8, NFR-4, P6, NFR-8, FR-24, FR-25, FR-27, NFR-6; change logged in PRD §11; Story 3.11 kept | Failing words listed in the record |
| No Answer key yet | Fixture folder lacks `answer-key.json` | Work stops and waits for Helene | No engine run |

</frozen-after-approval>

## Code Map

- `src/modules/keywords/core/sm2.test.ts`, `src/shared/core/fixtures.test.ts` -- both scan every folder under `data/fixtures/` (not `_`-prefixed); the held-out folder joins SM-2 automatically once it is complete. Do not change them.
- `src/shared/core/answer-key.ts` -- Answer-key schema: keywords split, score (must follow the lists), `mustNotMatch`, `gaps` (Rewordable + Real = Missing), `mustNeverSuggest` (subset of Real).
- `data/fixtures/nursing-sarvurdering/` -- folder shape and style to follow; ads and CVs are about 200–270 words.
- `_bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/prd.md` -- FR-5b (§6.2), §5.2, §11, §13 Open questions 2 and 6, and the 15 FR-5b hits; `.memlog.md` and `addendum.md` also mention it.
- `_bmad-output/planning-artifacts/epics.md` -- Story 3.11 and about 28 references; `architecture/…/ARCHITECTURE-SPINE.md` (16 hits), `docs/architecture.md` (3), `ux-designs/…/EXPERIENCE.md` (5): align to the outcome.
- `src/shared/server/config.ts`, `.env.example` -- the `keywordFallback` flag; read only, stays off.
- `docs/qa/hosted-deployment.md` -- record style.

## Tasks & Acceptance

**Execution:**
- [x] `data/fixtures/held-out-regnskap-kvale/{ad.txt,cv.txt,meta.json}` -- draft the held-out pair (AI may draft) -- Phase 1
- [ ] `data/fixtures/held-out-regnskap-kvale/answer-key.json` -- **Helene writes by hand** from the ad and CV, without running the engine -- the held-out rule
- [ ] `docs/qa/fr-5b-decision.md` -- run SM-2 twice on every Fixture and record per-Fixture results and the decision -- Phase 2
- [ ] PRD, epics, architecture spine, `docs/architecture.md`, EXPERIENCE.md, PRD `.memlog.md` -- apply the Pass or Fail branch -- Phase 2

**Acceptance Criteria:**
- Given the held-out Fixture with Helene's Answer key, when `npx vitest run` runs, then SM-2 is run on all four Fixtures and its result is in `docs/qa/fr-5b-decision.md` with the date.
- Given SM-2 passes on every Fixture, when the decision is recorded, then FR-5b is deleted, Open questions 2 and 6 are closed, the flag stays off and Story 3.11 is dropped.
- Given SM-2 fails on any Fixture, when the decision is recorded, then the FR-5b table is written into the eight named requirements, PRD §11 logs it and Story 3.11 is kept.
- Given either outcome, when the planning documents change, then the commit message names the changed IDs and the PRD `.memlog.md` has an entry.
- Given the repository, when `npx biome check`, `npm run typecheck` and `npx vitest run` run, then all pass (in the Fail case the SM-2 test for the held-out Fixture is the recorded, expected failure, and the PR says so).

## Implementation Notes

- 2026-11-17, Phase 1 done: `ad.txt` (243 words), `cv.txt` (188 words) and `meta.json` drafted by Claude for `held-out-regnskap-kvale` (accounting, Stavanger; fictional CV «Ola Brekke»). The vocabulary file was not opened while drafting, and no test or engine was run on the Fixture. The wording was written as an ordinary ad and CV, not shaped toward any list.
- **Stopped on purpose.** `answer-key.json` is Helene's to write by hand from `ad.txt` and `cv.txt` (Matched, Missing, score, must-not-match, Rewordable and Real gaps, must-never-suggest; schema in `src/shared/core/answer-key.ts`). Until it exists, do not run `vitest`, SM-2 or the engine: the Fixture scanners pick up the folder and would also fail on the missing key. Resume with `bmad-build` on this spec (Phase 2: run SM-2 twice, write `docs/qa/fr-5b-decision.md`, apply the Pass or Fail branch).
- Helene may change the ad or CV before writing the key (it is a draft); once the key is written the Fixture files are frozen.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run src/modules/keywords/core/sm2.test.ts src/shared/core/fixtures.test.ts` -- expected: lists the result per Fixture (first run only after the Answer key exists)
- `npx biome check` and `npm run typecheck` -- expected: no diagnostics
