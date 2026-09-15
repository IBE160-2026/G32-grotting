---
title: JobAssistant
status: final
created: 2026-09-11
updated: 2026-09-11
sources:
  - ../../briefs/brief-JobAssistant-2026-09-11/brief.md
  - ../../briefs/brief-JobAssistant-2026-09-11/addendum.md
---

# JobAssistant — Experience Spine

> Web app (no native mobile app, per brief scope), responsive down to phone-browser width. Single light theme, no mode toggle. Paired with `DESIGN.md`. Primary user: a university/college student applying for their first full-time job (Violet, the memlog's protagonist). Core product pillar: AI transparency — every suggestion, gap, and score comes with a plain-language reason, not a black-box draft.

## Foundation

Single responsive web app, one account tier, no institutional/career-center intermediary (self-serve, per brief). No named UI system — components are custom, specified in `DESIGN.md.Components`. Course-project delivery target: working end-to-end demo by early December 2026 (per brief `Success criteria`). This keeps the spine intentionally narrow to v1 scope: CV upload, job-description paste-in, tailored letter generation, CV suggestions, gap analysis, ATS (Applicant Tracking System) match score, accounts with encrypted storage. Out of scope for this spine, per brief: in-app output editing, voice-learning from past applications, multi-language support, job-board integration/auto-apply, interview prep, LinkedIn import.

## Information Architecture

Visual reference mocks exist for three load-bearing surfaces: [Home](mockups/key-home.html), [Application result](mockups/key-application-result.html), [Mobile nav, collapsed](mockups/key-mobile-nav.html) — also linked throughout the tables below. Everything else is built from the tables in this spine and `DESIGN.md` alone. Mocks illustrate; this spine and `DESIGN.md` are the contract and win on any conflict.

| Surface | Reached from | Purpose |
|---|---|---|
| Home ([mock](mockups/key-home.html)) | App open | Dashboard: recent past applications, primary "Create tailored application" CTA, and entry points to Review CV / Review Application. Unauthenticated visitors see the same CTA-forward layout with an empty/sample state, per the Kickresume-inspired "don't bury the start action" pattern. |
| Signup | Home CTA (first-time) / nav (unauthenticated) | Username, email, password. |
| Login | Home (unauthenticated, returning) / session expiry | [ASSUMPTION — not explicitly described in the memlog; only signup was. Assumed to exist and mirror signup's core fields: email + password.] |
| Profile | Navbar "Profile" / redirect immediately after signup | CV upload (PDF/DOC/TXT) + personal info fields. |
| Application | Navbar "Application" (bold) / Home CTA | Paste a job description → generation → result ([mock](mockups/key-application-result.html)): tailored CV + application letter + Reflection Note (match score, keyword chips, gap suggestions). Files download; no in-app editor. |
| Review CV | Home entry point | Upload a CV, standalone from any specific job ad → Feedback Document. |
| Review Application | Home entry point | Upload an application, standalone → Feedback Document. |
| History | Navbar "History" | Full list of past applications and reviews. [ASSUMPTION: Home's "list of applications" is a short recent-activity view; History is the complete, presumably paginated/searchable archive — the memlog names both surfaces but doesn't state how they differ.] |
| Account | Navbar "Account" | Account settings. [ASSUMPTION: password change and a note on encrypted data storage/deletion, inferred from the brief's "encrypted storage" requirement — no explicit fields were decided.] |
| Logout | Navbar "Logout" | Ends session, returns to Home (unauthenticated). |

Flat six-item navbar: Home, Application, Profile, History, Account, Logout — Home and Application bold/emphasized (`{components.nav-link-primary}`). No drawer, no nested nav. Modal/sheet stacks one level deep, never two. Collapse behavior specified in Responsive & Platform below.

## Voice and Tone

Microcopy. Brand register lives in `DESIGN.md.Brand & Style`: warm and editorial, evidence-first — explicitly not playful (rejected Kickresume's tone) and not like Teal.

| Do | Don't |
|---|---|
| "78% match. Here's why." | "Wow, great job! 🎉 78% match!" |
| "Missing: Kubernetes, Agile Certification." | "Uh oh, you're missing some keywords!" |
| "Recruiters scanning for this role look for 'cross-functional collaboration.' Your application doesn't show it yet." | "You should add some more skills." |
| "Your semester project on X likely covers this — consider adding it." | "We fixed this for you." (never implies the system invented or added a qualification on its own — see Inspiration & Anti-patterns) |
| "Saved. Download your files below." | "Success!! Your documents are ready to go!!" |
| Direct, evidence-first sentences — state the fact, then the reason. | Cheerleading, exclamation points, emoji, gamified praise. |

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Navbar | Global | Home + Application bold and always visible pre-collapse. Active surface highlighted in accent. Logout requires no confirmation dialog — single click ends session. |
| Persistent CTA | Global, mobile/narrow only | [ASSUMPTION — see Responsive & Platform] Stays visible outside the hamburger at all times; routes to the Application flow (paste job description). Interpreted as the same destination as Home's big CTA and the navbar's bold "Application" link, since the memlog names a single "key CTA action," not several. Labeled "Create application" (shortened) and rendered compact (`{components.persistent-cta}`, sized below `{components.button-primary}`'s default) so it doesn't crowd the collapsed mobile navbar next to the hamburger toggle. |
| Review entry buttons | Home | The standalone "Review CV" and "Review application" buttons use `{components.button-review}` — `{colors.accent-strong}` fill, a visibly lighter brown than the primary CTA's `{colors.accent}` fill — so they read as actionable and on-brand without competing with Home's single primary "Create tailored application" CTA. |
| Upload dropzone | Profile (CV), Review CV, Review Application | Click-to-browse or drag-and-drop. Accepts PDF/DOC/TXT only; anything else rejects inline with an error state (see State Patterns) before any upload request fires. Shows filename + size once accepted; re-drag replaces it. |
| Match Score panel | Application result | One per generated application. Score badge (`{components.match-score-badge-strong}` or `{components.match-score-badge-weak}`) plus a keyword-chip row plus one-or-more suggestion callouts. Threshold for strong vs. weak: [ASSUMPTION — not specified in sources; a reasonable placeholder is ≥70% strong; treat as a config value the PRD/architecture should confirm, not a hard UX commitment]. |
| Keyword chip | Match Score panel, Feedback Document | Matched (✓, success tokens) or missing (✕, warning tokens). Tapping/clicking a missing chip expands the paired suggestion callout if collapsed (mobile) or scrolls to it (desktop). |
| Suggestion callout | Match Score panel, Feedback Document | One per identified gap. States, in order: what's missing, why it matters (recruiter/ATS framing), and — when available — which of the student's own coursework/projects/extracurriculars could legitimately fill it. Never states a qualification the student doesn't have; only reframes what's already on the CV. |
| Reflection Note | Application result | The bundle name for the Match Score panel + suggestion callouts delivered alongside a generated application — this is the "gap analysis + ATS-screening explanation" named in the memlog. Downloadable alongside the CV and letter [ASSUMPTION: as a combined summary, format TBD by architecture — could be on-screen only, PDF, or plain text; the memlog confirms the *content* exists but not its delivery format beyond "downloadable"]. |
| Feedback Document | Review CV result, Review Application result | [ASSUMPTION — the memlog names the output only as "a feedback document," not its structure.] Reuses the Match Score panel's keyword-chip and suggestion-callout patterns where a job description was supplied; falls back to general strengths/improvement callouts (no score, no keyword chips) when reviewing without one, since ATS matching requires a job description to compare against. |
| History row | History, Home (recent list) | Job title/label, date, type (Application / CV review / Application review), and — for Application rows — the match score badge at a glance. Click opens the stored result read-only; download buttons remain available. |
| Trust microcopy | Profile (CV upload), Account | Short, always-on, factual line near the upload control: "Your CV and generated documents are stored encrypted." [ASSUMPTION — surfaces the brief's encrypted-storage requirement as a trust signal, since the AI-transparency pillar extends naturally to data-handling transparency; exact placement/wording not decided in the memlog.] |
| Form field | Signup, Login, Profile, Account | Label above input (`{typography.label}`). Inline validation on blur, not on every keystroke. Error state uses `{colors.error}`, never `{colors.warning}` (warning is reserved for ATS semantics only). |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Unauthenticated | Home | Same CTA-forward layout as authenticated Home; "Create tailored application" routes to Signup instead of Application. No locked/teaser screen. |
| Empty history | Home, History | "No applications yet. Start with your first job description." + primary CTA. |
| Cold load | Home, History | Skeleton rows matching the eventual list layout; resolves on data. |
| Uploading | Profile, Review CV, Review Application | Dropzone shows filename + indeterminate progress. Cancel available while in flight. |
| Upload rejected | Profile, Review CV, Review Application | Inline, `{colors.error}`: "Only PDF, DOC, or TXT files are supported." / "File is too large." No toast — the error sits at the dropzone. |
| Generating | Application (post-paste), Review CV, Review Application | Explicit progress state, not a bare spinner — per the product's transparency pillar, microcopy should say what's happening: "Comparing your CV against the job description…" This can take real processing time (LLM calls); the wait itself should not feel like a black box either. |
| Generation failed | Application, Review CV, Review Application | `{colors.error}` inline message: "Something went wrong generating your application. Your job description/file wasn't lost — try again." Input preserved, retry in place. |
| Result ready | Application, Review CV, Review Application | Reflection Note / Feedback Document renders; download button(s) enabled. |
| Form validation error | Signup, Login, Profile, Account | Inline, field-level, `{colors.error}`. Never a page-level blocking modal for validation. |
| Session expired | Global | Redirect to Login with: "Your session ended. Log back in to continue." [ASSUMPTION, pairs with the assumed Login surface.] Where technically feasible, any in-progress paste/upload on Application isn't silently discarded — re-prompt after login. |
| Offline / request failed | Global | [ASSUMPTION] Inline error banner, not a toast: "Couldn't reach the server. Check your connection and try again." No offline-first/local-write behavior — this is a server-dependent AI product, unlike a notes app. |

## Interaction Primitives

JobAssistant is a document-in, document-out workflow tool, not a power-user surface — no bespoke keyboard-shortcut layer is warranted or was requested.

- Click / tap to act everywhere; drag-and-drop is an enhancement on upload controls, never the only path (click-to-browse always available).
- Paste is the primary input mechanic on the Application flow — a plain textarea for the job description, no rich formatting.
- Download is a direct browser file download (not an in-app viewer/editor) — confirmed decision: generated output is edited externally.
- Standard form primitives: `Tab` order follows visual/reading order, `Enter` submits the focused form, `Esc` closes the topmost modal/sheet.
- Touch targets ≥44px on all interactive elements, given the confirmed phone-browser requirement.
- **Banned:** infinite scroll on History (paginate instead — a student should be able to reference "the third application I made" reliably), auto-advancing carousels, any drag-to-reorder.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md`.

- WCAG 2.2 AA across the full responsive web surface.
- Match/keyword semantics are never color-only: every keyword chip and match-score badge pairs its color with a glyph (✓/✕) and/or text label ("Strong match" / "Needs work"), so colorblind users get the same information.
- All uploads have a labeled file input with an accessible name, not just a styled dropzone; drag-and-drop is progressive enhancement over a real `<input type="file">`.
- Focus rings use `{colors.accent}` at AA contrast against `{colors.background}` and `{colors.surface}` (verified in DESIGN.md).
- Form errors are associated with their field via `aria-describedby`, not color alone.
- Generation-in-progress state is announced via `aria-live` (polite) so screen reader users get the "Comparing your CV…" progress copy, not silence.
- Downloadable files are named descriptively (e.g., `violet-hansen-cv-acme-2026.pdf`), not `output.pdf` — an accessibility and usability point at once.

## Responsive & Platform

Mock: [Mobile nav, collapsed — closed and open states](mockups/key-mobile-nav.html).

| Breakpoint | Behavior |
|---|---|
| `≥ 641px` | Full navbar: all six links visible inline, Home + Application bold. |
| `≤ 640px` | Nav links collapse into a hamburger menu. Persistent CTA remains visible outside the hamburger (see Component Patterns — Persistent CTA for behavior and the underlying assumption). History, Profile, Account, Logout live inside the hamburger sheet. |
| All widths | Single-column content, `{spacing.gutter}` minimum side margin. No layout uses side-by-side panels that would force horizontal scroll on a phone. |

No native mobile app exists or is planned (explicit brief scope exclusion); "responsive" means the web app itself must remain fully usable — upload, paste, review, download — on a phone browser.

## Inspiration & Anti-patterns

- **Lifted from Kickresume:** surfacing the "start your application" action prominently at the front of the page, not buried — the one explicitly praised pattern from a competitor.
- **Rejected — Kickresume's playful, colorful visual register:** still true post-pivot — the rejection was about tone (evidence-first vs. gamified), not palette warmth.
- **Rejected — Teal's UI:** explicitly disliked; specific complaints weren't elaborated in the memlog beyond the rejection itself, so no further pattern is extracted from it.
- **Rejected — in-app output editing:** confirmed decision that generated CV/letter are downloaded and edited externally, not edited in-browser. Keeps v1 scope tight for the December deadline and avoids building a document editor.
- **Rejected — black-box AI suggestions:** the defining anti-pattern from the brief's competitive research (addendum: tools that "optimize purely to beat the filter" and ship generic, unexplained output). Every suggestion in JobAssistant must carry its reasoning inline — this isn't negotiable scope, it's the product's stated differentiator.
- **Rejected — implying or fabricating qualifications during gap-filling:** the brief explicitly names hallucinated qualifications as a competitor pitfall to avoid; suggestion callouts may only reframe experience the student already has.

## Key Flows

### Flow 1 — First tailored application (Violet, first session, new user)

1. Violet lands on Home, unauthenticated. She sees the big "Create tailored application" CTA up front — the Kickresume-style placement — plus an empty/sample state since she has no history yet.
2. She taps the CTA and is routed into Signup: username, email, password.
3. Immediately after signup, she's redirected to Profile: she uploads her CV (PDF) via the dropzone and fills out her personal info fields.
4. She returns to Home — her CTA is now front and center on a real (still-empty) dashboard — and taps it again, landing on the Application surface. (She could equally have used the bold "Application" navbar link.)
5. She pastes in a job description for a role she's targeting.
6. She submits; the Generating state shows explicit progress copy ("Comparing your CV against the job description…") rather than a bare spinner.
7. **Climax:** the result loads — a tailored CV, an application letter, and the Reflection Note: a 78%-style match score badge, matched keyword chips, missing keyword chips, and a suggestion callout explaining that "cross-functional collaboration" appears in the posting but not her CV, with a pointer to the semester group project that already covers it, just not phrased that way yet. For the first time, Violet sees *why* the system is judging her application the way it is, not just a pass/fail score.
8. She downloads the CV and letter files and continues editing them in her own tools outside the app — no in-app editor exists, by design.

Failure: generation fails mid-request → inline error with her pasted job description preserved, retry available without re-pasting.

### Flow 2 — Standalone CV review (Violet, weeks later, independent of any specific job ad)

1. Violet returns to JobAssistant (already authenticated) to sanity-check her CV before a networking event, not for a specific posting.
2. From Home, she uses the standalone "Review CV" entry point (not the Application flow, not the navbar — a dedicated button on Home).
3. She uploads a newer version of her CV via the dropzone.
4. Generating state runs; since no job description was supplied, the system produces a Feedback Document scoped to general CV quality — no match score, no keyword chips against a specific posting.
5. **Climax:** the Feedback Document returns general strengths and improvement suggestions — phrased with the same evidence-first, non-cheerleading voice as the Application flow's Reflection Note, keeping the product's transparency posture consistent even outside the core job-specific journey.
6. She downloads the feedback document; the review is saved to her History alongside her past applications.

Failure: unsupported file type uploaded → inline error at the dropzone, upload never sent, no wasted generation call.
