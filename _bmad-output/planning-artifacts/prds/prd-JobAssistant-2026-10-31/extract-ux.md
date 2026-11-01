# UX extract for the JobAssistant PRD

Prepared 2026-10-31 for the PM. Source folder: `_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-09-11/`. Read-only extraction: no source file was edited.

Not read: the product brief and addendum, and the `.working/` folder (earlier working copies of the mocks and colour-theme explorations). I also read this PRD folder's `.memlog.md` (PM decisions) only to flag tensions in section 9.4; `prd.md` is an empty stub.

---

## 0. How to read this file

**Sources and precedence**
- `EXPERIENCE.md` (behaviour spine, cited `EXP`) and `DESIGN.md` (visual spine, cited `DES`) are both `status: final`, updated 2026-10-10. They are "the contract". The three mocks illustrate and lose on any conflict (EXP > Information Architecture).
- `.memlog.md` is the UX decision log: 29 entries on lines 6 to 34, cited `L<number>`.
- `reconcile-color-themes-1.md` (cited `REC`) is colour history only.
- Only three surfaces have mocks: `key-home.html` (`M-HOME`), `key-application-result.html` (`M-RESULT`), `key-mobile-nav.html` (`M-NAV`). Every other surface is specified in prose and tables only. URLs in the mocks (`jobassistant.app/home`, `jobassistant.app/application/result`) are illustrative.

**Tags used below**
- `[CONFIRMED]`: the docs tag it [ASSUMPTION] and memlog L23 records the user confirmed it as-is. L23 lists exactly nine items: Login page (email + password); mobile persistent CTA routes to Application; Home = recent vs History = full archive; inherited typography and shape scale; dedicated error colour; ATS threshold placeholder >= 70 %; standalone Review feedback document has no score or chips; encrypted-storage trust microcopy near uploads and Account; Account page fields (password change + data note).
- `[ASSUMPTION]`: tagged in the docs but not in L23's list, so still open.
- `[MOCK]`: visible only in a mock, not stated in the spines.
- `[INFERENCE]`: my inference, not stated in the UX docs.
- `[FLAG]`: my scope or gap flag.

**Ten things the PRD most needs from the UX**
1. Journey IDs are `Flow 1` (first tailored application) and `Flow 2` (standalone CV review). There are no `UJ-n` or other requirement IDs anywhere in the UX folder.
2. The UX's analytical output is the Reflection Note: ATS match score (percent) with a verdict, matched and missing keyword chips, and one suggestion callout per gap. This lines up with the PRD's score-with-explanation and rewording-suggestion requirements, except the UX shows pointers to existing work, not concrete rewritten phrasing (see 9.1).
3. The integrity guardrail already exists as a UX rule: the Suggestion callout "Never states a qualification the student doesn't have; only reframes what's already on the CV." M-RESULT models how a real gap is worded (Kubernetes).
4. Output is download-only. No in-app editor, and no on-screen preview, copy button or regenerate action is specified for the letter or CV.
5. Norwegian (bokmål) only, for the UI and for everything the AI generates. Decided 2026-10-10 (L34). It is not in the PM memlog.
6. The UX specifies much more than "upload, then get results": accounts, Profile, History, two standalone review features, and three downloadable files per application including a tailored CV (section 8).
7. No numeric targets exist: response time, maximum file size, maximum job-ad length and the score formula are absent. The strong/weak split at 70 % is a placeholder.
8. "lagres kryptert" (stored encrypted) is a user-visible promise in the trust microcopy, so it becomes a binding requirement if that copy ships.
9. The stated accessibility target is WCAG 2.2 AA on the whole surface. By my calculation several palette pairs used for text fail 4.5:1 (section 6).
10. Single light theme, breakpoint at 640/641 px, and the full flow (upload, paste, review, download) must work in a phone browser.

---

## 1. User journeys and flows

### 1.1 IDs and persona

- **IDs exactly as they appear** (EXP, section "Key Flows"): `Flow 1 — First tailored application (Violet, first session, new user)` and `Flow 2 — Standalone CV review (Violet, weeks later, independent of any specific job ad)`. Steps are numbered inside each flow, and the mocks cross-reference them ("Flow 1, step 1 & step 4", "Flow 1, step 7 (the Climax)", "Flow 2, step 2"). A pattern search for `UJ-`, `FR-`, `NFR-`, `US-`, `AC-`, `J-`, `REQ-`, `EP-` style IDs found none. If the PRD uses `UJ-n`, add an explicit mapping line (for example `UJ-1 = Flow 1`) instead of renumbering silently.
- **Persona: Violet** ("the memlog's protagonist", EXP header and L14; the mock file names use "violet-hansen"). A university or college student applying for her first full-time job. Self-serve: there is no career-centre or institutional intermediary, and one account tier. No second persona exists (no recruiter, no admin). Not specified: programme, age, device habits, Norwegian-language level. Data in the mocks (roles such as "Frontendutvikler — Nordic Digital", the semester project "gruppeappen for emneplanlegging") is placeholder content, not requirements.

### 1.2 The two written flows

**Flow 1 — First tailored application (Violet, first session, new user)**

1. Violet lands on Home, unauthenticated. She sees the big "Lag skreddersydd søknad" CTA up front (the Kickresume-style placement) plus an empty/sample state because she has no history.
2. She taps the CTA and is routed to Signup: username, email, password.
3. Immediately after signup she is redirected to Profile: she uploads her CV (PDF) via the dropzone and fills in personal info fields.
4. She returns to Home (the CTA is now on a real, still-empty dashboard) and taps it again, landing on the Application surface. The bold "Application" navbar link is an equivalent route.
5. She pastes in a job description for a role she is targeting.
6. She submits. The Generating state shows explicit progress copy ("Sammenligner CV-en din med stillingsannonsen …"), not a bare spinner.
7. Climax: the result loads with a tailored CV, an application letter, and the Reflection Note: a "78 %-style" match score badge, matched keyword chips, missing keyword chips, and a suggestion callout explaining that «tverrfaglig samarbeid» appears in the posting but not in her CV, pointing to the semester group project that already covers it but is not phrased that way yet. For the first time she sees why the system judges her application as it does, not just a pass or fail.
8. She downloads the CV and letter files and keeps editing them in her own tools. There is no in-app editor, by design.

- Failure path: generation fails mid-request. An inline error appears, her pasted job description is preserved, and retry is available without re-pasting.
- Outcome: Violet holds a tailored CV and letter as downloaded files and understands her match and gaps. The result is also stored and appears in History `[INFERENCE from M-RESULT "Lagret." and the History row component; Flow 1 itself does not say it]`.

