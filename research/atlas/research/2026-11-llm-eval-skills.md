# Eval skills for a change to an LLM feature

Question: is there a published agent skill (Agent Skills `SKILL.md`, Cursor rule, `AGENTS.md` pack, plugin) that makes a coding agent evaluate a change to a prompt, a model or the model's input properly, so `unify-evals` does not have to be written from scratch?

What "properly" means for us (the test for every candidate):

| Need | Short name |
|---|---|
| A fixed case set: real production cases where allowed, synthetic otherwise, including the neighbouring cases that must not change | **fixed set** |
| Each case run k of N times, because outputs are non-deterministic; one lucky run is never accepted | **k of N** |
| Before and after compared per case, not only as two averages | **per case** |
| Flips reported both ways (fixed and newly broken) | **flips** |
| Cost and latency, before and after | **cost/latency** |
| Bonus: error analysis (read failures, build categories) | **error analysis** |
| Bonus: LLM-as-judge with calibration against human labels | **judge calibration** |
| Bonus: the regression set grows from incidents | **grows** |

Method: read the `SKILL.md` and reference files themselves through the GitHub API; directory lists were used only to find repositories. Stars, licences and last-commit dates are GitHub API values. All sources checked on **2026-11-26**; `[Sn]` refers to the table at the end.

## Summary

- **Nothing fits as is.** No published skill is a gate where an agent checks its own change unattended. The two strongest are built for a person sitting at the keyboard, or for one vendor's server.
- **Closest overall: the Anthropic `claude-api` eval guides** (`build-eval.md`, `eval-audit.md`, `eval-hillclimb.md`, plus a runner scaffold and a report builder) [S1-S5]. They cover the fixed set (real data first, then bug reports, hand-written, synthetic last; inputs signed off), k of N ("record results as k of N reps passed"), a noise floor (`1/sqrt(n·R)`), paired CIs, "within noise means do not merge", cost and latency as absolute numbers first, failure classes, oracle and null checks, and a held-out split. Apache-2.0, plain Markdown plus two Node scripts. The gaps: it is an interactive interview (`AskUserQuestion` sign-offs), the loop is a hill-climb rather than one before/after check, it has no named list of flips both ways, and it is written for Claude apps (pricing, provider).
- **Best rules for the before/after comparison: Arize Phoenix `phoenix-experiments` and its `compare-experiments.md`** [S6, S7]. Same dataset version and evaluators, `repetitions` of at least 3, k of n per example, counts of examples improved versus worse, "examples that pass every run" for must-pass checks, a sign test, must-pass slices that block, and three outcomes (better / worse / not enough evidence). But the procedure runs against a Phoenix server and client; only the rules are portable.
- **Best for the bonus items: `ai-evals-course/evals-skills`** (the AI Evals course plugin; it replaces the deprecated `hamelsmu/evals-skills`) [S8-S12]. `error-discovery` does open coding into failure modes; `validate-evaluator` calibrates a judge with train/dev/test splits, TPR/TNR above 90 %, a Rogan-Gladen correction and a bootstrap CI; `eval-audit` gives a six-area audit. Apache-2.0, plain Markdown. It has nothing on k of N, before/after per case, flips or cost. Its own README says regression suites and cost are left to the course.
- **Everything else is weaker or tied to a tool:** promptfoo (calibrate assertions, add cases for real regressions, held-out set; no reps or flips) [S13]; Braintrust (SaaS; mines bad traces into a taxonomy) [S14]; LangChain (Harbor agent tasks) [S15]; DeepEval (Confident AI) [S16]; `wshobson/agents` `llm-evaluation` (generic metrics catalogue) [S17]; pstack's eval playbook (blinded judging of agent variants, not app outputs) and `benchmark-checklist` (a perf number: 5 alternating runs, median and range) [S18, S19].
- **Verdict: adopt one with a small adaptation.** Vendor Anthropic's `eval-audit.md` (the checklist) and `runner-scaffold.mjs`. Lift the per-case comparison rules from Phoenix `compare-experiments.md` and the judge calibration from `validate-evaluator`. Write a one-page `unify-evals` overlay that makes it unattended and adds what all of them lack (list at the end).

## Candidates

### 1. Anthropic `claude-api` eval guides (anthropics/skills) — closest overall

