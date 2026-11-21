# MAIster as a base for the agentic SDLC engine

Re-check date: 2026-11-21. Repository: https://github.com/maister-dev/maister, `master` at `cab3673` (2026-11-20). Code read statically from a shallow, sparse clone (`.ai-factory/qa/` logs and site images left out). Nothing was installed or run. Paths below are relative to the repository root unless they start with `atlas:` (our spec repo).

## Verdict up front

**Score: 6 / 10 as a base to extend.** Under the new weighting it is the strongest candidate I would build on. It already ships most of what we would otherwise write around an Orchestrator: a multi-project web control plane, accounts and roles, a runner catalog for Claude and Codex, a typed Flow graph with human gates and bounded rework, an inbox with web push, a PR/merge path, an evidence graph, token budgets and metrics. The gaps are real but narrow and mostly sit at seams:

1. agents run on the host as the service user;
2. no tracker state write-back and no Jira;
3. no deploy, watch or rollback;
4. a few of our cross-cutting rules (shared fix limit, cap of 3 waiting, global pause, limit hit counts as a round) are absent.

What keeps the score from 8 is ownership risk, not features:

- one author wrote 2,876 of 2,883 commits;
- about 530k non-blank lines of production TypeScript in `web/` alone;
- 356 migrations in five months, and very high churn in the modules we would touch;
- no tagged release yet.

**Recommendation: extend, don't fork.** Put our pipeline in our own Flow package and platform agents, add one sidecar service of our own (tracker sync, deploy watcher, sandbox launcher), and send the few engine changes upstream as small PRs. Upstream has merged 10 of 14 outside PRs, so this is realistic. A long-lived fork of this codebase is not realistic for one person.

## 1. Activity and maturity (gh api, 2026-11-21)

| Metric | Value |
|---|---|
| Stars / forks | 10 / 3 |
| Created on GitHub | 2026-09-05 (history before that was imported; CHANGELOG.md says "Git history prepared for publication: private identifiers removed") |
| Commits per month | Jun 791, Jul 398, Aug 32, Sep 733, Oct 175, Nov (to 21st) 664 |
| Contributors | kanischev 2,876, claude 5, Staruy 2 (99.8% one person) |
| Issues | 16 open, 2 closed; nearly all filed by one outside user (Casepl) |
| PRs | about 32 in the last 100: kanischev 18; Casepl 14, of which 10 merged and 4 open |
| Releases / tags | 0 / 0. `package.json` version `0.0.0`, README "beta until v1.0", RELEASING.md plans `-beta.N` tags |
| License | MIT (LICENSE); plugins repo maister-plugins is MIT too |
| Maintainer responses | Issues get only automated "MAIster intake" comments posted by the author's own instance (for example #22, #2). Outside PRs get merged within a day (#11–#27 on 2026-10-17/18). |

Size (non-blank lines, counted with `grep -cv '^\s*$'`; cloc was not available):

| Package | Production | Tests | Test files |
|---|---|---|---|
| `web/` (Next.js 16, React 19, HeroUI, Drizzle) | ~527k | ~594k | 1,714 |
| `supervisor/` (Fastify ACP daemon) | ~26k | ~28k | 93 |
| `mcp/` (MCP facade) | ~3.7k | ~4.1k | 7 |
| `stand-connector/` | ~2k | ~0.9k | 6 |

Largest single files: `web/lib/db/schema.ts` 13,274 lines, `web/lib/services/hitl.ts` 7,296, `web/lib/agents/launch.ts` 6,577, `web/lib/flows/graph/runner-graph.ts` 6,135, `web/lib/worktree.ts` 4,463. `web/lib/db/migrations/` holds 356 SQL migrations. The size, speed and doc density (215 ADRs in `docs/decisions/`, 106 files in `docs/system-analytics/`) show a codebase written mostly by agents under a strict spec process (`.ai-factory/`). Tests and docs are unusually thorough. Hand-review of a module is expensive.

