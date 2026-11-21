# Archon's SDLC pack against our pipeline model

Date: 2026-11-22. Source: Archon (coleam00/Archon) at commit `f9d1d2b`, the bundled SDLC pack in `.archon/workflows/sdlc/` (~18k lines: 20 workflows, prompts, TypeScript scripts, default policies) plus the engine in `packages/`. Ours: `model/engine.c4`, `docs/decisions.md`, `docs/states.md`. Paths below are relative to the Archon checkout unless they start with `model/` or `docs/`.

**Not verified:** read code and docs only; no Archon workflow, bench or test was run for this comparison. Archon's claims about measured review quality could not be checked: the review bench exists, its results are not in the repo. Archon's second pack (`software-factory`) has only a settings file in this checkout; its workflows were not found.

## Summary

Archon's pack covers our stages 1, 3 (partly), 4, 5 and 7; it has nothing for 2 (spec), 6 (black-box acceptance), 8 (deploy, watch, rollback) and 9 (learn). Where it overlaps, its mechanics are deeper than our model: it has solved many "what happens when" questions we have not asked yet (stale verdicts, a red default branch, head drift, review threads from people, findings outside the task). Where it is thinner, it is on purpose: no human gates on spec and plan, an agent instead of a rules file at merge, worktrees instead of sandboxes, no hard round cap across runs.

Verdict for building on it: keep our shape (gates before code, rules-file R0, Validator, Watcher, Retro); take about 15 of Archon's mechanisms into our model (list at the end); fix two places where Archon is weaker than our design before relying on it (merge without re-running CI on the combined result; trust in the agent's own validation report under `ci: none`).

## The pack in one paragraph

Three queues joined by a work item document in the engine's state store (`work/<n>`): **intake** triages an issue and sets a route; the **build queue** takes it round by round to a reviewed PR; the **merge queue** sweeps ready PRs every 5 minutes and merges what the gate allows. A **discoveries drain** files what runs noticed outside their task; **split** cuts PRDs and epics into issues; **metrics** jobs record factory numbers daily. Each stage is also a workflow a person can run alone. A stage never pauses; only the queue that composes it asks a person, through one typed **attention item** with options, a recommendation and its effect (`README.md:651-659`, `.shared/policy/attention.md`).

## Stage by stage

