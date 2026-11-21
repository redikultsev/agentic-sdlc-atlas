# Deep read: Aixle Flow (github.com/AixleHQ/flow)

Read statically on 2026-11-21 from a `--depth 200` clone of branch `develop` (nothing was run). Paths are relative to the repo root.

## Verdict in one line

The "about 40 stars" label is misleading. This is a large commercial product (SaaS plus AWS Marketplace) released under Apache-2.0. It has about 137k lines of Ruby, 119k of TS/TSX and 24k of Go, plus 163k lines of Ruby tests. The README claims are real in the code, and the product goes past them. As a base for us it is the strongest candidate I have read for the "web UI, projects, git and tracker integration, accounts" layer. It is weak exactly where our orchestration rules live: routing on a structured verdict, fix-round limits, cost and time caps, and a sandbox that is closed by network and by credentials. **Score: 7/10.**

## 1. Web UI and auth

- Rails 8.1 + Inertia + React 19 + Mantine (`ARCHITECTURE.md`). The pages in `app/frontend/pages/Projects/` are Board, Workflows (a visual DAG builder with versions, history, revert and archive), WorkflowRuns, Sessions (a live terminal per agent container, plus a read-only view), Triggers, Trackers, Repositories, Runners, Agents, Skills, Tools, McpServers, Assets, Analytics, Members, Teams, Settings, Config and AixleBuilder (a chat agent that builds workflows). There is also a company-level Admin and an in-app docs site.
- Step runs have **Approve / Retry / Skip** controls (`docs/user-guide/workflows.md`, "Approval gates"). Runs can be cancelled (`workflow_runs_controller.rb#cancel`).
- Multi-tenant: companies, then projects. Roles are admin, employee and viewer. Pundit policies live in `app/policies/`. Project teams have a member-picking strategy.
- Sign-in methods: password, passkeys (WebAuthn), TOTP, magic link, Google OAuth, Microsoft/Entra OAuth, and SCIM provisioning (`docs/user-guide/configuring-sso.md`, `config/initializers/omniauth.rb`). There is **no generic OIDC/SAML**; the roadmap lists SAML as a future Enterprise item. Sessions are server-side `UserSession` rows that can be revoked. People get personal MCP tokens.

## 2. Git and tracker integration (deep)

- **Git hosts:** GitHub (App or PAT), GitLab, Bitbucket (a Forge app in `bitbucket-app/`), and Azure DevOps (`app/services/{github,gitlab,bitbucket,azure_devops}`).
- **PR tools for agents:** `pull_request_list/get/changes/checks/list_comments/create/update/add_comment/review/merge` (`app/services/internal_tools/`). `pull_request_merge` requires `expected_head_sha`, respects branch protection, and has a per-connection switch `pull_request_merge_enabled?` (`internal_tools/pull_request_merge.rb:32`).
- **Trackers:** Jira, Linear, YouTrack, Azure Boards, GitLab issues, and **GitHub Projects v2**. GitHub needs an org App; projects owned by a personal account are impossible (`docs/user-guide/github.md:270-281`). Tracker triggers fire on issue created, status change, assigned and comment. Agents get `tracker_*` tools: search (JQL for Jira), get, create, update labels and fields, transition, assign, comment, attachments (`docs/user-guide/trackers.md:370-385`).
- **Gaps for us:** I found no tool for parent/sub-issue or blocked-by links (I looked in the tracker tool list and the `internal_tools` file names). Plain GitHub Issues work only through a GitHub Project board.
- **PR-event triggers:** review submitted (with the verdict approved / changes_requested / commented) and comment created. There is loop protection (5 chained runs, 10 events per hour) and one run per PR at a time (`docs/user-guide/triggers-and-gates.md`).
- **CI gates:** `board_create_gate` parks a card until GitHub checks or Actions, a GitLab pipeline, an ADO build or a Bitbucket status resolves. Gates have a TTL and a reconciliation sweep, and a "stale" result never counts as a pass. This is close to our "CI runs outside the sandbox" step.

## 3. Workflow and gates

