# Kraft as the base engine: re-evaluation

Repository: https://github.com/itsOmidKarami/kraft. Clone: `SCRATCH/src/kraft` (`--depth 200`, head `3d0eaca`, 2026-11-21). The code was read statically. Nothing was installed or run. Paths below are relative to the repo root.

## Verdict first

**Score: 6/10 as a base to extend.** The earlier report put it at 4–5 by implication (runner-up). Under the new weighting it is the best ready base we have looked at. The new weighting counts the cost of building the web UI, auth, settings, forge integration and run views ourselves, and drops Claude Desktop.

- **Reuse unchanged:** the web UI (board, item page, gate review with a diff and line comments, settings, analytics, phone layout), password auth and the reverse-proxy perimeter, GitHub and GitLab PR/MR handling (draft, CI waits, bot review threads, merge queue, post-merge CI), the per-session container sandbox with an egress proxy and credential injection, server-only push, caps on time, tokens and dollars, 7 harnesses, remote workers, events over HTTP and WS, and the webhook notifier.
- **What we write:** an outer "tracker bridge" service (GitHub Issues + Jira ↔ Kraft over its HTTP API), our own chains and add-on (Triage, Validator, Deploy & watch, Retro), and a **small patch set** in the executor for 3–4 of our orchestration rules.
- **Fork or extend:** extend first. Run upstream pinned and keep the patch set small and rebased. Upstream churn is too high for a deep fork: about 20 squash-merged PRs a day, from one author.

## 1. Activity and project health (gh api, 2026-11-21)

| Measure | Value |
|---|---|
| Created | 2026-09-09 |
| Stars / forks | 14 / 15 |
| Commits by month | Sep 838, Oct 623, Nov 1–21: 219 (search API; Jul 0, Aug 1, so the history starts at creation) |
| Contributors | itsOmidKarami 1,411; dependabot 83; release bot 34; next human 12; about 13 people with 1 each |
| PRs | 1,460 closed, 2 open; 59 merged PRs by people other than the owner (outside PRs do get merged) |
| Issues | 26 open / 33 closed; issues are mostly the owner's own design tickets, each closed with 1–2 comments |
| Releases | v2.3.0 10-23, v2.4.0 10-26, v2.5.0 11-01, v2.6.0 11-13; several rc's each |
| License | Apache-2.0 (`LICENSE`, `pyproject.toml`) |
| Status | PyPI classifier "Development Status :: 4 - Beta"; PRODUCT.md: "Local and single-user first", no customer names exist |

**Bus factor: 1.** The pace (1,680 commits in 10 weeks) and the commit style suggest agent-written code under one maintainer.

## 2. Size and tests

| Part | Lines |
|---|---|
| `src/kraft` Python | 147,749 total, 119,298 non-blank non-comment |
| `tests/` | 231,792 lines, 763 test files, about 8,272 `def test_` |
| `frontend/src` (React + TS) | 89,638 incl. tests; 48,869 non-test |
| `vscode/`, `plugins/`, docsite content | 12.7k, 20.7k, 25.2k |

Largest modules, which are also the ones our rules would touch: `executor/dispatch.py` 3,972, `executor/walk.py` 3,685, `api/routes/lifecycle.py` 3,268, `adapters/forge/run.py` 3,257, `templates/models.py` 2,940, `policy.py` 1,944, `executor/gates.py` 1,505, `store/work_items.py` 1,431.

Churn by area, last 30 days (files touched per commit in the shallow history): api 86, adapters 67, executor 59, console 49, skills 46, remote 44, templates 35, vocab 30. The executor, which is where our patches would land, is among the hottest areas.

## 3. What is ready

