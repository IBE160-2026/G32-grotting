---
title: Reconcile review — Architecture Spine 2026-11-13 vs UX specs
spine: ../ARCHITECTURE-SPINE.md
sources:
  - ../../../ux-designs/ux-JobAssistant-2026-11-09/EXPERIENCE.md
  - ../../../ux-designs/ux-JobAssistant-2026-11-09/DESIGN.md
  - ../../../_archive/architecture-JobAssistant-2026-11-08/ARCHITECTURE-SPINE.md (old AD meanings)
date: 2026-11-13
verdict: 'Revise before stories: one critical and five high gaps; the rest are small amendments.'
counts: { critical: 1, high: 5, medium: 8, low: 9 }
---

# Reconcile: new spine vs UX

**Scope.** I looked for UX behaviour (EXPERIENCE.md, plus anything architectural in DESIGN.md) that needs something the new spine (AD-1 to AD-16) leaves out or contradicts. For each one I checked what the archived 2026-11-08 spine promised under the old AD number that EXPERIENCE.md cites. Pure visual detail is out of scope. "Old AD-n" is the archived spine; "AD-n" alone is the new one.

**Covered, no finding.** These are already handled:
- Test-mode banner (`RunMode.testMode`, AD-4).
- Per-section retry (AD-6, plus one TanStack mutation per section in AD-16).
- `cvDraft` kept on expiry and cleared on logout (AD-16).
- AI notice shown once per session before accounts and once per account after (AD-13 step 1, AD-16, `profiles.ai_notice_version`).
- Daily cap and `DAILY_CAP_REACHED` (AD-13, conventions).
- Two polite live regions with one `announce()` (conventions). This matches the Accessibility Floor and improves on the old spine.
- Native `<dialog>`, Tailwind `@theme` tokens, one dark theme, the `max-640` variant (conventions).
- Double-submit idempotency (AD-8).
- `NOT_FOUND` for another Student's record (AD-10).
- The gate disappearing after S6 (AD-12).
- Build-order variants before S4 and S5. The new `features.gaps` and `features.rewording` flags in AD-4 serve them better than old `accountsEnabled` did.

---

## Critical

### C1. Application stores no inputs, but AD-6 loads inputs from it after accounts
- **UX relies on:**
  - The credits list on result and Saved Application: Stilling, Dato, Tone, Annonse «14 avsnitt · 7 nøkkelord» (EXPERIENCE L216).
  - Historikk rows: job title, employer, date, score (L233).
  - The JA-001 snapshot surviving a CV update (L350, old AD-15).
  - The CV text on Søknad after S6 coming from Profil, read-only (L212, old AD-7).
  - Retry and «Lag nytt utkast» working on a fresh result (L228, L280).
- **Old spine:** old AD-7 sent the full inputs on every request, even after accounts. Old AD-9 listed Job ad, job title and employer as encrypted columns.
- **New spine:** AD-6 says that after accounts "the server loads them by `(id, studentId)`". AD-8 gives the Application only `analysis`, `gaps`, `letter` and `letter_check`, with no CV text snapshot, Job ad, job title, employer or Tone. AD-11's plain-column list doesn't mention them either. AD-6 also doesn't say that phase 1 after accounts takes the CV text from the Profile and ignores any CV text in the body.
- **Effect:** after S6, phase 2 has nothing to load, and Historikk and the Saved Application can't render their credits.
- **Spine fix:** In AD-8, add `inputs` (encryptedJson: the CV-text snapshot, Job ad, job title, employer, Tone), written once by phase 1. In AD-6, state that after accounts phase 1 copies the CV text from the Profile and ignores any CV text in the request.

## High

### H1. `{{SIGNATUR}}` name substitution is gone
- **UX relies on:**
  - Copy button: the Profile name replaces `{{SIGNATUR}}`, or «[Navnet ditt]» before S6 (L209, citing old AD-4).
  - Copy primitive: «with the name substituted» (L278).
  - The sign-off placeholder (L164) and «Kopier brev» on Historikk rows (L233).
  - The .docx and the Letter view on a Saved Application.
