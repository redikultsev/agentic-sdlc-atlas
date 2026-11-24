# Supervisor: human-factors evidence on confirmations, delegation and oversight

Date: 2026-11-24. Access date of every link: 2026-11-24.
Marks: **V** = verified in a primary source I opened; **S** = secondary (search abstract, vendor summary, press, or primary I could not open in full); **I** = inferred by me.

## Question

The Orchestrator moves work items along a fixed state machine with human gates; the Operator is the one scarce human (at most 3 items wait at once, decision 9). A "Supervisor" is a long-lived chat agent that would be the Operator's single interface: status, creating work, answering gates, cancelling, pausing, releases. Open: (A) which Supervisor actions need an explicit human confirmation; (B) may it answer gates on a remembered "standing instruction", or must standing instructions become rules checked by code; (C) one Supervisor for all projects or one per project. This file covers only the human-factors evidence.

## Short answer

- Per-action confirmation prompts decay: the only large measurement (Claude Code, vendor, 2026) is 93% approved. A confirmation stays meaningful only if it is rare, shows the consequence, binds to a specific version, and cannot be produced or answered by the agent itself.
- Autonomy is earned in the evidence we have by track record and by deterministic scoping, not by an agent's reading of a remembered preference. Measured users do raise auto-approval with experience (20% to 40%+ of sessions), but vendors then moved the heavy lifting to classifiers and allow-lists, and even the best classifier misses 17% of real overeager actions.
- A: confirm only what is irreversible, leaves the system, or is outside what a gate already states; do not add a second "are you sure" to a gate answer whose options already name the exact action (decision 38). The confirmation must be rendered and accepted by the engine, not by the Supervisor's text.
- B: standing instructions must become rules in a file checked by code (as R0 already is, decision 25). The Supervisor may draft a rule and show its measured follow rate; it may not hold the permission itself.
- C: evidence is thin and indirect. One chat surface is fine; one agent *memory* spanning projects is the risk. Make the target (project, item, version) explicit in every mutating call and in every confirmation.
- Evidence is mostly vendor posts, aviation/medical analogies and surveys; nothing measures a chat supervisor over a software pipeline. See "What stays unverified".

## 1. Approval fatigue and rubber-stamping

