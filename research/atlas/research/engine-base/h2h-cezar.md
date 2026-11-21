# Head-to-head: cezar, scored against the shared rubric

Repo: https://github.com/open-mercato/cezar. Read at `c043cff` (2026-11-21), the latest `main`.
Read statically only: nothing was installed, built or run. `P/` = `packages/cezar/src/`, `W/` = `packages/web/src/`.
This builds on `SCRATCH/cezar.md` (same commit) and does not repeat its inventory. Where a fact is from that
report, it says so.

**Scores (0–5):** UI 4 · Code 4 · Extensibility 3 · Fit 3 · Agents 4 · Sandbox 1 · Git/GitHub 3 · Ops 3 · Health 4 · Risks: see §10.

**Not verified (read the top first):**
- Nothing was run, so every click count comes from route and component code plus the repo's screenshots.
  The screenshots in `docs/screenshots/` are from v0.12; the current workflow editor is a node graph, not
  the list shown in `workflow-builder.png`.
- The self-approval hole in §6 is read from code (`P/server/server.ts:1802-1900`, `P/workflows/run-env-keys.ts:9`),
  not exploited.
- The stars trend is not measured: the stargazers API answered 404 for this repo with our token.
- The docs site (cezar.run) was not loaded live. I read its source instead (`docs/site/content`, 212 `.mdx` pages).

---

## 1. Operator UI and usability: 4/5

Each count is in clicks from the cockpit's home screen. The sidebar is always visible on desktop.

