---
name: JobAssistant
status: final
updated: 2026-11-10
description: 'Signal, varm: a catalogue-sleeve interface on espresso, walnut and smoked-oak grounds with parchment ink. Each Application is a numbered catalogue entry, the job ad is drawn as a stacked pulse plot, and four warm code colours always come with a text label. One dark theme, square corners, no component library (Tailwind v4 @theme tokens).'
colors:
  # Grounds, darkest to lightest
  board: '#140e0a'
  ground: '#1c140f'
  field: '#150f0b'
  hover: '#221810'
  lift: '#2a1e16'
  lift-2: '#33251b'
  alert-ground: '#2a1912'
  # Ink and lines
  ink: '#f2e8d5'
  ink-2: '#c4ae91'
  placeholder: '#a8937a'
  edge: '#a38c70'
  edge-hover: '#cdb796'
  rule: '#4a372a'
  mute: '#76604c'
  plot-flat: '#5c4636'
  # Code family: never shown without a text label
  moss: '#a3bd6a'
  rust: '#e0784f'
  amber: '#ecab3f'
  sand: '#d8c29b'
  # States
  button-primary-hover: '#fff6e6'
  disabled-ink: '#8f7a63'
  disabled-edge: '#4d3b2d'
  scrim: '#0e0906'
typography:
  display:
    fontFamily: Schibsted Grotesk
    fontSize: 56px
    fontWeight: '600'
    lineHeight: '1.02'
    letterSpacing: -0.035em
  display-mobile:
    fontFamily: Schibsted Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.05'
    letterSpacing: -0.03em
  catalogue:
    fontFamily: Schibsted Grotesk
    fontSize: 60px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.02em
  catalogue-auth:
    fontFamily: Schibsted Grotesk
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.02em
  catalogue-mobile:
    fontFamily: Schibsted Grotesk
    fontSize: 36px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.02em
  catalogue-employer-mobile:
    fontFamily: Schibsted Grotesk
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.025em
  catalogue-number:
    fontFamily: DM Mono
    fontWeight: '500'
    letterSpacing: -0.04em
    note: 'Inherits size from catalogue / catalogue-auth / catalogue-mobile'
  title:
    fontFamily: Schibsted Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.08'
    letterSpacing: -0.025em
  title-mobile:
    fontFamily: Schibsted Grotesk
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.025em
  score:
    fontFamily: Schibsted Grotesk
    fontSize: 44px
    fontWeight: '500'
    lineHeight: '1.05'
    letterSpacing: -0.03em
  score-mobile:
    fontFamily: Schibsted Grotesk
    fontSize: 30px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  statement:
    fontFamily: Schibsted Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.025em
  dialog-title:
    fontFamily: Schibsted Grotesk
    fontSize: 24px
    fontWeight: '650'
    lineHeight: '1.2'
    letterSpacing: -0.015em
  heading:
    fontFamily: Schibsted Grotesk
    fontSize: 22px
    fontWeight: '650'
    lineHeight: '1.2'
    letterSpacing: -0.012em
  subheading:
    fontFamily: Schibsted Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  keyword:
    fontFamily: Schibsted Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.35'
  lede:
    fontFamily: Schibsted Grotesk
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.55'
  body:
    fontFamily: Schibsted Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.55'
  letter:
    fontFamily: Schibsted Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.7'
  quote:
    fontFamily: Schibsted Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  label:
    fontFamily: Schibsted Grotesk
    fontSize: 15px
    fontWeight: '600'
    lineHeight: '1.4'
  button:
    fontFamily: Schibsted Grotesk
    fontSize: 15px
    fontWeight: '600'
    lineHeight: '1.1'
  button-sm:
    fontFamily: Schibsted Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.1'
  nav:
    fontFamily: Schibsted Grotesk
    fontSize: 15px
    fontWeight: '500'
    lineHeight: '1.2'
  nav-mobile:
    fontFamily: Schibsted Grotesk
    fontSize: 17px
    fontWeight: '500'
    lineHeight: '1.2'
  hint:
    fontFamily: Schibsted Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.45'
  caps:
    fontFamily: Archivo
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.16em
    note: 'font-size 0.75rem; font-stretch 125%; text-transform uppercase; data labels only'
  code:
    fontFamily: Archivo
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: 0.13em
    note: 'font-size 0.75rem; font-stretch 125%; text-transform uppercase; code strips only'
  wordmark:
    fontFamily: Archivo
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.26em
    note: 'font-stretch 125%; text-transform uppercase'
  mono-formula:
    fontFamily: DM Mono
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.5'
  mono-cv:
    fontFamily: DM Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.75'
  mono-meta:
    fontFamily: DM Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  register-number:
    fontFamily: DM Mono
    fontSize: 26px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.03em
  register-number-mobile:
    fontFamily: DM Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.2'
  ghost-number:
    fontFamily: DM Mono
    fontSize: 80px
    fontWeight: '400'
    lineHeight: '1'
    letterSpacing: -0.04em
  plot-label:
    fontFamily: Schibsted Grotesk
    fontSize: 12.5px
    fontWeight: '600'
    note: '12px in compact mode; shrinks to fit the label column'
  plot-state:
    fontFamily: Archivo
    fontSize: 10px
    fontWeight: '700'
    letterSpacing: 0.14em
    note: 'font-stretch 125%; uppercase; 10px minimum, also in compact mode'
  plot-index:
    fontFamily: DM Mono
    fontSize: 10px
    fontWeight: '400'
