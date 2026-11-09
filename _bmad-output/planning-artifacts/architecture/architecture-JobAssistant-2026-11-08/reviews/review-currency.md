---
review: currency
target: ../ARCHITECTURE-SPINE.md
memlog: ../.memlog.md
date: 2026-11-08
lens: "Was every committed decision web-researched or reality-checked (current versions, the technology still exists and fits, live starter defaults), or only asserted from training data?"
---

# Currency review: JobAssistant v1 architecture spine

## Verdict

**Fix before scaffolding. The architecture's shape doesn't need to change.**

Most version claims check out against the npm registry today. The memlog's registry and Vercel checks hold up. Three gaps remain:

1. **`postgres` was never checked.** The memlog checked the Neon driver. After the switch to Supabase, nobody checked `postgres`, and it has had a new major release in the last 10 days.
2. **The live `create-next-app` 16.4.5 defaults differ from what the spine assumes.** The spine says to use "create-next-app defaults", but those defaults don't match the stack the spine binds.
3. **PGlite and the migration/keep-alive path were asserted, not tried.** A local smoke test shows that PGlite silently loses data when a second instance opens the same `.data/` folder.

Counts: **High 2 · Medium 7 · Low 7** (plus a list of claims that were confirmed).

## Method

- Ran `npm view <pkg> version|time|dist-tags|peerDependencies` for every Stack row on 2026-11-08.
- Read the published code of `create-next-app@16.4.5` (`npm pack`, `dist/index.js` and templates) to get its real prompts and defaults.
- Read the docs bundled in `next@16.4.5` (`dist/docs/**`).
- Read the READMEs of `postgres@4.1.0`, `@electric-sql/pglite@0.5.15` and `unpdf@2.1.0`, and the `postgres-js` driver in `drizzle-orm@0.45.4`.
- Ran a lockfile-only `npm install` of the full stack to test peer-dependency resolution.
- Ran a smoke test of PGlite 0.5.15 with Drizzle 0.45.4 on Node 26.7.0.
- Fetched the Supabase and Vercel docs pages cited below.

## Findings

### H1 (High). `postgres` 4.1.x is an unverified, 10-day-old major that postdates Drizzle 0.45

- **Claim (Stack table):** "postgres (postgres-js, hosted driver) | 4.1.x", "checked against the npm registry".
- **Found:**
  - The memlog's version list (line 12) has no `postgres` entry. It lists `@neondatabase/serverless` and `@libsql/client` instead, so the hosted driver row was never verified after T3 switched to Supabase.
  - `npm view postgres time`: 4.0.0 was published 2026-10-29 and 4.1.0 on 2026-11-05. The previous line ended at 3.4.9 (2026-04-05).
  - The 4.x README has an "Upgrading from v3" section. In v4, parameter types are decided by the server, not inferred from JS values, which "changes how a `Date` is written to `timestamp` and `date` columns". A `timestamp` column is now read as UTC. Booleans, Dates and Buffers that are only selected back come back as text. Transaction and connection handling also changed.
  - `drizzle-orm@0.45.4` was published 2026-10-08, before postgres 4 existed. Its `postgres-js/driver.js` patches `client.options.parsers/serializers` for the timestamp, date, json and jsonb OIDs, which is exactly the area v4 reworked.
  - The peer range `postgres >=3` lets npm install v4, but nothing shows that Drizzle was tested against it. A web search found no statement either way.
  - `prepare: false` still exists in v4 (README, "Prepared statements"), so the pooler setting itself is fine.
- **Why it matters:** The conventions store every date as `timestamptz`, and AD-9 adds a custom encrypted column type. Silent date shifts or type mismatches would only appear on Supabase, never on PGlite. Helene is new to databases, so she would struggle to debug them.
- **Fix:**
  - Pin `postgres` to **3.4.9**, the line Drizzle 0.45 was built and documented against, until Drizzle states v4 support. Alternatively, keep 4.1.0 only after a recorded smoke test against the Supabase pooler covering a `timestamptz` round trip, the encrypted custom type, a transaction and a jsonb column.
  - Add a memlog `(version)` entry either way.

### H2 (High). Two PGlite instances on the same `.data/` silently lose writes, and the spine has no rule against it

