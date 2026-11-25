---
title: 'Seed the local test user'
type: 'feature'
created: '2026-11-25'
status: 'in-review'
baseline_revision: '5d6e76756f977e256322abef44525b473eb3b99e'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-10-see-my-account-and-log-out.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** After setup there is no user to log in as: the Examiner must register to see a saved Profile, and the end-to-end tests and (in 6.12) the CI smoke run have no known account.

**Approach:** `seedTestUser` (identity creates the Student, profile upserts the Profile) runs as a local step of `scripts/setup.ts` after the key check, and from `db.ts` on PGlite under `E2E=1`. It runs only with accounts on, `APP_ENV=local`, a local database and an `ENCRYPTION_KEY`. The README names the email and password. `FEATURE_DEFAULTS.accounts` stays `false`: 6.11 changes nothing for a run without the flag.

## Boundaries & Constraints

**Always:** Insert the Student with `INSERT … ON CONFLICT DO NOTHING` on the email; upsert only the Profile CV and its save date on every run; the CV (and the name) go through `encryptedText`; the password only as scrypt hash; the seed refuses Hosted, accounts off, no key, a Postgres host other than `db`, `127.0.0.1`, `localhost`, and PGlite outside a test run; an existing account with the seed email but another password is left untouched; nothing logs the password, a hash, the key or CV text; email/password are the made-up constants of the README, `seed.ts` and `scripts/smoke.mjs` (one test checks they agree); the email is not one the e2e tests register (`@example.test`).

