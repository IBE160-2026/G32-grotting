---
title: 'Story 3.4: Write the Letter on the server'
type: 'feature'
created: '2026-11-19'
status: 'done'
route: 'dispatch'
baseline_commit: 'deab421a0bd15f1e00369b8eb3a2ac547994d665'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app has the single AI pipeline (`runAi`) and a chosen provider, but nothing asks it for a Letter. The only Letter prompt is the throwaway one in `scripts/bake-off/prompts.ts`, and there is no `letter` slice, no phase-2 route and no sign-off or file-name rule.

**Approach:** Add the `letter` slice (contracts, prompt with `PROMPT_VERSION`, server `generateLetter`, pure `renderLetter` and `letterFileName`) and the route `POST /api/analyses/[id]/letter`. The route recomputes phase 1 from the raw inputs, checks the fingerprint, then makes exactly one `runAi` call. No UI (Story 3.7), no cached adapter (3.5), no integrity checks (3.5, 3.10).

## Boundaries & Constraints

**Always:**
- Branch `story/3.4-write-the-letter-on-the-server`; commits cite `3.4` and FR-9, FR-10, FR-26; stage by explicit path; no live or network request in any test.
- Files: `src/modules/letter/{contracts.ts, index.ts, core/{render-letter.ts, file-name.ts, normalise-letter.ts}, server/{generate.ts, prompts/letter.ts}}`, `src/app/api/analyses/[id]/letter/route.ts`, tests next to each file, names starting with the requirement ID. `index.ts` is `server-only`; `contracts.ts` is client-safe; `letter/core` is pure (no I/O, env, clock, random).
- `contracts.ts`: `TONES = ["Formell","Personlig","Direkte"]` and `Tone`; `letterSchema = { text, tone, rev }`; `letterRequestSchema = { applicationId: uuid, fingerprint: string, inputs: analysisInputsSchema, tone, consent: { noticeVersion } | null, previousRev?: int >= 0 (default 0) }`; response `{ letter, meta: AiResultMeta }`. Unknown body fields (such as a name) are dropped by the schema.
- Route: `handle`, `maxDuration = 120`, `dynamic = "force-dynamic"`. The `[id]` param must equal `applicationId`, else `INVALID_INPUT` (field `applicationId`). Recompute with `analyseInputs(inputs, await loadVocabulary())`; `TOO_FEW_KEYWORDS` → `INVALID_INPUT` (field `inputs.jobAd`, as phase 1); fingerprint differs → `ApiError("ANALYSIS_STALE")` (409) with no `runAi` call. Derived data (matched keywords) comes only from the server's recompute. A `runAi` failure maps to `ApiError(code, { retryable })`. Read Next's docs in `node_modules/next/dist/docs/` for async route params before writing the route.
- `generateLetter(input, ctx, options?)` calls `runAi` once with `task: "letter"`, `promptVersion: PROMPT_VERSION`, `studentId: null`, the Zod output schema `{ text }`, and passes `options` through (the test seam). It returns `Letter` with `rev = previousRev + 1`.
- Prompt (`prompts/letter.ts`): exports `PROMPT_VERSION` (`letter-1`) and a builder returning `buildPrompt(sentCvText)`. It asks for bokmål to the named employer for the named job, 250–400 words (at most 300 for «Direkte»), 2–3 concrete CV examples that best match the ad, only qualifications in the CV text, the Tone rules (Formell: no personal anecdote; Personlig: at least one phrase of motivation; Direkte: first sentence uses a matched keyword), plain UX voice (no emoji, no exclamation marks), and ends with `{{SIGNATUR}}`. It lists up to 8 matched keyword terms. It never lists missing keywords. CV and ad are delimited and marked as data, not instructions. The Student's name is never an input.
- `normaliseLetter(text)`: trim; remove every `{{SIGNATUR}}`; if a closing phrase (Med vennlig hilsen, Vennlig hilsen, Mvh, Hilsen, Beste hilsen, Med vennleg hilsen) is in the last 6 lines, drop all lines after it (a written name); else append «Med vennlig hilsen»; end with one `{{SIGNATUR}}` on its own line. Result always contains exactly one token. Blank text after normalising is `AI_PROVIDER_ERROR`, retryable.
- `renderLetter(text, name | null)` replaces the token with the trimmed name, or «[Navnet ditt]» when null or blank (replace by split/join, so `$` in a name is safe). `letterFileName({ employer, year }, name | null)` gives `[name-]soknadsbrev-<employer>-<year>.docx`: lowercase, æ→ae, ø→o, å→a, other diacritics stripped, anything outside a–z0–9 becomes one `-`, no leading or trailing `-`, ASCII only, an empty employer part is left out.

