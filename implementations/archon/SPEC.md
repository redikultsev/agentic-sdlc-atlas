# Pack spec: the pipeline on Archon

What the pack contains, node by node, and why each node is an agent, a script or the Operator. Source of truth for behaviour: `../../model/engine.c4`, `../../docs/decisions.md`, `../../docs/states.md`. This file says how that behaviour is built on Archon (dev commit `f9d1d2b`). Order of work: `../../docs/build-plan.md`. Revised after the design review below.

## Shape in one screen

- **One run = one step, no in-run loops.** Archon refuses a `wait` that is not the only sink of a loop body and any sub-run inside a loop. So every stage workflow runs once per attempt and ends either at its gate or by firing the next step. A retry ("clarify", "redo", a fix round, "changes") is a new run of a workflow, and the count lives in the item's document, never in the engine.
- **Item key.** Every run carries `--item issue-<n>`; a slice child carries `issue-<n>/slice-<id>`. Archon admits one non-terminal run of a workflow per item; a second fire is `queued` or `skipped`, and the firing script records which.
- **State.** The `state:*` label is the only state (decision 28). `.shared/state.ts` moves it with `workitem.label.add` and `label.remove` (not `labels.set`, which replaces the whole set and races people), reads it back, and refuses a move from a label it did not expect: it raises a request instead of overwriting. The Archon state document `work/<n>` (project scope, under 64 KiB) holds only facts tied to the current state: rounds used, "changes" used, verdicts with their diff fingerprint, the base check result, slices, flags. Every run starts with `reconcile`: label and document agree, or the run stops and asks.
- **Chaining.** The last script of a step calls `trigger.fire(<absolute path of the binding file>, inputs, {item})`. Binding files are written once by `archon pack bindings --out <dir>`; the pack setting `bindings_dir` names that directory. Fire-only bindings need no registration.
- **Gates** are the last node of a run: `wait` with `form: select`, options with `value.effect`, the head SHA shown on the card in the value, `recommendation`, `other: true` (its effect: record the text as a ruling, state unchanged). The next run reads the answer from the previous run's output through its inputs. Answers keyed by run and wait; a second answer to a closed wait is refused. A running `archon serve` continues answered runs.
- **Agents judge, scripts act.** Agent nodes return `output_format` JSON (Codex strict mode: every property listed in `required`, optional ones as `["array","null"]`) and write nothing public. Every public write is a script that checks the current state first, writes, and reads back, so a retry never writes twice.
- **Policy is read from the base, never from the item branch:** scripts read `.pipeline/*` with `git show origin/<base>:.pipeline/<file>`. A PR that touches `.pipeline/`, `.archon/`, `.github/workflows/` or check configuration is never R0 and is flagged first on the merge card.
- **Operator-owned files** in each project, on the base branch: `.pipeline/project.yaml` (base branch, check command and toolchain, deploy hook, Watcher signals, total time and cost limits for the revisit check), `.pipeline/trusted.json` (decision 39), `.pipeline/automerge.yaml` (R0 rules with never-zones and working hours, decision 25). Model aliases live in `.archon/config.yaml`, where Archon reads them.
- **Registers in the tracker** (new decision 44): rejected requests are closed issues labelled `pipeline:rejected`; project rulings are one pinned issue "Pipeline rulings" kept as append-only comments. Item rulings are comments on the item issue (all sizes), so the body digest that trust pins (decision 39) never changes by our hand. Specs, plans and research are files on the item branch under `.pipeline/work/<n>/` and land with the PR (decision 14).
- **Trust covers every input, not only the request body.** Agents read comments only from trusted authors and the Operator; any other quoted text (alerts, issue comments, code comments, discoveries) is passed as marked data.
- **Gate channel:** the Archon console, which renders `wait` gates (decision 12 revised: Claude Desktop is not wired).

## Workflows

A = agent, S = script, W = wait. Every run starts with `S reconcile` (not repeated below).

