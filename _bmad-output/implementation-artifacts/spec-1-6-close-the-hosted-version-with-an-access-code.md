---
title: 'Story 1.6: Close the Hosted version with an Access code'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: '81ddcc569ebcf8e7c0b14dfb7182574afe8cff2d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On the Hosted version every page and API route is open to anyone with the URL, so an outsider could use the app and later spend the AI budget. There is no gate, no `/tilgang` screen, no shared text field or password toggle, and no client helper that parses the API envelope.

**Approach:** A pure `gateDecision` in `identity/core`, wired up by `src/proxy.ts`. `POST /api/access` sets the `ja_access` cookie on a correct code. `/tilgang` is the wordmark-only screen with the closed-version text, a password-type field with «Vis»/«Skjul», and «Åpne». Build the shared text field, password toggle and `api-client.ts` on the way. Covers FR-31 (before accounts), NFR-2, NFR-7, AD-12, UX-DR9, UX-DR10, UX-DR35.

## Boundaries & Constraints

**Always:**
- Branch `story/1.6-access-code-gate` off `main`. Commits cite `1.6` and the IDs. Stage by explicit path.
- `gateDecision({ hosted, accountsOn, path, cookieValid })` is pure and returns `pass`, `redirect-to-gate` or `api-401`. Local or accounts on → pass. Hosted exempt paths: `/tilgang`, `/api/access`, `/api/health`, `/_next/` and `/favicon.ico`. Hosted with a valid cookie → pass. Otherwise pages redirect to `/tilgang` and `/api` paths get 401 `ACCESS_REQUIRED` in the AD-7 envelope. `proxy.ts` only reads config and the cookie, calls the decision, and acts on it. Its `matcher` excludes `_next/static`, `_next/image` and `favicon.ico`.
- `ja_access` = hex HMAC-SHA256 keyed with `ACCESS_CODE` over `"ja_access.v1"`. A session cookie (no Max-Age), httpOnly, SameSite=Lax, Secure. The code compare and the cookie check both use `timingSafeEqual` on equal-length digests.
- `ACCESS_CODE` reaches the code only through `getConfig().accessCode`, and never enters RunMode or a log line. `node:crypto` stays in `identity/server`, never in `core`.
- `POST /api/access` runs inside `handle()` and parses `{ code }` with the slice's zod schema. A wrong or too-short code is `INVALID_INPUT` with `field: "code"`. The call is `NOT_FOUND` unless the gate is active (hosted, accounts off). `/tilgang` calls `notFound()` in the same case.
- `api-client.ts` is the only way a client component calls an API route. It takes the route's zod schema for `data`, parses the envelope with it, and returns `{ ok: true, data } | { ok: false, error }`. A rejected fetch or a non-JSON body gives code `NETWORK_ERROR` (retryable). A JSON body that is not the envelope gives `UNEXPECTED`.
- Text field: label above; hint and error tied by `aria-describedby`; validated on blur and on submit, never per keystroke; error = rust «Feil» strip + text under the field, `aria-invalid="true"`; never clears the input; never blocks paste or autofill. Password toggle: small secondary button right of the field, `aria-pressed`, 44 px, «Vis»/«Skjul». Field is `type="password"` `autocomplete="off"`.
- After a correct code the page goes to `/` (Hjem). A network failure shows the alert «Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.» with `role="alert"`; input is kept and focus stays.
- All strings come from `messages.nb.ts`. A wrong code shows «Feil tilgangskode.» and focuses the field. Under 16 characters shows «Koden har minst 16 tegn.» before any request.
- `/tilgang`: wordmark only (no nav, no menu button), the skip link stays, `h1` «Tilgangskode», title «Tilgangskode – JobAssistant». Tests are named after requirement IDs.

