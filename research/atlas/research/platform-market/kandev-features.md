# Kandev features review for the pipeline (2026-11-26)

Read-only research. Sources:
- **Clone**: Kandev `main` at commit `9ee282c2` (2026-11-25). Paths below are relative to the repository root.
- **API**: the running instance `http://127.0.0.1:38429` (v0.103.1, stable). GET requests only.
- **GitHub**: `kdlbs/kandev` releases, compare, issues and PRs, read on 2026-11-26.

Nothing was changed on the instance or in any repository.

Running instance facts (from `GET /api/v1/system/updates`): `current: v0.103.1`, `latest: v0.103.1`, `channel: stable`, `channel_editable: false` ("Nightly updates require a Kandev-managed npm or npx user service"), `apply_supported: false` ("not running as a managed service"). Health (`GET /api/v1/system/health`): all 7 checks pass. Installed plugins (`GET /api/plugins`): none. Installed agents (`GET /api/v1/agents`): only `claude-acp`. The only inference agent for utility calls (`GET /api/v1/utility/inference-agents`) is `claude-acp`, with models default/opus/fable/sonnet/haiku.

---

## 1. Plugins and the marketplace

### What a plugin is and how it installs
- **No flag.** The plugin system is in the base product: you install and manage plugins, Kandev spawns their backends, and their native UI bundles load. Feature-status lists it as **Supported**, with this warning: "Loaded plugin code runs with backend privileges ... manifest schema, capabilities, and host API may still change between releases" (`docs/public/feature-status.md:149`).
- **Marketplace.** Open **Settings > Plugins > Browse**. **Install** resolves the latest release tarball and runs the same verified pipeline as `POST /api/plugins/install` (`docs/public/plugins-marketplace.md:44-97`). You can also install from a URL or upload a `.tar.gz` (`plugins-marketplace.md:30-33`). Updates need an explicit click. There is no auto-install and no telemetry (`docs/public/plugins.md:340-346`).
- **Maturity.** The marketplace page is marked `status: experimental` (`plugins-marketplace.md:4`). Stars are "a sort hint, not a quality score" (`plugins-marketplace.md:82-85`).
- **Curation.** A plugin enters the official catalog only after a maintainer approves the PR that adds it to `plugin-registry/plugins.yaml` (`plugin-registry/plugins.yaml:1-13`).
- **Security.** Native UI plugins run in-origin with full app-store access, and hard sandboxing is future work (`plugins.md:326-332`). Host RPCs are capability-gated (`plugins.md:314-325`).
- **Sources.** Only the built-in "Kandev Official" source is configured (`GET /api/plugins/marketplace/sources`).

### Catalog (from `GET /api/plugins/marketplace`, 22 entries; registry list at `plugin-registry/plugins.yaml:25-77`)

