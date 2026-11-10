# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 with TypeScript on Node.js 26 LTS, hosted on Vercel (Hobby, Frankfurt functions). Biome for lint and format; Vitest and Playwright with axe for tests. Decided in `docs/architecture.md`, not by this design round. No UI code exists yet (as of 2026-11-09).

## Users

- **Primary: the Student.** A Norwegian student or recent graduate applying for their first full-time job. Their CV is built from courses, group projects, part-time jobs and volunteering, described in academic language. They have just found an ad they want to apply for, usually on a laptop, sometimes on a phone. They want to know quickly how well the CV matches and why, describe experience they already have in the employer's words without lying, and get a letter draft that is about them, not generic. They must be able to defend every claim in a job interview.
- **Secondary: the Examiner (IBE160 *sensor*).** Grades the course project. Runs the app from the README on a clean machine with no API key (Test mode, the «Bruk eksempelet» Example pair), optionally tries the Hosted version with an Access code, and traces features back to PRD requirement IDs. Has about 15–20 minutes per project.
- **Not users in v1:** experienced professionals and career changers, recruiters, employers, career centres, and anyone needing an English or nynorsk interface. Only the developer and the Examiner can reach the Hosted version.

## Product Purpose

The Student uploads or pastes a CV once and pastes a job ad. JobAssistant returns three things for that ad: a Match score showing which of the ad's keywords the CV covers, an honest analysis of each gap with suggestions for rewording experience the Student already has, and a draft application letter.

The problem it solves is vocabulary, not ability: real qualifications get missed because they are written in words that don't match the ad.

Success means the Student leaves with a letter and phrasing they can defend, and knows which gaps are real. For the course, success also means the core flow runs from the README without a key and every feature traces to the PRD.

## Positioning

JobAssistant differs in its stance, not its technology: it shows its work and never invents.

- Ordinary code calculates the score, never AI. The app shows the formula and the CV line behind every matched keyword.
- Every rewording suggestion cites the CV entry it is based on, word for word, and code checks that citation before it is shown.
- A skill the CV can't support is reported plainly as a real gap and never filled in. There is nothing to paste for a real gap.
- Integrity guards scan AI output for claims the CV doesn't support and for "upgrade words" (such as «forsket» or «ledet») that inflate the kind of work or role.

## Operating Context

- **Core flow (Søknad):** confirm the CV text (an upload is extracted and always shown for correction, because PDF extraction scrambles columns) → paste the ad and type the job title and employer → pick a Tone (Formell, Personlig, Direkte) → accept a one-time notice that text goes to an AI provider → results arrive in two phases. The Match score and keyword lists come first, within about 2 seconds; then a progress line while the Gap analysis, Rewording suggestions and Letter are written (under 60 seconds).
- **Results (Refleksjonsnotat):** «71 % samsvar – 5 av 7 nøkkelord», a Verdict (Sterkt samsvar ≥ 70, otherwise Bør forbedres), Evidence for each matched keyword, each missing keyword with the ad line that asks for it, Gaps marked rewordable or real, and Rewording suggestions with «Kopier». The Letter is shown read-only with «Kopier», «Last ned (.docx)» and «Lag nytt utkast». The Student edits the letter in their own tools; there is no editor in the app.
- **Pages:** Hjem, Søknad, Profil, Historikk, Konto, plus «Registrer deg», «Logg inn» and the Access-code screen. Before accounts exist (build steps 1–5, or permanently if accounts are cut), only Hjem and Søknad exist, the CV text lives in the browser session, and nothing about the Student is stored.
- **Returning use:** the saved CV text pre-fills Søknad. Historikk lists past Applications to reopen, copy and download; they can't be edited.
- **Examiner use:** Test mode replays cached AI answers. Pasting a different ad in Test mode still gives a code-calculated score, and the AI sections say they are unavailable.

## Capabilities and Constraints

