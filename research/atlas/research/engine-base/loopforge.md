# LoopForge (Tencent/LoopForge) as the base engine: re-evaluation

Date: 2026-11-21. Clone: `src/loopforge` (`--depth 200`, HEAD `42541ef`, 2026-11-21). Code read statically only; nothing was installed, built or run. Paths below are relative to the repo root.

## Verdict in one paragraph

**Score 6/10 as a base to extend.** LoopForge already ships most of what the earlier report treated as "free": a full self-hosted web UI (requirements, SOP designer, runs, a Needs-review inbox, roles, sandboxes, runners, stats and cost), password accounts and projects, GitHub OAuth device-flow, ten agent CLIs including Claude Code and Codex selectable per node, Docker sandboxes, a gate MCP whose JSON verdict drives routing, per-node attempt and rework caps, OTLP traces and per-run token cost. What it lacks is exactly the hard part of our spec: a safe sandbox (open egress on the Compose network, the user's full GitHub token reachable from inside), our tracker model (no Jira, no labels, no sub-issues, a fixed 8-value requirement status), a shared per-item fix-round cap, per-session time and cost limits, dynamic slice fan-out, a merge queue and auto-merge rules. Best shape: **LoopForge as the inner engine plus UI, driven by a thin outer controller of ours through its HTTP API, and a small, rebased patch set (a soft fork) only for the sandbox and limits.** Upstream is a public mirror of a private Tencent master; it merges PRs from returning contributors but has merged none of 172 first-time PRs. Sandbox-hardening as opt-in config has a fair chance upstream; tracker and state-machine changes do not.

## 1. Facts about the project

| Item | Value | Source |
|---|---|---|
| Stars / forks | 5,356 / 739 | `gh api repos/Tencent/LoopForge` |
| Created | 2026-07-28 | same |
| Releases | 15; 11 of them between 2026-11-06 and 2026-11-20 (v0.3.0 to v0.4.1-rc.1) | `gh api .../releases` |
| Commits on main per month | Jul 1, Aug 5, Sep 15, Oct 8, Nov 358 (to the 21st) | `gh api search/commits` |
| Contributors (all-time list) | Robert0622 70, crispinhu27 55, cocofhu 22, dependabot 13, then 12 people with 1–6. November authors: fx-kurumi 187 (same e-mail as cocofhu, mass "架构优化" refactor commits co-authored by Claude Code), Robert0622 62, crispinhu27 55, cocofhu 17 | `gh api .../contributors`, `.../commits?since=2026-11-01` |
| Bus factor | 3 people (Robert0622, crispinhu27, cocofhu) write about 90% of code | same |
| Issues | 89 open / 30 closed | `gh api search/issues` |
| PRs | COLLABORATOR 169 merged; CONTRIBUTOR 24 merged of 63; NONE (first-timers) 0 merged of 172, 154 still open | `gh api .../pulls?state=all` |
| Responsiveness | Same-day closes with a reasoned comment, usually "already covered by #NNNN" (maintainers re-implement instead of merging; e.g. PRs 1037, 999, 931) | `gh api .../issues/{n}/comments` |
| Language / size | Go 302k lines incl. 158k test lines; web UI vanilla JS about 22k lines in `web/*.js` (not React); the chat workbench `chatbot/` is React 19 + Vite, about 22k lines | `wc -l` |
| Largest modules | `internal/httpapi` 50.5k (+60.4k tests), `internal/runtime` 22k (+21.6k), `internal/repo` 21k, `internal/engine` 14.3k (+21.2k), `internal/domain` 9.4k, `internal/tracker` 3.8k | `wc -l` per dir |
| Churn, 2026-11-14..21 | httpapi +18.9k/−8.4k (58 commits), runtime +12k/−2k (25), engine +1.8k/−0.3k (15), web +3.5k/−4.2k, chatbot +4.8k/−0.8k | `git log --numstat` |
| CI | `.github/workflows/platform.yml` (core, browser, first-run), e2e (Playwright, `e2e/api` 21 suites), image, release | `.github/workflows/` |
| DB | MySQL 8.4, 39 numbered migrations | `compose.yaml`, `migrations/` |

### License: MIT, GitHub says NOASSERTION

`LICENSE` is the MIT text wrapped in a Tencent preamble ("Tencent is pleased to support…") plus a third-party section (obra/superpowers, MIT). The preamble is why GitHub's detector returns `NOASSERTION`; the terms are plain MIT (`LICENSE` lines 1–18). `THIRD_PARTY_NOTICES.md` lists Monaco and Code-OSS (MIT), Go module notices bundled in `third_party/go/`, and LGPL-3.0 libvips as an unmodified shared library pulled by DeepSeek Harness (line 51). Claude Code is proprietary and is fetched from npm on first use, not shipped (line 51). No copyleft in the platform code itself. Safe for personal and employer repos.

### Mirror of a private upstream

Confirmed. `docs/upstream-sync.md`: "maintained as a public core with deployment-specific adapters"; source revisions, hashes and excluded-file inventories are "local maintenance records… not committed to the public repository". `docs/architecture.md` keeps the upstream module name `agentflow` and `AGENTFLOW_` env vars "to reduce ongoing merge conflicts". `docs/open-source-scope.md`: engine, persistence, runner protocols, gates are "Upstream implementation and tests". Legacy internal tracker code (Gongfeng = Tencent's GitLab, TAPD) is still in `internal/tracker/merge_mr.go`, `tapd_*.go`, `internal/gongfeng/`. PRs are accepted in the public repo (`CONTRIBUTING.md`), so it is a mirror that accepts PRs, but the maintainers port them into the private master.

### Telemetry

No analytics SDK found (grep for posthog/sentry/segment/analytics in `internal/`, `cmd/`). Agent CLI OTLP goes to the platform's own collector (`internal/config/endpoints.go:35`, `internal/runtime/command_binding.go:205-206`). External calls by default: GHCR image pull (with an optional Nanjing mirror, `README.md` quick start), npm for Claude Code, WeCom API only if a WeCom bot is configured (`internal/notification/provider.go:53`). Not checked: what the bundled CodeBuddy CLI itself reports home.

## 2. What is ready for the owner

### 2.1 Web UI (`web/index.html`, `web/*.js`, `chatbot/src`)

Left rail and settings sidebar, `web/index.html:77-158`:

| Screen (`data-view`) | What the Operator can do | Code |
|---|---|---|
| AI workbench (`collaboration`) | Chat with Main Bot per project; pick executor, model, permission mode per conversation; `@` roles, skills, requirements, SOPs, repos; queue and steer messages; open a Docker workspace; pause, resume, take over a running SOP | `chatbot/src`, `web/workbench.js` (2,170 lines) |
| Requirements (`issues`) | List, create, import GitHub Issues, clarify with AI, dispatch to an SOP, bulk delete, issue drawer with runs and PRs | `web/issues.js`, `web/issue-drawer.js`, `web/issue-model.js` |
| Needs review (`approvals`, 待我确认) | One inbox of every gate waiting on you; approve, add context and rerun, send back to a chosen node | `web/approvals.js` |
| Runs (`runs`) | Live node status, tool traces, worker logs, per-node artifacts, workspace tree, diff, terminal, preview; retry, rerun from a node, cancel, pause | `web/runs.js`, API `/api/runs/{id}/*` in `docs/api/openapi.yaml` |
| SOPs (`sops`) | Visual canvas: Agent, Script, Human gate, Sub-SOP, Preview nodes; rework edges; validation; versions, publish, clone | `web/flows.js`, `web/sops.js`, `web/flow-palette.js` |
| Roles (`agents`) | Prompt, executor, model, rules, Skills, MCP, artifacts, verification gates, hooks per role | `web/agents.js`, `internal/domain/agent.go` |
| Skills / MCP / rules (`mcp`) | Install MCP servers and Skills, skill market | `web/mcp.js`, `web/skillhub.js` |
| AI scheduled tasks (`aiSchedules`) | Cron agent tasks, shared versioned templates, auto-dispatch new requirements | `web/sync-schedule.js`, `internal/schedule/` |
| Stats (`observability`) | Engineering metrics, cost by project, SOP, model, requirement; HTML/SVG export | `web/observability.js`, `web/obs-charts.js` |
| Projects (`projects`) | Projects, members, repositories, default SOP, setup wizard | `web/projects.js`, `web/project-wizard.js` |
| Execution machines (`runners`) | Bind personal or pool runners with a short-lived code | `web/runners.js` |
| Environments (`dockerfiles`) | Custom sandbox Dockerfiles per project | `web/index.html:155` |
| Channels (`bots`) | WeCom bots for notifications and chat | `web/bots.js` |
| Settings, Access guide, Platform admin | Personal keys, GitHub connect, Git SSH / HTTP credentials, personal API tokens, member accounts | `web/github-connect.js`, `web/git-ssh-keys.js`, `web/access.js` |

Language: management pages in English and Chinese; the chat workbench is Chinese only (`README.md` Features, "Team-ready"). Agent-facing engine prompts are Chinese (`internal/engine/gate_submit.go:109-127`, `node_outcome.go:76`).

### 2.2 Projects and repositories

Projects with owners and members, repositories bound per project (`internal/domain/project.go`, `internal/repo/`). Repo checkout into the sandbox, work branches, integration with conflict rework capped at 3 (`internal/engine/integrate.go:14,247`), direct-branch merge mode (`README.md` "Two ways to work").

### 2.3 Git providers

| Provider | Depth | Code |
|---|---|---|
| GitHub | Issue import by polling `GET /issues` (read-only), PR find, create, merge via `PUT /pulls/{n}/merge`, PR state refresh. No label write, no sub-issues, no check-run or status reading, no merge queue, no webhooks seen | `internal/tracker/github.go:161-318` (318 lines) |
| GitHub MCP | The official `api.githubcopilot.com` MCP gets the actor's token as a header; agents can call any GitHub MCP tool | `internal/runtime/github_mcp.go:12-38` |
| GitLab, Gitea, others | Clone and push over SSH only; no API adapter | `docs/open-source-scope.md`, `docs/deployment.md#git-repositories-over-ssh` |
| Gongfeng, TAPD | Legacy Tencent-internal, hidden by default | `internal/tracker/merge_mr.go`, `tapd_*.go` |
| Jira | Absent (no match for "jira" in `internal/`) | grep |

### 2.4 Accounts, auth, multi-user

Password accounts (bcrypt), first account is admin, open sign-up switchable with `AGENTFLOW_ALLOW_SIGNUP`, admin creates accounts, GitHub sign-in, personal API tokens `afp_…` for REST and MCP, 7-day HttpOnly cookies (`docs/deployment.md:131-148`, `docs/api/README.md`). Trusted-team model: every signed-in user reads all projects and runs (`docs/deployment.md:137`). No OIDC, SAML or 2FA (`internal/auth/` has only a legacy SSO client).

### 2.5 Settings, policies, secrets

Per-user executor keys and Git tokens; node-level `credentialEnv` injects platform-held secrets into script nodes without putting them in definitions or logs (`internal/domain/workflow.go:62-68`). Output redaction of Git tokens (`internal/runtime/run_git_credentials.go:123-143`). No policy engine, no rules file for auto-merge.

### 2.6 Agent runners and models

Ten CLIs registered (`internal/runtime/provider.go:155-157` and others): CodeBuddy, Codex, Claude Code, OpenCode, Cursor CLI, Antigravity, Kimi Code, Pi, DeepSeek Harness, ZCode (`README.md` executor table). **Claude Code and Codex do run as SOP agents**, chosen per role and per node (`WorkflowNode.ExecutorID`, `internal/domain/workflow.go:55`). Claude Code is installed from npm on first use, runs `-p` with `--permission-mode bypassPermissions` and its own `--mcp-config` (`internal/runtime/provider_claude.go:21,65`). On the server it needs an API key; subscription login only on a connected execution machine (`README.md` executor table). CodeBuddy-first defaults: built-in roles default to CodeBuddy (`internal/repo/catalog.go:29`, `internal/httpapi/catalog.go:344,1262`), and requirement clarification, notification summaries, bot replies and run evals are CodeBuddy-only (`README.md` "Executors"). Role hooks compile into native Claude Code, Codex and CodeBuddy hooks (`internal/domain/agent.go:99-111`).

### 2.7 Sandbox and network isolation

Docker container per run workspace: `--cap-drop=ALL`, `no-new-privileges`, non-root user, optional read-only root FS (`internal/runtime/sandbox_docker.go:754-803`). Gaps:
- **Shared Compose network.** `compose.yaml` sets `AGENTFLOW_DOCKER_NETWORK: loopforge_default`, and `sandbox_docker.go:768-781` joins sandboxes to it. A sandbox shares the network with `mysql:3306` (password-protected) and `platform:8080`. Conversation workspaces override the network with the relay network and add `host.docker.internal:host-gateway` (lines 769-776).
- **Egress open.** No `--network none`, no proxy, no allow-list in `sandbox_docker.go`. `internal/gitegress` limits only the control plane's own Git calls; its header says "Workspace traffic never passes here" (`internal/gitegress/gitegress.go:1-5`).
- **Credential relay.** `prepareRunGitBinding` starts an in-memory JSON-RPC relay and puts its URL and a random token in the command environment (`run_git_credentials.go:49-77`). Any process in the sandbox that asks for `git-credential` for a host gets the user's raw token back (lines 60-66). The token is the user's GitHub OAuth or PAT token, valid for every repo the user can reach, including merge.
- **No branch restriction on push.** Nothing in `internal/runtime/git_isolation.go` (435 lines) limits refs. The agent can also merge through GitHub MCP (`github_mcp.go`).
- **Host Docker socket** mounted into the platform container (`compose.yaml`, platform volumes). Sandboxes do not get it. The README itself says this setup is "for trusted teams, not untrusted multi-tenant isolation".
- No CPU, memory or pids limits in `docker create` args (`sandbox_docker.go:754`).

### 2.8 Gates, approvals, notifications

- Gate MCP: `submit_gate_result` with `decision ∈ {pass, rework, fail, human}`, required `reason`, `actionRequired` mandatory for `human`, written once to a result file (`internal/gatemcp/server.go:30-44,179-195,222`). The engine reads the file, not prose (`internal/engine/gate_submit.go:40-104`). If the agent does not call the tool, the engine re-prompts (line 109).
- Routing: `rework` sends the run back to `RejectTo`, `human` parks on a human gate, `fail` fails (`gate_submit.go:86-104`). When the rework target has used `MaxReworks`, the node parks for a human instead of failing (`internal/engine/node_outcome.go:60-80`).
- Human gate node type `approval`, plus verification gates per role (`mode: command|manual|mr`, `onFailure: loop|reject|fail|human`, `internal/domain/workflow.go:10-20`).
- Needs-review inbox (`web/approvals.js`), API `/api/runs/{id}/approve|pass|reject|retry`.
- Notifications: WeCom only (`internal/notification/provider.go:53`). No web push, e-mail, Telegram or generic webhook.

### 2.9 Logs, traces, cost

Run events and timing (`internal/domain/run_timing.go:28-39`), worker logs and SSE stream, OTLP `/v1/traces` ingestion from agent CLIs (`internal/httpapi/server.go:797`), per-node token use and cost at public list prices in CNY (`docs/token-pricing.md`; rates in `internal/domain/token_pricing.go`). An external usage ingestion API exists (`docs/external-workflow-usage.md`). Not our six metrics, but most raw data is there.

### 2.10 Deployment and API

`./start.sh` pulls a pinned GHCR image, MySQL plus platform via Compose, listens on `0.0.0.0:8090` (`README.md`, `compose.yaml`). Split API and worker roles (`docs/deployment.md` "Workers and runners"). OpenAPI with 136 `/api` paths (`docs/api/openapi.yaml`), a platform MCP server (`internal/mcpserver/`, `cmd/agentflow-mcp`), `cmd/loopforge-account` CLI. Good fit for "own Linux server, Docker".

## 3. Mapping against our spec

Legend: **R** ready, **C** configurable without code, **X(size)** needs a code change, **M** missing.

### 3.1 Nine stages

| Stage | Status | Notes |
|---|---|---|
| 1 Intake (Triage sizes S/M/L, R0–R2; Operator accepts) | C + X(M) | Triage = agent node + approval node in an SOP; size and risk as artifact fields. Routing S vs M/L to different next steps needs conditional edges: edges only have `when: success` (`workflow.go:103-108`). Workaround: separate SOPs dispatched by the outer controller |
| 2 Spec (Interviewer, Operator approves) | C | Agent node + approval; `SpecReview → Specifying` "clarify" = approval send-back (`/reject`) |
| 3 Plan (Researcher for L, Planner, slice sub-issues) | X(L) | Plan + approval are configurable; creating sub-issues with blocked-by links and fan-out is missing (DAG is static; sub-SOP is a fixed reference, `workflow.go:56-57`) |
| 4 Implement (fresh session per slice, parallel sandboxes) | X(L) | Parallel ready branches exist (`internal/engine/parallel_exec.go`), but in one run workspace (`docs/architecture.md`), not one sandbox per slice. Dynamic frontier missing |
| 5 Checks and review (CI outside, other-family reviewer, JSON verdict) | C + X(S) | Reviewer role on Codex while Implementer is Claude Code: configurable. Verdict pass/fix/block → pass/rework/fail: R. Reading external CI status: missing in `github.go` (S–M) |
| 6 Acceptance (Validator runs the app, evidence) | C | Agent node with browser tools (`internal/runtime/browser*.go`), preview node, artifacts |
| 7 Merge (rules file auto-merges R0, Operator gate, merge queue) | X(M) | Merge exists (`github.go:213-250`), but no rules file, no merge queue; would use GitHub's merge queue from a script node |
| 8 Deploy and watch (Watcher rolls back) | C + X(S) | Script node for deploy, agent node as Watcher with a timed window; rollback by script. Nothing built in |
| 9 Learn (weekly Retro) | C | AI scheduled task with cron (`internal/domain/sync.go:60-85`, `schedule_execution.go:156-157`) |

### 3.2 Four parts

| Part | Status | Notes |
|---|---|---|
| O Orchestrator | R for one SOP run; X(L) for our item lifecycle | Run-level DAG, leases, recovery, retries are mature (`internal/engine/*`, 21k test lines). Item-level state machine, tracker write-back and caps across runs are not there |
| S Sandbox | X(M–L) | See 2.7. Network and token changes are in two files plus compose; the push proxy is new code |
| D Decision requests | R web UI, X(S) phone push | Inbox, approve, send back with comment all ready. Push: add a webhook/ntfy provider next to `internal/notification/provider.go` |
| T Session traces | R raw data, C/X(S) weekly six metrics | OTLP and cost per node exist; item number = requirement id. Weekly summary as a scheduled task or our job reading the API |

### 3.3 Fifteen states

LoopForge has two layers: requirement `Status` with 8 fixed values `backlog, todo, in_progress, in_review, done, closed, blocked, cancelled` (`internal/domain/issue.go:15`) and run/node statuses `running, waiting, waiting_approval, pending_input, succeeded, failed, cancelled` (`internal/domain/run.go:73-102`). Mapping:

| Our state | LoopForge equivalent | Status |
|---|---|---|
| Triaging, Specifying, Planning, Implementing, Verifying | `in_progress` + which node is running | C (derived from current node) |
| TriageReview, SpecReview, PlanReview, MergeReview | node `waiting_approval` on a named approval node | C (derived) |
| Blocked | `blocked` / rework budget exhausted → `waiting_approval` (`node_outcome.go:69-77`) | C, but semantics differ |
| Live | none | M |
| Done | `done` | R |
| RolledBack, ForHuman | none | M |
| Cancelled | `cancelled` | R |
| `state:*` labels on GitHub, Jira statuses | none | M (L, belongs in our adapter) |

Our 15 states are best kept in our outer controller and tracker adapter, deriving the agent/Review half from the run's current node. Changing `issue.go` status values would touch the UI, metrics and migrations: a fork-only change.

### 3.4 Cross-cutting rules

| Rule | Status | Evidence |
|---|---|---|
| One shared limit of 3 fix rounds per item, then Blocked | X(M) | Caps are per node: `MaxAttempts`, `MaxReworks` counted on the rework target (`workflow.go:76-77`, `node_outcome.go:60,82`, `run_ops.go:310`); integration conflicts have their own 3 (`integrate.go:14`). A run-wide counter is a small change in `node_outcome.go` and `run_ops.go` (~100 lines + tests); across runs it belongs to our controller |
| Session time and cost limits; a hit counts as a failed round | X(M) | Only max-turns detection (`internal/runtime/runner.go:119-130,303-310`); no wall-clock or cost cap on agent nodes. Timeouts exist only for scheduled tasks (`schedule_execution.go:156-157`) and hooks (`agent.go:109`) |
| At most 3 items waiting for the Operator | M → controller (S) | Concurrency caps exist for runners (`runner.go:165-166`) and dispatch per schedule (`sync.go:82-83`), not for waiting gates. Our controller can count `waiting_approval` via the API |
| Pause the whole pipeline; cancel from any state | Cancel R (`run_ops.go:47`), per-run pause R (`run_ops.go:109`); global pause M → controller (S) or fork (S) |
| Code picks the next step from a JSON verdict | R | Gate MCP + result file (`gatemcp/server.go`, `gate_submit.go`) |

## 4. Extension points

| Point | What it allows | Where |
|---|---|---|
| SOP definitions (JSON via UI or `/api/workflows`, versions, publish) | Nodes, rework edges, attempt and rework caps, notifications, artifacts | `internal/domain/workflow.go`, `docs/api/orchestration.md` |
| Roles | Prompt, executor, model, rules, Skills, MCP, verification gates, hooks | `internal/domain/agent.go` |
| Script nodes with `credentialEnv` | Deterministic steps: CI polling, label writes, merge queue, deploy, rollback | `workflow.go:60-69` |
| Role hooks (SessionStart, PreToolUse, PostToolUse, Stop) | Guardrails inside Claude Code/Codex/CodeBuddy | `agent.go:99-111`, `internal/runtime/hooks.go` |
| MCP servers per role, platform MCP | Our tools for agents; agents driving the platform | `internal/mcpserver/`, `internal/mcpclient/` |
| Custom sandbox Dockerfiles | Toolchains per project | `dockerfiles` view, `internal/runtime/sandbox_environment.go` |
| AI scheduled tasks | Retro, Watcher-like periodic jobs | `internal/schedule/` |
| HTTP API (136 paths) + personal tokens | An outer controller: create issues, dispatch, wait, approve, reject, read telemetry | `docs/api/openapi.yaml` (`/api/issues/{id}/dispatch`, `/api/runs/{id}/wait`, `/approve`, `/reject`) |

There is no plugin system for providers: a new tracker, notification channel or sandbox driver is Go code in `internal/tracker`, `internal/notification`, `internal/runtime`.

**Can our rules go in without a fork?** Most of them, yes, if we accept an outer controller: tracker adapters (GitHub labels and sub-issues, Jira), the 15 states, slice frontier (one LoopForge run per slice), shared fix-round cap across runs, waiting-gate cap, global pause, merge rules and queue, Watcher. **Sandbox hardening and per-session limits need code inside LoopForge.** Part of the network fix is config: `AGENTFLOW_DOCKER_NETWORK` is an env var (`sandbox_docker.go:768`), so it can point at an `internal: true` network that only reaches an egress proxy and the platform. The token exposure and branch restriction cannot be fixed by config.

**Fork cost.** The touch set for a soft fork is small and well-seamed: `internal/runtime/sandbox_docker.go` (create args), `internal/runtime/run_git_credentials.go` (relay), `internal/runtime/github_mcp.go`, `internal/engine/node_outcome.go` and `node_execute.go` (limits), plus compose. Those files churned moderately last week (runtime +12k lines across 25 commits, engine +1.8k across 15), so expect weekly rebase conflicts in `runtime/`. Tests are heavy (engine 21k test lines vs 14k code), which helps. Avoid touching `internal/httpapi` (50k lines, +18.9k/−8.4k in one week) and `web/`.

## 5. Quality and risks

- **Young and fast.** Five months old, 0.x, 11 releases in two weeks, 39 migrations. Breaking changes are likely; CHANGELOG has no "breaking" markers to rely on. Pin an image tag and upgrade on purpose.
- **Bus factor 3**, all one employer, with a private master. If Tencent's internal priorities move, the public mirror can stall. Mitigation: MIT, the code is ours to keep.
- **Maintainer responsiveness** high (same-day), but first-time PRs are closed as "already covered" and re-implemented.
- **Security (agent reach):** full user GitHub token via the relay (`run_git_credentials.go:60-66`) and GitHub MCP header (`github_mcp.go:35`); open egress; shared network with MySQL and the API; no ref restriction; Docker socket on the platform. Today's design breaks our decision 21 on every point.
- **Agent prompts in Chinese** inside the engine (`gate_submit.go:109-127`); fine for models, awkward when the Operator reads traces. The chat workbench UI is Chinese only.
- **Telemetry:** none found from the platform itself.

## 6. Verdict as a base for us

**Score: 6/10.** As a pure engine for our rules it is still about where the earlier report put it. As a base once we count the cost of building the UI, projects, accounts, repo integration, run views, inbox, executors and cost views ourselves, it saves months.

### Reuse unchanged
Web UI (inbox, runs, SOP designer, roles, stats), accounts and projects, GitHub connect, executors (Claude Code for Implementer, Codex for the reviewer), gate MCP and routing, per-node attempts and reworks, run pause/cancel/retry, artifacts and logs, OTLP and cost, scheduled tasks, Compose deployment, HTTP and MCP API.

### Ordered changes

1. **Sandbox network (S–M).** Compose: a dedicated `internal: true` network for sandboxes with an egress proxy (allow-list: model APIs, package mirrors) and the platform relay; point `AGENTFLOW_DOCKER_NETWORK` at it; keep MySQL off that network. Patch `sandbox_docker.go:768-781` so conversation workspaces do not fall back to the relay network and host gateway. Add CPU, memory and pids limits.
2. **Git push proxy and token removal (M).** Replace the relay's raw-token reply (`run_git_credentials.go:54-72`) with a smart-HTTP push proxy that allows only `refs/heads/<slice-branch>` and holds the token itself. Stop handing the user token to GitHub MCP for agent roles (`github_mcp.go`); PR creation and merge stay in the platform (`tracker/github.go`). Prefer a GitHub App installation token limited to the repo.
3. **Per-session time and cost limits (M).** Wall-clock deadline and cost cap per agent node in `node_execute.go`, with a "limit hit" error that `node_outcome.go` treats as a failed round.
4. **Outer controller (L, our code, outside LoopForge).** Tracker adapters for GitHub Issues (labels `state:*`, sub-issues with blocked-by) and Jira; our 15 states; slice frontier as one LoopForge run per slice; shared fix-round cap across runs; at most 3 waiting; global pause; Operator decisions still taken in LoopForge's inbox and read back via the API.
5. **Run-wide fix-round counter (S).** If slices run as separate runs, the controller owns it; inside one run, add a shared counter in `node_outcome.go` / `run_ops.go`.
6. **CI status and merge path (M).** Script nodes (or a tracker method) that read check runs, apply the auto-merge rules file and enqueue in GitHub's merge queue; eject on red.
7. **Phone push (S).** A generic webhook or ntfy provider beside `internal/notification/provider.go`, or our controller sends it.
8. **Deploy and Watcher SOP (S–M).** Script deploy, timed Watcher agent, rollback script, new work item via the API.
9. **Defaults and language (S).** Our role catalog with Claude Code and Codex defaults; English prompts where we control them. CodeBuddy-only side features (clarification, bot replies, evals) we simply do not use.

### Fork or extend
**Extend, with a thin soft fork.** Items 4–9 sit outside LoopForge or in SOP/role config. Items 1–3 are a patch set of roughly 1–2k lines in `internal/runtime` and `internal/engine`, rebased onto pinned releases, not tracked on every commit. Offer items 1–3 upstream as opt-in settings: the maintainers already invest in security boundaries (`gitegress`, redaction, cap-drop) and merged contributor PRs on runtime (e.g. #150, #161), so acceptance is plausible but not certain; their pattern of re-implementing suggests filing an issue with a design first. Tracker, state-machine and limit-policy changes will not be accepted upstream and should not be forked in.

### Where I disagree with the earlier report

| Earlier | Now | Why |
|---|---|---|
| D = 2 | D ≈ 2.5 | The inbox, send-back to a chosen node with a comment, and run controls are complete (`web/approvals.js`, `run_ops.go:140-359`). Only phone push is missing, an S change. With Claude Desktop dropped, LoopForge's own UI is exactly what decision 12's replacement needs |
| O = 2 | O = 2 for our lifecycle, but the run engine is a large ready asset | Leases, recovery, parallel branches, rework budgets and gate parking are implemented with 21k test lines; the earlier report counted only missing item-level rules |
| S = 1 | S = 1 now, but cheaper to fix than implied | The weakness is concentrated in two files and compose; the network part is partly config (`AGENTFLOW_DOCKER_NETWORK`). The push proxy we would write anyway in the Temporal plan |
| "Credential relay gives a GitHub token" | Confirmed and worse | The relay returns the user's token for any host it holds (`run_git_credentials.go:60-66`), and GitHub MCP receives it too (`github_mcp.go:35`) |
| "CodeBuddy-first defaults" | Confirmed, but not a blocker | Claude Code and Codex are first-class per node (`provider.go:155-157`, `provider_claude.go`); only side features are CodeBuddy-only |
| "MIT (GitHub shows NOASSERTION)" | Confirmed | Preamble plus third-party section confuses the detector; terms are MIT |
| "Mirror of a private upstream" | Confirmed, and it accepts PRs from returning contributors (24 merged), none from first-timers | `docs/upstream-sync.md`, PR stats |
| Earlier weighting ignored build cost | Building UI, accounts, projects, GitHub connect, executors for 10 CLIs, run views and cost views ourselves on Temporal is several months; LoopForge has them now | Section 2 |

## Not verified

- Nothing was run: UI behaviour is read from code, README and screenshots in `docs/assets/readme/`.
- Whether the bundled CodeBuddy CLI sends its own telemetry.
- Exact GitHub scopes requested by the built-in OAuth App (device flow); assumed `repo`.
- Whether parallel branches in one run can be pinned to separate sandboxes by configuration.