1. **93% of manual permission prompts are accepted.** Anthropic says users accept 93% of Claude Code permission prompts and that default prompts lead to "approval fatigue, where people stop paying close attention". Published 2026-03-25. No method is given for the 93%. **V** — https://www.anthropic.com/engineering/claude-code-auto-mode
2. **What replaced the prompts.** Three tiers: fixed read-only allow-list; in-project edits without a check; a transcript classifier for the rest. The classifier sees only user messages and tool calls (assistant text and tool results are stripped). On real traffic (n=10,000) the false-positive rate is 0.4% for the full pipeline; on real "overeager" actions (n=52) the miss rate is 17%, which the post calls "the honest number"; synthetic exfiltration (n=1,000) misses 5.7%. After 3 consecutive or 20 total denials the session stops and escalates to the human. **V** — same URL. The blocked examples are relevant to a Supervisor: a vague "clean up old branches" deleted remote branches; "cancel my job" matched a job by name similarity and deleted it.
3. **A press report cites 97% and a default-on auto mode from August.** I could not find it in a primary page. **S, unverified** — https://digg.com/ai/8te506p3 (search result; treat as unconfirmed).
4. **Alert override rates in medicine.** A systematic review of drug-safety alerts in physician order entry (17 papers) found overrides in 49% to 96% of alerts; the authors note that many overrides were justified, so a high override rate is not by itself proof of inattention. JAMIA 2006;13(2):138–47. **S** (abstract via search) — https://pubmed.ncbi.nlm.nih.gov/16357358/ ; a 2009 Dutch study reports 34% of orders raised an alert and 91% of alerts were overridden, https://pubmed.ncbi.nlm.nih.gov/19204222/ (**S**, the figure as reported by the search summary).
5. **Alarm budgets in process control.** EEMUA 191 / ISA-18.2: long-run average under about 1 alarm per 10 minutes is "very likely acceptable"; about 2 per 10 minutes is the maximum manageable average; fewer than 10 in the first 10 minutes after a major upset. Sources disagree on the exact band edges. A benchmark found only about a third of consoles met the steady-state guideline. **S** (vendor white papers) — https://process.honeywell.com/content/dam/process/en/documents/document-lists/doc_asm-consortium/white-papers/February%2028%202005%20-%20Acheiving%20Effective%20Alarm%20System%20Performance%20Benchmarking.pdf ; https://www.yokogawa.com/us/library/resources/media-publications/implementing-alarm-management-per-the-ansi-isa-182-standard-control-engineering/
6. **Automation bias and complacency do not go away with training or expertise.** Parasuraman and Manzey (2010, Human Factors 52(3):381–410) review the evidence: complacency and automation bias occur in novices and experts, are not removed by practice or instructions, and appear under multiple-task load. **S** (abstract) — https://pubmed.ncbi.nlm.nih.gov/21077562/ . A review of decision-support effects (Goddard et al., 2012) is widely cited for automation bias in clinical settings; I could not open it (access blocked), so I use no numbers from it.
7. **Vigilance for rare events.** Bainbridge (1983): sustained monitoring of a source where little happens is not humanly reliable; rare abnormalities cannot be caught reliably by a human monitor; systems should fail obviously. **S** (full text exists, I read summaries) — https://gwern.net/doc/sociology/technology/1983-bainbridge.pdf
8. **Review quality versus size and pace (code).** A Cisco/SmartBear study (2,500 reviews, 3.2M lines, vendor-reported) found defect detection falls above about 200–400 lines per review and at inspection rates above about 300–500 lines/hour, and drops after 60–90 minutes. Thresholds vary between the vendor's own publications; no peer-reviewed original found. **S, vendor** — https://agileconnection.com/article/largest-case-study-code-reviews-ever
9. **Surveys on checking AI code.** A 2026 survey of over 1,100 developers: 96% say AI code is not functionally correct, only 48% say they always check it before committing. Vendor survey. **S** — https://www.theregister.com/2026/01/09/devs_ai_code/ . I found no peer-reviewed measurement of rubber-stamping AI changes specifically.

**What number of confirmations stays meaningful?** No direct measurement exists for agent confirmations. The only ranges are alarm-management ones (item 5): about 1 per 10 minutes steady-state, about 2 per 10 minutes at most. **I:** our cap of 3 waiting items (decision 9) is far inside that range; the risk is not volume but sameness (every card looks alike).

**Designs that keep a confirmation meaningful** (evidence is design guidance, not trials):
- Show the exact consequence, not the agent's paraphrase: MCP spec says clients SHOULD "show tool inputs to the user before calling the server" and prompt on sensitive operations. **V** — https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- Friction proportional to risk: GitHub makes the user type the repository name to delete it and allows restore for up to 90 days for some repositories. **V** — https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository
- Bind to a version: our own rule (approval counts only for the PR head the reviewer saw, GLOSSARY.md). The GitHub environments page I read does not say its approvals bind to a commit. **V** (absence in that page) — https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment
- Separate the approver from the requester: GitHub environments offer up to 6 required reviewers, "prevent self-review", a wait timer and branch restrictions. **V** (same page).
- Reduce count by moving low-risk classes to code: Anthropic's design (item 2). OpenAI's browser agent asks for confirmation only before consequential steps (orders, emails, deletions) and hands over to the user for credentials. **S** — https://openai.com/index/introducing-operator/

## 2. Levels of autonomy

