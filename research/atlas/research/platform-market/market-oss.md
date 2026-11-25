# Open-source market scan: platforms for the pipeline, weighted on the decision card, multi-repo and no fork

Read 2026-11-26. Primary sources only: repository code and docs from shallow clones (read only, nothing run) or `gh api`, plus `gh api` metadata. Yardstick: `research/atlas/research/2026-11-platform-requirements.md` (M1–M10 must, S1–S7 should; 0 absent, 1 possible with substantial work of ours, 2 present with gaps, 3 present as needed). It re-scores the strongest engines from the 2026-11-21 study (`2026-11-engine-choice.md`), which weighted the decision UI and multi-repo lightly, and adds candidates that study missed or that appeared later. There are about 50 candidates in total. Every candidate was read once by one reader. The paperclip, Archon, agent-swarm, t3code and Kandev claims behind the ranking were spot-checked in the source a second time. No skeptic pass was run.

Every nonzero score has its source file or URL in the appendix (per-candidate sections). The date read is 2026-11-26 unless the appendix says otherwise.

## Answer

1. **Five candidates already score at least 2 on every "must": Archon, agent-swarm, Kandev, t3code and MAIster.** None scores 3 on M3, M4 and M10 together.
2. **Only one shipped decision card meets M3 as is: paperclip.** Its card bodies and question prompts go through `MarkdownBody.tsx`: GFM tables, links and lazy-loaded mermaid. Options are buttons with descriptions on the same card, with a `recommended` flag and free text (`allowOther` / `freeText` returned as `otherText`). The answer and who answered are recorded on the issue thread. Sources: `ui/src/components/IssueThreadInteractionCard.tsx`, `PromptText.tsx`, `packages/shared/src/validators/issue.ts`. paperclip has no workflow engine (M1 = 1).
3. **Cards that render markdown on the card itself:**
   - **t3code**: `ask()` with `data.body` goes through `ChatMarkdown`, with tables, mermaid and `<details>` (`apps/web/src/components/workflows/WorkflowRunFeed.tsx:1968`). The field is undocumented.
   - **agent-swarm**: question and option text go through Streamdown with GFM and raw HTML (`apps/ui/src/components/shared/questions/question-card.tsx:82`). A versioned JSON "App" page can place the live `Approval` next to Chart, Markdown and Accordion components.
   - **Mastra Factory, Kandev, Microsoft Conductor, wicked-studio, Sculptor**: GFM markdown without diagrams.
   - **Every other card is plain text.**
4. **A no-fork UI extension point that can draw our own card exists in five places:**
   - **Kandev**: plugin web apps on `task-canvas`, which answer through `HostHumanResponseDelegation` (`docs/public/plugins-authoring.md`, status experimental).
   - **agent-swarm**: Apps pages (beta).
   - **paperclip**: plugin UI slots. They feed the card but cannot replace it.
   - **OpenHands**: Canvas Extension pages, which are pages only, not in the chat.
   - **Goose**: MCP Apps iframes. Goose has no engine.
   - **Nowhere else**: Archon, Kraft, Fabro, MAIster, fishhawk, LoopForge, cezar, Mastra, t3code and the rest have none.
5. **Native "one item, one PR in each of several repos":**
   - **Native**: Kandev (ADR 0013), LoopForge (`deliveryMrs` per repo), Blazity and open-inspect/background-agents (up to 10 repos per session).
   - **Fan-out code of ours on a multi-repo project**: agent-swarm, t3code, paperclip, Archon and Mastra.
6. **Archon changed under us.** Version 0.15.0 (2026-11-25) ships a structured attention card in `AttentionAnswerPanel.tsx`:
   - options with `does` and `cost`
   - a recommendation with confidence
   - "Other" with free text, all on one card
   
   The message body is still plain text: `PendingInputBanner.tsx:145` and `ApprovalContext.tsx:88` use `whitespace-pre-wrap`, not the react-markdown the console already uses for chat. There is no mermaid and no UI extension point. The 2026-11-25 trial may have run on an earlier version.
7. **Out on a must that cannot be fixed from our repo:**
   - Microsoft Conductor: M9 0, a CLI with a per-run dashboard.
   - cline/kanban: M3 0, M9 0.
   - Kilo Code: M9 0.
   - OrchestratorInc/agent-orchestrator (the former ComposioHQ repo): M3, M9 and M10 all 0.
   - Claude Squad, AutoForge (no longer maintained), Terragon (shut down, snapshot), Roo Code (archived), Vibe Kanban (sunsetting).
   - conductor.build: closed source.
   - Crystal: deprecated, now Nimbalyst, a desktop editor.
   - Sculptor, Paradev, Happy: desktop tools with no engine.
   - turbo, mavericks-os, thruwire/foreman: no server.
   - andon: single owner, PRs not accepted.

## Score matrix (the candidates that matter)

M1–M10 are musts, S1–S7 are shoulds. A dash means not scored (out for another reason).

| Candidate | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | S1 | S2 | S3 | S4 | S5 | S6 | S7 | Licence | Stars | Activity, outside PRs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Archon 0.15.0 (baseline) | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2 | 3 | 2 | 1 | 2 | 2 | 2 | 3 | MIT | 24,003 | daily; 88 contributors, last 30 merged all by one maintainer |
| Kandev | 2 | 2 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 2 | 2 | 2 | 0 | 2 | 2 | 1 | 2 | AGPL-3.0 | 1,183 | daily; 92 contributors, outside PRs merged |
| agent-swarm | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 2 | 1 | 3 | 2 | 1 | 3 | MIT | 1,122 | daily; 70 contributors, 23 of last 30 merged by its bot, 1 outside |
| t3code | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 2 | 2 | 3 | 1 | 1 | 1 | 2 | 1 | 3 | MIT | 79,272 | daily; 481 contributors, outside PRs merged; workflows are a "Labs" feature |
| MAIster | 3 | 3 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 2 | 2 | MIT | 11 | daily; 3 contributors, beta |
| paperclip | 1 | 3 | 3 | 2 | 1 | 2 | 3 | 2 | 3 | 2 | 3 | 3 | 1 | 3 | 2 | 2 | 3 | MIT | 117,014 | daily; 262 contributors, staff-dominated merges |
| OpenHands (Agent Canvas, SDK, automation) | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 2 | 3 | 2 | 1 | 2 | 1 | 1 | 2 | MIT; Enterprise is PolyForm Free Trial | 94,330 | daily; staff and bots |
| Mastra Factory | 2 | 1 | 2 | 2 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 3 | Apache-2.0 (package); repo has `ee/` | 29,817 (mastra) | daily; 466 contributors, outside PRs merged |
| wicked-studio + wicked-crew | 2 | 2 | 2 | 1 | 2 | 2 | 3 | 2 | 2 | 2 | 1 | 2 | 0 | 2 | 1 | 0 | 2 | MIT | 174 / 0 | daily; one maintainer (30 of 30 merged) |
| Gas City | 3 | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 2 | 1 | 1 | 3 | MIT | 1,585 | hourly; 202 contributors, a few outside merges |
| LoopForge | 2 | 2 | 1 | 3 | 1 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 0 | 2 | 2 | 1 | 2 | MIT text, GitHub shows NOASSERTION | 6,091 | daily; mirror of a private upstream |
| SuperPlane | 2 | 2 | 1 | 2 | 2 | 3 | 2 | 3 | 3 | 1 | 3 | 2 | 3 | 2 | 2 | 1 | 2 | Apache-2.0 plus proprietary `/ee` | 10,136 | daily; staff only |
| Kraft | 2 | 2 | 1 | 2 | 2 | 3 | 3 | 2 | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 3 | Apache-2.0 | 16 | daily; 29 of 30 merged by the owner |
| Fabro | 3 | 3 | 1 | 1 | 2 | 2 | 3 | 3 | 1 | 2 | 2 | 3 | 1 | 1 | 2 | 2 | 3 | MIT | 1,893 | weekly; mostly one maintainer |
| AWS cli-agent-orchestrator | 3 | 2 | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 2 | 0 | 2 | 1 | 2 | 2 | Apache-2.0 | 1,681 | daily; outside PRs merged |
| Goose | 1 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 3 | 2 | 1 | 0 | 1 | 0 | 1 | 3 | Apache-2.0 (Linux Foundation) | 56,991 | daily |
| Microsoft Conductor | 3 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | **0** | 3 | 1 | 2 | 0 | 1 | 0 | 2 | 3 | MIT | 507 | daily; outside PRs merged |
| Zeroshot | 3 | 2 | 1 | 1 | 1 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 0 | 1 | 0 | 1 | 3 | MIT | 2,227 | daily; few outside merges |
| Optio | 1 | 2 | 1 | 1 | 2 | 2 | 3 | 2 | 2 | 2 | 3 | 2 | 1 | 2 | 3 | 0 | 3 | MIT | 1,117 | weekly; owner wrote 21 of the last 30 merged |
| cezar | 2 | 2 | 1 | 1 | 2 | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 3 | MIT | 1,152 | daily; rare outside merges |
| fishhawk | 2 | 2 | 1 | 1 | 2 | 3 | 3 | 3 | 1 | 2 | 2 | 3 | 3 | 2 | 1 | 1 | 2 | Apache-2.0 | 9 | daily; outside feature PRs refused |
| Sortie | 2 | 2 | 1 | 1 | 3 | 2 | 1 | 2 | 1 | 2 | 3 | 2 | 1 | 0 | 2 | 1 | 3 | Apache-2.0 | 226 | weekly |
| Bernstein | 2 | 2 | 1 | 1 | 1 | 2 | 2 | 1 | 1 | 2 | 1 | 3 | 0 | 1 | 1 | 3 | 2 | Apache-2.0 | 1,230 | daily; solo-maintained beta |
| KaaS Factory | 2 | 2 | 1 | 1 | 3 | 3 | 2 | 2 | 1 | 2 | 3 | 2 | 0 | 2 | 0 | 1 | 1 | Apache-2.0 plus proprietary `ee/` | 0 | one author |
| Blazity ai-workflow | 2 | 2 | 1 | 3 | 2 | 2 | 2 | 2 | 1 | 1 | 3 | 3 | 0 | 2 | 2 | 2 | 1 | MIT | 19 | idle since 2026-10-09 |
| open-inspect/background-agents | **0** | 2 | **0** | 3 | 2 | 3 | 3 | 2 | 3 | 1 | 3 | 2 | 0 | 2 | 2 | 1 | 3 | MIT | 3,512 | daily; mixed contributors |
| openfabriq | 3 | 2 | 1 | 1 | 2 | 3 | 3 | 2 | 1 | 2 | 3 | 2 | 1 | 1 | 1 | 0 | 2 | Apache-2.0 | 36 | 10 days old |
| Vibe Kanban | 1 | 1 | 1 | 2 | 1 | 2 | 2 | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | Apache-2.0 | 28,814 | sunsetting (README) |

The bolded zeros cannot be fixed from our repository. The small and dead candidates are in the appendix: Claude Squad, conductor.build, Terragon, Sculptor, Crystal and Nimbalyst, Roo, AutoForge, Paradev, Happy, cline/kanban, Kilo Code, OrchestratorInc/agent-orchestrator, thruwire/foreman, andon, pullboard, CodeAF, lemma-platform, turbo, hivemill, mavericks-os, ai-sdlc-factory and Commonly.

## How a human decision is shown (M3 detail)

| Candidate | Component | Body format | Options and answer on the card | Free text | Who shapes it |
|---|---|---|---|---|---|
| paperclip | `IssueThreadInteractionCard.tsx`, `MarkdownBody.tsx` | GFM tables, links, mermaid; no raw HTML, so no `<details>` in the body | yes: buttons with descriptions and a `recommended` flag; the answer stays on the thread with who answered | `allowOther` / `freeText` gives `otherText` | our agent or plugin creates the card through the API (`issue.interactions.create`); the card itself cannot be replaced |
| t3code | `WorkflowRunFeed.tsx` (`FeedCard tone="ask"`), `ChatMarkdown.tsx` | `data.body`: tables, mermaid, `<details>`, math, alerts | yes: choices with descriptions; `answeredBy` is a device or tool | only a reason tied to a choice (`requireReason`) | the workflow author sets title, choices, `data.body` and links; `data.body` is undocumented |
| agent-swarm | `question-card.tsx` (Streamdown), `json-render/approval.tsx`, App `catalog.ts:1718` | GFM, links, images, raw HTML; no mermaid on the card; the App page adds Chart and Accordion around the live `Approval` | yes: approvers, quorum, responder recorded, Slack buttons | yes | the author writes markdown questions; an App page is versioned JSON (beta) |
| Kandev | `clarification-input-overlay.tsx`, `clarification-markdown.tsx` | GFM subset with an element allow-list (tables, links); no code, mermaid or `<details>` | yes: options with descriptions | custom text, up to 2000 characters | the agent fills it through `ask_user_question_kandev`; our plugin web app (canvas) can draw any card and answer through `HostHumanResponseDelegation` |
| Archon 0.15.0 | `AttentionAnswerPanel.tsx`, `PendingInputBanner.tsx`, `ApprovalContext.tsx` | plain text (`whitespace-pre-wrap`) | yes: `does`, `cost`, recommendation with confidence | an "Other" option with required text | the workflow YAML sets the message, options and recommendation; no UI extension |
| Mastra Factory | `SubmitPlanCard.tsx`, `AskUserPromptAnswers.tsx` | the plan is GFM in a collapsible box; question text is plain | Approve/Reject on plans; questions have options with a recommended hint | yes | payload only; factory-ui is internal |
| Microsoft Conductor | `GateDetail.tsx` | GFM tables, links, file paths (Jinja template) | yes: options with descriptions | yes (`prompt_for`) | the workflow author writes the prompt template |
| MAIster | `hitl-decision-controls.tsx` | plain question; mermaid only in other views | yes: options with consequences and a recommended tag; forms | yes, on forms | decision and form schemas |
| OpenHands | `decision-card.tsx` (experimental flag) | plain, 300-character question | yes: options with consequences, recommended, answered state | yes | the LLM raises it through `ask_user`; a Canvas Extension page can be ours |
| wicked-studio | `GateRow.tsx` | GFM; shows the first 4 lines of the output | yes: options with effects, recommended, 10-second undo | a note | fixed in code; plugins draw other panels |
| Goose | `McpAppRenderer.tsx` | whatever HTML our MCP App returns | ours | ours | fully ours, but in a desktop client with no engine |
| Others (Fabro, Kraft, LoopForge, cezar, Zeroshot, Blazity, fishhawk, Bernstein, SuperPlane, Optio, KaaS, Sortie) | see appendix | plain text, or a tracker comment | partly | partly | no |

## Candidates that pass every must, or can with work in our repo, ranked

