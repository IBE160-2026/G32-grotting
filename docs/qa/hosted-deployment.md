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
- Or accept the finding: the README run is the delivery, the Hosted version stays a skeleton, and PRD §11 is updated (not part of Story 1.7).

Record the decision here: ______ on ______

## 2. Set-up (once)

Do these in order. The first Production build starts when the story's pull request is merged to `main`, so finish steps 1 and 2 before merging.

### Supabase

1. New project on the Free plan, region **Central EU (Frankfurt)** (`eu-central-1`), Postgres 17. Save the database password in a password manager.
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

FR-30 is verified by hand. This row covers the skeleton; the live-AI walk-through on a laptop and a phone is recorded in Story 3.12. Rows marked «open» need the Access code or a dashboard, and are for Helene to fill in.

| Check | Procedure | Result | Date |
|---|---|---|---|
| Opened without the code | `curl -I https://<host>/soknad` | pass: 307 to `/tilgang`; an API route answers 401 `ACCESS_REQUIRED` | 2026-11-15 |
| Wrong code | `POST /api/access` with a wrong 16-character code | pass: 400 `INVALID_INPUT`, field `code` (the text «Feil tilgangskode.» is covered by the e2e test) | 2026-11-15 |
| Right code | Enter the Access code on `/tilgang` | open: shows Hjem; `/soknad` opens | |
| Health | `curl https://<host>/api/health` | pass: 200, `{"ok":true,"data":{"hosted":true}}` | 2026-11-15 |
| HTTPS only | `curl -I http://<host>/` | pass: 308 Permanent Redirect to `https://` | 2026-11-15 |
| Only `main` deploys | Push a branch; then merge to `main` | open: the branch gets no deployment, `main` gets a Production deployment (Vercel → Deployments) | |
| EU region | Response header `x-vercel-id`; Vercel project → Settings → Functions; Supabase project → Settings | partly: the header shows the function ran in `fra1`; the dashboards are open | 2026-11-15 |
| No AI | Vercel Production variables | open: no `AI_*` variable | |
| Keep-alive | Actions → keep-alive → Run workflow | pass: manual run succeeded in 9 s | 2026-11-15 |

`regions` in `vercel.json` sets where the functions run. The Access-code gate and every API route run there. Static files come from Vercel's CDN and hold no Student data.

## 4. Things to remember

- GitHub disables scheduled workflows after 60 days without repository activity. Check that `keep-alive` is still enabled when grading starts.
- Supabase Free pauses a project after 7 days without activity; the keep-alive prevents that. A paused project is resumed in the dashboard.
- Cut 0 (PRD §5.1): set `main` to `false` in `git.deploymentEnabled` in `vercel.json`. The Hosted version then stays at its last deploy.
- After grading: delete the Vercel and Supabase projects (FR-23).
- The Access code is handed in with the submission and never committed (NFR-7). To change it, edit `ACCESS_CODE` in Vercel and redeploy `main`: a changed variable applies only to a new build. Everyone then needs the new code.
- `/api/health` is open without the code on purpose (the keep-alive calls it). It answers only `ok` and `hosted`.
- Cut 0 stops deploys but not the keep-alive. Leave the keep-alive on, so the frozen Hosted version keeps a database that is not paused.