### Web UI (`frontend/src/ng/*`, docs `docsite/content/5.reference/00.web-ui/`)
- **Board** (`1.board.md`): groups (Needs you, Running, Not started, Done), filter, group and sort, multi-select bulk actions, archived items, side panel.
- **Item page** (`2.item-page.md`): main action, "comes after" links, header actions (pause, resume, retry, skip, cancel, abandon, raise budget, escalate), a chain graph, a node inspector with logs, and a waiting-gate panel.
- **Fix loops and test scopes** (`3.fix-loops-and-test-scopes.md`): per-attempt view of a node's fix loop.
- **Config before start** (`4.config-before-start.md`): per-item overrides of chain, nodes, runner and policy as a reviewed draft.
- **Review page** (`5.review-page.md`): diff with compare, viewed marks, syntax highlighting, line comments, unresolved threads, Finish review → approve or request changes.
- **Templates** (`6.templates.md`): chain and library editor.
- **Settings** (`7.settings.md`): Repos, Forge accounts, Harnesses, Policy, Auto-intake, Notifications, Access, Appearance, Board and code, Workers, Storage, About.
- **Analytics** (`8.analytics.md`): throughput by week, wait at each gate, by node, by repo, why items stopped for a person.
- **Phone** (`9.on-a-phone.md`): a dedicated layout with a bar for a stopped item.
- Search, including vector search, keyboard shortcuts, an offline banner (`0.sidebar-search-and-keyboard.md`), and browser notifications (`frontend/src/browserNotify.ts`).

### Remote Linux server for one Operator (the key question)
**It works without code changes.** Loopback is only the default:
- `cli/admin.py:796-813`, `_bind`: reads `bind`/`port` from `access.yaml` or `KRAFT_HOST`, and **refuses a non-loopback bind without a password**.
- `auth.py:1-16`: scrypt password hash, a 256-bit session cookie stored as SHA-256, constant-time compares. `api/perimeter.py:153-197`: auth is off only when the bind is loopback *and* the peer is loopback, and on for everything else. It trusts `X-Forwarded-For` only from 127.0.0.1. `allowed_hosts` and Origin checks guard against cross-site requests. There is also a login throttle (security docs).
- Guides: `docsite/content/3.guides/4.run/02.put-a-proxy-in-front-of-kraft.md` (bind 0.0.0.0, `allowed_hosts: [kraft.example.com]`, firewall the port, HTTPS at Caddy or nginx), `01.remote-access.md`, and `06.run-as-a-service.md` (systemd, forge tokens for a service).
- **Limits:** there is one password and no user accounts or roles, which is fine for one Operator. **There is no Dockerfile or compose file for Kraft itself** (searched the whole tree): it installs with `uv` or pip on the host and uses Docker or Podman for the sandboxes. Putting Kraft in a container would mean mounting the Docker socket, which is root-equivalent. The better choice is a host install as a systemd service. The agent CLIs (`claude`, `codex`) must be logged in on the server or on a remote worker.
- Remote workers (`src/kraft/remote/`, `docsite/content/2.concepts/5.where-a-step-runs.md`): steps can run on other machines. Commits travel as git bundles, and a machine never holds forge credentials.

### Projects and repositories
`config/repos.yaml`, Settings › Repos, `kraft repo connect`; a connect API at `docsite/content/5.reference/08.http-api/5.connect-a-repo.md`. There is a per-repo default chain, policy, sandbox and env, plus a repo library at `.kraft/` so chains can live in the repository (fits decision 10). Workspace members cover multi-repo items.

### Git providers
- **GitHub** (`adapters/forge/gh.py` 1,511 lines, `github_api.py`, `github_queries.py`): open draft PR with labels and assignees (`gh.py:488-540`), sync body, mark ready, CI status and failed jobs, bot review results, review threads (read, reply, resolve), comments, PR labels (`gh.py:1036`), merge and land, post-merge CI, rate-limit handling.
- **GitLab** (`glab.py` 1,468, `gitlab_api.py`): the same, with the `client: api` token mode for self-hosted GitLab (CHANGELOG 2.5.0).
- **Issues:** **none.** The forge layer covers PRs and MRs only (`ForgeAction` in `templates/models.py:237-247`: `mr.*` and `ci.pipeline`). There is no GitHub Issues reading, no sub-issues and no issue labels.
- **Jira:** **none** (no match for "jira" in `src/kraft`).
- **Tracker that exists:** beads (`bd`), a local issue tracker (`adapters/beads.py`, 202 lines). Auto-intake picks up `bd ready` (`intake.py:1-10`). This is the model a GitHub/Jira adapter would follow.