| Daily task | Screens / clicks | How (code) |
|---|---|---|
| See what waits for me | 0 screens / 0 clicks | The sidebar "NEEDS YOU" group is on every screen (`dashboard.png`, `W/components/app-shell.tsx`). The project home is "Now", a triage board with three sections (needs you, running, finished today) that names one action per row (`W/routes/now/now.tsx:47-55`). The Dashboard widget splits the items into questions and reviews. ⌥⇧↑/↓ jumps between tasks that need you. |
| Approve a gate with evidence | 1 screen / 2 clicks | Clicking the item opens the task. A `gate.human` parks as an ask card whose header is the node name and whose text is the rendered `message`, plus **Approve / [Approve, open a full PR] / Reject** (`P/workflows/run.ts:7700-7720`). **Evidence is whatever the `message` template pulls in** (`{{nodes.review.summary}}`, a check's output). There is no structured evidence panel. The diff is one tab away (Changes). The **Questions** page answers cards in place without opening the task (`W/routes/questions/questions-route.tsx:61`), so that path is 1 click. |
| Open a run: log, diff, cost | 1 screen / 1 click, then 1 per tab | The task workspace has the tabs Session (live stream of text, tool calls and results), Changes (diff, unified or split, line comments), Commits, Files, Graph (per-node status, iterations, cost, edges taken). Tokens and $ sit in the header (`review-gate.png`: "IN 32.7k · OUT 5.8k · $0.42"). Cost per node is on the Graph tab. |
| Send back with a comment | 1 screen / 2–3 clicks + typing | On a review-state task: the review panel's notes box, then **↩ Send back** (`W/routes/task-thread/review-panel.tsx:38-49`; line comments from Changes go along). On a graph gate: type into the composer. "request changes", "not yet" and similar take the reject port, and the text is in `{{nodes.<gate>.comment}}`. Other text approves *with instructions* (`P/workflows/gate-reply.ts:39-75`). **This is a trap for us:** a typed comment can turn into an approval. Use the buttons, or wire the reject port explicitly. |
| Pause or cancel | Cancel: 1 screen / 2 clicks. Pause all: **not possible** | Each task has Cancel (Stop) in the run header and the ⋯ menu (`W/routes/task-thread/run-header.tsx:88`). Each automation can be paused on its own. There is no global pause of the queue or the scheduler (confirmed, as in the earlier report). |
| Start a new item from an issue | 2 screens / 3 clicks | Project → GitHub → click the issue → "Hand this to the agent" box (workflow, skills, runner, model, templates pickers) → **Run agent on this issue** (`github-issues.png`, `W/routes/github/github.tsx`). The Tracker page does the same for Jira and Linear. Automations (`issue.labeled` and others) do it with zero clicks. |
| Edit a workflow | 2 screens / 2+ clicks | Project → Workflows → node canvas (`W/routes/workflow-graph/workflow-graph.tsx`, 1,756 lines). Inspector per node, **Simulate**, AI-drafted plan, import and export, built-in templates to copy. The file is saved in the repo as `.ai/cezar/workflows/*.yaml`. |

**The rest of the dimension:**

- **Mobile:** fully responsive, with a phone bottom bar (`W/components/phone-bottom-bar.tsx`) and screenshots
  `mobile-review.png`, `mobile-session.png` and `mobile-tasks.png`. A native iOS and Android shell exists in debug builds
  only (`packages/mobile`, CHANGELOG "Unreleased"). Push goes through the vendor relay; see §6.
- **Live updates:** SSE and WebSocket (`W/api/global-events.tsx`, `P/server/server.ts:9766`). The usage gauges are live.
- **Polish:** high. It is a dark/light Tailwind + Radix design system with a command palette (Ctrl+K), keyboard
  navigation, a CPU/RAM widget and exports to PDF and CSV. It is the most finished UI I have read among these engines.
- **Empty and error states:** handled explicitly. There are `CenteredState` and loading skeletons per route
  (`*-loading.tsx`). Failure notes are written into the timeline. "Closed · idle" is shown instead of a false red "failed"
  (0.19.0). The metric card says "completed does not mean accepted or deployed".
- **Settings and secrets:** 55 settings files (`W/routes/settings/*`). Secrets are encrypted per project or workspace
  with an audience; values are never shown back. **Weakness:** much of the behaviour hangs on about 40 `CEZ_*`
  environment variables read at boot (reference.md:566-600). Several of them matter to us (`CEZ_DISPATCH`,
  `CEZ_MANAGERS`, `CEZ_RELAY`, `CEZ_WORKFLOW_WEBHOOKS`) and are not in the UI.
- **First run:** an onboarding wizard (`W/components/first-run.tsx`, 1,699 lines) installs an agent CLI and signs in
  through an in-page terminal (0.19.0). `server-install` sets up the VPS.

**Why not 5:** no global pause; gate evidence is free text, not a structured panel; a typed reply can approve;
single-user basic auth only; important switches live in env vars.

## 2. Code quality: 4/5

| Item | Finding |
|---|---|
| Architecture | A monorepo with `contract` (zod API schemas, 10k lines), `api-client`, `cezar` (server, CLI, runners), `web` (React 19 + react-query), `desktop`, `mobile`. Its boundaries are clean: the web talks to the server only through the contract package, and the runners sit behind `AgentRunSpec` (`P/core/agent-runner.ts:56`). Boundaries **inside** the server are weak: two god files hold the engine and the routes. |
| Type strictness | `strict`, `noUncheckedIndexedAccess` and `noImplicitOverride` in every TS package (`packages/{cezar,web,contract,api-client}/tsconfig.json`). Explicit `any`: **10 in server source, 5 in web, 0 in contract**, across 1,074 non-test files. One `@ts-ignore/expect-error`. It uses `unknown` instead (about 2,000 uses). TypeScript 7 is pinned (`docs/adr/0001-typescript-7.md`). |
| Tests | 642 server and 459 web test files, plus 14 Playwright e2e specs. Test lines exceed source lines (140k vs 123k on the server, from the earlier report). The kinds are unit, integration (graph runs against mock agents under `CEZ_DRY_RUN`), packaged-CLI e2e (`npm run test:package`) and browser e2e. |
| CI | `.github/workflows/ci.yml`: unit tests in 3 shards; typecheck, build, unit tests and packaged-CLI e2e; a webhook suite on macOS and Windows; snapshot publish. Also `codeql.yml`, nightly, release-cut and publish, and desktop and mobile checks and releases: 12 workflows in all. |
| Lint and format | **None.** No ESLint, Biome, Prettier or `.editorconfig`, and no `lint` script in any `package.json`. Style holds through review and `CODE_REVIEW.md` only. |
| Error handling | Engine nodes do not throw for control flow. They return a port (`failed`, `timeout`, `conflict`) and write a `note()` into the timeline (`P/workflows/run.ts:7700-7930`). A wait always has an exit (AGENTS.md "transitions out of every state"). Loaders never throw on bad config: they return "no servers" plus a problem note (`P/core/private-mcp.ts` header). This is consistent and good. |
| Hotspots over 2k lines | `P/workflows/run.ts` **11,098**; `P/server/server.ts` **9,953**; `P/server/forge/github.ts` 3,878; `W/api/client.ts` 3,375; `P/managers/engine.ts` 3,280; `W/api/queries.ts` 2,992; `P/runs/store.ts` 2,677; `W/routes/tasks-overview.tsx` 2,013. The two largest are also the most-changed files (113 and 155 commits in 3 months, from the earlier report). |
| Docs and ADRs | Only 2 ADRs (`docs/adr/`), but 148 dated specs in `.ai/specs/`, which act as design records. Also `docs/reference.md` (about 1,300 lines), `BACKWARD_COMPATIBILITY.md` (227 KB, the contract), `AGENT_PROTOCOL.md`, `SDLC.md`, and a 212-page docs site. Core engine readability: dense but heavily commented. Every node case explains *why*. The cost is size: one `switch` in a file of 11k lines. |
| Dependencies | Server runtime: **10** (hono, ws, zod, yaml, undici, smol-toml, dotenv, proper-lockfile, @clack/prompts, @hono/node-server). Web: 25 (React, Radix, xyflow, xterm, shiki, dnd-kit…). There is no database driver and no ORM. Light for its size. |

**Why not 5:** no linter or formatter, and two files of 10–11k lines carry the engine and the HTTP layer.

## 3. Extensibility: 3/5

| Seam | Exists? | Add a node kind | Add an agent runner | Pre/post-session hook (sandbox wrap, credential scrub) |
|---|---|---|---|---|
| Workflow format (`version: 2` YAML, `P/workflows/graph.ts:50-153`) | Yes, a closed zod discriminated union with 22 node types | **Core patch**: schema entry + `case` in `run.ts` (~7200–8100) + editor node in `W/routes/workflow-graph/graph-node.tsx` | — | — |
| `check` node (host `bash -lc`, secrets, `CEZ_*` env, `P/workflows/run.ts:10748`) | Yes | **Our "node kinds" live here**: a script whose single-line stdout feeds `if kind: output`. It calls any external API (network is open, secrets are bound per step). **No timeout** on a check (`run.ts:10755`) | — | Can run before or after an agent node in the graph, but not around the session |
| Skills (Markdown, per repo or team repo) | Yes | Agent roles | — | — |
| Agent runners (`P/core/*-runner.ts`, `RUNNER_IDS`) | 11 | — | **Core patch**: a new runner file + `RUNNER_IDS` + login driver + model catalog + UI mapper. Upstream takes these (Gemini, Kimi, agy, omp arrived from outsiders in 0.19) | — |
| Binary override `CEZ_<RUNNER>_BIN` (`P/core/claude-cli-runner.ts:85-91`; all spawns go through `disclaimedCommand`, `P/core/disclaim-spawn.ts:69`) | Yes | — | A wrapper can swap the backend under an existing runner id | **Our sandbox wrapper and env scrub go here, without a patch** (earlier report §6A) |
| MCP | **Per project only**: `.ai/cezar/mcp.local.json`, injected at launch for claude, codex, opencode, junie, copilot, kimi (`P/core/private-mcp.ts:1-50`), plus whatever the repo's committed `.mcp.json` declares | — | — | **Per node: no field.** The workaround for Claude is per-node `allowedTools: [mcp__jira__*]`, which narrows but cannot add servers. Different servers per node is a patch (S: add `mcp:` on agent nodes, pass to the same launch channel) |
| Worktree lifecycle scripts (`reference.md:1127`) | Yes, per project, after-create and before-remove | — | — | Per worktree, **not per session**. Usable to create and destroy a per-task Docker network or volume |
| Before-agent admission hook | **Open PR #2156** from an outsider (`agentAdmission.beforeAgent`, fails closed before every session), not reviewed in 8 days | — | — | Exactly the pre-session seam we want, **if** it merges |
| Extensions / plugins | **Open PR stack #2166–2170** (installable extensions, worker per project, SDK `@open-mercato/cezar-extension-sdk`, panels, commands, task events). Not merged | (Would add panels and commands, not node kinds) | — | Task events (post-session) |
| Automations (cron; GitHub: 9 polled events; Jira and Linear) | Yes | — | — | — |
| Webhooks out (signed; Slack and Discord formats; `notify.webhook` node) | Yes, opt-in env | — | — | Post-run notification |
| HTTP API `/api/v1` (zod contract) and CLI `cez runs/task/automation/tracker/secrets` | Yes, versioned and covered by the BC contract | An external dispatcher can own what nodes cannot | — | — |

**Fits without patching core:** stage graphs, roles as skills, the cross-family reviewer (`runner: codex`), all
label and state writes, R0 rules, sub-issue creation, revert PRs, the weekly retro, sandbox wrapping, env scrub, ntfy push.

**Needs a core patch:**
- MCP per node (S);
- a JSON verdict field (S–M);
- per-node hard time and cost limits that fail the node (S–M);
- a dynamic slice frontier (M–L), or an external dispatcher instead;
- the waiting-for-Operator cap (S);
- global pause (S);
- a check timeout (S).

## 4. Fit of our pipeline: 3/5

### Sketch: `.ai/cezar/workflows/item.yaml`

The schema is `P/workflows/graph.ts:50-153`, and the port names come from `docs/reference.md:470-490`. Lines marked
`# GUESS` are not confirmed by the code. All `scripts/*.sh` are ours. Each one prints one word to stdout and sends
everything else to stderr: a check's `output` is stdout and stderr merged, then trimmed (`run.ts:10760-10776`).

```yaml
version: 2
name: item
description: Intake → implement/CI/review/accept loop (3 shared rounds) → merge. Launched by issue.labeled state:triaging.
nodes:
  - { id: start, type: start }
  # (a) Intake
  - { id: triage, type: agent, runner: claude, model: sonnet, skill: triage,
      prompt: "Triage {{task}}. Write .ai/verdicts/triage.json per schemas/triage.json." }
  - { id: triage-v, type: check, command: "scripts/verdict.sh triage" }        # jq -e schema; sets size/risk labels; prints e.g. "M R1 agent"
  - { id: triage-gate, type: ask-user, name: Triage review,
      question: "Proposed: {{nodes.triage-v.output}}\n\n{{nodes.triage.summary}}",
      options: [accept, for a human, cancel], timeoutMs: 604800000 }
  - { id: is-accept, type: if, condition: { kind: output, ref: triage-gate.answer, op: equals, value: accept } }
  - { id: is-human,  type: if, condition: { kind: output, ref: triage-gate.answer, op: equals, value: for a human } }
  - { id: to-human,  type: check, command: "scripts/state.sh for-human" }
  - { id: to-cancel, type: check, command: "scripts/state.sh cancelled" }     # closes issue as not planned
  # (b) Implement → CI → cross-family review → acceptance, one shared loop
  - { id: s-impl, type: check, command: "scripts/state.sh implementing" }
  - { id: implement, type: agent, runner: claude, model: opus, skill: implementer, prompt: "{{task}}" }
  - { id: push, type: git.push }
  - { id: pr, type: github.draft-pr }
  - { id: ci, type: github.wait-ci, timeoutMs: 3600000 }
  - { id: review, type: agent, runner: codex, skill: cross-review,             # other model family
      prompt: "Review the PR for {{task}}. Write .ai/verdicts/review.json." }
  - { id: review-v, type: check, command: "scripts/verdict.sh review" }      # prints pass|fix|block
  - { id: is-pass,  type: if, condition: { kind: output, ref: review-v.output, op: equals, value: pass } }
  - { id: is-block, type: if, condition: { kind: output, ref: review-v.output, op: equals, value: block } }
  - { id: accept, type: agent, runner: claude, skill: validator, verdicts: [accepted, rejected],
      prompt: "Run the app as a user against the acceptance criteria; save evidence to artifacts." }
  - { id: rounds, type: loop, name: Fix rounds (shared), max: 3 }            # counter never resets in a run (graph.ts:11)
  - id: fix
    type: agent
    session: { continue: implement }
    prompt: "Round {{nodes.rounds.iteration}}/3. CI: {{nodes.ci.status}}. Review: {{nodes.review.summary}}. Acceptance: {{nodes.accept.summary}}"  # GUESS: unset outputs render empty
  - { id: blocked, type: check, command: "scripts/state.sh blocked" }
  # (c) Merge
  - { id: r0, type: check, command: "scripts/r0-rules.sh" }                  # reads rules file + risk label; prints auto|gate
  - { id: is-auto, type: if, condition: { kind: output, ref: r0.output, op: equals, value: auto } }
  - { id: merge-gate, type: gate.human, name: Merge review,
      message: "R{{nodes.triage-v.output}} — review {{nodes.review-v.output}}, acceptance {{nodes.accept.verdict}}. Merge?" }
  - { id: ready, type: github.pr-update, ready: true, addLabels: ["state:merge-queued"] }
  - { id: merge, type: check, command: "scripts/merge.sh", secrets: [MERGE_TOKEN] }  # gh pr merge --auto → GitHub merge queue
  - { id: ok, type: end, status: success }
  - { id: stop, type: end, status: failed }
edges:
  - { from: start, to: triage }
  - { from: triage.done, to: triage-v }
  - { from: triage-v.pass, to: triage-gate }
  - { from: triage-gate.answered, to: is-accept }
  - { from: is-accept.true, to: s-impl }      # GUESS: stages 2–3 omitted here; in practice sub-workflows (type: workflow)
  - { from: is-accept.false, to: is-human }
  - { from: is-human.true, to: to-human }
  - { from: is-human.false, to: to-cancel }   # free text also lands here: acceptable for an intake gate
  - { from: s-impl.pass, to: implement }
  - { from: implement.done, to: push }
  - { from: push.done, to: pr }
  - { from: pr.created, to: ci }
  - { from: ci.green, to: review }
  - { from: ci.red, to: rounds }
  - { from: review.done, to: review-v }
  - { from: review-v.pass, to: is-pass }
  - { from: is-pass.true, to: accept }
  - { from: is-pass.false, to: is-block }
  - { from: is-block.true, to: blocked }
  - { from: is-block.false, to: rounds }
  - { from: accept.accepted, to: r0 }
  - { from: accept.rejected, to: rounds }
  - { from: rounds.repeat, to: fix }
  - { from: rounds.exhausted, to: blocked }
  - { from: fix.done, to: push }              # second git.push to the same branch; PR exists, so skip draft-pr
  - { from: r0.pass, to: is-auto }
  - { from: is-auto.true, to: merge }
  - { from: is-auto.false, to: merge-gate }
  - { from: merge-gate.approve, to: ready }
  - { from: merge-gate.reject, to: rounds }   # GUESS on policy: spec says MergeReview "changes" should not spend a round → use a separate loop
  - { from: ready.done, to: merge }
  - { from: merge.pass, to: ok }
  - { from: blocked.pass, to: stop }
```

About 80 lines. Points to note:
- `wait-ci` after `fix → push` relies on the PR already existing. Its `failed` port fires if there is no PR.
- `pr.failed`, `push.failed` and `ci.timeout` are left unwired, so they fail the run. That is acceptable: the run then
  shows red in "needs you".
- `merge.pass` means `gh pr merge --auto` was accepted. The actual landing happens in GitHub's merge queue, and a
  `pull_request.merged` automation starts the Watcher workflow (stage 8).

### Per stage and per rule

| Stage / rule | How | Class |
|---|---|---|
| 1 Intake | Agent + check (JSON, labels) + `ask-user` with 3 options + 2 `if` nodes | config + script |
| 2 Spec | Interviewer agent (asks mid-turn with `CEZ:ASK`), `git.commit`, `ask-user` approve/clarify, loop back | config |
| 3 Plan | Researcher only if L (`if` on the triage output), planner, **sub-issues and blocked-by through `gh api` in a check** (no node; grep `sub_issues` finds nothing), gate | config + script |
| 4 Implement, one sandbox per slice | `fork` is static with 2–4 branches (`graph.ts:117`). A frontier computed from blocked-by edges needs either a new `slices` node or an external dispatcher on `POST /api/v1/runs` | **core patch** (M–L), or an external service (M) |
| 5 CI + cross-family review | `github.wait-ci` native, `runner: codex` native, JSON through check + `if` | native + script |
| 6 Acceptance | Validator agent with verdicts; e2e recipes in `docs/e2e-verification.md` | config |
| 7 Merge | R0 rules script, `gh pr merge --auto` (GitHub merge queue), else `gate.human` | script + native |
| 8 Deploy and watch | `pull_request.merged` automation → watcher workflow; rollback = revert-PR script | config + script |
| 9 Learn | Scheduled automation → retro workflow; six-metric script over `.ai/cezar/runs/*.ndjson` | config + script |
| Shared limit of 3 rounds → Blocked | One `loop` node; the counter never resets inside a run (`graph.ts:11-12`). **Across** runs (stage workflows chained by labels) it needs a `round:n` label kept by a script | native (one run) / script (many runs) |
| Session time and cost limit = failed round | Only an inactivity timeout (`P/core/inactivity-deadline.ts:18`). `budgetUsd` on an agent node applies to fork branches only (`graph.ts:68`) | **core patch** (S–M) |
| At most 3 items wait for the Operator | Waits hold no slot by design | **core patch** (S) or an external gatekeeper |
| Pause all / cancel any | Cancel: native. Pause: none (per-automation only) | native / **core patch** (S) |
| Code picks the next step from JSON | Native verdict is a text token parsed by code (`graph.ts:275-293`); JSON = check + jq + `if` | script (patch S–M for first-class) |

**The 15 states** become `state:*` labels written by `scripts/state.sh <state>` check nodes. That script runs on the host
with the cezar user's `gh` login, or with a bound `GH_LABEL_TOKEN`. `CEZ_GITHUB_NUMBER` names the issue for
automation-launched runs (reference.md:405).
- Triaging is the trigger label.
- TriageReview, SpecReview, PlanReview and MergeReview are written just before the matching `ask-user` or `gate.human`.
- Blocked comes from `rounds.exhausted` or `block`.
- ForHuman and Cancelled come from the intake branches. A Cancel pressed in the UI does **not** run a node, so a
  `pull_request.closed`/issue automation or a reconcile cron must relabel.
- Live and Done come from the merged-PR automation; RolledBack from the revert script.

For Jira, use statuses through a check with a `checks` secret. Label writes are not supported natively
(earlier report §3.3).

## 5. Agents and models: 4/5

- **Runners:** 11, namely claude (Claude Code CLI, stream-json), codex (app-server protocol), opencode, copilot and
  junie (ACP), gemini and kimi (ACP), cursor, agy, omp, pi (`P/core/*-runner.ts`). The Claude Agent SDK is not used:
  it drives the CLI.
- **Model per node:** `runner:` + `model:` on every agent, dispatch and workflow node (`graph.ts:56-61`). There are model
  presets and an effort per task, and `CEZ_AGENT_MODELS_LOCKED` pins native config.
- **Subscription vs API key:** each runner uses the CLI's own login ("No API key needed", README). Exporting
  `ANTHROPIC_API_KEY` switches to API billing (reference.md:390). Several accounts are supported, with automatic
  fallback when usage runs out (0.19.0, opt-in), and plan-limit gauges are shown. **Unattended:** yes, headless, with
  `--permission-mode dontAsk` and a tool allowlist. Approval prompts are denied rather than surfaced
  (reference.md:548-556).
- **Session resume:** `session: { continue: <node> }` for claude, codex and pi. An interrupted agent node keeps
  Continue across restarts.
- **JSON verdict enforcement:** **none natively.** `verdicts: [...]` makes the agent end with `CEZ:VERDICT <name>` on
  its last line. A regex parses it against the declared names. With no verdict, the agent gets one reminder in the same
  session, then the node leaves by `failed` (`graph.ts:275-293`, `run.ts:7406-7428`). Code branches, never an LLM, but
  nothing validates a JSON body. Our way: the agent writes a file, then a check runs `jq -e` against the schema.
  Codex's `--output-schema` is not wired.
- **Why not 5:** no JSON verdicts; no per-node budget or time limit that fails the node; "unattended" means approval
  prompts are silently denied, which can stall a run on a tool that was not listed.

## 6. Sandbox and security seam: 1/5

**What an agent can reach today:**
- It runs as the cezar user on the host, `cwd` = the worktree, with unrestricted `Bash` by default.
- **Its environment keeps `GITHUB_TOKEN`, `GH_TOKEN`, `GH_CONFIG_DIR` and `HOME`** (`P/core/agent-env.ts:279-288`; the
  comment says this is deliberate). So it can push any branch, open PRs and `gh pr merge`.
- Its egress is open.
- **New finding: it can approve its own gate.** Agents get `CEZ_API_URL` (`P/workflows/run-env-keys.ts:9`). The API has
  no auth on loopback (reference.md:799). The request-origin guard passes any non-browser caller that sends no `Origin`
  header (`P/server/server.ts:1820-1870`: "no Origin at all for non-browser callers passes untouched"). Gate replies
  are classified from plain text (`gate-reply.ts`). So
  `curl -XPOST $CEZ_API_URL/api/v1/runs/$CEZ_TASK_ID/messages -d '{"text":"approve"}'` from inside the agent should
  pass a `gate.human`. The route shape is from reference.md:797; **not tested**.
- Check nodes run `bash -lc` on the host with secrets, executing code the agent just wrote.

**How to wrap every session in OpenSandbox or Matchlock (no fork):**
1. Set `CEZ_CLAUDE_BIN` and `CEZ_CODEX_BIN` to `sbx-run`. It starts a microVM per call. It mounts at identical paths:
   the worktree, the main repo's `.git` (a worktree's `.git` points there), `~/.cezar/tmp/agent/<project>/<task>`, the
   artifacts directory and the `--mcp-config` temp file. It also mounts a per-account Claude/Codex config directory so
   `--resume` works. It pipes stdio, which carries stream-json and app-server.
