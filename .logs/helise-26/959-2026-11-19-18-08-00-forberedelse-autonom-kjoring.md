# Forberedelse til autonom kjøring av resten av epikene

## 2026-11-19 kl. 18:08 — Helise-26

### Oppgave
Helene vil bygge resten av epikene (3.4–7.5, 36 stories) autonomt med `/goal`, uten menneske i løkka. Før det skulle vi finne ut hva hun selv må gjøre: API-nøkler, CLI-verktøy og alt annet som blokkerer en uovervåket kjøring.

### Plan
- Kartlegge verktøy (node, docker, gh, uv, Playwright), `.env`, GitHub-variabler og CI.
- Lese `bmad-build-auto` (forutsetninger for uovervåkt kjøring) og `epics.md` for steg bare et menneske kan gjøre.
- Sjekke OpenRouter-nøkkelen mot OpenRouters `/key`-endepunkt (grense og forbruk, uten å skrive ut nøkkelen).
- Helene valgte alternativ (a) for D23: Hosted forblir et skjelett, README-kjøringen er leveransen. Skriv om stories som antok live KI eller kontoer på Hosted.

### Resultat
- **Verktøy:** node 26.7, npm, git, gh (innlogget som Helise-26, scopes `repo` og `workflow`), docker (daemon kjører), uv, python og Playwright Chromium finnes. Mangler `gitleaks`/`trufflehog` (story 7.4; kan kjøres via Docker). `vercel`-CLI mangler (valgfritt, ikke nødvendig med alternativ (a)).
- **Nøkkel:** `.env` har `AI_PROVIDER=openrouter`, `AI_MODEL=anthropic/claude-sonnet-5.5` og `AI_API_KEY`. OpenRouter svarer at nøkkelen er gyldig, ikke gratisnivå, grense 20 USD per måned (ca. 200 NOK), forbrukt 0,31 USD. Ingen GitHub-secrets; CI trenger ingen.
- **Hindringer for uovervåkt kjøring:** arbeidstreet er skittent (3.4 `in-review`, `sprint-status.yaml` endret, `AGENTS.md` ukommittert), og `bmad-build-auto` stopper på skittent tre. Ingen permission-allowlist i `.claude/settings.local.json`, så `git`/`docker`/`npm`/`gh` ville spurt hver gang.
- **Endret `_bmad-output/planning-artifacts/epics.md` (ukommittert):**
  - Story 3.12 skrevet om til «Freeze the Hosted version and pass the core-flow checkpoint»: `vercel.json` `main: false`, Hosted-regel i `config.ts` (AI_PROVIDER uten nøkkel feiler), sjekkpunktet kjøres lokalt, UJ-1 på laptop og ekte telefon mot lokal app.
  - Story 6.12: ingen `ENCRYPTION_KEY` i Vercel, Hosted forblir frosset med kontoer av, Access-kode-regelen ved registrering dekkes av enhetstester, UJ-1 og UJ-2 gås gjennom på lokal Docker-app.
  - Epic 7 (intro, 7.3, 7.5) og FR-30-raden i dekningstabellen: Hosted er et frosset skjelett (D23), README-notat.
- Ingenting commitet eller pushet bortsett fra denne loggen. `epic-3-context.md` kompileres på nytt av build-auto fordi planleggingsfilene er nyere.

### Åpne punkter
- Lukk story 3.4 (review, commit, push, PR, merge) og commit `epics.md`-endringene og `AGENTS.md` (eller gitignorer den), slik at treet er rent før `/goal`.
- Frys Hosted før neste merge til `main` (sett `main` til `false` i `vercel.json`): ellers får Hosted hver ufullstendig feature, og Epic 6-migrasjoner kjøres mot Supabase ved hver merge. Planlagt i 3.12, men bør flyttes frem; avventer Helenes svar.
- Avgjør hvem som pusher, åpner PR og merger under autonom kjøring (CLAUDE.md sier at Helene pusher), og sett opp permission-modus eller allowlist (`/fewer-permission-prompts`) før `/goal`.
- Menneske-steg som løkka må stoppe for: §9.2-sjekklisten (L1–L8, G1–G5, R1–R3) i 4.3, 5.4 og 7.1; ekte telefon og skjermleser (3.12, 7.2); rent-maskin-kjøring på Windows og macOS/Linux (7.3); Access-koden og keep-alive-sjekk (7.5).
- KI-varselet (3.6) må navngi OpenRouter og modellverten (Google Vertex eller Amazon Bedrock); radene i `docs/qa/ai-provider-terms.md` er ikke bekreftet av Helene. Bekreft at OpenRouters «prompt logging» og «use of inputs/outputs» er av. Vurder `provider.only` for å låse verten.
- PRD §11 og FR-30/FR-31/UJ-3 avstemmes mot D23 i story 7.5 (allerede planlagt).
- Vurder å heve OpenRouter-grensen (20 USD) hvis live-innspillingene i 3.5, 3.11, 4.3, 5.1, 5.4 og 7.1 ikke holder.
- Foreslått goal-oppdeling: (1) Epic 3 til og med 3.11, (2) Epic 4 og Epic 5 frem til live-sjekklisten, (3) Epic 6, (4) Epic 7; hvert goal stopper ved et menneske-steg og skriver det til `issues.md`.
