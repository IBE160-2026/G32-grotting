---
title: 'Story 3.1: Send every AI request through one pipeline'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
baseline_commit: '19409024d7b4a2aeb044e444dfd4008bddc081bf'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 3 adds AI requests. Nothing yet forces them through one place, so a slice could send an unstripped CV, skip the timeout, log prompt text or make a paid request from a test (FR-23, FR-26, FR-27, NFR-4, NFR-8).

**Approach:** Create the `ai` slice with `runAi(request, ctx)` (AD-13 steps 1, 4, 5, 6), `stripContactDetails`, the adapter port with a `mock` adapter and a factory that refuses `live` in a test run (AD-3). The notice and cap steps are Story 3.2. No slice calls `runAi` yet.

## Boundaries & Constraints

**Always:**
- Branch `story/3.1-send-every-ai-request-through-one-pipeline` off `main`; commits cite `3.1`; stage by explicit path; PR, review, then merge.
- `AiResultMeta { source, provider, model, promptVersion, createdAt }` and `AiOutput<T> = { data, meta }` are zod/TS types in `ai/contracts.ts` only. `source` is the adapter kind (`live | cached | mock`); `createdAt` is an ISO string.
- `request = { task, cvText?, jobAd, tone?, jobTitle?, employer?, promptVersion, buildPrompt(sentCvText), schema }`. `promptVersion` is added to the AD-13 shape because `meta` needs it and prompts live in slices (`PROMPT_VERSION`, AD-15). A slice never passes a finished prompt string.
- Pipeline order: lookup key from the unstripped inputs → strip → `buildPrompt(sentCvText)` → adapter with a 90 s `AbortSignal` and `maxRetries: 0` → `schema.parse` → one log event. The key is `sha256` of a JSON array of the `canon` inputs plus `task` and `tone` (as `fingerprintOf`); the adapter receives it for the Story 3.5 lookup.
- Result is `Result<AiOutput<T> & { sentCvText }, { code, retryable: true }>`. A timeout gives `AI_TIMEOUT`; an adapter throw or a schema mismatch gives `AI_PROVIDER_ERROR`. With no `cvText`, `sentCvText` is `""`.
- `LogEvent` becomes a union; the AI event is `{ kind: 'ai', task, provider, model, inputTokens, outputTokens, durationMs, errorCode }` (counts `number | null`). Exactly one is logged per request, also when it fails. An unexpected throw (e.g. in `buildPrompt`) logs once with `UNEXPECTED` and is rethrown. No prompt, response, CV text or error message ever reaches the log.
- `createAdapter(kind, { isTestRun })`: `live` throws when `isTestRun`; `mock` returns the mock adapter; `live` outside a test run and `cached` throw «not built yet» (Stories 3.3 and 3.5).
- `runAi` takes an optional third argument `{ adapter, now, timeoutMs }` as a test seam; the default adapter comes from `getConfig().ai.adapter`.

**Never:**
- No notice check, cap, `ai_usage` table, `config.aiNotice` or `time.ts` (Story 3.2); no AI SDK package, live or cached adapter, prompts or route (3.3–3.5); no caller of `runAi`; no `console.*`; no SDK retries.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Success | Mock returns data that fits `schema` | `ok` with `data`, `meta`, `sentCvText`; one log event with token counts | N/A |
| Strip | CV has emails and Norwegian or international phones | They are deleted, nothing inserted; the prompt and `sentCvText` hold the stripped text | N/A |
| Timeout | Adapter ignores or outlasts the signal | `AI_TIMEOUT`, retryable, at the limit (injected `timeoutMs`) | One log event, `errorCode: AI_TIMEOUT` |
| Provider failure | Adapter throws an error whose message holds CV text | `AI_PROVIDER_ERROR`, retryable | Log has no CV substring |
| Bad shape | Adapter output fails `schema` | `AI_PROVIDER_ERROR`, retryable | One log event |
| Live in a test run | `createAdapter('live', { isTestRun: true })` | Throws | N/A |
| No CV | `cvText` absent | `sentCvText` is `""`; strip skipped | N/A |

</frozen-after-approval>

## Code Map

