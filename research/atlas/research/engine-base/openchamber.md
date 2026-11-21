# OpenChamber (openchamber/openchamber) — notes

Checked: commit beecaad (2026-11-21), v2.7.3, static read only. Paths relative to SCRATCH/src/openchamber. Docs = `packages/docs/content/docs/`.

## What it is
A web/desktop/mobile/VS Code workspace on top of the OpenCode agent server (`README.md` "Why OpenCode?"). The server (`packages/web/server/`, Node/Bun) proxies and extends OpenCode with ~80 feature modules in `packages/web/server/lib/` (session-goal, session-lead, workflows, auto-review, pr-watch, scheduled-tasks, trackers, github, gitlab, notifications, ui-auth, relay...). UI in `packages/ui` (React). It is an interactive cockpit for one developer, not a tracker-driven pipeline.

## 1. Web UI — strong
Screens/surfaces (docs): session chat with tool cards, diff and Changes Walkthrough (`walkthrough.mdx`); sidebar with projects, session folders, leads (`sidebar.mdx`, `leads.mdx`); Work Status panel (sessions working/waiting/failed, approvals, workflows, costs; `sessions-in-work.mdx`); Issues and PRs board — list/filter issues and PRs, edit labels, reviewers, comment, Approve / Request changes, Merge, close/reopen, start a session or worktree from an item (`issues-and-prs.mdx`); Git panel with PR tab (create/update/ready/merge; `git.mdx`, `github.mdx`); Workflows panel (runs, per-agent log, model and token/cost; `workflows.mdx`); Scheduled tasks (`scheduled-tasks.mdx`); Usage/quota page (`usage.mdx`); Settings (providers, permissions, integrations, extensions, git identities, notifications); terminal, file editor, app Preview, multi-run compare (`multi-run.mdx`). PWA with web push; iOS/Android apps.
Operator gates available in UI: per-tool permission ask/allow/deny (`permissions.mdx`), "Run workflow / Don't run" approval card (`workflows.mdx` §Run a workflow), lead digest "Needs you" with up to 3 questions and answer buttons (`leads.mdx` §The digest), Merge button asks before merging.

## 2. Git and tracker integration — strong for git hosts, weak for Jira
- Built in: GitHub (incl. Enterprise), GitLab (incl. self-managed), Gitea, Forgejo, Gerrit (`integrations.mdx`, `github.mdx`; code `packages/web/server/lib/github/` — `mutations.ts` 1373 LOC, `pr-status.ts`, `checks-summary.ts`, `merge-when-ready.ts`, `merge-follow.ts`).
- Depth: issues (list, filter, labels, comments, edit), PRs (create, update, draft/ready, reviewers, approve/request changes, checks shown, merge with usual method, merge-when-ready), PR watch that wakes the agent on failed checks / review comments / merge (`lib/pr-watch/DOCUMENTATION.md`). No GitHub sub-issues or blocked-by (grep `sub_issues|blocked_by` in `lib/github`: none).
- Linear built in (board, status change, team->project mapping, session comments on start/finish/fail; `integrations.mdx` §Linear).
- Jira: not built in (grep only in tests). Extension tracker contract exists (`lib/trackers/tracker-contract.d.ts`: list/get/states/updateState/liveSummaries, oauth or token, session-status comments), so a Jira adapter is an extension, not a fork.
- No trigger "new issue -> start pipeline"; sessions start from an item only on a human click, the first message written by the human (`github.mdx` §Start work).

## 3. Workflow and gates
- No stage/state machine for work items. Closest primitives:
  - Workflows: JS script `.openchamber/workflows/<name>.js` with `agent({prompt, schema, model, phase})`, `parallel()`, `pipeline()`, `phase()`; `agent()` with a schema returns parsed JSON (validated, 3 tries) so code routes on structured output (`lib/workflows/DOCUMENTATION.md` §Invariants; `json-schema.ts`). Runs in a worker-thread vm (`sandbox.ts`), limits 8 concurrent / 200 agents per run (`runtime.ts:17-18`), approve/decline/stop/resume via `POST /api/openchamber/workflows/:runId/{approve,decline,stop,resume}`. One level of fan-out only; no human gate mid-script.
  - Auto-review: implementer <-> reviewer session loop, statuses clean/disputed/limit/failed/stopped, cap 5 re-reviews `MAX_ROUNDS` (`lib/auto-review/DOCUMENTATION.md:30,98`). Verdict is prose-driven, not JSON.
  - Session Goals: auditor model judges keep-going/done/stuck after each turn, token budget, continuation cap, blocked after 3 stuck verdicts (`session-goals.mdx`, `lib/session-goal/`).
  - Leads: an orchestrating session that hands work to child sessions and asks the Operator at most 3 questions (`leads.mdx`) — LLM-driven, not code-driven.
  - Scheduled tasks / loops as markdown with cron (`.agents/loops/*.md`, `scheduled-tasks.mdx`) — fits the weekly Retro.
- Pause/cancel: stop per session, per goal, per workflow run; no global pipeline pause (no hits for pauseAll/global pause in server).
- Limits: token budget per goal, agent caps per workflow; no per-session wall-clock limit, no shared fix-round counter per item.

