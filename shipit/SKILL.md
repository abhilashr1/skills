---
name: shipit
description: >-
  Turn an agreed repository fix or feature into a Linear issue and GitHub pull
  request end to end: create and assign the issue with the Linear CLI, move it
  to In Progress, create an issue-named branch, implement and verify the smallest
  change, commit and push it, then create the PR using the create-pr skill. Use
  when the user says shipit or asks to ticket and open a PR for the current task.
---

# Ship It

Ship an already-understood repository change with minimal ceremony.

Invoking this skill explicitly authorizes creating one Linear issue, branch, commit, push, and pull request for the requested change. It does **not** authorize merging, releasing, deploying, force-pushing, or modifying production.

## 1. Confirm the target

- Reuse the current investigation and repository evidence; do not repeat research.
- Identify the implementation repository and verify its worktree is clean enough to branch safely.
- Read repository instructions, validation commands, and PR template.
- Ask only if the implementation repository, change, or assignee is genuinely ambiguous.

## 2. Create the Linear issue

Use the `linear` CLI first, never Linear MCP or browser access.

1. Inspect `linear issues create --help`, active users, and teams when their identifiers are not already known.
2. Resolve “me” from authenticated GitHub/user context and Linear membership. If more than one plausible user remains, ask.
3. Create one concise issue in the appropriate team with:
   - a behavior-focused title;
   - context/root cause;
   - scoped implementation;
   - falsifiable acceptance criteria;
   - assignee set to the resolved user;
   - status set to `In Progress`.
4. Read the created issue back and verify identifier, URL, assignee, and status.

Do not create a duplicate if a matching open issue already exists.

## 3. Branch and implement

- Update the target repository's default branch only when doing so will not disturb local work.
- Use the issue's returned `branchName` exactly. Only derive `fix/PROJECT-123-short-slug`, `feat/PROJECT-123-short-slug`, or `chore/PROJECT-123-short-slug` when Linear did not provide one.
- Implement the smallest root-cause change. Do not add speculative abstraction, dependencies, or unrelated cleanup.
- Add a test only when the change contains non-trivial behavior that existing checks cannot cover.

## 4. Verify and commit

- Run the narrowest relevant check, then the repository's required validation commands.
- Review the complete diff for correctness and unnecessary complexity.
- Commit using the repository convention, normally `fix(PROJECT-123): concise description`.
- Never amend, force-push, or rewrite existing history without explicit authorization.

## 5. Create the pull request

Load and follow the `create-pr` skill rather than improvising PR creation.

- Check for an existing PR before creating one.
- Push the branch when required.
- Follow the repository PR template exactly.
- Link the Linear issue and describe only validation actually run.
- Create a ready PR unless the user requested a draft or the change is knowingly incomplete.
- Verify the PR URL, base/head, state, and checks.

## 6. Hand off

Return only:

- Linear issue identifier and URL;
- branch and commit;
- PR URL and state;
- validation results and any pending checks;
- anything explicitly unverified.

Do not merge, release, or deploy unless the user separately requests it.
