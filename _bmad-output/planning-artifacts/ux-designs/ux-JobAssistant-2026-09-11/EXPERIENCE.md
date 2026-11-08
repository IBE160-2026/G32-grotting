---
title: JobAssistant
status: final
created: 2026-09-11
updated: 2026-11-08
sources:
  - ../../briefs/brief-JobAssistant-2026-09-11/brief.md
  - ../../briefs/brief-JobAssistant-2026-09-11/addendum.md
  - ../../prds/prd-JobAssistant-2026-10-31/prd.md
  - ../../prds/prd-JobAssistant-2026-10-31/addendum.md
---

# JobAssistant — Experience Spine

> Web app (no native mobile app), responsive down to 360 px phone-browser width. Single light theme, no mode toggle. Paired with `DESIGN.md`. Primary user: a university or college student applying for their first full-time job (Violet). Core product pillar: AI transparency. Every score, gap and suggestion comes with a plain-language reason, and nothing the app writes claims a qualification the CV doesn't support (PRD P1, P2).

## Foundation

Single responsive web app, one role (Student), self-serve. No named UI system: components are custom and specified in `DESIGN.md.Components`. It runs locally from the README (in Test mode without an API key) and as a Hosted version on Vercel behind an Access code (PRD FR-27, FR-30, FR-31). Delivery: IBE160 portfolio deadline, 15 December 2026.

This spine follows the PRD (`prd-JobAssistant-2026-10-31`), which owns requirements and build order; this spine owns screens, states, behaviour and microcopy. PRD terms (Student, CV text, Job ad, Keyword, Matched/Missing keyword, Match score, Verdict, Gap, Rewordable gap, Real gap, Evidence, Rewording suggestion, Letter, Tone, Reflection Note, Daily cap, Test mode, Example pair, Access code) are used exactly as the PRD Glossary defines them.

**v1 scope, in build order** (PRD §5.1): S1 CV and Job ad input → S2 Match score and keyword explanation → S3 Letter (+ Test mode, AI safeguards) → S4 Gap analysis → S5 Rewording suggestions → S6 + S7 accounts, Profile, History and encrypted storage. If time runs short, S6 + S7 are cut first, then S5, then S4. Every surface must therefore work in the earlier variants too; see **Build-order variants**.

**Out of v1** (PRD §5.3, §10): standalone «Vurder CV» and «Vurder søknad» (D2), any generated or rewritten CV file (D1), downloading the Reflection Note (D4), History search/delete/rename (D5), password reset/change, email verification, account deletion (D14), voice learning, interview prep, job boards, LinkedIn import, English or nynorsk.

**Traceability:** surfaces, components and flows below carry the PRD S, FR, NFR, UJ and D IDs they realise, so stories can cite both documents.

## Language

The whole interface is Norwegian (bokmål), and so is everything the product generates (PRD NFR-1). There is no language switch. This spine keeps English internal identifiers so it stays consistent with `DESIGN.md` and the PRD; the user-facing labels are below. Quoted microcopy elsewhere in this spine is already the Norwegian UI text.

| Internal name | UI label |
|---|---|
| Home | Hjem |
| Application page | Søknad |
| Profile | Profil |
| History | Historikk |
| Account | Konto |
| Logout | Logg ut |
| Register / Log in | Registrer deg / Logg inn |
| Access-code screen | Tilgangskode |
| "Create tailored application" (Home CTA) | Lag skreddersydd søknad |
| "Create application" (persistent CTA, submit) | Lag søknad |
| CV text | CV-tekst |
| Job ad / job title / employer | Stillingsannonse / Stillingstittel / Arbeidsgiver |
| Tone: Formal / Personal / Direct | Formell / Personlig / Direkte |
| Reflection Note | Refleksjonsnotat |
| Match score (card label) | ATS-samsvar |
| Matched / missing keywords | Nøkkelord du har / Nøkkelord som mangler |
| Strong match / Needs work | Sterkt samsvar / Bør forbedres |
| Rewordable gap / Real gap | Kan omformuleres / Mangler i CV-en |
| Gap section heading | Det som mangler |
| Rewording suggestion | Forslag |
| AI-written marker | Skrevet med KI |
| Letter | Søknadsbrev |
| Copy / Copied | Kopier / Kopiert |
| Download Letter | Last ned (.docx) |
| Regenerate Letter | Lag nytt utkast |
| Use the Example pair (Test mode) | Bruk eksempelet |
| Confirm CV text | Bekreft CV-teksten |