Repository about 200.5k stars; no repo-level licence; `skills/claude-api/LICENSE.txt` is Apache-2.0; last commit to `shared/evals/` 9d63080 on 2026-10-09 [S1]. The guides are routed from the `claude-api` skill: `build-eval`, `hillclimb`, and "is my eval any good?" each map to a guide [S5].

What it makes the agent do:
- **`build-eval.md`** [S2]: one flow per eval; find the real entry point; sources in order (production logs, bug reports, hand-written, then synthetic, marked lowest fidelity); 15 to 100 inputs; the user approves the actual inputs and the grading method ("wait for a clear yes"). It offers side-channel metrics (cost, latency, tokens, refusals, `max_tokens` hits) and reports them "as absolute numbers first". For labelled classifiers it uses a confusion matrix rather than one pass rate. The runner must call the real entry point, not rebuild the API call. Strict per attempt: "a case that passed only on retry is a fail", and every attempt is counted in cost. It records a failure class (refusal / harness error / timeout / genuine), runs an oracle and a null input through the runner before the first paid call, and estimates cost from the pilot's measured `usage`.
- **`eval-audit.md`** [S3]: harness checklist. Multiple trials with variance reported ("A single rep is a point estimate with no error bar"); grader run twice to measure grader variance; ground truth kept out of the model's reach; noise floor against headroom against the smallest change worth shipping; the headline recomputed from raw rows.
- **`eval-hillclimb.md`** [S4]: baseline across the full set with an environment fingerprint; train/test split stratified by tag, never by score; "k of N reps passed"; the outer session never reads test transcripts. "If the test delta is within noise of zero ... say so plainly and recommend not merging." A failure taxonomy when zeros have mixed causes; a second-model check. It names "Pass<->fail flips between identical-code runs" as the variance signal and asks to tie every delta to "specific flips in the traces".
- **`runner-scaffold.mjs`** [S5]: `--variant / --model / --reps`, `traces/<id>_rep<k>.json`, resume, backoff, a per-case wall-clock ceiling, a served-model assertion, `errors.jsonl`. It refuses to run if the harness changed since a human approved its hash. `build-report-lite.mjs` writes per-case means per variant to `trajectory/scores.tsv`.

Coverage: fixed set **yes** (with sign-off; neighbours only implicitly, as "labeled positive and negative cases"); k of N **yes**; per case **partly** (per-case table per variant, no paired diff list); flips **partly** (mentioned, not a required report); cost/latency **yes**; error analysis **partly** (failure classes, analyzer subagent); judge calibration **partly** (show graded examples until the user agrees; no TPR/TNR); grows **partly** (bug reports as an input source; "make it durable").

Vendorable: plain Markdown plus Node built-ins only. Tied to Claude in its pricing table and provider list, and to Claude Code's `AskUserQuestion` and Task tool for its gates; both are easy to replace.

### 2. Arize Phoenix `phoenix-experiments` (Arize-ai/phoenix) — best comparison rules

Repository 12.4k stars, repo licence Elastic License 2.0; each skill declares `license: Apache-2.0` in its frontmatter; last commit to `skills/` aa88873 on 2026-11-25 [S6]. There are sister skills `phoenix-error-analysis`, `phoenix-judge-alignment` and `phoenix-evals` [S20].

What it makes the agent do [S6, S7]: run the baseline, then the change on the same dataset version with the same evaluators. "Set `repetitions` to 3 or more" when the task or the judge calls an LLM. Compare "per evaluator and per example", reading "the examples that flipped". "Count every run"; for must-pass checks also report "how many examples passed every repetition: an example that fails one run in three is a real, intermittent failure". Must-pass checks and slices the user names block the change. With no stated rule: a paired sign test over improved against worse examples ("With 3 improved and 0 worse, p is 0.25"), and three outcomes. Errors are counted, not dropped. Holdout or cross-validation keeps tuning apart from the final check. Separate regression and capability suites, moving stable cases into regression. `phoenix-judge-alignment` measures a judge against human labels [S20]; `phoenix-error-analysis` does open and axial coding over sampled traces [S20].

Coverage: fixed set **yes** (dataset version, slices); k of N **yes**; per case **yes**; flips **yes** (improved and worse counted and read); cost/latency **no**; error analysis **yes** (sister skill); judge calibration **yes** (sister skill); grows **partly** (regression versus capability suites).

