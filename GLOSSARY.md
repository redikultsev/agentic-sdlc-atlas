# Glossary

Terms used in this project. Stage names follow the convergent pipeline of leading teams; artifact names follow the CDEvents standard (CD Foundation).

## Stages

| # | Stage | What happens | Who |
|---|---|---|---|
| 1 | Intake | A signal becomes a work item; an agent proposes size and risk, the Operator accepts | agent + Operator |
| 2 | Spec | M and L only: what "done" means — acceptance criteria with key examples, constraints | agent, Operator approves |
| 3 | Plan | M and L only: how we do it in slices and how we prove it; for L, codebase research first | agent, Operator approves |
| 4 | Implement | The only agent that changes code writes it, slice by slice, unit tests first, in its sandbox | agent |
| 5 | Self-verify | CI outside the sandbox, then a separate Validator checks the acceptance criteria on the running app and records evidence; rounds are capped | script + agent |
| 6 | AI review | Reviewer agents and a judge with a pass / fix / block verdict | agents |
| 7 | Merge | By risk: R0 merges itself, R1 the Operator on evidence, R2 the Operator reads the code | script + Operator |
| 8 | Deploy & watch | R0 and R1 right away, R2 on a yes; a watcher compares metrics before and after | script + agent |
| 9 | Learn | Mistakes and corrections become new work items, checks and rules | agent, Operator chooses |

## Size and risk

| Label | Meaning |
|---|---|
| **S** | Small. The agent reads the code and writes the change; nothing is approved separately |
| **M** | A feature within one module. Spec and plan, the Operator approves |
| **L** | Touches many modules. Plus a codebase research document from a separate pass |
| **R0** | Reversible and does not leave the system (docs, tests). Merges and deploys itself |
| **R1** | Regular code behind checks. The Operator reads the report with evidence and says yes |
| **R2** | Irreversible or leaves the system (migrations, infrastructure, money, secrets). The Operator reads the code and deploys |

The agent proposes size and risk at intake; the Operator may correct them.

## Where things live

| Store | What it holds | Today |
|---|---|---|
| Work items | Number, size, risk, state. The pipeline hub | GitHub Issues · Jira |
| Specs, plans and decisions | Spec, plan, research document; decision records (ADR) | files in the repo or the work item body |
| Change sets | PR, reviews, verdicts | PR (GitHub) · MR |
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
| **Change set** | A proposed modification on a branch: PR in GitHub, MR in GitLab (CDEvents: change) |
| **PR head** | The last commit of a PR. An approval counts only for the head the reviewer saw |
| **Verdict** | The judge's decision as schema JSON: `pass`, `fix` or `block`. Code picks the next step from it |
| **Acceptance criteria** | Rules for "done", observable from outside, each with 2–3 key examples: input → expected result, boundary values, what must not happen |
| **Validator** | A separate agent with a fresh context and its own sandbox: checks the acceptance criteria on the running app, records evidence, never edits code |
| **Slice** | A piece of the plan that can be built and checked on its own ("vertical slice"). The Planner cuts the work into slices; each one runs in a fresh Implementer session in its own sandbox; independent slices run in parallel |
| **Blocked by** | A link between slice sub-issues: this slice starts only after that one is done |
| **Frontier** | The slices whose blockers are all done; they can start now, in parallel |
| **Expand–contract** | How to do a wide refactor: add the new form beside the old, migrate callers in batches, delete the old |
| **ADR** | Architecture decision record: what was chosen, why, what was rejected |
| **Sandbox** | A disposable isolated machine per agent session (one per slice, one for the Validator): network closed by default, push only through a proxy to one branch, no merge rights |
| **Orchestrator** | The program that moves a work item through the stages |
| **Traces** | A record of what the agent did: calls, decisions, cost |
| **Rollback** | Return to the previous version after a failed rollout |
| **Atlas** | The knowledge base in `research/atlas/`: what the world knows about each stage (areas S0–S18, X1–X11) |
