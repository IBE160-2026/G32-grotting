# Rubric review: ARCHITECTURE-SPINE.md (JobAssistant v1)

Reviewer: rubric walker. Date: 2026-11-08. Inputs: the spine, its `.memlog.md`, and PRD `prd-JobAssistant-2026-10-31/prd.md` (FR-1 to FR-31, NFR-1 to NFR-11).

**Verdict:** The spine is well scoped and covers every FR and NFR and most of the operational envelope. It still leaves the boundary between UI and server, and a few keys shared across units (cached-response lookup, the health-check gate, Daily-cap increments), loose enough that separately built stories would diverge. Fix the 4 high findings before writing epics.

## Checklist scorecard

| # | Criterion | Result |
|---|---|---|
| 1 | Fixes the real divergence points | Mostly. Gaps: the UI-to-server boundary (H3, H4), the cached-response key (H2), the sessionStorage schema (M9), the logging sink (M11) |
| 2 | Rules are enforceable and prevent the divergence | Mostly. AD-1 and AD-11 name no enforcement, and AD-11 conflicts with tooling files (M5). AD-9 "exactly" is too strict (M4). AD-6 is not atomic (M1) |
| 3 | Nothing deferred lets units diverge | One risk: the auth library (Better Auth) conflicts with AD-8, AD-9 and AD-10 unless constrained (M10) |
| 4 | Tech is plausible and current | Yes. One unverified pin: `postgres` 4.1.x is missing from the memlog's npm check (L7) |
| 5 | Covers the spec's capabilities | Yes. Every FR and NFR is bound. The capability map is missing rows for NFR-2, NFR-3, NFR-7, NFR-8 and NFR-10 (L8) |
| 6 | Operational envelope decided | Mostly. Deployment, environments, CI, secrets, migrations, keep-alive and takedown are all decided. Gaps: the migration connection string (M6), the Vercel DPA record (L1), the log sink and retention (M11), what CI runs (L12) |
| 7 | Right-sized | Yes overall. Most of the complexity is forced by the PRD (PGlite from NFR-9, Supabase from FR-30, encryption from FR-22). One thing to cut: the Vercel Preview environment (L2) |
| — | Mermaid syntax | All 4 diagrams are syntactically valid. There are semantic problems in the ERD and the deployment diagram (L9) |

## Findings

### High

**H1. The Access-code proxy blocks the keep-alive health check**
- *Location:* AD-10; Structural Seed > Operations > Keep-alive; deployment diagram (CRON → F bypasses P).
- *Issue:* `proxy.ts` gates every request when `ACCESS_CODE` is set, and the keep-alive workflow calls `GET /api/health` on the Hosted version without a cookie. The proxy will redirect (3xx) or reject the call, so the database query never runs. A plain `curl` still exits 0 on a 3xx, so the workflow stays green while Supabase pauses the project after 7 days. That can take the Hosted version down during grading (SM-4). The proxy also needs to let through the Access-code entry route and static assets, and the spine names none of these.
- *Fix:* Add to AD-10: "The proxy matcher exempts `/api/health`, the Access-code page and its `POST` route, and `/_next/*` and static files. API requests without a valid cookie get `{ ok:false, error:{ code:'ACCESS_REQUIRED' } }` with 401; page requests are redirected." Make the keep-alive step `curl -fsS` and assert a 200 JSON body.

**H2. The cached-response lookup key is undefined where it matters**
- *Location:* AD-12 (lookup key), AD-6 (contact stripping), FR-27 ("uploading or pasting them reaches the same Cached responses"), FR-5 (Job ad hash).
- *Issue:* The key is "SHA-256 of the normalised (CV text, Job ad text)", but the spine does not say:
  - whether the hash covers the CV text before or after contact stripping. The gateway strips before calling `AiClient`, so the `cached` adapter sees stripped text, while a recording script would likely hash the original. A fictional CV with an email or phone number will then miss its cache, and the Example pair reports «not available in Test mode», which breaks UJ-3 and SC8;
  - what "normalised" means. PDF extraction of `cv.pdf` differs from `cv.txt` in whitespace, line breaks and possibly ligatures or hyphenation;
  - whether the FR-5 Keyword-list hash uses the same function.
  
  The Fixture-recording story and the cached-adapter story will each pick their own answer.
