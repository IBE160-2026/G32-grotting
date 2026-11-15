# Story 1.7: Deploy the skeleton to the Hosted version

## 2026-11-15 kl. 15:17 — Helise-26

### Oppgave
Bygge story 1.7 med `bmad-build`: en stabil HTTPS-adresse der appen kjøres fra `main` (Vercel + Supabase), med keep-alive og en `docs/qa/`-post for DPA og FR-30.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-1-7-deploy-the-skeleton-to-the-hosted-version.md` (godkjent; avgjort: kode først, oppsett etter merge; DPA-posten utkastes fra offentlige vilkår).
- Forkastet endringene i `epics.md` (tastefeil «7JobAssistant») etter spørsmål, så arbeidstreet var rent.
- Implementert direkte i hovedsesjonen; tre uavhengige reviewere (Blind Hunter, Edge Case Hunter, Verification Gap) kjørt som subagenter, funn triagert i specens Review Triage Log.

### Resultat
- Gren `story/1.7-deploy-hosted-skeleton`, commit e5eed85.
- Nye filer: `vercel.json` (nextjs, `fra1`, `db:migrate` før `next build`, kun `main` deployes), `.github/workflows/keep-alive.yml` (to kjøringer i døgnet, `jq`-sjekk av `ok` og `hosted`), `scripts/hosted-config.test.ts` (9 tester), `docs/qa/hosted-deployment.md` (oppsettsguide, DPA-post, FR-30-rad), «Hosted version»-seksjon i `README.md`.
- Verifisert: `npm test` på vert og `docker compose run --rm --build test` passerer. Sprint-status: 1-7 = `review`.
- **DPA-funn (2026-11-15):** Vercels DPA gjelder ifølge teksten Enterprise og Pro, Hobby er ikke nevnt. Supabases DPA skiller ikke mellom planer. Ikke bekreftet i dashbord.
- To punkter utsatt i `deferred-work.md` (advisory lock i `migrate.ts`, ikke verifisert `sslmode=require`/Vercel-bygg).

### Åpne punkter
- Ta stilling til Vercel Hobby og DPA (spør Vercel support, eller README-kjøringen blir leveransen og PRD §11 oppdateres) — se `docs/qa/hosted-deployment.md` §1.
- Sette opp Supabase og Vercel etter guiden (variabler før første deploy), sette repo-variabelen `HOSTED_URL`, kjøre keep-alive manuelt, fylle ut FR-30-raden med datoer, og legge Hosted-URL i README (egen liten commit). Story 1.7 er ikke ferdig før dette er gjort.
- Gå gjennom PR for story 1.7 (ikke pushet ennå).

## 2026-11-15 kl. 18:30 — Helise-26

### Oppgave
Fullføre story 1.7 etter merge: pushe PR-er, kjøre og dokumentere FR-30-sjekkene, og ta stilling til Vercel-DPA-en.

### Plan
- PR #11 (selve storyen), #12 (URL i README), #13 (liste i oppsettsguiden), #14 (FR-30-resultater og region) — alle merget; #14 ble merget før CI var ferdig (se under).
- Valgt alternativ 2 for DPA: README-kjøringen er leveransen (PRD §5.1, kutt 0).

### Resultat
- Hosted-URL: https://g32-grotting.vercel.app/. curl-sjekker: `/api/health` 200 med `hosted:true`, `/soknad` 307 til `/tilgang`, API uten kode 401, feil kode 400, http 308 til https, keep-alive manuelt kjørt grønt, funksjonene kjører i `fra1`. Helene sjekket selv riktig kode, kun `main` deployes, ingen `AI_*`-variabler og Supabase-regionen.
- Avvik: Supabase ligger i `eu-west-1` (Irland), ikke Frankfurt som spinen sier. Beholdt, notert i `docs/qa/hosted-deployment.md`.
- Feil fra min side: PR #14 ble merget før CI var ferdig (kommandoen ventet ikke når sjekkene ikke var registrert ennå). CI på `main` ble grønn etterpå.
- DPA-beslutning: Vercels offentlige DPA nevner Enterprise og Pro, ikke Hobby; Vercel support ble ikke spurt. README-kjøringen er leveransen. Endret: runbook (beslutning), README (skjelett-notat), PRD §11 D23 (ikke levert som planlagt), sprint-status 1-7 = `done`.

### Åpne punkter
- Gå gjennom resten av planen for Hosted-versjonen med live AI (story 3.12, 6.12, 7.x, FR-30/FR-31, UJ-3) og tilpass den til beslutningen — `bmad-correct-course` eller story 7.5.
- Bestem om `main` skal settes til `false` i `vercel.json` (`git.deploymentEnabled`) for å fryse Hosted-versjonen, slik PRD §5.1 kutt 0 beskriver.
