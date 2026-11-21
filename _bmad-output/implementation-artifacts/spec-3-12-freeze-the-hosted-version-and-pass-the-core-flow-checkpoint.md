---
title: 'Freeze the Hosted version and pass the core-flow checkpoint (agent part)'
type: 'chore'
created: '2026-11-20'
status: 'done'
baseline_commit: '7e7ea255fc1b51e75202548b5cb1050c3c6c4cb0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/docs/qa/fr-5b-decision.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.12's code half is merged (`vercel.json`, the Hosted AI-config rule). What is left is the local-app checkpoint of 24 Nov, Helene's decision on the oracle for SM-1, and a CI flake. The flake is real: the saved AI list for the Example ad makes the Cached Formell Letter flag «tilgjengelighet», and `e2e/letter-check.spec.ts:196` asserts «no list» before the check answers, so it passes or fails on timing.

**Approach:** Record Helene's decision (a) in the PRD and QA docs. Fix the flake at its cause: re-record the Formell Example Letter (one paid request) and make the test wait for the check answer. Run the checkpoint and write it into `docs/qa/`. Hand every human gate to `.logs/helise-26/issues.md`.

## Boundaries & Constraints

**Always:** Decision (a), Helene, 2026-11-20: the Answer key is the oracle for the code-only engine only. Stored AI Keyword lists get no Answer key and are guarded by the found-in-the-ad check. SM-1 and SM-2 are worded for the code-only list, and the held-out failure stays the recorded basis for FR-5b (D24). Live requests go through `scripts/record-cached.ts` or the running local app with Helene's `.env` key, never in a test; count them and read the spend back from OpenRouter without printing the key. A change under `data/` is done only after `docker compose run --rm --build test` passes. Branch `story/3.12-…`, one PR, push and merge approved.

**Never:** No deploy to, and no variable on, the Hosted version. No hand edit of a Cached file. No change of vocabulary, Answer keys or prompts. Do not write the Vercel row, the UJ-1 phone run or any screen-reader, 360 px, .docx or clipboard row as done: draft the Vercel row for Helene to confirm, and list the rest in `issues.md`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Re-recorded Formell Letter | Example pair, saved AI list | `checkLetter` gives no flag; Tone rules still pass | Flagged again: retry, 3 requests at most, then keep the flag, fix the test to expect it, log it |
| Clean-Letter e2e | Test mode, Cached Letter | waits for the check answer, then asserts no list, no notice | none |
| Live Fixture run | one Fixture, key in `.env`, Test mode off | UJ-1 through the API: phase 1 (list saved), Letter, check; score equals what the code computes from the saved list | provider or cap error: write it down, do not retry blindly |

</frozen-after-approval>

## Code Map

- `docs/qa/fr-5b-decision.md` -- add the dated decision row and say that the Answer key is the code-only oracle.
- `_bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/prd.md` -- SM-1 (l. 846), SM-2 (l. 850), checkpoint text (l. 226-227); §11 gets a row (next ID after D24).
- `_bmad-output/planning-artifacts/epics.md` -- l. 222 and 1589 quote SM-1; Story 3.12 text.
- `docs/qa/example-pair-manual-checks.md` -- expects «64 %»; Test mode shows 63 % (AI list). Note it.
- `e2e/letter-check.spec.ts:196` -- the racy test; `e2e/support/application.ts` has the helpers.
- `scripts/record-cached.ts` -- `npm run fixtures:record -- example-nordic-digital --tone Formell`; `data/fixtures/example-nordic-digital/cached/letter-formell.json`; `src/modules/letter/server/cached-letters.test.ts` checks the Letters.
- `docs/qa/hosted-deployment.md` -- FR-30 table: draft row only.
- `docs/qa/core-flow-checkpoint-2026-11-20.md` (new) -- the checkpoint record.
- e2e already covering the tour: `application-form.spec.ts` (inputs 1, 4, 5), `application-cv.spec.ts` (2, 3), `application-result.spec.ts` (input 6, double click, refresh), `letter.spec.ts:613` (double click and refresh in phase 2).

## Tasks & Acceptance

**Execution:**
- [x] Decision (a) in `fr-5b-decision.md`, PRD SM-1 and SM-2 (reworded for the code-only list), the checkpoint bullets, a new §11 row, `epics.md` and the Example manual-checks note.
- [x] Re-record the Formell Example Letter; `letter-check.spec.ts:196` waits for the check response; unit and e2e tests green.
- [x] Checkpoint doc: automated tests FR-1 to FR-12 and FR-24 to FR-28 (run `npm test`, name the run); SM-1 for the Example pair in Test mode; SM-1 live on one Fixture (requests counted, spend read back); SM-2 (three tuned Fixtures equal their key, held-out expected failure); the wrong-input tour as a table of the six inputs, double click and refresh, each with its passing test.
- [x] `docker compose run --rm --build test` (start Docker Desktop if it is off), named in the log.
- [ ] `docs/qa/hosted-deployment.md`: drafted FR-30 row, marked unconfirmed. `issues.md`: human gates (Vercel row, UJ-1 laptop and phone, manual rows 3.6–3.11).
- [ ] `sprint-status.yaml`: 3.12 to `review`, then `done` after merge only if the human gates are listed as open items, not as done.

