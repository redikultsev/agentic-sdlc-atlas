---
theme: default
title: Agentic development pipeline
info: How a work item travels from a signal to production with agents, and where the human decides. Generated from the model; do not edit by hand.
colorSchema: light
aspectRatio: 16/9
canvasWidth: 1280
mdc: true
---

# Agentic development pipeline

How a work item travels from a signal to production, who does what, and where the human decides

<div class="muted">Draft v1 · generated from the model in this repository · updated with it</div>

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

---

# Whole pipeline

<div class="dg"><likec4-view view-id="index" color-scheme="light" browser="true" class="view-wide"></likec4-view><span class="hint">⤢ Click the diagram to explore: zoom, pan, open any stage</span></div>

Nine stages that Stripe, Anthropic, Spotify, Google, Cognition, AWS AI-DLC and others converge on. The Operator on top, stores below the stages that use them.

---

# What moves and where it lives

<p class="chain">A work item fills these stores in order, left to right, top to bottom. An incident in production opens a new work item.</p>

<div class="st">
  <div class="st-cell"><likec4-view view-id="storeTracker" color-scheme="light" class="sv"></likec4-view><p class="tool">GitHub Issues · Jira</p><p><b>The hub.</b> Number, size, risk, state. Everything links to the number.</p></div>
  <div class="st-cell"><likec4-view view-id="storeDocs" color-scheme="light" class="sv"></likec4-view><p class="tool">files in the repo or the work item body</p><p>Spec and plan of each work item; decision records (ADR).</p></div>
  <div class="st-cell"><likec4-view view-id="storeChanges" color-scheme="light" class="sv"></likec4-view><p class="tool">PR · MR</p><p>The code change, evidence, review, verdict and its explanation.</p></div>
  <div class="st-cell"><likec4-view view-id="storeCi" color-scheme="light" class="sv"></likec4-view><p class="tool">CI</p><p>Test, lint and build output tied to the commit.</p></div>
  <div class="st-cell"><likec4-view view-id="storeReleases" color-scheme="light" class="sv"></likec4-view><p class="tool">Dokploy · TeamCity</p><p>Which version runs where and how the rollout ended.</p></div>
  <div class="st-cell"><likec4-view view-id="storeProd" color-scheme="light" class="sv"></likec4-view><p class="tool">Running services</p><p>Errors and incidents here start new work items.</p></div>
</div>

<details class="fine"><summary>Names</summary>Artifact names follow the CDEvents standard (CD Foundation): ticket, change, build, release, incident. The tool under each block is today's choice; the pipeline talks to it through an adapter.</details>

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
  <h3><b>Risk</b> decides who merges and deploys</h3>
  <div class="card"><span class="tag">R0</span><div><p class="what">Matches the auto-merge rules <em class="ag">merges and deploys without the Operator</em></p><p class="eg">e.g. docs, tests, patch updates; never auth or payments</p></div></div>
  <div class="card"><span class="tag">R1</span><div><p class="what">Regular code behind checks <em class="op">Operator merges on evidence</em></p><p class="eg">e.g. a regular feature; deploys right away</p></div></div>
  <div class="card"><span class="tag">R2</span><div><p class="what">Irreversible or leaves the system <em class="op">Operator reads the code, merge deploys</em></p><p class="eg">e.g. a database migration, payments, sending email</p></div></div>
</div>
</div>

<p class="sr-foot">The Operator decides 1–2 times for S (accept; merge if R1/R2), 3–4 times for M and L (accept, spec, plan; merge if R1/R2). The agent proposes size and risk with a reason; the Operator corrects them on accepting.</p>

---
layout: default
---

# 1. Intake

