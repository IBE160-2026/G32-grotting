# Bake-off runbook: pick the AI provider

Story 3.3, 3.3b, 3.3c and 3.3d (PRD Open question 3, §8.1, §8.2, NFR-8). **Steps 3 to 7 were done on 2026-11-18; step 1 is done except one check, and step 2 (check the terms) is open.** Helene chose Claude Sonnet 5.5 (`anthropic/claude-sonnet-5.5`) used through OpenRouter, not directly. The decision, its reasons and its open data-handling condition are in `docs/architecture.md` section 4 and PRD Open question 3; the outputs and scoring tables are in `docs/qa/bake-off/2026-11-18/`. Story 3.3d removed the direct Anthropic and OpenAI packages: OpenRouter is the only live provider, and `scripts/bake-off.ts` compares OpenRouter models only. Step 8 is what Helene still sets by hand.

Each step is small; stop after any one and carry on in the next session.

1. **Make the key and set a monthly spending limit.** *Done 2026-11-18:* the OpenRouter key was made (the bake-off ran with it), and Helene confirmed in the dashboard that the monthly limit is set and **ZDR only** is on. Still to check: prompt logging and «use of inputs/outputs» are off. One OpenRouter key reaches many models, so a comparison needs only that one key. Set a monthly limit of about 200 NOK (NFR-8) at the moment the key is made; on OpenRouter this is a credit limit on the key. Keep the key in a password manager, never in the repository. In OpenRouter's privacy settings choose **ZDR only** and leave prompt logging and «use of inputs/outputs» off. OpenRouter is a router, so the model vendor behind it is a second processor (see the terms file).
2. **Check the terms.** *Open, not done* (see `docs/qa/ai-provider-terms.md`). The «not verified» rows in `docs/qa/ai-provider-terms.md` (DPF list, DPA, retention, sub-processors) are open, and they are a condition for Story 3.12 and for the AI notice (Story 3.6), see `deferred-work.md`.
3. **Look up current prices.** *Done 2026-11-18* (2 USD in and 10 USD out per million tokens for `anthropic/claude-sonnet-5.5`). The script has no prices built in. Read them from OpenRouter's model list (`https://openrouter.ai/api/v1/models`, or a model's page on openrouter.ai): the list gives **USD per token** under `pricing.prompt` and `pricing.completion`, so multiply by 1,000,000 for the flags. Each model has its own price.
4. **Set the environment.** *Done 2026-11-18.* In the shell you run from (not in `.env`, not committed):

   | Name                         | Value                                                                                                                                                                                                  |
   | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | `BAKE_OFF_OPENROUTER_KEY`    | required for a live run; one key serves all the models                                                                                                                                                 |
   | `BAKE_OFF_OPENROUTER_MODELS` | required when the key is set; no default; comma-separated OpenRouter model ids such as `<vendor>/<model>,<vendor>/<model>`; each model is its own contender; the same model twice is refused |

   Each contender has an id `openrouter:<model>` (for example `openrouter:anthropic/claude-sonnet-5.5`). The id is its label in `results.md`, its price flag name, and its output folder with `/` and `:` replaced by `-` (`openrouter-anthropic-claude-sonnet-5.5`). A run with no key stops and names the settings; a key without models, or models without a key, stops and names the missing setting. The old `BAKE_OFF_ANTHROPIC_*` and `BAKE_OFF_OPENAI_*` settings are ignored.