rounded:
  none: 0px
  DEFAULT: 0px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 40px
  '9': 48px
  '10': 56px
  '11': 64px
  '12': 72px
  page-x: 48px
  page-x-mobile: 16px
  page-top: 44px
  page-top-mobile: 28px
  page-bottom: 72px
  page-bottom-mobile: 48px
  section: 64px
  section-mobile: 44px
  column-gap: 56px
  column-gap-mobile: 32px
  touch-target: 44px
  control-height: 48px
  appbar-height: 64px
  appbar-height-mobile: 60px
  measure: 62ch
  letter-measure: 72ch
  content-max: 1256px
components:
  app-bar:
    background: '{colors.ground}'
    border-bottom: '1px solid {colors.rule}'
    min-height: '{spacing.appbar-height}'
    min-height-mobile: '{spacing.appbar-height-mobile}'
    padding-x: '{spacing.page-x}'
    wordmark: '{typography.wordmark}'
    wordmark-icon: '{colors.amber}'
    position: 'static; scrolls with the page, never sticky or fixed'
  nav-link:
    foreground: '{colors.ink-2}'
    foreground-hover: '{colors.ink}'
    typography: '{typography.nav}'
    min-height: '{spacing.touch-target}'
    padding-x: 14px
  nav-link-active:
    foreground: '{colors.ink}'
    indicator: 'inset 0 -2px 0 {colors.amber}'
    indicator-mobile: 'inset 3px 0 0 {colors.amber}'
    background-mobile: '{colors.lift}'
  nav-toggle:
    base: '{components.button-small}'
    labels: 'Meny / Lukk'
  link:
    foreground: '{colors.ink}'
    underline: '1px solid {colors.edge}, offset 4px'
    underline-hover: '{colors.amber}'
    visited: 'same as link'
    min-height-standalone: 24px
  button-primary:
    background: '{colors.ink}'
    foreground: '{colors.ground}'
    border: '1px solid {colors.ink}'
    background-hover: '{colors.button-primary-hover}'
    background-active: '{colors.sand}'
    radius: '{rounded.none}'
    min-height: '{spacing.control-height}'
    padding-x: 20px
    typography: '{typography.button}'
  button-secondary:
    background: transparent
    foreground: '{colors.ink}'
    border: '1px solid {colors.edge}'
    border-hover: '{colors.ink}'
    background-hover: '{colors.lift}'
    background-active: '{colors.lift-2}'
    radius: '{rounded.none}'
    min-height: '{spacing.control-height}'
    padding-x: 20px
    typography: '{typography.button}'
  button-small:
    min-height: '{spacing.touch-target}'
    padding-x: 14px
    typography: '{typography.button-sm}'
  button-disabled:
    foreground: '{colors.disabled-ink}'
    border: '1px solid {colors.disabled-edge}'
    background: transparent
  button-busy:
    colors: 'unchanged from the button variant'
    glyph: '18px progress glyph left of the label; static under reduced motion'
    cursor: progress
  copy-button:
    base: '{components.button-secondary}'
    icon: 'copy, 18px, 1.6 stroke, square caps'
    label-success: 'Kopiert'
  text-field:
    background: '{colors.field}'
    foreground: '{colors.ink}'
    placeholder: '{colors.placeholder}'
    border: '1px solid {colors.edge}'
    border-hover: '{colors.edge-hover}'
    border-focus: '{colors.ink}'
    outline-focus: '{components.focus-ring}'
    border-error: '{colors.rust}'
    error-message: '{colors.ink} in {typography.hint}, after a {components.code-missing} «Feil» strip, directly under the field'
    radius: '{rounded.none}'
    min-height: '{spacing.control-height}'
    padding: '12px 14px'
    typography: '{typography.body}'
  text-field-cv:
    base: '{components.text-field}'
    typography: '{typography.mono-cv}'
  password-toggle:
    base: '{components.button-small}'
    labels: 'Vis / Skjul'
    placement: 'right of the field, outside the field well'
  file-picker:
    border: '1px solid {colors.edge}'
    border-error: '1px solid {colors.rust}'
    padding: 18px
    filename: '{typography.mono-meta}'
    label: '{components.button-secondary}'
    focus: '{components.focus-ring} drawn on the label while the hidden input has :focus-visible'
  cv-disclosure:
    border: '1px solid {colors.edge}'
    summary-min-height: 56px
    background-hover: '{colors.hover}'
    chevron: '{colors.amber}'
    meta: '{typography.mono-meta}'
  tone-choice:
    border: '1px solid {colors.edge}'
    option-min-height: 56px
    option-padding: '14px 16px'
    option-background-hover: '{colors.hover}'
    option-background-selected: '{colors.lift}'
    option-indicator-selected: 'inset 0 -3px 0 {colors.amber}'
    option-focus: '{components.focus-ring} with offset -2px (inset), on the whole option'
    radio: '20px square, 1px {colors.edge}, fill {colors.field}; checked: border {colors.ink}, 10px {colors.amber} square'
  code-strip:
    foreground: '{colors.ground}'
    typography: '{typography.code}'
    padding: '5px 9px 4px'
    radius: '{rounded.none}'
  code-found:
    background: '{colors.moss}'
    labels: 'Funnet · Sterkt samsvar'
  code-missing:
    background: '{colors.rust}'
    labels: 'Mangler · Reelt gap · Feil'
  code-rewordable:
    background: '{colors.amber}'
    labels: 'Omformulerbart gap'
  code-ai:
    background: '{colors.sand}'
    labels: 'Skrevet med KI · Testmodus'
  code-outline:
    background: transparent
    foreground: '{colors.ink}'
    border: 'inset 0 0 0 1px {colors.edge}'
    labels: 'Regnet ut av kode · Skrives · Bør forbedres'
  catalogue-heading:
    typography: '{typography.catalogue}'
    number: '{typography.catalogue-number}'
    separator: '{colors.mute}'
    number-dim: '{colors.ink-2}'
  credits-list:
    term: '{typography.caps}'
    term-color: '{colors.ink-2}'
    value: '{typography.body}'
    gap: '12px 40px'
  pulse-plot:
    line: '{colors.ink}'
    line-flat: '{colors.plot-flat}'
    occluder: '{colors.ground}'
    stroke-neutral: 1.15px
    stroke-matched: 2.8px
    stroke-matched-compact: 2.4px
    stroke-missing: 1.5px
    dash-missing: '3.5 3'
    dash-missing-compact: '3 2.5'
    marker-matched: '{colors.moss}'
    marker-missing: '{colors.rust}'
    marker-size: 9px
    label: '{typography.plot-label}'
    label-color: '{colors.ink}'
    state: '{typography.plot-state}'
    state-color: '{colors.ink}'
    index: '{typography.plot-index}'
    index-color: '{colors.ink-2}'
    label-plate: '{colors.ground} at 0.94 opacity'
    leader-compact: '1px {colors.ink-2}, dash 1 2.5'
  plot-legend:
    typography: '{typography.hint}'
    foreground: '{colors.ink-2}'
  score-block:
    score: '{typography.score}'
    score-mobile: '{typography.score-mobile}'
    formula: '{typography.mono-formula}'
    disclaimer-color: '{colors.ink-2}'
    divider: '1px solid {colors.rule}'
  keyword-entry:
    divider: '1px solid {colors.rule}'
    name: '{typography.keyword}'
    source-line: '{typography.mono-meta}'
  evidence-quote:
    typography: '{typography.quote}'
    foreground: '{colors.ink}'
    highlight: '700 weight, underline 2px {colors.amber}, offset 4px'
    measure: '{spacing.measure}'
  gap-entry:
    divider: '1px solid {colors.rule}'
    title: '{typography.subheading}'
  suggestion-box:
    background: '{colors.lift}'
    border: '1px solid {colors.edge}'
    header-divider: '1px solid {colors.rule}'
    header-label: '{typography.caps}'
  no-copy-note:
    border: '1px dashed {colors.edge}'
    foreground: '{colors.ink-2}'
    padding: '14px 16px'
  letter-view:
    background: '{colors.lift}'
    border: '1px solid {colors.rule}'
    padding: '36px 40px'
    padding-mobile: '20px 18px'
    typography: '{typography.letter}'
    measure: '{spacing.letter-measure}'
  letter-flag:
    highlight: 'underline 2px dashed {colors.rust}, offset 4px'
    warning-border: '1px solid {colors.rust}'
    warning-background: '{colors.alert-ground}'
  progress-line:
    border: '1px solid {colors.edge}'
    padding: '18px 20px'
    trace: '{colors.amber}, 1.8px'
    baseline: '{colors.ink-2}, 1px'
  ai-placeholder:
    rule-lines: '1px {colors.rule} every 22px'
    title-color: '{colors.ink-2}'
    status: '{components.code-outline}'
  alert:
    border: '1px solid {colors.rust}'
    background: '{colors.alert-ground}'
    foreground: '{colors.ink}'
    padding: 16px
  notice:
    border: '1px solid {colors.edge}'
    background: '{colors.ground}'
    foreground: '{colors.ink}'
    padding: '14px 16px'
    label: '{components.code-outline}'
  banner:
    background: '{colors.lift}'
    border-bottom: '1px solid {colors.rule}'
    padding: '12px {spacing.page-x}'
  dialog:
    background: '{colors.ground}'
    border: '1px solid {colors.ink}'
    padding: 32px
    max-width: 560px
    shadow: '0 24px 64px rgba(0,0,0,.6)'
    scrim: '{colors.scrim} at 0.66 opacity'
    title: '{typography.dialog-title}'
  expiry-warning:
    base: '{components.dialog}'
    buttons: '{components.button-primary} «Fortsett økten», then {components.button-secondary} «Logg ut»'
  catalogue-register:
    header: '{typography.caps}'
    header-divider: '1px solid {colors.edge}'
    row-divider: '1px solid {colors.rule}'
    number: '{typography.register-number}'
    number-mobile: '{typography.register-number-mobile}'
    row-background-hover: '{colors.hover}'
  empty-state:
    ghost: '{typography.ghost-number}'
    ghost-stroke: '1px {colors.edge}, transparent fill'
  focus-ring:
    outline: '2px solid {colors.amber}'
    offset: 2px
    offset-tone-option: -2px
    gap: '{colors.ground}'
  selection:
    background: '{colors.amber}'
    foreground: '{colors.ground}'
