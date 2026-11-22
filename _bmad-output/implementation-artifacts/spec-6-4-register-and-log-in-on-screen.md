---
title: 'Register and log in on screen'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_revision: 'dfa8b64c4f3d5fb47a6210ec12c9ddf8c35887b2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-2-register-log-in-and-log-out-through-the-api.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-3-keep-my-cv-in-profil.md'
warnings: ['oversized']
deferred:
  - summary: >-
      The app bar's logged-in or logged-out set is computed in the root layout, which Next does not re-render on soft navigation, so it can be stale after the session ends in the same tab.
    evidence: |-
      A page that redirects to Logg inn after expiry can still show the logged-in bar until a full load. Login, registration and a direct visit are full loads and are correct; client-side expiry handling is Story 6.5 and the logout screen is Story 6.10.
    location: >-
      src/app/layout.tsx
    severity: low
---

<intent-contract>

## Intent

**Problem:** A Student can register, log in and keep a CV only through the API (6.2, 6.3): there is no screen to start an account or come back to it, the app bar knows nothing about accounts, and a logged-out visitor can open Student pages.

**Approach:** With `FEATURE_ACCOUNTS` on, add `/registrer` and `/logg-inn` (forms in `identity/ui/`, built on the existing text field, password toggle, button, link and `callApi`), let the server pick the app bar item set and Hjem's button target from the session, and redirect a logged-out visitor of Søknad, Profil, Historikk and Konto to Logg inn. Historikk and Konto are plain placeholder pages until 6.8 and 6.10. With the flag off the app is exactly as after Epic 5.

## Boundaries & Constraints

**Always:** All strings bokmål in `messages.nb.ts`, verbatim from the AC. No new package. The session is read on the server only (`getPageSession`, once per request via React `cache`, same `lookupSession` as the API); the client learns it as the `account` prop of `AppBar` and by a full page load after login (the page reloads, so app bar, Hjem and caches start from the new session). Server errors go in the field's error slot, focus moves there, the error is announced in the polite action region, the email (and password) stay as typed, validation runs on blur and submit only. The login error is one text on the password field and never says which part was wrong. Registration calls `register`, then `login` (register does not log in), then goes to Profil; login goes to Søknad. «Tilgangskode» only when `useRunMode().hosted`. Both pages answer NOT_FOUND while accounts are off. axe passes at 1280 px and 360 px.