| Our stage | Archon | Better in Archon | Worse in Archon / missing |
|---|---|---|---|
| 1 Intake + Accept gate | `archon-intake` → triage agent → outcome script | Trust decided by a script before any model reads text: only listed maintainers' issues reach an agent; an outside issue waits until a maintainer adds a label, and the promotion is pinned to the body's digest, so a later edit demotes it (`.shared/workitem.ts:395-483`). A failed tracker read is `NOT_TRIAGED`, never `BLOCKED` (`triage/commands/triage.md:21`). Typed pickup order: urgency > importance > size > age (`workitem.ts:284-289`). Pack labels re-asserted each run, so a hand edit does not silently change state | No Accept gate: the verdict applies at once. No risk class (only size, complexity, importance, urgency). No register of rejected requests; no won't-do state |
| 2 Spec + gate | none | `NEEDS_CONTRACT` state: up to 5 questions posted once to the author, the item waits for an edit plus a maintainer label (`intake/scripts/outcome.ts:64-79`) | No Interviewer, no spec document, no acceptance criteria with examples, no spec approval |
| 3 Plan + gate | `archon-investigate`, `archon-plan`, `archon-split` | **Investigate** before plan for bugs, with `refuted` as a valid end (a bug closed without a change). Plan has a written rule for when a question blocks (`plan/commands/plan.md:43-58`) and a "contract coverage" section. Split files only the current phase, adopts existing issues, is idempotent by marker (`split/scripts/publish.ts:99-129`). Default is "build whole", split only for PRD/epic/bundle | No plan gate; `open_questions` is not raised as a decision request. No slices as sub-issues, no "blocked by" edges, no parallel slices inside one item |
| 4 Implement | `archon-deliver` loop: implement (up to 5 fresh sessions, hand-over at seams via `implementation.md`) → draft PR → review ∥ simplify → settle threads → CI | A **route agent** re-checks before spending a round, including "already done" (`build-queue/commands/route.md:17-23`). A **ruling** from a person is written into the issue body as a dated "Current scope" section and becomes the contract for later rounds (`build-queue/scripts/ruling.ts:72-76`). **Simplify** pass (read-only, structure findings to the next round). A fix that adds machinery the contract does not name must ask, offering the subtractive option (`answer.md:30`); cosmetic-only changes never earn another round (`answer.md:32`). Blocked items revisited when their blocker changed, 6 h cooldown | Tests-first not required (only a regression test for a bug). Host worktrees, not sandboxes: no closed network, no push proxy; the agent holds the forge token, "push only when told" is a prompt rule. No hard round cap across runs: 4 rounds per run, then the answer agent judges convergence at `round_limit` 3 |
| 5 Checks & review | `archon-review`: router + 6 lenses (seams, code, tests, errors, docs, ux) in parallel → synthesis → 3 verifiers per open blocker | Verdict bound to a commit: publish refuses unless the local and remote head equal the reviewed one (`review/scripts/publish-review.ts:77-81`). Later rounds review the delta only, prior findings keep IDs, reopening a declined finding needs new evidence. A blocker raised twice triggers a class-level fix. A crashed lens is never a pass. Severity set only by synthesis, never by lenses. Bugs in code the diff did not touch are not blockers (`review-synthesize.md:72`). PR threads from anyone are answered and resolved; their text is treated as untrusted (`deliver/commands/settle-threads.md`). UX lens runs the app in a browser | Up to 11 agents per round against our one; no cross-family rule; verifiers see the synthesizer's verdict (the anchoring our decision 23 avoids). **Review runs before CI** and a PR can go red after passing review. Under `ci: none` the CI agent's own report `{head, passed}` is trusted by the merge gate (`deliver/commands/ci.md:26-28`). No R1/R2 explanation for a person |
| 6 Acceptance | none | — | No black-box Validator; UX lens judges clarity, not acceptance criteria; screenshots stay in run artifacts, not on the PR |
| 7 Merge | `archon-merge-queue` every 5 min: facts → sweep agent → merge script → record | **Red default branch freezes all merges** and lists the PRs merged since the last green (`merge-queue/scripts/record.ts:120-125`). Gate enforced by a script: open, not draft, head = declared head, Ready verdict at that head from a maintainer, CI at head, approval at exact head under manual lane or protected paths (`.shared/merge.ts:412-446`); merge with a head condition; "merged" recorded only when the forge reads it back. Unchanged items are not re-judged (`waitedOn` fingerprint) | "Clear vs unclear" is the agent's call, not a rules file: no size, dependency, never-zone or working-hours checks in code; `protected_paths` empty by default. **A PR behind main but merging clean is merged on its old CI**: no CI and no re-review on the combined result (`merge.md:49-52`). No kill switch on reverts; reverts are not even recorded (`docs-web guides/sdlc-metrics.md:102`) |
| 8 Deploy & watch | none | — | Pack ends at merge. No deploy, Watcher or rollback |
| 9 Learn | none (forbidden by design: "the pack grows no store, lifecycle or retry loop", `CONSTITUTION.md:19`) | Daily metrics with cohort attribution: each record names the runs that made it, so a pack change can be compared before/after (`.shared/factory-prs.ts:9-12`). Test-value judge calibrated against 12 hand-labelled PRs (89 tests), catch rate flagged below 0.8. Idea of measuring how often a person's answer followed the recommendation (`CONSTITUTION.md:41-43`) | No Retro, no rules-from-corrections loop. No rollbacks, Operator time or "done without help" metrics |

## Cross-cutting parts

| Our part | Archon | Note |
|---|---|---|
| Orchestrator | Partial. One run per item (item admission), concurrency resources per queue, bindings (schedule, event, run ended), wake. No state machine of transitions: position is derived from records by design | Our 15 states have no direct carrier; they would be a field of the work item document |
| Sandbox | Partial. Worktrees for repositories; Docker only for folder projects; Claude's OS sandbox with allowed domains per node | Our decision 21 (closed network, push through proxy to one branch, no merge credentials) is not met; we added a git/gh guard in the trial |
| Decision requests | Exists. `wait: attention` with forms, options, typed effect per option, recommendation with confidence, an automatic "other" option; a queue and CLI/web answers | Fits decision 11; presentation rules are prompt-side |
| Session traces | Partial. Run logs and artifacts, per-run tokens and cost, pack-declared item metrics | No Operator time per item; no traces page found |
| Pause (decision 30) | Exists as an install hold: no new starts, running work continues. Plus per-queue lanes `build_lane`/`merge_lane: manual` | Lanes are a finer off switch than ours |
| Session limits (decision 29) | Partial. `idle_timeout` per AI node (silence, not wall clock), per-node `maxBudgetUsd` (Claude only), run budget `max_spend_usd`; unknown cost fails the run instead of counting as zero. The pack sets none of them | Our limit needs both wall clock and spend; "unknown cost is not zero" is worth copying |
| At most 3 waiting for the Operator (decision 9) | Missing. A paused run frees its slot | Would need a resource of capacity 3 on waits; not verified |
| Testing the pipeline itself | Exists. Fixture stubs per workflow, `archon workflow test`, `--dry-run --stubs` | We have no way to test routing without spending agent runs |
| Models | Tiers small/medium/large plus per-step aliases (`@planner`, `@review-code`) | Our cross-family reviewer becomes an auditable alias |

