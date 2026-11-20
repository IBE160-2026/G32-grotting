Bygg Epic 4 fra Story 4.1 til og med 4.3 autonomt, én story om gangen, med bmad-build-auto. Ingen menneske i løkka.

Forutsetninger (sjekk først. Stemmer noe ikke, stopp og skriv det til `.logs/helise-26/issues.md`):

- Arbeidstreet er rent og du står på ren, oppdatert `main`. Grenen `docs/checkpoint-uj1-result` (Story 3.12 done, UJ-1-resultatet) skal være merget til `main` først.
- `sprint-status.yaml` viser 3.1 til 3.12 som `done` og 4.1 til 4.3 som `backlog`.

Regler per story:

- Hver story bygges av en blokkerende underagent som kjører skillen 'bmad-build-auto'.
- Start fra ren, oppdatert `main`. Lag en gren `story/<id>-<slug>`, og bygg storyen etter spec og
  akseptkriterier i `_bmad-output/planning-artifacts/epics.md` (Epic 4).
- Rekkefølge: 4.1, 4.2, 4.3. 4.2 bygger på 4.1, og 4.3 bygger på begge. Stories i Epic 4 bygges bak `FEATURE_GAPS`, som er av til Story 4.6. Testene setter flagget på eksplisitt. Ikke slå det på i `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` eller README.
- Kjør `npm test` og `npm run typecheck`. Rører storyen `package.json`, lockfila, `Dockerfile` eller `data/`, kjør også `docker compose run --rm --build test`; den er done-kriteriet. 4.3 skriver `data/fixtures/*/cached/gaps.json`, så der kjøres den alltid.
- Push, åpne PR, og merge når `ci` er grønn. Har `ci` feilet, rett og push på nytt. Maks 3 forsøk, deretter stopp og skriv det til `.logs/helise-26/issues.md`.
- Etter hver merge: oppdater `sprint-status.yaml` (`epic-4: in-progress` når første story starter), bruk `sesjonslogg` (logg + `issues.md`, commit), og gå til neste story fra `main`.

Harde grenser:

- Ikke deploy til, eller endre variabler/innstillinger på, Hosted (Vercel). Hosted er frosset (D23, valg a, `main: false` i `vercel.json`). Aldri sett `AI_*`, `FEATURE_*` eller `ENCRYPTION_KEY` der.
- Aldri skriv ut, logg eller commit innholdet i `.env` eller API-nøkkelen.
- Live KI-kall bare i Story 4.3, som tar opp `gaps.json` for hver av de fire Fixturene (`example-nordic-digital`, `held-out-regnskap-kvale`, `nursing-sarvurdering`, `two-column-fjord-analytics`): én forespørsel per Fixture, ingen gjentak. Hold deg under OpenRouter-grensen (20 USD/måned, ca. 0,45 USD brukt per 2026-11-20). Les forbruket tilbake fra OpenRouter etter innspillingen og skriv det i loggen. Bruk cachede svar og Test mode ellers.
- Gaps-prompten (`PROMPT_VERSION`) er låst når 4.3 har tatt opp svarene: en endring krever ny versjon og nye betalte innspillinger, og CI feiler hvis Example-parets cachede `promptVersion` ikke stemmer. Foreslå ikke prompt-endringer i 4.3 for å få grønt; skriv ønsket endring til `issues.md`.
- Ingen `--no-verify`, ingen force-push til `main`, ingen skippede eller slettede tester for
  grønt.

Per story:

- 4.1: ruta `POST /api/analyses/[id]/gaps` gjør nøyaktig ett `runAi`-kall, `maxDuration = 120`, og svarer `NOT_FOUND` uten KI-kall når `features.gaps` er av. `suggestion` er `null` mens `features.rewording` er av.
- 4.2: `canonVerbatim` ignorerer bare store/små bokstaver og mellomrom, aldri løsere. Ikke løsne siteringssjekken for å få grønt. `cvEntries` er den eneste CV-oppføringsdeleren i koden.
- 4.3: `scripts/qa-compare.ts` skal rapportere G2-feil (må-aldri-foreslås-ord som ble Rewordable). Finner den en, ikke endre Answer key eller prompten for å få den bort; skriv funnet til `issues.md` med Fixture og nøkkelord. Fixture-testene sjekker én Gap per Missing keyword, at hver Rewordable-sitering består FR-15, og at ingen av Answer keyens må-aldri-være-Rewordable er Rewordable.

Overleveringer til senere stories (skriv til `issues.md`, ikke bygg nå):

- Story 4.6 setter `FEATURE_DEFAULTS.gaps = true`. `config.ts` tvinger `keywordFallback` av på Hosted men ikke `gaps`; 4.6 må også tvinge `gaps` av når `APP_ENV=hosted` (Hosted har ingen KI, D23), med test.
- Story 4.5 må utvide `gaps: z.null()` i `letterCheckRequestSchema` og lempe `checkLetter` for Rewordable gaps (fra 3.10).

Stopp-regel: Møter du et steg bare et menneske kan gjøre (ekte telefon, skjermleser, §9.2-sjekklisten, kontoer eller hemmeligheter jeg ikke har), eller en blokkering du ikke løser på 3 forsøk eller en tjeneste utenom live KI-kall som krever betaling, så skriv det til `.logs/helise-26/issues.md` med story-id og hva som trengs, og gå videre til neste story som ikke avhenger av det. Gjenstår bare avhengige stories, avslutt rent.

Ferdig når 4.1 til 4.3 er merget til `main` og `ci` er grønn, eller når alt som gjenstår er blokkert og dokumentert i `issues.md`. Ikke start Story 4.4 eller senere.
