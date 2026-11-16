# Story 1.9: Enter the job ad, job title and employer on Søknad

## 2026-11-16 kl. 15:09 — Helise-26

### Oppgave
Bygge story 1.9 med `bmad-build`: Søknad-siden med skjemaet «Ny søknad» (Stillingstittel, Arbeidsgiver, Stillingsannonse), felles zod-skjema, norske feilmeldinger, `ja.session.v1` og `applicationId` ved gyldig innsending (FR-4, NFR-5, NFR-7, AD-6, AD-8, AD-16, UX-DR9, UX-DR18, UX-DR36).

### Plan
- Ny gren `story/1.9-enter-job-ad-on-soknad` fra `main` (grenen sto først på `story/2.1-…`; `answer-key.json` fra 2.1 ble liggende urørt og ucommittet).
- Spec: `_bmad-output/implementation-artifacts/spec-1-9-enter-the-job-ad-job-title-and-employer-on-soknad.md`, godkjent som «Approve and continue».
- Implementert direkte i hovedsesjonen (som 1.4–1.7), deretter tre uavhengige reviewere (Blind Hunter, Edge Case Hunter, Verification Gap) og triage.

### Resultat
- Commit `da02b07` på `story/1.9-enter-job-ad-on-soknad` (lokal, ikke pushet).
- Nytt: `src/app/soknad/page.tsx`, `src/modules/application/{contracts.ts, ui/}`, `src/shared/ui/client-session.ts`, `src/shared/ui/components/catalogue-heading.tsx`, `TextArea` i `text-field.tsx` (delt `Field`), `src/shared/core/format-count.ts`, tekster i `messages.nb.ts`, `e2e/application.spec.ts`.
- Verifisert på verten: Biome, typecheck, Vitest (180) og Playwright (51, 12 nye) består, også etter review-patchen.
- Review: 24 funn, ett patchet (`readSession` returnerer nytt tomt objekt), resten avvist med begrunnelse i spec-ens Review Triage Log. Ingenting utsatt til `deferred-work.md`.
- Beslutninger: gyldig innsending viser ingenting og sender ingen forespørsel; `AnalysisInputs` har bare jobbfeltene til 1.10 legger til `cvText`; `applicationId` fjernes ved enhver endring av jobbfeltene.
- Sprint-status: `1-9-…` satt til `review`.

### Åpne punkter
- `docker compose run --rm --build test` er ikke kjørt: Docker Desktop kjørte ikke. Kjør den før PR.
- Valider-ved-blur flytter send-knappen ned når et feltfeil dukker opp, så et museklikk som startet på knappen kan bomme. Skjemaet er ugyldig da uansett, så harmen er liten (UX-DR9 krever blur-validering).
- Skjemaet fylles fra `sessionStorage` etter mount; skriver man før det, overskrives teksten. Vurder en løsning om det viser seg på treg telefon (story 7.2).
- Når send-steget kobles til analysen (Epic 3): behold `applicationId` i minnet hvis `sessionStorage` er blokkert, og la skjemaet normalisere CRLF også på serveren.
- Ikke verifisert: ekte telefon og skjermleser på Søknad.
- Gren `story/1.9-…` er ikke pushet og har ingen PR ennå.
