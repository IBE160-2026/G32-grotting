# Reconciliation: IBE160 examiner guide

- **Date:** 2026-10-31
- **Input reconciled:** `C:\IBE160\Sensorveiledning IBE160.pdf` ("Sensorveiledning – Del 1", 7 pages). The whole PDF was read, and every gap below was checked against its text. Page numbers are the PDF's; "§4 C1" means criterion 1 in the guide's section 4.
- **Also read:** [extract-sensorveiledning.md](extract-sensorveiledning.md) (it matches the PDF; no misquotes found), [prd.md](prd.md), [addendum.md](addendum.md) and [.memlog.md](.memlog.md). For context only: the brief's success criteria and scope, `README.md`, `.gitignore`, the `sesjonslogg` skill and one session log, and the read-only `git log` and `git branch -a`.
- **PRD frontmatter `updated`:** 2026-10-31 (`status: draft`). The memlog's `updated` is 2026-10-31T22:47.
- Facts about the repository, as opposed to the documents, are tagged [observed].

## Verdict

The PRD serves the guide well on the product side. It has stable IDs with a Verify line on every requirement, an explicit scope with every deviation from the brief justified, testable AI output, and the correct criterion weights. It under-serves the process side, where C1 alone carries 30 %:
- no requirement to save prompts or to record examples of steering the AI;
- no plan to keep the planning set consistent with the delivered app;
- a clean-machine run and a README whose details (secrets, prerequisites, time margin, links) are left open.

## Gaps

### 1. No requirement to save prompts or record examples of steering the AI (C1) (high)
- **Guide:**
  - C1 looks for "lagrede prompts og KI-økter, og eksempler på at gruppen har presisert krav, avvist, rettet eller forbedret KI-forslag" (p. 2, §4 C1, "Sporbar KI-bruk").
  - A–B requires "Prompts og beslutninger er dokumentert og koblet til konkrete endringer" and "flere tydelige eksempler på at gruppen har vurdert, korrigert og styrt KI kritisk". D–E includes "Få prompts er lagret" (p. 3).
  - Red flag: "Dokumentasjonen av KI-bruk er generell og kan ikke knyttes til konkrete endringer i repoet" (p. 7, §5).
  - The guide's purpose section: the course is about steering AI-assisted development, so process traces count "i like stor grad" as the product (p. 1, §1).
- **PRD:**
  - NFR-10 only requires session logs to cite story or FR IDs, and §9.4 covers bugs in AI-generated code. Nothing requires saving prompts or sessions, or recording what the AI proposed and how it was clarified, rejected or corrected.
  - The PRD doesn't point the examiner to its own `.memlog.md`, which already holds good examples:
    - Helene cut the competitor comparison as "AI voice";
    - she resolved the cut-order contradiction in §5.1;
    - she replaced the IT-only examples with her nursing case.
  - The session-log template (Oppgave, Plan, Resultat, Åpne punkter) has no slot for these cases either [observed].
- **Fix:** Add a process-evidence bullet to NFR-10. Each session log records:
  - the prompt or task;
  - what the AI proposed;
  - what was clarified, rejected or corrected, and why;
  - the resulting commits and IDs.

  Keep one index of these cases, folding in §9.4's bug log, and link it and the planning `.memlog.md` files from the README.

### 2. No plan to keep the planning set current and consistent with the delivered app (C1, red flag) (high)
- **Guide:**
  - Planning documents must be ones "som faktisk er brukt og oppdatert, ikke bare generert én gang", and "avvik fra planen er forklart" (p. 2, §4 C1).
  - The examiner must "Kontroller at dokumentene henger sammen med koden" (p. 2, §3 step 6).
  - D–E: "Planleggingsdokumenter fremstår som generert én gang og ikke brukt videre" (p. 3).
  - Red flag: "Planleggingsdokumentene beskriver en annen app enn den som er levert, eller er tydelig generert i etterkant" (p. 6, §5).
  - C5 A–B: "Arkitekturen er tydelig og samsvarer med dokumentasjonen" (p. 5).
- **PRD:**
  - NFR-10 updates the PRD only "whenever scope changes".
  - Week 50 in §5.2 has no step to reconcile the documents with the delivered app.
  - OQ7 (update the UX to match §11) has no date, yet per D1–D4 the UX still describes a tailored CV file, «Vurder CV»/«Vurder søknad», PDF-only output and a downloadable Reflection Note.
  - The PRD is a draft with 18 open assumptions and 7 open questions.
  - The PRD folder is not committed yet, so git history does not show the PRD being used [observed].