Ranking weight: M3, M4 and M10 first (the Operator's three asks), then no must below 2, then project health.

1. **Kandev** (AGPL-3.0, 1,183 stars, 92 contributors, outside PRs merged).
   - **Strengths:** the only candidate with both native multi-repo items with a PR per repo (M4 3) and a no-fork route to a fully custom decision card: a plugin web app in our repo that lists and answers pending requests. Workflow YAML syncs from our git repo (Workflow Sync).
   - **Biggest gap:** routing is static `move_to_step` on a completion signal, not an enum verdict. Our gate and verdict logic would be a plugin or MCP tool of ours.
   - **Also:** the plugin API is marked experimental, and AGPL applies if we modify the host.
2. **agent-swarm** (MIT, 1,122 stars).
   - **Strengths:** every must at 2. Markdown cards with tables and `<details>`. An App page can combine Chart, Markdown and the live `Approval`. Extension bundles (workflows, scripts, skills) install by API.
   - **Biggest gap:** no mermaid on the card (we would pre-render SVG), Apps are beta, the bundle is stored in the platform DB, and one task is one repo (fan-out is ours).
   - **Health:** commits are mostly by its own bot, and outside merges are rare.
3. **t3code** (MIT, 79k stars, 481 contributors).
   - **Strengths:** the best card rendered natively for a workflow author: mermaid, tables, folds and options on one card. Workflows are TypeScript files in our repo with schema-checked agent results (M1 3), plus durable waits and per-item dedupe (M8 3).
   - **Biggest gap:** workflows are a "Labs" (early) feature and `data.body` is undocumented. There is no UI extension point, so the card shape is whatever upstream renders. Identity is per device or scope, not users and roles (M9 2).
4. **paperclip** (MIT, 117k stars).
   - **Strengths:** the only M3 3 as shipped, users and roles (M9 3), and a real plugin SDK (jobs, events, DB, UI slots).
   - **Biggest gap:** no workflow engine (M1 1). Agents choose their next step, so our nine stages, verdict routing and fix rounds would be a plugin we write. Tracker intake is unverified (M5 1). It is built to "run a company of agents", a different mental model.
5. **Archon, staying** (MIT, 24k stars).
   - **Strengths:** every must at 2 or above, and 0.15.0 already has the structured card.
   - **Biggest gap:** the body is plain text, and there is no UI extension point. The smallest fix is an upstream PR that renders `attention.message` through the console's existing react-markdown plus mermaid. The alternative is our own card UI over its REST/SSE API.
   - **M4:** stays agent-driven git in a folder project.
6. **MAIster** (MIT, 11 stars, 3 contributors).
   - **Strengths:** every must at 2 or above. The strongest governance (RBAC, Postgres, typed flows) and structured option cards.
   - **Biggest gap:** maturity (bus factor 1–2), a plain card body with no UI extension, and multi-repo as related tasks, not one item.

Near misses (one or more musts at 1, fixable only with substantial work):
- **OpenHands:** OSS self-hosting has one shared API key and no users or roles (M9 1); roles are proprietary Enterprise. A script run does not wait days at a gate (M8 1).
- **Mastra Factory:** no model or limits per phase (M2 1), and the card cannot be shaped without forking factory-ui.
- **wicked-studio:** a run has one `repoRef` (M4 1), and it is a one-maintainer project.
- **Gas City:** no decision card at all (M3 1). We would build the whole card app over its OpenAPI.
- **LoopForge:** an escaped plain-text card in an embedded UI with no plugin API (M3 1, M10 1), although its multi-repo is the best.
- **SuperPlane:** the approval node is approve/reject plus a comment, and components are compiled Go (M3 1, M10 1).
- **AWS CAO:** a plan-id approval form only, and one project root per run (M3 1, M4 1). It is a good code-driven workflow core.
- **Goose:** no engine (M1 1, M8 1, M9 1). It is a good MCP App card host.
- **Kraft:** approve/reject only, and a single password (M3 1, M9 1).
- **Fabro:** a plain dock, one origin repo, no roles (M3 1, M4 1, M9 1).
- **Zeroshot:** a plain card answered from the CLI, and single user (M3 1, M9 1).
- **Optio:** a fixed state machine and no card (M1 1, M3 1).

Suggested next step (not done here): try the top three hands-on with one real multi-repo item and one decision card. That means Kandev with a canvas plugin, agent-swarm with an App page, and t3code with `data.body`. In parallel, ask Archon upstream whether it would take markdown in the attention card.

## Caveats

- Each candidate was read once by one reader. The ranking claims for paperclip, Archon, agent-swarm, t3code and Kandev were spot-checked a second time in the source. Nothing was run.
- Scores lean on docs where code was not read. The appendix marks these as "skim", "tree only" or "not verified".
- `gh search code` was rate-limited for part E2.
- Not verified: Jira intake in paperclip, t3code and agent-swarm; whether the 2026-11-25 Archon trial ran on 0.15.0; Kandev plugin canvas behaviour in practice; agent-swarm Apps embedding `Approval` end to end; wicked-crew's workflow load path.

---

# Appendix: per-candidate detail with sources

The sections below are the reader reports, unchanged. Paths are inside each candidate's repository.


## Appendix part A

### Market scan part A (read 2026-11-26; shallow clones in scratchpad/clones-A, source read only, nothing run)

Common metadata (gh api, 2026-11-26). "Outside PRs" = authors of the last 30 merged PRs.

| Repo | License | Stars | Created | Last push | Last 3 commits (default branch) | Contributors | Outside PRs merged? |
|---|---|---|---|---|---|---|---|
| coleam00/Archon (branch dev) | MIT | 24003 | 2025-02-07 | 2026-11-25 | 11-25, 11-25, 11-25 | 88 | Last 30 merged are all by one maintainer (Wirasm); 88 contributors overall, so older outside merges exist but the recent flow is maintainer-only |
| itsOmidKarami/kraft | Apache-2.0 | 16 | 2026-09-09 | 2026-11-25 | 11-25 x3 | 17 | 29 of 30 by owner, 1 outside (IG-ABHINAV) |
| fabro-sh/fabro | MIT (LICENSE.md, Lithos Computer Co.; no EE dir found) | 1893 | 2026-03-13 | 2026-11-23 | 11-20 x3 | 27 | Mostly 1 maintainer (swerner 23) plus brynary, jsom, bot; no clear outside authors |
| microsoft/conductor | MIT | 507 | 2026-02-02 | 2026-11-25 | 11-20 x3 | 35 | Yes: jrob5756 17, plus pcbeingused333 6, hertznsk 2, Mapel, Mattbusel, Shazwazza, dependabot |
| maister-dev/maister | MIT | 11 | 2026-09-05 | 2026-11-23 | 11-23 x3 | 3 | 2 authors (kanischev 20, Casepl 10), both internal |
| kuhlman-labs/fishhawk | Apache-2.0 (+NOTICE) | 9 | 2026-04-30 | 2026-11-25 | 11-25 x3 | 3 | Bot app/fishhawk-dev 25, owner 5; CONTRIBUTING says no feature PRs from outside (pre-alpha) |

Archon repo version at read: 0.15.0 (CHANGELOG 2026-11-25), clone of dev at c87f325.

---

#### 1. coleam00/Archon (baseline)  https://github.com/coleam00/Archon
Open-source "harness builder": YAML workflows (DAG nodes: prompt, command, script, loop, wait) run by AI providers, web console + CLI + chat adapters.

**Workflow definition:** YAML in the repo (`.archon/workflows/`, packs `.archon/packs/*.yaml`, plugin kind `workflow-pack`). Next step by `when:` expressions over node output; `output_format` JSON Schema is SDK-enforced on Claude/Codex/OpenCode (docs `reference/workflow-language.md` lines 109, 124). So verdict-from-JSON: yes.

**Decision UI (M3), real components in the dev branch** (`packages/web/src/experiments/console/`, the "console" is still under `experiments/`):
- Attention wait (`wait: { attention: <message>, form: approval|select|multi_select|message, options, other, recommendation }`, docs `guides/approval-nodes.md`) is rendered by `components/PendingInputBanner.tsx` lines ~140-148 and `components/AttentionAnswerPanel.tsx`.
  - Question text: `<p className="whitespace-pre-wrap">{run.attention.message}</p>` = plain text, no markdown.
  - Options: buttons ON the same card, option `label`, `does`, `cost` shown as a list, `recommendation {option, confidence, why}` shown as "Recommended: X (high confidence). why" and a ring on the button; `other: true` adds a reserved "Other" option that requires text; a textarea for optional text; multi_select checkboxes. (`AttentionAnswerPanel.tsx` `AnswerSummary` and `AttentionAnswerForm`.) This already matches M3's "options with effects, recommendation with confidence, free text other" except for rich rendering.
  - Legacy `approval:` gate: `components/ApprovalPanel.tsx` (approve button + comment input + author-declared decisions; reject two-step with textarea) and `components/ApprovalContext.tsx`, which shows the last agent text event in `<div className="markdown-preview whitespace-pre-wrap">{showFull}</div>` = still plain text (class name suggests markdown, but it is not passed through ReactMarkdown), collapsible "Show full message".
- Markdown renderer exists in the same console but is NOT used for gates: `MessageItem.tsx` (chat) and `ArtifactPanel.tsx` (`.md` artifacts) use react-markdown + remark-gfm + remark-breaks + rehype-highlight (`packages/web/package.json`). No mermaid anywhere in `packages/web` (grep). No raw HTML.
- Author shaping: only message text (with `$node.output` refs), options, `does`/`cost`, recommendation. No template/HTML/component.
- UI extension point: none. Plugin manifest kinds are only `provider`, `chat`, `forge`, `workflow-pack` (`packages/plugin-manifest/src/index.ts` lines 79-132; comment line 64 "a kind joins this schema when its install path and wire contract exist"). The web UI is in-tree React; our option is a separate UI over Archon's REST/SSE API (`reference/api.md`) or an upstream PR.
- Net change vs the Operator's 2026-11-25 trial: the structured card (options, effects, recommendation, other) now exists in 0.15.0; the missing part is markdown/diagram body and any UI extension point. Confirm the version we ran: if the trial predates 0.15.0 (2026-11-25), M3 is partly already addressed upstream.

**Multi-repo (M4):** many projects per install: yes (project registry, web "Add Project", CLI). One work item over several repos: only as a "folder project" (a root dir holding N repos; no worktree/branch/PR management by Archon, the agent runs git/gh itself per service; `guides/multi-repo-projects.md` "Not a fit for: Archon-managed branching/PRs spanning child repos"). Child runs exist (`child-runs.ts`, fan-out) and each child resolves its own isolation (`child-isolation.ts`), so a parent workflow could in principle fan out one child per repo project; not documented as cross-project (not verified).

**Scores**
- M1 3 - `reference/workflow-language.md` l.109,124 - YAML in repo, `when:` on JSON output, loops with limits.
- M2 3 - same file l.122-129 - per-node provider/model/skills/idle_timeout; multiple providers (`plugins/provider-*`).
- M3 2 - `PendingInputBanner.tsx`, `AttentionAnswerPanel.tsx`, `ApprovalContext.tsx` - structured card with options/effects/recommendation/other on one card, but plain-text body (no tables, links, diagrams, folding of evidence beyond "show full").
- M4 2 - `guides/multi-repo-projects.md` - many projects yes; multi-repo item only by agent-driven git in a folder project, no PR-per-repo orchestration.
- M5 3 - `.archon/workflows`, adapters/forge docs `adapters/github.md`, `reference/forge.md` - GitHub adapter and forge plugin; Jira not verified (done via MCP in our pipeline).
- M6 2 - `reference/forge.md` - PR creation exists; protection rules are our workflow's job.
- M7 3 - `guides/worktrees.md`, `guides/container-isolation.md` - worktree per run, container isolation.
- M8 3 - `reference/database.md`, `guides/approval-nodes.md` ("The pause is durable") - durable waits, resume.
- M9 2 - our decision 64 relies on Archon users/roles; docs `reference/security.md` not re-read here, so unverified in this pass.
- M10 2 - `packages/plugin-manifest/src/index.ts` - workflow packs, commands, scripts, skills live in our repo (`.archon/`); but UI cannot be extended without forking or contributing upstream.
- S1 3 - `guides/workflow-triggers.md`, `guides/proactive-workflows.md` - triggers and schedules.
- S2 2 - `guides/metrics.md` - cost and run metrics; per-role model recording not re-checked.
- S3 1 - none native; our own workflows.
- S4 2 - chat adapters (`chat-slack`, web chat, `ChatComposer.tsx`) - chat exists; the Supervisor is ours.
- S5 2 - `plugins/chat-slack`, `AttentionAlertsPanel.tsx` - attention queue and Slack; link-to-card not verified.
- S6 2 - `docs reference/workflow-language.md` l.263 "--pause-at-gates" simulation; stub verdicts are ours (we built them).
- S7 3 - MIT, 24k stars, pushes daily (gh api).
Verdict: baseline; passes every must except M3 rich body and M4 PR-per-repo, both reachable only partly in our repo (M3 needs upstream change or our own UI over the API).

---

#### 2. itsOmidKarami/kraft  https://github.com/itsOmidKarami/kraft
Local orchestrator (Python, FastAPI + React SPA, SQLite) taking a coding agent from spec to MR through YAML "chains" of nodes and gates; single-user, local by design.

**Workflow definition:** YAML chains/library in the config dir (`~/.kraft/config/chains/*.yaml`, `library.yaml`), shareable via add-ons (git collections, `addons.yaml`/lock) (docs `3.guides/2.customize/*`, `5.reference/03.configuration/12.addons.md`). Next step: nodes write a result file (`04.chain-nodes/4.result-file.md`): gate `auto_review` returns `approve/reject/fixed/undecided` JSON; reject target is declared in the chain; code routes, not prose.

**Decision UI:** `frontend/src/ng/item/panes/GatePane.tsx` (gate pane; plus `phone/review/GateReview.tsx`, `review/*` diff/threads). A gate decides on a document (spec, plan, local review): verbs are Approve or Request changes with a note (README). Body: `frontend/src/ng/ui/Markdown.tsx` = react-markdown + remark-gfm only (tables ok; remote images blocked as links by design; no mermaid, no raw HTML; shiki for code). No author-defined options (fixed approve/reject, reject target set in chain); free-text note only; no recommendation/confidence field. Not shapeable by the author beyond the gate document's markdown. No UI extension API (theme config `09.theme.md` only).

**Multi-repo:** many repos connected (`kraft repo connect`, `repos.yaml`); one item over several repos via "workspaces" = root repo with member repos as submodules (`3.workspaces.md`); items with workspace members stay on the local worker; each member repo gets its own push and merge request ("each repo's bot is waited for against that repo's own push", `2.concepts/6.how-review-and-ci-waits-settle.md`). Requires submodule layout, which we would have to adopt.

**Scores**
- M1 2 - `3.guides/2.customize/1.write-your-own-chain.md` - YAML chains, subprocess and agent tasks, fix loops, caps; chain is code-routed but node set is Kraft's closed set.
- M2 2 - same guide (`harness`, `profile`, `prompt` per task) - per-task harness/profile; several harnesses (`05.harnesses`); limits per node.
- M3 1 - `frontend/src/ng/ui/Markdown.tsx`, `GatePane.tsx` - markdown+GFM document but only approve/reject, no option cards, no recommendation; we would need to add it in a fork.
- M4 2 - `3.workspaces.md` - multi-repo item with a PR per member; submodule-based only; single install many repos OK.
- M5 2 - `5.reference/03.configuration/07.intake.md`, `16.forges.md` - GitHub and GitLab (merge requests); Jira not verified.
- M6 3 - `16.forges.md`, README (never skips CI, draft MR) - branches, draft MR, CI wait.
- M7 3 - README (worktree per item) and `10.sandbox/*` - worktrees plus sandbox with network policy.
- M8 2 - `5.architecture.md` "what a restart does to running items" - SQLite state, resumes; long waits fine; no cap on waiting items verified.
- M9 1 - `06.access.md` - single password, no users/roles; answer authorship not tracked per person.
- M10 2 - add-ons (`12.addons.md`) cover chains, library, skills, profiles in our repo; UI not extensible.
- S1 2 - `3.guides/2.customize/3.schedule-and-webhook-work.md` and `07.triggers.md` - schedules/webhooks.
- S2 2 - `5.reference/10.events.md`, `8.analytics.md` - events and analytics.
- S3 1 - none seen.
- S4 2 - `09.mcp-tools.md` - MCP tools for an outside agent; not a chat assistant.
- S5 2 - `08.notify.md` - notifications.
- S6 1 - `harnesses/review.test.tsx` and simulated-agent demo (README) - a simulated agent exists, stub verdict injection not verified.
- S7 3 - Apache-2.0, pushes daily; 16 stars, 17 contributors, 3 months old (young project risk).
Verdict: could pass with work, but M9 (single user, local-first) is weak and M3 needs a fork-level UI change. Closest to a "local developer tool", not a team server. Not recommended over Archon.

---

#### 3. fabro-sh/fabro  https://github.com/fabro-sh/fabro
Rust server + React web: workflows as Graphviz DOT graphs plus TOML run config, "software factory", sandboxes (Docker/Daytona), MIT.

**Workflow definition:** `.fabro/workflows/<name>/workflow.fabro` (DOT) + `workflow.toml` in our repo (repo has `.fabro/workflows/interview/`). Next step: deterministic edge selection by condition on node outcome (`succeeded/failed/...`), preferred label from human gate, `jump_to_node`, weights (`docs/public/workflows/transitions.mdx`). Outcome conditions can be on context values; JSON-verdict-to-edge via context keys is possible (not fully verified).

**Decision UI:** `apps/fabro-web/app/components/interview-dock.tsx` (+ `run-dock.tsx`, `review-target-question.tsx`, history `stage-renderers/human-qa.tsx`). Human gate = DOT node `shape=hexagon`; options = outgoing edge labels with `[A]` accelerators, `freeform=true` edge = free text, `question_type` yes_no/confirmation/multi_select (docs `human-tools/interviews.mdx`, `workflows/human-in-the-loop.mdx`). The dock shows the question as `<p className=QUESTION_TEXT>{question.text}</p>` (plain), a collapsed `<details>` "Context from preceding stage" with `<pre>{text}</pre>` (plain), then options as buttons and a composer = options and free text on the same dock. History view (`human-qa.tsx`) uses `Markdown` (`markdown.tsx`: `marked`, links sanitized, raw HTML stripped, GFM tables by default in marked, no mermaid). Slack interviewer also exists (`lib/components/fabro-slack`). Author shaping: label, edge labels, `context_display` (server-side field, plain). No option descriptions/effects, no recommendation field. No UI extension point (`apps/fabro-web` in-tree).

**Multi-repo:** one origin repo per run; `[run.integrations.github].additional_repositories` mints one token covering extra repos (same owner only, <=499); "Fabro does not clone additional repositories for you; a workflow adds its own clone step" (`docs/public/integrations/github.mdx` l.269-295). PR is created for the origin only (`[run.pull_request]`); extra-repo PRs are the agent's `gh`. Many projects per install: repos/projects supported by server (server-configuration not fully read).

**Scores**
- M1 3 - `workflows/transitions.mdx` l.10-20 - DOT graph in repo, deterministic edges, retry targets, failure policy.
- M2 3 - `workflows/stylesheets.mdx` (CSS-like model stylesheets), `agents/*` - per-node model, prompts, skills, hooks, multi-vendor ensembles (README).
- M3 1 - `interview-dock.tsx` l.130-181 - options and free text on one dock, but plain-text question and context, no recommendation, no effects, no diagrams; author cannot shape it.
- M4 1 - `integrations/github.mdx` l.269-295 - one origin and one PR; extra repos only via token and agent-run git.
- M5 2 - `integrations/github.mdx`, `slack.mdx`; Jira not found - GitHub issues/PRs; Jira would be ours via MCP.
- M6 2 - `execution/run-configuration.mdx` l.611+ `[run.pull_request]` auto_merge draft - PRs, auto-merge option; protected-branch rules ours.
- M7 3 - `administration/sandboxing.mdx`, `integrations/daytona.mdx` - sandboxes, network isolation.
- M8 3 - `execution/checkpoints.mdx`, `automations.mdx` - checkpoints per node, API server queue, resume; long waits not verified.
- M9 1 - `administration/security.mdx` l.17 "Roles or ACLs: Not supported. All authenticated users have identical, full access" - GitHub OAuth login with allowlist, no roles.
- M10 2 - workflows, stylesheets, skills, hooks, MCP all in our repo; UI and engine Rust in-tree, no UI plugin point.
- S1 2 - `execution/automations.mdx` - triggers/automations.
- S2 3 - `execution/observability.mdx` - per-run traces and cost.
- S3 1 - none seen.
- S4 1 - API and MCP (`lib/apps/fabro-cli/tests/it/cmd/mcp.rs`); no chat assistant.
- S5 2 - `integrations/slack.mdx`, `lib/components/fabro-slack/src/blocks.rs` - Slack blocks for questions.
- S6 2 - `lib/components/fabro-interview` record/replay and auto-approve interviewers (`interviews.mdx`) - replay of answers; stub agents not verified.
- S7 3 - MIT, 1893 stars, 27 contributors; outside PRs few.
Verdict: could pass with work (M3 = our own UI or upstream change; M4 = our own multi-clone steps; M9 weak). Rust engine and DOT format are a rewrite of our Archon YAML. Not better than Archon on M3/M4.

---

#### 4. microsoft/conductor  https://github.com/microsoft/conductor
Python CLI: single-YAML multi-agent workflows (Copilot SDK, Anthropic, Claude Agent SDK), per-run local web dashboard.

**Workflow definition:** one YAML file per workflow in our repo; routes with Jinja2/expressions, "no LLM in orchestration"; script steps route on exit code or parsed JSON stdout; human_gate, questions, workflow (sub), wait, terminate (`docs/workflow-syntax.md` l.120+, 962+, 2014+).

**Decision UI (the best rendered gate found in part A):** `src/conductor/web/frontend/src/components/detail/GateDetail.tsx` (497 lines) + `PromptMarkdown` (l.366+) + `FileViewer.tsx`. Prompt rendered via react-markdown + remark-gfm with custom components: headings, lists, tables (GFM, documented), code blocks, auto-linkified http(s) URLs and relative file paths (open in VS Code / FileViewer). Options as buttons on the same card (`option_details` with label, `route` hint), `prompt_for` opens text input (multiline optional) = free text stored as `additional_input`. Gate prompt is a Jinja template of earlier step outputs (author-shapeable per workflow, markdown only). No mermaid (not in `frontend/package.json`), no folding/HTML, no recommendation/confidence or per-option effects field (only `description` per option, and a prompt you can write yourself including a table of effects). No UI extension point; the dashboard is an in-tree SPA served by `web/server.py`.

**Multi-repo:** none as a platform concept. `working_dir` per agent step (Jinja-templated, e.g. from a previous step) lets one workflow run agents in several repo directories; script steps can run git/gh. No project registry, no PR-per-repo logic (our own steps).

**Scores**
- M1 3 - `workflow-syntax.md` l.2014-2050 routes, script JSON routing, sub-workflows, iteration limits (l.2141+).
- M2 2 - `workflow-syntax.md` l.120+ per-agent model/provider/reasoning/skills/plugins/limits, execution profiles (l.3150+); idle/silence limit not found, cost budget l.2167.
- M3 2 - `GateDetail.tsx`, `workflow-syntax.md` "Markdown in Gate Prompts" - markdown with tables, links, options-on-card, free text; no diagrams, no folding, no recommendation field. Best of the six on rendering after the author writes the prompt.
- M4 1 - `workflow-syntax.md` l.443-480 - `working_dir` per step only; no projects, no PR logic.
- M5 1 - MCP steps (`l.1485`) - trackers only via MCP/scripts we write.
- M6 1 - script steps - git/gh via scripts we write.
- M7 1 - `workflow-syntax.md` l.919 "Sandbox Configuration (ACA)" experimental; "Working directory is NOT a sandbox" warning l.478.
- M8 1 - checkpoints and `conductor resume` (l.2237); process-bound, per-run local dashboard, no server queue.
- M9 0 - `docs/development/dashboard.md` - per-run token only, no users or roles, no team server. Unfixable without building a server around it.
- M10 3 - all in our YAML, plugins/skills/MCP in repo (`workflow-syntax.md` l.2742); no fork needed because it is a library/CLI.
- S1 1 - `conductor fleet`, `wait` steps; no trigger server.
- S2 2 - OpenTelemetry (l.2330), cost reporting (l.2192).
- S3 0 - none.
- S4 1 - `conductor mcp serve` (cli-reference) - exposes workflows as MCP; no chat.
- S5 0 - not found.
- S6 2 - test suite and replay app (`docs/development/dashboard.md` "replay"); stub verdicts not verified.
- S7 3 - MIT, Microsoft org, 35 contributors, outside PRs merged.
Verdict: out as a platform (M9 = 0, M8/M7 weak: it is a CLI engine, not a team server). Its gate card is a useful reference design for our own card.

---

#### 5. maister-dev/maister  https://github.com/maister-dev/maister
Self-hosted Next.js control plane + Postgres + supervisor daemon over ACP coding agents (Claude Code, Codex, Gemini, OpenCode); versioned "Flow" packages; beta; 11 stars; one maintainer plus one.

**Workflow definition:** `flow.yaml` v1 manifest in git-tagged Flow packages installed per project (`docs/flow-installer.md`: clone tagged repo into cache, symlink into `<project repo>/.maister/<slug>/flows/<flowId>`, rows in `flows` table); node types ai_coding, orchestrator, consensus, judge, cli, check, human, form; explicit `transitions` (approve/rework/takeover) (`docs/flow-dsl.md` l.19, 197+). Typed result contracts with required JSON-schema export ("agent prose does not replace it", l.35-ish). Definitions live in our package repo, an authored-in-UI flow also stored in DB.

**Decision UI:** `web/components/board/hitl-decision-controls.tsx` (2168 lines), `inbox/hitl-card.tsx`, `inbox/hitl-panel.tsx`, `board/run-hitl-response.tsx`, `runs/run-wait-card.tsx`. Kinds: plan-review "decision_request" card (l.1700-1735): question plain `<p>`, each option a button with `label`, `consequences` text and a "Recommended" tag; form node = JSON form schema with fields incl. select and textarea (`FormFieldControl` l.807+, `human-assessment-form.tsx`); consensus card with draft excerpts and download links; budget breach and hook trip cards. Free text exists on forms and comments. Markdown: `social/markdown-body.tsx` (react-markdown + remark-gfm, no rehype-raw) used for comments/board; `workbench/markdown-rich-view.tsx` + `workbench/mermaid-diagram.tsx` render markdown with mermaid but only in the workbench file view and proposal review details (`inbox/proposal-review-details.tsx` l.142), not in the HITL decision card body. Author shaping: the decision JSON schema (question/options/consequences/recommendation) and form schemas; no custom component/plugin API for UI.

**Multi-repo:** `project = repo` is locked; multi-repo = cross-project task relations with a platform-wide gating lock (ADR-155, `docs/PRODUCT_VIEW.md` l.201-203), opt-in cross-project agent facade reach, read-only sibling-repo context mounts on ai_coding/judge/orchestrator nodes. "relations may cross projects, the automation they drive may not": one task per repo, each opening its own PR, ordered by relations; not one work item with N PRs. Many projects per install: yes (portfolio, RBAC).

**Scores**
- M1 3 - `docs/flow-dsl.md` l.19, 197 - typed graph, explicit transitions, required result schema, rework limits (`rework.allowedTargets`).
- M2 3 - `docs/flow-dsl.md` l.225 lifecycle `settings` (role, policy, timeout, cost, restrictions); multiple ACP agents (README) - per-node roles and caps.
- M3 2 - `hitl-decision-controls.tsx` l.600-645, l.1700-1735 - options with consequences, recommendation, forms and free text on the same card; question is plain text; mermaid/markdown exist only in other views (`mermaid-diagram.tsx`), so reaching a rich card means extending their code.
- M4 2 - `PRODUCT_VIEW.md` l.201 (ADR-155/156/157) - many projects; multi-repo through related tasks and read-only mounts, PR per project task, no single item writing in several repos.
- M5 2 - `docs/` ADR-206..209 "task source identity" (PRODUCT_VIEW) - external task source binding, PR merged confirmation; Jira not verified.
- M6 3 - README "promotion to a pull request or local target branch"; PRODUCT_VIEW ADR-206 PR confirmed merged.
- M7 3 - README git worktrees, ACP-boundary guardrails, scoped capabilities.
- M8 3 - README Postgres durable store, run ledger; supervisor daemon; budgets.
- M9 3 - `docs/system-analytics/identity-access.md`, ADR-155 RBAC (`requireProjectAction`) - users, roles, project-bound tokens.
- M10 2 - Flow packages from our git repo (`flow-installer.md`); UI in-tree Next.js, no plugin point; MCP facade in `mcp/`.
- S1 2 - `web/components/admin/scheduler-clock-card.tsx` - scheduler exists; tracker polling not verified.
- S2 3 - `web/components/observatory/*` (cost, autonomy, coverage cards) and run ledger.
- S3 2 - `stand-connector/` governed stand diagnosis and restarts - deploy/restart pilot, not release rollback.
- S4 2 - `mcp/` facade and "scratch" transcript chat (`markdown-body.tsx` header comment) - agent chat exists.
- S5 1 - inbox only (`inbox/hitl-card.tsx`); push/chat notification not found.
- S6 2 - `contracts/fixtures`, evaluation lab (ADR-142..147) - fixtures and judge studies; stub-verdict runs not verified.
- S7 2 - MIT, active, but 11 stars, 3 contributors, beta until v1.0, bus factor 1-2.
Verdict: could pass with work: richest governance and a team server (M9 3), cards partly structured; rich markdown/mermaid body and one-item-N-PR multi-repo both need changes in their code (fork or upstream), so M10 at risk. Bus-factor and maturity risk. Not better than Archon on M3 without a fork.

---

#### 6. kuhlman-labs/fishhawk  https://github.com/kuhlman-labs/fishhawk
Go control plane + React UI: governed, audited agent workflow for ONE developer ("captain") per repository; Postgres, signed audit trail; self-develops through its own workflows. Alpha; pre-alpha contribution policy.

**Workflow definition:** `.fishhawk/workflows.yaml` version 2 in the repo (routing predicate, delegation policy, ordered stages with executor, reviewers, constraints, budget, gates) (`.fishhawk/workflows.yaml` header; `docs/spec/workflow-v2.md`). Next step: stage order is fixed top to bottom; gates by policy and attention-queue decisions; verdicts typed by stage artifacts; not a free graph.

**Decision UI:** `frontend/src/attention/decision-panel.tsx` (exhaustive switch over fixed kinds plan_gate, scope_amendment, acceptance_disposition, split_verdict, paged_concern, attend_human_led_campaign), `decision-form.tsx`, `plan-gate-decision.tsx`, `frontend/src/plan/approval-panel.tsx` + `plan-document.tsx`. Verbs come from `decision-verbs.ts` (Approve/Deny, reason textarea optional). Text is `whitespace-pre-wrap` plain (`plan-document.tsx` l.115, `sections.tsx` l.170); no markdown library in `frontend/package.json` (grep empty), no mermaid. Not author-shapeable: the kinds are closed in code ("a seventh kind fails typecheck"). No UI extension point.

**Multi-repo:** repository is the unit of governance; ADR-130 (accepted 2026-11-04) adds a project as a coordination record over repo-local campaigns (visibility first, "no atomic cross-repository merges", no project-level authority); execution across repos not delivered ("consider execution only under additional explicit contracts"). Charter D9 had excluded it from alpha.

**Scores**
- M1 2 - `.fishhawk/workflows.yaml`, `docs/spec/workflow-v2.md` - declarative stages and gates in our repo; closed stage vocabulary, linear order.
- M2 2 - `.fishhawk/workflows.yaml` header (executor, reviewers, budget per stage), personas - per-stage executor/reviewer/budget; multiple vendors "agent-agnostic" (README).
- M3 1 - `decision-panel.tsx`, `plan-document.tsx` - plain text, closed kinds; would need a rewrite.
- M4 1 - ADR-130 - coordination record only, no multi-repo PR execution.
- M5 2 - `docs/spec/work-management-v0` (referenced in ADR-130), GitHub App and webhooks (README) - GitHub issues/board; Jira not found.
- M6 3 - README (GitHub App, approvals, merge gates), `.fishhawk/workflows.yaml` release/hotfix workflows.
- M7 3 - `runner/` with gate isolation (`runner/internal/gateiso`), `deploy/gate-image`.
- M8 3 - Postgres + RustFS, signed immutable audit (README), resource-keyed admission (ADR-094).
- M9 1 - README "built for one developer"; GitHub OAuth; solo-captain charter (ADR-080).
- M10 2 - workflows, conventions, charter in our repo; UI/backend in-tree.
- S1 2 - `backlog_grooming`, `upkeep_scan` workflows in `.fishhawk/workflows.yaml` - scheduled-style workflows.
- S2 3 - `docs/compliance/` audit log, `pricing/` - per-run audit, cost.
- S3 3 - `release`, ADR-132/133 (release candidates, promotion, smoke) - environment deploy gates.
- S4 2 - crew messages ADR-081, MCP server (README) - operator agent; chat not verified.
- S5 1 - attention queue only; push not found.
- S6 1 - `acceptance/`, `testdata/` - acceptance harness; stub verdicts not verified.
- S7 2 - Apache-2.0, active daily, but 9 stars, 3 contributors, external feature PRs refused (CONTRIBUTING).
Verdict: out in practice: solo-captain design (M9), plain closed decision UI (M3), no multi-repo execution (M4); no way to add them in our repo without forking.

---

#### Summary table (M3 / M4 / M10, verdict)
| Candidate | M3 | M4 | M10 | Verdict |
|---|---|---|---|---|
| Archon (baseline, 0.15.0) | 2 | 2 | 2 | Baseline; structured card exists, body is plain text, no UI extension point |
| kraft | 1 | 2 | 2 | Could pass only with fork-level UI work; single-user (M9 1) |
| fabro | 1 | 1 | 2 | Could pass with our UI/clone steps; plain dock; no roles |
| conductor | 2 | 1 | 3 | Out (M9 = 0, CLI engine); gate card is a good design reference |
| maister | 2 | 2 | 2 | Could pass with work; strongest team features, immature, UI in-tree |
| fishhawk | 1 | 1 | 2 | Out in practice (solo captain, closed decision kinds) |

Cross-cutting finding: none of the six has a UI extension point or mermaid in the decision card. Markdown-with-tables in a gate is present only in conductor (`GateDetail.tsx`). Structured options with effects and a recommendation are present in Archon (`AttentionAnswerPanel.tsx`) and maister (`hitl-decision-controls.tsx`). The needed rich card therefore remains our own work in every case: either a separate UI over the platform API (works with Archon, which exposes REST/SSE) or an upstream/fork change.

## Appendix part B

### Part B: market scan, 6 candidates (read 2026-11-26; shallow clones in scratchpad/clones-B, nothing run)

Metadata via `gh api` on 2026-11-26. "Last 3" = committer dates on main. PR-merge check = authors of the last 30 (gascity: 60) merged PRs.

| repo | license (GitHub / files) | stars | created | last push | last 3 commits | contributors | outside PRs merged? |
|---|---|---|---|---|---|---|---|
| Tencent/LoopForge | NOASSERTION; LICENSE text is MIT "except third-party components" | 6091 | 2026-07-28 | 2026-11-25 | 11-25, 11-25, 11-25 | 18 | Effectively no. 30 merged: 18 + 11 by two maintainers, 1 other. Mirror of a private upstream (docs/open-source-scope.md: sync records kept private) |
| desplega-ai/agent-swarm | MIT; no EE dir found | 1122 | 2025-12-19 | 2026-11-25 | 11-25, 11-25, 11-25 | 70 | Rarely. 23 of 30 by desplega-bot, 5 by the lead, 1 dependabot, 1 outside |
| open-mercato/cezar | MIT | 1152 | 2026-05-19 | 2026-11-25 | 11-25, 11-25, 11-25 | 48 | Rarely. 23 by one maintainer, 4 by their bot, 2 by the founder, 1 other |
| gastownhall/gascity | MIT (stewarded by Gas City, Inc.) | 1585 | 2026-02-22 | 2026-11-25 | 11-25, 11-25, 11-25 | 202 | Some. Of 60: 46 one maintainer, 4 + 3 org bots, 3 + 3 other humans |
| sortie-ai/sortie | Apache-2.0 | 226 | 2026-03-17 | 2026-11-23 | 11-23, 11-23, 11-23 | 12 | Rarely. 18 maintainer, 10 bots, 2 other |
| sipyourdrink-ltd/bernstein | Apache-2.0 (name under TRADEMARKS.md) | 1230 | 2026-03-22 | 2026-11-25 | 11-25, 11-25, 11-25 | 115 | Some. 21 maintainer, 7 bots, 2 other; CONTRIBUTORS.md lists outside merged PRs. README says "Solo-maintained, beta" |

None is archived. All six are open source and self-hostable.

---

#### 1. Tencent/LoopForge
https://github.com/Tencent/LoopForge. Go + MySQL self-hosted platform, SOP DAG (agent / script / approval / sop nodes), Docker sandboxes, CodeBuddy / Codex / Claude Code roles, web workspace plus chat.

**Workflow definition.** SOPs (`WorkflowDefinition`, nodes + edges JSON) are rows in MySQL, written through `PUT /api/workflows` (docs/api/orchestration.md). Not files in our repo; we would sync from our repo by API. Next step: the agent calls a gate MCP (`cmd/agentflow-gate-mcp`, `internal/gatemcp/server.go`) with a structured `decision` (`pass|rework|fail|human`) + `actionRequired` + `findings`; code routes on it. `maxReworks`, `rejectTo` per node (internal/domain/workflow.go:77).

**Decision UI.** `web/app/approvals.js` (`humanGateSectionsHTML`, `waitingActionButtons`), `web/app/runs.js:542` (`gateResultCardHTML`). Vanilla JS embedded in the Go binary. Format: every field (`actionRequired`, `reason`, `summary`, `findings[].evidence`) goes through `escapeHTML` into `<p>`/`<ul>`: plain text, no markdown, no tables, no mermaid, no collapsible. Buttons on the card: "approve", "supplement and rerun node", "send back to upstream node X"; a free-text "human context" textarea is sent as the reason (`readHumanContext`). Linked artifacts open in a preview. The React chat (`chatbot/src/RichContent.jsx`) does render markdown (remark-gfm), mermaid and DOMPurify HTML, but only for chat/artifact content, not for the gate card. Author cannot shape the card (no template, no extension API); the gate JSON schema is fixed.

**Multi-repo.** Strong. Projects hold many repositories; an Issue takes `repositoryIds` plus `repositoryBranches`; `deliveryMrs` has one MR per repo (docs/api/collaboration.md:88, :120). GitHub adapter public; others "need their own adapter or MCP".

**Scores**
| # | score | source | reason |
|---|---|---|---|
| M1 | 2 | docs/api/orchestration.md; internal/gatemcp/server.go | code routes on a structured verdict, per-node `maxReworks`; definitions are DB rows, so our repo needs a sync script |
| M2 | 2 | docs/deployment.md; docs/api/orchestration.md | role per node with own CLI/model; limits are `maxAttempts`/turns, no cost cap per role |
| M3 | 1 | web/app/approvals.js, web/app/runs.js:542 | card is escaped plain text with 3 buttons + free text; rich rendering exists only in chat; needs a fork of the embedded web to add it |
| M4 | 3 | docs/api/collaboration.md:88,:120 | projects x repositories, one issue many repos, MR per repo |
| M5 | 1 | docs/open-source-scope.md | GitHub issue import only; no Jira; TAPD legacy hidden |
| M6 | 2 | docs/open-source-scope.md | GitHub PR discovery/merge/state; no CI gate nodes verified |
| M7 | 2 | README.md:133 | Docker sandbox per run via host Docker socket (trusted-team only) |
| M8 | 2 | docs/architecture.md | MySQL durable, API/worker split; waiting approvals persisted |
| M9 | 2 | docs/deployment.md:237 | local accounts, bcrypt, project roles; per-user credentials |
| M10 | 1 | docs/architecture.md; docs/open-source-scope.md | UI and node types are in the platform source; no plugin API; mirror of a private upstream |
| S1 | 2 | docs/api/shared-schedules.md | schedules exist |
| S2 | 2 | internal/observability, docs/token-pricing.md | tokens/cost per run (dir listing and doc names only) |
| S3 | 0 | none found | |
| S4 | 2 | chatbot/, docs/api/README.md ("Main Bot") | Main Bot chat with write gate (not read in depth) |
| S5 | 2 | internal/notification, docs/proposals/enterprise-im.md | IM notifications (dir listing only) |
| S6 | 1 | e2e/, internal/runeval | e2e harness; no stub-verdict mode seen |
| S7 | 2 | LICENSE, README.md | MIT, very active, but a mirror with private sync |

**Verdict:** does not pass as is. M3 and M10 both need a fork of the embedded web (M10 = 1). Best multi-repo of the six. Not out (no must at 0), but "could pass" only by carrying a UI fork.

---

#### 2. desplega-ai/agent-swarm
https://github.com/desplega-ai/agent-swarm. Bun/TypeScript API + dashboard + lead/worker agents on several harnesses, DAG workflow engine, human-in-the-loop nodes, Apps (versioned JSON UI pages), extensions.

**Workflow definition.** DAG JSON/YAML (`definition.nodes`, `next` port maps), stored in the platform DB; created by API/MCP/dashboard or shipped as a file in an extension bundle (`workflows/*.yaml`, docs-site/.../guides/extensions.mdx). Executors: agent-task (with `outputSchema`), script, validate, notify, human-in-the-loop, wait, sub-workflow, foreach, vcs, code-match, raw-llm, system-one-decision (concepts/workflows.mdx:38-42, :301). Next step from port outputs of nodes with structured output, not prose. Retries per node.

**Decision UI.** `apps/ui/src/pages/approval-requests/[id]/page.tsx`, `apps/ui/src/components/shared/question-flow.tsx`, `.../questions/question-card.tsx`. Node `human-in-the-loop` takes `title` + `questions[]` of type `approval | text | single-select | multi-select | boolean | config` (src/workflows/executors/human-in-the-loop.ts:16-70), each with `label`, `description`, options with `description`. `label` and `description` render through Streamdown (`question-card.tsx:80-130`): markdown with GFM tables, links, images, raw HTML (`rehype raw`); no mermaid plugin on the card (mermaid exists only in `components/comb/viewers`). Options, free text and a submit bar are on the same card; collapsible per question (`<details>` and collapse state, page.tsx:422). Approvers list, quorum, timeout, Slack buttons, RBAC `approval.respond`, responder recorded (apps/ui/.../json-render/approval.tsx header). Author shaping: yes at two levels: the question text itself is markdown the workflow author writes; and an App page (versioned JSON, component catalog with Markdown, Chart, Accordion, Table, Svg, Timeline, `Approval`) can embed the live approval card (`catalog.ts:1718`). Apps are beta.

**Multi-repo.** Registered repos table (`swarm_repos`, per-repo guidelines and merge policy, docs guides/repo-merge-policy.mdx). A task carries one `vcsRepo` (src/types.ts:951); one work item over several repos = workflow fan-out (`next: [a,b]`, foreach) with an agent-task per repo, each opening its PR. No "project" grouping per install: one install is one team.

**Scores**
| # | score | source | reason |
|---|---|---|---|
| M1 | 2 | docs-site/.../concepts/workflows.mdx:301,:724 | port routing from structured output; definitions in DB, loadable from repo via extension manifest/API; fix-round limit is per-node retry, not a shared budget |
| M2 | 2 | docs-site/.../guides/harness-providers.mdx, multi-runtime-agents.mdx | per-agent identity/tools/model, several harnesses; budgets daily not per session (prior study, not re-verified) |
| M3 | 2 | apps/ui/src/components/shared/questions/question-card.tsx:80-130; apps/ui/src/lib/json-render/catalog.ts:1718 | markdown+GFM tables+links+images on question and option text, collapsible, answer on same card, free text; no mermaid/chart on the card itself, but an App page can combine Chart/Markdown/Accordion with the live `Approval`; no recommendation/confidence field (put it in the markdown) |
| M4 | 2 | src/types.ts:951; docs-site/.../guides/repo-merge-policy.mdx | many registered repos, per-repo PR via fan-out; no projects-per-install concept; one task = one repo |
| M5 | 2 | docs-site/.../concepts/workflows.mdx:374-379 | GitHub, GitLab, Jira, Azure DevOps triggers; trust-by-author not verified |
| M6 | 2 | repo-merge-policy.mdx | vcs executor, merge policy with auto-merge thresholds, agentsMayMerge flag |
| M7 | 2 | guides/deployment.mdx:264; guides/podman-rootless.mdx | worker containers with per-agent volume; egress open (prior study) |
| M8 | 2 | guides/postgres.mdx; workflows.mdx:689 | Postgres option, crash recovery, cancel trees; unanswered approvals time out (timeout port) |
| M9 | 2 | guides/self-hosted-sso.mdx:23-24 | RBAC on by default (admin/requester/...), SSO via oauth2-proxy/trusted header; no built-in login |
| M10 | 2 | guides/extensions.mdx; apps/index.mdx | extension bundle (manifest, hooks.ts, scripts, workflows, skills) installs by API, no fork; Apps = JSON pages; gaps: bundle lives in platform DB, no custom executors/React components, Apps beta, hooks run in-process with trust issues |
| S1 | 3 | workflows.mdx (triggers, cron), concepts/scheduling.mdx | webhooks, cron, event wake |
| S2 | 2 | guides/observability-opentelemetry.mdx, cost-and-context-computation.mdx | per-task cost, OTel |
| S3 | 1 | workflows.mdx vcs/wait nodes | wait on `vcs.pr.merged`; no deploy model |
| S4 | 3 | README, Slack manifest | lead agent + Slack/chat |
| S5 | 2 | scripts/e2e/scenarios/slack-approval-buttons.ts | Slack approval buttons with link |
| S6 | 1 | apps/evals, guides/evals-harness.mdx | eval harness; no stub-verdict nodes |
| S7 | 3 | LICENSE | MIT, daily commits; telemetry opt-in "Get ranked" |

**Verdict:** closest fit; could pass with work in our repo. Work: (a) extension bundle in our repo with the 9-stage workflows + scripts + skills, installed by API; (b) decision cards written as markdown (tables, links, `<details>`), and an App page that embeds `Approval` beside Chart/Markdown; mermaid pre-rendered to SVG by a script and shown via the `Svg`/`File` components; (c) a script for per-repo fan-out and a shared fix-round counter. Gaps to accept: no mermaid on the native card, Apps are beta, one team per install.

---

#### 3. open-mercato/cezar
https://github.com/open-mercato/cezar. TypeScript cockpit that drives logged-in agent CLIs, one git worktree per task, YAML workflow graphs.

**Workflow definition.** YAML files in the repo at `.ai/cezar/workflows/` (docs/reference.md:341); `version: 2` graphs: start/end, agent, check, loop, gate.human, ask-user, dispatch, fork/join, if, git/github nodes (reference.md:493-513). Next step: check = exit code; agent ports = `CEZ:VERDICT <name>` text token the agent writes (reference.md:540); loop `max` bounds cycles.

**Decision UI.** `packages/web/src/routes/task-thread/ask-card.tsx` (`AskCard`, `PendingAsk`), `ask-text.ts`. `gate.human` is "an ask card with two options" (reference.md:495, :84 in graph.ts); `ask-user` takes `question` + `options`. Card text is plain (`AskTextContext` default renders the string as is, `ask-text.ts`); chips with option `description`, "Other..." free text, "Need more info"; one-tap or Send. The thread's agent messages do render rich markdown (`task-thread/markdown.tsx`: Streamdown, GFM, Shiki, mermaid via Pele), so an agent message with a table/diagram directly above the plain ask card is possible, but the card itself is not markdown. Not author-shapeable (renderer context is internal; only the manager screen supplies one).

**Multi-repo.** One cockpit hosts many projects (registry in `~/.cezar/config.json`, reference.md "Multiple projects, one cockpit"), each repo with its own `.ai/cezar/`. A task is one repo/worktree; dispatch children fork the parent's branch (same repo). No cross-repo task or PR set found.

**Scores**
| # | score | source | reason |
|---|---|---|---|
| M1 | 2 | docs/reference.md:341,:493,:540 | YAML in repo; verdict is a text token, not JSON; loops are finite |
| M2 | 2 | docs/reference.md:493 | per-step runner, model, skill, budget; several runner families; limits only partly per step |
| M3 | 1 | packages/web/src/routes/task-thread/ask-card.tsx; ask-text.ts | plain-text card with option chips and free text; markdown only in thread messages; needs a fork to add |
| M4 | 1 | docs/reference.md "Multiple projects" | many projects yes; one task over several repos no |
| M5 | 2 | docs/issue-trackers.md; reference.md:105 | GitHub via host `gh`, other trackers per docs (Jira Cloud only per prior study, not re-read) |
| M6 | 2 | reference.md:493-513 | draft-pr, wait-ci, pr-update, git.push nodes; uses host gh login |
| M7 | 1 | docs/reference.md (Codex `danger-full-access`) | worktrees on the host shell, no sandbox |
| M8 | 2 | reference.md "Restarts resume a walk parked at a gate" | gates survive restart, hold no slot; timeouts |
| M9 | 1 | docs/server-install/ubuntu-vps.md | single-user cockpit behind nginx basic auth; no users or roles |
| M10 | 2 | reference.md:341 | workflows/skills in repo; platform is a package; UI and node types not extensible |
| S1 | 2 | reference.md (automations) | scheduled/GitHub-event automations |
| S2 | 2 | reference.md node outputs `costUsd` | cost per node |
| S3 | 1 | reference.md | no deploy model |
| S4 | 2 | reference.md:592 | managers (chat agent proposing merges) |
| S5 | 2 | RELAY_PROTOCOL.md | phone relay (default not self-hosted, prior study) |
| S6 | 1 | reference.md `CEZ_DRY_RUN=1` | dry-run, no stub verdicts |
| S7 | 3 | LICENSE | MIT, weekly releases |

**Verdict:** does not pass. Fails practically on M3 (needs UI fork), M4 (no cross-repo task), M9 (single user). Nothing at 0, but M4/M9 need engine work.

---

#### 4. gastownhall/gascity
https://github.com/gastownhall/gascity. Go controller ("city" of agents and rigs) running TOML formulas as durable bead (work item) graphs in Dolt; tmux/exec session providers; HTTP API with OpenAPI; embedded dashboard SPA.

**Workflow definition.** TOML formulas and packs in our repo (`pack.toml`, `formulas/`, `.gc/scripts/`; docs/guides/understanding-packs.md, understanding-formulas.md). Next step by code: `[template.check]` with `mode = "exec"` script and `max_attempts` (understanding-formulas.md:486-496); gates as beads (`[steps.gate]`, formula-spec-v2.md:618).

**Decision UI.** No decision card. A `human` gate is a bead of type `gate`; core-pack orders mail the addressee and re-nudge; it is closed with `gc bd close <id>` (formula-spec-v2.md:618-626). Mail view `internal/api/dashboardspa/web/frontend/src/components/mail/ThreadMessage.tsx` shows `message.body` in a `<pre>`: plain text; no options on a card; no markdown deps in frontend/package.json. Dashboard views are a compile-time registry (`src/views/registry.ts`), not a runtime plugin point. OpenAPI (docs/reference/schema/openapi.json) and events let us build our own card app beside it, in our repo.

**Multi-repo.** "City" = many rigs, one rig per repo, each with its own beads namespace; cross-rig routing is generated (`routes.jsonl`); `gc bd --rig` is "routing sugar" with no cross-rig joins (docs/reference/internal/beads-topology.md:150-166). One work item over repos = our formula slinging beads to several rigs.

**Scores**
| # | score | source | reason |
|---|---|---|---|
| M1 | 3 | docs/guides/understanding-formulas.md:486-496 | TOML in our repo, exec check script decides, max attempts |
| M2 | 2 | docs/guides/configuring-an-agent.md; formulas `gc.run_target` | per-agent provider/prompt/model; cost/time caps not verified |
| M3 | 1 | formula-spec-v2.md:618-626; ThreadMessage.tsx | gate bead + plain mail; rich card = our own app over OpenAPI |
| M4 | 2 | beads-topology.md:150-166 | many rigs per city; cross-repo item = our fan-out, no joined PR set |
| M5 | 1 | docs/reference/specs (no tracker adapter found); prior study: no state-to-label sync | tracker mirror is ours to build |
| M6 | 1 | formulas in examples/ | PR/merge steps are formula scripts of ours |
| M7 | 1 | docs/reference/trust-boundaries.md (commands "not a sandbox" per prior study) | tmux/exec providers, worktrees |
| M8 | 2 | docs/reference/internal/beads-topology.md | Dolt-backed beads; gates stay open days |
| M9 | 1 | docs/reference/api.md:103 | CSRF-token API, no users/roles/approver identity |
| M10 | 2 | docs/guides/understanding-packs.md; shareable-packs.md | packs, scripts, providers in our repo, upgrade by binary; dashboard views are compile-time |
| S1 | 2 | docs/reference/system-packs.md | orders (cron-like) per pack (not read in depth) |
| S2 | 2 | docs/reference/events.md | event stream |
| S3 | 1 | | |
| S4 | 2 | dashboard Mail, agents | mail/chat to agents |
| S5 | 1 | formula-spec-v2.md:622 | mail nudges only |
| S6 | 1 | TESTING.md | no stub-verdict mode seen |
| S7 | 3 | LICENSE | MIT, 202 contributors, hourly commits |

**Verdict:** could pass with work in our repo. M1 and M10 are strong. Work: our own decision-card web app (React, markdown+mermaid) over the OpenAPI/events, writing the answer back by closing the gate bead with a ruling; tracker mirror; per-repo fan-out formulas; user identity in that app (no roles in the platform). Larger build than agent-swarm.

---

#### 5. sortie-ai/sortie
https://github.com/sortie-ai/sortie. Single Go binary: polls a tracker (Jira, GitHub, GitLab, Gitea, Linear), runs coding agents in workspaces, reacts to PR review/CI, read-only dashboard. Small (226 stars, 12 contributors).

**Workflow definition.** One `WORKFLOW.md` (front matter + prompt template) in the repo (docs/workflow-reference.md); dispatch rules route by label/kind; next step from tracker state and labels, status file written by the agent (docs/agent-to-orchestrator-protocol.md), not a JSON verdict engine.

**Decision UI.** None by design: a human gate is a tracker gesture (decisions/0022: release a parked issue by label or state). The agent's own request for human input ends the attempt (decisions/0025). Dashboard `web/src/screens/*` (overview, issue, pipeline, session...) is read-only. A decision card could only be a tracker comment (GitHub renders tables, mermaid, `<details>`, links), answered by label: lives in the tracker, not in our repo or UI.

**Multi-repo.** One process = one `tracker.project` (workflow-reference.md:307, :336). Many repos = many instances. A task is one repo.

**Scores**
| # | score | source | reason |
|---|---|---|---|
| M1 | 2 | docs/workflow-reference.md | WORKFLOW.md in repo, code-enforced dispatch and reactions; stages by label, no verdict JSON |
| M2 | 2 | workflow-reference.md:1391 | work profiles per dispatch rule, several agent kinds; per-role skills limited |
| M3 | 1 | docs/decisions/0022, 0025 | no card or inbox; tracker comment is the only surface |
| M4 | 1 | workflow-reference.md:307 | one instance per project |
| M5 | 3 | docs/*-adapter-notes.md | Jira, GitHub, GitLab, Gitea, Linear adapters |
| M6 | 2 | workflow-reference.md:624-851 | review/CI reactions, require_ci |
| M7 | 1 | workflow-reference.md:423-505 | workspace dirs + hooks, no sandbox |
| M8 | 2 | workflow-reference.md:561 | SQLite state; parked issues |
| M9 | 1 | web/src/screens | read-only dashboard, no users |
| M10 | 2 | docs/workflow-reference.md | everything in WORKFLOW.md in our repo; no UI/extension points |
| S1 | 3 | workflow-reference.md:410 | polling, comment feed |
| S2 | 2 | internal/server/cost.go | cost per run |
| S3 | 1 | | |
| S4 | 0 | | |
| S5 | 2 | workflow-reference.md:1545 | notification backends |
| S6 | 1 | tests/ | |
| S7 | 3 | LICENSE | Apache-2.0 |

**Verdict:** out as the engine (M3 has no card, M4 one project per instance, M9 no users); usable only as a tracker-reaction component. No must at 0, but 3 must at 1 with no extension point.

---

#### 6. sipyourdrink-ltd/bernstein
https://github.com/sipyourdrink-ltd/bernstein. Python "governance layer for AI agents": deterministic scheduler, YAML plan/policy, signed audit trail, git worktrees. Self-declared "Solo-maintained, beta" (README.md). Large (prior study: about 875k lines).

**Workflow definition.** `bernstein.yaml` / plan YAML in the repo: stages, steps, `requires_approval`, `allowed_roles`, no model in the loop (README; docs/architecture/plans.md:301-324).

**Decision UI.** `web/src/routes/Approvals.tsx` + `src/bernstein/core/approval/card.py`: a queue of pending TOOL-CALL approvals with reasons, diff and approve/reject; the card is a hash-committed record rendered "verbatim" as text (`render_card_text`). Not a workflow question, no markdown renderer, no free-text ruling found, no author shaping.

**Multi-repo.** `repos:` in a plan is "Parsed, but `bernstein run` does not apply them" (docs/architecture/plans.md:75); stage/step `repo` and `depends_on_repo` fields exist but unapplied. Workspace module exists (ARCHITECTURE.md:252).

**Scores**
| # | score | source | reason |
|---|---|---|---|
| M1 | 2 | docs/architecture/plans.md:301 | YAML plan in repo, deterministic scheduler, gates; no JSON-verdict loop confirmed |
| M2 | 2 | README.md:83-100 | roles, per-role adapters; limits not verified |
| M3 | 1 | web/src/routes/Approvals.tsx; core/approval/card.py | tool-call approval queue, plain text; not decision requests |
| M4 | 1 | docs/architecture/plans.md:75 | multi-repo parsed but not applied |
| M5 | 1 | prior study: dispatcher stub | not re-verified |
| M6 | 2 | action.yml, README | PR flows via worktrees; not verified deeply |
| M7 | 2 | docs/architecture/ARCHITECTURE.md:305 | worktrees, sandbox backends by entry point |
| M8 | 1 | docs/ENTERPRISE.md | state on disk in `.sdd/`; no long-wait model seen |
| M9 | 1 | README.md:95-100 | role names in plan, local-first API; no users |
| M10 | 2 | ARCHITECTURE.md:305,:318 | policy/plan in our repo; entry-point plugins for sandbox/skills; UI not extensible |
| S1 | 1 | | |
| S2 | 3 | README.md (signed receipts), docs/ENTERPRISE.md | audit chain, replay journal |
| S3 | 0 | | |
| S4 | 1 | | |
| S5 | 1 | card_inbound.py (chat approvals) | chat approval cards |
| S6 | 3 | README.md (`bernstein demo`, mock agents) | mock agents |
| S7 | 2 | LICENSE, MAINTAINERS.md | Apache-2.0, active, solo beta |

**Verdict:** out in practice: M3 is a tool-call queue, M4 multi-repo not applied, solo beta. No must at 0 but two musts at 1 with engine work.

---

#### Summary table (M3 / M4 / M10, verdict)
| candidate | M3 | M4 | M10 | verdict |
|---|---|---|---|---|
| agent-swarm | 2 | 2 | 2 | could pass with work in our repo (best) |
| gascity | 1 | 2 | 2 | could pass with work (own card app over OpenAPI) |
| LoopForge | 1 | 3 | 1 | does not pass; UI fork needed |
| cezar | 1 | 1 | 2 | does not pass (no cross-repo task, single user, UI fork) |
| sortie | 1 | 1 | 2 | out as engine |
| bernstein | 1 | 1 | 2 | out in practice |

## Appendix part C

### Part C - market scan (read 2026-11-26, primary sources only: repo files, `gh api`)

Scores 0-3. "skim" = read only the directory listing or the doc heading, not the code. Shallow clones in scratchpad/clones-C (nothing run).

#### 1. Mastra Factory (mastra-ai/mastra `mastracode/factory`, `mastracode/factory-ui`, `mastracode/web`; host template mastra-ai/template-factory)
- https://github.com/mastra-ai/mastra/tree/main/mastracode/factory . TypeScript issue-to-PR server (boards of phases, agent sessions in sandboxes, GitHub/GitLab/Jira/Linear/Slack), `@mastra/factory` 0.31.0.
- License: factory package.json Apache-2.0; mastra repo SPDX NOASSERTION (ee/ dirs under a separate licence); template-factory repo has no LICENSE file (package.json says Apache-2.0).
- Stars 29,817 (mastra), 80 (template-factory). Created 2024-08-06 (mastra), 2026-10-27 (template-factory). Last push 2026-11-25 / 2026-11-18. Last 3 commits mastra main: 2026-11-25 x3 (20:57, 20:52, 20:31 UTC); factory dir last commit 2026-11-25; template-factory: 2026-11-18, 11-11, 10-28 (all by a bot account). Contributors 466 (mastra), 1 (template-factory). Outside PRs merged: yes (last 30 merged: 10 by a platform bot, then roaminro, wardpeet, mfrachet, intojhanurag, jal-co ... many different authors).
- Workflow definition: boards of phases (`resting`/`working`/`terminal`), each working phase has `runner {skill, context, instructions, goal}`, `nextPhases`, `outcomes`, `exitTool`, `autoStart(When)` - `mastracode/factory/src/boards/define-board.ts`. Stored in the project's Postgres, one row per board; `MastraFactory({boards})`/`defineBoard()` are deprecated (src/factory.ts:648), the supported path is `factory.upsertBoard()` from host code or the boards API (README "Stored boards", line 165). Skills can be code skills of the host app (README line 817). Next step: the session reports a structured outcome key with `factory_report_outcome`, code moves the card (`src/boards/phase-outcomes.ts`); review verdict is a tool call (`factory_record_review_verdict`); every 3rd "request changes" parks the card (`SELF_REVIEW_ROUND_LIMIT`, src/rules/tools.ts:351). Not an LLM reading prose for routing, but the build loop still has agent-judged goals (`goal.objective`).
- Decision UI: three components.
  - `factory-ui/src/ui/domains/chat/components/SubmitPlanCard.tsx` (plan approval): body is `PlanContent` -> `MarkdownRenderer` (`packages/playground-ui/src/ds/components/MarkdownRenderer/markdown-renderer.tsx`: react-markdown + remark-gfm, custom table component with CSV/markdown copy, CodeBlock). Collapsible box with Expand/Collapse (`CollapsibleBox`). Buttons "Approve & build" / "Reject" on the same card. No mermaid (grep over factory-ui and playground-ui finds none), no raw HTML.
  - `TranscriptPromptCards.tsx` + `AskUserPromptAnswers.tsx` + playground-ui `ds/components/ai/ask-user/*` (agent question): payload `{question, options[{label, description, recommended}], selectionMode single/multi}`; options are buttons with descriptions and a "recommended" hint; `AskUser.CustomAnswer` = free text; question text is plain `Txt`, not markdown.
  - `request_access` card is hard-coded Allow/Deny.
  - Author-shapeable: only the payload fields above (and the plan markdown the agent writes). No template, HTML, custom component or UI plugin API; factory-ui is an `@internal` package bundled into the CLI (factory-ui/AGENTS.md), host wiring is server-side only.
- Multi-repo: sessions get an "environment" of several linked repositories (`src/session/environment-repositories.ts`, `inEnvironment` links, test seeds 3 repos); many repos linked to a project; intake routes split work by repo (README line 998). But README "One project per Factory" (line 989) says an install is moving to one project per organization and creating more is deprecated; a card has one "working pull request" (`PUT .../working-pull-request`, README line 613); I found no statement that one card opens a PR in each repo. Gap, not verified.
- Scores:
  - M1 2 - define-board.ts, phase-outcomes.ts, rules/tools.ts:351 - structured outcomes, code-enforced moves, round limit 3; but boards live in the DB (we write them in via upsertBoard/API), no shared per-item fix limit beyond review rounds.
  - M2 1 - define-board.ts `BoardPhaseRunner` has skill/context/instructions only, no model or limits per phase; model chosen per org/user scope (factory-ui README onboarding table).
  - M3 2 - SubmitPlanCard.tsx, AskUserPromptAnswers.tsx, MarkdownRenderer - GFM tables, links, collapsible, buttons plus recommended plus free text on the card; gaps: no mermaid/charts, question text is plain, no confidence, not author-shapeable, plan card is Approve/Reject only.
  - M4 2 - environment-repositories.ts, README lines 989-998, 613 - multi-repo environment in one project; one-project direction and single working PR per card are gaps.
  - M5 3 - README integration sections (GitHub, GitLab, Jira line ~1363, Linear), `authorTrusted` stamps (factory README, Work items) - trackers in and mirrored, trust by author.
  - M6 2 - README lines 607-613, 670; prior study notes agents hold a merge tool and GH_TOKEN (engine-choice.md:59, not re-verified) - PR loop yes, protected-branch rule not guaranteed.
  - M7 2 - template-factory README (sandboxes: Mastra platform, local, other providers) - per-session sandboxes; prior study says they persist (not re-verified).
  - M8 2 - template-factory/src/mastra/index.ts (Postgres storage, workers, pubsub), `rules/dispatcher.ts` - durable, multi-replica; no cap on waiting items found.
  - M9 2 - template-factory README (Mastra platform sign-in or another provider), factory README (org admins vs members) - users and roles exist; recording of who answered a gate not checked.
  - M10 2 - template-factory/src/mastra/index.ts - our host project holds config, boards (upsertBoard), skills, integrations; `@mastra/factory` upgrades by npm. UI pieces cannot be added: no extension point in factory-ui, so a better card means forking the UI. Apache-2.0 allows a fork but it is the fork the Operator refuses.
  - S1 2 - README GitHub reconcile worker, Linear/Jira event rules (skim).
  - S2 2 - factory README metrics table (line ~121), audit events (skim).
  - S3 1 - README line 896 release rehearsal board example; no environments/rollback (skim).
  - S4 2 - session chat plus Slack integration (README Slack sections, skim).
  - S5 2 - Slack integration (`integrations/slack`), no push (skim).
  - S6 1 - vitest scenario tests only (`*.scenario.test.ts`); no stub-verdict harness for our boards.
  - S7 3 - Apache-2.0 package, very active.
- Verdict: could pass with work, but not without touching the UI. Best native decision card of the six (markdown tables, collapsible, options plus recommended plus custom text on one card). Missing: mermaid/charts and any way to shape the card from our repo. Fix would be our own decision surface (API plus our UI) or an upstream contribution; neither is "no fork" for the card itself.

#### 2. Kandev (kdlbs/kandev)
- https://github.com/kdlbs/kandev . Go server plus Next.js SPA: kanban of tasks, YAML step workflows, agent sessions in worktree/Docker/K8s/SSH executors, plugin system.
- License AGPL-3.0 (pluginsdk/ has its own LICENSE). Stars 1,183. Created 2026-01-09. Last push 2026-11-25. Last 3 commits: 2026-11-25 20:11, 19:20, 19:10 UTC. Contributors 92. Outside PRs merged: yes, a few (last 30: carlosflorencio 16, zeval 11, point-source 2, yuanqiuye 1).
- Workflow definition: portable YAML (steps, `on_enter`, `on_turn_complete` with `move_to_next|move_to_step|...`, `auto_advance_requires_signal`, `complete_task_on_enter`) - docs/public/workflow-import-export.md. Lives in the platform DB but **Workflow Sync** reconciles a GitHub/GitLab directory into the workspace as source of truth (docs/public/workflow-sync.md); Prompt Sync does the same for prompts. Next step: `step_complete_kandev` signal with summary/handoff/blockers (ADR docs/decisions/0015, status "proposed (amended 2026-09-05)"), then static `move_to_step`; not a JSON-enum routed verdict.
- Decision UI: `apps/web/components/task/chat/clarification-input-overlay.tsx` (1116 lines), `clarification-overlay-parts.tsx` (options, custom input), `clarification-markdown.tsx`. Format: react-markdown + remark-gfm + remark-breaks with an allow-list of elements (p, ul, ol, li, strong, em, del, code, a, br, table/thead/tbody/tr/th/td in the "context" variant); no code blocks, images, mermaid or `<details>` in the card. Options are buttons with label and description, optional images, a custom-text box (cap 2000 runes, `CLARIFICATION_CUSTOM_TEXT_MAX_RUNES`), multi-question bundles (backend `apps/backend/internal/clarification/`). Separate Needs-You inbox (`apps/web/app/needs-you-inbox/`). Author shaping: the agent fills question, context, options through `ask_user_question_kandev`; no template. Extension: runtime plugins (docs/public/plugins-authoring.md, status experimental): Go gRPC subprocess with `Interactions.ListPending` and `HostHumanResponseDelegation` (list and answer pending permission/clarification requests), frontend `registerKandevPlugin` with named slots (task-sidebar, chat-top-bar, task-card-tags, ... none replaces the clarification card), and isolated **web apps** on `task-canvas`/`workspace-canvas` (own HTML, any renderer, capabilities declared in manifest). So a full custom decision card (mermaid, charts, folded evidence, answer buttons) is buildable as a plugin web app, living in our repo, but it is a separate canvas, not the native card.
- Multi-repo: yes, native. README line 55 and docs/features.md:11: one task spans several repositories, one worktree per repo, per-repo branches, per-repo PRs; ADR 0013 (docs/decisions/0013-multi-branch-tasks.md) allows N (repo, branch) rows including several PRs per repo; MCP `create_task_kandev` accepts several repos. Many workspaces per install.
- Scores:
  - M1 2 - workflow-import-export.md, workflow-sync.md, ADR 0015 - YAML in our repo via Workflow Sync, code-enforced step moves; routing is static `move_to_step`/signal, no enum-verdict branching, no shared fix limit (prior study).
  - M2 2 - workflow-import-export.md (portable agent-profile descriptors per step, version 3) - per-step profile; skills/rules per role and cost caps not verified.
  - M3 2 - clarification-markdown.tsx, clarification-overlay-parts.tsx - GFM tables, links, options with descriptions, custom answer on one card; gaps: no mermaid/folding/charts, no recommendation with confidence, element allow-list is narrow; plugin canvas can close the gaps (see above, would be 3 once the plugin API is stable).
  - M4 3 - README.md:55, docs/features.md:11, ADR 0013 - one task, N repos, per-repo PR.
  - M5 2 - `apps/backend/internal/{github,gitlab,jira,linear}`, plugins-authoring.md "Linked Jira and Linear issue writeback" - intake and writeback exist; trust-by-author before model reads not verified.
  - M6 2 - README PR flow and review; prior study: no merge rules (not re-verified).
  - M7 3 - README executors line 141, docs/public/executors.md (Docker, K8s, SSH, worktrees; profiles) - isolation by executor; egress control not verified.
  - M8 2 - ADR 0033 durable plan implementation start, `AgentDisconnected` clarification stays answerable (plugins-authoring.md line ~2454) - durable pending requests; cap on waiting items absent.
  - M9 2 - docs/public/authentication.md, team-access.md, organizations.md (skim) - users/orgs exist; gate-answerer check not verified.
  - M10 2 - plugins-authoring.md, workflow-sync.md, prompt-sync.md - definitions, prompts and UI pieces (canvas plugin) live in our repos; upgrade without merging. Plugin API is marked experimental; AGPL on the host (plugins are separate processes/bundles, host unmodified).
  - S1 2 - docs/public/office-routines.md, `internal/scheduler` (skim).
  - S2 2 - docs/agent-observability.md, `internal/steptelemetry` (skim).
  - S3 0 - nothing found.
  - S4 2 - docs/public/coordinator.md, `internal/coordinator` (skim).
  - S5 2 - `internal/notifications`, pluginsdk `notification_formatter.go` (skim).
  - S6 1 - no stub-verdict harness found; backend has testutil.
  - S7 2 - AGPL-3.0 (network copyleft only bites if we modify the host), very active.
- Verdict: could pass with work in our repo. Work: (a) a plugin web app that renders our decision card (mermaid, chart, folded evidence, options with effects, free text -> ruling) and answers through `HostHumanResponseDelegation`; (b) Workflow Sync of our YAML; (c) our verdict/gate logic as a plugin or MCP tool because step routing is not verdict-based; (d) accept experimental plugin API and AGPL. Only candidate with native M4 and a no-fork UI extension path.

#### 3. KaaS Factory (KaaS-team/factory)
- https://github.com/KaaS-team/factory . Go CLI/daemon that turns tracker issues into reviewed PRs through YAML workflows, gates and a merge queue; one factory per repository.
- License: SPDX NOASSERTION; core Apache-2.0, `ee/` (identity, policy, scim, sso) under the proprietary KaaS Factory Enterprise License (LICENSE, ee/LICENSE). Stars 0. Created 2026-09-16. Last push 2026-11-19. Last 3 commits: 2026-11-19 x3 (21:46, 21:40, 21:39 UTC), all one author. Contributors 2. Outside PRs: none (30 of 30 last merged by one account).
- Workflow definition: YAML in our repo, `.factory/workflows/<name>.yml` else built-in copy (docs/workflows.md). Steps `uses: triage|plan|build|verify|pr|check`, `label`, `next` (step or list of edges with `if:`), `reject`, `revise`, park edges `{park: awaiting-approval, approve, revise, after: 4h}`; 18 shipped workflows. Next step is decided by the runner from step results and `if:` conditions; I did not verify whether `if:` reads a JSON verdict (docs do not use the word).
- Decision UI: no card. The plan is posted as a comment on the tracker issue; the person answers by commenting `/factory approve` or `/factory revise` (docs/workflows.md "Human in the loop"). Rendering is whatever GitHub/Jira shows, so markdown tables, mermaid and `<details>` work on GitHub if the agent writes them, but there are no buttons, no options with effects, no recommendation. `factory dashboard` (`internal/dashboard/dashboard.go`) is "read-only web view", server-rendered Go templates, loopback `127.0.0.1:8787`, never calls a write method. Author shaping: only via the plan text the agent writes.
- Multi-repo: no. One `repo` key per config (docs/config.md), `factory init` inside the repository to automate (README). Layers builtin/org/team/repo give many repos by running one factory each, not one item across repos.
- Scores:
  - M1 2 - docs/workflows.md - workflows in our repo, edges, reject loops, `max_retries` cap (config.md); verdict-JSON routing not verified.
  - M2 2 - docs/config.md (`models.<tier>`, `models_allowed`, `agents`, `budgets.node`, `stage_timeout`, `stall_after`) - per-tier model and limits; per-role prompt/skills via `.claude/` skills and subagents (workflows.md).
  - M3 1 - docs/workflows.md, internal/dashboard/dashboard.go - tracker-comment approval; rich rendering only by GitHub itself; no buttons or options card; dashboard read-only.
  - M4 1 - docs/config.md `repo`, README quickstart - one repo per factory; no item over several repos.
  - M5 3 - `internal/tracker/{github,jira,linear}`, workflows.md (trusted comment rule) - trackers in and mirrored, trust by author.
  - M6 3 - docs/config.md (`merge_mode: queue`, `auto_merge_max_risk`, `protected_paths`, `max_open_prs`, `requester_cannot_approve`) - merge queue and risk rules.
  - M7 2 - config.md (`sandbox` true by default, `sandbox_runtime`), worktrees; details not read.
  - M8 2 - docs/workflows.md ("a restart or another machine resumes the same one", state recorded on the thread) - state lives in tracker labels and comments; no cap on waiting items found.
  - M9 1 - `ee/identity`, `ee/sso`, `ee/scim` are proprietary; core has `internal/serve/auth.go`, `internal/oidc` (skim) - users/roles are an enterprise feature.
  - M10 2 - docs/workflows.md - workflows, skills, subagents, packs in our repo `.factory/`; no custom step types (six built-in plus shell `check`), no UI extension; Go binary upgraded by release.
  - S1 3 - workflows.md `on: cron:`, `poll_interval`.
  - S2 2 - `internal/trace`, `internal/meter`, `internal/budget` (skim).
  - S3 0 - nothing found.
  - S4 2 - `factory mcp`, `factory://board` resource (README MCP section).
  - S5 0 - nothing found beyond dashboard SSE.
  - S6 1 - `factory eval`, `shadow` exist; stub-verdict test of our workflow not confirmed.
  - S7 1 - core Apache-2.0 plus proprietary ee/; 0 stars, 2 contributors, one author, Go rewrite days old (prior study).
- Verdict: out in practice. No zero, but M3 (comments only), M4 (one repo per factory) and M9 (ee/) are weak and the project is one author with 0 stars. Worth stealing: park edge with `after:` (on-the-loop approval), `/factory approve|revise` grammar.

#### 4. Zeroshot (the-open-engine/zeroshot)
- https://github.com/the-open-engine/zeroshot . Rust CLI/engine: typed JSON graph (`openengine.graph.full/v1`) of agent steps, loops, choices, enforced by the engine; agents never route.
- License MIT. Stars 2,227. Created 2025-12-25. Last push 2026-11-25. Last 3 commits: 2026-11-25 16:31 (bot), 13:27, 10:57 UTC. Contributors 26. Outside PRs merged: few (last 30: mkceichelbeck 19, app bot 9, eust-w 1, EivMeyer 1).
- Workflow definition: graph JSON files we author (docs/guides/ask-a-person.md shows one: `seq`, `loop`, `step` with `worker: agent.worker@1`, typed `input`/`output`, `inputBindings`, `choice`); plus a graph editor in the UI. Lives wherever we keep the file; no platform DB. Next step: engine routes on typed enum outputs ("the graph, not the agent, decides what happens after a review", README).
- Decision UI: `ui/src/PersonRequestView.tsx` (152 lines): `<blockquote>{request.text}</blockquote>` plain text; options (`request.signals`) rendered as read-only chips, chosen one marked; status line; while waiting it shows the command hint to answer from the CLI. Answering is `zeroshot answer` (docs/guides/ask-a-person.md); the request is a host-run verifier node, "agents remain non-interactive". No markdown, no buttons, no free text. UI is a loopback, single-user workspace (`ui/README.md`: "trusted single-user host"). Author shaping: request text and enum signals defined in the graph; nothing about rendering.
- Multi-repo: no. One source repo with a PR; `contextRepositories` = up to 16 extra read-only repositories agents can inspect (docs/guides/runtime-environments.md:43-49). No project concept.
- Scores:
  - M1 3 - README, docs/guides/ask-a-person.md - graph in our repo, engine-enforced typed routing, loops and rejects, `attempts` limits.
  - M2 2 - README ("pick the agent and model for each step"), step `instructions`; per-role skills/limits not fully checked.
  - M3 1 - ui/src/PersonRequestView.tsx, ask-a-person.md - plain text request, read-only option chips, CLI answer; we would need to replace the UI.
  - M4 1 - runtime-environments.md:43 - read-only context repos only; one PR repo per run.
  - M5 1 - docs/guides/forge-delivery.md - issue/review comments on GitHub/GitLab, no tracker intake or label mirror.
  - M6 2 - README graph (PR -> CI -> Merge), forge-delivery.md - PR/MR, CI wait, merge nodes.
  - M7 2 - docs/guides/runtime-environments.md, docker/ - contained execution with connections; details not read.
  - M8 2 - ask-a-person.md (suspended run, deadline `timeout`, successor on retained workspace) - waits for answers with expiry; no per-item caps.
  - M9 1 - ui/README.md (loopback, single user), `target serve --public-origin` - no users/roles; "who answered is not recorded" (PersonRequestView.tsx comment).
  - M10 2 - graph JSON in our repo; adapters must be compiled in (docs/project/harness-adapters.md, skim); UI is in-tree.
  - S1 1 - skim, no tracker polling found.
  - S2 2 - run history/replay in the UI (`ui/src/run-history.ts`).
  - S3 0 - nothing found.
  - S4 1 - plugins/zeroshot-claude etc. (skills plus MCP connection to their Platform), docs/guides/plugins.md.
  - S5 0 - nothing found.
  - S6 1 - replay of recorded runs (ui/qa/replay-real-runs.md); stub verdicts not confirmed.
  - S7 3 - MIT, active; 16 major versions in 11 months (prior study).
- Verdict: could pass only with substantial work (M3, M4, M5, M9 all at 1); no zero. Best engine core for M1 (typed graph, enum routing), weak as a platform: single user, no tracker, no decision UI. Candidate as an executor under our own control plane, not as the platform.

#### 5. Optio (jonwiggins/optio)
- https://github.com/jonwiggins/optio . TypeScript self-hosted orchestrator: Work items (tickets, schedules, webhooks) run agents in K8s pods or on local machines, PR watcher, reconciler, web and mobile apps.
- License MIT. Stars 1,117. Created 2026-03-19. Last push 2026-11-23. Last 3 commits: 2026-11-22 05:31, 05:30, 03:51 UTC, all by the owner. Contributors 22. Outside PRs merged: some (last 30: owner 21, ttbeast10 3, matteslip 2, eyal4D 1, NoelBank 1, dependabot 1).
- Workflow definition: manifests (`apiVersion: optio/v1`, kinds Work, Prompt, Repo, McpServer, Skill, Connection) in a directory the cluster reads; applied, pruned, drift put back (docs/config-as-code.md). A Work has `when` (schedule/webhook/ticket), `where` (repo), `who` (runtime, model, effort), `what` (prompt), `then: until-merged`. No stage graph: the task lifecycle is a fixed state machine with a reconciler (AGENTS.md line 189); next steps are PR-driven (CI, review, merge, auto-resume capped by `OPTIO_MAX_AUTO_RESUMES`).
- Decision UI: none. `apps/web/src/components/dashboard/needs-you.tsx` is a list of items (title, one-line `reason`, repo, since, link). Questions are answered in the agent's terminal/session (`apps/api/src/services/local-question-attention.ts`, attention state `needs_you` from Claude Code hooks, AGENTS.md line 190). web has react-markdown + remark-gfm only (apps/web/package.json), no mermaid. No options on a card, no free-text ruling.
- Multi-repo: many repos per install (Repo kind, per-repo settings, manifests). One Work/task targets one `where.repo`; no multi-repo item found (grep of docs, README, AGENTS.md empty).
- Scores:
  - M1 1 - docs/config-as-code.md, AGENTS.md:189 - prompts in our repo but fixed state machine; our 9 stages and verdict routing would live outside.
  - M2 2 - config-as-code.md (`who.runtime`, `options.model/effort`, Skill and McpServer kinds) - per-work runtime and model, several families; per-role caps limited.
  - M3 1 - dashboard/needs-you.tsx - only a "needs you" list with a link; a decision card would be our own UI over the REST API.
  - M4 1 - config-as-code.md Repo kind - many repos, but one task = one repo.
  - M5 2 - AGENTS.md:190 (github/gitlab/linear/jira/slack triggers), `packages/ticket-providers` - intake yes; label mirror and trust by author not verified.
  - M6 2 - config-as-code.md (`mergeWhenReady`, review trigger), reconciler PR transitions - PR, CI, auto-merge; branch convention/risk rules limited.
  - M7 3 - AGENTS.md:189-190, docs/air-gapped.md (`extraEgress`), Dockerfile.agent - pod per run, egress policy, secrets by name.
  - M8 2 - AGENTS.md:189 (reconciler under CAS, backoff, resync) - durable; no gate waits (no gates) and no cap on waiting.
  - M9 2 - AGENTS.md:158 (OAuth/OIDC, orgs, deployment admin), docs/plans/org-scoping-and-sso.md - users and workspaces; gate-answer record n/a.
  - M10 2 - config-as-code.md - definitions in our repo apply without fork; no custom node types, no UI extension, a decision UI needs a fork or an external app.
  - S1 3 - AGENTS.md:190 (fifteen trigger types, cron, signed webhooks).
  - S2 2 - docs/observability.md, analytics page, cost per run (skim).
  - S3 1 - AGENTS.md:190 (jenkins, sentry, pagerduty, alertmanager, datadog event triggers); no release/rollback.
  - S4 2 - docs/optio-assistant.md, docs/controller-mcp.md (skim).
  - S5 3 - docs/android-push.md, docs/ios-push.md, notification-preferences.tsx.
  - S6 0 - nothing found.
  - S7 3 - MIT, active; one maintainer wrote 21 of the last 30 merged PRs.
- Verdict: could pass only with substantial work (M1, M3, M4 at 1). Strong platform pieces (pods, triggers, push, config-as-code); our pipeline logic and decision UI would sit outside it.

#### 6. Blazity ai-workflow (Blazity/ai-workflow)
- https://github.com/Blazity/ai-workflow . TypeScript Jira-to-PR factory on Vercel Workflow, Vercel Sandbox and Neon; workflow graph editor, harness profiles, integrations as compiled packages.
- License MIT (LICENSE.md). Stars 19. Created 2026-03-12. Last push 2026-10-09 (48 days idle at read date). Last 3 commits: 2026-10-09 23:41 (bot), 23:35, 16:26 UTC. Contributors 8. Outside PRs: none (last 30 merged: outof-place 27, own bot 3).
- Workflow definition: stored, versioned graph `schemaVersion: 2` of typed blocks, edges and conditions (docs/architecture/workflow-definition.md, `packages/workflow-graph`, `packages/conditions`); authored in the dashboard flow editor or via MCP `workflows.*` (guides/build-your-software-factory.md); example `docs/example-workflows/loop-branch-workflow.json`. Lives in the platform DB, not repo files (we could seed it through the MCP/API). Next step from graph edges and conditions over typed block outputs, not prose.
- Decision UI: `apps/dashboard/components/cockpit/screens/approvals.tsx` (330 lines): the plan renders as `<pre className="... whitespace-pre-wrap">{approval.plan.markdown}</pre>` (lines 156-159), i.e. raw markdown text; Approve/Reject buttons with a confirm step; no options, no free-text ruling. Questions to the person go as comments in the Jira ticket and the run waits (README "Clarify and plan"). Dashboard has no markdown renderer for it (package.json has only tiptap markdown for editing). Author shaping: block configuration in the flow editor; no template or UI extension for the card.
- Multi-repo: yes. docs/releases/artur/2026.08.0.md:37: one ticket can span several repositories, the agent picks, asks with ranked candidates, pulls in dependencies and opens one PR per changed repository; repository catalog mixes GitHub and GitLab (README:62); many repos with per-repo script groups and profiles (docs/architecture/repository-scripts.md).
- Scores:
  - M1 2 - workflow-definition.md - typed graph with conditions and loops, publication gate in code; but stored in DB, not our repo files.
  - M2 2 - docs/adr/ADR-011 (harness profiles), workflow-definition.md:207 (`harnessProfile {profileId, version}` per node) - per-node profile, Claude Code or Codex.
  - M3 1 - cockpit/screens/approvals.tsx:156 - raw-markdown `<pre>` plus Approve/Reject; no tables, options or free text.
  - M4 3 - docs/releases/artur/2026.08.0.md:37, README:62 - one ticket, several repos, one PR each.
  - M5 2 - integrations/jira, github, gitlab (integrations/README.md) - Jira-native board intake, labels/comments; GitHub Issues as intake not found; trust by author not verified.
  - M6 2 - README ("no merge step, merging stays with a person"), ADR-004 gates and required CI - PRs and gates; merge by the Operator only.
  - M7 2 - README:62 (Vercel Sandbox, secrets per run) - isolated, but only on Vercel.
  - M8 2 - README (Vercel Workflow DevKit, Neon; run waits for ticket answer) - durable via Vercel; no cap on waiting.
  - M9 1 - README:112 (sign in to the dashboard) - roles/answerer check not verified.
  - M10 1 - integrations/README.md ("compiled into every build", new ones by pull request to the repo) - new blocks/integrations/UI need a fork or upstream PR; definitions can be pushed through MCP.
  - S1 3 - README (Jira column, PR events, signed webhooks, schedules, MCP).
  - S2 3 - README (run trace, exact prompts per send, cost), packages/agent-visibility, packages/costs.
  - S3 0 - nothing found.
  - S4 2 - SETUP.md (remote MCP: connect your agent) (skim).
  - S5 2 - integrations/slack (thread per ticket).
  - S6 2 - `apps/worker/src/workflow-graph-suites` scenario corpus (workflow-definition.md:30).
  - S7 1 - MIT but Vercel/Neon lock-in, idle since 2026-10-09, one person wrote nearly all commits (prior study).
- Verdict: out in practice (no zero, but M3 1, M10 1, Vercel lock-in, stalled, one author). Only M4 is strong; worth reading for per-repo PR flow and trusted publisher.

#### Summary table
| Candidate | M3 | M4 | M10 | Verdict |
|---|---|---|---|---|
| Mastra Factory | 2 | 2 | 2 | could pass with work; card not shapeable without UI fork |
| Kandev | 2 | 3 | 2 | could pass with work (plugin canvas card, Workflow Sync) |
| KaaS Factory | 1 | 1 | 2 | out in practice |
| Zeroshot | 1 | 1 | 2 | could pass with substantial work |
| Optio | 1 | 1 | 2 | could pass with substantial work |
| Blazity ai-workflow | 1 | 3 | 1 | out in practice |

## Appendix part D1

### D1 market scan: OpenHands, vibe-kanban, cline/kanban, kilocode, goose, cli-agent-orchestrator

Read 2026-11-26 (GitHub clock showed 2026-11-25 evening UTC). Method: `gh api` metadata + shallow clones in `scratchpad/clones-D1/` (read only, nothing run). Paths below are relative to that clone dir named in each section.

#### Repo metadata

| Repo | SPDX | Stars | Created | Last push | Last 3 default-branch commits | Contributors | Outside PRs merged? (last 30 merged authors) |
|---|---|---|---|---|---|---|---|
| OpenHands/OpenHands (Agent Canvas UI) | MIT | 94330 | 2024-03-13 | 2026-11-25 | 11-25, 11-25, 11-25 | 460 | Mostly staff + bots (dependabot 13, release-bot 6, malhotra5 8, neubig, enyst, simonrosenberg). Outside merges rare in the recent sample; 460 contributors overall |
| OpenHands/software-agent-sdk (agent server, ask_user tool) | MIT | 1426 | 2025-08-23 | 2026-11-25 | 11-25 x3 | 164 | Mixed: VascoSch92, juanmichelini, rajshah4 plus staff and bots |
| OpenHands/automation (automation service) | MIT | 50 | 2026-03-13 | 2026-11-25 | 11-25 x3 | 35 | Staff + bots (hieptl, jpshackelford, malhotra5, simonrosenberg) |
| OpenHands/oss-agent-canvas (their own automations, git-synced) | none declared | 1 | 2026-08-11 | 2026-11-25 | n/a | 6 | n/a |
| OpenHands/enterprise (multi-user, SaaS) | NOASSERTION, file LICENSE = PolyForm Free Trial License 1.0.0 (proprietary, source visible) | n/a | n/a | 2026-11-25 | n/a | n/a | n/a |
| BloopAI/vibe-kanban | Apache-2.0 | 28814 | 2025-06-14 | 2026-11-15 | 11-15, 11-15, 11-12 | 66 | Authors look like the company team (anastasiya1155 16, stunningpixels 7, rafaelfiguereod-stack 3) plus single-PR names; README says do not open PRs before discussing with the core team |
| cline/kanban | Apache-2.0 | 1392 | 2026-03-09 | 2026-11-13 | 11-06, 09-04, 08-11 (sparse) | 18 | Mixed, 9 authors in last 30 (johnwschoi 7, saoudrizwan 6, BarreiroT 5, abeatrix 4, others 1-2) |
| Kilo-Org/kilocode | MIT | 28124 | 2025-03-10 | 2026-11-25 | 11-24, 11-24, 11-23 (main); v2 branch 11-25 | 390 | 5 authors in last 30, iscekic 25 (looks like staff). README: main takes only bug fixes, features go to branch v2 |
| aaif-goose/goose | Apache-2.0 | 56991 | 2024-08-23 | 2026-11-25 | 11-25 x3 | 451 | Last 30 merged: dependabot 22, lifeizhou-ap 7, one github-actions. External merges not visible in this window; 451 contributors overall |
| awslabs/cli-agent-orchestrator (CAO) | Apache-2.0 | 1681 | 2025-07-29 | 2026-11-25 | 11-25 x3 | 98 | Yes, 9 distinct authors in last 30 (fanhongy 11, plauzy 3, tedswinyar 3, FFXFF1, sujoydc, flipcyde101, guojing1217, gutosantos82, dependabot) |

Note on OpenHands: the repo `OpenHands/OpenHands` is now the Agent Canvas React frontend (AGENTS.md: "This repository is the OpenHands Agent Canvas React/TypeScript frontend"). Backend = software-agent-sdk (agent server), scheduler = automation, reusable content = OpenHands/extensions. `OpenHands/agent-canvas` is archived (replaced by this).

---

#### 1. OpenHands (Agent Canvas + Software Agent SDK + Automation service)

URL: https://github.com/OpenHands/OpenHands (+ software-agent-sdk, automation, oss-agent-canvas, extensions). Self-hosted control center for coding agents (OpenHands agent, or Claude Code, Codex, Gemini, ACP agents) with chat, projects, automations (cron/webhook) and "factories".
License: MIT for the four repos. Multi-user/SaaS parts are in OpenHands/enterprise under PolyForm Free Trial (proprietary).

**Workflow definition.** There is no workflow engine. Two layers:
- Automation = a row in the automation service (Postgres/SQLite) with a trigger (cron or webhook event, JMESPath-like filter) and an entrypoint. Definitions can live in git: `automation/openhands/automation/git_sync/` does bidirectional sync of automations with one git repo per org; `oss-agent-canvas/automations/<slug>/automation.yaml` + `tarball/` is the proof (they run their own team that way). Plugin form: `oss-agent-canvas/plugins/issue-triage/.plugin/plugin.json` with an `automation` block (`entrypoint.runner: script`, `command: python3 worker.py`, `config_schema`, `suggested_trigger`, `runtime.agent_profile` with allowed tools and secret refs), created via `POST /api/automation/v1/plugin-spec`.
- Script runner: our Python drives the SDK itself (`worker.py`), so the next step can be decided by our code from a JSON verdict. The platform gives no verdict/state-machine primitive; "outcome parsers" (`automation/openhands/automation/outcome_parsers.py`) extract JMESPath keys from a run's outcome payload, which is closest to it.
- Agent-led alternative: Projects = a coordinator conversation that starts worker conversations (`software-agent-sdk/.../project_service.py`); next step is LLM prose.

**Decision UI (M3 deep dive).**
- Component: `OpenHands_OpenHands/src/components/conversation-events/chat/event-message-components/decision-card.tsx` (`DecisionCard`), mounted from `.../chat/messages.tsx`. Backend: tool `ask_user` in `OpenHands_software-agent-sdk/openhands-tools/openhands/tools/ask_user/definition.py`; answer route `POST /conversations/{id}/ask_user` in `openhands-agent-server/.../event_router.py`. Flag: experimental feature `ask_user` ("Decision cards"), off by default, `experimental_features.py`.
- Format: the question is a plain `<h3>{action.question}</h3>`, option label and `consequence` are plain `<span>` text. No markdown renderer on the card. Schema limits: question 300 chars, 2 to 4 options, label 60 chars, consequence 240 chars, `recommended` index (no confidence value).
- Options as buttons on the same card: yes (one tap submits). Recommended marker: yes. Free text: yes, textarea "your words" + Send; answer comes back as an `AskUserAnswerEvent` (`option_index`, `text`) and the card shows the answered option with a check mark (answer on the same card).
- Raised by the LLM calling the tool, not by a script. Whether our own script can inject an `AskUserAction` without a model turn: not verified (no such route found).
- Chat messages elsewhere DO render rich markdown: `src/components/features/markdown/markdown-renderer.tsx` = react-markdown 10 + remark-gfm (tables) + remark-breaks + GitHub alerts + rehype-raw + rehype-sanitize (allows `<details>/<summary>`, `<img>`, no `style`, no `data:`), and fenced ```mermaid blocks render via `markdown/mermaid-diagram.tsx` (mermaid 12.3.0; `code.tsx` line 68). So an agent message can carry tables, folded evidence and diagrams; the decision card cannot.
- Tool-call confirmation (security analyzer / confirmation mode): `src/components/shared/buttons/conversation-confirmation-buttons.tsx` = Approve/Reject (+ Ctrl+Enter), high-risk banner; no text, no options; the action itself is shown in the chat stream.
- Author-shapeable: no template/HTML slot on the card. BUT Canvas Extensions exist (below).

**Extension points (M10).** `src/types/canvas-extension.ts`, `docs/CANVAS_EXTENSIONS_TESTING.md`, `software-agent-sdk/.../agent_server/canvas_extensions*`: a Canvas Extension is a git source or local path with `canvas-extension.json` (schema_version 1, `entrypoint` = self-contained browser ES module, `contributes.pages[]`), installed from "Customize > Apps", disabled until the operator confirms "Enable trusted app"; `activate(host)` gets `host.registerPage(id, mount)`, `host.agentServer.request()` (authenticated calls to the agent server) and an optional app-backend iframe view. Contribution type is pages only (no event renderer, no chat-card slot). So our own "decision card" page (markdown + mermaid + our JSON) can live in our repo and be installed without a fork, but it is a separate page, not the in-chat card. Also: plugins/skills/hooks/MCP via `OpenHands/extensions`, agent profiles, custom tools in the SDK, ACP agents.

**Multi-repo (M4).**
- Many projects per install: Projects feature (`ProjectItem` in `persistence/models.py`: name, description, coordinator conversation, worker agent profile). A project is a group of conversations, not a set of repositories; "Factories" = named groups of automations (`features/factories/factory-page.tsx`).
- One run over several repos: automation `config_schema.repos` (array of owner/repo, plugin.json) and `workspace.clone_repos()` with a `repos_config.json` (`oss-agent-canvas/automations/docs-release-docs-issue-docs-pr-event-driven/tarball/main.py` lines ~260-275) clone several repos into one run; the agent then opens PRs via prompt. Their `*-multi-repo-*` automations mean "one automation watching many repos", not one item changing many repos. No built-in "one work item, one PR per repo" object: ours to write in the script.

| Score | Source | Reason |
|---|---|---|
| M1 2 | oss-agent-canvas/plugins/issue-triage/.plugin/plugin.json; automation/.../git_sync | Definitions in git, script runner lets our code drive the SDK and decide from JSON; no workflow/gate primitives |
| M2 2 | plugin.json `runtime.agent_profile`; Agent Canvas README (ACP: Claude Code, Codex, Gemini) | Per-profile model, tools, secrets; several model families; per-role time/silence/cost limits not verified |
| M3 2 | decision-card.tsx; markdown-renderer.tsx; canvas-extension.ts | Options + consequence + recommended + free text + answer on the same card; but plain text, 300-char cap, no confidence, no rich content, flag experimental; rich page possible via extension |
| M4 2 | persistence/models.py ProjectItem; docs-release automation main.py | Projects and multi-repo clone exist; no repo registry per project, no per-repo PR object |
| M5 2 | Agent Canvas README ("Slack, GitHub, Linear"); automation webhook_router.py, trigger_matcher.py | GitHub events as triggers; Jira not seen; trust-by-author not a platform feature |
| M6 2 | features/chat/git-control-bar-pr-button.tsx; automation prompts | PR creation exists; branch convention, CI checks, protected-branch rule are ours |
| M7 2 | software-agent-sdk agent_server/docker_runtime; OpenHands/docs/SELF_HOSTING.md | Docker sandbox backend; "without sandbox" mode warns of full FS access; egress control not verified |
| M8 1 | automation/openhands/automation/models.py, dispatcher.py; ask_user_card flow | Conversations and runs persist, but a script run does not wait days at a gate; one-run-per-item and wait caps are ours |
| M9 1 | docs/SELF_HOSTING.md (API key entry screen, single user); OpenHands/enterprise LICENSE | OSS self-host = one shared API key; roles and users live in proprietary Enterprise |
| M10 2 | canvas-extension.ts; git_sync; plugin-spec | Defs, scripts, UI pages from our repo, no fork; chat card itself not replaceable |
| S1 3 | automation scheduler.py, webhook_router.py | Cron + webhooks |
| S2 2 | software-agent-sdk llm/utils/metrics.py, acp_tracing.py | Cost/model metrics and tracing; per-item roll-up is ours |
| S3 1 | extensions repo / automations | Nothing deploy-specific; ours |
| S4 2 | project_service.py (coordinator, `ask_user_for_conversation`) | Coordinator conversation relays worker questions; "kept away from the Operator's signature" is ours |
| S5 1 | src/hooks/use-agent-notification.ts | Browser notification only; Slack by our script |
| S6 1 | OpenHands playwright.mock-llm.config.ts | Mock-LLM e2e exists for the UI; no stub-verdict harness for automations |
| S7 2 | repo metadata | MIT, very active; Enterprise parts proprietary, beta label on automation service |

Verdict: COULD PASS WITH WORK IN OUR REPO. Work: (a) our decision card as a Canvas Extension page (reads our JSON, renders markdown/mermaid with our own renderer, answers through our API or the `ask_user` route); (b) workflow driver as a `runner: script` automation (state machine, verdicts, gates, fix-round limit) shipped as plugin-spec from our repo; (c) multi-repo item = our script clones N repos, one PR each; (d) M8 durable gate waits and M9 users/roles: OSS gives one API key, so roles/who-answered need our own layer or Enterprise (proprietary). Risk: ask_user is experimental, extension API is version 1 and pages-only; automation service labelled beta.

---

#### 2. BloopAI/vibe-kanban

URL: https://github.com/BloopAI/vibe-kanban. Kanban board + per-issue workspaces (branch, terminal, dev server) running Claude Code, Codex, Gemini CLI, etc. Rust backend (crates/) + React (packages/).
**Maintenance: SUNSETTING.** README header: "Vibe Kanban is sunsetting" with a link to a shutdown announcement; the earlier study notes the company shut down. Still pushed 2026-11-15 (release scripting). Apache-2.0.

- Workflow: none; issues on a board, agents run in workspaces; next step by the human or LLM prose. Org-level MCP server (`crates/mcp`) lets an agent manage tasks.
- Decision UI: `packages/ui/src/components/ChatApprovalCard.tsx` = a collapsible "plan" entry (`ChatEntryContainer variant="plan"`) whose body is produced by `renderMarkdown` (DisplayConversationEntry.tsx in web-core; Lexical + mermaid ^11 + rehype-highlight are dependencies of web-core). It shows the agent's plan/approval request as markdown, with approve / deny + feedback through `ApprovalFeedbackContext`; it is not a multi-option decision with a recommendation. Not author-shapeable (no extension API found).
- Multi-repo: `workspace_repos` table (migration `20251216142123_refactor_task_attempts_to_workspaces_sessions.sql`, `RepoWithTargetBranch` in workspace-manager): a workspace can hold several repos each with a target branch. PR per repo not verified.

| Score | Source | Reason |
|---|---|---|
| M1 1 | crates/mcp | No workflow engine; board + MCP only |
| M2 1 | docs/configuration-customisation/agent-configurations.mdx | Agent variants/profiles per executor; no per-role limits |
| M3 1 | packages/ui/src/components/ChatApprovalCard.tsx | Markdown, collapsible card, approve/deny; no options, no recommendation, not shapeable |
| M4 2 | crates/db/migrations/20251216142123_*.sql | Multiple repos per workspace; many projects; PR per repo unverified |
| M5 1 | README (GitHub PR tracking, `tracked_prs` migration) | GitHub only; no Jira |
| M6 2 | README "Create pull requests and merge" | PRs and merge in the UI |
| M7 2 | crates/worktree-manager | Worktree per workspace; no egress control |
| M8 1 | crates/db | SQLite state; no gate waits |
| M9 1 | README self-hosting guide; crates/remote | Cloud/remote org features in repo; local app is single user |
| M10 1 | repo structure | No plugin API found; changes mean a fork |
| S1 0 | n/a | No schedules |
| S2 1 | crates/executors | Logs per session; no cost roll-up seen |
| S3 0 | n/a | None |
| S4 1 | crates/mcp | MCP task server only |
| S5 0 | n/a | None found |
| S6 0 | n/a | None |
| S7 0 | README | Sunsetting; community fork only |

Verdict: OUT. Sunset project (S7 0), no extension point (M10 1), no workflow engine. Useful only as inspiration for the multi-repo workspace and plan-approval markdown card.

---

#### 3. cline/kanban

URL: https://github.com/cline/kanban. "npx kanban": local web app, each task card = its own worktree + CLI agent terminal; linked cards auto-start in chains; auto-commit / auto-PR. Research preview. Apache-2.0. Commits sparse (Aug, Sep, Nov).

- Workflow: card links (dependency chain), no verdict; next step is "card completed and moved to trash starts linked tasks" (README). Definitions in the platform's local state, not in a repo.
- Decision UI: none. Approvals happen inside the agent's TUI shown in an xterm.js terminal on the card (web-ui deps `@xterm/xterm`); the card only shows a state `awaiting_review` / "Waiting for approval" (web-ui/src/components/board-card.tsx and runtime code). react-markdown + remark-gfm are present for other text, no mermaid.
- Multi-repo: "Add project" dialog (`web-ui/src/components/add-project-dialog.tsx`) gives many repos per install; a task = one worktree of one repo (`src/workspace/task-worktree.ts`). No cross-repo item.

| Score | Source | Reason |
|---|---|---|
| M1 1 | README "Link and automate" | Linked cards chain; no verdicts/gates in code |
| M2 1 | README (agent per card) | Uses installed CLI agent; no per-role config |
| M3 0 | web-ui/package.json (xterm); board-card.tsx | Approval is the agent TUI in a terminal; no card, no extension point |
| M4 1 | web-ui/src/components/add-project-dialog.tsx; src/workspace/task-worktree.ts | Many projects yes; one task = one repo |
| M5 0 | README | No tracker integration |
| M6 1 | README "Ship it" | Commit / Open PR by prompting the agent; no CI/merge rules |
| M7 1 | src/workspace/task-worktree.ts | Worktree isolation only; README warns agents run with permissions bypassed |
| M8 1 | src/state | Local state, resume id; not a team server |
| M9 0 | README (local, no account) | No users or roles |
| M10 1 | repo layout | No plugin API; fork needed for UI changes |
| S1 0 | n/a | None |
| S2 0 | src/telemetry | Product telemetry only |
| S3 0 | n/a | None |
| S4 1 | README "sidebar chat" | Agent session edits the board |
| S5 0 | n/a | None |
| S6 0 | n/a | None |
| S7 1 | repo metadata | Apache-2.0, 18 contributors, research preview, sparse commits |

Verdict: OUT. M3 0 and M9 0 with no way to add them in our repo; local single-user tool.

---

#### 4. Kilo-Org/kilocode

URL: https://github.com/Kilo-Org/kilocode. Coding agent (opencode fork) as VS Code extension, JetBrains plugin and CLI/TUI; modes include Orchestrator; "Agent Manager" runs parallel sessions in worktrees. MIT. Not an SDLC engine. README: "main is not accepting new features", features go to branch `v2` (pushed 2026-11-25).

- Workflow: agent files `.kilo/agent/*.md`, `.kilo/command`, `.kilo/skills` in a repo (config as code). Orchestrator = a prompt (`packages/opencode/src/agent/prompt/orchestrator.txt`): LLM plans waves and calls the `task` tool; next step is LLM prose.
- Decision UI: `packages/kilo-vscode/webview-ui/src/components/chat/QuestionDock.tsx` (576 lines; also `packages/tui/src/routes/session/question.tsx`, shell `packages/ui/src/components/dock-prompt.tsx`): a dock above the prompt with options (label + description), optional multi-select, a "custom" free-text option, tabs for several questions, a default option; no recommendation marker found, no markdown renderer imported in QuestionDock. The general markdown component (`packages/ui/src/components/markdown.tsx`) has marked + shiki + katex + mermaid, so agent messages render diagrams. Lives in an IDE webview / terminal, not a shared web page. Not author-shapeable; plugin API (`packages/plugin/src`) covers tools, shell, TUI.
- Multi-repo: Agent Manager worktrees are per workspace folder (`packages/kilo-vscode/src/agent-manager/`); a cross-repo item is not a concept (multi-root not verified).

| Score | Source | Reason |
|---|---|---|
| M1 1 | packages/opencode/src/agent/prompt/orchestrator.txt | Orchestrator is prose-driven |
| M2 2 | .kilo/agent, .kilo/command | Per-agent prompt, model, permissions as files in repo; no cost/silence limits seen |
| M3 1 | QuestionDock.tsx; dock-prompt.tsx | Options + descriptions + free text on one dock; IDE-bound, no markdown in the dock, not a shared place, not shapeable |
| M4 1 | packages/kilo-vscode/src/agent-manager | Worktrees per workspace; no cross-repo item |
| M5 1 | packages/opencode (MCP) | Via MCP only |
| M6 1 | agent tools | Agent runs git/gh; no rules |
| M7 1 | packages/kilo-sandbox | Sandbox package exists; worktrees |
| M8 1 | packages/opencode session store | Sessions persist locally |
| M9 0 | README (IDE/CLI) | No team server or roles in OSS (cloud product separate) |
| M10 2 | .kilo/ folder; packages/plugin | Agents, commands, skills, plugins from our repo; no UI extension |
| S1 0 | n/a | None found |
| S2 1 | packages/kilo-telemetry | Usage telemetry; per-item provenance ours |
| S3 0 | n/a | None |
| S4 1 | packages/server | HTTP server for clients |
| S5 0 | n/a | None |
| S6 0 | n/a | None |
| S7 2 | repo metadata | MIT, very active; main frozen for features, v2 branch |

Verdict: OUT as an engine (M9 0 unfixable without building a server around `kilo serve`; not an SDLC pipeline). Pattern value only: question dock with options + custom text.

---

#### 5. aaif-goose/goose

URL: https://github.com/aaif-goose/goose (Linux Foundation AAIF project, formerly block/goose). Rust agent with Desktop (Electron), CLI and an ACP server (`goose serve`); extensions = MCP servers. Apache-2.0.

- Workflow: recipes (YAML) in our repo: `instructions`, `parameters`, `extensions`, `settings` (model), `response.json_schema` (enforced final JSON), `retry` with shell `checks`, `sub_recipes` (documentation/docs/guides/recipes/recipe-reference.md, subrecipes.md); schedule via recipe scheduling. Sub-recipes are called as tools by the LLM, so ordering and next step are model-driven; only the final output and retry checks are enforced in code. Sample with a script: `workflow_recipes/release_risk_check/`.
- Decision UI: three renderers. (1) Tool approval: `ui/desktop/src/components/ToolApprovalButtons.tsx`, `ToolCallConfirmation.tsx` = approve/deny buttons for a tool call (ACP `permissions.ts`). (2) MCP Elicitation: `ElicitationRequest.tsx`, a JSON-schema form inline in the chat (fields, required, defaults, Submit/Cancel), documented in `documentation/docs/guides/mcp-elicitation.md`. (3) MCP Apps: `ui/desktop/src/components/McpApps/McpAppRenderer.tsx` renders interactive HTML (`ui://` resources, MCP Apps SEP-1865) in a sandboxed iframe, display modes inline/fullscreen/pip, CSP, bidirectional calls to the MCP server. Markdown in chat: react-markdown + remark-gfm + remark-math + rehype-katex (ui/desktop/package.json); no mermaid in the chat renderer, but an MCP App iframe can ship its own. So the author can shape a card with our own MCP server returning HTML (tables, mermaid, `<details>`, buttons that call our tool), no fork. This is the most author-shapeable decision surface in this group apart from OpenHands pages; it appears inside the chat.
- Multi-repo: sessions have one working dir; no project/repo concept; multi-repo only by our own orchestration.

| Score | Source | Reason |
|---|---|---|
| M1 1 | recipe-reference.md (response.json_schema, retry), subrecipes.md | Recipes in repo, structured final JSON, retries; routing by LLM, no gates/states |
| M2 2 | recipe-reference.md `settings`, `extensions` | Per-recipe/sub-recipe model, extensions, instructions; several providers; limits partial |
| M3 2 | ui/desktop/src/components/McpApps/McpAppRenderer.tsx; ElicitationRequest.tsx | Inline HTML card from our MCP server with our own options/diagrams and answer; gap: desktop client, one-place tracker mirror and recorded ruling are ours |
| M4 1 | ui/desktop sessions; recipe parameters | No project/repo model; one working dir per session |
| M5 1 | MCP extensions | Via MCP (GitHub/Jira MCP servers); nothing native |
| M6 1 | MCP / shell | Agent runs git; no rules |
| M7 1 | documentation/docs/guides/security, allowlist.md | Tool allowlist and inspection; no sandbox per session |
| M8 1 | crates/goose/src/session/session_manager.rs (SQLite) | Sessions persist; gate waits and caps ours |
| M9 1 | documentation/docs/guides/remote-goose-server.md; oidc-proxy/ | `goose serve` with shared secret; oidc-proxy exists; no user/role model |
| M10 3 | recipes, MCP servers, MCP Apps, `CUSTOM_DISTROS.md` | Definitions, scripts and UI cards all from our repo via recipes/MCP; upgrades without merging |
| S1 2 | session-recipes.md "Schedule Recipe" | Scheduled recipes; event triggers not seen |
| S2 1 | documentation/docs/guides/logs.md | Logs; no per-role cost record by item |
| S3 0 | n/a | None |
| S4 1 | ACP server | Chat client exists; the Supervisor role is ours |
| S5 0 | n/a | None found |
| S6 1 | crates/goose-test, goose-test-support | Test crates; no stub-verdict harness for recipes |
| S7 3 | repo metadata | Apache-2.0, LF-hosted, very active |

Verdict: COULD PASS WITH WORK. M3 is solvable by our MCP App; but we would still write the whole workflow driver, multi-repo, team server (M8/M9) around it. Better as an agent client under another engine than as the engine.

---

#### 6. awslabs/cli-agent-orchestrator (CAO)

URL: https://github.com/awslabs/cli-agent-orchestrator. Local `cao-server` that starts provider CLIs (Kiro, Claude Code, Codex, Cursor, Copilot, OpenCode and more) in tmux sessions; supervisor/worker delegation over MCP; workflows; flows (cron); a React dashboard; MCP Apps. Apache-2.0, AWS Labs.

- Workflow (`docs/workflows.md`, `docs/workflow-scripts-authoring-guide.md`): primary tier = Python script using the `cao_workflow` shim (`step`, `run_step`, `emit_output`): real branching and fan-out in code, a durable journal, resume by replay (determinism required), mandatory `recovery=` policy per step, lint gate on create. The next step is decided by our Python code from step output (`note.output`); no LLM routing. YAML tier: only sequential runs; parallel/pipeline/loop reserved, not executable. Where it lives: on the server in `~/.aws/cli-agent-orchestrator/workflows/`, installed by `cao workflow create <name> --from-file <draft>` (HTTP `POST /workflows`), so our repo holds the source and a sync script installs it; hashed (`--expected-hash`).
- Approval: a run is refused with `403 approval_required` carrying a `plan_id` (hash of script + inputs + working dir); a human approves it (`cao workflow approve plan-v1:...`) or pastes the id in the web UI `web/src/components/workflow/PlanApprovalForm.tsx` (id field + Approve button; result shows `approved_by`, `approved_at`). That is script-execution approval, not a business decision request. No decision card, no options, no free text. Dashboard is a fixed React app inside the wheel (`web/`, built into `web_ui/`); extension points: `cao.plugins` entry-point event plugins (`src/cli_agent_orchestrator/plugins/base.py`, `on_mcp_server` can register MCP tools/resources) and MCP Apps (`cao_mcp_apps/`, `ui://cao/dashboard|agent|event-stream` single-file HTML, rendered by an MCP-Apps host such as Claude Desktop, Goose, VS Code Copilot). `web/` has react but no markdown/mermaid renderer dependency.
- Multi-repo: a script run has one project root (`working_directory`, authoring guide lines 10-14) that also fingerprints approval; agent steps "that name no directory" use it, so a step may name another directory. No project registry; cross-repo PR flow is ours.

| Score | Source | Reason |
|---|---|---|
| M1 3 | docs/workflows.md; workflow-scripts-authoring-guide.md | Scripts decide next step in code from step output, durable journal, resume, recovery policy; approval of plan. Gate states / fix-round limit are ours but easy in code. Stored server-side, synced from our repo |
| M2 2 | docs/agent-profile.md; docs/claude-code.md etc. | Per-agent profiles with prompt, provider, tool restrictions (docs/tool-restrictions.md); 12+ provider families; cost limits not seen |
| M3 1 | web/src/components/workflow/PlanApprovalForm.tsx; docs/mcp-apps.md | Only a plan-id approval form; richer card would be our MCP App in a third-party host or a separate UI over its HTTP API |
| M4 1 | docs/workflow-scripts-authoring-guide.md ("one project root") | One root per run, per-step directory possible; no projects registry, no PR object |
| M5 1 | docs/external-tool-integration.md | Via scripts / MCP; none native |
| M6 1 | scripts | Agent CLIs run git/gh; rules ours |
| M7 1 | docs/tmux.md; docs/security.md | tmux sessions share the project root, no worktree/sandbox; tool restriction per profile |
| M8 2 | docs/workflows.md (journal, resume), docs/terminal-lifecycle.md | Durable journal and resume after interruption; day-long gate waits and per-item caps not verified |
| M9 2 | docs/api.md (OAuth protected-resource, scopes), PlanApproval `approved_by` | Auth optional ("off by default"), scoped tokens, approver recorded; no roles for the Operator |
| M10 2 | src/cli_agent_orchestrator/plugins/, docs/plugins.md, cao_mcp_apps | Workflows via API, plugins via entry points, MCP apps; the web dashboard is not extensible without fork |
| S1 2 | docs/flows.md | `cao schedule` cron flows; webhooks via our plugin |
| S2 2 | docs/otel-deployment.md | OTel; per-item provenance ours |
| S3 0 | n/a | None |
| S4 2 | docs/fleet-coordinator.md; MCP server | Supervisor agent and MCP tools to read/steer |
| S5 1 | docs/event-driven-architecture.md | Event plugins can notify; none built in for the Operator |
| S6 2 | docs/mock-cli-provider.md | Mock CLI provider can stand in for agents |
| S7 2 | repo metadata | Apache-2.0, 98 contributors, outside PRs merged; AWS Labs (experimental label risk), local-first |

Verdict: COULD PASS WITH WORK, with a different shape from the others: best fit on M1/M8 (code-driven durable workflows), weakest on M3/M4/M7. Work in our repo: a decision-request UI of our own (separate service or MCP App) over its HTTP API, since the bundled dashboard cannot be extended; per-repo worktrees and PR flow in the script; sync script to install workflows; verify that gates can wait days. Local-first server, auth optional.

---

#### Summary table (M3 / M4 / M10, verdict)

| Candidate | M3 | M4 | M10 | Verdict |
|---|---|---|---|---|
| OpenHands (Canvas + SDK + automation) | 2 | 2 | 2 | Could pass with work (decision page as Canvas Extension, script runner driver; M9 weak in OSS) |
| vibe-kanban | 1 | 2 | 1 | Out (sunsetting, no extension API) |
| cline/kanban | 0 | 1 | 1 | Out (M3 0, M9 0) |
| kilocode | 1 | 1 | 2 | Out (IDE agent, M9 0) |
| goose | 2 | 1 | 3 | Could pass with work (MCP App card; no engine) |
| CAO | 1 | 1 | 2 | Could pass with work (code workflows; own UI needed) |

## Appendix part D2

### D2 market scan: parallel-agent desktop managers (read 2026-11-26)

Metadata via `gh api` (stars, pushed_at, contributors, last 30 merged PRs). All GitHub data read 2026-11-26.

#### Summary table

| Candidate | M3 | M4 | M10 | Verdict |
|---|---|---|---|---|
| pingdotgg/t3code | 2 | 2 | 2 | could pass with work in our repo (only real contender here) |
| Nimbalyst (Crystal successor) | 1 | 1 | 2 | out: desktop editor, no workflow engine (M1) |
| imbue-ai/sculptor | 2 | 1 | 2 | out: no workflow engine, one repo per workspace, no server |
| ParadevAI/Paradev | 1 | 1 | 1 | out: workspace manager, automations are paid Pro |
| slopus/happy | 1 | 1 | 1 | out: remote control for CLI agents |
| smtg-ai/claude-squad | 0 | 0 | 0 | out: tmux TUI, AGPL |
| Conductor | n/a | n/a | n/a | closed source (Mac app); not scored |
| terragon-oss | 0 | 1 | 0 | out: product shut down, snapshot |
| Crystal | n/a | n/a | n/a | deprecated Feb 2026 |
| Roo-Code | n/a | n/a | n/a | archived, extension shut down 2026-05-15 |
| AutoForge | 0 | 0 | 0 | out: unmaintained, AGPL, single-app builder |

---

#### 1. pingdotgg/t3code (T3 Code) - the only candidate with a real workflow layer

- URL: https://github.com/pingdotgg/t3code. "Open-source control plane for coding agents" (server + web/desktop/iOS/Android clients). Drives Claude Code, Codex, Cursor, OpenCode, ACP agents. Has a Labs feature "Workflows": durable TypeScript workflows (Effect v4).
- License: MIT (LICENSE, Copyright 2026 T3 Tools Inc.). No EE directory seen. Trademarks section in README (forks need own branding).
- Stars 79,272; created 2026-02-08; last push 2026-11-25T20:59Z; last 3 commits 2026-11-25 (20:52, 20:40, 20:37); releases nightly + v0.1.12 (2026-11-25). Version 0.1.x. Contributors 481. Outside PRs merged: yes (of last 30 merged, authors include juliusmarminge 14, only21mil 8, plus 8 other individuals with 1 each).
- Workflow definition: TypeScript files in `~/.t3/workflows/` or whatever `T3CODE_WORKFLOWS` points at (folder or file); server watches and hot-reloads; versioned (`version` int, old versions kept while runs unfinished). Source: docs/user/workflows.md, skills/t3-workflows/SKILL.md. Globals `T3, Effect, Schema, Option` are injected, the file imports nothing. Next step is decided by code: `agent(name,{returns: Schema})` completes only when the agent submits schema-valid data (up to 2 correction prompts), the body branches on it. Not from prose.
- Decision UI: `ask(name,{title, choices, kind?, data?, links?, timeout?})`.
  - Component: `apps/web/src/components/workflows/WorkflowRunFeed.tsx` (the question card, ~lines 1900-2060; `FeedCard tone="ask"`), shape read by `packages/client-runtime/src/workflows.ts` `readWorkflowQuestion`. Mobile: `apps/mobile/src/features/workflows/`.
  - Format: title (plain), `data.body` rendered with `ChatMarkdown` (`apps/web/src/components/ChatMarkdown.tsx`) which has custom renderers for table (`chat/MarkdownTable.tsx`), `details` (`chat/MarkdownDetails.tsx` = collapsible), mermaid code blocks (`chat/MarkdownMermaidCodeBlock.tsx`, `MermaidDiagram.tsx`), math, GitHub alerts (packages/shared/src/markdownMath.ts, markdownGithubAlerts.ts). I did not enumerate the remark plugin list; table/details/mermaid components are present in the source.
  - Options on the same card: yes, buttons (first is primary) with per-choice `description` text under the button; `requireReason` makes a reason mandatory. Free text: only an "Add a reason" input that goes with whichever choice is picked, not a standalone "Other" answer (answer = choice + reason). `links` render as outline buttons. Answer records `answeredAt`, `answeredBy` (device name or tool).
  - Author-shapeable: yes via data. `data.body` markdown is read in source (`field(field(request,"data"),"body")`) but is NOT in the docs or the skill file: undocumented, can change. No custom component or UI plugin API for the card. Charts: mermaid only (no chart library seen). "Ask the agent first" opens the agent thread.
  - Also: "Needs you" list with filter by `kind`, `t3 workflow questions`, `t3 workflow signal` to answer from CLI/chat/script.
- Multi-repo: docs/user/multi-repo-projects.md: one project covers every repo inside its folder (and up to 128 added folders); one thread can read and change all. Many projects per server. In a workflow, `agent({project, workspace:{type:"worktree"}})` per repo in parallel, `pullRequests.list/read/comment/act/wait`, `issues.*` per project; `Issue`/`PullRequest` rows carry `projectId`. No documented "create PR" primitive among the `pullRequests.*` calls (agent or a step does it; `apps/server/src/git/GitWorkflowService.ts` exists). Fan-out to N repos and one PR each is therefore code in our workflow.
- Scores:
  - M1 3 - docs/user/workflows.md, SKILL.md - TS workflow files, typed JSON verdicts, durable replay; Labs feature, "early" per its own docs, so API may move.
  - M2 2 - SKILL.md "Agents" table - per-step `brief`, `model {instanceId, model, options}`, `timeout`, `quiet`; several providers so cross-family reviewer is possible; skills/rules come from the project's own agent config, no per-step cost cap seen.
  - M3 2 - WorkflowRunFeed.tsx, ChatMarkdown.tsx, client-runtime/workflows.ts - markdown+tables+mermaid+folds+links+options-with-effects on one card; gaps: `data.body` undocumented, no recommendation/confidence field (put it in markdown), free text is a reason not an "Other" ruling, no tracker/chat mirror (ours via `t3 workflow questions --json`/signal).
  - M4 2 - docs/user/multi-repo-projects.md, SKILL.md - many projects, multi-repo project, per-project agents and PR API; no single-call "PR in each repo".
  - M5 2 - SKILL.md "Issues and pull requests" - `issues.*` on the project's configured tracker ("GitHub, GitLab, Linear"); Jira not seen, via MCP in an agent; trust-by-author is our code.
  - M6 2 - SKILL.md `pullRequests.act` (merge/close/ready/update-branch), `pullRequests.wait` on checks; branch convention and protected-branch rule are ours.
  - M7 2 - SKILL.md workspace `worktree`, `runtimeMode`; worktree isolation, secrets docs (docs/user/secrets.md) exist; egress control not verified.
  - M8 3 - docs/user/workflows.md - journaled steps survive restarts, `ask timeout: "2 days"`, signals kept 7 days, `--key` dedupes a run per item, `within(pool,{limit})` caps, pause/resume/cancel.
  - M9 2 - docs/user/remote-access.md, workflows.md - permission scopes (answering needs "operate threads"), answer records `answeredBy`=device/tool; not users-and-roles per person.
  - M10 2 - workflows.md - `T3CODE_WORKFLOWS` can point at a folder in our repo, skills in our repo, platform updated by upgrade; gap: no UI extension point, so card shape is limited to `data.body`/links (a fork or upstream PR to change it).
  - S1 3 - workflows.md Triggers - every/daily, webhooks, issues.opened, pullRequests.opened.
  - S2 1 - workflows.md "Agent threads" - transcripts per agent thread; cost/model per role not verified.
  - S3 1 - SKILL.md `pullRequests.wait`; no environment/release/rollback concept; ours.
  - S4 1 - `apps/server/src/mcp/toolkits/workflow/` and `t3` CLI exist, so a Supervisor can read/start/signal runs; not read in detail.
  - S5 2 - docs/user/mobile-notifications.md - phone alerts when an agent "needs approval or asks for input"; not confirmed that workflow `ask` pushes with a card link.
  - S6 1 - `evals/workflow-authoring/`, `apps/server/src/orchestration-v2/testkit` - fixtures exist, no documented way to stub `agent` with a verdict; we would write it.
  - S7 3 - MIT, very active (daily commits, 481 contributors, outside merges).
- Verdict: could pass with work in our repo. Port stages as `workflow(...)` TS files; put decision card in `data.body` markdown (tables, mermaid, `<details>`), options with `description`; own gaps: standalone "Other" ruling (use a `requireReason` choice or a second `ask`), tracker/chat mirror (read `t3 workflow questions --json`), multi-repo PR fan-out, stub harness. Risks: Labs/early API, undocumented `data.body`, effect-v4 authoring style, only one provider-agnostic UI (no UI plugin).

#### 2. Nimbalyst (Crystal successor) - stravu/crystal is deprecated

- stravu/crystal: MIT, 3,129 stars, created 2025-06-05, last push 2026-02-26, README: "Crystal Is Now Nimbalyst. Deprecated: February 2026." Not archived flag but dead. Out.
- Nimbalyst/nimbalyst (https://github.com/Nimbalyst/nimbalyst): MIT (LICENSE; LICENSING.md says the collaboration sync server is a separate project, not in repo). 2,112 stars, created 2025-10-30, pushed 2026-11-23, last 3 commits 2026-11-23, contributors 60; merged PRs from several outside authors (Knifiel 11, CaptainMittens 6, Yogitmeister 6...) - maintainer-heavy team though.
- What it is: Electron desktop "AI-native workspace" (editors for markdown, diagrams, code) with agent sessions in git worktrees, trackers, iOS app. Not a workflow engine: "workflows" are Claude commands/skills (`packages/electron/src/main/services/AgentWorkflowService.ts`), tracker items.
- Decision UI: `packages/runtime/src/ui/AgentTranscript/components/CustomToolWidgets/AskUserQuestionWidget.tsx`: Claude's AskUserQuestion rendered as card, option buttons (single/multi) plus "Other" with text input, same card. Question text passed as a string to a `WidgetBlock` (markdown rendering not verified). `ExitPlanModeWidget.tsx` has approve/feedback textarea. Not author-shapeable per workflow.
- Extension SDK (packages/extension-sdk-docs/contribution-points.md, ai-tools.md): custom editors, AI tools, Lexical nodes, `setTranscriptMarkdownContributions()` (render transcript markdown languages such as mermaid/math with custom widgets), manifest-declared. That is a UI extension point, in our repo possible without fork, but it targets transcript markdown, not the approval card.
- Multi-repo: only `GitCommitService.multiRepo.test.ts` seen; no doc read. Worktree per session.
- Scores: M1 0 - no workflow engine (verified services list); M3 1 - AskUserQuestionWidget.tsx (options+Other on one card; no tables/diagrams proven, no author control); M4 1 - GitCommitService.multiRepo.test.ts exists only; M8 0/1 - local desktop sessions, no durable server workflows seen; M9 0 - single-user desktop (sync server proprietary/separate); M10 2 - extension SDK + `.claude-plugin`; S7 3 - MIT, active.
- Verdict: out. M1/M8/M9 are about a server workflow engine, which this is not. Useful as UI reference only.

#### 3. imbue-ai/sculptor

- https://github.com/imbue-ai/sculptor. MIT (LICENSE.md, Imbue Inc). 286 stars, created 2025-08-07, pushed 2026-11-25, last 3 commits 2026-11-23/22/20. Contributors 9; merged PRs last 30: all by one author (DanverImbue 30). README: "don't have the bandwidth for a large volume of external contributions". Experimental research preview.
- Desktop app (Mac/Linux), one workspace = worktree of one repo; skills bundle `sculptor-workflow` (spec, mock, fix-bug; docs/help/skills.md) - workflows are Claude skills run by a human, no engine, next step by agent.
- Decision UI: `sculptor/frontend/src/pages/workspace/chat/AskUserQuestion.tsx`: `MarkdownBlock` (components/MarkdownBlock.tsx: react-markdown with remark-gfm + remark-emoji, so GFM tables yes; no mermaid seen) for question and option description; radio/checkbox options, "Other" textarea on same card, draft kept. Not author-shapeable beyond what the agent sends.
- Extensions (docs/help/extensions.md): runtime JS modules adding panels, workspace widgets, home views, overlays, settings; no card/approval slot.
- Multi-repo: docs/help/workspaces.md "an isolated working copy of one repository"; no multi-repo item.
- Scores: M3 2 - AskUserQuestion.tsx, MarkdownBlock.tsx (GFM markdown, options+Other, same card; no diagrams/fold/author control); M4 1 - workspace = one repo (docs/help/workspaces.md); M10 2 - docs/help/extensions.md (panels/widgets at runtime, no fork); M1 0 - no engine; M8 0; M9 0 (desktop, no team server seen); S7 3.
- Verdict: out (no workflow engine, no team server, single maintainer org).

#### 4. ParadevAI/Paradev (formerly Superset)

- https://github.com/ParadevAI/Paradev. MIT (LICENSE.md, Superset Inc). 16,662 stars, created 2025-10-21, pushed 2026-11-25, last 3 commits 2026-11-25. Contributors 168; merged by 4 authors in last 30 (Kitenite 16, saddlepaddle 9, AviPeltz 4, itsNintu 1) - team-driven.
- Desktop/mobile/web workspace manager: worktree per task, CLI/MCP/SDK, terminal or chat view. Automations (schedule/GitHub/Slack/Linear/Sentry triggers) are a Pro plan feature (apps/docs/content/docs/automations.mdx), run against a project on a device. No workflow definition in repo; next step is the agent.
- Decision UI: `apps/desktop/src/renderer/.../Transcript/components/ApprovalRow/ApprovalRow.tsx` (option buttons) and `QuestionForm/components/QuestionPage/QuestionPage.tsx` (single/multi choices + "Other" text); mobile `apps/mobile/.../ApprovalCard/`. Markdown rendering of the question not verified. Not author-shapeable.
- Multi-repo: docs/using-monorepos.mdx: workspace at one repo root; many projects, no one-item-many-PRs.
- Scores: M3 1 - ApprovalRow.tsx/QuestionPage.tsx (options+Other only); M4 1 - projects many, no cross-repo item; M10 1 - plugins page lists MCP integrations, no UI extension seen; M1 0; M8 0/1 (cloud automations paid); M9 1 (org plans, paid tiers); S7 2 - MIT but paid features gated.
- Verdict: out (no engine; automations paid).

#### 5. slopus/happy

- https://github.com/slopus/happy. MIT, 24,831 stars, created 2025-07-18, pushed 2026-11-25, last 3 commits 2026-11-25. Contributors 74; merged: ex3ndr 29 + one other (single maintainer). Monorepo packages: happy-cli, happy-server, happy-wire, mobile apps; desktop in separate repo slopus/happy-desktop.
- What: mobile/web remote control and relay for Claude/Codex/Gemini sessions, E2E encrypted, "multiplayer". Permission handling in `packages/happy-cli/src/claude/utils/permissionHandler.ts`, questions notification `questionNotification.ts`. App UI lives in other packages/repo; not inspected deeply.
- No workflow definition, no multi-repo item, no UI extension API seen.
- Scores: M3 1 - permissionHandler.ts/questionNotification.ts (approval relayed to phone; card rendering not verified); M4 1 - sessions per folder only; M10 1 - MIT, forkable, no plugin API seen; M1 0; M8 0; S7 3.
- Verdict: out (not an SDLC engine).

#### 6. smtg-ai/claude-squad

- https://github.com/smtg-ai/claude-squad. AGPL-3.0, 8,869 stars, created 2025-03-09, pushed 2026-11-13, last commits 2026-11-13, 2026-08-20, 2026-08-20. Contributors 21; outside PRs merged (19 distinct authors in last 30).
- Terminal TUI over tmux + git worktrees; auto-accept flag only. No workflows, no card, no multi-repo, no plugin. M3 0, M4 0, M10 0. Out.

#### 7. Conductor (conductor.build)

- Closed source Mac desktop app ("runs on a Mac", www.conductor.build/docs). GitHub org `conductor-build` exists with 0 public repos (gh api users/conductor-build, 2026-11-26); docs mention no source or licence. Third-party clones exist (e.g. simion/termic AGPL), unrelated.
- Offers a beta REST API (`api.conductor.build/v0`: projects, workspaces, sessions, messages, routines via webhook, SQL over transcripts), MCP server and CLI. Not scored: closed, cloud/Mac only, workflow = its own "Workflow" concept, no source to extend. Source: https://www.conductor.build/docs/api.

#### 8. terragon-labs/terragon-oss

- https://github.com/terragon-labs/terragon-oss. Apache-2.0, 262 stars, created 2026-01-16, last push 2026-02-10 (2 commits), 1 contributor. README: "Snapshot notice (January 16, 2026): open-source snapshot of Terragon at the time of shutdown ... as-is, no maintenance". So yes, the product was shut down.
- Was a cloud background-agent orchestrator (Next.js, Postgres, Redis, Stripe, sandbox containers, `terry` CLI + MCP, automations). No workflow engine in repo, no card, no plugin. M3 0, M4 1 (tasks per repo), M10 0. Out: dead and needs Stripe/cloud stack.

#### 9. Roo-Code (RooCodeInc/Roo-Code)

- Archived (gh `archived: true`), Apache-2.0, 24,234 stars, last push 2026-05-15. README: "The Roo Code Extension was shut down on May 15th." VS Code extension, not a server engine. Out.

#### 10. AutoCoder / AutoForge (leonvanzyl/autocoder -> AutoForgeAI/autoforge)

- https://github.com/AutoForgeAI/autoforge. License: LICENSE.md is AGPL-3.0 (API reports NOASSERTION). 1,775 stars, created 2025-12-30, last push 2026-07-16. README: "This repository is no longer actively maintained." Contributors 25; leonvanzyl 13 of last 30 merged.
- Long-running two-agent app builder (initializer + coder, Claude Agent SDK, React UI, Python). Single project, feature list, no decision card, no multi-repo, no plugin points. M3 0, M4 0, M10 0. Out.

## Appendix part E1

### E1: six newer / missed candidates (read 2026-11-26, shallow clones of default branch in scratchpad/clones-E1, nothing run)

Scores use the checklist in research/atlas/research/2026-11-platform-requirements.md. Paths are inside the cloned repo of the candidate.
Contributors = `gh api repos/X/contributors` count. "Outside PRs" = authors of the last 200 merged PRs (30 for foreman/andon/background-agents).

#### Summary table

| Candidate | M3 | M4 | M10 | M1 | Verdict |
|---|---|---|---|---|---|
| paperclipai/paperclip | 3 | 2 | 2 | 1 | Could pass with work: needs a workflow layer of ours as plugin/agents; decision card is the best seen |
| OrchestratorInc/agent-orchestrator | 0 | 0 | 0 | 0 | Out (local desktop app, no workflow engine, one repo per project) |
| superplanehq/superplane | 1 | 2 | 1 | 2 | Could pass only partly: approval card is bare; custom components need Go in the binary; EE split is about RBAC/audit/billing |
| open-inspect/background-agents | 0 | 3 | 1 | 0 | Out as an engine for us (no gates, no decision UI); useful as a multi-repo reference |
| thruwire/foreman | 0 | 0 | 2 | 0 | Out (a supervisor library, not a platform; no UI) |
| mitaku/andon | 1 | 1 | 2 | 2 | Out for a team (author says: personal, one person, no PRs accepted, unstable); closest in design to our pipeline |

#### 1. paperclipai/paperclip

- URL https://github.com/paperclipai/paperclip. "Manage agents at work": Node server + React UI that runs a "company" of agents (org chart, goals, budgets, tasks called issues, heartbeats, approvals). Not an SDLC pipeline engine; a general agent-management product with coding agents as one kind of worker.
- License MIT (LICENSE; no ee/ or enterprise dir found). Stars 117,014. Created 2026-03-02. Last push 2026-11-25. Last 3 commits on `master`: 2026-11-25T20:44Z, 20:35Z, 20:30Z (all by the top maintainer). Contributors 262.
- Outside PRs: last 200 merged: cryppadotta 151, devinfoley 21, paperclipbugbot 10, nickyleach 6, scotttong 5, tonio-alucema 3, nguyenm7 2, bots 2. So a handful of non-top people merge, but it is essentially a company-staffed repo; community PRs are rare among merged ones.
- Workflow definition: no workflow DSL. Work is issues assigned to agents that wake on heartbeats; next step is the agent's own choice (comments, handoffs, creating sub-issues). The only code-enforced structure is `executionPolicy` per issue: an ordered list of `review` / `approval` stages with participants (agent or user), `approvalsNeeded: 1` (docs/guides/execution-policy.md). Definitions live in the platform DB; companies can be exported/imported as packages (README "Company Portability", agentcompanies spec) so agents, skills, routines can be kept in a repo as a package. Next step is not from a JSON verdict.
- Decision UI (the strongest seen so far):
  - Issue-thread interactions, kinds `suggest_tasks`, `ask_user_questions`, `request_confirmation`, `request_checkbox_confirmation`, `request_item_verdicts` (packages/shared/src/validators/issue.ts ~line 2192). Card component: ui/src/components/IssueThreadInteractionCard.tsx (4,802 lines); also a "Needs You" side panel in ui/src/components/coordinator/CoordinatorNeedsYou*.tsx; older formal approvals use ui/src/components/ApprovalCard.tsx + ApprovalPayload.tsx.
  - Format: markdown through ui/src/components/MarkdownBody.tsx = react-markdown + remark-gfm (tables) + mermaid (lazy `import("mermaid")`, MermaidDiagramBlock at line 715) + issue/case reference links; HTML is not rendered (no rehype-raw). Payload fields: `detailsMarkdown` (max 20,000 chars), `previewMarkdown`, question `prompt`, `helpText`, option `label`/`description`, `recommended: true` flag. Collapsible parts exist in the card (`<details>`, Collapsible) for tool-action arguments and results; a collapsed evidence section is not an authorable field, but `<details>` is not rendered inside markdown, so folded evidence in the body is not available, only the card's own folds.
  - Options are buttons on the same card, single/multi select, a `freeText` option or `allowOther` gives free text returned as `otherText` (validators/issue.ts line 1440-1470, ui line 1442-1571); answers recorded on the thread with who answered; accept/reject/"Revise..." verbs.
  - Author-shapeable: any agent or plugin with `issue.interactions.create` creates a card through the API with its own markdown body and options. Plugins can read interactions (`issue.interactions.read`) and answer on behalf of a paired board user (`issue.interactions.respond`, `approvals.respond`) (packages/shared/src/constants.ts PLUGIN_CAPABILITIES). No slot replaces the card itself; plugin UI slots are `page`, `detailTab`, `taskDetailView`, `dashboardWidget`, `commentAnnotation`, etc. (PLUGIN_UI_SLOT_TYPES, constants.ts line 1665).
  - Tracker/chat mirror: the same decision is visible in the issue thread (comments) and in the Needs You queue; chat connectors exist (doc/CHANNELS.md, doc/chat-connector-development.md).
- Multi-repo: yes, partly. Projects are many per company; a project has several repository workspaces; tasks materialize "the other distinct repositories as editable checkouts inside their workspace" (doc/project-repositories.md, doc/workspace-repositories.md). One issue can therefore touch several repos; the PR in each is made by the agent (no engine-level "PR per repo" object seen). Multiple companies per instance too.
- Extensibility (M10): a real plugin system. Worker-process plugins with a manifest, capabilities, events, jobs, tools, DB namespace with migrations, UI bundles mounted in slots, runtime upgrade without operator action when apiVersion unchanged (doc/plugins/PLUGIN_SPEC.md; packages/plugins/sdk; examples in packages/plugins/examples; scaffolder packages/plugins/create-paperclip-plugin). Agent adapters are also pluggable (adapter-plugin.md). Plugins can be installed from npm/local path (doc/plugins/DISTRIBUTION-PLUGINS.md). So our workflow logic, scripts and extra UI (a tab with our states) can live in our own plugin package without forking; the decision card stays the platform's.

Scores:
- M1 1 - docs/guides/execution-policy.md; no workflow DSL, next step is agent behaviour; we would write a plugin that owns state and issue creation, deciding steps from JSON verdicts (jobs/events/tools in the SDK). Substantial work.
- M2 3 - per-agent adapter, model, instructions, skills, budgets (README; packages/adapters/*; doc/agent-instruction-revisions.md); several families (claude, codex, gemini, grok, kimi, cursor, opencode, hermes).
- M3 3 - ui/src/components/IssueThreadInteractionCard.tsx, MarkdownBody.tsx (GFM + mermaid), validators/issue.ts (options, recommended, freeText, otherText). Gaps: no charts, no folded evidence inside markdown, confidence is not a field (put in markdown).
- M4 2 - doc/project-repositories.md: many projects, many repos per project, checkouts in one task workspace; PR per repo is the agent's job; no cross-repo run object.
- M5 1 - connections/connectors catalogue exists (doc/connections/CONNECTOR-PLAYBOOK.md, FIRST-30-MATRIX.md mention Jira); GitHub repo grants confirmed; Jira/GitHub Issues intake as a trusted-author mirror not verified, a plugin of ours would do it.
- M6 2 - GitHub connection + PR-review webhook docs (doc/PR-MERGE-REVIEW-WEBHOOK.md, doc/UNTRUSTED-PR-REVIEW.md); branch templates in doc/project-repositories.md; merge-by-risk rules are ours.
- M7 3 - sandbox providers: packages/plugins/sandbox-providers/{daytona,e2b,kubernetes,modal,cloudflare,...}; workspaces and worktrees; secrets service (docs/api/secrets.md), doc/LOW-TRUST-PRESETS.md.
- M8 2 - heartbeat runs, routines, watchdog (doc/TASK-WATCHDOG.md), Postgres; an interaction waits until answered (continuationPolicy). "One run per item and state" and a cap on waiting items are ours.
- M9 3 - board users, invites, instance_user_roles, access grants (doc/DEPLOYMENT-MODES.md; capabilities `access.members.read`, `authorization.*`); responder identity re-verified on respond.
- M10 2 - doc/plugins/PLUGIN_SPEC.md, packages/plugins/sdk/src/ui/types.ts: full plugin SDK with UI slots and jobs; gaps: card cannot be replaced by a plugin, only fed; project is young (created 2026-03) and the SDK changes fast (apiVersion gate exists).
- S1 3 - routines on schedule/webhook/API (docs/api/routines.md); plugin jobs.
- S2 3 - doc/agent-observability.md, cost events per agent/run, heartbeat receipts, OpenTelemetry (README).
- S3 1 - no deploy/watch concept seen; a watcher agent + routine of ours.
- S4 3 - coordinator / agent chat with "Needs You" (ui/src/components/coordinator/*, doc/plans/2026-09-10-agent-chat.md); read/write split via capabilities. Not checked for "kept away from the signature" except `*.respond` capabilities being separate.
- S5 2 - chat connectors and notifications (doc/CHANNELS.md); link-to-card not verified.
- S6 2 - evals harness and a `paperclip-eval-kernel` package, plugin testing harness (packages/plugins/sdk/src/testing.ts); stub verdicts for our own plugin logic would be ours.
- S7 3 - MIT; very active (push 2026-11-25).

Verdict: could pass with work in our repo. M3 passes as shipped (markdown card with GFM tables, mermaid, options and answer on the card, free text, recommended flag), M4 mostly, M10 via plugin. Work: a Paperclip plugin (our repo) that holds our nine-stage state machine, creates issues and cards through the SDK, reads JSON verdicts and decides steps in code, plus the tracker mirror; agent roles as company package. Risks: product aimed at "run a business with agents" (org chart, CEO, hiring) so most surface is unused; huge, fast-moving codebase (16.8k files), contributions mostly from staff; strong sense this is a different mental model from our gated pipeline (agents pick work; we need code to pick the next step).

#### 2. OrchestratorInc/agent-orchestrator

- URL https://github.com/OrchestratorInc/agent-orchestrator. Yes, it is the former ComposioHQ/agent-orchestrator: `gh api repos/ComposioHQ/agent-orchestrator` resolves to the same id and returns full_name OrchestratorInc/agent-orchestrator (renamed/transferred; same 15,136 stars). Now an Electron desktop app (+ iPhone/Android clients) with a Go daemon: "plan, run and supervise fleets of agents from task to merged PR".
- License Apache-2.0 (LICENSE). `private/ao-cloud` exists but is an empty folder in the public repo (closed cloud part). Self-hosted remote host needs "AO account sign-in" (docs/self-hosted-remote.md) and a Cloudflare tunnel; sessions stay on the machine that started them, desktop/mobile are clients. Stars 15,136, created 2026-02-13, last push 2026-11-25. Last 3 commits 2026-11-26T02:12Z (UTC+5:30 local), 2026-11-25 20:42Z, 20:16Z. Contributors 141. Outside PRs: yes, many (ronishrohan 59, nikhilachale 35, illegalcall 25, Prasad-D-Ware 22, Meraj-08 11, +13 more); mostly team-looking accounts but wide.
- Workflow definition: none. An "orchestrator" agent plans and spawns workers per task; lanes (Working / Needs you / In review / Ready to merge) are derived from agent, PR, CI and review state (README). Next step comes from agent decisions plus derived status; CI/review feedback is routed back to the owning worker automatically. No definition files for stages.
- Decision UI: the dock for agent questions, frontend/src/renderer/components/chat/ElicitationDock.tsx (form from the MCP elicitation JSON schema, accept/decline/cancel, URL mode); history in ElicitationHistory. Plain form fields, no markdown card authored by a workflow (markdown libs exist in the app for chat: react-markdown, remark-gfm, rehype-raw, rehype-sanitize, mermaid in frontend/package.json, used by the chat timeline, not by the dock as far as read). Options as fields; free text through a text field; author cannot shape beyond the schema the agent sends.
- Multi-repo: docs/plans/session-lifecycle-persistence.md:170 calls the code "unused multi-repo scaffolding": a session has one repo/worktree; many projects per install yes. Multi-repo inside one session was not found (file-viewer plans mention multi-repository prefixes, so there is partial awareness).
- Extensibility: "plugins" are agent harness adapters (docs.orchestrator.inc/plugins/agents catalog, frontend/src/docs/content/plugins/agents); no UI extension points seen; no workflow plugins.

Scores: M1 0 (no workflow layer; docs/architecture.md), M2 2 (agent and model per task, 35+ harnesses; docs/harnesses; no per-role limits), M3 0 (ElicitationDock.tsx form only), M4 0 (docs/plans/session-lifecycle-persistence.md:170 one repo per session; many projects only), M5 1 (GitHub PR/CI/review observer, docs/scm-observer.md; no tracker intake), M6 3 (PR, CI, reviews, merge lane; docs/scm-observer.md), M7 3 (worktree per session, daemon docs/architecture.md; egress control not verified, so 2 on that axis), M8 2 (daemon survives app restarts; detached hosts keep turns; days at a gate not verified), M9 0 (single-user desktop; account sign-in only for remote hosts, no roles), M10 0 (no extension points for workflows or UI; our pieces would be a fork), S1 1, S2 2 (telemetry docs/telemetry.md, cost controls), S3 0, S4 3 (orchestrator chat is the product), S5 2 (mobile apps), S6 0, S7 2 (Apache-2.0, but cloud closed and remote needs AO account).
Verdict: out. M3, M9 and M10 are 0 and cannot be added from our repo without forking.

#### 3. superplanehq/superplane

- URL https://github.com/superplanehq/superplane. "Open source factory for one-shot engineering": Go backend + React web; workflow canvases (51 integrations, components: approval, if, merge, filter, loop, timegate, http, ssh, runner...) and a newer "factory" layer: factories with work orders, lines (sequence of steps, each running a factory-owned canvas), automations v2 (YAML), Backlog / Implement / Verify / Done stages, PR verification, merge confidence (docs/design/factory.md, docs/prd/software-factory.md). Factories are behind an experimental feature flag `factories` (docs/design/factory.md).
- License: GitHub reports NOASSERTION because LICENSE is Apache-2.0 plus a header note: files in `/ee` are under the SuperPlane Enterprise Edition License (ee/LICENSE: use requires agreeing to SuperPlane Terms of Service and having a valid EE license for self-hosted deployments; patches allowed for dev/test only). EE contents: ee/billing (Polar billing), ee/rbac (custom roles, groups), ee/githubenterprise. Licensed feature keys: custom_roles, groups, github_enterprise, audit_logs (pkg/licensing/features.go). One binary; EE code always inside, features switch on by an installation license (ee/README.md, docs/contributing/enterprise-licensing.md). Core (workflows, approval, factories, runners, MCP server, API) is Apache-2.0. So: built-in roles work without EE; custom roles, groups, audit logs and GitHub Enterprise need a paid license. Billing code is EE but "does not require a licence".
- Stars 10,136, created 2025-05-07, last push 2026-11-25. Last 3 commits 2026-11-25T18:09Z (forestileao), 13:52Z (superplanehq[bot]), 13:52Z (lucaspin). Contributors 77. Outside PRs: last 200 merged: superplanehq bots 117, forestileao 18, markoa 12, mytmlt 30, andrecalil 9, lucaspin 9, shiroyasha 5; all look like company staff; no clear external contributors in this window.
- Workflow definition: canvases (nodes and edges; stored in Postgres, import/export as YAML) and Automation v2 YAML (pkg/automationspec/definition.go: triggers manual/task_enters_stage/task_leaves_stage/pull_request_updated/schedule/webhook; steps with `bash` or `prompt`; agent harness superplane/claude-code/codex/openrouter). Storage is the platform DB; the CLI (pkg/cli/commands/automations) has only list/active/delete, so no apply-from-repo found (the canvas CLI may differ; not verified). Next step in canvases is by channel/edges (approved/rejected, if/filter expressions) so code-decided routing from a JSON verdict is possible with `if`/`filter` nodes over an agent's output; in automations it is stage movement by the platform.
- Decision UI: approval component pkg/components/approval/approval.go (config: list of approvers user/role/group; actions approve (optional comment) / reject (reason); channels Approved / Rejected); UI web_src/src/ui/approvalGroup/{index,ApprovalItem}.tsx. No body, no options, no rich content on the card (the approval node has only an approvers list; context is what the canvas run shows). Markdown stack exists in the web app (react-markdown, remark-gfm, rehype-raw, rehype-sanitize, mermaid in web_src/package.json; web_src/src/pages/app/Markdown.tsx) and work orders carry markdown artifacts/comments. A "needs attention" state for work orders waiting on decisions is in the PRD (docs/prd/software-factory.md line ~343, 378) with no decision-card component found; the PRD is a draft. Author-shaping: none beyond the approvers config.
- Multi-repo: yes by design in the factory layer: "A Factory is not bound to a single repository" and a work order can attach several repositories' PRs (docs/prd/software-factory.md items 18, 212, 524, 556, 644); work-order artifacts of type `pr` with URL; `order().repository_url`. Whether the engine opens one PR per repo in one work order is described in the PRD; implementation depth not verified. Many workspaces/organizations per install: yes (org-scoped; workspaces).
- Extensibility (M10): integrations and components are Go code compiled into the binary (pkg/integrations, pkg/components, docs/contributing/component-implementations.md); no runtime plugin system found. Our pieces would be canvases/automation YAML in the DB plus MCP server/API clients; custom UI not possible without a fork. Runners can execute our scripts (`bash` steps, pkg/runners).

Scores: M1 2 (pkg/automationspec/definition.go + canvases; stages and gates in code with `if`/approval nodes; definitions in DB, YAML import; not from-repo), M2 2 (Agent block per automation: harness, model, credentials; per-role limits only via timeout_seconds), M3 1 (pkg/components/approval/approval.go: approve/reject with comment only; markdown libs exist but no card to put it on; a workflow author cannot shape the card), M4 2 (docs/prd/software-factory.md items 18/212/524: factory not tied to one repo, PR artifacts per repo; implementation unverified), M5 2 (GitHub, Jira, Linear integrations: docs/components/{GitHub,Jira,Linear}.mdx; backlog intake from issues; trust-by-author not verified), M6 3 (vcs provider + GitHub/Bitbucket/GitLab, pr_feedback, merge confidence: pkg/factories/vcs, pkg/factories/mergeconfidence), M7 2 (runners, Daytona sandboxes, secrets: pkg/runners, pkg/integrations/daytona; egress pkg/networkpolicy), M8 3 (Postgres durable runs, approval waits, timegate), M9 3 (orgs, users, roles, service accounts, OIDC: pkg/authorization, pkg/oidc; custom roles need EE), M10 1 (components are compiled Go; definitions live in DB; export/import YAML only; docs/contributing/architecture.md), S1 3 (schedule/webhook triggers), S2 2 (run history, token usage; docs/prd/token-usage-and-billing.md), S3 3 (Render, Octopus, Coolify, DockerHub, Datadog etc. integrations), S4 2 (agent sidebar and MCP server pkg/mcpserver), S5 2 (Slack, Teams, Discord, email components), S6 1 (e2e tests only; stub verdict harness not seen), S7 2 (Apache-2.0 core; EE directory proprietary; active).
Verdict: could pass only with a lot of work and probably a fork for the card. M3 is 1 and not fixable in our repo (approval card has no body or options); M10 weak (compiled-in components). Interesting for M4/M6/M9 and as a reference for factory + work orders.

#### 4. open-inspect/background-agents

- URL https://github.com/open-inspect/background-agents. Open-source "Ramp Inspect" clone: hosted background coding agent; control plane (Cloudflare Workers/Durable Objects, or container), web UI, Slack/GitHub/Linear bots, sandboxes on Modal/Daytona/E2B/EC2/Vercel/boat; MCP server package. Single-tenant by design (README "Security Model (Single-Tenant Only)").
- License MIT (LICENSE; no EE found). Stars 3,512, created 2026-01-25, last push 2026-11-25. Last 3 commits 2026-11-25T12:18Z, 11:34Z, 10:32Z (arodiss). Contributors 61. Outside PRs: yes, last 30 merged: dependabot 9, arodiss 4, jehiah 4, rhlsthrm 4, duboff 2, hreiten 2, and 5 singletons; a genuinely mixed contributor base.
- Workflow definition: none. A session is a prompt in a sandbox; automations (cron, GitHub events, Sentry, webhooks) start a session with a prompt (docs/AUTOMATIONS.md). Definitions live in the platform DB (settings UI). No verdict-driven routing.
- Decision UI: none found. No ask-user/approval/question component (searched packages/web/src, sandbox-runtime). Web renders markdown with react-markdown + remark-gfm + mermaid (packages/web/src/components/mermaid-code-block.tsx) for chat, not for decisions. Free text is just a follow-up prompt.
- Multi-repo: yes, the strongest seen. A session can clone up to 10 repositories side by side, "pushes and pull requests are per-repository, so one session can produce PRs in several repositories" (docs/HOW_IT_WORKS.md lines 50-66); saved "Environments" are named repo sets (HOW_IT_WORKS.md ~118); automations fan out into one session per repository (docs/MULTI_REPO_AUTOMATIONS.md). Many repositories per install: yes (repo grants per team).
- Extensibility: managed skills (docs/MANAGED_SKILLS.md), MCP servers, memory, hooks in sandbox; sandbox providers are code-level contributions (docs/provider-contribution-checklist.md). No UI plugin API, no custom node types.

Scores: M1 0 (docs/AUTOMATIONS.md: prompts, no stages/verdicts/gates), M2 2 (model per session/automation, several providers: docs/AVAILABLE_MODELS.md, OPENAI_MODELS.md, GROK_MODELS.md; skills managed; per-role limits no), M3 0 (no decision component in packages/web/src), M4 3 (docs/HOW_IT_WORKS.md:50-66 and docs/MULTI_REPO_AUTOMATIONS.md: multi-repo session, PR per repo, environments, teams own repos), M5 2 (GitHub, Linear, Sentry, Slack triggers: packages/github-bot, linear-bot; Jira absent; trust by author partial), M6 3 (PRs with user attribution, GitHub autofix feedback: packages/control-plane/src/autofix), M7 3 (sandbox per session on Modal/Daytona/E2B/EC2: docs/*_SANDBOX_PROVIDER.md, docs/SECRETS.md), M8 2 (sandbox snapshot/restore ADR docs/adr/0003, 0004; long waits at a gate n/a), M9 3 (auth, teams, roles, enforcement flag: docs/AUTH.md, packages/control-plane/src/authorization), M10 1 (our logic would be prompts/skills only; no hook into control plane without fork), S1 3 (cron, event triggers, webhooks), S2 2 (docs/TRACE_EXPORT.md; cost per session), S3 0, S4 2 (Slack/GitHub/Linear bots and MCP server), S5 2 (Slack bot), S6 1, S7 3 (MIT, active).
Verdict: out as the engine (M1 0, M3 0, and M10 would be a fork). Good reference/borrow for our M4 (multi-repo sandboxes with PR per repo) if we ever build it ourselves.

#### 5. thruwire/foreman

- URL https://github.com/thruwire/foreman. Not an SDLC engine: a Python "agent supervisor" that watches coding-agent runs with a decision model (OpenAI Decisions API, TypeSafe Jev) and outputs continue/steer/stop/retry/verify/finish; runs workers (Codex, OpenCode, Hermes, dcode) or attaches to Pi sessions via hooks. No UI (no .tsx/.html found), no tracker, no multi-user.
- License MIT. Stars 836, created 2026-09-17, last push 2026-10-15 (6 weeks idle at the read date). Last 3 commits 2026-10-15T12:58Z, 12:22Z, 2026-10-09T14:43Z (JARosen). Contributors 6. Outside PRs: JARosen 22, tydinjarman 3, anchapin 2, ajaykr0905, kuishou68, zl190 1 each (small but real).
- Workflow: none, a supervision loop with responsibilities and thresholds configured in files (docs/routing.md); human escalation is the `needs_human` responsibility with no card (grep of docs/routing.md and runtime.md found only the responsibility name).
- Extensions: documented extension contract and registration (docs/extensions.md) for evidence providers and responsibilities - supports M10-style adding without fork for the supervisor only.

Scores: M1 0, M2 1 (workers pluggable; roles not), M3 0 (no UI), M4 0, M5 0, M6 0, M7 1 (workers run where launched), M8 0, M9 0, M10 2 (docs/extensions.md: extension registration for what it does), S1 0, S2 1, S3 0, S4 0, S5 0, S6 1, S7 2 (MIT, but idle since 2026-10-15).
Verdict: out (not a platform). Idea of interest only: a judge model deciding "needs_human" with a confidence, comparable to our recommendation with confidence.

#### 6. mitaku/andon

- URL https://github.com/mitaku/andon. "A one-person software factory": Go CLI + files-based kanban ledger per project + roles (Chief Engineer, Chief of Staff, Workers, independent cross-brand reviewer, gate with tiers A/B/C, retro) running in a Docker "cell" with herdr terminal workspace (README). Very close to our pipeline's concepts (owner called only for decisions; reviewer of another model brand; gate by risk tier; retro opens PRs fixing skills and rules).
- License Apache-2.0. Stars 217, created 2026-11-05, last push 2026-11-25. Last 3 commits 2026-11-25T16:34Z, 13:43Z, 13:20Z (mitaku; commit dates in the clone are +09:00). Contributors 1. Outside PRs: none; README says "pull requests are not accepted for now", "personal project... unstable... no support and no compatibility promise", "does not suit team use, use as a hosted service".
- Workflow definition: files in the repo (cell repo holds instructions, skills, wiki, project definitions); ledger `kanban/` with config.yaml, issue.yaml, questions.yaml and JSON schemas (docs/ledger.md, schema/ledger/*.json); process rules in process/ and a TLA+ model of issue rules (model/IssueRules.tla); next step decided by the dispatcher/gate in Go from rules and checks, not by agent prose (README steps 3-4, internal/gate, internal/dispatcher). Config-as-code in a repo: yes.
- Decision UI: no web card. The owner sees questions in terminals through herdr UI modules (package/host/inbox/main.js: "Needs you" list, amber andon light; kanban-board module; Stream Deck lamp); questions are YAML (`questions.yaml`, kinds incl. scope; `kanban answer --decided-by`). No markdown card, no mermaid, options through the CLI. Author-shapeable: UI modules are JS mods for herdr (package/host/*/mod.json), so UI pieces are ours but the surface is a terminal workspace.
- Multi-repo: many projects per cell (a cell per trust boundary), one issue = one worktree = one PR in one client repository; no multi-repo work item found (README "Worker ... one issue, one worktree, one PR").
- Extensibility: skills/process files live in our cell repo; Andon itself is upgraded by bumping the image tag (README "The image carries the tools... one pull request that bumps FROM"). That is the no-fork shape we want, but for one person.

