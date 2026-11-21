# Choosing the engine

Research date: 2026-11-21. We looked for anything that could run our 9-stage pipeline, whole or in parts: finished engines, coding-agent platforms, workflow foundations to build on, and components for the four engine parts: Orchestrator (O), Sandbox (S), Decision requests (D), Session traces (T). Discovery covered 8 angles (whole engines, coding-agent platforms, durable workflow foundations, agent frameworks, sandboxes, tracing, human-in-the-loop channels, tracker bridges and stage tools), plus 10 repositories given for review and a completeness critic that hunted for missed categories. In total we read 323 candidates, from READMEs, docs, code and `gh api` metadata. We then re-checked the 12 strongest candidates with two skeptics each: one checked claims against the code, the other checked operability (license, self-hosting, maintenance, lock-in). Scores run from 0 (absent) to 3 (meets our spec with no work). Where a skeptic corrected a score, this file uses the corrected score. Scores marked "single read" were not re-checked.

## Answer

1. **No finished engine runs this pipeline. We write the Orchestrator ourselves on Temporal and assemble S, D and T from components.** None of the 12 re-checked candidates reaches 3 on any part. None of them takes items from both GitHub Issues and Jira and moves them through our 15 states with tracker labels. None has a built-in deploy Watcher that rolls back by itself, a weekly Retro, or a cap of 3 items waiting for the Operator (tables below; every row cites its source).
2. **Our spec is unusual mainly in O, so O is the part we must own.** Every engine models its own run or board and not our work item: Kraft has 9 fixed statuses ([statuses](https://github.com/itsOmidKarami/kraft/blob/main/docsite/content/5.reference/02.statuses.md)), MAIster a "Backlog | In Flight" board (docs/PRODUCT_VIEW.md), Fabro a run graph ([how-fabro-works](https://github.com/fabro-sh/fabro/blob/main/docs/public/core-concepts/how-fabro-works.mdx)). Bending any of them to our states, labels, shared fix-round limit and slice frontier means forking a young codebase with one main author.
3. **Temporal is the foundation for O.** It is MIT and mature (24,524 stars, v1.32.2 on 2026-11-02), and both skeptics confirmed its primitives: one workflow per item keyed by tracker id, durable waits of days on Signals and Updates, Activity timeouts, cancellation ([docs.temporal.io](https://docs.temporal.io/workflow-execution)). Three caveats. Its Claude Agent SDK integration is an alpha 0.0.3 package, so we do not depend on it. Workflow pause is experimental and off by default, so the global pause is our own flag. The ops footprint of a single-node server is not verified ([temporalio/ai-integrations](https://github.com/temporalio/ai-integrations), [service.proto](https://github.com/temporalio/api)).
4. **S: OpenSandbox for isolation, plus a small push proxy of our own.** OpenSandbox is the only candidate that scored 3 on the sandbox part: Apache-2.0, default-deny egress sidecar with FQDN rules, credential vault, gVisor, Kata or Firecracker runtimes, on Docker or Kubernetes ([OpenSandbox](https://github.com/opensandbox-group/OpenSandbox)). That score is a single read, not re-checked. No candidate ships a git push proxy limited to one branch as a separate product, so we write one.
5. **D: our own MCP server for Claude Desktop, with ntfy for the alert.** MCP Apps can draw a decision card (options plus evidence) inside Claude, but only after the model calls a tool, so we need a separate push alert ([ext-apps](https://github.com/modelcontextprotocol/ext-apps)). MCP elicitation does not work in Claude Desktop chat yet: feature request [claude-ai-mcp#153](https://github.com/anthropics/claude-ai-mcp/issues/153) is open. The cap of 3 waiting items lives in O.
6. **T: Claude Code's built-in OpenTelemetry plus our own spans, stored in self-hosted Langfuse.** Claude Code already exports cost, tokens, tool results and (beta) trace spans ([monitoring-usage](https://code.claude.com/docs/en/monitoring-usage)). Verdicts, fix rounds, state changes and Operator time are ours to emit. The six-metric weekly summary is a scheduled job of ours.
7. **Runner-up: pin one version of Kraft and build an outer layer around it.** Kraft is the closest match to stages 2–7. Gates are enforced in code, the next step comes from a JSON result file, it caps time, tokens and dollars, and it has a per-session egress proxy where only the server pushes ([kraft docs](https://github.com/itsOmidKarami/kraft/tree/main/docsite/content)). We would take this route only if building O on Temporal turns out too slow. The risks: one maintainer, created 2026-09-09, about 120k non-blank lines of Python, and breaking changes between minor versions.
8. **From the given list, none is the engine.** sandcastle is the most useful as a component: a TypeScript library that runs an agent CLI in a pluggable sandbox and returns typed output. cezar and LoopForge are worth copying for their designs, but both score 1 on the sandbox part.

## Verdict: the recommended stack

### Orchestrator (O): ours, on Temporal

**What we use**
- Temporal server (MIT) and one SDK, Python or TypeScript ([temporal](https://github.com/temporalio/temporal)). Picking the language is a separate decision. TypeScript would let us reuse sandcastle as the session runner.
- Agent sessions as Activities. Claude Code runs headless (`claude -p`, JSON output) or through the Claude Agent SDK for 8 of the 9 roles ([claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python)). The Agent SDK exposes `max_turns`, `max_budget_usd` and JSON-schema `output_format`.
- The cross-family reviewer runs on OpenAI Codex CLI `codex exec --output-schema` (Apache-2.0), which forces its final answer into our JSON verdict schema ([openai/codex](https://github.com/openai/codex)).
- Tracker I/O: GitHub REST/GraphQL for labels, sub-issues and blocked-by links, and the Jira REST API for transitions and labels. [github-mcp-server](https://github.com/github/github-mcp-server) (MIT) and [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) (MIT) cover the same calls and can serve as reference or as agent tools.

**Why**
- The parts of the spec that no engine has are all O logic: 15 states mirrored to labels in two trackers, one shared limit of 3 fix rounds, a time or cost limit hit counting as a failed round, a slice frontier from blocked-by links, a global pause, and at most 3 items waiting for the Operator. Each of the 12 re-checked candidates lacks most of these (see the gaps column).
- Temporal supplies the parts we should not write: durable state, retries, timers, waits that last days, cancellation and an event history per item. Both skeptics confirmed these in released code and docs.

**What we write**
- The state machine as a data table, with transition guards in code.
- Pydantic or zod schemas for each role's verdict, so code picks the next step from validated JSON and never from prose.
- The fix-round counter, and limits that turn into failed rounds.
- The rule of at most one session per item and state: the Workflow Id is the item key, and each state has one Activity.
- The frontier scheduler, the global pause flag, cancel from any state, label sync, and the R0 auto-merge rule check.

**Designs we copy**
- LoopForge's gate MCP: the agent must submit one decision `pass|rework|fail|human` plus `actionRequired` ([gatemcp/server.go](https://github.com/Tencent/LoopForge/blob/main/internal/gatemcp/server.go)).
- Fabro's `output_schema` routing, which repairs malformed JSON up to `output_retries` times ([outputs.mdx](https://github.com/fabro-sh/fabro/blob/main/docs/public/agents/outputs.mdx)).
- Kraft's per-scope caps, which stop at the first bound to run out ([caps-and-budgets.md](https://github.com/itsOmidKarami/kraft/blob/main/docsite/content/2.concepts/2.caps-and-budgets.md)).
- Mastra Factory's park after 3 review rounds (`SELF_REVIEW_ROUND_LIMIT = 3`, src/rules/types.ts in [mastracode/factory](https://github.com/mastra-ai/mastra/tree/main/mastracode/factory)).

**Known costs**
- Determinism rules and workflow versioning ([integration docs](https://docs.temporal.io/develop/python/integrations/claude-agent-sdk)).
- Secrets must stay out of Event History, which needs a payload codec.
- Long sessions need Continue-As-New.

### Sandbox (S): OpenSandbox plus our push proxy

**What we use**
- [OpenSandbox](https://github.com/opensandbox-group/OpenSandbox) (Apache-2.0, 17,745 stars, release 1.3.0-rc.2 on 2026-11-19). It has a lifecycle server on Docker or Kubernetes, an egress sidecar with default-deny FQDN/IP rules and a Credential Vault, and optional gVisor, Kata or Firecracker runtimes.
- GitHub branch rulesets as a second wall ([rulesets docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)).
- Short-lived, repo-scoped GitHub App tokens held by the proxy, never by the sandbox. [Octo STS](https://github.com/octo-sts/app) shows the pattern, but it cannot scope a token to one branch.

**Why**
- Among the engines, the best sandboxes score 2 (Kraft, Fabro). In every engine that scores 1, the agent can reach a token that is not limited to one branch:
  - LoopForge: credential relay (run_git_credentials.go)
  - agent-swarm: installation tokens for any registered repo ([github.mdx](https://github.com/desplega-ai/agent-swarm))
  - Mastra Factory: `GH_TOKEN` in the sandbox plus a merge tool (src/workspace.ts, source-control-tools.ts)
  - cezar: the host's `gh` login ([reference.md](https://github.com/open-mercato/cezar/blob/main/docs/reference.md))
- Of the sandbox components, OpenSandbox is the only one with closed-by-default egress, credential injection and a choice of VM-grade runtimes in one self-hostable package.

**What we write**
- A small git smart-HTTP proxy, reachable from the sandbox through the egress allow-list. It reads the ref-update commands at the start of a `git-receive-pack` request, rejects any ref other than `refs/heads/<slice-branch>`, rejects deletions, and forwards the push with its own token.
- Kraft's server-side ref move and Blazity's trusted publisher implement the same rule after the session (where-a-step-runs.md; trusted-workspace-publisher.ts). Strands Box and OpenShell note that their HTTP-layer rules cannot see git refs, which is why the proxy has to read the receive-pack request itself ([strands-agents/box](https://github.com/strands-agents/box), [openshell](https://github.com/ai-openshell/openshell)).
- Session lifecycle: create, then run, then always destroy. OpenSandbox gives the calls; the guarantee is our code.

**Fallbacks**
- [E2B runtime](https://github.com/e2b-dev/runtime) (Apache-2.0, Firecracker, nftables egress with domain allow-lists, secret-injecting egress proxy).
- [microsandbox](https://github.com/superradcompany/microsandbox) (libkrun microVMs; network is open by default, so we must set a policy every time).
- [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) (deny-by-default proxy, but proprietary and breaking changes in almost every minor version).

### Decision requests (D): ours, delivered through MCP to Claude Desktop

**What we use**
- An MCP server of our own with list, get and answer tools.
- An [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) card (spec 2026-01-26 is Stable; the README lists Claude as a client) that draws the decision, the options and links to evidence.
- [ntfy](https://github.com/binwiederhier/ntfy) (Apache-2.0, self-hosted) to send the "a request is waiting" push, with a link and up to three buttons.

**Why**
- Every engine keeps gates in its own web inbox. A few also expose MCP gate tools: Fabro `fabro_run_interact`, Kraft `approve_gate`, MAIster `hitl_respond`, fishhawk `fishhawk_approve_plan`. None formats a request as decision, options and evidence across gates, business questions and reports. None caps waiting items. None sends a weekly summary.
- MCP elicitation would be the native channel, but Claude Desktop chat does not support it ([claude-ai-mcp#153](https://github.com/anthropics/claude-ai-mcp/issues/153)). Under the 2026-07-28 MCP spec it also cannot push to an idle client ([elicitation spec](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)).

**What we write**
- The decision-request record and its lifecycle: open, answered, expired.
- The cap of 3 in O.
- The answer path into Temporal Updates. Their validators reject an answer that is not one of the offered options.
- The weekly summary as a request of type "report".

### Session traces (T): Claude Code OpenTelemetry, our spans, Langfuse

**What we use**
- Claude Code's built-in OTLP exporter. Metrics and events are stable. Traces are beta and need `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` ([monitoring-usage](https://code.claude.com/docs/en/monitoring-usage)).
- Codex `--json` usage events for the reviewer ([openai/codex](https://github.com/openai/codex)).
- The OpenTelemetry GenAI conventions for span names, all still at Status: Development ([semantic-conventions-genai](https://github.com/open-telemetry/semantic-conventions-genai)).
- Self-hosted [Langfuse](https://github.com/langfuse/langfuse) as the store. Code outside its `ee/` folders is MIT, and the core features work without a license key ([LICENSE](https://github.com/langfuse/langfuse/blob/main/LICENSE)).

**Why**
- Langfuse is the most mature open trace store we read: 37,690 stars, releases every few days. It has sessions, tags, per-observation cost and a Metrics API v2.
- No backend models our work item, verdict or Operator time natively, so the backend choice matters less than the attributes we send.

**What we write**
- Orchestrator spans with our own `pipeline.*` attributes: work item number, stage, state, verdict, fix round, limit hit, Operator wait.
- Propagation of the item number into each session, through `OTEL_RESOURCE_ATTRIBUTES`.
- A Temporal Schedule that computes the six weekly metrics from Langfuse and our database.

**Fallbacks**
- [Opik](https://github.com/comet-ml/opik): Apache-2.0 for the whole platform, with a first-party Claude Code plugin.
- [Phoenix](https://github.com/Arize-ai/phoenix): Elastic License 2.0.

### Runner-up stack: Kraft at its core

| Part | What we use | What we write |
|---|---|---|
| O | [Kraft](https://github.com/itsOmidKarami/kraft) pinned to one version. It runs spec and plan gates, implement, a verify fix loop with a judge, review gates, a draft MR, waiting for CI, merge queue or train, and post-merge CI. | An outer service that pulls items from GitHub Issues and Jira into Kraft through `POST /api/triggers`, maps Kraft's 9 statuses to our 15 states and labels, and runs Triage, Deploy & watch and Retro as separate steps. It also counts a cap hit as a failed round (Kraft stops for a person instead), adds a global pause (Kraft pauses only per item), and enforces the cap of 3. |
| S | Kraft's container sandbox: per-session egress proxy, deny-all under a `network:` policy, credentials injected by the proxy, and the server as the only pusher and merger ([sandbox docs](https://github.com/itsOmidKarami/kraft/tree/main/docsite/content/5.reference/03.configuration/10.sandbox)). | Make the sandbox mandatory. A fresh install has none, and an unsandboxed agent runs as the user (6.project/1.security.md). Recreate HOME for each session. |
| D | Kraft's MCP tools `approve_gate`, `reject_gate` and `get_gate_artifact`, plus its notify.yaml webhook. | Options-and-evidence requests and the weekly summary. Kraft decisions are only approve or reject plus a note. |
| T | Kraft's analytics: lead time, time waiting on the Operator, cost per node, repairs, wait per gate. | OTel export, which Kraft lacks, keyed to tracker numbers. |

We would pick this stack if speed matters more than control. The risk is ownership. Kraft has one maintainer (1,411 human commits; the next person has 12), no production users (PRODUCT.md), and about 148k lines of Python, 119k of them non-blank and non-comment. Version 2.6 already refuses some chain overrides that 2.5 accepted. Fabro would be the alternative core for this route. Its O runtime is equally close, but it is a "research preview" with nightly releases only and Segment telemetry on by default ([security.mdx](https://github.com/fabro-sh/fabro/blob/main/docs/public/administration/security.mdx), lib/foundation/fabro-telemetry).

## Whole engines compared

Scores after the two skeptic checks. O/S/D/T are each 0–3. "Self-host" means running on our own machine or server.

| Name | What it is | O | S | D | T | License | Self-host | Maturity (2026-11-21) | Why not / why |
|---|---|---|---|---|---|---|---|---|---|
| [Kraft](https://github.com/itsOmidKarami/kraft) | Local single-user Python orchestrator that drives agent CLIs through a YAML chain from spec to post-merge CI | 2 | 2 | 2 | 2 | Apache-2.0 | Yes, one loopback process, macOS/Linux only | 14 stars, created 2026-09-09, v2.6.0 on 2026-11-13, one maintainer, about 148k lines | **Why:** closest to stages 2–7: gates enforced in code, JSON result file decides the next step, caps on time, tokens and dollars, per-session egress proxy. **Why not:** no GitHub Issues or Jira intake, no labels, no triage, deploy or retro, 9 fixed statuses, a cap hit stops for a person, no global pause, unsandboxed by default |
| [Fabro](https://github.com/fabro-sh/fabro) | Rust server that runs coding-agent workflows written as Graphviz DOT graphs, in Docker or Daytona sandboxes | 2 | 2 | 2 | 2 | MIT (dependencies Apache-2.0/MIT) | Yes, one binary or Docker, single-tenant | 1,876 stars, nightly prereleases only, one author with about 4,650 of 5,500 commits | **Why:** routing on validated JSON with repair, `max_visits` loops, fail-closed gates, gates answerable over MCP, usage per stage and model. **Why not:** tracker crate not wired in, Jira "Coming Soon", checkpoint token passed into the sandbox, network `allow_all` by default, Segment telemetry on by default, no cost cap, no global pause |
| [MAIster](https://github.com/maister-dev/maister) | TypeScript control plane with typed Flow graphs over ACP agents | 2 | 1 | 2 | 2 | MIT | Yes, single host only (architecture.md) | 10 stars, no tags, beta, one author with 2,876 of 2,939 commits | **Why:** `decide` routing on schema-checked output with an allow-list, bounded rework loops that end at a human node, budget ladder, MCP facade aimed at Claude Desktop. **Why not:** agents started with `child_process.spawn` on the host, no deploy, no tracker write-back, no Jira, cost in tokens only |
| [fishhawk](https://github.com/kuhlman-labs/fishhawk) | Go control plane: plan, implement, review, acceptance, merge queue, deploy, post-deploy verify, with signed traces | 2 | 1 | 2 | 2 | Apache-2.0 | Single machine only in alpha (ADR-080) | 9 stars, no releases or tags, alpha, outside feature PRs not accepted | **Why:** closest concept (one developer runs a repo like a team), MCP gate verbs, Ed25519-signed traces and a hash-chained audit log. **Why not:** implementer agents run unconfined (ADR-028/149), Jira cannot be an intake source, token limits unenforced, no global pause, rollback only when the operator triggers it |
| [agent-swarm](https://github.com/desplega-ai/agent-swarm) | TypeScript/Bun lead and workers, DAG workflow engine, runtime pools, tracker integrations | 2 | 1 | 2 | 2 | MIT | Yes, compose (16 services) or Helm | 1,094 stars, daily releases, mostly bot-authored commits | **Why:** its "Software Factory" playbook is close to stages 1–5; per-session cost and OTel tagged with task id. **Why not:** budgets are daily, not per session; fix caps live in prompts; write token for any registered repo; agent egress open; telemetry on by default; unanswered approvals cancel the run after 7 days |
| [cezar](https://github.com/open-mercato/cezar) | TypeScript cockpit that drives logged-in agent CLIs, one worktree per task, YAML graphs | 2 | 1 | 2 | 2 | MIT | Yes, localhost or a VPS installer behind nginx basic auth | 1,117 stars, weekly minor releases, two maintainers | **Why:** graph with verdict ports, `fork`/`join`, runner and model per node. **Why not:** no sandbox (host shell and host `gh` login), verdict is a `CEZ:VERDICT` text token, gate replies read by an agent, Jira Cloud only, default phone relay not self-hosted |
| [LoopForge](https://github.com/Tencent/LoopForge) | Go and React SOP DAG platform with Docker sandboxes and a needs-review inbox | 2 | 1 | 2 | 2 | MIT (GitHub shows NOASSERTION) | Yes, Docker Compose and MySQL; mounts the host Docker socket | 5,350 stars, about 10 releases in two weeks, mirror of a private upstream | **Why:** gate MCP with `pass|rework|fail|human` is exactly our verdict pattern. **Why not:** agents get a GitHub token through a credential relay, sandboxes share the Compose network, no Jira, no label write-back, no per-session limits, CodeBuddy-first defaults |
| [Mastra Factory](https://github.com/mastra-ai/mastra/tree/main/mastracode/factory) | TypeScript issue-to-PR server on Mastra with a board state machine and triage, plan, build and review skills | 2 | 1 | 1 | 2 | Apache-2.0 (template repos have no LICENSE file) | Yes, Postgres plus WorkOS auth | @mastra/factory 0.30.0, about 4 months old | **Why:** closest off-the-shelf match to stages 1–5, Jira integrated. **Why not:** in the build loop an LLM judges the next step from prose, agents hold a merge tool and `GH_TOKEN`, verdict is approve or request changes only, model chosen per user, not per phase, sandboxes persist |
| [Blazity ai-workflow](https://github.com/Blazity/ai-workflow) | TypeScript typed workflow graphs on Vercel Workflow DevKit and Neon, Jira-native | 2 | 1 | 2 | 2 | MIT | No: needs Vercel Sandbox, Vercel Workflow and Neon | 18 stars, no push since 2026-10-09, one person wrote about 73% of commits | **Why not:** locked to Vercel, development stalled, no merge step by design. Worth reading for its trusted publisher and per-send prompt recording |

Other engine-like candidates. These scores come from a single read and were not re-checked.

| Name | What it is | O | S | D | T | License | Why not / why |
|---|---|---|---|---|---|---|---|
| [Sortie](https://github.com/sortie-ai/sortie) | Go binary: tracker polling, stage chains swapped by label, Jira and GitHub | 2 | 1 | 1 | 2 | Apache-2.0 | Never reads agent output; human gates mean a person relabels the issue |
| [Bernstein](https://github.com/sipyourdrink-ltd/bernstein) | Python scheduler with a Jira, GitHub and GitLab tracker pipeline | 2 | 1 | 1 | 2 | Apache-2.0 | Tracker pipeline dispatcher is a stub; about 875k lines; solo-maintained beta |
| [KaaS Factory](https://github.com/KaaS-team/factory) | Go daemon: issue to YAML graph of fresh sessions with gates and a merge queue | 2 | 1 | 1 | 2 | Apache-2.0 plus proprietary `ee/` | 0 stars; the Go rewrite is days old; mostly written by agents |
| [Kandev](https://github.com/kdlbs/kandev) | Go server, YAML step workflows, Docker, K8s and SSH executors | 2 | 1 | 1 | 2 | AGPL-3.0 | No shared fix limit, no label sync, no merge rules or deploy |
| [Gas City](https://github.com/gastownhall/gascity) | Go controller turning TOML formulas into durable bead graphs | 2 | 1 | 1 | 2 | MIT | Docs say commands are "not a sandbox"; no state-to-label sync |
| [SuperPlane](https://github.com/superplanehq/superplane) | Go event-driven canvases plus an experimental Software Factory layer | 2 | 1 | 1 | 2 | Apache-2.0 plus EE | Work orders are draft, open or closed only; Factory behind a flag |
| [Zeroshot](https://github.com/the-open-engine/zeroshot) | Rust CLI: typed JSON graph over agent CLIs, routing on enum verdicts | 2 | 1 | 1 | 2 | MIT | No tracker state machine; shared workspace; 16 major versions in 11 months |
| [Delegatus](https://github.com/Latand/delegatus) | Bun app: run pipelines routed by verdicts, Needs-you queue | 2 | 1 | 2 | 2 | MIT | No Jira; cross-stage flow driven by an LLM; one maintainer |
| [Fusion](https://github.com/Runfusion/Fusion) | TypeScript kanban factory with graph workflows | 2 | 1 | 1 | 2 | MIT | No Jira, host worktrees, no deploy or retro |
| [SWFactory](https://github.com/zozo123/ariflow-swfactory) | Airflow 3 factory with digest-bound gates and credential-less work cells | 2 | 2 | 1 | 2 | Apache-2.0 | Alpha, 1 star, no Jira, no slices, triage, deploy or retro |
| [Open Session](https://github.com/tellahq/opensession) | Bun server, sandboxes on Daytona and Modal, PR reviewer with a fix loop | 1 | 2 | 1 | 2 | MIT | No Jira, no 15 states, does not accept outside code |
| [centaur](https://github.com/paradigmxyz/centaur) | Rust control plane, Kubernetes sandbox pods with per-sandbox iron-proxy | 1 | 2 | 1 | 2 | Apache-2.0 OR MIT | No Jira, no pipeline state machine, cost in tokens only |
| [Optio](https://github.com/jonwiggins/optio) | TypeScript control plane, K8s pods, reconciler, auto-merge | 1 | 1 | 1 | 2 | MIT | Fixed 10-state task machine; no spec, plan or validator stages |
| [MindFlock](https://github.com/MindFlock/MindFlock) | Python engine with JSON route stops, polls GitHub, Jira, Linear | 2 | 1 | 2 | 1 | Apache-2.0 | Host worktree with skip-permissions on by default; solo maintainer |
| [Kortix CompanyOS](https://github.com/kortix-ai/CompanyOS) | Cloud multiplayer agent harness with a software-factory template | 1 | 2 | 2 | 1 | Elastic-2.0 | Agents follow skill files; `network_egress` "is not enforced" |
| [Orbi](https://github.com/orbi-build/orbi) | Python timer tick: one issue, one Pi session, JSON review verdict, merge | 1 | 0 | 1 | 1 | AGPL-3.0 or SUL | GitHub only, no sandbox, one repo per deployment |
| [no_human](https://github.com/no-human-ai/no_human) | Python daemon: ticket to reviewed PR, cross-model review | 1 | 1 | 1 | 2 | MIT | Stops at the PR, no slices, coder runs on the host |
| [Loki Mode](https://github.com/asklokesh/loki-mode) | One autonomous run per task with signed receipts | 1 | 1 | 1 | 2 | BUSL-1.1 | Cross-family review removed; verdict is a text line |
| [SWE-AF](https://github.com/Agent-Field/SWE-AF) | Multi-agent build: issue DAG, parallel worktrees, verifier | 1 | 1 | 1 | 2 | Apache-2.0 (vendored binaries without source) | No tracker states; shared container with a `GH_TOKEN` |
| [Gas Town](https://github.com/gastownhall/gastown) | 20–30 agent sessions in tmux coordinated by LLM roles | 1 | 1 | 1 | 2 | MIT | Next steps chosen by LLM agents; state lives in beads, not GitHub or Jira |
| [Multica](https://github.com/multica-ai/multica) | Its own tracker with agents as teammates | 1 | 0 | 1 | 2 | Apache-2.0 plus conditions | Does not use GitHub Issues or Jira as the work source; no sandbox |
| [addyosmani/factory](https://github.com/addyosmani/factory) | Installer of skills, labels and gates; no running process | 1 | 1 | 1 | 1 | MIT | Transitions driven by agent prose; 3-day drop, inactive |
| [OpenAI Symphony](https://github.com/openai/symphony) / [Contrabass](https://github.com/junhoyeo/contrabass) | Tracker-polling daemon spec and reimplementation | 1 | 1/0 | 0 | 1 | Apache-2.0 | The agent writes tracker state itself; no gates; both inactive for 2–4 months |
| [Foreman](https://github.com/VisionForge-OU/foreman) | Python TUI driving `claude` through plan, grill, slice, build and audit | 1 | 0 | 1 | 2 | MIT | No tracker; inactive since June 2026 |

## Foundations to build on

| Name | What it is | O | S | D | T | License | Maturity | Fit |
|---|---|---|---|---|---|---|---|---|
| **[Temporal](https://github.com/temporalio/temporal)** (re-checked) | Durable execution: workflows as code, Activities, Signals, Updates, Queries, timers | 2 | 1 | 2 | 2 | MIT | 24,524 stars, v1.32.2 (2026-11-02), about 328 contributors | **Chosen.** Pause is experimental and off by default; the Claude integration is alpha 0.0.3 ([PyPI](https://pypi.org/project/temporalio-claude-agent-sdk/)); single-node ops not verified |
| [Flyte 2](https://github.com/flyteorg/flyte) (re-checked) | Kubernetes-native durable runtime, async Python, conditions for human gates | 2 | 1 | 1 | 2 | Apache-2.0 | 7,802 stars, weekly releases | Needs Kubernetes, Postgres and object storage; its own README says the production-grade backend is Union.ai; outbound condition webhook missing in OSS |
| [Microsoft Conductor](https://github.com/microsoft/conductor) (re-checked) | One YAML workflow per process, Jinja routing on schema outputs | 2 | 1 | 2 | 2 | MIT | 507 stars, v0.1.47, one main maintainer | No tracker, no state across runs; the Claude Agent SDK provider cannot run in its Docker realm |
| [DBOS Transact](https://github.com/dbos-inc/dbos-transact-py) | Durable-workflow library that checkpoints to Postgres or SQLite, no server | 1 | 0 | 1 | 1 | MIT (Conductor console proprietary) | 1,693 stars, weekly releases | Lighter fallback for O if the Temporal server is too much to run; single read |
| [Hatchet](https://github.com/hatchet-dev/hatchet) | Durable tasks and DAGs on Postgres, CEL concurrency keys, durable waits | 2 | 1 | 1 | 1 | MIT | 8,325 stars | Credible alternative; its sandbox SDK is Cloud only |
| [Restate](https://github.com/restatedev/restate) | Durable handlers, Virtual Objects with one writer per key, awaitables | 1 | 0 | 1 | 1 | BUSL-1.1 server, MIT SDKs | 4,727 stars | Internal use allowed; AI layer young |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Durable TypeScript tasks with waitpoint tokens | 2 | 1 | 1 | 2 | Apache-2.0 | 16,798 stars | No per-run egress control |
| [Inngest](https://github.com/inngest/inngest) | Durable step functions with flow control | 2 | 1 | 1 | 1 | SSPL v1 with delayed Apache-2.0 | 6,065 stars | SSPL for the server; AgentKit slowing |
| [Absurd](https://github.com/earendil-works/absurd) | Durable execution entirely inside Postgres | 1 | 0 | 1 | 1 | Apache-2.0 | 2,567 stars, pre-1.0, bus factor 1 | Too young to carry the pipeline |
| [Conductor OSS](https://github.com/conductor-oss/conductor) | Java JSON-graph workflow server, HUMAN and WAIT tasks | 2 | 0 | 1 | 2 | Apache-2.0 | 32,494 stars, Netflix lineage | Heavy Java server for one operator |
| [Dagu](https://github.com/dagucloud/dagu) | One Go binary, YAML DAGs, `harness.run` for agent CLIs, `output_schema`, approval gates | 2 | 1 | 2 | 1 | GPL-3.0 plus paid features | 4,642 stars | No work-item model; no Jira |
| [LangGraph](https://github.com/langchain-ai/langgraph) | Durable graph state machines with checkpointers and `interrupt()` | 2 | 0 | 1 | 1 | MIT library | 45,220 stars | Cross-thread queue, re-drive and global cancel live in the commercial Agent Server |
| [Windmill](https://github.com/windmill-labs/windmill) / [Kestra](https://github.com/kestra-io/kestra) | General orchestration platforms with approval steps | 2 | 1 | 1 | 1 | AGPL / Apache-2.0 plus EE | 18.7k / 30.3k stars | Key controls (concurrency, kill switch, pause) are Enterprise-only |
| [Argo Workflows](https://github.com/argoproj/argo-workflows) / [Airflow 3](https://github.com/apache/airflow) / [Prefect](https://github.com/PrefectHQ/prefect) | Kubernetes or data DAG engines | 1 | 1 | 1–2 | 1–2 | Apache-2.0 | Very mature | A run is not a long-lived work item; back-edges are awkward |
| [XState](https://github.com/statelyai/xstate) / [Apache Burr](https://github.com/apache/burr) | Embeddable state-machine libraries | 1 | 0 | 0–1 | 1–2 | MIT / Apache-2.0 | 30.5k / 2.6k stars | Good for the transition table inside our O; no durability of their own |
| [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python) | Runs one Claude Code session from code: hooks, `max_budget_usd`, JSON output, OTel | 1 | 1 | 1 | 2 | MIT repo, proprietary CLI | 8,607 stars, 0.x | **Used** as the session runner for 8 roles |
| [Codex CLI](https://github.com/openai/codex) | Headless `codex exec` with `--output-schema`, JSONL events, OS sandbox | 1 | 1 | 0 | 2 | Apache-2.0 | 136,017 stars | **Used** for the cross-family reviewer |
| [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview) | API sessions with sandboxes, outcomes, budgets, OTel | 1 | 2 | 1 | 2 | Proprietary, Beta | Self-hosted server is a private beta | Session layer only; no wall-clock limit |
| [pi](https://github.com/earendil-works/pi) | Multi-provider agent loop, coding CLI, experimental durable harness | 1 | 1 | 1 | 1 | MIT | 123,112 stars | Possible single runner for many model families; durable layer experimental |

## Components by part

### Sandbox (S)

| Name | What it gives | S | License | Notes |
|---|---|---|---|---|
| **[OpenSandbox](https://github.com/opensandbox-group/OpenSandbox)** | Lifecycle server (Docker/K8s), FQDN default-deny egress sidecar, Credential Vault, gVisor/Kata/Firecracker | 3 | Apache-2.0 | **Chosen.** Single read; no git-ref rules |
| [E2B runtime](https://github.com/e2b-dev/E2B) | Firecracker microVMs, nftables egress with domain lists, secret-injecting proxy, self-hostable | 2 | Apache-2.0 | Fallback |
| [microsandbox](https://github.com/superradcompany/microsandbox) | Embeddable libkrun microVMs, host-side network policy, secret substitution | 2 | Apache-2.0 | Network open by default; beta |
| [BoxLite](https://github.com/boxlite-ai/boxlite) / [smolvm](https://github.com/smol-machines/smolvm) | Embeddable micro-VM runtimes with egress allow-lists | 2 | Apache-2.0 | Pre-1.0, weekly breaking changes |
| [Docker Sandboxes (sbx)](https://docs.docker.com/ai/sandboxes/) | microVM per agent, deny-by-default proxy, placeholder credentials | 2 | Proprietary (free locally) | Breaking changes almost every minor version |
| [K8s agent-sandbox](https://github.com/kubernetes-sigs/agent-sandbox) / [Agent Substrate](https://github.com/agent-substrate/substrate) | Kubernetes CRDs; Substrate adds default-deny Envoy egress with credential injection | 2 | Apache-2.0 | Needs Kubernetes |
| [OpenShell](https://github.com/ai-openshell/openshell) | Gateway and supervisor, L7 policy, credential injection | 2 | Apache-2.0 | L7 rules cannot see git refs |
| [Strands Box](https://github.com/strands-agents/box) | Process sandbox with Dogwood deny-by-default policies, egress gateway | 2 | Apache-2.0 | Host kernel; must sit inside a VM |
| [Tracekit Box](https://github.com/Cygnux-Labs/Tracekit-box) | Firecracker with no NIC; patch out through a vsock "door" | 2 | MIT | v0, one author, good design to copy |
| [sandcastle](https://github.com/mattpocock/sandcastle) | TypeScript library: run an agent CLI in a chosen sandbox, typed output, session capture | 2 | MIT | Session runner if O is in TypeScript |
| [Anthropic srt](https://github.com/anthropics/sandbox-runtime) | OS-level filesystem and egress restriction; proxy decider can read request bodies | 1 | Apache-2.0 | Not a disposable machine |
| [gVisor](https://github.com/google/gvisor) / [Kata](https://github.com/kata-containers/kata-containers) / [Firecracker](https://github.com/firecracker-microvm/firecracker) | Isolation runtimes | 1 | Apache-2.0 | Building blocks under the chosen sandbox |
| [Octo STS](https://github.com/octo-sts/app) | Short-lived, repo-scoped GitHub tokens from OIDC | 1 | Apache-2.0 | Cannot scope to a branch |
| [Smokescreen](https://github.com/stripe/smokescreen) | Hostname-ACL CONNECT egress proxy | 1 | MIT | Hostname level only |
| Hosted: [Modal](https://modal.com/docs/guide/sandbox), [Vercel Sandbox](https://vercel.com/docs/sandbox), [Cloudflare](https://github.com/cloudflare/sandbox-sdk), [Fly Sprites](https://fly.io/learn/agent-sandbox-providers/), [AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter-tool.html) | Managed microVMs or containers with egress control | 2 | Proprietary services | Code leaves our machines; check before use on employer repos |

### Session traces (T)

| Name | What it gives | T | License | Notes |
|---|---|---|---|---|
| **[Claude Code OTel](https://code.claude.com/docs/en/monitoring-usage)** | Metrics (`cost.usage`, `token.usage`), events (`api_request`, `tool_result`), beta trace spans incl. subagents | 2 | Proprietary CLI, open OTLP | **Chosen** source; no verdicts or Operator time |
| **[Langfuse](https://github.com/langfuse/langfuse)** | Traces, sessions, cost, scores, Metrics API v2 | 2 | MIT outside `ee/` | **Chosen** store |
| [Opik](https://github.com/comet-ml/opik) | Traces, threads, cost, evals; Claude Code hook plugin | 2 | Apache-2.0 | Fallback store |
| [Phoenix](https://github.com/Arize-ai/phoenix) | OTel/OpenInference traces, cost, Claude Agent SDK instrumentation | 2 | Elastic-2.0 | Fallback store |
| [Laminar](https://github.com/lmnr-ai/lmnr) / [MLflow Tracing](https://github.com/mlflow/mlflow) / [OpenLIT](https://github.com/openlit/openlit) / [SigNoz](https://signoz.io) | Other OTLP stores with Claude Code ingestion | 2 | Apache-2.0 / Apache-2.0 / Apache-2.0 / MIT plus EE | All viable; none models work items |
| [OTel GenAI conventions](https://github.com/open-telemetry/semantic-conventions-genai) | Span and attribute names for agents and tools | 1 | Apache-2.0 | All Development status; v0.1.0 has breaking renames |
| [Claude API OTel export](https://platform.claude.com/docs/en/manage-claude/opentelemetry) | Server-side spans for Messages API and Managed Agents | 1 | Proprietary, Beta | Does not cover Claude Code CLI sessions |
| [ccusage](https://github.com/ccusage/ccusage) | Token and cost reports from local session logs | 1 | MIT | Logs must be copied out before the sandbox is destroyed |
| [Chainloop](https://github.com/chainloop-dev/chainloop) | Signed attestations of agent sessions and CI evidence | 2 | Apache-2.0 | Evidence layer if we want signed records later |
| [claude-replay](https://github.com/es617/claude-replay) / [claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) | HTML replays of session logs | 1 | MIT / Apache-2.0 | For evidence links in decision requests |

### Decision requests (D)

| Name | What it gives | D | License | Notes |
|---|---|---|---|---|
| **[MCP Apps](https://github.com/modelcontextprotocol/ext-apps)** | HTML card rendered in Claude after a tool call; can call tools back | 1 | Apache-2.0 (legacy MIT) | **Chosen** for the card; pull-only |
| **[ntfy](https://github.com/binwiederhier/ntfy)** | Self-hosted push with up to 3 action buttons | 1 | Apache-2.0 | **Chosen** for the alert |
| [MCP elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation) | Form or URL input inside an MCP call | 1 | Open spec | Not in Claude Desktop chat yet ([#153](https://github.com/anthropics/claude-ai-mcp/issues/153)) |
| [Claude Code Remote Control and Channels](https://code.claude.com/docs/en/remote-control) | Remote view and allow/deny of a live Claude Code session; Telegram/Discord channels | 1 | Proprietary; plugins Apache-2.0 | Tool-call permissions, not decision requests; open approval bugs |
| [Telegram Bot API](https://core.telegram.org/bots/api#inlinekeyboardmarkup) / [Slack Block Kit](https://docs.slack.dev/block-kit/) | Buttons and callbacks; Slack modals | 1 / 2 | Proprietary APIs | Other alert channels |
| [gotoHuman](https://www.gotohuman.com/) | Hosted review inbox with forms and webhooks | 2 | Proprietary SaaS | Data leaves our machines |
| [AG-UI / CopilotKit](https://github.com/ag-ui-protocol/ag-ui) | Event protocol and UI kit for agent interrupts | 2 | MIT | If we ever build a web console |
| [GitHub Environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment) | Required reviewers on Actions jobs | 1 | Proprietary | Deploy gate only, not merge gate |
| [LangChain Agent Inbox](https://github.com/langchain-ai/agent-inbox) / [HumanLayer](https://github.com/humanlayer/humanlayer) | Inbox for interrupted threads / multiplayer agent platform | 1 | MIT / Apache-2.0 | Archived / hosted cloud shutting down |

### Stage tools (outside the four parts)

| Stage | Tool | License | Use |
|---|---|---|---|
| 5 Review | [Codex CLI](https://github.com/openai/codex) `exec --output-schema` | Apache-2.0 | Reviewer of a different family with our JSON verdict |
| 5 Review | [PR-Agent](https://github.com/The-PR-Agent/pr-agent) | MIT | Alternative reviewer; typed review can be written as JSON |
| 7 Merge | [GitHub merge queue and rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) | Proprietary | Queue and branch protection |
| 7 Merge | [Conftest/OPA](https://github.com/open-policy-agent/conftest) | Apache-2.0 | Evaluate the rules file for R0 auto-merge |
| 6 Acceptance | [Playwright MCP](https://github.com/microsoft/playwright-mcp) | Apache-2.0 | Validator drives the app as a user |
| 8 Deploy & watch | [Argo Rollouts](https://github.com/argoproj/argo-rollouts) / [Flagger](https://github.com/fluxcd/flagger) | Apache-2.0 | Metric-driven rollback where the target is Kubernetes |
| 8 Watch | [HolmesGPT](https://github.com/HolmesGPT/holmesgpt) | Apache-2.0 | Investigation tools for the Watcher |
| 3 Plan | [Beads](https://github.com/gastownhall/beads) | MIT | Design reference for ready frontier and claims |
| 9 Learn | [pi-reflect](https://github.com/jo-inc/pi-reflect) / [Compound Engineering `ce-retro`](https://github.com/EveryInc/compound-engineering-plugin) | MIT | Design reference: corrections to typed edits, correction rate and rule recidivism |

## The given list

| Repo | What it is | Role for us | What we can take |
|---|---|---|---|
| [mattpocock/sandcastle](https://github.com/mattpocock/sandcastle) | TypeScript library: `sandcastle.run()` runs an agent CLI in Bubblewrap, Seatbelt, Docker, Podman, Daytona, E2B, Modal and others; typed output; resume; brings commits back. 9,203 stars, MIT, v0.14.0 | Component (S runner), O 1 / S 2 / D 0 / T 1 | The session runner if O is in TypeScript; write a custom provider for OpenSandbox. Native providers have no closed network and no push proxy |
| [open-mercato/cezar](https://github.com/open-mercato/cezar) | Self-hosted cockpit driving logged-in agent CLIs with YAML graphs. MIT, 1,117 stars | Foundation per both skeptics, but not chosen: O 2 / S 1 / D 2 / T 2 | Graph node set (`gate.human`, `ask-user`, `fork`/`join`, loop counters that never reset) and NDJSON event logs as design reference |
| [Tencent/LoopForge](https://github.com/Tencent/LoopForge) | Self-hosted SOP DAG platform, Docker sandboxes, needs-review inbox. MIT, 5,350 stars | Inspiration only (downgraded by the operability skeptic) | Gate MCP enum `pass|rework|fail|human` with `actionRequired`; `MaxReworks`/`RejectTo` rework edges |
| [google-research/paper-orchestra](https://github.com/google-research/paper-orchestra) | Fixed LLM call chain that writes a LaTeX paper. Apache-2.0 | Not a fit | Nothing |
| [multica-ai/multica](https://github.com/multica-ai/multica) | Its own issue tracker where agents are teammates; daemon runs local CLIs. "Multica License", 56,982 stars | Inspiration only | Run transcript and cost display. Does not take GitHub Issues or Jira as the work source; no sandbox |
| [Tracer-Cloud/opensre](https://github.com/Tracer-Cloud/opensre) | SRE agent: reads failed CI and alerts, finds the cause, pushes a fix. Apache-2.0, public alpha | Inspiration only for the Watcher | Its weekly reliability report and bounded CI-repair loop as patterns for stages 8 and 9 |
| [fastclaw-ai/fastclaw](https://github.com/fastclaw-ai/fastclaw) | Go runtime hosting chat agents with IM channels and sandboxes. Source-available community license | Inspiration only | Nothing specific; no pipeline or work-item model |
| [gastownhall/gastown](https://github.com/gastownhall/gastown) | 20–30 Claude Code sessions in tmux, coordinated by LLM roles over beads. MIT, 18,857 stars | Inspiration only | Its sibling [Beads](https://github.com/gastownhall/beads) as a reference for claims, ready frontier and gates; Gas Town itself decides steps by LLM |
| [portpowered/you-agent-factory](https://github.com/portpowered/you-agent-factory) | Go CLI routing work through a factory.json graph of work types and states. MIT, 16 stars, inactive 6 weeks | Inspiration only | The packaged "adversarial review" and "plan-parallel" graph shapes; no sandbox, `NEEDS_HUMAN` is a terminal failure |
| [Cotal-AI/Cotal](https://github.com/Cotal-AI/Cotal) | NATS mesh for coding agents with a durable workflow language. Apache-2.0, 405 stars | Inspiration only | `ask-with-schema` step and step journal; no sandbox, no tracker, refuses cost budgets |

## Not a fit

- [paper-orchestra](https://github.com/google-research/paper-orchestra): writes papers, not software.
- [Google Jules](https://developers.google.com/jules/api): read-only since 2026-11-11, shut down on 2026-12-31.
- [Codegen](https://docs.codegen.com/capabilities/claude-code): standalone service ended 2026-01-09; org archived.
- [Runloop](https://docs.runloop.ai/docs/devboxes/overview): support ended 2026-11-13.
- [Continue](https://github.com/continuedev/continue): repository is read-only and unmaintained.
- [Aider](https://github.com/Aider-AI/aider): no release for 15 months, no commits for 6.
- [AutoGen](https://github.com/microsoft/autogen): archived; Microsoft advises against production use.
- [Daytona OSS](https://github.com/daytonaio/daytona): repo archived; the product went closed source.
- [Coder AgentAPI](https://github.com/coder/agentapi): archived and deprecated.
- [Trail of Bits claude-code-devcontainer](https://github.com/trailofbits/claude-code-devcontainer): archived 2026-11-20; successor is trailofbits/coop.
- [Vibe Kanban](https://github.com/BloopAI/vibe-kanban): company shut down; community-maintained.
- [Helicone](https://github.com/Helicone/helicone): maintenance mode after acquisition.
- [Dagster](https://github.com/dagster-io/dagster): data assets, no human-in-the-loop primitive.
- [Upstash Workflow](https://github.com/upstash/workflow-js): its engine QStash is hosted only; local server licensed for development only.
- [Camunda 8](https://github.com/camunda/camunda): Camunda License forbids production use without a paid edition.
- [Unito](https://unito.io/integrations/github-jira/) / [Exalate](https://exalate.com/integrations/jira-github/): tracker mirroring only, and too slow for state labels O depends on.
- [Blazity ai-workflow](https://github.com/Blazity/ai-workflow): runs only on Vercel and Neon.
- [Dify](https://github.com/langgenius/dify): 7-day limit on human pauses; two workspaces may count as multi-tenant under its license.

## Not verified or not found

**Not found anywhere among the 323 candidates:**
- An engine that keeps one work item's state in both GitHub Issues and Jira, with a label per state.
- A git push proxy limited to one branch as a standalone product. The only working one we saw is closed, inside Anthropic's cloud sessions ([claude-code#57356](https://github.com/anthropics/claude-code/issues/57356)).
- Any engine that caps how many items wait for the Operator at once.
- An engine with a built-in weekly summary of pipeline metrics, or an autonomous deploy Watcher that rolls back by itself (fishhawk's rollback is operator-triggered; agentic deploy is deferred in ADR-039).
- A per-session time or cost limit that counts as a failed fix round. Kraft, Fabro and agent-swarm stop or alert instead.

**Not verified:**
- OpenSandbox's egress, credential vault and runtime claims. Its score of 3 is a single read, not re-checked by skeptics.
- The ops footprint of a single-node Temporal server for one operator. Also Update-with-Start and id-conflict behaviour in the released Python SDK (docs only).
- That Claude Desktop can drive the MCP gate tools of Kraft, Fabro, MAIster or LoopForge end to end.
- That an MCP Apps card renders in Claude Desktop for a request that the model fetches on demand.
- Whether the Claude Desktop Cowork elicitation bug ([claude-code#56243](https://github.com/anthropics/claude-code/issues/56243)) is fixed.
- Whether running the Claude Agent SDK on a Claude subscription login, not an API key, is allowed for unattended pipelines.
- Whether Fabro's official binaries ship with the Segment key (telemetry may or may not leave the machine).
- Whether Fabro checkpoint pushes still work with network mode `block`.
- Daytona self-hosting.
- GitHub App token scope inside Mastra Factory sandboxes, and whether its merge tool is filtered per session.
- Blazity's Vercel Pro pricing; Inngest SSPL for employer use; Loki Mode BUSL and Crush FSL terms for employer use (no lawyer review).
- Production users outside each vendor, for nearly every candidate.
- Language choice for O (Python or TypeScript): an open decision, not a research finding.
- The upstream microsoft/agent-framework repository returned 404 on 2026-11-21.
- The completeness critic flagged Tessl, Graphite Agent and the Aviator merge queue as not read, and CodeRabbit's JSON verdict output and AgentCore's fit for private deployment as not verified.

All 323 candidates with their scores: [2026-11-engine-candidates.md](2026-11-engine-candidates.md).
