---
name: JobAssistant
status: final
updated: 2026-11-13
design: ./DESIGN.md
sources:
  - ../../../../PRODUCT.md
  - ../../prds/prd-JobAssistant-2026-10-31/prd.md
  - ../../architecture/architecture-JobAssistant-2026-11-13/ARCHITECTURE-SPINE.md
---

# JobAssistant — Experience Spine

> Responsive web, laptop first, fully usable from 360 px. One role, the Student; the Examiner uses the same surfaces. Paired with `DESIGN.md` (concept 11 «Signal, varm»). Visual reference: [signal-varm.html](mockups/signal-varm.html), whose frame numbers (S01–S10, M1–M2) are cited below. S1–S7 (no leading zero) are the brief's scope items, built in PRD §5.1 steps 1–6. **The spines win on any conflict with the mock.** Every decision not backed by PRODUCT.md, the PRD or the mock was confirmed by Helene in the coaching round of 2026-11-09 (see `.memlog.md`).

## Foundation

- **Form factor:** a single responsive web app, used mostly on a laptop and sometimes in a phone browser. Every core flow works from 360 px, in one column (NFR-3). There is no native app (PRD §10).
- **UI system:** none. The architecture rules out a component library; components are custom and specified in DESIGN.md, Components. Styling is Tailwind CSS v4, with DESIGN.md tokens mapped to `@theme` variables in `src/app/globals.css`. Pages are Next.js 16 server components that render shells; Søknad, Profil and Historikk are client components that call the API through `src/shared/ui/api-client.ts` (architecture conventions).
- **Visual identity:** `DESIGN.md`. This spine references its tokens as `{path.to.token}`.
- **Text:** every UI string lives in `src/shared/ui/messages.nb.ts` (AD-7). The tables below are the source for that file.
- **Run modes:** the UI reads `RunMode { testMode, hosted, features, aiNotice }` from one client context (AD-4). The build order (PRD §5.1) means every surface has to work before and after accounts exist; see Build-order Variants.
- **Terms** follow PRD §3 exactly. UI labels:

| PRD term | UI label |
|---|---|
| Match score | «ATS-samsvar» as a label; «samsvar» in sentences («71 % samsvar») |
| Verdict | «Sterkt samsvar» / «Bør forbedres» |
| Matched / Missing keyword | «Funnet» / «Mangler» (lists: «Funnet i CV-en», «Mangler i CV-en») |
| Evidence | «Bevis» |
| Gap analysis | «Gapanalyse» |
| Rewordable gap / Real gap | «Omformulerbart gap» / «Reelt gap» |
| Rewording suggestion | «Omformuleringsforslag» |
| Letter | «Søknadsbrev» |
| Tone | «Tone i brevet»: «Formell», «Personlig», «Direkte» |
| Reflection Note | «Refleksjonsnotat» |
| History | «Historikk» |
| Test mode | «Testmodus» |
| Access code | «Tilgangskode» |
| Application | «søknad»; once saved, a catalogue entry `JA-NNN` |

## Information Architecture

| Surface | Exists from | Reached from | Purpose | Realises | Mock |
|---|---|---|---|---|---|
| Tilgangskode (`/tilgang`) | Step 1 until S6, Hosted version only | Any request without access before S6 (AD-12) | One field and «Åpne». Wordmark only, no nav. After S6 the code moves into «Registrer deg» and this screen is no longer shown. | FR-31 | S04 |
| Hjem, logged out | Step 1 | App open, wordmark, nav | Headline, «Lag skreddersydd søknad», the three outputs, the stance, the Example-ad pulse plot. | UJ-1, D2, D20 | S01 |
| Hjem, logged in | S6 | Nav | The same page as logged out; its button goes to Søknad. No separate logged-in variant and no recent-entries list. | FR-21 | S01 |
| Registrer deg | S6 | Hjem button (logged out), link from «Logg inn» | Navn, E-post, Passord; Tilgangskode on the Hosted version (FR-31). Then to Profil. | FR-18, FR-31, D14 | S02 |
| Logg inn | S6 | Nav (logged out), Søknad while logged out, session expiry | E-post, Passord; no Access code. Lands on Søknad. | FR-18 | S03 |
| Profil | S6 | Nav, after registration, the "no CV yet" notice on Søknad | The name from registration, read-only (no edit, per D14). Upload or paste the CV, correct the extracted text, «Lagre». | FR-1–FR-3, FR-20, D11 | S05, S05b |
| Søknad: form | Step 1 | Nav, Hjem button, Historikk button | CV text (from Profil after S6; upload or paste before S6), job title, employer, Job ad, Tone, submit. | FR-1–FR-4, FR-10, FR-20, FR-27 | S06 |
| Søknad: AI notice | Step 3 | First submit (not in Test mode) | Modal dialog; accept once. | FR-24 | S06b |
| Søknad: result (phase 1 → Refleksjonsnotat) | Step 2 (score), step 3 (Letter), steps 4–5 (Gaps) | Submit | Catalogue heading, pulse plot, score block, keyword lists, then Gapanalyse and Søknadsbrev. Replaces the form on the same page. | FR-5–FR-17, FR-21 | S07, S08, S08b, M2 |
| Saved Application | S6 | A Historikk row, the catalogue sequence link | The stored Refleksjonsnotat and Letter, read-only, with «Kopier» and «Last ned (.docx)»; no «Lag nytt utkast» (AD-8). | FR-21 | S08 layout |
| Historikk | S6 | Nav, «Se hele historikken» | The catalogue register, newest first, 20 per page. | FR-21, D5 | S09, S09b, M1 |
| Konto | S6 | Nav | E-post, entry count, «Logg ut», how data is stored and deleted. | FR-21, FR-23, D14 | S10 |
| Ikke funnet | Step 1 | Unknown URL, or another Student's record | The same message for both cases. | FR-19 | not mocked |

**Navigation** (`{components.app-bar}`):
- **Before S6** (and permanently if S6 + S7 are cut): Hjem · Søknad.
- **After S6, logged out:** Hjem · Søknad · Logg inn · Registrer deg. Søknad routes to «Logg inn» (FR-18).
- **After S6, logged in:** Hjem · Søknad · Profil · Historikk · Konto. Historikk shows its entry count. «Logg ut» is a button on Konto, with no confirmation (mock S10; FR-18 "one click").
- **Tilgangskode:** wordmark only.
- No drawer and no nested nav. A dialog stacks one level deep, never two. Collapse at ≤ 640 px: see Responsive & Platform.

**Catalogue numbering** (memlog decision):
- Each saved Application is a catalogue entry `JA-NNN`: three digits, zero-padded, numbered per Student from `JA-001` in the order the entries were created.
- The number is derived when the page renders, from the entry's position in the Student's creation order. History has no delete (D5), so the number never changes, and no new stored field is needed. From entry 1 000 the number simply grows a digit (`JA-1000`).
- It appears in: the Søknad form heading, where the next number is shown dimmed («JA-003 · Ny søknad»); the result heading («JA-002 · Nordic Digital»); the Historikk register and its range line («JA-001–JA-002»); Konto; the catalogue sequence link on a Saved Application («JA-001 · Fjord Analytics»); and the saved line «Lagret i Historikk som JA-002.».
- A number is used only when the Application is saved (FR-21: as soon as the score exists). A form left unsubmitted uses no number.
- **Without accounts** nothing is saved, so there is no number (decided 2026-11-09). The form heading reads «Ny søknad», and the result heading is the employer alone («Nordic Digital»), with the job title in the credits. Mock S08b shows a number without accounts; this decision overrides it.

## Voice and Tone

