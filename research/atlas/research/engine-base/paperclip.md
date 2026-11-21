# Paperclip — deep read as a base for the 9-stage pipeline

Repo: https://github.com/paperclipai/paperclip, cloned at `1b1861c` (2026-11-21), depth 200. Read statically only; nothing was installed, built or run.

**Verdict: 5/10.** It is the most complete operator product in this round: web UI, multi-user auth, issues with sub-issues and `blocks` relations, review and approval stages enforced by the runtime, a 3-round review limit that escalates to a human, Claude/Codex/Gemini/OpenCode adapters, cost accounting, a Kubernetes sandbox with deny-all egress, and a very wide plugin SDK. What it does not have is an SDLC spine. It has no tracker intake: Jira is only an MCP tool for agents, and GitHub is an @mention bot. It has no stage machine: the `pipelines` tables exist but nothing uses them. It does not read CI, has no merge rules or merge queue, and has no deploy watcher. It also has no Docker sandbox for a single server. It is too big and moves too fast to fork, so everything we add has to be a plugin. That is possible, but the plugin would become our Orchestrator.

## 1. Web UI, auth, multi-user

- React UI with about 180 pages in `ui/src/pages`, among them: Dashboard, Inbox, WhatNeedsMe, DecisionQueuePage, Issues/IssueDetail (346 KB), Approvals/ApprovalDetail, Agents/AgentDetail (budgets, costs, tools, audit tabs), OrgChart, Projects, ExecutionWorkspaceDetail, Routines, Costs, Timeline, Audit, Secrets, CompanyEnvironments, PluginManager/PluginSettings, Search, Cases (experimental).
- What the Operator can do: create and assign issues, set Reviewer and Approver on an issue (`docs/guides/execution-policy.md` §UI), decide approvals, answer decision cards (`ISSUE_THREAD_INTERACTION_KINDS`: `ask_user_questions`, `request_confirmation`, `request_item_verdicts`… in `packages/shared/src/constants.ts:281`), pause agents, pause the whole company (`companies.pausedAt`, `packages/db/src/schema/companies.ts:12`), read run transcripts, and watch costs.
- Auth: Better Auth 1.7 (`server/src/auth/better-auth.ts`). There are two modes, `local_trusted` (no login, loopback only) and `authenticated` (private or public), described in `docs/deploy/deployment-modes.md`. Multiple human users with invites and join requests are supported (ROADMAP "Multiple Human Users" ✅).
- Self-hosting: `docker/docker-compose.yml` (Postgres 17 plus server on :3100), Podman quadlets in `docker/quadlet/`, and a Tailscale private-access guide. This fits one Linux server.

## 2. Git and tracker integration

- **Jira:** only a connected-app definition. `packages/shared/src/app-definitions/jira.json` points agents at Atlassian's hosted MCP server (`mcp.atlassian.com`) through OAuth. There is no intake, no state sync and no webhook. ROADMAP "Bring-your-own-ticket-system (Asana / Linear / Jira as on-ramps)" is ⚪ not started. Linear has the same status (`app-definitions/linear.json`). GitLab has no integration; the only hit is in a telemetry config.
- **GitHub:** this integration is real and large, about 15.7k lines in `server/src/services/github-*.ts`, `chat-github-*.ts` and `heartbeat-github-launchers.ts`. Its shape is a **GitHub App chat bot**. Webhook events `issues`, `issue_comment`, `pull_request`, `pull_request_review(_comment)` become Paperclip tasks when the bot is mentioned or a thread is subscribed (`chat-github-events.ts`). The bot can read a PR, comment, and submit a formal review (`chat-github-tools.ts`: `read_pull_request`, `begin_review`, `submit_review`, `formal_review`). It publishes its own check run named "Paperclip Review" (`chat-github-checks.ts:193`, `chat-github-reviews.ts:1412`). Labels are parsed but not mapped to states. There is **no sub-issue sync**. It does **not read external CI checks**: the only check-runs query filters on its own check name. It **never merges**: no merge call exists anywhere. `github-pull-request-merge.ts` only resolves merge state, and `merged-pr-confirmation-work.ts` watches for merges.
- Agent git access goes through a credential **broker**. A `git`/`gh` launcher shim lets local git subcommands run directly and sends remote ones through a broker token, so no raw token sits in files (`packages/adapter-utils/src/github-launcher.ts:36`). Low-trust issues get no exportable GitHub credential (`server/src/services/github-operation-credentials.ts`).

## 3. Workflow and gates

