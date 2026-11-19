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

## 2026-11-18 kl. 14:20 — Helise-26

### Oppgave
Legge til OpenRouter som tredje live-leverandør (og som tredje kandidat i bake-offen), slik at én OpenRouter-nøkkel kan brukes. Merge når ferdig.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-3b-add-openrouter-as-a-third-live-provider.md`, branch `story/3.3b-openrouter-third-provider`.
- Subagent bygde; tre reviewere; tre patcher.

### Resultat
- Commit c966872. `@openrouter/ai-sdk-provider@3.1.0` (festet, ingen egne avhengigheter). `AI_PROVIDER=openrouter` i `live.ts`; hver forespørsel sender `provider: { data_collection: "deny", zdr: true }`, testet mot forespørselskroppen via standardoppkoblingen (en mutasjon som fjerner feltene feiler testen).
- `scripts/bake-off.ts`: tredje kandidat bare når `BAKE_OFF_OPENROUTER_KEY` er satt (modell eller pris uten nøkkel er brukerfeil); uten OpenRouter-innstillinger er det som før (16 forespørsler, ellers 24).
- Vilkårsfil og runbook utvidet (OpenRouter er en ruter, så modell-leverandøren er en ekstra databehandler; modell uten ZDR-endepunkt gir `HTTP_404`; ikke slå på `AI_PROVIDER=openrouter` før varselet navngir begge).
- Verifisert: biome, typecheck, vitest (63 filer, 710 bestått, 2 forventet feil), `db:check`, `--dry`.

### Åpne punkter
- Om OpenRouter vinner: varselteksten (Story 3.6) må navngi både OpenRouter og modell-leverandøren, og PRD §8.1 må avklares (står i `deferred-work.md`).
- Det er ikke bevist at OpenRouter godtar `data_collection` + `zdr` for modellen du velger; det vises først ved første betalte kjøring.
- OpenRouters vilkår (DPA, oppbevaring, DPF, underleverandører) er «not verified» i `docs/qa/ai-provider-terms.md`.

## 2026-11-18 kl. 14:44 — Helise-26

### Oppgave
Gjøre bake-off-scriptet i stand til å sammenligne flere modeller (Sonnet 5.5 og en OpenAI-modell) gjennom én OpenRouter-nøkkel. Merge når ferdig.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-3c-compare-several-models-through-one-openrouter-key.md`, branch `story/3.3c-bake-off-through-openrouter-models`. Subagent bygde, tre reviewere, tre patcher.

### Resultat
- Commit på branchen: «3.3: Compare several models through one OpenRouter key». Alle kandidater er valgfrie; `BAKE_OFF_OPENROUTER_MODELS` (kommaseparert) erstatter `BAKE_OFF_OPENROUTER_MODEL`; hver modell er egen kandidat (`openrouter:<modell>`) med egen mappe, resultat og pris (`--price-in openrouter:<modell>=<usd>`). Modell uten nøkkel, nøkkel uten modell og mappekollisjon (også store/små bokstaver) er brukerfeil.
- Runbook har Bash- og PowerShell-eksempel for Sonnet 5.5 + én OpenAI-modell. `anthropic/claude-sonnet-5.5` er bekreftet i OpenRouters modellliste 2026-11-18.
- Verifisert: biome, typecheck, vitest (721 bestått, 2 forventet feil), `db:check`, `--dry`.

### Åpne punkter
- Velg OpenAI-modellen på openrouter.ai/models (f.eks. `openai/gpt-5.6-terra` ligger nærmest Sonnet i pris) og kjør bake-offen etter runbooken.
- Det er fortsatt ikke bevist at OpenRouter godtar `zdr` + `data_collection: deny` for de valgte modellene; `HTTP_404` betyr da at modellen mangler ZDR-endepunkt (eller feil id).

## 2026-11-18 kl. 15:47 — Helise-26

### Oppgave
Kjøre bake-offen (Sonnet 5.5 og gpt-5.6 terra gjennom OpenRouter), få utkast til poengsetting, velge Sonnet og registrere valget. Merge når ferdig.