**Never:** Set `accounts` true in `FEATURE_DEFAULTS`; put `FEATURE_ACCOUNTS`, `ENCRYPTION_KEY` or `SECRETS_FILE` values in `compose.yaml`, `.env.example` or README; change behaviour with the flag off (the app bar, Hjem, Søknad, the `/tilgang` gate); edit an existing test to get green (the one `/profil` test that expects the session-ended alert for a logged-out visit is replaced because 6.4's AC changes that behaviour); build a logout screen (6.10), expiry warning (6.5) or Søknad's Profile use (6.6); touch `gaps-4`, `data/fixtures/*/cached/*.json`, Answer keys, `package.json`, the lockfile, `Dockerfile`, `compose.yaml`, `data/`, `drizzle/`, `scripts/setup.ts`, `scripts/migrate.ts`; make a live AI call; touch Hosted (Vercel); use `git add -A`, `git add .`, `git checkout --`, `git reset --hard`, `git clean`, `git stash`; write or commit in `.logs/`; run docker; print or log a password, token, hash or key.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Flag off | `/registrer`, `/logg-inn`, `/historikk`, `/konto` | 404 not-found page; app bar, Hjem, Søknad unchanged | existing tests unedited |
| Register screen | accounts on, local | h1 «Registrer deg»; Navn (`autocomplete=name`), E-post (`type=email`), Passord (`new-password`, hint, «Vis»/«Skjul»), trust line, link «Har du allerede en konto? Logg inn»; no «Tilgangskode» | n/a |
| Register on Hosted | accounts on, hosted | also «Tilgangskode» (password type, toggle) | too short: «Koden har minst 16 tegn.» before any request; wrong: «Feil tilgangskode.» on the field |
| Register ok | valid fields | register, then login, then Profil (full load), app bar logged in | login fails after register: alert, a second press only logs in |
| Email taken | existing email | «Denne e-postadressen er allerede registrert.» in the email field, focus there, announced, all values kept | n/a |
| Bad input | empty name, bad email, password < 8 | field errors on blur (non-empty) and submit; focus the first | no request |
| Login ok | right pair | Søknad (full load) | n/a |
| Login wrong | wrong password or unknown email | «Feil e-post eller passord.» in the password field, focus there, email kept | one text for both |
| App bar | accounts on | logged out: Hjem · Søknad · Logg inn · Registrer deg; logged in: Hjem · Søknad · Profil · Historikk · Konto; current page marked | accounts off: Hjem · Søknad |
| Hjem | accounts on | button to `/registrer` logged out, `/soknad` logged in; «Du kan prøve med eksempelet først …» gone | accounts off: as before |
| Logged out | `/soknad`, `/profil`, `/historikk`, `/konto`, no or dead `ja_sid` | redirect to `/logg-inn` | expired row also redirects |
| Placeholders | `/historikk`, `/konto`, logged in | title, one line «Denne siden er ikke ferdig ennå.», link to Søknad; not 404 | n/a |

</intent-contract>

## Code Map

- `src/modules/identity/server/page-session.ts` (new) -- `getPageSession()` (cache; cookie `ja_sid` via `next/headers`, `lookupSession`; null when accounts off), `requireStudentPage()` (redirect to `LOGIN_PATH` when accounts on and no session). Exported from `identity/index.ts`.
- `src/shared/ui/components/nav-items.ts` -- `navItems(pathname, account = "off")`, `AccountNav` type; `app-bar.tsx` takes `account`; `src/app/layout.tsx` computes it.
- `src/modules/identity/ui/{index.ts,register-form.tsx,login-form.tsx,form-checks.ts,form-support.ts}` (new) -- the two forms, pure field checks, focus + announce helper, `goTo` full load.
- `src/app/{registrer,logg-inn}/page.tsx` (new), `src/app/{historikk,konto}/page.tsx` (new placeholders), `src/app/page.tsx` (Hjem button target and tryExample), `src/app/soknad/page.tsx` and `src/app/profil/page.tsx` (`requireStudentPage`).
- `src/shared/ui/messages.nb.ts` -- `nav.*` additions, `register`, `login`, `placeholderPage`.
- `src/modules/identity/core/session-gate.ts` -- comment only.
- Read-only: `crypto.ts`, `config.ts`, `db.ts`, `proxy.ts`, `handle.ts`, `handle-student.ts`, `sessions.ts`, every existing test (except as named above), `compose.yaml`, `.env.example`, `README.md`, `data/`.
- Tests to write: `nav-items.test.ts` (add cases, keep existing), `identity/ui/form-checks.test.ts`, `identity/server/page-session.test.ts` (mock `next/headers` and `next/navigation`; PGlite), `e2e/accounts-screens.spec.ts`, a Hosted accounts server on port 3108 in `playwright.config.ts` (`APP_ENV: hosted`, `ACCESS_CODE`, `FEATURE_ACCOUNTS: true`, made-up `ENCRYPTION_KEY`, `DATABASE_URL: pglite://memory`, `E2E: 1`), and replace the `/profil` «without a session» test in `e2e/profile.spec.ts`.

## Tasks & Acceptance

**Execution:**
- Source files in the Code Map -- done by the parent (steps 1-2 of this run).
- `src/shared/ui/components/nav-items.test.ts`, `src/modules/identity/ui/form-checks.test.ts`, `src/modules/identity/server/page-session.test.ts` -- unit tests -- one per matrix row that is not a browser matter
- `playwright.config.ts`, `e2e/accounts-screens.spec.ts`, `e2e/profile.spec.ts` -- browser tests -- register, log out (via `POST /api/auth/logout`), log in, field errors with focus, keyboard path, axe on both pages at 1280 and 360 px, app bar sets, Hjem button, redirects, placeholders, flag off, Hosted code field

**Acceptance Criteria:**
- Given the matrix, when `npm test` and `npm run typecheck` run, then all pass with no existing test edited except the one `/profil` test named above.
- Given `FEATURE_ACCOUNTS` off, when the app runs, then the app bar, Hjem, Søknad and the gate are as after Epic 5.

## Spec Change Log

## Review Triage Log

### 2026-11-22 - Review pass
- verdicts: 33 findings (blind 13, edge 9, verification-gap 3, intent-alignment descriptive) - high 0, medium 2, low 4, false 3, rest rejected as out of AC, by design or negligible
- findings:
  - `[medium]` `patch` password over 1000 characters is refused by the server and the form said «minst 8 tegn» (edge 1, blind) - `checkNewPassword` has a max check and a new text `passwordLong`; unit test added.
  - `[medium]` `patch` register then a failed login, the Student edits the email or password and presses again: login ran with the edited values (edge 3, gap other) - the registered email and password are kept in a ref and the retry logs in with them.
  - `[low]` `patch` login: an email over 254 characters got «Skriv inn e-postadressen din.» (edge 2) and the `field === "email"` branch was unreachable (gap other) - any INVALID_INPUT is the credentials text on the password field.
  - `[low]` `defer` the app bar can be stale after expiry in the same tab (edge 6, blind) - see the deferred list; 6.5 and 6.10.
  - `[low]` `reject` a second existing test (`Profil is not in the app bar yet`) was edited (blind, edge claim, gap other, intent G) - true and necessary: it contradicted 6.4's own AC; the parent writes it to issues.md.
  - `[low]` `reject` login after register answering INVALID_INPUT shows the network alert (edge 4) - the retry now uses the registered pair, so only a network or server fault reaches it.
  - `[false]` `reject` server refuses `accessCode` while not Hosted so the field does not exist (edge 5) - the server asks for a code only when hosted, and the client reads the same flag.
  - `[low]` `reject` a database error in the layout breaks every page (blind, edge 7) - with the database down no page of the account flow works anyway; the other pages fail the same way elsewhere.
  - `[low]` `reject` sprint-status `done` before review (blind) - the goal puts it in the same PR.
  - `[low]` `reject` non-INVALID_INPUT errors read as a network failure (blind); no explanation, `next` target or message after the redirect to Logg inn (blind); a logged-in visitor can open Registrer deg and register again (blind); Hjem and Søknad lean on the layout's `connection()` (blind); two «Vis» toggles on Hosted share a name (blind); duplicated placeholder pages and strings (blind); Hosted readiness URL and timeouts (blind); `onMouseDown` treats a symptom (blind); login has no blur check (edge claim) - not in the AC, by design (Design Notes, issues.md) or the same pattern as the Access-code form and Profil.
  - `[low]` `reject` test gaps: `cache()` dedupe, accounts-off skips the database, double-submit guard, Hjem on Hosted, `/tilgang` interaction (blind) - `cache` cannot be shown outside a render; the rest are covered by the flag-off and e2e tests or negligible.
  - `[false]` `reject` (verification-gap) no gaps found in app bar sets, Hjem, redirects, flag-off 404s, `getPageSession`, forms and `navItems` - nothing to act on.
  - Intent layer (descriptive): reading A (server-rendered feature behind the flag) is implemented; client-reactive state, proxy redirect and server-supplied wording are not; tests log out through the API (no screen before 6.10) and run Hosted as a local server.

## Design Notes

Choices (the parent writes them to `issues.md`): the app bar set and the redirects come from the server (layout and pages), not from a client query, so there is no flash and no JS needed; a login or registration ends in a full page load. A logged-in visitor of `/logg-inn` or `/registrer` is not redirected. Historikk and Konto are placeholders with a title, «Denne siden er ikke ferdig ennå.» and a link to Søknad; 6.8 and 6.10 replace them. «Logg ut» has no screen before 6.10: tests log out through `POST /api/auth/logout`. The Tilgangskode field has its own hint «Minst 16 tegn. Koden får du av utvikleren.».

## Verification

**Commands:**
- `npm run typecheck`, `npx biome check`, `npx vitest run <your files>` -- expected: pass
- Parent runs afterwards: `npm test`

## Auto Run Result

Status: done

**Summary:** With `FEATURE_ACCOUNTS` on: `/registrer` and `/logg-inn` (forms in `identity/ui/`, built on the text field, password toggle, button, link and `callApi`), the app bar's logged-out and logged-in item sets and Hjem's button target (from the session, read on the server by `getPageSession`), `requireStudentPage` redirecting a logged-out visitor of Søknad, Profil, Historikk and Konto to Logg inn, and plain placeholder pages for Historikk and Konto. Registration runs register, then login, then Profil; login goes to Søknad. With the flag off the app is as after Epic 5.

**Files:** `src/modules/identity/{server/page-session.ts,ui/*,index.ts}`, `src/app/{registrer,logg-inn,historikk,konto}/page.tsx`, `src/app/{layout,page}.tsx`, `src/app/{soknad,profil}/page.tsx`, `src/shared/ui/components/{nav-items,app-bar}.ts(x)`, `src/shared/ui/messages.nb.ts`, `playwright.config.ts` (Hosted accounts server, port 3108); tests `page-session.test.ts`, `form-checks.test.ts`, `nav-items.test.ts` (additions), `e2e/accounts-screens.spec.ts`, two edited assertions in `e2e/profile.spec.ts`.

**Review:** 4 layers; 3 patch entries applied (2 medium: password over 1000 characters, register-login retry with edited values; 1 low: login refusal text), 1 deferred (stale app bar after expiry in the same tab), the rest rejected with reasons in the Review Triage Log. Patched counts: high 0, medium 2.

**Verification:** `npm run typecheck`, `npx biome check`, vitest: first full `npm test` had one vitest timeout (`scripts/db-check.test.ts`, passes alone in 6 s); second full `npm test`: vitest, biome, tsc green, Playwright 284 passed and 23 failed in `gaps`, `letter-actions`, `suggestions`, `letter` and `letter-check` (a submit never showed the result within 5 s under load); those five files re-run with `--workers=2`: 99 passed. The Docker test was not run (not allowed here; `ci` is the criterion).

**Residual risks:** the load-sensitive Playwright files above (unchanged by this story); screen reader, a real phone and a Hosted registration with a real Access code are not done (issues.md).