**Never:**
- No throttling or lock-out of wrong codes, no accounts, no `ja_sid` and no registration check (Epic 6). No `process.env` read outside `config.ts`. No Server Actions. No new dependency. No change to the `/api/health` response.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Page, no cookie | Hosted, accounts off, GET `/soknad` | redirect to `/tilgang` | N/A |
| API, no cookie | Hosted, GET `/api/anything` | 401 `{ ok:false, error:{ code:"ACCESS_REQUIRED" } }` | N/A |
| Exempt | Hosted, no cookie, `/tilgang`, `/api/access`, `/api/health` | pass | N/A |
| Local | `APP_ENV=local`, any path, any cookie | pass; `/tilgang` and `/api/access` answer 404 | N/A |
| Correct code | POST `{ code }` equal to `ACCESS_CODE` | 200 `{ ok:true, data:{ opened:true } }` + cookie; page goes to `/` | N/A |
| Wrong code | 16+ chars, different | 400 `INVALID_INPUT`, field `code`; «Feil tilgangskode.», `aria-invalid`, focus, text kept | N/A |
| Short code | 5 characters, blur or submit | «Koden har minst 16 tegn.»; no request | N/A |
| Tampered cookie | `ja_access` of another length or value | treated as no cookie | no throw |
| Offline | fetch rejects | `NETWORK_ERROR` alert, input kept | retry by pressing «Åpne» |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.6; spine AD-12, AD-7; DESIGN.md (text-field, password-toggle, alert) and EXPERIENCE.md (Tilgangskode, Component Patterns, Key strings) under `_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-11-09/`. Reused as is: `shared/server/handle.ts` (`handle`, `ApiError`, `errorStatus` has `ACCESS_REQUIRED` 401), `shared/core/message-key.ts` (`MESSAGE_KEYS`), `components/button.tsx` (`busy`, `small`), `link.tsx`, `announce.ts`, `page-title.ts`, `.env.example` (already lists `ACCESS_CODE`), `biome.json` (already covers `src/proxy.ts` and `src/modules/**`).

- `src/shared/server/config.ts` (+ test) -- add `accessCode: string | undefined` to `Config`, from `ACCESS_CODE`; no new validation
- `src/shared/server/handle.ts` -- export the private `failure()` as `errorResponse(code, retryable, field?)` so the proxy builds the same envelope
- `src/modules/identity/core/gate.ts` (+ test) -- pure `gateDecision`
- `src/modules/identity/contracts.ts` -- `accessRequestSchema` (`{ code: string }`), `accessResponseSchema` (`{ opened: true }`), `ACCESS_CODE_MIN_LENGTH` 16, `ACCESS_COOKIE` `"ja_access"`
- `src/modules/identity/server/access.ts` (+ test) -- `accessCookieValue(code)`, `isValidAccessCookie(value, code)`, `isAccessCodeCorrect(submitted, code)`
- `src/modules/identity/index.ts` -- `import "server-only"`; re-exports `gateDecision` and the access functions. Fallback if `server-only` breaks the proxy build: export only what the proxy needs from a file without it, and record it
- `src/proxy.ts` (+ test) -- wiring; `matcher`
- `src/app/api/access/route.ts` (+ test) -- `dynamic = "force-dynamic"`, `POST` through `handle()`, sets the cookie with `cookies()` from `next/headers` (mocked in the test)
- `src/shared/ui/api-client.ts` (+ test) -- `callApi`; Vitest with a stubbed `fetch`
- `src/shared/ui/components/{text-field,password-toggle}.tsx` -- `TextField` takes `label`, `hint`, `error`, an `after` slot and input props (ref as a prop)
- `src/app/tilgang/{page.tsx,access-form.tsx}` -- server page (title, `notFound()` guard) and client form
- `src/shared/ui/components/app-bar.tsx` -- on `/tilgang` render the wordmark only
- `src/shared/ui/messages.nb.ts` -- `access` strings, field-error label «Feil», network-failure text
- `playwright.config.ts` -- second `webServer` on port 3101 after the first (Playwright starts them in order): `next start -p 3101` with `APP_ENV=hosted`, a fixed 16+ character `ACCESS_CODE`, `DATABASE_URL=pglite://memory`, `E2E=1`
- `e2e/access.spec.ts` -- Hosted flow on 3101 (`test.use({ baseURL })`); `e2e/shell.spec.ts` stays on 3100

## Tasks & Acceptance

