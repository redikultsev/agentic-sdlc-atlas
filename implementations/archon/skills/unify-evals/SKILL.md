---
name: unify-evals
description: How a pipeline agent checks a change to a model-driven feature. Open it before planning, making, reviewing or accepting a change to a prompt, a model, its settings, or what a model is given as input.
---

# Before and after, on the same cases

A model's output varies from run to run, so one good run proves nothing. A change to a prompt, a model or the model's input is accepted on a comparison, not on an example.

1. **Freeze the case set before the change.** Write the list down before touching anything; adding or dropping a case after seeing results needs a stated reason. The set has three parts:
   - the failing cases the change is for;
   - the neighbours: cases close to them that are right today and must stay right (for a rule that removes something, the cases where that thing is correct);
   - a sample of ordinary cases.
   Real cases first, where the project allows their use; synthetic ones are marked as such, with what differs from a real one.
2. **Say what a pass is, per case, before running.** The expected output or the check that decides it. A check a person must eyeball is written as the exact thing to look at.
3. **Same harness on both sides.** Run the cases through the real entry point, with the same model, settings and data, once on the base and once on the change. The only difference is the change.
4. **Run each case N times on each side** (at least 3; more when results are mixed) and record k of N. A case that passes only some of the time is unstable, not passing.
5. **Report per case, not an average.** One row per case: k of N before, k of N after. Then four lists: fixed, broken, still failing, unstable. Add the cost and latency before and after when the change can move them.
6. **Decide by the lists.**
   - Any broken case: the change is not accepted as it is. Say which case and why it broke.
   - A target case still failing or unstable: the change does not do its job yet.
   - A difference small enough that reruns could flip it: say "not enough evidence" and what would settle it (more runs, more cases). This goes to the Operator; never round it up to a pass.
7. **Read the failures.** For every broken, failing or unstable case, look at the actual output and name the kind of error. Kinds that repeat are the finding, more than the count.
8. **When a model judges the outputs,** fix the judge's prompt and model for the whole comparison, and first check it against a handful of cases a person has labelled; say how often it agreed.
9. **Keep the set.** The cases and expectations go where the project keeps its checks, so the next change to this feature starts from them. A defect found later becomes a new case.

If the cases cannot be run here (no access to the model, no allowed data), say so plainly, say what was run instead and what it does not show. A stub in place of the model checks the code around it, never the model's behaviour.

When judging someone else's change (plan, review, acceptance): no frozen set, a single run per case, an average without the per-case lists, or a missing neighbours part is a finding.