## 4. Sandbox — weak
- Agents are OpenCode sessions running as the server user in the project folder or a git worktree (`worktrees.mdx`). In Docker, all sessions share one container (`Dockerfile`, `docker-compose.yml` mounts `~/.ssh`, opencode config and `workspaces/`). No per-session container, no network isolation.
- Credentials: git identity writes into repo-local git config and "the agent's shell uses it too" (`git-identities.mdx` §Apply); host tokens live on the server; `gh` CLI login reused if present (`lib/github/gh-cli-credential.ts`). So the agent can push anywhere the token can and could merge via API/CLI. Permission rules (allow/ask/deny, Jev "safety net") are a policy layer, not isolation. The workflow `sandbox.ts` isolates only the orchestration script, not agents.
- Enterprise mode can restrict content to configured providers and extensions (`security.mdx` §Enterprise mode).

## 5. Accounts, deployment, extension points
- Auth: one UI password + passkeys + per-device tokens (`lib/ui-auth/`, `security.mdx`). Single user; no accounts, roles or audit per person.
- Linux server: official Dockerfile + compose, port 3000, `OPENCHAMBER_UI_PASSWORD` required (`docker-compose.yml:22`), OpenCode pinned `@opencode/cli@2.3.2` (`Dockerfile:56`); reverse proxy guide `docs/REVERSE_PROXY.md`; tunnels and an E2E "Private Relay" (default `wss://relay.openchamber.dev/ws`, self-hostable via `relayUrl`).
- Extension points without forking: (a) extensions SDK (`packages/sdk`, `sdk.mdx`): manifest + capabilities prompt/sessions/files/model/shells, local service that can start sessions and receive turn events, Work Status sections, chat cards, sidebar marks, trackers, git hosts, notification channels (Slack/Matrix), usage providers; (b) OpenCode plugins shipped inside an extension; (c) MCP servers (`mcp.mdx`, 150-service catalog); (d) saved workflows and loops in the repo; (e) HTTP API of the server (`/api/openchamber/*`, `/api/auto-review/runs`).
- Agents/models: anything OpenCode supports; Claude Code via official Agent SDK integration (`integrations.mdx` §Claude Code); usage view for Claude, Codex and others.

## 6. License, telemetry, size, activity
- MIT. No product telemetry SDK found (grep posthog/sentry/analytics in server/ui: only local "work-status telemetry" UI). Outbound by default: update check (`lib/self-update/openchamber-routes.ts:155`), hosted relay when pairing, optional Jev classifier (off until chosen; "OpenCode Zen promotion" sends classification prompts to a third party).
- TypeScript/JS. Rough non-test LOC: ui ~619k (includes locales/generated), web server ~208k, sdk ~31k, electron ~18k, vscode ~29k. Tests: ~2.3k test files (ui 1463, web 688). Large central file `packages/web/server/runtime.ts` 3171 lines.
- Activity (gh api, 2026-11-21): 13.1k stars, 1.5k forks; commits per month Jun 385, Jul 387, Aug 1013, Sep 848, Oct 1723, Nov 1740 (to the 21st); releases every few days (v2.7.1 11-12, v2.7.2 11-15, v2.7.3 11-19); issues 470 open / 2626 closed; PRs 90 open / 3765 closed. Contributors: top maintainer 4812 commits, next 580, then 143 — about 80% one person; bus factor ~1-2. Contribution policy: features only after an `accepted` feature request (`README.md` §Contributing).

## 7. Verdict
Score 5/10 as a base. Best-in-class Operator UI, git-host depth, notifications and an extension SDK cover what the earlier verdict ignored (UI, git providers, auth, settings, run views, cost). But the pipeline core — work-item state machine, 9 stages with gates, per-session sandbox, tracker-triggered intake — is absent and must be built as an extension service that drives sessions through the API.

Gaps:
1. Orchestrator: 15-state item machine, 9 stages, JSON-verdict routing, shared fix-round limit 3, max 3 items waiting, global pause/cancel — as an extension local service + Work Status section + Workflows scripts — L.
2. Sandbox: per-session container with closed network and push-only branch credentials; today all sessions share the server user and its tokens — L (OpenCode runs in-process; needs a custom worktree/runner hook or OpenCode remote per container).
3. Jira tracker extension via tracker contract, plus GitHub sub-issues/blocked-by for slices — M.
4. Operator gate inbox (Decision requests) with accept/approve buttons tied to item states, and a per-session wall-clock + cost limit counted as a failed round — M.
5. Traces with item numbers and the weekly six-metric summary (usage/cost exist per session/agent; need item linkage and export) — M.
Also: CI-gated merge queue and rules-file auto-merge for R0 (merge-when-ready exists) — S/M; single-user auth is fine for one Operator.

Fork or extend: extend. Upstream churn (~1.7k commits/month, one dominant maintainer, feature-request gate) makes a fork very expensive to keep in sync; the extension SDK, OpenCode plugins, MCP and HTTP API are rich enough to add the orchestrator outside the core. Upstream is unlikely to accept a gated SDLC pipeline into core, but may accept small hooks (e.g. a worktree/runner provider for container sandboxes).
