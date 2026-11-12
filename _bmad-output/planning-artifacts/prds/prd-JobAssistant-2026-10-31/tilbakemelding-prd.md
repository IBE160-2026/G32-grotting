# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G32 – G32-grotting |
| **PRD vurdert** | `_bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/prd.md` (status: final, sist endret 2026-11-09, commit 8e06190), lest sammen med `addendum.md` i samme mappe |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Dette er en sterk PRD med en tydelig tese («viser arbeidet og finner aldri på»), testbare krav og en ærlig kuttlinje. Den kan brukes som grunnlag for UX, arkitektur og epics slik den står. Risikoen ligger i omfang og størrelse: 31 FR, 11 NFR og et stort kvalitetsopplegg skal bygges av én utvikler på drøyt fire uker, og enkelte krav er fortsatt betingede («endres under FR-5-reserven»).

## 2. Dette fungerer godt

- **Tesen styrer kravene.** P1–P6 (§4) er regler som kan sjekkes, og hver peker på FR-ene som håndhever dem. Eksempel: «Ordinary code calculates the score» (§1) følges opp i FR-7 med formel, avrunding og at Verdict bruker den avrundede scoren.
- **Kontroll av KI er konkret.** Integrity guards (FR-11, FR-15, FR-17) sjekker KI-svar mot CV-teksten før visning. De testes med planlagte dårlige Cached responses, blant annet «Forsket på sårvurdering» fra FR-16. Daily cap (FR-25), fjerning av kontaktinfo (FR-26) og Test mode (FR-27) dekker kostnad, personvern og sensors kjøring uten nøkkel.
- **Motmål og ærlige avvik.** SM-5 («an app that never suggests anything would pass SM-3») og SM-C1–C3 hindrer at man optimaliserer feil ting. §11 (D1–D23) logger hver endring fra briefen med begrunnelse, og §5.1 sier hva hvert kutt koster i levert scope.

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | sterk | Beslutninger er merket (A1a–A4a, D-tabellen), og åpne spørsmål er reelt åpne med eier og frist. |
| Substans | sterk | Personas styrer UJ-ene, NFR-ene har tall (2 MB, 30 min, 60 s, 200 NOK), og visjonen kunne ikke byttes inn i en annen PRD. |
| Strategisk sammenheng | sterk | Byggerekkefølgen S1–S7 følger tesen, med kuttrekkefølge og kontrollpunkter 22. nov. og 1. des. |
| Testbarhet | god | De fleste FR-er har målbare punkter. Tone, enkelte NFR-er og to suksessmål er fortsatt skjønnsbaserte (4.2, 4.3). |
| Scope og avgrensning | god | Non-goals (§10) og utsatt-liste (§5.3) er tydelige, men flere tunge deler står utenfor kuttrekkefølgen (4.1). |
| Brukbarhet for neste fase | god | ID-er er sammenhengende og Verify-linjer finnes. Betingelser om FR-5-reserven og henvisninger til arbeidsfiler gjør uttrekk vanskeligere (4.4, 4.5). |
| Formtilpasning | god | UJ-er med navngitte hovedpersoner passer produktet. PRD-en blander produktkrav og kursleveranser (4.5). |

## 4. Viktigste forbedringer

### 4.1 Flere store poster står utenfor kuttrekkefølgen
- **Alvorlighet:** høy
- **Hvor:** §5.1 «Cut order», §5.2, FR-30/FR-31, FR-5 «Approved fallback», §13 spørsmål 3
- **Problem og hvorfor det betyr noe:** Kuttlinjen dekker bare S6+S7, S5 og S4. Men Hosted version på Vercel med Access code, KI-reserven for nøkkelord, leverandør-«bake-off» i uke 47 og `docs/qa/`-rad for hver Manual-verifisering er også arbeid. Dette skal gjøres av én person, mens S4+S5 er satt til 23. nov.–1. des. og S6+S7 til 2.–11. des. Når tiden knapper seg inn, vet ikke epics-fasen hva som kuttes først.
- **Forslag:** Utvid kuttrekkefølgen med en rad før S6+S7, for eksempel: «0. Hosted version fryses på skjelettet (FR-30/31 beholdes bare som README-notat) hvis kontrollpunktet 22. nov. ikke er bestått.» Legg også til en linje om hvilke `docs/qa/`-rader som er minimum hvis tiden mangler.

### 4.2 Tone og flere «Manual»-krav mangler observerbare konsekvenser
- **Alvorlighet:** medium
- **Hvor:** FR-10 «polite and factual», «warmer; shows motivation and a little personality»; FR-3 og FR-24 (kun «Manual»); NFR-5 «never crash»
- **Problem og hvorfor det betyr noe:** En story kan ikke få akseptansekriterier av ord som «warmer». Dette gjør at Tone ikke kan testes, selv om Cached responses har ett brev per Tone.
- **Forslag:** Gi hver Tone én eller to observerbare regler. Eksempel-FR (på PRD-ens språk): «**Consequences (testable):** the «Direkte» Letter is at most 300 words and its first sentence contains a Matched keyword; the «Formell» Letter contains no first-person anecdote marker from a short list in code; the Tone shown in the UI equals the Tone stored in the Application.» For NFR-5: erstatt «never crash» med «the wrong-input tour (§9.3) gives an inline error for each of the 6 listed inputs and keeps the input».

