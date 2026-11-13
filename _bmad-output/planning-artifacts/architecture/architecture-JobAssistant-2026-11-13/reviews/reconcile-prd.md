# Reconcile: spine vs PRD and addendum

- **Spine:** `../ARCHITECTURE-SPINE.md` (2026-11-13, draft)
- **Inputs:** `prds/prd-JobAssistant-2026-10-31/prd.md` (updated 2026-11-13), `addendum.md` (§2, especially §2.3–§2.5 and §2.8)
- **Lens:** load-bearing gaps only. A finding is something two independent story builders could build incompatibly while the spine is silent, or a PRD constraint the spine contradicts. Correct deferrals (provider, FR-5b outcome, vocabulary, prompt wording, .docx location, key rotation) are not findings.

**Verdict:** The spine covers the PRD well: every FR/NFR has a home, and the privacy, EU region, Access code, Daily cap and build-order flags are pinned down. One critical gap remains: the FR-5b branch contradicts AD-6, even though the spine says it is covered. Seven high findings are about how phase-2 inputs are identified and reused (pairHash, CV text after accounts, idempotency, refresh) and about four quiet constraints (NFR-9 one test command, FR-23 logging, FR-15 verbatim, FR-18 warning timing).

| Tier | Count |
|---|---|
| Critical | 1 |
| High | 7 |
| Medium | 6 |
| Low | 6 |

---

## Critical

### C1. FR-5b contradicts AD-6's no-AI phase 1, and the spine says the decision is already covered
- **What's wrong:** AD-6 makes phase 1 (`POST /api/analyses`) synchronous "with no AI". The Deferred table says AD-5, AD-9 and AD-13 "already cover both outcomes" of FR-5b. But if FR-5b applies, a new Job ad needs one Keyword AI request *before* scoring. The spine doesn't say:
  - which endpoint makes that request (phase 1 itself, or a phase 0 like `POST /api/keywords`);
  - that it goes through `runAi`, so the FR-24 notice (with its changed wording), the Daily cap and logging apply. FR-26 doesn't apply because only the Job ad is sent;
  - what `AnalysisResult` carries when the code-only list is used as a fallback. FR-25 (cap reached), FR-27 (Test mode, new ad) and a declined notice all require the score to be "marked as less precise", and no contract field exists for that;
  - whether `fingerprint` includes the Keyword source, since the saved list and the code list give different scores for the same inputs.

  FR-5b is decided on 17 Nov, four days out. The phase-1 story (Epic 2) and the AI-pipeline story (Epic 3) would each invent their own version.
- **PRD ref:** FR-5b (rules + "What changes" table: FR-8/NFR-4, P6/NFR-8, FR-24, FR-25, FR-27, NFR-6); P2; FR-24 consequences.
- **Suggested fix:** In AD-6, add: "If FR-5b applies, phase 1 calls `KeywordSource.resolve(jobAd, ctx)`. On a cache miss it makes one `runAi('keywords', …)` request (notice → cap → log). When the notice is missing, the cap is reached, or the mode is Test mode, it falls back to the code list. `AnalysisResult.keywordSource: 'code' | 'saved' | 'code-fallback'` drives the 'less precise' note, and `fingerprint` includes `keywordSource`." Then remove "already cover both outcomes" from the Deferred table, or narrow that claim.

---

## High

### H1. NFR-9 asks for one test command; the spine splits it in two and leaves out the Playwright browser download
- **What's wrong:** The environment table says "`npm test` runs Biome, tsc, Vitest; `npm run e2e` runs Playwright". NFR-9 says "One command runs all automated tests, and they all pass on the delivery commit". §9.1 counts the UJ-1 end-to-end run and the axe scan as automated tests. Playwright also needs a browser binary download, which is a hidden extra prerequisite step on the 15-minute clean-machine dry run. The spine doesn't say where `playwright install` happens.
- **PRD ref:** NFR-9 (one command; prerequisites; 15 min), §9.1, NFR-2 Verify (axe), UJ-3 step 4, SM-4.
- **Suggested fix:** Make `npm test` the single entry point: Biome → tsc → Vitest → Playwright in Test mode. Have `npm run setup` run `playwright install chromium` (one browser only), and time it in the dry run.

