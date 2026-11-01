# Reconciliation: product brief and lecturer feedback

- **Date:** 2026-10-31
- **Input read in full** (`_bmad-output/planning-artifacts/briefs/brief-JobAssistant-2026-09-11/`): `brief.md` (status final, updated 2026-10-10), `addendum.md`, `tilbakemelding-product-brief.md` (lecturer feedback, 2026-10-06), `.memlog.md`. Also used: the map `extract-brief.md`. Every gap below was checked against the original files.
- **PRD read:** `prd.md`, `addendum.md`, `.memlog.md` (up to "Coaching round complete ... Starting Finalize"). I also checked the repository for the `.working/` folder named in the feedback.
- **PRD frontmatter:** `updated: 2026-10-31` (`status: draft`).

## Verdict

The PRD matches the brief and the lecturer's feedback well. All seven v1 items, the build order and cut line, the nine success criteria, the out-of-v1 list, the privacy paragraph and every substantive lecturer point are carried, most in a stronger, testable form. None of the 14 gaps is high severity. Most concern how strictly four brief criteria are made testable (S2's explanations, SC4, SC7, SC8). The others are an unlogged softening of the brief's ATS premise, a privacy wording mismatch in S7, and inexact citations.

## Gaps

1. **Test mode skips the upload step and depends on accounts.** Medium.
   - Input: brief.md, Success criteria 8, says test mode "reproduces this full flow using one pre-recorded example CV and job ad with cached responses". Criterion 7's flow starts with "upload CV (PDF or TXT), paste job ad". The feedback (De viktigste endringene 3) asks: "Legg inn en testmodus med forhåndslagrede svar for en eksempel-CV og en eksempelannonse."
   - PRD: In UJ-3 the Examiner logs in as the seeded test user and "opens the Example pair". Its CV is already in the Profile (FR-29), so Test mode never exercises upload or paste. FR-27 doesn't say whether uploading the example CV as a file reaches the Cached responses ("For other inputs, the AI sections say they are not available"). FR-29 is built in step 6 (S6 + S7), which is the first cut. The §5.1 cut text adapts UJ-2 but not UJ-3 or the README path.
   - Fix: In FR-27, ship the Example pair as uploadable files (the CV as PDF and TXT, the ad as text) and require that using them in Test mode reaches the Cached responses. In §5.1, add a no-login version of UJ-3 to the effects of the S6 + S7 cut.

2. **S2's keyword-level explanations are thinner than the brief and the lecturer's item (a).** Medium.
   - Input: brief.md, Scope item 2: "ATS-style match score with keyword-level explanations, computed in code". The solution: "a plain-language explanation accompanies every suggestion ("recruiters scanning for this role look for X; your application doesn't show it yet")". Feedback, Forslag til justering 2(a): "match-score med nøkkelordforklaring beregnet i kode".
   - PRD: FR-8 requires «X av Y nøkkelord», "a one-line explanation of the formula", Evidence for each Matched keyword, and "Every Missing keyword is listed". The reason a Missing keyword matters comes only from FR-14 (S4, written by AI). If S4 is cut, "The Reflection Note shows only Matched and Missing keywords and their Evidence" (§5.1). The §6.2 description and D7 say the explanations come from code templates, but no FR defines a template sentence per Keyword.
   - Fix: Add an FR-8 bullet that gives each Missing keyword a code-template sentence modelled on the brief's sample, for example «Annonsen ber om «X». CV-en din viser det ikke ennå.» (wording for the UX to settle). S2 then has keyword-level explanations even without S4, and FR-14 adds the AI reasoning on top.

3. **SC4's gap-analysis half has no stated pass rule.** Medium.
   - Input: brief.md, Success criteria 4: on at least 3 pairs with a hand-written answer key, "the match-score (±a defined tolerance) and gap-analysis outputs match the expected keywords and suggestions". Feedback, Kontroll på KI-ens arbeid: "Lag noen få eksempel-CV-er med fasit for hva som skal og ikke skal foreslås."
   - PRD: §12 maps SC4 only to FR-28, which provides the Fixtures but doesn't say how outputs are compared with them. The score half is covered by SM-2, and the must-never-suggest cases by FR-15 and G2. The expected Rewordable gaps appear only in SM-5's "at least 70 %", which is tagged as an assumption and framed as a usefulness metric rather than SC4's bar.
   - Fix: Map SC4 to FR-28, SM-2, FR-15, G2 and G4/SM-5. Write its pass rule in §12: exact Keyword lists and a score within ±5 on every Fixture, no must-never-suggest item shown as a Rewordable gap, and at least 70 % of the expected Rewordable gaps found. Say that this is how the PRD reads "match" for AI output, which varies from run to run.

