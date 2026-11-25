# Commercial and hosted platforms for agentic software delivery: scan against M1–M10, S1–S7

Compiled 2026-11-26. The yardstick is `research/atlas/research/2026-11-platform-requirements.md`. Scores: 0 = absent, 1 = possible with substantial work of ours, 2 = present with gaps, 3 = present as needed. Every nonzero score cites the primary source it rests on. Sources were read on 2026-11-25 or 2026-11-26 (marked R25 or R26). "Vendor claim" means marketing or a product page with no supporting reference documentation. "Not documented" means I found no primary source. That is evidence of absence only to that extent.

## Bottom line first

- **No commercial product meets every "must" as shipped.** The Operator believes a product exists with a rich decision card, our own workflows and many repositories. I did not find one. Every candidate fails or half-meets M3, and most also fail M1 (routing decided by code) or M10 (definitions in our repository).
- **No vendor lets us design the decision card itself.** We cannot set its content blocks, put options with their effects on it, show a recommendation with confidence, or take a free-text "other". The closest things on the market:
  - **Factory's Task card.** It has a Plan view (change, risk, validation, rollback, who approved), the recommended option as the main button, other choices, and a required note. Factory fixes it for its own CVE-remediation product, which is in private preview.
  - **Linear's agent elicitation.** It is a Markdown body plus a `select` signal with options, accepts a free-text reply and records the user who answered. It is a tracker surface, not an engine.
  - **GitHub check runs.** A Markdown summary of up to 65,535 characters plus up to three action buttons that fire a webhook to our app.
  - **AWS Transform.** It has Approvals and "interactive forms", but only for migration work.
- **The realistic paths are two compositions, built in our repository.**
  - **(a) Warp Factories** for definitions, workers and gates, with gates surfaced in Linear.
  - **(b) GitHub Agentic Workflows and Actions** as the engine. The card is an issue comment, which renders Mermaid, tables and `<details>`, plus a check run or Linear elicitation for the answer.

## Candidate by candidate

### 1. Warp Factories (Oz platform), Warp

**What it is:** A hosted "software factory". A foreman agent coordinates worker agents through a Blueprint of stages, gates and transitions. A team can host the definition files in its own GitHub repository.

**How a decision reaches the human:**
- A gate "pauses a stage for a person's answer". It has a `prompt` (the question), `outputs` (the acceptable answers, as prose) and an optional `when`.
- You "answer a gate in the original conversation with the foreman". That conversation is in Slack or Linear (through the @-handle). Requests for input also appear in the factory inbox, and runs show on the Runs page.
- The gate UI and its format (Markdown, buttons) are not documented. We shape the card only through the gate prompt and the worker's message. No UI extension point is documented.

**Whose workflow:** Ours. `factory.yaml`, `workers/<name>/worker.md`, `automations/<name>/automation.md`, `skills/`, `scorers/` and `benchmarks/` live in our repository, and "Merges to the production branch (`main` by default) update the factory". Transitions and gate conditions are prose that the worker evaluates, not code. Stage `inputs` and `outputs` are "not typed schemas".

**Multi-repo:** A factory groups the repositories that ship together. **Self-hosting:** Only "managed self-hosting" of execution, on the Enterprise plan. The control plane stays with Warp. **Price:** Runs draw on shared team funding. Exact prices not read.

