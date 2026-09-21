---
name: grill
description: Stress-test a plan through a one-question-at-a-time design interview grounded in the repository's domain language, code, CONTEXT.md, and ADRs, updating domain documentation as decisions become explicit. Use when the user asks to grill, challenge, sharpen, or pressure-test a design or implementation plan before work begins.
---

# Grill

Challenge the plan until its terminology, constraints, behavior, and tradeoffs are explicit enough to implement safely.

## Working style

- Ask one decision-bearing question at a time and wait for the user's answer.
- Give a recommended answer with each question and explain the decisive tradeoff briefly.
- Resolve questions from repository evidence yourself before asking the user.
- Use concrete scenarios and edge cases to expose ambiguity.
- Track earlier answers so later questions do not reopen settled branches without new evidence.
- Prefer the smallest question that unblocks the next dependency in the design tree.

## Establish context

Before the first substantive question:

1. Read the plan or requirement being challenged.
2. Inspect applicable `AGENTS.md`, `CONTEXT.md`, `CONTEXT-MAP.md`, nearby ADRs, and relevant code/tests.
3. Identify overloaded terms, undocumented assumptions, architectural constraints, external contracts, migration concerns, and validation gaps.

If the user's statement conflicts with code or documentation, cite the conflict and ask which source represents the intended behavior.

## Domain language

- Use existing canonical terms from the relevant `CONTEXT.md`.
- When a term is vague or overloaded, propose one precise meaning and contrast it with the alternatives.
- When the user resolves a domain term, update the relevant `CONTEXT.md` during the session if that documentation change is in scope.
- Do not couple domain definitions to implementation details.
- For multi-context repositories, use `CONTEXT-MAP.md` to place terms in the owning context.

Read [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md) before creating or restructuring a context file. Create documentation lazily, only after a real term or relationship has been resolved.

## ADRs

Offer an ADR only when the decision is:

1. costly to reverse;
2. surprising without its rationale; and
3. the result of a real tradeoff.

Read [ADR-FORMAT.md](./ADR-FORMAT.md) before writing one. Do not create ADRs for temporary priorities, obvious choices, or implementation trivia.

## Completion

Finish when the plan has explicit goals, non-goals, canonical terms, key scenarios, boundaries, risks, and validation expectations—or when the remaining question requires outside authority. Summarize the decisions, documentation changes, unresolved questions, and the next implementation step.
