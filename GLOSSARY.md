# Glossary

Terms used in this project. Stage names follow the convergent pipeline of leading teams; artifact names follow the CDEvents standard (CD Foundation).

## Stages

| # | Stage | What happens | Who |
|---|---|---|---|
| 1 | Intake | A signal becomes a work item; an agent proposes size and risk, the Operator accepts | agent + Operator |
| 2 | Spec | M and L only: what "done" means — acceptance criteria with key examples, constraints | agent, Operator approves |
| 3 | Plan | M and L only: how we do it in slices and how we prove it; for L, codebase research first | agent, Operator approves |
| 4 | Implement | The only agent that changes code writes it, slice by slice, unit tests first, in its sandbox | agent |
| 5 | Checks & review | CI outside the sandbox, then one AI reviewer reads the code, re-checks its findings, gives a pass / fix / block verdict and explains the change | script + agent |
| 6 | Acceptance | A separate Validator, blind to the reviewer's verdict, checks the acceptance criteria on the running app and records evidence | agent |
| 7 | Merge | By risk: R0 merges itself, R1 the Operator on evidence, R2 the Operator reads the code; where a project has a pre-merge environment, the change runs there before it merges | script + Operator |
| 8 | Deploy & watch | What is merged goes out as a release through the project's environments; each environment has its checks (a smoke check, the Watcher's window) and its rollback | script + agent |
| 9 | Learn | Weekly: what repeated twice becomes a rule or check work item; rules that do not pay off are removed | agent |

## Size and risk

| Label | Meaning |
|---|---|
| **S** | Small. The agent reads the code and writes the change; nothing is approved separately |
| **M** | A feature within one module. Spec and plan, the Operator approves |
| **L** | Touches many modules. Plus a codebase research document from a separate pass |
| **R0** | Reversible and does not leave the system (docs, tests). Merges itself and ships with the next release |
| **R1** | Regular code behind checks. The Operator reads the report with evidence and says yes |
| **R2** | Irreversible or leaves the system (migrations, infrastructure, money, secrets). The Operator reads the code |

The agent proposes size and risk at intake; the Operator may correct them.

## Where things live

| Store | What it holds | Today |
|---|---|---|
| Work items | Number, size, risk; shows each item's state, which the engine holds. The pipeline hub for people | GitHub Issues · Jira |
| Pipeline state | Per work item: state, rounds, verdicts, slices, approvals, the approved request text; per project: holds, releases, deployment records, rejected requests, rulings. The truth the pipeline acts on | the engine's own store |
| Specs, plans and decisions | Spec, plan, research document; decision records (ADR) | files in the repo or the work item body |
| Pull requests | Code change, evidence, review findings, verdict, explanation | PR (GitHub) · MR |
| Check results | Test and check output tied to the commit | CI |
| Deployments | Which version runs where and how it ended | Dokploy |

## Who does the work

| Term | What it is | On the diagrams |
|---|---|---|
| **Operator** | The human over the agents: accepts work, decides at gates, reads reports | orange, person icon |
| **Agent** | An LLM that works on its own: reads, writes, calls tools | purple |
| **Script** | A check or action with no LLM. Same input, same answer | green |
| **Gate** | A point where nothing moves without the Operator's decision | red |
| **Store** | Where the state of the work lives outside the agent's head | grey cylinder |
| **Cross-cutting part** | What every stage runs on: orchestrator, sandbox, traces | light blue |

## Part status

| Tag | Meaning |
|---|---|
| `built` | Exists and works today |
| `planned` | Decided to build |
| `idea` | Idea only, no decision |

## Concepts

| Term | What it is |
|---|---|
| **Work item** | A tracked unit of work with one number; everything else links to it (CDEvents: ticket) |
| **Pull request** | A proposed code change on a branch: PR in GitHub, MR in GitLab (CDEvents: change) |
| **PR head** | The last commit of a PR. An approval counts only for the head the reviewer saw |
| **Verdict** | The AI reviewer's decision as schema JSON: `pass`, `fix` or `block`. Code picks the next step from it |
| **Acceptance criteria** | Rules for "done", observable from outside, each with 2–3 key examples: input → expected result, boundary values, what must not happen |
| **Validator** | A separate agent with a fresh context and its own sandbox: checks the acceptance criteria on the running app, records evidence, never edits code |
| **Slice** | A piece of the plan that can be built and checked on its own ("vertical slice"). The Planner cuts the work into slices; each one runs in a fresh Implementer session in its own sandbox; independent slices run in parallel |
| **Blocked by** | A link between slice sub-issues: this slice starts only after that one is done |
| **Frontier** | The slices whose blockers are all done; they can start now, in parallel |
| **Expand–contract** | How to do a wide refactor: add the new form beside the old, migrate callers in batches, delete the old |
| **ADR** | Architecture decision record: what was chosen, why, what was rejected |
| **Sandbox** | A disposable isolated machine per agent session (one per slice, one for the Validator): network closed by default, push only through a proxy to one branch, no merge rights |
| **Orchestrator** | The program that moves a work item along its states, starts every agent session in its own sandbox and enforces the limits (3 fix rounds, time and cost per session, at most 3 items waiting for the Operator) |
| **Project map** | A file in the project's repository that names, for each operation the pipeline needs on the project's tools, the MCP tool and its arguments. Engine code makes the calls; a new project is a new map |
| **Recipe** | A script in the project's repository for an action too long for the map, such as a deploy through a CI server |
| **Setup agent** | The agent that composes a project's map when the project is connected, read-only, and proposes a fix when the map stops working |
| **Environment** | A place a version runs. Kinds: shared (one build at a time), ephemeral (one per change), production. A project lists its environments in order, per service |
| **Version** | An immutable reference to what runs: a git tag or commit |
| **Candidate** | What runs on a pre-merge environment: the base branch with the item, or the items of one build, merged in |
| **Promotion** | Putting a version into an environment; leaves a deployment record with a reason (normal, rollback) |
| **Release** | The step that takes what is merged to production, and its record: the version and the list of items it carries |
| **Environment gate** | A person's approval of a candidate on a pre-merge environment, bound to the candidate's git tree; exists only where a project declares it |
| **Hold** | An item's claim on a shared environment for one service, recorded in the engine; other items of that service queue behind it |
| **Insignificant paths** | Paths a project lists (a changelog, a version file, docs) whose differences between the approved tree and the merged one are shown apart |
| **Urgent** | The Operator's mark on a work item: first in every queue, and a release starts as soon as it merges |
| **Decision requests** | The only channel through which the pipeline asks the Operator anything: gates, questions, reports, the weekly summary |
| **Pause** | The Operator's switch that stops new agent sessions; running ones finish to their next state |
| **Traces** | A record of every agent session: steps and tool calls, verdicts, time, cost, Operator time |
| **Rollback** | Taking a failed release back: by reverting the culprit, by deploying the previous verified version, or, where nothing can be redeployed, forward only. Engine code does it on the Watcher's call or a red smoke check; database migrations are never rolled back, only fixed forward |
| **Watch window** | How long the Watcher watches a fresh deploy before the work item is Done (30 min by default, longer for R2); one of the checks an environment may declare |
| **Smoke check** | A real input sent through the system right after a deploy and traced to its result; one of the checks an environment may declare |
| **Atlas** | The knowledge base in `research/atlas/`: what the world knows about each stage (areas S0–S18, X1–X11) |
