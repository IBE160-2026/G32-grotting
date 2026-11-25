---
title: 'Find my Applications in Historikk'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_revision: '888cdc353819918805e5060ad86d74f825d199b3'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-7-save-every-application-automatically.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** With accounts on, a Student's saved Applications (Story 6.7) cannot be found again: `/historikk` is a placeholder, the app bar shows no count, and a stored Letter cannot be copied or downloaded.

**Approach:** With `FEATURE_ACCOUNTS` on, `/historikk` renders the catalogue register (table at laptop width, `<ol>` at 640 px or less), fed by `GET /api/applications` (20 per page, `total`). Each row's Letter is fetched from the server on a press (`GET /api/applications/[id]/letter`), never carried by the list. The app bar shows the entry count. With the flag off nothing changes.

## Boundaries & Constraints

**Always:**
- `studentId` comes only from the session (`handleStudent`); every query selects by `student_id` (list, count) or by `(id, student_id)` (Letter). Another Student's id, an unknown id, a malformed id and an entry without a Letter give the same NOT_FOUND.
- The list answer carries only: `id, seq, createdAt, score, matchedCount, totalCount, jobTitle, employer, hasLetter` plus `total, firstSeq, lastSeq, page, pageSize`. `job` and `analysis` are decrypted on the server for the title, employer and counts; the Job ad, keyword lists, Evidence, Gaps, check and Letter text are never selected into the answer (`hasLetter` is `letter is not null`). A section that cannot be read gives `null` fields, not a failed page.
- Nothing new is written: no migration, no new column, no new key in `sessionStorage`/`localStorage`. No decrypted text in logs, URLs or errors.
- The Letter copy and the .docx reuse `renderLetter` and `downloadLetter` (`letter/ui`), signed with the Profile name; the file year is the entry's `createdAt` year.
- Register: `<table>` with hidden caption, `th scope="col"`, job title as `th scope="row"`; `<ol>` at ≤ 640 px; the other has `display: none`. Rows show number, title link (`/historikk/[id]`, built by 6.9), employer, date, score sentence and Verdict strip in words, «Åpne», «Kopier brev», «Last ned (.docx)» with entry-specific accessible names. Rows without a Letter have the two buttons disabled and say «Brevet er ikke laget.».
- Pagination `nav aria-label="Sider"`: «Forrige» absent on page 1, «Neste» absent on the last, «Side 2 av 4»; a page change moves focus to the caption (laptop) or the `h1` (≤ 640 px) and announces «Side 3 av 4» in the second live region.
- Empty state: ghost «JA-001» (aria-hidden), the FR-21 sentence, «Den første søknaden du lager, får nummer JA-001.», primary «Lag skreddersydd søknad», flat plot (aria-hidden).
- App bar: with a logged-in Student with entries, «Historikk» shows the count (accessible name «Historikk, 2 oppføringer»); the count follows the list and a save; flag off or none: unchanged.
- Flag off: `/historikk`, `/api/applications*` answer 404; app bar, layout and every existing test behave as after 6.7.

