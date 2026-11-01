---
title: JobAssistant PRD
status: final
created: 2026-10-31
updated: 2026-11-01
---

# PRD: JobAssistant

## 0. Document purpose

This PRD defines what JobAssistant v1 must do by the IBE160 portfolio deadline in early December 2026. It has three readers:
- Helene, the product owner, who builds the app alone and makes the product decisions.
- The IBE160 examiner (*sensor*), who grades the app, the repository and its history against the plan.
- The next BMad steps (architecture, epics and stories), which must reuse its IDs.

**In short:** v1 follows the brief's build order. S1–S3 (input, Match score and Letter) form the core flow and must be stable by 22 November. S4–S5 (Gap analysis and Rewording suggestions) come next. S6 + S7 (accounts and encrypted storage) come last, and are cut first if time runs short (§5.1). The app runs locally from the README and is also hosted on Vercel (FR-30).

It builds on these documents and does not repeat them:

- **Product brief** ([brief.md](../../briefs/brief-JobAssistant-2026-09-11/brief.md)). This is the approved proposal. The brief numbers its "In v1" items and its success criteria without labels; this PRD calls them S1–S7 and SC1–SC9, in the brief's order. §11 lists every deviation from it.
- **UX specification** ([EXPERIENCE.md](../../ux-designs/ux-JobAssistant-2026-09-11/EXPERIENCE.md), [DESIGN.md](../../ux-designs/ux-JobAssistant-2026-09-11/DESIGN.md) and the mockups). It owns screens, states, microcopy and visual design. UJ-1 below is the UX's "Flow 1", adapted to the decisions in this PRD.
- **Lecturer feedback on the brief** ([tilbakemelding-product-brief.md](../../briefs/brief-JobAssistant-2026-09-11/tilbakemelding-product-brief.md), 2026-10-06) and **the IBE160 examiner guide, Part 1**. The guide is summarised in [extract-sensorveiledning.md](extract-sensorveiledning.md).
- **[addendum.md](addendum.md)**: research findings, notes for the architecture, rejected and deferred alternatives, the list of UX updates, and questions for the lecturer.

**Conventions**
- Terms defined in the Glossary (§3) are used exactly as defined there.
- These items have stable IDs that stories, commits, tests and session logs should cite:
  - functional requirements, FR-1 to FR-31 (§6), and non-functional requirements, NFR-1 to NFR-11 (§7);
  - user journeys, UJ-1 to UJ-3 (§2.3), and principles, P1 to P6 (§4);
  - changes from the brief and the UX, D1 to D23 (§11);
  - success metrics, SM-1 to SM-8, and counter-metrics, SM-C1 to SM-C3 (§12);
  - checklist items L1 to L8, G1 to G5 and R1 to R3 (§9.2);
  - the brief's scope items S1 to S7 and success criteria SC1 to SC9.
- Each FR and NFR ends with a **Verify** line: *Auto* (automated test), *Manual* (a manual check), or both. The Verify lines are authoritative; §9 says how the checks run and where the results are recorded.
- Decisions A1a to A4a are the product owner's answers recorded in this PRD's `.memlog.md` on 2026-10-31.
- `[ASSUMPTION]` marks something inferred but not yet confirmed. §14 lists every assumption.

## 1. Vision

JobAssistant is a Norwegian web app for students applying for their first full-time job. The student uploads a CV once and pastes in a job ad. The app returns three things:
- a Match score showing which of the ad's keywords the CV covers;
- an honest analysis of each gap, with concrete suggestions for rewording experience the student already has;
- a draft application letter tailored to the role.

The problem is vocabulary, not ability. Students have real qualifications from courses, group projects, part-time jobs and volunteering. They describe them in academic language that doesn't match the ad, so a recruiter skimming the CV, or a recruitment system searching it for terms, can miss them.

JobAssistant differs in its stance, not its technology: it shows its work and never invents.
- Ordinary code calculates the score. The app shows the formula and the CV line behind every matched keyword.
- Every suggestion points to the CV entry it is based on.
- A skill the CV can't support is reported as a real gap and never filled in.

The student gets an application letter that captures their skills and strengths and matches the job ad well, a transparent Match score, and suggestions for how experience from school can be worded to better match the ad's keywords, in a way they can defend in a job interview.

## 2. Target users

### 2.1 Jobs to be done

- When I find an ad I want to apply for, I want to see quickly how well my CV matches it and why, so I can decide whether and how to apply.
- When the ad asks for something my CV doesn't mention, I want to know whether I already have that experience under another name, so I can describe it in the employer's words without lying.
- When I write the letter, I want a tailored draft built on my real experience, so I neither start from a blank page nor send a generic letter.
- When an interviewer asks about my application, I want to be able to back up every claim in it.
- *Examiner:* when I grade the project, I want to run the core flow from the README without an API key, try it live on the Hosted version, and trace each feature back to a requirement.

### 2.2 Non-users (v1)

- Experienced professionals and career changers. The analysis is designed for CVs built from studies, projects and part-time work.
- People who need an English or nynorsk interface or output.
- Employers, recruiters and career centres. There is no recruiter side and no institutional account.
- Anyone outside the project. Only the developer and the Examiner use v1, and the Hosted version is closed to everyone else (FR-31).

### 2.3 Key user journeys

**UJ-1. Violet gets her first explained match and letter** (UX Flow 1, adapted)
- **Persona and context:** Violet is a final-year informatics student applying for a junior frontend developer job. Her CV is mostly courses and one semester-long group project.
- **Entry state:** first visit, not logged in, laptop browser.
- **Path:**
  1. On Hjem she clicks «Lag skreddersydd søknad» and registers with her name, email and password.
  2. On Profil she uploads her CV as a PDF. The extracted text appears. She fixes a line that the two-column layout scrambled, then saves.
  3. On Søknad she pastes the ad, types the job title and the employer, and picks a Tone. She accepts a one-time notice that her text will be sent to an AI provider.
  4. The Match score appears within seconds. A progress line says that the Letter and the Gap analysis are being written.
- **Climax:** The Reflection Note reads «71 % samsvar – 5 av 7 nøkkelord» and shows the CV line where each Matched keyword was found.
  - «Tverrfaglig samarbeid» is a Rewordable gap. The note cites her semester project and suggests a new phrasing.
  - «Kubernetes» is a Real gap. The note says so plainly and gives her nothing to paste in.
  - The draft Letter appears on screen, labelled as an AI draft.
- **Resolution:** she copies the Letter into her own document, or downloads it as .docx, and edits it there. The Application is saved in Historikk.
- **Edge case:** her PDF is a scanned image with no text to extract. The app says so and asks her to paste the CV text instead.
- **Without accounts** (before build step 6, or after the first cut in §5.1): Violet starts on Søknad, uploads and confirms her CV there, and gets the same results. Nothing is saved in Historikk, and the Letter's sign-off is a placeholder.

**UJ-2. Violet comes back with a new job ad**
- **Persona and context:** a few weeks later, Violet has found a new ad: Junior produktanalytiker at Fjord Analytics. She wants a Letter and a Match score for this particular job.
- **Entry state:** returning user with a saved Profile; she logs in with her email and password.
- **Path:**
  1. She opens Søknad. Her saved CV text is already filled in, so she doesn't upload her CV again.
  2. She pastes the new ad, types the job title and the employer, and picks a Tone. The AI notice doesn't appear again, because she accepted it on her first visit.
- **Climax:** the Match score for this ad appears within seconds. The Letter and the Rewording suggestions follow within a minute, all written for this job.
- **Resolution:** she leaves with a new Letter, a Match score for this job, and suggestions for phrasing her experience to match this ad. Both Applications are saved in Historikk, where they can be reopened, copied and downloaded, but not edited.
- **Edge case:** she has updated her CV since last time. She uploads the new version on Profil, where it replaces the old CV text, and confirms the extracted text as in UJ-1 (FR-3, FR-20).

**UJ-3. Kari, the examiner, runs the core flow without an API key**
- **Persona and context:** Kari grades IBE160 portfolios. She has the repository, the README, and 15–20 minutes per group to get each app running.
- **Entry state:** a clean machine, a fresh clone, no API keys.
- **Path:**
  1. She follows the README commands. Setup creates the local secrets, and the app starts in Test mode.
  2. If accounts exist, she logs in as the local test user named in the README (FR-29). Otherwise she goes straight to Søknad.
  3. On Søknad she clicks «Bruk eksempelet», which fills in the Example pair, and submits it. Uploading the example CV file from the repository works too.
  4. She runs the test suite with one command.
