---
name: task
description: >
  Run a repository change end to end — feature, bug fix, chore, refactor,
  migration, or prototype — by naming the definition of done before any edit,
  asking only blocking questions (with defaults), building the smallest change
  that satisfies it, verifying on the real surface with the repository's own
  commands, and handing off with evidence. Use when the user asks to implement,
  fix, refactor, migrate, prototype, or otherwise change a repo and expects it
  done and proven, not just planned.
---

# Task

One loop, six steps, small enough to actually run. Optimised for autonomy: ask
only what blocks, default the rest, disclose what you assumed, and never build
two versions of an undecided thing.

```
1 Frame    say what "done" is, out loud
2 Plan     smallest change, one writer per file
3 Build    reuse before writing
4 Review   two lenses, but only when a trigger fires
5 Verify   the real surface, the repo's own commands
6 Hand off state, evidence, what is still unproven
```

**Size gate.** If the change touches one file, has no public contract,
persistence, security, dependency or cross-repo effect, and needs no user
decision — just do it, run the nearest check, and report in two lines. No frame
block, no record, no planning ceremony. This gate skips *ceremony*; the review
triggers in step 4 still stand on their own.

**Multi-day or multi-repo work:** keep the Frame block, the questions and their
answers, and the evidence in one file — in the user's stated place, else a temp
dir. Never in the repo unless asked.

## 1. Frame — mandatory, before any edit

Emit this, then start:

```
Task:      the request in one line, in your own words
Done when: <observable> + <surface> + <evidence class>
Not doing: the adjacent things you are deliberately leaving alone
Repos:     implementation | contract owner | read-only reference | shared package
Verify:    the exact commands this repo uses — discovered, not assumed
```

**Discover the commands**, never assume them: `AGENTS.md`, `CONTRIBUTING`,
`README`, `Makefile`, `package.json`, CI config. A repo's quirks are part of the
discovery — env hygiene so a mock server matches, one suite per package, or no
suite at all, in which case the done-when names a manual or live probe instead.

**Probe proof-surface access now, not at verify time.** One `curl`, one login
check, one CORS look. The answer changes what "done" means and how early the
user can redirect you. If it is unreachable, say so here and name the cheapest
unblock — a one-time login, a preview deploy, an authorization to push. Keep
building the rest; never fake the boundary.

**Ask only blocking questions, before starting.** Blocking means the answer
changes the definition of done or what you build: a product choice, a contract
shape, a destructive or irreversible step, a missing credential. Every question
carries the default you will take if nobody answers:

```
Q: <question>? Default: <default>. Wrong default costs: <the rework>.
```

Ask once, in one batch, then proceed on the defaults and name which you took.
Never build both branches of an undecided choice. Non-blocking questions — copy,
naming, styling detail, file layout — are yours: pick, state it, move on.

**Definition of done** must be falsifiable and name three things: the surface
(route, endpoint, CLI, file), the evidence class (unit | integration | real
surface | live data), and the pass condition. "Tests pass" is not a definition
of done.

The task type changes only the definition of done:

| Type | Done when must name |
| --- | --- |
| Feature | the new observable behaviour on its real surface, plus what stays unchanged |
| Bug | the reproduction failing before the fix and passing after, on the same input |
| Chore / refactor | the behaviour-preserving proof, and the public shape that did not move |
| Migration | both ends, the order of operations, and the rollback |
| Prototype | the question it settles and the decision it unblocks — no production bar |

## 2. Plan

- The smallest change that satisfies the done-when. Delete or reuse before adding.
- Reuse ladder: this repo → standard library → native platform → already-installed
  dependency → new code. Never add a dependency for what a few lines can do.
- The tree may hold work that is not yours. Never discard, stash-and-forget, or
  reformat it; leave it exactly as you found it.
- One writer per file. Parallel work needs disjoint files or separate worktrees,
  with a named integrator.
- A delegate's brief carries: files it owns, the interface in code, non-goals,
  rejected alternatives with reasons, the exact checks, and the receipt format.
  Its verdict is an input, not a result — re-run or spot-check a sample yourself.

## 3. Build

