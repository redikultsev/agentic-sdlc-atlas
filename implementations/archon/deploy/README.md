# Running Unify SDLC on a server

`compose.yml` is the Archon server the pack runs on: Archon's dev build at a pinned commit, plus the toolchain the projects' checks need (uv, Node, pnpm, gitleaks), a throwaway PostgreSQL for tests, a merge guard for agent shells (`gh`, `git`), and a timer loop (Archon has no timer on Linux).

## Set up

1. Deploy `compose.yml` (Dokploy compose or plain `docker compose`) with the secrets named at its top. Keep the console on a private network.
2. In the container, as `appuser`: `archon plugin add redikultsev/agentic-sdlc-atlas/implementations/archon@<unify-sdlc tag>`.
3. Register the project (`archon` console or CLI), clone it, and add to its default branch: `.pipeline/project.yaml`, `.pipeline/trusted.json`, `.archon/packs/redikultsev.unify-sdlc.yaml`, model aliases in `.archon/config.yaml`. The trial repository's versions are a working example (see `../SPEC.md`, "Settings and setup per project").
4. `archon trigger whoami`, then `archon pack bindings redikultsev.unify-sdlc --repo github.com/<owner>/<repo> --host archon-server --run-as <id> --cwd <checkout> --out /.archon/bindings`. The timer loop fires the files with a schedule; the server (`ARCHON_TRIGGER_HOST=archon-server`) starts the chained stages.
5. `archon workflow run redikultsev/unify-sdlc:unify-ping --input repo_host=github.com --input repo_path=<owner>/<repo>` and fix what it reports.
6. Label an issue with the pack setting `intake_label` (or start one by hand: `archon workflow run redikultsev/unify-sdlc:unify-triage --input number=<n> --item issue-<n>`). Gates appear in the console's attention list.
