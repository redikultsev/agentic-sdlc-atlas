# Status

Where the project stands and what comes next. Update it at the end of every working session.

## Now (2026-11-20)

**Deck walkthrough with the owner, slide by slide: finished 2026-11-21.** Slides 1–14 are reviewed. The "life of one work item" slide was removed (it repeated the overview, slide 5 and the states). Slides 15 (states, decision 28) and 16 (cross-cutting, decisions 29–30) reviewed. The decisions slide was removed: the log lives in `docs/decisions.md`, each decision shows on its stage slide. The open questions slide was removed too: plans live here, not in the deck. **The walkthrough is finished.** The model was audited against decisions 1–30 and the five-question check (decision 18) on 2026-11-21: every decision is in the element cards; the check found overlapping deploy windows (decision 26 revised) and engine files in work repositories (decision 10 revised).

How a slide is reviewed: show it, explain in plain words what each part does, list gaps found in the model, propose before → after. When the owner doubts a design choice, run a research swarm (three or four parallel agents, each with its own angle, web through fetchira), save the synthesis to `research/atlas/research/`, then propose. After a decision: write it into the affected elements (the model is the spec), `docs/decisions.md`, glossary and states; regenerate; check in the browser at 1280×760; commit and push.

Run both views from the repository root:

```bash
./node_modules/.bin/likec4 start . --port 4721                       # interactive diagrams
./node_modules/.bin/slidev deck/slides.md --port 4720 --open false   # the deck
```

`npm run deck:gen` regenerates `deck/slides.md` and the web components after any model change. Slidev does not reload `likec4-views.js` by itself: refresh the browser tab.

## What the walkthrough changed (decisions 14–30)

- **Intake:** Triage works alone from request, alerts, logs and code, never asks people; checks duplicates, already built, rejected before, reproduces bugs; writes assumptions; outcomes for agent / for a human / won't do. Requests from people and from Learn enter through Triage. States: no NeedsInfo; ForHuman added.
- **Ambiguity (19):** agents resolve it themselves and write assumptions; people only at gates. Exception: the Interviewer asks the Operator business questions.
- **Spec:** acceptance criteria with 2–3 key examples each; no separate scenarios (20).
- **Plan:** slices are tracker sub-issues with "blocked by"; the Orchestrator works the frontier; independent slices run in parallel, each in its own sandbox (16). The Specs, plans and decisions store also holds ADRs, rejected requests and the auto-merge rules (14).
- **Implement:** the Implementer is the only agent that changes code: per slice unit tests first, then code, in its sandbox (20). A sandbox per agent session, network closed, push through a proxy, no merge rights (21).
- **5. Checks & review:** CI outside the sandbox, then one AI reviewer (fresh context, other model family, re-checks findings, "what not to flag" list, verdict pass / fix / block, explanation for R1/R2) (22, 23).
- **6. Acceptance:** the Validator, blind to the review verdict, checks the criteria on the running app as a user and records evidence (20, 23).
- **Fix rounds:** one shared limit of 3 per work item (CI, review, acceptance); after that or on block → Blocked and a decision request (15, 22).
- **7. Merge:** an auto-merge rules file decides R0 by facts, with a kill switch on the revert rate (25); the Operator's gate shows scope first, "changes" goes back without spending the 3 rounds; merge queue on the latest main (24).
- **8. Deploy & watch:** every merge deploys main to everyone at once, as soon as it lands; one Watcher per deploy, windows overlap; a regression on one PR reverts that PR; no gate after merge, R2 is approved at the Merge gate (8 revised). The Watcher agent watches what the PR changed for a window, rolls back by itself, reports to the Operator, sends a work item to Triage; asks when unsure; migrations expand–contract, never auto-rolled back (26). DeployReview state removed.
- **9. Learn:** the Adopt gate is gone; a weekly Retro reads corrections and failures, sends rule and check work items to Triage, proposes removing unused rules, sends a weekly summary of seven metrics; instruction files never R0, weakening a check R2 (27).
- **States (28):** 15 states named by who holds the item (-ing = agent, Review = Operator), one UML state machine slide in swimlanes Operator · Agents · Closed, generated with a check against `docs/states.md`.
- **Cross-cutting (29, 30):** the Orchestrator starts every agent session, moves states only along `docs/states.md`, stops a session at its time or cost limit (counts as a failed round); the Operator can pause the pipeline. Sandbox per agent session; every session writes traces; Decision requests is the only channel to the Operator. Slide in the stage format: `platformDeck` view plus four cards.
- **Arrows:** data flows along the arrow; dashed = writes into a store, dotted = reads from a store.
- Change sets renamed Pull requests.