### 4.3 Suksessmålene SM-2 og SM-3 kan ikke avgjøres slik de står
- **Alvorlighet:** medium
- **Hvor:** SM-2 «within ±5 points of the Answer key»; SM-3 «Target: 0 failures»; FR-28
- **Problem og hvorfor det betyr noe:** Med 7 nøkkelord utgjør ett nøkkelord ca. 14 poeng, så ±5 betyr i praksis at listene må være identiske. Toleransen sier da noe annet enn det som testes. SM-3 krever null feil på L2/G1/G2/R1 over «all Fixture runs», men live KI-svar varierer mellom kjøringer, og hva som er en feil er et skjønn.
- **Forslag:** Skriv SM-2 om til «Matched and Missing lists equal the Answer key exactly; the score follows from them». For SM-3: «For the final prompt version, 3 live runs per Fixture are recorded; 0 L2/G2 failures in all runs. A failure found later gives a prompt fix, a new set of 3 runs and an entry in `docs/qa/`.»

### 4.4 FR-5-reserven gjør åtte krav betingede
- **Alvorlighet:** medium
- **Hvor:** FR-5, FR-8, FR-24, FR-25, FR-27, NFR-4, NFR-6, NFR-8: gjentatt «(changes under the FR-5 fallback)»
- **Problem og hvorfor det betyr noe:** Hvert av disse kravene har to versjoner, og epics/stories skal skrives mot én. Beslutningen tas ved slutten av uke 46, altså 15. nov.
- **Forslag:** Når beslutningen er tatt, skriv de berørte kravene om til én endelig form og slett den andre grenen. Hvis reserven brukes, flytt den til et eget FR-5b med en tabell «berørt krav / ny verdi». Dette gjør også PRD-en kortere.

### 4.5 PRD-en peker på arbeidsfiler og er lang
- **Alvorlighet:** lav
- **Hvor:** §0 «Decisions A1a to A4a … recorded in this PRD's `.memlog.md`»; §13 spørsmål 7; §8.4, NFR-10 og §9.4 (ca. 13 000 ord totalt)
- **Problem og hvorfor det betyr noe:** A1a–A4a kan ikke slås opp uten arbeidsloggen, så PRD-en er ikke selvstendig. Spørsmål 7 (UX-oppdatering «in week 45, before the epics») ser ut til å være løst siden UX-dokumentene er datert 2026-11-09, men står som åpent. Prosess- og kursleveranser (NFR-10, §8.4) er blandet med produktkrav, og det gjør dokumentet tyngre å hente fra.
- **Forslag:** Skriv hver A-beslutning som én setning i §11 eller i et vedlegg. Lukk spørsmål 7 med dato. Vurder å flytte §8.4 og §9.4 til addendumet, og la NFR-10 beholde bare krav som kan sjekkes (for eksempel «hver PR nevner FR-ID»).

## 5. Mekaniske funn

- **ID-er:** FR-1–31, NFR-1–11, UJ-1–3, D1–D23, SM-1–8 og SM-C1–C3 er sammenhengende, og krysshenvisningene jeg fulgte løser seg. Ingen duplikater.
- **Antakelser:** §14 viser 15 avklarte antakelser, og ingen `[ASSUMPTION]`-tagger står igjen, så indeksen og teksten stemmer overens.
- **Glossar:** Begrepsbruken er jevn. «Evidence» (utdrag for Matched keyword) og «Evidence citation» (KI-sitat) er definert hver for seg, men «Evidence» brukes av og til alene i FR-11/FR-15. Sjekk at stories bruker riktig term.
- **Åpne spørsmål:** 2, 3, 5 og 8 er fortsatt åpne selv om status er `final`. Det er greit så lenge de har frist, men si i §0 at de er planlagte beslutninger.

## 6. Før dere går videre

**Må avklares før UX/arkitektur/epics:**
- Valget mellom kode og KI for nøkkelord (spørsmål 2, 15. nov.), siden det endrer åtte krav (4.4).
- Utvidet kuttrekkefølge med Hosted version (4.1).
- Om UX-dokumentene faktisk er oppdatert etter addendum §4 (spørsmål 7).

**Kan vente:** valg av KI-leverandør og modell (bake-off uke 47), spørsmål 5 og 8 til faglærer, og finjustering av Upgrade-ordlisten.

**Oppfølging av briefen:** Ja. De tre hovedpunktene er fulgt opp: testbare suksesskriterier (SM-1–8 og Answer keys), score beregnet i kode (FR-7, P2) og Test mode for sensor (FR-27, NFR-9). De to forslagene om omfang er også tatt inn: bare PDF og TXT (FR-1), og byggerekkefølge med kuttlinje (§5.1). Fiktive CV-er, `.env.example` og opprydding av `.working/` er med (FR-28, NFR-7, §5.2).

## 7. Refleksjonsspørsmål

1. Alle 15 antakelser i §14 er «Confirmed» eller endret. Hvilke av dem sjekket dere mot noe utenfor KI-teksten (leverandørvilkår, Vercels vilkår, faglærer), og hvilke godtok dere fordi de så rimelige ut?
2. Integrity guards fanger bare påstander som bruker annonsens nøkkelord eller ordene på Upgrade-listen. Hvilke typer falske påstander tror dere KI-en kan lage som verken sjekken eller sjekklisten i §9.2 ville oppdaget, og hvordan ville dere finne dem?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