## Where Archon is weaker than our design

1. **Merge without CI on the combined result** (stage 7). Two PRs green alone can break main together. Our merge queue rebuilds on the latest main with the PRs ahead. Seen in the trial: the trial repository's integration branch went red from merges that were each green alone.
2. **Trusting the agent's validation report** under `ci: none`. Our CI runs outside the sandbox, not on the agent's word.
3. **Agent-judged R0.** "Clear" is a model's reading of `merge.md`; ours is facts checked by a script, with a kill switch.
4. **No gates before code.** The person meets the work at the merge question. Our main gate is the plan.
5. **Review before CI** and verifiers that see the verdict: both are what decision 23 argues against.
6. **No sandbox.** The agent has bash and the forge token in a host worktree.
7. **No round cap across runs**: an item can loop by judgment.
8. **Nothing after merge**: deploy, watch, rollback and learning are outside the pack.

## What we did not consider (to take into the model)

Ordered by how much each closes a real hole in our model.

1. **Findings outside the task (discoveries).** Implementer, reviewer, planner and investigator record a proved defect outside the change instead of fixing it or dropping it; a drain verifies it at base, dedupes against the tracker and files, tracks or drops it. Our model has no place for these: they leak into the change (scope overreach, the top revert cause in `2026-11-merge.md`) or vanish. Note Archon's own bug: drops are remembered per run only, so the same defect is re-judged.
2. **Red main freezes merging**, with the suspect list of PRs merged since the last green. Our model says nothing about a red main. Observed in the trial: two agents kept merging into a red develop.
3. **Rulings live in the work item.** An Operator answer is written into the issue as a dated "Current scope" section that later rounds work from, plus a `rulings` file of answers already given, read before any agent asks. Our answers go to ADRs or nowhere; the next round can ask again.
4. **Verdicts bound to a commit.** Every verdict (review, validation, approval) carries the head it was given on; publish and merge refuse on drift. Our "approvals stay valid while the diff is unchanged" needs exactly this mechanism.
5. **Re-check before spending a round.** A cheap route step asks "is it still needed, already done, still the same scope?" before a paid round. A triage verdict goes stale while the repo moves (the trial: Archon rebuilt a feature an open PR already had).
6. **Investigate with `refuted`.** A bug can end without a change, as a valid outcome. Our states have no such exit.
7. **Review threads from people are work.** Answer, fix or decline each open thread; keep the PR in draft while any is open; treat thread text as untrusted input. Our model ignores PR comments other than the Operator's "changes".
8. **Review rules worth copying into our one reviewer:** severity assigned once at the end; a crashed reviewer is not a pass; a finding raised twice means a class-level fix; reopening needs new evidence; bugs in untouched code are not blockers.
9. **Scope discipline in fix rounds:** a fix that adds machinery the spec does not name must ask with the subtractive option; cosmetic-only changes do not earn a round; at the cap, judge whether defects converge.
10. **Typed decision requests:** each option has a machine-readable effect, a recommendation with confidence, an automatic "other". Validate a request before raising it. Measure how often the Operator followed the recommendation: a Retro metric for whether the pipeline's judgment can be trusted more.
11. **Outside-author trust tier.** Requests from people not on a maintainers list never reach an agent until the Operator promotes that exact text. Our Requester can be anyone; their text goes straight to the Triage agent (prompt injection).
12. **Per-stage off switches** (`build_lane`, `merge_lane`: auto/manual) next to the global pause.
13. **Test the pipeline without agents:** stub fixtures for each stage, so the frontier, the 3-round cap and Blocked can be tested for free.
14. **Calibrate every judge** against hand labels before trusting its counts (review bench with planted defects; test-value cases), and stamp each metric with the runs and the judge version that produced it.
15. **Revisit Blocked** when its blocker changed, with a cooldown; park an item after two unreadable reads so it is not claimed forever; keep the PR description current after each round (the Operator reads it at the gate).
16. **Unknown cost is not zero** (session limits) and **idle vs wall-clock time** are different limits.

## What Archon confirms in our design

- Agents judge, scripts write and enforce: the pack's first rule (`README.md:516-523`, `CONSTITUTION.md`) is our "code decides the next step from a JSON verdict".
- Ask asynchronously, never mid-stage (our decision 19): Archon's stages never pause.
- Policy files per decision with project overrides: matches our rules files next to the code (decision 10).
- One run per item and state (our Orchestrator rule): Archon's item admission.