**Flow 2 — Standalone CV review (Violet, weeks later, independent of any specific job ad)**

1. Violet returns, already authenticated, to sanity-check her CV before a networking event, not for a specific posting.
2. From Home she uses the standalone "Review CV" entry point (a dedicated button on Home; not the Application flow, not the navbar).
3. She uploads a newer version of her CV via the dropzone.
4. The Generating state runs. With no job description supplied, the system produces a Feedback Document scoped to general CV quality: no match score, no keyword chips.
5. Climax: the Feedback Document returns general strengths and improvement suggestions, in the same evidence-first, non-cheerleading voice as the Reflection Note.
6. She downloads the feedback document. The review is saved to her History alongside past applications.

- Failure path: an unsupported file type produces an inline error at the dropzone, the upload is never sent, and no generation call is wasted.
- Outcome: Violet has a downloaded Feedback Document and a History entry of type CV review.

### 1.3 Journeys implied by the UX but not written as flows (no IDs)

| Implied journey | Basis | What is and is not defined |
|---|---|---|
| Standalone Review Application (upload an application, get a Feedback Document) | L14, L18, L21; EXP IA row "Review Application" | Defined only by analogy with Flow 2. The accepted input (letter only, or letter + CV) and the result layout are not specified. |
| Returning user logs in | EXP IA "Login" row `[CONFIRMED]` | Only "email + password". The unauthenticated navbar is not described. |
| Session expires mid-task | EXP State Patterns | Redirect to Login with a message; re-prompt of an in-progress paste or upload after login "where technically feasible". |
| Browse and reopen a past result | EXP History row component | Click opens the stored result read-only; download buttons remain. No step-by-step flow. |
| Update CV or personal info; change password | EXP IA rows Profile, Account | Fields never enumerated. |
| Unauthenticated visitor | EXP State Patterns | CTA routes to Signup. "No locked/teaser screen", so there is no try-before-signup path. |
| Any flow on a phone | EXP Responsive & Platform; M-NAV | Hamburger sheet and persistent CTA. No per-flow mobile storyboards. |

---

## 2. Screens and information architecture

### 2.1 Surfaces

| Surface (internal / UI label) | Reached from | What it shows or does | Variants and notes |
|---|---|---|---|
| Home / Hjem (mock `M-HOME`) | App open; navbar "Hjem" | Dashboard. Authenticated: greeting, big primary CTA card, two standalone review cards, "Siste aktivitet" list of recent history rows with a link to the full History. | Authenticated with history (mocked). Authenticated, empty history (not mocked): "Ingen søknader ennå. Start med din første stillingsannonse." + primary CTA. Unauthenticated (not mocked): same CTA-forward layout with an empty/sample state, CTA routes to Signup. Cold load: skeleton rows. |
| Signup / Registrer deg | Home CTA (first time); nav (unauthenticated) | Username, email, password. Label above input, inline validation on blur. | On success: redirect to Profile. |
| Login / Logg inn | Home (unauthenticated, returning); session-expiry redirect | Email + password `[CONFIRMED]`. | Expiry message: "Økten din er avsluttet. Logg inn igjen for å fortsette." |
| Profile / Profil | Navbar; redirect right after signup | CV upload dropzone (PDF/TXT) plus personal info fields. Trust line near the upload. | The personal info fields are not listed anywhere. |
| Application / Søknad (result mocked in `M-RESULT`) | Navbar "Søknad" (bold); Home CTA; mobile persistent CTA "Lag søknad" | One surface, three phases: (1) paste a job description into a plain textarea and submit; (2) Generating state; (3) result: Reflection Note on screen plus downloadable files. | Only phase 3 is mocked. The input phase layout and the submit button label are not specified. |
| Review CV / Vurder CV | Home card button only (not the navbar) | Dropzone to upload a CV, then Generating, then Feedback Document (Tilbakemelding). | Standalone, no job description, no score, no chips `[CONFIRMED]`. |
| Review Application / Vurder søknad | Home card button only | Dropzone to upload an application, then Generating, then Feedback Document. | Same as Review CV. |
| History / Historikk | Navbar (desktop); hamburger sheet (mobile); Home link "Se hele historikken" `[MOCK]` | Full list of past applications and reviews, paginated (infinite scroll is banned). Row: label, date, type, and the score badge on application rows. Click opens the stored result read-only; download buttons remain. | "Presumably paginated/searchable" is an `[ASSUMPTION]` in EXP. Only pagination is reinforced (Interaction Primitives). Search appears nowhere else. |
| Account / Konto | Navbar; hamburger sheet | Password change plus a note on encrypted storage and deletion `[CONFIRMED]`. Trust microcopy. | "No explicit fields were decided" (EXP). |
| Logout / Logg ut | Navbar; hamburger sheet | Ends the session in one click, no confirmation dialog. Returns to Home (unauthenticated). | |
| Mobile nav sheet (`M-NAV`) | Hamburger at <= 640 px | Contains Historikk, Profil, Konto, Logg ut. | See 2.3. |
| Session-expired redirect | Any surface | Login with the expiry message. | |

### 2.2 Navigation model

- Flat six-item navbar, no drawer, no nested nav. UI labels in order: Hjem, Søknad, Profil, Historikk, Konto, Logg ut. Hjem and Søknad are bold and emphasised (nav-link-primary); the other four are secondary weight. The active item takes the accent colour (DES Components); the six items and the bold pair come from L17 and L20.
- Review CV and Review Application are not navbar items. They are reachable only from Home (L21), but are available any time, not only after generating an application (L18).
- Desktop (>= 641 px): all six links inline. Mobile (<= 640 px): the links collapse into a hamburger and the compact persistent CTA "Lag søknad" stays visible outside it (L11, L24). The CTA goes to the Application flow `[CONFIRMED]`.
- Modal or sheet stacks go one level deep, never two. Esc closes the topmost sheet or modal.
- Content is single-column at every width, with a 20 px minimum side gutter.
- Logout needs no confirmation.

### 2.3 What each mocked screen contains (so the sources need not be opened)

