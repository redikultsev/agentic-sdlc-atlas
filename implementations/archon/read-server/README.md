# Pipeline state, read-only: an MCP server

A small MCP server that answers questions about the pipeline's state in Archon and can change nothing (decision 63 in `../../../docs/decisions.md`; element "Read surface" in `../../../model/engine.c4`). For the Operator now, for the Supervisor (decision 62) later. It is not a workflow and does not ship as part of the pack's runs; it lives next to the pack because it reads the documents the pack writes.

TypeScript run by Bun, stdio transport, no dependencies: the protocol subset is `initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call` and JSON-RPC errors, the other side of the pack's own client (`../.shared/mcp.ts`).

## Tools

Every tool takes `project` (a project key such as `owner/repo`, a codebase name or id) and is annotated `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`. Each returns a one-line text, the JSON as text, and the same JSON as structured content.

| Tool | Reads | Answers |
|---|---|---|
| `overview` | `work/`, `holds/`, `releases/`, `findings/`, `releases-line`; the attention queue | items by state (set aside, urgent), what waits for a person, holds held and queued, the release line, the latest release, the findings buffer size |
| `item` | `work/<key>`, `provenance/<key>`; Archon's item read | one item: the engine's document, its provenance record, its runs with spend, queued starts, open questions, answers and rulings, links, the install hold |
| `holds_and_releases` | `holds/`, `releases-line`, `releases/`, `release-gates/` | every hold with holder, queue, returning items and build; the line; releases newest first with each environment's status and gates (`limit`, default 10) |
| `findings` | `findings/` | the buffer oldest first, counts per item and role (`limit`, default 30) |
| `run` | `archon workflow get <run-id> --json --verbose` | one run: status, outcome, pack digest, per node the state, kind, requested and resolved model, cost (null when not reported, never zero), duration, fan-out children |
| `attention` | `GET /api/runs/attention` | what waits for a person, by kind; answers are given in the console, never here |

## What it calls, and nothing else

- Archon's CLI with a fixed argv and no shell: `state get <name> --project <p>`, `state list --prefix <prefix> --values --project <p>`, `workflow get <run-id> --json --verbose`. Names are built by the server: an item key is parsed by `../.shared/item.ts` (`#12` → `work/12`, `PROJ-123` → `work/PROJ-123`), prefixes come from a fixed list (`work/`, `holds/`, `releases/`, `release-gates/`, `findings/`). `--project` is always passed: without it the CLI resolves the project from the working directory and may register it. A read that comes back in install scope is refused.
- Archon's HTTP server, GET only, no redirects followed: `/api/items?project=&key=` and `/api/runs/attention?project=`.
- Both seams check every argv and every route against the allowlist before they run. No tool takes a path, a command, a prefix or a document name. A bad argument, a refused read, a failed read, a timeout or an output over the cap is a tool error with a message; the server keeps running.

## Run it

Client config (Claude Code `.mcp.json`, Claude Desktop, or any MCP client that starts a stdio server):

```json
{
  "mcpServers": {
    "pipeline-read": {
      "command": "bun",
      "args": ["<checkout>/implementations/archon/read-server/server.ts"],
      "env": {
        "ARCHON_READ_URL": "http://127.0.0.1:3090",
        "ARCHON_READ_USER": "${ARCHON_READ_USER}"
      }
    }
  }
}
```

Environment (all optional; values are read from the environment only and never written to a file or a message):

| Variable | Default | Meaning |
|---|---|---|
| `ARCHON_READ_URL` | unset | Archon's server. Unset: `attention` and the item read are off and say so; the state reads still work |
| `ARCHON_READ_USER` | unset | Value of the trusted identity header, when web auth is on behind a proxy |
| `ARCHON_READ_USER_HEADER` | `X-Archon-User` | The header's name, if the install changed it (`ARCHON_WEB_AUTH_HEADER`) |
| `ARCHON_READ_COOKIE` | unset | A session cookie (`name=value`), instead of the header |
| `ARCHON_READ_CLI` | `["archon"]` | The CLI argv as a JSON array, e.g. `["bun", "<archon>/packages/cli/src/cli.ts"]` |
| `ARCHON_READ_CWD` | the system temp directory | Working directory of the CLI calls: a directory with no project files, so the CLI loads no project `.env` |
| `ARCHON_READ_TIMEOUT_MS` | `20000` | Deadline of one tool call, all its reads together |
| `ARCHON_READ_MAX_BYTES` | `60000` | Cap on a tool's JSON; past it the longest lists are halved and the output says what was cut |
| `ARCHON_READ_RAW_BYTES` | `16777216` | Cap on one command's output or one HTTP body |

The CLI children do not inherit `ARCHON_READ_*`, `WORKFLOW_ID` or `ARCHON_NODE_EXECUTION`.

Tests: from `implementations/archon`, `bun test --preload ./tests/archon-script.stub.ts tests` (`tests/read-server.test.ts` against fake seams, `tests/read-server.e2e.test.ts` over stdio with the pack's client, a stand-in `archon` and a local HTTP server).

## The honest limit

Archon has no HTTP read of its state store and no read-only role (research note `../../../research/atlas/research/2026-11-read-only-state-surface.md`). Until it does, the CLI calls run as the local operator, who can approve, cancel and write state; the allowlist in this server is the only fence for them. So:

- Deploy it where the agent that uses it cannot reach a shell or the `archon` binary itself; the agent gets this server's tools and nothing else.
- For HTTP, give it an identity that only reads where the install allows that, and no write credential of any kind.
- `readOnlyHint` is a hint to the client; the guarantee is that the server has no write path, not the annotation.

Asked upstream: an HTTP read of the state store (`GET` state routes) and a read-only role in Archon. When both exist, the CLI part goes away and the fence moves into the engine.

Not verified: anything against a live Archon. The shapes are from Archon's documentation and source at the pinned commit; `workflow get` by full id from a directory with no project, and the attention route's response shape, were not run.