- **Climax:** she sees the whole core flow with no key and no cost: the Match score from code, and the Gaps, Rewording suggestions and Letter from Cached responses.
- **Resolution:** she moves on to the planning documents and the code, which cite FR IDs. With the Access code handed in with the submission, she can also try the Hosted version with live AI (FR-30, FR-31).
- **Edge case:** she pastes her own Job ad in Test mode. The Match score still works, because it is calculated locally (under the FR-5 fallback, with code-only Keywords marked as less precise). The AI sections say they are not available in Test mode.

## 3. Glossary

- **Student**: a person using JobAssistant to apply for a job. It is the only role (FR-19).
- **Examiner**: the IBE160 *sensor* who runs and grades the app, locally in Test mode and optionally on the Hosted version.
- **Profile**: a Student's name and current CV text. Each Student has one Profile.
- **CV text**: the plain text of the Student's CV, which all analysis uses. It comes from an upload (with text extraction) or from pasting, and the Student confirms it. Each Profile holds one CV text.
- **CV entry**: one item in the CV text, such as a course, project, job, volunteer role or skills line. In code, the entry around an Evidence citation is the block of lines, bounded by blank lines, that contains it.
- **Job ad**: the pasted text of a job advertisement, together with the job title and employer that the Student types in.
- **Application**: one analysis of one Job ad against the CV text. It holds the resulting Match score, Gaps, Rewording suggestions and Letter. Once accounts exist (S6), it is saved in History.
- **Keyword**: a skill, tool, method, qualification or domain term named in the Job ad, as extracted by the Keyword engine (or proposed by AI under the FR-5 fallback).
- **Keyword engine**: the code, with no AI involved, that extracts Keywords from a Job ad and finds them in a text. The Match score and the Integrity guards both use it.
- **Matched keyword**: a Keyword found in the CV text. Its **Evidence** is the excerpt of the CV text where it was found.
- **Missing keyword**: a Keyword not found in the CV text.
- **Match score**: shown in the UI as «ATS-samsvar». A whole number from 0 to 100: the Matched keywords as a percentage of all Keywords. It estimates keyword coverage; it is not the result of a real applicant tracking system (ATS).
- **Verdict**: either Strong match («Sterkt samsvar») or Needs work («Bør forbedres»), depending on whether the Match score reaches the threshold of 70 (FR-7).
- **Gap analysis**: the AI step that turns each Missing keyword into a Gap.
- **Gap**: a Missing keyword after Gap analysis. It is one of two kinds:
  - **Rewordable gap**: the CV text shows the experience in other words, backed by an Evidence citation.
  - **Real gap**: there is no such evidence.
- **Evidence citation**: a word-for-word excerpt of the CV text that an AI output relies on.
- **Rewording suggestion**: a concrete new phrasing of one CV entry. It expresses a Rewordable gap's Keyword using only facts already in that entry.
- **Letter**: the AI-written draft application letter (*søknadsbrev*) for one Application.
- **Tone**: the style preset the Student picks for the Letter.
- **Reflection Note**: shown in the UI as «Refleksjonsnotat». The on-screen results panel of an Application: Match score, Verdict, keyword lists, Gaps and Rewording suggestions.
- **Integrity guard**: an automatic code check of AI output against the CV text, which runs before the output is shown.
- **Unsupported claim**: a Missing keyword that appears either in the Letter without the backing that FR-11 accepts, or in a Rewording suggestion written for a different Keyword.
- **Upgrade word**: a word that can describe a bigger kind of work or role than a CV entry shows, such as «forsket», «ledet» or «ansvarlig for». The list is kept in code (FR-11, FR-17).
- **AI request**: one call to the external AI provider.
- **Daily cap**: the maximum number of AI requests per Student per day; before accounts exist, per installation (FR-25).
- **History**: shown in the UI as «Historikk». The list of a Student's saved Applications.
- **Test mode**: running the app on Cached responses instead of the AI provider (FR-27).
- **Example pair**: the bundled fictional CV and Job ad that Test mode can run end to end. It is one of the Fixtures.
- **Cached response**: a pre-recorded AI output stored in the repository.
- **Fixture**: a fictional CV and Job ad with an **Answer key** (*fasit*): the hand-written expected results (FR-28).
- **Pages**: Hjem, Søknad, Profil, Historikk and Konto, as named in the UX. «Søknad» is the page where an Application is made, not the Application itself.
- **Hosted version**: the copy of the app deployed at a public URL (FR-30).
- **Access code**: the code, set in configuration, that opens the Hosted version to the developer and the Examiner (FR-31).

## 4. Product principles

These principles turn the brief's values (honesty, transparency, student agency) into rules that can be checked. Each one names the requirements that enforce it.

- **P1. Never invent.** Nothing JobAssistant produces may claim a qualification that the CV text doesn't support. Integrity guards check this automatically where code can (FR-11, FR-15, FR-17), and the manual checklist covers the rest (§9.2).
- **P2. Show the work.** The Match score comes from code, never from AI. At most, AI may propose the Keyword list (FR-5). The Reflection Note shows the formula and the Evidence for every Matched keyword (FR-5 to FR-8).
- **P3. The student decides.** Suggestions use hedged language: «dekker trolig dette – vurder å ta det med». There is no one-click "add keyword" and nothing is sent automatically. The Student copies only what they choose (FR-12, FR-16).
- **P4. Be honest about the tool itself.**
  - The Match score is labelled as an estimate of keyword coverage, not a real ATS result (FR-8).
  - AI-written text is labelled: the Letter as a draft (FR-9), and the Gap explanations and Rewording suggestions as written by AI (FR-14).
  - The Student is told before any text leaves the app (FR-24).
- **P5. Plain, warm Norwegian.** Bokmål, addressing the user as «du», stating the fact first and then the reason. No cheerleading, exclamation marks or emoji. This follows the UX tone of voice (NFR-1).
- **P6. Spend little, store little.** At most two AI requests per Application, plus any new Letters the Student asks for (changes under the FR-5 fallback). Only what the app needs is stored, and personal content is encrypted (NFR-8, FR-22, FR-23).

## 5. MVP scope, build order and cut line

### 5.1 In scope, in build order

The brief and the lecturer's feedback set the rule: S1–S3 form the core flow and must be finished and stable before work starts on S4–S7. If time runs short, cut from the bottom. The epics follow these steps in order, so a cut removes whole epics from the bottom.

| Step | Brief | Feature | Also built in this step |
|---|---|---|---|
| 1 | S1 | §6.1 CV and Job ad input | Hosted skeleton with the Access code (FR-30, FR-31) |
| 2 | S2 | §6.2 Match score and keyword explanation | Fixtures and Answer keys (FR-28) |
| 3 | S3 | §6.3 Letter | AI safeguards (§6.8), Test mode (FR-27) |
| | | **Core-flow checkpoint:** UJ-1 works end to end without accounts (SC7, SC8) | |
| 4 | S4 | §6.4 Gap analysis | |
| 5 | S5 | §6.5 Rewording suggestions | |
| 6 | S6 + S7 | §6.6 Accounts, Profile and History; §6.7 Encrypted storage | Seeded test user (FR-29) |

S6 and S7 ship together, because nothing about a Student is written to disk until encryption is in place.

**Before accounts exist** (steps 1–5, and permanently after the first cut):
- Hjem's main button goes straight to Søknad. The navigation shows only Hjem and Søknad; Profil, Historikk and Konto don't exist yet.
- The Student uploads or pastes the CV text and confirms it on Søknad (FR-3). It is kept in the browser session only.
- Nothing about a Student is written to disk. Only non-personal data may be stored, such as saved Keyword lists under the FR-5 fallback.
- The AI notice appears once per browser session (FR-24), the Daily cap counts per installation (FR-25), and the Letter's sign-off is a placeholder (FR-9).
- No «Lagret.» message and no trust line about encryption are shown.
- On the Hosted version, the Access code is requested once per browser session (FR-31).

Hosting is set up in step 1, so problems show up early. If the Hosted version can't be made to work, the README run (NFR-9) is the delivery, and the change is logged in §11.

**Cut order and what each cut means**
1. **S6 + S7 go first.** The app stays as described under "Before accounts exist": the Student uploads or pastes the CV on every visit, nothing is saved in Historikk, and UJ-2 starts with a new upload. In UJ-3 the Examiner skips the login, and the seeded test user (FR-29) is dropped. Gap analysis and Rewording suggestions matter more to what the app does than saving data, so they are protected longer. Note that the delivered scope then falls short of the proposal, while the examiner guide's top grades for criterion 2 require scope that matches it.
2. **S5 goes next.** Gaps still cite the supporting CV entry, but without a suggested new phrasing. Brief criterion SC6 is then not delivered.
3. **S4 goes last.** The Reflection Note shows only the Matched keywords with their Evidence, the Missing keywords and the code-written explanations (FR-8). SC3 and the gap half of SC4 are then not delivered.