**Never:**
- Do not change `runAi`, config, the cap, the notice, `application` phase 1 or `scripts/bake-off/`. No `docx`, UI, `checkLetter`, cached adapter or messages file change. No DB write. No name, e-mail or phone number from the Student in the prompt. No client-supplied matched keywords or scores.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Valid body, fingerprint matches, mock adapter returns text | 200 `{ letter: { text, tone, rev: 1 }, meta }`, one `runAi` call | N/A |
| Regenerate | `previousRev: 3` | `rev: 4` | N/A |
| Stale | Fingerprint differs from the recompute | 409 `ANALYSIS_STALE` | No `runAi` call |
| Id mismatch | `[id]` ≠ `applicationId` | 400 `INVALID_INPUT`, field `applicationId` | No `runAi` call |
| Bad tone or inputs | Unknown tone, short ad | 400 `INVALID_INPUT` with `field` | No `runAi` call |
| AI answer with name | Text ends «Hilsen\nOla Nordmann» | Name removed, one token | N/A |
| AI answer without sign-off | No closing phrase, no token | «Med vennlig hilsen» and token appended | N/A |
| AI answer with token twice | Two `{{SIGNATUR}}` | Exactly one remains | N/A |
| Cap, notice, timeout, provider error | `runAi` returns an `AiFailure` | 429, 403, 502 with `retryable` per failure | Envelope, no raw error |
| Name null / name with æøå | `renderLetter`, `letterFileName` | «[Navnet ditt]», `soknadsbrev-nordic-digital-2026.docx`; `Åse Ærlig` → `ase-aerlig-…` | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/ai/index.ts`, `contracts.ts` -- `runAi<T>(request, ctx, options?)`; `AiRequest` fields (`task, cvText, jobAd, tone, jobTitle, employer, promptVersion, buildPrompt, schema`); `AiRunResult` is `Result<AiOutput<T> & { sentCvText }, AiFailure>`; `AiOutput` and `AiResultMeta` only from `@/modules/ai/contracts`. Mock adapter: `createMockAdapter({ respond })` in `src/modules/ai/server/adapters/mock.ts`, test seam `options.adapter` / `options.testMode`.
- `src/app/api/analyses/route.ts` -- the pattern to copy (`handle`, `analyseRequestSchema`, `analyseInputs`, `loadVocabulary` from `@/shared/server/data-files`).
- `src/modules/application/contracts.ts` -- `analysisInputsSchema`; `src/modules/application/index.ts` -- `analyseInputs` returns `{ result, fingerprint }` or `TOO_FEW_KEYWORDS`; `AnalysisResult.matched[].term` from `@/modules/match/contracts`.
- `src/shared/server/handle.ts` -- `handle`, `ApiError(code, { field?, retryable? })`; `errorStatus` already maps `ANALYSIS_STALE`, `DAILY_CAP_REACHED`, `AI_*`.
- `scripts/bake-off/prompts.ts` -- throwaway prompt and `TONES`; source of wording only. Do not import from it or edit it.
- `biome.json` -- slice-boundary rules (other slices only through `index.ts` / `contracts.ts`); the route may import `@/modules/application` and `@/modules/letter`.
- `data/fixtures/example-nordic-digital/` and `loadExamplePair()` -- inputs for tests (employer «Nordic Digital»).
- Gap to know: with no key, Test mode picks the `cached` adapter, which still throws until Story 3.5; route tests therefore mock `@/modules/letter` or `@/modules/ai`.

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/letter/contracts.ts` -- Tone, Letter, request and response schemas -- AD-7
- [x] `src/modules/letter/core/normalise-letter.ts`, `render-letter.ts`, `file-name.ts` + tests -- sign-off and file-name rules incl. æøå, `$` in a name, two tokens, trailing name -- FR-12, AD-7
- [x] `src/modules/letter/server/prompts/letter.ts` + test -- prompt and `PROMPT_VERSION`; assert length, Tone, bokmål, only-the-CV, data-delimiting, no missing keywords, no name -- FR-9, FR-10, AD-15
- [x] `src/modules/letter/server/generate.ts`, `index.ts` + test -- one `runAi` call with the mock adapter, normalised text, `rev`, failure pass-through -- AD-6, AD-13
- [x] `src/app/api/analyses/[id]/letter/route.ts` + test -- every matrix row; fetch stubbed to prove no network -- FR-26, NFR-1, NFR-4

**Acceptance Criteria:**
- Given the Always rules, when `npx biome check`, `npm run typecheck`, `npx vitest run` and `npm run db:check` run, then all pass.
- Given `package.json`, `Dockerfile`, the lockfile and `data/` are unchanged, then the Docker test run is not required; otherwise `docker compose run --rm --build test` passes and the log names the run.
- Given a stale or invalid request, when the route handles it, then the `runAi` mock was never called.

## Implementation Notes

