---
title: 'Encrypt personal fields with one key'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_revision: 'cbbd91656ece8207080fcccf0de2eace504b98eb'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      wx create then write of the secrets file is not atomic; a concurrent starter can read it empty and append a second key line.
    evidence: |-
      Unverified. wx is mandated by the AC and one app container runs setup; a different key in the other process is caught by the local_meta hash check.
    location: >-
      scripts/setup.ts:ensureSecret
    severity: low (unverified)
---

<intent-contract>

## Intent

**Problem:** Epic 6 stores a Student's name, CV and letters, but nothing in the app encrypts a field yet, and a local database could be paired with the wrong key without anyone noticing.

**Approach:** Add `src/shared/server/crypto.ts` (AES-256-GCM, `encryptedText` and `encryptedJson` Drizzle column types), a one-row `local_meta` table holding `sha256(ENCRYPTION_KEY)`, `SECRETS_FILE` handling in config and setup, and the key rules in config. No personal table is created here (6.2 does that); `FEATURE_ACCOUNTS` stays off.

## Boundaries & Constraints

**Always:** `node:crypto` only, no new package. Stored form `v1.<iv>.<tag>.<ciphertext>` (base64url, 12-byte iv, 16-byte tag). `encryptedJson` keeps `{ contractVersion, data }` only inside the ciphertext. `crypto.ts` never imports config; `db.ts` calls `initCrypto(config.encryptionKey)` when it first opens. `encryptedText`/`encryptedJson` throw if used before `initCrypto`. Config is the only reader of `SECRETS_FILE` and never invents a key. Setup writes secrets only behind `isLocalTarget`. Errors name the setting, never a key, hash or ciphertext. Test keys are made-up constants.

**Never:** Set `accounts` to `true` in `FEATURE_DEFAULTS`; add `FEATURE_ACCOUNTS`/`ENCRYPTION_KEY` values to `compose.yaml`, `.env.example` or README; create a table with personal data; change an existing test; run setup or the local app against the real `.data/`, `.env` or a real `SECRETS_FILE`; read or print `.env`/secrets; touch Hosted; run `git checkout --`, `git reset --hard`, `git clean`, `git stash`, `git add -A` or `git add .`; commit, push or write in `.logs/` (the parent does that). Leave the untracked `docs/qa/rewording-live-runs/` and the edited `docs/qa/rewording-manual-checks.md`, if present, alone. Run only `npm run typecheck`, the vitest files you wrote, `npx biome check`, `npm run db:generate` and `npm run db:check`; the parent runs the full `npm test` and Docker.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Round trip | text or `{contractVersion, data}` | decrypts to the same value; stored form `v1.iv.tag.ct`; a new iv each time | n/a |
| Tampered or wrong key | any part of the stored string changed, or another key | `decryptText` throws `DecryptError`; an `encryptedJson` column reads as `{ available: false }` and the rest of the query still returns | Query does not fail |
| Unparseable section | decrypts but is not `{contractVersion, data}`, or the repository parser throws | `available: false`, reason `parse` | n/a |
| Before `initCrypto` | column type used | throws "crypto is not initialised" | n/a |
| Secrets file, local, not test run | `SECRETS_FILE` (default `.data/secrets.env`) | merged under `process.env`; `process.env` wins | missing file is fine |
| Test run or Hosted | `SECRETS_FILE` set | ignored | n/a |
| Setup, key missing | local target, no key in env or file | file created with `wx`, `ENCRYPTION_KEY=` 32 random bytes base64; on `EEXIST` re-read, never overwrite | file with other vars but no key: key appended |
| First start | `local_meta` empty | `sha256(key)` hex stored | n/a |
| Later start, other key | stored hash differs | setup stops: "the key doesn't match this database: run `docker compose down -v` and delete `.data/`" | hash not printed |
| Accounts on, no key | local | config throws: run setup | names the setting |
| Accounts on, no key | `APP_ENV=hosted` | startup fails | names the setting |
| Key present but not 32 bytes base64 | any env | config throws naming `ENCRYPTION_KEY` | value not printed |

</intent-contract>

## Code Map