Microcopy rules. Brand voice lives in DESIGN.md, Brand & Style. The same rules bind AI-written Gap explanations and Rewording suggestions, and the Letter too, though it addresses the employer rather than the Student (NFR-1, P5).

| Do | Don't |
|---|---|
| «71 % samsvar – 5 av 7 nøkkelord» | «Wow, 71 %! 🎉» |
| «Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.» | «Oi, du mangler noen nøkkelord!» |
| «Linjen din dekker trolig dette – vurder å ta det med.» | «Legg til dette i CV-en.» (deciding for the Student, P3) |
| «Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.» | «Vi har lagt det til for deg.» (implies the app invents) |
| Use recruiter framing: «Annonsen ber om …» | «ATS-systemet vil sortere deg bort.» (FR-14, D18) |
| Say «du»; state the fact first, then the reason | «De»; exclamation marks; emoji; cheerleading |
| Use Norwegian words: «samsvar», «gapanalyse», «utkast» | English loanwords where a Norwegian word exists («Match score» on screen, «draft») |

- Formats: «71 %», «8. nov. 2026», sjevroner for quotes, space as the thousands separator («1 046 av 15 000 tegn»).
- «Samsvar», not «poengsum», in UI sentences (the mock says «poengsum» on Hjem and in the Test-mode banner).
- Anything the Student must judge is hedged.
- Code-strip labels are written in sentence case in the source and uppercased by CSS.

**Key strings.** Source: *PRD* or *PRODUCT* = fixed there; *Mock* = from concept 11; *Old UX* = carried from [UX 2026-09-11](../../_archive/ux-JobAssistant-2026-09-11/EXPERIENCE.md) (archived); *New* = drafted here. Old UX and New strings were accepted on 2026-11-09 and are still open for a wording review.