**`M-HOME` (authenticated, with history)**
- Navbar: wordmark "JobAssistant", then Hjem (active), Søknad (bold), Profil, Historikk, Konto, and "Logg ut" right-aligned.
- H1: "Velkommen tilbake, Violet". The source of the name is unspecified.
- Subhead: "Lim inn en stillingsannonse, så forteller JobAssistant deg hvorfor søknaden din treffer – eller ikke treffer."
- CTA card: H2 "Lag skreddersydd søknad", copy "Lim inn en stillingsannonse. Få en tilpasset CV, et søknadsbrev og et refleksjonsnotat som forklarer samsvaret.", primary button "Lag skreddersydd søknad". The single dominant action on the page.
- Two review cards, each tagged "Frittstående" (standalone), each with a filled lighter-brown button: "Vurder CV" ("Last opp en CV uten å knytte den til en bestemt annonse, og få en skriftlig tilbakemelding.") and "Vurder søknad" ("Last opp en søknad og få vite hva som er sterkt, og hva som kan bli bedre.").
- Section "Siste aktivitet" with the link "Se hele historikken". Rows, newest first: "Frontendutvikler — Nordic Digital", "Søknad · 8. sep. 2026", tag "Søknad", badge "78 %" (strong); "Junior produktanalytiker — Fjord Analytics", "Søknad · 27. aug. 2026", tag "Søknad", badge "54 %" (weak); "CV-vurdering — generell sjekk", "CV-vurdering · 12. aug. 2026", tag "CV-vurdering", no badge.

**`M-RESULT` (application result)**
- Navbar with "Søknad" active.
- H1 = "{role} — {company}" ("Frontendutvikler — Nordic Digital"). Subhead "78 % samsvar. Her er hvorfor."
- Card labelled "ATS-SAMSVAR": badge "78 %" (strong styling) beside the verdict "Sterkt samsvar – CV-en din dekker det meste annonsen ser etter."
- "NØKKELORD DU HAR" chips with ✓: React, TypeScript, REST APIs, Smidig utvikling, Git.
- "NØKKELORD SOM MANGLER" chips with ✕: Tverrfaglig samarbeid, Kubernetes. A plain-text line follows: "Mangler: tverrfaglig samarbeid, Kubernetes."
- "FORSLAG" with two callouts:
  - Rewording type: "Rekrutterere som ser etter folk til denne stillingen, leter etter «tverrfaglig samarbeid». Søknaden din viser det ikke ennå." then "Semesterprosjektet ditt om gruppeappen for emneplanlegging dekker trolig dette – vurder å ta det med."
  - Real-gap type: "Kubernetes står blant kravene i annonsen, men finnes ikke i CV-en din." then "Har du ikke brukt det selv, kan dette være et reelt hull og ikke bare et spørsmål om ordvalg. Tenk over om et emne eller prosjekt berørte containerorkestrering før du legger det til."
- "Filene dine" with three download rows (filename, description, "Last ned" button):
  - `violet-hansen-cv-nordic-digital-2026.pdf`, "Tilpasset CV" (primary button)
  - `violet-hansen-soknadsbrev-nordic-digital-2026.pdf`, "Søknadsbrev" (primary button)
  - `violet-hansen-refleksjonsnotat-nordic-digital-2026.pdf`, "Refleksjonsnotat — samsvar, nøkkelord, forslag" (secondary-styled button)
- Footer note: "Lagret. Last ned filene dine nedenfor." (rendered below the file rows).
- Not shown: the letter or CV text, any regenerate, new-application or back-to-history action, a weak-match variant, any copy explaining how the score is calculated.

**`M-NAV` (two 375 px phone frames)**
- Closed: wordmark left; compact persistent CTA "Lag søknad" (min height 44 px) and a 44 x 44 hamburger (`aria-label="Åpne meny"`, `aria-expanded="false"`) right. Page body shows only the Home heading and subhead.
- Open: the hamburger becomes a close icon (`aria-label="Lukk meny"`, `aria-expanded="true"`). A sheet drops below the navbar with Historikk, Profil, Konto, Logg ut (each at least 44 px tall). The page body is dimmed.
- The sheet does not contain Hjem or Søknad (see 9.2 and 9.3).

---

## 3. Functional capabilities the UX implies

### 3.0 Quick answers

| Capability | UX position |
|---|---|
| Upload formats | CV and the Review inputs: PDF and TXT only; anything else is rejected inline before any request. Job ad: pasted text, plain textarea. DOCX is not accepted and not mentioned as out of scope. |
| History of past applications | Yes. Home shows a recent list; History shows the full list; stored results reopen read-only with downloads. |
| Editing the letter in the app | No. Rejected twice (L16, L19; EXP Anti-patterns): download and edit externally. |
| Copying the letter | Not mentioned anywhere. |
| Letter or CV preview on screen | Not specified; L19 says output is "not shown/edited in-browser". Only the Reflection Note content is shown on screen. |
| Score breakdown UI | Score badge + verdict + matched and missing keyword chips + per-gap callouts. No per-category breakdown, no formula, no "X of Y keywords" count. |
| Login and account | Yes: Signup (username, email, password), Login (email + password), Logout, session expiry, Profile, Account (password change + a data note). |
| Deletion | Not specified, beyond an Account "note on encrypted data storage/deletion" `[CONFIRMED as a data note]`. No delete control for items, CV or account. |
| Export | Only per-file download of generated documents. No account-data export. |

### 3.1 Accounts and sessions
- Self-service signup with username, email and password; inline validation on blur, errors tied to the field with `aria-describedby`.
- After signup, redirect straight to Profile.
- Login with email + password `[CONFIRMED]`. Logout in one click with no confirmation.
- Detect an expired session anywhere and redirect to Login with a message. Keep an in-progress paste or upload "where technically feasible" and re-prompt after login `[ASSUMPTION]`.
- Password change in Account `[CONFIRMED]`.
- Unauthenticated users see only Home (CTA-forward), Signup and Login; all other surfaces sit behind login `[INFERENCE]`.
- Not specified: password rules, password reset, email verification, what the username is used for (Login uses email), rate limiting, social login, session length, account deletion.

### 3.2 Profile and CV storage
- One profile per user holding the CV file (PDF/TXT) plus personal info fields (never enumerated; at minimum a first and last name, because file names and the greeting use one `[INFERENCE]`).
- Re-uploading replaces the file (re-drag replaces it).
- The Application flow only asks for the job description (Flow 1 step 5), so it must use the CV stored in Profile `[INFERENCE]`.
- CV and generated documents stored encrypted. The trust line "CV-en din og dokumentene som lages, lagres kryptert." appears near the CV upload and in Account `[CONFIRMED]`.
- Not specified: several CVs or versions, deleting the CV, previewing or correcting the parsed CV text, whether a Review CV upload overwrites the Profile CV.