Formatting follows Norwegian conventions: a space before the percent sign («71 %»), dates as «8. sep. 2026», and «sjevroner» for quoted terms. Downloaded file names stay ASCII (`soknadsbrev`, not `søknadsbrev`).

## Information Architecture

Visual reference mocks exist for four load-bearing surfaces: [Home](mockups/key-home.html), [Application form](mockups/key-application-form.html), [Application result](mockups/key-application-result.html), [Mobile nav](mockups/key-mobile-nav.html). Everything else is built from this spine and `DESIGN.md`. Mocks illustrate; the spines are the contract and win on any conflict.

| Surface | Exists from | Reached from | Purpose | Realises |
|---|---|---|---|---|
| Access-code screen | S1, Hosted version only | Any first request in a browser session (before S6) | One field «Tilgangskode» and «Åpne». After S6 the code moves into «Registrer deg» instead. | FR-31 |
| Hjem ([mock](mockups/key-home.html)) | S1 | App open, navbar | CTA-forward start page. Before S6: headline, the «Lag skreddersydd søknad» card, nothing else. After S6, logged in: greeting, the CTA card, the 3 most recent Applications and «Se hele historikken». No «Vurder CV» or «Vurder søknad» cards (D2, removed). | FR-21, D2, D20 |
| Søknad | S1 | Navbar, Home CTA, persistent CTA | The working page: CV text (before S6, or when the Profile has none), Job ad fields, Tone, submit ([form mock](mockups/key-application-form.html)); then the result in two phases on the same page ([result mock](mockups/key-application-result.html)). | FR-1–FR-17, FR-20, FR-24–FR-27 |
| Registrer deg | S6 | Home CTA (logged out), «Logg inn» link | Name, email, password (min 8); plus «Tilgangskode» on the Hosted version. Then redirect to Profil. | FR-18, FR-31, D14 |
| Logg inn | S6 | Navbar (logged out), session expiry | Email and password. | FR-18 |
| Profil | S6 | Navbar, redirect after registration | Name (the only personal field) and the confirmed CV text: shown as editable text, with «Last opp ny CV» and «Lim inn ny tekst» to replace it. No stored file is shown (D12). | FR-3, FR-20, D11 |
| Historikk | S6 | Navbar, «Se hele historikken» on Hjem | Saved Applications, newest first, 20 per page. No search, no type tags. | FR-21, D5 |
| Saved Application | S6 | A Historikk or Hjem row | The stored Reflection Note and Letter, read-only, with «Kopier» and «Last ned (.docx)». No «Lag nytt utkast», no inputs. | FR-21 |
| Konto | S6 | Navbar | The Student's email, «Logg ut», and the data note. No password change, no self-service deletion. | FR-21, FR-23, D14 |
| Not found | S1 | Unknown URL, or another Student's record | «Fant ikke siden.» Same message whether the page doesn't exist or belongs to someone else. | FR-19 |

**Navigation.**
- Before S6 (and permanently if S6 + S7 are cut): two items, **Hjem** and **Søknad**, both bold (`{components.nav-link-primary}`). No Logg ut.
- After S6, logged in: the flat six-item navbar Hjem, Søknad, Profil, Historikk, Konto, Logg ut, with Hjem and Søknad bold.
- After S6, logged out: Hjem, Søknad (which routes to «Logg inn»), and «Logg inn» on the right.
- No drawer, no nested nav. A modal or sheet stacks one level deep, never two. Collapse behaviour: **Responsive & Platform**.

## Voice and Tone

Microcopy rules. Brand register lives in `DESIGN.md.Brand & Style`. The same rules bind AI-written Gap explanations and Rewording suggestions, and the Letter (which addresses the employer instead of the Student) (PRD NFR-1, P5).

| Do | Don't |
|---|---|
| «71 % samsvar – 5 av 7 nøkkelord.» | «Wow, så bra! 🎉 71 % samsvar!» |
| «Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.» | «Oi, du mangler noen nøkkelord!» |
| «Rekrutterere som leser CV-er til denne stillingen, ser etter «tverrfaglig samarbeid». CV-en din sier det ikke ennå.» (recruiter framing) | «ATS-systemet vil sortere deg bort uten dette ordet.» (never claims an ATS will reject or rank the CV, PRD FR-14, D18) |
| «Semesterprosjektet ditt dekker trolig dette – vurder å ta det med.» | «Vi har lagt det til for deg.» (never implies the app added or invented a qualification) |
| «Lagret i Historikk.» | «Suksess!! Søknaden din er klar!!» |
| Plain bokmål; address the user as «du». | Formal «De»; English loanwords where a common Norwegian word exists; literal translations from English. |
| State the fact, then the reason. | Cheerleading, exclamation marks, emoji, gamified praise. |
| Hedged language for anything the Student must judge: «trolig», «vurder». | Imperatives that decide for the Student: «Legg til …», «Skriv …». |

