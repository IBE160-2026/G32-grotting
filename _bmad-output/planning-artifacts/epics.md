---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/prd.md
  - _bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-JobAssistant-2026-11-13/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-11-09/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-11-09/DESIGN.md
---

# JobAssistant - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for JobAssistant, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

Requirement IDs are the PRD's own (FR-1 to FR-31, FR-5b, NFR-1 to NFR-11) and are cited unchanged. Architecture decisions are cited as AD-1 to AD-17. UX design requirements are numbered UX-DR1 onward in this document.

## Requirements Inventory

### Functional Requirements

**§6.1 CV and Job ad input (S1)**

- FR-1: The Student can upload a CV as a .pdf or .txt file of at most 2 MB, and the system extracts its text. Any other type or size is rejected at the upload field before anything is sent («Bare PDF- og TXT-filer støttes.» / «Filen er for stor.»). A PDF with no extractable text (a scan) gets a message asking the Student to paste the text instead. The uploaded file is discarded after extraction.
- FR-2: The Student can paste the CV text instead of uploading. It must be 200–20,000 characters; text outside the range gets an inline message.
- FR-3: After an upload, the extracted CV text is shown in an editable field and must be confirmed before it is used. No analysis starts before confirmation, and after an edit the analysis uses the edited text. The text can be edited again later: on Søknad before S6, in Profil after S6.
- FR-4: The Student pastes the Job ad text (200–15,000 characters) and types the job title and employer (required, at most 200 characters each). No file upload or URL import. If the Keyword engine finds fewer than 3 Keywords, the system says the ad is too short or unclear and shows no score. Only bokmål ads are supported.

**§6.2 Match score and keyword explanation (S2)**

- FR-5: Code with no AI extracts the Keywords from the Job ad: skills, tools, technologies, methods, qualifications and domain terms from any field (not only IT), including English terms common in Norwegian ads. Stop words and boilerplate are excluded. Duplicates and inflected forms count once. The same ad text always gives the same list.
- FR-5b (pending, decided 17 Nov 2026): if code-only extraction fails SM-2 on every Fixture plus one held-out Fixture, AI may propose the Keyword list once per Job ad. Every AI-proposed Keyword must be found in the ad by the Keyword engine, or it is dropped. The list is saved and reused by a hash of the ad text. If FR-5b applies, its table replaces values in FR-8, NFR-4, SM-7, P6, NFR-8, FR-24, FR-25, FR-27 and NFR-6, and the change is logged in PRD §11. If it passes, FR-5b is deleted.
- FR-6: For each Keyword, the system decides whether and where the CV text contains it. Matching ignores case and accepts Norwegian inflections, hyphen and space variants, split compounds and known English–Norwegian aliases. Paraphrases are left to Gap analysis by default. Over-matching is a defect: each Fixture has negative cases (for example, «ledelse» must not match «prosjektledelse»).
- FR-7: Match score = Matched ÷ all Keywords × 100, rounded to a whole number 0–100, equal weights. Verdict is Strong match at ≥ 70 and Needs work below, computed from the rounded score. Identical inputs give identical score and lists.
- FR-8: The Reflection Note shows «X av Y nøkkelord» next to the score with a one-line formula; the Evidence for every Matched keyword; every Missing keyword with a code-template line («Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.») and the quoted ad line; a link to its Gap once S4 exists; and a disclaimer that the score estimates keyword coverage and is not an ATS result or interview prediction. The score and lists appear without waiting for AI.

**§6.3 Letter (S3)**

- FR-9: One AI request writes a bokmål Letter to the employer for the named job, 250–400 words, built on 2–3 concrete CV examples that best match the ad. It uses only qualifications traceable to the CV text. It is labelled «Utkast skrevet med KI – les gjennom og tilpass før du sender.». The sign-off uses the Profile name, or a visible placeholder without a Profile.
- FR-10: The Student picks one of three Tones before generating; «Formell» is the default. Testable rules: a «Formell» Letter has none of the anecdote markers on a code list; a «Personlig» Letter has at least one motivation phrase from a code list; a «Direkte» Letter is at most 300 words and its first sentence contains a Matched keyword. The Tone shown equals the Tone stored, including after «Lag nytt utkast» and on reopening.
- FR-11 (Integrity guard): once both AI requests have finished, the Keyword engine scans the Letter, skipping the job title and employer. A Missing keyword is allowed only if Gap analysis made it a Rewordable gap whose citation passed FR-15; every other Missing keyword is an Unsupported claim (all of them if Gap analysis failed or S4 is absent). Upgrade words that appear in the Letter but not in the CV text are flagged too (other forms count as the same word). Each flagged word is highlighted with a warning; the Student decides.
- FR-12: The Letter is shown read-only with «Kopier» and «Last ned (.docx)». The file name is ASCII-only, for example `violet-hansen-soknadsbrev-nordic-digital-2026.docx`. «Lag nytt utkast» generates a new Letter that replaces the previous one in the Application and counts toward the Daily cap.

**§6.4 Gap analysis (S4)**

- FR-13: One AI request (shared with S5) turns each Missing keyword into a Gap: a Rewordable gap with an Evidence citation of the supporting CV entry, or a Real gap. A formal requirement (degree, certification, licence, language level, work permit) can be Rewordable only if the CV text states it explicitly. A Real gap is stated plainly, and the Student is never given text to insert.
- FR-14: Each Gap has a one- or two-sentence plain-language explanation that refers to the Job ad, in the UX order (what is missing, why it matters, the covering CV entry). Rewordable gaps use hedged language. No claim that an ATS will reject or rank the CV. Gap explanations and suggestions are marked as written by AI.
- FR-15 (Integrity guard): if a Rewordable gap's citation can't be found word for word in the CV text (ignoring case and whitespace), the Gap is shown as a Real gap with a fixed template, the AI text is dropped, and the downgrade is logged without content. Each Answer key lists must-never-be-Rewordable keywords; none may become Rewordable in live runs.

**§6.5 Rewording suggestions (S5)**

- FR-16: For each Rewordable gap, the Reflection Note shows the cited CV entry and one suggested new phrasing that expresses the Keyword using only facts in that entry. It never upgrades the kind of work or role (an exam paper is not research). Each suggestion has «Kopier»; there is no one-click "add to CV".
- FR-17 (Integrity guard): a suggestion that contains an Unsupported claim is discarded, and so is one containing an Upgrade word that the cited CV entry doesn't contain (other forms count as the same word). The Gap is then shown with its citation but no suggestion, and the discard is logged without content.

**§6.6 Accounts, Profile and History (S6)**

- FR-18: The Student registers with name, email and password (at least 8 characters; each email once), logs in with email and password, and logs out with one click. A session ends after 30 minutes without activity, with a warning 2 minutes before and a one-click continue. Expiry sends the Student to «Logg inn» with «Økten din er avsluttet. Logg inn igjen for å fortsette.», and the pasted Job ad and unsaved CV corrections are kept. After S6, Søknad and the other Student pages require login. On the Hosted version, registration requires the Access code.
- FR-19: Every stored record belongs to one Student. A Student can never read or list another Student's Profile or Applications, including by guessing URLs or IDs; such requests get "not found".
- FR-20: The Profile holds the name and the current CV text; a new upload or paste replaces the old text. A new Application uses the Profile's CV text by default; if there is none, Søknad asks for it first.
- FR-21: An Application is saved automatically once its Match score exists, and the AI sections are added when they arrive. It holds job title, employer, date, Job ad text, score and keyword lists, Gaps and suggestions, and the latest Letter. Historikk lists Applications newest first, 20 per page, each row showing "job title – employer", date and score badge with Verdict text. ~~Hjem shows the 3 most recent.~~ *Product owner, 2026-11-14: the UX version wins; Hjem has no recent-entries list (EXPERIENCE.md, IA). The PRD FR-21 sentence is to be removed and logged in PRD §11.* Reopening shows the Reflection Note and Letter read-only, with copy and download. No search, delete or rename. Empty state: «Ingen søknader ennå. Start med din første stillingsannonse.». Konto shows email, logout and a short note on storage and deletion; no password change or self-service deletion.

**§6.7 Encrypted storage (S7)**

- FR-22: Name, CV text, Job ad text, job title, employer, keyword lists, Evidence, Gaps, suggestions and Letter are encrypted in the database. Only the email, dates and Match scores stay in plain text. The key is a secret (NFR-7). A direct look at the database shows none of the encrypted fields in plain text. Passwords are stored only as salted, deliberately slow hashes. The trust line «CV-en din og dokumentene som lages, lagres kryptert.» is shown only once this FR is implemented.
- FR-23: Uploaded files are discarded after extraction; only the confirmed CV text is stored. AI prompts and responses are never logged; logs hold only metadata (time, token counts, errors). All stored Student data is deleted when the course ends (a README developer task), and the Hosted version and its database are taken down after grading.

**§6.8 AI safeguards (built with S3)**

- FR-24: Before a Student's first AI request, a plain-Norwegian notice says that the CV text and Job ad go to the named provider for the Letter, Gaps and suggestions; that the score is calculated locally; that the provider doesn't train on the text and how long it keeps it; and that sensitive information should be left out. The Student must accept to continue. It is shown once per account (once per browser session before S6) and never in Test mode. No AI request is sent before acceptance.
- FR-25: At most 30 AI requests per Student per day (per installation before accounts, and after cut 1), resetting at local midnight. When the cap is reached, the score still works and the AI sections say the limit is reached and when it resets. A monthly spending limit at the provider backs it up.
- FR-26: Email addresses and phone numbers are removed from the CV text before it is sent to the AI provider.

**§6.9 Test mode and Fixtures**

- FR-27: With no AI key, or with Test mode switched on, the app runs in Test mode with the banner «Testmodus – KI-svarene er forhåndslagret». The Example pair runs the full core flow on Cached responses. «Bruk eksempelet» on Søknad fills both texts, with or without login. The Example pair is also in the repository as files (CV as PDF and TXT, ad as text), and uploading or pasting them reaches the same Cached responses. There is one cached Letter per Tone; «Lag nytt utkast» shows it again. Cached responses are recorded from a live run of the final prompts and labelled with provider, model, prompt version and date. The score works for any input; for other inputs, the AI sections say they are not available in Test mode. Automated tests never make paid AI requests.
- FR-28: At least 3 fictional Norwegian Fixtures, each with an Answer key: expected Matched and Missing Keywords, expected score (no tolerance), must-not-match terms, expected Rewordable and Real gaps, and must-never-suggest items. At least one has a two-column PDF CV, one uses English technical terms, one has inflection and split-compound cases, and one is from outside IT (nursing, built around the FR-16 example). One tests «prosjektledelse» against a semester group project. The Example pair is one of the Fixtures. Only fictional CVs.
- FR-29: Once S6 exists, a local test user (email and password named in the README) exists after setup, with the Example pair's CV in its Profile. The credentials are fictional and local only.

**§6.10 Hosted version (set up in step 1)**

- FR-30: The app is deployed to Vercel over HTTPS at a stable URL named in the README and the submission. It uses live AI with the Daily cap and the provider's spending limit. Functions and database run in an EU region, covered by Vercel's DPA, on the free Hobby plan and a free database tier. Secrets per NFR-7. First deployed early and redeployed as stories merge.
- FR-31: Only people with the Access code can use the Hosted version: requested once per browser session before S6, and at registration after S6. The code is random and at least 16 characters, and it is handed over with the submission, never committed.

### NonFunctional Requirements

- NFR-1 (Language): all interface text and generated content in bokmål, including with English terms in the ad. Every page has `lang="nb"`. Norwegian formats («71 %», «8. sep. 2026», sjevroner). The UX voice: «du», fact first then reason, no cheerleading, exclamation marks or emoji, no needless English loanwords. The Letter follows the same rules but addresses the employer.
- NFR-2 (Accessibility): every screen (Hjem, Registrer deg, Logg inn, Profil, Søknad with results, Historikk, Konto, Tilgangskode) meets WCAG 2.2 AA: keyboard operation, labelled fields, errors tied to fields, progress announced with `aria-live` once for the score and once for the AI sections, meaning never by colour alone, text alternatives for icons, images and the score badge, text contrast ≥ 4.5:1 and control boundaries ≥ 3:1. Touch targets ≥ 44 px. Verified by an axe scan (0 serious or critical) and a keyboard-only UJ-1 walk.
- NFR-3 (Responsive): every core flow is fully usable in a phone browser from 360 px, in a single column, with navigation collapsing at ≤ 640 px.
- NFR-4 (Performance): for Fixture inputs, score and lists within 2 s; AI sections within 60 s in at least 4 of 5 timed runs. Two phases with a descriptive progress line. AI requests time out after 90 s and can be retried.
- NFR-5 (Stability): the 6-input wrong-input tour gives the expected inline error and keeps input. A double submit starts one Application and one set of AI requests. A refresh never shows a raw error or stack trace. Input is kept after any error. Errors are inline, Norwegian, field-level. A network or provider failure shows the UX error banner or inline error. If the AI part fails, times out, hits the cap or is unavailable, the score stays and only AI sections can be retried. Every state in EXPERIENCE.md is built and walked through.
- NFR-6 (Determinism): identical inputs give identical Keyword lists, matches and scores across runs and machines. Dependency and Docker image versions are pinned.
- NFR-7 (Security): secrets (AI key, encryption key, Access code) live only in environment variables, never in the repository. Locally, setup generates local secrets and an optional git-ignored `.env` adds a live key; on Hosted they live in Vercel's environment variables; `.env.example` documents each without values. HTTPS only on Hosted. Repository history checked for secrets before delivery. Every data access is authorised on the server, and all input is validated on the server. Uploaded files are never executed or served back.
- NFR-8 (Cost): AI spend ≤ 200 NOK per month. At most 2 AI requests per Application plus new Letters. Daily cap, provider spending limit and token counts logged per request. Hosting at no cost. Tests and Test mode make no paid requests.
- NFR-9 (Runnability): on a clean machine, the README alone gets the app running in Test mode within 15 minutes. Docker is the only prerequisite (version named). One Docker Compose command starts app and database; first start creates local secrets, prepares the database and seeds the test user. Commands are portable across Windows, macOS and Linux. One command runs all automated tests in Docker, and they pass on the delivery commit. No paid account, cloud service or API key is needed locally. The README covers purpose with screenshot, environment variables and live-key run, core flows (UJ-1, UJ-3) and test user, Hosted URL, folder overview, and links to brief, PRD §11, UX, architecture, epics, `docs/qa/` and logs.
- NFR-10 (Traceability): every story cites its FR and NFR IDs; each story is built on its own branch and merged by a pull request naming those IDs; every commit cites a story or FR ID; every automated test is named after or tagged with its FR or NFR; planning documents are updated in a commit naming changed IDs when a requirement changes.
- NFR-11 (Maintainability): a linter and formatter pass on the delivery commit; folder and module structure matches the architecture; no dead code, duplicated files or commented-out remains of AI attempts.

### Additional Requirements

**Product-owner structure rule (2026-11-14, this workflow)**
- Epics and stories are vertical slices: each story's code lives inside its own slice folder as far as possible (`src/modules/<slice>/{core,server,ui}`, AD-1), so a slice can be built, tested and cut on its own.
- DRY: anything used by two or more slices lives once, in a shared folder, and is reused rather than copied. Shared code goes in the shared kernel: `src/shared/core` (pure helpers), `src/shared/server` (config, db, crypto, log, handle, data-files) and `src/shared/ui` (api-client, client-session, messages, RunMode, announce, and the shared UI components such as buttons, text fields, code strips, alerts, notices, dialog, copy button and evidence quote). A component owned by one slice but used by another (for example the Letter view, used by the result and by a Saved Application) is exported through that slice's `ui/index.ts`, never duplicated.
- A shared component or helper is created in the first story that needs it, and later stories extend it instead of adding a variant.

**Starter template and repository setup (affects Epic 1, Story 1)**
- Scaffold with `npx create-next-app@16.4.6 ja-scaffold --ts --tailwind --biome --app --src-dir --import-alias "@/*" --use-npm --no-agents-md --no-cache-components --no-react-compiler --no-agent-feedback --disable-git`, run in a temporary folder and moved into the repository root (create-next-app refuses a non-empty folder).
- Then pin every version in the Stack table exactly (no `^`), and commit `package-lock.json` (NFR-6).
- `.gitattributes` (`* text=auto eol=lf` plus `*.pdf binary`) is committed before the first source file, because `core.autocrlf=true` is set on Helene's machine.
- Geist is removed; fonts load through `next/font/google`: Schibsted Grotesk, DM Mono, Archivo (with `wdth` axis).
- `.gitignore` covers `.env*` (except `.env.example`) and `.data/`; CI fails if `git ls-files .data .env` prints anything.

**Module structure and boundaries (AD-1, AD-2)**
- Slices: `cv`, `keywords`, `match`, `letter`, `gaps`, `integrity`, `ai`, `application`, `identity`, `profile`; shared kernel `src/shared/{core,server,ui}`. A layer exists only once it has code.
- Public entry points only: `index.ts` (server API, `import 'server-only'`), `contracts.ts` (zod, isomorphic), `ui/index.ts`, and `core/index.ts` only for `keywords` and `integrity`.
- Allowed server imports: application → letter, gaps, match, profile, identity, keywords, cv; letter, gaps, keywords → ai; match → keywords; profile → identity. `keywords/core` imports only `shared/core`; `integrity/core` imports only `keywords/core` and `shared/core`. Enforced by Biome `noRestrictedImports`.
- `core/` is pure: no I/O, `process.env`, `Date.now()`, `Math.random()` or `crypto.randomUUID()`; time and ids come in as parameters.
- Every `index.ts` and `server/` file starts with `import 'server-only'` (except `server/schema.ts` and `shared/server/crypto.ts`). Vitest aliases `server-only` to an empty module; scripts run with `tsx --conditions=react-server`.
- One Next.js app on Node; only companion is Postgres. Clients read and write only through JSON route handlers via `src/shared/ui/api-client.ts`. No Server Actions. Pages are server components; Søknad, Profil and Historikk are client components.

**Config, run modes and feature flags (AD-3, AD-4)**
- `src/shared/server/config.ts`: lazy memoised zod parse of the environment; the only reader of `process.env` and `SECRETS_FILE`. No `NEXT_PUBLIC_` variables; route files read config only inside handlers; `next.config.ts` reads no environment.
- Adapters chosen by config: `config.ai.adapter` = `live` | `cached` | `mock`; `config.testMode`; `config.db` from the `DATABASE_URL` scheme (`postgres` or `pglite://memory` for tests). No AI key or `TEST_MODE=true` gives Test mode with `cached`.
- Test-run guards (`config.isTestRun`): ignore `SECRETS_FILE`, treat any AI key as absent, throw on `postgres`, AI factory throws on `live`.
- Hosted detection: `VERCEL=1` without `APP_ENV=hosted` is a startup error; on Hosted, startup fails without `ACCESS_CODE` (≥ 16 chars) and `DATABASE_URL`, the AI key once `AI_PROVIDER` is set, and `ENCRYPTION_KEY` once accounts are on. `TEST_MODE=true` with `APP_ENV=hosted` is a startup error. Before S3, Hosted runs with the AI sections unavailable.
- `RunMode { testMode, hosted, features: { accounts, gaps, rewording, keywordFallback }, aiNotice: { version, providerName, retentionDays } }` is sent from the root layout (after `await connection()`) into one client context.
- Feature flags `FEATURE_ACCOUNTS` (S6 + S7), `FEATURE_GAPS` (S4), `FEATURE_REWORDING` (S5), `FEATURE_KEYWORD_FALLBACK` (FR-5b). Defaults live only in `config.ts` (`FEATURE_DEFAULTS`); a flag is off until the last story of its epic switches its default on. `compose.yaml`, `.env.example` and the README never set `FEATURE_*`. A cut means the flag stays off. Code checks flags only through `config.features` or `RunMode.features`.
- `aiNotice.version` changes whenever the provider, retention period or `keywordFallback` changes.

**Keyword engine (AD-5)**
- `keywords/core` owns the only `normalise`/`stem` pipeline (case, æøå, hyphens and spaces, a suffix pre-step for noun forms Snowball misses, then Snowball Norwegian from `@orama/stemmers/norwegian`), pinned early in Epic 2 by a table test of forms; plus compound and alias rules, `extractKeywords(adText, vocabulary)` and `findKeyword(text, keyword)`. Synchronous and pure; nothing else stems or compares words.
- Vocabulary is versioned JSON in `data/vocabulary/` with `vocabularyVersion`, loaded by the shell.
- Each `Keyword` carries its match stage (`exact` | `inflection` | `compound` | `alias`) and positions in the ad (`{ paragraph, start, end }[]`).
- `KeywordSource.resolve(jobAd, ctx)` in `keywords/server` is the only way Keywords reach `match`; returns `{ keywords, keywordSource: 'code' | 'saved' | 'code-fallback' }`. FR-5b path goes through `runAi` and `keyword_lists`.

