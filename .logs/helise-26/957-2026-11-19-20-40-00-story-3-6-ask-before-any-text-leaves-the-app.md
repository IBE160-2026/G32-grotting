# Story 3.6: Spør før noen tekst forlater appen

## 2026-11-19 kl. 20:40 — Helise-26

### Oppgave
Bygg story 3.6 («Ask before any text leaves the app») autonomt via `bmad-build-auto`: KI-varselet skal vises før fase 1 når Test mode er av, og nevne både OpenRouter og modellverten (Google Vertex eller Amazon Bedrock). I tillegg: føre Helenes bekreftelse av 2026-11-19 (prompt logging og bruk av input/output er AV i OpenRouter) inn i `docs/qa/ai-provider-terms.md`, fylle FR-24-raden i `docs/qa/` med det som kan sies sant, og fylle plassholderne `{leverandør}`/`{periode}`.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-6-ask-before-any-text-leaves-the-app.md` (skrevet i hovedøkten, ingen åpne spørsmål).
- Bygget direkte i hovedøkten (ingen implementeringssubagent); review med fire subagenter (Blind Hunter, Edge Case Hunter, Verification Gap, Intent Alignment), patcher i hovedøkten.
- Ikke `provider.only`: adapteret har ingen innstilling for det, og feil leverandør-slug ville slått av live KI uten at det kan testes uten betalt kall. Varselet nevner derfor begge mulige verter.
- Branch `story/3.6-ask-before-any-text-leaves-the-app`, PR #52, merge etter grønn CI. Denne loggen og sprint-status på `chore/log-3.6`.

### Resultat
- Ny delt `src/shared/ui/components/dialog.tsx` (native `<dialog>`, `showModal()`, fokus på tittelen, Esc = Avbryt, scrim-klikk gjør ingenting, fokus tilbake til send-knappen, `onClose` synkroniserer hvis nettleseren lukker selv ved dobbel Esc).
- Ny `src/modules/ai/ui/` (`ai-notice.tsx`, `notice-consent.ts` med `noticeRequired` og `consentFor`, `index.ts`). `application-form.tsx` åpner varselet før fase 1; «Godta og fortsett» lagrer `noticeVersion` i `ja.session.v1` og sender; «Avbryt»/Esc beholder alt og sender ingenting. Test mode viser aldri varselet.
- Tekst i `messages.nb.ts` (`aiNotice`): OpenRouter + «Google (Vertex AI) eller Amazon (Bedrock)», ikke Anthropic. Slettetid «så snart svaret er skrevet» (også ved `AI_RETENTION_DAYS=0`) når `AI_RETENTION_DAYS` er satt til null/ikke satt, ellers «senest etter N dager». Versjonsprefiks i `config.ts` bumpet til `notice-2`.
- `playwright.config.ts` fikk en tredje server (port 3102) med live-innstillinger og en oppdiktet nøkkel (`e2e-not-a-real-key`); ingen forespørsel når en leverandør. `e2e/ai-notice.spec.ts` (8 tester: åpner før fase 1, fokus, felle, scrim, Avbryt, Esc, Godta én gang, axe ved 1280/360 px, Test mode viser ikke varselet).
- Dokumentasjon: `docs/qa/ai-provider-terms.md` (Helenes bekreftelse 2026-11-19 ordrett, tre rader og «Hva som gjenstår» oppdatert, varselavsnittet omskrevet); ny `docs/qa/ai-notice-manual-checks.md` (rad 1 = FR-24-ordlyd mot vilkårene: delvis, stemmer for OpenRouter, vertens vilkår ikke lest; rad 2 til 5 ubesvart, trenger Helene); EXPERIENCE.md «AI notice body» med plassholderne fylt (mockups/ hadde ingen plassholdere; bare `.working/concepts` har dem).
- Verifisert: `npx biome check`, `npm run typecheck`, `npx vitest run` (78 filer, 917 bestått, 2 forventet feil), `npm test` inkl. Playwright (129 bestått). CI `ci` grønn (5 min 10 s). Ingen endring i package.json, lockfil, Dockerfile eller `data/`, så `docker compose run --rm --build test` er ikke kjørt (ikke påkrevd her).
- Review: 4 patcher (onClose-synk, retention 0, Esc-test sjekker input og `noticeVersion`, fjernet tom assert), resten avvist med begrunnelse i triage-loggen i spec-fila. Merget som PR #52 (merge-commit 9a5525b). Hosted ikke rørt.
- Lukket fra issues.md: Helenes bekreftelse av prompt logging/use of inputs inn i `ai-provider-terms.md`; manuelle rader i `test-mode-manual-checks.md` (er fylt ut i commit ccb7892).

### Åpne punkter
- Fyll ut rad 2 til 5 i `docs/qa/ai-notice-manual-checks.md` (skjermleser, fokusfelle/Esc/scrim, 360 px, bare spurt én gang per fane).
- FR-24-raden er delvis: Helene må bekrefte ordlyden, og Googles og Amazons vilkår, lagring og behandlingsregion for API-et er ikke lest (varselets «sletter så snart svaret er skrevet» hviler på OpenRouters ZDR-liste for dem).
- Story 3.7: bruk `consentFor(runMode, readSession().noticeVersion)` til å sende `consent: { noticeVersion }` i fase 2-forespørselen; ingen kaller finnes ennå. Vis også ny forespørsel om varselet hvis serveren svarer `AI_NOTICE_REQUIRED` (utdatert RunMode midt i økten).
- Varselteksten nevner bare søknadsbrevet. Epic 4 (gapanalyse) og story 3.11 (annonsen sendes for nøkkelord) må endre teksten og bumpe versjonsprefikset i `config.ts`.
- PRD FR-24 og §8.1 sier fortsatt «the AI provider» i entall; ikke avstemt mot ruta med to selskaper (PRD er ikke endret i 3.6). `provider.only`-låsing av verten er ikke gjort (se Plan).
