# Branch protection for `main`

Story 1.4 (NFR-10): `main` holds only green, runnable code. The GitHub setting that would enforce this is a repository setting, not a file, and it needs admin rights on `IBE160-2026/G32-grotting`.

## Status

**Decision: kept as a convention, not enforced by GitHub.** The developer's account has `push` but not `admin` on the repository (checked 2026-11-14), and the project has a single developer, so the repository setting is not applied. The rule is followed by hand instead (see below). The gap is logged in `.logs/<user>/issues.md`.

## The convention

- Never push directly to `main`, and never force-push it or delete it.
- Do every change on a branch (for example `story/<id>-<short-name>`) and open a pull request into `main`.
- Wait for the **`ci`** check (the job in `.github/workflows/ci.yml`) to be green on the pull request before merging. Do not merge on a red or missing check.

## What the convention does not give

- GitHub does not block a direct push to `main` or a merge on a red `ci` check. NFR-10 holds only as long as the convention is followed.
- CI still runs on every pull request (Story 1.4) and reports the result, but it cannot stop a merge.

## If it is enforced later

If someone with admin rights (for example the org owner) applies it, Settings → Branches → Branch protection rule (or Rulesets) for `main` should have:

- Require a pull request before merging.
- Require status checks to pass before merging, with the check **`ci`**. The check appears in the list only after CI has run once on a pull request.
- Do not allow bypassing the rule; no direct pushes to `main`, no force pushes, no deletion of the branch.

Then update the status above and record who applied it and on which date:

- [ ] Applied by: ______ on ______