**Two-phase analysis API (AD-6) and write model (AD-8)**
- One request shape: `{ applicationId, fingerprint?, inputs: { cvText, jobAd, jobTitle, employer } }`, plus `consent: { noticeVersion }` before accounts and `tone` for the Letter.
- The fingerprint is computed only on the server (`application/core`): `sha256(canon(inputs) + vocabularyVersion + keywordSource + contractVersion)`, Tone excluded.
- Phase 1 `POST /api/analyses` validates, resolves Keywords, matches and scores. Phase 2 `POST /api/analyses/[id]/letter` and `/gaps` run in parallel; each recomputes phase 1, returns `ANALYSIS_STALE` on mismatch, makes exactly one AI request with a 90 s abort, sets `maxDuration = 120`, and is retryable alone.
- `POST /api/analyses/[id]/letter-check` runs FR-11 with `{ letter, gaps | null, letterRev, gapsRev }`, re-running `checkCitation`; sent when the Letter has arrived and Gaps have settled, again after a Gaps retry and after «Lag nytt utkast». A failed check leaves the Letter with a "not checked" notice and a check-only retry. On `ANALYSIS_STALE`, the client reruns phase 1 once silently.
- The client creates `applicationId` with `crypto.randomUUID()` when inputs are confirmed and reuses it until inputs change. Submit is disabled while in flight; one mutation in flight per section.
- After accounts: one `applications` row (`job`, `analysis`, `gaps`, `letter`, `letter_check`; plain `fingerprint`, `seq`, `match_score`, `letter_rev`, `gaps_rev`, timestamps). CV text is never stored on an Application. Phase 1 upserts `ON CONFLICT (id) DO UPDATE … WHERE fingerprint differs AND student matches`. Letter route writes on success only; check writes only when revs match. `seq` = `max(seq)+1` per Student under `UNIQUE (student_id, seq)`, formatted `JA-NNN` by `application/core`. Reopened Applications are read-only snapshots; a `null` section shows «Ikke laget.».

**Shared contracts and errors (AD-7)**
- Each slice's zod schemas in `contracts.ts` are the only wire and storage shapes. `AiResultMeta` and `AiOutput<T>` live only in `ai/contracts.ts`.
- Fixed shapes: `Gap = { keyword, kind, explanation: { text } | { key, params }, citation, suggestion }`, `Letter = { text, tone, rev }`, `LetterCheck = { flags, letterRev, gapsRev }`.
- Envelope `{ ok: true, data }` / `{ ok: false, error: { code: MessageKey, field?, retryable } }` with fixed HTTP statuses per code. UI branches on `AI_TIMEOUT`, `AI_PROVIDER_ERROR`, `DAILY_CAP_REACHED`, `TEST_MODE_UNAVAILABLE`, `AI_NOTICE_REQUIRED`, `ANALYSIS_STALE`, `SESSION_EXPIRED`, `ACCESS_REQUIRED`, `NOT_FOUND`, `NETWORK_ERROR`.
- The server sends no Norwegian prose except AI content; templates travel as `{ key, params }`. Every UI string is in `src/shared/ui/messages.nb.ts`.
- Verdict is derived only in `match/core` and never stored.
- Sign-off: exactly one `{{SIGNATUR}}` token per stored Letter; the name is never sent to the AI. `letter/core` `renderLetter(text, name | null)` and `letterFileName(meta, name | null)` serve screen, copy and .docx; placeholder «[Navnet ditt]». The .docx is built in the browser.

**Persistence (AD-9, AD-10)**
- Drizzle ORM on Postgres 17 everywhere: local `db` container, Supabase Free in Frankfurt on Hosted (session pooler port 5432, `{ max: 1, idle_timeout: 20 }`), PGlite in memory for tests (one instance per process, migrated on first open; `seedTestUser` under `E2E=1`).
- Each table is defined in its owning slice's `server/schema.ts`; `student_id` is `uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE`.
- One drizzle-kit history in `drizzle/`, generated only on a branch rebased on `main` just before merge. `scripts/migrate.ts` is the only way migrations are applied (setup, Vercel build, CI). CI runs `drizzle-kit check` and a from-zero migration on PGlite.
- Query builder with `.returning()`; raw SQL only through `db.ts` helpers; aggregates cast (`count(*)::int`).
- Table ownership: `identity` → `students`, `sessions`; `profile` → `profiles` (name, CV text, `ai_notice_version`); `application` → `applications`; `ai` → `ai_usage`; `keywords` → `keyword_lists`. Registration creates student and profile in one transaction.
- Repository functions take `studentId` from the session as first parameter and look up by `(id, studentId)`; a miss returns `NOT_FOUND`.
- Supabase: Data API off, RLS on with no policies, no `supabase-js`.

**Encryption and passwords (AD-11)**
- AES-256-GCM via `node:crypto` with one 32-byte base64 `ENCRYPTION_KEY`; stored form `v1.<iv>.<tag>.<ciphertext>` (base64url). Personal fields only through `encryptedText` / `encryptedJson` in `src/shared/server/crypto.ts`. `encryptedJson` holds `{ contractVersion, data }`; a section that fails to parse becomes unavailable and never fails the query.
- `db.ts` calls `initCrypto(config.encryptionKey)` on first open; `encryptedText` throws before that.
- Setup stores `sha256(ENCRYPTION_KEY)` in a one-row `local_meta` table and stops on mismatch with a reset instruction.
- Passwords: scrypt with a random 16-byte salt, stored as `scrypt$N$r$p$salt$hash`.

**Sessions and Access code (AD-12)**
- Hand-built sessions: opaque 32-byte token in cookie `ja_sid` (httpOnly, SameSite=Lax, Secure when hosted); DB stores only its SHA-256. 30-minute inactivity, extended at most every 5 minutes; `POST /api/session/renew` always extends. `X-Session-Expires-At` header on authenticated responses drives the client warning. `GET /api/session` returns `SessionView`.
- Before accounts, `src/proxy.ts` requires cookie `ja_access` = HMAC-SHA256(`ACCESS_CODE`, `"ja_access.v1"`), a session cookie; exempt `/tilgang`, `/api/access`, `/api/health` and static assets; pages redirect to `/tilgang`, `/api` gets 401 `ACCESS_REQUIRED`. After accounts the code is checked only at registration on Hosted.
- The gate decision is a pure `gateDecision({ hosted, accountsOn, path, cookieValid })` in `identity/core`, unit-tested.
- `seedTestUser` runs only with accounts on, `APP_ENV=local` and a local DB host; it upserts the test user's Profile CV from the Example pair.

**AI pipeline (AD-13) and integrity (AD-14)**
- Every AI request goes through `ai/server` `runAi(request, ctx)`; slices pass `buildPrompt(sentCvText)`, never a finished prompt. Steps: lookup key from unstripped inputs → notice version check (skipped in Test mode) → atomic Daily-cap reservation on `ai_usage` (scope `studentId ?? 'installation'`, Oslo day, no refund; skipped in Test mode) → `stripContactDetails` → prompt and adapter with 90 s abort and SDK retries 0 → exactly one content-free `LogEvent`. Returns `AiOutput<T>` plus `sentCvText`.
- `log()` in `shared/server/log.ts` takes only the `LogEvent` union; Biome `noConsole` is an error elsewhere. Every route handler is wrapped in `shared/server/handle()`, which logs only `{ code, errorName, route }`.
- `integrity/core` holds `checkLetter`, `checkCitation`, `checkSuggestion`, `checkTone`, `cvEntries(text)`, and the code lists (Upgrade words, anecdote markers, motivation phrases). It takes structural inputs and imports neither `letter` nor `gaps`. `checkCitation` is a substring test on `canonVerbatim` text against `sentCvText`; other checks compare words through `keywords/core`.
- `gaps/server` order: exactly one Gap per Missing keyword (extra AI items dropped, skipped ones become template Real gaps) → FR-15 → FR-17 → when `features.rewording` is off, every suggestion is `null` and FR-17 is skipped. Downgrades and discards logged as counts only. `checkTone` runs only in tests and `scripts/qa-compare.ts`.

**Fixtures and Cached responses (AD-15)**
- `data/fixtures/<id>/`: `cv.txt`, `cv.pdf` where it exists, `ad.txt`, `meta.json`, `answer-key.json`, `cached/` (`letter-formell.json`, `letter-personlig.json`, `letter-direkte.json`, `gaps.json`, plus `keywords.json` only if FR-5b applies).
- Cached files hold exactly `AiOutput<T>` (raw adapter output before guards), written only by `scripts/record-cached.ts`. Planted bad outputs live in `data/fixtures/_planted/`, read only by tests and never traced.
- Runtime reads of `data/` only through `shared/server/data-files.ts`; `next.config.ts` `outputFileTracingIncludes` covers vocabulary and the Example pair folder.
- `cv.txt` is generated by a script from `unpdf` extraction of `cv.pdf` where one exists.
- Lookup keys: Letter `sha256(canon(cv), canon(ad), canon(jobTitle), canon(employer), tone)`; Gaps `sha256(canon(cv), canon(ad))`; Keywords `contentHash(canon(ad))`. Each Fixture is indexed under the hash of `cv.txt` and of `extract(cv.pdf)`; a test asserts `cv.pdf`, `cv.txt` and «Bruk eksempelet» give the same key. A miss returns `TEST_MODE_UNAVAILABLE`.
- Prompts live in `<slice>/server/prompts/` with `PROMPT_VERSION`. One gaps prompt that asks for suggestions; `gaps.json` re-recorded once when S5 lands. CI fails when the Example pair's cached `promptVersion` differs from the current one.

**Client state (AD-16)**
- One `sessionStorage` key `ja.session.v1` through `src/shared/ui/client-session.ts` only: `{ v, applicationId?, inputs: { cvText?, cvDraft?, jobAd?, jobTitle?, employer?, tone }, noticeVersion?, lastEmail?, restoredAfterExpiry? }`.
- «Logg ut» clears everything except `jobAd`, `jobTitle`, `employer`, `tone`. On `SESSION_EXPIRED`, `api-client` saves the session (with `cvDraft`) and goes to «Logg inn».
- With accounts on, Søknad takes the CV text from the Profile query; `inputs.cvText` is only a one-off override from «Bruk eksempelet», never saved to the Profile and cleared at login.
- Server state in TanStack Query, one mutation per phase-2 section. No other global store.

**Local run, CI and hosting (AD-17, deployment seed)**
- `compose.yaml` (name `jobassistant`) with services `db` (`postgres:17.12-alpine`, fixed local credentials, volume `pgdata`, `pg_isready`, published on `127.0.0.1:54320`), `app` (Dockerfile target `app`, waits for healthy `db`, `APP_ENV=local`, `DATABASE_URL` to `db`, `SECRETS_FILE=/data/secrets.env` on volume `appdata`, optional `.env`, healthcheck on `/api/health`, published on `127.0.0.1:3000`) and `test` (target `test`, profile `test`, runs `npm test` on PGlite).
- `app` runs `scripts/setup.ts` then `next start -H 0.0.0.0 -p 3000`. Setup: write missing local secrets with flag `wx` (never overwrite), then under `pg_advisory_lock` migrate, check key against `local_meta`, seed. Writes secrets and seeds only with `APP_ENV=local` and a local DB host.
- One multi-stage `Dockerfile` on `node:26.13.1-trixie-slim`: `deps`, `build` (no environment), `app` (chown, keeps `node_modules`, `/data` owned by `node`, `NODE_ENV=production`), `test` (Playwright Chromium with deps). No `output: 'standalone'`.
- README commands: `docker compose up --build`, `docker compose run --rm --build test`, `docker compose down -v`. No shell scripts; all scripts are TypeScript run with `tsx`. `.dockerignore` excludes `node_modules`, `.next`, `.data`, `.env*`, `.git`.
- Developer loop: `docker compose up db` + `npm run dev` (`predev` runs setup); config defaults the local `DATABASE_URL` and `SECRETS_FILE`.
- Vercel: `vercel.json` `{ "framework": "nextjs", "git": { "deploymentEnabled": { "**": false, "main": true } } }`, Production from `main` only, region `fra1`, Node 26; build runs `db:migrate` then `next build`. `DATABASE_URL` set only for Production. Never add a `Dockerfile.vercel`.
- GitHub Actions CI: build `app` and `test` with a gha cache, run tests, `db:check`, `up -d --wait app` then `scripts/smoke.mjs` (`/api/health`, plus seeded login once S6 lands), `down -v`. Protected `main`, merged by pull request when CI is green. `keep-alive.yml` calls `/api/health` twice daily.
- `GET /api/health` runs `SELECT 1` and returns `{ hosted }`.
- Operations: cut 0 = set `main` to `false` in `deploymentEnabled`; provider spending limit set when the key is created; delete Vercel and Supabase projects at course end; DPA records for Vercel Hobby and Supabase Free go in `docs/qa/` in the setup story (week 46).

**Conventions**
- English identifiers from the PRD Glossary (`Keyword`, `MatchedKeyword`, `Gap`, `Letter`, `Tone`, `Application`, `Profile`, `Student`); kebab-case files; UUID v4 ids; `timestamptz` UTC with the Oslo day from `shared/core/time`; SHA-256 hex; camelCase JSON, snake_case columns; CRLF→LF where text enters.
- `Result<T, E>` in core; `MessageKey` codes in SCREAMING_SNAKE.
- Every route handler parses its body with the slice's zod schema inside `handle()`; the client reuses the same schemas for inline errors.
- Tests: Vitest next to the file (`*.test.ts`), fixed `test.env`; Playwright + `@axe-core/playwright` in `e2e/` with `next build && next start -p 3100` and fixed `webServer.env`. `npm test` runs Biome, `next typegen`, `tsc --noEmit`, Vitest, Playwright. Test names start with the requirement ID.
- One branch per story, `story/<epic>.<story>-<slug>`; commits and PRs cite story and FR IDs.

**Deferred decisions with dates**
- AI provider and model: bake-off at the start of S3 (18 Nov) between `@ai-sdk/anthropic` and `@ai-sdk/openai`, after a DPF check; uses a rough Gap prompt that S4 replaces; losing package removed afterwards.
- FR-5b on or off: 17 Nov, against SM-2 on every Fixture plus a held-out one.
- Vocabulary contents: tuned against the Answer keys in Epic 2.
- Login rate limiting: only if an Epic 6 story needs it.

**Process and QA evidence (PRD §9, addendum §6)**
- Every FR or NFR with a Manual Verify line gets a row in `docs/qa/` (procedure, timing, dated pass/fail), written with the story that implements it. Minimum record if time is short: PRD §5.1.
- §9.2 manual checklist (L1–L8, G1–G5, R1–R3) on live Fixture runs: first run as soon as S5 works; 3 live runs per Fixture for the final prompt version; outputs committed to `docs/qa/`; `scripts/qa-compare.ts` helps with G2 and G4.
- §9.3 manual UX checks: keyboard-only UJ-1, real phone once, axe and contrast on every screen, wrong-input tour, language check, UJ-1 on Hosted.
- `docs/qa/` also holds the AI-steering index, bugs found in AI-generated code, and screenshots or a recording of one live run.
- Decision points: core-flow checkpoint 24 Nov (tests for FR-1–FR-12 and FR-24–FR-28 pass, SM-1 for the Example pair in Test mode and one live Fixture, SM-2, wrong-input tour); 3 Dec (tests for FR-13–FR-17 pass, one live Fixture run without G2 or R1 failures).

### UX Design Requirements

**Design tokens and foundation**

- UX-DR1: Map every DESIGN.md token to Tailwind v4 `@theme` variables in `src/app/globals.css`: the colour set (grounds, ink and lines, code family moss/rust/amber/sand, state colours), the spacing scale and named spacing tokens, the typography roles (with `-mobile` variants, sizes in `rem`), and `rounded` = 0. One dark theme with `color-scheme: dark`; no light variant or toggle. Page container capped at 1256 px on `board`.
- UX-DR2: Load Schibsted Grotesk (400–800), DM Mono (400, 500) and Archivo (125 % width, `wdth` axis) through `next/font/google`. Caps and code roles are uppercased by CSS from sentence-case source. Tabular numerals in score, formula and counters.
- UX-DR3: A custom `max-640` Tailwind variant (`@media (max-width: 640px)`) drives the mobile layout; a container query on the app bar collapses the logged-in nav when it doesn't fit. No horizontal scroll down to 320 px; headings and body use `overflow-wrap: break-word` and `hyphens: auto`, mono strings `overflow-wrap: anywhere`. Every height is a `min-height`; no text container uses `overflow: hidden` or ellipsis.
- UX-DR4: All UI strings live in `src/shared/ui/messages.nb.ts`, sourced from the EXPERIENCE.md Key strings table, following the voice rules (Norwegian formats, sjevroner, «samsvar» not «poengsum», hedging).

**Shared UI components (built once in `src/shared/ui`, reused by every slice)**