Scores: M1 3 (kanban/ ledger + Go gate + TLA+ model: README, docs/ledger.md, model/IssueRules.tla; JSON verdict reading from reviewer "findings with a severity"), M2 3 (roles with own skills, different model brand for reviewer: README step 3), M3 1 (questions.yaml + herdr inbox, terminal only: package/host/inbox/README.md; no rich card), M4 1 (many projects per cell; one repo per issue; README), M5 2 (GitHub PR/issues via ghpr; outside trackers are an "owner decision": README table; Jira absent), M6 3 (tiers A/B/C, gate, CI, merge by risk, owner merges tier C: README), M7 3 (cell container per trust boundary, worktree per issue: README "The cell"), M8 2 (ledger files, waiting model docs/dispatcher.md; days at a gate fine as files; one run per item not checked), M9 0 (single owner: README "does not suit team use"), M10 2 (files in our cell repo and image bump upgrade; but author-only, no compatibility promise, docs/ledger.md versions), S1 3 (routines in ledger, dispatcher), S2 2 (internal/otel, internal/sessionlog), S3 1, S4 2 (Chief of Staff/Chief Engineer chat), S5 2 (Stream Deck lamp, inbox; push not seen), S6 2 (workflow_test.go, tests/ with stubs unverified), S7 1 (Apache-2.0 but one person, 3 weeks old, no PRs accepted).
Verdict: out as a platform for a team (M9 0 and project policy; no contributions accepted, "unstable"). Worth reading as a design cousin: ledger schema, TLA+ model of issue rules, tier gate, andon-light semantics.

