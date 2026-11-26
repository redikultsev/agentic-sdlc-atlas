# Agent skills market: what stops a symptom patch

Question: which published agent-skill packs would make our Triage and Spec agents model the problem, compare designs at the right layer, and reject a narrow hardcoded rule or post-filter that only hides a symptom? Which skills fit which pipeline role?

Method: read the SKILL.md files themselves in each GitHub repository (via the GitHub API), plus the copies installed on the Operator's machine. Blog posts and directory sites were used only to find repositories. Every fact below cites a source from the table at the end as `[Sn]`; all sources were checked on **2026-11-26**. Stars and dates are GitHub API values on that day.

The failure we are trying to stop, as the test case for every skill: an LLM classifier gets the wrong intent because spreadsheet sheets are classified one at a time and then merged. The agent proposes a rule at merge time that drops the wrong intent. Better fixes sit earlier: what context the model sees per call, the prompt, or the merge design itself (for example, intent as a workbook-level decision rather than a vote of sheet-level ones).

Our current pack, for comparison [S30]: `unify-root-cause` (cause chain with evidence; for a model output, check the exact inputs of the failing call first; a downstream filter, guard or special case needs three notes: why not at the cause, which correct cases it touches, when it goes away), `unify-reproduce` (real entry point, k-of-N runs) and `unify-lessons` (where a lesson lives).

## Summary

- **The strongest single text against our failure is pstack's `principle-fix-root-causes`** [S12]. It asks whether the state that caused the symptom is legitimate; if it should never exist, a check where it surfaced hides the bug, and it names "discarded state" and guards as the usual ways to hide one. Our merge-time drop is exactly that.
- **No pack treats "the model saw the wrong input" as a cause class.** Our own `unify-root-cause` step 3 is ahead of the market here. Keep it; borrow the rest.
- **Alternatives at the right layer** come from three places: Pocock's `diagnosing-bugs` (3-5 ranked falsifiable hypotheses before testing any) [S3], pstack's `architect` (two shapes before code) [S15], and Pocock's `codebase-design` / `DESIGN-IT-TWICE.md` (parallel radically different designs) [S5]. Anthropic's `feature-dev` command does the same with minimal / clean / pragmatic architects [S26].
- **Domain modeling** (what "intent" is a property of) comes from Pocock's `domain-modeling` [S4] and pstack's `principle-model-the-domain` [S13].
- **Premise attack** for repeated failures: pstack's `principle-attack-the-premise` [S14] and superpowers' "3+ failed fixes means question the architecture" [S19].
- **Watch out:** superpowers' `defense-in-depth.md` recommends validation at every layer after a fix [S20]; ponytail's "shortest working diff" bias [S23] can make a merge-time filter look like the right answer. Both need adapting before Triage or Spec loads them.
- Most packs are plain Markdown we can inline. The harness-dependent parts are sub-agent fan-out (Pocock `code-review`, `DESIGN-IT-TWICE`, pstack `arena`/`interrogate`, superpowers SDD), tracker setup (Pocock `triage`, `to-spec`) and hooks (superpowers SessionStart, ponytail hooks).

## 1. mattpocock/skills

**What it is.** A personal skills repo, "Skills for Real Engineers", grouped into `engineering/`, `productivity/`, `misc/`, `in-progress/` [S1]. MIT license, last commit 6f7f783 on 2026-11-25, about 333k stars [S1]. Ships a `.claude-plugin/plugin.json` [S1].

**Local copies match upstream.** Every local skill under the Operator's user skills folder that exists upstream is byte-identical to upstream `main` (after line-ending normalisation): ask-matt, code-review, codebase-design, diagnosing-bugs, domain-modeling, grill-me, grill-with-docs, grilling, handoff, implement, implement-spec, improve-codebase-architecture, pr, prototype, research, retro, setup-matt-pocock-skills, tdd, teach, to-questionnaire, to-spec, to-tickets, triage, wait-what, wayfinder, wizard, writing-for-agents [S2]. Four local skills are not from this repo: archify, diagram-design, jira-task-rules and a `synced` folder [S2].

