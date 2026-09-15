---
title: JobAssistant
status: final
created: 2026-09-11
updated: 2026-09-11
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

**User success**: students report that JobAssistant's suggestions feel honest and useful — not generic AI filler, not implying qualifications they don't have — and understand *why* a change was suggested well enough to defend it in an interview. Over time, this shows up as fewer ATS-style rejections, application letters that sound like the student rather than a template, and enough understanding of how recruitment filtering works that rejections stop feeling arbitrary.

**Delivery success**: a working end-to-end demo by early December — CV upload, job ad paste-in, tailored application output, CV improvement suggestions, gap analysis, and ATS match score, all functioning together. (Formal grading criteria for the course are out of scope for this brief.)

## Scope

**In v1**:
- CV upload (PDF/DOC/TXT)
- Job advertisement paste-in
- Tailored application letter generation in a preferred tone/style
- CV improvement suggestions
- Gap analysis that translates coursework/projects/extracurriculars into missing qualifications
- ATS-style match score with keyword-level explanations
- User accounts with login
- Encrypted storage of uploaded and generated content

**Explicitly out of v1**:
- Learning the student's voice from former applications (past applications are not yet used to personalize output)
- Mobile app
- Multi-language support
- Direct job-board integration or auto-apply
- Interview preparation features
- LinkedIn import

## Vision

JobAssistant becomes the place a student goes the moment they start thinking about their first job, not just when a specific ad catches their eye. Over time it learns each student's voice from the applications they've written, so every new letter sounds more like them and less like a first draft. The transparency at its core — showing students exactly how their application is being judged — extends past ATS keywords into genuine feedback on structure, clarity, and framing, so students leave not just with a better application but with a real, transferable understanding of how hiring works. What starts as a tool for landing the first job becomes the place students return to for every job after that, because by then they trust it to be honest with them.
