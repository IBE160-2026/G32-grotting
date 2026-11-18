# Bake-off results 2026-11-18

## Decision

**Decided 2026-11-18 by Helene:** Claude Sonnet 5.5 (`anthropic/claude-sonnet-5.5`) used through OpenRouter, not directly. The runner-up was `openai/gpt-5.6-terra`. Reasons, data handling and the open condition are in `docs/architecture.md` section 4 and PRD Open question 3.

- The evidence is one run per model per Fixture: Sonnet found 12 of 15 expected Rewordable gaps against 11. The margin is small and the variance between runs was not measured.
- In Claude's reading Sonnet wrote more natural Norwegian. That is Claude's own unverified reading: Claude drafted every cell and Sonnet is a Claude model, so it may favour its own family. Helene did not review L1 and R3 (or any other cell) one by one.
- No R1 failure in the draft; one unresolved Check on pull requests, the same as the other model.
- Against Sonnet: one G2 failure (nursing, «erfaring med demens»), about $0.048 against $0.028 per Application (still far inside 200 NOK a month), and slower (about 14 s against 6 s for a Letter).
- The Pass / fail cells below are Claude's draft; Helene chose the model on those results.
- Every request sent `data_collection: deny` and `zdr: true` (settings the app sends; the resulting retention is not verified), and all 16 requests succeeded. The text reaches OpenRouter and the model's host, expected to be Anthropic; the host that served these requests was not recorded. OpenRouter's and the host's data-handling terms are not verified; that is a condition for Story 3.12 and the AI notice (Story 3.6).

**DRAFT by Claude, 2026-11-18: every cell below that starts with «DRAFT» is a proposal to be confirmed or changed by Helene. Mechanical checks (words, copied runs, emoji, title, employer, evidence in the CV) were run by script; the rest is Claude's reading. L1 naturalness, L6, L8 and R3 need a native speaker. Gap recall against the Answer keys (G4) is in the summary below.**

Score each output by hand against PRD §9.2 and fill the Pass / fail cells. The decision is Helene's; follow `docs/qa/bake-off-runbook.md`.

## Contenders

| Provider | Model | Price in (USD per 1M tokens) | Price out (USD per 1M tokens) |
| --- | --- | --- | --- |
| openrouter:anthropic/claude-sonnet-5.5 | anthropic/claude-sonnet-5.5 | 2 | 10 |
| openrouter:openai/gpt-5.6-terra | openai/gpt-5.6-terra | 2 | 12 |

## Cost per Application

One Application is one Letter request and one Gap request for the same Fixture.

| Fixture | Provider | Input tokens | Output tokens | Estimated cost |
| --- | --- | --- | --- | --- |
| example-nordic-digital | openrouter:anthropic/claude-sonnet-5.5 | 4334 | 3014 | $0.0388 |
| example-nordic-digital | openrouter:openai/gpt-5.6-terra | 2359 | 1533 | $0.0231 |
| held-out-regnskap-kvale | openrouter:anthropic/claude-sonnet-5.5 | 4301 | 3632 | $0.0449 |
| held-out-regnskap-kvale | openrouter:openai/gpt-5.6-terra | 2389 | 1620 | $0.0242 |
| nursing-sarvurdering | openrouter:anthropic/claude-sonnet-5.5 | 4586 | 5736 | $0.0665 |
| nursing-sarvurdering | openrouter:openai/gpt-5.6-terra | 2612 | 3432 | $0.0464 |
| two-column-fjord-analytics | openrouter:anthropic/claude-sonnet-5.5 | 4140 | 3105 | $0.0393 |
| two-column-fjord-analytics | openrouter:openai/gpt-5.6-terra | 2269 | 1195 | $0.0189 |

## example-nordic-digital

### openrouter:anthropic/claude-sonnet-5.5: Letter

