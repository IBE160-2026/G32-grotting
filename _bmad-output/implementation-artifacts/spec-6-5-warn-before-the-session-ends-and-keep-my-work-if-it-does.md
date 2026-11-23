---
title: 'Warn before the session ends, and keep my work if it does'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: 'cdc566e63bfc044cd01bb5933d880821556423a2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-4-register-and-log-in-on-screen.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** A logged-in Student who steps away is logged out with no warning, the client never learns when the session ends, a request that gets 401 `SESSION_EXPIRED` leaves the page in a dead state (Profil shows an alert with no link, an upload shows the plain file-picker failure), and the unsaved CV text on Profil is not kept.

**Approach:** With `FEATURE_ACCOUNTS` on, `api-client` reads `X-Session-Expires-At` from every response into a small client clock; a watcher mounted in the layout (logged in only) renews the session on activity at most every 5 minutes, opens an `alertdialog` («Økten din avsluttes snart») on the shared dialog two minutes before the end, and ends the session on the client when it runs out. Any `SESSION_EXPIRED` (a request or the clock) saves the client session and loads «Logg inn» with the session-ended alert and the email prefilled; after login Søknad and Profil restore what the tab kept and say so.

## Boundaries & Constraints

**Always:** Strings in `messages.nb.ts`, verbatim from the AC. Only the keys the AC names go to `sessionStorage` (`ja.session.v1`, through `client-session.ts` only): Job ad, title, employer, Tone, `cvDraft`, `lastEmail`, `restoredAfterExpiry`; never a password, token or hash. Time is a parameter in the logic (`now`), so tests use fake time. One dialog at a time: the AI notice yields to the warning and reopens when it closes. Ending the session on the client is a full page load, so the app bar set and every cache start from the logged-out session. Flag off: nothing mounts, nothing changes.

**Never:** Set `accounts` true in `FEATURE_DEFAULTS`; put `FEATURE_ACCOUNTS`, `ENCRYPTION_KEY`, `SECRETS_FILE` values in `compose.yaml`, `.env.example`, README; add a package; touch `package.json`, lockfile, `Dockerfile`, `compose.yaml`, `data/`, `drizzle/`, `scripts/setup.ts`, `scripts/migrate.ts`, `gaps-4`, `data/fixtures/*/cached/*.json`, Answer keys; make a live AI call; touch Hosted; build the Konto logout screen (6.10) or Søknad's Profile use (6.6); weaken session expiry or the server; use `git add -A`, `git add .`, `git checkout --`, `git reset --hard`, `git clean`, `git stash`; write or commit in `.logs/`; print or log a token, hash, password or key.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clock | response with `X-Session-Expires-At` and `Date` | client deadline = now + (expires - server now); only a later deadline replaces one | missing or bad header: ignored |
| Warning due | now >= deadline - 2 min, < deadline | `alertdialog`, focus on «Fortsett økten» | n/a |
| Activity | key, pointer, input; >= 5 min since last extension (deadline - 30 min) and no attempt in 5 min | one `POST /api/session/renew` | failure: no retry before 5 min; warning still comes |
| Continue / Esc | warning open | renew, close, focus back to where it was | renew fails: dialog stays with the network alert |
| Logg ut | warning open | `POST /api/auth/logout`, client session cleared except ad, title, employer, Tone; Hjem | fails: dialog stays with the network alert |
| AI notice open | warning due | notice closes, warning opens, notice reopens after | n/a |
| Run out | now >= deadline, or any request answers `SESSION_EXPIRED` | flags set, full load of `/logg-inn?okt=utlopt`: alert, email prefilled | only once; none on `/logg-inn` and `/registrer` |
| After login | Søknad opens with `restoredAfterExpiry.soknad` and an ad | Job ad, title, employer, Tone back, «Vi tok vare på stillingsannonsen du limte inn.» once | no ad: no notice |
| After login | Profil opens with `restoredAfterExpiry.profil`, `cvDraft` differing from the saved text | draft in the field, «Vi tok vare på endringene du ikke hadde lagret.» once | same as saved: no notice |
| Profil edit | typing, then «Lagre» ok | `cvDraft` follows the field; cleared on a save of the same text | n/a |
| 401 mid-save or mid-upload | `PUT /api/profile`, `/api/cv/extract` | same path as any `SESSION_EXPIRED` (no filvelger-feil, no linkless alert) | n/a |
| Flag off | any | no watcher, no `/api/session` request | n/a |

</intent-contract>

## Code Map

