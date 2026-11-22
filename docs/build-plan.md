# Building the pipeline on Archon

How the model (`model/*.c4`, `docs/decisions.md`, `docs/states.md`) becomes a running pipeline. The model stays the spec; each engine gets its implementation under `implementations/<engine>/` in this repository, starting with `implementations/archon/`. Agreed with the owner 2026-11-22.

Sources: what Archon gives and where it falls short, `research/atlas/research/engine-base/h2h-archon.md` §3–§4 and §10; Archon's own SDLC pack against our model, `research/atlas/research/2026-11-archon-pipelines-vs-ours.md`; the trial, `research/atlas/research/2026-11-archon-trial-log.md`.

## Shape

- **One pack, our own.** An Archon workflow pack (`kind: workflow-pack`) in `implementations/archon/`, installed with `archon plugin add <owner>/agentic-sdlc-atlas/implementations/archon@<tag>` (install from a private repository: to verify in step 1). One workflow per stage, as in the model. Archon's bundled SDLC pack is not forked: its stages differ from ours (no spec or plan gates, agent-decided merge, review before CI). Its proven helpers are copied with the MIT notice where they fit: forge reads and writes with read-back, labels written as a delta, remote URL normalisation, typed node outputs.
- **Agents judge, scripts act.** Every public write (labels, comments, pushes, merges) is a script node that acts on a typed agent verdict and reads the result back. Prompts never write to the tracker or git.
- **One policy module** (`.shared/policy.ts`) holds the cross-cutting rules every stage uses at its first and last node: state labels (decision 28), the shared round counter (15), verdicts tied to the diff fingerprint (33), rulings (32), decision requests (38), the waiting cap (9), session limits (29), manual switches (40).
- **Gates are `wait: attention` nodes** with typed options. Archon's direction moves gates to item asks answered after the run; one workflow per stage keeps that later move local to each gate.
- **Tests on stubs from the first commit** (decision 41): every transition in `docs/states.md` has a fixture run with stubbed agent verdicts.
- **Trackers through MCP** (decision 5); GitHub Issues first because Archon's forge already speaks it.

## Order

The whole pipeline is built: all nine stages, the cross-cutting rules and the sandbox. The order only decides what runs live first, so that failures of different stages do not pile up in one first run.

1. **Write the whole pack** with stub tests for every transition (decision 41): stages 1–9 as workflows, `policy.ts`, decision requests, state labels.
2. **Live runs, shortest route first** on Retinue (the owner's choice, 2026-11-22): an S item (Triage → Accept → Implementer → CI → AI review → Merge gate → merged). Then M and L through spec and plan with slices, then acceptance with evidence, merge by rules on the latest main, deploy and watch with rollback, the weekly Retro.
3. **Sandbox in parallel:** provider plugin `claude-vm` / `codex-vm` (microVM, no GitHub token, egress allowlist, wall clock), push proxy, a separate merge credential. On before the pipeline touches any work repository.
4. **Console patch** (pause and hold, a board of the 15 states, image evidence, asks), proposed upstream.

Until the sandbox lands, agents run in Archon worktrees on the host behind the git and gh merge guard already deployed in the trial, on Retinue only. Retinue's own red tests and a second developer merging every 20–40 minutes will mix with the pipeline's failures: each live run notes which is which in the trial log.