| Plugin | Author | Version / min Kandev / stars / updated | What it does |
|---|---|---|---|
| Azure DevOps | JnManso | 0.2.0 / 0.102.0 / 7 / 11-23 | Azure DevOps repositories, work items, PRs, tasks, watches |
| Session Cost | kdlbs | 0.6.0 / 0.99.0 / 5 / 11-25 | Cost icon in the chat bar, from the agent transcript (tokscale CLI) |
| Provider Usage | kdlbs | 0.15.0 / 0.99.0 / 5 / 11-25 | Rate-limit window usage (5 h, daily, weekly) per provider (codexbar CLI) |
| Kandy | kdlbs | 0.16.0 / 0.99.0 / 5 / 11-06 | Cosmetic pet that grows with agent activity |
| GitHub Status | kdlbs | 0.5.0 / 0.99.0 / 3 / 11-06 | Status chip that turns loud when GitHub degrades |
| Forgejo | naerymdan | 0.5.0 / 0.95.0 / 3 / 10-26 | Forgejo or Gitea repositories, PRs, reviews |
| Tags | yattdev | 0.16.0 / – / 2 / 09-28 | Shared coloured tags; agents may manage only the tags they created |
| Notes | yattdev | 0.6.1 / – / 2 / 09-25 | Private per-user note on a task or workspace |
| Voice Mode | kdlbs | 0.2.0 / 0.88.0 / 2 / 11-09 | Dictate prompts (browser, in-browser Whisper, OpenAI relay) |
| YouTrack | ahmedbally | 0.2.0 / 0.78.0 / 2 / 09-21 | List issues, start tasks, link tasks |
| Task Manager | kdlbs | 0.2.0 / – / 1 / 11-08 | Per-task CPU and memory of running agents |
| Slack | kdlbs | 0.4.0 / 0.99.0 / 1 / 11-06 | `@Kandev` or `/kandev`: a utility agent triages a thread into a workspace, workflow and column, then replies |
| Bitbucket | kdlbs | 0.6.0 / 0.99.0 / 1 / 11-07 | Bitbucket Cloud or Data Center repositories, PRs, reviews, watches |
| DeepSeek Balance | Fclem | 0.1.3 / 0.88.0 / 1 / 09-07 | DeepSeek API balance |
| Prompt History | Fclem | 1.4.2 / 0.95.0 / 1 / 10-24 | Panel listing the session's user prompts |
| Redmine | yattdev | 0.3.2 / 0.94.0 / 0 / 09-14 | Link tasks to Redmine issues, **sync status both ways**, watch new issues |
| Nulab Backlog | khuongdo | 0.6.1 / 0.96.0 / 0 / 10-09 | Connect a Backlog space |
| Shape Up | scottof | 0.1.1 / 0.97.0 / 0 / 10-18 | Fixed cycles, appetite, a circuit breaker at the deadline |
| kandev-security | meanderix | 0.15.0 / 0.99.0 / 0 / 11-06 | Import SARIF or build LLM security reports; findings, aggregation, audit tools |
| Telegram | scottof | 0.1.6 / 0.95.0 / 0 / 10-24 | Alerts when an agent waits on a human or a task ends; Mute/Done buttons; `/new` files a task via a triage agent; `/status`; quiet hours; `notify_user` tool for agents |
| STL viewer | kdlbs | 0.1.2 / 0.103.0 / 0 / 11-24 | 3D STL file viewer |
| Step History (canvas) | sharifndlovu123 | registry `kind: canvas` | Per-task workflow path, step visit counts, transition history (`plugins.yaml:68-74`). Needs `features.canvases`, which is off on our instance. |

All plugins are young: the oldest update is September 2026, versions are 0.x, and no plugin has more than 7 stars.

### Useful for us
- **Telegram.** The best fit for "the Operator decides from a phone" without exposing Kandev. It sends outbound alerts when an agent waits on a human and offers `/status` and `/new`. It is community-written (0 stars, v0.1.6), so read its code before you install it, because plugin code runs with backend privileges.
- **Provider Usage and Session Cost** (first-party, actively updated). They show spend and rate-limit visibility for the Retro and for budget guards. Both are low risk because they only read.
- **kandev-security.** A possible sink for SARIF from our Checks & review step. It is community-written, at 0.15.0.
- **Step History canvas.** An audit view of the path a task took through our 12 steps. It requires canvases. Main turns canvases on by default; 0.103.1 does not.
- **Redmine** (not to install). It shows that two-way status sync is possible through the plugin API, so a Jira mirror plugin is feasible (see section 6).
- **Slack.** Only if Slack replaces the Quick Chat dispatcher. It does the same "triage into workspace/workflow/column" job with a utility agent.
- **Skip** Kandy, Voice, STL, the DeepSeek, Forgejo, Bitbucket, Azure, YouTrack, Backlog and Redmine connectors, Shape Up and Notes. Either they don't touch our pipeline or we don't use those hosts.

---

## 2. Utility agents