- `src/shared/ui/session-clock.ts` (new) -- pure `deadlineFrom`, `phaseAt`, `renewDue`, constants; store `{deadline, warningOpen}` with `useSyncExternalStore` hooks; `noteSessionHeaders(headers)`.
- `src/shared/ui/session-end.ts` (new) -- `endSession()` saves flags, full load to Logg inn; `clearForLogout`.
- `src/shared/ui/api-client.ts` -- reads the header, calls `endSession` on `SESSION_EXPIRED`.
- `src/shared/ui/client-session.ts` -- `lastEmail`, `restoredAfterExpiry {soknad, profil}`, `cvDraft` removal, `clearSessionForLogout`.
- `src/shared/ui/components/dialog.tsx` -- `role`, `initialFocusRef`.
- `src/modules/identity/ui/{expiry-warning.tsx,session-watch.tsx}` (new), `login-form.tsx`, `index.ts`; `src/app/{layout.tsx,logg-inn/page.tsx}`.
- `src/modules/ai/ui/ai-notice.tsx` -- yields to the warning.
- `src/modules/application/ui/application-form.tsx` (notice), `src/modules/profile/ui/profile-page.tsx` (draft, restore, no linkless alert), `src/modules/cv/ui/cv-input.tsx` (upload 401).
- `playwright.config.ts` -- a Test-mode-off accounts server (port 3109) so the AI notice shows; tests `e2e/session-expiry.spec.ts`, `e2e/profile.spec.ts` (the 401 test now sees Logg inn).
- Read-only: `sessions.ts`, `handle.ts`, `handle-student.ts`, session routes, `crypto.ts`, `proxy.ts`.

## Tasks & Acceptance

**Execution:**
- Files in the Code Map -- built by the parent.
- `session-clock.test.ts`, `session-end.test.ts`, `api-client.test.ts`, `client-session.test.ts` additions -- unit tests for each matrix row that is logic
- `e2e/session-expiry.spec.ts` -- `page.clock`: warning, continue, Esc, Logg ut, run out, restore, AI notice replaced, axe on the dialog

**Acceptance Criteria:**
- Given the matrix, when `npm test` and `npm run typecheck` run, then all pass, and the only existing test edited is the Profil 401 one the new path replaces.
- Given `FEATURE_ACCOUNTS` off, when the app runs, then it behaves as after Epic 5.

## Spec Change Log

## Review Triage Log

### 2026-11-23 - Review pass
- verdicts: 41 findings (blind 13, edge 14, verification-gap 5, intent-alignment descriptive) - high 0, medium 3, low 9, false 4, rest rejected as by design or negligible
- findings:
  - `[medium]` `patch` effect cleanup set the clock store to "warning closed" while the dialog stayed open, so the AI notice could open under it (blind, edge) - the store is cleared only when the watcher unmounts.
  - `[medium]` `patch` another Student logging in or registering on the same tab got the first Student's ad and draft (edge) - `forgetOtherStudentsWork(email)` drops the whole client session when `lastEmail` differs; unit and e2e tests.
  - `[medium]` `patch` a draft typed on Søknad (same `cvDraft` key until 6.6) was offered on Profil (blind, edge, gap) - `profil` is flagged only when the session ended on `/profil`; tests.
  - `[low]` `patch` renew answered ok without the header: the warning reopened at once (blind, edge) - the deadline moves to now + 30 minutes when the header did not move it.
  - `[low]` `patch` «Logg ut» answered SESSION_EXPIRED showed the network alert while the page left (edge) - no alert for that code.
  - `[low]` `patch` after a deliberate logout a request answering SESSION_EXPIRED would send the Student to Logg inn instead of Hjem (edge) - `holdEnding()`; unit test.
  - `[low]` `patch` the `ending` latch survived a bfcache restore (blind, edge) - reset on `pageshow` when persisted.
  - `[low]` `patch` the wheel did not count as activity (blind) - `wheel` added.
  - `[low]` `patch` no test of a failing renew or logout, the 5-minute throttle after a failure, activity in the open warning, or a draft equal to the saved text (gap, blind) - four e2e tests added; the idle-named test renamed.
  - `[low]` `patch` `ExpiryWarning` exported from `identity/ui` though only used inside it (blind) - export removed.
  - `[low]` `reject` Profil renders nothing when the load answers SESSION_EXPIRED and navigation did not happen (blind, edge) - `callApi` always navigates; the bfcache case is covered by the `pageshow` reset; the story removes the linkless alert.
  - `[low]` `reject` deliberately emptied draft is not restored (edge) - the saved text returns; «Lagre» is unavailable on an empty field, so nothing deliberate is lost.
  - `[low]` `reject` abandoned Profil draft revived by a later expiry on Profil (blind, edge) - it is text the Student typed on Profil in this tab; clearing it on leave would wipe Søknad's draft before 6.6.
  - `[low]` `reject` `lastEmail` prefilled on a later visit without the marker (edge) - it is cleared at logout and only exists while the tab holds a logged-in session.
  - `[low]` `reject` Logg inn does not focus Passord and `?okt=utlopt` stays on reload (blind) - not in the AC; a reload showing the same text is harmless.
  - `[low]` `reject` client constants duplicate the server's 30 and 5 minutes; text says «2 minutter» (blind) - the AC fixes the text; a shared source would put `sessions.ts` (server-only) into the client bundle.
  - `[low]` `reject` `Date` header skew, slow hydration, unparseable `expiresAt` (blind, edge) - at most a second or two; the value comes from the server as ISO text.
  - `[false]` `reject` flag off: `callApi` still reads headers and may call `endSession` (edge) - without accounts no response carries the header and no route answers SESSION_EXPIRED; the e2e flag-off test shows no session request.
  - `[false]` `reject` a client-side push after login would leave the watcher unmounted (blind) - login and registration end in `window.location.replace`.
  - `[low]` `reject` the AC says one existing test was edited, but `api-client.test.ts` `afterEach` and `playwright.config.ts` changed too (blind) - no assertion was changed; the spec text is not edited by triage.
  - `[low]` `reject` misc test style (duplicated `memoryStorage`, an unrelated `expect(SESSION_KEY)`, `waitForTimeout` in negative checks, `oversized` warning) (blind) - cosmetic; a negative check needs real time.
  - `[false]` `reject` GET `/api/session` on each load is not in the intent (intent-alignment) - AD-12 names it and the email for `lastEmail` comes from it.
  - Intent layer (descriptive): reading A2/B2/C1/D1/E1 implemented; the clock moves browser time only, so tests end the server session by hand where the logged-out app bar is checked; no end-to-end check of the `Date` header offset or of focus after the AI notice reopens.