4. **The brief's ATS premise and goal are softened without a §11 entry.** Medium.
   - Input: brief.md, Executive summary: ATS software "that pre-screens applications rewards exactly that", and "the goal is simple: applications that clear the filter more often, and students who understand why". The solution promises "the realistic look at how AI and ATS systems actually judge an application". The feedback (Det som er bra 1) praises this framing of the problem.
   - PRD: §1 restates the problem as "a recruiter skimming the CV, or a recruitment system searching it for terms, can miss them". Addendum 1.2 says "No independent Norwegian data shows automatic keyword filtering". The PRD never restates the goal of clearing the filter more often. From the brief's User success, §12 keeps "honest and useful ... defend them" but drops "understand *why* a change was suggested". D15 covers only the disclaimer wording.
   - Fix: Add a §11 row: the ATS-filter premise is narrowed to keyword coverage as recruiters search and skim CVs, for the reason given in addendum 1.2, and "clear the filter more often" is not a v1 claim. Keep the brief's aim that students "understand why" in §1 or §12.

5. **SC7's "without manual intervention" conflicts with the required CV-text review.** Medium.
   - Input: brief.md, Success criteria 7: the core flow, starting with "upload CV (PDF or TXT)", "completes end-to-end without manual intervention". Feedback, Filhåndtering: "CV-er har ofte kolonner og tabeller som gjør PDF-lesing upålitelig."
   - PRD: FR-3 makes review and confirmation of the extracted text compulsory. In UJ-1 step 2, Violet fixes a scrambled line, and FR-28 requires a two-column PDF Fixture. Yet SM-1 requires UJ-1 to complete "without manual intervention" for every Fixture. §12 also maps SC7 to UJ-1, which includes registration, Profil and Historikk (S6), while the §5.1 checkpoint says "UJ-1 works end to end without accounts".
   - Fix: Define "manual intervention" for SC7 and SM-1 in §12. Confirming the extracted text is a normal user step. Single-column PDF and TXT Fixtures must need no edits, and the two-column Fixture is the FR-3 correction case. Also describe the session-only UJ-1 path that the checkpoint uses.

6. **S7's encryption list is narrower than the PRD's own promise.** Medium.
   - Input: brief.md, Scope item 7: "Encrypted storage of uploaded and generated content". Privacy and data handling: "CVs contain personal data. Besides encrypting stored content ...". Feedback, Sikkerhet og personvern: "dere har lovet kryptert lagring".
   - PRD: §6.7 says "Everything personal that JobAssistant stores is encrypted", but FR-22 lists only the CV text, Job ad text, Letter, Gaps, Rewording suggestions and Evidence. It leaves out stored data such as the Profile name and phone (FR-20), the job title and employer, and the keyword lists (FR-21). So FR-22's check ("Opening the database file directly shows none of these fields in plain text") can pass while personal data sits unencrypted.
   - Fix: Add those fields to FR-22, or list the fields that stay in plain text and why (for example the email for login lookup, and the date and score for sorting History). Then make the §6.7 sentence match.

7. **The manual checklist doesn't cover SC9 or explanations beyond the Letter.** Low.
   - Input: brief.md, Success criteria 9: all interface text and all generated content "(letter, CV suggestions, gap analysis, explanations)" are in bokmål. The solution: "a plain-language explanation accompanies every suggestion". Feedback, Testbarhet: "KI-tekst må testes manuelt etter en sjekkliste. Dette bør beskrives i PRD-en."
   - PRD: NFR-1 and FR-14 are verified manually, but §9.2 checks bokmål only for the Letter (L1) and the suggestions (R3). It has no item for Gap explanations, and §9.3 doesn't check the interface language.
   - Fix: Add a G5 check for Gap explanations: bokmål, plain language, reference to the ad, and FR-14's order and hedging. Add a §9.3 bokmål check of all interface text, run on the Fixture with English terms.