- *Fix:* In AD-12, name one Core function, for example `core/fingerprint.contentKey(cv, ad)`, with the normalisation spelled out (Unicode NFC, lowercase, every whitespace run collapsed to one space, trimmed) and computed on the **stripped** CV text. The recorder, the `cached` adapter and the FR-5 store all use it. Add a test that asserts `contentKey(extract(cv.pdf)) === contentKey(cv.txt)` for the Example pair.

**H3. The layer table forbids imports that the spine itself requires**
- *Location:* Design Paradigm layer table and diagram; Consistency Conventions > Validation.
- *Issue:*
  - `src/lib` has no row, so its allowed imports are undefined. Yet the Validation convention puts the input limits "as constants in Core" while the form and route schemas live in `src/lib/schemas`, so lib must import core.
  - The UI may import only `src/lib`, but it has to type the API data it renders (`MatchScore`, `Gap`, `EvidenceCitation`, … all defined in Core) and may need `core/filename` if the `.docx` is built in the browser (a Deferred option).
  - Adapters "may import config and core", but the diagram shows `DB --> CRYPTO`, and every layer needs `src/server/log`.
  
  Stories will either duplicate types in the UI or break the rule.
- *Fix:* Add a `src/lib` row ("may import `src/core`"). Let the UI import `src/core` types and pure functions and constants, never `src/server`. Let adapters import `src/server/{crypto,log}`, and let every server layer import `src/server/log`. Add `LIB --> CORE` to the diagram.

**H4. The boundary between UI and server in Next.js is not decided**
- *Location:* Layer table ("the server only over HTTP"), Conventions > Frameworks, AD-11, FR-24, FR-27.
- *Issue:* Three related gaps:
  - **Server Components.** The memlog says pages are server components, but the rule says the UI reaches the server only over HTTP. For Historikk, Profil or Konto, a server component would have to fetch its own API (a known Next.js anti-pattern that also needs cookie forwarding) or call services directly (a breach of the rule).
  - **Server Actions.** Server Actions are a "common documented pattern" in Next 16 and nothing forbids them, so one story might save the Profile with an action that bypasses `src/app/api` and AD-13.
  - **Runtime flags.** The UI needs `testMode` (the FR-27 banner, hiding the FR-24 notice), the provider name and retention period (FR-24 text), and possibly `hosted`. Only `config.ts` may read the environment, and the UI may not import the server.
- *Fix:* Add one rule. For example: "Pages that show Student data are client components that fetch `src/app/api/*`. Server components render only static shells. No Server Actions. The root layout (a server component) is the one sanctioned importer of `getPublicConfig()` from `src/server/config`, which returns `{ testMode, hosted, providerName, retentionDays }` and passes it down as props." Or allow server components to call services directly. Whichever is chosen, state it once.

### Medium

**M1. The Daily-cap check and increment is not atomic, and what counts is unspecified**
- *Location:* AD-6.
- *Issue:* `/api/letter` and `/api/gaps` run in parallel and both check and increment the same (scope, day) row, so read-then-write can let request 31 through. The spine also does not say whether a timed-out or failed AI call counts, or whether a retry counts again.
- *Fix:* The rule becomes: "Increment is a single conditional statement (`INSERT … ON CONFLICT (scope, day) DO UPDATE SET count = count + 1 WHERE count < cap RETURNING count`). No row returned means the cap is reached. Every attempt sent to the live provider counts, including failures and retries."

