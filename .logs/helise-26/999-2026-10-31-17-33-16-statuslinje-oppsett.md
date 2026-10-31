# Statuslinje-oppsett

## 2026-10-31 kl. 17:33 — Helise-26

### Oppgave
Sette opp Claude Code-statuslinjen (`/statusline`). Det finnes ingen PS1 på Windows, så brukeren valgte standardoppsettet: modellnavn, mappe og hvor mye av kontekstvinduet som er brukt (%).

### Plan
- statusline-setup-agenten fant en eksisterende statuslinje i `~/.claude/settings.json` som peker på `~/.claude/statusline-command.sh`, og la til `ctx: NN%`.
- Testkjøring viste at `jq` ikke er installert, så modellnavn og ctx ble aldri vist.
- Byttet alle `jq`-kallene ut med ett `node`-kall som leser JSON-en.

### Resultat
- `~/.claude/statusline-command.sh` (utenfor repoet) bruker nå node i stedet for jq. Backup ligger i `~/.claude/statusline-command.sh.bak`.
- Testet med eksempel-JSON. Utdata: `JobAssistant main Opus ctx: 42%`. Med tom JSON vises bare mappenavnet.
- Git-gren og 5t/7d-bruksgrenser fra det gamle skriptet er beholdt.
- `settings.json` er ikke endret.

### Åpne punkter
Ingen.