| Context | String | Source |
|---|---|---|
| **Tilgangskode** | | |
| Tilgangskode | «Denne nettversjonen av JobAssistant er stengt. Den er bare åpen for utvikleren og sensor. Skriv inn koden for å fortsette.» · hint «Minst 16 tegn. Du blir spurt én gang per nettleserøkt.» · «Åpne» | Mock |
| Tilgangskode errors | Wrong code: «Feil tilgangskode.» (Old UX) · under 16 characters: «Koden har minst 16 tegn.» (New) | Old UX / New |
| **Hjem** | | |
| Hjem headline | «Se hvilke av annonsens ord CV-en din dekker.» | Mock |
| Hjem lede | «Lim inn CV-en din og en stillingsannonse. Du får et samsvar du kan etterprøve, en ærlig gjennomgang av det som mangler, og et utkast til søknadsbrev som bare bygger på det CV-en din viser.» | Mock, «poengsum» → «samsvar» |
| Main button | «Lag skreddersydd søknad» | PRD UJ-1 |
| Hjem outputs | «ATS-samsvar» · «Gapanalyse med omformuleringer» · «Utkast til søknadsbrev» | Mock; first heading per PRD §3 (mock: «Match score») |
| Hjem stance | «Viser arbeidet. Finner aldri på.» | Mock |
| Hjem, before S6 | «Du kan prøve med eksempelet først. Det krever ingen konto.» Shown only before S6 (after S6, FR-18 requires login). | Mock |
| **Registrer deg / Logg inn** | | |
| Registrer deg | «Navn» · «E-post» · «Passord» (hint «Minst 8 tegn. Velg et passord du ikke bruker andre steder.») · «Tilgangskode» · «Har du allerede en konto? Logg inn» | Mock; «Minst 8 tegn» from FR-18 |
| Logg inn | «E-post» · «Passord» · «Har du ingen konto? Registrer deg» | Mock |
| Password and Access-code toggle | «Vis» · «Skjul» | New |
| Trust line (S6 + S7) | «CV-en din og dokumentene som lages, lagres kryptert.» | PRD FR-22 |
| Form errors | «Passordet må ha minst 8 tegn.» · «Denne e-postadressen er allerede registrert.» · «Feil e-post eller passord.» | Old UX |
| **Profil** | | |
| Profil | «Last opp eller lim inn» · «Velg fil» · hint «PDF eller TXT, maks 2 MB. Du kan også lime inn teksten direkte i feltet.» · «CV-tekst» · hint «PDF-er med to kolonner kan blande linjene. Les gjennom og rett det som har havnet feil før du lagrer.» · «Lagre» → «Lagret.» | Mock / PRD §5.1 |
| Upload rejected | «Bare PDF- og TXT-filer støttes.» / «Filen er for stor.» | PRD FR-1 |
| Extracting | «Henter ut teksten fra CV-en …» (after the file name; Profil, and Søknad before S6) | Old UX |
| Scanned PDF | alert «Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Lim inn teksten fra CV-en din i stedet.» · button «Velg en annen fil» · CV field hint «Lim inn teksten her. Minst 200 tegn.» | Mock (alert); FR-1, FR-2 |
| CV length | «CV-teksten må være mellom 200 og 20 000 tegn.» | Old UX; FR-2 |
| Profil, no CV yet | placeholder «Lim inn CV-teksten din» · hint «Lagre blir tilgjengelig når feltet har tekst.» | Mock S05b |
| **Søknad form** | | |
| Søknad heading | «JA-003 · Ny søknad» (after S6) / «Ny søknad» (before S6) | Mock / New |
| Søknad lede (after S6) | «Neste nummer i katalogen. Fyll inn annonsen, så regner vi ut hvilke av nøkkelordene CV-en din dekker.» | Mock |
| CV disclosure | «CV-tekst fra Profil» · hint «Teksten hentes fra Profil. Du endrer den i Profil.» | Mock, FR-3 (after S6 the CV text is edited only in Profil) |
| No CV yet (after S6) | «Du har ikke lagt inn CV-en din ennå.» + link «Gå til Profil» | Old UX / New |
| CV confirm (before S6) | «Bekreft CV-teksten» | Old UX |
| CV confirmed (before S6) | «CV-tekst bekreftet · 3 412 tegn» | New |
| CV not confirmed (before S6) | «Bekreft CV-teksten før du går videre.» (at the CV field, on submit) | Old UX; FR-3 |
| Fields | «Stillingstittel» · «Arbeidsgiver» · «Stillingsannonse» · «Tone i brevet» | PRD / Mock |
| Ad hint | «Lim inn hele annonseteksten, minst 200 tegn.» | Mock |
| Example | «Bruk eksempelet», always shown, with or without login and in every mode | PRD FR-27 |
| Tones | «Formell – Høflig og saklig» · «Personlig – Varm, med «jeg» i front» · «Direkte – Kort, rett på sak» | Mock (check against FR-10) |
| Submit | «Analyser og skriv utkast» | Mock |
| Job ad errors | «Stillingsannonsen må være mellom 200 og 15 000 tegn.» · «Fyll inn stillingstittelen.» · «Fyll inn arbeidsgiveren.» · «Maks 200 tegn.» | Old UX / New; FR-4 |
| Ad too short or unclear | «Annonsen er for kort eller uklar til å analyseres. Lim inn hele stillingsannonsen, også kravene.» | Old UX |
| Phase 1 progress (FR-5 fallback) | «Henter nøkkelord fra annonsen …» | Old UX |
| **AI notice** | | |
| AI notice title | «Teksten din sendes til en KI-tjeneste» | Mock |
| AI notice body | «For å skrive gapanalysen og søknadsbrevet sender vi CV-teksten og annonsen til {leverandør}. Ingenting er sendt ennå, og ingenting sendes før du godtar.» + points: «Samsvaret regnes ut her i appen, uten KI.» · «E-postadresser og telefonnumre fjernes før teksten sendes.» · «{Leverandør} trener ikke på teksten og sletter den etter {periode}.» · «Ta ikke med sensitive opplysninger som helse eller fødselsnummer.» · «Du blir bare spurt denne ene gangen.» | Mock + FR-24/FR-26 content, New wording |
| AI notice buttons | «Godta og fortsett» · «Avbryt» | Mock |
| **Result** | | |
| Back to the form | «Endre annonsen» | New |
| Plot figcaption (compact mode) | «Viser de 6 av 14 avsnittene som har nøkkelord. Tallet til venstre er avsnittet.» | Mock M2 |
| Phase 2 progress | «Skriver gapanalyse, omformuleringer og søknadsbrev … dette tar under ett minutt.» | Mock |
| AI placeholder | status «Skrives» · «Kommer om under ett minutt.» | Mock |
| Score | «71 % samsvar – 5 av 7 nøkkelord» | PRODUCT |
| Verdict | «Sterkt samsvar» + «70 % eller mer gir sterkt samsvar.» / «Bør forbedres» + «Under 70 % gir bør forbedres. Se hva som mangler nedenfor.» | PRD / Mock / New |
| Formula | «Formel» · «5 av 7 nøkkelord funnet = 71 %» | Mock |
| Disclaimer | «Et anslag på hvor mange av annonsens nøkkelord CV-en din dekker. Ikke en ekte ATS-vurdering, og ingen spådom om intervjusjanser.» | Mock + FR-8 clause |
| Less precise (FR-5 fallback only) | «Mindre presist: nøkkelordene er hentet ut uten KI.» | Old UX |
| Keyword lists | «Funnet i CV-en» · «Mangler i CV-en» | Mock |
| Missing line | «Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.» | PRD FR-8 |
| Source lines | «Bevis · CV-linje 8 · annonsen avsnitt 03» · «Fra annonsen · avsnitt 08» | Mock |
| Link to Gap | «Se gapanalysen» | New |
| Gap section | «Gapanalyse» + «Skrevet med KI» | Mock |
| Rewordable gap | «Sitert ordrett fra CV-en din · sjekket mot CV-teksten» · «Omformuleringsforslag» · hedge «Linjen din dekker trolig dette – vurder å ta det med.» | Mock |
| Real gap | «Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.» | Mock |
| Real gap template (FR-15 downgrade, skipped Keyword) | «CV-en din viser ikke «Kubernetes». Har du brukt det et sted som ikke står i CV-en, kan du skrive det inn selv, med dine egne ord.» | New |
| Suggestion discarded (FR-17) | «Ingen forslag her. Vurder selv om og hvordan du vil formulere det.» | Old UX |
| Letter label | «Utkast skrevet med KI – les gjennom og tilpass før du sender.» | PRD FR-9 |
| Letter actions | «Kopier» · «Last ned (.docx)» · «Lag nytt utkast» | PRD FR-12 |
| Letter hint | «Brevet kan ikke redigeres her. Kopier det eller last det ned, og tilpass det i ditt eget program. «Lag nytt utkast» skriver et nytt brev i samme tone.» | Mock |
| Letter warning (FR-11) | «Brevet nevner «X», men CV-en din viser det ikke. Sjekk at brevet ikke påstår noe CV-en din ikke støtter.» | PRD FR-11 |
| Upgrade-word warning (FR-11) | «Brevet bruker ordet «ledet», men CV-en din bruker det ikke. Sjekk at brevet ikke gjør rollen din større enn den var.» | New |
| Sign-off placeholder (before S6) | «[Navnet ditt]» | Old UX |
| Copy feedback | «Kopiert» · live: «Kopiert til utklippstavlen.» | Mock |
| Saved line | «Lagret i Historikk som JA-002.» | New (PRD §5.1 names a «Lagret.» message) |
| AI section failed | «Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.» / «Søknadsbrevet kunne ikke lages. Samsvaret over er fortsatt riktig.» + «Prøv igjen» | Old UX, split per section |
| Letter regenerating | «Skriver et nytt utkast …» | New |
| Daily cap | label «Dagens grense» · «Du har brukt dagens 30 KI-forespørsler. Grensen nullstilles ved midnatt.» | Old UX; FR-25 |
| Not available in Test mode | «Ikke tilgjengelig i testmodus. Bruk eksempelet for å se hele flyten.» | Old UX |
| Saved Application notices | missing section «Ikke laget.» · unchecked Letter «Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.» | New |
| **Live region** | | |
| Live: phase 1 | «Samsvaret er klart: 71 %, sterkt samsvar, 5 av 7 nøkkelord. Gapanalysen og søknadsbrevet skrives nå.» | New |
| Live: phase 2 | «Gapanalysen og søknadsbrevet er klare. Lagret i Historikk som JA-002.» · one failed: «Søknadsbrevet er klart. Gapanalysen kunne ikke lages.» · cap: «Dagens grense for KI er nådd. Samsvaret står fortsatt.» · Test mode, other ad: «Gapanalysen og søknadsbrevet er ikke tilgjengelige i testmodus.» (Without accounts, leave out the saved sentence.) | New |
| Live: retry | success «Gapanalysen er klar.» / «Søknadsbrevet er klart.» · failure: the section's failure sentence | New |
| Live: new draft | «Det nye utkastet er klart.» / «Det nye utkastet kunne ikke lages. Det forrige brevet står fortsatt.» | New |
| Live: example, pagination | «Eksempelet er fylt inn.» · «Side 3 av 4» | New |
| Clipboard blocked | «Kopier med Ctrl+C, eller hold inne på mobil.» (notice and live) | New |
| **Historikk** | | |
| Historikk | «Historikk» · «JA-001–JA-002 · 2 søknader, nyeste først» · «Åpne» · «Kopier brev» · «Last ned (.docx)» | Mock |
| Historikk read-only note | «Søknadene i katalogen kan ikke endres. Åpne en søknad for å se hele Refleksjonsnotatet.» | Mock |
| Historikk empty | «Ingen søknader ennå. Start med din første stillingsannonse.» + «Den første søknaden du lager, får nummer JA-001.» | PRD FR-21 + Mock, shortened |
| Pagination | «Forrige» · «Neste» · «Side 2 av 4» | Old UX |
| **Konto** | | |
| Konto | «E-post» · «Katalog» · «Logg ut» · «Slik lagres dataene dine» + the four mock lines | Mock |
| **Session** | | |
| Session expiry warning | title «Økten din avsluttes snart» · body «Du blir logget ut om 2 minutter fordi du ikke har gjort noe på en stund. Det du har skrevet, tas vare på.» · «Fortsett økten» · «Logg ut» | New |
| Session expired | «Økten din er avsluttet. Logg inn igjen for å fortsette.» | PRD FR-18 |
| Restored after expiry | Søknad: «Vi tok vare på stillingsannonsen du limte inn.» · Profil: «Vi tok vare på endringene du ikke hadde lagret.» | Old UX / New |
| **Ikke funnet** | | |
| Ikke funnet | `h1` «Fant ikke siden» + «Den finnes ikke, eller du har ikke tilgang til den.» + link «Til Hjem» | Old UX / New |
| **Every page** | | |
| Test-mode banner | «Testmodus – KI-svarene er forhåndslagret» + «Samsvaret regnes likevel ut av koden.» | PRD FR-27 (mock: «… lagrede eksempelsvar.») + Mock, edited |
| Field error label | «Feil» (code strip before the message) | New |
| Network failure | «Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.» | Old UX |
| Skip link | «Hopp til hovedinnholdet» | New |
| **Accessible names** | | |
| Accessible names (not visible) | file input «Velg fil, PDF eller TXT, maks 2 MB» · nav «Hovedmeny» · pagination «Sider» · table header «Handlinger» · table caption «Alle søknadene dine, nyeste først» · row buttons «Åpne JA-002», «Kopier brevet til JA-002», «Last ned JA-002 (.docx)» · page title «Søknad – JobAssistant» (pattern «{side} – JobAssistant») | New |

