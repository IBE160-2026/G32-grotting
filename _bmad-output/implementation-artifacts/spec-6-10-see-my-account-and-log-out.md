---
title: 'See my account and log out'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_revision: '6b7e27c174e1dd63f71737d4e0204f49d66daa04'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-9-reopen-a-saved-application.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** With accounts on, `/konto` is a placeholder: a Student cannot see which email is logged in, how many entries the catalogue holds, how the data is stored, or log out except from the expiry warning. The `["profile"]`, `["applications"]` and `["session"]` caches in TanStack Query are not keyed on the Student.

**Approach:** With `FEATURE_ACCOUNTS` on, `/konto` shows the title, the stacked credits list («E-post», «Katalog»), «Logg ut» and «Slik lagres dataene dine» with the four mock lines. «Logg ut» posts `/api/auth/logout` at once (no confirmation), clears the client session with the existing `clearSessionForLogout` and `holdEnding`, empties the Query cache and loads Hjem with a full page load (so the app bar is the logged-out set). The expiry warning's «Logg ut» uses the same function. Flag off: nothing changes.

## Boundaries & Constraints

**Always:** Email and the entry count are read on the server from the session's `studentId` (`getStudentEmail`, `countApplications`); nothing decrypted. Texts in `messages.nb.ts`: «Konto», «E-post», «Katalog», «Logg ut», «Slik lagres dataene dine» and the four lines verbatim from mock S10 (`signal-varm.html`); no new promise about deletion or keeping. No password change, no account deletion. After a successful logout: `clearSessionForLogout` (keeps only Job ad, title, employer, Tone; CV draft, `lastEmail`, `applicationId`, `restoredAfterExpiry`, `noticeVersion` go), the Query cache is cleared, `holdEnding()` so a late `SESSION_EXPIRED` does not take over, `window.location.replace("/")`. A failed logout (network) keeps the page, shows the network alert, nothing cleared. Nothing new in `localStorage`/`sessionStorage`.

**Never:** Set `accounts` true in `FEATURE_DEFAULTS`; put `FEATURE_ACCOUNTS`, `ENCRYPTION_KEY`, `SECRETS_FILE` values in `compose.yaml`, `.env.example`, README; add a package; touch `package.json`, lockfile, `Dockerfile`, `compose.yaml`, `data/`, `drizzle/`, `scripts/setup.ts`, `scripts/migrate.ts`, `gaps-4`, cached fixtures, Answer keys; build 6.11/6.12; add a confirmation, password change, or deletion; touch Hosted; make a live AI call; weaken session expiry or `studentId` rules; `git add -A`, `git add .`, `git checkout --`, `git reset --hard`, `git clean`, `git stash`; write or commit in `.logs/`; log or print a token, hash, password or key.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Konto, entries | logged in, 2 Applications | h1 «Konto»; stacked credits «E-post» = email, «Katalog» = «2 søknader»; «Logg ut»; h2 and four lines | n/a |
| Konto, none | 0 Applications | «Katalog» = «Ingen søknader ennå» | n/a |
| Logg ut | press | `POST /api/auth/logout`, client session cleared except ad/title/employer/Tone, Query cache cleared, Hjem logged out (app bar «Hjem · Søknad · Logg inn · Registrer deg») | n/a |
| Logg ut fails | network down | busy ends, network alert, nothing cleared, stays on Konto | no redirect |
| Logg ut, session already gone | logout answers ok (route works without a session) | same as Logg ut | n/a |
| Another Student, same tab | A logs out, B registers/logs in | B's Profil, Historikk, app bar count show only B's data | n/a |
| Logged out visit | no cookie | redirect to Logg inn | n/a |
| Flag off | any | `/konto` 404, app bar and Hjem unchanged | n/a |

</intent-contract>

## Code Map

- `src/app/konto/page.tsx` -- replaces the placeholder: flag gate (404), `requireStudentPage`, session via `getPageSession`, email via `getStudentEmail` (new identity export), count via `countApplications`; renders `Account`.
- `src/modules/identity/ui/account.tsx` (new), `log-out.ts` (new), `index.ts` -- Konto UI; `logOutNow(queryClient)` = `POST /api/auth/logout`, on ok `holdEnding()`, `forgetSessionForLogout()`, `queryClient.clear()`. `session-watch.tsx` uses it for the warning's «Logg ut».
- `src/modules/identity/index.ts`, `server/students.ts` -- export `getStudentEmail` (read-only).
- `src/shared/ui/components/credits-list.tsx` -- `stacked` variant (rows divided by `border-rule`, UX-DR18).
- `src/shared/ui/messages.nb.ts` -- `account` strings replace `placeholderPage`.
- Reuse: `session-end.ts` (`holdEnding`, `forgetSessionForLogout`), `client-session.ts` (`clearSessionForLogout`), `use-history-count.ts` and `["profile"]`, `["session"]`, `["applications", …]` keys (cleared by `queryClient.clear()`), `Button`, `Alert`.
- Tests: `log-out.test.ts`, `credits-list`/`account` render test, `e2e/account.spec.ts` (new); `e2e/accounts-screens.spec.ts` "Konto placeholder" block replaced by the new page.
- Read-only: `sessions.ts`, logout route, `handle.ts`, `crypto.ts`, `proxy.ts`.

