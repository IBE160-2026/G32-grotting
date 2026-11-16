- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-app-with-a-pinned-stack-and-boundary-rules.md`
  summary: A slice file can still reach another slice's internals with a short relative import (for example `../../b/server/x` from `server/`).
  evidence: Biome `noRestrictedImports` cannot tell an own-slice `../../core/x` from a cross-slice `../../b/x` by pattern; only 3+ levels up and the `@/` alias are caught. Convention is the `@/` alias across slices. Revisit if a slice breaks it, or add an import-graph check in CI (Story 1.4).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-app-with-a-pinned-stack-and-boundary-rules.md`
  summary: `npm test` needs Playwright's Chromium, which nothing in the repo installs yet.
  evidence: Chromium was installed by hand with `npx playwright install chromium`. The Docker `test` stage (Story 1.3) installs it, and the README (NFR-9) must name it for the developer loop.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-read-configuration-in-one-place-and-answer-a-health-check.md`
  summary: Hosted does not fail when `AI_PROVIDER` is set without an AI key, and a key without a provider silently gives Test mode.
  evidence: AD-3 requires the key once `AI_PROVIDER` is set on Hosted; the story's AC lists other rules. Add the rule and a test in Story 3.12, when live AI goes on.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-read-configuration-in-one-place-and-answer-a-health-check.md`
  summary: No test applies a real migration or runs `npm run db:migrate` against one; `db.test.ts` "skips migrating while there is no migration history" goes stale.
  evidence: `drizzle/` is empty in this story. The first story that generates a migration adds a PGlite migration test, runs the script once and replaces the "skips" test. `npm run db:check` on an empty history writes `drizzle/meta/_journal.json`; Story 1.4 must not commit that.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-read-configuration-in-one-place-and-answer-a-health-check.md`
  summary: `handle()` does not pass the route context (`params`) to the handler.
  evidence: The first dynamic route (`/api/analyses/[id]/letter`, Epic 3) needs it; extend the signature then.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-start-the-app-and-run-the-tests-with-one-docker-command-each.md`
  summary: The setup advisory lock is a session lock on a one-connection pool with `idle_timeout: 20`, so a local step that idles over 20 s loses it unnoticed.
  evidence: Review finding EC. No local step exists yet. When Story 6.1 or 6.11 adds one, hold the lock in a transaction (`pg_advisory_xact_lock`) or check that `pg_advisory_unlock` returns true.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-start-the-app-and-run-the-tests-with-one-docker-command-each.md`
  summary: No test shows that setup migrates before it runs local steps.
  evidence: Review findings VG and EC. `drizzle/` is empty, so `applyMigrations` is a no-op. The first story that generates a migration (with the PGlite migration test already deferred from Story 1.2) adds an order assertion for `runSetup`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-check-every-pull-request-in-ci.md`
  summary: `db:check` has never run on a real migration history: its `drizzle-kit check` branch, the from-zero PGlite migration and both failure exits are untested.
  evidence: Review findings VG and BH. `drizzle/` is empty, so only the "no history" branch runs. The first story that generates a migration adds a fixture test (consistent history exit 0, broken SQL exit 1, inconsistent snapshot exit 1) together with the PGlite migration test deferred from Story 1.2. A broken `_journal.json` was run by hand and exited 1.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-show-every-page-in-the-jobassistant-look-with-an-accessible.md`
  summary: `announce()` does not speak the same text twice in a row, because the region's text does not change.
  evidence: Review findings EC and BH. No caller exists yet. The first story that announces (copy, «Lagret.») clears the region and sets the text in the next frame, with a test.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-show-every-page-in-the-jobassistant-look-with-an-accessible.md`
  summary: The app has no `error.tsx` or `global-error.tsx`, so a render or config error shows Next's unstyled default page without the shell.
  evidence: Review finding BH. Only 404 is branded (FR-19). Add branded error pages when a story owns a failure surface (Story 3.9 or 7.2).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-show-every-page-in-the-jobassistant-look-with-an-accessible.md`
  summary: Focus does not move to the top of the document and no polite line is spoken after a client-side navigation.
  evidence: Review finding BH. UX-DR20 asks for it; Next moves focus on navigation, and the acceptance criteria of Story 1.5 do not cover it. Check it in the keyboard walk of Story 7.2.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-close-the-hosted-version-with-an-access-code.md`
  summary: Wrong Access codes are not throttled or locked out; the spine memlog mentions a per-IP limit.
  evidence: Review finding BH. The Story 1.6 acceptance criteria and spec rule out throttling, and the code is 16+ random characters. Decide in Epic 6 or 7 whether a limit is needed, and add the «For mange forsøk» string to the UX with it.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-close-the-hosted-version-with-an-access-code.md`
  summary: `/tilgang` returns 404 when Hosted has accounts on, but no test renders the page with that config.
  evidence: Review finding VG. The route's guard is tested in `route.test.ts`; add a Vitest test of the page with a mocked `getConfig` when Epic 6 turns accounts on (Story 6.12).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-close-the-hosted-version-with-an-access-code.md`
  summary: A pasted or configured Access code with leading or trailing whitespace fails as a wrong code.
  evidence: Review findings BH and EC. Trim in one place (`parseConfig` for `ACCESS_CODE`, the request schema for the submitted code) when Story 1.7 sets the Vercel variable, and test it.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-close-the-hosted-version-with-an-access-code.md`
  summary: The «Vis»/«Skjul» toggle changes its label and also sets `aria-pressed`, which some screen readers read twice.
  evidence: Review finding BH. UX-DR10 fixes both. Listen with a screen reader in Story 7.2; if it reads badly, keep a fixed label with `aria-pressed`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-close-the-hosted-version-with-an-access-code.md`
  summary: `callApi` does not send the Student to `/tilgang` when a later call returns `ACCESS_REQUIRED` (the cookie is gone mid-session).
  evidence: Review finding EC. No other caller exists yet; the first story that calls an API after the gate (Story 1.10 or 1.11) decides where this lives.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-deploy-the-skeleton-to-the-hosted-version.md`
  summary: `scripts/migrate.ts` takes no advisory lock, so two Production builds running at once could migrate in parallel.
  evidence: Edge Case Hunter; the build runs `db:migrate` over the session pooler and the AD-17 container path uses `withAdvisoryLock`. No migration exists yet, so revisit when Epic 6 adds the first one.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-deploy-the-skeleton-to-the-hosted-version.md`
  summary: Unverified (would be medium): `sslmode=require` on the Supabase session pooler with postgres-js, and the Vercel build running `db:migrate` with the Production variables.
  evidence: Needs the real Supabase and Vercel projects; settled by the first deploy and the FR-30 manual row in `docs/qa/hosted-deployment.md`.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-normalise-and-stem-norwegian-words.md`
  summary: `normalise` joins every space between two letters, so a multi-word term is stemmed only on its last word and single-letter words glue on («utvikler av systemer» vs «utviklere av systemer» differ; «R og Python» becomes «rogpython»).
  evidence: Edge Case Hunter and Blind Hunter. Spec Design Notes choose joining so split compounds equal whole ones. Story 2.5/2.6 should match by token first (stem each word) and use the joined form only for the compound stage.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-normalise-and-stem-norwegian-words.md`
  summary: `normalise` removes a dash next to digits («ISO-27001» becomes «iso27001» but «ISO 27001» stays «iso 27001»; «2020-2024» becomes «20202024»).
  evidence: Edge Case Hunter and Blind Hunter. The spec says every dash is removed. Decide in 2.5/2.6 whether letter-digit variants should compare alike, with an Answer-key case to justify it.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-normalise-and-stem-norwegian-words.md`
  summary: The new core allow-lists still let a relative import leave the slice from a `core` folder («../../integrity/core» from `keywords/core`, «../../keywords/core/stem» from `integrity/core`).
  evidence: Verification Gap and Edge Case Hunter. The same hole existed with the old ban lists (see the first entry about short relative imports). Needs the import-graph check or a `../../**` ban once core folders stay flat.
