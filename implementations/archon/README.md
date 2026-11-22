# agentic-pipeline: the Archon implementation

The pipeline described in `../../model/`, `../../docs/decisions.md` and `../../docs/states.md`, built as an Archon workflow pack. The plan and the order of work: `../../docs/build-plan.md`.

Install and update on the Archon server: pull the server's clone of this repository at `$ARCHON_HOME/src/agentic-sdlc-atlas` and copy this folder to `$ARCHON_HOME/workflows/agentic-pipeline/` (`archon plugin add` cannot install from a private repository). Check with `archon validate workflows` and `archon workflow run pipeline-ping`.
