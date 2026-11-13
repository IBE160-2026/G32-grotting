---
review: rubric
target: ../ARCHITECTURE-SPINE.md
driving-spec: ../../../prds/prd-JobAssistant-2026-10-31/prd.md
reviewed: 2026-11-13
reviewer: rubric walker
---

# Rubric review: Architecture Spine, JobAssistant v1 (2026-11-13)

## Verdict

**Not ready to hand off yet, but close.** The spine is well scoped and has no critical gaps. It covers every FR and NFR, and it decides the whole operational envelope (environments, providers, CI, operations). Seven High findings should still be fixed before epics and stories are written. Each is a contradiction between ADs, a rule that breaks the tooling it relies on, or a name that disagrees with the UX documents story writers will read. All seven are small text edits to the spine (one is an edit to the UX and PRD), not redesigns.

| Tier | Count |
|---|---|
| Critical | 0 |
| High | 7 |
| Medium | 9 |
| Low | 10 |

## Checklist walk

| Check | Result |
|---|---|
| Fixes the real divergence points for epics/stories | Mostly. Gaps: slice entry points (H1), FR-5b phase-1 shape (H3), pairHash normalisation (H6), session-expiry contract (M1), HTTP status mapping (M4), route inventory (M5) |
| Every AD Rule enforceable and preventing its divergence | AD-1 contradicts itself (H1) and breaks tools (H2). AD-3's test guard relies on an env var nobody sets and on reading `process.env` outside config (H4). AD-8 + AD-6 can loop (M2). The AD-1 core-purity rule has no stated enforcement (M8) |
| Nothing Deferred lets two units diverge | One false claim: "FR-5b … already covered" (H3). The other Deferred rows are safe |
| Named tech plausible-current | Yes (versions left to the currency reviewer) |
| Capability map covers the spec | Every FR-1 to FR-31, FR-5b, NFR-1 to NFR-11 is mapped. Weak governance: FR-18 session warning (M1); the PRD §8.1 and FR-30 DPA check, which the PRD gives to the architecture (M7) |
| Operational envelope | Decided: environments, deploy, provider strategy, cut 0, keep-alive, course end, monitoring. Gaps: CI doesn't gate deploys (M6); the e2e environment (H4); one test command (H5); spend limit, secret scan and rollback missing from Operations (L6) |
| Mermaid syntax | All four diagrams are valid: labels with `/`, `:` and `()` are quoted, edge labels are quoted, `par … and … end` is well formed, and the cylinder nodes `[("…")]` are correct. Content mismatches only (L1) |
| No template comments left | None found |
| Decisions, not rationale | Mostly. Some provenance prose (L5) |
| Right-sized for a solo beginner-intermediate developer | Mostly. Two places spend time without preventing any divergence (L2, L3) |

---

## High

### H1. AD-1's "only through `index.ts`" contradicts the dependency table and can't work with client code
- **Where:** AD-1 Rule 2; the dependency table, rows "Slice core" and "Slice UI"; the source tree line `<slice>/core/ server/ ui/ contracts.ts index.ts`.
- **Problem:**
  - The table lets UI import *other slices'* `contracts.ts`, and any core import `keywords/core` and `integrity/core` directly. Both are internal files under the "only `index.ts`" rule, which the lint rule would then reject.
  - Routes may depend only on "any slice's `index.ts`". Søknad, Profil and Historikk are client components (AD-2) that need slice `ui/` components. One barrel that mixes server code (`import 'server-only'`) with client components fails as soon as a client file imports it.
  - The first story writes the Biome config, and as written it can't satisfy both the rule and the table, so each story will pick its own exception.
