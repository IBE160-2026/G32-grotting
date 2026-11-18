# Bake-off runbook: pick the AI provider

Story 3.3, 3.3b and 3.3c (PRD Open question 3, §8.1, §8.2, NFR-8). Everything the Bake-off needs is built. Steps 1 to 8 are Helene's, in order, because they need her keys, her judgement and her money. No paid request has been made yet.

Each step is small; stop after any one and carry on in the next session.

1. **Make the keys and set a monthly spending limit.** Every contender is optional: make a key only for the ones you want to compare. A direct contender (Anthropic, OpenAI) needs its own key on a paid API account. **One OpenRouter key reaches many models**, so to compare, say, Claude Sonnet 5.5 and an OpenAI model you need only that one key (no Anthropic or OpenAI key). Set a monthly limit of about 200 NOK (NFR-8) in each dashboard at the moment the key is made; on OpenRouter this is a credit limit on the key. Keep the keys in a password manager, never in the repository. In OpenRouter's privacy settings choose **ZDR only** and leave prompt logging and «use of inputs/outputs» off. OpenRouter is a router, so the model vendor behind it is a second processor (see the terms file).
2. **Check the terms.** Fill in the «not verified» rows in `docs/qa/ai-provider-terms.md` (DPF list, how to accept each DPA). A contender that fails PRD §8.1 is out.
3. **Look up current prices** (USD per million input and output tokens) on each provider's pricing page. The script has none built in. For OpenRouter models, read them from OpenRouter's model list (`https://openrouter.ai/api/v1/models`, or a model's page on openrouter.ai): the list gives **USD per token** under `pricing.prompt` and `pricing.completion`, so multiply by 1,000,000 for the flags. Each OpenRouter model has its own price.
4. **Set the environment** in the shell you run from (not in `.env`, not committed):

   | Name | Value |
   | --- | --- |
   | `BAKE_OFF_ANTHROPIC_KEY` | optional; the `anthropic` contender joins the run only when this is set |
   | `BAKE_OFF_ANTHROPIC_MODEL` | optional; default `claude-sonnet-5-5` |
   | `BAKE_OFF_OPENAI_KEY` | optional; the `openai` contender joins only when this is set |
   | `BAKE_OFF_OPENAI_MODEL` | required when the OpenAI key is set; no default |
   | `BAKE_OFF_OPENROUTER_KEY` | optional; the OpenRouter contenders join only when this is set; one key serves all the models |
   | `BAKE_OFF_OPENROUTER_MODELS` | required when the OpenRouter key is set; no default; comma-separated OpenRouter model ids such as `<vendor>/<model>,<vendor>/<model>`; each model is its own contender; the same model twice is refused |

   Each contender has an id: `anthropic`, `openai` or `openrouter:<model>` (for example `openrouter:anthropic/claude-sonnet-5.5`). The id is its label in `results.md`, its price flag name, and its output folder with `/` and `:` replaced by `-` (`openrouter-anthropic-claude-sonnet-5.5`). A run with no key at all stops and names the settings; a key without its model, or a model (Anthropic, OpenAI or OpenRouter) without its key, stops and names the missing setting, so a paid run is never a smaller comparison than you meant.

5. **Run the script.** Try `--dry` first (no key, no network, writes to the OS temp folder; it plans `anthropic`, `openai` and one OpenRouter contender on the mock adapter, or one per model in `BAKE_OFF_OPENROUTER_MODELS`). Then the live run, with the prices from step 3. A price flag is `--price-in <id>=<usd>` and `--price-out <id>=<usd>` (split on the last `=`), once per planned contender:

   ```
   npx tsx --conditions=react-server scripts/bake-off.ts --price-in anthropic=<usd> --price-out anthropic=<usd> --price-in openai=<usd> --price-out openai=<usd>
   ```

   **Example: Claude Sonnet 5.5 and one OpenAI model through one OpenRouter key.** Choose the OpenAI model id on openrouter.ai/models (current ids are listed there; none is chosen here) and write it in place of `<openai-model>`, for example `openai/<name>`:

   Bash:

   ```
   export BAKE_OFF_OPENROUTER_KEY="<your OpenRouter key>"
   export BAKE_OFF_OPENROUTER_MODELS="anthropic/claude-sonnet-5.5,openai/<openai-model>"

   npx tsx --conditions=react-server scripts/bake-off.ts --price-in openrouter:anthropic/claude-sonnet-5.5=<usd> --price-out openrouter:anthropic/claude-sonnet-5.5=<usd> --price-in openrouter:openai/<openai-model>=<usd> --price-out openrouter:openai/<openai-model>=<usd>
   ```

   PowerShell (the same, on one line, no line continuation):

   ```
   $env:BAKE_OFF_OPENROUTER_KEY = "<your OpenRouter key>"
   $env:BAKE_OFF_OPENROUTER_MODELS = "anthropic/claude-sonnet-5.5,openai/<openai-model>"

   npx tsx --conditions=react-server scripts/bake-off.ts --price-in openrouter:anthropic/claude-sonnet-5.5=<usd> --price-out openrouter:anthropic/claude-sonnet-5.5=<usd> --price-in openrouter:openai/<openai-model>=<usd> --price-out openrouter:openai/<openai-model>=<usd>
   ```

   **Confirm the model ids before the paid run** at openrouter.ai/models. `anthropic/claude-sonnet-5.5` was found in OpenRouter's raw model list (`https://openrouter.ai/api/v1/models`, parsed as JSON) on 2026-11-18; ids can change, so copy an id exactly as the model's page shows it.

   The prices are the per-million figures from step 3, read from OpenRouter's model list for each of the two models. The outputs go to `openrouter-anthropic-claude-sonnet-5.5/` and `openrouter-openai-<openai-model>/` (with its own `/` replaced). A price for a contender that is not planned (a typo in the id, or a model not in the list, or a key not set) stops the run. The adapter sets `zdr` and `data_collection: deny` on every OpenRouter request, so an OpenRouter model that has no zero-retention endpoint fails every request with `HTTP_404`: choose another model before suspecting the key. `HTTP_404` can also mean a **wrong model id** (a typo or a missing suffix), so check the id at openrouter.ai/models first.

   It makes **two requests (one Letter, one Gap) per Fixture and per planned contender**, no retries: with `F` Fixtures and `C` contenders that is `2 x F x C` requests (the Example above with 4 Fixtures: 2 x 4 x 2 = 16; adding an Anthropic key and an OpenAI key adds 2 x 4 each). Email and phone numbers are stripped from the CV. Output goes to `docs/qa/bake-off/<date>/`: a folder per contender with the raw Letter text and Gap JSON, and `results.md`. A failed request is recorded by its error code and the run goes on. Add `--out <folder>` to write somewhere else. The script refuses to run into a folder that already has a `results.md`, so a re-run needs a new `--out` folder or the old folder moved first.
6. **Score by hand.** Open `results.md` and fill in pass or fail for L1 to L8 on every Letter and G1 to G3 and R1 on every Gap output (PRD §9.2; the Answer key in `data/fixtures/<id>/answer-key.json` helps with G2). Read the token counts and the estimated cost per Application next to the scores. The prompts are rough and thrown away after this; do not tune them to one contender.
7. **Decide and record it.** Write the winner, the model and the reasons (scores, cost, terms) in `docs/architecture.md` (Deferred row for the AI provider and model) and in the PRD (close Open question 3). Record whether the winner was used **directly or through OpenRouter**, because that decides which companies handle the Student's text (the vendor alone, or OpenRouter and the model vendor). If the winner is not on the DPF list, amend PRD §8.1 to accept Standard Contractual Clauses. Commit the scored `results.md` and outputs.
8. **Switch it on locally and tidy up.**
   - Set `AI_PROVIDER` (`anthropic`, `openai` or `openrouter`), `AI_MODEL`, `AI_API_KEY` and `AI_RETENTION_DAYS` (the retention period from the terms file, for example `30`) in the git-ignored `.env`. The AI notice then names the winner and its retention period (`config.aiNotice`). With any of the first three missing the app stays in Test mode.
   - Remove the losing packages from `package.json` and the lockfile (`npm uninstall` of `@ai-sdk/anthropic`, `@ai-sdk/openai` or `@openrouter/ai-sdk-provider`, whichever lost), and delete their branches in `src/modules/ai/server/adapters/live.ts` (the `createAnthropic`, `createOpenAI` or `createOpenRouter` import, the `case` in `defaultModelFactory` and the `LIVE_PROVIDERS` entry). If OpenRouter lost, `OPENROUTER_PRIVACY` and `openRouterModel` go too.
   - Do not set `AI_PROVIDER=openrouter` for real use until the AI notice names both OpenRouter and the model vendor (Story 3.6 decision).

Open points for `issues.md`: steps 1 to 8 above; Story 3.4 writes the real Letter prompt under a `PROMPT_VERSION`, and the Gap prompt comes with the Gap story.