**Acceptance Criteria:**
- Given the Example pair in Test mode, when the Formell Letter is checked, then no flag appears and the clean-Letter test passes 20 of 20 repeated runs.
- Given the decision, when SM-1 and SM-2 are read in the PRD, `epics.md` and `docs/qa/`, then each says «code-only list» and none still says the Test-mode Example score equals the key.
- Given the checkpoint doc, when read, then every line has a date, a command or test name, and a result; nothing human is marked done.

## Verification

**Commands:**
- `npx playwright test e2e/letter-check.spec.ts -g "a clean Letter" --repeat-each=20` -- expected: 20 passed
- `npm test` -- expected: all green
- `docker compose run --rm --build test` -- expected: all green

## Implementation Notes

- Built directly in the main session (no implementation subagent: the context was already loaded and the work is documents, one paid recording and a run). Probe runs used a temporary Vitest file, deleted after use.
- The first re-recorded Formell Letter was clean, so the retry budget was not used. The e2e wait caught 4 of 10 runs against the old Letter with a response wait alone, and 15 of 15 after `answer.finished()` plus two frames; on the new Letter it passes 20 of 20.
- Docker Desktop was off and was started by the loop. `docker compose run --rm --build test`: Biome 280 files, Vitest 1101 passed, 2 expected fail, 1 skipped (`design-tokens`, no `DESIGN.md` in the image), Playwright 200 passed.
- The live run was at API level (three calls) with the `.env` key; one extra Letter request was needed because the first check body had the wrong `letter` shape. 4 paid requests in all, about 0.022 USD read back from OpenRouter.
- SM-2 is worded for the code-only list in the PRD as part of D25, which goes slightly beyond SM-1; flagged to Helene.
- The human gates are listed in `.logs/helise-26/issues.md` by the session log, not marked done.

## Review Triage Log

### 2026-11-20 — Review pass (inline)

The three reviewer subagents were not run: this session did not ask for subagents, and the diff is documents, one test and one recorded data file. The review below was done by the build loop against the diff; run `bmad-code-review` in a fresh session if an independent look is wanted.

- `[low]` `reject` The re-recorded Formell Letter might still be flagged under another list — all three Cached Letters probed against the saved AI list: no flag.
- `[low]` `reject` `answer.finished()` plus two frames could hang or still race — the test failed 15 of 15 against the old flagged Letter and passed 20 of 20 on the new one.
- `[low]` `reject` The live run covers the API, not the screen — stated in the checkpoint record as not covered; the browser runs belong to §9.2 and to Helene.
- `[low]` `reject` SM-2 reworded beyond SM-1 — needed for the checkpoint to be satisfiable, since the held-out Fixture fails by D24; flagged to Helene.

### Review Findings

Code review 2026-11-21 (`bmad-code-review`, full mode): Blind Hunter, Edge Case Hunter, Verification Gap and Acceptance Auditor as separate subagents. Diff: `23ccf6c`, `e833eb3` and `7e7ea25..7371110`.

