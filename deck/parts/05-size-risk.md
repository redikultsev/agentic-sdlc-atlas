---

# Work item size and risk

<div class="sr">
<div class="sr-col">
  <h3><b>Size</b> decides what is written and approved</h3>
  <div class="card"><span class="tag">S</span><div><p class="what">Small change <em class="ag">agent goes straight to code</em></p><p class="eg">e.g. fix the text of an error message</p></div></div>
  <div class="card"><span class="tag">M</span><div><p class="what">A feature in one module <em class="op">Operator approves spec and plan</em></p><p class="eg">e.g. add CSV export to a report</p></div></div>
  <div class="card"><span class="tag">L</span><div><p class="what">Many modules <em class="op">Operator approves spec and plan; plan built on codebase research</em></p><p class="eg">e.g. move sign-in to a new provider</p></div></div>
</div>
<div class="sr-col">
  <h3><b>Risk</b> decides who merges</h3>
  <div class="card"><span class="tag">R0</span><div><p class="what">Matches the auto-merge rules <em class="ag">merges without the Operator</em></p><p class="eg">e.g. docs, tests, patch updates; never auth or payments</p></div></div>
  <div class="card"><span class="tag">R1</span><div><p class="what">Regular code behind checks <em class="op">Operator merges on evidence</em></p><p class="eg">e.g. a regular feature</p></div></div>
  <div class="card"><span class="tag">R2</span><div><p class="what">Irreversible or leaves the system <em class="op">Operator reads the code</em></p><p class="eg">e.g. a database migration, payments, sending email</p></div></div>
</div>
</div>

<p class="sr-foot">The Operator decides 1–2 times for S (accept; merge if R1/R2), 3–4 times for M and L (accept, spec, plan; merge if R1/R2); a project with a person's gate on a pre-merge environment adds one. The agent proposes size and risk with a reason; the Operator corrects them on accepting.</p>