Churn since 2026-09-01 (gh api commits per path): `web/lib/flows` 232 commits, `web/lib/db/schema.ts` 184, `web/lib/scheduler` 57, `web/lib/services/hitl.ts` 49, `supervisor/src/spawn.ts` 23, `web/lib/runs/promote.ts` 17. The engine contract moved from 1.6.0 to 3.13.0 in about five months, and 3.0.0 dropped `steps[]` manifests (docs/flow-dsl.md:91–100).

## 2. What is ready for the owner

### Web UI (routes in `web/app/(app)/`, screen docs in `docs/screens/`)

| Screen | Route | What the Operator does |
|---|---|---|
| Portfolio / Desk | `/` | Project cards, live and blocked counts, cross-project HITL block, the "Now" tiles and digest (ADR-169/172, `web/lib/queries/portfolio.ts`) |
| Work table | `/work` | Every task across projects with a derived stage (Triage, Held, Ready, Queued, Executing, WaitingOnHuman, Review, Crashed, Promoted, Abandoned) and `blocked` (docs/system-analytics/work-stages.md) |
| Project board | `/projects/[slug]` | 7 columns: Backlog, Prepare, InProduction, OnReview, InDelivery, Crashed, Done (`web/lib/board.ts:36-53`). Create and edit tasks, relations (blocks, depends_on, requires, parent_of, duplicate_of), launch with Flow and runner choice, automations tab, packages tab, Git settings (docs/screens/projects/project-board.md) |
| Task detail | `/projects/[slug]/tasks/[number]` | Statement, comments, relations, clarifications, external source link, run history |
| Run detail | `/runs/[runId]` | Flow node spine, transcript, Files / Diff / Evidence / Timeline workbench, run inspector, Git panel (commit, publish branch, PR, reattach), HITL answer, recover, rework, promote (docs/screens/runs/flow-run.md, workbench.md, git-panel.md) |
| Runs ledger | `/runs` | All runs with status, duration and execution time (ADR-208) |
| Scratch run | `/scratch-runs/new`, `/scratch-runs/[runId]` | Chat-style coding session in a worktree outside the board |
| Inbox | `/inbox` | All pending human decisions: permissions, forms, plan review, budget breach, knowledge reviews (ADR-212) |
| Activity | `/activity` | Event feed |
| Observatory | `/observatory`, `/projects/[slug]/observatory` | Correction pressure, autonomy, gate firing rates, per-flow coverage (docs/system-analytics/observatory.md) |
| Evaluations / experiments | `/projects/[slug]/evaluations` | Run one task several ways and judge side by side |
| Flow Studio | `/studio/*` | Visual editor for packages, flows, agents, skills; package sources |
| Agents | `/agents`, `/projects/[slug]/agents/[agentId]` | Platform agents with manual, cron, event, webhook and mention triggers |
| Knowledge | `/knowledge/*` | Company and project knowledge records with proposals and review |
| MCPs | `/mcps` | MCP server registry (admin) |
| Settings | `/settings/*` | ACP runners, package sources, evaluations, specialists, company grants |
| Admin | `/admin/users`, `/admin/scheduler`, `/admin/execution-host` | Users, scheduler jobs (with the dispatcher kill switch), execution-host health |
| Account | `/account`, `/account/password` | Profile, password, personal API tokens |
| Librarian panel | right-side panel | Personal assistant conversation that prepares and follows work under confirmation cards |