| # | Score | Evidence (all R26) |
|---|---|---|
| M1 | 2 | Stages, gates and transitions are in our repo, but conditions are prose evaluated by an agent, and no round limit is documented. https://docs.warp.dev/factories/blueprints/ , https://docs.warp.dev/factories/factory-as-code/ |
| M2 | 2 | Each worker has its own prompt, model, harness (`oz`, `claude`, `codex`, `pi`), tools and skills, so several model families are possible. Time, silence and cost limits are not documented. https://docs.warp.dev/factories/factory-agents/configuration/ |
| M3 | 1 | A gate with a prompt and prose answers, answered in the foreman conversation (Slack, Linear or inbox). No card format and no UI extension. https://docs.warp.dev/factories/blueprints/ , https://docs.warp.dev/factories/factory-agents/ |
| M4 | 2 | One factory per group of repositories that ship together. A PR in each repo is not spelled out. https://docs.warp.dev/_llms-txt/factories.txt |
| M5 | 2 | Linear (`issue_labeled`, `comment_created`, `agent_session_created`), Jira and GitHub are work sources. Trust by author is not documented. Same source |
| M6 | 2 | PRs are opened, but "Workflow policy does not grant merge access", so merge stays with branch protection. Same source |
| M7 | 2 | Cloud sandboxes, secrets referenced by name, managed self-hosted workers. https://docs.warp.dev/platform/overview.md |
| M8 | 2 | "An unanswered gate keeps its stage open". Runs keep the Blueprint version they started on. A cap on waiting items is not documented. https://docs.warp.dev/factories/blueprints/ |
| M9 | 2 | Team dashboard and inbox. Who answered a gate, and whether that is checked, is not documented. https://docs.warp.dev/factories/factory-agents/ |
| M10 | 3 | The definition lives in our repo and the platform upgrades on its own. https://docs.warp.dev/factories/factory-as-code/ |
| S1 | 3 | Schedules, webhooks, factory endpoints, and Linear/GitHub events with filters. https://docs.warp.dev/_llms-txt/factories.txt |
| S2 | 2 | Run records with transcripts and outputs. Cost per role is not documented. https://docs.warp.dev/platform/overview.md |
| S3 | 1 | "verify, ship, and monitor" appear in the loop diagram. No deploy hooks are documented. https://docs.warp.dev/_llms-txt/factories.txt |
| S4 | 2 | The foreman is a chat agent that relays questions. It is not separated from the Operator's signature. https://docs.warp.dev/factories/factory-agents/ |
| S5 | 2 | Slack threads show progress, plus the inbox. https://docs.warp.dev/_llms-txt/factories.txt |
| S6 | 1 | Scorers and benchmarks exist. No stub-verdict harness. https://docs.warp.dev/factories/factory-as-code/ |
| S7 | 1 | Managed self-hosted execution only, on the Enterprise plan. Proprietary. https://docs.warp.dev/platform/overview.md |

**Fit:** This is the closest product in shape to our pipeline. The schema is `v1alpha1`, so expect churn.

### 2. GitHub: Copilot coding agent, custom agents, Agentic Workflows (gh-aw), Actions and Mission Control

**What it is:**
- The Copilot coding agent turns an issue into a PR.
- Custom agents are `.github/agents/*.md` files with frontmatter: `model`, `tools`, `mcp-servers`.
- GitHub Agentic Workflows (gh-aw, open source from GitHub Next) are Markdown workflows compiled to Actions YAML, with safe outputs, threat detection and a choice of engine. GitHub announced them as generally available on 2026-10-28.
- Mission Control is a fleet view across github.com, VS Code, mobile and the CLI.

**How a decision reaches the human:** There is no decision card. The pieces we can build one from:
- **Issue and PR comments** render GFM, including Mermaid, GeoJSON and STL diagrams, tables and `<details>`. Mermaid in issues and PRs is documented. That covers the rich content.
- **A check run** carries a Markdown `summary` and `text` (65,535 characters each), images, and up to three `actions` buttons (label of 20 characters at most). A click fires `check_run.requested_action` to our app. That covers options on the same card, but only on a PR or commit, with three options at most and no free text.
- **Environments with required reviewers** give an Approve or Reject gate on the run page, recording the reviewer.

The card format is ours, because we write the Markdown. The answer controls are GitHub's.

**Whose workflow:** Ours. Workflows and agents are files in our repository. Deterministic Actions jobs (`if:`, custom `safe-outputs.jobs`) let code decide the next step from a JSON verdict.

**Multi-repo:** Many repositories in an org. The GA release notes mention "enclaves for cross-repository workflows". A PR per repository goes through safe outputs or our own job.

**Self-hosting:** Self-hosted ARC runners are supported. gh-aw on GitHub Enterprise Server is not confirmed.

**Price:** The default Copilot engine needs a Copilot licence. gh-aw spend is metered in AI credits (`max-ai-credits`, `gh aw forecast`). Actions minutes are billed as usual.