- **Fix:** replace Rule 2 with three public entry points per slice, and update the table and the diagram to match:
  - `index.ts`: the server API, starting with `import 'server-only'`;
  - `contracts.ts`: isomorphic, importing only `zod` and `@/shared/core`;
  - `ui/index.ts`: client components.

  Add `keywords/core/index.ts` and `integrity/core/index.ts` as the only pure entries other cores may import. Convention: imports across slices use the alias `@/modules/<slice>`, `/contracts`, `/ui` or `/core` (the last for keywords and integrity only); imports inside a slice are relative. Biome `noRestrictedImports` patterns ban `@/modules/*/server/**`, `@/modules/*/core/**` (except the two engines) and relative paths that climb out of the slice.

### H2. `import 'server-only'` in every `server/` file breaks Vitest, drizzle-kit and `scripts/setup.ts`
- **Where:** AD-1 Rule 4; AD-9 (tables live in `server/schema.ts`); the Tests convention (Vitest for server code); `scripts/setup.ts` (migrates and seeds the test user through `identity`).
- **Problem:** the `server-only` package throws on import unless the `react-server` export condition is set. Only Next sets it. Plain Node, Vitest and drizzle-kit's loader don't. Three things therefore fail on day one:
  - `drizzle-kit generate` throws, because it loads `server/schema.ts`;
  - every Vitest test of server code throws;
  - the seed in `setup.ts` throws.

  Each story will then work around it in its own way.
- **Fix:** add to AD-1:
  - `vitest.config.ts` aliases `server-only` to an empty stub, or sets `resolve.conditions: ['react-server']`;
  - `server/schema.ts` files are exempt from the `server-only` rule. The `encryptedText` and `encryptedJson` custom types must not read config when imported, only when the column type is used;
  - scripts run with `tsx --conditions=react-server`.

### H3. FR-5b's phase-1 shape isn't decided, although Deferred says it is covered
- **Where:** AD-6 Phase 1 ("synchronous … with no AI"); Deferred, row "FR-5b on or off" ("AD-5, AD-9 and AD-13 already cover both outcomes").
- **Problem:** if FR-5b applies (decided 17 Nov, four days from now), a new Job ad needs an AI request *before* scoring. AD-6 forbids that in phase 1, and nothing else says:
  - where the request runs;
  - its timeout and `maxDuration`;
  - that the FR-24 notice must come before phase 1 (the UX already shows it there);
  - how FR-25 (cap reached) and FR-27 (Test mode, non-fixture ad) mark a score from code-only Keywords as "less precise".

  The analysis route, `AnalysisResult` and the Reflection Note would each decide on their own.
- **Fix:** add an FR-5b branch to AD-6 now, in conditional form:
  - If FR-5b applies, phase 1 calls `KeywordSource`. On a cache miss, in live mode, with the notice accepted and room under the cap, it calls `runAi('keywords')` inside phase 1 (90 s abort, `maxDuration = 120`). Otherwise it uses the code list.
  - `AnalysisResult` carries `keywordOrigin: 'code' | 'ai-saved' | 'code-fallback'`, and the UI shows the "less precise" label for `code-fallback`.
  - In Test mode, the list comes from `cached/keywords.json`.
- Correct the Deferred row to name AD-6 as well.

### H4. Automated tests can still make live AI requests; AD-3's guard depends on an env var nobody sets
- **Where:** AD-3 Rule 3 ("throws if … `process.env.VITEST` or `PLAYWRIGHT` is set"); AD-4 ("`config.ts` … is the only reader of `process.env`"); the environments table, row "Tests and CI".
- **Problem:**
  - Playwright sets no `PLAYWRIGHT` variable in the app server it starts.
  - `next dev`/`next start` loads the developer's `.env`. In the "Local, live" setup that file holds `AI_API_KEY`, so `npm run e2e` runs in `live` mode and makes paid requests. That breaks FR-27 ("never make paid AI requests") and NFR-8.
  - The factory reading `process.env` itself also breaks AD-4.
- **Fix:**
  - `config.ts` exposes `isTestRun` (from `VITEST` or `PLAYWRIGHT`), and the AI factory throws on `live` when `config.isTestRun` is true.
  - Fix the e2e server environment in the spine: `playwright.config.ts` `webServer.env = { PLAYWRIGHT: '1', TEST_MODE: 'true', APP_ENV: 'local', PGLITE_DATA_DIR: 'memory://' }`.

