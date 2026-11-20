Bygg Epic 4 fra Story 4.4 til og med 4.6 autonomt, én story om gangen, med bmad-build-auto. Ingen menneske i løkka.

Forutsetninger (sjekk først. Stemmer noe ikke, stopp og skriv det til `.logs/helise-26/issues.md`):

- Arbeidstreet er rent og du står på ren, oppdatert `main`.
- `sprint-status.yaml` viser 4.1 til 4.3 som `done` og 4.4 til 4.6 som `backlog`, og `epic-4` som `in-progress`.

Regler per story:

- Hver story bygges av en blokkerende underagent som kjører skillen 'bmad-build-auto'.
- Start fra ren, oppdatert `main`. Lag en gren `story/<id>-<slug>`, og bygg storyen etter spec og
  akseptkriterier i `_bmad-output/planning-artifacts/epics.md` (Epic 4). Les også `_bmad-output/implementation-artifacts/epic-4-context.md`.
- Rekkefølge: 4.4, 4.5, 4.6. 4.5 trenger Gaps-settle-tilstanden i Søknad fra 4.4. 4.6 kommer sist og slår flagget på. Til 4.6 er `FEATURE_GAPS` av som standard, og testene setter det på eksplisitt. Ikke slå det på i `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` eller README før 4.6.
- Kjør `npm test` og `npm run typecheck`. Rører storyen `package.json`, lockfila, `Dockerfile` eller `data/`, kjør også `docker compose run --rm --build test`; den er done-kriteriet. Playwright-testene i 4.4 og 4.6 er en del av `npm test`.
- Push, åpne PR, og merge når `ci` er grønn. Har `ci` feilet, rett og push på nytt. Maks 3 forsøk, deretter stopp og skriv det til `.logs/helise-26/issues.md`.
- Etter hver merge: oppdater `sprint-status.yaml` (`epic-4` forblir `in-progress` til 4.6 er `done`), bruk `sesjonslogg` (logg + `issues.md`, commit), og gå til neste story fra `main`.

Regler til underagenten (ta dem ordrett inn i prompten for hver story):

- Aldri kjør `git checkout -- .`, `git reset --hard` eller andre kommandoer som kaster uncommittede endringer. I 4.4 gikk uncommittede endringer tapt slik.
- Underagenten kjører ikke `sesjonslogg` og skriver eller committer ingen fil i `.logs/`. Det gjør hovedløkka. Er den blokkert, kan den legge en ukommittet linje i `.logs/helise-26/issues.md`.
- `sprint-status.yaml` (storyen satt til `done`, `epic-<n>` uendret) ligger i samme PR som storyen, ikke i en oppfølger-PR.
- Underagenten venter til `ci` er ferdig (`gh pr checks --watch`) før den merger og før den svarer. Den kommer ikke tilbake mens `ci` fortsatt kjører.
- Reviewlagene i `bmad-build-auto` kjøres ikke i bakgrunnen: vent på alle fire før triage.

Harde grenser:

- Ikke deploy til, eller endre variabler/innstillinger på, Hosted (Vercel). Hosted er frosset (D23, valg a, `main: false` i `vercel.json`). Aldri sett `AI_*`, `FEATURE_*` eller `ENCRYPTION_KEY` der.
- Aldri skriv ut, logg eller commit innholdet i `.env` eller API-nøkkelen.
- Ingen live KI-kall i noen av 4.4–4.6. Bruk cachede svar og Test mode. Den ene live Fixture-kjøringen i 4.6 gjør Helene selv (se under).
- Gaps-prompten (`PROMPT_VERSION`) og de innspilte `data/fixtures/*/cached/gaps.json` er låst: en endring krever ny versjon og nye betalte innspillinger, og CI feiler hvis Example-parets cachede `promptVersion` ikke stemmer. Ikke rør dem. Foreslå ikke prompt-endringer for å få grønt; skriv ønsket endring til `issues.md`.
- Ikke løsne `canonVerbatim`/`checkCitation` eller andre integritetssjekker for å få grønt.
- Ingen `--no-verify`, ingen force-push til `main`, ingen skippede eller slettede tester for
  grønt.

Per story:

- 4.4: `src/modules/gaps/ui/{gap-entry, no-copy-note}` eksportert gjennom `gaps/ui/index.ts`, Gaps-mutasjonen i fase 2, og «Se gapanalysen»-lenka på hver Missing-oppføring. `match` importerer aldri `gaps`: lenkemålet sendes inn fra Søknad-komposisjonen og utvider `match/ui` keyword entry med et valgfritt lenkemål. `Gap.explanation` er `{ text }` eller `{ key: "REAL_GAP", params }`; UI mapper nøkkelen via `messages.gaps.template`, og responsens `meta` kan være `null`. En nedgradert eller hoppet over Gap viser bare mal-linja for Reelt gap. Rewordable-gap viser aldri noe kopierbart (`suggestion` er `null` til Epic 5). Alle tekster står ordrett som i akseptkriteriene (norske strenger, `h2`/`h3`, strips, live region sier fase-2-linja én gang). Gaps-feil, tidsavbrudd, tak og Test mode behandles som Letter-seksjonen, og skåren og brevet påvirkes ikke.
- 4.5: utvid `gaps: z.null()` i `letterCheckRequestSchema` og `checkLetter` (fra 3.10) slik at et Missing-ord i brevet som er en Rewordable gap hvis sitering består `checkCitation` på nytt på serveren, ikke flagges; alle andre Missing-ord i brevet er fortsatt Unsupported claim. Klienten sender `/letter-check` når brevet har kommet og Gaps har settlet (med Gaps, eller `gaps: null` hvis Gaps feilet), med gjeldende `letterRev` og `gapsRev`, sender på nytt etter vellykket Gaps-retry og «Lag nytt utkast», og forkaster resultater der revs ikke stemmer. `cvEntries` er fortsatt den eneste CV-oppføringsdeleren i koden. FR-11-testene bruker plantede Cached-svar: bestått sitering ikke flagget, samme ord med feilende sitering flagget, Real-gap-ord, Upgrade-ord og jobbtittel som i 3.10.
- 4.6: sett `FEATURE_DEFAULTS.gaps = true`. `config.ts` tvinger `keywordFallback` av på Hosted men ikke `gaps`; tving også `gaps` av når `APP_ENV=hosted` (Hosted har ingen KI, D23), med test. Ingen `FEATURE_GAPS` i `compose.yaml`, `.env.example` eller README. Playwright: UJ-1 med Example-paret i Test mode viser Gapanalysen med Rewordable og Real gaps, «Se gapanalysen» flytter fokus, og axe-skanningen består. Test mode-standardflyten (lagret KI-liste) har andre Missing-ord enn Answer key-lista for 3 av 4 Fixtures, så de blir mal-Reelt gap (se forventet feil i `test/gaps-test-mode.test.ts`). Dekk Example-paret fullt; for de andre tre, ikke spill inn på nytt og ikke endre cachen, og skriv avviket til `issues.md`.
- 4.6 menneskesjekken: «Helene sjekker Gaps for hånd mot én live Fixture» (G1, G2, G3, G5 i `docs/qa/` med dato) kan ikke gjøres av deg. Lag `docs/qa/gaps-manual-checks.md` etter mønsteret i `letter-manual-checks.md` med radene G1, G2, G3 og G5 som `ikke kjørt`, uten å fylle ut resultater eller datoer. Inkluder de to kjente funnene fra 4.3 (Example «responsive nettsider»-sitatet stopper midt i setningen; nursing «legemiddelhåndtering» siterer å følge med) som ting å se på, og at `npm run qa:compare -- --dir <mappe>` skal kjøres på ferske live-svar. Skriv dette til `issues.md` som åpent punkt for Helene. Story 4.6 kan merges med koden ferdig og denne raden åpen; marker den ikke som kjørt.

Stopp-regel: Møter du et steg bare et menneske kan gjøre (ekte telefon, skjermleser, §9.2-sjekklisten, live Fixture-kjøring, kontoer eller hemmeligheter jeg ikke har), eller en blokkering du ikke løser på 3 forsøk eller en tjeneste som krever betaling, så skriv det til `.logs/helise-26/issues.md` med story-id og hva som trengs, og gå videre til neste story som ikke avhenger av det. Gjenstår bare avhengige stories, avslutt rent.

Ferdig når 4.4 til 4.6 er merget til `main` og `ci` er grønn (med menneskesjekken i 4.6 dokumentert som åpen), eller når alt som gjenstår er blokkert og dokumentert i `issues.md`. Ikke start Epic 5 eller senere.
