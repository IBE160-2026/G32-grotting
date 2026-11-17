---
title: 'Story 2.11: Decide whether code alone extracts Keywords well enough (FR-5b)'
type: 'feature'
created: '2026-11-17'
status: 'in-review'
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

- `src/modules/keywords/core/sm2.test.ts`, `src/modules/match/core/analyse.test.ts`, `src/shared/core/fixtures.test.ts` -- all scan every folder under `data/fixtures/` (not `_`-prefixed); the held-out folder joins them automatically once it is complete. If SM-2 fails on it, the two list tests pin that as an expected failure (`it.fails`, an `expectedToFail` set) so required CI stays green; no other change to them.
- `src/shared/core/answer-key.ts` -- Answer-key schema: keywords split, score (must follow the lists), `mustNotMatch`, `gaps` (Rewordable + Real = Missing), `mustNeverSuggest` (subset of Real).
- `data/fixtures/nursing-sarvurdering/` -- folder shape and style to follow; ads and CVs are about 200–270 words.
- `_bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/prd.md` -- FR-5b (§6.2), §5.2, §11, §13 Open questions 2 and 6, and the 15 FR-5b hits; `.memlog.md` and `addendum.md` also mention it.
- `_bmad-output/planning-artifacts/epics.md` -- Story 3.11 and about 28 references; `architecture/…/ARCHITECTURE-SPINE.md` (16 hits), `docs/architecture.md` (3), `ux-designs/…/EXPERIENCE.md` (5): align to the outcome.
- `src/shared/server/config.ts`, `.env.example` -- the `keywordFallback` flag; read only, stays off.
- `docs/qa/hosted-deployment.md` -- record style.

## Tasks & Acceptance

**Execution:**
- [x] `data/fixtures/held-out-regnskap-kvale/{ad.txt,cv.txt,meta.json}` -- draft the held-out pair (AI may draft) -- Phase 1
- [x] `data/fixtures/held-out-regnskap-kvale/answer-key.json` -- **Helene writes by hand** from the ad and CV, without running the engine -- the held-out rule
- [x] `docs/qa/fr-5b-decision.md` -- run SM-2 twice on every Fixture and record per-Fixture results and the decision -- Phase 2
- [x] PRD, epics, architecture spine, `docs/architecture.md`, EXPERIENCE.md, PRD `.memlog.md` -- apply the Pass or Fail branch -- Phase 2

