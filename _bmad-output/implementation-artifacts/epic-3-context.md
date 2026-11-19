# Epic 3 Context: Get an honest draft Letter

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The Student picks a Tone and gets a bokmål draft Letter built on their own CV, with any claim the CV doesn't support flagged. They can copy it, download it as .docx or ask for a new draft. They are told before any text leaves the app, and AI use is capped. The Examiner runs the whole flow in Test mode with no key. The epic also builds the single AI pipeline the later epics reuse, picks the AI provider (bake-off, 18 Nov), and ends with the core-flow checkpoint on 24 Nov (cut 0 if it fails).

## Stories

- Story 3.1: Send every AI request through one pipeline
- Story 3.2: Enforce the Daily cap and the AI notice on the server
- Story 3.3: Pick the AI provider in a bake-off
- Story 3.4: Write the Letter on the server
- Story 3.5: Run the full flow in Test mode on Cached responses
- Story 3.6: Ask before any text leaves the app
- Story 3.7: Choose a Tone and see the Letter arrive
- Story 3.8: Copy, download and regenerate the Letter
- Story 3.9: Keep the score when the AI part fails
- Story 3.10: Flag claims in the Letter that the CV doesn't support
- Story 3.11: Let AI propose Keywords when code alone falls short (FR-5b applies)
- Story 3.12: Turn on live AI on the Hosted version and pass the core-flow checkpoint

## Requirements & Constraints

- Letter: bokmål, 250-400 words, addressed to the named employer for the named job, built on 2-3 concrete CV examples, using only qualifications traceable to the CV text. Labelled «Utkast skrevet med KI – les gjennom og tilpass før du sender.». Sign-off is the Profile name, or a visible placeholder without one.
- Three Tones, «Formell» default. Testable rules: Formell has no anecdote marker; Personlig has at least one motivation phrase; Direkte is at most 300 words with a Matched keyword in its first sentence. The Tone shown must equal the Tone stored, including after «Lag nytt utkast».
- Letter is read-only, with «Kopier» and «Last ned (.docx)» (ASCII-only file name). «Lag nytt utkast» replaces the old Letter and counts toward the Daily cap.
- Integrity guard on the Letter: while Gap analysis doesn't exist, every Missing keyword in the Letter is an Unsupported claim; Upgrade words absent from the CV are flagged too. Flag only, never remove or rewrite.
- AI notice before the first AI request: names the provider, says CV text and ad are sent (ad only for Keyword extraction), score is local, provider doesn't train and its retention period, sensitive info should be left out. Once per browser session, never in Test mode, nothing sent before acceptance.
- Daily cap: 30 AI requests per installation per day (Oslo midnight reset). Score still works when the cap is reached; AI sections say so. A provider monthly spending limit backs it up.
- Email addresses and phone numbers are stripped from CV text before it goes to the provider.
- FR-5b applies (decided 17 Nov): AI proposes the Keyword list once per new Job ad; every proposed Keyword must pass `findKeyword` against the ad or is dropped; the list is saved by ad hash; only the ad, never the CV, is sent. Without the notice, in Test mode, at the cap or on failure, fall back to code-only Keywords marked as less precise.
- Test mode (no key or `TEST_MODE=true`): banner, one Cached Letter per Tone, «Lag nytt utkast» shows it again, other inputs say AI is not available. Automated tests never make paid requests.
- Stability: if the AI part fails, times out (90 s), hits the cap or is unavailable, the score stays and only the AI section can be retried. Double submit or refresh starts one Application and one Letter request; no raw error pages.
- Performance: AI sections within 60 s in at least 4 of 5 timed runs. Cost: AI spend at most 200 NOK/month, token counts logged per request.
- Definition of done, added from the Epic 2 retrospective (item 5): a story that changes `Dockerfile`, `package.json` or the lockfile, or anything under `data/`, is done only after `docker compose run --rm --build test` has passed on the story's branch. The story log names the run; "not run" is not done. Other stories still run it as the standing criterion in `epics.md`, and CI covers the rest.
- All UI text in bokmål from `src/shared/ui/messages.nb.ts`; UX voice (du, fact then reason, no cheerleading). WCAG 2.2 AA; live regions used exactly as specified; axe scan clean at 1280 px and 360 px.
- Checkpoint 24 Nov: tests for FR-1 to FR-12 and FR-24 to FR-28 pass, SM-1 passes for the Example pair in Test mode and one live Fixture, SM-2 passes, wrong-input tour passes. If not passed, apply cut 0 (freeze Hosted) and finish S1-S3 first.

