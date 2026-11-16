# Epic 1 Context: Open the app and give it a CV and a job ad

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The Examiner starts JobAssistant with one Docker command (the README run is the delivery). The Hosted version, a closed skeleton behind an Access code, also exists but stays without AI, because Vercel's data processing agreement does not cover the Hobby plan. The Student uploads or pastes a CV, corrects and confirms the extracted text, and enters the job ad, job title and employer on Søknad. Nothing is analysed yet. The epic also lays the reproducible base (pinned scaffold, config, CI, deploy, design system, shared UI) that every later epic reuses.

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

- CV: upload .pdf/.txt ≤ 2 MB (type/size rejected in the field before anything is sent), or paste 200–20,000 chars; extracted text is editable and must be confirmed before use, and any edit needs re-confirmation; scanned PDFs ask for pasted text; the uploaded file is discarded after extraction.
- Job ad 200–15,000 chars; job title and employer required, ≤ 200 chars each; no file or URL import.
- Hosted version is closed behind an Access code (random, ≥ 16 chars, never committed), on Vercel Hobby + free Supabase, EU region, HTTPS. It is a skeleton only: gate and app shell, no AI. Its reduced delivery is a README note.
- All UI text in bokmål, `lang="nb"`, from `src/shared/ui/messages.nb.ts` only; WCAG 2.2 AA, usable from 360 px in a single column; touch targets ≥ 44 px.
- Deterministic builds: every dependency and Docker image version pinned exactly (no `^`); lockfile committed.
- Secrets only in environment variables; `.env*` and `.data/` git-ignored; CI fails if `git ls-files .data .env` prints anything.
- Docker is the only prerequisite (README run in 15 min): `docker compose up --build`, `docker compose run --rm --build test`, `docker compose down -v`. No paid account or key needed locally.
- Linter/formatter clean; no dead code. Every story cites FR/NFR IDs; one branch per story (`story/<epic>.<story>-<slug>`), PR names IDs, commits cite story/FR IDs; tests named by requirement ID; each Manual Verify line gets a row in `docs/qa/`.

## Technical Decisions

- Vertical slices in `src/modules/<slice>/{core,server,ui}`; shared kernel in `src/shared/{core,server,ui}`. Layers exist only when they have code. Epic 1 slices: `cv`, `identity/core` (gate decision only), plus `application` contracts/UI for the form. A shared part is created in the first story that needs it and extended, never duplicated.
- Public entry points only (`index.ts` with `import 'server-only'`, `contracts.ts`, `ui/index.ts`); import rules enforced by Biome `noRestrictedImports`; `noConsole` is an error except in `shared/server/log.ts`. `core/` is pure (no I/O, env, clock, randomness).
- Scaffold: `create-next-app@16.4.6` run in a temp folder and moved to the repo root; Next 16.4.6, React 19.3.1, Tailwind 4.3.5, TS 5.9.3, Biome 2.6.7, Vitest 5.1.0, Playwright 1.65.0, unpdf 2.1.0, Node 26.x. `.gitattributes` (`* text=auto eol=lf`, `*.pdf binary`) is the first commit. Geist removed.
- `src/shared/server/config.ts` is the only reader of `process.env` (lazy, memoised zod parse). Run modes: no AI key or `TEST_MODE=true` means Test mode with the cached adapter; feature flags default off, defined only in `FEATURE_DEFAULTS`. Bad Hosted config is a startup error. `RunMode` goes from the root layout into a client context.
- Route handlers are wrapped in `handle()` and parse the body with the slice's zod schema; envelope `{ ok, data }` / `{ ok:false, error:{ code, field?, retryable } }`; client calls go through `api-client.ts` (failed fetch becomes `NETWORK_ERROR`); no Server Actions. `GET /api/health` runs `SELECT 1` and returns `{ hosted }`. `POST /api/cv/extract` extracts in memory with unpdf and writes nothing. `POST /api/access` plus `src/proxy.ts` use cookie `ja_access` (HMAC of the Access code); the pure `gateDecision` lives in `identity/core`; the gate never applies with `APP_ENV=local`.
- Docker: one multi-stage `Dockerfile` on `node:26.13.1-trixie-slim` (stages deps, build, app, test); `compose.yaml` services db (postgres 17.12-alpine), app, test; `scripts/setup.ts` migrates under an advisory lock and runs local-only steps only for `APP_ENV=local` with a local DB host; scripts are TypeScript via `tsx`. DB: Drizzle on Postgres 17, PGlite in memory for tests.
- CI: GitHub Actions builds app and test, runs tests, `db:check`, smoke test; `main` protected. Vercel: `vercel.json` deploys only `main`, region `fra1`; build runs `db:migrate` then `next build`; a keep-alive workflow pings `/api/health`.
- Client state: one `sessionStorage` key `ja.session.v1`, accessed only through `client-session.ts`; `applicationId` made with `crypto.randomUUID()` and reused until inputs change.

## UX & Interaction Patterns

- DESIGN.md tokens become Tailwind v4 `@theme` variables in `globals.css`; one dark theme, square corners, no component library; fonts via `next/font/google` (Schibsted Grotesk, DM Mono, Archivo `wdth`); custom `max-640` variant.
- Shared UI built here: app bar and nav (collapses at ≤ 640 px with «Meny»/«Lukk»), buttons (busy state via `aria-disabled`), link, amber focus ring, text field (validate on blur/submit, input never cleared), password toggle, file picker (hidden native input, label as control), alert/notice, skip link «Hopp til hovedinnholdet», landmarks, two live regions with `announce()`.
- Surfaces: Hjem (no pulse plot yet, no placeholders for deferred features), Søknad form (before-S6 variant: CV picker/paste with «Bekreft CV-teksten», collapsing to a confirmed line), Tilgangskode (`/tilgang`), Ikke funnet. Before-S6 nav is Hjem · Søknad only; no Historikk, no catalogue numbers.
- Every screen passes axe (0 serious/critical) at 1280 px and 360 px, with no horizontal scroll at 320 px.

## Cross-Story Dependencies

- 1.1 is the base for everything; 1.2 (config, health) precedes 1.3 (Docker), 1.4 (CI), 1.6 (gate) and 1.7 (deploy).
- 1.5 creates the shared UI shell that 1.8–1.11 reuse; 1.6 creates the text field and `api-client` that later forms reuse; 1.9–1.11 build up the same Søknad form.
- 1.11 reuses the CV input from 1.10 and owns `/api/cv/extract` (extraction belongs to `cv`).
- Epic 2 builds on the Søknad form and shared kernel; Epic 6 later replaces the before-S6 CV slot and the access-gate behaviour, and adds local secrets (`SECRETS_FILE`) and the test-user seed to setup.
