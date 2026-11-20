---

# How to read the diagrams

<div class="grid2">
<div>

| Colour | Who |
|---|---|
| purple | **agent** — an LLM working on its own |
| green | **script** — a check or action with no LLM |
| red | **gate** — the Operator decides |
| orange | **Operator** — the human over the agents |
| grey cylinder | **store** — where work items, PRs and checks live |

</div>
<div>

- Stages run **left to right**.
- Click a stage in the interactive diagram to open it.
- Loops back ("fix", "new work item") are shown on the stage views.
- Tools (GitHub, Jira, Dokploy) are only labels. The design does not depend on them.
- Part status: **built** · **planned** · **idea**.

</div>
</div>
