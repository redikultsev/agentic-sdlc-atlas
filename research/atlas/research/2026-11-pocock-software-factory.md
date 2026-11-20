# Matt Pocock's skills: triage, tickets, software factory

Source: https://github.com/mattpocock/skills (commit abeeaf9, 2026-11-19): `skills/engineering/triage`, `skills/engineering/to-tickets`, `skills/in-progress/software-factory` (marked in progress). Read 2026-11-20.

## What they say

**Triage.** Every issue gets one category (bug, enhancement) and one state: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. Before recommending, the agent checks the behaviour is not already implemented (and says where it looked), reads a register of previously rejected requests (`.out-of-scope/`), and verifies the claim: reproduces a bug, runs a PR's tests. Ready-for-agent gets a durable agent brief; ready-for-human says why it cannot be delegated; needs-info lists specific questions for the reporter.

**To tickets.** A plan becomes tracer-bullet vertical slices: each cuts a narrow, complete path through every layer, is verifiable on its own and fits one fresh context window. Each ticket declares its blocking edges ("blocked by"), published as native blocking links or sub-issues in the tracker. Agents work the frontier: tickets whose blockers are all done. Wide refactors are the exception: expand, migrate in batches, contract.

**Software factory.** Vocabulary: task, trigger, run, runner, ticket tracker, ticket source, git host, orchestrator, observability platform. A run never waits for a human: it ends, and the human's later change in the tracker triggers a new run. Three brakes: automated checks, automated review, human review; add triggers one at a time, throttled; cap every loop at a few tries. Every task answers five questions: what triggers it, what it reads and writes, what it triggers next, where a human re-enters, what stops two runs doing the same work.

## What we took (decisions 16–19)

1. Slices as sub-issues with "blocked by" links; the Orchestrator works the frontier.
2. Triage checks already built, rejected before, reproduces bugs; outcomes for agent, for a human, won't do. We dropped needs-info: agents do not ask people questions (decision 19).
3. The five questions as a check over the whole model after the deck walkthrough.
