# Running the stubbed failure checks (letter-manual-checks rows 8 to 17)

Rows 8 to 17 of `letter-manual-checks.md` need the Letter or the Letter check to fail on purpose. `scripts/qa-stub-proxy.ts` does that without touching the app: it sits in front of the running app, answers only `POST /api/analyses/*/letter` and `…/letter-check` itself while a mode is on, and passes everything else through. The real screens, live regions and focus handling are what the screen reader meets.

## Start it

1. Run the app in Test mode on the host. Set `TEST_MODE` yourself: with a key in `.env` the app would otherwise be live and spend money.
   `npm run build`, then in PowerShell `$env:TEST_MODE="true"; npm run serve` (port 3000).
2. In a second terminal: `npx tsx scripts/qa-stub-proxy.ts` (app on 3000, proxy on 3300; other ports as arguments).
3. Use `http://localhost:3300/` for the app and `http://localhost:3300/__stub` to switch mode. On a phone use `http://<laptop address>:3300/` (plain http: «Kopier» then falls back to selecting the text).

The control page has one radio button per mode and works with a screen reader. Switch the mode back to «Off» when you are done.

## Which mode for which row

| Rows | Mode | What it does | Notes |
| --- | --- | --- | --- |
| 8, 9 | The Letter request fails | 502 `AI_PROVIDER_ERROR`, retryable | Row 9: press «Prøv igjen» once while it is on, then switch to «Off» and press it again |
| 10 | The Letter request fails | same | First get a Letter with the mode off, then switch it on and press «Lag nytt utkast» |
| 11 | «Dagens grense» | 429 `DAILY_CAP_REACHED` | For the «Testmodus» variant, change one word in the ad with the mode off and press «Lag nytt utkast»: no stub needed |
| 12 | Asks for the AI notice, once | 403 `AI_NOTICE_REQUIRED` for the first request only | The dialog opens although this is Test mode, because the page acts on the answer. «Godta og fortsett» sends the request, which now passes through. For the «Avbryt» branch, switch the mode off and on again before the next try |
| 13 | none, see below | | |
| 14, 15 | The planted Letter | 200 with `data/fixtures/_planted/letter-flags.json`; the check is the real one | Flags «TypeScript» and «ledet» |
| 16, 17 | The Letter check fails | 500 on `…/letter-check`; the Letter itself is real | Row 17: switch to «Off», then press «Sjekk igjen» |

## Row 13: a changed vocabulary

The score only changes when the vocabulary does, so this row uses a real change.

1. Start the app with the Keyword fallback off, so the code-only list is used: `$env:TEST_MODE="true"; $env:FEATURE_KEYWORD_FALLBACK="false"; npm run serve`. The Example pair then reads «64 % samsvar – 9 av 14 nøkkelord».
2. Set the proxy mode to «The Letter request fails», fill in the example and submit. The score is read and the Letter fails.
3. In `data/vocabulary/nb.json` change `vocabularyVersion` to `"v1-00000013"` (it must be `v1-` and 8 hex digits) and delete `"Git",` from `terms`. The file is read on every request, so no restart is needed.
4. Switch the mode to «Off» and press «Prøv igjen».
5. Expected: the page shows «62 % samsvar – 8 av 13 nøkkelord», and the second live region reads «Samsvaret er oppdatert: 62 %, bør forbedres, 8 av 13 nøkkelord. Søknadsbrevet er klart.» once.
6. Restore the file: `git checkout data/vocabulary/nb.json`.

Checked on 2026-11-20 with a browser run against this proxy: modes 8 to 12 and 14 to 16 showed the texts the rows name, and the row 13 steps gave the 64 to 62 change and the line above. A screen reader and a person's judgement are still what the rows record.
