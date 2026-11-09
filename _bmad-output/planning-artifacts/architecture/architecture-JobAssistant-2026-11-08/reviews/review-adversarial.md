---
review: adversarial
target: ../ARCHITECTURE-SPINE.md
lens: 'Construct two units one level down that each obey every AD to the letter yet still build incompatibly. Every pair is a hole to close with a new or tightened AD.'
level_below: 'epics/stories S1..S6+S7, built one at a time by a solo developer with Claude Code, often in separate sessions without shared memory'
date: 2026-11-08
---

# Adversarial review: JobAssistant v1 architecture spine

## Verdict

**Not yet a safe build substrate. Add the missing contracts before writing the epics.**

The spine is strong on *layering* (who may import whom, where I/O lives, one AI port, one gateway, one config, one error envelope). It is weak on *shared data contracts*. It names the boxes but leaves unowned the shapes that pass between them: the analysis result, the Gap, the Application write path, the client session, the content hash, and the text owner for code-written Norwegian sentences. Stories S2, S3, S4, S5 and S6 are written weeks apart, and each will invent its own version of these shapes. Every AD can be obeyed to the letter while that happens.

Counts: **3 critical, 10 high, 9 medium, 4 low** (26 holes).

Most fixes fit in five new ADs plus small tightenings of existing ones:

- **AD-14 Shared result contracts:** one `src/core/contracts.ts` that owns `KeywordList`, `AnalysisResult`, `Gap`, `LetterFlags` and `AiResultMeta`.
- **AD-15 Application write model:** who creates the row, which handler writes which column, snapshot semantics, and idempotency.
- **AD-16 Canonical text and hashing:** one canonicaliser, one hash function, applied at a defined point in the pipeline.
- **AD-17 Client session contract:** one versioned `sessionStorage` module and its behaviour after S6.
- **AD-18 Run mode and auth surfaces:** `accountsEnabled`, which routes need which credential, cookie names, and how the client learns the run mode.

The holes below are ordered by severity. Each one gives two compliant units (A and B), the incompatibility, and the rule text to add.

---

## Critical

### H1. No owner for the shape of the analysis result passed between phase 1, phase 2, letter-check and the Application

- **Unit A (S2, story "Match score and explanation", week 46):** `core/score` returns `{ keywords: string[]; matched: { keyword: string; evidence: string }[]; missing: string[]; score: number; verdict: 'strong' | 'needs-work' }`. Evidence is a raw excerpt string. The FR-8 "line in the Job ad" is found in the UI by `indexOf`.
- **Unit B (S3/S4, story "letter-check" or "gaps", week 47–48, new session):** needs the match stage, the Keyword's source (code or AI, "less precise" under FR-5), the Evidence position (to derive the CV entry for FR-17), and the Job ad line for each Missing keyword. It defines `MatchedKeyword { keyword: Keyword; stage; evidence: EvidenceCitation { text; start; end } }` where `Keyword = { term; normalized; source }`.
- **Why both comply:** AD-2 fixes *where* matching runs, and the Conventions table fixes *names* (`MatchedKeyword`, `EvidenceCitation`). Nothing fixes fields, so both "use the Glossary names". AD-3 says phase-2 handlers recompute, so each handler can use whichever shape its own story defined.
- **Incompatibility:** the UI renders phase 1 with one shape and the letter-check flags with another. The S6 story then stores "the keyword lists" (FR-21) in a third shape, chosen by whoever writes the repository. Reopened Applications from before and after a refactor do not parse. FR-5's "marked as less precise" has no field, so the S3 Test-mode story and the S2 UI story each add their own flag (`lowPrecision`, `degraded`, `source: 'code'`).
- **Severity:** critical. Every downstream story touches this shape.
- **Fix: new AD-14 (Shared result contracts).**
  > `src/core/contracts.ts` is the only definition of the types that cross a layer boundary or are stored: `Keyword`, `KeywordList`, `MatchedKeyword`, `MissingKeyword`, `EvidenceCitation`, `AnalysisResult`, `Gap`, `RewordingSuggestion`, `LetterFlags`, `AiResultMeta`. Each is a zod schema with an inferred type. Route handlers, services, repositories and UI components import these and never declare look-alike shapes. Minimum fields:
  > - `Keyword { term: string; source: 'vocabulary' | 'ai' }`
  > - `KeywordList { keywords: Keyword[]; origin: 'code' | 'ai-cached' | 'code-degraded'; degradedReason?: 'test-mode' | 'daily-cap' | 'ai-failed'; vocabularyVersion: string }`
  > - `EvidenceCitation { text: string; start: number; end: number }`, with offsets into the confirmed CV text
  > - `MatchedKeyword { keyword: Keyword; stage: 'exact' | 'stem' | 'compound' | 'alias'; evidence: EvidenceCitation }`
  > - `MissingKeyword { keyword: Keyword; adLine: string }`
  > - `AnalysisResult { keywordList: KeywordList; matched: MatchedKeyword[]; missing: MissingKeyword[]; score: number; fingerprint: string }`
  >
  > `Verdict` is never a field. It is derived with `core/score.verdictOf(score)` wherever it is shown. A change to a contract schema is a story of its own and bumps `contractVersion`, which every stored JSON column carries.

### H2. Phase-2 "recompute" can call AI again, or silently diverge from what phase 1 showed