---

## Brand & Style

JobAssistant helps a Norwegian student see which of a job ad's words their CV already covers, and say what they have done in the employer's words without inventing anything. The visual direction, **Signal, varm** (concept 11), treats that work like a record label's catalogue. Each Application is an entry with a catalogue number (`JA-002 · Nordic Digital`). The job ad is drawn as a stacked pulse plot, one line per paragraph, and every Keyword makes the line jump. Historikk is the catalogue register. The grammar comes from concept 10 «Signal». Concept 11 moves it into a warm room: espresso, dark walnut and smoked oak instead of matt black, with lines drawn in parchment.

The posture is evidence, not encouragement. Numbers and quotes carry the screen. The display type stays sober, and decoration is limited to what can be measured: the plot, the formula and the quoted CV line. The product's stance, «Viser arbeidet. Finner aldri på.», shows up as visible formulas, quotes set in sjevroner and an explicit «Ingen tekst å kopiere» where the app refuses to write.

**Brand voice** (binding, PRODUCT.md and PRD P5 / NFR-1): plain, warm bokmål that says «du», states the fact first, hedges what the Student must judge («dekker trolig dette – vurder å ta det med») and never cheers. Norwegian conventions: «71 %», «8. nov. 2026», «sjevroner». The microcopy rules live in EXPERIENCE.md, Voice and Tone.

