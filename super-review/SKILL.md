---
name: super-review
description: Perform an in-depth review of a GitHub PR URL, compare URL, repo URL plus branch, or branch name. Creates an isolated git worktree, checks out the target branch, compares it against the appropriate base, inspects code deeply for bugs, risks, conventions, and best-practice deviations, and returns a polished review in-chat only without posting comments remotely.
---

# Super Review

You are reviewing a branch against its codebase. Be skeptical, precise, and evidence-backed.

Review along three independent axes so one kind of pass does not hide another kind of failure:

- **Code quality / risk** — correctness, safety, security, maintainability, performance, and testability.
- **Standards** — whether the diff follows documented repo standards, conventions, architecture decisions, and machine-enforced config.
- **Spec** — whether the diff implements the originating issue/PRD/spec without missing requirements or scope creep.

## Non-negotiables

- Do **not** post comments to GitHub, Linear, or any remote review system.
- Do **not** push, amend, rebase, or mutate the reviewed branch.
- Always create and use an isolated git worktree (or a disposable clone plus worktree for an external repo) before reading/reviewing the branch, unless you are reviewing unstaged or local changes in the current branch. 
- Review the branch diff against the correct base (latest main branch unless specified), but also read enough surrounding code to judge conventions and architecture.
- Return the final review in the chat/screen in a beautified format.

## Inputs supported

The user may provide:

- A branch name for the current repository, e.g. `feature/payments-retry`.
- A GitHub repository URL plus an optional branch name.
- A GitHub branch URL, PR URL, or compare URL when available.

If the target branch or base cannot be determined confidently, ask one concise clarifying question before proceeding.

## Workflow

### 1. Resolve repository, target branch, and base

1. Capture current directory and repository state:
   - `pwd`
   - `git rev-parse --show-toplevel`
   - `git status --short --branch`
   - `git remote -v`
2. Determine the target repository:
   - If only a branch name is provided, use the current git repository.
   - If a repo/PR/branch URL is provided, derive the clone URL and host (`github.com`, Bitbucket Cloud, or Bitbucket Server/Data Center).
3. Determine the target branch:
   - From explicit user text first.
   - From URL path patterns such as GitHub `/tree/<branch>`, GitHub PR refs, Bitbucket `/branch/<branch>`, or compare URLs.
   - For GitHub PR URLs, prefer `gh pr view <url> --json headRefName,baseRefName,headRepository,headRepositoryOwner` when `gh` is available; otherwise fetch/read `refs/pull/<number>/head` and ask for the base if needed.
   - If unavailable, ask the user for the branch.
4. Determine the base branch:
   - Prefer PR/compare metadata if available.
   - Else use the remote default branch from `origin/HEAD`.
   - Else fall back to `main`, then `master` if present.
   - State the chosen base in the final review.

### 2. Create an isolated worktree

You can skip this step if the changes are local or unstaged in the current branch. Otherwise, create a disposable worktree for the target branch and check it out. If the target branch is in a different repository, clone it into a temporary cache directory first.

For the current repository:

```bash
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
git fetch --all --prune
SAFE_BRANCH=$(printf '%s' "$TARGET_BRANCH" | tr '/:@ ' '----')
WT="../$(basename "$ROOT")-review-$SAFE_BRANCH"
git worktree add "$WT" "$TARGET_BRANCH" || git worktree add "$WT" "origin/$TARGET_BRANCH"
cd "$WT"
```

For an external repository URL:

```bash
CACHE="${TMPDIR:-/tmp}/codex-super-review"
mkdir -p "$CACHE"
if [ -d "$CACHE/$REPO_SLUG/.git" ]; then
  cd "$CACHE/$REPO_SLUG"
  git fetch --all --prune
else
  git clone "$REPO_URL" "$CACHE/$REPO_SLUG"
  cd "$CACHE/$REPO_SLUG"
  git fetch --all --prune
fi
SAFE_BRANCH=$(printf '%s' "$TARGET_BRANCH" | tr '/:@ ' '----')
git worktree add "../$REPO_SLUG-review-$SAFE_BRANCH" "$TARGET_BRANCH" || git worktree add "../$REPO_SLUG-review-$SAFE_BRANCH" "origin/$TARGET_BRANCH"
cd "../$REPO_SLUG-review-$SAFE_BRANCH"
```

