---
title: 'Story 1.2: Read configuration in one place and answer a health check'
type: 'feature'
created: '2026-11-14'
status: 'done'
baseline_commit: '7b66f41d82b36d35a4602463ba651dc418b95c8d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing reads the environment, opens a database, logs or answers requests yet. Later stories would each invent their own, and a Hosted version could start half-configured.

**Approach:** Add the shared server kernel: a lazy zod `config`, `db` (postgres-js or PGlite), `log`, `handle()` with the AD-7 envelope, `MessageKey`, `scripts/migrate.ts`, `drizzle.config.ts`, `.env.example` and `GET /api/health`. Covers FR-27 (mode detection), NFR-7, NFR-9, AD-3, AD-4, AD-7, AD-9, AD-13.

## Boundaries & Constraints

**Always:**
- Branch `story/1.2-config-and-health` off `main`. Commits cite `1.2` and the IDs. Stage by explicit path.
- `config.ts` is the only reader of `process.env`. It parses lazily and memoises; route files read config only inside handlers; no `NEXT_PUBLIC_`. Empty strings count as unset.
- Files in `shared/server` start with `import 'server-only'`. `shared/core/message-key.ts` is pure.
- New dependencies exact (no `^`/`~`) at Stack versions: `zod` 4.6.7, `server-only` 0.0.1, `drizzle-orm` 0.45.4, `postgres` 3.4.9, `@electric-sql/pglite` 0.4.6, and dev `drizzle-kit` 0.31.11, `tsx` 4.23.15.
- Tests name the requirement ID (`describe('FR-27 …')`, `NFR-7`, `NFR-9`).

**Never:**
- No `SECRETS_FILE`, `ENCRYPTION_KEY` or `ai_usage` handling (Stories 6.1, 3.2); no tables, schema or seed; no `RunMode` or root-layout change (Story 1.5); no Docker, CI or `compose.yaml`.
- No `console` outside `log.ts`; no error message or stack in a response or log.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Local, no key | `APP_ENV` unset, no `AI_API_KEY` | `testMode` true, `ai.adapter` `cached`, `hosted` false, all four flags off | N/A |
| AI key set | `AI_API_KEY` + `AI_PROVIDER`, not a test run | `testMode` false, adapter `live` | N/A |
| Test run | `VITEST` or `E2E=1`, AI key set | key treated as absent: `testMode` true, `cached` | `DATABASE_URL` `postgres://…` throws |
| `TEST_MODE=true` | any key | `testMode` true, `cached` | N/A |
| Vercel not hosted | `VERCEL=1`, `APP_ENV` not `hosted` | startup fails | error names `APP_ENV` |
| Hosted incomplete | `APP_ENV=hosted`, `ACCESS_CODE` < 16 chars or missing, or no `DATABASE_URL` | startup fails | error names the setting |
| Hosted test mode | `APP_ENV=hosted`, `TEST_MODE=true` | startup fails | error names `TEST_MODE` |
| Handler result | success / zod failure / `ApiError` / throw | `{ ok:true, data }` / 400 `{ ok:false, error:{ code, field?, retryable } }` / the code's status / 500 `UNEXPECTED` | body has no message or stack; `log` gets only `{ code, errorName, route }` |
| Health | `GET /api/health`, PGlite | 200 `{ ok:true, data:{ hosted:false } }` after `SELECT 1` | failure → 500 `UNEXPECTED` |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.2; spine AD-3, AD-4, AD-7, AD-9, AD-13; Stack table. Existing: `vitest.config.ts` (test env already set), `playwright.config.ts` (`E2E=1`, `pglite://memory`), `src/shared/core/result.ts`, `biome.json` (log.ts exempt from `noConsole`), `next.config.ts` (add `serverExternalPackages`), `.gitignore` (already keeps `.env.example`).