**One theme.** The interface has a single dark theme with `color-scheme: dark`. There is no light variant, no toggle and no `prefers-color-scheme` switch (PRD §10, «no theme switching», amended 2026-11-09). Why dark brown, in Helene's words: «Dark brown is softer to look at and more inviting than pure black/white, but still looks professional.»

Visual reference: [signal-varm.html](mockups/signal-varm.html). DESIGN.md and EXPERIENCE.md win on any conflict with the mock.

## Colors

The palette has three layers: grounds, ink and lines, and a code family. Every value below is lifted from the mock.

**Grounds:**
- **Board (`#140e0a`)** is the outermost canvas: the `html` background beyond the content column and the scrollbar track. The mock's 6 % noise grain belongs to the sketch board and does not ship.
- **Ground (`#1c140f`)** is the app surface: app bar, pages, dialog, and the occluder fill that lets lower pulse lines hide upper ones.
- **Field (`#150f0b`)** sits below ground and is used only inside text fields and the tone-choice radio, so input wells read as recessed.
- **Hover (`#221810`)** is the hover wash on table rows, disclosure summaries and tone options.
- **Lift (`#2a1e16`)** and **Lift 2 (`#33251b`)** are raised surfaces. Lift holds the letter view, the suggestion box, the banner, the selected tone option and the active mobile nav row. Lift 2 is the pressed state of secondary buttons only.
- **Alert ground (`#2a1912`)** is the rust-tinted well behind error alerts and letter warnings.

**Ink and lines:**
- **Ink (`#f2e8d5`)**, parchment, is all primary text, the pulse lines and the primary-button fill.
- **Ink 2 (`#c4ae91`)** is secondary text: hints, ledes, credits terms, plot indices, counters, the disclaimer.
- **Placeholder (`#a8937a`)** is used only for placeholder text inside fields.
- **Edge (`#a38c70`)** is the boundary of every control: buttons, text fields, file picker, CV disclosure, tone choice, plus the suggestion box and notice outlines. It is the only line colour allowed to identify a control.
- **Edge hover (`#cdb796`)** is the hover state of text-field borders.
- **Rule (`#4a372a`)** is the divider between rows and sections. It is decorative (1.62:1) and must never be the only boundary of a control.
- **Mute (`#76604c`)** is the `·` separator in catalogue headings and the scrollbar thumb. It is never used for text a reader needs (3.07:1).
- **Plot flat (`#5c4636`)** draws the flat, unanalysed plot on the Søknad form and in the empty Historikk.

**Code family.** Four warm colours mark the state of a Keyword, Gap, verdict or text. A code colour never appears without its text label. In a code strip, the label is the strip's own text; in the pulse plot, the square marker sits next to the Keyword and its state word.

| Token | Hex | Meaning (label always shown) | Also used for |
|---|---|---|---|
| `{colors.moss}` | `#a3bd6a` | **Funnet** (Matched keyword) | Verdict **Sterkt samsvar** |
| `{colors.rust}` | `#e0784f` | **Mangler** (Missing keyword) | **Reelt gap**; error alerts («Feil»); letter-flag highlight |
| `{colors.amber}` | `#ecab3f` | **Omformulerbart** (Rewordable gap) | Focus ring; active-nav and selected-tone indicator; Evidence underline; link hover underline; progress trace; caret; text selection |
| `{colors.sand}` | `#d8c29b` | **Skrevet med KI** (AI-written text) | **Testmodus** label |