| # | Score | Evidence |
|---|---|---|
| M1 | 2 | Workflows in our repo, compiled to Actions. Code routing through `if:` and custom safe-output jobs. Our states and round limit would be ours to write. https://github.github.com/gh-aw/reference/frontmatter/ (R26), https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available (R26) |
| M2 | 2 | Per workflow: `engine` (Copilot, Claude or Codex harness), `model` or router, `timeout-minutes`, `max-turns`, `max-ai-credits`. Custom agents carry `model`. Silence limit not present. https://github.github.com/gh-aw/reference/frontmatter/ (R26), https://docs.github.com/en/copilot/reference/custom-agents-configuration (R26) |
| M3 | 1 | Rich content in issue comments (Mermaid, tables). Options only as check-run buttons (3 at most, PR only) or environment approval. No free text "other" on the card. https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams (R26), https://docs.github.com/en/rest/checks/runs (R26) |
| M4 | 2 | Org-wide. Cross-repository enclaves mentioned at GA. https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available (R26) |
| M5 | 2 | GitHub Issues natively (labels, comments). Jira only through MCP or our own job. `user-rate-limit` with `ignored-roles` exists; a full trust-by-author check is ours to write. https://github.github.com/gh-aw/reference/frontmatter/ (R26) |
| M6 | 3 | Native PRs, CI checks, branch protection. Agents are read-only by default and write only through safe outputs. https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available (R26) |
| M7 | 3 | Sandboxed container behind the Agent Workflow Firewall, micro-VM isolation, read-only by default. Same source |
| M8 | 2 | Job timeouts of 60 minutes by default, so long waits must be stored as issue labels or state and resumed by events. An environment wait timer goes up to 43,200 minutes (30 days). https://docs.github.com/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment (R26) |
| M9 | 3 | GitHub users and roles. An environment approval records the reviewer, with up to six reviewers. Same source |
| M10 | 3 | Everything is files in our repo, and the platform upgrades without merges from us. https://github.github.com/gh-aw/reference/frontmatter/ (R26) |
| S1 | 3 | Actions `on:` triggers, schedules, `workflow_dispatch`. Same |
| S2 | 2 | Actions logs and AI-credit forecast. Per-role cost is not documented. https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available (R26) |
| S3 | 3 | Environments, deployments and protection rules. https://docs.github.com/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment (R26) |
| S4 | 1 | Copilot Chat and Mission Control exist. A Supervisor separated from the Operator's signature would be ours to build. https://github.blog/ai-and-ml/github-copilot/how-to-orchestrate-agents-using-mission-control/ (search summary, R25, vendor blog) |
| S5 | 2 | GitHub notifications and the mobile app. Not read in detail. |
| S6 | 1 | Ours to build (`workflow_dispatch` with stub inputs). |
| S7 | 1 | ARC self-hosted runners. github.com hosts the control plane; GHES support for gh-aw is unknown. https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available (R26) |

**Gap and caveats:** The plan caveat is real: required reviewers on private repositories need Enterprise (same environments doc). The gh-aw docs still say "early development" on some pages.

### 3. GitLab Duo Agent Platform: custom flows

**What it is:** YAML flows (`AgentComponent`, `routers` with `from` and `to`, `entry_point`) triggered by mention, assign, MR, work-item and pipeline events, and run by a service account.

**How a decision reaches the human:** The VS Code flow builder has a Human Input component that "pauses the flow and waits for user input or approval". `require_tool_approval` exists in the v1 registry. An open epic proposes a human-in-the-loop approval node, so it is not shipped. GitLab Markdown renders Mermaid. The card is not shapeable beyond a comment.

**Whose workflow:** Ours in YAML, but stored in the project or the AI Catalog, not clearly as repository files. **Multi-repo:** A flow can be enabled in up to 100 projects. **Self-hosting:** Self-Managed and Dedicated are supported. **Price:** GitLab Credits on GitLab.com.

| # | Score | Evidence |
|---|---|---|
| M1 | 1 | Routers exist, but conditional routing is not documented. GA in 19.2. https://docs.gitlab.com/user/duo_agent_platform/flows/custom_flows_schema/ (R25) |
| M2 | 1 | "The `model` field inside a `prompts` entry is not supported." The model comes from group or instance settings. Same |
| M3 | 1 | Human Input component in the VS Code builder only. https://docs.gitlab.com/user/duo_agent_platform/flows/custom/ (R25) |
| M4 | 2 | Up to 100 projects per enable. One item across repositories is not documented. Same |
| M5 | 1 | GitLab work items natively. Jira and GitHub Issues not documented. Same |
| M6 | 2 | GitLab MRs and pipelines only. We would have to move off GitHub. Same |
| M7 | 2 | `coding_environment` full or none; a token with scope `ai_workflows`. https://docs.gitlab.com/user/duo_agent_platform/flows/custom_flows_schema/ (R25) |
| M8 | 1 | Durability across long waits is not documented. |
| M9 | 3 | GitLab users and roles; Maintainer or Owner creates flows. https://docs.gitlab.com/user/duo_agent_platform/flows/custom/ (R25) |
| M10 | 2 | YAML is ours, but managed in the GitLab UI or catalog. Same |
| S1 | 3 | Event triggers. https://docs.gitlab.com/user/duo_agent_platform/flows/custom_flows_schema/ (R25) |
| S7 | 3 | Self-Managed and Dedicated (paid tiers). https://docs.gitlab.com/user/duo_agent_platform/flows/custom/ (R25) |

