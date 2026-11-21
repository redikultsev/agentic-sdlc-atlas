# cezar as the base engine: re-evaluation

Repo: https://github.com/open-mercato/cezar, read at commit `c043cff` (2026-11-21). Shallow clone in
`src/cezar` (depth 200, which reaches back only to 2026-11-16, so churn figures come from `gh api`).
Read statically only. Nothing was installed, built or run.

Paths below are relative to the repo root. `P/` means `packages/cezar/src/`.

## Verdict up front

**Score: 6/10 as a base to extend.** cezar already does most of what the earlier report left out
of its weighting: a polished, phone-ready web cockpit, projects, worktrees, GitHub and Jira and Linear
reading, secrets, accounts for 11 agent CLIs, per-step cost, live traces, scheduled and
event-triggered automations, a node-graph workflow editor, and a VPS installer. Its graph language
expresses about 80% of our per-stage flow without code. The gaps are real but have clear seams:

- no sandbox, and the agent can reach the host `gh` login;
- no work-item state machine across stages;
- no slice frontier;
- no cap on items waiting for the Operator;
- no global pause;
- verdicts are a text token, not JSON.

Our recommendation is to **extend, not fork**. Most rules fit as workflow YAML plus check-node
scripts plus a wrapper binary. The few code changes are small, generic, and match upstream's style,
so it would probably accept them. Keep a fork only as a short-lived patch branch. `P/workflows/run.ts`
is an 11,098-line file that took 113 commits in 3 months, so a long-lived fork that touches it would
be painful to keep in sync.

## 1. Activity and health (gh api, 2026-11-21)

| Metric | Value |
|---|---|
| Stars / forks | 1,118 / 190 |
| Created | 2026-05-19 |
| Commits per month (Jun→Nov 2026) | 166, 933, 62, 111, 353, 206 (Nov is partial) |
| Contributors (commits) | pkarw 834, pat-lewczuk 691, patzick 235, then a tail of ~12 people with 6–26 each plus bots |
| Issues | 174 open / 575 closed |
| PRs | 203 open / 1,255 merged / 178 closed unmerged |
| Releases | minor every 1–2 weeks: v0.16.0 (10-20) → v0.20.0 (11-15), plus desktop-v0.1.x, nightly channel |
| License | MIT (LICENSE, every `packages/*/package.json`) |

**Bus factor:** 2–3. Two people wrote about 80% of the commits, and a third wrote about 10%. That is
better than every engine in the earlier report: Kraft, Fabro and MAIster each have one author. The
code is pre-1.0 but runs under an explicit compatibility contract (`BACKWARD_COMPATIBILITY.md`, 905
lines). Breaking changes need a deprecation note and a minor version bump. `SECURITY.md` promises an
acknowledgement within 3 business days. I did not measure issue response time: the `gh` search API
hit a secondary rate limit.

## 2. Size and tests

There is no `cloc` on the host. These counts use `wc -l` over `*.ts`/`*.tsx`/`*.mts`, without
node_modules:

| Package | Source lines | Test lines | Test files |
|---|---|---|---|
| packages/cezar (server, CLI, runners) | 122,898 | 140,397 | 642 |
| packages/web (React cockpit) | 141,853 | 114,758 | 459 |
| packages/contract (zod API schemas) | 10,111 | 0 | 0 |
| packages/api-client | 860 | 409 | 6 |

There are also 14 Playwright e2e specs in `tests/`. Tests outweigh source, which is unusually strong
coverage. The largest server modules are `P/server` (26k lines), `P/core` (26k: agent runners) and
`P/workflows` (13.6k, almost all of it `run.ts`). Hot files: `P/workflows/run.ts` (11,098 lines,
113 commits since 2026-08-21) and `P/server/server.ts` (9,953 lines, 155 commits). These are the
two files a fork would most likely touch, and they are the worst ones to fork. `P/workflows/graph.ts`
(762 lines, 3 commits) is stable.

## 3. What is READY

### 3.1 Web UI: screens and what the Operator can do there

Route modules live in `packages/web/src/routes/`. The overview is in docs/reference.md, "Cockpit tour".