- `src/shared/server/config.ts` -- add `encryptionKey` to `Config`, `ENCRYPTION_KEY`/`SECRETS_FILE` to the zod schema, `readEnv()` (merge secrets file), accounts key rules, `options.keyOptional` for setup; `assertStartupConfig` default env becomes `readEnv()`; `memo` getter unchanged.
- `src/shared/server/db.ts` -- `openDb` calls `initCrypto` when a key is configured, before migrating.
- `src/shared/server/schema.ts` (new) -- `local_meta` table; `drizzle.config.ts` -- add this file to `schema`.
- `drizzle/0002_*.sql` + `meta/` -- generated with `npm run db:generate`.
- `scripts/setup.ts` -- secrets step before `getConfig()`, `LocalStep` gets `(db, config)`, new key-check local step in `LOCAL_STEPS`.
- `scripts/setup.test.ts`, `src/shared/server/config.test.ts`, `src/shared/server/db.test.ts` -- read-only: must stay green unchanged (they parse config with explicit env objects).
- `vitest.config.ts` -- has the constant test `ENCRYPTION_KEY` already.

## Tasks & Acceptance

**Execution:**
- `src/shared/server/crypto.ts` -- create `initCrypto`, `encryptText`/`decryptText`, `encryptedText`, `encryptedJson`, `openSection`, `DecryptError` -- AD-11
- `src/shared/server/schema.ts`, `drizzle.config.ts`, `drizzle/` -- `local_meta` (`id` smallint pk default 1 check `id = 1`, `key_hash` text, `created_at`) and migration -- AD-11 local key check
- `src/shared/server/config.ts` -- as in Code Map
- `src/shared/server/db.ts` -- as in Code Map
- `scripts/setup.ts` -- `ensureSecret` (flag `wx`), `checkKeyStep`, wire both -- AD-17
- `src/shared/server/crypto.test.ts`, `src/shared/server/config-secrets.test.ts`, `scripts/setup-secrets.test.ts` -- new tests for the matrix and the db round trip on PGlite (temp dirs for every file path)

**Acceptance Criteria:**
- Given the matrix above, when `npm test` and `npm run typecheck` run, then everything passes with no existing test edited.
- Given `FEATURE_ACCOUNTS` off, when the app runs, then it behaves as after Epic 5.
- Given a raw `select` on a table that uses the column types, then no plaintext is stored.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: layers reported 12 (blind) + 14 (edge) + 5 (verification gap, incl. 2 other) + 1 descriptive intent report, graded in grouped rows below — high 0, medium 5, low 3, false 6, rejected as design or negligible: the rest
- findings:
  - `[medium]` `patch` getDb to initCrypto wiring has no test (gap 1) — new db-crypto test: clear holder, reopen, round trip; no key leaves crypto uninitialised.
  - `[medium]` `patch` getConfig()/assertStartupConfig default path with a secrets file untested (gap 2) — new test through the default env path with a temp SECRETS_FILE.
  - `[medium]` `patch` setup main() order (prepareSecrets before getConfig) untested (gap 3) — spawned setup with temp SECRETS_FILE, no key in env; asserts file written and ECONNREFUSED, not "key missing".
  - `[medium]` `patch` assertStartupConfig default `readEnv()` evaluated outside the try/catch (gap other): an unreadable file escapes the stderr + exit path — moved inside the try.
  - `[medium]` `patch` ensureSecret in a test run appends a key line on every run because readEnv ignores the file there (edge 1) — prepareSecrets writes nothing in a test run.
  - `[low]` `patch` encryptedJson.toDriver accepts NaN/non-integer contractVersion or undefined data that read back unavailable (edge 4) — rejected at write with a generic error.
  - `[low]` `defer` wx create then write is not atomic: a concurrent EEXIST reader can see an empty file and append a second key line (blind 1, edge 2) — wx is mandated by the AC and only one `app` container runs setup; a different key in the other process is caught by the local_meta hash check. Unverified.
  - `[low]` `reject` ciphertext not bound to row/column via AAD (blind 7) — not in the AC; a known limit for the Epic 6 retro.
  - `[false]` `reject` BigInt/circular data error leaks value details (edge 5) — the JSON.stringify TypeError names no value.
  - `[false]` `reject` parseEnv/getBuiltinModule missing on old Node (blind 2, edge 7) — package.json engines pins node 26.x and the Dockerfile uses node 26.13.1.
  - `[false]` `reject` secrets file can flip APP_ENV/hosted (edge 6) — the local decision is made on the raw env; the file is machine-written by setup and process.env wins.
  - `[false]` `reject` stale key in holder when encryptionKey is undefined (edge 9) — only reachable in tests.
  - `[false]` `reject` checkKeyStep passes with no key (edge 10) — on a local target setup has written the key first, so it is never undefined there.
  - `[false]` `reject` setup reads the file on EEXIST although config is the only reader (edge 11) — it only reads to decide a separator; config still parses.
  - `[low]` `reject` duplicated key-format check and isSet/hasValue helper, test constants (blind 3, 4) — no named caller that will diverge.
  - `[low]` `reject` no key backup guidance, mismatch message offers only the destructive fix, no key id/rotation, no Hosted key-vs-db check, key in Config object, encryptedText fails the whole query, migration name, .env.example/.gitignore wiring (blind 5, 6, 8, 9, 10, 11, 12) — message text is fixed by the AC; the names are already in .env.example and `.data/` in .gitignore/.dockerignore; the rest is outside the AC (AD-11 puts the key check on local only; encryptedText is loud by design).
  - `[low]` `reject` "run setup" message on non-local targets (edge 3), "every local target" reading (edge 12), key-format check unconditional (edge 14) — wording only; a malformed key should fail everywhere.
  - Intent layer (descriptive): divergences (check in setup not db.ts, only encryptedJson degrades, append to an existing file, unset APP_ENV counts as local, function-level tests) match the choices recorded in Design Notes; process-level tests were added through the patches above.