**Relevant skills.**

- **`diagnosing-bugs`** [S3]. Six phases. Phase 1 is the core: build a tight, deterministic, agent-runnable pass/fail loop that goes red on this exact symptom, and do not form theories before it exists. Phase 2 reproduces and then minimises the scenario until every remaining element is load-bearing. Phase 3 demands 3-5 ranked, falsifiable hypotheses, each with the prediction that would confirm or kill it, shown to the human before testing. Phase 4 instruments one variable at a time with tagged logs. Phase 5 writes the regression test at a "correct seam"; if no seam reaches the real bug pattern, that absence is itself the finding. Phase 6 cleans up and records which hypothesis was right. Plain Markdown plus one optional HITL script template.
- **`domain-modeling`** [S4]. Makes the agent challenge vague or overloaded terms against `GLOSSARY.md`, invent edge-case scenarios that force the boundaries between concepts, check the code against what the human claims, and write resolved terms to the glossary at once. ADRs are offered only when a decision is hard to reverse, surprising, and a real trade-off. Plain Markdown with two format files.
- **`codebase-design`** [S5]. A shared vocabulary (module, interface, depth, seam, adapter, leverage, locality) and tests such as the deletion test and "one adapter is a hypothetical seam, two is real". `DESIGN-IT-TWICE.md` frames the problem space (constraints, dependencies), then spawns 3+ sub-agents, each forced into a radically different interface by a different constraint (minimal, flexible, common-caller, ports and adapters), and compares them on depth, locality and seam placement before giving an opinionated pick. The vocabulary is plain Markdown; DESIGN-IT-TWICE needs sub-agents.
- **`grilling`** [S6]. Interviews the human as a design tree: each round asks every question whose prerequisites are settled, each with a recommended answer; facts are looked up by sub-agents, only decisions go to the human. Plain Markdown; sub-agent lookup is optional.
- **`triage`** [S7]. A state machine over tracker labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). It checks redundancy by domain concept, checks `.out-of-scope/` for prior rejections, reproduces before grilling, and writes an agent brief. Depends on `/setup-matt-pocock-skills` tracker config and is `disable-model-invocation` (user-invoked only).
- **`to-spec`** [S8]. Synthesises a spec from the conversation without interviewing: problem, solution, a long list of user stories, implementation and testing decisions, out of scope. It asks for the highest possible test seams, ideally one. Tracker-dependent.
- **`tdd`** [S9]. Red-green in vertical slices, tests only at seams agreed with the human, named anti-patterns (implementation-coupled, tautological, horizontal slicing). Refactoring belongs to review, not the loop. Plain Markdown.
- **`code-review`** [S10]. Two parallel sub-agents: Standards (repo standards plus a baseline of Fowler smells, including Repeated Switches and Speculative Generality) and Spec (does the diff do what the issue asked). Needs sub-agents.
- **`retro`** [S11]. Routes session problems to the environment: navigation pointers, automated checks (mechanical violations get a lint or CI check, not prose), coding standards for the reviewer, AGENTS.md trimming. Plain Markdown.
- **`prototype`**, **`improve-codebase-architecture`**, **`wayfinder`**, **`to-tickets`** [S1]: throwaway prototypes for design questions, an HTML report of deepening opportunities, a decision-ticket map for work larger than one session, and tracer-bullet tickets with blocking edges.

**How it loads for us.** `diagnosing-bugs`, `domain-modeling`, `codebase-design` (vocabulary), `grilling`, `tdd`, `retro` inline as plain Markdown. `triage`, `to-spec`, `to-tickets`, `wayfinder` assume a tracker config written by the setup skill. `code-review` and `DESIGN-IT-TWICE` assume a harness that spawns sub-agents.

## 2. pstack (cursor/plugins)

