# agent-swarm as the base for our pipeline: re-evaluation

Date: 2026-11-21. Repo: https://github.com/desplega-ai/agent-swarm, shallow clone at `48fa684` (2026-11-21 06:36 UTC), v2.14.2. The code was read statically. Nothing was installed or run. Paths below are relative to the repo root. `DOCS` means `docs-site/content/docs/(documentation)`.

**Not verified (read this first):**
- Nothing was run. Every behaviour claim comes from code and docs, not from a live install.
- Commit counts per month are partial. GitHub search returned July 173, August 176 and October 715. June, September and November failed: two because of a bad date in my query, then the API rate limit cut the rest.
- A global daily budget of 0 used as a pause switch is my reading of `src/be/budget-admission.ts:89-101`. I did not check that the API accepts 0.
- I did not check that a tick script can create approval requests directly. The REST route exists (`src/http/approval-requests.ts:369`). The script SDK allow-list shows `workflow_trigger` but only `approval_cancel` for approvals (`src/scripts-runtime/sdk-allowlist.ts:154-165, 228`).

## 1. Verdict in one paragraph

**Score: 6/10 as a base to extend.** The earlier report scored O2 S1 D2 T2 and leaned toward building our own on Temporal. With the owner's weighting, which counts the cost of building everything around the orchestration rules, agent-swarm comes out much stronger. It ships a 34-section web dashboard, RBAC with SSO through a proxy, GitHub, GitLab, Bitbucket, Azure DevOps, Jira and Linear integrations, about 15 agent harnesses (Claude Code, Codex, OpenCode, pi, Cursor, Amp, Devin and others), per-task Docker or E2B runtimes, approval cards with Slack, email and Telegram, cost per session, and OTel. The earlier report also missed one thing: the **Linear Delivery Loop** template. It already implements the shape of our Orchestrator outside the engine core. It is a tick script that treats tracker workflow states as the state machine, takes one action per issue per tick, enforces per-kind attempt caps in code and escalates to a "Requires human action" state (`templates/community/linear-delivery-loop/scripts/linear-delivery-tick.ts:21-60, 668-680`). Our O can be written the same way, as our own script on top of the engine, with no fork. What drags the score down: the sandbox and credentials (open egress, an installation-wide GitHub token that can merge, a PAT fallback in the worker env), no per-session cost or time cap, shallow Jira write-back, gates that agents can edit, and a very large codebase (about 338k non-blank lines of non-test TypeScript in `src/` alone) written mostly by a bot, which makes a fork expensive. **Extend, don't fork.** Send two or three small security patches upstream.

## 2. Project health and quality

| Item | Value | Source |
|---|---|---|
| License | MIT | `LICENSE`, `package.json:17` |
| Created | 2025-12-19 | `gh api repos/...` |
| Stars, forks | 1,094 / 183 | `gh api` |
| Releases | 100 releases from v1.127.0 (2026-08-03) to v2.14.2 (2026-11-21). Major v2.0.0 on 2026-10-16 | `gh api releases`, `CHANGELOG.md:992` |
| Commits | Jul 173, Aug 176, Oct 715 (partial, see "Not verified"); the last 200 commits cover only 2026-11-20 and 11-21 | `gh api search/commits`, `git log` |
| Contributors | desplega-bot 2,172, tarasyarema 1,155, next ZedingZhang 75, fuvidani 47, capchase-bot 36 | `gh api contributors` |
| Issues | 23 open / 240 closed | `gh api search` |
| PRs | 17 open / 3,230 closed | `gh api search` |
| Responsiveness | Recent issues get a reply within a day, for example #3530 and #3528 from an outside user, each with 1 comment | `gh api issues` |
| Code size | `src/` about 338k non-blank lines without tests. `apps/ui` about 298k lines including tests | `wc`, `find` |
| Tests | 1,595 test files, about 514k lines; 74 workflow test files in `src/tests` | `find` |
| Storage | `bun:sqlite`, 263 migrations, single node | `src/be/db-client.ts:1`, `src/be/migrations` |
| Breaking changes | Present: v2.0.0 removed PM2, the service registry and artifacts (`CHANGELOG.md:995`). `latest` moves on every commit to main, and migrations are forward-only (`docker-compose.example.yml:31-40`) | |
| Telemetry | **On by default**, opt-out `ANONYMIZED_TELEMETRY=false` (`src/telemetry.ts:111-113`). Sends the org name and the admin's email domain (`DOCS/reference/telemetry.mdx:6-12`). Dashboard notification clicks go to the vendor's feedback endpoint (`DOCS/ui/index.mdx:77-81`). Optional `BUSINESS_USE_*` SDK (`BUSINESS_USE.md`) | |