## Tasks & Acceptance

**Execution:**
- Files in the Code Map -- built by the parent; unit tests for `logOutNow` (cache emptied, storage reduced, failure keeps both), e2e for the matrix incl. axe at 1280 and 360 px, a second Student in the same tab, storage inspection.

**Acceptance Criteria:**
- Given the matrix, when `npm test` and `npm run typecheck` run, then all pass and every edited existing test is listed.
- Given `FEATURE_ACCOUNTS` off, when the app runs, then it behaves as after Epic 5 (`/konto` 404).
- Given Student A logged out and Student B logged in on the same tab, when B opens Profil, Historikk and the app bar, then none of A's data shows, and `sessionStorage` holds at most Job ad, job title, employer, Tone and B's own keys; `localStorage` is empty.

## Spec Change Log

## Review Triage Log

### 2026-11-25 - Review pass
- verdicts: 22 findings (blind 11, edge 8, verification-gap 3; intent-alignment descriptive) - high 0, medium 2, low 14, false 6, maybe-false 0
- findings:
  - `[medium]` `patch` Blind, edge: a query still on its way (the session view) could settle after the cache was cleared and write `lastEmail` back into the tab - `logOutNow` awaits `cancelQueries()` before `clear()`; unit test.
  - `[medium]` `patch` Blind, verification-gap: the `holdEnding()` moved into `logOutNow` is pinned by no test - unit test: `endSession` after `logOutNow` does not navigate.
  - `[low]` `patch` Verification-gap, edge claim: Konto's `SESSION_EXPIRED` branch and `Account` itself untested - e2e (401 on logout goes to Logg inn with the session-ended alert, no failure alert) and `account.test.ts` (render: title, credits, one button, four lines, no field, no deletion).
  - `[low]` `patch` Blind: `[...LOGGED_IN_BAR.slice(0, 3), ...]` rebuilds a constant in a confusing way - the constant is removed, the list written out.
  - `[low]` `reject` Blind: `holdEnding()` runs after the response, so a request in flight before it can answer 401 to Logg inn - the window is the logout round trip, and the Student is leaving anyway; setting it before would need a release on failure (new export for a negligible case).
  - `[false]` `reject` Blind, edge: a `SESSION_EXPIRED` answer to «Logg ut» clears nothing - `callApi` ends the session with a full page load to Logg inn, which drops the in-memory cache; the client session is kept on purpose (expiry semantics, Story 6.5).
  - `[false]` `reject` Blind: `/konto` checks the session twice and can loop - `getPageSession` is `cache()`d, so one lookup; Logg inn does not bounce logged-in visitors (tested in accounts-screens).
  - `[low]` `defer` Blind: the Back button after logout can show an earlier page of the last Student from the browser's back/forward cache - pre-existing for every Student page, not Konto (it is replaced by `location.replace`); written to issues.md.
  - `[low]` `reject` Blind: no focus or announcement check for the failure alert, busy never released on success - same pattern as the expiry warning; the page leaves on success.
  - `[low]` `reject` Blind: `text-ink-2` on the last storage line is by index and the test repeats the strings - the last line is the mock's muted one; the test pins the wording on purpose.
  - `[low]` `reject` Blind: tests assert `localStorage` empty and exactly one `sessionStorage` key - that is the AC («nothing else»); a later feature must update it knowingly.
  - `[low]` `reject` Blind: `stacked` tested for class presence only - markup-level checks are the style of `result-components.test.ts`; the e2e checks the rows stack.
  - `[low]` `reject` Blind: no test that the expiry-warning «Logg ut» empties the caches - both call `logOutNow` (unit-tested); the 6.5 e2e still covers the warning's flow.
  - `[false]` `reject` Edge: `forgetSessionForLogout` or `clear` throws after the server ended the session - `clearSessionForLogout` catches storage errors and `clear()` does not throw.
  - `[false]` `reject` Edge: bfcache restore leaves Konto busy with the email - `location.replace` removes the Konto entry, so it is not reachable by Back.
  - `[low]` `reject` Edge: every non-expired failure reads as the network alert - the same as the expiry warning's «Logg ut»; a refused logout is rare and the retry is harmless.
  - `[low]` `reject` Edge: a missing session between the two lookups redirects to Logg inn without the ended marker - the same `LOGIN_PATH` redirect as `requireStudentPage`.
  - `[low]` `reject` Edge claim: the spec lists an `account` render test the diff lacks - added now (`account.test.ts`).
  - `[low]` `reject` Edge claim: a failed logout does not leave storage untouched on `SESSION_EXPIRED` - spec text is not edited by triage; the matrix row is about a network failure, which is tested.
  - `[false]` `reject` Verification-gap, other: the same-tab e2e would pass without `queryClient.clear()`, because the page leaves with a full load - true, so the unit test with a hand-built client is what pins the clear; the e2e pins the Student-visible result (and no `/api` call after the click).
  - `[low]` `reject` Blind: `clear()` also drops `["session"]` and keys outside the intent's list - intended: nothing in the cache is the next Student's.
  - Intent layer (descriptive): reading A1 (server page and component), B1+B3 (button and expiry warning), C1 (explicit clear of the whole cache) and D3 (e2e and unit) implemented; the cache guarantee lives in the unit test, the Student-visible result in the e2e.

