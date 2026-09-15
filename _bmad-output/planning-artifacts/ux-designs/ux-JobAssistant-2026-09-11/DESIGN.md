---
title: JobAssistant
status: final
created: 2026-09-11
updated: 2026-09-11
sources:
  - ../../briefs/brief-JobAssistant-2026-09-11/brief.md
  - ../../briefs/brief-JobAssistant-2026-09-11/addendum.md
name: JobAssistant
description: Web app that turns a student's CV and a pasted job ad into a tailored application, showing its work — ATS match score, keyword-level explanations, gap analysis — instead of shipping a black-box draft.
colors:
  # Base (confirmed): warm beige/cream background and surface, warm dark-brown
  # text — a single light theme; no dark mode exists or is planned. Accent
  # system is "Rich Mocha" (see Brand & Style for the reversal from the
  # original dark theme). Final accent/accent-strong values were hand-tuned
  # by the user after also trying hardwood-toned button options — full
  # palette-exploration history in reconcile-color-themes-1.md. accent-strong's
  # WCAG contrast note lives on the "Button, review" bullet in ## Components,
  # where it's actionable.
  background: '#F2E4CF'
  surface: '#FAF1E1'
  text: '#3A2A1D'
  text-secondary: '#8A7157'
  border: '#E0CBA8'
  accent: '#7F6244'
  accent-strong: '#937A62'
  accent-text: '#FFF6EE'
  accent-bg: '#7F62441F'
  success: '#4C7A3F'
  success-bg: '#4C7A3F1A'
  success-border: '#4C7A3F40'
  # Warning was deliberately re-tuned to a punchy goldenrod (from the amber
  # used on the earlier dark theme) specifically to stay visually distinct
  # from the new brown/mocha accent — brown and amber/gold sit close in hue,
  # so warning here trades hue-distance for much higher saturation (reads as
  # gold-yellow, not a third brown). See .working/color-themes-4.html.
  warning: '#B8860B'
  warning-bg: '#B8860B1F'
  warning-border: '#B8860B45'
  # Error/destructive channel: a clear red, defined directly alongside the
  # Rich Mocha accent in .working/color-themes-4.html's shared base (held
  # identical across both brown/mocha tone options shown on that page, and
  # unchanged from the earlier beige explorations). Used for form validation,
  # failed uploads, and generation failures so a real system error is never
  # visually confused with a "weak match" warning.
  error: '#A8341F'
  error-bg: '#A8341F1A'
  error-border: '#A8341F40'
typography:
  # [ASSUMPTION] Font family and scale are a fast-path default (no typography
  # decision exists in the memlog) — sized against the working reference
  # mocks' actual UI text (10.5–19px). See the Typography section below for
  # role detail; carries forward unchanged through the color pivot.
  display:
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Inter", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: -0.02em
  heading-lg:
    fontSize: 22px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  heading-md:
    fontSize: 17px
    fontWeight: '700'
    lineHeight: '1.35'
  body:
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.04em
  mono-score:
    fontFamily: '"SFMono-Regular", Consolas, Menlo, monospace'
    fontSize: 16px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  # [ASSUMPTION] Scale derived from the working reference mocks (buttons/chips
  # ~7–9px, cards 10px, containers 12–14px, badges/chips ~20px as pills) — a
  # structural, not chromatic, choice, unaffected by the color pivot.
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  # [ASSUMPTION] Standard 4px-based scale; gutter matches the 20px side
  # padding used across the working reference mocks — a structural, not
  # chromatic, choice, unaffected by the color pivot.
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 48px
  gutter: 20px
  section-gap: 48px
