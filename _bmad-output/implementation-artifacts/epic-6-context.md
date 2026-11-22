# Epic 6 Context: Come back to saved work, stored encrypted

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The Student registers once, keeps the CV in Profil, and finds every Application in Historikk to reopen, copy and download. Everything personal is encrypted at rest and each Student sees only their own data, so an opened database reveals nothing readable. The Examiner logs in as a seeded local test user. Stories 6.1-6.11 are built behind `FEATURE_ACCOUNTS`; the last story switches it on. Nothing about a Student is written to disk until encryption (Story 6.1) exists.

## Stories

- Story 6.1: Encrypt personal fields with one key
- Story 6.2: Register, log in and log out through the API
- Story 6.3: Keep my CV in Profil
- Story 6.4: Register and log in on screen
- Story 6.5: Warn before the session ends, and keep my work if it does
- Story 6.6: Use my Profile on Søknad
- Story 6.7: Save every Application automatically
- Story 6.8: Find my Applications in Historikk
- Story 6.9: Reopen a saved Application
- Story 6.10: See my account and log out
- Story 6.11: Seed the local test user
- Story 6.12: Switch on accounts

## Requirements & Constraints

- Registration takes name, email and password (min. 8 characters, email unique). Sessions end after 30 minutes of inactivity; the Student is warned 2 minutes before and can continue with one click. A pasted Job ad and unsaved CV corrections survive expiry.
- Privacy: every stored record belongs to one Student. Another Student's ids or URLs, and ids that don't exist, get the same NOT_FOUND. Covered by automated tests.
- Encrypted in the database: name, CV text, Job ad, job title, employer, keyword lists (the `analysis` column), Evidence, Gaps, suggestions, Letter. Plain only: email (lower-cased), ids, timestamps, `match_score`, `seq`, revs, `fingerprint`, `ai_notice_version`. Passwords only as slow salted hashes. A test reads raw rows and must find none of the encrypted fields in plain text.
- Store as little as possible: uploaded files are discarded after extraction; only confirmed CV text is stored, on the Profile and never on an Application. No prompt content in logs.
- Profile CV replaces the old text on each save and is used by default for new Applications; with none saved, Søknad asks for it and submit is unavailable.
- The AI notice is shown once per account (not per browser session). The Daily cap counts per Student id once accounts are on.
- History is minimal: newest first, 20 per page, no search, delete or rename. Konto has no password change and no account deletion. Hjem shows no recent list.
- The trust line «CV-en din og dokumentene som lages, lagres kryptert.» appears only once encryption is real.
- The Hosted version stays frozen with accounts off and no `ENCRYPTION_KEY` (D23); no Student data is stored there. The Access-code-at-registration rule is verified by unit tests only (`gateDecision`, registration route with `hosted: true`).
- All Student-facing text is bokmål. Screens must pass axe at 1280 px and 360 px.

## Technical Decisions

- Crypto: AES-256-GCM via `node:crypto`, one 32-byte base64 `ENCRYPTION_KEY`, stored as `v1.<iv>.<tag>.<ciphertext>` (base64url). Personal fields go only through `encryptedText` / `encryptedJson` Drizzle column types in `shared/server/crypto.ts`. `encryptedJson` holds `{ contractVersion, data }` inside the ciphertext; owning repositories parse `data` per version, and a section that fails to decrypt or parse becomes unavailable without failing the query.
- `crypto.ts` never imports config; `db.ts` calls `initCrypto(config.encryptionKey)` on first open; use before init throws.
- Local key handling: setup writes missing secrets to `SECRETS_FILE` with flag `wx` (never overwrites, re-reads on `EEXIST`, behind the production guard). With `APP_ENV=local` outside tests, config merges that dotenv file under `process.env` (env wins; tests ignore it). Config never invents a key. `sha256(ENCRYPTION_KEY)` goes in one-row `local_meta`; a later mismatch stops with the «docker compose down -v and delete .data/» message. Hosted with accounts on and no key fails startup.
- Sessions are hand-built, no auth library: opaque 32-byte token in cookie `ja_sid` (httpOnly, SameSite=Lax, Secure when hosted); only its SHA-256 is stored. Extended at most every 5 minutes by requests; `POST /api/session/renew` always extends. Every authenticated response carries `X-Session-Expires-At`, and the client times the warning from it. Expired: 401 `SESSION_EXPIRED`. `GET /api/session` returns `SessionView` (TanStack Query key `['session']`).
- Passwords: scrypt, random 16-byte salt, stored `scrypt$N$r$p$salt$hash`.
- Table ownership: `identity` owns `students`, `sessions`; `profile` owns `profiles` (name, CV text, `ai_notice_version`); `application` owns `applications`. The name lives only in `profiles.name`. Registration runs `identity.createStudent(tx)` and `profile.createProfile(tx, name)` in one transaction. Repository functions take `studentId` from the session as first parameter (never body or URL) and look up by `(id, studentId)`.
- Application write model: client-generated `applicationId` (UUID, reused until inputs change). Phase 1 is `INSERT … ON CONFLICT (id) DO UPDATE` only where `fingerprint` differs and the row belongs to the Student, clearing AI columns, so double submit is a no-op. `seq` = `max(seq)+1` per Student under `UNIQUE (student_id, seq)` with retry; `match_score` is written in the same statement; `application/core` formats `JA-NNN`. Letter route writes `letter` and bumps `letter_rev` on success only; Gaps route writes `gaps` and bumps `gaps_rev`; the check writes `letter_check` only where both revs match. Each phase-2 route verifies the `(applicationId, studentId)` row exists.
- Reopening is a read-only snapshot: no regeneration; a `null` section shows «Ikke laget.» (hidden when its feature is off); a Letter without a matching check shows the "not checked" notice.
- Persistence conventions: every `student_id` is `uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE`; migrations generated on a branch rebased on `main` just before merge, applied only via `scripts/migrate.ts`; tests use PGlite in memory; use Drizzle's query builder and cast aggregates (`count(*)::int`).
- Client state: one `sessionStorage` key `ja.session.v1` via `shared/ui/client-session.ts` only. Logout clears everything except job ad, job title, employer and tone. On `SESSION_EXPIRED`, `api-client` saves state (including `cvDraft`) and goes to Logg inn with email prefilled. With accounts on, Søknad takes CV text from the Profile query; `inputs.cvText` is only a one-off «Bruk eksempelet» override, never saved to the Profile.
- AI pipeline: `runAi` ctx gets `studentId` and `consent` from `profiles.ai_notice_version`.
- Gate: after accounts, `proxy.ts` no longer applies the `/tilgang` gate; the Access code is checked at registration, hosted only. `gateDecision` is a pure function in `identity/core`.
- Test user: `seedTestUser` (owned by `identity` and `profile`) runs only with accounts on, `APP_ENV=local` and a local DB host (`db`, `127.0.0.1`, `localhost`), and under `E2E=1` on PGlite. It upserts the Profile CV from the Example pair every run; credentials are named in the README.
- Flag: `FEATURE_ACCOUNTS` default lives only in `FEATURE_DEFAULTS` (`config.ts`); no `compose.yaml`, `.env.example` or README sets it.

