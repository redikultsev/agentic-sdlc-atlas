# Status

Where the project stands and what comes next. Update it at the end of every working session.

## Now (2026-11-20)

**Deck walkthrough with the owner, slide by slide.** Slides 1–14 are reviewed. The "life of one work item" slide was removed (it repeated the overview, slide 5 and the states). Slides 15 (states, decision 28) and 16 (cross-cutting, decisions 29–30) reviewed. Continue from slide 17 (decisions), then 18 (open questions).

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
- **8. Deploy & watch:** every merge deploys main to everyone at once, one merge at a time; no gate after merge, R2 is approved at the Merge gate (8 revised). The Watcher agent watches what the PR changed for a window, rolls back by itself, reports to the Operator, sends a work item to Triage; asks when unsure; migrations expand–contract, never auto-rolled back (26). DeployReview state removed.
- **9. Learn:** the Adopt gate is gone; a weekly Retro reads corrections and failures, sends rule and check work items to Triage, proposes removing unused rules, sends a weekly summary of six metrics; instruction files never R0, weakening a check R2 (27).
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
7. Not every decision is written into the element cards yet; audit decisions 1–30 against the model (the model is the implementation spec, AGENTS.md rule 8).

## Next

1. Finish the walkthrough (slides 17–18) and apply corrections.
2. Audit the model against decisions 1–30; run the five-question check (decision 18) over every stage.
3. Research and choose the engine to build the pipeline on.
4. Measure on real work items; then the engine spec and a design review.
