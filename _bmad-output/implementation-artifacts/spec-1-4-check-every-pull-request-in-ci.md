---
title: 'Story 1.4: Check every pull request in CI'
type: 'feature'
created: '2026-11-14'
status: 'done'
baseline_commit: 'abe0a41cf0e8b3dbca427f388a46238e6d819ee2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing checks a pull request. A broken build, a red test or a committed `.env` can reach `main`, and nothing proves that the README commands still work for the Examiner.

**Approach:** Add a GitHub Actions workflow that runs the README commands plus a smoke run, a `db:check` script, `scripts/smoke.mjs`, and a pull-request template. Covers NFR-7, NFR-9, NFR-10, AD-9, AD-17.

## Boundaries & Constraints

**Always:**
- Branch `story/1.4-ci-on-pull-requests` off `main`. Commits cite `1.4` and the IDs. Stage by explicit path.
- Workflow `.github/workflows/ci.yml` runs on `pull_request` and on `push` to `main`, with `permissions: contents: read`, a `timeout-minutes`, and `concurrency` that cancels older runs of the same ref.
- Steps in order: checkout; fail if `git ls-files .data .env` prints anything; build `app` and `test` once with BuildKit `type=gha` cache (`docker/bake-action` on `compose.yaml`, images tagged as Compose names them: `jobassistant-app`, `jobassistant-test`); `docker compose run --rm test`; `docker compose run --rm test npm run db:check`; `docker compose up -d --wait --no-build app`; `docker compose exec app node scripts/smoke.mjs`; `docker compose down -v` with `if: always()`; on failure, print `docker compose logs`.
- Every action is pinned to an exact release tag, never a floating major.
- `db:check` runs `drizzle-kit check` only when `drizzle/meta/_journal.json` exists (with no history the command would write a journal into the working tree), then applies the history from zero on PGlite through `applyMigrations`. It sets `DATABASE_URL=pglite://memory` itself and writes no file.
- `scripts/smoke.mjs` GETs `/api/health` and passes only on HTTP 200 with `{ ok: true, data: { hosted: false } }`. It prints with `process.stdout`/`process.stderr` (Biome bans `console`) and exits 1 on any other result. Default base URL `http://127.0.0.1:3000`.
- No shell scripts. Tests name the requirement ID.
- Decision (branch protection): the build cannot apply it (no admin on the repository). It writes `docs/qa/branch-protection.md` with the exact rule (pull request required, status check `ci` must pass, no direct pushes to `main`) and marks the setting as open until a repo admin applies it. The story is built with that point open.

**Never:**
- No change to `compose.yaml`, `Dockerfile` or `config.ts`. No `vercel.json` (1.7), no keep-alive workflow (Story 1.7), no login smoke step (Story 6.11).
- No committed `drizzle/`. No secret in the workflow. No CI step that deploys.
- Do not call the GitHub API to change repository settings.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Green PR | build, tests, db check, smoke pass | job green | N/A |
| Tracked secret | `git ls-files .data .env` prints a path | job fails before any build | step prints the paths |
| Health ok | 200 `{ok:true,data:{hosted:false}}` | smoke exit 0 | N/A |
| Health wrong body or status | 500, or `hosted:true`, or not JSON | smoke exit 1 | stderr says what was seen |
| App down | connection refused | smoke exit 1 | stderr names the error |
| No migration history | `drizzle/` missing | `db:check` exit 0, writes nothing | stdout says history is empty |
| Broken history | `drizzle-kit check` or a migration throws | `db:check` exit 1 | output is printed |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.4; spine AD-9 (migrations), AD-17 (CI list). Kept as is: `compose.yaml` (project `jobassistant`, so images are `jobassistant-app` and `jobassistant-test`; `test` has `profiles: ["test"]`), `Dockerfile` (`COPY . .` puts `scripts/` in both images), `package.json` `test` script, `scripts/migrate.ts`, `scripts/setup.ts` (copy its `isEntryPoint` realpath guard).

