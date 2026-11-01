# PRD Quality Review — JobAssistant

Reviewed 2026-10-31 for the Finalize Reviewer Gate. **Documents:** `prd.md` and `addendum.md` in `prd-JobAssistant-2026-10-31/`. **Rubric:** `.claude/skills/bmad-prd/assets/prd-validation-checklist.md`. **Checked against:** the brief (`brief.md`, `tilbakemelding-product-brief.md`), the three source extracts and `.memlog.md`.

Decisions in the memlog are treated as settled. Examples are declining the second-reader check, cutting S6 + S7 first, and approving the keyword fallback. The findings are about how the PRD expresses those decisions.

The review is calibrated for a graded solo course project. The PRD sits at the top of the planning chain, and a structure and prose polish pass comes next, so this review covers substance only.

**Findings:** 0 critical · 3 high · 9 medium · 10 low.

## Overall verdict

This is a strong, honest PRD with a real thesis: the problem is vocabulary, not ability, and the app shows its work and never invents. That thesis drives the principles, the cut order, the Integrity guards, the success metrics and their counter-metrics. Scope against the brief is unusually well documented, with 17 logged deviations, a cut order with stated consequences and a clean assumptions index, and most FRs have concrete, testable consequences.

The risks are in three places that architecture and the epics will reach first:
- As written, the Letter guard (FR-11) flags legitimate and honest text.
- The keyword fallback has no decision criterion, and the plan schedules the decision before the Fixtures that could inform it exist.
- The version of the app without accounts is never written down. The core-flow checkpoint, SM-1, the first cut and the Examiner's path all depend on it.

## Decision-readiness — adequate

The PRD states its decisions as decisions and says what was given up:
- S6 + S7 are cut first because "Gap analysis and Rewording suggestions matter more to what the app does than saving data" (§5.1).
- The tailored CV file is dropped because it is "where invented skills slip in most easily" (D1).
- Explanations move to code templates, at the cost of AI-written prose (D7).

The plan relies on dated decision points rather than optimism (§5.2). The fallback approval lists the requirements it changes (FR-5). The seven open questions (§13) are genuinely open and each has an owner. No `[NOTE FOR PM]` callouts remain, which fits a PRD whose owner settled the tensions in a coaching round.

It falls short in three places. One decision is made only implicitly (FR-11). One decision has no test (the fallback). And the decision points have no pass criteria.

### Findings
- **high** FR-11 flags legitimate and honest text in the Letter, and the rule behind it was never decided (§6.3 FR-11, Glossary "Unsupported claim", UJ-1, §9.2 L7).
  - FR-11 says "Every Missing keyword found in [the Letter] is an Unsupported claim". The warning reads «… men det står ikke i CV-en din. Fjern eller endre det …».
  - Rewording suggestions are allowed to use their own target Keyword; the Letter has no such exception.
  - At least three foreseeable cases get flagged:
    - (1) A Rewordable-gap Keyword used about the experience that supports it. This is the «tverrfaglig samarbeid» case that UJ-1 is built around.
    - (2) A job title that contains a Missing keyword, such as «React-utvikler» when «React» is missing. FR-9 and L4 require the Letter to name the job title.
    - (3) An honest mention of a gap, such as «Jeg har ikke jobbet med Kubernetes ennå, men …».
  - In each case the Student is told the word is not in the CV and should be removed. L7 ("Every … flagged by FR-11 is a real problem") will likely fail on the first live Fixture run.
  - Behind this is an unnamed trade-off. The Letter is written in parallel with Gap analysis, so it cannot use the product's own vocabulary translation.
  - *Fix:* Decide the rule and name the trade-off.
    - One consistent option:
      - The Letter prompt avoids Missing keywords.
      - The scan skips the job title and employer.
      - The warning asks the Student to check the word instead of stating that the CV doesn't support it. This wording is still open anyway (assumption 6).
      - Rewordable phrasing reaches the Letter only when the Student copies a suggestion (P3).
    - The alternative is to exempt Rewordable-gap Keywords whose citation passed FR-15. Then the scan has to wait for Gap analysis, and it must still work if S4 is cut.