**M2. Provider SDK retries and timeouts are not pinned down**
- *Location:* AD-4, AD-6 (90 s timeout), NFR-8 (at most 2 AI requests per Application).
- *Issue:* Provider SDKs retry by default (for example `@anthropic-ai/sdk` retries twice) and have their own long timeouts. One gateway call can then become 3 paid requests and run past 90 s, which breaks NFR-8 and NFR-4 silently. The cap counts 1.
- *Fix:* Add to AD-4: "The `live` client is constructed with `maxRetries: 0`. The gateway passes an `AbortSignal` with a 90 s timeout. Retries happen only when the Student clicks retry, and each goes through the gateway."

**M3. Which CV text the integrity guards compare against is ambiguous**
- *Location:* AD-5 and AD-6; FR-15 and FR-26.
- *Issue:* The AI sees the stripped CV text, while FR-15 checks citations "against the CV text". If the gaps service checks against the original text, citations that span a removed phone number or email, or quote a placeholder, are falsely downgraded. The spine also does not say whether stripping deletes the contact detail or replaces it with a placeholder.
- *Fix:* State it: "`core/privacy.stripContacts` replaces each match with the fixed token `[fjernet]`. The FR-15 and FR-17 guards compare against the same stripped text that was sent to the AI."

**M4. AD-9's "exactly FR-22's list" leaves technical columns unclassified**
- *Location:* AD-9, ERD.
- *Issue:* Read literally, the rule makes ids, foreign keys, the password hash, session token hashes and expiry times, Daily-cap counts, `Tone`, `promptVersion` and status flags either encrypted (which breaks lookups) or forbidden. The ERD's "matched by Job ad hash" link also suggests storing a plain-text fingerprint of the Job ad on the Application, which FR-22 does not list.
- *Fix:* Rephrase the rule: "Every free-text or derived content field FR-22 names is encrypted. Plain columns are limited to email, timestamps, the Match score, and non-content technical values (ids, foreign keys, password and token hashes, counts, enums such as Tone, promptVersion). No hash of Student-entered text is stored on Student rows." Drop or annotate the KEYWORD_LIST_CACHE → APPLICATION relationship (see L9).

**M5. AD-11 and AD-1 are not enforceable as written**
- *Location:* AD-1, AD-11, Conventions > Logging.
- *Issue:* "No other file reads `process.env`" collides with `drizzle.config.ts`, `scripts/setup.*`, `playwright.config.ts` and `next.config.ts`, which all must read it. Neither AD-1's import ban nor AD-11's names an enforcement mechanism, while the `console.*` convention does ("fails lint").
- *Fix:* Scope AD-11 to `src/` (except `src/server/config.ts`), and list the root config files and `scripts/` as allowed. Enforce both rules in `biome.json`: `noProcessEnv` with an override for `config.ts`, and `noRestrictedImports` in an override for `src/core/**` (blocking `next`, `react`, `@/server/*`, `node:fs`, SDKs and drivers). Add "fails lint" to both Rules.

**M6. Migration connection and in-memory migration are not decided**
- *Location:* AD-8; Operations > Migrations; Conventions > Database changes.
- *Issue:*
  - The app connects through Supabase's transaction pooler with `prepare: false`, but `drizzle-kit migrate` should use the session pooler or a direct connection. The direct host is IPv6-only on Free, so the session pooler is the IPv4 option. No variable is named for this.
  - Nobody owns migrating in-memory PGlite for tests and Vercel Preview, where the database is fresh on every instance.
- *Fix:* Add `MIGRATION_DATABASE_URL` (the session pooler on port 5432), used only by `drizzle.config.ts` and `npm run db:migrate`, and list it in `.env.example`. Add to AD-8: "`client.ts` runs Drizzle's migrator on creation when it opens in-memory PGlite. Tests get a fresh migrated database from one helper, `tests/db.ts`."

**M7. PGlite in `.data/` supports one process at a time**
- *Location:* AD-8, Local environment.
- *Issue:* PGlite allows a single connection per data directory. `next dev` hot reload can re-evaluate `client.ts` and open a second instance, and running `npm run db:migrate` while the dev server runs opens another. Either can lock up or corrupt `.data/`, which is a likely trap for a first-time database user.
- *Fix:* Add: "`client.ts` caches the database on `globalThis` (one instance per process). Stop the dev server before `db:migrate` or `setup`, and the README says so." `.data/` and `.env` go in `.gitignore`.

