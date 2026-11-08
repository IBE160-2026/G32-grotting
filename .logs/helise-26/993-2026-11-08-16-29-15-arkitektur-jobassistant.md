# Arkitektur for JobAssistant

## 2026-11-08 kl. 16:29 — Helise-26

### Oppgave
Lage arkitekturen for JobAssistant v1 med BMad-skillen `bmad-architecture`, basert på PRD-en (final 2026-11-08), addendum §2, UX-dokumentene og forelesers tilbakemelding. Leveransene er en kort arkitektur-spine som stories bygges etter, og et sensor-rettet begrunnelsesdokument for valg av språkmodell, lagring og kryptering (forelesers krav, kriterium 5).

### Plan
- Helene valgte Fast path med coaching-runde etter utkastet, og «spine + kort begrunnelsesdokument» som leveranse.
- Research: versjoner sjekket i npm-registeret og Vercel-dokumentasjonen (Next.js 16.4.5, Node 26, Hobby-planen med 300 s per funksjon), databaser (Neon, Turso, Supabase, PGlite) og KI-leverandører (priser, datalagring, DPA, EU-behandling).
- Utkast med 13 beslutninger (AD-1–AD-13), alle merket `[ASSUMPTION]`.
- Coaching-runde i fem temaer:
  - T1 stack: Next.js 16 + TypeScript på Node 26 godtatt. Helene har ikke brukt React eller TypeScript før, så stories holder seg til standardmønstre.
  - T2 KI-leverandør: viktigst er best bokmål og regelfølging. Valget tas med en bake-off i uke 47, Claude Sonnet 5.5 mot én OpenAI-modell. DPF-listen sjekkes først; står vinneren ikke der, endres PRD §8.1 til å godta SCC.
  - T3 database: Helene valgte Supabase (kun som database) foran anbefalt Neon. PGlite brukes lokalt. En keep-alive-jobb hindrer at gratisprosjektet pauses.
  - T4 nøkkelordmotor: kuratert liste med ESCO som reserve. Helenes egne sykepleieord blir startpunktet: «tverrfaglig samarbeid», «ortopedi», «sykehus», «postoperativ», «smertebehandling».
  - T5: resten av beslutningene godtatt uten endringer.
- Finalize: destillering fra memloggen og reviewer-gate med fem parallelle sjekker (avstemming mot PRD, avstemming mot UX og tilbakemelding, rubric, aktualitet, adversarial). Deretter rettinger, triage, begrunnelsesdokument polert med `bmad-review` (linsene structure og prose) og status final.
- Alle beslutninger står i `.memlog.md` i arkitekturmappa (48 oppføringer).

### KI-styring
- Claude anbefalte Neon som hostet database. Helene valgte Supabase etter å ha fått vite om 7-dagers pausen og Docker-kravet lokalt. Supabase ble tatt inn bare som database, med PGlite lokalt og keep-alive, slik at NFR-9 og SM-4 holder.
- Claude opplyste at det selv er laget av Anthropic og derfor kan være partisk i leverandørvalget. Helene valgte en bake-off framfor å bestemme nå.
- Reviewer-gaten avdekket feil i Claudes eget utkast: helsesjekken lå bak tilgangskoden; AD-1 og AD-13 motsa hverandre om norsk tekst; postgres v4 var ikke verifisert mot Drizzle; to PGlite-instanser mistet data stille (reprodusert lokalt); og `create-next-app` har andre standardvalg enn antatt. Alle feilene er rettet i spinen.

### Resultat
- `_bmad-output/planning-artifacts/architecture/architecture-JobAssistant-2026-11-08/`:
  - `ARCHITECTURE-SPINE.md` (status final): paradigmet «functional core, imperative shell» og AD-1–AD-18. De nye AD-14–AD-18 dekker felles datakontrakter, skrivemodell for Application, kanonisk hashing, klientsesjon samt kjøremodus og tilgang. I tillegg konvensjoner, stack med eksakt scaffold-kommando, deploy- og miljøtabell, ERD, kildetre, kapabilitetskart og en Deferred-liste. `lint_spine.py`: 0 funn.
  - `.memlog.md` og `reviews/` (5 gjennomgangsrapporter).
- `docs/architecture.md`: sensor-rettet begrunnelse for språkmodell, lagring, kryptering og nøkkelordmotor, polert med structure- og prose-linsene.
- Delvis løst: issues-punktet om arkitektur (KI-leverandør, hostet database, nøkkelordvokabular). Databasen og tidsgrensen er avgjort, vokabularets retning er valgt, og leverandøren er utsatt til bake-offen (nytt punkt under).
- Arkitekturmappa og `docs/` er ikke committet ennå.

### Åpne punkter
- Start uke 47: velg hvilken OpenAI-modell som skal være med i bake-offen, og kjør den. Resultatet føres i `docs/qa/`.
- Før bake-offen: sjekk begge leverandørene på DPF-lista (dataprivacyframework.gov). Står ikke vinneren der, oppdater PRD §8.1 til å godta SCC i leverandørens DPA.
- Oppsett i uke 45: Supabase i Frankfurt med Data API av og RLS på, Supabase-DPA og Vercel-DPA dokumentert i `docs/qa/`, og keep-alive-workflow satt opp.
- Når sensuren starter: sjekk at keep-alive-workflowen fortsatt er aktiv (GitHub slår av planlagte jobber i inaktive repoer).
- Oppdater PRD-en etter arkitekturen: OQ3 (database avgjort, leverandør til bake-off) og OQ6 (vokabularets retning), med memlog-oppføring.
- Neste steg: `bmad-spec` (spinen som følgedokument) eller `bmad-create-epics-and-stories`, i byggerekkefølgen fra PRD §5.1. README skal lenke til `docs/architecture.md`.
