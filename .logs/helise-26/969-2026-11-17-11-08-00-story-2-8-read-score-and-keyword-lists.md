# Story 2.8: Les poengsummen og nøkkelordlistene på Søknad

## 2026-11-17 kl. 11:08 — Helise-26

### Oppgave
Implementere spesifikasjonen `_bmad-output/implementation-artifacts/spec-2-8-read-the-score-and-the-keyword-lists-on-soknad.md`: Søknad sender ett `POST /api/analyses` og viser poengsum, formel, Verdict og CV-/annonselinjene bak hvert nøkkelord (fase 1, uten KI).

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-2-8-read-the-score-and-the-keyword-lists-on-soknad.md` (kilde til sannhet), epic-kontekst `epic-2-context.md`.
- `@tanstack/react-query@5.107.1` + `QueryProvider` i rot-layout; innsendingen er én `useMutation`.
- Nye delte komponenter (`code-strip`, `evidence-quote` med ren `trim-quote`, `credits-list`) og `match/ui` (`score-block`, `keyword-entry`, `phase-one-line`).
- `ApplicationForm` eier nå `h1`, bytter mellom skjema og resultat, fokus, live-region og feilvarsler.
- Enhetstester og e2e-tester.

### Resultat
- Endret: `package.json`/`package-lock.json`, `src/app/layout.tsx`, `src/app/soknad/page.tsx` (h1 flyttet inn i skjemaet), `src/shared/ui/messages.nb.ts` (`result`, `application.adUnclear`), `src/shared/ui/components/catalogue-heading.tsx` (ref, `employer`), `src/modules/application/ui/application-form.tsx`, `e2e/application.spec.ts`.
- Nytt: `src/shared/ui/query-provider.tsx`, `src/shared/ui/components/{code-strip,evidence-quote,credits-list}.tsx`, `trim-quote.ts`, `src/modules/match/ui/{score-block,keyword-entry,phase-one-line}.tsx` + `index.ts`, tester `trim-quote.test.ts`, `result-components.test.ts`, `match/ui/ui.test.ts`.
- Ingen endring i `match/core`, `keywords/core`, ruta eller kontraktene. Ingen lint-regel endret, så ingen ny lint-fixture.
- Verdict kommer fra `verdictOf` via `match/ui` (`phaseOneLine` bygger live-linja der, så applikasjonen ikke importerer `match/core`).
- Verifisert: `npx biome check` rent, `npm run typecheck` rent, `npx vitest run` 469 grønne, `npx playwright test` hele suiten 202 grønne (to runder). Eksempelparet i e2e leser tallene fra fasiten.
- Eksisterende e2e-test for `applicationId` ble skrevet om: den sendte før ingen forespørsel; nå stubbes `/api/analyses` med 400 slik at skjemaet blir stående.
- Ikke committet (kode); kun loggfila committes av skillen.

### Åpne punkter
- «Andre feil» (alt annet enn `INVALID_INPUT` på `inputs.jobAd` og `NETWORK_ERROR`) viser samme tekst som nettverksfeil, fordi det ikke finnes noen egen generisk feiltekst i `messages.nb.ts` (samme mønster som `access-form` og `cv-input`). Avgjør om det trengs en egen tekst.
- Ikke verifisert: `docker compose run --rm --build test`; resultatsiden er ikke sett i nettleser av meg (kun axe, scroll-sjekk og DOM-assertions ved 1280/360/320 px). Layouten (to kolonner i poengblokka innenfor `max-w-measure`) bør vurderes visuelt.