## Component Patterns

Behavioural rules. Visual specs live in `DESIGN.md.Components`.

### Global

| Component | Use | Behavioural rules |
|---|---|---|
| Navbar | Global | Item set depends on the build-order variant and login state (see Information Architecture). Active page highlighted in accent. «Logg ut» needs no confirmation. |
| Persistent CTA | ≤ 640 px, six-item navbar only | «Lag søknad», compact (`{components.persistent-cta}`), outside the hamburger at all times. Routes to Søknad, the same destination as Home's CTA and the bold Søknad link. Not shown in the two-item navbar, where Søknad itself is always visible. |
| Test-mode banner | Global, Test mode only | Full-width `{components.info-banner}` directly under the navbar: «Testmodus – KI-svarene er forhåndslagret». Always visible, not dismissible (FR-27). |
| Info banner | Global | Neutral, non-error notices: Test mode, the Daily cap, "not available in Test mode". Never uses error, warning or success tokens. |
| Error banner | Global | Network or server failure: «Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.» Inline at the top of the content, not a toast. Input is kept (NFR-5). |
| Copy button | Letter, each Rewording suggestion | `{components.button-secondary}`, label «Kopier». On success the label turns to «Kopiert» for 2 seconds and the change is announced via `aria-live="polite"`. Copies plain text only. |
| Form field | All forms | Label above input (`{typography.label}`). Validation on blur and on submit, never on every keystroke. Errors in `{colors.error}`, tied to the field with `aria-describedby`. Fields with a length limit show a counter («1 240 / 15 000 tegn»), which turns to error colour only once the limit is passed. |

### Input (S1)

Mock: [Application form](mockups/key-application-form.html). It shows the version before accounts with the CV text awaiting confirmation, full v1 with the AI notice open, and a phone in Test mode with a length error.

**Søknad form layout.** Heading «Ny søknad» and a subhead that sets expectations: «Legg inn CV-en din og stillingsannonsen. Du får samsvaret med en gang, og brevet og vurderingen innen omtrent ett minutt.» (After S6, with CV text in the Profile, it starts «Lim inn stillingsannonsen.».) Then three numbered cards in this order:
- «1. CV-en din». Before S6 its subhead adds «Teksten blir bare liggende i denne nettleserøkten.». After S6 it is replaced by the one-line «CV from Profile» card.
- «2. Stillingsannonsen», with the subhead «Stillingstittelen og arbeidsgiveren brukes i brevet og i filnavnet.».
- «3. Tone i brevet», with the subhead «Du kan lage et nytt utkast i en annen tone etterpå.».

Last comes «Lag søknad», with the note beside it: «Samsvaret regnes ut i appen. Brevet og vurderingen skrives med KI.»

