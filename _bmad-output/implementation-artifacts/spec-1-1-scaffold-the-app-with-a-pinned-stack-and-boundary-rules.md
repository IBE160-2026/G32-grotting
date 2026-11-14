---
title: 'Story 1.1: Scaffold the app with a pinned stack and boundary rules'
type: 'chore'
created: '2026-11-14'
status: 'done'
baseline_commit: 'd2785fcd2f349535c27df536a778ad8f278c452b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has no application code. Every later story needs one reproducible base where the architecture's slice boundaries are enforced by the linter, not by memory.

**Approach:** Scaffold Next.js with the spine's exact `create-next-app@16.4.6` command in a temp folder, move it to the repo root, pin every version it uses, and configure Biome boundary rules, Vitest, Playwright and `npm test`. Add `canon` and `Result` to `src/shared/core`. Covers NFR-6, NFR-11, AD-1, AD-2.

## Boundaries & Constraints

**Always:**
- First commit on the story branch adds only `.gitattributes` (`* text=auto eol=lf`, `*.pdf binary`); every other file comes in later commits. Commits cite `1.1` and the IDs.
- Work on branch `story/1.1-scaffold-pinned-stack` off `main`. Stage files by explicit path; never commit the unrelated dirty files (`_bmad-output/planning-artifacts/architecture/technology.md`, `.claude/agents/`, `.claude/skills/impeccable/`).
- Exact versions (no `^`/`~`) from the spine Stack table; `engines.node` `26.x`; `package-lock.json` committed. `.gitignore` is already tracked: add `.data/`, keep `.env*` except `.env.example`.
- Remove Geist; load no fonts here (Story 1.5 does).
- `canon` and `Result` are pure (no I/O, env, clock, randomness). All commands work on Windows, macOS and Linux.

**Never:**
- No dependencies beyond what this story's code and config use (see Design Notes). No `src/modules/*` folders, no placeholder files, no commented-out code.
- No `output: 'standalone'`, no Docker, CI, config or routes (Stories 1.2–1.4).
- Do not touch `README.md`, `docs/`, or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error Handling |
|----------|-------|----------|----------------|
| canon | `"  a\r\nb \t c  "` | `"a b c"` | N/A |
| canon NFC | `"é"` (decomposed) | `"é"` | N/A |
| canon idempotent | any `canon(canon(x))` | equals `canon(x)` | N/A |
| lint: slice internals | `a.ts` in slice A imports `@/modules/b/server/x` | `biome check` fails | N/A |
| lint: keywords/core | imports anything but `shared/core` | `biome check` fails | N/A |
| lint: integrity/core | imports anything but `keywords/core`, `shared/core` | `biome check` fails | N/A |
| lint: console | `console.log` outside `src/shared/server/log.ts` | `biome check` fails | N/A |

</frozen-after-approval>

## Code Map

Greenfield: no source exists. Reference only `epics.md` Story 1.1, the spine's Stack, Structural Seed and Conventions.

- `.gitattributes` -- first commit
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `biome.json` -- from the scaffold, then pinned
- `src/app/{layout.tsx,page.tsx,globals.css}` -- scaffold output, trimmed (no Geist, no demo content)
- `src/shared/core/{canon.ts,result.ts}` + `canon.test.ts` -- the only app code
- `vitest.config.ts`, `playwright.config.ts`, `e2e/home.spec.ts` -- test setup
- `.gitignore` -- add `.data/`

## Tasks & Acceptance

