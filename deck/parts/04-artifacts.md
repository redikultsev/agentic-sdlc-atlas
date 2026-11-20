---

# What moves and where it lives

<div class="chain">
  <span>Signal</span><i>→</i><span class="k">Work item</span><i>→</i><span>Spec · plan</span><i>→</i><span class="k">Change set</span><i>→</i><span>Checks</span><i>→</i><span>Review · merge</span><i>→</i><span class="k">Deployment</span><i>→</i><span>Incident</span><i>↺</i>
</div>

<div class="st">
  <div class="st-cell"><likec4-view view-id="storeTracker" color-scheme="light" class="sv"></likec4-view><p class="tool">{{tech:tracker}}</p><p><b>The hub.</b> Number, size, risk, state. Everything links to the number.</p></div>
  <div class="st-cell"><likec4-view view-id="storeDocs" color-scheme="light" class="sv"></likec4-view><p class="tool">{{tech:docs}}</p><p>What "done" means and how we get there.</p></div>
  <div class="st-cell"><likec4-view view-id="storeChanges" color-scheme="light" class="sv"></likec4-view><p class="tool">{{tech:changes}}</p><p>The code change, its reviews and verdicts.</p></div>
  <div class="st-cell"><likec4-view view-id="storeCi" color-scheme="light" class="sv"></likec4-view><p class="tool">{{tech:ci}}</p><p>Test, lint and build output tied to the commit.</p></div>
  <div class="st-cell"><likec4-view view-id="storeReleases" color-scheme="light" class="sv"></likec4-view><p class="tool">{{tech:releases}}</p><p>Which version runs where and how the rollout ended.</p></div>
  <div class="st-cell"><likec4-view view-id="storeProd" color-scheme="light" class="sv"></likec4-view><p class="tool">{{tech:prod}}</p><p>Errors and incidents here start new work items.</p></div>
</div>

<details class="fine"><summary>Names</summary>Artifact names follow the CDEvents standard (CD Foundation): ticket, change, build, release, incident. The tool under each block is today's choice; the pipeline talks to it through an adapter.</details>
