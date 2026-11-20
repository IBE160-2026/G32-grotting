# Epic 4 Context: Understand each gap honestly

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

For each Missing keyword, the Student learns whether the CV already shows it in other words (a Rewordable gap that quotes the CV word for word) or whether it is a Real gap, stated plainly with nothing to paste in. This gives the Student an honest gap review next to the score and lets the Letter check accept keywords the CV genuinely supports. Stories 4.1-4.5 are built behind `FEATURE_GAPS` (off by default, tests set it on explicitly); Story 4.6 switches the default on.

## Stories

- Story 4.1: Classify each Missing keyword on the server
- Story 4.2: Check every citation against the CV text
- Story 4.3: Record Cached Gaps for every Fixture
- Story 4.4: Read the Gapanalyse on Søknad
- Story 4.5: Let the Letter use gaps the CV supports
- Story 4.6: Switch on Gap analysis

## Requirements & Constraints

- Every Missing keyword becomes exactly one Gap, in Missing-list order. A Rewordable gap carries a citation of the supporting CV entry; otherwise it is a Real gap.
- A formal requirement (degree, certification, licence, language level, work permit) may be Rewordable only if the CV states it explicitly.
- A Real gap is stated plainly. The Student may be invited to think about experience the CV doesn't mention, but is never given text to insert or copy.
- Each explanation is one or two bokmål sentences referring to the ad, in the order: what is missing, why it matters, the covering CV entry. Rewordable explanations are hedged («dekker trolig dette – vurder å ta det med»). No explanation may claim an ATS will reject or rank the CV.
- Integrity (never invent): a Rewordable gap whose citation is not found word for word in the CV text (ignoring only case and whitespace) is downgraded to a fixed Real-gap template; its AI explanation is dropped. The downgrade is logged as a count only, never content.
- Each Answer key lists keywords that must never become Rewordable (checklist G2). Manual checks G1, G2, G3 and G5 are recorded once in `docs/qa/` after one live Fixture run; a failure means a prompt fix and a new `PROMPT_VERSION`.
- Gap analysis is one AI request per Application, shared in principle with later rewording. A Gaps failure must never affect the score or the Letter.
- All UI text is Norwegian (bokmål) and lives in `messages.nb.ts`; the server sends no Norwegian prose except AI content fields. Meaning is carried by text labels, not colour alone.

## Technical Decisions

- Route `POST /api/analyses/[id]/gaps` body `{ applicationId, fingerprint, inputs, consent }`. The server recomputes phase 1 from raw inputs, returns `ANALYSIS_STALE` (409) on fingerprint mismatch, makes exactly one `runAi` request (90 s abort), `maxDuration = 120` as a literal. When `features.gaps` is off, return `NOT_FOUND` and make no AI request. Gaps and Letter requests run in parallel and retry independently.
- Every AI request goes through `runAi` only (notice, daily cap, contact stripping, adapter, one content-free log event). Slices pass `buildPrompt(sentCvText)`, never a finished prompt. Citations are checked against the returned `sentCvText`.
- Wire shape: `Gap = { keyword, kind: 'rewordable' | 'real', explanation: { text } | { key, params }, citation: string | null, suggestion: string | null }`. Responses use the `{ ok, data | error }` envelope; relevant codes: `AI_TIMEOUT`, `AI_PROVIDER_ERROR`, `DAILY_CAP_REACHED`, `TEST_MODE_UNAVAILABLE`, `AI_NOTICE_REQUIRED`, `ANALYSIS_STALE`. The Real-gap template travels as `{ key, params }`.
- Order inside `gaps/server`: structure step (one Gap per Missing keyword, drop extras, skipped keyword becomes template Real gap), then FR-15 citation check. `suggestion` is `null` while `features.rewording` is off (it is during this epic). The suggestion check belongs to Epic 5.
- `integrity/core` owns all checks: `checkCitation` (substring on `canonVerbatim` text, case and whitespace only, never looser), `cvEntries(text)` (blocks bounded by blank lines, the only CV-entry splitter), `checkLetter`. It takes structural inputs (`CheckableGap { keyword, kind, citation }`) and imports neither `letter` nor `gaps`. `canonVerbatim` lives in `src/shared/core/canon-verbatim.ts`.
- Letter check (`POST /api/analyses/[id]/letter-check`, body `{ applicationId, fingerprint, inputs, letter, gaps | null, letterRev, gapsRev }`): the server re-runs `checkCitation` on every Rewordable gap before letting its keyword through; every other Missing keyword in the Letter stays an Unsupported claim. `gaps` is `null` when Gap analysis failed or the flag is off. The client sends it once the Letter has arrived and Gaps have settled, again after a successful Gaps retry and after «Lag nytt utkast», and drops results whose revs don't match.
- Fixtures: `data/fixtures/<id>/cached/gaps.json` holds raw `AiOutput<T>` (before guards), written only by `scripts/record-cached.ts`, labelled with provider, model, prompt version, date. Test-mode lookup key for Gaps is `sha256(canon(cv), canon(ad))`; a miss returns `TEST_MODE_UNAVAILABLE`. Planted bad responses live in `data/fixtures/_planted/` and are read only by tests. CI fails when the Example pair's cached gaps `promptVersion` differs from the current `PROMPT_VERSION`. `scripts/qa-compare.ts` reports G2 failures per Fixture.
- Prompts live in `gaps/server/prompts/` with a `PROMPT_VERSION`. There is one gaps prompt (Epic 5 extends it and re-records `gaps.json` once).
- Module boundary: `match` never imports `gaps`; the Søknad composition passes the «Se gapanalysen» link target into `match/ui`.