- **Workflows are database entities edited in the UI or through MCP/API, not files.** They can be exported as templates. A workflow is a DAG of Steps: one Step is one container session. `depends_on_step_ids` enables parallel siblings, and cycles are rejected. SubSteps are an unenforced checklist (`docs/user-guide/workflows.md`).
- Per step: `on_failure` retry/skip/fail, `max_retries` 1-10, `skip_policy`, `preferred_model`, `reasoning_effort`, and required input/output asset specs. A missing output fails the step; its contents are **not schema-checked**.
- **Board as state machine:** a column binding starts a workflow, manual or auto, with a cooldown. A human gate is either the Operator dragging the card, or a step with auto-run off that waits for Approve. Note that the container already exists while it waits.
- **The next step is chosen by agent action or prose.** A step ends when the agent calls `finish_session(note)` or `fail_session` (`internal_tools/finish_session.rb`). Moving the card to the next column, which triggers the next workflow, is done by the agent through `board_move_task`. There are no conditional edges and no routing on a JSON verdict. A fix → review loop cannot sit inside one DAG because cycles are forbidden; it has to bounce through columns and agent tool calls. **This breaks our "code picks the next step from a JSON verdict" rule.**
- **Limits:** session concurrency and admission pools exist (`app/models/session_admission_*`, `docs/user-guide/session-queues.md`), so do an idle-terminal timeout (30-35 minutes) and the TTL on CI gates. I found **no per-session cost or wall-clock cap**: I grepped for budget, max-cost and max-duration settings and found none. There is no shared fix-round counter and no limit on items waiting for the Operator. `WorkflowRun` has `pause`/`resume` events in AASM (`app/state_machines/`), but I found no global "pause pipeline" control.
- **Durability:** Temporal (`app/temporal/workflows/workflow_execution_workflow_v2.rb`, `container_workflow_v2.rb`), and a transactional outbox for board triggers.

## 4. Sandbox, network and credentials (the key risk)

- Runtimes: `DockerRuntime` (local daemon), `KubernetesRuntime` (production), and `RunnerRuntime`: a Go `aixle-runner` on your own machine, behind the feature flag `external_runners` (`app/services/container_runtime/`, `runner/`).
- **Kubernetes:** a default-deny NetworkPolicy, then allow-rules for DNS, the app's web/MCP/OTLP ports, and **all public internet** minus RFC1918, CGNAT and link-local (`kubernetes_runtime.rb:1587-1790`, ranges in `config/settings.yml`). There is an opt-in restricted pod profile (`restricted_agent_pods`, default false): non-root, all capabilities dropped, RuntimeDefault seccomp (`kubernetes_runtime.rb:1223`).
- **Docker (our single-server case):** containers join `app_agents`, which holds web, otlp-ingest and traefik but not db, redis or temporal (`docker-compose.yml:322-331`). Only `NET_RAW` is dropped (`agent_base_strategy.rb:223`), and there are memory, CPU and PID limits. **Internet egress is open and there is no allowlist.** "Network closed" would be our own work: a custom Docker network with an egress proxy, or the Kubernetes policies ported.
- **Git credentials:** no token sits in env or in the checkout. A credential helper calls the app's `/agents/git/credentials` with a per-session key and gets a fresh token on each git or `gh` call (`app/services/git_credentials/session_git_setup.rb`, `vendor.rb`). For a GitHub App the token is narrowed **to the repository, not in permissions**. The App asks for Contents RW and Pull requests RW (`docs/user-guide/github.md:165,199,438`), and `mint_installation_token` passes only `repositories:` (`github/token_service.rb:118-121`).
  - **Consequence:** an agent can run `gh pr merge` or push to any branch with that token. That sidesteps the `pull_request_merge_enabled` switch, which guards only the tool. Only GitHub branch protection and rulesets stop it.
  - **Mitigation:** require a human approval on `main`; the App cannot approve its own PRs. Narrowing permissions per step is a small patch: pass `permissions:` when minting the token.
  - **PAT, GitLab token and Bitbucket API token cannot be narrowed at all** (`docs/user-guide/github.md:102`).
- **Model credentials:** each user logs into each CLI once. The credential file is captured, stored encrypted (`Encryptable`), and **injected into the container at start** (`docs/user-guide/runtimes.md`). The agent can therefore read its own model token.

## 5. Agent runners, models, logs and cost

- Eight runtimes, one adapter each (`app/services/agents/*_adapter.rb`): Claude Code (API key, subscription or Bedrock), Codex, Gemini CLI, Antigravity, Cursor CLI, Grok, Kiro and Copilot CLI. A second model family per step is a dropdown.
- Logs: session logs and terminal recordings go to S3 through Shrine. The live terminal is served over websocket and Traefik. Agent OTLP goes to an ingest relay.
- Cost: `TerminalSession` has `cost_cents`, `total_tokens` and `duration_seconds` (`app/models/terminal_session.rb:211`). There are company, workflow and session cost analytics services and an Analytics page. Cost is **tracked, not capped**.

## 6. Extension points