- **Old spine:** old AD-4 required the token exactly once in every Letter prompt and never sent the name to the AI. The UI substituted it when it rendered, copied or built the .docx.
- **New spine:** none of this. AD-13 strips only email addresses and phone numbers. Nothing says whether the name goes to the provider, or how the Letter signs off before S6.
- **Spine fix:** In AD-14 or the `letter` slice, state that Letter prompts require the literal `{{SIGNATUR}}` once, the name is never sent to the AI, and `letter/core` substitutes the Profile name (or «[Navnet ditt]») for render, copy and .docx.

### H2. Activity renewal and the expiry warning have no architectural support, and the 5-minute throttle makes the warning late
- **UX relies on:**
  - Session expiring (L242): any key, pointer or input event counts as activity, the client renews at most every 5 minutes with "a lightweight authenticated request", and the warning opens 2 minutes before 30 minutes of inactivity.
  - Expiry warning (L232): «Fortsett økten» renews the session.
  - UJ-2 failure (L351): the warning opens after 28 minutes.
- **Old spine:** old AD-17 stated the client side: what counts as activity, the 5-minute client renewal and the warning dialog.
- **New spine:** AD-12 has only the server side: a 30-minute sliding expiry, extended at most once every 5 minutes. There is no renew endpoint, the client is never told the server's expiry time, and nothing describes the activity tracker or the warning.
- **Effect:** the server keeps `expires_at` = last extension + 30 min. A client that times its warning from local activity can be up to 5 minutes late, so the session is already dead when «Fortsett økten» is pressed.
- **Spine fix:** In AD-12, add `POST /api/session/renew`, which returns `expiresAt`. Every authenticated response carries `expiresAt` too, and the client times the warning from the server's `expiresAt`, not from local activity.

### H3. The pulse plot can't find Keyword positions in the ad without breaking AD-1 or AD-5
- **UX relies on:**
  - The pulse plot (L217): drawn in the browser, where each Keyword peaks at its first position in its paragraph.
  - Source lines «annonsen avsnitt 03» and «Fra annonsen · avsnitt 08» (L152).
  - The credits «14 avsnitt · 7 nøkkelord» (L216).
  - The plot's aria-label (L313).
- **New spine:**
  - AD-1 doesn't let slice UI import `keywords/core`.
  - AD-5 says nothing else compares words.
  - The shape of `AnalysisResult` isn't specified.
- **Effect:** the browser either duplicates matching, which breaks AD-5 and draws the wrong peaks for inflected words, or can't draw the plot.
- **Old spine:** old AD-14 had `MissingKeyword.adLine` and CV-side offsets, but no ad positions for Matched keywords either.
- **Spine fix:** In AD-7 or AD-5, require `AnalysisResult` to carry `adParagraphs` (count) and an ad position `{ paragraph, start, end }` for each Keyword, matched and missing, computed by `keywords/core`.

### H4. AD-6 "phase 1 has no AI" rules out the FR-5b path the UX designs for
- **UX relies on:**
  - Phase 1 progress under the FR-5 fallback, «Henter nøkkelord fra annonsen …» (L135, L256).
  - The «Mindre presist» notice when the Keywords are code-only (L149, L218).
  - UJ-3's Test-mode edge case (L365).
- **Old spine:** old AD-2 and AD-3 let phase 1 call `proposeKeywords` through `resolveForAnalyse`. Lists that fell back to code because of Test mode, the Daily cap or an AI failure were marked `origin: 'code-degraded'`, never cached, and never an error.
- **New spine:**
  - AD-6 says phase 1 has "no AI" and gives no `maxDuration` for phase 1.
  - AD-5 reads a "saved AI-proposed list", but nothing creates it.
  - No `origin` field drives the notice.
  - AD-13 doesn't say that phase 1 degrades rather than fails when the cap is reached.