**M8. The setup script cannot reach the TypeScript repositories**
- *Location:* Source tree (`scripts/setup.mjs`), AD-9, FR-29.
- *Issue:* Seeding the test user means writing an encrypted Profile and a password hash. AD-9 says encryption happens only in repositories, but a plain `.mjs` script cannot import the TypeScript repos. Node's built-in type stripping does not resolve `@/` aliases or extensionless imports. The seed would end up duplicating crypto or writing plain text.
- *Fix:* Make it `scripts/setup.ts`, run with `tsx` (a dev dependency), and have it call `src/server/db/repos` and `src/server/crypto`. Alternatively, seed through an internal service function that the script invokes.

**M9. No module owns the client's sessionStorage shape**
- *Location:* AD-7 ("the client keeps the session in `sessionStorage`"); FR-18 (keep the Job ad across login); FR-24 (notice accepted).
- *Issue:* The S1, S2, S3, S4, S5 and S6 stories all read and extend the Søknad state (CV text, Job ad, title, employer, Tone, phase results, notice acceptance, application id). With no single owner, key names and shapes will drift between epics.
- *Fix:* Add to the conventions: "`src/lib/session-store.ts` is the only code that touches `sessionStorage`. It has one versioned, zod-validated `SoknadSession` object and drops it on version mismatch."

**M10. The deferred auth-library choice can break AD-8, AD-9 and AD-10**
- *Location:* Deferred > Auth library; AD-9 and AD-10.
- *Issue:* Better Auth's default schema has a required `user.name` (AD-10 says the name never lives in auth tables). Its Drizzle adapter runs its own queries outside `db/repos` (AD-8), and its session model (`expiresIn` and `updateAge`) needs configuring to give a 30-minute sliding idle expiry. Unless these points are fixed now, epic 6 will either bend the ADs or fight the library.
- *Fix:* Add to the Deferred row: "If Better Auth: `user.name` is stored as an empty string; its adapter is the one sanctioned exception to repos-only and touches auth tables only; sessions are set to a 30-minute idle expiry; password hashing is its own (scrypt)."

**M11. The log sink and retention are not decided**
- *Location:* AD-6 (logger), FR-23, NFR-8 (token counts logged), Deferred > monitoring.
- *Issue:* The spine does not say where `src/server/log` writes (stdout? a database table?). Vercel Hobby keeps runtime logs only briefly, so the "token counts logged per request" evidence and the downgrade and discard counts disappear. The FR-23 automated test also needs to capture output. The stories building the gateway, the guards and the tests will each assume something different.
- *Fix:* State: "The logger writes one JSON line to stdout per event. Tests inject a capturing sink. Spend is tracked on the provider's usage page, and short Vercel log retention is accepted." If durable counts are needed for `docs/qa/`, use a small `ai_call_log` table, with no content.

### Low

**L1. The Vercel DPA is missing from the compliance records** (Operations > Compliance records). FR-30 and §8.1 require Vercel's data processing agreement and transfer basis to cover the data. Only Supabase and the AI provider are listed. *Fix:* Add "the Vercel DPA (part of its terms) and the `fra1` region are recorded in `docs/qa/`".

**L2. The Vercel Preview environment adds little and breaks after S6** (environment table). In-memory PGlite on serverless instances loses registered users and sessions between requests, so Preview cannot exercise S6 at all. That makes a fourth environment for a solo developer. *Fix:* Turn off Preview deployments, or state that Preview is S1–S5 only and Test mode only. Simpler: drop the row.

**L3. letter-check trusts the Gaps the client sends** (AD-3, AD-5, FR-11). This contradicts the "recompute, don't trust the client" rule for phase 2, and it is unclear whether FR-11 flags are stored or recomputed when History reopens an Application. *Fix:* `/api/letter-check` re-runs the FR-15 citation check (pure, cheap) on the Gaps it receives. FR-11 flags are never stored; History recomputes them with the same Core function.

