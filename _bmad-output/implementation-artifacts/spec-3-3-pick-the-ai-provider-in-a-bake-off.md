---
title: 'Story 3.3: Pick the AI provider in a bake-off'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
baseline_commit: 'e37ac195ac58ccccf04df8fc5f66e03501c5ee26'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The only adapter that can reach a provider does not exist yet, and the provider and model (PRD Open question 3) are chosen on no evidence. Story 3.4 needs a live adapter, and `config.aiNotice` needs a winner.

**Approach:** Build everything the bake-off needs, and stop where a human must act: the Vercel AI SDK `live` adapter for both contenders, a `scripts/bake-off.ts` with rough Letter and Gap prompts that records outputs, token counts and cost for hand scoring, and `docs/qa/` terms rows. Running the script with keys, scoring, picking the winner and removing the losing package are Helene's steps, written as a runbook. No paid request is made in this story.

## Boundaries & Constraints

**Always:**
- Branch `story/3.3-pick-the-ai-provider-in-a-bake-off` off `main`; commits cite `3.3`; stage by explicit path; PR, review, then merge.
- Contenders: `@ai-sdk/anthropic` and `@ai-sdk/openai`, with the core `ai` package, all pinned exactly (`.npmrc` has `save-exact`). Both stay in `package.json` until Helene records the winner; the loser is removed in that later commit, not here.
- Config: `AI_MODEL` becomes a read, optional setting in `config.ts` (`config.ai` gains `provider`, `model`, `apiKey`, all `string | undefined`); the key never enters `RunMode`. Live needs `AI_PROVIDER`, `AI_MODEL` and `AI_API_KEY`: with any missing, or in a test run, `testMode` is true as today. `AI_MODEL` does not change `aiNotice.version`.
- `createAdapter('live', { isTestRun, live? })`: still throws first when `isTestRun`; outside a test run it builds the adapter from `live: { provider, model, apiKey }`, and throws a plain error on a missing field or a provider other than `anthropic` | `openai`. `runAi` passes `getConfig().ai`. The adapter receives its model through an injectable function so tests use the SDK's mock model, never a network.
- The live adapter implements `AiAdapterPort`: structured output from the request's `schema` through the SDK, the `signal` as `abortSignal`, `maxRetries` passed as given, usage mapped to `{ inputTokens, outputTokens }` (`null` when the SDK gives none), `kind: 'live'`. It returns the raw object; `runAi` still validates. It never logs and never puts the key, prompt or response in an error message.
- `scripts/bake-off.ts` reads `BAKE_OFF_ANTHROPIC_KEY`, `BAKE_OFF_OPENAI_KEY`, `BAKE_OFF_ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), `BAKE_OFF_OPENAI_MODEL` (no default: refuses to run without it) and `--price-in` / `--price-out` (USD per million tokens, per contender, no built-in prices). For every Fixture with `cv.txt` and `ad.txt` and both contenders it makes one Letter request and one Gap request, with `stripContactDetails` applied to the CV, and no retries. `--dry` uses the mock adapter, needs no key and writes to the OS temp directory unless `--out <dir>` is given. Tests never call it live.
- A live run's output goes to `docs/qa/bake-off/<date>/<provider>/` as the raw Letter text and Gap JSON per Fixture, plus `docs/qa/bake-off/<date>/results.md`: per output a scoring table of L1–L8 (Letter) or G1–G3 and R1 (Gap) with blank pass/fail cells, input and output token counts, and an estimated USD cost per Application; a failed request is recorded with its error code, no content.
- Rough prompts live beside the script (`scripts/bake-off/prompts.ts`), are in English instructions asking for bokmål, and carry the FR-9/FR-10 rules, the integrity rule (use only what the CV shows) and the Gap rule (Real gaps worded honestly). They are throwaway: Story 3.4 writes the real prompts under a `PROMPT_VERSION`.
- `docs/qa/ai-provider-terms.md`: per contender, paid tier, no training on inputs, retention period, DPA availability and EU–US Data Privacy Framework status, each with the source URL and the date checked; a fact not confirmed from a primary source reads «not verified». `docs/qa/bake-off-runbook.md` lists Helene's steps in order: monthly spending limit when the key is made, env names, the script command, scoring, decision recorded in `docs/architecture.md` and the PRD (Open question 3 closed, §8.1 amended if the winner is not on the DPF list), `AI_PROVIDER`/`AI_MODEL`/`AI_RETENTION_DAYS` set, losing package removed.

**Never:**
- No paid or network request in any test or in this story's verification; no key in the repo; no `console.*` in `src`; no change to `runAi` order, notice or cap; no cached adapter, real prompt, route or UI; no decision recorded as made; no edit of `architecture.md` or the PRD other than a pointer line to the runbook if `architecture.md` lists `docs/qa` contents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Live in a test run | `createAdapter('live', { isTestRun: true, … })` | Throws | N/A |
| Live configured | `anthropic`, model, key, not a test run | Adapter with `kind: 'live'`, `provider`, `model` | N/A |
| Live incomplete | Missing model or key, or provider `foo` | Throws a plain error naming the field, never the key | N/A |
| Structured output | Model returns an object | `generate` returns it raw with token counts | Schema mismatch stays with `runAi` |
| Provider error | SDK rejects, message holds prompt text | `generate` rejects with a generic error | No prompt text in the message |
| Abort | Signal aborts mid-call | `generate` rejects | `runAi` maps it to `AI_TIMEOUT` |
| Config without model | Provider and key set, no `AI_MODEL` | `testMode` true | N/A |
| Bake-off dry run | `--dry` | Files and `results.md` written (temp dir or `--out`) for every Fixture, no network | N/A |
| Bake-off missing setting | No `BAKE_OFF_OPENAI_MODEL` or a key, no `--dry` | Exits non-zero naming the setting, writes nothing | N/A |
| One request fails | A contender errors on a Fixture | Row recorded with the error code; the run continues | No content in the record |

</frozen-after-approval>

## Code Map

- `src/modules/ai/server/adapters/factory.ts` -- `createAdapter`, `AiAdapterPort`; the `live` case is the stub to replace. `mock.ts` is the pattern for a test double.
- `src/modules/ai/server/run-ai.ts:137` -- the `createAdapter(getConfig().ai.adapter, …)` call: pass the new live settings; nothing else changes.
- `src/shared/server/config.ts` (+ `config.test.ts`) -- `envSchema`, `hasKey`, `ai`; add `AI_MODEL`, widen `ai`. `src/shared/server/run-mode.ts` must still carry no key (its test).
- New: `src/modules/ai/server/adapters/live.ts` (+ test with the SDK's mock language model), `scripts/bake-off.ts`, `scripts/bake-off/prompts.ts`, `scripts/bake-off/results.ts` (pure: cost, table rendering; + tests), `docs/qa/ai-provider-terms.md`, `docs/qa/bake-off-runbook.md`.
- `src/modules/ai/core/strip-contact.ts`, `data/fixtures/*/{cv.txt,ad.txt,meta.json}` -- reuse as inputs; do not change.
- `.env.example` -- add the `BAKE_OFF_*` names only. `package.json`/lockfile -- three new exact dependencies. `docs/architecture.md:148` -- `docs/qa` row; add a runbook pointer only.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, lockfile -- add `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai` at pinned versions that agree on the provider-spec version -- AD-3
- [x] `src/shared/server/config.ts`, `config.test.ts`, `.env.example` -- `AI_MODEL`, `config.ai.{provider,model,apiKey}`, `hasKey` needs the model -- AD-4
- [x] `src/modules/ai/server/adapters/live.ts`, `factory.ts`, `run-ai.ts`, tests -- the live adapter and factory wiring; every matrix row without a network -- AD-3, NFR-8
- [x] `scripts/bake-off.ts`, `scripts/bake-off/{prompts,results}.ts`, tests -- the bake-off and a `--dry` run test in a temp directory -- PRD §8.2
- [x] `docs/qa/ai-provider-terms.md` -- terms per contender from primary sources, dated, unknowns marked -- §8.1
- [x] `docs/qa/bake-off-runbook.md`, `docs/architecture.md` pointer -- Helene's steps -- Open question 3

**Acceptance Criteria:**
- Given the Always rules, when `npx biome check`, `npm run typecheck`, `npx vitest run` and `npm run db:check` run, then all pass with no network call.
- Given the Verification dry run, when it ends, then `git status` shows no new file under `docs/`.
- Given `rg "adapters/" src` outside `src/modules/ai`, when run, then nothing imports an adapter.
- Given `npx tsx --conditions=react-server scripts/bake-off.ts --dry --out <dir>`, when it runs, then `<dir>/results.md` lists every Fixture with both contenders and blank checklist cells.
- Given a failed request on the live adapter, when the log spy and the error are read, then neither holds the key, the prompt or the response.

## Implementation Notes

- 2026-11-18: built by a subagent from this spec; review pass 1 patched by the same subagent (four patches). Pinned `ai@7.0.176`, `@ai-sdk/anthropic@4.0.106`, `@ai-sdk/openai@4.0.121` (all on `@ai-sdk/provider@4.0.39`).
- The live adapter uses `generateText` with `Output.object`. The SDK validates the shape itself, so a mismatch is an `AiProviderError` with code `SCHEMA_MISMATCH`, and `runAi` maps it to `AI_PROVIDER_ERROR`. Every provider failure is fixed text plus a code (`HTTP_<n>`, `ABORTED`, `SCHEMA_MISMATCH`, `PROVIDER_ERROR`).
- The bake-off asks for one Letter (Formell) and one Gap per Fixture and contender; a live run refuses a folder that already holds `results.md`. `--price-in`/`--price-out` take `provider=usd`; no prices are built in.
- Not done, by design: no live request, no scoring, no winner, the losing package stays. Runbook steps 1-8 in `docs/qa/bake-off-runbook.md` are Helene's. `docs/qa/ai-provider-terms.md` is unconfirmed by her and marks DPF status «not verified» for both contenders.
- Verified: `npx biome check`, `npm run typecheck`, `npx vitest run` (63 files, 698 passed, 2 expected fail), `npm run db:check`, and a `--dry` run to the temp directory (nothing new under `docs/`). Docker and e2e not run locally.

## Spec Change Log

## Review Triage Log

Pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap):

| Finding | Verdict | Route / evidence |
|---|---|---|
| `runAi` → `createAdapter` live hand-off is never tested; deleting `live:` passes every test | medium | patch (pre-verified gap). Every `runAi` test injects its own adapter. |
| Shape mismatch is recorded as `PROVIDER_ERROR` on a live run; the test title "leaves a shape mismatch to runAi" contradicts its body | medium | patch. The SDK validates inside `generateText`; map its errors to `SCHEMA_MISMATCH` so the Bake-off can compare structured-output reliability; rename the test. |
| Re-running the live script on the same date overwrites a hand-scored `results.md` and paid outputs | medium | patch. Refuse an existing `results.md` in a live run. |
| Terms file points to runbook step 3, the terms check is step 2 | low | patch (one word). |
| Schema sent to the model is not asserted in `live.test.ts` | low | patch (verification gap, one assertion). |
| A provider other than `anthropic` or `openai` (typo, case) gives Test mode off, a cap slot burned per request, then a throw | medium | defer. Fix is a startup check in `config.ts` (or checking the adapter before the reservation, which changes the AD-13 order the spec fixes). Helene sets the value in runbook step 8, which names the two valid ones. |
| Bake-off live path (`defaultAdapterFor(false)`) and CLI exit code are unverified | maybe-false (would be medium) | defer. Settle with a test that stubs the model factory and checks each contender's key and model; Helene's first run is the manual check. |
| Whitespace or case in `AI_PROVIDER`/`AI_MODEL` | low | reject. Values are set once by Helene; a guard adds branches for no shown path. |
| Results lost if the paid run is killed midway | low | reject. Raw outputs are on disk, 16 cheap requests; a re-run is acceptable. |
| No Fixtures found gives exit 0 and an empty file | low | reject. Four Fixtures are committed. |
| Billed tokens recorded as null on a failed or mismatched request | low | reject. The SDK gives no usage on a thrown error; the cost cell says why it is n/a. |
| Price argument forms (`anthropic= `, `=3=4`), repeated flags, `--out=dir` | low | reject. Developer-run CLI, usage errors are visible. |
| Letter requests are Formell only; L6 and Direkte word limit cannot be scored | false | The spec asks for one Letter per Fixture; Tone rules are scored in Story 3.7. |
| Triple quotes in Fixture text close the prompt delimiter | low | reject. Fixtures are ours and throwaway prompts. |
| `RetryError` / 429 detail hidden by the fixed-text error | low | reject. `maxRetries` is 0, and the message must not carry provider text. |
| Failed request loses cost; no preflight; temperature and reasoning tokens not pinned; single sample; no mechanical L3/L5/L8/G1 pre-checks; cost not tied to the NFR-8 budget | low | reject. Scope beyond the spec (hand scoring is the spec); each adds machinery to a throwaway script. |
| Terms file uneven between contenders; DPF unverified for both | low | reject. The file marks every unverified row and the runbook assigns them to Helene. |
| `apiKey` on the general `Config` object could leak if `Config` is logged | low | reject. `Config` already holds `accessCode`; only `RunMode` crosses to the client and has a test. |
| Both SDKs load statically on every AI path | low | reject. Server-side cold start, no named harm. |
| `.env.example` lacks `AI_MODEL` | false | `# AI_MODEL` is already listed. |
| No npm script for the bake-off; spec status vs sprint status differ; empty Implementation Notes | false | The command is in the runbook; step 5 sets the sprint status; notes are written after review. |
| `ABORTED` code covers both the 90 s timeout and a manual abort in `results.md` | low | reject. Cosmetic. |

## Design Notes

The story ends at «ready for Helene to run»: the winner is a human decision, so the AC lines that need keys, hand scoring and the removal of the losing package move to the runbook and stay open in `issues.md`. Both packages stay so one config change (`AI_PROVIDER`) switches contenders, which is why the live adapter selects the provider by name rather than by importing one.

## Verification

**Commands:**
- `npx biome check` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npx tsx --conditions=react-server scripts/bake-off.ts --dry` -- expected: files written to the OS temp directory

### Review Findings

Code review of Stories 3.3, 3.3b, 3.3c and 3.3d together (2026-11-19). Diff: `e37ac19..HEAD`, without `.logs/` and the generated outputs in `docs/qa/bake-off/`.

- [x] [Review][Patch] Record the limits of the model decision (decided 2026-11-19, Helene: option 1, accept and record) — the Gap task was given the Answer key's `missingKeywords`, so it was easier than the app's; every Letter used the Formell tone; the cells were scored by a Claude model that is also a contender; no human check of a sample was done (Helene confirmed every cell on 2026-11-19, after this review). Add this to the «Decision» header of `docs/qa/bake-off/2026-11-18/results.md` and to the «Why this model» text in `docs/architecture.md` section 4 [docs/qa/bake-off/2026-11-18/results.md] [docs/architecture.md:82]
- [x] [Review][Patch] The documents contradict each other about who receives the text and what is done — runbook step 7 says PRD §8.1 «is not amended» (it is: SCCs, U25); runbook step 8 and its `AI_RETENTION_DAYS` line say the notice names «OpenRouter and Anthropic» (should be OpenRouter, Google and Amazon); the runbook intro says steps 1 to 7 are done while step 2 is open; `docs/architecture.md` section 4 (two places), the PRD Open question 3 and `docs/qa/ai-provider-terms.md` (Decision, line 9) say the host is «expected to be Anthropic» next to the finding that it is Google or Amazon; the terms file says «Helene has not confirmed any row» above rows she confirmed [docs/qa/bake-off-runbook.md:3,42,49] [docs/architecture.md:82,86] [docs/qa/ai-provider-terms.md:9,36]
- [x] [Review][Patch] The bake-off's live wiring (`defaultAdapterFor(false)`) has no test — every `runBakeOff` test is `dry` or injects `adapterFor`; a wrong key, model or provider there would pass all tests and the results would be labelled by the planned id. Add a `runBakeOff` test with a stubbed `fetch` that checks each contender's request carries its own key and model [scripts/bake-off.ts:289]
- [x] [Review][Defer] Nothing tests that a bake-off usage error sets a non-zero exit code [scripts/bake-off.ts:~513] — deferred: Helene watches the first live run (runbook); settle with a child-process test or by moving the block into a testable function
- [x] [Review][Defer] The go-live condition is prose only; a wrong `AI_PROVIDER` burns a Daily-cap slot; routing is not pinned and the serving host is not recorded — deferred: already recorded in `deferred-work.md` and `issues.md`, owned by Stories 3.6 and 3.12

#### Rejected

- `false` — RetryError hides the HTTP status: `runAi` and the bake-off both pass `maxRetries: 0`, so the SDK never wraps the error.
- `false` — billed tokens lost on a script SCHEMA_MISMATCH: the live adapter already validates with the same schema and throws first; the script's check only trips in the mock.
- `false` — `sumOf` drops known tokens when one request fails: a failed request's usage is unknown, so «n/a» is right and the row says «(a request failed)».
- `false` — the first two commit messages describe Anthropic/OpenAI adapters: commit messages are history; the code and 3.3d are current.
- `low` — an aborted signal hides a real HTTP failure; a provider value is echoed in the unsupported-provider error; a blank or hex price parses as a number; a missing `meta.json` gives the default title and employer; a run killed midway, or a write error, leaves paid outputs without `results.md` and a re-run overwrites them: unlikely, cheap (16 requests) and watched by Helene; the fixes add guards.
- `low` — the `maxRetries` test covers only 0; the one-element `Provider` type and `["openrouter-mock-1"]` loop; `<usd>` placeholders in runbook step 5; the 3.3b `deferred-work.md` note and the `sprint-status.yaml` edits go beyond 3.3d: cosmetic.
- Already tracked — the cost limit's type and amount, the EU routing option, the singular «the AI provider» in PRD FR-24/§8.1: in `issues.md` or `deferred-work.md`.
- Edits the spec under review — the adapter validates the shape with the SDK although the 3.3 matrix says `runAi` does; the 3.3d spec still says «Anthropic»: the fix is to change a spec.
