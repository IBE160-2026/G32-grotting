# Story 4.5: la brevet bruke gaps CV-en støtter

## 2026-11-20 kl. 21:12 — Helise-26

### Oppgave
`goal.md`, andre story av tre (4.4–4.6): utvid `/letter-check` slik at et Missing-ord i brevet som er en Rewordable gap med sitering som består `checkCitation` på nytt på serveren, ikke flagges som Unsupported claim.

### Plan
- Blokkerende underagent med `bmad-build-auto` på gren `story/4.5-let-the-letter-use-gaps-the-cv-supports` fra ren `main`.
- Spec: `_bmad-output/implementation-artifacts/spec-4-5-let-the-letter-use-gaps-the-cv-supports.md`.

### Resultat
- PR #77 merget som f191a10, `ci` grønn (6m18s); sprint-status (`4-5: done`, `epic-4` `in-progress`) lå i samme PR.
- Server: `letterCheckRequestSchema.gaps` tar en begrenset liste `{ keyword, kind, citation }` eller null; `checkLetter` hopper bare over et Missing-ord når en Gap for ordet består `checkCitation` mot serverens egen `inputs.cvText`. Real gap, Upgrade, jobbtittel og manglende Gaps som i 3.10.
- Klient (`application-form.tsx`): sjekken sendes når brevet er kommet og Gaps har settlet (`gaps: null` hvis Gaps feilet), med `letterRev`/`gapsRev`; sendes på nytt etter vellykket Gaps-retry og «Lag nytt utkast»; resultater med feil revs forkastes. Feilet retry sender ikke på nytt.
- Tester: `npm test` (biome, typecheck, 1289 vitest, 227 Playwright) grønn; FR-11 med plantede Cached-svar (Example `gaps.json` bestått sitering, `gaps-citation-one-word-changed.json` feilende). Docker-test ikke nødvendig.
- Review: 4 patcher, 1 utsatt, 11 avvist (se spec).
- Rørt ikke: `FEATURE_GAPS`-standard, `PROMPT_VERSION`, `gaps.json`, integritetssjekker. `cvEntries` er fortsatt eneste CV-oppføringsdeler.
- Avvik: sitatet re-sjekkes mot rå `inputs.cvText`, ikke kontakt-strippet tekst (stripperen ligger i `ai/core`, som `application` ikke kan importere); sitat med plassholder flagges (trygg retning). I Example-flyten heter Missing-termen «testing av frontend-kode», så e2e bruker «pull requests» som Rewordable.
- Til 4.6: med flagget på venter brevsjekken på Gaps (opptil 90 s). Flagg-på Playwright-dekning ligger i `e2e/gaps.spec.ts` (server 3104).

### Åpne punkter
- En Gaps-respons fra en tidligere innsending kan adopteres etter at en ny innsending har startet (stammer fra 4.4; Letter-forespørselen har samme form); i spec-ens `deferred`.