### Plan
- Bake-offen kjørte Helene selv (16 forespørsler, alle gikk gjennom). Claude gjorde mekaniske sjekker og et utkast til Pass/Fail i `docs/qa/bake-off/2026-11-18/results.md` (merket DRAFT).
- Valg: Sonnet 5.5 **gjennom OpenRouter** (ikke direkte). Spec: `spec-3-3d-record-the-provider-decision-and-drop-the-losing-packages.md`, branch `story/3.3d-record-the-provider-decision`; subagent bygde, tre reviewere, patcher.

### Resultat
- Commit på branchen: «3.3: Record Sonnet 5.5 through OpenRouter…». Beslutningen står i `docs/architecture.md`, PRD Open question 3 (løst 2026-11-18) og i `results.md`; tekstene sier hva som ikke er verifisert.
- `@ai-sdk/anthropic` og `@ai-sdk/openai` fjernet; `LIVE_PROVIDERS = ["openrouter"]`; bake-off-scriptet bare OpenRouter. README og `.env.example` sier at bare `AI_PROVIDER=openrouter` gjelder.
- Verifisert: biome, typecheck, vitest (714 bestått, 2 forventet feil), `db:check`, `--dry`.

### Åpne punkter
- Sett i `.env`: `AI_PROVIDER=openrouter`, `AI_MODEL=anthropic/claude-sonnet-5.5`, `AI_API_KEY`. `AI_RETENTION_DAYS` venter til oppbevaringen er verifisert (ikke gjett et tall).
- Bekreft i OpenRouter-dashbordet: månedlig grense (ca. 200 NOK) og «ZDR only».
- Verifiser OpenRouters vilkår (DPA, oppbevaring, DPF, underleverandører), hvilken vert som faktisk svarte (aktivitetsloggen), og vurder å låse oppstrøms med `provider.only`/`allow_fallbacks: false` — før Story 3.12 og sjekkpunktet 24. november. PRD §8.1 er ikke endret og ikke påstått oppfylt.
- Varselteksten (3.6) må navngi OpenRouter og verten; PRD FR-24 og §8.1 sier fortsatt «leverandøren» i entall.
- Pass/Fail-cellene i `results.md` er Claudes utkast, ikke gjennomgått celle for celle av Helene; naturlighet (L1, R3) er ikke bekreftet av en morsmålsbruker.

## 2026-11-18 kl. 16:35 — Helise-26

### Oppgave
Sjekke OpenRouters vilkår og Anthropics vilkår mot primærkilder, og oppdatere OpenRouter-radene i `docs/qa/ai-provider-terms.md`.

### Plan
- Lese OpenRouters Terms, Privacy, DPA, ZDR-dokumentasjon, datainnsamlingsside og Trust Portal; Anthropics Commercial Terms, DPA, personvernerklæring og oppbevaringsartikkel.
- Fylle radene som kunne leses på primærkilde, og la resten stå som «not verified».

### Resultat
- `docs/qa/ai-provider-terms.md` oppdatert (ukommittert endring i selve dokumentet): OpenRouter-radene for oppbevaring, DPA (gjelder alle kunder, SCC Modul 2, ingen signatur), overføringsgrunnlag (SCC, DPF nevnes ikke), underleverandører (fem navn, modellverter unntatt fra varsling) og to nye rader: EU-only-alternativet og «Which host serves the request». Anthropic-raden «No training» fikk Commercial Terms §B som kilde. Rapport og «What is left for Helene» oppdatert.
- Hovedfunn: OpenRouters ZDR-side sier at ZDR for Anthropic-gruppen «Removes first-party Anthropic endpoints (Bedrock and Vertex remain available)». Appen sender `zdr: true`, så teksten går trolig til Anthropic-modellen hostet av Amazon eller Google, ikke Anthropic selv. Det er en slutning fra dokumentasjonen, ikke observert i et svar.
- Anthropic direkte: ingen nye fakta utover det som lå der (30 dagers sletting, SCC, DPA inkorporert i Commercial Terms, trening forbudt i Commercial Terms §B); DPF-status uverifisert (kun tredjepartskilde sier «Active»).
- Ikke gjort: DPF-listen kunne ikke søkes herfra; dashbordinnstillinger (grense, «ZDR only») kan bare sjekkes av Helene.

### Åpne punkter
- Bekreft vert (Bedrock/Vertex/Anthropic) og les vertens vilkår; navngi den i varselet (3.6).
- DPF-søk for OpenRouter og Anthropic; PRD §8.1 må sannsynligvis godta SCC.
- Hele underleverandørlisten (Trust Portal) og EU-alternativet (DPA Exhibit A).
- Dashbordinnstillinger (månedlig grense, «ZDR only») er fortsatt ubekreftet.