- CV input: PDF or TXT up to 2 MB, or pasted text of 200–20,000 characters. A scanned PDF gets a message asking the Student to paste the text instead. Job ad: pasted, 200–15,000 characters; job title and employer required. Fewer than 3 keywords means no score and an "ad too short or unclear" message.
- At most two AI requests per Application, plus any new letters the Student asks for. There is a daily cap per Student. AI requests time out after 90 seconds and can be retried.
- Build order and cut line: S1–S3 (input, Match score, Letter) must be stable by 22 Nov 2026. Next come S4–S5 (Gap analysis, Rewording suggestions), and last S6 + S7 (accounts, encrypted storage), which are cut first. Designs must work with and without accounts.
- Deadline: 15 Dec 2026, last commit on `main`. One developer with limited, variable weekly time.
- Terminology is fixed by PRD §3 and used exactly: Match score («ATS-samsvar»), Verdict, Matched keyword, Evidence, Rewordable gap, Real gap, Rewording suggestion, Letter, Tone, Reflection Note («Refleksjonsnotat»), History («Historikk»).
- The score is labelled as an estimate of keyword coverage, never as a real ATS result or a prediction of interview chances. AI-written text is always labelled: the Letter as «Utkast skrevet med KI – les gjennom og tilpass før du sender.», and Gap explanations and suggestions as written by AI.
- No one-click "add keyword", no auto-send, no generated CV file. The Student copies only what they choose.
- Deferred past v1: «Vurder CV» / «Vurder søknad», a generated CV, search, delete and rename in History, password reset, English or nynorsk.
- Open: whether keywords come from code alone or from the AI fallback (decided end of week 46). The fallback makes the score wait for an AI request, so it no longer appears within 2 seconds.

## Brand Commitments

- Name: JobAssistant.
- Voice (binding, PRD P5 and NFR-1): plain, warm bokmål. Address the user as «du». State the fact first, then the reason. No cheerleading, exclamation marks or emoji, and no English loanwords where a common Norwegian word exists. Hedged suggestions: «dekker trolig dette – vurder å ta det med». Norwegian conventions: «71 %», «8. sep. 2026», «sjevroner».
- Visual identity: «Signal, varm», one dark warm-brown theme, defined in `_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-11-09/DESIGN.md` (behaviour in EXPERIENCE.md there; finalized 2026-11-10). It fully replaces the BMad UX of 2026-09-11 («Warm Editorial» + «Rich Mocha»), which is now history, not reference.

## Evidence on Hand

- PRD with stable IDs (FR-1–31, NFR-1–11, UJ-1–3, P1–P6): `_bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/prd.md`.
- Architecture: `docs/architecture.md` and `_bmad-output/planning-artifacts/architecture/architecture-JobAssistant-2026-11-08/ARCHITECTURE-SPINE.md`.
- UX (binding, 2026-11-10): `DESIGN.md` (look), `EXPERIENCE.md` (behaviour) and the mock `mockups/signal-varm.html`, all in `_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-11-09/`. The UX of 2026-09-11 is history only.
- Fictional example content in the PRD: Violet, a junior frontend applicant; «Junior produktanalytiker» at Fjord Analytics; the nursing «sårvurdering» example; the «Kubernetes» real gap. Fixtures and the Example pair are not written yet (week 46).
- Absent, and must not be fabricated: real users, testimonials, usage numbers, partner institutions, pricing. Real CVs are not used, only fictional ones.

## Product Principles

1. **Never invent.** Nothing may claim a qualification the CV text doesn't support. Code checks where it can; the design never makes an unsupported claim easier to copy.
2. **Show the work.** The score, the formula and the evidence behind every keyword are visible. Trust comes from being able to trace a result, not from being told to trust it.
3. **The Student decides.** Suggestions are offered, never applied. Copying is a deliberate act.
4. **Be honest about the tool.** Estimates are called estimates, AI text is labelled AI text, and the Student is told before anything leaves the app.
5. **Spend little, store little.** Few AI requests, minimal stored data, personal content encrypted.

## Accessibility & Inclusion

WCAG 2.2 AA on every screen (NFR-2):
- full keyboard operation and labelled fields, with errors tied to their field;
- progress announced with `aria-live`, once for the score and once for the AI sections;
- meaning never shown by colour alone, with text alternatives for icons and the score badge;
- text contrast of at least 4.5:1, and at least 3:1 for control boundaries;
- touch targets of at least 44 px.

Fully usable from 360 px wide, in a single column, with navigation collapsing at 640 px and below (NFR-3). Every page has `lang="nb"`. Checked with an axe scan (0 serious or critical findings) and a keyboard-only walkthrough of UJ-1.
