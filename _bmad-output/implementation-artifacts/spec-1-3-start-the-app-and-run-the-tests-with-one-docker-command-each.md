---
title: 'Story 1.3: Start the app and run the tests with one Docker command each'
type: 'feature'
created: '2026-11-14'
status: 'done'
baseline_commit: '8c100a80d8c451c0b276da6f26c142c258942ea0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app only runs on a machine with Node 26 and a hand-installed Chromium. The Examiner has Docker and nothing else, and the Postgres code path has never run against a real database.

**Approach:** Add `Dockerfile` (stages `deps`, `build`, `app`, `test`), `compose.yaml` (`db`, `app`, `test`), `.dockerignore`, `scripts/setup.ts` (migrate under an advisory lock, behind the production guard), `predev`, and the first README. Covers NFR-9, NFR-6, NFR-7, AD-17.

## Boundaries & Constraints

**Always:**
- Branch `story/1.3-docker-run-and-test` off `main`. Commits cite `1.3` and the IDs. Stage by explicit path.
- Images fixed exactly: `node:26.13.1-trixie-slim`, `postgres:17.12-alpine`. `NODE_ENV=production` only in stage `app`; `/data` owned by `node`; no `output: 'standalone'`; no shell scripts (`.sh`); scripts are TypeScript run with `tsx --conditions=react-server`.
- Published ports: only `127.0.0.1:3000` (app) and `127.0.0.1:54320` (db). `compose.yaml` has `name: jobassistant`, sets `SECRETS_FILE=/data/secrets.env` on volume `appdata`, and reads an optional `.env` (`required: false`).
- `test` has `profiles: ["test"]` and runs `npm test` on PGlite without `db`. `app` waits for a healthy `db`; its healthcheck fetches `/api/health`.
- Setup order: migrate under `pg_advisory_lock`, then local-only steps. Local-only steps run only when `APP_ENV=local` and the `DATABASE_URL` host is `db`, `127.0.0.1` or `localhost`; otherwise setup only migrates. Raw `sql` lives only in `db.ts`.
- Tests name the requirement ID (`describe('NFR-9 …')`).

**Never:**
- No secrets or seed steps (Stories 6.1, 6.11), no `local_meta`, no CI workflow (1.4), no `vercel.json` (1.7), no change to `config.ts` defaults (1.2 already set them).
- No committed `drizzle/`; no secret or key in any Docker file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Local Docker | `APP_ENV=local`, host `db` | migrate, then local steps | N/A |
| Developer loop | host `127.0.0.1` or `localhost` | same | N/A |
| Foreign database | `APP_ENV=local`, host `x.supabase.co` | migrate only | N/A |
| Hosted | `APP_ENV=hosted` | migrate only | N/A |
| PGlite | `pglite://memory` | no lock, migrate only | N/A |
| Fresh start | empty `pgdata` | `db` healthy, `app` healthy, `/api/health` 200 `{ hosted:false }` | N/A |
| Reset | `docker compose down -v`, then `up --build` | clean start | N/A |
| Failing step | migrate throws | lock released, pool closed, exit 1 | stderr names the failure |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.3; spine AD-17, AD-9. Existing and kept: `scripts/migrate.ts` (the only migrator, AD-9), `src/shared/server/db.ts` (`getDb`, `applyMigrations`, `closeDb`; extend), `src/shared/server/config.ts` (`LOCAL_DATABASE_URL`, `getConfig`; no change), `playwright.config.ts` (port 3100, PGlite), `vitest.config.ts` (`include` already covers `scripts/**` and `test/**`), `.env.example`, `.gitignore` (`.env*`, `.data/`).