- **Effect:** the Deferred row's claim that the spine "covers both outcomes" doesn't hold.
- **Spine fix:** In AD-6, state that only under FR-5b, phase 1 may call `runAi('proposeKeywords')` on a cache miss (with `maxDuration = 120`). A cap, Test-mode or AI failure returns a code list with `keywordOrigin: 'code-degraded'`, and that drives «Mindre presist».

### H5. The Letter waits for Gaps and the check, and a failed check hides a finished Letter
- **UX relies on:**
  - The AI placeholder (L227): "Each slot resolves on its own, because Gaps and Letter are separate requests (AD-3)".
  - The phase-2 live line, which can name one section as done and the other as failed (L174).
- **Old spine:** old AD-3 ran the letter check whenever a Letter existed. With Gaps missing, every Missing keyword counted as unsupported.
- **New spine:** AD-6 says "The Letter is shown with its flags only after the check returns", and the check starts only after both phase-2 calls have settled.
- **Effect:**
  - The Letter slot is held until Gaps settle, which can be up to 90 s on a Gaps timeout.
  - If `letter-check` fails (network error or `UNEXPECTED`), the spine gives no rule. The Letter stays hidden although it was generated and counted against the cap. The UX has no state for this either.
- **Spine fix:** In AD-6, state that a Letter is shown when it arrives, and its flags are added when the check returns. If the check fails, the Letter stays, with the "not checked" notice and a retry of the check only.

## Medium

### M1. The `ANALYSIS_STALE` rerun conflicts with the phase-1 idempotency rule
- **UX:** «On `ANALYSIS_STALE` the client silently reruns phase 1, then the AI sections» (L260, old AD-3).
- **Old spine:** old AD-15 said that a repeat with the same fingerprint returns the stored analysis, and a different fingerprint returns `ANALYSIS_STALE`.
- **New spine:**
  - AD-8: phase 1 is `INSERT … ON CONFLICT (id) DO NOTHING`. A rerun with the same id keeps the stale analysis, which can loop. A rerun with a new id leaves an orphan Application in Historikk, holding a JA number and showing «Ikke laget» sections.
  - AD-6 also doesn't say that phase 2 is resent after the rerun, and doesn't say how a stale fingerprint can arise after accounts, when the inputs are loaded from storage.
- **Spine fix:** In AD-8, a phase-1 rerun on the same id with a different fingerprint overwrites `analysis` and clears the other three columns. In AD-6, the client then resends both phase-2 calls.

### M2. No re-check after a successful Gaps retry
- **UX:** the flags are re-checked after «Lag nytt utkast» and after a successful Gaps retry (L225, old AD-3).
- **New spine:** AD-8 covers the re-check only for «Lag nytt utkast».
- **Effect:** a check that ran with `gaps = null` flags every Missing keyword (FR-11), and those flags stay after the Gaps arrive.
- **Spine fix:** In AD-6, a successful Gaps retry clears `letter_check` and reruns `letter-check` when a Letter exists.

### M3. No rule for the catalogue number (JA-NNN)
- **UX:** the number is derived per Student from creation order and never stored (L67–L72). It appears on:
  - the form heading, as the next number (L121);
  - the result heading and the line «Lagret i Historikk som JA-002.» (L166, L174, L258);
  - Historikk and its range line (L180);
  - Konto and the Historikk count in the nav (L63).
- **New spine:** nothing. Neither spine had a rule. UUID v4 ids give no order on a tie in `created_at`.
- **Spine fix:** Add a convention: the number = `row_number() over (partition by student_id order by created_at, id)`. `application/core` formats it as `JA-%03d`. Phase 1 returns `catalogueNumber`, and `GET /api/applications/summary` returns `count` for the next-number heading and the nav.