- **high** The keyword fallback has no trigger criterion, and the decision is scheduled before the evidence exists (FR-5, §13 Q2, §5.2).
  - The fallback applies "if the architecture shows that code alone can't extract Keywords well enough". Q2 asks about "good enough quality". Neither defines "enough".
  - This one decision rewrites FR-8, FR-25, FR-27, NFR-4, NFR-6, NFR-8, P6 and UJ-3.
  - The plan gives the decision to architecture in week 45, but the Fixtures and Answer keys that could show extraction quality are built in week 46, together with the Keyword engine.
  - *Fix:* Define "well enough" against the Answer keys. For example, code-only extraction passes SM-2 on every Fixture. Optionally, add one held-out Fixture written after the vocabulary is tuned, to catch overfitting.
  - Set the decision for the end of week 46, when the engine first runs against the Fixtures, and have the architecture leave room for an AI-proposed list. FR-5 already says to record the outcome in §11.
- **medium** The checkpoint and both decision points have no pass criteria (§5.1, §5.2).
  - The PRD says "finished and stable before work starts on S4–S7", "if S1–S3 aren't stable" (22 Nov) and "if S4 and S5 aren't stable" (29 Nov).
  - These are the PRD's main scope controls, and "stable" is the only test.
  - *Fix:* Define each checkpoint using measures the PRD already has.
    - 22 Nov:
      - The §9.1 tests for FR-1–FR-12 and FR-25–FR-28 pass.
      - SM-1 passes for the Example pair in Test mode and for at least one live Fixture.
      - SM-2 passes.
      - The wrong-input tour (§9.3) causes no crash.
    - 29 Nov:
      - The guard tests for FR-13–FR-17 pass.
      - One live Fixture run has no G2 or R1 failures.

## Substance over theater — strong

Very little is filler. There are two personas, and both drive decisions. Violet carries the core journeys. Kari, the Examiner, is the reason for Test mode, the seeded user, NFR-9 and the Example pair.

The Vision could not be swapped into another PRD in this category ("JobAssistant differs in its stance, not its technology"). The differentiation claim is modest and backed by the addendum's research. The NFRs have product-specific bounds: 360 px, 4.5:1, 2 s / 60 s / 90 s, 200 NOK, 30 requests a day and 20 minutes. Each principle names the requirements that enforce it (§4).

The only redundancy is that SM-6 to SM-8 restate NFR-8, NFR-4 and NFR-2 one to one, which does no harm.

### Findings
- **low** The Profile stores a field with no stated purpose (Glossary "Profile", FR-20).
  - The Profile holds "an optional phone number", but no requirement uses it:
    - The sign-off uses the name (FR-9).
    - FR-26 removes phone numbers before AI requests.
    - FR-22 does not encrypt it.
  - Storing it goes against P6 ("store little").
  - *Fix:* Remove the field, or state its use (for example, a Letter header added locally) and add it to FR-22.

## Strategic coherence — strong

The thesis is stated outright (§1): "The problem is vocabulary, not ability", and the app "shows its work and never invents". The features follow from it:
- The Keyword engine and the Evidence show the work.
- Gap analysis and Rewording suggestions translate the vocabulary.
- The Integrity guards prevent invention.

The MVP is aimed at solving one problem. The cut order protects the vocabulary translation (S4, S5) ahead of saved data (S6, S7). That was the owner's own decision, and the PRD gives the reason.

The metrics test the thesis, not activity:
- SM-2 checks the shown work against the Answer keys.
- SM-3 checks that nothing is invented.
- SM-5 stops the app from staying honest by saying nothing ("an app that never suggests anything would pass SM-3").
- The counter-metrics SM-C1 and SM-C2 name exactly the shortcuts the thesis rules out.

The one place the thesis breaks down is the Letter. It is written in parallel with Gap analysis, and under FR-11 it cannot use the vocabulary translation at all (see the first Decision-readiness finding).

SM-C3 claims to "counterbalance SM-1", but nothing in SM-1 pushes toward keyword density. It works as a guardrail for prompt tuning rather than a counterweight, which is fine as it stands.

No separate findings.

## Done-ness clarity — adequate

Most FRs are specific enough to write tests from:
- file types and sizes (FR-1)
- length ranges (FR-2, FR-4)
- the minimum of three Keywords (FR-4)
- the exact formula and threshold (FR-7)
- the "not found" response (FR-19)
- "opening the database file directly shows none of these fields" (FR-22)
- planted Cached responses for every guard (FR-11, FR-17)

The FR-16 example, «sårvurdering» versus «Forsket på sårvurdering», turns a judgement rule into a test case.

The gaps are in three areas: what the guards do in edge cases, a requirement that has no scope before accounts exist, and how the Verify lines map onto §9.

