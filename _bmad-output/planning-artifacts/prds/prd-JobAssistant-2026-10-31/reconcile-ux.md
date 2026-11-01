# Reconciliation: UX specification

- **Date:** 2026-10-31
- **Input files read** (`_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-09-11/`): `EXPERIENCE.md`, `DESIGN.md`, `mockups/key-home.html`, `mockups/key-application-result.html`, `mockups/key-mobile-nav.html`, `.memlog.md`. Not read: `.working/` and `reconcile-color-themes-1.md` (superseded colour history).
- **Also read:** `extract-ux.md` (as a map only; every gap below was checked against the original files), and `prd.md`, `addendum.md` and `.memlog.md` in this folder. `brief.md` was checked only where the PRD credits a decision to both the brief and the UX.
- **PRD frontmatter `updated`:** 2026-10-31
- Contrast ratios were recalculated from the DESIGN.md tokens (WCAG relative-luminance formula, tinted fills composited over `surface`).

## Verdict

The PRD carries the UX's core faithfully: the integrity rule, the transparency pillar, bokmål, the quoted microcopy and the deliberate deviations (D1–D5, D14–D16) all check out against the sources. Most gaps sit in addendum §4, which misses UX changes the PRD makes without saying so: results now arrive in two phases, the build order produces a no-account version first, the CV text becomes editable, and several new states and screen elements have no UX home. The UX's voice rules and some accessibility promises are also carried more weakly than the UX states them.

## Gaps

### 1. Results now arrive in two phases; the UX still describes one wait and one result — high
- **UX:** EXPERIENCE.md, State Patterns: Generating = "Explicit progress state ... «Sammenligner CV-en din med stillingsannonsen …»"; Result ready = "Reflection Note / Feedback Document renders"; Generation failed = «Noe gikk galt da søknaden skulle lages. …». Flow 1, steps 6–7: submit, wait, "the result loads".
- **PRD:** FR-8 ("appear without waiting for any AI output"), NFR-4 (score in 2 s, AI in about 60 s, 90 s timeout), UJ-1 step 4 and the UJ-2 climax describe score first, AI later. FR-25, FR-27 and the UJ-3 edge case add a result where the score shows and the AI sections are replaced by a message. None of this is in §11 or §4. As a result, the UX progress copy describes a step that is now instant code; `aria-live` has to announce two arrivals; and no state covers "score shown, AI part failed, timed out, capped or unavailable", or says whether retry re-runs only the AI part.
- **Fix:** Add a §11 entry for the phased result, and a §4 item that rewrites Generating, Result ready and Generation failed: progress copy for the AI phase, one announcement per phase, and a partial-result state that keeps the score and retries only the AI sections.

### 2. The no-account version the build order produces first has no UX — high
- **UX:** EXPERIENCE.md, Key Flows, Flow 1, steps 2–3: "routed into Signup ... Immediately after signup, she's redirected to Profile: she uploads her CV". In Information Architecture, Application takes only "Paste a job description". key-application-result.html ends «Lagret. Last ned filene dine nedenfor.»
- **PRD:** §5.1 builds S6 + S7 last and cuts them first ("Before step 6, the app keeps everything in the browser session only"), and the 22 Nov checkpoint is "UJ-1 works end to end without accounts". FR-3 (CV editing "on the Søknad page before then"), FR-9 (placeholder sign-off), FR-24 (notice once per browser session) and cut 1 (trust line removed) all assume this version. But UJ-1 still starts with registration and Profil, and §4 asks for none of it: CV input on Søknad; Hjem without a greeting or history and with a CTA that goes straight to Søknad; a navbar with only Hjem and Søknad; no «Lagret.» (it would be untrue). The S4 and S5 cuts likewise leave a Reflection Note without «Forslag», or callouts without suggestions.
- **Fix:** Add a §4 item for the session-only version, with a note on the S4/S5 cut layouts, and say in §5.1 or UJ-1 which UJ-1 steps the checkpoint run skips.