**What it is.** A Cursor plugin with a generated Claude Code copy, "if you want to go fast, go deep first" [S16]. MIT, in the `cursor/plugins` monorepo; the latest pstack commit is 9e278fe on 2026-11-24, plugin version 0.15.48 upstream [S16]. The local install is version 0.15.43 at commit e1cc031 (2026-11-16) [S17]. Upstream has one skill the local copy lacks: `reframe` (added 2026-11-23) [S18]. The core is `poteto-mode`, a router with 22 playbooks and an index of about 25 one-paragraph "principle" skills [S17].

**Relevant skills.** Each principle is 10-20 lines of plain Markdown.

- **`principle-fix-root-causes`** [S12]. Fix the first place the system did something wrong, not where it surfaced. The key test: is the state that triggered the symptom legitimate? If yes, handle it where it broke; if it should never exist, a check there hides the bug, so find what produced it. Lists guards, retries, swallowed errors, clamped values and discarded state as hiding patterns. Fix the pattern everywhere, and propose a cheap always-on signal if finding the fact took a deep dig.
- **`principle-model-the-domain`** [S13]. Encode the domain in a structure (state machine, typed model, registry, reducer) instead of scattered conditionals, so invalid states cannot be written. The tell that this was skipped: a feature grows an if/else chain by one more branch. Warns against abstraction that removes no branches.
- **`principle-attack-the-premise`** [S14]. When two or more fixes that share one premise fail the same gate, write the premise down as one sentence and test it before the next fix. If one part always lands on the losing side, change what puts it there instead of adding a mechanism that cleans up after it.
- **`principle-redesign-from-first-principles`** [S17]. When a requirement arrives, ask what you would build if it had been foundational from the start, then deliver that incrementally.
- **`architect`** [S15]. Before code, trace every system the change touches, sketch two different shapes, pick the one where each piece of state has one owner and callers know least; redesign instead of patching when workarounds repeat. For contested designs it routes to `arena` (N models in parallel, cross-judge, graft) [S17], which needs sub-agents and several vendors.
- **`principle-exhaust-the-design-space`** [S17]. The description says to build 2-3 competing prototypes for unprecedented decisions; the body is a single trailing sentence both locally and upstream, so the leaf is effectively empty. Rely on `architect` instead.
- **`principle-subtract-before-you-add`**, **`principle-foundational-thinking`** [S17]. Remove before building; no speculative guards beyond the spec; get the data shape right before logic.
- **`principle-encode-lessons-in-structure`** and **`correct`** [S17]. A repeated correction becomes a lint, type or check; prose rules come last, only for judgment calls. `correct` ranks fixes: architecture, then types/lints, then behaviour tests, then docs.
- **`reflect`** [S17]. Mines a transcript for durable lessons and routes each to an edit of an existing skill, with approval first.
- **`interrogate`** and **`blast-radius`** [S17]. Adversarial reviewers who must prove each finding with a run; blast-radius finds the one fact a change is safe because of and proves it with a script.
- **`why`**, **`sharpen`**, **`reframe`** [S17][S18]. `why` answers from commits and PR discussion, not the code. `reframe` lists the two or three problems a vague description could be, with the sign that tells them apart, then teaches expert terms and neighbouring fields.
- **Playbook `bug-fix`** [S17]. Reproduce on the real surface, binary-search hypotheses with runtime evidence, `architect` before a cross-function fix; "belt-and-suspenders that might help" is a hypothesis and does not ship.

**How it loads for us.** The principle leaves, `architect`, `why`, `reframe`, `correct`, `reflect` are plain Markdown and inline cleanly (strip the cross-references to other leaves or inline them too). `poteto-mode`, `arena`, `interrogate`, `swarm` depend on sub-agents, a per-role model file and Cursor features; the README says Claude Code skips Cursor-only steps [S16]. `disable-model-invocation: true` on most leaves means they only load when named, which suits our per-role loading.

## 3. ponytail (DietrichGebert/ponytail)

**Found, with confidence.** The repo "ponytail" is a "lazy senior dev mode" skill pack: "Makes your AI agent think like the laziest senior dev in the room" [S21]. MIT, created 2026-06-12, last commit ebd8654 on 2026-11-22, about 199k stars, plugin version 5.3.3 [S21][S22]. It ships manifests for Claude Code, Codex, Cursor, Kiro, OpenCode and others, plus many forks and ports (ponytail-lite as a single AGENTS.md, DeepSeek Harness ports) [S21][S24]. Its README claims, from its own benchmark, less code, time, cost and tokens than the same agent without it; we did not reproduce that [S21].

