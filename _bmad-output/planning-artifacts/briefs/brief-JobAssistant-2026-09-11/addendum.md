# Addendum: JobAssistant brief

Supporting detail that informed the brief but is too granular for a one- to two-page executive document. Useful for downstream work (PRD, architecture) that needs more depth on the competitive landscape or the reasoning behind scope decisions.

## Competitive landscape (detail) — supports What makes this different

Research conducted 2026-09-11 to ground the brief's market context.

**Comparables:**
- **Rezi** — strict ATS (Applicant Tracking System)-safe formatting + job-description-specific tailoring; targets tech job seekers.
- **Jobscan** — deepest ATS *scoring* tool (match-rate scanning against a pasted job ad); a scanner, not primarily a writer/builder.
- **Kickresume** — GPT-4-powered content generation, broad templates, strong first-draft writer but shallow per-job tailoring; generous student program (6 months Premium free) — the closest existing "student-friendly" incumbent.
- **Teal** — free-forever tier bundling resume building + application tracking in one dashboard; best free option overall.
- **Enhancv** — leans into storytelling/personal branding, useful for surfacing soft skills when work history is thin.
- **Wobo, Resume.com (Indeed)** — free/unlimited entrants competing purely on no-paywall access.

Table stakes in this market: AI draft generation, ATS match scoring, job-ad paste-in tailoring, cover letter generation. Differentiators: tailoring depth, free-tier generosity, career-tracking/dashboard features.

**Pricing norms:** freemium-to-subscription is universal. Paid tiers cluster $24 to $50/mo (Kickresume $24/mo, Teal+ $29/mo, Rezi $29/mo or $149 lifetime, Jobscan $49.95/mo). Free tiers are the acquisition lever.

**Recent trend context (as of a May 2026 audit):** this is the direct evidence behind the brief's "What makes this different" argument that beating the ATS filter alone is an incomplete strategy. None of the 10 major ATS platforms (Workday, Greenhouse, iCIMS, Oracle, SAP, Lever, Workable, SmartRecruiters, Ashby, BambooHR) reliably detect AI-generated resumes, but vendors shipped AI-content classifiers in late 2025 that flag suspicious language and route it into lower-priority queues. Human hiring managers are the more reliable filter in practice: one 2025 survey found 49% auto-dismiss suspected AI resumes and 62% reject AI text lacking personalization.

**Pitfalls other tools fall into** (used to shape what JobAssistant should avoid): generic/robotic output that reads as templated; over-optimization for ATS keyword-stuffing at the expense of authentic voice; implying/hallucinating qualifications during gap-filling.

## Business model note — supports What makes this different, Scope

Decided: no monetization in this version. This is a course project (IBE160), not a live fundraising effort — the brief intentionally omits pricing, financial projections, and a funding ask per the user's direction, even though it is written in an investor-pitch shape. If this ever moves toward a real product, the freemium-to-subscription pricing norms noted above are the natural starting point.

## Deferred scope — rationale (see Scope)

Voice-learning from former applications was cut from v1 because it is meaningfully harder to build well than the rest of the feature set (requires a personalization/fine-tuning approach, not just prompt-and-generate) and the timeline to early December is tight. It remains the centerpiece of the Vision section as the natural next capability.