| Component | Use | Behavioural rules |
|---|---|---|
| Upload dropzone | Søknad (before S6 or no CV), Profil | Click to browse or drag and drop over a real `<input type="file">`. Accepts .pdf and .txt up to 2 MB; anything else is rejected at the dropzone before any request («Bare PDF- og TXT-filer støttes.» / «Filen er for stor.»). While extracting: «Henter ut teksten fra CV-en …». On success, the CV text editor opens with the extracted text. The file itself is never shown again (D12). A link under the dropzone switches to paste: «Lim inn teksten i stedet» (FR-1, FR-2). |
| CV text editor | Søknad (before S6 or no CV), Profil | A plain, editable textarea holding the CV text (200–20 000 tegn), with the hint «Sjekk at teksten er riktig. PDF-er med kolonner eller tabeller blir ofte stokket om.» and «Bekreft CV-teksten». Analysis only ever uses confirmed text (FR-3). After confirming, Søknad collapses it to one line: «CV-tekst bekreftet · 3 412 tegn · Endre». Editing after confirming requires confirming again. |
| CV from Profile | Søknad, after S6 | When the Profile has CV text, Søknad shows one line instead of the editor: «Bruker CV-teksten fra profilen din · Endre i Profil». When it has none, Søknad shows the dropzone and editor with «Du har ikke lagt inn CV-en din ennå.», and confirming also saves it to the Profile (FR-20). |
| Job ad fields | Søknad | «Stillingstittel» and «Arbeidsgiver» (required, max 200 tegn each), then «Stillingsannonse» (plain textarea, 200–15 000 tegn, paste is the main input). Help text: «Lim inn hele annonsen, også kravene.» No file upload, no URL import (FR-4, D10). |
| Tone choice | Søknad | Three radio cards in one radio group, «Formell» preselected. Each card shows its name and its FR-10 description: «Formell – høflig og saklig, med hele setninger og uten personlige anekdoter.» / «Personlig – varmere; viser motivasjon og litt personlighet, men holder seg profesjonell.» / «Direkte – kort og konkret; åpner med det som passer best og bruker få høflighetsfraser.» The whole card is the hit area; arrow keys move within the group (FR-10). |
| «Bruk eksempelet» | Søknad, Test mode only | A bordered bar at the top of the form, «Prøv hele flyten med en fiktiv CV og annonse.», with `{components.button-secondary}` «Bruk eksempelet». Fills the CV text (confirmed), the job title, the employer and the Job ad with the Example pair, and moves focus to «Lag søknad». Works with or without login (FR-27). |
| Submit | Søknad | «Lag søknad» (`{components.button-primary}`). On submit with an unconfirmed CV text, the CV editor shows «Bekreft CV-teksten før du går videre.» instead of submitting. While a request runs, the button is busy and a second click does nothing (NFR-5). |
| AI notice dialog | Søknad, before the first AI request | Modal dialog, shown once per account (once per browser session before S6), never in Test mode (FR-24). Title «Før vi sender teksten din». Content, as a short bulleted list in plain Norwegian: what is sent and to whom («CV-teksten og stillingsannonsen sendes til {leverandør} for å skrive søknadsbrevet og vurdere det som mangler. E-postadresser og telefonnumre fjernes først.», FR-26), that the Match score is calculated in the app, that the provider doesn't train on the text and how long it keeps it, and «Ta ikke med sensitive opplysninger som helse eller fødselsnummer.», followed by «Du ser dette varselet bare én gang.» Buttons: «Jeg forstår, fortsett» (primary) and «Avbryt» (secondary). Focus is trapped inside; Esc equals «Avbryt», which returns to the form with everything kept. Under the FR-5 fallback, it also says that the Job ad (never the CV) is sent to extract keywords. |

### Results (S2–S5)

After submit, the form collapses to a one-line summary («Frontendutvikler – Nordic Digital · Formell · Endre»), and the result renders below it on the same page, in this order: Score panel → Keyword lists → Det som mangler → Søknadsbrev. «Endre» reopens the form with every input kept. Focus moves to the result heading.