- **Claim (AD-8):** "Local: PGlite persisted in `.data/`". `src/server/db/client.ts` picks the driver. `npm run db:migrate` runs locally. `scripts/setup.mjs` migrates and seeds.
- **Found (local test, Node 26.7.0, pglite 0.5.15, drizzle-orm 0.45.4):**
  1. Instance A opened `./data1` and wrote 1 row.
  2. While A was still open, instance B opened the same folder with no error and wrote a row. B saw 2 rows and A saw 1.
  3. After both closed, a fresh open saw **1 row**. B's write was lost without any error.
  - The PGlite README says "PGlite is single user/connection", and upstream issue electric-sql/pglite#489 ("Multiple PGLite Instances from the same data dir not staying in sync") describes the same behaviour.
  - `@electric-sql/pglite` is not in Next 16.4.5's built-in `serverExternalPackages` list (`dist/lib/server-external-packages.jsonc`), so Turbopack will try to bundle it unless the app opts it out.
- **Where a second instance comes from in this design:**
  - Next dev hot reload re-evaluates `client.ts`.
  - Separate server bundles or layers each import `client.ts`.
  - Someone runs `npm run db:migrate` or `npm run setup` (or drizzle-kit studio) while `npm run dev` is running.
  - `next build` workers touch the database during prerendering.
  - The Examiner's local run (NFR-9) is exactly where this would bite.
- **Fix (add to AD-8):**
  - Keep exactly one PGlite instance per process: a `globalThis` singleton in `client.ts`.
  - Add `serverExternalPackages: ['@electric-sql/pglite']` to `next.config.ts`.
  - Run local migrations from code at driver init (`drizzle-orm/pglite/migrator`), or have `setup`/`db:migrate` refuse to run while the dev server holds `.data/` (a lockfile check).
  - Allow no database access during build or prerender (see M2).

### M1 (Medium). "create-next-app defaults" doesn't produce the stack the spine binds

- **Claim (Conventions → Frameworks):** "`create-next-app` defaults". Stack: "App Router, TypeScript, `src/`, via `create-next-app`", "Biome 2.6.x", "Tailwind 4.3.x". Memlog line 17: "via create-next-app (Biome, Tailwind, src dir)".
- **Found (code of `create-next-app@16.4.5`, `dist/index.js`):**

  | Setting | Default in 16.4.5 | What it means for the spine |
  |---|---|---|
  | Linter | `linter:"eslint"` | Biome is offered (`--biome`) but isn't the default. |
  | `src/` directory | `srcDir:false` | You must pass `--src-dir`. |
  | Cache Components | `cacheComponents:true` | Writes `cacheComponents: true` and `partialPrefetching: true` into `next.config.ts`. See M2. |
  | AGENTS.md | `agentsMd:true` | Writes `AGENTS.md`, and `next dev` re-adds its managed block (`dist/server/lib/generate-agent-files.js`). Both the BMad `project-context` skill and Next will now manage blocks in `AGENTS.md`, next to the existing `CLAUDE.md`. |
  | Bundler | Turbopack | Tailwind goes through `@tailwindcss/turbopack` as a Turbopack loader. No `postcss.config.mjs` is written. |
  | Biome version | `"@biomejs/biome":"2.4.2"` (exact), `biome.json` `$schema` 2.4.2 | Not 2.6.x (see L2). |
  | Version ranges | `typescript:"^5"`, `"@types/node":"^20"`, `tailwindcss:"^4"` | Ranges, not exact pins. |

  App Router (`app:true`), TypeScript (`typescript:true`), Tailwind (`tailwind:true`) and `importAlias:"@/*"` are defaults, as assumed.
- **Fix:** Replace "create-next-app defaults" with the exact scaffold command and the follow-up steps:

  ```text
  npx create-next-app@16.4.5 <dir> --ts --app --src-dir --tailwind --biome --import-alias "@/*" --use-npm --no-react-compiler --[no-]cache-components --[no-]agents-md
  ```

  Then:
  - bump `@biomejs/biome` to 2.6.6 and run `npx biome migrate --write`;
  - set `@types/node` to 26.x (see M3);
  - add `save-exact=true` to `.npmrc` and strip the `^` ranges, as the Dependencies convention requires.

### M2 (Medium). Cache Components is on by default, and the spine never decides on it

