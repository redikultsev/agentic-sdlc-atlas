# Where the Operator reads and answers a gate

Question (2026-11-25): the Operator wants to read a rich decision card and answer it in one place. The card and its buttons are one thing, not a card plus a separate artifact to reconcile. It should have hierarchy and at least markdown, ideally a small figure and folded evidence. It runs on a server the team reaches, with no engine fork to maintain and no separate service just for cards. Where should the pipeline's gates live, and does that keep us on Archon?

Read first: [`2026-11-gate-presentation.md`](2026-11-gate-presentation.md) and [`gate-presentation/archon-console-gates.md`](gate-presentation/archon-console-gates.md). The console draws the gate message as plain text. Markdown renders only in run artifacts. The console has no UI plugin slot. The attention API is open. This study does not repeat those findings; it builds on them.

Sources and dates:

- **Archon source:** the checkout at commit f9d1d2b (2026-11-20), read on 2026-11-25. Paths are relative to its `packages/` folder.
- **Archon's GitHub repository:** read on 2026-11-25 through the GitHub API (`gh`).
- **Other products:** their official docs, read on 2026-11-25. These pages were read through a summarizing fetch, so details marked *unverified* could not be confirmed word for word.

## 1. Inside Archon, no fork

### 1.1 The console run page (today)

- **Card and answer together: yes.** The banner, the run page and the run card each draw the message and then `AttentionAnswerPanel` directly under it (`web/src/experiments/console/components/PendingInputBanner.tsx:134-137`; `routes/RunDetailPage.tsx:275-276`).
- **Rich: no.**
  - The message is a `whitespace-pre-wrap` text node (same lines).
  - The console has no mermaid dependency: a grep of `web/src` and `web/package.json` for "mermaid" finds nothing.
  - The console's markdown renderers have no `rehype-raw`, so `<details>` folding would not render even if the message were markdown (`archon-console-gates.md` §3).
- **Server and team: yes.** It is the same console the team already uses, and answers carry Archon's users and roles (decision 64).
- **What we build:** nothing.
- **Gap:** the rendering of one field.

### 1.2 Project chat in the console

- The chat draws assistant messages as GitHub-flavoured markdown: `ReactMarkdown` with `remark-gfm`, `remark-breaks` and `rehype-highlight` (`web/src/experiments/console/components/MessageItem.tsx:2-5, 180-186`).
- It draws no answer controls. `ChatPage.tsx` and `ChatStream.tsx` never mention attention or `AttentionAnswerPanel` (grep, 2026-11-25).
- When a run pauses, the engine sends the notice to the surface the run came from. The notice is markdown text: a bold header, the message, then the answer lines as typed commands such as `/workflow respond <run> <option>` (`workflows/src/dag/nodes/wait/wait.ts:466-489`; `workflows/src/deps.ts:130-131, 164-204`).
- So in chat the card can render as markdown, but the answer is a typed command or a link to the run page, not a control on the card.
- This is the place where the Supervisor lives (decision 65). Its card can be markdown, and the answer still sits elsewhere.

### 1.3 Slack, through Archon's own Slack chat plugin

- **Card and answer together: yes, in one Slack message.**
  - The notice is one `mrkdwn` section followed by buttons, one per option. `multi_select` gets a menu plus a Submit button, and a free-text form gets a modal (`chat-slack/src/blocks.ts:476-540, 576-599`; `chat-slack/src/attention.ts:113-167`).
  - A click goes to the host as a run action. The host authorizes it, refuses a stale occurrence, and rewrites the message as settled with who answered (`attention.ts:35-39, 169-217`).
- **Who answered:** the answer's actor is the Archon user that the host finds or creates for the Slack identity (`server/src/chat-host/inbound.ts:47-60, 97`), and a refused call returns `forbidden` (`inbound.ts:235`).
  - Decision 64 needs the Operator's role on that user. I did not trace whether a role can be granted to a platform-identity user, so this is unverified.
