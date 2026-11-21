# Archon (coleam00/Archon): deep read as a base for our pipeline

Source: shallow clone (depth 200) of the default branch `dev`, head `f9d1d2b` (2026-11-20). Read statically only; nothing was installed or run. Paths below are relative to the repo root.

## Verdict

**Score: 7/10 as a base.** Archon is the closest thing to "our pipeline, already built" among the engines checked: a durable YAML DAG engine with typed attention waits, deterministic `when:` and loop exits, JSON-schema-validated node outputs, a bundled SDLC pack (intake, build queue, merge queue with a scripted merge gate), a web console with run detail, approvals, metrics and Web Push, opt-in multi-user auth, MIT license. The gaps are in exactly the places our spec is strict: the sandbox for git repositories is a worktree on the host (no network closing by Archon itself), every node of a run gets the same GitHub token (so an agent can merge), there is no Jira, and several limits (shared 3-round fix limit, at most 3 waiting items) are not engine concepts and must be written as pack logic.

## 1. Web UI and auth

- One shipped web app, the console (`packages/web/src/experiments/console/README.md`). Routes: all runs `/console`, project runs `/console/p/:id`, run detail `/console/r/:runId` (log stream, tool calls, node filter), project operator chat, metrics overview and details (pack-declared metric cards over 7/30/90 days), settings (assistant, providers, model tiers, env vars, identity, alerts), and an experimental visual workflow builder `/console/builder` that edits project YAML.
- Operator actions over HTTP (`packages/server/src/routes/api.run-control.ts`, `api.run-gates.ts`, `api.run-attention.ts`, `api.items.ts`): approve, reject, respond, answer, cancel, resume, abandon, signal, attention answer/withdraw, item rulings, an SSE attention stream (`/api/runs/attention/stream`), launch runs, edit workflow YAML (`workflow-yaml.ts`), provider keys.
- Phone push: Web Push for run-attention notices, opt-in per browser, needs an authenticated identity and HTTPS (console README "Closed-console notifications", `routes/api.web-push.ts`).
- Pause and install-wide hold exist but I found them only in the CLI: `archon workflow pause` (`packages/workflows/src/schemas/operator-pause.ts`, pauses at the next node boundary) and `archon hold set|lift` (`packages/cli/src/commands/hold.ts`, admits no new runs, running ones continue). I did not find web routes for them (searched `packages/server/src/routes`, grep for pause/hold paths): not verified in the UI.
- Auth: OFF by default. Better Auth mounts at `/api/auth/*` only when Postgres `DATABASE_URL` and `BETTER_AUTH_SECRET` are both set (`packages/server/src/auth/config.ts:24`). Signup is disabled / email allowlist / open. Users have roles `admin | member` (`packages/server/src/routes/api-request-auth.ts:18`; rulings restricted to "the operator or an admin", `api.items.ts:97`). Per-user GitHub tokens with scrubbing of the org token (`packages/workflows/src/utils/github-token-policy.ts`). A simpler single-password `auth-service` (bcrypt + signed cookie, `auth-service/server.js`) sits in front via Caddy in docker-compose profiles `auth` / `cloud`.

## 2. Git and tracker integration

- **GitHub** is first-class, as a forge plugin process (`plugins/forge-github/archon-plugin.json`, implementation `packages/adapters/src/forge/github/*`): PR view/create/edit/ready/draft/files/merge/merge-state, review threads (reply, resolve), checks state/commit/rerun, labels, files, work items view/create/edit/close/comments/labels, webhook intake with signature check, GitHub App installation tokens. The SDLC pack declares the operations it needs and the engine checks them before a run starts (`.archon/workflows/sdlc/.pack/pack.yaml:38-71`, `packages/workflows/src/run-forge-access.ts`).
- Sub-issues and blocked-by: no matches for sub_issue / blocked_by in `packages/forge/src` or the GitHub adapter. The pack has a `split` workflow, but it works through issue bodies/labels, not GitHub's native sub-issue or dependency API (not verified in depth).
- **GitLab / Gitea**: community adapters (`packages/adapters/src/community/forge/{gitlab,gitea}`, ~2.2k LOC) handle webhooks and comments only; README says new forges ship as external plugins.
- **Jira: none.** `grep -ril jira` over the whole tree returns nothing. Linear: none. Work-item operations (`workitem.*`) are part of the forge contract (`packages/forge/src/operations.ts`), so Jira would be a new plugin process implementing those ops; whether one project can use GitHub for PRs and a different plugin for work items is not clear from the code I read (the item tracker `packages/adapters/src/item-tracker/item-tracker.ts` dispatches through forge plugins).

## 3. Workflow and gates

