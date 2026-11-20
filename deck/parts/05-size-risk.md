---

# Work item size and risk

<div class="sr">
<div class="sr-col">
  <h3><b>Size</b> decides what is written and approved</h3>
  <div class="card"><span class="tag">S</span><div><p class="what">Small change <em class="ag">agent goes straight to code</em></p><p class="eg">e.g. fix the text of an error message</p></div></div>
  <div class="card"><span class="tag">M</span><div><p class="what">A feature in one module <em class="op">Operator approves spec and plan</em></p><p class="eg">e.g. add CSV export to a report</p></div></div>
  <div class="card"><span class="tag">L</span><div><p class="what">Many modules <em class="op">Operator approves research, spec, plan</em></p><p class="eg">e.g. move sign-in to a new provider</p></div></div>
</div>
<div class="sr-col">
  <h3><b>Risk</b> decides who merges and deploys</h3>
  <div class="card"><span class="tag">R0</span><div><p class="what">Reversible, stays inside <em class="ag">agent merges and deploys</em></p><p class="eg">e.g. docs, an internal script</p></div></div>
  <div class="card"><span class="tag">R1</span><div><p class="what">Regular code behind checks <em class="op">Operator merges on evidence</em></p><p class="eg">e.g. a regular feature; deploys right away</p></div></div>
  <div class="card"><span class="tag">R2</span><div><p class="what">Irreversible or leaves the system <em class="op">Operator reads the code, deploys</em></p><p class="eg">e.g. a database migration, payments, sending email</p></div></div>
</div>
</div>

<p class="sr-foot">The agent proposes size and risk with a reason; the Operator corrects them on accepting the work item.</p>
