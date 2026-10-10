---
title: JobAssistant
status: final
created: 2026-09-11
updated: 2026-10-10
---

# Product brief: JobAssistant

## Executive summary

University and college students hunting for their first full-time job face a catch-22: most entry-level postings expect experience, and applicant tracking system (ATS) software that pre-screens applications rewards exactly that — keywords a student hasn't had the chance to earn on the job. Their real qualifications exist, scattered across coursework and extracurriculars, but in language the filter doesn't recognize. Most respond with generic or AI-generated applications, which fixes nothing and often reads as impersonal to the humans who eventually see it.

JobAssistant is a web application that turns a single CV into a tailored, honest application in minutes: upload a CV once, then paste in each new job ad. It produces a tailored letter, flags gaps, and shows its work — an ATS-style match score with keyword-level explanations — so students see why a suggestion was made rather than accept a black-box draft. Where a qualification is missing, it points to coursework or projects that legitimately fill the gap.

The differentiator isn't a technical moat — Kickresume and Teal already offer free AI-generated resumes. It's philosophy: most tools optimize purely to beat the filter, producing generic text human reviewers are learning to distrust. JobAssistant is built on transparency instead, giving students a realistic look at how AI and recruitment technology actually judge them. With a working v1 due by early December, the goal is simple: applications that clear the filter more often, and students who understand why.

## The problem

University and college students hunting for their first full-time job face a brutal catch-22: most entry-level postings still list "experience in the field" as a qualification, and the applicant tracking systems (ATS) that pre-screen applications are tuned to reward exactly that. ATS keyword-matching favors the vocabulary of people who already work the job — the tools, processes, and industry terms picked up by doing it. A student's real qualifications exist, but they're scattered across coursework, class projects, and extracurriculars, expressed in academic language that the filter doesn't recognize as equivalent. The result: students are structurally more likely to be filtered out before a human ever reads their application, for reasons that have nothing to do with whether they could do the job.

Faced with that, students apply to far more roles than they hear back from, and rarely learn why a given application failed — was the CV wrong, the letter generic, or did it never clear the ATS filter at all? Writing a genuinely tailored CV and cover letter for every single posting is the correct response, but it doesn't scale. Doing it properly for dozens of applications is exhausting, so most students fall back on a single generic application blasted everywhere, or hand the job to an AI tool that produces something equally generic — which does nothing to fix the underlying keyword mismatch and can read as impersonal to the reviewer who eventually sees it.

## The solution

JobAssistant turns a single CV into a tailored application in minutes, not hours. A student uploads their CV once; from then on, applying to a new job is as simple as pasting in the job advertisement. JobAssistant reads the posting, compares it against the CV, and produces an application letter adjusted to that specific role, in the student's own preferred tone and style.

Instead of a black box, the student sees exactly why. An ATS-style match score shows which keywords from the job ad are — and aren't — reflected in their CV and letter, and a plain-language explanation accompanies every suggestion ("recruiters scanning for this role look for X; your application doesn't show it yet"). This gives students the realistic look at how AI and ATS systems actually judge an application — a look most students never get.

Where the CV falls short, JobAssistant doesn't just flag the gap — it looks at the student's coursework, class projects, and extracurriculars for something that legitimately fills it, and suggests how to phrase and add that experience. A missing "project management" keyword might be answered by the semester-long group project already on their CV, just not described in those terms yet. The result is an application that is both more likely to clear the filter and more honestly representative of what the student can actually do.

## What makes this different

Kickresume and Teal already give students free or cheap access to AI-generated resumes and cover letters — that alone isn't a fight JobAssistant can win on price or breadth. To be honest about it: nothing described here is a defensible technical moat. What's different is the philosophy behind the product.

Most existing tools optimize purely for "beat the filter": generate text, check a score, ship it. That produces exactly the generic, keyword-stuffed output that human reviewers are learning to distrust — research shows hiring managers penalizing applications that read as AI-written and impersonal. JobAssistant is built around the opposite instinct: instead of hiding how the system works, it shows the student why a suggestion was made and what recruiters and ATS software are actually scanning for. The output is tailored, not templated, because the student understands and edits the reasoning rather than accepting a black-box draft — which also means they can actually defend and expand on what's in their application when an interviewer asks about it. For a first-time job hunter with no prior experience with how recruitment technology works, that transparency is the product, not a feature bolted onto it.

## Who this serves

The primary user is a university or college student, in any field of study, applying for their first full-time job after graduation. They have a CV built mostly from coursework, class projects, part-time work, and extracurriculars rather than a professional track record, and they are applying to multiple roles in parallel because no single application feels like a safe bet. They need to know, honestly, whether their application is competitive for a given posting, and — where it isn't yet — what to change and why, using experience they already have rather than experience they don't.

JobAssistant is self-serve and used directly by the student — there is no institutional or career-center intermediary in this version of the product.