S2–S6 were not verified.

### 4. Linear (agent sessions, "Linear for Agents")

**What it is:** Not an engine. It is the agent interaction surface of the tracker. Agents post activities (`thought`, `elicitation`, `action`, `response`, `error`), a plan, and `externalUrls` (for example, our PR links).

**How a decision reaches the human:**
- An elicitation has a Markdown body.
- The `select` signal shows options (`label`, `value`). "A free-text reply dismisses the elicitation", and either answer comes back as a `prompt` activity with the user attached.
- The Linear editor supports tables, Mermaid (`/diagram`) and collapsible sections. I did not verify whether agent activity bodies render Mermaid and toggles.
- The session states include `awaitingInput`.

We shape the content. The option controls are Linear's. This is the best card surface found, and it is native to a tracker.

**Whose workflow:** Ours (Linear does not run workflows). **Multi-repo:** `issueRepositorySuggestions` ranks repositories with confidence. **Self-hosting:** None.

| # | Score | Evidence |
|---|---|---|
| M3 | 2 | Markdown body, select options, free-text reply, answering user recorded. Charts would need images. Same-card effects text is ours to write. https://linear.app/developers/agent-interaction (R25), https://linear.app/developers/agent-signals (R25), https://linear.app/docs/editor (search summary, R26) |
| M5 | 2 | Linear as intake and mirror (webhooks `created` and `prompted`, with a 5-second acknowledgement and a 10-second first activity). Only Linear, not Jira or GitHub Issues. https://linear.app/developers/agent-interaction (R25) |
| M9 | 2 | Linear users answer; the user is recorded on the prompt activity. Same |

Every other must is 0 (it is not an engine). Use it as the card layer for candidate 1 or 2.

### 5. Factory (Droids, Factory app, Missions, Workstreams, Automations)

**What it is:** Droid agents in a CLI, desktop app, web app and headless `droid exec`. Missions have a per-role model: `missionOrchestratorModel`, `workerModel`, `validationWorkerModel`. Workstreams have an orchestrator and agents. Automations run on a schedule, Slack, GitHub or a webhook. Custom droids live in `.factory/droids/`.

**How a decision reaches the human:** The best card found, but vendor-defined and only for CVE remediation (private preview).
- A task sits under "Waiting on you" with the status "Plan needs approval".
- The Plan view covers the change, breaking changes, risk, validation, rollback, revision and approver.
- The bottom bar has "Approve plan" (the recommended main action) and "Request changes" (a note is required).
- "Other choices", "Close as…" and "Continue in chat" are also on the card.
- Every action carries the task version the user saw, so it is not applied twice.

Custom automations can write `reports/`, `memory/` and a `VISUAL.html` dashboard, but have no answer controls. We cannot define our own task types.

**Whose workflow:** The vendor's (missions, workstreams, tasks). Ours only through droids, hooks and automations. **Multi-repo:** Environments clone repositories; a CVE task is opened per repository. **Self-hosting:** Factory Private (sandboxes in our VPC, control plane hosted by Factory, private preview), an airgapped option, and Custom Deployment by contact. **Price:** Organization plans, not read.