- **Found:**
  - `create-next-app@16.4.5` enables `cacheComponents` by default (M1).
  - The bundled doc `dist/docs/01-app/02-guides/migrating-to-cache-components.md` says that under Cache Components, `cookies()`/`headers()` outside `<Suspense>` raise *blocking-prerender-runtime*.
  - The same doc says `GET` route handlers "prerender when they don't access uncached or runtime data", and that the `dynamic`, `revalidate` and `fetchCache` segment configs are replaced.
- **Why it matters:**
  - After S6, every page that reads the session cookie needs Suspense boundaries, which is a non-obvious pattern for someone new to React and Next.js (memlog line 34).
  - If Next ever prerenders `GET /api/health`, the keep-alive ping hits a static response and never touches Supabase.
- **Fix:**
  - Decide explicitly. For this project, `--no-cache-components` is the simpler "most common documented pattern".
  - If it stays on, add a rule: `GET /api/health` calls `await connection()` before querying, and session-reading UI sits under `<Suspense>`.
  - Either way, record the decision in the spine.

### M3 (Medium). Adding Vitest 5.1 to the fresh scaffold fails with ERESOLVE

- **Claim (Stack):** "Vitest | 5.1.x", next to a `create-next-app` scaffold.
- **Found:**
  - `vitest@5.1.0` has the optional peer `@types/node: "^22.0.0 || >=24.0.0"`. The starter writes `"@types/node":"^20"`.
  - `npm install --package-lock-only` with `@types/node ^20` and `vitest 5.1.0` fails with `ERESOLVE … Conflicting peer dependency: @types/node`.
  - With `@types/node ^26`, the whole Stack resolves cleanly (263 packages): next 16.4.5, react 19.3.1, zod 4.6.7, drizzle 0.45.4/0.31.11, pglite 0.5.15, unpdf 2.1.0, docx 9.15.3, @orama/stemmers 3.1.18, @anthropic-ai/sdk 1.6.0, biome 2.6.6, tailwind 4.3.5, playwright 1.65.0, axe 4.14.0.
- **Fix:** Add "`@types/node` 26.x (match the runtime)" to the Stack table. Stories must never use `--force` or `--legacy-peer-deps`.

### M4 (Medium). `create-next-app` refuses to scaffold into this repository's root, and the spine doesn't say where the app lives

- **Found:**
  - `isFolderEmpty()` in `create-next-app@16.4.5` allows only `.claude`, `.git`, `.gitignore`, `docs`, `LICENSE` and a few editor files.
  - The repo root also holds `.logs/`, `_bmad/`, `_bmad-output/`, `CLAUDE.md` and `README.md`, so `npx create-next-app .` exits with "contains files that could conflict".
  - The spine's source tree is rooted at `jobassistant/`, which doesn't say whether that is the repo root or a subfolder.
- **Fix:**
  - State that the app lives at the repo root.
  - The scaffold story creates the app in a temporary folder and moves the files up, merging `.gitignore` and `README.md`.
  - If a subfolder is chosen instead, set Vercel's Root Directory and adjust the CI paths.

### M5 (Medium). The keep-alive cadence is below Supabase's own guidance, and the ping may never reach the database

