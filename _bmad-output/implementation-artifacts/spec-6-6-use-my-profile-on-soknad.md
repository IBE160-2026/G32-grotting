---
title: 'Use my Profile on Søknad'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: 'd7fb73eaca3d0fc02e295364778128f1b6a6cdfe'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-5-warn-before-the-session-ends-and-keep-my-work-if-it-does.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** A logged-in Student still has to paste the CV on every Søknad, accepts the AI notice once per browser session, is counted against the installation's Daily cap, and gets a Letter signed `[Navnet ditt]` with a name-less file name.

**Approach:** With `FEATURE_ACCOUNTS` on, Søknad takes the CV text from the Profile query (a read-only disclosure, or a «no CV yet» notice that makes submit unavailable), the AI notice is accepted once per account (`POST /api/profile/ai-notice` stores the version on the Profile and the server reads consent from there), every `/api/analyses*` route requires a live session and passes the session's `studentId` to `runAi` (cap per Student), and the Profile name signs the Letter on screen, in the copy and in the .docx file name. With the flag off nothing changes.

## Boundaries & Constraints

**Always:** `studentId` comes from the session (`handleStudent`), never from a body, query or URL; a body `studentId` or `consent` is ignored when accounts are on. Server consent = `profiles.ai_notice_version` of that session's Student (null = not accepted); Test mode still skips the check. Strings in `messages.nb.ts` (bokmål), verbatim from the AC where the AC gives them. Søknad with accounts on never writes `cvText`, `cvDraft` or `noticeVersion` to `sessionStorage` (the CV lives only in the TanStack cache and component state; the example override is component state only). Flag off: every behaviour, test and screen as after Epic 5/6.5 (no CV disclosure, session-based notice, `[Navnet ditt]`, `studentId: null`, no session required on `/api/analyses*`). Reuse `renderLetter`, `letterFileName`, `segmentLetter(…, name)`, the shared `Dialog`, `Notice`, `Link`, `SkeletonRows`, `callApi`. Plain columns allowed: `ai_notice_version`, the new `cv_saved_at` timestamp; the CV text and name stay `encryptedText`.