<div class="lead">A signal becomes a work item. An agent proposes size and risk; the Operator accepts it.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="intakeDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n2">
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">idea</span></div><p class="pn">Triage</p><dl class="eg3"><dt>In</dt><dd>A request, a bug or an alert</dd><dt>Does</dt><dd>Investigates on its own: duplicates, already built, rejected before, reproduces a bug; writes down assumptions</dd><dt>Out</dt><dd>Size, risk, assumptions and an outcome: for agent, for a human, won't do</dd></dl></div>
  <div class="pc"><div class="pc-top"><span class="pk k-gate">Gate</span><span class="ps">idea</span></div><p class="pn">Accept</p><dl class="eg3"><dt>In</dt><dd>Size, risk, assumptions and the proposed outcome</dd><dt>Does</dt><dd>The Operator accepts, corrects or rejects</dd><dt>Out</dt><dd>Agent: S → Implement, M, L → Spec; or for a human; or won't do</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> New → Triaged → on to Spec or Implement / ForHuman / Cancelled &nbsp;·&nbsp; <b>The Operator decides:</b> Accept</p>


---
layout: default
---

# 2. Spec

<div class="lead">M and L only. The agent clarifies and writes what "done" means.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="specDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n2">
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">idea</span></div><p class="pn">Interviewer</p><dl class="eg3"><dt>In</dt><dd>An accepted M or L work item</dd><dt>Does</dt><dd>Asks the Operator about what is unclear</dd><dt>Out</dt><dd>Spec: why, criteria with key examples, what must not change</dd></dl></div>
  <div class="pc"><div class="pc-top"><span class="pk k-gate">Gate</span><span class="ps">idea</span></div><p class="pn">Approve spec</p><dl class="eg3"><dt>In</dt><dd>The spec</dd><dt>Does</dt><dd>The Operator approves or edits it</dd><dt>Out</dt><dd>M → Plan; L → codebase research</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> Specifying → SpecReview &nbsp;·&nbsp; <b>The Operator decides:</b> Approve spec</p>


---
layout: default
---

# 3. Plan

<div class="lead">M and L only. How we do it, in slices, and how we prove it is done.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="planDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n3">
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">idea</span></div><p class="pn">Codebase researcher</p><dl class="eg3"><dt>In</dt><dd>An approved L spec</dd><dt>Does</dt><dd>Reads the code only, changes nothing</dd><dt>Out</dt><dd>Research: affected modules, what must stay true</dd></dl></div>
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">idea</span></div><p class="pn">Planner</p><dl class="eg3"><dt>In</dt><dd>The spec, past decisions, research (L)</dd><dt>Does</dt><dd>Splits the work into slices</dd><dt>Out</dt><dd>Plan; one sub-issue per slice with "blocked by" links</dd></dl></div>
  <div class="pc"><div class="pc-top"><span class="pk k-gate">Gate</span><span class="ps">idea</span></div><p class="pn">Approve plan</p><dl class="eg3"><dt>In</dt><dd>The plan</dd><dt>Does</dt><dd>The Operator approves or edits it</dd><dt>Out</dt><dd>The work item goes to Implement</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> Planning (L: research first) → PlanReview &nbsp;·&nbsp; <b>The Operator decides:</b> Approve plan</p>


---
layout: default
---

# 4. Implement

<div class="lead">The agent writes the change in the sandbox. S comes here straight from intake.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="implementDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n1">
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">built</span></div><p class="pn">Implementer</p><dl class="eg3"><dt>In</dt><dd>A slice of the plan (for S, the work item) and the code</dd><dt>Does</dt><dd>Unit tests first, then code; fast checks in the sandbox</dd><dt>Out</dt><dd>A pushed branch, a PR</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> Implementing &nbsp;·&nbsp; <b>The Operator decides:</b> nothing, this stage runs without a human</p>


---
layout: default
---

# 5. Checks & review

<div class="lead">Cheap and deterministic first: CI outside the sandbox, then one AI reviewer reads the code. Their findings change code, so they run before the expensive acceptance pass.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="verifyDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n2">
  <div class="pc"><div class="pc-top"><span class="pk k-script">Script</span><span class="ps">planned</span></div><p class="pn">CI checks</p><dl class="eg3"><dt>In</dt><dd>The pushed branch</dd><dt>Does</dt><dd>Runs the full test suite, lint, types, build</dd><dt>Out</dt><dd>Green: on to the AI reviewer. Red: fix</dd></dl></div>
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">built</span></div><p class="pn">AI reviewer</p><dl class="eg3"><dt>In</dt><dd>The PR after green CI, the spec, the code around it</dd><dt>Does</dt><dd>Finds and re-checks issues, skips nits, explains the change</dd><dt>Out</dt><dd>Pass: on to acceptance. Fix or block; for R1/R2 an explanation in the PR</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> Verifying (fix rounds ≤ 3 per work item, else Blocked) &nbsp;·&nbsp; <b>The Operator decides:</b> nothing, this stage runs without a human</p>