**Never:** Set `accounts` true in `FEATURE_DEFAULTS` or `FEATURE_ACCOUNTS` anywhere in `compose.yaml`, `.env.example`, README; add a package or a migration; run setup or the seed against the real `.data/`, `SECRETS_FILE` or local database; touch Hosted, `gaps-4`, cached fixtures, Answer keys; change an existing test; build 6.12 (smoke login, e2e account flows); write in `.logs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Setup, local | accounts on, `APP_ENV=local`, host `db`/`127.0.0.1`/`localhost`, key | one Student + Profile with Example CV encrypted | n/a |
| Setup twice | user exists | still one Student, one Profile; CV replaced by the Example CV; hash unchanged | n/a |
| Flag off | default | no user | n/a |
| Hosted | `APP_ENV=hosted`, any host | no user | n/a |
| Foreign host | `x.supabase.co` | no user (setup only migrates) | n/a |
| No key | accounts on, no `ENCRYPTION_KEY` | no user | n/a |
| Playwright | `E2E=1`, accounts on, PGlite | user exists when the server starts; login works | n/a |
| Seed email taken by another account | other password | untouched, seed returns false | n/a |

</intent-contract>

## Code Map

- `src/modules/identity/server/seed.ts` (new) -- `SEED_TEST_USER`, `mayRunSeed`, `seedTestUser`; exported from `identity/index.ts`. Setup imports the file directly (the index pulls in Next).
- `src/modules/identity/server/students.ts` -- `insertStudentIfAbsent` (`ON CONFLICT DO NOTHING` on email).
- `src/modules/profile/server/profiles.ts`, `index.ts` -- `upsertSeedProfile` (insert, on conflict only CV text and `cv_saved_at`).
- `src/shared/server/config.ts` -- `isLocalPostgres` and `LOCAL_DATABASE_HOSTS` (moved from setup), `Config.e2e`.
- `src/shared/server/db.ts` -- `registerE2eSeed`; on PGlite under `config.e2e` runs the registered seed after migrations (the shared kernel cannot import a slice).
- `src/instrumentation.ts`, `src/instrumentation-node.ts` (new) -- under E2E=1 register the seed and open the PGlite at server start.
- `scripts/setup.ts` -- `seedStep` in `LOCAL_STEPS` after `checkKeyStep`; `isLocalTarget` delegates to `isLocalPostgres`.
- `scripts/smoke.mjs`, `README.md` -- the made-up email and password.
- Tests: `identity/server/seed.test.ts`, `scripts/setup-seed.test.ts`, `src/instrumentation-node.test.ts`, `test/seed-user-agreement.test.ts`, `e2e/seed-user.spec.ts`.
- Read-only: `crypto.ts`, `passwords.ts`, `login.ts`, `data-files.ts`, cached fixtures.

## Tasks & Acceptance

**Execution:**
- Files in the Code Map -- built by the parent; every matrix row has a unit test; the Playwright test logs in as the seed user on the accounts-on server.

**Acceptance Criteria:**
- Given the matrix, when `npm test`, `npm run typecheck` and `docker compose run --rm --build test` run, then all pass and no existing test is edited.
- Given `FEATURE_ACCOUNTS` off, when the app or setup runs, then it behaves as after Epic 5.
- Given the database after a seed, when raw rows are read, then the CV and name are `v1.` ciphertext and the password only a scrypt hash.

## Spec Change Log

## Review Triage Log

### 2026-11-25 - Review pass
- verdicts: 25 findings (blind 11, edge 9, verification-gap 5; intent-alignment descriptive) - high 0, medium 0, low 22, false 3, maybe-false 0
- findings:
  - `[low]` `reject` Blind: setup prints nothing when it seeds or skips - setup is silent today (key step too); a status line would need a secret-safe reason text for little gain.
  - `[low]` `reject` Blind, intent layer: the README does not say how to turn accounts on - 6.12 forbids the README (and compose, `.env.example`) from setting `FEATURE_ACCOUNTS`, and 6.12 turns the default on; written to issues.md as a note for 6.12.
  - `[low]` `reject` Blind: a mislabelled deployment or an SSH tunnel on `localhost` would be seeded, IPv6 loopback is missing - the AC names exactly `db`, `127.0.0.1`, `localhost` and `APP_ENV=local`; a second opt-in would go beyond the AC.
  - `[low]` `patch` Blind, edge, verification-gap: the Hosted e2e only asserted `ok() === false` - now expects 400 `INVALID_INPUT` on `password` (the route answered and knows no such user).
  - `[low]` `patch` Blind: the wrong-password e2e title promised a no-enumeration comparison it does not make - renamed to what it asserts.
  - `[low]` `patch` Blind, edge, verification-gap: the agreement test listed nine e2e specs by hand - now reads every `e2e/*.spec.ts` except the seed's own.
  - `[low]` `reject` Blind: `SEED_EMAIL`/`SEED_PASSWORD` unused in `smoke.mjs` - they are used by the agreement test, and 6.12 logs in with them.
  - `[low]` `reject` Blind, verification-gap: no test of the `NEXT_RUNTIME` branch, the "no key" setup row, or one guard at a time - `mayRunSeed` has the no-key row, the outcome is pinned by `instrumentation-node.test.ts`.
  - `[low]` `reject` Blind, edge: a throwing seed in `db.ts` leaves a cached rejected promise and an open PGlite - the same as a failing migration there today; E2E-only, and the server then fails visibly at start.
  - `[false]` `reject` Blind: the seeded Profile has no AI-notice version - correct: the Student accepts it once, like any new account.
  - `[low]` `reject` Blind, edge: the CV is overwritten and `cv_saved_at` reset on every start - that is the AC («upserts its Profile CV on every run»).
  - `[low]` `reject` Blind: spec loose ends and the `.logs/` rule - the spec is finished below; `.logs/` belongs to the main loop.
  - `[low]` `patch` Verification-gap: nothing pinned that a re-run leaves the name and the accepted notice alone - "run twice" now changes the notice version and compares the raw name ciphertext (a new one each time it is written) before and after.
  - `[low]` `reject` Verification-gap: the accounts-off e2e (404) passes whether or not the seed ran - the seed's refusal with the flag off is `seed.test.ts` and `instrumentation-node.test.ts`; the e2e documents the Epic 5 behaviour.
  - `[low]` `reject` Verification-gap: nothing runs the seed against postgres-js - true and a known limit: PGlite in every test; CI starts `app` with accounts off until 6.12 (smoke login). Written to issues.md.
  - `[low]` `patch` Edge: the seeded CV had the file's line endings (CRLF in a Windows checkout) - normalised to LF as the CV field gives it; tests compare to the normalised text.
  - `[low]` `reject` Edge: a throwing `seedStep` aborts setup - the key step does the same; a broken seed (unreadable `data/`) must show, not be swallowed.
  - `[low]` `reject` Edge: setup does not reset the seed user's name or notice - the AC upserts only the CV.
  - `[low]` `reject` Edge: another `ENCRYPTION_KEY` than the rows were written with - `checkKeyStep` runs first and stops setup.
  - `[low]` `reject` Edge: eager `getDb()` failure at start gives no seed-specific message - it throws from `register()`, and Playwright shows the server's error.
  - `[false]` `reject` Edge: `getDb` could open before `register()` ran - Next awaits `register()` before serving, and `startE2eSeed` registers before its own `getDb`.
  - `[low]` `reject` Edge: the CV length is not checked in code - `seed.test.ts` asserts the Example CV passes `cvTextSchema`.
  - Intent layer (descriptive): reading A (per-criterion, with a strict gate) implemented; the story's «log in after setup» outcome needs accounts on, which stays off until 6.12 (by the run's rule).

## Design Notes

The shared kernel may not import a slice (biome rule), so `db.ts` holds a hook on `globalThis`, filled by `instrumentation-node.ts` under `E2E=1`. Opening the PGlite at start (accounts on, not Hosted) makes the seed run "when the web server starts"; everywhere else `getDb` stays lazy.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: lint, types, unit and Playwright pass
- `docker compose run --rm --build test` -- expected: passes (setup is touched)

## Auto Run Result

Status: done

**Summary:** `seedTestUser` (identity creates the Student with `INSERT … ON CONFLICT DO NOTHING`, profile upserts the Profile CV from the Example pair on every run, encrypted) runs as a local step of `scripts/setup.ts` after `checkKeyStep`, and from `db.ts` on PGlite under `E2E=1` (a hook that `instrumentation-node.ts` registers, because the shared kernel cannot import a slice). It runs only with accounts on, `APP_ENV=local`, a local database (`db`, `127.0.0.1`, `localhost`, or the PGlite of a test run) and an `ENCRYPTION_KEY`. An account that holds the seed email but not the seed password is left alone. `FEATURE_DEFAULTS.accounts` stays `false`. README, `seed.ts` and `scripts/smoke.mjs` name the same made-up email and password; a test keeps them equal.

**Files:** `src/modules/identity/server/seed.ts` (new), `students.ts` (`insertStudentIfAbsent`), `src/modules/profile/server/profiles.ts` (`upsertSeedProfile`), `src/shared/server/config.ts` (`isLocalPostgres`, `Config.e2e`), `src/shared/server/db.ts` (`registerE2eSeed`), `src/instrumentation.ts` and `instrumentation-node.ts`, `scripts/setup.ts` (`seedStep`), `scripts/smoke.mjs`, `README.md`, `sprint-status.yaml`; tests `seed.test.ts`, `scripts/setup-seed.test.ts`, `src/instrumentation-node.test.ts`, `test/seed-user-agreement.test.ts`, `e2e/seed-user.spec.ts`.

**Review:** 25 findings, 5 patched (Hosted e2e assertion, e2e title, spec list read from `e2e/`, name and notice kept on re-run, CRLF to LF), 0 deferred, 20 rejected with reasons in the triage log. Follow-up review recommended: false.

**Verification:** `npm test` (biome, tsc, 1831 vitest, 387 Playwright) passed. The Docker test could not run locally (Docker Desktop was not running, and the run does not start it); `ci` on the PR is its result.

**Residual risks:** no test runs the seed against postgres-js (PGlite in every test); with accounts off by default the CI `app` container does not seed until 6.12; the README says «when accounts are on» without naming the flag, since 6.12 forbids the README from setting it.
