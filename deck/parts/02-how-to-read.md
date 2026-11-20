---

# How to read the diagrams

<div class="grid2">
<div>

<div class="legend">
  <div><span class="chip" style="background:#6366f1">Agent</span> an LLM working on its own</div>
  <div><span class="chip" style="background:#428a4f">Script</span> a check or action with no LLM</div>
  <div><span class="chip" style="background:#AC4D39">Gate</span> the Operator decides here</div>
  <div><span class="chip" style="background:#A35829">Operator</span> the human over the agents</div>
  <div><span class="chip store" style="background:#737373">Store</span> where work items, PRs and checks live</div>
  <div><span class="chip" style="background:#64748b">1. Stage</span> a pipeline stage; click to open it</div>
  <div><span class="chip" style="background:#0ea5e9">Cross-cutting</span> orchestrator, sandbox, traces</div>
</div>

</div>
<div>

- Stages run **left to right**.
- Click a stage in the interactive diagram to open it.
- Loops back ("fix", "new work item") are shown on the stage views.
- Tools (GitHub, Jira, Dokploy) are only labels. The design does not depend on them.
- Part status: **built** · **planned** · **idea** (faded on the status view).

</div>
</div>
