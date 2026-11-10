# Accessibility review: DESIGN.md + EXPERIENCE.md (UX 2026-11-09)

Reviewer lens: accessibility (BMad UX Reviewer Gate). Reviewed against PRODUCT.md «Accessibility & Inclusion», PRD §7 NFR-1/NFR-2/NFR-3/NFR-5, and WCAG 2.2 AA. Read alongside ARCHITECTURE-SPINE AD-17 (client session) and the mock `11-signal-varm.html` for context only.

**Verdict.** The colour system holds up. I recomputed every ratio in `DESIGN.md › Colors › Measured contrast`, and all of them match. Every text pair I could derive is ≥ 6.16:1, and every control boundary is ≥ 4.60:1. The one dark theme meets the contrast floor with a wide margin. The live-region plan, the plot's text alternative, the code strips as real text, the dialog, the `<details>` disclosure, the native Tone radio group and the reduced-motion rules are all sound. The gaps are in behaviour, not colour. Two things block AA as written. First, a 30-minute inactivity logout with no warning and no way to extend it fails SC 2.2.1 (Level A). Second, the progress line is specified as `role="status"`, which is implicitly `aria-live="polite"`. That contradicts the «exactly twice» announcement rule that NFR-2 makes binding. Several Major gaps would probably surface as axe *serious* findings or as failures in the keyboard walk of UJ-1: link styling is unspecified, the file picker's hidden input has no defined focus model, focus is lost when the element that triggered an action disappears, and the Letter view's `aria-label` has no element named for it. Two Major gaps are WCAG 2.2-specific: autocomplete and paste rules for authentication (3.3.8, 1.3.5) and reflow at 320 CSS px rather than 360 (1.4.10). None of the fixes need visual redesign; each is a few lines of spine text.

Contrast was computed with the WCAG 2.x relative-luminance formula. Composites: the plot label plate (ground at 0.94 over ink) = `#29211b`; the scrim veil (scrim at 0.66 over ground) = `#130d09`.

---

## Critical

### A11Y-01 · Session expiry has no warning and no way to extend it
- **Location:** EXPERIENCE.md › State Patterns › «Session expired»; Key Flows › UJ-2 › Failure. Source: PRD FR-18 (line 409); ARCHITECTURE-SPINE AD-17 and the API-client rule (line 229).
- **WCAG:** 2.2.1 Timing Adjustable (A). See also 2.2.5 for context.
- **Problem:** The session ends after 30 minutes «without activity» and the Student is redirected to «Logg inn». SC 2.2.1 requires that, for a time limit set by the content, the user is warned before it runs out and gets at least 20 seconds to extend it with a simple action. None of the SC's exceptions (real-time, essential, longer than 20 hours) apply. The architecture also detects expiry only on the next `/api/*` call (`SESSION_EXPIRED`). So «activity» in practice means server requests. A Student who spends 30 minutes reading an ad, typing into the Job ad field, or correcting a scrambled CV in Profil (no requests) loses the session on the next click, without warning. Screen-reader and switch users, and anyone who types slowly, hit this first.
- **Fix (EXPERIENCE.md › State Patterns, replace the «Session expired» row):**
  > | Session expiring | Any page, after S6 | Activity is any key, pointer or input event in the page, not only server requests. While the Student is active, the client renews the session at most once every 5 minutes (a lightweight authenticated request). Two minutes before 30 minutes of inactivity, an `alertdialog` opens: title «Økten din avsluttes snart», body «Du blir logget ut om 2 minutter fordi du ikke har gjort noe på en stund. Det du har skrevet, tas vare på.», buttons «Fortsett økten» (primary, receives focus) and «Logg ut». «Fortsett økten» renews the session and returns focus to where it was. If the AI notice is open, the warning replaces it, and the AI notice reopens afterwards (one dialog level, never two). |
  > | Session expired | Any page, after S6 | Only after the warning has run out: «Logg inn» with the alert «Økten din er avsluttet. Logg inn igjen for å fortsette.» … (rest unchanged) |
- Also amend EXPERIENCE.md › Interaction Primitives › «The dialog»: «It is the only modal in the product» → «The AI notice and the session-expiry warning are the only modals in the product, and never open at the same time.»

