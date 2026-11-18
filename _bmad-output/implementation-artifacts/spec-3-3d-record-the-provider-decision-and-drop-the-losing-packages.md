---
title: 'Story 3.3d: Record the AI provider decision and drop the losing packages'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
baseline_commit: 'ee3cc3bce33d69c509cee14f82d479258530106e'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3-pick-the-ai-provider-in-a-bake-off.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3c-compare-several-models-through-one-openrouter-key.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The bake-off ran on 2026-11-18 (`docs/qa/bake-off/2026-11-18/`). Helene chose **Claude Sonnet 5.5 through OpenRouter** (`anthropic/claude-sonnet-5.5`), but no document says so, Open question 3 is still open, and the code still carries the two direct provider packages.

**Approach:** Record the decision where the runbook says (architecture, PRD Open question 3, the bake-off results), say plainly what it means for data handling, and remove `@ai-sdk/anthropic` and `@ai-sdk/openai` with their code paths, leaving OpenRouter as the only live provider.

## Boundaries & Constraints

**Always:**
- Branch `story/3.3d-record-the-provider-decision` (already created, you are on it); commits cite `3.3`; stage by explicit path; no push.
- Decision text, in English, dated 2026-11-18, owner Helene: model `anthropic/claude-sonnet-5.5` used **through OpenRouter, not directly**. Reasons stated honestly from `results.md`: Sonnet found 12 of 15 expected Rewordable gaps against 11, wrote more natural Norwegian in Claude's reading, and had no R1 failure; against it: one G2 failure (nursing, «erfaring med demens»), about $0.048 against $0.028 per Application (still far inside 200 NOK/month), and slower (about 14 s against 6 s for a Letter). Say that the Pass/fail cells are Claude's draft that Helene did not review cell by cell, and that she chose the model on those results. The runner-up was `openai/gpt-5.6-terra`.
- Data handling, stated as fact or as «not verified»: the Student's text reaches OpenRouter and Anthropic; every request sets `data_collection: deny` and `zdr: true`, and all 16 bake-off requests succeeded with them; OpenRouter's DPA, retention, DPF status and sub-processors, and Anthropic's retention under OpenRouter's zero-retention routing, are **not verified** and are a condition for Story 3.12 (live on Hosted) and for the AI notice (Story 3.6), which must name OpenRouter and Anthropic. PRD §8.1 is not amended and not claimed met; add the condition.
- `docs/architecture.md`: update the summary table row, the section 4 Decision, Data rules, Cost (use the measured figures and the model's price of 2 and 10 USD per million tokens) and the «Why the Vercel AI SDK» paragraph, which says no extra company handles the text: change it to say this holds for direct calls and that the chosen route adds OpenRouter, why (one key, the zero-retention filter, comparing models without code), and that Helene accepted this. Keep the edits small and consistent with the surrounding style.
- PRD (`_bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/prd.md`): Open question 3 marked resolved 2026-11-18 with a pointer to the architecture; the sentence in §8.1 about the bake-off and the line that says Open questions 3, 5 and 8 are open updated to match; add the data-handling condition as an open item under §13. No other PRD change.
- Code: remove `@ai-sdk/anthropic` and `@ai-sdk/openai` from `package.json` and the lockfile (`npm uninstall`); `LIVE_PROVIDERS` becomes `["openrouter"]`; the other branches, imports and tests go; `createLiveAdapter` still rejects any other provider name with the plain error. `ai` and `@openrouter/ai-sdk-provider` stay.
- `scripts/bake-off.ts` keeps working with OpenRouter only: the `anthropic` and `openai` contenders, their keys, models and price flags are removed; contender ids stay `openrouter:<model>`; `--dry` plans one contender per listed model (or one mock model); all other rules from 3.3c stay. Update its tests, `.env.example` and the terms file's runbook references.
- `docs/qa/bake-off-runbook.md`: rewrite to match (OpenRouter only), mark steps 1–7 done on 2026-11-18 with a pointer to the decision, keep step 8 (what Helene sets: `AI_PROVIDER=openrouter`, `AI_MODEL=anthropic/claude-sonnet-5.5`, `AI_API_KEY` in the git-ignored `.env`; `AI_RETENTION_DAYS` waits for the verified retention, do not guess a number) and fix the export line whose closing quote is missing. The file has uncommitted edits by Helene (table formatting, a model id); keep them where they still apply. `docs/qa/ai-provider-terms.md`: add a «Decision» section pointing to the architecture; keep the direct-provider tables as the record of what was compared.
- Commit-ready `docs/qa/bake-off/2026-11-18/` (outputs and `results.md`, currently untracked) with a «Decision» header added to `results.md`; do not change the DRAFT cells. Do not commit yourself; the caller does.
- `deferred-work.md`: add one entry for verifying OpenRouter's terms and Anthropic's retention under zero retention before Story 3.12; add a «decided 2026-11-18» note to the 3.3 and 3.3b entries about `AI_PROVIDER` typos and notice wording only.

**Never:**
- No live or network request; no key in the repo; no change to `runAi`, config, the cap, the notice; no claim that PRD §8.1 is met; no invented retention number; no push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Live OpenRouter | provider `openrouter`, model, key, not a test run | Adapter as in 3.3b | N/A |
| Removed provider | provider `anthropic` or `openai` | `createLiveAdapter` throws the plain unsupported-provider error | N/A |
| Live in a test run | `createAdapter('live', { isTestRun: true, … })` | Throws, as before | N/A |
| Bake-off, OpenRouter settings | key and models | One contender per model | Missing key or models: usage error |
| Bake-off, old settings | `BAKE_OFF_ANTHROPIC_KEY` or `BAKE_OFF_OPENAI_KEY` set | Ignored | N/A |
| Dry run | `--dry` | One mock OpenRouter contender per listed model, temp directory | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/ai/server/adapters/live.ts`, `live.test.ts`, `factory.test.ts` -- remove the Anthropic and OpenAI branches; `run-ai.test.ts` may name the provider.
- `scripts/bake-off.ts`, `scripts/bake-off.test.ts`, `scripts/bake-off/results.test.ts` -- OpenRouter-only contenders.
- `package.json`, lockfile; `.env.example`.
- `docs/architecture.md` (lines 9, 78-86), PRD (lines 38, 549, 693, 887-895), `docs/qa/bake-off-runbook.md`, `docs/qa/ai-provider-terms.md`, `docs/qa/bake-off/2026-11-18/results.md`.
- `_bmad-output/implementation-artifacts/deferred-work.md`.

## Tasks & Acceptance

**Execution:**
- [x] `docs/architecture.md`, PRD, `results.md` header -- record the decision and its data-handling condition -- Open question 3
- [x] `package.json`, lockfile, `live.ts`, tests -- drop the two direct packages and their branches -- AD-3
- [x] `scripts/bake-off.ts`, tests, `.env.example` -- OpenRouter only
- [x] `docs/qa/bake-off-runbook.md`, `ai-provider-terms.md`, `deferred-work.md` -- steps done, step 8, decision pointer, verification entry

**Acceptance Criteria:**
- Given the Always rules, when `npx biome check`, `npm run typecheck`, `npx vitest run` and `npm run db:check` run, then all pass with no network call.
- Given `rg "@ai-sdk/anthropic|@ai-sdk/openai|createAnthropic|createOpenAI" . --glob '!node_modules' --glob '!_bmad-output' --glob '!docs/qa/bake-off/**'`, when run, then nothing matches outside historical docs that say what was compared.
- Given the PRD, when Open question 3 is read, then it is resolved with the model, the route and the open data-handling condition, and nothing claims §8.1 is met.
- Given `npx tsx --conditions=react-server scripts/bake-off.ts --dry`, when it runs, then it writes one OpenRouter contender to the OS temp directory.

## Implementation Notes

- 2026-11-18: built by a subagent from this spec; review pass 1 patched by the same subagent (docs wording, PRD dates, runbook honesty, README and `.env.example`). The first dispatch started before the spec file existed and waited for it.
- Decision recorded: `anthropic/claude-sonnet-5.5` through OpenRouter, runner-up `openai/gpt-5.6-terra`, in `docs/architecture.md`, PRD Open question 3 and the `results.md` Decision section. The text says what is not verified: retention under zero-retention routing, which host served the requests, OpenRouter's DPA, DPF status and sub-processors, and the monthly limit and ZDR-only setting in the dashboard. PRD §8.1 is not amended and not claimed met.
- Code: `@ai-sdk/anthropic` and `@ai-sdk/openai` removed; `LIVE_PROVIDERS` is `["openrouter"]`; the bake-off script is OpenRouter only. `AI_RETENTION_DAYS` is not set: no number is guessed.
- Verified: `npx biome check`, `npm run typecheck`, `npx vitest run` (63 files, 714 passed, 2 expected fail), `npm run db:check`, `--dry` run, and the `rg` check for the removed packages (no match outside excluded paths).

## Spec Change Log

## Review Triage Log

Pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap):

| Finding | Verdict | Route / evidence |
|---|---|---|
| Decision text says zero-retention routing «keeps none» while retention is «not verified» | medium | patch (docs). A decision record must not state an unverified outcome as fact. |
| «Reaches OpenRouter and Anthropic» assumed; OpenRouter may route to another host and the serving host was not recorded | medium | patch (docs) and deferred-work entry extended (read the host from the activity log; consider `provider.only`). |
| Naturalness advantage is Claude's own reading, Claude drafted the cells and Sonnet is a Claude model; margin 12 against 11 with one run | medium | patch (docs): disclose, and state the margin is small. |
| «No R1 failure» omits the unresolved Check on pull requests | low | patch (docs, same sentence). |
| PRD Open question 3 still labelled «Partly resolved»; open item lost its date | medium | patch (PRD, two lines). |
| Runbook marks step 1 (limit, ZDR-only) and step 2 done without evidence; architecture cites a limit not confirmed | medium | patch (docs). |
| README and `.env.example` do not say the only valid provider is `openrouter`; an Examiner with a direct key burns a cap slot per request | medium | patch (docs). |
| Stray « ;» in one L8 cell | low | patch. |
| Cost claims: no exchange rate, ignores platform fee and the Keyword request | low | patch (state the assumption); the rest is rejected. |
| Single-route risks (404 if the ZDR endpoint is lost, downtime, model deprecation) not recorded; FR-24 and §8.1 wording in the singular | low | patch: added to the deferred verification entry. |
| `G4` and `R3` are undefined in PRD §9.2 | false | PRD §9.2 defines G1–G5 and R1–R3. |
| `results.md` generator still prints «The decision is Helene's» above the Decision block; header word count 291 vs «about 292» | low | reject. The generator text is generic; the counts differ by tokenisation and the cell says «about». |
| FR-24, §8.1, FR-30 and §14 not updated in the PRD | low | reject as a PRD edit (the spec limits PRD changes to Open question 3, the cost line and the status line); recorded in the deferred entry for Story 3.6. |
| `hasKey` ignores `AI_RETENTION_DAYS`, so live can run with retention «unknown» | low | reject. Deliberate in 3.2: the notice shows «unknown» until Story 3.6 and Story 3.12 set it. |
| Vestigial one-element `LiveProvider` union and `provider` parameter; `provider` field now holds contender ids in tests | low | reject. The spec keeps the provider guard; a rename adds churn for no named harm. |
| Removed tests: dry run with models and no key; the key-or-models hint in the unplanned-price error | low | reject. The branch only shapes an error hint in a developer script. |
| Spec bookkeeping (empty notes, commit wording) | false | Notes are written after review. |

## Verification

**Commands:**
- `npx biome check` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npm run db:check` -- expected: migrations apply from zero
