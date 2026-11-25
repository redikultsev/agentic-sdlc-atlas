# Building our own platform: which foundation, and what it takes

Research date: 2026-11-26. Every external fact was read on 2026-11-26 from the URL next to it. Star counts and release tags come from `gh api repos/<r>` and `gh api repos/<r>/releases/latest`; npm versions come from `npm view`. Facts about our own code were read the same day from `implementations/archon/` (SPEC.md, `.shared/*.ts`). The yardstick is `2026-11-platform-requirements.md` (M1–M10, S1–S7). The earlier recommendation is `2026-11-engine-choice.md` (2026-11-21). "Not verified" means no primary source confirmed the point.

## Answer

1. **Build on Temporal (MIT) with a TypeScript worker, Postgres, and a decision UI of our own in React.** It is still the strongest foundation, for four reasons:
   - It is the only candidate that validates a human answer before recording it (Update validators).
   - Server, SDK and UI are all MIT, and no server code is enterprise-only.
   - It has pluggable JWT/OIDC auth in the open-source edition.
   - It is the most mature: v1.32.2 (2026-11-02), and TS SDK v1.27.0 (2026-11-25).

   No candidate renders a human step that we can make into our own card. Every one either ships no human UI or ships fixed forms. So the decision UI is ours whichever engine we pick, and the engine should be chosen for its waits, durability, licence and auth.
2. **Runner-up for a lighter stack: Vercel Workflow SDK on its Postgres world.**
   - It is Apache-2.0 TypeScript with `defineHook({schema})` validation, and needs only a Node app and one Postgres.
   - Against it: it is young (2,534 stars) and the Postgres world is a "reference implementation" without auth.
   - Hatchet (MIT, tenants with OWNER/ADMIN/MEMBER/VIEWER) is the alternative if we want built-in team auth on the engine. It is still 0.x.
3. **Cards are generated from the decision request JSON we already build** (`.shared/request.ts`). Each card is drawn from a catalog of React components we own: markdown with GFM tables, mermaid, small charts, folded evidence, and options with their effects. Answers go in place, as a Temporal Update. A2UI's catalog idea and AG-UI's interrupt contract are designs to copy, not dependencies we need.
4. **Effort to reach parity with what runs on Archon today: about 18 engineer-weeks** for one engineer with AI coding agents. The range is 14–24 weeks. The riskiest parts are:
   - porting 13 workflows and their fixture tests to Temporal code without losing the idempotency rules;
   - the session runner's limits and usage-limit pause, which Archon gives us today;
   - the decision UI with identity checks on every answer.

   The sandbox with a push proxy and multi-repo items are not in Archon either. They add 4–6 weeks beyond parity.

## Foundations compared

Scores: H (human step: 0 = nothing, 1 = API only, 2 = fixed forms, 3 = any component of ours); W (durable waits: 0–3); A (team auth in the free self-host edition: 0–3).