8. **The cut order doesn't say which brief criteria lapse.** Low.
   - Input: brief.md, Scope: "if time runs short, cut from the bottom". Criteria 3, 4 and 6 depend on items 4 and 5.
   - PRD: §5.1 describes what each cut means for the user, and §12 says "SC1–SC9 remain the acceptance criteria". Neither says that cutting S5 leaves SC6 unmet, or that cutting S4 leaves SC3 and the gap half of SC4 unmet.
   - Fix: Under each cut in §5.1, name the brief criteria it voids, and say these will be reported in §11 as not delivered.

9. **Brief IDs and quotes in §0 and §11 are not exact.** Low.
   - Input: The brief numbers its v1 items 1–7 and its criteria 1–9; the S and SC labels were made up in extract-brief.md. The brief's actual wording: "the language model is used only for the explanatory text and the letter/gap-analysis content" (How the match-score is calculated); "upload a CV once" (Executive summary); "uploaded and generated content" (Scope item 7). The feedback says "nøkkelord fra annonsen sammenlignet med CV og brev" (Change 2) and "match-score med nøkkelordforklaring beregnet i kode" (item (a)).
   - PRD: §0 says the PRD "cites its v1 scope items S1–S7 and success criteria SC1–SC9 by ID". D7 quotes "the language model is used for the explanatory text", dropping "only". D6 quotes "upload the CV once", and D12 quotes "uploaded content". D8 cites only the brief for "CV and letter", although the lecturer used the same wording. D7 doesn't cite the lecturer's item (a), which supports it.
   - Fix: Add a one-line key to §0: S1–S7 are the brief's "In v1" items 1–7 in order, and SC1–SC9 are its functional criteria 1–9. Make the §11 quotes verbatim, and cite the feedback in D8 (Change 2) and D7 (item (a)).

10. **FR-6 decides the compound example that the brief left to the architecture.** Low.
    - Input: brief.md, How the match-score is calculated: "How far to go with Norwegian compound words ("prosjektledelse" vs. "ledelse av prosjekter") is an architecture decision".
    - PRD: FR-6 rules that "Paraphrases such as «ledelse av prosjekter» are not matched by code", then says "How far compound handling goes is left to the architecture ... (brief)". Neither §11 nor the memlog records this decision.
    - Fix: Either log it in §11 as a PRD decision (addendum 1.3 gives the reason: it is a synonym problem, not a spelling variant), or reword FR-6 so the architecture may match such paraphrases if the Fixtures cover them.

11. **FR-5's fallback doesn't list its effect on the privacy notice.** Low, and only applies if the fallback is used.
    - Input: brief.md, Privacy and data handling: "The match score itself is computed locally and does not require sending data out."
    - PRD: FR-5 lists the fallback's effects on FR-8, NFR-4, P6/NFR-8, FR-25, FR-27, UJ-3 and NFR-6, but not on FR-24. FR-24's notice says the Job ad is sent "to write the Letter, the Gaps and the suggestions" and "that the Match score is calculated locally".
    - Fix: Add FR-24 to FR-5's list. Under the fallback, the notice must say that the Job ad, never the CV, is also sent to extract Keywords, and the §11 entry must cite the brief's "does not require sending data out".

12. **The brief's own example isn't tested against the new rule against upgrading.** Low.
    - Input: brief.md, The solution: a missing "project management" keyword "might be answered by the semester-long group project already on their CV". The feedback (Det som er bra 1) praises this exact example.
    - PRD: FR-16 forbids upgrading "the kind of work or the Student's role ... taking part is not leading", and the PRD's examples use «Tverrfaglig samarbeid» and «sårvurdering» instead. The PRD never says whether a group-project entry can support «prosjektledelse».
    - Fix: Add the brief's example as a case in FR-28. «Prosjektledelse» is a Rewordable gap only if the group-project entry shows planning or coordination; otherwise it is a Real gap.

13. **The Vision's second deferred item is missing.** Low.
    - Input: brief.md, Vision: transparency "extends past ATS keywords into genuine feedback on structure, clarity, and framing". Feedback, Gjennomgang (Vision rated OK): "Stemmelæring og bredere tilbakemelding er tydelig plassert utenfor v1."
    - PRD: §5.3 defers voice-learning "(brief Vision)" but not the broader feedback. §1 "Vision" summarises v1 and leaves out the brief's long-term picture.
    - Fix: Add a §5.3 row: "Feedback on structure, clarity and framing beyond keywords (brief Vision)". It can note that the deferred «Vurder CV» and «Vurder søknad» are a first step towards it.

