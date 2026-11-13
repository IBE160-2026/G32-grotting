---
review: adversarial
lens: 'Two units one level down that each obey every AD to the letter yet build incompatibly'
scope: 'Docker change of 2026-11-13: AD-17 and its interaction with AD-2, AD-3, AD-4, AD-9, AD-11, AD-12, AD-15, the Config/setup and Tests convention rows, and the environments table'
target: ../ARCHITECTURE-SPINE.md
context: ../../../prds/prd-JobAssistant-2026-10-31/prd.md (NFR-9, NFR-7, FR-27, FR-29, UJ-3)
date: 2026-11-13
counts: { critical: 4, high: 12, medium: 11, low: 9 }
---

# Adversarial review: the Docker change (AD-17), 2026-11-13

**Verdict:** AD-17 fixes the runtime shape well: three services, one Dockerfile, README commands, and CI running the README. But it leaves the hand-offs between setup, config and the tests without an owner. As written, nothing loads the secrets file into config. The developer loop and the container can each hold a different key for the same database. On this Windows machine (`core.autocrlf=true`, checked), a checkout fails the one test command while CI on Linux stays green. And the container's first start can't write its own secrets. Close the 4 critical and 12 high findings before the S1 story is written. Most fixes are one line in AD-3, AD-4, AD-9 or AD-17.

**Units** (built by one developer, weeks apart):
- **S1:** scaffold, `Dockerfile`, `compose.yaml`, config, Hosted skeleton.
- **S2/S3:** tests, Fixtures, Test mode.
- **S6:** setup, seed, crypto, accounts.
- **CI:** the CI story.
- **README:** the README story.

**Finding format:**
- **A** does X, and **B** does Y. Both obey the cited ADs.
- **Breaks** says what goes wrong.
- **Fix** gives the AD change.

**Facts checked in the repo today:**
- `git config core.autocrlf` is `true`, set system-wide by Git for Windows.
- `.gitignore` does not ignore `.data/`: `git check-ignore .data/secrets.env` matches nothing.
- `.gitignore` does ignore `next-env.d.ts`.
- There is no `.gitattributes` yet.

---

## Critical

### C1. Nothing loads `SECRETS_FILE` into config, so `ENCRYPTION_KEY` never reaches the app
- **A (S1 config):** follows AD-4. `config.ts` parses `process.env` once with zod and is the only reader of the environment. `SECRETS_FILE` is just one more string in the schema.
- **B (S6 setup):** follows AD-3 and AD-17. `scripts/setup.ts` writes `ENCRYPTION_KEY=…` to `/data/secrets.env`, migrates, seeds, and then `next start` runs.
- **Breaks:**
  - The key is in a file that nobody reads. `next start` has no `ENCRYPTION_KEY` in `process.env`, because Next.js only auto-loads `.env*` from the project root, never a custom path.
  - AD-3 says "locally, a missing setting falls back and is never fatal". So A's fallback either crashes on the first encrypted write, or mints a random key in memory. A key minted in memory makes every row unreadable after the next restart, and AD-11 hides that as "section unavailable".
  - The order is also broken. Setup needs the key to seed the encrypted Profile (FR-29). If setup imports anything that calls `config` before it writes the file, config is frozen without the key.
  - The obvious workaround, `node --env-file=$SECRETS_FILE` in an npm script, expands differently in cmd.exe and sh, which breaks the developer loop on Windows.
- **Fix (AD-4, AD-3, AD-17):**
  - `config.ts` is a lazy, memoised getter. When `APP_ENV=local` and not `isTestRun`, it merges `SECRETS_FILE` (dotenv format) under `process.env`, and `process.env` wins. Nothing else reads the file.
  - Setup writes the secrets in its first step, before anything calls `config`.
  - Config never invents a key. Locally, with accounts on and no key, it fails with "run setup", which is the one exception to AD-3's never-fatal rule.

