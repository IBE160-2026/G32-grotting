---
title: 'Story 1.7: Deploy the skeleton to the Hosted version'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: '3229e5ee2325898b324d6d1debb18aa615f3b324'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app only runs locally. The Examiner has no stable HTTPS URL, nothing builds the app from `main`, the Hosted database has no keep-alive, and nobody has recorded whether Vercel's and Supabase's data processing agreements cover the free plans.

**Approach:** Add `vercel.json` (Production deploys from `main` only, functions in `fra1`, build runs `db:migrate` then `next build`), a twice-daily `keep-alive.yml` that calls `/api/health`, and a `docs/qa/` record with the set-up steps, the two DPA checks and the FR-30 manual row. Name the Hosted URL in the README once it exists. Covers FR-30, FR-31, NFR-7, NFR-8, AD-3, AD-9.

## Boundaries & Constraints

**Always:**
- Branch `story/1.7-deploy-hosted-skeleton` off `main`. Commits cite `1.7` and the IDs. Stage by explicit path.
- `vercel.json` is exactly: `framework` `nextjs`, `regions` `["fra1"]`, `buildCommand` `npm run db:migrate && npm run build`, `git.deploymentEnabled` `{ "**": false, "main": true }`. It holds no environment values.
- Production environment on Vercel: `APP_ENV=hosted`, a random `ACCESS_CODE` of 16+ characters, `DATABASE_URL` only. No `AI_PROVIDER`, `AI_MODEL` or `AI_API_KEY` yet, so Hosted runs in Test mode with the AI sections unavailable. `DATABASE_URL` is set for Production only.
- Supabase Free in `eu-central-1`: Data API off, RLS on with no policies (new tables get RLS in the migration that creates them), `DATABASE_URL` is the session pooler (port 5432) with `?sslmode=require`. No code change to `db.ts` (already `{ max: 1, idle_timeout: 20 }`).
- `keep-alive.yml`: `schedule` with two cron entries a day, plus `workflow_dispatch`; `permissions: {}`; reads the URL from the repository variable `HOSTED_URL` through `env:` (never inlined in a `run` line); fails with a clear message if it is empty, on a non-200 answer, or when the body is not `"ok":true`.
- The Access code, the database password and any key appear in no committed file, log line or CI output. The Access code is handed in with the submission.
- `docs/qa/` text is English like the other docs; dated entries use `2026-MM-DD`.
- Decision (Helene, 2026-11-15): code first, set-up after. This story's PR holds the files, runbook and tests. Helene creates the Supabase and Vercel projects when she has time; the README names the URL in a small follow-up commit, and the story stays `in-review` until then.
- Decision (Helene, 2026-11-15): the DPA record is drafted from the public Vercel and Supabase terms, with links and the date, and marked «to confirm in the dashboard» for Helene to tick.

**Never:**
- No `Dockerfile.vercel`, no change to the root `Dockerfile` or `compose.yaml`. No preview deployments. No new dependency. No `supabase-js`. No AI settings on Vercel. No edit to `config.ts`, `db.ts`, the gate or `/api/health`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Open Hosted | GET `<url>/` without cookie | redirect to `/tilgang`; after the code, the app shell | N/A |
| Plain HTTP | `http://<host>/` | redirect to HTTPS (Vercel) | N/A |
| Health | GET `/api/health` without cookie | 200, `data.hosted` true | N/A |
| Missing setting | Production without `ACCESS_CODE` or `DATABASE_URL` | the build or start fails with the setting named | no value printed |
| Other branch | push to a branch other than `main` | no Vercel deployment | N/A |
| Keep-alive, no variable | `HOSTED_URL` unset | workflow fails, names the variable | N/A |
| Keep-alive, app down | non-200 or body without `"ok":true` | workflow fails | N/A |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.7; spine AD-3, AD-9, deployment section (cut 0 and keep-alive notes); PRD FR-30, FR-31. Reused as is: `scripts/migrate.ts` (`npm run db:migrate`, only way to migrate), `src/shared/server/db.ts` (`{ max: 1, idle_timeout: 20 }`), `config.ts` (refuses `VERCEL=1` without `APP_ENV=hosted`, short `ACCESS_CODE`, missing `DATABASE_URL`), `src/proxy.ts` (`/api/health` exempt), `docs/qa/branch-protection.md` (style).

