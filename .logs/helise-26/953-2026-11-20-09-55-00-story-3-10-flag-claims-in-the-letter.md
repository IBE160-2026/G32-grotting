# Story 3.10: Flag claims in the Letter that the CV doesn't support

## 2026-11-20 kl. 09:55 — Helise-26

### Oppgave
Implementere `_bmad-output/implementation-artifacts/spec-3-10-flag-claims-in-the-letter-that-the-cv-doesn-t-support.md`: integritetsvakten på brevet (FR-11, AD-14). Brevet sjekkes mot CV-en, og påstander CV-en ikke støtter flagges (Missing keyword, Upgrade word). Kun flagging, aldri fjerning eller omskriving.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-10-flag-claims-in-the-letter-that-the-cv-doesn-t-support.md` (eneste kilde) og `epic-3-context.md`.
- `integrity/core`: `checkLetter` og `UPGRADE_WORDS`. Planted brev. Kontrakter. Server-funksjon og rute. `segmentLetter`. UI (liste, understreking, varsel ved mislykket sjekk). Skjemaet kobles til. Meldinger, tester og QA-rader.

### Resultat
Alt er ukommittert i arbeidskopien (bare denne loggen og `issues.md` committes av skillen). Nye og endrede filer:
- `src/modules/integrity/core/check-letter.ts` (+ test), `word-lists.ts` (`UPGRADE_WORDS`: forsket, ledet, ansvarlig for, publiserte, grunnla), `index.ts`.
- `data/fixtures/_planted/letter-flags.json`: brev for Example-paret med «TypeScript» to ganger, «ledet», tittel, arbeidsgiver og `{{SIGNATUR}}`. Leses bare av tester.
- `src/modules/letter/contracts.ts` (+ `contracts.test.ts` med typetest mot `LetterFlag`): `letterFlagSchema`, `letterCheckRequestSchema` (`letter.rev` må være lik `letterRev`, ellers `INVALID_INPUT` på feltet `letterRev`, tekst maks 20 000 tegn, `gaps` er `z.null()`), `letterCheckSchema`.
- `src/modules/application/server/check-letter.ts` (`checkLetterFor`: fase 1 på nytt, fingeravtrykk, `checkLetter`), eksport i `application/index.ts`.
- `src/app/api/analyses/[id]/letter-check/route.ts` (+ `route.test.ts`): tynn rute, ingen AI, 409 `ANALYSIS_STALE`.
- `src/modules/letter/core/segment-letter.ts` (+ test).
- `src/modules/letter/ui/`: `letter-flags.tsx` (liste, understreket ord, varsel), `request-letter-check.ts` (+ test), `letter-view.tsx`, `letter-section.tsx`, `index.ts`, `letter-flags.test.ts`.
- `src/modules/application/ui/application-form.tsx`: sjekk-tilstand, `useEffect` per ankommet brev, sekvens-ref og vist rev, «Sjekk igjen»; felles `adoptRerun` hentet ut av `runLetter`.
- `src/shared/ui/messages.nb.ts` (`letter.check`), `e2e/letter-check.spec.ts` (12 tester), `docs/qa/letter-manual-checks.md` (rad 14 til 17).

Verifisert: `npx biome check` rent, `npx tsc --noEmit` rent, `npx vitest run` 1009 grønne lokalt, `npx playwright test` 194 grønne lokalt, og `docker compose run --rm --build test` kjørt på grenen `story/3.10-flag-claims-in-the-letter` (exit 0, 91 testfiler og 1015 tester, 194 e2e; story-en legger til filer under `data/`).
Funn: de tre Cached Letters til Example-paret gir null flagg (testet). Stammene til «ansvar» og «ansvarlig» er ulike i Snowball («ansv» mot «ansvar»), så «ansvar for» i CV-en fjerner ikke flagget på «ansvarlig for» i brevet; beholdt, siden `sameWord` er den ene dommeren (AD-5).

### Åpne punkter
- Fyll ut rad 14 til 17 i `docs/qa/letter-manual-checks.md` (skjermleser ved flaggliste, lenke fra ord til linje, mislykket sjekk, «Sjekk igjen»).
- EXPERIENCE.md spesifiserer ingen live-region-linje for flagg eller for en mislykket automatisk sjekk; ingenting leses opp (utfallet av «Sjekk igjen» leses i andre region). Bekreft med Helene/UX at det er riktig.
- Epic 4: `checkLetter` tar `gaps: null` nå og må lempes slik at Rewordable gaps som består siteringssjekken slipper gjennom; kontrakten `gaps: z.null()` utvides da.
- «ansvar for» i CV-en fjerner ikke flagget på «ansvarlig for» (ulike stammer); vurder å fjerne «ansvarlig for» fra `UPGRADE_WORDS` hvis det gir støy.