- Format: YAML DAG, Zod-validated (`packages/workflows/src/schemas/dag-node.ts:262-276`). Node kinds: command, prompt (agent), bash, script (bun/TS), loop, loop_group, approval (deprecated), wait, cancel, include, workflow (child run). Base fields (`schemas/dag-node-base.ts`): `depends_on`, `when`, `trigger_rule`, `model`, `provider`, `context` (fresh/shared/same/resume), `output_format` (JSON schema), allowed/denied tools, `idle_timeout`, `retry`, `hooks`, `mcp`, `skills`, `maxBudgetUsd`, `sandbox`.
- **`wait:`** (`schemas/wait-node.ts`): an attention wait with `form: message | approval | select | multi_select`, kebab-case option ids, and a `recommendation {option, why, confidence}`. The answer is the node's typed output; durable waits have a max duration (`schemas/durable-wait.ts`). Legacy `approval:` with `on_reject.max_attempts` (1-10) is deprecated in favour of `wait` (`schemas/gate-node.ts`).
- **`when:`** (`condition-evaluator.ts`): a small grammar over `$node.output.field`, `$INPUTS.x`, `==` `!=` `<` `>`, `&&` `||`, no parentheses. Bad syntax fails closed (skip); a missing reference fails the node. So routing is code over structured fields, not prose.
- **`loop:`** (`schemas/loop.ts`): `max_iterations` required, `on_exhausted: fail | complete`, `fresh_context`, exit channels `until_bash` (deterministic script) and `until_field` (declared boolean in output); prose `until` is deprecated with a warning (lines 65-80).
- **Verdicts:** `output_format` is validated with ajv (`structured-output.ts`); a schema miss can be re-asked and is a distinct failure class (`schema_unmet`, `retry.on_error`, `schemas/retry.ts`). The SDLC review emits a JSON verdict (`review/archon-review.yaml:370`, `&review_verdict`), three independent verifier agents vote on blocking findings, and a script (`settle-review.ts`) owns the final verdict. The merge is a **script node**, not an agent (`merge-queue/archon-merge-queue.yaml:238`, `merge-queue/scripts/merge.ts`): it refuses unless the trusted verdict says Ready at the declared head, CI is green there, the base branch is not red, plus `protected_paths` and `merge_lane: manual` (`pack.yaml:22-36`). This matches our "code picks the next step from a JSON verdict".
- Retries: per node 1-5 attempts with backoff (`schemas/retry.ts`). Limits: per-node `maxBudgetUsd`, run-wide `budget` (work units and USD, `run-budget.ts`; unknown cost counts as failure), but the run budget is **rejected when the workflow uses loops, children or fan-out** (`schemas/workflow.ts:209-214`). Timeouts: `idle_timeout` per node; I saw no wall-clock per-session limit in the base schema. Concurrency: resource slots with capacity per queue (`pack.yaml` comment, `resource-hold.ts`).
- Missing as engine concepts: a fix-round counter shared across workflows of one item, and a cap on how many items wait for the Operator. Both are writable as pack scripts over item state (`item-*.ts` helpers exist: `item-hold.ts`, `item-window.ts`, `item-metrics.ts`).

## 4. Sandbox

- **Repo projects: worktree only.** `packages/isolation/src/backend-router.ts:1-12` says it plainly: repo-kind projects "keep the worktree path and must never reach here"; containers are for FOLDER-kind (non-git) projects. A worktree is filesystem separation, not a sandbox: agents run as the Archon process user with its network.
- Container backend (`backends/container.ts`, `container/start.ts:150-200`): read-only bind of the project root plus overlayfs upper on a volume, `--memory`, `--pids-limit`, `--network bridge|none` (default **bridge**, `packages/core/src/config/config-types.ts:170-173`; `host` is rejected, `cli/src/commands/workflow-isolation.ts:60`). Native overlay mode adds `CAP_SYS_ADMIN` + `apparmor=unconfined`. Only Claude runs in-container in v1 (`backends/container.ts:18`). Write-back of the overlay diff is "Phase C". With `network: none` the Claude CLI cannot reach its API either, and I saw no egress proxy, so "network closed" is not usable out of the box.
- Claude Code's own OS sandbox is exposed per node and per workflow (`schemas/provider-options.ts:15-60`: `sandbox.enabled`, `network.allowedDomains`, `filesystem.denyRead/allowWrite`, proxy ports). That is the realistic way to close the network for Claude nodes today; Codex has its own sandbox modes via its SDK. Neither is Archon-enforced.
- **Credentials:** a run's subprocess env gets `GH_TOKEN`/`GITHUB_TOKEN` set to the GitHub App installation token (`packages/workflows/src/run-credential-env.ts:84-95`), for every node of the run. If the App can merge, any agent node can merge with `gh pr merge`. The merge gate is safe only as long as agents behave. Separating "push to own branch" from "merge" needs per-node credentials, which the engine does not have.

## 5. Agent runners, logs, cost