---
layout: default
---

# 6. Acceptance

<div class="lead">Last and most expensive: a separate Validator checks the acceptance criteria on the running app, as a user, and records evidence. It runs on code that will not change again.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="aiReviewDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n1">
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">idea</span></div><p class="pn">Validator</p><dl class="eg3"><dt>In</dt><dd>The reviewed PR, the acceptance criteria</dd><dt>Does</dt><dd>Checks each criterion and its examples as a user, records evidence</dd><dt>Out</dt><dd>Pass with evidence on the PR, or fail with the criterion that broke</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> Verifying → MergeReview (R1/R2) or Live (R0) &nbsp;·&nbsp; <b>The Operator decides:</b> nothing, this stage runs without a human</p>


---
layout: default
---

# 7. Merge

<div class="lead">A script checks the auto-merge rules: a match merges without the Operator (R0), anything else goes to the Operator's gate. Everything lands through a merge queue on the latest main.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="mergeDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n3">
  <div class="pc"><div class="pc-top"><span class="pk k-script">Script</span><span class="ps">idea</span></div><p class="pn">Auto-merge rules</p><dl class="eg3"><dt>In</dt><dd>The PR that passed acceptance, the rules file</dd><dt>Does</dt><dd>Checks paths, size, dependencies, never-zones, time</dd><dt>Out</dt><dd>Match: queue (R0). No match: the Operator's gate</dd></dl></div>
  <div class="pc"><div class="pc-top"><span class="pk k-gate">Gate</span><span class="ps">idea</span></div><p class="pn">Merge?</p><dl class="eg3"><dt>In</dt><dd>The PR: scope, explanation, evidence; for R2 the code</dd><dt>Does</dt><dd>The Operator: merge or changes with a comment</dd><dt>Out</dt><dd>Merge: to the queue. Changes: back to the Implementer</dd></dl></div>
  <div class="pc"><div class="pc-top"><span class="pk k-script">Script</span><span class="ps">planned</span></div><p class="pn">Merge queue</p><dl class="eg3"><dt>In</dt><dd>An approved PR</dd><dt>Does</dt><dd>Rebuilds on the latest main, runs the full CI</dd><dt>Out</dt><dd>Merged commit; or ejected with the reason</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> MergeReview → Live &nbsp;·&nbsp; <b>The Operator decides:</b> Merge?</p>


---
layout: default
---

# 8. Deploy & watch

<div class="lead">Every merge deploys main to all users at once. The Watcher watches the change and rolls it back by itself on a regression. No gate after merge: R2 was approved at the Merge gate.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="deployDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n2">
  <div class="pc"><div class="pc-top"><span class="pk k-script">Script</span><span class="ps">built</span></div><p class="pn">Deploy</p><dl class="eg3"><dt>In</dt><dd>Merged main</dd><dt>Does</dt><dd>Deploys to everyone; rolls back on the Watcher's call</dd><dt>Out</dt><dd>Running version, a record in Deployments</dd></dl></div>
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">idea</span></div><p class="pn">Watcher</p><dl class="eg3"><dt>In</dt><dd>Deploy, the PR diff, errors, logs, metrics</dd><dt>Does</dt><dd>Watches what the PR changed, then the whole service</dd><dt>Out</dt><dd>Clean: Done. Regression: rollback, report, work item</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> Live → Done / RolledBack &nbsp;·&nbsp; <b>The Operator decides:</b> nothing, this stage runs without a human</p>


---
layout: default
---

# 9. Learn

<div class="lead">Once a week the Retro agent turns what repeated into rule and check work items, and proposes removing rules that do not pay off. No gate of its own: proposals go through Triage and land as PRs like any change.</div>