2. Inside the wrapper, drop `GH_*`, `GITHUB_TOKEN` and `CEZ_API_URL`, and use an empty `HOME`. Egress is allowed only
   to the model APIs (and the MCP endpoints we choose).
3. Pushes happen **from the host** through `git.push` and `github.draft-pr` (`run.ts:7900-7912`), so the VM needs no
   git credential, which matches decision 21.
4. Caveats:
   - Process reaping and memory sampling (`P/core/task-processes.ts`) see only the wrapper.
   - `cez task` and `cez tracker` inside the agent break when `CEZ_API_URL` is removed. We do not need them, but
     dispatch is on by default: set `CEZ_DISPATCH=0`.
   - Runners without the bin override would also need it: check that the 8 process runners read one each
     (reference.md:263-273).
5. When PR #2156 (`beforeAgent` admission hook) lands, it gives a fail-closed pre-session point for credential checks.

**Push token vs merge token:**
- The host `gh` login, used by `git.push`, `draft-pr`, `pr-update` and `wait-ci`, gets a fine-grained token with
  contents:write and pull-requests:write. A branch ruleset requires the merge queue, so this token cannot merge
  directly.
- `MERGE_TOKEN` is a `checks`-audience secret, bound only on the `merge` node.
- **Gotcha:** a check node *without* `secrets:` gets **every** `checks` secret, and `secrets: []` is invalid
  (`min(1)`, `packages/contract/src/secrets.ts:139`). So bind a harmless dummy secret on every other check, or keep
  `MERGE_TOKEN` outside cezar in a root-owned helper called through `sudo`.