### 3.3 Application generation (core flow)
- Input: a job description pasted into a plain textarea (no rich formatting).
- Output, three artifacts: a tailored CV, an application letter, and the Reflection Note.
- Reflection Note content: ATS match score as a percentage (one per application), a strong or weak classification against a threshold (placeholder >= 70 %, "a config value the PRD/architecture should confirm"), matched keywords, missing keywords, and one suggestion per identified gap.
- Each suggestion states, in order: what is missing; why it matters (recruiter or ATS framing); and, when available, which of the student's own coursework, projects or extracurriculars could legitimately cover it.
- Integrity rule: never state a qualification the student does not have; only reframe what is already on the CV. When the CV holds no evidence, say it is a real gap (M-RESULT Kubernetes callout) and leave the decision to the student.
- Every suggestion, gap and score carries a plain-language reason (the "AI transparency" pillar; EXP Anti-patterns: "this isn't negotiable scope, it's the product's stated differentiator").
- Everything generated is in Norwegian bokmål.
- While generating, show explicit descriptive progress copy and announce it via `aria-live="polite"`.
- On failure, preserve the input and allow retry in place.
- On success, save the result automatically (M-RESULT "Lagret.") so it appears in History.
- Derive a job title and company for the page heading, the History label and the file names `[INFERENCE; the UX never says whether they are extracted from the pasted text or typed in]`.
- Strong and weak styling, labels and verdict sentence depend on the threshold. Only the strong verdict is written out.

### 3.4 Downloads
- Direct browser file download per artifact. No in-app viewer, editor, clipboard copy, share, email or "download all".
- Three files per application in M-RESULT: tailored CV, letter, Reflection Note. Names follow `{firstname}-{lastname}-{doctype}-{company}-{year}.pdf`, ASCII only (`soknadsbrev`, `refleksjonsnotat`), so they survive every file system and email client. EXP gives the CV and letter names as examples; the Reflection Note name is `[MOCK]`.
- File format is PDF in every example. The Reflection Note format is explicitly open: "on-screen only, PDF, or plain text" `[ASSUMPTION]`.
- The Feedback Document is also downloadable (Flow 2 step 6). Its format and file name are not specified.

### 3.5 Standalone reviews
- Review CV: upload a CV (PDF/TXT) via a dropzone, with no job description, then get a Feedback Document with general strengths and improvements, in the same evidence-first voice. No score, no keyword chips `[CONFIRMED]`. Saved to History.
- Review Application: upload an application (PDF/TXT), then get a Feedback Document of the same kind.
- Both entered from Home only, available at any time.
- Feedback Document structure is not specified.

### 3.6 History
- A per-user, persisted list of applications, CV reviews and application reviews.
- Row: label, date, type tag, and the score badge on application rows. Click opens the stored result read-only and downloads stay available. The Home "Siste aktivitet" list shows the recent subset.
- Paginated (infinite scroll banned, so "the third application I made" can be referenced reliably). Search is `[ASSUMPTION]`.
- Cold-load skeleton rows and the empty state.
- A stored result must keep the score, matched and missing keywords, suggestions and the generated files `[INFERENCE]`.
- Not specified: deleting or renaming an item, sorting or filtering, page size, the label of the "application review" type, and the layout of a stored Review result.

### 3.7 Shared upload component
- A real `<input type="file">` with an accessible name; drag-and-drop is progressive enhancement over it; click-to-browse always works.
- PDF and TXT only, validated before any request. After acceptance it shows filename and size. Indeterminate progress while uploading, with cancel while in flight.
- Rejection is inline at the dropzone (error outline): "Bare PDF- og TXT-filer støttes." or "Filen er for stor." No toast.
- Used on Profile, Review CV and Review Application.

### 3.8 Interaction details
- Tapping or clicking a missing-keyword chip expands its paired suggestion callout if collapsed (mobile) or scrolls to it (desktop). So each missing chip links to one callout `[INFERENCE: one-to-one pairing]`.
- Norwegian formatting in code: "78 %" (space before the percent sign), dates as "8. sep. 2026", «sjevroner» for quoted terms, `lang="nb"` on every page.
- Offline or failed request shows an inline banner (no offline-first behaviour).

### 3.9 Data the UX implies the system must hold `[INFERENCE]`
- User: username, email, credential, session.
- Profile: personal info fields (TBD), CV file and extracted text.
- Application record: job description text; job title; company; created date; integer score; strong or weak flag; matched keywords; missing keywords; suggestions (missing phrase, reason, optional pointer to the CV item); generated letter; generated CV; Reflection Note.
- Review record: type (CV or application), uploaded file, Feedback Document, created date.
- All of it encrypted at rest.

### 3.10 Explicitly NOT required (EXP Foundation, Anti-patterns, memlog)
In-app output editing; voice-learning from past applications; multi-language support; job-board integration or auto-apply; interview prep; LinkedIn import; native mobile app; dark mode or a theme toggle; institutional or career-centre accounts; gamified praise; infinite scroll, carousels, drag-to-reorder; offline-first behaviour; a keyboard-shortcut layer; a locked or teaser screen for visitors.

---

## 4. States

### 4.1 State catalogue

| State | Where | Treatment and copy |
|---|---|---|
| Unauthenticated | Home | Same layout as authenticated Home; "Lag skreddersydd søknad" routes to Signup. No locked or teaser screen. |
| Empty history | Home, History | "Ingen søknader ennå. Start med din første stillingsannonse." plus the primary CTA. |
| Cold load | Home, History | Skeleton rows matching the eventual list layout; resolves when data arrives. |
| Uploading | Profile, Review CV, Review Application | Dropzone shows filename and indeterminate progress; cancel is available while in flight. |
| Upload accepted | same | Filename and size shown; re-drag replaces the file. |
| Upload rejected | same | Inline, error colour, at the dropzone, no toast: "Bare PDF- og TXT-filer støttes." / "Filen er for stor." Raised before any upload request fires. |
| Generating | Application (after submit), Review CV, Review Application | Explicit progress state, not a bare spinner. Copy says what is happening: "Sammenligner CV-en din med stillingsannonsen …". Announced via `aria-live` (polite). |
| Generation failed | same | Inline error: "Noe gikk galt da søknaden skulle lages. Stillingsannonsen/filen din er ikke borte – prøv igjen." Input preserved; retry in place without re-pasting. |
| Result ready | same | Reflection Note or Feedback Document renders; download button(s) enabled. "Lagret. Last ned filene dine nedenfor." |
| Strong match | Result, History row, Home row | Success-styled pill badge plus the label "Sterkt samsvar". |
| Weak match | same | Warning-styled pill badge plus the label "Bør forbedres". Verdict sentence for weak is not written. |
| Form validation error | Signup, Login, Profile, Account | Inline and field-level, error colour, tied to the field via `aria-describedby`. Never a blocking page-level modal. Validation runs on blur, not on every keystroke. |
| Session expired | Global | Redirect to Login with "Økten din er avsluttet. Logg inn igjen for å fortsette." Where feasible, an in-progress paste or upload is not silently discarded. `[ASSUMPTION]` |
| Offline or request failed | Global | Inline banner (not a toast): "Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen." No offline-first or local-write behaviour. `[ASSUMPTION]` |
| Mobile nav closed or open | <= 640 px | Closed: wordmark, persistent CTA, hamburger. Open: sheet with four links, body dimmed, Esc closes. |
| Logout | Global | Immediate, no confirmation. |

