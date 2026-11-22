# Pack spec: the pipeline on Archon

What the pack contains, node by node, and why each node is an agent, a script or the Operator. Source of truth for behaviour: `../../model/engine.c4`, `../../docs/decisions.md`, `../../docs/states.md`. This file says how that behaviour is built on Archon. Order of work: `../../docs/build-plan.md`.

## Shape in one screen

- **Item key.** Every run for a work item carries `--item issue-<n>`, so Archon admits one run per workflow per item (one run per state, as the Orchestrator requires).
- **State** is the `state:*` label on the issue (decision 28), written only by `.shared/state.ts` through `forge('workitem.labels.set')` and read back. Counters and fingerprints live in an Archon state document `work/<n>` (`state.patch` with `ifRevision`): rounds used, verdicts with their diff fingerprint, the branch, the slice list, flags.
- **Stages are workflows**, chained explicitly: the last script node of a stage calls `trigger.fire('<next>', inputs, {item})` on a fire-only binding. Nothing chains through agent prose.
- **Gates are `wait` nodes** (`form: select`, typed options with `value.effect`, `recommendation`, `other: true`, `labels: {stage, item}`). The run pauses and releases its slot; an answer continues it.
- **Agents judge, scripts act.** Agent nodes return `output_format` JSON and touch no tracker and no remote. Every public write is a script node that reads its result back.
- **Repository files the Operator owns** (in each project, on the default branch, changed only by the Operator or by an R2 PR): `.pipeline/trusted.json` (trusted authors, decision 39), `.pipeline/automerge.yaml` (R0 rules, decision 25), `.pipeline/project.yaml` (check command, deploy hook, Watcher signals, model aliases).
- **Registers in the tracker**, because the pipeline never pushes to the default branch: rejected requests are closed issues labelled `pipeline:rejected` with the reason as the closing comment; project rulings are one pinned issue "Pipeline rulings" whose body a script edits. Specs, plans and research are files on the item's branch under `.pipeline/work/<n>/` and land with the PR (decision 14).
- **Item rulings** (decision 32): appended by a script to `.pipeline/work/<n>/spec.md` (M, L) or to the issue body (S) as a dated "Rulings" section.

## Workflows

