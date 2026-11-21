# cezar vs Archon

Research of 2026-11-21: the two finalists from [2026-11-engine-base.md](2026-11-engine-base.md), one agent per engine, the same 10-point rubric. Both were read statically at their latest default branch; nothing was installed or run. Full reports: [h2h-cezar.md](engine-base/h2h-cezar.md), [h2h-archon.md](engine-base/h2h-archon.md). Trackers are not a criterion (decision 5): what counts is whether a step can use any MCP server.

## Answer

1. **Archon is the better base for our pipeline; cezar has the better interface.** Our pipeline runs unattended with isolated agents and auto-merges R0. Archon's architecture fits that: typed gates, routing on JSON, script nodes that own push and merge, a provider-plugin seam for a microVM. cezar's fits an interactive cockpit where agents are trusted.
2. **What cezar lacks sits in its core; what Archon lacks sits mostly in its UI.** In cezar:
   - our rules (global pause, cap of 3 waiting, a node limit that fails the node, a JSON verdict, MCP per node) need patches in `run.ts` (11,098 lines) and `server.ts` (9,953 lines), with no linter;
   - its security model has the agent run on the host with `GITHUB_TOKEN` and the local API URL, and the API lets a caller without an `Origin` header through (`server.ts:1820-1827`, confirmed), so an agent can likely approve its own gate.

   Archon's gaps are UI pieces: a diff view, a board of items by state, a pause button, and answering decisions left after a run. Its sandbox seam is a provider plugin, so no core patch is needed there.
3. **Archon's main risks:**
   - one maintainer writes ~87% of commits;
   - each of the last three releases had a "Breaking" section;
   - upstream will replace in-run `wait:` gates with decisions left after the run, so a pack written today will need rewriting.

   Mitigations: pin a release, keep our code in a pack plus plugins, and write gates against the new decision model once it lands.

## Scores (0–5)

| # | Dimension | cezar | Archon | Who wins and why |
|---|---|---|---|---|
| 1 | Operator UI | **4** | 3 | **cezar.** A "needs you" list on every screen, a task view with diff, commits, graph and cost, full mobile, a node editor with Simulate, the most polished UI read. Archon: a "Needs your input" banner, gates with a recommendation and confidence, keyboard approve; but no diff view, no board, no pause button, basic mobile |
| 2 | Code quality | 4 | 4 | **Archon on structure.** Both strict TypeScript with ~15 `any`. Archon: largest hand-written file 944 lines, held by a length and complexity ratchet; 421k test lines on 327k source; CI on three OSes. cezar: two core files of 10–11k lines, no linter or formatter; ~1,100 test files plus Playwright |
| 3 | Extensibility | 3 | **4** | **Archon.** Packs, provider, forge and chat plugins as separate processes; script nodes with an API for forge, state documents, items and triggers; MCP per node and per project. cezar: a binary-override hook, script and check nodes, MCP per project only; its extensions system and pre-session hook are open PRs, not merged |
| 4 | Fit of our pipeline | 3 | 3 | **Tie, different gaps.** cezar: the loop counter gives the shared limit of 3 for free, a native CI wait, but pause, the cap of 3, node limits and the JSON verdict are core patches. Archon: stages 1–6 and 9 by config and scripts, native item links for slices, "3 waiting" only as a soft check, merge queue does not rebuild on the latest main, stage 8 from scratch |
| 5 | Agents and models | 4 | 4 | **Tie.** cezar: 11 agent CLIs on their own subscription logins, session resume. Archon: Claude, Codex and Pi through their SDKs, subscription OAuth login in the browser, JSON enforced by the decoder with up to 3 re-asks |
| 6 | Sandbox and security | 1 | **2** | **Archon.** Both run agents on the host in a worktree with the server's environment today. Archon's pack never lets an agent push or merge (script nodes do), and a provider plugin can boot a microVM per node. cezar keeps `GITHUB_TOKEN`, `GH_*` and `HOME` for agents on purpose, has the likely self-approval hole, and a script step without a secret list gets every secret |
| 7 | Git and GitHub | 3 | 3 | **Tie.** Both: PRs, checks, labels by script, worktrees. Archon adds a merge queue and review threads; cezar adds wait-for-CI and draft PRs. Neither has sub-issues |
| 8 | Operations | 3 | **4** | **Archon.** Docker compose with SQLite or Postgres, migrations at startup, multi-user with roles. cezar: systemd and nginx via a VPS installer, no database, single user with basic auth, no Docker image, no backup docs |
| 9 | Project health | **4** | 3 | **cezar.** 2–3 maintainers, weekly minor releases under a written compatibility contract, though about half of sampled outside PRs got no reply in 1–8 days and a CLA is required. Archon: 23,970 stars and 2,281 merged PRs, but one maintainer at ~900 commits a month and breaking releases |
| 10 | Direction | 2 | **3** | **Archon.** cezar heads towards an interactive developer cockpit where "nothing merges on its own" and agents are trusted: the opposite of ours. Archon heads towards decisions and items, close to our decision requests and work items, at the cost of rewriting packs |

## What we write on each

| Piece | On Archon | On cezar |
|---|---|---|
| Sandbox | A `claude-vm` / `codex-vm` provider plugin: microVM, no `GH_TOKEN`, egress closed, wall clock (M) | A wrapper through `CEZ_CLAUDE_BIN` / `CEZ_CODEX_BIN` (M), plus closing the local API to agents (core patch, M) |
| Push and merge tokens | Already apart: script nodes push and merge (S) | Secret lists per check step; an empty list is invalid (M) |
| Item rules | Shared rounds and R0 rules in script nodes over state documents (S–M); "3 waiting" as a soft check (S) | Shared rounds via the loop counter (S); pause, cap of 3 and node limits as core patches (M) |
| JSON verdict | Native (`output_format`) | A JSON file plus `jq` in a check, or a core patch (S–M) |
| UI | Diff view, board by our states, pause button, answers to decisions after a run (M–L, ideally upstream) | Little: a global pause button and the cap counter |
| Stages 8–9 | Watcher and Retro as workflows (M each) | The same (M each) |

## Not verified

- Nothing was run. Click counts come from route and component code; cezar's screenshots date from v0.12, and Archon has no screenshots.
- cezar's self-approval hole is read from code (the `Origin` guard comment confirmed), not reproduced.
- Stars trend for cezar: the GitHub API returned 404.

## Next

The one-day trial on the server becomes a check of Archon's weak spots: its UI for daily work, and the provider plugin as the sandbox seam. cezar stays the fallback if Archon's UI turns out unusable.