### 3. Editable CV text and CV paste are missing from §4, and §10 contradicts them — medium
- **UX:** Profile = "CV upload (PDF/TXT) + personal info fields" (EXPERIENCE.md, Information Architecture). The dropzone "Shows filename + size once accepted" (Component Patterns). The editing ban covers generated output: "generated CV/letter are downloaded and edited externally" (Inspiration & Anti-patterns).
- **PRD:** FR-2 (paste CV text, a brief S1 fallback the UX left out), FR-3 (editable extracted text, confirmed before use, editable later), FR-20 (Profile = name, optional phone, CV text; Søknad asks for the CV if there is none), FR-23 and D12 (no stored file to show). D11 says it changes "New", though it changes the UX Profile and dropzone. §4 has no Profil item. §10 says "The Letter and the CV can't be edited in the app", which contradicts FR-3.
- **Fix:** Add a §4 item for Profil and Søknad (paste option, editable CV-text field with confirm, name and optional phone, CV text instead of a file, the "no CV yet" prompt), and point D11 at the UX Profile and dropzone. Reword §10 to "generated output can't be edited in the app; the CV text can be corrected (FR-3)".

### 4. §4 item 9 misses several new states, and the UX colour rules leave them no colour — medium
- **UX:** The EXPERIENCE.md State Patterns table has no rows beyond Session expired and Offline. DESIGN.md, Colors: warning "Means exactly one thing: a weak match or a missing keyword"; error is "system-level failure only"; "Avoid: any additional chromatic color beyond this list."
- **PRD:** §4 item 9 adds only the Unsupported-claim warning, the Daily-cap message and the Test-mode banner. Missing (the partial-result state itself is gap 1):
  - the scanned-PDF message that asks for pasted text (FR-1, UJ-1 edge case);
  - "too short or unclear to analyse", with no score (FR-4);
  - length-limit messages (FR-2, FR-4);
  - the per-section "not available in Test mode" message (FR-27, UJ-3 edge case), which is separate from the banner;
  - "not found" (FR-19).

  UJ-3 step 3 ("She opens the Example pair and submits it") assumes a control that nothing defines. Nothing says which token the Unsupported-claim highlight, the Daily-cap message or the banner uses.
- **Fix:** Add these states and their copy to §4 item 9, add an Example-pair control on Søknad in Test mode (or say the README supplies the ad text), and pick an existing token for each new message.

### 5. The UX voice rules are attached to nothing testable — medium
- **UX:** EXPERIENCE.md, Voice and Tone: "Direct, evidence-first sentences — state the fact, then the reason"; don't use "Cheerleading, exclamation points, emoji, gamified praise" or "Formal 'De', English loanwords where a common Norwegian word exists, literal translations from English". Flow 2, step 5 applies "the same evidence-first, non-cheerleading voice" to AI-written feedback.
- **PRD:** P5 repeats most of this and says it "follows the UX tone of voice (NFR-1)", but NFR-1 holds only language and formatting rules. Gap explanations and suggestions are now AI-written (FR-14, FR-16), yet §9.2 checks only bokmål (L1), natural bokmål (R3) and honest Real gaps (G3), and the prompt rules in addendum §2.3 leave out voice. The loanword and literal-translation rule is gone entirely, although anglicisms are a typical weakness of AI-written Norwegian.
- **Fix:** Put the voice rules in NFR-1, or in a §9.2 item for Gap explanations and suggestions (and decide whether it covers the Letter): «du», fact before reason, no exclamation marks or emoji, no anglicisms or literal translations. Add the same rules to the addendum §2.3 prompt rules.

