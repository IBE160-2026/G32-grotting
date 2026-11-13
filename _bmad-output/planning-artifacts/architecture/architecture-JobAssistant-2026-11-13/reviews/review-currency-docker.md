---
review: currency (Docker change only)
spine: ../ARCHITECTURE-SPINE.md
date: 2026-11-13
scope: AD-17; Docker parts of AD-2, AD-3, AD-9; Consistency Conventions rows Tests and Config and setup; Stack rows Docker, node image, postgres image; Structural Seed environments
lens: "Verify every committed decision was web-researched or reality-checked rather than asserted from training data"
counts: { critical: 1, high: 5, medium: 2, low: 9 }
---

# Currency review: the Docker change (AD-17)

## How this was checked

I rebuilt AD-17 as a small throwaway project in `%TEMP%` (since deleted). It had a Next 16.4.6 app with a `/api/health` route, a `scripts/setup.ts` that writes `SECRETS_FILE` and migrates and seeds over postgres-js, a PGlite check and one Playwright test. I built it with the spine's exact images and pins: a multi-stage `Dockerfile` (`deps`, `build`, `app`, `test`) and a `compose.yaml` (`db`, `app`, `test`).

- **Machine:** Docker Desktop with Engine 29.7.2 and Compose v5.4.0, using the WSL 2 backend (kernel 6.18) on Windows 11 Home. Host Node is 26.7.0 with npm 11.19.0.
- **Lockfile:** generated on the Windows host, then run through `npm ci` in the Linux image, as Helene's repo will be.
- **Web sources:** Vercel docs and changelog, Playwright system requirements, the Docker Hub postgres page, Docker Desktop install docs and release notes, Next.js CLI docs, and the npm registry.
- **Cleanup:** all containers, images, volumes and build cache I created are removed. The `hello-world` image and container that were already there are untouched.

**Verdict:** the Docker direction holds. The images exist, Playwright 1.65 supports trixie, and the Compose features behave as described. But the README run as written fails on first start (C1). One "verified" fact is wrong: PGlite 0.5.16 is Postgres 18 (H1). And three README and CI mechanics would give the Examiner a red or misleading run (H2–H4). Most fixes are one line each.

---

## Critical

### C1. The `app` container crashes on first start: `EACCES` on `/data/secrets.env`

- **Where:** AD-17, `app` row and the Dockerfile bullets ("volume `appdata`", "runs as the `node` user"); the Config and setup convention.
- **Evidence:** I ran `docker compose up app` with the spine's layout: `USER node`, `SECRETS_FILE=/data/secrets.env`, named volume `appdata:/data`. Output:
  ```
  Error: EACCES: permission denied, open '/data/secrets.env'  (errno -13)
  jacheck-app-1 Exited (1)
  ```
  `/data` does not exist in the image, so Docker creates the new named volume owned by `root:root`. The `node` user (uid 1000) cannot write to it. This blocks NFR-9: `docker compose up --build` never serves the app.
- **Fix (verified):** in the `app` stage, before `USER node`:
  ```dockerfile
  RUN mkdir -p /data && chown node:node /data
  USER node
  ```
  When a new, empty named volume is mounted, Docker copies the image directory's ownership into it. After the fix: `drwxr-xr-x node node /data`, `-rw------- node node secrets.env`, setup ran, `next start` was ready in 215 ms, and `/api/health` returned 200.
- **Add to AD-17:** "the `app` stage creates `/data` owned by `node`; a volume created before that change needs `docker compose down -v`".

---

## High

### H1. PGlite 0.5.16 is PostgreSQL 18.6, not 17, so "Postgres 17 everywhere" is false for tests and CI