- `vercel.json` -- new, as above
- `.github/workflows/keep-alive.yml` -- new, no third-party actions (only `curl`)
- `scripts/hosted-config.test.ts` -- Vitest: reads `vercel.json` and `keep-alive.yml` as text/JSON (no YAML dependency) and checks each Always rule
- `docs/qa/hosted-deployment.md` -- new: Supabase and Vercel set-up steps, variable table (names only), DPA record, FR-30 manual row for the skeleton (HTTPS, redirect, code, health, HTTP redirect, keep-alive run), note that GitHub disables schedules after 60 days without activity and that UJ-1 on a phone is recorded in Story 3.12
- `README.md` -- add a «Hosted version» section: Access code comes with the submission, link to the runbook; the URL line is added in the follow-up commit after the first deploy

## Tasks & Acceptance

**Execution:**
- [x] `vercel.json`, `scripts/hosted-config.test.ts` -- config and its test -- FR-30, AD-3
- [x] `.github/workflows/keep-alive.yml` -- two runs a day on `/api/health` -- AD-9, NFR-8
- [x] `docs/qa/hosted-deployment.md`, `README.md` -- runbook, DPA record from public terms, FR-30 row, README section -- FR-30, FR-31, NFR-7
- [ ] After merge, by Helene following the runbook -- Supabase, Vercel variables, `HOSTED_URL` variable, first deploy, FR-30 row filled, README URL (follow-up commit)

**Acceptance Criteria:**
- Given `main` changes, when Vercel builds, then it runs `db:migrate` before `next build`, deploys Production only from `main`, and no secret is committed.
- Given the first deploy is done and the Hosted URL without the code, when opened, then it redirects to `/tilgang`, and after the code it shows the app shell; `/api/health` returns `hosted: true`; plain HTTP redirects to HTTPS.
- Given the keep-alive workflow is run by hand, when `HOSTED_URL` is set, then it passes and the run shows a 200 answer.
- Given `npm test` and `docker compose run --rm --build test`, then Biome, typecheck, Vitest and Playwright pass.

## Implementation Notes

