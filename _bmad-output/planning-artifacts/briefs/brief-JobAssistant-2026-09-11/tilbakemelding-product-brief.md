# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G32 – G32-grotting |
| **Product brief** | `_bmad-output/planning-artifacts/briefs/brief-JobAssistant-2026-09-11/brief.md` (commit `00319e6`), lest sammen med `addendum.md` i samme mappe |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Problemet er svært godt formulert: studenter som søker sin første jobb, har relevante kvalifikasjoner fra emner, prosjekter og verv, men uttrykt i et språk ATS-filtrene ikke kjenner igjen. Eksempelet med at «project management» kan dekkes av et gruppeprosjekt som allerede står på CV-en, gjør løsningen konkret.
2. Dere har et tydelig og ærlig standpunkt om åpenhet: JobAssistant skal vise *hvorfor* et forslag gis (match-score med forklaring på nøkkelordnivå) i stedet for å levere en «black-box»-tekst. Dere er også ærlige om at Kickresume og Teal finnes, og at forskjellen er filosofi, ikke teknologi. Det er allerede laget UX-arbeid (DESIGN.md, EXPERIENCE.md og skisser) som bygger på briefen.

**De viktigste endringene:**

1. Skriv suksesskriterier som kan testes i emnet. «Students report that suggestions feel honest and useful» og «fewer ATS-style rejections» kan ikke måles i løpet av semesteret. Legg til funksjonelle kriterier, for eksempel «for en kjent CV og stillingsannonse viser match-scoren hvilke nøkkelord som finnes og mangler» og «gap-analysen foreslår aldri en kvalifikasjon som ikke står i CV-en».
2. Beskriv hvordan ATS-match-scoren beregnes. Hvis den beregnes med vanlig kode (nøkkelord fra annonsen sammenlignet med CV og brev), kan den testes med fasit. Hvis en språkmodell «finner på» scoren, kan dere ikke kontrollere om den er riktig.
3. Planlegg hvordan sensor kan kjøre appen uten deres API-nøkkel til språkmodellen. Brevgenerering, CV-forslag og gap-analyse krever trolig et betalt LLM-API. Legg inn en testmodus med forhåndslagrede svar for en eksempel-CV og en eksempelannonse.

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Middels**

**Sammenlignbart med:** 2) AI CV- og søknadsassistent (middels). JobAssistant er nær identisk med dette forslaget, med vekt på forklaring av match-scoren og oversettelse av studieerfaring.

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | Middels | Match-score og nøkkelordsammenligning må være forklarbar og konsistent. Resten er i hovedsak KI-generert tekst. |
| Datamodell – antall entiteter og relasjoner mellom dem | Middels | Bruker, CV, stillingsannonse, søknad/brev, forslag og match-resultat, med historikk per annonse. |
| Brukere, roller og innlogging | Middels | Én rolle, men innlogging og at hver student bare ser egne CV-er og søknader. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | Høy | Fire KI-funksjoner (brev, CV-forslag, gap-analyse, forklaringer) med et uttalt krav om at KI-en ikke skal finne på kvalifikasjoner. Det krever gjennomtenkte prompts og kontroll av svar. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | Middels | Et språkmodell-API. Ingen jobbportaler eller LinkedIn i v1, noe som er klokt. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | Lav | Hver student jobber med egne dokumenter. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | Høy | Opplasting og tekstuttrekk fra PDF, DOC og TXT. CV-er har ofte kolonner og tabeller som gjør PDF-lesing upålitelig. |
| Sikkerhet og personvern | Middels | CV-er inneholder personopplysninger, og dere har lovet kryptert lagring. Tekst sendes også til en ekstern språkmodell – det bør nevnes. |

**Hva vanskelighetsgraden betyr for dere:**