### 4.2 How long things take
- No duration is stated anywhere in the UX docs, and there is no latency target, timeout or progress percentage. The only statement is that generation "can take real processing time (LLM calls); the wait itself should not feel like a black box either" (EXP State Patterns). Uploading uses an indeterminate indicator.
- Cancel exists for uploads only. No cancel or timeout is specified for generation.
- The failure example in Flow 1 ("generation fails mid-request") implies a request that is in flight while the user waits. Whether it is a synchronous request or a background job is not specified.

### 4.3 Edge cases the UX does not define `[FLAG]`
- Application started with no CV in Profile (a guard state or redirect).
- Uploaded file passes the type check but yields no usable text (scanned or image-only PDF, password-protected PDF, multi-column layouts, odd TXT encoding).
- Empty, very short, very long, non-job-ad or non-Norwegian pasted text.
- Score 0 %, 100 %, no missing keywords (an empty "Forslag" section), many missing keywords (no cap or prioritisation of callouts).
- Double submit, refresh or navigating away while generating.
- Maximum file size (only the message exists) and how a size error differs for the Profile CV versus a Review upload.
- History at scale (page size, last page), or a stored result whose files can no longer be produced.
- Review flows when no job description is supplied but the Feedback Document row in EXP mentions reuse of the score panel "where a job description was supplied" (see 9.3).
- Review buttons or the persistent CTA for an unauthenticated visitor.

---

## 5. Content and language

### 5.1 Language decision
- **Norwegian (bokmål) only**, decided 2026-10-10 (L34). The whole interface and everything the product generates (the application letter, CV suggestions, gap analysis, explanations) are Norwegian. There is no language switch. Multi-language support is explicitly out of scope.
- The spines keep English names (Home, Application, Reflection Note, …) as internal identifiers. The user-facing labels are the Norwegian ones:

| Internal name | UI label |
|---|---|
| Home | Hjem |
| Application | Søknad |
| Profile | Profil |
| History | Historikk |
| Account | Konto |
| Logout | Logg ut |
| Signup / Login | Registrer deg / Logg inn |
| "Create tailored application" (Home CTA) | Lag skreddersydd søknad |
| "Create application" (persistent CTA) | Lag søknad |
| Review CV / Review Application | Vurder CV / Vurder søknad |
| Reflection Note | Refleksjonsnotat |
| Feedback Document | Tilbakemelding |
| ATS match score (card label) | ATS-samsvar |
| Matched / missing keywords | Nøkkelord du har / Nøkkelord som mangler |
| Suggestions | Forslag |
| Strong match / Needs work | Sterkt samsvar / Bør forbedres |
| Download | Last ned |

- Strings that appear only in the mocks `[MOCK]`: "Velkommen tilbake, {name}", "Frittstående", "Siste aktivitet", "Se hele historikken", "Filene dine", "Tilpasset CV", "Søknadsbrev", "CV-vurdering" (History type), "Mangler: …", "Åpne meny" / "Lukk meny".
- Formatting rules: a space before the percent sign ("78 %"); dates like "8. sep. 2026"; «sjevroner» for quoted terms; downloaded file names stay ASCII (`soknadsbrev`, not `søknadsbrev`); `lang="nb"` on every page; fonts must render æ, ø, å; Norwegian compound words run long, so buttons, chips and labels size to their content and may wrap, never truncate or use a fixed width.
- Input language is not constrained anywhere (see 9.1).