- Issue statuses are a fixed list of 7: `backlog, todo, in_progress, in_review, done, blocked, cancelled` (`packages/shared/src/constants.ts:198`). Issues have `parentId` (sub-issues) and `issue_relations.type = "blocks"` (`packages/db/src/schema/issue_relations.ts:13`).
- **Execution policy** is per issue: an ordered list of `review` and `approval` stages whose participants are agents or users (`docs/guides/execution-policy.md`, `server/src/services/issue-execution-policy.ts`, 1,275 lines). When the executor sets `done`, the runtime intercepts it, sets `in_review` and reassigns to the reviewer. The reviewer's decision is a **status transition plus a mandatory comment** in the same PATCH: `done` means approve and any other status means changes requested. Each decision is stored in `issue_execution_decisions`. This is structured, but binary: there is no `block` outcome distinct from `fix`, and no JSON payload.
- **Round limit:** `DEFAULT_MAX_REVIEW_ROUNDS = 3`, and policies can override it with `maxReviewRounds`. When the limit is hit, the review escalates to the responsible human (`issue-execution-policy.ts:64-69, 444`). This is close to our rule of 3 fix rounds, but it counts per stage, not per item, and it escalates instead of moving the item to Blocked.
- Self-review is excluded. Only one agent run can be active per issue. Every run must leave a comment, with one retry (`commentRequired`).
- Board approvals are limited to the types `hire_agent, approve_ceo_strategy, budget_override_required, request_board_approval` (`constants.ts:864`). "Deep Planning" provides plan approvals.
- **Pipelines:** `packages/db/src/schema/pipelines.ts` defines `pipelines`, `pipeline_stages` (kind `working|review|done|cancelled`, jsonb config) and `pipeline_transitions` with `enforceTransitions`. No server service queries them; grep finds them only in the schema. "Cases" and "workflows" sit behind the experimental `enableCases` flag, which defaults to off. A workflow is only a name plus a prompt ("No interpreter or new execution service", `doc/plans/2026-10-21-reusable-case-workflows.md`).
- **Cost and time:** budget policies are scoped to `company | agent | project`, with metric `billed_cents`, a window of `calendar_month_utc | lifetime`, and soft or hard thresholds (`constants.ts:1050-1060`; `services/budgets.ts`, 1,405 lines). There is no budget per item or per session. The time limit is the adapter's `timeoutSec` per run.
- **Next step:** agents wake by heartbeat or assignment, check out an issue and act through the API. Apart from the review/approval interception, routing is up to the agent's tool calls, i.e. prose-driven. There is no WIP limit on items waiting for the Operator.
- Pause and cancel: company pause, agent pause/resume, run cancellation (`agent-run-cancellation.ts`), and the `cancelled` status.

## 4. Sandbox

- Environment drivers are `local | ssh | sandbox | plugin` (`constants.ts:745`). `local` runs on the host with no isolation.
- Sandbox providers are plugins in `packages/plugins/sandbox-providers/`: boxd, cloudflare, createos, daytona, e2b, exe-dev, **kubernetes**, modal, novita. **There is no Docker provider.** On one server the choice is k3s plus the kubernetes provider, or writing a Docker provider plugin (`paperclip-plugin-fake-sandbox` is about 570 lines and could serve as a template).
- The kubernetes provider (about 5.3k lines) applies a **deny-all NetworkPolicy** for ingress and egress, plus an egress allow-list. Port 3100 to the Paperclip server is always allowed. CIDR allow-lists can be set, an RFC1918/IMDS-excluded "public internet" fallback is available, and `egressMode: "cilium"` enables FQDN rules (`kubernetes/src/network-policy.ts`).
- The stated contract in `SANDBOX-REQUIREMENTS.md` is that Paperclip protects only two authorities, host file writes (workspace sync) and the Paperclip API bridge. It says "does not enforce" internet policy inside the sandbox and admits it does not enforce the provider rules either.
- Credentials: model API keys are injected as env (`kubernetes/src/adapter-defaults.ts`: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). GitHub goes through the broker. **Merge is not technically prevented:** grep finds no `pr merge` or merge-endpoint deny rule in the broker or the launcher. Whether an agent can merge depends on the permissions of the GitHub credential the connection holds. Not verified at runtime.

## 5. Runners, models, logs, cost

- Adapters live in `packages/adapters/`: claude-local, codex-local, gemini-local, cursor-local/cloud, opencode-local, pi-local, grok-local, kimi-local, hermes(-gateway), openclaw-gateway. Claude plus Codex covers the second model family. A `codex-model-fallback` exists.
- Every run is recorded in `heartbeat_runs` with run events, transcripts (RunTranscript UI) and summaries. Costs are in `cost_events`, shown on the Costs page (57 KB) and in per-agent cost and budget panels. Live usage counts against reservations (`budget-live-usage.ts`, `budget-reservations.ts`).
- OpenTelemetry tracing and Sentry are both opt-in via env (README §Observability). Runs are linked to issue IDs, so per-item metrics can be computed from the DB, and plugins can read `heartbeat_runs` and `cost_events` (`PLUGIN_DATABASE_CORE_READ_TABLES`).

## 6. Extension points

