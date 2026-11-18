# AI provider terms: the Bake-off contenders

Story 3.3 (PRD §8.1, Open question 3). Checked on **2026-11-18** from the providers' own public pages, by Claude while building the story. **Helene has not confirmed any row yet.** A fact that was not read on a primary source says «not verified»; look at those yourself before the decision (step 2 in `docs/qa/bake-off-runbook.md`).

PRD §8.1 asks for: a paid or commercial API tier only, a written promise of no training on inputs, a documented retention period (named in the AI notice), a data processing agreement, and processing in the EEA or a provider on the EU–US Data Privacy Framework (DPF) list.

## Anthropic (`@ai-sdk/anthropic`)

| Requirement | What the source says | Source | Checked |
| --- | --- | --- | --- |
| Paid tier | Commercial API under the Anthropic Commercial Terms. The exact tier name and the spending-limit setting: not verified. | not verified | 2026-11-18 |
| No training on inputs | «By default, we will not use your inputs or outputs from our commercial products.» Training can happen if the customer opts in or submits feedback. | <https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training> (dated 2026-08-18) | 2026-11-18 |
| Retention period | «we automatically delete inputs and outputs on our backend within 30 days of receipt or generation.» Exceptions: a different agreement (for example zero data retention), Usage Policy enforcement (flagged content up to 2 years, classification scores up to 7 years) and legal requirements. | <https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data> (dated 2026-07-01) | 2026-11-18 |
| DPA available | Yes. The Data Processing Addendum (effective 2025-02-24, audience «Business») is incorporated into the Commercial Terms of Service, so it needs no separate signature. Whether the page names API customers by word: not verified. | <https://www.anthropic.com/legal/data-processing-addendum> | 2026-11-18 |
| Transfer basis | Standard Contractual Clauses (modules two and three), with UK and Swiss addenda. The DPA does not mention the DPF. | same DPA page | 2026-11-18 |
| On the DPF list | **Not verified.** The official list (<https://www.dataprivacyframework.gov/list>) could not be searched from here. A third-party site says Anthropic is listed as active; that is not a primary source. | <https://www.dataprivacyframework.gov/list> | 2026-11-18 |

## OpenAI (`@ai-sdk/openai`)

| Requirement | What the source says | Source | Checked |
| --- | --- | --- | --- |
| Paid tier | Pay-as-you-go API platform. The exact tier name and the monthly limit setting: not verified. | not verified | 2026-11-18 |
| No training on inputs | «As of March 1, 2023, data sent to the OpenAI API is not used to train or improve OpenAI models» unless the customer opts in. | <https://developers.openai.com/api/docs/guides/your-data> | 2026-11-18 |
| Retention period | Abuse-monitoring logs are «retained for up to 30 days», unless the law requires longer or it is needed to protect the service. Zero data retention exists for eligible customers «subject to prior approval by OpenAI». Application state stored by some endpoints (for example files and conversations) is separate. | same page (no date shown) | 2026-11-18 |
| DPA available | A DPA exists (page dated «Effective: January 1, 2026» in a search snippet). The page itself returned 403 to the tool, so how it is accepted (account settings or by request) is **not verified**. | <https://openai.com/policies/data-processing-addendum/> | 2026-11-18 |
| Transfer basis | Not verified. Secondary sources say Standard Contractual Clauses; no primary text was read. | <https://openai.com/policies/data-processing-addendum/> | 2026-11-18 |
| On the DPF list | **Not verified.** No statement from OpenAI was found, and the official list could not be searched from here. | <https://www.dataprivacyframework.gov/list> | 2026-11-18 |
| EU data residency | The your-data guide points to a separate data residency guide; its terms (eligibility, models, endpoints) were not read: not verified. | <https://developers.openai.com/api/docs/guides/your-data> | 2026-11-18 |

## OpenRouter (`@openrouter/ai-sdk-provider`)

Added in Story 3.3b. Checked on **2026-11-18** from OpenRouter's public docs by Claude. **Helene has not confirmed any row.** OpenRouter is a **router**: one key and one API in front of many model vendors. The Student's text therefore reaches **two companies**: OpenRouter, and the vendor whose model answers (a second processor, with its own terms, retention and country). Every row below that is about the model vendor depends on which model and which endpoint OpenRouter picks, so it cannot be answered once for «OpenRouter».

What the adapter asks for on every request (the `provider` object of the request body, see `OPENROUTER_PRIVACY` in `src/modules/ai/server/adapters/live.ts`): `data_collection: "deny"` (only providers that do not collect user data) and `zdr: true` (only Zero Data Retention endpoints). Both field names are in the package's types and in OpenRouter's provider routing docs.

| Requirement | What the source says | Source | Checked |
| --- | --- | --- | --- |
| Paid tier | Pay-per-use credits on an OpenRouter account. Credit limit per key: set when the key is made (runbook step 1); the exact setting name was not read: not verified. | not verified | 2026-11-18 |
| Prompt logging | «OpenRouter does not store your prompts or responses» unless you turn on Private Input & Output Logging (your own logs) or allow OpenRouter to use your data. Off by default. Content flagged as potential CSAM may be retained. Request metadata (token counts, latency) is stored for every request and holds no prompt or response content. | <https://openrouter.ai/docs/guides/privacy/data-collection> | 2026-11-18 |
| No training on inputs | Not used to train models unless you opt in. «OpenRouter Use of Inputs/Outputs» is off by default (turning it on gives a 1 % discount; keep it off). The per-request `data_collection` default is `allow`, which permits providers that may store and train on data, so the request sets `deny`. | <https://openrouter.ai/docs/guides/privacy/data-collection>, <https://openrouter.ai/docs/guides/routing/provider-selection> | 2026-11-18 |
| ZDR | `zdr: true` limits routing to Zero Data Retention endpoints. «Safety Retention» endpoints (which keep prompts only to prevent abuse) stay eligible unless the account privacy settings are **ZDR only**. Set **ZDR only** in the OpenRouter privacy settings when the key is made (runbook step 1). | <https://openrouter.ai/docs/guides/routing/provider-selection> | 2026-11-18 |
| Retention period | Depends on the endpoint. With ZDR only: none for content, by the docs; not verified for the model vendor. | not verified | 2026-11-18 |
| DPA available | Not verified. | not verified | 2026-11-18 |
| Transfer basis | Not verified. | not verified | 2026-11-18 |
| On the DPF list | **Not verified** for OpenRouter and for the model vendor. | <https://www.dataprivacyframework.gov/list> | 2026-11-18 |
| Sub-processors | Not verified. The list of model vendors that OpenRouter may route to, and where they process, was not read. | not verified | 2026-11-18 |

**AI notice (Story 3.6):** if OpenRouter wins, the notice must name **both** OpenRouter and the model vendor, and the retention period must cover both. The notice text and the PRD §8.1 data rules need a decision then (see `deferred-work.md`); this file records no decision.

## What is left for Helene

- Search «Anthropic», «OpenAI» and «OpenRouter» (and the vendor of the chosen OpenRouter model) on the DPF list and write the result and the date here. If the winner is not on the list, amend PRD §8.1 to accept Standard Contractual Clauses (runbook step 7).
- Read the OpenAI DPA in a browser and note how to accept it (account settings or by request).
- Confirm in each dashboard that a monthly spending limit exists (runbook step 1). On OpenRouter also set **ZDR only** in the privacy settings and leave prompt logging and «use of inputs/outputs» off.
- OpenRouter: read the DPA, retention and sub-processor terms on a primary source and write the URL and date in the rows above.
- Write her name and the date in each table above when a row is confirmed.
