---

# How to read the diagrams

<div class="lg">
  <div class="lg-cell"><div class="blk" style="--f:#6366f1;--s:#4f46e5;--t:#eef2ff;--l:#c7d2fe"><b>Agent</b><i>LLM</i></div><p>Works on its own: reads, writes, calls tools</p></div>
  <div class="lg-cell"><div class="blk comp" style="--f:#428a4f;--s:#2d5d39;--t:#f8fafc;--l:#c2f0c2"><b>Script</b><i>no LLM</i></div><p>A check or action: same input, same answer</p></div>
  <div class="lg-cell"><div class="blk" style="--f:#AC4D39;--s:#853A2D;--t:#FBD3CB;--l:#f5b2a3"><b>Gate</b><i>Operator decides</i></div><p>Nothing moves on without the Operator's decision</p></div>
  <div class="lg-cell"><div class="blk" style="--f:#A35829;--s:#7E451D;--t:#FFE0C2;--l:#f9b27c"><svg class="person" viewBox="0 0 40 52"><circle cx="20" cy="11" r="10"/><path d="M0 52 Q0 25 20 25 Q40 25 40 52 Z"/></svg><b>Operator</b><i>human</i></div><p>The person over the agents</p></div>
  <div class="lg-cell"><div class="blk store" style="--f:#737373;--s:#525252;--t:#fafafa;--l:#d4d4d4"><b>Store</b><i>tool as a label</i></div><p>Where work items, PRs and checks live</p></div>
  <div class="lg-cell"><div class="blk" style="--f:#64748b;--s:#475569;--t:#f8fafc;--l:#cbd5e1"><b>1. Stage</b><i>pipeline stage</i></div><p>Runs left to right; click to open it</p></div>
  <div class="lg-cell"><div class="blk" style="--f:#0284c7;--s:#0369a1;--t:#f0f9ff;--l:#B6ECF7"><b>Cross-cutting</b><i>used by every stage</i></div><p>Orchestrator, sandbox, traces</p></div>
  <div class="lg-cell arrows">
    <div><svg viewBox="0 0 120 12"><line x1="2" y1="6" x2="108" y2="6" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="7 5"/><path d="M106 1 L118 6 L106 11 Z" fill="#3b82f6"/></svg><span>hand-off of work</span></div>
    <div><svg viewBox="0 0 120 12"><line x1="2" y1="6" x2="108" y2="6" stroke="#AC4D39" stroke-width="2.5" stroke-dasharray="7 5"/><path d="M106 1 L118 6 L106 11 Z" fill="#AC4D39"/></svg><span>verdict (JSON)</span></div>
    <div><svg viewBox="0 0 120 12"><line x1="2" y1="6" x2="108" y2="6" stroke="#8b8b8b" stroke-width="2.5" stroke-dasharray="7 5"/><path d="M106 1 L118 6 L106 11 Z" fill="#8b8b8b"/></svg><span>reads or writes</span></div>
  </div>
</div>

<div class="lg-foot">Loops back ("fix", "new work item") are shown on the stage views · Every part has a status: <b>built</b> · <b>planned</b> · <b>idea</b></div>