**Bus factor.** In effect it is one human, Taras (`package.json:22-25`), plus an agent that commits through `desplega-bot` / `desplegillo` / `2pac`. The project is built by its own swarm: PR bodies carry "swarm provenance" (`DOCS/releases/2026-10-12.mdx:37`). Maintenance is very active, but the code is agent-written, and its volume grows faster than anyone can review it. That matters for a fork, not for using the engine.

## 3. What is ready for the owner

### 3.1 Web UI
`apps/ui/src/pages/*` is a Vite + React static SPA that uses `@xyflow/react` for graphs and Monaco for editing. The screens and what the Operator can do on each:

| Screen | What the Operator does there | Path |
|---|---|---|
| Home | Unified home | `pages/home/unified-home.tsx` |
| Tasks, task detail | Filter, create (with model and effort), cancel, pause, steer a running task | `pages/tasks/page.tsx`, `create-task-dialog.tsx`, `DOCS/guides/task-steering.mdx` |
| Sessions | Session view per root task: transcript, tool calls, cost | `pages/sessions/[rootTaskId]`, `components/sessions-v2`, `DOCS/ui/sessions.mdx` |
| Approval requests | List, answer and vote on HITL cards (approval, text, select, boolean, config) | `pages/approval-requests/*`, `src/workflows/executors/human-in-the-loop.ts:14-77` |
| Workflows, workflow runs | Graph view, JSON definition, versions, parameters, runs, phone layouts, cancel, retry | `pages/workflows/[id]/page.tsx`, `phone-graph.tsx`, `pages/workflow-runs/[id]` |
| Schedules, scripts, script runs | Cron schedules for tasks, workflows and scripts | `pages/schedules`, `pages/scripts`, `pages/script-runs` |
| Agents, templates, skills, memory | Agent profiles, official templates, skills, long-term memory | `pages/agents`, `templates`, `skills`, `memory` |
| Repos | Registered repos, guidelines, merge policy | `pages/repos/[id]`, `DOCS/guides/repo-merge-policy.mdx` |
| Budgets, usage, metrics | Daily budgets per agent, user and global; spend charts; savings; metrics | `pages/budgets/page.tsx` (39k), `pages/usage`, `pages/metrics` (37k) |
| Integrations, connections, MCP servers | OAuth connections, playground, MCP servers | `pages/integrations`, `pages/connections` (124k), `pages/mcp-servers` |
| People | Users, identities, invites, unmapped senders from GitHub and others | `pages/people/*` |
| Settings, config | Swarm config (env-like keys stored in the DB), extensions catalog, appearance | `pages/settings/*`, `DOCS/ui/configuration.mdx` |
| Comb | File browser over agent-fs with comments sent to the swarm | `pages/comb`, `DOCS/ui/comb.mdx` |
| Pages and apps | Agent-published pages and apps | `pages/pages`, `pages/apps` |
| Setup, connect, join, debug | Onboarding, connecting outside apps, a DB debug view | `pages/setup`, `connect`, `join`, `debug` |

Caveats:
- The dashboard keeps the API key in browser storage (`DOCS/ui/index.mdx:83-90`).
- The compose and Helm examples **do not deploy the dashboard image**. It runs as a separate `agent-swarm-ui` container (`DOCS/ui/index.mdx:108-133`).
- Pages must be served from a separate origin (same file).

