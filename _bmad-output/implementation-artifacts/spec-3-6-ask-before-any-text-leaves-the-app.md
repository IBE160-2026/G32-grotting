---
title: 'Story 3.6: Ask before any text leaves the app'
type: 'feature'
created: '2026-11-19'
status: 'done'
route: 'inline'
baseline_commit: 'c564c325cefbdb656c611842aa347f4639dda902'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The server already refuses an AI request without the accepted notice version (Story 3.2), but no screen asks the Student. The notice text has two placeholders (`{leverandør}`, `{periode}`) that wait for the Bake-off decision, which is now made: OpenRouter, with Google Vertex or Amazon Bedrock behind it.

**Approach:** Create the shared native `<dialog>` component and the AI notice built on it. Show it on Søknad before phase 1 when Test mode is off and this browser session has not accepted `RunMode.aiNotice.version`. Save `noticeVersion` in `ja.session.v1` on «Godta og fortsett» and give later phase-2 requests a helper that builds `consent: { noticeVersion }`. Name OpenRouter and the host in the text, record Helene's 2026-11-19 OpenRouter settings confirmation, and record the FR-24 wording check in `docs/qa/`.

## Boundaries & Constraints

**Always:**
- Test mode never shows the notice; «Avbryt» and Esc keep every input, send nothing and return focus to «Analyser og skriv utkast»; a scrim click does nothing; focus starts on the title.
- All text from `messages.nb.ts`. The notice names OpenRouter and the model host (Google or Amazon, never Anthropic), says nothing is sent before acceptance, and lists the five points of the AC.
- Only `client-session.ts` touches `ja.session.v1`. `config.aiNotice.version` changes with the text.
- Only record what can be stated truthfully: manual rows that need a person stay unfilled.

**Never:**
- No live AI request, no real key in any file or log. No `provider.only` pinning (no support in the adapter, untestable without a paid call). No phase-2 screen (Story 3.7). No Hosted change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First submit, live | Test mode off, no `noticeVersion` | Notice opens, no request sent | N/A |
| Accept | «Godta og fortsett» | `noticeVersion` saved, phase 1 starts once | N/A |
| Cancel or Esc | «Avbryt» or Esc | Closes, inputs kept, nothing sent, focus on submit | N/A |
| Second submit | Version already accepted | No notice | N/A |
| Older version accepted | Stored version differs | Notice opens again | N/A |
| Test mode | `testMode` true | Notice never shown | N/A |

</intent-contract>

## Code Map

- `src/shared/ui/components/dialog.tsx` -- new native `<dialog>` (`showModal()`, focus on title, Esc to `onCancel`, return focus).
- `src/modules/ai/ui/{ai-notice.tsx, notice-consent.ts, index.ts}` -- the notice, `noticeRequired`, `consentFor`.
- `src/modules/application/ui/application-form.tsx` -- gate in `onSubmit`, `acceptNotice`, `cancelNotice`.
- `src/shared/ui/client-session.ts` -- `noticeVersion` field and patch.
- `src/shared/ui/messages.nb.ts` -- `aiNotice` texts; `src/shared/server/config.ts` -- version prefix `notice-2`.
- `playwright.config.ts`, `e2e/ai-notice.spec.ts` -- a third server with live settings and a made-up key.
- `docs/qa/ai-provider-terms.md`, `docs/qa/ai-notice-manual-checks.md`, `EXPERIENCE.md` -- confirmations, FR-24 row, filled placeholders.

## Tasks & Acceptance

**Execution:**
- [x] Dialog component and AI notice with tests
- [x] Session `noticeVersion`, consent helper, form gate
- [x] e2e on a live-settings server (made-up key)
- [x] Docs: terms confirmation, FR-24 row, EXPERIENCE placeholders

**Acceptance Criteria:**
- Given the ACs of Story 3.6 in `epics.md`, when `npm test` runs, then every AC is covered by a passing unit or e2e test, and the rows that need a person are listed as open in `docs/qa/ai-notice-manual-checks.md`.

## Spec Change Log

## Review Triage Log