### H2. The Cached-response lookup key clashes with contact stripping and PDF extraction
- **What's wrong:** AD-15 says the `cached` adapter looks responses up by `pairHash` of the normalised CV text and Job ad. AD-13 runs `stripContactDetails` (step 3) *before* the adapter call (step 4), so the adapter receives stripped text. If the Fixtures' `pairHash` is recorded from raw text, every lookup misses, and Test mode (UJ-3, SC8) breaks for a CV that contains an email or phone number. The spine also doesn't define "normalised" for `pairHash`. Addendum §2.5 says case and whitespace only, but `unpdf` output from `cv.pdf` usually differs from `cv.txt` in other ways too: bullets, ligatures, hyphenation and line joins. FR-27 says the PDF, the TXT and «Bruk eksempelet» must reach the same entry.
- **PRD ref:** FR-27 (bullets 2–3), FR-26, addendum §2.5 (last bullet), UJ-3.
- **Suggested fix:** In AD-15, add: "`pairHash = sha256(normaliseForCache(cvText) + '\n' + normaliseForCache(jobAd))`, computed in `runAi` on the *unstripped* confirmed text and passed to the adapter. `normaliseForCache` (in `shared/core/hashing`) lowercases, collapses all whitespace, and strips bullets and soft hyphens. A test asserts that `cv.pdf`, `cv.txt` and the button give the same hash."

### H3. Double submit, phase-2 duplicates and refresh during the AI phase are not closed
- **What's wrong:**
  - AD-8 creates `applicationId` "once per submit". A double-click is two submits, so it gets two ids and two Applications. That is the exact case NFR-5 names.
  - Idempotency covers phase 1 only. A repeated `/letter` or `/gaps` POST (double-click on retry, or remount) makes a second AI request and reserves the cap a second time. NFR-5 says "one set of AI requests".
  - `ja.session.v1` (AD-16) has no `applicationId` and no phase state, so after a refresh during the AI phase each builder decides alone whether to re-submit (new AI requests and cap use), restore, or show nothing. After accounts, the first function keeps running and writes its column anyway.
- **PRD ref:** NFR-5 (bullets 2–3), §9.3 wrong-input tour ("double-clicks submit and refreshes the page during the AI phase"), FR-25.
- **Suggested fix:** In AD-8, create the id when the inputs are confirmed (it is reused until they change), and disable submit while a request is in flight. Phase-2 endpoints skip the request when their column is already filled or in progress (after accounts: a `*_status` marker; before accounts: a single in-flight mutation per id). In AD-16, store `applicationId` in `ja.session.v1`; after a refresh the client re-reads the Application (after accounts) or shows the inputs with a re-run prompt (before accounts), and never re-fires phase 2 automatically.

### H4. Where does phase 2 get the CV text once accounts exist? AD-6 and AD-8 disagree
- **What's wrong:** AD-6 says that after accounts "the server loads [inputs] by `(id, studentId)`". But the Application row (AD-8: `analysis`, `gaps`, `letter`, `letter_check`; FR-21's list) stores no CV text, and FR-23 and D12 discourage a copy. AD-8 also says "The server never rebuilds inputs from storage to regenerate", which reads as the opposite of AD-6. `/letter`, `/gaps`, `/letter-check` (FR-11 scans the CV text for Upgrade words) and «Lag nytt utkast» all need the CV text. One builder will read it from the current Profile, another will store it on the Application, a third will send it from the client.
- **PRD ref:** FR-20 ("A new Application uses the Profile's CV text"), FR-21 (stored fields), FR-11, FR-12, FR-23, AD-6/AD-8 conflict.
- **Suggested fix:** In AD-6, add: "After accounts, phase 2 and letter-check read the Job ad from the Application and the CV text from the current Profile, then compare against `fingerprint`. On a mismatch they return `ANALYSIS_STALE`." Reword AD-8: "Reopened Applications offer no regeneration." Keep the read-only snapshot rule.