Vendorable: the rules and the sign test are portable prose. The procedures and code call `phoenix.client` and need a Phoenix server ("Requires a Phoenix server"). The repo is ELv2, but the skill files declare Apache-2.0.

### 3. `ai-evals-course/evals-skills` — best for error analysis and judge calibration

1,848 stars, Apache-2.0, last commit 80d5f7b on 2026-09-24, Claude and Codex plugin manifests [S8]. It replaces `hamelsmu/evals-skills` (1,680 stars, MIT, deprecated on 2026-08-16 with a pointer to the new repository) [S21].

What it makes the agent do: `evals-start` routes to a skill [S8]. `error-discovery` builds a local review app, clusters, samples cluster representatives plus 30 to 40 % random picks, and sorts free-text notes into failure modes [S9]. `validate-evaluator` [S10]: train 10-20 % / dev 40-45 % / test 40-45 %; TPR and TNR rather than accuracy; target above 90 %, minimum above 80 %; the test set used exactly once; the Rogan-Gladen correction; a bootstrap CI; "Pin exact model versions" for judges. `eval-audit` [S11] checks six areas (error analysis, evaluator design, judge validation, human review, labelled data, pipeline hygiene). It flags Likert scales and similarity metrics, and says to re-run error analysis "after every significant change". `generate-synthetic-data` builds inputs from dimension tuples aimed at expected failures [S12]; `write-code-eval` prefers code checks for objective rules.

Coverage: fixed set **partly** (synthetic generation, sampling); k of N **no**; per case **no**; flips **no**; cost/latency **no**; error analysis **yes**; judge calibration **yes** (the strongest found); grows **no** (README: "regression suites, and cost" are left to the course).

Vendorable: plain Markdown. `error-discovery` is interactive and says so: in a non-interactive run it only builds and smoke-tests the app.

### 4. Others checked

| Candidate | Licence, stars, last commit | What it makes the agent do | Fit |
|---|---|---|---|
| promptfoo `promptfoo-evals` [S13] | MIT, 27.7k, skill 2026-09-29 | Find an existing config; ordinary cases and known regressions; calibrate each assertion (a known-good output passes, a wrong one fails); held-out set when tuning; separate grader errors from failures; "Add cases for real regressions"; `latency` / `cost` assertions as maxima | Fixed set, cost/latency, grows (partly). No reps, no per-case before/after, no flips. Needs the promptfoo CLI |
| Braintrust `agent-auto-improvement` [S14] | MIT, 3 stars, 2026-11-03 | Mine bad production traces, build a failure taxonomy, store the production output as a per-case baseline, a `beatsBaseline` scorer, compare with the previous experiment; "Do not optimize around one or two traces" | Per-case baseline, error analysis. Needs Braintrust SaaS; no reps |
| LangChain `langchain-eval-engineering` [S15] | MIT, 1.4k, 2026-11-24 (replaces `langsmith-skills`) | Task specs, Harbor environments, verifiers, a trial count and cost confirmed before a run, model-comparison calibration | For agent benchmark tasks, not one prompt's before/after. Needs Harbor/LangSmith |
| DeepEval `deepeval` [S16] | Apache-2.0, 19.7k, 2026-08-24 | Goldens, `deepeval test run`, Confident AI upload, online evals | Library and SaaS workflow |
| `wshobson/agents` `llm-evaluation` [S17] | MIT, 42.9k, 2026-07-07 | Catalogue of metrics (BLEU, ROUGE, perplexity), human eval, A/B tests | Generic text; the evals course's own audit flags these metrics |
| pstack `poteto-mode/playbooks/eval.md` [S18] | No licence, 19.5k, 2026-11-24 | Blinded candidates on N models, one blinded judge on another family, chain checked from transcripts | Evaluates agent or skill variants, not app outputs |
| pstack `benchmark-checklist` [S19] | same | Perf claims: at least 5 runs per side alternating A,B,A,B, median and range, "A gap smaller than the run-to-run variation is no measurable difference", errors counted | The right discipline, but for latency/throughput numbers, not graded outputs |
| `UKGovernmentBEIS/inspect_evals` [S22] | MIT, 758, 2026-11-25 | `.claude/skills` for contributing benchmarks to that repository (`create-eval`, `eval-validity-review`) | Repo maintenance, not app evals. `inspect_ai` itself ships no skill |
| `openai/evals` [S22] | No SPDX licence, 19.8k, 2026-04-14 | Benchmark registry; no agent skill or instruction file | None |
| `anthropics/claude-plugins-official` [S22] | 48.2k, 2026-11-25 | Only `skill-creator` (evals of skills) and a math-proof judge | None for app evals |
| `mattpocock/skills`, `obra/superpowers`, `addyosmani/agent-skills`, `DietrichGebert/ponytail` [S22] | MIT; 333k / 327k / 120k / 199k stars; last commits 2026-11-25 / 11-03 / 11-24 / 11-22 | Skill lists contain no LLM-output eval skill. addyosmani's `evals/` tests its own skills' triggering | None |
| Awesome lists [S23] | — | VoltAgent's list shows Datadog `dd-llmo-eval-bootstrap` / `dd-llmo-eval-trace-rca` and a Hugging Face evaluation skill; ComposioHQ shows a LangSmith trace fetcher | All tied to a vendor platform; not read further |

