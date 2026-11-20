# Story 4.1: klassifiser hvert Missing keyword på serveren

## 2026-11-20 kl. 18:00 — Helise-26

### Oppgave
Autonom kjøring (`goal.md`) av Epic 4, Story 4.1 til 4.3, én story om gangen med `bmad-build-auto` i en blokkerende underagent. Dette er 4.1: ruta `POST /api/analyses/[id]/gaps` som dømmer hvert Missing keyword mot CV-en.

### Plan
- Forutsetninger sjekket: rent tre på `main`, PR #71 merget, 3.1–3.12 `done`, 4.1–4.3 `backlog`.
- Gren `story/4.1-classify-each-missing-keyword-on-the-server`, `epic-4: in-progress` i `sprint-status.yaml`.
- Spec: `_bmad-output/implementation-artifacts/spec-4-1-classify-each-missing-keyword-on-the-server.md`.

### Resultat
- Commit `23d9183` (merget som PR #72, `ci` grønn på 7m26s). `npm test` og `npm run typecheck` grønne lokalt (Vitest 1155 bestått, 2 forventet feil; Playwright 201). Docker-testen ble ikke kjørt: `package.json`, lockfila, `Dockerfile` og `data/` er ikke rørt.
- Ny modul `src/modules/gaps/` (`contracts.ts`, `index.ts`, `server/analyse.ts`, `server/prompts/gaps.ts`, tester), `src/app/api/analyses/[id]/gaps/route.ts`, malen `REAL_GAP` i `messages.nb.ts`. `PROMPT_VERSION` er `gaps-1`.
- Ruta: ett `runAi`-kall, `maxDuration = 120`, `NOT_FOUND` uten KI-kall når `features.gaps` er av, `ANALYSIS_STALE` ved ulikt fingeravtrykk. Ett `Gap` per Missing keyword i rekkefølge, ekstra elementer droppes, hoppet over blir mal-Real gap.
- Avvik fra AC (bevisst): uten Missing keywords gjøres ingen KI-forespørsel (svar `{ gaps: [], meta: null }`); `suggestion` er alltid `null` og leser ikke `features.rewording` (Epic 5 legger forslaget til).
- `FEATURE_GAPS` er ikke slått på i `FEATURE_DEFAULTS`, `compose.yaml`, `.env.example` eller README.
- Review: fire review-underagenter kjørte, 6 rettelser ført i spec-ens Review Triage Log, ett funn utsatt. Implementeringen var inline (underagenten kunne ikke starte en egen implementeringsagent).
- Ingen live KI-kall. Hosted er ikke rørt.

### Åpne punkter
- Story 4.2: FR-15 etter `structureGaps` (`checkCitation` mot `sentCvText`), pluss telling av nedgraderinger i loggen.
- Story 4.3: Gaps-forespørsel i Test mode svarer `TEST_MODE_UNAVAILABLE` til den cachede adapteren kan slå opp `gaps.json` på Gaps-nøkkelen.
- Story 4.6 og 4.5: se `issues.md`.
