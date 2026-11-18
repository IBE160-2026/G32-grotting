# Bake-off runbook: pick the AI provider

Story 3.3 and 3.3b (PRD Open question 3, §8.1, §8.2, NFR-8). Everything the Bake-off needs is built. Steps 1 to 8 are Helene's, in order, because they need her keys, her judgement and her money. No paid request has been made yet.

Each step is small; stop after any one and carry on in the next session.

1. **Make the keys and set a monthly spending limit.** One key per contender, on a paid API account, and a monthly limit of about 200 NOK (NFR-8) set in each dashboard at the moment the key is made. Keep the keys in a password manager, never in the repository. OpenRouter is an optional third contender: make one key with a credit limit, and in its privacy settings choose **ZDR only** and leave prompt logging and «use of inputs/outputs» off. OpenRouter is a router, so the model vendor behind it is a second processor (see the terms file).
2. **Check the terms.** Fill in the «not verified» rows in `docs/qa/ai-provider-terms.md` (DPF list, how to accept each DPA). A contender that fails PRD §8.1 is out.
3. **Look up current prices** (USD per million input and output tokens) on each provider's pricing page. The script has none built in.
4. **Set the environment** in the shell you run from (not in `.env`, not committed):

   | Name | Value |
   | --- | --- |
   | `BAKE_OFF_ANTHROPIC_KEY` | the Anthropic key |
   | `BAKE_OFF_OPENAI_KEY` | the OpenAI key |
   | `BAKE_OFF_ANTHROPIC_MODEL` | optional; default `claude-sonnet-5-5` |
   | `BAKE_OFF_OPENAI_MODEL` | required; no default |
   | `BAKE_OFF_OPENROUTER_KEY` | optional; OpenRouter joins the run only when this is set |
   | `BAKE_OFF_OPENROUTER_MODEL` | required when the OpenRouter key is set; no default; an OpenRouter model id such as `<vendor>/<model>` |

5. **Run the script.** Try `--dry` first (no key, no network, writes to the OS temp folder). Then the live run, with the prices from step 3:

   ```
   npx tsx --conditions=react-server scripts/bake-off.ts --price-in anthropic=<usd> --price-out anthropic=<usd> --price-in openai=<usd> --price-out openai=<usd>
   ```

   With OpenRouter, add `--price-in openrouter=<usd> --price-out openrouter=<usd>`. An OpenRouter model or price without `BAKE_OFF_OPENROUTER_KEY` stops the run, so a misspelled key name cannot silently drop the contender. The adapter sets `zdr` and `data_collection: deny` on every OpenRouter request, so an OpenRouter model that has no zero-retention endpoint fails every request with `HTTP_404`: choose another model before suspecting the key.

   It makes one Letter request and one Gap request per Fixture and contender (16 requests with two contenders, 24 with OpenRouter; no retries), with email and phone numbers stripped from the CV. Output goes to `docs/qa/bake-off/<date>/`: a folder per provider with the raw Letter text and Gap JSON, and `results.md`. A failed request is recorded by its error code and the run goes on. Add `--out <folder>` to write somewhere else. The script refuses to run into a folder that already has a `results.md`, so a re-run needs a new `--out` folder or the old folder moved first.
6. **Score by hand.** Open `results.md` and fill in pass or fail for L1 to L8 on every Letter and G1 to G3 and R1 on every Gap output (PRD §9.2; the Answer key in `data/fixtures/<id>/answer-key.json` helps with G2). Read the token counts and the estimated cost per Application next to the scores. The prompts are rough and thrown away after this; do not tune them to one contender.
7. **Decide and record it.** Write the winner, the model and the reasons (scores, cost, terms) in `docs/architecture.md` (Deferred row for the AI provider and model) and in the PRD (close Open question 3). If the winner is not on the DPF list, amend PRD §8.1 to accept Standard Contractual Clauses. Commit the scored `results.md` and outputs.
8. **Switch it on locally and tidy up.**
   - Set `AI_PROVIDER` (`anthropic`, `openai` or `openrouter`), `AI_MODEL`, `AI_API_KEY` and `AI_RETENTION_DAYS` (the retention period from the terms file, for example `30`) in the git-ignored `.env`. The AI notice then names the winner and its retention period (`config.aiNotice`). With any of the first three missing the app stays in Test mode.
   - Remove the losing packages from `package.json` and the lockfile (`npm uninstall` of `@ai-sdk/anthropic`, `@ai-sdk/openai` or `@openrouter/ai-sdk-provider`, whichever lost), and delete their branches in `src/modules/ai/server/adapters/live.ts` (the `createAnthropic`, `createOpenAI` or `createOpenRouter` import, the `case` in `defaultModelFactory` and the `LIVE_PROVIDERS` entry). If OpenRouter lost, `OPENROUTER_PRIVACY` and `openRouterModel` go too.
   - Do not set `AI_PROVIDER=openrouter` for real use until the AI notice names both OpenRouter and the model vendor (Story 3.6 decision).

Open points for `issues.md`: steps 1 to 8 above; Story 3.4 writes the real Letter prompt under a `PROMPT_VERSION`, and the Gap prompt comes with the Gap story.