- 2026-11-19: built by a subagent from this spec; review pass 1 (three reviewers) patched by the same subagent, one finding deferred (answer validation, Stories 3.5 and 3.10).
- Choices the spec left open: `normaliseLetter` returns `string | null` (null = blank after removing the token, turned into a retryable `AI_PROVIDER_ERROR`); the route is `POST(request, { params })` and calls `handle(...)(request)` inside, so `handle.ts` is unchanged; tests use inline mock adapters because Biome forbids importing another slice's `server/`.
- Review patches: delimiter stripping loops until stable, job title and employer on one line, Direkte keyword rule only with listed terms, «Med hilsen» and «Høflig hilsen» as closing phrases, last closing line wins, token variants removed, `previousRev` capped at 1 000 000, file name transliterates ß ł đ ð þ œ and caps parts at 40 characters, test for `consent` reaching `runAi`.
- Verified: `npx biome check`, `npm run typecheck`, `npx vitest run` (69 files, 781 passed, 2 expected fail), `npm run db:check`. `package.json`, `Dockerfile`, the lockfile and `data/` are unchanged, so the Docker run was not required. Real runs without a key still fail in Test mode until Story 3.5 delivers the cached adapter.

## Spec Change Log

## Review Triage Log

Pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap):

| Finding | Verdict | Route / evidence |
|---|---|---|
| Delimiter stripping is single-pass: `<</cv>/cv>` rebuilds `</cv>`; `</cv >` not matched | medium | patch. Real: `asData` replaces once, so a pasted CV or ad can close its own block. |
| `jobTitle` and `employer` with newlines sit in the instruction part of the prompt | low | patch (collapse newlines, drop `<>`). Input is the Student's own, but a title copied from an ad can carry lines. |
| «Med hilsen» and «Høflig hilsen» not closing phrases: double sign-off, written name stays | medium | patch. Real: no phrase matches, so «Med vennlig hilsen» is appended after the AI's own sign-off and name. |
| First closing phrase in the window wins and cuts everything after it | low | patch (use the last match). A body line starting with «Hilsen» or «Mvh» would drop the real sign-off. |
| Token variants (`{{SIGNATURE}}`, `{{ SIGNATUR }}`, lower case) survive and reach the Student | medium | patch (case-insensitive, space-tolerant match). `renderLetter` replaces only the exact token. |
| Direkte rule asks for a matched keyword when none is listed | low | patch (rule only when terms exist). |
| `previousRev` has no upper bound; `rev` can leave the safe-integer range | low | patch (`max(1_000_000)`). Direct correction. |
| File name: ß, ł, đ, ð, þ, œ become hyphens; no length cap | low | patch (transliterate, cap at 120). |
| Route-to-`runAi` hand-off of `consent` and `studentId` is not asserted by any test (Verification Gap) | medium | patch (add test asserting `runAi`'s ctx). Pre-verified. |
| AD-15 comment says CI fails on a prompt-version difference; that check does not exist yet | low | patch (comment says Story 3.5 adds it). |
| No validation of length, language or leftover placeholders («[Ditt navn]») on the AI answer | low | defer. Tone and length checks are `checkTone` (Story 3.5) and the integrity guard (3.10); not in 3.4's ACs. |
| Direkte «250-300 words» contradicts «at most 300 words» | false | Not a contradiction: a floor and the same ceiling; the spec's «at most 300» holds. |
| Removed mid-text token leaves a double space, pinned by a test | low | reject. Cosmetic, rare (the prompt puts the token at the end). |
| `rev` is client-trusted and not stored; `letterSchema.rev` allows 0 | low | reject. By design (Design Notes); no store before accounts. The bound is patched above. |
| «Hilsen» alone returns a body-less Letter | low | reject. Unlikely; the fix adds a branch. |
| Closing phrase in markdown bold, or more than 5 lines after it | low | reject. The prompt asks for plain text; the fix adds branches. |
| `[id]` UUID in another letter case is rejected | false | The client builds the URL from the same `applicationId` string; both come from `crypto.randomUUID()`. |
| `await params` outside `handle` could bypass the envelope | false | Next supplies `params` as an already-resolved promise; no reachable rejection. |
| A name written in the CV still reaches the provider | false | By design: the Profile name is never sent, while the CV text is the input (spec: only e-mail and phone are stripped, by `runAi`). |
| `renderLetter` and `letterFileName` have no caller | false | Expected: Stories 3.7 and 3.8 use them. |
| `studentId: null`, no per-IP throttle | false | Per-installation cap by design (Story 3.2); accounts come in Epic 6. |

## Design Notes

`rev` has no store before accounts exist, so the client sends `previousRev` and the server returns the next number; Story 3.7 and the later `letter_rev` column can keep that meaning. The Tone rules are in the prompt only: checking them on the answer is `checkTone` in Story 3.5.

## Verification

**Commands:**
- `npx biome check` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npx vitest run` -- expected: all pass
- `npm run db:check` -- expected: migrations apply from zero
