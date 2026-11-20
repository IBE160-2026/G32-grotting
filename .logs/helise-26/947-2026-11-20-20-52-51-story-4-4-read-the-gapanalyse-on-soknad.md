# Story 4.4: les Gapanalysen på Søknad

## 2026-11-20 kl. 20:52 — Helise-26

### Oppgave
`goal.md`: bygg Epic 4 fra Story 4.4 til 4.6 autonomt, én story om gangen med `bmad-build-auto`. Denne seksjonen dekker Story 4.4: Gapanalysen i fase 2 på Søknad, med «Se gapanalysen»-lenke fra hver Missing-oppføring.

### Plan
- Forutsetninger sjekket: rent tre, `main` pushet (goal.md-commit 6ec4bc5), sprint-status viste 4.1–4.3 `done`, 4.4–4.6 `backlog`, `epic-4` `in-progress`.
- Blokkerende underagent kjørte `bmad-build-auto` på gren `story/4.4-read-the-gapanalyse-on-soknad` etter `epics.md` (Epic 4) og `epic-4-context.md`.
- Spec: `_bmad-output/implementation-artifacts/spec-4-4-read-the-gapanalyse-on-soknad.md`.

### Resultat
- PR #75 (merget, `ci` grønn på første forsøk): `gaps/ui/{gap-entry, no-copy-note}` via `gaps/ui/index.ts`, Gaps-mutasjonen i fase 2 (`runGaps`/`retryGaps`, `requestGaps`/`GapsJob` i `request-gaps.ts`), «Se gapanalysen»-lenke via `gapTargets` på `KeywordList` (match importerer ikke gaps), `phaseTwoLine(letterKind, gapsKind)`. Feil, tidsavbrudd, tak og Test mode behandles som Letter-seksjonen.
- PR #76 (merget, `ci` grønn): `sprint-status.yaml` → `4-4-…: done`, `epic-4` fortsatt `in-progress`.
- Tester: vitest 1272 + 3 forventet feil, Playwright 220 (19 nye i `e2e/gaps.spec.ts`), typecheck OK. Docker-testen var ikke nødvendig (ingen endring i package.json, lockfile, Dockerfile eller `data/`).
- Review (fire lag) ga 3 middels og 3 lave funn, rettet før PR. Se spec.
- Rørt ikke: `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example`, README, `PROMPT_VERSION`, `gaps.json`. Ingen KI-kall, ingen endring på Hosted.
- Avvik: Cached Gaps for Example i Test mode dekker 3 av 7 Missing-ord (resten blir mal-«Reelt gap»); ingen Gaps-forespørsel og ingen seksjon når ingenting mangler; mal-bare Gaps viser ikke no-copy-note (AC), mens EXPERIENCE.md sier «alltid til stede»; ny Playwright-server på port 3104 (Test mode, `FEATURE_GAPS=true`), 3100 beholder Gaps av.
- Hendelser i underagenten: den skrev og committet en egen sesjonslogg mot instruksen. Den ble fjernet (soft reset + sletting). Den kjørte også `git checkout -- .` og mistet uncommittede endringer; de ble gjenskapt fra lagret review-diff, og begge fulle `npm test`-kjøringer bestod etterpå. Det som ble merget er det CI verifiserte.
- Til 4.5: `gapsPhase`, `sectionKinds`, `lineGiven`, `gapsActive`, `runGaps`/`retryGaps` ligger i `src/modules/application/ui/application-form.tsx`; `/letter-check` sender fortsatt `gaps: null`, `gapsRev: 0` hardkodet i `src/modules/letter/ui/request-letter-check.ts`.

### Åpne punkter
- Cached Gaps for Example dekker bare 3 av 7 Missing-ord i Test mode; vurder ved neste opptak (4.6). Allerede ført i `issues.md`, nå lenket hit.
- EXPERIENCE.md («no-copy-note alltid til stede på Reelt gap») og AC i 4.4 (mal-bare Gaps viser ikke noten) er uenige; avklar dokumentet.
