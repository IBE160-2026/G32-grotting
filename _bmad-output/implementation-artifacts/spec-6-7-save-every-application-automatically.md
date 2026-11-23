---
title: 'Save every Application automatically'
type: 'feature'
created: '2026-11-23'
status: 'in-review'
baseline_revision: '1d127434bbdd4108c694381672577b3943087e20'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-6-use-my-profile-on-soknad.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** With accounts on, a Student's result vanishes when the tab closes: nothing is stored, the Application has no catalogue number, and the screen cannot say it is saved.

**Approach:** With `FEATURE_ACCOUNTS` on, phase 1 saves one encrypted `applications` row (AD-8: conditional upsert, `seq` = max+1 per Student, `match_score` from the score), each phase-2 route writes its part (Letter, Gaps, check) guarded by revisions, and Søknad shows `JA-NNN` in the form and result headings plus «Lagret i Historikk som JA-NNN.». A failed save never takes the result from the screen. With the flag off nothing is stored and the screen is unchanged.

## Boundaries & Constraints

**Always:**
- Everything personal goes through `encryptedJson`/`encryptedText` from `shared/server/crypto.ts`: `job` (`{jobAd, jobTitle, employer}`), `analysis` (the `AnalysisResult`), `gaps`, `letter`, `letter_check` are encrypted columns (`gaps`, `letter`, `letter_check` nullable). Plain columns only: `id`, `student_id`, `fingerprint`, `seq`, `match_score`, `letter_rev`, `gaps_rev`, `created_at`, `updated_at`. The CV text is never a column and never inside a section.
- `studentId` comes only from the session (`handleCaller`/`handleStudent`), first parameter of every repository function; rows are found by `(id, studentId)`. A missing row and another Student's row give the same `NOT_FOUND`.
- Phase 1 (accounts on, a session): `INSERT … ON CONFLICT (id) DO UPDATE SET job, analysis, fingerprint, match_score, letter = NULL, gaps = NULL, letter_check = NULL, letter_rev = 0, gaps_rev = 0, updated_at WHERE applications.fingerprint <> excluded.fingerprint AND applications.student_id = excluded.student_id`. `seq` is a subquery `coalesce(max(seq),0)+1` over the Student's rows inside the same INSERT; a unique violation on `(student_id, seq)` is retried (a few attempts); any other error propagates. A true double submit changes nothing and returns the row's own `seq`. An id that belongs to another Student writes nothing and counts as a failed save (no leak).
- Phase-2 routes (accounts on) first check that `(applicationId, studentId)` exists (`NOT_FOUND`, before any AI request). The Letter route writes `letter` and `letter_rev = letter_rev + 1` only on success; the Gaps route writes `gaps` and `gaps_rev = gaps_rev + 1` only on success; the check writes `letter_check` only `WHERE letter_rev = $letterRev AND gaps_rev = $gapsRev`. Every phase-2 write is also guarded by `fingerprint = $request fingerprint`. A phase-2 write that fails or matches no row is logged (`log({kind:"error", code, errorName, route})`, no content) and never changes or withholds the answer.
- The phase-1 response gains `saved: { seq } | null` only with accounts on (`null` = not saved). A failed save (any thrown error, or an id that is not the Student's) answers normally with `saved: null`. With accounts off the key is absent and no `applications` code runs.
- Save failure on screen: the score, plot and keyword lists stay; a calm `Notice` says it was not saved and that the Letter and Gap analysis are not written now; phase 2 is not started (its routes need the row); «Endre annonsen» then submitting again retries with the same id. Nothing is promised that is not stored: no `JA-NNN`, no saved line, no saved sentence in any announcement.
- Strings in `messages.nb.ts` (bokmål), verbatim: heading «JA-003 · Ny søknad» (number dimmed, DM Mono, muted «·»), lede «Neste nummer i katalogen. Fyll inn annonsen, så regner vi ut hvilke av nøkkelordene CV-en din dekker.», result heading «JA-002 · {arbeidsgiver}», «Lagret i Historikk som JA-002.» under it, the phase-2 live line with the saved sentence appended (`{line} Lagret i Historikk som JA-002.`, for every phase-2 outcome, only when saved). The number is formatted by `application/core` (`JA-` + at least 3 digits, zero-padded, grows from 1000).
- Browser storage: no new key and nothing new in `sessionStorage`/`localStorage` (`seq`, the saved flag and the next number live in component state and the TanStack cache only). Logs carry codes, names and routes only, never a keyword, text, id of another Student or token.
- Flag off: every behaviour, screen, response and test as after 6.6 (existing tests unchanged and green).

**Never:** Set `accounts` true in `FEATURE_DEFAULTS`; put `FEATURE_ACCOUNTS`, `ENCRYPTION_KEY`, `SECRETS_FILE` values in `compose.yaml`, `.env.example`, README; add a package; touch `package.json`, lockfile, `Dockerfile`, `compose.yaml`, `data/`, `scripts/setup.ts`, `scripts/migrate.ts`, `gaps-4`, `data/fixtures/*/cached/*.json`, Answer keys; edit an existing migration; store the CV text, a name or any plain text of the ad/letter outside an encrypted column; make a live AI call; touch Hosted; build 6.8+ (no Historikk, no list route, no reopen); loosen `canonVerbatim`, `checkCitation`, FR-15/FR-17, encryption, session expiry or the `studentId` rule; log, print or store a CV text, name, token, hash or key; `git add -A`, `git add .`, `git checkout --`, `git reset --hard`, `git clean`, `git stash`; write or commit in `.logs/`; skip, delete or loosen an existing test (an existing test whose subject this story changes by AC may be edited minimally; list each).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First save | accounts on, Student with no rows, new `applicationId` | row inserted, `seq` 1, `match_score` = `analysis.score`, AI columns null, revs 0; response `saved: {seq:1}` | n/a |
| Second Application | same Student, another id | `seq` 2 (max+1) | n/a |
| True double submit | same id, same fingerprint | no change (row, `updated_at`, `seq`); response `saved: {seq}` of the existing row | n/a |
| Changed inputs, same id | same id, new fingerprint, row is the Student's | job/analysis/fingerprint/match_score replaced, letter, gaps, letter_check cleared, revs 0, `seq` kept | n/a |
| Another Student's id | id exists for Student B, A submits it | B's row untouched; A's response `saved: null` | no leak, no error |
| Concurrent phase 1 | two saves at once, same Student | two different `seq`, no crash | unique violation on `(student_id, seq)` is retried; other DB errors propagate to `saved: null` |
| Save error | repository throws | response has result and fingerprint, `saved: null`; screen: score stands, calm notice, no `JA-NNN`, no saved line, no phase 2 | logged by code and route only |
| Letter written | phase-2 Letter ok | `letter` set, `letter_rev` +1 | route checks row first; no row or other Student: `NOT_FOUND`, no AI request |
| Letter fails | provider/cap/test-mode error | row unchanged (old Letter, same rev) | as today |
| Gaps written | Gaps ok | `gaps` set, `gaps_rev` +1 | as Letter |
| Check, revs match | `letterRev`/`gapsRev` equal the row | `letter_check` stored | n/a |
| Check, revs differ | stale `letterRev` or `gapsRev` | nothing stored; flags still answered | n/a |
| Other Student reaches a route | B's session, A's `applicationId` on `/letter`, `/gaps`, `/letter-check` | `NOT_FOUND`, no AI request, A's row untouched (FR-19) | n/a |
| Raw row | any stored row | no plain text of ad, title, employer, CV, keywords, letter, gaps or flags in any column | n/a |
| Accounts off | flag off | no row, no `saved` key, headings «Ny søknad» and employer alone, no lede, no saved line | unchanged |
| Next number | `GET /api/applications/next`, session | `{ seq }` = max+1 (1 when none); form shows «JA-00N · Ny søknad» with the lede; load pending/failed shows «Ny søknad» without a number | no session `SESSION_EXPIRED`; flag off `NOT_FOUND` |

</intent-contract>

## Code Map

- `src/modules/application/server/schema.ts` (new) -- `applications` table (`pgTable`, owned by `application`): `id uuid PK` (client-generated, no default), `student_id uuid NOT NULL REFERENCES studentIdRef ON DELETE CASCADE` (pattern of `src/modules/profile/server/schema.ts`), `job`/`analysis` `encryptedJson NOT NULL`, `gaps`/`letter`/`letter_check` `encryptedJson` nullable, `fingerprint text NOT NULL`, `seq integer NOT NULL`, `match_score integer NOT NULL`, `letter_rev`/`gaps_rev integer NOT NULL DEFAULT 0`, `created_at`/`updated_at timestamptz NOT NULL DEFAULT now()`, `UNIQUE (student_id, seq)`. drizzle-kit picks up `src/modules/*/server/schema.ts` by glob. Migration `drizzle/0006_*.sql` + snapshot + journal via `NODE_OPTIONS=--conditions=react-server npm run db:generate` (db:generate fails without it); then `npm run db:check`.
- `src/modules/application/server/repository.ts` (new) -- `Executor` type (`PgDatabase<PgQueryResultHKT>`, as `profile/server/profiles.ts`); `saveAnalysis(studentId, db, input) -> {status:"saved"|"unchanged", seq} | {status:"foreign"}` (upsert above with `onConflictDoUpdate({target, set, setWhere})`, `.returning`, then a plain `(id, studentId)` select when nothing came back, retry loop on a unique violation of `(student_id, seq)`: postgres-js and PGlite errors carry `code 23505`, possibly under `.cause` when Drizzle wraps them); `getApplicationMeta(studentId, db, id)` (plain columns only, no decryption); `nextSeq(studentId, db)` (`coalesce(max(seq),0)::int + 1`); `saveLetter`, `saveGaps`, `saveLetterCheck` (guarded UPDATEs, `letter_rev = letter_rev + 1` as SQL, return whether a row changed). A section is `{available:true, contractVersion, data}` (`encryptedJson`'s `Section`); keep one `SECTION_VERSION` constant.
- `src/modules/application/core/catalogue-number.ts` (+ test) -- `formatCatalogueNumber(seq)` -> `JA-001`; pure.
- `src/modules/application/index.ts` -- export the repository functions and `formatCatalogueNumber` (server side). `src/modules/application/contracts.ts` -- `savedSchema = {seq}`; `analyseResponseSchema` gains `saved: savedSchema.nullable().optional()`; `nextApplicationSchema = {seq}`. Keep every existing export.
- `src/app/api/analyses/route.ts` -- after `analyseInputs` ok and only with `ctx.session` set: `try { saveAnalysis(...) } catch { log; saved = null }`, return `{ ...analysed.value, saved }`; no session: return `analysed.value` unchanged (no `saved` key). `[id]/letter/route.ts` / `[id]/gaps/route.ts` -- with a session: `getApplicationMeta` first (`NOT_FOUND` when null), then after success a guarded write inside try/catch; `[id]/letter-check/route.ts` -- row check first, then `saveLetterCheck(..., {letterRev, gapsRev})` inside try/catch. The check's `letter_check` data is the `LetterCheck` answer (`flags`, `letterRev`, `gapsRev`), the Letter data is `{text, tone, rev}`, the Gaps data is the `Gap[]`. Read-only: `handleCaller` (`identity/server/handle-student.ts`), `aiContextFor`, `log`.
- `src/app/api/applications/next/route.ts` (new) -- `GET` via `handleStudent` -> `{ seq: await nextSeq(...) }`, `dynamic = "force-dynamic"`. The proxy (`session-gate.ts`) already requires a cookie for every `/api/*`.
- `src/modules/application/ui/use-next-number.ts` (new) -- `useNextApplication({enabled})` (`useQuery`, key `["applications","next"]`, `callApi` + `nextApplicationSchema`, refetch on mount); invalidate it after a saved phase 1.
- `src/shared/ui/components/catalogue-heading.tsx` -- optional `number` (mono) with a `dim` option: number, muted `aria-hidden` «·», an sr-only «, » (the `lead` construction), then children; existing props and output unchanged without `number`.
- `src/modules/application/ui/application-form.tsx` -- `show()` reads `answer.saved`: saved -> `Outcome.saved = {seq}`, `phaseTwo.begin(job, result, savedLine)`; `saved === null` (accounts on) -> `Outcome.saved = null`, no `begin`, announce `phaseOneLine(result)` plus the not-saved sentence; accounts off (`saved` undefined) -> as before. Form heading with accounts on and a known next number: `<CatalogueHeading number=… dim>Ny søknad</…>` and the lede (`text-lede text-ink-2`, like `src/app/konto/page.tsx`). `onRerun` keeps `saved`. `backToForm` keeps working (invalidate next number after save).
- `src/modules/application/ui/result-view.tsx` -- heading `number={JA-NNN}` + employer when `outcome.saved` has a seq; the saved line `<p>` under the heading (silent: no live region); the not-saved `Notice` when `saved === null`; unchanged otherwise.
- `src/modules/application/ui/use-phase-two.ts` + `phase-two-line.ts` -- `begin(job, result, savedLine?)`; the phase-2 announcement (`speakPhaseLine`, used by `settleLetter` and `settleSection`) appends the saved sentence when given; extend `phase-two-line.test.ts`, do not change existing expectations.
- `src/shared/ui/messages.nb.ts` -- `application.headingNext`/`lede`, `application.notSaved` (label and text, calm, promising nothing, e.g. «Søknaden ble ikke lagret i Historikk. Samsvaret over er riktig, men brevet og gapanalysen skrives ikke nå. Prøv igjen om litt.»), `result.saved(number)`.
- Tests (new): `application/core/catalogue-number.test.ts`; `application/server/repository.test.ts` (PGlite via `getDb`, `ACCOUNTS_ENV` from `test/accounts-kit.ts`: every matrix row about rows, revs, guards, ownership; raw-row plain-text inspection with `db.execute(sql\`select * from applications\`)`; seq retry with a fake executor that throws a unique violation once; two simultaneous saves -> distinct `seq`); route tests: extend the accounts-on tests beside each analyses route (`route.accounts.test.ts`) and `src/app/api/applications/next/route.test.ts` (second Student cannot reach A's id on all three phase-2 routes, row unchanged, no AI call; save error -> `saved: null`; flag off writes nothing); `e2e/applications-save.spec.ts` on the local accounts-on servers of `playwright.config.ts` (see `e2e/soknad-profile.spec.ts`, `session-expiry.spec.ts` for sign-in and axe helpers): heading «JA-001 · Ny søknad» and lede, result «JA-001 · Nordic Digital» with the saved line, back to form shows «JA-002 · Ny søknad», second submit numbers 2, double submit keeps the number, `page.route` stub of `**/api/analyses` with `saved: null` shows the notice and sends no `/letter` request, axe on form and result at 1280 and 360 px. Existing accounts-on tests that `vi.mock("@/modules/application", …)` need the new exports (minimal edit, list each); e2e that assert the old accounts-on headings may be edited minimally (list each). Nothing else.
- Read-only references: `epic-6-context.md`, ARCHITECTURE-SPINE AD-8/AD-9/AD-10/AD-11, UX `EXPERIENCE.md` (Catalogue numbering, Key strings) and `DESIGN.md` (`catalogue-heading`), `src/shared/server/crypto.ts`, `src/modules/profile/server/*` (patterns), `src/modules/identity/server/ai-caller.ts`.

## Tasks & Acceptance

**Execution:**
- Files in the Code Map in the order: schema + migration, repository, core, contracts/index, the four analyses routes, next-number route, heading component, messages, form/result/phase-two, tests.
- Unit and route tests for every matrix row that is logic; `e2e/applications-save.spec.ts` for the on-screen rows.

**Acceptance Criteria:**
- Given the matrix, when `npm test` and `npm run typecheck` run, then all pass and every edited existing test is listed in the result.
- Given `FEATURE_ACCOUNTS` off, when the app runs, then nothing is stored, no response carries `saved`, and Søknad, the result and `/api/analyses*` behave as after 6.6 (existing tests unchanged and green).
- Given another Student's session, when it calls a phase-2 route with the first Student's `applicationId`, then it gets `NOT_FOUND`, no AI request is made and the row is unchanged.
- Given a stored row, when the raw table is read, then no encrypted field appears in plain text and no column holds the CV text.
- Given the migration, when `docker compose run --rm --build test` runs, then it is green (or `ci` is the criterion if Docker Desktop misbehaves as in 6.3/6.6; do not raise timeouts).

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 30 findings filed (14 blind, 12 edge, 4 verification-gap; rows below group same-cause findings) — high 0, medium 3, low 26, false 1, maybe-false 0 (intent-alignment is descriptive)
- findings:
  - `[medium]` `patch` Client and row revs drift after a same-fingerprint resubmit or a failed write, so the check is never stored (blind, edge, verification-gap) — `saveLetter` now writes `letter_rev = letter.rev`, `saveGaps` writes `gaps_rev = previousRev + 1` (new optional `previousRev` on the Gaps request, sent only with accounts on); route-level PGlite tests for the resubmit flow.
  - `[low]` `patch` Letter/Gaps stale write is logged as NOT_FOUND (blind, edge) — logged as ANALYSIS_STALE / NoRowWritten.
  - `[medium]` `patch` Retry on a seq conflict was only tested with a fabricated error (verification-gap, edge on `isSeqConflict`) — `isSeqConflict` exported and tested against the real PGlite unique violation and a primary-key violation.
  - `[medium]` `patch` Raw-row inspection was repository-level only (intent-alignment, verification-gap) — a raw-row test after a full route flow.
  - `[low]` `reject` Saved sentence is spoken when a phase-2 write failed (blind, edge) — the Application is saved at phase 1; a response flag and UI for per-section storage is more than the AC asks; written to issues.md as a known limit.
  - `[low]` `reject` Fingerprint mismatch spends the AI request before the write finds no row (blind) — only after a stale rerun race; the write is guarded, nothing wrong is stored.
  - `[low]` `reject` Copy-pasted try/catch/log blocks, repeated `getDb()` (blind) — three short blocks; a helper adds surface for no behaviour.
  - `[low]` `reject` No cap on Applications per Student (blind) — not in the AC; the Daily cap bounds AI use, phase 1 is code only.
  - `[low]` `reject` `isSeqConflict` permissive without a constraint name, no backoff (blind, edge) — PGlite gives the name (tested); five immediate retries resolve a same-Student race.
  - `[low]` `reject` `seq` could be reused after a future delete (blind) — History has no delete (D5).
  - `[low]` `reject` Lede and heading number pop in after the fetch (blind) — the matrix says pending/failed shows «Ny søknad» without a number.
  - `[low]` `reject` Not-saved notice has no retry button; no component test (blind, intent) — AC: say it calmly; retry is «Endre annonsen» and submit, covered by an e2e stub.
  - `[low]` `reject` `CatalogueHeading` takes `number` and `lead` (blind) — no caller passes both.
  - `[low]` `reject` e2e `waitForTimeout`, hard-coded ports (blind) — the ports are the config's; the wait proves a request was not sent.
  - `[low]` `reject` `saved` is a tri-state on the wire (blind) — flag-off responses must stay byte-identical.
  - `[low]` `reject` No CHECK constraints or retention path (blind) — Zod validates; History has no delete.
  - `[low]` `reject` Rerun `saved` ignored; a rerun clears sections the screen still shows; A to B to A race (edge x3) — needs ANALYSIS_STALE or a rapid edit, and the screen's sections stay; not in the AC.
  - `[low]` `reject` Next-number cache can show an earlier Student's number; not invalidated when `saved` is null; foreign id retried for ever (edge x3) — the cache lives per page load, an id is a random UUID, the number is advisory and the result heading shows the real one.
  - `[false]` `reject` Non-integer score breaks the integer column (edge) — `analysisResultSchema.score` is an int 0 to 100.
  - `[low]` `reject` Old Letter/Gaps stay on the row after an unchanged resubmit whose new phase 2 fails (verification-gap) — same fingerprint means the same inputs, so the old content is still true.
  - `[low]` `reject` Weak assertion of the stale-write log (verification-gap) — covered by the patched log-code assertion.
  - Intent layer (descriptive): reading A (write model) with the screen carried through; narrow reading of «storage failure» (score stands, phase 2 not started); concurrency and FR-19 proven at repository and route level on PGlite, not a real Postgres race.

## Design Notes

Choices (the parent writes them to `issues.md`): the next number comes from a new `GET /api/applications/next` (6.8 adds the list route beside it); the phase-1 response carries `saved`; a failed phase-1 save skips phase 2 (the phase-2 routes need the row, and nothing unsaved is promised), while the score stays; phase-2 writes are best-effort and logged (the answer is never withheld), so a failed Letter write leaves the Application without that section; every phase-2 write also requires the request fingerprint to equal the row's; the saved sentence is appended to every phase-2 announcement when saved; the form heading number is the Student's next free `seq` at load, so two open tabs can show the same number and the result heading shows the real one (the AD review's known edge); the `fingerprint` (an unsalted sha256 that covers CV text, ad, title and employer) is plain by AC. Phase 2 still recomputes phase 1 from the raw inputs; the CV text is never read back from the row.

Review change (outside the contract): revs are written as the client works with them (`letter_rev = letter.rev`, `gaps_rev = previousRev + 1`) instead of `rev + 1`, so a resubmit with unchanged inputs and a failed write cannot make the check's rev guard fail for good; the guard itself is unchanged.

## Verification

**Commands:**
- `NODE_OPTIONS=--conditions=react-server npm run db:generate` then `npm run db:check` -- expected: one new migration, check passes
- `npm run typecheck`, `npx biome check`, `npx vitest run <changed files>` -- expected: pass
- `npm test` -- expected: biome, tsc, vitest and Playwright (`--workers=2`) pass
- `docker compose run --rm --build test` -- expected: pass, or documented as in 6.3/6.6