## Design Notes

Choices (simplest reading): `encryptedText` throws on a bad value (names, CV text fail loudly); only `encryptedJson` degrades to `{ available: false, reason }`, because AC speaks of a "section". The key is base64 of exactly 32 bytes, canonical form. `ENCRYPTION_KEY` from `process.env` wins over the file; setup writes nothing when either has it. Setup creates the key on every local target, whatever the accounts flag says.

Verification finding (not a review layer): two existing tests (`config.test.ts`, `access/route.test.ts`) call `parseConfig` with accounts on and no key, and may not change. So the missing-key rule lives in `assertEncryptionKey(config)`, called by `assertStartupConfig` (the startup hook, Hosted fails) and by setup `main` after the secrets step (local stops and says to run setup); `parseConfig` only validates a key that is present, and it has no `keyOptional` option any more.

## Verification

**Commands:**
- `npm test` -- expected: biome, typegen, tsc, vitest, playwright all pass
- `npm run db:check` -- expected: migrations apply from zero
- `docker compose run --rm --build test` -- expected: green (done criterion, touches `drizzle/` and `scripts/setup.ts`)

## Auto Run Result

Status: done

**Summary:** AES-256-GCM `encryptedText`/`encryptedJson` Drizzle column types in `src/shared/server/crypto.ts`, the one-row `local_meta` table with migration `0002`, `SECRETS_FILE` handling in config and setup (`wx`, merge under `process.env`, ignored in test runs and on Hosted), local key creation and the `sha256(key)` check in setup, and `assertEncryptionKey` at startup. No personal table. `FEATURE_ACCOUNTS` stays off.

**Files:** `src/shared/server/crypto.ts` (new, crypto and column types), `src/shared/server/schema.ts` (new, `local_meta`), `drizzle/0002_misty_paper_doll.sql` + meta, `drizzle.config.ts`, `src/shared/server/config.ts` (key, `readEnv`, `assertEncryptionKey`), `src/shared/server/db.ts` (`initCrypto` on open), `scripts/setup.ts` (secrets step, key check), six new test files, `epic-6-context.md`, `sprint-status.yaml`.

**Review:** 6 patches applied (5 medium, 1 low), 1 deferred (above), the rest rejected with reasons in the Review Triage Log. Follow-up review not recommended: no high patched, five mediums were test gaps and an error path.

**Verification:** `npm test` (biome, typegen, tsc, vitest 1453 passed, Playwright 243 passed) and `docker compose run --rm --build test` (vitest 1452 passed, 1 pre-existing skip, Playwright 243 passed) both green. A first `npm test` run failed two existing tests because `parseConfig` threw on accounts on without a key; the rule moved to `assertEncryptionKey` (see Design Notes).

**Residual risks:** ciphertext is not bound to its row or column (no AAD), not asked for by the AC. `scripts/setup.test.ts` relies on vitest's `ENCRYPTION_KEY` so its spawned setup writes no secrets file.