### A11Y-02 · The progress line is a live region, which breaks «exactly twice»
- **Location:** EXPERIENCE.md › Component Patterns › «Progress line» («`role="status"`, but not `aria-live` itself»); Accessibility Floor › «Two announcements per Application»; State Patterns › «Phase 1 running» and «Letter regenerating».
- **WCAG:** 4.1.3 Status Messages (AA), plus the binding NFR-2 clause «progress announced with `aria-live`, once for the score and once for the AI sections».
- **Problem:** `role="status"` *is* a live region: its implicit values are `aria-live="polite"` and `aria-atomic="true"`. You can't have one without the other. As written, the progress line can announce:
  - «Henter nøkkelord fra annonsen …» (FR-5 fallback);
  - «Skriver gapanalyse …» when it is inserted (behaviour varies by screen reader);
  - «Skriver et nytt utkast …».

  That gives three or more announcements per Application. NFR-2 is checked in the UJ-1 keyboard and screen-reader walk. A second problem: the spine doesn't say that the single announcement region has to exist, empty, before it is filled, or that it has to sit outside the form subtree that the result replaces. If the region is created together with the result, or is unmounted with the form, nothing gets announced at all.
- **Fix (Component Patterns › Progress line, behavioural rules):**
  > Shown while any AI section is pending; removed when all have settled. Plain text with no role and no `aria-live` (a `role="status"` would make it a live region). Screen-reader users learn about phase 2 from the phase-1 announcement. The trace animates for at most 5 s, then holds still (WCAG 2.2.2).
- **Fix (Accessibility Floor, «Two announcements per Application», add):**
  > The region is rendered empty with the page shell, outside the form/result subtree, so it survives the form being replaced by the result. Its text is replaced (never appended) for each announcement. The phase-1 line ends with what happens next: «Samsvaret er klart: 71 %, sterkt samsvar, 5 av 7 nøkkelord. Gapanalysen og søknadsbrevet skrives nå.» Events after phase 2 (retry, «Lag nytt utkast») use the separate polite region (see A11Y-06) and don't count toward the two.
- Update Key strings › «Live: phase 1» to match.

---

## Major

### A11Y-03 · The file picker's hidden input has no defined focus model
- **Location:** DESIGN.md › Components › File picker («a secondary «Velg fil» button over a visually hidden `<input type="file">`»); EXPERIENCE.md › Component Patterns › File picker.
- **WCAG:** 2.4.7 Focus Visible (AA), 2.1.1 Keyboard (A), 4.1.2 Name, Role, Value (A).
- **Problem:** «A button over a hidden input» can be built two ways, and both go wrong in common ways. A real `<button>` that calls `input.click()`, with the input also focusable, gives two tab stops, one of them invisible. A visually hidden input with a `<label>` styled as a button gets no visible ring, because the input has focus and the label draws nothing. UJ-1 step 2 (upload in Profil) is part of the keyboard walk. The mock solves this with `.filepick:has(input:focus-visible) .btn{outline…}`, but the spine doesn't carry the rule over. The tone choice has the same pattern (the mock draws the ring on the label), and the spine doesn't state it either.
- **Fix (EXPERIENCE.md › Component Patterns › File picker, replace the first sentence):**
  > One tab stop: the native `<input type="file">`, visually hidden (not `display:none`), with the accessible name «Velg fil, PDF eller TXT, maks 2 MB». The visible «Velg fil» is its `<label>`, styled as `{components.button-secondary}`, not a second button. While the input has `:focus-visible`, the amber ring is drawn on the label (`:has(input:focus-visible)`). The same rule applies to the Tone choice: the radio is the tab stop, and the ring is drawn on the whole option.

### A11Y-04 · Link styling is unspecified
- **Location:** DESIGN.md: no `link` token in `components`, and no link entry under Colors or Components. EXPERIENCE.md uses links in «Gå til Profil», «Til Hjem», «Har du allerede en konto? Logg inn», «Du endrer den i Profil», «Se gapanalysen», the register job titles and the catalogue sequence link.
- **WCAG:** 1.4.1 Use of Color (A). axe rule `link-in-text-block` (serious).
- **Problem:** Body text is ink. If a link inside a sentence is also ink, or ink-2 (ink-2 on ink is 1.76:1), and has no underline, nothing but colour marks it as a link, and axe reports it as serious. The mock underlines links (`text-decoration-color: edge`, 1 px, offset 4 px, amber on hover), but DESIGN.md is the contract, and it says nothing.
- **Fix (DESIGN.md front matter, `components`):**
  ```yaml
  link:
    foreground: '{colors.ink}'
    underline: '1px solid {colors.edge}, offset 4px'
    underline-hover: '{colors.amber}'
    visited: 'same as link'
  ```
  and add to Components:
  > **Link** (`link`): ink text, always underlined (1 px edge line, 4 px offset; amber on hover). Never shown by colour alone and never without an underline, except nav links and register job titles, which are identified by their position and their focus ring. Standalone links («Se gapanalysen», «Gå til Profil», «Til Hjem») have a hit area at least 24 px high (WCAG 2.5.8). Only links inside a sentence are exempt.

