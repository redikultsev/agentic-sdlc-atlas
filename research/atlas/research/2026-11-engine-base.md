# Choosing an engine to build on

Research of 2026-11-21. It re-checks [2026-11-engine-choice.md](2026-11-engine-choice.md) under new constraints:
- everything runs on our own Linux server;
- the Operator works only through the engine's own web UI;
- an existing engine is the base and we extend it.

The earlier verdict, "our own Orchestrator on Temporal", counted gaps against our orchestration rules. It did not count what we would have to build around them: web UI, accounts, projects, git and tracker integration, settings, run views.

## How it was checked

- **Six engines read in depth:** Kraft, MAIster, agent-swarm, cezar, LoopForge and Mastra Factory. Each was cloned, read statically and checked against `docs/states.md`, the decisions and the element cards. Nothing was installed or run. Per-engine reports are in [engine-base/](engine-base/).
- **Four awesome lists parsed:**
  - [andyrewlee/awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators): 370 entries;
  - [ahmadyan/awesome-software-factory](https://github.com/ahmadyan/awesome-software-factory): 59;
  - [fhiltscher/awesome-ai-coding-sandboxes](https://github.com/fhiltscher/awesome-ai-coding-sandboxes): 96;
  - [bradAGI/awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents): 485.
- **Matching against the earlier research:** each entry was matched to the 323 candidates already read. The new ones were triaged, and 13 were read in depth.
  - The earlier research did not use these lists as sources. That is how it missed Archon, Aixle Flow, OpenChamber, Paperclip and the new sandboxes.
  - Lists: [awesome-list.md](engine-base/awesome-list.md) and [awesome-lists-2.md](engine-base/awesome-lists-2.md).
- **Scores are 0–10 as a base for us.** Sizes: S ≤ 1 day, M ≤ 1 week, L more.
- **Trackers are not a criterion.** Jira, Linear and other trackers connect as MCP servers (decision 5, revised). The "no Jira" gaps in the per-engine reports are void; what counts is whether a step can use any MCP server.

## Answer

1. **Taking an engine as the base pays off.** Each of the top engines already has the web UI, runs, approvals, git integration and settings: from 50k to 500k lines we would not write. Agents estimate our own rules at 4–8 weeks of work inside the extension points. That is less than building the platform ourselves.
2. **No engine has a sandbox that meets the spec, and every one gives agents a token that can merge.** So the sandbox and the push proxy are our own layer whatever the base:
   - OpenSandbox or Matchlock, with network closed by default;
   - a push proxy that only allows the slice branch;
   - credentials removed from agent sessions.
3. **Item-level rules sit outside every engine.** These are the shared limit of 3 fix rounds, the cap of 3 waiting items, the global pause, a limit hit counting as a failed round, and the 15 states as tracker labels or statuses. They become a small service of ours, or the engine's own scripts and packs.
4. **Recommended base: Archon (7/10), extended through packs and plugins and never forked.** It is the only engine where "code picks the next step from a JSON verdict" is the house style:
   - `when:` runs over output fields and `until_bash` exits loops;
   - typed `wait` gates carry a recommendation;
   - a scripted merge gate.
   - It also has a bundled SDLC pack for stages 1–5 and 7, deep GitHub support including the merge queue, Claude and Codex through their SDKs, a web console with Web Push, MIT, 24k stars, weekly releases and 2,281 merged PRs.
5. **Runner-up: cezar (6/10).** It is the healthiest project: 2–3 maintainers and an upstream that merges outside PRs. It has GitHub and Jira triggers, a loop counter that never resets (our shared 3-round limit), and secrets kept away from agent steps. It falls behind Archon on the verdict, which is a text token rather than JSON, and on a weaker GitHub depth.
6. **MAIster and Kraft are strong but risky as a base.** MAIster has the best Flow engine and UI, but agents run as the web app's user and can read its secrets, it has 10 stars, and one author wrote 99.8% of commits. Kraft has the best sandbox, but there are no accounts, no intake, and one author.
7. **Not a base:**
   - Mastra Factory: sessions run only on Mastra's own coding agent, so Claude Code and Codex cannot be the session engine;
   - LoopForge: a mirror of a private upstream that closed all 172 first-time PRs;
   - Aixle Flow: 39 stars, and agents move their own cards.

## Comparison

| Engine | Score | Ready | Main gaps (size) | Project health (2026-11-21) |
|---|---|---|---|---|
| [Archon](engine-base/archon.md) | 7 | YAML DAG with JSON-schema outputs, `when:` routing, typed waits, capped loops, per-node USD budget; SDLC pack (intake, build, multi-lens review, merge queue); GitHub plugin with issues, labels, checks, merge; web console, attention stream, Web Push; Claude, Codex, Pi | Repository runs isolated by worktree only (L); one GitHub token for every node (M); shared rounds, cap of 3, wall-clock limit (M); pause only in the CLI, telemetry on by default (S) | MIT, 23,970 stars, ~85% of human commits by one author, ~900 commits a month |
| [cezar](engine-base/cezar.md) | 6 | Web cockpit with "needs you" queue, graph editor with Simulate, cost page; graph with fork/join, gates, wait-for-CI, PR labels; triggers on issue label and Jira status; secrets kept out of agent steps; VPS installer | No sandbox, host `gh` login reachable (S–M via a CLI wrapper); verdict is a text token (S); no dynamic slice frontier (M–L); no cap of 3 or pause (S); Jira Cloud only, no label writes | MIT, 1,118 stars, 2–3 maintainers, 1,255 merged PRs, upstream receptive |
| [MAIster](engine-base/maister.md) | 6 | Board, run view with transcript, diff and evidence, Inbox, metrics, Flow editor, RBAC; Flow DSL with schema routing and bounded rework; web push; R0-style auto-merge with deny-list and kill switch | Agents inherit the server's environment and secrets (M); no tracker sync or Jira (M–L); rounds per loop, not per item (M); no cap of 3 or pause (S–M); no deploy or watch (M–L) | MIT, 10 stars, 99.8% of commits by one author, ~527k lines in `web/` |
| [Kraft](engine-base/kraft.md) | 6 | Board, chain graph, gate review with diff comments, analytics, phone layout; GitHub and GitLab PR flow with merge queue; best sandbox (deny-all egress, proxy-held credentials, server-only push); time, token and dollar caps; 7 agent CLIs | No GitHub Issues or Jira intake (M+M); 9 run statuses (S in a bridge); shared rounds (M); R0 rules gate rejected upstream (M, in a fork); one password, no accounts | Apache-2.0, 14 stars, one author (1,411 commits; the next human 12) |
| [agent-swarm](engine-base/agent-swarm.md) | 6 | 34-section dashboard, RBAC, SSO; workflow engine with `outputSchema` routing, durable approvals; ~15 harnesses; a code-enforced tracker tick in a template | Installation-wide token that can merge (M); open agent network (L); daily budgets only (S–M); no 15 states or Jira transitions (L); agents can edit workflows and remove gates (S–M) | MIT, 1,094 stars, mostly bot-written, ~338k lines |
| [LoopForge](engine-base/loopforge.md) | 6 | Requirements list, "Needs review" inbox, SOP designer, run traces and cost, accounts and projects; `pass\|rework\|fail\|human` gate | Shared Compose network and open egress (S–M); full GitHub token to agents (M); no session limits (M); no Jira, 8 fixed statuses (L) | MIT text, 5,358 stars, a mirror of a private upstream, 0 of 172 first-time PRs merged |
| [Mastra Factory](engine-base/mastra-factory.md) | 6 | Board with configurable phases and code-enforced moves, approval cards, GitHub and GitLab, Jira intake, better-auth, Docker sandbox class | Sessions only on Mastra's own coding agent (hard limit); `GH_TOKEN` plus a merge tool in the sandbox (S–M); LLM judge in Building (M); no slices or CI gating (L); stages 7–9 missing | Apache-2.0, active team, 0.x API |
| [Aixle Flow](engine-base/aixle-flow.md) | 7 | Team web UI, board, workflow builder, cost; deep GitHub, Jira and Linear; Temporal with a container per step | Agents move their own cards (no verdict routing); no round or cost limits (M); open network (M); token can merge (S–M) | Apache-2.0, 39 stars, ~280k lines, ~2 core maintainers |
| [OpenChamber](engine-base/openchamber.md) | 5 | Strong web UI; GitHub, GitLab, Gitea, Linear; scripts return validated JSON | No item state machine, no sandbox | MIT, 13,120 stars |
| [Paperclip](engine-base/paperclip.md) | 5 | Best Operator UI: inbox, decisions, budgets, RBAC | Its own task manager, no stage language; ~1.9M lines | — |

## What we write in any case

| Piece | What it does | Size |
|---|---|---|
| Sandbox layer | Each agent session in OpenSandbox (Firecracker or Kata, network closed) or Matchlock; the engine starts the agent CLI through a wrapper | M |
| Push proxy | Lets a session push only to its slice branch; the merge token lives only in the merge step | M |
| Tracker sync | 15 states as labels or statuses, slices as sub-issues with blocked-by; any tracker through its MCP server or API from a script step | S–M |
| Item rules | Shared limit of 3 rounds per item, a limit hit counts as a round, cap of 3 waiting, global pause | S–M, as engine scripts or packs |
| Stages 8–9 | Watcher per deploy, weekly Retro, six metrics | M each, as workflows of the engine |

## Not verified

- Nothing was run: neither the engines, nor the sandbox wrapper inside any of them, nor Web Push on a phone.
- Whether Archon's run budget works with loops and fan-out. It is rejected by the schema today.
- Whether Matchlock or Gondolin can run Docker inside the VM for test suites.
- Issue response times for several projects: the GitHub search API rate-limited the agents.

## Next

A one-day trial of Archon and cezar on the server: one real issue each, from intake to a merged PR, with a sandbox wrapper. The trial picks the base.