<div class="stg">
<div class="dg"><likec4-view view-id="learnDeck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n1">
  <div class="pc"><div class="pc-top"><span class="pk k-agent">Agent</span><span class="ps">idea</span></div><p class="pn">Retro</p><dl class="eg3"><dt>In</dt><dd>Corrections, Blocked items, rounds, findings, rollbacks, traces</dd><dt>Does</dt><dd>Finds what repeated twice; proposes adding or removing rules</dd><dt>Out</dt><dd>Rule and check work items to Triage; weekly summary</dd></dl></div>
</div>
</div>

<p class="sf"><b>Work item states:</b> new work items in New &nbsp;·&nbsp; <b>The Operator decides:</b> nothing, this stage runs without a human</p>


---
layout: default
---

# Work item states

<div class="smw"><svg class="sm" viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs><path d="M31,70 H58" class="tr" marker-end="url(#ah)"/><path d="M180,70 H248" class="tr" marker-end="url(#ah)"/><path d="M370,70 H438" class="tr" marker-end="url(#ah)"/><path d="M270,96 V272" class="tr" marker-end="url(#ah)"/><path d="M256,96 L124,294" class="tr" marker-end="url(#ah)"/><path d="M560,70 H628" class="tr" marker-end="url(#ah)"/><path d="M650,96 C650,138 540,138 540,98" class="tr" marker-end="url(#ah)"/><path d="M750,70 H818" class="tr" marker-end="url(#ah)"/><path d="M940,70 H1008" class="tr" marker-end="url(#ah)"/><path d="M1030,96 C1030,138 920,138 920,98" class="tr" marker-end="url(#ah)"/><path d="M1070,96 V170 H305 V272" class="tr" marker-end="url(#ah)"/><path d="M370,300 H438" class="tr" marker-end="url(#ah)"/><path d="M470,274 C470,224 360,224 360,272" class="tr" marker-end="url(#ah)"/><path d="M560,300 H628" class="tr" marker-end="url(#ah)"/><path d="M530,326 C530,388 850,388 850,328" class="tr" marker-end="url(#ah)"/><path d="M500,326 V412" class="tr" marker-end="url(#ah)"/><path d="M650,274 C650,170 335,170 335,272" class="tr" marker-end="url(#ah)"/><path d="M750,300 H818" class="tr" marker-end="url(#ah)"/><path d="M940,300 H1008" class="tr" marker-end="url(#ah)"/><path d="M900,326 V412" class="tr" marker-end="url(#ah)"/><path d="M1130,300 H1149" class="tr" marker-end="url(#ah)"/><path d="M460,414 L333,329" class="tr" marker-end="url(#ah)"/><path d="M440,440 H372" class="tr" marker-end="url(#ah)"/><path d="M120,306 V412" class="tr" marker-end="url(#ah)"/><path d="M125,305 L248,432" class="tr" marker-end="url(#ah)"/><rect x="60.0" y="44.0" width="120" height="52" rx="10" fill="#4f46e5"/><text x="120" y="67" class="sn">New</text><text x="120" y="85" class="sg">1 · Intake</text><rect x="250.0" y="44.0" width="120" height="52" rx="10" fill="#be123c"/><text x="310" y="67" class="sn">Triaged</text><text x="310" y="85" class="sg">1 · Intake</text><rect x="440.0" y="44.0" width="120" height="52" rx="10" fill="#be123c"/><text x="500" y="67" class="sn">Specifying</text><text x="500" y="85" class="sg">2 · Spec</text><rect x="630.0" y="44.0" width="120" height="52" rx="10" fill="#be123c"/><text x="690" y="67" class="sn">SpecReview</text><text x="690" y="85" class="sg">2 · Spec</text><rect x="820.0" y="44.0" width="120" height="52" rx="10" fill="#4f46e5"/><text x="880" y="67" class="sn">Planning</text><text x="880" y="85" class="sg">3 · Plan</text><rect x="1010.0" y="44.0" width="120" height="52" rx="10" fill="#be123c"/><text x="1070" y="67" class="sn">PlanReview</text><text x="1070" y="85" class="sg">3 · Plan</text><rect x="250.0" y="274.0" width="120" height="52" rx="10" fill="#4f46e5"/><text x="310" y="297" class="sn">Implementing</text><text x="310" y="315" class="sg">4 · Implement</text><rect x="440.0" y="274.0" width="120" height="52" rx="10" fill="#4f46e5"/><text x="500" y="297" class="sn">Verifying</text><text x="500" y="315" class="sg">5–6 · Checks</text><rect x="630.0" y="274.0" width="120" height="52" rx="10" fill="#be123c"/><text x="690" y="297" class="sn">MergeReview</text><text x="690" y="315" class="sg">7 · Merge</text><rect x="820.0" y="274.0" width="120" height="52" rx="10" fill="#4f46e5"/><text x="880" y="297" class="sn">Live</text><text x="880" y="315" class="sg">8 · Deploy</text><rect x="1010.0" y="274.0" width="120" height="52" rx="10" fill="#475569"/><text x="1070" y="297" class="sn">Done</text><text x="1070" y="315" class="sg">8 · Deploy</text><rect x="60.0" y="414.0" width="120" height="52" rx="10" fill="#c2410c"/><text x="120" y="437" class="sn">ForHuman</text><text x="120" y="455" class="sg">exit</text><rect x="250.0" y="414.0" width="120" height="52" rx="10" fill="#475569"/><text x="310" y="437" class="sn">Cancelled</text><text x="310" y="455" class="sg">exit</text><rect x="440.0" y="414.0" width="120" height="52" rx="10" fill="#be123c"/><text x="500" y="437" class="sn">Blocked</text><text x="500" y="455" class="sg">from 5–7</text><rect x="820.0" y="414.0" width="120" height="52" rx="10" fill="#475569"/><text x="880" y="437" class="sn">RolledBack</text><text x="880" y="455" class="sg">8 · Deploy</text><circle cx="24" cy="70" r="7" fill="#1e293b"/><circle cx="1160" cy="300" r="10" fill="none" stroke="#1e293b" stroke-width="2"/><circle cx="1160" cy="300" r="6" fill="#1e293b"/><circle cx="120" cy="300" r="5" fill="#64748b"/><text x="215" y="60" text-anchor="middle" class="tl">checked</text><text x="405" y="48" text-anchor="middle" class="tl">accepted</text><text x="405" y="61" text-anchor="middle" class="tl">M or L</text><text x="262" y="222" text-anchor="end" class="tl">accepted</text><text x="262" y="236" text-anchor="end" class="tl">S</text><text x="595" y="60" text-anchor="middle" class="tl">spec ready</text><text x="595" y="143" text-anchor="middle" class="tl">clarify</text><text x="785" y="60" text-anchor="middle" class="tl">approved</text><text x="975" y="60" text-anchor="middle" class="tl">plan ready</text><text x="975" y="143" text-anchor="middle" class="tl">redo</text><text x="1078" y="136" text-anchor="start" class="tl">approved</text><text x="405" y="290" text-anchor="middle" class="tl">ready</text><text x="415" y="231" text-anchor="middle" class="tl">fix · queue red</text><text x="595" y="278" text-anchor="middle" class="tl">passed</text><text x="595" y="291" text-anchor="middle" class="tl">R1, R2</text><text x="690" y="388" text-anchor="middle" class="tl">passed, R0: merged</text><text x="492" y="362" text-anchor="end" class="tl">out of rounds</text><text x="492" y="376" text-anchor="end" class="tl">or block</text><text x="492" y="190" text-anchor="middle" class="tl">changes · queue red</text><text x="785" y="290" text-anchor="middle" class="tl">merged</text><text x="975" y="278" text-anchor="middle" class="tl">window</text><text x="975" y="291" text-anchor="middle" class="tl">over</text><text x="908" y="374" text-anchor="start" class="tl">regression</text><text x="386" y="392" text-anchor="end" class="tl">sorted out</text><text x="405" y="430" text-anchor="middle" class="tl">cancel</text><text x="112" y="362" text-anchor="end" class="tl">for a human</text><text x="196" y="352" text-anchor="start" class="tl">won't do</text><text x="880" y="488" class="tl" text-anchor="middle">the cause becomes a new work item in New</text></svg></div>

