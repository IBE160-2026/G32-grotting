---
title: 'Story 3.2: Enforce the Daily cap and the AI notice on the server'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
baseline_commit: 'edb556cd94e289dff7bf6e1d30b09b45d98b56e6'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `runAi` (Story 3.1) sends any request. The AI budget (30 requests a day, FR-25, NFR-8) and the Student's consent to send text out (FR-24) still depend on the browser behaving.

**Approach:** Add AD-13 steps 2 and 3 to `runAi`: the notice check and one atomic Daily-cap reservation in a new `ai_usage` table (the first migration), the Oslo-day helper, and `config.aiNotice` carried in RunMode. Both steps are skipped in Test mode.

## Boundaries & Constraints

**Always:**
- Branch `story/3.2-enforce-the-daily-cap-and-the-ai-notice-on-the-server` off `main`; commits cite `3.2`; stage by explicit path; PR, review, then merge.
- Order in `runAi`: lookup key → notice → cap → strip → adapter → log. A notice or cap failure happens before any adapter call and still logs exactly one AI event (`provider`/`model` `"unknown"`, null counts, its `errorCode`).
- `AiContext = { studentId: string | null; consent: AiConsent | null }`; `AiConsent = { noticeVersion: string }` lives in `ai/contracts.ts`. Notice: missing consent or a different version → `AI_NOTICE_REQUIRED`, not retryable.
- Cap: scope is `ctx.studentId ?? 'installation'`, derived inside `runAi`; no caller or option passes it. Upsert the `(scope, day)` row, then `UPDATE ai_usage SET count = count + 1 WHERE scope = $1 AND day = $2 AND count < 30 RETURNING count`; no row back → `DAILY_CAP_REACHED`, not retryable. A request that fails later gets no refund. The limit 30 is one named constant.
- `ai_usage(scope text, day date, count integer, PRIMARY KEY (scope, day))`, no foreign key, in `src/modules/ai/server/schema.ts`; migration generated with `npm run db:generate` on the branch rebased on `main` just before merge.
- `src/shared/core/time.ts`: pure `osloDay(date: Date): string` (`YYYY-MM-DD`, Europe/Oslo, DST-correct). `runAi` takes the day from its injected `now`.
- `config.aiNotice = { version, providerName, retentionDays }`, derived in `config.ts`: `providerName` from `AI_PROVIDER` (`"none"` when unset), `retentionDays` from a new optional `AI_RETENTION_DAYS` (`number | null`; Story 3.3 fills it), `version` a string built from provider, retention and `features.keywordFallback` so it changes when any of them does. `toRunMode` carries `aiNotice` field by field.
- Test mode skips both steps and never opens the database. The test seam `AiRunOptions` gains `testMode?` (default `getConfig().testMode`) so tests run `mock` with Test mode off; no new config input selects `mock`.
- `AiFailure` widens to the four codes; `retryable` is `true` only for `AI_TIMEOUT` and `AI_PROVIDER_ERROR`.
- Replace the stale `db.test.ts` "skips migrating" test with a PGlite test that applies the committed migration and finds `ai_usage`; run `npm run db:migrate` and `npm run db:check` once on the real history.