**Relevant skills.**

- **`ponytail`** [S23]. Always-on mode: before writing, list every place the change must reach; then take the first rung of a ladder that fully works (does it need to exist, reuse what the codebase has, stdlib, an installed dependency, one line, minimal code). For a bug fix: grep every caller and fix the root cause once in the shared code. Non-trivial new logic leaves one test. Known limits get a `shortcut: <limit>, <when to upgrade>` comment. Never cuts validation at trust boundaries, data-loss handling, security.
- **`ponytail-review`** / **`ponytail-audit`** [S23]. Review ordered correct, safe, holds under load, tested, fast, lean. Every finding needs a concrete input that breaks; "a fix applied in one caller while the shared function stays broken" is a named bug class.
- **`ponytail-debt`** [S23]. Greps `shortcut:` comments into a ledger and flags those with no upgrade trigger.

**Fit.** Ponytail fights over-engineering, not under-modelling. Its ladder rewards the smallest diff; a merge-time filter is a small diff, so on its own it would not stop our failure and could encourage it. The "fix once in shared code" rule and the `shortcut:` ledger are useful pieces. The plugin adds hooks and an optional per-turn webhook ledger [S22]; we would take the Markdown only.

## 4. obra/superpowers

**What it is.** "An agentic skills framework and software development methodology" [S19]. MIT, last commit 22f0b46 on 2026-11-03 (v7.0.2), repo pushed 2026-11-24, about 327k stars [S19]. Fourteen skills; a SessionStart hook injects `using-superpowers`, which forces skill invocation before any response [S25].

**Relevant skills.**

- **`systematic-debugging`** [S19]. An "iron law": no fix without root-cause investigation. Phase 1 reads errors, reproduces, checks recent changes, and in multi-component systems logs what enters and leaves each boundary to find the failing layer. Phase 2 compares with working examples. Phase 3 is one hypothesis at a time, tested minimally. Phase 4 writes a failing test, then one fix; after three failed fixes it stops and questions the architecture with the human. A table of rationalisations ("quick fix for now", "I see the problem") marks the moments to stop.
- **`root-cause-tracing.md`** [S20]. Trace a bad value backward up the call chain to the original trigger and fix there.
- **`defense-in-depth.md`** [S20]. After the root-cause fix, add validation at every layer the data passes. Fine for invalid paths; harmful for our case, where a "validation" at merge time is the symptom patch.
- **`brainstorming`** [S19]. Before building, read the context, echo the request, ask the one question that would change what gets built, lay out approaches for the human to pick, write and approve a design doc.
- **`writing-plans`** [S19]. Plans for an engineer who has not seen the code: file map, right-sized tasks with Consumes/Produces interfaces, and a "Review Focus" of failure modes the spec implies but no test exercises.
- **`receiving-code-review`**, **`verification-before-completion`** [S19]. Verify review feedback against the code before acting; no claim of done without fresh evidence.

**How it loads for us.** `systematic-debugging`, `root-cause-tracing`, `writing-plans`, `receiving-code-review` are plain Markdown. The always-on behaviour depends on the SessionStart hook; `subagent-driven-development` and `dispatching-parallel-agents` need sub-agents.

## 5. anthropics/skills and anthropics/claude-plugins-official

**anthropics/skills** [S27]. Last commit e4bb5d9 on 2026-11-16, about 200k stars, no repo-level license; each skill carries its own `LICENSE.txt` (skill-creator and docx are Apache-2.0) [S27]. The set is mostly documents, design and tooling (docx, pdf, pptx, xlsx, frontend-design, mcp-builder, skill-creator, webapp-testing). Relevant to us only indirectly: `doc-coauthoring` (context gathering, section refinement, then a reader test with a fresh context) [S28] and `skill-creator` (evals for skills). `discernment-nudge` appends follow-up questions for a human to check facts and reasoning [S28]. No debugging, root-cause or design-alternative skills.