**Telemetry and outbound calls:**
- Telemetry is opt-in. `CEZ_TELEMETRY=0` or `DO_NOT_TRACK=1` hard-blocks it (reference.md:578).
- The phone relay at `rome.cezar.run` stays off until a phone is paired; `CEZ_RELAY=0` and `CEZ_PUSH=0` block it.
- Skills auto-update from `open-mercato/skills`; `CEZ_SKILLS_AUTO_UPDATE=0` stops it.
- The star and banner fetch is stopped with `CEZ_NO_BANNER=1`. The self-update channel should be pinned.
- ADR 0002 covers outbound PII sanitization.

**Score 1:** there is no isolation at all, the GitHub credential is handed to agents on purpose, and the gate can
(likely) be self-approved. The seam to fix it without a fork is good (bin override plus host-side push), which is why
it is not 0.

## 7. Git and GitHub: 3/5

| Need | Status |
|---|---|
| PRs | Native: `github.draft-pr`, `pr-update` (ready, labels, reviewers), `pr-comment`; the cockpit opens PRs and shows review threads (`P/server/forge/github.ts`, 3.9k lines, via `gh`) |
| Checks / CI wait | Native `github.wait-ci` (green, red, timeout, failed; it polls) |
| Issue labels | **No node.** `pr-update.addLabels` is PR-only. Issue labels need a check script. Triggers on `issue.labeled/unlabeled` exist (polled) |
| Sub-issues, blocked-by | **None** (script with `gh api`) |
| Merge | A cockpit button merges a PR (`server.ts:7843`, with `expectedHeadSha`). "Nothing merges on its own" is product policy, so auto-merge = our script |
| Merge queue | None native. `gh pr merge --auto` delegates to GitHub's queue |
| Worktrees | Native, one per task, with retention and disk guards, lifecycle scripts, and trunk-based mode as an option |
| Multiple repos per project | **No**: a project is one repository. Several repos are grouped by tags and shown on All tasks (reference.md:263). Cross-repo items need one run per repo |
| Monorepo | Fine: `paths-changed` glob conditions, path-scoped checks |
| GitLab | Missing (`P/server/forge/index.ts:20`), seam `ForgeDriver` |