## Design Notes

Choices (the parent writes them to `issues.md`): the layout hands the watcher the session end (`expiresAt`) at page load; later values come from response headers, `GET /api/session` (key `['session']`, for the email) and `POST /api/session/renew`. A session can end up to 5 minutes sooner than 30 minutes after the last key press, because renewal is throttled to once per 5 minutes. While the warning is open, activity does not renew; only «Fortsett økten» or Esc does. Another tab's renewal is not seen (no cross-tab sync), so an idle tab can show the warning for a session that is still alive. Profil writes `cvDraft` on every edit; Søknad uses the same key until 6.6.

## Verification

**Commands:**
- `npm run typecheck`, `npx biome check`, `npx vitest run <files>` -- expected: pass
- `npm test` -- expected: vitest, biome, tsc, Playwright all pass

## Auto Run Result

Status: done

**Summary:** With `FEATURE_ACCOUNTS` on, a logged-in Student gets an `alertdialog` («Økten din avsluttes snart») two minutes before the session ends, timed from `X-Session-Expires-At` (read by `api-client` into a small client clock, first value from the layout). Key, pointer, wheel and input events renew the session at most every 5 minutes; «Fortsett økten» and Esc call `POST /api/session/renew` and give focus back; «Logg ut» logs out and clears the tab except the ad, title, employer and Tone. The AI notice yields to the warning and reopens after it. When the warning runs out or any request answers `SESSION_EXPIRED`, `api-client` marks what to restore and loads «Logg inn» (full page load, `?okt=utlopt`) with the alert and the email prefilled; after login Søknad and Profil restore what the tab kept and say so once. Upload and save 401s take the same path. With the flag off nothing mounts.

**Files:** `src/shared/ui/{session-clock,session-end}.ts`, `api-client.ts`, `client-session.ts`, `components/dialog.tsx`, `messages.nb.ts`; `src/modules/identity/ui/{expiry-warning,session-watch}.tsx`, `login-form.tsx`, `register-form.tsx`; `src/app/{layout.tsx,logg-inn/page.tsx}`; `src/modules/{ai/ui/ai-notice,application/ui/application-form,profile/ui/profile-page,cv/ui/cv-input}.tsx`; `playwright.config.ts` (tenth server, port 3109: accounts on, Test mode off); tests `session-clock.test.ts`, `session-end.test.ts`, additions to `api-client.test.ts` and `client-session.test.ts`, `e2e/session-expiry.spec.ts`; edited `e2e/profile.spec.ts` (the 401 test now sees Logg inn) and `e2e/accounts-screens.spec.ts` (one `networkidle` wait before the API logout: a request that finds the session gone now leaves the page).

**Review:** four layers; 10 patch entries applied (3 medium: store cleared while the dialog stayed open, another Student's work shown after login on the same tab, a Søknad draft offered on Profil; 7 low), the rest rejected with reasons in the Review Triage Log.

**Verification:** `npm test` green: biome, typecheck, vitest 1619 passed (2 expected fail), Playwright 327 passed. The Docker test was not run (no protected path touched); `ci` is the criterion.

**Residual risks:** the clock moves in the browser only, so the real 30 minutes, a screen reader on the dialog and a real phone at 360 px are not checked (issues.md). A session renewed in another tab is not seen here. A session can end up to 5 minutes sooner than 30 minutes after the last key press.