## Coverage matrix

| Need | Anthropic eval guides | Phoenix experiments | evals-skills | promptfoo |
|---|---|---|---|---|
| fixed set (real first, signed off) | yes | yes | partly | yes |
| neighbouring must-not-change cases named | no (implicit) | partly (must-pass slices) | no | no |
| k of N | yes | yes | no | no |
| per case before/after | partly | yes | no | no |
| flips both ways | partly | yes | no | no |
| cost/latency | yes | no | no | yes |
| never one lucky run | yes (strict per attempt, noise floor) | yes (pass every rep) | no | no |
| error analysis | partly | yes (sister skill) | yes | no |
| judge calibration | partly | yes (sister skill) | yes | partly |
| regression set grows from incidents | partly | partly | no | partly |
| unattended (no human at the keyboard) | no | no | no | partly |
| tool-free Markdown we can vendor | yes (+ Node scripts) | rules only | yes | no |

## Verdict

**Adopt one with a small adaptation.** Base `unify-evals` on the Anthropic eval guides: vendor `eval-audit.md` as the harness checklist and `runner-scaffold.mjs` as the runner shape (Apache-2.0, with the notice kept). Lift two passages as text: Phoenix `compare-experiments.md` for the per-case decision rules (Apache-2.0 per its frontmatter), and `validate-evaluator` for judge calibration (Apache-2.0). Do not load the interactive `build-eval` interview or the hill-climb loop into a pipeline agent as they are.

What our `unify-evals` must say that the best candidate lacks (minimal list):

1. **When it fires.** The plan or diff changes a prompt, a model id or parameter, or what input or context the model gets (for example, how the spreadsheet sheets of an email are split or merged before the intent call). Then the eval is part of the change, not optional.
2. **The case set is fixed before the change** and versioned in the repository. Real production cases where allowed (data handling per Anthropic Step 1), synthetic otherwise, and an explicit **neighbour slice**: cases near the change that must keep their current answer. The agent never edits the set or the expected answers in the same change it is evaluating.
3. **Same harness, both sides.** Baseline and candidate run on the same case-set version, grader, model snapshot and environment fingerprint, through the real entry point, each case k of N (default N = 5 for a classifier; the noise floor decides).
4. **The report is per case and names flips both ways.** For each case: k/N before, k/N after; lists of *fixed* (fail to pass), *broken* (pass to fail), *now intermittent* and *still failing*. Then totals with CIs, error counts, cost per case and latency p50/p95 before and after, in absolute numbers.
5. **Acceptance rule, without a human in the loop.** Reject if any neighbour or regression case drops below N/N, if any case breaks, or if the gain is within the noise floor. A case that passes only some of its N runs counts as failing. One run, or a retry that passed, is never evidence. When in doubt the outcome is "not enough evidence", which escalates to the Operator with the report; it never counts as a pass.
6. **Error analysis on what failed.** Read the failing outputs and their exact inputs, and name a category for each failure before proposing another change (from `error-discovery` and our `unify-root-cause`).
7. **A judge only where code cannot check.** Pin the judge's model; calibrate it on human-labelled cases (TPR/TNR) before its verdict counts; report its own run-to-run variance.
8. **The set grows from incidents.** Every production incident or bug about model output adds its real case (with the expected answer from the Operator) to the regression slice in the fix's change. Cases are never removed silently; a removal is a decision with a reason.
9. **Gates map to our states.** Anthropic's `AskUserQuestion` sign-offs become a case-set approval once per flow (Operator), plus a spend limit per run; inside that limit the agent runs without asking.