Output: [openrouter-anthropic-claude-sonnet-5.5/example-nordic-digital.letter.txt](openrouter-anthropic-claude-sonnet-5.5/example-nordic-digital.letter.txt). Model anthropic/claude-sonnet-5.5. Input tokens 2001, output tokens 2159, estimated cost $0.0256, 14537 ms. Words: 293.

| Item | Check | Pass / fail |
| --- | --- | --- |
| L1 | Bokmål throughout; no English sentences | DRAFT Pass (language only; naturalness is for Helene) |
| L2 | Every qualification, tool, employer, date and number exists in the CV text | DRAFT Pass |
| L3 | No run of 8 or more words in a row copied from the ad | DRAFT Pass (longest run from the ad: 5 words) |
| L4 | Job title and employer are correct | DRAFT Pass |
| L5 | 250-400 words (at most 300 for Direkte), 2-3 concrete CV examples | DRAFT Pass (about 293 words) |
| L6 | The chosen Tone's rules hold and it reads as that Tone | DRAFT Pass (formal, no anecdote marker; only Formell was requested) |
| L7 | Every flag the integrity guard would raise is a real problem | DRAFT n/a (the integrity guard is not built; see L2) |
| L8 | No emoji or exclamation marks, no needless English loanwords | DRAFT Pass (no emoji, no exclamation marks) |

### openrouter:anthropic/claude-sonnet-5.5: Gap analysis

Output: [openrouter-anthropic-claude-sonnet-5.5/example-nordic-digital.gap.json](openrouter-anthropic-claude-sonnet-5.5/example-nordic-digital.gap.json). Model anthropic/claude-sonnet-5.5. Input tokens 2333, output tokens 855, estimated cost $0.0132, 6490 ms.

| Item | Check | Pass / fail |
| --- | --- | --- |
| G1 | Each rewordable gap's cited CV entry really shows the Keyword | DRAFT Pass (evidence is verbatim from the CV) |
| G2 | Every must-never-suggest item in the Answer key is a Real gap | DRAFT Pass |
| G3 | Real gaps are worded honestly and do not push to add the Keyword | DRAFT Pass |
| R1 | No suggestion adds a fact or upgrades the work or the role | DRAFT Check: «code review i pull requests» adds that the review happened in pull requests; the CV does not say so |

### openrouter:openai/gpt-5.6-terra: Letter

Output: [openrouter-openai-gpt-5.6-terra/example-nordic-digital.letter.txt](openrouter-openai-gpt-5.6-terra/example-nordic-digital.letter.txt). Model openai/gpt-5.6-terra. Input tokens 1099, output tokens 588, estimated cost $0.0093, 5627 ms. Words: 291.

| Item | Check | Pass / fail |
| --- | --- | --- |
| L1 | Bokmål throughout; no English sentences | DRAFT Pass (language only; naturalness is for Helene) |
| L2 | Every qualification, tool, employer, date and number exists in the CV text | DRAFT Pass |
| L3 | No run of 8 or more words in a row copied from the ad | DRAFT Pass (longest run from the ad: 5 words) |
| L4 | Job title and employer are correct | DRAFT Pass |
| L5 | 250-400 words (at most 300 for Direkte), 2-3 concrete CV examples | DRAFT Pass (about 292 words) |
| L6 | The chosen Tone's rules hold and it reads as that Tone | DRAFT Pass (formal, no anecdote marker; only Formell was requested) |
| L7 | Every flag the integrity guard would raise is a real problem | DRAFT n/a (the integrity guard is not built; see L2) |
| L8 | No emoji or exclamation marks, no needless English loanwords | DRAFT Pass (no emoji, no exclamation marks) |

### openrouter:openai/gpt-5.6-terra: Gap analysis

Output: [openrouter-openai-gpt-5.6-terra/example-nordic-digital.gap.json](openrouter-openai-gpt-5.6-terra/example-nordic-digital.gap.json). Model openai/gpt-5.6-terra. Input tokens 1260, output tokens 945, estimated cost $0.0139, 8511 ms.