## Success criteria

**Functional success criteria** (testable within the semester, against fixed example CVs and job ads with a pre-defined answer key):

1. For a known CV and job ad, the match-score output lists which keywords from the job ad are present in the CV and which are missing, keyword by keyword.
2. The match-score is a single number between 0 and 100, computed deterministically by code (keyword/skill comparison between job-ad text and CV text) — not generated or estimated by the language model — so the same CV/job-ad pair always produces the same score, where 100 means every keyword/skill identified in the job ad is reflected in the CV.
3. The gap-analysis never suggests a qualification that isn't already supported by text in the CV: every suggested gap-filler must cite the specific CV entry (course, project, job, or extracurricular) it's drawn from.
4. Run against a fixed set of at least 3 example CV/job-ad pairs with a hand-written answer key: the match-score (±a defined tolerance) and gap-analysis outputs match the expected keywords and suggestions.
5. The generated application letter contains no qualification or keyword that isn't traceable back to the CV (no hallucinated experience).
6. CV improvement suggestions each name the specific CV section they're based on, so a reviewer can verify the suggestion isn't invented.
7. The full core flow — upload CV (PDF or TXT), paste job ad, view match score with explanation, receive tailored letter — completes end-to-end without manual intervention.
8. A test mode exists that reproduces this full flow using one pre-recorded example CV and job ad with cached responses, so it can be verified without a live LLM API key.
9. All interface text and all generated content (letter, CV suggestions, gap analysis, explanations) are in Norwegian (bokmål), including when the job ad contains English terms.

**How the match-score is calculated**: the score is produced by code, not by asking the language model to invent a number. Keywords/skills are extracted from the job ad text and compared against the CV text (e.g., exact and near-match string/keyword comparison); the result is a 0–100 score (percentage of job-ad keywords found in the CV) plus a present/missing breakdown per keyword. Because CVs and job ads are in Norwegian, the comparison must normalise text before matching: case-insensitive, and inflected forms count as the same keyword ("prosjektleder", "prosjektlederen", "prosjektledere"). English terms that are common in Norwegian job ads (tool names, "stakeholder", "Agile") are treated as keywords like any other. How far to go with Norwegian compound words ("prosjektledelse" vs. "ledelse av prosjekter") is an architecture decision; whatever is chosen must be covered by the answer-key fixtures. This keeps the score auditable and testable against fixture data — the language model is used only for the explanatory text and the letter/gap-analysis content, not for deciding the score itself.

**User success** (directional, not graded within the semester): over time, students should find JobAssistant's suggestions honest and useful rather than generic filler, and understand *why* a change was suggested well enough to defend it in an interview. This is a long-term outcome the functional criteria above are designed to make possible, not something measured during the course.

## Scope

**In v1**, ranked in build order (if time runs short, cut from the bottom):

1. CV upload (PDF or TXT, with plain-text paste as a fallback) and job advertisement paste-in — the input for everything else
2. ATS-style match score with keyword-level explanations, computed in code
3. Tailored application letter generation in a preferred tone/style
4. Gap analysis that translates coursework/projects/extracurriculars into missing qualifications
5. CV improvement suggestions
6. User accounts with login, where each student sees only their own CVs and applications
7. Encrypted storage of uploaded and generated content

Items 1–3 form the core flow (upload CV → paste job ad → see explained match score → get tailored letter) and must be finished and stable before work starts on items 4–7. DOC files are not supported in v1, because text extraction from them is unreliable and adds risk without strengthening the core flow.

**Language**: v1 is Norwegian only (bokmål). The interface, all generated content, and all test data (example CVs, job ads, answer keys, cached test-mode responses) are in Norwegian. CVs and job ads are expected to be written in Norwegian.

**Privacy and data handling**: CVs contain personal data. Besides encrypting stored content, v1 tells the student plainly that CV and job-ad text is sent to an external language-model provider to generate the letter, gap analysis, suggestions, and explanations. The match score itself is computed locally and does not require sending data out. Only made-up example CVs are used as test data; real CVs never go into the repository.

**Explicitly out of v1**:
- Learning the student's voice from former applications (past applications are not yet used to personalize output)
- Mobile app
- Multi-language support (v1 is Norwegian only: no English interface, no English output, no nynorsk)
- Direct job-board integration or auto-apply
- Interview preparation features
- LinkedIn import

## Vision

JobAssistant becomes the place a student goes the moment they start thinking about their first job, not just when a specific ad catches their eye. Over time it learns each student's voice from the applications they've written, so every new letter sounds more like them and less like a first draft. The transparency at its core — showing students exactly how their application is being judged — extends past ATS keywords into genuine feedback on structure, clarity, and framing, so students leave not just with a better application but with a real, transferable understanding of how hiring works. What starts as a tool for landing the first job becomes the place students return to for every job after that, because by then they trust it to be honest with them.