5. **Run the script.** *Done 2026-11-18.* Try `--dry` first (no key, no network, writes to the OS temp folder; it plans one mock OpenRouter contender, or one per model in `BAKE_OFF_OPENROUTER_MODELS`). Then the live run, with the prices from step 3. A price flag is `--price-in <id>=<usd>` and `--price-out <id>=<usd>` (split on the last `=`), once per planned contender. Example, Claude Sonnet 5.5 and one OpenAI model through one key (this is the run that was made, with `openai/gpt-5.6-terra`):

   Bash:

   ```
   export BAKE_OFF_OPENROUTER_KEY="<your OpenRouter key>"
   export BAKE_OFF_OPENROUTER_MODELS="anthropic/claude-sonnet-5.5,openai/gpt-5.6-terra"

   npx tsx --conditions=react-server scripts/bake-off.ts --price-in openrouter:anthropic/claude-sonnet-5.5=<usd> --price-out openrouter:anthropic/claude-sonnet-5.5=<usd> --price-in openrouter:openai/gpt-5.6-terra=<usd> --price-out openrouter:openai/gpt-5.6-terra=<usd>
   ```

   PowerShell (the same, on one line, no line continuation):

   ```
   $env:BAKE_OFF_OPENROUTER_KEY = "<your OpenRouter key>"
   $env:BAKE_OFF_OPENROUTER_MODELS = "anthropic/claude-sonnet-5.5,openai/gpt-5.6-terra"

   npx tsx --conditions=react-server scripts/bake-off.ts --price-in openrouter:anthropic/claude-sonnet-5.5=<usd> --price-out openrouter:anthropic/claude-sonnet-5.5=<usd> --price-in openrouter:openai/gpt-5.6-terra=<usd> --price-out openrouter:openai/gpt-5.6-terra=<usd>
   ```

   **Confirm the model ids before a paid run** at openrouter.ai/models; ids can change, so copy an id exactly as the model's page shows it. A price for a contender that is not planned (a typo in the id, a model not in the list, or a key not set) stops the run. The adapter sets `zdr` and `data_collection: deny` on every request, so a model that has no zero-retention endpoint fails every request with `HTTP_404`: choose another model before suspecting the key. `HTTP_404` can also mean a wrong model id.

   It makes **two requests (one Letter, one Gap) per Fixture and per planned contender**, no retries: with `F` Fixtures and `C` contenders that is `2 x F x C` requests (the run above, with 4 Fixtures and 2 contenders: 16). Email and phone numbers are stripped from the CV. Output goes to `docs/qa/bake-off/<date>/`: a folder per contender with the raw Letter text and Gap JSON, and `results.md`. A failed request is recorded by its error code and the run goes on. Add `--out <folder>` to write somewhere else. The script refuses to run into a folder that already has a `results.md`, so a re-run needs a new `--out` folder or the old folder moved first.
6. **Score by hand.** *Done 2026-11-18 as a draft by Claude; every cell confirmed by Helene 2026-11-19.* `results.md` holds pass or fail for L1 to L8 on every Letter and G1 to G3 and R1 on every Gap output (PRD §9.2); Claude drafted every cell, and Helene confirmed each one. The prompts were rough and are thrown away; do not tune them to one model.
7. **Decide and record it.** *Done 2026-11-18.* Claude Sonnet 5.5 through OpenRouter (not directly); runner-up `openai/gpt-5.6-terra`. Recorded in `docs/architecture.md` section 4, PRD Open question 3 (resolved; the data-handling condition is an open item there), and the «Decision» header of `docs/qa/bake-off/2026-11-18/results.md`. PRD §8.1 was amended the same day to accept Standard Contractual Clauses as the transfer basis (PRD Open question 3, «Transfer basis, 2026-11-18»); it is still not claimed met, because the hosts and their terms are not verified.
8. **Switch it on locally.** Not done; Helene sets these in the git-ignored `.env`:

   - `AI_PROVIDER=openrouter`
   - `AI_MODEL=anthropic/claude-sonnet-5.5`
   - `AI_API_KEY=<your OpenRouter key>`

   With any of these missing the app stays in Test mode. `AI_RETENTION_DAYS` waits for the verified retention period (OpenRouter's zero-retention routing and the retention of the host under it: Google Vertex or Amazon Bedrock, not Anthropic); do not guess a number. Do not use the live AI for real users, and do not deploy it live on the Hosted version (Story 3.12), until the data-handling condition is verified and the AI notice (Story 3.6) names OpenRouter, Google and Amazon.

Open points for `issues.md`: step 8; the data-handling verification (`deferred-work.md`); Story 3.4 writes the real Letter prompt under a `PROMPT_VERSION`, and the Gap prompt comes with the Gap story.