**Execution:**
- [x] `src/shared/server/config.ts`, `handle.ts` -- `accessCode`, `errorResponse` -- AD-4, AD-7
- [x] `src/modules/identity/**` -- gate, contracts, access functions, index, unit tests for every branch -- AD-12, NFR-7
- [x] `src/proxy.ts`, `src/app/api/access/route.ts` -- wire the gate, set the cookie, with tests -- FR-31
- [x] `src/shared/ui/{api-client.ts,components/text-field.tsx,components/password-toggle.tsx}`, `messages.nb.ts` -- shared UI and tests -- UX-DR9, UX-DR10
- [x] `src/app/tilgang/*`, `app-bar.tsx` -- the screen, wordmark only -- UX-DR35
- [x] `playwright.config.ts`, `e2e/access.spec.ts` -- Hosted flow, cookie flags, axe at 1280 px and 360 px, no horizontal scroll at 320 px -- NFR-2

**Acceptance Criteria:**
- Given the Hosted server, when a browser opens `/soknad` without the cookie, enters the correct code on `/tilgang` and presses «Åpne», then it lands on Hjem and `/soknad` opens without a redirect.
- Given the same session, when the cookie is read, then it is named `ja_access`, httpOnly, SameSite=Lax, Secure, with no expiry.
- Given `npm test` and `docker compose run --rm --build test`, then Biome, typecheck, Vitest and Playwright pass, and `git grep -n ACCESS_CODE src` finds `process.env` only in `config.ts`.

## Implementation Notes