- **Rich: weak.**
  - Before the message come the header, the recommendation and a bullet per option's `does`. The whole section is truncated to 3,000 characters (`blocks.ts:543-569`).
  - Slack `mrkdwn` has no headings and no tables. Labels are cut at 75 characters, and 25 buttons fit per actions block (`blocks.ts:141, 179, 530`).
  - The same plugin already sends ordinary chat replies as Slack's newer `markdown` block (`chat-slack/src/adapter.ts:287-292`). That block allows headings, lists, tables and code, up to 12,000 characters per payload, with no mermaid; images show as link text ([markdown block](https://docs.slack.dev/reference/block-kit/blocks/markdown-block)).
  - Section text is capped at 3,000 characters ([section block](https://docs.slack.dev/reference/block-kit/blocks/section-block)). A message holds 50 blocks and a modal 100 ([blocks](https://docs.slack.dev/reference/block-kit/blocks)).
  - Slack messages have no native folding. A "full case" button opening a modal is the closest equivalent.
- **Server and team: yes.** Slack is the team's server.
- **Routing:** notices go to install-level routes, a list of `{platform, destination}` in the global config. Repository config never carries routes (`core/src/config/config-types.ts:18-37, 233-237`).
- **What we build:** nothing in Archon. We configure the Slack app and a route.
- **To get a richer card,** the plugin's notice must use the `markdown` block:
  - either upstream, a small change in `chat-slack/src/blocks.ts`;
  - or our own chat plugin. Archon says outright that a team can own one ([`adapters/telegram.md:15`](https://github.com/coleam00/Archon/blob/f9d1d2b/packages/docs-web/src/content/docs/adapters/telegram.md), "build and own it as a chat plugin"). That is a copy of one package to maintain, not an engine fork. A chat plugin speaks JSON-RPC to the host that starts it (`chat-contract/src/serve.ts:1-40`), so it is not a separate service either.

### 1.4 Telegram, Discord

- Telegram ships bundled but is deprecated with no owner (`adapters/telegram.md:15`). Discord is a community adapter (`adapters/src/community/chat/discord/`).
- Neither adds rendering beyond Slack's, and neither is a better seat for a team.

### 1.5 Attention destinations: can they carry the full card?

- The message field has no length limit (`chat-contract/src/attention-notices.ts:28-42`: `message: z.string()`, with options, `does` and recommendation). So a destination does receive the whole card text.
- What it can show is up to the plugin. Archon's Slack plugin cuts the card at 3,000 characters (§1.3).
- Browser push carries only a fixed string (`archon-console-gates.md` §4).

### 1.6 The work-item tracker comment Archon already posts

- Archon's item tracker writes a markdown comment on the issue. It holds the message as a blockquote, a list of options with `does`, the recommendation, and the CLI command that answers it (`adapters/src/item-tracker/item-tracker-render.ts:119-135, 151-175`).
- On GitHub that comment renders as GitHub markdown. The answer inside it is a terminal command, not a control.
- Archon's GitHub adapter handles issue and PR comments that @mention the bot (`adapters/src/forge/github/adapter.ts:3, 378-423`). The engine spells answer commands for a surface as `/workflow …` unless the surface overrides it (`workflows/src/deps.ts:130-131`).
- So a reply such as `@Archon /workflow respond <run> <option>` on an issue may answer the gate as the GitHub user. I did not trace this path end to end: **unverified**.

## 2. The tracker or code host as the surface

| Surface | Card and answer together | Rich rendering | What we build and keep |
|---|---|---|---|
| GitHub issue or PR comment | Partly. Real buttons exist only as Checks "requested actions": at most 3 per check run, label at most 20 characters, shown after the check run completes, click sends `check_run.requested_action` ([checks runs](https://docs.github.com/en/rest/checks/runs)). Otherwise the answer is a reply comment (slash command) or a toggled task-list checkbox, which arrives as an `issue_comment` `edited` event with `changes` ([webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads)); whether a toggle by a non-author is allowed and fires that event is *unverified*. Reactions have no webhook, only polling (community threads, *unverified* against docs). | Best of all surfaces: GFM, tables, `<details>` folding, images, and mermaid in issues and pull requests ([diagrams](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)). | A GitHub App or webhook receiver that parses replies and calls Archon's answer API: a new service, unless Archon's own GitHub adapter answers (§1.6). |
| GitLab issue or MR comment | Same as GitHub (reply comments). | Mermaid, `<details>`, tables ([GitLab markdown](https://docs.gitlab.com/user/markdown/)). | Same. |
| Jira Cloud comment | No buttons in a comment. A Forge issue panel (UI Kit or Custom UI) can draw a card with controls and call back ([issue panel](https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-issue-panel/)). | Comments are ADF with `expand`, `panel`, `table`; no native mermaid ([ADF structure](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)). | A Forge app to build, deploy and keep: a separate thing just for cards. |
| Linear agent session | Yes. An `elicitation` activity with a `select` signal shows a picker of `{label, value}` options; the choice returns as a `prompt` activity ([agent signals](https://linear.app/developers/agent-signals); [agent interaction](https://linear.app/developers/agent-interaction)). | Activity `body` is markdown. Linear's editor supports mermaid and collapsible sections ([editor](https://linear.app/docs/editor)); whether they render inside an agent activity is *unverified*. | An OAuth agent app and a webhook receiver for `AgentSessionEvent` that maps prompts to Archon answers: a new service. Archon has an open issue for Linear as a tracker ([#5424](https://github.com/coleam00/Archon/issues/5424), open on 2026-11-25). |
| Microsoft Teams (for comparison) | Yes. Adaptive Card with `Action.Submit`, up to 6 primary actions ([cards format](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-format)). | `Action.ShowCard` folds; native `Chart.*` elements; no mermaid; 28 KB webhook / 100 KB bot. | A bot. Archon has no Teams chat plugin. |

Verdict:

- GitHub renders the card best, and the answer is typed or ticked.
- Linear and Slack put a picker on the card, and render less.
- Every tracker surface except Archon's own GitHub comment path needs a receiver we would run. The Operator excluded that.

## 3. Other engines

The question here is not only the human step: Archon also runs the coding-agent processes in worktrees. The engine choice already rejected these engines as bases ([`2026-11-engine-choice.md`](2026-11-engine-choice.md), table rows for LangGraph, Windmill/Kestra and Prefect). On the gate alone, from their docs:

| Engine | What the human sees and where they answer | Team server | Gaps |
|---|---|---|---|
| Windmill approval step | The closest out-of-the-box match. An approval page with the step's description, a form from a JSON schema, and Approve and Reject buttons, all on one page. The description renders rich when it is `{markdown: …}`; the docs also list HTML, images and tables ([flow approval](https://www.windmill.dev/docs/flows/flow_approval)). Slack and Teams approvals exist. | Yes, self-hosted. | The approval form and restricting approvers to logged-in users or groups are Cloud or Enterprise features (same page). The community build is AGPLv3 ([repo](https://github.com/windmill-labs/windmill)). Mermaid and folding are *unverified*. No coding-agent layer. |
| Prefect `pause_flow_run(wait_for_input=…)` | A Resume form built from a pydantic model, with a markdown description above the fields ([interactive workflows](https://www.prefect.io/docs/v3/advanced/interactive)). | Apache-2.0 server. Whether the form works on the open-source server is *unverified*. | Markdown only. No named-option buttons. No agent layer. |
| LangGraph `interrupt()` + Agent Inbox | The interrupt's `description` "may be markdown", with accept, edit, respond and ignore controls beside it ([agent-inbox](https://github.com/langchain-ai/agent-inbox)). | Agent Inbox was archived on 2026-09-20 (repo page). The standalone server needs a license key ([standalone container](https://langchain-ai.github.io/langgraph/concepts/langgraph_standalone_container)). | Archived UI. No agent layer. |
| Temporal | Workflow `staticDetails` / `currentDetails` render as markdown (no images or HTML) on the run page. The answer is a raw JSON Signal or Update sent from the UI ([enriching UI](https://docs.temporal.io/develop/typescript/platform/enriching-ui.md); [web UI](https://docs.temporal.io/web-ui)). | Yes. | No form or buttons. |
| n8n Form / Wait "on form submitted" / "send and wait" | A form page whose description and custom fields take HTML with no scripts. "Send and wait" posts approval buttons or a form to Slack, Teams, Gmail and others ([form node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form/); [release notes](https://docs.n8n.io/release-notes/)). | Self-hosted community edition with fewer features ([community edition](https://docs.n8n.io/hosting/community-edition-features/)). | No markdown or mermaid. Low-code automation. |
| Inngest, Trigger.dev | `step.waitForEvent` or wait tokens. The approval UI is yours to build ([Inngest HITL](https://www.inngest.com/docs/ai-patterns/human-in-the-loop); [Trigger.dev wait for token](https://trigger.dev/docs/wait-for-token)). | Yes. | A UI to build: the excluded separate service. |
| CopilotKit `useHumanInTheLoop` / `useInterrupt` | Any React component as the card, with buttons that answer, in one component ([HITL](https://docs.copilotkit.ai/langgraph/human-in-the-loop)). | It is a library inside your own app. | It is the separate service. |

Not covered here: OpenHands, Devin, the Copilot coding agent, Factory, Cline and Roo, HumanLayer/CodeLayer, Mastra Studio, Dagster.

None of these reviewed products shows markdown, a figure, folded evidence and named-option buttons on one page with no code of ours. Windmill comes closest, and its approval form is a paid feature.

### What a move would cost

The pack is built on Archon throughout:

- `implementations/archon/` has 348 files, 14 workflows, a 278-line `SPEC.md`, fixtures and tests (counted on 2026-11-25).
- Decisions 62 to 66 rest on Archon's own surfaces: its users and roles, its console chat, its answer routes and the read surface over its API.

A move means:

- rewriting every workflow in the new engine's language;
- rebuilding the coding-agent layer: worktrees, providers, sessions and the provider's MCP;
- replacing the identity model that decision 64 relies on;
- redoing the read and request servers (decisions 63 and 66).

That is a rebuild of the pack for a gain on one screen. Even then the target either needs a paid tier (Windmill) or still lacks figures and folding.

## 4. Upstream: put markdown in the gate message

### The change

The rich renderer already exists. `MessageItem.tsx` uses ReactMarkdown with GFM and code highlighting.

- **The minimum:** render `attention.message` through the same component in two places, the banner (`PendingInputBanner.tsx:134-136`) and the run page gate (`RunDetailPage.tsx:275`). Keep the compact run card's one line as plain text (`ActiveRunCard.tsx:288`).
- **Size:** I estimate about 30 to 60 lines plus tests (an estimate, not measured). Two risks:
  - existing plain messages that contain `*`, `#` or `_` would start to render differently;
  - the docs must say the message is markdown (`docs-web/.../reference/workflow-language.md:791-843` say nothing about rendering today).
- **Folding** (`<details>`) needs raw HTML with sanitizing, and **mermaid** needs a new dependency and a renderer. Each is a separate and larger ask, which the maintainers are less likely to accept.
- **The Slack notice** could switch from a `mrkdwn` section to the `markdown` block that the plugin already uses for replies (`chat-slack/src/adapter.ts:287`), lifting the 3,000-character cut to the block's 12,000-character limit.

### How likely it is to be merged (GitHub API, 2026-11-25)

| Fact | Count |
|---|---|
| PRs merged in the 30 days to 2026-11-25 | 538 |
| ... by the lead maintainer's account | 509 |
| ... by 15 other authors | 29 |
| Account that merged the last 200 merged PRs | one account for 199 of them |
| PRs closed unmerged in the same 30 days | 24 (20 of them by the lead account) |

So one person decides. Outside PRs do land: several a week.

The rules (`CONTRIBUTING.md`, "Pull requests"):

- a pull request without a linked issue is closed;
- a pull request that mixes concerns is closed;
- outside pull requests to the bundled SDLC pack are not accepted.

Our change is to the console, not that pack.

Attention presentation is an active area for the maintainer:

- Issue #5227 (recommendation, per-option `does`, a returned `value`) was opened 2026-10-27 and closed 2026-11-06.
- Issue #5480 ("one shape for everything that reaches the seat") got a dated "Current scope" ruling on 2026-11-11 and was closed 2026-11-21. Both were opened by the maintainer.
- Issue #5388, from an outside author (Slack `select` answers could not carry text), was opened 2026-11-06 and closed 2026-11-13.

My judgement: an issue asking for "the attention message renders as markdown in the console, like chat and artifacts" is small, consistent with the shape the maintainer is building, and likely to get a ruling within days. Folding and mermaid are less likely. The issue should offer them as a follow-up, not bundle them.

## 5. Ranking

The ranking scores each option against the four needs: card and answer in one place, rich, on a team server, and nothing extra to maintain.

1. **Stay on Archon. Ask upstream for markdown in the gate message, and use the console run page as the one surface.**
   - Card and answer are already one panel there.
   - With markdown, the card gets hierarchy, tables, bold risk words, code and links.
   - Nothing to fork or run.
   - Gap: no folding and no figure until a second upstream step. Meanwhile, the pack's own fixed block order (decision 38) keeps the decision first, and the long evidence goes last, below the options.
   - Cost: one issue plus one small PR, and the wait for a ruling.
2. **Archon's Slack plugin as the team's answer surface, with the notice switched to the `markdown` block.**
   - Buttons sit on the card, and the answer flows through Archon's own authorization.
   - Headings and tables would appear after the block switch. There is no mermaid, and folding is only a modal.
   - Upstream, it is a second small change. Without upstream, we would own a copy of one chat plugin: one package, not the engine.
   - Verify first that the Operator's Slack identity can hold the Operator role (decision 64).
3. **GitHub issue comment as the card,** with the richest rendering: mermaid, `<details>`, tables.
   - The answer is an `@Archon /workflow respond …` reply on the same thread, if Archon's GitHub adapter accepts it (unverified).
   - It costs nothing extra if that works. If not, it needs a receiver, which the Operator excluded.
   - Typing an answer is weaker than a button.
4. **Linear agent session.** A picker on a markdown card, but it needs an agent app and a receiver we would run, and Archon does not support Linear yet.
5. **Another engine.** Windmill is the only one with a rich page and a form together, and the form is a paid tier. Prefect has markdown and a form. All of them mean rebuilding the pack and the agent layer (§3). Not justified by this need.

Rejected: a decision page of our own over Archon's API (option B in the earlier study), a Jira Forge app, CopilotKit. Each is the separate service the Operator ruled out.

## What to verify first

1. Search Archon's issues for an open request on markdown in the attention message (none found by title search on 2026-11-25: `markdown attention`). Then file one, scoped to the two console call sites, and offer folding and mermaid as follow-ups.
2. Check that a GitHub comment `@Archon /workflow respond <run> <option>` on the work item answers an attention wait, and which Archon user it records. If it works, option 3 needs nothing built.
3. Check that a Slack user can be given the Operator's role in Archon, so a Slack button answer counts as the Operator's signature (decision 64). Check also how a 3,000-character-limited notice reads with the decision-first block order.
4. Test whether mermaid renders inside a blockquote in a GitHub issue comment. Archon's tracker comment quotes the message (`item-tracker-render.ts:129`).