If the worktree already exists, inspect it with `git status --short --branch`; reuse it only if it is clean and on the intended branch, otherwise choose a new unique path.

### 3. Build the review context

Pin the comparison point once and use a three-dot diff so the review is against the merge base:

```bash
git status --short --branch
git log --oneline --decorate --max-count=20
git log --oneline --decorate "$BASE_BRANCH"..HEAD || git log --oneline --decorate "origin/$BASE_BRANCH"..HEAD
git diff --stat "$BASE_BRANCH"...HEAD || git diff --stat "origin/$BASE_BRANCH"...HEAD
git diff --name-status "$BASE_BRANCH"...HEAD || git diff --name-status "origin/$BASE_BRANCH"...HEAD
git diff "$BASE_BRANCH"...HEAD || git diff "origin/$BASE_BRANCH"...HEAD
```

Then read every changed file unless the diff is too large to fit; if coverage is partial, state that explicitly in the final review. Read relevant nearby code, call sites, tests, and project docs/configuration before forming opinions.

### 4. Identify spec and standards sources

Look for the originating spec in this order:

1. Issue/PR references in commit messages or branch names (`#123`, `Closes #45`, Linear IDs).
2. A path or issue/PR URL the user passed.
3. Matching PRD/spec docs under `docs/`, `specs/`, `.scratch/`, tickets, or project planning folders.
4. If no spec is available, continue the review but mark the Spec axis as `No spec found` rather than inventing requirements.

Look for standards sources that define how this repo expects code to be written:

- `AGENTS.md`, `CONTRIBUTING.md`, `README*`, plus any legacy harness guidance the repository explicitly references.
- `CONTEXT.md`, `CONTEXT-MAP.md`, per-directory context files, and `docs/adr/`.
- `STYLE.md`, `STANDARDS.md`, `STYLEGUIDE.md`, engineering docs, review checklists.
- `.editorconfig`, lint/format/typecheck configs, `tsconfig.json`, package/build/test configs. Note these, but do not waste review space restating what tooling already enforces unless the branch bypasses or weakens it.

Have the evidence operator collect Standards and Spec evidence as bounded workstreams, but keep both judgments in the main review. Do not add reviewer subagents unless the user explicitly requests independent parallel reviews.

When useful, run lightweight verification commands that are obvious for the project (for example `npm test`, `npm run lint`, `pytest`, `go test ./...`, `cargo test`). Avoid expensive/destructive commands unless the user asked for them.

### 5. Review depth checklist

Look for:

- Correctness bugs, edge cases, race conditions, state leaks, error handling gaps, null/undefined handling, time/date issues, and concurrency issues.
- Security/privacy risks, authz/authn mistakes, injection, secret handling, unsafe logging, and dependency risk.
- Data integrity and migration/backward-compatibility risks.
- Performance, scalability, memory, network, and database query issues.
- API/contract compatibility and behavior changes.
- Spec conformance: missing requirements, partial implementations, wrong behavior, unrequested behavior, and scope creep.
- Standards conformance: documented rules, ADR violations, domain-language drift, and convention mismatches that tooling will not catch.
- Test coverage gaps and missing regression tests.
- Maintainability, readability, naming, layering, coupling, and code locality issues.
- Deviations from current codebase conventions, style, architecture, domain language, and quality bar.
- Over-engineering or under-engineering relative to the surrounding code.

Prefer findings that are actionable and tied to real code evidence. Do not invent issues. If no high-confidence issues exist, say so and mention residual risks.

## Final response format

Return the review in a beautified markdown format, something which user can copy/paste into a PR comment or issue. Show the file and line number and diff for each finding, along with the comment that is copy /paste ready. 

### Severity guidance:

- **High**: likely bug, security/data-loss risk, production incident risk, broken contract, or must-fix before merge.
- **Medium**: meaningful maintainability/test/correctness risk that should be fixed soon or before merge depending on context.
- **Low/Nit**: polish, readability, small convention mismatch.