- `src/shared/server/db.ts` -- add `withAdvisoryLock(db, key, fn)`: `pg_advisory_lock` / `pg_advisory_unlock` on postgres-js; just runs `fn` on PGlite
- `scripts/setup.ts` -- `isLocalTarget(config)`, `runSetup(db, { localSteps })` (`LOCAL_STEPS` empty until 6.1 and 6.11), main runs only when started directly; closes the pool in `finally`
- `scripts/setup.test.ts` -- guard matrix, order, lock released on failure
- `Dockerfile`, `.dockerignore`, `compose.yaml` -- as AD-17; `test` stage runs `playwright install --with-deps chromium`
- `package.json` -- `predev` (setup), `serve` (setup, then `next start -H 0.0.0.0 -p 3000`; this is the `app` command)
- `test/docker-files.test.ts` -- static checks on the three Docker files (stages, images, ports, no standalone, no `.sh`)
- `README.md` -- keep the header; add Run, Test, Reset, Developer loop, tested Docker version

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/server/db.ts` -- add `withAdvisoryLock`, test it on PGlite -- AD-17, AD-9
- [x] `scripts/setup.ts` + `scripts/setup.test.ts` -- guard, order, lock, one test per matrix row -- AD-17, NFR-7
- [x] `package.json` -- add `predev` and `serve` -- AD-17
- [x] `Dockerfile`, `.dockerignore`, `compose.yaml` -- stages and services as AD-17; `app` copies from `build` with `--chown=node:node`, keeps all `node_modules`, `mkdir -p /data && chown node:node /data` before `USER node` -- NFR-9, NFR-6
- [x] `test/docker-files.test.ts` -- assert the Docker-file ACs below -- NFR-9
- [x] `README.md` -- three commands with what each shows, Docker version actually tested, `docker compose ps` shows `healthy`, developer loop, Chromium for the host loop -- NFR-9

**Acceptance Criteria:**
- Given Docker only, when `docker compose up --build` runs, then `db` and `app` become `healthy`, `http://localhost:3000` answers in Test mode, and `docker compose ps` publishes only `127.0.0.1:3000` and `127.0.0.1:54320`.
- Given `docker compose run --rm --build test`, then `npm test` passes in the container and `db` does not start.
- Given `docker compose down -v` and a new `up --build`, then the data is reset and the app starts cleanly.
- Given `docker compose up db` and `npm run dev` on the host, then `predev` runs setup against `127.0.0.1:54320`.
- Given the host loop with Node 26, when `npm test` runs, then it passes.
- Given `git ls-files .data .env`, then it prints nothing.

## Implementation Notes

