---
review: currency
target: ../ARCHITECTURE-SPINE.md
memlog: ../.memlog.md
date: 2026-11-13
lens: "Was every committed decision web-researched or reality-checked (current versions, the technology still exists and fits, live starter defaults), or only asserted from training data?"
---

# Currency review: JobAssistant v1 architecture spine (run 2026-11-13)

## Verdict

**Fix three things before scaffolding. The architecture's shape doesn't need to change.**

Every Stack version is real. Every row is either the npm `latest` or a pin the memlog explains, and the whole set installs cleanly together. Three things were asserted rather than tried, and each fails once you actually run it:

1. **The scaffold command turns Cache Components on.** The memlog says `--cache-components` is opt-in. The live `create-next-app@16.4.6` turns it on (plus `partialPrefetching`) when the flag is left out.
2. **`import 'server-only'` in every `server/` file breaks drizzle-kit, Vitest and `scripts/setup.ts`.** The table schemas live in `server/schema.ts`, and drizzle-kit fails as soon as it loads them.
3. **postgres-js on Supabase's transaction pooler is a combination Supabase's own docs warn against.** Pipelining can hang queries or return mismatched rows, and `prepare: false` doesn't prevent it.

Counts: **Critical 0 · High 3 · Medium 4 · Low 10** (plus a list of claims that were confirmed).

## Method

- Ran `npm view <pkg> dist-tags|time|peerDependencies|engines` for every Stack row on 2026-11-13.
- Did a real throwaway install of the full Stack (exact versions, `--ignore-scripts`) in `%TEMP%\ja-currency-test`, outside the repo.
- Ran `create-next-app@16.4.6` with the spine's exact flags (`--skip-install`, stdin closed) and read the generated files.
- Read the docs bundled in `next@16.4.6` (`node_modules/next/dist/docs/**`).
- Ran smoke tests on Node 26.7.0 / Windows: Drizzle and PGlite persisting to a folder; drizzle-kit generate; unpdf text extraction; docx `Packer.toBuffer`; the `@orama/stemmers` Norwegian stemmer; Biome `noRestrictedImports` with glob patterns and per-slice overrides; minimatch on branch names.
- Read live docs from Vercel, Supabase, GitHub and the postgres.js releases page (URLs are given with each finding).

---

## Critical

None.

---

## High

### H1. The scaffold command as written turns on Cache Components and partial prefetching

**Claim (spine, Structural Seed):** "Leave Cache Components and the React Compiler off." The memlog's (version) entry says "`--cache-components` is opt-in".

**Evidence:** I ran the spine's exact command non-interactively:

```text
$ npx create-next-app@16.4.6 ja-scaffold --ts --tailwind --biome --app --src-dir --import-alias "@/*" --use-npm --no-agents-md --disable-git --skip-install
Using defaults for unprovided options:
  --no-react-compiler     No React Compiler (use --react-compiler for React Compiler)
  --cache-components      Cache Components (use --no-cache-components for No Cache Components)
  --no-agent-feedback     No agent feedback (use --agent-feedback for Agent feedback)
```

This is the generated `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
};
```

When the command runs interactively, the prompt's default is also "on". Cache Components changes the rendering model: `dynamic`, `revalidate` and `fetchCache` are removed, and uncached data accessed outside `<Suspense>` becomes an error. That is the bundled doc `01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md`, under "v16.0.0". The root layout's per-request `RunMode` and the cookie reads in AD-12 would hit this.

**Fix:** Make the command explicit:

```text
npx create-next-app@16.4.6 ja-scaffold --ts --tailwind --biome --app --src-dir --import-alias "@/*" --use-npm --no-agents-md --disable-git --no-cache-components --no-react-compiler --no-agent-feedback
```

I checked this: with `--no-cache-components`, `next.config.ts` has neither `cacheComponents` nor `partialPrefetching`. Also correct the memlog entry.

### H2. `import 'server-only'` in every `server/` file breaks drizzle-kit, Vitest and Node scripts

**Claim (AD-1):** "Every file in `server/` starts with `import 'server-only'`." AD-9 puts each table in `server/schema.ts`, and AD-11's encrypted column types live in `src/shared/server/crypto.ts`. The conventions say "Vitest for core and server". `scripts/setup.ts` migrates and seeds.

**Evidence:** `server-only@0.0.1` resolves to `empty.js` only under the `react-server` export condition. Everywhere else, its `index.js` throws:

```text
"exports": { ".": { "react-server": "./empty.js", "default": "./index.js" } }
$ node so-test.mjs                                   -> throws "This module cannot be imported from a Client Component module..."
$ node --conditions=react-server so-test.mjs         -> OK
```

drizzle-kit 0.31.11 with a schema file that starts with `import 'server-only'`:

```text
$ drizzle-kit generate
Error: This module cannot be imported from a Client Component module. It should only be used from a Server Component.
    at <anonymous> (...\dk\src\schema.ts:1:8)
```

Without the import, the same schema generates `0000_*.sql`. Vitest and `tsx scripts/setup.ts` resolve with the default condition too, so they hit the same throw. Next's docs also say the package is optional to install (`01-app/01-getting-started/05-server-and-client-components.md`, line 584). Even so, it is not in the Stack table.

**Fix:** Pick one approach and write it into AD-1:
- (a) Exempt `server/schema.ts` and the Drizzle custom-type module from the rule. Move `encryptedText` and `encryptedJson` into a file without `server-only`, one that reads the key lazily, not at import. Also alias `server-only` to a stub in `vitest.config.ts`, for example `resolve: { alias: { 'server-only': path.resolve('test/server-only-stub.ts') } }`.
- (b) Run drizzle-kit, Vitest (`resolve.conditions`) and scripts with the `react-server` condition (`NODE_OPTIONS=--conditions=react-server`). This also changes which React build loads, so (a) is simpler.

Either way, add `server-only` `0.0.1` to the Stack table.

### H3. postgres-js on Supabase's transaction pooler (6543): `prepare: false` isn't enough

**Claim (AD-9):** Runtime uses `DATABASE_URL` (transaction pooler, port 6543, `prepare: false`) through postgres-js.