### H5. NFR-9 requires one command for all automated tests; the spine has two
- **Where:** environments table, row "Tests and CI" ("`npm test` runs Biome, tsc, Vitest; `npm run e2e` runs Playwright").
- **Problem:** NFR-9 says "one command runs all automated tests", and UJ-3 step 4 has the Examiner run "the test suite with one command". The axe scan (the Auto Verify for NFR-2) and the end-to-end UJ-1 run (§9.1) live in Playwright, so `npm test` leaves out required tests. The Examiner's machine also needs a Playwright browser, which nothing installs.
- **Fix:**
  - `npm test` runs `biome check`, `tsc --noEmit`, Vitest and Playwright. Keep `test:unit` and `test:e2e` for the developer's quick loop.
  - `npm run setup` runs `npx playwright install chromium`, and the README names the download.
  - CI runs `npm test`.

### H6. `pairHash` normalisation isn't defined, so the Example pair uploaded as a PDF can miss its Cached responses
- **Where:** AD-15 Rule 4 ("`pairHash` of the normalised CV text and Job ad, so «Bruk eksempelet», pasted text and the uploaded files all hit the same entry").
- **Problem:**
  - unpdf output from `cv.pdf` differs from `cv.txt` in line breaks, joined lines, soft hyphens and spacing.
  - "Normalised" isn't defined: the keyword `normalise` from AD-5 is a different job.
  - Whether the hash is taken before or after `stripContactDetails` isn't stated either (the adapter runs after step 3 of AD-13).

  The likely outcome is that the Examiner uploads the example PDF (UJ-3 step 3; FR-27 says this must work) and gets "not available in Test mode". This is a divergence between the `cv` slice (extraction), the `ai` slice (cached lookup) and the fixture files.
- **Fix:**
  - Define `pairHash` in `shared/core/hashing`: SHA-256 of `canon(stripContactDetails(cv)) + '\n' + canon(ad)`, where `canon` applies NFC, lowercases, removes soft hyphens and collapses all whitespace, line breaks included, to one space.
  - Make each fixture's `cv.txt` the confirmed text from unpdf extraction of its `cv.pdf`, written by a script.
  - Add a Vitest test per Fixture: extract(`cv.pdf`), `cv.txt` and the «Bruk eksempelet» text give the same `pairHash`.

### H7. The UX documents (and PRD/addendum) cite the archived spine's AD numbers and names, which now conflict
- **Where:**
  - EXPERIENCE.md cites AD-3, AD-4, AD-5, AD-7, AD-13, AD-15, AD-17 and AD-18 with their old meanings.
  - EXPERIENCE.md also uses names that differ from the spine:

    | | EXPERIENCE.md | Spine |
    |---|---|---|
    | Messages file | `src/lib/messages.nb.ts` | `src/shared/ui/messages.nb.ts` |
    | RunMode accounts field | `RunMode.accountsEnabled` | `RunMode.features.accounts` |
    | Letter check endpoint | `/api/letter-check` | `/api/analyses/[id]/letter-check` |

  - In the PRD, OQ3 cites "spine AD-8" (now Application identity; persistence is AD-9) and OQ6 cites "spine AD-2" (vocabulary is now AD-5). Addendum lines 66 and 131 cite the same two.
- **Problem:** story writers read EXPERIENCE.md alongside the spine and will see two different names for the same thing. NFR-10 also requires changed IDs to be updated across the planning documents, and the Examiner grades traceability.
- **Fix:** in one commit that names the changed IDs:
  - map the old ADs to the new ones in EXPERIENCE.md, the PRD (OQ3 → AD-9, OQ6 → AD-5) and the addendum;
  - align the three names to the spine.

  Also state in AD-6 or AD-8 that a successful Gaps retry re-runs the letter-check, as EXPERIENCE.md already expects.

---