| Component | Use | Behavioural rules |
|---|---|---|
| Score panel | Result, phase 1 | Card label «ATS-SAMSVAR». The badge shows the score and the Verdict text together («71 % · Sterkt samsvar»), never colour alone. Beside it: «5 av 7 nøkkelord» and the Verdict sentence. Strong match: «CV-en din dekker de fleste nøkkelordene annonsen nevner.» Needs work: «CV-en din dekker under 70 % av nøkkelordene annonsen nevner. Se hva som mangler nedenfor.» Then the formula line «Samsvar = nøkkelord funnet i CV-en ÷ alle nøkkelord i annonsen» and the disclaimer «Dette er et anslag på hvor mye av annonsens ordbruk CV-en din dekker – ikke resultatet fra et ekte ATS, og ingen spådom om intervjusjanser.» (FR-7, FR-8, D15). Under the FR-5 fallback with code-only Keywords: «Mindre presist: nøkkelordene er hentet ut uten KI.» |
| Keyword lists | Result, phase 1 | Two lists under the Score panel. **Nøkkelord du har:** each Matched keyword as a chip (✓) with its Evidence excerpt under it: «Funnet i CV-en: «…brukte React og TypeScript i semesterprosjektet…»». **Nøkkelord som mangler:** each Missing keyword as a chip (✕) with the code-written line «Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.» and the quoted ad line «Fra annonsen: «Erfaring med Docker og Kubernetes er en fordel.»». Once S4 exists, each Missing keyword gets a «Se vurdering» link that jumps to its Gap (FR-6, FR-8). On phones, the Evidence and ad lines collapse under each chip and expand on tap. |
| Evidence excerpt | Keyword lists, Gap callouts | A short, word-for-word quote of the CV text or Job ad in «sjevroner», with the matched Keyword in bold. Never paraphrased. Max about 160 characters, trimmed at word boundaries with «…». |
| Gap section | Result, phase 2 (S4) | Heading «Det som mangler» with the `{components.ai-label}` «Skrevet med KI» (FR-14). One callout per Gap, Rewordable gaps first. Real gaps and Rewordable gaps never look the same (label and glyph differ, not only colour). |
| Gap callout, Rewordable | Gap section | Label «Kan omformuleres». In order (FR-14): what is missing, why it matters in recruiter terms, and the CV entry that covers it, hedged («dekker trolig dette – vurder å ta det med»). Then the cited CV entry as an Evidence excerpt («Fra CV-en din: «…»»), then the Rewording suggestion («Forslag: «Samarbeidet tverrfaglig med designere og testere i et semesterlangt gruppeprosjekt.»») with «Kopier» (FR-16). No «legg til i CV» action exists. If FR-17 discards the suggestion, the callout keeps the citation and replaces the suggestion with «Ingen forslag her. Vurder selv om og hvordan du vil formulere det.» |
| Gap callout, Real | Gap section | Label «Mangler i CV-en». States the gap plainly and invites reflection without giving text to insert: «Annonsen ber om Kubernetes, og CV-en din viser det ikke. Har du brukt det i et emne eller prosjekt, kan du nevne det. Hvis ikke er dette et reelt gap.» No suggestion, no «Kopier» (FR-13). A Gap downgraded by FR-15 uses this same fixed template. |
| Letter view | Result, phase 2 (S3) | Heading «Søknadsbrev» and the label «Utkast skrevet med KI – les gjennom og tilpass før du sender.» (FR-9). The Letter is read-only text in `{components.letter-view}`. Buttons under it: «Kopier», «Last ned (.docx)» (file name `violet-hansen-soknadsbrev-nordic-digital-2026.docx`), and «Lag nytt utkast», which replaces the Letter using the Tone in the form; to change Tone, the Student opens «Endre» first (FR-12). Before S6 the sign-off shows the placeholder «[Navnet ditt]». |
| Letter warnings | Letter view | When FR-11 flags words, a warning list sits above the Letter, one line per flagged word: «Brevet nevner «Kubernetes», men CV-en din viser det ikke. Sjekk at brevet ikke påstår noe CV-en din ikke støtter.» Each flagged word in the Letter is highlighted (`{components.letter-flag}`: tint plus underline, never colour alone) and linked to its warning line. The Student decides what to change; nothing is removed automatically (P3). |
| Saved line | Result, after S6 | «Lagret i Historikk.» appears once the score exists (FR-21 saves at that point). Never shown before S6. |

### Accounts and storage (S6 + S7)