## 2026-11-18 kl. 17:05 — Helise-26

### Oppgave
Helene søkte selv på DPF-lista: Anthropic og OpenAI står ikke der. Endre PRD §8.1 til å godta Standard Contractual Clauses.

### Plan
- Gjøre endringen som arkitektur- og PRD-notatene 2026-11-08 og 2026-11-14 hadde planlagt, og føre den i PRD-ets memlog (U25).
- Holde det smalt: §8.1, Open question 3, frontmatter og de to dokumentene som gjentar teksten.

### Resultat
- `prd.md`: §8.1-punktet om overføring godtar nå DPF-liste eller SCC i leverandørens DPA, for alle selskaper som mottar teksten (ruter og vert); Open question 3 har nytt avsnitt «Transfer basis, 2026-11-18»; `updated: 2026-11-18`. `.memlog.md`: U25. `docs/architecture.md` seksjon 4 og `docs/qa/ai-provider-terms.md` (DPF-radene for Anthropic, OpenAI og OpenRouter, og «What is left») justert.
- §8.1 er fortsatt **ikke** påstått oppfylt: verten og dens vilkår er ikke verifisert. OpenRouters SCC er lest på primærkilde; DPF-søk for OpenRouter ble ikke gjort.
- Ingen D-rad i §11: briefen nevnte aldri DPF, så ingenting avviker fra den.
- Endringene (PRD, memlog, architecture.md, terms-dokumentet) er **ukommitterte**; bare loggfila og `issues.md` er committet.

### Åpne punkter
- Les PRD-endringen og godkjenn teksten.
- Søk «OpenRouter» og verten på DPF-lista (ikke blokkerende).
- Verten og dens vilkår, hele underleverandørlisten og dashbordinnstillingene gjenstår som før.

## 2026-11-18 kl. 17:20 — Helise-26

### Oppgave
Helene bekreftet i OpenRouter-dashbordet at månedlig grense er satt og at «ZDR only» er på. Oppdatere dokumentene.

### Plan
- Rette de fire stedene som sa «ikke bekreftet»: terms-dokumentet (Paid tier, ZDR, «What is left»), runbook steg 1, `docs/architecture.md` seksjon 4 (kostnad) og `issues.md`.

### Resultat
- Rader og tekster oppdatert med «Helene bekreftet i dashbordet 2026-11-18». Beløpet på grensen er ikke notert. Endringene er ukommitterte (som PRD-endringene fra tidligere i økten); bare loggfila og `issues.md` er committet.

### Åpne punkter
- Sjekk at prompt-logging og «use of inputs/outputs» er av i OpenRouter-dashbordet.

## 2026-11-18 kl. 17:45 — Helise-26

### Oppgave
Finne hvilken vert som svarer på Sonnet 5.5 gjennom OpenRouter, og føre funnene i dokumentene.

### Plan
- Lese OpenRouters offentlige endepunktlister (modellens endepunkter og ZDR-lista); oppdatere terms-dokumentet, `docs/architecture.md`, PRD Open question 3 og `issues.md`.

### Resultat
- Fem verter serverer modellen; bare Google Vertex (`google-vertex/global`) og Amazon Bedrock står på ZDR-lista (begge uten Safety Retention, samme pris). Med `zdr: true` svarer altså Google eller Amazon, ikke Anthropic. Hvilken av dem som svarte på de 16 bake-off-forespørslene er ikke notert; regionen er ikke verifisert, så EØS-preferansen i §8.1 er ikke vist for denne ruta.
- Dokumentene oppdatert (ukommitterte, som tidligere i økten); bare loggfila og `issues.md` er committet.

### Åpne punkter
- Les Google Vertex og Amazon Bedrock sine vilkår, SCC/DPF og region; navngi begge i varselet (3.6).
- Sjekk Activity-siden i OpenRouter; vurder `provider.only`.

## 2026-11-19 kl. 17:26 — Helise-26

### Oppgave
Kjøre kodegjennomgang (`bmad-code-review`) av Story 3.3 og delstoryene 3.3b, 3.3c og 3.3d, og kjøre Docker-testen fra Epic 2-retroen.