## Medium

### M1. No contract for session state and expiry (FR-18 warning and «Fortsett økten»)
- **Where:** AD-12 ("30 minutes, sliding … extends it at most once every 5 minutes"); AD-4's RunMode (no auth state).
- **Problem:** the client must warn two minutes before expiry. Because renewal is throttled to once every 5 minutes, the server's real expiry can be up to 5 minutes earlier than a 30-minute timer kept by the client, so the warning can arrive after the session is gone. Three things are missing:
  - a way for the UI to learn whether it is logged in, the Student's name and `expiresAt`;
  - a way to force renewal when the Student clicks «Fortsett økten»;
  - a code for an expired session.
- **Fix:**
  - `GET /api/session` returns `{ student: { name } | null, expiresAt }`.
  - Every authenticated response carries `expiresAt`, as an envelope `meta` or a header.
  - `POST /api/session/extend` renews and ignores the throttle.
  - The `shared/ui` timer uses only the server's `expiresAt`. A 401 `SESSION_EXPIRED` saves the draft (AD-16) and redirects.

### M2. AD-6's silent rerun on `ANALYSIS_STALE` loops against AD-8's `ON CONFLICT (id) DO NOTHING`
- **Where:** AD-6 last bullet; AD-8 Rule 2 (after accounts).
- **Problem:**
  - After accounts, a stale fingerprint (for example, the Profile CV edited in another tab) makes the client rerun phase 1 with the same `applicationId`. The insert does nothing and returns the old row and fingerprint, so phase 2 is stale again, without end.
  - `ON CONFLICT (id) DO NOTHING` also lets one Student's request touch an id that belongs to another Student, unless the code then looks it up by `(id, studentId)`.
  - The sources of phase-2 inputs after accounts aren't named. The Application row holds no CV text (FR-21).
- **Fix:**
  - Phase 1 uses `ON CONFLICT (id) DO UPDATE SET analysis = excluded.analysis, fingerprint = excluded.fingerprint WHERE applications.student_id = $studentId`, then reads by `(id, studentId)`; a miss is `NOT_FOUND`. Alternatively, the stale rerun always gets a new `applicationId`.
  - Add a `fingerprint` column.
  - Name the input sources after accounts: Job ad, title, employer and Tone come from `applications`, and the CV text comes from `profiles` at request time.

### M3. Local fallback for `ENCRYPTION_KEY` and how `setup` treats an existing `.env` are undefined
- **Where:** AD-3 ("Locally, anything missing falls back and is never fatal"); the Config convention (`npm run setup` writes `.env`).
- **Problem:**
  - A random fallback key combined with the file-backed PGlite means the data written today can't be read after the next restart.
  - Re-running `setup` would overwrite the key and do the same.
  - How the database driver is chosen, and where PGlite stores its files, isn't tied to any variable.
- **Fix:**
  - `setup` only fills in missing values and never overwrites them.
  - Missing `ENCRYPTION_KEY` with file-backed PGlite fails fast with "Run `npm run setup`". This is the one exception to "never fatal". An ephemeral key is allowed only when PGlite runs in memory.
  - The driver is `postgres` if and only if `DATABASE_URL` is set.
  - Add `PGLITE_DATA_DIR` (default `.data/pglite`) to the list of environment variables.

### M4. Runtime config has no stated mechanism; the HTTP status codes and the transport around the error envelope aren't fixed
- **Where:** AD-3 ("startup fails …"); AD-4 ("flags baked in at build time" is listed as prevented); AD-7 envelope.
- **Problem:**
  - Next has no startup hook other than `instrumentation.ts`.
  - A root layout that only reads config is prerendered at build time, which bakes RunMode and the flags into the build: the divergence AD-4 claims to prevent.
  - Responses that aren't the envelope (a Vercel 504 on timeout, a 413 over 4.5 MB, the proxy's 401) have no defined handling in the client.
  - Status codes per `MessageKey` aren't fixed.