## UX & Interaction Patterns

- Profil: `h1` «CV · {navn}», read-only name, skeleton rows while loading, CV field with placeholder «Lim inn CV-teksten din» and «Lagre» unavailable until valid; «Lagret.» announced after save. Reuse the existing CV input, file picker and extraction.
- Registrer / Logg inn: server errors go in the field's error slot, focus moves there, email kept; the login error never says which of email or password was wrong. Registration success goes to Profil, login to Søknad.
- App bar: logged out «Hjem · Søknad · Logg inn · Registrer deg»; logged in «Hjem · Søknad · Profil · Historikk · Konto» (Historikk shows entry count). Logged-out visits to Student pages redirect to Logg inn.
- Expiry warning is an `alertdialog` on the shared dialog («Fortsett økten» primary, initial focus; Esc continues). It replaces the AI notice if both are due, never two dialogs at once. Key, pointer and input events count as activity.
- Søknad with a Profile: collapsed `<details>` «CV-tekst fra Profil», read-only, linking to Profil. The result heading reads «JA-NNN · {arbeidsgiver}» with «Lagret i Historikk som JA-NNN.»; the form heading shows the next number dimmed.
- Historikk: table with hidden caption at laptop width, `<ol>` at ≤ 640 px (only one in the accessibility tree); each row has the score sentence plus Verdict strip, and entry-specific accessible names on «Åpne», «Kopier brev», «Last ned (.docx)». Pagination `nav aria-label="Sider"` announces page changes. Empty state with ghost «JA-001».
- Reopened Application and Konto reuse existing catalogue heading, credits list and `match/ui`, `gaps/ui`, `letter/ui` components in read-only mode; add no new ones. Logout is immediate, no confirmation.

## Cross-Story Dependencies

- 6.1 first: nothing personal may be stored before it. 6.2 needs 6.1 (encrypted name, `identity`/`profile` tables); 6.3, 6.4, 6.5 and 6.6 need 6.2; 6.6 needs 6.3; 6.5 uses 6.4's login redirect; 6.7 needs 6.2 and 6.6 (`studentId` into the AI routes); 6.8 and 6.9 need 6.7; 6.10 needs 6.4; 6.11 needs 6.2 and 6.3; 6.12 needs all of them.
- Builds on earlier epics: the phase-1/phase-2 routes and `handle()`, `runAi`, `renderLetter` / `letterFileName` and the .docx builder, `api-client`, the shared dialog and AI notice, `client-session.ts`, `proxy.ts` gate, the Docker Compose setup and `scripts/smoke.mjs`, and Fixtures (Example pair).
- 6.12 ends the epic: flips the flag, runs the FR-19 two-Student suite, the FR-22 raw-row inspection, CI smoke login as the seeded user, and Playwright account flows with a shortened expiry timeout; UJ-1 and UJ-2 are walked through on the local Docker app and recorded in `docs/qa/`.
- Feeds Epic 7 (traceability, final checklist runs and README).