**anthropics/claude-plugins-official** [S26]. Apache-2.0, pushed 2026-11-25. Relevant plugins:

- **`feature-dev`** command [S26]: discovery, 2-3 parallel code explorers, a mandatory clarifying-questions phase, then 2-3 parallel code-architect agents with different focuses (minimal change, clean architecture, pragmatic balance), a recommendation and a human choice before any code; then three parallel reviewers. Needs sub-agents and agent definitions. Last changed 2026-10-26.
- **`pr-review-toolkit`** [S26]: review agents including `silent-failure-hunter`, which treats unjustified fallbacks, broad catches and default values on failure as defects. A post-filter that silently drops a model output is in its target class.

## 6. Other packs worth knowing

- **addyosmani/agent-skills** [S29]. "Production-grade engineering skills", MIT, last commit e997ac5 on 2026-11-24, about 120k stars, 26 skills. Relevant: `debugging-and-error-recovery` (stop the line, reproduce, triage checklist, guard against recurrence); `spec-driven-development` (gated specify, plan, tasks, implement, with a capability map when one request bundles several capabilities); `interview-me` (hypothesis with a confidence number, one question at a time with a guess attached; refuses to run non-interactively); `doubt-driven-development` (each non-trivial decision, for example one that adds branching logic, goes to a fresh-context adversarial reviewer; designed for the orchestrator, not sub-agents); `constraint-driven-development` (a written quality bar); `documentation-and-adrs`. Plain Markdown, some with sub-agent steps.
- **NeoLabHQ/context-engineering-kit** [S31]. GPL-3.0, last commit 23e2428 on 2026-08-26, about 1.9k stars. Lean-style analysis commands: `why` (five whys, then validate backward from cause to symptom, propose fixes at the root), `cause-and-effect` (fishbone over six categories), `analyse-problem` (A3 one-pager), `propose-hypotheses` (competing hypotheses with an `.fpf/` evidence store and plugin agents). The first three are plain Markdown but generic; GPL-3.0 matters if we copy text into our pack.
- **Small single-purpose packs** found by search: `tt-a1i/5-whys-skill` (MIT, last pushed 2025-12-03) [S32]; `meiiie/structured-root-cause-research-skill` (MIT, pushed 2026-08-25, 1 star) [S32]. Too small or stale to adopt; the five-whys idea is already inside the stronger packs.
- **Aggregators**, for discovery only: ComposioHQ/awesome-claude-skills, travisvn/awesome-claude-skills, hesreallyhim/awesome-claude-code [S33].

## Against our failure

The proposal "drop the wrong intent at merge time" fails four tests. A skill helps if it forces at least one of them before the agent writes a fix.

1. **Legitimacy of the state.** Should a sheet-level wrong intent ever reach the merge? If not, a filter at the merge hides it.
2. **Layer of the cause.** Pipeline stages are input assembly (what the model sees per sheet), the prompt, the model call, aggregation (merge), output. The cause is at the earliest stage that went wrong.
3. **Unit of the domain decision.** Is "intent" a property of a sheet or of the workbook? If it is a workbook property, per-sheet classification plus a vote is the wrong model, and a filter adds one more branch to a wrong model.
4. **Alternatives compared.** At least one alternative per stage, each checked against all known cases, before choosing.

Ranked by how directly each skill would have stopped the proposal:

| Rank | Skill | Test it forces | Why it would stop the merge-time rule |
|---|---|---|---|
| 1 | pstack `principle-fix-root-causes` [S12] | 1, 2 | The legitimacy question is the exact decision point; "discarded state" names our filter as a hiding pattern. |
| 2 | Our `unify-root-cause` step 3-4 [S30] | 2 | Already says to read the failing call's exact inputs and puts a three-note burden on a downstream filter. It exists and agents still proposed the filter, so it needs the reinforcements below, not replacement. |
| 3 | Pocock `diagnosing-bugs` Phase 3 [S3] | 4 | 3-5 ranked falsifiable hypotheses make "the model lacked other sheets' context" and "the prompt misleads" compete with "the merge picks wrong"; each prediction is cheap to test (rerun one call with whole-workbook context). |
| 4 | pstack `principle-model-the-domain` [S13] + Pocock `domain-modeling` [S4] | 3 | "Which thing has an intent?" is a glossary question; a feature that grows one more branch is the named tell. |
| 5 | pstack `architect` [S15] / Pocock `DESIGN-IT-TWICE` [S5] / `feature-dev` architects [S26] | 4 | Two or more shapes are required before code; a minimal-change option next to a clean-architecture option makes the filter's cost visible. |
| 6 | pstack `principle-attack-the-premise` [S14] / superpowers "3+ fixes" [S19] | 3 | Catches the second and third filter for the same classifier: the shared premise (sheets are independent) gets written down and tested. |
| 7 | superpowers `root-cause-tracing` [S20] | 2 | Backward trace from the wrong output to the trigger; generic, but it says "fix at source". |
| 8 | `silent-failure-hunter` [S26], `ponytail-review` [S23] | review | Catch the filter after the fact: a fallback that drops output silently, or a fix in one caller while the shared cause stays. |

What no pack provides, and we should write ourselves: an explicit **stage table for LLM-in-the-loop defects** (input assembly, prompt, model, aggregation, post-processing), with one candidate fix per stage and the rule "pick the earliest stage that fixes every known case; a later stage only with the three notes". Every pack treats the model as a black box or ignores it; our failure is about what the model is given.

Two adapt-before-loading warnings:

- superpowers `defense-in-depth.md` [S20] tells the agent to add checks at every layer. For Triage and Spec it reads as permission for the filter. Do not load it in those roles.
- ponytail's ladder [S23] ranks the smallest diff first. Load it, if at all, for the Implementer after the design is fixed, and for the Reviewer's lean axis, never for Triage or Spec.

## Skills by role

Adopt: load as written (inline the Markdown, drop harness-only steps). Adapt: take the core, rewrite for our pipeline. Skip: not worth it for this role.

