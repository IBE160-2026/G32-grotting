---
title: 'Story 3.3c: Compare several models through one OpenRouter key'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
baseline_commit: 'f680ce0a41835b8e490724a02f69b37370ba38a6'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3-pick-the-ai-provider-in-a-bake-off.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3b-add-openrouter-as-a-third-live-provider.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `scripts/bake-off.ts` takes one OpenRouter model and still requires the direct Anthropic and OpenAI keys, so Helene cannot compare Claude Sonnet 5.5 and an OpenAI model through one OpenRouter key.

**Approach:** Make every contender optional and let the OpenRouter contender be a list of models, each its own contender with its own folder, results and price.

## Boundaries & Constraints

**Always:**
- Branch `story/3.3c-bake-off-through-openrouter-models` off `main`; commits cite `3.3`; stage by explicit path; PR, review, then merge.
- A contender has an id: `anthropic`, `openai`, or `openrouter:<model>` (for example `openrouter:anthropic/claude-sonnet-5.5`). The id names its price flags (`--price-in <id>=<usd>`, split on the last `=`), its `results.md` label and its output folder, with `/` and `:` replaced by `-` in the folder name.
- `BAKE_OFF_OPENROUTER_MODELS` (comma-separated OpenRouter model ids, trimmed, empty items dropped, duplicates rejected) replaces `BAKE_OFF_OPENROUTER_MODEL`; with `BAKE_OFF_OPENROUTER_KEY` it adds one contender per model. All of them use that one key.
- Direct contenders become optional: `anthropic` joins when `BAKE_OFF_ANTHROPIC_KEY` is set (model default as before); `openai` joins when `BAKE_OFF_OPENAI_KEY` is set. A key without its required model (OpenAI, OpenRouter) is a usage error naming the missing setting, as is an OpenRouter model, or a price for a contender that is not planned, without its key. A live run with no contender at all is a usage error naming the settings. Existing refusals (existing `results.md`, unknown flag, bad price) stay.
- `--dry` plans `anthropic`, `openai` and one OpenRouter contender (the listed models, or one mock model when none), all on the mock adapter, writing to the OS temp directory as before.
- Requests per live run are two per Fixture and planned contender; the runbook states the formula (not a fixed number).
- `results.md` and records keep working for any number of contenders, with the contender id as label; `results.ts` changes only if it assumes a fixed provider set.
- Runbook step 1, 4 and 5, `.env.example` (`BAKE_OFF_OPENROUTER_MODELS` replaces `BAKE_OFF_OPENROUTER_MODEL`) and the terms file's runbook references are updated. Add a runbook example for Sonnet 5.5 plus one OpenAI model through one OpenRouter key: model ids `anthropic/claude-sonnet-5.5` and one OpenAI id Helene chooses (OpenRouter lists current ids; no choice is made here), and prices read from OpenRouter's model list.

**Never:**
- No change to `live.ts`, `runAi`, config, the notice or the cap; no live or network request in tests or verification; no key in the repo; no decision recorded as made; no edit of `architecture.md` or the PRD.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| OpenRouter only | Key plus `BAKE_OFF_OPENROUTER_MODELS=a/x,b/y` | Two contenders `openrouter:a/x`, `openrouter:b/y`, one key | N/A |
| Mixed | Anthropic key and OpenRouter key and models | `anthropic` plus the OpenRouter ones | N/A |
| Per-model price | `--price-in openrouter:a/x=2` | Applies to that contender only | Unplanned id: usage error |
| Key, no models | OpenRouter key only | Exits non-zero naming `BAKE_OFF_OPENROUTER_MODELS` | N/A |
| Models, no key | Models set, no key | Exits non-zero naming `BAKE_OFF_OPENROUTER_KEY` | N/A |
| Nothing configured | No keys, not dry | Exits non-zero naming the settings; nothing written | N/A |
| Duplicate model | `a/x,a/x` | Usage error | N/A |
| Folder names | Id `openrouter:a/x` | Folder `openrouter-a-x`, no path separators | N/A |
| Dry run | `--dry` | Three contenders on the mock adapter, temp directory | N/A |
| One request fails | A contender errors on a Fixture | Recorded by code; the run continues | No content |

</frozen-after-approval>

## Code Map