**Evidence:**
- Supabase, "Connecting to Postgres" (<https://supabase.com/docs/guides/database/connecting-to-postgres>): 6543 is the shared pooler in transaction mode, and it doesn't support prepared statements, so `prepare: false` is correct. The same page warns: "`postgres.js` pipelines queries by default, so this combination can hang queries or return mismatched rows."
- Supabase, "Postgres.js" guide (<https://supabase.com/docs/guides/database/postgres-js>): "postgres.js has no working option to turn pipelining off directly", and "max_pipeline: 0 breaks sql.begin() transactions instead, a known upstream bug."
- The Drizzle guide (<https://supabase.com/docs/guides/database/drizzle>) still shows only `postgres(url, { prepare: false })`.

The two phase-2 calls run in parallel (AD-6), and AD-13 depends on a single atomic `UPDATE … RETURNING`. Mismatched rows in a multi-Student app would break FR-19 isolation, not just slow a request.

**Fix:** Choose one and update AD-9:
- (a) **Simplest:** at runtime, use the **session pooler (5432, IPv4)** with `postgres(url, { max: 1, idle_timeout: 20 })`. Pipelining is safe in session mode, because one client connection holds one backend. With two users and Fluid compute's instance reuse, the Free tier's pool easily covers this.
- (b) Keep 6543, but use `pg` (node-postgres, latest `8.23.1`), which doesn't pipeline, via `drizzle-orm/node-postgres` with `max: 1`.

Migrations on the session pooler (5432) are right as written. Supabase recommends a direct connection for migrations, but direct connections are IPv6-only without the add-on, and Vercel's build can't reach them.

---

## Medium

### M1. The Stack lists `@tailwindcss/postcss`, but the starter wires `@tailwindcss/turbopack`

**Evidence:** The `create-next-app@16.4.6` output has no `postcss.config.*`. Its `package.json` devDependencies include `"@tailwindcss/turbopack": "4.3.3"` and `"tailwindcss": "4.3.3"`. Its `next.config.ts` loads `@tailwindcss/turbopack` through `turbopack.rules` (see H1). `@tailwindcss/turbopack` exists on npm, with `latest` 4.3.5 (2026-11-06).

**Fix:** Change the Stack row to "Tailwind CSS (+ `@tailwindcss/turbopack`) | 4.3.5". If `@tailwindcss/postcss` gets pinned and a `postcss.config` added on top, CSS goes through two Tailwind passes, or the pinned package sits unused.

### M2. The `git.deploymentEnabled` syntax isn't given, and the obvious `"*"` misses the story branches

**Claim:** "Preview deployments are off (`vercel.json` `git.deploymentEnabled`)". For Cut 0: "set `main` to `false` as well".

**Evidence:** Vercel's Git configuration page (<https://vercel.com/docs/project-configuration/git-configuration>) says the value is a boolean, or an object of branch keys using **minimatch** syntax. Any unspecified branch defaults to `true`, and "If a branch matches multiple rules and at least one rule is `true`, a deployment will occur." The branch convention is `story/<epic>.<story>-<slug>`, which contains a `/`. I tested minimatch 10:

```text
"*"  main true    "*"  story/1.1-cv-upload false
"**" main true    "**" story/1.1-cv-upload true
```

**Fix:** Put the exact JSON in the deployment seed:

```json
{ "git": { "deploymentEnabled": { "**": false, "main": true } } }
```

For Cut 0, use `"main": false`, or simply `"deploymentEnabled": false`. Also scope `MIGRATION_DATABASE_URL` (and `DATABASE_URL`) to the Vercel **Production** environment only. Then a stray preview build can't run `db:migrate` against the Hosted database.

### M3. The Stack table leaves out packages the plan depends on

`server-only` (AD-1), `@types/react` and `@types/react-dom` are all missing. The starter writes `^19` for the types, which breaks the "exact versions, no `^`" convention (NFR-6). `@tailwindcss/turbopack` is missing too (M1).

**Evidence:** `npm view`: `server-only` 0.0.1, `@types/react` 19.3.0, `@types/react-dom` 19.3.0. The scaffold's `package.json` is shown in H1 and M1.

**Fix:** Add these rows: `server-only 0.0.1`, `@types/react 19.3.0`, `@types/react-dom 19.3.0`, `@tailwindcss/turbopack 4.3.5`. Add `pg 8.23.1` and `@types/pg` if H3(b) is chosen.

### M4. `@orama/stemmers` Norwegian exists, but Snowball doesn't merge the common `-er` agent-noun forms

**Evidence:** The package exports `./norwegian` (`dist/no.js`, Snowball-generated code), with the API `import { stemmer } from '@orama/stemmers/norwegian'`. Version 3.1.18 (2025-12-19) is `latest`. Output on Node 26:

```text
utvikler -> utvikl       utviklere -> utvikler     utviklerne -> utviklern
sykepleier -> sykeplei   sykepleiere -> sykepleier
erfaring/erfaringer/erfaringene -> erfaring       prosjektleder/prosjektledelse -> prosjektled
```

Snowball Norwegian strips one suffix from its list. `-ere` and `-erne` aren't on that list, so the singular, plural and definite forms of job-title nouns end up as three different stems. These words are central to job ads. AD-5's `inflection` stage would miss these matches, which hits FR-5 and SM-2 directly.

**Fix:** Keep the package, which is the right one, and write the import path into AD-5. Add a short pre-step in `keywords/core` (fold `-erne`/`-ere` to `-er` before stemming, or stem twice), and pin the behaviour with a test table of these forms early in Epic 2, checked against the Answer keys.

---

## Low

### L1. Biome `noRestrictedImports` can enforce AD-1, but only with a specific config

**Evidence:** In the `@biomejs/biome@2.6.7` schema, `style.noRestrictedImports` takes `patterns[].group`, gitignore-style globs with `!` negation. Tested:
- `@/modules/*/*/**` flags `@/modules/cv/core/y` and `@/modules/keywords/core/normalise`.
- It allows `@/modules/cv` and `@/modules/keywords/core` (folder index).
- Relative cross-slice imports such as `../../cv/core/y` escape the alias pattern unless `../../*/**` is also banned.
- A per-slice `overrides` entry with `"!@/modules/cv/**"` successfully exempts a slice's own files.

The default `"recommended"` field is deprecated in 2.6.7 ("Use preset instead").

**Fix:** Write the tested shape into AD-1: a global pattern `["@/modules/*/*/**", "../../*/**"]`, plus one override per slice that negates its own path. Give `keywords/core` and `integrity/core` an `index.ts`, so AD-1's "core may import keywords/core" doesn't conflict with "only through index.ts".

### L2. Biome version jump from the starter

The starter writes `"@biomejs/biome": "2.4.2"` and `biome.json` with `$schema …/2.4.2/schema.json` and `"recommended": true`.

**Fix:** After pinning 2.6.7, run `npx biome migrate --write` in the scaffold step.

### L3. TypeScript 5.9.3 is a deliberate pin two majors behind, but the spine doesn't say so

**Evidence:** `typescript` `latest` is 7.0.2 (2026-07-08). 6.0.3 came out 2026-04-16. The starter writes `"typescript": "^5"`, which resolves to 5.9.3. `next@16.4.6` runs the local `tsc` CLI by default, so TS 6 and 7 are supported (bundled doc `05-config/02-typescript.md`, "Using TypeScript 7").

**Fix:** Keep 5.9.3, the lowest-risk choice for a solo build. Mark the Stack row "pinned: starter's `^5`; TS 6/7 not needed".

### L4. `postgres` 3.4.9 and `drizzle-orm` 0.45.4 are deliberate pins; say so in the Stack table

**Evidence:**
- `postgres` `latest` is 4.1.1 (2026-11-11). The 4.0.0 release notes (<https://github.com/porsager/postgres/releases>) list breaking changes: the CJS build is removed, `infer: false` is the default, and `sql.array()` is removed. That supports the memlog's choice of 3.4.9.
- `drizzle-orm` 1.0 is at `1.0.0-rc.5` (2026-10-21). `latest` is still 0.45.4.

**Fix:** Annotate both rows ("pinned below 4.x", "latest stable; 1.0 is RC"), so a later reader doesn't "upgrade" them.

### L5. The Supabase pause threshold is now known; close the Deferred row, and watch GitHub's 60-day rule

**Evidence:**
- Supabase (<https://supabase.com/docs/guides/platform/free-project-pausing>): Free projects pause after "low activity over a 7-day period". Requests from your connected app count as activity. A warning email comes about a week ahead, and a paused project can be restored for up to 1 year.
- GitHub (<https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow>): "In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days."

**Fix:** Replace the Deferred row "Supabase pause threshold" with "7 days; keep-alive twice daily covers it". Add an operations note: if the repo goes quiet for 60 days during grading, re-enable `keep-alive.yml`.

### L6. Supabase facts the spine relies on, now confirmed; record the details

These were confirmed:
- **Data API can be turned off:** in the Dashboard under Integrations → Data API, "Enable Data API", or under Advanced Options at project creation. PostgREST keeps running, and exposes only `pg_pgrst_no_exposed_schemas` (<https://supabase.com/docs/guides/database/data-api>, plus the troubleshooting page "schema pg_pgrst_no_exposed_schemas does not exist").
- **`eu-central-1` = Central EU (Frankfurt)** (<https://supabase.com/docs/guides/platform/regions>).
- **DPA:** it "supplements and forms part of the Supabase Terms of Service", and "acceptance of the Agreement shall have the same effect as signing the SCCs". It uses SCCs (2021/914), not the EU-US Data Privacy Framework, and the Free plan isn't named explicitly (<https://supabase.com/legal/dpa>).

**Fix:** Mention in AD-9, or in the PRD §8.1 processor list, that Supabase's transfer basis is SCCs by acceptance of the ToS. The DPF check in Deferred currently covers only the AI contenders.

### L7. `next/font`: DM Mono is not a variable font

**Evidence:** In `next@16.4.6` `font-data.json`, Schibsted Grotesk is variable, `wght` 400–900, so DESIGN.md's 650 works. DM Mono has only static weights `300|400|500`.

**Fix:** In the fonts convention, note `DM_Mono({ weight: ['500'], subsets: ['latin', 'latin-ext'] })`. `next/font` requires `weight` for non-variable fonts.

### L8. AI SDK 7 API details the `AiClient` adapters will hit

**Evidence:** `ai@7.0.172` `dist/index.d.ts`:
- `maxRetries` and `abortSignal` exist, and a new `timeout` option has been added.
- `generateObject` is `@deprecated Use generateText with an output setting instead`.

Vercel: on Node 26, the built-in `fetch` negotiates HTTP/2, and `response.statusText` is empty (<https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration>).

**Fix:** Have AD-13's adapter use `generateText({ output: … , maxRetries: 0, abortSignal })` for structured Gaps, and map errors on `status`, never on `statusText`.

### L9. unpdf works in Node and on Vercel, but parses on the event loop

**Evidence:** `unpdf@2.1.0` requires `engines.node >=24`, and Vercel's default is 26.x. Its README says "Works in Node.js 24+, … serverless environments", and that with the serverless build "parsing runs on your event loop (no worker) – race extraction calls against a timeout", and to "check `pdf.numPages` against a limit first". The smoke test extracted `"Erfaring med utvikling"` from a generated PDF. It is ESM-only.

**Fix:** In the `cv` slice notes (FR-1/FR-2 limits), add a page-count check and a timeout around `extractText`.

### L10. Fresh pins and the local toolchain

**Evidence:**
- `next@16.4.6` and `@electric-sql/pglite@0.5.16` were both published 2026-11-09, four days before this review. PGlite shipped six patch releases in three weeks.
- Node 26 became LTS ("Lithium") with 26.13.0 on 2026-10-28, and 26.13.1 is current (nodejs.org `dist/index.json`).
- The local machine runs Node 26.7.0, which is pre-LTS. npm `latest` is 12.2.2, but Node 26 LTS bundles npm 11.20.0, so the Stack's "npm 11.x" is right.

**Fix:** Upgrade local Node to 26.13.x before scaffolding. Don't take patch bumps of `next` or PGlite mid-epic without running the e2e suite.

---

## Confirmed (no action)

- **Versions:** every Stack row matches the npm `latest` dist-tag on 2026-11-13: next 16.4.6, react/react-dom 19.3.1, tailwindcss 4.3.5, zod 4.6.7, @tanstack/react-query 5.107.1, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pglite 0.5.16, ai 7.0.172, @ai-sdk/anthropic 4.0.104, @ai-sdk/openai 4.0.117, unpdf 2.1.0, docx 9.15.3, @orama/stemmers 3.1.18, biome 2.6.7, vitest 5.1.0, @playwright/test 1.65.0, @axe-core/playwright 4.14.0, @types/node 26.6.6. The exceptions are the deliberate pins: typescript 5.9.3 (L3) and postgres 3.4.9 (L4).
- **Peer compatibility:** a real install of the full set added 120 packages with no ERESOLVE and no unmet peers. The only warnings are deprecation notices from drizzle-kit's `@esbuild-kit/*`. The checks:
  - next peers `react ^19`.
  - ai and @ai-sdk/* peer `zod ^3.25.76 || ^4.1.8`.
  - vitest 5.1.0 peers `@types/node ^22 || >=24` and `vite ^6||^7||^8` (resolved to 8.3.8, which has native `resolve.tsconfigPaths` for the `@/*` alias).
  - drizzle-orm peers `postgres >=3` and `@electric-sql/pglite >=0.2.0`.
  - `@axe-core/playwright` peers `playwright-core >=1`.
  - All engines accept Node 26.
- **Drizzle + PGlite persisting to a folder:** `new PGlite('./pgdata')` + `drizzle({ client, casing: 'snake_case' })`. Two separate runs gave `n=1`, then `n=2`, so the data persisted. drizzle-orm exports `./pglite` and `./pglite/migrator`, and drizzle-kit 0.31.11 accepts `driver: 'pglite'` and `casing`.
- **docx:** `Packer.toBuffer` produced 9,448 bytes in Node. `Packer.toBlob` exists for the browser, and there are ESM and CJS exports. Either side works for the Deferred ".docx in browser or server" decision.
- **Next.js 16:**
  - `src/proxy.ts` is the renamed middleware ("The `middleware` file convention is deprecated and has been renamed to `proxy`"). It goes "inside `src` if applicable", defaults to the Node runtime, and setting `runtime` in it throws. Without a `matcher` it runs on `_next/static` too, so AD-12's static exemption needs a negative matcher.
  - Route handlers take `export const maxDuration`.
  - `serverExternalPackages` exists, and PGlite isn't on Next's built-in list, so adding it is needed.
  - Both fonts are in `next/font/google`.
- **Vercel:** Node 26.x is the default, and `engines.node: "26.x"` overrides the project setting (<https://vercel.com/docs/functions/runtimes/node-js/node-js-versions>). Hobby with Fluid compute has a 300 s default and maximum, so `maxDuration = 120` is valid (<https://vercel.com/docs/functions/configuring-functions/duration>).
- **Supabase:** transaction pooler on 6543 needs `prepare: false`; session pooler on 5432; the shared pooler is IPv4 (<https://supabase.com/docs/guides/database/connecting-to-postgres>). H3 is the one caveat.
- **create-next-app 16.4.6 flags:** `--ts --tailwind --biome --app --src-dir --import-alias --use-npm --no-agents-md --disable-git` are all valid, and the command completes non-interactively. H1 is the only problem.
