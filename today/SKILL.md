---
name: today
description: Create a summary of my day to post as updates in my team's channel. Use when asked for today's work/status update from GitHub activity.
---

# Create a daily summary of my day

Draft the requested daily team update; posting requires explicit authorization.

## Step 1: Determine time range and username

- Time range: today in the user's current timezone, converted to UTC for API queries. Resolve the timezone from the runtime or ask when it cannot be determined reliably.
- Get GitHub username first via `gh api user --jq '.login'` — do NOT use `{owner}` placeholder as it fails outside git repos.

## Step 2: Fetch GitHub activity

Run these independent lookups with native tool batching when available:

1. **Events API** — for activity types (pushes, PR opens/closes/merges, reviews, releases, comments):
   `gh api "/users/<username>/events?per_page=100"` filtered by today's date range.
   Note: PR titles come back as null from this API, so use it only for activity types and repo/PR numbers.

2. **Search API — authored PRs** updated today:
   `gh api "search/issues?q=author:<username>+type:pr+updated:<start>..<end>&sort=updated&order=desc"`
   This gives PR titles, URLs, and state.

3. **Search API — reviewed PRs** updated today:
   `gh api "search/issues?q=reviewed-by:<username>+type:pr+updated:<start>..<end>&sort=updated&order=desc"`
   Filter out PRs authored by me — only include PRs by others that I reviewed.

## Step 3: Cross-reference and enrich

For key PRs (especially merged ones or ones needing context), fetch individual PR details if needed:
`gh api repos/<org>/<repo>/pulls/<number> --jq '{title, state, merged_at, body}'`

Use the events API to determine what actions I took (opened, merged, reviewed, pushed to) and the search API for titles/URLs.

## Step 4: Summarize

Write a simple bullet-point list grouped by ticket/project. Match the style and tone of these examples exactly — casual, lowercase-friendly, like a human typed them quickly. No headings, no extra formatting, just bullets.

Examples:
- Released the account settings update to production
- Finished testing the import fix - PR ready to review
- Reviewed pending PRs (list PR numbers or titles)
- Started working on PROJECT-123

- Investigate and fix the CSV import error
- still working on the dashboard fix, hope to have the PR ready by Monday

- Investigate the reporting discrepancy
- Address review comments on the API PR
- Fix account search when the name is numeric - PR released

Include PR links where applicable. Mention if a PR was merged/released.