### Plan
- Sprintstatus (`bmad-sprint-planning status`): 3.3 sto som `review`, mens alle fire spec-filene var `done`.
- Diff `e37ac19..HEAD` uten `.logs/` og de genererte bake-off-utdataene i `docs/qa/bake-off/` (3382 linjer, 29 filer); fire reviewere (Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor mot spec 3.3, 3.3b–d).
- Triage, så anvende alle patcher (valg 1 både på diff-omfanget og på «Apply every patch»).

### Resultat
- `docker compose run --rm --build test` på main: exit 0, 63 testfiler / 713 tester (2 expected fail, 1 hoppet over), 120 e2e grønne.
- Review: 1 decision-needed (Helene valgte 1: godta og dokumenter), 3 patcher, 2 defer, 8 avvist. Funnene står i `### Review Findings` i `spec-3-3-pick-the-ai-provider-in-a-bake-off.md`; utsettelsene i `deferred-work.md`.
- Patch 1: begrensningene i modellvalget (lettere Gap-oppgave med fasitens nøkkelord, bare tonen Formell, Claude som poengsetter, ingen stikkprøve for hånd) lagt til i `results.md` (Decision) og `docs/architecture.md` seksjon 4.
- Patch 2: dokumentene rettet: verten er Google Vertex eller Amazon Bedrock, ikke Anthropic (runbook trinn 7–8 og innledning, architecture seksjon 4, terms-fila, PRD Open question 3); varselet (3.6) skal navngi OpenRouter, Google og Amazon; runbook sier nå at §8.1 er endret til å godta SCC, men ikke oppfylt.
- Patch 3: ny test i `scripts/bake-off.test.ts` som kjører `runBakeOff` uten injisert adapter og sjekker at hver kandidat sender sin egen modell og nøkkel. Mutasjonssjekk: med fast `model` i `defaultAdapterFor` feilet testen; filen er gjenopprettet.
- Etter patchene: `npx biome check`, `npm run typecheck` og `npx vitest run` grønne (63 filer, 715 tester). Docker-testen er ikke kjørt på nytt etter patchene.
- `sprint-status.yaml`: 3-3 satt til `done` (validert med `sprint_plan.py validate`). 3.3b, 3.3c og 3.3d har ikke egne nøkler der.
- Docker-punktene fra tidligere stories (1.8, 2.6, 2.7, 2.10, 2.11) lukket i `issues.md`; 2.5, 2.8, 2.9 og retro-punktet delvis.
- Senere samme dag: Helene leste Pass/Fail-utkastet (punktet i `issues.md` lukket). Retro-punkt 5 fra Epic 2 lukket: regelen om Docker-testen for stories som endrer Dockerfile, avhengigheter eller `data/` lagt i `epic-3-context.md`; action item 5 satt til `done` i `sprint-status.yaml` med `sprint_status.py update --set-action-status`; retro-dokumentets oppfølging oppdatert.
- Helene sa at hun står inne for hver celle. `DRAFT` fjernet fra de 96 cellene i `results.md` (Pass 81, Check 5, Fail 2, n/a 8) uten å endre innholdet; overskrift og Decision-punkter, runbook trinn 6, architecture §4 og PRD (linje 893) sier nå at Claude utkastet og Helene bekreftet hver celle 2026-11-19. Begrensningen «ingen stikkprøve for hånd» er fjernet; de andre (lettere Gap-oppgave, bare Formell, Claude-familien) står. Hva hun eventuelt endret i cellene er ikke notert.
- Endringene i kode, dokumenter, PRD, spec og sprint-status er ukommitterte; bare loggfila og `issues.md` committes her. `issues.md` hadde allerede ukommitterte endringer fra før økten (30 linjer med `[x]` → `[X]` og tre lukkede punkter); de ble med i loggcommiten.

### Åpne punkter
- Ingen test sjekker bake-offens exit-kode ved brukerfeil (lagt i `issues.md` og `deferred-work.md`).
- Kjør Docker-testen på nytt etter at patchene er merget, eller la CI vise det.
- Ellers uendret: verifiser verten (Google/Amazon) og vilkårene, og gjør det før Story 3.6 og 3.12.

## 2026-11-19 kl. 17:31 — Helise-26