Every cut, and every criterion it leaves undelivered, is reported in §11.

### 5.2 Delivery milestones `[ASSUMPTION]`

Planned against the working deadline of about 10 December 2026, with one developer.

| Week | Dates | Goal |
|---|---|---|
| 45 | 2–8 Nov | Architecture; UX update (addendum §4); epics and stories; project skeleton deployed to the host with the Access code; S1 |
| 46 | 9–15 Nov | S2: Fixtures and Answer keys first, then the Keyword engine and automated tests. Decide on the FR-5 fallback at the end of the week |
| 47 | 16–22 Nov | S3: Letter, Test mode, AI safeguards. **Core-flow checkpoint** |
| 48 | 23–29 Nov | S4 and S5, with their Integrity guards |
| 49 | 30 Nov–6 Dec | S6 + S7: accounts, Profile, History, encryption |
| 50 | 7–10 Dec | README, checklist runs (§9.2), clean-machine dry run, final deploy, check of every planning document against the delivered app, repository clean-up (including the UX `.working/` folder), buffer |

Some weeks will have less working time than others, so the plan relies on two decision points instead of long working weeks:
- **22 November, core-flow checkpoint.** S1–S3 count as stable when:
  - the automated tests for FR-1 to FR-12 and FR-24 to FR-28 pass;
  - SM-1 passes for the Example pair in Test mode and for at least one live Fixture;
  - SM-2 passes;
  - the wrong-input tour (§9.3) causes no crash.

  If not, finish S1–S3 before anything else, and apply the cut order in §5.1.
- **29 November.** S4 and S5 count as stable when the automated tests for FR-13 to FR-17 pass, and one live Fixture run has no G2 or R1 failures. If not, use week 49 to finish them, and drop S6 + S7.

The final week is never compressed. In it, every planning document (PRD, UX, architecture, epics) is checked against the delivered app: each assumption and open question is closed or resolved, any cut or use of the FR-5 fallback is logged in §11, and the documents are committed.

### 5.3 Deferred to after v1

| Item | Reason |
|---|---|
| Standalone «Vurder CV» and «Vurder søknad» (UX Flow 2) | Two extra AI features, with one developer and a short timeline (decision A2a) |
| Generated or rewritten CV file (UX Flow 1) | An extra AI generation, and the place where invented skills slip in most easily (decision A1a) |
| Learning the Student's voice from earlier letters (brief Vision) | Needs personalisation, not just a prompt; out of reach for the timeline (brief) |
| Weighting required over preferred Keywords; separate checks of formal requirements | Keeps the score simple and fully explainable in v1 |
| Search, delete and rename in History; downloading the Reflection Note | Minimal History is enough for v1 (decision A3a) |
| Password reset, email verification, password change, account deletion | Only the developer and the Examiner use v1 |
| English or nynorsk interface and output; language detection | Brief decision of 2026-10-10: bokmål only |
| Feedback on structure, clarity and framing beyond keywords (brief Vision) | A further AI feature; the deferred «Vurder CV» and «Vurder søknad» would be a first step |
| Interview preparation | Out of v1 in the brief; job boards, LinkedIn import and auto-apply are non-goals (§10) |

## 6. Features

### 6.1 CV and Job ad input (brief S1)

**Description:** The Student gives the app two texts: the CV text and the Job ad. The CV can be uploaded as PDF or TXT, or pasted. The extracted CV text is always shown so the Student can correct it, because PDF extraction often scrambles CVs with columns or tables. The Job ad is pasted, together with the job title and the employer. Realises UJ-1 and UJ-2.

#### FR-1: Upload a CV file
The Student can upload a CV as a PDF or TXT file, and the system extracts its text.
- Accepts .pdf and .txt files up to 2 MB `[ASSUMPTION]`. Any other type or size is rejected at the upload field before anything is sent, with the UX messages «Bare PDF- og TXT-filer støttes.» or «Filen er for stor.».
- If a PDF has no extractable text (for example, a scan), the system says so and asks the Student to paste the text instead (FR-2).
- The uploaded file is discarded after extraction (FR-23).

**Verify:** Auto.

#### FR-2: Paste CV text
The Student can paste the CV text instead of uploading a file.
- Accepts 200–20,000 characters `[ASSUMPTION]`. Text outside this range gets an inline message.

**Verify:** Auto.

#### FR-3: Review and correct the CV text
After an upload, the Student sees the extracted CV text in an editable field and confirms it before it is used.
- All analysis uses the confirmed CV text, never unreviewed extraction output.
- The Student can edit the CV text again later: in Profil once S6 exists, and on the Søknad page before then.

**Verify:** Manual (the two-column PDF Fixture shows that a scrambled extraction can be corrected).

#### FR-4: Enter a Job ad
The Student pastes the Job ad text and types the job title and employer.
- The Job ad text must be 200–15,000 characters `[ASSUMPTION]`. The job title and the employer are required, with at most 200 characters each `[ASSUMPTION]`.
- Job ads cannot be uploaded as files or imported from a URL.
- If the Keyword engine finds fewer than 3 Keywords, the system says the ad is too short or unclear to analyse, and shows no score.
- Only bokmål Job ads are supported. The app doesn't detect other languages, and its results for an English or nynorsk ad are undefined (§5.3).

**Verify:** Auto.

### 6.2 Match score and keyword explanation (brief S2)

**Description:** The Keyword engine extracts Keywords from the Job ad and looks for each one in the CV text. It is ordinary code with no AI, apart from the approved fallback in FR-5. The same inputs therefore always give the same result, and the score appears at once, free of charge, before any AI request. The same code writes the explanation from fixed sentence templates (D7). Realises UJ-1 and UJ-3.

#### FR-5: Extract Keywords from the Job ad
The system extracts a list of Keywords from the Job ad text.
- Keywords are the skills, tools, technologies, methods, qualifications and domain terms named in the ad. Ads can come from any field, not only IT (brief): «sårvurdering» in a nursing ad is a Keyword just as «React» is in a developer ad. Keywords include English terms common in Norwegian ads, such as «Agile» and «stakeholder».
- Stop words and generic boilerplate (company description, benefits) are not Keywords.
- Duplicates and inflected forms of one Keyword count once.
- By default, code extracts the Keywords with no AI, so the same Job ad text always gives the same list (SC2).
- **Approved fallback** (product owner, 2026-10-31): if code alone can't extract Keywords well enough, AI may propose the Keyword list instead, once per Job ad.
  - "Well enough" means that code-only extraction passes SM-2 on every Fixture, including one held-out Fixture written after the vocabulary is tuned. It is decided at the end of week 46 (§5.2).
  - The Keyword engine must find each AI-proposed Keyword in the Job ad text; any it can't find are dropped.
  - The list is saved and reused, keyed by a hash of the Job ad text, so the same Job ad always gets the same list and score. This store holds no data about a Student, so it may exist before S7. Matching and scoring stay in code (P2).
  - Using the fallback must be recorded in §11 as a change to the brief's promise that the score "does not require sending data out". For a new Job ad, it changes these requirements:
    - the Match score waits for that AI request, so FR-8's "without waiting for any AI output" and NFR-4's 2-second target no longer apply;
    - the Application uses up to 3 AI requests instead of 2 (P6, NFR-8);
    - the FR-24 notice must also say that the Job ad, never the CV, is sent to extract Keywords;
    - in Test mode, and once the Daily cap is reached, new Job ads are scored with code-only Keywords, marked as less precise (FR-25, FR-27, UJ-3);
    - determinism (NFR-6) holds once a Job ad's list is saved, and the Fixtures use cached lists, so the tests stay deterministic.

