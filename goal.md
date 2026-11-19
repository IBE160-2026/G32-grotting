Bygg Epic 3 fra Story 3.6 til og med 3.11 autonomt, én story om gangen, med bmad-build-auto. Ingen menneske i løkka.

Regler per story:

- Hver story bygges av en blokkerende underagent som kjører skillen 'bmad-build-auto'.
- Start fra ren, oppdatert `main`. Lag en gren `story/<id>-<slug>`, og bygg storyen etter spec og
  akseptkriterier i `_bmad-output/planning-artifacts/epics.md`.
- Kjør `npm test` og `npm run typecheck`. Rører storyen `package.json`, lockfila, `Dockerfile` eller `data/`, kjør også `docker compose run --rm --build test`; den er done-kriteriet.
- Push, åpne PR, og merge når `ci` er grønn. Har `ci` feilet, rett og push på nytt. Maks 3 forsøk, deretter stopp og skriv det til `.logs/helise-26/issues.md`.
- Etter hver merge: oppdater `sprint-status.yaml`, bruk `sesjonslogg` (logg + `issues.md`, commit), og gå til neste story fra `main`.

Harde grenser:

- Ikke deploy til, eller endre variabler/innstillinger på, Hosted (Vercel). Hosted er frosset (D23, valg a, `main: false` i `vercel.json`). Aldri sett `AI_*`, `FEATURE_*` eller `ENCRYPTION_KEY` der.
- Aldri skriv ut, logg eller commit innholdet i `.env` eller API-nøkkelen.
- Live KI-kall bare der en story krever å ta opp svar. Hold deg under OpenRouter-grensen (20
  USD/måned, ca. 0,31 USD brukt). Bruk cachede svar og Test mode ellers.
- Ingen `--no-verify`, ingen force-push til `main`, ingen skippede eller slettede tester for
  grønt.

Story 3.6: KI-varselet må navngi OpenRouter og modellverten (Google Vertex eller Amazon Bedrock). Før
inn Helenes bekreftelse 2026-11-19 (prompt logging og use of inputs/outputs er av) i         `docs/qa/ai-provider-terms.md`.

Stopp-regel: Møter du et steg bare et menneske kan gjøre (ekte telefon, skjermleser, §9.2-sjekklisten, kontoer eller hemmeligheter jeg ikke har), eller en blokkering du ikke løser på 3 forsøk eller en tjeneste utenom live KI-kall som krever betaling, så skriv det til `.logs/helise-26/issues.md` med story-id og hva som trengs, og gå videre til neste story som ikke avhenger av det. Gjenstår bare avhengige stories, avslutt rent.

Ferdig når 3.6 til 3.11 er merget til `main` og `ci` er grønn, eller når alt som gjenstår er blokkert og dokumentert i `issues.md`. Story 3.12 er en human gate: ikke start den, men skriv hva som gjenstår.
