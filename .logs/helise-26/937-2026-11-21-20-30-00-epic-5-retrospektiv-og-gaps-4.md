# Epic 5-retrospektiv og gaps-4

## 2026-11-21 kl. 20:30 — Helise-26

### Oppgave
Kjør Epic 5-retroen (`bmad-retrospective`), og følg opp det Helene besluttet: godta accepted-with-open-items, endre Gaps-prompten (`gaps-4`) for å løfte G4, ta de fem handlingspunktene, bruke bullet-og-overskrift-heuristikken for CV-oppføringer, og sette `epic-4` til `done`.

### Plan
- Samle bevis (`git_evidence.py`, `qa:compare`, Vitest/`tsc`/Playwright på `main`), skrive retroen, la Helene bekrefte vurdering og punkter, oppdatere `sprint-status.yaml` med `sprint_status.py`.
- `gaps-4` bygget av én underagent (analyse av de seks G4-bommene, prompt gjennomgått før innspilling, én forespørsel per Fixture).
- Flaky-testen rettet av hovedløkka. Retro: `_bmad-output/implementation-artifacts/epic-5-retro-2026-11-21.md`.

### Resultat
- Retro ført som endelig, vurdering accepted-with-open-items (Helene bekreftet), seks handlingspunkter i `sprint-status.yaml`, `epic-5-retrospective` `done`. PR #88 (merge `f777d61`).
- `gaps-4` (PR #89, merge `ac4020d`, `ci` grønn): G4 9 av 15 (60 %) til 12 av 15 (80 %); G2 ren; 0 FR-15-nedgraderinger og 0 FR-17-forkastelser. Per Fixture: Example 3/3, held-out 4/4, nursing 4/7, two-column 1/1. Prompten: «judge by meaning»-regel (synonym, sammensatt ord, bøyning, norsk/engelsk, arbeidsgiverens ord) og strammet `real`; ingen Fixture-ord; ærlighetsreglene uendret. Fire live-kall, ett per Fixture, `maxRetries: 0`, alle lyktes. Handlingspunkt 19 `done`.
- Flaky-testen («drops a result for another Gap analysis rev», 4.5) rettet med `page.unrouteAll({ behavior: "ignoreErrors" })`: full Playwright 243 bestått uten feil (før: «Test ended», «1 did not run», exit 1). Handlingspunkt 14 `done`. `epic-4` satt til `done`. Beslutningen om CV-oppføringer ført i retroen. PR #90 (merge `b0094b0`): `gh pr checks --watch` fant ingen sjekker rett etter at PR-en ble åpnet, så den ble merget før `ci` hadde kjørt; `ci` ble grønn både på PR-en og på `main` etterpå, så ingenting ble merget rødt.
- Atferdssjekk i retroen: `tsc` og Vitest grønne (1 392 tester), Playwright 242 bestått + kjent flake (nå rettet), `qa:compare` G2 ren.
- Ikke gjort: Epic 4 punkt 8 er ikke satt til `done` (Helene har ikke bekreftet det); `scripts/qa-compare.ts` har fortsatt Helenes ukommitterte endring (to mellomrom i linje 1) som får Biome (og Docker-suiten) til å feile.

### Åpne punkter
- Helene: revert de to mellomrommene først i `scripts/qa-compare.ts` (ukommittert; Biome og `docker compose run --rm --build test` feiler til det er gjort).
- Dev loop: bygg CV-oppføringsgrensen (bullet-og-overskrift-heuristikken, Helenes beslutning 2026-11-21) i `cvEntries` som en egen story, med test på tekst uten blanke linjer; Fixture-CV-ene har ingen blanke linjer, så FR-17s Upgrade-sjekk ser hele CV-en som én oppføring.
- Helene: kjør den live sjekklista `docs/qa/rewording-manual-checks.md` (nå mot `gaps-4`) og ta beslutningen 3. desember; les spesielt forslagene for «årsavslutning» («Kjennskap til årsavslutning …» fra et kursemne), «mva-regelverket», «pull requests» (legger til «slått sammen i pull requests») og «stakeholders» under R1.
- Nursing bommer fortsatt på «smertelindring», «sårvurdering» og «infeksjonsforebygging» (G4 4 av 7); Answer key kan være romslig for «smertelindring» (smertekartlegging) og «årsavslutning» (kursemne); Helene avgjør om den skal revurderes.
- Helene: rett `goal.md`-malen (portflagget for Gaps på live-innstillings-serveren, og «kjør Docker/e2e først etter at de fire reviewlagene er ferdige»).
