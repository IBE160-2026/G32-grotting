---
review: adversarial
lens: 'Two units one level down that each obey every AD to the letter yet build incompatibly'
target: ../ARCHITECTURE-SPINE.md
context: ../../../prds/prd-JobAssistant-2026-10-31/prd.md, ../../../ux-designs/ux-JobAssistant-2026-11-09/EXPERIENCE.md
date: 2026-11-13
counts: { critical: 4, high: 9, medium: 11, low: 8 }
---

# Adversarial review: ARCHITECTURE-SPINE (2026-11-13)

**Verdict:** The spine is solid at the "what exists" level (slices, stack, persistence, gate). It has holes at the "how two units hand data to each other" level, concentrated in three places: the S6 switch from stateless to stored phase 2, the `runAi` input/output shape, and the FR-11 letter-check. A solo developer building S3 in November and S6 in December, each obeying the ADs as written, will rewrite every phase-2 route at S6 and can ship a silent ANALYSIS_STALE loop. Close the 4 critical and 9 high findings before epics are written.

Units are named by PRD §5.1 step (S1 to S6+S7). Each finding: **A** does X, **B** does Y, both obey the cited ADs, **Breaks** says what goes wrong, **Fix** is the AD change.

---

## Critical

### C1. Phase-2 inputs have no stored source after S6, and the request shape flips at S6
- **A (S3 letter route, S4 gaps route):** obeys AD-6 "before accounts, every request carries the inputs it needs". Body is `{ inputs, analysis, tone, fingerprint }`; the gaps route takes the Missing keywords from the client's `analysis`.
- **B (S6 application):** obeys AD-6 "afterwards, the server loads them by `(id, studentId)`" and FR-21/FR-23. The `applications` row holds the Job ad, title, employer and results, but not the CV text, because FR-21 doesn't list it and FR-23 says store as little as possible. AD-8 also says "the server never rebuilds inputs from storage".
- **Breaks:** after S6 the server can't load the CV text by id. So B either reads the *current* Profile CV, which can change between phase 1 and phase 2, or adds a column. Either way every phase-2 route, the letter-check route and the client mutations are rewritten at S6. Before S6, the gaps route trusts Missing keywords the client derived itself, and feeds them to the FR-15 and FR-11 decisions.
- **Fix (AD-6):** One `Phase2Request = { fingerprint, inputs: AnalysisInputs, tone? }` in every phase, carrying raw inputs only, never derived data. The server always recomputes phase 1 from `inputs` (pure and cheap). After S6 it also loads the row by `(id, studentId)` and requires `fingerprint(inputs) === row.fingerprint`. The CV text is never stored on the Application.

