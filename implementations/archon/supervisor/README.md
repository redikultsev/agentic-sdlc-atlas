# The Supervisor in Archon's chat

The Operator's interface to the pipeline (decisions 62, 65 and 66 in `../../../docs/decisions.md`; element "Supervisor" in `../../../model/engine.c4`): Archon's own console chat, on the Claude provider, bound to a folder of its own. The Operator writes in it as themselves. It reads through the read server (`../read-server/`), explains and recommends, files the Operator's new requests through the request server (`../request-server/`, decision 66), and drafts the rest; every answer, start and change stays the Operator's click in the console.

| File here | Installed in the Supervisor's folder as | What it does |
|---|---|---|
| `instructions.md` | `CLAUDE.md` | The Supervisor's instructions |
| `mcp.json` | `.mcp.json` | Registers the read server and the request server for the chat |
| `settings.json` | `.claude/settings.json` | Deny rules: the shell, files, web, subagents, Archon's four chat tools |
| the block below | `.archon/config.yaml` | Claude loads the folder's settings only, not the server user's `~/.claude/` |

```yaml
# .archon/config.yaml in the Supervisor's folder. Archon loads it for a chat bound to the
# folder and passes settingSources to the Claude Agent SDK: `project` alone loads the
# folder's CLAUDE.md, .mcp.json and .claude/settings.json and leaves out ~/.claude/.
assistants:
  claude:
    settingSources:
      - project
```

It is a block here, not a file: Archon's discovery reads a YAML file in a workflows directory as a workflow, and the fixture runs copy the pack into one.

## What was verified, and where

Read on 2026-11-25 in Archon's source at the pinned commit (`f9d1d2b`, [github.com/coleam00/Archon](https://github.com/coleam00/Archon)) and in Anthropic's Agent SDK documentation. Nothing here ran in a live Archon chat.

- **Working directory.** A chat bound to a project runs in the conversation's working-directory override if one is set, else the project's registered path; a chat with no project runs in `~/.archon/workspaces` (or `$ARCHON_HOME/workspaces`) (`resolveChatCwd` in `packages/core/src/orchestrator/orchestrator-agent.ts`; `ensureArchonWorkspacesPath` in `packages/paths/src/home-paths.ts`). The console's chat is per project (`/console/p/:projectId/chat`, `packages/docs-web/src/content/docs/adapters/web.md`). A local folder registers in place (`/register-project --folder "<name>" <path>`, `reference/commands.md`, `reference/troubleshooting.md`). Project clones and worktrees live under `~/.archon/workspaces/<owner>/<repo>/` (`reference/cli.md`), so the projectless chat's directory is a parent of every checkout: instructions there would reach agents that run below it. Hence a folder of its own, outside `~/.archon/workspaces` and outside any checkout.
- **Instructions and settings.** A chat turn passes Archon's own prompt as an `append` to Claude Code's preset system prompt and sets `settingSources` from the assistant config, default `['project', 'user']` (`buildBaseClaudeOptions` in `packages/providers/src/claude/provider.ts`; `resolveSettingSources` in `packages/providers/src/claude/config.ts`). `project` loads `CLAUDE.md` and `.claude/` at the working directory, `user` the server user's `~/.claude/` (`reference/configuration.md`, "Claude settingSources"). The chat reads its config with the project's `.archon/config.yaml` merged in (`loadConfig(workflowCwd)` in `packages/core/src/orchestrator/chat-context.ts`), and a repository's config may override `settingSources` (`reference/configuration.md`). Workflow nodes use the same sources, so a `~/.claude/CLAUDE.md` would reach every agent node of the pack: the instructions go in the folder, never there.
- **MCP servers.** A chat turn sets no node config (only the effort of a model preset, `packages/core/src/orchestrator/chat-request.ts`), so neither `mcp:` nor `strictMcpConfig` applies; the only server Archon passes is its own native tool server, `archon` (`registerNativeTools` in `provider.ts`; `ARCHON_TOOL_SERVER` in `packages/providers/src/claude/native-tools.ts`). Workflow nodes, by contrast, are strict and get no ambient servers (`guides/mcp-servers.md`). The Agent SDK loads `.mcp.json` at the project root when the `project` source is on (Anthropic, Agent SDK "Connect to external tools with MCP"), and in Agent SDK sessions it loads project servers without the approval prompt (Claude Code "MCP", project scope). User-scope servers in `~/.claude.json` load in every project of that user.
- **Tools and permissions.** Archon runs Claude in `bypassPermissions` with no tool filter in chat: the agent has the shell, files and web as the server's user (`provider.ts`; `reference/security.md`, "Permission Model"). Every chat gets the native tools `invoke_workflow`, `register_project`, `report_workflow_no_match` and `attention`, and a project's chat also `manage_run`, all acting as the person who wrote (`attachNativeTools` in `orchestrator-agent.ts`). `invoke_workflow` starts any workflow Archon finds on any registered project (`packages/core/src/orchestrator/chat-tools.ts`). Deny rules in a settings file the SDK loads are applied before the permission mode, also in `bypassPermissions` (Anthropic, Agent SDK "Configure permissions"); they are the only control here that is not a prompt.
- **Answer surfaces.** Archon records the surface of every answer: `attention_tool` (`packages/core/src/orchestrator/attention-tool.ts`), `manage_run` (`manage-run-tool.ts`), `api` for the console and HTTP (`packages/server/src/routes/api.run-gates.ts`), `cli`, or a chat platform's id (`packages/workflows/src/schemas/record-surface.ts`; `reference/cli.md`). The item read carries it as `via` on every attention and gate answer (`itemAnswerSchema` in `packages/workflows/src/item-read.ts`; `ItemRead` in `packages/script-api/src/archon-script.d.ts`), so `item()` and `items()` in a script see it. The attention route `GET /api/runs/attention` does not filter by caller; reads stay open to any identity (`api.run-attention.ts`; `reference/security.md`, "Who can act on a run").

