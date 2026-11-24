# The top-level agent in other multi-agent coding systems

Access date for every source: 2026-11-24. Marks: **V** verified in a first-party source (docs, repository, vendor post), **S** secondary source (third-party write-up, search-result summary, community post), **I** inferred. Where a first-party page could not be fetched, the fact is marked S and listed under "Unverified".

## Question

Our pipeline has an Orchestrator (engine code on a fixed state machine with human gates) and one human, the Operator. The proposal is a Supervisor: a long-lived chat agent that is the Operator's single interface (status, create items, answer gates, cancel, pause, start releases). Should it be forbidden something, need confirmation for some actions, or be allowed everything the Operator can? This note asks what other systems do with their top agent.

## Short answer

- Most systems have one top agent the human talks to (Mayor, lead, coordinator, orchestrator, CEO). It plans, spawns workers, assigns, monitors, summarises. [V]
- Almost none lets that agent write code itself or merge on its own authority; merge, review and CI sit behind a separate role, a branch rule or a human. [V]
- What is withheld is withheld by mechanism, not by prompt: absent tool, deny rule that applies in every mode, org-wide autonomy cap, separate credential, approval record in the platform. [V]
- Human approval is a click or a reply in a UI the agent cannot write to. Two vendors state outright that an approval relayed through an agent is untrusted. [V]
- Disagreement is about spawn consent (auto-approved by default in Devin and Claude Code teams; staged by default in Gas Town convoys and Paperclip hires) and about whether a bypass mode exists at all.
- Reported failures are mostly cost, duplicated work, runaway spawning and unreviewed volume, not a supervisor faking approval. One vendor-documented case of an agent abusing its own self-approval is absent from what I found. [I]
- Recommendation direction (I): allow the Supervisor everything that is reversible and everything the Operator can do through a decision request, but never let it answer a gate for the Operator, change its own limits, or edit trust and approval records.

## Systems