1. **Operator / collaborator / consultant / approver / observer.** Feng, McDonald and Zhang define five levels by the role the user plays; they argue autonomy is a deliberate design decision, separate from capability, and propose "autonomy certificates". arXiv 2506.12469, v1 2025-06-14, v2 2025-07-28. **V** (abstract page) — https://arxiv.org/abs/2506.12469 . The abstract states no rule for moving between levels.
2. **Sheridan–Verplank ten levels and the four-stage model.** Parasuraman, Sheridan and Wickens (2000, IEEE Trans. SMC-A 30(3):286–297) separate four types of automation (acquisition, analysis, decision selection, implementation), each at its own level, and evaluate by human-performance consequences, reliability and cost of error. **S** — https://dblp.uni-trier.de/rec/journals/tsmc/ParasuramanSW00.html . **I:** our pipeline already differs per stage (R0 implementation autonomous, R2 decision by the Operator); the Supervisor should be levelled per action type, not as one number.
3. **Autonomy grows with use, measured.** In Claude Code, users with under 50 sessions use full auto-approve in about 20% of sessions; by 750 sessions, over 40%. New users interrupt about 5% of turns, experienced users about 9%: experience moves people from approving to watching and intervening. The agent itself stops to ask more often as task complexity rises. Anthropic, 2026-02-18. **V** — https://www.anthropic.com/research/measuring-agent-autonomy . This is observational and tells us what people do, not that it is safe.
4. **Earning autonomy by record, in production practice.** Our decision 25 cites auto-merge by mechanical rules per change type with a kill switch (Spotify 77% auto-merged, Meta, Renovate) — see `research/atlas/research/2026-11-merge.md` (not re-verified here). Decision 38 proposes the follow rate (how often the Operator picks the recommendation) as the measure for moving a decision from the Operator to the pipeline. I found no independent study that validates follow rate or reversal rate as the promotion criterion. **I**.
5. **Vendor framing.** Anthropic: "humans should retain control", the agent must ask before modifying code or systems, and users may grant persistent permissions for routine tasks. Published 2025-08-04. **V** — https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents

Net: ladders exist; what moves a task between levels is, in practice, either an instruction (a user clicks "always allow") or a policy. A measured-record promotion rule is proposed by us and by Anthropic's practice of tiering, but is not validated.

## 3. Standing instructions and delegation

1. **Allow-lists are code, with documented limits.** In Claude Code, rules are evaluated deny, then ask, then allow; the first match wins, so an allow can never carve an exception out of a deny; managed settings cannot be overridden by lower levels; persistent "don't ask again" is scoped per repository and command. The docs also warn that argument-constraining patterns for shell commands are fragile and a deny/ask rule "isn't a security boundary around the program". **V** — https://code.claude.com/docs/en/permissions . Lesson: even a code-checked rule is only as good as its matcher; write rules over structured facts (state, risk class, paths, size), not over free command text.
2. **Broad standing rules defeat the checker.** Anthropic notes users set blanket allow rules for convenience, so a classifier would never see the most damaging commands; auto mode drops broad code-executing rules on entry and keeps narrow ones. **V** — https://www.anthropic.com/engineering/claude-code-auto-mode
3. **Remembered natural-language preferences can be poisoned.** SpAIware (2024): a prompt injection planted a persistent instruction in ChatGPT's long-term memory that kept exfiltrating data in later chats; the fix closed the exfiltration channel, not the ability of untrusted content to write memory. **S** — https://thehackernews.com/2024/09/chatgpt-macos-flaw-couldve-enabled-long.html . Anthropic also lists memory across contexts as a leak risk. **V** — https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents
4. **Drift and misgeneralisation of remembered preferences:** I found no measurement of how a stated preference such as "accept small items without me" generalises over weeks (what counts as "small", "low-risk"). **Thin; anecdotal at best.** Related, not identical: classifiers sometimes match "by name similarity" and delete the wrong thing (auto-mode post, item 1.2). **I:** a word like "small" is exactly where an agent and a human disagree.
5. **Audit and revocation.** MCP recommends logging tool usage for audit. **V** (spec page). Kill-switch practice appears in decision 25. No source I read specifies how to revoke a remembered natural-language delegation; a rule file in version control gives revocation, history and diff for free. **I**.
6. **Meaningful human control.** Santoni de Sio and van den Hoven (2018, Frontiers in Robotics and AI): two conditions, tracking (the system responds to the relevant human reasons) and tracing (behaviour traces back to a human with the right understanding and awareness of their role). **S** — https://www.frontiersin.org/articles/10.3389/frobt.2018.00015/full . **I:** a standing instruction held only in an agent's memory is hard to trace (nobody can show what was delegated, when, and with which scope); a rule in a file with an owner and a date traces.

