---
title: JobAssistant
status: final
created: 2026-09-11
updated: 2026-11-08
sources:
  - ../../briefs/brief-JobAssistant-2026-09-11/brief.md
  - ../../briefs/brief-JobAssistant-2026-09-11/addendum.md
  - ../../prds/prd-JobAssistant-2026-10-31/prd.md
  - ../../prds/prd-JobAssistant-2026-10-31/addendum.md
name: JobAssistant
description: Norwegian web app that turns a student's CV and a pasted job ad into an explained keyword Match score, an honest gap analysis with rewording suggestions, and a draft application letter, showing its work instead of shipping a black-box draft.
colors:
  # Single light theme ("Warm Editorial" base, "Rich Mocha" accent); no dark
  # mode exists or is planned. Palette history: reconcile-color-themes-1.md.
  # 2026-11-08: text-secondary, accent, accent-strong and success darkened, and
  # warning-text and border-strong added, so every pair meets WCAG 2.2 AA
  # (PRD D16, NFR-2). Ratios are listed in ## Colors.
  background: '#F2E4CF'
  surface: '#FAF1E1'
  text: '#3A2A1D'
  text-secondary: '#745F49'
  border: '#E0CBA8'
  border-strong: '#9A7D5D'
  accent: '#795D41'
  accent-strong: '#826C57'
  accent-text: '#FFF6EE'
  accent-bg: '#795D411F'
  success: '#406735'
  success-bg: '#4067351A'
  success-border: '#40673540'
  # Goldenrod stays as the warning hue (tints, borders) so it reads as gold,
  # not a third brown; warning-text carries the text and glyphs at AA.
  warning: '#B8860B'
  warning-text: '#7A5907'
  warning-bg: '#B8860B1F'
  warning-border: '#B8860B45'
  error: '#A8341F'
  error-bg: '#A8341F1A'
  error-border: '#A8341F40'
  overlay: '#3A2A1D66'
typography:
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
  letter:
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.7'
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
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
  touch-target: 44px
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
    border: '{colors.border-strong}'
    radius: '{rounded.sm}'
  button-review:
    # Parked: «Vurder CV» / «Vurder søknad» are deferred out of v1 (PRD D2).
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
    foreground: '{colors.warning-text}'
    background: '{colors.warning-bg}'
    border: '{colors.warning-border}'
    radius: '{rounded.full}'
  keyword-chip-matched:
    foreground: '{colors.success}'
    background: '{colors.success-bg}'
    border: '{colors.success-border}'
    radius: '{rounded.sm}'
  keyword-chip-missing:
    foreground: '{colors.warning-text}'
    background: '{colors.warning-bg}'
    border: '{colors.warning-border}'
    radius: '{rounded.sm}'
  evidence-excerpt:
    foreground: '{colors.text}'
    border-left: '{colors.border-strong}'
    typography: '{typography.body-sm}'
  suggestion-callout:
    background: '{colors.accent-bg}'
    border-left: '{colors.accent}'
    emphasis-color: '{colors.accent}'
    radius: '{rounded.sm}'
  gap-callout-real:
    background: '{colors.surface}'
    border: '{colors.border}'
    border-left: '{colors.warning}'
    label-color: '{colors.warning-text}'
    radius: '{rounded.sm}'
  ai-label:
    foreground: '{colors.text-secondary}'
    typography: '{typography.label}'
  letter-view:
    background: '{colors.surface}'
    border: '{colors.border}'
    foreground: '{colors.text}'
    typography: '{typography.letter}'
    radius: '{rounded.md}'
  letter-flag:
    background: '{colors.warning-bg}'
    underline: '{colors.warning-text}'
  tone-option:
    background: '{colors.surface}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
  tone-option-selected:
    background: '{colors.accent-bg}'
    border: '{colors.accent}'
    radius: '{rounded.md}'
  info-banner:
    background: '{colors.surface}'
    border: '{colors.border-strong}'
    foreground: '{colors.text}'
    radius: '{rounded.sm}'
  dialog:
    background: '{colors.surface}'
    backdrop: '{colors.overlay}'
    radius: '{rounded.lg}'
  upload-dropzone:
    background: '{colors.surface}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
  input-field:
    background: '{colors.surface}'
    border: '{colors.border-strong}'
    foreground: '{colors.text}'
    radius: '{rounded.sm}'
  hamburger-toggle:
    border: '{colors.border-strong}'
    icon-color: '{colors.text}'
    radius: '{rounded.sm}'
---

## Brand & Style