components:
  navbar:
    background: '{colors.surface}'
    border-bottom: '{colors.border}'
  nav-link-primary:
    color: '{colors.text}'
    fontWeight: '700'
  nav-link-secondary:
    color: '{colors.text-secondary}'
    fontWeight: '500'
  persistent-cta:
    background: '{colors.accent}'
    foreground: '{colors.accent-text}'
    radius: '{rounded.sm}'
  button-primary:
    background: '{colors.accent}'
    foreground: '{colors.accent-text}'
    radius: '{rounded.sm}'
  button-secondary:
    background: 'transparent'
    foreground: '{colors.text}'
    border: '{colors.border}'
    radius: '{rounded.sm}'
  button-review:
    background: '{colors.accent-strong}'
    foreground: '{colors.accent-text}'
    radius: '{rounded.sm}'
  card:
    background: '{colors.surface}'
    border: '{colors.border}'
    radius: '{rounded.md}'
  match-score-badge-strong:
    foreground: '{colors.success}'
    background: '{colors.success-bg}'
    border: '{colors.success-border}'
    radius: '{rounded.full}'
  match-score-badge-weak:
    foreground: '{colors.warning}'
    background: '{colors.warning-bg}'
    border: '{colors.warning-border}'
    radius: '{rounded.full}'
  keyword-chip-matched:
    foreground: '{colors.success}'
    background: '{colors.success-bg}'
    border: '{colors.success-border}'
    radius: '{rounded.sm}'
  keyword-chip-missing:
    foreground: '{colors.warning}'
    background: '{colors.warning-bg}'
    border: '{colors.warning-border}'
    radius: '{rounded.sm}'
  suggestion-callout:
    background: '{colors.accent-bg}'
    border-left: '{colors.accent}'
    emphasis-color: '{colors.accent-strong}'
    radius: '{rounded.sm}'
  upload-dropzone:
    background: '{colors.surface}'
    border: '{colors.border}'
    radius: '{rounded.md}'
  input-field:
    background: '{colors.surface}'
    border: '{colors.border}'
    foreground: '{colors.text}'
    radius: '{rounded.sm}'
  hamburger-toggle:
    border: '{colors.border}'
    icon-color: '{colors.text}'
    radius: '{rounded.sm}'
---

## Brand & Style

JobAssistant reads as a warm, editorial product with something real to say — not a slick resume factory, and no longer the austere precision instrument the original dark direction aimed for. The product's entire premise is transparency — showing a student exactly why the system judged their application the way it did — and the visual language carries that through a human, grounded register: a warm beige/cream base, warm dark-brown text, and a single Rich Mocha brown accent used with intent, rather than a wash of competing color. Nothing about the interface should feel playful, templated, or generic; the user explicitly rejected Kickresume's colorful, consumer-friendly register and disliked Teal's UI — that judgment carries over even though the specific palette that expresses it does not. What's kept from Kickresume is structural, not visual: the instinct to put the "start your application" action at the front of the page, unburied.