## Component Patterns

Behavioural rules. Visual specs live in DESIGN.md, Components, under the same names.

| Component | Use | Behavioural rules |
|---|---|---|
| App bar | Every page | The item set depends on the build variant and login state (IA). The current page carries `aria-current="page"`. The app bar and the Test-mode banner scroll with the page; they are never `position: sticky` or `fixed`. If that ever changes, `html { scroll-padding-top }` must equal their combined height. The `<nav>` is labelled «Hovedmeny». At ≤ 640 px the toggle reads «Meny», and «Lukk» when open; its accessible name always matches the visible label. It has `aria-expanded` and `aria-controls`. The open menu is never an overlay (layout: DESIGN.md, Components, App bar), so nothing behind it can hold focus. Esc closes it. Choosing a link navigates. Focus: see Accessibility Floor, Focus order. |
| Buttons | Everywhere | At most one primary per view. While a request runs, the triggering button is busy (`aria-disabled="true"`, label unchanged, with the visual cue in `{components.button-busy}`), and a second click does nothing (NFR-5). |
| Link | In-sentence links, standalone links («Se gapanalysen», «Gå til Profil», «Til Hjem»), register job titles, nav | A real `<a href>`, never a button styled as a link or the reverse. Always underlined (`{components.link}`), except nav links and register job titles, which are identified by their position and their focus ring. Standalone links have a hit area at least 24 px high (WCAG 2.5.8); only links inside a sentence are exempt. Focus: see Accessibility Floor, Focus order. |
| Copy button | Letter, each Rewording suggestion, Historikk rows | Copies plain text only. After S6, the Profile name replaces `{{SIGNATUR}}`; before S6, «[Navnet ditt]» does (AD-7). On success the label reads «Kopiert» for 1.8 s and the second polite region says «Kopiert til utklippstavlen.». In Historikk the accessible name includes the entry («Kopier brevet til JA-002»). Focus: see Accessibility Floor, Focus order. |
| Text field | All forms | The label sits above; hint and error are tied to the field with `aria-describedby`. Validation runs on blur and on submit, never per keystroke. Length-limited fields show a counter «612 av 20 000 tegn» that is announced only on blur. On error the field gets `aria-invalid="true"`. Input is never cleared by an error (NFR-5). Authentication fields never block paste, autofill or password managers, and never split a code into several boxes. Tokens: Navn `autocomplete="name"`; E-post `type="email" autocomplete="email"`; Passord on «Registrer deg» `autocomplete="new-password"`, on «Logg inn» `autocomplete="current-password"`; Tilgangskode `type="password" autocomplete="off"`, with paste allowed. Password and Access-code fields have a «Vis» / «Skjul» toggle (`{components.password-toggle}`, `aria-pressed`, 44 px). On a «Feil e-post eller passord.» error the email is kept. |
| File picker | Profil; Søknad before S6 | One tab stop: the native `<input type="file">`, visually hidden (not `display:none`), with the accessible name «Velg fil, PDF eller TXT, maks 2 MB». The visible «Velg fil» is its `<label>`, styled as `{components.button-secondary}`, not a second button. While the input has `:focus-visible`, the amber ring is drawn on the label (`:has(input:focus-visible)`). Type and size are checked before any request (FR-1). While text is extracted, the file name shows with the Extracting line (Key strings). On success the CV text field fills with the extracted text for review (FR-3). The file name is shown only during this session; it is never stored (FR-23, D12). |
| CV disclosure | Søknad after S6 | Collapsed by default, showing the character count and the Profile's save date. Opened, it shows the CV text read-only, with «Du endrer den i Profil» linking to Profil (FR-3, FR-20, AD-6, AD-16). Before S6, the same slot holds the file picker and the editable CV text with «Bekreft CV-teksten»; once confirmed it collapses to the CV-confirmed line (Key strings), and any edit requires confirming again. |
| Tone choice | Søknad | One native radio group in a `fieldset` with the legend «Tone i brevet». «Formell» is preselected (FR-10). The whole option is the hit area; arrow keys move within the group. The radio is the tab stop, and the focus ring is drawn inset on the whole option (`{components.focus-ring}`). The chosen Tone is used by «Lag nytt utkast». |
| Code strip | Keyword entries, verdict, Gaps, section headers, banner | Real text, never an image. The label alone carries the meaning; the colour repeats it (NFR-2). Not interactive. |
| Catalogue heading | Søknad form and result, Saved Application, Profil («CV · Violet Hansen») | The page's single `h1`. A Saved Application adds the catalogue sequence nav: a link to the previous entry and «Historikk». Focus: see Accessibility Floor, Focus order. |
| Credits list | Under the catalogue heading; Konto | A `<dl>`: Stilling, Dato, Tone, Annonse («14 avsnitt · 7 nøkkelord»). Read-only. |
| Pulse plot | Hjem (Example ad), Søknad result, Saved Application; flat on the Søknad form and in empty Historikk | Drawn in the browser from the Job ad text and the phase-1 keyword lists. Each paragraph (split on blank lines) is a line; each Keyword peaks at its first position in its paragraph. The drawing is deterministic: the same ad gives the same plot. It redraws after fonts load and on resize (debounced 150 ms). It has no hover, tooltip or focusable part; the keyword lists below are its full equivalent. Before phase 1 (the form) it is flat and `aria-hidden`. |
| Score block | Result, phase 1 onward | Shows the score sentence, verdict strip and threshold sentence, formula and disclaimer together. It never waits for AI (FR-8, NFR-4). With the FR-5 fallback's code-only Keywords, a `{components.notice}` «Mindre presist …» sits under the formula. |
| Keyword entry | Result: «Funnet i CV-en», «Mangler i CV-en» | Matched: the Keyword, `{components.code-found}`, the Evidence quote and the source line. Missing: the Keyword, `{components.code-missing}`, the FR-8 template line, the quoted ad line and its source line. Once S4 exists, each Missing entry ends with «Se gapanalysen», an in-page link to its Gap entry's `h3` (FR-8). Focus: see Accessibility Floor, Focus order. |
| Evidence quote | Keyword entries, Rewordable gap | Word-for-word from the CV text or the Job ad, in sjevroner, with the Keyword marked. Never paraphrased. Trimmed at word boundaries with «…» past about 160 characters (Old UX). |
| Gap entry | Gapanalyse (S4) | One per Missing keyword, in the order of the Missing list. The label strip («Omformulerbart gap» / «Reelt gap») makes the two kinds differ by text, not only colour. The AI explanation follows the FR-14 order: what is missing, why it matters, the CV entry. A Gap downgraded by FR-15, or one the AI skipped, renders as a Real gap with the template line and nothing else (AD-14). |
| Suggestion box | Rewordable gap (S5) | The Rewording suggestion with a small «Kopier». The fixed hedge line always follows it. There is no "add to CV" action (FR-16, P3). If FR-17 discards the suggestion, the box is replaced by the discard line, and the citation stays. |
| No-copy note | Real gap | Always present on a Real gap. Nothing in a Real gap is copyable (FR-13). |
| Letter view | Result (S3), Saved Application | Read-only text, never an editable field. «Kopier» (primary), «Last ned (.docx)» and, on a fresh result only, «Lag nytt utkast». The .docx gets an ASCII file name such as `violet-hansen-soknadsbrev-nordic-digital-2026.docx` (FR-12); before S6 the name is left out (`soknadsbrev-nordic-digital-2026.docx`). Rendered as `<article aria-labelledby="letter-h2" aria-describedby="letter-ai-label">`, where `letter-h2` is the id of the «Søknadsbrev» `h2` and `letter-ai-label` the id of the AI label «Utkast skrevet med KI – les gjennom og tilpass før du sender.». Never a textarea, never `contenteditable`, and never `aria-label` on a `div`. |
| Letter flag | Letter view | When `/api/analyses/[id]/letter-check` returns flags (FR-11), a warning list sits between the AI label and the Letter, one line per flagged word. Each highlighted word in the Letter is linked to its warning line. Nothing is removed or rewritten automatically; the Student decides (P3). The flags are re-checked after «Lag nytt utkast» and after a successful Gaps retry (AD-6, AD-8). |
| Progress line | Result, phase 2 | Shown while any AI section is pending; removed when all have settled. Plain text with no role and no `aria-live` (a `role="status"` would make it a live region). Screen-reader users learn about phase 2 from the phase-1 announcement. The trace animates for at most 5 s, then holds still (WCAG 2.2.2). |
| AI placeholder | Result, phase 2 | One slot per AI section in the current build variant: «Gapanalyse» (S4; rewordings live inside it) and «Søknadsbrev». The mock's third slot «Omformuleringer» folds into Gapanalyse. Each slot resolves on its own, because Gaps and Letter are separate requests (AD-6). `aria-busy="true"` until resolved. Headings: see Accessibility Floor, Headings. |
| Alert | Field and section errors | Rust «Feil» strip + message. Upload failures use `role="alert"`; section failures inside the result hold «Prøv igjen», which retries only that section (AD-6, NFR-5). Retry and regenerate outcomes use the second polite region (Accessibility Floor, Other status messages). |
| Notice | Non-error section states | Daily cap, "not available in Test mode", less precise Keywords, "not generated" and "not checked" on a Saved Application, a Job ad kept after session expiry, an unsaved CV draft restored in Profil. Never `role="alert"`. |
| Banner | Test mode | Directly under the app bar on every page while `testMode` is true. Not dismissible (FR-27). `role="note"`. |
| Dialog | AI notice | Modal (`role="dialog"`, `aria-modal`, labelled by its title, described by its body). Shown before phase 1 when `testMode` is false and the accepted notice version differs from `aiNotice.version`: once per account after S6, once per browser session before (FR-24, AD-4, AD-13). Built with native `<dialog>` and `showModal()` (background inert by default). Clicking the scrim does nothing (only «Avbryt», Esc or «Godta og fortsett» close it). Esc equals «Avbryt», which closes it with every input kept and sends nothing. «Godta og fortsett» records acceptance and starts phase 1. Focus: see Accessibility Floor, Focus order. |
| Expiry warning | Any page, after S6 | `role="alertdialog"` on a native `<dialog>` opened with `showModal()`, labelled by its title and described by its body. Opens two minutes before 30 minutes of inactivity (see State Patterns, Session expiring). «Fortsett økten» (primary) renews the session and closes the dialog. Esc equals «Fortsett økten» (a key press is activity). «Logg ut» works like «Logg ut» on Konto. Clicking the scrim does nothing. If the AI notice is open, the warning replaces it, and the AI notice reopens afterwards: one dialog level, never two. If the warning runs out, the session ends (see State Patterns, Session expired). Focus: see Accessibility Floor, Focus order. |
| Catalogue register | Historikk | A `<table>` with a hidden caption «Alle søknadene dine, nyeste først» on laptop; an `<ol>` at ≤ 640 px, not a restyled table. Each row shows number, job title (link to the Saved Application), employer, date, score sentence and verdict strip (FR-21), plus «Åpne», «Kopier brev» and «Last ned (.docx)». No search, delete or rename (D5). 20 per page with «Forrige» / «Neste» and «Side 2 av 4»; no infinite scroll. Column headers are `<th scope="col">` (the actions column has a visually hidden header «Handlinger»). The job-title cell is `<th scope="row">`. Only one structure is in the accessibility tree at a time: the table and the `<ol>` are swapped by the same 640 px media query with `display: none`, never both visible to assistive technology. Pagination is a `<nav aria-label="Sider">`. «Forrige» is absent (not disabled) on page 1, and «Neste» is absent on the last page. Row buttons: «Åpne JA-002», «Kopier brevet til JA-002», «Last ned JA-002 (.docx)». |
| Empty state | Historikk with no entries | The FR-21 sentence and the primary «Lag skreddersydd søknad». The ghost number and flat plot are `aria-hidden`. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Access required | Any page, Hosted version | Before S6: redirect to Tilgangskode; nothing else renders (AD-12). After S6: «Registrer deg» is the only place that asks for the code (FR-31). A wrong or too-short code gets a field error (Key strings, Tilgangskode errors). The code is asked for once per browser session (FR-31). |
| Logged out, after S6 | Søknad, Profil, Historikk, Konto | Redirect to «Logg inn» (FR-18). Hjem stays reachable; its button goes to «Registrer deg». |
| Session expiring | Any page, after S6 | Activity is any key, pointer or input event in the page, not only server requests. While the Student is active, the client renews the session at most once every 5 minutes (a lightweight authenticated request). Two minutes before 30 minutes of inactivity, the expiry warning opens (`{components.expiry-warning}`). Behaviour: Component Patterns, Expiry warning. Strings: Key strings, Session expiry warning. |
| Session expired | Any page, after S6 | Only after the warning has run out: «Logg inn» with the Session expired alert (Key strings; PRD FR-18). The email field on «Logg inn» is prefilled. After login, Søknad shows its Restored-after-expiry notice (Key strings), with the Job ad, job title, employer and Tone restored (AD-16). Unsaved CV text being edited in Profil is kept in the client session as a draft (`inputs.cvDraft`, cleared on «Lagre» and on «Logg ut»); after login, Profil restores it with its Restored-after-expiry notice (AD-16; FR-18). |
| Form errors | Registrer deg, Logg inn | Field-level (Key strings, Form errors). Never a modal. Errors from the server go into the field's error slot. On «Feil e-post eller passord.» the email is kept. Focus: see Accessibility Floor, Focus order. |
| Cold load | Historikk, Saved Application, Profil, Konto | Ruled skeleton rows in `{colors.rule}`, matching the final layout; no animated shimmer. |
| Upload rejected | File picker | Before any request (Key strings, Upload rejected; PRD FR-1). |
| Extracting | File picker | File name + the Extracting line (Key strings). |
| Scanned PDF | Profil (S05b), Søknad before S6 | `{components.alert}` with `role="alert"` (Key strings, Scanned PDF). The file-picker border turns rust, the button reads «Velg en annen fil», and the empty CV text field gets its paste hint (FR-1, FR-2). Focus: see Accessibility Floor, Focus order. |
| CV length | CV text | Field error (Key strings, CV length; FR-2). |
| Profil, no CV yet | Profil (first visit after registration) | Empty CV text field with its placeholder; «Lagre» stays unavailable, with a hint (Key strings, Profil, no CV yet; Mock S05b). |
| Profil saved | Profil | «Lagret.» next to «Lagre» (PRD §5.1); announced through the second polite region. |
| No CV in Profile | Søknad, after S6 | A notice in place of the CV disclosure (Key strings, No CV yet) with the link «Gå til Profil». Submit is unavailable until a CV exists (FR-20). |
| CV not confirmed | Søknad, before S6 | On submit, a field error at the CV field (Key strings, CV not confirmed; FR-3). |
| Job ad errors | Søknad | Field errors (Key strings, Job ad errors; FR-4). Focus: see Accessibility Floor, Focus order. |
| Ad too short or unclear | Søknad | Fewer than 3 Keywords: alert at the Job ad field (Key strings, Ad too short or unclear). No score, no result view (FR-4). |
| Phase 1 running | Søknad | Usually under 2 s: the submit button is busy, with no separate view. Under the FR-5 fallback for a new ad: an unannounced progress line (Key strings, Phase 1 progress). |
| Phase 1 done, phase 2 running | Result (S07) | Heading, plot, score block and keyword lists are shown. The progress line and one AI placeholder per section are below. One announcement: the phase-1 line (NFR-2). |
| Result complete | Result (S08) | All sections shown; the progress line is removed; one announcement: the phase-2 line. After S6, «Lagret i Historikk som JA-002.» appears under the heading. |
| AI section failed or timed out | Result | After 90 s, or on a provider error, that section's placeholder becomes an alert with «Prøv igjen» (Key strings, AI section failed; NFR-4, NFR-5, AD-6). The other section is unaffected. The retry outcome is announced in the second polite region. Focus: see Accessibility Floor, Focus order. |
| Analysis stale | Result | On `ANALYSIS_STALE` the client silently reruns phase 1, then the AI sections (AD-6). No message unless the rerun fails. |
| Daily cap reached | Result, «Lag nytt utkast» | The score stays. Each AI section shows a notice labelled «Dagens grense» (Key strings, Daily cap; FR-25). No retry. |
| Test mode | Every page | The banner. No AI notice. «Lag nytt utkast» shows the cached Letter for the chosen Tone again (FR-27). |
| Not available in Test mode | Result | For inputs that are not the Example pair or a Fixture: the score stays; each AI section shows a notice labelled «Testmodus» (Key strings, Not available in Test mode; FR-27). |
| Letter flagged | Letter view | The warning list and highlights (FR-11). |
| Gap downgraded / suggestion discarded | Gapanalyse | Shown only through the changed entry (Real-gap template, or discard line). Nothing else tells the Student (FR-15, FR-17). |
| Letter regenerating | Letter view | The current Letter stays visible, and the unannounced progress line returns above it (Key strings, Letter regenerating). On success the Letter is replaced and re-checked; on failure the old Letter stays, with an alert and «Prøv igjen» (FR-12, AD-8). The outcome is announced in the second polite region (Key strings, Live: new draft). Focus: see Accessibility Floor, Focus order. |
| Saved Application: missing section | Saved Application | A notice «Ikke laget.» in place of the section (AD-8). A Letter saved without a completed check shows the unchecked-Letter notice (Key strings, Saved Application notices). |
| Historikk empty | Historikk (S09b) | The empty state. |
| Logged out by choice | Konto | «Logg ut» ends the session at once, with no confirmation, and goes to Hjem, logged out. The client session is cleared except for the Job ad fields; the CV draft is cleared too (AD-16). |
| Network failure | Any request | Alert at the top of the content (Key strings, Network failure), with `role="alert"`. Input kept. No offline mode. Focus: see Accessibility Floor, Focus order. |
| Not found | Any URL, another Student's record | The Ikke funnet page (Key strings, Ikke funnet; FR-19). |

