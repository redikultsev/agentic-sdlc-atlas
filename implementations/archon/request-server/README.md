# Filing a request: an MCP server with one tool

A small MCP server through which the Supervisor files the Operator's new request as an issue in a project's tracker (decision 66 in `../../../docs/decisions.md`; element "Supervisor" in `../../../model/engine.c4`). The Supervisor's folder registers it for Archon's chat (`../supervisor/`). It is not a workflow and no run starts it. The pipeline then takes the issue like any request: the poll, the trust check, Triage, the Operator's Accept gate.

TypeScript run by Bun, stdio transport, no dependencies. The protocol code is shared with the read server (`../.shared/mcp-serve.ts`); the read server stays read-only (decision 63), so this tool lives in a server of its own with a credential of its own.

## The tool

`file_request`, annotated `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`.

| Input | Rule |
|---|---|
| `project` | required; `owner/name`, one of `REQUEST_PROJECTS` (case does not matter; the allowlist's spelling is used) |
| `title` | required; one line, at most 200 characters |
| `body` | required; the Operator's request in the Supervisor's words, Markdown, at most 20,000 characters |
| `urgent` | optional; the Operator's reason, one line, at most 500 characters; only recorded in the body: the Accept gate decides urgency |

Any other argument (`labels`, `repo`, `assignees`, ...) is refused. Control characters (other than line feed and tab) and direction overrides are refused; an HTML comment in the input is shown as text (`&lt;!--`), so only the server writes hidden markers.

It returns a one-line text (`Filed owner/repo#57: <link>` or `Already filed as owner/repo#57: <link>. Nothing new was filed.`) and JSON: `project`, `number`, `url`, `title`, `filed`, `alreadyFiled`, `author` (the token's account), `labels`, `digest`, `filedToday`, `dailyCap`, `next` (what the pipeline does with it). The Supervisor repeats the project, number and link (decision 62).

## What one call does

1. Refuses a project outside the allowlist, and one whose tracker is a map (`"tracker": "map"`: `.pipeline/tracker.yaml`, Jira through MCP): not supported yet, since the pack's map adapter runs inside the engine and needs its state store for its write keys and queue (decision 47). Nothing is sent to the code host for either.
2. Reads the token's account (`GET /user`, once per process) and the repository (`GET /repos/{owner}/{name}`); issues turned off is a refusal.
3. Lists the issues that account opened in the repository in the last 24 hours (`creator=<account>&state=all`, newest first, at most 500).
4. **Idempotency.** The issue's last line is a hidden marker, `<!-- unify-sdlc-request:supervisor:<digest> -->`, where the digest is the first 16 hex of SHA-256 over the project, title, body and urgency (trimmed, line ends normalised). An issue in that list whose last line carries the same digest is answered as already filed, open or closed. Calls in one process run one at a time, so two identical calls at once make one issue.
5. **The daily cap** (`REQUEST_DAILY_CAP`, default 10, per project): the issues in that list with the marker opened since 00:00 UTC. At the cap the call is refused; a retry of a request already filed is still answered.
6. Creates the issue (`POST /repos/{owner}/{name}/issues`) with the title, the body plus a footer ("Filed by the Supervisor on the Operator's word in the chat", the urgency when asked) and the marker, and the project's `intake_label` as its only label when the project has one.
7. **Reads it back** (`GET .../issues/{n}`): the title, the marker's digest and the author must match. GitHub drops labels at create for an account without push access; the server then adds the label (`POST .../issues/{n}/labels`) and reads again. A label that still is not there is an error that names the issue: the poll will not take it until the Operator adds the label.

A timeout (`REQUEST_TIMEOUT_MS`) or a failure after the create says so; calling again with the same text finds the issue by its marker and files nothing twice.

## The label, and what the pack does with the issue

The label is the pack setting `intake_label`, the one `unify-poll` filters on, copied per project into `REQUEST_PROJECTS` (the pack reads it from the project's `.archon/packs/<pack>.yaml`, which this server cannot read with an Issues-only token). Empty or absent: no label, and the poll takes every new issue. A `pipeline:` or `state:` label is refused as an intake label. The server sets no other label: whether the issue came from the Supervisor is the marker's to say.

The issue's author is the token's account. It is not on any project's trusted list (decision 39): the text is the Operator's word relayed by a model, so the Operator reads it on the issue before any agent does. What the pack does with it, unchanged: the poll takes it like any new request (people's requests first, decision 60); `unify-triage`'s `trust` node finds an untrusted author and no approval, labels it `pipeline:needs-approval`, comments, and the run ends; the poll passes over it until the Operator sets `pipeline:approved`, which pins the approval to that body's digest; then Triage runs and the item waits in TriageReview for the Accept gate. So it is never dropped, and it costs the Operator one label before Triage. Putting the account on the trusted list would skip that label, and the only check left on the model's text before an agent reads it would be the confirmation in the chat.

## Run it

Client config (the Supervisor's `.mcp.json`, `../supervisor/mcp.json`):

```json
{
  "mcpServers": {
    "pipeline-request": {
      "command": "bun",
      "args": ["<pack>/request-server/server.ts"],
      "env": {
        "REQUEST_GITHUB_TOKEN": "${REQUEST_GITHUB_TOKEN}",
        "REQUEST_PROJECTS": "${REQUEST_PROJECTS}",
        "REQUEST_DAILY_CAP": "${REQUEST_DAILY_CAP:-10}"
      }
    }
  }
}
```

Environment (read from the environment only; never written to a file or a message):

| Variable | Default | Meaning |
|---|---|---|
| `REQUEST_GITHUB_TOKEN` | unset | A fine-grained personal access token of an account of its own (not the Operator's, not the pipeline's `pipeline_login`, on no trusted list), with access to the allowlisted repositories only and one permission, Issues: read and write (Metadata: read comes with it). Unset: every call answers that the server has no token |
| `REQUEST_PROJECTS` | unset | The allowlist, JSON: `{"owner/repo": {"intake_label": "pipeline"}, "owner/other": {}, "owner/jira-one": {"tracker": "map"}}`. Keys per project: `intake_label` (the project's pack setting), `tracker` (`issues`, the default, or `map` for a project with `.pipeline/tracker.yaml`, which is refused). Kept in step with the projects' settings by whoever deploys |
| `REQUEST_GITHUB_API` | `https://api.github.com` | The API root; GitHub Enterprise Server: `https://<host>/api/v3`. https only (http on the loopback address for tests) |
| `REQUEST_DAILY_CAP` | `10` | Requests per project per UTC day, 1 to 100 |
| `REQUEST_TIMEOUT_MS` | `20000` | Deadline of one call |

The account needs the triage role (or higher) on each repository, so the intake label can be set; with the read role GitHub drops it and the call fails after filing, naming the issue. A setting that is missing or wrong does not stop the server: every call answers with the reason, and the Supervisor drafts the request instead.

Tests: from `implementations/archon`, `bun test --preload ./tests/archon-script.stub.ts tests` (`tests/request-server.test.ts` against a fake GitHub behind the HTTP seam, `tests/request-server.e2e.test.ts` over stdio with the pack's client and the fake served on the loopback address).

## The honest limit

- The token sits in the Archon server's environment, because the chat's `.mcp.json` takes it from there; every agent session on that server inherits the same environment, so an agent with a shell could read it. It is narrower than the forge credential the pack already holds there: it can file, edit, label and close issues in the allowlisted repositories, as an untrusted author whose labels and approvals the pack does not count. Running this server as its own user or service, reached over HTTP, would keep it from the agents; not built.
- The cap and the idempotency are counted from the code host, as this account's issues with the marker: an issue someone deletes stops counting, and two server processes filing the same text in the same instant could both create (calls are serialised per process only).
- The tracker kind is configuration: a project that adds `.pipeline/tracker.yaml` must be marked `map` here, or the server files in its code host's issues, which the pipeline then does not read.
- The day is UTC.

Not verified: anything against GitHub itself. The REST shapes (labels dropped without push access, `creator` filter, `has_issues`) are from GitHub's documentation, not a live call.
