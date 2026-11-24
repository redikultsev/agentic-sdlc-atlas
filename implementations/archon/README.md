# Unify SDLC: the Archon implementation

The pipeline described in `../../model/`, `../../docs/decisions.md` and `../../docs/states.md`, built as an Archon workflow pack. The plan and the order of work: `../../docs/build-plan.md`.

Install on an Archon server: `archon plugin add redikultsev/agentic-sdlc-atlas/implementations/archon@unify-sdlc-vX.Y.Z`; update with `archon plugin update`. Workflows run as `redikultsev/unify-sdlc:<workflow>`. Check: `archon workflow run redikultsev/unify-sdlc:unify-ping`.

Tests, from this folder, with Bun and an Archon checkout at the pinned commit (`deploy/compose.yml`):

- Shared modules: `bun test --preload ./tests/archon-script.stub.ts tests`. The preload is an in-memory `archon:script` (state store with revisions, a tracker of labelled issues); no engine is needed.
- Every workflow's stub fixtures: copy this folder (without `deploy/` and `tests/`) into a scratch project's `.archon/workflows/unify-sdlc/` and run `bun <archon>/packages/cli/src/cli.ts workflow test unify-sdlc` there.
