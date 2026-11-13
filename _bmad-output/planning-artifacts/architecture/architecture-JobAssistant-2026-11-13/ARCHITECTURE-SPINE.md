---
name: 'JobAssistant v1'
type: architecture-spine
purpose: build-substrate
altitude: feature
paradigm: 'modular monolith of vertical slices, each with a functional core and an imperative shell, in one Next.js app'
scope: 'JobAssistant v1, S1–S7 (FR-1–FR-31, FR-5b, NFR-1–NFR-11): the local Test-mode run and the Vercel Hosted version'
status: final
created: '2026-11-13'
updated: '2026-11-13'
binds: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-5b, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25, FR-26, FR-27, FR-28, FR-29, FR-30, FR-31, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6, NFR-7, NFR-8, NFR-9, NFR-10, NFR-11]
sources:
  - ../../prds/prd-JobAssistant-2026-10-31/prd.md
  - ../../prds/prd-JobAssistant-2026-10-31/addendum.md
  - ../../ux-designs/ux-JobAssistant-2026-11-09/EXPERIENCE.md
  - ../../ux-designs/ux-JobAssistant-2026-11-09/DESIGN.md
  - ../technology.md
companions: []
---

# Architecture Spine — JobAssistant v1

## Design Paradigm

**A modular monolith of vertical slices, each with a functional core and an imperative shell, in one Next.js app.** Each slice is a folder, `src/modules/<slice>/`, with up to three layers:
- `core/`: pure functions, with no I/O.
- `server/`: the shell, with I/O, persistence and adapters.
- `ui/`: client components.

A layer exists only once it has code. `integrity` is core only, and `ai` has no UI.

Slices: `cv`, `keywords`, `match`, `letter`, `gaps`, `integrity`, `ai`, `application`, `identity`, `profile`. Shared kernel: `src/shared/{core,server,ui}`.

**Public entry points of a slice** (nothing else is imported from outside it):

| Entry | Contains | Imported by |
|---|---|---|
| `index.ts` | the server API (`import 'server-only'`) | routes and other slices' `server/` |
| `contracts.ts` | zod schemas and types, isomorphic | anyone |
| `ui/index.ts` | client components and hooks | routes (pages) and other slices' `ui/` |
| `core/index.ts` | pure functions, only for `keywords` and `integrity` | other slices' `core/` and `server/` |