## Interaction Primitives

JobAssistant is a text-in, text-out tool. There is no custom shortcut layer.

- **Paste in, copy out.** The Job ad is always pasted; the CV is uploaded or pasted. The main outputs are «Kopier» and «Last ned (.docx)». Nothing is edited in the app except the CV text used for analysis (FR-3, PRD §10).
- **Copy:** Clipboard API, plain text, with the name substituted (AD-7); feedback as described in Component Patterns, Copy button. If the clipboard is blocked, the text is selected and a notice says «Kopier med Ctrl+C, eller hold inne på mobil.».
- **Download:** «Last ned (.docx)» starts a normal browser download with an ASCII file name (FR-12). There is no download of the Refleksjonsnotat (D4).
- **«Lag nytt utkast»:** one click, no confirmation. It uses the Tone from the form, replaces the Letter in the Application, and counts toward the Daily cap (FR-12). It is offered only on a fresh result, never on a Saved Application, because the server never rebuilds inputs from a stored Application (AD-8). To change the Tone, the Student goes back to the form with «Endre annonsen», a secondary button in the result's heading row that reopens the form with every input kept.
- **Dialogs:** see Component Patterns, Dialog and Expiry warning. The AI notice and the session-expiry warning are the only modals in the product, and never open at the same time.
- **Pulse plot:** look only. There is no hover, zoom or click in v1. The legend explains the line kinds in text.
- **Keyboard:** Tab order follows reading order on every surface. Enter submits single-line forms, never inside a textarea. Space or Enter toggles the CV disclosure (native `<details>`). Arrow keys move within the Tone group. Esc closes the dialog and the open mobile menu. Skip link and landmarks: see Accessibility Floor, Skip link and landmarks.
- **Touch:** every target is at least 44 × 44 px (`{spacing.touch-target}`); inline links within sentences are the WCAG 2.5.8 exception.
- **Banned:** one-click "add keyword", auto-sending, auto-removing flagged Letter text, in-app Letter editing, infinite scroll, carousels, drag as the only path, a second modal on top of the dialog.