| Screen | Path | What the Operator does |
|---|---|---|
| Dashboard: Overview | `routes/dashboard` | Sees attention items ("needs you"), done and failed counts, median cycle time, live work, next automation runs and recent results. Rearranges widgets; exports to PDF or CSV |
| Dashboard: Usage & cost | `routes/dashboard`, `P/usage-ledger` | Reported spend and tokens per project, plan-limit windows |
| Tasks list and task workspace | `routes/tasks-overview.tsx`, `routes/task-workspace`, `task-thread`, `task-git`, `task-preview`, `task-assets` | Live stream of agent text, tool calls and results. Sends messages into a live session; continues, cancels or archives; reads the diff and comments on it; opens a draft PR; uses a terminal; previews a dev server; downloads artifacts |
| Graph tab of a task | `routes/workflow-graph/task-graph.tsx` | Per-node status, iterations, cost, loop counters and the edges taken |
| All tasks | `routes/global-tasks.tsx` | Cross-project table grouped by tag, project, status or workflow |
| Compare variants | `routes/compare-variants.tsx` | Runs a task ×2 or ×3 and picks the best diff |
| Questions / Now | `routes/questions`, `routes/now` | Queue of open gates and questions waiting for the Operator |
| Inbox (opt-in) | `routes/inbox.tsx` | Agent follow-ups turned into new tasks |
| Git / Files | `routes/repo-git` | Branch, status, commits, read-only file browser |
| GitHub | `routes/github` | Open issues and PRs through `gh`. Hands an issue to a workflow in one click. **Merges a PR** (`POST` with `method` and `expectedHeadSha`, `P/server/server.ts:7843`) |
| Tracker | `routes/tracker` | Browses Jira Cloud or Linear and launches a task from an issue |
| Skills | `routes/skills.tsx` | Local and team skill repos with a prompt preview |
| Workflows | `routes/workflows`, `routes/workflow-graph/workflow-graph.tsx` | Node-graph editor for `version: 2` YAML. **Simulate** a run, have AI draft a plan, import or export |
| Automations | `routes/automations` | Weekly calendar, triggers, previews and execution log; pause or enable each automation |
| Manager | `routes/manager` | Chat with a long-lived manager agent. Merges it proposes happen only on a click in the chat (`P/managers/bash-policy.ts:29-32` denies the manager `gh pr merge`, `git push` and similar) |
| Settings | `routes/settings/*` (55 files) | Agents and accounts, model presets, instructions, prompt templates, secrets, tracker, webhooks, worktrees and lifecycle scripts, phones, notifications, privacy, keyboard, appearance, bookmarklets |

It is responsive and works on a phone browser (README "On your phone"). It also has a command palette,
keyboard navigation through the tasks that need you, and live updates over SSE.

### 3.2 Projects and repositories

Many projects run in one cockpit (reference.md "Multiple projects, one cockpit"). A project can be
added from a local folder or cloned from GitHub, and tagged. Each task gets its own git worktree
(`P/git-worktree.ts`, `P/worktree-lifecycle`), with retention and disk guards. Project config lives
in `.ai/cezar/config.json` inside the repo, which fits decision 10: the engine's files sit in each
repository. Concurrency has a cap (`maxParallel`, default 2, per project or per workspace,
`packages/contract/src/projects.ts:52`) and a FIFO queue that survives a restart.

### 3.3 Git providers and trackers

| Provider | Read | Write | Missing |
|---|---|---|---|
| GitHub and GHE (`P/server/forge/github.ts`, 3.8k lines, through `gh`) | Issues and PRs, comments, reviews, timeline, checks rollup, merge state, PR diff | Draft PR, mark ready, add labels and reviewers **to a PR** (`github.pr-update`), comment on an issue or PR, wait for CI, merge a PR from the UI, push | No node for **issue labels**. Sub-issues and blocked-by links appear nowhere (grep for `sub_issues` finds nothing). No merge queue. No auto-merge node |
| GitHub automations (`packages/contract/src/automations.ts:34-44`) | 9 events, polled only and never by webhook: `issue.opened`, **`issue.labeled`/`unlabeled`**, PR opened, reviewed, review requested, closed, merged | — | No issue-comment trigger |
| Jira **Cloud only** (`P/server/tracker/jira.ts`, REST API v3) | Browse and search, issue detail, comments, labels, status. Triggers on created and on status changes (polled, default every 30 min) | The agent can comment and **transition status** through `cez tracker comment/transition`, once a grant is ticked in the editor (docs/issue-trackers.md "Tracker automation access") | Label writes and assignees are not supported. Linked issues, attachments and custom fields are not fetched. Jira Server and Data Center are not supported |
| Linear | Browse, created trigger, comment | Same capability model | Status and label triggers |
| GitLab | — | — | Missing: `P/server/forge/index.ts:20` says "GitLab lands here later". The `ForgeDriver` interface (`P/server/forge/types.ts:273`) is the seam for it |

