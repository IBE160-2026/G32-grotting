# Core-flow checkpoint (Story 3.12, PRD §5.2, 24 Nov)

Assessed on the local app on **2026-11-20** (four days before the date), by the dev loop for the parts a machine can do. The parts that needed a person are in section 6; what is still open is in section 7. Wording of SM-1 and SM-2 follows decision D25 (`fr-5b-decision.md`): the Answer key is the oracle for the code-only list; a stored AI list is judged by the found-in-the-ad check.

State of the code: branch `story/3.12-checkpoint-and-sm-decision`, based on `main` at `7e7ea25`. Vocabulary `v1-bbb32bad`. Hosted is frozen (D23); nothing here touched it.

## 1. Automated tests, FR-1 to FR-12 and FR-24 to FR-28

| Date | Command | Result |
| --- | --- | --- |
| 2026-11-20 | `docker compose run --rm --build test` (Biome, `tsc`, Vitest, Playwright, in the container) | **pass.** Biome: 280 files, no fixes. Vitest: 96 files, 1101 passed, 2 expected failures (the held-out Fixture's list test in `sm2.test.ts` and `analyse.test.ts`), 1 skipped (`test/design-tokens.test.ts`: it skips when `DESIGN.md` is missing, and the image does not hold it; CI runs it and counted 1102 passed). Playwright: 200 passed (1.9 min). Whole run 2 min 41 s. |
| 2026-11-20 | `npx playwright test e2e/letter-check.spec.ts -g "a clean Letter" --repeat-each=20` | pass, 20 of 20 (see section 5) |

## 2. SM-1: UJ-1 completes end to end without manual intervention

| Date | Case | How | Result |
| --- | --- | --- | --- |
| 2026-11-20 | Example pair, Test mode | The e2e suite above: `e2e/letter.spec.ts` «UJ-1 «Bruk eksempelet» in Test mode: the score, then the Letter», plus `application-result.spec.ts`, `letter-actions.spec.ts`, `letter-check.spec.ts` | **pass.** «Bruk eksempelet» to a score, the Cached Letter, copy and download with no key and no step outside the interface. In Test mode the score is the saved AI list's (63 %), not the key's 64 % (D25, expected). |
| 2026-11-20 | One live Fixture: `nursing-sarvurdering` (Sykepleier, Solbakken sykehjem) | The local app started with Helene's `.env` key (`APP_ENV=local`, in-memory database, Test mode off, port 3200) and the three API calls the screen makes, in order: `POST /api/analyses` with the accepted notice, `POST /api/analyses/[id]/letter` (Formell), `POST /api/analyses/[id]/letter-check` | **pass** at API level. Phase 1: 200, new ad waited for the live Keyword request (about 3 s), list saved (`keywordSource: saved`), 39 %, 7 Matched, 11 Missing, every Matched keyword has Evidence. The same inputs again: same fingerprint, same score, 0.2 s, no request (NFR-6). Phase 2: 200 in 13.6 s, Formell Letter of 267 words, `source: live`, `anthropic/claude-sonnet-5.5` via OpenRouter, `letter-1`. Check: 200, one flag, `UNSUPPORTED_CLAIM: langtidsavdeling` (an ad keyword the CV does not show): the guard doing its job, a flag and not a failure. |

What this run does not cover: the same flow driven through the browser screen with a live key, and the three Tones live. They are part of the §9.2 live runs (Stories 4.3, 5.4, 7.1), and UJ-1 on a laptop and a phone is Helene's step below.

Paid requests on 2026-11-20 for this story: **4** (1 re-recording of the Example Formell Letter, 1 Keyword list and 2 Letters for the live run; the first live run reached the check with a wrong request body of mine, so the Letter was asked for twice). OpenRouter's own key counter read 0.4263 USD before and 0.4479 USD after, so the story spent about **0.022 USD**; the month stands at 0.45 USD of the 20 USD limit (NFR-8, SM-6).

## 3. SM-2: the score is correct (code-only lists)

| Date | Fixture | Code-only lists equal the Answer key | Second run identical (NFR-6) | Must-not-match |
| --- | --- | --- | --- | --- |
| 2026-11-20 | `example-nordic-digital` | yes | yes | none matched |
| 2026-11-20 | `nursing-sarvurdering` | yes | yes | none matched |
| 2026-11-20 | `two-column-fjord-analytics` | yes | yes | none matched |
| 2026-11-20 | `held-out-regnskap-kvale` | no, pinned as an expected failure (`it.fails`) | yes | none matched |

Source: `src/modules/keywords/core/sm2.test.ts` and `src/modules/match/core/analyse.test.ts` in the Docker run of section 1. The held-out difference is the recorded basis for FR-5b (D24, `fr-5b-decision.md`) and is not a new failure. For the checkpoint, SM-2 therefore reads: pass on the three Fixtures the vocabulary was tuned for, with the held-out failure known, recorded and covered by FR-5b.

## 4. Wrong-input tour (PRD §9.3, NFR-5)

Each of the six inputs gives its inline error and keeps what was entered; the double click and the refresh are in the phase-2 tests. All in the Docker run of section 1 (200 e2e tests passed).

| # | Input | Test |
| --- | --- | --- |
| 1 | A required field empty | `e2e/application-form.spec.ts` «input 1: an empty submit shows all errors, focuses the first and keeps what was typed» and «input 1: tells which field is invalid when the first ones are fine» |
| 2 | A file of the wrong type | `e2e/application-cv.spec.ts` «input 2: a .docx is rejected in the field before any request, and the CV text is untouched» |
| 3 | A file over 2 MB | `e2e/application-cv.spec.ts` «input 3: a file of 2 MB and one byte is rejected in the field before any request» |
| 4 | Below the minimum length | `application-form.spec.ts` «input 4: an ad below 200 characters gives its error on blur and is kept»; `application-cv.spec.ts` «input 2: text below 200 or above 20 000 characters gives its error and is kept» |
| 5 | Above the maximum length | `application-form.spec.ts` «input 5: an ad above 15 000 characters gives its error and is not cut»; the CV case in the same `application-cv.spec.ts` test as input 4 |
| 6 | A Job ad with fewer than 3 Keywords | `e2e/application-result.spec.ts` «a too-short ad gives the alert at the Job ad field, focus there and no result» (the ad has no Keywords); the server rule in `analyse.test.ts` |
| – | Double click on submit | `application-result.spec.ts` «sends one request on a double click …»; phase 2: `letter.spec.ts` «a double click on submit starts one Application and one Letter request» |
| – | Refresh during the AI phase | `letter.spec.ts` «a refresh brings the form back with its inputs and no error page; the next submit reuses the Application id» |

## 5. The flaky test `e2e/letter-check.spec.ts` «a clean Letter …» (found on PR #65)

**It was a real flag, hidden by timing.** With the saved AI list for the Example ad, the Cached Formell Letter mentioned «tilgjengelighet», a Missing keyword in that list, so `checkLetter` flagged it (probe run on 2026-11-20: Formell gave `UNSUPPORTED_CLAIM: tilgjengelighet`, Personlig and Direkte gave none). The test asserted «no list» as soon as the check request had been sent, before its answer had been drawn, so it passed when it looked first and failed (once in CI, `Received: 1` held for the full 5 s) when the answer was already there.

Changes, on 2026-11-20:

- The test now waits for the check's answer and one frame before it asserts. Against the old flagged Letter it failed 15 of 15 runs (it caught 4 of 10 with the first, weaker wait).
- The Formell Letter of the Example pair was recorded again with `npm run fixtures:record -- example-nordic-digital --tone Formell` (1 request, first try; written by the script, not edited). The new Letter has 273 words and no flag against the saved AI list; the Letter unit tests (124) pass.
- With the new Letter the test passes 20 of 20 runs.

Not changed: the Personlig and Direkte Letters (no flags), and the prompt. Only the Example pair has Cached Letters; a second probe of every Cached Letter against its Fixture's saved AI list gave no flag for any of the three Tones.

## 6. Done by a person

| Date | Who | What | Result |
| --- | --- | --- | --- |
| 2026-11-20 | Helene | UJ-1 (without accounts) on a laptop, against the local app | **pass**, works as expected |
| 2026-11-20 | Helene | UJ-1 (without accounts) on a real phone, against the local app on the same network (plain http at the laptop's address) | **pass**, works as expected, after the fix in #68. The first try on the phone failed: «Analyser og skriv utkast» did nothing, because `crypto.randomUUID` is missing on a page that is not https or localhost. Fixed with `newId()` (#68) and tried again after a rebuild |
| 2026-11-20 | Helene | Manual rows for Stories 3.6 to 3.10 | filled in `ai-notice-manual-checks.md` and `letter-manual-checks.md`. Row 17 failed first with Windows Narrator and passed after the fix in #69. Row 13 was run in a browser without a screen reader |
| 2026-11-20 | Helene | Vercel dashboard row, `hosted-deployment.md` section 3 | filled in as «pass», without a date written in the row |

## 7. Still open

- Row 13 of `letter-manual-checks.md` with a screen reader (it was run without one).
- A date on the Vercel row in `hosted-deployment.md` section 3.
- The decision on what «SM-1 passes» needs on the screen with a live key (the browser, all three Tones), if Helene wants more than the API-level run in section 2.
