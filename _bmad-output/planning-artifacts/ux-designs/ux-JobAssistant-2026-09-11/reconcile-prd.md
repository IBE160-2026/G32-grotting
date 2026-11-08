# Reconciliation: PRD → UX (update run 2026-11-08)

- **Input:** `../../prds/prd-JobAssistant-2026-10-31/prd.md` (final, updated 2026-11-08) §5.1, §6, §7, §11 (D1–D23), and `addendum.md` §4, "UX updates needed to match the PRD".
- **Also checked:** the PRD's own `reconcile-ux.md` (gaps 1–11), to make sure each gap it raised against the UX is closed on the UX side.
- **Result:** every addendum §4 item is addressed. Nothing was dropped. Decisions the PRD left to the UX were made by Helene on 2026-11-08 (UX memlog): colour option A, Hjem review cards removed, Tone as radio cards, mockups updated in this run.

## Addendum §4.1 — EXPERIENCE.md

| Item | Where it's addressed |
|---|---|
| Flow 1: no tailored CV file (D1); Letter on screen (D3) | Key Flows → Flow 1; Component Patterns → Letter view |
| Version without accounts (D20): CTA → Søknad, CV on Søknad, two-item nav, no «Lagret.», S4/S5 cut layouts | Build-order variants (new section); Information Architecture → Navigation; Responsive & Platform |
| Hjem: remove review cards (D2); change CTA copy | Information Architecture → Hjem; Anti-patterns; `mockups/key-home.html` |
| «Registrer deg»: name instead of username; Konto: email, logout, data note, no password change (D14) | Information Architecture → Registrer deg, Konto; Component Patterns → Data note |
| Profil: paste option, editable CV text with confirm, name as only field, CV text instead of file (D11) | Information Architecture → Profil; Component Patterns → Upload dropzone, CV text editor |
| Søknad: job title, employer, Tone, AI notice (D10, FR-10, FR-24); CV input before S6 and "no CV yet" prompt (D11, D20); «Bruk eksempelet» (FR-27) | Component Patterns → Input (S1): Job ad fields, Tone choice, AI notice dialog, CV from Profile, «Bruk eksempelet» |
| Score panel: «X av Y nøkkelord», formula line, estimate disclaimer (D15) | Component Patterns → Score panel |
| Code-written line per Missing keyword (FR-8); Evidence excerpt per Matched keyword | Component Patterns → Keyword lists, Evidence excerpt |
| Needs work Verdict sentence | Component Patterns → Score panel; Key Flows → Flow 2 |
| Rewordable-gap callout with citation, phrasing, «Kopier» (FR-16); "recruiter framing" not "ATS framing" (FR-14) | Component Patterns → Gap callout, Rewordable; Voice and Tone |
| AI-written parts marked (FR-14); Note on screen only (D4) | Component Patterns → Gap section, AI label; IA (no download anywhere) |
| Letter: «Kopier», «Last ned (.docx)», «Lag nytt utkast», AI-draft label (FR-9, FR-12); reword «Lagret.» | Component Patterns → Letter view, Saved line («Lagret i Historikk.») |
| Historikk: no CV-vurdering row, no type tags, no search (D5); Verdict text on badges (NFR-2) | Component Patterns → History row, Pagination; Accessibility Floor; `mockups/key-home.html` |
| Two-phase results (D19): Generating / Result / Failed rewritten; AI-phase progress copy; one announcement per phase; partial result with AI-only retry (NFR-5) | State Patterns → Scoring, Writing, Result complete, Partial result (three rows) |
| New states: Letter warning (FR-11), Daily cap (FR-25), Test-mode banner (FR-27), scanned PDF (FR-1), too short/unclear (FR-4), length limits (FR-2, FR-4), not available in Test mode (FR-27), not found (FR-19), Access-code screen (FR-31) — each with copy and a token | State Patterns (one row each); tokens: error, warning family, `{components.info-banner}` (DESIGN.md Colors explains the choice) |

## Addendum §4.2 — DESIGN.md

| Item | Where it's addressed |
|---|---|
| Fix failing colours: text-secondary, warning chip/badge, success chip/badge, accent-strong label, callout emphasis, accent links on background, input and dropzone outlines (3:1) | Frontmatter colours and components; Colors section lists every ratio. New tokens `border-strong`, `warning-text`. accent-tinted blocks restricted to surface |
| New components: Letter view with flagged-word highlight, Tone choice, AI-notice dialog, Test-mode banner, Evidence excerpt | Components: `letter-view`, `letter-flag`, `tone-option(-selected)`, `dialog`, `info-banner`, `evidence-excerpt`; also `gap-callout-real`, `ai-label`, `typography.letter` |
| Touch targets ≥ 44 px | `spacing.touch-target`; Layout & Spacing |

## Addendum §4.3 — Mockups

| Item | Where it's addressed |
|---|---|
| Result: remove CV file and Note download, Letter on screen, fix 78 % vs 5 of 7 | `mockups/key-application-result.html` (71 %, 5 av 7) |
| Home: Hjem and Historikk changes | `mockups/key-home.html` (plus a before-accounts frame) |
| (Not listed, done for consistency) Mobile nav palette and before-accounts navbar | `mockups/key-mobile-nav.html` |

## Addendum §4.4 — All UX files

| Item | Where it's addressed |
|---|---|
| Tag flows and screens with S and FR IDs | IA table "Exists from" and "Realises" columns; Flow headings; component groups by S step |
| Replace "early December 2026" with 15 December 2026 | EXPERIENCE.md Foundation |

## PRD `reconcile-ux.md` gaps, UX side

Gaps 1–4, 6, 7 and 9 are covered by the rows above. Gap 5 (voice rules testable): Voice and Tone now states that the rules bind AI-written text and the Letter, matching NFR-1. Gap 8 (accessibility narrowed): Accessibility Floor covers every screen, 44 px targets, and Verdict text on row badges. Gap 10 (loading and recovery states): Cold load, Uploading and Session expired (with the kept Job ad) are in State Patterns. Gap 11 (dark mode and native app "deferred"): the UX still rules both out; this was a PRD-side fix.

## Drafted in this run for Helene to review

The PRD didn't specify these, so they are drafted in the spines without tags. They are listed here so they can be checked:
- Gap labels «Kan omformuleres» / «Mangler i CV-en», the section heading «Det som mangler», and the marker «Skrevet med KI».
- Verdict sentences, the formula line and the disclaimer wording (FR-8's meaning, UX wording).
- Results render on the same Søknad page under a collapsed form summary; «Lag nytt utkast» uses the form's Tone.
- Two-item navbar before S6 has no hamburger and no persistent CTA.
- Letter sign-off placeholder «[Navnet ditt]»; the discarded-suggestion line; the session-expiry "kept Job ad" line.
- Illustrative Flow 2 details (54 %, 7 av 13, a flagged «SQL»).
