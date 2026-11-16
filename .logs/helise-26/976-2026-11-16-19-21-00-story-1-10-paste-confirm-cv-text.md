# Story 1.10: Paste and confirm the CV text on Søknad

## 2026-11-16 kl. 19:21 — Helise-26

### Oppgave
Bygge story 1.10 med `bmad-build`: CV-sporet øverst på Søknad med feltet «CV-tekst» (DM Mono), teller, «Bekreft CV-teksten», sammenfalt «CV-tekst bekreftet · N tegn» med vei tilbake, og sperre på innsending til teksten er bekreftet (FR-2, FR-3, NFR-5, AD-6, AD-16, UX-DR9, UX-DR26, UX-DR36). Før det: flytte seg fra den uferdige 2.2-grenen til en ny gren fra `main`.

### Plan
- Grenen sto på `story/2.2-nursing-fixture` (5 commits ikke i `main`), så jeg stoppet og spurte. Helene sa «merge story 2.2»: ventet på CI på PR #21, merget med merge-commit (`9dff2a6`, samme stil som tidligere PR-er), og satte lokal `main` til `origin/main` med `--ff-only`.
- Ny gren `story/1.10-paste-confirm-cv-text` fra `main`.
- Spec: `_bmad-output/implementation-artifacts/spec-1-10-paste-and-confirm-the-cv-text-on-soknad.md`, godkjent som «Approve and continue» (ca. 2 000 tokens, over 1 600-grensen; beholdt som én spec fordi det er ett mål).
- Implementert direkte i hovedsesjonen. Etter spørsmål og ja fra Helene ble tre uavhengige reviewere (Blind Hunter, Edge Case Hunter, Verification Gap) startet som subagenter, så triage og patcher i hovedsesjonen.

### Resultat
- Commit `889aca1` på `story/1.10-paste-confirm-cv-text` (lokal, ikke pushet).
- Nytt: `src/modules/cv/{contracts.ts, contracts.test.ts, ui/cv-input.tsx, ui/index.ts}`. Endret: `application/contracts.ts` (`cvText` i `AnalysisInputs`; `jobInputErrors` er nå `inputErrors`), `application-form.tsx`, `client-session.ts` (`cvText`, `cvDraft`), `messages.nb.ts` (nytt `cv`-avsnitt, `counter` løftet ut), `soknad/page.tsx`, `e2e/application.spec.ts` (skrevet om, 15 CV-relaterte tester).
- Lagring: `cvDraft` er teksten slik den er skrevet; `cvText` finnes bare mens den er bekreftet og lik utkastet. En redigering fjerner `cvText` og `applicationId`.
- Verifisert på verten: Biome, typecheck, Vitest (217) og Playwright (70) består. `docker compose run --rm --build test` er ikke kjørt.
- Feil funnet underveis: et museklikk på «Bekreft» gikk tapt når blur fjernet en feil og knappen flyttet seg (samme begrensning som i 1.9). Rettet med `onMouseDown` som hindrer blur. Ny e2e-test dekker det; den feiler når rettingen fjernes (sjekket).
- Review: 15 rader i spec-ens Review Triage Log. Tre patchet (ny test for museklikket, rettet kommentar i `blurCv`, 320 px-testen dekker nå sammenfalt CV-linje). Resten avvist med begrunnelse, flere med henvisning til 1.9-triagen. Ingenting utsatt til `deferred-work.md`.
- Beslutninger: knappen for å åpne igjen heter «Endre CV-teksten» (står ikke i UX-spekken); å åpne igjen fjerner ikke bekreftelsen, bare en endring gjør det; et ubekreftet utkast overlever også en oppdatering.
- Sprint-status: `1-10-…` satt til `review`. Story 2.2 er merget (PR #21).

### Åpne punkter
- `docker compose run --rm --build test` er ikke kjørt for story 1.10; kjør den før PR.
- «Endre CV-teksten» må inn i EXPERIENCE.md, Key strings (CV-radene), ellers står teksten bare i koden.
- Når innsendingen kobles til analysen (Epic 3): les det bekreftede `cvText`, aldri `cvDraft`. `restoreCv` fjerner ikke et foreldet `cvText` fra en håndredigert lagring.
- Feil på CV-feltet leses ikke opp ved blur (samme valg som for annonsefeltet i 1.9); «Bekreft» og innsending leser dem opp.
- Ikke verifisert: skjermleser og ekte telefon på CV-sporet (opplesing av «CV-tekst bekreftet · N tegn», fokus på «Endre CV-teksten»).
- Gren `story/1.10-paste-confirm-cv-text` er ikke pushet og har ingen PR ennå.
