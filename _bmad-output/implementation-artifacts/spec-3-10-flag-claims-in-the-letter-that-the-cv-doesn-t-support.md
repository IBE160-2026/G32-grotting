---
title: 'Story 3.10: Flag claims in the Letter that the CV doesn''t support'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: '05f6e0b119a6e11f42e6cb63cc2b969b17b696e4'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Letter is written by AI from the CV, but nothing checks it. A Letter can claim a Keyword the CV does not show («TypeScript») or make the Student's role bigger than it was («ledet», «forsket»), and the Student may send it without noticing (P1, P3). The Letter output was also never validated at runtime (issues.md, Story 3.4: left for the integrity guard).

**Approach:** A pure `checkLetter` in `integrity/core` scans the Letter with the Keyword engine and returns flags. A new `POST /api/analyses/[id]/letter-check` recomputes phase 1 and runs it. The Søknad page sends the check when a Letter has arrived and shows a warning list between the AI label and the Letter, with a dashed rust underline on each flagged word. Flag only: nothing is removed or rewritten.

## Boundaries & Constraints

**Always:**
- `integrity/core` stays pure and imports only `keywords/core` and `shared/core`. It takes plain inputs (no `letter`, `match` or `application` types).
- Every Missing keyword in the Letter is an Unsupported claim while `gaps` is `null` (the only case before Epic 4). The job title, the employer and `{{SIGNATUR}}` are skipped.
- An Upgrade word is flagged when it is in the Letter and nowhere in the CV text; other forms of a word count as the same word (`sameWord`).
- The server recomputes phase 1 from `inputs`, never trusts Missing keywords from the client, and returns `ANALYSIS_STALE` (409) on a fingerprint mismatch. Wire shapes live in `letter/contracts.ts`; no Norwegian prose from the server.
- The check is sent when a Letter has arrived (first Letter, «Prøv igjen», «Lag nytt utkast»). The client drops a result whose `letterRev` or `gapsRev` differs from the Letter shown. `ANALYSIS_STALE` reruns phase 1 once silently.
- The Letter shows at once; flags are added when the check returns. A failed check keeps the Letter with «Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.» (a Notice, never `role="alert"`) and a retry for the check only.
- All text from `messages.nb.ts`.

**Never:** remove or rewrite Letter text; make the check an AI request (no cap, no notice, no `runAi`); read `data/fixtures/_planted/` outside tests; change the Letter route, the cap or the Test-mode adapter.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Missing keyword in Letter | Letter says «TypeScript»; CV lacks it; `gaps: null` | One `UNSUPPORTED_CLAIM` flag with its spans | — |
| Title, employer, sign-off | Letter holds the job title, the employer, `{{SIGNATUR}}` | Not flagged, even when they hold a Missing keyword | — |
| Upgrade word | Letter «ledet»; CV has no form of «lede» | One `UPGRADE_WORD` flag; «leder» in the CV clears it | — |
| Several occurrences | Same word twice | One flag, two spans | — |
| Clean Letter | Nothing missing, no Upgrade word | `flags: []`, no list | — |
| Stale | Fingerprint differs | 409 `ANALYSIS_STALE`; client reruns phase 1 once | Second one: check failed notice |
| Check fails | Network or 5xx | Letter stays, notice, «Sjekk igjen» | Retry sends the check only |
| Race | New draft arrives before the old check returns | Old result dropped (rev mismatch) | — |

</intent-contract>

## Code Map