UI is in English and Russian (`web/messages/en.json`, STG-10 rule). Open UX issues from the outside tester are worth noting: board controls not persistent (#22), task ordering (#19), dense working-copy actions (#23).

### Projects and repositories
- Register a project from a URL clone or a local path, with `maister.yaml` v2 (`web/app/api/projects/route.ts`, docs/system-analytics/projects.md).
- One git worktree per run under `MAISTER_WORKTREES_ROOT` (`web/lib/worktree.ts`).
- Base branch, run branch and target branch are chosen per launch.
- Multi-repo: cross-project task relations and read-only sibling-repo context mounts (M49, PRODUCT_VIEW.md "Multi-repo enablement").

### Git providers

| Provider | Depth |
|---|---|
| GitHub | Clone and push with host credentials. PRs through the `gh` CLI (`GhCliAdapter`, `web/lib/runs/pr-adapter.ts:172`). PR state scan reads state, mergedAt, mergeable, mergeStateStatus (pr-adapter.ts:861-931), which drives `run.pr_merged` / `pr_closed` / `pr_conflicts`. A task completes on confirmed merge (ADR-207). Issue intake comes from a platform agent in maister-plugins (`packages/core/maister-agents/github-intake-gh.md`, `github-intake-mcp.md`) that imports issues, dedups by `task_external_sources` (ADR-206) and posts receipt comments. **No labels, no sub-issues, no blocked-by sync, no check-run reading, no merge call, no merge queue.** |
| GitLab | MR creation through `glab` (`GlabCliAdapter`, pr-adapter.ts:290); nothing else |
| Gitea / GitVerse | PR through REST with `GITEA_TOKEN`/`GITVERSE_TOKEN` (pr-adapter.ts:415) |
| Jira | **None.** `jira` is only an allowed `source_kind` slug in the binding table (docs/system-analytics/tasks.md:420); no adapter and no intake agent |
| CI | Generic `external_check` gates: CI reports a result through a project API token (`gate_report` MCP tool, `POST /api/v1/ext`), see docs/flow-dsl.md:1356 |

### Accounts, auth and multi-user
- Auth.js credentials login with admin-approved activation, forced password change and admin reset (docs/system-analytics/identity-access.md).
- Global roles viewer < member < admin; per-project membership roles; action-level checks (`web/lib/authz.ts`, `requireProjectAction`).
- Project-scoped API tokens stored hashed (PRODUCT_VIEW.md "API token").
- No OIDC, SSO or MFA; "effectively single-operator" (docs/architecture.md:253-256). That is fine for us.

### Settings, policies, secrets
- Runner config holds secrets by `env:NAME` reference only; the supervisor resolves them (docs/architecture.md:419).
- Execution policy has 10 axes, including `budget` and rework exhaustion (ADR-095/101).
- Auto-promotion lanes `docs|tests|deps|config` come with a non-configurable hard deny-list (`.github/workflows/**`, `.env*`, `CLAUDE.md`, `AGENTS.md`, `.claude/**` …), a delay, an optional required external check, and an env plus per-project kill switch (docs/decisions/adr-126.md).
- Per-node capability profiles: allowed MCPs, skills, tools, restrictions, path guard, enforcement strict/instruct (docs/flow-dsl.md:118-145, docs/system-analytics/capabilities.md).
- Git credentials follow "model B": MAIster stores no provider secrets and uses the host's SSH key, credential helper and `gh` login (docs/system-analytics/git-integration.md:11-17).

### Agent runners and models
- ACP adapters (`supervisor/src/adapter-registry.ts:50-110`). Claude (`claude-agent-acp`) and Codex (`codex-acp`) are ready. Gemini, OpenCode and MiMo are gated by smoke tests.
- Per node: `settings.runner`, model and thinking effort. So a Claude implementer with a Codex reviewer is plain config.
- Subscription logins on the host work; so do Anthropic-compatible gateways.
- Model catalog discovery: `supervisor/src/model-catalog/`.

### Sandbox and network isolation
**None today.**
- The supervisor spawns the adapter with `cwd = worktree` and `env = {...process.env, ...executor.env, ...}` (`supervisor/src/spawn.ts:122-147`, `:300-310`). That means the same OS user, the same HOME and open network.
- `cli`/`check` nodes and `command_check` gates (the project's own tests) run through `bash -c` in the **web** process (`web/lib/flows/runner-cli.ts:81`, `requirements-check.ts:53`). Only their env is allow-listed (ADR-153).
- The README lists "stronger process/container isolation" as a gap. PRODUCT_VIEW.md defers "container sandboxing".
- Path guard and tool restrictions act at the ACP boundary (docs/system-analytics/guardrail-hooks.md). They are policy, not isolation (guardrail-hooks.md:640 calls OS sandboxing "Phase 2").

### Gates, approvals, notifications
- `human` nodes with declared decisions (for example approve/rework/takeover), each mapped to a transition.
- `form` nodes with a JSON form schema.
- Permission requests from the agent are parked in the supervisor and answered in the UI (`supervisor/src/pending-permissions.ts`).
- Typed plan review shows immutable plan evidence and refuses approval while a declared blocker is open (ADR-137).
- `budget_breach` HITL.
- Manual takeover: claim the branch, edit locally, return (ADR-030).
- Inbox, the attention SSE stream and **web push via VAPID** (ADR-173, docs/system-analytics/notifications.md).
- Generic HMAC outbound webhooks (ADR-077; event list in `web/lib/webhooks/taxonomy.ts`) can feed ntfy or Telegram.

### Logs, traces, cost
- Canonical `execution_events` in Postgres, with durable SSE replay per run (docs/architecture.md:280-290).
- Full transcript, timeline, artifacts and evidence graph.
- Token rollups per run, node and runner (`run_cost_rollups`).
- Observatory metrics.
- **No OpenTelemetry export. Cost is in tokens only.** USD is deliberately not computed (ADR-101), and `limits.maxCostUsd` is record-only.

### Deployment and API
- One Linux host with systemd units for web and supervisor, nginx with TLS, and Postgres (pgvector/pg16) in Docker Compose (docs/deployment.md, `deploy/*.service`, `compose.production.yml`).
- A Dockerfile exists. The supported layout runs web and supervisor as host processes because they spawn agent CLIs on local repos.
- Web↔supervisor contract: `docs/api/supervisor.openapi.yaml`. External REST is under `/api/v1/ext` (docs/api/external/operations.openapi.yaml).
- MCP facade with about 50 tools: task_*, run_*, readiness_get, gate_report, knowledge_*, run_plan/run_delegate (`mcp/src/tools.ts`, `task-launch-tools.ts`).

## 3. Map against our spec

Legend: **R** ready · **C** configurable without code (Flow package, agent, settings) · **X** needs a code change (where, size) · **M** missing (new component).

### The 9 stages as one Flow

Our pipeline fits naturally as one Flow graph in our own package: node ids = our agent states, `human` nodes = our *Review states.

| # | Stage | Fit | How |
|---|---|---|---|
| 1 | Intake | **C + X** | GitHub: the intake agent (maister-plugins core) plus the built-in triager (docs/system-analytics/triage.md). Our Triage = an `ai_coding` node, read-only, with `output.result` schema {size, risk, outcome} and `decide` on it (docs/flow-dsl.md:941). TriageReview = a `human` node with decisions accept/for_human/cancel. **Jira intake: M**, an intake agent with mcp-atlassian is enough (S–M) |
| 2 | Spec | **C** | Interviewer node; business questions as `form` HITL or `task_clarifications` (ADR-189). SpecReview = `human` node approve/clarify, with `clarify` routed back by `rework` |
| 3 | Plan | **C / X** | Researcher node only for L via `decide` on size. Planner = an `orchestrator` node that calls `run_plan` to create child tasks with `requires` relations, released only when the blocker is Done (docs/system-analytics/orchestrator.md:60-66). Typed plan review fits PlanReview (ADR-137). **Sub-issues in GitHub: X**, our sync service mirrors child tasks to sub-issues and blocked-by (M) |
| 4 | Implement | **C / X** | One fresh `ai_coding` session per child run, in its own worktree. Parallel children under `MAISTER_MAX_CONCURRENT_AGENTS`. Tests-first is a prompt and skill matter. Merging slice branches into the item branch: shared-worktree tree promotion (ADR-102) or `run_promote` of a child into the parent. Workable, but the coordinator is an LLM agent that "declares the goal met" (orchestrator.md:7-9), and we want code to decide. A node `decide` on the orchestrator's typed output keeps code in charge. **Sandbox: X** (see part S) |
| 5 | Checks and review | **C / X** | CI outside: an `external_check` gate that GitHub Actions reports through `gate_report`. Reviewer = `judge` node with `settings.runner: codex`, `output.result` schema {verdict: pass/fix/block}, `decide: from output.verdict`, `on_mismatch: retry` for malformed JSON (docs/flow-dsl.md:1019). **Shared limit of 3: X** (see cross-cutting) |
| 6 | Acceptance | **C** | Validator = `ai_coding` node with Playwright MCP, typed evidence artifacts, its own `decide`. "Validator does not see the reviewer's verdict" is a matter of `input.requires` |
| 7 | Merge | **C / X** | R0: auto-promotion lanes are close to our rules file but fixed to 4 path classes. Our extra facts (size limit, no new deps, working hours, revert-rate kill switch) need **X**, an extended lane predicate (M). R1/R2: run status `Review` → Operator clicks Promote; `pull_request` mode opens the PR. **Merge queue: X**, the PR adapter must call `gh pr merge --auto` / enqueue (S); MAIster today only observes the merge (ADR-207) |
| 8 | Deploy and watch | **C + M** | MAIster has no deploy concept by design (PRODUCT_VIEW.md "Deferred": "Deploy management … rollback automation"). The Watcher can be a platform agent with an event trigger on `run.pr_merged` (docs/system-analytics/agents.md:144-160, taxonomy.ts:25), but the deploy itself, the watch window and the rollback tool are ours (M) |
| 9 | Learn | **C** | Weekly cron platform agent; Observatory supplies correction-pressure data; it creates tasks through `task_create` that land in triage |

### The 4 parts

| Part | Fit | Notes |
|---|---|---|
| **O** Orchestrator | **R / C** for runs and gates, **X** for our item-level rules | Durable graph runner, append-only `node_attempts` ledger, bounded rework with `onExhaustion` to a human (docs/flow-dsl.md:1058), resume from checkpoints, crash recovery, scheduler with a cap. The run (not a tracker item) is the unit, but one Flow run per item covers it |
| **S** Sandbox | **X (M–L)** | Detailed below |
| **D** Decision requests | **R** | Web UI inbox + human/form nodes + typed plan review + web push. Server-owned options with an allow-list (docs/system-analytics/hitl.md:237-249). Matches our "web UI plus a phone push" |
| **T** Session traces | **R / X** | Rich in-app traces keyed by run and task, Observatory metrics. No OTel, cost in tokens. Our six weekly metrics: a SQL job over Postgres, or an export (S–M) |

### The 15 states

MAIster has no item state machine of ours. It has task status (Backlog/InFlight/Done/Abandoned), triage_status, run status (Pending, Running, NeedsInput, NeedsInputIdle, HumanWorking, WaitingOnChildren, Review, Done, Failed, Crashed, Abandoned) and two derived vocabularies (`web/lib/board.ts`, work-stages.md). In our Flow, the **current node id is our state**:

| Our state | MAIster equivalent | Fit |
|---|---|---|
| Triaging, Specifying, Planning, Implementing, Verifying | run Running on node `triage`/`spec`/`plan`/`implement`/`verify` | **C** |
| TriageReview, SpecReview, PlanReview | run NeedsInput on a `human` node | **C** |
| MergeReview | run status Review (promotion gate) | **R** |
| Live | none: after PR merge the task is Done | **M**, the watcher sidecar holds Live |
| Done | task Done after confirmed merge (ADR-207) | **R** (but it fires at merge, not after the watch window) |
| Blocked | `onExhaustion` → `human` node; or a `block` verdict routed to a `human` node | **C** |
| RolledBack | none | **M** |
| ForHuman | manual takeover (HumanWorking) or close task | **C** (approximate) |
| Cancelled | run_cancel / abandon task | **R** |

Mirroring to tracker labels / Jira transitions: **X + M**. The webhook taxonomy has run-level and `hitl.requested` events but no "node entered" event (`web/lib/webhooks/taxonomy.ts:10-28`). Add `node.started`/`node.finished` events (S, upstreamable), plus our sync service: labels, sub-issues, Jira transitions (M).

### Cross-cutting rules

| Rule | Fit | Where |
|---|---|---|
| One shared limit of 3 fix rounds | **X (M)** | `rework.maxLoops` is counted per loop-owning node (docs/flow-dsl.md:1121-1126). Reviewer and Validator routing back to `implement` each have their own budget. Needs a Flow-level shared rework budget in `web/lib/flows/graph/runner-graph.ts` / `ledger.ts`. Workaround without code: one `verify` loop node owns the rework and the Validator routes through it |
| Time and cost limits per session; a hit counts as a failed round | **X (M)** | `limits.maxDurationMinutes` is enforced per node, but it **terminates the run** (`web/lib/runs/keepalive-sweeper.ts:638-935`). The token budget ladder is per run/task/tree and goes warn → escalate (HITL) → terminate (ADR-101). Change: on a node limit hit, route to the rework transition and charge one round |
| At most 3 items waiting for the Operator | **X (S–M)** | The attention "decisions" counter exists (ADR-169). Missing: an admission check in launch (`web/lib/tasks/launch-*.ts`) that holds new launches while it is ≥ 3 |
| Pause the whole pipeline | **X (S)** | Today there are pieces: the dispatcher kill switch on `/admin/scheduler` (docs/system-analytics/scheduler.md:105), `MAISTER_AUTO_PROMOTION`, the concurrency cap env. Missing: one flag checked at session admission that lets running sessions finish |
| Cancel from any state | **R** | run_cancel / run_stop, task abandon |
| Code picks the next step from JSON | **R** | `decide` on validated `output.result` with an allow-list guard; `on_mismatch` repair (docs/flow-dsl.md:941-1056). Watch out: the orchestrator node and the triager are LLM-led by design |

## 4. Extension points

- **Flow packages** (git-tag pinned, installed from Settings → Package sources; docs/flow-installer.md, docs/system-analytics/flow-packages.md): our 9 stages, schemas, prompts, skills. **No fork needed.**
- **Platform agents** with manual, cron, event, webhook and mention triggers (docs/system-analytics/agents.md): Jira intake, Watcher, Retro.
- **External REST + MCP facade** with project tokens (`mcp/src/`, `/api/v1/ext`): our sidecar creates tasks, binds sources, reports gates, reads readiness.
- **Outbound HMAC webhooks** (ADR-077): our sidecar hears run, hitl, gate and PR events.
- **Adapter binary override** `MAISTER_ADAPTER_BINARY_<AGENT>` (`supervisor/src/adapter-registry.ts:54,144-151`): the sandbox seam for agent sessions without a code change.
- **Guardrail hooks and capability profiles** per node.

What still needs engine code (all small, isolated and upstream-friendly): node lifecycle webhook events, shared rework budget, limit-hit-as-round, waiting cap, global pause, merge enqueue in the PR adapter, sandboxed `runCliStep`, and the lane predicate. None of these needs a fork.

**If we did fork**, we would touch `web/lib/flows/graph/runner-graph.ts` (6,135 lines; `web/lib/flows` had 232 commits since September), `web/lib/db/schema.ts` (13,274 lines, 184 commits) and migrations (356, one linear lineage). Rebasing on that weekly by one person is not sustainable. Every migration we add would collide on numbering with upstream. Test coverage is excellent, which helps prove a rebase, but the suite itself is ~600k lines.

## 5. Can agents run in sandboxes?

**Yes for agent sessions, without changing MAIster code; partly for check commands, with a small change.**

1. **Agent sessions.**
   - Set `MAISTER_ADAPTER_BINARY_CLAUDE` / `_CODEX` to a wrapper script. The script runs `docker run -i --rm --init` (or an OpenSandbox / gVisor runtime) with the ACP adapter inside, so stdio JSONL passes through.
   - MAIster sets ACP client capabilities `fs.readTextFile/writeTextFile = false` and no terminal (`adapter-registry.ts:157-170`). The agent therefore does all file and shell work itself, inside the box.
   - What the wrapper must handle:
     - bind-mount the worktree **and** the parent repo's `.git` at identical paths (worktree `.git` files point back to it);
     - mount the capability-profile and output paths MAIster passes in env (`MAISTER_CAPABILITY_PROFILE_PATH`, output paths, `MAISTER_CONTEXT_REPOS`; spawn.ts:125-143) at identical paths;
     - give each run a persistent volume for the adapter's session store, so ACP `session/resume` and keep-alive checkpoints work;
     - forward only an allow-list of env, because the full `process.env` arrives (spawn.ts:123);
     - allow egress only to the LLM API and MAIster's MCP endpoint;
     - forward SIGTERM so supervisor timeouts and orphan detection (`heartbeat.ts`) stay correct.
   - Size **M** (a wrapper plus an image per adapter, plus qualification of resume and checkpoint inside the box).
   - Push: agents never need to push. MAIster's web tier pushes the run branch on promotion with host credentials (`pushBranch`, git-integration.md). So "no push or merge credentials in the sandbox" is achievable as long as the host's `~/.ssh`, `~/.config/gh` and env files are not mounted.
2. **`cli`/`check` nodes and `command_check` gates** run the repo's tests via `bash -c` in the web process (`web/lib/flows/runner-cli.ts:81`). That is agent-written code executing on the host. Wrapping that one spawn site in a sandbox exec is **S–M** and a clean upstream PR. Our spec says CI runs outside the sandbox, so we can also avoid `command_check` gates entirely and use `external_check` reported by real CI. Then this seam matters less.
3. **Intake agents** that use the host `gh` login (`github-intake-gh.md`: "Use only `gh`") get the host's full GitHub token; the "forbidden" `gh auth token` is a prompt rule only. Use the MCP variant (`github-intake-mcp.md`) with a fine-grained token instead.

## 6. Quality and risks

- **Security as shipped (most important).**
  - Both systemd units run as user `maister` (`deploy/maister-supervisor.service:11-12`). The web env file `/etc/maister/maister.env` is `maister:maister 0600` (docs/deployment.md:88-92) and holds `AUTH_SECRET` and `DB_URL`.
  - An unsandboxed agent runs as that same user and can read that file. It can then forge a session or write Postgres directly, which bypasses every gate. It can also read the host `gh` login and SSH keys and push or merge anywhere they allow.
  - The unit has `NoNewPrivileges=true` and no other hardening.
  - docs/deployment.md:126-133 admits that the separate-user layout is not qualified on Linux.
  - **Do not run it on employer repos until the sandbox wrapper is in place.**
- **Bus factor 1**, with very fast agent-driven development. If the author stops, we hold half a million lines we did not write. Mitigation: keep our own logic outside the engine (package + sidecar) so a freeze-and-pin stays possible.
- **Breaking changes.**
  - Engine versions jumped 1.6 → 3.13 in about five months.
  - The 3.0 cut dropped `steps[]`.
  - Stage B data cut-over needs a manual multi-phase runbook (docs/deployment.md §14).
  - No tagged release exists yet.
  - Pin a commit, and upgrade deliberately with a DB backup.
- **Telemetry.** I found no analytics or phone-home dependency in `web/`, `supervisor/` or `mcp/` package manifests, and no third-party endpoints beyond provider presets and test fixtures in `web/lib` and `supervisor/src`. PRODUCT_VIEW.md mentions "pilot telemetry" that must not retain source. **Not verified at runtime.**
- **License.** MIT throughout, plugins included. Fine for employer repos.
- **Stability signal.** An outside tester filed UX and correctness bugs in October (#17 non-idempotent comments, #22 board controls, #29 package detach); 16 of 18 issues are still open.

## 7. Verdict

**Score 6/10.** Strongest base for the owner's new weighting. Not turnkey.

**Reuse unchanged:** the web UI (portfolio, board, work table, run view, inbox, observatory, studio, settings, admin), accounts and RBAC, projects and worktrees, the ACP runner catalog (Claude, Codex), the Flow graph engine (human/form nodes, `decide`, `on_mismatch`, rework with `onExhaustion`, typed artifacts, gates, `external_check`), HITL with web push, the PR path for GitHub/GitLab/Gitea, PR-merge observation and task completion, the token budget ladder, the per-node time watchdog, outbound webhooks, the MCP facade and REST API, Postgres event history, and the systemd deployment.

**Changes, in order:**

1. **Sandbox wrapper for ACP sessions** via `MAISTER_ADAPTER_BINARY_*`: Docker/gVisor image per adapter, identical-path mounts, env allow-list, egress allow-list, per-run session volume. Then split the web and supervisor Unix users. **M**
2. **Our pipeline as a Flow package**: 9 stages as nodes, verdict schemas, `decide` routing, human nodes for the 4 reviews, Codex reviewer, Validator with Playwright MCP. **M**
3. **Node lifecycle webhook events** (`node.started` / `node.finished` with node id) in `web/lib/webhooks/taxonomy.ts` and their producer. **S**, upstreamable
4. **Tracker sync sidecar** (ours): GitHub `state:*` labels, sub-issues, blocked-by; Jira transitions and labels; Jira intake agent; slice child tasks ↔ sub-issues. **M–L**
5. **Shared fix-round budget per run**, with a node-limit hit counting as a round instead of terminating (`runner-graph.ts`, `ledger.ts`, `keepalive-sweeper.ts`). **M**, upstreamable as an opt-in Flow field
6. **Cap of N waiting items and a global pause flag** checked at launch and session admission. **S–M**, upstreamable
7. **Merge queue enqueue** in `GhCliAdapter` (`gh pr merge --auto`/merge queue) on Promote, plus R0 lane predicate extensions (size, new dependencies, working hours, revert-rate kill switch) in the auto-promotion lane code. **M**
8. **Sandboxed `runCliStep`**, or a policy of `external_check` only for tests. **S–M**
9. **Deploy, watch and rollback** (ours): the Watcher platform agent on `run.pr_merged`, plus a deploy/rollback tool and the Live / RolledBack states in the sidecar. **M–L**
10. **Weekly metrics and the Retro agent** (cron agent plus SQL over Postgres; optional OTel/USD export). **S–M**

**Fork or extend: extend.** Run upstream pinned to a commit, keep our logic in a package plus a sidecar, and upstream items 3, 5, 6, 7 (merge enqueue) and 8. They fit the project's own roadmap: PRODUCT_VIEW.md lists strong isolation, attention routing and notification channels as open gaps, and upstream merged 10 of 14 outside PRs. Expect a cold reception for Jira, deploy and rollback: the author explicitly defers external board sync and deploy management ("Deferred For Now"). Keep those in our sidecar.

## 8. Where I disagree with the earlier report (research/atlas/research/2026-11-engine-choice.md, MAIster row)

| Earlier claim / score | My read | Evidence |
|---|---|---|
| O = 2 | Agree for item rules; for runs, gates and routing it is closer to 3. The earlier "Bending … means forking" is wrong: `decide`, `onExhaustion`, typed schemas and human nodes let our 9 stages live in a package. Only 4–5 small engine changes are needed | docs/flow-dsl.md:941-1134 |
| S = 1 | Agree as shipped, and it is worse than "spawn on host": a same-user agent can read the web's `AUTH_SECRET`/`DB_URL`. But a no-code seam exists (adapter binary override, no ACP fs/terminal delegation), so the cost to reach 2 is M, not a rewrite | spawn.ts:123; adapter-registry.ts:144-170; deployment.md:88-92 |
| D = 2, "MCP facade aimed at Claude Desktop" | Under the new criteria (web UI + phone push) D is ~3: inbox, typed plan review, forms, server-owned options, web push are all implemented. The MCP facade is a side door, not the channel | ADR-137, ADR-173, hitl.md |
| T = 2 | Agree. Strong in-app traces and metrics, but no OTel and no USD | ADR-101; observatory.md |
| "a Backlog \| In Flight board" | Outdated. The board has 7 columns and `/work` adds a 10-stage derived view; neither is our 15 states | web/lib/board.ts:36-53; work-stages.md |
| "no tracker write-back" | Mostly right: GitHub issue intake with dedup and receipt comments exists (plugin agent + ADR-206), but no labels, sub-issues or Jira | github-intake-gh.md; tasks.md:408-445 |
| "single host only" | Right, and it fits the new constraint (one Linux server) | architecture.md:274-290 |
| Weighting overall | The earlier report scored only the O/S/D/T gaps. Counted against the cost of building UI, auth, projects, worktrees, runner catalog, run views, inbox, push and promotion ourselves, MAIster saves months. The real risk the earlier row understates is not features but size and ownership: ~530k lines from one author with no release | §1 |