Amber does two jobs. As a filled strip it is a code, and only for «Omformulerbart gap». As a thin line it is the interaction accent (focus, current page, selection). The two never meet in one element. The verdict «Bør forbedres» uses the neutral outline strip so it reads as a plain fact, not as a hint that rewording will fix it (decided 2026-11-09).

**Measured contrast** (WCAG 2.x relative luminance, computed 2026-11-09). The label plate is `{colors.ground}` at 0.94 over ink (`#29211b`).

*Text, floor 4.5:1 (all pass):*

| Pair | Ratio | Use |
|---|---|---|
| ink on ground | 14.94:1 | body text |
| ink on lift | 13.34:1 | letter, suggestion text |
| ink on lift-2 | 12.16:1 | pressed secondary button |
| ink on field | 15.64:1 | typed text |
| ink on alert-ground | 13.86:1 | error message |
| ink on hover | 14.33:1 | row text on hover |
| ink on label plate (`#29211b`) | 13.01:1 | plot labels and state words |
| ink-2 on ground | 8.48:1 | hints, disclaimer, credits |
| ink-2 on lift | 7.57:1 | secondary text on raised surfaces |
| ink-2 on lift-2 | 6.90:1 | hint inside a pressed surface |
| ink-2 on hover | 8.13:1 | employer line on a hovered row |
| ink-2 on label plate | 7.39:1 | plot indices / leaders |
| placeholder on field | 6.44:1 | placeholder |
| placeholder on ground | 6.16:1 | if a placeholder ever shows outside a field well |
| ground on ink | 14.94:1 | primary-button label |
| ground on button-primary-hover | 16.93:1 | primary-button hover label |
| ground on moss | 8.69:1 | «Funnet» strip |
| ground on rust | 6.03:1 | «Mangler» / «Reelt gap» strip |
| ground on amber | 9.05:1 | «Omformulerbart gap» strip; `::selection` text (`{components.selection}`) |
| ground on sand | 10.47:1 | «Skrevet med KI» strip; primary button, pressed |

*Non-text, floor 3.0:1 (all pass):*

| Pair | Ratio | Use |
|---|---|---|
| edge on ground | 5.66:1 | control boundary |
| edge on field | 5.92:1 | text-field border |
| edge on lift | 5.05:1 | small «Kopier» in the suggestion box; buttons in the banner |
| edge on lift-2 | 4.60:1 | pressed secondary button |
| edge on hover | 5.42:1 | row buttons on a hovered row |
| edge on alert-ground | 5.25:1 | «Prøv igjen» inside an alert |
| edge-hover on field | 9.78:1 | hovered field border |
| amber on ground | 9.05:1 | focus ring, active indicator |
| amber on lift / hover / alert-ground / board | 8.08 / 8.68 / 8.40 / 9.54:1 | focus ring |
| rust on alert-ground | 5.59:1 | alert border |
| rust on field | 6.31:1 | error border |
| rust on lift | 5.38:1 | letter-flag underline |
| moss / rust on ground | 8.69 / 6.03:1 | plot markers (non-text) |

*Exempt or decorative:*

| Pair | Ratio | Use | Status |
|---|---|---|---|
| disabled-ink on ground | 4.44:1 | disabled button label | exempt (inactive) |
| disabled-ink on lift / field | 3.96 / 4.64:1 | disabled label on raised or recessed surfaces | exempt (inactive) |
| mute on ground | 3.07:1 | separator only | decorative, not text |
| rule on ground | 1.62:1 | dividers only | decorative, not a control boundary |
| plot-flat on ground | 2.06:1 | flat preview plot | decorative, `aria-hidden` |
| amber on ink / sand | 1.65 / 1.16:1 | none | **must never be adjacent**: the focus ring sits outside over a ground gap (`{components.focus-ring}`) |

Avoid: any fifth code colour, gradients, coloured text on coloured strips, and code colours used as plain text colour (the mock uses them only as fills, markers and thin indicators).

## Typography

Three families, each with one job. All load from Google Fonts. In Next.js 16 they load through `next/font/google`, replacing the scaffold's Geist (architecture: Geist is removed).

- **Schibsted Grotesk** (400–800) is the voice: every heading, body line, label, button and the Letter. Headings are tight (negative tracking from −0.012em to −0.035em) and use `text-wrap: balance`.
- **DM Mono** (400, 500) carries everything that is a record: catalogue numbers (`JA-002`), the formula line, counters («612 av 20 000 tegn»), Evidence source lines («Bevis · CV-linje 8 · annonsen avsnitt 03»), the CV text field and plot indices. Numbers use `font-variant-numeric: tabular-nums` in the score, formula and counters.
- **Archivo** at 125 % width is the engraved caps: `{typography.caps}` for data labels (credits terms, «Formel», «Omformuleringsforslag», table headers), `{typography.code}` inside code strips, and `{typography.wordmark}`. Caps are never used for sentences, buttons or headings. Source text stays in sentence case and is uppercased by CSS, so screen readers read normal words.