14. **Three of the lecturer's requests on the repository and traceability are not named.** Low.
    - Input: feedback, Del 1 criterion 7: "Mappen `.working/` med fargeutkast kan ryddes når designet er valgt". Neste steg 2: "Ta rangeringen med inn i PRD-en og epics". Criterion 1: "pass på at UX og PRD peker tilbake til de samme v1-punktene".
    - PRD: Week 50 says only "repository clean-up", while `ux-JobAssistant-2026-09-11/.working/` still holds the colour-theme drafts and old copies of the mockups. §5.1 doesn't say that the epics must follow its steps. OQ7 and addendum §4 update the UX content but don't ask the UX documents to cite S and FR IDs.
    - Fix: Name `.working/` in the week-50 clean-up, after the D16 colour fixes. Add to §5.1 that the epics follow these steps in order, so a cut removes whole epics from the bottom. Add "tag UX flows and screens with S and FR IDs" to addendum §4.

## Checked and fine

- **Scope S1–S7:** Each brief item is a PRD feature (§6.1–§6.7) labelled with its brief ID. DOC files are excluded (FR-1) and the job ad is paste-only (FR-4). The narrower readings of S3, S5 and S7 are logged (D17, D9, D12).
- **Build order and cut line:** §5.1 follows the brief's ranking and the lecturer's order (a)–(e). It keeps the rule that S1–S3 must be stable before anything else, with a checkpoint on 22 November. Cuts go from the bottom: S6 + S7, then S5, then S4. Merging S6 and S7 matches the lecturer's item (e), "innlogging og kryptert lagring", and is decided in the memlog (T3, T5). Test mode, the Fixtures and the README have their places in the plan, and the final week is protected.
- **Success criteria:** SC1–SC9 remain the acceptance criteria, mapped in §12. The SC2 score comes only from code and always gives the same result (FR-5 to FR-7, NFR-6). SC4's tolerance is set at ±5, tagged as an assumption. SC3, SC5 and SC6 have Integrity guards, and SM-3 targets zero failures. SC9 maps to NFR-1. The brief has no criterion for S6 or S7; the PRD adds automated checks for both (FR-19, FR-22).
- **Out of v1:** voice-learning, a native mobile app, more languages, job boards and auto-apply, interview preparation, LinkedIn import and making money from the app are all excluded (§5.3, §10). Phone-browser use stays in (NFR-3).
- **Honesty and transparency:** P1–P4 turn "honest", "shows its work" and "philosophy, not technology" into rules that can be checked. Real gaps are stated plainly (FR-13). The three pitfalls in the brief's addendum (generic text, keyword stuffing, invented qualifications) are covered by L3, R3, SM-C1 to SM-C3 and P1. The brief's "defend it in an interview" carries through as R2 and the fourth job to be done in §2.1.
- **Privacy paragraph:** FR-24 requires a notice in plain Norwegian before any text leaves the app, stating that the score is computed locally. The PRD adds encrypted storage (FR-22), minimal storage and no prompt logging (FR-23), removal of contact details before AI requests (FR-26), requirements for choosing the AI provider (§8.1), and fictional CVs only (FR-28, §8.1). All of this goes beyond the brief.
- **Language and users:** bokmål only, English terms treated as Keywords, and English and nynorsk out of scope. Students in any field are covered (FR-5, and a nursing Fixture in FR-28). The app is self-serve, with no institutional role.
- **Lecturer feedback, F1–F41 in the extract's numbering:**
  - Addressed: F2, F4–F6, F8–F12, F14–F23, F25, F26, F28, F29, F31–F35, F37, F39–F41.
  - Context only: F3, F7, F13 and F24.
  - Residual gaps:
    - F1, F27 (Vision note), F30, F36 and F38: gaps 4, 12, 13 and 14.
    - F5, F6, F15, F20 and F21 are handled, with smaller residual points in gaps 9, 1, 6, 3 and 7.
  - Dates are cited correctly: feedback 2026-10-06, language decision 2026-10-10. The PRD addendum (1.2) flags the brief addendum's unsourced 49 % and 62 % figures instead of repeating them as facts.
- **Not reported, because they are logged in §11 or decided in the PRD memlog:** D1–D17, the FR-5 keyword fallback, S6 + S7 built and cut together, the solo developer, v1 used only by the group and the Examiner, Letter guards that flag rather than block, the Daily cap of 30, and the Strong-match threshold of 70.
