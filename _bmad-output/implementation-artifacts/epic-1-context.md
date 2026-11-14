# Epic 1 Context: Open the app and give it a CV and a job ad

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The Examiner starts JobAssistant with one Docker command, or opens the Hosted version with an Access code. The Student uploads or pastes a CV, corrects and confirms the extracted text, and enters the job ad, job title and employer on Søknad. Nothing is analysed yet. The epic also lays the reproducible base (pinned scaffold, config, CI, deploy, design system, shared UI) that every later epic reuses.

## Stories

- Story 1.1: Scaffold the app with a pinned stack and boundary rules
- Story 1.2: Read configuration in one place and answer a health check
- Story 1.3: Start the app and run the tests with one Docker command each
- Story 1.4: Check every pull request in CI
- Story 1.5: Show every page in the JobAssistant look, with an accessible shell
- Story 1.6: Close the Hosted version with an Access code
- Story 1.7: Deploy the skeleton to the Hosted version
- Story 1.8: Read what JobAssistant does on Hjem
- Story 1.9: Enter the job ad, job title and employer on Søknad
- Story 1.10: Paste and confirm the CV text on Søknad
- Story 1.11: Upload a CV file and correct the extracted text

## Requirements & Constraints

- CV: upload .pdf/.txt ≤ 2 MB (type/size rejected in the field before anything is sent), or paste 200–20,000 chars; extracted text is editable and must be confirmed before use; scanned PDFs ask for pasted text; uploaded file is discarded after extraction.
- Job ad 200–15,000 chars; job title and employer required, ≤ 200 chars each; no file or URL import.
- Hosted version is closed behind an Access code (random, ≥ 16 chars, never committed); deployed to Vercel Hobby + free Supabase, EU region, HTTPS.
- All UI text in bokmål, `lang="nb"`, from `src/shared/ui/messages.nb.ts` only; WCAG 2.2 AA, usable from 360 px single column; touch targets ≥ 44 px.
- Deterministic builds: every dependency and Docker image version pinned exactly (no `^`); lockfile committed.
- Secrets only in environment variables; `.env*` and `.data/` git-ignored; CI fails if `git ls-files .data .env` prints anything.
- Docker is the only prerequisite to run (README in 15 min): `docker compose up --build`, `docker compose run --rm --build test`, `docker compose down -v`. No paid account or key needed locally.
- Linter/formatter clean; no dead code. Every story cites FR/NFR IDs; one branch per story (`story/<epic>.<story>-<slug>`), PR names IDs, commits cite story/FR IDs; tests named by requirement ID.

## Technical Decisions

- Vertical slices in `src/modules/<slice>/{core,server,ui}`; shared kernel in `src/shared/{core,server,ui}`. Created only when they have code. Epic 1 slices: `cv`, `identity/core` (gate decision only). A shared part is created in the first story that needs it and extended, never duplicated.
- Public entry points only (`index.ts` with `import 'server-only'`, `contracts.ts`, `ui/index.ts`); import rules enforced by Biome `noRestrictedImports`; `noConsole` error everywhere except `shared/server/log.ts`. `core/` is pure (no I/O, env, clock, randomness).
- Scaffold: `create-next-app@16.4.6` with the spine's flags in a temp folder, moved to the repo root; Next 16.4.6, React 19.3.1, Tailwind 4.3.5, TS 5.9.3, Biome 2.6.7, Vitest 5.1.0, Playwright 1.65.0, Node 26.x. `.gitattributes` (`* text=auto eol=lf`, `*.pdf binary`) is the first commit. Remove Geist.
- `src/shared/server/config.ts` is the only reader of `process.env`/`SECRETS_FILE` (lazy, memoised zod parse); run modes (`testMode`, `hosted`, adapters, feature flags with defaults only in `FEATURE_DEFAULTS`); startup errors for bad Hosted config; `RunMode` sent from root layout into a client context.
- Route handlers wrapped in `handle()`, body parsed with the slice's zod schema; envelope `{ ok, data }` / `{ ok:false, error:{ code, field?, retryable } }`; client uses `api-client.ts`; no Server Actions. `GET /api/health` runs `SELECT 1`, returns `{ hosted }`. `POST /api/cv/extract` (unpdf, in memory, writes nothing). `POST /api/access` + `src/proxy.ts` with cookie `ja_access` = HMAC of the Access code; pure `gateDecision` in `identity/core`.
- Docker: one multi-stage `Dockerfile` on `node:26.13.1-trixie-slim` (stages deps, build, app, test); `compose.yaml` services db (postgres 17.12-alpine), app, test; `scripts/setup.ts` (secrets, migrate, seed) and `scripts/migrate.ts`; scripts are TypeScript via `tsx`. DB: Drizzle on Postgres 17, PGlite in memory for tests.
- CI: GitHub Actions builds app + test, runs tests, `db:check`, smoke test; protected `main`. Vercel: `vercel.json` deploys only `main`, region `fra1`, build runs `db:migrate` then `next build`.
- Client state: one `sessionStorage` key `ja.session.v1` via `client-session.ts` only.

## UX & Interaction Patterns

- DESIGN.md tokens become Tailwind v4 `@theme` variables in `globals.css`; one dark theme, square corners, no component library; fonts via `next/font/google` (Schibsted Grotesk, DM Mono, Archivo `wdth`); custom `max-640` variant.
- Shared UI built here: app bar and nav (collapses at ≤ 640 px), buttons (busy state via `aria-disabled`), link, amber focus ring, text field (validate on blur/submit, input never cleared), password toggle, file picker (hidden native input, label as control), alert/notice, skip link «Hopp til hovedinnholdet», landmarks, two live regions with `announce()`, Test-mode banner.
- Surfaces: Hjem (no pulse plot yet), Søknad form (before-S6 variant: CV picker/paste with «Bekreft CV-teksten»), Tilgangskode (`/tilgang`), Ikke funnet. Before-S6 nav is Hjem · Søknad only; no Historikk, no catalogue numbers.
- Every screen passes axe (0 serious/critical) at 1280 px and 360 px, no horizontal scroll at 320 px.

## Cross-Story Dependencies

- 1.1 is the base for everything; 1.2 (config, health) precedes 1.3 (Docker), 1.4 (CI), 1.6 (gate) and 1.7 (deploy).
- 1.5 creates the shared UI shell that 1.8–1.11 reuse; 1.9–1.11 build up the same Søknad form.
- 1.11 reuses the file picker and `/api/cv/extract`; extraction is owned by `cv`.
- Epic 2 builds on the Søknad form and shared kernel; Epic 6 later replaces the before-S6 CV slot and the access gate behaviour.