- `src/shared/core/message-key.ts` -- `MessageKey` union: the AD-7 codes plus `INVALID_INPUT`; `errorStatus` map is in `handle.ts`
- `src/shared/server/config.ts` -- `parseConfig(env)` (pure, tested) and `getConfig()` (memoised, reads `process.env`); `FEATURE_DEFAULTS`
- `src/shared/server/db.ts` -- `getDb()` memoised; `applyMigrations(db)`; PGlite applies on open
- `src/shared/server/log.ts` -- `LogEvent` union and `log()`; the only `console`
- `src/shared/server/handle.ts` -- `handle(route, fn)`, `ApiError`
- `scripts/migrate.ts`, `drizzle.config.ts`, `drizzle/` -- migration runner; config with no credentials
- `src/app/api/health/route.ts`, `src/instrumentation.ts` -- health; startup `getConfig()` call
- `.env.example`, `package.json`, `next.config.ts`

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add the pinned dependencies and scripts `db:generate`, `db:check`, `db:migrate` (`tsx --conditions=react-server scripts/migrate.ts`) -- NFR-6, AD-9
- [x] `src/shared/core/message-key.ts` -- define `MessageKey` -- AD-7
- [x] `src/shared/server/config.ts` + `config.test.ts` -- zod parse; flags from `FEATURE_*` (`true`/`false`) over `FEATURE_DEFAULTS`; `isTestRun` = `VITEST` or `E2E=1`; `db` kind from the `DATABASE_URL` scheme; local default URL `postgres://jobassistant:jobassistant@127.0.0.1:54320/jobassistant`; one test per matrix row -- AD-3, AD-4
- [x] `src/shared/server/log.ts` -- `LogEvent` = `{ kind:'error', code, errorName, route }` for now -- AD-13
- [x] `src/shared/server/handle.ts` + `handle.test.ts` -- wrap handler, map `ZodError` to 400 `INVALID_INPUT` with `field`, `ApiError` to its status, anything else to 500 `UNEXPECTED` -- AD-7, NFR-7
- [x] `src/shared/server/db.ts` + `db.test.ts`, `scripts/migrate.ts`, `drizzle.config.ts` -- postgres-js `{ max: 1, idle_timeout: 20 }` for `postgres`/`postgresql`, PGlite for `pglite://memory`; migrator skips when `drizzle/meta/_journal.json` is absent -- AD-9
- [x] `src/app/api/health/route.ts`, `src/instrumentation.ts`, `next.config.ts`, `e2e/health.spec.ts` -- `SELECT 1`, `{ hosted }`; `register()` calls `getConfig()` on the Node runtime; list `@electric-sql/pglite` in `serverExternalPackages` -- FR-27, AD-4
- [x] `.env.example` -- every spine variable as a commented name without value, `FEATURE_*` included; header says `.env` holds only `AI_*` and `TEST_MODE`

**Acceptance Criteria:**
- Given a clean install, when `npm test` runs, then every stage passes.
- Given `APP_ENV=hosted` with no `ACCESS_CODE`, when `next build` runs it succeeds, and when `next start` runs it fails naming `ACCESS_CODE`.
- Given `grep -rn "process.env" src scripts`, then only `config.ts` (and tests) match.
- Given `npx biome check`, then it passes with no `console` outside `log.ts`.

## Implementation Notes