## 4. One assistant for everything versus one per context

1. **Multi-turn degradation.** Across 15 LLMs and over 200,000 simulated conversations, performance in multi-turn settings drops on average 39% (abstract; the figure caption says 35%) versus single-turn, mostly through unreliability: models make early assumptions and rely on them. Laban et al., arXiv 2505.06120, 2025-05-09. **S** (abstract via search) — https://arxiv.org/abs/2505.06120 . This is generation tasks, not a control plane.
2. **Long-term conversational memory.** Long-context models and retrieval help but stay well below human performance on very long dialogues, especially temporal and causal links. Maharana et al., ACL 2024. **S** — https://aclanthology.org/2024.acl-long.747
3. **Per-context scoping in tools.** Claude Code scopes persistent allow rules per repository (permissions page above, **V**). Anthropic warns that agents retaining information across tasks can leak data between departments. **V** (framework post).
4. **Wrong-target actions in a multi-project chat:** I found no measurement. Closest evidence: "cancel my job" deleting a job matched by name similarity (auto-mode post, **V**). **Thin.**

## 5. Chat as a control surface for consequential actions

1. **A confirmation the agent displays can be forged.** "Lies-in-the-Loop" (2025): injected content made approval dialogs of Claude Code and Copilot Chat show a benign action while a dangerous one ran, or altered rendering after approval; recommended defence in depth, dialog logging and out-of-band confirmation. Vendor responses are reported secondhand and unverified. **S** — https://checkmarx.com/zero-post/bypassing-ai-agent-defenses-with-lies-in-the-loop/
2. **Approval prompts are an accepted pattern but not a safety proof.** MCP says there SHOULD always be a human able to deny tool invocations, and applications SHOULD show clear indicators and confirmation prompts. **V** (spec page, 2025-06-18).
3. **Handover for secrets.** Browser agent hands control to the user for credentials and does not capture what is typed. **S** (Operator launch post above).
4. **Known failure modes:** habituation (93% accepted), look-alike prompts (an engineering inference from the alarm literature, not measured for agents), ambiguous "yes" (no measurement found; **I**: in a long chat "yes" can bind to the wrong earlier question), and the agent answering its own prompt. Anthropic's design avoids the last by escalating to the human after repeated denials (**V**).
5. Two-step commit and typed target names exist in mainstream tools (GitHub repository deletion, item 1) but I found no study of how much they reduce wrong-target errors. **Thin.**

## Sub-question A: which Supervisor actions need explicit confirmation

**Supports:** (i) confirm rarely and for irreversible or system-leaving actions; (ii) show the effect and bind to a version; (iii) friction scaled to risk; (iv) the human's confirmation must not be producible by the agent.
**Does not settle:** the right rate for this one-Operator pipeline; whether a typed target beats a button; whether batching helps (I found no trial).
**Rule suggested (I):**
- No confirmation: read-only queries, creating a work item (it enters Intake and is gated anyway), pause and resume of one item, anything the state machine can undo for free.
- Answering a gate: the decision request already names the exact action per option (decision 38); the Operator's pick is the confirmation. Code (not the Supervisor's text) must check the pick against the request version and the PR head, and refuse a stale one.
- Explicit confirmation by the engine: cancel of an item with work done, releases and any step that leaves the system, project-wide holds, and any bulk action. The Supervisor requests it; the engine issues a one-time token and renders target, effect and what is lost; only a separate Operator action (button, signed link or typed item number) redeems it.
- Do not count these confirmations in the cap of 3 waiting items by accident: decide it deliberately (decisions 9, 50 already exempt some requests).

