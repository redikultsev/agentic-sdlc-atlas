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
5. The repository is private on GitHub; making it public needs the owner's decision and a scan for personal data.
6. How the Interviewer asks the Operator business questions (few, short, no walls of text) is not designed yet.

## Engine research (2026-11-21)

323 candidates read, the 12 strongest re-checked by two skeptics each: [research/atlas/research/2026-11-engine-choice.md](../research/atlas/research/2026-11-engine-choice.md), all candidates in [2026-11-engine-candidates.md](../research/atlas/research/2026-11-engine-candidates.md). Finding: no finished engine runs the pipeline; the gaps are all Orchestrator logic (15 states mirrored to tracker labels, shared fix limit, limit hit as a failed round, slice frontier, pause, cap of 3 waiting).

**Re-check the same day** under the new constraints: our own server, the Operator works only in the engine's web UI, extend an existing engine. See [2026-11-engine-base.md](../research/atlas/research/2026-11-engine-base.md) and the per-engine reports in `research/atlas/research/engine-base/`. Six engines read in depth, four awesome lists parsed, 13 new candidates read.
- Recommended base: **Archon** (7/10), extended through packs and plugins. Runner-up: **cezar** (6/10).
- Head to head on 10 dimensions: [2026-11-cezar-vs-archon.md](../research/atlas/research/2026-11-cezar-vs-archon.md). cezar wins the UI and project health; Archon wins extensibility, the sandbox seam, code structure, operations and direction. Trackers connect as MCP servers (decision 5, revised).
- Our own layer in any case: a sandbox (OpenSandbox or Matchlock), a push proxy, tracker sync (15 states as labels; any tracker through MCP), the item rules, and Watcher and Retro as workflows.
- The earlier "own Orchestrator on Temporal" is replaced by this.
- Trial log (breaks, surprises, workarounds, what they mean for our pack): [2026-11-archon-trial-log.md](../research/atlas/research/2026-11-archon-trial-log.md).

## Next

1. The owner chose Archon (2026-11-21). Archon 0.14.0 runs on the trial server: Postgres, login by allowed email, telemetry off, reachable only over the VPN. Next: the Claude and GitHub tokens, then one real issue from intake to a merged PR; the sandbox as a provider plugin comes after that.
2. The owner's choice of the base; then the engine spec on that base and a design review.