## 8. Operations: 3/5

- **Deploy on Linux:** `npx cezar-run server-install --platform ubuntu-vps` installs nginx, Let's Encrypt, an htpasswd
  login and a **systemd user unit** (`P/server-install/platforms/ubuntu-vps.ts`, 1.4k lines). It can also sit behind
  our own proxy (Traefik or Dokploy) with `--external-proxy --bind-host 172.17.0.1`. A second instance can run per
  domain. **No Docker image or compose file** in the repo, so Docker or Dokploy means writing our own Dockerfile. The
  agent CLIs and their logins must live in the same container.
- **Database:** none. State is files under `~/.cezar/` and `<repo>/.ai/cezar/` (NDJSON runs, JSON config, an encrypted
  secret store).
- **Resources:** one Node process plus one CLI process per running agent (`maxParallel`, default 2). Memory per run is
  sampled, and there is a CPU/RAM widget. Disk is dominated by worktrees, with retention guards.
- **Upgrades:** self-update follows npm channels (stable, nightly, development). Migrations run **on first read**
  (for example, Jira and Linear tokens moved into the vault in 0.19, and older binaries cannot read them afterwards).
  `BACKWARD_COMPATIBILITY.md` lists the routes, CLI and file formats it promises to keep.
- **Backup and restore:** no tool or doc. Back up `~/.cezar` and each repo's `.ai/cezar` (restic works). The secret
  key is a `0600` file on a server; lose it and the secrets are unreadable (reference.md:735).