## Technical Decisions

- New slices: `ai` (no UI), `letter`, `integrity` (core only here: Letter and Tone checks, word lists); `application` gains phase-2 routes. Slices expose only `index.ts` (server-only), `contracts.ts`, `ui/index.ts`; allowed edges: letter, keywords -> ai; application -> letter. `core/` is pure (no I/O, env, clock, random). `integrity/core` imports only `keywords/core` and `shared/core`.
- `runAi(request, ctx)` is the only way to reach an AI provider. Slices pass `buildPrompt(sentCvText)`, never a finished prompt. Order: lookup key from unstripped inputs, notice check, atomic Daily-cap reservation on `ai_usage` (scope `studentId ?? 'installation'`, no refund, caller can't pass scope), contact stripping, adapter with 90 s abort and SDK retries 0, exactly one content-free `LogEvent`. Returns `AiOutput<T>` plus `sentCvText`. Notice and cap are skipped in Test mode.
- `AiResultMeta` and `AiOutput<T>` live only in `ai/contracts.ts`. Adapters (`live` | `cached` | `mock`) are chosen by config; the factory throws on `live` in a test run. Live adapter uses the Vercel AI SDK; the bake-off winner's package stays and the loser is removed.
- Prompts live in `<slice>/server/prompts/` with `PROMPT_VERSION`. CI fails if the Example pair's cached `promptVersion` differs.
- Cached responses: `data/fixtures/<id>/cached/` holds raw `AiOutput<T>` (letter per Tone, `keywords.json`), written only by `scripts/record-cached.ts`; keys: Letter `sha256(canon(cv), canon(ad), canon(jobTitle), canon(employer), tone)`, Keywords `contentHash(canon(ad))`. Each Fixture is indexed under the hash of `cv.txt` and of `extract(cv.pdf)`. A miss returns `TEST_MODE_UNAVAILABLE`. Planted bad outputs in `data/fixtures/_planted/`.
- Two-phase API: phase 1 `POST /api/analyses`; phase 2 `POST /api/analyses/[id]/letter` recomputes phase 1 from raw inputs, returns `ANALYSIS_STALE` (409) on fingerprint mismatch, makes exactly one `runAi` call, `maxDuration = 120`. Body carries `{ applicationId, fingerprint, inputs, tone, consent }`. `POST /api/analyses/[id]/letter-check` runs `checkLetter` and returns `LetterCheck { flags, letterRev, gapsRev }`; the client drops results with mismatched revs; on stale it reruns phase 1 once silently.
- Error envelope `{ ok, data | error: { code, field?, retryable } }`; codes this epic uses: `AI_TIMEOUT`, `AI_PROVIDER_ERROR` (502, retryable), `DAILY_CAP_REACHED` (429), `AI_NOTICE_REQUIRED`, `TEST_MODE_UNAVAILABLE`, `ANALYSIS_STALE`. Server sends no Norwegian prose except AI content.
- Letter shape `{ text, tone, rev }` with exactly one `{{SIGNATUR}}` token (server adds if missing, replaces other sign-offs). The name is never sent to the AI. `renderLetter(text, name | null)` and `letterFileName(meta, name | null)` in `letter/core` serve screen, copy and .docx; placeholder «[Navnet ditt]». The .docx is built in the browser (`docx` package).
- Config: `config.aiNotice { version, providerName, retentionDays }`; version changes whenever provider, retention or `keywordFallback` changes. `FEATURE_KEYWORD_FALLBACK` default is switched on in Story 3.11. RunMode carries `testMode`, `features`, `aiNotice`. Only `config.ts` reads the environment; no secrets in the repo.
- Client state: `ja.session.v1` (via `client-session.ts` only) keeps `noticeVersion` and Tone; server state in TanStack Query, one mutation per phase-2 section, one in flight.
- Tables created here: `ai_usage` (Story 3.2) and `keyword_lists` (Story 3.11), each in its owning slice's `server/schema.ts`. Migrations generated only on a branch rebased on `main` just before merge.
- Shared parts created here: native `<dialog>` component, copy button, Test-mode banner, progress line, AI placeholder; reused by later epics. Create once, extend rather than add variants.
- Tests: Vitest next to files, names start with the requirement ID; Playwright e2e runs in Test mode. Each Manual Verify line gets a `docs/qa/` row. Branch per story `story/3.N-slug`; commits and PRs cite story and FR IDs.

## UX & Interaction Patterns

- Søknad form gets a «Tone i brevet» native radio group in a `fieldset` (Formell preselected, whole option is the hit area, arrows move within the group, stacks at 640 px or less). Kept in session storage.
- Phase 2 shows the result under the score: progress line («Skriver søknadsbrevet … dette tar under ett minutt.», trace animates at most 5 s, static under reduced motion) and a «Søknadsbrev» placeholder with a real `h2`, «Skrives» strip and `aria-busy`. The Letter appears at once, focus is not moved, and the first live region speaks the phase-2 line once; the second region carries copy and retry outcomes.
- Letter view: `<article>` read-only (never textarea or contenteditable), AI label above, action stack «Kopier» (primary), «Last ned (.docx)», «Lag nytt utkast»; actions full width at 640 px or less. «Kopier» shows «Kopiert» for 1.8 s; clipboard blocked selects the text with a Ctrl+C notice. «Lag nytt utkast» keeps the old Letter visible, and on failure keeps it with an alert and «Prøv igjen».
- Flags: warning list between the AI label and the Letter, one line per word, with a dashed rust underline in the Letter linking to its warning. Unchecked Letter shows a notice and a check-only retry.
- Failure states: section alert with «Prøv igjen» (focus moves to the section `h2`); «Dagens grense» notice without retry; «Testmodus» notice for non-Fixture inputs; network failure alert at top. The score always stays.
- AI notice: modal native `<dialog>`, focus on title and trapped, scrim click does nothing, Esc equals «Avbryt» (keeps input, sends nothing, focus back to submit), «Godta og fortsett» then phase 1 starts. Never shown in Test mode.
- Test-mode banner sits under the app bar inside `<header>`, `role="note"`, not dismissible.
- Before-S4 variant: no Gapanalyse section, one placeholder, no «Se gapanalysen».

## Cross-Story Dependencies

- Within the epic: 3.1 is the base for 3.2 (adds cap and notice steps), 3.3 (live adapter), 3.4 (Letter), 3.5 (cached adapter) and 3.11 (keyword request). 3.3's provider decision (18 Nov) feeds `config.aiNotice` used by 3.2 and 3.6. 3.4 and 3.5 feed 3.7 (UI), which 3.8, 3.9 and 3.10 extend. 3.6 needs 3.2's notice version. 3.12 depends on everything and on the 3.3 key.
- From earlier epics: Epic 1 (config, `handle`, `log`, session, shell, Søknad form) and Epic 2 (phase 1, fingerprint, Keyword engine, Fixtures with Answer keys, score block, `announce()`); 3.11 modifies `KeywordSource.resolve` from Epic 2 and records `keywords.json` for every Fixture.
- Into later epics: `runAi`, the cached adapter, dialog, copy button, progress line and AI placeholder are reused by Epics 4-6 (the Gaps request, suggestions copy, expiry warning, Historikk). `checkLetter` is relaxed in Epic 4 to let Rewordable gaps that passed the citation check through. Epic 6 changes sign-off to the Profile name and the cap and notice to per-account.