- Implemented directly in the main session (no subagent). Verified on Docker Desktop 4.87.0 / Engine 29.7.2 (started by hand; the engine was off): `up --build -d --wait` gives `db` and `app` healthy, `/api/health` answers `{"ok":true,"data":{"hosted":false}}` through postgres-js (first real run of that path), ports only on `127.0.0.1`, `/data` owned by `node`; `down -v` then a new `up` is clean; `docker compose run --rm --build test` passes (80 unit, 2 e2e) with no `db` started; `npm test` passes on the host; `npm run predev` runs setup against `127.0.0.1:54320` and leaves no advisory lock; a bad `DATABASE_URL` makes setup print one line and exit 1.
- `serve` (npm script) chains setup and `next start`, so the container needs no shell file. `LOCAL_STEPS` is an empty list: Stories 6.1 and 6.11 fill it. The guard treats PGlite as not local.
- `docker-files.test.ts` checks the Docker files as text (no YAML parser added). The `test` stage has no `.git`, so the "no `.sh`" test scans directories instead of `git ls-files`.
- Not done by the build: Helene's walkthrough of the README on Windows. README says «Tested with Docker 29.7.2 (Docker Desktop on Windows 11)», which is what ran here.
- Review patches (see the triage log): TCP healthcheck for `db`, realpath entry guard, root-cause error text, lock tests with a mocked config (`db-lock.test.ts`), a spawn test of `setup.ts`, README and `.dockerignore` fixes. Python rewrote some files with CRLF on Windows; all were set back to LF.
- The lock itself is exercised on a real database only by hand (`pg_locks` empty after a run); the unit tests use a mocked config.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; defer = `deferred-work.md`; reject = no action.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | `pg_isready` over the unix socket can pass during the first-start initdb server, before TCP listens (EC) | medium | patch: healthcheck is `pg_isready -h 127.0.0.1`; a fresh stack was started again and is healthy |
| 2 | Entry guard `import.meta.url` vs `argv[1]` can skip `main()` (symlink, path form) and the app starts unmigrated; nothing runs `main` (BH, EC, VG) | medium | patch: compare `realpathSync` of both; new test spawns `tsx scripts/setup.ts` and asserts exit 1 |
| 3 | Setup prints only the error class and a database hint (BH, EC) | medium | patch: prints the root cause (name, code, message); the hint is gone; the spawn test checks `ECONNREFUSED` |
| 4 | Failing `pg_advisory_unlock` hides the original error (BH, EC) | low | patch: one-line `.catch` on the unlock (a dropped connection already released the lock) |
| 5 | The Postgres lock branch is never executed by a test (BH, EC, VG) | medium | patch: `db-lock.test.ts` mocks config to `postgres` and checks lock, fn, unlock order, unlock after a throw, and an unlock failure |
| 6 | Hosted and PGlite rows only tested through `isLocalTarget` (EC) | low | patch: two `runSetup` tests |
| 7 | `.dockerignore` lacks `*.tsbuildinfo`, `next-env.d.ts`, editor and `.claude` folders (BH, EC) | low | patch: added; a stale host `tsbuildinfo` could reach `tsc` in the container |
| 8 | Docker-file tests: quoted-ports-only regex, NODE_ENV count, no check of `USER node`, `service_healthy`, healthchecks (BH, EC) | low | patch: unquoted ports match, per-stage NODE_ENV check, three more assertions |
| 9 | README: Compose 2.24 needed for `required: false`, `up` stays in the foreground, port clashes, slow first build, `down -v` deletes the app data, Docker version wording (BH) | medium | patch: README updated |
| 10 | `pg_advisory_lock` has no timeout; a hung starter blocks the next one (BH, EC) | low | reject: needs a crashed container on a shared database; the fix adds a polling loop |
| 11 | Session lock lost if a step idles over `idle_timeout` 20 s (EC) | low | defer: no local step exists yet; Stories 6.1 and 6.11 add the first |
| 12 | Order test cannot see that migration runs before local steps (VG, EC) | medium | defer: `drizzle/` is empty; the first story with a migration adds the check |
| 13 | `npm` as PID 1 swallows SIGTERM (BH, EC) | false | `docker compose stop` took 1.5 s, not the 10 s kill timeout |
| 14 | No `restart: on-failure` on `app` (EC) | low | reject: finding 1 removes the race; a restart policy would hide real setup errors |
| 15 | Chromium `shm_size` / `ipc: host` in `test` (BH) | low | reject: the container run passed twice; two small pages |
| 16 | Guard allows `localhost`/`127.0.0.1` through a tunnel, `?host=` parameter, `::1` (BH, EC) | low | reject: operator-set URLs; the spec lists exactly `db`, `127.0.0.1`, `localhost` |
| 17 | `.env*` also ignores `.env.example` (BH) | false | nothing in the image reads it; the README tells people to copy it from the repo |
| 18 | `app` image holds dev dependencies (BH) | false | AD-17: `app` keeps all `node_modules` so setup can run |
| 19 | `migrate.ts` has no lock (VG) | false | only setup is spec'd to serialise (AD-17); Vercel's build is the only other caller |
| 20 | Spec `in-review` while sprint status `in-progress`; `DATABASE_URL` in `.env` is ignored; hard-coded login; `.sh` scan list; spec Verification lacks `predev` (BH) | low | reject: step 5 syncs status; the rest are documented or have no named harm |

## Design Notes

- The first run of the postgres-js path: run it for real here. Findings (pooler options, TLS, `prepare`) go to Implementation Notes, not into scope.
- With `drizzle/` empty (Story 1.2), migrate is a no-op, but the lock and the connection still run, which is what proves the path.
- Helene's Windows walkthrough (the last AC of the epic story) cannot be done by the build: it stays an open point in the session log and README says «tested on Docker 29.7.2» only for what ran here.

## Verification

**Commands:**
- `docker compose up --build -d --wait` -- expected: `db` and `app` healthy
- `curl http://127.0.0.1:3000/api/health` -- expected: `{"ok":true,"data":{"hosted":false}}`
- `docker compose ps` -- expected: ports only on `127.0.0.1`
- `docker compose down -v` -- expected: containers, volumes removed
- `docker compose run --rm --build test` -- expected: all stages pass
- `npm test` -- expected: passes on the host
- `git ls-files .data .env` -- expected: no output
