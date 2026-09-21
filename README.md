# Coding Agent Skills

My current active collection of reusable skills for coding agents. Each skill lives in its own directory with its instructions in `SKILL.md`.

> **Authorship note:** This is a curated working collection, not a claim that I authored every skill. Some—including Ponytail, `i-have-adhd`, Grill, and others—were created by other authors or adapted from community work; credit and licensing remain with their respective creators.

## Skills

| Skill | Summary |
|---|---|
| [`answer`](./answer/SKILL.md) | Answers questions about repository code and business logic with evidence-backed file and line citations. |
| [`bro`](./bro/SKILL.md) | Re-explains the previous assistant response in simpler, plain language. |
| [`create-pr`](./create-pr/SKILL.md) | Prepares or creates GitHub pull requests, including templates, validation evidence, screenshots, previews, and CI status. |
| [`datadog`](./datadog/SKILL.md) | Searches Datadog logs and traces for user-specified services, environments, incidents, and request IDs. |
| [`find-skills`](./find-skills/SKILL.md) | Discovers, evaluates, and installs existing agent skills for a requested capability. |
| [`grill`](./grill/SKILL.md) | Pressure-tests a design through a repository-grounded, one-question-at-a-time interview and records decisions. |
| [`handover`](./handover/SKILL.md) | Creates a compact `handover.md` containing the session state, decisions, changes, open questions, and next steps. |
| [`i-have-adhd`](./i-have-adhd/SKILL.md) | Switches responses to an ADHD-friendly, action-first format with numbered steps and visible progress. |
| [`jev-browser`](./jev-browser/SKILL.md) | Runs bounded browser tasks with deterministic read phases and TypeSafe Jev selecting page actions. |
| [`local-ui-proof`](./local-ui-proof/SKILL.md) | Exercises a local web UI and produces reproducible, PR-ready browser evidence and screenshots. |
| [`logs`](./logs/SKILL.md) | Fetches and searches CloudWatch logs for user-specified ECS services and Lambda functions. |
| [`ponytail`](./ponytail/SKILL.md) | Applies a persistent minimalism mode that favors deletion, standard-library features, and the smallest working solution. |
| [`ponytail-audit`](./ponytail-audit/SKILL.md) | Audits an entire repository for over-engineering and ranks what to delete or simplify. |
| [`ponytail-debt`](./ponytail-debt/SKILL.md) | Collects deliberate `ponytail:` shortcuts and deferrals into a read-only debt ledger. |
| [`ponytail-gain`](./ponytail-gain/SKILL.md) | Displays Ponytail's published benchmark impact as a compact code, cost, and speed scoreboard. |
| [`ponytail-help`](./ponytail-help/SKILL.md) | Shows a quick-reference card for Ponytail modes, commands, and related skills. |
| [`ponytail-review`](./ponytail-review/SKILL.md) | Reviews a diff specifically for unnecessary complexity, dependencies, abstractions, and dead flexibility. |
| [`shipit`](./shipit/SKILL.md) | Takes an agreed change from Linear issue creation through implementation, verification, commit, push, and pull request. |
| [`super-review`](./super-review/SKILL.md) | Performs an isolated, in-depth PR or branch review without posting comments or mutating the reviewed branch. |
| [`task`](./task/SKILL.md) | Runs repository changes end to end with a definition of done, minimal implementation, real-surface verification, and evidence. |
| [`today`](./today/SKILL.md) | Builds a concise daily team update from the user's GitHub activity. |
