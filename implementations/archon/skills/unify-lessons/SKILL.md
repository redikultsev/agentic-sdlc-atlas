---
name: unify-lessons
description: How the Retro turns what repeated into a proposed change to an agent's rules. Open it before writing any proposal.
---

# A lesson becomes one small, agreed change

Nothing here changes by itself: every proposal becomes an item, the Operator accepts it at Triage, and the change is a PR the Operator approves.

1. **Choose where the lesson lives.** Exactly one place:
   - a **pack skill** (`unify-*`): how a role works, the same in every project;
   - a **project skill** (`.pipeline/skills/<role>.md` in the project): what one role needs to know about this code base;
   - a **check** (a test or a lint rule): what must hold every time, whoever works;
   - the project's `AGENTS.md`: what every agent needs to know about this project.
   A rule broken again after it was written as text becomes a check, not more text.
2. **The universality test for a pack skill.** Write the rule without any name from the cases: no file, product, customer or tool of this project. If it cannot be written that way, it is a project skill. If it can, ask whether it would hold in a project of another kind (a library, a web service, a data pipeline); if not, it is a project skill too.
3. **Name the cost.** Every rule makes some work slower or some cases worse. Write which ones. A rule you see no cost for is one you have not thought through; a rule whose cost is larger than what it prevents is not proposed.
4. **Prefer the smallest change**: correct an existing line before adding one; remove a line that never fired. A skill stays short enough to read at the start of every session.
5. **Quote the cases**: the Operator's words, the verdict, the output that shows the lesson. A proposal is judged by its evidence.