| Foundation | Durable waits and signals | Human step and cards | Team auth, free self-host | Self-host licence | Maturity | H/W/A |
|---|---|---|---|---|---|---|
| **Temporal** | Signals, Queries, Updates with validators, `condition(fn, timeout)`, durable `sleep`; timers to 100 years; history cap 51,200 events / 50 MB, so long items need Continue-As-New | Web UI can send a Signal or Update with one JSON argument (ops only); no human-task UI; our UI calls the client API | Authorizer and ClaimMapper plugins, default JWT ClaimMapper reading `permissions`; allows all requests if none is configured; Web UI OIDC; namespaces | MIT for server, TS SDK and UI | 24,599 stars, v1.32.2 (2026-11-02); sdk-typescript v1.27.0 (2026-11-25); ui v2.58.1 (2026-11-06) | 1/3/2 |
| DBOS Transact | `send`/`recv(topic,{timeout})`, `setEvent`/`getEvent` (default 60 s timeout), streams, durable `sleep`; no answer validation | none; completed via the DBOS Client or `dbos.send_message` SQL; Conductor API has no send endpoint | library has none; Conductor has OIDC but is proprietary | Transact MIT; Conductor proprietary, production needs a paid key and calls home | ts 1,453 stars, v5.7 (2026-11-24); py 1,703, 3.7.0 | 1/2/0 |
| Inngest | `step.waitForEvent` with `match` or CEL `if`, returns null on timeout | none; complete by POSTing an event to `/e/<key>` | event and signing keys; dashboard auth not documented | server SSPL 1.0, each release turns Apache-2.0 after 3 years; inngest-js Apache-2.0 per package.json (GitHub detects GPL-3.0) | 6,074 stars, v1.53.0 (2026-11-12) | 1/2/0 |
| Trigger.dev v4 | `wait.createToken({timeout, idempotencyKey})`, `wait.forToken`; never expires without a timeout; no schema validation | none, but completion over HTTP is first-class: token `url`, or browser call with `publicAccessToken`; `useRealtimeRun`/`useRealtimeStream` hooks | magic link, GitHub OAuth, `WHITELISTED_EMAILS`; RBAC not verified | Apache-2.0 | 16,821 stars, v4.8.10 (2026-11-23) | 1/3/1 |
| Hatchet | durable tasks: `ctx.sleepFor`, `ctx.waitForEvent(key, cel, ...)`, or-groups of sleep and event | none; events via SDK or webhooks | Basic auth, Google/GitHub OAuth, domains, tenants, invites, roles OWNER/ADMIN/MEMBER/VIEWER | MIT | 8,347 stars, v0.120.24 (2026-11-23), still 0.x | 1/2/2 |
| Restate | awakeables (`resolveAwakeable`), workflow durable promises, `orTimeout()`; awaiting in an exclusive Virtual Object handler blocks the object | none (introspection UI only); HTTP `POST /restate/awakeables/{id}/resolve` | none in self-host "by design"; proxy in front; auth is Cloud only | server BUSL-1.1 (bans only a public Restate platform service; Apache-2.0 after 4 years); SDK MIT | 4,745 stars, v1.8.1 (2026-10-21) | 1/3/0 |
| Vercel Workflow SDK | `createHook`/`defineHook({schema})` validates before resume; `createWebhook().url`; `resumeHook(token, payload)`; timeout by racing `sleep` | none; `@workflow/web` is observability without auth | none; Postgres world ships without auth, its flow route must be blocked at ingress | Apache-2.0 | 2,534 stars, `workflow@5.8.0` (2026-11-24) | 1/3/0 |
| Cloudflare Workflows / Agents SDK | `step.waitForEvent` 1 s to 365 days (default 24 h), `sendEvent`; Agents `waitForApproval()` | none; `PendingApprovals` is sample code taking `approvedBy` unverified | none | workerd Apache-2.0; Workflows in workerd only with `--experimental` | agents 6,142 stars, 0.34.1 (2026-11-25); workerd 9,264 | 1/2 (1 self-hosted)/0 |
| Mastra | `suspend()` with `suspendSchema`/`resumeSchema`, `run.resume`, HTTP `/api/workflows/:id/resume`; no timeout documented | Studio shows graphs and traces, no resume form documented; custom cards through CopilotKit/AG-UI | `server.auth` with any provider is free; RBAC, FGA and Studio sign-in need the EE key | Apache-2.0 except `ee/` (source-available, no production use) | 29,817 stars, `@mastra/core@1.86.0` (2026-11-25) | 3 via CopilotKit/2/1 |
| Microsoft Agent Framework | `RequestPort` / `ctx.request_info` with responses routed by type; checkpoints (InMemory, File, Cosmos) | DevUI is "a sample app… not intended for production" | none | MIT for the Go repo; the main repo is 404 | PyPI 1.26.0 (2026-11-12); no TypeScript | 1/1/0 |
| LangGraph / Agent Server | `interrupt()`, `Command({resume})`, waits indefinitely, Zod `responseSchema` validates (JS); node re-runs from its start | generative UI (`push_ui_message`, `LoadExternalComponent`) gives our own React; Agent Inbox and Agent Chat UI archived | custom `@auth` handlers; standalone server unauthenticated by default | library MIT; self-hosted Agent Server needs an Enterprise plan and licence key, calls beacon.langchain.com | langgraph 45,419 stars | 3/2/1 (paid) |
| Windmill | "Suspend until approval/resume", `getResumeUrls()`, N approvers, step timeout | markdown description; approval forms are Cloud/EE; full-code React apps; "custom React components" EE | CE: SSO at most 10 users, 50 users in total, 4 groups; audit logs and git sync are EE | AGPLv3 plus proprietary EE; CE images include proprietary code | 18,721 stars, v1.884.1 (2026-11-25) | 2/2/1 |
| Prefect 3 | `pause_flow_run` (in process, default 1 h), `suspend_flow_run` (durable, needs deployment), `wait_for_input` with pydantic `RunInput` | auto form from JSON schema, markdown description; no custom components | Basic Auth string only; SSO and RBAC Cloud only | Apache-2.0 | 24,242 stars, 3.9.5 (2026-11-24); Python only | 2/2/0 |
| n8n | Wait node (time, webhook `$execution.resumeUrl`, form); durable after 65 s; AI tool "Human review" | Form node with fixed fields and CSS; HTML field forbids `<script>`, `<style>`, `<input>` | SSO, projects, git are paid | Sustainable Use License: internal business use only; `.ee.` files licensed | 212,122 stars, n8n@2.49.6 (2026-11-25) | 2/2/0 |
| Kestra | `Pause` with `pauseDuration`, `onResume` typed inputs, `POST /executions/{id}/resume` | Apps (fixed blocks: markdown, resume form, buttons) are EE only | OSS: one shared Basic Auth account; SSO, RBAC, tenants EE | Apache-2.0 core plus EE | 30,355 stars, v2.0.11 (2026-11-17) | 1 (OSS)/2/0 |