## Accessibility Floor

Behavioural. Visual contrast lives in DESIGN.md, Colors (all text pairs ≥ 4.5:1, control boundaries ≥ 3:1, measured 2026-11-09).

- WCAG 2.2 AA on every surface in the IA table, including Tilgangskode and Ikke funnet. Checked with axe (0 serious or critical violations) and a keyboard-only walk of UJ-1 (NFR-2, PRD §9.3). Every page sets `lang="nb"` (NFR-1).
- **Two announcements per Application.** One visually hidden `role="status"` region (`aria-live="polite"`) per Søknad page speaks exactly twice: the phase-1 line when the score renders, and the phase-2 line when the last AI section settles (naming any section that failed). The score block, keyword lists and AI sections are not live regions themselves (the mock marks two whole sections live, which would read them out in full). Copy confirmations and «Lagret.» use the second polite region. The region is rendered empty with the page shell, outside the form/result subtree, so it survives the form being replaced by the result. Its text is replaced (never appended) for each announcement. The phase-1 line ends with what happens next (Key strings, Live: phase 1). Events after phase 2 (retry, «Lag nytt utkast») use the second polite region (see Other status messages) and don't count toward the two.
- **Other status messages** go to the second polite region (the one used for «Kopiert til utklippstavlen.» and «Lagret.»): retry outcomes, «Lag nytt utkast» outcomes and a blocked clipboard. Strings: Key strings, Live: retry, Live: new draft, Clipboard blocked.
- **Skip link and landmarks:** a skip link «Hopp til hovedinnholdet» is the first focusable element on every page and targets `<main id="hovedinnhold" tabindex="-1">`. On Tilgangskode (wordmark only) the skip link is still present. Every page has one `<header>` (app bar and Test-mode banner), one `<main>` and no content outside landmarks. The banner sits inside `<header>`, after the `<nav>`.
- **Errors that arrive from the server:** field errors (wrong password, email taken, wrong Access code, ad too short or unclear) are written into the field's `aria-describedby` error slot, the field gets `aria-invalid="true"`, and focus moves to it. The network-failure alert uses `role="alert"`, and focus stays where it was.
- **Focus order:**
  - Søknad form, before S6: skip link → app bar → «Velg fil» → CV-tekst → «Bekreft CV-teksten» → Stillingstittel → Arbeidsgiver → «Bruk eksempelet» → Stillingsannonse → Tone → «Analyser og skriv utkast».
  - Søknad form, after S6: skip link → app bar → CV disclosure (or the «Gå til Profil» link in the No-CV notice) → Stillingstittel → Arbeidsgiver → «Bruk eksempelet» → Stillingsannonse → Tone → «Analyser og skriv utkast».
  - Result: `h1` (focused after phase 1, `tabindex="-1"`) → «Endre annonsen» → score block → keyword entries with «Se gapanalysen» → Gapanalyse (suggestion «Kopier», or «Prøv igjen») → Letter warnings → Letter actions (or «Prøv igjen»). The plot is skipped (not focusable).
  - Phase 2: focus is never moved when AI sections arrive or fail.
  - «Endre annonsen»: the form replaces the result, and focus moves to the form's `h1` («Ny søknad» / «JA-003 · Ny søknad», `tabindex="-1"`).
  - «Prøv igjen»: focus moves to that section's `h2` («Gapanalyse» / «Søknadsbrev», `tabindex="-1"`), which is always present (see Accessibility Floor, Headings).
  - «Lag nytt utkast»: focus stays on the button (busy while running, see Component Patterns, Buttons).
  - «Kopier»: focus stays on the button.
  - In-page links move focus to their target. «Se gapanalysen» targets its gap's `h3` (`id`, `tabindex="-1"`).
  - Mobile menu: Esc closes it and returns focus to «Meny».
  - «Bruk eksempelet»: the fields fill, focus moves to «Analyser og skriv utkast», and the second polite region says «Eksempelet er fylt inn.».
  - Pagination: focus moves to the register's caption (laptop) or the page `h1` (≤ 640 px), and the second polite region says «Side 3 av 4».
  - Every page navigation, including redirects: focus starts at the top of the document, so the skip link comes first, and the new page's `<title>` names the page («Søknad – JobAssistant»).
  - Errors: focus moves to the first invalid field.
  - Dialog: focus starts on the title (`tabindex="-1"`), so the body is read before the buttons. Focus is trapped in the dialog. On close, focus returns to «Analyser og skriv utkast». Expiry warning: focus starts on «Fortsett økten» and returns to where it was.
  - Scanned PDF: focus moves to the empty CV text field.