- REST `/api/v1` with OpenAPI at `/api-docs`. The app is also an MCP server that exposes most of the platform: create workflows and steps, triggers, board moves, gates.
- Inbound signed webhooks start runs (`/webhooks/in/<slug>`, with HMAC, shared-token or Slack verification). There are cron schedules, Slack and Teams triggers, and an event trigger on `workflow_run.quota_exceeded`.
- Custom tools run in their own containers (`CustomToolStrategy`). Skills, MCP servers and templates come with a catalog sync.
- There are no plugins and no workflow-as-code files. Our rules (verdict routing, the 3-round limit, cost caps, the 3-waiting-items cap, the R0 auto-merge rules file) can partly sit **outside** the engine. Option one is an external "conductor" service: it listens on webhooks and the API, moves cards and starts runs from a JSON output file. Option two is a maintained fork of `WorkflowExecutionWorkflowV2`. A plain config-only setup will not hold them.

## 7. License, telemetry, activity, bus factor, size

- **License:** Apache-2.0, with a trademark policy, plus a CLA and DCO for contributors.
- **Editions:** `deployment.mode` is `self_hosted`, `saas` or `aws_marketplace`, and unset means saas (`config/settings.yml:819`). Stripe and marketplace billing code ships in the tree. Some features sit behind flags, for example `external_runners`.
- **Telemetry:** none by default. The Sentry DSN is empty in `.env.example`. The "Insights" OTLP forwarder stays hidden unless `INSIGHTS_*` is set.
- **Self-hosting:** images are published to `ghcr.io/aixlehq`. The production Kubernetes manifests live in a **separate private ops repo** (`ARCHITECTURE.md`). The public `docker-compose.yml` is a dev stack (`make setup`), so a one-server production compose is ours to write. The ROADMAP's "one-command setup" is still unchecked.
- **Activity:**
  - Created 2026-08-05 (public). History starts in 2026. 39 stars, 16 forks, last push 2026-11-21.
  - Commits per month on develop, Jun to Nov 2026: 268, 416, 256, 150, 218, 162.
  - Releases are frequent (v1.16.0 on 2026-11-19, runner v0.4.1).
  - PRs: 811 closed, 9 open. Issues: 3 closed, 1 open, so outside users barely exist yet.
- **Bus factor:** about 2. Of 2,210 commits, artempartos has 1,131 (51%) and NOX73 has 298 (13%); bots account for 304. The project is driven by a company team, with about 10 human contributors.
- **Size:** about 137k lines of Ruby, 119k of TS/TSX and 24k of Go, plus 163k lines of Ruby tests, about 360 migrations, and coverage floors in CI. It is mature, but also heavy to fork and to run: Rails, Postgres, Redis, Temporal, Traefik, the MCP Puma process and OTLP ingest.

## 8. Score: 7/10 as a base

**Top 5 strengths**
1. A complete Operator web UI: board, workflow builder, live session terminals, run views, analytics, multi-tenant RBAC, and passkey/Google/Microsoft sign-in. This is the layer the earlier verdict under-priced.
2. Deep GitHub and Jira integration: tracker triggers, `tracker_*` tools, PR tools with a head-SHA-checked merge, PR-review triggers, and CI gates with TTL and reconciliation.
3. Temporal-backed DAG with retries, parallel steps in separate containers, approvals, an outbox and dedup. It is the same substrate we planned to build on.
4. Eight agent CLIs including Claude Code and Codex, picked per step with model and effort, and cost tracked per session.
5. Apache-2.0, no default telemetry, and an API + MCP + webhook surface that lets an external conductor drive it without a fork.

**Top 5 gaps (size)**
1. No routing on a structured verdict, no fix loop inside a workflow, no shared 3-round counter. The agent moves the card. Fix: a conductor service, or a patch to the execution workflow so it reads a JSON output and picks the column. **M**
2. The sandbox is not network-closed: public egress is open in both Docker and Kubernetes. Fix: an egress allowlist proxy for the Docker agent network, with model API, git host and registries only. **M**
3. The git token carries Contents and PR write, so an agent can merge or push to `main`. Fix: GitHub rulesets now (S), plus a patch that mints per-step tokens narrowed by permission (S-M). The model credential file also sits inside the container. **S-M**
4. No per-session cost or time caps, no cap on items waiting for the Operator, no global pause. Fix: add them to the conductor or to admission. **M**
5. Operational weight and no public production deploy for one server. We must write a compose for Rails, Temporal, Postgres, Redis, Traefik and MCP, and track a fast-moving codebase of about 280k lines with a bus factor of about 2. A fork drifts quickly. **M to deploy, L as an ongoing cost if forked.**

Also missing: sub-issues and blocked-by links in tracker tools (S-M), plain GitHub Issues without a Projects board (S-M), and a Watcher or deploy stage, which would be a workflow we write.