- **Where:** AD-9 title and rule ("Drizzle on Postgres 17 everywhere"; tests and CI's from-zero migration on PGlite); memlog brief "PGlite 0.5.16 being Postgres 17 compatible"; Stack row `@electric-sql/pglite (tests only) 0.5.16`.
- **Evidence:** `select version()` inside the test container returned `PostgreSQL 18.6 (PGlite 0.5.16) on wasm32-unknown-emscripten`. I also checked older lines:

  | PGlite | Postgres |
  |---|---|
  | 0.3.16 | 17.5 |
  | 0.4.6 (2026-05-25) | 17.5 |
  | 0.5.0 (2026-06-02) | 18.3 |
  | 0.5.16 | 18.6 |

  The local `db` container returned `PostgreSQL 17.12 … musl`. Supabase's platform default is still 17 (Supabase changelog, May 2026; secondary source, no 18 default found).
- **Risk:** Vitest, Playwright and CI's "from-zero migration on PGlite" all run on 18. A migration or query that uses an 18-only feature passes CI, then fails on the `db` container and on Supabase. Examples: `uuidv7()`, virtual generated columns as the default, `OLD`/`NEW` in `RETURNING`.
- **Fix (pick one, state it in AD-9):**
  - **(a) Recommended:** pin `@electric-sql/pglite` to **0.4.6**, the last Postgres 17 line. drizzle-orm 0.45.4's peer `pglite >=0.2` accepts it. Change the Stack row to "0.4.6 (Postgres 17.5)".
  - **(b)** Keep 0.5.16, but run CI's from-zero migration against the real `postgres:17.12-alpine` service rather than PGlite. For example: `docker compose run --rm --build app npx tsx scripts/migrate.ts` with `db` up. Then reword AD-9 to "Postgres 17 for every run; tests on PGlite (Postgres 18)".

  Doing both is cheapest in risk.

### H2. `docker compose up --build` also builds and starts the `test` service

- **Where:** AD-17 README commands and the `test` row.
- **Evidence:** `docker compose up --build --dry-run` on the spine's three-service file printed `Image jacheck-test Building`, `Image jacheck-app Building`, `Container jacheck-test-1 Creating` and `Container jacheck-db-1 Creating`. Compose starts every service that has no profile.
- **Risk:** the Examiner's "start the app" command builds the 3 GB test image with Chromium. It also runs the whole suite next to the app on every start, which adds about a minute to the first build on this machine and mixes test output into the app logs.
- **Fix (verified):** add `profiles: ["test"]` to `test`. After the change, `up --build` built only `app`, and `docker compose run --rm test` still worked, because `run` enables a profiled service when it is named. Add "`test` is in profile `test`" to the AD-17 table.

### H3. `docker compose run --rm test` runs a stale image after code changes

- **Where:** AD-17 README commands; the Tests convention ("The one command for the Examiner and CI is `docker compose run --rm test`"); the Tests and CI environment row.
- **Evidence:** I changed `src/app/page.tsx`, then ran `docker compose run --rm --dry-run test`. It printed no build step, so the existing image was reused. `docker compose run --help` lists `--build  Build image before starting container` (Compose v5.4.0).
- **Risk:** in Helene's local loop, a green run can be testing old code. A fresh CI runner is unaffected only on its first command.
- **Fix:** use `docker compose run --rm --build test` everywhere: README, the Tests convention, the AD-17 CI line, and the seed table. Do the same for `… --build test npm run db:check`.

### H4. Line endings: a Windows checkout makes `npm test` fail in the container on Biome formatting

- **Where:** AD-17 "Prevents … line-ending problems on Windows" and Windows safety; the Ids, hashes, text convention, which has only `.gitattributes` `data/** text eol=lf`.
- **Evidence:**
  - `git config --show-origin core.autocrlf` on this machine gives `C:/Program Files/Git/etc/gitconfig true`. That is the Git for Windows default, and the repo has no `.gitattributes` yet.
  - With autocrlf on, every `.ts` file is checked out as CRLF and copied by `COPY . .` into the `test` image.
  - Biome 2.6.7 with default settings (`lineEnding: lf`) on a CRLF file gave `× Formatter would have printed the following content: … ␍`, and `biome check` exited non-zero. The same file in LF passes.
- **Risk:** an Examiner who clones on Windows and runs the one test command gets red at step 1. The spine's `.gitattributes` rule covers `data/**` only.
- **Fix:** have the skeleton story commit a root `.gitattributes` before any code:
  ```
  * text=auto eol=lf
  *.pdf binary
  *.png binary
  *.docx binary
  ```
  Then run `git add --renormalize .`. State this in the Ids, hashes, text convention and in AD-17 Windows safety. The alternative, Biome `formatter.lineEnding: "auto"`, would still leave CRLF in `data/` hashes, so prefer `.gitattributes`.

### H5. "Vercel ignores `Dockerfile` and `compose.yaml`" is asserted, and Vercel now builds root Dockerfiles

- **Where:** AD-17 "Vercel: it builds from source and ignores `Dockerfile` and `compose.yaml`"; the Hosted row of the environments table; memlog "Vercel ignores Docker files".
- **Evidence:**
  - Vercel's Container Runtime page (last updated 2026-07-07) says it is "available in Beta on all plans". Quote: "A root `Dockerfile` or `Containerfile` is enough when Vercel detects no other framework. On a new project, Vercel selects the Container preset, builds that file, and routes all traffic to the image. When the project already matches another framework, such as Next.js, Vercel keeps that framework." It also says: "A `Dockerfile.vercel` or `Containerfile.vercel` file selects the Container preset when that preset should win over another detected framework."
  - The changelog "Deploy a container from a plain Dockerfile" was published 2026-10-27, so this behaviour is 2.5 weeks old and in beta.
- **What it means:** today a root `Dockerfile` does not change the preset, because Next.js is detected and wins. But Vercel does not ignore the file. The outcome rests on detection at project creation and on a beta precedence rule. If the Vercel project is imported before `package.json` lists `next`, which depends on the order of the setup story, Vercel picks Container. It would then deploy the local Docker image, which has no Hosted config.
- **Fix:**
  - Pin the preset in `vercel.json` with `"framework": "nextjs"`, the documented override of the project's Framework Preset. The file becomes `{ "framework": "nextjs", "git": { "deploymentEnabled": { "**": false, "main": true } } }`.
  - Add a rule: never add `Dockerfile.vercel` or `Containerfile.vercel`.
  - Reword AD-17 to: "Vercel builds the Next.js preset (pinned in `vercel.json`). The root Dockerfile is not used there, because the Next.js framework takes precedence over Vercel's Container preset."
  - Optionally add `.vercelignore` with `Dockerfile`, `compose.yaml` and `.dockerignore`.

---

## Medium

### M1. `.next/cache` is owned by root while `next start` runs as `node`

- **Where:** AD-17 Dockerfile bullets (`app` "runs as the `node` user").
- **Evidence:** I requested `/_next/image?url=/x.png&w=64&q=75` in the `app` container. The request returned 200, but the log showed:
  ```
  ⨯ Failed to write image to cache … EACCES: permission denied, mkdir '/app/.next/cache/images'
  ```
  `ls -la /app/.next/cache` shows `root root`, because `COPY` and `next build` ran as root. Any runtime cache write fails the same way, including image optimisation and any future ISR or fetch cache.
- **Fix:** in the `app` stage, `RUN chown -R node:node /app/.next` before `USER node`. Alternatively, `COPY --chown=node:node` from `build`. Add it to the AD-17 Dockerfile bullet together with C1.

### M2. Text ordering differs across the three "Postgres 17" environments

- **Where:** AD-9 "Postgres 17 everywhere" (implied parity); AD-17 `db` image `postgres:17.12-alpine`.
- **Evidence:**
  - **`db` container:** `pg_database.datcollate = en_US.utf8`, provider `c` (libc) on musl. `ORDER BY name` over `a, å, z, æ, ø, B` returned `B,a,z,å,æ,ø`, which is plain code-point order. Correct Norwegian order is a, B, z, æ, ø, å.
  - **PGlite:** reports collation `C`.
  - **Supabase:** most likely glibc `en_US.UTF-8` (not verified here; check with `select datcollate from pg_database` on the Supabase project).
- **Risk:** any `ORDER BY` on a text column, such as job title or employer in Historikk, sorts differently in tests, locally and on Hosted. A test that asserts order can pass locally and fail on Hosted.
- **Fix:** add one line to the Persistence convention: sort only on non-text keys (`created_at`, `seq`), or sort text in code with `Intl.Collator('nb')`. If Norwegian ordering in SQL is ever needed, initialise the container with ICU. The Docker Hub postgres page says "Alpine-based variants starting with Postgres 15 support ICU locales", so use `POSTGRES_INITDB_ARGS: "--locale-provider=icu --icu-locale=nb-NO"`, which still leaves PGlite and Supabase different.

---

## Low

### L1. Signal handling: `sh -c "setup && next start"` is PID 1, so stopping is not graceful

- **Evidence:**
  - PID 1 was `sh -c npx tsx scripts/setup.ts && npx next start`, and `docker compose stop app` ended with `exit=137` (SIGKILL).
  - With `init: true` on the service, the stop took 1 s and ended with `exit=143` (SIGTERM handled).
- **Fix:** add `init: true` to `app`, or `exec` the last command. Note it in the AD-17 start-command bullet.

### L2. The `pg_isready` healthcheck can pass during the image's temporary init server

- **Evidence:** the `db` log on first start showed the init server listening on the Unix socket only, "ready to accept connections" at 17:39:56.465, and a fast shutdown at 56.614. The real server opened TCP at 56.866. By default `pg_isready` uses the Unix socket, so it can report healthy inside that window. Setup would then hit connection refused, and the `app` container would exit, because it has no restart policy.
- **Fix:** use the healthcheck `pg_isready -h 127.0.0.1 -U jobassistant -d jobassistant`, which checks TCP only. Have setup retry the first connection a few times. Passing `-U` also avoids `FATAL: role "root" does not exist` log noise.

### L3. A future bump to `postgres:18` silently changes the volume path

- **Evidence:** the Docker Hub postgres page says that for 18+ "the `VOLUME` moved to `/var/lib/postgresql`" and that PGDATA is `/var/lib/postgresql/18/docker`. The spine's mount for 17 is `pgdata:/var/lib/postgresql/data`, which is correct for 17. This matters if H1 is solved by moving everything to 18.
- **Fix:** add a comment beside the pin in AD-17 or the Stack: "moving to 18 changes the mount to `/var/lib/postgresql`; run `down -v` first".

### L4. Docker Desktop prerequisites on Windows are not stated, and vendor docs are inconsistent about Windows 11 Home

- **Evidence:**
  - The docs.docker.com Windows install page, fetched today, lists for the WSL 2 backend: WSL 2.1.5 or later, "Windows 11 64-bit: Enterprise, Pro, or Education version 23H2 (build 22631) or higher", 8 GB RAM, virtualization enabled in BIOS, and the LanmanServer service set to Automatic. It mentions Home only as "Windows Home or Education editions only allow you to run Linux containers". Other copies of the page list Home.
  - It works on this Windows 11 Home machine (Docker Desktop, Engine 29.7.2, WSL 2).
  - The images are large: `test` is 2.98 GB and `app` is 1.4 GB. The first build took 126 s here.
- **Fix:** the README names the tested setup ("Windows 11 Home, Docker Desktop 4.x, Engine 29.7.2, Compose 5.4.0, WSL 2"), the prerequisites above, and about 5 GB of free disk. The Hosted version is the fallback.
- **Stack row is current:** Docker Desktop 4.99.0 (2026-11-09) ships Engine v29.9.3 and Compose v5.7.0, so "Engine 29.x, Compose 5.x" still holds.

### L5. Windows reserved port ranges and host port clashes

- **Evidence:** my first attempt to publish `127.0.0.1:55432` failed with `bind: An attempt was made to access a socket in a way forbidden by its access permissions`. `netsh interface ipv4 show excludedportrange protocol=tcp` shows reserved ranges 50000–50059 and 55038–55537 (Hyper-V and WSL). Ports 3000 and 5432 are free on this machine, but the ranges move between boots and machines. A host Postgres on 5432 would also clash with the developer loop.
- **Fix:** publish with `"127.0.0.1:${DB_PORT:-5432}:5432"` and `"127.0.0.1:${APP_PORT:-3000}:3000"`. Add a two-line README troubleshooting entry with the `netsh` command.
- **Verified working:** binding to 127.0.0.1 behaves as intended on Docker Desktop for Windows. The host reached the app on `127.0.0.1:3000`, and postgres-js reached `db` on both `localhost:5432` and `127.0.0.1:5432`.

### L6. Docker Hub pulls in CI

- **Evidence:** Docker's docs say GitHub-hosted runners are exempt from Hub pull limits under an agreement with GitHub. A secondary source reports hosted runners hitting `toomanyrequests` on 2026-10-09. The unauthenticated limit is 100 pulls per 6 h.
- **Fix:** none needed now. If CI fails on a pull, add `docker/login-action` with a read-only Hub token. One line in the CI workflow notes.

### L7. The "no standalone" rationale is unverified and does not apply to Vercel

- **Evidence:** the memlog's reason is a "reported Vercel packaging failure with standalone on Next 16.3", with no source. Vercel builds with its own Next.js builder, so `output: 'standalone'` never affects the Hosted deploy.
- **Fix:** the decision stands for a reason that holds. The `app` image must keep full `node_modules` because setup runs tsx and the migrator. I verified that `next start` with full `node_modules` runs as `node` and serves `/api/health`, with sharp loading fine on trixie-slim. Replace the stated reason in AD-17 and the memlog.

### L8. The `test` stage must stay root-based for Playwright

- **Evidence:** `playwright install --with-deps chromium` uses apt, so it needs root. It put browsers in `/root/.cache/ms-playwright/chromium-1254` (Chrome for Testing 158.0.8127.18). It works because `test` builds `FROM build`, which runs as root. If `test` were based on `app` (`USER node`), the apt step would fail and the browsers would be missing.
- **Fix:** add to AD-17: "`test` builds from `build` and runs as root". Optionally set `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`.

### L9. npm 11.20 noise in container builds

- **Evidence:**
  - `npm ci` in `node:26.13.1-trixie-slim` (npm 11.20.0) printed `install scripts not yet covered by allowScripts: esbuild@0.28.2 (postinstall)`. esbuild comes in through tsx, which still worked.
  - The container logs also printed `New major version of npm available! 11.20.0 -> 12.2.2`.
- **Fix:** add `ENV NPM_CONFIG_UPDATE_NOTIFIER=false` in the `deps` stage. Optionally run `npm install-scripts approve esbuild` once and commit the result. The Stack npm row ("11.x") stays correct for the image.

---

## Confirmed by trying (no change needed)

- **Images:** `node:26.13.1-trixie-slim` pulled and ran (Node v26.13.1). `postgres:17.12-alpine` pulled and ran (`PostgreSQL 17.12 on x86_64-pc-linux-musl`). The Docker Hub tag list includes `17.12-alpine` (Alpine 3.24).
- **Playwright 1.65.0 on Debian 13:** the system requirements list "Debian 12 / 13, Ubuntu 22.04 / 24.04 / 26.04", and trixie support dates back to 1.55. `playwright install --with-deps chromium` succeeded in about 49 s. Then `tsc`, PGlite and a Playwright test against `next start` with `webServer` all passed: "1 passed (6.2s)".
- **Compose features:**
  - `docker compose config` validates the sketch.
  - `env_file` with `required: false` works with and without `.env`. Keys in `environment` override the same keys from `.env`, so a developer `.env` with `DATABASE_URL=localhost` does not leak into the container.
  - `depends_on: condition: service_healthy` held `app` until `db` was healthy.
  - The named volumes `pgdata` and `appdata` were created, and `down -v` removed both.
- **Lockfile portability:** a `package-lock.json` generated on Windows includes the Linux binaries for `@next/swc-linux-x64-gnu`, `@biomejs/cli-linux-x64`, `@esbuild/linux-x64` and `@img/sharp-linux-x64`. `npm ci` succeeded in the Linux image, and Biome, tsx, next and sharp all ran.
- **Next.js:** `next start` binds `0.0.0.0` by default (Next CLI docs: "default: 0.0.0.0"; port from `PORT`), so no `HOSTNAME` workaround is needed without standalone. sharp is installed automatically and loads.
- **postgres-js 3.4.9 to Postgres 17.12:** it connects with the default `scram-sha-256` (`password_encryption = scram-sha-256`), both from the `app` container and from the Windows host. Setup created the table, ran an idempotent `INSERT … ON CONFLICT DO NOTHING` and read the rows back.

## Sources

- Vercel Container Runtime: https://vercel.com/docs/functions/runtimes/container
- Vercel changelog, "Deploy a container from a plain Dockerfile" (2026-10-27): https://vercel.com/changelog/deploy-a-container-from-a-plain-dockerfile
- Vercel `vercel.json` `framework` property: https://vercel.com/docs/project-configuration/vercel-json
- Playwright system requirements: https://playwright.dev/docs/intro
- Docker Hub postgres (ICU on Alpine, volume path for 18+, scram default): https://hub.docker.com/_/postgres
- Docker Desktop Windows install requirements: https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Desktop release notes (4.99.0): https://docs.docker.com/desktop/release-notes/
- Docker Hub pull limits: https://docs.docker.com/docker-hub/usage/pulls/
- Next.js CLI (`next start` defaults): https://nextjs.org/docs/app/api-reference/cli/next
- npm registry: `@electric-sql/pglite` release times (0.4.6 2026-05-25; 0.5.0 2026-06-02)
