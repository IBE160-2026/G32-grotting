# Accounts: manual checks and what the automated tests cover (Story 6.12)

Story 6.12 (FR-19, FR-22, FR-29, FR-31, NFR-7, NFR-9). Accounts, Profil and Historikk are on by default. **Nothing in sections 1 to 3 is a result until Helene has done the check and filled in the Date, Tester and Result columns.** A Result of «ikke gått gjennom ennå (Helene)» means open, not passed. Section 4 is what the automated tests did, with the date, and is the only part that may say «pass».

How to run: `docker compose up --build`, then open <http://localhost:3000> once `docker compose ps` shows `healthy`. The test user is `testbruker@jobassistant.local` with the password `testpassord-2026` (README, «Test user»); setup creates it on the first start. Use a fresh browser window so no earlier session is in it.

## 1. UJ-1 with an account: a new Student, from registration to a saved Letter

Run once on a laptop and once on a real phone on the same network (plain http at the laptop's address; the phone needs no key).

| # | Date | Tester | Steps | Expected result | Result |
| - | ---- | ------ | ----- | --------------- | ------ |
| 1 |  | Helene | Open Hjem and press «Lag skreddersydd søknad». | Registrer deg opens: Navn, E-post and Passord (no Tilgangskode on the local run). | ikke gått gjennom ennå (Helene) |
| 2 |  | Helene | Register with a name, an email you make up and a password of 8 characters or more. | Profil opens with the heading «CV · {navn}» and an empty CV field. The app bar reads «Hjem · Søknad · Profil · Historikk · Konto». | ikke gått gjennom ennå (Helene) |
| 3 |  | Helene | Paste the text of `data/fixtures/example-nordic-digital/cv.txt` into the CV field and press «Lagre». | «Lagret.» shows. After a reload the text is still there. | ikke gått gjennom ennå (Helene) |
| 4 |  | Helene | Open Søknad. | A closed «CV-tekst fra Profil» is shown with a link to Profil; no CV field is asked for. | ikke gått gjennom ennå (Helene) |
| 5 |  | Helene | Fill Stillingstittel, Arbeidsgiver and Stillingsannonse from `meta.json` and `ad.txt` in the same folder. Accept the AI notice if it is shown. Press «Analyser og skriv utkast». | The score, the keyword lists, the Gap analysis and the Letter appear. The heading reads «JA-001 · Nordic Digital» with «Lagret i Historikk som JA-001.». | ikke gått gjennom ennå (Helene) |
| 6 |  | Helene | Open Historikk. | One row, JA-001, with the score sentence and «Åpne», «Kopier brev» and «Last ned (.docx)». The app bar shows the count by Historikk. | ikke gått gjennom ennå (Helene) |
| 7 |  | Helene | Press «Åpne» on JA-001. | The saved Application opens read-only with the same score, lists, Gaps and Letter; nothing is asked of the AI again. | ikke gått gjennom ennå (Helene) |
| 8 |  | Helene | Press «Kopier brev» and paste it into a text editor; then «Last ned (.docx)». | The Letter is signed with the Profile name, not «[Navnet ditt]». The file name starts with the name. | ikke gått gjennom ennå (Helene) |
| 9 |  | Helene | Open Konto and press «Logg ut». | Konto shows the email and «1 søknad», and the four lines about how the data is stored. «Logg ut» ends the session at once and Hjem is shown logged out. | ikke gått gjennom ennå (Helene) |
| 10 |  | Helene | Log in again on Logg inn with the same email and password. | Søknad opens. Profil still holds the CV and Historikk still holds JA-001. | ikke gått gjennom ennå (Helene) |

## 2. UJ-2 with an account: the Examiner logs in as the test user

| # | Date | Tester | Steps | Expected result | Result |
| - | ---- | ------ | ----- | --------------- | ------ |
| 11 |  | Helene | After `docker compose up` on a clean start (`docker compose down -v` first), log in as the test user. | Søknad opens. Profil holds the Example pair's CV. | ikke gått gjennom ennå (Helene) |
| 12 |  | Helene | On Søknad use the Example pair («Bruk eksempelet») and submit. | The score and the Letter appear; the application is saved as the first one in Historikk. | ikke gått gjennom ennå (Helene) |
| 13 |  | Helene | Leave the page open without touching it for 28 minutes (a real timeout; the automated test moves the browser clock). | The warning «Økten din avsluttes snart» opens, with focus on «Fortsett økten». «Fortsett økten» keeps the session. | ikke gått gjennom ennå (Helene) |
| 14 |  | Helene | Let the session end (30 minutes) with an ad pasted on Søknad. | Logg inn opens with «Økten din er avsluttet. Logg inn igjen for å fortsette.», the email filled in, and the ad is back on Søknad after login. | ikke gått gjennom ennå (Helene) |

## 3. Screen reader, phone and Hosted (only a person can do these)

| # | Date | Tester | Check | Result |
| - | ---- | ------ | ----- | ------ |
| 15 |  | Helene | Screen reader on Registrer deg, Logg inn, Profil, Historikk, a saved Application, Konto and the expiry warning: the field errors are read and take focus, «Lagret.» is announced, the warning takes focus and is read, the headings read in order. | ikke gått gjennom ennå (Helene) |
| 16 |  | Helene | The screens of rows 1 to 10 on a real phone at 360 px: nothing scrolls sideways, Historikk is a list, the buttons can be pressed. | ikke gått gjennom ennå (Helene) |
| 17 |  | Helene | Hosted registration with the real Access code. Not required to merge: the Hosted version is frozen with accounts off (D23), so this can only be unit-tested (`gateDecision` and the registration route with `hosted: true`). | ikke gått gjennom ennå (Helene) |

## 4. What the automated tests did (2026-11-25)

These run in `ci` on every pull request (`docker compose run --rm test`, then the app is started and the smoke run logs in). The date is the day they were written and run on the developer machine (`npm test`: lint, types, unit tests and Playwright); the smoke row and the Docker test are results of `ci` on the pull request of this story, not of a local run. `ci` repeats all of them on every later pull request.

| Date | What | Covers |
| ---- | ---- | ------ |
| 2026-11-25 | `test/fr19-privacy.test.ts` (unit, PGlite) | Two Students on the real routes. B, who knows A's Application id, fingerprint and inputs, gets `NOT_FOUND` (the same bytes as for an unknown or malformed id, nothing of A's in it) from `GET /api/applications/[id]`, its Letter, the Letter, Gaps and check routes and the page `/historikk/[id]`; A's rows are unchanged afterwards; B's list, count and next number hold only B's; B's profile save and AI-notice call with A's id in the query or body touch only B's row; no session or a made-up one gets `SESSION_EXPIRED` on every route. The same reads as A succeed, so a `NOT_FOUND` cannot come from a broken setup. |
| 2026-11-25 | `test/fr22-raw-rows.test.ts` (unit, PGlite) | The raw rows of every table after a registration, a saved Profile CV and a saved Application with every section: each value is ciphertext (`v1.…`), a scrypt hash, or has the shape of an id, hash, timestamp, number, the lower-cased email or the notice version; the name, CV text, Job ad, title, employer, Keywords, Evidence, Gaps, suggestions and Letter are found in no column in plain text but open with the key; the password only as a scrypt hash; a session only as the sha-256 of its token; log events hold none of it. `keyword_lists` is the one plain table (no Student data, architecture «Plain-text columns»); it is checked to hold only words of the ad. |
| 2026-11-25 | `scripts/smoke.mjs` in `ci` | `/api/health` answers, and the seeded test user logs in, has a session and reads the seeded CV back from Profil, against the real app container on Postgres. |
| 2026-11-25 | `e2e/account-journey.spec.ts` (Playwright, accounts on by default) | At 1280 px and at 360 px: Hjem, registration, Profil (empty and saved), Historikk (empty), Søknad with the Profile CV, the result and its saved number, Historikk with an entry, the reopened Application, Konto, logout, Logg inn and logging in again, and the expiry warning (browser clock moved 28 minutes), each screen through axe with no serious or critical finding. The other account specs (`e2e/accounts-screens`, `profile`, `soknad-profile`, `applications-*`, `account`, `session-expiry`, `seed-user`) run on the same server. |
| 2026-11-25 | `test/accounts-default.test.ts`, `src/shared/server/config-secrets.test.ts` | Accounts are on by default locally and off by default on Hosted; an explicit on without a key stops startup there; no compose file, README, Dockerfile or workflow sets the flag, and CI uses no new secret. |
| 2026-11-25 | `src/modules/identity/core/gate.test.ts`, `src/modules/identity/server/register.test.ts`, `src/app/api/auth/auth-routes.test.ts` | «Registration asks for the Access code on Hosted» (`gateDecision` and the registration route with `hosted: true`). |

What these do not cover: the real 30-minute timeout, a screen reader, a real phone, Hosted with a real Access code, the seed against a Postgres other than the `ci` container's. Those are rows 13 to 17 above.