## Design Notes

Choices (the parent writes them to `issues.md`): «Katalog» shows the count («2 søknader»), not the mock's range, because the count route already exists and the range would need the list; the Query cache is cleared as a whole (`clear()`) rather than by key, since everything in it is the Student's and none of it is Student-keyed; the page leaves with `location.replace("/")`, as the expiry warning's «Logg ut» does.

## Verification

**Commands:**
- `npx biome check`, `npm run typecheck`, `npx vitest run <files>` -- expected: pass
- `npm test` -- expected: biome, tsc, vitest and Playwright pass

## Auto Run Result

Status: done

**Summary:** With `FEATURE_ACCOUNTS` on, `/konto` shows the title, the stacked credits list («E-post», «Katalog» with the entry count), «Logg ut» and «Slik lagres dataene dine» with the four lines of mock S10; no password change, no deletion. «Logg ut» (Konto and the expiry warning, now one `logOutNow`) posts `/api/auth/logout`, then `holdEnding()`, `clearSessionForLogout` (only Job ad, title, employer and Tone stay), cancels and clears the whole TanStack cache (Profile, `["applications"]` incl. count and detail, session view) and loads Hjem with a full page load. Email and count are read on the server from the session's `studentId`; nothing is decrypted. Flag off: `/konto` and the logout route are 404.

**Files:** `src/app/konto/page.tsx`; `src/modules/identity/ui/{account.tsx,log-out.ts,index.ts,session-watch.tsx}`, `src/modules/identity/index.ts` (exports `getStudentEmail`); `src/shared/ui/components/credits-list.tsx` (`stacked`), `src/shared/ui/messages.nb.ts` (`account` replaces `placeholderPage`); tests `log-out.test.ts`, `account.test.ts`, `result-components.test.ts` (addition), `e2e/account.spec.ts` (new, 12 cases incl. axe at 1280 and 360 px, same-tab second Student, storage inspection); `sprint-status.yaml`.

**Edited existing tests:** `e2e/accounts-screens.spec.ts` (the «Konto placeholder» block and `PLACEHOLDER_LINE` removed because the placeholder is replaced; the axe test renamed «Historikk and Konto at ...»); `result-components.test.ts` only gained a case.

**Review:** four layers; 22 findings; patches: `cancelQueries` before the clear (medium), `holdEnding` pinned by a unit test (medium), Konto's `SESSION_EXPIRED` branch and `Account` render tests, a test constant tidied; one deferred to issues.md (bfcache after Back); the rest rejected with reasons in the Review Triage Log. Follow-up review: not recommended.

**Verification:** `npm test` green after the patches: biome, tsc, vitest, Playwright 382 passed plus the one case fixed afterwards (my own new test's locator hit the route announcer; fixed and `e2e/account.spec.ts` rerun, 12 passed). The Docker test was not run (no protected path touched); `ci` is the criterion.

**Residual risks:** screen reader and a real 360 px phone not checked (issues.md); the same-tab e2e cannot see `queryClient.clear()` removed because the page leaves with a full load, the unit test pins it; the Back button can show an earlier page from the bfcache.