### M4. One Gap per Missing keyword, and the AI-skipped case, were dropped
- **UX:** "One per Missing keyword, in the order of the Missing list … A Gap downgraded by FR-15, or one the AI skipped, renders as a Real gap with the template line" (L221, old AD-5). Template string at L157.
- **Old spine:** old AD-5 mapped the AI output to exactly one guarded Gap per `MissingKeyword`. Extra AI items were dropped, and skipped Keywords became template Real gaps.
- **New spine:** AD-14 covers downgrades and discards only.
- **Spine fix:** In AD-14, `gaps/server` returns exactly one Gap per `MissingKeyword`, in order. It drops extra AI items and turns skipped Keywords into template Real gaps (`{ key, params }`).

### M5. Error codes the UX branches on are not named
- **UX branches on these:**
  - "Not available in Test mode" is a notice with no retry (L170, L263), distinct from a failure alert with «Prøv igjen».
  - Session expired (L188, L243).
  - Access required (L240).
  - Network failure (L195, L270).
- **New spine:** it names `CV_TOO_SHORT`, `DAILY_CAP_REACHED`, `ANALYSIS_STALE`, `NOT_FOUND` and `UNEXPECTED`. The AD-12 diagram says only "401". There is no code for a `cached` miss and no client-side network code.
- **Old spine:** old AD-13 and AD-18 named `ACCESS_REQUIRED`, `SESSION_REQUIRED` and `NETWORK_ERROR`.
- **Spine fix:** In AD-7, list the codes the UI branches on: `TEST_MODE_UNAVAILABLE`, `SESSION_EXPIRED`, `ACCESS_REQUIRED`, `NETWORK_ERROR` (set by `api-client` on a fetch failure or a non-JSON response), `DAILY_CAP_REACHED`, `ANALYSIS_STALE`.

### M6. The AI notice has nowhere to get the provider name, the retention period or the version rule
- **UX:** the notice body says «… sender vi … til {leverandør}» and «sletter den etter {periode}» (L138). It is shown when the accepted version differs from `aiNoticeVersion` (L231).
- **New spine:** `RunMode` carries `aiNoticeVersion` only. `AI_PROVIDER` is server-only. Nothing says where the version is defined or when it changes.
- **Old spine:** old AD-18 defined `AI_NOTICE_VERSION` in Core, bumped when the provider, the retention period or FR-5b changes. It had no provider name either.
- **Spine fix:** In AD-4, add `aiNotice { version, providerName, retentionDays }` to `RunMode`, derived in `config.ts`, with a version bump whenever the provider, retention or FR-5b changes. Also name the acceptance endpoint, `POST /api/profile/ai-notice`.

### M7. The Archivo font is missing
- **DESIGN.md Typography:** three families. Archivo at 125 % width carries the caps, the code strips and the wordmark.
- **New spine:** the design-token convention lists only Schibsted Grotesk and DM Mono.
- **Spine fix:** In the design-tokens convention, list all three fonts through `next/font/google`: Schibsted Grotesk 400–800, DM Mono 400/500, and Archivo with `axes: ['wdth']` for the 125 % width.

### M8. The return path after expiry: email prefill, restore notice, 401 handling
- **UX:** after expiry, «Logg inn» has the email prefilled (L243). After login, Søknad and Profil show «Vi tok vare på …» (L189).
- **New spine:** AD-16's client session holds no email and no "restored after expiry" marker. Nothing says what `api-client` does on a 401.
- **Old spine:** old AD-13 had `api-client` save the client session before redirecting on `SESSION_EXPIRED`. The email wasn't covered there either.
- **Spine fix:** In AD-16, add `lastEmail?` and `restoredAfterExpiry?` to `ja.session.v1`. On `SESSION_EXPIRED`, `api-client` saves the session before redirecting to «Logg inn».

## Low

### L1. `RunMode` fields renamed
- **UX:** `RunMode { testMode, hosted, accountsEnabled, aiNoticeVersion }` (L22).
- **New spine (AD-4):** `features: { accounts, gaps, rewording }`.
- **Fix:** none needed in the spine. Update EXPERIENCE L22 to `features.accounts`.