**Verify:** Auto (Fixtures; a planted Cached response with a Keyword the ad doesn't contain).

#### FR-6: Match Keywords against the CV text
For each Keyword, the system decides whether the CV text contains it, and where.
- Matching ignores case. It accepts Norwegian inflections («prosjektleder», «prosjektlederen», «prosjektledere»), hyphen and space variants, split compounds («prosjekt ledelse» matches «prosjektledelse»), and known English–Norwegian aliases («agile» matches «smidig»).
- By default, paraphrases such as «ledelse av prosjekter» are left to Gap analysis (FR-13). The architecture may match them in code if the Fixtures cover such cases.
- Over-matching is a defect. Each Fixture includes negative cases that must not match. For example, the CV word «ledelse» on its own must not match the Keyword «prosjektledelse».
- How far compound handling goes is left to the architecture, but the Fixtures must cover whatever is chosen (brief).

**Verify:** Auto.

#### FR-7: Calculate the Match score and Verdict
- Match score = Matched keywords ÷ all Keywords × 100, rounded to a whole number from 0 to 100 (SC2). Every Keyword has the same weight.
- The Verdict is Strong match at 70 or above, and Needs work below 70. It uses the rounded score, so the Verdict always agrees with the number shown.
- Identical CV text and Job ad always give an identical score and identical keyword lists (NFR-6).

**Verify:** Auto.

#### FR-8: Explain the Match score
The Reflection Note shows how the score was reached.
- It shows «X av Y nøkkelord» next to the score, plus a one-line explanation of the formula.
- Every Matched keyword shows its Evidence (SC1).
- Every Missing keyword is listed with a one-line explanation written by code from a template, such as «Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.» The line in the Job ad where the Keyword appears is quoted below it (SC1; final wording in the UX). Once S4 exists, each one links to its Gap.
- A short note says the Match score estimates keyword coverage and is neither the result of a real ATS nor a prediction of interview chances. `[ASSUMPTION: final wording in UX]`
- The score and the keyword lists appear without waiting for any AI output (NFR-4; changes under the FR-5 fallback).

**Verify:** Auto + Manual.

### 6.3 Letter (brief S3)

**Description:** One AI request writes a draft Letter in bokmål. It uses the CV text, the Job ad, the job title, the employer and the chosen Tone. The Letter is shown on screen, where the Student can copy it or download it to edit in their own tools. There is no editor in the app (UX decision). Realises UJ-1.

#### FR-9: Generate a Letter
- The Letter is in bokmål and addressed to the employer for the named job. It is about one page (250–400 words) `[ASSUMPTION]`. It is built on 2–3 concrete examples from the CV text, chosen to show the Student's skills and strengths that best match the ad, rather than repeating the CV or copying the ad.
- It uses only qualifications that can be traced to the CV text (SC5). The prompt asks the AI not to mention qualifications the Student lacks. FR-11 flags breaches, and §9.2 checks the result.
- It is labelled «Utkast skrevet med KI – les gjennom og tilpass før du sender.» `[ASSUMPTION: wording]`
- The sign-off uses the name in the Profile. Without a Profile, it uses a visible placeholder.

**Verify:** Manual (checklist §9.2) + Auto (in Test mode: structure and label).

#### FR-10: Choose a Tone
- Before generating, the Student picks one of three Tones. The default is «Formell».
  - «Formell»: polite and factual, with complete sentences and no personal anecdotes.
  - «Personlig»: warmer; shows motivation and a little personality, but stays professional.
  - «Direkte»: short and concrete; opens with the strongest match and uses few courtesy phrases.

**Verify:** Manual.

#### FR-11: Flag Unsupported claims and Upgrade words in the Letter (Integrity guard)
- When both AI requests have finished, the Keyword engine scans the Letter. The job title and the employer name are skipped.
- A Missing keyword in the Letter is let through if Gap analysis made it a Rewordable gap whose Evidence citation passed FR-15. Every other Missing keyword in the Letter is an Unsupported claim. If Gap analysis fails, or S4 is cut, every Missing keyword in the Letter is an Unsupported claim.
- The Letter is also scanned for Upgrade words. An Upgrade word that appears in the Letter but nowhere in the CV text is flagged in the same way. Other forms of the word count as the same word.
- Each flagged word is highlighted, with a warning that asks the Student to check the sentence rather than telling them to delete it, for example «Brevet nevner «X», men CV-en din viser det ikke. Sjekk at brevet ikke påstår noe CV-en din ikke støtter.» `[ASSUMPTION: wording]` The Student decides what to change (P3).

**Verify:** Auto (planted Cached responses that contain a Real-gap Keyword, a Rewordable-gap Keyword, the job title and an Upgrade word).

#### FR-12: View, copy, download and regenerate the Letter
- The Letter is shown read-only, with the buttons «Kopier» and «Last ned (.docx)».
- The downloaded file name follows the UX pattern and uses ASCII only, for example `violet-hansen-soknadsbrev-nordic-digital-2026.docx`.
- «Lag nytt utkast» generates a new Letter, which replaces the previous one in the Application (FR-21). Each new Letter counts toward the Daily cap.

**Verify:** Auto + Manual.

### 6.4 Gap analysis (brief S4)

**Description:** One AI request, shared with S5, receives the CV text, the Job ad and the Missing keywords. For each Missing keyword it returns a Gap: a classification, an explanation and, for a Rewordable gap, an Evidence citation. Code checks the answer before it is shown (FR-15). Realises UJ-1.

#### FR-13: Classify each Missing keyword
- Each Missing keyword becomes a Gap. A Gap that a CV entry supports is a Rewordable gap and carries an Evidence citation of that entry; otherwise it is a Real gap.
- A formal requirement (degree, certification, licence, language level, work permit) can be a Rewordable gap only if the CV text states it explicitly.
- A Real gap is stated plainly. The Student is invited to think about experience the CV doesn't mention yet, but is never given text to insert (UX «Kubernetes» example).

**Verify:** Auto (structure, against Fixtures) + Manual.

#### FR-14: Explain why each Gap matters
- Each Gap has a one- or two-sentence explanation in plain language that refers to the Job ad.
- It follows the UX order: what is missing, why it matters, and, for a Rewordable gap, the CV entry that covers it.
- Rewordable gaps use hedged language («dekker trolig dette – vurder å ta det med»).
- It never claims that an ATS will reject or rank the CV (P4).
- Gap explanations and Rewording suggestions are marked as written by AI (wording in the UX).

**Verify:** Manual (checklist G5).

#### FR-15: Check Evidence citations (Integrity guard)
- If a Rewordable gap's Evidence citation can't be found word for word in the CV text (ignoring case and whitespace), the Gap is shown as a Real gap instead. Its AI-written explanation and suggestion are dropped and replaced by a fixed Real-gap template, and the downgrade is logged without any content.
- Each Answer key lists Missing keywords that must never become Rewordable gaps (negative cases, as the lecturer's feedback asked). None may become one in the live Fixture runs (SC3, SC4; checklist G2).

**Verify:** Auto (the downgrade, with planted Cached responses) + Manual (live runs, checklist G2).

### 6.5 Rewording suggestions (brief S5)

**Description:** For every Rewordable gap, the Student gets a concrete way to say the same thing in the employer's words. This comes from the same AI request as Gap analysis. Realises UJ-1.

#### FR-16: Suggest a concrete rewording
- For each Rewordable gap, the Reflection Note shows the cited CV entry and one suggested new phrasing. The phrasing expresses the Keyword using only facts already in that entry (SC6).
- A suggestion may put what the Student learned or did into the employer's words, but it may never upgrade the kind of work or the Student's role. An exam paper is not research, and taking part is not leading. For example, the CV entry «Skrev eksamensoppgave om diabetiske fotsår vs trykksår (likheter og forskjeller)» supports «Kompetanse i sårvurdering», but not «Forsket på sårvurdering».
- Each suggestion has a «Kopier» button. There is no one-click "add to CV".

**Verify:** Manual + Auto (structure).

#### FR-17: Check Rewording suggestions (Integrity guard)
- A Rewording suggestion that contains an Unsupported claim is discarded.
- A Rewording suggestion that contains an Upgrade word is discarded if the cited CV entry doesn't contain that word. Other forms of the word («forsket», «forsker», «forskning») count as the same word.
- When a suggestion is discarded, its Gap is shown with the Evidence citation but without a suggestion. The discard is logged without any content.

**Verify:** Auto (planted Cached responses, including «Forsket på sårvurdering» from the FR-16 example).

### 6.6 Accounts, Profile and History (brief S6)

**Description:** Accounts let the Student upload the CV once and come back to earlier Applications. There is one role, and each Student sees only their own data. This section also covers Konto, the account page (FR-21). Realises UJ-1, UJ-2 and UJ-3.

#### FR-18: Register, log in and log out
- The Student registers with name, email and password; the password must be at least 8 characters `[ASSUMPTION]`. Each email can be registered only once. The name replaces the UX username field (D14).
- The Student logs in with email and password, and logs out with one click (UX).
- A session ends after 1 hour without activity `[ASSUMPTION]`. The Student is then sent to «Logg inn» with the UX message «Økten din er avsluttet. Logg inn igjen for å fortsette.». A Job ad pasted on Søknad is kept and offered again after login.
- Once S6 exists, Søknad and the other Student pages require login. On the Hosted version, registration also requires the Access code (FR-31).

**Verify:** Auto.

#### FR-19: Keep each Student's data private
- Every stored record belongs to one Student.
- A Student can never read or list another Student's Profile or Applications, including by guessing URLs or IDs. Such requests get "not found".

**Verify:** Auto.

#### FR-20: Store a Profile and reuse the CV text
- The Profile holds the Student's name and the current CV text. A new upload or paste replaces the old CV text.
- A new Application uses the Profile's CV text by default. If there is none, Søknad asks for it first.

**Verify:** Auto.

#### FR-21: Save and reopen Applications in History
- An Application is saved automatically as soon as its Match score exists, and the AI sections are added when they arrive. It holds:
  - the job title, employer and date
  - the Job ad text
  - the Match score and the keyword lists
  - the Gaps and Rewording suggestions
  - the latest Letter (FR-12)
- Historikk lists Applications newest first, 20 per page. Each row shows "job title – employer", the date and the score badge with its Verdict text, so the two Verdicts never differ by colour alone. Hjem shows the 3 most recent. `[ASSUMPTION: page size and count]`
- Reopening an Application shows its Reflection Note and Letter read-only, with the copy buttons and the Letter download (FR-12, FR-16). History has no search, delete or rename.
- The empty state uses the UX copy «Ingen søknader ennå. Start med din første stillingsannonse.».
- Konto shows the Student's email, the logout button and a short note on how data is stored and when it is deleted (FR-23). It has no password change and no self-service deletion (D14).

**Verify:** Auto + Manual.

### 6.7 Encrypted storage (brief S7)

**Description:** Everything personal that JobAssistant stores is encrypted, apart from the few fields FR-22 names, and it stores as little as it can.

#### FR-22: Encrypt personal content at rest
- These fields are encrypted in the database: name, CV text, Job ad text, job title, employer, keyword lists, Evidence, Gaps, Rewording suggestions and Letter.
- Only these stay in plain text: the email address, which is needed to look up the account at login, and the dates and Match scores that sort and label History.
- The key is a secret, stored as NFR-7 requires.
- Opening the database directly shows none of the encrypted fields in plain text.
- Passwords are stored only as salted, deliberately slow hashes. They are never encrypted or stored in plain text.
- The UX trust line «CV-en din og dokumentene som lages, lagres kryptert.» is shown only once this FR is implemented.

**Verify:** Auto.

#### FR-23: Store as little as possible
- Uploaded files are discarded after text extraction. Only the confirmed CV text is stored. `[ASSUMPTION: deviation D12]`
- AI prompts and responses are never written to logs. Logs hold only metadata: time, token counts and errors.
- All stored Student data is deleted when the course ends. This is a developer task, documented in the README. When grading is finished, the Hosted version is taken down and its database deleted. `[ASSUMPTION]`

**Verify:** Auto (logs) + Manual.

### 6.8 AI safeguards (cross-cutting, built with S3)

**Description:** Rules for every AI request: tell the Student first, cap the cost, and send no more personal data than needed.

#### FR-24: Tell the Student before text leaves the app
- Before a Student's first AI request, a notice in plain Norwegian says:
  - that the CV text and the Job ad are sent to the named AI provider to write the Letter, the Gaps and the suggestions;
  - that the Match score is calculated locally;
  - that the provider does not train on the text, and how long the provider keeps it (from the provider's terms);
  - that the Student should leave out sensitive information such as health details or *fødselsnummer*.
- The Student must accept the notice to continue. It is shown once per account, or once per browser session before S6. It is not shown in Test mode, where no text leaves the app.
- The notice changes under the FR-5 fallback.

**Verify:** Manual.

#### FR-25: Limit AI use per Student (Daily cap)
- A Student can make at most 30 AI requests per day. Before accounts exist, and after the first cut, the cap counts for the whole installation. It resets at local midnight.
- When the cap is reached, the Match score still works (under the FR-5 fallback, with code-only Keywords for new Job ads). The AI sections say that the daily limit is reached and when it resets.
- A monthly spending limit set with the AI provider backs up the cap (NFR-8).

**Verify:** Auto.

#### FR-26: Remove contact details before AI requests
- Email addresses and phone numbers are removed from the CV text before it is sent to the AI provider.

**Verify:** Auto.

### 6.9 Test mode and Fixtures (cross-cutting)

**Description:** Test mode lets the Examiner, and the automated tests, run the whole core flow with no AI key and no cost. The Fixtures make the Keyword engine and the Integrity guards testable. Realises UJ-3.

#### FR-27: Run in Test mode without an API key
- If no AI key is configured, or Test mode is switched on in configuration, the app runs in Test mode. A visible banner says «Testmodus – KI-svarene er forhåndslagret».
- The Example pair runs the full core flow using Cached responses (SC8). A «Bruk eksempelet» control on Søknad fills in both texts, with or without login. The Example pair is also in the repository as files (the CV as PDF and TXT, the ad as text). Uploading or pasting them reaches the same Cached responses.
- The Cached responses include one Letter per Tone. In Test mode, «Lag nytt utkast» shows the cached Letter for the chosen Tone again.
- The Example pair's Cached responses are recorded from a live run of the final prompts, and labelled with the provider, the model, the prompt version and the date.
- The Match score works for any input (under the FR-5 fallback, with code-only Keywords marked as less precise). For inputs other than the Example pair and the Fixtures, the AI sections say they are not available in Test mode.
- Automated tests always use Test mode or a mock and never make paid AI requests.

**Verify:** Auto.

#### FR-28: Provide Fixtures with Answer keys
- There are at least 3 fictional Norwegian Fixtures. Each Answer key gives:
  - the expected Keywords, Matched and Missing
  - the expected score, with a tolerance of ±5 points
  - terms that must not match
  - the expected Rewordable and Real gaps
  - items that must never be suggested (SC4)
- At least one Fixture has a two-column PDF CV. At least one uses English technical terms. At least one has inflection and split-compound cases. At least one is from outside IT, for example a nursing job built around the FR-16 example.
- One Fixture tests the brief's own example: «prosjektledelse» against a semester-long group project. It is a Rewordable gap only if the project entry shows planning or coordination; otherwise it is a Real gap.
- The Example pair is one of the Fixtures.
- The repository contains only fictional CVs (brief).

**Verify:** Auto (Keywords and score) + Manual (the Gap part, on live runs; checklist G2 and G4).

#### FR-29: Provide a seeded test user
- Once S6 exists, the README names a local test user (email and password) that exists after setup. Its Profile holds the Example pair's CV. The credentials are fictional and work only in the local run.
- Login details for the Hosted version are handled by FR-31.

**Verify:** Manual (clean-machine dry run).

### 6.10 Hosted version (cross-cutting, set up in step 1)

**Description:** v1 is also deployed to a host, so the Examiner can try it with live AI without a key of their own. The README run (NFR-9) remains what the examiner guide grades for runnability. Realises UJ-3.

#### FR-30: Deploy a Hosted version
- The app is deployed to Vercel (product owner, 2026-10-31) and served over HTTPS only, at a stable URL named in the README and the submission.
- The Hosted version uses the live AI, with the Daily cap (FR-25) and the provider's monthly spending limit (NFR-8).
- The Hosted version meets the same data rules as the AI provider (§8.1): its functions and its database run in an EU region, and Vercel's data processing agreement and transfer basis cover the data. It fits Vercel's free Hobby plan and a free database tier. `[ASSUMPTION]`
- Its secrets are stored as NFR-7 requires.
- It is first deployed in week 45 and redeployed as stories are merged.

**Verify:** Manual (UJ-1 on the Hosted version, on a laptop and on a phone).

#### FR-31: Keep the Hosted version closed to outsiders
- Only people with the Access code can use the Hosted version. Before S6, the code is requested once per browser session; after S6, registration requires it.
- The Access code is long and random, at least 16 characters.
- The Access code and any login details for the Hosted version are handed to the Examiner with the submission, never committed.

**Verify:** Auto (no access without the code) + Manual.

## 7. Cross-cutting non-functional requirements

### NFR-1: Language
- All interface text and all generated content are in bokmål, including when the Job ad contains English terms (SC9).
- Every page has `lang="nb"`.
- Numbers, dates and quotes follow Norwegian conventions: «71 %», «8. sep. 2026», «sjevroner».
- Interface text, Gap explanations and Rewording suggestions follow the UX voice: «du»; the fact first and then the reason; no cheerleading, exclamation marks or emoji; and no English loanwords or literal translations where a common Norwegian word exists. The Letter follows the same rules, except that it addresses the employer.

**Verify:** Manual (§9.2 items G5 and L8; the language check in §9.3).

### NFR-2: Accessibility
- Every screen (Hjem, «Registrer deg», «Logg inn», Profil, Søknad with results, Historikk, Konto and the Access-code screen) meets these WCAG 2.2 AA criteria:
  - keyboard operation
  - labelled fields
  - errors tied to their field
  - progress announced with `aria-live`, once for the score and once for the AI sections
  - meaning never shown by colour alone
  - text alternatives for icons, images and the score badge
  - text contrast of at least 4.5:1, and at least 3:1 for field outlines and other boundaries that identify a control
- Touch targets are at least 44 px (UX).
- Colour pairs in DESIGN.md that fail these ratios are adjusted (D16; the list is in addendum §4).

**Verify:** Auto (axe scan: 0 serious or critical findings) + Manual (UJ-1 walked through using only the keyboard; contrast checked with a tool, including non-text contrast).

### NFR-3: Responsive layout
- Every core flow is fully usable in a phone browser from 360 px wide.
- Content is a single column. Navigation collapses at 640 px and below (UX).

**Verify:** Manual.

### NFR-4: Performance
- For Fixture inputs:
  - the Match score and keyword lists appear within 2 seconds of submitting (changes under the FR-5 fallback);
  - the AI sections appear within 60 seconds in at least 4 of 5 timed runs per Fixture.
- Results arrive in two phases: the score first, then the AI sections (D19). While the AI sections are being written, a descriptive progress line is shown.
- AI requests time out after 90 seconds, and the Student can retry.

**Verify:** Manual (timed Fixture runs, recorded in `docs/qa/`).

### NFR-5: Stability and error handling
- Wrong input, repeated actions, refreshing the page or submitting twice never crash the app.
- After any error, the input is kept.
- Errors are shown inline, in Norwegian, at field level for forms.
- A network or AI-provider failure shows the UX error banner or inline error.
- If the AI part fails, times out, hits the Daily cap or isn't available, the Match score stays on screen, and only the AI sections can be retried.
- Every state in EXPERIENCE.md, as updated through addendum §4, is built and walked through, including the loading, empty, error and partial-result states.

**Verify:** Auto + Manual.

### NFR-6: Determinism
- Identical inputs give identical Keyword lists, matches and scores, across runs and across machines (changes under the FR-5 fallback).
- Dependency versions are pinned.

**Verify:** Auto (Fixtures run twice).

### NFR-7: Security
- Secrets (the AI key, the encryption key and the Access code) live only in environment variables: locally in `.env`, which setup creates (NFR-9), and on the Hosted version in Vercel's environment variables. `.env.example` documents each one without a real value.
- The Hosted version is served over HTTPS only (FR-30).
- The repository and its history contain no secrets; this is checked before delivery.
- Every data access is authorised on the server (FR-19), and all input is validated on the server.
- Uploaded files are never executed or served back.

**Verify:** Auto + Manual.

### NFR-8: Cost
- Total AI spend stays at or below 200 NOK per month.
- Each Application uses at most 2 AI requests (one for the Letter; one for Gap analysis and Rewording suggestions), plus any new Letters the Student asks for (changes under the FR-5 fallback).
- The Daily cap applies (FR-25), a monthly spending limit is set with the AI provider, and token counts are logged for each AI request.
- Hosting adds no cost: Vercel's free Hobby plan and a free database tier (FR-30).
- Tests and Test mode make no paid AI requests.

**Verify:** Manual (monthly check of the provider's usage page).

### NFR-9: Runnability
- On a clean machine, someone following only the README gets the app running locally in Test mode within 15 minutes, prerequisites included.
- Prerequisites are limited to one language runtime and its package manager, in versions the README names. No Docker, no database server and no large model download.
- Setup creates the local secrets itself, or with one documented command.
- The commands work on Windows, macOS and Linux, and can be copied straight from the README. The dry run checks Windows and one of the other two.
- One command runs all automated tests, and they all pass on the delivery commit.
- The local run needs no paid account, cloud service or API key.
- The README also contains:
  - what the app does and who it is for, with a screenshot;
  - the environment variables, and how to run with a live AI key;
  - the core flows, named as in UJ-1 and UJ-3, and the local test user;
  - the URL of the Hosted version (the Access code comes with the submission);
  - an overview of the folders;
  - links to the brief (marked as the approved proposal), this PRD and its §11, the UX documents, the architecture, the epics, `docs/qa/`, and the session and decision logs.

**Verify:** Manual (dry run before delivery, on a fresh virtual machine, in a sandbox or on someone else's machine).

### NFR-10: Traceability and process evidence
- Stories cite FR and NFR IDs.
- Each story is built on its own branch and merged through a pull request that names its IDs and keeps the review notes. Defects found later become issues.
- Commits, pull requests and session logs cite story or FR IDs.
- Tests are named after, or tagged with, the FR they verify.
- Each session log records the task or prompt, what the AI proposed, what was clarified, rejected or corrected and why, and the resulting commits. An index in `docs/qa/` lists these examples of steering the AI, together with the bugs from §9.4.
- The PRD, and the UX, architecture and epics documents, are updated whenever a requirement, assumption or decision changes, with an entry in the memory log. Each update is committed with a message that names the IDs it changes.

**Verify:** Manual.

### NFR-11: Maintainability
- A linter and a formatter run on the code, and both pass on the delivery commit.
- The folder and module structure matches the architecture document.
- No dead code, duplicated files or commented-out remains of earlier AI attempts are delivered.

**Verify:** Auto (the linter runs with the tests) + Manual (week-50 check).

## 8. Constraints and guardrails

### 8.1 Privacy and personal data
- CVs are personal data. Who may use v1 is set in §2.2 and FR-31, and the repository contains only fictional CVs (FR-28).
- Whether real CVs may be used in testing depends on the institution's rules for personal data in student projects (Open question 4). Until that is answered, testing uses fictional CVs only. `[ASSUMPTION]`
- **Requirements for the AI provider**, for the architecture to apply when choosing one:
  - Use a paid or commercial API tier only.
  - The provider's terms must state that inputs are not used for training.
  - Its retention period must be documented, and named in the FR-24 notice.
  - A data processing agreement must be available.
  - Processing inside the EEA is preferred. Otherwise, use a US provider listed under the EU–US Data Privacy Framework.
  - Free tiers that train on input or forbid personal data are excluded. Google Gemini's unpaid tier, for example, forbids personal data. Details are in the addendum.
- **Requirements for the host:** the host is Vercel. Its functions and the database run in an EU region, and Vercel's data processing agreement and transfer basis must cover the data. The architecture checks this (FR-30).

### 8.2 Cost
- The AI budget is about 200 NOK per month (NFR-8). The architecture chooses the provider and model, with a cost estimate per Application based on prices at that time.
- Hosting uses Vercel's free Hobby plan, which is meant for non-commercial projects, and the hosted database must fit a free tier too (FR-30).

### 8.3 Team and timeline
- One developer, with no other course deadlines in November and December.
- The developer's available time varies from week to week, so work is split into small pieces that can be finished in short sessions.
- Deadline, milestones and decision points: §5.2. The exact deadline is Open question 1.

### 8.4 Course requirements
- Part 1 of the examiner guide grades the app, the repository and its history together, and makes up 70 % of the grade:

  | Criterion | Weight |
  |---|---|
  | Process and AI steering | 30 % |
  | Functionality and scope | 20 % |
  | Quality assurance and testing | 15 % |
  | Design and user experience | 10 % |
  | Code quality and architecture | 10 % |
  | README and runnability | 10 % |
  | Repository tidiness | 5 % |

- Process and AI steering, README and runnability, and repository tidiness (45 % together) concern process and verifiability, so the traces of the work count as much as the product.
- This PRD supports the criteria with stable IDs and process evidence (NFR-10), a deviation log (§11), a verification plan (§9), runnability requirements (NFR-9) and maintainability requirements (NFR-11).

## 9. Quality assurance and verification

The Verify line on each FR and NFR is authoritative. This section lists the main automated test areas (§9.1), describes the manual checks (§9.2, §9.3) and says where the results are kept (§9.4).

### 9.1 Automated tests (run with one command; NFR-9)
- Keyword engine: normalisation, inflection, split compounds, aliases and negative cases (FR-5 to FR-7).
- Fixture Answer keys (FR-28, SC4).
- Determinism (NFR-6).
- Integrity guards, tested with planted bad Cached responses, including Upgrade words (FR-11, FR-15, FR-17).
- Input validation (FR-1, FR-2, FR-4).
- Data isolation between Students (FR-19).
- Encryption at rest (FR-22).
- No prompt content in logs (FR-23).
- Daily cap (FR-25).
- Removal of contact details (FR-26).
- The Letter's label and structure in Test mode (FR-9), and the structure of Gaps and suggestions (FR-13, FR-16).
- Registration, login, Profile and History (FR-18, FR-20, FR-21), and the Access code (FR-31).
- Partial results: the score stays when the AI part fails (NFR-5).
- One end-to-end run of UJ-1 in Test mode, starting from «Bruk eksempelet» (FR-27).
- The linter (NFR-11).

### 9.2 Manual checklist for AI-written text
The lecturer's feedback asks the PRD to describe this checklist.
- **When:** run it on every Fixture with the live AI before delivery, and again after any prompt change. The first run happens as soon as S5 works, so there is time to fix the prompts.
- **Where:** record pass or fail per item, with the date, in `docs/qa/`, and commit the live outputs next to the results. `[ASSUMPTION: location]`
- **Helper:** a small script compares the live outputs with the Answer keys for G2 and G4.

**Letter**
- L1. Bokmål throughout; no English sentences.
- L2. Every qualification, tool, employer, date and number in the Letter exists in the CV text.
- L3. No sentence copies the Job ad: no run of 8 or more words in a row from the ad. `[ASSUMPTION: threshold]`
- L4. The job title and the employer are correct.
- L5. 250–400 words (FR-9), with 2–3 concrete examples from the CV that show the skills and strengths best matching the ad.
- L6. The tone matches the chosen Tone.
- L7. Every Unsupported claim and Upgrade word flagged by FR-11 is a real problem, and none were missed (compare with L2).
- L8. No emoji or exclamation marks, and no English loanwords or literal translations where a common Norwegian word exists (NFR-1).

**Gaps**
- G1. Each Rewordable gap's cited CV entry really shows the Keyword; a reasonable recruiter would agree.
- G2. Every must-never-suggest item in the Answer key is a Real gap.
- G3. Real gaps are worded honestly and don't push the Student to add the Keyword.
- G4. Count how many of the Answer key's expected Rewordable gaps the app found and showed with a suggestion (SM-5).
- G5. Each Gap explanation is in plain bokmål, refers to the ad, follows FR-14's order and hedging, and follows the UX voice (NFR-1).

**Rewording suggestions**
- R1. The suggestion adds no fact that is missing from the cited CV entry, and doesn't upgrade the kind of work or the Student's role (FR-16).
- R2. The Student could defend the reworded line in an interview.
- R3. Natural bokmål, not stuffed with keywords.

### 9.3 Manual UX checks
- UJ-1 walked through using only the keyboard.
- UJ-1 on a real phone at least once, including upload, «Kopier» and the .docx download; other phone-width checks at 360 px.
- An axe scan of every screen, and a contrast check with a tool, including non-text contrast (NFR-2).
- A wrong-input tour: empty fields, wrong file type, very long text, double-clicking submit.
- A language check of all interface text, run with the Fixture that uses English terms (NFR-1).
- UJ-1 on the Hosted version (FR-30).

### 9.4 Evidence for the Examiner
- Bugs found in AI-generated code, and how each was fixed, are recorded in the session logs or in `docs/qa/` (examiner guide, criterion 3).
- The index of AI-steering examples (NFR-10) links each example to its session log and commits.
- The live Fixture outputs from §9.2 are committed to `docs/qa/`, with screenshots or a short recording of one live run.
- Every FR or NFR with a Manual Verify line gets a row in `docs/qa/` with the procedure, when it runs, and a dated pass or fail. The row is written with the story that implements the requirement.

## 10. Non-goals

- **Not a real ATS or an ATS simulator.** JobAssistant does not predict interview chances, or whether a particular employer's system will reject a CV.
- **Not a CV writer.** It produces no generated or rewritten CV file (decision A1a).
- **Not a ghostwriter.** It never adds experience the Student lacks, and it has no one-click keyword insertion.
- **Not an editor.** The Letter can't be edited in the app, and no CV document is produced or edited. Only the CV text used for analysis can be corrected (FR-3). Students edit their documents in their own tools.
- **Not a job-search platform.** No job boards, LinkedIn import, auto-apply or application tracking.
- **Not a public service.** The Hosted version is closed to everyone except the developer and the Examiner (FR-31).
- **No native mobile app and no dark mode.** The brief and the UX rule out both; the web app works in a phone browser instead.
- **No business model.** It is free: a course project.

## 11. Changes from the brief and the UX specification

The Examiner judges scope against the approved proposal (the brief), and changed or dropped items must be described and justified. By source: the brief, D6–D9, D12, D17, D18, D21 and D22; the UX only, D1–D5, D10, D11, D14–D16, D19 and D20; new, D13 and D23.

| ID | Change | Changes what | Reason |
|---|---|---|---|
| D1 | No generated tailored CV file; help with the CV comes as Rewording suggestions | UX Flow 1 and result mockup | Decision A1a: one fewer AI generation (cost), and a rewritten CV is where invented skills slip in most easily |
| D2 | «Vurder CV» and «Vurder søknad» deferred | UX Flow 2 and the Hjem cards | Decision A2a: two extra AI features; one developer; deadline |
| D3 | The Letter is shown on screen, with copy and a .docx download | UX: PDF download only, never shown | Decision A4a: the Student must be able to check the Letter for invented claims, and a PDF is hard to edit |
| D4 | Reflection Note on screen only; no download | UX result mockup (third file) | Its content is already on screen, so no document generator is needed `[ASSUMPTION]` |
| D5 | Minimal History: newest first, reopen only; no search or delete | UX History | Decision A3a |
| D6 | History added | Brief (not mentioned) | Implied by "upload a CV once" and per-Student storage; the lecturer's feedback expects history per ad |
| D7 | Keyword explanations are written by code templates, not by AI | Brief ("the language model is used only for the explanatory text and the letter/gap-analysis content") | The lecturer's item (a) asks for a «match-score med nøkkelordforklaring beregnet i kode». This keeps S2 free, deterministic, testable and usable before any AI work. AI-written reasoning moves to Gap analysis (S4) |
| D8 | The Match score uses the CV text only, not the Letter | Brief Solution text ("CV and letter") and lecturer feedback, change 2 («CV og brev») | Helene's definition of done ("ATS score on the CV"); SC2 already says CV text |
| D9 | S5 defined as Rewording suggestions for Rewordable gaps | Brief S5 (not defined) | Makes S5 testable (SC6) and distinct from S4 |
| D10 | The Student types the job title and the employer | New input; the UX derived them without saying how | Correct names in the Letter, History and file names, with no AI guessing |
| D11 | The extracted CV text is shown for correction, and the CV can also be pasted | UX Profil and dropzone (file upload only) | PDF extraction is unreliable for CVs with columns and tables (lecturer feedback) |
| D12 | Only the CV text is stored; the uploaded file is discarded | Brief S7 ("uploaded and generated content") | Data minimisation `[ASSUMPTION]` |
| D13 | Integrity guards, Daily cap and removal of contact details added | New | Make SC3, SC5 and SC6 enforceable; stay within 200 NOK per month; privacy |
| D14 | Registration asks for name instead of username; no password change | UX «Registrer deg» and Konto | The username was never used (login is by email), the Letter needs the name, and only the developer and the Examiner use v1 |
| D15 | The score explanation shows «X av Y nøkkelord» and an estimate disclaimer | UX (no copy about the formula) | Principle P2; research found that no official ATS score exists |
| D16 | Colour pairs below WCAG AA contrast must be adjusted | UX DESIGN.md | The UX promises WCAG 2.2 AA, but calculated contrast ratios fail for several text pairs and for the field outlines (NFR-2) |
| D17 | Three Tone presets | Brief S3 ("preferred tone/style", not defined) | Voice-learning is out of v1; presets are the simplest testable form |
| D18 | The Match score is framed as keyword coverage for recruiters who search and skim CVs, not as a way past automatic ATS filters. "Clear the filter more often" is not a v1 claim | Brief Executive summary and Solution | Research found no evidence of automatic keyword filtering in Norway and no official ATS score (addendum §1.2); principle P4 |
| D19 | Results arrive in two phases: the score first, the AI sections later. A partial result keeps the score | UX: one Generating state and one Result state | The score comes instantly from code (FR-8, NFR-4); the Student shouldn't wait for it, or lose it when the AI fails (NFR-5) |
| D20 | A version without accounts comes first, and stays if S6 + S7 are cut | UX: the main button routes to signup; no use without an account | The build order puts accounts last, and the core flow must work first (brief, lecturer; §5.1) |
| D21 | How SC4, SC5 and SC7 are judged: SC4 by SM-2, G2 and SM-5; SC5 by zero L2 failures on live Fixture runs, with FR-11 as the safety net; SC7's "without manual intervention" as no action outside the app's interface | Brief SC4 ("match the expected keywords and suggestions"), SC5 and SC7 | AI output varies between runs, so "match" needs a measurable reading (§12) |
| D22 | S6 and S7 are cut together, not S7 first | Brief cut line (cut from the bottom) | Nothing about a Student is stored before encryption exists (§5.1) |
| D23 | v1 is also deployed on Vercel as a Hosted version, closed with an Access code | New; the brief doesn't mention hosting | The product owner's decision: the Examiner can try the live AI without a key, and the README run stays (FR-30, FR-31) |

The UX documents are updated to match these changes in week 45 (addendum §4, Open question 7).

## 12. Success metrics

The brief's success criteria SC1–SC9 remain the acceptance criteria. They map to requirements as follows:

| Brief criterion | Requirements |
|---|---|
| SC1 | FR-8 |
| SC2 | FR-5 to FR-7 |
| SC3 | FR-13, FR-15 |
| SC4 | FR-28, FR-15, SM-2, SM-5 |
| SC5 | FR-9, FR-11, SM-3 |
| SC6 | FR-16, FR-17 |
| SC7 | UJ-1 (FR-1 to FR-12, FR-24) |
| SC8 | FR-27 |
| SC9 | NFR-1 |

**How three of the criteria are judged** (D21)
- **SC4** passes when SM-2 passes, G2 has no failures, and SM-5 meets its target.
- **SC5** passes with zero L2 failures on the live Fixture runs. In real use, FR-11 flags any slip.
- **SC7**'s "without manual intervention" means no action outside the app's interface. Confirming the extracted CV text is a normal step. The single-column PDF and TXT Fixtures need no edits; the two-column Fixture is the FR-3 correction case.

**Primary**
- **SM-1. The core flow works.**
  - Target: 100 %.
  - Definition: UJ-1 completes end to end without manual intervention (as defined for SC7 above), both for every Fixture with the live AI and for the Example pair in Test mode.
  - Validates FR-1 to FR-12 and FR-27.
- **SM-2. The score is correct.**
  - Definition and target: on every Fixture,
    - the score is within ±5 points of the Answer key;
    - every must-match Keyword is found;
    - no must-not-match term is matched.
  - Validates FR-5 to FR-7.
- **SM-3. No invented qualifications.**
  - Definition: failures on checklist items L2, G1, G2 and R1 across all Fixture runs, and the Integrity guard tests.
  - Target: 0 failures, and every Integrity guard test passes, including the planted Upgrade-word cases (FR-11, FR-17).
  - Validates FR-9, FR-11 and FR-13 to FR-17.
- **SM-4. The Examiner can run it.**
  - Definition: someone who doesn't know the project, such as a classmate, gets the app running in Test mode in a clean environment using only the README. If no such person is available, Helene does the run on a fresh virtual machine, following only the README, and notes that limitation. The Hosted version answers at its URL throughout the grading period.
  - Target: within 15 minutes.
  - Validates FR-27, FR-29, FR-30 and NFR-9.
- **SM-5. The suggestions are useful.**
  - Definition: in the live Fixture runs (§9.2), the share of the Answer keys' expected Rewordable gaps that the app finds and shows with a Rewording suggestion that passed FR-17. Counted across all Fixtures together.
  - Target: at least 70 %. `[ASSUMPTION: starting threshold]`
  - Why: an app that never suggests anything would pass SM-3. This sets a minimum, so the app can't be honest simply by saying nothing.
  - Validates FR-13, FR-16 and FR-17.

**Secondary**
- **SM-6. AI spend.** At or below 200 NOK in every month of development and demonstration. Validates NFR-8.
- **SM-7. Response times.** On Fixtures: the score within 2 seconds, and the full result within 60 seconds in at least 4 of 5 timed runs. Validates NFR-4.
- **SM-8. Accessibility.** The axe scan of every screen finds 0 serious or critical issues, the contrast check passes, and UJ-1 can be completed using only the keyboard. Validates NFR-2.

**Counter-metrics (do not optimise)**
- **SM-C1. Average Match score.**
  - Looser matching rules that raise scores make the product less honest. Only the Answer keys may justify a matching change, never "higher scores".
  - Counterbalances SM-2.
- **SM-C2. Rewordable gaps and Rewording suggestions per Application.**
  - More is not better: a Gap wrongly called Rewordable is the worst failure the product can make. Usefulness is measured only against the Answer keys (SM-5), never by raw counts.
  - Counterbalances SM-5.
- **SM-C3. Keyword density in the Letter.**
  - A Letter stuffed with the ad's keywords reads as generic and machine-written.
  - Counterbalances SM-1; checklist items L3 and L5 guard against it.

User success remains directional and is not measured during the course (brief). Over time, students should find the suggestions honest and useful, understand why each change was suggested, and be able to defend it in an interview.

## 13. Open questions

1. **Deadline.** What is the exact submission deadline, and how is the cut-off commit determined? The answer affects the cut line. *Owner:* Helene, to ask the lecturer.
2. **Keyword extraction.** Does code-only extraction pass the test in FR-5? This is decided at the end of week 46; if it doesn't, the approved fallback is used. *Owner:* architecture, with Helene.
3. **AI provider, model and hosted database.** Which AI provider meets §8.1, fits 200 NOK per month and writes good bokmål? Which database works on Vercel in an EU region, on a free tier, while the local run stays free of a database server (NFR-9)? *Owner:* architecture.
4. **Real CVs in testing.** May real CVs, such as the developer's own, be used in testing under the institution's rules for personal data in student projects? *Owner:* Helene, to ask the lecturer. Until then, fictional CVs only.
5. **AI access for the Examiner.** The plan is Test mode for the README run and live AI on the Hosted version, with the README also describing how to run with a key of one's own. Is that acceptable? *Owner:* Helene, to ask the lecturer.
6. **Keyword vocabulary.** Where do the Keywords and aliases come from: for example, the Norwegian skill labels in ESCO (the EU's classification of skills and occupations), a custom list, or both? The vocabulary must cover job ads from any field, not only technology (FR-5). *Owner:* architecture.
7. **UX updates.** EXPERIENCE.md, DESIGN.md and the mockups must be updated to match §11, because the lecturer asked that the UX and the PRD point to the same v1 items. *Owner:* Helene, in week 45, before the epics are written.
8. **Mocked AI in tests.** Is mocking the AI in automated tests acceptable, with the manual checklist (§9.2) covering the quality of AI-written text? *Owner:* Helene, to ask the lecturer.

## 14. Assumptions index

These assumptions are still open after the coaching round of 2026-10-31. Design choices that Helene confirmed in that round are no longer tagged.

| # | Assumption | Where |
|---|---|---|
| 1 | Delivery milestones, and a working deadline of about 10 December 2026 | §5.2 |
| 2 | Upload limit of 2 MB | FR-1 |
| 3 | CV text of 200–20,000 characters; Job ad text of 200–15,000 characters; job title and employer up to 200 characters each | FR-2, FR-4 |
| 4 | Wording of the estimate disclaimer | FR-8 |
| 5 | Letter length of 250–400 words, and the AI-draft label wording | FR-9 |
| 6 | Wording of the Letter warning | FR-11 |
| 7 | Minimum password length of 8; 1-hour inactivity timeout | FR-18 |
| 8 | History shows 20 per page; Hjem shows the 3 most recent | FR-21 |
| 9 | The uploaded file is discarded and only the CV text is stored | FR-23, D12 |
| 10 | All stored data is deleted when the course ends, and the Hosted version is taken down after grading | FR-23 |
| 11 | Reflection Note on screen only | D4 |
| 12 | Testing uses fictional CVs only until Open question 4 is answered | §8.1 |
| 13 | QA records kept in `docs/qa/`; copy threshold of 8 words | §9.2 |
| 14 | Usefulness threshold of 70 % | SM-5 |
| 15 | On Vercel, the functions and the database run in an EU region under Vercel's data processing agreement, on the free Hobby plan and a free database tier | FR-30 |