## UX & Interaction Patterns

- After phase 1 renders with the flag on, phase 2 starts with two placeholders, «Gapanalyse» and «Søknadsbrev», each with its real `h2` and `aria-busy` until resolved. Progress line: «Skriver gapanalyse og søknadsbrev … dette tar under ett minutt.»
- «Gapanalyse» `h2` carries the sand «Skrevet med KI» strip. Each Gap is an `h3` (focusable target, `id`, `tabindex="-1"`) with strip «Omformulerbart gap» or «Reelt gap».
- Rewordable gap: explanation, citation as an Evidence quote labelled «Sitert ordrett fra CV-en din · sjekket mot CV-teksten», hedge line «Linjen din dekker trolig dette – vurder å ta det med.» Real gap: explanation plus always-present no-copy note «Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.», nothing copyable. A downgraded or skipped Gap shows only the Real-gap template line; nothing else tells the Student about the downgrade.
- Each Missing entry ends with an underlined in-page link «Se gapanalysen» that moves focus to its Gap's `h3` (standalone link hit area at least 24 px high).
- Failure treatments mirror the Letter section: alert «Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.» with «Prøv igjen» (focus moves to the section `h2`), or the «Dagens grense» or «Testmodus» notice. Score and Letter are unaffected.
- One live region speaks once when both sections settle, naming any section that failed. Without accounts, leave out the «Lagret i Historikk» sentence.
- Reuse existing shared parts: evidence quote, code strip, alert, notice, AI placeholder, progress line.

## Cross-Story Dependencies

- 4.1 first: it creates the `gaps` slice and route that 4.2-4.5 build on. 4.2 adds the FR-15 step inside `gaps/server` and the shared `integrity` pieces (`checkCitation`, `cvEntries`, `canonVerbatim`).
- 4.3 needs 4.1 and 4.2 (Cached Gaps are checked after the guards) and a live key to record. Its Test-mode support is what 4.4 and 4.6 Playwright runs depend on.
- 4.4 needs 4.1-4.3 for real data and Test mode. 4.5 needs 4.2 (`checkCitation`) and 4.4 (Gaps settle state in Søknad).
- 4.6 comes last: flips `FEATURE_DEFAULTS.gaps`, adds Playwright and axe coverage, and needs one live Fixture run by Helene (a human step).
- Builds on Epic 3: `runAi`, phase 1 from `application`, the Letter section and the `/letter-check` route, the cached adapter and Answer-key schema. Epic 5 later extends the same prompt, `gaps.json` and `Gap.suggestion`.
