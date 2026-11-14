# Story 1.3: Docker-kjøring og testing

## 2026-11-14 kl. 20:48 — Helise-26

### Oppgave
Bygge story 1.3 fra epics.md («Start the app and run the tests with one Docker command each») med `bmad-build`, slik at Examiner kan kjøre appen og alle testene med bare Docker installert.

### Plan
- Spesifikasjon: `_bmad-output/implementation-artifacts/spec-1-3-start-the-app-and-run-the-tests-with-one-docker-command-each.md` (godkjent, beholdt over 1600 tokens).
- Branch `story/1.3-docker-run-and-test`; implementert direkte i hovedsesjonen; tre uavhengige gjennomgangslag (Blind Hunter, Edge Case Hunter, Verification Gap) etter at Helene valgte det; funn triert i spesifikasjonen.

### Resultat
- Commits på `story/1.3-docker-run-and-test` (ikke pushet, ingen PR ennå): `8814f8b` kode, `e2d4851` spesifikasjon, triagelogg, utsatt arbeid og sprintstatus (1-3 satt til `review`).
- Nytt: `Dockerfile` (deps, build, app, test), `compose.yaml` (db, app, test), `.dockerignore`, `scripts/setup.ts` (migrering under `pg_advisory_lock`, produksjonsvakt, tom liste `LOCAL_STEPS`), `withAdvisoryLock` i `db.ts`, npm-skriptene `predev` og `serve`, README (første kjøreutgave), tester (`setup.test.ts`, `db-lock.test.ts`, `docker-files.test.ts`).
- Verifisert på Docker Desktop 4.87.0 (Engine 29.7.2), Windows 11: `up --build --wait` gir friske `db` og `app`, `/api/health` svarer 200 gjennom postgres-js (første ekte kjøring av det sporet); porter kun på `127.0.0.1`; `down -v` og ny start er ren; `docker compose run --rm --build test` passerer (88 enhetstester, 2 e2e) uten `db`; `npm test` passerer på verten; `predev` kjører mot `127.0.0.1:54320` og etterlater ingen lås; feil `DATABASE_URL` gir én linje og avslutter med kode 1; `docker compose stop` tok 1,5 s.
- Docker Desktop var avslått og ble startet av meg for verifiseringen.
- Gjennomgangen ga 20 funnrader: 9 rettet (bl.a. `pg_isready -h 127.0.0.1` mot TCP-løpet ved første oppstart, entry-vakt med `realpath`, feilmelding med rotårsak, lås-tester med mocket konfig, spawn-test av `setup.ts`, README og `.dockerignore`), 2 utsatt, resten avvist med begrunnelse.
- Avvik: Python skrev enkelte filer med CRLF på Windows (brøt to tester og kunne ødelagt `.dockerignore`); alt er satt tilbake til LF.

### Åpne punkter
- Helene må gå gjennom README én gang på Windows (siste akseptkriterium i story 1.3); bygget kan ikke gjøre det for henne.
- Settet med lokale steg (`LOCAL_STEPS`) er tomt; story 6.1 og 6.11 fyller det. Da må sesjonslåsen holdes i en transaksjon eller `pg_advisory_unlock` kontrolleres (idle_timeout 20 s taper låsen; se `deferred-work.md`).
- Rekkefølgen «migrer før lokale steg» er ikke testet; legg til i første story med en migrering (se `deferred-work.md`).
- `prepare`-innstillingen og TLS mot Supabase sjekkes fortsatt i story 1.7 (Postgres-sporet er nå kjørt mot lokal Postgres, ikke mot Supabase).
