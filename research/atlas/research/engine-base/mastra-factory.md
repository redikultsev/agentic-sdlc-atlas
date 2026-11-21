# Mastra Factory as the base engine: re-evaluation

Research date: 2026-11-21. Repository: https://github.com/mastra-ai/mastra, read at commit `6c4a1558` (2026-11-21). Sparse checkout of `mastracode/` plus `workspaces/docker` and `auth/better-auth`. Code read statically; nothing installed or run. Paths below are relative to the repo root unless they start with `factory/`, `factory-ui/`, `sdk/` or `web/`, which are under `mastracode/`.

## Not verified

- Nothing was run. Every claim is from reading code, docs and `gh api`.
- Whether the Docker sandbox (`workspaces/docker`) works end to end with Factory on a Linux host: the class exists and matches the Factory sandbox contract, but the stock host entry does not wire it.
- Whether `source_control_merge_change_request` can be removed per session by config. I found no filter in the tool builder; the `disableBuiltinTools` option covers core agent tools only.
- Whether `@mastra/auth-better-auth` passes all of Factory's auth seam checks in practice (the seam names it explicitly; I did not test it).
- LOC figures for Mastra core packages are estimates from blob sizes (about 36 bytes per line).

## Answer

**Score 6/10 as a base. Extend, do not fork.** Mastra Factory already ships most of what the earlier report did not price: a full web UI with a configurable board, projects and repositories, GitHub App, GitLab, Jira, Linear, incident.io intake, multi-user auth with organizations, encrypted secrets, per-project skills, rules, audit, metrics, Slack, and a Docker sandbox class in the same monorepo. It is built so a deployment is its own small project (`npm create factory`) that depends on `@mastra/factory` and passes boards, skills, tools and integrations into `new MastraFactory({...})` (`factory/src/factory.ts:272-480`). That is the right extension seam for us.

What it does not have is exactly our orchestration rules: slices as sub-issues with a frontier, a JSON verdict with block, one shared fix-round counter across review and CI, session time and cost limits, a global pause, a cap of 3 waiting items, merge-by-rules, deploy watch and retro. Its build loop also ends by an LLM "goal judge" reading prose, and the sandbox holds a write token plus a merge tool. All of these can be added, most through the config seam and a few small upstream PRs, but two (token scoping, judge replacement) touch core Factory files.

## 1. Activity and project health

| Metric | Value | Source |
|---|---|---|
| Stars / forks | 29,714 / 3,126 (whole mastra repo) | `gh api repos/mastra-ai/mastra` |
| Repo commits per month, Jun–Nov 2026 | 876, 1134, 1350, 1741, 2132, 1224 (Nov to the 21st) | `gh api search/commits` |
| Commits touching `mastracode/factory`, Jul–Nov | 95, 212, 237, 283, 271 (Nov to the 21st); none before July | `gh api commits?path=` |
| Commits touching `mastracode/factory-ui`, Jul–Nov | 37, 143, 114, 212, 182 | same |
| Authors of `factory` commits (1,098 since July) | `dane-ai-mastra[bot]` 336 (31%), `mastra-platform[bot]` 181, then 5 humans with 147, 144, 87, 50, 29; 30 distinct | same |
| Authors of `factory-ui` commits (688) | one human 355 (52%), then 88, 76 (bot), 32; 27 distinct | same |
| Package version | `@mastra/factory` 0.31.0-alpha.3 (`factory/package.json`) | |
| Core releases | weekly (`@mastra/core` 1.80 → 1.84 between 2026-10-28 and 2026-11-18) | `gh api releases` |
| Issues mentioning "factory" | 324 open; 1,718 created since 2026-08-01 | `gh api search/issues` |
| License | Apache-2.0 outside `ee/` directories (`LICENSE.md`); Factory has no `ee/` code | |

Reading: very active, company-backed (Kepler Software, Inc.), and Factory builds itself (the top committer is Factory's own agent bot). Bus factor is better than any single-maintainer candidate from the earlier report: about five humans carry the backend, but the UI depends heavily on one person. The flip side is churn: ~270 commits a month on the backend alone, still 0.x alpha, and visible deprecation layers (board transition policies deprecated, `factory/src/boards/transition-policy.ts:18-50`; Triage dropped from new projects' default board, `factory/src/boards/work-seeds.ts:5-30`; a storage split migration with dry-run mode, `factory/README.md` "Migration and dry run").