### Findings
- **medium** Under the fallback, nothing checks that AI-proposed Keywords actually appear in the Job ad (FR-5, Glossary "Keyword", P2).
  - The Glossary defines a Keyword as "named in the Job ad".
  - An AI-proposed Keyword that the ad never names would become a Missing keyword and then a Gap. The Reflection Note would then tell the Student that the ad asks for something it doesn't.
  - That is the same kind of invention P1 guards against everywhere else.
  - *Fix:* Add to FR-5: the Keyword engine must find each AI-proposed Keyword in the Job ad text, and the rest are dropped. Verify: Auto, with a planted Cached response.
- **medium** FR-15 does not say what text a downgraded Gap shows (FR-15, FR-14).
  - When a citation check fails, "the Gap is shown as a Real gap instead".
  - But the AI wrote the explanation and suggestion for a Rewordable gap, in the order that ends "… which of the Student's own work covers it".
  - As written, a Gap labelled Real could still say «Semesterprosjektet ditt dekker trolig dette» and still carry a suggestion. FR-17, by contrast, spells out what remains after a suggestion is discarded.
  - *Fix:* On downgrade, drop the AI explanation and suggestion, show a fixed Real-gap template, and log the downgrade without content.
- **medium** A "CV entry" has no boundary that code can find (Glossary "CV entry" and "Evidence citation", FR-16, FR-17).
  - The CV text is unstructured plain text.
  - Yet FR-17 discards a suggestion "if the cited CV entry doesn't contain that word", and FR-16 shows "the cited CV entry".
  - The Upgrade-word check gives different answers depending on whether the entry is the citation itself, its line or its paragraph.
  - *Fix:* Define the entry in terms code can apply, for example "the block of lines in the CV text, bounded by blank lines, that contains the Evidence citation". Alternatively, check against the citation itself.
- **medium** The Daily cap has no scope before accounts exist, or if S6 + S7 are cut (Glossary "Daily cap", FR-25, §5.1).
  - FR-25 is built with S3 and counts requests "per Student per day".
  - Before step 6 there is no Student, only a browser session, and a count per session resets whenever a new session starts.
  - FR-24 covers the pre-S6 case ("once per browser session before S6"); FR-25 does not.
  - The cap is also the only cost control behind NFR-8. A cap per Student does not keep spending under 200 NOK when several people use the app.
  - *Fix:* State the cap's scope before S6 and under the first cut, for example one cap per installation per day, resetting at local midnight. Add a monthly spending limit with the AI provider as a backstop for NFR-8; this needs only configuration.
- **medium** The Verify lines and §9 do not line up (§0 Conventions, all FRs, §9).
  - §0 says Manual means "a manual check, see §9". But these Manual items have no §9 entry:
    - FR-14
    - FR-24
    - NFR-1 (interface text, `lang="nb"`, number and date formats)
    - NFR-4 (timed runs)
    - NFR-7 (secret scan)
    - NFR-10
  - These "Auto" items are missing from §9.1, the list run by one command:
    - FR-9's label check
    - the structure checks in FR-13 and FR-16
    - FR-12, FR-18, FR-20 and FR-21
    - NFR-5 and NFR-7
  - NFR-2's axe scan is listed in §9.3 as a manual check.
  - Two "Auto" claims can only be checked on live runs, because the automated suite sees only Cached responses:
    - FR-15's "None may become one"
    - the Gap half of the FR-28 Answer keys
  - *Fix:*
    - Make §9.1 the complete list of automated tests, and give every Manual line a §9 entry. Alternatively, state that the Verify lines are authoritative and that §9 lists only highlights.
    - Mark FR-15's second bullet and the Gap part of FR-28 as Manual (live runs, G2 and G4).
    - Consider a small script that compares the live Fixture output with the Answer keys for G2 and G4. It is cheap, repeatable and good QA evidence for the examiner (criterion 3).
- **low** "Usually" is not a bound (NFR-4, SM-7).
  - NFR-4 says "the AI results usually appear within 60 seconds", but SM-7 says "the full result within 60 seconds".
  - *Fix:* Use one measurable form in both places, for example "in at least 4 of 5 timed runs per Fixture".
- **low** The three Tones are named but not described (FR-10, §9.2 L6).
  - «Formell», «Personlig» and «Direkte» have no descriptions.
  - So L6 ("The tone matches the chosen Tone") has nothing to check against, and whoever writes the prompt has to invent the meaning.
  - *Fix:* Add one line describing each Tone.