## Sources

All checked on 2026-11-26.

| # | Source |
|---|---|
| S1 | anthropics/skills, `skills/claude-api` (licence, commits on `shared/evals`): https://github.com/anthropics/skills/tree/main/skills/claude-api/shared/evals |
| S2 | `build-eval.md`: https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/evals/build-eval.md |
| S3 | `eval-audit.md`: https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/evals/eval-audit.md |
| S4 | `eval-hillclimb.md`: https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/evals/eval-hillclimb.md |
| S5 | `claude-api/SKILL.md` routing, `report/runner-scaffold.mjs`, `report/build-report-lite.mjs`: https://github.com/anthropics/skills/blob/main/skills/claude-api/SKILL.md , https://github.com/anthropics/skills/tree/main/skills/claude-api/shared/evals/report |
| S6 | Phoenix `phoenix-experiments/SKILL.md`: https://github.com/Arize-ai/phoenix/blob/main/skills/phoenix-experiments/SKILL.md ; repo licence: https://github.com/Arize-ai/phoenix/blob/main/LICENSE |
| S7 | Phoenix `compare-experiments.md`: https://github.com/Arize-ai/phoenix/blob/main/skills/phoenix-experiments/references/compare-experiments.md |
| S8 | ai-evals-course/evals-skills README and `evals-start`: https://github.com/ai-evals-course/evals-skills |
| S9 | `error-discovery/SKILL.md`: https://github.com/ai-evals-course/evals-skills/blob/main/skills/error-discovery/SKILL.md |
| S10 | `validate-evaluator/SKILL.md`: https://github.com/ai-evals-course/evals-skills/blob/main/skills/validate-evaluator/SKILL.md |
| S11 | `eval-audit/SKILL.md`: https://github.com/ai-evals-course/evals-skills/blob/main/skills/eval-audit/SKILL.md |
| S12 | `generate-synthetic-data/SKILL.md`, `write-code-eval/SKILL.md`: https://github.com/ai-evals-course/evals-skills/tree/main/skills |
| S13 | promptfoo `promptfoo-evals/SKILL.md` and `references/eval-patterns.md`: https://github.com/promptfoo/promptfoo/tree/main/plugins/promptfoo/skills/promptfoo-evals |
| S14 | braintrustdata/braintrust-skills `agent-auto-improvement/SKILL.md`: https://github.com/braintrustdata/braintrust-skills/blob/main/skills/agent-auto-improvement/SKILL.md |
| S15 | langchain-ai/langchain-skills `langchain-eval-engineering/SKILL.md`: https://github.com/langchain-ai/langchain-skills/tree/main/skills/langchain-eval-engineering ; moved notice: https://github.com/langchain-ai/langsmith-skills |
| S16 | confident-ai/deepeval agent skill: https://github.com/confident-ai/deepeval/blob/main/docs/public/.well-known/agent-skills/deepeval/SKILL.md |
| S17 | wshobson/agents `llm-evaluation/SKILL.md`: https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/skills/llm-evaluation/SKILL.md |
| S18 | cursor/plugins pstack eval playbook: https://github.com/cursor/plugins/blob/main/harness/pstack/claude-code/skills/poteto-mode/playbooks/eval.md |
| S19 | cursor/plugins pstack `benchmark-checklist/SKILL.md`: https://github.com/cursor/plugins/blob/main/harness/pstack/claude-code/skills/benchmark-checklist/SKILL.md |
| S20 | Phoenix sister skills: https://github.com/Arize-ai/phoenix/tree/main/skills (`phoenix-error-analysis`, `phoenix-judge-alignment`, `phoenix-evals`) |
| S21 | hamelsmu/evals-skills (deprecated): https://github.com/hamelsmu/evals-skills |
| S22 | Repository trees and metadata via the GitHub API: https://github.com/UKGovernmentBEIS/inspect_evals , https://github.com/openai/evals , https://github.com/anthropics/claude-plugins-official , https://github.com/mattpocock/skills , https://github.com/obra/superpowers , https://github.com/addyosmani/agent-skills , https://github.com/DietrichGebert/ponytail |
| S23 | Lists: https://github.com/VoltAgent/awesome-agent-skills , https://github.com/ComposioHQ/awesome-claude-skills , https://github.com/travisvn/awesome-claude-skills |