- **Unit A (S2, KeywordExtractor):** AD-2 places extraction "behind one `KeywordExtractor` interface" inside the AD about `src/core/keywords`. The story makes it a synchronous Core interface: `extract(ad: string): Keyword[]`.
- **Unit B (FR-5 fallback story, week 46/47):** `ai-fallback` needs the AI gateway and the Keyword-list repository. Core may import neither (AD-1), so the story puts an async `AiFallbackExtractor` in `services/` and changes the signature to `Promise<KeywordList>`. AD-3 tells `/api/gaps` and `/api/letter` to "recompute the Keyword results from the inputs with Core". The gaps story calls the configured extractor. On a cache miss (for example, phase 1 fell back to code-only because the cap was reached, so nothing was saved), the extractor calls `proposeKeywords` again from phase 2.
- **Incompatibility:**
  - A third and fourth AI request per Application, against P6/NFR-8. Worse, a *different* Keyword list in phase 2 than the one phase 1 showed: the Gaps cover Missing keywords that are not on screen, and FR-11 flags words the Student was never told were missing.
  - The same divergence happens without the fallback if a deploy changes `data/vocabulary` between phase 1 and phase 2, or if the client edits the CV text after phase 1 and before the retry that AD-3 allows.
- **Severity:** critical. It silently breaks P2/P6 and the Reflection Note's consistency.
- **Fix: tighten AD-2 and AD-3.**
  > AD-2: Core exposes only pure functions: `extractKeywordsCode(ad, vocabulary): KeywordList` and `acceptProposedKeywords(ad, proposed): KeywordList`, which drops terms not found in the ad. The `KeywordSource` interface is async, lives in `src/server/services/keyword-source.ts`, and has two methods: `resolveForAnalyse(ad)`, which may call `proposeKeywords` and write the cache, and `resolveReadOnly(ad)`, which uses a cache hit or code-only extraction and never calls AI.
  >
  > AD-3: Only `/api/analyse` may call `resolveForAnalyse`. Phase-2 handlers and letter-check call `resolveReadOnly`. Phase 1 returns `AnalysisResult.fingerprint = sha256(canonical CV ‖ canonical ad ‖ KeywordList terms ‖ vocabularyVersion)`. The client echoes it on every phase-2 and letter-check request. The handler recomputes and, on a mismatch, returns `ANALYSIS_STALE`. The client then reruns phase 1 and never shows Gaps computed against a list it did not show.

### H3. Application rows: two writers of one entity, and lost updates when phase 2 races

- **Unit A (S6 story "save Application in analyse"):** creates the row in `/api/analyse` and stores one encrypted JSON column, `content`, holding `{ analysis, gaps?, letter? }`. "Repositories encrypt on write" (AD-9), so the repository exposes `updateApplication(studentId, id, patch)`, which decrypts, merges and re-encrypts.
- **Unit B (S6 story "persist AI sections"):** `/api/letter` and `/api/gaps` each call `updateApplication` when they finish. They run in parallel (AD-3).
- **Why both comply:** AD-7 says "phase 1 creates the row, phase-2 handlers add their sections by id, only the server writes". It says nothing about column layout or concurrency.
- **Incompatibilities:**
  1. Read-modify-write on one blob loses whichever section finished first.
  2. Phase-2 handlers "recompute the Keyword results" (AD-3), and a story author "keeps the row in sync" by writing `score` and `keywordLists` again from the phase-2 handler. Now two writers own the score.
  3. FR-12 regeneration calls `/api/letter` again and replaces `letter`. The stored FR-11 flags (if anyone stores them, see H4) now describe the old Letter.
  4. `/api/letter-check` is "pure Core", yet AD-3 has the client send it "Letter, Gaps, inputs". If a story persists the flags from that call, the server stores flags computed from client-supplied Letter and Gaps. That contradicts AD-3's "don't trust results sent by the client".
- **Severity:** critical. Data loss in History, plus an integrity-guard bypass.
- **Fix: new AD-15 (Application write model).**
  > The `application` table has one column per section: `analysis` (encrypted `AnalysisResult`), `gaps` (encrypted `Gap[]`), `letter` (encrypted `Letter`), `letter_flags` (encrypted `LetterFlags`), plus plain metadata (H17). Only these writes exist, each a single column-targeted `UPDATE … WHERE id = ? AND student_id = ?` with no read-modify-write:
  > - `/api/analyse` → `insert` (whole row; `analysis`, title, employer, Job ad, score)
  > - `/api/gaps` → `set gaps`
  > - `/api/letter` → `set letter, letter_flags = null`
  > - `/api/letter-check` → `set letter_flags`
  >
  > No other handler writes `analysis` or `score`. When an `applicationId` is present, letter-check loads the Letter and Gaps **from the row** and ignores the ones in the body. Only the CV text comes from the request, checked against the fingerprint (H2). The client calls letter-check again whenever the Letter or the Gaps change (regeneration, or a successful gaps retry).

---

## High

### H4. Reopening from History: snapshot or recompute? The CV text has changed since