- `src/modules/integrity/core/check-letter.ts` (new), `word-lists.ts` (`UPGRADE_WORDS`), `index.ts` -- the check; reuses `findKeyword`, `tokenise`, `stem` from `keywords/core`.
- `data/fixtures/_planted/letter-flags.json` (new) -- planted raw `AiOutput` Letter for the Example pair with a Real-gap Keyword, the job title and an Upgrade word; tests only.
- `src/modules/letter/contracts.ts` -- `letterCheckRequestSchema`, `letterFlagSchema`, `letterCheckSchema`.
- `src/modules/application/server/check-letter.ts` (new), `index.ts` -- `checkLetterFor`: phase 1 + fingerprint + `checkLetter`.
- `src/app/api/analyses/[id]/letter-check/route.ts` (new) -- the route (like `letter/route.ts`).
- `src/modules/letter/core/segment-letter.ts` (new) -- pure: Letter text + flags -> paragraphs of plain and flagged pieces.
- `src/modules/letter/ui/letter-flags.tsx` (new), `letter-view.tsx`, `letter-section.tsx`, `request-letter-check.ts` (new), `index.ts` -- list, highlights, check-failed notice, client request with the stale rerun.
- `src/modules/application/ui/application-form.tsx` -- check state, trigger, rev guard, retry.
- `src/shared/ui/messages.nb.ts`, `e2e/letter-check.spec.ts`, `docs/qa/letter-manual-checks.md`.
- Read-only: `check-tone.ts` (phrase and run matching pattern), `analyse.ts`, `request-letter.ts`.

## Tasks & Acceptance

**Execution:**
- `integrity/core` -- `checkLetter`, `UPGRADE_WORDS`, unit tests incl. planted Letter -- AD-14
- `letter/contracts.ts`, `application/server`, route -- the check endpoint with tests -- AD-6
- `letter/core`, `letter/ui`, `application-form.tsx` -- list, highlights, rev guard, failure notice, retry; unit and e2e tests
- `docs/qa`, `issues.md` -- manual rows for screen reader checks

**Acceptance Criteria:**
- Given the planted Letter (Real-gap Keyword, job title, Upgrade word), when the FR-11 tests run, then exactly the expected flags come back.
- Given flags, when they render, then a warning list sits between the AI label and the Letter, one line per flagged word, each flagged word underlined and linked to its line, nothing removed.
- Given a failed check, when the Letter is on screen, then the notice and a check-only retry show.