- UX-DR5: App bar with wordmark (amber pulse glyph + «JobAssistant») and nav whose item set depends on build variant and login state; `aria-current="page"`; `<nav aria-label="Hovedmeny">`; static (never sticky); at ≤ 640 px a «Meny»/«Lukk» toggle with `aria-expanded`/`aria-controls`, in-flow full-width 56 px rows (never an overlay), Esc closes and returns focus. Historikk carries its entry count after S6.
- UX-DR6: Buttons: primary (at most one per view), secondary, small, disabled and busy (`aria-disabled="true"`, label unchanged, 18 px progress glyph, `cursor: progress`, second click does nothing). Square corners, 48 px controls, 44 px small.
- UX-DR7: Link component: real `<a href>`, always underlined (edge line, amber on hover), standalone hit area ≥ 24 px; nav links and register titles exempt from the underline.
- UX-DR8: Focus ring: 2 px amber outline offset 2 px over a ground gap; inset (−2 px) only on Tone options; never removed or clipped.
- UX-DR9: Text field (and CV variant in DM Mono): label above, hint and error tied by `aria-describedby`, validation on blur and submit (never per keystroke), counter «612 av 20 000 tegn» announced on blur, `aria-invalid` on error, input never cleared, rust «Feil» strip before error text, correct `autocomplete` tokens, paste never blocked.
- UX-DR10: Password/Access-code «Vis»/«Skjul» toggle (`aria-pressed`, 44 px).
- UX-DR11: File picker: visually hidden native `<input type="file">` (accessible name «Velg fil, PDF eller TXT, maks 2 MB») with the visible «Velg fil» as its `<label>`; focus ring drawn on the label via `:has(input:focus-visible)`; type/size checked before any request; file name and «Henter ut teksten fra CV-en …» while extracting; rust border and alert on error. Used on Søknad before S6 and on Profil.
- UX-DR12: Code strip component with variants found (moss), missing (rust), rewordable (amber), ai (sand) and outline; real text, never colour alone, not interactive.
- UX-DR13: Copy button: plain text only, `{{SIGNATUR}}` replaced via `renderLetter`, «Kopiert» for 1.8 s, «Kopiert til utklippstavlen.» in the second polite region, entry name in the accessible name in Historikk, clipboard-blocked fallback (select text + notice «Kopier med Ctrl+C, eller hold inne på mobil.»). Used by Letter, suggestions and Historikk.
- UX-DR14: Evidence quote: word-for-word in sjevroner, the Keyword bold with a 2 px amber underline, trimmed at word boundaries with «…» past about 160 characters, mono source line. Used by keyword entries and Rewordable gaps.
- UX-DR15: Alert (rust border on alert-ground, «Feil» strip; `role="alert"` for upload and network failures; section failures hold «Prøv igjen») and Notice (edge outline, outline strip such as «Dagens grense», «Testmodus», «Ikke laget»; never `role="alert"`, never rust).
- UX-DR16: Test-mode banner under the app bar on every page while `testMode`: sand «Testmodus» strip + «Testmodus – KI-svarene er forhåndslagret» + «Samsvaret regnes likevel ut av koden.», `role="note"`, not dismissible, inside `<header>` after `<nav>`.
- UX-DR17: Dialog on native `<dialog>` with `showModal()`: labelled by title, described by body, focus starts on the title, focus trapped and returned, scrim click does nothing, one level only. Used by the AI notice and (as `role="alertdialog"`) the expiry warning.
- UX-DR18: Catalogue heading (the page's single `h1`: mono number, muted `·` that is `aria-hidden` with a hidden comma, employer; dimmed next number on the form; mobile drops the `·`) and Credits list (`<dl>`: Stilling, Dato, Tone, Annonse; stacked variant on Konto).
- UX-DR19: Two polite live regions in the root layout, rendered empty outside the form/result subtree, exposed through one `announce()` in `shared/ui`: the first speaks exactly twice per Application (phase 1 and phase 2 lines); the second carries copy confirmations, «Lagret.», retry and new-draft outcomes, «Eksempelet er fylt inn.», pagination and a blocked clipboard. Text replaced, never appended.
- UX-DR20: Skip link «Hopp til hovedinnholdet» as the first focusable element on every page, targeting `<main id="hovedinnhold" tabindex="-1">`; one `<header>`, one `<main>`, no content outside landmarks; page titles «{side} – JobAssistant»; focus at document top after every navigation.
- UX-DR21: Cold-load skeleton: ruled rows in `rule` colour matching the final layout, no shimmer (Historikk, Saved Application, Profil, Konto).

**Slice-owned components (exported through the owning slice's `ui/index.ts`)**

- UX-DR22: Pulse plot (deterministic SVG drawn in the browser from ad text and phase-1 lists): full mode (one baseline per paragraph, peaks per Keyword, thick line for Matched, dashed for Missing, paragraph indices, legend), compact mode at ≤ 640 px (`viewBox 0 0 328`, only paragraphs with Keywords, right-hand label column with dotted leaders, figcaption saying what is left out), flat mode (`plot-flat`, `aria-hidden`); redraws after fonts load and on resize (150 ms debounce); `role="img"` with a data-built `aria-label`; no hover or focusable part. Used on Hjem (Example ad), Søknad form (flat), result, Saved Application and empty Historikk.
- UX-DR23: Score block: score sentence «71 % samsvar – 5 av 7 nøkkelord» as `h2`, verdict strip (moss «Sterkt samsvar» or outline «Bør forbedres») with threshold sentence, «Formel» + formula line, disclaimer; «Mindre presist …» notice under the formula only with fallback Keywords; never waits for AI.
- UX-DR24: Keyword entry: Matched (Keyword, found strip, Evidence quote, «Bevis · CV-linje N · annonsen avsnitt NN») and Missing (Keyword, missing strip, FR-8 template line, quoted ad line, «Fra annonsen · avsnitt NN», and «Se gapanalysen» in-page link to the Gap `h3` once S4 exists). Strips sit inside the `h3`.
- UX-DR25: Tone choice: native radio group in a `fieldset` with legend «Tone i brevet», «Formell» preselected, whole option is the hit area, arrow keys within the group, inset focus ring, options stack at ≤ 640 px; labels «Formell – Høflig og saklig», «Personlig – Varm, med «jeg» i front», «Direkte – Kort, rett på sak».
- UX-DR26: CV disclosure (after S6): native `<details>`, collapsed by default with character count and Profile save date, opened shows read-only text with a link to Profil. Before S6 the same slot holds the file picker, editable CV text and «Bekreft CV-teksten», collapsing to «CV-tekst bekreftet · 3 412 tegn»; any edit requires confirming again.
- UX-DR27: Gap entry (one per Missing keyword in list order; «Omformulerbart gap» / «Reelt gap» strip; FR-14 order; downgraded or skipped Gaps render as the Real-gap template only), Suggestion box (lift box headed «Omformuleringsforslag» with small «Kopier», then the fixed hedge line; replaced by the discard line if FR-17 discards) and No-copy note (dashed outline, «Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.», always on a Real gap).
- UX-DR28: Letter view: `<article aria-labelledby="letter-h2" aria-describedby="letter-ai-label">`, read-only (never textarea or `contenteditable`), lift background, 72ch measure; action stack «Kopier» (primary), «Last ned (.docx)», «Lag nytt utkast» (fresh result only) and the hint; actions full width under the Letter at ≤ 640 px. Used on the fresh result and the Saved Application.
- UX-DR29: Letter flag: warning list (alert treatment) between the AI label and the Letter, one line per flagged word (Unsupported claim and Upgrade-word strings); each flagged word underlined with a dashed rust line and linked to its warning; nothing removed automatically; re-checked after «Lag nytt utkast» and a Gaps retry.
- UX-DR30: Progress line (outlined box, amber pulse trace that animates at most 5 s then holds, static under reduced motion; plain text with no live role; wording per build variant) and AI placeholder (one slot per AI section in the current variant; real `h2` present from the start and never removed; «Skrives» outline strip; ruled lines; `aria-busy="true"` until resolved; each slot resolves on its own).
- UX-DR31: Catalogue register (Historikk): `<table>` with hidden caption on laptop and an `<ol>` at ≤ 640 px, swapped by the media query with `display: none`; columns number, job title link (`th scope="row"`), employer, date, score sentence with verdict strip, actions («Åpne JA-002», «Kopier brevet til JA-002», «Last ned JA-002 (.docx)»); `<nav aria-label="Sider">` pagination with «Forrige» absent on page 1 and «Neste» absent on the last page; the table may scroll inside its own container, never the page.
- UX-DR32: Empty state for Historikk: outlined ghost number «JA-001» and flat plot (`aria-hidden`), FR-21 sentence, «Den første søknaden du lager, får nummer JA-001.», primary «Lag skreddersydd søknad».

**Surfaces, states and flows**

- UX-DR33: Build-order variants: before S4 (no Gapanalyse, no «Se gapanalysen», one placeholder, progress «Skriver søknadsbrevet …»), before S5 (Gap entries without suggestion box, progress «Skriver gapanalyse og søknadsbrev …»), before S6 (nav Hjem · Søknad, Hjem button to Søknad, CV on Søknad with confirm, no catalogue numbers, no Historikk, no «Lagret …», no trust line, sign-off «[Navnet ditt]», .docx name without the person's name), full v1. Every surface stays coherent at each step and after each cut.
- UX-DR34: Hjem: headline, lede, «Lag skreddersydd søknad», the three outputs, the stance «Viser arbeidet. Finner aldri på.», the Example-ad pulse plot, and the before-S6 line «Du kan prøve med eksempelet først. Det krever ingen konto.». No placeholders for deferred features.
- UX-DR35: Tilgangskode screen (`/tilgang`, Hosted, before S6): wordmark only (skip link kept), the closed-version text, one password-type field with «Vis»/«Skjul», hint, «Åpne»; errors «Feil tilgangskode.» and «Koden har minst 16 tegn.».
- UX-DR36: Søknad form: heading «Ny søknad» (before S6) or «JA-NNN · Ny søknad» with lede (after S6); fields Stillingstittel, Arbeidsgiver, «Bruk eksempelet» (always shown; fills fields, focus to submit, announces), Stillingsannonse with hint, Tone, submit «Analyser og skriv utkast»; focus order per EXPERIENCE.md for each variant; all Søknad states (CV not confirmed, no CV in Profile, Job ad errors, ad too short or unclear, phase 1 running).
- UX-DR37: Søknad result: replaces the form on the same page; `h1` focused after phase 1; «Endre annonsen» returns to the form with all inputs kept and focus on the form `h1`; heading outline h1 → h2 score → h2 «Funnet i CV-en»/«Mangler i CV-en» (h3 per Keyword) → h2 «Gapanalyse» (h3 per Gap) → h2 «Søknadsbrev»; focus never moved when AI sections arrive; «Prøv igjen» moves focus to the section `h2`; «Lagret i Historikk som JA-NNN.» after S6.
- UX-DR38: AI notice dialog: title «Teksten din sendes til en KI-tjeneste», body with provider name and retention period, the five points, «Godta og fortsett» / «Avbryt» (Esc = Avbryt, keeps input, sends nothing); shown before phase 1 when not in Test mode and the accepted version differs; focus returns to submit.
- UX-DR39: Result states: phase 2 running, result complete, AI section failed or timed out (section alert with «Prøv igjen», other section unaffected), analysis stale (silent rerun), Daily cap («Dagens grense» notice, no retry), not available in Test mode («Testmodus» notice), Letter flagged, Gap downgraded / suggestion discarded (shown only through the changed entry), Letter regenerating (old Letter stays, progress line returns, outcome announced), network failure (alert at top, `role="alert"`, focus stays).
- UX-DR40: Registrer deg and Logg inn: fields with correct autocomplete, «Vis»/«Skjul», Tilgangskode on Registrer deg when hosted, cross-links, field-level server errors written into the error slot with focus moved there, email kept on «Feil e-post eller passord.», trust line once FR-22 is in; Logg inn prefills the email after expiry.
- UX-DR41: Profil: catalogue heading «CV · {navn}», read-only name, file picker or paste, CV text field with two-column hint, «Lagre» unavailable while empty, «Lagret.» announced, scanned-PDF state (alert, «Velg en annen fil», focus to the empty field), restored-draft notice after expiry.
- UX-DR42: Saved Application: the stored Reflection Note and Letter read-only with «Kopier» and «Last ned (.docx)», no «Lag nytt utkast», catalogue sequence nav (previous entry link and «Historikk»), «Ikke laget.» for a missing section, unchecked-Letter notice.
- UX-DR43: Konto: title, stacked credits (E-post, Katalog with entry count), «Logg ut» (no confirmation; goes to Hjem logged out; client session cleared except Job ad fields), «Slik lagres dataene dine» with the four lines.
- UX-DR44: Session expiry warning (`role="alertdialog"`): opens 2 minutes before 30 minutes of inactivity (activity = any key, pointer or input event; client renews at most every 5 minutes while active); «Fortsett økten» (primary, initial focus, Esc equals it) and «Logg ut»; replaces an open AI notice and reopens it afterwards; on run-out, «Logg inn» with the expired alert and restore notices on Søknad and Profil.
- UX-DR45: Ikke funnet page for unknown URLs and other Students' records: `h1` «Fant ikke siden», «Den finnes ikke, eller du har ikke tilgang til den.», link «Til Hjem».
- UX-DR46: Reduced motion: progress trace static from the start, instant chevron and tone-indicator changes, no smooth scrolling. Without the preference the trace still stops after 5 s.
- UX-DR47: Accessibility verification: axe scan of every surface (0 serious or critical) in Playwright, keyboard-only UJ-1, contrast check including non-text contrast; meaning never by colour alone (plot uses weight, dashes and «FUNNET»/«MANGLER»; verdicts always written out).

### FR Coverage Map

| FR | Epic | What the epic delivers for it |
|---|---|---|
| FR-1 | 1 | Upload .pdf/.txt ≤ 2 MB, extraction, scanned-PDF message |
| FR-2 | 1 | Paste CV text, 200–20,000 characters |
| FR-3 | 1, 6 | Review and confirm on Søknad (1); edit in Profil (6) |
| FR-4 | 1, 2 | Length and required-field rules (1); fewer than 3 Keywords → no score (2) |
| FR-5 | 2 | Code-only Keyword extraction |
| FR-5b | 2, 3 | Decision on 17 Nov at the end of Epic 2; built in Epic 3 only if it applies (needs the AI pipeline) |
| FR-6 | 2 | Matching with inflections, compounds, aliases and negative cases |
| FR-7 | 2 | Match score and Verdict |
| FR-8 | 2, 4 | Score explanation, Evidence, Missing lines, disclaimer (2); «Se gapanalysen» link (4) |
| FR-9 | 3, 6 | Letter with placeholder sign-off (3); Profile name in sign-off (6) |
| FR-10 | 3 | Three Tones and their testable rules |
| FR-11 | 3, 4 | Letter guard flagging every Missing keyword and Upgrade words (3); Rewordable gaps that passed FR-15 let through (4) |
| FR-12 | 3 | Read-only Letter, «Kopier», .docx, «Lag nytt utkast» |
| FR-13 | 4 | Rewordable or Real gap per Missing keyword |
| FR-14 | 4 | Gap explanations, hedged and labelled as AI |
| FR-15 | 4 | Citation guard and downgrade |
| FR-16 | 5 | Rewording suggestion with «Kopier» |
| FR-17 | 5 | Suggestion guard and discard |
| FR-18 | 6 | Register, log in, log out, session expiry |
| FR-19 | 6 | Per-Student isolation |
| FR-20 | 6 | Profile and CV reuse |
| FR-21 | 6 | Auto-save, Historikk, Saved Application, Konto (no recent list on Hjem, decision 2026-11-14) |
| FR-22 | 6 | Encryption at rest and password hashing |
| FR-23 | 1, 3, 6, 7 | File discarded after extraction (1); content-free logs (3); only confirmed CV stored (6); course-end deletion documented in README (7) |
| FR-24 | 3, 6 | AI notice once per browser session (3); once per account (6) |
| FR-25 | 3, 6 | Daily cap per installation (3); per Student (6) |
| FR-26 | 3 | Contact details stripped before AI requests |
| FR-27 | 2, 3 | Example pair files and «Bruk eksempelet» with the score (2); Test-mode banner and Cached responses for the AI sections (3) |
| FR-28 | 2 | Fixtures and Answer keys |
| FR-29 | 6 | Seeded local test user |
| FR-30 | 1, 7 | Hosted skeleton on Vercel and Supabase (1); final deploy and grading-period check (7) |
| FR-31 | 1, 6 | Access-code gate per browser session (1); code at registration (6) |

NFRs are cross-cutting. Each story meets NFR-1 to NFR-7, NFR-10 and NFR-11 for what it builds, and writes its own `docs/qa/` rows. NFR-9 starts in Epic 1 (Docker Compose run and test command) and grows with each epic. Epic 7 runs the final whole-app checks: NFR-2, NFR-4, NFR-7 (secret scan), NFR-9 (dry run), NFR-10 and NFR-11.

## Epic List

The epics follow PRD §5.1 step by step. Epics 1–6 are the six build steps; Epic 7 is the final period (PRD §5.2, 12–15 Dec). A cut removes whole epics from the bottom of Epics 4–6 only (cuts 1–3 in PRD §5.1: Epic 6 first, then 5, then 4). Epic 7 is never cut. Each epic adds its own slice folders (AD-1) and builds each shared part once, in the shared kernel, the first time it is needed; later epics reuse it.

### Epic 1: Open the app and give it a CV and a job ad

The Examiner starts JobAssistant with one Docker command, or opens the Hosted version with the Access code. The Student uploads or pastes a CV, corrects and confirms the extracted text, and enters the job ad, job title and employer on Søknad. Nothing is analysed yet.

**FRs covered:** FR-1, FR-2, FR-3 (Søknad), FR-4 (length and required fields), FR-23 (file discarded), FR-30, FR-31 (gate before accounts)
**NFR focus:** NFR-7, NFR-9 (first version), NFR-11; NFR-1–NFR-3 for the screens it builds
**Slices:** `cv`; `identity/core` (gate decision only)
**Shared parts introduced:** scaffold and pinned stack, `.gitattributes`, Docker Compose, Dockerfile, `scripts/setup.ts`, `scripts/migrate.ts`, CI, Vercel + Supabase, `/api/health`, `proxy.ts`; `shared/server` (`config`, `handle`, `log`, `db`, `data-files`), `shared/core` (`Result`, `MessageKey`, `canon`, hashing, time), `shared/ui` (`api-client`, `client-session`, `messages.nb.ts`, RunMode context); design tokens and fonts; app bar, buttons, link, focus ring, text field, file picker, alert, notice, skip link and landmarks
**Surfaces:** Hjem (without the plot), Søknad form (before-S6 variant), Tilgangskode, Ikke funnet

### Epic 2: See an explained Match score

The Student submits the inputs and sees «71 % samsvar – 5 av 7 nøkkelord» with its formula and Verdict, the CV line behind every Matched keyword and the ad line behind every Missing one, computed by code with no AI. «Bruk eksempelet» fills in the Example pair. The Fixtures and Answer keys prove the score is right, and the FR-5b decision is taken on 17 Nov.

**FRs covered:** FR-4 (fewer than 3 Keywords), FR-5, FR-5b (decision), FR-6, FR-7, FR-8, FR-27 (Example pair files and «Bruk eksempelet»), FR-28
**NFR focus:** NFR-4 (score within 2 s), NFR-6
**Slices:** `keywords`, `match`, `application` (phase 1, fingerprint)
**Shared parts introduced:** `data/vocabulary`, `data/fixtures`, code strip, evidence quote, catalogue heading, credits list, the two live regions and `announce()`
**Surfaces:** Søknad result (score block, keyword lists, pulse plot), Hjem pulse plot of the Example ad

### Epic 3: Get an honest draft Letter

The Student picks a Tone and gets a bokmål draft Letter built on their own CV, with any claim the CV doesn't support flagged. They can copy it, download it as .docx or ask for a new draft. They are told before any text leaves the app, and AI use is capped. The Examiner runs the whole flow in Test mode with no key. Ends with the core-flow checkpoint on 24 Nov.

**FRs covered:** FR-5b (only if it applies), FR-9, FR-10, FR-11 (all Missing keywords flagged), FR-12, FR-23 (content-free logs), FR-24 (per browser session), FR-25 (per installation), FR-26, FR-27
**NFR focus:** NFR-4 (two phases, 90 s timeout), NFR-5, NFR-8
**Slices:** `ai`, `letter`, `integrity` (Letter checks, Tone checks, word lists); `application` phase-2 routes
**Shared parts introduced:** dialog, copy button, Test-mode banner, progress line, AI placeholder
**Includes:** the provider bake-off (18 Nov) and the core-flow checkpoint (24 Nov)

### Epic 4: Understand each gap honestly

For each Missing keyword, the Student learns whether the CV already shows it in other words (a Rewordable gap that quotes the CV word for word) or whether it is a Real gap, stated plainly with nothing to paste in. Switches `FEATURE_GAPS` on.

**FRs covered:** FR-8 («Se gapanalysen»), FR-11 (Rewordable gaps allowed), FR-13, FR-14, FR-15
**Slices:** `gaps`; `integrity` (citation check, `cvEntries`)
**Shared parts introduced:** none; reuses evidence quote, code strip, alert, notice and AI placeholder

### Epic 5: Get rewording suggestions to copy

For each Rewordable gap, the Student gets one concrete phrasing in the employer's words that uses only facts already in the cited CV entry, with «Kopier». Suggestions that invent or upgrade are discarded by code. Switches `FEATURE_REWORDING` on and starts the §9.2 checklist runs.

**FRs covered:** FR-16, FR-17
**Slices:** `integrity` (suggestion check); `gaps` (prompt asks for suggestions, `gaps.json` re-recorded)
**Shared parts introduced:** none; reuses copy button and evidence quote

### Epic 6: Come back to saved work, stored encrypted

The Student registers once, keeps the CV in Profil, and finds every Application in Historikk to reopen, copy and download. Everything personal is encrypted at rest, and each Student sees only their own data. The Examiner logs in as the seeded test user. Switches `FEATURE_ACCOUNTS` on.

**FRs covered:** FR-3 (Profil), FR-9 (name in sign-off), FR-18, FR-19, FR-20, FR-21, FR-22, FR-23 (only confirmed CV stored), FR-24 (per account), FR-25 (per Student), FR-29, FR-31 (at registration)
**Slices:** `identity` (students, sessions), `profile`, `application` (storage, History)
**Shared parts introduced:** `shared/server/crypto`, expiry-warning dialog (on the Epic 3 dialog), skeleton rows
**Surfaces:** Registrer deg, Logg inn, Profil, Historikk, Saved Application, Konto; after-S6 variants of Hjem, Søknad and the app bar

### Epic 7: Hand in a gradable app (never cut)

The Examiner can run the delivered app from the README alone on a clean machine, try it live on the Hosted version, and trace every feature to a requirement, with the QA evidence and the planning documents matching what was built.

**FRs covered:** FR-23 (course-end deletion in README), FR-30 (final deploy, grading-period check)
**NFR focus:** NFR-2 (final axe and keyboard pass), NFR-4 (timed runs), NFR-7 (secret scan), NFR-9 (full README and dry run), NFR-10, NFR-11
**Includes:** final §9.2 checklist runs for the final prompt version (SM-3, SM-5), clean-machine dry run (SM-4), check of every planning document against the app, repository clean-up

## Story conventions

- Each story has two extra lines before its acceptance criteria. **Covers** lists the requirement IDs it implements (NFR-10). **Code** names the slice folders it works in and the shared parts it creates or reuses (the product owner's vertical-slice and DRY rule).
- A shared part is created in the first story that names it under **Code** as *creates*; later stories name it as *reuses* and extend it rather than adding a variant.
- Every story also meets these standing criteria, which are not repeated in each one:
  - automated tests are named after their requirement ID, and `docker compose run --rm --build test` passes;
  - all UI strings come from `src/shared/ui/messages.nb.ts`, and every new screen passes the axe scan (0 serious or critical findings) at 1280 px and 360 px, with no horizontal scroll at 320 px. Playwright's server environment is fixed, so for a screen behind a feature flag that is still off, the Playwright and axe checks run in the story that switches the flag on (4.6, 5.4, 6.12); until then the story's own tests are Vitest tests that set the flag explicitly;
  - every Manual Verify line it implements gets its row in `docs/qa/`;
  - the story is built on `story/<epic>.<story>-<slug>` and merged by a pull request that names its IDs.

## Epic 1: Open the app and give it a CV and a job ad

The Examiner starts JobAssistant with one Docker command, or opens the Hosted version with the Access code. The Student uploads or pastes a CV, corrects and confirms the extracted text, and enters the job ad, job title and employer on Søknad. Nothing is analysed yet.

### Story 1.1: Scaffold the app with a pinned stack and boundary rules

As the developer,
I want the Next.js app scaffolded with every version pinned and the slice boundaries enforced by the linter,
So that every later story starts from the same reproducible base and can't break the architecture by accident.

**Covers:** NFR-6, NFR-11, AD-1, AD-2, Structural Seed, Conventions
**Code:** repository root; creates `src/shared/core/` (`canon`, `Result`)

**Acceptance Criteria:**

**Given** the repository has no source files yet
**When** the first commit of this story is made
**Then** it adds only `.gitattributes` with `* text=auto eol=lf` and `*.pdf binary`
**And** every source file is committed after it

**Given** the spine's `create-next-app@16.4.6` command, run in a temporary folder
**When** its output is moved into the repository root
**Then** `next build` succeeds
**And** `package.json` lists every Stack version exactly, with no `^`, and `engines.node` is `26.x`
**And** `package-lock.json` is committed
**And** Geist is removed

**Given** the scaffold
**When** `.gitignore` is checked
**Then** it covers `.env*` except `.env.example`, and `.data/`

**Given** the Biome configuration
**When** a file imports another slice's internal file, or `keywords/core` imports anything but `shared/core`, or `integrity/core` imports anything but `keywords/core` and `shared/core`
**Then** `biome check` fails through `noRestrictedImports`
**And** `noConsole` is an error everywhere except `src/shared/server/log.ts`

**Given** `vitest.config.ts` and `playwright.config.ts`
**When** they are read
**Then** Vitest aliases `server-only` to an empty module and fixes `test.env` (`APP_ENV=local`, `DATABASE_URL=pglite://memory`, a constant test `ENCRYPTION_KEY`)
**And** Playwright's `webServer` runs `next build && next start -p 3100` with `reuseExistingServer: false` and a fixed `webServer.env` (`TEST_MODE=true`, `APP_ENV=local`, `DATABASE_URL=pglite://memory`, `E2E=1`)

**Given** `npm test`
**When** it runs
**Then** it runs Biome, `next typegen`, `tsc --noEmit`, Vitest and Playwright, in that order, and passes
**And** it includes a Vitest test of `canon` (NFC, CRLF→LF, trim, collapsed whitespace) and a Playwright test that loads `/`

### Story 1.2: Read configuration in one place and answer a health check

As the Examiner,
I want the app to start safely with or without keys and to report its health,
So that a missing setting never crashes the local run and a half-configured Hosted version never starts.

**Covers:** FR-27 (mode detection), NFR-7, NFR-9, AD-3, AD-4, AD-7 (envelope), AD-9, AD-13 (log, handle)
**Code:** creates `src/shared/server/{config,db,log,handle}.ts`, `src/shared/core/message-key.ts`, `scripts/migrate.ts`, `drizzle.config.ts`, `.env.example`, `src/app/api/health/route.ts`

**Acceptance Criteria:**

**Given** `config.ts`
**When** any code needs a setting
**Then** it reads it through the lazy, memoised, zod-parsed config, which is the only reader of `process.env` (reading `SECRETS_FILE` is added in Story 6.1, when the first local secret exists)
**And** `FEATURE_DEFAULTS` has `accounts`, `gaps`, `rewording` and `keywordFallback` all off, read only through `config.features`

**Given** no AI key, or `TEST_MODE=true`
**When** config is parsed
**Then** `testMode` is true and `ai.adapter` is `cached`

**Given** a test run (`isTestRun`)
**When** config is parsed
**Then** any AI key is treated as absent, and a `postgres` `DATABASE_URL` throws

**Given** `VERCEL=1` without `APP_ENV=hosted`, or `APP_ENV=hosted` without an `ACCESS_CODE` of at least 16 characters or without `DATABASE_URL`, or `APP_ENV=hosted` with `TEST_MODE=true`
**When** the app starts
**Then** startup fails with an error that names the setting
**And** each rule has a Vitest test

**Given** `db.ts`
**When** it first opens
**Then** it uses postgres-js for `postgres://` and `postgresql://`, and PGlite for `pglite://memory`, applying the migrations when it opens PGlite
**And** `scripts/migrate.ts` is the only migration runner, and `drizzle.config.ts` holds no credentials

**Given** a route handler wrapped in `handle()`
**When** it succeeds, fails validation or throws
**Then** the response is `{ ok: true, data }` or `{ ok: false, error: { code, field?, retryable } }` with the AD-7 HTTP status
**And** an unexpected error returns 500 `UNEXPECTED` with no stack trace or message in the body
**And** only `{ code, errorName, route }` is logged, through `log()`, which accepts only the `LogEvent` union

**Given** a running app
**When** `GET /api/health` is called
**Then** it runs `SELECT 1` and returns `{ ok: true, data: { hosted } }`

**Given** `.env.example`
**When** it is read
**Then** it lists every environment variable from the spine without values, and says `.env` holds only `AI_*` and `TEST_MODE`

### Story 1.3: Start the app and run the tests with one Docker command each

As the Examiner,
I want `docker compose up --build` to start the app and its database, and one command to run every test,
So that I can run the project on a clean machine with only Docker installed.

**Covers:** NFR-9, NFR-6, NFR-7, AD-17
**Code:** creates `Dockerfile`, `compose.yaml`, `.dockerignore`, `scripts/setup.ts`, `README.md` (first version)

**Acceptance Criteria:**

**Given** a fresh clone and Docker as the only install
**When** `docker compose up --build` runs
**Then** `db` (`postgres:17.12-alpine`) becomes healthy, `app` runs `scripts/setup.ts` and then `next start -H 0.0.0.0 -p 3000`, and `app` becomes healthy
**And** `http://localhost:3000` answers, in Test mode
**And** only `127.0.0.1:3000` and `127.0.0.1:54320` are published

**Given** setup runs
**When** the `app` container starts
**Then** it migrates under `pg_advisory_lock` through `scripts/migrate.ts`
**And** it has a production guard: local-only steps (secrets in Story 6.1, the seed in Story 6.11) run only when `APP_ENV=local` and the `DATABASE_URL` host is `db`, `127.0.0.1` or `localhost`; against any other database it only migrates
**And** `compose.yaml` already sets `SECRETS_FILE=/data/secrets.env` on the `appdata` volume, so Story 6.1 needs no Compose change

**Given** the `test` service
**When** `docker compose run --rm --build test` runs
**Then** `npm test` runs in the `test` stage on PGlite without starting `db`, and passes

**Given** a running stack
**When** `docker compose down -v` runs and the stack is started again
**Then** the local data is reset and the app starts cleanly

**Given** the `Dockerfile`
**When** it is read
**Then** it has the stages `deps`, `build`, `app` and `test` on `node:26.13.1-trixie-slim`, as AD-17 describes
**And** `NODE_ENV=production` is set only in `app`, `/data` belongs to `node`, `output: 'standalone'` is not used, and there are no shell scripts

**Given** the developer loop
**When** `docker compose up db` and `npm run dev` run on the host
**Then** `predev` runs setup, and config defaults `DATABASE_URL` to the local value

**Given** the README
**When** someone reads it
**Then** it names the tested Docker version and gives the three commands, with what each one shows
**And** Helene has walked through it once on Windows

### Story 1.4: Check every pull request in CI

As the developer,
I want every pull request built and tested the same way the Examiner runs it,
So that `main` only ever holds green, runnable code.

**Covers:** NFR-7, NFR-9, NFR-10, AD-9, AD-17
**Code:** creates `.github/workflows/ci.yml`, `.github/pull_request_template.md`, `scripts/smoke.mjs`; `db:check` script

**Acceptance Criteria:**

**Given** a pull request
**When** CI runs
**Then** it builds `app` and `test` once with a BuildKit `type=gha` cache, runs `docker compose run --rm test`, runs `db:check` (`drizzle-kit check` plus a from-zero migration on PGlite), starts `app` with `up -d --wait`, runs `scripts/smoke.mjs` against `/api/health`, and finishes with `down -v`

**Given** a commit that tracks a file under `.data/` or a `.env` file
**When** CI runs
**Then** it fails because `git ls-files .data .env` prints something

**Given** the GitHub repository settings
**When** someone pushes to `main`
**Then** `main` is protected and accepts changes only by pull request with green CI
**And** the setting is noted in `docs/qa/`

**Given** a new pull request
**When** it is opened
**Then** the template asks for the story ID and the FR and NFR IDs it implements

### Story 1.5: Show every page in the JobAssistant look, with an accessible shell

As a Student,
I want every page to share the same warm dark look, navigation and keyboard-friendly structure,
So that the app is readable and usable with a keyboard, a screen reader or a phone.

**Covers:** NFR-1, NFR-2, NFR-3, FR-19 (Ikke funnet page), AD-4 (RunMode), UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR6, UX-DR7, UX-DR8, UX-DR19, UX-DR20, UX-DR45, UX-DR46
**Code:** creates `src/app/globals.css`, `src/app/layout.tsx`, `src/app/not-found.tsx`, `src/shared/ui/{messages.nb.ts, run-mode, announce}`, `src/shared/ui/components/{app-bar, button, link}`

**Acceptance Criteria:**

**Given** DESIGN.md
**When** `globals.css` is built
**Then** every colour, spacing, typography and radius token is a Tailwind v4 `@theme` variable, type sizes are in `rem`, there is one theme with `color-scheme: dark`, and a `max-640` variant exists
**And** Schibsted Grotesk, DM Mono and Archivo (with the `wdth` axis) load through `next/font/google`

**Given** any page
**When** it renders
**Then** `<html lang="nb">` is set, the skip link «Hopp til hovedinnholdet» is the first focusable element and targets `<main id="hovedinnhold" tabindex="-1">`, there is one `<header>` and one `<main>`, and the title follows «{side} – JobAssistant»
**And** after `await connection()`, the root layout sends RunMode (config only) to one client context

**Given** the root layout
**When** it renders
**Then** two empty polite live regions sit outside the page content, and `announce()` in `shared/ui` replaces (never appends) the text of the chosen region

**Given** accounts are off
**When** the app bar renders
**Then** it shows the wordmark and the nav «Hjem · Søknad» in `<nav aria-label="Hovedmeny">`, with `aria-current="page"` on the current page, and it scrolls with the page
**And** at ≤ 640 px a «Meny» / «Lukk» toggle with `aria-expanded` and `aria-controls` opens full-width 56 px rows in the document flow; Esc closes them and returns focus to «Meny»

**Given** the shared button and link components
**When** they are used
**Then** button has primary, secondary, small, disabled and busy variants (busy: `aria-disabled="true"`, label kept, progress glyph, a second click does nothing), link is a real `<a href>` that is always underlined, and both show the 2 px amber focus ring with a 2 px offset and are at least 44 px high (standalone links 24 px)

**Given** an unknown URL
**When** it is opened
**Then** the Ikke funnet page shows `h1` «Fant ikke siden», «Den finnes ikke, eller du har ikke tilgang til den.» and the link «Til Hjem», with a 404 status and no stack trace

**Given** `prefers-reduced-motion: reduce`
**When** a page renders
**Then** there is no smooth scrolling, and transitions change instantly

### Story 1.6: Close the Hosted version with an Access code

As the developer,
I want the Hosted version to open only for people who enter the Access code,
So that no outsider can use the app or spend the AI budget.

**Covers:** FR-31 (before accounts), NFR-2, NFR-7, AD-12, UX-DR9, UX-DR10, UX-DR35
**Code:** creates `src/modules/identity/{core/gate.ts, contracts.ts, index.ts, server/}`, `src/proxy.ts`, `src/app/tilgang/`, `src/app/api/access/route.ts`, `src/shared/ui/api-client.ts`, `src/shared/ui/components/{text-field, password-toggle}`

**Acceptance Criteria:**

**Given** `gateDecision({ hosted, accountsOn, path, cookieValid })` in `identity/core`
**When** it is unit-tested
**Then** every branch is covered: local or accounts on → pass; hosted with an exempt path (`/tilgang`, `/api/access`, `/api/health`, static assets) → pass; hosted with a valid cookie → pass; no cookie on a page → redirect to `/tilgang`; no cookie on `/api` → 401 `ACCESS_REQUIRED`
**And** `proxy.ts` only wires the decision up

**Given** the Hosted version with accounts off
**When** `POST /api/access` receives the correct code
**Then** it sets `ja_access` = HMAC-SHA256(`ACCESS_CODE`, `"ja_access.v1"`) as a session cookie (no Max-Age), httpOnly, SameSite=Lax, Secure
**And** the comparison is constant-time

**Given** a wrong code
**When** it is submitted
**Then** the field shows «Feil tilgangskode.», gets `aria-invalid="true"` and focus, and keeps what was typed
**And** a code shorter than 16 characters gets «Koden har minst 16 tegn.» before any request

**Given** `/tilgang`
**When** it renders
**Then** it shows the wordmark only (the skip link stays), the closed-version text and hint, a password-type field (`autocomplete="off"`, paste allowed) with a «Vis» / «Skjul» toggle (`aria-pressed`, 44 px), and «Åpne»

**Given** the shared text field
**When** any later form uses it
**Then** its label sits above, hint and error are tied by `aria-describedby`, validation runs on blur and on submit (never per keystroke), an error shows a rust «Feil» strip and never clears the input, and paste and autofill are never blocked

**Given** `src/shared/ui/api-client.ts`
**When** any client component calls an API route (here, `/tilgang` calling `/api/access`)
**Then** it goes through `api-client`, which parses the AD-7 envelope with the route's zod schema
**And** a failed fetch or a body that isn't JSON becomes the error code `NETWORK_ERROR`

**Given** `APP_ENV=local`
**When** any page or API route is requested
**Then** the gate never applies

### Story 1.7: Deploy the skeleton to the Hosted version

As the Examiner,
I want a stable HTTPS URL where the app runs from `main`,
So that I can try JobAssistant without installing anything.

**Covers:** FR-30, FR-31, NFR-7, NFR-8, AD-3, AD-9, deployment seed
**Code:** creates `vercel.json`, `.github/workflows/keep-alive.yml`, `db:migrate` build step; `docs/qa/` rows

**Acceptance Criteria:**

**Given** a Supabase Free project in `eu-central-1`
**When** it is set up
**Then** the Data API is off, RLS is on with no policies, and `DATABASE_URL` points at the session pooler (port 5432) with `?sslmode=require`, opened with `{ max: 1, idle_timeout: 20 }`
**And** `DATABASE_URL` is set only for Vercel's Production environment

**Given** a Vercel Hobby project with functions in `fra1` on Node 26
**When** `main` changes
**Then** only `main` deploys to Production, as `vercel.json` sets (`"framework": "nextjs"`, `deploymentEnabled` true only for `main`), and the build runs `db:migrate` before `next build`

**Given** Vercel's Production environment
**When** the deployment starts
**Then** `APP_ENV=hosted`, a random `ACCESS_CODE` of 16 or more characters and `DATABASE_URL` are set, and no `AI_PROVIDER` is set yet, so the AI sections are unavailable
**And** no secret is committed

**Given** the Hosted URL
**When** it is opened without the code
**Then** it redirects to `/tilgang`, and after the code it shows the app shell
**And** `/api/health` returns `hosted: true`, and plain HTTP redirects to HTTPS

**Given** `keep-alive.yml`
**When** its schedule fires (twice a day)
**Then** it calls `/api/health`, so the Free Supabase project doesn't pause

**Given** `docs/qa/`
**When** this story is merged
**Then** it records whether Vercel's DPA covers Hobby and Supabase's covers Free (if either fails, the README run becomes the delivery and PRD §11 is updated)
**And** it holds the FR-30 manual row, and the README names the Hosted URL

### Story 1.8: Read what JobAssistant does on Hjem

As a Student,
I want a home page that says plainly what the app does,
So that I know what I'll get before I paste anything.

**Covers:** NFR-1, NFR-2, NFR-3, D2, D20, UX-DR33 (before-S6 variant), UX-DR34
**Code:** `src/app/page.tsx` (server component); reuses button and link

**Acceptance Criteria:**

**Given** accounts are off
**When** Hjem renders
**Then** it shows the headline «Se hvilke av annonsens ord CV-en din dekker.» as the page's `h1`, the lede, the three outputs, the stance «Viser arbeidet. Finner aldri på.» and «Du kan prøve med eksempelet først. Det krever ingen konto.»
**And** the primary button «Lag skreddersydd søknad» goes to Søknad

**Given** Hjem
**When** it is checked against D2
**Then** it has no cards or placeholders for deferred features such as «Vurder CV»

**Given** Hjem at 360 px
**When** it renders
**Then** everything sits in one column with no horizontal scroll

### Story 1.9: Enter the job ad, job title and employer on Søknad

As a Student,
I want to paste the job ad and type the job title and employer, with clear Norwegian errors if something is wrong,
So that the app has the right ad to work with.

**Covers:** FR-4 (length and required fields), NFR-5, NFR-7, AD-6 (`AnalysisInputs`), AD-8 (`applicationId`), AD-16, UX-DR9, UX-DR18 (catalogue heading, without a number), UX-DR36 (form fields)
**Code:** creates `src/app/soknad/`, `src/modules/application/{contracts.ts, ui/}`, `src/shared/ui/client-session.ts`, `src/shared/ui/components/catalogue-heading`; reuses text field and button

**Acceptance Criteria:**

**Given** Søknad with accounts off
**When** it renders
**Then** the `h1` reads «Ny søknad» and the form shows «Stillingstittel», «Arbeidsgiver», «Stillingsannonse» (hint «Lim inn hele annonseteksten, minst 200 tegn.», counter «N av 15 000 tegn») and the submit button «Analyser og skriv utkast»

**Given** the `AnalysisInputs` zod schema in `application/contracts.ts`
**When** a field is left or the form is submitted
**Then** the client checks the same schema the server will use: Job ad 200–15,000 characters («Stillingsannonsen må være mellom 200 og 15 000 tegn.»), job title and employer required («Fyll inn stillingstittelen.», «Fyll inn arbeidsgiveren.») and at most 200 characters («Maks 200 tegn.»)
**And** the errors are tied to their fields, focus moves to the first invalid field, and nothing typed is cleared

**Given** text pasted with Windows line endings
**When** it enters the form
**Then** it is normalised from CRLF to LF

**Given** filled-in fields
**When** the page is refreshed
**Then** the inputs come back from `ja.session.v1`, read and written only through `client-session.ts`

**Given** valid inputs
**When** the form is submitted
**Then** the client creates an `applicationId` with `crypto.randomUUID()`, keeps it in `ja.session.v1` and reuses it until the inputs change
**And** no analysis request is sent yet

**Given** the Job ad field
**When** a Student looks for another way in
**Then** there is no file upload and no URL import for the ad

**Given** the wrong-input tour (PRD §9.3)
**When** inputs 1, 4 and 5 are tried on the Job ad fields
**Then** each gives its inline error and keeps the input, in a Playwright test

### Story 1.10: Paste and confirm the CV text on Søknad

As a Student,
I want to paste my CV text, check it and confirm it,
So that the analysis only ever uses text I've approved.

**Covers:** FR-2, FR-3, NFR-5, AD-16, UX-DR9 (CV variant), UX-DR26 (before-S6 slot), UX-DR36 (focus order)
**Code:** creates `src/modules/cv/{contracts.ts, ui/}`; reuses text field, button and `client-session.ts`; the Søknad form in `application/ui` imports the CV input from `cv/ui/index.ts`

**Acceptance Criteria:**

**Given** Søknad with accounts off
**When** it renders
**Then** the CV slot sits above the job fields with the CV text field «CV-tekst» in DM Mono, a counter «N av 20 000 tegn» and the button «Bekreft CV-teksten»
**And** the focus order follows EXPERIENCE.md for the before-S6 form

**Given** the CV text schema in `cv/contracts.ts`
**When** the text is outside 200–20,000 characters
**Then** the field shows «CV-teksten må være mellom 200 og 20 000 tegn.»

**Given** valid CV text
**When** «Bekreft CV-teksten» is pressed
**Then** the slot collapses to «CV-tekst bekreftet · 3 412 tegn» (space as thousands separator), with a way to reopen it
**And** any edit after that clears the confirmation

**Given** CV text that isn't confirmed
**When** the form is submitted
**Then** «Bekreft CV-teksten før du går videre.» appears at the CV field, focus moves there, and nothing is submitted

**Given** confirmed CV text
**When** the page is refreshed
**Then** the confirmed text comes back from `ja.session.v1`, and nothing is written to the server or to disk

**Given** the FR-3 tests
**When** they run
**Then** they show that submit is blocked without confirmation, and that after an edit and a new confirmation the held text is the edited text

### Story 1.11: Upload a CV file and correct the extracted text

As a Student,
I want to upload my CV as a PDF or text file and see the extracted text,
So that I don't have to copy it by hand, and can fix lines the PDF scrambled.

**Covers:** FR-1, FR-3, FR-23 (file discarded), NFR-5, NFR-7, Route inventory (`POST /api/cv/extract`), UX-DR11, UX-DR15 (alert)
**Code:** creates `src/modules/cv/server/extract.ts`, `src/modules/cv/index.ts`, `src/app/api/cv/extract/route.ts`, `src/shared/ui/components/{file-picker, alert}`; reuses the CV input from Story 1.10

**Acceptance Criteria:**

**Given** the shared file picker
**When** it renders
**Then** it has one tab stop: a visually hidden native file input named «Velg fil, PDF eller TXT, maks 2 MB», with the visible «Velg fil» as its label and the focus ring drawn on the label while the input has focus

**Given** a file that isn't .pdf or .txt, or is larger than 2 MB
**When** it is chosen
**Then** «Bare PDF- og TXT-filer støttes.» or «Filen er for stor.» appears before any request is sent
**And** the server checks type and size again and returns a validation error if they are wrong

**Given** a valid file
**When** it is uploaded to `POST /api/cv/extract`
**Then** the text is extracted in memory (unpdf for PDF, UTF-8 for TXT), normalised from CRLF to LF and returned as `{ text, noText }`
**And** nothing is written to disk or the database, no content is logged, and the file is never served back

**Given** extraction is running
**When** the Student waits
**Then** the file name shows with «Henter ut teksten fra CV-en …»

**Given** extraction succeeds
**When** the text returns
**Then** it fills the CV text field for review, and it must be confirmed as in Story 1.10 before it can be used

**Given** a PDF with no extractable text
**When** it is uploaded
**Then** an alert with `role="alert"` says «Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Lim inn teksten fra CV-en din i stedet.», the picker border turns rust, the button reads «Velg en annen fil», the CV field gets the hint «Lim inn teksten her. Minst 200 tegn.» and focus moves to it

**Given** the tests
**When** they run
**Then** they use small fictional files: a text PDF, an image-only PDF, a .docx (rejected) and a file just over 2 MB (rejected)
**And** wrong-input tour inputs 2 and 3 pass in a Playwright test

## Epic 2: See an explained Match score

The Student submits the inputs and sees «71 % samsvar – 5 av 7 nøkkelord» with its formula and Verdict, the CV line behind every Matched keyword and the ad line behind every Missing one, computed by code with no AI. «Bruk eksempelet» fills in the Example pair. The Fixtures and Answer keys prove the score is right, and the FR-5b decision is taken on 17 Nov.

Stories 2.1–2.3 each add one Fixture. Together they meet FR-28's coverage rules. The held-out Fixture for the FR-5b decision comes in Story 2.11. In every Fixture story, Helene writes the Answer key by hand: AI may draft a CV or an ad, never the fasit, and the session log says so. Every CV is fictional.

### Story 2.1: Write the Example pair Fixture (frontend, English terms)

As the developer,
I want the Example pair written as the first Fixture, with a hand-written Answer key and a fixed folder format,
So that the Keyword engine is tested against a fasit I wrote myself, and every later Fixture follows the same shape.

**Covers:** FR-28 (English technical terms; the Example pair is a Fixture), FR-27 (Example pair files), SM-2, AD-15
**Code:** creates `data/fixtures/example-nordic-digital/` (`cv.pdf` single-column, `cv.txt`, `ad.txt`, `meta.json`, `answer-key.json`), `src/shared/core/answer-key.ts` (zod schema; shared because the keyword, gaps and QA code all read it), `scripts/extract-fixture-cv.ts`

**Acceptance Criteria:**

**Given** the Example pair (Violet Hansen, Junior frontendutvikler at Nordic Digital, a CV of courses and one semester group project)
**When** it is written
**Then** the ad uses English technical terms common in Norwegian ads (such as «React», «TypeScript», «Agile», «stakeholder»), and the CV covers some of them in Norwegian, some in English and some not at all
**And** `meta.json` holds the job title and employer

**Given** `answer-key.json`
**When** it is parsed with the shared schema
**Then** it lists the expected Keywords split into Matched and Missing, the expected score (which follows exactly from the two lists), the must-not-match terms, the expected Rewordable and Real gaps, and the must-never-suggest items
**And** an invalid Answer key fails a Vitest test that parses every `answer-key.json`

**Given** a Fixture with a `cv.pdf`
**When** `scripts/extract-fixture-cv.ts` runs
**Then** it writes `cv.txt` from the unpdf extraction of `cv.pdf`, so the two never drift apart

**Given** the Answer key
**When** it is reviewed
**Then** Helene wrote it by hand, and the session log says so

### Story 2.2: Write the nursing Fixture (outside IT, «sårvurdering»)

As the developer,
I want a nursing Fixture built around the FR-16 example,
So that the engine is proven on a field outside IT, and the later guards have the «forsket» upgrade case to test against.

**Covers:** FR-28 (a Fixture from outside IT; inflection cases), FR-16 (the example), SM-2
**Code:** creates `data/fixtures/nursing-sarvurdering/` (`cv.txt`, `ad.txt`, `meta.json`, `answer-key.json`); reuses the Answer-key schema

**Acceptance Criteria:**

**Given** a nursing job ad built around «sårvurdering»
**When** the CV is written
**Then** it contains the entry «Skrev eksamensoppgave om diabetiske fotsår vs trykksår (likheter og forskjeller)», and its other lines use Norwegian inflected forms of Keywords in the ad

**Given** the Answer key
**When** it is written
**Then** «sårvurdering» is an expected Rewordable gap backed by the exam-paper entry, and «Forsket på sårvurdering» (or any upgrade from exam paper to research) is a must-never-suggest item
**And** it has at least one must-not-match term

**Given** the Answer key
**When** it is reviewed
**Then** Helene wrote it by hand, using her own nursing knowledge, and the session log says so

### Story 2.3: Write the two-column Fixture (split compounds, «prosjektledelse»)

As the developer,
I want a Fixture with a two-column PDF CV, split compounds and the brief's «prosjektledelse» case,
So that PDF correction, compound matching and the hardest Rewordable-gap judgement are all covered by tests.

**Covers:** FR-28 (two-column PDF; inflection and split-compound cases; the «prosjektledelse» case), FR-3 (the correction case), FR-6, SM-2
**Code:** creates `data/fixtures/two-column-fjord-analytics/` (`cv.pdf` two-column, `cv.txt` generated by the script, `ad.txt`, `meta.json`, `answer-key.json`); reuses the schema and `extract-fixture-cv.ts`

**Acceptance Criteria:**

**Given** the UJ-2 ad (Junior produktanalytiker at Fjord Analytics)
**When** the CV is written as a two-column PDF
**Then** the unpdf extraction scrambles at least one line, so the FR-3 correction can be shown by hand
**And** the CV contains split compounds and inflected forms that should match the ad (for example «data analyse» for «dataanalyse», and definite and plural noun forms)
**And** it contains a lone «ledelse» that must not match «prosjektledelse», and never writes «prosjektledelse» or «prosjekt ledelse» itself, so the project entry is judged by Gap analysis, not by matching

**Given** the CV's semester-long group project
**When** the Answer key is written
**Then** it says whether «prosjektledelse» is a Rewordable gap (the project entry shows planning or coordination) or a Real gap (it doesn't), and gives the reason

**Given** the Answer key
**When** it is reviewed
**Then** Helene wrote it by hand, and the session log says so

### Story 2.4: Normalise and stem Norwegian words

As the developer,
I want one pipeline that decides when two Norwegian word forms are the same word,
So that the score and every later guard agree on what "the same word" means.

**Covers:** FR-6 (inflections, hyphen and space variants), NFR-6, AD-5
**Code:** creates `src/modules/keywords/core/{normalise,stem}.ts` and `keywords/core/index.ts`; reuses `shared/core/canon`

**Acceptance Criteria:**

**Given** `normalise` and `stem` in `keywords/core`
**When** they process a word
**Then** they apply case folding, æøå handling, hyphen and space normalisation, a suffix pre-step for noun forms Snowball misses, and then Snowball Norwegian from `@orama/stemmers/norwegian`
**And** they are synchronous and pure, and nothing outside `keywords/core` stems or compares words

**Given** a table test of word forms
**When** it runs
**Then** «utvikler», «utviklere» and «utviklerne» stem alike; «prosjektleder», «prosjektlederen» and «prosjektledere» stem alike; and hyphen and space variants («front-end», «front end», «frontend») normalise alike
**And** the table includes forms that must stay different, so over-matching shows up as a test failure

**Given** Biome's boundary rules
**When** `keywords/core` imports anything outside `shared/core`
**Then** the check fails

### Story 2.5: Extract Keywords from the job ad with a versioned vocabulary

As a Student,
I want the app to pick out the skills and terms the ad actually asks for,
So that the score measures what the employer cares about, not company boilerplate.

**Covers:** FR-5, FR-4 (fewer than 3 Keywords), NFR-6, AD-5, AD-15 (data files)
**Code:** creates `data/vocabulary/` (versioned JSON with `vocabularyVersion`), `keywords/core/extract.ts`, `src/shared/server/data-files.ts`; `next.config.ts` `outputFileTracingIncludes` for `./data/vocabulary/**`

**Acceptance Criteria:**

**Given** the vocabulary
**When** it is created
**Then** it is a curated core list (seeded with Helene's nursing terms and the Fixtures' fields), with selected Norwegian ESCO labels as backup, and aliases such as «agile» ↔ «smidig»
**And** it carries a `vocabularyVersion` that changes whenever its contents change

**Given** `extractKeywords(adText, vocabulary)`
**When** it runs on a job ad
**Then** it returns the skills, tools, technologies, methods, qualifications and domain terms named in the ad, from any field, including English terms common in Norwegian ads
**And** stop words, company description and benefits are not Keywords, and duplicates and inflected forms count once
**And** each Keyword carries its positions in the ad as `{ paragraph, start, end }[]`, with paragraphs split on blank lines

**Given** the same ad text
**When** it is extracted twice, on any machine
**Then** the list is identical

**Given** `data-files.ts`
**When** the server needs the vocabulary
**Then** it loads it only through `data-files.ts` and passes it into `extractKeywords`; `keywords/core` never reads files

**Given** an ad where fewer than 3 Keywords are found
**When** it is extracted
**Then** the result says the ad is too short or unclear, so no score can be shown

### Story 2.6: Find each Keyword in the CV text, with its Evidence

As a Student,
I want each Keyword looked up in my CV, including other forms of the word,
So that I get credit for what my CV really says and nothing more.

**Covers:** FR-6, SM-2, NFR-6, AD-5
**Code:** creates `keywords/core/find.ts` (`findKeyword`), compound and alias rules in `keywords/core`; tests over every Fixture

**Acceptance Criteria:**

**Given** `findKeyword(text, keyword)`
**When** it searches the CV text
**Then** it ignores case and accepts Norwegian inflections, hyphen and space variants, split compounds («prosjekt ledelse» matches «prosjektledelse») and known aliases («agile» matches «smidig»)
**And** each hit carries its match stage (`exact` | `inflection` | `compound` | `alias`) and the Evidence: the CV line it was found on and that line's number

**Given** a word that only shares part of a compound
**When** it is searched
**Then** it does not match: «ledelse» on its own does not match «prosjektledelse»

**Given** every Fixture
**When** the SM-2 test runs
**Then** the Matched and Missing lists equal the Answer key exactly, and no must-not-match term matches
**And** a failure names the Keyword and the Fixture

**Given** every Fixture
**When** the NFR-6 test runs it twice
**Then** both runs give identical lists

### Story 2.7: Score the inputs on the server (phase 1)

As a Student,
I want my CV and the ad scored by code on the server as soon as I submit,
So that I get a number I can check, with no AI and no waiting.

**Covers:** FR-4, FR-5, FR-7, FR-8 (explanation keys), NFR-4 (no AI in phase 1), NFR-6, NFR-7, AD-5, AD-6, AD-7
**Code:** creates `src/modules/match/{core, contracts.ts, index.ts}`, `src/modules/keywords/{server/keyword-source.ts, index.ts, contracts.ts}`, `src/modules/application/{core/fingerprint.ts, server/, index.ts}`, `src/app/api/analyses/route.ts`; reuses `handle()`, `AnalysisInputs`

**Acceptance Criteria:**

**Given** `match/core`
**When** it scores a list of Matched and Missing Keywords
**Then** the score is Matched ÷ all × 100, rounded to a whole number from 0 to 100, with equal weights
**And** the Verdict is Strong match at 70 or above and Needs work below, taken from the rounded score, and it is derived here only and never stored
**And** the explanations for the formula and each Missing keyword are `{ key, params }`, never Norwegian prose from the server

**Given** `KeywordSource.resolve(jobAd, ctx)` in `keywords/server`
**When** `match` needs Keywords
**Then** they come only through it, as `{ keywords, keywordSource: 'code' }`

**Given** `POST /api/analyses` with `{ applicationId, inputs }`
**When** the inputs are valid
**Then** the handler parses them with the `AnalysisInputs` schema inside `handle()`, resolves Keywords, matches and scores, and returns `AnalysisResult` (with `keywordSource`) and the `fingerprint`
**And** the fingerprint is `sha256(canon(inputs) + vocabularyVersion + keywordSource + contractVersion)`, computed only in `application/core`
**And** the route sets `maxDuration = 120` and makes no AI request

**Given** an ad with fewer than 3 Keywords
**When** it is submitted
**Then** the response is a field error on `jobAd`, and no score is returned

**Given** invalid inputs
**When** they are submitted
**Then** the response is a 400 field error, and nothing is stored

**Given** identical inputs
**When** they are submitted twice
**Then** the score, the lists and the fingerprint are identical

### Story 2.8: Read the score and the keyword lists on Søknad

As a Student,
I want to see my score, how it was calculated, and the line behind every keyword,
So that I can check the number myself instead of trusting it.

**Covers:** FR-7, FR-8, FR-4 (too-short alert), NFR-2, NFR-4, NFR-5, AD-6, AD-8, AD-16, UX-DR12, UX-DR14, UX-DR15, UX-DR18, UX-DR19, UX-DR23, UX-DR24, UX-DR37, UX-DR39 (network failure)
**Code:** creates `src/modules/match/ui/{score-block, keyword-entry}` and `match/ui/index.ts`, `src/shared/ui/components/{code-strip, evidence-quote, credits-list}`, the TanStack Query provider in `shared/ui`; reuses catalogue heading, alert, button, `api-client`, `announce()`

**Acceptance Criteria:**

**Given** valid, confirmed inputs on Søknad
**When** «Analyser og skriv utkast» is pressed
**Then** the button is busy while phase 1 runs, a second click does nothing, and one `POST /api/analyses` is sent with the session's `applicationId`
**And** the result replaces the form on the same page, without waiting for any AI

**Given** a result without accounts
**When** it renders
**Then** the `h1` is the employer alone, the credits list shows Stilling, Dato and Annonse («14 avsnitt · 7 nøkkelord»), and focus moves to the `h1`

**Given** the score block
**When** it renders
**Then** it shows «71 % samsvar – 5 av 7 nøkkelord» as an `h2`, the Verdict strip (moss «Sterkt samsvar» or outline «Bør forbedres») with its threshold sentence, «Formel» with «5 av 7 nøkkelord funnet = 71 %», and the disclaimer «Et anslag på hvor mange av annonsens nøkkelord CV-en din dekker. Ikke en ekte ATS-vurdering, og ingen spådom om intervjusjanser.»

**Given** the keyword lists
**When** they render
**Then** «Funnet i CV-en» shows each Matched keyword as an `h3` with a «Funnet» strip, its Evidence quote in sjevroner with the Keyword marked, and «Bevis · CV-linje N · annonsen avsnitt NN»
**And** «Mangler i CV-en» shows each Missing keyword with a «Mangler» strip, «Annonsen ber om «X». CV-en din viser det ikke ennå.», the quoted ad line and «Fra annonsen · avsnitt NN»
**And** quotes past about 160 characters are trimmed at word boundaries with «…»

**Given** phase 1 has rendered
**When** the first live region speaks
**Then** it says the score sentence and Verdict once (the before-S3 form of the phase-1 line, without the AI sentence)

**Given** an ad with fewer than 3 Keywords
**When** it is submitted
**Then** an alert at the Job ad field says «Annonsen er for kort eller uklar til å analyseres. Lim inn hele stillingsannonsen, også kravene.», focus moves there, and no result view is shown

**Given** the result
**When** «Endre annonsen» is pressed
**Then** the form comes back with every input kept, and focus moves to its `h1`

**Given** the network fails during phase 1
**When** `api-client` returns `NETWORK_ERROR`
**Then** «Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.» appears as an alert at the top with `role="alert"`, input is kept, and focus stays where it was

**Given** a refresh after the result is shown
**When** the page reloads
**Then** no raw error or stack trace appears, and the inputs are still there

### Story 2.9: See the job ad drawn as a pulse plot

As a Student,
I want the ad drawn as a picture where each keyword makes the line jump,
So that I can see at a glance where in the ad the matched and missing words sit.

**Covers:** FR-8, NFR-2, NFR-3, UX-DR22, UX-DR34 (Hjem plot)
**Code:** creates `src/modules/match/core/pulse-layout.ts` (pure geometry) and `match/ui/pulse-plot`, exported through `match/ui/index.ts`; Hjem gets the Example ad's phase-1 data from `application`'s server API as props

**Acceptance Criteria:**

**Given** `pulse-layout.ts`
**When** it lays out an ad and its phase-1 lists
**Then** each paragraph is a baseline with a small ripple derived from its characters, each Keyword peaks at its first position in its paragraph, and the same ad always gives the same geometry (unit-tested)

**Given** the full plot (above 640 px)
**When** it renders
**Then** Matched stretches are thick (2.8 px), Missing stretches are dashed, neutral runs are thin, paragraph numbers run down the left, labels show a code-colour square, the Keyword and «FUNNET» / «MANGLER», and the legend explains the three line kinds in text

**Given** compact mode (≤ 640 px, down to 320 px)
**When** it renders
**Then** the SVG uses `viewBox="0 0 328 …"` at full width, draws only paragraphs with Keywords, places labels in a right-hand column with dotted leaders, and the figcaption says what is left out
**And** it never causes horizontal scroll

**Given** the plot
**When** assistive technology reads it
**Then** it has `role="img"` and an `aria-label` built from the data, it has no hover or focusable part, and the flat variant is `aria-hidden`

**Given** fonts load or the window is resized
**When** the plot is visible
**Then** it redraws, debounced by 150 ms

**Given** where the plot appears
**When** this story is done
**Then** it shows on the Søknad result, flat on the Søknad form, and on Hjem for the Example ad

### Story 2.10: Try the app with the example

As the Examiner,
I want one click to fill in a ready-made CV and job ad,
So that I can see the whole flow in seconds without writing my own inputs.

**Covers:** FR-27 (Example pair and «Bruk eksempelet»), FR-3 (manual check), FR-8 (manual check), AD-2, AD-15, UX-DR36
**Code:** Søknad page (server component) passes the Example pair as props, loaded through `data-files.ts`; `next.config.ts` traces the Example pair's folder; reuses the Søknad form, CV input and `announce()`

**Acceptance Criteria:**

**Given** Søknad, with or without login and in every mode
**When** «Bruk eksempelet» is pressed
**Then** the job title, employer, Job ad and CV text fill in from the Example pair, the CV text counts as confirmed (it isn't extraction output), focus moves to «Analyser og skriv utkast», and the second live region says «Eksempelet er fylt inn.»

**Given** the Example pair's `cv.pdf`, its `cv.txt` and «Bruk eksempelet»
**When** each is used as the CV input with the same ad
**Then** all three give the same canonical CV text, the same score and the same fingerprint (automated test)

**Given** the two-column PDF Fixture
**When** Helene uploads it on Søknad, fixes the scrambled lines and confirms
**Then** the analysis uses the corrected text, and the FR-3 manual row in `docs/qa/` records the result

**Given** the Example pair result
**When** it is checked by hand
**Then** the FR-8 manual row in `docs/qa/` records that every Evidence line and ad line is correct

### Story 2.11: Decide whether code alone extracts Keywords well enough (FR-5b)

As the product owner,
I want a held-out test of code-only extraction on 17 November,
So that the FR-5b decision rests on evidence, and the requirements are written in one form from then on.

**Covers:** FR-5, FR-5b (decision), SM-2, NFR-10, PRD Open questions 2 and 6
**Code:** one new Fixture under `data/fixtures/`; `docs/qa/` row; PRD and architecture edits only

**Acceptance Criteria:**

**Given** the vocabulary has been tuned against the existing Answer keys
**When** a new held-out Fixture is written after the tuning, with its Answer key written by hand before the engine is run on it
**Then** SM-2 is run on every Fixture, including the held-out one, and the result is recorded in `docs/qa/` with the date

**Given** SM-2 passes on every Fixture
**When** the decision is recorded
**Then** FR-5b is deleted from the PRD, Open questions 2 and 6 are closed, `FEATURE_KEYWORD_FALLBACK` stays off, and the FR-5b story in Epic 3 is dropped

**Given** SM-2 fails on any Fixture
**When** the decision is recorded
**Then** the FR-5b table is written into FR-8, NFR-4, P6, NFR-8, FR-24, FR-25, FR-27 and NFR-6, the change from the brief is logged in PRD §11, and the FR-5b story in Epic 3 is kept

**Given** either outcome
**When** the planning documents are changed
**Then** the commit message names the changed IDs, and the PRD `.memlog.md` gets an entry

## Epic 3: Get an honest draft Letter

The Student picks a Tone and gets a bokmål draft Letter built on their own CV, with any claim the CV doesn't support flagged. They can copy it, download it as .docx or ask for a new draft. They are told before any text leaves the app, and AI use is capped. The Examiner runs the whole flow in Test mode with no key. Ends with the core-flow checkpoint on 24 Nov.

### Story 3.1: Send every AI request through one pipeline

As the developer,
I want one function that every AI request must pass through,
So that no request can skip contact stripping, the timeout or content-free logging, and no test can ever make a paid request.

**Covers:** FR-23 (logs), FR-26, FR-27 (no paid requests in tests), NFR-4 (90 s timeout), NFR-8 (token counts), AD-3, AD-13
**Code:** creates `src/modules/ai/{contracts.ts, index.ts, core/strip-contact.ts, server/run-ai.ts, server/adapters/{factory, mock}.ts}`; reuses `config`, `log()`

**Acceptance Criteria:**

**Given** `ai/contracts.ts`
**When** any slice needs the AI result shapes
**Then** `AiResultMeta { source, provider, model, promptVersion, createdAt }` and `AiOutput<T> = { data, meta }` are defined there and nowhere else

**Given** `runAi(request, ctx)` with `request = { task, cvText?, jobAd, tone?, jobTitle?, employer?, buildPrompt(sentCvText), schema }`
**When** a slice calls it
**Then** it computes the lookup key from the unstripped inputs, strips contact details, builds the prompt from the stripped CV text, calls the adapter with a 90 s `AbortSignal` and SDK retries set to 0, and parses the answer with `schema`
**And** it returns `AiOutput<T>` plus `sentCvText`
**And** no slice ever passes a finished prompt string

**Given** `stripContactDetails(cvText)`
**When** the CV text has email addresses and Norwegian or international phone numbers
**Then** they are deleted and nothing is inserted in their place (unit-tested on a table of forms)

**Given** any AI request, successful or not
**When** it finishes
**Then** exactly one `LogEvent` is logged with task, provider, model, token counts, duration and error code
**And** a test shows that no prompt or response text reaches the log

**Given** a timeout or a provider failure
**When** the request ends
**Then** `runAi` returns `AI_TIMEOUT` or `AI_PROVIDER_ERROR`, both retryable

**Given** a test run
**When** the adapter factory is asked for `live`
**Then** it throws; tests use `mock` or `cached` only

### Story 3.2: Enforce the Daily cap and the AI notice on the server

As the developer,
I want the server to refuse an AI request when the cap is reached or the notice hasn't been accepted,
So that the budget and the Student's consent never depend on the browser behaving.

**Covers:** FR-24 (server check), FR-25 (per installation), NFR-8, AD-4 (`aiNotice`), AD-13
**Code:** creates `src/modules/ai/server/schema.ts` (`ai_usage`, the first table) and its migration, cap and notice steps in `run-ai.ts`, `src/shared/core/time.ts` (Oslo day); `config.aiNotice`

**Acceptance Criteria:**

**Given** `ctx.consent.noticeVersion` differs from `config.aiNotice.version`, or is missing
**When** `runAi` is called outside Test mode
**Then** it fails with `AI_NOTICE_REQUIRED` before any adapter call

**Given** the cap step
**When** a request is allowed
**Then** one atomic reservation runs (`UPDATE ai_usage SET count = count + 1 WHERE scope = $1 AND day = $2 AND count < 30 RETURNING count`, after an upsert of the row), with `scope = ctx.studentId ?? 'installation'` and `day` = the Oslo date from `shared/core/time`
**And** no caller can pass a scope, and a failed request gets no refund

**Given** 30 requests have been made today
**When** the 31st is attempted
**Then** it fails with `DAILY_CAP_REACHED` (429), and the count resets at Oslo midnight (tested with an injected time)

**Given** Test mode
**When** `runAi` is called
**Then** the notice and cap steps are skipped

**Given** `config.aiNotice`
**When** RunMode is built
**Then** it carries `version`, `providerName` and `retentionDays`, and `version` changes whenever the provider, the retention period or `keywordFallback` changes

### Story 3.3: Pick the AI provider in a bake-off

As the product owner,
I want the two contender models compared on our own checklist before any prompt is final,
So that the provider is chosen on evidence about honesty, Norwegian quality, privacy terms and cost.

**Covers:** PRD Open question 3, §8.1, §8.2, NFR-8, AD-3 (live adapter), architecture Deferred (provider and model)
**Code:** creates `src/modules/ai/server/adapters/live.ts` (Vercel AI SDK), `scripts/bake-off.ts` with rough Letter and Gap prompts written for it; removes the losing `@ai-sdk/*` package afterwards; `docs/qa/` and `docs/architecture.md` rows

**Acceptance Criteria:**

**Given** the two contenders (`@ai-sdk/anthropic` and `@ai-sdk/openai`)
**When** their terms are checked before the bake-off
**Then** `docs/qa/` records for each: paid tier, no training on inputs, retention period, DPA available, and whether it is on the EU–US Data Privacy Framework list (if the winner isn't, §8.1 is amended to accept Standard Contractual Clauses)

**Given** the live adapter
**When** `AI_PROVIDER`, `AI_MODEL` and `AI_API_KEY` are set outside a test run
**Then** `runAi` sends the request through the chosen provider with structured output parsed by the request's schema

**Given** `scripts/bake-off.ts`
**When** it runs every Fixture through both contenders with the rough prompts
**Then** the outputs are saved to `docs/qa/` and scored by hand on checklist items L1–L8, G1–G3 and R1, with the token counts and a cost estimate per Application at current prices

**Given** the scores
**When** Helene picks the winner on 18 Nov
**Then** the decision and its reasons are recorded in `docs/architecture.md` and the PRD (Open question 3 closed), `config.aiNotice` gets the winner's name and retention period, and the losing package is removed from `package.json`
**And** a monthly spending limit is set with the provider when the key is created

### Story 3.4: Write the Letter on the server

As a Student,
I want the app to write a draft Letter from my CV and the ad, in the Tone I pick,
So that I start from a tailored draft built on my real experience instead of a blank page.

**Covers:** FR-9, FR-10 (prompt), FR-26, NFR-1, NFR-4, AD-6, AD-7 (sign-off), AD-13, AD-15 (prompt version)
**Code:** creates `src/modules/letter/{contracts.ts, index.ts, core/{render-letter, file-name}.ts, server/{generate.ts, prompts/}}`, `src/app/api/analyses/[id]/letter/route.ts`; reuses `runAi`, phase 1 from `application`

**Acceptance Criteria:**

**Given** `POST /api/analyses/[id]/letter` with `{ applicationId, fingerprint, inputs, tone, consent }`
**When** it is called
**Then** the server recomputes phase 1 from `inputs`, returns `ANALYSIS_STALE` (409) if the fingerprint differs, and otherwise makes exactly one `runAi` request with `maxDuration = 120`
**And** it never trusts derived data from the client

**Given** the Letter prompt in `letter/server/prompts/` with a `PROMPT_VERSION`
**When** it is built
**Then** it asks for a bokmål Letter to the named employer for the named job, 250–400 words (at most 300 for «Direkte»), built on 2–3 concrete examples from the CV that best match the ad, using only qualifications in the CV text, in the chosen Tone's style (FR-10), and following the UX voice
**And** the Student's name is never sent to the AI

**Given** the AI's answer
**When** `letter/server` normalises it
**Then** the stored and returned Letter is `{ text, tone, rev }` with exactly one `{{SIGNATUR}}` token, added if missing, and any other sign-off replaced

**Given** `renderLetter(text, name | null)` and `letterFileName(meta, name | null)` in `letter/core`
**When** there is no name
**Then** the sign-off is «[Navnet ditt]» and the file name is ASCII-only without a person's name, such as `soknadsbrev-nordic-digital-2026.docx`
**And** with a name it is like `violet-hansen-soknadsbrev-nordic-digital-2026.docx` (unit-tested, including æøå)

### Story 3.5: Run the full flow in Test mode on Cached responses

As the Examiner,
I want the Example pair to produce a real Letter in every Tone with no API key,
So that I can see the whole core flow at no cost.

**Covers:** FR-27, FR-10 (Tone rules on the Cached Letters), FR-9 (label and structure in Test mode), SM-1, AD-14 (`checkTone`), AD-15, UX-DR16
**Code:** creates `src/modules/ai/server/adapters/cached.ts` (with the Fixture index), `scripts/record-cached.ts`, `data/fixtures/*/cached/letter-{formell,personlig,direkte}.json`, `src/modules/integrity/{core/{check-tone, word-lists}.ts, core/index.ts}`, `src/shared/ui/components/banner`

**Acceptance Criteria:**

**Given** `scripts/record-cached.ts` and a live key
**When** it runs for a Fixture
**Then** it writes one Letter per Tone as raw `AiOutput<T>` (before any guard), labelled with provider, model, prompt version and date
**And** it is the only writer of `cached/`

**Given** the cached adapter
**When** a request arrives in Test mode
**Then** it looks the answer up by the AD-15 key, with each Fixture indexed under the hash of `cv.txt` and of `extract(cv.pdf)`
**And** a test shows that `cv.pdf`, `cv.txt` and «Bruk eksempelet» reach the same Cached Letter
**And** any other input returns `TEST_MODE_UNAVAILABLE`

**Given** `checkTone` and the code lists of anecdote markers and motivation phrases in `integrity/core`
**When** the Cached Letters are tested
**Then** «Formell» has no anecdote marker, «Personlig» has at least one motivation phrase, and «Direkte» is at most 300 words with a Matched keyword in its first sentence
**And** every Cached Letter is 250–400 words and has one `{{SIGNATUR}}` token

**Given** CI
**When** the Example pair's cached `promptVersion` differs from the current Letter `PROMPT_VERSION`
**Then** CI fails

**Given** `testMode` is true
**When** any page renders
**Then** the banner «Testmodus – KI-svarene er forhåndslagret» with «Samsvaret regnes likevel ut av koden.» sits under the app bar, inside `<header>`, with a sand «Testmodus» strip and `role="note"`, and can't be dismissed

### Story 3.6: Ask before any text leaves the app

As a Student,
I want to be told what is sent to the AI provider, and to agree, before anything is sent,
So that I decide whether my CV text leaves the app.

**Covers:** FR-24 (once per browser session), NFR-2, AD-13, AD-16, UX-DR17, UX-DR38
**Code:** creates `src/shared/ui/components/dialog` (native `<dialog>`, reused later by the expiry warning), `src/modules/ai/ui/ai-notice` exported through `ai/ui/index.ts`; reuses `client-session.ts` (`noticeVersion`), RunMode

**Acceptance Criteria:**

**Given** Test mode is off and `ja.session.v1` has no `noticeVersion` equal to `RunMode.aiNotice.version`
**When** the Student submits on Søknad
**Then** the AI notice opens before phase 1, as a modal native `<dialog>` with focus on its title, focus trapped, and a scrim click that does nothing

**Given** the notice
**When** it renders
**Then** its title is «Teksten din sendes til en KI-tjeneste», its body names the provider and says nothing is sent before acceptance, and it lists that the score is calculated locally, that email addresses and phone numbers are removed, that the provider doesn't train on the text and deletes it after the retention period, that sensitive information should be left out, and that the Student is asked only once

**Given** «Godta og fortsett»
**When** it is pressed
**Then** `noticeVersion` is saved in `ja.session.v1`, phase 1 starts, and phase-2 requests carry `consent: { noticeVersion }`

**Given** «Avbryt» or Esc
**When** it is pressed
**Then** the dialog closes, every input is kept, nothing is sent, and focus returns to «Analyser og skriv utkast»

**Given** the notice was accepted in this browser session
**When** the Student submits again
**Then** it doesn't appear

**Given** Test mode
**When** the Student submits
**Then** the notice never appears

**Given** the wording
**When** it is checked against the chosen provider's terms
**Then** the FR-24 manual row in `docs/qa/` records that it matches

### Story 3.7: Choose a Tone and see the Letter arrive

As a Student,
I want to pick a Tone and see the Letter appear under my score as soon as it's ready,
So that I get my draft without losing sight of the score.

**Covers:** FR-9, FR-10, FR-8 (score stays), NFR-2, NFR-4, NFR-5, AD-6, AD-16, UX-DR25, UX-DR28, UX-DR30, UX-DR33 (before-S4 variant), UX-DR37
**Code:** creates `src/modules/letter/ui/{tone-choice, letter-view}` exported through `letter/ui/index.ts`, `src/shared/ui/components/{progress-line, ai-placeholder}` (shared, because the Gaps section reuses them); the phase-2 Letter mutation in TanStack Query

**Acceptance Criteria:**

**Given** the Søknad form
**When** it renders
**Then** «Tone i brevet» is a native radio group in a `fieldset` with «Formell – Høflig og saklig» (preselected), «Personlig – Varm, med «jeg» i front» and «Direkte – Kort, rett på sak», the whole option is the hit area, arrow keys move within the group, and the Tone is kept in `ja.session.v1`

**Given** phase 1 has rendered
**When** phase 2 starts
**Then** the Letter request is sent with the inputs, fingerprint, Tone and consent, the progress line says «Skriver søknadsbrevet … dette tar under ett minutt.», and the «Søknadsbrev» placeholder shows its real `h2`, a «Skrives» strip and `aria-busy="true"`
**And** the phase-1 announcement now ends with the AI sentence for this variant

**Given** the Letter arrives
**When** it renders
**Then** it is shown at once in the read-only Letter view (`<article aria-labelledby aria-describedby>`, never a textarea or `contenteditable`), under the label «Utkast skrevet med KI – les gjennom og tilpass før du sender.», with the sign-off rendered by `renderLetter` as «[Navnet ditt]»
**And** the credits list shows the Tone, the progress line is removed, and the first live region says the phase-2 line once
**And** focus is not moved

**Given** `ANALYSIS_STALE`
**When** it is returned
**Then** the client reruns phase 1 once without telling the Student and resends the Letter request; a second `ANALYSIS_STALE` shows the section error

**Given** the progress trace
**When** it animates
**Then** it stops after 5 s, and it is static under `prefers-reduced-motion`

**Given** the Example pair in Test mode
**When** UJ-1 is run end to end from «Bruk eksempelet» in Playwright
**Then** the score and the Letter for the chosen Tone appear, and the Tone shown equals the Tone requested

### Story 3.8: Copy, download and regenerate the Letter

As a Student,
I want to copy the Letter, download it as a Word file, or ask for a new draft,
So that I can finish it in my own tools.

**Covers:** FR-12, FR-10 (Tone kept), FR-25 (new drafts count), NFR-5, AD-7, AD-8, UX-DR13, UX-DR28, UX-DR39 (Letter regenerating)
**Code:** creates `src/shared/ui/components/copy-button` (reused by suggestions and Historikk), the .docx builder in `letter/ui` (the `docx` package, in the browser); reuses `renderLetter`, `letterFileName`, `announce()`

**Acceptance Criteria:**

**Given** the Letter view
**When** «Kopier» (primary) is pressed
**Then** the plain text with the sign-off rendered is copied, the label reads «Kopiert» for 1.8 s, the second live region says «Kopiert til utklippstavlen.», and focus stays on the button
**And** if the clipboard is blocked, the text is selected and a notice says «Kopier med Ctrl+C, eller hold inne på mobil.»

**Given** «Last ned (.docx)»
**When** it is pressed
**Then** the browser builds a .docx from the rendered Letter and downloads it under `letterFileName`, ASCII only

**Given** «Lag nytt utkast»
**When** it is pressed
**Then** it is busy while running, the current Letter stays visible, the progress line returns with «Skriver et nytt utkast …», and one new Letter request is sent with the form's Tone
**And** on success the new Letter replaces the old one and «Det nye utkastet er klart.» is announced
**And** on failure the old Letter stays, with an alert and «Prøv igjen», and «Det nye utkastet kunne ikke lages. Det forrige brevet står fortsatt.» is announced

**Given** Test mode
**When** «Lag nytt utkast» is pressed
**Then** the Cached Letter for the chosen Tone is shown again

**Given** the Letter view at ≤ 640 px
**When** it renders
**Then** the actions go full width under the Letter

### Story 3.9: Keep the score when the AI part fails

As a Student,
I want the score to stay on screen when the Letter can't be written, with a way to try again,
So that an AI problem never costs me the part that already worked.

**Covers:** NFR-5, NFR-4 (timeout and retry), FR-25 (cap reached), FR-27 (not available in Test mode), AD-6, AD-7, UX-DR15, UX-DR39
**Code:** section error handling in `letter/ui`; reuses alert, notice, `announce()`

**Acceptance Criteria:**

**Given** the Letter request times out after 90 s or the provider fails
**When** the section settles
**Then** the placeholder becomes an alert «Søknadsbrevet kunne ikke lages. Samsvaret over er fortsatt riktig.» with «Prøv igjen», the score stays, and the phase-2 announcement names the failed section

**Given** «Prøv igjen»
**When** it is pressed
**Then** only the Letter request is resent, focus moves to the «Søknadsbrev» `h2`, and the outcome is announced in the second live region

**Given** `DAILY_CAP_REACHED`
**When** it is returned
**Then** the section shows a notice labelled «Dagens grense»: «Du har brukt dagens 30 KI-forespørsler. Grensen nullstilles ved midnatt.», with no retry, and the score stays

**Given** Test mode and inputs that aren't a Fixture
**When** phase 2 runs
**Then** the section shows a notice labelled «Testmodus»: «Ikke tilgjengelig i testmodus. Bruk eksempelet for å se hele flyten.», and the score stays

**Given** a double click on submit, or a refresh while the Letter is being written
**When** it happens
**Then** only one Application and one Letter request are started, and no raw error page appears

### Story 3.10: Flag claims in the Letter that the CV doesn't support

As a Student,
I want the app to point out any word in the Letter that my CV doesn't back up,
So that I don't send a letter that claims something I can't defend in an interview.

**Covers:** FR-11 (every Missing keyword flagged while Gap analysis doesn't exist), P1, P3, AD-6, AD-14, UX-DR29
**Code:** creates `integrity/core/check-letter.ts` and the Upgrade-word list in `integrity/core/word-lists.ts`, `src/app/api/analyses/[id]/letter-check/route.ts`, `letter/ui/letter-flags`; reuses `keywords/core`, alert

**Acceptance Criteria:**

**Given** `checkLetter` in `integrity/core`
**When** it scans a Letter with the Keyword engine
**Then** it skips the job title, the employer and `{{SIGNATUR}}`, and flags every Missing keyword in the Letter as an Unsupported claim when `gaps` is `null`
**And** it flags every Upgrade word (such as «forsket», «ledet», «ansvarlig for») that appears in the Letter but nowhere in the CV text, with other forms of the word counted as the same word

**Given** `POST /api/analyses/[id]/letter-check` with `{ applicationId, fingerprint, inputs, letter, gaps: null, letterRev, gapsRev }`
**When** the Letter has arrived
**Then** the server recomputes phase 1, runs `checkLetter`, and returns `LetterCheck { flags, letterRev, gapsRev }`
**And** it is sent again after «Lag nytt utkast», and the client drops a result whose revs don't match the Letter shown

**Given** flags
**When** they render
**Then** a warning list sits between the AI label and the Letter, one line per flagged word («Brevet nevner «X», men CV-en din viser det ikke. Sjekk at brevet ikke påstår noe CV-en din ikke støtter.» or «Brevet bruker ordet «ledet», men CV-en din bruker det ikke. Sjekk at brevet ikke gjør rollen din større enn den var.»)
**And** each flagged word in the Letter has a dashed rust underline and links to its warning, and nothing is removed or rewritten

**Given** the check fails
**When** the Letter is on screen
**Then** the Letter stays with «Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.» and a retry for the check only

**Given** planted Cached responses in `data/fixtures/_planted/`
**When** the FR-11 tests run
**Then** a Letter containing a Real-gap Keyword, the job title and an Upgrade word gets exactly the expected flags

### Story 3.11: Let AI propose Keywords when code alone falls short (only if FR-5b applies)

As a Student,
I want a reliable Keyword list even for ads the vocabulary handles badly,
So that my score reflects the ad (kept only if Story 2.11 decides that FR-5b applies; dropped otherwise).

**Covers:** FR-5b, and the rewritten FR-8, NFR-4, NFR-8, FR-24, FR-25, FR-27, NFR-6; AD-5, AD-9 (`keyword_lists`), AD-13
**Code:** creates `src/modules/keywords/server/schema.ts` (`keyword_lists`) and its migration, the FR-5b path in `KeywordSource.resolve`, a keywords prompt with `PROMPT_VERSION`, `cached/keywords.json` for every Fixture; switches the `keywordFallback` default on

**Acceptance Criteria:**

**Given** a Job ad whose list isn't saved
**When** phase 1 runs with the notice accepted, outside Test mode and under the cap
**Then** one `runAi` request proposes the list, every proposed Keyword must pass `findKeyword` against the ad or is dropped, and the list is saved under `contentHash(canon(ad))` with `keywordSource: 'saved'`

**Given** the notice isn't accepted, Test mode is on, the cap is reached or the request fails
**When** phase 1 runs for a new ad
**Then** the code-only list is used with `keywordSource: 'code-fallback'`, and the score block shows «Mindre presist: nøkkelordene er hentet ut uten KI.»

**Given** phase 1 waits for the Keyword request
**When** the Student waits
**Then** the unannounced progress line says «Henter nøkkelord fra annonsen …»

**Given** a planted Cached response with a Keyword the ad doesn't contain
**When** the FR-5b test runs
**Then** that Keyword is dropped, and the same ad gets the same saved list and score on a second run

**Given** the AI notice
**When** `keywordFallback` is on
**Then** its text also says that the Job ad, never the CV, is sent to extract Keywords, and `aiNotice.version` has changed

### Story 3.12: Turn on live AI on the Hosted version and pass the core-flow checkpoint

As the Examiner,
I want the Hosted version to write real Letters, and the core flow proven stable before more features are added,
So that I can try the live AI, and the build order's checkpoint is met before work starts on S4.

**Covers:** FR-30, FR-24, FR-25, NFR-5, NFR-8, SM-1, SM-2, PRD §5.2 (core-flow checkpoint, 24 Nov), SC7, SC8
**Code:** Vercel environment variables only; `docs/qa/` rows

**Acceptance Criteria:**

**Given** Vercel's Production environment
**When** live AI is switched on
**Then** `AI_PROVIDER`, `AI_MODEL` and `AI_API_KEY` are set, the provider's monthly spending limit is confirmed, and UJ-1 (without accounts) works on the Hosted version on a laptop and on a phone, recorded in the FR-30 row

**Given** the checkpoint on 24 Nov
**When** it is assessed
**Then** `docs/qa/` records, with the date: the automated tests for FR-1 to FR-12 and FR-24 to FR-28 pass; SM-1 passes for the Example pair in Test mode and for at least one live Fixture; SM-2 passes; and the wrong-input tour (all 6 inputs, plus a double click and a refresh during phase 2) passes

**Given** the checkpoint isn't passed
**When** it is recorded
**Then** cut 0 is applied (the Hosted version is frozen by setting `main` to `false` in `deploymentEnabled`), S1–S3 are finished before anything else, and the decision is logged in PRD §11

## Epic 4: Understand each gap honestly

For each Missing keyword, the Student learns whether the CV already shows it in other words (a Rewordable gap that quotes the CV word for word) or whether it is a Real gap, stated plainly with nothing to paste in. Stories 4.1–4.5 are built behind `FEATURE_GAPS`, which is off until Story 4.6 switches its default on; their automated tests set the flag on explicitly.

### Story 4.1: Classify each Missing keyword on the server

As a Student,
I want each keyword my CV is missing to be judged against what my CV does say,
So that I know which gaps I can close with better wording and which are real.

**Covers:** FR-13, FR-14, NFR-1, NFR-4, AD-6, AD-7 (`Gap` shape), AD-13, AD-14 (structure step), AD-15 (prompt version)
**Code:** creates `src/modules/gaps/{contracts.ts, index.ts, server/{analyse.ts, prompts/}}`, `src/app/api/analyses/[id]/gaps/route.ts`; reuses `runAi`, phase 1 from `application`, the Real-gap template key in `messages.nb.ts`

**Acceptance Criteria:**

**Given** `POST /api/analyses/[id]/gaps` with `{ applicationId, fingerprint, inputs, consent }`
**When** it is called with `features.gaps` on
**Then** the server recomputes phase 1, returns `ANALYSIS_STALE` if the fingerprint differs, and otherwise makes exactly one `runAi` request with the CV text, the Job ad and the Missing keywords, with `maxDuration = 120`

**Given** the gaps prompt in `gaps/server/prompts/` with a `PROMPT_VERSION`
**When** it is built
**Then** it asks, for each Missing keyword, for a kind (Rewordable or Real), a one- or two-sentence bokmål explanation that refers to the ad in the order "what is missing, why it matters, the CV entry that covers it", and, for a Rewordable gap, a word-for-word citation of the supporting CV entry
**And** it says that a formal requirement (degree, certification, licence, language level, work permit) can be Rewordable only if the CV states it explicitly, that Rewordable explanations are hedged («dekker trolig dette – vurder å ta det med»), and that no explanation may claim an ATS will reject or rank the CV

**Given** the AI's answer
**When** `gaps/server` applies the structure step
**Then** it returns exactly one `Gap` per Missing keyword, in the order of the Missing list, drops extra items, and turns a skipped Keyword into a template Real gap (`explanation: { key, params }`)
**And** every `suggestion` is `null` while `features.rewording` is off

**Given** `features.gaps` is off
**When** the route is called
**Then** it returns `NOT_FOUND`, and no AI request is made

### Story 4.2: Check every citation against the CV text

As a Student,
I want a Rewordable gap shown only when its quote really is in my CV,
So that the app never tells me I have experience my CV doesn't show.

**Covers:** FR-15, SC3, P1, AD-14
**Code:** creates `integrity/core/{check-citation, cv-entries}.ts`, `src/shared/core/canon-verbatim.ts` (case and whitespace only; shared because `integrity` and the cached-key code both use it), `data/fixtures/_planted/` gaps responses; the FR-15 step in `gaps/server`

**Acceptance Criteria:**

**Given** `checkCitation` in `integrity/core`
**When** it checks a Rewordable gap's citation
**Then** it is a substring test on `canonVerbatim` text against `sentCvText`, ignoring only case and whitespace, never looser

**Given** a citation that isn't in the CV text word for word
**When** `gaps/server` runs FR-15 after the structure step
**Then** the Gap becomes a Real gap with the fixed template, its AI explanation and suggestion are dropped, and only a count of downgrades is logged

**Given** `cvEntries(text)` in `integrity/core`
**When** it is given a CV text
**Then** it returns the blocks of lines bounded by blank lines, and it is the only CV-entry splitter in the code

**Given** planted Cached responses
**When** the FR-15 tests run
**Then** a paraphrased citation, a citation from the ad instead of the CV, and a citation with one changed word are each downgraded, and an exact citation with different case and line breaks passes

### Story 4.3: Record Cached Gaps for every Fixture

As the Examiner,
I want Gap analysis to work in Test mode for the Example pair and the Fixtures,
So that I see the Gapanalyse at no cost, and the tests can compare it with the Answer keys.

**Covers:** FR-27, FR-28 (Gap part), FR-13 (structure), SC4, AD-15
**Code:** `data/fixtures/*/cached/gaps.json` written by `scripts/record-cached.ts`; creates `scripts/qa-compare.ts` (G2 check); reuses the cached adapter and the Answer-key schema

**Acceptance Criteria:**

**Given** a live key
**When** `scripts/record-cached.ts` runs the gaps task for every Fixture
**Then** each gets a `gaps.json` holding raw `AiOutput<T>`, labelled with provider, model, prompt version and date

**Given** Test mode
**When** the Example pair or a Fixture is analysed
**Then** the gaps request is answered from `gaps.json` by the AD-15 Gaps key, and any other input returns `TEST_MODE_UNAVAILABLE`

**Given** the Cached Gaps after the guards
**When** the structure tests run
**Then** each Fixture has exactly one Gap per Missing keyword, every Rewordable gap's citation passes FR-15, and none of the Answer key's must-never-be-Rewordable keywords is Rewordable

**Given** `scripts/qa-compare.ts`
**When** it is run on a set of live outputs
**Then** it reports every G2 failure (a must-never-suggest item that became Rewordable) per Fixture

**Given** CI
**When** the Example pair's cached gaps `promptVersion` differs from the current one
**Then** CI fails

### Story 4.4: Read the Gapanalyse on Søknad

As a Student,
I want each missing keyword explained next to my score, with the CV line that covers it or a plain statement that nothing does,
So that I can decide what to do about each gap myself.

**Covers:** FR-8 («Se gapanalysen»), FR-13, FR-14, NFR-2, NFR-5, AD-6, UX-DR24, UX-DR27, UX-DR30, UX-DR33 (before-S5 variant), UX-DR37, UX-DR39
**Code:** creates `src/modules/gaps/ui/{gap-entry, no-copy-note}` exported through `gaps/ui/index.ts`, the phase-2 Gaps mutation; extends `match/ui` keyword entry with an optional link target passed in by the Søknad composition (`match` never imports `gaps`); reuses evidence quote, code strip, AI placeholder, progress line, alert, notice

**Acceptance Criteria:**

**Given** phase 1 has rendered with `features.gaps` on
**When** phase 2 starts
**Then** the Gaps and Letter requests are sent in parallel, the progress line says «Skriver gapanalyse og søknadsbrev … dette tar under ett minutt.», and there are two placeholders, «Gapanalyse» and «Søknadsbrev», each with its real `h2`

**Given** the Gaps arrive
**When** they render
**Then** the «Gapanalyse» `h2` carries the sand «Skrevet med KI» strip, and each Gap is an `h3` with its strip («Omformulerbart gap» or «Reelt gap»)
**And** a Rewordable gap shows its explanation, the citation as an Evidence quote with «Sitert ordrett fra CV-en din · sjekket mot CV-teksten», and the hedge line «Linjen din dekker trolig dette – vurder å ta det med.»
**And** a Real gap shows its explanation and the no-copy note «Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.», with nothing copyable
**And** a downgraded or skipped Gap shows only the Real-gap template line

**Given** the Missing list
**When** Gaps exist
**Then** each Missing entry ends with «Se gapanalysen», an in-page link that moves focus to its Gap's `h3`

**Given** the Gaps request fails, times out, hits the cap or isn't available in Test mode
**When** the section settles
**Then** it shows the same treatments as the Letter section (alert «Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.» with «Prøv igjen», or the «Dagens grense» or «Testmodus» notice), and the score and the Letter are unaffected

**Given** both sections have settled
**When** the first live region speaks
**Then** it says the phase-2 line once, naming any section that failed

### Story 4.5: Let the Letter use gaps the CV supports

As a Student,
I want the Letter check to accept a keyword my CV supports in other words,
So that only real problems are flagged and the warnings stay worth reading.

**Covers:** FR-11 (Rewordable gaps allowed), AD-6, AD-8 (revs), AD-14
**Code:** extends `integrity/core/check-letter.ts` and the `/letter-check` route; Søknad sends the check when the Letter has arrived and the Gaps have settled

**Acceptance Criteria:**

**Given** a Letter that names a Missing keyword
**When** the Keyword is a Rewordable gap whose citation passes `checkCitation` again on the server
**Then** it is not flagged; every other Missing keyword in the Letter is still an Unsupported claim

**Given** the client
**When** the Letter has arrived and the Gaps request has settled
**Then** it sends `/letter-check` with the Gaps (or `gaps: null` if Gap analysis failed) and the current `letterRev` and `gapsRev`
**And** it sends the check again after a successful Gaps retry and after «Lag nytt utkast», dropping any result whose revs don't match what is shown

**Given** planted Cached responses
**When** the FR-11 tests run
**Then** a Rewordable-gap Keyword that passed FR-15 is not flagged, the same Keyword with a failing citation is flagged, and a Real-gap Keyword, an Upgrade word and the job title behave as in Story 3.10

### Story 4.6: Switch on Gap analysis

As a Student,
I want Gap analysis on in every run of the app,
So that I get the honest gap review with every Application.

**Covers:** FR-13, FR-14 (manual check G5), AD-4 (flag default), NFR-2
**Code:** `FEATURE_DEFAULTS.gaps = true` in `config.ts`; Playwright tests for the Gapanalyse; `docs/qa/` rows

**Acceptance Criteria:**

**Given** `FEATURE_DEFAULTS`
**When** this story is merged
**Then** `gaps` is on by default, and no `compose.yaml`, `.env.example` or README sets `FEATURE_GAPS`

**Given** the Example pair in Test mode
**When** UJ-1 is run end to end in Playwright
**Then** the Gapanalyse shows the Example pair's Rewordable and Real gaps, «Se gapanalysen» moves focus, and the axe scan passes

**Given** one live Fixture run
**When** Helene checks the Gaps by hand
**Then** checklist items G1, G2, G3 and G5 are recorded in `docs/qa/` with the date, and any failure leads to a prompt fix and a new `PROMPT_VERSION`

## Epic 5: Get rewording suggestions to copy

For each Rewordable gap, the Student gets one concrete phrasing in the employer's words that uses only facts already in the cited CV entry, with «Kopier». Suggestions that invent or upgrade are discarded by code. Stories 5.1–5.3 are built behind `FEATURE_REWORDING`, which Story 5.4 switches on.

### Story 5.1: Ask for a rewording suggestion with each Rewordable gap

As a Student,
I want a concrete new phrasing for each CV line that covers a gap,
So that I can say what I've done in the employer's words.

**Covers:** FR-16, SC6, AD-7 (unchanged `Gap` shape), AD-15 (one gaps prompt, re-recorded once)
**Code:** extends the gaps prompt in `gaps/server/prompts/` (new `PROMPT_VERSION`); re-records `gaps.json` for every Fixture

**Acceptance Criteria:**

**Given** the gaps prompt
**When** it is extended
**Then** for each Rewordable gap it also asks for one suggested phrasing of the cited CV entry that expresses the Keyword using only facts already in that entry, may put what the Student learned or did into the employer's words, and never upgrades the kind of work or the Student's role (an exam paper is not research; taking part is not leading)
**And** a Real gap gets no suggestion

**Given** `features.rewording` is on
**When** the Gaps are returned
**Then** each Rewordable gap's `suggestion` is a string, and each Real gap's is `null`; the `Gap` shape is unchanged from Epic 4

**Given** `features.rewording` is off
**When** the Gaps are returned
**Then** every `suggestion` is `null`, as in Epic 4

**Given** the new `PROMPT_VERSION`
**When** `scripts/record-cached.ts` re-records `gaps.json` for every Fixture
**Then** CI passes the prompt-version check, and the Story 4.3 structure tests still pass

### Story 5.2: Discard suggestions that invent or upgrade

As a Student,
I want any suggestion that adds a fact or makes my role sound bigger to be thrown out by code,
So that I never copy a line I couldn't defend in an interview.

**Covers:** FR-17, SC6, SM-3, P1, AD-14
**Code:** creates `integrity/core/check-suggestion.ts`; the FR-17 step in `gaps/server`; planted responses in `data/fixtures/_planted/`; reuses `cvEntries`, the Upgrade-word list and `keywords/core`

**Acceptance Criteria:**

**Given** `checkSuggestion` in `integrity/core`
**When** a suggestion contains a Missing keyword other than its own Gap's Keyword
**Then** it is discarded as an Unsupported claim

**Given** a suggestion that contains an Upgrade word
**When** the cited CV entry (the `cvEntries` block around the citation) doesn't contain that word in any form
**Then** the suggestion is discarded; «forsket», «forsker» and «forskning» count as the same word

**Given** the order in `gaps/server`
**When** the Gaps are processed
**Then** the structure step runs first, then FR-15, then FR-17, and a discarded suggestion becomes `null` while the citation and explanation stay
**And** only a count of discards is logged

**Given** planted Cached responses
**When** the FR-17 tests run
**Then** «Forsket på sårvurdering» for the nursing Fixture's exam-paper entry is discarded, «Kompetanse i sårvurdering» is kept, and a suggestion naming another Missing keyword is discarded

### Story 5.3: Copy a suggestion from the Gapanalyse

As a Student,
I want each suggestion shown with its CV line and a copy button, and nothing that adds it for me,
So that I choose what goes into my CV.

**Covers:** FR-16, P3, NFR-2, UX-DR13, UX-DR27, UX-DR33 (full variant)
**Code:** creates `gaps/ui/suggestion-box`; reuses copy button, evidence quote, `announce()`

**Acceptance Criteria:**

**Given** a Rewordable gap with a suggestion
**When** it renders
**Then** after the citation comes a raised box headed «Omformuleringsforslag» holding the suggestion and a small «Kopier», followed by the hedge line «Linjen din dekker trolig dette – vurder å ta det med.»
**And** there is no "add to CV" action anywhere

**Given** «Kopier» in a suggestion box
**When** it is pressed
**Then** only the suggestion's plain text is copied, with the same feedback as the Letter's copy button

**Given** a Rewordable gap whose suggestion was discarded
**When** it renders
**Then** the box is replaced by «Ingen forslag her. Vurder selv om og hvordan du vil formulere det.», and the citation stays

**Given** `features.rewording` is on
**When** phase 2 runs
**Then** the progress line reads «Skriver gapanalyse, omformuleringer og søknadsbrev … dette tar under ett minutt.»

### Story 5.4: Switch on suggestions and run the first live checklist

As the product owner,
I want suggestions on by default, and the first full checklist run done while there is still time to fix the prompts,
So that the 3 December decision rests on real evidence.

**Covers:** FR-16, FR-17, SM-3, SM-5, PRD §9.2, PRD §5.2 (3 December decision point), AD-4
**Code:** `FEATURE_DEFAULTS.rewording = true` in `config.ts`; extends `scripts/qa-compare.ts` with G4; `docs/qa/` rows and live outputs

**Acceptance Criteria:**

**Given** `FEATURE_DEFAULTS`
**When** this story is merged
**Then** `rewording` is on by default, and the Example pair's UJ-1 Playwright run shows its suggestions with «Kopier» and passes the axe scan

**Given** a live run of every Fixture
**When** Helene checks the outputs with the §9.2 checklist (L1–L8, G1–G5, R1–R3)
**Then** each item's pass or fail is recorded in `docs/qa/` with the date, the live outputs are committed next to the results, and `qa-compare.ts` reports G2 failures and the G4 count (expected Rewordable gaps found and shown with a suggestion that passed FR-17)

**Given** a failure on L2, G1, G2 or R1
**When** it is found
**Then** the prompt is fixed, its `PROMPT_VERSION` changes, the Cached responses are re-recorded, and the Fixture is run again

**Given** the decision point on 3 December
**When** it is assessed
**Then** `docs/qa/` records whether the automated tests for FR-13 to FR-17 pass and one live Fixture run has no G2 or R1 failures
**And** if not, 4–11 December is used to finish S4 and S5, S6 + S7 are dropped (cut 1), and the cut is logged in PRD §11

## Epic 6: Come back to saved work, stored encrypted

The Student registers once, keeps the CV in Profil, and finds every Application in Historikk to reopen, copy and download. Everything personal is encrypted at rest, and each Student sees only their own data. The Examiner logs in as the seeded test user. Stories 6.1–6.11 are built behind `FEATURE_ACCOUNTS`, which Story 6.12 switches on; nothing about a Student is written to disk until Story 6.1's encryption exists.

### Story 6.1: Encrypt personal fields with one key

As a Student,
I want everything personal the app stores to be encrypted,
So that someone who opens the database can't read my CV or my letters.

**Covers:** FR-22 (encryption), NFR-7, AD-3 (hosted key check), AD-11, AD-17 (setup)
**Code:** creates `src/shared/server/crypto.ts` (`initCrypto`, `encryptedText`, `encryptedJson` as Drizzle column types), the `local_meta` table and its migration; extends `db.ts`, `config.ts` and `scripts/setup.ts`

**Acceptance Criteria:**

**Given** `crypto.ts`
**When** a value is encrypted
**Then** it uses AES-256-GCM through `node:crypto` with the 32-byte `ENCRYPTION_KEY`, and stores `v1.<iv>.<tag>.<ciphertext>` in base64url
**And** `encryptedJson` stores `{ contractVersion, data }` inside the ciphertext only

**Given** `db.ts`
**When** it first opens
**Then** it calls `initCrypto(config.encryptionKey)`, `crypto.ts` never imports config, and `encryptedText` throws if used before `initCrypto`

**Given** a tampered ciphertext or the wrong key
**When** it is decrypted
**Then** decryption fails, and a section that fails to decrypt or parse becomes unavailable without failing the whole query (unit-tested)

**Given** `SECRETS_FILE` (the first local secret arrives in this story)
**When** setup finds a local secret missing
**Then** it writes it with flag `wx`, never overwrites an existing value, re-reads the file on `EEXIST`, and does this only behind the Story 1.3 production guard
**And** with `APP_ENV=local` outside a test run, config merges `SECRETS_FILE` (dotenv format) under `process.env`, `process.env` wins, and a test run ignores the file

**Given** a local run
**When** setup runs
**Then** it creates `ENCRYPTION_KEY` in `SECRETS_FILE` if missing, stores `sha256(ENCRYPTION_KEY)` in `local_meta` on first start, and on a later start with a different key stops with "the key doesn't match this database: run `docker compose down -v` and delete `.data/`"
**And** config never invents a key, and with accounts on and no key the local run stops and says to run setup

**Given** `APP_ENV=hosted` with accounts on
**When** `ENCRYPTION_KEY` is missing
**Then** startup fails

### Story 6.2: Register, log in and log out through the API

As a Student,
I want an account with my name, email and password, and a session that ends when I'm away,
So that only I can reach my saved work.

**Covers:** FR-18 (API), FR-19, FR-22 (passwords, name), FR-31 (code at registration), NFR-7, AD-10, AD-11, AD-12
**Code:** creates `identity/server/{schema.ts (students, sessions), sessions.ts, passwords.ts}`, `profile/{contracts.ts, index.ts, server/schema.ts (profiles)}` and their migrations, `src/app/api/auth/{register,login,logout}/route.ts`, `src/app/api/session/{route.ts, renew/route.ts}`; extends `proxy.ts` and `handle()` with session lookup

**Acceptance Criteria:**

**Given** `POST /api/auth/register` with name, email and password
**When** the input is valid
**Then** `identity.createStudent(tx)` and `profile.createProfile(tx, name)` run in one transaction, the email is stored lower-cased in plain text, the password as `scrypt$N$r$p$salt$hash` with a random 16-byte salt, and the name only in `profiles.name`, encrypted
**And** a password under 8 characters or an email already registered gives a field error

**Given** the Hosted version
**When** someone registers
**Then** the Access code is required and checked at registration, and the `/tilgang` gate no longer applies once accounts are on

**Given** `POST /api/auth/login`
**When** the email and password match
**Then** an opaque 32-byte token is set in `ja_sid` (httpOnly, SameSite=Lax, Secure when hosted), and the database stores only its SHA-256
**And** a wrong email or password gives one field error that doesn't say which was wrong

**Given** an authenticated request
**When** it is handled
**Then** the response carries `X-Session-Expires-At`, the session is extended at most once every 5 minutes, and after 30 minutes without activity it has expired and Student routes return 401 `SESSION_EXPIRED`
**And** `POST /api/session/renew` always extends it, and `GET /api/session` returns `SessionView { studentId, name, email, noticeVersion, expiresAt }`

**Given** `POST /api/auth/logout`
**When** it is called
**Then** the session row is deleted

**Given** any repository function
**When** it reads or writes a Student's rows
**Then** it takes `studentId` from the session as its first parameter, never from the body or the URL, and looks rows up by `(id, studentId)`

### Story 6.3: Keep my CV in Profil

As a Student,
I want to upload or paste my CV once and correct it in Profil,
So that every new Application uses it without another upload.

**Covers:** FR-20, FR-3 (Profil), FR-1, FR-2, FR-23 (only the confirmed text stored), NFR-2, AD-10, AD-16, UX-DR21, UX-DR41
**Code:** creates `src/app/profil/`, `profile/{server/repository.ts, ui/}`, `src/app/api/profile/route.ts` (GET/PUT); reuses the `cv/ui` CV input and file picker, `/api/cv/extract`, catalogue heading, button, skeleton rows

**Acceptance Criteria:**

**Given** a logged-in Student
**When** Profil opens
**Then** the `h1` reads «CV · {navn}», the name is read-only, skeleton rows show while it loads, and the CV text field holds the saved text or, the first time, the placeholder «Lim inn CV-teksten din» with «Lagre» unavailable and its hint

**Given** an upload or a paste in Profil
**When** the text is extracted or pasted
**Then** it fills the CV text field for correction, with the two-column hint, and the scanned-PDF state works as on Søknad

**Given** «Lagre»
**When** it is pressed with valid text
**Then** `PUT /api/profile` replaces the old CV text (encrypted), «Lagret.» appears next to the button and is announced, and the uploaded file is never stored

**Given** another Student's session
**When** it requests this Profile
**Then** it can't read it (covered by the FR-19 tests)

### Story 6.4: Register and log in on screen

As a Student,
I want simple registration and login pages,
So that I can start an account or come back to mine.

**Covers:** FR-18, FR-22 (trust line), FR-31, NFR-2, AD-12, AD-16, UX-DR5 (after-S6 nav), UX-DR10, UX-DR33, UX-DR34 (Hjem button), UX-DR40
**Code:** creates `src/app/registrer/`, `src/app/logg-inn/`, `identity/ui/`; extends the app bar with the logged-out and logged-in item sets, and Hjem's button target; reuses text field, password toggle, button, link, `api-client`

**Acceptance Criteria:**

**Given** «Registrer deg»
**When** it renders
**Then** it has «Navn» (`autocomplete="name"`), «E-post» (`type="email"`), «Passord» (`autocomplete="new-password"`, hint «Minst 8 tegn. Velg et passord du ikke bruker andre steder.», «Vis» / «Skjul»), «Tilgangskode» only on the Hosted version, the trust line «CV-en din og dokumentene som lages, lagres kryptert.» and the link «Har du allerede en konto? Logg inn»
**And** a successful registration logs the Student in and goes to Profil

**Given** «Logg inn»
**When** it renders
**Then** it has «E-post», «Passord» (`autocomplete="current-password"`) and «Har du ingen konto? Registrer deg», and a successful login goes to Søknad

**Given** a server error such as «Denne e-postadressen er allerede registrert.» or «Feil e-post eller passord.»
**When** it returns
**Then** it is written into the field's error slot, focus moves there, and the email is kept

**Given** accounts on
**When** the app bar renders
**Then** logged out it shows «Hjem · Søknad · Logg inn · Registrer deg», and logged in «Hjem · Søknad · Profil · Historikk · Konto»
**And** Hjem's button goes to «Registrer deg» when logged out and to Søknad when logged in, and the before-S6 «Du kan prøve med eksempelet først …» line is gone

**Given** a logged-out Student
**When** they open Søknad, Profil, Historikk or Konto
**Then** they are sent to «Logg inn»

### Story 6.5: Warn before the session ends, and keep my work if it does

As a Student,
I want a warning before I'm logged out for inactivity, and my pasted ad kept if I am,
So that stepping away never costs me what I typed.

**Covers:** FR-18 (expiry, warning, kept input), NFR-2 (WCAG 2.2.1), AD-12, AD-16, UX-DR17, UX-DR44
**Code:** creates `identity/ui/expiry-warning` on the shared dialog; extends `api-client` (`SESSION_EXPIRED` handling) and `client-session.ts` (`cvDraft`, `lastEmail`, `restoredAfterExpiry`)

**Acceptance Criteria:**

**Given** a logged-in Student
**When** two minutes remain before 30 minutes of inactivity, timed from `X-Session-Expires-At`
**Then** an `alertdialog` opens with «Økten din avsluttes snart», «Du blir logget ut om 2 minutter fordi du ikke har gjort noe på en stund. Det du har skrevet, tas vare på.», «Fortsett økten» (primary, initial focus) and «Logg ut»
**And** key, pointer and input events count as activity, and while active the client renews the session at most once every 5 minutes

**Given** the warning
**When** «Fortsett økten» or Esc is pressed
**Then** `POST /api/session/renew` extends the session, the dialog closes and focus returns to where it was

**Given** the AI notice is open
**When** the warning is due
**Then** the warning replaces it, and the AI notice reopens afterwards; never two dialogs at once

**Given** the warning runs out, or any request returns `SESSION_EXPIRED`
**When** `api-client` handles it
**Then** it saves the client session (including `cvDraft`) and goes to «Logg inn» with «Økten din er avsluttet. Logg inn igjen for å fortsette.» and the email prefilled

**Given** the Student logs in again
**When** Søknad or Profil opens
**Then** Søknad restores the Job ad, job title, employer and Tone with «Vi tok vare på stillingsannonsen du limte inn.», and Profil restores the unsaved CV draft with «Vi tok vare på endringene du ikke hadde lagret.»

### Story 6.6: Use my Profile on Søknad

As a Student,
I want Søknad to use the CV in my Profile, sign the Letter with my name, and remember that I accepted the AI notice,
So that a return visit takes only the new ad.

**Covers:** FR-20, FR-3, FR-9 (name in sign-off), FR-12 (file name with name), FR-24 (once per account), FR-25 (per Student), AD-6, AD-13, AD-16, UX-DR26
**Code:** creates `src/app/api/profile/ai-notice/route.ts`, `application/ui` CV disclosure (native `<details>`); extends the phase-2 routes to fill `consent` from `profiles.ai_notice_version` and pass `studentId` to `runAi`; reuses `renderLetter`, `letterFileName`

**Acceptance Criteria:**

**Given** a logged-in Student with a saved CV
**When** Søknad opens
**Then** the CV slot is a collapsed disclosure «CV-tekst fra Profil» with the character count and save date, and opened it shows the text read-only with «Du endrer den i Profil» linking to Profil
**And** the client fills `cvText` from the Profile query; «Bruk eksempelet» overrides it once, without saving to the Profile

**Given** a logged-in Student without a saved CV
**When** Søknad opens
**Then** a notice says «Du har ikke lagt inn CV-en din ennå.» with «Gå til Profil», and submit is unavailable

**Given** a Student who accepted the AI notice once
**When** they submit on any later visit
**Then** it doesn't appear, because `POST /api/profile/ai-notice` stored the version on the Profile, and the server reads consent from there

**Given** AI requests from a logged-in Student
**When** the cap is counted
**Then** the scope is that Student's id, not the installation

**Given** a Letter for a logged-in Student
**When** it is shown, copied or downloaded
**Then** the sign-off is the Profile name, and the file name includes it (`violet-hansen-soknadsbrev-nordic-digital-2026.docx`)

### Story 6.7: Save every Application automatically

As a Student,
I want each Application saved as soon as it has a score, with the AI parts added when they arrive,
So that I never lose a result and never have to press save.

**Covers:** FR-21 (saving), FR-22, NFR-5, AD-8, AD-10, AD-11
**Code:** creates `application/server/{schema.ts (applications), repository.ts}` and its migration; extends `/api/analyses`, `/letter`, `/gaps` and `/letter-check` with the AD-8 write model; `application/core` formats `JA-NNN`

**Acceptance Criteria:**

**Given** phase 1 for a logged-in Student
**When** it succeeds
**Then** it runs `INSERT … ON CONFLICT (id) DO UPDATE` with new `job`, `analysis` and `fingerprint` and cleared AI columns, only where the fingerprint differs and the row belongs to the Student, so a true double submit changes nothing
**And** `seq` is `max(seq) + 1` for the Student under `UNIQUE (student_id, seq)` with a retry on conflict, and `match_score` is written from the score in the same statement

**Given** the stored row
**When** it is inspected
**Then** `job`, `analysis`, `gaps`, `letter` and `letter_check` are encrypted, the CV text is not stored on the Application, and only ids, timestamps, `match_score`, `seq`, revs and `fingerprint` are plain

**Given** the phase-2 routes
**When** they succeed
**Then** the Letter route writes `letter` and increments `letter_rev` on success only, the Gaps route writes `gaps` and increments `gaps_rev`, and the check writes `letter_check` only where both revs match
**And** each route checks that the row `(applicationId, studentId)` exists

**Given** the result screen
**When** the Application is saved
**Then** the heading reads «JA-NNN · {arbeidsgiver}», «Lagret i Historikk som JA-NNN.» appears under it, the phase-2 announcement includes the saved sentence, and the Søknad form heading shows the next number dimmed («JA-003 · Ny søknad») with its lede

### Story 6.8: Find my Applications in Historikk

As a Student,
I want a list of every Application I've made, newest first,
So that I can find an earlier letter quickly.

**Covers:** FR-21 (Historikk), FR-19, NFR-2, NFR-3, UX-DR21, UX-DR31, UX-DR32
**Code:** creates `src/app/historikk/`, `src/app/api/applications/route.ts` (GET, 20 per page with `total`), `application/ui/{catalogue-register, empty-state}`; reuses code strip, copy button, the .docx builder from `letter/ui`, `match/ui` pulse plot (flat), skeleton rows

**Acceptance Criteria:**

**Given** a Student with Applications
**When** Historikk opens
**Then** it shows «Historikk» and «JA-001–JA-002 · 2 søknader, nyeste først», then the register, newest first, 20 per page
**And** each row shows the number, the job title as a link to the Saved Application, the employer, the date, the score sentence and its Verdict strip (so the two Verdicts never differ by colour alone), and «Åpne», «Kopier brev» and «Last ned (.docx)» with entry-specific accessible names

**Given** a laptop width
**When** the register renders
**Then** it is a `<table>` with a hidden caption, `th scope="col"` headers and the job title as `th scope="row"`; at ≤ 640 px it is an `<ol>` instead, and only one of the two is in the accessibility tree

**Given** more than 20 Applications
**When** pagination renders
**Then** `<nav aria-label="Sider">` shows «Forrige» (absent on page 1), «Side 2 av 4» and «Neste» (absent on the last page), and changing page moves focus and announces «Side 3 av 4»

**Given** a Student with no Applications
**When** Historikk opens
**Then** it shows the ghost number «JA-001», «Ingen søknader ennå. Start med din første stillingsannonse.», «Den første søknaden du lager, får nummer JA-001.» and the primary «Lag skreddersydd søknad»

**Given** the app bar
**When** a logged-in Student has Applications
**Then** Historikk shows its entry count

**Given** Historikk
**When** a Student looks for search, delete or rename
**Then** there is none (D5)

### Story 6.9: Reopen a saved Application

As a Student,
I want to reopen an earlier Application exactly as it was,
So that I can copy or download its Letter again.

**Covers:** FR-21 (reopening), FR-19, FR-10 (stored Tone shown), AD-8, AD-10, UX-DR42, UX-DR45
**Code:** creates `src/app/historikk/[id]/`, `src/app/api/applications/[id]/route.ts`; the page composes the existing `match/ui`, `gaps/ui` and `letter/ui` components in read-only mode, adding none of its own

**Acceptance Criteria:**

**Given** a Saved Application
**When** it opens
**Then** it shows the stored Reflection Note and Letter read-only, with «Kopier» and «Last ned (.docx)», the catalogue heading and a sequence nav to the previous entry and «Historikk»
**And** there is no «Lag nytt utkast», and nothing is regenerated
**And** the credits list shows the Tone stored with the latest Letter, equal to the Tone it was written in (FR-10)

**Given** a section that was never generated
**When** it renders
**Then** it shows the notice «Ikke laget.», hidden when that feature is off

**Given** a Letter saved without a matching check
**When** it renders
**Then** it shows «Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.»

**Given** another Student's Application id, or one that doesn't exist
**When** it is requested by URL or by API
**Then** both get the same Ikke funnet page or `NOT_FOUND`

### Story 6.10: See my account and log out

As a Student,
I want to see my email, how my data is stored, and a way to log out,
So that I know what the app keeps and can leave safely.

**Covers:** FR-18 (logout), FR-21 (Konto), FR-23 (storage note), AD-16, UX-DR18 (stacked credits), UX-DR43
**Code:** creates `src/app/konto/`, `identity/ui/account`; reuses credits list, button, `client-session.ts`

**Acceptance Criteria:**

**Given** a logged-in Student
**When** Konto opens
**Then** it shows the title, «E-post» and «Katalog» (entry count) as stacked credits, «Logg ut», and «Slik lagres dataene dine» with the four lines about encryption, what is stored and when it is deleted
**And** there is no password change and no account deletion

**Given** «Logg ut»
**When** it is pressed
**Then** the session ends at once with no confirmation, the Student lands on Hjem logged out, and the client session is cleared except the Job ad, job title, employer and Tone (the CV draft is cleared too)

### Story 6.11: Seed the local test user

As the Examiner,
I want a ready-made test user after setup,
So that I can log in and see a saved Profile without registering.

**Covers:** FR-29, NFR-9, AD-12, AD-17
**Code:** creates `seedTestUser` (owned by `identity` and `profile`), called from `scripts/setup.ts` and from `db.ts` under `E2E=1`

**Acceptance Criteria:**

**Given** accounts on, `APP_ENV=local` and a local `DATABASE_URL` host
**When** setup runs
**Then** it creates the test user named in the README with `INSERT … ON CONFLICT DO NOTHING`, and upserts its Profile CV from the Example pair on every run

**Given** any other environment, including the Hosted version
**When** setup runs
**Then** no test user is created

**Given** Playwright with `E2E=1`
**When** the web server starts
**Then** the same seed runs on PGlite, so the end-to-end tests can log in

### Story 6.12: Switch on accounts

As the Examiner,
I want accounts, Profil and Historikk on in every run, with privacy and encryption proven by tests,
So that the full v1 is what I grade.

**Covers:** FR-19, FR-22 (database inspection), FR-29, FR-31, NFR-7, NFR-9, AD-4 (flag default), AD-17 (CI smoke login)
**Code:** `FEATURE_DEFAULTS.accounts = true` in `config.ts`; Vercel `ENCRYPTION_KEY`; extends `scripts/smoke.mjs`; README; `docs/qa/` rows

**Acceptance Criteria:**

**Given** `FEATURE_DEFAULTS`
**When** this story is merged
**Then** `accounts` is on by default, and no `compose.yaml`, `.env.example` or README sets `FEATURE_ACCOUNTS`

**Given** two Students
**When** the FR-19 test suite runs
**Then** neither can read or list the other's Profile or Applications through any route, by guessed ids or URLs, and every such request gets `NOT_FOUND`

**Given** a database with a registered Student and a saved Application
**When** the FR-22 test reads the raw rows
**Then** none of name, CV text, Job ad, job title, employer, keyword lists, Evidence, Gaps, suggestions or Letter appears in plain text, and no password appears in any form other than its hash

**Given** CI
**When** the smoke run starts the `app` container
**Then** `scripts/smoke.mjs` checks `/api/health` and logs in as the seeded user

**Given** Playwright with accounts on by default
**When** the account flows run end to end
**Then** registration, login, Profil, Søknad with the Profile CV, Historikk (empty and with entries), a Saved Application, Konto, logout and the expiry warning (with a shortened timeout in the test) each pass, and every one of those screens passes the axe scan at 1280 px and 360 px

**Given** the Hosted version
**When** accounts go live
**Then** `ENCRYPTION_KEY` is set in Vercel's Production environment, registration asks for the Access code, `/tilgang` is no longer shown, and UJ-1 and UJ-2 are walked through on it and recorded

**Given** the README
**When** this story is merged
**Then** it names the local test user's email and password, and UJ-1 with accounts is recorded as walked through in `docs/qa/`

## Epic 7: Hand in a gradable app (never cut)

The Examiner can run the delivered app from the README alone on a clean machine, try it live on the Hosted version, and trace every feature to a requirement, with the QA evidence and the planning documents matching what was built. This epic is the final period, 12–15 December, which the PRD says is never compressed.

### Story 7.1: Record the final checklist runs

As the Examiner,
I want three checked live runs per Fixture of the final prompts,
So that I can see the app doesn't invent qualifications, and that its suggestions are useful.

**Covers:** SM-3, SM-5, SC4, SC5, SC6, FR-27 (final Cached responses), PRD §9.2
**Code:** `docs/qa/` results and live outputs; `scripts/record-cached.ts` and `scripts/qa-compare.ts` reused

**Acceptance Criteria:**

**Given** the final prompt versions
**When** every Fixture is run live three times
**Then** each run is checked against L1–L8, G1–G5 and R1–R3, with pass or fail and the date in `docs/qa/`, and the live outputs are committed next to the results

**Given** the results
**When** they are summarised
**Then** L2 and G2 have zero failures in all runs, every Integrity guard test passes, and SM-5 is at least 70 % across all Fixtures; any failure leads to a prompt fix and a new set of three runs

**Given** the final prompts
**When** the Cached responses are re-recorded for the last time
**Then** the Example pair's Cached responses come from a live run of the final prompts, labelled with provider, model, prompt version and date, and CI's prompt-version check passes

### Story 7.2: Check timing, accessibility and language on the finished app

As the Examiner,
I want the finished app measured for speed, accessibility and language,
So that the quality claims in the PRD are backed by records.

**Covers:** NFR-1, NFR-2, NFR-3, NFR-4, SM-7, SM-8, PRD §9.3, UX-DR47
**Code:** `docs/qa/` rows only, plus fixes found by the checks

**Acceptance Criteria:**

**Given** each Fixture
**When** five timed runs are made
**Then** the score appears within 2 s in every run and the AI sections within 60 s in at least 4 of 5, recorded in `docs/qa/`

**Given** every screen (Hjem, Registrer deg, Logg inn, Profil, Søknad with results, Historikk, Saved Application, Konto, Ikke funnet; Tilgangskode if still in use)
**When** the axe scan and a contrast tool check them, including non-text contrast
**Then** there are 0 serious or critical findings, and the contrast check passes

**Given** UJ-1
**When** it is walked through using only the keyboard, and once on a real phone (including upload, «Kopier» and the .docx download)
**Then** both walks pass and are recorded

**Given** the Fixture with English terms
**When** all interface text is checked for language
**Then** it is bokmål throughout, follows the voice rules, and the limit that quoted ad lines aren't language-tagged is noted in `docs/qa/`

### Story 7.3: Finish the README and do a clean-machine dry run

As the Examiner,
I want a README that gets me from a fresh clone to a running app in 15 minutes,
So that I can grade runnability without asking anyone for help.

**Covers:** NFR-9, SM-4, FR-23 (course-end deletion), FR-29, FR-30
**Code:** `README.md`; `docs/qa/` dry-run record

**Acceptance Criteria:**

**Given** the README
**When** it is finished
**Then** it covers what the app does and who it is for (with a screenshot), Docker as the one prerequisite (with the tested version), the three commands, the environment variables and how to run with a live AI key, UJ-1 and UJ-3 and the local test user, the Hosted URL (the Access code comes with the submission), an overview of the folders, and links to the brief (marked as the approved proposal), the PRD and its §11, the UX documents, the architecture, the epics, `docs/qa/` and the session logs
**And** it says that all stored Student data is deleted when the course ends, and that the Hosted version and its database are taken down after grading

**Given** a clean machine (a fresh virtual machine, a sandbox or a classmate's computer)
**When** someone follows only the README
**Then** the app runs in Test mode within 15 minutes, prerequisites included, and the test suite passes with one command
**And** the run is done on Windows and on one of macOS or Linux, and recorded in `docs/qa/` with who did it and any limitation

### Story 7.4: Clean the repository and scan for secrets

As the Examiner,
I want a tidy repository with no secrets in its history,
So that the code reads as one coherent project.

**Covers:** NFR-7, NFR-11, PRD §5.2 (repository clean-up)
**Code:** repository-wide clean-up

**Acceptance Criteria:**

**Given** the repository and its full history
**When** a secret scanner runs
**Then** it finds no secrets, and the result is recorded in `docs/qa/`

**Given** the code
**When** it is reviewed for NFR-11
**Then** Biome passes, the folder and module structure matches the architecture spine, and there is no dead code, no duplicated file and no commented-out remains of earlier AI attempts

**Given** the planning folders
**When** they are cleaned
**Then** the UX `.working/` folder and other working files are removed or archived, and `keep-alive.yml` is confirmed enabled for the grading period

### Story 7.5: Match every planning document to the delivered app

As the Examiner,
I want the PRD, UX, architecture and epics to describe what was actually built,
So that I can trace every feature to a requirement and every change to a reason.

**Covers:** NFR-10, PRD §5.2 (final period), PRD §11, addendum §6.2, FR-30, FR-31
**Code:** planning documents and `docs/qa/` only

**Acceptance Criteria:**

**Given** each planning document
**When** it is checked against the delivered app
**Then** every assumption and open question is closed or resolved, every cut and the FR-5b outcome are logged in PRD §11 with the criteria they leave undelivered, and each change is committed with a message naming the changed IDs

**Given** `docs/qa/`
**When** the evidence is completed
**Then** it holds the index of AI-steering examples linked to session logs and commits, the bugs found in AI-generated code and how each was fixed, and screenshots or a short recording of one live run

**Given** the final commit on `main`
**When** it deploys
**Then** the Hosted version answers at its URL, the Access code is ready to hand over with the submission (never committed), and the keep-alive job keeps the database awake through grading
