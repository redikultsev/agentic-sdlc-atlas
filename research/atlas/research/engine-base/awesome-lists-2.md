# Awesome lists, round 2: software factories, sandboxes, CLI agents

Date: 2026-11-21. Lists:
- ahmadyan/awesome-software-factory
- fhiltscher/awesome-ai-coding-sandboxes
- bradAGI/awesome-cli-coding-agents

andyrewlee/awesome-agent-orchestrators was handled by another agent and was not redone.

## Method

- **READMEs.** Each README was read with `gh api repos/<o>/<r>/readme`. Every linked project was extracted by section. Essays, related lists and contents links were left out.
- **Matching.** Projects were matched against the 323 prior candidates in `prior-candidates.json` on normalized GitHub owner/repo. Repo names were resolved through GraphQL, so renames match too (for example alibaba/OpenSandbox is the prior OpenSandbox). Products without a GitHub link were matched by name.
- **Metadata.** Stars, last push, license and the archived flag come from one GraphQL batch over 542 repos; 536 resolved.
- **Overlap with the other list.** Entries that are also in the andyrewlee list (`awesome-entries.json`) are marked so. Two of them were still deep-read because they are the strongest new engines on the factory list: Archon and Paperclip.
- **Deep-reads.** Five deep-reads were static only: clone, read, `gh api`. No install, build or run.
  - Scripts: `../scripts/` (parse.py, meta.py, merge.py, report.py).
  - Raw data: `l2/entries2.json`, `l2/meta.json`.

**Not checked:**
- products without a repo link (Superserve, OpenComputer and similar);
- READMEs of the 310 dropped CLI entries: these were dropped on their list description, section and stars;
- forkd's egress model.

## Counts

| List | Entries | Already read | New, deep-read | New, flagged or shortlisted | New, dropped | New, left to the andyrewlee-list agent |
|---|---|---|---|---|---|---|
| awesome-software-factory | 59 | 42 | 2 | 0 | 15 | 0 (6 overlap, marked in the table) |
| awesome-ai-coding-sandboxes | 96 | 24 | 0 | 4 | 68 | 0 (1 overlap) |
| awesome-cli-coding-agents | 485 | 45 | 3 | 28 | 310 | 99 |

The factory list is mostly known ground: 42 of 59 entries were already read. The new engines worth reading came from the factory list (Archon, Paperclip) and from the CLI list's orchestrator sections (Aixle Flow, CodeAF, Agent 007).

## Deep-read engines

Full reports:
- `l2/deep-archon.md`
- `l2/deep-aixle-flow.md`
- `l2/deep-paperclip.md`
- `l2/deep-codeaf.md`
- `l2/deep-agent-007.md`

| Engine | Score | Web UI | Git / tracker | Workflow and gates | Sandbox | License, activity |
|---|---|---|---|---|---|---|
| **Archon** (coleam00/Archon, 24k stars) | **7** | `archon serve` web console: run detail, approvals, attention stream with a recommendation per item, phone push, metrics, YAML editor. Multi-user (admin/member, per-user GitHub token) is off by default and needs Postgres. | GitHub forge plugin through a GitHub App: issues, PRs, CI, merge queue. No Jira and no Linear. | YAML node graph. `wait` is a typed form (approval, select). `when` reads JSON output fields. A loop exits on a script or a boolean field. Node outputs are schema-checked. The bundled `sdlc` pack covers intake, build queue, review with voting and a scripted merge gate (verdict + CI + base green). Code picks the next step, so our "never from prose" rule already holds. | Git-worktree isolation only for repo runs. A container backend exists only for non-git folders. Every node gets the same GitHub App token, so an agent can merge. Pause is CLI only. | MIT. One maintainer writes about 85% of human commits. Telemetry on by default (opt-out env). |
| **Aixle Flow** (AixleHQ/flow, 39 stars but mature) | **7** | Full product UI: board with column-to-workflow bindings, versioned workflow builder, live terminal per session, run and cost analytics, tenants and roles. Sign-in: passkey, Google, Microsoft, SCIM; no generic OIDC/SAML. | Deep GitHub, Jira and Linear: tracker triggers and tools, PR tools that merge only the reviewed head, triggers on PR reviews, CI gates with timeout and a reconcile sweep. No sub-issue or blocked-by tools. | Temporal-backed DAG with retries, parallel containers, Approve / Retry / Skip. The agent ends a step with finish/fail and moves the card itself. Loops are forbidden. No fix-round counter. No per-session cost or time cap. | A container per step (Docker or Kubernetes), but egress is open to the internet (only NET_RAW dropped). The git token has Contents + PR write on the one repo, so `gh` can merge. The model credential file sits in the container. | Apache-2.0. About 280k LOC plus 163k lines of tests, 811 merged PRs, weekly releases. Bus factor about 2 (51% / 13%). No public single-server production deploy. |
| **Paperclip** (paperclipai/paperclip, 116k stars) | 5 | Large React UI with Better Auth multi-user: approvals, decision cards, "what needs me" inbox, transcripts, costs, company-wide pause. | GitHub is an @mention App bot, with no label or sub-issue sync. Jira only via Atlassian MCP for agents. No CI read and no merge. | Issue participants and review stages enforced by the runtime, with `DEFAULT_MAX_REVIEW_ROUNDS = 3` escalating to a human. 7 fixed issue statuses. Pipeline tables exist but are unused. Binary approve/changes verdict. Budgets per company, agent or project, not per item. | Kubernetes provider with a deny-all NetworkPolicy plus an egress allowlist, and a credential broker for GitHub. No Docker provider, so one server means k3s. | MIT. About 1.57M LOC TS, about 1,000 commits a week, about 4k open issues, one author at about 70%. Telemetry on by default. |
| **CodeAF** (Agent-Field/CodeAF, 814 stars) | 4 | No browser UI in the open repo: a TUI, plus a desktop app whose source is not published. `codeaf factory serve` is headless with GitHub sign-in. | GitHub issues (label triggers), a Jira connector, follows the PR through CI and review. | `.codeaf/factory.yaml` with person-approve steps, rounds per step, budgets, protected paths, structured `stage_result`. The manager agent is refused merges in code. | Worktrees only; no network policy. | Apache-2.0. Early preview, about 1.35M LOC Go, one author about 87%. Telemetry on by default. |
| **Agent 007** (bill10/agent-007) | 3 | Browser job board with live terminals, works on a phone. Runs as a systemd user service; no Dockerfile. | No tracker intake (own board only). | Four hard-coded states. Gates are prose rules for a manager agent that merges with `gh pr merge`. No JSON verdicts and no limits. | Workers get a merge-capable `GH_TOKEN`; no container or network sandbox. | One maintainer, slowing. |

Ideas worth borrowing even from the low scorers:
- Agent 007's deterministic `merge-check.js` (warns when a merge would deploy);
- CodeAF's code-level refusal of merges by the manager agent;
- Paperclip's review-round cap and its "exclude self-review" rule.

## Sandboxes: best new versus OpenSandbox (earlier pick) and E2B (fallback)

| | **Matchlock** (new) | **Gondolin** (new) | **Cleanroom** (new) | **clampdown** (new) | OpenSandbox (earlier pick) | E2B (fallback) |
|---|---|---|---|---|---|---|
| Isolation | Firecracker microVM, Linux + KVM | libkrun microVM (KVM on Linux) | Firecracker microVM | Hardened containers (SELinux, Landlock, cap-drop) | Container, optional gVisor / Kata / Firecracker | Firecracker microVM |
| Egress by default | Sealed to an allowlist when `--allow-host` or `--secret` is given | Programmable `allowedHosts` | **Deny-default** policy | Agent container deny + allowlist; tool containers allow (private CIDRs blocked) | Configurable, deny available | Open by default, configurable |
| Credentials | MITM proxy injects secrets per host; they never enter the VM | Placeholder token in the guest, real secret injected by the host | Host-side gateway brokers credentials | Auth proxy holds real keys; the agent gets a dummy key | Brokered | Injected as env |
| Self-host shape | CLI plus SDK on one Linux host (deb/rpm) | Node SDK plus Rust daemon `gondolind`, which also runs remotely | Daemon on 127.0.0.1:8128 | CLI over Podman/Docker | Server with an API and SDKs, Docker or Kubernetes | Self-host of the infra is heavy (Nomad/Terraform) |
| Maturity | 654 stars, 8 contributors, v0.3.1 (2026-10-31), MIT | 2.5k stars, 23 contributors, image release 2026-11-12, Apache-2.0 | 70 stars, 6 contributors, v0.13.0 (2026-07), MIT | 132 stars, 4 contributors, v0.1, license unstated | 17.7k stars, active, Apache-2.0 | Large, Apache-2.0 |

**Reading.** On isolation and credentials, Matchlock and Gondolin beat OpenSandbox's default container mode:
- an own kernel instead of a shared one;
- a closed network once an allowlist is set;
- secrets that stay outside the guest.

Both lack what OpenSandbox gives us:
- a multi-session server API;
- pooling;
- a Kubernetes path;
- a large user base.

**Best new: Matchlock.** It is a single Linux binary and its secret proxy fits "no merge credentials" exactly. Gondolin is a close second, with a larger team and a daemon model. Cleanroom has the strictest default (deny) but is very young.

**Recommendation.**
- Keep OpenSandbox as the session server.
- Run it with its Firecracker or Kata runtime and deny-default egress.
- Prototype Matchlock as the alternative per-session runner when KVM is available on the owner's server.
- E2B stays the fallback only for a managed option: its egress is open by default and its secrets are injected as env.
- Not checked: whether Matchlock or Gondolin can run Docker-in-guest for test suites.

## Notable CLI runners and orchestrators (from bradAGI)

Runners fit for unattended headless sessions with machine output:
- **Already read:** Claude Code, Codex CLI, Gemini CLI, OpenCode, Qwen Code, Pi, Goose, Crush, Kilo, Letta Code and Mistral Vibe.
- **New, another model family for the reviewer:**
  - GitHub Copilot CLI (headless mode);
  - Kimi Code (Moonshot, event-sourced runtime);
  - MiMo Code (Xiaomi, non-interactive mode);
  - Grok Build (xAI official; headless mode not checked);
  - pool (Poolside, `pool exec`);
  - Auggie (`--print`).
- **New, built for unattended runs:**
  - Reasonix (single Go binary for long runs, 36k stars);
  - Agent AFK;
  - Octomind (piped, daemon and WebSocket modes);
  - zot and BitFun (JSON/RPC or exec modes).

None of them changes the earlier runner choice (Claude Code + Codex). Copilot CLI and Kimi Code are the cheapest extra families to add for the cross-family reviewer.

Ship an orchestrator, web UI or pipeline (flagged, not deep-read):
- **Pipelines with gates:**
  - Galley: a supervisor checks acceptance criteria, then retries or escalates, then hands off a PR;
  - fab-kit (intake, plan, apply, review);
  - Vibestrate (YAML phases);
  - oh-my-agent (stop-hook gates and independent judges);
  - h5i (cross-model peer review plus a verifier).
- **Self-hosted web consoles for sessions:**
  - agent-of-empires (4.6k stars, Docker sandbox option);
  - ADHDev (AGPL);
  - vibepanel;
  - CLITrigger;
  - Agent Fleet;
  - Podiom.
- **Other:**
  - Kiro Crew: kiro-cli only;
  - Code-Crafter: Jira to PR in disposable Docker, but its repo is not reachable;
  - workkit: 4 stars.

All of these are small or session-level. None beats Archon or Aixle Flow as a base.

Infrastructure worth keeping for our parts:
- **OneCLI:** a credential vault and gateway that injects keys, so agents never hold them (part S).
- **OpenCodeReview** (55k stars) and **OpenQodex:** reviewer CLIs, candidates for the stage-5 reviewer wrapper.
- **Agent Browser** and **Chrome DevTools MCP:** for the Validator.

## Verdicts

