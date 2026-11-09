---
title: JobAssistant PRD addendum
created: 2026-10-31
updated: 2026-11-08
---

# JobAssistant PRD addendum

This file supports [prd.md](prd.md). It holds detail that matters for later steps but would crowd the PRD:
- [§1 Research digest](#1-research-digest-2026-10-31): the evidence behind several PRD decisions.
- [§2 Notes for the architecture](#2-notes-for-the-architecture): suggestions for the architecture step.
- [§3 Rejected and deferred alternatives](#3-rejected-and-deferred-alternatives): options considered, with a pointer to each decision.
- [§4 UX updates needed to match the PRD](#4-ux-updates-needed-to-match-the-prd): the list for the week-45 UX update.
- [§5 Questions for the lecturer](#5-questions-for-the-lecturer).

The PRD wins over this file on any conflict. Full research with sources is in [research-landscape.md](research-landscape.md). Extracts of the brief, the UX specification and the examiner guide are in [extract-brief.md](extract-brief.md), [extract-ux.md](extract-ux.md) and [extract-sensorveiledning.md](extract-sensorveiledning.md).

## 1. Research digest (2026-10-31)

What each part supports: §1.1 and §1.2 back the honest framing of the Match score (P4, D15, D18), §1.3 backs the matching rules (FR-6), §1.4 backs the privacy requirements (PRD §8.1, FR-24), and §1.5 backs the shape of the Letter (FR-9).

### 1.1 Comparable products
- **Scores without formulas.** Jobscan, Resume Worded and Rezi each publish categories or a priority order for their score, but none publishes weights or a formula.
- **No official ATS score.** Rezi states that "real ATS systems don't give your resume an official score". Enhancv says no tool gives "a true ATS score". Teal reportedly says its "Match Score" is not an ATS score.
- **Honesty is advice, not enforcement.** Jobscan, Rezi, Teal and NTNU Karriere all warn against claiming skills you don't have, yet Rezi's own flow generates a CV line for each missing keyword. None of the tools found enforces "evidence from the CV first".
- **Student offers.** Only Kickresume (6 months of free Premium for verified students) and Careerflow target students. None of the tools found maps courses or projects to the ad's keywords.
- **Norwegian language and market.** Only Enhancv produces Norwegian output, through a generic letter generator with no explained score. No Norwegian-built tool with an explained, per-keyword score was found.

### 1.2 How ATS screening works in Norway
The findings below are why the Match score is presented as an estimate of keyword coverage: a proxy for keyword searches in recruiter tools and for people skimming a CV, not for automatic rejection (P4, FR-8).
- No independent Norwegian data shows automatic keyword filtering.
- The only documented automatic gate is Webcruiter's "automatisk grovsortering". It uses must-have screening questions, not keyword matching in the CV.
- Talentech's AI text-match score (1–10) is presented as a recruiter aid: "to assist and inspire, not to make decisions".
- The brief's own addendum ([addendum.md](../../briefs/brief-JobAssistant-2026-09-11/addendum.md)), not this file, contains unsourced figures (49 %, 62 %). Don't repeat them as facts.

### 1.3 Keyword matching in Norwegian
- **Compounds.** Split spelling (*særskriving*) is a common error, so «prosjekt ledelse» should match «prosjektledelse». Paraphrases such as «ledelse av prosjekter» are a synonym problem, not a spelling variant.
- **Over-stemming.** The Snowball Norwegian stemmer reduces «havneloven» to «havn». Negative test cases are therefore required (FR-6).
- **Nynorsk.** It appears in some public-sector ads. v1 is tuned for bokmål only.
- **English terms.** Norwegian ads mix in English terms («Python-erfaring», «Scrum-master», «agile» and «agil»). Keep an alias list, and treat tool names as exact tokens.

### 1.4 Privacy and AI providers
- **Roles.** The app's operator is the controller and the AI provider is the processor. A written data processing agreement is required before any processing.
- **Transfers outside the EEA.** They need a legal basis. The EU–US Data Privacy Framework covers only listed US companies, and Datatilsynet advises keeping a contingency plan, since there would probably be no transition period if the framework fell.
- **Training and retention by provider:**
  - OpenAI API: no training by default; abuse-monitoring logs kept for up to 30 days; an EEA data-residency option exists.
  - Anthropic API: the commercial terms forbid training on customer content; inputs are deleted within 30 days by default.
  - Azure OpenAI: no training; processing stays inside the chosen geography.
  - Google Gemini, unpaid tier: content may be used to improve products; personal data is forbidden; EEA apps must use the paid tier.
  - Mistral, free Studio tier: may train on input.
- **Minimisation.** Send only what is needed, and don't log prompts. Datatilsynet's guidance is that data should normally be deleted within one month after a customer relationship ends.
- **Student projects.** Several Norwegian institutions have their own rules for personal data in student projects. Which rules apply to IBE160 hasn't been verified. v1 sidesteps the question: only fictional CVs are used in testing (Open question 4, closed 2026-11-08).

### 1.5 Letter expectations in Norway
- FINN's survey found that 86 % of recruiters notice AI use, and 69 % find applications more impersonal.
- Skatteetaten left out the cover letter in many of its ads.
- NAV and NTNU still teach a tailored letter of about one page, with concrete examples.
- These signals are why the Letter is short, built on examples, and labelled as a draft (FR-9).

## 2. Notes for the architecture

These notes are suggestions, not decisions. The architecture document must make and justify the choices; the lecturer asked for justified choices of language model, storage and encryption.

### 2.1 Keyword engine (FR-5 to FR-7)
- **Vocabulary is the main quality risk.** Extraction by code alone probably needs a curated vocabulary: the Norwegian labels in ESCO, which span all occupations, plus a list of technology terms. It must work for ads from any field, such as nursing, not only IT (Open questions 2 and 6). *Direction decided 2026-11-08 (architecture AD-2):* a curated core list, with selected ESCO Norwegian labels as backup, as versioned JSON in `data/vocabulary/`.
- **AI fallback.** Approved on 2026-10-31 and specified in full in FR-5; decided at the end of week 46. Keep extraction behind one interface, so either path fits.
- A possible pipeline:
  1. Normalise: case, æøå, hyphens and spaces.
  2. Lemmatise or stem.
  3. Generate split-compound variants only for the Job ad's Keywords, which keeps the noise down.
  4. Look up aliases (English–Norwegian, abbreviations).
- Record which stage produced each match, so the match type can be shown later at little cost.
- Pin library versions, so the results are deterministic (NFR-6).
- **Resources to evaluate** (names only):
  - Snowball Norwegian stemmer and its stopword list
  - Apache Lucene Norwegian analysers
  - spaCy `nb_core_news_*` (lemmatiser)
  - Oslo-Bergen Tagger and Norsk Ordbank
  - NB-BERT and NorBERT 3
  - ESCO's Norwegian skill labels
  - NAV's Job Vacancy Feed, as a source of real ads for building Fixtures
- **Check each tool against NFR-9.** NB-BERT, NorBERT 3, the spaCy models, Lucene (which needs Java) and the Oslo-Bergen Tagger all add heavy prerequisites. The local run allows one runtime and no large model download.

### 2.2 PDF extraction (FR-1, FR-3)
- Multi-column layouts and tables scramble the reading order. The review step (FR-3) is the safety net, so extraction doesn't need to be perfect.
- Detect "no text" (scanned PDFs), and send the Student to the paste option.

### 2.3 AI requests (FR-9 to FR-17)
- Make two requests per Application:
  - **Letter:** returns plain text.
  - **Gap analysis and Rewording suggestions:** returns structured JSON. Each Gap has the Keyword, a classification, an explanation and, for a Rewordable gap, an Evidence citation and an optional suggestion.
- Ask for verbatim Evidence citations in the prompt, so that FR-15 can check them by matching strings.
- Write the prompts in Norwegian, with explicit rules:
  - never claim a missing qualification;
  - never upgrade the kind of work or the Student's role (FR-16);
  - hedge suggestions;
  - follow the UX voice (NFR-1);
  - in the Letter, don't mention qualifications the Student lacks (FR-9);
  - use bokmål only.
- The FR-16 example («Kompetanse i sårvurdering», not «Forsket på sårvurdering») can be used inside the prompt.
- Add the name in the Profile to the Letter's sign-off locally, after generation. Contact details are removed before sending (FR-26).
- Log token counts for each request, with no content (FR-23, NFR-8).

### 2.4 Integrity guards (FR-11, FR-15, FR-17)
All three guards reuse the Keyword engine, so they are deterministic and easy to test. Where a guard compares words, it uses the Keyword engine's normalisation and stemming (§2.1, steps 1–2), so that «forsket», «forsker» and «forskning» count as one word.
- **Letter (FR-11):** mask the job title and the employer, run the Keyword engine on the Letter against the Job ad's Keyword list, and flag as FR-11 says.
- **Citations (FR-15):** a substring search of the CV text that ignores case and whitespace.
- **Suggestions (FR-17):** two checks; if either fails, the suggestion is discarded.
  - Keywords: run the Keyword engine on the suggestion. The only Keywords allowed are the suggestion's own target and the Matched keywords.
  - Upgrade words: look for any listed Upgrade word that appears in the suggestion but not in the cited CV entry.
- Start the Upgrade-word list short, and add each new Upgrade word that the manual checklist (PRD §9.2) finds.
- The guards catch false claims made with the ad's Keywords or with listed Upgrade words. Other false claims, such as an invented employer, are left to the manual checklist.

### 2.5 Test mode (FR-27)
- Store Cached responses as JSON files in the repository, keyed by Fixture (the Example pair is one of them).
- Use one abstraction for the AI client, with three implementations: live, cached and mock. Automated tests use the cached or mock implementation.
- Make some Cached responses deliberately bad (an Unsupported claim, a fake citation), so the guard tests have something to catch.
- Match uploaded or pasted texts to Cached responses after normalising case and whitespace, so «Bruk eksempelet» and the example files give the same result.

### 2.6 Storage and encryption (FR-22)
- Field-level encryption with one key is enough for v1. Rotating the key is out of scope.
- Hash passwords with a standard slow algorithm, such as bcrypt or Argon2.
- Hosted and local databases: see §2.8.

### 2.7 Cost (NFR-8)
- Estimate the cost of one Application from the token counts of the Fixture runs and the provider's prices at the time. Check prices when choosing the provider; don't rely on remembered figures.
- A budget of 200 NOK per month should cover development, Fixture runs and the demonstration. The Daily cap stops a runaway loop, and a monthly spending limit set with the provider is the backstop.

### 2.8 Hosting on Vercel (FR-30, FR-31)
- **Database.** Serverless functions have no persistent file system, so the Hosted version needs a hosted database with an EU region and a free tier. The local run must still work without a database server (NFR-9), for example with a file database behind the same data layer. *Decided 2026-11-08 (architecture AD-8, Open question 3):* Supabase Postgres in Frankfurt, used as a plain database, and PGlite in `.data/` for the local run.
- **Function time limits.** Check the Hobby plan's limit on function duration against NFR-4 (AI sections within 60 seconds; AI requests time out after 90 seconds). Streaming the response, or running the two AI requests in separate function calls, may be needed.
- Everything else about hosting is set in FR-30, FR-31 and PRD §8.1–§8.2. Details the PRD leaves out:
  - run the functions in an EU region, close to the database;
  - HTTPS is on by default;
  - the Hobby plan is meant for non-commercial projects, which a course project is;
  - slowing down repeated wrong Access-code attempts is a bonus if the framework makes it easy.

## 3. Rejected and deferred alternatives

Each row points to the PRD item that holds the decision. "As D-n" means the PRD's reason is complete; extra reasons are added after "plus".

| Alternative | Decision | Reason |
|---|---|---|
| Generate a full tailored CV file (UX Flow 1) | Rejected for v1 (D1) | As D1, plus: it needs a CV layout and a PDF renderer |
| Standalone «Vurder CV» and «Vurder søknad» (UX Flow 2) | Deferred (D2) | As D2, plus: each has its own inputs, outputs and History types |
| Output as PDF downloads only, never shown on screen (UX memlog L19) | Replaced (D3) | As D3 |
| AI decides or estimates the Match score | Rejected (P2; brief, lecturer) | Can't be tested against an Answer key, and isn't reproducible |
| AI writes the keyword explanations in S2 | Replaced by code templates (D7) | As D7 |
| Including the Letter in the Match score | Rejected (D8) | As D8, plus: a Letter written to the score would invite keyword stuffing |
| Weighting required over preferred Keywords | Deferred (PRD §5.3) | Harder to explain in one line; v1 keeps every Keyword equal |
| Account deletion and "delete my data" | Deferred (PRD §5.3) | Only the developer and the Examiner use v1, and the developer deletes all data when the course ends (FR-23) |
| Local run only, with no hosting | Replaced (D23) | As D23 |

## 4. UX updates needed to match the PRD

These follow from PRD §11. They make the UX and the PRD point to the same v1 items. They are grouped by the file each change lands in, so the week-45 update takes one pass per file.

### 4.1 EXPERIENCE.md

**Flows and navigation**
- Flow 1: remove the tailored CV file (D1), and show the Letter on screen (D3).
- The version without accounts (D20, PRD §5.1): Hjem's main button goes straight to Søknad, the CV is uploaded and confirmed on Søknad, the navigation has only Hjem and Søknad, and «Lagret.» isn't shown. Also sketch the layouts for the S4 and S5 cuts.

**Hjem** (D1, D2)
- Hide or remove the «Vurder CV» and «Vurder søknad» cards (deferred), or mark them as coming later.
- Change the main card's copy, which still promises a tailored CV.

**«Registrer deg» and Konto** (D14)
- «Registrer deg»: ask for name instead of username.
- Konto: show the email, the logout button and the data note, which says data is deleted when the course ends (FR-21, FR-23). Remove the password change.

**Profil** (D11)
- Add a paste option and an editable CV-text field with a confirm step.
- Keep the name as the only personal field, and show CV text instead of a stored file.

**Søknad** (D10, FR-10, FR-24)
- Add the job title, employer and Tone fields, and the one-time AI notice.
- Add the CV input for the version without accounts, and the "no CV yet" prompt (D11, D20).
- In Test mode, add «Bruk eksempelet» (FR-27).

**Results: score panel and Reflection Note** (D4, D15)
- Add «X av Y nøkkelord», the formula line and the estimate disclaimer.
- Add the code-written line for each Missing keyword (FR-8), and an Evidence excerpt for each Matched keyword.
- Write a sentence for the Needs work Verdict («Bør forbedres») as well as for Strong match.
- Add a Rewordable-gap callout with the cited CV entry, the suggested phrasing and «Kopier» (FR-16), alongside the existing Real-gap callout (the UX «Kubernetes» example). In the Suggestion callout rule, change "recruiter/ATS framing" to "recruiter framing" (FR-14).
- Mark the AI-written parts of the Reflection Note (FR-14), and keep the Note on screen only (D4).

**Results: Letter** (D3)
- Show the Letter on screen with «Kopier», «Last ned (.docx)», «Lag nytt utkast» and the AI-draft label (FR-9, FR-12).
- Reword «Lagret. Last ned filene dine nedenfor.»: there is now only one file.

**Historikk** (D5, NFR-2)
- Remove the «CV-vurdering» row and the type tags on the other History rows, and drop History search.
- Show the Verdict text on each score badge.

**State Patterns table**
- Two-phase results (D19): rewrite the Generating, Result ready and Generation failed states. Write progress copy for the AI phase, announce each phase once to screen readers (NFR-2), and add a partial-result state that keeps the score and lets the Student retry only the AI sections (NFR-5).
- Add these states and controls, each with its copy and an existing colour token:
  - the Letter warning (FR-11), the Daily-cap message (FR-25) and the Test-mode banner (FR-27);
  - the scanned-PDF message (FR-1), "too short or unclear to analyse" (FR-4) and the length-limit messages (FR-2, FR-4);
  - the per-section "not available in Test mode" message (FR-27);
  - "not found" (FR-19), and the Access-code screen (FR-31).

### 4.2 DESIGN.md
- Adjust the colours that fail WCAG AA (D16, NFR-2): text-secondary, the warning chip and badge, the success chip and badge, the accent-strong button label, the callout emphasis, accent links on the background, and the input and dropzone outlines (3:1 for non-text contrast).
- Add components: the Letter view with the flagged-word highlight, the Tone choice, the AI-notice dialog, the Test-mode banner, and the Evidence excerpt.
- Keep all touch targets at least 44 px (NFR-2).

### 4.3 Mockups
- Result mockup: remove the tailored CV file and the Reflection Note download, show the Letter on screen, and fix the score, which shows 78 % next to 5 of 7 keywords (that is 71 %).
- Home mockup: apply the Hjem and Historikk changes above.

### 4.4 All UX files
- Tag UX flows and screens with the S and FR IDs they realise.
- Replace "early December 2026" with the 15 December 2026 deadline (EXPERIENCE.md, overview paragraph).

## 5. Questions for the lecturer

From the analysis of the examiner guide, the most important first. Each question names the PRD's matching Open question, if there is one.
1. *Settled 2026-11-08:* the deadline is 15 December 2026, and the last commit on `main` at the deadline counts (Open question 1).
2. Is Test mode for the README run, plus live AI on the Hosted version, acceptable for the AI features? (Open question 5)
3. *Settled 2026-11-08, no longer needed:* only fictional CVs are used in testing (Open question 4).
4. The app will also be hosted on Vercel. Is the README run on a clean machine still what criterion 6 (README and runnability) grades? (This file only; owner Helene.)
5. Are curated session logs (`.logs/`) enough as "lagrede prompts og KI-økter", or are raw transcripts expected? (This file only; owner Helene.)
6. Is mocking the AI acceptable in automated tests, with a manual checklist for the quality of AI-written text? (Open question 8)