- **Fix:**
  - `src/instrumentation.ts` `register()` loads config, so a misconfigured Hosted version throws at cold start.
  - The root layout opts into dynamic rendering (`await connection()`).
  - Add a status table: 400 validation, 401 `UNAUTHENTICATED` and `SESSION_EXPIRED`, 403 `ACCESS_REQUIRED`, 404 `NOT_FOUND`, 409 `ANALYSIS_STALE`, 429 `DAILY_CAP_REACHED` and `TOO_MANY_ATTEMPTS`, 502/503 `AI_UNAVAILABLE`, 500 `UNEXPECTED`.
  - `api-client` maps any response that isn't JSON, or doesn't parse, to `NETWORK_ERROR`.
  - The proxy's 401 uses the envelope.

### M5. The route inventory is incomplete, and where PDF extraction runs is undecided
- **Where:** the source tree lists only `api/analyses/*` and `api/health`; the `cv` slice says "unpdf extraction".
- **Problem:**
  - The access, extraction, auth, session, profile and history routes are unnamed, so the UI and server halves of a story, or two stories, can name them differently.
  - Running unpdf in the browser means the file never reaches the server (simplest for FR-23 and NFR-7). Running it on the server needs a multipart route. Nothing says which.
- **Fix:** add a short route table:
  - `POST /api/access`
  - `POST /api/cv/extract`, or "unpdf runs client-side; no upload route"
  - `POST /api/auth/register`, `/login` and `/logout`
  - `GET /api/session` and `POST /api/session/extend`
  - `GET` and `PUT /api/profile`
  - `GET /api/applications?page=` and `GET /api/applications/[id]`

### M6. CI doesn't gate production deploys
- **Where:** the deployment diagram and table (CI on pull requests; Vercel deploys on push to `main`).
- **Problem:** nothing stops a red pull request from being merged and deployed. Branch protection on a private repo needs a paid GitHub plan.
- **Fix:**
  - Also run `ci.yml` on `push: branches: [main]`.
  - Add the working rule "merge only when CI is green".
  - If the repository is public, turn on branch protection that requires the CI check.

### M7. The PRD §8.1 and FR-30 data-processing check isn't recorded
- **Where:** PRD §8.1 ("The architecture checks this (FR-30)"); the spine records the regions but no DPA or transfer-basis check. Supabase is a second sub-processor that §8.1 doesn't name.
- **Fix:** add a row to Deferred or the open questions, with owner Helene and the setup story in week 46: confirm that Vercel's DPA covers Hobby and that Supabase's DPA covers Free, record both in addendum §2, and name the fallback if either fails.

### M8. AD-1's core-purity rule has no enforcement beyond import rules
- **Where:** AD-1 Rule 3 (no `process.env`, `Date.now()`, `Math.random()` or `crypto.randomUUID()` in `core/`).
- **Problem:** `noRestrictedImports` can't see globals, so the rule is only checked in review, and it covers NFR-6 determinism.
- **Fix:**
  - Add a Biome `overrides` block for `src/modules/*/core/**` and `src/shared/core/**`. It turns on `noRestrictedGlobals` for `process` and `crypto`, and `noRestrictedImports` for `node:*`, `server-only`, `react` and `@/shared/server/**`.
  - Say that a ban on `Date.now`/`Math.random` is a review rule, backed by the Fixtures-run-twice test.

### M9. `core/` and `contracts.ts` dependency edges allow a cycle and an unstated leak
- **Where:** the dependency table ("own `core/`, `keywords/core`, `integrity/core`").
- **Problem:**
  - `integrity/core` uses `keywords/core`, and the table also lets `keywords/core` import `integrity/core`, which allows a cycle.
  - `contracts.ts` imports aren't constrained. A contract that imports from `server/` leaks server code into client bundles.
- **Fix:** add these edges to the table:
  - `keywords/core` imports only `shared/core`;
  - `integrity/core` imports `keywords/core` and `shared/core`;
  - `contracts.ts` imports only `zod`, `shared/core` and other slices' `contracts.ts`.