### 6. §4 items 1 and 2 miss result-screen and Hjem changes — medium
- **UX:** The Hjem CTA card says "Få en tilpasset CV, et søknadsbrev og et refleksjonsnotat" (key-home.html). The History row has a "type (Application / CV review / Application review)" (EXPERIENCE.md, Component Patterns), and the mock has a "CV-vurdering" row. Only the strong verdict sentence exists (key-application-result.html). History is "presumably paginated/searchable". DESIGN.md Components has no long read-only text, choice control, dialog or information banner.
- **PRD:** It adds the AI-draft label (FR-9), «Lag nytt utkast» (FR-12) and «Kopier» on each suggestion (FR-16). The Verdict comes from code templates (FR-7, D7), but no weak-match sentence is written anywhere. FR-21 rows have no type, and D5 drops search. «Lagret. Last ned filene dine nedenfor.» now refers to one file. The Konto note must reflect deletion at course end (FR-23) with no self-service delete. None of this is in §4.
- **Fix:** Extend §4 item 1 (draft label, «Lag nytt utkast», «Kopier» on suggestions, weak verdict sentence, saved-note wording) and item 2 (CTA copy, the CV-vurdering row and type tag, History search, Konto note). Add a DESIGN.md item for the new components: Letter view with flagged-word highlight, Tone choice, AI-notice dialog, information banner, Evidence excerpt.

### 7. The failing colour pairs in D16 and §4 item 8 are incomplete — medium
- **UX:** DESIGN.md: `success #4C7A3F` on `success-bg #4C7A3F1A` styles the matched chip and the strong badge. `border #E0CBA8` is "the only divider mechanism" and outlines inputs and the dropzone (Components). DESIGN.md flags only the review-button label (~3.8:1) and accent on background (~4.53:1).
- **PRD:** D16, NFR-2 and §4 item 8 list text-secondary, the warning chip and badge, the accent-strong label and the callout emphasis. Recalculated at 3.66–4.09, 2.59, 3.78 and 3.09:1, those are right. Missing:
  - success on its tint, at 3.98:1 (13 px chip text and a 16 px bold badge, neither of which counts as large text);
  - the border at 1.26:1 against background and 1.41:1 against surface, below the 3:1 that WCAG 1.4.11 sets for outlines that identify a field;
  - accent link text on background, at 4.49:1.

  The axe scan in NFR-2 doesn't test non-text contrast, so the border problem would pass verification.
- **Fix:** Add the success chip and badge, the input and dropzone outline, and accent links on background to D16 and §4 item 8, and add a manual contrast check with a tool (including non-text contrast) to §9.3.

### 8. Accessibility and phone promises are narrowed without a §11 entry — low
- **UX:** "WCAG 2.2 AA across the full responsive web surface"; badges always pair colour with «Sterkt samsvar» or «Bør forbedres» (EXPERIENCE.md, Accessibility Floor). "Touch targets ≥44px on all interactive elements" (Interaction Primitives). "upload, paste, review, download" must work "on a phone browser" (Responsive & Platform).
- **PRD:** NFR-2 limits AA to six named screens, which leaves out Konto. The 44 px rule is dropped, and WCAG 2.2 AA asks only for 24 px. FR-21 rows show "the score badge" as in key-home.html, where the badges read only «78 %» or «54 %», so strong and weak differ by colour alone. §9.3 asks for "a phone-width check at 360 px". With a local-only run (§10), that will probably be an emulated viewport, which doesn't test touch, the file picker, the .docx download or «Kopier».
- **Fix:** Cover every screen in NFR-2 (or record the narrowing in §11), add 44 px targets and the Verdict text on row badges, and say whether the §9.3 phone check uses a real phone.

### 9. FR-14 misquotes the UX callout order — low
- **UX:** A callout states "what's missing, why it matters (recruiter/ATS framing), and — when available — which of the student's own coursework ... could legitimately fill it" (EXPERIENCE.md, Component Patterns, Suggestion callout).
- **PRD:** FR-14 drops "when available" ("which of the Student's own work covers it"), so Real gaps seem to name covering work as well, which contradicts FR-13. FR-14 also doesn't stop explanations from claiming that an ATS will filter the CV. Addendum §1.2 finds no evidence of such filtering in Norway, and P4 rules the claim out, but §4 doesn't ask the UX to drop "ATS framing".
- **Fix:** Write "and, for a Rewordable gap, the CV entry that covers it", add "never claims an ATS will reject or rank the CV" to FR-14, and change the UX rule to "recruiter framing" through §4.