### C2. The silent ANALYSIS_STALE rerun can't refresh an idempotent Application
- **A (S3 client, Søknad):** obeys AD-6. On `ANALYSIS_STALE` it silently reruns phase 1 with the same `applicationId` (AD-8: one id per submit, and this isn't a new submit).
- **B (S6 application repo):** obeys AD-8, using `INSERT … ON CONFLICT (id) DO NOTHING`.
- **Breaks:** the rerun is a no-op, the stored analysis and fingerprint stay stale, and phase 2 returns `ANALYSIS_STALE` again. That's an infinite silent loop. If A instead mints a new id for the rerun, History gets an orphan row with a score and no Letter (and an extra JA number).
- **Fix (AD-8):** Phase 1 runs `ON CONFLICT (id) DO UPDATE SET analysis, fingerprint, gaps = NULL, letter = NULL, letter_check = NULL WHERE applications.fingerprint <> excluded.fingerprint`, so a true double submit (same fingerprint) stays a no-op. The client reruns silently at most once; a second `ANALYSIS_STALE` shows the AI-section error.

### C3. Nobody owns the fingerprint, and its coverage is undefined
- **A (S3 Søknad UI):** computes a fingerprint client-side with `shared/core/hashing` (UI may import `shared/core`) over the raw text, so it can skip phase 1 on a refresh.
- **B (S3 analyses route):** computes it server-side over text normalised by `keywords/core` (AD-5: "the only judge of the same word"), plus the vocabulary version.
- **Breaks:** the hashes never match, so every phase-2 call gets `ANALYSIS_STALE` and loops (see C2). Separately, when FR-5b applies, a saved AI Keyword list can appear between phase 1 and phase 2 and change the Keywords without changing the fingerprint. Tone in or out is also undecided.
- **Fix (AD-6):** The server alone computes `fingerprint = sha256(normaliseForHash(cvText, jobAd, jobTitle, employer) + vocabularyVersion + keywordSourceId + contractVersion)` in one pure function (`application/core`); Tone is excluded. `normaliseForHash` (NFC, CRLF→LF, trim, collapse whitespace) lives in `shared/core/hashing` and is distinct from `keywords/core` stemming. The client treats the fingerprint as opaque.

### C4. `runAi(task, input, scope)` leaves `input` unshaped, so FR-26 and the cached lookup can't both work
- **A (S3 letter/server):** obeys AD-15 ("prompts live in `<slice>/server/prompts/`"). It builds the full prompt string, CV included, and calls `runAi('letter', { prompt }, scope)`.
- **B (S3 ai/server):** obeys AD-13 step 3 (`stripContactDetails` on *the CV text*) and AD-15 (the cached adapter looks up by `pairHash` of the CV and Job ad). Both need a structured `{ cvText, jobAd }`.
- **Breaks:** with A's shape, runAi can't find the CV inside a prompt string, so contact details reach the provider (FR-26 is broken silently). The cached adapter also has no pair to hash, so Test mode breaks. The S4 gaps author, weeks later, will copy whichever shape S3 chose.
- **Fix (AD-13):** `runAi({ task, cvText, jobAd, tone?, buildPrompt: (sentCvText) => Prompt, schema }, ctx)`. runAi strips first, then calls the slice's `buildPrompt` with the stripped text. Adapters receive the structured input plus the built prompt. No slice passes a finished prompt string.

---

## High

### H1. Test mode is conflated with the mock adapter, so the FR-24 and FR-25 automated tests can't be written
- **A (S3 ai factory):** obeys AD-3. No AI key means Test mode, and `cached`.
- **B (S3 tests for FR-24, FR-25):** obey AD-13. To test that the notice blocks requests and that the cap stops at 30, they need the notice and cap steps active, which AD-13 skips in Test mode, and a non-paid adapter (`mock`).
- **Breaks:** in CI there is no key, so `testMode = true` and the notice and cap are skipped. The S3 checkpoint ("automated tests for FR-24 to FR-28 pass") can only pass by bypassing `config.ts`, which breaks AD-4.
- **Fix (AD-3 and AD-13):** Split `config.ai.adapter` (`live | cached | mock`) from `config.testMode` (banner, notice skip, cap skip). Tests may run `adapter = mock, testMode = false`; the factory still throws on `live` under VITEST or PLAYWRIGHT.

### H2. The cached lookup key misses for the Example pair (stripped vs raw text, PDF vs TXT, FR-5b)
- **A (S3 runAi):** obeys AD-13. It strips contact details, then calls the adapter with the stripped CV.
- **B (S3 cached adapter):** obeys AD-15. It hashes `input.cvText` and compares it with an index built from `data/fixtures/*/cv.txt` on disk, which is raw.
- **Breaks:** any Fixture CV with a phone or email (realistic ones have both) always misses, so the Example pair shows "not available in Test mode" (SC8, UJ-3). `unpdf` output of `cv.pdf` isn't byte-equal to `cv.txt` after any whitespace normalisation, so "uploaded files hit the same entry" is unproven. The FR-5b keyword task sends the Job ad only, so there is no pair to hash.
- **Fix (AD-15):** runAi computes `lookupKey` *before* stripping: `pairHash(normaliseForHash(cv), normaliseForHash(ad))` for letter and gaps (plus Tone for letters), and `contentHash(ad)` for keywords. The fixture index registers each Fixture under the hash of `cv.txt` *and* of `extract(cv.pdf)`. A test asserts both keys resolve.

### H3. letter-check has two input sources, a race, and an AD-8 self-contradiction
- **A (S3 letter-check route):** obeys the AD-6 diagram. The body carries `{ letter, gaps | null, inputs }`, and the route writes `letter_check` (AD-8: each endpoint writes only its own column).
- **B (S3 «Lag nytt utkast» via the letter route):** obeys AD-8 bullet 4. It replaces `letter` *and clears `letter_check`*, which is a column it doesn't own under bullet 3. After S6, B loads `gaps` from the column, while the client still sends its own `gaps`.
- **Breaks:** a letter-check started for Letter 1 lands after Letter 2 is written and stores (and shows) Letter 1's flags on Letter 2. The Integrity guard is then silently wrong (P1). A Gaps retry that succeeds while a check is in flight produces the same thing in reverse. The `letter` and `gaps` columns are encrypted, so a SQL condition can't compare their contents.
- **Fix (AD-8):** Add plain integer `letter_rev` and `gaps_rev` columns, which the letter and gaps writes increment. `LetterCheck` records `{ letterRev, gapsRev }`, and it is written only `WHERE letter_rev = $1 AND gaps_rev = $2`. After S6, letter-check reads `letter` and `gaps` from the row only (the body carries `fingerprint` and the expected revs). The client also discards a check result whose revs don't match its current mutation data.

### H4. Two owners of the Student's name
- **A (S6 identity, registration):** obeys AD-10 (identity owns `students`). FR-18 registers with a name, so A adds `students.name`.
- **B (S6 profile):** obeys the glossary ("Profile: a Student's name and current CV text") and AD-10 (profile owns `profiles`), so B adds `profiles.name`.
- **Breaks:** the sign-off, the .docx file name and Konto read different columns, and registration has to write two slices' tables with no shared transaction. A crash between the two writes leaves a Student with no Profile, and the AD-13 notice lookup on `profiles` then fails.
- **Fix (AD-10):** The name lives only in `profiles.name`. Repository functions accept an optional `tx`. The registration route runs `identity.createStudent(tx)` and `profile.createProfile(tx, name)` in one transaction, and every Student has exactly one `profiles` row from registration on.

### H5. Circular slice imports are allowed: ai↔profile, letter/gaps↔application, and no host for letter-check
- **A (S3 ai/server):** imports `profile/index` to read `ai_notice_version` (AD-13 step 1).
- **B (S6 profile/server):** imports `ai/index` for the current notice version, to write it on accept.
- **A′ (S3 letter/server):** imports `application/index` to save its column (AD-10: only the owner writes).
- **B′ (S6 application/server, "orchestration"):** imports `letter/index` and `gaps/index` to run phase 2, and hosts letter-check because `integrity` has no server layer.
- **Breaks:** each import obeys AD-1 (other slices' `index.ts` only), but together they form ESM cycles, with exports undefined at module init (flaky, order-dependent). AD-14's ban on letter↔gaps imports is easily dodged through `application`.
- **Fix (AD-1):** Server imports between slices form this DAG: `identity → profile → ai → {letter, gaps, keywords} → match → application → routes` (arrow = "may be imported by"). The notice version comes from `config` only. `application/server` alone orchestrates phase 1, phase 2 and letter-check, and letter, gaps and match never import `application`. `integrity` takes its own structural input types (`CheckableGap { keyword, kind, citation }`) and imports neither letter nor gaps.

### H6. The AI notice before S6 has no defined shape, and a boolean outlives a provider change
- **A (S3 letter route):** obeys AD-13 ("a request flag set from the client session"). It reads `noticeAccepted: true` from the body.
- **B (S4 gaps route):** obeys the same rule but reads an `x-ja-notice` header, and the S5 or S6 author reads the cookie.
- **Breaks:** the two phase-2 routes reject each other's clients. AD-16 stores `noticeAccepted` as a boolean, so after the 18 Nov bake-off changes the provider (a new notice text, FR-24), an open session keeps sending `true` and never sees the new notice. After S6, AD-10 gives `profiles` to profile, but no AD names the accept endpoint.
- **Fix (AD-13 and AD-16):** `AiConsent = { noticeVersion: string }`, defined in `ai/contracts.ts`, is a required field of every phase-2 body before S6. runAi compares it with `config.aiNoticeVersion`. `ja.session.v1` stores `noticeVersion`, not a boolean. After S6 the field is ignored, and `POST /api/profile/notice` (profile slice) writes `config.aiNoticeVersion`.

### H7. The Daily-cap scope is a caller-chosen string, and `ai_usage` conflicts with AD-10
- **A (S3 letter route):** obeys AD-13 (`runAi(task, input, scope)`). It passes the literal `'installation'`.
- **B (S6 identity or application):** obeys AD-10 ("every Student-owned row has `student_id`"). It adds `ai_usage.student_id NOT NULL REFERENCES students`, and the S4 gaps route passes `session.studentId`.
- **Breaks:** after S6, Letters still count against `'installation'`, which leaves FR-25 half per-Student. The migration fails on existing `'installation'` rows, or B's FK makes the installation scope impossible.
- **Fix (AD-13 and AD-10):** runAi derives scope itself from `ctx: { studentId: string | null }` as `studentId ?? 'installation'`, and no caller passes a scope. `ai_usage(scope text, day date, count int, PRIMARY KEY (scope, day))` is exempt from the `student_id` rule and has no FK.

### H8. FR-5b contradicts AD-6's "phase 1 has no AI"
- **A (S2 keywords, `KeywordSource`):** obeys AD-5. With no saved list it asks AI for one (via runAi, AD-13).
- **B (S1 or S2 phase-1 route):** obeys AD-6: synchronous, "no AI", no `maxDuration = 120`, no notice handling in the UI before submit.
- **Breaks:** when FR-5b applies, phase 1 makes an AI request before the notice exists on screen (FR-24), with no route time budget. `AnalysisResult` has no field for "code-only fallback, less precise" (FR-25 and FR-27 rows of the FR-5b table), and the fingerprint doesn't cover the list source (C3).
- **Fix (AD-5 and AD-6):** If FR-5b applies, phase 1 calls `KeywordSource` with `{ allowAi: noticeOk && !testMode }`. On cap, Test mode or failure it uses the code list. `AnalysisResult.keywordSource = 'code' | 'ai-saved' | 'code-fallback'` is in the fingerprint, and the phase-1 route sets `maxDuration = 120`.

### H9. The Letter sign-off and the .docx are built in more places than the spine admits
- **A (S3 letter/server and letter/ui):** the prompt asks for a `{{SIGNATUR}}` token, the stored Letter keeps it, and the UI swaps in «[Navnet ditt]» on render and copy (UX Copy button row). The .docx is built on the server (Deferred: "one unit builds it").
- **B (S6 profile or application):** substitutes the Profile name *server-side* before storing the Letter, since it now has the name. The History row's «Last ned (.docx)» (S6) builds its own file.
- **Breaks:** the server-built .docx contains a literal `{{SIGNATUR}}`. Stored Letters mix the token with baked-in names. FR-11 may scan a real name, and the AI may emit «[Navn]» or invent a name instead of the token. Two .docx builders produce different file names. The Deferred row's claim that the .docx "doesn't cross a boundary" is false.
- **Fix (AD-7, new bullet):** Letter text is stored and sent with exactly one `{{SIGNATUR}}` token; `letter/server` normalises it (appends it if missing, replaces any other sign-off). One pure `letter/core.renderLetter(text, name | null)` and `letterFileName(meta, name | null)` serve render, copy and .docx, built in the browser by every caller. The name comes from the session view (M4).

---

## Medium

### M1. Nobody owns `AiResultMeta`, and the adapters return different shapes
- **A (S3 letter):** defines `AiResultMeta { provider, model, promptVersion, recordedAt }` in `letter/contracts.ts`. The cached adapter returns the file as is, `{ text, meta }`.
- **B (S4 gaps):** defines its own in `gaps/contracts.ts` with `generatedAt` and tokens. The live adapter returns `{ object }` without meta.
- **Breaks:** stored and cached JSON have three shapes, and AD-15's CI check can't read the `promptVersion` field uniformly. Nothing says whether a cached file holds raw AI output or post-guard output; post-guard output would make the planted-response tests meaningless.
- **Fix (AD-7 and AD-15):** `AiResultMeta { source: 'live' | 'cached' | 'mock', provider, model, promptVersion, createdAt }` lives in `ai/contracts.ts` only. Every adapter returns `AiOutput<T> = { data: T, meta }`. Cached files store exactly that shape, holding *raw* adapter output before any guard.

### M2. The Gap contract changes between S4 and S5, and FEATURE_REWORDING has no defined effect
- **A (S4 gaps):** `Gap { keyword, kind, explanation, citation? }`, prompt v1, with `gaps.json` recorded without suggestions.
- **B (S5 rewording):** adds `suggestion` and changes the shared prompt (FR-16: the same request), which changes the PROMPT_VERSION.
- **Breaks:** with `FEATURE_REWORDING` off (cut 2), the deployed prompt still asks for suggestions (wasted tokens), or two prompts and two `gaps.json` files exist, which AD-15 doesn't allow. The S4 UI and the stored Gaps have to be migrated.
- **Fix (AD-7):** The Gap contract is fixed now, with `suggestion: string | null`. There is one gaps prompt; `gaps/server` sets `suggestion = null` (and skips FR-17) when `features.rewording` is off. `gaps.json` is re-recorded once, when S5 lands.

### M3. `encryptedJson(schema)` with a strict parse breaks History after any contract change
- **A (S6 crypto custom type):** parses the decrypted JSON with the current zod schema in `fromDriver`, with `contractVersion` inside the ciphertext.
- **B (S6 application):** adds a plain `analysis_contract_version` column, then changes a contract in the final week.
- **Breaks:** one old row fails to parse inside the Drizzle driver mapping, so the whole Historikk query returns 500, not just that row. And `contractVersion` lives in two places.
- **Fix (AD-11):** `encryptedJson` decodes to `{ contractVersion, data: unknown }` (version inside the ciphertext, nowhere else). The owning repository parses with `parseVersioned(schemaByVersion)`, and a failed section becomes `unavailable`, never a failed query.

### M4. RunMode is baked at build time, and session state has no defined source
- **A (S1 root layout):** obeys AD-4. It reads `config` and passes RunMode, with no dynamic API, so Next prerenders it at `next build`.
- **B (S6 Søknad and Letter UI):** needs the Profile name (sign-off), notice status and session `expiresAt`. One author adds them to RunMode ("the UI reads run state only from there"); another fetches `/api/profile`.
- **Breaks:** an Examiner who runs `npm run build && npm start` and then edits `.env` (TEST_MODE, flags) gets a stale RunMode, which is exactly what AD-4 says it prevents. Name and notice come from two sources.
- **Fix (AD-4):** The root layout calls `await connection()`, so RunMode is computed per request. RunMode holds config only. Session data comes from one `GET /api/session → SessionView { studentId, name, noticeVersion, expiresAt }` under the TanStack key `['session']`.

### M5. The session-expiry warning drifts from the server's throttled extension
- **A (S6 identity/server):** obeys AD-12 and extends the session at most once every 5 minutes.
- **B (S6 client expiry timer):** obeys the UX and warns 28 minutes after the last *client* activity, renewing with a lightweight request at most every 5 minutes.
- **Breaks:** the server can expire up to 5 minutes before the client's estimate, so «Fortsett økten» fails on an already dead session and FR-18's two-minute warning (WCAG 2.2.1) is missed.
- **Fix (AD-12):** Every authenticated response returns `expiresAt`, and the client times the warning from `expiresAt − 2 min`. The explicit renew endpoint always extends; only passive extension is throttled.

### M6. One migration history across story branches, and cross-slice foreign keys
- **A (S6.2 branch, application):** runs `drizzle-kit generate`, which creates `0004_x.sql` and a snapshot, and imports `students` from `identity/index` for the FK.
- **B (S6.3 branch, profile):** generates its own `0004_y.sql`, declaring `student_id uuid` without an FK.
- **Breaks:** after both merge, `drizzle/meta/_journal.json` and the snapshots conflict, so `db:migrate` in the Vercel build fails or skips a migration. `identity/index` now exports a writable table object (against AD-10), and the delete behaviour differs per table.
- **Fix (AD-9):** Migrations are generated only on a branch rebased on `main` just before merge. CI runs `drizzle-kit check` and a from-zero migrate on PGlite. Every `student_id` is `uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE`, through a read-only `studentIdRef` exported for schema files only.

### M7. AI failure codes and retryability are undefined
- **A (S3 letter):** returns `{ ok: false, error: { code: 'AI_NOT_IN_TEST_MODE' } }` for a non-Fixture input in Test mode.
- **B (S4 gaps):** returns `{ ok: true, data: null }` for the same case.
- **Breaks:** the UI shows «Prøv igjen» for one section but not the other, the phase-2 announcement names the wrong failure, and letter-check gets `null` for two different reasons.
- **Fix (AD-7):** A closed set `AiErrorCode = AI_TIMEOUT | AI_PROVIDER_ERROR | DAILY_CAP_REACHED | AI_NOT_IN_TEST_MODE | AI_NOTICE_REQUIRED`, with `retryable` declared once in `ai/contracts.ts`. Both sections return errors only through the envelope.

### M8. The citation check, CV entries and the stripped CV clash with AD-14
- **A (S4 integrity/core `checkCitation`):** obeys AD-14 ("compares words through `keywords/core` only"), using stemmed `normalise`.
- **B (S5 `checkSuggestion`):** needs "the CV entry around the citation" (glossary). The natural owner is `cv/core`, but AD-1 lets a core import only `keywords/core` and `integrity/core`, so B writes its own splitter. Meanwhile the AI quoted the *stripped* CV, and FR-15 checks against the original.
- **Breaks:** stemmed matching lets non-verbatim citations pass, which breaks FR-15's "word for word". There are two entry splitters, and a citation that spans a removed phone number is falsely downgraded.
- **Fix (AD-14):** `keywords/core` exports `normaliseVerbatim` (case and whitespace only) for citations, and `integrity/core` owns `cvEntries(text)`. runAi returns `sentCvText`, and FR-15 and FR-17 check against it. Stripping deletes spans without inserting tokens.

### M9. Nobody owns the catalogue number JA-NNN
- **A (S6 Søknad UI):** shows the next number as `historyCount + 1`.
- **B (S6 application):** derives numbers at read time with `row_number() OVER (ORDER BY created_at)`.
- **Breaks:** with two tabs, both forms say JA-003, and «Lagret i Historikk som JA-003» is wrong for one of them. B's numbers also shift if rows ever change.
- **Fix (AD-8):** `applications.seq int NOT NULL`, `UNIQUE (student_id, seq)`, is assigned in the phase-1 insert as `max(seq) + 1` per Student, with a retry on conflict. The form's "next number" is a hint, and the saved line uses the returned `seq`.

### M10. After S6, Søknad has two CV sources
- **A (S1 Søknad):** reads `inputs.cvText` from `ja.session.v1` (AD-16).
- **B (S6 profile):** the Profile CV is the default (FR-20), and Profil edits it.
- **Breaks:** a pre-login `cvText`, or one from «Bruk eksempelet», silently wins over the edited Profile CV, which breaks FR-3 ("after an edit the analysis uses the edited text"). It's also unclear whether «Bruk eksempelet» replaces the Profile CV (FR-20: "a new paste replaces").
- **Fix (AD-16):** With `features.accounts` on, Søknad takes the CV from the Profile query. `inputs.cvText` is used only as an explicit per-Application override («Bruk eksempelet», never saved to the Profile), and it is cleared at login.

### M11. A failed letter-check hides a Letter that was paid for
- **A (S3 letter UI):** obeys AD-6 ("the Letter is shown with its flags only after the check returns").
- **B (S3 letter-check route):** can fail with `UNEXPECTED`, or after S6 with `NOT_FOUND` on an expired session.
- **Breaks:** the Letter is generated and counted against the cap, but never shown, and it has no retry path.
- **Fix (AD-6):** If letter-check fails, show the Letter with a «Brevet kunne ikke sjekkes» notice and its own «Prøv igjen». The check never blocks the Letter for more than one attempt.

---

## Low

### L1. The core dependency table allows `keywords/core ↔ integrity/core`, and the `index.ts` barrels mix server code
- **A:** `integrity/core` imports `keywords/core`, as AD-14 requires.
- **B:** `keywords/core` imports `integrity/core` for the Upgrade-word list. The table says "any core may import `keywords/core` and `integrity/core`", so this is allowed.
- **Breaks:** a cycle. And if a core reaches another core through `index.ts`, which carries `server-only` re-exports, it pulls server code in (AD-1 says "only through `index.ts`", while the table names `core` paths).
- **Fix (AD-1):** `keywords/core` imports only `shared/core`, and `integrity/core` only `keywords/core` and `shared/core`. Cores import `@/modules/{keywords,integrity}/core` directly (whitelisted in Biome); `index.ts` is the server-side API.

### L2. `keyword_lists` plain text vs FR-22 "keyword lists are encrypted"
- **A (S2 keywords):** stores AI lists in plain text (AD-10: no Student data).
- **B (S7 audit):** reads FR-22 literally and wraps the table in `encryptedJson`.
- **Breaks:** existing rows become unreadable.
- **Fix (AD-11):** Say explicitly that `keyword_lists` is plain by design, and that FR-22's "keyword lists" means the `analysis` column only.

### L3. CRLF fixtures on Windows
- **A (S2 fixtures):** the Answer keys and the blank-line entry splitting assume `\n`.
- **B (the Examiner on Windows):** has `core.autocrlf = true` and checks the fixtures out with `\r\n`; a paste in the browser arrives as `\n`.
- **Breaks:** NFR-6 across machines, CV-entry detection and pairHash (H2).
- **Fix (conventions):** Add `.gitattributes` with `data/** text eol=lf`, and normalise CRLF→LF at the `cv` input boundary and in `normaliseForHash`.

### L4. Two processes on one PGlite directory
- **A:** the developer has `npm run dev` running.
- **B:** `npm run e2e` starts `next start` against the same `.data/pglite`.
- **Breaks:** the `globalThis` singleton protects only within one process, so the database gets corrupted, which AD-9 claims to prevent.
- **Fix (AD-9):** `config.db.pgliteDir` (default `.data/pglite`); e2e uses `.data/pglite-e2e` or memory.

### L5. `server-only` throws under Vitest
- **A (S1 skeleton):** sets up Vitest with its defaults.
- **B (any server test):** imports a file that starts with `import 'server-only'`, which AD-1 makes mandatory.
- **Breaks:** the import throws outside the `react-server` condition, so every server test fails.
- **Fix (conventions):** In `vitest.config.ts`, alias `server-only` to an empty module.

### L6. `TEST_MODE=true` with `APP_ENV=hosted` is undefined
- **A:** AD-3 requires the AI key when hosted.
- **B:** AD-3 says "`TEST_MODE=true` means Test mode".
- **Breaks:** a hosted Test mode would need a key it never uses, with the gate, notice and cap behaviour unspecified.
- **Fix (AD-3):** When hosted, `TEST_MODE=true` is a startup error.

### L7. The Match score is stored twice
- **A (S6):** stores `analysis.score` inside the encrypted JSON.
- **B (S6 History):** sorts and badges by the plain `match_score` column.
- **Breaks:** two copies of the score with no named source of truth (AD-7 already forbids storing the Verdict for the same reason).
- **Fix (AD-8):** `match_score` is written from `analysis.score` in the same statement, and History reads only the column.

### L8. pairHash ignores the job title and employer, and AD numbers are stale across documents
- **A:** an Examiner uploads the Example pair but types another employer, and gets a cached Letter that names the Fixture's employer.
- **B:** the UX (EXPERIENCE.md cites "AD-3", "AD-4", "AD-15") and the PRD addendum use the archived 2026-11-08 AD numbers, so story authors follow the wrong rule.
- **Fix:** In Test mode, the Letter route returns `AI_NOT_IN_TEST_MODE` unless the title and employer also match `meta.json`. Update the AD references in EXPERIENCE.md and the addendum to this spine's numbering (already noted in the memlog).
