# Hosted version: set-up, DPA record and FR-30 row

Story 1.7 (FR-30, FR-31, NFR-7, NFR-8, AD-3, AD-9). The repository holds `vercel.json` and `.github/workflows/keep-alive.yml`. The accounts, the variables and the first deploy are done by hand, once, by following this page.

## 1. DPA record

Drafted 2026-11-15 from the public terms. **Not yet confirmed in the dashboards.**

| Provider | Plan  | What the public terms say                                                                                                                                                                                                                                                                                                                                | Covered?                                                     | Confirmed by Helene |
| -------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| Vercel   | Hobby | The DPA ([https://vercel.com/legal/dpa](https://vercel.com/legal/dpa), last updated 2026-03-17, effective 2026-03-31) states that it applies to processing «for Customers who are on Enterprise and Pro plans». Hobby is not named. Transfers use the EU Standard Contractual Clauses (decision 2021/914); the Data Privacy Framework is not mentioned. | **No, as written.** Hobby is outside the stated scope. | [ ]                 |
| Supabase | Free  | The DPA ([https://supabase.com/legal/dpa](https://supabase.com/legal/dpa), version 1, 2026-08-01) forms part of the Terms of Service and makes no difference between plans. Transfers use the Standard Contractual Clauses, with UK and Swiss addenda; accepting the agreement counts as signing them.                                                    | **Yes, as written.**                                   | [ ]                 |

**What this means.** PRD §5.1 says that if either DPA does not cover the free plan, the README run becomes the delivery and PRD §11 is updated. The Vercel line is that case, as the public text reads. Before relying on it, do one of:

- Ask Vercel support whether the DPA also covers Hobby, and record the answer here with the date.
- Or accept the finding: the README run is the delivery, the Hosted version stays a skeleton, and PRD §11 is updated. **This is the option taken.**

**Decision (Helene, 2026-11-15):** accept the finding. The public Vercel DPA names Enterprise and Pro, not Hobby, and Vercel support was not asked. Per PRD §5.1 (cut 0) the README run (NFR-9) is the delivery. The Hosted version stays a skeleton: the Access code gate and the app shell, with no AI and no Student data. The change is logged as D23 in PRD §11. Stories that assume a live-AI Hosted version (3.12, 6.12, 7.x) are to be matched in a later pass.

**Frozen 2026-11-19 (Helene, option (a)):** `git.deploymentEnabled.main` in `vercel.json` is `false`, so no merge deploys any more and Hosted stays at its last skeleton deploy (the one from the merge of Story 3.4, PR #48, or earlier; no `AI_*` variable is set). Stories 3.12 and 6.12 in `epics.md` were rewritten to match. To confirm in Vercel: Settings → Git shows no Production deployment after this change, and Production has no `AI_*`, `FEATURE_*` or `ENCRYPTION_KEY` variable.

## 2. Set-up (once)

Do these in order. The first Production build starts when the story's pull request is merged to `main`, so finish steps 1 and 2 before merging.

### Supabase

1. New project on the Free plan, region **Central EU (Frankfurt)** (`eu-central-1`; the real project is in `eu-west-1`, see section 3), Postgres 17. Save the database password in a password manager.
2. Project Settings → Data API: turn the Data API **off**.
3. Turn on automatic RLS for new tables if the project offers it. Every migration that creates a table must also enable RLS on it, with no policies (AD-9). No table exists yet.
4. Connect → **Session pooler** (port 5432). Copy the URI, put the password in, and add `?sslmode=require`. This is `DATABASE_URL`. Never use the transaction pooler (port 6543).

### Vercel

1. Import the GitHub repository as a Hobby project. Framework preset: Next.js. `vercel.json` sets the region, build command and branch rule; do not override them in the dashboard. The import page has an Environment Variables section: fill in step 2 there, before pressing Deploy. If you press Deploy first, the first build fails with «Invalid configuration» naming the missing setting; add the variable and redeploy `main`.
2. Environment Variables, **Production only** (untick Preview and Development; Settings → Environment Variables once the project exists):

| Name             | Value                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`      | `hosted`                                                                                                       |
| `ACCESS_CODE`  | a random string of 16 or more characters, for example `openssl rand -base64 24`; keep it in a password manager |
| `DATABASE_URL` | the session pooler URI from Supabase                                                                             |

3. Do **not** set `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` or any `FEATURE_*`. Without them the Hosted version runs in Test mode and the AI sections are unavailable.
4. Settings → Git: check that only `main` deploys to Production.
5. Merge the pull request, or redeploy `main`. The build runs `npm run db:migrate`, then `next build`.
6. If the build fails: the log names the setting («Invalid configuration: …») and never prints its value. A wrong `DATABASE_URL` fails the build at `db:migrate`. Fix the variable and redeploy.

### GitHub

1. Repository Settings → Secrets and variables → Actions → Variables: add `HOSTED_URL` = the Vercel production URL, without a trailing slash.
2. Actions → keep-alive → Run workflow once. It must pass.
3. Add the URL to the «Hosted version» section of `README.md` and commit.

## 3. FR-30 manual row (skeleton)

FR-30 is verified by hand. This row covers the skeleton; the live-AI walk-through on a laptop and a phone is recorded in Story 3.12. All rows were checked on 2026-11-15: the curl rows by Claude, the rest (Access code, deployments, variables, dashboards) by Helene.

| Check                   | Procedure                                                                                              | Result                                                                                                                                                                                                                                            | Date       |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Opened without the code | `curl -I https://<host>/soknad`                                                                      | pass: 307 to `/tilgang`; an API route answers 401 `ACCESS_REQUIRED`                                                                                                                                                                           | 2026-11-15 |
| Wrong code              | `POST /api/access` with a wrong 16-character code                                                    | pass: 400 `INVALID_INPUT`, field `code` (the text «Feil tilgangskode.» is covered by the e2e test)                                                                                                                                          | 2026-11-15 |
| Right code              | Enter the Access code on `/tilgang`                                                                  | pass: shows Hjem; `/soknad` opens                                                                                                                                                                                                               | 2026-11-15 |
| Health                  | `curl https://<host>/api/health`                                                                     | pass: 200, `{"ok":true,"data":{"hosted":true}}`                                                                                                                                                                                                 | 2026-11-15 |
| HTTPS only              | `curl -I http://<host>/`                                                                             | pass: 308 Permanent Redirect to `https://`                                                                                                                                                                                                      | 2026-11-15 |
| Only `main` deploys   | Push a branch; then merge to `main`                                                                  | pass: the branch gets no deployment, `main` gets a Production deployment (Vercel → Deployments)                                                                                                                                                | 2026-11-15 |
| EU region               | Response header `x-vercel-id`; Vercel project → Settings → Functions; Supabase project → Settings | pass: the function ran in `fra1` (Frankfurt) and the Supabase project is in `eu-west-1` (Ireland); both are in the EU. Deviation: the architecture spine names Frankfurt for Supabase, see the note below. Vercel dashboard checked by Helene | 2026-11-15 |
| No AI                   | Vercel Production variables                                                                            | pass: no `AI_*` variable                                                                                                                                                                                                                        | 2026-11-15 |
| Keep-alive              | Actions → keep-alive → Run workflow                                                                  | pass: manual run succeeded in 9 s                                                                                                                                                                                                                 | 2026-11-15 |

`regions` in `vercel.json` sets where the functions run. The Access-code gate and every API route run there. Static files come from Vercel's CDN and hold no Student data.

**Deviation (2026-11-15, Helene):** the Supabase project runs in `eu-west-1` (Ireland), not `eu-central-1` (Frankfurt) as the architecture spine (AD-9) and the set-up steps name. FR-30 only requires an EU region, so it is kept: the functions are in Frankfurt, the database is in Ireland, and a query adds a few milliseconds. Supabase cannot move a project between regions; a move means a new project and a new `DATABASE_URL`. The session pooler host therefore contains `eu-west-1`.

## 4. Things to remember

- GitHub disables scheduled workflows after 60 days without repository activity. Check that `keep-alive` is still enabled when grading starts.
- Supabase Free pauses a project after 7 days without activity; the keep-alive prevents that. A paused project is resumed in the dashboard.
- Cut 0 (PRD §5.1): applied on 2026-11-19. `main` is `false` in `git.deploymentEnabled` in `vercel.json`, so the Hosted version stays at its last deploy. To deploy again, set it back to `true` (and the test in `scripts/hosted-config.test.ts`).
- After grading: delete the Vercel and Supabase projects (FR-23).
- The Access code is handed in with the submission and never committed (NFR-7). To change it, edit `ACCESS_CODE` in Vercel and redeploy `main`: a changed variable applies only to a new build. Everyone then needs the new code.
- `/api/health` is open without the code on purpose (the keep-alive calls it). It answers only `ok` and `hosted`.
- Cut 0 stops deploys but not the keep-alive. Leave the keep-alive on, so the frozen Hosted version keeps a database that is not paused.