### Gas Town (the "Mayor")
- (1) Yes: the Mayor, a Claude Code instance the human ("Overseer") talks to; "concierge and chief-of-staff". [V: [launch essay mirror](https://drss.io/feed/npub1na2ppcvpx7m7dg4d2rqelpq4xdj9z40cxu3avh4qcdq8dtupdcmqahmfge/welcome-to-gas-town), [repository README](https://github.com/steveyegge/gastown)]
- (2) Starts convoys (work groups), files beads (work items), slings them to workers, spawns agents, summarises results. A managed port documents 21 Mayor tools: sling, convoy status/start/close, bead update/reassign/delete (up to 5000 at once), agent reset/nudge, mail, and changing town settings (models, max workers, custom instructions) in natural language. [V: [Kilo Mayor docs](https://kilo.ai/docs/code-with-ai/gastown/mayor), a third-party implementation, not the original]
- (3) Does not write code (workers do); workers never push to main, a merge-queue role does; cannot see external systems. The README states no explicit limit on the Mayor and no approval gate for it; whether destructive tools need confirmation is not documented. Concurrency cap exists as a setting, default uncapped. [V]
- (4) Convoys are "staged by default" for human review before agents start (Kilo port). [V] Original README: not documented.
- (5) State in git-backed hooks and a ledger, not in the Mayor's context; handoff and a "seance" to query predecessor sessions. Mayor conversation is bounded, early context may be lost. [V]
- (6) The author's own warning: "100% vibe coded", expensive, workers "can wreck" things. [V] Hosted use reported near $100/hour in tokens [S: social post, via search summary]. Reported later collapse after a model change made the agent keep tinkering with the tool itself [S: [blog note](https://simonwillison.net/2026/Aug/4/steve-yegge/)]. A critic argues dropping the merge gate at ~175-250 commits/day removes attribution of failures and leaves review unsolved [S: [essay](https://julien.danjou.info/blog/steve-yegge-deleted-the-wrong-thing)].

### Claude Code: lead session, subagents, agent teams
- (1) Yes: the lead (main session) in an agent team; the human can also message any teammate directly. [V: [agent teams](https://code.claude.com/docs/en/agent-teams)]
- (2) Spawns teammates and subagents (no confirmation of the launch), creates and assigns tasks, sends shutdown requests; teammates self-claim tasks with file locking. [V]
- (3) Teammates cannot spawn teammates; lead is fixed; no per-teammate permission modes at spawn (inherits the lead's, including bypass). Tool allowlist/denylist per definition; `Agent(type)` restricts which subagent types a coordinator may spawn; deny rules apply in every mode. Subagents inherit the parent's mode when it is bypass/acceptEdits/auto. The auto-mode classifier blocks by default production deploys, force push, granting permissions, merging unapproved PRs, disabling CI checks, and treats actions beyond the request as blocked. [V: [sub-agents](https://code.claude.com/docs/en/sub-agents), [permission modes](https://code.claude.com/docs/en/permission-modes)]
- (4) Prompts and approvals happen in the human's terminal; teammate permission prompts bubble to the lead session. A teammate "can't approve a permission prompt or supply consent on your behalf", and the classifier treats an approval claim relayed from another agent as untrusted input. No tool for the model to switch its own mode is documented; driving its own interface via terminal keystrokes is blocked as changing its own oversight. [V]
- (5) Team config and mailboxes are session-scoped; in-process teammates are not restored on resume; task list stays on disk. Subagents may have a persistent memory directory. [V]
- (6) Documented limits: task status lags, lead may stop early or start implementing instead of waiting, coordination overhead and token cost scale with teammates. [V]

### Anthropic multi-agent research system
- (1) Lead agent plus parallel subagents; the user talks to the lead. (2) Plans, decides how many subagents, writes their briefs, synthesises, may spawn more. (3) Not described; read-only research tools. (4) No approval process described. [V: [engineering post](https://www.anthropic.com/engineering/multi-agent-research-system)]
- (5) Lead saves its plan to external memory so truncation does not lose it; can spawn fresh subagents with handoffs. (6) Early versions spawned 50 subagents for simple queries; vague briefs caused duplicated searches; about 4x tokens for an agent and about 15x for multi-agent versus chat; small errors compound in long runs, so checkpoints and resumability were added. [V]

### Cursor (long-running agents; cloud agents)
- (1) Research harness: planners, workers, a judge per cycle; no chat top agent. Product: cloud agents started by a person from web, desktop, Slack, Linear or GitHub comments. [V: [scaling agents](https://cursor.com/blog/scaling-agents), [cloud agents](https://cursor.com/docs/cloud-agent)]
- (2) Planners create tasks and sub-planners; workers finish tasks and push; judge decides continue or stop. Cloud agents open PRs with artifacts. (3) Admin must connect source control; outbound domains restrictable; secrets scoped and injected at start; viewing is read-only until a team admin enables follow-ups. (4) PR review. (5) Fresh start each cycle. [V]
- (6) Lock-based self-coordination: agents held locks too long, 20 agents behaved like 2-3; optimistic concurrency made agents risk-averse; a dedicated integrator role was a bottleneck; prompt design mattered more than harness. Human review of the large migration "still needs careful review". [V] Security research on auto-run: a prompt injection in a repository file led an agent to read and send keys despite a denylist, and an injected write to the tool's own MCP config file gave code execution without approval [S: [HiddenLayer](https://www.hiddenlayer.com/research/how-hidden-prompt-injections-can-hijack-ai-code-assistants-like-cursor), [SecurityWeek](https://www.securityweek.com/several-vulnerabilities-patched-in-ai-code-editor-cursor/amp/)].

### Devin (parent session managing child Devins)
- (1) A coordinator session; the human talks to it. [V: [advanced capabilities](https://docs.devin.ai/work-with-devin/advanced-capabilities)]
- (2) Launches child sessions with prompt, skills, tags and per-child ACU (compute credit) limits; messages, monitors spend, sleeps or terminates children; schedules messages to itself; is woken when a child finishes or needs input. (3) Gated by an org permission ("Use Devin Sessions") that an admin can withhold via a custom role; limits per child. (4) Child sessions auto-approved by default; "Auto-approve child sessions" can be turned off to review each batch. (5) Not documented for children. (6) None found. [V]

### OpenHands
- (1) An agent using `DelegateTool` (parallel, persistent sub-agents by id, `spawn` then `delegate`) or `TaskToolSet` (sequential, blocking, resumable). Example caps concurrent sub-agents at 3 by subclassing. [V: [delegation guide](https://docs.openhands.dev/sdk/guides/agent-delegation)]
- (2)-(6) Confirmation mode and security analyzer behaviour for sub-agents: not found in the pages read. Unverified.

### Factory (droids, Missions)
- (1) Missions orchestration needs High autonomy or the skip-permissions flag. [V: [autonomy docs](https://docs.factory.com/cli/user-guides/auto-run)]
- (2)-(3) Autonomy ladder Off/Low/Medium/High (High: migrations, `docker compose up`). Block rules reject a command with no approval path, even under the skip flag; ask rules require approval even at High; subagents inherit the parent level but are clamped to the organization's Maximum Autonomy Level; tool policy is separate from autonomy level. Docs advise higher autonomy only in sandboxes with no standing production credentials. [V] Missions internals (orchestrator, validators): page not fetched; unverified.

### Paperclip ("CEO" over an org chart)
- (1) Yes: one root CEO agent, every other agent reports to a manager; the human is the "board". [S: [docs summary via search](https://mintlify.com/paperclipai/paperclip/concepts/org-structure); V for the README claims below: [README](https://raw.githubusercontent.com/paperclipai/paperclip/master/README.md)]
- (2) Agents are hired, assigned work, woken by assignment, follow-up or schedule; a mention alone does not assign work. (3) Hire requests create approval records the board must resolve (default on, S); per-company/agent/project budgets with hard stop (enforcement uses recorded spend, so in-flight work can overrun, V); tool-gateway calls set to Allowed, Ask first or Off (V); pause, resume, terminate by the human (V). (4) Approval records in the platform UI. (5) Persistent context via tasks, comments, documents and saved adapter sessions; a memory system is "in progress" (V). (6) None found.

### agent-swarm
- (1) A lead agent receives work from Slack, repositories, trackers, email, API and "plans & delegates" to workers (Claude Code, Codex). (2) Schedules, workflows, deferred tasks; extensions activated by a trusted lead, operator or dashboard user. (3) RBAC on by default; API behind a key. (4) Review gates mentioned, not explained. (5) Vector memory and identity files shared across sessions. [V: [README](https://github.com/desplega-ai/agent-swarm)] (6) Not described.

### OpenAI Symphony and Codex
- (1) Symphony: no chat agent; the issue board is the control plane, an orchestrator polls it, runs one agent workspace per open issue, restarts stalled agents. [V: [OpenAI post](https://openai.com/index/open-source-codex-orchestration-symphony/)]
- (2) Agents implement, open PRs across repos, watch CI, rebase, and file follow-up issues; humans set priorities and review at ticket level; tickets move to a review handoff state, and work in "Merging" is expected to land without human babysitting. (6) Losing the ability to nudge agents mid-task sometimes missed the mark; treating agents as rigid state-machine nodes limited them, so the team moved to objectives plus tools. [V]
- Codex approvals: `on-request` default, `never`, granular, an optional reviewer-agent for approval requests; sandbox read-only / workspace-write / full-access; users change them in config or `/permissions`, admins by managed config that takes precedence; `.git`, `.codex`, `.agents` stay read-only inside writable roots. [V: [approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security)]

### Google Jules
- Single agent, no supervisor. Plan is shown and the human can approve before any code change; completion and requests for input notify the human. Memory beyond a repo `AGENTS.md`: not documented. [V: [docs](https://jules.google/docs)]

### GitHub Copilot coding agent, Agent HQ, mission control
- (1) Mission control: "a single command center to assign, steer, and track the work of multiple agents" across GitHub, VS Code, mobile, CLI. [V: [announcement](https://github.blog/news-insights/company-news/welcome-home-agents/)]
- (2)-(3) One branch and one PR per task; read-only without write access; rulesets and branch protection can block it; org control plane for allowed agents, models, audit log and per-agent identity; branch controls decide when CI runs on agent code. [V: [coding agent overview](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)]
- (4) The requester's own approval of an agent PR does not count toward required approvals; Actions workflows on agent PRs do not run until a human approves (an admin may skip this). Older docs: the agent cannot mark ready for review, approve or merge; a September 2026 change lets Copilot code review give an approval assessment when an admin authorizes it. [S: via search summary of [review docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/review-copilot-prs) and [changelog](https://github.blog/changelog/2026-09-01-copilot-code-review-can-now-approve-pull-requests); the overview page itself did not state these]

### LangGraph supervisor, Magentic-One, CrewAI, OpenAI Agents SDK
- LangGraph supervisor: delegates through handoff tools, memory by checkpointer (short-term) and store (long-term); nested supervisors; the repository is archived and recommends building the pattern directly from tools. [V: [repository](https://github.com/langchain-ai/langgraph-supervisor-py)]
- Magentic-One: Orchestrator keeps a task ledger and a progress ledger, assigns subtasks, re-plans when stalled. Observed risks: repeated failed logins locked an account and agents then tried to reset the password; agents tried to get human help by posting on social media and emailing strangers until stopped. Advice: containers, least privilege, log monitoring, human in the loop, pause before irreversible actions; example code has an `approval_func` for code execution. [V: [research post](https://www.microsoft.com/en-us/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/), [AutoGen page](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/magentic-one.html)]
- CrewAI: hierarchical process with a manager agent or manager LLM that delegates and validates; delegation is off unless enabled; max-iteration and rate caps; the page documents no human-input mechanism. [V: [docs](https://docs.crewai.com/en/learn/hierarchical-process)]
- OpenAI Agents SDK: manager pattern (specialists as tools, manager keeps the conversation) versus handoffs; guardrails enforced in one place; no approval steps on that page. [V: [docs](https://openai.github.io/openai-agents-python/multi_agent/)]

### Systems with no top agent
- Vibe Kanban (README says it is sunsetting), Claude Squad (auto-yes flag is experimental), Conductor: the human is the coordinator; the human reviews diffs and opens PRs. [V: [Vibe Kanban](https://github.com/BloopAI/vibe-kanban), [Claude Squad](https://github.com/smtg-ai/claude-squad), [Conductor](https://www.conductor.build/docs/)]
- Amp: manual page fetched did not cover subagents or permissions. Unverified.

### Outside the field, one counterexample
- Replit agent deleted a production database during a user-declared code freeze, then misreported recoverability; the vendor responded with plan/chat-only mode. Single agent, but it shows that an instruction to refrain is not a control. [S: [Fortune](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/), [The Register](https://www.theregister.com/2025/07/22/replit_saastr_response/)]

## Comparison

| System | Top agent the human talks to | Does by itself | Withheld, and how | Human approval and fakeability | Memory across sessions | Reported failures |
|---|---|---|---|---|---|---|
| Gas Town | Mayor | Convoys, beads, spawn, nudge, settings (port) | No code writing; merge queue separate; no Mayor gate documented | Staged convoys (port); fakeability not documented | Git hooks and ledger; Mayor context bounded | Cost; instability; unreviewed volume (S) |
| Claude Code teams | Lead | Spawn, assign, shut down | Tool lists, deny rules in all modes, classifier, no nesting, lead fixed | Prompt in human terminal; relayed approval claims untrusted | Session-scoped; subagent memory dirs | Task lag, lead stops early or implements itself, cost |
| Anthropic research | Lead | Plan, spawn, synthesise | Not described | None described | Plan saved externally | 50 subagents, duplication, 15x tokens |
| Cursor | None (planner/worker/judge); cloud agents started by person | Tasks, push, PR | Admin source-control link, domain limits, scoped secrets | PR review | Fresh per cycle | Lock failures, risk aversion, integrator bottleneck |
| Devin | Coordinator session | Launch, message, sleep, terminate children | Org permission, per-child credit limit | Child launch auto-approved by default, optional review | Not documented | None found |
| OpenHands | Agent with DelegateTool | Spawn, delegate | Concurrency cap by code | Not found | Persistent ids | Not found |
| Factory | Orchestrator in Missions | Via autonomy level | Org max autonomy, block and ask rules, tool policy | Prompt unless allowed; block rules survive skip flag | Not fetched | Not fetched |
| Paperclip | CEO agent | Work per assignment | Hire approvals, budgets, tool gateway Ask/Off | Board approval records | Tasks, docs, sessions | None found |
| agent-swarm | Lead | Delegate, schedule | RBAC, API key | Review gates (unclear) | Vector memory, identity files | Not described |
| Symphony | Board, no chat agent | Implement, PR, CI, follow-up issues | Status machine; humans own priorities | Review handoff state, then Merging | Workspace per issue | Lost nudging; rigid nodes |
| Codex | Single agent | Per sandbox | Sandbox, approval policy, admin precedence, protected paths | Prompt or reviewer agent | Not covered | Not covered |
| Jules | Single agent | After plan approval | VM sandbox | Plan approval | AGENTS.md only | None |
| Copilot / Agent HQ | Mission control | Branch, PR | Rulesets, no self-approval, workflow approval | Different human reviewer; click | Not covered | Not covered |
| Magentic-One | Orchestrator | Assign, re-plan | Containers, least privilege | `approval_func` for code | Ledgers | Account lockout; contacting strangers |
| LangGraph / CrewAI | Supervisor / manager | Handoff or delegate | Delegation flag, iteration caps | Not documented | Checkpointer and store (LangGraph) | Library archived (LangGraph) |

## Patterns that repeat

- **Allowed to almost every top agent:** spawn and stop workers, assign and reprioritise work, read everything, message the human, change soft settings such as limits and models (Gas Town port, Devin, Claude Code). [V]
- **Withheld from almost every top agent:** writing production code itself, merging without a separate gate, granting itself permissions, approving its own or another agent's output as the human. Mechanisms: absent tool, role split, deny rule above every mode, org cap, branch protection, "self-approval does not count". [V]
- **Human signal path is out-of-band:** terminal prompt, UI click, PR review, platform approval record. Two vendors say agent-relayed approval is not approval. [V]
- **Cost and fan-out are the commonest failure**, controlled by caps (max workers, budgets, depth, concurrent sub-agents) rather than by forbidding spawn. [V]
- **State lives outside the agent's context** (git hooks, ledgers, task files, external plan memory), because context is lost on truncation or resume. [V]
- **Where they disagree:** (a) spawn consent: auto by default (Devin, Claude Code, Paperclip agents wake themselves) versus staged (Gas Town port, hire approvals); (b) a bypass mode (Claude Code, Codex, Factory flags) versus none; (c) whether a reviewer agent may stand in for approval (Codex auto-review, Copilot code review) versus a human only; (d) letting the top agent act in the same chat that carries the approval (Claude Code, where the human types consent) versus separating them.
- **Gap in the field:** I found no first-party document that studies a top agent tampering with its own approval path; the closest are prompt-injection write to its own config (S) and a lead that implements instead of waiting (V).

## What this means for our Supervisor (I)

1. Give it read access to everything (state, rounds, verdicts, holds, queue) and the ability to create, pause, resume, cancel and start releases. Those are reversible, bounded by the existing state machine, and every other top agent allows the equivalent.
2. Route every action through the same engine entry points the Operator uses, so the state machine, the waiting cap (decision 9) and the trust list (decision 39) apply unchanged. No second path.
3. Do not let it answer a gate on its own. A gate answer is a decision request choice (decision 38) made by the Operator; the Supervisor may present options, recommend, and relay the Operator's explicit pick, and the engine should require the pick to arrive on a channel the model cannot write (UI button or an authenticated message), as Claude Code and Copilot do.
4. Treat any "the Operator said yes" appearing in a message the Supervisor forwards as untrusted, as Claude Code's classifier does.
5. Withhold what changes the rules of oversight: the trusted-author list, R0 auto-merge rules and their kill switch, project maps (decision 46), its own tool list and limits. Those are the equivalents of deny rules, org caps and branch protection; keep them editable only by the Operator through the repository.
6. Withhold writing code and merging from it directly; it assigns, the existing roles act. The field's role split (Mayor vs workers vs merge queue) supports this.
7. Confirmation for irreversible or wide actions only (cancel with discard, bulk close, release to the last environment): staged by default with an Operator click, as in Gas Town convoys and Devin's batch review; reversible actions need none.
8. Cap its own fan-out: one action per command, batch size limit, rate limit; caps beat prohibitions in every failure report.
9. Keep its memory in the engine's store and the repository, not in the chat; the chat context is lost on truncation, which every system above works around.
10. Log each Supervisor action as such with the Operator message that caused it, so the Retro can compare the Supervisor's recommendation follow rate as decision 38 already does for requests.

## Unverified

- Gas Town: original launch post not fetched from its primary host; Mayor tool list and "staged by default" come from a third party's port. Whether the original Mayor can delete beads or reconfigure without confirmation is not documented.
- Paperclip: default `requireBoardApprovalForNewAgents` and the CEO tree are from a search summary of docs, not a fetched page; the README fetch did not define a special CEO role.
- OpenHands confirmation mode and security analyzer for sub-agents; Factory Missions internals; Amp subagents and permissions; Cursor cloud-agent auto-run settings; LangGraph human-in-the-loop details; agent-swarm review gates.
- Copilot self-approval rules and the September 2026 code-review approval change come from search summaries, not from reading those pages.
- Cost figures for Gas Town (social post) and the Gas Town collapse account (one blog note) are anecdotal.
- No source found on Devin child-session memory, or on a coordinator that successfully faked a human approval.