| # | Score | Evidence (R26) |
|---|---|---|
| M1 | 1 | Missions and workstreams are fixed. Our workflow would be our own orchestrator over `droid exec`. https://docs.factory.com/workstreams/overview.md , https://docs.factory.com/droid-exec/overview.md |
| M2 | 2 | Per-role models in missions; custom droids with their own prompts. https://docs.factory.com/missions/reference.md , https://docs.factory.ai/cli/configuration/custom-droids |
| M3 | 1 | A rich task card exists but is fixed to CVE remediation. https://docs.factory.com/workstreams/tasks.md |
| M4 | 2 | Per-repository tasks; environments clone repositories. Same, plus https://docs.factory.com/enterprise/network-and-deployment.md |
| M5 | 2 | Linear, Jira and Slack delegations. Trust by author not documented. https://docs.factory.com/llms.txt (index) |
| M6 | 2 | PRs; "Factory doesn't enforce plan or merge approval", so it relies on branch protection. https://docs.factory.com/workstreams/tasks.md |
| M7 | 2 | Droid Computers and OpenCompute sandboxes. https://docs.factory.com/enterprise/network-and-deployment.md |
| M8 | 1 | Not documented for our own flows. |
| M9 | 2 | Organization, Workstream Access, session privacy. https://docs.factory.com/workstreams/overview.md |
| M10 | 1 | Droids, hooks and GitHub automations live in our repo. Workstreams, tasks and the UI do not. https://docs.factory.com/automations/custom.md |
| S1 | 3 | Schedule, Slack, GitHub, webhook triggers. https://docs.factory.com/automations/custom.md |
| S7 | 1 | Factory Private and airgapped by contact; proprietary. https://docs.factory.com/enterprise/network-and-deployment.md |

### 6. Cognition Devin (and Windsurf)

**What it is:** An autonomous engineer, with web sessions plus the v3 API. `SessionCreateRequest` has `playbook_id`, `structured_output_schema` (JSON Schema Draft 7, "Max 64KB"), `structured_output_required`, `repos[]`, `max_acu_limit`, `devin_mode`, `child_playbook_id`, `bypass_approval` and `resumable`. The response includes `structured_output`, `pull_requests[]` and `child_session_ids`.

**How a decision reaches the human:** Through the Devin session chat. No card that we can shape was documented.

**Whose workflow:** The vendor's, unless our own orchestrator drives the API. That fits well, because a JSON verdict per session feeds our code. **Multi-repo:** `repos[]` per session. **Self-hosting:** None. Customer Dedicated is a single-tenant VPC that Cognition hosts, and the "brain" always stays in Cognition's cloud. **Price:** Subscription tiers since April 2026 per secondary sources; ACU or API pricing beyond that. Not read on the official page.

| # | Score | Evidence (R26) |
|---|---|---|
| M1 | 1 | Our orchestrator plus structured output. https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions.md |
| M2 | 2 | A playbook per role, `devin_mode`, `max_acu_limit`. Cognition's model families only. Same |
| M3 | 0 | No shapeable card documented. |
| M4 | 3 | `repos[]`, and `pull_requests[]` in the response. Same |
| M7 | 3 | An isolated Devbox per session. https://docs.devin.ai/enterprise/deployment/overview.md |
| M8 | 2 | `resumable`, `suspended` and `resuming` statuses. https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions.md |
| S1 | 2 | Schedules API. https://docs.devin.ai/_llms/en/api.txt |
| S7 | 0 | No self-hosting. https://docs.devin.ai/enterprise/deployment/overview.md |

**Fit:** A strong worker behind our engine, not a platform.

### 7. Cursor (Cloud Agents, Automations, Bugbot; owns Graphite)

**What it is:** Cloud agents on isolated VMs, started from desktop, web, iOS, Slack, Linear, GitHub or the API (v1 public beta). Automations run on a schedule or on events from Git hosts, Slack, webhooks, Linear, Sentry or PagerDuty. Environments are set in `.cursor/environment.json` and hooks in `.cursor/hooks.json`.

**How a decision reaches the human:** PRs "with artifacts" (screenshots, logs), steering in Slack, Teams, Jira, Linear or GitHub, and a shared agent URL. No gate card.

**Whose workflow:** The vendor's; automations are created in the UI or with Terraform (`cursor_platform_workflow`). **Multi-repo:** Multi-repo environments, but long-running mode is not available for them. **Self-hosting:** "Self-Hosted Machines" for tool execution. **Price:** Usage at the selected model's rate, with a spend limit.

| # | Score | Evidence (R26) |
|---|---|---|
| M1 | 1 | Our orchestrator over the API. https://cursor.com/docs/cloud-agent |
| M2 | 2 | A "curated selection of models" from several families. Per-role limits are ours. Same |
| M3 | 0 | No gate card. Same |
| M4 | 3 | Multi-repo environments; PRs in every repo changed. https://cursor.com/docs/cloud-agent , https://cursor.com/docs/automations |
| M7 | 3 | Isolated VMs, restricted outbound domains, secrets. https://cursor.com/docs/cloud-agent |
| S1 | 3 | Automation triggers. https://cursor.com/docs/automations |
| S7 | 1 | Self-hosted machines; control plane stays with Cursor. https://cursor.com/docs/cloud-agent |