| Item | Check | Pass / fail |
| --- | --- | --- |
| G1 | Each rewordable gap's cited CV entry really shows the Keyword | DRAFT Pass (evidence is verbatim from the CV) |
| G2 | Every must-never-suggest item in the Answer key is a Real gap | DRAFT Pass |
| G3 | Real gaps are worded honestly and do not push to add the Keyword | DRAFT Pass |
| R1 | No suggestion adds a fact or upgrades the work or the role | DRAFT Check: «i pull requests» adds that the review happened in pull requests; the CV does not say so |

## held-out-regnskap-kvale

### openrouter:anthropic/claude-sonnet-5.5: Letter

Output: [openrouter-anthropic-claude-sonnet-5.5/held-out-regnskap-kvale.letter.txt](openrouter-anthropic-claude-sonnet-5.5/held-out-regnskap-kvale.letter.txt). Model anthropic/claude-sonnet-5.5. Input tokens 1973, output tokens 1529, estimated cost $0.0192, 11909 ms. Words: 283.

| Item | Check | Pass / fail |
| --- | --- | --- |
| L1 | Bokmål throughout; no English sentences | DRAFT Pass (language only; naturalness is for Helene) |
| L2 | Every qualification, tool, employer, date and number exists in the CV text | DRAFT Check: «avvik oppdages tidlig» and «hvordan det kan unngås» are not in the CV |
| L3 | No run of 8 or more words in a row copied from the ad | DRAFT Pass (longest run from the ad: 2 words) |
| L4 | Job title and employer are correct | DRAFT Pass |
| L5 | 250-400 words (at most 300 for Direkte), 2-3 concrete CV examples | DRAFT Pass (about 283 words) |
| L6 | The chosen Tone's rules hold and it reads as that Tone | DRAFT Pass (formal, no anecdote marker; only Formell was requested) |
| L7 | Every flag the integrity guard would raise is a real problem | DRAFT n/a (the integrity guard is not built; see L2) |
| L8 | No emoji or exclamation marks, no needless English loanwords | DRAFT Pass (no emoji, no exclamation marks) |

### openrouter:anthropic/claude-sonnet-5.5: Gap analysis

Output: [openrouter-anthropic-claude-sonnet-5.5/held-out-regnskap-kvale.gap.json](openrouter-anthropic-claude-sonnet-5.5/held-out-regnskap-kvale.gap.json). Model anthropic/claude-sonnet-5.5. Input tokens 2328, output tokens 2103, estimated cost $0.0257, 13408 ms.

| Item | Check | Pass / fail |
| --- | --- | --- |
| G1 | Each rewordable gap's cited CV entry really shows the Keyword | DRAFT Pass (evidence is verbatim from the CV) |
| G2 | Every must-never-suggest item in the Answer key is a Real gap | DRAFT Pass |
| G3 | Real gaps are worded honestly and do not push to add the Keyword | DRAFT Pass |
| R1 | No suggestion adds a fact or upgrades the work or the role | DRAFT Pass |

### openrouter:openai/gpt-5.6-terra: Letter

Output: [openrouter-openai-gpt-5.6-terra/held-out-regnskap-kvale.letter.txt](openrouter-openai-gpt-5.6-terra/held-out-regnskap-kvale.letter.txt). Model openai/gpt-5.6-terra. Input tokens 1106, output tokens 667, estimated cost $0.0102, 7133 ms. Words: 260.

| Item | Check | Pass / fail |
| --- | --- | --- |
| L1 | Bokmål throughout; no English sentences | DRAFT Pass (language only; naturalness is for Helene) |
| L2 | Every qualification, tool, employer, date and number exists in the CV text | DRAFT Check: «registrering og behandling av bilag» is only in the education list, not the job |
| L3 | No run of 8 or more words in a row copied from the ad | DRAFT Pass (longest run from the ad: 3 words) |
| L4 | Job title and employer are correct | DRAFT Pass |
| L5 | 250-400 words (at most 300 for Direkte), 2-3 concrete CV examples | DRAFT Pass (about 260 words) |
| L6 | The chosen Tone's rules hold and it reads as that Tone | DRAFT Pass (formal, no anecdote marker; only Formell was requested) |
| L7 | Every flag the integrity guard would raise is a real problem | DRAFT n/a (the integrity guard is not built; see L2) |
| L8 | No emoji or exclamation marks, no needless English loanwords | DRAFT Pass (no emoji, no exclamation marks) |

