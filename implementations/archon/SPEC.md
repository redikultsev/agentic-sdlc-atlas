# Pack spec: the pipeline on Archon

> **Behind the model since 2026-11-24.** This file describes the pack as built. Decisions 45–54 (`../../docs/decisions.md`) change it; built so far: the MCP client (`.shared/mcp.ts`), the state held by the engine with the 17 states, item keys, the tracker connector with the project map and the write rules of decision 47 (`.shared/connector.ts`, `.shared/map.ts`), environments, holds, TestReview, releases, rollback of a release and toggles (decisions 48–53, 61; `.shared/environments.ts`, `holds.ts`, `releases.ts`, `candidate.ts`). the setup workflow that composes and probes a map (`unify-setup`, `.shared/probe.ts`). Not built: one build for several items (`batch`). Where this file and the decisions disagree, the decisions hold. The order of the rework: `../../docs/STATUS.md`, "Next for the pack".

What the pack contains, node by node, and why each node is an agent, a script or the Operator. Source of truth for behaviour: `../../model/engine.c4`, `../../docs/decisions.md`, `../../docs/states.md`. This file says how that behaviour is built on Archon (dev commit `f9d1d2b`). Order of work: `../../docs/build-plan.md`. Revised after the design review below.

## Shape in one screen

- **Gates sit inside a run.** A `wait` pauses the run and releases its slot; the answer resumes the same run, and the nodes after the gate apply it. Repeats of a gate ("clarify", "redo") are a `loop_group` whose body ends with the gate as its only sink (Archon's rule), with `until_bash` on the decision and the ruling of the previous round recorded at the start of the next. The one place that needs separate runs is the implementation round, because a fan-out of slices (`workflow:` children) is refused inside a loop: each round is one run of `unify-round`, and the count lives in the item's document.
- **Item key.** Every run for an item carries `--item issue-<n>` (`item-PROJ-123` for a tracker key; `runKey` in `.shared/repo.ts`). The run input `number` holds the item's key: `12`, `#12` or `PROJ-123`. Archon admits one non-terminal run of a workflow per item; chain bindings use `overlap: queue`, so a fire from a run that is still finishing waits for it. Slice children carry no item; `fan_out.max_parallel` bounds them. Item-less runs (the poll, revisit, retro, ping) do not reconcile.
- **State.** The engine holds the state (decision 45): the item's Archon state document `work/<key>` (project scope, under 64 KiB) carries it with the facts tied to it: rounds used, "changes" used, verdicts with their diff fingerprint, the base check result, slices, flags. `.shared/states.ts` moves it by a conditional write of the document, so two runs never both move an item, then shows it as the `state:*` label through the connector, one label at a time (never the whole set, which races people), and reads it back. While the tracker is down the engine goes on: a read returns the engine's state unchecked and the label write waits in the connector's queue. A label that shows anything else is a difference: nothing is overwritten, and the run raises one request with three answers: put the tracker back, adopt the tracker's state (both end the run, through the `sync` node in triage, spec and plan and `reconcile-ruling` in round and merge), or leave it. An item from before decision 45 (a document with no state) adopts its label once. Every run starts with `reconcile`: engine, tracker and document agree, or the run stops and asks. A key is `#12` for an issue on the code host or `PROJ-123` for a tracker key (`.shared/item.ts`); `#12` keeps the document `work/12`. Merged work goes MergeReview → Verifying (the merge queue) → Releasing → Live; TestReview exists and nothing enters it yet (environments are a later step).
- **Tracker.** Scripts reach the tracker only through `.shared/connector.ts`, by item key. Without `.pipeline/tracker.yaml` on the base, the tracker is the code host's issues (Archon's forge, `gh api` for sub-issues, "blocked by", label events and listing). With it, each operation is the MCP tool the map names (`.shared/map.ts`, format in its header): required are reading an item with its creator, reading comments, commenting, adding and removing a label (decision 46's three); create, close, list, slices, "blocked by", who set a label and comment edits are optional, and an absent one is skipped (slices and links stay in the engine). The connector applies decision 47 to both: every write has a key, saved in the engine's `ledger/<item>` before the write and the id of what it made after, so a retry edits or finds what it made (a comment by its saved id or its exact text, a create by its title) instead of writing again; every write is read back by key; in an outage comment and label writes queue in the ledger, the latest per key, and go out on the item's next read or write or in `unify-revisit`, while create and close throw for the node's retry; a refused write is recorded in the ledger and the item's next stage raises it as a difference request. The map's `refused` list (text of a tool error) tells a refusal from an outage; a tool the server lacks counts as refused (the map is broken, a person fixes it). PR bodies say "Part of #n", never a closing keyword, so the pipeline's own merge never closes an item behind the engine's back. The code host itself (PRs, checks, merges) stays on the forge.
- **Chaining** between stages is the last script node calling `trigger.fire(<absolute path of the binding file>, inputs, {item})`; every target workflow declares `inputs:` (fire inputs reach only declared ones); binding files come from `archon pack bindings --out <dir>`, named by the pack setting `bindings_dir`. Scripts that fire, read state or call the forge run on the host, never in a container. The disposition (admitted, queued, skipped, null) is recorded in `work/<key>`.
- **Gate options** have `value.effect`; the head SHA shown on a merge card is written in the option's `does` text (the console does not show `value`) and also in `value` for the script; `other: true` records the text as a ruling and leaves the state. A second answer to the same wait is refused by Archon.
- **Agents judge, scripts act.** Agent nodes return `output_format` JSON (Codex strict mode: every property listed in `required`, optional ones as `["array","null"]`) and write nothing public. Every public write is a script that checks the current state first, writes, and reads back, so a retry never writes twice.
- **Policy is read from the base, never from the item branch:** scripts read `.pipeline/*` with `git show origin/<base>:.pipeline/<file>`. A PR that touches `.pipeline/`, `.archon/`, `.github/workflows/` or check configuration is never R0 and is flagged first on the merge card.
- **Operator-owned files** in each project, on the base branch: `.pipeline/project.yaml` (base branch, check command and toolchain, services and environments with their recipes, the release trigger, insignificant paths, toggles (format in `.shared/environments.ts`; without `environments` the older `deploy:` hook and signals are shape A), total time and cost limits for the revisit check), `.pipeline/trusted.json` (decision 39), `.pipeline/automerge.yaml` (R0 rules with never-zones and working hours, decision 25). Model aliases live in `.archon/config.yaml`, where Archon reads them.
- **Registers in the tracker** (new decision 44): rejected requests are closed issues labelled `pipeline:rejected`; project rulings are one pinned issue "Pipeline rulings" kept as append-only comments. Item rulings are comments on the item issue (all sizes), so the body digest that trust pins (decision 39) never changes by our hand. Specs, plans and research are files on the item branch under `.pipeline/work/<n>/` and land with the PR (decision 14).
- **Trust covers every input, not only the request body.** Agents read comments only from trusted authors and the Operator; any other quoted text (alerts, issue comments, code comments, discoveries) is passed as marked data.
- **Gate channel:** the Archon console, which renders `wait` gates (decision 12 revised: Claude Desktop is not wired).

## Workflows

A = agent, S = script, W = wait, L = loop_group. Item runs start with `S reconcile` (not repeated below).

| Workflow | Started by | Nodes | Ends |
|---|---|---|---|
| `unify-poll` | schedule every 300 s, `overlap: skip`, `resource: intake` capacity 1 | S `pick` (through `gh api`: the oldest open issue with no `state:*`, `pipeline:needs-approval` or `pipeline:rejected` label) · S `cap` (3 items with an open request: stop) | fires `unify-triage` on `issue-<n>` |
| `unify-triage` | fire | S `trust` (trusted author, or the label `pipeline:approved` set by the Operator or a trusted author and pinned to the body digest; else label `pipeline:needs-approval`, end) · S `state` Triaging · A `triage` (also searches open and merged PRs) · S `evidence` · S `state` TriageReview · W `accept` · S `apply` (labels, ruling comment, `pipeline:rejected`, closing comment) | fires spec (M, L) or round (S); ForHuman; Cancelled |
| `unify-spec` | fire | S `cap` · S `state` Specifying · A `questions` · W `ask` (only when there are questions) · L ≤3 { S `prev-ruling` · A `interviewer` · S `commit-spec` · S `state` SpecReview · W `spec-gate` } until approve · S `apply` | approve: fires plan; 3 × clarify: a request |
| `unify-plan` | fire | S `state` Planning · A `researcher` (L) · S `check-refs` · L ≤3 { S `prev-ruling` · A `planner` · S `check-plan` · S `state` PlanReview · W `plan-gate` } until approve · S `slices` (sub-issues with blocked-by, idempotent by slice id) | fires round |
| `unify-round` | fire: from triage (S), plan, merge "changes", land conflict or red, and from itself; `isolation: worktree` | S `rounds` (at 3 failed rounds: Blocked) · S `route` (another PR or a merged change already does this: W park / verify / continue) · S `base` (full check at the base commit, failing ids stored; red beyond known ids: W wait / except listed ids / for a human) · S `state` Implementing · S `frontier` · `workflow: unify-slice` fan_out (`max_parallel` 1 until the project declares per-slice resources) · S `join` · S `push` · S `publish` (draft PR and its description, decision 43) · S `state` Verifying · S `ci` (timeout from `project.yaml`; base-failing ids not counted) · S `guard` · S `threads` · S `reviewer-ready` (Codex configured, else W "review unavailable") · A `review` · A `validator` (items with criteria) · S `round` (verdicts with the fingerprint; a crash, a missing verdict or a fix verdict is a round; discoveries ≤3 per item) · W `blocked` (only at 3 rounds or a block verdict: one more round / back to plan / for a human / cancel, with the trend) · S `next` | pass and no slices left: fires merge; slices left: fires round, no round spent; fix: fires round |
| `unify-slice` | child | A `implementer` (fresh session, progress file on its branch; returns branch, `steps_skipped[]`, discoveries) · S `commit` | `pushed` or `failed(reason)`; a failed slice is one failed round, dependents stay out of the frontier, passing branches kept |
| `unify-merge` | fire; `resource: merge` capacity 1 | S `rules` (R0 by facts from the base; `guard` flags; manual merge setting; kill switch; `approved` when the Operator's merge verdict is current, so a re-entered run asks no second gate) · S `state` MergeReview · W `merge-gate` (merge with the head SHA / changes + comment) · S `ruling` ("changes" ≤3, then the request offers back to plan) · S `env` (each pre-merge environment and service the change touches: join the hold or queue (`queued:` flag, the run ends); read what the environment runs, a foreign version is W `env-ask`; cut the candidate, base + item branch; deploy, version read, smoke; red smoke is a fix round; a person's gate moves to TestReview) · W `test-gate` · S `test-ruling` (approve: the approval bound to the restricted tree; changes: Implementing, no round counted, back to the front of the queue) · S `land` (head equals the card's SHA or a new card; update on the latest base; CI; fingerprints current or stale checks re-run; merge pinned to the head; read back; ≤3 update attempts, then a request) ; after the merge every approval's tree is compared with the merged one, a difference is W `tree-ask` (accept / back to the environment) | merged: the holds go to the next items (fired); the release run when the trigger is `merge` or the item is urgent; changes, conflict, red or red smoke: fires round |
| `unify-deploy` (the release run) | fire under the engine key `release`, so one release runs at a time; the hourly run only finds what waits and fires that run (a timer start carries no item) | S `cut` (a merged revert: deploy it unwatched in shape A, clear the blocked line; else every item in Releasing with its PR merged becomes one release record; trigger `operator`: W `release-ask`; a blocked line: W `line-ask`) · S `promote` (each environment after merge in order: recipe, version read from the target, smoke; a person's gate before the next one is W `promote-ask`; after production every item Live) · L until the window ends { S `signals` · A `watcher` (names the culprit item or none) · S `act` (the rollback plan of decision 52: toggle off first, then revert or the previous verified version) · W `pause` } · S `outcome` | Done for every item (a toggle cleanup item filed); a culprit RolledBack with a report and a work item, the others back to Releasing, the line blocked after a redeploy; no culprit or unsure: a request |
| `unify-revisit` | schedule every 900 s, `overlap: skip` | S `blocked` (blocker closed: update the request) · S `orphans` (a running-state label with no live run, no queued start and no open request: a request; a run past the total time or cost limit: `archon workflow cancel` or `abandon` through `ARCHON_CLI_COMMAND`, one round counted) · S `stale` | — |
| `unify-retro` | schedule every 604800 s | S `metrics` · A `retro` · S `file` (proposals as issues) · S `summary` | — |
| `unify-ping` | by hand | install check; guard against the project's test suite; `gh api` access; Codex credentials; bindings directory | — |
| `unify-setup` | by hand (`--no-item --inputs`: server, test item, mode) | S `tools` (the MCP server's tools; fix mode: the current map) · L at most 4 rounds { S `round` · A `compose` (read-only) · S `check` (parse, required operations) · S `probe` (on the test item) · S `card` · W `setup-gate` (approve / redo with a comment / stop) } · S `publish` | approve: a PR with `.pipeline/tracker.yaml` for the Operator to merge (R2) |

A usage limit is not a failure: Archon pauses the run at the provider's limit and resumes it at the reset, so no round is spent. Codex cost is estimated by `round` from the run's token usage.

## Shared modules (`.shared/`)

| Module | Holds | Decisions |
|---|---|---|
| `environments.ts` | services and environments from `project.yaml`, which apply to a change, running a recipe, deploy + version read + smoke | 48 |
| `holds.ts` | the hold and queue of a shared environment per service, handed over at once to the first queued item in Verifying; an item sent back with changes is marked to return first; one delivery id per handover | 51, 53 |
| `releases.ts` | release records, the previous verified version, the blocked line, the rollback plan, the runs under the key `release` (a release whose run died is resumed by the next one) | 48, 52, 61 |
| `candidate.ts` | the candidate commit (base + item branches, `git merge-tree`), the restricted tree, the files that differ | 49 |
| `probe.ts` | the probe of a map on one test item: each declared operation through the connector, passed, failed or not probed; nothing created or closed | 46 |
| `connector.ts` | the one way to the tracker, by item key: read, comment, label, create, close, list, links; the write ledger, read-back, the outage queue, refusals; the code-host adapter; `script()` that runs a script's main and closes the connector | 45, 46, 47 |
| `map.ts` | the project map `.pipeline/tracker.yaml`: format, install check, the MCP adapter | 46, 47 |
| `states.ts` | the 17 states and the allowed moves; the engine's state in `work/<key>`, shown as a label through the connector; a difference with the tracker and its two answers | 28, 45 |
| `item.ts` | item keys: `#12` or `PROJ-123`, the document and slug each names | 45 |
| `mcp.ts` | a small MCP client: stdio and streamable HTTP, typed failures | 46, 47 |
| `work.ts` | the `work/<key>` document with the state, conditional writes | 15, 33, 45 |
| `fingerprint.ts` | `git patch-id --stable` of merge-base..head; a rebase with no change near the diff keeps it, a nearby change re-runs the stale checks | 33 |
| `request.ts` | decision requests by the presentation rules, `value.effect`, validation; the cap counts items the engine holds in an Operator state, not set aside | 9, 11, 38, 45 |
| `rulings.ts` | ruling comments with author and date; the project rulings register item, append-only | 32 |
| `trust.ts` | trusted authors from the base, approval pinned to the body digest, marking of untrusted text | 39 |
| `policy.ts` | reads `.pipeline/*` from the base, settings `implement_lane`, `merge_lane`, `bindings_dir`, `base` | 10, 25, 40 |
| `github.ts` | what the forge lacks on the code host, through `gh api`: branch update, PR search, the pipeline's login | 16 |
| `fire.ts` | `trigger.fire` with the binding path; records the disposition, including null | — |

Forge operations declared in `.pack/pack.yaml` `forge.operations` (the `workitem.*` ones only for the code-host adapter): `workitem.view|list|comments|create|close|comment.upsert|label.add|label.remove`, `repo.label.ensure|file`, `pr.view|create|edit-body|ready|draft|files|merge|merge-state|threads|thread.reply`, `checks.state|commit`. All labels are ensured at install.

## Agents and models

Aliases in `.archon/config.yaml`; every `model:` is a list of at least two entries ending in a tier. A model list cannot fail closed (the tier always resolves), so the script `reviewer-ready` checks that the reviewer's alias resolves to another family than the Implementer's before the review runs. Limits are written in each workflow YAML: `idle_timeout` (milliseconds) on every agent node, `maxBudgetUsd` on Claude nodes; Codex cost is estimated from tokens and marked as an estimate (decision 29 revised); the total wall clock is enforced by `unify-revisit` until the sandbox provider plugin does it per session.

| Node | Model | Reads | Returns |
|---|---|---|---|
| triage | `[@triage, medium]` | issue, trusted comments, code, open and merged PRs, rulings, rejected issues | size, risk, outcome, reason, assumptions, claims with evidence, root cause (bugs), duplicates found |
| questions, interviewer | `[@interviewer, large]` | issue, code, rulings, ADRs | questions; spec with criterion ids, examples, not in scope, assumptions with sources |
| researcher | `[@researcher, large]` | code | modules and invariants with file:line |
| planner | `[@planner, large]` | spec, research, code | slices: files, risks, check command, criterion ids, blocked-by |
| implementer | `[@implementer, large]` | slice or findings, progress file | branch, `steps_skipped[]`, discoveries |
| review | `[@review, large]` (Codex; checked by `reviewer-ready`) | PR, spec, code around it, trusted threads | pass / fix / block, findings re-checked, explanation for R1/R2 |
| validator | `[@validator, large]` | criteria, the running app | per criterion: pass or fail, runnable check and output |
| watcher | `[@watcher, medium]` | numbers from `signals`, the PR diff | clean / regression in this PR / unclear / unsure, coverage |
| retro | `[@retro, large]` | traces, corrections, rounds, rollbacks | proposals with cases |
| setup (compose) | `[@setup, large]`, read-only | the project's MCP tools as marked data, the map format, the current map and the problem (fix mode), the last probe and the Operator's comment | the map, notes, assumptions |

## Tests

Every workflow has `fixtures/*.stubs.yaml`, one per transition it makes, asserting `reached` nodes and status. A dry run executes every script node that is not stubbed, so fixtures stub every script that writes or fires. Fixtures exist for: a fourth round across runs; "changes" three times; a land conflict; a head pushed after the card; a red base; a usage limit; a crashed reviewer; Codex unavailable; a failed slice beside passing ones; 50 waiting issues against the cap; a PR editing `.pipeline/automerge.yaml`; a duplicate PR found by `route`; an orphaned label after a restart; a queued fire not taken for an orphan; a second clarify and a third. `archon workflow test` runs them all; a pack change does not merge while any is red (decision 41). The shared modules have `bun test` tests in `tests/`: the state moves and differences, and the connector's write rules and the map (see `README.md`).

## Settings and setup per project

`.archon/packs/redikultsev.unify-sdlc.yaml`: `implement_lane`, `merge_lane`, `bindings_dir`, `repo_host`, `repo_path`. Setup: install the pack; `archon pack bindings … --out <dir>` writes the fire and schedule binding files; schedule bindings are installed as timers or fired by cron; the `.pipeline/` files and the labels exist on the base; `unify-ping` is green.

## Known gaps on this Archon commit

- **Before the first live run (blockers):** agents still hold the owner's GitHub token in the Archon container; the guard filters commands but not `gh api` merges. Interim: a fine-grained token limited to the trial repository, and `land` refuses unless its own checks pass. The real fix is the sandbox with a push proxy (build plan step 3).
- No total wall clock per agent session; `unify-revisit` cancels late runs at 15-minute resolution.
- No sub-issue operation in the forge; the code-host adapter needs a logged-in `gh` or App mode in the container.
- A map adapter is checked against a fake MCP session only; a real tracker through a map is step 6 of `../../docs/STATUS.md`. Not verified there: whether an approval marker in a comment survives the tracker's comment format (trust pins the body digest in it).
- The console renders gates but has no board of our states (build plan step 4).
- A run paused at TestReview, `env-ask` or `tree-ask` may keep the `merge` resource while it waits, which would stop other merges until the answer; not checked on this commit.
- The answerers of an environment gate are named in the request, not checked (no identity on an answer).
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

Design review 2026-11-22 on the first draft: task shape check, then three independent critics (Archon facts against the source at `f9d1d2b`; replay of the trial episodes and variants; opponent with a premortem). A second pass by a fresh critic followed (below). Not done: live verification on Archon; every claim about Archon is from its source at `f9d1d2b`, not from a run.

| # | Finding | Decision |
|---|---|---|
| 1 | Two waits in one loop body and sub-runs inside a loop are refused at load | ✅ superseded by #37–38: gates inside runs, loops with the gate as the only sink, separate runs only for implementation rounds |
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
| 36 | Guard breaks the project's tests (trial 29) | ✅ `unify-ping` runs the suite through the guard |

### Second pass (fresh critic on the revision)

| # | Finding | Decision |
|---|---|---|
| 37 | After a gate at the end of a run nothing can fire; a timer-started run has no item for an asks trigger; fire inputs need declared `inputs:` | ✅ gates inside runs, the answer resumes the run; repeats as a loop with the gate as the only sink; the poll is split from triage; every target declares `inputs:` |
| 38 | The rationale overstated Archon's rule: a wait is allowed as a loop's only sink | ✅ rewritten; separate runs only for implementation rounds |
| 39 | `model: [@review]` is refused and a tier always resolves | ✅ lists of two ending in a tier; `reviewer-ready` script fails closed |
| 40 | The head SHA in `value` is not shown | ✅ in `does` as well |
| 41 | Slice children carry no item | ✅ slice keys dropped; `max_parallel` bounds them |
| 42 | `frontier-left` fired a round while verification still ran | ✅ remaining slices are fired by the round's last node |
| 43 | Overlap unspecified; poll starvation on untrusted issues; concurrent polls | ✅ `queue` for chains, `skip` for timers; `needs-approval` excluded; `resource: intake` |
| 44 | Watch cadence had no mechanism | ✅ a loop with a timed wait as its only sink; reverts not watched again |
| 45 | No script API to cancel; paused runs need `abandon`; container scripts cannot fire | ✅ CLI through `ARCHON_CLI_COMMAND`; firing scripts run on the host |
| 46 | A queued fire looks like an orphan | ✅ queued starts count as live |
| 47 | Usage limit "holds" with no mechanism | ✅ Archon pauses at the provider limit and resumes at reset; no round |
| 48 | Rounds share one checkout | ✅ `isolation: worktree` on `unify-round` |
| 49 | Cut the task-shape table, module and agent tables, review table | ✗ kept: the spec is the build reference, and the review record is required here |