- **Pulse plot text alternative:** `role="img"` with an `aria-label` built from the data: «14 avsnitt i annonsen tegnet som puls. Funnet i CV-en: React, TypeScript, smidig utvikling, Git, universell utforming. Mangler: tverrfaglig samarbeid, Kubernetes.» In compact mode it starts «6 av 14 avsnitt …». The keyword lists directly below carry the same facts in full. The flat plot is `aria-hidden`.
- **Meaning never by colour alone:** every code colour has its text label; the plot uses line weight, dashes and the words «FUNNET» / «MANGLER»; verdicts are always written out, including in Historikk rows (FR-21); flagged Letter words are underlined and listed, not only tinted.
- **Headings:** one `h1` per page and no skipped levels. Refleksjonsnotat outline: h1 catalogue heading → h2 score sentence → h2 «Funnet i CV-en» / «Mangler i CV-en» (h3 per Keyword) → h2 «Gapanalyse» (h3 per Gap) → h2 «Søknadsbrev». `h1` per surface: Hjem = the headline; Registrer deg / Logg inn / Tilgangskode = the page name; Profil, Søknad, result, Saved Application = the catalogue heading; Historikk, Konto = the title; Ikke funnet = «Fant ikke siden». The AI placeholder renders the section's real `h2` («Gapanalyse», «Søknadsbrev») from the start; the `h2` stays in the DOM through placeholder → alert → content and is never removed. Keyword and Gap code strips sit inside the `h3` after the keyword («Kubernetes Reelt gap»), and section strips (such as «Skrevet med KI» on Gapanalyse) inside the `h2`. In the catalogue heading the `·` is `aria-hidden`, with a visually hidden comma in its place.
- **Names:** every icon is `aria-hidden` next to a visible label. Repeated row buttons carry the entry in their accessible name. The Letter view is named by its «Søknadsbrev» `h2` and described by its AI label (see Component Patterns, Letter view).
- **Language of parts:** keywords and technical terms from the ad (React, TypeScript, Kubernetes) are not marked up with `lang`; they are technical terms (3.1.2 exception). Quoted ad and CV lines are rendered as-is under `lang="nb"`; no language detection in v1 (an accepted limit, noted in `docs/qa/`). The wordmark's source text is «JobAssistant», uppercased by CSS like the caps roles.
- **Reduced motion** (`prefers-reduced-motion: reduce`): the progress trace is static from the start, as in the mock; the chevron rotation and the tone-indicator scale change instantly; there is no smooth scrolling. Without the preference, the trace still stops after 5 s (WCAG 2.2.2).
- **Focus visible:** every focusable element shows the ring on `:focus-visible`, and it is never removed. No ancestor of a focusable element uses `overflow: hidden` in a way that clips the ring. Visual spec and ratios: `{components.focus-ring}` (DESIGN.md, Components, Focus ring).

## Key Flows

### UJ-1. Violet gets her first explained match and letter

Violet is a final-year informatics student applying for Junior frontendutvikler at Nordic Digital. Her CV is mostly courses and one semester-long group project. First visit, not logged in, laptop browser.

1. **Hjem (S01):** she clicks «Lag skreddersydd søknad» and lands on **Registrer deg (S02)**. She enters Navn, E-post and Passord (plus the Tilgangskode on the Hosted version) and registers.
2. **Profil (S05):** she uploads her CV as a PDF. The extracted text appears in the CV text field. She fixes a line that the two-column layout scrambled, and clicks «Lagre» → «Lagret.».
3. **Søknad, form (S06):** the heading reads «JA-001 · Ny søknad», and the CV disclosure holds her Profile text. She types «Junior frontendutvikler» and «Nordic Digital», pastes the ad, picks a Tone, and clicks «Analyser og skriv utkast».
4. **AI notice (S06b):** shown once. She reads it and clicks «Godta og fortsett».
5. **Phase 1 (S07):** within about two seconds, «JA-001 · Nordic Digital» appears with the pulse plot, the score block and both keyword lists. The progress line says the Gapanalyse and Søknadsbrev are being written. A screen reader announces the score once.
6. **Climax, Refleksjonsnotat (S08):** «71 % samsvar – 5 av 7 nøkkelord», «Sterkt samsvar», and the formula «5 av 7 nøkkelord funnet = 71 %». Every Funnet keyword quotes the CV line it came from. «Tverrfaglig samarbeid» is an Omformulerbart gap: it quotes her semester project word for word and offers an Omformuleringsforslag with «Kopier». «Kubernetes» is a Reelt gap: stated plainly, with «Ingen tekst å kopiere.». The Letter appears under «Utkast skrevet med KI – les gjennom og tilpass før du sender.». She can trace every claim back to her own CV.
7. **Resolution:** she clicks «Kopier» (or «Last ned (.docx)») and edits the Letter in her own document. The saved line reads «Lagret i Historikk som JA-001.»

- **Edge case:** her PDF is a scan → the scanned-PDF alert (S05b), focus in the CV text field, and she pastes the text instead (FR-1).
- **Failure:** the AI sections time out after 90 s → the score stays, and each failed section offers «Prøv igjen» (NFR-5).
- **Without accounts:** Hjem's button goes straight to Søknad. She uploads and confirms her CV there, with no catalogue number, and gets the same Refleksjonsnotat. Nothing is saved; the Letter signs off «[Navnet ditt]» (PRD §5.1).
- The mock's sample data numbers Nordic Digital `JA-002`. Following the UJ order, it is `JA-001` here.

### UJ-2. Violet comes back with a new job ad

A few weeks later, Violet has found an ad for Junior produktanalytiker at Fjord Analytics. She is a returning user with a saved Profile.

