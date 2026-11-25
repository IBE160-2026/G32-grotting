---
title: 'Reopen a saved Application'
type: 'feature'
created: '2026-11-25'
status: 'in-progress'
baseline_revision: '22ae782ef21fd5250ffb7bfec86036ce873c24c4'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-7-save-every-application-automatically.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-8-find-my-applications-in-historikk.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** With accounts on, a Historikk row (Story 6.8) links to `/historikk/[id]`, which is a 404. A Student cannot reopen a saved Application to read the Refleksjonsnotat and copy or download the Letter again.

**Approach:** With `FEATURE_ACCOUNTS` on, `/historikk/[id]` shows the stored Application read-only, fed by `GET /api/applications/[id]`. The page composes the existing `match/ui`, `gaps/ui` and `letter/ui` components; it adds no section component of its own and regenerates nothing. With the flag off nothing changes.

## Boundaries & Constraints

**Always:**
- `studentId` comes only from the session (`handleStudent`, `getPageSession`); every read selects by `(id, student_id)`. Another Student's id, an unknown id and a malformed id take the same path (no decrypt, no second query) and give the same `NOT_FOUND` (status, body, headers) from the API and the same Ikke funnet page (`notFound()`, 404) from the URL.
- Nothing new is written: no migration, no column, no new key in `sessionStorage`/`localStorage`. Decrypted text is only in the `no-store` answer to the owner and the TanStack cache; never in logs, URLs, errors or storage. The CV text is not on the row and not in the answer.
- The answer is `{id, seq, createdAt, previous, job, analysis, gaps, letter, check}`. `job`, `analysis`, `gaps`, `letter` are each `{status:"ok", value}`, `{status:"missing"}` (column null) or `{status:"unreadable"}` (does not decrypt or parse; one section failing does not fail the page). `previous` is `{id, seq, employer|null}` of the Student's next lower `seq`, else null. `check` is the flag list or null: it is non-null only when the stored `letter_check` is readable and its `letterRev` and `gapsRev` equal the row's `letter_rev` and `gaps_rev` and a Letter is shown. A stale, unreadable or absent check is null. A stale check is never shown as valid.
- Page: `h1` catalogue heading «JA-NNN · {arbeidsgiver}»; a `<nav>` with the link to the previous entry («JA-001 · Fjord Analytics», to `/historikk/{id}`) when there is one and a link «Historikk»; credits (position, date, Tone of the stored Letter, ad), pulse plot (result placement), score block, keyword lists with «Se gapanalysen» links only when Gaps are shown; then «Gapanalyse» and «Søknadsbrev». Letter with «Kopier» and «Last ned (.docx)» (file year = `createdAt` year), signed with the Profile name; the page waits for the Profile name so a Letter is never signed «[Navnet ditt]»; a failed Profile or answer fails the page with «Prøv igjen» like Historikk.
- No «Lag nytt utkast», no regenerate alert, no «Sjekk igjen»; no AI, no `/api/analyses*` request.
- A section never made shows a `Notice` «Ikke laget.» under its real `h2` (Letter, Gapanalyse). Gapanalyse is hidden when `features.gaps` is off, and when it is null but no Missing keyword exists (the live result shows none then). Stored Gaps are shown whatever the flag says. A Letter with no matching check shows «Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.» (existing `LetterUnchecked`, without its retry). An unreadable section shows «Kan ikke leses.»
- Flag off: `/historikk/[id]` and `GET /api/applications/[id]` answer 404; app bar, Historikk, layout and every existing test behave as after 6.8.

**Never:** Set `accounts` true in `FEATURE_DEFAULTS`; put `FEATURE_ACCOUNTS`, `ENCRYPTION_KEY`, `SECRETS_FILE` values in `compose.yaml`, `.env.example`, README; add a package; touch `package.json`, lockfile, `Dockerfile`, `compose.yaml`, `data/`, `drizzle/`, `scripts/setup.ts`, `scripts/migrate.ts`, `gaps-4`, cached fixtures, Answer keys; build 6.10; touch `GET /api/applications` (list), `/count`, `/next`, `[id]/letter` behaviour; select a column of another Student's row; make a live AI call; touch Hosted; loosen `canonVerbatim`/`checkCitation`/FR-15/FR-17; `git add -A`, `git add .`, `git checkout --`, `git reset --hard`, `git clean`, `git stash`; write or commit in `.logs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Complete entry | Letter, Gaps, matching check | all sections, Tone in credits, check flags on the Letter | n/a |
| No Letter | `letter` null | «Søknadsbrev» + «Ikke laget.», no Tone credit, no buttons | n/a |
| No Gaps | `gaps` null, Missing keywords, gaps on | «Gapanalyse» + «Ikke laget.», no gap links | n/a |
| Gaps off / none due | `features.gaps` off, or no Missing keyword, `gaps` null | no Gapanalyse section | n/a |
| Stale check | `check.letterRev` or `gapsRev` differs from the row's | unchecked notice, no flags, no retry | n/a |
| No check | `letter_check` null, Letter present | unchecked notice | n/a |
| Previous entry | seq 3 with seq 2 existing (also if 1) | link to the highest lower `seq`; first entry has only «Historikk» | n/a |
| Other Student / unknown / malformed id | any | API `NOT_FOUND` 404, page Ikke funnet 404, identical | no existence leak |
| Unreadable section | `letter` or `gaps` fails to decrypt | that section «Kan ikke leses.», rest shown | page does not fail |
| Unreadable job or analysis | fails | heading with number only, Refleksjonsnotat part «Kan ikke leses.», Gaps/Letter still shown if readable | n/a |
| Fetch fails | network | alert and «Prøv igjen» | no crash |
| Flag off | accounts off | 404 on page and route | n/a |

