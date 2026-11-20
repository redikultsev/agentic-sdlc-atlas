# Pipeline design decisions

What was decided and why. A new decision is a new row; a changed one is edited in place with the revision date; a cancelled one is marked "cancelled" with the reason, never deleted.

Basis: research on how leading teams build agentic pipelines (`research/atlas/research/2026-11-how-leaders-build-pipelines.json`): nine stages that Stripe, Anthropic, Spotify, Google, Cognition, AWS AI-DLC and others converge on, and an artifact chain named after the CDEvents standard.

| # | Question | Decision | Rejected | Why | Date |
|---|---|---|---|---|---|
| 1 | Where the main human gates sit | On the spec and plan, before code. Merge by risk class | Every PR (Stripe, Spotify, GitHub); merge with no human (OpenAI, Cognition) | A wrong idea is cheaper to catch before code (HumanLayer, Factory, AWS AI-DLC). Operator attention is the scarcest resource | 2026-11-20 |
| 2 | How heavy the spec is | By work item size. The agent always reads the code and plans; size decides what is written down and what the Operator approves. S: straight to code; M: spec and plan; L: plus a codebase research document | Always full; always light | AWS and HumanLayer moved to adaptive depth themselves; heavy specs are slower than code on small tasks (Thoughtworks) | 2026-11-20 |
| 3 | What to look at before merge | Evidence: check output, screenshots, video. Code only for risky changes | Always the code (Osmani, Willison) | How Cognition and Cursor work | 2026-11-20 |
| 4 | Where the pipeline hub is | The tracker: spec, agent sessions and PRs link to the work item number | Chat and sessions; files in the repo | With many parallel agents you can see what is in progress and what is stuck | 2026-11-20 |
| 5 | Tracker | Two from day one: GitHub Issues and Jira, behind a common "work items" layer; each tool is an adapter | GitHub Issues only; Linear; a custom one | Different projects use different trackers | 2026-11-20 |
| 6 | How to merge by risk | R0 merges itself on green checks and AI review; R1 the Operator merges on evidence; R2 the Operator reads the code | Everything through the Operator, auto-merge later | Anthropic and Intercom do this (19% of PRs with no human) | 2026-11-20 |
| 7 | Who sets size and risk | The agent proposes with a reason; the Operator corrects when accepting the work item | The Operator alone; the agent alone | One action, but an agent underestimate does not slip through | 2026-11-20 |
| 8 | When a change goes to production | R0 and R1 right after merge; a watcher compares metrics and proposes a rollback. R2 the Operator deploys | Every deployment on a yes | R1 was already approved at merge; a second click adds nothing | 2026-11-20 |
| 9 | How many work items in parallel | At most N (start with 3) wait for the Operator at once; beyond that new ones do not start | A hard agent limit; no limit | The bottleneck is attention: one person actively supervises 2–4 agents (atlas X10) | 2026-11-20 |
| 10 | Which repositories first | Personal and work ones at once | One first, then expand | Consequence: nothing leaves work repositories; the engine leaves no files of its own in them | 2026-11-20 |
| 11 | How the pipeline talks to the Operator | By universal presentation rules: decision type sets the depth, a real before/after case is mandatory, "not verified" on top, form chosen by the task. Recommendation first for small decisions, after the facts for big ones | Card templates for 7 decision types; a one-line question | Research on presenting decisions (`research/atlas/research/2026-11-decision-presentation.json`) | 2026-11-20 |
| 12 | Where the Operator works with the pipeline | Claude Desktop for now | — | The engine is not chosen yet | 2026-11-20 |
| 13 | Language | Everything in the project in English: model, docs, deck, research | Russian | The material is shown to colleagues | 2026-11-20 |
| 14 | Specs and decisions store | Holds per work item spec, plan and research, and per project decision records (ADR). Interviewer and Planner read past decisions; Implementer reads the plan; AI review reads the spec | A separate ADR store; no decision log (rules in AGENTS.md only) | One store keeps the overview simple; without ADRs the "why" behind old choices is lost | 2026-11-20 |
| 15 | Fix rounds before Blocked | At most 3 rounds of fix after red checks, then the work item is Blocked and waits for the Operator | 2 rounds | Matches the work item states; a common cap in the researched pipelines | 2026-11-20 |
| 16 | Several agents on one work item | One fresh Implementer session per slice. Slices with no dependency and no shared files run in parallel, each in its own worktree; the rest in plan order. The Orchestrator merges slice branches; a conflict goes back to the Implementer | Sequential only; a free-form team of agents | Faster on big work items; dependencies and file overlap are declared in the plan, so code, not an agent, decides what runs in parallel. Parallel agents on shared code make clashing decisions (Cognition) | 2026-11-20 |

## Open

- Which engine to build on: our own on top of an existing one, or an existing one only if it fits completely.
- Work item states and transitions: draft in `docs/states.md`, awaiting approval.