| Workflow | Started by | Nodes, in order (A = agent, S = script, W = wait) | Ends |
|---|---|---|---|
| `pipeline-intake` | event: issue opened or edited, label `pipeline:triage` added | S `trust` (author in `trusted.json`, or approval pinned to the body digest) · S `state` Triaging · A `triage` · S `evidence` (refuses claims without links, quotes, command output) · S `state` TriageReview · S `card` · W `accept` (accept / for a human / won't do / other) · S `apply` | Implementing (S) or Specifying (M, L): fires the next stage; ForHuman; Cancelled with the reason and a `pipeline:rejected` label |
| `pipeline-spec` | fire from intake | loop_group ≤3 { A `questions` · W `ask` (only when there are questions; one message with all of them) · A `interviewer` writes the spec · S `commit-spec` · S `state` SpecReview · W `spec-gate` (approve / clarify + comment) · S `ruling` } | Planning: fires plan |
| `pipeline-plan` | fire from spec | A `researcher` (L only) · S `check-refs` · loop_group ≤3 { A `planner` · S `check-plan` (criterion coverage, no cycle, check commands start) · S `state` PlanReview · W `plan-gate` · S `ruling` } · S `slices` (sub-issues with blocked-by) | Implementing: fires deliver |
| `pipeline-deliver` | fire from intake (S) or plan; also after "changes" at merge | S `state` Implementing · loop_group ≤3 rounds { S `frontier` · `workflow: pipeline-slice` fan_out over ready slices (round 1) or one fix session (later rounds) · S `join` (merge slice branches into `pipeline/<n>`) · S `push` · S `state` Verifying · S `ci` (waits for checks at the head) · S `guard` (deleted or skipped tests, lowered thresholds, check config: flag) · S `threads` (people's open review threads) · A `review` (other model family) · A `validator` (M, L; S when it has criteria) · S `round` (verdicts with the fingerprint; counts; decides) } | MergeReview or the R0 path: fires merge; Blocked at 3 rounds or a block verdict |
| `pipeline-slice` | child of deliver | A `implementer` (fresh session, progress file on the branch) · S `commit` | a pushed slice branch |
| `pipeline-merge` | fire from deliver | S `rules` (R0 by facts, decision 25; manual merge setting, 40) · W `merge-gate` when not R0 (merge / changes + comment) · S `land` (update the branch on the latest base, wait for CI, check every verdict's fingerprint, merge pinned to the head, read back; resource `merge`, capacity 1) | Live: fires deploy; "changes" or a red build: back to deliver |
| `pipeline-deploy` | fire from merge | S `deploy` (the project's deploy hook) · S `state` Live · loop_group over the window { S `signals` (before/after numbers) · A `watcher` } · S `outcome` (Done, or revert PR plus deploy, RolledBack, report, a work item with evidence) | Done or RolledBack |
| `pipeline-retro` | schedule: weekly | S `metrics` (seven numbers from the tracker and `items()`) · A `retro` (proposals with linked cases) · S `file` (proposals as issues for intake) · S `summary` (one decision request) | — |
| `pipeline-revisit` | schedule: hourly | S `blocked` (Blocked items whose blocker closed: update their request), S `stale` (items set aside after two unreadable reads) | — |
| `pipeline-ping` | by hand | install check | — |

Discoveries (decision 31): any agent may return `discoveries[]` (where, what, evidence). The script after it files each as an issue labelled `pipeline:discovery` by the pipeline account, which intake then triages like any trusted request.

## Shared modules (`.shared/`)

| Module | Holds | Decisions |
|---|---|---|
| `state.ts` | the 15 states, allowed transitions, label writes with read-back; refuses a move that `docs/states.md` does not allow | 28 |
| `work.ts` | the `work/<n>` document: rounds, verdicts `{kind, verdict, fingerprint}`, branch, slices, flags; conditional writes | 15, 33 |
| `fingerprint.ts` | the PR's own diff fingerprint (patch id of merge-base..head) | 33 |
| `request.ts` | builds a decision request by the presentation rules; every option has `value.effect`; validates (recommendation matches an option, no repeated ids); the waiting cap counts open issues in Operator states | 9, 11, 38 |
| `rulings.ts` | appends a ruling to the spec or the issue; edits the project rulings issue | 32 |
| `trust.ts` | trusted authors, body digest pinning | 39 |
| `github.ts` | what the forge lacks, through `gh api` from the script: sub-issues, blocked-by, branch update | 16 |
| `limits.ts` | per-node `idle_timeout` and `maxBudgetUsd` from `.pipeline/project.yaml`; unknown cost fails the node; a failed node counts as a failed round | 29 |
| `settings.ts` | pack settings `implement_lane`, `merge_lane` (auto, manual) | 40 |

## Agents and models

| Node | Model (alias, falls back to tier) | Reads | Returns |
|---|---|---|---|
| triage | `@triage` → medium | issue, comments, code, rulings issue, rejected issues | size, risk, outcome, reason, assumptions, claims with evidence, root cause (bugs), discoveries |
| questions, interviewer | `@interviewer` → large | issue, code, rulings, ADRs | questions; spec with criterion ids, examples, not in scope, assumptions with sources |
| researcher | `@researcher` → large | code (read only) | modules and invariants with file:line |
| planner | `@planner` → large | spec, research, code | slices: files, risks, check command, criterion ids, blocked-by |
| implementer | `@implementer` → large | slice or findings, progress file | changed files, tests first; discoveries |
| review | `@review`: another model family than `@implementer` (Codex when connected) | PR, spec, surrounding code, people's threads | pass / fix / block, findings re-checked by running code, explanation for R1/R2 |
| validator | `@validator` → large | criteria, the running app | per criterion: pass or fail, runnable check and its output |
| watcher | `@watcher` → medium | numbers from `signals`, the PR diff | clean / regression in this PR / regression unclear / unsure |
| retro | `@retro` → large | traces, corrections, rounds, rollbacks | proposals with cases |

## Tests

Every workflow has `fixtures/*.stubs.yaml`: one fixture per transition in `docs/states.md` that the workflow makes, with stubbed agent verdicts and stubbed write scripts (the dry run cannot stub forge calls), asserting `reached` nodes and the run status. `archon workflow test` runs them all; a pack change does not merge while any is red (decision 41).

## Settings and setup per project

`.archon/packs/redikultsev.agentic-pipeline.yaml` (`implement_lane`, `merge_lane`, `repo_host`, `repo_path`) and the `.pipeline/` files above. Bindings are registered once by the Operator with `archon pack bindings` (install does not register them).

## Known gaps on this Archon commit

- No sandbox yet: agents run in worktrees on the host behind the git and gh guard (build plan step 3).
- Session limits: `maxBudgetUsd` is Claude only; no wall clock on agent nodes; a run `budget:` is refused for workflows with loops or children. Wall clock comes with the sandbox provider plugin.
- No sub-issue operation in the forge: `github.ts` calls the GitHub API directly; to verify on the trial repository.
- The console renders `wait` gates; it has no board of our states (build plan step 4).
- The cross-family reviewer needs Codex credentials on the server.

## Task shape

Every task the model gives an agent, checked against what agents do confidently and badly (judging value, accepting their own "done", drawing conclusions, estimating time, grinding without a stop). Tasks are derived from the model's element descriptions, not from recorded episodes; no task was probed on a model for this check.

Columns: the task · why an agent (hook) · selection / acceptance / inference / stop, before → after · tests that fired · resolution · who accepts · Operator minutes.

| Task | Hook | Selection / acceptance / inference / stop | Fired | Resolution | Accepted by | Operator |
|---|---|---|---|---|---|---|
| Triage: duplicates, already built, rejected before, reproduce, root cause, size, risk, outcome | volume of reading | Operator / Operator / agent → agent with raw evidence / silent → session limits | 2, 3, 12 | **Reshape.** Every claim carries its raw evidence: a link and the quote that decides it (duplicate, already built, rejected), the reproduction command and its output (bug), the file:line of the cause. "Refuted" needs a recorded reproduction attempt. A script refuses a verdict whose claims lack evidence fields. Data sources (logs, alerts) are named per project; where none exist the verdict says so | Operator at Accept; R0 later by the rules file | 1–2 per item |
| Interviewer: assumptions, business questions, spec with criteria and examples | routine (text from named sources) | agent picks questions → agent / Operator / agent → cited / silent → session limits | 3, 9 | **Wrap.** The spec has an explicit "Not in scope" list and an assumptions list, each assumption with its source; past decisions quoted from the ADR store with their id. Every criterion has an id | Operator at SpecReview | 5–10 per M/L |
| Researcher (L): affected modules, invariants | volume of reading | — / nobody → script / agent → marked inference / silent → session limits | 2, 3 | **Wrap.** Every claim cites file:line; a script checks each cited path and line exists at the base commit. The document is marked "agent's reading" for the Planner and the Operator | script for references; Operator sees it at PlanReview | in the plan review |
| Planner: slices, files, risks, check command, sub-issues, blocked by | code, volume | Operator / agent → script / agent / silent → session limits | 1, 7, 9 | **Reshape.** Scripts check what can be checked before code: every acceptance criterion id is covered by at least one slice; the blocked-by graph has no cycle; every slice names files and a check command that runs at the base (it may fail, it must start). No time estimates anywhere: size is files and changed lines | script, then Operator at PlanReview | 5–10 per M/L |
| Implementer: tests first, code, fast checks, push | code | — / CI, reviewer, Validator / — / 3 rounds + session limits | 1, 9, 10 | **Wrap.** Progress and the plan of the slice live in a file on the branch, so a fresh session continues from it. A script flags a diff that deletes or skips tests, lowers a threshold or edits check configuration: such a PR never merges as R0 and the flag is first on the Operator's merge card (decision 27: weakening a check is R2) | CI, AI reviewer, Validator, merge rules | — |
| AI reviewer: findings, verdict, explanation for R1/R2 | volume, code | "what not to flag" list / re-check by running code, calibration set / agent → raw first / limits | 2, 4 | **Wrap.** The explanation for the Operator puts the raw part first (diff stats, files outside the plan, failing and passing commands) and marks its reading as the agent's. Leniency is measured on the calibration set (decision 42), not trusted | calibration set; Operator at MergeReview for R1/R2 | in the merge review |
| Validator: each criterion and example on the running app | exhaustive check | — / agent → script re-runs / agent → raw evidence / limits | 1, 2 | **Reshape.** Each key example becomes a runnable check (command or browser script) saved with its output; the verdict is per criterion id. A script re-runs the saved checks at merge time; a check that no longer passes blocks the merge. Screenshots and output go on the PR as raw evidence | script at merge; Operator sees evidence for R1/R2 | in the merge review |
| Watcher: regression or not, roll back | volume, exhaustive | — / — / agent → reads numbers a script computed / clock | 2, 7, 12 | **Wrap.** A script computes before/after for the signals the PR touches (same hours before the deploy) and for the whole service; the agent reads those numbers, not raw dashboards. The window is a clock. Rollback is a revert, so a wrong call is cheap; the unneeded-rollback counter is a script (decision 26). **Data step:** each project declares its signals (health check, error log, business numbers); a project with none gets the health check only, and the Watcher says so | counter; Operator on reports | on reports only |
| Retro: repeated lessons, rule and check proposals, weekly summary | volume of reading | agent → Operator via Triage / Operator at Accept / agent → cases linked / weekly clock | 2, 5, 7 | **Split.** The seven metrics are computed by a script from traces and the tracker; the agent writes only proposals, each with its linked cases. Which proposal is worth doing stays the Operator's call at Accept | Operator at Accept | 10 per week |
| Decision requests: recommendation and confidence | — | agent recommends / Operator / — / — | 4, 7 | **Wrap.** Confidence is the agent's own report; the follow rate per request type (decision 38) is what says whether to trust it | follow rate | — |

Not checked: the "World" test for Interviewer and Planner (they only read the repository and the tracker); the "Work" group for Implementer beyond rounds and limits.

**Operator time, as a formula** (no daily budget is set yet): S ≈ 5 min (accept, merge for R1/R2), M ≈ 25, L ≈ 35, plus about 1 min per discovery accepted at triage, 5 per Blocked item, 10 per week for the Retro. At most 3 items wait at once (decision 9). Example: 3 S and 1 M a day ≈ 40 min a day plus discoveries.

**What moved:** evidence checks from the Operator's eyes to scripts (Triage claims, Researcher references, plan coverage, Validator re-runs, weakened tests); metrics from the Retro agent to a script; Watcher's numbers from the agent to a script. Nothing was cut. Open for the owner: a daily budget of Operator minutes.
