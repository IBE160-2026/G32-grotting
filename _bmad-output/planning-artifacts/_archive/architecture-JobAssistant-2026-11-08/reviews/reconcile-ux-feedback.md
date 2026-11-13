---
title: Reconcile review — Architecture Spine vs UX specs and lecturer feedback
spine: ../ARCHITECTURE-SPINE.md
sources:
  - ../../../ux-designs/ux-JobAssistant-2026-09-11/EXPERIENCE.md
  - ../../../ux-designs/ux-JobAssistant-2026-09-11/DESIGN.md
  - ../../../briefs/brief-JobAssistant-2026-09-11/tilbakemelding-product-brief.md
  - ../.memlog.md
  - ../../../prds/prd-JobAssistant-2026-10-31/prd.md (checked for FR-9, FR-11, FR-12, FR-18, FR-21, FR-24, FR-27, FR-31 wording)
date: 2026-11-08
counts: { high: 6, medium: 11, low: 8 }
---

# Reconcile: spine vs UX and lecturer feedback

Scope: decisions that the UX specs or the lecturer's feedback need and that the spine lacks, contradicts, or leaves open so that two independently built stories could diverge. Coaching decisions in `.memlog.md` (stack, Supabase, bake-off, keyword pipeline, T5 confirmations) are treated as intentional and not re-litigated. Pure visual detail is ignored.

## High

### H1. After S6, Søknad requires login, but AD-7 implies anonymous requests still run
- **Source:** PRD FR-18 («Once S6 exists, Søknad and the other Student pages require login»); EXPERIENCE.md Information Architecture → Navigation («After S6, logged out: … Søknad (which routes to «Logg inn»)»), State Patterns «Logged out»; EXPERIENCE «Bruk eksempelet» («Works with or without login»).
- **Gap:** AD-7 says the same handlers "also persist through repositories when a session exists". Read literally, a post-S6 request without a session (expired or never logged in) still gets scored and AI-written but silently not saved, and is counted under which Daily-cap scope? One story will gate, another will not. «Bruk eksempelet … with or without login» only makes sense across build variants, not as "anonymous allowed after S6".
- **Fix:** Add to AD-7/AD-10: once S6 is merged, every Student route handler (`analyse`, `extract`, `letter`, `gaps`, `letter-check`, profile, history) requires a session and returns error code `unauthenticated` (401) without one; the "no session" path exists only in builds without S6. Pages enforce the same via one server-side `requireSession()` helper.

### H2. Access-code gate after S6 is not decided (AD-10 keeps a global gate; UX/PRD move it into registration)
- **Source:** PRD FR-31 («Before S6, the code is requested once per browser session; after S6, registration requires it»); EXPERIENCE.md IA table, Access-code screen («After S6 the code moves into «Registrer deg» instead»), State Patterns «Access code required … before S6».
- **Gap:** AD-10 makes `proxy.ts` the gate whenever `ACCESS_CODE` is set, with no S6 switch. Built as written, the Examiner enters the code twice after S6 (gate + registration), and the epic-6 story has no rule for what the proxy should stop doing. Also unstated: what the proxy returns to `/api/*` calls (an HTML redirect breaks the AD-13 envelope).
- **Fix:** Amend AD-10: the proxy gate is active only while accounts do not exist; the S6 story removes it and the register service checks `ACCESS_CODE` instead (constant-time compare). While the gate exists, it answers `/api/*` with the AD-13 envelope (`access_required`, 401) and pages with a redirect to the Access-code screen.

### H3. The keep-alive call to `/api/health` will be stopped by the Access-code gate
- **Source:** Spine Structural Seed (keep-alive, SM-4) + AD-10; lecturer feedback §2 criterion 6 (Examiner must be able to try the app; a paused Supabase project during grading breaks the Hosted version).
- **Gap:** The GitHub Actions job calls `GET /api/health` on Production, which is behind `proxy.ts`. Without an exemption it gets the gate (possibly a 200 HTML page or redirect), the workflow looks green, the database is never queried, and Supabase pauses the project.
- **Fix:** State in AD-10 that the proxy matcher excludes `/api/health` and static assets, and in the deployment seed that `/api/health` returns a non-2xx status when its database query fails, so the workflow goes red.