- **What they are.** One-shot ACP calls that generate small pieces of text. They create no durable task conversation. Configure them at **Settings > Utility Agents** (`docs/public/developer-tools.md:199-201`).
- **Built-in actions.** commit-message, commit-description, branch-name, pr-title, pr-description, enhance-prompt and summarize-session (`developer-tools.md:203-211`). The running instance also lists a built-in **`code-review`**, "Review the task's changed files and return anchored findings" (`GET /api/v1/utility/agents`; `apps/backend/internal/utility/store/builtins.go:46`).
- **Profiles.** A global default profile, or a per-action profile, and an editable prompt template with `{{GitDiff}}`, `{{TaskTitle}}` and similar variables (`developer-tools.md:213`; `GET /api/v1/utility/template-variables`). Custom utilities are possible (`developer-tools.md:215`).
- **Runtime.** Calls run as ephemeral processes on the backend host. They apply the profile's permissions without interactive approval and are rejected when a permission is not auto-approved (`developer-tools.md:219`).
- **Requirements.** An ACP inference-capable agent. Passthrough agents do not qualify (`feature-status.md:84`).
- **Native code review uses the `code-review` utility.** Findings are anchored to file and line in the Changes/Review panel and are advisory: the human chooses Resolve, Dismiss or Send to agent. A review can be triggered from the Review surface, or by a workflow step entry action `run_code_review` that "can additionally name an agent profile directly". The reviewer is configurable independently of the writing agent (`docs/specs/agents/requirements/native-code-review.md`, AC-001.4 to 001.6; `apps/backend/internal/review/prompt.go:12-20`; `docs/plans/native-code-review/task-07-workflow-step-action.md`, status done). The action round-trips through workflow YAML export and import with a portable profile reference (`apps/backend/internal/workflow/models/export.go:707-760`). I found no step-editor control in `apps/web` for this action, so plan to set it through YAML import.
- **Configuration on our instance.** All 8 utility agents show no profile bound (`GET /api/v1/utility/agents`, `agent_profile_id` empty). As a result, "Summarize session" context for handoffs is unavailable (`docs/public/coordination.md:54,356`).
- **Recommendation: yes, use them.**
  - Bind a default utility profile to a cheap model (Sonnet or Haiku) for commit, PR and branch text and for summarize-session.
  - Bind **`code-review` to a profile on a different model family**. That needs a second agent CLI installed (Codex, Gemini, OpenCode and others are in the registry; `feature-status.md:106`).
  - Use `run_code_review` on entry to Checks & review. That gives a cross-family, advisory, anchored second review without writing custom code.
  - Limit: findings are advisory. They do not gate the move or produce a verdict the engine routes on.

---

## 3. Feature toggles

These are the full list on 0.103.1, from `GET /api/v1/runtime-flags` and `GET /api/v1/features`. Definitions, risk text and stability come from `apps/backend/internal/runtimeflags/registry.go:62-430` on main. Production defaults come from `docs/public/configuration.md:644-700`.

Every toggle requires a restart. An environment variable locks the UI control, and otherwise a database override beats the profile default (`configuration.md:665-668`). Every feature flag is "experimental"; only `debug.devMode` is "stable". A toggle "being present does not promote its target feature to supported" (`feature-status.md:147`).

