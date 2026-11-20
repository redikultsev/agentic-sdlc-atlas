# Agentic development pipeline

Everything on the topic in one place: how the pipeline works, why it was decided that way, the research behind it, and a deck to present it.

## What is where

| Path | What | How to view |
|---|---|---|
| `model/` | The pipeline model in [LikeC4](https://likec4.dev): stages, parts, links, stores, life of a work item. Source of every diagram | `npm run dev` — interactive diagrams with drill-down |
| `docs/decisions.md` | Decisions: what, what was rejected, why | — |
| `docs/states.md` | Work item states and transitions, mapped to GitHub Issues and Jira | — |
| `deck/` | The deck for walkthroughs and colleagues. `deck/slides.md` is **generated** from the model and `docs/`; do not edit it, edit `deck/parts/` | `npm run deck:dev` |
| `research/atlas/` | The atlas: what is known about each stage (964 candidates, 30 areas) and raw research data | `research/atlas/README.md` |
| `GLOSSARY.md` | Terms: stages, size and risk, stores | — |

## Keeping it current

One change, one source:
- the design changed → `model/*.c4`;
- a decision changed → `docs/decisions.md`;
- states changed → `docs/states.md`;
- intro slide text → `deck/parts/`.

Then:

```bash
npm run deck:gen   # check the model, export diagram images, regenerate slides.md
```

and commit together with the regenerated files.

The overview (`index` view) has a hand-tuned layout in `.likec4/index.likec4.snap`, produced by `tools/layout_index.mjs`: Operator on top, stages in one row, stores below, smooth centre-anchored curves that do not cross. If the overview's elements or links change, LikeC4 reports layout drift: delete the snap, nudge any block in `npm run dev` → Edit (this writes a fresh snap), then run `node tools/layout_index.mjs`. `npm run build` also builds static sites into `dist/`.

Draft v1. Part status: built · planned · idea.
