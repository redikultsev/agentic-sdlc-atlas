# Can an Archon script call an MCP server?

Date: 2026-11-24. The first step of "Next for the pack" in `docs/STATUS.md`, for decision 46 (engine code calls the project's MCP servers by a project map). Archon read at the commit the trial server runs, `f9d1d2b` (`coleam00/Archon`, `dev`).

## Answer

Not through the engine: the script API has no MCP function. Yes through the script itself: a script is an ordinary Bun process, so the pack speaks MCP with its own small client, `implementations/archon/.shared/mcp.ts` (stdio and streamable HTTP, no dependencies). It was run against a fake server and a real Jira MCP server under Bun with the same flags the engine uses.

## What the code says (Archon `f9d1d2b`)

- `archon:script` exports `input`, `runId`, `artifactsDir`, `packDir`, `emit`, `refuse`, `forge`, `state`, `outcomes`, `item`, `items`, `notice`, `trigger` and nothing for MCP (`packages/script-api/src/archon-script.d.ts`).
- MCP servers in Archon are given to agent nodes only: providers load an MCP config file and the engine scopes a node's tools by server name (`packages/provider-contract/src/mcp-config.ts`).
- A Bun script runs as `bun --no-env-file run --preload=<file> <script>`; the preload registers the one virtual module `archon:script`, and "nothing else the script imports resolves differently" (`packages/workflows/src/script-invocation.ts`, `packages/workflows/src/script-api/preload.ts`).
- The script's environment is Archon's own bag (`env:` in the project's config and the run's variables); on a host run the host environment is added, into a container only the bag goes (`packages/workflows/src/dag/nodes/exec/script.ts`, `scriptEnvironment`). A token an MCP server needs reaches the script through `env:` of the Archon config.
- `deps:` is ignored for Bun, which installs imported packages at run time (`packages/workflows/src/validator/scripts.ts`). The pack does not rely on it: the client has no dependencies, so a server without access to the npm registry runs it too.
- The pack's scripts already start processes themselves (`Bun.spawnSync` for `git`, `gh`, `archon` in `.shared/git.ts`, `.shared/github.ts`, `.shared/host.ts`), so a child process from a script is proven on the trial server.

## What was run (2026-11-24, Windows, Node 24.22.0 and Bun 1.4.5)

Under Bun with a preload that registers `archon:script`, the same flags as the engine:

| Case | Result |
|---|---|
| Fake stdio server: initialize, tools list over two pages, a call | Data returned, JSON parsed |
| A stray log line on the server's stdout | Ignored |
| The tool reports an error (`isError`) | `kind: tool` with the tool's text |
| Unknown tool (JSON-RPC error) | `kind: protocol` |
| The server dies mid-session, and a call after it | `kind: transport`, every pending and later call |
| A server command that does not exist | `kind: transport` |
| HTTP server not reachable | `kind: transport` |
| Real server: the Atlassian MCP image (`mcp-atlassian` 2.14.5) run over stdio, Jira host unreachable on purpose | Handshake and 49 tools listed; a read returned `kind: tool`, "Could not connect to Jira" |

## Findings for the connector (ours)

1. **Every tool of that server declares an output schema that only wraps a string** (`{ result: string }`, `x-fastmcp-wrap-result`) and puts the JSON inside as text. The client unwraps it. The 2026-11 tracker-seam note said neither Jira server documents structured output; for this one it is declared and useless as a schema, so read-back still parses JSON text.
2. **An outage comes back as a tool error.** "Could not connect" and a refused write ("field is required") are both `isError` replies. Decision 47 treats them differently (an outage is a retry, a refusal is a difference request), so the project map has to say how a refusal is recognised, or the connector treats any tool error as an outage until a read shows the item unchanged.
3. **Where servers run on the trial server.** There is no Docker inside the Archon container (trial log, entry 19), but the image has `uv`/`uvx`, Node and npm (`implementations/archon/deploy/compose.yml`, Archon's `Dockerfile`). A stdio server runs as `uvx <server>` or `npx <server>` from the script, or as a sidecar container in the compose reached over HTTP. A sidecar keeps the server's version pinned by the compose file and out of the run.
4. **One session per script run.** The client starts a stdio server per session; starting `uvx` costs seconds, so a script opens one session and makes all its calls in it (`withSession`).

## Not verified

- A run inside the Archon container on the trial server (the local run used the same Bun flags, not the image).
- A write against a real Jira, the creator field, a transition with a required field: step 6 of "Next for the pack".
- Streamable HTTP against a real server; only the unreachable case was run.