1. **Logg inn (S03):** she logs in with e-post and passord and lands on **Søknad**.
2. **Søknad, form:** «JA-002 · Ny søknad». Her saved CV text is already in the CV disclosure. She pastes the new ad, types the job title and the employer, and picks a Tone. The AI notice does not appear again (FR-24).
3. **Phase 1:** «57 % samsvar – 4 av 7 nøkkelord», «Bør forbedres», with its threshold sentence.
4. **Climax:** the score for this ad is there within seconds; within a minute the Gapanalyse with Omformuleringsforslag and the Letter follow, all written for this job.
5. **Resolution:** **Historikk (S09)** lists JA-002 Fjord Analytics above JA-001 Nordic Digital, each with its score sentence and verdict strip. She can reopen, copy and download either one, but not change it.

- **Edge case:** she has updated her CV → on Profil she uploads the new version, corrects the extracted text and saves; it replaces the old CV text (FR-3, FR-20). JA-001 still shows its original snapshot (AD-8).
- **Failure:** she leaves the tab while reading the ad. After 28 minutes without activity the expiry warning opens; she is away and does not press «Fortsett økten», so the session ends → «Logg inn» with the session message and her email prefilled. After login, Søknad offers her pasted ad again (FR-18, AD-12, AD-16).
- **Without accounts:** UJ-2 starts with a new upload on Søknad, and nothing from UJ-1 is kept (PRD §5.1).

### UJ-3. Kari, the examiner, runs the core flow without an API key

Kari grades IBE160 portfolios: a clean machine, a fresh clone, no API keys, and 15–20 minutes per group.

1. She follows the README, and the app starts in Test mode. The **banner** «Testmodus – KI-svarene er forhåndslagret» sits under the app bar on every page.
2. If accounts exist, she logs in as the local test user named in the README (FR-29); otherwise she goes straight to **Søknad**.
3. On **Søknad** she clicks «Bruk eksempelet». The Example pair fills in (the CV text too, before S6), and focus moves to «Analyser og skriv utkast». She submits. No AI notice appears, because no text leaves the app.
4. She runs the test suite with one command, outside the UI.
5. **Climax:** the whole Refleksjonsnotat arrives through the same two phases as a live run, with no key and no cost: the score from code, then the Gapanalyse, Omformuleringsforslag and Letter from Cached responses.
6. **Resolution:** with the Access code from the submission she opens the Hosted version, passes **Tilgangskode (S04)**, and repeats the flow with live AI (FR-30, FR-31).

- **Edge case:** she pastes her own Job ad in Test mode → the score still works (under the FR-5 fallback, with the «Mindre presist» notice), and each AI section shows «Ikke tilgjengelig i testmodus. Bruk eksempelet for å se hele flyten.» (FR-27).
- **Failure:** she mistypes the Access code on the Hosted version → the field error «Feil tilgangskode.», with the field kept, and she tries again (FR-31).

## Responsive & Platform

| Width | Behaviour |
|---|---|
| > 640 px | Full nav inline; if the logged-in nav doesn't fit on one line, it collapses behind «Meny» as at ≤ 640 px (container query on the app bar; see DESIGN.md, Layout & Spacing). Two-column grids per DESIGN.md, Layout & Spacing. Full pulse plot with floating labels. Historikk as a table. |
| ≤ 640 px | Nav collapses behind «Meny» (NFR-3), with full-width 56 px rows. This applies to the two-item nav before S6 too. One column everywhere, side padding `{spacing.page-x-mobile}`. The catalogue heading drops the «·» and puts the employer on its own line. Tone options stack. Letter actions go full width under the Letter. The score block stacks. The plot switches to compact mode and the legend stacks. Historikk becomes a numbered list. |

**360 px and 320 px:** no horizontal scroll down to 320 CSS px (WCAG 1.4.10, equal to 1280 px at 400 % zoom).

- The `@media (max-width: 640px)` layout covers it.
- Headings and body use `overflow-wrap: break-word` and `hyphens: auto` (works with `lang="nb"`). Mono strings (file names, source lines, the CV field, catalogue numbers) use `overflow-wrap: anywhere`.
- The Historikk table above 640 px may scroll inside its own container (data-table exception), never the page.
- The pulse plot uses compact mode; its geometry is in DESIGN.md, Components, Pulse plot, Compact mode. The figcaption says what is left out (Key strings, Plot figcaption; Mock M2).
- Every keyword entry is shown in full; the mock's «+ 3 til» is a sketch shortcut.

**Platform notes:**

- The mock collapses on its frame's container width. The product uses the viewport: `@media (max-width: 640px)`, as a custom Tailwind variant, since Tailwind's `sm` starts at 640.
- Fully usable on a phone means: upload or paste the CV, paste the ad, read the Refleksjonsnotat, «Kopier» and «Last ned (.docx)». This is checked on a real phone at least once (PRD §9.3).

## Build-order Variants

The UI stays coherent at every build step and after every cut (PRD §5.1, D20, D22).

| Variant | What changes |
|---|---|
| **Before S4** (steps 1–3), or S4 cut | No Gapanalyse section, no «Se gapanalysen» links, one AI placeholder («Søknadsbrev»). Progress line: «Skriver søknadsbrevet … dette tar under ett minutt.» (New). The Refleksjonsnotat has no «Skrevet med KI» strip outside the Letter. FR-11 flags every Missing keyword in the Letter. |
| **Before S5** (step 4), or S5 cut | Gap entries exist. A Rewordable gap shows its explanation, citation and hedge line, but no suggestion box. Progress line: «Skriver gapanalyse og søknadsbrev … dette tar under ett minutt.» (New). |
| **Before S6** (steps 1–5), or S6 + S7 cut | Nav Hjem · Søknad. Hjem's button goes to Søknad. Søknad holds the file picker and the CV text with «Bekreft CV-teksten»; the text lives in the browser session only. No catalogue numbers, no Historikk, no «Lagret …», no trust line. AI notice once per browser session; Daily cap per installation; Letter sign-off «[Navnet ditt]». Hosted version: Tilgangskode once per browser session. |
| **Full v1** (step 6 done) | Everything in this spine. |

## Inspiration & Anti-patterns

- **Lifted from concept 10 «Signal»** (the parent): the catalogue-sleeve grammar, with the catalogue number as the page title, the stacked pulse plot as the picture of the ad, engraved caps for data labels, and codes as solid strips with text. Its lineage is record-sleeve design: label catalogue numbers and the stacked pulsar plot. It is used as grammar, not quoted.
- **What concept 11 changes:** warm grounds (espresso, walnut, smoked oak) and parchment ink instead of matt black; a warm code family (moss, rust, amber, sand); the 360 px plot label column (memlog).
- **Rejected — Warm Editorial / Rich Mocha** (UX 2026-09-11): editorial serif display, cream and mocha light palette, rounded cards with soft shadows, keyword chips with ✓ / ✕ glyphs. Retired on 2026-11-09 (PRODUCT.md). Its screens, states and microcopy are used here only as evidence, marked *Old UX*.
- **Rejected — concepts 01–09 and 12 «Kraftmappe»** (memlog).
- **Rejected — score gauges, rings and stars:** the score is a sentence and a formula (P2).
- **Rejected — ATS fear marketing:** the score is keyword coverage for recruiters who search and skim, never "beat the filter" (D18, P4).
- **Rejected — black-box AI:** every score shows its formula and Evidence, and every AI-written part is labelled (P2, P4).
- **Rejected — one-click "add keyword", in-app Letter editor, generated CV file** (P3, PRD §10, D1).
- **Rejected — placeholders for deferred features** such as «Vurder CV» (D2).

## Open Questions

None open. Resolved decisions are logged in `.memlog.md` and folded into the sections above.
