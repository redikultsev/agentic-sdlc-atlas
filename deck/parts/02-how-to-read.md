---

# How to read the diagrams

<div class="lg">
  <div class="lg-cell"><likec4-view view-id="legendAgent" color-scheme="light" class="lv"></likec4-view><p>Works on its own: reads, writes, calls tools</p></div>
  <div class="lg-cell"><likec4-view view-id="legendScript" color-scheme="light" class="lv"></likec4-view><p>A check or action: same input, same answer</p></div>
  <div class="lg-cell"><likec4-view view-id="legendGate" color-scheme="light" class="lv"></likec4-view><p>Nothing moves on without the Operator's decision</p></div>
  <div class="lg-cell"><likec4-view view-id="legendOperator" color-scheme="light" class="lv"></likec4-view><p>The person over the agents</p></div>
  <div class="lg-cell"><likec4-view view-id="legendStore" color-scheme="light" class="lv"></likec4-view><p>Where work items, PRs and checks live</p></div>
  <div class="lg-cell"><likec4-view view-id="legendStage" color-scheme="light" class="lv"></likec4-view><p>Runs left to right; click to open it</p></div>
  <div class="lg-cell"><likec4-view view-id="legendCross" color-scheme="light" class="lv"></likec4-view><p>Orchestrator, sandbox, traces</p></div>
  <div class="lg-cell arrows">
    <div><svg viewBox="0 0 120 12"><line x1="2" y1="6" x2="108" y2="6" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="7 5"/><path d="M106 1 L118 6 L106 11 Z" fill="#2563eb"/></svg><span>hand-off of work</span></div>
    <div><svg viewBox="0 0 120 12"><line x1="2" y1="6" x2="108" y2="6" stroke="#be123c" stroke-width="2.5" stroke-dasharray="7 5"/><path d="M106 1 L118 6 L106 11 Z" fill="#be123c"/></svg><span>verdict (JSON)</span></div>
    <div><svg viewBox="0 0 120 12"><line x1="2" y1="6" x2="108" y2="6" stroke="#475569" stroke-width="2.5" stroke-dasharray="7 5"/><path d="M106 1 L118 6 L106 11 Z" fill="#475569"/></svg><span>writes into a store</span></div>
    <div><svg viewBox="0 0 120 12"><line x1="2" y1="6" x2="108" y2="6" stroke="#475569" stroke-width="2.5" stroke-dasharray="1.5 5" stroke-linecap="round"/><path d="M106 1 L118 6 L106 11 Z" fill="#475569"/></svg><span>reads from a store</span></div>
  </div>
</div>

<div class="lg-foot">Arrows point where the data goes · Loops back ("fix", "new work item") are shown on the stage views · Every part has a status: <b>built</b> · <b>planned</b> · <b>idea</b></div>