| Workflow | Started by | Nodes | Ends |
|---|---|---|---|
| `pipeline-intake` | schedule every 300 s: the next open issue with no `state:*` label, oldest first (a poll, not webhooks: installed-pack event bindings need the pack in the project's own workflows) | S `cap` (stop if 3 items have an open request) · S `trust` (trusted author, or an approval: the label `pipeline:approved` set by the Operator or a trusted author, pinned to the body digest; otherwise label `pipeline:needs-approval`, end) · S `state` Triaging · A `triage` (also searches open and merged PRs for the same issue or files) · S `evidence` · S `state` TriageReview · W `accept` | next: `pipeline-intake-apply` |
| `pipeline-intake-apply` | fire | S `apply` (labels, ruling comment, `pipeline:rejected`, closing comment, discoveries) | fires spec (M, L) or deliver (S); ForHuman; Cancelled |
| `pipeline-spec` | fire | S `cap` · A `questions` · W `ask` (when there are questions; all in one message) | fires `pipeline-spec-write` |
| `pipeline-spec-write` | fire | A `interviewer` · S `commit-spec` · S `state` SpecReview · W `spec-gate` (approve / clarify + comment) | fires `pipeline-spec-apply` |
| `pipeline-spec-apply` | fire | S `ruling` · S `count` (clarify ≤3, then the request asks) | approve: fires plan; clarify: fires spec-write |
| `pipeline-plan` | fire | A `researcher` (L) · S `check-refs` · A `planner` · S `check-plan` · S `state` PlanReview · W `plan-gate` | fires `pipeline-plan-apply` |
| `pipeline-plan-apply` | fire | S `ruling` · S `count` · S `slices` (sub-issues with blocked-by, idempotent by slice id) | approve: fires deliver; redo: fires plan |
| `pipeline-deliver` | fire: from intake-apply (S), plan-apply, merge "changes", land conflict or red | S `rounds` (reads `work/<n>`: at 3 failed rounds → Blocked) · S `route` (another PR or a merged change already does this: W park / verify / continue) · S `base` (the full check at the base commit: failing test ids stored; a base that is red beyond known ids → W wait / except listed ids / for a human) · S `state` Implementing · S `frontier` · `workflow: pipeline-slice` fan_out (isolation: worktree, `max_parallel` 1 until the project declares per-slice resources) | fires `pipeline-verify` |
| `pipeline-slice` | child | A `implementer` (fresh session, progress file on its branch; returns branch, `steps_skipped[]`, discoveries) · S `commit` | `pushed` or `failed(reason)`; a failed slice is one failed round, dependents stay out of the frontier, passing branches are kept |
| `pipeline-verify` | fire | S `join` (slice branches into `pipeline/<n>`; conflict → back to deliver) · S `frontier-left` (slices unblocked by this round → fire deliver, no round spent) · S `push` · S `publish` (opens or updates the draft PR and its description, decision 43) · S `state` Verifying · S `ci` (checks at the head, timeout from `project.yaml`; ids also failing at the base are not counted) · S `guard` (deleted or skipped tests, lowered thresholds, policy or check files) · S `threads` (trusted people's open threads) · A `review` · A `validator` (when the item has criteria) · S `round` (classifies failures: a usage limit or a 5xx holds without a round; a crash, a missing verdict or a fix verdict is a round; records verdicts with the fingerprint; discoveries, at most 3 per item) | pass: fires merge; fix: fires deliver; Blocked: W `blocked` (one more round / back to plan / for a human / cancel, with the trend, decision 37) |
| `pipeline-merge` | fire | S `rules` (reads `guard` flags; R0 by facts; manual merge setting; kill switch by the revert rate) · S `state` MergeReview · W `merge-gate` (merge, carrying the head SHA shown / changes + comment) | fires `pipeline-land` |
| `pipeline-land` | fire; `resource: merge`, capacity 1 | S `ruling` (changes: comment as a ruling; "changes" ≤3, then the request offers back to plan) · S `land` (head equals the SHA on the card or back to MergeReview with a new card; update on the latest base; wait for CI; every verdict's fingerprint current or only the stale checks run again; merge pinned to the head; read back; at most 3 update attempts, then a request) | merged: fires deploy; changes, conflict or red: fires deliver |
| `pipeline-deploy` | fire; `resource: deploy`, capacity 1 | S `deploy` (the project's hook) · S `state` Live · S `watch-start` | fires `pipeline-watch` every 5 minutes until the window ends |
| `pipeline-watch` | fire | S `signals` (before/after for the signals this PR touches and the whole service, excluding the minutes of other deploys) · A `watcher` (returns `coverage: full or health-only`) · S `outcome` | clean at the end: Done (health-only noted); regression in this PR: revert PR through land, deploy, RolledBack, report, a work item with evidence; unsure: a request |
| `pipeline-revisit` | schedule every 900 s | S `blocked` (blocker closed: update the request) · S `orphans` (an Operator-free state label with no live run and no open request: a request; a run past the total time or cost limit: cancel and count a round) · S `stale` (two unreadable reads: set aside) | — |
| `pipeline-retro` | schedule every 604800 s | S `metrics` (seven numbers) · A `retro` · S `file` (proposals as issues, never discoveries) · S `summary` | — |
| `pipeline-ping` | by hand | install check; the git and gh guard against the project's own test suite; GitHub access for `gh api`; Codex credentials; bindings directory | — |

## Shared modules (`.shared/`)

| Module | Holds | Decisions |
|---|---|---|
| `state.ts` | the 15 states, allowed moves, label add/remove with read-back, refusal of unexpected labels | 28 |
| `work.ts` | the `work/<n>` document, conditional writes, `reconcile` | 15, 33 |
| `fingerprint.ts` | `git patch-id --stable` of merge-base..head; a rebase with no change near the diff keeps it, a nearby change re-runs the stale checks | 33 |
| `request.ts` | decision requests by the presentation rules, `value.effect`, validation; the cap counts open requests | 9, 11, 38 |
| `rulings.ts` | ruling comments with author and date; the project rulings issue, append-only | 32 |
| `trust.ts` | trusted authors from the base, approval pinned to the body digest, marking of untrusted text | 39 |
| `policy.ts` | reads `.pipeline/*` from the base, settings `implement_lane`, `merge_lane`, `bindings_dir`, `base` | 10, 25, 40 |
| `github.ts` | what the forge lacks, through `gh api`: sub-issues, blocked-by, branch update, PR search | 16 |
| `fire.ts` | `trigger.fire` with the binding path, records admitted, queued or skipped | — |

Forge operations declared in `.pack/pack.yaml` `forge.operations`: `workitem.view|list|comments|create|close|comment.upsert|label.add|label.remove`, `repo.label.ensure|file`, `pr.view|create|edit-body|ready|draft|files|merge|merge-state|threads|thread.reply`, `checks.state|commit`. All labels are ensured at install.

## Agents and models

Aliases in `.archon/config.yaml`; every `model:` is a list ending in a tier. The reviewer's list has no fallback to the Implementer's family: when Codex is not available the review node fails closed and the item waits on a request "review unavailable". Limits are written in each workflow YAML: `idle_timeout` on every agent node, `maxBudgetUsd` on Claude nodes; Codex cost is estimated from tokens and marked as an estimate (decision 29 revised); the total wall clock is enforced by `pipeline-revisit` until the sandbox provider plugin does it per session.

| Node | Model | Reads | Returns |
|---|---|---|---|
| triage | `[@triage, medium]` | issue, trusted comments, code, open and merged PRs, rulings, rejected issues | size, risk, outcome, reason, assumptions, claims with evidence, root cause (bugs), duplicates found |
| questions, interviewer | `[@interviewer, large]` | issue, code, rulings, ADRs | questions; spec with criterion ids, examples, not in scope, assumptions with sources |
| researcher | `[@researcher, large]` | code | modules and invariants with file:line |
| planner | `[@planner, large]` | spec, research, code | slices: files, risks, check command, criterion ids, blocked-by |
| implementer | `[@implementer, large]` | slice or findings, progress file | branch, `steps_skipped[]`, discoveries |
| review | `[@review]` (Codex) | PR, spec, code around it, trusted threads | pass / fix / block, findings re-checked, explanation for R1/R2 |
| validator | `[@validator, large]` | criteria, the running app | per criterion: pass or fail, runnable check and output |
| watcher | `[@watcher, medium]` | numbers from `signals`, the PR diff | clean / regression in this PR / unclear / unsure, coverage |
| retro | `[@retro, large]` | traces, corrections, rounds, rollbacks | proposals with cases |

## Tests

Every workflow has `fixtures/*.stubs.yaml`, one per transition it makes, asserting `reached` nodes and status. A dry run executes every script node that is not stubbed, so fixtures stub every script that writes or fires. Fixtures exist for: a fourth round across runs; "changes" three times; a land conflict; a head pushed after the card; a red base; a usage limit; a crashed reviewer; Codex unavailable; a failed slice beside passing ones; 50 waiting issues against the cap; a PR editing `.pipeline/automerge.yaml`; a duplicate PR found by `route`; an orphaned label after a restart. `archon workflow test` runs them all; a pack change does not merge while any is red (decision 41).

## Settings and setup per project

`.archon/packs/redikultsev.agentic-pipeline.yaml`: `implement_lane`, `merge_lane`, `bindings_dir`, `repo_host`, `repo_path`. Setup: install the pack; `archon pack bindings … --out <dir>` writes the fire and schedule binding files; schedule bindings are installed as timers or fired by cron; the `.pipeline/` files and the labels exist on the base; `pipeline-ping` is green.

## Known gaps on this Archon commit

- **Before the first live run (blockers):** agents still hold the owner's GitHub token in the Archon container; the guard filters commands but not `gh api` merges. Interim: a fine-grained token limited to the trial repository, and `land` refuses unless its own checks pass. The real fix is the sandbox with a push proxy (build plan step 3).
- No total wall clock per agent session; `pipeline-revisit` cancels late runs at 15-minute resolution.
- No sub-issue operation in the forge; `github.ts` needs a logged-in `gh` or App mode in the container.
- The console renders gates but has no board of our states (build plan step 4).
- Calibration sets for the reviewer and the Validator (decision 42) need merged history: built after the first 20 items.

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

## Review

Design review 2026-11-22 on the first draft: task shape check, then three independent critics (Archon facts against the source at `f9d1d2b`; replay of the trial episodes and variants; opponent with a premortem). Not done yet: a second pass by a fresh critic on this revision, and live verification.

| # | Finding | Decision |
|---|---|---|
| 1 | Two waits in one loop body and sub-runs inside a loop are refused at load | ✅ one run per step, no in-run loops; retries are new runs |
| 2 | `trigger.fire` takes a binding file path; fire may be queued or skipped | ✅ `bindings_dir` setting, `fire.ts` records the disposition |
| 3 | Node limits are static YAML; Codex has no cost; no wall clock | ✅ limits in YAML, Codex cost estimated (29 revised), wall clock by `revisit` ⏸ per session until the sandbox |
| 4 | Round cap reset by re-fired runs | ✅ counts in `work/<n>`, read at every start; fixture for a fourth round |
| 5 | Waiting cap never enforced | ✅ `cap` node at intake and spec; counts open requests |
| 6 | Reviewer silently falls back to the same family | ✅ fails closed, request "review unavailable" |
| 7 | Red base counted as the PR's failure (trial entries 18, 31) | ✅ `base` check, inherited ids excluded, request on a red base |
| 8 | Toolchain missing on the host (trial 19, 22, 28) | ✅ toolchain in `project.yaml`, base check before agents, `steps_skipped[]` never a pass |
| 9 | Duplicate work with an open PR (trial, duplicate rebuild) | ✅ triage searches PRs; `route` before deliver and land |
| 10 | Merge click not bound to the head shown | ✅ head SHA in the option, refused on drift |
| 11 | Land conflict strands the item; land loops on a moving base | ✅ conflict fires deliver; 3 attempts then a request |
| 12 | Restart or a dead run leaves orphan labels | ✅ `reconcile` at start, `orphans` in revisit |
| 13 | Publish retry re-runs validation (trial 21); non-idempotent writes | ✅ `publish` step, facts with fingerprints, check-before-write |
| 14 | Blocked has no exit | ✅ `blocked` wait with four options |
| 15 | Untrusted request invisible while waiting (trial 12) | ✅ `pipeline:needs-approval` label, labels ensured at install |
| 16 | Trust covers the body only; discoveries launder untrusted text; discovery loops | ✅ trust on every input, marked data, ≤3 discoveries per item, none from triage or retro |
| 17 | Policy read from the item branch | ✅ read from the base; policy paths never R0 |
| 18 | `labels.set` races people; `workitem.search` is free text | ✅ label add/remove; `workitem.list` by label |
| 19 | No `forge:` block; event bindings need the pack in the project | ✅ operations listed; intake by a schedule poll |
| 20 | Codex strict output schemas | ✅ every property required |
| 21 | Aliases read from `.archon/config.yaml` only | ✅ moved there; lists end in a tier |
| 22 | Deploy and rollback not serialised; busy base baseline | ✅ `resource: deploy`; baseline excludes others' deploys; revert through land |
| 23 | Watcher with no signals reads clean silently | ✅ `coverage` field, noted at Done |
| 24 | Usage limit counted as a round | ✅ failures classified |
| 25 | Parallel slices clash on one host | ✅ `max_parallel` 1 until per-slice resources are declared |
| 26 | Slice failure undefined; item admission blocks sibling slices | ✅ slice keys `issue-<n>/slice-<id>`, `failed(reason)` end |
| 27 | Rulings without author; rulings issue edits race | ✅ comments with author, append-only |
| 28 | Rulings in the S issue body re-trigger intake and break the digest | ✅ rulings as comments |
| 29 | Registers in the tracker contradict decision 14; `github.ts` vs decision 5 | ✅ new decision 44 (tracker registers; forge for GitHub, MCP for other trackers) |
| 30 | Pause, kill switch, never-zones, hours, calibration, gate channel had no build step | ✅ `archon hold` for pause; rules node; calibration ⏸ after 20 items; console as the channel (12 revised) |
| 31 | Dry run executes unstubbed scripts | ✅ fixtures stub every writing script |
| 32 | Agents hold the owner's GitHub token; guard does not stop `gh api` merges | ⏸ sandbox with push proxy (build step 3); interim fine-grained token for the trial repository: the owner's call |
| 33 | `.pipeline/work/<n>/` lands in the base history | ✗ kept: decision 14 puts specs next to the code |
| 34 | Simplest design: one workflow per item with a stage switch | ✗ one workflow per step is what Archon's loop rules allow; a stage switch would be one large workflow with the same steps |
| 35 | Cut M, L, Validator, deploy, Retro for the first run | ✗ the owner asked for the whole pipeline; live runs still go shortest route first (build plan) |
| 36 | Guard breaks the project's tests (trial 29) | ✅ `pipeline-ping` runs the suite through the guard |