- **low** Several Test-mode edge cases are open (FR-27, FR-10, FR-12, FR-22, FR-24). The PRD doesn't say:
  - which Letter the Example pair returns for each Tone, or when the Student clicks «Lag nytt utkast»;
  - whether the FR-24 notice appears even though no text leaves the app;
  - how the Examiner gets the encryption key that FR-22 requires, when NFR-9 rules out any setup beyond the README;
  - how "other inputs" are told apart from the Example pair (exact text, or normalised text).
  - *Fix:* Add one bullet for each to FR-27, or hand them to architecture explicitly.
- **low** Partial and regenerated results have no storage rule (FR-21, FR-12).
  - FR-21 says "Each completed Application is saved", but "completed" is undefined when:
    - the Letter times out (NFR-4),
    - the cap is reached partway through an Application,
    - Gap analysis fails.
  - It is also unclear which Letter is saved after «Lag nytt utkast».
  - *Fix:* For example, save as soon as the score exists, add the AI sections when they arrive, and keep the latest Letter.
- **low** Two metric definitions each need one more line (SM-1, SM-4).
  - SM-1 requires UJ-1 to complete "without manual intervention". But UJ-1 includes a manual step by design (FR-3, where the Student fixes a scrambled line), and the two-column Fixture needs that step.
  - SM-4 needs "someone who doesn't know the project", whom a solo developer has to find.
  - *Fix:* Define "manual intervention" as any action outside the app's interface. Name the SM-4 tester: a classmate, or Helene on a fresh virtual machine following only the README, with that limitation stated.

## Scope honesty — strong

Omissions are explicit and explained:
- the Non-goals (§10)
- the table of deferred items (§5.3)
- the cut order, with what each cut means (§5.1)
- a deviation log covering both the brief and the UX (§11, D1–D17)

The `[ASSUMPTION]` tags are limited to values the owner hasn't confirmed, and they match the index exactly (see Mechanical notes). There are 18 indexed assumptions and 7 open questions. That is a reasonable number for a course PRD, since most are wordings or configuration values.

A few of them need settling before the next steps, though, and a few claims say more than the requirements enforce.

### Findings
- **medium** Some assumptions shape the architecture or the Fixtures and should be settled first (§14, §10, addendum §5).
  - #17 (local run only, no hosted deployment) decides the shape of the stack: a local file database, no hosting, and how secrets are handled. Its question for the lecturer (addendum §5, question 4) is missing from §13.
  - #13 (2 s / 60 s / 90 s) decides whether AI calls run inside the request or in the background, with the page polling for progress.
  - #10 (discard the uploaded file) and #14 (Reflection Note on screen only) decide whether file storage and a second document generator are needed. Their defaults are the simplest options.
  - #7 (when a formal requirement can be Rewordable) and #12 (the ±5 tolerance) must be settled before the Answer keys are written in week 46.
  - The other assumptions don't block anything.
  - *Fix:* Confirm #17 and #13 before architecture starts, or add #17's question to §13 with "default: local only". Settle #7 and #12 before the Fixtures are written.
- **medium** The PRD doesn't say how SC4 and SC5 are judged, and SM-5 quietly lowers the bar for SC4 (§12, SM-5, FR-11; brief SC4 and SC5).
  - §12 says "SC1–SC9 remain the acceptance criteria".
  - SC4 requires the Gap analysis to "match the expected keywords and suggestions". The only threshold in the PRD is SM-5's "at least 70 %".
  - SC5 requires that the Letter "contains no qualification or keyword that isn't traceable". FR-11 flags such words instead of removing them, so SC5 can only hold on the Fixture runs (SM-3, L2).
  - The examiner judges scope against the brief, so this interpretation should be visible.
  - *Fix:* In §12, say how each criterion is judged, and log the interpretation as a new D-entry.
    - SC4: the score is within ±5 and the keyword lists match FR-28; no must-never-suggest item is Rewordable (G2); and at least 70 % of the expected Rewordable gaps are found (SM-5).
    - SC5: zero L2 failures on live Fixture runs, with FR-11 as the safety net in real use.
