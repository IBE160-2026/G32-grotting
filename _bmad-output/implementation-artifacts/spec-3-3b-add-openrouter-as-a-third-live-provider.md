---
title: 'Story 3.3b: Add OpenRouter as a third live provider'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
baseline_commit: '36286dca60ddc536f6d43d47b8feae39f2596282'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3-pick-the-ai-provider-in-a-bake-off.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.3 supports only direct `anthropic` and `openai` keys. Helene wants to use one OpenRouter key, so the live adapter and the bake-off cannot use it.

**Approach:** Add `openrouter` as a third provider name in the live adapter, the factory wiring and `scripts/bake-off.ts`, using the official `@openrouter/ai-sdk-provider`, with the data-collection restriction set on every request. Record that OpenRouter is an extra company handling the Student's text.

## Boundaries & Constraints

**Always:**
- Branch `story/3.3b-openrouter-third-provider` off `main`; commits cite `3.3`; stage by explicit path; no push.
- New dependency `@openrouter/ai-sdk-provider` pinned exactly (peer `ai@^7`, already installed); check it needs no other new package.
- `LIVE_PROVIDERS` gains `openrouter`; `AI_PROVIDER=openrouter` with `AI_MODEL` (an OpenRouter model id such as `<vendor>/<model>`) and `AI_API_KEY` works exactly as the other two. Config accepts any provider string as before; nothing in `config.ts` changes except what a test needs.
- Every OpenRouter request tells OpenRouter to use only providers that do not collect or train on the data, and to require zero data retention where the package's types and OpenRouter's documented request fields allow it; the exact field names are taken from the package's types and the OpenRouter docs, not guessed, and a test asserts the request body carries them. If a field cannot be confirmed, leave it out and say so in `docs/qa/ai-provider-terms.md`.
- Error handling stays as in 3.3: fixed message plus code, no key, prompt or response text.
- `scripts/bake-off.ts`: `openrouter` is a third contender with `BAKE_OFF_OPENROUTER_KEY` and `BAKE_OFF_OPENROUTER_MODEL` (both required, no defaults) and `--price-in/--price-out openrouter=<usd>`. It is included only when its key is set, or in `--dry`; with the key set but the model missing, it exits non-zero naming the setting. Anthropic and OpenAI behave as before, so a run without the OpenRouter key is unchanged (16 requests).
- `docs/qa/ai-provider-terms.md` gains an OpenRouter section: what it is (a router, so the model vendor is a second processor), its prompt-logging and training defaults (off unless opted in), «ZDR only» in privacy settings, and that DPA, retention, DPF status and sub-processor terms are «not verified» unless read on a primary source with URL and date. It also notes that the AI notice (Story 3.6) must name both OpenRouter and the model vendor.
- `docs/qa/bake-off-runbook.md`: step 1 (key plus credit limit and privacy settings on OpenRouter), the env names in step 4, the third price pair in step 5; step 8 says to remove the losing packages. `.env.example` gets the two new names. Add a `deferred-work.md` entry that the notice text and the PRD §8.1 data rules need a decision if OpenRouter wins.