- Providers as plugins: Claude via `@anthropic-ai/claude-agent-sdk`, Codex via `@openai/codex` 0.163.0 (`packages/providers/package.json:47,53`), Pi (OpenRouter and other vendors). Model tiers `small|medium|large` and `@aliases` map to `{provider, model, effort}` in config (`.archon/config.example.yaml:38-80`); the review pack uses preference lists like `['@review-code','@reviewer', large]` (`schemas/model-binding.ts`), so "reviewer of another model family" is one alias line.
- Traces: full event log and transcript per run in SQLite or Postgres, per-node provider events (`provider-events.ts`, `node-event-write.ts`), run cost and tokens in the console (`RunDetailHeader.tsx`, `ActiveRunCard.tsx`), pack-declared metrics with windows (`metrics.ts`, `metric-views.ts`). No OpenTelemetry/Langfuse export found.

## 6. Extension points

Plugin kinds with published contracts: workflow pack, provider, forge, chat (Slack in tree; Telegram, Discord adapters) installed from GitHub (`archon plugin add owner/repo`). Workflow files, commands and scripts live in `.archon/`; hooks per node (`schemas/hooks.ts`); triggers bind workflows to schedules or issue events (`archon pack bindings`); an OpenAPI HTTP API; a script API package for TS script nodes (`packages/script-api`). Our stages, gates and verdict rules fit as a pack without a fork. The sandbox (per-node credentials, closed network for repo runs) and Jira would need either a fork of `packages/isolation` / `run-credential-env.ts` or a wrapper outside Archon.

## 7. License, telemetry, activity, size

- License MIT (`LICENSE`, Cole Medin).
- Telemetry **on by default**, PostHog with an embedded key (`packages/paths/src/telemetry-consent.ts:23`); categorical events only per README; opt out with `ARCHON_TELEMETRY_DISABLED=1` or `DO_NOT_TRACK=1`; auto-off in CI.
- Activity (gh API, 2026-11-21): 23,970 stars, 3,541 forks, last push 2026-11-20, 30 releases (latest v0.14.0, 2026-11-07, roughly weekly). Commits per month (weekly stats, default branch): Jun 57, Jul 149, Aug 990, Sep 233, Oct 876, Nov 330 (to the 20th). Issues 200 open / 2,487 closed; PRs 15 open / 2,281 merged / 769 closed unmerged. Search API hit its rate limit, so these come from GraphQL and stats endpoints.
- Bus factor: low. Contributors by commits: Wirasm 3,322, `claude` 470, coleam00 385, leex279 66, github-actions 45; one person writes about 85% of human commits. README claims Archon runs built 363 of 524 PRs merged 1-19 Oct 2026, so much of the velocity is the maintainer's own factory.
- Language TypeScript on Bun, Hono server, React console. Non-test TS/TSX ~353k lines (workflows 106k, core 62k, cli 56k, web 41k, providers 25k, server 18k, adapters 11k, isolation 9k, forge 5k), tests ~357k more. SDLC pack YAML 3.6k lines plus scripts.

## 8. Score and sizing

**7/10.**

Top strengths:
1. Deterministic control flow: typed `wait` forms with recommendation, `when:` over JSON fields, `until_bash`/`until_field`, ajv-validated outputs, scripted merge gate. Our "code picks from JSON verdict" rule is already the house style.
2. A working SDLC pack (intake, build queue, ship, multi-lens review with voting, merge queue, discoveries, metrics) to fork as a pack rather than write.
3. Web console with run detail, approvals, attention stream, Web Push to phone, metrics, workflow editor; opt-in multi-user auth with roles and per-user GitHub tokens.
4. Claude, Codex and Pi through their own SDKs, aliased per node: a second model family for review is configuration.
5. MIT, self-hosted, Docker compose with Postgres and Caddy profiles, durable state with resume, plugin contracts for forge, provider, chat, pack.

Top gaps:
1. Sandbox for git repos is worktree only; network closing must come from Claude/Codex built-in sandboxes per node, or from our own container/egress-proxy layer around the agent processes. **L.**
2. One GitHub token per run, visible to every node, so agents can merge. Needs per-node credentials (push-only token for implementer nodes, merge token only in the merge script). Fork of `run-credential-env.ts` or a second GitHub App plus env scrubbing via hooks. **M.**
3. No Jira (nor Linear); work items are tied to the forge contract. A Jira forge-style plugin for `workitem.*` plus checking that PR ops can still go to GitHub. **M-L.**
4. Pipeline rules missing as engine features: shared 3-round fix limit per item, max 3 items waiting for the Operator, wall-clock session limits, run budget unusable with loops/children/fan-out. Write as pack scripts over item state, or patch the engine. **M.**
5. Pause/hold in the web UI not found (CLI only), telemetry on by default (set env, **S**), and a single-maintainer project moving at ~900 commits per month: a fork will drift fast, so stay on plugin and pack seams. **S** for the UI buttons, ongoing cost for upgrades.