- **Unit A (S6 History reopen):** "Reopen shows its Reflection Note and Letter" (FR-21). To avoid storing derived data, the story recomputes Evidence and the FR-11 flags with Core from the Profile's current CV text (Core is pure and cheap, AD-1).
- **Unit B (S6 Profile, UJ-2 edge case):** a new CV upload replaces the Profile CV text (FR-20).
- **Incompatibility:** after a CV update, every old Application reopens with different Evidence, different matches and a score that no longer matches the plain `score` column used for the History badge. The FR-11 Upgrade-word check needs CV text, which the Application never stored (FR-21's list excludes it).
- **Severity:** high.
- **Fix: add to AD-15.**
  > A stored Application is a snapshot. Reopening never calls Core matching, guards or the AI. It renders the stored `analysis`, `gaps`, `letter` and `letter_flags` as stored. History pages never call `/api/letter`, `/api/gaps` or `/api/letter-check`. «Lag nytt utkast» exists only on the live Søknad page. If `letter_flags` is null on reopen (letter-check never ran), the Letter is shown with the neutral "not checked" notice from `messages.nb.ts`.

### H5. The Gap JSON schema has three lifecycles but one "owner" sentence

- **Unit A (S4 gaps, week 48):** defines `GapSchema = { keyword: string; kind; explanation: string; citation?: string }` in `src/core`, as AD-4 requires. It records `fixtures/*/cached/gaps.json` in that shape.
- **Unit B (S5 rewording, week 49, new session):** adds suggestions. Option 1 is flat `suggestion?: string`; option 2 is nested `suggestion?: { text; cvEntry }`. The FR-17 discard is shown as `suggestion: null`, as an omitted field, or as `suggestionDiscarded: true`. The FR-15 downgrade sets `kind: 'real'` but keeps or blanks `explanation`.
- **Why both comply:** AD-4 says one zod schema parses `analyseGaps` output. It doesn't separate the *AI wire schema* (what the model returns) from the *guarded Gap* (what clients and the DB receive), and it doesn't say how S5 evolves the S4 schema or the S4 cached files.
- **Incompatibilities:**
  - S4's cached `gaps.json` no longer parses under S5. AD-4 then makes it an AI failure, so Test mode loses Gaps.
  - The UI can't tell "S5 cut" from "suggestion discarded" from "downgraded".
  - The AI may return Gaps for keywords that are not missing, or skip some; nothing says one Gap per Missing keyword.
- **Severity:** high.
- **Fix: tighten AD-4 and AD-5 (types in AD-14).**
  > Two schemas in `src/core/contracts.ts`: `GapAiOutput` (the wire shape the prompt asks for, versioned with the gaps prompt) and `Gap` (guarded):
  > `Gap { keyword: Keyword; kind: 'rewordable' | 'real'; explanation: { source: 'ai'; text: string } | { source: 'template'; key: MessageKey }; citation?: EvidenceCitation; suggestion?: RewordingSuggestion; guard: { downgraded: boolean; suggestionDiscarded: boolean } }`.
  >
  > The gaps service returns exactly one `Gap` per `MissingKeyword`, in the same order. Extra AI items are dropped; missing ones become template Real gaps. `RewordingSuggestion` is optional from S4 onward, so S5 adds data without changing the schema. Every cached `gaps.json` is in `GapAiOutput` form, and a test parses every Fixture's cached file against the current schema.

### H6. Code-written Norwegian sentences: Core or `messages.nb.ts`?

- **Unit A (S2 `core/explain`):** AD-1 lists "explanations" as a Core product rule. The story returns finished Norwegian strings, «Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.», from Core. Core may import only `src/core` and `data/` (AD-1), so the template text lives in Core.
- **Unit B (S2 UI, or the S4 FR-15 downgrade template):** AD-13 says all user-facing Norwegian lives in `src/lib/messages.nb.ts` and server responses contain no prose. The UI builds the sentence from a key plus parameters. The gaps service, by the same AD, can't put the FR-15 "fixed Real-gap template" text into `explanation`.
- **Incompatibility:** the two ADs contradict each other. Two copies of the templates drift. API responses do contain prose (AI text is prose by nature), so "no prose" is unenforceable as written.
- **Severity:** high.
- **Fix: tighten AD-1 and AD-13.**
  > Core decides *which* explanation applies and returns `{ key: MessageKey; params }`. It never returns Norwegian text. `MessageKey` is a string-literal union in `src/core/message-keys.ts`, which Core may import. `src/lib/messages.nb.ts` maps every `MessageKey` and every `ErrorCode` to text, and a test asserts the map is complete. Server responses carry no prose except AI-generated content fields (`Letter.text`, `Gap.explanation` with `source: 'ai'`, `RewordingSuggestion.text`).

### H7. Citation check and CV-entry derivation can use the wrong normaliser

- **Unit A (S4 FR-15 guard):** AD-2 says `core/keywords` is "the only code that normalises text". The guard therefore calls `keywords.normalize()` on both the citation and the CV text and checks `includes`. That `normalize` lowercases, strips punctuation and may fold hyphens or split compounds for matching.
- **Unit B (S5 FR-17 guard):** the prompt asks the AI to return the cited `cvEntry`. The guard checks Upgrade words against the AI-supplied entry.
- **Incompatibilities:**
  - A citation the AI paraphrased slightly (a missing comma or hyphen, a compound split) passes A's guard. FR-15 requires word for word, ignoring only case and whitespace. That is a P1 leak.
  - In B, the AI chooses the entry it is checked against, so an AI that "cites" a padded entry defeats FR-17.
  - Separately, the gateway sends contact-stripped CV text to the AI (AD-6), and the guard checks against the original CV. A citation that spans a stripped phone number fails for no good reason.
- **Severity:** high (integrity guard).
- **Fix: tighten AD-2 and AD-5.**
  > `core/keywords` exports two different normalisers with different names: `normalizeForMatch` (matching only) and `canonicalizeForCitation` (Unicode NFC, lowercase, collapse all whitespace to one space; nothing else). FR-15 uses only `canonicalizeForCitation`, against the same CV text that was sent to the AI (after FR-26 stripping). The resulting `EvidenceCitation` offsets map back to the original CV text. The CV entry for FR-17 is always derived by Core, `entryAround(cvText, citation)`, as the blank-line-bounded block. Any entry text the AI returns is ignored. If the CV text has no blank lines, `entryAround` falls back to the single line that contains the citation.

### H8. Cached-response key vs FR-5 keyword-cache key: two hashes, unspecified normalisation, computed at different pipeline points

- **Unit A (S3 Fixture recording script, `scripts/record-fixtures`):** computes `sha256(cv.trim() + ad.trim())` from `cv.txt`/`ad.txt` and writes an index.
- **Unit B (S3 `ai/cached` adapter):** sits *behind* the gateway (AD-6: cached calls pass through it). So it receives CV text **after FR-26 contact stripping**, and computes the key with `keywords.normalize()` (AD-2: the only normaliser).
- **Unit C (FR-5 keyword cache):** keys by "a hash of the Job ad text" with a third choice: raw text, including title and employer or not.
- **Incompatibility:**
  - Test mode misses every entry. The stripped CV doesn't match the unstripped recording, and `trim()` isn't `normalize()`.
  - A PDF upload of `cv.pdf` produces CRLF/LF differences, soft hyphens, ligatures and different line wrapping from `cv.txt`, so the promised "uploaded copy reaches the same entry" fails unless canonicalisation handles them.
  - Pair concatenation without a separator is ambiguous.
- **Severity:** high. It breaks SC8/UJ-3, the examiner's run.
- **Fix: new AD-16 (Canonical text and hashing).**
  > `src/core/text/canonical.ts` owns `canonicalizeForHash(s)`: Unicode NFKC, CRLF/CR → LF, remove U+00AD and zero-width characters, rejoin `-\n` hyphenated line breaks, collapse every whitespace run to one space, trim. Case is kept. `contentHash(s) = sha256hex(canonicalizeForHash(s))`. `pairHash(cv, ad) = sha256hex(contentHash(cv) + ':' + contentHash(ad))`.
  > - The cached-response key is `pairHash` of the **original, unstripped** CV text and the Job ad. The gateway computes it before stripping and passes it to the adapter as `lookupKey`.
  > - The FR-5 keyword-cache key is `contentHash(ad)` (Job ad text only; title and employer are excluded).
  >
  > The recording script and the adapter both import these functions. A test asserts that `cv.txt`, extracted `cv.pdf` and the «Bruk eksempelet» text of every Fixture produce the same `pairHash`.

### H9. Daily cap: check-then-increment races, and retries, timeouts and failures are undefined

- **Unit A (S3 gateway):** reads the count, compares it with 30, calls the AI, and increments on success, "so failures don't eat the Student's quota".
- **Unit B (S3 Søknad client):** sends `/api/letter` and `/api/gaps` in parallel (AD-3). On a 90 s timeout it offers retry (NFR-4).
- **Why both comply:** AD-6 says "checks and increments" without saying when, how atomically, or what counts.
- **Incompatibilities:**
  - At count 29, both parallel calls pass the check, so the count goes to 31.
  - Timed-out calls the provider still bills aren't counted, so a loop of timeouts is free, defeating FR-25 and NFR-8.
  - FR-5 under a reached cap needs a *degraded success* (code-only Keywords, `degradedReason: 'daily-cap'`). Unit A returns `DAILY_CAP_REACHED` as an error from phase 1, so the score disappears, against FR-25.
- **Severity:** high.
- **Fix: tighten AD-6.**
  > The gateway reserves before calling: `INSERT … ON CONFLICT (scope, day) DO UPDATE SET count = daily_cap.count + 1 WHERE daily_cap.count < :cap RETURNING count`. No row returned means the cap is reached; return `DAILY_CAP_REACHED` without calling. A reservation is never refunded: timeouts, provider errors and schema-parse failures all count, because the provider may bill them. Every client retry and every «Lag nytt utkast» is a new reservation. `proposeKeywords` counts the same way. When `/api/analyse` meets `DAILY_CAP_REACHED`, `AI_TIMEOUT` or `AI_FAILED` from `proposeKeywords`, it returns `ok: true` with `keywordList.origin = 'code-degraded'` and the matching `degradedReason`, never an error. The reset time shown to the Student is computed by Core (`nextOsloMidnight(now)`) and returned as `resetsAt` in the error payload.

### H10. After S6, AD-7's "persist when a session exists" leaves an unauthenticated AI path open

- **Unit A (S1–S5 routes):** serve any request with complete inputs, counting against `installation` (AD-6, AD-7).
- **Unit B (S6 auth):** FR-18 says Søknad requires login once S6 exists. The story adds a redirect on the *pages* and, per AD-7's literal wording ("the same handlers also persist through repositories when a session exists"), leaves the handlers serving requests without a session.
- **Incompatibility:** after S6, anyone past the Access code (or anyone at all locally) can `POST /api/letter` without logging in. That uses the installation cap and stores nothing: the S6 login requirement is cosmetic. The `installation` and per-Student scopes then both count at once.
- **Severity:** high.
- **Fix: new AD-18 (Run mode and auth surfaces), and tighten AD-7.**
  > `config.accountsEnabled` is true once the S6 epic is merged (a constant in `config.ts` flipped by the S6 story; set back to false if S6 is cut). When true, every `/api/*` route except `/api/health`, `/api/auth/*` and `/api/access` requires a valid session and returns `SESSION_REQUIRED` (401) otherwise. The Daily-cap scope is then always the Student id. When false, no route reads a session, and the scope is always `installation`. "Persist when a session exists" means "persist when `accountsEnabled`", which implies a session.

### H11. Access-code cookie vs S6 session cookie: names, secrets, and what the gate covers after S6

- **Unit A (S1 `proxy.ts`):** gates every path. The signed browser-session cookie is named `session`, HMAC-signed with `ACCESS_CODE` as the key.
- **Unit B (S6 auth, possibly Better Auth):** FR-31 says "after S6, registration requires the Access code". The story adds an access-code field to «Registrer deg» and expects «Logg inn» to be reachable without it. The library's own cookie (or a hand-rolled one) is also named `session`, and is signed with `SESSION_SECRET`.
- **Incompatibilities:**
  - The proxy blocks «Logg inn» for a returning Examiner who already has an account, or the S6 story loosens the proxy and opens S1–S5 routes on the Hosted version.
  - The cookies overwrite each other.
  - Two sources of truth for "has access".
  - Changing `ACCESS_CODE` silently invalidates or keeps cookies, depending on the key choice.
- **Severity:** high.
- **Fix: tighten AD-10 (part of AD-18).**
  > Cookie names are fixed: `ja_access` (the Access code) and `ja_sid` (the S6 session). `ja_access` is httpOnly, Secure (on the Hosted version), SameSite=Lax, has no Max-Age, and its value is `HMAC-SHA256(SESSION_SECRET, "access:" + sha256(ACCESS_CODE))`, so rotating the code revokes it. The proxy keeps gating **every** path except `/tilgang`, `/api/access` and `/api/health` in both phases. Registration additionally rejects a request without a valid `ja_access` (defence in depth), and login needs only `ja_access` plus credentials. The proxy never reads `ja_sid` and never touches the database; sessions are checked in services (AD-10).

### H12. Requests rejected by the proxy or an expired session break the JSON error contract

- **Unit A (S1 proxy):** redirects every request without `ja_access` to `/tilgang` (307, HTML).
- **Unit B (S3 Søknad client):** `await res.json()` on every response and switches on `error.code` (AD-13).
- **Unit C (S6 session expiry):** FR-18 sends the Student to «Logg inn» with a message and keeps the Job ad. The auth story redirects API calls too.
- **Incompatibility:** a phase-2 call made after the browser session ended, or after 30 minutes of idleness, gets HTML. `JSON.parse` throws, the error is unhandled, and NFR-5 is broken: the input is lost and the score vanishes. AD-13 says "every API response", but the proxy isn't a route handler, so a story author reasonably treats it as outside the contract.
- **Severity:** high.
- **Fix: tighten AD-13 and AD-10.**
  > The error contract covers every response to `/api/*`, including responses from `proxy.ts`. For `/api/*` the proxy returns `401 { ok: false, error: { code: 'ACCESS_REQUIRED' } }` and never redirects. Expired or missing sessions on `/api/*` return `401 SESSION_EXPIRED` or `SESSION_REQUIRED`. Only page requests are redirected. A single client helper, `src/lib/api-client.ts`, is the only place that calls `fetch` for `/api/*`. It treats any non-JSON response as `NETWORK_ERROR`, and on `SESSION_EXPIRED` it saves the client session (AD-17) before navigating to «Logg inn».

### H13. The client `sessionStorage` shape before S6 vs the persisted data after S6

- **Unit A (S1 Søknad):** stores `sessionStorage['cv'] = text` and `sessionStorage['ad'] = text`.
- **Unit A′ (S3):** adds `sessionStorage['results'] = JSON.stringify(phase1)`, `['letter']`, and `['aiNotice'] = '1'` (Architecture Map: FR-24 acceptance is kept in sessionStorage).
- **Unit B (S6 Profile/Søknad):** FR-20 says Søknad uses the Profile CV by default. The story loads the Profile CV into the form on mount, but the S1 code restores `sessionStorage['cv']` afterwards. AD-7 says "changes nothing else". The Student's unsaved edit on Søknad, or the CV from a previous user's session on a shared machine, wins. The Application is analysed against text that isn't the Profile's, and FR-3 says editing happens in Profil after S6.
- **Further incompatibilities:**
  - FR-18 needs the Job ad kept *across* the login redirect, which needs a defined key that survives logout but not CV text.
  - Logout must clear personal content from `sessionStorage`, and no AD says so.
  - A refresh mid-phase-2 must restore `applicationId` and `fingerprint` so retry works without repeating phase 1 (AD-3). Ad-hoc keys lose them.
- **Severity:** high.
- **Fix: new AD-17 (Client session contract).**
  > `src/lib/client-session.ts` is the only code that touches `sessionStorage`. It stores one key, `ja.session.v1`, parsed with a zod schema: `{ v: 1; inputs: { cvText?; jobAd?; jobTitle?; employer?; tone }; applicationId?; fingerprint?; phase1?: AnalysisResult; letter?; gaps?; letterFlags?; aiNoticeAccepted?: { version: string } }`. Every read is wrapped in try/catch and falls back to empty.
  >
  > When `accountsEnabled`:
  > - `inputs.cvText` is never written. Søknad shows the Profile CV text read-only, with a link to Profil.
  > - `aiNoticeAccepted` is not used (see H16).
  > - Logout and session expiry clear everything except `inputs.jobAd`, `jobTitle`, `employer` and `tone`, which «Logg inn» offers again (FR-18).
  >
  > Schema changes bump `v`, and an unknown `v` is discarded.

---

## Medium

### H14. Expected failures: thrown exceptions or returned results?

- **Unit A (S3 gateway):** throws `new AiTimeoutError()`.
- **Unit B (S2 analyse route):** wraps the service in `try { … } catch { return INTERNAL }` because analyse had no AI when it was written. The FR-5 fallback later adds an AI call underneath it.
- **Incompatibility:** timeouts surface as `INTERNAL` instead of `AI_TIMEOUT`, so the UI can't offer "retry phase 2 only". Separately, zod's default English messages leak into the form hints (AD-13 says no English).
- **Severity:** medium.
- **Fix: tighten AD-13.**
  > Services return `Result<T, AppError>` (`{ ok: true, value } | { ok: false, code: ErrorCode, field?, meta? }`) for every expected failure. They throw only on bugs. Route handlers map `AppError` to the response, and map anything thrown to `INTERNAL` (500) with a log record. The `ErrorCode` → HTTP status table lives next to the enum in `src/lib/errors.ts`. Request zod schemas set `error` to an `ErrorCode` on every rule, and the form looks the code up in `messages.nb.ts`. Adding a code is part of the story that needs it, together with its `messages.nb.ts` entry. The completeness test (H6) enforces that.

### H15. "The prompt version travels with every AI result": in what envelope, to where, and is it checked?

- **Unit A (S3 letter):** returns `{ text, promptVersion: 'letter-v2' }` to the client and doesn't store it.
- **Unit B (S4 gaps):** returns `{ gaps, meta: { prompt: 3 } }`. The cached files use `promptVersion: '2026-11-20'` (AD-12). The S6 repository stores neither.
- **Incompatibility:**
  - No common format.
  - No stored trace for History or `docs/qa`.
  - Test mode silently serves Cached responses recorded with an older prompt (FR-27 requires them recorded from the final prompts), and nothing detects it.
- **Severity:** medium.
- **Fix: tighten AD-4 and AD-12 (type in AD-14).**
  > Every `AiClient` method returns `{ value; meta: AiResultMeta }` with `AiResultMeta { source: 'live' | 'cached' | 'mock'; provider; model; promptVersion; recordedAt? }`. `promptVersion` is `<prompt-name>@<n>`, taken from the prompt file name `src/server/ai/prompts/<name>@<n>.txt`. The gateway logs it, services return it inside the section payload, and AD-15 stores it as plain metadata per section (`letter_meta`, `gaps_meta`). A CI test fails if any Fixture's cached file carries a `promptVersion` other than the current one for its prompt.

### H16. Where and how FR-24 acceptance is stored, versioned and enforced

- **Unit A (S3 Søknad):** shows the notice before the phase-2 calls and stores the flag in `sessionStorage`.
- **Unit B (FR-5 fallback):** calls `proposeKeywords` in **phase 1**, so the Job ad leaves the app before the notice.
- **Unit C (S6):** adds `aiNoticeAcceptedAt` to the **Profile**, as the Architecture Map says. That column isn't in FR-22's plain list, so by AD-9 it must be encrypted (an encrypted timestamp), or the story author breaks AD-9.
- **Further incompatibility:** a notice accepted before the fallback was switched on (or before a provider change) is never shown again, although FR-24 says the notice changes.
- **Severity:** medium.
- **Fix: tighten the FR-24 row of the Capability Map; add to AD-17 and AD-18.**
  > The notice has a version, `AI_NOTICE_VERSION` in `src/core` (bumped when the provider, retention or the FR-5 fallback changes). The gate runs **before phase 1** whenever `!testMode`. Acceptance is client-enforced; the server doesn't check it. Before S6, it is stored as `aiNoticeAccepted.version` in AD-17's session object. After S6, it is stored as a plain `student.ai_notice_version` column (technical metadata, H17), written by `POST /api/profile/ai-notice`, and not on the encrypted Profile. The notice is shown when the stored version differs from the current one.

### H17. Encrypted vs plain columns: AD-9's "exactly FR-22's list" is too literal for a schema

- **Unit A (S6 schema story):** reads AD-9 literally ("plain columns are exactly email, dates, Match score") and encrypts `verdict`, `prompt_version`, `keyword_origin` and even the job-ad hash. Sorting and filtering then work only on dates and score, and the FR-5 link "matched by Job ad hash" (ERD) can't be joined.
- **Unit B (S6 history story):** needs `student_id`, `id`, session `expires_at`, `token_hash`, the password hash, `daily_cap.count`, and per-section metadata in plain text, and simply adds them.
- **Incompatibility:** the schema becomes a matter of reader judgement. A plain `job_ad_hash` on Application also links two Students who applied to the same ad. And the encrypted custom type is unspecified for structured values: one story encrypts `JSON.stringify`, another a string, and decryption returns `unknown` with no validation.
- **Severity:** medium.
- **Fix: tighten AD-9.**
  > Columns fall into three classes. (1) **Personal content**, always encrypted: name, CV text, Job ad text, job title, employer, and every JSON column that contains Keywords, Evidence, Gaps, suggestions, Letter or flags. (2) **FR-22's plain fields:** email (lowercased), dates, Match score. (3) **Technical metadata**, plain, containing no Student-written text: ids, foreign keys, `student_id`, token and password hashes, expiry times, counters, `contract_version`, `prompt_version`/`*_meta`, `keyword_origin`. Anything not clearly in (2) or (3) is (1). Verdict is never stored. Applications don't store a plain Job ad hash. The FR-5 cache is looked up by recomputing `contentHash(ad)` from the Job ad. Encrypted columns use two custom types only: `encryptedText` and `encryptedJson(schema)`. The latter parses the AD-14 zod schema on read and treats a failure as a 500.

### H18. How the client learns the run mode (Test banner, notice, accounts)

- **Unit A (S3 banner):** adds `NEXT_PUBLIC_TEST_MODE` to `.env` and reads it in a client component. It follows "no other file reads `process.env`" by re-exporting it from a new `src/lib/env.ts`.
- **Unit B (AD-11):** derives `testMode` from "no AI key, or `TEST_MODE=1`" in `src/server/config.ts`.
- **Incompatibility:** with no key and no `NEXT_PUBLIC_TEST_MODE`, the server is in Test mode and the banner is hidden. The notice (H16) shows in Test mode. Vercel Preview shows the wrong banner. A second derivation of the same mode exists.
- **Severity:** medium.
- **Fix: tighten AD-11 (part of AD-18).**
  > `src/server/config.ts` begins with `import 'server-only'`. The root layout (a server component) reads `config` and passes `RunMode { testMode; hosted; accountsEnabled; aiNoticeVersion }` to a client context provider in `src/components/run-mode.tsx`. Client code reads the run mode only from that context. `NEXT_PUBLIC_*` variables are not used.

### H19. Who creates the Student and the Profile, and what the auth library's own tables hold

- **Unit A (S6 auth with Better Auth):** the library's `user` table has a required `name` column and its own id generator. The story fills `name` from the registration form, as the library docs show.
- **Unit B (S6 profile):** AD-10 says the name lives only in the encrypted Profile. `profileService.save()` upserts the Profile when the CV is first saved.
- **Incompatibilities:**
  - The name is stored twice, once in plain text in an auth table (FR-22 breach).
  - Until the first CV save there is no Profile, so the Letter sign-off has no name (FR-9).
  - Two code paths create Profiles.
- **Severity:** medium.
- **Fix: tighten AD-10.**
  > Registration creates the `student` row and the `profile` row (name, CV text null) in one transaction, through `profileRepo.create`. The profile service only updates. Whatever auth library is chosen, its user table stores no name (a constant empty string if the column is required), and its ids follow the ID convention or are mapped 1:1 to `student.id`. Its cookie is renamed to `ja_sid`, and its expiry is configured to 30 minutes sliding (H11).

### H20. Seeding the test user (FR-29) bypasses the repositories

- **Unit A (`scripts/setup.mjs`, S6):** a plain `.mjs` script that can't import the TypeScript repositories or the crypto module. It inserts the Student and Profile with raw SQL and reimplements AES-GCM and scrypt inline.
- **Unit B (S6 crypto/auth):** the real format (`v1.<iv>.<tag>.<data>`) or the auth library's own hash format changes slightly.
- **Incompatibility:** the seeded user can't log in, or its Profile doesn't decrypt. The Examiner's UJ-3 fails on a clean machine. There is now a second owner of encryption and of Profile creation.
- **Severity:** medium.
- **Fix: tighten AD-9 and the Structural Seed.**
  > `setup.mjs` only writes `.env` and then runs `npm run db:migrate` and `npm run db:seed`. `db:seed` runs `scripts/seed.ts` through `tsx`, which calls the same registration service as the UI. No script writes encrypted columns or password hashes directly.

### H21. The Letter's sign-off: does the name go to the AI, or is it substituted afterwards?

- **Unit A (S3 letter, before S6):** the prompt says «avslutt med [Ditt navn]». Cached Letters contain «[Ditt navn]».
- **Unit B (S6):** AD-7's input list (CV, Job ad, title, employer, Tone) has no name, so the story fetches the name from the Profile on the server and puts it in the prompt.
- **Incompatibility:**
  - The Student's name is now sent to the provider. FR-26 strips email and phone, but the name is extra personal data, against FR-23's "as little as possible".
  - The cached Letters keep the placeholder while live Letters show the name.
  - The FR-11 scan may flag name tokens.
  - `core/filename` (FR-12) needs the name too, and gets it from a third place.
- **Severity:** medium.
- **Fix: tighten AD-4 and AD-7.**
  > Letter prompts require a literal sign-off token, `{{SIGNATUR}}`, and the name is never sent to the AI. `LetterSchema` requires the token exactly once. The Letter is stored and returned with the token. The UI substitutes the Profile name, or the placeholder from `messages.nb.ts` before S6, at render, copy and .docx time. FR-11 scans the text with the token removed. The name for display and the file name comes from `GET /api/profile` (after S6), never from the Letter.

### H22. Double submit and abandoned Applications: duplicates and partial rows in History

- **Unit A (S6 analyse):** `insert` with a new `crypto.randomUUID()` on every call (ID convention).
- **Unit B (S3 Søknad):** NFR-5 says submitting twice never crashes. A double click or a refresh-and-resubmit simply calls phase 1 again.
- **Incompatibility:**
  - History fills with duplicate rows for one submission.
  - A failed phase 2 leaves rows with `gaps` and `letter` null. FR-21 reopen is read-only, so they can never be completed.
  - The History list has no defined rendering for missing sections.
- **Severity:** medium.
- **Fix: add to AD-15.**
  > The client generates `applicationId = crypto.randomUUID()` once per submission (stored in AD-17) and sends it to phase 1. `/api/analyse` upserts on `(id, student_id)`: a repeat with the same id and fingerprint returns the existing analysis, and a different fingerprint returns `ANALYSIS_STALE`. Ownership is still checked (AD-8). Reopened Applications with a null section show that section's "not generated" state from `messages.nb.ts`. They offer no retry.

---

## Low

### H23. "Typed metadata" logging without one event type

- **Pair:** the gateway story defines `AiCallLog`. The gaps story defines `GuardLog { downgrades: number }` with its own `log.guard()` method. The health route logs via a third ad-hoc type. Each is "typed", and the FR-23 log test covers only one of them.
- **Fix: tighten AD-6.**
  > `src/server/log/events.ts` owns one discriminated union, `LogEvent = { kind: 'ai-call' … } | { kind: 'guard' … } | { kind: 'request' … }`, whose fields are numbers, enums, ids and `ErrorCode` only (no string fields except enums). `log(event: LogEvent)` is the only export.

### H24. Fixtures and the cached index in deployed functions

- **Pair:** the S3 cached adapter reads `fixtures/` with `fs` at runtime. The S1 deploy story uses the default Next.js output tracing, so `fixtures/` isn't bundled and Vercel Preview (Test mode, AD-11 environment table) returns "not available" for the Example pair.
- **Fix: tighten AD-12.**
  > A build step, `npm run fixtures:index`, run by `prebuild`, generates `src/server/ai/cached/index.generated.ts`. It maps `pairHash` to the imported cached JSON. The adapter imports it and never reads the file system at runtime.

### H25. Retry of phase 2 after a refresh needs inputs that a page may no longer have

- **Pair:** AD-3 says phase 2 can be retried without repeating phase 1. The S3 retry button reads inputs from React state, which is lost on refresh. The S6 story assumes the server can rebuild the inputs from the row, but the row lacks the CV text.
- **Fix:** covered by AD-17 (inputs, `applicationId` and `fingerprint` are stored). State explicitly in AD-3: *"A phase-2 retry always resends the full inputs from the client session. The server never reconstructs inputs from a stored Application."*

### H26. Where the Oslo day and the reset time are computed

- **Pair:** the gateway computes `day` with `new Date().toISOString().slice(0, 10)` (a UTC day). The UI computes "resets at midnight" with the browser's time zone. Both are outside Core, so AD-1's determinism rule doesn't apply to them. Between 00:00 and 01:00/02:00 Oslo time, the cap row and the message disagree.
- **Fix: tighten AD-6.**
  > `core/time.osloDay(now: Date): string` and `core/time.nextOsloMidnight(now): Date` are the only day and reset computations. The gateway passes `now` from one clock adapter (`src/server/clock.ts`), which tests replace.

---

## Summary of AD changes

| AD | New or tightened | Closes |
|---|---|---|
| AD-14 Shared result contracts | new | H1, H5, H15 (types) |
| AD-15 Application write model | new | H3, H4, H22 |
| AD-16 Canonical text and hashing | new | H8 |
| AD-17 Client session contract | new | H13, H16 (before S6), H25 |
| AD-18 Run mode and auth surfaces | new (merges parts of AD-10 and AD-11) | H10, H11, H18 |
| AD-1 / AD-13 | tighten: Core returns message keys; prose only in AI content fields; `Result` types; one API client; the proxy is inside the contract | H6, H12, H14 |
| AD-2 / AD-3 | tighten: pure extract vs async `KeywordSource`; phase 2 is read-only; fingerprint and `ANALYSIS_STALE`; two named normalisers; retries resend inputs | H2, H7, H25 |
| AD-4 / AD-5 | tighten: wire vs guarded Gap schema; one Gap per Missing keyword; `AiResultMeta` envelope; Core-derived CV entry; `{{SIGNATUR}}` | H5, H7, H15, H21 |
| AD-6 | tighten: atomic reservation, no refunds, degraded success in phase 1, one `LogEvent` union, Core time functions | H9, H23, H26 |
| AD-9 | tighten: three column classes, no stored Verdict or Job ad hash, `encryptedJson(schema)`, seeding through services | H17, H20 |
| AD-10 | tighten: cookie names and keys, what the gate covers after S6, Profile created at registration, auth-library constraints | H11, H19 |
| AD-12 | tighten: cached promptVersion check in CI; generated cached index | H15, H24 |