- `.github/workflows/ci.yml` -- new; the steps above. Latest tags found on 2026-11-14: `actions/checkout` v7.0.1, `docker/setup-buildx-action` v4.4.1, `docker/bake-action` v7.5.0
- `.github/pull_request_template.md` -- new; asks for story ID, FR/NFR IDs, what changed, how it was checked
- `scripts/smoke.mjs` -- new; exports `checkHealth(baseUrl)`; main runs only when started directly
- `scripts/smoke.test.ts` -- new; one test per matrix row against a local `node:http` server
- `scripts/db-check.ts` -- new; guarded `drizzle-kit check` via `process.execPath` and `node_modules/drizzle-kit/bin.cjs` (no `npx`, works on Windows), then `applyMigrations(await getDb())` on PGlite, `closeDb` in `finally`
- `scripts/db-check.test.ts` -- new; spawns the script and asserts exit 0 and no `drizzle/` directory
- `package.json` -- `db:check`: `tsx --conditions=react-server scripts/db-check.ts` (replaces the bare `drizzle-kit check`)
- `docs/qa/branch-protection.md` -- new; the rule and its open status
- `_bmad-output/implementation-artifacts/deferred-work.md` -- the import-graph check for slices (Story 1.1) stays deferred: no slice has broken the `@/` rule yet

## Tasks & Acceptance

**Execution:**
- [x] `scripts/smoke.mjs` + `scripts/smoke.test.ts` -- health check and one test per matrix row -- NFR-9, AD-17
- [x] `scripts/db-check.ts` + `scripts/db-check.test.ts` + `package.json` -- guarded check and from-zero PGlite migration -- AD-9, NFR-7
- [x] `.github/workflows/ci.yml` -- the steps above, validated with `actionlint` in Docker -- NFR-7, NFR-9, AD-17
- [x] `.github/pull_request_template.md` -- story ID, FR/NFR IDs -- NFR-10
- [x] `docs/qa/branch-protection.md` -- the rule and its status -- NFR-10

**Acceptance Criteria:**
- Given a pull request, when CI runs, then it builds `app` and `test` once with the `type=gha` cache, runs `docker compose run --rm test`, `db:check`, starts `app` with `up -d --wait`, runs `scripts/smoke.mjs`, and ends with `down -v`.
- Given a commit that tracks a file under `.data/` or a `.env` file, when CI runs, then it fails because `git ls-files .data .env` prints something.
- Given a new pull request, when it is opened, then the template asks for the story ID and the FR and NFR IDs.
- Given the same steps run by hand on this machine, then every command passes and `git status` shows no `drizzle/` directory.
- Given `docs/qa/branch-protection.md`, then it names the rule, the required check `ci` and its open status.

## Implementation Notes