Sources by row:
- **Temporal:** [message passing](https://docs.temporal.io/develop/typescript/message-passing), [condition](https://typescript.temporal.io/api/namespaces/workflow#condition), [limits](https://docs.temporal.io/cloud/limits), [web UI](https://docs.temporal.io/web-ui), [security](https://docs.temporal.io/self-hosted-guide/security), [visibility](https://docs.temporal.io/self-hosted-guide/visibility).
- **DBOS:** [communication](https://docs.dbos.dev/typescript/tutorials/workflow-communication), [methods](https://docs.dbos.dev/typescript/reference/methods.md), [Conductor API](https://docs.dbos.dev/conductor/reference/conductor-api.md), [Conductor licence](https://www.dbos.dev/conductor-license).
- **Inngest:** [waitForEvent](https://www.inngest.com/docs/reference/functions/step-wait-for-event), [self-hosting](https://www.inngest.com/docs/self-hosting), [LICENSE](https://github.com/inngest/inngest/blob/main/LICENSE.md).
- **Trigger.dev:** [wait-for-token](https://trigger.dev/docs/wait-for-token), [self-hosting](https://trigger.dev/docs/self-hosting/docker), [realtime](https://trigger.dev/docs/realtime/overview).
- **Hatchet:** [durable event waits](https://docs.hatchet.run/v1/durable-event-waits), [configuration](https://docs.hatchet.run/self-hosting/configuration-options), [schema roles](https://github.com/hatchet-dev/hatchet/blob/main/sql/schema/v0.sql).
- **Restate:** [awakeables](https://docs.restate.dev/develop/ts/awakeables), [security](https://docs.restate.dev/server/security), [LICENSE](https://github.com/restatedev/restate/blob/main/LICENSE).
- **Vercel Workflow SDK:** [hooks](https://workflow-sdk.dev/docs/foundations/hooks), [web README](https://github.com/vercel/workflow/blob/main/packages/web/README.md), [world-postgres](https://github.com/vercel/workflow/blob/main/packages/world-postgres/README.md).
- **Cloudflare:** [events](https://developers.cloudflare.com/workflows/build/events-and-parameters/), [limits](https://developers.cloudflare.com/workflows/reference/limits/), [HITL](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/), [workerd](https://github.com/cloudflare/workerd).
- **Mastra:** [suspend/resume](https://mastra.ai/docs/workflows/suspend-and-resume), [routes](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/reference/server/routes.mdx), [licence doc](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/docs/license.mdx), [ee/LICENSE](https://github.com/mastra-ai/mastra/blob/main/ee/LICENSE), [CopilotKit integration](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/integrations/agentic-ui/copilotkit.mdx).
- **Microsoft Agent Framework:** [HITL](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop), [checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints), [DevUI](https://learn.microsoft.com/en-us/agent-framework/devui/), [PyPI](https://pypi.org/project/agent-framework/).
- **LangGraph:** [interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts), [generative UI](https://docs.langchain.com/langsmith/generative-ui-react), [standalone server](https://docs.langchain.com/langsmith/deploy-standalone-server), [self-hosted plans](https://docs.langchain.com/langsmith/deploy-to-self-hosted-overview.md), [agent-inbox](https://github.com/langchain-ai/agent-inbox) (archived).
- **Windmill:** [approval](https://www.windmill.dev/docs/flows/flow_approval), [full-code apps](https://www.windmill.dev/docs/full_code_apps), [pricing](https://www.windmill.dev/pricing), [LICENSE](https://github.com/windmill-labs/windmill/blob/main/LICENSE).
- **Prefect:** [flow runs API](https://docs.prefect.io/v3/api-ref/python/prefect-flow_runs), [interactive](https://docs.prefect.io/v3/advanced/interactive), [security settings](https://docs.prefect.io/v3/advanced/security-settings), [pricing](https://www.prefect.io/pricing).
- **n8n:** [Wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/), [HITL tools](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/), [Form](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form/), [community features](https://docs.n8n.io/hosting/community-edition-features/), [LICENSE](https://github.com/n8n-io/n8n/blob/master/LICENSE.md).
- **Kestra:** [Pause](https://kestra.io/plugins/core/flow/io.kestra.plugin.core.flow.pause), [Apps](https://kestra.io/docs/enterprise/scalability/apps), [OSS vs paid](https://kestra.io/docs/oss-vs-paid).

### UI protocols and session runners

| Piece | What it gives | Card can be our component? | Answer path | Licence | Maturity |
|---|---|---|---|---|---|
| [AG-UI](https://docs.ag-ui.com/concepts/events) | Event stream: run lifecycle, text, tool calls, `StateSnapshot`/`StateDelta` (JSON Patch) | yes, it is transport only | [interrupts](https://docs.ag-ui.com/concepts/interrupts): `RunFinished.outcome = interrupt` with `responseSchema` and `expiresAt`; resume a new run with `resume[]`; payload validated | MIT | 21.7k stars, `@ag-ui/core` 1.0.5 (2026-11-17); interrupt contract's status not stated |
| [CopilotKit](https://docs.copilotkit.ai/reference/hooks/useHumanInTheLoop) | React kit over AG-UI; `useHumanInTheLoop({parameters, render})` | yes, `render` is any React component | `respond(result)` resolves the tool call | MIT SDK and TS runtime; saved and resumable threads ("Intelligence") paid ([oss-vs-enterprise](https://docs.copilotkit.ai/concepts/oss-vs-enterprise)) | 39.0k stars, v1.90.2 (2026-11-23) |
| [A2UI](https://a2ui.org/specification/v1.0-a2ui/) | Declarative agent-to-UI JSON: `createSurface`, `updateComponents`, `updateDataModel`; renderers for React, Lit, Angular, Flutter, SwiftUI | yes, through a custom catalog the agent is prompted with; not arbitrary JSX | Button `action` event carries context with bindings resolved | Apache-2.0 | 18.6k stars, spec v1.0 current ([versions.json](https://github.com/google/A2UI/blob/main/specification/versions.json)); `@a2ui/react` 0.16.1 (2026-11-23) |
| [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) | `ui://` HTML resources rendered by the host in a sandboxed iframe; hosts include Claude, ChatGPT, VS Code | any HTML/JS, but in an iframe on another origin, not in our React tree | `tools/call` from the view, app-only tools hidden from the model; our own web app can host them through `ext-apps/app-bridge` | moving from MIT to Apache-2.0 | 3.2k stars, v2.1.0 (2026-11-10); stable spec 2026-01-26 |
| [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/typescript) | `query()`: `model`, `systemPrompt`, `allowedTools`/`disallowedTools`, `permissionMode`, `hooks`, `maxTurns`, `maxBudgetUsd`, `outputFormat: json_schema`, `settingSources`, `plugins`, `skills`, `mcpServers`, `sandbox`, `resume`, `cwd`, `env` | — | — | Anthropic Commercial Terms; claude.ai login not allowed for third-party products ([overview](https://code.claude.com/docs/en/agent-sdk/overview)); API key expected | 0.3.332 (npm 2026-11-24); spawns the `claude` CLI per session; no session timeout of its own ([hosting](https://code.claude.com/docs/en/agent-sdk/hosting)) |
| [Codex SDK](https://github.com/openai/codex/blob/main/sdk/typescript/README.md) | `startThread()`, `run(prompt, {outputSchema})`, `runStreamed()` with usage, `resumeThread(id)`; `sandboxMode`, `approvalPolicy`, `networkAccessEnabled` ([threadOptions.ts](https://github.com/openai/codex/blob/main/sdk/typescript/src/threadOptions.ts)) | — | — | Apache-2.0; API key for programmatic use ([auth](https://learn.chatgpt.com/docs/auth)) | 0.172.0 (npm 2026-11-24) |

## Why Temporal, and why not the others

- **What decides between engines.** The card is ours on every engine. What separates them is:
  - waits that last days and refuse a wrong answer (M3, M8);
  - a free self-host licence for a team server (S7, M10);
  - auth we can tie each answer to (M9).
- **Temporal meets all three.**
  - Update validators reject an answer before it is written ([message passing](https://docs.temporal.io/develop/typescript/message-passing)). That gives us decision 12's "a second answer is refused" and "options only, or other" in the engine itself.
  - The JWT ClaimMapper gives roles per namespace in OSS ([security](https://docs.temporal.io/self-hosted-guide/security)). The person who answered is still checked in our UI's backend, which passes the identity into the Update.
  - Its limits were already priced in on 2026-11-21: determinism, Continue-As-New, a payload codec for secrets, and experimental pause (`2026-11-engine-choice.md`).
- **Out because of licence or paid-only basics:**
  - LangGraph Agent Server (self-host needs Enterprise);
  - Mastra (RBAC needs the EE key);
  - Windmill (CE user and group caps; custom React is EE);
  - n8n (Sustainable Use License);
  - Kestra (auth and Apps EE);
  - DBOS Conductor (proprietary);
  - Inngest (server SSPL).
- **Out because they are immature or not self-hostable as a product:**
  - Cloudflare Workflows self-host is `--experimental`;
  - Microsoft Agent Framework has no TypeScript and its main repo is 404;
  - Prefect is Python-only, and its OSS edition has no users.
- **Credible but second:**
  - Vercel Workflow SDK: TS-native, validated hooks, one Postgres; young, no auth.
  - Hatchet: MIT, tenants and roles; 0.x.
  - Trigger.dev: the best HTTP completion; the heaviest self-host stack (Postgres, Redis, ClickHouse, S3, registry), and no checkpoints in self-host ([overview](https://trigger.dev/docs/self-hosting/overview)).
  - Restate: no self-host auth, BUSL server.

## The build

### Architecture

```
trackers (GitHub Issues, Jira via MCP)   code hosts (GitHub; others later)
        │  connector.ts (ledger, read-back, queue)  │  forge port
        ▼                                            ▼
┌───────────────────────── Orchestrator (Temporal TS worker) ─────────────────────────┐
│ ItemWorkflow per item key (workflowId = runKey): stage switch over the 17 states,   │
│ guards from states.ts, shared round counter, Updates = gate answers with validators,│
│ Queries = card state, child RepoWorkflow per repository (PR each), Schedules =      │
│ poll, revisit, findings, scouts, retro; ReleaseWorkflow keyed "release"             │
└──────┬───────────────┬──────────────────┬───────────────────┬───────────────────────┘
       │ Activities    │                  │                   │
  Session runner   Script activities   Store (Postgres):   OTel spans → Langfuse
  per role:        (our .shared         work/, ledger/,     (provenance from our
  Agent SDK /      modules, ported)     findings/, scouts/, own run table)
  Codex SDK in a                        provenance/, users
  sandbox                                      │
                                               ▼
                      Decision app (Next.js/React, OIDC): inbox ≤3, board of states,
                      item page, cards answered in place → Temporal Update;
                      ntfy push with link; MCP read/request servers for the Supervisor
```

- **Orchestrator.** There is one Temporal workflow per item, with the workflow id set to the item key. This gives M8's "one run per item and state" through workflow-id reuse rules.
  - Stages become functions inside it, so the Archon split into 13 workflows is no longer forced. That split exists because Archon refuses fan-out inside a loop (SPEC.md, "Shape in one screen").
  - Slices are child workflows, bounded by a semaphore.
  - The global pause is our own flag, as planned in 2026-11-21. The cap of 3 is a count over workflows in an Operator state, read from visibility or our store.
- **Session runner per role.** A role table holds:
  - the prompt file;
  - the skills, through `skills.ts`, rendered into the system prompt or passed as SDK `skills`/`plugins`;
  - the model and its family;
  - `maxTurns`, `maxBudgetUsd`, an idle timeout and a wall clock (an Activity `startToCloseTimeout` plus a heartbeat timeout);
  - the output schema.

  Claude roles run on the Agent SDK with `settingSources: []` and `outputFormat`. The reviewer runs on the Codex SDK with `outputSchema`. A usage-limit error becomes a non-retryable failure type that the workflow turns into a `sleep` until the reset. This replaces Archon's pause at the provider limit, and no round is spent.
- **Sandbox.** For parity: a git worktree per session inside the worker container, which is where Archon is today. Beyond parity, per M7 and build step 3: OpenSandbox with a branch-limited push proxy, as in the 2026-11-21 plan.
- **Connectors.** `connector.ts`, `map.ts`, `mcp.ts`, `probe.ts`, `github.ts` and `forge.ts` sit behind a forge port. Archon's `forge` operations (`workitem.*`, `pr.*`, `checks.*`) are reimplemented on Octokit.
- **Multi-repo items (M4).** An item holds a list of repositories. Each gets a child workflow with its own branch, PR and CI. The merge stage waits for all of them and lands them in a declared order. This is new: the pack today has one repository per item run (`--item issue-<n>` per project).
- **Traces (S2).** Spans around every activity carry the `pipeline.*` attributes. Claude Code OTel goes to self-hosted Langfuse. `provenance.ts` reads our run table instead of `archon workflow get`.

### What we reuse from `.shared/`

The pack has 30 modules (4,677 lines), 20 test files, and about 13,400 lines of other TypeScript (scripts, servers, tests). Almost all of it reaches Archon only through `archon:script`. Measured by grep on 2026-11-26, the import names are:

- `emit`, `input`, `refuse`, `runId`, `artifactsDir`, `packDir`;
- `state`, the key-value store with conditional writes;
- `trigger`, `forge`, `items`, `outcomes`.

`host.ts` also calls the `archon` CLI.

- **Reuse as is, behind a port:** `states.ts`, `work.ts`, `connector.ts`, `map.ts`, `mcp.ts`, `mcp-serve.ts`, `item.ts`, `request.ts`, `red.ts`, `findings.ts`, `scouts.ts`, `environments.ts`, `holds.ts`, `releases.ts`, `candidate.ts`, `rulings.ts`, `trust.ts`, `policy.ts`, `skills.ts`, `fingerprint.ts`, `probe.ts`, `git.ts`, `inputs.ts`.
  - We write an `archon:script` shim: `state` on a Postgres table with revision checks, `emit`/`input` as Activity input and output, and `refuse` as a non-retryable error.
  - The existing `bun test` suites keep running against the shim.
  - Activities run in Node, while the modules use `Bun.spawnSync` in places. Either the worker runs on Bun (not verified with the Temporal SDK) or those calls move to `node:child_process`.
- **Rewrite:**
  - `fire.ts`: chaining becomes calls inside the workflow, or signal-with-start.
  - `host.ts` and the run reads in `provenance.ts`: these become our run table.
  - The 13 workflow YAMLs (about 3,500 lines with fixtures): these become workflow code.
  - The 20-odd fixture files per workflow: these become Temporal `TestWorkflowEnvironment` tests with stubbed Activities (S6).
  - The read server: it switches its seams from the Archon CLI and HTTP to our API. Its fence logic stays.
- **Drop:** the Supervisor's deny-rule folder (decisions 62, 65). The chat lives in our app with only our read tools and `file_request`, so the fence is by construction.

### UI stack for cards

- **App and auth:** Next.js (React) with OIDC (for example Auth.js against the team's IdP). The backend checks the user's role and passes `{answeredBy, via}` into the Temporal Update. The Update validator rejects an answer that is not an offered option, has a stale head SHA, or comes as a second answer.
- **The card is data.** `request.ts` already emits the question, headline, recommendation with confidence, up to three facts, "not verified", options with `value.effect`, and the case. We extend it to a typed JSON (zod) of blocks:
  - `markdown` (react-markdown with remark-gfm, links, tables);
  - `mermaid` (mermaid rendered client-side);
  - `chart` (Vega-Lite spec through react-vega, or Recharts);
  - `details` (folded evidence: diffs, red records, logs);
  - `table`;
  - `options` (with effects and an "other" text field).

  Agents emit blocks only from this catalog, the A2UI catalog idea, and the server validates the JSON before the card exists. MDX is for cards we author, not for agent output, because MDX compiles code. Agent text stays markdown, marked as untrusted data.
- **Answers in place** on the card, with an optimistic state and a re-read through a Query.
- **Same request in the tracker and chat (M3).** The connector writes a compact markdown rendering of the same JSON as a tracker comment, with a link. Claude Desktop is optional and gets an MCP Apps view of the card.
- **Live progress.** A Server-Sent Events route over our store is enough for now. AG-UI is adopted only if we later stream agent sessions into the UI.

## Effort for one engineer with AI coding agents, to parity with Archon today

Parity means what the pack runs today:

- the 13 workflows and the 17 states;
- tracker and code-host connectors;
- gates answered with identity;
- worktree isolation;
- per-role prompt, skills, model and limits;
- provenance, findings, scouts, releases and the Watcher;
- the read and request servers and a Supervisor chat;
- stub-verdict tests.

It excludes OpenSandbox with the push proxy, and multi-repo items.

| Part | Weeks |
|---|---|
| Temporal and Postgres deployment, worker skeleton, `archon:script` shim, store with conditional writes, existing unit tests green | 2 |
| Port of 13 workflows into item, release and scheduled workflows; chaining, caps, pause, cancel, reconcile, revisit | 4 |
| Session runner: roles table, Agent SDK and Codex SDK, schemas, limits, wall clock, usage-limit sleep, skills, worktrees | 2 |
| Decision app: OIDC, roles, inbox, board of states, item page, card catalog, answers by Update with validators, tracker rendering, ntfy | 4 |
| Test harness: fixtures as workflow tests with stubbed Activities | 2 |
| Traces and provenance on OTel and Langfuse; Retro metrics from our tables | 1 |
| Read server, request server, Supervisor chat in the app | 1 |
| Live trial on a real repository, fixes, operations runbook | 2 |
| **Total** | **18** (range 14–24) |

Beyond parity:

- **OpenSandbox and push proxy (M7):** 3–4 weeks. The single-read score of 3 is still not verified.
- **Multi-repo items (M4):** 1–2 weeks.

The estimate assumes AI agents write most of the code and the specs (SPEC.md, `docs/states.md`, decisions) stay the source. It is not based on a measured velocity.

### Riskiest parts

1. **Rewriting the 13 workflows.** The idempotency rules live in node order and in Archon's run semantics: the write ledger, read-back, "one non-terminal run per item", `overlap: queue`, and gates as a loop's only sink. A port can keep the modules and still lose an ordering guarantee. The fixtures must be ported first, as the contract.
2. **Determinism and versioning.** Items wait days, so a code change meets live histories. Every workflow change needs patching or a version gate (`2026-11-engine-choice.md`, known costs).
3. **The session runner's limits.**
   - The Agent SDK has no session timeout of its own, and `maxBudgetUsd` is a client-side estimate ([hosting](https://code.claude.com/docs/en/agent-sdk/hosting), [typescript](https://code.claude.com/docs/en/agent-sdk/typescript)).
   - Usage-limit detection and resume was Archon's.
   - Codex cost stays an estimate.
4. **Decision UI security.** We become the auth system: who may answer which gate (M9), CSRF, a stale head SHA, and agent markdown rendered safely. The card catalog must not execute agent content.
5. **Operations.** Temporal plus Postgres plus Langfuse plus the app on one team server. The single-node footprint was not verified on 2026-11-21 and still is not.
6. **Bun versus Node in Activities.** The modules call `Bun.spawnSync`; Temporal's TS worker on Bun is not verified.

## Not verified

- Whether the Temporal Web UI accepts custom components (`temporalio/ui` has a `plugins` folder, not read). The list of persistence databases and the single-node footprint.
- The maximum wait for DBOS, Inngest, Hatchet and Trigger.dev, which none of their docs state. RBAC in self-hosted Trigger.dev and Inngest.
- Cloudflare Workflows durability under self-hosted workerd. Mastra's runtime `resumeSchema` validation. LangGraph Agent Server's HTTP resume route and image licence.
- The contents of `microsoft/agent-framework` (404 on 2026-11-26).
- Whether AG-UI's interrupt contract is stable. CopilotKit's paid tiers.
- Whether running our own unattended pipeline on a claude.ai subscription is allowed. The docs speak only of third-party products, so plan on an API key ([overview](https://code.claude.com/docs/en/agent-sdk/overview)).
- Whether the Temporal TypeScript worker runs on Bun.
- The effort estimate itself, which is a judgement from code size and scope, not a measurement.