<p class="sl"><span class="dot" style="background:#be123c"></span>waits for the Operator, at most 3 work items at once<span class="dot" style="background:#4f46e5"></span>an agent works<span class="dot" style="background:#c2410c"></span>a human, outside the pipeline<span class="dot" style="background:#475569"></span>finished · 9. Learn only adds work items in New</p>

<div class="fine">The state lives in the tracker: a <code>state:…</code> label in GitHub, a status in Jira. Transitions and the tracker mapping: <code>docs/states.md</code>. <b>Draft, awaiting approval.</b></div>

---

# Cross-cutting parts

<div class="dg"><likec4-view view-id="platform" color-scheme="light" browser="true" class="view-wide"></likec4-view><span class="hint">⤢ Click the diagram to explore: zoom, pan, open any stage</span></div>


---
layout: default
---

# Decisions

<div class="small">

| # | Question | Decision |
|---|---|---|
| 1 | Where the main human gates sit | On the spec and plan, before code. Merge by risk class |
| 2 | How heavy the spec is | By work item size. The agent always reads the code and plans; size decides what is written down and what the Operator approves. S: straight to code; M: spec and plan; L: plus a codebase research document |
| 3 | What to look at before merge | Evidence: check output, screenshots, video. Code only for risky changes |
| 4 | Where the pipeline hub is | The tracker: spec, agent sessions and PRs link to the work item number |
| 5 | Tracker | Two from day one: GitHub Issues and Jira, behind a common "work items" layer; each tool is an adapter |
| 6 | How to merge by risk | R0 merges itself on green checks and AI review; R1 the Operator merges on evidence; R2 the Operator reads the code. Revised 2026-11-20: R0 is decided by the auto-merge rules file at merge, not by the agent (decision 25) |
| 7 | Who sets size and risk | The agent proposes with a reason; the Operator corrects when accepting the work item |
| 8 | When a change goes to production | Every merge deploys main right away, R0, R1 and R2 alike; R2 is approved at the Merge gate, where "merge" means "deploy now". Revised 2026-11-20 (decision 26) |
| 9 | How many work items in parallel | At most N (start with 3) wait for the Operator at once; beyond that new ones do not start |
| 10 | Which repositories first | Personal and work ones at once |
| 11 | How the pipeline talks to the Operator | By universal presentation rules: decision type sets the depth, a real before/after case is mandatory, "not verified" on top, form chosen by the task. Recommendation first for small decisions, after the facts for big ones |
| 12 | Where the Operator works with the pipeline | Claude Desktop for now |
| 13 | Language | Everything in the project in English: model, docs, deck, research |
| 14 | Specs and decisions store | Holds per work item spec, plan and research, and per project decision records (ADR). Interviewer and Planner read past decisions; Implementer reads the plan; AI review reads the spec |
| 15 | Fix rounds before Blocked | At most 3 rounds of fix after red checks, then the work item is Blocked and waits for the Operator |
| 16 | Several agents on one work item | One fresh Implementer session per slice. Each slice is a sub-issue of the work item with "blocked by" links; the Orchestrator works the frontier (slices whose blockers are done) and runs frontier slices with no shared files in parallel, each in its own sandbox. It merges slice branches; a conflict goes back to the Implementer. Revised 2026-11-20: slices moved from the plan document to tracker sub-issues; a sandbox per parallel slice instead of a worktree (Stripe, Ramp: worktrees do not scale) |
| 17 | What Triage does before sizing | Works it out alone from the request, alerts, logs and code; never asks people. Checks duplicates, that the behaviour is not already built, and the register of rejected requests; reproduces a bug; writes down assumptions where something stays unclear. Proposes an outcome: for the agent, for a human, won't do. The Operator decides at Accept. Revised 2026-11-20: "needs info" (questions to the requester) removed by decision 19 |
| 19 | Who resolves ambiguity | Agents resolve it themselves from the sources they can read (request, alerts, logs, code, past decisions), write down their assumptions and go on. People are reached only at the gates, where the Operator sees the assumptions and can correct them. One exception: the Interviewer in Spec asks the Operator about business choices, few and short, by the presentation rules (format still open) |
| 20 | Who writes code and tests, and how they stay honest | One agent, the Implementer, is the only one that changes code: per slice it writes unit tests first, then code, in its own sandbox. What "done" means lives in one place: the acceptance criteria of the spec, each with 2–3 key examples. After CI (outside the sandbox) a separate Validator with a fresh context and its own sandbox checks those criteria on the running app, records evidence for the PR and never edits code. Revised 2026-11-20: no separate scenarios (first hidden, then visible); Evidence merged into the Validator |
| 21 | Sandbox rules | A disposable sandbox per agent session; everything that changes or runs code runs inside. Network closed by default; push only through a proxy to one branch; no merge rights; the authoritative CI runs outside |
| 22 | How AI review is built | One AI reviewer agent: fresh context, own sandbox, a different model family than the Implementer. It reads the PR, evidence, spec and surrounding code, re-checks each finding (by running the code where it can), skips style and nits by a "what not to flag" list, gives a JSON verdict and for R1/R2 explains the change to the Operator. All fix rounds share one limit of 3; a block verdict or the limit sends the work item to Blocked |
| 23 | Order of checks after the code | CI → AI reviewer (white-box, stage 5 "Checks & review") → Validator (black-box, stage 6 "Acceptance"). The Validator does not see the reviewer's verdict. After any fix, the reviewer reviews only the new diff and the Validator re-checks the criteria the fix touched |
| 24 | How a PR lands | Through a merge queue: the PR is rebuilt on the latest main with the PRs ahead and the full CI runs again; approvals stay valid while the PR's own diff is unchanged; a red build or a conflict ejects it to the Implementer, and after a conflict fix the changed part goes through checks, review and acceptance again. At the gate the Operator sees the scope first (files outside the plan, new dependencies, size), then the explanation and evidence, for R2 the code; "changes" with a comment goes back to the Implementer and does not count toward the 3 automatic rounds |
| 25 | When a change merges without the Operator (R0) | Only when a rules file in the repo matches all facts: allowed paths and change types (docs, tests, dev tools, patch updates), size limit, no new dependencies, never-zones untouched (migrations, auth, payments, CI config), all checks green, working hours. Kill switch: a change type whose merged changes are reverted more than 5% over 30 days loses auto-merge until the rules change. The agent's R0 is only a forecast |
| 26 | How a deploy is watched and rolled back | Deploy goes to all users at once, one merge at a time. The Watcher agent watches each deploy for a window (30 min by default): first what the PR changed (errors from the changed code, the business numbers it touches), then the whole service. On a clear regression it rolls back by itself, then reports to the Operator and sends a work item with evidence to Triage; when unsure it asks. More than 2 unneeded rollbacks in 30 days: it asks before rolling back. Migrations ship expand–contract and are never rolled back automatically |
| 27 | How the pipeline learns | A weekly Retro agent reads corrections and failures (Operator changes and edits, Blocked items, fix rounds, reviewer findings, Validator failures, rollbacks, traces); what repeated twice becomes a work item for Triage with the cases and the file to change. A rule that must hold becomes a check with a fix hint; guidance becomes an instruction line; guidance broken again becomes a check. Rules unused for 8 weeks are proposed for removal; root instructions ≤150 lines. Instruction and rules files never R0; weakening a check is R2. Weekly summary of six metrics to the Operator |
| 18 | How to check the model for gaps | After the deck walkthrough, every stage answers five questions: what triggers it, what it reads and writes, what it triggers next, where a human re-enters, what stops two runs doing the same work |

</div>


---

# Open questions

1. **Engine** to build the pipeline on: our own on top of an existing one, or an existing one only if it fits completely.
2. **Work item states** — draft, awaiting approval.
3. **Measurement on real work items:** Operator time, share done without manual help, rollbacks, $ per change.
4. **Deep dives** on the key research topics: verification the agent cannot reach, catching false "done", agent rights in the sandbox.

<div class="muted">Model, research and this deck live in one repository. The deck is built from the model with <code>npm run deck:gen</code>.</div>