- Implemented directly in the main session (no subagent). Verified on Docker 29.7.2: `docker buildx bake` with the same tags and `--load` (without the `gha` cache, which only exists on GitHub), `docker compose run --rm test` (94 unit, 2 e2e), `run --rm test npm run db:check`, `up -d --wait --no-build app` (db and app healthy), `exec app node scripts/smoke.mjs` (exit 0), `down -v`. `npm test` passes on the host. `actionlint` 1.7.12 (Docker) reports nothing on `ci.yml`.
- Not verified: the workflow itself on GitHub (the `gha` cache, `bake-action` inputs, check name `ci`). The first pull request is the proof. Branch protection is not applied (no admin): `docs/qa/branch-protection.md` marks it open.
- The smoke script is `.mjs` with no types; `tsc` reads it through `allowJs`. `db-check.ts` skips `drizzle-kit check` while `drizzle/meta/_journal.json` is missing, so both it and its test change meaning once the first story with a migration lands: the test compares the journal before and after, so it stays valid.
- Not in scope and still open: the import-graph check for slices (deferred from Story 1.1); a failing `.data`/`.env` tracked-file step was reasoned, not run.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; defer = `deferred-work.md`; reject = no action.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | `concurrency` cancels the run of an earlier push to `main` (BH, EC) | medium | patch: `cancel-in-progress` only for pull requests |
| 2 | `db:check` prints "Migrations apply from zero" when nothing was applied (BH, EC, VG) | medium | patch: with no journal it prints only "No migration history yet" and skips both steps; the success line appears only after a real check |
| 3 | `scripts/smoke.mjs` as a process is untested; a false `isEntryPoint()` would pass CI silently (VG) | medium | patch: two spawn tests (exit 0 and "Smoke passed"; exit 1 and "Smoke failed") |
| 4 | Smoke tests never assert the requested path (VG) | low | patch: the fake server records `GET /api/health` |
| 5 | Nothing checks that bake tags match Compose's names; `run test` would rebuild without the cache (BH, EC) | low | patch: CI step `docker image inspect jobassistant-app jobassistant-test` |
| 6 | `db-check.test.ts` checks only the journal file, not the `drizzle/` directory (EC) | low | patch: compares `existsSync("drizzle")` and expects the right stdout per case |
| 7 | A failed `drizzle-kit` spawn hides its error (EC) | low | patch: `check.error` is printed |
| 8 | Explicit `applyMigrations` after `getDb()` applies twice (VG) | low | patch: `getDb()` alone applies the history on PGlite |
| 9 | Branch-protection note: person named, no force-push rule (BH) | low | patch: role wording, force pushes and deletion added; the repo slug was checked with `gh` |
| 10 | `db:check` never runs on a real history (consistent, broken SQL, inconsistent snapshot) (VG, BH) | medium | defer: no migration exists; the deferred 1.2 item already asks the first migration story for a PGlite test. A broken journal was run by hand: exit 1 |
| 11 | `git ls-files .data .env` misses `.env.local` and nested `.env` (BH, EC) | low | reject: the AC names that command, `.gitignore` already blocks `.env.*`, and a tracked one needs `git add -f` |
| 12 | Actions pinned to tags, not SHAs; no `paths-ignore`; no `compose config` step (BH) | low | reject: the spec pins exact release tags |
| 13 | `drizzle-kit check` does not see schema-versus-migration drift (BH) | low | reject: AD-9 names `drizzle-kit check` plus a from-zero migration |
| 14 | `DATABASE_URL` set after the ES import (BH) | false | `getConfig` is lazy and memoised, so nothing reads it at import; the spawn test passes with a bad URL in the environment |
| 15 | `scripts/` may be missing from the `app` image (BH) | false | `exec app node scripts/smoke.mjs` ran in the built image |
| 16 | `up --wait` could hang to the 30-minute timeout (EC) | false | the `app` healthcheck stops at 20 retries of 5 s, then `--wait` fails |
| 17 | 3xx redirect passes the smoke run (EC) | false | a redirected page would also need the body `{ok:true,data:{hosted:false}}` |
| 18 | Body-read timeout reads "not JSON"; `AggregateError` text; `closeDb` throwing; null/array/timeout bodies untested (EC) | low | reject: message detail only, and the code handles them |
| 19 | stderr must be empty, relative paths, 30 s timeout in `db-check.test.ts` (BH, EC) | low | reject: same pattern as `setup.test.ts`; passed on the host and in the container |
| 20 | PR template and README thin; no tracked follow-up for branch protection (BH, VG) | low | reject for template and README; the follow-up goes in the session log's open points |

## Design Notes

- `docker buildx bake -f compose.yaml` gives images no names and ignores the Compose project name and profile, so `ci.yml` sets `jobassistant-app` and `jobassistant-test` through `set:`. `up --no-build` then fails loudly if a tag is wrong instead of rebuilding without the cache.
- CI cannot be run from here. The run on the first pull request is the real proof, and the build reports it as such.

## Verification

**Commands:**
- `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:<pinned tag>` -- expected: no findings
- `npm run db:check` -- expected: exit 0, `git status --short drizzle` prints nothing
- `npm test` -- expected: passes on the host
- `docker compose run --rm --build test` -- expected: passes
- `docker compose up -d --wait --no-build app`, then `docker compose exec app node scripts/smoke.mjs` -- expected: exit 0
- `docker compose down -v` -- expected: clean
- `git ls-files .data .env` -- expected: no output
