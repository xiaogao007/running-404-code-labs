---
name: frontend-quality
description: Review frontend changes with the repository's existing lint, type-check, test, build, accessibility, and security gates. Use before a pull request is marked ready for review.
---

# Frontend Quality Gate

## Workflow

1. Read the repository contribution guide and package scripts before choosing commands.
2. Identify the changed files and the user-visible paths they affect.
3. Run the narrowest relevant existing checks first, then the repository's aggregate verification command when available.
4. For UI changes, verify loading, empty, error, keyboard, and small-screen states that are in scope.
5. Report failures with the command, exit status, affected file, and the smallest useful error excerpt.
6. Distinguish checks that ran from checks that were skipped or unavailable.

## Boundaries

- Do not modify CI policy, suppress diagnostics, or weaken tests to obtain a passing result.
- Do not read credentials or print environment-variable values.
- Do not run deployment, release, database migration, or destructive filesystem commands.
- Ask for approval before installing new dependencies or expanding beyond the requested change.

## Output

Return a compact table with `gate`, `command`, `status`, and `evidence`, followed by unresolved risks.
