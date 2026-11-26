# Agent roles, instructions and skills: a full proposal

Status: **agreed and implemented 2026-11-26** (decisions 69, 70, 71). The live table of roles and skills is `implementations/kandev/roles.ts`; this file keeps the reasoning. Where the two differ, the code is right. Sources for every external skill: `2026-11-agent-skills-market.md` (same folder), all checked 2026-11-26.

Why now. A Spec agent proposed a keyword rule at merge time for an LLM misclassification (sheets classified one by one, results merged), named the fix at the cause and set it aside as "another task will do it", and asked the Operator to pick the fix mechanism. Causes: Spec decided the "how", which is Plan's job; and `unify-root-cause` was in the session's context (Spec resumed the Triage session) but its point 4 let the patch through: the agent wrote the three notes ("not now: another task rebuilds this", "goes away with that task") and point 5 made it defer to an earlier team note. The Spec prompt itself loads no pack skill.

## 1. How skills load

Two tiers per role, so prompts stay short and the right skill is at hand in each situation:

| Tier | What it is | How it loads |
|---|---|---|
| **Core** | Two to four skills the role uses on every task | Inlined in the step prompt (as today, decision 67) |
| **On call** | Skills for particular situations, each with its trigger ("when the bug involves a model output, use `unify-llm-defects`") | Named in the prompt with the trigger; the agent loads the file when the trigger fires. The files are vendored in the repository and installed where the agent CLI finds them |

External skills are **vendored, not linked**: copied into `implementations/skills/vendor/<pack>/<skill>/` with the upstream URL, commit and license, then adapted in our own `unify-*` file where the market study says "adapt". All candidates are MIT except NeoLab (GPL-3.0, not copied).

## 2. Spec and Plan: what each owns

| | **Spec** | **Plan** |
|---|---|---|
| Question it answers | What must be true for the user when this is done, and what is out | How we make it true, where in the system, in which order |
| Speaks in | Behaviour a user or caller can observe: inputs, outputs, examples | Modules, files, seams, data flow, tests, branches |
| Asks the Operator | Business questions: scope, priority, which cases matter, what users must see | One design decision when there is a real trade-off: the shapes, their cost, the recommendation |
| Output | Acceptance criteria with ids and examples, "not in scope", assumptions | Design (two or more shapes, one at the cause; the chosen one and why), slices per repository, checks, risks |
| Must not | Name a file, function, mechanism or fix layer; ask "prompt or code" | Change the criteria; a change of scope goes back to Spec |
| Gate | "Is this the right outcome?" | "Is this the right way?" |

**Boundary test for an agent:** if the answer to a question would change *what the user sees*, it is Spec's; if it would only change *where or how the code does it*, it is Plan's. A technical question met in Spec becomes an assumption handed to Plan.

**Are both stages needed?** Yes as roles, not always as steps:

- Route into Spec by **open business questions**, not by size. A bug whose expected behaviour Triage already pinned down (expected vs actual, plus the neighbouring cases that must not change) skips Spec: Triage writes those as the criteria.
- Plan is mandatory for M and L and for any S whose fix layer is not obvious (every defect involving a model output). For a plain S, Implement plans inline.
- They stay separate because the reader differs: Spec is checked by the person who owns the outcome, Plan by the person who owns the system. Merging them is what let the "how" slip into a business gate.

## 3. Skill catalog

### Ours (pack `unify-*`)

Rule (Operator, 2026-11-26): an own skill only where no published one does the job, and each one agreed. Reviewed one by one:

| Candidate | Verdict | Why |
|---|---|---|
| `unify-root-cause` | keep, **tighten** (no new text from the market) | Its point 3 (the model's input is a cause) exists nowhere in the market. Its point 4 is the loophole that passed the patch: replace the "three notes" escape with pstack `fix-root-causes`'s legitimacy test loaded beside it, and let point 5 treat a team note as a hypothesis to check. The 3-5 hypotheses come from loading Pocock `diagnosing-bugs`, not from copying them in |
| `unify-reproduce` | keep | k of N runs against a live model and "a local way before not checked" are not in the market; `diagnosing-bugs` Phase 1-2 builds a loop but assumes a deterministic one |
| `unify-lessons` | keep for now | Overlaps Pocock `retro` and pstack `correct`; decide after one Retro run with them loaded |
| `unify-llm-defects` | **drop** | A one-paragraph stage list belongs in `unify-root-cause` point 3 if anywhere; a separate skill adds nothing |
| `unify-design-options` | **drop** | pstack `architect` (two shapes, one owner per state) + Pocock `domain-modeling` + pstack `fix-root-causes` cover it |
| `unify-acceptance` | **drop** | The Spec prompt already asks for ids and examples; "neighbouring cases that must keep working" is one prompt line |
| `unify-test-quality` | **drop** | Pocock `tdd` has the anti-patterns and red before green; "keep the failing output" and "never weaken a test" are already Implementer prompt lines |
| `unify-handoff` | **drop** | Kandev passes a move message between steps; one prompt line says what it carries |
| `unify-evals` | **agreed: one page of our own** | Market searched (`2026-11-llm-eval-skills.md`): no skill does the job as is. Closest: Anthropic `claude-api` eval guides (fixed signed-off set, k of N, noise floor, cost), Phoenix comparison rules (improved vs worse per example, "not enough evidence"), `ai-evals-course/evals-skills` (error analysis, judge calibration). None gives an unattended before/after gate: a set frozen before the change with the neighbours that must not change, per-case flips both ways, and a reject rule. Ours would say only that and point to the vendored texts |

### External, by pack

| Pack | Skills we take | Load as |
|---|---|---|
| Pocock (MIT) | `diagnosing-bugs`, `domain-modeling`, `grilling`, `codebase-design` + `DESIGN-IT-TWICE`, `prototype`, `to-spec` (template), `to-tickets` (slices with blocking edges), `tdd`, `code-review` (two axes), `improve-codebase-architecture`, `retro`, `handoff` | adapt or adopt per role |
| pstack (MIT) | principles `fix-root-causes`, `model-the-domain`, `attack-the-premise`, `redesign-from-first-principles`, `subtract-before-you-add`, `foundational-thinking`, `encode-lessons-in-structure`; `architect`, `reframe`, `why`, `blast-radius`, `interrogate`, `correct`, `reflect`, playbook `bug-fix` | principles adopt as written; the rest adapt |
| ponytail (MIT) | `ponytail` ladder, `ponytail-review`, `ponytail-audit`, `ponytail-debt` (`shortcut:` ledger) | Implementer after the design is fixed; Reviewer; Scout and Findings. **Never Triage, Spec or the design half of Plan** (it ranks the smallest diff first) |
| superpowers (MIT) | `systematic-debugging` (boundary logging, the "three fixes" stop), `root-cause-tracing`, `writing-plans` (Consumes/Produces, Review Focus), `verification-before-completion`, `receiving-code-review`, `brainstorming` (the one question that changes what gets built) | adapt. **`defense-in-depth` is not loaded anywhere** |
| Anthropic official (Apache-2.0) | `feature-dev` architects (minimal, clean, pragmatic), `silent-failure-hunter`, `webapp-testing`, `doc-coauthoring` reader test, `skill-creator` evals | adapt |
| addyosmani (MIT) | `spec-driven-development` (capability map), `doubt-driven-development`, `documentation-and-adrs`, `debugging-and-error-recovery` | adapt |

## 4. Every role

Note: written before the review in section 3, kept for the reasoning. The implemented lists are in `implementations/kandev/roles.ts`: dropped own skills are replaced by the market skills of section 3, `unify-evals` was agreed as the one new own skill, and a weekly skill review was added to stage 9.

Each row: the role's mission and hard rules (the instruction), its core skills (inlined), its on-call skills with triggers. "Card" is the shared gate instruction (decisions 38, 68); "Knowledge base" is the shared read-first block; both go to every role with a gate or a decision.

### Triage
- **Instruction.** Change nothing. Classify, check duplicates and earlier rejections, reproduce a bug through the real entry point, find or refute the cause, propose kind, size, risk and route. Route to Spec only with open business questions; otherwise write expected vs actual and the must-not-change cases as the criteria. Propose the fix layer as a hypothesis for Plan, never as a decision.
- **Core.** `unify-root-cause` (extended), `unify-reproduce`, pstack `fix-root-causes`.
- **On call.** `unify-llm-defects` (the defect is in a model output); Pocock `diagnosing-bugs` Phases 1-3 (no loop yet, or several plausible causes); pstack `attack-the-premise` (a second fix for the same symptom); pstack `reframe` (the request could be two or three different problems); pstack `why` (the code looks deliberate: read the commit and PR history first); superpowers `systematic-debugging` boundary logging (several components, unclear failing layer); Pocock `domain-modeling` one question (what owns the decision).

### Group (merges related intake items)
- **Instruction.** Group by the domain concept and cause, not by wording; a group needs a shared cause or a shared change.
- **Core.** Pocock `domain-modeling` (concepts only), `unify-root-cause` (shared cause test).
- **On call.** pstack `attack-the-premise` (a cluster of fixes that keep failing).

### Spec (Interviewer)
- **Instruction.** Owns *what*, never *how* (section 2). Ask at most three business questions, each with options and a recommendation; resolve technical ones as assumptions for Plan. Write criteria a black-box check can decide, with examples and the neighbouring cases that must keep working.
- **Core.** `unify-acceptance`, Pocock `grilling` (questions as a design tree, each with a recommended answer), Pocock `domain-modeling` (challenge terms, invent edge scenarios), pstack `reframe` (candidate problems before questions).
- **On call.** Pocock `to-spec` template (a large feature); addyosmani `spec-driven-development` capability map (one request bundles several capabilities); superpowers `brainstorming` (the one question that changes what gets built, when the request is vague); Anthropic `doc-coauthoring` reader test (before the gate, read the spec in a fresh context); `unify-root-cause` (a bug reached Spec: keep the cause straight while writing criteria, without choosing the fix).

### Researcher (L items, before Plan)
- **Instruction.** Map the modules the spec touches and the invariants the change must keep, each with file:line; read the knowledge base and say where it and the code disagree.
- **Core.** Pocock `codebase-design` vocabulary, pstack `why`.
- **On call.** Pocock `improve-codebase-architecture` (the area is tangled enough to change the plan); pstack `foundational-thinking` (data shape unclear).

### Plan (Planner)
- **Instruction.** Owns *how*. First the design: which thing owns the decision, two or more shapes with one at the cause, cost and what each breaks; ask the Operator only when the trade-off is real. Then slices per repository with checks, criteria ids, risks and blocking edges. A scope change goes back to Spec.
- **Core.** `unify-design-options`, pstack `architect`, pstack `model-the-domain`, superpowers `writing-plans` (Consumes/Produces per slice, Review Focus).
- **On call.** `unify-llm-defects` (a model-output defect: pick the stage); `unify-evals` (the plan changes a prompt, model or model input: plan the case set first); Pocock `DESIGN-IT-TWICE` or Anthropic `feature-dev` architects (an interface or cross-repository change: parallel designs); Pocock `prototype` (a design question only running code answers); Pocock `to-tickets` (the work exceeds one session); pstack `redesign-from-first-principles` (the requirement would have been foundational); pstack `subtract-before-you-add` (the plan only adds); addyosmani `documentation-and-adrs` (the decision is hard to reverse, surprising and a real trade-off); pstack `blast-radius` (name the one fact the change is safe because of).

### Implement (Implementer)
- **Instruction.** Follow the plan's design; a better design found while coding goes back as a finding, not a silent change. Tests first, each failing for the right reason; the project's check green; draft PR; never merge, never touch protected branches.
- **Core.** Pocock `tdd`, `unify-test-quality`, superpowers `verification-before-completion` (no "done" without fresh evidence), ponytail ladder (within the chosen design: reuse, stdlib, smallest correct code; `shortcut:` comments for known limits).
- **On call.** `unify-evals` (the change touches a prompt, model or model input); superpowers `receiving-code-review` (a fix round: verify each finding against the code before acting); pstack `fix-root-causes` (a test fails for a reason the plan did not foresee); Pocock `diagnosing-bugs` Phases 4-6 (instrumenting and cleaning up); superpowers "three failed fixes" stop (go to Blocked with the premise written down).

### Checks & review (Reviewer)
- **Instruction.** Fresh session, did not write the change. CI first. Review against the spec and the plan's design; every finding with file:line, a concrete breaking input and re-checked evidence.
- **Core.** Pocock `code-review` two axes (standards, spec), `unify-test-quality`, ponytail `ponytail-review` (correct, safe, under load, tested, fast, lean; "fixed in one caller" class), `unify-root-cause` (judge a fix by the layer it sits in).
- **On call.** Anthropic `silent-failure-hunter` (the diff drops, defaults or swallows anything, model output above all); `unify-llm-defects` (the fix sits later than the input stage without the three notes: a finding); pstack `interrogate` (a finding that must be proven by a run); pstack `blast-radius` (risk R2); addyosmani `doubt-driven-development` (the change adds branching logic).

### Acceptance (Validator)
- **Instruction.** Black box. Start the application as documented, check each criterion with the steps and what was seen; never read the reviewer's verdict.
- **Core.** `unify-acceptance` (decide each criterion), `unify-reproduce` (k of N), superpowers `verification-before-completion`.
- **On call.** `unify-evals` (criteria about model behaviour); Anthropic `webapp-testing` (a web UI to drive).

### Merge? (merge preparation)
- **Instruction.** Never merges. One table of PRs, CI, size, risk, verdicts, new tests and their failing outputs, and what was not verified.
- **Core.** `unify-test-quality` (are the failing-first outputs real), pstack `blast-radius` (R2: the one safety fact, proven).

### Retro (weekly)
- **Instruction.** Lessons from the week's runs, each with where it lives and its cost; proposals only, the Operator agrees each.
- **Core.** `unify-lessons`, Pocock `retro`, pstack `correct` + `encode-lessons-in-structure` (a check before prose).
- **On call.** pstack `reflect` (mine transcripts, approval first); pstack `attack-the-premise` (a repeated fix class); Anthropic `skill-creator` evals (a skill change needs a before and after); `unify-root-cause` (an incident).

### Findings pass (daily) and Scout
- **Instruction.** Read-only; file what is found at Triage with evidence; nothing fixed.
- **Core.** ponytail `ponytail-audit`, ponytail `ponytail-debt` (`shortcut:` ledger without an upgrade trigger), `unify-reproduce`.
- **On call.** Pocock `improve-codebase-architecture` (Scout on a named area); Anthropic `silent-failure-hunter` (error handling sweep).

### Dispatcher (general chat)
- **Instruction.** Files tasks from the Operator's words into Triage with the knowledge base attached; asks before creating or starting; never moves or stops tasks.
- **Core.** pstack `reframe` (which problem the Operator means), `unify-handoff` (what goes into a task).

## 5. What this asks of the Operator

1. Agree the Spec and Plan split in section 2, including "route into Spec by open business questions".
2. Agree the two tiers and vendoring in section 1.
3. Agree the new `unify-*` skills and the `unify-root-cause` extension (their text comes for agreement before it lands).
4. Agree the role table in section 4, or strike lines.
