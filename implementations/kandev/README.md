# The pipeline on Kandev (trial)

A trial of [Kandev](https://github.com/kdlbs/kandev) as the platform under the pipeline, started 2026-11-26 after the market study (`research/atlas/research/2026-11-platform-market.md`). The Archon pack in `../archon/` stays the reference; the prompts here take the pack's skills as they are.

| File | What it is |
|---|---|
| `workflow.ts` | The workflow "Unify pipeline": Triage, Spec, Plan, Implement, Checks & review, Acceptance, Merge?, Deploy & watch, Done, plus Blocked, For a human and Won't do. Each agent step has its role's prompt and pack skills; each gate is a decision card (`show_rich_output_kandev`) and a question on the same view (`ask_user_question_kandev`); after the answer the agent moves the task. Merge and deploy have no agent action: people merge, deploy is not wired. |
| `automations.ts` | Stage 9 and the work nobody asked for, as scheduled automations: the weekly Retro, the daily findings pass, a scout (off until its area is named). Each files what it finds as a task at Triage. |
| `create-automations.ts` | Creates those automations in a workspace (Kandev has no REST route for it). |

## Set up a workspace

1. Run Kandev bound to loopback (`KANDEV_SERVER_HOST=127.0.0.1`); without authentication anyone who reaches it is an administrator. On Windows keep `KANDEV_HOME_DIR` short.
2. Create a workspace, register each repository (`POST /api/v1/workspaces/:id/repositories`, `source_type: local`, its base branch), set the default agent profile and the Worktree executor.
3. Register the team's own checkouts where they already are; do not copy them. Guards, outside the agents' reach and outside the repositories: Kandev is started with `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=<guard hooks>`, so every git command Kandev and its agents run uses a `pre-push` hook that refuses pushes to `main`, `master` and `develop`, while people's own git in the same folders is unchanged; and a `gh` wrapper first on Kandev's `PATH` refuses `gh pr merge` and merges through `gh api`. Kandev's own per-PR auto-merge switch stays off.
4. `KNOWLEDGE_REPO=<the knowledge repository> bun workflow.ts > workflow.json` and import it (or `PUT /api/v1/workflow/steps/:id` with a step's new `prompt` to update one in place). With `KNOWLEDGE_REPO` set, every agent step reads the team's knowledge repository (decisions, system descriptions, architecture, requirements) first, names the documents it relied on, and changes the repository only when the Operator asks for that in the task. Register that repository in the workspace like any other and attach it to every task: `POST /api/v1/workspaces/:id/workflows/import` with `Content-Type: application/x-yaml` (JSON is YAML).
5. `bun create-automations.ts <workspace> <workflow> <triage step> <agent profile> <executor profile> <repository ids…>`.

## Known gaps

- The agent moves the task after a gate; nothing in code stops it from moving past one. A small plugin that checks each move against the Operator's answer is the planned guard (decision 36).
- One model family: the reviewer runs on the same agent as the implementer until a second agent profile is added (decision 22).
- No tracker mirror yet: Jira is a Kandev integration per workspace; labels and comments written once (decision 47) are not wired.
- Creating a task on several repositories works from the UI; the HTTP create with `repository_ids` attached none in version 0.103.1.
