# Reconciliation — color/theme history (color-themes-1.html → color-themes-4.html)

This file originally reconciled a single decision (the dark "Violet Precision" pick from `color-themes-1.html`). That decision was later fully reversed. This version documents the complete history across all four working theme files, ending in the current, final pick.

## 1. Original decision — dark "Violet Precision" (`color-themes-1.html`)

Of five accent-theme variations drafted in `.working/color-themes-1.html`, **Theme 4, "Violet Precision"** (register: "technical and precise — analytical, almost clinical") was selected, per the memlog: *"Color theme picked: Violet Precision (technical/precise register, indigo-violet #8B7CF6 accent, near-black #0A0A0A background, #F5F5F5 text)."*

Its exact tokens as documented in that file: background `#0A0A0A`, surface (card) `#141220`, text `#F5F5F5`, text-secondary `#A5A1B5`, border/divider `#262238`, accent/primary `#8B7CF6` (accent-strong `#AEA3FA`, accent bg tint `#8B7CF61F`), success/match-strong `#34D399` (bg `#34D3991A`, border `#34D39940`), and warning/match-weak `#FBBF24` (bg `#FBBF241A`, border `#FBBF2440`). These values were carried directly into `DESIGN.md`'s `colors` frontmatter at the time, paired with a "dark mode only, no light mode" product decision and a "professional and sharp, almost clinical" brand mood.

The other four candidates in that file — Theme 1 "Cobalt Confidence" (blue, corporate), Theme 2 "Amber Signal" (warm amber, mentor-toned), Theme 3 "Monochrome + Crimson" (grayscale + red accent), and Theme 5 "Rust Drive" (orange, energetic) — were considered side-by-side and not used.

**This entire decision was later reversed** (see §2–4 below). It is preserved here only as history; none of its values are current.

## 2. Beige exploration and the reversal (`color-themes-2.html`)

`.working/color-themes-2.html` was built as a **pure exploration**, explicitly not a proposal to switch: it reproduced the confirmed dark Violet Precision theme unchanged alongside four new light, beige-based registers, so warm-light and dark-technical could be compared directly before deciding whether beige was worth pursuing:

1. **Paper Precision** — beige field, ink/steel-blue accent (`#33475B`) — "professional and sharp, warmth kept to a minimum."
2. **Warm Editorial** — beige field, burnt-terracotta accent (`#C1662D`) — "genuinely warm — human and editorial, not sterile."
3. **Beige Noir** — beige field, charcoal/near-black accent (`#1C1815`) — "warm field, bold dark accent — contrast and seriousness."
4. **Beige Violet** — beige field, the original Violet Precision accent deepened for light-background contrast (`#7C6AE8`) — "the confirmed accent, transplanted onto a warm light base."
5. **Violet Precision (reproduced)** — the original dark theme, unchanged, for direct side-by-side comparison.

The user previewed this comparison and made the call logged in the memlog as an **override/REVERSAL**: *"abandoning the dark theme (black bg, Violet Precision accent, dark-mode-only) in favor of the light beige 'Warm Editorial' palette, with a pink accent instead of Warm Editorial's original terracotta/orange."* This also reopened the brand-mood decision — the register shifted from "professional and sharp, almost clinical" to warm/editorial/human.

So from `color-themes-2.html`, JobAssistant kept: the beige/cream base (background, surface, text, text-secondary, border) from the **Warm Editorial** register — but not that register's original terracotta/orange accent, since the user asked for pink instead.

## 3. Pink accent exploration — not chosen (`color-themes-3.html`)

`.working/color-themes-3.html` kept the exact Warm Editorial base (background, surface, text, text-secondary, border) and the same success/warning/error semantics, and swapped only the accent family to pink, per the user's stated preference for "more pink than orange." Three pink registers were shown:

1. **Dusty Rose** (`#A6677A`) — muted, desaturated, mature, not candy-colored.
2. **Warm Coral-Pink** (`#E8637F`) — punchier, warmer, leaning coral/salmon.
3. **Berry/Magenta-Pink** (`#A62D6B`) — deeper, saturated, bold "brand statement" pink.