- _Middels:_ Et godt balansert valg. Pass på at kjerneflyten blir ferdig og stabil før dere legger til mer: last opp CV → lim inn annonse → se match-score med forklaring → få tilpasset brev.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | Risiko | V1 har åtte punkter, der fire er KI-funksjoner og to er innlogging og kryptering. Det er mye, men gjennomførbart hvis dere bygger i trinn og forenkler filformater. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | OK | Funksjonene og avgrensningene er tydelige, og begrunnelsen for å utsette «voice-learning» står i addendumet. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | Webapp med innlogging, database og LLM-kall er godt dokumentert. DOC-lesing er mindre vanlig og kan droppes. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | Risiko | Dere kan vurdere om et brev er godt, men det er vanskeligere å kontrollere at gap-analysen ikke finner på kvalifikasjoner. Lag noen få eksempel-CV-er med fasit for hva som skal og ikke skal foreslås. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | Risiko | Nøkkelordmatching og score kan testes hvis de beregnes i kode. KI-tekst må testes manuelt etter en sjekkliste. Dette bør beskrives i PRD-en. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | Risiko | Ikke beskrevet. Uten testmodus kan ikke sensor prøve kjerneflyten uten egen nøkkel. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | Risiko | Ikke nevnt i briefen. Velg modell og leverandør i arkitekturen, og lag en plan for kostnad og mock-svar. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart med justert omfang.** Se forslagene under.

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. Begrens opplasting i v1 til PDF og TXT (eller bare innliming av tekst som reserve), og dropp DOC. Det reduserer risikoen ved filhåndtering uten å svekke kjerneflyten.
2. Bygg i denne rekkefølgen: (a) match-score med nøkkelordforklaring beregnet i kode, (b) tilpasset brev, (c) gap-analyse, (d) CV-forslag, (e) innlogging og kryptert lagring. Da har dere en fungerende og testbar app tidlig, selv om de siste punktene tar lengre tid.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Tydelig: én CV, mange annonser, tilpasset og ærlig søknad med forklart match-score. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Godt beskrevet «catch-22» med ATS-filtre og studieerfaring som ikke gjenkjennes. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | OK | Beskriver hva studenten gjør og ser, inkludert eksempel på forklaringstekst. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Ærlig om at det ikke finnes en teknisk vollgrav, og konkurrentene er kartlagt i addendumet. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | OK | Student som søker første fulltidsjobb, med CV fra emner, deltidsjobb og verv. Det er nok til å designe rundt. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | Endre | «User success» handler om opplevelse og effekt over tid. «Delivery success» lister funksjoner, men uten hva som er riktig resultat. Legg til konkrete, testbare kriterier. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | Juster | Tydelig «In» og «Explicitly out». Vurder å forenkle filformater og å rangere v1-punktene, slik at dere vet hva som kan kuttes hvis tiden blir knapp. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | Stemmelæring og bredere tilbakemelding er tydelig plassert utenfor v1. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | OK | Briefen er konkret, og dere har allerede bygget UX-arbeid på den. Lag PRD-en neste, og pass på at UX og PRD peker tilbake til de samme v1-punktene. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | Juster | Godt innhold, men mange KI-funksjoner. Prioriter kjerneflyten og gjør resten til trinn. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | Endre | Kriteriene er ikke testbare i dag. Lag eksempel-CV-er og -annonser med forventet resultat, og beregn match-scoren i kode. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | OK | Tydelig bruker og flyt, og skisser for hjem, resultat og mobilnavigasjon finnes allerede. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | Juster | Teknologi er ikke valgt ennå, noe som er riktig for en brief. Begrunn valg av språkmodell, lagring og krypteringsløsning i arkitekturen, og hold det enkelt. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Appen er avhengig av en språkmodell. Planlegg testmodus med mock-svar og eksempeldata, slik at sensor kan kjøre den lokalt etter README. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | Bruk `.env.example` for API-nøkkel og krypteringsnøkkel, og bruk bare oppdiktede eksempel-CV-er som testdata – aldri ekte CV-er i et offentlig repo. Mappen `.working/` med fargeutkast kan ryddes når designet er valgt. |

## 3. Neste steg for gruppen

1. Skriv om «Success criteria» med 5–8 funksjonelle kriterier som kan testes, og beskriv hvordan match-scoren beregnes.
2. Rangér v1-punktene i Scope og forenkle filformatene (PDF og TXT). Ta rangeringen med inn i PRD-en og epics.
3. Bestem i arkitekturen hvilken språkmodell dere bruker, hvordan nøkkelen konfigureres, og hvordan en testmodus med eksempel-CV og mock-svar skal fungere for sensor.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