### 3.4 Accounts, auth and multi-user

There is a single trust domain. The HTTP API has no built-in auth: it binds to 127.0.0.1
(reference.md:799). The server installer puts nginx `auth_basic` with one htpasswd file per instance
in front of it (docs/server-install/ubuntu-vps.md:60, :219). There are no user accounts, roles or
audit of who approved a gate. "Agent accounts" means several CLI logins, each chosen per project
(reference.md:274). For one Operator, that is enough.

### 3.5 Settings, policies and secrets

- Secrets are encrypted with AES-256-GCM, and the key sits in the OS keychain or in a 0600 file on a
  server.
- Each secret has a scope (project or workspace) and an audience (`checks`, `cezar`). **No agent
  step ever receives a secret**, and binding one on an agent step is a load-time error
  (reference.md:362-399).
- Output is redacted, best effort (`P/core/secret-redaction.ts`).
- The agent environment is least-privilege by default (`P/core/agent-env.ts:1-17`).
- Per-step policies: `allowedTools` and `bashAllowlist` (enforced by Claude), plus a
  `bypassPermissions` setting for each project.
- Tracker write grants are given per operation in the editor only. The agent's own CLI can narrow
  them but never add one.

### 3.6 Agent runners and models

11 backends, each in its own runner in `P/core/*-runner.ts`: claude, codex, copilot, cursor, agy,
gemini, junie, kimi, omp, opencode, pi. A workflow node picks its `runner` and `model`
(`P/workflows/graph.ts:52-70`). Each runner uses the CLI's own login, so no API key is needed.
Automatic agent fallback is available (reference.md "Automatic agent fallback"). A session can be
continued across nodes (`session.continue`). For decision 22, a reviewer from another model family is
one line: `runner: codex` on the review node.

### 3.7 Sandbox and network isolation: **not ready**

- The agent runs as the cezar user on the host, with the worktree as `cwd`. `P/core/agent-runner.ts:54`
  sets the default tools to `Read, Edit, Write, Grep, Glob, Bash`, which gives an unrestricted shell
  (reference.md:546-555).
- **The agent's environment keeps `GITHUB_TOKEN`, `GH_TOKEN`, `GH_HOST`, `GH_ENTERPRISE_TOKEN` and
  `GH_CONFIG_DIR`** (`P/core/agent-env.ts:282-288`) **and `HOME`** (`:38`). That means the host `gh`
  login, so an agent can push to any branch and run `gh pr merge`.
- Codex defaults to `danger-full-access`, and `CEZ_CODEX_NETWORK=0` switches it to `workspace-write`
  with no network (`P/core/codex-app-server-runner.ts:89-99`).
- The only Claude-side fence is Claude Code's own Bash sandbox, if the user enables it
  (`P/core/claude-cli-runner.ts:503-510`).
- The docs say it plainly: cezar "does not sandbox a trusted agent against reading local files or
  sending network requests" (docs/issue-trackers.md, "Event automations").
- **Check steps run `bash -lc` on the host, in the worktree, with secrets** (reference.md:364). So a
  check runs code the agent just wrote, with secrets in scope. Our authoritative CI must therefore stay
  in GitHub Actions, not in cezar check nodes.

### 3.8 Gates, approvals and notifications

- **`gate.human`** has approve and reject ports, an optional timeout of 1 minute to 7 days
  (`P/workflows/graph.ts:42`, `:87`), and holds no slot while it waits. Restarts resume a run parked
  at a gate.
- **`ask-user`** offers up to 6 options and returns `answer`, so with `if` after it a gate can have
  more than two outcomes (clarify, redo, changes).
