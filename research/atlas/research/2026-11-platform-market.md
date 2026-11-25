# Is there a platform that meets all our requirements?

Question (2026-11-25): after the first live trial on Archon, the Operator asked for a framework or tool that meets every requirement of the pipeline, and if none exists, to build our own. The yardstick is [`2026-11-platform-requirements.md`](2026-11-platform-requirements.md) (must M1–M10, should S1–S7, score 0–3).

Three studies, read 2026-11-25/26, every fact with its source in the study:

- [`platform-market/market-commercial.md`](platform-market/market-commercial.md): about 25 commercial and hosted products.
- [`platform-market/market-oss.md`](platform-market/market-oss.md): about 50 open-source engines and coding-agent platforms, including the strongest from the engine study of 2026-11-21.
- [`platform-market/build-foundations.md`](platform-market/build-foundations.md): 20 foundations for building our own, the architecture and an effort estimate.

## Answer

1. **No product meets every requirement as shipped, commercial or open source.** Not one scores 3 on M3 (a rich decision card with the answer on it), M4 (many repositories) and M10 (ours to change without a fork) together.
2. **Commercial products fail on ownership.** Their workflows are fixed by the vendor (Factory, Devin, Cursor, Codex, Jules, Rovo Dev, Kiro, Amp) or the next step is decided by an agent reading prose (Warp Factories), and no vendor lets us shape the decision card. The closest are GitHub Agentic Workflows with Actions and environments (workflows as files in our repository, M3 = 1) and Warp Factories with gates in Linear (`market-commercial.md`).
3. **Open source comes closer.** Five score at least 2 on every must: Archon, agent-swarm, Kandev, t3code, MAIster (`market-oss.md`).
   - **Kandev** (AGPL-3.0, 1,183 stars, 92 contributors, outside PRs merged) is the closest: one task across several repositories with a PR in each, workflows synced from a directory in our repository, sessions in worktrees, Docker or remote executors, users and roles, and a plugin system whose web apps can draw any card in its UI and answer the pending question. Its gaps: steps move on a static rule, not on a JSON verdict; the plugin API is marked experimental; the native card is markdown without diagrams.
   - **paperclip** has the best native card (markdown with tables and mermaid, options, free text, who answered) but no workflow engine.
   - **Archon 0.15.0** (2026-11-25) adds a structured card (options with effect and cost, recommendation, free text), still with a plain-text body and no UI extension point; the trial ran on an earlier commit.
4. **No foundation draws a human step as a component of ours** (`build-foundations.md`): the decision UI is ours to build on any engine. If we build, Temporal is the base (MIT, durable waits, the only one that validates a human answer before recording it), with a TypeScript worker, Postgres and a React decision app; about 23 of the 30 pack modules carry over; parity with what runs on Archon today is estimated at about 18 engineer-weeks (14–24), plus 4–6 for a sandbox with a push proxy and multi-repo items, which Archon does not have either.

## Recommendation

- **Before committing to a build, try Kandev hands-on for two days** with one real multi-repo item: a plugin web app as the decision card (our blocks: markdown, mermaid, rates, folded evidence, options) answering in place, and routing by our JSON verdict through the plugin or its API. If both work, Kandev meets every must with work in our repository, and the build is unnecessary.
- **If Kandev fails either, build our own on Temporal** as `build-foundations.md` lays out, starting with the decision app and the triage workflow, while the Archon pack keeps running the trial.
## Kandev's gaps, checked in its source (commit 9ee282c2, 2026-11-25; read, not run)

- **Routing by our verdict: possible in a plugin.** A backend plugin receives events (`pluginsdk.Plugin` `OnEvent`, `docs/public/plugins-authoring.md`) and can move a task to any workflow step (`TaskMoveInput{TaskID, WorkflowStepID}`, `apps/backend/internal/plugins/host_write.go:116`). So the plugin reads the agent's JSON verdict and moves the task; the static step rules stay unused.
- **The card: possible as a plugin web app.** Isolated web apps on the task canvas run in a sandboxed iframe with the event stream (`plugins-authoring.md`, the table of plugin kinds), and the backend answers a pending question through `HostHumanResponseDelegation`. The whole plugin system is `status: experimental` (`docs/public/plugins.md:4`).
- **Jira: intake yes, mirror ours.** Jira is a built-in integration per workspace (API token or OAuth), with JQL views, transitions, launching tasks and issue watches that start tasks (`docs/public/integrations.md:3,59,700`); a launched task keeps no durable link to its issue (`:700`), so the state mirror (labels, comments written once) stays in our plugin, as on Archon.
- **Team and roles: yes.** Users with admin and member roles, invite links, workspaces shared on purpose (`docs/public/authentication.md:24,51–55`).
- **Cost of the plugin path:** backend plugins are Go binaries, so the pipeline logic now in TypeScript (`implementations/archon/.shared/`) is ported to Go or run beside the plugin as a TypeScript process it calls.
- Still to check by running it: the canvas card in practice, an answer recorded as the Operator's, and the AGPL terms for a team server (internal use, no distribution).

## Kandev hands-on (2026-11-26, version 0.103.1, local, two throw-away repositories without a remote)

- **Install:** `npx kandev@0.103.1`; one binary serves the UI, the API and MCP; data in its own home directory. On Windows the home must be a short path (its control socket fails in a long one), and the server binds every interface by default, open to anyone on the network without login: run it with `KANDEV_SERVER_HOST=127.0.0.1` or behind an authenticated tunnel. The Claude adapter installs itself through npm on first use; the first probe failed on a package fetch and the second passed.
- **Our workflow:** the pipeline as 7 steps (Triage, Spec, Plan, Implement, Review, Merge?, Done) imported from one portable YAML file, each step with its own prompt and an agent started on entry. Every step flag must be set explicitly or the import is refused.
- **Many repositories:** one task on two repositories, chosen in the new-task dialog; a worktree per repository side by side in one parent folder, one branch name for both. Creating the same task over the HTTP API with `repository_ids` attached no repository; the UI path worked.
- **The decision card:** the Triage agent drew a native card in the task's chat (`show_rich_output_kandev`): a list of checks with coloured statuses and details (failed, skipped, pending), a warning callout "Not verified" in the first person, the cause as text. Below it the question (`ask_user_question_kandev`) with the options, the recommended one marked, what each does, and a free-text answer, all in the same view; the answer is sent from the card.
- **The gate moved the item:** on "accept" the agent moved the task to Spec (step 2 of 7), whose agent started by itself. The move is the agent's, following its prompt; routing by our JSON verdict in code still needs our plugin.
- Not tried: Jira, users and roles, the plugin canvas, a server deployment, the phone.