**Never:**
- No change to `runAi`, the cap, the notice or the config rules; no live or network request in tests; no key in the repo; no decision recorded as made; no edit of `architecture.md` or the PRD.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Live OpenRouter | provider `openrouter`, model, key, not a test run | Adapter with `kind: 'live'`, `provider: 'openrouter'` | N/A |
| Live in a test run | `createAdapter('live', { isTestRun: true, … })` | Throws, as before | N/A |
| Privacy fields | Any OpenRouter `generate` | Request body carries the data-collection restriction | N/A |
| Provider failure | OpenRouter call rejects | `AiProviderError` with a code, no content | Fixed message |
| Bake-off with OpenRouter key | Key and model set | Third contender, 24 requests, its own folder and results | Failure recorded by code |
| Bake-off, key set, model missing | `BAKE_OFF_OPENROUTER_KEY` only | Exits non-zero naming `BAKE_OFF_OPENROUTER_MODEL`, nothing written | N/A |
| Bake-off without the key | No OpenRouter settings | Two contenders as in 3.3 | N/A |
| Dry run | `--dry` | Three contenders written to temp | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/ai/server/adapters/live.ts` -- `LIVE_PROVIDERS`, `defaultModelFactory`, `codeOf`; add the provider and its request options. `live.test.ts` holds the mock-model test pattern.
- `src/modules/ai/server/adapters/factory.ts` -- passes `LiveSettings`; likely no change.
- `scripts/bake-off.ts` (`PROVIDERS` line 36, price parsing, contender list around lines 115-150, usage text), `scripts/bake-off/results.ts`, `scripts/bake-off.test.ts` -- generalise two contenders to three without changing the default two-contender run.
- `docs/qa/ai-provider-terms.md`, `docs/qa/bake-off-runbook.md`, `.env.example`, `_bmad-output/implementation-artifacts/deferred-work.md`.
- `package.json`, lockfile -- one new exact dependency.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, lockfile -- add `@openrouter/ai-sdk-provider` pinned -- AD-3
- [x] `live.ts`, `live.test.ts` -- `openrouter` provider with the data-collection restriction; matrix rows without a network -- NFR-8
- [x] `scripts/bake-off.ts`, `results.ts`, tests -- optional third contender -- PRD §8.2
- [x] `docs/qa/*.md`, `.env.example`, `deferred-work.md` -- terms, runbook, names, decision entry -- §8.1

**Acceptance Criteria:**
- Given the Always rules, when `npx biome check`, `npm run typecheck`, `npx vitest run` and `npm run db:check` run, then all pass with no network call.
- Given `npx tsx --conditions=react-server scripts/bake-off.ts --dry --out <dir>`, when it runs, then `<dir>/results.md` lists three contenders, and a run without OpenRouter settings and without `--dry` still plans only two.
- Given `rg "adapters/" src` outside `src/modules/ai`, when run, then nothing imports an adapter.

## Implementation Notes

- 2026-11-18: built by a subagent from this spec; review pass 1 patched by the same subagent (three patches). Dependency `@openrouter/ai-sdk-provider@3.1.0` (no dependencies of its own; peers `ai@^7`, `zod` already installed).
- The OpenRouter model is built with `provider: { data_collection: "deny", zdr: true }` (field names from the package's `OpenRouterChatSettings` and OpenRouter's provider-routing docs). A model without a zero-retention endpoint fails with `HTTP_404`; the runbook says so. The privacy fields are asserted on the request body through the default wiring (a mutation that drops them fails the test).
- The bake-off includes OpenRouter only when its key is set (or in `--dry`); a model or price without the key is a usage error. Default runs keep two contenders (16 requests); with OpenRouter 24. `results.ts` needed no change.
- Not done, by design: no live request; whether OpenRouter accepts the two fields for a chosen model is proven only on Helene's first paid run. The notice and PRD §8.1 decision if OpenRouter wins is in `deferred-work.md`.
- Verified: `npx biome check`, `npm run typecheck`, `npx vitest run` (63 files, 710 passed, 2 expected fail), `npm run db:check`, `--dry` run (nothing new under `docs/`), `rg "adapters/" src` only inside `src/modules/ai`.

## Spec Change Log

## Review Triage Log

Pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap):

| Finding | Verdict | Route / evidence |
|---|---|---|
| Privacy fields are asserted only through a hand-built factory; dropping `OPENROUTER_PRIVACY` from the `defaultModelFactory` case passes every test; `toMatchObject` lets extra fields in | medium | patch (pre-verified gap). Test through the default wiring with a stubbed `fetch`, exact match. |
| `BAKE_OFF_OPENROUTER_MODEL` or a price set without the key silently gives two contenders; a misspelled key name looks the same | medium | patch. Error naming the missing key, as for the missing model. |
| `zdr` plus `data_collection: deny` can leave a model with no endpoint, shown as a bare `HTTP_404` | low | patch (runbook sentence). |
| Runbook step 8 lets Helene enable `AI_PROVIDER=openrouter` while the notice names one company | low | patch (runbook sentence); the notice decision is Story 3.6. |
| `defaultModelFactory` switch has no `default`/`never` | low | reject. `LiveProvider` is a closed union and `tsc` checks the cases; `createLiveAdapter` validates the name first. |
| `require_parameters` not set, so the router may pick an endpoint that ignores the schema | maybe-false (low) | reject. Unverified against a live run; a mismatch shows as `SCHEMA_MISMATCH`, which the Bake-off is meant to reveal. |
| Upstream vendor not recorded in `results.md`; `allow_fallbacks`/`order` not set | low | reject. Throwaway script; scope beyond the spec. |
| Only one of `--price-in`/`--price-out` given omits the cost | low | reject. The cost cell says n/a. |
| Terms file: unsourced 1 % discount, retention row without URL, uneven rows | low | reject. Every unconfirmed row says «not verified» and the runbook assigns them to Helene. |
| Credit limit is not a monthly cap; prices optional | low | reject. The runbook says to set a limit and look up prices; OpenRouter's reset options were documented in the previous reply. |
| New third-party dependency not audited; lockfile not in the diff | low | reject. Lockfile adds 14 lines (one package, no dependencies of its own); the package is OpenRouter's own AI SDK provider and peers on the installed `ai@7`. |
| Notice requirement not enforced by a test or guard | false | The notice and the choice of provider belong to Stories 3.6 and 3.12; this story records it in the terms file and `deferred-work.md`. |
| Spec bookkeeping (empty notes, `results.ts` untouched, `db:check` not in Verification) | false | Notes are written after review; `results.ts` needed no change; `db:check` is in the acceptance criteria and was run. |
| Usage text and `.env.example` wording; no test of price merge in `resolveContenders` or combined missing-setting reports | low | reject. Cosmetic or covered by the matrix tests. |
| `AiProviderError` 401 path asserts fields only on the success path | low | reject. The privacy fields are asserted on the recorded request body, which does not depend on the response. |

## Design Notes

OpenRouter routes to a model vendor, so the Student's text reaches two companies. That is why the request restricts routing and the terms file says the notice must name both; whether this is acceptable under PRD §8.1 is Helene's decision, not this story's.

## Verification

**Commands:**
- `npx biome check` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npx tsx --conditions=react-server scripts/bake-off.ts --dry` -- expected: files in the OS temp directory, nothing new under `docs/`