### C2. Two key files serve one database volume, so rows can't be decrypted
- **A (AD-17 `app` service):** setup generates key K1 into `/data/secrets.env` in the `appdata` volume, and seeds the test user. The Profile is encrypted with K1 and stored in `pgdata`.
- **B (AD-17 developer loop):** `docker compose up db` starts the same `pgdata` volume, because it's the same Compose project. `npm run dev` on the host uses `SECRETS_FILE=.data/secrets.env`. Whoever creates that file (setup on the host, or a fallback) generates key K2.
- **Breaks:**
  - The test user already exists, so the idempotent seed skips it. Login still works, because scrypt doesn't depend on the key, but every encrypted section from container runs reads as "unavailable" under K2.
  - The same happens in reverse after `docker compose down -v`. The command removes `pgdata` and `appdata`, but `.data/secrets.env` on the host survives.
  - The developer loop as written also never runs setup, so a migration added on a story branch is never applied to `pgdata`.
- **Fix (AD-11, AD-17):**
  - On first seed, setup stores `sha256(ENCRYPTION_KEY)` in a one-row `local_meta` table. On every later start it stops with "key does not match this database: run `docker compose down -v` and delete `.data/`" when the hash differs.
  - The developer loop runs setup first (`predev`: `tsx --conditions=react-server scripts/setup.ts`).

### C3. A Windows checkout gives CRLF sources in the test image, so Biome fails the one test command
- **A (S1 conventions):** `.gitattributes` has only `data/** text eol=lf`, as the Ids, hashes, text row says. Biome's formatter defaults to `lineEnding: "lf"`.
- **B (AD-17 `test`):** the Dockerfile copies the working tree into the image, and `npm test` runs Biome first.
- **Breaks:**
  - With `core.autocrlf=true`, the default from Git for Windows and set on this machine, every `.ts`, `.tsx`, `.json` and `.css` file outside `data/` is checked out with CRLF.
  - Inside the container, `biome check` reports a format error on every file, so `docker compose run --rm test` is red on the developer's machine and on a Windows examiner's machine (NFR-9: "they all pass").
  - CI checks out on Linux with LF, so it stays green. The one place that would catch this never sees it.
- **Fix (conventions, S1):** `.gitattributes` is `* text=auto eol=lf` plus `*.pdf binary`, and it is committed before the first source commit. Existing clones run `git add --renormalize .` once.

### C4. The `appdata` volume belongs to root and the app runs as `node`, so first start can't write secrets
- **A (AD-17 Dockerfile):** follows the `app` stage rule "runs as the `node` user" (`USER node`).
- **B (AD-17 compose):** mounts the named volume `appdata` at `/data` and sets `SECRETS_FILE=/data/secrets.env`.
- **Breaks:**
  - `/data` doesn't exist in the image, so Docker creates the mount point owned by root.
  - Setup fails with `EACCES` on its first write, the container exits, and `docker compose up --build` never serves the app. NFR-9 fails on the very first run.
- **Fix (AD-17 Dockerfile):** the `app` stage runs `RUN mkdir -p /data && chown node:node /data` before `USER node`. An empty named volume takes the owner of the image directory on its first mount.

---

## High

### H1. `docker compose up --build` also builds and runs the `test` service
- **A (AD-17 compose):** three services, and `test` has no profile.
- **B (README):** the NFR-9 run is `docker compose up --build`.
- **Breaks:**
  - `up` starts every service that has no profile. The Examiner's 15-minute run therefore also builds the Playwright stage (Chromium plus its apt dependencies) and runs the whole suite next to the app.
  - The test output is mixed into the app's logs, and any test failure shows as red in the run being graded.
- **Fix (AD-17):** `test` gets `profiles: ["test"]`. `docker compose run --rm test` still works, because `run` turns the profile on.

### H2. The tests' PGlite database is never migrated or seeded
- **A (S1/S6 setup):** migrates and seeds, but only in the `app` container (AD-9: "setup applies the migrations every time the `app` container starts").
- **B (S2/S3 tests):** Vitest and the Playwright web server use `DATABASE_URL=pglite://memory`, one empty instance per process (AD-9). The UJ-3 end-to-end test logs in as the test user.
- **Breaks:** no tables and no test user, so every DB route in an end-to-end test fails. Each test story invents its own fix: a global setup, migrations in the test file, or a seed in Playwright. The result is three seed paths, and they drift from FR-29.
- **Fix (AD-9):**
  - When `config.db = pglite`, `shared/server/db.ts` applies the migrations on first open.
  - Under `E2E=1` it also calls the same seed function that setup uses (`seedTestUser`, owned by `identity` and `profile`).
  - Vitest gets a freshly migrated instance from one setup file.