## 2. Size and tests

| Module | Source lines | Test lines | Notes |
|---|---|---|---|
| `factory/src` | ~105k (non-test .ts) | ~180k | 317 test files. Largest: `rules/` 9.7k src / 26.9k test, `integrations/` 38.8k / 52.5k, `routes/` 17.7k / 26.1k, `storage/` 15.8k / 12.5k |
| `factory-ui/src` | ~77k est. | 328 test files (msw) | React, Vite, Tailwind |
| `sdk/src` (Mastra Code agent controller) | ~45k est. | 191 test files | |
| `web/` (host wiring) | 5.6k | 47 tests | One entry file, `web/src/mastra/index.ts` (499 lines) |
| Mastra core deps pulled in | `@mastra/core` ~380k est., `@mastra/connect` ~140k, `@mastra/server` ~64k, `@mastra/memory` ~36k, `@mastra/mcp` ~23k | | `factory/package.json` dependencies: core, code-sdk, mcp, connect, auth-studio, auth-workos, platform-workspace, slack, octokit, hono, posthog-node |

How much of Mastra it drags in: all of it that matters. Factory runs one agent only, the Mastra Code agent (`FACTORY_AGENT_ID = CODE_AGENT_ID`, `factory/src/boards/define-board.ts:85`), on Mastra's agent controller, memory, storage and server. You cannot swap the agent runtime for Claude Code or Codex CLI. You also take Mastra's deployer/bundler (`new Mastra(...)` must stay in the host entry file, `factory/README.md` "Documentation"). In practice that is ~700k lines of upstream TypeScript you depend on but should never edit. That is fine for an "extend" strategy and bad for a fork.

## 3. What is ready for the owner

### Web UI (`factory-ui/src/ui/router.tsx:271-383`)

- **Sign-in and onboarding**: `/signin`, `/onboarding`: choose codebase, connect GitHub/Linear, connect a model provider.
- **Work board** (`/factories/:id/work`) and **custom boards** (`/boards/:boardId`): phases as columns, cards with source facts, PR status, session liveness, run queue, proposed runs awaiting approval, saved views, filters by label, source, author, assignee, reviewer, search across keys and links, virtualized for large boards (tests in `factory-ui/src/ui/pages/__tests__/BoardPage*.msw.test.tsx`).
- **Card and session view** (`cards/:workItemId`, `workspaces/:sessionId/threads/:threadId`): the agent chat with streaming, tool activity, plan approval card (`submit_plan`), tool approval, ask-user, steer and abort, model switch, workspace file viewer.
- **New board / board config** (`new-board`, `boards/:id/config/:phaseKey`): define phases, kind (resting, working, terminal), runner skill, next phases, exit tool, auto-start rules.
- **Board rules** (`.../rules`), **board intake** (`.../intake`): which sources and labels route cards to which board.
- **Skills** (`.../skills`, `.../skills/:skillName`, `new-skill`): view and edit SKILL.md per project (per-project overrides, `factory/src/workspace.ts:556`).
- **Rules page** (`rules`): rule decisions log.
- **Knowledge** (`knowledge`).
- **Settings** (`settings/:section`, `factory-ui/src/ui/domains/settings/settingsSections.ts:5-27`): My account, Manage Factory, Connections, Repositories (incl. sandbox environment), Work Intake, Models, Memory, Tools, Behavior, Debug; Slack connection page.
- PWA with manifest and favicon states for "awaiting / working / error" (`factory-ui/src/ui/public/`). No web push notifications (no VAPID or `pushManager` anywhere in `factory`, `factory-ui`, `sdk`).

### Projects and repositories

A "Factory" is a project with linked repositories and an environment (several repos per session, tokens minted per group of ten, `factory/src/workspace.ts:898-930`). Sandbox environment variables per project, split build vs runtime (`factory/src/routes/sandbox-envs.ts`, `factory/src/sandbox/sandbox-env.ts`).

### Git providers and trackers