1. **Software factories: two new engines are real bases, Archon and Aixle Flow (7/10 each).** They fail in opposite places:
   - **Archon** already has our control rules: code picks the next step from JSON verdicts, there are typed approval waits with a recommendation, and a working SDLC pack with a scripted merge gate. It lacks the platform: Jira (M-L), a sandbox with a closed network for repo runs (L), per-node credentials (M), the round and waiting caps (M), and pause in the web UI (S-M).
   - **Aixle Flow** already has the platform: a team web UI, GitHub + Jira + Linear in depth, Temporal, a container per step, cost per session. It lacks the control rules: verdict-driven routing, fix-round and cost/time caps, and loops (M, via an outside conductor or a patch). It also needs egress closing (M) and a narrower token (S-M).
   - **Choice.** If the owner weights "don't build the platform" highest, Aixle Flow is the closer fit. Its gaps are rules we would write anyway, and Temporal is what the earlier verdict wanted. If he weights "rules already correct", Archon wins. Its gaps are infrastructure that OpenSandbox or Matchlock can fill.
   - **Next step:** a one-day spike of each against one real issue.
2. **Paperclip (5)** is the best operator product but has no SDLC spine and is too large and fast-moving to fork. Usable only as a UI host for our own Orchestrator plugin.
3. **CodeAF (4) and Agent 007 (3)** are dropped as bases. Their ideas are worth borrowing (listed above).
4. **Sandbox:** OpenSandbox stays. Matchlock is the best new microVM alternative and the model for credential brokering; Gondolin is second.
5. **CLI runners:** no change. Add Copilot CLI or Kimi Code only if a third model family is wanted for review.

# Tables
## ahmadyan/awesome-software-factory

Source: https://github.com/ahmadyan/awesome-software-factory. 59 entries. already read: 42, new, deep-read: 2, new, dropped: 15.