- **Fix:**
  - In §5.2, schedule the UX update (addendum §4) for week 45.
  - Add a week-50 step that reconciles the PRD, UX, architecture and epics with the delivered app: resolve or close every assumption and open question, log any cut or use of the FR-5 fallback in §11, and set the status to final.
  - Widen NFR-10's trigger to any change in requirements, assumptions or decisions, and commit each update with a message naming the IDs it changes.

### 3. The clean-machine run is underspecified (C6; limits C2) (medium)
- **Guide:**
  - The examiner installs and starts the app "kun etter oppskriften i README.md" on "en ren maskin eller i et rent miljø", with an effort guideline of "veiledende inntil 15–20 minutter".
  - Gaps in the README "regnes som mangler ved README, ikke som sensors problem".
  - An app that won't run "trekker tydelig ned på kriterium 6 og begrenser hvor høyt kriterium 2 kan vurderes" (p. 2, §3).
  - C6 A–B: "Sensor får appen til å kjøre ved å følge README uten avvik" (p. 6).
- **PRD:**
  - NFR-9 and SM-4 target "within 20 minutes", the top of the guide's range, with no margin. This works against the guide.
  - FR-22 takes the encryption key from `.env`, NFR-7 forbids real values in `.env.example`, and nothing says how the examiner gets a key or session secret without inventing one.
  - Prerequisites have no limit, although addendum §1.3 lists NB-BERT and NorBERT 3, which are transformer models of several hundred MB that need an ML runtime.
  - Neither the dry-run environment nor the supported operating systems are defined, and development happens on Windows [observed].
- **Fix:**
  - Rewrite NFR-9 to target 15 minutes or less, including prerequisites. Do the dry run on a fresh VM, in a sandbox or on someone else's machine, with commands that work on Windows and on macOS or Linux.
  - Require that setup creates the local secrets itself, or with one documented command.
  - Limit prerequisites to one runtime and its package manager: no Docker, no database server and no large model download.

### 4. Manual checks have no test plan or recorded results outside §9.2 (C3) (medium)
- **Guide:**
  - C3 looks for "Dokumenterte manuelle tester eller testplaner der automatiske tester ikke er hensiktsmessige" (p. 4, §4 C3).
  - A–B: "Testene er relevante, kjører uten feil ... Kvalitetssikringen er systematisk og dokumentert" (p. 4).
  - Red flag: "Testene feiler" (p. 7).
- **PRD:**
  - 21 FR and NFR Verify lines include a manual check, but only §9.2 says where results go (`docs/qa/`).
  - These checks have a procedure but nowhere to record the result: §9.3, the two-column check in FR-3, the dry run (FR-29, NFR-9), the timed runs in NFR-4, the secret scan in NFR-7 and the cost check in NFR-8.
  - These have no procedure in §9 at all: FR-24, NFR-1 (beyond the Letter check L1), NFR-10, and the manual parts of FR-8, FR-12, FR-21 and FR-23.
  - NFR-9 says that one command runs the tests, but not that they pass.
- **Fix:** Make §9 the single test plan, with one row per manual Verify line that gives the procedure, when it runs and a dated pass/fail record in `docs/qa/`. Require the full automated suite to pass on the delivery commit during the dry run.

### 5. The README content beyond the run steps is not required (C6; also helps C1) (medium)
- **Guide:**
  - C6 looks for "Kort beskrivelse av hva appen gjør og hvem den er for, gjerne med skjermbilde", "hvilke miljøvariabler som trengs" and "Oversikt over mappestrukturen og lenker til planleggings- og prosessdokumentasjonen".
  - The README must be "tilpasset prosjektet og oppdatert" (p. 5, §4 C6).
  - The examiner tests "kjerneflytene som proposal og README beskriver" (p. 2, §3 step 3).
- **PRD:**
  - The README duties are set only in NFR-9 (versions, commands, test command), FR-29 (test user) and FR-23 (data deletion).
  - Nothing requires:
    - the description and screenshot;
    - the list of environment variables;
    - the folder overview;
    - the core flows named as in UJ-1 and UJ-3;
    - links to the planning and process documents.
  - Today's README is a 10-line placeholder [observed].
- **Fix:** Add a README bullet to NFR-9 that lists the C6 contents and links:
  - brief.md, marked as the approved proposal;
  - the PRD with §11;
  - UX, architecture and epics;
  - `docs/qa/`;
  - the session and decision logs.

  Check the README during the week-50 dry run.

### 6. The live AI path can be verified only through one pre-recorded pair (C2) (medium)
- **Guide:**
  - C2 looks for "At kjerneflytene fra proposal og README fungerer fra start til slutt", and A–B is "Kjernefunksjonaliteten er komplett og stabil" (p. 3, §4 C2).
  - The examiner should "Prøv også feil input og uventet bruk" (p. 2, §3 step 3).
  - Whatever the examiner cannot run is judged from "kode, tester, skjermbilder og video i repoet" (p. 2).