- Implemented by a subagent; verified here against the diff: `npm test` (56 unit, 2 e2e) and the Hosted start check (`next build` succeeds with no env; `next start` exits 1 naming `ACCESS_CODE`).
- `assertStartupConfig()` in `config.ts` (called from `src/instrumentation.ts`) writes the message to stderr and exits 1: a throwing `register()` leaves `next start` serving 500s. It reaches `process` through `globalThis` to keep Turbopack's Edge analysis quiet.
- `GET /api/health` is `force-dynamic`, so a Hosted build with no env does not prerender it.
- `npm run db:check` on an empty history writes `drizzle/meta/_journal.json`, which would make the migrator run; `drizzle/` was deleted. Story 1.4 must not commit an empty `drizzle/`.
- Left out (not in the spec): Hosted rule "`AI_PROVIDER` set needs an AI key"; rejecting `pglite://` on Hosted; `prepare: false` for the Supabase transaction pooler (Story 1.7 may need it). The postgres-js path runs against no real database yet.
- Judgment calls: `errorStatus` for `AI_NOTICE_REQUIRED` 403, `TEST_MODE_UNAVAILABLE` 502, `NETWORK_ERROR` 500; `retryable` defaults to false; a live adapter needs both `AI_API_KEY` and `AI_PROVIDER`; zod failures are not logged.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; defer = `deferred-work.md`; reject = no action.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | `assertStartupConfig` / `register()` exit path untested (VG, BH) | medium | patch: `assertStartupConfig(env)` takes the environment; two tests spy on `process.exit` and stderr |
| 2 | `migrate.ts` leaves the pool open when a step fails; `closeDb` throws after a failed open (BH, EC) | medium | patch: `try/finally` in the script; `closeDb` ignores a failed open |
| 3 | Test fixture uses port 6543 (transaction pooler) although AD-9 forbids it (BH, EC) | low | patch: fixture now uses 5432 |
| 4 | Hosted `AI_PROVIDER` set without a key, and half-set AI settings, fall back to Test mode (BH, EC) | medium | defer: the rule is not in this story's AC; Story 3.12 switches live AI on |
| 5 | First migration history: nothing tests applying a real migration or running `db:migrate` against one; `db.test.ts` "skips" case goes stale (BH, VG, EC) | medium | defer: first story that generates `drizzle/` |
| 6 | `handle()` does not pass the route context (`params`) to the handler (EC) | medium | defer: first dynamic route (`/api/analyses/[id]/…`, Epic 3) |
| 7 | Hosted without an AI key resolves to Test mode (BH, EC) | false | AD-3: "Before S3, Hosted runs with the AI sections unavailable"; only `TEST_MODE=true` is an error |
| 8 | `prepare: false` / no `ssl` option for Supabase (BH, EC) | false | AD-9 fixes the session pooler on 5432 with `{ max: 1, idle_timeout: 20 }`; TLS comes from the URL (AD-3) |
| 9 | Health failure answers 500 `UNEXPECTED`, not 503 (BH) | false | the story says failure is 500 `UNEXPECTED`; the matrix row fixes it |
| 10 | No migrations folder means a silent skip (BH, EC) | false | the spec says the migrator skips then; Vercel's build runs `db:migrate` from the repo root |
| 11 | `errorStatus` coverage untested (BH) | false | `Record<MessageKey, number>` fails type-checking when a key lacks a status |
| 12 | `isTestRun` on Hosted; `VITEST` value inconsistent with `E2E` (BH, EC) | low | rejected: Vitest always sets `VITEST=true`; a stray test flag on Vercel is operator error, and the guard adds a branch |
| 13 | Whitespace-only `ACCESS_CODE`, Hosted with `pglite://memory`, `.env.example` wording, `AI_MODEL` unread (BH, EC) | low | rejected: operator-set values, named in the spec as left out, or later stories read them |
| 14 | Failed `openDb()` memoised; health has no timeout; `applyMigrations` picks the migrator from config (EC, BH) | low | rejected: Postgres opens lazily so it cannot fail at open; the fixes add guards for cases no story reaches |
| 15 | Zod failures not logged; Next redirect/notFound swallowed by `handle()`; `log.ts` untested; health `hosted: true` untested (EC, VG, BH) | low | rejected: judgment calls or one-liners with no named harm |
| 16 | `assertStartupConfig` writes to stderr outside `log()` (EC) | false | `noConsole` does not apply to `process.stderr`, and the message is not a `LogEvent` |
| 17 | `.env.example` / compose / `messages.nb.ts` checks missing (BH) | false | Stories 1.3 and 1.5 |

## Design Notes

- Empty migration history: this story has no tables, so `drizzle/` stays empty and the migrator is a no-op until the first story that adds a schema generates one.
- `src/instrumentation.ts` is how "the app starts" fails fast without breaking `next build` (register runs on server start only); verify that with the `APP_ENV=hosted` check above, and drop the file if Next runs it at build.

## Verification

**Commands:**
- `npm test` -- expected: all five stages pass
- `APP_ENV=hosted npm run build` -- expected: succeeds with no env
- `APP_ENV=hosted npx next start -p 3200` -- expected: exits naming `ACCESS_CODE`
- `git ls-files .env .data` -- expected: no output
