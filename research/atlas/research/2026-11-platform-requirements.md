# What the platform under the pipeline must do

The checklist a framework or tool must meet to run this pipeline, compiled 2026-11-25 from the model (`model/engine.c4`) and `docs/decisions.md`, after the first live trial on Archon. It is the yardstick for `2026-11-platform-market.md`. "Must" means the pipeline does not work without it; "should" means we can build it on top at a known cost.

## Must

| # | Requirement | Where it comes from |
|---|---|---|
| M1 | **Workflows over agents that we define in our own repository:** our 9 stages and the states in `docs/states.md`; the next step is decided by code from a JSON verdict, never from agent prose; gates enforced in code; fix rounds with a shared limit. **Revised 2026-11-26 (the Operator):** on the platform, a gate enforced in code is required only for merge (the task leaves the merge gate when the pull requests are merged); at the other gates the agent moving the task after the Operator's answer is accepted, so no routing plugin is required | decisions 28, 36, 37, 41 |
| M2 | **Every agent role has its own prompt, its own skills and rules, its own model and its own limits** (time, silence, cost); several model families, so the reviewer is another family than the implementer. **Revised 2026-11-26 (the Operator):** another model of the same family is enough for the reviewer | decisions 22, 29, 67 |
| M3 | **Decision requests the Operator reads and answers in one place:** a rich card (at least markdown with tables and links; better: diagrams, small charts, folded evidence) with the options and their effects on the same card; a recommendation with confidence; free text "other" recorded as a ruling; the same request readable in the tracker and in chat | decisions 11, 12, 32, 38; the trial (2026-11-25) |
| M4 | **Many repositories:** many projects on one install, and one work item that changes several repositories, a PR in each | decision 10; the trial (multi-service items) |
| M5 | **Trackers as intake and mirror:** GitHub Issues and Jira (by API or MCP), labels and comments written once and read back; trust by author before any model reads a request | decisions 5, 39, 44–47 |
| M6 | **Code host:** branches by the team's convention, PRs, CI checks, merge by risk rules or by the Operator; never a push to protected branches by an agent | decisions 6, 24, 25 |
| M7 | **Isolated sessions:** each agent session in its own sandbox or worktree, secrets and egress controlled | decision 21 |
| M8 | **Durable state and long waits:** a run survives restarts, waits days at a gate, at most one run per item and state, a cap on items waiting for the Operator, pause and resume | decisions 9, 30, 43, 45, 54 |
| M9 | **Team server, users and roles:** runs on a server the team reaches; the Operator and others log in; who answered a gate is recorded and checked | decisions 62, 64 |
| M10 | **Ours to change without a fork:** the pipeline's definitions, scripts and UI pieces live in our repository; the platform upgrades without merging our changes into it | the trial; the Operator's rule "no fork to maintain" |

## Should

| # | Requirement | Where it comes from |
|---|---|---|
| S1 | Schedules and triggers: polling or webhooks from trackers, scheduled scouts, the weekly Retro, the daily findings pass | decisions 27, 55, 60 |
| S2 | Traces and provenance: model actually used, cost and time per role, tool calls, kept per item | decisions 29, 59 |
| S3 | Deploy and watch hooks: environments, releases, rollback, a watcher agent | decisions 26, 48–52 |
| S4 | A chat assistant (the Supervisor) that reads the state and files requests, kept away from the Operator's signature | decisions 62–66 |
| S5 | Notifications that reach the Operator (push, chat) with a link to the card | decision 11 |
| S6 | Test harness: workflows run with stub verdicts instead of agents | decision 41 |
| S7 | Self-hosted with a licence that allows it; an active project | decision 54 |

## How a candidate is scored

0 = absent, 1 = possible with substantial work of ours, 2 = present with gaps, 3 = present as needed. A candidate that scores 0 on any "must" without a way to add it in our repository is out. Every score carries its source and the date it was read.
