---
title: 'Switch on accounts'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_revision: 'a0f6b46ecd67659d228a438ff84c3efdf285a5f4'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-11-seed-the-local-test-user.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Stories 6.1-6.11 built accounts, Profil, Historikk and encryption behind `FEATURE_ACCOUNTS`, which is still off by default. Nothing proves that one Student cannot reach another's data (FR-19) or that an opened database reveals nothing readable (FR-22), CI does not log in as the seeded user, and the end-to-end suite runs its general specs on servers that silently assumed accounts off.

**Approach:** Set `FEATURE_DEFAULTS.accounts = true` (the only place in Epic 6), with the default never applying on Hosted (D23: frozen, accounts off, no key). Add two strict test suites (FR-19 two-Student, FR-22 raw rows), extend `scripts/smoke.mjs` to log in as the seed user, add a Playwright account journey on the accounts-on default, name the seed user in README and `docs/qa/` (rows for Helene's walk-through, nothing marked passed), set `epic-6: done`.

## Boundaries & Constraints

**Always:** Tests that assumed accounts off are fixed only by setting the flag off explicitly (`FEATURE_ACCOUNTS=false` in the test or on the Playwright server) or by replacing the "off by default" expectation of a `FEATURE_DEFAULTS` test; no assertion is weakened or removed. The FR-19/FR-22 tests carry a positive control (the owner sees the data, the raw rows hold it as ciphertext) so that they fail on a leak. The smoke login uses only the made-up seed constants; CI, compose and the Dockerfile get no new secret.

**Never:** `FEATURE_ACCOUNTS` in `compose.yaml`, `.env.example` or README; a new package or migration; touching Hosted, `gaps-4`, cached fixtures or Answer keys; loosening encryption, session expiry, `studentId` rule or integrity checks; running setup/seed against the real `.data/` or database; writing in `.logs/`; marking a human check as passed.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default, local | no `FEATURE_ACCOUNTS` | accounts on | missing key stops startup (existing) |
| Default, Hosted | `APP_ENV=hosted`, no flag | accounts off | explicit `true` without key stops startup |
| Student B reads A | A's application id on every id route | 404 `NOT_FOUND`, same bytes as an unknown id, nothing of A's in the body | n/a |
| Student B writes A's id | phase-1/phase-2/profile requests | A's rows unchanged | `NOT_FOUND` / `saved: null` |
| Raw rows | one Student, Profile CV, saved Application with all sections | only ids, email, timestamps, ints, hashes and `v1.` ciphertext; password only as scrypt hash | any other value fails |
| Smoke | app started by CI | `/api/health` ok, login as seed user ok, 200 with `ja_sid` | exit 1 with the reason |

</intent-contract>

## Code Map

- `src/shared/server/config.ts` -- `FEATURE_DEFAULTS.accounts = true`; `parseConfig` resolves the default to off on Hosted.
- `test/fr19-privacy.test.ts` (new) -- two Students against every Student route and the Historikk page, on PGlite.
- `test/fr22-raw-rows.test.ts` (new) -- full flow in Test mode, then every table's raw rows against a shape allowlist and the secret strings; log events checked too.
- `scripts/smoke.mjs`, `scripts/smoke.test.ts` -- health plus login as the seed user.
- `playwright.config.ts` -- general servers set the flag off; the accounts servers run on the default.
- `e2e/account-journey.spec.ts` (new) -- register, Profil, Søknad with the Profile CV, saved application, Historikk, Konto, logout, login, with axe at 1280 and 360 px.
- `README.md`, `docs/qa/` -- seed user, UJ-1/UJ-2 rows with accounts ("ikke gått gjennom ennå (Helene)"), what CI covers.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- 6.12 and `epic-6` done.
- Read-only: `gate.ts`/`gateDecision` and the register route tests (Hosted code rule), `seed.ts`.

## Tasks & Acceptance

**Execution:**
- Config, tests and Playwright as in the Code Map; every matrix row has a test; existing tests changed are listed in the result.

**Acceptance Criteria:**
- Given the matrix, when `npm test`, `npm run typecheck` and `docker compose run --rm --build test` run (or `ci`), then all pass.
- Given a changed existing test, then the change only sets the flag off or replaces an "off by default" expectation.

## Spec Change Log

## Review Triage Log

### 2026-11-25 - Review pass
- verdicts: 20 findings (blind 15, edge 5, verification-gap 0; intent-alignment descriptive) - high 0, medium 4, low 14, false 2, maybe-false 0
- findings:
  - `[low]` `reject` Blind: 6.12 and epic-6 `done` while the manual rows are open - goal.md makes none of them a merge condition and orders the rows «ikke gått gjennom ennå (Helene)».
  - `[low]` `patch` Blind: the spec called the Hosted default «as gaps/rewording do» - not quite (they force off, accounts only defaults off); Design Notes now say so.
  - `[medium]` `patch` Blind: section 4 of the QA doc could read as results nobody had run (smoke on Postgres, Docker test) - it now says which rows are results of `ci` on this PR and which of the local `npm test`.
  - `[false]` `reject` Blind: `checkLogin` may run before the seed finished - `npm run serve` runs setup (with the seed) before `next start`, so health answers only after it.
  - `[low]` `reject` Blind: smoke against Hosted or accounts off fails - the smoke run is the CI step against the local `app` container, as its header says.
  - `[low]` `reject` Blind: seed credentials in four places, no drift test - `test/seed-user-agreement.test.ts` (6.11) ties README, seed and smoke together; the e2e specs are tests of the same constant.
  - `[low]` `reject` Blind: FR-19 «nothing of A's» could false-fail on B's own data - the fixtures are locked and the suite passes; word-boundary matching would let a leak of a short word through.
  - `[medium]` `patch` Blind, edge: FR-19 «no session» covered 7 of the Student routes - phase 1, Letter, Gaps, check, AI notice, session, renew and CV upload added.
  - `[low]` `patch` Blind: loop variable `page` shadowed the hoisted `page` holder, `BodyOfA` misnamed, pages 2 and 3 not checked for the expected total - renamed, and the total asserted on every page.
  - `[low]` `reject` Blind: FR-22 on PGlite only, unsalted 64-hex fingerprint passes the hash shape - known limit (6.7: the fingerprint is allowed by AC); the `ci` smoke covers the real Postgres path for the seed.
  - `[low]` `reject` Blind: e2e regex/`networkidle`/`dd` index fragility - the same patterns as the existing account specs.
  - `[false]` `reject` Blind: README claim that setup makes the key is unbacked - Story 6.1 (`prepareSecrets`) does it and `setup-secrets.test.ts` tests it.
  - `[low]` `reject` Blind: README says nothing about turning accounts off or old local data - the AC forbids the README from naming the flag; a local database from Epic 5 is migrated by setup and holds no accounts.
  - `[low]` `reject` Blind: `accounts-default.test.ts` is redundant and brittle - the Hosted case is the only overlap; the string scans are the AC's own rule.
  - `[low]` `reject` Blind: `vi.stubEnv` at module level - config is read lazily on each call; the suites pass.
  - `[medium]` `patch` Edge: `.dockerignore` has `.env*`, so `.env.example` is absent in the test image and `accounts-default.test.ts` would fail the Docker test with ENOENT - the read is guarded by `existsSync`.
  - `[low]` `reject` Edge: a stray `FEATURE_ACCOUNTS` in the shell would turn the accounts servers off - hypothetical, and the account specs would fail loudly.
  - `[low]` `reject` Edge: `SHARED_PLAIN` makes «any other value fails» untrue for `keyword_lists` - decided by the architecture; the table has its own test (columns, hash, ad words only, nothing of the Student). Written to issues as an open point.
  - `[medium]` `patch` Edge: FR-22 searched `JSON.stringify` text, so a leaked multi-line or quote-containing string would not match - strings are now searched as they are.
  - `[low]` `patch` Edge: smoke checked only that the CV had 200 characters - it now compares with the Example CV (as the seed saves it).
  - Verification-gap layer: no findings. Intent layer (descriptive): reading B (route-level proof, Test mode, PGlite) with the Hosted carve-out of reading C; the real-container smoke and the manual walk-through live in `ci` and the QA rows.

## Design Notes

The Hosted default stays off inside `parseConfig`, so a redeploy of this code never switches accounts on there by itself; goal.md allowed the plain flip, whose result would be a Hosted that stops at startup. Unlike gaps, rewording and the keyword fallback, which Hosted forces off whatever the environment says, only the *default* is off there: an explicit `FEATURE_ACCOUNTS=true` still turns accounts on and then needs the key (`assertEncryptionKey`).

`keyword_lists` is the one plain table, by the architecture decision («Plain-text columns»: FR-22's «keyword lists» means the `analysis` column). The FR-22 test checks it for what it is allowed to hold instead of skipping it.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: lint, types, unit and Playwright pass
- `docker compose run --rm --build test` -- expected: passes (or `ci` on the PR)

## Auto Run Result

Status: done

**Summary:** `FEATURE_DEFAULTS.accounts = true` (the default resolves to off on Hosted). Two strict suites (`test/fr19-privacy.test.ts`: two Students against every Student route and the Historikk page; `test/fr22-raw-rows.test.ts`: raw rows of every table against a shape allowlist and the Student's strings, with a positive control), `scripts/smoke.mjs` logs in as the seed user and reads the seeded CV back, `e2e/account-journey.spec.ts` (journey at 1280 px and 360 px with axe on every screen, plus the expiry warning), README and `docs/qa/accounts-manual-checks.md` (rows «ikke gått gjennom ennå (Helene)»), `epic-6` and 6.12 `done`.

**Files:** `src/shared/server/config.ts`; `playwright.config.ts`; `scripts/smoke.mjs`, `scripts/smoke.test.ts`; `test/{fr19-privacy,fr22-raw-rows,accounts-default}.test.ts`, `test/accounts-flow-kit.ts`; `e2e/account-journey.spec.ts`; `README.md`; `docs/qa/accounts-manual-checks.md`; `sprint-status.yaml`; 16 existing test files changed (see the pull request).

**Review:** 20 findings: 4 medium and 5 low patched, 11 rejected with reasons in the triage log, 0 deferred. Follow-up review recommended: true, because four medium patches were made (test-only: the FR-19 no-session coverage, the FR-22 string search, the `existsSync` guard that only the Docker test image exercises, the QA doc wording).

**Verification:** `npm test` (biome, tsc, 1871 vitest, 391 Playwright) passed. Mutation checks: dropping the student filter in the repository fails five FR-19 tests; storing the CV in plain text fails four FR-22 tests. The Docker test could not run locally (Docker Desktop engine not running, not started); `ci` on the pull request is its result.

**Residual risks:** the real-container smoke run and the Docker test are seen only in `ci`; FR-22 reads PGlite rows; `keyword_lists` stays plain by the architecture decision; the Hosted default differs from the plain flip goal.md allowed.