- **Plugin SDK** in `packages/plugins/sdk`. Plugins run as forked worker processes over RPC (`plugin-worker-manager.ts:26`), with capability checks enforced by the host (`plugin-capability-validator.ts`). Capabilities (`constants.ts:1501+`) include: `issues.create/update`, `issue.relations.write`, `issues.checkout`, `issues.wakeup`, `issue.interactions.create`, `approvals.respond`, `agents.invoke/pause/resume`, `agent.sessions.create/send`, `events.subscribe/emit`, `jobs.schedule`, `webhooks.receive`, `api.routes.register`, `http.outbound`, `secrets.read-ref`, `environment.drivers.register`, `agent.tools.register`, its own DB schema namespace with migrations, and UI slots (`page`, `detailTab`, `taskDetailView`, `dashboardWidget`, `sidebar`, `settingsPage`, `toolbarButton`…).
- Events (post-hoc, no veto hook): `issue.created/updated`, `issue.relations.updated`, `issue.checked_out/released`, `agent.run.started/finished/failed/cancelled`, `approval.created/decided`, `budget.incident.*`, `cost_event.created`.
- REST API for everything, an MCP server (`packages/mcp-server`), a CLI, and company import/export (`companies.sh`).
- **Fit without a fork:** most of our rules fit as one "pipeline" plugin. It would provide GitHub Issues and Jira intake via `webhooks.receive` and `jobs.schedule`, keep the stage state in its own DB namespace, map it onto issue status, sub-issues and `blocks`, read a JSON verdict from an issue document, keep the shared 3-round counter, the Operator WIP limit of 3, per-item cost accounting from `cost_events`, CI polling, merge rules and merge calls through its own credential, a deploy watcher, and a stage board UI slot. There is no pre-transition veto, so the plugin has to react and correct after the fact. The built-in review interception would have to be either used as our gate or left off.

## 7. License, telemetry, activity, size

- MIT (`LICENSE`, "Copyright (c) 2025 Paperclip AI").
- **Telemetry is on by default**: anonymous usage, with private repo references hashed. Turn it off with `PAPERCLIP_TELEMETRY_DISABLED=1`, `DO_NOT_TRACK=1` or config (`packages/shared/src/telemetry/config.ts:71-85`).
- Activity from `gh api` on 2026-11-21: 115.6k stars, 19.2k forks, created 2026-03-02, last push today. Weekly commits over the last 26 weeks rose from about 50–140 to **898, 1,085, 333** in the last three weeks. Search counts give Aug 687 and Oct 1,398 commits; the other months failed on rate limits or my date errors, and weekly sums suggest roughly Jun 270, Jul 460, Sep 650, Nov (3 weeks) about 2,300. Issues: 4,011 open / 1,297 closed. PRs: 2,958 open / 13,887 closed. Releases are dated CalVer, about every 1–2 weeks (v2026.1117.0 on 2026-11-18).
- Bus factor: the top contributor holds 5,548 of about 7,800 counted contributions, roughly 70%. The next two hold 1,104 and 582. Much of the code looks agent-written (bot authors, worktree-based plans).
- Size, TypeScript excluding paths with "test": server/src about 745k lines, ui/src about 422k, packages about 374k, cli about 29k, so **about 1.57M lines**. `server/src/services` alone has 1,090 files.

## 8. Score: 5/10 as a base

Top 5 strengths:
1. A complete operator web UI with Better Auth multi-user, approvals, decision cards, inbox and "what needs me", run transcripts, costs, and company-wide pause. This is exactly the part the owner did not want to build.
2. Runtime-enforced review/approval stages with an audit trail, self-review excluded, and `maxReviewRounds = 3` escalating to a human. That is close to our gate and fix-round rules.
3. Multi-family runners out of the box (Claude Code, Codex, Gemini, OpenCode…), with per-run cost events and budgets with hard stops.
4. A serious sandbox story on Kubernetes: deny-all NetworkPolicy, egress allow-list, a GitHub credential broker instead of raw tokens, and quarantine for low-trust sources.
5. A wide, capability-scoped plugin SDK (webhooks, jobs, issue writes, own DB schema, UI slots, environment drivers) under MIT, so our Orchestrator can live as a plugin instead of a fork.

Top 5 gaps:
1. No stage machine for our 15 states and 9 stages. Statuses are fixed at 7 and `pipelines` is unused schema. We would build the Orchestrator as a plugin, with state, transitions, the shared round counter, the WIP limit of 3 and JSON verdicts. **L**
2. No tracker intake. Jira and Linear are MCP tools only and the roadmap item is not started; GitHub is a mention bot with no label or sub-issue sync. We would build intake and two-way sync for GitHub Issues and Jira. **M**
3. No CI reading, merge rules, merge queue, deploy or watcher. We would build CI polling, an auto-merge rules file, merge through a separate credential, deploy and rollback. **L**
4. No Docker sandbox for one server, and merge is not blocked at the credential layer. Options are k3s plus the provider, or a Docker provider plugin, plus a GitHub App with no merge permission for agent pushes. **M**
5. Size and churn: 1.57M lines, about 1k commits a week, about 4k open issues, one dominant author, telemetry on by default. A fork is impossible, and plugin APIs may shift under us. Pin releases, budget upgrade work per release, and turn telemetry off. Ongoing **M** per quarter.

Also missing: budgets per item or session (only per company/agent/project, monthly or lifetime), a **S–M** plugin job over `cost_events`; and a `block` verdict distinct from `fix`, **S** in the plugin.
