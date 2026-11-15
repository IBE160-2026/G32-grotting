---
title: 'Story 1.5: Show every page in the JobAssistant look, with an accessible shell'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: 'a0d9d278b4c366f4cb093137502aea878da071d5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app has a bare `<html>`, a placeholder page and no design. There is no shared look, no landmarks or skip link, no navigation, no live regions and no Ikke funnet page, so every later screen would have to invent them.

**Approach:** Build the shell once: DESIGN.md tokens in `globals.css`, three fonts, a root layout with skip link, header, `<main>` and two live regions, RunMode sent to one client context, an app bar with mobile menu, shared button and link, and the Ikke funnet page. Covers NFR-1, NFR-2, NFR-3, FR-19, AD-4, UX-DR1–8, 19, 20, 45, 46.

## Boundaries & Constraints

**Always:**
- Branch `story/1.5-accessible-shell` off `main`. Commits cite `1.5` and the IDs. Stage by explicit path.
- Every UI string is in `src/shared/ui/messages.nb.ts` (bokmål, sources: EXPERIENCE.md Key strings). Components import it; no literal Norwegian elsewhere.
- Tokens come from DESIGN.md front matter as Tailwind v4 `@theme` variables (colours, spacing scale and named spacing, type roles with `-mobile` variants in `rem`, `rounded` 0). One theme, `color-scheme: dark`, no light variant. Custom variant `max-640` = `@media (max-width: 640px)`. Fonts: Schibsted Grotesk (variable), DM Mono (400, 500), Archivo (`wdth` axis) via `next/font/google`; Geist stays removed.
- Root layout: `<html lang="nb">`; order is skip link «Hopp til hovedinnholdet» → `<header>` (app bar) → `<main id="hovedinnhold" tabindex="-1">` → two empty polite live regions (`role="status"`, `aria-live="polite"`) outside the page content. The layout calls `await connection()`, then builds RunMode `{ testMode, hosted, features }` field by field from `getConfig()` (never a spread) into one client context. Title template «{side} – JobAssistant»; Hjem's title is «Hjem».
- `announce(region, text)` in `shared/ui` replaces the region's text, never appends.
- App bar: wordmark (amber pulse glyph + «JobAssistant», uppercased by CSS) and `<nav aria-label="Hovedmeny">` with «Hjem» · «Søknad»; `aria-current="page"` on the current one; static position. At ≤ 640 px a small button «Meny»/«Lukk» with `aria-expanded` and `aria-controls` opens full-width 56 px rows in the document flow; Esc closes and returns focus to it.
- Button variants: primary, secondary, small, disabled, busy (`aria-disabled="true"`, label kept, 18 px progress glyph, `cursor: progress`, click handler ignored). Link: real `<a href>`, always underlined (nav links exempt), standalone ≥ 24 px high. Controls ≥ 44 px (48 px standard). Focus ring: 2 px amber, offset 2 px, never removed.
- `prefers-reduced-motion: reduce`: no smooth scroll, instant transitions, static glyph.
- Tests named after requirement IDs. Add `@axe-core/playwright` 4.14.0 (exact, `devDependencies`).

**Never:**
- No Test-mode banner (Story 3.5), no `aiNotice` in RunMode (Story 3.2), no text field, file picker, password toggle or alert (Stories 1.6, 1.10, 1.11).
- No page content beyond what exists: Hjem keeps its placeholder `h1` «JobAssistant» (Story 1.8) and `/soknad` does not exist yet (Story 1.9).
- No `process.env` read outside `config.ts`; no component library; no `position: sticky` or `fixed` app bar; no `overflow: hidden` on text containers.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|---------------|----------|----------------|
| Any page | GET `/` | `lang="nb"`, skip link is the first Tab stop and moves focus to `#hovedinnhold`, one `header`, one `main`, title «Hjem – JobAssistant» | N/A |
| Unknown URL | GET `/finnes-ikke` | 404, `h1` «Fant ikke siden», the sentence, link «Til Hjem», app bar present, no stack trace | N/A |
| Mobile menu | 360 px, click «Meny» | label «Lukk», `aria-expanded="true"`, two 56 px rows push the page down | Esc closes, focus on «Meny» |
| Wide screen | 1280 px | nav inline, no toggle | N/A |
| Busy button | `busy` set, clicked twice | handler runs zero times, label unchanged | N/A |
| Announce twice | two calls to one region | region holds only the last text | N/A |
| RunMode | page HTML | holds `testMode`, `hosted`, `features`; no database URL or secret | N/A |
| Reduced motion | emulated | `scroll-behavior` not smooth, glyph static | N/A |

</frozen-after-approval>

## Code Map

Reference: `epics.md` Story 1.5; DESIGN.md (tokens, Components) and EXPERIENCE.md (Component Patterns, Accessibility Floor, Key strings) under `_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-11-09/`; spine AD-4. Kept as is: `src/shared/server/config.ts` (`getConfig`, `Features`), `src/shared/core/message-key.ts`, `biome.json` (`src/app/**` import rules), `next.config.ts` (Tailwind through `@tailwindcss/turbopack`), `playwright.config.ts` (port 3100, `TEST_MODE`, `E2E=1`), `vitest.config.ts` (node environment, `*.test.ts` only, `jsx: react-jsx`).