The memlog records this exploration (*"Also exploring a brown/mocha accent... as an alternative to pink, before final accent decision"*) but the pink family was ultimately **not chosen** — the team moved to a brown/mocha accent exploration instead, and the final decision (§4) went brown, not pink. None of the three pink tones above are current.

## 4. Brown/mocha accent exploration and the final pick (`color-themes-4.html`)

`.working/color-themes-4.html` again kept the exact Warm Editorial base and the same success/error semantics, and swapped the accent family to brown/mocha, shown in two registers:

1. **Light Caramel** (`#BA8A4E`, accent-strong `#DCB27C`, accent-text `#FFF9F0`) — lighter, warmer tan/caramel; softer and more approachable, sits closer to the beige base tonally.
2. **Rich Mocha** (`#6B4226`, accent-strong `#96603A`, accent-text `#FFF6EE`) — deeper, richer mocha/espresso; more saturated and grounded, reads as "serious"/coffee-toned, with higher contrast against the light beige base.

Because brown and amber/gold sit close together in hue, `warning` was deliberately re-tuned on this page: instead of the burnt amber-orange used on earlier pages (~25° hue), warning here is a punchier, more saturated goldenrod (~43° hue, much higher saturation, lower lightness — `#B8860B`) that reads unmistakably as "gold/yellow caution," not as a third brown. Success stayed a green family (`#4C7A3F`) and error stayed a clear red (`#A8341F`), both already far enough in hue from any brown to never be confused with the accent.

**FINAL color/theme decision, per the memlog:** *"beige 'Warm Editorial' light theme (bg #F2E4CF, surface #FAF1E1, text #3A2A1D, text-secondary #8A7157, border #E0CBA8) with 'Rich Mocha' brown accent (#6B4226, accent-strong #96603A), success green #4C7A3F, warning goldenrod #B8860B, error red #A8341F, from .working/color-themes-4.html. This fully replaces the earlier dark Violet Precision theme and the 'dark mode only' decision — JobAssistant is now a single light theme, no dark mode. Brand mood shifts from 'professional and sharp/technical/clinical' to warm/editorial/human, per the Warm Editorial register the user picked."*

Rich Mocha (not Light Caramel) is the chosen accent tone. Exact tokens now carried in `DESIGN.md`'s `colors` frontmatter:

| Token | Value |
|---|---|
| background | `#F2E4CF` |
| surface | `#FAF1E1` |
| text | `#3A2A1D` |
| text-secondary | `#8A7157` |
| border | `#E0CBA8` |
| accent | `#6B4226` |
| accent-strong | `#96603A` |
| accent-text | `#FFF6EE` |
| accent-bg | `#6B42261F` |
| success | `#4C7A3F` |
| success-bg | `#4C7A3F1A` |
| success-border | `#4C7A3F40` |
| warning | `#B8860B` |
| warning-bg | `#B8860B1F` |
| warning-border | `#B8860B45` |
| error | `#A8341F` |
| error-bg | `#A8341F1A` |
| error-border | `#A8341F40` |

## Summary — what's current vs. historical

- **Current:** `color-themes-4.html`'s "Rich Mocha" tokens (table above). Single light theme, no dark mode, no mode toggle. Brand mood: warm, editorial, human — grounded, not "clinical."
- **Historical, superseded:** the dark "Violet Precision" theme (`color-themes-1.html`), the beige base's original terracotta/orange accent (`color-themes-2.html`'s Warm Editorial), and all three pink accent tones (`color-themes-3.html`), plus the "Light Caramel" alternative brown tone (`color-themes-4.html`, not chosen).
- The beige/cream **base** tokens (background/surface/text/text-secondary/border) have been stable since `color-themes-2.html`'s Warm Editorial register and were never revisited — only the **accent** (and, once, the warning re-tuning) changed across files 2 → 3 → 4.