**Execution:**
- [x] `.gitattributes` -- create and commit alone, first -- line endings fixed before any source (Helene's `core.autocrlf=true`)
- [x] scaffold -- run the spine command in a temp folder outside the repo, move output into the repo root, drop `.git`/agents leftovers -- create-next-app refuses a non-empty folder
- [x] `package.json` -- pin all versions exactly, set `engines.node`, add scripts, run `npm install`, commit lockfile -- NFR-6
- [x] `src/app/*` -- remove Geist and demo content; `next build` must pass -- spine
- [x] `biome.json` -- `noRestrictedImports` per folder via overrides (cross-slice internals; `keywords/core`; `integrity/core`), `noConsole` error with an override for `src/shared/server/log.ts` -- AD-1, AD-2
- [x] `vitest.config.ts` -- alias `server-only` to an empty module; `test.env` `APP_ENV=local`, `DATABASE_URL=pglite://memory`, constant 32-byte base64 test `ENCRYPTION_KEY`; `@/` alias
- [x] `playwright.config.ts` -- one port constant (3100) for `baseURL` and `webServer`; `webServer.command` `next build && next start -p 3100`, `reuseExistingServer: false`, `env` `TEST_MODE=true APP_ENV=local DATABASE_URL=pglite://memory E2E=1`
- [x] `src/shared/core/canon.ts`, `result.ts`, `canon.test.ts` -- `canon`: NFC, CRLF/CR→LF, trim, collapse whitespace runs to one space; `Result<T,E>` with `ok`/`err` helpers; tests `describe('NFR-6 canon', …)`
- [x] `e2e/home.spec.ts` -- loads `/` and gets a 200 page -- `describe('NFR-11 scaffold', …)`
- [x] `package.json` scripts -- `npm test` = `biome check` → `next typegen` → `tsc --noEmit` → `vitest run` → `playwright test`, in that order

**Acceptance Criteria:**
- Given the repo, when `git log --reverse` is read, then the story's first commit changes only `.gitattributes`.
- Given a clean install, when `npm test` runs, then every stage passes and `next build` succeeds.
- Given `package.json`, when read, then no dependency uses `^`/`~`, Geist is gone, and `engines.node` is `26.x`.
- Given a throwaway file violating each lint row above, when `biome check` runs, then it fails; after deleting the files it passes.
- Given `git ls-files .data .env`, then it prints nothing.

## Implementation Notes

- Implemented directly (no subagent). Branch `story/1.1-scaffold-pinned-stack`, four commits: `.gitattributes` alone first, then scaffold, Biome rules, test setup + `canon`/`Result`.
- The starter wires Tailwind through `@tailwindcss/turbopack` in `next.config.ts` (no `postcss.config.mjs`); pinned to 4.3.5 as the Stack table says.
- Pinned: `next`, `react`, `react-dom`, `server-only`, `tailwindcss`, `@tailwindcss/turbopack`, `typescript`, `@biomejs/biome`, `vitest`, `@playwright/test`, `@types/node|react|react-dom`. `"type": "module"` added so Vitest loads its config natively.
- Biome `files.includes` is a whitelist of code paths: existing docs in the working tree are CRLF (`core.autocrlf=true`) and would fail the formatter.
- Boundary rules checked with throwaway files: cross-slice internals, relative escape (`../../../`), `keywords/core`, `integrity/core` and `console.log` all fail; `index`, `contracts`, `ui`, `ui/index`, `keywords/core` (and `/index`) pass; `src/shared/server/log.ts` may log. Files removed afterwards.
- `test/server-only-stub.ts` is the empty module Vitest aliases `server-only` to.
- Chromium was installed locally with `npx playwright install chromium` (not part of the repo).

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in commit "Apply review fixes"; defer = `deferred-work.md`.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | No repeatable test of the lint boundaries (VG) | medium | patch: `test/lint-boundaries.test.ts` lints 20 fixtures with the real `biome.json` |
| 2 | Core overrides drop the relative-escape rule; deeper relative imports pass (VG, EC, BH) | medium | patch: core overrides now ban `../**/server`, `ui`, `shared`, `modules`, `app`; tested |
| 3 | Bare packages and unprefixed Node built-ins pass in core (EC) | medium | patch: ban list added (react, next, drizzle-orm, fs, crypto, ...); full allow-list deferred to Story 2.4 |
| 4 | `src/app` and `src/shared` unchecked for slice internals (EC) | medium | patch: overrides added and tested |
| 5 | Short relative cross-slice imports not caught (EC, VG, BH) | low | defer: patterns cannot tell own-slice from cross-slice |
| 6 | `typecheck` fails before typegen (BH, EC) | medium | patch: `next typegen && tsc --noEmit` |
| 7 | Dead CRLF step in `canon`, misleading comment and test title, no empty-text test (BH) | low | patch: step removed, comment and tests corrected |
| 8 | `server-only` installed but unused (EC) | low | patch: removed; Vitest alias kept, first story that imports it installs it |
| 9 | No `save-exact` / `engine-strict` (BH, EC) | medium | patch: `.npmrc` added |
| 10 | Playwright browsers not installed by the repo (BH, EC) | medium | defer: Docker `test` stage (Story 1.3) and README |
| 11 | `/* config options here */` comment left in `next.config.ts` (BH) | low | patch: removed |
| 12 | Tailwind via `@tailwindcss/turbopack` unverified; spec names postcss (BH, EC) | false | the Stack table says "as the starter wires it"; `next build` and the e2e run pass; spec Code Map note recorded in Implementation Notes |
| 13 | `.gitignore` lacks `test-results/`, `playwright-report/` (EC) | false | both already in the tracked `.gitignore` (the reviewer saw only the diff) |
| 14 | `.env.example`, README, CI, env validation missing (BH) | false | Stories 1.2, 1.3, 1.4 |
| 15 | `data/**` vs `.data/` mismatch (BH) | false | different folders: `data/` is the Fixtures folder |
| 16 | `noConsole` also covers `scripts/`, `e2e/` (BH) | false | the story says every file except `log.ts` |
| 17 | `scripts/**` in Vitest include, no folder yet (VG) | low | rejected: harmless, `scripts/` comes in Story 1.3 |
| 18 | Port 3100 fixed, `reuseExistingServer: false`, thin e2e, null response (BH, EC) | low | rejected: the spec fixes these; the fix would add configuration |
| 19 | `tsconfig` target, `Result` helpers, `.gitattributes` only `*.pdf` (BH) | low | rejected: scaffold default, spec text, no named harm |
| 20 | Own-slice alias imports blocked, message wording (BH, EC) | low | rejected: by design, own files use relative imports |

## Design Notes

- **Dependency scope.** The AC says `package.json` lists "every Stack version exactly". This spec reads that as every version *present*: the scaffold plus tooling this story uses (`next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `typescript`, `@biomejs/biome`, `vitest`, `@playwright/test`, `@types/node`, `@types/react`, `@types/react-dom`, `server-only`). Later stories add the rest (`zod`, `drizzle-*`, `tsx`, `@axe-core/playwright`, …) at the Stack versions, so nothing sits unused (NFR-11). Chosen over installing all ~27 up front, which would carry the two AI bake-off contenders and break "no dead code".
- Biome `noRestrictedImports` takes `paths`/`patterns` per `overrides[].includes`; allowed cross-slice entries are only `index`, `contracts`, `ui/index` (and `core/index` for `keywords`, `integrity`). Verify with throwaway files, not by reading docs alone.

## Verification

**Commands:**
- `npm test` -- expected: all five stages pass
- `npx biome check` -- expected: pass; fails on throwaway violating files
- `git ls-files .data .env` -- expected: no output
- `git log --reverse --stat main..HEAD` -- expected: first commit is `.gitattributes` only