#### Notes and caveats

- All reads are of the default branch on 2026-11-26; no code executed. Only the card components and docs listed were opened; line counts are from files in the clone.
- Paperclip claims not fully verified: Jira intake (M5), notification link-to-card (S5), whether a plugin can add a custom decision UI beyond slots (no such slot found).
- SuperPlane factory layer is behind a feature flag and the PRD describes more than the code was shown to do; multi-repo PR per work order is PRD level.

## Appendix part E2

### E2: newer or missed candidates (read 2026-11-26, primary sources only: repo files via `gh api`, README, docs)

Method: no clones needed; read `gh api repos/X/contents/PATH` and recursive trees. `gh search code` hit the rate limit, so some "no mermaid/markdown renderer" claims rest on tree names, `package.json` deps and the component read, not on a full grep. Marked "(tree only)" where so.

Summary table

| candidate | stars | licence | M3 | M4 | M10 | verdict |
|---|---|---|---|---|---|---|
| pullboard-dev/pullboard | 850 | MIT | 1 | 1 | 1 | out (fixed lifecycle, local machine) |
| Agent-Field/CodeAF | 839 | Apache-2.0 | 1 | 1 | 1 | out (terminal/desktop first, early preview) |
| lemma-work/lemma-platform | 661 | AGPL-3.0 (+Apache SDK/CLI) | 2 | 1 | 2 | not an SDLC engine; no git/PR layer |
| tobihagemann/turbo | 426 | MIT | 0 | 0 | 2 | out (Claude Code/Codex skill plugin, no server) |
| openfabriq/openfabriq | 36 | Apache-2.0 | 1 | 1 | 2 | out on M3/M4 as shipped; best M10 shape |
| volekerb/hivemill | 42 | MIT | 0 | 1 | 1 | out (CLI ask queue; web UI is legacy read-only) |
| yahor-punko/mavericks-os | 132 | NOASSERTION (README badge MIT) | 0 | 2 | 2 | out (no server or UI); cross-repo task pattern worth copying |
| ai-sdlc-factory/ai-sdlc-factory | 25 | MIT | 1 | 1 | 1 | out (workflows are C# source; decisions are forge comments) |
| extra: mikeparcewski/wicked-studio + wicked-crew | 174 / 0 | MIT / MIT | 2 | 1 | 2 | could pass with work, high bus-factor risk |
| extra (not scored fully): Team-Commonly/commonly | 1414 | Apache-2.0 | 2 | 0 | 1 | out (agent chat workspace, not SDLC) |

---

#### 1. pullboard-dev/pullboard
- URL https://github.com/pullboard-dev/pullboard . Git-native coordination queue for coding agents: spec rows (`SPEC.md`), items with a frozen bar, builder/verifier/coordinator agents in worktree lanes, a second agent verifies the exact commit, accepted work lands on main by itself. Local web "view" for the human.
- Licence MIT (LICENSE); CLA.md present. 850 stars, created 2026-10-07, last push 2026-11-23. Last 3 commits 2026-11-23 (04:32, 04:16, 04:05). Contributors: 1. Merged PR list (30): 1 PR, by coreyolson; work lands by the agent flow, so outside merges are not evidenced.
- Workflow definition: fixed lifecycle in the npm package (claim, submit, verify, land); our inputs are `SPEC.md`, `DOCTRINE.md`, `pullboard.json` (gate command, landing options) in the repo. Next step is decided by code from the verifier's CLI verdict (accept/reject with reason code), not from prose (README "Receipts", `pullboard.json`). We cannot define our own stages: it is their ADLC.
- Decision UI: `apps/view/src/logic/needs/panel.js` (`needsPanelModel`, `needsPanelHtml`), page `apps/view/src/io/page/shouts.js`. Format: hand-built HTML string, every value passed through `escape()`, body is escaped plain text, fields as `<dl>`, rows collapsed until opened. No markdown renderer, table or mermaid found (tree only). Options on card: action label per row kind (Confirm, Decide, Approve or decline, Review); answer goes through `pullboard shout` / rulings command, free text possible through shouts. Author-shapeable: no; the row kinds are hard-coded in `describe()`.
- Multi-repo: "every project on this machine" in one View page; each board lives in its own git repo; no item spanning several repos found.
- Scores:
  - M1 1 - README "How it works", `pullboard.json` - fixed lifecycle; we only tune gates and rules.
  - M2 2 - README "Plug in any agent: Claude Code or Codex, any MCP client", builder/verifier/coordinator roles; per-role limits not found.
  - M3 1 - `apps/view/src/logic/needs/panel.js` - escaped plain-text card with expandable fields and action label; no markdown, no author control.
  - M4 1 - README "Pullboard View ... every project on this machine"; one item = one repo.
  - M5 0 - no GitHub Issues/Jira intake in README or tree.
  - M6 1 - README "accepted work lands on main by itself" (opposes our rule); PR flow not default.
  - M7 2 - README "Lanes: each agent works in its own worktree"; no sandbox or egress control.
  - M8 2 - README "Activity: every claim, submit, reject, accept and landing"; state is in git; long waits via questions in shouts.
  - M9 1 - `docs/design/accounts-signin.md`, `docs/design/hosted-factory.md` are design docs; View runs locally.
  - M10 1 - repo holds spec and doctrine but the engine and UI are the package; no extension API found.
  - S1 1 - README mentions runners and sentinels; no tracker webhooks found. S2 2 - Activity and Cost tabs (`apps/view/src/io/cost/`). S3 0. S4 2 - coordinator agent plus `openfabriq`-like MCP client note ("add any MCP client"). S5 2 - README "Pair your phone ... Answer what's waiting" (relay, sealed). S6 0. S7 2 - MIT, active, single maintainer.
- Verdict: out. Fixed methodology, local-first, decision card is escaped text.

#### 2. Agent-Field/CodeAF
- URL https://github.com/Agent-Field/CodeAF . Go single-binary TUI "software factory" for open models: chats become task trees, each task in its own repo copy and branch; org server mode with desktop app.
- Licence Apache-2.0. 839 stars, created 2026-08-05, last push 2026-11-25. Last 3 commits 2026-11-25, 11-24, 11-24. Contributors 19. Merged PRs (30): AbirAbbas 21, santoshkumarradha 5, ZeroPoint95 2, joshbarrington 1, pcbeingused333 1 (outside PRs do land, a few). README: "early preview".
- Workflow definition: built-in subharnesses (senior-dev, sec, review) and saved "harnesses" on disk (`internal/manual/chat/saved-shapes-of-work.md`); not a state machine in our repo.
- Decision UI: question block in the terminal; payload `internal/seniordev/question/schema.go` (`Info{Question, Header, Options[{Label,Description}], Multiple, Custom}`); doc `internal/manual/chat/questions.md`: one sentence, why now, numbered answers, what is waiting, cost/reversibility of an answer, recommend-then-auto clock. Plain text, no markdown/mermaid. Options on same card yes, free text yes (`Custom`). Author-shapeable: the model raises it through its `ask` tool; no template. The desktop app (org mode) draws the same question object over a protocol (`docs/changes/unreleased/2331-plugins-protocol.md`); its source is not in this repo tree.
- Multi-repo: "every project on the machine" from one window; tasks per project; no item spanning several repos found in README.
- Scores:
  - M1 1 - saved harness docs; next step from model plans, not our JSON verdict.
  - M2 2 - README "six seats chosen per call", per-project models and spend limit.
  - M3 1 - `internal/manual/chat/questions.md` - rich-ish terminal card with cost of answer; no markdown tables, no diagrams.
  - M4 1 - README "One window for every project"; no multi-PR item.
  - M5 0 - none in README. M6 1 - README "lands on your branch, never main, dev or a release branch"; PR step not evidenced.
  - M7 2 - README "every task in its own isolated copy"; org mode "every chat in its own sandbox".
  - M8 2 - resident process, questions persist ("waiting under needs you"); durability across restarts not verified.
  - M9 2 - README "Run it for a team: an organization", `deploy/org`.
  - M10 1 - harness bundles on disk; no UI extension.
  - S1 2 - README "scheduled" on home; S2 2 - spend page by model and role; S3 0; S4 2 - chat is the product; S5 1 - phone through ssh or relay "built, switches on when hosted relay does"; S6 0; S7 3 - Apache-2.0, active.
- Verdict: out (terminal and desktop first, no author-shapeable cards, early preview).

#### 3. lemma-work/lemma-platform
- URL https://github.com/lemma-work/lemma-platform . General multiplayer agent platform (pods with agents, tables, workflows, web apps); not an SDLC engine.
- Licence: core AGPL-3.0 (LICENSE), SDKs, CLI and skills Apache-2.0 (`LICENSES/Apache-2.0.txt`); CLA required. 661 stars, created 2026-06-23, last push 2026-11-25. Last 3 commits 2026-11-25 (13:59, 13:49, 13:13). Contributors 7. Merged PRs (30): deepak-jha-kgp 26, anukuljha 4: company team, no outside merges.
- Workflow definition: pod exports as a folder of files (README "Inside a teammate"); workflow nodes are agent, function, decision, loop, wait, form (`lemma-backend/app/modules/workflow/domain/nodes/*.py`); decision node branches by expression, so the next step is code-driven; agent runs recorded step by step. Definitions are imported into the platform DB (repo is source of truth only by our discipline).
- Decision UI: form node `FormNodeConfig{input_schema (JSON Schema), ui_schema, assignee}` rendered by lemma-sdk `buildSchemaFormFields` (`lemma-frontend/src/workflow/form.tsx`, `waiting-inbox.tsx`). Chat messages render with react-markdown + remark-gfm + rehype-raw + sanitize (`lemma-frontend/src/thread/markdown.tsx`; no mermaid). Approval cards also on Slack, Teams, WhatsApp (`lemma-backend/app/modules/agent_surfaces/platforms/*/decision_cards.py`). Options as buttons: choice/boolean fields in the form; free text: string fields. Author-shapeable: yes in the form schema and, stronger, by building a pod web app on the TypeScript SDK (README "Apps") that reads waits and draws our own card. The `decisions` module is an AI-answers-a-question service (`modules/decisions/domain/questions.py`: closed choice/scale only, no free text), not the human card.
- Multi-repo: no git, worktree or PR primitives found in the tree (tree only); would be our own function nodes.
- Scores:
  - M1 2 - nodes/*.py - code nodes and decision expressions exist, but no SDLC states.
  - M2 2 - README "Agents: a model, an instruction, tools, tables, connectors".
  - M3 2 - `lemma-frontend/src/workflow/form.tsx` + README Apps - schema form on any surface, or our own app; no native recommendation card, no diagrams.
  - M4 1 - nothing git-aware; all ours.
  - M5 2 - README: webhooks from Slack, GitHub, anywhere; table-change triggers.
  - M6 1 - ours via function nodes. M7 1 - `desktop/agent-host` exists; sandbox and egress control for coding agents not verified.
  - M8 3 - README "Runs are durable ... wait for days".
  - M9 3 - README "People: own account and role, one permission model, row-level security, one history".
  - M10 2 - README pods export as files, apps via `lemma apps deploy`; definitions live in a DB and are imported.
  - S1 3 - schedule, table change, webhook. S2 3 - "each run recorded step by step". S3 0. S4 3 - the agent in Slack/Teams/web. S5 3 - Slack/Teams/WhatsApp/email approvals. S6 0 - not found. S7 1 - AGPL network copyleft for modifications to the core; active.
- Verdict: could pass only with a large build (the whole SDLC layer is ours); AGPL; interesting only as host for forms and apps. Not recommended over an SDLC engine.

#### 4. tobihagemann/turbo
- URL https://github.com/tobihagemann/turbo . Skill plugin ("agentic software factory") for Claude Code and Codex: `/turbo:plan`, implement, polish, ship. MIT, 426 stars, created 2026-03-11, last push 2026-11-24 (commits 11-24 08:13, 07:19, 11-23). Contributors 1. Not a server, no UI: decisions happen in the agent chat.
- Scores that matter: M3 0 (README "You decide at Shape and judge at Try and Ship" in chat); M4 0 (no multi-repo in README); M10 2 (skills and plugin files, upgrade by plugin update; README "Get Started"); M9 0; M8 0 (state in chat context). M1 1 (SKILL.md pipeline, next step by prose).
- Verdict: out (not an engine).

#### 5. openfabriq/openfabriq
- URL https://github.com/openfabriq/openfabriq . "Your AI software factory, as code": an `openfabriq/` folder in the repo (`factory.yaml`, `agents/*/agent.md`, `automations/*/automation.md`) applied by `openfabriq plan` / `apply`; an engine (Node 24, Claude Code + `gh`) runs automations on GitHub events; a local web studio shows the board.
- Licence Apache-2.0 (CLA). 36 stars, created 2026-11-16, last push 2026-11-24. Last 3 commits 2026-11-23 00:25, 00:20, 11-22. Contributors 4. Merged PRs (30): eixoweb 23, app/openfabriq (its own factory) 6, sharmis-tp 1.
- Workflow definition: markdown with YAML front matter in our repo; triggers (`when:` GitHub events, cron, Slack, Linear, Sentry, webhook via relay); stages hand over through GitHub labels, PRs, reviews. `can:` whitelists what the engine may write; the engine runs `checks` itself; `reviewed_by` loops with `review_rounds` cap; labels `needs-human`, `ready-to-merge`, `risk:*` (`getting-started/concepts.mdx`). Next step = code from events and labels; agent prose is not the router.
- Decision UI: studio board with a "Needs you" column (`packages/studio/app/src/features/board/BoardCard.tsx`); text renders through `components/markdown.tsx` (react-markdown + remark-gfm, collapsible preview). No gate or options-on-card component; the human acts on GitHub (merge, comment, label). Not author-shapeable.
- Multi-repo: `factory.yaml` has one `repository:`; `openfabriq start` runs every applied factory, one engine per factory; no item spanning repos.
- Scores:
  - M1 3 - README "A factory is a folder", `automation.md` front matter - definitions in our repo, code-driven routing.
  - M2 2 - `agent.md` per role with tools and `model`, `limits` usd per run/day; only Claude models today (README "Claude Code only, for now").
  - M3 1 - studio `markdown.tsx`, board "Needs you" - read-only visibility; the decision itself is a GitHub comment/label.
  - M4 1 - one factory per repo (`factory.yaml repository:`), several factories on one engine; no multi-repo item.
  - M5 2 - GitHub native; Linear, Sentry, Slack via relay; Jira not listed.
  - M6 3 - README guarantees: agents never hold GitHub credentials, engine opens PRs, engine refuses CI-workflow changes, a person merges.
  - M7 3 - README "Sandboxed and local ... `network` allowlist".
  - M8 2 - README `openfabriq status` lists waiting runs; one engine per factory; durability across restarts not verified.
  - M9 1 - README "studio on 127.0.0.1 ... or your own https domain with a password or each person's GitHub account"; roles = `maintainers` list.
  - M10 2 - README "plan/apply", brew/npm upgrade; skills, MCP; no UI plugin point.
  - S1 3 - table "What starts a factory". S2 2 - board shows agent and cost per card. S3 1 - webhooks and Sentry; no deploy hooks. S4 1 - `openfabriq mcp` read-only. S5 1 - Slack via relay (inbound). S6 0 - not found. S7 2 - Apache-2.0 but 2 weeks old.
- Verdict: could pass with work only if the decision card is moved to our own UI or GitHub comments and M4 multi-repo is built by chaining factories; very young, 36 stars. Closest to our M1/M10 shape of the eight, but M3 and M4 are not there.

#### 6. volekerb/hivemill
- URL https://github.com/volekerb/hivemill . Self-hosted Go runner for Claude Code: spec with proof per criterion, Stop-hook gate that re-runs proofs, fresh judge (MERGE/REJECT/HOLD), mechanical merge; owner question queue via CLI.
- Licence MIT. 42 stars, created 2026-10-28, last push 2026-11-25. Commits 11-25 14:27, 13:49, 10:54. Contributors 2. Merged PRs: volekerb 30 of 30 (single maintainer).
- Decision UI: none for the runner: README "You watch the runner from the terminal ... `hivemill ask list`, answer with `hivemill ask answer`"; the web UI (`web/`, Python `factory serve`) is read-only and belongs to the legacy pipeline (README "The web UI").
- Multi-repo: `hivemill project add app --repo OWNER/NAME` per project, many projects per install; one task = one project repo.
- Scores: M1 2 (task spec files + Go runner, judge verdict) ; M3 0 (CLI only, README); M4 1 (many projects, single-repo tasks); M7 1 (own clone per session in herdr terminals, no egress control); M8 2 (daemon reconcile, snapshots); M9 0 ("Company" profile planned, not built); M10 1 (Go runner source; home dir config). Everything cites README sections "Where you run", "The web UI".
- Verdict: out (M3 and M9 absent).

#### 7. yahor-punko/mavericks-os
- URL https://github.com/yahor-punko/mavericks-os . Claude Code framework: versioned state files (`BACKLOG.md`, `TASK_STATUS.md`, `PROCESS_STATE.json`), roles, a validator hook, a terminal operator dashboard (`scripts/mavp-operator-dashboard.js`). No server, no web UI.
- Licence: GitHub says NOASSERTION; README badge says MIT; `NOTICE` present (verify before use). 132 stars, created 2026-07-09, last push 2026-11-17 (commits 11-17, 11-15, 11-14). Contributors 1; no merged PRs.
- Multi-repo (the notable part): README "Cross-repo coordination": tasks declare a `Repos:` field; cross-repo pre-flight before dispatch; cross-repo ordering is enforced; case study counts 19 multi-repo tasks among 323 over 10 of 20 repos (self-reported, N=1).
- Scores: M1 2 (state files, validator, next step from written state); M3 0 (decisions in Claude Code chat); M4 2 (README "Cross-repo coordination", case study table; PR per repo not shown, no server); M8 2 (state survives sessions); M10 2 (framework scripts run from `~/.mavericks` checkout, not copied into project; update by git pull); M9 0; M7 1 (relies on Claude Code permissions, `bypassPermissions` default, SECURITY.md).
- Verdict: out as a platform; the `Repos:` field plus ordering plus pre-flight is a pattern we can copy into our own model.

#### 8. ai-sdlc-factory/ai-sdlc-factory
- URL https://github.com/ai-sdlc-factory/ai-sdlc-factory . C#/.NET 10 + Temporal; label a ticket on Forgejo or GitHub, role agents (OpenCode, ChatGPT sign-in) in disposable containers behind an egress proxy, reviewed PR, "the factory never merges".
- Licence MIT. 25 stars, created 2026-11-22, last push 2026-11-24 (11-24 18:52, 11-23 15:06, 11-23 00:30). Contributors 1; no merged PRs.
- Workflow definition: C# workflows in `src/controller`; per-repo `.factory/project.json`; agent roles as markdown in `agents/`. README: "agents only advise with one validated JSON verdict, and code decides every next step". Changing a workflow means changing C# source, so a fork.
- Decision UI: none of its own. Humans answer by ticket or PR comments: `human_reply` signal, `/option N`, `/qa go`, `/fix` (docs/workflows.md); the card is a forge comment (markdown, tables, details, mermaid on GitHub). `needs_human` status after question rounds are used.
- Multi-repo: "Connect a repository ... about 5 minutes per repository" (many repos per install); one ticket maps to one repo.
- Scores: M1 2 (JSON verdict, code routing; definitions in C#); M2 1 (role files, one model family tested); M3 1 (forge comments, `docs/workflows.md`); M4 1 (many repos, single-repo tickets); M5 2 (GitHub/Forgejo, no Jira); M6 3 (PR only, never merges); M7 3 (disposable containers, egress allowlist `src/egress-proxy`); M8 3 (Temporal, 7-day waits in `/qa go`); M9 1 (forge identity); M10 1 (C# source; config in `.factory`); S6 1 ("run-scenarios.py" workflow scenarios in `tools/`).
- Verdict: out (fork needed for workflows; no UI of its own; 4 days old at read).

---

#### Extra candidates found by `gh search repos` (queries: "approval inbox", "human-in-the-loop coding agents", "software factory agents approval", `topic:coding-agents pushed:>2026-11-01 stars:>500`, "decision card")

Not in the exclusion list, with an approval surface: mikeparcewski/wicked-studio (scored below), Team-Commonly/commonly (short note), maxritter/qualitylayer (NOASSERTION licence, desktop App plus Markdown files, plan with diagrams, 2162 stars; not scored: licence and App are closed-ish, not verified), humanlayer/humanlayer (12958 stars, Apache-2.0, CodeLayer/HumanLayer approval product, older and mostly a desktop/cloud app; not scored), curie-eng/curie (Apache-2.0, 53 stars, Slack approvals for SRE co-worker; not SDLC), 5dive-ai/5dive (MIT, phone app for agent teams, not SDLC), virtengine/bosun (Apache-2.0, 285 stars, autonomous engineering; no approval card seen), bastani-inc/atomic (883 stars, verifiable coding agent runtime with workflow defined in natural language; no web approvals seen). Others returned were terminals, plugin collections or unrelated.

### Team-Commonly/commonly (short)
Apache-2.0, 1414 stars, created 2025-02-03, pushed 2026-11-25 (commits 11-25 x3), 13 contributors; merged PRs 30 of 30 by `commonly-agent` (bot). Agent chat workspace (pods, board, decisions). Decision card `frontend/src/v2/components/V2DecisionCard.tsx`: 2 to 4 options each with description and `recommended`, an "other" text input, ruling recorded (who, what, when) and `decision.ruled` event to the agent (`docs-site/concepts/approvals.mdx`); separate `ApprovalAction` card for side effects. Plain text, no markdown/mermaid seen in the component (imports read). No git, PR or worktree layer. M3 2, M4 0, M10 1. Verdict: out as an engine; its decision/approval split (advisory fork vs authorization) is a good model for our M3 data shape.

### mikeparcewski/wicked-studio (browser app) + mikeparcewski/wicked-crew (daemon, bundles studio) + wicked-core (engine)
- URLs https://github.com/mikeparcewski/wicked-studio , https://github.com/mikeparcewski/wicked-crew , https://github.com/mikeparcewski/wicked-core . "ADE": a browser app to run Claude Code, Codex, Copilot, OpenCode, Pi as a team; jobs run workflows over agents in sandboxes; gates come to the human as one card.
- Licence MIT for all three (`wicked-core-ts` not found). Stars: studio 174, crew 0, core 0. Created studio 2026-08-12, crew 2026-07-08. Last push 2026-11-25 for both. Last 3 commits studio 2026-11-25 19:52, 19:00, 18:15; crew 11-25 19:42, 19:41, 19:40. Contributors: studio 1 human + 3 bots (claude, dependabot, actions); crew 2 humans (mikeparcewski, eugenelim) + bots. Merged PRs (30): mikeparcewski 30 of 30 in both. One-person project, outside PRs not evidenced.
- Workflow definition: "Workflows are data ... new ones are drop-in JSON files, not code" (wicked-crew README, "Why it's different"); examples `packages/crew/workflows/*.json` with `phases[]` (`kind`, `instructions`, `gate_type`, `gate`, `depends_on`, `role`, `budget_secs`, `allowed_skills`, `required_deliverables`). Gates resolve deny-dominates over a deterministic floor, repo checks, policies and an evaluator seat distinct from the creator's seat. Where a user's own workflows live (our repo or the daemon home `~/.wicked-crew`) is not stated in the README; "saved workflow" suggests daemon storage. Next step from engine gate verdicts, not agent prose.
- Decision UI (the real component): `src/components/session/GateRow.tsx` (+ `src/board/gateRowModel.ts`, `gateOffers.ts`, `GateNotifications.tsx`, `desk/DecisionPreview.tsx`, `PlanGateSummary.tsx`). README: "Gate decisions come to you as one card: every choice the gate offers, the recommended one marked when there is one and, when supplied, what each choice would do, then one button and a 10 s undo; keyboard batch triage". Options on the same card: yes. Free text: reply box ("Send back" note, approve-with-note, Other options). Text format: `src/components/Markdown.tsx` = react-markdown 10 + remark-gfm (tables, links, citation badges); recharts is a dependency (charts exist elsewhere in the app); no mermaid. `DecisionPreview.tsx` shows only the first 4 lines of the reviewed step's output with markdown markers stripped and a "Read all of it" link, so the card is not a rich document; evidence is one click away (gate depth details, assurance receipt). Author shaping: the gate card model is fixed in studio code; the plugin system (README "Plugins": sandboxed one-file HTML editors and "run plugins" drawing a section of the job's Details panel over a MessagePort protocol, `src/editors/`) is a UI extension point but not for the gate card.
- Multi-repo: README (crew) "A project is a context: one code graph over all its repos": projects have `crew.repo` members, a co-located graph (explicitly not cross-repo linked), runs bind to the project graph; "Launch runs across many repos and projects at once". A run takes a single `repoRef` and delivers one PR (README "Linked trackers ... its pull request names the issues it closes"); one item with a PR in each repo is not described.
- Scores (date read 2026-11-26):
  - M1 2 - wicked-crew README "Workflows are data", `packages/crew/workflows/detect-shape.json` - JSON phases with gates; location of our own definitions unverified.
  - M2 2 - README "Agents page signs each agent in", distinct evaluator seat, `budget_secs` per phase, `docs/campaign-budgets.md`.
  - M3 2 - `src/components/session/GateRow.tsx` - options with recommendation and effect, free-text note, undo, GFM markdown; no mermaid, no folded evidence on the card itself, card not author-shapeable.
  - M4 1 - crew README "A project is a context"; many repos and projects yes, one item to PRs in several repos no (single `repoRef`).
  - M5 2 - studio README "Linked trackers ties GitHub Issues and Jira projects to your projects and repositories".
  - M6 2 - README "bind a repo with optional PR delivery", deliver phase pushes with gh token; branch conventions and risk-based merge not verified.
  - M7 3 - README "hardened sandbox", credential broker, sandbox sees placeholders.
  - M8 2 - crew README "crash-resumable", durable state in `~/.wicked-crew/`; long gate waits implied; one-run-per-item cap not verified.
  - M9 2 - `docs/auth.md` in wicked-crew: team mode (`WICKED_RUNTIME=team`) with bearer tokens, actors with trust levels, audit carries the authenticated actor.
  - M10 2 - plugins (README "Plugins") for UI sections, JSON workflows; studio is a pure HTTP/WS client of the daemon (`wicked-crew-api-types`), so a forked UI stays possible; but engine plus UI are one maintainer's.
  - S1 1 - REST `POST /runs` for our own scheduler (crew README); no native schedule seen. S2 2 - "transcripts, diffs, downloadable evidence bundle". S3 0 - none. S4 2 - chat composer and `wicked-crew mcp`. S5 1 - `GateNotifications.tsx` (in-app); push not found. S6 0 - not found. S7 2 - MIT, very active, bus factor 1.
- Verdict: could pass with work. Closest fit to the decision-card intent of the nine here. Work in our repo: multi-PR items (several runs under one project, own orchestration), a rich evidence/diagram card via a plugin or by linking out to our own page, our workflows as JSON placed where the daemon loads them (verify), tests for assurance. Risks: single maintainer, crew and core have 0 stars, fast churn (daily releases), and the gate card is fixed UI code.

---

Gaps and caveats
- `gh search code` rate-limited; renderer claims for Pullboard, Hivemill, Commonly are from the component read and tree names, not an exhaustive grep.
- Not verified: where wicked-crew loads user workflows from; whether wicked-crew can run one item over several repos with a PR each; Pullboard `view` auth; openfabriq run durability across restarts.