### Intake: `POST /api/triggers`
`api/routes/work_items.py:950-1000`; reference in `docsite/content/5.reference/07.triggers.md`.
- Body: `repo`, `title`, `description`, `chain`. The item is always filed `paused`, by design (`work_items.py:964-967`).
- Auth: a separate **trigger token** (`$KRAFT_HOME/run/trigger-token`) that can only file paused work (`perimeter.py:211-220`). The MCP bearer token works on every route.
- **There is no field for an external issue key.** The bridge has to keep its own issue ↔ item map, or we add an `external_ref` field (patch S).
- Starting the item is a separate call: `POST /api/work-items/{id}/resume` (`api/routes/lifecycle.py:1378`). `POST /api/work-items` (`work_items.py:426`) also takes `--autostart` and `--after`.
- Schedules (cron in `intake.yaml`) can file a weekly Retro item.

### Accounts, auth, settings, policies, secrets
Single password, sessions list, MCP and trigger tokens with rotation (`3.guides/4.run/11.rotate-the-token.md`). `policy.yaml` covers max_concurrent, budgets (daily and per item), caps per scope, loops and storage (`5.reference/03.configuration/03.policy.md`). Forge accounts take their token from a credential helper, a command, an env var or a file, and `doctor` checks expiry (CHANGELOG 2.5.0). Secrets for the sandbox are declared under `credentials:` and injected by the proxy, never placed in the container (`10.sandbox/4.credentials.md`).

### Agent runners and models
`src/kraft/harnesses/`: amp, antigravity, claude, codex, cursor, gemini, opencode. Profiles `deep` / `strong` / `fast` in `config/harnesses.yaml`. There is a harness per task, so a reviewer of another model family is configuration only (e.g. `harness: codex` on the review task). Fallback lists are supported. Prices are in `prices.json`, used for dollar caps.

### Sandbox and network isolation
`docsite/content/5.reference/03.configuration/10.sandbox/*`, `worker/backends/docker.py` (1,846 lines):
- A container per session, Docker or Podman, with cpu, memory and pids limits enforced or refused (`1.resource-limits.md`).
- A `network:` policy is deny-all with an allow list, enforced by a per-session egress proxy (`3.network-policy.md`). Credentials are injected at the proxy (`4.credentials.md`).
- The worker works in a **copy** of the refs. The server moves only the item's branch afterwards, and only if nothing else moved it. Other refs are dropped (`7.git-in-a-sandbox.md`). The agent never pushes and never merges, which is stronger than our "push only through a proxy to one branch".
- Callbacks to Kraft from inside go only through the session's own channel and act only on its own item (`2.callbacks.md`).
- **Default posture: no sandbox.** An unsandboxed agent runs as the user and can decide its own gates (`docsite/content/6.project/1.security.md:7,19,111`). Escalation turns hold `git-push` grants (`security.md:108`). Both are configuration fixes.