</intent-contract>

## Code Map

- `src/modules/application/server/repository.ts` -- add `getApplicationDetail(studentId, db, id)` next to `getApplicationLetterText`: one `select` by `(id, student_id)`, `openSection` + zod per section (`job` {jobAd,jobTitle,employer}, `analysisResultSchema` from `match/contracts`, `z.array(gapSchema)`, `letterSchema`, `letterCheckSchema`), plus the `previous` query (only when found). Null when no row. Export through `src/modules/application/index.ts`.
- `src/modules/application/contracts.ts` -- `savedApplicationSchema` and a `savedSection(value)` helper (`ok`/`missing`/`unreadable`).
- `src/app/api/applications/[id]/route.ts` (new) -- model on `[id]/letter/route.ts` (`handleStudent`, `Cache-Control: no-store`, `z.uuid()` guard, `ApiError("NOT_FOUND")`).
- `src/app/historikk/[id]/page.tsx` (new) -- model on `src/app/historikk/page.tsx`: `connection()`, flag off `notFound()`, `requireStudentPage()`, uuid guard, then `getApplicationMeta(studentId from getPageSession(), db, id)` null gives `notFound()`; renders `<SavedApplication id>`; static title `messages.saved.title`.
- `src/modules/application/ui/saved-application.tsx` (new, `"use client"`) and `use-applications.ts` (add `useSavedApplication(id)`, key `["applications","detail",id]`, `refetchOnMount: "always"`, same `ApplicationRequestError` handling as the list; export from `ui/index.ts`) -- compose `CatalogueHeading`, `CreditsList`, `PulsePlot`, `ScoreBlock`, `KeywordList`, `GapsSection`, `LetterSection`, `Notice`, `AiPlaceholder`, `SkeletonRows`, `Alert`, `Button`, `useProfile` (as `history-page.tsx` and `result-view.tsx` do). Ad paragraphs = `splitParagraphs(job.jobAd)` (`@/modules/keywords/core`); date format and credits as `result-view.tsx`/`catalogue-register.tsx`; gap targets as `use-phase-two.ts` (`gapTargetId`); `rewording={useRunMode().features.rewording}`.
- `src/modules/letter/ui/{letter-section,letter-actions,letter-view,letter-flags}.tsx` -- add `readOnly` to `LetterSection` and `LetterActions` (no regenerate button, regen alerts or notices; `onRetry`/`onRegenerate` optional) and an optional `year` passed to `downloadLetter`; `LetterUnchecked` shows its retry button only when `onRetry` is given, and `LetterView` passes `onRetryCheck` straight through. Fresh-result behaviour must not change.
- `src/shared/ui/messages.nb.ts` -- new `saved` group (title, nav label, previous link, «Ikke laget» strip and text, «Kan ikke leses.», failure); reuse `messages.history.unreadable`, `messages.networkFailure`, `messages.letter.retry`.
- Tests: `repository.test.ts` (add), `[id]/route.test.ts` (new, model on `[id]/letter/route.test.ts` and `test/accounts-kit`), `saved-application.test.ts` (pure parts), additions to `letter-ui.test.ts`/`letter-flags.test.ts`, page test if `soknad/page.test.ts` pattern fits, `e2e/applications-reopen.spec.ts` (new; model on `e2e/applications-history.spec.ts`, server 3107 accounts on, 3100 off; axe at 1280 and 360 px; use `page.route` to plant a stale check by editing nothing in the DB: create the stale state through the real routes, for example a Letter written again after the check).

## Tasks & Acceptance

**Execution:**
- Repository, contracts, API route, page, UI, letter readOnly, messages, tests, in that order.
- `e2e`: opens from a Historikk row; previous link and «Historikk»; Tone credit equals the Tone saved; «Kopier» and download work (file name year); no «Lag nytt utkast», no `/api/analyses*` request on open; «Ikke laget.» for an entry without Letter and without Gaps; unchecked notice; other Student's id and a random uuid give identical Ikke funnet; flag-off server 404.
- `sprint-status.yaml`: `6-9-reopen-a-saved-application: done` in the same PR.

**Acceptance Criteria:**
- Given the matrix, when `npm test` and `npm run typecheck` run, then all pass; every edited existing test is listed in the result.
- Given another Student's session, when it opens or fetches an id of the first Student, then it gets exactly what an unknown id gets, with no difference in status, body, headers or code path.
- Given the flag off, when the app runs, then the new page and route are 404 and nothing else changed.

## Spec Change Log

## Review Triage Log

## Design Notes

Choices for `issues.md`: the server compares the stored check's revs with `letter_rev`/`gaps_rev` and sends flags only on a match (the client never sees a stale check); the detail answer carries the Job ad text (needed for the pulse plot and the ad quotes) but never the CV text; Gapanalyse is hidden when null with no Missing keyword (nothing was due), not shown as «Ikke laget.»; page title is static; page checks the row exists on the server (same 404 as an unknown URL) and the client then fetches the detail through the API.

## Verification

**Commands:**
- `npx biome check`, `npm run typecheck`, `npx vitest run` -- expected: pass
- `npm test` -- expected: biome, tsc, vitest and Playwright pass