**Allowed server imports between slices** (A → B means A may import B's `index.ts`):

```mermaid
flowchart LR
  application --> letter
  application --> gaps
  application --> match
  application --> profile
  application --> identity
  letter --> ai
  gaps --> ai
  keywords --> ai
  match --> keywords
  application --> keywords
  application --> cv
  profile --> identity
```

**Layer dependencies**

```mermaid
flowchart TD
  routes["src/app pages and api handlers"] --> sliceIndex["slice index.ts (server API)"]
  routes --> sliceUi["slice ui/index.ts"]
  sliceIndex --> sliceCore["own core/"]
  sliceIndex --> contracts["contracts.ts (zod)"]
  sliceIndex --> sharedServer["shared/server: config, db, crypto, log, handle"]
  sliceUi --> contracts
  sliceUi --> sharedUi["shared/ui: api-client, client-session, messages.nb.ts, RunMode, announce"]
  sliceCore --> integrityCore["integrity/core"]
  sliceCore --> keywordsCore["keywords/core"]
  integrityCore --> keywordsCore
  keywordsCore --> sharedCore["shared/core: Result, MessageKey, canon, hashing, time"]
  contracts --> sharedCore
  sharedServer --> sharedCore
  sharedUi --> sharedCore
```

## Invariants & Rules

### AD-1 — Slice boundaries and core purity

- **Binds:** all; NFR-6, NFR-11
- **Prevents:** import cycles between slices, server code leaking into the client bundle, and pure logic that reads the clock or the environment.
- **Rule:**
  - **Imports:**
    - Code imports a slice only through the entry points in the table above, and only along the edges in the two diagrams.
    - `keywords/core` imports only `shared/core`. `integrity/core` imports only `keywords/core` and `shared/core`.
    - Biome `noRestrictedImports` enforces both rules.
  - **Purity:**
    - `core/` never touches I/O, `process.env`, `Date.now()`, `Math.random()` or `crypto.randomUUID()`. A time or an id comes in as a parameter.
    - This is a review rule, backed by the NFR-6 test that runs every Fixture twice.
  - **`server-only`:**
    - Every `index.ts` and every file in `server/` starts with `import 'server-only'`, except files that drizzle-kit loads: `server/schema.ts` and `shared/server/crypto.ts`, which reads its key lazily, never at import.
    - Vitest aliases `server-only` to an empty module.
    - Scripts run with `tsx --conditions=react-server`.

### AD-2 — One app, one deployable, one way in for data

- **Binds:** NFR-9, FR-30, NFR-7
- **Prevents:** a second runtime or service creeping in, and two styles of server call splitting the data path.
- **Rule:**
  - One Next.js app on Node. Its only companion service is Postgres: the local container (AD-17) or Supabase (AD-9).
  - Client components read and write data only through the JSON route handlers in the Route inventory, called through `src/shared/ui/api-client.ts`.
  - There are no Server Actions.
  - Pages are server components that render shells and pass static data as props (the Example pair, AD-15). Søknad, Profil and Historikk are client components.

### AD-3 — Adapters chosen by config (mock fallback)

- **Binds:** FR-27, FR-24, FR-25, NFR-8, NFR-9, NFR-7
- **Prevents:** a missing key crashing the local run, a test making a paid AI request, the FR-24 and FR-25 tests being impossible to write, and a Hosted version starting half-configured.
- **Rule:**
  - Config chooses each adapter and the Test-mode flag independently:
    - `config.ai.adapter` is `live` | `cached` | `mock`.
    - `config.testMode` controls the banner, skips the notice and skips the cap.
    - `config.db` comes from the scheme of `DATABASE_URL`: `postgres://` or `postgresql://` gives `postgres`, and `pglite://memory` gives `pglite`, which only tests use. TLS settings come only from the URL (`?sslmode=require` on Supabase).
  - With no AI key, or with `TEST_MODE=true`, the app runs with `testMode = true` and `adapter = cached`.
  - Tests may run `adapter = mock` with `testMode = false` to exercise the notice and the cap.
  - **Test runs:** `config.isTestRun` is true under Vitest, and under Playwright through its fixed `webServer.env`. When it is true:
    - config ignores `SECRETS_FILE`;
    - config treats any AI key as absent;
    - config throws if `config.db` is `postgres`;
    - the AI factory throws if it would return `live`.
  - **Hosted detection:** `VERCEL=1` without `APP_ENV=hosted` is a startup error. `/api/health` returns `{ hosted }`.
  - On Hosted (`APP_ENV=hosted`), startup fails when a required setting is missing:
    - always: `ACCESS_CODE` (16 characters or more) and `DATABASE_URL`;
    - once `AI_PROVIDER` is set: the AI key;
    - once `features.accounts` is on: `ENCRYPTION_KEY`.
  - Before S3, Hosted runs with the AI sections unavailable. `TEST_MODE=true` with `APP_ENV=hosted` is a startup error.
  - **Local fallbacks:** a missing setting falls back and is never fatal, with one exception.
    - A missing AI key gives Test mode.
    - Config never invents `ENCRYPTION_KEY`. Setup creates it in `SECRETS_FILE` (AD-17). With accounts on and no key, the local run stops and says to run setup.

### AD-4 — One config, a per-request RunMode, and feature flags for the build order

- **Binds:** PRD §5.1 (build order, cuts 1–3), FR-18, FR-24, FR-25, FR-27, FR-31, D20, D22
- **Prevents:** two slices disagreeing about whether accounts exist, run state baked in at `next build`, and a cut leaving dead branches.
- **Rule:**
  - **Config:** `src/shared/server/config.ts` is a lazy, memoised getter that parses the environment with zod.
    - It is the only reader of `process.env`, and the only reader of `SECRETS_FILE`. When `APP_ENV=local` and not `isTestRun`, it merges that file (dotenv format) under `process.env`, and `process.env` wins.
    - There are no `NEXT_PUBLIC_` variables.
    - Route files read config only inside handlers, never at module top level, and `next.config.ts` reads no environment. That way the Docker image and Vercel behave the same.
  - **RunMode:**
    - The root layout calls `await connection()` and sends `RunMode` to one client context:
      `{ testMode, hosted, features: { accounts, gaps, rewording, keywordFallback }, aiNotice: { version, providerName, retentionDays } }`.
    - RunMode carries config only. Session data comes from `GET /api/session` (AD-12).
  - **Feature flags:** each one gates a build step or a planned decision.
    - `FEATURE_ACCOUNTS` gates S6 and S7 together.
    - `FEATURE_GAPS` gates S4.
    - `FEATURE_REWORDING` gates S5.
    - `FEATURE_KEYWORD_FALLBACK` gates FR-5b.
  - **Flag defaults** live only in `config.ts` (`FEATURE_DEFAULTS`).
    - A flag is off until the last story of its epic switches its default on.
    - `compose.yaml`, `.env.example` and the README never set `FEATURE_*`. The environment only overrides a default, on Vercel or for a cut.
    - A cut means the flag stays off.
  - Code checks flags only through `config.features` (server) or `RunMode.features` (client).
  - `aiNotice.version` changes whenever the provider, the retention period or `keywordFallback` changes.

### AD-5 — The Keyword engine is the only judge of "the same word"

- **Binds:** FR-4, FR-5, FR-5b, FR-6, FR-7, FR-8, FR-11, FR-17, NFR-6
- **Prevents:** the score and the guards disagreeing about whether two words are the same, the UI re-deriving where Keywords sit in the ad, and the FR-5b decision forcing a rewrite.
- **Rule:**
  - **What `keywords/core` owns:**
    - the single `normalise`/`stem` pipeline: case, æøå, hyphens and spaces, then a small suffix pre-step for the noun forms Snowball misses (utvikler, utviklere, utviklerne), then Snowball Norwegian (`@orama/stemmers/norwegian`). A test table of forms pins it down early in Epic 2;
    - the compound and alias rules;
    - `extractKeywords(adText, vocabulary)` and `findKeyword(text, keyword)`.
  - These functions are synchronous and pure. Nothing else stems or compares words.
  - **Vocabulary:** versioned JSON in `data/vocabulary/`, carrying a `vocabularyVersion`. The shell loads it and passes it in.
  - **Output:** each `Keyword` carries its match stage (`exact` | `inflection` | `compound` | `alias`) and its positions in the ad (`{ paragraph, start, end }[]`), so the pulse plot needs no word logic of its own.
  - **`KeywordSource.resolve(jobAd, ctx)`** in `keywords/server` is the only way Keywords reach `match`. It returns `{ keywords, keywordSource }`:
    - `'code'`: from the vocabulary;
    - `'saved'`: an AI-proposed list kept in `keyword_lists` under `contentHash(jobAd)`;
    - `'code-fallback'`: FR-5b applies, but AI wasn't allowed or failed.
  - **FR-5b, when `features.keywordFallback` is on:**
    - A cache miss makes one `runAi` request (AD-13) for the keyword list, and only when the notice is accepted, the mode isn't Test mode, and the cap allows it. Otherwise the result is `code-fallback`.
    - Every AI-proposed Keyword must pass `findKeyword` against the ad.

### AD-6 — Two-phase analysis API with one request shape

- **Binds:** FR-3, FR-8, FR-9, FR-11, FR-12, FR-13, FR-20, NFR-4, NFR-5, D19
- **Prevents:** one AI failure taking the score with it, a request shape that flips at S6, client and server hashing differently, the Letter waiting on the Gaps, and the FR-11 check running on old data.
- **Rule:**
  - **One request shape.** Every analysis request carries `{ applicationId, fingerprint?, inputs: AnalysisInputs }`, before and after S6. `AnalysisInputs` is `{ cvText, jobAd, jobTitle, employer }`, raw inputs only.
    - Phase-2 requests also carry `consent: { noticeVersion }` before accounts (AD-13), and the Letter request carries `tone`.
    - After accounts, the client fills `cvText` from the Profile (AD-16), and the server also checks that the row `(applicationId, studentId)` exists.
  - **The fingerprint.** Only the server computes it, in `application/core`, as `sha256(canon(cvText, jobAd, jobTitle, employer) + vocabularyVersion + keywordSource + contractVersion)`. Tone is excluded. The client treats it as opaque.
  - **Phase 1:** `POST /api/analyses`. It validates, resolves Keywords, matches and scores, and returns `AnalysisResult` (with `keywordSource`) and the `fingerprint`. Like every AI route, it sets `maxDuration = 120` as a literal; the value does nothing when no AI request runs.
  - **Phase 2:** `POST /api/analyses/[id]/letter` and `POST /api/analyses/[id]/gaps`, sent in parallel.
    - The server recomputes phase 1 from `inputs` (pure and cheap). It never trusts derived data from the client.
    - On a fingerprint mismatch it returns `ANALYSIS_STALE`.
    - Each route makes exactly one AI request with its own 90 s abort, sets `maxDuration = 120`, and can be retried on its own.
  - **The FR-11 check:** `POST /api/analyses/[id]/letter-check`, with body `{ applicationId, fingerprint, inputs, letter, gaps | null, letterRev, gapsRev }`.
    - The server runs `checkCitation` again on every Rewordable gap it receives before applying FR-11.
    - It is sent when the Letter has arrived and the Gaps have settled. `gaps` is `null` when Gap analysis failed or `features.gaps` is off.
    - It is sent again after a Gaps retry succeeds and after «Lag nytt utkast».
  - **The client side:**
    - The Letter is shown as soon as it arrives, and the flags are added when the check returns.
    - A failed check leaves the Letter on screen with the "not checked" notice and a retry for the check only.
    - On `ANALYSIS_STALE` the client reruns phase 1 once without telling the Student, then resends phase 2. A second `ANALYSIS_STALE` shows the section error.

```mermaid
sequenceDiagram
  participant C as Client (Søknad)
  participant A as /api/analyses
  participant AI as ai.runAi
  C->>A: POST (applicationId, inputs)
  A-->>C: AnalysisResult + fingerprint
  par Letter
    C->>A: POST /[id]/letter (inputs, fingerprint, tone, consent)
    A->>AI: one request (90 s)
    A-->>C: Letter (shown at once) or error code
  and Gaps
    C->>A: POST /[id]/gaps (inputs, fingerprint, consent)
    A->>AI: one request (90 s)
    A-->>C: Gap[] after FR-15 and FR-17, or error code
  end
  C->>A: POST /[id]/letter-check (letter, gaps or null, revs)
  A-->>C: LetterCheck (FR-11 flags added to the Letter)
```

### AD-7 — Shared contracts, error codes and the Letter sign-off

- **Binds:** NFR-1, NFR-5, FR-7, FR-8, FR-9, FR-12, FR-13, FR-14, FR-16, FR-27
- **Prevents:**
  - the client and the server parsing different shapes;
  - Norwegian text spread across the server;
  - sections disagreeing on how to report an AI failure;
  - the Gap shape changing between S4 and S5;
  - the sign-off being built in three places.
- **Rule:**
  - **Contracts:**
    - Each slice's zod schemas in `contracts.ts` are the only wire and storage shapes.
    - `AiResultMeta { source, provider, model, promptVersion, createdAt }` and `AiOutput<T> = { data: T, meta }` live in `ai/contracts.ts` only.
  - **Fixed shapes:**
    - `Gap = { keyword, kind: 'rewordable' | 'real', explanation: { text } | { key, params }, citation: string | null, suggestion: string | null }`
    - `Letter = { text, tone, rev }`
    - `LetterCheck = { flags, letterRev, gapsRev }`
  - **Envelope:**
    - Every response is `{ ok: true, data }` or `{ ok: false, error: { code: MessageKey, field?, retryable } }`.
    - HTTP status per code: validation 400, `SESSION_EXPIRED` and `ACCESS_REQUIRED` 401, `NOT_FOUND` 404, `ANALYSIS_STALE` 409, `DAILY_CAP_REACHED` 429, AI failures 502, `UNEXPECTED` 500.
  - **Codes the UI branches on:**
    - `AI_TIMEOUT`, `AI_PROVIDER_ERROR`, `DAILY_CAP_REACHED`, `TEST_MODE_UNAVAILABLE` (not retryable; the score stays), `AI_NOTICE_REQUIRED`, `ANALYSIS_STALE`, `SESSION_EXPIRED`, `ACCESS_REQUIRED`, `NOT_FOUND`;
    - `NETWORK_ERROR`, set by `api-client` when the fetch fails or the body isn't JSON.
  - **Text:**
    - The server sends no Norwegian prose except AI content fields. Template text (FR-8, the Real-gap template) travels as `{ key, params }`.
    - Every UI string is in `src/shared/ui/messages.nb.ts`.
  - **Verdict:** only `match/core` derives it, from the rounded score. It is never stored.
  - **Sign-off:**
    - A Letter is stored and sent with exactly one `{{SIGNATUR}}` token, and the name is never sent to the AI. `letter/server` normalises the token: it adds it if missing and replaces any other sign-off.
    - `letter/core` `renderLetter(text, name | null)` and `letterFileName(meta, name | null)` serve screen, copy and .docx. With no name, the placeholder is «[Navnet ditt]».
    - The .docx is built in the browser by every caller.

### AD-8 — Application identity and write model

- **Binds:** FR-12, FR-21, NFR-5
- **Prevents:** duplicate Applications on a double submit, a stale rerun looping, a late check storing Letter 1's flags on Letter 2, and two sources for a number or a score.
- **Rule:**
  - **Identity:**
    - The client creates `applicationId` with `crypto.randomUUID()` when the inputs are confirmed. It keeps the id in `ja.session.v1` and reuses it until the inputs change.
    - Submit is disabled while a request is in flight, and each section allows one mutation in flight.
  - **Storage (after accounts):** one `applications` row with:
    - `job`: Job ad, job title, employer;
    - `analysis`, `gaps`, `letter`, `letter_check`;
    - plain columns: `fingerprint`, `seq`, `match_score`, `letter_rev`, `gaps_rev`, timestamps.
  - The CV text is never stored on an Application.
  - **Phase 1** runs `INSERT … ON CONFLICT (id) DO UPDATE` with new `job`, `analysis` and `fingerprint` and cleared AI columns, `WHERE applications.fingerprint <> excluded.fingerprint AND applications.student_id = $student`. A true double submit is therefore a no-op.
  - **Who writes what:**
    - The Letter route writes `letter` and increments `letter_rev`, on success only, so a failed «Lag nytt utkast» keeps the old Letter.
    - The Gaps route writes `gaps` and increments `gaps_rev`.
    - The check writes `letter_check` only `WHERE letter_rev = $1 AND gaps_rev = $2`.
    - The client drops a check result whose revs don't match what it shows.
  - **Derived values:**
    - `seq` is assigned in the phase-1 insert as `max(seq) + 1` for the Student, under `UNIQUE (student_id, seq)`, with a retry on conflict. `application/core` formats it as `JA-NNN`.
    - `match_score` is written from `analysis.score` in the same statement, and History reads only the column.
  - **Reopening:** a reopened Application is a read-only snapshot with no regeneration.
    - A `null` section shows "Ikke laget." (hidden when its feature is off).
    - A Letter without a matching `letter_check` shows "not checked".

### AD-9 — Persistence: Drizzle on Postgres 17 everywhere

- **Binds:** FR-20, FR-21, FR-22, FR-25, FR-5b, FR-30, NFR-9
- **Prevents:** different databases locally and on Hosted, tests that need a database server, and migration histories that clash across story branches.
- **Rule:**
  - **Schema:**
    - Drizzle ORM throughout. Each table is defined in its owning slice's `server/schema.ts`, and other slices' schema files reference `students(id)` only through a read-only `studentIdRef`.
    - Every `student_id` is `uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE`.
  - **Migrations:**
    - One drizzle-kit history in `drizzle/`, committed as SQL.
    - Migrations are generated only on a branch rebased on `main` just before merge.
    - CI runs `drizzle-kit check` and a from-zero migration on PGlite.
    - `scripts/migrate.ts` is the only way migrations are applied. It uses Drizzle's migrator with the driver from `config.db`, and setup, the Vercel build (`db:migrate`) and CI all call it.
    - `drizzle.config.ts` has no credentials and serves only `generate` and `check`.
  - **Local run:** Postgres 17 in the `db` container (AD-17), through `postgres` (postgres-js). Setup applies the migrations every time the `app` container starts.
  - **Tests:** Vitest and the Playwright web server use PGlite (`DATABASE_URL=pglite://memory`), with one in-memory instance per process.
    - `shared/server/db.ts` applies the migrations when it first opens PGlite. Under `E2E=1` it also runs the same `seedTestUser` as setup.
    - `@electric-sql/pglite` is listed in `serverExternalPackages`.
  - **Driver differences:** database code uses Drizzle's query builder, with `.returning()`. Raw `sql` runs only through `db.ts` helpers that normalise results, and every aggregate is cast (`count(*)::int`). This keeps postgres-js and PGlite results the same shape.
  - **Hosted:** Supabase Postgres Free in Frankfurt (`eu-central-1`), through `postgres` (postgres-js).
    - `DATABASE_URL` points at the session pooler (port 5432), opened with `{ max: 1, idle_timeout: 20 }`. The transaction pooler is never used, because postgres-js pipelining there can return mismatched rows.
    - The Vercel build step runs the migrations over the same URL.
    - `DATABASE_URL` is set only for Vercel's Production environment.
  - **Supabase settings:** a plain database. The Data API is off, RLS is on with no policies, and `supabase-js` is not used.

### AD-10 — Data ownership and isolation

- **Binds:** FR-18, FR-19, FR-20, NFR-7
- **Prevents:** two slices writing one table, two owners of the Student's name, and an id from a URL or a body opening another Student's data.
- **Rule:**
  - **Table ownership.** Only the owning slice writes a table:

    | Slice | Tables |
    |---|---|
    | `identity` | `students` (email, password hash), `sessions` |
    | `profile` | `profiles` (name, CV text, `ai_notice_version`) |
    | `application` | `applications` |
    | `ai` | `ai_usage` |
    | `keywords` | `keyword_lists` |

  - **The name** lives only in `profiles.name`.
  - **Registration** runs `identity.createStudent(tx)` and `profile.createProfile(tx, name)` in one transaction. Repository functions accept an optional `tx`.
  - **Isolation:**
    - Every Student-owned row has `student_id`. The exceptions are `ai_usage` (scope text, no foreign key) and `keyword_lists` (no Student data).
    - A repository function takes `studentId` from the session as its first parameter, never from the body or the URL.
    - It looks rows up by `(id, studentId)`. A miss returns `NOT_FOUND`, the same as an id that doesn't exist.

### AD-11 — Encryption at rest and password hashing

- **Binds:** FR-22, FR-23, NFR-7
- **Prevents:** a personal field stored in plain text, two encryption formats, and one old row breaking the whole History query.
- **Rule:**
  - **Encryption:**
    - AES-256-GCM through `node:crypto`, with one 32-byte `ENCRYPTION_KEY` (base64).
    - The stored form is `v1.<iv>.<tag>.<ciphertext>` in base64url.
  - **Write path:**
    - Personal fields go through `encryptedText` and `encryptedJson` in `src/shared/server/crypto.ts`, and nothing else.
    - `encryptedJson` decodes to `{ contractVersion, data: unknown }`, with the version inside the ciphertext only.
    - The owning repository parses `data` per version. A section that fails to parse becomes unavailable and never fails the query.
  - **Plain-text columns:** ids, email (lower-cased), timestamps, `match_score`, `seq`, revs, `fingerprint`, counters, `ai_notice_version`, and `keyword_lists`. The last has no Student data; FR-22's "keyword lists" means the `analysis` column.
  - **Key wiring:** `crypto.ts` never imports config. `db.ts` calls `initCrypto(config.encryptionKey)` when it first opens, and `encryptedText` throws if it is used before that.
  - **Local key check:** setup stores `sha256(ENCRYPTION_KEY)` in the one-row `local_meta` table. On every later start, a different hash stops setup with "the key doesn't match this database: run `docker compose down -v` and delete `.data/`".
  - **Passwords:** `node:crypto` scrypt with a random 16-byte salt per Student, stored as `scrypt$N$r$p$salt$hash`. `[ASSUMPTION]`

### AD-12 — Sessions, accounts and the Access code

- **Binds:** FR-18, FR-29, FR-31, NFR-2, NFR-7
- **Prevents:** two session mechanisms, an expiry warning timed from the wrong clock, the gate blocking its own health check, and a Hosted version reachable without the code.
- **Rule:**
  - **Sessions** `[ASSUMPTION]`: built by hand, with no auth library.
    - The session is an opaque 32-byte random token in the cookie `ja_sid` (httpOnly, SameSite=Lax, Secure when hosted). The database stores only its SHA-256 hash.
    - Inactivity ends a session after 30 minutes. Server requests extend it at most once every 5 minutes. `POST /api/session/renew` always extends it.
    - Every authenticated response carries the header `X-Session-Expires-At`. The client schedules the expiry warning from that value, 2 minutes before it.
    - `GET /api/session` returns `SessionView { studentId, name, email, noticeVersion, expiresAt }` (TanStack Query key `['session']`).
    - «Logg ut» deletes the row.
  - **The Access code before accounts:** `src/proxy.ts` requires the cookie `ja_access` = HMAC-SHA256(`ACCESS_CODE`, `"ja_access.v1"`). It is a session cookie (no Max-Age), httpOnly, SameSite=Lax, Secure.
    - Exempt: `/tilgang`, `/api/access`, `/api/health` and static assets.
    - Pages redirect to `/tilgang`, and `/api` gets 401 `ACCESS_REQUIRED`.
  - **The Access code after accounts:** checked at registration only, and only when hosted.
  - **Testing the gate:** the gate decision is a pure `gateDecision({ hosted, accountsOn, path, cookieValid })` in `identity/core`, unit-tested in Vitest. `proxy.ts` only wires it up.
  - **Test user:** `seedTestUser` (owned by `identity` and `profile`) creates it (FR-29). Setup runs it only under three conditions:
    - `features.accounts` is on;
    - `APP_ENV=local`;
    - the `DATABASE_URL` host is `db`, `127.0.0.1` or `localhost`.
  - On every run, the seed upserts the test user's Profile CV from the Example pair.

```mermaid
flowchart LR
  req[Request] --> proxy{"proxy.ts: hosted and accounts off?"}
  proxy -- "no" --> app[Route]
  proxy -- "yes, exempt path" --> app
  proxy -- "yes, valid ja_access" --> app
  proxy -- "yes, no cookie, page" --> gate["/tilgang"]
  proxy -- "yes, no cookie, api" --> e401["401 ACCESS_REQUIRED"]
  app --> auth{"accounts on and Student route?"}
  auth -- "valid ja_sid" --> handler["Handler with studentId"]
  auth -- "missing or expired" --> login["401 SESSION_EXPIRED, client goes to Logg inn"]
```

### AD-13 — One pipeline for every AI request

- **Binds:** FR-5b, FR-23, FR-24, FR-25, FR-26, FR-27, NFR-4, NFR-8
- **Prevents:** a request that skips the notice, the cap or contact stripping; contact details hidden inside a finished prompt string; cap races; a caller-chosen cap scope; and prompt content in logs.
- **Rule:**
  - Every AI request goes through `ai/server` `runAi(request, ctx)`, and nowhere else.
    - `request = { task, cvText?, jobAd, tone?, jobTitle?, employer?, buildPrompt(sentCvText), schema }`
    - `ctx = { studentId: string | null, consent: { noticeVersion } | null }`
    - Slices never pass a finished prompt string.
  - **Steps, in order:**
    1. **Lookup key:** computed from the *unstripped* inputs (AD-15).
    2. **Notice:** `ctx.consent.noticeVersion` must equal `config.aiNotice.version`, or the request fails with `AI_NOTICE_REQUIRED`.
       - After accounts, the caller fills `consent` from `profiles.ai_notice_version`.
       - The step is skipped when `testMode` is on.
    3. **Daily cap:** one atomic reservation, `UPDATE ai_usage SET count = count + 1 WHERE scope = $1 AND day = $2 AND count < 30 RETURNING count`, after an upsert of the row.
       - `scope` is `ctx.studentId ?? 'installation'`, and no caller passes a scope.
       - `day` is the Oslo date from `shared/core/time`.
       - A failed request gets no refund, and the step is skipped when `testMode` is on.
    4. **Contact stripping:** `stripContactDetails(cvText)` (FR-26) deletes spans and inserts nothing. The result is `sentCvText`.
    5. **Prompt and adapter:** `buildPrompt(sentCvText)`, then the adapter with a 90 s `AbortSignal` and SDK retries set to 0.
    6. **Log:** exactly one `LogEvent` with task, provider, model, token counts, duration and error code. It never holds content.
  - **Return value:** `AiOutput<T>` plus `sentCvText`. The guards check citations against `sentCvText`.
  - **Logging:**
    - `log()` in `shared/server/log.ts` takes only the `LogEvent` union.
    - Biome `noConsole` is an error everywhere else.
    - Every route handler is wrapped in `shared/server/handle()`, which catches all errors and logs only `{ code, errorName, route }`, never the error object or its message.

### AD-14 — The integrity slice owns every check of AI output

- **Binds:** FR-10, FR-11, FR-13, FR-15, FR-16, FR-17, SM-3
- **Prevents:** three guards with three word lists, a loosened word-for-word citation check, two CV-entry splitters, and `letter` and `gaps` depending on each other.
- **Rule:**
  - **What `integrity/core` holds:**
    - the checks: `checkLetter` (FR-11), `checkCitation` (FR-15), `checkSuggestion` (FR-17) and `checkTone` (FR-10);
    - `cvEntries(text)`;
    - the code lists: Upgrade words, anecdote markers and motivation phrases.
  - It takes its own structural inputs, such as `CheckableGap { keyword, kind, citation }`, and imports neither `letter` nor `gaps`.
  - **Word comparison:**
    - `checkCitation` is a substring test on `canonVerbatim` text (case and whitespace only, `shared/core`), against `sentCvText`.
    - The other checks compare words through `keywords/core`.
    - `checkLetter` skips the job title, the employer and `{{SIGNATUR}}`.
  - **Order in `gaps/server`**, before the Gaps are returned:
    1. It returns exactly one Gap per Missing keyword, in order. It drops extra AI items, and a skipped Keyword becomes a template Real gap.
    2. FR-15 runs. A Gap that fails it is downgraded to the Real-gap template.
    3. FR-17 runs. A suggestion that fails it becomes `null`, and the citation and explanation stay.
    4. When `features.rewording` is off, every `suggestion` is set to `null` and FR-17 is skipped.
  - Downgrades and discards are logged as counts only.
  - **Tone rules:** `checkTone` runs only in the automated tests (the Cached Letter for each Tone) and in `scripts/qa-compare.ts`. It is never shown to the Student and never triggers a retry. `[ASSUMPTION]`

### AD-15 — Fixtures, Cached responses and prompt versions

- **Binds:** FR-27, FR-28, FR-9, FR-10, SM-2, SM-3, NFR-6
- **Prevents:** Test mode missing the Example pair, the recorder and the reader using different shapes, and Cached responses that no longer match the prompts.
- **Rule:**
  - **Fixture folders:** `data/fixtures/<id>/`, holding:
    - `cv.txt`, `cv.pdf` where it exists, `ad.txt`, `meta.json` (job title, employer) and `answer-key.json`;
    - `cached/`: `letter-formell.json`, `letter-personlig.json`, `letter-direkte.json` and `gaps.json`, plus `keywords.json` only if FR-5b applies.
  - **Cached file contents:** exactly the `AiOutput<T>` shape (raw adapter output, before any guard), written only by `scripts/record-cached.ts`.
  - **Planted responses:** bad outputs live in `data/fixtures/_planted/`, and only tests read them.
  - **Reading `data/` at runtime:** only through `shared/server/data-files.ts`, which also loads the vocabulary for AD-5. `next.config.ts` sets `outputFileTracingIncludes` for `./data/vocabulary/**` and the Example pair's folder, so Vercel's functions get the files. `_planted/` is never traced.
  - **Generated text files:** `cv.txt` is written by a script from `unpdf` extraction of `cv.pdf`, where one exists.
  - **Lookup keys,** computed in `runAi` before stripping, with `canon` = NFC, CRLF→LF, trim, collapse whitespace:
    - Letter: `sha256(canon(cv), canon(ad), canon(jobTitle), canon(employer), tone)`
    - Gaps: `sha256(canon(cv), canon(ad))`
    - Keywords: `contentHash(canon(ad))`
  - **Index:** each Fixture is registered under the hash of `cv.txt` and, where one exists, of `extract(cv.pdf)`. A test asserts that `cv.pdf`, `cv.txt` and «Bruk eksempelet» give the same key.
  - **Miss:** a Test-mode lookup miss returns `TEST_MODE_UNAVAILABLE`.
  - **Prompt versions:**
    - Prompts live in `<slice>/server/prompts/` with a `PROMPT_VERSION` constant.
    - There is one gaps prompt, which asks for suggestions. `gaps.json` is re-recorded once, when S5 lands.
    - CI fails when the Example pair's cached `promptVersion` differs from the current one.

### AD-16 — Client state

- **Binds:** FR-3, FR-18, FR-20, FR-24, NFR-5
- **Prevents:** inputs lost on refresh or expiry, a stale browser copy of the CV text winning over the Profile, and logout leaving the CV text behind.
- **Rule:**
  - **The browser key.** One `sessionStorage` key, `ja.session.v1`, through `src/shared/ui/client-session.ts` only:
    `{ v, applicationId?, inputs: { cvText?, cvDraft?, jobAd?, jobTitle?, employer?, tone }, noticeVersion?, lastEmail?, restoredAfterExpiry? }`
  - **Lifecycle:**
    - «Logg ut» clears everything except `jobAd`, `jobTitle`, `employer` and `tone`.
    - On `SESSION_EXPIRED`, `api-client` saves the session (including `cvDraft`) and sends the Student to «Logg inn».
    - `sessionStorage` is per tab. That is accepted.
  - **The CV text:**
    - With `features.accounts` on, Søknad takes the CV text from the Profile query.
    - `inputs.cvText` is then used only as a one-off override from «Bruk eksempelet». It is never saved to the Profile, and it is cleared at login.
  - **Server state:** lives in TanStack Query, with one mutation per phase-2 section.
  - There is no other global store.

### AD-17 — The local run is Docker Compose

- **Binds:** NFR-9, NFR-6, NFR-7, FR-27, FR-29, UJ-3
- **Prevents:** the skeleton story, the setup story and the test story each inventing their own way to run, seed and test; secrets or line-ending problems on Windows; and Docker files leaking into the Vercel build.
- **Rule:**
  - **One file:** `compose.yaml` in the repository root, with the top-level `name: jobassistant` and three services.

    | Service | Built from | Rule |
    |---|---|---|
    | `db` | image `postgres:17.12-alpine` | Fixed local credentials (`jobassistant` / `jobassistant`, database `jobassistant`); they are not secrets. Named volume `pgdata`, healthcheck `pg_isready`. Published only on `127.0.0.1:54320`, for the developer loop. `app` never uses a host port. |
    | `app` | `Dockerfile`, target `app` | Waits for a healthy `db`. Sets `APP_ENV=local`, `DATABASE_URL=postgres://jobassistant:jobassistant@db:5432/jobassistant` and `SECRETS_FILE=/data/secrets.env` (volume `appdata`). Reads an optional `.env` (`env_file` with `required: false`) for a live AI key. Healthcheck: `node -e "fetch('http://127.0.0.1:3000/api/health')…"`. Published on `127.0.0.1:3000`. |
    | `test` | `Dockerfile`, target `test` | Has `profiles: ["test"]`, so `up` never builds or starts it. Runs `npm test`. It uses PGlite in memory (AD-9), so it needs no `db`. |

  - **Start command:** `app` runs `scripts/setup.ts` and then `next start -H 0.0.0.0 -p 3000`.
  - **Setup steps,** in order:
    1. Write any missing local secret to `SECRETS_FILE`. The file is opened with flag `wx`, and setup re-reads it on `EEXIST`. Nothing is ever overwritten.
    2. Under `pg_advisory_lock`: migrate (`scripts/migrate.ts`), check the key against `local_meta` (AD-11), then seed (AD-12) with `INSERT … ON CONFLICT DO NOTHING`.
  - **Production guard:** setup writes secrets and seeds only when `APP_ENV=local` and the `DATABASE_URL` host is `db`, `127.0.0.1` or `localhost`. Against any other database it only migrates.
  - **Dockerfile:** one multi-stage `Dockerfile` on `node:26.13.1-trixie-slim`.
    - `deps` runs `npm ci` with dev dependencies.
    - `build` runs `next build`, with no environment.
    - `app` copies from `build` with `--chown=node:node` and keeps all `node_modules`, so setup can migrate and seed. It runs `mkdir -p /data && chown node:node /data` before `USER node`, so the empty `appdata` volume belongs to `node` on its first mount. `NODE_ENV=production` is set only here.
    - `test` starts from `deps` plus the source. It sets `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` and runs `playwright install --with-deps chromium`. This was tested on trixie on 2026-11-13.
  - **No standalone output:** `output: 'standalone'` is not used.
  - **README commands:**
    - `docker compose up --build`: the app on `http://localhost:3000`, in Test mode, once `docker compose ps` shows `healthy`;
    - `docker compose run --rm --build test`: all automated tests;
    - `docker compose down -v`: stops the app and resets local data.
  - **Windows safety:** there are no shell scripts; every script is TypeScript run with `tsx`. `.dockerignore` excludes `node_modules`, `.next`, `.data`, `.env*` and `.git`. `.gitattributes` is listed under Conventions.
  - **Developer loop:** `docker compose up db`, then `npm run dev` on the host.
    - `predev` runs setup first.
    - Node 26 is needed only by the developer.
    - Locally, config defaults `DATABASE_URL` to `postgres://jobassistant:jobassistant@127.0.0.1:54320/jobassistant`, defined once in `config.ts`, and `SECRETS_FILE` to `.data/secrets.env`.
  - **Vercel:** builds the Next.js app from source. `vercel.json` sets `"framework": "nextjs"`, so Vercel's container runtime never builds the root `Dockerfile`. Never add a `Dockerfile.vercel`.
  - **CI** runs the README commands plus a smoke run:
    1. `docker compose --profile test build app test` once, with a BuildKit `type=gha` cache;
    2. `docker compose run --rm test`;
    3. `docker compose run --rm test npm run db:check`;
    4. `docker compose up -d --wait app`, then `docker compose exec app node scripts/smoke.mjs`: `/api/health`, plus login as the seeded user once S6 lands;
    5. `docker compose down -v`.

## Consistency Conventions

| Concern | Convention |
|---|---|
| Naming in code | English identifiers from the PRD Glossary: `Keyword`, `MatchedKeyword`, `Gap`, `Letter`, `Tone = 'formell' \| 'personlig' \| 'direkte'`, `Application`, `Profile`, `Student`. Files in kebab-case. UI text is Norwegian, only in `messages.nb.ts`. |
| Ids, hashes, text | UUID v4 ids. `timestamptz` in UTC; the Oslo day comes from `shared/core/time`. SHA-256 hex hashes. JSON in camelCase, columns in snake_case (Drizzle `casing: 'snake_case'`). Text is normalised from CRLF to LF where it enters (`cv`, `canon`). `.gitattributes` is `* text=auto eol=lf` plus `*.pdf binary`, and it is committed before the first source file, because `core.autocrlf=true` is set on Helene's machine. |
| Errors | `Result<T, E>` in core; the AD-7 envelope on the wire; `MessageKey` codes in SCREAMING_SNAKE. Field errors carry `field`. |
| Validation | Every route handler parses its body with the slice's zod schema inside `handle()` before calling the service (NFR-7). The client uses the same schemas for inline errors. |
| Config and setup | Only `config.ts` reads the environment (AD-4). `.env.example` lists every variable without values, and says `.env` holds only `AI_*` and `TEST_MODE`. `.gitignore` covers `.env*` (except `.env.example`) and `.data/`, and CI fails if `git ls-files .data .env` prints anything. Setup (`scripts/setup.ts`, run by the `app` container, AD-17) writes missing local secrets to `SECRETS_FILE`, migrates and seeds. `ACCESS_CODE` is needed only on Hosted. |
| Design tokens | DESIGN.md tokens become Tailwind v4 `@theme` variables in `src/app/globals.css`. One theme, no toggle, no component library; dialogs use native `<dialog>`. Fonts through `next/font/google`: Schibsted Grotesk, DM Mono, and Archivo with the `wdth` axis. A custom `max-640` variant serves the ≤ 640 px layout. |
| Accessibility hooks | Two polite live regions in the root layout (phase announcements; action outcomes), exposed through one `announce()` in `shared/ui`. |
| Tests | **Vitest** for core and server (`*.test.ts` next to the file). `vitest.config.ts` `test.env` fixes `APP_ENV=local`, `DATABASE_URL=pglite://memory` and a constant test `ENCRYPTION_KEY`, and one setup file gives each run a freshly migrated database. **Playwright** and `@axe-core/playwright` in `e2e/`: its `webServer` runs `next build && next start -p 3100` with `reuseExistingServer: false`, `baseURL` comes from the same constant, and `webServer.env` is fixed (`TEST_MODE=true`, `APP_ENV=local`, `DATABASE_URL=pglite://memory`, `E2E=1`). **`npm test`** runs Biome, `next typegen`, `tsc --noEmit`, Vitest and Playwright, in that order. **The one command** for the Examiner and CI is `docker compose run --rm --build test` (NFR-9, AD-17). Test names start with the requirement ID: `describe('FR-7 Match score', …)`. |
| Traceability | One branch per story, `story/<epic>.<story>-<slug>`, merged into a protected `main` by pull request once CI is green. Commits and pull requests cite story and FR IDs (NFR-10). |
| Dependencies | Exact versions in `package.json` (no `^`), and `package-lock.json` committed (NFR-6). |

## Stack

| Name | Version |
|---|---|
| Docker (Desktop on Windows/macOS, Engine + Compose plugin on Linux; README names the tested version) | Engine 29.x, Compose 5.x |
| Image `node` (all Dockerfile stages) | 26.13.1-trixie-slim |
| Image `postgres` (local `db`) | 17.12-alpine |
| Node.js (LTS; `engines.node` `26.x`; on the host only for the developer loop) | 26.x |
| npm | 11.x |
| TypeScript | 5.9.3 |
| Next.js (App Router, Turbopack) | 16.4.6 |
| React / React DOM | 19.3.1 |
| Tailwind CSS (+ `@tailwindcss/turbopack`, as the starter wires it) | 4.3.5 |
| @types/react / @types/react-dom | 19.3.0 |
| server-only | 0.0.1 |
| zod | 4.6.7 |
| @tanstack/react-query | 5.107.1 |
| drizzle-orm | 0.45.4 |
| drizzle-kit | 0.31.11 |
| @electric-sql/pglite (tests only; 0.4.x is the last Postgres 17 line, 0.5 moved to 18) | 0.4.6 |
| postgres (postgres-js) | 3.4.9 |
| ai (Vercel AI SDK) | 7.0.172 |
| @ai-sdk/anthropic (bake-off contender) | 4.0.104 |
| @ai-sdk/openai (bake-off contender) | 4.0.117 |
| unpdf | 2.1.0 |
| docx | 9.15.3 |
| @orama/stemmers | 3.1.18 |
| tsx | 4.23.15 |
| @biomejs/biome | 2.6.7 |
| vitest | 5.1.0 |
| @playwright/test | 1.65.0 |
| @axe-core/playwright | 4.14.0 |
| @types/node | 26.6.6 |
| Vercel (Hobby, Fluid compute, region `fra1`) | platform |
| Supabase Postgres (Free, `eu-central-1`) | Postgres 17 |

## Structural Seed

**Scaffold.** `create-next-app` refuses a non-empty folder, so it runs in a temporary folder, and the result is moved into the repository root:

```text
npx create-next-app@16.4.6 ja-scaffold --ts --tailwind --biome --app --src-dir --import-alias "@/*" --use-npm --no-agents-md --no-cache-components --no-react-compiler --no-agent-feedback --disable-git
```

Then pin the versions above exactly. The starter writes `^` ranges, including `^19` for the React types.

**Route inventory**

| Route | Slice | Exists from |
|---|---|---|
| `GET /api/health` (runs `SELECT 1`) | shared | step 1 |
| `POST /api/access` | identity | step 1 |
| `POST /api/cv/extract` (multipart, .pdf/.txt ≤ 2 MB, extracted in memory with unpdf, returns `{ text, noText }`, writes nothing) | cv | step 1 |
| `POST /api/analyses` | application | step 2 |
| `POST /api/analyses/[id]/letter`, `/letter-check` | application → letter, integrity | step 3 |
| `POST /api/analyses/[id]/gaps` | application → gaps | step 4 |
| `POST /api/auth/register`, `/login`, `/logout`; `GET /api/session`; `POST /api/session/renew` | identity, profile | step 6 |
| `GET/PUT /api/profile`; `POST /api/profile/ai-notice` | profile | step 6 |
| `GET /api/applications?page=n` (20 per page, newest first, with `total`); `GET /api/applications/[id]` | application | step 6 |

**Source tree**

```text
JobAssistant/
  src/
    app/                    # pages and api/** (see Route inventory)
    proxy.ts                # Access-code gate (AD-12)
    modules/
      cv/                   # FR-1–FR-3, FR-26: extraction, limits, contact stripping
      keywords/             # FR-4–FR-6, FR-5b: engine, KeywordSource, keyword_lists
      match/                # FR-7, FR-8: score, Verdict, explanation keys
      letter/               # FR-9, FR-10, FR-12: prompt, sign-off, .docx, file name
      gaps/                 # FR-13–FR-17: prompt, Gap analysis, applies guards
      integrity/            # FR-10, FR-11, FR-15, FR-17: checks, cvEntries, word lists
      ai/                   # FR-24–FR-27: adapters, runAi, ai_usage
      application/          # FR-21: orchestration, fingerprint, write model, History
      identity/             # FR-18, FR-19, FR-29, FR-31: students, sessions, access
      profile/              # FR-20: name, CV text, notice version
    shared/
      core/                 # Result, MessageKey, canon, hashing, time
      server/               # config, db (pglite | postgres), crypto, log, handle
      ui/                   # api-client, client-session, messages.nb.ts, RunMode, announce
  data/
    vocabulary/             # versioned keyword vocabulary (AD-5)
    fixtures/               # Fixtures, Answer keys, Cached responses (AD-15)
  drizzle/                  # generated SQL migrations
  scripts/                  # setup.ts, migrate.ts, smoke.mjs, record-cached.ts, extract-fixture-cv.ts, qa-compare.ts
  e2e/                      # Playwright + axe
  docs/qa/                  # manual check records (PRD §9.4)
  .github/workflows/        # ci.yml, keep-alive.yml
  Dockerfile                # stages deps, build, app, test (AD-17)
  compose.yaml              # services db, app, test (AD-17)
  .dockerignore
```

**Deployment and environments**

```mermaid
flowchart LR
  subgraph Local["Local run: docker compose up --build"]
    app["app container: setup, then next start"] --> pg[("db container: Postgres 17, volume pgdata")]
    app --> cached["Cached responses in data/fixtures"]
    test["test container: npm test, PGlite in memory"]
  end
  subgraph Hosted["Hosted version"]
    vercel["Vercel Hobby, functions in fra1, Node 26"] --> supa[("Supabase Postgres Free, Frankfurt")]
    vercel --> provider["AI provider (bake-off winner)"]
  end
  pr["Pull request"] --> ci["GitHub Actions CI: docker compose run test, db check, build app"]
  ci -- "green, merge" --> main["main (protected)"]
  main -- "Production deploy only" --> vercel
  cron["GitHub Actions keep-alive, twice daily"] --> health["/api/health"] --> supa
```

| Environment | Database | AI | Secrets | Notes |
|---|---|---|---|---|
| Local, Test mode (default) | `db` container | `cached`, `testMode` | `SECRETS_FILE` from setup | `docker compose up --build`; NFR-9, no account or key needed |
| Local, live | `db` container | `live` | plus optional `.env` with `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` | README section |
| Developer loop | `db` container on `127.0.0.1:54320` | either | `.data/secrets.env`, optional `.env` | `docker compose up db` + `npm run dev` |
| Tests and CI | PGlite 0.4.6 (Postgres 17) in memory; CI smoke run on the `db` container | `cached` or `mock`, never `live` (AD-3) | fixed test values in `vitest.config.ts` and `webServer.env` | `docker compose run --rm --build test` runs everything |
| Hosted (`APP_ENV=hosted`) | Supabase | `live` | Vercel environment variables (Production scope) | Production from `main` only, with `vercel.json` `{ "framework": "nextjs", "git": { "deploymentEnabled": { "**": false, "main": true } } }`; the build runs `db:migrate`, then `next build` |

**Environment variables:** `APP_ENV` (`local` \| `hosted`), `TEST_MODE`, `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `DATABASE_URL`, `SECRETS_FILE`, `ENCRYPTION_KEY`, `ACCESS_CODE`, `FEATURE_ACCOUNTS`, `FEATURE_GAPS`, `FEATURE_REWORDING`, `FEATURE_KEYWORD_FALLBACK`.

**Operations**
- **Cut 0** (PRD §5.1): set `main` to `false` in `git.deploymentEnabled`. The Hosted version stays at its last deploy.
- **Keep-alive:** a cron calls `/api/health` twice a day, so the Free Supabase project doesn't pause; it pauses after 7 days without activity. GitHub disables scheduled workflows after 60 days without repository activity, so check that `keep-alive.yml` is still enabled when grading starts.
- **Spending limit:** set a monthly limit with the AI provider when the key is created (NFR-8).
- **Course end:** after grading, delete the Vercel project and the Supabase project (FR-23).
- **Monitoring and backups:** none. Vercel's function logs are the only monitoring, and there are no backups.

**Core entities**

```mermaid
erDiagram
  STUDENT ||--o{ SESSION : has
  STUDENT ||--|| PROFILE : has
  STUDENT ||--o{ APPLICATION : owns
```

`ai_usage` (by scope and day) and `keyword_lists` (by `contentHash`) stand alone, with no foreign keys.

## Capability → Architecture Map

| Capability / Area | Lives in | Governed by |
|---|---|---|
| FR-1–FR-3 CV input | `cv`, `/api/cv/extract`, Søknad (before S6), Profil | AD-2, AD-7, AD-16 |
| FR-4–FR-6, FR-5b Keywords | `keywords`, `data/vocabulary` | AD-5, AD-6, AD-9, AD-13 |
| FR-7, FR-8 Match score and explanation | `match`, `/api/analyses` | AD-5, AD-6, AD-7 |
| FR-9, FR-10, FR-12 Letter, Tone, sign-off, download | `letter`, `ai`, `integrity` | AD-6, AD-7, AD-8, AD-13, AD-14 |
| FR-11 Letter guard | `integrity`, `/letter-check` | AD-6, AD-8, AD-14 |
| FR-13–FR-17 Gaps, suggestions, guards | `gaps`, `integrity`, `ai` | AD-6, AD-7, AD-13, AD-14 |
| FR-18, FR-19 accounts, isolation | `identity`, `profile`, `proxy.ts` | AD-10, AD-12 |
| FR-20, FR-21 Profile, History | `profile`, `application` | AD-8, AD-10, AD-11, AD-16 |
| FR-22, FR-23 encryption, minimisation | `shared/server/crypto`, `log`, `handle` | AD-11, AD-13 |
| FR-24–FR-26 AI notice, Daily cap, contact stripping | `ai`, `profile`, `cv` | AD-4, AD-13, AD-16 |
| FR-27, FR-28 Test mode, Fixtures | `ai` (`cached`), `data/fixtures` | AD-3, AD-15 |
| FR-29 seeded test user | `scripts/setup.ts` in the `app` container, `identity`, `profile` | AD-10, AD-12, AD-17 |
| FR-30, FR-31 Hosted version, Access code | Vercel, Supabase, `proxy.ts`, workflows | AD-3, AD-9, AD-12; deployment seed |
| NFR-1 language | `messages.nb.ts`, prompts | AD-7 |
| NFR-2, NFR-3 accessibility, layout | `shared/ui`, `globals.css` | AD-12 (expiry warning), conventions |
| NFR-4, NFR-5 timing, stability | two-phase API, write model, client state | AD-6, AD-7, AD-8, AD-16 |
| NFR-6 determinism | `keywords/core`, `canon`, pinned dependencies and image versions | AD-1, AD-5, AD-15, AD-17, conventions |
| NFR-7 security | `config.ts`, `handle()`, route validation | AD-3, AD-4, AD-10, AD-12 |
| NFR-8 cost | `ai` | AD-13; operations |
| NFR-9 runnability | Docker Compose (`db`, `app`, `test`), `scripts/setup.ts` | AD-3, AD-9, AD-17, conventions |
| NFR-10, NFR-11 traceability, maintainability | conventions, Biome | AD-1, conventions |
| SM-2, SM-3 checks | `data/fixtures`, `scripts/qa-compare.ts` | AD-14, AD-15 |

## Deferred

| Decision | Why it can wait | Owner, when |
|---|---|---|
| AI provider and model | The bake-off at the start of S3 picks between the two contender packages, and `AiClient` hides the choice. The losing package is removed afterwards. Both are first checked against the DPF list (PRD §8.1, OQ3). | Helene, 18 Nov |
| FR-5b on or off | Decided against SM-2 on every Fixture plus a held-out one. AD-5, AD-6, AD-13 and `FEATURE_KEYWORD_FALLBACK` cover both outcomes. | Helene, 17 Nov (OQ2) |
| Vocabulary contents and size | Tuned against the Answer keys in Epic 2. Its location and versioning are fixed (AD-5). | Epic 2 |
| Prompt wording | Owned by the `letter` and `gaps` slices and versioned by AD-15. | Epics 3–5 |
| Login rate limiting | Two users, and a random Access code of 16 or more characters. Add it in Epic 6 if a story needs it. | Epic 6 |
| DPA records | Confirm that Vercel's DPA covers Hobby and Supabase's covers Free, and record both in `docs/qa/`. If either fails, the README run becomes the delivery (PRD §5.1). | Helene, setup story, week 46 |
| Key rotation, backups, uptime monitoring | Out of scope: fictional data, deleted at course end (addendum §2.6). | after v1 |