### 5.2 Tone of voice
- Warm, editorial, evidence-first. Explicitly not playful (Kickresume's tone was rejected), and since the colour reversal also not "clinical".
- Plain bokmål, address the user as "du" (never formal "De"). No English loanwords where a common Norwegian word exists, no literal translations from English.
- Direct sentences: state the fact, then the reason. No cheerleading, no exclamation marks, no emoji, no gamified praise.
- Never imply the system invented or added a qualification on its own.

| Do | Don't |
|---|---|
| "78 % samsvar. Her er hvorfor." | "Wow, så bra! [party emoji] 78 % samsvar!" (the source example contains an emoji) |
| "Mangler: Kubernetes, smidig sertifisering." | "Oi, du mangler noen nøkkelord!" |
| "Rekrutterere som ser etter folk til denne stillingen, leter etter «tverrfaglig samarbeid». Søknaden din viser det ikke ennå." | "Du bør legge til flere ferdigheter." |
| "Semesterprosjektet ditt om X dekker trolig dette – vurder å ta det med." | "Vi har fikset dette for deg." |
| "Lagret. Last ned filene dine nedenfor." | "Suksess!! Dokumentene dine er klare!!" |

### 5.3 How scores and feedback are explained to the user
1. Page subhead states the score and promises the reason: "78 % samsvar. Her er hvorfor."
2. Card "ATS-SAMSVAR": a monospace score in a pill badge, plus a one-sentence verdict.
3. Keywords in two labelled groups ("Nøkkelord du har" with ✓ and "Nøkkelord som mangler" with ✕), plus a plain-text "Mangler: …" line.
4. "Forslag": one callout per gap, in a fixed order: what is missing, why it matters (recruiter or ATS framing), and which of the student's own work could legitimately cover it.
5. Hedged inference language, so the student decides: "dekker trolig dette – vurder å ta det med".
6. Honest gap framing when no evidence exists: "kan dette være et reelt hull og ikke bare et spørsmål om ordvalg. Tenk over om … før du legger det til."
7. Colour semantics are fixed and narrow: success green means only a strong match or a matched keyword; warning goldenrod means only a weak match or a missing keyword; error red means only system failure or form validation; the single brown accent means actions and AI-authored insight (the callout rail).
8. The UX contains no copy that explains how the score is calculated (formula, what counts as a keyword). It explains the score by example (chips and callouts) only.

### 5.4 Microcopy inventory (verbatim)
- Progress: "Sammenligner CV-en din med stillingsannonsen …"
- Saved: "Lagret. Last ned filene dine nedenfor."
- Empty: "Ingen søknader ennå. Start med din første stillingsannonse."
- Errors: "Bare PDF- og TXT-filer støttes." / "Filen er for stor." / "Noe gikk galt da søknaden skulle lages. Stillingsannonsen/filen din er ikke borte – prøv igjen." / "Økten din er avsluttet. Logg inn igjen for å fortsette." / "Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen."
- Trust line: "CV-en din og dokumentene som lages, lagres kryptert."

---

## 6. Accessibility, responsiveness and platform

### 6.1 Commitments (EXP Accessibility Floor, Interaction Primitives, Responsive & Platform)
- **WCAG 2.2 AA across the full responsive web surface.**
- Match and keyword meaning is never colour-only: every chip pairs colour with a ✓ or ✕ glyph and text, and every badge pairs colour with text ("Sterkt samsvar" / "Bør forbedres").
- Every upload has a labelled real file input; drag-and-drop is an enhancement only.
- Focus rings use the accent colour at AA contrast against both the page and the surface colours.
- Form errors are associated with their field via `aria-describedby`, not colour alone.
- The generating state is announced with `aria-live="polite"`.
- `lang="nb"` on every page.
- Downloaded files get descriptive names, not `output.pdf`.
- Touch targets >= 44 px on all interactive elements. `Tab` follows reading order, `Enter` submits the focused form, `Esc` closes the topmost modal or sheet. No custom shortcut layer.
- Banned: infinite scroll on History, auto-advancing carousels, drag-to-reorder. Click or tap works everywhere; drag-and-drop is never the only path.
- Hamburger: `aria-label` "Åpne meny" / "Lukk meny" and `aria-expanded` `[MOCK]`.

### 6.2 Responsive and platform
- Breakpoints: >= 641 px full navbar; <= 640 px hamburger plus persistent CTA outside it.
- Single-column content at all widths, minimum 20 px side gutter, no side-by-side panels that force horizontal scroll on a phone.
- Web app only. No native mobile app exists or is planned; "responsive" means upload, paste, review and download must all work in a phone browser.
- One light theme, no dark mode, no mode toggle.
- Delivery target: a working end-to-end demo by early December 2026 (per brief, quoted in EXP Foundation).
- Not specified: a browser and OS support matrix, performance budget, cookie or consent handling, analytics.

### 6.3 Contrast: what the docs say, and what I calculate `[FLAG]`
The docs verify only two pairs: the focus ring (accent on background about 4.53:1, "computed by hand, not tool-verified"; on surface about 5.0:1) and the review button label (accent-strong on accent-text about 3.8:1, noted as under 4.5:1 and "worth revisiting"). The table below is my own calculation (WCAG relative-luminance formula; tinted fills composited over the surface colour). Re-check with a proper tool before relying on it. WCAG 2.2 AA thresholds: 4.5:1 for normal text; 3:1 for large text (at least 24 px, or at least 18.66 px bold) and for UI components.

| Pair (where used) | Ratio | Result at 4.5:1 |
|---|---|---|
| text #3A2A1D on background / surface | 10.97 / 12.25 | pass |
| text-secondary #8A7157 on background / surface (11 px labels, 13 px meta, secondary nav) | 3.66 / 4.09 | fail |
| accent #7F6244 on background (focus ring, links) | 4.49 | just under (doc says about 4.53); acceptable as a 3:1 ring, short as text |
| accent #7F6244 on surface | 5.02 | pass |
| accent-text #FFF6EE on accent (primary button) | 5.27 | pass |
| accent-text on accent-strong #937A62 (review button, 15 px bold) | 3.78 | fail: 15 px bold is below the large-text threshold |
| success #4C7A3F on its tinted chip fill (13 px chip, 16 px badge) | 3.98 (4.50 on plain surface) | fail on the tint |
| warning #B8860B on its tinted chip fill (13 px chip, 16 px badge) | 2.59 (2.90 on plain surface) | fail, and under 3:1 |
| error #A8341F on surface | 5.90 | pass |
| accent-strong emphasis text inside the suggestion callout (14 px, semibold) | 3.09 | fail |

Implication: the glyph-plus-text rule satisfies the not-colour-only requirement but does not exempt the text from the contrast minimum. The "missing keyword" chips, the weak-match badge and the callout emphasis, which are the core transparency elements, are the weakest pairs. The PRD either needs a palette adjustment or a reworded commitment (for example, AA with documented exceptions).

---

## 7. Decisions in the UX memlog (`.memlog.md`), including reversals

### 7.1 In order

| Line | Type | Decision | Status now |
|---|---|---|---|
| L6 | decision | Brief and addendum (brief-JobAssistant-2026-09-11) inherited by reference | Current |
| L7 | decision | Platform: web app | Current |
| L8 | decision | Dislikes Teal's UI; likes Kickresume's habit of putting "start your application" at the front, not buried | Current |
| L9 | decision | Colour: black background, white text, dark, high contrast | Superseded (L26, L28) |
| L10 | decision | Top navbar whose key buttons stay visible even as the navbar collapses | Current (realised by L11, L24) |
| L11 | decision | Mobile: nav links collapse into a hamburger; the key CTA stays outside it, always visible | Current |
| L12 | decision | Brand mood: professional and sharp, not playful or colourful like Kickresume | Reopened by L26; "not playful" survives |
| L13 | decision | Must work well in a phone browser; no native app; "dark mode only, no light mode toggle" | Phone-browser and no-native current; dark-only superseded (L28) |
| L14 | decision | Key journey (Violet): Home with application list and big CTA, then signup (username/email/password), then Profile (CV upload + personal info), then Home CTA or navbar Application, then paste job description, then generation of tailored CV + letter + reflection note (gaps + ATS-screening explanation), then manual adjustment of output, plus separate Review CV and Review application buttons | Current (basis of Flow 1 and Flow 2) |
| L15 | decision | Colour theme "Violet Precision" (#8B7CF6 on #0A0A0A) | Superseded (L26, L28) |
| L16 | decision | Output is downloaded and edited externally; no in-app editor | Current |
| L17 | decision | Navbar items: Home, Application, Profile, History, Account, Logout | Current |
| L18 | decision | Review CV and Review application are standalone, reachable any time, not only after generating an application | Current |
| L19 | decision | Generated output is delivered as a downloadable file, not shown or edited in the browser | Current (the Reflection Note content is nevertheless shown on screen in M-RESULT) |
| L20 | decision | Navbar final: flat six buttons; Home and Application bold | Current |
| L21 | decision | Review entry points live on Home, not in the navbar | Current |
| L22 | decision | Fast path for remaining detail (components, microcopy, accessibility, states), drafted with [ASSUMPTION] tags | Process |
| L23 | decision | Nine [ASSUMPTION] items confirmed as-is (listed in section 0) | Current |
| L24 | change | Mobile persistent CTA was too crowded: label shortened ("Create application", Norwegian "Lag søknad") and rendered compact. Home keeps the full label. | Current |
| L25 | event | Beige palette explored as a preview-only comparison | History |
| L26 | override | **Reversal:** dark theme abandoned for light beige "Warm Editorial" with a pink accent; the brand-mood decision reopened | Pink dropped in L28 |
| L27 | event | Brown/mocha accent explored as an alternative to pink | History |
| L28 | decision | **Final colour decision:** beige light theme with "Rich Mocha" brown accent; single light theme, no dark mode; mood warm, editorial, human | Current |
| L29 | decision | Review buttons on Home are filled with a lighter brown, not outline or secondary | Current |
| L30 | decision | Final accent hex set by the user: accent #7F6244, accent-strong #937A62; contrast of accent-strong on accent-text about 3.8:1 flagged | Current |
| L31 to L33 | event | Structure-lens and prose-lens polish; spines finalised | Process |
| L34 | decision (2026-10-10) | Language: Norwegian only (bokmål); Language section with glossary and formatting rules added; all microcopy and mocks translated | Current |

### 7.2 Reversals and superseded decisions

| What changed | From | To |
|---|---|---|
| Colour mode | Dark only: black background, white text, Violet Precision (L9, L13, L15) | Single light theme, no toggle (L26, L28). Reason: the user's preview comparison and explicit preference for beige over dark. |
| Accent colour | Indigo-violet #8B7CF6 | Pink explored (REC section 3: Dusty Rose, Coral-Pink, Berry) and dropped; Rich Mocha brown (L28); then hand-tuned to #7F6244 / #937A62 (L30) |
| Brand mood | Professional and sharp, "technical and precise, almost clinical" (L12, L15) | Warm, editorial, human; still evidence-first and not playful (L26, L28; DES Brand & Style) |
| Warning colour | Amber (dark theme) | Goldenrod #B8860B, to stay distinct from the brown accent (DES, REC section 4; not logged in the memlog itself) |
| Review button style | Plain outline or secondary | Filled lighter brown (L29) |
| Mobile CTA label | "Create tailored application" | "Create application" / "Lag søknad", compact (L24) |
| Language | English labels and mocks | Norwegian only (L34) |

Stale documentation: the final token table in `REC` still shows the superseded accent values (#6B4226 / #96603A, accent-bg #6B42261F). `DES` frontmatter (#7F6244 / #937A62) is authoritative.

---

## 8. Possible scope creep beyond a simple "upload, then get results" MVP `[FLAG]`

Baselines used: (a) the MVP as described to me (CV + job ad in; letter, code-calculated score with explanation, missing qualifications and rewording suggestions out; never suggest skills the user lacks); (b) EXP Foundation's own v1 list, attributed to the brief: CV upload, job-description paste-in, tailored letter generation, CV suggestions, gap analysis, ATS match score, accounts with encrypted storage; (c) the PM memlog's definition of done, which includes user login and encrypted storage. Login and encrypted storage are therefore not flagged as creep. I did not read the brief, so cross-check my claims that an item is missing from the v1 list against it.

Scale check: the UX defines about ten surfaces, three generated artifacts per application and two standalone review features, for a deadline of early December 2026 (about 4 to 5 weeks from the PRD date).

| Item | Where in the UX | Why it may be creep | Suggested handling (mine) |
|---|---|---|---|
| **Tailored CV as a generated, downloadable document** (highest risk) | EXP IA (Application), Flow 1 steps 7 and 8, M-RESULT, L14 | The DoD names a tailored letter and rewording suggestions, not a rewritten CV; the Foundation v1 list says "CV suggestions". A full CV document adds a second long generation, a layout and PDF step, extra LLM cost against a limited budget `[INFERENCE]`, and it is where an invented skill is most likely to slip in. | Decide: suggestions only (callouts), or a generated CV. If kept, restrict it to rewording content already in the uploaded CV. |
| **Standalone Review CV and Review Application** | EXP IA, Flow 2, L14, L18, L21, Home cards | Two additional AI features, each with its own input, prompt, Feedback Document type, History type and Home card. Not in the Foundation v1 list or the DoD. Review Application has no flow and no input definition. | Out of MVP; at most Review CV as a stretch item. |
| **History, including the Home "Siste aktivitet" list** | EXP IA, Component Patterns, State Patterns, Interaction Primitives | Needs persisted full results, a paginated list, a read-only result view, empty and loading states; search is assumed. Not in the v1 list or the DoD (although "stored data" implies some storage). | Minimal version (newest first, reopen, download) or defer. No search. |
| **Reflection Note as a separate downloadable file** | EXP IA, M-RESULT | A third generated file whose format is undecided and whose content is already on screen. | On-screen only, or fold into a single download. |
| **Three PDF files with descriptive names** | EXP Accessibility Floor, M-RESULT | Needs server-side PDF rendering, extraction of company and role from free text, and an ASCII-slug rule for names and companies. | Fewer files; simple naming. |
| **Profile with personal info fields** | EXP IA | The fields are never listed, and each one must feed the letter or CV. A stored CV is probably needed (Flow 1 only asks for the job description), but the personal-info set is open-ended. | Limit to the fields the letter header needs. |
| **Account page** (password change + data note) | EXP IA `[CONFIRMED]` | Small, but the "deletion" wording may grow into a delete-account or erase-data requirement. | Password change plus a static note. |
| **Session-expiry recovery that preserves drafts** | EXP State Patterns | "Where technically feasible" is optional polish. | Should-have, not must-have. |
| **WCAG 2.2 AA on the whole surface** | EXP Accessibility Floor | Heavy for the time available, and the current palette fails AA in several text pairs (6.3). | AA for the core flow with documented exceptions, or a palette tweak. |
| **Unauthenticated Home with a "sample" state** | EXP State Patterns, Flow 1 step 1 | Needs sample content that is never defined. | Static explanatory copy. |
| **Chip-to-callout linking; collapsible callouts on mobile** | EXP Component Patterns | Interaction polish. | Optional. |
| **Skeleton loaders; upload cancel in flight** | EXP State Patterns | Polish. | Optional. |
| **Threshold as a config value** | EXP Match Score panel | Configuration plumbing. | A constant in code is enough `[INFERENCE]`. |
| **Responsive nav with hamburger sheet and persistent CTA** | EXP Responsive, M-NAV | Phone-browser support is a stated requirement, so not creep. The sheet and CTA add modest work. | Keep. |

---

## 9. Open questions and gaps in the UX docs

### 9.1 Decisions the UX leaves to the PRD (highest impact first)
1. **What is a "tailored CV"?** EXP's Foundation lists "CV suggestions"; Flow 1, the IA table, M-RESULT and L14 describe a tailored CV file. Is it a regenerated document, or the original plus suggestions?
2. **Is the letter shown on screen?** L19 says output is not shown in the browser. If it is download-only, the student cannot see the letter, or catch an invented skill, before leaving the app. Copy-to-clipboard, regenerate and tone options are not addressed.
3. **Output file format.** All examples are `.pdf`, yet the plan is to edit externally (L16), which suggests an editable format. The Reflection Note format is explicitly TBD.
4. **Score definition.** The UX does not say who computes the score (the PM memlog says code), how keywords are extracted, whether they are weighted (required vs preferred), how matching copes with Norwegian inflection and compound words or with English tech terms and synonyms, or whether the chips show all keywords or the top N. In `M-RESULT` the visible chips are 5 matched and 2 missing (5/7 is about 71 %) next to a score of 78 %. The mock is illustrative, but because the product promises explanation by concrete example, the score and the displayed keywords must reconcile. Consider showing counts ("X av Y nøkkelord").
5. **Strong/weak threshold.** 70 % is a placeholder. L23 records the user accepting it, while EXP still calls it "a config value the PRD/architecture should confirm". The weak-match verdict wording is not written.
6. **What the "explanation" must contain.** The UX explains by chips and callouts but has no copy about how the score is calculated. Calling a keyword-overlap estimate "ATS-samsvar" could be read as a real ATS result; consider saying what it is and is not `[suggestion]`.
7. **Rewording suggestions.** The callouts point to existing work ("vurder å ta det med") but never show concrete before and after phrasing. If the PRD requires explicit rewording suggestions, that goes beyond the UX pattern.
8. **Integrity verification.** The UX states the rule but gives no mechanism or evidence display, for example quoting the CV passage that supports a suggestion, or the job-ad sentence behind "why it matters". The PRD needs testable criteria (for example: every suggestion cites a CV passage; no new skill appears in generated files that is absent from the CV).
9. **Performance.** No latency target, timeout or generation cancel; synchronous request vs background job; behaviour on refresh or navigating away mid-generation.
10. **Limits.** Maximum file size (only the message "Filen er for stor." exists), maximum job-ad length, page count, and what happens with unreadable PDFs or text that is not a job ad. DOCX is unsupported, although many students write their CV in Word.
11. **Input language.** Output is Norwegian, but the CV or job ad may be in English (common in tech roles; the mock itself mixes English tech keywords with Norwegian ones). Not addressed.
12. **Review flows.** In or out of the MVP; the input of Review Application; whether an optional job description can be supplied (see 9.3).
13. **Data lifecycle.** Deleting an item, the CV or the account; retention; export; privacy notice. The UX has only an Account "note". The trust line promises encryption of the CV and generated documents, and says nothing about sending data to an AI provider.

### 9.2 Further gaps by area
- **Auth and account:** password rules; reset and "forgot password"; email verification; role of the username (Login uses email); source of the name in "Velkommen tilbake, Violet"; unauthenticated navbar contents; session length.
- **Profile:** the personal info fields; multiple CVs or versions; what the Application flow does with no CV on file; whether the Review CV upload replaces the Profile CV; whether the parsed CV text is shown for correction.
- **Application input phase:** layout and submit button label; whether job title and company are typed or extracted; max length; handling a repeat of the same job description.
- **Result:** letter content, structure, length and tone; ordering and cap of callouts; empty "Forslag" state; actions after the result (regenerate, new application, go to History); whether matched keywords show where in the CV they were found.
- **History:** deleting or renaming; sort, filter, search; page size; label of the application-review type; look of a stored Review result; row affordance (hover, focus, chevron).
- **Home:** sample content for visitors; whether the Review cards show for unauthenticated users; the mobile Home layout (the `M-NAV` body shows only a heading and subhead).
- **Navigation:** on mobile the sheet has no Hjem or Søknad link (Søknad is covered by the CTA; Hjem is not covered unless the wordmark links home, which is not stated); CTA behaviour for unauthenticated mobile users.
- **Feedback Document:** structure, sections, length, file format and name.
- **Accessibility:** the contrast gaps in 6.3; a testing plan; focus management after route changes and inline errors; focus trap in the sheet; reduced-motion handling.
- **Platform:** browser and OS matrix; performance budget; cookie or consent handling; legal or privacy pages.

### 9.3 Inconsistencies and defects inside the UX docs
- EXP's Feedback Document row says it reuses the score panel "where a job description was supplied", but the IA, Flow 2 and L23 say standalone reviews have no job description, no score and no chips. No optional job-description input is specified on any Review surface.
- EXP Foundation lists "CV suggestions" while Flow 1, the IA table and M-RESULT deliver a "tailored CV".
- The microcopy "Lagret. Last ned filene dine nedenfor." says "below", but M-RESULT places that note under the file rows.
- The generic failure copy "Noe gikk galt da søknaden skulle lages. Stillingsannonsen/filen din …" is written for the Application flow and is reused with a slash for the review flows; it needs per-flow variants.
- Spec says single-column at all widths, but `M-HOME` shows the two review cards side by side and the CTA card as copy plus button in a row. `M-NAV` uses 16 px side padding against the 20 px minimum gutter. The spine wins.
- `M-HOME` rows show the type twice (meta line "Søknad · date" and the "Søknad" tag).
- `REC` final token table is stale (see 7.2). The `M-NAV` code comment says 400 px frames while the CSS uses 375 px.
- `DES` calls the review-button contrast acceptable for "large/bold UI text", but its label is 15 px bold, which WCAG does not treat as large text `[my reading]`.
- Esc "closes the topmost modal/sheet", but the only overlay defined is the mobile nav sheet.

### 9.4 Tensions with the PM's recorded decisions (PRD `.memlog.md`)
- **Job ad input:** the PM definition of done says "upload CV + job ad"; the UX specifies pasting the job description into a textarea. No upload, URL import or file input exists for the job ad.
- **Output set:** the DoD lists a tailored letter; the UX delivers a tailored CV, a letter and a Reflection Note.
- **Score computation:** the PM memlog says the score is calculated in code, deterministic, with concrete keyword examples; the UX does not say who computes it.
- **Language:** Norwegian-only for the UI and generated output (L34) does not appear in the PM memlog and must be carried into the PRD.
- **Rewording:** the PM guardrail says suggestions only reword existing CV content into job-ad keywords; the UX callouts point to existing work but do not show rewordings.
- **Budget:** the PM notes a limited AI budget; each extra generated artifact (tailored CV, Feedback Documents, prose in the Reflection Note) is another LLM call `[INFERENCE]`.
- **Aligned:** login and encrypted storage are required in both places. The UX trust line "lagres kryptert" matches the DoD.