- **PRD:**
  - FR-27 runs the Letter, Gaps and Rewording suggestions only for the Example pair. For any other input, the AI sections say they are not available.
  - The Glossary entry for Cached response sets no rule on where a response comes from, and addendum §2.5 also calls for deliberately bad, hand-made Cached responses.
  - SM-1 targets live end-to-end runs on every Fixture, but nothing keeps their output as evidence. OQ5 is open.
  - Brief SC8 promises exactly this Test mode, so the approach itself is in the proposal. What is missing is evidence that the live flow in SC7 works.
- **Fix:**
  - In FR-27 and §9.4, require that the Example pair's Cached responses come from a live run of the final prompts, stored with the provider, model, prompt version and date.
  - Commit the live §9.2 Fixture outputs to `docs/qa/`, plus screenshots or a short recording of one live run.
  - Whatever the answer to OQ5, document an optional live-key mode in the README.

### 7. Under the FR-5 fallback, Test mode cannot score a new Job ad (C2; works against the guide) (medium)
- **Guide:**
  - The examiner is told: "Prøv også feil input og uventet bruk" (p. 2, §3 step 3).
  - C2 checks "Stabilitet: at appen tåler vanlig bruk, feil input og gjentatte handlinger uten å krasje" (p. 3, §4 C2).
- **PRD:**
  - Under the approved fallback in FR-5, "in Test mode, or once the Daily cap is reached, only Job ads with a saved or cached Keyword list can be scored".
  - An examiner without a key could then score nothing but the Example pair, and the edge case in UJ-3 ("The Match score still works because it is calculated locally") would no longer hold.
  - The fallback itself is an intentional decision (memlog, Coaching T5a). This gap concerns only its effect in Test mode.
- **Fix:** If the architecture adopts the fallback, keep the code-only extractor as a labelled, lower-quality path in Test mode and after the Daily cap, so any Job ad still gets a score. At minimum, cache Keyword lists for all Fixtures, and record the trade-off in §11 together with the fallback.

### 8. Workflow and code-review traces are left implicit (C1, C3) (low)
- **Guide:**
  - C1 looks for "bruk av branches, pull requests, issues eller tilsvarende for å organisere arbeidet" (p. 2, §4 C1).
  - C3 looks for "Spor av kodegjennomgang, for eksempel kommentarer i pull requests" (p. 4, §4 C3).
  - The examiner reviews "branches, pull requests og issues" (p. 2, §3 step 5).
- **PRD:**
  - NFR-10 mentions pull requests only as places that cite IDs. It sets no rule for branches, PRs, review notes or issues.
  - All 14 commits so far are on `main`, and no other branch exists [observed].
- **Fix:** Add one bullet to NFR-10, or decide this in the epics or project context before coding starts: each story is built on a branch and merged through a PR that cites its IDs and keeps the review findings, and defects become issues.

### 9. No maintainability requirement (C5, red flag) (low)
- **Guide:**
  - C5 looks for "Konsekvent stil, gjerne støttet av linter eller formatterer", "Lite duplisering, død kode og utkommenterte rester fra tidligere KI-forsøk", and a folder and module structure "som samsvarer med arkitekturen som er beskrevet" (p. 5, §4 C5).
  - Red flag: "Store mengder død kode, dupliserte filer eller rester fra forkastede KI-forsøk" (p. 7).
- **PRD:** There is no maintainability NFR; week 50 in §5.2 says only "repository clean-up".
- **Fix:** Add a short NFR, checked in week 50:
  - the linter and formatter pass on the delivery commit;
  - the folder structure matches the architecture document;
  - no dead or commented-out code remains.

### 10. The explicit list in NFR-2 leaves out text alternatives (C4) (low)
- **Guide:** C4 names "lesbar kontrast, tastaturnavigasjon, alternativtekst og fornuftige skjemaetiketter" (p. 4, §4 C4).
- **PRD:** NFR-2 names WCAG 2.2 AA, which includes text alternatives, but its explicit list, which drives the checks, does not.
- **Fix:** Add "text alternatives for icons, images and the score badge" to the list in NFR-2.