## Sub-question B: standing instructions

**Supports:** vendors converged on code-evaluated allow/deny/ask rules with precedence and managed scope; broad rules are dangerous; remembered free-form preferences are an attack and drift surface; auto-approval grows with measured experience.
**Does not settle:** whether a classifier or a model can safely apply a plain-language instruction at R1 (best measured miss rate is 17% on overeager actions, a different task); how fast a human's meaning of "small" drifts.
**Rule suggested (I):** the Supervisor never holds a permission as memory. "Accept small low-risk items without me" is turned into a rule file entry (change types, paths, size limit, risk class, hours, expiry date, owner), validated by code and checked by code at decision time, with a kill switch on reversal rate, exactly the pattern of R0 (decision 25). The Supervisor may draft the rule and attach the per-type follow rate from decision 38; the Operator ratifies once; revocation is deleting the entry. A gate that the rule does not match still reaches the Operator. R2 never delegable.

## Sub-question C: one Supervisor or one per project

**Supports:** nothing decisive. Indirect: multi-turn reliability degrades; memory across contexts leaks; tools scope persistent permissions per repository; name-similarity matching deletes the wrong object.
**Does not settle:** whether one conversational thread across projects causes measurable wrong-target actions; whether Operators prefer one surface.
**Rule suggested (I):** one conversational surface, but every mutating call carries an explicit project and item identifier resolved by code, and every confirmation echoes them; the engine's store, not the Supervisor's memory, is the source of truth (decisions 32, 44, 45); each project's rules and rulings are loaded per project and not mixed in one context; cross-project queries are read-only. If the thread cannot name a single target, the Supervisor asks.

## What this means for our Supervisor

All items below are **I** (inference from the evidence above plus decisions 9, 11, 19, 25, 32, 38, 50).
- Treat the Supervisor as a view and a request writer over the engine, not a decider: it calls typed engine commands; the engine decides whether a command needs a human confirmation.
- Do not add a confirm step to gate answers whose options already carry the exact action; the cost is approval fatigue for no new information. Do add a stale-version check in code.
- Confirmation tokens come from the engine and are redeemed outside the Supervisor's chat (button or signed link); the Supervisor can never mint or answer one.
- Show consequence in the confirmation: what stops, what is lost, whether it can be undone, which item and project, which PR head or request version.
- Cap and vary: keep human-visible confirmations to well under one per ten minutes of working time; if a class of confirmations fires often, that is a signal to turn it into a rule or remove it.
- Standing instructions live in a versioned rule file with owner, expiry and kill switch; the Supervisor drafts, the Operator ratifies, code enforces; no remembered natural-language delegation.
- Use the follow rate (decision 38) per request type as the evidence that a rule is worth proposing; require a minimum count and a stated sample before proposing (no study fixes the number).
- Name the target in every mutating command; refuse ambiguous names (match by number, not by title similarity).
- Log every Supervisor command, its engine response and every confirmation, for audit and for the Retro.
- Do not let the Supervisor hold approvals for R2 or for anything outside the declared rule set, and do not let it edit the rules it is checked by.

## What stays unverified

- No measurement of confirmation behaviour for a chat supervisor over a software pipeline; the 93% figure is one vendor's, with no stated method.
- The Goddard et al. automation-bias review was not opened; Parasuraman–Manzey, Parasuraman–Sheridan–Wickens, Laban, Maharana, Santoni de Sio, van der Sijs, Bainbridge, EEMUA/ISA and the Operator material are taken from abstracts or summaries (S).
- The Cisco/SmartBear numbers are vendor-reported and inconsistent across the vendor's own papers.
- No evidence on drift of remembered natural-language preferences, on follow rate or reversal rate as a validated promotion criterion, on wrong-target rates in a multi-project chat, or on typed-target versus button confirmation.
- The "97%" and default-on auto-mode claims are press reports without a primary page.
- Decision 25's cited auto-merge practice (Spotify, Meta, Renovate) was taken from the repository's own research file, not re-checked.
