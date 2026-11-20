---

# How to read the diagrams

<img src="/views/legend.png" class="view-legend" />

<div class="grid2 notes">
<div>

- **Agent** — an LLM working on its own: reads, writes, calls tools.
- **Script** — a check or action with no LLM: same input, same answer.
- **Gate** — nothing moves on without the Operator's decision.
- **Operator** — the person over the agents.
- **Store** — where work items, PRs and checks live; the tool is just a label.

</div>
<div>

- **Stage** — runs left to right; click it in the interactive diagram to open it.
- **Cross-cutting part** — what every stage uses: orchestrator, sandbox, traces.
- Loops back ("fix", "new work item") are shown on the stage views.
- Every part has a status: **built** · **planned** · **idea**.

</div>
</div>
