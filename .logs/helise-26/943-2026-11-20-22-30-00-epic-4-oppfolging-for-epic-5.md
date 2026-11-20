# Epic 4 oppfølging før Epic 5

## 2026-11-20 kl. 22:30 — Helise-26

### Oppgave
Lukke handlingspunktene fra Epic 4-retroen som skulle på plass før Epic 5.

### Plan
- Regler til underagenten i `goal.md`; EXPERIENCE.md og DESIGN.md rettet; valg for Gaps-innspillingen; splitt `application-form.tsx`.

### Resultat
- `goal.md`: blokken «Regler til underagenten» (commit 35e5871).
- EXPERIENCE.md (linje 223) og DESIGN.md (Gap entry): no-copy-noten vises ikke på mal-Reelt gap (1476359, 0900e94).
- Story 5.1 i `epics.md`: alternativ B, innspillingen spør om Answer-key-lista pluss appens Missing-liste, `it.fails` fjernes (9253e00).
- PR #79 merget (975d09c, `ci` grønn): `application-form.tsx` 1177 → ca. 520 linjer; fase 2 i `usePhaseTwo` (`use-phase-two.ts`, ca. 640 linjer), resultatvisning i `ResultView` (`result-view.tsx`). Ingen atferdsendring: `npm test` ga samme tall før og etter (Vitest 1291 + 3 forventet feil, Playwright 228).
- Retro-handlingspunktene 9, 10, 11 og 13 er `done` i `sprint-status.yaml`; tilsvarende linjer i `issues.md` er avkrysset.

### Åpne punkter
- Gjenstår fra retroen: G1/G2/G3/G5 (Helene), stale Gaps/Letter-respons og samtykke-test for Gaps (lav). Alt står allerede i `issues.md`.
- `use-phase-two.ts` er stor (ca. 640 linjer); kunne deles videre (sjekk, notice) hvis Epic 5 legger mer til.