- `src/app/globals.css` -- replace the single import with `@import "tailwindcss"`, `@theme` tokens, `max-640` variant, base styles, focus ring, reduced-motion rules
- `src/app/layout.tsx` -- fonts, skip link, header, main, live regions, `connection()`, RunMode provider; `metadata.title` template
- `src/app/page.tsx` -- drop its own `<main>` (the layout owns it); keep the `h1`; title «Hjem»
- `src/app/not-found.tsx` -- new; Ikke funnet; exports its own title
- `src/shared/ui/messages.nb.ts` -- new; only the strings this story uses
- `src/shared/ui/run-mode.tsx` -- new; `"use client"`; `RunMode` type, `RunModeProvider`, `useRunMode`
- `src/shared/ui/announce.ts` (+ `announce.test.ts`) -- new; two region ids; stubbed `document` in the test
- `src/shared/ui/components/button.tsx` (+ test), `link.tsx`, `app-bar.tsx` -- new; the app bar is a client component (`usePathname`, toggle state); keep the item set and the `aria-current` choice in one pure function with a unit test
- `e2e/shell.spec.ts` -- new; skip link, landmarks, titles, menu at 360 px, Ikke funnet with 404, RunMode in HTML, axe at 1280 px and 360 px, no horizontal scroll at 320 px; `e2e/home.spec.ts` stays valid
- `package.json`, `package-lock.json` -- add `@axe-core/playwright` 4.14.0

## Tasks & Acceptance

**Execution:**
- [x] `src/app/globals.css` -- tokens, variant, base, focus ring, reduced motion -- UX-DR1, UX-DR3, UX-DR8, UX-DR46
- [x] `src/shared/ui/messages.nb.ts` + `announce.ts` + `run-mode.tsx` -- strings, live-region helper, RunMode context -- UX-DR4, UX-DR19, AD-4
- [x] `src/shared/ui/components/{button,link,app-bar}.tsx` -- variants, busy guard, nav, mobile menu -- UX-DR5–8, NFR-3
- [x] `src/app/{layout,page,not-found}.tsx` -- fonts, landmarks, skip link, live regions, RunMode, Ikke funnet -- UX-DR2, UX-DR20, UX-DR45, FR-19, NFR-1
- [x] Unit tests (`announce`, `button`, nav item) and `e2e/shell.spec.ts` + axe dependency -- NFR-2, NFR-3

**Acceptance Criteria:**
- Given the built app, when any page renders, then every token is a `@theme` variable, type sizes are `rem`, `color-scheme: dark` is set once, and the three fonts load through `next/font/google`.
- Given `/` and an unknown URL, when axe scans them at 1280 px and 360 px, then there are 0 serious or critical findings and no horizontal scroll at 320 px.
- Given the Ikke funnet page, when it opens, then the status is 404 and it shows the specified heading, sentence and link «Til Hjem».
- Given `docker compose run --rm --build test`, then it passes (Biome, typecheck, Vitest, Playwright).

## Implementation Notes