### openrouter:openai/gpt-5.6-terra: Gap analysis

Output: [openrouter-openai-gpt-5.6-terra/held-out-regnskap-kvale.gap.json](openrouter-openai-gpt-5.6-terra/held-out-regnskap-kvale.gap.json). Model openai/gpt-5.6-terra. Input tokens 1283, output tokens 953, estimated cost $0.0140, 8580 ms.

| Item | Check | Pass / fail |
| --- | --- | --- |
| G1 | Each rewordable gap's cited CV entry really shows the Keyword | DRAFT Pass (evidence is verbatim from the CV) |
| G2 | Every must-never-suggest item in the Answer key is a Real gap | DRAFT Pass |
| G3 | Real gaps are worded honestly and do not push to add the Keyword | DRAFT Pass |
| R1 | No suggestion adds a fact or upgrades the work or the role | DRAFT Pass |

## nursing-sarvurdering

### openrouter:anthropic/claude-sonnet-5.5: Letter

Output: [openrouter-anthropic-claude-sonnet-5.5/nursing-sarvurdering.letter.txt](openrouter-anthropic-claude-sonnet-5.5/nursing-sarvurdering.letter.txt). Model anthropic/claude-sonnet-5.5. Input tokens 2093, output tokens 2038, estimated cost $0.0246, 14450 ms. Words: 294.

| Item | Check | Pass / fail |
| --- | --- | --- |
| L1 | Bokmål throughout; no English sentences | DRAFT Pass (language only; naturalness is for Helene) |
| L2 | Every qualification, tool, employer, date and number exists in the CV text | DRAFT Pass |
| L3 | No run of 8 or more words in a row copied from the ad | DRAFT Pass (longest run from the ad: 7 words) |
| L4 | Job title and employer are correct | DRAFT Pass |
| L5 | 250-400 words (at most 300 for Direkte), 2-3 concrete CV examples | DRAFT Pass (about 294 words) |
| L6 | The chosen Tone's rules hold and it reads as that Tone | DRAFT Pass (formal, no anecdote marker; only Formell was requested) |
| L7 | Every flag the integrity guard would raise is a real problem | DRAFT n/a (the integrity guard is not built; see L2) |
| L8 | No emoji or exclamation marks, no needless English loanwords | DRAFT Pass (no emoji, no exclamation marks) |

### openrouter:anthropic/claude-sonnet-5.5: Gap analysis

Output: [openrouter-anthropic-claude-sonnet-5.5/nursing-sarvurdering.gap.json](openrouter-anthropic-claude-sonnet-5.5/nursing-sarvurdering.gap.json). Model anthropic/claude-sonnet-5.5. Input tokens 2493, output tokens 3698, estimated cost $0.0420, 24377 ms.

| Item | Check | Pass / fail |
| --- | --- | --- |
| G1 | Each rewordable gap's cited CV entry really shows the Keyword | DRAFT Pass (the cited entry shows demens only as a course topic; see G2) |
| G2 | Every must-never-suggest item in the Answer key is a Real gap | DRAFT Fail: «erfaring med demens» is on the Answer key's never-suggest list but is marked Rewordable (the suggestion itself is honest) |
| G3 | Real gaps are worded honestly and do not push to add the Keyword | DRAFT Pass |
| R1 | No suggestion adds a fact or upgrades the work or the role | DRAFT Pass |

### openrouter:openai/gpt-5.6-terra: Letter

