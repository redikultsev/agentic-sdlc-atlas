# A Supervisor agent: what authority to give it

Date: 2026-11-24. Synthesis of four parallel reports, each with its own sources and V / S / I marks: [engines' code](supervisor/engines-code.md) (Cezar `b2c3e8a`, Archon `c9a608e`, AFactory `f7dc865`, read statically), [other systems](supervisor/other-systems.md), [production practice and incidents](supervisor/production-practice.md), [human factors](supervisor/human-factors.md). Every fact below is cited in one of them; this file adds only the conclusions, marked as ours.

## Question

The owner wants a Supervisor: a long-lived chat agent that is the Operator's single interface to the whole pipeline (status, new work, gates, cancel, pause, releases). The owner's instinct is to forbid it nothing. Should it be allowed everything the Operator can do?

## Short answer

1. Nobody surveyed gives a top agent the full authority of its human with nothing in between. What is held back is narrow and the same almost everywhere: approving or merging work as the human, changing its own limits, production credentials.
2. "Forbid" is the wrong frame. What is held back is not a ban on the agent: it is the human's signature. A gate answer the agent can write is not a gate.
3. Confirmation prompts do not work as the control: people accept 93% of them, a model completes its own confirm step every time when it can, and dialogs can be faked. The control that holds is structural: the act runs on a route the agent cannot reach.
4. The failures actually reported for top agents are mostly cost and fan-out, answered with caps, not bans.
5. So: let the Supervisor do every reversible thing without asking; keep the few acts that are the Operator's judgement on a channel the model cannot write; keep the pipeline's own rules out of its reach altogether.

## What the engines do (code)

- **Cezar's manager** acts alone on creating, messaging, retrying and cancelling its own tasks; merge, enabling an automation, adding a job and a connector write are cards the user approves. The fence is reachability, not identity: the approval route checks no caller, and the manager cannot reach it only because its shell allowlist refuses everything but its own CLI and read-only `gh`; that hook is absent on Windows and on some backends. A traced gap: a workflow's human gate accepts any user-authored message, the manager's "say" posts on that route, and anything but a clear reject approves. One manager session grew to 962k tokens and cost $51.9, almost all of it re-reading history.
- **Archon's chat agent** can approve, reject, respond and cancel as the chatting user. Its confirm step is two calls the model completes itself; Archon removed the confirm from its attention tool after measuring that the model passed `confirm: true` on the first call every time, and one "accept the recommendation" answered three items. With web auth off, any caller that reaches the port is "operator".
- **AFactory** has no supervising agent; the user's own agent drives a CLI. It is the only one of the three where the agent cannot press the button: approving a plan, approving or rejecting a task and scenario decisions need a signature made outside the tool.

## What other systems and vendors do

- Most have one top agent the human talks to; it may spawn, assign, nudge, stop and summarise, sometimes change soft settings (models, worker counts, budgets). Almost none lets it write code, merge, grant itself permissions or approve as the human; the mechanism is an absent tool, a role split, or deny rules that hold in every mode.
- Human approval is out of band everywhere: a terminal prompt, a UI click, a PR review. One vendor's documentation states that a teammate agent cannot approve a permission prompt for the user and that an approval claim relayed by another agent is untrusted.
- One first-party exception: a team whose agents merge their own PRs, justified by cheap correction and caveated as depending on their tooling.
- Incidents share one shape: the agent held production or secret authority in a session that also read untrusted text, and the control that failed was a prompt or the model's judgement. A stated code freeze did not stop a production database from being deleted.
- Guidance (least agency, the "lethal trifecta", the rule of two) names the hazard as the combination: untrusted input, sensitive access and outward action in one session. A Supervisor that reads work-item text and can answer gates holds two of the three by default.

## What the human side says

- 93% of permission prompts are accepted; sandboxing cut prompts by 84%. A classifier in place of prompts still misses about one in six overeager actions on the vendor's own sample.
- Vague commands are the practical danger: "clean up branches" deleted remote branches; "cancel my job" cancelled a job matched by name.
- Standing instructions kept as remembered text can be poisoned through content; the encodings that hold are rule files with precedence, evaluated by code.
- Thin or absent evidence: one assistant across many projects, typed confirmation versus a button, batching of decisions. The alarm-rate literature puts a manageable load near one to two per ten minutes; a cap of 3 waiting items is far inside it.

## The case for "forbid nothing", stated fairly

The Supervisor is the Operator's interface, not another actor; every limit moves work back to the scarcest resource; prohibitions written in a prompt are weak anyway; the Operator could do the same by hand.

## Why a short list still stays with the Operator

1. The Supervisor acts on text the Operator did not write (work items, agents' reports). "Whatever the Operator may do" is the wrong bound; the right one is "whatever the Operator decided", and a decision has to be the Operator's own act.
2. The one who made a change and the one who approves it must stay different (the pipeline's gates exist for this); an agent that can answer gates collapses that into one model reading text.
3. An agent must not edit its own limits.

## Conclusions for the model (ours)

- **Three classes of action, decided by code, not by a prompt.** (a) Free, no confirmation: every read, and every reversible command (create a request, mark urgent, pause and resume, start the triage of the buffer, reorder a queue). (b) The Operator's signature: gate answers, starting a release, adopting a difference with the tracker, and the irreversible or wide commands (cancelling an item with work done, anything in bulk). The Supervisor prepares and presents these; the answer reaches the engine on a route the model cannot write. (c) Not through the Supervisor at all: the pipeline's rules, the trusted list, the project map, its own permissions; these change by a pull request like for anyone, and it may file the request.
- **Intents, not credentials.** The Supervisor holds no tool but the engine's own entry points; the engine checks each call against the state machine. It reads only the engine's approved copy of request text.
- **The engine's write routes need a caller identity before a Supervisor exists.** Both engines read leave an unauthenticated local route that can approve.
- **Standing instructions become rule files** that code evaluates (as the auto-merge rules do), drafted by the Supervisor from the follow rate, ratified by the Operator; never a remembered preference.
- **Caps, not bans, for cost:** a budget and a context limit per Supervisor session, its memory in the engine's store rather than in the chat, fresh sessions that re-read the store.
- **Explicit targets:** every changing call names the project and the item, and the engine echoes them back; cross-project questions are read-only.
- **Every action is logged** against the Operator's message that caused it.

## Decided

Decision 62 in `docs/decisions.md` (2026-11-24): the three classes as above; the owner chose that a gate answer is a control the engine draws, pressed by the Operator, over the Supervisor relaying the Operator's word.

## Not verified

Listed per report. In short: the original description of one system's top agent (taken from a third-party port); several vendors' internals; whether any top agent has ever faked an approval (no study found); the multi-project evidence; the Cezar gap was traced in code, not run.
