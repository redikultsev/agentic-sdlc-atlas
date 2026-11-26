---
name: unify-root-cause
description: How a pipeline agent explains a defect before it proposes a change. Open it before naming the cause of a bug, a failure or a wrong output, and before proposing or judging a fix.
---

# Root cause before the fix

A place where the wrong value becomes visible is not yet a cause. The cause is why the wrong value got there.

1. **Write the cause as a chain**: what went in, what the code or the model did with it, what came out wrong. Every link has its evidence: a file and line, or a command and its output.
2. **Test the chain against the cases.** It must explain every failing case you know, and why the cases that came out right came out right. A chain that explains only some of them is partial: say so.
3. **When a model produces the output** (an LLM call, a classifier, a ranker), first establish what it was given in the failing case: the exact prompt and inputs of that call. An input that lacks what the decision needs, or misleads, is a cause in the code around the model, not in the model. Walk the stages in order: what the call was given, the prompt, the model and its settings, how several outputs are combined, what is done to the output afterwards. The cause is the earliest stage that went wrong.
4. **Ask whether the wrong state should exist at all.** If the value that led to the symptom is one the system may legitimately produce, handle it where the code failed to. If it should never have been produced, anything that removes or corrects it later (a filter, a guard, a retry, a special case, a rule over the output) hides the defect: the fix is where it is produced.
5. **Name the fix at the cause first,** with what it costs: files, size, what it could break. An option list without it is incomplete. A later-stage change is proposed only next to it, as a stopgap the Operator may choose, or when the cause sits outside what the team can change; then with three things written next to it:
   - why the cause cannot be changed, or what the stopgap buys until it is;
   - which correct cases the later-stage change also touches, and how they are kept correct;
   - when it is removed, and what triggers that.
   None of these is a reason to move the fix to a later stage: the later rule is deterministic or easier to test; another task will rebuild the area (check that task's scope and date and report them; it is a fact for the Operator, not a reason); an earlier note recommended it.
6. **Read what the team already wrote** about the area: notes, research, earlier PRs and their reviews, rulings. Treat it as evidence to check, not as the answer: say what it claims, whether your own evidence confirms it, and where your proposal differs and why.
7. **When the cause stays unproven**, say "unclear", give the most likely chain, and name the one observation that would prove or refute it. A confident guess is worse than an honest "unclear".

When judging someone else's fix (review, plan), apply the same tests: a later-stage change that hides a state which should not exist, or one offered without the fix at the cause beside it, is a finding.