Research from the walkthrough: `research/atlas/research/2026-11-*.md` (roles and sandboxes, criteria vs scenarios, AI code review, review vs validation order, merge, deploy and watch, learn, Pocock's skills).

## Known gaps

1. Manual layouts: the overview (`tools/layout_index.mjs`) and the deck views in `tools/layout_deck.py` (`LAYOUTS`: plan, verify, aiReview, implement, merge, deploy, learn, platform; `BYPASS` draws an edge that skips a block as an arc). After a model change: `likec4 export json -o <file> .`, then `python3 tools/layout_deck.py <file>`; if a snap drifts, delete `.likec4/<view>.likec4.snap` first. The overview: if its links change, add an exclude in `views.c4` or rebuild with `node tools/layout_index.mjs`.
2. Element ids lag behind renamed stages: `engine.verify` is "5. Checks & review", `engine.aiReview` is "6. Acceptance".
3. PDF export of the deck with web components is not verified.
4. No target numbers for the pipeline metrics yet.
5. The repository is public since 2026-11-22, after a scan of files and history for personal data and secrets (gitleaks: none). Keep it so: nothing personal (AGENTS.md rule 5).
6. How the Interviewer asks the Operator business questions (few, short, no walls of text) is not designed yet.

## Engine research (2026-11-21)

323 candidates read, the 12 strongest re-checked by two skeptics each: [research/atlas/research/2026-11-engine-choice.md](../research/atlas/research/2026-11-engine-choice.md), all candidates in [2026-11-engine-candidates.md](../research/atlas/research/2026-11-engine-candidates.md). Finding: no finished engine runs the pipeline; the gaps are all Orchestrator logic (15 states mirrored to tracker labels, shared fix limit, limit hit as a failed round, slice frontier, pause, cap of 3 waiting).

**Re-check the same day** under the new constraints: our own server, the Operator works only in the engine's web UI, extend an existing engine. See [2026-11-engine-base.md](../research/atlas/research/2026-11-engine-base.md) and the per-engine reports in `research/atlas/research/engine-base/`. Six engines read in depth, four awesome lists parsed, 13 new candidates read.
- Recommended base: **Archon** (7/10), extended through packs and plugins. Runner-up: **cezar** (6/10).
- Head to head on 10 dimensions: [2026-11-cezar-vs-archon.md](../research/atlas/research/2026-11-cezar-vs-archon.md). cezar wins the UI and project health; Archon wins extensibility, the sandbox seam, code structure, operations and direction. Trackers connect as MCP servers (decision 5, revised).
- Our own layer in any case: a sandbox (OpenSandbox or Matchlock), a push proxy, tracker sync (15 states as labels; any tracker through MCP), the item rules, and Watcher and Retro as workflows.
- The earlier "own Orchestrator on Temporal" is replaced by this.
- Trial log (breaks, surprises, workarounds, what they mean for our pack): [2026-11-archon-trial-log.md](../research/atlas/research/2026-11-archon-trial-log.md).

## Archon's pack against our model (2026-11-22)

Archon's bundled SDLC pack read in full and compared stage by stage: [2026-11-archon-pipelines-vs-ours.md](../research/atlas/research/2026-11-archon-pipelines-vs-ours.md). It covers intake, plan (partly), implement, review and merge; nothing for spec, black-box acceptance, deploy, watch and learn. Weaker than our design where it merges a PR behind main on its old CI, trusts the agent's own validation under `ci: none`, lets an agent decide R0, and has no sandbox. The owner went through its 16 ideas one by one: taken as decisions 31–43 and a revision of 29 (discoveries to Triage, the Operator's rulings, verdicts tied to the diff, bug root cause in Triage, people's review threads, three review rules, scope in fix rounds, typed decision requests and the follow rate, trusted authors, manual switches per stage, stub tests of the pipeline, calibrated judges, stuck items, idle and unknown-cost limits). Not taken: a red main freezing the merge queue; a re-check before each paid round.

## The pack (2026-11-22–23)

Unify SDLC, the Archon implementation, is written: `implementations/archon/`, spec `implementations/archon/SPEC.md` (two design-review passes, 49 findings decided). Eleven workflows, shared modules for states, the item document, rulings, decision requests, trust, policy, fingerprints and chaining; 84 stub fixtures pass; installed on the trial server at `unify-sdlc-v0.2.0` and every workflow validates there. Nothing has run live yet.

Before the first live run: the project's `.pipeline/` files (base, check, trusted authors, auto-merge rules) in the trial repository; the binding files (`archon pack bindings`) and the two timers; Codex credentials for the cross-family reviewer; the owner's call on a fine-grained token for the trial repository (SPEC "Known gaps"); `pipeline-ping` green on the server.

## A second project: what does not fit yet (2026-11-24)

The owner wants the same pipeline on a second, larger project, and the model to stay engine- and project-neutral while it adapts. The second project, described without names: about 60 service repositories on GitHub; work items in Jira with a fixed workflow; builds and deploys through a CI server (TeamCity) from git tags, a few services through helm; one shared test stand in Kubernetes; a human tester approves a change on the stand before it merges into `develop`; a release tag then goes to production; smoke test after each deploy; rollback deploys the previous tag. An upstream analysis pipeline there already turns production data into work items.

Problems, in the order they are worked. Each one ends as decisions in `docs/decisions.md`, the model, and the pack.

1. **Tracker seam.** The model already treats Work items as a store reached through an adapter (decision 5), but the pack writes GitHub Issues directly: about 85 calls in 36 files (state labels, marked comments, sub-issues, blocked-by, registers, trust). The second project's tracker is Jira while its code is on GitHub, so the tracker and the code host (forge) must be two seams, not one. Jira states are workflow statuses with required fields on transitions and no shortcuts. Research: `research/atlas/research/2026-11-tracker-seam.md`.
2. **Deploy seam.** The model has one deploy shape: every merge deploys main to everyone, rollback is a revert PR (decisions 8, 26). The second project needs environments in a row (a shared pre-merge test stand, then production), a lock on the shared stand, a human tester gate before merge, release by tag, a CI-server or helm deploy, a smoke check per environment, rollback by redeploying the previous version, and a hotfix path when the stand runs something newer than production. Research: `research/atlas/research/2026-11-deploy-seam.md`.
3. **Human roles.** The model has one human, the Operator. The second project adds a tester (gate on the test stand) and several people who may answer gates.
4. **Many repositories.** One work item may need changes in two or three repositories; the pack assumes one repository per project.
5. **Branch model.** Integration branch `develop` plus release branch `master`, tags `YYYYMMDD.N`; the pack assumes one base that deploys.
6. **Upstream work items.** The existing analysis pipeline and its executor agents overlap stages 4–7 and Learn; they must feed Triage as a signal source, not run beside the engine.
7. **Cross-family reviewer.** Whether code may go to a second model provider is a policy question per project; until then, `review_family: same-allowed`.
8. **Where the engine runs.** It must reach the tracker, the CI server and the cluster inside a private network.
9. **Toolchain per repository.** Heavy base checks and test data fetched separately (DVC) must run on the engine host.

**Decided 2026-11-24 (decisions 45–54; revisions of 5, 8, 9, 16, 25, 26, 28, 29, 30, 32, 39, 44).** A first draft the same day (an agent acting on the project's tools through MCP, a second agent checking it, approvals bound to "the git tree", one gate for tester and code) was reviewed top-down and bottom-up by two independent critics and replaced: about 60 findings, the three that broke the logic were trust resting on a model that reads untrusted text, a tree check that no release with two items could pass, and no state between merge and release. The owner went through eleven points one by one. The model, the states, the glossary and the deck follow; **the pack does not follow yet.**

- **State (45).** The engine holds the truth: state, rounds, verdicts, slices, approvals, holds, registers, the approved request text. The tracker shows it. Any difference is one request to the Operator per item, outside the waiting cap; no automatic rules until the follow rate shows which answers repeat.
- **Tools (46, 47).** Engine code calls the project's MCP servers by a project map; long actions are recipe scripts in the project; a setup agent composes the map; no model takes part in a write or a read. Writes are idempotent by the engine's own record, read back by key, serialised per item; a tool failure is never a fix round; the pipeline has its own service account.
- **Deploys (48).** Seven concepts; environments per service, of a kind (shared, ephemeral, production), with checks and a rollback; no environment at all is allowed. Release is its own step and state, Releasing.
- **Approval on an environment (49).** Bound to the tree of the candidate (the base with the item merged in); a difference after the merge is a request that shows insignificant paths apart.
- **Gates (50).** The Merge gate by risk first, then the environment, then TestReview only where a project declares a person's gate there; outside the cap. No tester: a green smoke check merges.
- **Hold (51).** A record in the engine per environment and service, a queue, released on merge or on "changes"; a foreign build is a request; several items in one build is a project setting.
- **Rollback of a release (52).** Previous version at once; the culprit is reverted and RolledBack, the rest return to Releasing; the line is blocked until the revert is in.
- **Urgent (53).** A mark, not a path: first in every queue and a release right after the merge.
- **Loss of the store (54).** Backup; else adoption from the labels with approvals absent and rounds used up.

17 states now: TestReview and Releasing are new (`docs/states.md`).

**Next for the pack (step 1 done).** `implementations/archon/SPEC.md` describes the pack as built, before these decisions.
1. ~~Probe: can an Archon script call an MCP server directly?~~ Done 2026-11-24: not through the engine, so the pack has its own client, `.shared/mcp.ts`, run against a real Jira MCP server under Bun (`research/atlas/research/2026-11-mcp-from-script.md`).
2. Item identity: a tracker-neutral key (`PROJ-123` or `#12`) instead of `{repo, number}`; the item's document (`work/<key>`) holds the state; `states.ts` moves it there and adds the two states.
3. `.shared/connector.ts`: the project map, the write rules of decision 47, the install check; it replaces the direct `forge('workitem.*')` and `gh api` calls in 36 files. Stub fixtures for a refused write, a difference with the tracker, an outage (decision 41). PR bodies say "Part of #n".
4. `.pipeline/project.yaml`: `environments:` (kind, before or after merge, checks, gate and answerers, rollback, paths, insignificant paths, batch) and the release trigger, replacing `deploy.hook`; `unify-merge` gets the environment queue, the hold and TestReview; `unify-deploy` becomes release, deploy by recipe, the tree check and the rollback of decision 52.
5. The setup agent as a workflow (`unify-setup`): compose the map, probe it on one test item.
6. Probe the second project's Jira through its MCP server with a hand-written map: label, a transition with a required field, a comment, read back, the creator field.

**Decided 2026-11-24, later the same day (decisions 55–62; revisions of 20, 26, 31, 48, 53).** Two talks on software factories were read against the model (`research/atlas/research/2026-11-two-talks.md`) and the owner went through eight ideas one by one; for the last one a research swarm of four reports was run (`research/atlas/research/2026-11-supervisor-agent.md`). In the model, the glossary and the deck; **nothing of it is in the pack.**

- **Scouts (55).** Scheduled read-only agents that look for work and file findings with evidence; 2 untriaged findings per scout at most; people's requests first; an outside system files as a trusted author.
- **Code health (56).** Weekly measures by a script, each change's contribution at the Merge gate, the reviewer proposes verifiable removals, a scout for the worst spot. No gate.
- **Hard to reverse (57).** No new gate: the Accept request shows the irreversible part when R2 is forecast; spec and plan requests list such decisions first.
- **Red before green (58).** The Implementer runs each new test before the code and keeps the failing output; the reviewer reads it; required for the test of a bug fix. No separate script and no second run.
- **Provenance (59).** What built and checked an item, one line at the Merge gate.
- **Findings buffer (60).** Findings wait in the engine; Triage makes one request per cause, daily or when the Operator says.
- **Toggles (61).** An optional first rollback.
- **Supervisor (62).** One chat agent as the Operator's interface: reads and reversible commands free; gate answers and irreversible commands are the Operator's signature, a control the engine draws; rules and its own limits only by PR. Precondition: the engine's write routes check who calls.

Order for the pack, after the six steps above: the provenance record and red records (cheap, inside existing workflows); the findings buffer; a read-only surface of the pipeline state; caller identity on write routes; then the Supervisor and scouts.

**Still open:** one work item across several repositories; the code-host seam for a host the engine does not speak; the move Blocked → Planning missing from `docs/states.md`; pre-existing edges in the model that show the rejected-requests register in the Specs store (decision 44 puts it elsewhere). On the deck, stage slides draw data flows to the stores, not the connector that carries them; the engine slide shows the connector.

## Next

1. The owner chose Archon (2026-11-21). Archon 0.14.0 runs on the trial server: Postgres, login by allowed email, telemetry off, reachable only over the VPN. Next: the Claude and GitHub tokens, then one real issue from intake to a merged PR; the sandbox as a provider plugin comes after that.
2. The owner's choice of the base; then the engine spec on that base and a design review.
