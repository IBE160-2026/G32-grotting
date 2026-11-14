# Branch protection for `main`

Story 1.4 (NFR-10): `main` holds only green, runnable code. The rule below is a GitHub repository setting, not a file, so it has to be applied by someone with admin rights on `IBE160-2026/G32-grotting`.

## Status

**Open.** Not applied. The developer's account has `push` but not `admin` on the repository (checked 2026-11-14), so the build of Story 1.4 could not set it. Until it is applied, the rule is kept by convention: every change goes through a pull request and CI must be green before merge.

## The rule

Settings → Branches → Branch protection rule (or Rulesets) for `main`:

- Require a pull request before merging.
- Require status checks to pass before merging, with the check **`ci`** (the job in `.github/workflows/ci.yml`). The check appears in the list only after CI has run once on a pull request.
- Do not allow bypassing the rule; no direct pushes to `main`, no force pushes, no deletion of the branch.

## When it is applied

Record here who applied it and on which date, and tick the box:

- [ ] Applied by: ______ on ______