- Implemented directly in the main session (no subagent), as in Stories 1.4 and 1.5. Verified: `npm test` on the host (Biome, typecheck, 152 Vitest, 36 Playwright on both servers) and `docker compose run --rm --build test` (151 passed, 1 skipped: the DESIGN.md colour check, skipped in Docker as before). `git grep process.env -- src` finds only `config.ts` and its test.
- Deviations from the Code Map: after a correct code the form does `window.location.replace("/")`, not the client router, because the router had cached the 307 that the proxy gave to the prefetched wordmark link, so `router.replace("/")` stayed on `/tilgang`. The text field validates on blur only when it is not empty, so reaching for «Vis» on an empty field raises no error; submit still checks an empty field. A refused («Feil tilgangskode.») error stays on blur and clears when the text is edited.
- `server-only` in `identity/index.ts` works in `proxy.ts` (build and tests pass); the fallback was not needed. Playwright starts the Hosted server after the local one has built, so no wait script was needed.
- Next gives a relative `Location` on the proxy's redirect (`/tilgang`), so the e2e resolves it against the base URL.
- Added `e2e/local-gate.spec.ts` (local: no gate, `/tilgang` and `/api/access` answer 404).
- Review patches (see the Triage Log): `announce()` now clears and refills the region, so a repeated text is spoken again; `callApi` times out after 15 s; `/tilgang` with a valid cookie goes to Hjem; the gate and matcher exempt only `_next/static/`, `_next/image`, `favicon.ico`.
- Not verified: a real phone, a screen reader or password manager on `/tilgang`, and the Vercel build.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; defer = `deferred-work.md`; reject = no action.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | HMAC key is zero-padded, so a code plus trailing NULs compared equal (BH) | low | patch: `isAccessCodeCorrect` compares SHA-256 digests; NUL and non-ASCII cases tested |
| 2 | Every non-network failure showed «Feil tilgangskode.» (BH, EC) | medium | patch: only `INVALID_INPUT` on field `code` says wrong code; any other failure shows the failure alert; e2e with a stubbed 500 |
| 3 | Error kind found by comparing message strings (BH) | low | patch: `errorKind` state (`short` / `refused`) |
| 4 | Field errors not spoken when the field already has focus; `announce()` repeats nothing (BH, EC) | medium | patch: both field errors go to the action live region; `announce()` now empties the region and fills it next frame (closes the 1.5 deferred item); e2e checks a second refusal |
| 5 | No request timeout, so «Åpne» stays busy forever (BH, EC) | medium | patch: `callApi` uses `AbortSignal.timeout(15 s)`, a timeout is `NETWORK_ERROR` |
| 6 | Stale «Koden har minst 16 tegn.» after the field is emptied and blurred (EC) | low | patch: blur clears it; e2e |
| 7 | Matcher excluded look-alike paths (`favicon.icoX`, `_next/staticx`); gate exempted all of `/_next/` (BH, EC) | low | patch: matcher `_next/static/`, `_next/image$`, `favicon\.ico$`; gate exempts the same set; tests for look-alikes |
| 8 | `/tilgang` with a valid cookie showed the form again (BH, EC) | low | patch: the page redirects to `/`; e2e |
| 9 | «Meny» button and nav on `/tilgang` unchecked at phone width (VG) | medium | patch: e2e at 360 px |
| 10 | Field clearing and blur rules untested (VG) | low | patch: e2e |
| 11 | Page guard for Hosted with accounts on untested (VG) | low | defer: accounts do not exist before Epic 6 |
| 12 | Pasted whitespace in the code, or in the Vercel variable, makes a correct code fail (BH, EC) | low | defer: needs a rule in `config.ts` (outside the spec's «no new validation») |
| 13 | Static bearer cookie, no expiry, no throttling (BH) | low | reject: the cookie is AD-12's design; a 16+ character random code resists offline guessing. Throttling of wrong codes is deferred |
| 14 | «Vis»/«Skjul» label flips and `aria-pressed` flips (BH) | low | defer: UX-DR10 fixes both; check it with a screen reader in Story 7.2 |
| 15 | Secure cookie dropped over plain HTTP (EC, BH) | low | reject: AD-12 fixes Secure; Hosted is HTTPS only and the gate is off locally |
| 16 | Double submit before busy re-renders (EC) | false | `if (busy) return` reads state set in the same discrete event; React flushes it before the next event |
| 17 | `//api/x`, `/%61pi/x`, 307 on non-GET (EC) | low | reject: all fail closed (redirect, never pass); no POST page exists |
| 18 | `/tilgang` on the local server shows no nav (EC) | false | it is the 404 page, whose body links «Til Hjem» |
| 19 | `callApi` does not send the Student to `/tilgang` on `ACCESS_REQUIRED` (EC) | low | defer: no caller exists yet |
| 20 | Claims: cookie compare on raw bytes, blur skips empty, focus stays on «Åpne», malformed body has no field (EC) | false | all as built and logged in Implementation Notes; the spec sets none of them otherwise |
| 21 | `autocomplete="off"` vs password managers; `ACCESS_CODE` not tested out of logs; Chromium-only Secure test; code constant repeated; status and logs out of step (BH, VG) | low | reject: spec-fixed (UX-DR9); the log writes fixed fields only; the project tests in Chromium; sprint status moves in step 5 |
| 22 | `favicon.ico` e2e shows only that `next start` serves the file (VG) | low | reject: the matcher test now covers the exclusion |

## Design Notes

- **Closed code list.** AD-7 has no code for a wrong Access code, so it is `INVALID_INPUT` + `field: "code"`; the UI maps that to «Feil tilgangskode.». A short code sent by a client that skipped the check gets the same answer.
- **Why the proxy builds on `errorResponse`.** The proxy cannot use `handle()` (it wraps a handler), but its 401 must match the envelope the client parses.
- **`next start` twice on one build.** The build does not read run-time settings (config is read per request), so the Hosted server reuses the local server's `.next`. If Playwright does not start the servers in order, start the second one from a small wait script instead.
- **Golden example (`gateDecision`).** `{ hosted: true, accountsOn: false, path: "/api/analyses", cookieValid: false }` → `api-401`; the same with `path: "/soknad"` → `redirect-to-gate`; with `cookieValid: true` → `pass`.

## Verification

**Commands:**
- `npm test` -- expected: Biome, typecheck, Vitest and both Playwright servers pass on the host
- `docker compose run --rm --build test` -- expected: passes
- `APP_ENV=hosted ACCESS_CODE=<16+ chars> DATABASE_URL=… npm start`, then `curl -i localhost:3000/api/health` and `/soknad` -- expected: health 200 without cookie, `/soknad` 307 to `/tilgang`

**Manual checks:**
- On `/tilgang` at 360 px and 1280 px: Tab order is skip link, wordmark, field, «Vis», «Åpne»; paste into the field works; wrong code keeps the text and focuses the field.