### 3.2 Projects and repositories
- Repos are registered as `swarm_repos` rows with `guidelines` (`prChecks`, `mergeChecks`, `allowMerge`, `mergePolicy`) (`DOCS/guides/repo-merge-policy.mdx:6-45`).
- There is no "project" entity in our sense. Workflows carry `vcsRepo` and `dir` (`DOCS/concepts/workflows.mdx:724`).

### 3.3 Git providers and trackers
| Provider | Inbound | Outbound / write-back | Depth for us | Path |
|---|---|---|---|---|
| GitHub | Webhooks: @mention, assignment, label (`GITHUB_EVENT_LABELS`), review request, check runs (CI events suppressed by default) | Reactions; agents use `gh` with an App token: labels, comments, PRs, merge | Labels, sub-issues, checks and merge are possible **only through agents or scripts**. The engine itself keeps no label state | `src/github/handlers.ts` (1,589 lines), `DOCS/integrations/github.mdx:75-111` |
| GitLab | Webhooks, MRs, pipelines | Outbound comments | Same as GitHub | `src/gitlab/*` (sync.ts 36k) |
| Bitbucket, Azure DevOps | VCS adapters | — | Thin | `src/vcs/*` |
| Jira Cloud | OAuth 3LO; `issue_updated` (assignee becomes the bot), comment @mention | **Plain-text comments only** on task created, completed, failed or cancelled; no transitions, no labels | Shallow. Transitions need our own REST calls through `get-oauth-access-token` | `src/jira/outbound.ts` (188 lines), `DOCS/integrations/jira.mdx:8-125` |
| Linear | OAuth, webhooks | Comments; the Delivery Loop template moves workflow states and reads `blocks` | Deepest tracker, but only through the template | `src/linear/*`, `templates/community/linear-delivery-loop` |

Generic tracker tools: `tracker-link-task`, `tracker-sync-status`, `tracker-map-agent` (`DOCS/integrations/jira.mdx:127-137`).

### 3.4 Accounts, auth, multi-user
- No login page. A pre-shared `API_KEY`, or SSO through oauth2-proxy in gate or trusted-header mode (`DOCS/guides/self-hosted-sso.mdx:12-30`).
- RBAC is on by default with roles `admin`, `requester`, `viewer` and `auditor`. **Every new user gets admin** (`src/be/rbac-roles.ts:9-111`, the DB trigger at :106-111).
- Permission verbs live in `src/rbac/permissions.ts`.

### 3.5 Settings, policies, secrets
- Swarm config is stored in the DB and edited in the dashboard (`DOCS/ui/configuration.mdx`).
- Encrypted secrets, a central secret registry with a gitleaks rule set, and write-time scrubbing (`DOCS/releases/2026-10-12.mdx:12`, `DOCS/guides/secrets-encryption.mdx`).
- A credential broker for scripts (`DOCS/guides/scripts-credential-broker.mdx`).
- A repo merge-policy record (data only; scripts act on it).

### 3.6 Agent runners and models
- Adapters in `src/providers/`: `claude-adapter.ts`, `claude-managed-adapter.ts`, `codex-adapter.ts`, `opencode-adapter.ts`, `pi-mono-adapter.ts`, `cursor-adapter.ts`, `amp-adapter.ts`, `devin-adapter.ts`, `grok-adapter.ts`, `dsh`, `fx`, and generic ACP targets.
- Capability matrix: `DOCS/guides/provider-capability-matrix.mdx:8-13`.
- Per-node `model`, `modelTier`, `profile`, `modelGroup` and `effort` (`src/workflows/executors/agent-task.ts:25-50`). That is enough for **a reviewer on another model family**.