**Acceptance Criteria:**
- Given the held-out Fixture with Helene's Answer key, when `npx vitest run` runs, then SM-2 is run on all four Fixtures and its result is in `docs/qa/fr-5b-decision.md` with the date.
- Given SM-2 passes on every Fixture, when the decision is recorded, then FR-5b is deleted, Open questions 2 and 6 are closed, the flag stays off and Story 3.11 is dropped.
- Given SM-2 fails on any Fixture, when the decision is recorded, then the FR-5b table is written into the requirements it names (the eight listed, plus SM-7 and UJ-3 that the table also names), PRD §11 logs it and Story 3.11 is kept.
- Given either outcome, when the planning documents change, then the commit message names the changed IDs and the PRD `.memlog.md` has an entry.
- Given the repository, when `npx biome check`, `npm run typecheck` and `npx vitest run` run, then all pass (in the Fail case the held-out Fixture's list tests are pinned as expected failures, so the suite is green).

## Implementation Notes

- 2026-11-17, Phase 1: `ad.txt`, `cv.txt` and `meta.json` drafted by Claude for `held-out-regnskap-kvale` (accounting, Stavanger; fictional CV «Ola Brekke»); commit `649ac82`. The vocabulary file was not opened while drafting.
- Helene edited the CV wording («regnskapssystemet Visma») and wrote `answer-key.json` by hand, then fixed schema errors over four checks. Committed (`5bf585e`) before the engine's first run. Biome later reformatted the key's whitespace only (parsed content checked equal).
- Phase 2: SM-2 passed on the three tuned Fixtures and failed on the held-out one (13 differences). Helene confirmed «FR-5b applies». Record: `docs/qa/fr-5b-decision.md` (`1c3b07e`, `3590388`). The PRD, epics, architecture spine, `docs/architecture.md`, EXPERIENCE.md, addendum and `.memlog.md` were changed for the Fail branch (D24, U24).
- Review patches: stale conditionals and UX/architecture wording aligned; the held-out list tests in `sm2.test.ts` and `analyse.test.ts` are pinned with `it.fails`.
- Verified: `npx biome check`, `npm run typecheck`, `npx vitest run` (54 files, 545 passed, 2 expected fail). Docker not run.

## Spec Change Log

- 2026-11-17, review (Verification Gap, Blind Hunter, Edge Case Hunter all noted it): the Code Map said not to change the Fixture scanners, but with a failing held-out Fixture the required CI check goes red and `main` cannot be merged green. Amended the Code Map, the last acceptance criterion and the Fail-branch criterion (non-frozen). Known-bad state avoided: a permanently red suite (NFR-9). KEEP: the vocabulary and engine are not changed; the failure stays visible (`it.fails` turns red when the lists agree).

## Review Triage Log

Three reviewer subagents (Blind Hunter, Edge Case Hunter, Verification Gap) ran on the diff.

| Finding | Verdict | Evidence / route |
|---|---|---|
| Held-out SM-2 test stays red; required CI blocks the merge (all three) | high | Real; `sm2.test.ts` and `analyse.test.ts` both failed on the held-out Fixture. Spec amended (Change Log), both pinned with `it.fails`. |
| Some Matched Keywords are not literal CV strings, so part of the 13 differences may be key phrasing (all three) | medium | Real as a concern. Checked: Altinn, lønnskjøring, mva-oppgjør and bokføring are literal in the ad and not extracted, so the failure stands. Patch: section added to `docs/qa/fr-5b-decision.md`. The key itself is Helene's and was not edited. |
| `mustNotMatch` «med», «regnskapssystemet» weak; `mustNeverSuggest` empty (Blind, Edge) | low | Real, but they are Helene's fasit. Noted in the record as hers to revise; they do not change the lists. |
| Stale «only if FR-5b applies» in `epics.md` and the spine (Blind, Edge) | medium | Real; patched. `epic-2-context.md` is a generated cache and is rebuilt when the planning documents change. |
| EXPERIENCE.md contradicts FR-8, NFR-4, FR-24; grammar «the FR-5b's» (Blind, Edge) | medium | Real; patched (AI notice line, score block, phase 1, edge case). |
| Cost figure not recomputed for the third request (Blind) | low | Patched with a note: recompute when Story 3.11 measures the Keyword request. Daily-cap arithmetic (30 per day) not changed: a product decision, not part of FR-5b's table. |
| «Eight» requirements but ten changed (Blind, Edge) | low | Real; epics criterion and spec criterion now name SM-7 and UJ-3. |
| Spec status, tasks, notes and logs stale (Blind) | false | Filled by this step. |
| FR-5b is AI-first for every new ad; n=1 decision rule (Blind) | false | The scope («for a new Job ad») and the rule (any Fixture fails) are the approved FR-5b text, decided by Helene. |
| Declined-notice path conflicts with FR-24 (Edge) | low | Pre-existing: the same condition was in the approved FR-5b table and Story 3.11. Not changed here; deferred to Story 3.11. |
| Hash key without normalisation or versions (Edge) | false | AD-5 and Story 3.11 key by `contentHash(canon(ad))`; the PRD sentence only names the idea. |
| FR-5b Verify lacks the failed-request path (Edge) | false | Story 3.11's acceptance criteria cover it. |
| Key provenance not checkable from the diff (Edge) | false | Commit order shows it: `649ac82` (draft), `5bf585e` (key), then the run. |
| Cost per Application, held-out has no `cached/`, FR-28 count (Blind) | false | Story 3.11 creates `cached/keywords.json` for every Fixture; FR-28 says at least 3. |

## Verification

**Commands:**
- `npx vitest run` -- expected: all pass, 2 expected fail (the held-out Fixture; first run only after the Answer key exists)
- `npx biome check` and `npm run typecheck` -- expected: no diagnostics