**Never:** Set `accounts` true in `FEATURE_DEFAULTS`; put `FEATURE_ACCOUNTS`, `ENCRYPTION_KEY`, `SECRETS_FILE` values in `compose.yaml`, `.env.example`, README; add a package; touch `package.json`, lockfile, `Dockerfile`, `compose.yaml`, `data/`, `scripts/setup.ts`, `scripts/migrate.ts`, `gaps-4`, `data/fixtures/*/cached/*.json`, Answer keys; edit an existing migration; make a live AI call (e2e on the Test-mode-off server must stub the browser's phase-2 requests with `page.route`, never let the server reach a provider); touch Hosted; build 6.7 (no Application rows, no `JA-NNN`); loosen `canonVerbatim`, `checkCitation`, FR-15/FR-17 checks, encryption, session expiry or the `studentId` rule; log, print or store a CV text, name, token, hash or key; `git add -A`, `git add .`, `git checkout --`, `git reset --hard`, `git clean`, `git stash`; write or commit in `.logs/`; skip, delete or loosen an existing test to get green (an existing test whose subject this story changes by AC may be edited minimally; list each).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Saved CV | accounts on, Profile has `cvText` | CV slot is a closed native `<details>`: summary «CV-tekst fra Profil», mono meta «{antall} tegn · {dato}» (date from `cv_saved_at`, omitted when null); opened: read-only text and «Du endrer den i Profil» as a link to `/profil`; no file picker, no «Bekreft CV-teksten»; `cvText` for requests = Profile text | n/a |
| Loading / failed load | Profile query pending / failed | skeleton rows, submit unavailable / network `Alert`, submit unavailable | `SESSION_EXPIRED` goes through `callApi` as in Profil |
| No CV | accounts on, `cvText` null | `Notice` «Du har ikke lagt inn CV-en din ennå.» with link «Gå til Profil» in place of the disclosure; submit button `disabled` | n/a |
| Example override | «Bruk eksempelet» (accounts on) | fills title, employer, ad and a one-off CV override held in memory; slot shows the same kind of disclosure titled «CV-tekst fra eksempelet» with hint «Bare til denne søknaden. Profilen din er ikke endret.»; submit available even with no Profile CV; Profile unchanged, nothing CV-like in `sessionStorage` | n/a |
| Notice, first time | accounts on, not Test mode, `profile.aiNoticeVersion` != current | dialog on submit as today; «Godta og fortsett» calls `POST /api/profile/ai-notice {noticeVersion}`; on success the cache holds the version, phase 1 starts | POST fails: notice closes, network `Alert` on the form, nothing sent; next submit asks again |
| Notice, later | version stored on Profile | no dialog on any later submit, in any tab or session | n/a |
| `POST /api/profile/ai-notice` | live session, body version == `config.aiNotice.version` | stores it on the session Student's Profile, answers `{ noticeVersion }` | other version or bad body: `INVALID_INPUT` field `noticeVersion`, nothing stored; no/dead session `SESSION_EXPIRED`; flag off `NOT_FOUND` |
| Server consent | `/api/analyses`, `/letter`, `/gaps` with accounts on | `runAi` ctx = `{ studentId: session, consent: profile.ai_notice_version ? { noticeVersion } : null }`; body `consent` ignored | not accepted: `AI_NOTICE_REQUIRED` as today |
| Other Student | Student B's session after A accepted | B has no consent (`AI_NOTICE_REQUIRED` unless Test mode); A's Daily cap row is `scope = A`, B's calls reserve `scope = B`; A at the cap does not stop B | n/a |
| Session required | accounts on, `/api/analyses*` with no cookie / a cookie that is no live session | no cookie: proxy 401 `SESSION_EXPIRED`; bogus cookie: route answers `SESSION_EXPIRED` and runs nothing | accounts off: unchanged (no session, `studentId: null`, body consent) |
| Letter signed | accounts on, Profile name | on-screen sign-off, copied text and .docx all carry the Profile name; file name `violet-hansen-soknadsbrev-nordic-digital-2026.docx` | accounts off: `[Navnet ditt]` and a name-less file name |
| Save date | `PUT /api/profile` | `cv_saved_at` = now in the same statement; `GET`/`PUT` views carry `cvSavedAt` (ISO or null) and `aiNoticeVersion` | n/a |

</intent-contract>

## Code Map

- `src/modules/profile/server/schema.ts` -- add `cvSavedAt: timestamp("cv_saved_at", { withTimezone: true })` (nullable, plain). Migration `drizzle/0005_*.sql` (+ snapshot, journal) via `NODE_OPTIONS=--conditions=react-server npm run db:generate` (db:generate fails without it, see issues.md); then `npm run db:check` if it works. Do not hand-edit old migrations.
- `src/modules/profile/contracts.ts` -- `profileViewSchema` gains `cvSavedAt: z.string().nullable()` and `aiNoticeVersion: z.string().nullable()`; add `aiNoticeRequestSchema = z.object({ noticeVersion: z.string() })`.
- `src/modules/profile/server/repository.ts` -- `getProfile` and `saveCvText` return the new fields (`saveCvText` sets `cvSavedAt: new Date()`); new `saveNoticeVersion(studentId, db, version)` (update by `student_id`, null when no row); keep `getProfileSummary` (profiles.ts) as the consent source. Export through `src/modules/profile/index.ts` (and `contracts`).
- `src/app/api/profile/ai-notice/route.ts` (new) -- `POST` via `handleStudent`; compares body version to `getConfig().aiNotice.version`; `export const dynamic = "force-dynamic"`.
- `src/modules/identity/server/handle-student.ts` (+ `index.ts`) -- add `handleCaller(route, fn)`: with accounts on it is `handleStudent`, with them off the plain `handle` whose `ctx.session` is `undefined`; the switch is per request (flag read at run time, as `src/app/api/cv/extract/route.ts` does). Add `src/modules/identity/server/ai-caller.ts`: `aiContextFor(session | undefined, bodyConsent, db)` returning `AiContext` (`import type` from `@/modules/ai`): no session = `{ studentId: null, consent: bodyConsent }`; session = `{ studentId, consent from getProfileSummary(...).noticeVersion }`, a missing Profile throws `ApiError("SESSION_EXPIRED")`. Export both.
- `src/app/api/analyses/route.ts`, `[id]/letter/route.ts`, `[id]/gaps/route.ts`, `[id]/letter-check/route.ts` -- replace `handle(...)` with `handleCaller(...)`; pass `await aiContextFor(ctx.session, consent)` where they now build `{ studentId: null, consent }` (phase 1 passes it as `ai: { ctx }`). Letter-check makes no AI call but still needs the session. `/api/cv/extract` already uses `handleStudent` with accounts on: leave it. Read-only: `src/proxy.ts`, `session-gate.ts` (the proxy only checks a cookie exists; the routes now check it is live).
- `src/modules/ai/server/run-ai.ts`, `daily-cap.ts` -- read-only: scope is already `studentId ?? 'installation'`.
- `src/modules/profile/ui/use-profile.ts` (new) -- move `PROFILE_KEY`, `ProfileRequestError` and the `useQuery` out of `profile-page.tsx`: `useProfile({ enabled })`; `useAcceptAiNotice()` (mutation `callApi("/api/profile/ai-notice", …)`, on success `setQueryData` of the profile with the version). Export from `profile/ui/index.ts`. `profile-page.tsx` uses the shared hook, behaviour unchanged.
- `src/modules/application/ui/cv-disclosure.tsx` (new) -- the `<details>` (outlined, `min-h-[56px]` summary, amber chevron that rotates 90° when open, per DESIGN.md `cv-disclosure`), read-only `<textarea readOnly>` with accessible name, hint with the link; plus the no-CV `Notice` with `Link kind="standalone"` to `/profil`. Date formatted like `DATE` in `application-form.tsx` («17. nov. 2026»).
- `src/modules/application/ui/application-form.tsx` -- with `runMode.features.accounts`: `useProfile`; `cv` slot = skeleton / alert / notice / disclosure as the matrix says; `cvText` = override ?? Profile text; skip `restoreCv`, `changeCv`, `confirmCv` and every `cvDraft`/`cvText` session write; `fillExample` sets the override instead of the CV state; submit `disabled` unless a CV text exists; `inputErrors`/`cvSubmitError` not applied to a missing confirmation; notice: `noticeRequired(runMode, acceptedNotice())` where `acceptedNotice()` reads `queryClient.getQueryData(PROFILE_KEY)?.aiNoticeVersion` with accounts on, `readSession().noticeVersion` otherwise; `acceptNotice` awaits `useAcceptAiNotice` when accounts are on (failure = alert, nothing sent), otherwise writes `noticeVersion` as today. Pass `name` (Profile name or `null`) to `ResultView`. Flag off: the form is byte-for-byte the old flow.
- `src/modules/application/ui/use-phase-two.ts` -- new optional option `acceptedNotice?: () => string | undefined` (default `() => readSession().noticeVersion`) used at the four `consentFor(runMode, readSession().noticeVersion)` sites. `result-view.tsx` passes `name` to `LetterSection`.
- `src/modules/letter/ui/{letter-section,letter-view,letter-actions,download-letter,build-docx}.ts(x)` -- optional `name: string | null = null`: `segmentLetter(text, flags, name)`, `renderLetter(text, name)`, `downloadLetter(text, employer, name, year)` -> `letterFileName({ employer, year }, name)`, `buildLetterDocx(text, name)` / `letterParagraphs(text, name)`. Default `null` keeps every current call and test valid.
- `src/shared/ui/session-end.ts` -- simplify: `profil: hasText(inputs.cvDraft)` (Søknad no longer writes `cvDraft` with accounts on, the only mode where `endSession` runs); drop the pathname condition and its comment; update `session-end.test.ts` and the e2e test "a draft typed on Søknad is not offered on Profil" (Søknad has no CV field now: replace it with a test that Søknad with accounts on writes no `cvDraft`/`cvText` while the user types the ad and uses the example).
- `src/shared/ui/messages.nb.ts` -- `application.cvDisclosure` (`summary` «CV-tekst fra Profil», `exampleSummary` «CV-tekst fra eksempelet», `hint` «Teksten hentes fra Profil.», `editLink` «Du endrer den i Profil», `exampleHint`, `meta(count, date)`), `application.noCv` (`text` «Du har ikke lagt inn CV-en din ennå.», `link` «Gå til Profil», `label`, e.g. «CV mangler»).
- Tests (new): `src/app/api/profile/ai-notice/route.test.ts`; accounts-on route tests beside each analyses route (`route.accounts.test.ts`, pattern of `src/app/api/profile/route.test.ts`: mock `getConfig`, register/login through the routes); `identity/server/ai-caller.test.ts`; repository tests for the new fields and `saveNoticeVersion`; `build-docx`/`letter-ui` additions for the name; `e2e/soknad-profile.spec.ts` (ports 3107 Test mode and 3109 Test-mode-off, see `session-expiry.spec.ts` for `signIn`/axe helpers; the 3109 tests stub `**/api/analyses/*/letter` with `page.route` so no provider is reached). Existing tests to edit minimally because their subject changed by AC: the `toEqual` view shapes in `src/app/api/profile/route.test.ts`, `src/modules/profile/server/repository.test.ts`, and any e2e that mocks `GET /api/profile` (`e2e/profile.spec.ts` routes at ~99, 284 return a view: add the two fields if the page needs them), `session-end.test.ts`, the one Søknad-CV e2e named above. Nothing else.
- Read-only references: `epic-6-context.md`, UX `EXPERIENCE.md` (Key strings, CV disclosure) and `DESIGN.md` (`cv-disclosure`), `src/shared/ui/components/{notice,link,skeleton-rows,dialog}.tsx`, `src/modules/cv/ui/cv-input.tsx` (stays for flag off and Profil).

## Tasks & Acceptance

**Execution:**
- Files in the Code Map, in the order: schema + migration, profile contracts/repository, ai-notice route, `handleCaller` + `aiContextFor`, the four analyses routes, the profile UI hook, the disclosure, the form, phase two, Letter name, messages, session-end.
- Unit and route tests for every matrix row that is logic; `e2e/soknad-profile.spec.ts`: no-CV notice and disabled submit; disclosure closed/open with count, date, read-only text and link; example override does not change the Profile (`GET /api/profile` before/after) and writes no CV to `sessionStorage`; notice once per account (accept, reload, submit: no dialog; `GET /api/profile` shows the version); Letter sign-off and download file name (`<slug-of-name>-soknadsbrev-nordic-digital-<year>.docx`) in Test mode on 3107 with the Example CV saved to the Profile via `PUT /api/profile`; axe on Søknad (disclosure closed and open, no-CV state) at 1280 and 360 px.

**Acceptance Criteria:**
- Given the matrix, when `npm test` and `npm run typecheck` run, then all pass and every edited existing test is listed in the result.
- Given `FEATURE_ACCOUNTS` off, when the app runs, then Søknad, the AI notice, the Letter and `/api/analyses*` behave exactly as after Epic 5 (existing tests unchanged and green).
- Given another Student's session, when they call a phase-2 route, then they neither get the first Student's consent nor count against the first Student's cap.
- Given the migration, when `docker compose run --rm --build test` runs, then it is green (or `ci` is the criterion if Docker Desktop misbehaves as in 6.3; do not raise timeouts).

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 23 findings — high 0, medium 2, low 18, false 3, maybe-false 0 (intent-alignment is descriptive)
- findings:
  - `[medium]` `patch` Avbryt/Esc while the notice POST is in flight lets the late result resume a cancelled request and blocks a second accept (blind, edge) — counter bumped in `cancelNotice`; the late result is ignored.
  - `[low]` `patch` a failed notice save leaves `failed` set under the result view, so a stale alert shows after «Endre annonsen» (edge) — `setFailed(false)` in `backToForm`.
  - `[medium]` `patch` nothing pins which CV text `/api/analyses` carries with accounts on, example override versus Profile (verification-gap) — two e2e assertions on the request body.
  - `[low]` `patch` the SESSION_EXPIRED notice test asserts against a hard-coded "notice-3" (blind) — asserts the stored version instead.
  - `[low]` `reject` example override has no way back, and submit needs the Profile load (blind, edge x2) — «once» is per form instance by design (Design Notes); the name on the Letter needs the Profile.
  - `[low]` `reject` failed Profile load has no retry button (blind) — a reload retries; not in the AC.
  - `[low]` `reject` stale per-tab cache can re-ask the notice or send an old CV (blind, edge x2) — the POST is idempotent; Søknad refetches on mount; saving on Profil updates the same cache.
  - `[low]` `reject` stale/older notice version untested (blind) — `noticeRequired` compares to the running version; same logic as before 6.6.
  - `[low]` `reject` session-expiry e2e seeds `sessionStorage` directly (blind) — the test is about what logout drops, and Søknad no longer writes the keys.
  - `[low]` `reject` old Profiles show no save date, no `accepted_at` column (blind) — AC names no backfill or consent log; the column is nullable by design.
  - `[low]` `reject` disabled submit has no `aria-describedby` (blind) — the notice with the reason sits directly above it; not in the AC.
  - `[low]` `reject` `downloadLetter` takes `name` before `year`, extra Profile query per phase-2 call, long doc line (blind) — the one caller was updated and typecheck covers it; one indexed lookup; biome passes.
  - `[low]` `reject` `cv_saved_at` uses the app clock (edge) — same clock as every other timestamp the app writes.
  - `[low]` `reject` expired session during the notice POST untested (verification-gap) — the guard exists and the server side is tested; cosmetic.
  - `[false]` `reject` focus is lost after a failed notice save (edge) — `Dialog` returns focus to `returnFocusRef` whenever it closes.
  - `[false]` `reject` claims «Notice later» holds in every tab / form Alert reaches phase-2 notices (edge claims) — covered by the rows above; the phase-2 alert is raised through `cancelHeld`.
  - Intent layer (descriptive): reading A1/A3 implemented (routes check the session; the proxy only checks a cookie exists), B2 (cap isolation proven at helper and route-ctx level, not through a real route), C1 (name from the client Profile query), D1 (example enables submit without a Profile CV), E1 (new `cv_saved_at`).

## Design Notes

Choices (the parent writes them to `issues.md`): the save date needs a new plain `profiles.cv_saved_at` column (no column held it); `ai_notice_version` already exists. «Bruk eksempelet» overrides the CV for the lifetime of the form instance, held in memory only, never in `sessionStorage`, never saved to the Profile; reload returns to the Profile CV. With accounts on, Søknad has no CV editor (the AC makes the Profile the only place to edit it). Accepting the notice in Test mode is never asked and so never stored. The heading stays «Ny søknad» (the `JA-NNN` numbers belong to 6.7). Phase 2 stays stateless in 6.6 (no Application rows), so cross-Student exposure is limited to consent and cap, which the tests cover.

## Verification

**Commands:**
- `npm run typecheck`, `npx biome check`, `npx vitest run <changed files>` -- expected: pass
- `npm test` -- expected: biome, tsc, vitest and Playwright all pass
- `docker compose run --rm --build test` -- expected: pass, or documented as in 6.3

## Auto Run Result

Status: done

**Summary:** With `FEATURE_ACCOUNTS` on, Søknad takes the CV from the Profile (closed `<details>` «CV-tekst fra Profil» with count and save date, or «Du har ikke lagt inn CV-en din ennå.» with submit unavailable); «Bruk eksempelet» is a one-off in-memory CV override. The AI notice is accepted once per account (`POST /api/profile/ai-notice`), the server reads consent from `profiles.ai_notice_version`, `/api/analyses*` require a live session (`handleCaller`) and pass the session's `studentId` to `runAi` (cap per Student). The Profile name signs the Letter on screen, in the copy and in the .docx file name. Flag off: unchanged.

**Files:** migration `drizzle/0005_bitter_beast.sql` (`profiles.cv_saved_at`); `src/modules/profile/{contracts,index}.ts`, `server/{schema,repository}.ts`, `ui/{use-profile.ts,index.ts,profile-page.tsx}`; `src/app/api/profile/ai-notice/route.ts`; `src/modules/identity/server/{handle-student,ai-caller}.ts`, `index.ts`; the four `src/app/api/analyses*` routes; `src/modules/application/ui/{application-form,cv-disclosure,result-view,use-phase-two}`; `src/modules/letter/ui/*` (name); `messages.nb.ts`; `session-end.ts`; tests listed in the Code Map plus `test/accounts-kit.ts`.

**Review:** four layers; 4 patches applied (2 medium, 2 low), the rest rejected with reasons in the Review Triage Log. Follow-up review: not recommended.

**Verification:** biome and typecheck green; vitest 1670 passed (2 expected fail); Playwright 344 passed. Docker test run once locally: 140 of 142 files passed, two workers killed with SIGKILL (container memory), no assertion failures; `ci` is the criterion.

**Residual risks:** a screen reader on the disclosure and a real phone at 360 px are not checked (issues.md). A stale tab can re-ask the notice once. The migration adds a nullable column; CVs saved before it show no date.
