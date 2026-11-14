- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-app-with-a-pinned-stack-and-boundary-rules.md`
  summary: A slice file can still reach another slice's internals with a short relative import (for example `../../b/server/x` from `server/`).
  evidence: Biome `noRestrictedImports` cannot tell an own-slice `../../core/x` from a cross-slice `../../b/x` by pattern; only 3+ levels up and the `@/` alias are caught. Convention is the `@/` alias across slices. Revisit if a slice breaks it, or add an import-graph check in CI (Story 1.4).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-app-with-a-pinned-stack-and-boundary-rules.md`
  summary: `keywords/core` and `integrity/core` ban a fixed list of framework, database and Node packages, not every package except an allow-list.
  evidence: Core may legitimately import `@orama/stemmers` (Story 2.4), so a full allow-list needs the real dependency set. Turn the ban list into an allow-list in Story 2.4.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-app-with-a-pinned-stack-and-boundary-rules.md`
  summary: `npm test` needs Playwright's Chromium, which nothing in the repo installs yet.
  evidence: Chromium was installed by hand with `npx playwright install chromium`. The Docker `test` stage (Story 1.3) installs it, and the README (NFR-9) must name it for the developer loop.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-app-with-a-pinned-stack-and-boundary-rules.md`
  summary: `src/shared/core` has no purity rule, so it can import Node built-ins, `server-only`, `next/*` or `drizzle-orm` while `keywords/core` and `integrity/core` stay "pure" through it.
  evidence: Found in the Story 1.1 walkthrough code review. Add a core-purity override for `src/shared/core/**` (same ban list as the core slices) with a lint-boundary fixture, together with the allow-list work in Story 2.4.