The register is now warm, editorial, and human — grounded and a little more serious than playful (per .working/color-themes-4.html's own description of the "Rich Mocha" register: "deeper, richer mocha/espresso... reads as serious/coffee-toned") — rather than the *technical and precise, almost clinical* register that guided the earlier, now-abandoned dark Violet Precision theme (see reconcile-color-themes-1.md for the full reversal). Every screen should still look like it was built by people who understand how ATS parsing actually works — that substance hasn't changed — but the surface no longer needs to look stark or clinical to earn that trust. JobAssistant is a single theme; there is no mode toggle and no dark variant. [ASSUMPTION] Typography and shape mostly carry over from the earlier fast-path defaults: a plain system sans throughout, a monospace accent reserved for the one number that matters most — the match score — and restrained, not-fully-rounded corners rather than soft consumer-app pill shapes.

## Colors

The palette is one accent, two semantic signal colors, and warm neutral tone otherwise — restraint is still the point: the ATS match score and keyword chips are the moments color is doing real communicative work, and they need to stand out against a quiet, warm base.

- **Background (`{colors.background}`, #F2E4CF)** — warm sand/cream, the canvas for every surface. No secondary "lighter" page background exists; depth comes from `{colors.surface}`, not from background variation.
- **Surface (`{colors.surface}`, #FAF1E1)** — the tonal layer for cards, the navbar, dropzones, and inputs. A lighter warm cream, keeping it visually part of the same beige system as the background rather than an unrelated neutral gray.
- **Text (`{colors.text}`, #3A2A1D)** and **Text Secondary (`{colors.text-secondary}`, #8A7157)** — primary content vs. metadata/labels/captions; a warm dark brown rather than pure black, consistent with the warm, editorial register. Text Secondary is never used for anything the user must act on.
- **Border (`{colors.border}`, #E0CBA8)** — the only divider mechanism. JobAssistant does not use drop shadows to separate surfaces (see Elevation & Depth); border does that work.
- **Contrast (focus rings, `{colors.accent}` on `{colors.background}` / `{colors.surface}`)** — computed at ~4.53:1 on background and ~5.0:1 on surface. The surface figure is comfortable; the background figure is a near-miss of the 4.5:1 AA text threshold (computed by hand, not tool-verified) — re-check with a proper contrast checker before shipping if the focus ring is ever rendered as text-sized rather than a ring/outline — today's ring/outline shape is held to the looser 3:1 UI-component floor, but text-sized rendering would need to clear the stricter 4.5:1 threshold instead.
- **Accent (`{colors.accent}` / `{colors.accent-strong}`, #7F6244 / #937A62)** — the final hand-tuned "Rich Mocha"-family brown, refined from the original explored swatch after also trying hardwood-toned options (full history in `reconcile-color-themes-1.md`). Used for primary CTAs, active nav state, links, the suggestion-callout rail, and focus rings; `accent-strong` also fills `{components.button-review}` (see Components — Button, review, including its contrast note). Beyond that one component, `accent-strong` is reserved for emphasis *within* accent-tinted content (for example, the bolded phrase inside an AI suggestion) rather than as a fill on its own. `{colors.accent-text}` (#FFF6EE, a light cream) is the foreground color used on top of a solid accent fill.
- **Success (`{colors.success}`, #4C7A3F)** — means exactly one thing: a strong keyword match or a matched keyword chip. Never used as a generic "good" color elsewhere (for example, not for a signup-success toast — that's accent territory, to keep the semantic narrow and legible).
- **Warning (`{colors.warning}`, #B8860B)** — a goldenrod, deliberately re-tuned from the original amber specifically to stay visually distinct from the new brown/mocha accent (brown and amber/gold sit close in hue, so warning trades some hue-distance for much higher saturation and reads unmistakably as gold-yellow, not a third brown). Means exactly one thing: a weak match or a missing keyword. Not used for destructive actions or system errors — see Error below.
- **Error (`{colors.error}`, #A8341F)** — system-level failure only: a failed upload, a failed generation request, a form validation error. A clear red, deliberately distinct in hue from both the brown accent and the goldenrod warning so a "your CV is missing this keyword" moment never reads as "something broke."

Avoid: any additional chromatic color beyond this list, gradients, colored surface fills (surfaces stay in the background/surface neutrals), and using accent decoratively where it doesn't indicate an action or an AI-authored insight.

## Typography

[ASSUMPTION — no typography decision exists in the memlog; this is a fast-path default.] One shared system-sans family (`{typography.display.fontFamily}`) carries every role except `mono-score`. The ramp is deliberately shallow — this is a utility interface, not a display-typography showcase:

- `{typography.display}` — page-level moment, used once per surface at most (for example, "Welcome back" on Home, a result-page headline). Bold, tight letter-spacing.
- `{typography.heading-lg}` / `{typography.heading-md}` — page titles and card/section headers respectively.
- `{typography.body}` / `{typography.body-sm}` — primary copy and secondary/meta copy.
- `{typography.label}` — uppercase, tracked-out labels for card headers ("ATS MATCH SCORE"), form field labels, and nav-adjacent microcopy.
- `{typography.mono-score}` — monospace, used exclusively for the match-score percentage. The one deliberate typographic flourish in the system: it makes the score read as a measurement, not a marketing number.

No serif, no display-weight body text, no italics as a primary device.

## Layout & Spacing

Single-column layouts throughout — JobAssistant is a workflow tool (upload → paste → review), not a dashboard with competing panels. `{spacing.gutter}` (20px) is the minimum side margin on every surface at every width; `{spacing.section-gap}` (48px) separates major page sections (for example, the match-score card, the keyword list, and the suggestion list). Internal component spacing follows the numeric scale (`{spacing.1}`–`{spacing.8}`).

Responsive behavior (breakpoint and navbar collapse) is specified behaviorally in `EXPERIENCE.md.Responsive & Platform`; this file only states the token values.

## Elevation & Depth

No drop shadows anywhere in the system — this matches the current working color-theme reference file (`.working/color-themes-4.html`), which, like its predecessors, uses zero `box-shadow` across every mock. Depth is communicated entirely through tonal layering (`{colors.background}` vs `{colors.surface}`) and `{colors.border}` hairlines. This keeps the surface flat and matte — restrained and evidence-first, now expressed in a warm beige palette rather than the earlier near-black one — without the soft plastic depth of a consumer app.

## Shapes

Two functional radii plus a pill: `{rounded.sm}` (6px) for buttons, inputs, chips, and the hamburger toggle; `{rounded.md}` (10px) for cards and the upload dropzone; `{rounded.lg}` (14px) reserved for the rare full-bleed container (for example, a modal or the mobile nav sheet). `{rounded.full}` is used only for the match-score badge — the one place a pill shape is earned, marking it as a distinct "verdict" object rather than another rectangle on the page.

## Components

Visual reference mocks for the three load-bearing surfaces: [Home](mockups/key-home.html), [Application result](mockups/key-application-result.html), [Mobile nav, collapsed](mockups/key-mobile-nav.html). These illustrate the tokens/components below; where a mock and this spine ever disagree, the spine wins.

- **Navbar** — `{colors.surface}` background, `{colors.border}` bottom hairline. Flat six items: Home, Application, Profile, History, Account, Logout. Home and Application render with `{components.nav-link-primary}` (bold, `{colors.text}`); the remaining four render with `{components.nav-link-secondary}` (`{colors.text-secondary}`, regular weight). Active item takes `{colors.accent}` regardless of primary/secondary weight class.
- **Persistent CTA** — [ASSUMPTION, see EXPERIENCE.md.Responsive & Platform for the reasoning] a `{components.button-primary}`-styled button that stays outside the hamburger on collapsed/mobile navbars, pointing at the Application flow. Compact by design: labeled "Create application" (shortened from Home's full "Create tailored application," which has room to spell it out) and sized down from `{components.button-primary}`'s default — `{typography.body-sm}` label, `{spacing.2}`/`{spacing.3}` padding — so it doesn't crowd the collapsed navbar next to the hamburger toggle.
- **Button, primary** — `{colors.accent}` fill, `{colors.accent-text}` label, `{rounded.sm}` corner. Used for the single primary action per screen (Home's "Create tailored application," a form's submit, a result page's "Download").
- **Button, secondary** — transparent fill, `{colors.border}` outline, `{colors.text}` label. Used for secondary actions (for example, "Cancel," "Upload a different file").
- **Button, review** — `{colors.accent-strong}` fill (a lighter brown than the primary accent), `{colors.accent-text}` label, `{rounded.sm}` corner. Used specifically for the standalone "Review CV" / "Review application" entry points on Home — visually actionable and on-brand, but a clear step down from the primary "Create tailored application" CTA so Home's hierarchy stays legible: one dominant action, two secondary-but-colored ones. Contrast note: `accent-strong` (#937A62) against `accent-text` (#FFF6EE) is ~3.8:1 — passes AA for large/bold UI text and component boundaries (3:1) but is under the 4.5:1 normal-text threshold; worth revisiting if this label's size or weight ever changes.
- **Card** — `{colors.surface}` fill, `{colors.border}` outline, `{rounded.md}` corner. The base container for the match-score panel, history rows, and profile sections.
- **Match-score badge** — `{components.match-score-badge-strong}` (success tokens) or `{components.match-score-badge-weak}` (warning tokens) depending on threshold [ASSUMPTION threshold not specified — see EXPERIENCE.md.Component Patterns]. Percentage set in `{typography.mono-score}`.
- **Keyword chip** — matched (`{components.keyword-chip-matched}`) or missing (`{components.keyword-chip-missing}`). Always paired with a ✓ / ✕ glyph, never color alone (accessibility requirement, see EXPERIENCE.md.Accessibility Floor).
- **Suggestion callout** — `{colors.accent-bg}` fill, `{colors.accent}` left rail, body text in `{colors.text}` with the load-bearing phrase in `{colors.accent-strong}`. This is where the gap-analysis reasoning is delivered — the product's core transparency moment, so it never collapses into a generic alert style.
- **Upload dropzone** — `{colors.surface}` fill, `{colors.border}` outline (dashed [ASSUMPTION, standard drop-target convention]), accepts PDF/DOC/TXT. Switches to `{colors.error}` outline on rejected file type/size.
- **Input field** — `{colors.surface}` fill, `{colors.border}` outline, `{colors.accent}` outline on focus, `{colors.error}` outline + inline message on validation failure.

## Do's and Don'ts

| Do | Don't |
|---|---|
| One accent color (`{colors.accent}`), used for actions and AI-authored insight only | Add a second chromatic brand color, or use accent decoratively |
| Reserve `{colors.success}` / `{colors.warning}` strictly for match-strength semantics | Reuse success/warning for generic form or toast states |
| Pair every keyword chip's color with a ✓/✕ glyph | Rely on color alone to distinguish matched vs. missing |
| Flat surfaces, border-based separation | Drop shadows, gradients, glassmorphism |
| Sharp, restrained corners (`{rounded.sm}`/`{rounded.md}`) | Soft consumer-app pill shapes outside the match-score badge |
| Bold only Home + Application in the navbar | Bold or accent-color every nav item equally |
| Monospace for the match-score number only | Monospace as a general UI font |