### H3. Vitest has no fixed environment, so it falls back to the local Postgres, a live key, or the developer's key
- **A (conventions, Tests row):** only Playwright gets a fixed `webServer.env`.
- **B (AD-3 local fallbacks, AD-17 developer loop):** with no `DATABASE_URL`, config defaults to `localhost:5432`. `SECRETS_FILE` defaults to `.data/secrets.env`. An AI key in the environment turns Test mode off.
- **Breaks:**
  - In the `test` container, a Vitest test that opens the DB tries `localhost:5432` and gets `ECONNREFUSED`.
  - On the host with `db` running, the same test writes into the developer's database.
  - With a key in the shell, or in `.env` when a tool loads it, the default `testMode` turns `false` and the AI factory throws under `isTestRun`. Tests then pass or fail depending on the machine.
  - The environments table says tests have no secrets, yet FR-22 tests need an `ENCRYPTION_KEY`. They read the developer's `.data` key on the host and have none in the container.
- **Fix (conventions, AD-3):**
  - `vitest.config.ts` `test.env` fixes `APP_ENV=local`, `DATABASE_URL=pglite://memory` and a constant test `ENCRYPTION_KEY`.
  - Under `isTestRun`, config ignores `SECRETS_FILE`, treats the AI key as absent, and throws if `config.db` is `postgres`.

### H4. Playwright reuses whatever is already on port 3000: the dev server or the `app` container
- **A (S2 tests):** the Playwright `webServer` uses port 3000 with the scaffold-style `reuseExistingServer: !process.env.CI`.
- **B (AD-17):** `app` is published on `127.0.0.1:3000`, and `npm run dev` also uses port 3000.
- **Breaks:**
  - On the host, the end-to-end tests run against the dev server. That server has no `E2E=1`, so `isTestRun` is false. It has the real Postgres, and the live key from `.env`.
  - Tests can then make paid AI requests (NFR-8: "tests make no paid AI requests") and write into the dev database. AD-3's guard never fires, because it lives in a server that Playwright didn't start.
- **Fix (conventions):** the Playwright `webServer` uses `next start -p 3100` with `reuseExistingServer: false`. Port 3100 is taken by no compose service, and `baseURL` comes from the same constant.

### H5. `.data/` is not git-ignored, so the developer-loop `ENCRYPTION_KEY` gets committed
- **A (AD-17 developer loop):** `SECRETS_FILE` defaults to `.data/secrets.env`. Only `.dockerignore` lists `.data`.
- **B (conventions, Config and setup row):** "`.env` is optional and git-ignored". The current `.gitignore` covers `.env` and `.env.*`, which don't match `secrets.env` (checked).
- **Breaks:** `git add .` commits the key. NFR-7 requires that "the repository and its history contain no secrets", so removing it means rewriting history before delivery. If config merged `SECRETS_FILE` in every mode, a committed file would also reach the Vercel build.
- **Fix (conventions, S1):** `.gitignore` gets `.data/` in the same commit that introduces `SECRETS_FILE`. CI fails when `git ls-files .data .env` prints anything. `SECRETS_FILE` is read only when `APP_ENV=local` (see C1).

### H6. Nobody owns turning a feature flag on for the local run
- **A (AD-4):** "a flag defaults to off until its epic is done". It is read from `FEATURE_*` in the environment.
- **B (AD-17 compose):** `app` sets only `APP_ENV`, `DATABASE_URL` and `SECRETS_FILE`. The optional `.env` is meant for a live AI key.
- **Breaks:**
  - The S6 developer puts `FEATURE_ACCOUNTS=true` in her own `.env`, or in Vercel, and everything works for her.
  - The Examiner's clean clone has no `.env`, so accounts are off. There's no «Logg inn» and no README test user (FR-29, UJ-3 step 2).
  - If another developer instead edits `compose.yaml`, the local and Hosted defaults drift apart.
- **Fix (AD-4):**
  - Flag defaults live only in `config.ts` (`FEATURE_DEFAULTS`), and the last story of each epic flips its default to on.
  - `compose.yaml`, `.env.example` and the README never set `FEATURE_*`. The environment only overrides a default, on Vercel and for a cut.
  - The NFR-9 dry run uses no `.env`.