Output: [openrouter-openai-gpt-5.6-terra/nursing-sarvurdering.letter.txt](openrouter-openai-gpt-5.6-terra/nursing-sarvurdering.letter.txt). Model openai/gpt-5.6-terra. Input tokens 1205, output tokens 544, estimated cost $0.0089, 5300 ms. Words: 296.

| Item | Check | Pass / fail |
| --- | --- | --- |
| L1 | Bokmål throughout; no English sentences | DRAFT Pass (language only; naturalness is for Helene) |
| L2 | Every qualification, tool, employer, date and number exists in the CV text | DRAFT Check: «erfaring med observasjon og oppfølging av beboernes behov» goes a little beyond the CV |
| L3 | No run of 8 or more words in a row copied from the ad | DRAFT Pass (longest run from the ad: 4 words) |
| L4 | Job title and employer are correct | DRAFT Pass |
| L5 | 250-400 words (at most 300 for Direkte), 2-3 concrete CV examples | DRAFT Pass (about 296 words) |
| L6 | The chosen Tone's rules hold and it reads as that Tone | DRAFT Pass (formal, no anecdote marker; only Formell was requested) |
| L7 | Every flag the integrity guard would raise is a real problem | DRAFT n/a (the integrity guard is not built; see L2) |
| L8 | No emoji or exclamation marks, no needless English loanwords | DRAFT Pass (no emoji, no exclamation marks) |

### openrouter:openai/gpt-5.6-terra: Gap analysis

Output: [openrouter-openai-gpt-5.6-terra/nursing-sarvurdering.gap.json](openrouter-openai-gpt-5.6-terra/nursing-sarvurdering.gap.json). Model openai/gpt-5.6-terra. Input tokens 1407, output tokens 2888, estimated cost $0.0375, 24558 ms.

| Item | Check | Pass / fail |
| --- | --- | --- |
| G1 | Each rewordable gap's cited CV entry really shows the Keyword | DRAFT Pass (evidence is verbatim from the CV) |
| G2 | Every must-never-suggest item in the Answer key is a Real gap | DRAFT Pass |
| G3 | Real gaps are worded honestly and do not push to add the Keyword | DRAFT Pass |
| R1 | No suggestion adds a fact or upgrades the work or the role | DRAFT Fail: «Har praksiserfaring med legemiddelhåndtering» upgrades «Fulgte med på legemidlene»; «gode muntlige og skriftlige norskkunnskaper» adds what the CV does not say |

## two-column-fjord-analytics

### openrouter:anthropic/claude-sonnet-5.5: Letter

Output: [openrouter-anthropic-claude-sonnet-5.5/two-column-fjord-analytics.letter.txt](openrouter-anthropic-claude-sonnet-5.5/two-column-fjord-analytics.letter.txt). Model anthropic/claude-sonnet-5.5. Input tokens 1910, output tokens 1868, estimated cost $0.0225, 13341 ms. Words: 269.

| Item | Check | Pass / fail |
| --- | --- | --- |
| L1 | Bokmål throughout; no English sentences | DRAFT Pass (language only; naturalness is for Helene) |
| L2 | Every qualification, tool, employer, date and number exists in the CV text | DRAFT Pass |
| L3 | No run of 8 or more words in a row copied from the ad | DRAFT Pass (longest run from the ad: 4 words) |
| L4 | Job title and employer are correct | DRAFT Pass |
| L5 | 250-400 words (at most 300 for Direkte), 2-3 concrete CV examples | DRAFT Pass (about 269 words) |
| L6 | The chosen Tone's rules hold and it reads as that Tone | DRAFT Pass (formal, no anecdote marker; only Formell was requested) |
| L7 | Every flag the integrity guard would raise is a real problem | DRAFT n/a (the integrity guard is not built; see L2) |
| L8 | No emoji or exclamation marks, no needless English loanwords | DRAFT Pass (no emoji, no exclamation marks) |

### openrouter:anthropic/claude-sonnet-5.5: Gap analysis