### H5. FR-23's no-content logging only covers `log()`; error paths and `console` can leak prompts
- **What's wrong:** AD-13 makes `log()` the only logger and has `LogEvent` exclude content. But nothing forbids `console.*`, and nothing says what happens to unknown errors besides mapping to `UNEXPECTED`. The AI SDK's `APICallError` carries `requestBodyValues` (the full prompt, including the CV text) and `responseBody`. Next.js prints unhandled route errors to the Vercel function logs. A builder who writes `console.error(err)` in a catch, or lets the error bubble up, writes prompt content to logs. FR-23 is verified by an automated test.
- **PRD ref:** FR-23 bullet 2 + Verify (Auto: logs), §9.1 ("No prompt content in logs"), addendum §2.3 last bullet.
- **Suggested fix:** In AD-13, add: "Biome `noConsole` is an error outside `shared/server/log.ts`. Every route handler is wrapped by one `handle()` that catches all errors and logs only `{ code, errorName, route }`, never the error object or its message. The FR-23 test asserts that a failed live-adapter call leaves no CV substring in the captured output."

### H6. AD-14 sends every check through `keywords/core`, which loosens FR-15's word-for-word rule
- **What's wrong:** AD-14 says "Every check compares words through `keywords/core` only", and `checkCitation` (FR-15) is in that list. `keywords/core`'s `normalise`/`stem` folds hyphens and spaces, stems, and joins split compounds. A citation like «prosjekt ledelse» would then "match" a CV that says «prosjektledelse», and inflected or invented wording would pass. FR-15 and addendum §2.4 require a *substring* match that ignores only case and whitespace. Stemming is meant for FR-11 and FR-17 (Upgrade-word forms), not for FR-15.
- **PRD ref:** FR-15 bullet 1, Glossary "Evidence citation" (word-for-word), addendum §2.4 (Citations), P1.
- **Suggested fix:** In AD-14, add: "`checkCitation` is a substring test on text normalised for case and whitespace only (`shared/core`), with no stemming, compound or alias rules. FR-11 and FR-17 word comparisons use `keywords/core`."

### H7. The FR-18 two-minute warning can't be timed against a throttled sliding expiry
- **What's wrong:** AD-12 slides the 30-minute expiry but "extends it at most once every 5 minutes", so the real expiry can be up to 5 minutes earlier than last-activity + 30. A client timer started from its own last request then warns *after* the session has already ended. The spine also doesn't say what counts as activity (API calls only? typing in Profil?) or how «continue» extends the session, given the throttle. FR-18 is verified by an automated test, and it is a WCAG 2.2.1 requirement.
- **PRD ref:** FR-18 bullet 3 (warning 2 min before; continue with one click; WCAG 2.2.1).
- **Suggested fix:** In AD-12, add: "Every authenticated response carries `X-Session-Expires-At`. The client schedules the warning from that value. «Fortsett» calls `POST /api/session/extend`, which always extends the session (bypassing the 5-minute throttle). Only server requests count as activity."

---

## Medium

### M1. Tone after «Lag nytt utkast» has no decided home
- **What's wrong:** FR-10 requires the Tone shown to equal the Tone stored, "including after «Lag nytt utkast» and when reopened from History". In the sequence diagram, Tone is sent only on the phase-1 POST, and AD-8's columns don't say whether Tone belongs to `analysis` or to `letter`. If the Student changes Tone before regenerating, one builder stores it with the analysis (and it goes stale), another with the letter.
- **PRD ref:** FR-10 consequence 4, FR-12, FR-27 bullet 3 (Test mode regenerates the cached Letter for the chosen Tone).
- **Suggested fix:** In AD-8, add: "`Letter` contains `tone`. `POST /[id]/letter` takes `tone`, and the UI reads the displayed Tone from `letter.tone` only."

