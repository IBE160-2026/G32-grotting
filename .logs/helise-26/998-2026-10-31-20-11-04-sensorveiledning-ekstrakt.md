# Sensorveiledning-ekstrakt

## 2026-10-31 kl. 20:11 — Helise-26

### Oppgave
Lese hele «Sensorveiledning IBE160 – Del 1» (PDF, 7 sider) og trekke ut det sensor vil vurdere, slik at PRD-en og prosjektet kan tilpasses: leveranser, vurderingskriterier med vekting, forventninger til planleggingsartefakter, tekniske krav og prosesskrav, det som bør forme PRD-ens innhold, og uklarheter å spørre foreleser om. Kildefila skulle ikke endres. Resultatet skulle skrives på engelsk, med sentrale norske begreper sitert i original.

### Plan
- Read-verktøyet kunne ikke rendre PDF (pdftoppm mangler), så teksten ble hentet ut med `pdftotext` (layout og rå modus) til scratchpad utenfor repoet.
- Kontrollere at uttrekket er fullstendig: 7 sider, ingen bilder, lenker eller vedlegg, og de to uttrekkene har identiske ord.
- Skrive ekstraktet i de sju etterspurte seksjonene. Skille tydelig mellom det som står i veiledningen og egne slutninger (`[INF]`) og egen regning (`[derived]`).
- Kontrollere sitatene mot kildeteksten med et lite skript og rette avvik.
- Gjøre noen skrivebeskyttede sjekker i repoet (git remote, historikk, README, `.gitignore`, søk etter proposal-fil) for å gjøre spørsmålene og sideobservasjonene konkrete.

### Resultat
- Opprettet `_bmad-output/planning-artifacts/prds/prd-JobAssistant-2026-10-31/extract-sensorveiledning.md` (ca. 424 linjer, ukommittert). Kildefila `C:\IBE160\Sensorveiledning IBE160.pdf` er ikke endret.
- Innhold: de sju etterspurte seksjonene, pluss «Source and conventions», «What the guide is» og «At a glance». De sju kriteriene C1–C7 med vekt (30/20/15/10/10/10/5 %), «Sensor ser etter» og nivåbeskrivelser A–B / C / D–E / F, utledet effektiv vekt i totalkarakteren (×0,70), karakterberegningen, sensors ti trinn og de åtte varseltegnene.
- Sitatkontroll: 291 fragmenter sjekket mot kildeteksten. Fire avvik ble rettet («faktisk er brukt og oppdatert» to steder, «godkjente proposal», og en forslagsetikett som så ut som et sitat). Resterende treff er forventede (egen tekst, tabellbryting i kilden, en commit-melding).
- Viktigste funn: veiledningen dekker bare del 1 (70 %); ingen datoer eller frist er oppgitt; ingen mal eller obligatoriske seksjoner for PRD; krav om sporbarhet fra kode til krav og stories; planleggingsdokumenter må være «faktisk er brukt og oppdatert»; sensor kjører appen kun etter README på en ren maskin (veiledende 15–20 min), og hemmeligheter skal ikke ligge i repo eller historikk.
- Sideobservasjoner (utenfor PDF-en), tatt med i ekstraktet: README.md er en plassholder; remote er `IBE160-2026/G32-grotting`; 12 commits, kun `main`; ingen proposal-fil i repoet eller i `C:\IBE160`.
- Ingen kode eller konfig er endret. Mellomfiler (tekstuttrekk og to små skript) ligger i scratchpad utenfor repoet.

### Åpne punkter
- Avklar med foreleser (ekstraktet §7.2): eksakt innleveringsfrist og hvordan «siste commit» avgjøres, hvordan sensor får LLM-API-nøkkel (eller om appen skal ha mock-modus), om hostet deploy forventes, og hvor den godkjente proposal-en ligger.
- Skaff den overordnede sensorveiledningen, emnebeskrivelsen og veiledningen for del 2 (refleksjonsrapport, 30 %). De er ikke med i PDF-en.
- Proposal-dokumentet finnes ikke i repoet; bestem hvordan det kobles til PRD-en og README (sensor måler omfang mot det).
- README.md er en plassholder og må bygges ut etter kriterium 6 (beskrivelse, forutsetninger med versjoner, kommandoer, `.env.example`, testbrukere, mappestruktur, lenker til planleggingsdokumentene).
- Beslutt arbeidsflyt for kriterium 1 (grener, pull requests og issues koblet til stories); repoet har så langt bare `main`.
- Gjennomgå tilbakemeldingen på product brief (commit 2026-10-06, Bård Pettersen) og avstem mot ekstraktet.
