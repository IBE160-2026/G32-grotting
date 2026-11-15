# Story 1.5: accessible shell

## 2026-11-15 kl. 14:15 — Helise-26

### Oppgave
Bygge story 1.5 («Show every page in the JobAssistant look, with an accessible shell») med `bmad-build`: designtokens, fonter, rotlayout med hopp-lenke og landemerker, RunMode, app-bar, knapp og lenke, og Ikke funnet-siden.

### Plan
- Spec skrevet til [spec-1-5-…](../../_bmad-output/implementation-artifacts/spec-1-5-show-every-page-in-the-jobassistant-look-with-an-accessible.md) (rute `dispatch`, ingen åpne spørsmål, full spec godkjent selv om den er ca. 2 400 tokens).
- Bygget direkte i hovedsesjonen (som story 1.4) på grenen `story/1.5-accessible-shell`.
- Tre uavhengige reviewere (Blind Hunter, Edge Case Hunter, Verification Gap) kjørt som subagenter etter at Helene sa ja; funn triagert i spec-ens Review Triage Log.

### Resultat
- Kode (commit 49ef9d0): `globals.css` med alle DESIGN.md-tokens som `@theme`, `max-640`-variant og redusert bevegelse; tre `next/font/google`-fonter; `layout.tsx` med hopp-lenke, header, main, to live-regioner, `connection()` og RunMode; `app-bar`, `button`, `link`, `nav-items`, `announce`, `run-mode`, `page-title`, `messages.nb.ts`; `not-found.tsx`; `shared/server/run-mode.ts`; `@axe-core/playwright` 4.14.0 (fast).
- Spec, triage, utsatt arbeid og sprint-status (commit 82069c1). Story 1-5 står som `review` i `sprint-status.yaml`, spec som `done`.
- Verifisert: `npm test` på vertsmaskinen og `docker compose run --rm --build test` (120 enhetstester, 1 hoppet over = DESIGN.md-sammenligningen som ikke kan kjøre i Docker, 20 Playwright-tester inkl. axe ved 1280 px og 360 px, ingen sideveis scroll ved 320 px). Så skjermbilder ved 1280 px og 360 px.
- Review: 20 funn, 7 rettet i storyen (blant annet menyen lukkes ved navigasjon, `toRunMode` som ren funksjon med test, tester for fokusring og redusert bevegelse), 3 utsatt, resten avvist med grunn.
- Avvik fra Code Map: sidetitler bygges med `pageTitle()` fordi Next ikke bruker layoutens `title.template` på siden i samme segment.
- Jeg måtte starte Docker Desktop selv (daemonen kjørte ikke).
- Ikke pushet, ingen PR ennå (grenen `story/1.5-accessible-shell`).

### Åpne punkter
- «Søknad» i menyen peker på `/soknad`, som viser Ikke funnet til story 1.9 lager siden.
- `announce()` sier ikke samme tekst to ganger på rad; første story som kaller den må tømme og sette teksten i neste ramme, med test.
- Ingen `error.tsx`/`global-error.tsx`: en render- eller konfigfeil viser Nexts standardside uten skallet.
- Fokus flyttes ikke til toppen og ingenting leses opp etter klientnavigasjon (UX-DR20-klausul); sjekk i tastaturgjennomgangen i story 7.2.
- Hver ny side må kalle `pageTitle()` selv (1.6 Tilgangskode, 1.8 Hjem, 1.9 Søknad); glemmer en den, blir tittelen bare «JobAssistant».
- Ikke verifisert: ekte telefon, skjermleser, hostet bygg. `next build` henter fontene fra Google, så bygg uten nett feiler.