### H4. Where Norwegian explanation text lives: AD-1 (Core owns explanations) contradicts AD-13 (all prose in `src/lib/messages.nb.ts`, none in responses)
- **Source:** EXPERIENCE.md Results → Score panel (Verdict sentences, formula line, disclaimer), Keyword lists («Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.»), Gap callout Real (fixed template, also used for FR-15 downgrades), Gap callout Rewordable (discard text «Ingen forslag her…»), Letter warnings; PRD FR-21 (Saved Application shows the stored Reflection Note).
- **Gap:** AD-1 puts explanations in `core/explain`, and FR-15's fixed Real-gap template is produced by a Core guard; but Core may not import `src/lib`, and AD-13 says server responses contain no prose. Stories will split three ways: Core returns Norwegian strings, routes return codes, or the UI composes text. It also decides what is stored in the Application row (prose vs structure), which determines whether a Saved Application re-renders identically.
- **Fix:** Add to AD-13: Core and services return structured explanations (`{ kind, keyword, evidence, adLine, … }`, and `downgraded: true` / `suggestionDiscarded: true` flags), never code-written prose; every code-written sentence and template lives in `messages.nb.ts` and is rendered in the UI. The only prose in responses and in the database is AI-written text (Letter, Gap explanation, suggestion). The Application row stores the same structured shape.

### H5. The client has no sanctioned way to know run mode and display values
- **Source:** EXPERIENCE.md Test-mode banner (every page), «Bruk eksempelet» (Test mode only), AI notice dialog («sendes til {leverandør}», retention period, never in Test mode), Partial result: Daily cap («dagens 30 KI-forespørsler»), Navigation (item set depends on build variant and login state).
- **Gap:** AD-11 forbids `process.env` outside `src/server/config.ts`, and the UI may not import `src/server`. Client components still need `testMode`, `hosted`, provider name and retention days, the cap number and whether a Student is logged in. Without a rule, stories will reach for `NEXT_PUBLIC_*` variables (a second, divergent mode source) or hard-code «30» and the provider name in copy.
- **Fix:** Add to AD-11: the root layout (a server component) builds one `PublicConfig` (`testMode`, `hosted`, `aiProviderName`, `aiRetentionDays`, `dailyCap`, `session: { name } | null`) from config and the session, and passes it to client components through one React context; `NEXT_PUBLIC_*` variables are banned. Messages take these as parameters.

### H6. Mixed outcomes of the two independent phase-2 calls are undefined
- **Source:** EXPERIENCE.md State Patterns «Partial result: AI failed or timed out» (one message replaces both sections, «Prøv igjen» retries «only the AI part»), «Partial result: Daily cap»; Key Flows Flow 1 failure; PRD FR-11 («If Gap analysis fails … every Missing keyword in the Letter is an Unsupported claim»), FR-25.
- **Gap:** AD-3 makes `letter` and `gaps` independent, but the UX describes one combined outcome. Unspecified: Letter succeeds and Gaps fail (or vice versa); the cap is reached between the two calls (29 used); whether «Prøv igjen» re-runs both calls or only the failed one (re-running a succeeded call wastes cap and P6 budget); whether `letter-check` runs when Gaps failed (FR-11 says yes, with no Rewordable allowance) or when the Letter failed (nothing to check).
- **Fix:** Add to AD-3: each phase-2 section succeeds or fails on its own and the UI shows each section's own state (success, or the code's message in that section); «Prøv igjen» retries only the failed call(s); `letter-check` runs whenever a Letter exists, treating a failed Gaps call as "no Rewordable gaps" (FR-11). The gateway checks the cap per call, so one section can show the Daily-cap banner while the other shows its result.