---

## Low

### L1. Diagram content doesn't match the table
- **Where:** the paradigm flowchart and the ER diagram.
- **Problem:**
  - The paradigm flowchart lacks the edges `routes → shared`, `sliceUi → sharedCore`, `sliceServer → other slices' index` and `routes → slice ui`.
  - The ER diagram has no `ACCESS_ATTEMPTS`.
  - `KEYWORD_LIST }o--o{ APPLICATION` isn't a stored relation: there is no FK, and the Job ad is encrypted.
- **Fix:** redraw both from the corrected table (H1, M9). Drop the KEYWORD_LIST edge, or label it "lookup by `contentHash`, no FK".

### L2. Access-code throttling costs time and prevents little
- **Problem:** the code is at least 16 random characters, so guessing it is already infeasible. The `access_attempts` table, IP hashing and their tests cost time for two users. Plain SHA-256 of an IPv4 address can also be reversed by brute force.
- **Fix:** throttle login attempts only, or leave the mechanism to a story in Epic 6. If IP hashing stays, use HMAC with a key derived from `ENCRYPTION_KEY`.

### L3. The slice skeleton suggests empty layers
- **Where:** the source tree line `<slice>/core/ server/ ui/ contracts.ts index.ts`.
- **Fix:** say "create a layer only when it has code" (`integrity` is core only, `match` has no server code, and `ai` has no ui). This saves a beginner from scaffolding thirty empty folders.

### L4. Cookie attributes
- **Problem:** a `Secure` cookie on `http://localhost` is rejected by some browsers, Safari among them.
- **Fix:**
  - Set `Secure` only when `hosted`.
  - Make `ja_access` a session cookie (no `Max-Age`) with httpOnly and SameSite=Lax, so it matches "once per browser session" (FR-31).

### L5. Provenance prose in the decisions
- **Where:** AD-2 Rule 1 (the list of technology.md parts left out) and the paradigm paragraph ("comes from technology.md").
- **Fix:** move these to the memlog. Keep the rule: "one Next.js app on Node; no second service".

### L6. Operations is missing three items
- **Fix:** add three bullets under Operations:
  - set the provider's monthly spend limit when the key is created (NFR-8; FR-25);
  - run a secret scan of the repository history before delivery, for example `gitleaks` as a CI step or a one-off check (NFR-7);
  - roll back with Vercel Instant Rollback, and keep migrations additive so an older build still runs.

  Also note that Hobby keeps runtime logs only briefly, so SM-6 relies on the provider's usage page, not on `LogEvent`.

### L7. No recorder for Cached responses
- **Where:** FR-27 requires the cached files to be recorded from live runs of the final prompts. §9.2 commits the live outputs.
- **Fix:** add `scripts/record-cached.ts` to the source tree. It runs the live adapter and writes the `contracts.ts` shape plus `AiResultMeta`, so the files the recorder writes always match what the cached adapter reads.

### L8. How local migrations run and how the database driver loads
- **Fix:**
  - `npm run db:migrate` works for both drivers, with drizzle.config switching on `DATABASE_URL`.
  - `db.ts` loads PGlite with a dynamic import, so the Hosted bundle never loads the WASM.
  - postgres-js uses a small `max` on Fluid compute.

### L9. The FR-15 citation check must not use the keyword normaliser
- **Where:** AD-14 ("every check compares words through `keywords/core` only").
- **Problem:** routing FR-15 through `normalise`/`stem` folds hyphens and inflections, which is looser than FR-15's "word for word, ignoring case and whitespace".
- **Fix:** `keywords/core` exports a separate `canonForCitation` (case and whitespace only), and `checkCitation` uses it.

### L10. `sessionStorage` is per tab
- **Problem:** before accounts, `noticeAccepted` reappears in a new tab, which is stricter than "once per browser session" (FR-24).
- **Fix:** accept this and note it in AD-16, or keep the flag in a session cookie.