| Provider | Depth | Where |
|---|---|---|
| GitHub (self-managed App or Platform) | Issues and PRs as cards; events: issue opened/edited/closed/reopened/commented, PR opened/updated/commented/review requested/review submitted/merged/closed/reopened (`factory/src/rules/types.ts:145-161`). Webhooks or polling plus reconcile sweep. Push, open PR, comment, diff comments, request reviewers, review, merge (`factory/src/session/source-control-tools.ts`). Labels written by skills via `gh`. **No** check-run or workflow-run events. **No** sub-issues or blocked-by. | `factory/src/integrations/github/` (rules.ts 120 kB, integration.ts 74 kB, sandbox.ts 57 kB) |
| GitLab | Same shape: issues, MRs, events (`rules/types.ts:164-175`), MR review and re-review skills. PAT/group token or Platform. | `factory/src/integrations/gitlab/` |
| Jira | Cloud only, deployment-global Basic auth (email + API token). Intake by JQL polling; agent tools `jira_get_issue`, `jira_create_comment`; events only `issueObserved`, `issueClosed` (`rules/types.ts:181`). **No** status transitions or label writes back to Jira. | `factory/src/integrations/jira/agent-tools.ts:43,68`, `web/.env.schema` "Jira intake" |
| Linear, incident.io, Dependabot, Vanta | Intake sources | `factory/src/integrations/*` |
| Slack | Start sessions, threads, account linking | `@mastra/slack`, `web/README.md` |

### Accounts, auth, multi-user