### Gates, approvals, notifications
- Gates are chain nodes (`GateNode`, `templates/models.py:1468-1537`). The approve and reject API is at `api/routes/gates.py:320,451`. `reject_to` re-runs the node that wrote the artifact. There is a reject limit, a timeout, and an `auto_review` agent whose JSON verdict is `approve | reject | fixed | undecided` (`gate_review.py:57-75`). With `auto_review_mode: decides | checks_first`, the default chain never auto-approves (CHANGELOG 2.6.0 #1417).
- An agent's own call to decide its gate is refused, but only under a sandbox with a network policy.
- Notifications: a single webhook in `notify.yaml` filtered by event type, by default `gate_requested` and `work_item_needs_human` (`5.reference/03.configuration/08.notify.md`, `notify.py`, 410 lines). An ntfy topic URL can serve as the webhook, but the body would be Kraft's JSON. Browser alerts also exist.

### Logs, traces, cost
- Per-item event log: `GET /api/work-items/{id}/events` and `WS /api/ws/events` (`5.reference/10.events.md`). Session logs and a usage ledger (`usage.py` 1,291 lines) give tokens and dollars per session, node and item.
- The Analytics screen (`analytics.py` 677 lines) shows lead time, wait per gate, by node, by repo, and stop reasons.
- **No OpenTelemetry export** (no matches).

### API, CLI, MCP
166 FastAPI routes under `src/kraft/api/routes/` (OpenAPI at `/openapi.json`). The `kraft` CLI is in `src/kraft/cli/`. The MCP server (`mcp.py` 816 lines) has `approve_gate`, `reject_gate` and more. There is also a VS Code extension and agent plugins.

### Telemetry
None found. The only outbound call is a daily update check against the GitHub releases API (`update.py:29`), which `KRAFT_NO_UPDATE_CHECK=1` disables.

## 4. Mapping against our spec

Legend: **R** ready · **C** configurable without code (chain, config, or our bridge over the API) · **P** needs a patch inside Kraft (where, size) · **M** missing (we build it outside).

### 9 stages

| Stage | Mark | How |
|---|---|---|
| 1 Intake / Triage | C + M | Kraft has no triage. Two options: (a) the bridge files a `triage` chain: an agent node writes `size`/`risk` JSON, a gate follows, and on accept the bridge files the real item on the S or M/L chain and cancels the triage item; or (b) Triage runs in the bridge. A chain cannot branch by size inside itself (nodes are linear; `NodeKind` is exec/gate/group, `templates/models.py:204-209`), so the size choice is a **chain choice** made at filing |
| 2 Spec | R | `spec` → `spec_approval` gate with `reject_to: spec` (`config/chains/default.yaml`). The Interviewer's business questions are agent questions → `needs_human` (statuses doc) |
| 3 Plan | R / C | `plan` → `plan_approval`. A Researcher for L is one extra agent node on an L chain (C). Slices: `## Slices` in the plan → child items (2.6, `executor/slices.py` 561 lines). **But slices must be independent and start from one commit**, with no blocked-by between them (`3.guides/1.day-to-day/1.split-work-into-slices.md`). Our blocked-by frontier → **P, L** |
| 4 Implement | R | A fresh implementer session per slice, each in its own worktree and sandbox, `max_concurrent_slices`. "Tests first" lives in the prompt or skill (C) |
| 5 Checks & review | R / C | `verification` with a test-scope runner and a `strict_judge` fix-loop judge (`config/library.yaml:148-153,266-285`). Its verdict JSON is `continue / stop_needs_human / stop_downgrade` (`executor/round_prompts.py:522-530`). CI outside the sandbox: `mr.ci` (R). A cross-family reviewer: a `code_review` task with `harness: codex` (C). A pass/fix/block verdict needs a reviewer prompt that maps to Kraft's verdicts (C), or a new verdict enum (P, S) |
| 6 Acceptance | C | A Validator agent node in its own sandbox, written by us in the chain. The browser or app run is our image + kit (C) |
| 7 Merge | R / P | Merge queue and train via `mr.merge` with `on_merge_rejected: restart_from` (R). The R0 rules file → **P, M**: a gate that a deterministic check may clear. `auto_review` must be an `AgentTask` (`models.py:1499-1506`), and the maintainer rejects auto-approval as "a different product" (`intake.py:7-10`). Alternative without a patch: two chains, R0 with no `final_review` gate, chosen by the bridge after its own rules check at filing. But our rules apply at merge time (decision 25), so filing time is too early → patch |
| 8 Deploy & watch | C / M | Add `deploy` (subprocess) and `watch` (agent) nodes after `post_merge_ci`. Deploy credentials go in via proxy-injected `credentials:` (C). Rollback by itself: a Watcher agent that runs a rollback command (C), but deploys must never run in parallel → a global lock (P, S, or the bridge) |
| 9 Learn / Retro | C | A cron `schedules:` entry in `intake.yaml` files a weekly `retro` chain (but it is filed paused: the bridge resumes it). The Retro reads the event API. The six-metric summary → M |

### 4 parts

| Part | Mark | Notes |
|---|---|---|
| O Orchestrator | R core, P rules | Chain walker, gates, fix loops, caps, queue, restarts that re-attach (`worker/reattach.py`). Missing: our states in the tracker, a shared round limit, a cap counting as a round, a waiting cap, a global pause, a slice DAG |
| S Sandbox | R (after config) | Best sandbox among the engines we read. Make `sandbox:` + `network:` mandatory for every repo, and set `defaults.escalation_grants: []` |
| D Decision requests | R (web UI) + S | The board's "Needs you", the review page and the phone layout are our Operator channel. Phone push: notify webhook → a small relay to ntfy or web push (S). Options-and-evidence requests: gate artifacts are markdown documents, so our presentation rules live in the prompts that write them (C) |
| T Session traces | R partial | Events, usage and analytics ready. Tracker number on every record: an `external_ref` field (P, S) or the bridge's map. OTel export + the weekly six metrics → M (M) |

### 15 states → Kraft

Kraft's 9 statuses (`5.reference/02.statuses.md`) are run statuses, not stages. **Our state is a pure function of `(status, current_node_id, gate pending, stop_kind, ended reason)`** from `GET /api/work-items/{id}` (`display_status`, `current_node_id`), so the bridge computes it and writes the label or Jira status. This is size **S** once the chain node ids are fixed.

| Our state | Kraft |
|---|---|
| Triaging | `active` at `triage` node (triage chain) |
| TriageReview | `needs_human`, gate `triage_approval` pending |
| Specifying | `active`/`waiting` at `spec`; an agent question → still Specifying |
| SpecReview | gate `spec_approval` pending |
| Planning | `active` at `research`/`plan`/`chain_revision` |
| PlanReview | gate `plan_approval` or `chain_revision_approval` pending (the slicing approval is a second gate; merge both into one, or show one state) |
| Implementing | at `implementation`, or a parent `waiting` on slices |
| Verifying | at `verification`, `code_review`, `validator`, `draft_merge_request`, `merge_request_feedback`, and for R0 `merge` |
| MergeReview | gate `final_review` pending (drop `local_review` from our chain) |
| Live | at `post_merge_ci`, `deploy`, `watch` |
| Done | `completed`, normal end |
| Blocked | `needs_human` with no gate pending (`failed`, cap, stuck) |
| RolledBack | `completed` after the `watch` node reports rollback (needs an output flag the bridge reads) |
| ForHuman | `complete --reason for-human` or `cancel` with that reason (the bridge sets the label) |
| Cancelled | `abandoned` |

`paused`, `queued`, `blocked` (Kraft's own blocked) and `rate_limited` are not states for us. They keep the last state label.

### Cross-cutting rules

| Rule | Mark | Where |
|---|---|---|
| A shared limit of 3 fix rounds per item, then Blocked | **P, M** | Kraft counts `max_attempts` per node fix loop (`policy.py:888-919`; `caps-and-budgets.md`: "Loops bound repetition" per node). A gate rejection resets the re-run nodes' fix loops (`caps-and-budgets.md`). We need an item-level counter in `executor/walk.py` / `dispatch.py` + `store/work_items.py` |
| A session time or cost limit → counts as a failed round | **P, S–M** | A cap stop is a `needs_human` stop today. Change it so a cap stop raises our round counter and relaunches if rounds are left |
| At most 3 items wait for the Operator | C (bridge) or P (S) | The bridge resumes a paused item only while fewer than 3 items are in Review/Blocked. In-flight items can still reach a gate, so the cap is soft unless patched into `start_queue.py` |
| Global pause; running ones finish to their next state | **P, S–M** | Only per-item pause exists (`lifecycle.py:861`). Pausing an active item stops its node; our rule lets it finish. Add an instance flag checked where a node starts (`executor/dispatch.py`). A no-patch approximation: the bridge stops resuming and sets `max_concurrent` low |
| Cancel from any state | R | `cancel` from any open status (statuses doc) |
| Next step from JSON, never prose | R | Gate review and fix-loop judge verdicts are JSON fields (`gate_review.py:57-75`, `round_prompts.py:522-530`) |

## 5. Extension points

| Point | What it allows | Covers |
|---|---|---|
| Chain YAML (`config/chains/*.yaml`, repo `.kraft/`, `extends`) | Nodes, gates, `reject_to`, `restart_from`, per-task harness and profile | Stages 2–8 shape, Validator, Deploy & watch, S vs M/L chains |
| Library (`config/library.yaml`) + skills | Agent prompts, skills, profiles, judges | All agent roles, presentation rules in gate artifacts |
| `kind: subprocess` tasks | Any command in the sandbox | Deploy, rules checks, metrics jobs |
| Add-ons (`src/kraft/addons/`, `3.guides/2.customize/4.share-chains-with-addons.md`) | A versioned package of chains + library | Package our whole pipeline as one add-on |
| Harness YAML (`src/kraft/harnesses/*.yaml`, `3.guides/3.harnesses/2.adding-a-harness.md`) | A new agent CLI without code | Any further model |
| HTTP API (166 routes) + WS events + trigger token | An outer service drives everything | Tracker bridge, label sync, waiting cap, Retro inputs |
| notify webhook | Push on chosen events | Phone push relay |
| MCP server | Gate tools for agents and assistants | Optional |

**Can our rules be added without forking?** Mostly yes: tracker intake, both trackers, state labels, triage, S vs M/L chains, Validator, Deploy & watch, Retro, phone push and a soft waiting cap all live in chains plus a bridge. **Four need a patch:** the shared round limit, a cap counting as a round, the merge-time R0 rules gate, and a "finish to the next state" global pause. The slice blocked-by DAG is a fifth and the largest. We can defer it by planning dependent slices as sequential items with `--after` (`POST /api/work-items`, statuses doc "comes after"), which Kraft already supports.

**Fork sync cost:** the patches land in `executor/dispatch.py` (3,972 lines), `executor/walk.py` (3,685) and `executor/gates.py` (1,505). These files are among the most churned (executor 59 touches in 30 days) and change with every minor release (4 minors in 3 weeks). Expect a rebase conflict on most minors. Keep the patch set behind config flags and under about 500 lines, and pin a minor version. Upgrade on purpose, with Kraft's own 8k tests as the safety net.

**Would upstream accept them?** Outside PRs do get merged (59). A global pause and an item-wide attempt cap fit Kraft's principles ("bounded, never runaway", PRODUCT.md) and are plausible. A merge gate cleared by a rules file contradicts the stated principle in `intake.py:7-10` and the 2.6.0 "never approves on its own", so it is unlikely. Jira and GitHub Issues intake have no upstream issue we found (not checked in depth).

## 6. Risks

- **Bus factor 1** and agent-paced churn. Mitigation: pin a version, add-on plus bridge, minimal patches.
- **Breaking changes between minors:** 2.6.0 refuses chains that 2.5 accepted (CHANGELOG.md:68, #1417), and Kraft Lite needed a `migrate` (CHANGELOG 2.3.0).
- **Security defaults:** no sandbox by default, agents can decide gates unsandboxed, escalation turns can force-push (`security.md:19,108,111`). Fix by config: a mandatory sandbox + `network:` + `escalation_grants: []` + branch protection. With that, the agent reaches no forge token (the proxy injects declared credentials, and the server holds forge tokens and alone pushes and merges).
- **Server ops:** no container image for Kraft. It is a host install under systemd, with SQLite state in `$KRAFT_HOME/run/` (backup guide `3.guides/4.run/04.back-up-and-restore.md`). The agent CLI logins live on the server.
- **Single password**, no accounts or audit per person: fine for our one Operator.

## 7. Ordered changes to fit (size: S ≤1 day, M ≤1 week, L more)

1. **Server install** as a systemd service, bind 0.0.0.0 behind Caddy with HTTPS, a password, `allowed_hosts`, the port firewalled, `KRAFT_NO_UPDATE_CHECK=1`. **S** (config).
2. **Mandatory sandbox** per repo: our agent image, `network:` allow list, `credentials:`, `escalation_grants: []`, branch protection. **S** (config).
3. **Our chains as one add-on:** `triage`, `s-item` (implement → verify → review → validator → MR → merge gate → post-merge → deploy → watch), `ml-item` (+ spec, plan, research for L), `retro`. Cross-family reviewer via `harness: codex`. Prompts written to our presentation rules. **M**.
4. **Tracker bridge** (our service): polls or receives webhooks from GitHub Issues and Jira, files via `/api/triggers`, resumes, keeps the issue ↔ item map, computes our 15 states from item reads and WS events, writes `state:*` labels and Jira statuses, mirrors slices as sub-issues, soft cap of 3 waiting. **M** (GitHub) + **M** (Jira).
5. **Phone push relay** from the notify webhook to ntfy, with a deep link to the item. **S**.
6. **Patch: item-wide round limit of 3 + a cap stop counts as a round**, behind a policy flag (`executor/walk.py`, `dispatch.py`, `store/work_items.py`, `policy.py`). **M**.
7. **Patch: global pause** that lets running nodes finish to their next state, plus a deploy lock (`executor/dispatch.py`, `start_queue.py`, a settings route). **S–M**. Offer it upstream.
8. **Patch: R0 rules gate**, a `final_review` gate that a deterministic subprocess check may clear at merge time (`executor/gates.py`, `templates/models.py` GateNode). **M**. Keep it fork-only.
9. **Patch: `external_ref` on work items** (trigger body, store, API, events), so traces carry the tracker number. **S**. Offer it upstream.
10. **T: OTel export + weekly six-metric summary** from the events and usage APIs (outside Kraft). **M**.
11. **Slice blocked-by DAG** (`executor/slices.py`, `templates/slicing.py`). **L**. Defer: use `--after` items in the meantime.

Total: about 4–6 weeks of work, against building the O, D and T parts plus a UI on Temporal.

## 8. Where I disagree with the earlier report

| Earlier claim | Correction, with evidence |
|---|---|
| "Self-host: one loopback process" | Loopback is the default only. A network bind with a password, `allowed_hosts`, a proxy-aware perimeter and a documented reverse-proxy setup exist (`cli/admin.py:796-813`, `api/perimeter.py:153-197`, `3.guides/4.run/02.put-a-proxy-in-front-of-kraft.md`). Remote workers also exist (`src/kraft/remote/`) |
| "9 fixed statuses" as a fit blocker | The statuses are run statuses. Our states map to the chain node plus the gate, which **we** define, so the mapping is an S-sized pure function in the bridge, not a fork |
| D = 2 (judged through Claude Desktop) | With the Operator in the engine's web UI, D is close to ready: Needs-you board, gate review with diff and line comments, phone layout, browser and webhook alerts (`5.reference/00.web-ui/*`). Only push-to-phone and the waiting cap remain. I would score D at 2.5–3 now |
| "Building around it" was not costed | Kraft gives about 49k lines of tested UI and 166 API routes we would otherwise write on Temporal, plus GitHub and GitLab PR, CI, bot review and merge queue handling (`adapters/forge/gh.py`, `glab.py`, `run.py`, about 6k lines) |
| Agreed | No GitHub Issues or Jira intake, no global pause, cap-hit stops for a person, unsandboxed by default, bus factor 1, breaking minors. All are still true. The first, third and fourth are bridge or config work; the cap-hit rule needs a patch |
| Not mentioned before | Slices (2.6) exist but are **independent only**: no blocked-by between slices. This is a real gap against decision 16 |

## Not verified

- That the server runs cleanly on our Linux host with rootless Docker or Podman. Nothing was executed here.
- The real behaviour of the network policy and the credential injection under load.
- Whether the gate auto-review verdicts can express pass/fix/block exactly as decision 22 wants without a patch.
- Maintainer response time to outside issues (the issues are almost all his own).