- Implemented directly in the main session (no subagent), as in Story 1.4. Verified: `npm test` on the host (Biome, typecheck, 118 Vitest, 17 Playwright incl. axe at 1280 px and 360 px) and `docker compose run --rm --build test` (same counts). Docker Desktop had to be started first. Screenshots at 1280 px (Ikke funnet) and 360 px (menu open) were looked at.
- Deviation from the Code Map: titles use `src/shared/ui/page-title.ts` instead of a layout `title.template`, because Next does not apply a layout's template to the page in the same segment (`/` showed «Hjem»). The layout keeps only the default title.
- Added `src/shared/ui/components/nav-items.ts` (the pure item/`aria-current` function) and `src/shared/ui/page-title.ts`; `test/design-tokens.test.ts` checks `globals.css` (colours, rem sizes, one `color-scheme`, square corners, `max-640`, reduced motion).
- The reduced-motion block sits outside `@layer base` so it beats utilities without `!important` (Biome `noImportantStyles`).
- Mobile menu rows are edge to edge (negative margin on the `nav`), so they read as full-width rows; the toggle sits in a wrapper that is `hidden` above 640 px.
- Not verified: a real phone, a screen reader, the Hosted build, and focus moving to the top of the document after client-side navigation (UX-DR20 clause; not in this story's acceptance criteria). `announce()` repeating the same text twice in a row would not re-announce; no caller exists yet.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG). Routes: patch = fixed in this story; defer = `deferred-work.md`; reject = no action.

| # | Finding | Verdict | Route / evidence |
|---|---------|---------|------------------|
| 1 | Reduced-motion test passes without the rules (default `scroll-behavior` is `auto`); glyph static unchecked (VG, BH) | medium | patch: e2e compares the Meny toggle's `transition-duration` (`0.16s` without, `0s` with reduce) |
| 2 | Button `disabled` assertion matches the class name `text-disabled-ink` (VG, EC, BH) | medium | patch: regex on the `disabled` attribute |
| 3 | RunMode flag mapping and per-request run mode not testable; leak check covers two URL schemes (VG, EC, BH) | medium | patch: pure `toRunMode` in `shared/server/run-mode.ts` with a unit test using distinct flags and a shape check; e2e also rejects `isTestRun` and `adapter`. The build-versus-run env difference is not tested (needs a second server); `connection()` stays by AD-4 |
| 4 | Focus ring never asserted (VG) | medium | patch: e2e checks outline style, width, offset and amber on the skip link and a nav link |
| 5 | 320 px overflow checked only on `/` with the menu closed (VG, EC, BH) | low | patch: same test now covers the open menu and `/finnes-ikke` |
| 6 | Open menu stays open on back/forward or a wordmark click (EC, BH) | medium | patch: the menu state is keyed to the pathname it opened on; e2e covers a link click and `goBack` |
| 7 | Colour test accepts any hex, not DESIGN.md's (EC, BH, VG) | low | patch: host-side test compares each hex with DESIGN.md front matter; skipped in Docker, where `_bmad-output` is in `.dockerignore` |
| 8 | `announce()` of the same text twice is silent (EC, BH) | low | defer: no caller yet; the first story that announces decides the clear-then-set approach |
| 9 | No `error.tsx` or `global-error.tsx`; a config error shows Next's default page (BH) | low | defer: no story owns error pages; Hosted config errors already stop the process at startup |
| 10 | No focus move or announcement after client-side navigation (BH) | low | defer: UX-DR20 clause outside this story's acceptance criteria; Next moves focus to the new page |
| 11 | Titles are a per-page `pageTitle()` call, not a template (BH, EC) | low | reject: the AC («{side} – JobAssistant») is met on every page; Next skips a layout template for the page beside it. A forgotten call shows «JobAssistant» |
| 12 | Focus lost when a link click hides the open menu (EC, BH) | low | reject: the click navigates and the new page starts at the top of the document (UX-DR20) |
| 13 | Ctrl-click closes the menu; stale `open` after widening; Esc on `document`; menu unreachable before hydration or without JS (EC, BH) | low | reject: cosmetic or momentary; the fixes add handlers or a no-JS path |
| 14 | `aria-disabled` override, `busy` plus `disabled` cursor clash, other handlers still fire while busy (EC, BH) | low | reject: no caller does this; the spec fixes `busy` as `aria-disabled` plus ignored click |
| 15 | Busy state not announced, no `aria-busy` (BH) | low | reject: the spec fixes the busy markup (UX-DR6) |
| 16 | `catalogue-number` weight and font-stretch literals are outside `@theme` (EC) | low | reject: not DESIGN.md values with a size role; `@utility` is Tailwind's place for composite roles |
| 17 | `sr-only` uses `overflow:hidden` on the live regions (EC) | false | the boundary is about visible text containers; AT reads `sr-only` text in full |
| 18 | `announce()` has no `typeof document` guard (EC) | false | it is called only from client event handlers |
| 19 | Status and logs out of step; the title deviation is not in the Change Log; `package-lock.json` not in the diff (BH) | false | sprint status moves in step 5; no frozen rule broke (result met); the lockfile was left out of the diff on purpose and is changed |
| 20 | Weak or coupled button tests, Hjem row height, no click-to-close test, `/soknad` 404 not pinned (BH, VG) | low | reject: the busy contract is tested through the handler; the rest is cosmetic |

## Design Notes

- **The spec's `Never` list is the cut line.** The epic context lists a Test-mode banner, text field, password toggle, file picker and alert as «shared UI built here»; the story's own **Code** list names only app bar, button and link, so the rest arrive in the stories that first use them (rule: a shared part is created by the first story that needs it).
- **Søknad link before 1.9:** the nav links to `/soknad`, which shows Ikke funnet until Story 1.9 creates it. The AC fixes the nav as «Hjem · Søknad».
- **Fonts need the network at build time** (`next/font/google` downloads them during `next build`). Docker build and CI have it; an offline build fails.
- **Spacing:** DESIGN.md steps 7–12 (32–72 px) differ from Tailwind's default `0.25rem` multiplier (7 = 28 px). Define `--spacing-7` … `--spacing-12` explicitly and check the built CSS.
- **Golden example (announce):** `announce("action", "Kopiert")` then `announce("action", "Lagret.")` leaves the second region with exactly «Lagret.».

## Verification

**Commands:**
- `npm test` -- expected: Biome, typecheck, Vitest and Playwright pass on the host
- `docker compose run --rm --build test` -- expected: passes
- `docker compose up -d --wait --build app`, open `http://127.0.0.1:3000` -- expected: warm dark shell, skip link on first Tab, «Meny» at 360 px
- `docker compose down -v` -- expected: clean

**Manual checks:**
- Tab from the top of `/`: skip link first, then wordmark, nav links. Zoom to 400 %: no horizontal scroll.