Output: [openrouter-anthropic-claude-sonnet-5.5/two-column-fjord-analytics.gap.json](openrouter-anthropic-claude-sonnet-5.5/two-column-fjord-analytics.gap.json). Model anthropic/claude-sonnet-5.5. Input tokens 2230, output tokens 1237, estimated cost $0.0168, 9580 ms.

| Item | Check | Pass / fail |
| --- | --- | --- |
| G1 | Each rewordable gap's cited CV entry really shows the Keyword | DRAFT Pass (evidence is verbatim from the CV) |
| G2 | Every must-never-suggest item in the Answer key is a Real gap | DRAFT Pass |
| G3 | Real gaps are worded honestly and do not push to add the Keyword | DRAFT Pass |
| R1 | No suggestion adds a fact or upgrades the work or the role | DRAFT Pass |

### openrouter:openai/gpt-5.6-terra: Letter

Output: [openrouter-openai-gpt-5.6-terra/two-column-fjord-analytics.letter.txt](openrouter-openai-gpt-5.6-terra/two-column-fjord-analytics.letter.txt). Model openai/gpt-5.6-terra. Input tokens 1059, output tokens 665, estimated cost $0.0101, 6490 ms. Words: 311.

| Item | Check | Pass / fail |
| --- | --- | --- |
| L1 | Bokmål throughout; no English sentences | DRAFT Pass (language only; naturalness is for Helene) |
| L2 | Every qualification, tool, employer, date and number exists in the CV text | DRAFT Pass |
| L3 | No run of 8 or more words in a row copied from the ad | DRAFT Pass (longest run from the ad: 4 words) |
| L4 | Job title and employer are correct | DRAFT Pass |
| L5 | 250-400 words (at most 300 for Direkte), 2-3 concrete CV examples | DRAFT Pass (about 311 words) |
| L6 | The chosen Tone's rules hold and it reads as that Tone | DRAFT Pass (formal, no anecdote marker; only Formell was requested) |
| L7 | Every flag the integrity guard would raise is a real problem | DRAFT n/a (the integrity guard is not built; see L2) |
| L8 | No emoji or exclamation marks, no needless English loanwords | DRAFT Pass (no emoji, no exclamation marks; «Junior produktanalytiker» is capitalised mid-sentence) |

### openrouter:openai/gpt-5.6-terra: Gap analysis

Output: [openrouter-openai-gpt-5.6-terra/two-column-fjord-analytics.gap.json](openrouter-openai-gpt-5.6-terra/two-column-fjord-analytics.gap.json). Model openai/gpt-5.6-terra. Input tokens 1210, output tokens 530, estimated cost $0.0088, 5624 ms.

| Item | Check | Pass / fail |
| --- | --- | --- |
| G1 | Each rewordable gap's cited CV entry really shows the Keyword | DRAFT Pass (evidence is verbatim from the CV) |
| G2 | Every must-never-suggest item in the Answer key is a Real gap | DRAFT Pass |
| G3 | Real gaps are worded honestly and do not push to add the Keyword | DRAFT Pass |
| R1 | No suggestion adds a fact or upgrades the work or the role | DRAFT Pass |

## Draft summary (Claude, 2026-11-18)

| | Sonnet 5.5 | gpt-5.6 terra |
| --- | --- | --- |
| Expected Rewordable gaps found (G4), all Fixtures | 12 of 15 (nursing 4 of 7) | 11 of 15 (nursing 3 of 7) |
| G2 failures | 1 (nursing: erfaring med demens) | 0 |
| R1 failures | 0 (one Check: pull requests) | 1 (nursing: praksiserfaring med legemiddelhåndtering; one Check: pull requests) |
| Letters: L2 Checks | 1 (held-out) | 2 (held-out, nursing) |
| Estimated cost per Application | $0.039 to $0.067, average about $0.048 | $0.019 to $0.046, average about $0.028 |
| Speed (first Letter) | 14.5 s | 5.6 s |

Both models passed every request with `zdr` and `data_collection: deny` set on OpenRouter.
