# Extract: "Sensorveiledning IBE160 – Del 1" (høst 2026)

Purpose: help the JobAssistant team shape the PRD (and later artifacts and the repo) so they meet what the examiner ("sensor") will assess.

## Source and conventions

- **Source:** `C:\IBE160\Sensorveiledning IBE160.pdf` (not modified). 7 pages, made in Microsoft Word, PDF creation date 2026-10-05. Text only: no images, hyperlinks, annotations or attachments. Read in full via text extraction; a second extraction mode produced identical words.
- **Extracted:** 2026-10-31.
- **Convention:** everything below comes from the guide unless tagged **[INF]** (my inference or suggestion, NOT stated in the guide) or **[derived]** (my arithmetic). Norwegian originals are quoted in "…" next to the English. Criteria are abbreviated C1–C7 (numbered as in the guide).
- **Terms:** "mappen" = the portfolio; "sensor" = examiner; "KI" = AI (kunstig intelligens); "proposal" = the group's approved project proposal; "BMAD" = the guide's spelling of BMad.

## What the guide is

- Title: "Sensorveiledning – Del 1", "IBE160 Programmering med KI – Applikasjon og prosess (70 %)", "Høst 2026 · Utfyller den overordnede sensorveiledningen" (supplements the overarching examiner guide, which is NOT in this PDF).
- Covers only **Part 1** of the portfolio: "Prosjektkode og funksjonalitet", **70 %** of the total grade. The other **30 %** is the reflection report ("refleksjonsrapporten", Part 2), which this guide does not describe.
- Part 1 assesses "applikasjonen og repoet som helhet: hva gruppen har laget, hvordan de har laget det, og om andre kan forstå, kjøre og videreutvikle det" (the application and repo as a whole: what the group made, how they made it, and whether others can understand, run and further develop it).
- "Emnet handler om å styre KI-assistert utvikling. Derfor vurderes ikke bare sluttproduktet, men i like stor grad sporene av prosessen: planlegging, prompts, iterasjoner, kvalitetssikring og beslutninger." (The course is about steering AI-assisted development. So not only the end product is assessed but, to an equal degree, the traces of the process: planning, prompts, iterations, quality assurance and decisions.)
- "Emnebeskrivelsen krever at mappen dokumenterer en realistisk utviklingsprosess, og at dokumentasjonen viser hvordan KI ble brukt og hvordan koden er kvalitetssikret." (The course description requires the portfolio to document a realistic development process, showing how AI was used and how the code was quality-assured.)
- "Veiledningen er et støtteverktøy for faglig skjønn, ikke en mekanisk sjekkliste. Kravene må ses i forhold til oppgaven og ambisjonsnivået gruppen har valgt." (A support for professional judgement, not a mechanical checklist. Requirements are read relative to the task and the ambition level the group chose.)

## At a glance (what matters most for the PRD)

1. What is graded is the repo at "siste commit før innleveringsfristen" (last commit before the submission deadline); later changes are ignored.
2. Seven criteria. Largest: Prosess og KI-styring 30 %, Funksjonalitet og omfang 20 %, Kvalitetssikring og testing 15 %. Then Design 10 %, Kodekvalitet 10 %, README 10 %, Ryddighet 5 %.
3. Process traces count "i like stor grad" (equally) as the end product. C1+C6+C7 = 45 % "prosess og etterprøvbarhet"; C2–C5 = 55 % "produktet".
4. The sensor reads the **approved proposal and any product brief first**, "slik at du vet hva gruppen har lovet å lage" (so you know what the group promised to build). Functionality is judged against it; anything omitted or changed must be "beskrevet og begrunnet" (described and justified).
5. Planning documents must be "faktisk er brukt og oppdatert, ikke bare generert én gang" (actually used and updated), and features in code must be traceable "tilbake til krav og stories". Deviations from the plan must be explained.
6. The sensor installs and runs the app on a clean machine using ONLY README.md (guideline 15–20 minutes). Gaps are the README's fault (C6), and an unrunnable app also caps C2.
7. Tests: automated, runnable as README describes, testing "meningsfull logikk"; plus documented manual tests where needed, traces of code review, and concrete examples of AI-generated bugs found and fixed.
8. No secrets in the repo OR its history; provide `.env.example`.
9. Basic accessibility, responsive layout, clear feedback/error messages/empty states, and design traces (sketches, wireframes, UX descriptions) in the planning documents.
10. Listed red flags ("typiske varseltegn", section 5 below) include: planning documents describing a different app than delivered, or clearly generated afterwards; generic AI-use documentation not tied to concrete repo changes; failing or trivial tests.

---

## 1. Deliverables required

The guide has no separate delivery checklist. It describes what the sensor reads and runs in the group's repo. Formats and dates are rarely given.