**Never:**
- No caller of `runAi`, route, UI, notice dialog or client session (3.6, 3.7); no per-account cap (Epic 6); no cached or live adapter; no refund; no `console.*`; no content in logs.
- No change to the `db:check` failure-exit fixtures or the `runSetup` order test: carry those two `deferred-work.md` entries forward with a 3.2 note.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Notice missing | Test mode off, `consent: null` | `AI_NOTICE_REQUIRED`, adapter and DB untouched | One log event |
| Notice stale | `noticeVersion` ≠ `config.aiNotice.version` | `AI_NOTICE_REQUIRED` | One log event |
| Allowed | Matching version, count < 30 | Count rises by 1; request continues as in 3.1 | N/A |
| Cap reached | 30 done today, request 31 | `DAILY_CAP_REACHED`, count stays 30, no adapter call | One log event |
| Oslo midnight | 23:59:59 vs 00:00:00 Oslo, winter and summer | New day, count restarts at 1 | N/A |
| Race | 35 concurrent requests | Exactly 30 succeed, 5 fail with the cap | N/A |
| Provider fails after reserve | Adapter throws | `AI_PROVIDER_ERROR`; count still raised | No refund |
| Scope | `studentId` set vs null | Counted per scope: id vs `'installation'` | N/A |
| Test mode | `testMode: true`, any consent | Neither step runs, no `ai_usage` row | N/A |
| Version change | Provider, retention or `keywordFallback` differs | `aiNotice.version` differs | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/ai/server/run-ai.ts` -- add the two steps after the lookup key; `AiContext`, `AiFailure`, `AiRunOptions` change. Its test file `run-ai.test.ts` calls `runAi(request)` with the default ctx; update those calls and add the new rows.
- `src/modules/ai/contracts.ts`, `index.ts` -- add `AiConsent`; export the new context type.
- `src/shared/server/config.ts` (+ `config.test.ts`) -- add `aiNotice` to `Config` and `parseConfig`; read `AI_RETENTION_DAYS` through the zod `envSchema`. `AI_MODEL` stays unread.
- `src/shared/server/run-mode.ts`, `src/shared/ui/run-mode.tsx` (+ `run-mode.test.ts`) -- add `aiNotice` to the `RunMode` type and `toRunMode`; update the "no secret field" test (`aiNotice` holds no key or URL).
- `src/shared/server/db.ts` -- `getDb`/`applyMigrations` apply `drizzle/` at open on PGlite; reuse. `drizzle.config.ts` already globs `src/modules/*/server/schema.ts`.
- `src/shared/server/db.test.ts` -- the stale "skips" test; `scripts/db-check.ts` runs on a real history for the first time.
- `src/shared/core/canon.ts`, `result.ts`, `message-key.ts` -- reuse; the four codes exist. `src/shared/server/handle.ts` maps `AI_NOTICE_REQUIRED` 403 and `DAILY_CAP_REACHED` 429 already.
- `.env.example` -- add the `AI_RETENTION_DAYS` name only.
- New: `src/shared/core/time.ts` (+ test), `src/modules/ai/server/schema.ts`, `src/modules/ai/server/daily-cap.ts` (+ test; `reserveRequest(db, scope, day)` and `DAILY_CAP`), `drizzle/` (generated), `docs/architecture.md` line only if it lists the `ai_usage` table.

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/core/time.ts` -- `osloDay`; table test across UTC midnight, Oslo midnight, both DST switches -- Oslo reset
- [x] `src/shared/server/config.ts`, `run-mode.ts`, `ui/run-mode.tsx`, `.env.example` -- `aiNotice`; tests for version change on provider, retention and `keywordFallback` -- AD-4
- [x] `src/modules/ai/server/schema.ts`, `daily-cap.ts` -- table and atomic reservation -- FR-25
- [x] `src/modules/ai/contracts.ts`, `index.ts`, `server/run-ai.ts` -- context, widened failures, notice and cap steps, `testMode` seam -- FR-24
- [x] `drizzle/` -- generate and commit the migration after rebasing on `main`; add the PGlite migration test; run `db:migrate` and `db:check` once -- AD-9
- [x] tests -- every matrix row (race on PGlite, log has one event and no content on each failure); update `run-ai.test.ts`
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- mark the `mock` item settled by the seam; add a 3.2 note to the two carried entries

**Acceptance Criteria:**
- Given the Always rules, when `npx biome check`, `npm run typecheck`, `npx vitest run` and `npm run db:check` run, then all pass.
- Given `rg "ai_usage|reserveRequest" src` outside `src/modules/ai`, when run, then nothing matches.
- Given a failed request on each new code, when the log spy is read, then it holds one AI event with the code and no sentinel from the CV, ad or error.

## Implementation Notes

- 2026-11-18: built by a subagent from this spec; review pass 1 patched by the same subagent (three tests/comments).
- Choices where the spec was silent: `aiNotice.version` is `notice-1:<provider>:<days|unknown>:<fallback|no-fallback>` (bump the prefix when the notice text changes); `AI_RETENTION_DAYS` is 1-4 digits; notice and cap failures log `provider`/`model` `"unknown"`; `testTimeout` raised to 20 s in `vitest.config.ts` because several files now start PGlite in parallel.
- `db.test.ts` does not name `ai_usage` (the acceptance criterion keeps that name inside `src/modules/ai`); `daily-cap.test.ts` checks the table and columns on the migrated database.
- The migration `drizzle/0000_*` was generated on a branch at `main`'s head; regenerate only if `main` gets another migration first.
- Verified: `npx biome check`, `npm run typecheck`, `npx vitest run` (60 files, 661 passed, 2 expected fail), `npm run db:check`, `npm run db:migrate`. Docker and e2e not run locally.

## Spec Change Log

## Review Triage Log

Pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap):

| Finding | Verdict | Route / evidence |
|---|---|---|
| Production default `options.testMode ?? getConfig().testMode` never exercised; `?? true` would pass every test | medium | patch. Every `runAi` test passes `testMode` explicitly. |
| Database failure in the reservation has no fail-closed test | medium | patch. The code rethrows (UNEXPECTED); a test pins it so NFR-8 cannot silently fail open. |
| `notice-1` prefix has no note on who bumps it when the notice text changes | low | patch (one comment). |
| Concurrency and the postgres-js `rowCount` array branch are only tested on PGlite | maybe-false (would be medium) | defer. Settle with a run against real Postgres in Docker (30 of 35 concurrent). |
| `AI_RETENTION_DAYS=` or `AI_PROVIDER=` empty crashes or shows an empty name | false | `parseConfig` drops empty strings before the zod schema (`config.ts` filter), so both count as unset. |
| Empty `studentId` or `studentId === 'installation'` gets its own or a shared bucket | low | reject. Student ids are server-generated UUIDs from the session (AD-10); no path shows an empty or colliding id, and a guard adds complexity. |
| `options.testMode` seam could skip both steps in production | low | reject. The option is code-level, not request-reachable; no caller exists yet and the spec chose the seam over a config input. |
| Reservation hang is outside the 90 s limit | low | reject. A stalled database fails at the driver; a second timeout adds machinery for no shown path. |
| Upsert and update not in one transaction; orphan zero row | low | reject. A zero-count row is harmless and counts nothing. |
| `ai_usage` rows never pruned | low | reject. One tiny row per scope per day. |
| `osloDay` returns `--` without ICU data | low | reject. Node ships full ICU; the test covers the zone. |
| `AI_MODEL` not part of the notice version | low | reject. The spec fixes the three inputs; `AI_MODEL` is unread until Story 3.3. |
| Duration includes DB latency on cap failure | low | reject. Cosmetic. |
| `db.test.ts` does not name `ai_usage` | false | The acceptance criterion forbids `ai_usage` outside `src/modules/ai`; `daily-cap.test.ts` checks the columns on the migrated database. |
| Test-mode test opens the database through its own helper | low | reject. The no-row check holds. |
| `finish()` throwing could log twice | low | reject. `log` only calls `console.error`. |
| Shared `installation` cap, consent is caller-supplied | false | AD-13 and the story fix both. |
| Global `testTimeout` 20 s masks slow tests; `AiNotice` shape written three times; `retryable: boolean`; `DAILY_CAP` restated in a test | low | reject. Style; no named harm. |

## Design Notes

The reservation runs before stripping and the adapter, so a request that later fails still counts: the cap bounds spend, not success. The `testMode` seam replaces a config input for `mock`, so no environment value can ever put the mock adapter on a hosted run.

## Verification

**Commands:**
- `npx biome check` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npm run db:check` -- expected: "Migrations apply from zero on PGlite."
