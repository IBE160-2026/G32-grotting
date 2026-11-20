---
title: 'Story 4.5: Let the Letter use gaps the CV supports'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: '0b195311f14cd21569dc8b72b0be5e8fe13a0eab'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: []
deferred:
  - summary: >-
      A Gaps response from an earlier submission that arrives after a new submission started is adopted.
    evidence: |-
      Pre-existing from Story 4.4 (the Letter request has the same shape); 4.5 only reads the rev it bumps.
    location: >-
      src/modules/application/ui/application-form.tsx (runGaps)
    severity: low
---

<intent-contract>

## Intent

**Problem:** The Letter check (3.10) flags every Missing keyword in the Letter as an Unsupported claim, even one the CV supports in other words (a Rewordable gap), and Søknad always sends `gaps: null`.

**Approach:** `letterCheckRequestSchema.gaps` and `checkLetter` accept the Gap analysis; a Missing keyword that is a Rewordable gap whose citation passes `checkCitation` again on the server is not flagged, every other Missing keyword stays an Unsupported claim. Søknad sends the check once the Letter has arrived and Gaps have settled (with the Gaps, or `gaps: null` if they failed), with `letterRev` and `gapsRev`, again after a successful Gaps retry and after «Lag nytt utkast», and drops results whose revs do not match.

## Boundaries & Constraints

**Always:** The server re-runs `checkCitation` on every Rewordable gap against the CV text of its own `inputs`; the client's `kind` is never taken as it stands. `cvEntries` stays the only CV-entry splitter. Real-gap word, Upgrade word and job title behave as in 3.10. Behaviour with the flag off is unchanged (`gaps: null`, `gapsRev: 0`, check sent when the Letter arrives).

**Never:** Turn on `FEATURE_GAPS` in `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` or README (Story 4.6). Touch `PROMPT_VERSION`, the gaps prompt or `data/fixtures/*/cached/gaps.json`. Loosen `canonVerbatim`/`checkCitation`. Make live AI calls. Import `letter` or `gaps` from `integrity`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Passing citation | Letter names a Missing keyword; Gap Rewordable, citation in CV | Keyword not flagged | n/a |
| Failing citation | Same keyword, citation not in the CV | Flagged Unsupported claim | n/a |
| Real gap / no gap / `gaps: null` | Keyword Real, absent from `gaps`, or `gaps` null | Flagged as in 3.10 | n/a |
| Upgrade word, job title | as in 3.10 | unchanged | n/a |
| Gaps pending | Letter arrived, Gaps pending | No check sent yet | n/a |
| Gaps failed | AI error, cap, Test mode, notice cancelled | Check sent with `gaps: null`, `gapsRev: 0` | n/a |
| Gaps retry succeeds | after failed first run | New check with the Gaps, `gapsRev` 1 | stale results dropped |
| Gaps retry fails again | n/a | No new check | n/a |
| «Lag nytt utkast» | new Letter | New check with the same Gaps and rev | stale results dropped |
| Rev mismatch | answer `letterRev`/`gapsRev` differ from shown | Result dropped | n/a |

</intent-contract>

## Code Map

- `src/modules/letter/contracts.ts` -- `letterCheckRequestSchema.gaps` becomes a capped list of `{ keyword, kind, citation }` or null; `checkGapSchema`
- `src/modules/integrity/core/check-letter.ts` -- `CheckLetterInput.gaps`, `supportedByCv` using `checkCitation` against `cvText`
- `src/modules/application/server/check-letter.ts`, `src/app/api/analyses/[id]/letter-check/route.ts` -- pass `request.gaps` through (no change needed)
- `src/modules/letter/ui/request-letter-check.ts` -- job carries `gaps` and `gapsRev`; only the three fields go over the wire
- `src/modules/application/ui/application-form.tsx` -- `gapsRev` counter, effect keyed on Letter and Gaps, rev guard in `runCheck`

## Tasks & Acceptance

**Execution:**
- `letter/contracts.ts`, `integrity/core/check-letter.ts` -- widen `gaps`, skip supported keywords
- `letter/ui/request-letter-check.ts`, `application/ui/application-form.tsx` -- send with the Gaps, re-send, drop mismatches
- Tests: `check-letter.test.ts` (planted Letter + Cached Gaps + planted failing citation), `contracts.test.ts`, `request-letter-check.test.ts`, `letter-check/route.test.ts`, `e2e/gaps.spec.ts`

**Acceptance Criteria:**
- Given a Letter naming a Rewordable-gap keyword whose citation passes again, when checked, then it is not flagged; every other Missing keyword stays flagged.
- Given the Letter and settled Gaps, when Søknad sends the check, then it carries the Gaps (or null) and both revs, again after a Gaps retry and after «Lag nytt utkast», and mismatching results are dropped.
- Given planted responses, the same keyword with a failing citation is flagged; Real-gap word, Upgrade word and job title behave as in 3.10.