## Medium

### M1. Session-expired flow keeping the pasted Job ad has no mechanism
- **Source:** EXPERIENCE.md State Patterns «Session expired» («A Job ad pasted on Søknad is kept and offered again after login: «Vi tok vare på stillingsannonsen du limte inn.»»); PRD FR-18.
- **Gap:** AD-10 fixes the 30-minute sliding expiry but not how the UI detects it (page navigation vs API call), where the ad is parked, or how the user returns. The ad must not travel in the URL (it is personal data and long).
- **Fix:** Add to AD-10: an expired or missing session yields error code `session_expired` (API) or a redirect to `/logg-inn?neste=/soknad&grunn=utlopt` (pages); before redirecting, Søknad saves the Job ad, title and employer to the `sessionStorage` key from M2, and Søknad restores and clears it after login. Any authenticated request extends the session.

### M2. No single `sessionStorage` contract
- **Source:** EXPERIENCE.md Input (CV text kept «bare … i denne nettleserøkten»), «Endre» reopens the form with every input kept, Error banner («Input is kept»), AI notice once per browser session (pre-S6), Session expired (M1); spine AD-7 and the Capability map (FR-24 acceptance in `sessionStorage`).
- **Gap:** At least four stories write to `sessionStorage` (form inputs, confirmed CV text, AI-notice acceptance, parked ad, possibly the last result) with no agreed keys, shape or clearing rule. Also open: does the result survive navigating Hjem → Søknad, and is the CV text cleared on «Logg ut» (shared computers)?
- **Fix:** Add a convention row: one module `src/lib/session-store.ts` owns every `sessionStorage` key (one versioned, zod-parsed object per key), and nothing else touches `sessionStorage`. State the scope: inputs and the latest result survive in-tab navigation; «Logg ut» clears the store.

### M3. No client-side API helper; non-envelope failures are unmapped
- **Source:** EXPERIENCE.md Error banner («Fikk ikke kontakt med serveren…», inline, input kept) vs Partial result states; DESIGN.md Error message.
- **Gap:** AD-13 covers responses the app writes, but the client will also see fetch network errors, Vercel 504s after `maxDuration`, 413s over the 4.5 MB body limit, and gate redirects, all non-JSON. Each story will decide for itself which of these is the global Error banner and which is a phase-2 partial result.
- **Fix:** Add to AD-13: all client calls go through one `src/lib/api.ts` `callApi()` that returns the AD-13 envelope in every case, mapping network errors to `network` and non-envelope responses to `server`. During phase 2 these codes render as that section's AI-failure state; elsewhere they render as the Error banner.

### M4. The layer rule "UI reaches the server only over HTTP" forbids the common server-component data pattern
- **Source:** EXPERIENCE.md State Patterns «Cold load» (skeletons on Hjem, Historikk, Saved Application); memlog T1 direction («server components for pages, plain client components for Søknad»); spine Frameworks convention («most common documented Next.js patterns»).
- **Gap:** The layer table says pages may import only `src/lib`, so server-component pages could not call `services/history` directly; they would have to fetch their own API over HTTP, which is non-idiomatic and forwards the cookie awkwardly. S6 page stories will split between the two.
- **Fix:** Amend the layer table: server-component pages may call services directly (through `requireSession()`), with `loading.tsx` skeletons for Cold load; client components reach the server only through route handlers via `callApi()`.

### M5. Import rules for `src/lib` and client use of pure Core are undefined
- **Source:** EXPERIENCE.md Form field (counters «1 240 / 15 000 tegn», validation on blur), Tone choice (three Tones), Letter view (file name); spine Validation convention ("limits are constants in Core", schemas in `src/lib/schemas` used by the form).
- **Gap:** The form needs Core constants and possibly `core/filename` (if the .docx is built in the browser, still Deferred), but the UI may import only `src/lib`, and the spine never says what `src/lib` may import.
- **Fix:** Add to the layer table: `src/lib` may import `src/core` (pure and client-safe by AD-1), and the UI may import `src/core` for constants, types and pure formatting only, never `src/server`.