- Implemented directly in the main session (no subagent), as in Stories 1.4 to 1.6. Verified: `npm test` on the host (Biome, typecheck, Vitest incl. 8 new tests in `scripts/hosted-config.test.ts`, 36 Playwright) and `docker compose run --rm --build test` pass.
- **DPA finding (2026-11-15, public terms):** Vercel's DPA states it applies to Enterprise and Pro plans and does not name Hobby, so it is recorded as «No, as written»; Supabase's DPA makes no plan distinction, recorded «Yes, as written». Neither is confirmed in a dashboard. `docs/qa/hosted-deployment.md` §1 lists the next step (ask Vercel support, or accept that the README run is the delivery per PRD §5.1 and update PRD §11).
- The last task (Supabase, Vercel variables, `HOSTED_URL`, first deploy, FR-30 row dates, README URL) is Helene's, after merge, per the code-first decision. It stays unchecked; the FR-30 row dates are blank until then. The ACs about the live URL and the keep-alive run are not verified.
- Not verified: the Vercel build itself (`db:migrate` with the Production environment), `sslmode=require` against Supabase, and the workflow on GitHub.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; defer = `deferred-work.md`; reject = no action. No intent_gap or bad_spec findings.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | Vercel DPA does not cover Hobby «as written»; no decision recorded, merge not gated (BH) | medium | reject: the finding is already recorded as the first result of the story (§1 of the runbook, with the two ways forward). The decision is Helene's, and the code-first decision lets her take it before deploying. Surfaced in the summary |
| 2 | Brittle `"ok":true` substring match; a local-mode answer also passes (BH, EC, VG) | medium | patch: workflow parses with `jq -e '.ok == true and .data.hosted == true'`; test checks the expression |
| 3 | HOSTED_URL without `https://`; redirect gives a misleading failure; status not printed, so the «200 answer» AC cannot be read from the log (EC) | low | patch: scheme check, `--write-out 'HTTP %{http_code}'` |
| 4 | First build fails when Vercel is imported before the variables are set; no «if the build fails» line (BH, EC) | medium | patch: runbook says to fill the variables on the import page, and adds the failed-build line |
| 5 | `indexOf("run: \|")` of -1 makes the no-`${{` test vacuous (EC) | low | patch: test asserts the index is found |
| 6 | `buildCommand` test does not tie the names to `package.json` scripts (VG) | medium | patch: test checks each `npm run X` exists |
| 7 | Redirect row says «redirects» not 308; no row for «only `main` deploys» (BH, EC) | low | patch: both rows in the FR-30 table |
| 8 | `regions` covers functions only; data-residency wording unclear (BH, EC) | low | patch: one sentence under the EU region row |
| 9 | No note on Access code rotation, public `/api/health`, or keep-alive during cut 0 (BH, EC) | low | patch: three bullets under «Things to remember» |
| 10 | `db:migrate` before `next build` leaves the database ahead if the build fails (EC) | low | reject: order is fixed by the spec (AD-9, AC); migrations are forward-only and a failed build keeps serving the old deploy against a compatible schema as long as migrations are additive |
| 11 | `migrate.ts` takes no advisory lock; two parallel Production builds could race (EC) | low | defer: `migrate.ts` is not changed here; no migration exists yet |
| 12 | GitHub disables the schedule after 60 days; failures only visible in Actions (BH, EC) | low | reject: already in the workflow comment and the runbook; GitHub also emails failed scheduled runs |
| 13 | Cron regex assumes double quotes; tests read files by relative path; key set is locked (BH, EC) | low | reject: failing loudly on reformatting is the intended guard; the other tests use relative paths too |
| 14 | Unclear how Vercel resolves `"**": false` against `main: true` (EC) | maybe-false | patch: the new «Only `main` deploys» row settles it at the first deploy; the pattern comes from the spine |
| 15 | Keep-alive reaching Supabase is not tested; a paused project fails the first run (BH) | low | reject: `/api/health` runs `SELECT 1` (tested in `e2e/health.spec.ts`); resuming a paused project is in the runbook |
| 16 | Mixed English and Norwegian in the doc; no «who ran it» column (BH) | low | reject: UI strings are quoted in Norwegian by design; the row is filled by Helene |
| 17 | Actual `sslmode=require` against Supabase and the Vercel build are untested (VG) | maybe-false | defer: cannot run without the accounts; settled by the first deploy and FR-30 row |

## Design Notes

- **Why `regions` in `vercel.json`.** The region then lives in the repository, not only in the dashboard, so the EU rule (FR-30) is reviewable. One region is all Hobby allows.
- **Deploy trigger.** Merging this story's PR to `main` triggers the first Production build. Set the three Vercel variables and `DATABASE_URL` before merging, or that build fails with the setting named (a failed build changes nothing that is live).
- **Why the URL is a repository variable.** The URL is not a secret, and a variable can be set after the first deploy without editing the workflow.

## Verification

**Commands:**
- `npm test` -- expected: Biome, typecheck, Vitest (including `hosted-config.test.ts`) and Playwright pass
- `docker compose run --rm --build test` -- expected: passes
- `curl -i https://<host>/api/health` and `curl -I http://<host>/` -- expected: 200 with `"hosted":true`; the HTTP request redirects to HTTPS

**Manual checks:**
- Hosted URL on a laptop: redirect to `/tilgang`, wrong code refused, correct code shows Hjem. Run the keep-alive workflow from the Actions tab once.