Ramp, largest first: `display` (Hjem headline) → `catalogue` (entry heading `JA-002 · Nordic Digital`) → `score` («71 % samsvar – 5 av 7 nøkkelord») → `title` (Historikk, Konto) → `statement` (Hjem stance) → `dialog-title` → `heading` (section h2) → `subheading` (gap h3) → `keyword` → `lede` → `body` / `letter` → `quote` / `label` / `button` → `hint` → `mono-meta` / `caps` / `code`. Each large role has a `-mobile` variant used at ≤ 640 px. The catalogue heading on mobile drops the separator and puts the employer on its own line in `{typography.catalogue-employer-mobile}`.

Rules: one `h1` per page (the catalogue heading or the title; the `h1` per surface is listed in EXPERIENCE.md, Accessibility Floor, Headings); no skipped heading levels; prose is held to `{spacing.measure}` (62ch), the Letter to `{spacing.letter-measure}` (72ch); no letter-spacing on body text. All type sizes are set in `rem` (the px values above ÷ 16), so they scale with the user's font settings. The smallest readable roles are `{typography.code}` and `{typography.caps}` at 12 px (0.75rem); `{typography.plot-state}` is never below 10 px.

## Layout & Spacing

Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 56 / 64 / 72 px (`{spacing.1}`–`{spacing.12}`). Named tokens carry the page rhythm: page padding `{spacing.page-top}` / `{spacing.page-x}` / `{spacing.page-bottom}` (44 / 48 / 72) on laptop, and 28 / 16 / 48 at ≤ 640 px. A new major section opens with `{spacing.section}` (64 px) of space plus a `{colors.rule}` top rule and 28 px of padding; on mobile the gap is `{spacing.section-mobile}`.