Graphite was acquired by Cursor in December 2025 according to a secondary source (research.contrary.com, R26). Graphite Agent, formerly Diamond, is a reviewer, not a workflow engine.

### 8. Anthropic: Claude Managed Agents, and Claude Code on the web with scheduled tasks

**What it is:**
- **Managed Agents** (beta header `managed-agents-2026-04-01`): agents (model, system prompt, tools, MCP, skills), environments (cloud or self-hosted sandbox), durable sessions ("resume cleanly after pauses"), an event stream, multiagent coordination, outcomes and scheduled deployments. A self-hosted version of the whole service exists.
- **Claude Code scheduled tasks**, formerly routines (research preview): a prompt, repositories and connectors, triggered by schedule, API or GitHub events.

**How a decision reaches the human:** Through events in our own application. There is no UI, so the card is entirely ours to build.

**Whose workflow:** Ours, in our own code. **Multi-repo:** Several repositories per scheduled task. **Self-hosting:** Self-hosted sandboxes and a self-hosted service. **Price:** Token rates plus $0.08 per session-hour (launch blog, vendor).

| # | Score | Evidence (R26) |
|---|---|---|
| M1 | 1 | Ours to build. https://platform.claude.com/docs/en/managed-agents/overview.md |
| M2 | 1 | Per-agent prompt, model and skills, but Claude models only. A reviewer from another family must come from elsewhere. Same |
| M3 | 0 | No UI. Same |
| M7 | 3 | Cloud or self-hosted sandbox; web allowlists. Same |
| M8 | 2 | Stateful sessions resume. Waits at a gate are ours. Same |
| S1 | 2 | Scheduled deployments; triggers on scheduled tasks. Same, plus https://code.claude.com/docs/en/routines.md |
| S7 | 2 | Self-hosted Managed Agents service; proprietary licence. https://platform.claude.com/docs/en/managed-agents/overview.md |

**Fit:** A component, not a platform.

### 9. OpenAI Codex cloud

Cloud tasks run in per-repository environments, started from the web, desktop, mobile, CLI, GitHub, Linear or Slack. A TypeScript SDK was announced at GA (2025). The human checkpoint is reviewing the diff, then committing or opening a PR. There are no gates, no workflows of ours, no self-hosting, and it comes with ChatGPT plans.

Scores: M1 1 (SDK), M3 0, M7 2 (isolated environments, restricted internet). Sources: https://learn.chatgpt.com/docs/cloud.md (R26) and https://openai.com/index/codex-now-generally-available (search summary, R26). **Out.**

### 10. Atlassian Rovo Dev / Jira Coding Agent

A Rovo Dev section on a Jira work item starts a session that opens a draft PR on Bitbucket Cloud or GitHub Cloud and never merges. It can be invoked from Jira automation rules. I found no documented plan-approval gate. Usage-based "Rovo credits" are billed from 2026-12-03.

Scores: M1 1 (Jira workflows and automation rules, configured in Jira, not our repo), M3 1 (Jira rich text; no gate card found), M5 3 for Jira, M10 0. Sources: https://support.atlassian.com/rovo/docs/work-with-rovo-dev-in-automations/ (search summary, R26) and https://www.atlassian.com/blog/company-news/expanded-usage-based-pricing (search summary, R26). **Out** (M10).

### 11. Google Jules and Antigravity

**Jules API (v1alpha):** `requirePlanApproval`, `approvePlan` and `automationMode: AUTO_CREATE_PR`. A plan approval is the only gate. Score M3 1, M1 1. Source: https://developers.google.com/jules/api/reference/rest/v1alpha/sessions (search summary, R26).

**Antigravity:** A desktop IDE and CLI with an agent manager. It has a review pane for rich artifacts (plans, screenshots, recordings), comments on artifacts and diffs, and a "Request Review" policy. The review experience is good, but it runs locally per developer: M9 0, M1 0. Source: https://www.antigravity.google/docs/artifacts (search summary, R26).

**Both out.**

### 12. AWS Kiro and AWS Transform

**Kiro autonomous agent (Kiro Web):**
- A session spans several GitHub and GitLab repositories, with a PR or MR in each.
- It is triggered by a `kiro` label or `/kiro`, or by schedules (up to 5).
- Spec mode needs approval of the requirements, design and tasks. Autonomous mode has no intermediate approvals and uses "Needs attention" for questions.
- It has sandboxes and is billed in credits.

