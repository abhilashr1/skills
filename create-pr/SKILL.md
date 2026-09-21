---
name: create-pr
description: "Prepare or create a GitHub pull request from local git changes, following repository branch, commit, and pull-request template conventions. Supports PR-ready UI evidence by uploading supplied local screenshots into named description placeholders, verifying rendered attachments, checking preview deployments and CI, and cleaning up ephemeral task plans after successful handoff. Use when the user asks to draft PR text, open a draft or ready PR, attach visual proof, or turn the current branch into a pull request; create remote state only when explicitly requested."
---

# Create Pull Request

Prepare an accurate pull request from the current branch. Do not commit, amend, push, upload files, or create remote state beyond what the user requested.

## 1. Inspect

1. Resolve the repository root, current branch, upstream, default branch, and worktree status.
2. Read applicable `AGENTS.md`, contribution guidance, and the repository's pull-request template.
3. Inspect commits and the complete branch diff against the intended base.
4. Identify the ticket from the branch, commits, or user input. Do not invent one.
5. Check whether a PR already exists for the branch before creating another.
6. Identify task-document lifecycle. Never stage an ephemeral plan. If a plan was committed unexpectedly, report it and ask before rewriting history.
7. Collect requested evidence artifacts, including any `local-ui-proof` record and absolute screenshot paths.

Infer a sensible title and base when evidence is clear. Ask only when the branch/base, target repository, ticket, draft/ready state, or requested remote action is materially ambiguous.

## 2. Draft the content

- Follow the repository template exactly; retain required headings and checkboxes.
- Use the repository's observed title convention. When applicable, prefer `type(TICKET): concise description`.
- Summarize behavior and intent from the diff rather than listing every file.
- Describe validation actually run. Clearly label manual verification that remains.
- For UI changes, include the requested and observed route plus a visible assertion from `local-ui-proof` when available.
- Keep authorship language neutral; do not add AI/tool attribution unless required.

For every requested screenshot, reserve a stable placeholder:

```md
### Local verification

<!-- pr-evidence:<short-slug> -->
```

Use one unique slug per artifact. Do not depend on the editor cursor position for final placement.

Do not rewrite commits merely to improve their messages. If a commit violates a required convention, report it and ask before amending history.

## 3. Create only when requested

If the user asked only for PR text, return the title and body without pushing, uploading, or creating a PR.

If the user asked to open or create the PR:

1. Confirm GitHub authentication with `gh auth status` when needed.
2. Push only when no usable remote branch exists and pushing is required.
3. Prefer Cursor `ManagePullRequest` (`action: "create_pr"`) when that tool is available: pass title, body, `branch_name`, and `base_branch`. Set `draft: true` unless the user asked for a ready PR. Otherwise use `gh pr create` with the resolved base, title, body, and requested draft/ready state.
4. Return the PR URL. Do not create a duplicate when the branch already has a PR.

Never force-push, change the base, mark ready, merge, or post follow-up comments unless explicitly requested.

## 4. Attach requested visual evidence

Uploading a screenshot is an external side effect. Proceed without reconfirmation only when the user's request explicitly includes attaching that evidence to the PR.

When Cursor `ManagePullRequest` is available, prefer embedding local screenshot paths as HTML `<img>` tags with absolute file paths in the PR body. The tool uploads artifacts and rewrites the paths. Use browser upload only when that tool cannot attach the files.

1. If a browser upload is required, use available Cursor browser tools or a browser-control skill and open the created PR using the requested browser surface.
2. Edit the PR description and scope the attachment control to the description edit form, not the new-comment form.
3. Start the file-chooser wait before clicking the visible attachment control, then upload the absolute screenshot path.
4. Wait for GitHub's temporary `Uploading` markup to become a completed attachment. Accept either Markdown image syntax or GitHub's generated `<img>` element.
5. Extract the completed attachment markup, remove it from the upload insertion point, replace the matching `<!-- pr-evidence:<short-slug> -->`, and save the description.
6. Verify from fresh rendered page state that the placeholder is absent and the image's filename or alt text is present.
7. Keep the finished PR tab as a deliverable when browser finalization is required.

If upload fails, follow the selected browser's file-upload troubleshooting. Do not claim the PR contains evidence unless the rendered attachment was verified.

## 5. Verify and hand off

After creation and uploads, query the PR and report:

- URL, open/draft state, base, and head branch;
- passing, failing, and pending checks;
- preview deployment URL when exposed by checks or PR comments;
- whether every requested screenshot rendered successfully;
- validation skipped or assumptions made;
- untracked files excluded from the PR.

When an ephemeral task plan was created by the current workflow and the PR handoff is successful, delete only its dedicated temporary directory. Preserve repository and handover plans.