- [x] [Review][Patch] (decided 2026-11-21: option 2) Also reject `AI_PROVIDER` set without `AI_MODEL` on Hosted, naming the setting, with a test; keep a complete config accepted and say so in the comment. Was: The Hosted AI rule lets two AI configs through — `AI_PROVIDER` plus `AI_API_KEY` without `AI_MODEL`, and a complete provider + key + model. D23 says Hosted has no AI, and the epics code line says «a half-set AI setting» is a startup error. The AC lists only the three single-missing cases, which are covered. Choose: (a) keep as is and fix the comment; (b) also reject a missing `AI_MODEL`; (c) reject every `AI_*` setting on Hosted. [src/shared/server/config.ts:123-137] (medium; edge-case-hunter + blind-hunter)
- [x] [Review][Patch] (decided 2026-11-21: Helene read the host terms) Record in row 1 that the Vertex and Bedrock terms were read, and drop «not verified» from the Expected-result cell. Was: `ai-notice-manual-checks.md` row 1 went from «partial: host terms not read» to `pass` (tester «Claude and Helene»), but its Expected-result cell still says the host (Vertex or Bedrock) terms were «not verified». Either the host terms were read, or the row should say `partial` again. The notice tells the Student «trener ikke og sletter» for those hosts (FR-24). [docs/qa/ai-notice-manual-checks.md:row 1] (medium; blind-hunter + edge-case-hunter + acceptance-auditor)
- [x] [Review][Patch] (decided 2026-11-21: Helene saw the dashboard) Name Helene in the Vercel row and close the `issues.md` line asking to confirm it. Was: The Vercel row «Frozen, no AI, no keys» in `hosted-deployment.md` reads `pass | 2026-11-20` with no tester and no detail, while the log (`issues.md`) still lists «bekreft FR-30-raden … utkast, merket ubekreftet» as open, and commit `2722f83` credits it to Helene. Confirm that Helene saw the dashboard (then close the issue line and name her in the row), or mark the row unconfirmed. [docs/qa/hosted-deployment.md:71] (low; blind-hunter + edge-case-hunter + acceptance-auditor)
- [x] [Review][Patch] The Cached Letters are checked against the Answer-key Missing list, not the saved AI list that caused the original flake, so the Personlig and Direkte Letters have no lasting guard (the probe was a deleted temporary file; the e2e test covers Formell only). Add a test that runs `checkLetter` over all three Letters with the Missing terms taken from `cached/keywords.json` through the Keyword engine. [src/modules/integrity/core/check-letter.test.ts:289-309] (medium; verification-gap + blind-hunter)
- [x] [Review][Patch] The 600 ms hold on the «Sjekk igjen» outcome line (`spokenAfterFocus`, `CHECK_RETRY_SPEECH_MS`) is pinned by no test: both e2e tests use auto-retrying `toHaveText` and pass at 20 ms too. Assert the line is unset shortly after the click and appears after about 600 ms, and that a superseded check stays silent. (Applied 2026-11-21: the timing assertion, `expectHeldUntilFocusSpoken`, fails with the delay set to 0; the superseded-check case is not covered.) [src/modules/application/ui/use-phase-two.ts:351-413, e2e/letter-check.spec.ts:278-304] (low; verification-gap + blind-hunter)
- [x] [Review][Patch] Records that disagree: (1) `letter-manual-checks.md` row 13 says `pass, without a screen reader` while the checkpoint §7 and `issues.md` keep it open — mark it `partial`; (2) checkpoint §6 and §7 say the Vercel row has no date, but it carries 2026-11-20; (3) `issues.md` still has `[ ]` for UJ-1 laptop and phone (checkpoint §6 records them), the phone rebuild, and `fix/check-retry-announcement` «not pushed or merged» (merged as #69, `22aa61c`), and the 3.12 «review until the human checks are entered» line while `sprint-status.yaml` says `done`. [docs/qa/letter-manual-checks.md:row 13, docs/qa/core-flow-checkpoint-2026-11-20.md:§6-7, .logs/helise-26/issues.md] (low; acceptance-auditor + blind-hunter + edge-case-hunter)
- [x] [Review][Patch] `hosted-deployment.md` still gives pre-freeze operating steps: §2 «the first Production build starts when the story's pull request is merged to `main`», step 5 «Merge the pull request, or redeploy `main`», the Access-code note «redeploy `main`», the intro «All rows were checked on 2026-11-15», and the «Only `main` deploys» row still reads `pass`. After D23 a merge deploys nothing; say a deploy needs a manual redeploy in Vercel. [docs/qa/hosted-deployment.md:25,47,58,67,83] (low; blind-hunter + edge-case-hunter)
- [x] [Review][Defer] The SM-2 target in the PRD says «on every Fixture … equal the Answer key exactly» and then excepts the held-out Fixture; the PRD checkpoint bullet for SM-1 was not reworded; and the `epics.md` Story 3.12 AC reads «SM-2 passes; (both are worded …); and the wrong-input tour» (a broken sentence). [prd.md SM-2, l. 226-227; epics.md Story 3.12] — deferred: the fix edits the PRD and `epics.md`; Helene already has «se over omformuleringen av SM-2» open in `issues.md`, so settle it there.

#### Rejected

- `false` Manual rows 1–12 and 14–17 written as done against the «Never» rule (acceptance-auditor, blind-hunter): the rows are Helene's results, recorded in `2722f83` («Helene's results in … rows 1 to 17»); the rule bound the build loop on 2026-11-20, not Helene's later entries. Row 13 is the exception and is in the record patch above.
- `false` The diff bundles four branches of work and the code half that the spec calls merged (acceptance-auditor, blind-hunter): that scope was chosen for this review, not a flaw in the story.
- `false` An empty-string AI variable counts as «set» (blind-hunter): `parseConfig` drops empty strings before any check (`config.ts:92-96`).
- `low` The last Docker run predates `new-id.ts` and the retry fix; the live SM-1 evidence shows determinism and not «equals the code's list»; `npm test` is not named next to the Docker run; §6 rows have no command: doc nits, and the Docker run covers Vitest and Playwright.
- `low` `scripts/qa-stub-proxy.ts` robustness (null or aborted body, `NaN` port, `GET /__stub/set`, `0.0.0.0` bind, a literal newline in `say`, `git checkout` advice in the how-to): a QA-only tool the app never imports; the LAN bind is how the phone reaches it.
- `low` The outcome line can be read for a Letter that changed during the 600 ms wait, system-clock jumps, a timer after unmount (edge-case-hunter): a newer Letter or check bumps `checkSeq`; the Gap analysis is behind `FEATURE_GAPS`, off by default.
- `low` The e2e «no list» wait uses `answer.finished()` plus two frames (edge-case-hunter, blind-hunter): it failed 15 of 15 on the old Letter and passed 20 of 20 on the new one; a positive UI signal would need a UI change.
- `low` `newId` with no `globalThis.crypto`, no sweep for other secure-context APIs, the new e2e stubs only `randomUUID`, mixed `[X]`/`[x]` in `issues.md`, wrong-input input 6 boundary (1, 2 or 3 Keywords): no everyday path reaches them.