| Section | Project | Stars | Last push | License | Status |
|---|---|---|---|---|---|
| Control planes and factory f | [Agent Orchestrator](https://github.com/OrchestratorInc/agent-orchestrator) | 14980 | 2026-11-21 | Apache-2.0 | already read (Agent Orchestrator (Orchestrator.inc, OrchestratorInc/agent-) |
| Control planes and factory f | [Agentastic.dev](https://www.agentastic.dev/ai-software-factory) |  |  |  | new, dropped: macOS-only proprietary IDE, no server |
| Control planes and factory f | [Archon](https://github.com/coleam00/Archon) | 23970 | 2026-11-20 | MIT | new, deep-read: 7/10 (l2/deep-archon.md) |
| Control planes and factory f | [Fusion](https://github.com/Runfusion/Fusion) | 1341 | 2026-11-08 | MIT | already read (Fusion (Runfusion/Fusion)) |
| Control planes and factory f | [Symphony](https://github.com/openai/symphony) | 28112 | 2026-09-15 | Apache-2.0 | already read (OpenAI Symphony) |
| Control planes and factory f | [Warp Factories](https://docs.warp.dev/factories/) |  |  |  | already read (non-GitHub product, matched by name) |
| Coding agents | [Awesome Coding Agents](https://github.com/ahmadyan/awesome-coding-agents#readme) | 0 | 2026-10-06 | CC0-1.0 | new, dropped: a list, not a tool; CLI agents covered via the bradAGI list |
| Coding agents | [Claude Code Action](https://github.com/anthropics/claude-code-action) | 10031 | 2026-11-21 | MIT | already read (Claude Code GitHub Action (anthropics/claude-code-action)) |
| Coding agents | [Codex GitHub Action](https://github.com/openai/codex-action) | 1310 | 2026-11-18 | Apache-2.0 | new, dropped: CI action, not an engine; usable to run the cross-family reviewer inside CI [also in andyrewlee list] |
| Coding agents | [GitHub Agentic Workflows](https://github.com/github/gh-aw) | 5670 | 2026-11-21 | MIT | already read (GitHub Agentic Workflows (gh-aw)) |
| Coding agents | [run-gemini-cli](https://github.com/google-github-actions/run-gemini-cli) | 2129 | 2026-11-19 | Apache-2.0 | new, dropped: CI action, not an engine; same reviewer-in-CI use [also in andyrewlee list] |
| Isolation and sandboxes | [Cloudflare Sandboxes](https://developers.cloudflare.com/sandbox/) |  |  |  | already read (non-GitHub product, matched by name) |
| Isolation and sandboxes | [Container Use](https://github.com/dagger/container-use) | 4100 | 2026-11-14 | Apache-2.0 | already read (Dagger container-use) |
| Isolation and sandboxes | [Daytona](https://www.daytona.io) |  |  |  | already read |
| Isolation and sandboxes | [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) |  |  |  | already read (non-GitHub product, matched by name) |
| Isolation and sandboxes | [E2B](https://e2b.dev) |  |  |  | already read (non-GitHub product, matched by name) |
| Isolation and sandboxes | [Fly.io Sprites](https://fly.io/sprites/) |  |  |  | already read (non-GitHub product, matched by name) |
| Isolation and sandboxes | [Git worktrees](https://git-scm.com/docs/git-worktree) |  |  |  | new, dropped: git primitive; no network or credential isolation |
| Isolation and sandboxes | [Modal Sandboxes](https://modal.com/docs/guide/sandboxes) |  |  |  | already read |
| Isolation and sandboxes | [Vercel Sandbox](https://vercel.com/docs/sandbox) |  |  |  | already read |
| Issue intake | [Backlog.md](https://github.com/MrLesk/Backlog.md) | 7457 | 2026-11-21 | MIT | new, dropped: Markdown board inside the repo; no GitHub/Jira intake, runner or gates |
| Issue intake | [Beads](https://github.com/gastownhall/beads) | 28880 | 2026-11-21 | MIT | already read (Beads (bd)) |
| Issue intake | [Cyrus](https://github.com/cyrusagents/cyrus) | 909 | 2026-11-21 | Apache-2.0 | already read |
| Issue intake | [Linear for Agents](https://linear.app/agents) |  |  |  | already read (non-GitHub product, matched by name) |
| Issue intake | [Multica](https://github.com/multica-ai/multica) | 56990 | 2026-11-21 | NOASSERTION | already read (Multica (multica-ai/multica)) |
| Issue intake | [Spec Kit](https://github.com/github/spec-kit) | 150869 | 2026-11-20 | MIT | already read (GitHub Spec Kit (specify CLI)) |
| Background and cloud agents | [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web) |  |  |  | already read (non-GitHub product, matched by name) |
| Background and cloud agents | [Codex Cloud](https://learn.chatgpt.com/docs/cloud) |  |  |  | already read (non-GitHub product, matched by name) |
| Background and cloud agents | [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent) |  |  |  | already read (non-GitHub product, matched by name) |
| Background and cloud agents | [Devin](https://devin.ai) |  |  |  | already read (non-GitHub product, matched by name) |
| Background and cloud agents | [Factory](https://factory.com) |  |  |  | already read (non-GitHub product, matched by name) |
| Background and cloud agents | [GitHub Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent) |  |  |  | new, dropped: SaaS, not self-hosted |
| Background and cloud agents | [Jules](https://jules.google) |  |  |  | already read (non-GitHub product, matched by name) |
| Background and cloud agents | [Ona](https://ona.com) |  |  |  | already read (non-GitHub product, matched by name) |
| Background and cloud agents | [Open SWE](https://github.com/langchain-ai/open-swe) | 11245 | 2026-11-21 | MIT | already read (Open SWE (now "Robin"), LangChain) |
| Background and cloud agents | [OpenHands](https://github.com/OpenHands/OpenHands) | 93939 | 2026-11-21 | MIT | already read (OpenHands (Agent Canvas + Software Agent SDK + Agent Server ) |
| Review and verification | [Agent Browser](https://github.com/vercel-labs/agent-browser) | 53133 | 2026-11-21 | Apache-2.0 | new, dropped: browser CLI; a Validator-stage tool, not an engine |
| Review and verification | [Bugbot](https://cursor.com/bugbot) |  |  |  | already read (non-GitHub product, matched by name) |
| Review and verification | [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) | 58596 | 2026-11-20 | Apache-2.0 | new, dropped: Validator-stage tool, not an engine |
| Review and verification | [CodeRabbit](https://www.coderabbit.ai) |  |  |  | already read |
| Review and verification | [GitHub Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review) |  |  |  | new, dropped: SaaS reviewer |
| Review and verification | [Graphite](https://graphite.com) |  |  |  | new, dropped: SaaS stacked PRs and review |
| Review and verification | [Greptile](https://www.greptile.com) |  |  |  | already read |
| Review and verification | [Kodus](https://github.com/kodustech/kodus-ai) | 1640 | 2026-11-21 | NOASSERTION | new, dropped: self-hosted PR reviewer (AGPL core); not an engine and its verdict is PR comments, not our JSON verdict |
| Review and verification | [Playwright MCP](https://github.com/microsoft/playwright-mcp) | 39953 | 2026-11-18 | Apache-2.0 | already read (Playwright MCP (microsoft/playwright-mcp)) |
| Review and verification | [PR-Agent](https://github.com/The-PR-Agent/pr-agent) | 16512 | 2026-11-20 | MIT | already read (PR-Agent (The-PR-Agent/pr-agent, formerly Qodo/CodiumAI)) |
| Long-horizon and manager age | [Gas Town](https://github.com/gastownhall/gastown) | 18858 | 2026-11-14 | MIT | already read (Gas Town (gastownhall/gastown)) |
| Long-horizon and manager age | [Loki Mode](https://github.com/asklokesh/loki-mode) | 1120 | 2026-11-21 | NOASSERTION | already read (Loki Mode (asklokesh/loki-mode)) |
| Long-horizon and manager age | [Paperclip](https://github.com/paperclipai/paperclip) | 115564 | 2026-11-21 | MIT | new, deep-read: 5/10 (l2/deep-paperclip.md) |
| Long-horizon and manager age | [Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) | 3206 | 2026-11-13 | MIT | new, dropped: loop framework with hats; no tracker intake or human stage gates [also in andyrewlee list] |
| Long-horizon and manager age | [Ruflo](https://github.com/ruvnet/ruflo) | 82190 | 2026-11-21 | MIT | already read (Ruflo (formerly Claude Flow)) |
| Long-horizon and manager age | [Squad](https://github.com/bradygaster/squad) | 7 | 2026-11-07 | MIT | new, dropped: Copilot-only agent team in repo; 7 stars [also in andyrewlee list] |
| Cost and observability | [ccusage](https://github.com/ccusage/ccusage) | 19531 | 2026-11-21 | MIT | already read |
| Cost and observability | [Claude Code monitoring](https://code.claude.com/docs/en/monitoring-usage) |  |  |  | already read (non-GitHub product, matched by name) |
| Cost and observability | [CodexBar](https://github.com/steipete/CodexBar) | 23255 | 2026-11-21 | MIT | new, dropped: desktop usage meter |
| Cost and observability | [Helicone](https://github.com/Helicone/helicone) | 6292 | 2026-11-17 | Apache-2.0 | already read |
| Cost and observability | [Laminar](https://github.com/lmnr-ai/lmnr) | 3515 | 2026-11-20 | Apache-2.0 | already read (Laminar (lmnr-ai/lmnr)) |
| Cost and observability | [Langfuse](https://github.com/langfuse/langfuse) | 37691 | 2026-11-21 | NOASSERTION | already read |
| Cost and observability | [LiteLLM](https://github.com/BerriAI/litellm) | 63644 | 2026-11-21 | NOASSERTION | already read |

## fhiltscher/awesome-ai-coding-sandboxes

Source: https://github.com/fhiltscher/awesome-ai-coding-sandboxes. 96 entries. already read: 24, new, dropped: 68, new, flagged: 4.

| Section | Project | Stars | Last push | License | Status |
|---|---|---|---|---|---|
| Comparison matrix | [Cleanroom](https://github.com/buildkite/cleanroom) | 70 | 2026-10-31 | MIT | new, shortlisted: Firecracker, deny-default egress, host-side credential gateway, MIT; but 70 stars, 6 contributors, last release 2026-07 |
| Comparison matrix | [smolvm (smol-machines)](https://github.com/smol-machines/smolvm) | 7155 | 2026-11-21 | Apache-2.0 | already read (smolvm) |
| Comparison matrix | [Leap0](https://leap0.dev) |  |  |  | new, dropped: proprietary; self-host offering not open |
| Comparison matrix | [InstaVM](https://instavm.io) |  |  |  | new, dropped: proprietary |
| Comparison matrix | [Mitos](https://github.com/mitos-run/mitos) |  |  |  | new, dropped: repo not found (404); Kubernetes-based |
| Comparison matrix | [ainclave](https://ainclave.com) |  |  |  | new, dropped: managed only |
| Comparison matrix | [Sprites (Fly.io)](https://fly.io/sprites) |  |  |  | already read (non-GitHub product, matched by name) |
| Comparison matrix | [microsandbox](https://github.com/superradcompany/microsandbox) | 9160 | 2026-11-21 | Apache-2.0 | already read |
| Comparison matrix | [Superserve](https://superserve.ai) |  |  |  | new, dropped: no repo linked; not checked |
| Comparison matrix | [CreateOS Sandbox](https://createos.sh/products/sandbox) |  |  |  | new, dropped: managed only |
| Comparison matrix | [Islo](https://islo.dev) |  |  |  | new, dropped: proprietary |
| Comparison matrix | [Declaw](https://declaw.ai) |  |  |  | new, dropped: proprietary |
| Comparison matrix | [OmniRun](https://omnirun.io) |  |  |  | new, dropped: proprietary, env-in secrets |
| Comparison matrix | [Vercel Sandbox](https://github.com/vercel/sandbox) | 227 | 2026-11-21 | Apache-2.0 | already read |
| Comparison matrix | [BoxLite](https://github.com/boxlite-ai/boxlite) | 2682 | 2026-11-21 | Apache-2.0 | already read |
| Comparison matrix | [OpenComputer](https://opencomputer.dev) |  |  |  | new, dropped: no repo linked; not checked |
| Comparison matrix | [Blaxel](https://blaxel.ai) |  |  |  | new, dropped: managed only |
| Comparison matrix | [Qbox](https://qbox.sh) |  |  |  | new, dropped: license unverified, env-in secrets |
| Comparison matrix | [Katakate (k7)](https://github.com/Katakate/k7) | 827 | 2026-11-15 | Apache-2.0 | new, dropped: needs K3s; egress configurable only, env-in secrets |
| Comparison matrix | [AgentENV](https://github.com/kvcache-ai/AgentENV) | 3777 | 2026-11-20 | MIT | new, dropped: RL-environment platform; egress open by default, env-in |
| Comparison matrix | [Freestyle](https://freestyle.sh) |  |  |  | new, dropped: managed only |
| Comparison matrix | [Runloop](https://runloop.ai) |  |  |  | already read (non-GitHub product, matched by name) |
| Comparison matrix | [E2B](https://e2b.dev) |  |  |  | already read (non-GitHub product, matched by name) |
| Comparison matrix | [Northflank](https://northflank.com) |  |  |  | new, dropped: proprietary, egress open |
| Comparison matrix | [Arrakis](https://github.com/abshkbh/arrakis) | 895 | 2025-06-02 | AGPL-3.0 | already read |
| Comparison matrix | [SmolVM (Celesto AI)](https://github.com/CelestoAI/SmolVM) | 1755 | 2026-11-20 | Apache-2.0 | new, dropped: egress open by default, env-in secrets |
| Comparison matrix | [Morph](https://morph.so) |  |  |  | new, dropped: proprietary |
| Comparison matrix | [Tensorlake](https://tensorlake.ai) |  |  |  | new, dropped: proprietary |
| Comparison matrix | [Box (ascii.dev)](https://box.ascii.dev) |  |  |  | new, dropped: managed only |
| Comparison matrix | [Novita](https://novita.ai/sandbox) |  |  |  | new, dropped: managed only |
| Comparison matrix | [Workpaper](https://workpaper.co) |  |  |  | new, dropped: managed only |
| Comparison matrix | [Baponi](https://baponi.ai) |  |  |  | new, dropped: proprietary |
| Comparison matrix | [OpenSandbox](https://github.com/alibaba/OpenSandbox) | 17749 | 2026-11-21 | Apache-2.0 | already read |
| Comparison matrix | [Cloudflare Sandboxes](https://developers.cloudflare.com/sandbox/) |  |  |  | already read (non-GitHub product, matched by name) |
| Comparison matrix | [Daytona](https://daytona.io) |  |  |  | already read |
| Comparison matrix | [AIO Sandbox](https://github.com/agent-infra/sandbox) | 6373 | 2026-09-14 | Apache-2.0 | already read (AIO Sandbox (agent-infra/sandbox, ByteDance)) |
| Comparison matrix | [Modal](https://modal.com) |  |  |  | already read (non-GitHub product, matched by name) |
| Comparison matrix | [Beam](https://beam.cloud) |  |  |  | new, dropped: AGPL, egress open by default |
| Comparison matrix | [Kubernetes Agent Sandbox](https://github.com/kubernetes-sigs/agent-sandbox) | 4672 | 2026-11-21 | Apache-2.0 | already read (Kubernetes agent-sandbox (kubernetes-sigs/agent-sandbox, SIG) |
| Comparison matrix | [OpenHands](https://github.com/OpenHands/OpenHands) | 93939 | 2026-11-21 | MIT | already read (OpenHands (Agent Canvas + Software Agent SDK + Agent Server ) |
| VMs & microVMs | [Vibe](https://github.com/lynaghk/vibe) | 963 | 2026-08-31 | MIT | new, dropped: macOS only |
| VMs & microVMs | [Volant](https://github.com/0xchasercat/volant) |  |  |  | new, dropped: repo not found |
| VMs & microVMs | [Netclode](https://github.com/angristan/netclode) | 265 | 2026-11-02 |  | new, dropped: no license; a whole k3s coding-agent stack, not a sandbox component |
| VMs & microVMs | [Chamber](https://github.com/cirruslabs/chamber) | 50 | 2025-12-10 | AGPL-3.0 | new, dropped: AGPL, no push since 2025-12 |
| VMs & microVMs | [Matchlock](https://github.com/jingkaihe/matchlock) | 654 | 2026-11-09 | MIT | new, shortlisted: Firecracker microVM on Linux/KVM, network sealed to an allowlist, secrets via MITM proxy never enter the VM, MIT; 654 stars, 8 contributors, v0.3.1 |
| VMs & microVMs | [Gondolin](https://github.com/earendil-works/gondolin) | 2466 | 2026-11-13 | Apache-2.0 | new, shortlisted: libkrun microVM, allowedHosts + placeholder secrets injected by the host, remote daemon gondolind, TS SDK, Apache-2.0; 2.5k stars, 23 contributors |
| VMs & microVMs | [Mudroom](https://github.com/Kernel-Hunter/mudroom) | 21 | 2026-11-01 | MIT | new, dropped: 21 stars; Mac-first (Apple container) |
| Containers & gVisor | [llm-sandbox](https://github.com/vndee/llm-sandbox) | 1144 | 2026-11-17 | MIT | new, dropped: code-interpreter library; no egress policy |
| Containers & gVisor | [Sandbox0](https://sandbox0.ai) |  |  |  | new, dropped: managed only |
| Containers & gVisor | [MCP Runner](https://github.com/abir-taheer/mcp-runner) | 32 | 2026-10-22 | Apache-2.0 | new, dropped: runs MCP servers, not agents |
| Containers & gVisor | [Kilntainers](https://github.com/Kiln-AI/Kilntainers) | 52 | 2026-03-03 | MIT | new, dropped: MCP shell tool; no push since 2026-03 |
| Containers & gVisor | [packnplay](https://github.com/obra/packnplay) | 175 | 2026-03-21 |  | new, dropped: no access control (per its list entry) |
| Containers & gVisor | [yolobox](https://github.com/finbarr/yolobox) | 657 | 2026-11-01 | MIT | new, dropped: no egress control |
| Containers & gVisor | [vibebin](https://github.com/jgbrwn/vibebin) | 111 | 2026-08-10 | NOASSERTION | new, dropped: persistent LXC hosting, not disposable |
| Containers & gVisor | [Leash](https://github.com/strongdm/leash) | 601 | 2026-04-06 | Apache-2.0 | new, dropped: experimental; no push since 2026-04 |
| Containers & gVisor | [clampdown](https://github.com/89luca89/clampdown) | 132 | 2026-11-19 | NOASSERTION | new, shortlisted: container tier): agent container deny + allowlist, auth proxy keeps real API keys out (dummy key), SELinux/Landlock; but tool containers default-allow egress, 132 stars, 4 contributors |
| Containers & gVisor | [code-on-incus](https://github.com/mensfeld/code-on-incus) | 790 | 2026-11-20 | MIT | new, dropped: persistent machines; no default-deny egress |
| Containers & gVisor | [clawker](https://github.com/schmitthub/clawker) | 59 | 2026-11-20 | MIT | new, dropped: 59 stars; Docker behind egress filter, a lighter clampdown alternative |
| Containers & gVisor | [AirlockAI](https://github.com/larytet-py/AirlockAI) | 2 | 2026-11-17 | GPL-3.0 | new, dropped: 2 stars, GPL |
| Containers & gVisor | [OnlineCompiler.io](https://onlinecompiler.io) |  |  |  | new, dropped: hosted code-exec API |
| Process & namespace sandboxe | [Anthropic Sandbox Runtime](https://github.com/anthropic-experimental/sandbox-runtime) | 7208 | 2026-11-13 | Apache-2.0 | already read (Anthropic Sandbox Runtime (srt)) |
| Process & namespace sandboxe | [NVIDIA OpenShell](https://github.com/NVIDIA/OpenShell) | 21846 | 2026-11-21 | Apache-2.0 | already read (NVIDIA OpenShell (now ai-openshell/openshell, CNCF)) |
| Process & namespace sandboxe | [Greywall](https://github.com/GreyhavenHQ/greywall) | 315 | 2026-10-17 | Apache-2.0 | new, dropped: process-level (bwrap, Landlock, seccomp) deny-default; good inner layer, weaker than a VM |
| Process & namespace sandboxe | [Fence](https://github.com/fencesandbox/fence) | 1025 | 2026-11-17 | Apache-2.0 | new, dropped: process-level sandbox; inner layer only |
| Process & namespace sandboxe | [Landrun](https://github.com/Zouuup/landrun) | 2347 | 2026-10-16 | MIT | new, dropped: Landlock primitive |
| Process & namespace sandboxe | [sandlock](https://github.com/multikernel/sandlock) | 625 | 2026-11-21 | Apache-2.0 | new, dropped: Landlock/seccomp primitive |
| Process & namespace sandboxe | [HiveBox](https://github.com/TetiAI/hivebox) | 60 | 2026-06-19 | BSD-3-Clause | new, dropped: 60 stars, OpenCode only |
| Process & namespace sandboxe | [ClaudeCage](https://github.com/PACHAKUTlQ/ClaudeCage) | 154 | 2026-04-25 | AGPL-3.0 | new, dropped: archived |
| Filesystem & WebAssembly san | [AgentFS](https://docs.turso.tech/agentfs) |  |  |  | new, dropped: filesystem layer, not isolation |
| Filesystem & WebAssembly san | [LocalSandbox](https://github.com/coplane/localsandbox) | 157 | 2026-08-18 |  | new, dropped: WASM bash/python; cannot run real toolchains |
| Filesystem & WebAssembly san | [Wassette](https://github.com/microsoft/wassette) | 977 | 2026-11-17 | MIT | new, dropped: WASM MCP components |
| Filesystem & WebAssembly san | [Eryx](https://github.com/eryx-org/eryx) | 86 | 2026-11-21 | Apache-2.0 | new, dropped: Python-on-WASM only |
| Filesystem & WebAssembly san | [Capsule](https://github.com/capsulerun/capsule) | 304 | 2026-10-12 | Apache-2.0 | new, dropped: WASM tasks; no full Linux toolchain |
| Filesystem & WebAssembly san | [AgentVM](https://github.com/deepclause/agentvm) | 80 | 2026-11-05 | MIT | new, dropped: WASM Alpine VM in Node; too slow for builds and tests |
| Filesystem & WebAssembly san | [amla-sandbox](https://github.com/amlalabs/amla-sandbox) | 348 | 2026-05-15 | NOASSERTION | new, dropped: WASM, no network; not for repo work |
| Isolation building blocks | [Firecracker](https://github.com/firecracker-microvm/firecracker) | 38147 | 2026-11-20 | Apache-2.0 | already read |
| Isolation building blocks | [Cloud Hypervisor](https://github.com/cloud-hypervisor/cloud-hypervisor) | 6553 | 2026-11-21 |  | already read |
| Isolation building blocks | [Kata Containers](https://github.com/kata-containers/kata-containers) | 9194 | 2026-11-21 | Apache-2.0 | already read |
| Isolation building blocks | [gVisor](https://github.com/google/gvisor) | 20071 | 2026-11-21 | Apache-2.0 | already read |
| Isolation building blocks | [libkrun](https://github.com/containers/libkrun) | 2934 | 2026-11-20 | Apache-2.0 | new, dropped: building block (used by Gondolin, smolvm) |
| Isolation building blocks | [Flintlock](https://github.com/liquidmetal-dev/flintlock) | 1529 | 2026-11-17 | MPL-2.0 | new, dropped: microVM lifecycle; no agent API |
| Isolation building blocks | [forkd](https://github.com/deeplethe/forkd) | 5886 | 2026-11-20 | Apache-2.0 | new, dropped: sandbox fleet platform (gVisor/Firecracker); egress and credential model not checked; watch |
| Isolation building blocks | [Bubblewrap](https://github.com/containers/bubblewrap) | 9575 | 2026-10-14 | NOASSERTION | already read (bubblewrap (bwrap)) |
| Adjacent | [Ona](https://ona.com) |  |  |  | already read (non-GitHub product, matched by name) |
| Adjacent | [Coder](https://coder.com) |  |  |  | already read (non-GitHub product, matched by name) |
| Adjacent | [CodeSandbox SDK](https://codesandbox.io) |  |  |  | new, dropped: managed |
| Adjacent | [GitHub Codespaces](https://github.com/features/codespaces) |  |  |  | new, dropped: managed CDE |
| Adjacent | [Steel.dev](https://steel.dev) |  |  |  | new, dropped: browser sessions only |
| Adjacent | [Clusy](https://www.clusy.io) |  |  |  | new, dropped: managed notebook |
| Adjacent | [Cloudish](https://cloudish.ai) |  |  |  | new, dropped: managed host |
| Adjacent | [ComputeSDK](https://computesdk.com) |  |  |  | new, dropped: router over other providers, no own isolation |
| Adjacent | [agentbox (madarco)](https://github.com/madarco/agentbox) | 584 | 2026-11-19 | MIT | new, dropped: dev tooling over off-the-shelf isolation (also in the other agent list) [also in andyrewlee list] |
| Adjacent | [Giant Swarm Agent Platform](https://www.giantswarm.io/agent-platform) |  |  |  | new, dropped: K8s control plane, no sandbox |
| Adjacent | [HOL Guard](https://hol.org/guard) |  |  |  | new, dropped: policy checks, no isolation |
| Adjacent | [Fireactions](https://github.com/hostinger/fireactions) | 207 | 2026-11-17 | Apache-2.0 | new, dropped: GitHub runners on Firecracker; no agent API |
| Adjacent | [dtshim](https://github.com/korableg/dtshim) | 1 | 2026-11-13 | MIT | new, dropped: host-command bridge, 1 star |

## bradAGI/awesome-cli-coding-agents

Source: https://github.com/bradAGI/awesome-cli-coding-agents. 485 entries. already read: 45, new, deep-read: 3, new, dropped: 310, new, flagged: 28, new, other agent list: 99.

| Section | Project | Stars | Last push | License | Status |
|---|---|---|---|---|---|
| Open Source | [Hermes Agent](https://github.com/NousResearch/hermes-agent) | 265079 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [OpenCode](https://github.com/anomalyco/opencode) | 228311 | 2026-11-21 | MIT | already read (opencode) |
| Open Source | [Claw Code](https://github.com/ultraworkers/claw-code) | 194753 | 2026-11-10 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Codex CLI](https://github.com/openai/codex) | 136019 | 2026-11-21 | Apache-2.0 | already read (OpenAI Codex CLI + Codex SDK (codex exec)) |
| Open Source | [Pi](https://github.com/badlogic/pi-mono) | 123121 | 2026-11-21 | MIT | already read (pi (earendil-works/pi, formerly badlogic/pi-mono)) |
| Open Source | [Gemini CLI](https://github.com/google-gemini/gemini-cli) | 108961 | 2026-11-21 | Apache-2.0 | already read |
| Open Source | [OpenHands](https://github.com/All-Hands-AI/OpenHands) | 93939 | 2026-11-21 | MIT | already read (OpenHands (Agent Canvas + Software Agent SDK + Agent Server ) |
| Open Source | [Cline CLI](https://github.com/cline/cline) | 71800 | 2026-11-21 | Apache-2.0 | already read (Cline (CLI / SDK / core)) |
| Open Source | [Oh My OpenAgent](https://github.com/code-yeongyu/oh-my-openagent) | 71037 | 2026-11-21 | NOASSERTION | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Open Interpreter](https://github.com/OpenInterpreter/open-interpreter) | 68924 | 2026-11-21 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Goose](https://github.com/aaif-goose/goose) | 56842 | 2026-11-20 | Apache-2.0 | already read (goose (aaif-goose/goose)) |
| Open Source | [Aider](https://github.com/Aider-AI/aider) | 50204 | 2026-05-22 | Apache-2.0 | already read (Aider (scripted / as library)) |
| Open Source | [Codewhale](https://github.com/Hmbown/CodeWhale) | 41193 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [OH-MY-PI](https://github.com/can1357/oh-my-pi) | 39559 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Continue CLI](https://github.com/continuedev/continue) | 36531 | 2026-11-20 | Apache-2.0 | already read (Continue (continuedev/continue): CLI `cn`, VS Code and JetBr) |
| Open Source | [Reasonix](https://github.com/esengine/DeepSeek-Reasonix) | 36092 | 2026-11-12 | MIT | new, flagged: unner: single Go binary for long unattended runs (DeepSeek-first), 36k stars |
| Open Source | [Deep Agents Code](https://github.com/langchain-ai/deepagents) | 31493 | 2026-11-21 | MIT | already read (Deep Agents (LangChain)) |
| Open Source | [Qwen Code](https://github.com/QwenLM/qwen-code) | 30831 | 2026-11-21 | Apache-2.0 | already read |
| Open Source | [Crush](https://github.com/charmbracelet/crush) | 29154 | 2026-11-21 | NOASSERTION | already read (Crush (charmbracelet/crush)) |
| Open Source | [Kilo Code CLI](https://github.com/Kilo-Org/kilocode) | 28069 | 2026-11-21 | MIT | already read (Kilo Code) |
| Open Source | [Grok Build](https://github.com/xai-org/grok-build) | 27821 | 2026-09-29 | Apache-2.0 | new, flagged: unner: xAI official harness (another family); headless not checked |
| Open Source | [Roo Code CLI](https://github.com/RooCodeInc/Roo-Code) | 24236 | 2026-05-15 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Prime Agent](https://github.com/PrimeIntellect-ai/prime-agent) | 22863 | 2026-11-21 | NOASSERTION | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [jcode](https://github.com/1jehuang/jcode) | 21961 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [SWE-agent](https://github.com/SWE-agent/SWE-agent) | 20841 | 2026-11-16 | MIT | already read |
| Open Source | [Plandex](https://github.com/plandex-ai/plandex) | 15925 | 2025-10-03 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Codebuff](https://github.com/CodebuffAI/codebuff) | 14258 | 2026-11-21 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [MiMo Code](https://github.com/XiaomiMiMo/MiMo-Code) | 13798 | 2026-11-21 | MIT | new, flagged: unner: non-interactive mode, worktrees |
| Open Source | [Trae Agent](https://github.com/bytedance/trae-agent) | 12212 | 2026-02-05 | MIT | already read (Trae Agent (ByteDance)) |
| Open Source | [Smol Developer](https://github.com/smol-ai/developer) | 12167 | 2024-04-07 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Kimi CLI](https://github.com/MoonshotAI/kimi-cli) | 11405 | 2026-09-22 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Claude Engineer](https://github.com/Doriandarko/claude-engineer) | 11230 | 2024-12-12 |  | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Claurst](https://github.com/Kuberwastaken/claurst) | 10349 | 2026-10-26 | GPL-3.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Free Code](https://github.com/paoloanzn/free-code) | 8832 | 2026-07-29 |  | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Kimi Code](https://github.com/MoonshotAI/kimi-code) | 8273 | 2026-11-21 | MIT | new, flagged: unner: event-sourced runtime, another model family |
| Open Source | [ForgeCode](https://github.com/antinomyhq/forge) | 7636 | 2026-11-21 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [OpenSquilla](https://github.com/opensquilla/opensquilla) | 7158 | 2026-11-20 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [ANUS](https://github.com/anus-dev/anus) | 6558 | 2026-10-01 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Mistral Vibe](https://github.com/mistralai/mistral-vibe) | 5443 | 2026-11-20 | Apache-2.0 | already read (Mistral Vibe CLI) |
| Open Source | [Kode CLI](https://github.com/shareAI-lab/Kode-cli) | 5237 | 2026-11-02 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [gptme](https://github.com/gptme/gptme) | 4490 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [BitFun](https://github.com/GCWing/BitFun) | 4102 | 2026-11-20 | MIT | new, flagged: unner: non-interactive exec |
| Open Source | [Every Code](https://github.com/just-every/code) | 4054 | 2026-10-29 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Letta Code](https://github.com/letta-ai/letta-code) | 3887 | 2026-11-21 | Apache-2.0 | already read (Letta / Letta Code) |
| Open Source | [Atomic Agent](https://github.com/AtomicBot-ai/atomic-agent) | 3588 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Grok CLI](https://github.com/superagent-ai/grok-cli) | 3514 | 2026-07-06 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Devon](https://github.com/entropy-research/Devon) | 3452 | 2025-05-26 | AGPL-3.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [AutoCodeRover](https://github.com/AutoCodeRoverSG/auto-code-rover) | 3105 | 2026-11-01 | NOASSERTION | already read (Research SWE agents: AutoCodeRover (primary), Agentless, Moa) |
| Open Source | [Tau](https://github.com/huggingface/tau) | 3067 | 2026-11-20 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Nanocoder](https://github.com/Nano-Collective/nanocoder) | 2582 | 2026-11-21 | NOASSERTION | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [CodeMachine-CLI](https://github.com/moazbuilds/CodeMachine-CLI) | 2517 | 2026-02-25 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Codel](https://github.com/semanser/codel) | 2474 | 2024-04-29 | AGPL-3.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [open-codex](https://github.com/ymichael/open-codex) | 2379 | 2025-05-03 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [RA.Aid](https://github.com/ai-christianson/RA.Aid) | 2223 | 2026-01-30 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Agentless](https://github.com/OpenAutoCoder/Agentless) | 2138 | 2024-12-22 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Amazon Q Developer CLI](https://github.com/aws/amazon-q-developer-cli) | 1985 | 2026-08-24 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Ouroboros](https://github.com/razzant/ouroboros) | 1690 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Empryo](https://github.com/proxysoul/Empryo) | 1633 | 2026-11-18 | NOASSERTION | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Neovate Code](https://github.com/neovateai/neovate-code) | 1557 | 2026-03-24 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Maki](https://github.com/tontinton/maki) | 1446 | 2026-11-20 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Tianshu Harness](https://github.com/huiliyi37/Tianshu-harness) | 1359 | 2026-11-21 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Pydantic Deep Agents](https://github.com/vstorm-co/pydantic-deepagents) | 1125 | 2026-10-30 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [hax](https://github.com/OleksandrChekhovskyi/hax) | 1006 | 2026-11-13 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [VT Code](https://github.com/vinhnx/vtcode) | 915 | 2026-11-21 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Dulus](https://github.com/KevRojo/Dulus) | 932 | 2026-11-21 | GPL-3.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Groq Code CLI](https://github.com/build-with-groq/groq-code-cli) | 748 | 2025-12-19 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Tura](https://github.com/Tura-AI/tura) | 670 | 2026-10-07 | AGPL-3.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Dexto](https://github.com/truffle-ai/dexto) | 661 | 2026-11-19 | NOASSERTION | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Octomind](https://github.com/muvon/octomind) | 644 | 2026-11-21 | Apache-2.0 | new, flagged: unner: piped/daemon/WebSocket modes |
| Open Source | [mu](https://github.com/qybaihe/mu) | 615 | 2026-11-19 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [agentty](https://github.com/1ay1/agentty) | 559 | 2026-11-20 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [claw-code-agent](https://github.com/HarnessLab/claw-code-agent) | 548 | 2026-06-22 |  | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [g3](https://github.com/dhanji/g3) | 521 | 2026-11-18 |  | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Orca](https://github.com/echoVic/orca-agent) | 519 | 2026-11-19 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [cecli](https://github.com/cecli-dev/cecli) | 424 | 2026-11-19 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Memdoor](https://github.com/guregodevo/memdoor) | 417 | 2026-11-20 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [zot](https://github.com/patriceckhart/zot) | 372 | 2026-11-20 | MIT | new, flagged: unner: JSON/RPC modes |
| Open Source | [Coro Code](https://github.com/Blushyes/coro-code) | 370 | 2025-10-30 |  | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [LettaBot](https://github.com/letta-ai/lettabot) | 328 | 2026-05-25 | Apache-2.0 | new, left to the andyrewlee-list agent: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Mini-Kode](https://github.com/minmaxflow/mini-kode) | 305 | 2026-11-03 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [rpi](https://github.com/bigfish1913/pi-rust) | 292 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Mixdog](https://github.com/tribgames/mixdog) | 259 | 2026-11-20 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Alysis Code](https://github.com/AlysisAi/AlysisCode) | 229 | 2026-11-20 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Autopilot](https://github.com/directionally-local/autopilot) | 221 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [OpenAgentd](https://github.com/lthoangg/openagentd) | 217 | 2026-11-20 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [VibePod](https://github.com/VibePod/vibepod-cli) | 199 | 2026-11-20 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [nori-cli](https://github.com/tilework-tech/nori-cli) | 194 | 2026-11-20 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [SpineCodex](https://github.com/GhabiX/SpineCodex) | 152 | 2026-11-19 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [San](https://github.com/genai-io/san) | 120 | 2026-11-21 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [AgenC Core](https://github.com/tetsuo-ai/agenc-core) | 143 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Waveloom](https://github.com/Menfre01/waveloom) | 139 | 2026-11-09 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [cursor-agent](https://github.com/civai-technologies/cursor-agent) | 136 | 2026-11-11 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [DvalinCode](https://github.com/arthurpanhku/dvalincode) | 121 | 2026-11-20 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [3code](https://github.com/capocasa/3code) | 120 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Codex Infinity](https://github.com/lee101/codex-infinity) | 105 | 2026-11-18 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [openHarness](https://github.com/zhijiewong/openharness) | 100 | 2026-05-12 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Keen Code](https://github.com/mochow13/keen-code) | 92 | 2026-11-19 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Martty](https://github.com/openma-ai/Martty) | 83 | 2026-11-18 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Crab Code](https://github.com/lingcoder/crab-code) | 77 | 2026-11-09 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Smelt](https://github.com/leonardcser/smelt) | 73 | 2026-11-18 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [picocode](https://github.com/jondot/picocode) | 64 | 2026-01-30 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Jazz](https://github.com/lvndry/jazz) | 55 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [killi](https://github.com/timwuhaotian/killi) | 55 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [QQCode](https://github.com/qnguyen3/qqcode) | 54 | 2026-01-13 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [OB-1](https://github.com/Overbrilliant/ob-1) | 41 | 2026-11-18 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Zap](https://github.com/zap-coding-agent/zap-coding-agent) | 38 | 2026-10-04 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Nausicaa](https://github.com/jackispm/nausicaa-harness) | 33 | 2026-10-03 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Grinta](https://github.com/josephsenior/Grinta-Coding-Agent) | 33 | 2026-11-18 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Mercury CLI](https://github.com/Whq02/MercuryCLI) | 31 | 2026-11-16 | Apache-2.0 | new, left to the andyrewlee-list agent: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Hazzel](https://github.com/mukundzha/hazzel) | 30 | 2026-10-29 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Kolega Code](https://github.com/kolega-ai/kolega-code) | 22 | 2026-11-21 | NOASSERTION | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Binharic](https://github.com/CogitatorTech/binharic-cli) | 19 | 2025-11-01 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [opencode-rust](https://github.com/vakandi/opencode-rust) | 15 | 2026-10-30 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [memcode](https://github.com/memcode-ai/memcode) | 20 | 2026-11-18 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Darce](https://github.com/AmerSarhan/darce-cli) | 11 | 2026-11-13 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [slash-agent](https://github.com/akatzmann/slash-agent) | 11 | 2026-11-08 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Forge (Norvia Labs)](https://github.com/NorviaLabs/forge) | 8 | 2026-11-18 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [CLAII](https://github.com/agencyswarm/CLAII) | 6 | 2025-11-17 |  | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Forge Harness](https://github.com/andreglegg/forge) | 6 | 2026-11-19 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [AshlrCode](https://github.com/ashlrai/ashlrcode) | 5 | 2026-11-15 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [ipsupport-code](https://github.com/ipsupport-llc/ipsupport-code) | 5 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Ferrum](https://github.com/ominiverdi/ferrum) | 4 | 2026-11-08 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [MoCode](https://github.com/wanxunyang/mocode) | 3 | 2026-11-20 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [WorkGround2](https://github.com/KiddPhenix/WorkGround2) | 2 | 2026-10-19 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Kolkrabbi](https://github.com/onembyte/kolkrabbi) | 2 | 2026-10-08 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [ucode](https://github.com/sppideey/ucode-agent) | 2 | 2026-10-06 | AGPL-3.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [one-agent](https://github.com/noxgle/one) | 2 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [Minicode](https://github.com/startupmini/minicode) | 2 | 2026-11-21 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [molt](https://github.com/solvyxtech/molt) | 2 | 2026-10-08 | Apache-2.0 | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| Open Source | [LocalCodeForge](https://github.com/BMDPLAinsong/LocalCodeForge) | 1 | 2026-10-18 | MIT | new, dropped: single-agent CLI; no orchestrator or web UI; Claude Code and Codex already chosen |
| OpenClaw ecosystem | [OpenClaw](https://github.com/openclaw/openclaw) | 394947 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [nanobot](https://github.com/HKUDS/nanobot) | 50249 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) | 33550 | 2026-11-21 | Apache-2.0 | new, left to the andyrewlee-list agent: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [NanoClaw](https://github.com/gavrielc/nanoclaw) | 31133 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [PicoClaw](https://github.com/sipeed/picoclaw) | 30147 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [IronClaw](https://github.com/nearai/ironclaw) | 12716 | 2026-11-09 | Apache-2.0 | new, left to the andyrewlee-list agent: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [NullClaw](https://github.com/nullclaw/nullclaw) | 8237 | 2026-10-08 | MIT | new, left to the andyrewlee-list agent: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [Clawith](https://github.com/dataelement/Clawith) | 4194 | 2026-08-27 | Apache-2.0 | new, dropped: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [claw0](https://github.com/shareAI-lab/claw0) | 3449 | 2026-06-30 |  | new, dropped: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [Moltis](https://github.com/moltis-org/moltis) | 2978 | 2026-10-23 | MIT | new, dropped: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [GitClaw](https://github.com/open-gitagent/gitclaw) | 755 | 2026-11-08 | MIT | new, dropped: personal assistant runtime, not SDLC |
| OpenClaw ecosystem | [LionClaw](https://github.com/moshthepitt/lionclaw) | 19 | 2026-10-01 | MIT | new, left to the andyrewlee-list agent: personal assistant runtime, not SDLC |
| Closed Source | [Claude Code](https://github.com/anthropics/claude-code) | 156506 | 2026-11-21 |  | already read (Anthropic Claude Code cloud-session git proxy (reference, is) |
| Closed Source | [Warp](https://github.com/warpdotdev/Warp) | 66070 | 2026-11-21 | AGPL-3.0 | new, dropped: proprietary CLI |
| Closed Source | [GitHub Copilot in the CLI](https://github.com/github/copilot-cli) | 11445 | 2026-11-21 | NOASSERTION | new, flagged: unner: headless mode, another model family |
| Closed Source | [Command Code](https://github.com/CommandCodeAI/command-code) | 4255 | 2026-11-18 |  | new, dropped: proprietary CLI |
| Closed Source | [Ante](https://github.com/AntigmaLabs/ante-preview) | 2048 | 2026-11-20 | Apache-2.0 | new, dropped: proprietary CLI |
| Closed Source | [pool](https://github.com/poolsideai/pool) | 449 | 2026-08-18 |  | new, flagged: unner: headless pool exec, ACP |
| Closed Source | [Auggie](https://github.com/augmentcode/auggie) | 295 | 2026-11-20 | NOASSERTION | new, flagged: unner: headless --print for CI |
| Closed Source | [Droid](https://github.com/Factory-AI/factory) | 100 | 2026-11-20 |  | new, dropped: proprietary CLI |
| Closed Source | [TheGitAI](https://github.com/thegitai/thegitai-cli) | 6 | 2026-11-15 | NOASSERTION | new, dropped: proprietary CLI |
| Closed Source | [FetchCoder](https://github.com/fetchai/fetchcoder-releases) | 2 | 2025-12-29 |  | new, dropped: proprietary CLI |
| Closed Source | [Amp](https://sourcegraph.com/amp) |  |  |  | already read (non-GitHub product, matched by name) |
| Closed Source | [Junie CLI](https://junie.jetbrains.com) |  |  |  | new, dropped: proprietary CLI |
| Closed Source | [Cortex Code CLI](https://www.snowflake.com/en/product/cortex-code/) |  |  |  | new, dropped: proprietary CLI |
| Closed Source | [Devin](https://devin.ai) |  |  |  | already read (non-GitHub product, matched by name) |
| Closed Source | [Cursor CLI](https://cursor.com/cli) |  |  |  | new, dropped: proprietary CLI |
| Closed Source | [Tabnine CLI](https://docs.tabnine.com/main/getting-started/tabnine-cli) |  |  |  | new, dropped: proprietary CLI |
| Closed Source | [Yaw](https://yaw.sh) |  |  |  | new, dropped: proprietary CLI |
| Closed Source | [Muse Code](https://dev.meta.ai/docs/muse-code) |  |  |  | new, dropped: proprietary CLI |
| Session managers & parallel  | [Orca (Stably)](https://github.com/stablyai/orca) | 131391 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Multica](https://github.com/multica-ai/multica) | 56990 | 2026-11-21 | NOASSERTION | already read (Multica (multica-ai/multica)) |
| Session managers & parallel  | [herdr](https://github.com/herdrdev/herdr) | 52118 | 2026-11-19 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [AionUi](https://github.com/iOfficeAI/AionUi) | 34419 | 2026-11-05 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [cmux](https://github.com/manaflow-ai/cmux) | 28843 | 2026-11-21 | NOASSERTION | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [vibe-kanban](https://github.com/BloopAI/vibe-kanban) | 28764 | 2026-11-15 | Apache-2.0 | already read (Vibe Kanban) |
| Session managers & parallel  | [Happy](https://github.com/slopus/happy) | 24740 | 2026-11-20 | MIT | already read (Happy / HAPI / opcode / claudecodeui (remote clients for Cla) |
| Session managers & parallel  | [Paseo](https://github.com/getpaseo/paseo) | 24565 | 2026-11-21 | NOASSERTION | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Paradev](https://github.com/ParadevAI/Paradev) | 16439 | 2026-11-21 | MIT | already read (Parallel-agent desktop managers: Paradev (formerly Superset)) |
| Session managers & parallel  | [Agent Orchestrator (AO)](https://github.com/OrchestratorInc/agent-orchestrator) | 14980 | 2026-11-21 | Apache-2.0 | already read (Agent Orchestrator (Orchestrator.inc, OrchestratorInc/agent-) |
| Session managers & parallel  | [Orkas](https://github.com/Orkas-AI/Orkas) | 9495 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Claude Squad](https://github.com/smtg-ai/claude-squad) | 8845 | 2026-11-13 | AGPL-3.0 | already read |
| Session managers & parallel  | [Emdash](https://github.com/generalaction/emdash) | 6288 | 2026-11-20 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [agent-of-empires](https://github.com/njbrake/agent-of-empires) | 4591 | 2026-11-21 | MIT | new, flagged: TUI plus mobile web UI, Docker sandbox option; session manager, no tracker stages |
| Session managers & parallel  | [CodexMonitor](https://github.com/Dimillian/CodexMonitor) | 4369 | 2026-03-26 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Toad](https://github.com/batrachianai/toad) | 3509 | 2026-05-26 | AGPL-3.0 | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [qwen-audio-agent](https://github.com/QwenAudio/qwen-audio-agent) | 3262 | 2026-11-18 | Apache-2.0 | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Crystal](https://github.com/stravu/crystal) | 3129 | 2026-02-26 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Agent Teams AI](https://github.com/777genius/agent-teams-ai) | 2521 | 2026-11-21 | AGPL-3.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [supacode](https://github.com/supabitapp/supacode) | 2401 | 2026-11-19 | NOASSERTION | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Codync](https://github.com/leepokai/Codync) | 2367 | 2026-11-21 | Apache-2.0 | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Happier](https://github.com/happier-dev/happier) | 2253 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Cate](https://github.com/0-AI-UG/cate) | 2247 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Nimbalyst](https://github.com/nimbalyst/nimbalyst) | 2095 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [mux](https://github.com/coder/mux) | 2081 | 2026-11-21 | AGPL-3.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [CLI Agent Orchestrator (CAO)](https://github.com/awslabs/cli-agent-orchestrator) | 1615 | 2026-11-21 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [jean](https://github.com/coollabsio/jean) | 1430 | 2026-11-20 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [agent-deck](https://github.com/asheshgoplani/agent-deck) | 1283 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Parallel Code](https://github.com/johannesjo/parallel-code) | 1101 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Agent Sessions](https://github.com/jazzyalex/agent-sessions) | 953 | 2026-11-19 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [agent-manager](https://github.com/YoanWai/agent-manager) | 701 | 2026-11-20 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [hcom](https://github.com/aannoo/hcom) | 665 | 2026-10-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [AgentBox](https://github.com/madarco/agentbox) | 584 | 2026-11-19 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [amux](https://github.com/mixpeek/amux) | 567 | 2026-11-21 | NOASSERTION | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Vicoa](https://github.com/vicoa-ai/vicoa) | 545 | 2026-11-21 | AGPL-3.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Proliferate](https://github.com/proliferate-ai/proliferate) |  |  |  | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [ntm](https://github.com/Dicklesworthstone/ntm) | 465 | 2026-11-21 | NOASSERTION | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [wmux](https://github.com/openwong2kim/wmux) | 458 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Agentbox](https://github.com/savannahfeder/agentbox) | 449 | 2026-11-21 | GPL-3.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Dodaios](https://github.com/Dodaios/Dodaios) | 448 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Calyx](https://github.com/yuuichieguchi/Calyx) | 367 | 2026-10-23 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [agentglass](https://github.com/SirAllap/agentglass) | 349 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [MulmoTerminal](https://github.com/receptron/mulmoterminal) | 275 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [vibe-tree](https://github.com/sahithvibudhi/vibe-tree) | 273 | 2026-07-25 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Ivy Tendril](https://github.com/Ivy-Interactive/Ivy-Tendril) | 203 | 2026-09-15 | NOASSERTION | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Tempest](https://github.com/tempestai-dev/tempest) | 200 | 2026-11-13 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Rove](https://github.com/Sma1lboy/rove) | 188 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Pi GPUI](https://github.com/bytesbay/pi-gpui) | 187 | 2026-11-18 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [amux](https://github.com/andyrewlee/amux) | 168 | 2026-11-19 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [CliDeck](https://github.com/rustykuntz/clideck) | 162 | 2026-10-30 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Open Walnut](https://github.com/EvanZhang008/open-walnut) | 140 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [GridBash](https://github.com/jasonsuhari/gridbash) | 131 | 2026-11-20 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [ADHDev](https://github.com/vilmire/adhdev) | 123 | 2026-11-12 | AGPL-3.0 | new, flagged: self-hosted daemon plus web dashboard with approvals; AGPL |
| Session managers & parallel  | [tlbx](https://github.com/tlbx-ai/tlbx) | 119 | 2026-11-20 | AGPL-3.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Helicon](https://github.com/HarjjotSinghh/helicon) | 115 | 2026-11-19 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [ReevesAgents](https://github.com/mertkayacs/reevesagents) | 107 | 2026-11-20 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Garcon](https://github.com/cfal/garcon) | 105 | 2026-11-21 | NOASSERTION | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [intentic](https://github.com/intentic/intentic) | 97 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [vibepanel](https://github.com/jiangmuran/vibepanel) | 178 | 2026-11-20 | NOASSERTION | new, flagged: self-hosted web console for many Claude Code/Codex sessions |
| Session managers & parallel  | [Friday](https://github.com/splashxmoon/friday) | 84 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Shelly](https://github.com/RYOITABASHI/Shelly) | 74 | 2026-11-21 | GPL-3.0 | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Codealong](https://github.com/codealong/codealong) | 72 | 2026-11-21 | Apache-2.0 | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [showagent](https://github.com/aytzey/showagent) | 68 | 2026-11-16 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Agent AFK](https://github.com/griffinwork40/agent-afk) | 64 | 2026-11-21 | Apache-2.0 | new, flagged: unner: built for unattended cron/headless runs |
| Session managers & parallel  | [run-kit](https://github.com/sahil87/run-kit) | 63 | 2026-11-21 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [summon](https://github.com/juan294/summon) | 61 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Clave](https://github.com/codika-io/clave) | 52 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Podium ADE](https://github.com/madeinorbit/podium) | 51 | 2026-11-20 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Caprock](https://github.com/dspv/caprock) | 50 | 2026-11-20 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [swe-mux](https://github.com/jatoran/swe-mux) | 43 | 2026-11-09 | Apache-2.0 | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Superagent](https://github.com/pungme/superagent-desktop) | 37 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [TermFold](https://github.com/Bibarud/TermFold) | 36 | 2026-10-01 | Apache-2.0 | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [nsq](https://github.com/glmn-ai/neurosquad-cli) | 31 | 2026-10-26 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Perch](https://github.com/asafofer/perch) | 31 | 2026-11-16 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [agents-cli](https://github.com/phnx-labs/agents-cli) | 27 | 2026-11-16 | NOASSERTION | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Podiom](https://github.com/Podiom/Podiom) | 24 | 2026-11-21 | MIT | new, flagged: self-hosted control plane, web UI; 24 stars |
| Session managers & parallel  | [repomon](https://github.com/AliHamzaAzam/repomon) | 24 | 2026-10-04 | Apache-2.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Claudescope](https://github.com/vladar107/claudescope) | 22 | 2026-11-18 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Polter](https://github.com/Lugia123/polter) | 23 | 2026-11-12 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [construct](https://github.com/construct-worlds/construct) | 21 | 2026-10-26 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Solenta](https://github.com/currentbits/solenta) | 20 | 2026-11-19 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [CLITrigger](https://github.com/HyperAITeam/CLITrigger) | 16 | 2026-11-20 | MIT | new, flagged: self-hosted web UI, worktrees, Jira mention |
| Session managers & parallel  | [Agent Workbench](https://github.com/cvelasquez/agent-workbench) | 14 | 2026-11-21 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [pi-boss](https://github.com/skyfallsin/pi-boss) | 12 | 2026-04-25 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [AgentTerm](https://github.com/albertwujj/agent-term) | 12 | 2026-11-20 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Agent Fleet (k-k1)](https://github.com/k-k1/agent-fleet) | 12 | 2026-11-21 | Apache-2.0 | new, flagged: self-hosted web console in Docker; 12 stars |
| Session managers & parallel  | [Alchemist Coder](https://github.com/Alekla0126/alchemist-coder) | 10 | 2026-11-04 | AGPL-3.0 | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [TaskHandoff](https://github.com/edgestorage/task-handoff) | 11 | 2026-11-21 | Apache-2.0 | already read |
| Session managers & parallel  | [tmuxlet](https://github.com/CodefiLabs/tmuxlet) | 8 | 2026-11-02 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [cliclaw](https://github.com/choiyounggi/cliclaw) | 7 | 2026-10-09 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [iris](https://github.com/itzenata/iris-tui) | 6 | 2026-07-08 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Agent 007](https://github.com/bill10/agent-007) | 6 | 2026-11-11 | MIT | new, deep-read: 3/10 (l2/deep-agent-007.md) |
| Session managers & parallel  | [Phantom](https://github.com/ashlrai/phantom) | 6 | 2026-11-21 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [mix2](https://github.com/elleryfamilia/mix2) | 5 | 2026-08-28 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [taskpods](https://github.com/yanairon/taskpods) | 5 | 2026-10-08 | MIT | new, left to the andyrewlee-list agent: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Claudette](https://github.com/Olorin-ai-git/claudette) | 3 | 2026-10-11 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Agent CLI Menu](https://github.com/roypadina/AgentCliMenu) | 3 | 2026-11-18 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [tring](https://github.com/matogen/tring.chat) | 2 | 2026-11-21 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Peekumi](https://github.com/tee-jagz/peekumi) | 2 | 2026-11-10 | Apache-2.0 | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [postmortemthis](https://github.com/Softeria/postmortemthis) | 1 | 2026-11-15 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [AgentX](https://github.com/ArcheMind/agentx) | 0 | 2026-11-21 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [clisweave](https://github.com/uhuntu/clisweave) | 0 | 2026-11-20 | MIT | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [PATAPIM](https://patapim.ai) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Bwee](https://bwee.app) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Even](https://even.dev) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Unpeel](https://unpeel.com) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [defract](https://defract.dev) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [CodeAgentSwarm](https://www.codeagentswarm.com) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [TermLink](https://www.getterm.link) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [VibeFuse](https://fuseintelligence.org/products/vibefuse) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Buzzpot](https://buzzpot.app) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Overboard](https://tryoverboard.com/) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [VibeiDE](https://vibeide.dev/) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [Sourceweave](https://sourceweave.app) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Session managers & parallel  | [harnsy](https://harnsy.dev) |  |  |  | new, dropped: desktop/TUI session manager; no tracker intake or stage gates |
| Orchestrators & autonomous l | [DeerFlow](https://github.com/bytedance/deer-flow) | 85567 | 2026-11-21 | MIT | already read (DeerFlow 2.0 (ByteDance)) |
| Orchestrators & autonomous l | [claude-flow](https://github.com/ruvnet/claude-flow) | 82190 | 2026-11-21 | MIT | already read (Ruflo (formerly Claude Flow)) |
| Orchestrators & autonomous l | [Symphony](https://github.com/openai/symphony) | 28112 | 2026-09-15 | Apache-2.0 | already read (OpenAI Symphony) |
| Orchestrators & autonomous l | [gastown](https://github.com/steveyegge/gastown) | 18858 | 2026-11-14 | MIT | already read (Gas Town (gastownhall/gastown)) |
| Orchestrators & autonomous l | [Omnigent](https://github.com/omnigent-ai/omnigent) | 11475 | 2026-11-21 | Apache-2.0 | already read (omnigent) |
| Orchestrators & autonomous l | [Raven](https://github.com/EverMind-AI/Raven) | 6278 | 2026-11-21 | Apache-2.0 | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Kiro Crew](https://github.com/kirodotdev/KiroCrew) | 5021 | 2026-11-21 | Apache-2.0 | new, flagged: web dashboard, unattended task runner with checkpoint resume; drives kiro-cli only |
| Orchestrators & autonomous l | [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) | 3206 | 2026-11-13 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [ralph-tui](https://github.com/subsy/ralph-tui) | 2474 | 2026-11-04 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [zeroshot](https://github.com/the-open-engine/zeroshot) | 2211 | 2026-11-21 | MIT | already read (Zeroshot (the-open-engine/zeroshot)) |
| Orchestrators & autonomous l | [Traycer](https://github.com/traycerai/traycer) | 1766 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [loom](https://github.com/ghuntley/loom) | 1668 | 2026-11-16 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [oh-my-agent](https://github.com/first-fluke/oh-my-agent) | 1473 | 2026-11-20 | MIT | new, flagged: stop-hook gates, artifact verification, independent judges across Claude Code/Codex |
| Orchestrators & autonomous l | [Agentlas OS](https://github.com/agentlas-ai/Agentlas-OS) | 1400 | 2026-11-21 | Apache-2.0 | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Bernstein](https://github.com/chernistry/bernstein) | 1217 | 2026-11-21 | Apache-2.0 | already read |
| Orchestrators & autonomous l | [Loki Mode](https://github.com/asklokesh/loki-mode) | 1120 | 2026-11-21 | NOASSERTION | already read (Loki Mode (asklokesh/loki-mode)) |
| Orchestrators & autonomous l | [h5i](https://github.com/h5i-dev/h5i) | 936 | 2026-11-20 | Apache-2.0 | new, flagged: runs Claude Code and Codex on one task in sandboxes, peer review plus neutral verifier |
| Orchestrators & autonomous l | [CodeAF](https://github.com/Agent-Field/CodeAF) | 814 | 2026-11-21 | Apache-2.0 | new, deep-read: 4/10 (l2/deep-codeaf.md) |
| Orchestrators & autonomous l | [Aeon](https://github.com/aeonfun/aeon) | 796 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [fractal](https://github.com/plasma-ai/fractal) | 797 | 2026-11-05 | Apache-2.0 | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Claudexor](https://github.com/razzant/claudexor) | 525 | 2026-11-21 | MIT | already read |
| Orchestrators & autonomous l | [Genie](https://github.com/automagik-si/genie) | 354 | 2026-11-20 | Apache-2.0 | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [MartinLoop](https://github.com/Keesan12/martin-loop) | 263 | 2026-11-19 | Apache-2.0 | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Orbi](https://github.com/orbi-build/orbi) | 260 | 2026-11-21 | AGPL-3.0 | already read |
| Orchestrators & autonomous l | [Ordewell](https://github.com/ordewell/ordewell) | 211 | 2026-11-21 | Apache-2.0 | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [outsourcerer](https://github.com/alexgreensh/outsourcerer) | 199 | 2026-11-20 | NOASSERTION | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [ORCH](https://github.com/oxgeneral/ORCH) | 182 | 2026-11-18 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [LoopTroop](https://github.com/looptroop-ai/LoopTroop) | 181 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [OMK](https://github.com/dmae97/open-multi-agent-kit) | 153 | 2026-11-21 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [kodo](https://github.com/ikamensh/kodo) | 139 | 2026-09-26 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [wreckit](https://github.com/mikehostetler/wreckit) | 129 | 2026-04-14 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [5dive](https://github.com/5dive-ai/5dive) | 123 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [great_cto](https://github.com/avelikiy/great_cto) |  |  |  | new, dropped: repo not reachable via gh |
| Orchestrators & autonomous l | [Crewly](https://github.com/stevehuang0115/crewly) | 92 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [OpenCastle](https://github.com/monkilabs/opencastle) | 81 | 2026-11-20 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [The Factory](https://github.com/akashgit/remote-factory) | 75 | 2026-11-21 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Frink](https://github.com/benord-labs/frink) | 64 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Forge](https://github.com/LucasDuys/forge) | 57 | 2026-07-15 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Agon](https://github.com/AutoResearch-Factory/Agon) | 57 | 2026-10-06 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Crewplane](https://github.com/crewplaneai/crewplane) | 56 | 2026-11-16 | Apache-2.0 | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Delegatus](https://github.com/Latand/delegatus) | 40 | 2026-11-21 | MIT | already read |
| Orchestrators & autonomous l | [Aixle Flow](https://github.com/AixleHQ/flow) | 39 | 2026-11-21 | Apache-2.0 | new, deep-read: 7/10 (l2/deep-aixle-flow.md) |
| Orchestrators & autonomous l | [fab-kit](https://github.com/sahil87/fab-kit) | 35 | 2026-11-20 | MIT | new, flagged: intake->plan->apply->review pipeline with confidence gating; 35 stars |
| Orchestrators & autonomous l | [NEEDLE](https://github.com/jedarden/NEEDLE) | 34 | 2026-11-13 | MIT | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [agx](https://github.com/ramarlina/agx) | 33 | 2026-05-06 |  | new, left to the andyrewlee-list agent: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [ralph-harness](https://github.com/rxdt/py_ralph_frame) | 28 | 2026-11-12 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [TeDDy](https://github.com/atte500/TeDDy) | 29 | 2026-11-19 | AGPL-3.0 | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Galley](https://github.com/shinpr/galley) | 21 | 2026-11-13 | MIT | new, flagged: supervisor checks acceptance criteria, retry/escalate limits, worktree, PR handoff; daemon, no web UI |
| Orchestrators & autonomous l | [xcb](https://github.com/hraness/xcb) | 14 | 2026-11-02 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Vibestrate](https://github.com/guyshonshon/vibestrate) | 6 | 2026-10-21 | Apache-2.0 | new, flagged: YAML phases plan->implement->validate->review->fix; 6 stars |
| Orchestrators & autonomous l | [Ralph Workflow](https://github.com/Ralph-Workflow/Ralph-Workflow) | 6 | 2026-11-21 | AGPL-3.0 | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [brgr](https://github.com/justn-hyeok/brgr) | 5 | 2026-11-17 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Relay](https://github.com/jcast90/relay) | 5 | 2026-07-11 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [sage](https://github.com/youwangd/SageCLI) | 5 | 2026-04-27 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [baya-cli](https://github.com/dephelion/baya-cli) | 5 | 2026-09-10 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [workkit](https://github.com/ITW-Creative-Works/workkit) | 4 | 2026-11-20 | NOASSERTION | new, flagged: GitHub Issues pipeline as a Claude Code plugin; 4 stars |
| Orchestrators & autonomous l | [DevPilot](https://github.com/geastham/devpilot) | 2 | 2026-10-25 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [the-perfect-orchestrator](https://github.com/daman8271/the-perfect-orchestrator) | 1 | 2026-06-30 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Code-Crafter](https://github.com/anandgupta193/code-crafter) |  |  |  | new, flagged: Jira/Slack->PR, disposable Docker per ticket; repo not reachable via gh |
| Orchestrators & autonomous l | [AIWorks](https://github.com/netbka/aiworks) | 1 | 2026-11-21 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Dev Agent Autopilot](https://github.com/iammurtaza53/dev-agent-autopilot) | 0 | 2026-10-11 | MIT | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Orchestrators & autonomous l | [Wayari](https://wayari.com/) |  |  |  | new, dropped: local loop/orchestrator; no web UI, tracker intake or human gates |
| Agent infrastructure | [Headroom](https://github.com/headroomlabs-ai/headroom) | 80233 | 2026-11-20 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [OpenCodeReview](https://github.com/alibaba/open-code-review) | 54911 | 2026-11-21 | Apache-2.0 | new, flagged: review CLI (55k stars) usable as the stage-5 reviewer |
| Agent infrastructure | [agent-browser](https://github.com/vercel-labs/agent-browser) | 53133 | 2026-11-21 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [OpenViking](https://github.com/volcengine/OpenViking) | 42553 | 2026-11-21 | AGPL-3.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [claude-code-router](https://github.com/musistudio/claude-code-router) | 38281 | 2026-11-16 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Beads](https://github.com/gastownhall/beads) | 28880 | 2026-11-21 | MIT | already read (Beads (bd)) |
| Agent infrastructure | [OpenWork](https://github.com/different-ai/openwork) | 24574 | 2026-11-21 | NOASSERTION | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [NemoClaw](https://github.com/NVIDIA/NemoClaw) | 23059 | 2026-11-21 | Apache-2.0 | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [OpenCodex](https://github.com/lidge-jun/opencodex) | 18691 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [OpenWiki](https://github.com/langchain-ai/openwiki) | 18046 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Agent Executor (AX)](https://github.com/google/ax) | 14826 | 2026-11-21 | Apache-2.0 | already read (AX (Agent Executor, Google)) |
| Agent infrastructure | [Codex Security](https://github.com/openai/codex-security) | 14238 | 2026-11-21 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Camofox Browser](https://github.com/jo-inc/camofox-browser) | 12435 | 2026-11-10 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [BrowserSkill](https://github.com/Tencent/BrowserSkill) | 10626 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [deepsec](https://github.com/vercel-labs/deepsec) | 8483 | 2026-11-20 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [GitHub Agentic Workflows](https://github.com/github/gh-aw) | 5670 | 2026-11-21 | MIT | already read (GitHub Agentic Workflows (gh-aw)) |
| Agent infrastructure | [Weave Router](https://github.com/weave-os/router) | 5625 | 2026-11-21 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Docker Agent](https://github.com/docker/docker-agent) | 4696 | 2026-11-21 | Apache-2.0 | already read (Docker Agent (formerly cagent)) |
| Agent infrastructure | [open-claude-cowork](https://github.com/ComposioHQ/open-claude-cowork) | 4321 | 2026-05-23 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [toprank](https://github.com/nowork-studio/toprank) | 4284 | 2026-11-17 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [OneCLI](https://github.com/onecli/onecli) | 3648 | 2026-11-09 | Apache-2.0 | new, flagged: credential vault/gateway injecting keys so agents never hold them (sandbox credential brokering) |
| Agent infrastructure | [token-optimizer](https://github.com/alexgreensh/token-optimizer) | 3037 | 2026-11-19 | NOASSERTION | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Webcmd](https://github.com/agentrhq/webcmd) | 2792 | 2026-10-20 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Claude Code Tools](https://github.com/pchalasani/claude-code-tools) | 2040 | 2026-11-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [deja-vu](https://github.com/vshulcz/deja-vu) | 1640 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Concord MCP](https://github.com/Get-Concord-AI/concord-mcp) | 1452 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [OpenQodex](https://github.com/openqodex/openqodex) | 1194 | 2026-11-20 | Apache-2.0 | new, flagged: separate reviewer process for agent output |
| Agent infrastructure | [numbat](https://github.com/perplexityai/numbat) | 1175 | 2026-11-20 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [HOL Guard](https://github.com/hashgraph-online/hol-guard) | 1117 | 2026-11-21 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [ThinkWatch Lite](https://github.com/ThinkWatchProject/ThinkWatch-Lite) | 946 | 2026-11-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [OrcaReplay](https://github.com/Continuum-AI-Corp/OrcaReplay) | 1074 | 2026-10-01 | Apache-2.0 | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [agent-qa](https://github.com/vostride/agent-qa) | 819 | 2026-11-20 | NOASSERTION | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AgentSight](https://github.com/eunomia-bpf/AgentSight) | 802 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Tracekit](https://github.com/Cygnux-Labs/Tracekit) | 760 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Vestige](https://github.com/samvallad33/vestige) | 662 | 2026-11-20 | AGPL-3.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [SandBase Harness](https://github.com/sandbaseai/sandbase-harness) | 643 | 2026-11-18 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Coasts](https://github.com/coast-guard/coasts) | 435 | 2026-04-28 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AgentBridge](https://github.com/raysonmeng/agent-bridge) | 435 | 2026-11-20 | MIT | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [subtask](https://github.com/zippoxer/subtask) | 338 | 2026-10-31 | MIT | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [claude-cmd](https://github.com/kiliczsh/claude-cmd) | 319 | 2026-08-28 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Emulo](https://github.com/ohad6k/emulo) | 306 | 2026-10-12 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Browsentic](https://github.com/imshaikot/browsentic) | 300 | 2026-11-09 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [cc-router](https://github.com/finch-xu/cc-router) | 295 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [flameox](https://github.com/morluto/flameox) | 244 | 2026-11-16 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [kasetto](https://github.com/pivoshenko/kasetto) | 219 | 2026-11-20 | NOASSERTION | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [repo-forensics](https://github.com/alexgreensh/repo-forensics) | 208 | 2026-11-14 | NOASSERTION | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [codex-profiles](https://github.com/Ducksss/codex-profiles) | 195 | 2026-11-06 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [agent-lsp](https://github.com/blackwell-systems/agent-lsp) | 181 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [agenttrace](https://github.com/luoyuctl/agenttrace) | 157 | 2026-11-16 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [aisw](https://github.com/burakdede/aisw) | 153 | 2026-10-31 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [terminal-mcp](https://github.com/elleryfamilia/terminal-mcp) | 149 | 2026-08-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [KubeStellar kc-agent](https://github.com/kubestellar/console/tree/main/cmd/kc-agent) | 155 | 2026-11-21 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [ax](https://github.com/Necmttn/ax) | 124 | 2026-10-28 | AGPL-3.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Harness Starter Kit](https://github.com/harnessworks/harness-starter-kit) | 114 | 2026-06-18 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [ActPlane](https://github.com/eunomia-bpf/ActPlane) | 112 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Okto Nexus](https://github.com/OktoLabsAI/okto-nexus) | 110 | 2026-11-20 | NOASSERTION | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [authsome](https://github.com/agentrhq/authsome) | 107 | 2026-07-24 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [handoff](https://github.com/dazuiba/handoff) | 101 | 2026-08-02 |  | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [RoleCraft](https://github.com/sametcelikbicak/rolecraft) | 99 | 2026-11-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [pond](https://github.com/tenequm/pond) | 91 | 2026-11-09 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AgentPlane](https://github.com/basilisk-labs/agentplane) | 86 | 2026-11-16 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [skill-optimizer](https://github.com/fastxyz/skill-optimizer) | 85 | 2026-05-28 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [pi-mem](https://github.com/jo-inc/pi-mem) | 81 | 2026-11-02 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [brood-box](https://github.com/stacklok/brood-box) | 81 | 2026-11-20 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [cliproxy-rs](https://github.com/vayungodara/cliproxy-rs) | 78 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Untether](https://github.com/littlebearapps/untether) | 77 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AutoMode](https://github.com/mralexivy/AutoMode) | 80 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [skillreaper](https://github.com/thousandflowers/skillreaper) | 67 | 2026-11-18 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AgentLint](https://github.com/0xmariowu/AgentLint) | 68 | 2026-11-13 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [claudebox](https://github.com/numtide/claudebox) | 62 | 2026-10-13 |  | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [clausona](https://github.com/larcane97/clausona) | 62 | 2026-11-11 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [FireConnect](https://github.com/fw-ai/fireconnect) | 58 | 2026-11-11 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [pi-reflect](https://github.com/jo-inc/pi-reflect) | 56 | 2026-10-11 | MIT | already read |
| Agent infrastructure | [AgentDiff](https://github.com/codeprakhar25/agentdiff) | 48 | 2026-06-08 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [ContextStream](https://github.com/contextstream/mcp-server) | 47 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AgentTier](https://github.com/agenttier/agenttier) | 46 | 2026-10-18 | Apache-2.0 | already read |
| Agent infrastructure | [Wit](https://github.com/amaar-mc/wit) | 46 | 2026-03-27 | MIT | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AGRO](https://github.com/mifunedev/agro) | 43 | 2026-11-17 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [shim-cli](https://github.com/GetSHIM/shim-cli) | 41 | 2026-10-26 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AgentManager](https://github.com/kevinelliott/agentmanager) | 41 | 2026-11-16 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [laya-guard](https://github.com/scs0209/laya-guard) | 40 | 2026-11-16 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [claude-bulkhead](https://github.com/dooly6276/claude-bulkhead) | 35 | 2026-11-21 | MIT | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Mneme](https://github.com/MnemeHQ/mneme) | 34 | 2026-11-19 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Loadout](https://github.com/elleryfamilia/loadout) | 33 | 2026-10-08 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Data Olympus](https://github.com/knaisoma/data-olympus) | 30 | 2026-11-21 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Mnemoverse](https://github.com/mnemoverse/mcp-memory-server) | 30 | 2026-11-19 | MIT | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [ContextZip](https://github.com/jee599/contextzip) | 26 | 2026-06-03 | NOASSERTION | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [aigent-os](https://github.com/wrg32786/aigent-os) | 26 | 2026-11-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [AgentPack](https://github.com/vishal2612200/agentpack) | 25 | 2026-11-01 | AGPL-3.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [grite](https://github.com/neul-labs/grite) | 25 | 2026-07-02 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [m1nd](https://github.com/maxkle1nz/m1nd) | 24 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Unship](https://github.com/mbenhard/unship) | 23 | 2026-09-16 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Tree Ring Memory](https://github.com/TerminallyLazy/Tree-Ring-Memory) | 22 | 2026-09-17 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Agentic Engineering Framework](https://github.com/DimitriGeelen/agentic-engineering-framework) | 22 | 2026-11-20 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Mudroom](https://github.com/Kernel-Hunter/mudroom) | 21 | 2026-11-01 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [TraceFold](https://github.com/TraceFold/tracefold) | 21 | 2026-09-04 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [GoodMemory](https://github.com/hjqcan/GoodMemory) | 21 | 2026-10-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Agent Toolkit](https://github.com/ulises-jeremias/agent-toolkit) | 20 | 2026-11-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [machine](https://github.com/katspaugh/machine) | 20 | 2026-07-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [termagitchi](https://github.com/TevvvB/termagitchi) | 18 | 2026-10-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [schliff](https://github.com/Zandereins/schliff) | 18 | 2026-11-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Sabi](https://github.com/vizuh/sabi) | 18 | 2026-09-30 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [agy-auto](https://github.com/onkarbadve/agy-auto) | 16 | 2026-09-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [cowork-to-code-bridge](https://github.com/abhinaykrupa/cowork-to-code-bridge) | 15 | 2026-10-08 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [lifeos-cli](https://github.com/liujuanjuan1984/lifeos-cli) | 15 | 2026-11-19 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Agent Memory System](https://github.com/RavByte-AI/agent-memory-system) | 15 | 2026-05-19 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Pi Agent IDE](https://github.com/alexshpunt/pi-agent-ide) | 15 | 2026-11-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [myc](https://github.com/aistastudio/myc) | 14 | 2026-10-18 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [agent-runbook](https://github.com/KnoxOps/agent-runbook) | 14 | 2026-07-15 | Apache-2.0 | new, left to the andyrewlee-list agent: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [agent-terminal](https://github.com/jasonkneen/agent-terminal) | 12 | 2026-01-13 |  | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [postbag](https://github.com/parasxos/postbag) | 10 | 2026-10-03 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Praman](https://github.com/mrkanitkar/playwright-praman) | 10 | 2026-11-05 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [zosma-qa](https://github.com/zosmaai/zosma-qa) | 10 | 2026-03-28 | NOASSERTION | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [clu](https://github.com/arjia-labs/clu) | 10 | 2026-10-01 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Better Call GPT](https://github.com/insta-fusion/bettercallgpt) | 10 | 2026-10-09 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Terminai](https://github.com/emosenkis/terminai) | 7 | 2026-11-03 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [whatileaked](https://github.com/selan-ai/whatileaked) | 7 | 2026-11-10 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [SpecWave](https://github.com/Cyning12/SpecWave) | 6 | 2026-10-21 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [PatchWarden](https://github.com/jiezeng2004-design/PatchWarden) | 6 | 2026-11-01 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [House Party Protocol](https://github.com/rusharlabs/house-party-protocol) | 7 | 2026-11-19 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [OSOP](https://github.com/Archie0125/osop-agent-rules) | 5 | 2026-04-14 |  | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [context-bridge](https://github.com/serdardb/context-bridge) | 5 | 2026-09-19 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [yoink](https://github.com/MajidRaimi/yoink) | 5 | 2026-10-09 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Hivelore](https://github.com/Doucs91/hivelore) | 4 | 2026-11-13 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [linear-cli](https://github.com/phnx-labs/linear-cli) | 5 | 2026-11-03 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [tu](https://github.com/sahil87/tu) | 4 | 2026-09-28 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) | 4 | 2026-10-19 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [BlaBla](https://github.com/Kiborgik/blabla) | 4 | 2026-10-29 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Squelette](https://github.com/JyMinet/squelette) | 4 | 2026-09-29 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [agent-trace](https://github.com/ertygiq/agent-trace) | 3 | 2026-11-16 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Weaver](https://github.com/sean35mm/weaver) | 3 | 2026-08-27 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [opencode-agent-memory](https://github.com/Ghilteras/opencode-agent-memory) | 3 | 2026-11-04 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [wt](https://github.com/sahil87/wt) | 2 | 2026-09-11 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [distro-rig-vps](https://github.com/shafir-info/distro-rig-vps) | 2 | 2026-08-29 | GPL-3.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [stratless](https://github.com/stratless-ai/stratless) | 2 | 2026-11-01 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [saver-audit](https://github.com/VladUZH/saver-audit) | 2 | 2026-09-28 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [centrol](https://github.com/baitelmal/centrol) | 2 | 2026-10-21 | Apache-2.0 | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [UACOS](https://github.com/caotiensinh/uacos) | 1 | 2026-10-04 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [llm-panel](https://github.com/musharna/llm-panel) | 1 | 2026-09-26 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Mantyl](https://github.com/jopli11/mantyl-cli) | 1 | 2026-09-13 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [CodeVetter](https://github.com/Codevetter/codevetter) | 1 | 2026-11-18 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [isitdone](https://github.com/raimondasl/isitdone) | 1 | 2026-10-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Nanotea](https://github.com/gileshall/nanotea) | 1 | 2026-10-13 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Sqwakie](https://github.com/alexcarney460-hue/walkie) | 1 | 2026-10-26 | NOASSERTION | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [claude-northstar](https://github.com/Nisarg38/claude-northstar) | 0 | 2026-01-06 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [SAKO](https://github.com/Thakay/sako) | 0 | 2026-11-20 | MIT | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [Agent Fleet](https://woodor.ai/agent-fleet/) |  |  |  | new, dropped: tool or infrastructure, not a runner or engine |
| Agent infrastructure | [podway](https://podway.io) |  |  |  | new, dropped: tool or infrastructure, not a runner or engine |