### 3.7 Sandbox and network
- Static compose workers are long-lived containers. They share the `swarm_shared` volume, sit on the default compose network and get `GITHUB_TOKEN` in their env (`docker-compose.example.yml:366-424`).
- Runtime pools (beta, off by default) start a container per task (`lifecycle: "per-task"`, `slotsPerRuntime: 1`) through Docker, E2B, boxd or k8s with `CapDrop: ["ALL"]` (`DOCS/guides/runtime-pools.mdx:6-62, 225-231`, `src/runtime-providers/docker.ts:283-307`).
- The network is any Docker network you pick (`DOCKER_NETWORK`).
- **No egress policy for agents.** The egress allow-list exists for scripts only (`SCRIPT_EGRESS_ALLOWLIST`, `DOCS/ui/configuration.mdx:346-350`).
- Pools need the Docker socket on the API (`DOCS/guides/runtime-pools.mdx:39-44`).

### 3.8 Gates, approvals, notifications
- The `human-in-the-loop` node waits durably, with approvers by user or role and a policy of any, all or a minimum count; optional timeout leads to reject (`src/workflows/executors/human-in-the-loop.ts:79-122`).
- Notifications go to Slack (buttons for simple cards) or email (`human-in-the-loop.ts:80-83`, `DOCS/playbooks/patterns/hitl-gates.mdx`).
- Telegram and Discord via Chat SDK for mentions, DMs and task results (`DOCS/integrations/chat-sdk.mdx:3-25`). Inline HITL buttons for Discord and Teams are an open issue (#3204).
- Pending requests with no explicit `expiresAt` are cancelled after `APPROVAL_REQUEST_AUTO_CANCELLATION_DAYS` (default 7; **0 turns it off**) (`src/be/approval-sweeps.ts:11-26`).
- The agent-side tool is `request-human-input`.

### 3.9 Logs, traces, cost views
- Session cost per task (`totalCostUsd`, `src/http/tasks.ts:193`), with harness-by-harness cost accounting (`DOCS/guides/cost-and-context-computation.mdx`).
- The usage, budgets and metrics pages.
- OTel traces and metrics, off until `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`DOCS/guides/observability-opentelemetry.mdx:9-67`).
- Tasks carry tags and a context key (`shared/<loop>/<issue>/`), so an item number can be propagated.

### 3.10 Deployment, API, CLI
- `docker-compose.example.yml` has 16 services: minio, minio-init, agent-fs, api, lead and 11 workers, plus caddy under the `tls` profile.
- A Helm chart lives in `charts/agent-swarm`.
- The **minimum for us** is api + lead + 1–3 coding workers (or one pool) + minio/agent-fs (if Comb or shared files are used) + the UI container. The 11 workers in the example cover 11 official templates, most of them non-coding: content writer, SEO, UX and others.
- REST API with OpenAPI (`openapi.json`), MCP server, CLI (`src/cli.tsx`), TypeScript SDK.

## 4. Mapping against our spec

Legend:
- **R**: ready.
- **C**: configurable without code.
- **X**: extension code on our side (a script, workflow JSON or extension bundle; no engine fork).
- **F**: needs a change in the engine code (where, size).
- **M**: missing, we build it.

### 4.1 Stages
| # | Stage | Mark | How |
|---|---|---|---|
| 1 | Intake: Triage sizes S/M/L and R0/R1/R2; Operator accepts | X | Webhook trigger on GitHub label or Jira assignee, an `agent-task` with an `outputSchema` (the Software Factory `classify` node already returns size: `DOCS/playbooks/software-factory.mdx` workflow 1), then `human-in-the-loop` |
| 2 | Spec: Interviewer writes criteria; Operator approves | X | `agent-task` + HITL; Interviewer business questions through `request-human-input` |
| 3 | Plan: Researcher for L, Planner, slice sub-issues with blocked-by; Operator approves | X | Agent nodes + HITL. Sub-issues and blocked-by links: the Planner creates them with `gh` / Jira REST; the tick reads them (the Linear tick already honours `blocks`, `PLAYBOOK.md` "Todo waits for blockers") |
| 4 | Implement: a fresh session per slice, parallel in separate sandboxes | C + X | Per-task pool (`lifecycle: per-task`, `slotsPerRuntime: 1`) gives a fresh container per slice; the frontier logic goes into our tick |
| 5 | CI outside, then a cross-family reviewer with a JSON verdict pass / fix / block | X | Our CI stays in GitHub Actions. Reviewer node with `profile` set to another family and an `outputSchema` enum pass, fix, block (the playbook uses approve or request_changes; change the enum) |
| 6 | Acceptance: Validator runs the app, records evidence | X | `worker-tester` template + video-review / PR evidence template (`DOCS/guides/video-review.mdx`, CHANGELOG 2.14.2 "before/after evidence on every PR") |
| 7 | Merge: rules file auto-merges R0, otherwise the Operator; merge queue | X + C | The `mergePolicy.autoMerge` record (classes, maxLines, riskyPaths, kill switch) is data only; the Linear tick arms GitHub auto-merge on an agent-approved head. Our tick evaluates our rules file; the GitHub merge queue does the landing |
| 8 | Deploy and watch: a Watcher per deploy rolls back | M | Nothing built in. A schedule or webhook-triggered agent-task on deploy events with read-only production access; rollback through our deploy tool |
| 9 | Learn: weekly Retro to work items | X | Weekly schedule + agent-task reading tasks, approvals and sessions through the API. **Turn off the seeded "dreaming" loop**, which edits agent profiles and skills by itself and contradicts "Retro never changes files itself" (`DOCS/guides/dreaming.mdx:51-53`) |

### 4.2 The four parts
| Part | Mark | Detail |
|---|---|---|
| O Orchestrator | X | The tick-script pattern (`linear-delivery-tick.ts`: pure `decide()` at :405-455, caps at :43-60, escalation at :668-680, a KV lock and per-issue records), ported to GitHub labels + Jira statuses. The DAG engine handles each gate's durable HITL wait and the structured outputs |
| S Sandbox | F + M | A per-task container is ready. Missing: default-deny egress, a push-only-to-one-branch proxy and no merge credential. Token minting needs a change (see 5.3) |
| D Decision requests | R + C | The approval-requests screen and cards, approvers, Slack or email notification. Phone push: Telegram via Chat SDK for messages; for approval pings, the Slack mobile app works now, or add ntfy as a `notify` node (X) |
| T Session traces | R + X | Cost, tokens and the transcript per task are ready; OTel export is configurable. The six weekly metrics and the item-number tags are ours (task tags or key) |

### 4.3 The 15 states
None of them is native. Engine task statuses are `draft … completed, failed, cancelled, superseded, skipped` (`src/types.ts:311-325`), and workflow runs have their own statuses. All 15 states become **X**: labels in GitHub and statuses in Jira, owned by our tick, exactly as the Linear tick owns 12 Linear states (`linear-delivery-tick.ts:21-34`). Per state:

| State | Mark | Engine piece used |
|---|---|---|
| Triaging, Specifying, Planning, Implementing, Verifying | X | agent-task dispatch keyed by item (`task_send key`), live-task guard |
| TriageReview, SpecReview, PlanReview, MergeReview, Blocked | X | HITL request + label; the cap-of-3 counter in the tick |
| Live, Done, RolledBack | M | No deploy or watch support |
| ForHuman, Cancelled | X | Label + close with a reason comment; `cancel-workflow-run` and `/api/tasks/{id}/cancel` stop the work |

### 4.4 Cross-cutting rules
| Rule | Mark | Evidence / fix |
|---|---|---|
| One shared limit of 3 fix rounds, then Blocked | X | The Linear tick has per-kind caps plus `total` in code (`linear-delivery-tick.ts:675-679`). Set one shared counter at 3. The Software Factory playbook's cap is in a prompt (`software-factory.mdx` workflow 2 counts PR comments), so don't use that one |
| Session time and cost limits count as a failed round | F (S–M) or X | No per-session cap in the engine: budgets are **daily** per agent, user or global and are only checked at claim (`src/be/budget-admission.ts:60-135`). Tick workaround: read `totalCostUsd` and age, cancel the task, count a round (the `isStuck` idle and age logic exists at `linear-delivery-tick.ts:458-463`). A cancel only lands at a poll, so cost can overshoot by one turn. A clean fix is a per-task `maxCostUsd` / `maxWallMs` in the runner (`src/commands/runner.ts`, 8,334 lines) |
| At most 3 items wait for the Operator | X | Counter in the tick before it dispatches a new item (the playbook's sweep already holds a WIP cap of 3, but in a prompt) |
| Global pause; cancel from any state | X + C | Pause: a KV flag read by the tick, plus a `pre.task.create` extension that blocks new tasks (`DOCS/guides/extensions.mdx:206`); stopgap: a global budget of 0 (not verified). Cancel: run and task cancel are ready (`DOCS/concepts/workflows.mdx:656-662`) |
| Code picks the next step from JSON, never prose | R | `outputSchema` validated on the agent-task; `property-match` / `code-match` route on fields (`src/workflows/json-schema-validator.ts`, `executors/property-match.ts`) |

## 5. Extension points and fork cost

### 5.1 Seams that work without a fork
1. **Workflow JSON** (DAG with cycles):
   - 15 executors (`DOCS/concepts/workflows.mdx:22-44`).
   - Loops are allowed, with a global `WORKFLOW_MAX_ITERATIONS` (100) and `WORKFLOW_MAX_STEPS_PER_RUN` (500) circuit breakers (`src/workflows/engine.ts:75-78, 551-606`, `src/workflows/limits.ts`). Note that the Software Factory page says "A DAG has no loops", which contradicts the engine docs.
   - Webhook triggers with HMAC and body filters, `foreach` fan-out with a concurrency cap, `sub-workflow`, retry and timeout per node, `onNodeFailure`.
2. **Scripts on schedules** (the tick):
   - Typed scripts with `ctx.api.<connection>.graphql` and the credential broker; KV state; `task_send` / `task_list` / `task_get`; `workflow_trigger` (`src/scripts-runtime/sdk-allowlist.ts:154-165`).
   - Limit: a scheduled script stops at 60 s, which is why the tick runs every 5 min and cuts itself off at 25 s.
3. **Durable script workflows** (`launch-script-run`): journaled steps, a 24 h wall limit, and `ctx.step.humanInTheLoop` is **stubbed in v1** (`src/script-workflows/limits.ts:2`, `workflow-ctx.ts:445-446`). They don't fit multi-day items.
4. **Extensions**: in-process TypeScript hooks, for example `pre.task.create` (modify or block), `post.task.*`, `post.vcs.event` and `post.task.budgetRefused` (`DOCS/guides/extensions.mdx:202-240`). They are trusted, unsandboxed code. By default the **lead agent can install and activate them** (`EXTENSION_ALLOW_LEAD_ACTIVATION=true`, `extensions.mdx:14-25`), which hands the lead code execution in the API process. Set it to false.
5. **MCP and REST**: the full API, MCP tools, user MCP servers.
6. **Templates and prompt templates**: an operator can override, for example, `system.agent.repository.merge_policy`.

**Can all our rules be added without a fork?** Orchestration rules: yes, as our own tick script plus gate workflows plus one extension. Security rules: not fully (see 5.3).

### 5.2 If we had to fork
- The modules we would touch are large and churn daily: `src/workflows/engine.ts` (1,575 lines), `resume.ts` (1,428), `src/commands/runner.ts` (8,334), `src/types.ts` (4,849), `src/github/app.ts`.
- Upstream sees hundreds of commits a month (October: 715), mostly agent-authored, and ships a release almost daily.
- A fork would drift within weeks. Do not fork. Keep engine changes small and send them upstream.

### 5.3 Security: what the agent can reach
- **The GitHub App token covers the whole installation.** `POST /app/installations/{id}/access_tokens` is sent with **no body**, so no `repositories` or `permissions` limit (`src/github/app.ts:236-246`). Any registered agent may mint one (`src/http/github-token.ts:57-85`). The App needs Contents RW + Pull requests RW (`DOCS/integrations/github.mdx:154`), which is enough to **merge**.
- **PAT fallback.** When minting fails, git and `gh` fall back to `GITHUB_TOKEN`, a PAT that sits in the worker env in compose (`github.mdx:161`, `docker-compose.example.yml:409`).
- **"Agents may merge" is a prompt line**, not a credential limit (`DOCS/guides/repo-merge-policy.mdx:41-46`).
- **Gates are editable by agents.** The dreaming doc notes that "any agent can edit a workflow" (`DOCS/guides/dreaming.mdx:53`), and the script SDK exposes `workflow_update` / `workflow_patchNode` (`sdk-allowlist.ts:158-160`). An agent could remove a HITL node. This needs an RBAC check, either in config or as a small patch.
- **Egress is open** for agents. Static workers share a volume.
- **New users are admin by default.**
- **Mitigations that exist:**
  - Secret scrubbing.
  - The credential broker for scripts.
  - `CapDrop ALL` in pool containers.
  - Install tokens never written to disk.
  - CI events suppressed by default to prevent auto-merge cascades (`github.mdx:103-111`).
  - GitHub branch protection as the second wall.

## 6. Where I disagree with the earlier report

| Earlier claim | My reading | Evidence |
|---|---|---|
| Score O2 S1 D2 T2 and "build our own" | O is closer to 2.5: a code-enforced tracker state machine with caps exists as a template; D is 2.5 with a full approval UI. The real weight is everything around O (UI, RBAC, SSO, 6 VCS/tracker integrations, about 15 harnesses, cost views, schedules, secrets), which we would otherwise build | `linear-delivery-tick.ts:21-60, 405-680`; `apps/ui/src/pages/*` |
| "fix caps live in prompts" | True for the Software Factory playbook, false for the Linear Delivery Loop, where caps sit in pure decision functions | `software-factory.mdx` workflow 2 vs `linear-delivery-tick.ts:675-679` |
| "unanswered approvals cancel the run after 7 days" | Only the default: `APPROVAL_REQUEST_AUTO_CANCELLATION_DAYS=0` turns it off, and an explicit `expiresAt` overrides it | `src/be/approval-sweeps.ts:11-26` |
| "budgets are daily, not per session" | Confirmed | `src/be/budget-admission.ts:60-135` |
| "write token for any registered repo" | Confirmed and slightly worse: the token is installation-wide and has a PAT fallback | `src/github/app.ts:236-246`, `github.mdx:161-163` |
| "agent egress open" | Confirmed; the allow-list is for scripts only | `DOCS/ui/configuration.mdx:346-350` |
| "telemetry on by default" | Confirmed, plus the feedback endpoint | `src/telemetry.ts:111-113`, `DOCS/ui/index.mdx:77-81` |
| "16 services" | That is the example with 11 template workers; our minimum is about 5–7 containers | `docker-compose.example.yml` |
| Not mentioned | The codebase is far larger than any other candidate (about 338k non-test lines in `src/`) and agent-written. That is fine to run and costly to fork | `wc` |

## 7. What we reuse unchanged
- API server, SQLite DB, scheduler, heartbeat, task routing, worker runner and harness adapters (Claude Code for 8 roles; Codex or OpenCode for the cross-family reviewer).
- The web dashboard: tasks, sessions, approval requests, workflows and runs, budgets, usage, repos, people, settings.
- The DAG workflow engine with `human-in-the-loop`, `outputSchema`, `property-match`, `foreach`, webhook triggers and cancel.
- Scripts, schedules, KV, script connections with the credential broker.
- GitHub App webhooks and handlers; the Jira OAuth and webhook lifecycle; the Chat SDK Telegram channel.
- Runtime pools with per-task Docker containers.
- Cost accounting and OTel export.
- RBAC, SSO through oauth2-proxy, encrypted secrets and scrubbing.

## 8. Ordered changes to make it fit

| # | Change | Where | Size |
|---|---|---|---|
| 1 | Hardening config: `ANONYMIZED_TELEMETRY=false`; `EXTENSION_ALLOW_LEAD_ACTIVATION=false`; `SEED_AUTOMATIONS_ENABLED=false` (no dreaming); `APPROVAL_REQUEST_AUTO_CANCELLATION_DAYS=0`; remove `GITHUB_TOKEN` from workers; pin `AGENT_SWARM_VERSION`; default role viewer; deploy the UI container behind oauth2-proxy | `.env`, compose | S |
| 2 | Slim compose: api, lead, UI, 1 static reviewer worker, a per-task coder pool, minio/agent-fs only if needed | our compose file | S |
| 3 | Scope the minted token: pass `repositories: [repo]` and `permissions: {contents: write, pull_requests: write, issues: write}` in the `access_tokens` body, cache per repo; a flag to forbid the PAT fallback. Upstream PR (they are already hardening credential scoping, issue #2209) | `src/github/app.ts:220-260`, `src/http/github-token.ts` | M |
| 4 | Our push proxy plus closed egress: pool containers on an `internal` Docker network, an egress proxy with an allow-list (model API, package mirrors), a git receive-pack proxy that only allows `refs/heads/<slice-branch>`; workers get no GitHub write token at all | outside the engine; `DOCKER_NETWORK` pool setting | L |
| 5 | Lock gates: an RBAC rule so that agents cannot update, patch or delete workflows that contain HITL nodes, or only an operator can. Try config first, else a small upstream patch | `src/rbac/permissions.ts`, workflow routes | S–M |
| 6 | Our Orchestrator tick: port `linear-delivery-tick.ts` to a tracker adapter (GitHub labels and sub-issues with blocked-by via GraphQL; Jira statuses and labels via REST), 15 states, one shared round counter of 3, the frontier scheduler, cap of 3 waiting items, pause flag, cancel, R0 rules-file check. Pure decision functions with tests | `templates/...` style script in our repo | L (2–3 weeks) |
| 7 | Gate workflows: one small workflow per gate (TriageReview, SpecReview, PlanReview, MergeReview, Blocked) with `human-in-the-loop` and options and evidence rendered from upstream output; the tick triggers them and reads the result | workflow JSON | M |
| 8 | Role workflows: Triage, Interviewer, Researcher, Planner, Implementer, Reviewer (verdict enum pass, fix, block on another model family), Validator, each with an `outputSchema` | workflow JSON + agent templates | M |
| 9 | Per-session limits: tick-side cancel on `totalCostUsd` or age counts as a failed round (S); upstream a per-task `maxCostUsd` / `maxWallMs` in the runner (M) | tick; `src/commands/runner.ts` | S + M |
| 10 | Pause extension: a `pre.task.create` hook that blocks while the KV pause flag is set | extension bundle | S |
| 11 | Phone push for decision requests: ntfy via a `notify` / script node, or Telegram | workflow node | S |
| 12 | Deploy + Watcher: a webhook from the deploy tool triggers a watcher agent-task with read-only production tools and a rollback action | workflow + our deploy hook | M–L |
| 13 | Retro + weekly six-metric summary: a weekly schedule that reads tasks, approvals, costs and labels through the API | workflow + script | M |
| 14 | Item-number tags in OTel and task tags; export to Langfuse if wanted | config + tick | S |

## 9. Fork or extend
**Extend.** All orchestration rules fit as our own scripts, workflows and one extension on top of a pinned release. Engine changes are limited to #3, #5 and #9b. Each is small and in line with the maintainers' own direction (credential scoping, RBAC hardening, budget work), so upstream would plausibly accept them. The sandbox walls (#4) live outside the engine anyway. A fork is not worth it: the codebase is huge, agent-written, released daily and full of forward-only migrations.

Main risks:
- Single human maintainer.
- Speed of breaking change.
- Our Orchestrator runs as a 5-minute tick rather than as an event-driven durable workflow: latency of minutes per transition, which is fine for our pace.