- **low** A few claims overstate what the requirements enforce (§6.7, P1, P4, FR-9).
  - §6.7 says "Everything personal that JobAssistant stores is encrypted", but FR-22's list leaves out the name, phone number, job title, employer and keyword lists.
  - P1 says "Integrity guards enforce this" and FR-9 says "FR-11 enforces this". Yet addendum §2.4 admits that invented employers and similar claims are left to the checklist.
  - P4 says "AI output is labelled as a draft", but only the Letter is labelled. Nothing marks the Gaps or suggestions as written by AI.
  - The product's principles include being honest about the tool itself, so these are worth correcting.
  - *Fix:* Write "partly enforces" or "flags". List what stays unencrypted. Either label the AI-written parts of the Reflection Note or narrow P4.
- **low** A Non-goal contradicts FR-3 (§10, FR-3).
  - §10 says "The Letter and the CV can't be edited in the app", yet FR-3 has the Student edit the CV text in the app.
  - *Fix:* "No CV document is produced or edited; only the CV text used for analysis can be corrected (FR-3)."
- **low** The deviation log and the Non-goals could each make one more thing explicit (§11, §5.3).
  - Cutting S6 + S7 together departs from the brief's strict order of cutting from the bottom (S7 first, then S6). §5.1 explains why, but §11, the section the examiner reads, doesn't.
  - Language detection is deferred, but the PRD doesn't say what happens when someone pastes an English ad. Kari, the Examiner in UJ-3, may well paste one.
  - *Fix:* Add a D-entry for the combined cut. Add one line saying that input not in bokmål isn't supported and the results are undefined.

## Downstream usability — adequate

The architecture and epics steps will be able to extract most of what they need cleanly:
- Glossary terms are capitalised and used consistently.
- The IDs run without gaps.
- Each FR section names its brief item and the UJ it realises.
- Every UJ has a named protagonist (Violet, Kari).
- The addendum gives the architecture concrete starting points without making its decisions for it.

Two structural problems would force whoever writes the epics to invent behaviour:
- The version of the app without accounts isn't written down.
- The fallback's effects are stated in only one place.

### Findings
- **high** The app has to work without accounts, but that version is never specified (§5.1 checkpoint and cut order, UJ-1, UJ-3, SM-1, FR-27, FR-29).
  - The checkpoint is "UJ-1 works end to end without accounts". But UJ-1 as written registers (step 1), uploads the CV on Profil (step 2) and saves to Historikk (resolution).
  - The first cut makes the app session-only for good. Yet the cut lists consequences only for UJ-2, even though UJ-3 step 2 ("logs in with the test user") and FR-29 also disappear with it.
  - Scattered notes show the intent, but they don't add up to a journey:
    - FR-3: "on the Søknad page before then"
    - FR-9: the placeholder sign-off
    - FR-24: "once per browser session before S6"
  - Two things are missing in every phase:
    - How the Examiner "opens the Example pair". FR-29 seeds only the CV, only from step 6, and nothing loads the Job ad.
    - Whether Søknad requires login once S6 exists.
  - This is the path the examiner grades most directly (SC8, SM-4, NFR-9).
  - *Fix:*
    - Add a short no-accounts variant under UJ-1, or a separate UJ-1a. In it, the CV is uploaded and confirmed on Søknad, nothing reaches Historikk, the sign-off is a placeholder, and the notice appears once per session.
    - Note what changes in UJ-3 under the first cut.
    - Add an FR-27 bullet for opening the Example pair, for example one control on Søknad that fills in both texts, with or without login.
    - State whether Søknad requires login after S6.
- **medium** The fallback's effects are stated only in FR-5, and two are missing (FR-5, FR-8, FR-24, FR-25, FR-27, NFR-4, NFR-6, NFR-8, P6, UJ-3, §5.1).
  - Read on their own, three FRs still state the no-fallback behaviour:
    - FR-27: "The Match score works for any input"
    - FR-25: "the Match score still works"
    - FR-8: "without waiting for any AI output"
  - Two statements are missing from FR-5's list of changes, although under the fallback the Job ad leaves the app before scoring:
    - FR-24's notice ("that the Match score is calculated locally")
    - the brief's promise that the score "does not require sending data out"
  - "The list is saved and reused" has nowhere to live while the app is session-only, both before step 6 and permanently after the first cut. So "the same Job ad always gets the same list" can't hold across sessions in those phases.
  - *Fix:*
    - Add a one-line pointer, "changes under the FR-5 fallback", to each affected item.
    - Add FR-24 and the brief's privacy line to the list.
    - Allow a server-side cache of Keyword lists keyed by a hash of the ad text. That cache is not data about a Student, so it can exist before S7.
