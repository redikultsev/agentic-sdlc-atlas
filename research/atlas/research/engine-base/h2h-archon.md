# Head-to-head: Archon (coleam00/Archon) against the H2H rubric

Clone: `SCRATCH/src/archon`, branch `dev`, head `f9d1d2b` (2026-11-20, "Included nodes now carry their own id…", #5993). Fetched again on 2026-11-21: no newer commit. Read statically only; nothing installed, built or run. Paths are relative to the repo root. This report builds on `l2/deep-archon.md` and `awesome-deep/archon.md` and does not repeat their inventory; where it corrects them, it says so.

**Not verified at the top:** nothing was run, so every UI walk is read from route and component code, not seen. The docs site and README carry no screenshots or demo video (`find packages/docs-web -name '*.png'` returns only logos; README has only `assets/logo.png`). Click counts are therefore counted from JSX, not from a session.

## Scores

| # | Dimension | Score |
|---|---|---|
| 1 | Operator UI and usability | 3 |
| 2 | Code quality | 4 |
| 3 | Extensibility | 4 |
| 4 | Fit of our pipeline | 3 |
| 5 | Agents and models | 4 |
| 6 | Sandbox and security seam | 2 |
| 7 | Git and GitHub | 3 |
| 8 | Operations | 4 |
| 9 | Project health and trajectory | 3 |
| 10 | Risks (5 = low risk) | 2 |

Corrections to the earlier reviews:
- `awesome-deep/archon.md` says the run detail offers "cancel/pause" and the Operator can "pause/resume/cancel runs". **Pause is not in the web console.** The run action bar offers Cancel, Abandon, Resume, Re-run only (`packages/web/src/experiments/console/components/RunActionBar.tsx:32-45`). No `pause` or `hold` route exists under `packages/server/src/routes/` (listed every `path:` in `api.run-control.ts`, `api.run-gates.ts`, `api.run-attention.ts`, `api.items.ts`), and the chat agent's `manage_run` tool has no pause action (`packages/core/src/orchestrator/manage-run-tool.ts:91-114`). `l2/deep-archon.md` had this right.
- Both said there are no sub-issues or blocked-by. That holds for GitHub, but **the engine has its own item links**: `depends_on`, `part_of`, `duplicate_of` (`packages/workflows/src/schemas/item-link.ts`, `archon workflow link`). A `run_ended` binding with `linked` starts a stage on linked items (`packages/docs-web/src/content/docs/guides/workflow-triggers.md:547-575`). That covers our slice frontier inside Archon, not in the tracker.
- Both said agents hold the GitHub token so "the agent can push and merge". True, but the SDLC pack **never has an agent push or merge**: the push and PR writes are a script (`.archon/workflows/sdlc/pr/scripts/publish-pr.ts:1-17`), and the merge is a script (`merge-queue/archon-merge-queue.yaml:238`). So stripping the token from agent sessions breaks nothing in the pack. See §6.

---

## 1. Operator UI and usability: 3/5

The console is a React SPA served by the same server (`packages/web/src/App.tsx`, `experiments/console/ConsoleApp.tsx:111-126`). Layout: a project rail on the left, a feed on the right. Routes are in `experiments/console/README.md`.

### Daily tasks, screens and clicks

| Task | Screens | Clicks | How, with evidence |
|---|---|---|---|
| See what waits for me | 1 | 0 | `/console` pins a "Needs your input · N" banner above the feed, across all projects and regardless of filters (`components/PendingInputBanner.tsx:34-70`, `routes/RunsPage.tsx:372-377`). Phone: Web Push opt-in in Settings → Alerts; a tap opens the run (`README.md` "Closed-console notifications"). **Gap:** asks that a *completed* run leaves on its item (the newer `returns: { asks }` primitive, `schemas/item-ask.ts`) are not shown. The console reads `/api/runs/attention` and uses `items` only for owner-lost runs (`skills/runs.ts:42-50`). They are answerable only from the CLI or the chat agent's `attention` tool. |
| Approve a gate with evidence | 1 (or 2 with files) | 1 (4 with files) | The banner card shows the question as plain text (`whitespace-pre-wrap`), the recommendation with its reason and confidence, each option's `does` line, an optional comment box, and one button per option (`components/AttentionAnswerPanel.tsx:84-160`). That is one click. Evidence files: open the run (1), Artifacts tab or key `3` (1), pick a file (1). Markdown renders; **everything else renders as monospace plain text**, so screenshots and video do not display (`components/ArtifactPanel.tsx:15-22`). Visual evidence has to be read on the GitHub PR. |
| Open a run: log, diff, cost | 1 | 1 | Click the card → `/console/r/:runId`. The header shows status, timing and "Reported cost $x (may be partial)" (`components/RunDetailHeader.tsx:113-120`). Tabs: Log (live stream, tool calls, node filter), Graph, Artifacts (`routes/RunDetailPage.tsx:522-588`). **There is no diff view**: no component renders a diff (grep `diff` across the console finds only a demo string). You see edit tool calls in the log, or open the PR on GitHub. |
| Send back with a comment | 1 | 1 + typing | Only when the workflow declared a "changes"-type option on a `select` wait, or `other: true`. The textarea text travels as `$gate.output.text` (`schemas/wait-node.ts:180-190`). Same card as approve. |
| Pause or cancel | 2 | 2 | Cancel: open the run (1), Cancel, then a browser `confirm()` (1) (`RunActionBar.tsx:16-24`). **Pause: not in the web UI.** `archon workflow pause <run>` (pauses at the next node boundary, `schemas/operator-pause.ts`) and the install-wide `archon hold set` / `lift` (`packages/cli/src/commands/hold.ts`) are CLI only. |
| Start a new item from an issue | 0 (auto) or 1 | 0 or 4 | Automatic: an `issue.lifecycle` webhook binding starts intake (`.archon/workflows/sdlc/.pack/pack.yaml` `bindings:`). Binding setup is CLI only (`archon pack bindings`, `archon trigger add`). Manual: project → "+ Start a new run" (or key `N`) → workflow picker → paste the issue number into the inputs or context → Start run (`components/DraftRunCard.tsx:60-64, 358-389`). |
| Edit a workflow | 2 | about 5 | Rail → Builder (`/console/builder`, marked experimental) → pick project → pick workflow → edit the node in the Inspector → Save. Saving writes the YAML into the server's checkout and never commits (`packages/server/src/routes/api.workflows.ts:395-432`, `writeFile`). On a server where the repo is a managed clone, the edit is lost or drifts from the repo. In practice workflows are edited in git, not in the UI. |

### The rest of the UI

- **Live updates:** SSE per run (`lib/sse.ts`, `useRunStreamSSE`) and an attention SSE stream (`/api/runs/attention/stream`), with a 30 s safety refetch (`RunDetailPage.tsx:44-46`).
- **Mobile:** basic. Under `md`, the rail becomes a drawer behind a "Projects and settings" button (`ConsoleApp.tsx:74-101`). There are only 8 `sm:` and 10 `md:` classes in the whole console and no `lg:`. iOS push needs the site installed as a home-screen app. It is usable on a phone for answering gates; reading logs on a phone will be cramped. Not verified on a device.
- **Polish:** a deliberate design system. Tokens are enforced by a lint (`scripts/check-console-tokens.ts`, `lint` in `package.json`). There is a keymap (`j/k`, `1/2/3`, `a`/`r` approve/reject, `N` new run; `routes/RunDetailPage.tsx:93-137`), a `?demo=1` mode, and status strips. It is dark and terminal-like: dense monospace labels and small type (`text-console-10/11`). Fine for an engineer; not a friendly approver surface.
- **Empty and error states:** handled, but plain. "No runs yet.", "No projects yet. Add one to get started." (`ProjectRail.tsx:341`), "Could not load runs." with the error message (`RunsPage.tsx:730`), "Attention coverage incomplete … repair the stored run" (`RunsPage.tsx:363-369`). There is a top-level error boundary with Reload (`App.tsx:12-55`).
- **Settings and secrets:** `/console/settings` has Model tiers, Aliases, Agents (per-provider keys plus **subscription OAuth login in the browser**, `components/SubscriptionLoginFlow.tsx`), Defaults, System, GitHub identity, and Alerts (`routes/SettingsPage.tsx`). Per-project env vars go through `EnvVarsDialog.tsx` and `/api/codebases/{id}/env`. A run's config layer is sealed with AES-256-GCM (`packages/core/src/config/run-config.ts:287-298`, `utils/token-crypto.ts`). Install-wide config writes go to `~/.archon/config.yaml`. Server secrets (`GH_TOKEN`, App key, `WEBHOOK_SECRET`) stay in `.env`.
- **First run:** the wizard is the CLI `archon setup` (clack prompts, `packages/cli/src/commands/setup*.ts`). In the web console, the first-run path is Add Project (`AddProjectDialog.tsx`) plus agent credential cards. Installing packs, forge plugins and bindings needs a shell.
- **Missing for us:** a board of work items by our 15 states, an item view (the `/api/items` route exists, but the console never calls it: grep `api/items` in `packages/web/src` finds only generated types), a "3 waiting" counter, a pause button, and a diff view.

## 2. Code quality: 4/5

- **Architecture:** 17 workspace packages with enforced edges (`scripts/check-package-edges.ts`, `check-cli-import-boundary.ts`). Core seams: `workflows` (engine, schemas), `core` (host, DB, orchestrator), `providers` plus `provider-contract`, `forge`, `isolation`, `server` (Hono with OpenAPI), `web`, `cli`, `script-api`. `.archon/architecture.md` and `.archon/direction.md` hold the design and its triage clauses.
- **Types:** root `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. Biome `noExplicitAny: error` (`biome.jsonc:62`). Non-test, non-`.d.ts` sources hold **15** `any` hits and **22** ignore pragmas (`@ts-ignore`, `@ts-expect-error`, `biome-ignore`) across ~2,260 files. Every node schema is Zod and strict.
- **Tests:** 1,163 test files against 2,259 source files. 421k test lines against 327k source lines (ratio **1.29**). 138 integration, spec or e2e files. CI (`.github/workflows/test.yml`, 36 KB) runs Linux, Windows and macOS jobs, pack-script tests, workflow fixtures, compiled-binary smoke tests and a **ratchet** job. Separate workflows: `e2e-smoke.yml`, `release.yml`, `publish.yml`, docs.
- **Lint and format:** Biome, plus a lint chain of custom drift checks (mocks, pack portability, SDK type drift, web API types, console tokens). Errors are typed classes (`ProviderPluginExitedError`, `PluginProtocolError`, `WorkflowReadBackError`). Load errors fail closed, and logs redact credentials (`packages/paths/src/credential-redaction`).
- **Hotspots:** **no hand-written source file over 2k lines.** The largest are generated: `packages/web/src/lib/api.generated.d.ts` (11.5k) and `packages/script-api/src/archon-script.d.ts` (3.3k). The largest hand-written file is `packages/core/src/db/adapters/sqlite.ts` at 944 lines; many files sit at exactly 800. That is the ratchet at work: a touched file above the line ceiling may not grow, and functions are scored for cognitive complexity (`scripts/check-ratchet.ts:6-40`). Test files go up to 3.7k lines (`providers/src/claude/provider.test.ts`).
- **Docs:** very large. `reference/workflow-language.md` is 285 KB, `reference/node-execution.md` 325 KB, `reference/cli.md` 281 KB, and the CHANGELOG 302 KB. There is a 51 KB `workflow-language-constitution.md`. There are no ADRs as such; `direction.md` plays that role with citable clauses.
- **Readability:** the core files are clean but **extremely dense**: long doc comments on every symbol, many concepts (occurrence, receipt, hold, lease, item, ask, ruling, wait, notice, resource slot). Learning the engine well enough to patch it is a multi-week effort. Much of the code is written by Archon's own agent runs; the README claims 363 of 524 PRs merged on 1–19 Oct came from Archon runs.
- **Dependencies:** 56 distinct third-party runtime packages across packages. Heavy ones: `@anthropic-ai/claude-agent-sdk`, `@openai/codex`, `@github/copilot-sdk`, `@opencode-ai/sdk`, Pi, `discord.js`, `@slack/bolt`, `grammy`, `better-auth`, `pg`, `sharp`, `posthog-node`, and Astro/Starlight for docs. `bun.lock` holds about 1,350 resolved entries. Renovate is configured (`renovate.json`).
- Why not 5: the sheer surface (327k source lines, about 900 commits a month) and concept density make it costly to own a fork, whatever the per-file quality.

## 3. Extensibility: 4/5

| Seam | Where | New node kind | New agent runner | Pre/post-session hook (sandbox wrapper, credential scrub) |
|---|---|---|---|---|
| Workflow YAML (DAG) | `.archon/workflows/**`, `packages/workflows/src/schemas/dag-node.ts:171-205` | Closed set: command, prompt, bash, script, loop, loop_group, approval (deprecated), wait, cancel, include, workflow. A new kind is a **core patch** (`NODE_MODE_SHAPES`). In practice a `script:` node or an `include:` block covers "new kinds". | n/a | n/a |
| Script nodes | `runtime: bun\|uv\|sh`, `deps`, `with:`, `timeout` (`schemas/exec-node.ts`); API `archon:script` with `forge()`, `state` (revisioned docs with leases), `item()`, `items()`, `notice()`, `trigger.fire()` (`packages/script-api/src/archon-script.d.ts:3142-3300`) | Yes: this is the real extension language | n/a | A script can run before or after an agent node, but cannot wrap it |
| Commands and skills | `.archon/commands/*.md`, `skills:` per node (Claude, Pi) | n/a | n/a | n/a |
| Node `hooks:` | `schemas/hooks.ts` | n/a | n/a | **Static SDK responses only** (`response:` JSON per matcher), Claude only (`provider-capabilities.md`). Cannot run a command, so **not** a sandbox wrapper. Useful to deny tools. |
| Provider plugin (process) | manifest `kind: provider` + `executable` (`packages/plugin-manifest/src/index.ts:77`), stdio RPC (`packages/provider-contract/src/plugin/serve.ts`, `rpc.ts`, `wire.ts`), conformance kit (`provider-contract/src/conformance.ts`), guide `contributing/adding-a-community-provider.mdx` | n/a | **Yes, no core patch:** an out-of-tree executable installed with `archon plugin add`, selected per node with `provider:` | **Yes, the best seam:** the plugin process receives the full env and the cwd (`packages/core/src/providers/process-provider.ts:84-104`) and decides what reaches the agent. A `claude-vm` provider can boot a microVM, mount the worktree, pass only model credentials, enforce a wall clock, and stream events back. |
| Forge plugin | `kind: forge`, contract `packages/forge/src/operations.ts`, `lifecycle.ts` | n/a | n/a | n/a. New ops (sub-issues, merge queue) are a contract change, i.e. a **core patch** in `packages/forge`. |
| Source plugins (webhooks, polls) | Standard Webhooks source (`packages/adapters/src/sources/standard-webhooks`), poll scripts (`guides/workflow-triggers.md:997-1150`) | n/a | n/a | n/a. This is how Jira or alerts reach Archon without a forge. |
| Chat plugins | `kind: chat` (Slack in tree; Telegram, Discord adapters) | n/a | n/a | n/a |
| Workflow packs | `kind: workflow-pack`, `.pack/pack.yaml` with settings, forge op requirements, bindings, metrics | Packs are the unit we would ship | n/a | n/a |
| MCP per node | `mcp: <path>` or `{path, optional}` (`schemas/provider-options.ts:93-112`). The file lives in the repo, so it is per project; `$VAR` expansion from per-project env (`guides/mcp-servers.md:190-215`). Claude, Codex and Copilot only; Pi and OpenCode fail closed. | n/a | n/a | n/a |
| Triggers and events | bindings: schedule, issue and label events, `run_ended`, `asks_settled`, linked items, waits (`guides/workflow-triggers.md`) | n/a | n/a | n/a |
| HTTP API | OpenAPI routes (`packages/server/src/routes/*`, `reference/api.md`) | n/a | n/a | n/a |
| CLI | `archon …` (`reference/cli.md`) | n/a | n/a | n/a |
| Isolation backend | `packages/isolation/src/backend-router.ts`, `backends/container.ts` | n/a | n/a | No plugin kind: a new backend is a **core patch**, and upstream wants it "whole" (`direction.md` §isolation-arrives-whole) |

**Fits without patching core:** all stage logic, gates, JSON verdicts, the round counter (a `state` doc), labels as states, R0 rules, Jira through MCP plus scripts plus a poll or webhook source, the cross-family reviewer, the sandbox and credential scrub for agent sessions (provider plugin), and session wall-clock limits (provider plugin).
**Needs a patch:** a pause button and hold in the web UI, an item and state board in the console, rendering item asks in the console, non-text artifacts, a hard engine-wide "max 3 waiting" admission rule, per-node credentials for script and bash nodes, container isolation for repo projects, and new forge ops (sub-issues, GitHub merge queue).

## 4. Fit of our pipeline: 3/5

### Sketch in Archon's format

Schemas: workflow top level `packages/workflows/src/schemas/workflow.ts:197-317`; node base `dag-node-base.ts:58-104`; wait `wait-node.ts:227-275`; loop_group `loop.ts` and `dag-node.ts:108-140`; script `exec-node.ts`. The syntax for `with:`, `when:`, `until_bash` and `$LOOP_PREV` is copied from the bundled pack (`sdlc/intake/archon-intake.yaml`, `sdlc/deliver/archon-deliver.yaml:79-90`, `sdlc/merge-queue/archon-merge-queue.yaml:238-366`). `# GUESS` marks what I did not verify against a schema or a working pack example.

```yaml
# (a) Intake: .archon/workflows/pipeline/intake/pipeline-intake.yaml
name: pipeline-intake
description: Triage one issue; the Operator accepts, hands it to a human, or cancels.
inputs:
  number: { description: The issue number (binding field subject.number). }
worktree: { enabled: false }
mutates_checkout: false
returns: { node: apply, outcome: state }       # outcome must be an enum property of apply
nodes:
  - id: admit                                  # decision 9: at most 3 items wait
    script: admit                              # counts open waits; GUESS: reads /api/runs/attention
    runtime: bun
    output_format: { type: object, properties: { open: { type: boolean } }, required: [open] }
  - id: triage
    command: triage                            # .archon/commands/triage.md
    depends_on: [admit]
    when: "$admit.output.open == true"
    model: '@triage'                           # alias in config.yaml
    mcp: .archon/mcp/tracker.json              # Jira or GitHub MCP, per project
    output_format:
      type: object
      properties:
        size: { type: string, enum: [S, M, L] }
        risk: { type: string, enum: [R0, R1, R2] }
        outcome: { type: string, enum: [agent, for-human, wont-do] }
        reason: { type: string }
        assumptions: { type: array, items: { type: string } }
      required: [size, risk, outcome, reason, assumptions]
  - id: card                                   # question text + recommendation from the verdict
    script: triage-card
    runtime: bun
    depends_on: [triage]
    with: { verdict: { from: "$triage.output" } }
  - id: accept                                 # TriageReview gate
    depends_on: [card]
    wait:
      attention: "$card.output.question"
      form: select
      options:
        - { id: accept, label: Accept, does: "S to Implementing, M/L to Specifying" }
        - { id: for-human, label: For a human, does: "Label state:for-human, stop" }
        - { id: cancel, label: Cancel, does: "Close as not planned with the reason" }
      recommendation: "$card.output.recommendation"
      labels: { stage: triage-review, item: "$INPUTS.number" }
  - id: apply                                  # writes state:* label, fires the next stage
    script: apply-triage
    runtime: bun
    depends_on: [triage, accept]
    with: { verdict: { from: "$triage.output" }, decision: "$accept.output.decision", text: "$accept.output.text" }
    output_format:
      type: object
      properties: { state: { type: string, enum: [implementing, specifying, for-human, cancelled] } }
      required: [state]

# (b) Delivery loop: inside pipeline-deliver.yaml (same file shape)
  - id: rounds
    loop_group:
      until_bash: |
        done=$round.output.done
        test "$done" = "true"
      max_iterations: 3                        # static cap; the shared count lives in a state doc
      on_exhausted: complete
      fresh_context: true
      nodes:
        - id: implement
          command: implement
          provider: claude-vm                  # our provider plugin: microVM, wall clock
          model: '@implementer'
          maxBudgetUsd: 5                      # Claude only (capability matrix)
          idle_timeout: 600000
        - id: push                             # script pushes; the agent holds no token
          script: push-branch
          runtime: bun
          depends_on: [implement]
        - id: ci                               # polls forge('checks.state') at the head
          script: wait-ci
          runtime: bun
          depends_on: [push]
          timeout: 1800000
        - id: review
          command: review
          depends_on: [ci]
          when: "$ci.output.green == true"
          provider: codex                      # other model family
          model: '@reviewer'
          output_format:
            type: object
            properties:
              verdict: { type: string, enum: [pass, fix, block] }
              findings: { type: array, items: { type: object } }
            required: [verdict, findings]
        - id: round                            # +1 on state doc rounds/<item>; done at pass, block or 3
          script: count-round
          runtime: bun
          depends_on: [implement, ci, review]
          trigger_rule: all_done               # GUESS: runs after a failed or skipped node
          output_format: { type: object, properties: { done: { type: boolean }, end: { type: string } }, required: [done, end] }

# (c) Merge
  - id: rules                                  # reads .pipeline/automerge.yaml + forge('pr.files')
    script: automerge-rules
    runtime: bun
    output_format: { type: object, properties: { r0: { type: boolean }, scope: { type: string } }, required: [r0, scope] }
  - id: merge-auto
    script: merge
    runtime: bun
    depends_on: [rules]
    when: "$rules.output.r0 == true"
  - id: merge-gate                             # MergeReview
    depends_on: [rules]
    when: "$rules.output.r0 == false"
    wait:
      attention: "$rules.output.scope"
      form: select
      options: [{ id: merge, label: Merge and deploy }, { id: changes, label: Changes }, { id: cancel, label: Cancel }]
  - id: merge-gated
    script: merge
    runtime: bun
    depends_on: [merge-gate]
    when: "$merge-gate.output.decision == 'merge'"
```

Notes on the sketch:
- `max_iterations` is a literal integer (`loop.ts:84`), so the **shared** 3-round limit across Verifying, MergeReview "changes" and the merge queue cannot be an engine number. The `count-round` script holds it in a `state` document keyed by the item (`state.patch` with `ifRevision`, `archon-script.d.ts:3218-3240`) and ends the loop at 3.
- A `when:` that references a skipped node's output fails that node ("a missing reference fails the node", `l2/deep-archon.md` §3, `condition-evaluator.ts`). So merge is split into `merge-auto` and `merge-gated` instead of one node with `||`.
- A workflow `budget:` (run-wide USD) is rejected when the workflow has loops, children or fan-out (`workflow.ts:209-215`), so per-item cost limits must be per node (`maxBudgetUsd`, Claude only) or counted in our script.
- Agent nodes have no wall-clock `timeout`: only `idle_timeout`. `timeout` is owned by bash, script and loop modes (`dag-node.ts:174-178`). The wall clock goes into the provider plugin.

### Per stage

| Stage | How in Archon | Kind |
|---|---|---|
| 1 Intake (Triage + accept) | sketch (a); GitHub issue binding; Jira through a poll or webhook source plus MCP | config + script |
| 2 Spec (Interviewer, approve) | agent node + `wait` `select` (approve / clarify); a loop_group for clarify | config |
| 3 Plan (Researcher for L, Planner, slices) | agent nodes; slices as **Archon item links** (`part_of`, `depends_on`) plus GitHub sub-issues created by a script through `gh api` (the forge has no sub-issue op) | config + script |
| 4 Implement (fresh session per slice, parallel) | `fan_out` on `workflow:` children with `isolation: worktree` (`dag-node.ts:190-197`); frontier from item links and `run_ended` + `linked` bindings; "start once when all linked ended" is not built (issue 5867, `workflow-triggers.md:575`) | config + script; sandbox per slice needs the provider plugin |
| 5 CI + cross-family review | script waits on `checks.state`; Codex or Claude reviewer by alias; JSON verdict enforced | config + script |
| 6 Acceptance (Validator) | agent node in its own session; evidence written to `$ARTIFACTS_DIR` and the PR; console does not show images | config; evidence view is a patch |
| 7 Merge (R0 rules, gate, queue) | sketch (c); the pack's merge-queue sweep pattern; no GitHub merge queue op, no rebuild on latest main | script; true merge queue is a patch (forge op) or GitHub-side setting |
| 8 Deploy + Watcher with rollback | a `run_ended` binding on merge starts a deploy workflow; Watcher = agent node + script rollback; nothing bundled | config + script |
| 9 Learn (weekly Retro) | schedule binding; a script reads `items()` and metrics; pack-declared metric cards for six metrics (`schemas/metric.ts`, console Metrics page) | config + script |

### Per cross-cutting rule

| Rule | How | Kind |
|---|---|---|
| Shared limit of 3 fix rounds → Blocked | `state` doc counter in scripts; Blocked = label + `wait` | script |
| Session time and cost limits count as a failed round | cost: `maxBudgetUsd` (Claude only); time: provider plugin kills the session; `count-round` with `trigger_rule: all_done` treats a failed node as a round | provider plugin + script |
| At most 3 items wait for the Operator | admission script at the start of each stage; no engine admission policy; a hand-started run bypasses it; resource capacity does not count paused runs (a paused run "gives its resource slot back", `archon-merge-queue.yaml:333`) | script (soft); hard version is a core patch |
| Pause the whole pipeline; cancel from any state | `archon hold set/lift` matches decision 30 exactly (no new runs, running ones go on) but is CLI only; cancel is in the UI per run | CLI today; web button is a small core patch |
| Code picks the next step from a JSON verdict | `output_format` enforced, `when:` over fields, `until_bash`/`until_field`; prose `until` is deprecated (`loop.ts:65-80`) | native |

### The 15 states

Archon stores no position: "where an item stands is derived from what was recorded" (`direction.md` §software-factory). Our states therefore live as `state:*` labels written by scripts with `forge('workitem.label.add' | 'workitem.label.remove')`. The ops exist (`packages/forge/src/operations.ts`). For Jira, a script calls the REST transition API.

| State | Written by |
|---|---|
| Triaging | intake binding's first script |
| TriageReview | the `accept` wait (the label is set by a script before the wait) |
| Specifying, SpecReview, Planning, PlanReview | spec and plan workflows, same pattern |
| Implementing, Verifying | deliver loop scripts (`push`, `count-round`) |
| MergeReview | `merge-gate` |
| Live, Done, RolledBack | deploy and watch workflows |
| Blocked | `count-round` at 3 or on a block verdict |
| ForHuman, Cancelled | `apply-triage` |

The console will not show these states: a board is a console patch, or a small separate page over `/api/items/window` plus the tracker.

## 5. Agents and models: 4/5

- **Runners:** Claude through `@anthropic-ai/claude-agent-sdk`, Codex through `@openai/codex`, Pi (about 20 vendors, OpenRouter, Gemini, …). Copilot and OpenCode are deprecated community providers (`reference/provider-capabilities.md`). Each ships as a provider plugin (`plugins/provider-*`).
- **Model per node:** `model:` and `provider:` on every node, aliases and tiers in config (`.archon/config.example.yaml:38-80`), preference lists (`schemas/model-binding.ts`). A cross-family reviewer is one line.
- **Subscription vs API key, unattended:** Claude prefers `CLAUDE_CODE_OAUTH_TOKEN` over `CLAUDE_API_KEY` (or global `claude /login`). Codex uses its ChatGPT login tokens with refresh (`ARCHON_CODEX_*`) or `CODEX_API_KEY` (`.env.example:8-46`). Subscription login can also be done in the web console (`SubscriptionLoginFlow.tsx`). Per-user provider keys exist with Postgres (`api.provider-keys.ts`). Archon removed subscription delivery to Pi (v0.12.0 notes), so mind the vendors' terms on running subscriptions unattended.
- **Usage limits:** a provider rate limit pauses the run and auto-resumes at the reset time (`operate.md:52`). The console card says so (`PendingInputBanner.tsx:135-143`).
- **Session resume:** `context: fresh | shared | same | {resume: node}`, `persist_session` across runs (`dag-node-base.ts:27-50`). Resume is supported for all providers; immutable fork for Claude, Codex and Pi.
- **JSON verdict enforcement:** `output_format` is **grammar-enforced** for Claude and Codex, best-effort plus validation for Pi. On a miss, Archon asks again up to 3 times (Codex in the same session, Pi in a fresh one). A schema miss is its own failure class, retried with `retry.on_error` (`provider-capabilities.md`, `schemas/retry.ts`). Then `when:` routes on the fields.
- **Gaps by provider:** Codex has no `maxBudgetUsd`, no cost reporting, no `hooks`, no `allowed_tools`/`denied_tools`, and no `sandbox:` passthrough (capability matrix). The cost of a Codex reviewer is invisible except as tokens.

## 6. Sandbox and security seam: 2/5

**What an agent can reach today (repo project, the default):**
- It runs as the Archon server user, in a git worktree on the host (`packages/isolation/src/backend-router.ts:1-12`: repo projects never reach the container backend).
- It inherits the server's whole `process.env` plus the run env (`packages/provider-contract/src/agent-provider.ts:339-345`).
- The run env carries `GH_TOKEN`/`GITHUB_TOKEN`: the App installation token, or the PAT (`packages/workflows/src/run-credential-env.ts:84-99`), plus a `gh` shim that refreshes it (`:124-140`). The same token goes to every node of the run.
- It has full host network, `~/.archon` (the SQLite DB in solo mode), and other runs' worktrees.
- Redaction applies to logs only (`process-provider.ts:84-96`).

Optional narrowing that exists: Claude Code's own OS sandbox per node or workflow, `sandbox.network.allowedDomains` and filesystem deny lists (`schemas/provider-options.ts:21-58`, Claude only). Also `allowed_tools`/`denied_tools` and static `PreToolUse` hook responses. The container backend (Docker, read-only bind plus overlay, `--network none|bridge`) exists only for folder projects and Claude, with write-back pending (`backends/container.ts`).

**How we would wrap every agent session in an OpenSandbox or Matchlock microVM:**
1. **Provider plugin (recommended, no core patch).** Write `provider-claude-vm` and `provider-codex-vm` against `@archon/provider-contract/plugin` (`serve.ts`; guide `contributing/adding-a-community-provider.mdx` "Serve it over stdio", "Prove conformance"). Per `sendQuery(prompt, cwd, resume, options)` the plugin:
   - boots a microVM;
   - mounts `cwd` (the worktree) and `$ARTIFACTS_DIR` at the same paths (`direction.md` §same-path-workspace);
   - passes only the model credential, **dropping `GH_TOKEN`/`GITHUB_TOKEN`**;
   - sets egress to the model API plus an allowlist through a proxy;
   - runs Claude Code or Codex inside, enforces a wall clock and kills the VM at the limit;
   - streams provider events back.

   Nodes select it with `provider:`. Costs: in-process native tools (the chat-only `attention`/`invoke_workflow`) do not apply to workflow nodes; MCP servers declared with `mcp:` must be started inside the VM or reached through the proxy; the declared capabilities must be honest. Size **M–L**.
2. **Core patch:** route repo projects through the container backend with a microVM runtime (`packages/isolation`). Upstream wants this (`direction.md` §isolation: "Running a repo checkout inside a container is a gap we want filled (#2206)"), but requires it to land whole. Size **L**, plausible upstream.

**Push token and merge token apart:**
- The pack already keeps git writes out of agents. The push is a script (`sdlc/pr/scripts/publish-pr.ts`, merge-only, never force, `.shared/push.ts`). The merge is a script that refuses unless the verdict is Ready at the declared head and CI is green there (`merge-queue/scripts/merge.ts`, `pack.yaml:22-36`).
- With option 1, **agents get no GitHub token at all**. Scripts still get the single run token, which can merge. To separate push from merge:
  - (a) run the **push through a proxy** that accepts only `refs/heads/<run-branch>`: our script calls it instead of `git push`;
  - (b) give the merge script a second credential: a separate GitHub App or fine-grained token in a per-project env var that only `merge.ts` reads;
  - (c) make the run-wide App token read-only plus PR write, without `contents:write` on protected branches, and enforce branch protection on GitHub.

  Scripts are our own code, so this is config plus our scripts, with no engine patch. A hard guarantee (per-node credential policy in the engine) is a **core patch** in `run-credential-env.ts` (size **M**).
- Container runs already get only the request env (`buildProviderSubprocessEnv`, `execContext.kind === 'container'`).

**Telemetry:** **on by default** to PostHog (`us.i.posthog.com`) with an embedded key. It sends categorical usage, run outcomes, token and cost totals, workflow shape and the install channel (`packages/paths/src/telemetry-consent.ts:1-40`). To turn it off, set `ARCHON_TELEMETRY_DISABLED=1` or `DO_NOT_TRACK=1` or `POSTHOG_API_KEY=off` in `.env`; it is auto-off with `CI=true`. Separately, disable the agent CLIs' own telemetry inside the sandbox (Claude Code `DISABLE_TELEMETRY` / `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, Codex config); not checked in Archon's code.

## 7. Git and GitHub: 3/5

- **PRs:**
  - view, create, edit body, ready, draft, files, merge, merge-state;
  - review threads (list, reply, resolve), review submit, comment upsert;
  - checks state, commit checks, rerun, logs;
  - labels set, add and remove, repo label ensure;
  - work items view, list, search, create, close, comments;
  - signed webhook intake; App installation tokens; GitHub Enterprise via `GITHUB_URL` (`packages/forge/src/operations.ts`, `packages/adapters/src/forge/github/*`, `.env.example:95-125`).
- **CI waits:** a script polls `checks.state` (green, red, pending, gated); the pack's deliver loop sends red the change caused back to implement.
- **Labels:** first-class, and our state labels fit.
- **Sub-issues and blocked-by:** no GitHub op. Archon item links replace them inside the engine. Real GitHub sub-issues need a script calling `gh api`, which works because scripts get the token.
- **Merge:** a script merge pinned to the head SHA, with `protected_paths` and `merge_lane: manual` (`pack.yaml:22-36`).
- **Merge queue:** Archon's own merge-queue *sweep* checks the verdict at head, CI at head and "base not red". It does **not** rebuild the PR on the latest main with the PRs ahead, as decision 24 wants. GitHub's native merge queue is not an op. Enabling it on the repo and having the merge script enqueue (`gh pr merge --auto`) is a script workaround; not verified.
- **Worktrees:** per run by default, cleaned when a run completes and its commits are on a remote; branches kept (v0.13.0 notes). A `workflow:` child gets its own worktree only with `isolation: worktree`.
- **Multiple repositories per project:** no. A project is one repo. A "folder project" over many repos runs in place with no worktree, branch or PR management (`guides/multi-repo-projects.md`). We would register each repo as its own project.
- **Monorepos:** fine; `protected_paths` globs. Project registered at a subdirectory works (v0.13.0 notes).
- **GitLab, Gitea:** community adapters for webhooks and comments only; the SDLC pack needs the forge ops, which only GitHub implements.

## 8. Operations: 4/5

- **Deploy on Linux:** `docker-compose.yml` runs the app (Bun server serving API plus console) with profiles `with-db` (Postgres 17), `cloud` (Caddy with TLS) and `auth` (the old password sidecar). There is also a release image on GHCR with build provenance (`deployment/docker.md:110-120`), a cloud-init VPS script (`deployment/docker.md:28`: installs Docker, 2 GB swap, a non-sudo `archon` user), and release binaries (Homebrew, quick installer). systemd is possible through the binary (`archon serve`), but Docker is the documented path.
- **Databases:** SQLite at `~/.archon/archon.db` by default; Postgres recommended for 20+ concurrent runs, and **required** for web login (`.env.example:1-6, 148-152`).
- **Resources:** 1–2 vCPU, 2 GB RAM minimum, 4 GB recommended (`deployment/cloud.md:18`) for the engine. Agent sessions are extra (each Claude Code or Codex process; a microVM per session adds more).
- **Upgrades and migrations:** the Postgres adapter applies an idempotent `migrations/000_combined.sql` under an advisory lock at startup; SQLite migrations are in code. There is no numbered ledger (`reference/database.md:159, 384-396`). A schema-upgrade check runs in CI (`check:schema-upgrades`). Release binaries require reinstalling provider plugins at the same version (`getting-started/updating.md`). Every recent release has a **Breaking** section (§9).
- **Backup and restore:** **not documented** (grep `backup|restore|pg_dump` over the docs finds nothing relevant). The state is the DB plus the `archon_data` volume (`~/.archon`: workspaces, artifacts, config, plugins) plus `archon_user_home` (agent CLIs' auth). We would write restic plus `pg_dump` ourselves (size **S**).
- **Auth and multi-user:**
  - solo (no auth) by default;
  - Better Auth email and password on Postgres, with invite allowlist or open signup, and `ARCHON_WEB_AUTH_REQUIRED` gating `/api/*`;
  - a trusted-proxy header mode;
  - per-user GitHub device-flow identity with tokens encrypted (`TOKEN_ENCRYPTION_KEY`).

  "Everyone is 'admin' for now and visibility stays open" (`.env.example:154-156`). Single-tenant per install by design (`direction.md`).
- **Logs:** pino JSON to stdout, with credential redaction; per-run JSONL transcripts under `~/.archon/workspaces/<project>/artifacts/runs/<id>/` (`operate.md:114`); run events in the DB.
- **Processes:** one server process; one provider plugin process per agent session (release binaries; source and Docker run providers in process); one forge plugin process; optional Postgres and Caddy.

## 9. Project health and trajectory: 3/5

- **Size and activity:** 23,970 stars, 3,541 forks, MIT, discussions enabled, last push 2026-11-20 (`gh api repos/coleam00/Archon`, 2026-11-21). Commits per month on `dev` (from `l2`): Jun 57, Jul 149, Aug 990, Sep 233, Oct 876, Nov 330 to the 20th.
- **Maintainers:** contributors by commits: Wirasm 3,820, coleam00 431, leex279 54, then single digits to 30. **One person holds about 87%.** In the last 100 PRs, 92 are by collaborators. Much of the velocity is Archon building itself.
- **Outsider responsiveness:**
  - PRs: I sampled 20 recent PRs by non-members (`pulls?state=all`, pages 1–6). 8 merged, in 1–7 days (#5723, 5616, 5587, 5531, 5526, 5439, 5423, 5421). 6 open, all less than 6 days old. 6 closed unmerged. Bots (CodeRabbit, Codex connector) comment within a minute (#5967).
  - Issues: of 14 recent issues by non-members, 7 are open with 0–1 comments after 1–7 days. The closed ones were closed the same day by Wirasm, as completed, with 0 comments.

  Verdict: outside PRs that fit get merged within a week; issues often get no human reply.
- **Releases:** about weekly: v0.12.0 (10-17), 0.12.1 (10-17), 0.13.0 (10-28), 0.13.1, 0.13.2 (10-29), 0.14.0 (11-07). Breaking changes in each of the last three minors:
  - v0.14.0: project config output redacts secrets;
  - v0.13.0: Slack moved out to a plugin, health fields removed, SDLC pack inputs removed, webhook sync behaviour changed;
  - v0.12.0: providers no longer bundled in binaries, no default provider fallback, legacy bundled workflows and the marketplace removed, Codex and Claude nodes no longer load user plugins and MCP.

  Pre-1.0, so the YAML language and the pack keep moving.
- **Roadmap:** `.archon/direction.md` instead of a public roadmap. The CHANGELOG (302 KB) is detailed.
- **Docs site:** `archon.diy` (Astro Starlight): exhaustive references, llms.txt variants, guides for every seam. Dense, with no screenshots. Community: Discord adapter docs; discussions on. I did not measure the stars trend.
- **Direction vs ours:**
  - **Matches:** "a governed agentic automation engine … with human approval gates and audit trails"; a software factory "built from engine primitives"; self-hosted, single-tenant, forge-optional, policy as project documents; isolation as an explicit wanted gap.
  - **Diverges, as churn risk:** "A stage finishes; it does not wait": the direction moves gates from in-run `wait:` to item **asks** answered after the run and re-triggered by `asks_settled`. "The bundled SDLC pack predates this shape … It stays the working reference until a pack built on the primitives above replaces it" (`direction.md` §software-factory). The console does not render asks yet. So our pack written today on `wait:` will be "old style" within months, and the new style is not yet operable from the web UI.

## 10. Risks for a year of use: 2/5

1. **Agent sessions are not sandboxed and share one powerful GitHub token.** A prompt-injected Implementer can push anywhere, merge, or read the host. **Mitigation:** our own `provider-*-vm` plugins from day one (no GitHub token, egress allowlist, wall clock). Merge credential only in the merge script's env. Branch protection on GitHub. A test that asserts no `GH_TOKEN` inside the VM.
2. **Upstream churn with a single maintainer.** About 900 commits a month, breaking changes every minor, the pack's shape being replaced. One person's priorities set the language. **Mitigation:** stay on published seams only (pack, provider plugin, scripts, MCP, API). Pin a release tag and upgrade monthly behind our own fixture runs (`archon validate`, pack script tests). Never fork `packages/workflows`; keep the patches we need (pause button, board) small and propose them upstream.
3. **The Operator UI lacks our core views:** no state board, no diff, no images, no pause, item asks hidden. The Operator falls back to GitHub and the CLI, which breaks "works only in the engine's web UI". **Mitigation:** budget an **M** for a console patch (pause and hold buttons, item board over `/api/items/window`, image artifacts, asks list). Upstream's §web-ui says such surfaces should exist, so upstreaming is plausible. Meanwhile put evidence into the PR and link it from the wait message.
4. **Our rules are soft script conventions, not engine guarantees** (3 shared rounds, at most 3 waiting, cost caps on Codex, R0). A hand-started run or a pack bug bypasses them. **Mitigation:** one shared `.shared/policy.ts` module used by every stage's first and last script; a weekly audit script over `items()` that flags violations; later, upstream an admission-policy primitive.
5. **Complexity and conceptual load.** 327k source lines and hundreds of KB of reference docs; debugging a stuck item means understanding occurrences, leases, holds, receipts and resource slots. **Mitigation:** keep our pack small (one workflow per stage, scripts in one module), run Postgres, add a backup (restic + `pg_dump`) and a runbook for the five states we see stuck (owner_lost, unreadable, overdue_wait, held, usage_limit, `operate.md:44-58`), and turn off telemetry in `.env` on day one.

### What we would build, in order

1. Provider plugins `claude-vm` and `codex-vm` (microVM, no GitHub token, egress proxy, wall clock): **M–L**.
2. Our pipeline pack: stages 1–9 as workflows plus shared policy scripts (rounds, waiting cap, R0 rules, state labels, Jira via REST and MCP): **L**.
3. Push proxy plus a separate merge credential: **S–M**.
4. Console patch: pause and hold, item and state board, image artifacts, asks: **M** (upstream candidate).
5. Backup and runbook: **S**.