## Spec Change Log

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 36 findings — high 0, medium 4, low 9, false 4, maybe-false 0, rejected-as-low-or-design 19 (counted inside the rows below)
- findings:
  - `[medium]` `patch` Job title and employer blanked as bare substrings, hiding flags in longer words (Blind, Edge) — whole-word boundaries added to `namePattern`, unit tests added.
  - `[medium]` `patch` «ansvar for» in the CV does not clear «ansvarlig for» (stems differ): a false flag (Blind, Edge claim, Gap) — `UPGRADE_WORD_CV_FORMS` lets «ansvar for» clear it; unit test added.
  - `[medium]` `patch` Stale rerun adopted by the check is not tested at form level (Gap) — e2e added: new fingerprint reused, score and update line shown.
  - `[medium]` `patch` Late-result test used a clean second Letter, so it passed without the guards (Gap) — e2e now uses a flagged second Letter.
  - `[low]` `patch` Issues entry for the Story 3.4 validation was ticked although only partly done (Blind, Edge claim, Intent) — reopened in `issues.md`.
  - `[low]` `reject` Title skipped only on a full-string match, so a decorated title is not skipped (Blind) — the spec says the job title as entered; partial titles are a heuristic with false skips.
  - `[low]` `reject` Missing unit tests for empty names, special characters, NBSP and so on (Blind) — covered in part by the patches; the rest has no demonstrated defect.
  - `[low]` `reject` Guard depends on `rev` being unique (Blind) — the server counts `previousRev + 1` per draft; the check state also holds a sequence number.
  - `[low]` `reject` No indicator while the check runs (Blind) — the spec says the Letter shows at once and flags are added; open item for a live line is logged.
  - `[false]` `reject` Automatic check announces a score update, contradicting «silent» (Blind, Edge) — the 3.9 rule is to announce a changed score once; nothing is said when it is unchanged.
  - `[low]` `reject` `onRetryCheck ?? noop` swallows a missing handler (Blind) — the only caller passes it; adding a discriminated prop type is more than the harm warrants.
  - `[low]` `reject` `useEffect` with `biome-ignore` (Blind) — one start per arrived Letter object, guarded by a ref; no defect shown.
  - `[low]` `reject` Accessibility of in-text links, extra tab stops, no back link (Blind) — the spec asks for linked words; manual QA rows 14 to 17 cover it.
  - `[low]` `reject` Narrow Upgrade list, no checks for years, degrees or titles (Blind) — scope of Story 3.10 is Missing keywords and Upgrade words.
  - `[low]` `reject` No rate limit on a CPU-only route (Blind) — Hosted is behind the access code, the Letter text is capped, and other routes have the same shape.
  - `[low]` `reject` Copy and download carry no reminder of flags (Blind) — the spec forbids changing the Letter; the list is the only guard by design.
  - `[low]` `reject` Route maps every non-stale error to INVALID_INPUT (Blind) — `TOO_FEW_KEYWORDS` is the only other error; an exhaustive switch adds structure for no present gain.
  - `[low]` `reject` `waitForTimeout(500)` before a negative assertion, duplicated loaders, brittle `indexOf` (Blind) — test hygiene, no failure shown.
  - `[low]` `reject` Test count differs between local and Docker (Blind) — the logs state the numbers; Docker runs the same suite plus its own checks.
  - `[false]` `reject` Fingerprint/state left running when the request rejects or `lastJob` is null (Edge) — `callApi` never throws and `lastJob` is set before a Letter can be done.
  - `[false]` `reject` Held update note spoken later with an unrelated line (Edge) — a result is dropped before `adoptRerun` on a stale sequence; a rev mismatch cannot occur because the server echoes the rev it was sent.
  - `[low]` `reject` Phrase split by hyphen or no gap not matched (Edge) — «ansvarlig-for» is not a normal spelling.
  - `[false]` `reject` New analysis while the old Letter is done leaves the Letter unchecked (Edge) — `show()` resets the check and `runLetter` sets the phase to pending, so the effect fires again when the new Letter is done.
  - `[low]` `reject` Letter validation of length, language and placeholders is not done at runtime (Intent R2, R4) — the epic's ACs for 3.10 do not include it; kept as an open item in `issues.md`.
  - `[low]` `reject` Planted file is read only by tests, not served in Test mode (Intent R3) — the architecture says planted outputs are tests-only and never traced.
  - Remaining rows from Gap «Other findings» (pin the «ansvar for» behaviour) — handled by the second patch.

## Design Notes