- **Auth and multi-user:** none built in. One basic-auth login per instance through nginx. No users, roles, or record
  of who approved. Mobile login uses the OS keychain on the hosted cockpit.
- **Logs:** per-run NDJSON timeline plus journald for the service. No OpenTelemetry export.
- **Processes:** 1 server, plus agent CLIs, plus check shells. Managers and automations run inside the server.

## 9. Project health and trajectory: 4/5

**Maintainers:**
- pkarw 834 commits, pat-lewczuk 691, patzick 235 (earlier report). That is about 80% from two people and
  2–3 active core maintainers.
- In the last 100 PRs, patzick opened 43 and pat-lewczuk 32, plus 17 from two in-house bots.
- Only 8 of the 100 came from outsiders.

**Outsider PRs: 10 recent ones sampled** (`gh api`, 2026-11-21):

| PR | Opened | First human maintainer response | Outcome |
|---|---|---|---|
| #2360 | 11-20 | none yet (1 day) | open |
| #2311 Jira/Linear creds reuse | 11-18 | approve by pat-lewczuk after ~18 h | open |
| #2294 | 11-17 | none (CLA unsigned) | closed unmerged after 1.3 h |
| #2293 | 11-17 | changes requested by patzick after ~19 h | closed unmerged |
| #2288 | 11-17 | comment by patzick after ~1 h | open |
| #2285 | 11-17 | none (4 days) | open |
| #2284 | 11-17 | — | merged in 52 min (frequent contributor) |
| #2273 | 11-16 | none (5 days) | open |
| #2259 / #2258 | 11-16 | — | merged in 1.5–2 h (same contributor) |
| #2156 before-agent hook | 11-13 | none (8 days) | open |
| #2167 extensions (stack of 5) | 11-13 | only CodeQL bot | open |