### M2. Cut 2 (S5 off while S4 is on) doesn't say where suggestions are removed
- **What's wrong:** AD-4 says `FEATURE_REWORDING` gates S5 but not *where*. One builder changes the prompt, which changes `promptVersion`, needs a second set of Cached responses, and breaks the AD-15 CI check. Another drops `suggestion` in `gaps/server`. A third hides it only in the UI, so it would still be stored and guarded. The Cached `gaps.json` includes suggestions.
- **PRD ref:** §5.1 cut 2 ("Gaps still cite the supporting CV entry, but without a suggested new phrasing"), FR-16, FR-17, FR-27.
- **Suggested fix:** In AD-4 or AD-14, add: "One gaps prompt and one Cached file. When `features.rewording` is off, `gaps/server` sets `suggestion = null` after FR-15 and skips FR-17. `Gap.suggestion` is nullable in the contract."

### M3. The Letter sign-off (Profile name or placeholder) isn't assigned to anything
- **What's wrong:** FR-9 uses the Profile name in the sign-off, or a visible placeholder before accounts. Addendum §2.3 suggests adding it locally after generation. The spine doesn't say whether the prompt writes a sign-off or `letter/server` appends one, or whether `Letter` keeps the body and the signature apart. The Cached Letters are recorded once but shown to the seeded user and to anonymous users, so a sign-off baked into them shows the wrong name. The .docx file name also needs the name.
- **PRD ref:** FR-9 bullet 4, UJ-1 "Without accounts", addendum §2.3, FR-12 (file name).
- **Suggested fix:** In AD-14 or the `letter` slice line, add: "The prompt forbids a sign-off. `Letter = { body, tone, … }`. The sign-off is rendered (UI and .docx) from `profile.name` or the placeholder key, never stored in Cached responses."

### M4. The `ANALYSIS_STALE` rerun collides with phase-1 idempotency
- **What's wrong:** AD-6 says that on `ANALYSIS_STALE` "the client reruns phase 1 without telling the Student". After accounts, rerunning with the *same* `applicationId` does nothing (`ON CONFLICT DO NOTHING`), so the analysis stays stale and the client loops. Rerunning with a *new* id leaves an orphaned Application in Historikk. The spine doesn't choose.
- **PRD ref:** NFR-5 (one Application per submit), FR-21 (History content), FR-7/NFR-6.
- **Suggested fix:** In AD-6 or AD-8, add: "A stale rerun reuses the id and phase 1 upserts `analysis` and clears the AI columns (`ON CONFLICT (id) DO UPDATE … WHERE student_id = $s`). The client retries at most once."

### M5. The CV upload path (FR-1/FR-23/NFR-7) isn't pinned down
- **What's wrong:** The spine names `unpdf` in `cv` but doesn't say whether extraction runs in the browser or in a route handler. If on the server, it doesn't say that the file stays in memory, that type and 2 MB are checked again on the server (NFR-7: "all input is validated on the server"), or that the file is never written or echoed back. One builder will build `/api/cv/extract` with a temp file, another will extract in the client and send only the text. Those differ in privacy, size handling, and what NFR-7's Auto test checks.
- **PRD ref:** FR-1, FR-23 bullet 1, NFR-7 bullets 4–5, addendum §2.2.
- **Suggested fix:** In the `cv` row or AD-2, add: "`POST /api/cv/extract` takes multipart data, enforces .pdf/.txt and ≤ 2 MB on the server, extracts in memory with `unpdf`, and returns `{ text, noText }`. No file is written to disk or stored."

