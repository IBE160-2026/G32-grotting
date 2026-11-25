# Student-sider no-store og flaky journey-test

## 2026-11-25 kl. 17:50 — Helise-26

### Oppgave
Helene ba om å starte med den lille rettingen fra Epic 6-retroen: `Cache-Control: no-store` på Student-sidene (punkt 1) og den flaky axe-testen i `e2e/account-journey.spec.ts` (punkt 3).

### Plan
- Ny gren `fix/student-pages-no-store` fra `main`.
- Skrive en e2e-test av svarhodene på `/soknad`, `/profil`, `/historikk` og `/konto` og av Tilbake etter utlogging, for å se hva som mangler.
- Rette den flaky testen med `toHaveTitle` før axe.

### Resultat
- **Retroens funn 6 var feil.** Testen viste at alle fire Student-sidene allerede svarer med `Cache-Control` som inneholder `no-store` (Next setter det på dynamiske sider). Retroen hadde tolket et `grep` som bare fant API-rutene som «sidene mangler det». Ingen kodeendring trengtes; retroen (`epic-6-retro-2026-11-25.md`, funn 6 og tiltak 1, 3, 7, 10, verdikt og åpne spørsmål) er rettet.
- Ny `e2e/student-pages-cache.spec.ts` (5 tester): svarhodet på de fire sidene, og Tilbake etter «Logg ut» fra Historikk → Konto ender på Logg inn uten Student-innhold. Konto er erstattet i historikken av utloggingen, så testen går via Historikk.
- `e2e/account-journey.spec.ts`: `toHaveTitle("Lagret søknad – JobAssistant")` før axe på «the saved Application».
- `biome check` (465 filer) ren; `account-journey` og `student-pages-cache` kjørt: 9 bestått (feilen i retroen kom ikke tilbake).
- Ikke committet på grenen: de to spec-filene, retroen og `sprint-status.yaml` (retro-oppføringene 20 og 22 i `action_items` står fortsatt `open`; sett dem `done` når grenen er merget). Ikke kjørt: full `npm test`, Docker-testen.

### Åpne punkter
- Commit, PR og merge av grenen `fix/student-pages-no-store` venter på Helene.
- `action_items` `epic-6-retro-item-20-…` og `epic-6-retro-item-22-…` settes `done` etter merge.