### 2026-11-19 - Review pass
- verdicts: Blind Hunter 10 findings, Verification Gap 0 (3 notes), Intent Alignment (descriptive) - high 0, medium 1, low 4, false 3, maybe-false 0 (Edge Case Hunter: see the next entry)
- findings:
  - `[medium]` `[patch]` Second Esc without a click can close the native dialog behind React (Chrome close watcher) - added `onClose` in `dialog.tsx` that calls `onCancel` while the owner still holds `open`.
  - `[low]` `[patch]` `expect(html).not.toContain("onclick")` in `dialog.test.ts` is vacuous - removed.
  - `[low]` `[reject]` Host text hardcoded while the provider is configurable - `LIVE_PROVIDERS` is only `openrouter`; a second provider needs its own text and a version bump anyway.
  - `[low]` `[reject]` Test locks «not Anthropic» - zdr excludes Anthropic's endpoint per the terms doc; the FR-24 row says host terms are unread.
  - `[low]` `[reject]` Focus-trap e2e lets `body` count as inside, no Shift+Tab - flaky across browsers; manual row 3 covers it.
  - `[false]` `[reject]` Double click on «Godta og fortsett» sends twice - `acceptNotice` nulls `pending` on the first call, the second finds none.
  - `[false]` `[reject]` Blocked storage loops forever - `acceptNotice` still sends the held request; the next submit asks again, as it should without storage.
  - `[low]` `[reject]` Dialog unit tests are static markup only - behaviour is covered by `e2e/ai-notice.spec.ts`.
  - `[low]` `[reject]` Row 1 tester/result form, missing short-landscape axe check, tokens for shadow, unmount cleanup - cosmetic; row 1 states its limits.
  - `[false]` `[reject]` Intent audit: mockups untouched - the only placeholders were in `.working/concepts` design explorations, not shipped mockups; `mockups/signal-varm.html` has none.
  - `[low]` `[reject]` Intent audit: `consentFor` has no caller - Story 3.7 builds the phase-2 request; the helper and its test are this story's part. Noted in the report.
  - `[low]` `[reject]` Verification Gap notes: version prefix not tied to text by a test; `consentFor` unused - guards static text; see above.

### 2026-11-19 - Review pass (Edge Case Hunter)
- verdicts: 10 findings - high 0, medium 0, low 5, false 0, maybe-false 0 (rest duplicates of the entry above)
- findings:
  - `[low]` `[patch]` `retentionDays` 0 would read «senest etter 0 dager» - `retention(0)` now reads as unset; test added.
  - `[low]` `[patch]` Esc e2e did not check inputs kept or `noticeVersion` unset - assertions added.
  - `[low]` `[reject]` Blocked sessionStorage re-asks every submit - the Student is asked again, which is the safe direction; an in-memory fallback adds state.
  - `[low]` `[reject]` Stale client RunMode after a mid-session config change - the server refuses with `AI_NOTICE_REQUIRED`; the phase-2 UI (Story 3.7) owns re-prompting.
  - `[low]` `[reject]` Unknown provider text, focus-trap `body`, `onClose`, claim items - duplicates of the entry above (onClose was patched there).

## Design Notes

The host is named as «Google (Vertex AI) eller Amazon (Bedrock)» because requests are not pinned: under `zdr: true` OpenRouter chooses between the two. With `AI_RETENTION_DAYS` unset the period reads «så snart svaret er skrevet» (OpenRouter's Zero Data Retention commitment); the host's own terms are not read and the FR-24 row says so.

## Verification

**Commands:**
- `npx biome check`, `npm run typecheck`, `npx vitest run`, `npx playwright test` -- expected: pass

## Auto Run Result

Status: done. Built in-line by the main agent (no implementation subagent); the four review layers ran as subagents.

- Summary: the AI notice (native `<dialog>`) opens on Søknad before phase 1 when Test mode is off and the session has not accepted `RunMode.aiNotice.version`; «Godta og fortsett» saves `noticeVersion` and starts phase 1; «Avbryt» and Esc keep inputs and send nothing. It names OpenRouter and Google (Vertex AI) or Amazon (Bedrock). `consentFor` builds the `consent` for phase-2 requests; Story 3.7 calls it.
- Files: `src/shared/ui/components/dialog.tsx` (dialog), `src/modules/ai/ui/*` (notice, helpers), `application-form.tsx` (gate), `client-session.ts`, `messages.nb.ts`, `config.ts` (`notice-2`), `playwright.config.ts` and `e2e/ai-notice.spec.ts` (live-settings server, made-up key), docs under `docs/qa/` and EXPERIENCE.md.
- Review: 2 patches applied (onClose resync, retention 0), 2 test patches, rest rejected with reasons above; nothing deferred.
- Follow-up review recommended: false.
- Verification: `npx biome check`, `npm run typecheck`, `npx vitest run` (917 passed, 2 expected fail), `npx playwright test` (129 passed before the last two small patches; `e2e/ai-notice.spec.ts` rerun after the onClose patch, 8 passed). No package.json, lockfile, Dockerfile or `data/` change, so the Docker run is not required.
- Residual risks: the host terms (Google, Amazon) are unread, so the FR-24 row is partial; manual rows 2 to 5 are open; `consentFor` has no caller until Story 3.7.