Reading of the sample:
- Half get no human answer within days.
- Merged outsider work is concentrated in one or two regular contributors.
- Many outsider features land as "supersedes #N … via @pat-lewczuk", meaning a maintainer re-implements them
  (CHANGELOG 0.19.0).
- **A CLA is required** (CLA-assistant on every PR).
- 174 open issues and 203 open PRs (earlier report): the backlog is large.

**Releases and breaking changes:**
- Minor releases weekly or every two weeks: v0.17.0 10-29, v0.18.0 10-31, v0.19.0 11-08, v0.20.0 11-15. Desktop is a
  separate track, and there is a nightly channel.
- Breaking changes in the last 3 documented releases:
  - 0.19: tracker tokens moved to the vault (no downgrade), and tracker agents lost raw tokens;
  - 0.18: none listed;
  - 0.17: `GET /runs` no longer embeds `workflowDef`.
- `CHANGELOG.md` has no 0.20.0 section; its notes are only on the GitHub release.

**Roadmap, community, docs:**
- There is no ROADMAP file. The direction shows in `.ai/specs/` (148 specs) and in open stacks: extensions and chat
  bots (Telegram, Slack, Discord), managers (long-lived supervising agents), native mobile apps, a hosted cloud
  sandbox (README banner to openmercatocloud.com), and Assess Impact.