- Org-scoped multi-user throughout (orgId on every row, session visibility private or shared, `factory/src/session/credential-policy.ts:70-76`).
- Auth seam takes any `IMastraAuthProvider` that implements organizations (`factory/src/auth.ts:30-50`; docs https://factory.mastra.ai/configure/auth). The stock host wires only Mastra platform sign-in, WorkOS, or "disabled" (`web/src/mastra/index.ts:141-174`).
- **WorkOS is not required.** `@mastra/auth-better-auth` registers the organization plugin unconditionally and returns `organizationId` (`auth/better-auth/src/index.ts:22,314,377`), and the auth seam already handles better-auth's session shape (`factory/src/auth.ts:137-143,225`). Using it means writing our own host entry with `auth: new MastraAuthBetterAuth(...)`: size S, plus verification. With auth disabled the UI refuses to work (`web/.env.schema`, `MASTRACODE_AUTH_DISABLED`).

### Settings, policies, secrets

- Stored credentials encrypted with AES key and rotation (`factory/src/secret-encryption.ts`, `web/.env.schema` "Stored credential encryption").
- Model scope per project: user, factory or hybrid (`factory/src/storage/domains/projects/base.ts:20-21`); deployment-wide providers (Bedrock, Vertex).
- Rule groups (JSON conditions on card facts) for `autoStart` and plan `autoApproveWhen` (`factory/src/boards/define-board.ts:150-175`, `factory/src/rules/rule-group.ts`).
- Per-tool permission policies; Factory tools pre-allowed (`factory/src/tools/permissions.ts:10-33`).

### Agent runner and models

- One agent: Mastra Code (`sdk/`). Any model through Mastra's model router: API keys (Anthropic, OpenAI and others), Bedrock, Vertex, and subscription logins for Claude Max and OpenAI Codex (`sdk/src/index.ts:127-132`, `sdk/src/auth/providers/openai-codex.ts`).
- Model is chosen per project or user, not per board phase: `BoardPhaseRunner` has no model field (`factory/src/boards/define-board.ts:93-115`). A session can switch its own model with `factory_switch_session_model` (`factory/src/tools/permissions.ts:30`).
- Skills shipped: triage (237 lines), plan, build, review, rereview, self-review, GitLab review/rereview, configure-factory-rules (`factory/factory-skills/*/SKILL.md`). Strong security hygiene in prompts: untrusted issue text, no cross-repo leaks (`factory-triage/SKILL.md:12`).

### Sandbox

- Providers wired in the stock host: Mastra Platform (cloud), E2B (cloud), Local (no isolation, runs as the server user) (`web/src/mastra/index.ts:400-427`). Outside dev the server refuses to start without Platform or E2B unless `FACTORY_SANDBOX_PROVIDER=local`.
- **`DockerFactorySandbox` exists** in `@mastra/docker` (`workspaces/docker/src/factory-sandbox.ts:58-177`): builds a per-repo image template, per-session container, options for `network`, `readonlyRootfs`, memory, CPU, pids (`workspaces/docker/src/sandbox/index.ts:176-202,307-315`). Swapping it into our host entry is size S. Network closed by default is not provided: the sandbox must reach github.com to clone and push (`factory/src/integrations/github/sandbox.ts:958-968`), so "closed" needs our egress proxy network.
- Session sandboxes are retired, released or destroyed on terminal phases and idle unload (`factory/src/sandbox/session-retirement.ts`, `factory/src/session/session-unloader.ts`).

### Gates, approvals, notifications

- Consent model: a person's move into a working phase "arms" autonomy; events never do (`factory/src/rules/transition-service.ts:267-290`). Phases without `autoStart` produce proposed runs that wait for a person (attention routes, `factory/src/routes/attention*.ts`).
- Plan gate enforced in code: an agent cannot leave a phase with `exitTool: submit_plan` until the plan was approved (`factory/src/rules/transition-service.ts:708-730`; default board `factory/src/boards/work.ts:44-50`).
- Notifications: Slack and the in-app attention list. No phone push.

### Logs, traces, cost

- Full chat and tool transcript per session in the UI; audit events per card (`factory/src/tools/audit-events-tool.ts`); run audit (`factory/src/session/run-audit.ts`).
- Health metrics through `mastra.metrics`, off by default (`factory/README.md` "Health metrics"); Mastra observability/Studio for AI traces.
- No per-item cost view and no per-session cost limit (no budget/cost code in `factory/src`).

### Deployment, API, CLI

- Self-host as a Node process or container, Postgres + pgvector, optional Redis for multi-replica (https://factory.mastra.ai/deployment, `web/docker-compose.yml`). `npm create factory -- --no-platform` gives a project without platform services.
- Large HTTP API under `/web/factory/...` (`factory/README.md` documents board, phases, session-rows, activity endpoints with ETags and cursors); MCP server option (`factory/src/mcp/`, config `mcp`).
- Telemetry: PostHog `factory_web_activity` for users of the Mastra platform auth provider only; off with `MASTRA_TELEMETRY_DISABLED=true` (`factory/README.md` "Product telemetry").

## 4. Map against our spec

Legend: **R** ready, **C** configurable without code, **X(size)** needs a code change, **M** missing.

### The 9 stages

| Stage | Status | Notes |
|---|---|---|
| 1 Intake: Triage sizes S/M/L, R0–R2; Operator accepts | C + X(S) | Triage phase and skill exist (`work-seeds.ts:6-13`); sizing and risk are our skill text plus a structured output tool (S). Accept = person moves the card (arms autonomy). |
| 2 Spec: Interviewer, Operator approves | C + X(S) | Add a `specifying` working phase with our skill and an exit tool. Only `submit_plan` has built-in approval semantics (`define-board.ts:117-130`); a spec gate can reuse `submit_plan` with a spec document, or a resting `SpecReview` phase. |
| 3 Plan: Researcher for L, Planner, slices as sub-issues | C for plan + approval; X(L) for slices | Plan gate is ready. Sub-issues, blocked-by and a frontier scheduler do not exist (no sub-issue code in `factory/src`). |
| 4 Implement: fresh session per slice, parallel sandboxes, tests first | X(L) | Planning and Building share one session per card on purpose (`work.ts:43-44`). Parallel slices need child cards with their own sessions and branches merged into the item branch. |
| 5 CI outside sandbox, one AI reviewer of another family, JSON pass/fix/block | X(M) | Separate review seat exists, with only verdict tools and untrusted checkout (`define-board.ts:87-91`, `work.ts:59-70`). Verdict schema is `approve`/`request changes` only (`factory/src/rules/tools.ts:140-160`). No CI event gating: no check-run events, and the review skill is told CI cannot block (`factory-rereview/SKILL.md:77`). Reviewer model family needs per-phase model (M). |
| 6 Acceptance: Validator runs the app | X(M) | Building blocks: browser tools (local only, `web/.env.schema` FACTORY_BROWSER), sandbox port URLs (`factory_sandbox_port_url`). Needs a phase, skill and evidence tool. |
| 7 Merge by rules file, Operator gate, merge queue | X(M) | Human merges in GitHub; Factory reacts to `pullRequestMerged`. No rules-file auto-merge, no merge queue integration. |
| 8 Deploy and Watcher rollback | M | Nothing deploy-related. |
| 9 Weekly Retro | M (X(M) to add) | No schedules in Factory; `sdk` schedules live in one process only (`sdk/src/index.ts:1183-1186`). |

### The 4 parts

| Part | Status | Notes |
|---|---|---|
| O Orchestrator | X(M–L) | Board state machine with `nextPhases`, revision checks, consent, exit tools, rule groups, dispatcher with in-flight caps (`factory/src/rules/dispatcher.ts` 156 kB, `transition-service.ts` 41 kB). Missing our cross-cutting rules (below). |
| S Sandbox | X(M) | Docker class exists (S to wire). Token scoping and push-to-one-branch need changes in `factory/src/workspace.ts:898-930` and `factory/src/integrations/github/sandbox.ts` (M). |
| D Decision requests | R for web UI; M for phone push | Attention list, proposed runs, plan and tool approval cards, ask-user. Phone push: ntfy via a rule or Slack (S). |
| T Session traces | partial | Transcripts, audit, metrics. Item-numbered traces exist (sessions bound to cards). Six weekly metrics and cost per item: X(M). |

### The 15 states

Board phases are data, so the 15 states can be a custom board (`defineBoard`, `factory/src/boards/define-board.ts`; or stored via the UI, `factory/src/boards/stored-board.ts`). Mapping:

| Our state | Factory phase kind | Status |
|---|---|---|
| Triaging, Specifying, Planning, Implementing, Verifying | working (runner skill) | C |
| TriageReview, SpecReview, PlanReview, MergeReview, Blocked | resting | C |
| Live | working (Watcher) | C as a phase, M as behaviour |
| Done, Cancelled, RolledBack, ForHuman | terminal (ForHuman could be resting) | C |
| Label mirror `state:…` on GitHub | X(S) | A board event rule or tool-result rule writes labels; nothing built in. |
| Jira workflow status mirror | X(M) | Jira integration has no transition API (`factory/src/integrations/jira/api.ts`). |
| Guards: Verifying → Implementing on fix, → Blocked on block or rounds out, → Live for R0, → MergeReview for R1/R2 | X(M) | `nextPhases` only lists allowed targets; the agent picks among them (`factory_transition_work_item`, `factory/src/rules/tools.ts:92-130`). Deterministic routing needs a tool-result rule (`BoardToolRules`, `define-board.ts:36-38`) that moves the card from the verdict, and removing the move tool from those seats. |

### Cross-cutting rules

| Rule | Status | Notes |
|---|---|---|
| One shared limit of 3 fix rounds, then Blocked | X(S–M) | Only self-review counts rounds and parks every 3 (`SELF_REVIEW_ROUND_LIMIT = 3`, `factory/src/rules/types.ts:52`; `rules/tools.ts:325-327`). PR review rounds and CI reds are not counted. |
| Session time and cost limits count as failed round | X(M) | Goal `maxRuns` (20 for Building, `work.ts:52`; default 50, `sdk/src/goal-manager.ts:54`) and `maxSteps: 1000` (`sdk/src/index.ts:1170`) are turn counts, not time or money. |
| At most 3 items wait for the Operator | M → X(S) | Dispatcher caps concurrent runs (`web/src/mastra/index.ts:436-440`), not waiting items. |
| Pause the whole pipeline; cancel from any state | Cancel: R (person may move a card anywhere, `transition-service.ts:711-712`). Pause: M → X(S) | Old per-project automation switches were retired into board settings (`storage/domains/projects/base.ts:311-322`). |
| Code picks the next step from JSON, never prose | X(M) | Two places violate it: the Building goal judge decides done/continue from "the latest messages" (`factory/src/boards/work.ts:16-28`, `define-board.ts:103-111`), and agents choose transitions themselves. Transitions are structured tool calls bounded by `nextPhases` and revision, which is better than prose, but the choice is still the agent's. |

## 5. Extension points

1. **Own host project** (template `mastra-ai/softwarefactory-template`, `npm create factory`). Our `src/mastra/index.ts` chooses auth, storage, sandbox, integrations. This is supported and documented, not a fork.
2. **`MastraFactory` config** (`factory/src/factory.ts:272-480`): `boards` (code-defined boards), `includeDefaultBoards`, `skills` (inline skills), `tools` (app tools), `integrations` (custom `FactoryIntegration`), `dispatcher` caps, `disableBuiltinTools`, `mcp`, `scorers`, `metrics`.
3. **Board definition** (`defineBoard`): phases, runner skill, context (session seat), instructions, goal, `autoStart`/`autoStartWhen`, `exitTool`, phase tools, **tool-result rules** (`BoardToolRules`) and **per-board event rules** for GitHub, GitLab, Linear, Jira, incident.io (`define-board.ts:36-75`). Tool-result rules are where our "code routes on the verdict" logic goes.
4. **Skills**: SKILL.md per phase, editable per project in the UI.
5. **MCP**: Factory can expose an MCP server, and sessions get Mastra Connect tools (`factory/src/mcp/`).
6. **HTTP API**: card, board, session reads and writes, so an external service can drive parts (for example a merge-rules service).

Can our rules be added without forking? Most yes: states, gates, verdict routing (with a custom verdict tool via `tools` and a board tool-result rule), label mirror, cap of 3 and pause (as a dispatcher-facing check in a rule, if the rule API can veto runs, otherwise a small upstream PR), Validator and Retro phases, Docker sandbox, better-auth. Three need upstream code: per-phase model, session time/cost limits, sandbox token scoping and merge tool removal. Slices with a frontier are the largest piece and could live in our code using child cards (`parentBoardItemId`, `factory/README.md` "Work items and board items") plus our scheduler calling the API.

If we did fork: the files we would touch are among the hottest in the repo (`factory.ts` 142 kB, `rules/dispatcher.ts` 156 kB, `rules/transition-service.ts` 41 kB, `workspace.ts`, `integrations/github/*`), with ~270 commits a month landing upstream and a 0.x API. A fork would fall behind within weeks. Test coverage is high (test lines exceed source lines; `rules/dispatcher.test.ts` alone is 412 kB), so upstream PRs are reviewable.

Would upstream accept our changes? Plausibly for generic ones: per-phase model on `BoardPhaseRunner`, session time/cost limits, a block verdict, a global pause, branch-scoped push and an opt-out for the merge tool. The team already thinks in this direction (review seat isolation, consent model, untrusted-checkout rules). Unlikely for our-specific ones (15 states, Watcher, Retro): keep those in our project.

## 6. Quality and risks

- **Language**: TypeScript, Node ≥ 22.19 (`factory/package.json` engines). Matches the TypeScript option in the earlier report.
- **Bus factor**: ~5 active humans on backend, 1 dominant on UI, plus Factory's own bot. Company-backed. Maintainers respond fast (issues filed by the hundreds per month).
- **License**: Apache-2.0; nothing of Factory is under `ee/`. OK for employer repos.
- **Telemetry**: PostHog only with Mastra platform auth; switch off with `MASTRA_TELEMETRY_DISABLED=true`.
- **Security (main risk)**:
  - The sandbox gets `GH_TOKEN` (installation token, 30-minute refresh, `factory/src/workspace.ts:82-84`) with `contents: write`, `issues: write`, `pull_requests: write` on every environment repository (`factory/src/integrations/platform/github/integration.ts:242-249`; the self-managed App is set up with the same grants, `web/README.md` "Configure local onboarding manually"). With `gh` in the sandbox the agent can push to any unprotected branch and merge PRs.
  - Host-side `source_control_merge_change_request` is offered to every bound session with no approval flag (`factory/src/session/source-control-tools.ts:731-748`). "Never merge" is only skill prose (`factory-gitlab-review/SKILL.md:10`).
  - Mitigations without forking: GitHub rulesets on `main` that require a PR approval the App cannot give itself, and no App on the bypass list (S). Real fix (push proxy per branch, no merge credentials in the sandbox, merge tool filtered by seat) is an upstream change (M).
  - Good: host secrets are kept out of local sandboxes by an env allow-list (`web/src/mastra/index.ts:281-309`); review seat never trusts the checkout's instruction files (`define-board.ts:87-91`).
- **Stability**: alpha 0.x, frequent migrations and deprecations (see section 1). Pin versions and upgrade on a schedule.

## 7. Verdict

**Score: 6/10** as the base we extend.

### What we reuse unchanged

Web UI (board, card/session view, approvals, settings, skills editor), projects and multi-repo environments, GitHub App and GitLab integrations, Jira and Linear intake, org-scoped multi-user, encrypted credentials, model router incl. Claude Max and Codex subscriptions, board engine (phases, `nextPhases`, revisions, consent, exit tools, rule groups), dispatcher, review seat isolation, audit and metrics, Postgres storage, Slack, the Docker sandbox class.

### Ordered changes to fit our spec

1. Own host project: better-auth, Postgres, `DockerFactorySandbox`, telemetry off. **S** (plus a day of verification).
2. GitHub rulesets on every repo: protect `main`, require a human approval the App cannot give, no bypass for the App. **S**.
3. Our 15-state board as code with skills for Triage, Interviewer, Planner, Implementer, Reviewer, Validator; label mirror via tool-result and event rules. **M**.
4. Structured verdict tool (`pass | fix | block` JSON) as an app tool, and a board tool-result rule that routes from it; remove `factory_transition_work_item` from Verifying seats. **M**.
5. One shared fix-round counter in card metadata (review, CI, Validator), Blocked at 3. **S**.
6. CI gating: subscribe to check runs (polling or a small integration) and route reds into a fix round. **M**.
7. Replace the Building goal judge: our build phase without `goal`, ending on a structured "done" tool with tests run, or a code check of pushed head plus green CI. **S–M**.
8. Global pause and cap of 3 waiting items (in our rules if they can veto starts, otherwise an upstream PR in the dispatcher). **S–M**.
9. Upstream PR: per-phase model on `BoardPhaseRunner` (reviewer of another family). **M**.
10. Upstream PR: session time and cost limits that end a run as failed. **M**.
11. Upstream PR or our wrapper: branch-scoped push proxy and no merge tool or write token in Implementer/Reviewer sandboxes. **M** (L if upstream refuses and we carry a patch).
12. Slices: child cards per slice, frontier scheduler, merge into the item branch. **L**.
13. Jira status and label write-back adapter. **M**.
14. Merge rules file (R0) + merge queue service with its own credentials. **M**.
15. Deploy Watcher phase and weekly Retro (scheduled job outside the single-process `sdk` schedules) and the six-metric summary. **M** each.
16. Phone push via ntfy from attention events. **S**.

### Fork or extend

Extend upstream through our own Factory project, pin a version, and send the generic pieces (items 9–11, maybe 8) as PRs. Do not fork: the core files churn too fast and the codebase plus Mastra core is far beyond what one person can track.

### Where I disagree with the earlier report

The earlier report scored Mastra Factory O 2, S 1, D 1, T 2 (`research/atlas/research/2026-11-engine-choice.md:135`) and weighed only gaps against our rules.

- **D should be 2, not 1, under the new constraints.** D is now "the engine's web UI plus phone push". Factory's UI already has an attention list, proposed-run approvals, plan approval and ask-user cards (`factory-ui/src/ui/router.tsx:271-383`, `factory/src/routes/attention*.ts`). Only the push and our cap are missing.
- **S stays 1 out of the box, but the path to 2–3 is cheaper than the report implied.** A Docker sandbox class already exists in the same monorepo (`workspaces/docker/src/factory-sandbox.ts`), and rulesets are a same-day mitigation. The token and merge-tool finding stands (confirmed: `integration.ts:242-249`, `source-control-tools.ts:731-748`).
- **"WorkOS auth" as a self-hosting requirement is wrong.** The auth seam takes any org-capable provider and names better-auth (`factory/src/auth.ts:42-47`); better-auth registers organizations (`auth/better-auth/src/index.ts:314`). Only the stock host entry wires WorkOS.
- **"LLM judges the next step from prose" is half right.** True for the Building goal judge (`work.ts:16-28`). But transitions are structured tool calls checked against `nextPhases`, revision and exit-tool approval (`transition-service.ts:708-730`), and the plan gate is enforced in code. Replacing the judge is a board config change (drop `goal`), not a fork.
- **"Sandboxes persist"**: sessions do keep a sandbox across Planning and Building by design (`work.ts:43-44`), but sandboxes are retired, released and destroyed on terminal phases and idle unload (`factory/src/sandbox/session-retirement.ts`). For "one fresh session per slice" we would give each slice its own card and context, which the board model supports.
- **What the old weighting missed**: building our own Orchestrator on Temporal leaves the whole product surface to us: UI, auth, projects, git provider apps, intake from four trackers, secrets, skills editing, audit, run views. Here that surface is ~180k lines of tested TypeScript we would not write. Against that, our unique rules (sections 4 and 7) are perhaps 4–8 weeks of work inside Factory's seams. That trade favours extending Factory, provided we accept Mastra's churn and its single agent runtime (no Claude Code or Codex CLI as the session engine).
