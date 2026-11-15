# Grenbeskyttelse som konvensjon

## 2026-11-15 kl. 13:39 — Helise-26

### Oppgave
Helene spurte om grenbeskyttelsen av `main` (`docs/qa/branch-protection.md`) kan holdes som en konvensjon i stedet for at GitHub-repoet endres. Svaret var ja, og hun ba om at dokumentet ble oppdatert og at saken ble ført i `issues.md`.

### Plan
- Lese `docs/qa/branch-protection.md`; kontoen har `push` men ikke `admin` (sjekket 2026-11-14, se [story-1-4-ci-on-pull-requests](984-2026-11-14-21-34-19-story-1-4-ci-on-pull-requests.md)).
- Skrive om dokumentet: status som beslutning, konvensjonen som konkrete regler, hva konvensjonen ikke gir, og GitHub-regelen som valgfritt steg senere.
- Lukke det gamle punktet i `issues.md` og føre gapet mot NFR-10 som nytt åpent punkt.

### Resultat
- `docs/qa/branch-protection.md` er skrevet om (ukommittert, hører til koden, ikke loggcommiten): status «kept as a convention», regler (aldri push direkte til `main`, ingen force-push eller sletting, arbeid på `story/...`-gren med PR, merge bare når `ci` er grønn), hva konvensjonen ikke gir (GitHub stopper hverken direkte push eller merge på rød `ci`), og GitHub-regelen beholdt som valgfritt steg med avkrysningsboks.
- `issues.md`: det gamle punktet om at en admin må sette regelen er lukket (erstattet), og et nytt åpent punkt fører gapet mot NFR-10.
- `issues.md` hadde tre linjer (72–74) lagret i Windows-1252 i stedet for UTF-8 (æøå ble `�`). De er konvertert til UTF-8. Loggfila til story 1.4 har samme feil på to linjer (26–27, «Oppfølging»-seksjonen); den er ikke rettet her.

### Åpne punkter
- NFR-10 (`main` bare grønn kode) holdes bare som konvensjon; GitHub håndhever det ikke. Sett regelen hvis noen med admin-rett dukker opp.
- Loggfila til story 1.4 har to linjer i feil tegnkoding (26–27); konverter fra Windows-1252 til UTF-8.