**Never:** Set `accounts` true in `FEATURE_DEFAULTS`; put `FEATURE_ACCOUNTS`, `ENCRYPTION_KEY`, `SECRETS_FILE` values in `compose.yaml`, `.env.example`, README; add a package; touch `package.json`, lockfile, `Dockerfile`, `compose.yaml`, `data/`, `drizzle/`, `scripts/setup.ts`, `scripts/migrate.ts`, `gaps-4`, cached fixtures, Answer keys; build 6.9 (`/historikk/[id]`, `GET /api/applications/[id]`) or 6.10; add search, delete or rename; put Letter text in the list answer; touch Hosted; make a live AI call; `git add -A`, `git add .`, `git checkout --`, `git reset --hard`, `git clean`, `git stash`; write or commit in `.logs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Two entries | Student with 2 rows | summary «JA-001–JA-002 · 2 søknader, nyeste først», JA-002 first | n/a |
| One entry | 1 row | «JA-001 · 1 søknad, nyeste først» | n/a |
| Paging | 21+ rows | page 1 holds 20, `total` 21, page 2 holds the oldest; `Forrige`/`Neste` by position | `page` not a whole number ≥ 1: `INVALID_INPUT` (400) |
| Empty | no rows | empty state, no table, no `nav` | n/a |
| Other Student | B's session, A's rows | B's list empty, count 0; A's id on the Letter route is NOT_FOUND | same body as unknown id |
| Letter fetch | row with Letter | text with `{{SIGNATUR}}` returned; browser signs it with Profile name | NOT_FOUND for missing, foreign, malformed, no Letter, unreadable |
| No Letter | row, `letter` null | `hasLetter` false, two buttons disabled, note shown | n/a |
| Unreadable section | `job`/`analysis` fail to decrypt | row listed with «Kan ikke leses» and score only | no failure of the page |
| Fetch fails | Letter request fails on press | calm alert «Brevet kunne ikke hentes. Prøv igjen.», nothing copied | no crash |
| Flag off | accounts off | 404 on page and routes, nav unchanged | n/a |

</intent-contract>

## Code Map

- `src/modules/application/server/repository.ts` -- `listApplications`, `countApplications`, `getApplicationLetterText` (the only readers of the rows for Historikk; `openSection` + zod pick title/employer/counts).
- `src/modules/application/contracts.ts` -- entry/list/count/letter schemas, `APPLICATIONS_PAGE_SIZE`, query schema.
- `src/app/api/applications/route.ts`, `count/route.ts`, `[id]/letter/route.ts` -- `handleStudent` routes; `next/route.ts` untouched.
- `src/modules/application/ui/{history-page,catalogue-register,register-actions,empty-state,use-applications}` -- Historikk UI; `src/app/historikk/page.tsx` replaces the placeholder.
- `src/shared/ui/{use-history-count.ts,components/app-bar.tsx,components/copy-button.tsx,messages.nb.ts}`, `src/app/layout.tsx` -- count by «Historikk» (server count as initial data, one `QueryProvider` around header and main), CopyButton gains `label`, `blockedText` and a text fetched on press.
- `src/modules/letter/ui/index.ts` -- exports `renderLetter`, `downloadLetter` for reuse.
- Tests: `repository.test.ts`, three route tests, `catalogue-register.test.ts`, `copy-button.test.ts`, `e2e/applications-history.spec.ts`; `e2e/accounts-screens.spec.ts` placeholder loop reduced to `/konto`.

## Tasks & Acceptance

**Execution:**
- Files in the Code Map, repository and routes first, then UI, then tests.

**Acceptance Criteria:**
- Given the matrix, when `npm test` and `npm run typecheck` run, then all pass; every edited existing test is listed.
- Given the flag off, when the app runs, then `/historikk` and `/api/applications*` are 404 and nothing else changed.
- Given another Student's session, when it lists or fetches a Letter, then it sees no rows and the same NOT_FOUND as for an unknown id.

## Spec Change Log

## Review Triage Log

### 2026-11-25 — Review pass
- verdicts: 35 findings filed (15 blind, 15 edge, 3 verification-gap plus 2 other; rows below group same-cause findings, 23 rows) — high 0, medium 4, low 16, false 3, maybe-false 0 (intent-alignment is descriptive)
- findings:
  - `[medium]` `patch` Blind: copy after an awaited fetch fails on Safari/iOS (user activation lost); edge: same — `writeLazyToClipboard` hands the promised text to `ClipboardItem` inside the press, falls back to `writeText`; unit tests in `clipboard.test.ts`.
  - `[medium]` `patch` Blind, edge: a failed Profile query leaves the name null, so a Letter is copied or downloaded signed «[Navnet ditt]» — a failed Profile now fails the page (alert and retry that refetches both), the register is shown only with the name.
  - `[low]` `reject` Blind: an ended session leaves the heading with no body — `callApi` ends the session and goes to Logg inn at once; same as Profil.
  - `[low]` `reject` Blind, edge: every Letter failure reads «Brevet kunne ikke hentes. Prøv igjen.» — an ended session leaves through `callApi`; an unreadable Letter is rare and retry is harmless.
  - `[medium]` `patch` Blind, verification-gap: `CopyButton` function-text branches, `HistoryPage`, the download failure, the blocked clipboard and the list failure untested — `writeLazyToClipboard` unit tests, and three e2e cases (download fails, blocked clipboard in Historikk's own words, list fails then retry works).
  - `[low]` `reject` Blind: focus on the `sr-only` caption has no visible ring — EXPERIENCE.md prescribes focus on the register's caption.
  - `[medium]` `patch` Blind, edge: the page is announced and focus moves before the new page has loaded — the effect now waits for `data.page === pendingPage`; a failed load announces nothing.
  - `[low]` `patch` Blind, edge: `messages.history.listLabel` unused, the `<ol>` has no accessible name — `aria-label` on the `<ol>`.
  - `[low]` `reject` Blind: the table's scroll container is not focusable — it contains links and buttons, so axe's `scrollable-region-focusable` passes; EXPERIENCE.md allows the container to scroll.
  - `[low]` `defer` Blind, edge: count and list caches are not scoped by Student or cleared on logout — a logout and login in one tab is a full page load today; 6.10 clears `["applications"]` on logout (goal.md); written to issues.md.
  - `[low]` `reject` Blind, edge, verification-gap: `total` and the page are two statements — a save in between gives a one-row mismatch for one response; cosmetic.
  - `[low]` `reject` Blind: decrypting `job` and `analysis` for 20 rows — AD-11 allows only encrypted columns for these; the list needs title, employer and counts.
  - `[low]` `patch` Blind: no `Cache-Control: no-store` on the three new GET routes — set on the answers, asserted in the route tests.
  - `[low]` `patch` Blind: `applicationCountSchema` unused — removed.
  - `[false]` `reject` Blind: a download with an unreadable employer gets a malformed file name — `letterFileName` leaves out an empty part.
  - `[low]` `reject` Blind: `page=1e2` accepted, a page beyond the last answers 200 with no entries — harmless; the UI only asks for pages that exist.
  - `[low]` `reject` Blind: two links per row to the same page — both are in the AC (title link and «Åpne»).
  - `[low]` `reject` Blind, edge: the links lead to a 404 until 6.9 builds the page — known and by the goal's order (6.9 follows 6.8); written to issues.md.
  - `[low]` `reject` Edge: a page beyond the last with `total` above 0 — no delete exists (D5), so the pages only grow; the UI never asks for one.
  - `[false]` `reject` Edge: a stored `match_score` outside 0 to 100 fails the page — the column is written from `analysis.score`, an integer 0 to 100 by schema.
  - `[low]` `reject` Edge: the blocked state of a lazy copy never resets — it resets on the next press, as the blocked state of a plain copy does.
  - `[low]` `reject` Edge, claim: the 640 px breakpoint of the focus code may drift from `max-640` — both are 640 px; the e2e checks focus at 360 and 1280 px.
  - `[false]` `reject` Verification-gap: count written from the list is unverified redundancy — the save's invalidation and the list's write cover different moments (a list load after another tab's save); kept, cheap.
  - Intent layer (descriptive): reading A (rendered page) with B (API) and C (components) carried through; flag-off isolation by gates; the only changed existing test is the placeholder loop of `e2e/accounts-screens.spec.ts` (`/historikk` removed, the AC replaces the placeholder); the table and `<ol>` are both in the DOM with `display: none` as EXPERIENCE.md prescribes, proven by Playwright's accessibility tree at 1280 and 360 px.

## Design Notes

Choices (for `issues.md`): the count by «Historikk» is a small `GET /api/applications/count` (nothing decrypted) with the server's count as initial data, so it stays right through client navigation; the single-entry summary has no range («JA-001 · 1 søknad, nyeste først»); the download button's accessible name is «Last ned (.docx) for JA-002» (label-in-name, WCAG 2.5.3) where EXPERIENCE.md writes «Last ned JA-002 (.docx)»; page state is component state, not the URL; a row whose Profile name is still loading waits (the whole register shows a skeleton) so a Letter is never signed with the placeholder.

## Verification

**Commands:**
- `npx biome check`, `npm run typecheck`, `npx vitest run` -- expected: pass
- `npm test` -- expected: biome, tsc, vitest and Playwright pass

## Auto Run Result

Status: done

**Summary:** With `FEATURE_ACCOUNTS` on, `/historikk` is the catalogue register: `GET /api/applications` (20 per page, `total`, range) feeds a `<table>` with hidden caption at laptop width and an `<ol>` at ≤ 640 px (one `display: none` while the other shows), rows with number, title link to `/historikk/[id]` (6.9), employer, date, score sentence and Verdict strip, and «Åpne», «Kopier brev», «Last ned (.docx)» with entry-specific names; pagination `nav` with focus and «Side N av M» after the page is on screen; empty state with the ghost «JA-001». The Letter is fetched on a press from `GET /api/applications/[id]/letter` (decrypted, `(id, studentId)`, same NOT_FOUND for every miss) and goes through `renderLetter`/`downloadLetter`. The app bar shows the entry count (`GET /api/applications/count`, server count as initial data). Flag off: 404 on the page and the three routes, app bar unchanged.

**Files:** `src/modules/application/{contracts.ts,index.ts,server/repository.ts,ui/{history-page,catalogue-register,register-actions,empty-state,use-applications}.tsx|ts,ui/index.ts,ui/application-form.tsx}`; `src/app/{historikk/page.tsx,layout.tsx,api/applications/{route,count/route,[id]/letter/route}.ts}`; `src/shared/ui/{use-history-count.ts,clipboard.ts,messages.nb.ts,components/{app-bar,copy-button}.tsx}`; `src/modules/letter/ui/index.ts`; tests `repository.test.ts`, three route tests, `catalogue-register.test.ts`, `clipboard.test.ts`, `copy-button.test.ts`, `e2e/applications-history.spec.ts`; `sprint-status.yaml`.

**Edited existing tests:** `e2e/accounts-screens.spec.ts` (the placeholder loop takes only `/konto`; `/historikk` has its own page); additions only to `repository.test.ts`, `clipboard.test.ts`, `copy-button.test.ts`.

**Review:** four layers; patches applied: lazy clipboard write for Safari/iOS (3 mediums with tests), Profile failure fails the page, announce and focus after the page has loaded, `<ol>` name, no-store headers, dead schema removed, three new e2e cases; one deferred to 6.10 (cache clearing on logout); the rest rejected with reasons in the Review Triage Log. Follow-up review: not recommended.

**Verification:** biome, tsc green; vitest 1751 passed (2 expected fail); Playwright `--workers=2` green including `e2e/applications-history.spec.ts` (14 cases, axe at 1280 and 360 px). Docker test not required (no change to `package.json`, lockfile, `Dockerfile`, `compose.yaml`, `data/`, `drizzle/`, setup or migrate scripts).

**Residual risks:** screen reader and a real 360 px phone not checked; `ClipboardItem` copy only run in Chromium; the title link and «Åpne» lead to 404 until 6.9; the count and list caches are not Student-scoped (6.10 clears them on logout).