- **Flag shape** (`integrity/core`, zod copy in `letter/contracts.ts`, kept equal by a type test): `{ kind: 'UNSUPPORTED_CLAIM' | 'UPGRADE_WORD', term, word, spans: {start, end}[] }`. `term` is the Keyword or Upgrade word; `word` is the form as it stands in the Letter (first occurrence, shown in the warning); `spans` are offsets in the Letter text with CRLF/CR counted as LF, end exclusive, never across a line. One flag per term, ordered by first span. Overlapping spans: the UI highlights the first and drops the rest; the list still has every flag.
- **checkLetter input:** `{ letter, cvText, jobTitle, employer, missing: {term}[], gaps: null, vocabulary }`. Skipping = blanking the job title, the employer (case-insensitive, any white space between words) and `{{SIGNATUR}}` with spaces of the same length (newlines kept) before scanning, so offsets hold. Missing keywords: `findKeyword`. Upgrade words: runs of tokens compared by stem (`stem`, multi-word phrases like «ansvarlig for»), per line in the Letter, over the whole CV as one token stream. Keep `UPGRADE_WORDS` short and low-risk: «forsket», «ledet», «ansvarlig for», «publiserte», «grunnla». The Example pair's three Cached Letters must stay unflagged for Upgrade words (check; if one is flagged, drop that word from the list rather than the Letter).
- **Route:** body `{ applicationId, fingerprint, inputs, letter: Letter, gaps: null, letterRev, gapsRev }`; `letter.rev` must equal `letterRev` (else `INVALID_INPUT`, field `letterRev`); `gaps` is `z.null()` now (Epic 4 widens it); letter text capped (20 000 chars). Response `{ flags, letterRev, gapsRev }`. `maxDuration` not needed (no AI). The logic lives in `application/server/check-letter.ts`, the route stays thin.
- **Planted file:** `data/fixtures/_planted/letter-flags.json` holds the raw cached shape `{ data: { text }, meta }` (`meta.source` = `"cached"`, provider `"planted"`), built on the Example pair's CV and ad: it mentions a Missing keyword of the Example pair (e.g. «REST-API» or «TypeScript», Real gaps in its answer key), the job title «Junior frontendutvikler», the employer, `{{SIGNATUR}}` and one Upgrade word absent from the CV text; a second Letter variant without problems is welcome. Tests read it with `node:fs`, not `data-files.ts` (which skips `_` folders on purpose).
- **Client:** `request-letter-check.ts` mirrors `requestLetter` (send, on `ANALYSIS_STALE` rerun phase 1 once, send again; returns `{answer, rerun?}`). Use `callApi` directly, not a TanStack mutation, so a check for an old Letter can finish while a new one is written. In `application-form.tsx`: a `useEffect` on the settled Letter starts one check per Letter rev; a sequence ref and the shown rev decide whether a result is used; `backToForm` cancels. The old Letter keeps its own flags until the new Letter arrives; a result is shown only when `letterRev` equals the shown Letter's rev and `gapsRev` is 0. A rerun from the check updates the held result, the job fingerprint and (if the score changed) the «Samsvaret er oppdatert» line, as in `runLetter`: pull the shared part out of `runLetter` instead of copying it.
- **UI:** `letter-flags.tsx` has the warning list (a `section` with an accessible name from messages, a rust-outlined list on the alert ground like `Alert`, but with its own strip label from messages, not «Feil»; no `role="alert"`, no live region) and the highlighted pieces. `segmentLetter` (pure, `letter/core`, tested) turns text, flags and the name into paragraphs of pieces; each flagged piece is an `<a href="#letter-flag-N">` with `text-decoration: underline dashed` in rust, 2 px, offset 4 px; the list item has `id="letter-flag-N"` and `tabIndex={-1}`, and a click focuses it. Copy and download still use the plain `renderLetter` text. The failed-check Notice sits where the list would be, with the button «Sjekk igjen» (busy while it runs); pressing it moves focus to the `h2` as «Prøv igjen» does. Live regions: nothing is announced for flags or for a failed automatic check (EXPERIENCE.md specifies none; recorded as an open item); the outcome of «Sjekk igjen» goes to the second region (found n words, found nothing, or still not checked).
- **Messages** (add to `messages.nb.ts`, bokmål, from EXPERIENCE.md): warning X «Brevet nevner «{word}», men CV-en din viser det ikke. Sjekk at brevet ikke påstår noe CV-en din ikke støtter.», upgrade «Brevet bruker ordet «{word}», men CV-en din bruker det ikke. Sjekk at brevet ikke gjør rollen din større enn den var.», unchecked «Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.».

## Verification

**Commands:**
- `npx biome check`, `npm run typecheck`, `npm test`, `docker compose run --rm --build test` -- clean (the story adds files under `data/`). Result: Vitest 91 files, 1020 passed, 2 expected fail; Playwright 195 passed; Docker run exit 0 (195 passed).

## Auto Run Result

Status: done. `checkLetter` (integrity/core), the `letter-check` route, the warning list, highlights, the failed-check notice with a check-only retry, and the planted Letter in `data/fixtures/_planted/` are in place. Review: 4 medium and 1 low patch applied (whole-word title skipping, «ansvar for» clears «ansvarlig for», two e2e gaps, issues entry reopened), 0 deferred, the rest rejected with reasons in the triage log. Follow-up review recommended: false (patched mediums: 4, none high; the patches are covered by unit and e2e tests). Residual risks: no live-region line for flags or a failed automatic check (logged); runtime validation of Letter length, language and placeholders is still open; `gaps` is `z.null()` until Epic 4.