Laptop layouts are asymmetric two-column grids with `{spacing.column-gap}` (56 px) between columns: form + preview on Søknad (1.5 : 1), score + formula (1.25 : 1), found + missing keywords (1 : 1), rewordable + real gap (1 : 1), letter + actions (2 : 1), auth form + side note (1 : 1). At ≤ 640 px every grid collapses to one column with `{spacing.column-gap-mobile}` (32 px), action stacks go full width, and the Historikk table becomes a stacked list. The page container is capped at `{spacing.content-max}` (1256 px, the mock's frame width) and centred on `{colors.board}`.

Every interactive element is at least `{spacing.touch-target}` (44 px) high; standard buttons and fields are `{spacing.control-height}` (48 px); tone options and the CV disclosure summary are 56 px; mobile nav rows are 56 px.

Every height in this file is a minimum (`min-height`), never a fixed `height`. That includes the app bar, controls, tone options, nav rows, the disclosure summary and code strips. No text container uses `overflow: hidden` or `text-overflow: ellipsis`. Above 640 px the logged-out nav may wrap onto a second row rather than overflow. If the logged-in nav doesn't fit on one line at the current width, it collapses behind «Meny» as at ≤ 640 px (a container query on the app bar).

## Elevation & Depth

Depth is tonal, not shadowed. The layers run board → ground → lift → lift-2, and a raised surface is one step lighter, outlined with `{colors.rule}` or `{colors.edge}`. The pulse plot creates its own depth: each line's occluder (filled with `{colors.ground}`) hides the lines above it behind its peaks, so the stack reads as a landscape.

The only shadow in the product is on the dialog (`0 24px 64px rgba(0,0,0,.6)`) over a `{colors.scrim}` veil at 0.66 opacity. The drop shadow around each screen in the mock belongs to the sketch board and does not ship.

## Shapes

Every corner is square: `{rounded.none}` for buttons, fields, code strips, the dialog, the letter view, focus rings and the radio indicator. The catalogue grammar is ruled paper and printed sleeves, so lines meet at right angles. Icons follow the same rule: one 1.6 px stroke weight with square caps, 24 px grid, drawn at 18 px in buttons. No pills, no circles, no rounded cards.

## Components

Visual specs. Behaviour lives in EXPERIENCE.md, Component Patterns, under the same names.

- **App bar** (`app-bar`, `nav-link`, `nav-link-active`, `nav-toggle`): `{colors.ground}` with a `{colors.rule}` bottom line. Wordmark left (an amber three-line pulse glyph plus «JobAssistant» in `{typography.wordmark}`, written in normal case in the source and uppercased by CSS), nav right. Inactive links in `{colors.ink-2}`; the current page in `{colors.ink}` with a 2 px amber underline. Historikk carries its entry count in `{typography.mono-meta}`. At ≤ 640 px a small secondary button «Meny» (menu icon) replaces the links. Opened, it reads «Lukk» (close icon), and the links stack as full-width 56 px rows divided by `{colors.rule}`, with the current row on `{colors.lift}` and a 3 px amber left bar. The open menu sits in the document flow under the app bar and pushes the page down; it is never an overlay. The app bar and the banner scroll with the page (EXPERIENCE.md, Component Patterns, App bar).
- **Buttons** (`button-primary`, `button-secondary`, `button-small`, `button-disabled`, `button-busy`): rectangles with a 1 px border and no radius. Primary is parchment-filled with ground text; there is at most one per view. Secondary is outlined in `{colors.edge}` and fills with `{colors.lift}` on hover. Icons sit left of the label at 18 px, except the forward arrow, which sits right. Colour transitions take 160 ms ease-out. A busy button keeps its label and colours, shows the 18 px progress glyph left of the label (static under reduced motion) and uses `cursor: progress`.
- **Link** (`link`): ink text, always underlined (1 px edge line, 4 px offset; amber on hover), never shown by colour alone. The underline exemptions and the standalone-link hit area are in EXPERIENCE.md, Component Patterns, Link.
- **Focus ring** (`focus-ring`): the one visual spec for focus. A 2 px `{colors.amber}` outline, offset 2 px, so it always sits outside the element over a ground-coloured gap, never inset on a parchment or sand fill (amber on ink is 1.65:1). The only inset ring (offset −2 px) is on a Tone option, because the options touch. Square, like every corner. Ratios are in Colors, Measured contrast.
- **Copy button** (`copy-button`): a secondary button (primary in the Letter's action stack) with the copy icon and the label «Kopier».
- **Text field** (`text-field`, `text-field-cv`): a recessed `{colors.field}` well with a 1 px `{colors.edge}` border. Hover lightens the border; focus adds the `{components.focus-ring}` and turns the border ink. Error turns the border rust. The label sits above in `{typography.label}`, the hint below in `{typography.hint}`, and the counter right-aligned in `{typography.mono-meta}`. A field error is ink text in `{typography.hint}`, after a small rust «Feil» code strip, directly under the field. The CV variant is set in `{typography.mono-cv}`, so scrambled PDF lines are easy to spot. Password and Access-code fields carry a small secondary «Vis» / «Skjul» button (`password-toggle`, 44 px) to the right of the field.
- **File picker** (`file-picker`): an outlined row with «Velg fil» (upload icon), styled as `{components.button-secondary}`, then the file name and size in mono. «Velg fil» is the `<label>` of a visually hidden `<input type="file">`. In the error state the border turns rust and an alert sits directly below.
- **CV disclosure** (`cv-disclosure`): an outlined `<details>` row: an amber chevron that rotates 90° when open, «CV-tekst fra Profil» in semibold, and the character count and save date right-aligned in mono.
- **Tone choice** (`tone-choice`): three options in one outlined strip, divided by `{colors.edge}`. Each shows a 20 px square radio, the tone name in semibold and a one-line description in `{typography.hint}`. The selected option sits on `{colors.lift}` with a 3 px amber bottom bar and an amber square inside its radio. The focus ring is drawn inset on the whole option (see Focus ring). At ≤ 640 px the options stack.
- **Code strip** (`code-strip` + `code-found` / `code-missing` / `code-rewordable` / `code-ai` / `code-outline`): a small rectangular label in `{typography.code}`, ground-coloured text on a code fill, padding 5 / 9 / 4 px. The outline variant (ink text, inset edge line, no fill) marks neutral facts («Regnet ut av kode») and pending sections («Skrives»).
- **Catalogue heading** (`catalogue-heading`): the entry number in DM Mono, a muted «·», then the employer, all in `{typography.catalogue}`. On the Søknad form the next number is shown dimmed in `{colors.ink-2}` before «Ny søknad». Profil uses the same construction with «CV» in place of the number.
- **Credits list** (`credits-list`): a horizontal `<dl>` under the heading (Stilling, Dato, Tone, Annonse) with caps terms over body values. Konto uses the stacked variant: rows divided by `{colors.rule}`.
- **Pulse plot** (`pulse-plot`, `plot-legend`):
  - *Full:* one ink baseline per ad paragraph, stacked 23 px apart (21 px on Hjem), each line carrying a small deterministic ripple drawn from its characters. A Keyword raises a peak 62 px high (54 px on Hjem) at its position in the paragraph. Line weight carries the state, not colour: a Matched keyword's stretch is drawn thick (2.8 px), a Missing keyword's stretch dashed (1.5 px, 3.5 / 3); neutral runs are 1.15 px. Paragraph numbers (`01`–`14`) run down the left in `{typography.plot-index}`. The legend underneath draws the three line kinds next to their text.
  - *Compact mode (≤ 640 px, down to 320 px):* the SVG has `viewBox="0 0 328 …"` and `width: 100%`, so it scales below 328 px and never overflows. Only paragraphs with Keywords are drawn, and lines end at 49 % of the width (x = 160 of 328). Labels move into a right-hand label column (x = 174), joined to their peak by dotted leaders, one row per Keyword and stacked per paragraph so nothing can collide. A long Keyword shrinks its font to fit the column.
  - *Flat mode:* baselines only, in `{colors.plot-flat}`, no peaks or labels.
  - *Labels:* each peak is labelled with a 9 px code-colour square, the Keyword in `{typography.plot-label}` and the state word «FUNNET» / «MANGLER» in `{typography.plot-state}`, both in `{colors.ink}` on the label plate.
- **Score block** (`score-block`): two columns divided by a rule. Left: «71 % samsvar – 5 av 7 nøkkelord» in `{typography.score}`, then the verdict strip (moss «Sterkt samsvar» or the outline strip «Bør forbedres») with its threshold sentence. Right: «FORMEL» in caps beside «5 av 7 nøkkelord funnet = 71 %» in `{typography.mono-formula}`, then the disclaimer in ink-2.
- **Keyword entry** (`keyword-entry`) and **Evidence quote** (`evidence-quote`): a ruled row with the Keyword in `{typography.keyword}` and its code strip, then a quote in sjevroner. The Keyword inside the quote is bold with a 2 px amber underline. A mono source line follows («Bevis · CV-linje 8 · annonsen avsnitt 03» or «Fra annonsen · avsnitt 08»).
- **Gap entry** (`gap-entry`), **Suggestion box** (`suggestion-box`), **No-copy note** (`no-copy-note`): a ruled article with the Keyword as `{typography.subheading}` and its code strip («Omformulerbart gap» amber or «Reelt gap» rust). A Rewordable gap shows the cited CV line as an Evidence quote, then a `{colors.lift}` box headed «OMFORMULERINGSFORSLAG» with a small copy button, then the hedge line in ink-2. A Real gap shows two short paragraphs and a dashed-outline note «Ingen tekst å kopiere …» in ink-2, and nothing to copy.
- **Letter view** (`letter-view`): the read-only Letter on `{colors.lift}` with a `{colors.rule}` outline, 36 / 40 px padding, `{typography.letter}`, max 72ch. Beside it on laptop (below it on mobile) is the action stack: «Kopier» (primary), «Last ned (.docx)», «Lag nytt utkast», left-aligned on laptop and full-width centred on mobile, with an ink-2 hint under them.
- **Letter flag** (`letter-flag`, not in the mock): a flagged word in the Letter gets a 2 px dashed rust underline. A warning list above the Letter uses the alert treatment, one line per flagged word.
- **Progress line** (`progress-line`): an outlined box holding a 30 px-high strip with an ink-2 baseline and a small amber pulse trace, then the progress sentence in body text.
- **AI placeholder** (`ai-placeholder`): a ruled slot with the section title in ink-2, an outline code strip «Skrives», 112 px of faint ruled lines, and «Kommer om under ett minutt.» in hint text.
- **Alert** (`alert`): a rust-outlined box on `{colors.alert-ground}`, with a rust «Feil» code strip left of the message.
- **Notice** (`notice`, not in the mock): an edge-outlined box on ground, with an outline code strip (for example «Dagens grense», «Testmodus», «Ikke laget») before an ink message. It is used for non-error states inside a section: Daily cap, "not available in Test mode", less precise Keywords, a missing section in a Saved Application. It never uses rust, so it can't be mistaken for an error.
- **Banner** (`banner`): a full-width band under the app bar on `{colors.lift}`, with a code strip («Testmodus» sand) followed by the message and an optional ink-2 second sentence.
- **Dialog** (`dialog`): a ground panel with a 1 px ink outline, 32 px padding, up to 560 px wide, 120 px from the top, over the scrim. The title is in `{typography.dialog-title}`, the points are a ruled list, and the buttons sit in a row: primary first, then secondary.
- **Expiry warning** (`expiry-warning`): the same panel, scrim and title style as the dialog, with one body sentence and no list. Buttons in a row: «Fortsett økten» (`{components.button-primary}`), then «Logg ut» (`{components.button-secondary}`).
- **Catalogue register** (`catalogue-register`): the Historikk table. Caps headers over a `{colors.edge}` line; rows divided by `{colors.rule}`; the number column in `{typography.register-number}`; the job title as a semibold link with the employer under it in ink-2; the date in mono; the score sentence with its verdict strip; right-aligned small buttons. Rows wash to `{colors.hover}` on hover. At ≤ 640 px it becomes a two-column list: the number (18 px mono) left, the details stacked right.
  - *Pagination (not in the mock):* under the register, small secondary buttons «Forrige» / «Neste» either side of «Side 2 av 4» in `{typography.mono-meta}`. EXPERIENCE.md says when each button shows (Component Patterns, Catalogue register) and when the table scrolls sideways (Responsive & Platform).
- **Skip link** (not in the mock): visually hidden until focused, then shown top-left over the app bar as a `{components.button-primary}` with the focus ring (see Focus ring).
- **Empty state** (`empty-state`): a large outlined ghost number «JA-001» (80 px mono, 1 px edge stroke, transparent fill), then the sentence and the primary button; a flat plot sits beside it on laptop.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Pair every code colour with its text label, in the strip itself or beside the plot marker | Let moss, rust, amber or sand carry meaning alone, or add a fifth code colour |
| Use `{colors.edge}` for any line that identifies a control | Use `{colors.rule}` (1.62:1) as the only boundary of a control |
| Keep text in ink or ink-2 | Set readable text in mute, rule, plot-flat or a code colour |
| Keep every corner square and use one 1.6 px icon stroke with square caps | Rounded cards, pills, circular badges, soft shadows |
| Use line weight and dashes to show state in the plot | Colour the pulse lines themselves |
| Show the score as a sentence and a formula | Gauges, rings, progress circles or stars for the Match score |
| Keep caps for data labels and code strips | Caps on sentences, buttons or headings; letter-spacing on body text |
| Use one primary button per view | Two parchment-filled buttons competing |
| Use amber as a thin line for focus and the current page | An amber fill for anything that isn't «Omformulerbart gap», including the verdict «Bør forbedres» |
| Ship one dark theme with `color-scheme: dark` | A light/dark toggle, or the retired Warm Editorial serif and Rich Mocha light palette |