| Key | Default (our instance) | Risk | What it does |
|---|---|---|---|
| `features.auth` | off | high | Login for every visitor, per-user workspaces, PATs; the first visitor becomes admin |
| `features.multiTenancy` | off | high | Organizations above users; requires auth; known cross-organization gaps |
| `features.workspaceCollaboration` | off | high | Applies workspace grants to conversation APIs and plugin callbacks |
| `features.office` | off | medium | Office: autonomous agent teams, routines, budgets |
| `features.needsYouInbox` | off | low | Workspace sidebar **Inbox** of answerable clarification bundles and failed tasks; read-only on the underlying records |
| `features.coordinator` | off | low | Per-workspace coordinator copilot that **proposes** unstarted tasks; a human approves each |
| `features.coordinatorPhase2` | off | medium | Coordinator control: permissions, watches, standing orders, goals, activity log |
| `features.coordinatorPhase3` | off | high | Coordinator autonomy: unattended turns within a 24 h spend ceiling; automatic decisions for chosen proposal classes |
| `features.coordinatorPhase31` | off | medium | Pause, Projects scope, turn-history read, "learning/dream" reports |
| `features.integratedControl` | off | low | Navigation across workspaces, coordinators and conversations (`docs/public/use-kandev.md:105-118`) |
| `features.dynamicAgentRouting` | off | high | Dynamic profiles with provider-error fallback and shared circuit backoff (1 min to 4 h) |
| `features.canvases` | **off** in 0.103.1; **on** in main (#5512) | high | Agent-authored sandboxed web-app canvases |
| `features.agentBackgroundWork` | **on** (profile) | medium | Background-work tracking, controls, subagent observation |
| `features.lspBrowserContinuity` | **on** (profile) | medium | LSP lease kept across browser reconnect; retired on main (#5512) |
| `features.agentSurvival` | off | high | Agents survive a backend restart; **unavailable on Windows** (`registry.go:14-23`) |
| `features.claudeBackgroundPromptHandoff` | off | high | New prompt while Claude background work runs; may dispatch overlapping prompts |
| `features.claudeMidTurnSteering` | off | high | Injects a prompt into a running Claude turn; can misattribute turn completion and usage |
| `features.codexAppServer` | off | high | Native Codex app-server profiles, separate from Codex ACP |
| `features.opencodePlugin` | off | medium | Kandev plugin for OpenCode v2 2.2.0 shell outcomes |
| `features.providerKeywordContext` | off | medium | Keyword and context classification of unmatched provider errors |
| `debug.devMode` | off | high | Diagnostic endpoints and logging of prompt, file and tool content |

Main only (not in 0.103.1): `features.acpV2`, "ACP v2 preview", off, medium (#5451; `registry.go:213-226`).

### Worth turning on
1. **`needsYouInbox`** (low risk). One list of every question that waits for the Operator, plus failed tasks. It fits "questions on the same view" and the For a human step.
2. **`auth`**, but only together with the server deployment. Otherwise everyone who can reach the origin is admin (`docs/public/mobile-remote-access.md:10,93`).
3. **`coordinator`** alone (Phase 1, low risk), as a trial. It is a proposal-only copilot that never moves, archives, merges or stops a task (`feature-status.md:66`).
4. **`integratedControl`** only if the coordinator is on.

### Risky, keep off
`coordinatorPhase3` autonomy, `office`, `dynamicAgentRouting`, both Claude prompt experiments, `codexAppServer`, `multiTenancy`, `workspaceCollaboration` and `debug.devMode`. `agentSurvival` is unavailable on Windows anyway.

---

## 4. Coordinator, coordination and Office

- **Coordination** (supported today, no flag) is the regular-Kanban tool set: parallel sessions, one-level subtasks, targeted messages, child-completion events and multi-repository tasks (`docs/public/coordination.md:25-232`). The documented "coordinator-led Kanban flow" is an agent that plans, spawns subtasks and messages, while "a person inspect[s] changes and merge[s]". It "cannot bypass branch protection ... or human workflow gates" (`coordination.md:324-338`). This is what our pipeline already uses.
- **Workspace coordinator** (`features.coordinator`, **In progress**, `feature-status.md:66`). One or more named coordinators per Kanban workspace, each with an agent profile and executor (`docs/specs/coordinator/requirements/coordinators.md:14-22`). It provides:
  - **Needs you**: what needs a person.
  - **Queue**.
  - An attended copilot chat that explains the board.
  - **Task proposals** that a person approves.
  - Required settings: an agent profile and an executor for created tasks. Passthrough profiles are refused (`docs/public/coordinator.md:98-104`).

  Phase 2 adds permissions ("May do"), watches, standing orders and an activity log. Phase 3 adds autonomy, gated by a 24 h USD ceiling and four containment conditions: an isolated executor (Docker, Kubernetes or Sprites), auth on, no Kandev credential in the environment, and no extra MCP servers (`coordinator.md:72-79`). The only automatic action is "Create a card", and it is earned: at least 30 days, at least 20 decided cards, at least 90% approved unedited, and at most 10 a day (`coordinator.md:81-96`). Main shipped a fix on 11-23 that fills the Needs you pane (#5463), so the UI is still moving.
- **Office** (`features.office`, **In progress**, off in production). Persistent agent teams with roles, projects, routines, budgets, a CEO agent, and a five-stage Backlog, Work, Review, Approval, Done workflow with reviewer and approver quorum (`docs/public/office.md:1-54`). Office only: "Review on a different provider" (`docs/public/office-provider-routing.md:38-66`). Office workflows are excluded from YAML import and export (`office.md:52`).
- **How they relate to our pipeline:**
  - **Our Quick Chat dispatcher** is closest to the **workspace coordinator copilot plus proposals**. Both read context and file unstarted tasks for a human. The coordinator adds a first-class Needs you or Queue view and an audit log (Phase 2). It does not read Jira by itself; its profile would need the Jira MCP, and Phase 3 containment forbids extra MCP servers.
  - **Our gates** stay as workflow **Do nothing** or `requires_approval` steps. A coordinator "never moves, archives, merges, or stops a task" in Phase 1.
  - **Our scheduled Retro, findings pass and scout** match regular **workspace automations**, which are supported today. Office routines are a separate, unstable system (`office.md:52`).
- **Recommendation.**
  - Try **coordinator Phase 1 only**, in a throwaway workspace, as a possible replacement for the dispatcher chat. Compare its proposals with ours.
  - Do **not** adopt Office or coordinator autonomy now. Both are "In progress" and change between releases, and Phase 3 needs auth plus an isolated executor anyway.
  - Watch issue #5351, "Completion gates" (open). Its children #5472 (CI checks at an exact commit), #5473 (Kandev runs a creator-owned check script and judges by exit code) and #5474 (independent verdicts from a reviewer on another provider, human approval as a criterion) are exactly our "verdict in code, not agent opinion" gap. All are open and filed on 2026-11-24.

---

## 5. Nightly versus our 0.103.1

**Facts**
- **Releases** (`gh release list`):
  - 0.99.0 on 11-05, 0.99.1 on 11-06, 0.100.0 on 11-09, 0.101.0 on 11-11, 0.102.0 on 11-19, 0.103.0 on 11-22, 0.103.1 on 11-23.
  - Stable ships about every 3 to 8 days, with patch releases.
  - The plugin SDK is versioned separately (pluginsdk/v0.4.0 on 11-22).
- **Main is 40 commits ahead of v0.103.1**, with 0 behind (`gh api repos/kdlbs/kandev/compare/v0.103.1...main`).
- **npm tags:** `latest: 0.103.1` and `nightly: 0.103.2-nightly.sha4f84ed9f78a4`, built from commit 4f84ed9f of 2026-11-25 10:48 UTC (`npm view kandev dist-tags`). Nightlies are "best-effort daily snapshots ... for prerelease testing, not unattended production rollout". They publish no GitHub Release, Homebrew formula or container tag (`docs/public/cli.md:115-135`; `docs/public/release-process.md:379-391`).

**What changed after 0.103.1 that matters to us** (commit list from the compare API):
- **Fixes**
  - #5469/#5481 and #5484: a session's queue-admission gate could stay held, so every resume and every deferred `move_task_kandev` timed out after 30 s. Issue #5469 was reported on v0.103.1 after a long `ask_user_question` interview, which matches our pattern.
  - #5488: gated moves into a completing step are refused. #5486 had a refused completion that could leave a task in Done without completing it.
  - #5452: option labels in clarification resume prompts.
  - #5453: rich-output previews refresh on reopen. Our decision cards use rich output.
  - #5477/#5487: delivery receipts grew without bound.
  - #5503/#5510: `POST /api/v1/tasks` silently ignored `repository_ids`. This matters if the dispatcher files multi-repository tasks through REST.
  - #5454: invalid repository IDs for task links are reported.
- **Features**
  - #5438: plugin host API for chat bridges: linked accounts, `CancelTurn`, and **step approval as the linked user** (`docs/public/plugins-authoring.md:1856-1900`).
  - #5465: saved prompts in one-time move instructions.
  - #5435: file attachments on feedback comments.
  - #5491/#5501: project selection in plugin task creation.
  - #5451: ACP v2 preview flag.
  - #5512: canvases on by default, LSP continuity flag retired.
  - #5497: PATs accepted on the Office API.
- **Breaking or behaviour changes:** canvases flip to on by default (#5512), and `features.lspBrowserContinuity` is removed. I found no API removals in the commit list.

**Stability**
- Six bug issues opened since 11-22 are still open. The ones relevant to us:
  - #5506: a retained cancellation blocks automatic resume after a restart during a clarification.
  - #5519: plugin URL installs lose the response after a 30 s deadline.
  - #5507: ACP v2 background work is not shown.
- Open PRs fix launch refusals and orphaned work (#5522, #5523).

**Switching and rollback constraints**
- **Nightly is not selectable in Settings** on our install, which is unmanaged `npx` (`GET /api/v1/system/updates`). Windows service installation "is not implemented" (`cli.md:280`). Switching means restarting with `npx -y kandev@0.103.2-nightly.sha4f84ed9f78a4`; pin the exact version, not `@nightly`.
- **There is no in-place downgrade.** "Rollback requires an offline, verified, matched pre-upgrade database and journal backup" (`docs/public/operations.md:286-291`). There is no automatic database downgrade (`operations.md:917`). Before any update, stop sessions, back up the database and the master key, and keep unpushed Git work (`operations.md:1026`).
- A database snapshot excludes worktrees, the master key and agent CLI logins (`operations.md:243`).

**Recommendation: stay on stable, but move to the next stable (0.103.2 or 0.104.0) as soon as it ships.** It will very likely carry #5469/#5484 (move_task hang) and #5503 (REST `repository_ids`), the two fixes that hit our dispatcher-to-step-move path. Given the cadence, expect it within days.

Run nightly only as a side instance to evaluate the chat-bridge step approval:
- Use a separate `--home-dir` (or `KANDEV_HOME_DIR`) holding a copy of the data, plus a different port.
- Never point nightly at the production home.

How to roll forward and back:
1. Stop all sessions.
2. Back up through Settings > System (a SQLite `VACUUM INTO` snapshot in `<db dir>/backups/`; `feature-status.md:145`). Export the master key.
3. Restart with `npx -y kandev@<exact version>`.
4. To roll back, stop, restore the pre-upgrade snapshot, and start the old exact version. Work accepted after the snapshot is lost.

---

## 6. Other Kandev features that close our known gaps

| Gap | What Kandev has | Status / source |
|---|---|---|
| **Route by a JSON verdict in code, not by the agent moving the task** | **No native verdict routing.** Transitions are `on_turn_complete`, `on_children_completed` and similar, with move next, previous or a selected step, an optional `step_complete_kandev` signal, and `requires_approval` (`docs/public/workflow-tips.md:153,237`). The only transition guard is the Office `wait_for_quorum` (`apps/backend/internal/workflow/engine/types.go:599-640`). **Options:** (a) a backend plugin subscribed to `task.*` and `agent.*` events (`docs/public/plugins-manifest.md:675-697`) that reads the verdict and calls `MoveTask` (`plugins-authoring.md:2552`); (b) wait for #5351/#5472/#5473/#5474 completion gates. | (a) supported plugin API; (b) open issues |
| **Reviewer on a different model family** | Native code review via the `code-review` utility or the `run_code_review` step action, bound to a profile of another agent CLI. Advisory findings only. The Office-only "Review on a different provider" (#5375) does not apply to Kanban. | Shipped in 0.103.1; requires installing a second agent CLI (only `claude-acp` installed today) |
| **Jira mirroring** | Native Jira integration: JQL browse, supported transitions, launch presets, watches (first 50 matches). Launch **copies** data and stores **no durable association** (`docs/public/integrations.md:700,723`; `feature-status.md:117`). No step-to-Jira sync. A plugin could do it; Redmine shows the pattern ("sync status both ways"). | Limited; mirroring would need our own plugin or the dispatcher MCP |
| **Gate answers recorded as the Operator's** | With auth on, users sign in and actions carry the user. On main, chat-bridge plugins answer permissions and clarifications as a **linked user** (audit "source plugin", `ResolvedBy` such as "Alice via discord") and `ApproveStep` uses "the same path as the native Approve button, acting as the linked user" (`plugins-authoring.md:1850-1900`). | Auth experimental; step-approval host API main-only (#5438) |
| **Server deployment reachable from a phone, with login** | `features.auth`: email and password, 30-day sessions, PATs for MCP and scripts; first visitor becomes admin; local accounts only, no SSO yet (`docs/public/authentication.md:13-47,128-135`). Phone access through Tailscale, Cloudflare Tunnel plus Access, or a VPN, with auth required for anything beyond one trusted person (`mobile-remote-access.md:83-98`). Installable PWA and Web Push for agent questions, permission requests, failed sessions and finished turns (`mobile-remote-access.md:244-300`). Docker and Kubernetes guides exist; Kubernetes is experimental and single-replica (`feature-status.md:143`). | Auth experimental; phone access documented |
| Questions on one view | `needsYouInbox` (above); coordinator Needs you | Experimental flags |
| Repository as spec | **Workflow sync** from GitHub (read-only in Kandev) and **prompt sync** from a repository (0.103.0, #5394) | Dependency-bound (`feature-status.md:64`; `CHANGELOG.md` 0.103.0) |
| Guards against pushing to main or merging | Kandev "does not bypass repository checks, provider permissions, or branch protection" (`feature-status.md:53`). Branch policies at task creation (`docs/public/tasks-and-workflows.md:361`). PR auto-merge is an opt-in per linked PR (`feature-status.md:80`), so leave it off. | Supported; real guard stays in branch protection |
| Fixed cron caution for Retro, findings and scout | Fixed cron ignores the timezone, and "some fixed cron expressions may never fire"; prefer presets or `@every` | Limited (`feature-status.md:122`) |
| Task chains | Dependencies: a task with **Depends on** starts when its predecessors complete successfully; a failed predecessor stops the chain (`tasks-and-workflows.md:936-1003`) | Shipped (regular-Kanban editing partly in progress, `feature-status.md:60`) |

---

## Ranked list: enable or try first
1. **Bind utility agents.** Give them a default cheap profile, and bind `code-review` to a non-Claude agent profile (install Codex or Gemini CLI). Add `run_code_review` on entry to Checks & review via workflow YAML. Low risk, and it closes the cross-family reviewer gap.
2. **Turn on `needsYouInbox`.** One low-risk view of every Operator question and failed task.
3. **Upgrade to the next stable as soon as it ships** (move_task admission hang #5469, REST `repository_ids` #5503). Back up the database and master key first.
4. **Install Provider Usage and Session Cost** (first-party, read-only) for spend and rate-limit visibility.
5. **Try coordinator Phase 1** (`features.coordinator` only) in a scratch workspace as a candidate replacement for the dispatcher chat.
6. **Prototype the server deployment:** `features.auth` behind Tailscale or Cloudflare Access, PWA plus Web Push. Evaluate the Telegram plugin after reading its code.
7. **Later:** a small backend plugin for JSON-verdict routing and Jira mirroring, or wait for #5351 completion gates. Keep Office, coordinator autonomy, dynamic routing and the Claude prompt experiments off.