- Follow the nearest repo instructions; the nearest `AGENTS.md`/`CONTRIBUTING`
  wins on conflict.
- Boring over clever.
- Keep prose small: comments ≤ ~10% of added lines and ≤2 lines each, carrying
  only a *why* the code cannot show — a contract in another repo, a trap, a
  deliberate divergence. No narration, no prose defending a decision.

## 4. Review — gated, and not on everything

Skip this step when **no** trigger below fires. The size gate skips the framing
ceremony, not this: one-file UI change with a delegate's name on it still gets
reviewed.

| Trigger | Why it is there |
| --- | --- |
| Roughly >300 added lines | volume hides duplication and dead flexibility |
| More than one repo, or a shared contract, schema, API or persistence change | mistakes cross boundaries |
| Auth, money, personal data, or anything irreversible or destructive | the cost of being wrong is not a re-run |
| A new dependency, module or directory | new surface someone has to maintain |
| User-visible UI | needs eyes other than the author's |
| The requirement was contested, or you resolved it yourself | your interpretation is the risk |
| A delegate wrote it | volume without authorship |

Two lenses, both on the final diff, before paying for the full suite:

1. **Complexity** — `$ponytail-review` when the host has it. One line per
   finding: what to cut and what replaces it. If the host has no such skill,
   ask the same question yourself and list what could be deleted. A large diff
   that returns no deletions is a signal to look again, not a pass.
2. **Independent review** — one read-only agent in its own session, using the
   model the user named or the host default. No panel. Its brief carries the
   request/requirement/intent, the **non-goals**, the diff, the surrounding files and the evidence,
   and asks for (a) defects with severity and `file:line`, (b) anything to
   delete, (c) what it could not verify. Without the non-goals it will flag
   structure that the requirement specified as waste.

Disposition every finding yourself as `act`, `consider`, or `dismiss`, with a
reason. A reviewer is a lens, not an oracle — check each claim against the code
before acting on it, because a wrong finding costs more than a missed one. If the
reviewer cannot run, disclose that and do a lead-only review rather than
pretending the change was independently checked.

Then re-run only what an accepted fix can affect. A fix that moves a contract
goes back to Frame.

## 5. Verify

- Before building a harness, stub server, mock worker or fixture app to reach
  the surface, check the host's skill registry for one that already does it —
  browser proof, video proof, log or database investigation. Building your own
  is the fallback, not the first move.
- Narrowest check first, then the repo's own gate for the touched area. Run them
  with the commands you discovered at Frame time.
- The evidence class must match the done-when. Unit evidence cannot stand in for
  a real surface. If the required surface cannot run here, say so and name what
  stays unproven — do not quietly substitute a weaker proof.
- **Verify the instrument before blaming the code.** Before reporting a defect,
  reproduce it outside the harness (curl, database, CLI). A harness artifact is
  not a finding.
- Failures you did not cause: compare against a same-environment baseline (stash
  or clean checkout) and report counts, not adjectives.
- Re-run what your change can affect. Do not re-run what it cannot.
- UI work: the browser, on the route, with the visible assertion — not a
  component test standing in for the page.

## 6. Hand off

```
State:      what changed, and for whom
Evidence:   commands and results, or screenshots at absolute paths
Unverified: what you did not prove, and why
Next:       the one action left for the user
```

- Local edits are authorized by the request. Commits, pushes, PRs, uploads,
  deploys, and deletions happen only when asked.
- When the host has a specialist skill for a step — PR creation and its
  conventions, a browser-proof harness, log or database investigation — use it
  instead of improvising that step here.
- Never end a turn mid-work with no statement of state: say what is done, what
  is running, and what you need.
- Leave the workspace clean. Name anything you left running, with how to stop it.

## Autonomy defaults

- Blocking question unanswered, and the default is safe → proceed, disclose.
- Requirement ambiguous → implement the shape this repo's neighbours use.
- The work turns out to need more than the done-when allowed → stop at the safe
  boundary and re-frame. Never widen scope silently.
- Models: pick the user's named one, else whatever the host is configured with.
  This file never names a model. If a requested one is unavailable, disclose it
  instead of silently substituting.