- `scripts/bake-off.ts` -- `PROVIDERS`, `BakeOffArgs`, `parsePrice`, `resolveContenders` (lines 36-175), the folder and label use below it, usage text. `scripts/bake-off/results.ts` -- rendering; check for a fixed provider set. `scripts/bake-off.test.ts`, `results.test.ts` -- update and extend.
- `docs/qa/bake-off-runbook.md`, `docs/qa/ai-provider-terms.md` (runbook references only), `.env.example`.
- Reuse `createLiveAdapter` as now; `live.ts` is unchanged.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/bake-off.ts`, `scripts/bake-off/results.ts` (only if needed) -- contender ids, optional contenders, model list, per-contender prices and folders -- PRD §8.2
- [x] `scripts/bake-off.test.ts`, `scripts/bake-off/results.test.ts` -- every matrix row; update the 3.3b tests that assumed fixed contenders
- [x] `docs/qa/bake-off-runbook.md`, `.env.example`, `docs/qa/ai-provider-terms.md` -- new names, the Sonnet 5.5 plus OpenAI example, request formula

**Acceptance Criteria:**
- Given the Always rules, when `npx biome check`, `npm run typecheck`, `npx vitest run` and `npm run db:check` run, then all pass with no network call.
- Given `npx tsx --conditions=react-server scripts/bake-off.ts --dry`, when it runs, then it writes three contenders to the OS temp directory and nothing new under `docs/`.
- Given `rg "BAKE_OFF_OPENROUTER_MODEL\b" .` outside `_bmad-output`, when run, then nothing matches.

## Implementation Notes

- 2026-11-18: built by a subagent from this spec; review pass 1 patched by the same subagent (three patches) and one runbook sentence corrected by hand: `anthropic/claude-sonnet-5.5` is confirmed in OpenRouter's raw model list (the subagent's summarising fetch showed a spurious `[1m]` suffix).
- Contender ids `anthropic`, `openai`, `openrouter:<model>`; `BAKE_OFF_OPENROUTER_MODELS` replaces `BAKE_OFF_OPENROUTER_MODEL`. A model without its key (any provider) and a key without its model are usage errors; two contenders whose folders match case-insensitively are refused. `results.ts` needed no change; `live.ts` untouched.
- Not done, by design: no live request; the OpenAI model id is left for Helene to choose from openrouter.ai/models.
- Verified: `npx biome check`, `npm run typecheck`, `npx vitest run` (63 files, 721 passed, 2 expected fail), `npm run db:check`, `--dry` run (nothing new under `docs/`), no remaining `BAKE_OFF_OPENROUTER_MODEL` outside `_bmad-output`.

## Spec Change Log

## Review Triage Log

Pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap):

| Finding | Verdict | Route / evidence |
|---|---|---|
| `BAKE_OFF_OPENAI_MODEL` or `BAKE_OFF_ANTHROPIC_MODEL` set without its key silently drops the contender, unlike OpenRouter | medium | patch. A paid run becomes a smaller comparison than intended. |
| Folder-collision check is case-sensitive (`a/X` vs `a/x`) | medium | patch. Both write one folder on Windows and macOS and overwrite paid output. |
| Runbook has only bash syntax and a trailing backslash; Helene works in PowerShell | medium | patch (docs). |
| `anthropic/claude-sonnet-5.5` presented without saying where it was checked; `HTTP_404` also means a wrong id | low | patch (docs). |
| Step 7 does not say whether the winner was used directly or through OpenRouter | low | patch (docs). |
| One-sided price (`--price-in` without `--price-out`) leaves the cost n/a | low | reject. Same as 3.3: the cost cell says n/a. |
| Repeated price flags: last wins | low | reject. Developer-run CLI. |
| Windows-illegal characters or trailing dots in a model id; pipe or whitespace in an id | low | reject. OpenRouter ids are `vendor/model[:variant]`; a bad id fails as a usage or 404 error. |
| `--dry` with models but no key passes while a live run stops | low | reject. The spec says a dry run needs no key. |
| No plan or request count printed before a paid run | low | reject. The runbook states `2 x F x C`; scope beyond the spec. |
| Contender id stored in a field named `provider` | low | reject. Naming only. |
| Matrix row says three contenders in a dry run, but listed models add more | false | The default (no models set) gives three; the matrix and AC describe it. |
| Spec bookkeeping (ticked tasks, empty notes, usage text) | false | Notes are written after review; the header comment points to the runbook. |
| Terms file has no per-vendor checklist for models compared through OpenRouter | low | reject. The terms file already says each model vendor is a second processor with unconfirmed terms. |

## Design Notes

Prices are per contender id because the two OpenRouter models cost different amounts. OpenRouter lists per-token prices at `https://openrouter.ai/api/v1/models`; multiply by one million for the flags.

## Verification

**Commands:**
- `npx biome check` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npx tsx --conditions=react-server scripts/bake-off.ts --dry` -- expected: files in the OS temp directory
