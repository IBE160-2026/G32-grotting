# Design-detector findings on the 10 concept sketches (2026-11-09)

From `impeccable detect` on `.working/concepts/` once all ten were finished: 116 anti-patterns + 23 advisory notes. These were **left unfixed on purpose**. The sketches are for choosing a direction, and most will be dropped. Fix these when the chosen concept is refined into the key-screen mocks.

## Real problems (fix in the chosen concept)

| Concept | Finding |
|---|---|
| 01 Rettet prøve | Grey text #959aa3 on paper is 2.7:1 (needs 4.5:1), 6 places |
| 03 Turkart | Skipped heading levels (h2 → h4) in the Refleksjonsnotat |
| 04 Kvittering | Kicker labels above the h1 on the auth screens («NY KONTO», «INNLOGGING», «STENGT KOPI»); h1 → h3 in Historikk; 0.06–0.08em letter-spacing on body text |
| 05 Riso-plakat | Fluoro pink #ff48b0 used as text on paper, 2.8:1 (16 places); line-height 1.24 |
| 06 Klarspråk | h1 → h3; looping animation on the progress bar (needs to respect reduced motion); yellow focus ring flagged as a «glow», kept on purpose by the agent |
| 07 Katalogkort | #67796f on cabinet green is 2.7:1 |
| 09 Rutenett | Blue #1f4fc4 hover text on black is 2.8:1 |
| 10 Signal | #4b4a48 and #383835 on black are 2.2:1 and 1.7:1 (check whether this is decorative plot text or readable text); looping scan animation |
| several | «Kubernetes» repeated 3× inside one panel (keyword list, gap and ad line). Partly intended by the brief, but review when distilling. |

## Likely false positives (from how the sketch board is built)

- `cramped-padding` on `.screen` / `.frame` / `.paper`: the sketch-board frames put the app's own full-width header flush against the frame edge on purpose.
- `nested-cards`: the screen frames wrap app cards. Some nesting inside the app itself (receipt slips, catalogue cards, acetate leaves) is part of a concept, so judge it per concept.
- `cream-palette` (07, 08), `repeating-stripes-gradient`, `overused-font` (Space Grotesk, 09): taste flags to weigh against each concept's world, not floor failures.

Verification gaps the agents reported: several did not check their 360 px frames or their later screens by eye (02, 03, 06, 09, 10), only in the code.
