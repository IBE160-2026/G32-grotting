# UX-oppdatering etter PRD

## 2026-11-08 kl. 13:21 — Helise-26

### Oppgave
Helene ba om «bmad ux»: les den ferdige PRD-en og oppdater UX-dokumentene (DESIGN.md, EXPERIENCE.md og mockupene) så de peker på de samme v1-punktene som PRD-en (addendum §4, OQ7).

### Plan
- Kjørte bmad-ux i Update-modus på `_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-09-11/`.
- Leste UX-memlog, begge spines, PRD (hele), PRD-ens `reconcile-ux.md` og addendum §4 (UX-oppdateringslista).
- Regnet ut WCAG-kontrast for gjeldende palett og AA-forslag (skript i scratchpad).
- Fire valg til Helene: fargeforslag A (små justeringer), fjerne «Vurder CV»/«Vurder søknad»-kortene på Hjem, Tone som tre radiokort, oppdatere mockupene i samme runde. Alle besvart og logget i memlog.

### Resultat
- **EXPERIENCE.md** skrevet om etter PRD: ny seksjon «Build-order variants» (før S6, før S4, før S5, full v1), totrinns resultat med delresultat-tilstander (D19), Søknad-komponenter (CV-tekst med bekreft, stillingstittel/arbeidsgiver, Tone, KI-varsel, «Bruk eksempelet»), resultat-komponenter (score med «X av Y nøkkelord», formel og forbehold, Evidence, «Det som mangler», brev med «Kopier»/«Last ned (.docx)»/«Lag nytt utkast» og flagg), alle nye tilstander med tekst og token, flyter = UJ-1/UJ-2/UJ-3, ID-merking (S/FR/D), frist 15. desember.
- **DESIGN.md**: AA-palett (text-secondary #745F49, accent #795D41, success #406735, accent-strong #826C57, nye `warning-text` #7A5907 og `border-strong` #9A7D5D, `overlay`), alle kontrastverdier listet, nye komponenter (letter-view, letter-flag, tone-option, dialog, info-banner, evidence-excerpt, gap-callout-real, ai-label), 44 px berøringsflater, utdaterte ASSUMPTION-merker fjernet.
- **Mockups**: `key-application-result.html` (71 % = 5 av 7, brevet på skjermen, ingen CV-fil eller notat-nedlasting), `key-home.html` (uten Vurder-kort og typetagger, Verdict-tekst på badger, ny ramme for versjonen uten kontoer), `key-mobile-nav.html` (ny palett, ramme med navbar på to lenker).
- **reconcile-prd.md** (ny) kobler hvert punkt i addendum §4 og hvert UX-gap i PRD-ens reconcile-ux.md til stedet det er løst.
- Memlog: 9 nye oppføringer, «spines finalized». Begge spines `status: final`, `updated: 2026-11-08`.
- Endringene i UX-mappen er ikke committet.
- Lukket punktet «uke 45: oppdater UX-dokumentene etter PRD-en» i issues.md.

### Åpne punkter
- Gå gjennom mikrotekstene som ble skrevet uten fast PRD-ordlyd (lista nederst i `reconcile-prd.md`): gap-etiketter, Verdict-setninger, formel og forbehold, navbar uten meny før S6, plassholder for signatur m.m.
- Valgfritt: kjør bmad-ux sin reviewer-gate (validering) og bmad-review-polish (struktur, prosa) på de oppdaterte spines; ikke kjørt i denne økten.
- Valgfritt: mockup av Søknad-skjemaet (CV-tekst, Tone-kort, KI-varsel), som nå bare er beskrevet i spines.

## 2026-11-08 kl. 13:30 — Helise-26

### Oppgave
Helene ba om en mockup av Søknad-skjemaet (åpent punkt fra forrige økt).

### Plan
- Renderte `.working/key-application-form.html` etter EXPERIENCE.md og DESIGN.md, sjekket den med et skjermbilde fra headless Edge, og flyttet den til `mockups/`.
- Tok ny mikrotekst fra mocken inn i EXPERIENCE.md, så spines fortsatt er kontrakten.

### Resultat
- `mockups/key-application-form.html` har tre rammer: (1) før kontoer, CV-teksten er hentet ut og venter på «Bekreft CV-teksten»; (2) full v1, CV-tekst fra Profil og KI-varselet åpent; (3) mobil i testmodus med «Bruk eksempelet», tonekort under hverandre og feil på lengden.
- EXPERIENCE.md: skjemaoppsett («Ny søknad», tre nummererte kort, undertitler, notat ved «Lag søknad»), tittelen «Før vi sender teksten din», linja om kontaktinformasjon (FR-26), «Du ser dette varselet bare én gang» og teksten i eksempel-linja. Mocken er lenket fra EXPERIENCE.md og DESIGN.md. Memlog oppdatert.
- UX-endringene er fortsatt ikke committet.

### Åpne punkter
- Navnet på KI-leverandøren og antall lagringsdager i KI-varselet er plassholdere til arkitekturen har valgt leverandør (OQ3); dette inngår i det eksisterende arkitekturpunktet.


## 2026-11-08 kl. 13:46 — Helise-26

### Oppgave
Helene ba om å committe og pushe UX-endringene.

### Plan
- Committet hele UX-mappen direkte på `main` (samme praksis som for PRD-en), med en melding som navngir D-ID-ene, slik NFR-10 krever.

### Resultat
- Commit `487e34b` «Oppdater UX etter PRD: D1-D5, D10-D11, D14-D16, D19-D20, D23»: 9 filer (DESIGN.md, EXPERIENCE.md, .memlog.md, reconcile-prd.md, fire mockups, `.working/key-application-form.html`).
- Pushet til `origin/main` (693321a..487e34b), inkludert de to loggcommitene fra tidligere i dag.

### Åpne punkter
Ingen nye.