### H7. Docker copies the whole repository, so Vercel's file tracing is never tested and the `data/` files go missing on Hosted
- **A (AD-17):** no standalone output, and the image keeps the full source tree. Reading `path.join(process.cwd(), 'data/vocabulary/…')` at runtime always works in Docker.
- **B (AD-5, AD-2, AD-15):**
  - The shell loads the vocabulary JSON at runtime.
  - Pages pass the Example pair as props, read from `data/fixtures/…` on each request, because the root layout's `connection()` makes every page dynamic.
- **Breaks:**
  - On Vercel, a function contains only the files Next's tracer finds. Dynamic `fs` reads of `data/` aren't traced, so the score route and «Bruk eksempelet» fail with `ENOENT` on Hosted only.
  - Local runs, tests and CI (`docker compose build app`) all pass.
- **Fix (AD-5, AD-15):**
  - All runtime reads of `data/` go through one `shared/server/data-files.ts`.
  - `next.config.ts` sets `outputFileTracingIncludes` for `./data/vocabulary/**` and the Example pair's folder. `_planted/` is never traced.
  - Alternatively, import the JSON statically so the bundler includes it.

### H8. CI never starts the `app` container, so setup, real-Postgres migrations and the seed go untested
- **A (AD-17 CI):** runs `run --rm test` (PGlite), `db:check`, and `build app`. It only builds the app.
- **B (AD-9):** the only migration test is from zero on PGlite. Setup runs only when `app` starts.
- **Breaks:** the exact NFR-9 path is never run before delivery: generate secrets, migrate Postgres 17 over postgres-js, seed, then `next start`. That covers the permissions bug (C4), the key check (C2), driver differences (H9) and a broken seed. All of them stay green in CI, and the first time they run is the manual dry run.
- **Fix (AD-17 CI):** CI adds:
  - `docker compose up -d --build --wait app`, which needs an `app` healthcheck (L2);
  - `docker compose exec app node scripts/smoke.mjs`: `/api/health`, then a login as the seeded user once S6 lands;
  - `docker compose down -v`.

### H9. The run uses postgres-js and the tests use PGlite, and the drivers return different shapes
- **A (S1/S6 server code, run in Docker):** follows AD-9 locally and on Hosted through postgres-js. It writes `const [row] = await db.execute(sql…)` and `count(*)` for the History `total`.
- **B (S2 tests):** follows AD-9 with PGlite. There, `db.execute` returns `{ rows }`, and `int8`/`count(*)` comes back as a number instead of postgres-js's string.
- **Breaks:**
  - The AD-13 cap's `UPDATE … RETURNING count`, the AD-8 `max(seq) + 1`, and the History `total` behave differently in the tests and in the run.
  - Before today, the daily local run used the test driver (PGlite). Now no developer environment runs both drivers, so a mismatch shows up only in production or in the dry run.
- **Fix (AD-9):**
  - Database code uses Drizzle's query builder with `.returning()`.
  - Raw `sql` runs only through `db.ts` helpers that normalise the result.
  - Every aggregate is cast (`count(*)::int`) or uses `.mapWith(Number)`.
  - H8's smoke run covers postgres-js.

### H10. Publishing `db` on `127.0.0.1:5432` collides with a Postgres already on the Examiner's machine
- **A (AD-17 `db`):** "published only on `127.0.0.1:5432`". It is published only for the developer loop, because `app` reaches `db` over the Compose network.
- **B (AD-17 developer loop):** config defaults `DATABASE_URL` to `localhost:5432`.
- **Breaks:**
  - A student or examiner with a local Postgres on 5432 (common after a database course) gets "port is already allocated", so `db` never starts and NFR-9 fails. The run didn't even need that port.
  - On the host, `localhost` can resolve to `::1` first, while the publish is IPv4 only.
  - The fixed credentials now live in two places, `compose.yaml` and the default in `config.ts`.
- **Fix (AD-17):**
  - `db` publishes `127.0.0.1:54320:5432`.
  - The local default is `postgres://jobassistant:jobassistant@127.0.0.1:54320/jobassistant`, defined once in `config.ts`.
  - `app` never depends on a host port.