### L2. Paths and sources have moved
- **EXPERIENCE.md still uses the old locations:**
  - `src/lib/api-client.ts` (L19), now `src/shared/ui/api-client.ts`.
  - `src/lib/messages.nb.ts` (L21), now `src/shared/ui/messages.nb.ts`.
  - `/api/letter-check` (L225), now `/api/analyses/[id]/letter-check`.
- **Front matter:** it cites the archived spine (L9).
- **Fix:** none needed in the spine. Update the paths, and re-point the UX front matter at the 2026-11-13 spine.

### L3. Saved Application «Ikke laget.» and the unchecked-Letter notice are only implied
- **UX:** L171, L229, L267, citing old AD-15.
- **New spine:** AD-8's nullable section columns and "read-only snapshot" imply both notices but don't state them. Nothing tells "not made because it failed" apart from "feature off". With `FEATURE_GAPS` off, the Gapanalyse section should be absent, not «Ikke laget».
- **Spine fix:** In AD-8, a reopened Application renders a null section as "not generated" (hidden when its feature is off), and a Letter without `letter_check` as "not checked".

### L4. The Historikk list API is unspecified
- **UX:** 20 rows per page, «Side 2 av 4», the range «JA-001–JA-002», the count in the nav, and «Kopier brev» and download straight from a row (L180, L233).
- **Spine fix:** Add a convention: `GET /api/applications?page=n` returns 20 rows, newest first, with `total`. Each row carries what the register needs, including the Letter text.

### L5. The shape of `noticeAccepted` is unclear
- **UX:** the notice reappears when the version differs (L231).
- **New spine:** AD-16 has `noticeAccepted?` with no version.
- **Spine fix:** In AD-16, use `noticeAccepted?: { version }`.

### L6. Access-code cookie lifetime, and a missing UX string
- **UX:** the code is asked for «én gang per nettleserøkt» (L98, L240).
- **New spine:** AD-12 doesn't state the `ja_access` attributes. Old AD-18 had: session cookie, httpOnly, Secure, SameSite=Lax.
- **Reverse gap:** AD-12 blocks an IP after five failures, and the UX has no string for that block.
- **Spine fix:** In AD-12, `ja_access` is a session cookie (no Max-Age), httpOnly, Secure, SameSite=Lax. Separately, add a «For mange forsøk» string to the UX.

### L7. «Lag nytt utkast» failure must leave the old Letter in place
- **UX:** "on failure the old Letter stays" (L266, citing old AD-15).
- **New spine:** AD-8 says «Lag nytt utkast» replaces `letter` and clears `letter_check`, but not when.
- **Spine fix:** In AD-8, the Letter endpoint writes `letter` and clears `letter_check` only on success.

### L8. No named source for Example data on Hjem and Søknad
- **UX:** Hjem draws the Example-ad pulse plot (L47, L217). «Bruk eksempelet» fills the Example pair in every mode (L130, L360).
- **New spine:** it doesn't say how the browser gets the Example text and its Keyword positions.
- **Spine fix:** In AD-15, the Example pair and its precomputed `AnalysisResult` reach the page as server-component props from `data/fixtures`. No API is needed.

### L9. AD-16 no longer bars `cvText` after accounts
- **Old spine:** old AD-17 had "`inputs.cvText` is never written when accounts are on", which stopped stale CV text overriding the Profile (L212, FR-20).
- **Spine fix:** In AD-16, after accounts `inputs.cvText` is never written. The CV text comes only from the Profile.

---

## Citation map: every AD cited in EXPERIENCE.md