### M6. The Hosted fail-fast list conflicts with build steps 1–2
- **What's wrong:** AD-3 stops a hosted startup unless the AI key and `ENCRYPTION_KEY` are set. But the Hosted skeleton ships in step 1 (week 45), the provider is chosen in the 18 Nov bake-off, and encryption arrives with S7. Builders will either set dummy secrets (and a dummy AI key on Hosted could make a `live` adapter call a real API) or weaken the check ad hoc. Cut 0 freezes Hosted at exactly this skeleton.
- **PRD ref:** §5.1 step 1 ("Hosted skeleton with the Access code"), cut 0, §5.2 (bake-off 18 Nov), FR-30, OQ3.
- **Suggested fix:** In AD-3, add: "On Hosted, `ACCESS_CODE` and `DATABASE_URL` are always required. The AI key is required once `AI_PROVIDER` is set (S3), and `ENCRYPTION_KEY` once `features.accounts` is on. Before S3, Hosted runs with AI sections unavailable, not on a dummy key."

---

## Low

### L1. The `ja_access` cookie lifetime isn't stated
- **What's wrong:** FR-31 and §5.1 say the Access code is requested "once per browser session". A builder who sets `Max-Age` makes it persist across sessions.
- **PRD ref:** FR-31 bullet 1, §5.1 "Before accounts exist".
- **Suggested fix:** In AD-12, add: "`ja_access` is a session cookie (no `Max-Age`/`Expires`), httpOnly, Secure, SameSite=Lax."

### L2. The FR-24 notice text depends on the provider, but nothing carries the provider to the UI
- **What's wrong:** The notice must name the provider and its retention period. `RunMode` has `aiNoticeVersion` but no provider id, and the spine doesn't say when the version changes (provider change, or FR-5b wording).
- **PRD ref:** FR-24 bullet 1, FR-5b table (FR-24 row), §8.1.
- **Suggested fix:** Add `aiProvider` to `RunMode`, keep one notice text per provider in `messages.nb.ts`, and bump `aiNoticeVersion` whenever that text changes.

### L3. AD-14's "discarded suggestion is replaced by its fixed template" doesn't match FR-17
- **What's wrong:** Under FR-17, a discarded suggestion leaves the Gap "with the Evidence citation but without a suggestion". Only FR-15 downgrades use the fixed Real-gap template.
- **PRD ref:** FR-15 bullet 1, FR-17 bullet 3.
- **Suggested fix:** Reword AD-14: "A downgraded Gap (FR-15) gets the Real-gap template. A discarded suggestion (FR-17) becomes `null`, and its citation and explanation stay."

### L4. Where «Bruk eksempelet» gets its texts
- **What's wrong:** The button fills in the CV text, the Job ad, the job title and the employer, with or without login. The Fixture files live in `data/fixtures/`, which the client can't read. One builder will add an endpoint, another will bundle the files into the client.
- **PRD ref:** FR-27 bullet 2, UJ-3 step 3.
- **Suggested fix:** Add `GET /api/example`, which returns `{ cvText, jobAd, jobTitle, employer }` from the Example Fixture. Show the button only when `RunMode.testMode` is on.

### L5. No named code for "not available in Test mode"
- **What's wrong:** FR-27 requires a per-section message, not an error banner, when the Cached lookup misses. Without a fixed `MessageKey`, the UI may treat a miss as a failure and offer a retry that can't succeed.
- **PRD ref:** FR-27 bullet 5, UJ-3 edge case, NFR-5 (partial results).
- **Suggested fix:** Add `TEST_MODE_UNAVAILABLE` to the AD-7 code examples, with the rule "not retryable; the score stays".

### L6. Before accounts, letter-check trusts the Gaps the client sends
- **What's wrong:** FR-11 lets a Missing keyword through only if its Gap's citation "passed FR-15". Before accounts, the client sends `gaps` to `/letter-check`, and the spine doesn't say whether the server runs `checkCitation` on them again. The risk is low (one user, own data), but builders will differ.
- **PRD ref:** FR-11 bullet 2.
- **Suggested fix:** In AD-6, add: "letter-check runs `checkCitation` again on every Rewordable gap it receives before letting a keyword through."