- **How replies are read:** the buttons are deterministic. Free text is classified by **regex code,
  not by an agent** (`P/workflows/gate-reply.ts:39-55`): clear reject words reject, a bare yes
  approves, and anything else counts as "approve with instructions". Only that last case goes to an
  agent, which applies the instructions and must end with `CEZ:VERDICT applied|blocked|declined`
  (`gate-reply.ts:66-75`). The earlier report said "gate replies read by an agent", which is only
  partly true, and we can avoid even that by using only the buttons.
- **Notifications:**
  - signed JSON webhooks with native Slack and Discord formats (`P/webhooks/*`, opt-in with `CEZ_WEBHOOKS=1`);
  - a `notify.webhook` graph node (opt-in with `CEZ_WORKFLOW_WEBHOOKS=1`);
  - phone push through a relay.
- **The relay:** its default is `https://rome.cezar.run` (`P/relay/wire.ts:72`). Traffic is end-to-end
  encrypted with Noise, but the relay's own implementation is private (RELAY_PROTOCOL.md §1). For a
  fully self-hosted push, point a webhook at our own ntfy instead.

### 3.9 Logs, traces and cost views

- An append-only NDJSON event log per run under `.ai/cezar/runs/`.
- Per-step tokens and `costUsd`, including the `{{nodes.<id>.costUsd}}` output.
- Peak memory per run.
- The Graph tab showing the path a run took.
- Dashboard Usage & cost, and the plan-limit ledger in `~/.cezar/usage-ledger/`.
- Runs launched from a GitHub automation carry `CEZ_GITHUB_REPO/NUMBER/EVENT` (reference.md:81).
- No OpenTelemetry export (not found).
- No weekly summary.

### 3.10 Deployment, API and CLI

- `npx cezar-run server-install --platform ubuntu-vps` sets up nginx, TLS, htpasswd and a systemd user
  unit (`P/server-install/*`, docs/server-install/ubuntu-vps.md). It also supports an external proxy
  (Traefik or Dokploy) through `--bind-host 172.17.0.1`.
- There is no official Docker image (not found), so we would write a Dockerfile ourselves.
- No database: state is plain files.
- The HTTP API lives under `/api/v1`, with zod schemas in `packages/contract`.
- The CLI covers `cez runs | task | automation | tracker | secrets | worktrees | impact`.

## 4. YAML graph expressiveness for our 9 stages

The node set is in `P/workflows/graph.ts:50-153`: start, end, loop, agent (verdicts), check,
gate.human, ask-user, dispatch, git.commit, github.draft-pr, github.wait-ci, github.pr-comment, fork
(2–4), join (all|any), workflow (sub-workflow), if (diff-lines, diff-files, paths-changed, node output,
branch), git.push, git.sync-base, github.pr-update, github.issue-comment and notify.webhook.

How a graph runs:

- One node runs at a time, except fork branches.
- Every cycle must pass through a `loop` node, and **a loop's counter never resets within a run**
  (`graph.ts:11-12`). Wiring every fix path through one `loop max: 3` therefore gives us the **shared
  3-round limit** for free.
- Leaving a node through an unwired failure port fails the run (`graph.ts:233`).