**L4. The FR-5 fallback request budget is not protected** (AD-3). Phase-2 Keyword recomputation must never call `proposeKeywords`, or the 3-request ceiling breaks. `/api/analyse` also needs `maxDuration` once it can call AI. *Fix:* "Phase-2 recompute uses the saved Keyword list, or code extraction, and never `proposeKeywords`. `/api/analyse` gets `maxDuration` 120 s when the fallback is on."

**L5. Two concurrent writers share one Application row** (AD-7). The letter and gaps handlers update the same row, and a double submit in phase 1 creates two History rows (NFR-5). *Fix:* "Each phase-2 handler updates only its own columns. The client disables submit while a phase is in flight."

**L6. Hosted migration ordering** (Operations > Migrations). Vercel deploys on merge, so migrations reach Supabase before the code that uses them. A destructive migration breaks the live app in the window between them. *Fix:* "Hosted migrations are additive. Run `db:migrate` against Supabase right before merging the pull request."

**L7. `postgres` 4.1.x is unverified** (Stack). The memlog's npm check lists the earlier Neon and libSQL drivers but not `postgres`, because the database switched to Supabase after the check. *Fix:* Check the registry and correct the row if needed.

**L8. Map and tree omissions** (Capability map, Source tree).
- The map has no rows for NFR-2 (conventions), NFR-3 (UX owns it), NFR-7 (AD-10, AD-11), NFR-8 (AD-6) or NFR-10 (conventions).
- The tree is missing the script that records Cached responses from the winning provider (FR-27) and the §9.2 helper that compares live outputs with the Answer keys.
- «Bruk eksempelet» needs the Example pair in the browser, but `fixtures/` is outside `src/` and served by nothing.

*Fix:* Add the rows. Add `scripts/record-cached.ts` and `scripts/compare-answer-keys.ts`. State how the Example pair reaches the client, for example `GET /api/example`.

**L9. Mermaid semantics (syntax is valid)**
- The ERD's `STUDENT ||--o{ DAILY_CAP` says every cap row belongs to exactly one Student, but rows scoped `installation` belong to none, so it should be `|o--o{`.
- `KEYWORD_LIST_CACHE ||--o{ APPLICATION` says every Application references a cache row, which is false when the fallback is off. It also implies a hash column on the Application (see M4).
- In the deployment diagram, `GH … -->|merge to main| Vercel` reads as if Actions deploys. Vercel's Git integration deploys.

*Fix:* Correct the cardinalities, or turn the cache link into a note. Split the arrow into "PR → Actions (lint + tests)" and "main → Vercel Git deploy".

**L10. How the gate and accounts interact after S6** (AD-10, FR-31). It is not stated whether the proxy gate stays after S6 (the spine implies yes) or whether registration also asks for the code. Epic 6 might add a second code field. *Fix:* One line: "The proxy gate stays after S6. Registration has no separate code field."

**L11. The Answer-key format has no schema** (AD-12). `answer-key.json` is written in week-46 Fixture stories and read by tests and the §9.2 helper. *Fix:* "One zod schema for `answer-key.json` and `meta.json` lives in `src/core/schemas`. Tests validate every Fixture against it."

**L12. What "tests" means in CI and on the command line** (Conventions, CI row, NFR-9, NFR-7). NFR-9 requires one command to run all automated tests, but the spine does not say whether `npm test` includes Playwright, whether CI runs end-to-end tests, a type check or `next build`, or how "no secrets in history" is checked. *Fix:* "`npm test` runs Vitest and then Playwright (Test mode). CI runs `biome ci`, `tsc --noEmit`, `npm test` and a secret scan (for example gitleaks) on every pull request."

## Right-sizing note

Apart from L2, the spine does not over-engineer. The two database drivers, three AI implementations, the proxy and field-level encryption each come straight from a PRD requirement (NFR-9, FR-27/28, FR-31, FR-22). Most of it states decisions, and rationale is kept in the memlog. The fixes above are one-line rule additions, not new components.