### H11. A production `DATABASE_URL` in a local env file makes setup seed the README test user into Supabase
- **A (AD-12):** setup seeds the test user "only when `APP_ENV` is not `hosted`".
- **B (S1 Hosted skeleton, developer loop):** the developer keeps the Supabase URL in `.env` or `.env.local` (for example from `vercel env pull`) to run a migration by hand. Next.js loads that file for `npm run dev`. `APP_ENV` is unset locally, so it counts as local.
- **Breaks:** setup, now run by `predev` (C2), seeds the fictional account with a password published in the README into the Hosted database. FR-29 says the credentials "work only in the local run", and FR-31 assumes the Hosted version is closed. Setup would also write a local key, but against the production database.
- **Fix (AD-12, AD-17):**
  - Setup writes secrets and seeds only when `APP_ENV=local` and the `DATABASE_URL` host is `db`, `127.0.0.1` or `localhost`. Otherwise it only migrates.
  - `.env.example` says that `.env` holds only `AI_*` and `TEST_MODE`.

### H12. Whether the app is hosted is self-declared, so a missing `APP_ENV` on Vercel gives an ungated app
- **A (AD-3):** the Hosted fail-fast checks run only when `APP_ENV=hosted`. Anything else is local, and local is never fatal.
- **B (AD-12):** the Access-code gate and the `Secure` flag on `ja_sid` apply only when hosted.
- **Breaks:** if `APP_ENV` is forgotten or mistyped in Vercel's Production scope, the deploy starts as "local". It has no gate, no fail-fast, and Test mode or the live key depending on the AI variables. FR-31 is broken silently.
- **Fix (AD-3):**
  - Config treats `VERCEL=1` without `APP_ENV=hosted` as a startup error. Vercel sets `VERCEL` itself.
  - `/api/health` returns `{ hosted }`, so the keep-alive log shows the mode.

---

## Medium

### M1. `docker compose run --rm test` reuses a stale image after code changes
- **A (AD-17):** the `test` stage copies the source into the image.
- **B (README, the developer weeks later):** edits code and runs `docker compose run --rm test`.
- **Breaks:**
  - `run` builds only when the image is missing, so the old code is tested and passes.
  - The tempting fix is to bind-mount `.` into `test`. That shadows the image's `node_modules` with the host's Windows native binaries (Biome, SWC, lightningcss, Tailwind oxide), and the container crashes.
- **Fix (AD-17):** the README and CI use `docker compose run --rm --build test`. The `test` service never bind-mounts the source.

### M2. `next start` needs a build, and no AD says which stage builds it or with which environment
- **A (AD-17):** the `build` stage runs `next build` with no environment. `test` is "adds Playwright", but it doesn't say on top of which stage.
- **B (S2 Playwright):** `webServer` runs `next start` with the fixed test environment.
- **Breaks:**
  - If `test` is built `FROM build`, the end-to-end tests serve a build made without the test environment.
  - If `test` is built `FROM deps`, `next start` finds no build.
  - On the host, `.next` from `next dev` is not a production build, so the tests fail or serve stale output, depending on the machine.
- **Fix (AD-17, conventions):** `test` is `FROM deps` plus the source. Playwright's `webServer.command` is `next build && next start -p 3100`, under the fixed `webServer.env`.

### M3. Three ways to apply migrations, and `drizzle.config.ts` reads `process.env`
- **A (S1 setup):** applies the migrations locally.
- **B (S1 Hosted):** the Vercel build runs `db:migrate`. CI runs a from-zero migration on PGlite. A natural choice for both is `drizzle-kit migrate`, whose `drizzle.config.ts` reads `process.env.DATABASE_URL`.
- **Breaks:**
  - `drizzle.config.ts` breaks AD-4, because it can't import the server-only `config.ts`.
  - It doesn't have config's local default URL either, so on the host it fails where the app works.
  - PGlite needs a different migrator. Each story ends up with its own entry point.
- **Fix (AD-9):**
  - `scripts/migrate.ts` is the only way migrations are applied. It uses Drizzle's migrator and picks the postgres-js or PGlite driver from `config.db`.
  - Setup calls it, the Vercel build calls it as `db:migrate`, and CI runs it from zero.
  - `drizzle.config.ts` has no `dbCredentials` and serves only `generate` and `check`.