JobAssistant reads as a warm, editorial product with something real to say, not a slick resume factory. Its premise is transparency: showing a student exactly why their CV matches a job ad the way it does, and never inventing what isn't there. The visual language carries that through a grounded, human register: a warm beige and cream base, warm dark-brown text, and one Rich Mocha brown accent used with intent rather than a wash of competing colour.

Nothing should feel playful, templated or generic. The user rejected Kickresume's colourful consumer register and disliked Teal's UI; what's kept from Kickresume is structural: the start action at the front of the page. The surface doesn't need to look stark or clinical to earn trust; the substance (formula, Evidence, honest gaps) does that. JobAssistant is a single theme; there is no mode toggle and no dark variant. A plain system sans carries everything, with a monospace accent reserved for the one number that matters most, and corners stay restrained rather than soft and pill-shaped.

## Colors

One accent, two semantic signal colours, one error colour, and warm neutrals otherwise. Restraint is the point: the Match score, keyword chips and gap labels are where colour does real work, and they need to stand out against a quiet, warm base. Every text pair below meets WCAG 2.2 AA at 4.5:1 and every control outline meets 3:1 (PRD NFR-2, D16; computed with the WCAG relative-luminance formula on 2026-11-08, tints composited over their base).

- **Background (`{colors.background}`, #F2E4CF)** — warm sand, the canvas for every page. Depth comes from `{colors.surface}`, not from background variation.
- **Surface (`{colors.surface}`, #FAF1E1)** — lighter cream for cards, the navbar, inputs, the dropzone, the Letter view and dialogs.
- **Text (`{colors.text}`, #3A2A1D)** — 11.0:1 on background, 12.3:1 on surface.
- **Text Secondary (`{colors.text-secondary}`, #745F49)** — metadata, captions, the AI-written marker, inactive nav items. 4.8:1 on background, 5.4:1 on surface. Never used for anything the user must act on.
- **Border (`{colors.border}`, #E0CBA8)** — decorative hairlines only: card outlines, dividers, the navbar edge. It doesn't identify a control, so it is exempt from the 3:1 rule.
- **Border Strong (`{colors.border-strong}`, #9A7D5D)** — outlines that identify a control: inputs, textareas, the dropzone, secondary buttons, Tone options, the hamburger toggle, the info banner. 3.1:1 on background, 3.4:1 on surface.
- **Accent (`{colors.accent}`, #795D41)** — primary buttons, the persistent CTA, the active nav item, links, focus rings, the suggestion-callout rail and its emphasised phrase, the selected Tone option. 4.8:1 on background, 5.4:1 on surface; `{colors.accent-text}` (#FFF6EE) on an accent fill is 5.7:1.
- **Accent Background (`{colors.accent-bg}`)** — the accent at 12 % opacity, for suggestion callouts and the selected Tone option. Accent and text-secondary on it reach 4.6:1 **only over `{colors.surface}`**, so accent-tinted blocks always sit inside a surface card, never directly on the background.
- **Accent Strong (`{colors.accent-strong}`, #826C57)** — parked with `{components.button-review}` for the deferred review features; 4.65:1 under accent-text. Not used elsewhere.
- **Success (`{colors.success}`, #406735)** — means one thing: a matched keyword or a Strong match. 5.1:1 on its tint over surface, 4.6:1 over background. Never a generic "good" colour.
- **Warning (`{colors.warning}`, #B8860B / `{colors.warning-text}`, #7A5907)** — means one thing: something the CV doesn't support. That covers a Needs work Verdict, a Missing keyword, a Real gap, and a word flagged in the Letter (PRD FR-11). The goldenrod is the hue for tints, borders and the Real-gap rail, keeping it visibly gold and apart from the brown accent; all text and glyphs use warning-text (5.1:1 on its tint over surface, 4.6:1 over background). Never used for system errors.
- **Error (`{colors.error}`, #A8341F)** — system and input failures only: rejected upload, no text in a PDF, length limits, form validation, a failed or timed-out AI request. 5.3:1 on background, 5.9:1 on surface. A clear red, so "your CV is missing this keyword" never reads as "something broke".
- **Overlay (`{colors.overlay}`)** — text colour at 40 % opacity, the dialog backdrop only.

Neutral notices (Test mode, Daily cap, "not available in Test mode") use `{components.info-banner}`: surface, border-strong and text, with no signal colour, because they are neither failures nor match semantics.

Avoid: any additional chromatic colour, gradients, coloured surface fills beyond the tints above, and decorative accent use where it doesn't mark an action or an AI-authored insight.

## Typography

One shared system-sans family (`{typography.display.fontFamily}`) carries every role except `mono-score`. The ramp is deliberately shallow; this is a utility interface.

- `{typography.display}` — one page-level moment per page at most (for example «Velkommen tilbake, Violet» on Hjem, the job title on a result).
- `{typography.heading-lg}` / `{typography.heading-md}` — page titles and card or section headings.
- `{typography.body}` / `{typography.body-sm}` — main copy and secondary copy (Evidence excerpts, helper text, counters).
- `{typography.label}` — uppercase, tracked labels for card headers («ATS-SAMSVAR»), form labels, gap labels and the «Skrevet med KI» marker.
- `{typography.mono-score}` — monospace, used only for the score percentage: it reads as a measurement, not a marketing number.
- `{typography.letter}` — the Letter body: same family, slightly larger with looser leading, so a one-page Letter reads as a document rather than UI copy.

No serif, no display-weight body text, no italics as a primary device.

The UI is Norwegian (bokmål; label glossary in `EXPERIENCE.md.Language`). Every font in the stack renders æ, ø and å. Norwegian compounds run long («Stillingsannonse», «Arbeidsgiver»), so buttons, chips and labels size to their content and may wrap rather than truncate; never give a text-bearing component a fixed width. The score is written with a space before the percent sign («71 %»).

## Layout & Spacing

Single-column layouts throughout: JobAssistant is a workflow (input → score → gaps → Letter), not a dashboard. Content width tops out at 760 px. `{spacing.gutter}` (20 px) is the minimum side margin at every width, down to 360 px; `{spacing.section-gap}` (48 px) separates major result sections (Score panel, keyword lists, «Det som mangler», «Søknadsbrev»). Internal spacing follows the numeric scale.

Every interactive element has a hit area of at least `{spacing.touch-target}` (44 × 44 px), including chips that expand, «Kopier» buttons and pagination links (PRD NFR-2). Where the visible element is smaller, padding makes up the difference.

Breakpoint and navbar collapse behaviour live in `EXPERIENCE.md.Responsive & Platform`.

## Elevation & Depth

No drop shadows anywhere. Depth comes from tonal layering (`{colors.background}` vs `{colors.surface}`) and border hairlines. The one exception is the dialog, which separates from the page with `{colors.overlay}` behind it, still without a shadow. The surface stays flat and matte.

## Shapes

`{rounded.sm}` (6 px) for buttons, inputs, chips, callouts, banners and the hamburger toggle; `{rounded.md}` (10 px) for cards, the dropzone, the Letter view and Tone options; `{rounded.lg}` (14 px) for dialogs and the mobile nav sheet. `{rounded.full}` is used only for the score badge, the one place a pill shape is earned, marking it as a verdict rather than another rectangle.

## Components

Visual reference mocks: [Home](mockups/key-home.html), [Application form](mockups/key-application-form.html), [Application result](mockups/key-application-result.html), [Mobile nav](mockups/key-mobile-nav.html). Where a mock and this spine disagree, the spine wins. Behaviour for every component is in `EXPERIENCE.md.Component Patterns`.

**Navigation and actions**
- **Navbar** — `{colors.surface}`, `{colors.border}` bottom hairline. Two items before accounts exist (Hjem, Søknad, both `{components.nav-link-primary}`); six after (Hjem and Søknad primary; Profil, Historikk, Konto, Logg ut `{components.nav-link-secondary}`). The active item takes `{colors.accent}`.
- **Persistent CTA** — compact `{components.button-primary}` on the collapsed six-item navbar: «Lag søknad», `{typography.body-sm}` label, `{spacing.2}`/`{spacing.3}` padding, with the hit area kept at 44 px.
- **Button, primary** — accent fill, accent-text label. One per screen: Hjem's «Lag skreddersydd søknad», Søknad's «Lag søknad», a form's submit, the dialog's «Jeg forstår, fortsett».
- **Button, secondary** — transparent, `{colors.border-strong}` outline, text label. «Kopier», «Last ned (.docx)», «Lag nytt utkast», «Bruk eksempelet», «Avbryt», «Prøv igjen».
- **Button, review** — parked for the deferred «Vurder CV» and «Vurder søknad» (PRD D2). Not rendered in v1.

**Input**
- **Input field and textarea** — surface fill, `{colors.border-strong}` outline, `{colors.accent}` 2 px outline on focus, `{colors.error}` outline plus inline message on error. Counters in `{typography.body-sm}`, text-secondary.
- **Upload dropzone** — surface fill, dashed `{colors.border-strong}` outline, `{colors.accent}` outline while a file is dragged over it, `{colors.error}` outline on rejection.
- **Tone option** — a radio card: surface fill, `{colors.border-strong}` outline, name in `{typography.heading-md}` and the description in `{typography.body-sm}`. Selected (`{components.tone-option-selected}`): `{colors.accent-bg}` fill, 2 px `{colors.accent}` outline and a filled radio dot, so selection shows in shape as well as colour. Three in a row from 641 px; stacked below.
- **Dialog** — the AI notice: surface panel, `{rounded.lg}`, max 520 px wide, over `{colors.overlay}`. Title in `{typography.heading-lg}`, body in `{typography.body}`, buttons right-aligned (stacked full-width on phones).

**Results**
- **Card** — surface, `{colors.border}` outline, `{rounded.md}`. Holds the Score panel, keyword lists, the Gap section, History rows and Profil sections.
- **Score badge** — `{components.match-score-badge-strong}` or `{components.match-score-badge-weak}` by Verdict (threshold 70, PRD FR-7). Contents: percentage in `{typography.mono-score}`, a thin divider, then the Verdict text in `{typography.body-sm}` bold («71 % · Sterkt samsvar»). The same badge, at the same contrast, is used in History rows.
- **Keyword chip** — matched (`{components.keyword-chip-matched}`, ✓) or missing (`{components.keyword-chip-missing}`, ✕). Always glyph plus colour.
- **Evidence excerpt** — `{typography.body-sm}` in text colour, 2 px `{colors.border-strong}` left rule, a short label above it in text-secondary («Funnet i CV-en», «Fra annonsen», «Fra CV-en din»), the quoted text in «sjevroner», the Keyword in bold.
- **Suggestion callout (Rewordable gap)** — `{colors.accent-bg}` fill, 3 px `{colors.accent}` left rail, body in text colour, the load-bearing phrase in accent semibold. Label «KAN OMFORMULERES» in `{typography.label}`, accent. The suggested phrasing sits in its own inset block (surface fill, `{colors.border}` outline) with «Kopier» beside it. Always placed inside a surface card (contrast rule in Colors).
- **Real-gap callout** — `{components.gap-callout-real}`: surface fill, `{colors.border}` outline, 3 px `{colors.warning}` left rail, label «MANGLER I CV-EN» in warning-text with ✕. Never accent-tinted, so a Real gap can't be mistaken for something to act on.
- **AI label** — «Skrevet med KI», `{typography.label}` in text-secondary, beside the heading of every AI-written section.
- **Letter view** — `{components.letter-view}`: surface, `{colors.border}` outline, `{rounded.md}`, `{spacing.7}` padding (`{spacing.5}` on phones), body in `{typography.letter}`. The AI-draft label sits above it in `{typography.body-sm}` text-secondary; the action buttons sit below it.
- **Letter flag** — a flagged word in the Letter: `{colors.warning-bg}` tint plus a 2 px `{colors.warning-text}` underline. The warning list above the Letter uses warning-text with ✕ glyphs.
- **Info banner** — `{components.info-banner}`: surface, `{colors.border-strong}` outline, text colour, an ⓘ glyph. Used for the Test-mode banner (full width, square ends, under the navbar), the Daily-cap message and "not available in Test mode".
- **Error message** — inline `{colors.error}` text with an ✕ glyph; as a block (partial result, server failure), `{colors.error-bg}` fill with an `{colors.error-border}` outline.

## Do's and Don'ts

| Do | Don't |
|---|---|
| One accent (`{colors.accent}`) for actions and AI-authored insight only | Add a second brand colour, or use accent decoratively |
| Reserve success and warning for match semantics (matched / unsupported) | Reuse success or warning for generic form or toast states |
| Use warning-text for any warning text or glyph | Set text in the bright goldenrod `{colors.warning}` |
| Outline controls with `{colors.border-strong}` | Outline inputs or buttons with the decorative `{colors.border}` |
| Put accent-tinted callouts inside surface cards | Place accent-tinted blocks directly on the background |
| Pair every chip, badge and flag with a glyph or text | Rely on colour alone |
| Neutral info banner for Test mode and limits | Error red for things that aren't failures |
| Flat surfaces, border-based separation | Drop shadows, gradients, glassmorphism |
| Restrained corners (`{rounded.sm}` / `{rounded.md}`) | Pill shapes anywhere but the score badge |
| Monospace for the score number only | Monospace as a general UI font |