| EXPERIENCE line | Cited | Old meaning (2026-11-08) | Now carried by (2026-11-13) | Status |
|---|---|---|---|---|
| L21 | AD-13 | Error contract, api-client, all text in `messages.nb.ts` | AD-7 (path now `src/shared/ui/messages.nb.ts`) | covered (L2) |
| L22 | AD-18 | `RunMode` client context | AD-4 (`features.accounts` replaces `accountsEnabled`) | covered (L1) |
| L46 | AD-18 | Access-code gate in `proxy.ts` | AD-12 | covered |
| L55 | AD-3 | Server never rebuilds inputs; no regenerate on a stored Application | AD-8 (read-only snapshot) | covered |
| L55 | AD-15 | Section write model, History snapshots | AD-8 | covered |
| L209 | AD-4 | `{{SIGNATUR}}` token, name never sent, UI substitutes | none | **gap (H1)** |
| L212 | AD-7 | One request path; CV text from Profile, read-only after S6 | AD-6 (request path) + AD-4 (`features.accounts`) + AD-16 | partial (C1, L9) |
| L221 | AD-5 | Guards; one Gap per Missing keyword; skipped or downgraded becomes template Real gap | AD-14 (downgrade/discard only) | partial (M4) |
| L225 | AD-3 | Re-check after «Lag nytt utkast» and after a Gaps retry | AD-6 + AD-8 (new draft only) | partial (M2) |
| L227 | AD-3 | Gaps and Letter as separate requests, each resolving on its own | AD-6 (separate requests, but Letter display gated on the check) | contradicted (H5) |
| L228 | AD-3 | «Prøv igjen» retries only that section | AD-6 + AD-16 | covered |
| L231 | AD-18 | AI notice version, once per account or browser session | AD-13 step 1 + AD-16 + AD-4 (`aiNoticeVersion`) | partial (M6, L5) |
| L240 | AD-18 | Gate before S6; code at registration after | AD-12 | covered (L6) |
| L243 (1st) | AD-17 | Client session keeps Job ad fields after expiry | AD-16 | covered (M8) |
| L243 (2nd) | AD-17 (amended 2026-11-09) | `cvDraft` kept on expiry, cleared on «Lagre» and logout | AD-16 | covered |
| L259 | AD-3 | 90 s timeout, per-section failure and retry | AD-6 | covered |
| L260 | AD-3 | `ANALYSIS_STALE`: rerun phase 1, then the AI sections | AD-6 (rerun phase 1 only) + AD-8 (conflicting idempotency) | partial (M1) |
| L266 | AD-15 | «Lag nytt utkast» replaces the Letter; old Letter stays on failure | AD-8 | partial (L7) |
| L267 | AD-15 | Missing section shows "not generated"; unchecked Letter shows notice | AD-8 (implied by nullable columns) | partial (L3) |
| L269 | AD-17 | Logout clears the session except the Job ad fields and the CV draft | AD-16 | covered |
| L278 | AD-4 | Copy with the name substituted | none | **gap (H1)** |
| L280 | AD-3 | No «Lag nytt utkast» on a Saved Application; server never rebuilds inputs | AD-8 | covered |
| L350 | AD-15 | Saved Application is a snapshot that survives a CV update | AD-8 (needs the `inputs` column) | partial (C1) |
| L351 | AD-17 | Expiry warning, restore after login | AD-16 (restore) + AD-12 (30 min sliding); warning and renewal missing | **gap (H2)** |

Non-AD architecture references in EXPERIENCE.md:
- L9 (archived spine in the front matter): re-point it to the 2026-11-13 spine.
- L19 and L21 (`src/lib/*`): now AD-2 and AD-7 under `src/shared/ui/`.
- L225 (`/api/letter-check`): now `/api/analyses/[id]/letter-check` (AD-6).

**Old to new, in one line:**
- old AD-3 → AD-6 (+ AD-8, AD-16)
- old AD-4 → none, a gap (the AI port itself is now AD-3)
- old AD-5 → AD-14 (partial)
- old AD-7 → AD-6 + AD-4 + AD-16
- old AD-13 → AD-7
- old AD-15 → AD-8
- old AD-17 → AD-16 (+ AD-12; the expiry warning is a gap)
- old AD-18 → AD-4 + AD-12 + AD-13/AD-16