- **Claim (Operations):** "calls `GET /api/health` … every 3 days. This stops Supabase from pausing the Free project."
- **Found:**
  - The Supabase pausing doc (https://supabase.com/docs/guides/platform/project-pausing): "pauses Free Plan projects that show low activity over a 7-day period … Typically **a few user requests to the database each day** over the previous week is enough". It doesn't say whether a trivial `SELECT` counts. One ping every 3 days is 2–3 queries a week, below that guidance.
  - AD-10 puts every route behind `src/proxy.ts` when `ACCESS_CODE` is set, and no matcher exclusion is specified. An unauthenticated GitHub Actions request to `/api/health` would be gated or redirected and never run the query.
  - The GitHub 60-day auto-disable applies to scheduled workflows in public repositories.
  - Alternative: Vercel Hobby cron runs **once per day** with ±59 min precision (https://vercel.com/docs/cron-jobs/usage-and-pricing). It has no 60-day rule, but Vercel calls Cron Jobs "legacy", to be migrated to Schedules.
- **Fix:**
  - Ping at least daily, ideally twice daily.
  - Have `/api/health` do a small write, such as upserting a heartbeat row, not only `SELECT 1`.
  - Exclude `/api/health` from the proxy `matcher` (it returns no data).
  - Optionally use the Vercel daily cron as a second source.

### M6 (Medium). PGlite in memory on Vercel Preview is asserted, not checked

- **Claim (environment table):** "Vercel Preview | PGlite in memory; nothing persists between requests".
- **Found:**
  - Nothing in the memlog tests PGlite inside a Vercel function, and there is no first-party guide for it.
  - The local measurements are first create on disk ≈2.3 s and in-memory init ≈0.85 s, before any migrations run.
  - Each Fluid-compute instance gets its own empty database, so on every cold start:
    - the schema must be migrated (the spine doesn't say by whom);
    - the FR-29 test user must be re-seeded;
    - after S6, logins and sessions disappear whenever a request lands on another instance.
  - The bundle also needs `serverExternalPackages` (H2) and the PGlite `.wasm`/`.data` assets file-traced into the function.
- **Fix:** Pick one of these and record it in the spine:
  - (a) A week-45 spike: deploy a Preview, hit a route that migrates the in-memory database on init, record the result, and state "migrate and seed on driver init in memory mode".
  - (b) Simpler: Preview doesn't use the database at all before S6. Test mode doesn't count the Daily cap, and the keyword cache can no-op. Disable Preview deployments, or keep them for UI review only, once S6 lands.

### M7 (Medium). Hosted migrations don't name a connection, and the obvious one is wrong

- **Claim (Conventions / Operations):** "`npm run db:migrate` against Supabase before the deploy". AD-8: the app connects "through the transaction pooler (`prepare: false`)".
- **Found (https://supabase.com/docs/guides/database/connecting-to-postgres):**
  - The direct connection (5432) is **IPv6-only on Free**. The IPv4 add-on needs Pro or above.
  - The shared pooler is IPv4-only, in session mode (5432) and transaction mode (6543).
  - Supabase lists migrations under the direct connection.
  - "The shared pooler doesn't support prepared statements in transaction mode."
  - So reusing the app's 6543 URL for drizzle-kit is the wrong choice, and the direct URL fails on any IPv4-only network (many home ISPs, GitHub-hosted runners).
- **Fix:**
  - Add a separate `MIGRATION_DATABASE_URL` holding the **session-pooler** string (port 5432 on the pooler host), used only by `drizzle.config.ts` and the migrate script.
  - `DATABASE_URL` stays the 6543 transaction-pooler string with `prepare: false`.
  - Document both in `.env.example`, and in the schema-change steps that the memlog requires.

### L1 (Low). The TypeScript rationale rests on a wrong date

- **Claim:** "TypeScript 5.x as installed by `create-next-app` 16.4 (7.0 is too new to bind)". Memlog line 12: "typescript 7.0.2 (released 2026-11-08, too fresh to bind)".
- **Found:**
  - `npm view typescript time`: 7.0.2 was published **2026-07-08**, four months ago.
  - `latest` is 7.0.2, and `^5` resolves to 5.9.3, the last 5.x release.
  - The outcome (use what the starter installs) is still sensible, since `create-next-app@16.4.5` writes `typescript:"^5"`.
- **Fix:** Reword to "5.9.x, because `create-next-app` 16.4.5 still installs `^5`. Next 16.4 support for TS 7 is not verified." Correct the memlog date.

### L2 (Low). The starter pins Biome 2.4.2, not 2.6.x

- **Found:** `@biomejs/biome` is set to `"2.4.2"` exactly, and `biome.json` points at the 2.4.2 schema. 2.6.6 is current.
- **Fix:** The scaffold story upgrades to 2.6.6 and runs `biome migrate --write` (also listed in M1).

### L3 (Low). Drizzle 1.0 is at rc.5; 0.45 is correct but needs a stay-put rule

- **Found:** The `drizzle-orm` dist-tags are `latest` 0.45.4 and `rc` 1.0.0-rc.5 (2026-10-21). For `drizzle-kit`, `latest` is 0.31.11.
- **Risk:** 1.0 could go stable mid-project and change migrations and query APIs. Online examples and assistants may start showing 1.0 syntax.
- **Fix:** Add to the Stack note: "Stay on 0.45/0.31 until after delivery. Use the 0.x docs."

### L4 (Low). The Supabase DPA is already part of the Terms, so the open question is resolved

- **Claim:** "the Supabase DPA is signed in the dashboard at setup". Memlog line 41 asks to confirm that the Free plan offers it.
- **Found:**
  - https://supabase.com/legal/dpa says the DPA "supplements and forms part of the Supabase Terms of Service", and that "acceptance of the Agreement shall have the same effect as signing the SCCs". It therefore covers every plan, including Free.
  - A countersigned copy can reportedly be requested from the dashboard through PandaDoc. That comes from a secondary source, not confirmed first-party.
- **Fix:** Reword to "The DPA is incorporated in the Supabase ToS (link). Optionally request an executed copy from the dashboard. Record either in `docs/qa/`."

### L5 (Low). drizzle-kit config and scripts read `process.env`, which AD-11 forbids

- **Found:**
  - `drizzle.config.ts` and `scripts/setup.mjs` necessarily read the environment, and the drizzle-kit config must switch between `driver: 'pglite'` (local) and a URL (Supabase).
  - AD-11 says "No other file reads `process.env`".
- **Fix:** Name the exceptions, `drizzle.config.ts` and `scripts/*`, in AD-11.

### L6 (Low). Proxy execution may not stay in `fra1`

- **Found:**
  - The Vercel region docs (https://vercel.com/docs/functions/configuring-functions/region): "Vercel deploys Routing Middleware to all regions by default, regardless of your region settings. On the Hobby plan, Routing Middleware runs in fewer regions."
  - The bundled Next 16.4.5 docs confirm that `proxy.ts` runs on the Node.js runtime by default and sits in `src/` next to `app/`.
  - How Vercel places a Node-runtime proxy wasn't confirmed.
- **Impact:** The proxy only checks the Access-code cookie and handles no Student data, so FR-30 holds in practice.
- **Fix:** Add one line to `docs/architecture.md` so the EU-region claim is precise.

### L7 (Low). The current unpdf README asks for limits the spine doesn't mention

- **Found:**
  - `unpdf@2.1.0` requires `node >=24` (fine on 26).
  - Its README says the serverless build "runs on your event loop (no worker) – race extraction calls against a timeout", that `maxImageSize` is unlimited by default, and to check `pdf.numPages` before extracting.
- **Fix:** Add to the Uploaded-files convention: pass `maxImageSize`, cap the page count, and put a timeout around extraction in `src/server/pdf`.

## Confirmed claims (no action)

| Claim | Evidence |
|---|---|
| next 16.4.5, react 19.3.1, zod 4.6.7, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pglite 0.5.15, unpdf 2.1.0, docx 9.15.3, @orama/stemmers 3.1.18, vitest 5.1.0, @playwright/test 1.65.0, @biomejs/biome 2.6.6, tailwindcss 4.3.5 | `npm view <pkg> version`, 2026-11-08 |
| create-next-app 16.4.5 offers Biome, Tailwind 4, `src/`, App Router and TypeScript ^5 | `create-next-app@16.4.5` `dist/index.js` (defaults differ, see M1) |
| `src/proxy.ts` is the Next 16 gate file and runs on Node by default | `next@16.4.5` `dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` ("inside `src` if applicable"; "Proxy defaults to using the Node.js runtime") |
| `maxDuration` route segment config is still supported | `next@16.4.5` docs, `route-segment-config/maxDuration.md` |
| Node 26.x is the default on Vercel (22 and 24 also available) | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions |
| Hobby gets a single function region, and `fra1` = eu-central-1 Frankfurt exists | https://vercel.com/docs/functions/configuring-functions/region, https://vercel.com/docs/regions |
| Supabase transaction pooler needs `prepare: false` for postgres-js | Supabase connecting doc; `postgres@4.1.0` README ("Transaction, without → `prepare: false`") |
| Supabase pauses Free projects after 7 days of low activity | https://supabase.com/docs/guides/platform/project-pausing |
| Snowball Norwegian exists in @orama/stemmers | `@orama/stemmers@3.1.18` exports `./norwegian` (`dist/no.js`) |
| PGlite and Drizzle persist to a folder in Node | Local smoke test (works for a single instance; see H2) |
| The full Stack resolves in one lockfile | `npm install --package-lock-only` with `@types/node ^26` succeeded |

Not re-checked (the memlog already covers them): the Vercel Hobby 300 s, 2 GB and 4.5 MB limits; AI provider pricing and terms.