| # | Deliverable | What the guide says | Format / location | Date |
|---|---|---|---|---|
| D1 | Group repository | "Klon gruppens repo i IBE160-2026 og sjekk ut siste commit før innleveringsfristen. Se bort fra senere endringer." (Clone the group's repo in IBE160-2026 and check out the last commit before the deadline. Ignore later changes.) | Git repo in the course organisation `IBE160-2026` (the team's remote is already `https://github.com/IBE160-2026/G32-grotting.git`). The guide also names "GitHub Insights", so the repo is expected to be on GitHub. | "innleveringsfristen" / "fristen": **no date given** |
| D2 | Working application | "Installer og start appen på en ren maskin eller i et rent miljø, kun etter oppskriften i README.md." (Install and start the app on a clean machine or environment, following only README.md.) | Must run from a fresh clone. No hosted/deployed URL is mentioned anywhere. | same |
| D3 | `README.md` | See C6 for required content. "README.md er døra inn til prosjektet." (the door into the project) | Markdown at repo root | same |
| D4 | Config example file | "en eksempelfil (for eksempel .env.example) uten ekte hemmeligheter" (an example file without real secrets) | e.g. `.env.example` | same |
| D5 | Approved proposal, plus any product brief | "gruppens godkjente proposal og eventuell product brief" (the group's approved proposal and any product brief). Read first by the sensor as the baseline of what was promised. | Where the sensor gets the proposal from is not stated. No proposal file exists in the team's repo or in `C:\IBE160` [INF: observed]. | n/a |
| D6 | BMAD planning documents | "BMAD-dokumenter (for eksempel product brief, PRD, arkitektur, epics og stories)"; "Planleggingsdokumenter fra BMAD" | In the repo; no format or template prescribed | n/a |
| D7 | Prompts and AI sessions | "lagrede prompts og KI-økter" (saved prompts and AI sessions) | In the repo; **no format prescribed** | n/a |
| D8 | Decision documentation | "dokumenterte valg av teknologi, arkitektur og løsninger, med begrunnelse" | In the repo; no format prescribed | n/a |
| D9 | Quality-assurance evidence | Automated tests; "Dokumenterte manuelle tester eller testplaner"; "Spor av kodegjennomgang"; descriptions of bugs found in AI-generated code and how they were fixed | In the repo (tests runnable per README; PR comments etc.) | n/a |
| D10 | Version-control history | Commit history, branches, pull requests, issues ("git log og GitHub Insights") | GitHub | up to the last commit before the deadline |
| D11 | Screenshots and video | Only as fallback evidence: "skjermbilder og video i repoet" are used if the app cannot be run. README should preferably contain a screenshot ("gjerne med skjermbilde"). | In the repo | n/a |
| D12 | Reflection report (Part 2, 30 %) | "refleksjonen over prosessen vurderes i del 2"; "sammen med refleksjonsrapporten (30 %)" | Not described in this guide | not given |

**Explicitly absent from this guide:** a presentation, pitch, demo or oral exam; a PDF/Word report for Part 1; a hosted/deployed URL; individual (per-student) deliverables; any calendar date. The only time markers are "Høst 2026" and the generic "innleveringsfristen". The team's own "early December 2026" deadline does not come from this document.

---

## 2. Grading criteria and weighting

### 2.1 The seven criteria and weights

| Nr | Kriterium | Short description (original) | Weight (Part 1) | Effective weight in total grade [derived: x 0.70] |
|---|---|---|---|---|
| C1 | Prosess og KI-styring | "Sporbar vei fra plan til kode: commits, prompts, iterasjoner og beslutninger" | **30 %** | 21 % |
| C2 | Funksjonalitet og omfang | "Hva appen gjør, sett mot proposal og valgt oppgave" | **20 %** | 14 % |
| C3 | Kvalitetssikring og testing | "Tester, kodegjennomgang og retting av KI-generert kode" | **15 %** | 10.5 % |
| C4 | Design og brukeropplevelse | "Visuelt uttrykk, konsistens, brukervennlighet og tilgjengelighet" | **10 %** | 7 % |
| C5 | Kodekvalitet og arkitektur | "Lesbar, strukturert og sammenhengende kode" | **10 %** | 7 % |
| C6 | README og kjørbarhet | "Tydelig beskrivelse av hvordan appen installeres og kjøres" | **10 %** | 7 % |
| C7 | Ryddighet i repoet | "Struktur, riktige filer, ingen hemmeligheter eller byggeartefakter" | **5 %** | 3.5 % |

- "Vektene er veiledende og brukes til å gi en begrunnet delkarakter for del 1. Prosess og KI-styring har størst vekt fordi det er kjernen i emnets læringsutbytte." (Weights are indicative. Process and AI steering weighs most because it is the core of the course's learning outcomes.)
- "Kriterium 1, 6 og 7 handler om prosess og etterprøvbarhet og utgjør til sammen 45 %. Kriterium 2–5 handler om produktet og utgjør 55 %." (30+10+5 = 45; 20+15+10+10 = 55.)

### 2.2 How the Part 1 grade is computed

- One letter grade per criterion. Convert: A = 5, B = 4, C = 3, D = 2, E = 1, F = 0. Multiply by weight and sum. Thresholds (same as the overarching guide): **A ≥ 4.5 · B ≥ 3.5 · C ≥ 2.5 · D ≥ 1.5 · E ≥ 0.5 · F < 0.5** (the guide writes these with decimal commas).
- The guide's example: (B, C, C, A, C, B, D) gives 0.30·4 + 0.20·3 + 0.15·3 + 0.10·5 + 0.10·3 + 0.10·4 + 0.05·2 = 3.55, which is B.
- The Part 1 sub-grade counts 70 % of the total, with the reflection report at 30 %.
- "Beregningen er et hjelpemiddel for konsistens. Sensor kan avvike fra den beregnede delkarakteren når helhetsinntrykket tilsier det, men avviket skal begrunnes kort." (The calculation is an aid for consistency; the sensor may deviate when the overall impression warrants it, with a short justification.)
- [derived] Sanity checks: all B = 4.0 (B); all C = 3.0 (C); A in C1 and C2 with B elsewhere = exactly 4.50 (A); A in C1–C3 with B elsewhere = 4.65 (A); A in C1 only with B elsewhere = 4.30 (B). C1 and C2 together carry half of Part 1.
- The guide merges the levels in its descriptors: "A–B" and "D–E" are described together; C and F are described alone. It does not say what separates A from B, or D from E (see section 7).

### 2.3 The criteria in detail

#### C1. Prosess og KI-styring (30 %)

Scope: whether the repo shows "en realistisk, iterativ utviklingsprosess der gruppen har styrt KI bevisst – fra krav og plan, via implementering, til testing og forbedring" (a realistic, iterative process where the group consciously steered the AI, from requirements and plan through implementation to testing and improvement). "Det er sporene av prosessen i repoet som vurderes her; refleksjonen over prosessen vurderes i del 2." (The traces of the process in the repo are assessed here; the reflection is assessed in Part 2.)

"Sensor ser etter" (the sensor looks for):
- **Planlegging:** BMAD documents (e.g. product brief, PRD, architecture, epics and stories) "som faktisk er brukt og oppdatert, ikke bare generert én gang" (actually used and updated, not just generated once).
- **Sammenheng plan–kode:** "at funksjoner i koden kan spores tilbake til krav og stories, og at avvik fra planen er forklart" (functions in the code can be traced back to requirements and stories; deviations from the plan are explained).
- **Commit-historikk:** "jevn utvikling over tid fremfor én stor commit før fristen; små, avgrensede commits med beskrivende meldinger" (steady development over time rather than one big commit before the deadline; small, well-delimited commits with descriptive messages).
- **Arbeidsflyt:** "bruk av branches, pull requests, issues eller tilsvarende for å organisere arbeidet" (use of branches, pull requests, issues or similar to organise the work).
- **Sporbar KI-bruk:** "lagrede prompts og KI-økter, og eksempler på at gruppen har presisert krav, avvist, rettet eller forbedret KI-forslag" (saved prompts and AI sessions, and examples where the group clarified requirements, rejected, corrected or improved AI suggestions).
- **Beslutninger:** "dokumenterte valg av teknologi, arkitektur og løsninger, med begrunnelse" (documented choices of technology, architecture and solutions, with rationale).
- **Samarbeid:** "at historikken viser at arbeidet er utført av gruppen over tid. Ujevn fordeling i commit-statistikk alene er ikke grunnlag for trekk, siden par- og mobprogrammering er vanlig." (the history shows the work was done by the group over time; uneven commit statistics alone are not grounds for deduction, since pair and mob programming are common).

| Level | What it looks like | Key original phrases |
|---|---|---|
| **A–B** | The process can be followed clearly from plan to finished app. History shows steady, iterative development. Prompts and decisions are documented and linked to concrete changes. Several clear examples of the group assessing, correcting and steering the AI critically. | "Prosessen kan følges tydelig fra plan til ferdig app"; "jevn, iterativ utvikling"; "Prompts og beslutninger er dokumentert og koblet til konkrete endringer"; "flere tydelige eksempler på at gruppen har vurdert, korrigert og styrt KI kritisk" |
| **C** | Mostly traceable. Planning documents and prompts exist, but the link to the code is partly implicit. History shows development over time, with some large or poorly described commits. | "i hovedsak sporbar"; "koblingen til koden er delvis implisitt"; "noen store eller lite beskrivende commits" |
| **D–E** | Only partly visible. Planning documents look generated once and never used again. Few prompts saved. History concentrated in a few periods or a few large commits. | "bare delvis synlig"; "generert én gang og ikke brukt videre"; "Få prompts er lagret"; "konsentrert til få perioder eller noen få store commits" |
| **F** | No credible process documented: planning and prompts missing, or history is in practice one or a few uploads of finished code. | "Ingen troverdig prosess er dokumentert"; "én eller noen få opplastinger av ferdig kode" |

What separates A–B from the rest: explicit linkage ("koblet til konkrete endringer") instead of implicit, plus several clear examples of critical steering of the AI, plus an even, iterative history with descriptive commits.

#### C2. Funksjonalitet og omfang (20 %)

Scope: "hva appen faktisk gjør og hvor godt den løser problemet som er beskrevet i proposal, sett i forhold til ambisjonsnivået i valgt oppgave" (what the app actually does and how well it solves the problem described in the proposal, relative to the ambition level of the chosen task).

"Sensor ser etter":
- "At kjerneflytene fra proposal og README fungerer fra start til slutt." (The core flows from the proposal and README work end to end.)
- "Omfang og kompleksitet i forhold til oppgaven, for eksempel datalagring, flere brukerroller, integrasjoner eller ikke-trivielle regler." (Scope and complexity relative to the task, e.g. data storage, multiple user roles, integrations or non-trivial rules.)
- "Stabilitet: at appen tåler vanlig bruk, feil input og gjentatte handlinger uten å krasje." (Stability: handles normal use, wrong input and repeated actions without crashing.)
- "At det som er utelatt eller endret fra proposal, er beskrevet og begrunnet." (What was left out or changed from the proposal is described and justified.)

| Level | What it looks like | Key original phrases |
|---|---|---|
| **A–B** | Core functionality is complete and stable. The app solves the problem well, with scope matching or exceeding the ambition in the proposal. | "Kjernefunksjonaliteten er komplett og stabil"; "omfang som svarer til eller overgår ambisjonen i proposal" |
| **C** | The most important functions work, but some are incomplete or have bugs in less common cases. Scope is reasonable for the task. | "noen er ufullstendige eller har feil i mindre vanlige tilfeller"; "Omfanget er rimelig for oppgaven" |
| **D–E** | App works only partly. Central functions missing or failing, or scope clearly smaller than the proposal implies without good justification. | "virker bare delvis"; "omfanget er klart mindre enn proposal tilsier uten god begrunnelse" |
| **F** | App does not work, or does so little that the task is in practice not solved. | "Appen fungerer ikke, eller gjør så lite at oppgaven i praksis ikke er løst" |

Also: if the app cannot be run, functionality is judged from code, tests, screenshots and video in the repo, "men det trekker tydelig ned på kriterium 6 og begrenser hvor høyt kriterium 2 kan vurderes" (which clearly lowers C6 and limits how high C2 can be graded).

What separates A–B from the rest: complete and STABLE core flows; scope at least as ambitious as the proposal; and justified, described deviations. Note that a smaller scope is only penalised when it is "uten god begrunnelse".

#### C3. Kvalitetssikring og testing (15 %)

Scope: "hvordan gruppen har kontrollert at KI-generert kode gjør det den skal, og hvordan feil er funnet og rettet" (how the group verified that AI-generated code does what it should, and how bugs were found and fixed).

"Sensor ser etter":
- "Automatiserte tester (enhets-, integrasjons- eller ende-til-ende-tester) som kan kjøres etter beskrivelsen i README, og som tester meningsfull logikk." (Automated unit, integration or end-to-end tests runnable per the README, testing meaningful logic.)
- "Dokumenterte manuelle tester eller testplaner der automatiske tester ikke er hensiktsmessige." (Documented manual tests or test plans where automated tests are not appropriate.)
- "Spor av kodegjennomgang, for eksempel kommentarer i pull requests eller beskrivelser av feil som ble funnet i KI-generert kode og hvordan de ble rettet." (Traces of code review, e.g. PR comments or descriptions of bugs found in AI-generated code and how they were fixed.)
- "Grunnleggende feilhåndtering, validering av input og bevissthet om sikkerhet, for eksempel at hemmeligheter ikke ligger i koden." (Basic error handling, input validation and security awareness, e.g. no secrets in the code.)

| Level | What it looks like | Key original phrases |
|---|---|---|
| **A–B** | Tests are relevant, run without failures and cover central logic. QA is systematic and documented, with concrete examples of bugs found and fixed. | "Testene er relevante, kjører uten feil og dekker sentral logikk"; "systematisk og dokumentert"; "konkrete eksempler på feil som ble avdekket og rettet" |
| **C** | Tests and some documented QA exist, but coverage is uneven or tests are superficial. | "dekningen er ujevn"; "testene er overfladiske" |
| **D–E** | Little testing: few tests, failing, or only trivial things; QA barely documented. | "Lite testing"; "feiler eller tester bare trivielle ting"; "knapt dokumentert" |
| **F** | No trace of testing or QA of AI-generated code. | "Ingen spor av testing eller kvalitetssikring av KI-generert kode" |

What separates A–B from the rest: tests that actually pass and cover central logic, AND documented, concrete before/after examples of AI-generated bugs found and corrected.

#### C4. Design og brukeropplevelse (10 %)

Scope: "om appen er gjennomtenkt utformet for brukerne den er laget for. Design omfatter både visuelt uttrykk og hvor lett appen er å forstå og bruke." (whether the app is thoughtfully designed for its intended users; design covers both visual expression and how easy it is to understand and use). Adapted to the app type (e.g. a command-line tool is judged on clear messages and output structure).

"Sensor ser etter":
- "Helhetlig og konsistent visuelt uttrykk: farger, typografi, avstand og komponenter." (Coherent, consistent look: colours, typography, spacing, components.)
- "Tydelig navigasjon og informasjonsstruktur; brukeren forstår hva som kan gjøres og hva som skjer." (Clear navigation and information structure; the user understands what can be done and what is happening.)
- "Forståelige tilbakemeldinger, feilmeldinger og tomtilstander." (Understandable feedback, error messages and empty states.)
- "Grunnleggende tilgjengelighet (universell utforming): lesbar kontrast, tastaturnavigasjon, alternativtekst og fornuftige skjemaetiketter." (Basic accessibility: readable contrast, keyboard navigation, alt text, sensible form labels.)
- "Tilpasning til relevante skjermstørrelser." (Adaptation to relevant screen sizes.)
- "Spor av designarbeid i prosessen, for eksempel skisser, wireframes eller UX-beskrivelser i planleggingsdokumentene." (Traces of design work in the process, e.g. sketches, wireframes or UX descriptions in the planning documents.)

| Level | What it looks like | Key original phrases |
|---|---|---|
| **A–B** | The app appears polished, consistent and intuitive. Design choices are deliberate and fitted to the target group; basic accessibility is in place. | "gjennomarbeidet, konsistent og intuitiv"; "Designvalg er bevisste og tilpasset målgruppen"; "grunnleggende tilgjengelighet er ivaretatt" |
| **C** | Tidy and usable, but with some inconsistencies or unclear flow/feedback. | "noen inkonsistenser eller uklarheter i flyt og tilbakemeldinger" |
| **D–E** | Works but looks little thought-through: cluttered, inconsistent or hard to use without explanation. | "lite gjennomtenkt: uoversiktlig, inkonsistent eller vanskelig å bruke uten forklaring" |
| **F** | So cluttered or incomplete that the app cannot in practice be used as intended. | "i praksis ikke kan brukes som tiltenkt" |

#### C5. Kodekvalitet og arkitektur (10 %)

Scope: "om koden er forståelig og vedlikeholdbar. Studentene skal ikke ha skrevet koden selv, men de har ansvar for at KI-generert kode utgjør en sammenhengende og ryddig helhet." (whether the code is understandable and maintainable. The students are not meant to have written the code themselves, but are responsible for the AI-generated code forming a coherent, tidy whole.)

"Sensor ser etter":
- "Logisk mappe- og modulstruktur som samsvarer med arkitekturen som er beskrevet." (Logical folder/module structure matching the described architecture.)
- "Lesbar kode med beskrivende navn og fornuftige kommentarer der det trengs." (Readable code, descriptive names, sensible comments where needed.)
- "Lite duplisering, død kode og utkommenterte rester fra tidligere KI-forsøk." (Little duplication, dead code, commented-out remnants of earlier AI attempts.)
- "Konsekvent stil, gjerne støttet av linter eller formatterer." (Consistent style, preferably supported by a linter or formatter.)
- "Fornuftig håndtering av konfigurasjon og avhengigheter." (Sensible handling of configuration and dependencies.)

| Level | What it looks like | Key original phrases |
|---|---|---|
| **A–B** | Well-structured, readable, consistent. Architecture is clear and matches the documentation. | "Arkitekturen er tydelig og samsvarer med dokumentasjonen" |
| **C** | Mostly tidy, but some duplication, unclear names or parts that don't fit the structure. | "noe duplisering, uklare navn eller deler som ikke passer inn i strukturen" |
| **D–E** | Hard to follow: much duplication, dead code or unclear structure. | "vanskelig å følge"; "mye duplisering, død kode eller uklar struktur" |
| **F** | So cluttered or incomplete it cannot be assessed as a coherent solution. | "ikke kan vurderes som en sammenhengende løsning" |

#### C6. README og kjørbarhet (10 %)

Scope: "om en person som ikke kjenner prosjektet, kan forstå hva appen gjør og få den til å kjøre ved å følge README – uten å spørre gruppen" (whether a person who does not know the project can understand what the app does and get it running by following the README, without asking the group).

"Sensor ser etter":
- "Kort beskrivelse av hva appen gjør og hvem den er for, gjerne med skjermbilde." (Short description of what the app does and who it is for, preferably with a screenshot.)
- "Forutsetninger med versjoner, for eksempel Node.js, Python eller database." (Prerequisites with versions, e.g. Node.js, Python or a database.)
- "Steg-for-steg installasjon og oppstart med eksakte kommandoer som kan kopieres." (Step-by-step install and start-up with exact copyable commands.)
- "Konfigurasjon: hvilke miljøvariabler som trengs, med en eksempelfil (for eksempel .env.example) uten ekte hemmeligheter." (Configuration: which environment variables are needed, with an example file without real secrets.)
- "Testdata eller testbrukere ved behov, og hvordan testene kjøres." (Test data or test users if needed, and how to run the tests.)
- "Oversikt over mappestrukturen og lenker til planleggings- og prosessdokumentasjonen." (Overview of the folder structure and links to the planning and process documentation.)
- "At README er tilpasset prosjektet og oppdatert, ikke en uendret mal eller generert tekst som ikke stemmer med koden." (README is tailored and current, not an unchanged template or generated text that does not match the code.)

| Level | What it looks like | Key original phrases |
|---|---|---|
| **A–B** | The sensor gets the app running by following the README without deviations. README is clear, complete, current, and gives a good project overview. | "Sensor får appen til å kjøre ved å følge README uten avvik"; "tydelig, komplett og oppdatert" |
| **C** | App can be run per README, but with small gaps an experienced user can solve. | "små hull som en erfaren bruker kan løse selv" |
| **D–E** | README is deficient or partly wrong; considerable effort needed to get the app running. | "mangelfull eller delvis feil"; "krever betydelig innsats" |
| **F** | README missing, or the app cannot be run from the description. | "README mangler, eller appen kan ikke kjøres ut fra beskrivelsen" |

#### C7. Ryddighet i repoet (5 %)

Scope: "om repoet er organisert slik at andre lett finner frem, og om det bare inneholder filer som hører hjemme der" (whether the repo is organised so others find their way easily and contains only files that belong there).

"Sensor ser etter":
- "Oversiktlig mappestruktur med tydelig skille mellom kode, dokumentasjon og eventuelle ressurser." (Clear folder structure separating code, documentation and resources.)
- "En .gitignore som holder byggeartefakter, avhengigheter (for eksempel node_modules eller venv) og lokale filer ute av repoet." (A .gitignore keeping build artefacts, dependencies and local files out.)
- "Ingen hemmeligheter i repoet eller historikken, som API-nøkler, passord eller .env-filer." (No secrets in the repo OR the history: API keys, passwords, .env files.)
- "Ingen løse testfiler, sikkerhetskopier, gamle versjoner eller tilfeldige filer i rotmappen." (No stray test files, backups, old versions or random files in the root folder.)
- "Fornuftige fil- og mappenavn." (Sensible file and folder names.)

| Level | What it looks like | Key original phrases |
|---|---|---|
| **A–B** | Tidy and logically organised. Only relevant files are versioned; no secrets. | "Kun relevante filer er versjonert, og det finnes ingen hemmeligheter" |
| **C** | Mostly tidy, with some redundant files or somewhat unclear structure. | "enkelte overflødige filer eller noe uklar struktur" |
| **D–E** | Messy: many redundant files, build artefacts or dependencies in the repo; unclear structure. | "Rotete"; "mange overflødige filer, byggeartefakter eller avhengigheter" |
| **F** | So cluttered it is hard to find one's way, or contains real secrets that have not been handled. | "inneholder ekte hemmeligheter som ikke er håndtert" |

### 2.4 Quick view: what A–B requires, per criterion

1. **C1 Process:** plan to app followable; steady iterative history; prompts and decisions tied to concrete changes; several clear examples of critical AI steering.
2. **C2 Functionality:** core complete and stable; scope at least the proposal's ambition; deviations described and justified.
3. **C3 QA:** relevant tests that run without errors and cover central logic; systematic, documented QA with concrete bugs found and fixed.
4. **C4 Design:** polished, consistent, intuitive; deliberate choices fitted to the target group; basic accessibility.
5. **C5 Code:** well-structured, readable, consistent; architecture clear and matching the documentation.
6. **C6 README:** sensor runs the app from README with no deviations; README clear, complete, current.
7. **C7 Repo:** tidy; only relevant files versioned; no secrets.

---

## 3. What is expected of planning artifacts specifically

The guide prescribes **no template, section list or format** for any planning artifact. What it does say:

| Artifact | What the guide says |
|---|---|
| Proposal (approved) | The sensor's first read ("Forbered. Les gruppens godkjente proposal ..."). It is the baseline: functionality is judged "sett mot proposal"; "kjerneflytene fra proposal og README" are tested; scope is compared to "ambisjonen i proposal"; omissions or changes must be "beskrevet og begrunnet". The proposal's own content is not described in this guide. |
| Product brief | "eventuell product brief" (any product brief) is read together with the proposal to know "hva gruppen har lovet å lage". Also listed as an example BMAD document. No required sections. |
| PRD / requirements | Named only in the list "BMAD-dokumenter (for eksempel product brief, PRD, arkitektur, epics og stories)". No required sections. Qualities demanded of the planning documents as a whole are listed below. |
| UX / design | "Spor av designarbeid i prosessen, for eksempel skisser, wireframes eller UX-beskrivelser i planleggingsdokumentene" counts as evidence under C4. |
| Architecture | C5: folder and module structure must match "arkitekturen som er beskrevet"; A–B needs "Arkitekturen er tydelig og samsvarer med dokumentasjonen". C1: "dokumenterte valg av teknologi, arkitektur og løsninger, med begrunnelse". |
| Epics and stories | "krav og stories" are the anchor points for traceability from code ("kan spores tilbake til krav og stories"). No required format. |

**Qualities the guide expects of planning artifacts:**
1. **Living, not one-off:** "faktisk er brukt og oppdatert, ikke bare generert én gang". D–E level: "Planleggingsdokumenter fremstår som generert én gang og ikke brukt videre."
2. **Traceable to code:** "funksjoner i koden kan spores tilbake til krav og stories". C-level weakness: "koblingen til koden er delvis implisitt". A–B: "Prompts og beslutninger er dokumentert og koblet til konkrete endringer."
3. **Deviations explained:** "avvik fra planen er forklart"; and for the proposal: "det som er utelatt eller endret ... er beskrevet og begrunnet".
4. **Consistent with the delivered app and the code:** sensor step "Kontroller at dokumentene henger sammen med koden." Red flag: "Planleggingsdokumentene beskriver en annen app enn den som er levert, eller er tydelig generert i etterkant."
5. **Linked from the README:** "lenker til planleggings- og prosessdokumentasjonen".
6. **Decisions with rationale** recorded ("med begrunnelse").

**Not mentioned anywhere in the guide:** testable or measurable requirements, acceptance criteria, requirement IDs, a traceability matrix, non-functional-requirement categories, page limits, or minimum numbers of epics/stories. The only traceability the guide names is code to requirements/stories, and prompts/decisions to concrete changes. [INF] Testability and requirement IDs are therefore the team's way of satisfying "kan spores tilbake" and "meningsfull logikk", not a stated rule.

---

## 4. Technical expectations

**Stack.** None prescribed. Examples used in passing: "Node.js, Python eller database" (prerequisites in README), "node_modules eller venv" (to keep out of git). Versions of prerequisites must be stated in the README.

**Deployment and running.**
- The sensor clones the repo and runs it "på en ren maskin eller i et rent miljø, kun etter oppskriften i README.md". No hosted URL, Docker, CI/CD or cloud deployment is required or mentioned.
- Effort guideline: "Bruk rimelig innsats på å få appen til å kjøre (veiledende inntil 15–20 minutter)." Any gap an ordinary user cannot solve with the README "regnes som mangler ved README, ikke som sensors problem."
- Fallback if the app cannot be run: judged from code, tests, screenshots and video in the repo, with a clear deduction on C6 and a cap on C2.
- Configuration through environment variables with a secret-free example file (`.env.example`); "Testdata eller testbrukere ved behov" (test data or test users where needed).

**Testing.** (C3, plus sensor step "Kjør testene slik README beskriver, og vurder hva de faktisk tester.")
- Automated unit, integration or end-to-end tests, runnable as the README describes, testing "meningsfull logikk".
- Documented manual tests or test plans "der automatiske tester ikke er hensiktsmessige".
- Red flag: "Testene feiler, eller tester bare trivielle ting."
- The sensor also tests the app by hand: core flows, "feil input og uventet bruk" (wrong input and unexpected use), repeated actions.

**Security and secrets.**
- "hemmeligheter ikke ligger i koden"; "Ingen hemmeligheter i repoet eller historikken, som API-nøkler, passord eller .env-filer" (the history counts, not only the latest commit).
- A real, unhandled secret in the repo makes C7 an F, and "API-nøkler, passord eller .env-filer er committet" is a red flag.
- "Grunnleggende feilhåndtering, validering av input og bevissthet om sikkerhet" (basic error handling, input validation, security awareness).
- Not mentioned: authentication design, encryption, GDPR/personal-data handling.

**AI use.**
- The guide is about AI used to BUILD the app: "Studentene skal ikke ha skrevet koden selv" (code is expected to be AI-generated), but the group owns the coherence and correctness of the result. It must show it reviewed, corrected and steered the AI.
- It says nothing about AI features INSIDE the delivered app (model choice, API keys for the sensor, cost, non-deterministic output, hallucination handling).

**Data handling.** "datalagring" (data storage) appears only as an example of scope and complexity under C2. Nothing on privacy, retention or encryption.

**Code and architecture.** Logical folder/module structure matching the documented architecture; descriptive names; few duplicates, little dead code, no commented-out leftovers from AI attempts; consistent style "gjerne støttet av linter eller formatterer"; sensible handling of configuration and dependencies.

**UI/UX (technical).** Readable contrast, keyboard navigation, alt text, sensible form labels; adaptation to relevant screen sizes ("prøv gjerne ulike skjermstørrelser"); understandable feedback, error messages and empty states ("tomtilstander").

**Stability.** "tåler vanlig bruk, feil input og gjentatte handlinger uten å krasje."

**Documentation.** README with the contents listed under C6; architecture documentation that matches the code; planning and process documentation linked from the README; "fornuftige kommentarer der det trengs" in code.

**Repo hygiene.** `.gitignore` for build artefacts, dependencies and local files; no stray files in the root; no `node_modules`, `venv`, build folders or large binaries (red flags).

---

## 5. Process expectations

**Use of AI tools.**
- The whole course is "å styre KI-assistert utvikling" (steering AI-assisted development). Using AI is expected; being able to show how it was steered is what is graded.
- Evidence wanted: "lagrede prompts og KI-økter" plus "eksempler på at gruppen har presisert krav, avvist, rettet eller forbedret KI-forslag".

**Logging of AI use.**
- The guide does not name session logs, but "Sporbar KI-bruk" and "Les prosessdokumentasjonen ... prompts og KI-økter" ask for stored prompts and AI sessions. **No format, location or volume is specified.**
- It must be specific: red flag "Dokumentasjonen av KI-bruk er generell og kan ikke knyttes til konkrete endringer i repoet." (AI-use documentation that is generic and cannot be tied to concrete repo changes.)
- A–B wants prompts and decisions "koblet til konkrete endringer".
- [INF] The team's `.logs/<user>/` session logs (sesjonslogg skill) fit this expectation if each entry references the commits, files, stories or requirement IDs it produced.

**Git usage.**
- Even history: "jevn utvikling over tid fremfor én stor commit før fristen".
- "små, avgrensede commits med beskrivende meldinger".
- "bruk av branches, pull requests, issues eller tilsvarende for å organisere arbeidet".
- Code-review traces: "kommentarer i pull requests".
- The sensor inspects "git log og GitHub Insights": "fordeling over tid, commit-meldinger, branches, pull requests og issues".
- The commit checked out is the last one before the deadline; later changes are ignored.

**Group work.**
- Work should be visibly done "av gruppen over tid".
- "Ujevn fordeling i commit-statistikk alene er ikke grunnlag for trekk, siden par- og mobprogrammering er vanlig."
- No individual assessment or contribution statement is mentioned.

**Reflection.** The reflection on the process is graded in Part 2 (30 % of total), not in Part 1. This guide does not describe Part 2.

**BMAD usage.** BMAD documents are expected and must be used and updated (see section 3).

**The sensor's walkthrough** (section 3 of the guide, "Fremgangsmåte for sensor"; the PDF's numbering repeats "1." at the page break, so there are ten steps in practice). Groups are processed "i samme rekkefølge" for consistency; the sensor is told to "Sett av tid til å kjøre appen selv."
1. **Forbered:** read the approved proposal and any product brief.
2. **Hent repoet ved fristen:** clone, check out the last commit before the deadline.
3. **Følg README:** install and start on a clean machine, only per README.md; note every missing, unclear or failing step.
4. **Test appen:** go through the core flows described in the proposal and README; try wrong input and unexpected use.
5. **Vurder design:** overall impression, consistency, usability; try different screen sizes if relevant.
6. **Gå gjennom historikken:** distribution over time, commit messages, branches, PRs, issues.
7. **Les prosessdokumentasjonen:** BMAD planning documents, prompts and AI sessions, decisions, QA documentation; check that the documents match the code.
8. **Kjør testene:** as the README describes; judge what they actually test.
9. **Les koden:** spot-check central parts for structure and readability.
10. **Fyll ut vurderingsskjemaet** (the guide's chapter 6): a letter grade and short justification per criterion.

**Typical red flags ("Typiske varseltegn")**: to be examined and mentioned in the justification if they affect the grade.
1. All or nearly all code in one or a few commits right before the deadline.
2. Planning documents describe a different app than the delivered one, or are clearly generated afterwards.
3. README is an unchanged template, or its commands do not work.
4. API keys, passwords or `.env` files committed.
5. `node_modules`, `venv`, build folders or large binaries in the repo.
6. Tests fail, or test only trivial things.
7. Large amounts of dead code, duplicate files or remnants of discarded AI attempts.
8. AI-use documentation is generic and cannot be tied to concrete repo changes.

---

## 6. What should directly shape the PRD's content or structure

Items tagged **[DOC]** are stated in the guide; **[INF]** are my suggestions for turning the guide into PRD content. The guide itself sets no PRD template.

1. **Anchor to the proposal and brief; log deviations.** [DOC] The sensor measures scope against the approved proposal and any product brief, and requires what is "utelatt eller endret" to be "beskrevet og begrunnet". [INF] Give the PRD an explicit in-scope / out-of-scope / later section and a changes-versus-proposal/brief log with reasons. Keep it current as scope moves.
2. **Make requirements traceable.** [DOC] Code must be traceable "tilbake til krav og stories", and prompts and decisions must be "koblet til konkrete endringer". [INF] Give every functional and non-functional requirement a stable ID that stories, commits, PRs, tests and session logs can cite.
3. **Name the core flows.** [DOC] The sensor tests "kjerneflytene som proposal og README beskriver" end to end. [INF] Define the core user flows explicitly in the PRD (CV upload, job-ad input, letter generation, ATS score with explanations, suggestions, login, encrypted storage) in terms the README can reuse verbatim, so proposal, PRD and README describe the same flows.
4. **Keep the scope realistic and stable.** [DOC] A–B needs "komplett og stabil" core functionality; C is "noen ... ufullstendige"; D–E is "virker bare delvis". Smaller scope is penalised only "uten god begrunnelse". Complexity is read against "datalagring, flere brukerroller, integrasjoner eller ikke-trivielle regler". [INF] Prioritise a small, finished core over a wide, half-working one; record any descoping with a reason. JobAssistant already touches three of the four listed complexity examples (stored data via login and encrypted storage, an AI integration, non-trivial rules via the code-calculated ATS score); only multiple user roles is absent.
5. **State how each requirement will be verified.** [DOC] Sensor wants tests of "meningsfull logikk" and "Dokumenterte manuelle tester eller testplaner der automatiske tester ikke er hensiktsmessige". The guide does not use the words "testable" or "measurable". [INF] Write requirements so they can be checked, and record per requirement whether it is covered by an automated test or a manual test plan. The code-calculated ATS score is a natural unit-test target; AI-written text needs a manual plan or mocking.
6. **Put the guide's explicit quality expectations into the PRD's non-functional requirements.** [DOC] Basic accessibility (contrast, keyboard navigation, alt text, form labels); adaptation to relevant screen sizes; understandable feedback, error messages and empty states; stability under wrong input and repeated actions; input validation and basic error handling; no secrets in code or history. [INF] Phrase these as checkable NFRs.
7. **Include run-ability requirements.** [DOC] README-only setup on a clean machine, guideline 15–20 minutes, `.env.example`, test users or data, test instructions. [INF] Add NFRs for these, including how a sensor without the team's credentials can exercise the AI features (pending the lecturer's answer, see section 7).
8. **Keep the PRD alive and consistent with the delivered app.** [DOC] "faktisk er brukt og oppdatert"; red flag for documents describing "en annen app" or "generert i etterkant". [INF] Add a version or change history, update the PRD after architecture and epics, and commit changes with descriptive messages so the history shows the PRD in use. Do not describe features that will not be built; mark them out of scope.
9. **Record decisions with rationale.** [DOC] "dokumenterte valg av teknologi, arkitektur og løsninger, med begrunnelse". [INF] Either keep a decisions section in the PRD or link to the architecture document or a decision log.
10. **Link the planning set.** [DOC] README must link to the planning and process documentation. [INF] Cross-link PRD, brief, UX documents, architecture and epics, and make sure the UX documents give the design traces C4 asks for.
11. **Process-oriented content counts.** [DOC] C1, C6 and C7 are 45 % of Part 1 and are about process and verifiability, not features. [INF] The PRD should not be the only planning effort; the repo, README, history and logs matter just as much.

**Where PRD content lands in the grading** [INF]:

| PRD element | Serves | Basis in the guide |
|---|---|---|
| In/out of scope plus changes-vs-proposal log | C2, C1 | "beskrevet og begrunnet"; "avvik fra planen er forklart" |
| Stable requirement IDs cited by stories, commits, tests, logs | C1, C3 | "spores tilbake til krav og stories"; "koblet til konkrete endringer" |
| Named core flows | C2, C4 | "kjerneflytene som proposal og README beskriver" |
| Verification method per requirement | C3 | "Dokumenterte manuelle tester eller testplaner"; "meningsfull logikk" |
| Error handling, validation, empty states, feedback | C2, C3, C4 | "feil input og gjentatte handlinger uten å krasje"; "tomtilstander" |
| Accessibility and responsive NFRs | C4 | "lesbar kontrast, tastaturnavigasjon, alternativtekst ... skjermstørrelser" |
| Secrets, config, security NFRs | C3, C6, C7 | "hemmeligheter ikke ligger i koden"; ".env.example" |
| Setup and run NFR (clean machine, README only) | C6 | "kun etter oppskriften i README.md"; "15–20 minutter" |
| Decisions and rationale | C1, C5 | "med begrunnelse"; "samsvarer med arkitekturen" |
| Version history and updates | C1 | "faktisk er brukt og oppdatert" |

---

## 7. Ambiguities and questions for the lecturer

### 7.1 Gaps in the document itself

- **Deadline.** "innleveringsfristen" is never given as a date. Also unclear: time zone, and whether the cut-off is judged by commit timestamp or push time ("siste commit før innleveringsfristen").
- **Missing companion documents.** It supplements "den overordnede sensorveiledningen" and relies on "Emnebeskrivelsen" and the Part 2 reflection-report guide, none of which is included. Their requirements (format, length, deadline, submission) are unknown.
- **A versus B and D versus E.** Descriptors are merged ("A–B", "D–E"), and the thresholds are "veiledende". What separates A from B is not stated, e.g. how many is "flere tydelige eksempler".
- **Document quirks.** Step numbering in section 3 repeats "1." at the page break, giving ten steps; "kapittel 6" means the "Vurderingsskjema" section; the guide writes "BMAD".
- **Silent on:** AI features inside the app; personal-data handling (CVs); documentation language; individual assessment; presentation or demo; WCAG level; minimum test coverage; hosted deployment.

### 7.2 Questions to put to the lecturer

Priority (these can block or change the plan):
1. **Exact deadline** (date, time, time zone), how "siste commit før innleveringsfristen" is determined, and the deadline and format for the Part 2 reflection report. Can we get the overarching examiner guide and the course description?
2. **AI credentials for the sensor.** The sensor runs the app on a clean machine from README alone, but secrets must not be in the repo or history. How does the sensor get an LLM API key (own key, course-provided, or should the app offer a mock/offline mode)? What environment does the sensor have (OS, Node/Python versions, Docker, database)? Who pays for API usage?
3. **Hosted deployment.** Is only a local run expected, or is a deployed URL helpful or required? (Only local cloning and running is described.)
4. **The proposal.** Where does the sensor read the "godkjente proposal" from, and should a copy or link be in the repo? Is the PRD allowed to narrow or extend scope relative to the proposal, and where should deviations be recorded (PRD, README, separate log)?
5. **What counts as "lagrede prompts og KI-økter".** Is a curated session log (`.logs/<user>/`, one entry per session with decisions and linked commits) enough, or are raw chat transcripts expected? How much is expected, and is there any rule on privacy?
6. **Ambition level.** The guide judges scope against "ambisjonsnivået gruppen har valgt". Is login plus encrypted storage plus LLM generation plus a code-calculated ATS score plus suggestions an adequate "omfang og kompleksitet", or are multiple user roles expected for top marks?

Secondary:
7. **Language.** Must README, PRD, code comments and commit messages be Norwegian, English, or either? (The product itself is Norwegian-only by the team's decision.)
8. **Individual contributions.** Is the grade collective? Is an individual contribution statement expected, and if so where (Part 2)?
9. **Personal data.** Are CVs (personal data) and the encrypted-storage feature expected to come with a privacy or data-protection note? The guide does not mention GDPR.
10. **Accessibility level.** Only "grunnleggende tilgjengelighet" is stated. Is there a WCAG target?
11. **Testing of non-deterministic AI output.** Is mocking the LLM acceptable for automated tests, and is a manual test plan acceptable for letter quality? Any minimum coverage?
12. **Workflow.** Are pull requests and issues expected rather than merely allowed ("eller tilsvarende")? Is direct commit to `main` acceptable?
13. **Tool files in the repo.** Is it fine to version BMad framework and skill folders (`_bmad/`, `.claude/skills/`) given C7's "Kun relevante filer er versjonert"? (The team's `.gitignore` already states the intent to keep the shared framework, skills, plans and documentation.)

### 7.3 Side observations on the current repo (NOT from the guide)

- `README.md` is a short placeholder (group name, course line, one listed member). Left as is it would hit the "README er en uendret mal" red flag; C6 needs the full content listed above.
- Remote is `https://github.com/IBE160-2026/G32-grotting.git`, matching the organisation the sensor clones from.
- Git history: 12 commits since 2026-09-07, all on `main`; no feature branches are visible locally. Pull requests and issues cannot be checked from a local clone. C1 "Arbeidsflyt" looks for branches, PRs and issues.
- No proposal file exists in the repo or in `C:\IBE160`.
- At the start of this task the PRD folder, `_bmad/` and the `.claude/skills/bmad-*` folders were untracked in git. Committing planning work regularly makes the history show the artifacts in use (C1).
- A commit "Legg til tilbakemelding på product brief" (2026-10-06, author Bård Pettersen) exists. I did not review it (outside the PDF); reconcile it with this extract.
- `.gitignore` already excludes `.env*` (keeping `.env.example`), `node_modules`, `venv` and build output, a good base for C7. Because C7 and the red flags also cover the history, a secret scan of past commits before the deadline is worthwhile [INF].