- Discussions are enabled. No Discord link was found in the README or the docs source.
- 1,118 stars and 190 forks in 6 months. The trend was not measured.
- The docs are good: 212 site pages, a long reference, and a backward-compatibility contract.

**Direction vs ours:** it is heading towards an interactive, always-on **cockpit for one developer with many agents**,
plus "managers" that propose and a human who clicks. That matches our Operator-in-the-web-UI and gate model well.
It diverges on:
- (a) a tracker-driven work-item state machine, which upstream does not model;
- (b) hard isolation, where upstream treats the agent as trusted and keeps `gh` in its env on purpose;
- (c) auto-merge, where "nothing merges on its own" is a product stance.

The hosted cloud sandbox is a commercial direction that may pull sandboxing into the paid offering rather than the
OSS core. That is a guess.

## 10. Risks over one year

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Agent escapes its role**: host `gh` token, open egress, and likely self-approval of gates through the unauthenticated loopback API | Before the first real repo, put the bin-override microVM wrapper in place: strip `GH_*` and `CEZ_API_URL`, empty `HOME`, egress allowlist. Run cezar as a dedicated user. Use a fine-grained push token without merge rights plus branch rulesets. Turn off `CEZ_DISPATCH` and managers. Later, upstream a per-run API token |
| 2 | **Churn in the two god files** (`run.ts` 11k, `server.ts` 10k, about 100+ commits a quarter) breaks any patch we carry | Keep logic in YAML, checks and an external dispatcher. Limit patches to small, generic upstream PRs (global pause, operator cap, per-node `mcp`, `budgetUsd`/`timeoutMs`, `verdictFile`). Pin versions and upgrade monthly after reading the release notes |
| 3 | **Upstream will not take our PRs, or takes them slowly** (half of outsider PRs unanswered for days, a CLA, maintainers re-implementing) | Open an issue with a spec first, in their `.ai/specs` style. Sign the CLA. Accept re-implementation. Keep each change behind a default-off flag so a short-lived patch branch stays small |
| 4 | **The state machine lives outside the engine**: Cancel in the UI or free-text gate replies leave labels stale; round counters reset across runs | One long run per item where possible (one shared `loop`). A reconcile cron that compares `state:*` labels with run status. Gates driven by buttons only. A `round:n` label when stages are split |
| 5 | **Single-user, file-state ops**: no RBAC, no audit of who approved, no Docker image, migrations on first read with no downgrade | Basic auth or our SSO proxy in front. Nightly restic of `~/.cezar` and `.ai/cezar` together with the key file. Our own Dockerfile. Test each upgrade on a copy of the state directory before production |

## Bottom line

cezar has the best Operator surface of any engine I have read: a needs-you queue, in-place gate answers, diff, cost
per node, phone-ready layout and a node editor. Its graph covers our intake, fix loop and merge with scripts and no
fork. What it lacks is everything that makes an unattended agent safe:
- isolation;
- separated credentials;
- an authenticated control API;
- hard per-session limits;
- the pause and the cap;
- a dynamic slice frontier.

Each of these is a small to medium change through a good seam, but upstream has not taken any of them yet.