| Component | Use | Behavioural rules |
|---|---|---|
| History row | Historikk, Hjem | «Stillingstittel – Arbeidsgiver», the date («8. sep. 2026») and the score badge with its Verdict text. The whole row is one link to the Saved Application. No type tag (FR-21, D5). |
| Pagination | Historikk | «Forrige» / «Neste» plus «Side 2 av 4». 20 rows per page, newest first. No infinite scroll. |
| Trust line | Profil (near the CV text), Konto | «CV-en din og dokumentene som lages, lagres kryptert.» Shown only once FR-22 is implemented, never before S7. |
| Data note | Konto | «Vi lagrer bare CV-teksten, ikke filen du lastet opp. Alt du har lagret, slettes når emnet er ferdig.» (FR-23). |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Access code required | Any page, Hosted version, before S6 | Access-code screen only; nothing else renders. Wrong code: inline «Feil tilgangskode.» Asked once per browser session (FR-31). |
| Logged out | Hjem (after S6) | Same CTA-forward layout; «Lag skreddersydd søknad» routes to «Registrer deg». No locked teaser screen. |
| Empty history | Hjem, Historikk | «Ingen søknader ennå. Start med din første stillingsannonse.» plus the primary CTA. |
| Cold load | Hjem, Historikk, Saved Application | Skeleton rows matching the final layout; resolves on data. |
| Uploading / extracting | Dropzone | Filename plus indeterminate progress, «Henter ut teksten fra CV-en …». «Avbryt» available while in flight. |
| Upload rejected | Dropzone | Inline, `{colors.error}`: «Bare PDF- og TXT-filer støttes.» / «Filen er for stor.» No request sent. |
| No text in PDF | Dropzone | Inline, `{colors.error}`: «Vi fant ingen tekst i PDF-en. Den kan være skannet. Lim inn CV-teksten i stedet.» The paste field opens directly under the message (FR-1). |
| Length limit | CV text, Job ad, job title, employer | Field-level, `{colors.error}`: «CV-teksten må være mellom 200 og 20 000 tegn.» / «Stillingsannonsen må være mellom 200 og 15 000 tegn.» / «Maks 200 tegn.» (FR-2, FR-4). |
| CV not confirmed | Søknad | Field-level at the CV editor: «Bekreft CV-teksten før du går videre.» (FR-3). |
| Ad too short or unclear | Søknad | Fewer than 3 Keywords: inline at the Job ad field, `{colors.error}`: «Annonsen er for kort eller uklar til å analyseres. Lim inn hele stillingsannonsen, også kravene.» No score is shown (FR-4). |
| Scoring (phase 1) | Søknad | Normally under 2 seconds: the submit button shows busy, no separate progress view. Under the FR-5 fallback for a new Job ad: a progress line «Henter nøkkelord fra annonsen …». |
| Writing (phase 2) | Søknad result | The Score panel and Keyword lists are already shown. The Gap section and Letter view show placeholder blocks with «Skriver søknadsbrevet og vurderer det som mangler … Dette tar vanligvis under ett minutt.» Screen readers hear, via `aria-live="polite"`, first «Samsvar klart: 71 %, sterkt samsvar.», then «Søknadsbrev og vurdering er klare.» (NFR-2, NFR-4, D19). |
| Result complete | Søknad result | All sections rendered; «Lagret i Historikk.» after S6. |
| Partial result: AI failed or timed out | Søknad result | The score and keyword lists stay. The phase-2 sections are replaced by one inline `{colors.error}` message: «Søknadsbrevet og vurderingen kunne ikke lages. Samsvaret over er fortsatt riktig.» with «Prøv igjen», which retries only the AI part (NFR-5). Timeout after 90 seconds. |
| Partial result: Daily cap | Søknad result | Score stays. Phase-2 sections replaced by `{components.info-banner}`: «Du har brukt dagens 30 KI-forespørsler. Grensen nullstilles ved midnatt.» No retry button (FR-25). «Lag nytt utkast» shows the same message. |
| Partial result: not available in Test mode | Søknad result | For inputs other than the Example pair and the Fixtures. Score stays. Each phase-2 section shows `{components.info-banner}`: «Ikke tilgjengelig i testmodus. Bruk eksempelet for å se hele flyten.» (FR-27). |
| Letter flagged | Letter view | Letter warnings and highlights (see Component Patterns), `{colors.warning}` family (FR-11). |
| Suggestion discarded / Gap downgraded | Gap section | Silent to the Student apart from the changed callout (see Gap callouts). Logged without content (FR-15, FR-17). |
| Form validation error | Registrer deg, Logg inn, Profil, Access code | Inline, field-level, `{colors.error}`. «Passordet må ha minst 8 tegn.» / «Denne e-postadressen er allerede registrert.» / «Feil e-post eller passord.» Never a blocking modal. |
| Session expired | Global, after S6 | After 30 minutes without activity: redirect to «Logg inn» with «Økten din er avsluttet. Logg inn igjen for å fortsette.» A Job ad pasted on Søknad is kept and offered again after login: «Vi tok vare på stillingsannonsen du limte inn.» (FR-18). |
| Network or server failure | Global | Error banner (see Component Patterns); input kept. No offline mode. |
| Not found | Any URL | «Fant ikke siden. Den finnes ikke, eller du har ikke tilgang til den.» plus a link to Hjem (FR-19). |

## Interaction Primitives

JobAssistant is a text-in, text-out workflow tool, not a power-user surface; there is no custom keyboard-shortcut layer.

- Click or tap to act everywhere. Drag and drop is an enhancement on the dropzone, never the only path.
- Paste is the main input: the Job ad always, and the CV text as an alternative to upload. Plain textareas, no rich formatting.
- Copy is the main output: «Kopier» on the Letter and on each Rewording suggestion. The Letter can also be downloaded as .docx. Nothing is edited in the app except the CV text used for analysis (FR-3; PRD §10).
- Standard form behaviour: `Tab` order follows reading order, `Enter` submits single-line forms (never inside a textarea), `Esc` closes the topmost dialog or sheet, arrow keys move within the Tone radio group.
- Touch targets are at least 44 × 44 px on every interactive element (NFR-2).
- **Banned:** infinite scroll in Historikk, auto-advancing carousels, drag to reorder, one-click "add keyword to CV", auto-sending anything, auto-removing flagged Letter text.

## Accessibility Floor

Behavioural rules. Visual contrast lives in `DESIGN.md` (all pairs verified against WCAG 2.2 AA on 2026-11-08).

