---
name: unify-root-cause
description: How a pipeline agent explains a defect before it proposes a change. Open it before naming the cause of a bug, a failure or a wrong output, and before proposing or judging a fix.
---

# Root cause before the fix

A place where the wrong value becomes visible is not yet a cause. The cause is why the wrong value got there.

1. **Write the cause as a chain**: what went in, what the code or the model did with it, what came out wrong. Every link has its evidence: a file and line, or a command and its output.
2. **Test the chain against the cases.** It must explain every failing case you know, and why the cases that came out right came out right. A chain that explains only some of them is partial: say so.
3. **When a model produces the output** (an LLM call, a classifier, a ranker), first establish what it was given in the failing case: the exact prompt and inputs of that call. An input that lacks what the decision needs, or misleads, is a cause in the code around the model, not in the model.
4. **Prefer the change at the cause.** A change downstream of it (a filter, a guard, a retry, a special case that corrects the result after it went wrong) is proposed only with three things written next to it:
   - why the cause itself cannot be changed, or not now;
   - which correct cases the downstream change also touches, and how they are kept correct;
   - when it can be removed (after the cause is fixed, or never, and why).
5. **Read what the team already wrote** about the area: notes, research, earlier PRs and their reviews, rulings. Say whether your proposal agrees with it, and if not, why.
6. **When the cause stays unproven**, say "unclear", give the most likely chain, and name the one observation that would prove or refute it. A confident guess is worse than an honest "unclear".

When judging someone else's fix (review, plan), apply the same test: a downstream change without the three notes of point 4 is a finding.
