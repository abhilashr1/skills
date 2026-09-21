---
name: answer
description: Answer questions about the current repository's codebase or business logic with evidence-backed file:line citations. Use when the user asks how code works, where logic lives, why behavior happens, what business rules apply, or needs targeted investigation across related sibling repositories.
---

# Answer codebase questions

Answer from inspected source with tight, absolute file:line links. Stay read-only unless edits are requested. Distinguish current behavior, test expectations, intended rules, and historical rationale.

## Investigation

1. Reuse repository orientation and cited evidence from this task. Verify changing branch/dirty state once when relevant; do not fetch, clone, create a worktree, or reread every orientation document for an ordinary local question. Honor requests for latest or a specific revision.
2. Identify the question's domain terms and likely symbols. Read applicable repository instructions, then only the relevant context doc or manifest. Load ADRs only for a decision the question touches.
3. Batch independent, scoped `rg -n` searches. Exclude generated/dependency directories. Inspect the entrypoint and the minimum caller, rule, storage, or test excerpts needed to establish the answer. Follow additional edges only if they could change the conclusion.
4. Search sibling repositories only when an import, contract, route, schema, or explicit user scope points to them. Choose candidates before searching; do not scan the entire parent directory.
5. Stop when the requested behavior and material exceptions have direct evidence. Read exact surrounding lines once for citations; `scripts/line-ref.py` is available relative to this skill when useful. Do not duplicate an operator's search: verify the decisive excerpts instead.

Lead with the answer, then enough cited reasoning to support it. Mention material gaps and what remains unknown. Avoid a duplicate Sources section when citations are already inline. Never invent a citation or treat a worker's conclusion as source evidence.

## Output format

Do not output the answer in a long essay. Use the i-have-adhd skill to display the output in brief understandable answer, but be ready to elaborate only if asked. 