### M4. Setup runs concurrently and its idempotency is check-then-write
- **A (AD-17):** setup runs on every `app` start.
- **B (C2 fix, developer loop):** setup also runs on the host through `predev`, against the same `pgdata`.
- **Breaks:**
  - Container setup and host setup can run at the same moment, and so can a restart loop that overlaps the next attempt.
  - Two migrators race to create `__drizzle_migrations`.
  - The seed's "exists?" check and its insert race, and the loser crashes on the unique email.
  - Two writers of the secrets file can both find it missing and write different keys.
- **Fix (AD-17):**
  - Setup wraps migrate and seed in `pg_advisory_lock(<constant>)`.
  - The seed uses `INSERT … ON CONFLICT (email) DO NOTHING` in one transaction.
  - The secrets file is created with flag `wx`, and setup reads it again after `EEXIST`.

### M5. `crypto.ts` must get its key from config, but config is server-only
- **A (AD-1):** `shared/server/crypto.ts` is exempt from `server-only` because drizzle-kit loads it. It reads its key lazily.
- **B (AD-4):** only `config.ts` reads the environment, and `config.ts` starts with `import 'server-only'`.
- **Breaks:** if `crypto.ts` imports `config`, drizzle-kit crashes at load. If it reads `process.env.ENCRYPTION_KEY` directly, it breaks AD-4 and misses the `SECRETS_FILE` merge (C1). Locally it then has no key while config does.
- **Fix (AD-1, AD-11):** `crypto.ts` never imports config. `db.ts` calls `initCrypto(config.encryptionKey)` on first open, and `encryptedText` throws if it is used before that.

### M6. The `postgres://` scheme check rejects Supabase's `postgresql://` URL, and TLS has no rule
- **A (AD-3):** "`postgres://` gives `postgres`". The obvious zod check is `startsWith('postgres://')`.
- **B (S1 Hosted):** the developer pastes Supabase's connection string, which starts with `postgresql://`. Supabase expects TLS, and the local `db` container has none.
- **Breaks:** Hosted fails at startup, or the check gets loosened ad hoc. If `ssl: 'require'` is tied to `postgres`, the local container breaks. If it is tied to `APP_ENV`, it duplicates config logic.
- **Fix (AD-3, AD-9):** `config.db` accepts both `postgres://` and `postgresql://`. TLS comes only from the URL (`?sslmode=require` on the Supabase URL).

### M7. Ownership inside the image: `.next/cache` and Playwright's browser folder
- **A (AD-17 `app`):** runs as `node`. Files copied without `--chown` belong to root.
- **B (AD-17 `test`):** `playwright install --with-deps chromium` runs as root and installs into `/root/.cache`. A developer who copies the `app` stage pattern adds `USER node`.
- **Breaks:** `next start` can't write `.next/cache`, which gives errors at runtime. The tests can't find Chromium when they run as `node`.
- **Fix (AD-17 Dockerfile):** use `COPY --chown=node:node` in `app`. `test` sets `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` before the install and runs as the user that installed it.

### M8. No test can reach the Access-code gate (FR-31)
- **A (conventions, Tests row):** `webServer.env` fixes `APP_ENV=local`. AD-3 makes `TEST_MODE=true` with `APP_ENV=hosted` a startup error.
- **B (S1 Hosted skeleton):** `proxy.ts` gates only when hosted and accounts are off (AD-12).
- **Breaks:** an end-to-end test of FR-31 can't start a hosted server under the fixed environment. Each story then either skips the test or starts an improvised second server with a hosted environment.
- **Fix (AD-12):** the gate decision is a pure `gateDecision({ hosted, accountsOn, path, cookieValid })` in `identity/core`, unit-tested in Vitest. `proxy.ts` only wires it up.

### M9. Values decided at build time differ between the image and Vercel
- **A (AD-17):** the image's `build` stage runs `next build` with no environment, and it is built once.
- **B (AD-6):** "sets `maxDuration = 120` only when `features.keywordFallback` is on".
- **Breaks:**
  - Route segment config must be a static literal. A config-dependent value is either ignored or evaluated at build time.
  - The same goes for any config read at the top level of a module, or in `next.config.ts`. Those values are baked in "off" in the image and taken from the real environment on Vercel.
  - The image and Hosted then behave differently, against AD-4 ("run state baked in at `next build`").