### A11Y-05 · Focus is lost when the element that triggered an action disappears
- **Location:** EXPERIENCE.md › Accessibility Floor › Focus order; Interaction Primitives › «Lag nytt utkast» / «Endre annonsen»; State Patterns › «AI section failed», «Letter regenerating»; Component Patterns › Catalogue register (pagination); Navigation (Søknad routes to «Logg inn»).
- **WCAG:** 2.4.3 Focus Order (A), 2.1.1 Keyboard (A).
- **Problem:** Focus is specified for phase 1, errors, the dialog and a scanned PDF. In these cases the focused element is removed, or the page content is swapped, and focus falls back to `<body>`, so a keyboard user has to start again from the top:
  - «Endre annonsen» (the result is replaced by the form);
  - «Prøv igjen» (the alert becomes a placeholder, then content);
  - «Neste» / «Forrige» (the page of rows is replaced);
  - client-side route changes (Next.js App Router doesn't move focus);
  - the redirect after «Logg inn» / «Registrer deg».

  The spine also doesn't say that focus stays put after phase 2, or where it goes after «Bruk eksempelet» on the form (only UJ-3 says «focus moves to «Analyser og skriv utkast»»).
- **Fix (Accessibility Floor › Focus order, add bullets):**
  > - Phase 2: focus is never moved when AI sections arrive or fail.
  > - «Endre annonsen»: the form replaces the result, and focus moves to the form's `h1` («Ny søknad» / «JA-003 · Ny søknad», `tabindex="-1"`).
  > - «Prøv igjen»: focus moves to that section's `h2` («Gapanalyse» / «Søknadsbrev», `tabindex="-1"`). The `h2` stays in the DOM through placeholder → alert → content, so it is never removed.
  > - «Lag nytt utkast»: focus stays on the button (busy while running, see Buttons).
  > - «Bruk eksempelet»: the fields fill, focus moves to «Analyser og skriv utkast», and the polite region says «Eksempelet er fylt inn.».
  > - Pagination: focus moves to the register's caption/`h1`, and the polite region says «Side 3 av 4».
  > - Every page navigation, including redirects: focus starts at the top of the document, so the skip link comes first, and the new page's `<title>` names the page («Søknad – JobAssistant»).

### A11Y-06 · Status messages outside the two phase announcements are unspecified
- **Location:** EXPERIENCE.md › State Patterns › «AI section failed», «Letter regenerating», «Network failure», «Form errors», «Ad too short or unclear», «Access required»; Interaction Primitives › Copy (clipboard blocked); Component Patterns › Alert, Notice.
- **WCAG:** 4.1.3 Status Messages (AA), 3.3.1 Error Identification (A).
- **Problem:** Only upload failures are given `role="alert"`. These events have no defined announcement or focus:
  - the result of a «Prøv igjen» or a «Lag nytt utkast» (success or failure);
  - the network-failure alert «at the top of the content»;
  - server-side form errors that only exist after a round trip («Feil e-post eller passord.», «Denne e-postadressen er allerede registrert.», «Feil tilgangskode.»);
  - «Annonsen er for kort eller uklar …», which arrives after the submit button stops being busy;
  - the clipboard-blocked notice «Kopier med Ctrl+C …».

  A screen-reader user presses the button and hears nothing.
- **Fix (Accessibility Floor, add after «Two announcements per Application»):**
  > **Other status messages** go to the second polite region (the one used for «Kopiert til utklippstavlen.» and «Lagret.»):
  > - retry success: «Gapanalysen er klar.» / «Søknadsbrevet er klart.»;
  > - retry failure: the section's failure sentence;
  > - «Lag nytt utkast»: «Det nye utkastet er klart.» / «Det nye utkastet kunne ikke lages. Det forrige brevet står fortsatt.»;
  > - clipboard blocked: «Kopier med Ctrl+C, eller hold inne på mobil.».
  >
  > **Errors that arrive from the server:** field errors (wrong password, e-mail taken, wrong Access code, ad too short or unclear) are written into the field's `aria-describedby` error slot, the field gets `aria-invalid="true"`, and focus moves to it. The network-failure alert uses `role="alert"`, and focus stays where it was.
- Add «Retry and regenerate outcomes use the second polite region (Accessibility Floor).» to the Alert row of Component Patterns.

### A11Y-07 · Reflow is specified at 360 px, but WCAG requires 320 CSS px; long words can overflow
- **Location:** EXPERIENCE.md › Responsive & Platform (360 px row); DESIGN.md › Components › Pulse plot (compact mode with fixed coordinates «x = 160 of 328»); DESIGN.md typography `catalogue-mobile` 36 px, `catalogue-employer-mobile` 28 px, `title-mobile` 30 px, `mono-meta`.
- **WCAG:** 1.4.10 Reflow (AA).
- **Problem:** NFR-3 sets 360 px for usability, but WCAG 1.4.10 is tested at 320 CSS px (1280 px at 400 % zoom). That leaves 288 px of content after the 16 px gutters. The spine never mentions 320. At 36 px Schibsted (roughly 0.55 em per character), a line holds about 14 characters. Norwegian compounds and employer names («Universitetssykehuset», «Junior frontendutvikler», «Arbeids- og velferdsetaten») and the unbroken mono strings (`violet-hansen-soknadsbrev-nordic-digital-2026.docx`, CV lines with URLs, «Bevis · CV-linje 8 · annonsen avsnitt 03») will force horizontal scrolling unless wrapping is specified. The compact plot's coordinates are given for a 328-unit width. The spine doesn't say whether the plot scales (`viewBox`) or overflows.
- **Fix (EXPERIENCE.md › Responsive & Platform, change the 360 px row heading to «360 px and 320 px» and add):**
  > No horizontal scroll down to 320 CSS px (WCAG 1.4.10, equal to 1280 px at 400 % zoom). The `@media (max-width: 640px)` layout covers it. Headings and body use `overflow-wrap: break-word` and `hyphens: auto` (works with `lang="nb"`). Mono strings (file names, source lines, the CV field, catalogue numbers) use `overflow-wrap: anywhere`. The compact plot is an SVG with `viewBox="0 0 328 …"` and `width: 100%`, so it scales below 328 px and never overflows. The Historikk table above 640 px may scroll inside its own container (data-table exception), never the page.

### A11Y-08 · Authentication fields have no autocomplete or paste rules
- **Location:** EXPERIENCE.md › Key strings › «Registrer deg», «Logg inn», «Tilgangskode»; State Patterns › «Access required», «Form errors»; Component Patterns › Text field.
- **WCAG:** 3.3.8 Accessible Authentication (Minimum) (AA), 1.3.5 Identify Input Purpose (AA).
- **Problem:** The spine doesn't say that paste and password managers must work. The Tilgangskode is at least 16 characters, and the Examiner copies it from the submission. Transcribing it by hand is a cognitive-function test unless paste works. 1.3.5 requires `autocomplete` tokens on fields that collect the user's own data (Navn, E-post, Passord), and axe checks that the tokens are valid. Without a rule, it's easy to ship `autocomplete="off"`, an `onPaste` block or a custom masked input.
- **Fix (Component Patterns › Text field, add):**
  > Authentication fields never block paste, autofill or password managers, and never split a code into several boxes. Tokens:
  > - Navn `autocomplete="name"`;
  > - E-post `type="email" autocomplete="email"`;
  > - Passord on «Registrer deg» `autocomplete="new-password"`, on «Logg inn» `autocomplete="current-password"`;
  > - Tilgangskode `type="password" autocomplete="off"`, with paste allowed.
  >
  > Password and Access-code fields have a «Vis» / «Skjul» toggle (`aria-pressed`, 44 px). On a «Feil e-post eller passord.» error the e-mail is kept.

### A11Y-09 · Focus-ring offset is unspecified, and an inset ring on parchment drops to 1.65:1
- **Location:** DESIGN.md › `text-field.outline-focus` (the only place an offset is given); EXPERIENCE.md › Accessibility Floor › «Focus visible»; DESIGN.md › Components › Skip link, Tone choice.
- **WCAG:** 2.4.7 Focus Visible (AA), 1.4.11 Non-text Contrast (AA).
- **Problem:** The ring is checked only against ground (9.05:1). Amber against ink, the primary button and the skip link, is **1.65:1**. Amber against sand (pressed primary) is **1.16:1**. So the ring is visible only if it sits outside the button with a ground-coloured gap. The mock uses `outline-offset: 3px` in general and `-2px` (inset) on Tone options, but the spine gives no global offset. Tone options are also adjacent inside one outlined strip, so an outward ring would be clipped by its neighbours or by `overflow: hidden`.
- **Fix (EXPERIENCE.md › Accessibility Floor, replace «Focus visible»):**
  > **Focus visible:** `:focus-visible { outline: 2px solid {colors.amber}; outline-offset: 2px }` on every focusable element, never removed. The ring always sits outside the element over a ground-coloured gap, never inset on a parchment or sand fill (amber on ink is 1.65:1). The only inset exception is a Tone option (`outline-offset: -2px`, amber on lift 8.08:1 / on ground 9.05:1), because the options touch. No ancestor of a focusable element uses `overflow: hidden` in a way that clips the ring. Ratios: amber on ground 9.05, lift 8.08, hover 8.68, alert-ground 8.40, board 9.54.

### A11Y-10 · The Letter view's label is put on an unnamed element (axe serious risk)
- **Location:** EXPERIENCE.md › Accessibility Floor › Names («The Letter view is labelled «Utkast til søknadsbrev, kun lesing»»); Component Patterns › Letter view.
- **WCAG:** 4.1.2 Name, Role, Value (A). axe `aria-prohibited-attr` (serious).
- **Problem:** The obvious build is `<div aria-label="…">`. A generic `div` may not carry `aria-label`, and axe reports it as serious. «kun lesing» is the wording for a read-only *textbox*, which the spine rules out. The AI label «Utkast skrevet med KI – …» isn't tied to the letter programmatically, so someone jumping to the letter skips it.
- **Fix (Component Patterns › Letter view, add):**
  > Rendered as `<article aria-labelledby="letter-h2" aria-describedby="letter-ai-label">`, where `letter-h2` is the «Søknadsbrev» `h2` and `letter-ai-label` is «Utkast skrevet med KI – les gjennom og tilpass før du sender.». Never a textarea, never `contenteditable`, and never `aria-label` on a `div`.
- Then delete «kun lesing» from Accessibility Floor › Names. The same rule applies to the «Skrevet med KI» strip on Gapanalyse: it sits inside the section's `h2` (see A11Y-17).

### A11Y-11 · Unsaved CV corrections in Profil are lost when the session expires
- **Location:** EXPERIENCE.md › State Patterns › «Session expired»; ARCHITECTURE-SPINE AD-17 (`inputs.cvText` is never written when accounts are on; expiry clears everything except the Job ad fields).
- **WCAG:** 3.3.7 Redundant Entry (A).
- **Problem:** Correcting a scrambled two-column PDF is slow, deliberate work (UJ-1 step 2, the PRD's main pain point). With accounts on, an expiry before «Lagre» throws it away, and the Student has to upload and correct again. The Job ad is protected; the CV draft isn't. A11Y-01 reduces the risk but doesn't remove it (the Student may be away from the computer).
- **Fix (State Patterns › Session expired, add):**
  > Unsaved CV text being edited in Profil is kept in the client session as a draft (`inputs.cvDraft`, cleared on «Lagre» and on «Logg ut»). After login, Profil restores it with the notice «Vi tok vare på endringene du ikke hadde lagret.». The e-mail field on «Logg inn» is prefilled after expiry.
- This needs an AD-17 amendment, so flag it to the architecture spine.

---

## Minor

### A11Y-12 · App-bar position isn't stated (Focus Not Obscured)
- **Location:** DESIGN.md › Components › App bar; EXPERIENCE.md › Responsive & Platform.
- **WCAG:** 2.4.11 Focus Not Obscured (Minimum) (AA).
- **Problem:** The spine doesn't say whether the app bar (64/60 px) and the Test-mode banner are sticky. The mock's app bar isn't. If a developer makes them sticky, as many do, focused fields and «Se gapanalysen» targets scroll under them.
- **Fix (DESIGN.md › Components › App bar, add):**
  > The app bar and the banner scroll with the page; they are never `position: sticky` or `fixed`. If that ever changes, `html { scroll-padding-top }` must equal their combined height.

  And under Keyword entry: «Se gapanalysen» targets the gap's `h3` (`id`, `tabindex="-1"`), and focus moves to it.

### A11Y-13 · The mobile menu's layering and focus behaviour are incomplete
- **Location:** DESIGN.md › Components › App bar; EXPERIENCE.md › Component Patterns › App bar.
- **WCAG:** 2.4.3, 2.4.11.
- **Problem:** The spine doesn't say whether the open menu pushes content down or overlays it. If it overlays, Tab moves from the last link into content hidden behind the menu.
- **Fix (Component Patterns › App bar, add):**
  > The open menu is in the document flow below the app bar and pushes the page down; it is never an overlay, so nothing behind it can hold focus. Esc closes it and returns focus to «Meny». Choosing a link navigates (focus starts at the top of the new page, A11Y-05). The `<nav>` is labelled «Hovedmeny». At ≤ 640 px the toggle's accessible name stays «Meny» / «Lukk», matching the visible label.

### A11Y-14 · Skip-link target and landmarks aren't named
- **Location:** EXPERIENCE.md › Interaction Primitives › Keyboard; DESIGN.md › Components › Skip link, Banner.
- **WCAG:** 2.4.1 Bypass Blocks (A). axe `region` (moderate), `landmark-one-main`.
- **Fix (Interaction Primitives › Keyboard, extend the skip-link sentence):**
  > … targets `<main id="hovedinnhold" tabindex="-1">`. Every page has one `<header>` (app bar and Test-mode banner), one `<main>` and no content outside landmarks. The banner sits inside `<header>`, after the `<nav>`. On Tilgangskode (wordmark only) the skip link is still present.

### A11Y-15 · The dialog's initial focus and background inertness aren't stated
- **Location:** EXPERIENCE.md › Component Patterns › Dialog.
- **WCAG:** 2.4.3, 1.3.2.
- **Problem:** «Focus moves to the dialog» doesn't say where. If focus lands on «Godta og fortsett», the consent text is skipped.
- **Fix:**
  > Built with native `<dialog>` and `showModal()` (background inert by default). On open, focus moves to the dialog title (`tabindex="-1"`), so the body is read before the buttons. Clicking the scrim does nothing (only «Avbryt», Esc or «Godta og fortsett» close it).

### A11Y-16 · Focus-order lists miss the first-shipped variant and some controls
- **Location:** EXPERIENCE.md › Accessibility Floor › Focus order.
- **WCAG:** 2.4.3.
- **Problem:** The Søknad form order covers only the after-S6 variant. Steps 1–5 (which must be stable by 22 Nov) have the file picker, the CV text field and «Bekreft CV-teksten» instead of the disclosure. The result order leaves out «Endre annonsen» (in the heading row), the «Lagret i Historikk …» line, «Prøv igjen», the «Gå til Profil» link (no CV yet) and the clipboard fallback.
- **Fix (Focus order, replace the Søknad bullets):**
  > - Søknad form, before S6: skip link → app bar → «Velg fil» → CV-tekst → «Bekreft CV-teksten» → Stillingstittel → Arbeidsgiver → «Bruk eksempelet» → Stillingsannonse → Tone → «Analyser og skriv utkast».
  > - Søknad form, after S6: skip link → app bar → CV disclosure (or the «Gå til Profil» link in the No-CV notice) → … (as now).
  > - Result: `h1` (focused after phase 1) → «Endre annonsen» → score block → keyword entries with «Se gapanalysen» → Gapanalyse (suggestion «Kopier», or «Prøv igjen») → Letter warnings → Letter actions (or «Prøv igjen»).

### A11Y-17 · Heading semantics are underspecified outside the Refleksjonsnotat
- **Location:** DESIGN.md › Typography › Rules; EXPERIENCE.md › Accessibility Floor › Headings; Component Patterns › AI placeholder, Gap entry, Keyword entry, Catalogue heading.
- **WCAG:** 1.3.1 Info and Relationships (A), 2.4.6 Headings and Labels (AA).
- **Problems:**
  1. The `h1` isn't named for Hjem (the display headline?), «Registrer deg», «Logg inn», Tilgangskode, Konto, Historikk or Ikke funnet.
  2. The AI placeholder's title (ink-2) isn't said to be the same `h2` that the resolved section uses, so the outline changes when the content arrives.
  3. The spine doesn't say whether a code strip sits inside the `h3`. Heading navigation then reads «Kubernetes» without «Mangler».
  4. The `·` separator in «JA-002 · Nordic Digital» is read aloud as «midtpunkt» by some screen readers.
- **Fix (Accessibility Floor › Headings, add):**
  > `h1` per surface: Hjem = the headline; Registrer deg / Logg inn / Tilgangskode = the page name; Profil, Søknad, result, Saved Application = the catalogue heading; Historikk, Konto = the title; Ikke funnet = «Fant ikke siden». The AI placeholder renders the section's real `h2` («Gapanalyse», «Søknadsbrev») from the start. Keyword and gap code strips sit inside the `h3` after the keyword («Kubernetes Reelt gap»), and section strips inside the `h2`. In the catalogue heading the `·` is `aria-hidden`, with a visually hidden comma in its place.

### A11Y-18 · Historikk table semantics and the single-DOM rule
- **Location:** EXPERIENCE.md › Component Patterns › Catalogue register.
- **WCAG:** 1.3.1, 4.1.2.
- **Fix (append to the row):**
  > Column headers are `<th scope="col">` (the actions column has a visually hidden header «Handlinger»). The job-title cell is `<th scope="row">`. Only one structure is in the accessibility tree at a time: the table and the `<ol>` are swapped by the same 640 px media query with `display: none`, never both visible to assistive technology. Pagination is a `<nav aria-label="Sider">`. «Forrige» is absent (not disabled) on page 1, and «Neste» is absent on the last page. Row buttons: «Åpne JA-002», «Kopier brevet til JA-002», «Last ned JA-002 (.docx)».

### A11Y-19 · Load-bearing pairs missing from the contrast table, and colours left unstated
- **Location:** DESIGN.md › Colors › Measured contrast; Components › Pulse plot, Text field, Buttons.
- **WCAG:** 1.4.3, 1.4.11.
- **Problems:** All of these pass, but they aren't in the table, so they won't be checked when the palette changes:

  | Pair | Ratio | Use |
  |---|---|---|
  | ink on hover | 14.33 | row text on hover |
  | ink-2 on hover | 8.13 | employer line on a hovered row |
  | ink-2 on lift-2 | 6.90 | hint inside a pressed surface |
  | ink on plate (`#29211b`) | 13.01 | plot labels |
  | ink-2 on plate | 7.39 | plot indices / leaders |
  | edge on lift | 5.05 | small «Kopier» in the suggestion box; buttons in the banner |
  | edge on lift-2 | 4.60 | pressed secondary button |
  | edge on hover | 5.42 | row buttons on a hovered row |
  | edge on alert-ground | 5.25 | «Prøv igjen» inside an alert |
  | edge-hover on field | 9.78 | hovered field border |
  | rust on field | 6.31 | error border |
  | rust on lift | 5.38 | letter-flag underline |
  | ground on sand | 10.47 | primary button, pressed |
  | amber on lift / hover / alert-ground / board | 8.08 / 8.68 / 8.40 / 9.54 | focus ring |
  | placeholder on ground | 6.16 | if a placeholder ever shows outside a field well |
  | disabled-ink on lift / field | 3.96 / 4.64 | exempt (inactive) |
  | amber on ink / sand | 1.65 / 1.16 | **must never be adjacent** (see A11Y-09) |

  Also unstated:
  - `::selection` (EXPERIENCE says amber; ink on amber is **1.65:1**; the mock correctly uses ground text, 9.05:1);
  - the text colour of `plot-label` and `plot-state`;
  - the field-level error message's appearance;
  - a visual cue for the busy button (`aria-disabled`, «label unchanged»). Today a sighted user can't see that it's busy.
- **Fix (DESIGN.md):** add the rows above to the Measured contrast table, and add:
  > `::selection { background: {colors.amber}; color: {colors.ground} }` (9.05:1). Plot labels and state words are `{colors.ink}` on the plate. A field error is ink text in `{typography.hint}`, after a small rust «Feil» code strip, directly under the field. A busy button keeps its label and colours, shows the 18 px progress glyph left of the label (static under reduced motion) and uses `cursor: progress`.

### A11Y-20 · App-bar fixed height and text-spacing robustness
- **Location:** DESIGN.md › `app-bar.height`, `spacing.appbar-height`; Layout & Spacing; Components › App bar (mobile «56 px rows»).
- **WCAG:** 1.4.12 Text Spacing (AA), 1.4.10, 1.4.4 Resize Text.
- **Problem:** `height: 64px` is a fixed height. The logged-in nav (wordmark ≈ 172 px, five links ≈ 383 px including the Historikk count, 2 × 48 px padding) needs about 650 px or more. So between 641 and roughly 700 px viewport width, or with text spacing increased, the links overflow or get clipped. Display roles use line-height 1.0–1.05, so headings clip if their containers have a fixed height or `overflow: hidden`.
- **Fix (DESIGN.md › Layout & Spacing, add):**
  > Every height in this file is a minimum (`min-height`), never a fixed `height`. That includes the app bar, controls, tone options, nav rows, the disclosure summary and code strips. No text container uses `overflow: hidden` or `text-overflow: ellipsis`. Above 640 px the nav may wrap onto a second row rather than overflow. If the logged-in nav doesn't fit on one line at the current width, it collapses behind «Meny» as at ≤ 640 px (a container query on the app bar).

### A11Y-21 · Language-of-parts decision and the wordmark's source case
- **Location:** EXPERIENCE.md › Foundation; Accessibility Floor (`lang="nb"`); DESIGN.md › Components › App bar (wordmark «JOBASSISTANT»).
- **WCAG:** 3.1.1 (A), 3.1.2 Language of Parts (AA).
- **Problem:** Technical terms (React, TypeScript, Kubernetes, Git) are exempt from 3.1.2, but the spine doesn't record that decision, so a developer might add `lang="en"` spans everywhere or worry about it. Whole quoted ad lines from an English-language ad (common for Norwegian tech jobs) are passages, but the content is user-supplied, and language detection is out of scope. The wordmark is written in capitals in the spine. If the source text is capitals, some screen readers spell it out letter by letter.
- **Fix (Accessibility Floor, add):**
  > Keywords and technical terms from the ad (React, TypeScript, Kubernetes) are not marked up with `lang`; they are technical terms (3.1.2 exception). Quoted ad and CV lines are rendered as-is under `lang="nb"`; no language detection in v1 (an accepted limit, noted in `docs/qa/`). The wordmark's source text is «JobAssistant», uppercased by CSS like the caps roles.

### A11Y-22 · The phase-2 line doesn't cover cap, Test-mode and saved outcomes
- **Location:** EXPERIENCE.md › Key strings › «Live: phase 2»; State Patterns › «Daily cap reached», «Not available in Test mode», «Result complete».
- **WCAG:** 4.1.3.
- **Problem:** «Gapanalysen og søknadsbrevet er klare. (or names what failed)» would say «klare» when the sections actually show a Daily-cap or Test-mode notice. The «Lagret i Historikk som JA-002.» line appears silently.
- **Fix (Key strings, replace «Live: phase 2»):**
  > «Gapanalysen og søknadsbrevet er klare. Lagret i Historikk som JA-002.» · one failed: «Søknadsbrevet er klart. Gapanalysen kunne ikke lages.» · cap: «Dagens grense for KI er nådd. Samsvaret står fortsatt.» · Test mode, other ad: «Gapanalysen og søknadsbrevet er ikke tilgjengelige i testmodus.» (Without accounts, leave out the saved sentence.)

### A11Y-23 · Very small type for readable labels (advisory)
- **Location:** DESIGN.md typography `plot-state` 9.5/9 px, `plot-index` 10 px, `caps` 11 px, `code` 11 px.
- **WCAG:** none fails directly (1.4.4 is met by browser zoom). This is advisory, in line with NFR-3 phone use.
- **Problem:** Code strips and credits terms are 11 px wide caps. They carry required meaning (Funnet / Mangler / Reelt gap) at about 8 px x-height on a phone. Contrast is high (≥ 6.03:1), but legibility for low-vision users is marginal.
- **Fix (DESIGN.md typography):**
  > `code` and `caps`: 12px (`font-size: 0.75rem`, so they scale with user font settings); `plot-state` min 10px. All type sizes are set in `rem`.

---

## Verified OK

- **Spine contrast table:** I recomputed all 23 stated pairs, and they match exactly (ink/ground 14.94, ink-2/ground 8.48, placeholder/field 6.44, ground on moss/rust/amber/sand 8.69/6.03/9.05/10.47, edge/ground 5.66, edge/field 5.92, amber/ground 9.05, rust/alert-ground 5.59, disabled-ink/ground 4.44 exempt, mute 3.07, rule 1.62, plot-flat 2.06 decorative). Every text pair is ≥ 4.5:1, and every control boundary is ≥ 3:1. The single dark theme passes.
- `{colors.rule}` is explicitly barred from being a control's only boundary, and edge (≥ 4.60:1 on every ground) is the only control line.
- Code colours are always paired with a text label. «Bør forbedres» is an outline strip with ink text, so the verdict differs by word, not hue. The plot uses line weight and dashes plus the words «FUNNET» / «MANGLER». Flagged letter words are underlined and listed. (1.4.1)
- Code strips are real text, sentence case in the source and uppercased by CSS.
- The pulse plot is `role="img"` with a data-built `aria-label`, it has no focusable parts, its full equivalent is in the keyword lists, and the flat plot, ghost number and plot-flat are `aria-hidden`.
- One polite announcement region speaks twice by design. The mock's two whole-section live regions were correctly rejected. Copy and «Lagret.» use a separate region. Focus stays on «Kopier».
- Focus moves to the `h1` after phase 1, to the first invalid field on error, and to the CV field on a scanned PDF. The dialog traps focus, Esc equals «Avbryt», and focus returns to submit.
- Tone choice is a native radio group in a `fieldset`/`legend` with arrow keys. The CV disclosure is native `<details>`. The register is a real `<table>` / `<ol>`, not a restyled table.
- Labels sit above fields. Hints and errors use `aria-describedby` and `aria-invalid`. Validation runs on blur and submit, not per keystroke. Input is never cleared (3.3.1, 3.3.3).
- Motion: the progress trace stops after 5 s and is static under `prefers-reduced-motion`. There is no shimmer, no smooth scrolling under reduced motion, no carousels, no infinite scroll, and nothing flashes (2.2.2, 2.3.1).
- 2.5.7 Dragging: no drag paths (file input via button; drag banned as the only path).
- 2.5.8 Target size: 44 px minimum on every control, 48 px buttons and fields, 56 px tone options, disclosure and mobile nav rows. Exemptions are limited to inline links (extend to standalone links per A11Y-04).
- 3.2.6 Consistent Help: no help mechanism exists, so it doesn't apply. If one is added, it must sit in the same place on every page.
- 3.3.7 Redundant Entry: the Job ad, title, employer and Tone are restored after expiry; «Endre annonsen» keeps every input (CV draft gap: A11Y-11).
- 3.3.8: no CAPTCHA, no cognitive puzzle, no code splitting (paste and autocomplete rules to add per A11Y-08).
- `lang="nb"` on every page. Nav collapses at ≤ 640 px. One column at ≤ 640 px. At 400 % zoom on 1280 px the viewport is 320 px, so the mobile layout (and the `<ol>` register) applies.
- `aria-current="page"` on the active nav item. The «Meny» toggle has `aria-expanded` / `aria-controls`. Icons are `aria-hidden` next to visible labels. Repeated row buttons include the entry in their name.