### M6. Design tokens → Tailwind v4 mapping is not fixed
- **Source:** DESIGN.md front matter (colors, typography, rounded, spacing, components), Brand & Style («single theme; no dark variant»), Typography (system stack); spine source tree («DESIGN.md tokens via Tailwind»).
- **Gap:** Tailwind 4 has no `tailwind.config.js` by default; tokens go in CSS `@theme`. Without a rule, stories will mix raw hex values, arbitrary values and differently named utilities. The `create-next-app` scaffold also ships a `prefers-color-scheme: dark` block and the Geist font, both of which contradict DESIGN.md.
- **Fix:** Add a convention row: DESIGN.md tokens are declared once in `src/app/globals.css` under `@theme`, with names mirroring DESIGN.md (`--color-accent`, `--color-warning-text`, `--radius-sm`, `--spacing-gutter`…); no raw colours in components; DESIGN component tokens become small components in `src/components/ui/` (Button, Card, InfoBanner, ErrorMessage, Chip). The scaffold story removes the dark-mode block and Geist.

### M7. UI highlighting would need a second string matcher (Evidence bold, Letter flags)
- **Source:** EXPERIENCE.md Evidence excerpt («the matched Keyword in bold», trimmed ~160 characters at word boundaries), Letter warnings («Each flagged word in the Letter is highlighted … and linked to its warning line»); DESIGN.md Letter flag.
- **Gap:** AD-2 says only `core/keywords` compares words, but the responses as described carry only keywords and excerpts. To bold an inflected or split-compound match («postoperative», «prosjekt-ledelse»), the UI would have to search the string itself and would disagree with the stem and compound stages.
- **Fix:** Add to AD-2: `EvidenceCitation` and each FR-11 flag carry character ranges (`{ start, end }`, in the excerpt and in the Letter respectively), computed by Core, and the trimming to ~160 characters happens in Core; the UI only wraps the ranges it is given.

### M8. Letter sign-off name: where the Profile name enters is undecided
- **Source:** PRD FR-9 («The sign-off uses the name in the Profile. Without a Profile, it uses a visible placeholder.»); EXPERIENCE.md Letter view («Before S6 the sign-off shows the placeholder «[Navnet ditt]»»); spine AD-6/FR-26 (contact stripping), AD-9 (name only in the encrypted Profile).
- **Gap:** Either the name goes into the prompt (more personal data to the provider, and Cached responses would carry a name) or the server substitutes it after the AI call. Stories for S3 and S6 will choose differently, and the stored Letter and the .docx then differ.
- **Fix:** Add to AD-4/AD-5: prompts always ask for the fixed placeholder «[Navnet ditt]», and the letter service replaces it with the Profile name after guarding, when a Profile exists; the name is never sent to the provider, and Cached responses keep the placeholder.