- WCAG 2.2 AA on every screen: Hjem, Registrer deg, Logg inn, Profil, Søknad with results, Historikk, Saved Application, Konto, Access-code screen, Not found (NFR-2).
- Meaning is never carried by colour alone: keyword chips pair colour with ✓ / ✕; every score badge, including History rows, shows its Verdict text; Gap callouts carry a text label; flagged Letter words are underlined as well as tinted and listed in the warning list.
- Uploads use a labelled `<input type="file">` with an accessible name; the dropzone is progressive enhancement.
- Progress is announced with `aria-live="polite"`, once for the score and once for the AI sections. Copy confirmations are announced too.
- The AI notice dialog traps focus, has an accessible name, and returns focus to «Lag søknad» on close.
- Focus rings use `{colors.accent}` (≥ 3:1 against background and surface).
- Form errors are tied to their field with `aria-describedby`.
- Every page sets `lang="nb"`.
- The score badge has a text alternative («Samsvar 71 prosent, sterkt samsvar»), and the ✓ / ✕ glyphs are hidden from screen readers where the chip's list heading already conveys them.
- Downloaded files are named descriptively (`violet-hansen-soknadsbrev-nordic-digital-2026.docx`), never `output.docx`.

## Responsive & Platform

Mock: [Mobile nav — six-item navbar collapsed and open, and the two-item navbar before accounts](mockups/key-mobile-nav.html).

| Breakpoint | Behaviour |
|---|---|
| `≥ 641px` | Full navbar, all items inline. |
| `≤ 640px`, six-item navbar | Items collapse into a hamburger. The persistent CTA «Lag søknad» stays outside it. Historikk, Profil, Konto and Logg ut live in the hamburger sheet. |
| `≤ 640px`, two-item navbar (before S6) | No hamburger: Hjem and Søknad stay inline, since two short links fit at 360 px. No persistent CTA. |
| All widths | Single column, `{spacing.gutter}` minimum side margin, no horizontal scroll from 360 px up (NFR-3). The Tone cards stack vertically below 641 px. |

Fully usable on a phone browser means: upload or paste the CV, paste the ad, read the result, «Kopier» and «Last ned (.docx)». PRD §9.3 checks this on a real phone at least once. No native app exists or is planned.

## Build-order variants

The UI must stay coherent at every build step and after every cut (PRD §5.1, D20, D22).

| Variant | What changes in the UI |
|---|---|
| **Before S6** (steps 1–5), and permanently if S6 + S7 are cut | Two-item navbar. Hjem's CTA goes straight to Søknad; no greeting, no recent list. Søknad always shows the CV dropzone and editor; the CV text lives in the browser session only. AI notice once per browser session; Daily cap counted per installation. Letter sign-off placeholder «[Navnet ditt]». No «Lagret i Historikk.», no trust line. Hosted version: Access-code screen once per browser session. |
| **Before S4** (steps 1–3), and if S4 is cut | No «Det som mangler» section. Missing keywords show only the code-written line and the ad quote; no «Se vurdering» link. FR-11 flags every Missing keyword found in the Letter. The Reflection Note has no AI-written part, so no «Skrevet med KI» marker in it. |
| **Before S5** (step 4), and if S5 is cut | Gap callouts exist. Rewordable gaps show the explanation and the cited CV entry, with no «Forslag» and no «Kopier». |
| **Full v1** (step 6 done) | Everything in this spine. |

## Inspiration & Anti-patterns

- **Lifted from Kickresume:** the start action up front, not buried. Kept on Hjem as the single dominant CTA card.
- **Rejected — Kickresume's playful, colourful register and Teal's UI:** about tone (evidence-first vs gamified), not palette warmth.
- **Rejected — in-app document editing:** the Letter is read-only, with copy and .docx download. Only the CV text used for analysis is editable (FR-3).
- **Rejected — black-box AI:** every score shows its formula and Evidence; every Gap shows its reasoning; AI-written parts are labelled.
- **Rejected — implying or fabricating qualifications:** suggestions may only reword facts already in the cited CV entry and never upgrade the kind of work or role («Kompetanse i sårvurdering», not «Forsket på sårvurdering») (FR-16, FR-17).
- **Rejected — ATS fear marketing:** the score is an estimate of keyword coverage for recruiters who search and skim, never "beat the filter" (D18, P4).
- **Rejected — features promising more than v1 does:** no visible placeholders for deferred features (the «Vurder CV» and «Vurder søknad» cards are removed, not disabled).

## Key Flows

### Flow 1 — Violet gets her first explained match and letter (PRD UJ-1; S1–S7)