### 10. Loading and recovery states have no anchor in the PRD — low
- **UX:** EXPERIENCE.md, State Patterns: Cold load ("Skeleton rows"), Uploading ("indeterminate progress. Cancel available while in flight"), and Session expired ("any in-progress paste/upload on Application isn't silently discarded — re-prompt after login").
- **PRD:** No FR, NFR or §9.3 check mentions the loading states. FR-18 keeps the session-expired redirect and message but not the preservation rule, although its 1-hour timeout can drop a pasted ad. NFR-5 ("After any error, the input is kept") doesn't clearly cover session expiry. Since stories cite FR and NFR IDs (NFR-10), states without an ID are easy to skip.
- **Fix:** Add the preservation rule to FR-18 or NFR-5, plus one NFR-5 or §9.3 line: the EXPERIENCE.md states, as updated through §4, are built and walked through.

### 11. The PRD "defers" dark mode and a native app, which the UX rules out — low
- **UX:** "single light theme; no dark mode exists or is planned" (DESIGN.md frontmatter; Brand & Style: "no mode toggle and no dark variant"). "No native mobile app exists or is planned" (EXPERIENCE.md, Responsive & Platform).
- **PRD:** §5.3 lists "Native mobile app; dark mode" under "Deferred to after v1", citing "Brief and UX decisions".
- **Fix:** Move them to §10 Non-goals, or label them as excluded rather than deferred.

## Checked and fine
- **Deliberate deviations** D1–D5, D10 and D14–D16 describe the UX they change accurately (EXPERIENCE.md Information Architecture and Key Flows, both desktop mocks, UX memlog L16, L19 and L23). D4 picks a format the UX left open ("on-screen only, PDF, or plain text").
- **Quoted microcopy is verbatim:** the upload errors (FR-1), session expiry (FR-18), empty history (FR-21), trust line (FR-22), hedged phrasing (P3, FR-14), and the labels «Lag skreddersydd søknad», «ATS-samsvar», «Sterkt samsvar», «Bør forbedres», «Refleksjonsnotat» and «Historikk».
- **Integrity and transparency:** "Never states a qualification the student doesn't have" and the black-box and fabrication anti-patterns are carried, and tightened, by P1–P3, FR-8, FR-11, FR-13 and FR-15–FR-17. The «Kubernetes» Real-gap citation matches the result mock.
- **Mock arithmetic (§4 item 4):** the result mock shows 5 matched and 2 missing chips beside «78 %», and 5 of 7 is 71 %.
- **Language:** bokmål only, `lang="nb"`, «78 %», «8. sep. 2026», «sjevroner» and ASCII file names (NFR-1, FR-12) match EXPERIENCE.md Language.
- **Score and input:** the threshold of 70 (FR-7) is the UX placeholder the user confirmed (UX memlog L23), and the pasted plain-text job ad (FR-4) matches Interaction Primitives.
- **Accounts:** email and password login, one-click logout and session expiry (FR-18) match the UX.
- **History (FR-21):** newest first, paginated, and reopened read-only with copy and download. This respects the infinite-scroll ban and the History row behaviour, and the 3 recent rows on Hjem match key-home.html.
- **Upload (FR-1):** PDF and TXT only, rejected before anything is sent, which matches the dropzone and Flow 2's failure path.
- **Errors (NFR-4, NFR-5):** kept input, inline and field-level errors, the offline banner and retry match the UX error states.
- **Responsive basics (NFR-3):** a single column and collapse at 640 px and below match Responsive & Platform. The 360 px floor sharpens the UX.
- **Scope exclusions** (§5.3, §10) match EXPERIENCE.md Foundation: in-app output editing, voice learning, multi-language, job boards, interview prep and LinkedIn import.
- **Visual design:** PRD §0 leaves DESIGN.md in charge, and apart from D16 the PRD contradicts no token, component or layout rule.
