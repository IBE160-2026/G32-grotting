# Story 3.3: AI-leverandør og bake-off

## 2026-11-18 kl. 13:48 — Helise-26

### Oppgave
Bygge Story 3.3 («Pick the AI provider in a bake-off») med anbefalt spec, subagenter og review, og merge når ferdig. Bake-offen selv (nøkler, kjøring, poengsetting, valg av vinner) er Helenes valg og er ikke gjort.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-3-pick-the-ai-provider-in-a-bake-off.md` (route dispatch, branch `story/3.3-pick-the-ai-provider-in-a-bake-off`).
- Bygge alt bake-offen trenger, og stoppe der et menneske må handle: live-adapter for begge kandidater, `scripts/bake-off.ts` med grove prompter, vilkårsdokument og runbook. Ingen betalt forespørsel.
- Subagent bygde; tre reviewere (Blind Hunter, Edge Case Hunter, Verification Gap); fire patcher.

### Resultat
- Commit 02af8d2 (branch). Avhengigheter `ai@7.0.176`, `@ai-sdk/anthropic@4.0.106`, `@ai-sdk/openai@4.0.121`, festet.
- `config.ai` har nå provider, model og apiKey; `AI_MODEL` leses, og live krever provider + modell + nøkkel (ellers Testmodus). `createAdapter('live', { isTestRun, live })` bygger `live.ts` (Vercel AI SDK, `generateText` + `Output.object`); feil blir fast tekst + kode (`HTTP_n`, `ABORTED`, `SCHEMA_MISMATCH`, `PROVIDER_ERROR`).
- `scripts/bake-off.ts` (+ `prompts.ts`, `results.ts`): ett brev (Formell) og ett Gap per Fixture og kandidat, `--dry`, `--out`, priser som argument, nekter å skrive over eksisterende `results.md` i live-kjøring.
- `docs/qa/ai-provider-terms.md` (vilkår, DPF «not verified» for begge) og `docs/qa/bake-off-runbook.md` (Helenes trinn 1–8).
- Review: patchet (1) test av `runAi` → `createAdapter`-overlevering, (2) `SCHEMA_MISMATCH`-kode og test-navn, (3) vern mot overskriving av `results.md`, (4) feil trinnhenvisning i vilkårsfila, (5) skjema-assertion. Utsatt: ugyldig `AI_PROVIDER` brenner cap-plass; bake-offens live-sti uten test. Resten avvist (se triage i spec).
- Verifisert: biome, typecheck, vitest (63 filer, 698 bestått, 2 forventet feil), `db:check`, `--dry`-kjøring. Docker og e2e ikke kjørt lokalt.
- Sprint-status: 3-2 satt til done, 3-3 til review.

### Åpne punkter
- Bake-off-runbook trinn 1–8: lag nøkler og sett månedlig grense (ca. 200 NOK), sjekk vilkår (DPF-lista, OpenAI-DPA), finn priser, kjør `scripts/bake-off.ts`, poengsett for hånd, velg vinner og før den inn i `docs/architecture.md` og PRD (Open question 3, ev. §8.1), sett `AI_PROVIDER`/`AI_MODEL`/`AI_RETENTION_DAYS`, fjern tapende pakke og gren i `live.ts`.
- `docs/qa/ai-provider-terms.md` er ikke bekreftet av Helene.
- Ugyldig `AI_PROVIDER` (skrivefeil) gir Testmodus av og en brent cap-plass per forespørsel; legg inn oppstartssjekk senest i Story 3.12.
- Bake-offens live-sti (riktig nøkkel/modell per kandidat, exit-kode) mangler test.
- Story 3.4 skriver de ekte prompene under `PROMPT_VERSION`; Gap-prompten kommer med Gap-storyen.
