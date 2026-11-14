# Story 1.4: CI på pull requests

## 2026-11-14 kl. 21:34 — Helise-26

### Oppgave
Bygge story 1.4 fra epics.md («Check every pull request in CI») med `bmad-build`, slik at hver pull request bygges og testes på samme måte som Examiner kjører appen, og `main` bare får grønn kode.

### Plan
- Spesifikasjon: `_bmad-output/implementation-artifacts/spec-1-4-check-every-pull-request-in-ci.md` (ca. 1600 tokens, godkjent).
- Ett åpent spørsmål ble avgjort av Helene før godkjenning: grenbeskyttelse kan ikke settes av bygget (kontoen har `admin: false`), så den dokumenteres i `docs/qa/branch-protection.md` og blir stående åpen.
- Branch `story/1.4-ci-on-pull-requests`; implementert direkte i hovedsesjonen; tre uavhengige gjennomgangslag (Blind Hunter, Edge Case Hunter, Verification Gap) etter at Helene sa ja til det; funn triagert og patchet.

### Resultat
- Commit `f2fb8d1` på `story/1.4-ci-on-pull-requests` (ikke pushet, ingen PR ennå): kode, spesifikasjon, triagelogg, utsatt arbeid og sprintstatus (1-4 satt til `review`).
- Nytt: `.github/workflows/ci.yml` (sjekk av sporede filer, bygg av `app` og `test` med `type=gha`-cache via `docker/bake-action`, `docker compose run --rm test`, `db:check`, `up -d --wait --no-build app`, `scripts/smoke.mjs`, `down -v`), `.github/pull_request_template.md`, `scripts/smoke.mjs` med tester (også som prosess), `scripts/db-check.ts` med test, `db:check` i `package.json`, `docs/qa/branch-protection.md`. Alle actions er festet til eksakte versjoner.
- `drizzle-kit check` skrev en tom `drizzle/meta/_journal.json` når historikken er tom; `db:check` hopper derfor over den til en story har laget en migrering, og skriver ingen filer.
- Verifisert: `npm test` på verten (96 enhetstester, 2 e2e), `actionlint` 1.7.12 uten funn, og de samme kommandoene som CI i Docker 29.7.2: bake med CI-navnene, `run --rm test`, `run test npm run db:check`, `up --wait --no-build app`, `exec app node scripts/smoke.mjs`, `down -v`. Ødelagt `_journal.json` gir `db:check` exit 1 (kjørt for hånd); en sporet `.env` gir feil i sporingssteget (kjørt for hånd).
- Gjennomgangen ga 20 funnrader: 9 rettet (bl.a. `main`-kjøringer som ble avbrutt av `concurrency`, `db:check` som meldte «migrert» uten å ha migrert, ikke-testet smoke-prosess, sjekk av bildenavn), 1 utsatt, 4 avvist som lave, 5 falske/vurdert. Se triageloggen i spesifikasjonen.
- Lukker det halve punktet «story 1.4 må ikke committe en tom `drizzle/`»: ingen `drizzle/` ble committet.

### Åpne punkter
- Grenbeskyttelse av `main` er ikke satt: noen med admin-rett på `IBE160-2026/G32-grotting` må sette regelen i `docs/qa/branch-protection.md` (krev PR, krev sjekken `ci`, ingen direkte push) og krysse av i dokumentet. `ci` dukker først opp i listen etter første CI-kjøring.
- CI er ikke kjørt på GitHub ennå; `type=gha`-cachen, `bake-action`-oppsettet og sjekknavnet `ci` er bare lest, ikke prøvd. Første pull request (story 1.4) viser om de virker.
- `db:check` er aldri kjørt mot en ekte migreringshistorikk (grenen med `drizzle-kit check`, feilutganger): legg til fixture-test i første story med migrering (se `deferred-work.md`).