Scores: M4 3, M7 3, M3 1, M1 0 (fixed modes; `.kiro/` steering and hooks only). Source: https://kiro.dev/autonomous-agent (R26). **Out.**

**AWS Transform:**
- Job plans show Chat, Approvals, Artifact store and Worklog.
- Administrators approve human-in-the-loop actions such as a merge to main or a deploy.
- The Agent Builder Toolkit lets custom agents "present interactive forms". I could not read the blog body, so this is unverified.

It is scoped to migration and modernisation. Score M3 2 for its own domain, M1 0 for our SDLC. Sources: https://docs.aws.amazon.com/transform/latest/userguide/transform-environment.html (search summary, R26) and https://aws.amazon.com/blogs/migration-and-modernization/simplify-how-you-build-and-publish-custom-agents-with-aws-transform-agent-builder-toolkit/ (body not readable). **Out**, but its form mechanism is worth a look if it ever generalises.

### 13. Augment Cosmos (Remote Agents)

Experts are reusable agent templates (instructions, system prompt, model, environment, capabilities, triggers). Environments bundle several repositories. Automations take GitHub, Linear, Slack, PagerDuty, cron or webhooks. Sessions are shared on the web, mobile and Slack. No approval gate is documented. It was in public preview as of May 2026 (secondary source).

Scores: M2 2, M4 2, S1 3, M1 1, M3 0, M10 0 (defined in the web app). Source: https://docs.augmentcode.com/cosmos/ (R26). **Out.**

### 14. Sourcegraph Amp

Custom agents and subagents come through plugins. Orbs are cloud sandboxes, set up by `.agents/setup` and `.agents/resume` in our repo, and Agent to Agent starts agents in their own orbs. There are no gates or decision UI. Pricing is disputed across secondary sources.

Scores: M2 2, M7 3, M10 2 (plugins and scripts in our repo), M1 1, M3 0. Sources: https://ampcode.com/docs/models-and-subagents and https://ampcode.com/manual/orbs (search summaries, R26). **Out.**

### 15. Tembo, and Tembo Agent Studio

**Tembo (hosted):** Background coding agents (Claude Code, Codex and others) in sandboxed VMs. Automations run on a schedule, a webhook, @Tembo, or GitHub, Linear, Sentry or Slack events. It works with Jira and Linear and has a public API. "nothing ships without your approval" is a vendor claim about PR review. Scores: M1 1, M2 2 (several agent families), M3 0. Source: https://docs.tembo.io/llms.txt (search summary, R26).

**Tembo Agent Studio (MIT, self-hosted):**
- Agent specs live in our GitHub repo, and edits arrive as PRs.
- It has a Tasks Inbox where a person reviews, edits and approves an action before the agent acts, plus roles and an audit log.
- It targets general agents (Pydantic AgentSpec), not SDLC stages.
- It has 1 GitHub star and was last pushed 2026-11-21 (`gh api repos/tembo/agent-studio`, R26).

Scores: M10 3, M9 2, M3 1, M1 1. **Immature**, but it is the only product found with "definitions in Git, approvals in an inbox, self-hosted".

### 16. Zencoder Zenflow

Custom workflows are `.md` files in `.zenflow/workflows/` in our repository, with steps we define and an agent per step. A `verification_script` lives in `.zenflow/settings.json`. The docs returned HTTP 403, so this rests on search summaries of https://docs.zencoder.ai/zenflow/workflows/custom (R26). The decision surface, server or team mode, and gates are unverified, and "multi-agent verification" is a vendor claim.

Provisional scores: M1 2 and M10 2 if the summaries hold; M3 and M9 unknown. **Worth a hands-on check.**

### 17. Qodo

Agents are TOML files (instructions, MCP, an output schema, exit expressions for CI) run as `qodo <command>`. PR review is configured in `.pr_agent.toml`.

Scores: M1 1 (a JSON output schema helps code routing), M3 0. Source: https://docs.qodo.ai/qodo-command/features/creating-and-managing-agents (search summary, R26). **Out.**

### 18. JetBrains Air, Junie and Air Teams

Air (announced 2026-09-22) is a workspace for agents in IDEs, the browser and a CLI gateway (Claude Code, Codex, Copilot and others through ACP). "Air Teams coordinates workflows between developers and agents" is a vendor claim from a search summary. The blog page returned HTTP 403, so it is unverified. Air in IDEs is an EAP.