## Design Notes

The citation is re-checked against the raw `inputs.cvText`, not the contact-stripped text the AI saw (the stripper lives in `ai/core`, outside what `application` may import). A citation that only passes against the stripped text (it holds a placeholder) is therefore flagged: the safe direction.

`gapsRev` counts the Gap analyses that arrived (0 while none); `gaps: null` always goes with 0.

## Verification

**Commands:**
- `npm test` -- expected: biome, typecheck, vitest and Playwright pass
- `npm run typecheck` -- expected: no errors

## Spec Change Log

(empty)

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 24 findings across four layers (grouped by claim below) — high 0, medium 3, low 9, false 2, maybe-false 0
- findings:
  - `[medium]` `patch` «Sjekk igjen» with Gaps on never verified to carry Gaps and rev — added e2e test on the flag-on server
  - `[low]` `patch` e2e rev-mismatch test decided in the route handler from the request listener's count (ordering race) — own counter in the handler
  - `[low]` `patch` `askedGapsRev` read the ref while `shownGaps` came from the render closure — rev is 0 whenever gaps are null
  - `[medium]` `patch` wire cap of 5 000 characters on a citation could reject a valid Gap analysis (a citation is a piece of the CV) — cap is `CV_MAX`
  - `[medium]` `reject` citation unrelated to the keyword un-flags it (Blind, Edge) — false as a defect: the intent says the check is `checkCitation` again; a valid citation need not contain the keyword (the Example pair's «pull requests» cites a line about code review); requiring it would break the intended case
  - `[low]` `reject` `gaps`/`gapsRev` pairing not validated (Blind, Edge) — the client keeps them paired and an inconsistent pair only gets its own result dropped; a refine adds complexity for no reachable harm
  - `[low]` `reject` `LetterCheckJob` holds two optional fields (Blind) — one owner, kept paired in `runCheck`
  - `[low]` `reject` no timeout or «waiting» state while Gaps pend (Blind) — the Gaps request aborts at 90 s and the check state is the existing pending state; the story says to wait
  - `[low]` `reject` automatic re-check says nothing to screen readers (Blind) — same as every automatic check since 3.10
  - `[low]` `reject` exact keyword match, duplicate gaps for a keyword (Blind, Edge) — one Gap per Missing term with the term as keyword (4.1), so no reachable state
  - `[low]` `reject` mismatching answer leaves the check pending (Edge) — the server echoes the revs it was sent; a new Gaps arrival starts a new check
  - `[low]` `defer` Gaps response from an earlier submission arriving after a new one (Edge) — pre-existing from 4.4 (the Letter has the same shape); not caused here
  - `[low]` `reject` raw versus contact-stripped CV text (Edge, intent audit) — recorded in Design Notes; fail-safe direction
  - `[low]` `reject` e2e `waitForTimeout`, test noise, `gapsRev` reset per submission, matrix rows for stale rerun (Blind, Verification) — cosmetic; the sequence guard covers submissions
  - `[low]` `reject` no unit test for the effect in `application-form.tsx`, no chained /gaps then /letter-check test (intent audit) — described, not a defect; covered by Playwright on the flag-on server

## Auto Run Result

Status: done. The Letter check takes the Gaps: a Missing keyword that is a Rewordable gap whose citation passes `checkCitation` again on the server (against `inputs.cvText`) is not flagged; everything else stays as in 3.10. Søknad sends the check when the Letter has arrived and Gaps have settled, with `gaps`/`gapsRev` (null/0 when Gaps failed or are off), again after a successful Gaps retry and after «Lag nytt utkast», and drops mismatching results.

Files changed: `src/modules/letter/contracts.ts` (gaps schema), `src/modules/integrity/core/check-letter.ts` (supportedByCv), `src/modules/letter/ui/request-letter-check.ts` (gaps in the job), `src/modules/application/ui/application-form.tsx` (gapsRev, effect, rev guard), tests in `check-letter.test.ts`, `contracts.test.ts`, `request-letter-check.test.ts`, `letter-check/route.test.ts`, `e2e/gaps.spec.ts`, `e2e/letter-check.spec.ts` (type).

Review: patches applied 4 (2 medium, 2 low), 1 deferred, 11 rejected with reasons above. Follow-up review recommended: false. Verification: `npm test` and `npm run typecheck` pass. Residual risk: the citation is checked against the raw CV, not the contact-stripped text, so a citation holding a placeholder is flagged.
