# Reconciliation: ARCHITECTURE-SPINE.md against the PRD

- **Spine:** `ARCHITECTURE-SPINE.md` (draft, 2026-11-08)
- **Sources:** `prd.md` (final, 2026-11-08), `addendum.md` §2, the spine's `.memlog.md`
- **Reviewed:** 2026-11-08
- **Scope:** PRD requirements, constraints and quiet expectations that the spine (a) contradicts, (b) drops where an architectural decision is needed, or (c) leaves open enough that two separately built stories could diverge. Pure product and UX detail is left out.
- **Intentional, not flagged:** Supabase as the hosted database (T3), the AI provider deferred to the week-47 bake-off (T2/T2a), the transfer-basis check before the bake-off (T2b), the FR-5 decision at the end of week 46, the auth library deferred to epic 6, and vocabulary contents deferred to epic 2.

**Counts:** 5 high, 13 medium, 12 low.

---

## High

### H1. The Access-code proxy blocks the keep-alive health check
- **PRD IDs:** FR-31, SM-4, FR-30 (and the spine's own keep-alive rule)
- **Problem:** AD-10 runs `src/proxy.ts` on every request whenever `ACCESS_CODE` is set. The keep-alive workflow calls `GET /api/health` on Production without a cookie, so it gets a redirect or a 401 and never runs the database query. Supabase then pauses after 7 days, and SM-4 ("the Hosted version answers throughout grading") fails without anyone noticing, because a workflow that doesn't check the HTTP status still passes. The spine also doesn't say that the proxy matcher must cover `/api/*`. If it doesn't, the API is open even though the pages are gated, and FR-31's "Auto: no access without the code" test fails.
- **Suggested spine fix:** In AD-10, state the proxy matcher: all pages and `/api/*` are gated, static assets are excluded, and `/api/health` is the only exempt route. The health route returns no data. The keep-alive workflow fails on any status other than 200.

### H2. AD-1 and AD-13 contradict each other on where the Norwegian template text lives
- **PRD IDs:** FR-8 (code-written Missing-keyword lines), FR-15 (fixed Real-gap template), D7, NFR-1, FR-21 (stored Gaps)
- **Problem:** AD-1 puts the explanation templates in `src/core/explain` and allows Core to import only `src/core` and `data/`. AD-13 says all user-facing Norwegian text lives in `src/lib/messages.nb.ts` and that server responses contain no prose. FR-8's "Annonsen ber om «X». CV-en din viser det ikke ennå." and FR-15's replacement Real-gap text can't satisfy both rules. One story will put Norwegian strings in Core and another will return keys, so stored Applications (FR-21) may end up mixing AI prose, template prose and template keys in the same Gap field.
- **Suggested spine fix:** Decide that Core returns template keys with parameters, for example `{ template: 'missingKeyword', keyword, adLine }`, and that `messages.nb.ts` renders them. Gaps carry `source: 'ai' | 'template'`, so a downgraded Gap stores a key instead of text. Alternatively, move the template strings into `data/` and exempt them from AD-13 explicitly.

### H3. After S6, AD-7 lets requests through without a login, which FR-18 forbids; the gate's change after S6 is missing
- **PRD IDs:** FR-18 ("Once S6 exists, Søknad and the other Student pages require login"), FR-31 ("after S6, registration requires it"), FR-25 (cap per Student), §5.1
- **Problem:** AD-7 says the handlers "also persist through repositories **when a session exists**". Read literally, that keeps anonymous analyse, letter and gaps calls working after S6, with the Daily cap falling back to `installation`. FR-18 requires a login. The spine also doesn't say how the Access code works once accounts exist. Is the proxy still gating every request each browser session, is it a field on the registration form, or both? Stories for auth, the proxy and the gateway could each pick a different model.
- **Suggested spine fix:** In AD-7 and AD-10, state that after S6 every Student page and every `/api/*` route except `extract` (if wanted) and `health` requires a session (401 `session_expired`/`unauthenticated` otherwise), and that the cap scope is then always the Student id. Also state whether the proxy gate stays as is after S6 or moves to the registration route only (FR-31).

### H4. Tests and the end-to-end run can make paid AI requests when the developer's `.env` holds a key
- **PRD IDs:** FR-27 ("Automated tests always use Test mode or a mock and never make paid AI requests"), NFR-8, NFR-6
- **Problem:** AD-11 derives `testMode` only from "no AI key, or `TEST_MODE=1`". From week 47, Helene's local `.env` will hold a live key. The Playwright UJ-1 test starts the real app, which reads `.env`, so it runs live, costs money and gives different results each run. Unit tests that don't inject the mock explicitly would do the same. CI is safe only because it has no key.
- **Suggested spine fix:** In AD-11, make `NODE_ENV=test` or the Vitest/Playwright environment force `cached`/`mock`, whatever keys are present. The `live` adapter throws if it is constructed under test. The e2e web server is started with `TEST_MODE=1`.

### H5. AD-2's "swap one implementation and nothing else" is not true under the FR-5 fallback
- **PRD IDs:** FR-5 (fallback consequences), FR-24, FR-25, FR-27, UJ-3, NFR-4, NFR-6, P6
- **Problem:** If the fallback is switched on, FR-5 needs both extractors at runtime. Code-only extraction is used, and marked "less precise", in Test mode, once the Daily cap is reached and (implicitly) when the AI fails or times out. The spine also leaves these open:
  - the response field that carries the "less precise" marker;
  - that a degraded code-only list must **not** be saved to `KEYWORD_LIST_CACHE` (otherwise the Job ad stays "less precise" for good);
  - that phase-2 handlers must reuse the exact list phase 1 used, and never call `proposeKeywords` or downgrade on their own (if the cap is reached between phases, they would recompute different Missing keywords);
  - that the FR-24 notice must be accepted before **phase 1** for a new Job ad;
  - whether the cache key is a hash of normalised Job ad text.
- **Suggested spine fix:** Add a short "Under the FR-5 fallback" rule to AD-2/AD-3. Extraction order is cache, then AI through the gateway, then code with `precision: 'reduced'`. Only AI lists that pass validation are cached. Phase 2 reads the list by Job-ad hash and never extracts. The notice gate moves before `/api/analyse`.

---

## Medium

### M1. FR-11 Letter guard: timing, storage and inputs are unclear
- **PRD IDs:** FR-11, Glossary "Integrity guard" ("runs before the output is shown"), FR-12 (regenerate), FR-21 (reopen), AD-3, AD-5
- **Problem:**
  - The spine doesn't say whether the Letter may be shown before `/api/letter-check` returns. The Glossary says the guard runs before the output is shown, so the Letter would have to wait for Gaps too.
  - It doesn't say whether the flags are stored on the Application. On reopen they can't be recomputed reliably, because the CV text isn't stored on the Application and the Profile may have changed.
  - It doesn't say whether letter-check reruns after «Lag nytt utkast».
  - `letter-check` takes Gaps from the client, which breaks AD-3's "don't trust client-sent results".
- **Suggested spine fix:** In AD-3/AD-5, state that the Letter is shown only together with its flags. Once phase 2 settles, the server computes the flags (after S6 from the stored, guarded Gaps) and stores them with the Letter. Every new Letter reruns the check.

### M2. FR-18: keeping the pasted Job ad across a session timeout is not designed
- **PRD IDs:** FR-18 ("A Job ad pasted on Søknad is kept and offered again after login"), NFR-5
- **Problem:** AD-10 sets the 30-minute sliding expiry but gives no `session_expired` error code. It doesn't say who redirects (the proxy, the page or the client on a 401), or where the draft Job ad, title, employer and Tone are kept while the Student logs in again. AD-7 mentions `sessionStorage` only before S6.
- **Suggested spine fix:** Add `session_expired` to the AD-13 enum. State that the Søknad client keeps the unsent form in `sessionStorage` both before and after S6, that it redirects to «Logg inn» with the UX message on that code, and that it restores the form after login.

### M3. FR-24 notice: enforcement, storage and versioning
- **PRD IDs:** FR-24, P4, §5.1, FR-5 (the notice changes), §8.1 (provider retention is named in the notice)
- **Problem:** The capability map stores acceptance in `sessionStorage`, or on the Profile after S6, but it doesn't say:
  - whether the server refuses AI calls without acceptance, or the gate is client-only;
  - how the UI learns `testMode` (to hide the notice and show the FR-27 banner), when AD-11 forbids reading env anywhere except server config;
  - whether acceptance is tied to a notice version, which matters when the provider is chosen in week 47 or the FR-5 fallback changes the text.
- **Suggested spine fix:** The server exposes `{ testMode, hosted, noticeVersion }` to the UI, through a server component or `GET /api/config`. The gateway rejects live calls without `noticeAccepted === noticeVersion` (code `notice_required`). The provider name and retention come from config next to the live adapter.

### M4. The Cached-response lookup key is underspecified
- **PRD IDs:** FR-27 (paste and upload of the example files reach the same Cached responses), FR-26, FR-29, NFR-6, addendum §2.5
- **Problem:** AD-12 hashes "the normalised (CV text, Job ad text) pair" but doesn't define the normalisation. Is it the same `normalize` as the Keyword engine? Does it apply Unicode NFC, collapse whitespace, lowercase? It also doesn't say whether the hash is taken before or after the gateway strips contact details. PDF extraction of `cv.pdf` (line breaks, ligatures, decomposed æøå) won't equal `cv.txt` byte for byte. The seeded user's Profile CV (FR-29) must hash to the same value.
- **Suggested spine fix:** Name one Core function, `cacheKey(cv, ad)`: NFC, lowercase, whitespace collapsed, computed on the unstripped text. Add a test that `cv.pdf` → `unpdf` → `cacheKey` equals the `cv.txt` key for the Example pair. State that the same NFC step is the first stage of `normalize` in AD-2.

### M5. FR-22's "exactly" these plain-text columns doesn't cover the technical columns, and a Job-ad hash would leak
- **PRD IDs:** FR-22, FR-5, NFR-7
- **Problem:** AD-9 says the plain-text columns are "exactly FR-22's list". The schema also needs plain ids, foreign keys, password hashes, session tokens, cap counters, Tone, prompt version, the FR-24 acceptance flag and the precision marker. The ERD also links `KEYWORD_LIST_CACHE` to `APPLICATION` "by Job ad hash". A plain hash column on an Application lets anyone with database access join an encrypted Job ad to its plain-text Keyword list, which is encrypted content under FR-22.
- **Suggested spine fix:** Restate the rule: personal content is encrypted, except email, dates and Match score; non-content technical columns (ids, foreign keys, hashes, counters, enums, timestamps) may be plain. Applications store no Job-ad hash; the link exists only at request time.

### M6. Supabase's auto-generated Data API exposes the tables
- **PRD IDs:** NFR-7, FR-19, FR-22
- **Problem:** The spine uses Supabase "as a plain database", but tables that Drizzle creates in `public` are reachable through Supabase's auto-generated REST API with the project's anon key unless RLS is on or the Data API is switched off. That exposes plain email, scores and session rows. Session tokens stored in plain text would allow session hijacking.
- **Suggested spine fix:** In AD-8, add these setup steps: disable the Data API (or enable RLS with no policies on every table), keep the tables out of an exposed schema, and store session tokens only as SHA-256 hashes (AD-10). Record the step in `docs/qa/`.

### M7. The Application lifecycle under refresh, double submit and phase 2 is unspecified
- **PRD IDs:** FR-21 (save as soon as the score exists), NFR-5 (refresh and double submit never crash; input kept), AD-3, AD-7
- **Problem:**
  - Phase 1 creates a row each time it runs, so a double submit or a refresh that reruns analyse creates duplicate Historikk entries.
  - Phase-2 handlers take the CV text and Job ad from the client "by id", but nothing checks that they match the stored Application. A stale tab could attach a Letter written for another ad.
  - "The client keeps the session in `sessionStorage`" doesn't say whether results are kept. If they aren't, a refresh during phase 2 reruns AI calls and counts twice against the cap.
- **Suggested spine fix:** After S6, phase-2 handlers load the Job ad, title and employer from the Application row and take only the CV text and Tone from the request (or verify a hash of the inputs). Phase 1 is idempotent per client-generated submission id. `sessionStorage` holds inputs **and** received results, so a refresh restores them without new requests.

### M8. Ad-side Keyword extraction contract
- **PRD IDs:** FR-5 ("Duplicates and inflected forms of one Keyword count once"), FR-6, FR-8 (quote the ad line), OQ6
- **Problem:** AD-2 says "Only the CV side is inflected", but the ad also contains inflected forms («prosjektlederen») and aliases (both «agile» and «smidig»). Those have to collapse to one canonical vocabulary entry for FR-5 dedupe and for the score's denominator. The extractor's output also isn't specified. FR-8 needs the ad line where each Keyword appears, and the display form must be the vocabulary lemma. The spine also leaves open whether a Keyword can match as the head of a CV compound (Keyword «ledelse» against CV «prosjektledelse»).
- **Suggested spine fix:** Define the `KeywordExtractor` output as `{ id, display, adLine, stage }[]`, with ad-side matching using the same stages as the CV side and deduped by vocabulary id, alias groups counting as one Keyword. State the compound direction explicitly, and let the Answer keys confirm it.

### M9. Setup (FR-29) must be idempotent and must never seed the hosted database
- **PRD IDs:** FR-29, NFR-9, FR-22, AD-11
- **Problem:** `npm run setup` writes a random `ENCRYPTION_KEY` and seeds the test user. If it runs a second time and regenerates the key, all encrypted local data becomes unreadable, and seeding again may hit the unique email constraint. Nothing stops setup from seeding Supabase when `DATABASE_URL` is set. The seed also needs the key it has just written, so the order matters.
- **Suggested spine fix:** Setup creates `.env` only if it is missing and never overwrites existing secrets. The seed is an upsert, runs after the key is loaded, and refuses to run when `DATABASE_URL` is set or `hosted` is true.

### M10. Logging can still leak content through error messages
- **PRD IDs:** FR-23 ("AI prompts and responses are never written to logs"), NFR-8, AD-4, AD-6
- **Problem:** AD-6's typed logger blocks free text, but it doesn't define the outcome or error fields. A zod parse error from `analyseGaps` includes the offending AI output, and provider SDK errors can echo input. Errors thrown and left unhandled in route handlers are logged by Next.js and Vercel outside `src/server/log`, so the lint rule doesn't catch them.
- **Suggested spine fix:** Make `outcome` a closed enum, for example `ok | timeout | provider_error | parse_error | cap_reached`, with no message field. Route handlers catch everything and map it to the AD-13 contract, so no raw error reaches the framework logger. Add a test that a planted parse failure logs no content.

### M11. NFR-9: the test command and cross-platform scripts
- **PRD IDs:** NFR-9 (one command runs all tests and they pass; Windows plus one other OS; no large download), NFR-11
- **Problem:** Playwright needs a browser download (`npx playwright install`) that the README and setup don't mention. It isn't clear whether "one command" includes e2e and axe. Spine examples like `TEST_MODE=1` are POSIX-only and fail in Windows shells if they are copied into npm scripts or the README.
- **Suggested spine fix:** Decide that `npm test` runs Vitest and Playwright, and that `npm run setup` installs Chromium only (or that e2e is a separate documented command). Add a convention: npm scripts call Node scripts or use cross-platform flags, with no inline env assignments or shell-specific syntax.

### M12. FR-9 sign-off: who inserts the name or placeholder
- **PRD IDs:** FR-9, FR-26, FR-27, FR-29, addendum §2.3
- **Problem:** The spine doesn't say whether the prompt asks the AI to sign with the name or the server adds it after generation (addendum §2.3 suggests after). Cached Letters for the Example pair have to work both without accounts (placeholder) and for the seeded user (name), so they need a fixed token. Otherwise the letter story and the fixture story will diverge.
- **Suggested spine fix:** In AD-4, state that the prompt ends the Letter with a fixed sign-off token, and that the letter service replaces it with the Profile name, or the placeholder before S6, after generation and after guards. Cached Letters store the token.

### M13. Vercel's DPA and transfer basis are missing from the compliance records
- **PRD IDs:** FR-30, §8.1 ("Vercel's data processing agreement and transfer basis must cover the data. The architecture checks this.")
- **Problem:** The Operations section records only the Supabase DPA and the AI provider's DPF status. Vercel, which processes every request body including the CV text, isn't checked. The memlog's note that the Supabase Free plan's DPA availability is unconfirmed is also dropped.
- **Suggested spine fix:** Add Vercel's DPA, its transfer basis and the `fra1` function region to the compliance records in `docs/qa/`. Keep the condition "confirm the Supabase Free plan offers the DPA; if not, log it in PRD §11".

---

## Low

### L1. Vercel Preview with in-memory PGlite can't run phase 1 then phase 2, or anything after S6
- **PRD IDs:** AD-7/AD-8 behaviour, FR-21, FR-18, FR-31
- **Problem:** With an in-memory database per instance, the Application row from phase 1 or a session row may be missing when the next request lands on another instance, which gives a 404. Migrations would also have to run on every cold start.
- **Suggested spine fix:** State that Preview is for flows without accounts only, or point Preview at a separate free database. Make sure `DATABASE_URL` is scoped to Production only in Vercel.

### L2. Daily cap: atomicity, and which calls count
- **PRD IDs:** FR-25, P6, NFR-8
- **Problem:** Letter and Gaps run in parallel and both check and increment the cap, which can race past 30. The spine doesn't say whether failed or timed-out calls count.
- **Suggested spine fix:** Use one atomic `UPDATE … SET n = n + 1 WHERE n < 30 RETURNING` (an upsert). Every attempt that reaches the provider counts.

### L3. Provider SDK retries break "one AI request" and the 90 s timeout
- **PRD IDs:** NFR-4, P6, NFR-8
- **Problem:** Provider SDKs retry by default with long timeouts. One gateway call could then mean several paid requests, uncounted by the cap, and run past the 90 s limit. The 120 s `maxDuration` is otherwise fine on Hobby with Fluid compute.
- **Suggested spine fix:** In AD-6, state that the live adapter sets SDK retries to 0 and that the 90 s AbortSignal covers the whole call. Retries happen only when the Student asks.

### L4. FR-15 citations and the Letter guard run against stripped or unstripped CV text
- **PRD IDs:** FR-15, FR-26, FR-11
- **Problem:** The AI sees the stripped CV text, so a citation that includes a stripped line won't be found word for word in the original. The spine doesn't say which text the guards use.
- **Suggested spine fix:** The guards check against the same stripped text that was sent (the Core strip function is deterministic). Write the rule down.

### L5. Secure cookie on local http
- **PRD IDs:** FR-18, NFR-9, AD-10
- **Problem:** `Secure` cookies on `http://localhost` are accepted by Chrome and Firefox but not by every browser and setup. The Examiner's login (FR-29) could fail.
- **Suggested spine fix:** Set `Secure` when `hosted` (or in production builds); keep `httpOnly` and `SameSite=Lax` always.

### L6. The bake-off criteria leave out cost and the §8.1 checks
- **PRD IDs:** OQ3, §8.2 ("The architecture chooses the provider and model, with a cost estimate per Application"), §8.1
- **Problem:** The Deferred row scores quality only (L1–L8, G1–G3, R1, guards). It doesn't include cost per Application against 200 NOK a month, or §8.1's paid tier, no-training terms, documented retention and DPA.
- **Suggested spine fix:** Add "cost per Application from measured token counts, and §8.1 pass" as gate criteria to the AI-provider Deferred row, recorded in `docs/architecture.md`.

### L7. Token counts live only in short-retention Vercel logs
- **PRD IDs:** NFR-8, addendum §2.7, SM-6
- **Problem:** Runtime logs on Vercel's Hobby plan are kept only briefly (check the current retention), so the per-request token counts can't support cost estimates or the monthly check.
- **Suggested spine fix:** Also keep a non-personal `ai_usage` row per call (time, operation, model, tokens, outcome) through the gateway, or record token counts from the Fixture runs in `docs/qa/`.

### L8. FR-23 deletion covers the hosted side only
- **PRD IDs:** FR-23 ("deleted when the course ends ... documented in the README")
- **Problem:** The spine's takedown note doesn't cover the local `.data/` database or the README deletion task.
- **Suggested spine fix:** Add "README documents deleting `.data/` and the Supabase project; Vercel logs expire on their own" to Operations.

### L9. Migrating Supabase from a laptop
- **PRD IDs:** FR-30, the spine's migration convention
- **Problem:** Supabase's direct connection on the Free plan is IPv6-only, and the transaction pooler is a poor fit for migrations. `npm run db:migrate` against Supabase may fail on Helene's network.
- **Suggested spine fix:** State that migrations use the session pooler connection string (`MIGRATION_DATABASE_URL`), and the app uses the transaction pooler.

### L10. Access code and secret hygiene aren't enforced in config
- **PRD IDs:** FR-31 (at least 16 characters), NFR-7 (no secrets in history)
- **Suggested spine fix:** The AD-11 zod schema requires `ACCESS_CODE` of at least 16 characters when it is set, and `ENCRYPTION_KEY` that decodes to 32 bytes. Add a secret scan, for example gitleaks, to CI or to the delivery check.

### L11. Auth-library constraints to carry into epic 6
- **PRD IDs:** FR-18, FR-22, AD-10
- **Problem:** Better Auth's default user table has a required `name` column, and its sessions use absolute expiry with refresh, not a 30-minute sliding idle timeout. Both conflict with AD-10 ("name never in auth tables") and FR-18.
- **Suggested spine fix:** Add these two constraints to the auth-library Deferred row, so the epic-6 choice checks them.

### L12. Traceability and maintainability gaps
- **PRD IDs:** NFR-10, NFR-11, NFR-1
- **Problem:**
  - NFR-11 checks the folder structure against "the architecture document", but the spine and `docs/architecture.md` are two documents with no rule for which one wins or how they stay in sync.
  - The capability map has no rows for NFR-2, NFR-3, NFR-7, NFR-8 or NFR-10.
  - `create-next-app` sets `lang="en"`, but NFR-1 requires `lang="nb"`.
- **Suggested spine fix:** Name the spine as the authority, with `docs/architecture.md` as the examiner-facing summary updated in the same commit. Complete the map. Add `lang="nb"` to the conventions.