Scores: M3 0, M1 0 until verified. Source: https://blog.jetbrains.com/blog/2026/09/22/introducing-jetbrains-air/ (not readable). **Out pending verification.**

### 19. Others in the brief

- **Charlie Labs:** "Charlie is shutting down" (2026-09-20), available only until 2026-10-05. https://charlielabs.ai/blog (R26). **Out.**
- **CodeRabbit:** Review plus Issue Planner, which writes plans into Linear, Jira, GitLab, GitHub or Azure DevOps issues and hands prompts to a coding agent. It does not run workflows. https://docs.coderabbit.ai/issues/planner (search summary, R26). **Out.**
- **Sweep:** No current hosted workflow product found (R26). **Out.**
- **Replit:** An app-building agent, outside the delivery-pipeline scope. Not scored.
- **Graphite:** See Cursor.

## Ranking

### Candidates that pass every "must", or can with work in our repository

None passes as shipped. Two can reach every "must" with work kept in our repository, both by moving the decision card into a surface we fill with our own Markdown:

1. **GitHub Agentic Workflows, Actions and environments, with Copilot custom agents (and Linear elicitation or check runs for the answer).**
   - Every "must" is at least 1.
   - The weak points are M3 (1) and M8 (2).
   - Routing in code (M1) is possible because Actions jobs are deterministic.
   - The definitions are ours (M10 3), and identity and approver records are GitHub's (M9 3).
   - Work of ours: the card renderer (an issue comment with Mermaid, tables and `<details>`, a check run with three or fewer buttons, or a Linear `select` elicitation), the state machine stored in labels, the round limit, Jira intake, and the stub harness.
2. **Warp Factories, with gates surfaced in Linear.**
   - No "must" scores below 1.
   - The definitions are in our repo (M10 3), with multi-family workers (M2 2) and native gates.
   - Work of ours: deterministic routing has no native hook, so transitions are prose read by the agent. We would push verdicts into a stage whose worker only reads a JSON file, which still leaves an agent in the loop. We would also need a richer gate message format.
   - Ranked second because its M1 gap cannot be closed in our repo, only reduced.

### Near-misses and the single biggest gap of each

| Candidate | Single biggest gap |
|---|---|
| Factory | The rich decision card exists but is the vendor's, fixed to CVE tasks. Our own task types and workflows cannot be defined (M1, M10). |
| GitLab Duo custom flows | No model per component (M2), so the reviewer cannot be another family than the implementer. |
| Devin | No decision surface at all (M3 0), and no self-hosting. It is good as a worker behind our engine. |
| Cursor cloud agents and automations | No gate or card (M3 0); workflows live in the UI or Terraform, not our stage model. |
| Claude Managed Agents | Claude models only (M2), and no UI (M3 0). A component. |
| Linear | Not an engine (M1, M8 0). It is the best card surface to pair with an engine. |
| Kiro autonomous agent | Fixed spec and autonomous modes; no workflow of ours (M1 0). |
| Augment Cosmos | Experts and automations are defined in the web app, not our repo (M10 0); no gates. |
| Tembo Agent Studio | Not built for SDLC stages, and has no adoption (1 star). |
| Zencoder Zenflow | Unverified: the docs blocked reading, and team-server and gate support are unknown. |
| AWS Transform | Approvals and forms exist, but only for migration jobs. |
| Rovo Dev, Jules, Codex, Amp, Qodo, Antigravity, CodeRabbit, JetBrains Air | Vendor-fixed flows with no gate card. Antigravity is also local-only. |

## What this means for the Operator's belief

As of 2026-11 there is no product with a rich, shapeable decision card, the answer on the same card, our own dev workflows, and many repositories together. The market splits the problem:
- Engines with our definitions: Warp Factories, GitHub gh-aw.
- Vendor-fixed rich cards: Factory Tasks, AWS Transform approvals.
- Tracker-native interaction: Linear elicitations.

Whichever engine we pick, the card stays a piece we build. The cheapest place to host it is Linear (select options plus free text, with the answering user recorded) or GitHub (Mermaid comments plus check-run buttons).

## Not verified, worth a direct check

- Whether Linear agent activity bodies render Mermaid and collapsible sections.
- The Warp gate UI in Slack and Linear.
- The Zenflow docs (HTTP 403).
- JetBrains Air Teams (HTTP 403).
- The AWS Transform Agent Builder Toolkit forms (article body unreadable).
- Prices for Warp, Factory, Augment and Devin (official pricing pages not read).
