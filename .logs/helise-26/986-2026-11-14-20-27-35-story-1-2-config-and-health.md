# Story 1.2: Config og health check

## 2026-11-14 kl. 20:27 — Helise-26

### Oppgave
Bygge story 1.2 fra epics.md («Read configuration in one place and answer a health check») med `bmad-build`: én konfig som eneste leser av miljøet, db, logg, `handle()` med AD-7-konvolutten og `GET /api/health`, slik at en manglende nøkkel aldri krasjer den lokale kjøringen og en halvkonfigurert Hosted-versjon ikke starter.

### Plan
- Først ferdigstille story 1.1 (walkthrough, rettelser, merge av PR #1), så `bmad-build story 1.2` fra ren `main`. Spesifikasjon: `_bmad-output/implementation-artifacts/spec-1-2-read-configuration-in-one-place-and-answer-a-health-check.md` (godkjent, beholdt over 1600 tokens fordi delene henger sammen).
- Branch `story/1.2-config-and-health`; implementering via underagent; tre uavhengige gjennomgangslag (Blind Hunter, Edge Case Hunter, Verification Gap); funn triert i spesifikasjonen.

### Resultat
- Commits på `story/1.2-config-and-health` (ikke pushet, ingen PR ennå): `50cf236` kode, `2821e76` spesifikasjon, triagelogg, utsatt arbeid og sprintstatus (1-1 satt til `done`, 1-2 til `review`).
- Nytt: `src/shared/server/{config,db,log,handle}.ts`, `src/shared/core/message-key.ts`, `src/app/api/health/route.ts`, `src/instrumentation.ts`, `scripts/migrate.ts`, `drizzle.config.ts`, `.env.example`, tester for config, handle, db og health. Pinnede avhengigheter: zod, server-only, drizzle-orm, postgres, @electric-sql/pglite, drizzle-kit, tsx.
- `npm test` passerer (58 enhetstester, 2 e2e). `next build` med `APP_ENV=hosted` uten miljøvariabler lykkes; `next start` avslutter med kode 1 og navngir `ACCESS_CODE`.
- Avvik fra planen: `assertStartupConfig()` avslutter prosessen, fordi en kastet `register()` ellers lar `next start` svare 500; `/api/health` er `force-dynamic`.
- Gjennomgangen ga 17 funnrader: 3 rettet (test av oppstartsfeil, `try/finally` i `migrate.ts`, portfiksturen 5432), 3 utsatt, resten avvist med begrunnelse i triagelogg.

### Åpne punkter
- Hosted-regelen «`AI_PROVIDER` satt krever AI-nøkkel» og håndtering av halvsatte AI-innstillinger mangler; legg til i story 3.12 (se `deferred-work.md`).
- Første historikk i `drizzle/` trenger en PGlite-migreringstest og en kjøring av `db:migrate`; test-casen «skips migrating» blir utdatert. `db:check` på tom historikk skriver `drizzle/meta/_journal.json`; story 1.4 må ikke committe den.
- `handle()` sender ikke rutekonteksten (`params`) videre; utvides i første dynamiske rute (Epic 3).
- Postgres-sporet i `db.ts` er ikke kjørt mot en ekte database ennå; `prepare`-innstillinger for Supabase vurderes i story 1.7.