- **Fix (AD-4, AD-6):**
  - Route files read config only inside handlers, and `next.config.ts` reads no environment.
  - `maxDuration = 120` is a literal on every AI route and on `POST /api/analyses`. It is harmless when unused.

### M10. `tsc --noEmit` in the test container has no Next type files
- **A (conventions):** `npm test` runs Biome, then `tsc --noEmit`, then Vitest, then Playwright.
- **B (S1 scaffold):** `next-env.d.ts` is git-ignored (checked) and excluded from the image, along with `.next`. It exists on the host only after `next dev` or `next build`.
- **Breaks:** `tsc` passes on the host but fails in the `test` container on image imports and typed routes, before any build has run.
- **Fix (conventions):** `npm test` runs `next typegen` before `tsc --noEmit`.

### M11. `NODE_ENV=production` set before `npm ci` drops what setup needs
- **A (AD-17 Dockerfile):** a common Dockerfile pattern puts `ENV NODE_ENV=production` at the top.
- **B (AD-17):** "`app` keeps all `node_modules`, so setup can migrate and seed". Setup needs `tsx`, and the build needs `typescript`. Both are dev dependencies.
- **Breaks:** `npm ci` skips dev dependencies, so the build fails or setup can't start.
- **Fix (AD-17):** `deps` runs `npm ci` with dev dependencies. `NODE_ENV=production` is set only in the `app` stage, after the copy from `build`.

---

## Low

### L1. CI builds the shared stages twice and has no cache between runs
- **A (AD-17 CI):** `run --rm test`, then `build app`, which are separate targets. Each PR builds from cold.
- **Breaks:** CI is slow. Nothing fails.
- **Fix:** CI runs `docker compose --profile test build app test` once, with a BuildKit `type=gha` cache, and then runs `run --rm test`.

### L2. `app` has no healthcheck, so the Examiner can open the page while setup is still running
- **Breaks:** "connection refused" on the first visit. H8's `--wait` also needs a healthcheck.
- **Fix (AD-17):** `app` gets a healthcheck that runs `node -e "fetch('http://127.0.0.1:3000/api/health')…"`, because `curl` isn't in the slim image. The README says to open the URL once `docker compose ps` shows `healthy`.

### L3. The Compose project name comes from the folder name
- **Breaks:** a GitHub zip unpacks as `JobAssistant-main`, which gives different volume names from a clone. Then `docker compose down -v` in another folder doesn't reset what the README says it resets.
- **Fix (AD-17):** `compose.yaml` sets the top-level `name: jobassistant`.

### L4. An idempotent seed keeps a stale Example CV in existing volumes
- **Breaks:** after the Example pair changes (for example in Epic 2), the test user's Profile still holds the old CV, and «Bruk eksempelet» and the Profile disagree.
- **Fix (AD-12):** on every start, the seed upserts the test user's Profile CV from the Example pair, after the key check in C2.

### L5. Setup in S1 "seeds the test user" before S6's tables exist
- **Fix (AD-17):** setup always writes secrets and migrates. It seeds only when `features.accounts` is on.

### L6. `next start` host and port are implicit
- **Fix (AD-17):** the start command is `next start -H 0.0.0.0 -p 3000`, so it doesn't depend on Docker's `HOSTNAME` variable or on defaults.

### L7. "The Access code after accounts is checked at registration" has no local rule
- **Breaks:** locally there is no `ACCESS_CODE`, so the S6 register route either rejects every registration or invents a bypass.
- **Fix (AD-12):** registration checks `ACCESS_CODE` only when hosted.

### L8. A lockfile made on Windows can lack the Linux native optional packages
- **Breaks:** `npm ci` in the `deps` stage misses `@tailwindcss/oxide-linux-x64-gnu`, lightningcss or Biome's Linux binary, so the build fails in Docker only.
- **Fix:** CI's `docker compose build app` is the guard. If it trips, regenerate `package-lock.json` with npm 11 and check that the `linux-x64-gnu` entries are there.

### L9. `playwright install --with-deps` on Debian trixie is not verified
- **Fix:** the S2 story starts with a spike to confirm Playwright 1.65 on `node:26.13.1-trixie-slim`. The fallback for `test` only is `mcr.microsoft.com/playwright:v1.65.0-noble`, and the memlog records the second Node version.