### Oppgave
Lese `issues.md` og sjekke KI-leverandørens vilkår (de åpne punktene fra bake-offen), så langt det lar seg gjøre fra primærkilder; deretter søke på DPF-lista og føre resultatet i vilkårsdokumentet og `issues.md`.

### Plan
- Lese hele `issues.md` (191 linjer) og `docs/qa/ai-provider-terms.md`.
- Websøk og oppslag for de åpne punktene: DPF-status for Google, Amazon og OpenRouter, vertens vilkår (Vertex, Bedrock), OpenRouters underleverandørliste og EU-alternativ.
- dataprivacyframework.gov/list er en JS-app uten innebygd søk for verktøyet; fant sidens egne offentlige søkekall (POST til `dpfapi.azurewebsites.net/api/participants`, samme kropp som siden sender) og søkte på hvert navn med status Active og Inactive.
- Føre resultatet i `docs/qa/ai-provider-terms.md` og `issues.md` (Helene ba om «record and tick»).

### Resultat
- DPF-lista (søkt 2026-11-19 av Claude): OpenRouter, Anthropic og OpenAI gir 0 treff (Active og Inactive). Google LLC er Active (EU–US, Swiss–US og UK Extension; HR og ikke-HR; omfang står bare som «See Purposes of Data Collection section»). Amazon.com, Inc. er Active (de tre rammeverkene, ikke-HR; dekker Amazon Web Services, Inc.).
- Øvrige funn (ikke ført som bekreftet): Googles egen side sier at Google LLC er DPF-sertifisert; Googles dokumentasjon sier at global endpoint kan behandle forespørsler hvor som helst (EØS-only er ikke vist for Vertex-ruten); Bedrock: bare sekundærkilder om retensjon og trening, EU-inferensprofiler holder seg i EU, standardprofilene kan behandle utenfor kilderegionen; OpenRouters underleverandørliste viser fortsatt bare fem navn; EU-ruting (`eu.openrouter.ai`) er dokumentert for Business- og Enterprise-planer, og om Sonnet 5.5 står på EU-lista er ikke verifisert.
- `docs/qa/ai-provider-terms.md`: DPF-raden for OpenRouter omskrevet med resultatet og kildene, «What is left for Helene» oppdatert (DPF søkt, Helene bekrefter på nettsiden og leser Googles omfangsoppføring; underleverandørliste og EU-alternativ fortsatt åpne; vertens DPF-status ferdig, region ikke).
- `issues.md`: punktet «søk OpenRouter (og verten) på dataprivacyframework.gov» lukket (`[X]`, løst 2026-11-19); notater lagt til på punktene om OpenRouter-vilkårene og om Vertex/Bedrock; nytt punkt for Heleles bekreftelse.
- Senere i økten: Helene sa at Google Vertex svarte på alle Sonnet-forespørslene i bake-offen. Ført i `docs/qa/ai-provider-terms.md` (rad «Which host serves the request», Decision og «What is left») som rapportert av Helene, ikke sett av Claude; punktet «verifiser OpenRouters vilkår og hvilken vert som svarte» lukket i `issues.md`, og punktet om Vertex og Bedrock oppdatert (Activity-siden sjekket, `provider.only` fortsatt åpent). `docs/architecture.md`, PRD, runbook og varselteksten sier fortsatt «Google eller Amazon»; ikke endret i denne økten.
- Arbeidskopien har mange andre ukommitterte endringer (`_bmad-output/`, `docs/architecture.md`, `docs/qa/bake-off*`, `scripts/bake-off.test.ts`, PRD, `AGENTS.md`) som ikke er fra denne økten; også endringen i `docs/qa/ai-provider-terms.md` er ukommittert. Bare loggfila og `issues.md` committes her.

### Åpne punkter
- Helene bekrefter DPF-oppslaget på nettsiden og leser Googles «Purposes of Data Collection»-oppføring (gjelder Google Cloud-kundedata?). Lagt i `issues.md`.
- Ellers uendret: full underleverandørliste, EU-alternativet, avgjørelsen om `provider.only` (uten den kan Bedrock fortsatt svare), og vertenes vilkår og region (Vertex global endpoint, Bedrock-region) før Story 3.6 og 3.12. Dokumentene som sier «Google eller Amazon» (architecture, PRD, runbook, varselet i 3.6) bør oppdateres når `provider.only` er avgjort.
