# Extract: JobAssistant product brief, for PRD authoring

Prepared 2026-10-31 for the PRD run `prd-JobAssistant-2026-10-31`. No source file was edited.

## Sources and conventions

**Read in full** (folder `C:\IBE160\JobAssistant\_bmad-output\planning-artifacts\briefs\brief-JobAssistant-2026-09-11\`):

| File | What it is | Language |
|---|---|---|
| `brief.md` | The product brief. Front matter: `status: final`, `created: 2026-09-11`, `updated: 2026-10-10` | English |
| `addendum.md` | Competitive landscape, business-model note, deferred-scope rationale. Research dated 2026-09-11 | English |
| `tilbakemelding-product-brief.md` | Written feedback on the brief, dated 2026-10-06 (section 9) | Norwegian |
| `.memlog.md` | Decision log of the brief run (section 6) | English |

**Also used, read-only:** `git log` and `git diff` of that folder, to date the revisions. **Not read:** the UX documents `C:\IBE160\JobAssistant\_bmad-output\planning-artifacts\ux-designs\ux-JobAssistant-2026-09-11\DESIGN.md` and `EXPERIENCE.md`. The feedback says they already exist and build on the brief; commit 5e46ce6 updated them to remove DOC support.

**Conventions**
- "Quoted text" is verbatim, except that em/en dashes were written as " - " and arrows as "->" for plain-text safety. Where the Norwegian wording matters it is given in Norwegian followed by an English gloss.
- *(inference)* marks my own reading, which the sources do not state. *(gap)* marks something the sources are silent on.
- Cross-reference labels I made up for this file: **S1-S7** (the seven ranked v1 scope items, section 4), **SC1-SC9** (the nine functional success criteria, section 7), **M1-M16** (memlog entries, section 6), **F1-F41** (feedback points, section 9), **A/B/C** items in section 11. Suggest keeping S and SC as requirement anchors in the PRD, because the feedback asks for traceability (F30, F38, F41).
- Norwegian course terms: *faglærer* = subject lecturer; *sensor* = external examiner/grader; *mappen* = the graded course portfolio; *KI* = AI; *fasit* = answer key.

## 0. Where the brief stands (revision timeline from git)

| Date | Commit | What happened |
|---|---|---|
| 2026-09-11 | - | Brief run, web research, addendum written. Memlog entries M1-M15 date from this run |
| 2026-09-15 | 00319e6 | First committed brief. This is the version the feedback reviewed |
| 2026-10-06 | be460ee | Feedback file committed |
| 2026-10-09 | f90d41b | Success criteria rewritten as testable statements, match-score calculation described |
| 2026-10-09 | 5e46ce6 | v1 list ranked in build order, DOC dropped, "Privacy and data handling" paragraph added, UX docs updated to remove DOC |
| 2026-10-10 | b78f08c | Norwegian-only decision, SC9 added, memlog entry M16 added, mobile nav mockup translated |

**Consequence for the PRD:** the final `brief.md` is the authority. The memlog contains only the first-pass decisions and the 2026-10-10 language decision. The two 2026-10-09 rounds that answer the feedback are not in the memlog (section 6).

---

## 1. Problem and vision

### One-line product definition
"JobAssistant is a web application that turns a single CV into a tailored, honest application in minutes: upload a CV once, then paste in each new job ad. It produces a tailored letter, flags gaps, and shows its work - an ATS-style match score with keyword-level explanations - so students see why a suggestion was made rather than accept a black-box draft. Where a qualification is missing, it points to coursework or projects that legitimately fill the gap." (Executive summary; the original uses em dashes.)

Stated overall goal: "With a working v1 due by early December, the goal is simple: applications that clear the filter more often, and students who understand why."

### The problem (brief, "The problem")
A catch-22 for students seeking a first full-time job:
- "most entry-level postings still list 'experience in the field' as a qualification, and the applicant tracking systems (ATS) that pre-screen applications are tuned to reward exactly that."
- "ATS keyword-matching favors the vocabulary of people who already work the job - the tools, processes, and industry terms picked up by doing it."
- "A student's real qualifications exist, but they're scattered across coursework, class projects, and extracurriculars, expressed in academic language that the filter doesn't recognize as equivalent."
- "students are structurally more likely to be filtered out before a human ever reads their application, for reasons that have nothing to do with whether they could do the job."

Three distinct sub-problems the product maps to:
1. **Vocabulary mismatch** (ATS filter): real skills are not expressed in job-ad vocabulary. Maps to match score, gap analysis, CV suggestions.
2. **No feedback loop:** students "apply to far more roles than they hear back from, and rarely learn why a given application failed - was the CV wrong, the letter generic, or did it never clear the ATS filter at all?" Maps to the explained score.
3. **Tailoring does not scale, and the fallbacks backfire:** "Writing a genuinely tailored CV and cover letter for every single posting is the correct response, but it doesn't scale." Students fall back on "a single generic application blasted everywhere, or hand the job to an AI tool that produces something equally generic - which does nothing to fix the underlying keyword mismatch and can read as impersonal to the reviewer who eventually sees it." Maps to the tailored letter and to the "honest, not generic" stance.

### Solution thesis (brief, "The solution")
- "A student uploads their CV once; from then on, applying to a new job is as simple as pasting in the job advertisement. JobAssistant reads the posting, compares it against the CV, and produces an application letter adjusted to that specific role, in the student's own preferred tone and style."
- "Instead of a black box, the student sees exactly why. An ATS-style match score shows which keywords from the job ad are - and aren't - reflected in their CV and letter, and a plain-language explanation accompanies every suggestion ("recruiters scanning for this role look for X; your application doesn't show it yet")."
- "Where the CV falls short, JobAssistant doesn't just flag the gap - it looks at the student's coursework, class projects, and extracurriculars for something that legitimately fills it, and suggests how to phrase and add that experience. A missing "project management" keyword might be answered by the semester-long group project already on their CV, just not described in those terms yet. The result is an application that is both more likely to clear the filter and more honestly representative of what the student can actually do."

### Differentiation (brief, "What makes this different")
- Honest positioning: "Kickresume and Teal already give students free or cheap access to AI-generated resumes and cover letters - that alone isn't a fight JobAssistant can win on price or breadth. To be honest about it: nothing described here is a defensible technical moat. What's different is the philosophy behind the product."
- "Most existing tools optimize purely for "beat the filter": generate text, check a score, ship it. That produces exactly the generic, keyword-stuffed output that human reviewers are learning to distrust."
- "that transparency is the product, not a feature bolted onto it."
- Addendum on the market: the table stakes are "AI draft generation, ATS match scoring, job-ad paste-in tailoring, cover letter generation". Differentiators in the market are "tailoring depth, free-tier generosity, career-tracking/dashboard features". So JobAssistant's v1 core flow is largely table stakes plus a transparency layer; it does not plan career-tracking or dashboards. Memlog M6 adds that the "student no-work-history gap" was identified as whitespace.
- Addendum "Pitfalls other tools fall into (used to shape what JobAssistant should avoid)": "generic/robotic output that reads as templated; over-optimization for ATS keyword-stuffing at the expense of authentic voice; implying/hallucinating qualifications during gap-filling."

### Why-now evidence (addendum, "Recent trend context (as of a May 2026 audit)")
"None of the 10 major ATS platforms (Workday, Greenhouse, iCIMS, Oracle, SAP, Lever, Workable, SmartRecruiters, Ashby, BambooHR) reliably detect AI-generated resumes, but vendors shipped AI-content classifiers in late 2025 that flag suspicious language and route it into lower-priority queues. Human hiring managers are the more reliable filter in practice: one 2025 survey found 49% auto-dismiss suspected AI resumes and 62% reject AI text lacking personalization." Caution: no source names or links are given (see C7).

### Vision (brief, "Vision", verbatim)
"JobAssistant becomes the place a student goes the moment they start thinking about their first job, not just when a specific ad catches their eye. Over time it learns each student's voice from the applications they've written, so every new letter sounds more like them and less like a first draft. The transparency at its core - showing students exactly how their application is being judged - extends past ATS keywords into genuine feedback on structure, clarity, and framing, so students leave not just with a better application but with a real, transferable understanding of how hiring works. What starts as a tool for landing the first job becomes the place students return to for every job after that, because by then they trust it to be honest with them."

Memlog M14 calls this the "2-3yr picture". All three vision elements (voice-learning, feedback on structure/clarity/framing, return tool for every job) are outside v1. The feedback judged the vision OK because it "er tydelig plassert utenfor v1" (is clearly placed outside v1).

---

## 2. Target users and non-users

### Primary user (brief, "Who this serves")
"The primary user is a university or college student, in any field of study, applying for their first full-time job after graduation. They have a CV built mostly from coursework, class projects, part-time work, and extracurriculars rather than a professional track record, and they are applying to multiple roles in parallel because no single application feels like a safe bet. They need to know, honestly, whether their application is competitive for a given posting, and - where it isn't yet - what to change and why, using experience they already have rather than experience they don't."

Extra characterisation from elsewhere:
- "a first-time job hunter with no prior experience with how recruitment technology works" (What makes this different).
- Memlog M2: "hunting for their first FULL-TIME job (not internships)". The "not internships" detail is only in the memlog.
- Writes and reads **Norwegian** (CVs and job ads "are expected to be written in Norwegian"), per the 2026-10-10 decision.
- Needs a way to understand and defend the application: "they can actually defend and expand on what's in their application when an interviewer asks about it."
- Single role. Feedback: "Én rolle, men innlogging og at hver student bare ser egne CV-er og søknader." Hence no admin, advisor or recruiter role is in the sources *(gap)*.
- Delivery model: "self-serve and used directly by the student - there is no institutional or career-center intermediary in this version of the product." Memlog M10: "purely self-serve/B2C".

### Personas and named people
- **No personas exist** in the sources, and no named end users. Only the generic primary user above.
- Named parties that are not end users but matter to the PRD:
  - The **group**: "G32 - G32-grotting" (feedback header). Size and roles are not stated.
  - The **faglærer** (IBE160 subject lecturer) who wrote the feedback, "utarbeidet med KI-støtte" (prepared with AI support).
  - The **sensor** (external examiner). A de-facto secondary user: must be able to run the app locally after the README without the group's API key (hence the test mode, SC8), and must "følge en sporbar vei fra plan til ferdig app".
  - Competitors named in the addendum: Rezi, Jobscan, Kickresume, Teal, Enhancv, Wobo, Resume.com (Indeed).
  - Readers of the output who are not users but shape quality: recruiters/hiring managers and ATS software ("the humans who eventually see it").

### Non-users
- **Explicit:** institutions and career centres ("no institutional or career-center intermediary"); internship seekers (M2); students who need an English or nynorsk interface/output ("no English interface, no English output, no nynorsk").
- **Implied by the sources** *(inference)*: experienced professionals and career switchers (the product is framed around the first job and CVs without a professional track record); recruiters/employers (no recruiter-side feature; "purely self-serve/B2C"); users wanting a native mobile app ("Mobile app" is out of v1); users wanting auto-apply, job-board feeds, LinkedIn import or interview prep (all out of v1).

---

## 3. Features and capabilities described

**Core flow** (brief): "upload CV -> paste job ad -> see explained match score -> get tailored letter". Where gap analysis and CV suggestions sit in the user journey relative to the letter is not specified *(gap)*.

**Code versus language model** (brief, "How the match-score is calculated"): "the language model is used only for the explanatory text and the letter/gap-analysis content, not for deciding the score itself." The privacy paragraph adds that the LLM generates "the letter, gap analysis, suggestions, and explanations" and that "The match score itself is computed locally and does not require sending data out." The feedback counts "Fire KI-funksjoner (brev, CV-forslag, gap-analyse, forklaringer)".

| ID | Capability | Implemented by | Scope item | Success criteria |
|---|---|---|---|---|
| C1 | CV intake: upload PDF or TXT, or paste plain text | Code | S1 | SC7, SC8 |
| C2 | Job-ad intake: paste text | Code | S1 | SC7, SC8 |
| C3 | ATS-style match score (0-100) with present/missing keyword breakdown | Code, local, deterministic | S2 | SC1, SC2, SC4 |
| C4 | Keyword-level plain-language explanations | LLM | S2 | SC9 (language only) |
| C5 | Tailored application letter in a preferred tone/style | LLM | S3 | SC5, SC7, SC9 |
| C6 | Gap analysis translating coursework/projects/extracurriculars into missing qualifications | LLM | S4 | SC3, SC4, SC9 |
| C7 | CV improvement suggestions | LLM | S5 | SC6, SC9 |
| C8 | User accounts, login, per-user isolation | Code | S6 | none |
| C9 | Encrypted storage of uploaded and generated content | Code | S7 | none |
| C10 | Privacy notice about external LLM use | UI copy | cross-cutting | none |
| C11 | Test mode with pre-recorded example CV and job ad, cached responses | Code plus fixtures | cross-cutting | SC8 |
| C12 | Norwegian (bokmål) interface and output | All | cross-cutting | SC9 |

### What each does, with the exact wording that matters
- **C1 CV intake.** "CV upload (PDF or TXT, with plain-text paste as a fallback)". DOC is not supported: "because text extraction from them is unreliable and adds risk without strengthening the core flow." The student "uploads their CV once" (see B7 for the persistence question). Feedback flags PDF reading as unreliable because "CV-er har ofte kolonner og tabeller" (CVs often have columns and tables).
- **C2 Job-ad intake.** Paste-in only: "job advertisement paste-in". No file upload, URL fetch or job-board integration is described; "Direct job-board integration or auto-apply" is out of v1.
- **C3 Match score.** "a single number between 0 and 100, computed deterministically by code (keyword/skill comparison between job-ad text and CV text) - not generated or estimated by the language model - so the same CV/job-ad pair always produces the same score, where 100 means every keyword/skill identified in the job ad is reflected in the CV." Definition: "a 0-100 score (percentage of job-ad keywords found in the CV) plus a present/missing breakdown per keyword". Matching rules: "exact and near-match string/keyword comparison"; "case-insensitive, and inflected forms count as the same keyword ("prosjektleder", "prosjektlederen", "prosjektledere")"; "English terms that are common in Norwegian job ads (tool names, "stakeholder", "Agile") are treated as keywords like any other"; compound words ("prosjektledelse" vs. "ledelse av prosjekter") are "an architecture decision; whatever is chosen must be covered by the answer-key fixtures."
- **C4 Explanations.** "a plain-language explanation accompanies every suggestion". Sample copy: "recruiters scanning for this role look for X; your application doesn't show it yet". Because C3 is local, the number and the present/missing list do not need an LLM; only the explanation prose does *(inference)*.
- **C5 Letter.** "an application letter adjusted to that specific role, in the student's own preferred tone and style". Constraint (SC5): "contains no qualification or keyword that isn't traceable back to the CV (no hallucinated experience)". Voice-learning is out of v1, so "preferred tone/style" cannot mean learned style (see B6).
- **C6 Gap analysis.** Missing keywords are matched to existing CV material that "legitimately fills" the gap, with a phrasing suggestion. SC3: "never suggests a qualification that isn't already supported by text in the CV: every suggested gap-filler must cite the specific CV entry (course, project, job, or extracurricular) it's drawn from."
- **C7 CV improvement suggestions.** SC6: "each name the specific CV section they're based on, so a reviewer can verify the suggestion isn't invented." The brief gives no further description of what these suggestions are *(gap)*; see B5.
- **C8 Accounts.** "User accounts with login, where each student sees only their own CVs and applications". Authentication method, registration, password reset and account deletion are not described *(gap)*.
- **C9 Encrypted storage.** "Encrypted storage of uploaded and generated content". Feedback: encryption key is to be configured via `.env.example`; solution to be justified in the architecture.
- **C10 Privacy notice.** "v1 tells the student plainly that CV and job-ad text is sent to an external language-model provider to generate the letter, gap analysis, suggestions, and explanations."
- **C11 Test mode.** SC8: "A test mode exists that reproduces this full flow using one pre-recorded example CV and job ad with cached responses, so it can be verified without a live LLM API key."
- **C12 Language.** See section 5.

### Data entities implied
Only the feedback lists them: "Bruker, CV, stillingsannonse, søknad/brev, forslag og match-resultat, med historikk per annonse" (user, CV, job ad, application/letter, suggestions, match result, with history per ad). The brief itself never mentions saved history *(gap)*, though "each student sees only their own CVs and applications" implies stored applications.

### Not mentioned either way (PRD should decide explicitly) *(gap)*
Editing the letter in the app; copy/export/download of the letter or suggestions; generating a revised CV file (the brief only produces suggestions, not a rewritten CV); multiple CVs per student; saved history view; responsive web layout; accessibility; performance target (only "in minutes, not hours"); admin or support functions.

---

## 4. MVP scope

### In v1, ranked in build order (brief, "Scope", verbatim)
"**In v1**, ranked in build order (if time runs short, cut from the bottom):"
1. **S1** "CV upload (PDF or TXT, with plain-text paste as a fallback) and job advertisement paste-in - the input for everything else"
2. **S2** "ATS-style match score with keyword-level explanations, computed in code"
3. **S3** "Tailored application letter generation in a preferred tone/style"
4. **S4** "Gap analysis that translates coursework/projects/extracurriculars into missing qualifications"
5. **S5** "CV improvement suggestions"
6. **S6** "User accounts with login, where each student sees only their own CVs and applications"
7. **S7** "Encrypted storage of uploaded and generated content"

Rule: "Items 1-3 form the core flow (upload CV -> paste job ad -> see explained match score -> get tailored letter) and must be finished and stable before work starts on items 4-7."

The feedback's matching build order: "(a) match-score med nøkkelordforklaring beregnet i kode, (b) tilpasset brev, (c) gap-analyse, (d) CV-forslag, (e) innlogging og kryptert lagring. Da har dere en fungerende og testbar app tidlig, selv om de siste punktene tar lengre tid." It also says "Ta rangeringen med inn i PRD-en og epics" (carry the ranking into the PRD and the epics).

### Required v1 items that are not in the ranked list
These appear elsewhere in the brief (the last one only in the feedback) as v1 requirements but are not ranked, so the PRD must place them in the build order:
- Test mode with cached responses and example data (SC8).
- Norwegian (bokmål) UI and output (SC9) and Norwegian normalisation in matching.
- Privacy notice about the external LLM provider.
- Answer-key fixtures: at least 3 example CV/job-ad pairs with a hand-written answer key (SC4), plus "Only made-up example CVs are used as test data".
- README and local runnability for the sensor (feedback; not in the brief).

### Explicitly out of v1 (brief, verbatim list) and the reasons given
| Out of v1 | Reason stated in the sources |
|---|---|
| "Learning the student's voice from former applications (past applications are not yet used to personalize output)" | Addendum: "meaningfully harder to build well than the rest of the feature set (requires a personalization/fine-tuning approach, not just prompt-and-generate) and the timeline to early December is tight. It remains the centerpiece of the Vision section as the natural next capability." Memlog M13: removed from the Solution text "for coherence". |
| "Mobile app" | No reason given. See B11: a mobile navigation sketch exists |
| "Multi-language support (v1 is Norwegian only: no English interface, no English output, no nynorsk)" | Decision of 2026-10-10 (M16); no rationale recorded |
| "Direct job-board integration or auto-apply" | No reason given. Feedback: "Ingen jobbportaler eller LinkedIn i v1, noe som er klokt." (wise) |
| "Interview preparation features" | No reason given |
| "LinkedIn import" | No reason given (see feedback quote above) |
| DOC file upload (stated in the Scope paragraph, not in the "out" list) | "text extraction from them is unreliable and adds risk without strengthening the core flow." Feedback: "DOC-lesing er mindre vanlig og kan droppes." |
| Monetization, pricing, financial projections, funding ask | Addendum: "Decided: no monetization in this version. This is a course project (IBE160), not a live fundraising effort". Memlog M4: "Free (course project, no monetization needed)" |

### Conditional scope
S4-S7 are in v1 but sit below the cut line: "if time runs short, cut from the bottom". The cut order this implies, last item first, is S7 encryption, S6 accounts/login, S5 CV suggestions, S4 gap analysis *(inference from the ranking)*. See B7 for what breaks if S6/S7 are cut ("upload once", privacy promise).

---

## 5. Constraints

### Timeline
- "working v1 due by early December" (Executive summary); memlog M5: "working web application due early December 2026 - stage is pre-build/spec, framed honestly as pre-launch, no fabricated traction." The exact deadline date is not in the sources *(gap)*. Counting from this PRD run (2026-10-31) there are roughly four to five weeks *(my arithmetic)*.
- Planning flow required by the course (feedback): "BMAD (product brief -> PRD -> arkitektur -> epics og stories)" then implementation "med Claude Code". The feedback says time is needed for "hele denne flyten, og til testing, retting og README til slutt" (the whole flow, plus testing, fixing and a README at the end).
- Build order and cut line: section 4.
- Feedback: "Det er mye, men gjennomførbart hvis dere bygger i trinn og forenkler filformater." Verdict "Gjennomførbart med justert omfang."

### Budget
- **Revenue side:** none. "Free (course project, no monetization needed)" (M4); no pricing, projections or funding ask (addendum).
- **Spend side:** the brief states **no budget and no cost plan**. The feedback says the three LLM features "krever trolig et betalt LLM-API" (probably require a paid LLM API) and under "Avhengigheter og kostnader": "Ikke nevnt i briefen. Velg modell og leverandør i arkitekturen, og lag en plan for kostnad og mock-svar." The "limited budget" in the project summary is therefore an external constraint; the sources give no figure *(gap)*. Cost levers visible in the sources: score computed locally with no LLM calls; cached responses in test mode; four LLM features only.
- Pricing norms in the addendum ($24-$50/month, freemium) are background only: "If this ever moves toward a real product, the freemium-to-subscription pricing norms noted above are the natural starting point."

### Team
- Group "G32 - G32-grotting". Team size, roles and skills are not stated *(gap)*.
- Feedback on team capability: "Dere kan vurdere om et brev er godt, men det er vanskeligere å kontrollere at gap-analysen ikke finner på kvalifikasjoner" (you can judge whether a letter is good, but it is harder to verify that the gap analysis does not invent qualifications). The group builds with AI (BMAD plus Claude Code), so verifying AI-written code and AI-written output is a stated risk.

### Technology
- Web application with login, database and LLM calls: "Webapp med innlogging, database og LLM-kall er godt dokumentert." Single user role.
- **Stack not chosen, by design:** "Teknologi er ikke valgt ennå, noe som er riktig for en brief. Begrunn valg av språkmodell, lagring og krypteringsløsning i arkitekturen, og hold det enkelt." (Technology is not chosen yet, which is right for a brief. Justify the choice of language model, storage and encryption solution in the architecture, and keep it simple.)
- One external LLM provider, unnamed. Only text is sent; the score is computed locally.
- Norwegian text normalisation (case folding, inflection) must be done in code before matching; the approach is open. Compound-word handling "is an architecture decision".
- PDF text extraction from CVs with columns/tables is a known weak point; DOC is dropped.
- Encryption of stored uploaded and generated content; key configured via `.env.example` (feedback).
- Must be runnable by the sensor: "kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur?" The test mode is the answer in SC8.
- Repo rules (feedback): "Bruk `.env.example` for API-nøkkel og krypteringsnøkkel, og bruk bare oppdiktede eksempel-CV-er som testdata - aldri ekte CV-er i et offentlig repo. Mappen `.working/` med fargeutkast kan ryddes når designet er valgt." Brief: "Only made-up example CVs are used as test data; real CVs never go into the repository."

### Language
Exact wording, all four places:
- Scope: "**Language**: v1 is Norwegian only (bokmål). The interface, all generated content, and all test data (example CVs, job ads, answer keys, cached test-mode responses) are in Norwegian. CVs and job ads are expected to be written in Norwegian."
- Out of v1: "Multi-language support (v1 is Norwegian only: no English interface, no English output, no nynorsk)"
- SC9: "All interface text and all generated content (letter, CV suggestions, gap analysis, explanations) are in Norwegian (bokmål), including when the job ad contains English terms."
- Memlog M16: "(decision 2026-10-10) Language: v1 is Norwegian only (bokmål) - UI, generated content, and test data. Match-score matching must normalise Norwegian inflection; compound-word handling deferred to architecture. Added success criterion 9."

Not specified: the language of the planning documents themselves. The brief, addendum and memlog are in English, the feedback is in Norwegian, the product is Norwegian (B16).

### Quality attributes stated or implied
- Determinism and auditability of the score ("the same CV/job-ad pair always produces the same score"; "auditable and testable against fixture data").
- No fabrication: SC3, SC5, SC6 (traceability to CV text).
- Stability of the core flow before additions.
- Privacy: encrypted storage, per-user isolation, plain disclosure of external LLM use, no real CVs in the repo.
- Reproducibility for the sensor: test mode, README, no group keys required.
- Testability: score and keyword logic by automated tests against fixtures; "KI-tekst må testes manuelt etter en sjekkliste" (AI text is tested manually against a checklist).
- Traceability of the project itself: plan to app (feedback).

---

## 6. Decisions recorded in the memlog

Memlog front matter: `topic: JobAssistant - AI CV and job application assistant for students`, `updated: 2026-09-11T20:29` (stale, see C2). Entries in order:

| # | Type | Entry (verbatim) | Later status |
|---|---|---|---|
| M1 | decision | "Brief purpose: pitch for a course investor-meeting exercise (IBE160), not a live raise - skip financials/funding ask, keep investor-pitch shape (problem/market/differentiation/product/why-now)." | Stands. Final brief has no explicit market or why-now section (C9) |
| M2 | decision | "Target users: university/college students hunting for their first FULL-TIME job (not internships). No institution/career-center tie-in." | Stands. "not internships" is not repeated in brief.md |
| M3 | decision | "Differentiation vs incumbents (Kickresume free 6mo, Teal free-forever): dual wedge - (1) AI-transparency feature giving users real insight into how AI/ATS/recruiters judge CVs and applications, (2) gap-analysis that translates coursework/projects/extracurriculars into legible qualifications for students with no work history." | Partly changed in the final text: "What makes this different" names only the transparency philosophy (B17) |
| M4 | decision | "Business model: Free (course project, no monetization needed)." | Stands |
| M5 | decision | "Timeline: working web application due early December 2026 - stage is pre-build/spec, framed honestly as pre-launch, no fabricated traction." | Stands |
| M6 | event | "Web research digest on AI CV/job-app tool landscape gathered (Kickresume, Rezi, Teal, Jobscan, Enhancv comparables; pricing norms 4-50/mo freemium; student no-work-history gap identified as whitespace; human reviewers penalize generic AI text)." | "4-50" vs addendum "$24 to $50" (C4) |
| M7 | decision | "Problem section finalized: catch-22 framing (ATS keyword-matching structurally favors work-experience vocabulary students don't have), no fabricated stats, kept qualitative." | Stands |
| M8 | decision | "Solution section finalized: upload-CV-once + paste-job-ad flow, learns voice from past applications, ATS-style match score with keyword-level explanations (AI-transparency feature), gap analysis suggests coursework/project-based fixes rather than just flagging gaps." | **Part reversed by M13**: the voice-learning claim |
| M9 | decision | "Differentiation section finalized: honest that there is no technical moat; the real differentiator is the transparency-first product philosophy (show why, not just beat the filter) vs incumbents' black-box 'beat the filter' approach." | Stands |
| M10 | decision | "Who This Serves finalized: primary user is any-field university/college student applying for first full-time job; purely self-serve/B2C, no institutional intermediary." | Stands |
| M11 | decision | "Success Criteria finalized: user success = suggestions feel honest/useful and defensible in interviews; delivery success = working end-to-end demo by early Dec, grading criteria out of scope for brief." | **Superseded** on 2026-10-09 (f90d41b) after the feedback: "delivery success" removed, nine testable functional criteria added, user success demoted to "directional". Not logged in the memlog |
| M12 | decision | "Scope finalized: v1 = CV upload, job ad paste-in, tailored letter, CV suggestions, gap analysis w/ coursework translation, ATS match score w/ explanations, login + encrypted storage. Out of v1: voice-learning from past applications, mobile app, multi-language, auto-apply, interview prep, LinkedIn import." | **Amended** on 2026-10-09 (5e46ce6): ranked, upload and paste-in merged into one item, DOC dropped, PDF/TXT/paste. "multi-language" refined by M16. Not logged |
| M13 | change | "Solution section paragraph 1 edited to remove 'learns voice from past applications' claim (moved out of v1 per Scope) for coherence." | **This is the reversal of part of M8.** Voice-learning stays in Vision (M14) and in the out-of-scope list |
| M14 | decision | "Vision finalized: 2-3yr picture is voice-learning maturing, transparency extending beyond ATS keywords into structure/clarity/framing feedback, becoming the student's return tool for every job after the first." | Stands |
| M15 | event | "Polish pass complete: structure+prose review (bmad-review) applied to brief.md (condensed Executive Summary, sentence-case headings, bulleted Scope, merged duplicate success definition, prose fixes) and addendum.md (reordered evidence paragraph, condensed pricing redundancy, prose fixes). Status set to ready for review." | Brief front matter now says `status: final` (C1) |
| M16 | decision (2026-10-10) | "Language: v1 is Norwegian only (bokmål) - UI, generated content, and test data. Match-score matching must normalise Norwegian inflection; compound-word handling deferred to architecture. Added success criterion 9." | Current. Only dated entry in the log |

### Changes visible in the final brief but NOT recorded in the memlog
These come from the 2026-10-09 revisions made in response to the feedback. The rationale for them lives only in the feedback file.
- U1. Success criteria rewritten as SC1-SC8 (testable, answer-key based) and the "How the match-score is calculated" paragraph added (f90d41b).
- U2. "Delivery success" paragraph removed, including its sentence "(Formal grading criteria for the course are out of scope for this brief.)" (f90d41b).
- U3. v1 list ranked in build order with a cut line, and the "Items 1-3 form the core flow ..." rule (5e46ce6).
- U4. DOC dropped; upload limited to PDF/TXT with paste fallback (5e46ce6).
- U5. "Privacy and data handling" paragraph added (5e46ce6).
- U6. Brief `status` changed from "ready for review" (memlog) to `final`; `updated` moved to 2026-10-10.

---

## 7. Success metrics and definitions of success

### Functional success criteria (brief, verbatim)
"(testable within the semester, against fixed example CVs and job ads with a pre-defined answer key)"

1. **SC1** "For a known CV and job ad, the match-score output lists which keywords from the job ad are present in the CV and which are missing, keyword by keyword."
2. **SC2** "The match-score is a single number between 0 and 100, computed deterministically by code (keyword/skill comparison between job-ad text and CV text) - not generated or estimated by the language model - so the same CV/job-ad pair always produces the same score, where 100 means every keyword/skill identified in the job ad is reflected in the CV."
3. **SC3** "The gap-analysis never suggests a qualification that isn't already supported by text in the CV: every suggested gap-filler must cite the specific CV entry (course, project, job, or extracurricular) it's drawn from."
4. **SC4** "Run against a fixed set of at least 3 example CV/job-ad pairs with a hand-written answer key: the match-score (±a defined tolerance) and gap-analysis outputs match the expected keywords and suggestions."
5. **SC5** "The generated application letter contains no qualification or keyword that isn't traceable back to the CV (no hallucinated experience)."
6. **SC6** "CV improvement suggestions each name the specific CV section they're based on, so a reviewer can verify the suggestion isn't invented."
7. **SC7** "The full core flow - upload CV (PDF or TXT), paste job ad, view match score with explanation, receive tailored letter - completes end-to-end without manual intervention."
8. **SC8** "A test mode exists that reproduces this full flow using one pre-recorded example CV and job ad with cached responses, so it can be verified without a live LLM API key."
9. **SC9** "All interface text and all generated content (letter, CV suggestions, gap analysis, explanations) are in Norwegian (bokmål), including when the job ad contains English terms."

### How the match score is calculated (brief, verbatim)
"the score is produced by code, not by asking the language model to invent a number. Keywords/skills are extracted from the job ad text and compared against the CV text (e.g., exact and near-match string/keyword comparison); the result is a 0-100 score (percentage of job-ad keywords found in the CV) plus a present/missing breakdown per keyword. Because CVs and job ads are in Norwegian, the comparison must normalise text before matching: case-insensitive, and inflected forms count as the same keyword ("prosjektleder", "prosjektlederen", "prosjektledere"). English terms that are common in Norwegian job ads (tool names, "stakeholder", "Agile") are treated as keywords like any other. How far to go with Norwegian compound words ("prosjektledelse" vs. "ledelse av prosjekter") is an architecture decision; whatever is chosen must be covered by the answer-key fixtures. This keeps the score auditable and testable against fixture data - the language model is used only for the explanatory text and the letter/gap-analysis content, not for deciding the score itself."

### User success (directional, brief, verbatim)
"(directional, not graded within the semester): over time, students should find JobAssistant's suggestions honest and useful rather than generic filler, and understand *why* a change was suggested well enough to defend it in an interview. This is a long-term outcome the functional criteria above are designed to make possible, not something measured during the course."

Dropped from the original (00319e6) "User success" text after the feedback said it could not be measured in the semester: the "students report that ..." framing; "not implying qualifications they don't have"; and "Over time, this shows up as fewer ATS-style rejections, application letters that sound like the student rather than a template, and enough understanding of how recruitment filtering works that rejections stop feeling arbitrary." Kept in the revised text: "honest and useful rather than generic filler" and "defend it in an interview". (The dropped qualitative phrases are collected in section 10.)

### How the course will judge the work (feedback, "Utgangspunkt for del 1 av mappen")
Weights for Part 1 of the portfolio, useful as an implicit definition of success for the whole project:

| Criterion | Weight | Feedback status on the brief |
|---|---|---|
| 1. Prosess og KI-styring (process and AI steering) | 30% | OK |
| 2. Funksjonalitet og omfang (functionality and scope) | 20% | Juster |
| 3. Kvalitetssikring og testing (QA and testing) | 15% | Endre |
| 4. Design og brukeropplevelse (design and UX) | 10% | OK |
| 5. Kodekvalitet og arkitektur (code quality and architecture) | 10% | Juster |
| 6. README og kjørbarhet (README and runnability) | 10% | Juster |
| 7. Ryddighet i repoet (repo tidiness) | 5% | Juster |

The feedback adds that Part 1 asks "om sensor kan følge en sporbar vei fra plan til ferdig app", "om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README".

### Coverage gaps in the criteria *(inference, from comparing S1-S7 with SC1-SC9)*
- No criterion covers S6 accounts/per-user isolation or S7 encryption.
- No criterion covers the privacy notice (C10), "preferred tone/style" (S3), the quality of explanation text (C4, "plain-language ... every suggestion" is not testable as written), or PDF extraction quality.
- SC4 leaves the tolerance undefined ("±a defined tolerance") and the answer-key negative cases implicit (see F20).
- Only the overall timing hint "in minutes, not hours" exists; no latency target.
- AI-text checks (SC3, SC5, SC6) have no stated verification method; the feedback says a manual checklist "bør beskrives i PRD-en".

---

## 8. Risks, open questions and unresolved items

### Risk ratings given by the feedback (original wording of the rating in brackets)
| Area | Rating | Comment (feedback, shortened) |
|---|---|---|
| Overall difficulty | Middels | Comparable to course proposal "2) AI CV- og søknadsassistent (middels)" |
| Time and scope | Risiko | "V1 har åtte punkter, der fire er KI-funksjoner og to er innlogging og kryptering." |
| Control of the AI's work | Risiko | Hard to check the gap analysis does not invent qualifications |
| Testability | Risiko | AI text needs a manual checklist, to be described in the PRD |
| Runnable by the sensor | Risiko | "Uten testmodus kan ikke sensor prøve kjerneflyten uten egen nøkkel." |
| Dependencies and costs | Risiko | "Ikke nevnt i briefen." |
| AI functionality | Høy | Four AI functions plus a "no invented qualifications" requirement need "gjennomtenkte prompts og kontroll av svar" |
| File handling | Høy | PDF reading unreliable with columns and tables |
| Domain logic | Middels | Score must be "forklarbar og konsistent" |
| Data model | Middels | Entities with history per ad |
| Users, roles, login | Middels | One role, but per-user isolation |
| Integrations | Middels | One LLM API |
| Security and privacy | Middels | Personal data; encrypted storage promised; external LLM must be disclosed |
| Real-time, concurrency | Lav | Each student works on own documents |
| BMAD flow fit; Claude Code fit | OK | Well-documented stack; DOC dropped |

### Other risks that follow from the brief text
- **Hallucinated qualifications** in the letter, gap analysis and suggestions (the core ethical risk; SC3/SC5/SC6).
- **Generic or AI-sounding output** that human reviewers penalise (addendum: 49% auto-dismiss, 62% reject unpersonalised AI text; unsourced) and that ATS vendors' AI-content classifiers may down-rank.
- **Norwegian text normalisation**: inflection and compound words may make the deterministic score hard to get right; the brief defers this to architecture while requiring answer-key coverage.
- **PDF extraction** of multi-column CVs producing wrong CV text, which would silently produce a wrong score *(inference)*.
- **LLM cost and API dependence** for a project with a limited budget; no cost plan in the brief.
- **Scope pressure**: seven items in about five weeks; four are LLM features; the safety net is the cut line at the bottom (S7, S6, S5, S4).
- **Competitive reality**: "nothing described here is a defensible technical moat."

### Items the sources explicitly defer to later documents
| To | Item | Source |
|---|---|---|
| Architecture | Handling of Norwegian compound words | brief |
| Architecture | Choice of LLM model and vendor, how the key is configured | feedback |
| Architecture | How test mode with example CV and mock responses works for the sensor | feedback |
| Architecture | Justify storage and encryption solution, keep it simple | feedback |
| Architecture | Plan for cost and mock responses | feedback |
| PRD | Describe manual checklist testing of AI-written text | feedback |
| PRD and epics | Carry the v1 ranking into both | feedback |
| PRD and UX | UX and PRD must point back to the same v1 items | feedback |
| Fixtures | Few example CVs with an answer key for what should and should not be suggested; at least 3 pairs | feedback, SC4 |
| Repo | `.env.example`, remove `.working/` colour drafts | feedback |

### Unresolved values in the brief
- "±a defined tolerance" in SC4: the value is not defined.
- Exact deadline date in early December.
- Which LLM, which storage, which encryption, which Norwegian text-processing approach.

Further open questions that I derive from the text are in section 11 (B-items).

---

## 9. The feedback file

### Who gave it
- File: `tilbakemelding-product-brief.md`, "Tilbakemelding på product brief" (feedback on the product brief).
- Header table: **Gruppe** "G32 - G32-grotting"; **Product brief** `_bmad-output/planning-artifacts/briefs/brief-JobAssistant-2026-09-11/brief.md` (commit `00319e6`), "lest sammen med `addendum.md` i samme mappe"; **Tilbakemelding fra** "Faglærer i IBE160 (utarbeidet med KI-støtte)"; **Dato** 2026-10-06.
- So: written by the **IBE160 subject lecturer, prepared with AI support**, for the group, based on the 2026-09-15 version of the brief. It follows the sensor's Part 1 marking criteria, so treat it as the course's own view of what the PRD and later work will be judged on.
- Overall: "**Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under." Feasibility: "**Gjennomførbart med justert omfang.**" Difficulty: "Middels".

### Every concrete point, and whether the brief appears to have addressed it
Status key: **ADDRESSED** = reflected in the final brief; **PARTLY** = reflected but with a residual gap; **FORWARDED** = not a brief matter, explicitly handed to PRD/architecture/repo; **INFO** = praise or context.

| ID | Point (feedback wording where it matters) | Status in final brief |
|---|---|---|
| F1 | Problem is "svært godt formulert"; the «project management» example "gjør løsningen konkret" | INFO, kept |
| F2 | "tydelig og ærlig standpunkt om åpenhet": show *why* (match score with keyword-level explanation) instead of a «black-box»; honest that Kickresume and Teal exist and the difference is "filosofi, ikke teknologi" | INFO, kept |
| F3 | UX work already exists "(DESIGN.md, EXPERIENCE.md og skisser) som bygger på briefen" | INFO. PRD must stay consistent with it (F30) |
| F4 | **Change 1.** Success criteria must be testable in the course. «Students report that suggestions feel honest and useful» and «fewer ATS-style rejections» "kan ikke måles i løpet av semesteret". Add functional criteria such as «for en kjent CV og stillingsannonse viser match-scoren hvilke nøkkelord som finnes og mangler» and «gap-analysen foreslår aldri en kvalifikasjon som ikke står i CV-en» | ADDRESSED: SC1-SC9; user success demoted to "directional, not graded". The two example criteria are SC1 and SC3 |
| F5 | **Change 2.** Describe how the ATS match score is calculated. If by ordinary code ("nøkkelord fra annonsen sammenlignet med CV og brev") it can be tested with an answer key; if an LLM «finner på» the score, correctness cannot be checked | ADDRESSED: SC2 and the calculation paragraph. Residual: the brief compares job ad to CV only (not CV and letter), keyword-extraction method and compound words open (B1, B2) |
| F6 | **Change 3.** Plan how the sensor can run the app without the group's LLM API key; letter, CV suggestions and gap analysis "krever trolig et betalt LLM-API"; add "en testmodus med forhåndslagrede svar for en eksempel-CV og en eksempelannonse" | PARTLY: SC8 requires it (one pre-recorded pair, cached responses). Mechanism, vendor and key handling deferred to architecture (F39); README not mentioned |
| F7 | Difficulty "Middels"; near-identical to course proposal "2) AI CV- og søknadsassistent (middels)", "med vekt på forklaring av match-scoren og oversettelse av studieerfaring" | INFO |
| F8 | Domain logic "Middels": "Match-score og nøkkelordsammenligning må være forklarbar og konsistent. Resten er i hovedsak KI-generert tekst." | ADDRESSED: deterministic code score (SC2) |
| F9 | Data model "Middels": "Bruker, CV, stillingsannonse, søknad/brev, forslag og match-resultat, med historikk per annonse" | PARTLY: brief never mentions history per ad (B7) |
| F10 | Users and login "Middels": "Én rolle, men innlogging og at hver student bare ser egne CV-er og søknader" | ADDRESSED: wording matches S6 |
| F11 | AI functionality "Høy": four AI functions (letter, CV suggestions, gap analysis, explanations) "med et uttalt krav om at KI-en ikke skal finne på kvalifikasjoner. Det krever gjennomtenkte prompts og kontroll av svar." | PARTLY: requirement is SC3/SC5/SC6; the mechanism for "kontroll av svar" (checking responses) is not specified |
| F12 | Integrations "Middels": one LLM API; "Ingen jobbportaler eller LinkedIn i v1, noe som er klokt." | ADDRESSED: both out of v1; provider not chosen |
| F13 | Real-time and concurrency "Lav" | INFO |
| F14 | File handling "Høy": "Opplasting og tekstuttrekk fra PDF, DOC og TXT. CV-er har ofte kolonner og tabeller som gjør PDF-lesing upålitelig." | PARTLY: DOC dropped, paste fallback added; PDF reliability remains and has no criterion |
| F15 | Security and privacy "Middels": personal data, "dere har lovet kryptert lagring. Tekst sendes også til en ekstern språkmodell - det bør nevnes." | ADDRESSED: "Privacy and data handling" paragraph, S7 |
| F16 | "Pass på at kjerneflyten blir ferdig og stabil før dere legger til mer: last opp CV -> lim inn annonse -> se match-score med forklaring -> få tilpasset brev." | ADDRESSED: S1-S3 before S4-S7 |
| F17 | Planning is "BMAD (product brief -> PRD -> arkitektur -> epics og stories)", implementation with Claude Code, with time for "testing, retting og README til slutt" | INFO, a constraint (section 5) |
| F18 | Time and scope "Risiko": "V1 har åtte punkter ... Det er mye, men gjennomførbart hvis dere bygger i trinn og forenkler filformater." | PARTLY: ranked, formats simplified; risk remains. Brief now has seven items because upload and paste-in were merged (C5) |
| F19 | BMAD-flow fit "OK" ("begrunnelsen for å utsette «voice-learning» står i addendumet"); Claude Code fit "OK" ("DOC-lesing ... kan droppes") | ADDRESSED |
| F20 | Control of the AI's work "Risiko": "Lag noen få eksempel-CV-er med fasit for hva som skal og ikke skal foreslås." | PARTLY: SC4 requires at least 3 pairs with a hand-written answer key. Negative cases ("ikke skal foreslås") are not explicit; fixtures do not yet exist *(inference)* |
| F21 | Testability "Risiko": "Nøkkelordmatching og score kan testes hvis de beregnes i kode. KI-tekst må testes manuelt etter en sjekkliste. Dette bør beskrives i PRD-en." | FORWARDED to the PRD (manual checklist). Score testing is ADDRESSED (SC2, SC4) |
| F22 | Runnable by the sensor "Risiko": "Ikke beskrevet. Uten testmodus kan ikke sensor prøve kjerneflyten uten egen nøkkel." | PARTLY: SC8; README not mentioned |
| F23 | Dependencies and costs "Risiko": "Ikke nevnt i briefen. Velg modell og leverandør i arkitekturen, og lag en plan for kostnad og mock-svar." | NOT ADDRESSED for cost and vendor (FORWARDED to architecture); mock responses covered by SC8 |
| F24 | Conclusion: "Gjennomførbart med justert omfang." | INFO |
| F25 | Scope adjustment 1: "Begrens opplasting i v1 til PDF og TXT (eller bare innliming av tekst som reserve), og dropp DOC." | ADDRESSED |
| F26 | Scope adjustment 2: build order (a) match score in code, (b) letter, (c) gap analysis, (d) CV suggestions, (e) login and encrypted storage | ADDRESSED: S2, S3, S4, S5, S6-S7, with intake as S1 |
| F27 | Brief parts Executive summary, Problem, Solution, What makes this different, Who this serves, Vision rated "OK" | INFO, kept |
| F28 | Success criteria rated "Endre": «User success» is experience over time; «Delivery success» "lister funksjoner, men uten hva som er riktig resultat. Legg til konkrete, testbare kriterier." | ADDRESSED: Delivery success removed, SC1-SC9 |
| F29 | Scope rated "Juster": "Vurder å forenkle filformater og å rangere v1-punktene, slik at dere vet hva som kan kuttes hvis tiden blir knapp." | ADDRESSED |
| F30 | Part 1 criterion 1, Prosess og KI-styring (30%), "OK": "Lag PRD-en neste, og pass på at UX og PRD peker tilbake til de samme v1-punktene." | FORWARDED to PRD (traceability to the same v1 items) |
| F31 | Criterion 2, Funksjonalitet og omfang (20%), "Juster": "Godt innhold, men mange KI-funksjoner. Prioriter kjerneflyten og gjør resten til trinn." | ADDRESSED via ranking |
| F32 | Criterion 3, Kvalitetssikring og testing (15%), "Endre": "Lag eksempel-CV-er og -annonser med forventet resultat, og beregn match-scoren i kode." | ADDRESSED as criteria (SC2, SC4); fixtures still to be built |
| F33 | Criterion 4, Design og brukeropplevelse (10%), "OK": "skisser for hjem, resultat og mobilnavigasjon finnes allerede" | INFO. See B11 on mobile |
| F34 | Criterion 5, Kodekvalitet og arkitektur (10%), "Juster": "Begrunn valg av språkmodell, lagring og krypteringsløsning i arkitekturen, og hold det enkelt." | FORWARDED to architecture |
| F35 | Criterion 6, README og kjørbarhet (10%), "Juster": "Planlegg testmodus med mock-svar og eksempeldata, slik at sensor kan kjøre den lokalt etter README." | PARTLY: SC8; README not in brief |
| F36 | Criterion 7, Ryddighet i repoet (5%), "Juster": `.env.example` for API key and encryption key; only made-up example CVs; ".working/" colour drafts can be cleaned up | PARTLY: made-up CVs are in the brief; `.env.example` and `.working/` are not (repo hygiene) |
| F37 | Next step 1: rewrite Success criteria with "5-8 funksjonelle kriterier" and describe the score calculation | ADDRESSED. Brief has 9 criteria, one more than asked, because SC9 was added after the feedback (C6) |
| F38 | Next step 2: rank v1 items, simplify file formats; "Ta rangeringen med inn i PRD-en og epics." | ADDRESSED in brief; FORWARDED to PRD and epics |
| F39 | Next step 3: decide in the architecture which language model, how the key is configured, how test mode with example CV and mock responses works for the sensor | FORWARDED to architecture |
| F40 | "Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter." | ADDRESSED: commits f90d41b, 5e46ce6, b78f08c; but the memlog does not record the two 2026-10-09 rounds (section 6, U1-U6) |
| F41 | "Hvorfor product brief er viktig for mappen": Part 1 is assessed on whether the sensor can follow a traceable path from plan to finished app, whether the app does what is described, is tested, well designed, and runnable after README | INFO, a constraint on PRD traceability |

### What the feedback leaves for the PRD
1. Describe the manual checklist for testing AI-written text (F21).
2. Keep traceability brief -> UX -> PRD -> epics -> code, using the same v1 items (F30, F38, F41).
3. Carry the ranking and cut line into the PRD and epics (F38).
4. Make the answer-key fixtures include what must NOT be suggested (F20).
5. Say how responses are checked ("kontroll av svar") against the CV (F11).
6. Do not leave cost, test-mode mechanics and README to chance; at least list them as dependencies for the architecture (F23, F35, F39).
7. Keep the PDF-reading risk visible (F14).

---

## 10. Qualitative intent: tone, voice, feel, values and ethics

These are the parts the FR/NFR structure tends to drop. Each is anchored in the sources.

### 10.1 Honesty and no fabrication (the hard ethical line)
- Product promise: "a tailored, honest application". Result of gap-filling: "more honestly representative of what the student can actually do."
- Core rule: "using experience they already have rather than experience they don't."
- Testable form: SC3 (gap-filler must cite a CV entry), SC5 ("no hallucinated experience"), SC6 (suggestion names the CV section).
- Addendum pitfall to avoid: "implying/hallucinating qualifications during gap-filling."
- Original (removed) success text: "not implying qualifications they don't have."
- Feedback: "et uttalt krav om at KI-en ikke skal finne på kvalifikasjoner."
- Project summary: must never suggest skills the user does not have.

### 10.2 Transparency is the product
- "shows its work"; "Instead of a black box, the student sees exactly why."
- "that transparency is the product, not a feature bolted onto it."
- "instead of hiding how the system works, it shows the student why a suggestion was made and what recruiters and ATS software are actually scanning for."
- Memlog M9: "show why, not just beat the filter".
- The score is deliberately auditable and reproducible: "the same CV/job-ad pair always produces the same score"; "keeps the score auditable and testable".

### 10.3 Authentic voice; tailored, not templated
- "The output is tailored, not templated."
- Letter "in the student's own preferred tone and style"; the original success text also wanted "application letters that sound like the student rather than a template".
- Addendum pitfalls: "generic/robotic output that reads as templated; over-optimization for ATS keyword-stuffing at the expense of authentic voice".
- Brief: keyword-stuffed output is what "human reviewers are learning to distrust".

### 10.4 Student understanding and agency
- "the student understands and edits the reasoning rather than accepting a black-box draft - which also means they can actually defend and expand on what's in their application when an interviewer asks about it."
- Vision: "a real, transferable understanding of how hiring works"; Solution: "a look most students never get".
- Original (removed) success text: "enough understanding of how recruitment filtering works that rejections stop feeling arbitrary."
- Implication: the product assists and teaches; it does not auto-apply (auto-apply is out of v1).

### 10.5 Trust and candour, including about itself
- Vision closing line: "because by then they trust it to be honest with them."
- Brief about itself: "To be honest about it: nothing described here is a defensible technical moat."
- Memlog: "framed honestly as pre-launch, no fabricated traction"; "no fabricated stats, kept qualitative".
- Modest outcome claim: "applications that clear the filter more often", and "more likely to clear the filter", not a promise to beat it. The score is "ATS-style", an approximation, not what a given real ATS would output *(inference)*.

### 10.6 Tone of explanations
- The only sample copy: "recruiters scanning for this role look for X; your application doesn't show it yet". Reading it: plain language, factual, non-judgemental, forward-looking ("yet"), aimed at someone with "no prior experience with how recruitment technology works" *(inference)*.

### 10.7 Privacy stated plainly
- "CVs contain personal data."
- The student is told "plainly" that text goes to an external language-model provider.
- The score is computed locally, "does not require sending data out".
- "real CVs never go into the repository."

### 10.8 Norwegian as the product's voice
- Bokmål only, everywhere the student sees text, "including when the job ad contains English terms"; English terms in ads are matched as keywords but the output stays Norwegian.

### 10.9 Feel and visual direction
Not described in the four sources *(gap)*. The feedback says design intent lives in DESIGN.md, EXPERIENCE.md and sketches (home, result, mobile navigation). The investor-pitch shape of the brief (M1) is a writing style for the brief, not a product feel.

### Suggestion for the PRD *(my recommendation)*
Carry 10.1-10.8 as an explicit "product principles" section and tie each to its testable criterion, rather than leaving them implicit in FRs. SC3, SC5 and SC6 are the testable form of 10.1; SC2 is the testable form of 10.2; there is currently no testable form for 10.3, 10.4, 10.6.

---

## 11. Conflicts with the project summary, and ambiguities

### A. Against the project summary given for this task
- **A1. Budget.** The summary says "limited budget". The brief states no budget and no cost plan; it only says "Free (course project, no monetization needed)". The feedback explicitly marks costs as "Ikke nevnt i briefen". No conflict, but a gap the PRD must fill.
- **A2. Job ad is pasted, not uploaded.** The summary says users "upload a CV and a job ad". In the brief the CV is uploaded (PDF/TXT) or pasted; the job ad is only pasted ("job advertisement paste-in").
- **A3. "Never suggest skills the user does not have" versus the brief's standard.** The brief's test is "supported by text in the CV" with a cited CV entry. That is a text-traceability test, not a truth test. Its own example (a "semester-long group project" supports a "project management" keyword) is an inference step, so the boundary between legitimate rewording and over-reach needs a precise rule (B4).
- **A4. "Qualifications missing from the CV".** The brief's gap analysis both lists missing items and suggests how to fill them from existing CV content. It "never suggests a qualification" unsupported by the CV. So "missing" items without a CV basis can only be flagged, never offered as fillers. The brief does not say what the student sees in that case (B4).
- **A5. Summary omits** accounts/login, encrypted storage, test mode, Norwegian-only, DOC exclusion, privacy notice, the ranked build order with cut line, and the answer-key fixtures. All are in the brief and are PRD-relevant.
- **A6. "ATS score".** The brief calls it "ATS-style match score", computed as a percentage of job-ad keywords found in the CV. It does not emulate a real ATS.
- **A7. "Suggestions for rewording existing skills and school projects".** The brief splits this across two scope items, gap analysis (S4) and CV improvement suggestions (S5), without distinguishing them (B5).
- **A8. Deadline.** Consistent ("early December"); exact date unknown.
- Consistent with the summary: web app, students seeking a first job, CV plus job ad as input, AI-written tailored letter, code-calculated keyword score with explanation, IBE160 course project.

### B. Ambiguities and open questions inside the sources
- **B1. Is the letter part of the score?** Solution: keywords "reflected in their CV and letter". SC2 and the calculation paragraph: "job-ad text and CV text" only. Feedback example: "nøkkelord fra annonsen sammenlignet med CV og brev". Decide: CV only, or CV plus letter?
- **B2. Keyword extraction and determinism.** "Keywords/skills are extracted from the job ad text" but the extractor is not named. If an LLM extracted them, "the same CV/job-ad pair always produces the same score" would not hold. The statement that the score "is computed locally and does not require sending data out" points to code-based extraction *(inference)*. Also undefined: what counts as a keyword (single word versus multi-word phrase such as "project management"), stop-words, weighting (equal weight assumed since the score is a plain percentage), integer versus decimal score, and the SC4 tolerance.
- **B3. Fixture counts and LLM outputs.** SC4: at least 3 pairs with hand-written answer key, and gap-analysis outputs "match the expected keywords and suggestions". SC8: one pre-recorded pair with cached responses. LLM output cannot be exact-matched; the feedback says AI text is checked by a manual checklist. Which checks are automated (score, keyword lists, citation of CV entries) and which are manual (letter quality, suggestions) must be decided. Also unclear whether gap analysis in the 3-pair test runs live, cached or by checklist.
- **B4. "Legitimately fills" and the no-filler case.** No rule is given for when a CV entry legitimately supports a keyword, or for what the student sees when no CV entry can fill a gap (the brief implies it is flagged only). A checkable rule is needed for the fixtures.
- **B5. Gap analysis (S4) versus CV improvement suggestions (S5).** The brief gives them separate scope items and criteria but no separate definitions. Possible split: S4 maps missing keywords to existing CV entries; S5 suggests rewording of CV sections *(inference)*.
- **B6. "Preferred tone/style".** Voice-learning is out of v1, yet S3 says "preferred tone/style". How the preference is expressed (choice list, free text, default) is not defined, and no criterion tests it.
- **B7. Persistence and the cut line.** "uploads their CV once" implies a stored CV, which implies S6 accounts and S7 storage, but those two are the first to be cut. If they are cut, does the app work session-only, and does it store anything unencrypted? Also unclear: one CV or several per student ("their own CVs"), and whether a history per ad exists (feedback assumes it).
- **B8. Editing and export.** The brief says the student "understands and edits the reasoning", yet no in-app editing, copy, export or download of the letter or suggestions is listed, and no revised-CV output exists.
- **B9. Scope of explanations.** "a plain-language explanation accompanies every suggestion": does that include the letter, each gap-filler, each CV suggestion, each missing keyword? The format and depth are open.
- **B10. Test mode details.** Does it bypass login? Does the sensor use only the one fixed example pair (cached responses can only serve that pair)? Who records the cached responses and in what language (Norwegian, per the language rule)?
- **B11. Mobile.** "Mobile app" is out of v1, but the feedback says sketches for "mobilnavigasjon" exist and commit b78f08c translated a "mobile nav mockup". Clarify that a responsive or mobile-web layout is in or out. (The UX documents were not read.)
- **B12. Criteria coverage gaps.** See the list in section 7 (S6, S7, privacy notice, tone, explanation quality, PDF extraction).
- **B13. PDF extraction failure.** The paste fallback exists, but how the student learns that extraction failed or garbled the CV, and whether they can see and correct the extracted text, is not specified.
- **B14. Privacy specifics absent.** No mention of consent step, data retention, deletion, GDPR, or the provider's data-use policy (for example no training on submitted text) *(gap)*. Only the plain disclosure and encryption are stated.
- **B15. Team, budget and deadline specifics.** Team size and skills, a spend limit and the exact date are all absent.
- **B16. Language of the planning documents.** Brief, addendum and memlog are English; the feedback is Norwegian; the product is Norwegian. The PRD's own language is not set by the sources. Norwegian output strings in examples (fixtures, cached responses, UI copy) must be Norwegian.
- **B17. Differentiator framing.** M3 describes a "dual wedge" (transparency plus gap translation for students without work history). The final "What makes this different" names only the transparency philosophy; gap translation appears under Solution and Scope. Decide how the PRD frames the second wedge.
- **B18. Where gap analysis and CV suggestions sit in the flow** relative to the letter (before, after, or on the same results screen) is not stated.

### C. Inconsistencies between the source files
- **C1.** Memlog M15: "Status set to ready for review". Brief front matter: `status: final`. No memlog entry for the change.
- **C2.** Memlog front matter `updated: 2026-09-11T20:29` while its last entry (M16) is dated 2026-10-10.
- **C3.** The memlog omits the two 2026-10-09 revision rounds (U1-U6 in section 6). It also still says M11 "delivery success ... grading criteria out of scope for brief", which the final brief no longer contains.
- **C4.** Memlog M6 "pricing norms 4-50/mo" versus addendum "Paid tiers cluster $24 to $50/mo". Likely a typo for 24.
- **C5.** The feedback counts "åtte punkter" in v1; the revised brief lists seven (upload and paste-in merged into S1).
- **C6.** The feedback asked for "5-8" functional criteria; the brief has nine (SC9 was added on 2026-10-10 for the language decision).
- **C7.** The addendum's figures (49%, 62%, "May 2026 audit", "late 2025" classifiers) have no cited sources, while M7 insists on "no fabricated stats". Treat them as unverified background; do not restate them in the PRD as facts without a source.
- **C8.** The Executive summary says Kickresume and Teal "already offer free AI-generated resumes". The addendum says Kickresume is free only through a student programme (6 months Premium) and costs $24/month otherwise, while Teal has a free-forever tier. Minor.
- **C9.** M1 says to keep the investor-pitch shape "(problem/market/differentiation/product/why-now)". The final brief has no explicit market-size or why-now section; the why-now evidence sits in the addendum.