- `src/shared/server/log.ts` -- `LogEvent` is one error variant today; make it a union. `src/shared/server/handle.ts` is its only caller and must stay unchanged in behaviour (it has its own test).
- `src/shared/server/config.ts` -- `ai.adapter` (`live | cached | mock`), `isTestRun`; read only. `getConfig()` is lazy: call it inside `runAi`, never at module top.
- `src/shared/core/result.ts`, `message-key.ts`, `canon.ts` -- `ok/err`, the existing `AI_TIMEOUT` and `AI_PROVIDER_ERROR` codes, `canon`. Reuse; no new codes.
- `src/modules/application/core/fingerprint.ts` -- the pattern for a sha256 key over a JSON array of `canon` parts.
- `src/modules/keywords/index.ts` -- pattern for a slice `index.ts` (`import "server-only"`, re-exports). Biome limits cross-slice imports to `index.ts` and `contracts.ts`.
- New: `src/modules/ai/contracts.ts`, `index.ts`, `core/strip-contact.ts` (+ test), `core/lookup-key.ts` (+ test), `server/run-ai.ts` (+ test), `server/adapters/factory.ts` (holds the `AiAdapterPort` type), `server/adapters/mock.ts` (+ factory test).
- `docs/architecture.md` -- read; add a line only if it lists slices and omits `ai`.

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/server/log.ts` -- make `LogEvent` a union and add the AI event -- one logger, content-free
- [x] `src/modules/ai/contracts.ts` -- `AiResultMeta`, `AiOutput<T>` -- single home for the shapes
- [x] `src/modules/ai/core/strip-contact.ts` -- `stripContactDetails`: emails; `+47`/`0047`/bare 8-digit Norwegian phones (grouped or not); international `+cc …`; table test with negative cases (years, `2019–2022`, percentages, 9-digit numbers stay) -- FR-26
- [x] `src/modules/ai/core/lookup-key.ts` -- key from the unstripped inputs; changes with each input and `tone`, stable under whitespace and CRLF -- AD-15
- [x] `src/modules/ai/server/adapters/{factory,mock}.ts` -- port `{ kind, provider, model, generate({ prompt, lookupKey, signal, maxRetries, schema }) → { output, usage } }`; mock is deterministic, configurable, with token counts -- AD-3
- [x] `src/modules/ai/server/run-ai.ts` and `src/modules/ai/index.ts` -- the pipeline; export `runAi` and its types only -- AD-13
- [ ] tests -- every I/O row; a log test with sentinel strings in CV, ad and thrown message; the factory test

**Acceptance Criteria:**
- Given the spec's Always rules, when `npx biome check`, `npm run typecheck` and `npx vitest run` run, then all pass.
- Given a failed and a successful request, when the log spy is read, then it holds exactly one AI event each and none contains a sentinel from the prompt, the response or the error message.
- Given `rg "adapters/" src` outside `src/modules/ai`, when run, then nothing imports an adapter.

## Implementation Notes

- 2026-11-18: built by a subagent from this spec; 7 files under `src/modules/ai/` plus the `LogEvent` union in `src/shared/server/log.ts`. `handle.ts` is unchanged.
- Choices where the spec was silent: `AiContext = { studentId?: string | null }` (unused until 3.2); `runAi(request, ctx = {}, { adapter, now, timeoutMs } = {})`; the lookup key hashes `[canon(cv), canon(ad), canon(jobTitle), canon(employer), task, tone]` with absent values as `""`, so Story 3.5 must reconcile it with the AD-15 per-task keys; an unexpected throw before an adapter exists logs `provider: "unknown"`.
- Phone stripping is a heuristic: a bare number counts only as eight digits starting 2–9, solid or grouped 2-2-2-2 / 3-2-3 with one separator (space, NBSP, dot, hyphen). 4-4 grouping, obfuscated emails and 8-digit dates are not handled (years and `2019–2022` must survive).
- Review pass 1 patches: phone and email forms, mock `wait()`, and three tests (default adapter path, parsed data, duration). One item deferred (`mock` not selectable through config, Story 3.2).
- Verified: `npx biome check`, `npm run typecheck`, `npx vitest run` (58 files, 620 passed, 2 expected fail). Docker and e2e not run; no Dockerfile, dependency or `data/` change.

## Spec Change Log

## Review Triage Log

Pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap):

| Finding | Verdict | Route / evidence |
|---|---|---|
| Phone forms leak: NBSP, glued prefix (`Mobil+47…`), double separator, bare hyphen/dot groups | medium | patch. FR-26 is a privacy rule; lookbehind and separator classes are too narrow. Newline is not a separator, so a number cannot eat the next line's year. |
| Email local part misses `'` and combining marks | low | patch. A name fragment stays in the text; the fix is one character class. |
| Mock `wait()` ignores a pre-aborted signal and leaks its listener | low | patch. Shared test double for later stories. |
| Default-adapter path through `runAi` untested | medium | patch (verification gap, pre-verified). |
| `data` from `safeParse` not distinguished from raw output | medium | patch (verification gap). |
| `durationMs` never verified, always 0 under the fixed clock | medium | patch (verification gap). |
| `mock` not selectable through config | low | defer, `deferred-work.md` (Story 3.2). |
| `jobAd`, `jobTitle`, `employer` are not stripped | false | AD-13 and the story strip `cvText` only; a job ad is a public posting, not the Student's data. |
| `buildPrompt` closure can capture raw `cvText` | false | Not enforceable in a function seam; the AC is that no finished prompt string is passed. |
| Lookup key lacks `promptVersion`/model; `task`/`tone` not canon'd; undefined vs `""` | false | AD-15 defines the key's inputs; the cached file carries `promptVersion` and CI compares it. `tone` is an enum. |
| Log event has no `source`/`promptVersion`/key | false | AD-13 fixes the log fields. |
| Bare 8-digit dates or amounts (`20240115`) are deleted; 4-4 grouping and `[at]` emails are not stripped | low | reject. Documented heuristic; a stricter rule adds complexity for a rare case. |
| `00`-prefixed 8–15 digit run deleted | low | reject. Rare, and treating it as a phone is the safe side for FR-26. |
| Quadratic email scan on a very long run | low | reject. CV input is length-limited (FR-4 and the extract limits). |
| Late (billed) timeout result logs null counts | low | reject. Not knowable without a usage hook; the cap counts requests, not tokens. |
| `safeParse` or `log` throwing after a billed response | low | reject. A sync zod schema does not throw from `safeParse`; adds guards for no shown path. |
| `timeoutMs` NaN or ≤ 0 | false | Test seam only; callers are tests. |
| `index.ts` exports too little; `aiResultMetaSchema` unused | false | Slices may import `contracts.ts`; the schema is for Story 3.5. |
| `unhandledRejection` test is timing-based | low | reject. Passes reliably; a fix adds machinery. |

## Design Notes

The adapter returns raw `unknown` plus usage; `runAi` alone validates, so every task gets the same failure path. Racing the adapter promise against the signal means an adapter that ignores abort still ends at the limit. The `cached` adapter (3.5) will raise `TEST_MODE_UNAVAILABLE` on a miss; the error union widens then.

## Verification

**Commands:**
- `npx biome check` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
