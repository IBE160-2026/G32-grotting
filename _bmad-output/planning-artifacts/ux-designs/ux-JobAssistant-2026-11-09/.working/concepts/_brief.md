# Shared brief for the 10 concept sketches (2026-11-09)

Every concept agent reads this file in full. It is the same for all ten; only the assigned visual world differs.

## Product truth (do not change)

Read `PRODUCT.md` at the project root in full. It is binding: users, positioning, terminology, voice (plain warm bokmål, «du», no exclamation marks, no emoji, no cheerleading), the score-is-an-estimate rule, AI-text labels, accessibility floor (WCAG 2.2 AA, 44 px targets, meaning never by colour alone, 360 px single column, nav collapses at ≤ 640 px, `lang="nb"`).

The previous UX (`_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-09-11/`, «Warm Editorial» + «Rich Mocha») is being REPLACED. Do not reuse its look (no warm editorial serif + mocha/brown palette). You may skim its EXPERIENCE.md for screens, states and microcopy only.

## Deliverable

ONE self-contained HTML file at the path given in your prompt. All CSS inline in a `<style>` block; fonts only from Google Fonts; no external JS (small inline JS is fine for a screen index / tab switching / the dialog). No images from the web; draw anything visual with CSS/SVG. `<html lang="nb">`.

It is a **sketch board**: high-fidelity enough to judge the visual world and composition, not production code. Structure:

1. A short header strip (in the concept's own visual language) with: concept number and name, a 2–3 sentence description of the world, and a jump index to every screen.
2. Every screen below as its own labelled frame (label = screen name + state, e.g. «Søknad — resultat, fase 1»). Desktop frames ~1200–1280 px wide content (responsive is fine).
3. A «Mobil 360 px» section: two frames exactly 360 px wide, showing (a) the collapsed navigation open/closed and (b) the Søknad Refleksjonsnotat (score + start of evidence + letter actions).
4. A short footer: «Konsept NN — skisse, ikke endelig design».

## Screens (all must be present)

1. **Hjem** — logged out. Main button «Lag skreddersydd søknad». Explains the three outputs (Match score, gap analysis with rewording suggestions, letter draft) and the stance (shows its work, never invents). No testimonials, no usage numbers, no pricing, no partner logos — none exist.
2. **Registrer deg** — name, email, password, Access code field (registration requires it on the Hosted version). Link to «Logg inn».
3. **Logg inn** — email, password. Link to «Registrer deg».
4. **Tilgangskode** — the Access-code screen for the Hosted version (one field, ≥ 16 chars, short explanation that the hosted copy is closed).
5. **Profil** — CV upload (PDF/TXT ≤ 2 MB) or paste; the extracted CV text shown in an editable textarea for correction, with a note that two-column PDFs can scramble lines; «Lagre». Include the error state for a scanned PDF: «Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Lim inn teksten fra CV-en din i stedet.» (or close).
6. **Søknad — utfylling** — CV text pre-filled from Profil (collapsible/confirmable), «Bruk eksempelet» button, job ad textarea, «Stillingstittel», «Arbeidsgiver», Tone choice (Formell, Personlig, Direkte), submit «Analyser og skriv utkast» (or close). Show the one-time AI notice as an open dialog in a separate frame: text goes to an AI provider, nothing is sent before you accept, buttons «Godta og fortsett» / «Avbryt».
7. **Søknad — resultat, fase 1** — Match score and keyword lists shown; a progress line: «Skriver gapanalyse, omformuleringer og søknadsbrev … dette tar under ett minutt.» AI sections as placeholders.
8. **Søknad — Refleksjonsnotat (ferdig)** — the climax screen. Must contain:
   - «71 % samsvar – 5 av 7 nøkkelord», Verdict «Sterkt samsvar» (≥ 70; otherwise «Bør forbedres») — shown with text, never colour alone.
   - Estimate disclaimer: «Et anslag på hvor mange av annonsens nøkkelord CV-en din dekker. Ikke en ekte ATS-vurdering.»
   - The formula visible: «5 av 7 nøkkelord funnet = 71 %».
   - Matched keywords, each with its Evidence (the CV line it was found in, quoted).
   - Missing keywords, each with the template line «Annonsen ber om «Kubernetes». CV-en din viser det ikke ennå.» and the ad line quoted below.
   - Gaps: «Tverrfaglig samarbeid» = Rewordable gap (cites the CV entry word for word, gives a Rewording suggestion with «Kopier», hedged: «dekker trolig dette – vurder å ta det med»). «Kubernetes» = Real gap (plain statement, invitation to think about experience not in the CV, NO text to copy). Label: «Skrevet med KI».
   - Letter: read-only, label «Utkast skrevet med KI – les gjennom og tilpass før du sender.», buttons «Kopier», «Last ned (.docx)», «Lag nytt utkast».
   - A Test-mode banner variant somewhere (can be a small extra frame): «Testmodus – KI-svarene er lagrede eksempelsvar.»
9. **Historikk** — list of saved Applications (title, employer, date, score), each reopenable, with copy/download; read-only. Also show the empty state.
10. **Konto** — email, «Logg ut», a short note on how data is stored (encrypted) and when it is deleted. No password change, no delete button.

Navigation (logged in): Hjem · Søknad · Profil · Historikk · Konto. Show it on the app screens. (Without accounts only Hjem and Søknad exist — a one-line note in the header strip is enough.)

## Shared fictional content (use exactly, so concepts are comparable)

- Student: **Violet Hansen**, final-year informatics student (bachelor i informatikk), violet.hansen@example.no.
- Ad: **Junior frontendutvikler** at **Nordic Digital**. Date «8. nov. 2026».
- Matched (5): React, TypeScript, Git, universell utforming, smidig utvikling. Example Evidence lines (invent plausible, modest student CV lines, e.g. «Utviklet brukergrensesnitt i React og TypeScript i semesterprosjektet IBE160 (gruppe på fem)», «Brukte Git og GitHub til versjonskontroll i alle gruppeprosjekter», «Testet prototypen mot WCAG 2.1 i emnet Universell utforming», «Jobbet i tre ukers sprinter med daglige standups i semesterprosjektet»).
- Missing (2): **Tverrfaglig samarbeid** (Rewordable; CV entry e.g. «Semesterprosjekt: samarbeidet med to studenter fra økonomi og en fra design om en app for studentboliger»), **Kubernetes** (Real gap; ad line e.g. «Erfaring med Docker og Kubernetes er en fordel»).
- Historikk second entry: **Junior produktanalytiker**, **Fjord Analytics**, «21. okt. 2026», «57 % samsvar – 4 av 7 nøkkelord», Verdict «Bør forbedres».
- Letter: a short, modest, believable draft (3–4 short paragraphs, bokmål, «Hei,» or «Til Nordic Digital,»), no claims beyond the evidence above.

All visible UI copy in bokmål. Terminology exactly as PRODUCT.md / PRD §3.

## How to use impeccable here

Invoke the `impeccable` skill (Skill tool) and follow its Setup (run `.claude/skills/impeccable/scripts/impeccable context` once from the project root — on Windows without `sh` use `impeccable.cmd`) and then read `.claude/skills/impeccable/reference/craft-floor.md` before writing UI, plus `reference/operate.md` (this is mostly an Operate surface; Hjem leans Persuade). Then build your assigned world with full commitment.

Overrides to the impeccable flow for this round (decided by the orchestrator, do not do these):
- Do NOT ask the user any questions (no AskUserQuestion). The direction is already assigned to you.
- Do NOT run `concept-seed`, `serve-question`, live mode or generate — the seed was already rolled centrally.
- Do NOT write or modify DESIGN.md, PRODUCT.md, surface briefs, or any file outside your one HTML file.
- Do NOT generate raster images.

Verify: if a headless browser is available (e.g. `npx playwright screenshot` or similar works quickly), screenshot at 1280 and 360 and fix what you see; otherwise do a careful self-review against craft-floor.md and the accessibility floor (contrast ≥ 4.5:1 for text, ≥ 3:1 for control boundaries). Don't spend long fighting tooling.

## Your final reply (to the orchestrator, keep it under 150 words)

Return exactly:
- NAME: concept name (Norwegian or English, 1–4 words)
- WORLD: one sentence
- PALETTE: 3–5 hex values with roles
- TYPE: font pairing
- SIGNATURE: the one memorable move
- RISK: one honest sentence
- FILE: the path you wrote