## Install on the Archon server

1. Make the folder, outside `~/.archon/workspaces` and outside every checkout, owned by the server's user (as `appuser` in the container), for example `~/supervisor`. No parent of it may hold a `CLAUDE.md`. Copy the three files and the config block to the names in the table above. In `CLAUDE.md` replace `<console-url>` with the console's address; in `.mcp.json` replace `<pack>` (twice) with the path of the installed pack (`implementations/archon` of the tag `archon plugin add` installed).
2. Register the folder: in any Archon chat, `/register-project --folder "supervisor" <absolute path of the folder>`. It holds no workflows and Archon starts no runs in it.
3. The read server's identity. Its CLI reads run as the server's user, the local operator, through the allowlist (decision 63); the chat's agent reaches nothing of that but the six read tools, since the shell is denied. For HTTP give it a member identity of its own, never the Operator's: set `ARCHON_READ_USER` in the server's environment to that user's trusted-header value (`../read-server/README.md`). Reads are open to members; a member answers no run it did not start.
4. The request server's token and projects (decision 66; `../request-server/README.md`). In the server's environment, never in a file: `REQUEST_GITHUB_TOKEN`, a fine-grained token of an account of its own that is on no project's trusted list, limited to the allowlisted repositories with the Issues permission (read and write) and nothing else; `REQUEST_PROJECTS`, the projects it may file in with each one's `intake_label` as the project's pack settings name it (`{"owner/repo": {"intake_label": "pipeline"}}`); optionally `REQUEST_DAILY_CAP` (default 10). The account needs the triage role on each repository so its intake label sticks. Without these the tool answers that it is not set up and the Supervisor drafts instead.
5. Use it: open `/console/p/<supervisor project id>/chat` and start a new chat. The chat's provider must be Claude: the Operator's personal default provider (Settings, "Just me") is Claude or unset. Ask "what waits for me in `<owner>/<repo>`?": the answer must come from `pipeline-read` tools, and asking it to approve an item must end in a link, with the denied tool named if it tried. Ask it to file a small request: it must confirm the project, title and gist first, file once, and repeat the number and link.
6. Keep the chat's working directory on the folder: start no workflow from this chat. If one ever moved it, `/setproject supervisor` binds it back.

## The honest limit

The engine does not stop this chat from answering a gate (decision 65). The Operator writes as an admin; Archon's chat acts as whoever writes; its native tools cannot be removed by Archon's settings. What holds instead:

- Its instructions: no gate answer, release, adoption of a difference, cancellation or bulk act; explain, recommend, link.
- The deny rules, which the agent runtime applies before the bypass mode. They hold only on the Claude provider, only in a chat bound to this folder while its working directory stays here, and only for the tools they name: a tool a later Claude Code adds is allowed until it is listed. The Operator can change them; the chat's agent cannot, since its one write tool files issues and it has no file or shell tool. Every other chat of the Operator, in a project or with none, has every native tool and the shell.
- After the fact: an answer given through `attention_tool` or `manage_run` is recorded as such, and the Retro's weekly summary counts gate answers given through a chat tool, with their items. An answer typed into a shell is recorded as `cli`, like the Operator's own, which is why the shell is denied.

What the deny rules cost: the Supervisor changes nothing itself but file a request through the request server's one tool (decision 66), which can create an issue in an allowlisted project and nothing else; that server's token sits in the server's environment, which every agent session on the server inherits (`../request-server/README.md`, "The honest limit"). A rule change is a draft the Operator submits; the findings pass is the Operator's fire of its binding; marking urgent after Accept, reordering, pausing and resuming have no route from the chat. Archon's own read tools are denied with them, since each also answers; the read server covers the same reads.

Asked upstream: a way to remove Archon's native chat tools per chat or per user.

Not verified: a live chat. To check on the server: the folder's `CLAUDE.md` reaches the chat; `.mcp.json` connects `pipeline-read` and `pipeline-request` (the init message lists their tools) and expands the `${...}` values from the server's environment; a denied tool is refused under `bypassPermissions`; `settingSources: [project]` from the folder's `.archon/config.yaml` reaches the chat.