| Stage | Can a graph express it? | How |
|---|---|---|
| 1 Intake | Yes (configurable) | `issue.labeled` / `issue.opened` automation → agent `triage` with verdicts `agent\|human\|wontdo` → check node writes labels (`gh issue edit`, on the host, as code) → `ask-user` with options S/M/L × R0–R2 → `if` |
| 2 Spec | Yes | agent `interviewer` (it can `ask-user` mid-stage) → git.commit → `ask-user` approve/clarify → `if` → loop back |
| 3 Plan | Partly | `if output` on the size → optional researcher → planner. Creating the slice sub-issues needs a check script that calls the GitHub sub-issues API. Nothing built in |
| 4 Implement | **Partly: no dynamic frontier** | `fork` is static: 2–4 branches fixed at design time (`graph.ts:117`). `dispatch` makes one child. A frontier computed from sub-issue blocked-by edges must be code. Today only an agent can dispatch dynamically, through `cez task create`, and that breaks "code picks the next step" |
| 5 Checks and review | Yes | git.push → draft-pr → `github.wait-ci` (green, red, timeout) → reviewer agent on `runner: codex` with verdicts `pass\|fix\|block` → loop |
| 6 Acceptance | Yes | Validator agent (docs/e2e-verification.md shows browser e2e as a gate) or a check |
| 7 Merge | Configurable | check node `r0-rules.sh` (our rules file) → `if` → for R0, `gh pr merge --auto` in a check (this uses GitHub's own merge queue); otherwise `gate.human`. `github.pr-update ready` exists |
| 8 Deploy and watch | Configurable, weakly | `pull_request.merged` automation → Watcher agent workflow. A rollback needs a revert-PR check script. Nothing deploy-aware is built in |
| 9 Learn | Ready | Scheduled automation (cron) → Retro workflow |

Template variables: `{{task}}`, `{{nodes.<id>.<field>}}` and loop iteration and max. One graph run
can hold days of waiting, because gates hold no slot and resume after a restart. So a whole work item
could be **one long graph run**, or one run per stage chained through labels. The first keeps the
fix-round counter. The second resets it and needs a `round:n` label kept by a check script.

## 5. `CEZ:VERDICT` text token vs JSON

What the code does (`P/workflows/graph.ts:275-293`, `P/workflows/run.ts:7406-7428`):

- Verdict names are declared in the YAML and validated (`graph.ts:44-48`).
- A regex reads only the **last line**: `CEZ:VERDICT <name>`. A name that is not declared counts as
  no verdict.
- With no verdict, the agent gets **one reminder in the same session**, and then the node leaves by
  `failed` with "no verdict — expected one of …".
- The marker is stripped from the summary before display.

So **code** decides the branch, not an LLM reading prose. That already meets the letter of our rule
"code picks the next step from a verdict". What it lacks compared with our JSON verdict:

1. Nothing structured goes with the verdict: no findings list, severity, evidence or per-criterion
   results. The summary is free text capped at `NODE_SUMMARY_CAP`.
2. No schema validation.
3. The verdict lives in the transcript, not in a file that a PR comment or the Retro can consume.

Workaround with no code change (S):

1. The reviewer writes `.ai/verdicts/review.json`.
2. A `check` node runs `jq -e` against our schema and prints the verdict.
3. An `if` with `kind: output, ref: <check>.output, op: equals|contains` branches on it.

This works, but it adds two nodes per verdict.

Upstream-friendly change (S–M): an optional `verdictFile: <path>` plus `verdictSchema` on agent nodes.
The runner would read the JSON after the turn, validate it with zod or JSON Schema, map `.verdict`
onto a port, and expose `{{nodes.x.json.<field>}}`. It is about 100–200 lines across `graph.ts`, the
agent case of the executor in `run.ts` and the editor's inspector. It also fits the
maintainers' own design notes (D10/D17).

## 6. Adding a sandbox per session

There are three ways, from least to most invasive.

**A. Wrapper binary, no fork (M, ~3–5 days).** Every runner resolves its executable from an override:

- `CEZ_CLAUDE_BIN` (`P/core/claude-cli-runner.ts:85-91`);
- `CEZ_CODEX_BIN`, `CEZ_OPENCODE_BIN` and the rest (reference.md:263-273);
- all 8 process runners spawn through `disclaimedCommand` (`P/core/disclaim-spawn.ts:69`).

Point `CEZ_CLAUDE_BIN` at `sbx-claude`, which runs
`docker run --rm -i --network sbx-<task> -v <worktree>:<worktree> -v <tmp>:<tmp> -w <cwd> -e … image claude "$@"`.
The stream-json protocol runs over stdio, so it passes through `-i` unchanged. What has to line up:

1. Mount the worktree, `~/.cezar/tmp/agent/<project>/<task>`, the artifacts directory and the
   `--mcp-config` temp file at **identical paths**.
2. Mount a **per-account Claude config directory** so that `session.continue` and resume work.
3. In the wrapper, **drop `GITHUB_TOKEN`/`GH_*` and use a container `HOME` with no gh config**.
4. Give the container an egress proxy that allows only the model API and the cockpit's loopback port
   (`CEZ_API_URL`, used for `cez task` and `cez tracker`).
5. Make the worktree's `.git` reachable read-write, because a worktree's `.git` file points into the
   main repo.

The push problem mostly goes away: cezar's own `git.push` and `github.draft-pr` nodes push the
task branch **from the host**, so the sandbox needs no git credentials at all. That matches decision
21 more tightly than the branch-restricted push proxy the earlier report planned to write. The
remaining risk is the shared `.git`: an agent could write refs for other branches into the
object store, and the host push only pushes the task branch.

Codex works the same way over app-server stdio. Worktree lifecycle scripts (reference.md:1127) can
create and destroy the per-task network or container volume.

**B. Upstream "sandbox provider" seam (M–L, ~1–2 weeks, plausible PR).** Add a `sandbox` option to
`AgentRunSpec` (`P/core/agent-runner.ts:56`) and one wrap point next to `disclaimedCommand`, with
Docker and OpenSandbox drivers, plus a project setting. The process tree, memory sampling and
leftover-process reaping (`P/core/task-processes.ts`, cgroup-probe) would need container awareness.

**C. Claude Code's own sandbox (S, partial).** Enable `sandbox` with a network allowlist in the
project's `.claude/settings.json` through Settings → Agent config. This uses bubblewrap on Linux. It
covers Claude only and still lets the agent read the host filesystem, so it is a stopgap.

## 7. Mapping against our spec

Legend: R = ready, C = configurable without code (YAML, scripts, settings), X = needs a code change,
M = missing.

### 7.1 The four parts

| Part | Status | Notes |
|---|---|---|
| O, Orchestrator | C/X | Per-run graph engine, queue, automations, durable waits: ready. Missing: a work-item state machine across runs (C through labels and per-stage workflows), a dynamic slice frontier (X), a cap of 3 items waiting for the Operator (X), a global pause (X) |
| S, Sandbox | M → C | Missing out of the box. Path A in section 6 adds it without forking |
| D, Decision requests | R/C | The web UI gates and ask-user cards, the "needs you" queue and the phone browser cover it. Push: webhook → self-hosted ntfy (C) |
| T, Session traces | R/C | NDJSON per run, cost per node, issue number in the environment. Weekly six-metric summary: a scheduled workflow with a script over `.ai/cezar/runs` (C). No OpenTelemetry |

### 7.2 The 15 states

cezar has its own **run** states (`queued → running → review/waiting/done/failed/cancelled`,
reference.md:25). Our work-item states must live in tracker labels or Jira statuses and be moved by
**check nodes running as code**. For GitHub this is configurable. For Jira, label writes are not
supported, but status transitions work through `cez tracker transition` (agent-executed) or through
our own check script with a `checks`-audience Jira secret (code).

| State | Status | How |
|---|---|---|
| Triaging | C | `issue.opened` / `issue.labeled state:triaging` automation → triage workflow |
| TriageReview | C | `ask-user` card, then a script relabels |
| Specifying / SpecReview | C | stage-2 graph, with gate or ask-user |
| Planning / PlanReview | C | stage-3 graph. Sub-issue creation is our script |
| Implementing | X | The per-slice frontier needs code (a new `slices` node, or an external dispatcher calling `POST /api/v1/runs`) |
| Verifying | C | wait-ci → reviewer → validator, inside the shared loop |
| MergeReview | C | `gate.human`. "Changes" leads to a separate loop node so it does not spend a fix round |
| Live / Done / RolledBack | C (weak) | Merged-PR automation → Watcher workflow plus a revert script |
| Blocked | C | The loop's `exhausted` port and the `block` verdict → a script labels it Blocked |
| ForHuman / Cancelled | C | A script closes the issue with a reason. Cancelling from any state: Cancel on the task, plus a script that relabels |

### 7.3 Cross-cutting rules

| Rule | Status | Evidence / change |
|---|---|---|
| A shared limit of 3 fix rounds, then Blocked | R inside one run | The loop counter never resets (`graph.ts:11`). Across stage runs: C, a label counter |
| Time and cost limit per session, counted as a failed round | X (S–M) | Inactivity timeout of 30 min with a hard ceiling of ×8 (`P/core/inactivity-deadline.ts:18`). The dollar budget is a **turn-end** brake for dispatched children only, and it parks as `waiting` rather than failing (`run.ts:3486-3505`). Needed: a `budgetUsd`/`timeoutMs` on every agent node that ends the node by `failed`. The run then goes through the loop |
| At most 3 items waiting for the Operator | X (S) | Waits explicitly hold no slot (reference.md "Waits hold no slot"). Add a `maxAwaitingOperator` setting that holds new starts in the queue |
| Global pause | X (S) | Each automation pauses on its own, and nothing pauses the whole queue. Add a workspace pause flag on the queue and the scheduler |
| Code picks the next step from a verdict | R (token) / C (JSON) | Section 5 |

## 8. Extension points

1. **Workflow YAML** (`version: 2`), stored in each repository as `.ai/cezar/workflows/*.yaml`, plus
   built-in templates (`P/workflows/templates.ts`).
2. **Check nodes**: arbitrary host shell with secrets. This is where all our "code decides" glue goes:
   labels, R0 rules, sub-issues, the Jira API, revert PRs.
3. **Skills**: Markdown, either per repo or from a team skills repo. This is where agent roles live.
4. **Automations**: cron, GitHub events, Jira and Linear events.
5. **HTTP API and CLI**: an external dispatcher could own the frontier and the cap and call
   `POST /api/v1/runs`.
6. **Private MCP per project** (`P/core/private-mcp.ts`), injected at launch.
7. **Webhooks**: signed JSON out.
8. **Binary overrides** (`CEZ_*_BIN`) for sandboxing.
9. **Worktree lifecycle scripts**.
10. There is **no plugin API for new node types**. A new node means a schema entry in `graph.ts`, a
    case in `run.ts` (the node executor around lines 7200–8100) and an editor node. The catalog
    comment (`graph.ts:203`) shows the design expects nodes to be added this way.

Can our rules be added without forking? About 80% yes. The items that need code are a slices or
frontier node, the waiting-operator cap, the global pause, per-node hard cost and time limits that
fail the node, a JSON verdict, and sandbox polish. Each one is generic. **None is specific to our
pipeline**, so they are good upstream PRs.

## 9. Security and risks

- **Tokens the agent can reach today:** its model CLI's own login, `GITHUB_TOKEN`/`GH_TOKEN` and the
  host `gh` login through `HOME` (`agent-env.ts:38`, `:282-288`). With those, an agent can push to any
  branch, open or merge PRs, and edit issues. The cockpit API is reachable on loopback. Tracker tokens
  are never forwarded (docs/issue-trackers.md "Agent context"). Secrets go to check steps only.
  **cezar itself never auto-merges** (README "Nothing merges on its own").
- **Check steps run agent-modified code with secrets on the host.** Do not bind secrets to checks
  that run repo scripts. Keep authoritative CI in GitHub Actions.
- **Outbound calls:**
  - Telemetry is **opt-in**: nothing is sent until the user says yes (docs/telemetry.md).
  - The default team skills repo `open-mercato/skills` auto-updates; turn that off with
    `CEZ_SKILLS_AUTO_UPDATE=0`.
  - The star-count and banner request to github.com is silenced with `CEZ_NO_BANNER=1`.
  - The self-update channel follows npm; set it to `development` to pin.
  - The phone relay at `rome.cezar.run` connects only after a phone is paired; block it with `CEZ_RELAY=0`.
- **Stability:**
  - The project is pre-1.0 with minor releases every 1–2 weeks.
  - Its compatibility contract covers the CLI, routes and file formats.
  - Feature flags change defaults often: dispatch is on by default, automations are on by default,
    and the review gate is off by default.
  - Pin a version and upgrade on purpose.
- **Fit risk:** the product's direction is an interactive multi-agent cockpit for a developer. Our
  tracker-driven state machine sits beside it, not inside it. Upstream will keep reshaping `run.ts`.

## 10. Verdict as a base for us

**Score 6/10.** For comparison, I would give our own engine on Temporal about 4/10 against the new
weighting, because it has no UI, projects, accounts, secrets, runners, trace views or installer.

### Reuse unchanged

The cockpit UI, projects, worktrees and queue, the 11 agent runners with per-node runner and model,
skills, the graph engine (loops, shared counters, gates, ask-user, fork and join, if, wait-ci,
draft-pr), automations (cron and GitHub or Jira events), secrets, cost and usage views, NDJSON
traces, webhooks, the VPS installer, the HTTP API and the CLI.

### Ordered changes

1. **S: Lock down the agent's GitHub reach before anything else.** A wrapper sets `CEZ_CLAUDE_BIN`
   and `CEZ_CODEX_BIN`, strips `GH_*`/`GITHUB_TOKEN` and uses a separate `HOME`. Pushes go only
   through cezar's host-side `git.push`. Turn off `CEZ_DISPATCH` and managers until they are needed.
2. **M: Docker sandbox per session through the wrapper** (path A in section 6). It needs an egress
   proxy that allows the model API and the cockpit port, mounts at identical paths, and a per-account
   config volume. Later, propose a `sandbox` provider upstream (M–L).
3. **M: Pipeline as YAML and scripts.**
   - Per-stage workflows, a `state:*` label automation for each, and check scripts for the
     transitions, the R0 rules file, sub-issue creation, `gh pr merge --auto` with the GitHub merge
     queue, revert PRs, and Jira transitions through a checks secret.
   - Agent roles as skills, with the reviewer on `runner: codex`.
   - The JSON verdict through check, `jq` and `if` (section 5).
4. **S: Global pause** flag on the queue and the automation scheduler (upstream PR).
5. **S: Cap on items waiting for the Operator** (`maxAwaitingOperator`), counted over runs parked at
   a gate or ask-user (upstream PR).
6. **S–M: Hard per-node `budgetUsd`/`timeoutMs`** that ends the node by `failed` and so counts as a
   round (upstream PR).
7. **S–M: `verdictFile` and `verdictSchema` on agent nodes** (upstream PR). It replaces the
   two-node workaround.
8. **M–L: A `slices` node**: a dynamic fork over a list that a check node produces (the sub-issue
   frontier), with up to N in flight, re-evaluated after each branch merges into the item branch.
   The alternative is a small external dispatcher on the HTTP API (M) that owns the frontier.
9. **S: Weekly six-metric summary**: a scheduled workflow with a script over `.ai/cezar/runs/*.ndjson`
   and the tracker, posted to ntfy or as an issue.
10. **S: Self-hosted push**: a webhook to our own ntfy, with `CEZ_RELAY=0`.
11. **M: Jira**: label writes and sub-task links, if a Jira project needs label-based states.
    Statuses already work.
12. **M: A Dockerfile and compose file** for the server, if we want it under Dokploy rather than as a
    systemd user unit.

### Fork or extend

**Extend.** Run upstream releases pinned to a version, keep our pipeline in YAML, skills and
scripts, and send changes 4–8 (and later the sandbox seam) as upstream PRs. Upstream is likely to
accept them:

- "PRs welcome" appears in the README, and 1,255 PRs have been merged.
- The changes are generic.
- They follow upstream's own patterns: bounded waits, default-off flags, catalog-driven nodes.

If one is refused, keep it on a thin patch branch. Avoid broad edits to `run.ts`, because at 113
commits in 3 months it will conflict often.

### Where I disagree with the earlier scores

The earlier report scored cezar O 2 / S 1 / D 2 / T 2 on a 0–3 scale.

- **O 2: agree on the number, not the reasons.** Two of the "why not" points are overstated:
  - The `CEZ:VERDICT` token is parsed by code against declared names, with a reminder and then
    `failed` (`graph.ts:275-281`, `run.ts:7419-7424`). An LLM does not decide the branch from prose.
  - Gate replies are classified by regex (`gate-reply.ts:39-55`). An agent only applies free-text
    instructions.

  The real O gaps are the frontier, the cap and the pause.
- **S 1: agree for the box as shipped.** But the binary-override seam, together with the fact that
  cezar pushes from the host, makes a stronger sandbox reachable without a fork in about a week. It is
  arguably simpler than the push proxy the earlier report wanted to write.
- **D 2 → 3 under the new constraints.** Claude Desktop is dropped and the engine's web UI is now the
  channel, so cezar's gates, ask-user cards, "needs you" queue and responsive UI are exactly D. The
  push is the only gap: its relay is not self-hosted, but a webhook to ntfy fixes that.
- **T 2: agree.** The data is there (cost and NDJSON per run, issue number per run), but there is no
  OpenTelemetry export and no weekly summary.
- **What the earlier weighting missed:** building our own engine on Temporal would mean also building
  the UI, projects, worktrees, 11 runners, secrets, cost views, automations, a workflow editor and an
  installer. Here those are about 265k lines that already exist, covered by more tests than code.
- **Not verified:** issue response times (rate-limited); runtime behaviour, since nothing was run;
  whether Claude's `--resume` works across a container boundary with a mounted config directory.