Violet is a final-year informatics student applying for a junior frontend developer job at Nordic Digital. Her CV is mostly courses and one semester-long group project. First visit, laptop.

1. On Hjem she sees the «Lag skreddersydd søknad» card up front and clicks it. She lands on «Registrer deg» and enters her name, email and password.
2. She's redirected to Profil and uploads her CV as a PDF. The extracted text opens in the CV text editor; a line from her two-column layout is scrambled, so she fixes it and clicks «Bekreft CV-teksten».
3. She opens Søknad. Her CV text is already in place («Bruker CV-teksten fra profilen din»). She types «Frontendutvikler» and «Nordic Digital», pastes the ad and leaves the Tone on «Formell».
4. She clicks «Lag søknad». The AI notice appears once; she reads it and clicks «Jeg forstår, fortsett».
5. Within two seconds the Score panel appears; the Gap section and Letter view show «Skriver søknadsbrevet og vurderer det som mangler …».
6. **Climax:** the Reflection Note reads «71 % · Sterkt samsvar – 5 av 7 nøkkelord». Each Matched keyword shows the CV line it was found in. Under «Det som mangler», «Tverrfaglig samarbeid» is marked «Kan omformuleres»: it cites her semester project and suggests a new phrasing she can copy. «Kubernetes» is marked «Mangler i CV-en» and says so plainly, with nothing to paste. For the first time, Violet sees why the app judged her CV the way it did, and that it won't make things up for her.
7. The draft Letter appears, labelled as an AI draft. She clicks «Kopier» and pastes it into her own document, and also downloads the .docx. «Lagret i Historikk.»

Edge case: her PDF is a scan → «Vi fant ingen tekst i PDF-en …» and the paste field opens.
Failure: the AI part times out → the score stays, and «Prøv igjen» retries only the Letter and the Gaps.
**Without accounts** (before S6 or after the first cut): Violet starts on Hjem → Søknad, uploads and confirms her CV on Søknad, and gets the same result. Nothing is saved, and the Letter signs off with «[Navnet ditt]».

### Flow 2 — Violet comes back with a new job ad (PRD UJ-2; S6)

A few weeks later, Violet has found an ad for Junior produktanalytiker at Fjord Analytics.

1. She logs in with email and password and opens Søknad from the navbar. Her saved CV text is already in place.
2. She types the job title and employer, pastes the new ad and picks «Direkte» this time. The AI notice doesn't appear again.
3. The score appears at once: «54 % · Bør forbedres – 7 av 13 nøkkelord», with the sentence «CV-en din dekker under 70 % av nøkkelordene annonsen nevner. Se hva som mangler nedenfor.»
4. **Climax:** within a minute, «Det som mangler» shows three Rewordable gaps from her statistics coursework, each with a phrasing she could defend in an interview, and the Letter for this job. One sentence in the Letter is flagged: it mentions «SQL», which her CV doesn't show. She rewrites that sentence in her own document instead of sending a claim she can't back up.
5. Both Applications are now in Historikk, newest first, each row with its score and Verdict text. She can reopen them and copy or download, but not change them.

Edge case: she has updated her CV → she uploads the new version on Profil, confirms the extracted text, and it replaces the old CV text (FR-3, FR-20).

### Flow 3 — Kari, the examiner, runs the core flow without an API key (PRD UJ-3; FR-27, FR-29, FR-31)

Kari grades IBE160 portfolios: a clean machine, a fresh clone, no API keys, 15–20 minutes per group.

1. She follows the README; the app starts in Test mode. The banner «Testmodus – KI-svarene er forhåndslagret» is under the navbar on every page.
2. If accounts exist, she logs in as the test user named in the README; otherwise she goes straight to Søknad.
3. She clicks «Bruk eksempelet». The CV text (confirmed), job title, employer and Job ad fill in, and focus moves to «Lag søknad». No AI notice appears, because no text leaves the app.
4. **Climax:** the whole core flow runs with no key and no cost: the score from code, then the Gaps, Rewording suggestions and Letter from the Cached responses, through the same two phases a live run has.
5. She pastes her own ad to try it. The score still works; each AI section says «Ikke tilgjengelig i testmodus. Bruk eksempelet for å se hele flyten.»

On the Hosted version she opens the URL from the README, enters the Access code from the submission, and repeats the flow with the live AI.

### Deferred: standalone CV review

The earlier "Flow 2 — standalone CV review" (Vurder CV, Feedback Document) is deferred out of v1 (PRD D2, §5.3). Its patterns (dropzone → generating → feedback with the same voice) can be reused when the feature returns.
