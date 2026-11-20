# Status

Where the project stands and what comes next. Update it at the end of every working session.

## Now (2026-11-20)

**Deck walkthrough with the owner, slide by slide.** Slides 1–5 are accepted; stage slides 6–14 got a new template; continue reviewing from slide 6 ("What moves and where it lives"). For each slide: show it, say what it claims and what could be better, collect corrections, apply them to the source, regenerate, check in the browser, commit.

Run both views from the repository root:

```bash
npx likec4 start . --port 4721           # interactive diagrams
npx slidev deck/slides.md --port 4720    # the deck
```

Deck (20 slides): 1 title · 2 how to read · 3 whole pipeline · 4 what moves and where it lives · 5 size and risk · 6–14 the nine stages · 15 life of one work item · 16–17 work item states · 18 cross-cutting parts · 19 decisions · 20 open questions.

## Done

- Nine-stage model in LikeC4, stage views, life of a work item, status view.
- Decisions 1–13 in `docs/decisions.md`.
- Deck generated from the model; diagrams embedded as vector LikeC4 web components with a click-to-explore hint.
- Legend as an even grid of real LikeC4 blocks.
- Overview with a hand-tuned layout: Operator on top, stages in a row, stores below, smooth centre-anchored curves, no crossings.
- Palette: Tailwind 700 via `likec4.config.json`, title contrast ≥ 5:1; dark stages, light stores.
- Design rules in `deck/DESIGN.md`.
- Atlas and research merged into `research/`.

## Known gaps

1. Stage slides (6–14) use compact deck views (`model/deck-views.c4`, descriptions hidden). Wide stages (3. Plan) still render small.
2. Manual layouts: the overview (`tools/layout_index.mjs`) and the Plan deck view (`tools/layout_deck.py`, grid in `LAYOUTS`). For a deck view: export JSON, run `python3 tools/layout_deck.py <export.json>`.
   Only the overview had a manual layout before. If its elements or links change, LikeC4 reports layout drift: delete `.likec4/index.likec4.snap`, nudge any block in the editor (Edit), run `node tools/layout_index.mjs`.
3. PDF export of the deck with web components is not verified.
4. `docs/states.md` is a draft the owner has not reviewed yet (slides 16–17).
5. No target numbers for the pipeline metrics yet.
6. The repository is local only; publishing needs the owner's decision and a scan for personal data.

## Next

1. Finish the walkthrough (slides 4–20) and apply corrections.
2. Approve the work item states.
3. Research and choose the engine to build the pipeline on.
4. Deep dives: verification the agent cannot reach, catching false "done", agent rights in the sandbox, cost of human review, admitting and retiring rules by measurement.
5. Measure on real work items; then the engine spec and a design review.