### M9. «Lag nytt utkast» (regenerate) is not covered by AD-3/AD-7
- **Source:** EXPERIENCE.md Letter view («Lag nytt utkast» replaces the Letter, using the Tone in the form), Partial result: Daily cap («Lag nytt utkast» shows the same message); PRD FR-12 (replaces the stored Letter; counts toward the cap), FR-27 (in Test mode returns the cached Letter for the chosen Tone), P6.
- **Gap:** Unstated: whether regeneration reuses `POST /api/letter` with the Application id; that it replaces the stored Letter (after S6); that `letter-check` must re-run afterwards, and with which Gaps (client-held vs server-stored, given AD-3's "don't trust the client" stance); and whether the cached adapter is keyed by Tone.
- **Fix:** Add to AD-3: regeneration is the same `POST /api/letter` call (with `applicationId` after S6), which overwrites the Letter; the client then re-runs `letter-check`, which after S6 reads Gaps from the stored Application and before S6 uses the guarded Gaps the client holds. The cached adapter's key includes the Tone.

### M10. `docs/architecture.md` (lecturer criterion 5) has no content contract or schedule
- **Source:** Lecturer feedback §2 criterion 5 («Begrunn valg av språkmodell, lagring og krypteringsløsning i arkitekturen, og hold det enkelt»), §3 point 3 («hvilken språkmodell … hvordan nøkkelen konfigureres, og hvordan en testmodus … skal fungere for sensor»); memlog Deliverables direction; spine source tree.
- **Gap:** The spine lists the file but not what it must contain, who writes it, or when. The LLM choice is deferred to the week-47 bake-off, so the doc cannot be finished before then, and nothing ties the bake-off to updating it. The "keep it simple" ask is also unaddressed for visible complexity: two database drivers, a keep-alive workflow, a proxy gate.
- **Fix:** Add a Deferred row or Operations bullet: `docs/architecture.md` (Norwegian, linked from the README) covers (1) LLM provider and model with bake-off results and key configuration, (2) storage: Supabase plus PGlite and why two drivers is the simplest way to meet NFR-9 and FR-30, (3) AES-256-GCM field encryption and scrypt, (4) Test mode for the Examiner, (5) rejected alternatives. Drafted in epic 1, completed right after the week-47 bake-off.

### M11. Node 26 as the only supported runtime is a runnability risk for the Examiner
- **Source:** Lecturer feedback §2 criterion 6 («kan kjøres lokalt etter README»), Gjennomførbarhet «Kjørbar for sensor»; EXPERIENCE.md Flow 3 (clean machine, fresh clone); spine Stack (Node 26.x, which entered Active LTS on 2026-10-28 per the memlog).
- **Gap:** A grader's machine in December 2026 is likely on Node 22 or 24 LTS. The spine neither states a supported range nor says how the README or setup handles a mismatch.
- **Fix:** Add to the Stack/Operations: `package.json` `engines` states the supported range (for example `>=22`, if Next 16.4, PGlite and the other dependencies allow it), CI runs on the lowest and highest versions in that range, `.nvmrc` pins 26 for development, and `scripts/setup.mjs` stops early with a clear message on an unsupported Node. The README states the exact commands (`npm install`, `npm run setup`, `npm run dev`).

## Low

### L1. The 640/641 px breakpoint does not match Tailwind's `sm`
- **Source:** EXPERIENCE.md Responsive & Platform (`≥ 641px` full navbar, `≤ 640px` collapsed); DESIGN.md Tone option («Three in a row from 641 px»).
- **Gap:** Tailwind's `sm:` is `min-width: 640px`, so at exactly 640 px the full navbar would show, against the spec. Stories may mix `sm:` with arbitrary `min-[641px]:`.
- **Fix:** In the M6 token convention, define one custom breakpoint (`--breakpoint-nav: 641px`, used as `nav:`) for the navbar collapse and the Tone layout, and don't use `sm:` for these.

### L2. Download file name: no-name fallback and transliteration rule
- **Source:** EXPERIENCE.md Language («Downloaded file names stay ASCII»), Letter view / Accessibility Floor (`violet-hansen-soknadsbrev-nordic-digital-2026.docx`); PRD FR-12.
- **Gap:** `core/filename` is assigned, but the rule isn't: the name before S6 (no Profile name), the mapping of æ/ø/å (ae/o/a?) and other characters, the length cap, and the source of the year (Oslo date passed in, per AD-1). If the .docx is built on the server, the `Content-Disposition` header must carry the same name.
- **Fix:** Add to the Capability map or AD-1: `core/filename` defines `[name-]soknadsbrev-<employer>-<yyyy>.docx`, with the name part omitted when there is none, æ→ae, ø→o, å→a, other non-`[a-z0-9]` characters → `-`, and a fixed length cap; the year comes from the passed-in Oslo date.

### L3. The AI key variable(s) are not named
- **Source:** Lecturer feedback §3 point 3 («hvordan nøkkelen konfigureres»), §2 criterion 7 (`.env.example` for the API key and the encryption key).
- **Gap:** AD-11 derives `testMode` from "no AI key" without naming the variable, so the bake-off adapters may each read a different name (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
- **Fix:** Name it in AD-11: one `AI_API_KEY` (plus `AI_MODEL`), read only by config and passed to the live adapter. `.env.example` and the README document it as optional.

### L4. Repository hygiene for local data and fictional fixtures is not stated
- **Source:** Lecturer feedback §2 criterion 7 (secrets in `.env.example`, only fictional CVs as test data, never real CVs in a public repo); PRD FR-28.
- **Gap:** The spine does not say that `.data/` (local PGlite, which holds encrypted personal data) and `.env` are git-ignored, or that `fixtures/` may contain only fictional CVs.
- **Fix:** Add one Consistency row: `.env`, `.data/` and any recorded live outputs that contain real input are git-ignored; `fixtures/` and `docs/qa/` contain only fictional CVs and ads.

### L5. The FR-5 fallback path in phase 1 lacks timing and notice rules
- **Source:** EXPERIENCE.md State Patterns «Scoring (phase 1)» (progress line «Henter nøkkelord fra annonsen …»), AI notice («Under the FR-5 fallback, it also says that the Job ad … is sent»); PRD FR-24, FR-25.
- **Gap:** AD-3 gives `maxDuration` 120 s only to `letter` and `gaps`. Under the fallback, `analyse` makes an AI call, so it needs the same limit, the AI notice must be shown before phase 1 rather than before phase 2, and a Daily cap hit must fall back to code-only Keywords rather than fail.
- **Fix:** Add a conditional clause to AD-3, active if the week-46 decision turns the fallback on: `analyse` gets `maxDuration` 120 s, the client shows the AI notice before phase 1, and `cap_reached` or AI failure in `proposeKeywords` degrades to code-only Keywords with the «Mindre presist» flag.

### L6. Daily-cap increments under parallel phase-2 calls
- **Source:** EXPERIENCE.md Partial result: Daily cap («30 KI-forespørsler»); spine AD-6 (one row per scope and day).
- **Gap:** `letter` and `gaps` hit the gateway concurrently. A read-then-write check can let both pass at 29, and "KI-forespørsel" isn't defined as one provider call (so an Application costs 2).
- **Fix:** Add to AD-6: check and increment in one atomic statement (`INSERT … ON CONFLICT DO UPDATE … WHERE count < cap RETURNING`), and count one unit per provider call.

### L7. Where AI-notice acceptance is persisted after S6
- **Source:** EXPERIENCE.md AI notice dialog («once per account»); PRD FR-24; spine Capability map ("on the Profile after S6").
- **Gap:** It isn't stated whether this is a Profile column (a timestamp, plain text like other dates under FR-22), whether the server enforces it, or how the client learns it.
- **Fix:** One line in the Capability map: `profile.aiNoticeAcceptedAt` (a plain timestamp) is set by a profile endpoint and exposed through `PublicConfig.session` (H5); the check is UI-only, and the gateway does not enforce it.

### L8. The phase-1 response shape for «Lagret i Historikk.» and the phase-2 linkage
- **Source:** EXPERIENCE.md Saved line («appears once the score exists»); PRD FR-21; spine AD-7 (phase 1 creates the row, and phase 2 adds to it by id).
- **Gap:** The spine doesn't say that the `analyse` response carries `applicationId` (null before S6), that phase-2 and regenerate requests send it back, or that the services check its ownership.
- **Fix:** Add to AD-7: the `analyse` data includes `applicationId: string | null`, and phase-2 bodies include it when it is non-null; ownership is checked through the AD-8 repositories (a mismatch returns 404).