### 11. §0 and §8.4 understate what Part 1 grades, and shorten two criterion names (statements about the guide) (low)
- **Guide:**
  - "Del 1 vurderer applikasjonen og repoet som helhet", and the process traces count "i like stor grad" as the product (p. 1, §1).
  - "Kriterium 1, 6 og 7 handler om prosess og etterprøvbarhet og utgjør til sammen 45 %" (p. 1, §2).
  - The criteria are named "Design og brukeropplevelse" and "Kodekvalitet og arkitektur".
  - The examiner reads the "godkjente proposal og eventuell product brief" as two documents (p. 2, §3 step 1).
- **PRD:**
  - §8.4 says "The app is graded under Part 1", and §0 says the examiner "grades the app against the plan".
  - §8.4 shortens C4 to "Design" and C5 to "Code and architecture".
  - §11 says the examiner "judges scope against the brief", where the guide says proposal. This rests on the team's decision that the brief is the approved proposal, which the guide neither confirms nor contradicts.
  - The weights themselves are all correct.
- **Fix:** Reword §8.4 to "the app, the repository and its history are graded under Part 1 (70 % of the grade)", use the guide's criterion names, and note that C1, C6 and C7 make up 45 % and concern process and verifiability. Say in the README, as §0 already does, that brief.md is the approved proposal.

## Checked and fine

- **Statements about the guide:**
  - The weights in §8.4 (30/20/15/10/10/10/5) match the guide (p. 1 and p. 7).
  - The "15–20 minutes" in UJ-3 matches "veiledende inntil 15–20 minutter" (p. 2).
  - §9.4 correctly attributes the bug log to criterion 3.
  - "Without an API key" (§2.1) is the team's inference, since the guide says nothing about AI features inside the app. It is rightly kept open as OQ5.
- **C1 traceability:** These answer "kan spores tilbake til krav og stories" (p. 2):
  - stable FR, NFR, UJ and SM IDs;
  - a Verify line on every FR and NFR;
  - the citation rule in NFR-10 for stories, commits, PRs, logs and tests;
  - the SC-to-FR map in §12.
- **C1 decisions and steady history:**
  - §11 (D1–D17 with reasons), addendum §3 (rejected alternatives) and the memlog document choices "med begrunnelse". Technology choices are handed to the architecture, with a duty to justify them.
  - The weekly milestones in §5.2 and the small work pieces in §8.3 support "jevn utvikling over tid" (p. 2). The brief and UX already show several rounds of commits [observed].
  - Working solo is fine: an uneven commit split is explicitly not grounds for a deduction.
- **C2 scope against the proposal:**
  - The build order, core-flow checkpoint, cut order with its consequences, deferred list (§5.3), non-goals (§10) and full deviation log (§11) answer "det som er utelatt eller endret ... er beskrevet og begrunnet" (p. 3).
  - The scope covers three of the guide's four complexity examples: data storage, an AI integration and non-trivial rules. NFR-5 covers "feil input og gjentatte handlinger".
  - One trade-off to weigh at the 29 Nov decision point: cutting S6+S7 is justified by the brief's own ranking, but A–B asks for scope that "svarer til eller overgår ambisjonen i proposal", so a cut would probably cap C2 at C.
- **C3 testability of AI output:**
  - The score and the Integrity guards are deterministic code, tested against Fixtures with Answer keys that include negative cases.
  - Planted bad Cached responses exercise the guards (FR-11, FR-15, FR-17), and tests never call the paid AI (FR-27).
  - The §9.2 checklist covers live AI text, and SM-3 and SM-5 balance honesty against usefulness.
  - Input validation, server-side authorisation and secret handling (FR-1, FR-2, FR-4, FR-19, NFR-5, NFR-7) cover "feilhåndtering, validering av input og bevissthet om sikkerhet" (p. 4).
- **C4 design:**
  - The linked UX specification and mockups are the "Spor av designarbeid" the guide asks for (p. 4).
  - The rest is covered by NFR-2 (WCAG 2.2 AA, axe scan and keyboard walk-through), NFR-3 (360 px), the contrast fixes in D16, the History empty state (FR-21) and inline errors in Norwegian (NFR-5).
- **C5:** The PRD rightly leaves the code structure to the architecture. Pinned dependencies (NFR-6) and configuration through environment variables (FR-22, NFR-7) fit "Fornuftig håndtering av konfigurasjon og avhengigheter" (p. 5).
- **C6 and C7 basics:**
  - These model the examiner's run: NFR-9 (README only, versions, copyable commands, one test command, no paid account), the seeded test user in FR-29 and UJ-3.
  - The test-user credentials in the README are what C6 asks for ("testbrukere"). Keep them fictional and local-only, so they don't look like the red flag "passord ... er committet".
  - NFR-7 forbids secrets in the repository and its history and checks for them before delivery. The existing `.gitignore` already excludes `.env`, `node_modules`, `venv` and build output [observed].
