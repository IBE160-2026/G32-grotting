# Story 3.2: Daglig tak og KI-varsel på serveren

## 2026-11-18 kl. 13:26 — Helise-26

### Oppgave
Bygge Story 3.2 med `/bmad-build`: serveren skal avvise en KI-forespørsel når varselet ikke er godtatt eller det daglige taket (30 per installasjon per dag, Oslo-døgn) er nådd (FR-24, FR-25, NFR-8, AD-4, AD-13). Bruk anbefalt spec, subagenter til review, merge når ferdig.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-2-enforce-the-daily-cap-and-the-ai-notice-on-the-server.md` (ingen åpne spørsmål, godkjent som anbefalt).
- Implementasjon i subagent på branch `story/3.2-enforce-the-daily-cap-and-the-ai-notice-on-the-server`; review med Blind Hunter, Edge Case Hunter og Verification Gap parallelt; tre patcher gjort av samme subagent.

### Resultat
- Nytt: `osloDay` (`src/shared/core/time.ts`), `ai_usage`-tabell og første migrasjon (`drizzle/0000_*`), `reserveRequest` med atomisk reservasjon (`daily-cap.ts`), varsel- og takssteg i `runAi` (hoppes over i Testmodus), `config.aiNotice` (versjon, leverandørnavn, retensjonsdager) bæres i RunMode, ny valgfri `AI_RETENTION_DAYS`.
- `AiContext = { studentId, consent }`, `AiFailure` har fire koder (`retryable` bare for timeout og leverandørfeil). `mock` velges i tester via `AiRunOptions.testMode`, ikke via config.
- Verifisert: `npx biome check`, `npm run typecheck`, `npx vitest run` (60 filer, 661 bestått, 2 forventet feil), `npm run db:check`, `npm run db:migrate`. Docker og e2e ikke kjørt lokalt.
- Review: 3 patcher (test av standardverdi for Testmodus, test av at taket feiler lukket ved DB-feil, kommentar på versjonsprefiks), ett punkt utsatt, resten avvist eller falskt (se Review Triage Log i spec-en).

### Åpne punkter
- Taket og «30 av 35 samtidige»-testen er bare kjørt på PGlite; verifiser mot ekte Postgres (Docker) eller ved første live-kjøring i Story 3.12.
- Første migrasjon: Vercel-bygget kjører `db:migrate` (`vercel.json`), så `ai_usage` opprettes i Supabase ved første produksjonsbygg etter merge; kontroller at bygget går grønt.
- Story 3.3: sett `AI_RETENTION_DAYS` og `AI_PROVIDER` når leverandøren er valgt (varselversjonen bruker dem); bump `notice-1`-prefikset i `config.ts` når varseltekstene skrives (3.6/3.7).
- `db:check` feil-exit-fixtures og `runSetup`-rekkefølgetesten er fortsatt utsatt (notat lagt til i `deferred-work.md`).