- **low** NFR-9 isn't applied to the language-processing tools the addendum suggests (NFR-9, addendum §1.3, §2.1).
  - The addendum lists these for evaluation without noting NFR-9's limit of a clean-machine setup within 20 minutes:
    - NB-BERT and NorBERT 3
    - spaCy models
    - Lucene, which needs a Java runtime
    - the Oslo-Bergen Tagger
  - 20 minutes is already the top of the examiner's 15–20-minute budget (UJ-3).
  - *Fix:* Add the NFR-9 caveat to addendum §2.1. Consider a 15-minute target in NFR-9 and SM-4 for margin.

## Shape fit — strong

The shape fits the product: a student-facing tool with meaningful UX, at the top of a planning chain and graded on traceability. UJs with named protagonists earn their place. The Examiner journey (UJ-3) is a smart, load-bearing addition that makes the README and Test mode into full requirements.

The formal structure is heavy for a six-week solo build: 29 FRs, 10 NFRs, 17 D-entries and 18 indexed assumptions. But each part maps to something the examiner guide asks for:
- stable IDs (criterion 1)
- a deviation log (criterion 2)
- verification for each requirement (criterion 3)
- runnability (criterion 6)

Nothing reads as formality for its own sake. Rigour is matched to course stakes, for example privacy requirements for choosing an AI provider without a formal data-protection assessment. The addendum keeps research, notes for the architecture and rejected alternatives out of the requirements, which is the right split.

No findings.

## Mechanical notes

- **Assumptions index: clean.** All 25 inline `[ASSUMPTION]` tags map to the 18 index rows, and every row appears inline. For triage, see the first Scope honesty finding. Only #17 and #13 shape the architecture, #7 and #12 must be settled before the Answer keys, and the rest are wordings or configuration values.
- **ID continuity: clean.** These run without gaps or duplicates, and every cross-reference resolves: FR-1–29, NFR-1–10, UJ-1–3, SM-1–8, SM-C1–C3, D1–D17, P1–P6, open questions 1–7, L1–L7, G1–G4 and R1–R3.
- **Brief IDs.** §0 says the PRD cites the brief's "S1–S7 and SC1–SC9 by ID", but the brief uses unlabelled numbered lists; the labels come from `extract-brief.md`. Add one line mapping them (S*n* = v1 scope item *n*; SC*n* = functional success criterion *n*) so the examiner can follow.
- **Undefined labels.** "Decision A1a / A2a / A3a / A4a" (§5.3, §10, §11) are labels from the memlog that the PRD never defines. Define them or drop them.
- **Missing link.** The lecturer feedback in §0 is not linked. The file is `../../briefs/brief-JobAssistant-2026-09-11/tilbakemelding-product-brief.md`.
- **Glossary drift.**
  - The Glossary defines "Test mode" as running "with no AI key", but FR-27 also lets configuration switch it on when a key exists.
  - The Glossary's "Answer key" leaves out the "terms that must not match" that FR-28 includes.
  - "Group" and "group members" (§2.2, §5.3, §8.1, D14, Q4) appear alongside "one developer" (§0, §8.3).
  - The page names (Hjem, Søknad, Profil, Historikk, Konto) are not in the Glossary, and «Søknad» (the page) is easy to confuse with Application (*søknad*).
- **Screen with no requirement.** Konto appears only in D14 and addendum §4 item 7. It has no FR and is missing from NFR-2's list of screens. Either add a line for it or say it is out of scope.
- **Example pair and Fixtures.** The PRD never says whether the Example pair is one of the three or more Fixtures. That decides how many sets of Cached responses must be recorded.
- **Rounding.** FR-7 doesn't say whether the Verdict uses the rounded score. A score of 69.5 % shows as «70 %»; is that Needs work?
- **Small inconsistencies.**
  - The SC7 mapping "UJ-1 (FR-1 to FR-12)" leaves out FR-24, although UJ-1 step 3 shows the notice.
  - P6's "At most two AI requests per Application" leaves out the exceptions for «Lag nytt utkast» and the fallback that NFR-8 and FR-5 state.
  - NFR-2 says the screens "meet WCAG 2.2 AA", but its Verify line (axe scan plus a keyboard walkthrough) checks only the six listed items. Phrase it as "meet these WCAG 2.2 AA criteria".
  - L5's "About one page" could cite FR-9's 250–400 words.
  - Addendum §5 questions 4 (local run or deployed) and 6 (is mocking acceptable) are not repeated in PRD §13.
