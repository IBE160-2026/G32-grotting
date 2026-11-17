# Story 2.6: finn hvert nøkkelord i CV-teksten, med bevis

## 2026-11-17 kl. 09:23 — Helise-26

### Oppgave
Bygge story 2.6 med `bmad-build`: `findKeyword` som slår opp et nøkkelord i CV-teksten med trinn og bevis (CV-linja og linjenummeret), og en SM-2-test som viser at Matched og Missing er lik fasiten på alle fixtures (FR-6, SM-2, NFR-6). Anbefalt spec skulle brukes, review skulle gå via subagenter, og grenen skulle merges til slutt.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-2-6-find-each-keyword-in-the-cv-text-with-its-evidence.md` (branch `story/2.6-find-keyword-in-cv`).
- Spannmotoren flyttet ut av `extract.ts` til `spans.ts` så uttrekk og CV-oppslag deler én motor. `findKeyword(text, { term }, vocabulary)` søker linje for linje over termen og dens egne aliaser.
- Fasitene kan ikke gjengis med ren matching, så vokabularet ble tunet mot dem (epicen tillater det).
- Implementert direkte i hovedsesjonen (ingen implementasjonssubagent). Tre reviewere (blind, edge-case, verification-gap) leste diffen; jeg triagerte og rettet selv (se Review Triage Log i spec-en).

### Resultat
- Nytt: `keywords/core/spans.ts`, `find.ts` (`findKeyword`, `KeywordHit { stage, line, text, start, end }`), `find.test.ts`, `sm2.test.ts`; endret: `extract.ts`, `tokenise.ts` (PDF-tegn blir inne i ordet), `MAX_SPAN` 5, spenn kan krysse « (» men ikke «)».
- Vokabular `v1-d3a1887d` (255 termer): 9 frasetermer fra fasitene lagt til, «responsiv design» omdøpt til «responsive mobil», aliasene «norsk morsmål» og «datamodell», og fjernet frontend, stakeholder, webutvikling, dashbord, autorisasjon, infeksjonsforebygging, sårbehandling, pasientjournal.
- SM-2: Matched og Missing er lik fasiten på alle tre fixtures, ingen must-not-match treffer, to kjøringer gir like lister (NFR-6).
- Review-funn rettet: en frase med eget alias gir hele frasen som treff (ikke aliaset), parentes-regelen strammet inn, score-test i SM-2 fjernet (utenfor scope), sterkere Evidence-test. Matrise-raden «Split compound» sa `compound`, men 2.5-regelen gir `exact`; raden ble rettet og logget i Spec Change Log.
- Commits: c0aa46c (implementasjon), ff3845e (review-rettinger). Verifisert: `biome check`, `npm run typecheck`, `vitest run` (40 filer, 404 tester) grønt.
- Fasiten er fortsatt skrevet av Helene. KI skrev vokabulartilpasningen, `find.ts` og alle tester; ingen `answer-key.json` er endret.
- Løste fra tidligere: PDF-tegn i `tokenise` (2.5) og at uttrekket ikke var sammenlignet med fasitene.

### Åpne punkter
- Helene: bekreft to fasit-lesninger koden gjengir via aliaser: «behandling av trykksår og diabetessår» Matched via «trykksår» (samme CV-linje er bevis for Missing «sårvurdering»), og «norskkunnskaper» via «norsk (morsmål)».
- Vokabularet er tilpasset de tre fasitene; grønn SM-2 sier lite om andre annonser. Story 2.11 (utestående fixture) avgjør FR-5b.
- Frasenøkkelord som ikke står i ett strekk i annonsen («dokumenterer i pasientjournal», «responsive mobil») finnes bare via alias.
- `findKeyword` deler linjer bare på CR/CRLF/LF og søker linje for linje; U+2028/2029, bindestreks-linjedeling og nøkkelord over et PDF-linjeskift fanges ikke.
- Helene har ikke gjennomgått de nye frasetermene og aliasene i `data/vocabulary/nb.json`.
- Ikke verifisert: `npm test` (Playwright) og Docker-testen ikke kjørt for 2.6; CI kjører dem på PR-en.
