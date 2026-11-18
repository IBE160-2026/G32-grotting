# G32 — HeleneG

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Helene Grøtting

## Run JobAssistant

**Prerequisite:** Docker with Compose 2.24 or newer, nothing else. Tested with Docker Desktop 4.87.0 (Engine 29.7.2) on Windows 11. No account and no key are needed: without an AI key the app runs in Test mode on recorded answers.

| Command | What it shows |
|---|---|
| `docker compose up --build` | Starts the database and the app (the first build is slow: it downloads Node and Chromium). It keeps running in that terminal; in a second terminal, open <http://localhost:3000> once `docker compose ps` shows `healthy` for `app` and `db`. Add `-d` to run it in the background. |
| `docker compose run --rm --build test` | Runs every automated test (lint, types, unit tests, browser tests) in a container. It needs no database. |
| `docker compose down -v` | Stops everything and deletes the local data (database and the app's data folder), so the next start is clean. |

Only `127.0.0.1:3000` (app) and `127.0.0.1:54320` (database) are published on your machine. If another program already uses one of them, stop it first. The database login `jobassistant` / `jobassistant` is a throwaway for local use only.

### Developer loop (optional)

Needs Node 26. Run `docker compose up db`, then `npm install` and `npm run dev`. `npm run dev` runs setup first (migrations) against `127.0.0.1:54320`. `npm test` on the host also needs Chromium once: `npx playwright install chromium`.

### Hosted version

A copy of the app runs on Vercel (Frankfurt) with a Supabase database, closed with an Access code, at <https://g32-grotting.vercel.app/>. It is a skeleton only: the Access code gate and the app shell, with no AI. Vercel's data processing agreement names the Enterprise and Pro plans, not Hobby, so the delivery is the run above, not this copy (PRD §5.1, D23). The Access code comes with the submission and is never committed. Set-up, the data processing agreement record and the manual checks are in [`docs/qa/hosted-deployment.md`](docs/qa/hosted-deployment.md).

### Live AI (optional)

Copy `.env.example` to `.env` and set `AI_PROVIDER`, `AI_MODEL` and `AI_API_KEY`. The only valid `AI_PROVIDER` is `openrouter`, `AI_API_KEY` must be an OpenRouter key and `AI_MODEL` an OpenRouter model id such as `anthropic/claude-sonnet-5.5`; any other provider fails after a Daily-cap slot is used. Never commit `.env`.