| Candidate | Triage | Spec | Planner | Implementer | Reviewer | Validator | Retro |
|---|---|---|---|---|---|---|---|
| pstack `principle-fix-root-causes` [S12] | **adopt**: the legitimacy test is our gap | **adopt**: Spec proposes fixes too | skip | adopt: same rule while fixing | **adopt**: judge a fix by it | skip | skip |
| Our `unify-root-cause` [S30] | adopt (keep) | adopt (keep) | skip | adopt | adopt | skip | skip |
| New: LLM stage table (ours, see above) | **adapt**: write it into `unify-root-cause` | **adapt** | skip | skip | adapt: a finding when a later stage was chosen without notes | skip | skip |
| Pocock `diagnosing-bugs` [S3] | **adapt**: Phases 1-3 and "no correct seam is a finding"; our `unify-reproduce` covers Phase 1-2 | skip | skip | adapt: Phases 4-6 for fix and cleanup | skip | skip | skip |
| Pocock `domain-modeling` [S4] | adapt: one question, "what does the decision belong to" | **adopt**: challenge terms, invent scenarios, update glossary | adapt: name modules with glossary terms | skip | skip | skip | skip |
| pstack `principle-model-the-domain` [S13] | adopt | adopt | adopt | adopt | adopt: "one more branch" as a finding | skip | skip |
| pstack `architect` [S15] | skip | **adapt**: two shapes per proposed fix, one at the cause | **adopt**: before slicing across repositories | skip | skip | skip | skip |
| Pocock `codebase-design` + `DESIGN-IT-TWICE` [S5] | skip | adapt: vocabulary only | **adapt**: parallel designs need our fan-out | adopt: vocabulary | adopt: vocabulary | skip | skip |
| pstack `principle-attack-the-premise` [S14] | **adopt**: second fix on same symptom | adopt | skip | adopt | skip | skip | adopt: a repeated fix class is a premise to test |
| superpowers `systematic-debugging` [S19] | adapt: boundary logging and the "3 fixes" stop; drop the iron-law tone and one-hypothesis rule (Pocock's 3-5 is better) | skip | skip | adapt | skip | skip | skip |
| superpowers `defense-in-depth.md` [S20] | **skip**: legitimises the filter | **skip** | skip | skip | skip | skip | skip |
| pstack `reframe` [S18] | adapt: "which two or three problems could this be" | **adopt**: list candidate problems before questions | skip | skip | skip | skip | skip |
| Pocock `grilling` [S6] | skip | **adopt**: design-tree rounds with recommended answers fit the Interviewer | adapt | skip | skip | skip | skip |
| addyosmani `interview-me` [S29] | skip | adapt: the confidence number; refuses non-interactive runs, our Spec is interactive | skip | skip | skip | skip | skip |
| Pocock `to-spec` [S8] | skip | adapt: template and "highest seam"; drop tracker setup | adapt: seams feed slicing | skip | skip | skip | skip |
| superpowers `brainstorming` [S19] | skip | adapt: "ask the one question that changes what gets built" | skip | skip | skip | skip | skip |
| superpowers `writing-plans` [S19] | skip | skip | **adapt**: Consumes/Produces per task and Review Focus | skip | skip | skip | skip |
| addyosmani `spec-driven-development` [S29] | skip | adapt: capability map when one request bundles several | adapt | skip | skip | skip | skip |
| Pocock `tdd` [S9] | skip | skip | skip | **adopt** | adopt: anti-patterns as findings | skip | skip |
| Pocock `code-review` [S10] | skip | skip | skip | skip | **adapt**: Standards and Spec axes; we run them as our own Reviewer, not sub-agents | skip | skip |
| `silent-failure-hunter` [S26] | skip | skip | skip | skip | adapt: one checklist item, "a silent drop of model output" | skip | skip |
| ponytail `ponytail` / `ponytail-review` [S23] | **skip**: smallest-diff bias | **skip** | skip | adapt: ladder after design is fixed, `shortcut:` comments | adapt: lean axis and "fixed in one caller" class | skip | skip |
| pstack `blast-radius` / `interrogate` [S17] | skip | skip | skip | skip | adapt: prove the one safety fact by a run | adapt: findings must come with a run | skip |
| addyosmani `doubt-driven-development` [S29] | skip | adapt: fresh-context doubt of the chosen fix layer | skip | skip | skip | skip | skip |
| Pocock `retro` [S11] | skip | skip | skip | skip | skip | skip | **adopt**: route lessons to checks before prose |
| pstack `correct` + `principle-encode-lessons-in-structure` [S17] | skip | skip | skip | skip | skip | skip | **adopt**: rank fixes architecture > types/lint > tests > docs |
| pstack `reflect` [S17] | skip | skip | skip | skip | skip | skip | adapt: transcript mining with approval |
| NeoLab `why` / `cause-and-effect` [S31] | skip: covered better above, GPL-3.0 | skip | skip | skip | skip | skip | adapt: five whys for a weekly incident, rewritten |
| anthropics `doc-coauthoring` reader test [S28] | skip | adapt: test the spec on a fresh context | skip | skip | skip | skip | skip |

Validator gets almost nothing from these packs: they target code agents, not black-box acceptance. Our criteria and scenario research stays the source there.

## Recommended next step

Extend `unify-root-cause` rather than adding many skills: add the legitimacy test (from [S12]), the LLM stage table with one candidate per stage, and 3-5 ranked falsifiable hypotheses (from [S3]). Add one Spec/Triage skill for the domain-unit question and two design shapes (from [S4], [S13], [S15]). Keep each short; the pstack principle format (10-20 lines) shows that is enough.

## Sources

All checked 2026-11-26.

| Id | Source |
|---|---|
| S1 | https://github.com/mattpocock/skills (repo, LICENSE, `.claude-plugin/plugin.json`, commit 6f7f783) |
| S2 | Local user skills folder compared file by file with https://github.com/mattpocock/skills/tree/main/skills (GitHub contents API, `diff --strip-trailing-cr`) |
| S3 | https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnosing-bugs/SKILL.md |
| S4 | https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md |
| S5 | https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md and `DESIGN-IT-TWICE.md` in the same folder |
| S6 | https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md |
| S7 | https://github.com/mattpocock/skills/blob/main/skills/engineering/triage/SKILL.md |
| S8 | https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md |
| S9 | https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md |
| S10 | https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md |
| S11 | https://github.com/mattpocock/skills/blob/main/skills/engineering/retro/SKILL.md |
| S12 | https://github.com/cursor/plugins/blob/main/pstack/skills/principle-fix-root-causes/SKILL.md |
| S13 | https://github.com/cursor/plugins/blob/main/pstack/skills/principle-model-the-domain/SKILL.md |
| S14 | https://github.com/cursor/plugins/blob/main/pstack/skills/principle-attack-the-premise/SKILL.md |
| S15 | https://github.com/cursor/plugins/blob/main/pstack/skills/architect/SKILL.md |
| S16 | https://github.com/cursor/plugins/tree/main/pstack (README, `plugin.json` 0.15.48, LICENSE MIT, latest pstack commit 9e278fe) |
| S17 | https://github.com/cursor/plugins/tree/main/pstack/skills (poteto-mode and playbooks, arena, interrogate, blast-radius, correct, reflect, why, sharpen, other principle leaves); local install 0.15.43 at commit e1cc031 read from the Claude Code plugin cache |
| S18 | https://github.com/cursor/plugins/blob/main/pstack/skills/reframe/SKILL.md (commits 2dd5c0c, 9e278fe) |
| S19 | https://github.com/obra/superpowers (repo, LICENSE MIT, commit 22f0b46) and https://github.com/obra/superpowers/tree/main/skills (systematic-debugging, brainstorming, writing-plans, receiving-code-review, verification-before-completion) |
| S20 | https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/root-cause-tracing.md and `defense-in-depth.md` in the same folder |
| S21 | https://github.com/DietrichGebert/ponytail (README, LICENSE MIT, commit ebd8654) |
| S22 | https://github.com/DietrichGebert/ponytail/blob/main/.claude-plugin/plugin.json |
| S23 | https://github.com/DietrichGebert/ponytail/tree/main/skills (ponytail, ponytail-review, ponytail-audit, ponytail-debt) |
| S24 | GitHub repository search "ponytail" (ilindaniel/ponytail-lite, DeepSeek Harness ports) via `gh search repos` |
| S25 | https://github.com/obra/superpowers/blob/main/hooks/hooks.json and https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md |
| S26 | https://github.com/anthropics/claude-plugins-official (LICENSE Apache-2.0); `plugins/feature-dev/commands/feature-dev.md`; `plugins/pr-review-toolkit/agents/silent-failure-hunter.md` |
| S27 | https://github.com/anthropics/skills (commit e4bb5d9; per-skill LICENSE.txt) |
| S28 | https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md and `skills/discernment-nudge/SKILL.md` |
| S29 | https://github.com/addyosmani/agent-skills (LICENSE MIT, commit e997ac5; skills debugging-and-error-recovery, spec-driven-development, interview-me, doubt-driven-development, constraint-driven-development, documentation-and-adrs) |
| S30 | This repository: `implementations/archon/skills/unify-root-cause/SKILL.md`, `unify-reproduce/SKILL.md`, `unify-lessons/SKILL.md` |
| S31 | https://github.com/NeoLabHQ/context-engineering-kit (LICENSE GPL-3.0, commit 23e2428; `antigravity/skills/why`, `cause-and-effect`, `analyse-problem`, `propose-hypotheses`) |
| S32 | https://github.com/tt-a1i/5-whys-skill and https://github.com/meiiie/structured-root-cause-research-skill (repo metadata only) |
| S33 | https://github.com/ComposioHQ/awesome-claude-skills, https://github.com/travisvn/awesome-claude-skills, https://github.com/hesreallyhim/awesome-claude-code |
