# Archon console: how attention gates render and what a pack can change

Source: Archon checkout, commit f9d1d2b. Paths below are relative to the repo root (`packages/...`). All claims are read from source; nothing was run.

## 1. How the console renders an attention item

Components (all under `packages/web/src/experiments/console/`):

- Runs page banner "Needs your input": `components/PendingInputBanner.tsx`. The message is `<p className="mt-3 whitespace-pre-wrap text-sm text-text-primary">{run.attention.message}</p>` (PendingInputBanner.tsx:134-136), followed by `<AttentionAnswerPanel>` (:137).
- Run detail page: `AttentionGate` in `routes/RunDetailPage.tsx:264-279`. Message is `<p className="whitespace-pre-wrap text-sm ...">{attention.message}</p>` (:275), then `<AttentionAnswerPanel>` (:276).
- Compact run card row: `components/ActiveRunCard.tsx:288`, `<span className="text-text-secondary">{attention.message}</span>`, then the answer panel (:290-293).
- Answer form: `components/AttentionAnswerPanel.tsx` (the only place options, recommendation and form types are drawn).

Message rendering: plain text in a React text node with `white-space: pre-wrap`. It is NOT markdown. Bullets, backticks, `#` and `**` appear literally; newlines are kept. No `ReactMarkdown` call exists in PendingInputBanner, AttentionAnswerPanel, ActiveRunCard or the `AttentionGate`. This is exactly the "wall of small plain text" behaviour. Font is `text-sm` for the message and `text-console-12` for options/recommendation (AttentionAnswerPanel.tsx:87, 96, 106).

Fields shown by `AttentionAnswerPanel.tsx`:

| Field | How shown |
|---|---|
| recommendation | one line: bold `Recommended: <option label>`, optional ` (<confidence> confidence)`, then `. <why>` (:86-94). Plain text. |
| option `does` | a `<ul>` of `**label**: does` lines, only options that have `does` (:78, 95-104). Plain text. |
| option `label` | falls back to `id` (`option.label ?? option.id`, :99, :120, :159). |
| form `multi_select` | checkboxes with label (:105-124) and an "Answer" button (:135-147) disabled until one is checked (:140). |
| form `message` | textarea placeholder "Your answer" (:25), "Answer" button disabled while text is empty (:141). |
| form `approval` / `select` | one button per option, the recommended one gets `ring-1` and the suffix " (recommended)" (:149-161). |
| `other: true` | the engine appends an option; its button is disabled until the textarea has text (`needsText`, :18-22, :153). Placeholder "Optional text; required for Other" (:26). |
| free text | an always-present 2-row `<textarea>` (:125-133), sent as `text` with the answer (:53-58). |
| `labels` | not part of the console attention type at all: `RunAttention` kind `attention` has only runId, nodeId, message, occurrence, form, options, other, recommendation (`workflows/src/schemas/run-attention.ts:96-107`). |
| option `value` | never shown; docs say so (`docs-web/src/content/docs/reference/workflow-language.md:829`). |

Limits / truncation:

- The wait message has no length cap in the schema (`attention: z.string().trim().min(1, ...)`, `workflows/src/schemas/wait-node.ts:~229`). No `.max()` on any attention field in `wait-node.ts`. The answer body `text` is an unbounded `z.string().optional()` (`server/src/routes/schemas/workflow.schemas.ts:~345`).
- The console does not truncate or collapse the attention message in any of the three places above. The banner scrolls inside a bounded container, `max-h-[45%]`, `overflow-y-auto` (PendingInputBanner.tsx:43, 55), and its doc comment says a card is "several hundred pixels tall" (:31-33). So a long message makes the banner scroll, not the message collapse.
- `ApprovalContext` (a different thing: the last AI text event shown under old-style `approval:` gates) truncates to 520 chars with an expander (`components/ApprovalContext.tsx:19, 24-34`) and also renders plain `whitespace-pre-wrap` (:88). It is used only in the deprecated approval branch (PendingInputBanner.tsx:156-160).
- The message is template-substituted when the wait pauses: node output refs, loop refs and `$INPUTS` work; `$ARTIFACTS_DIR` and other workflow variables stay literal (`workflow-language.md:791`; implementation `workflows/src/dag/nodes/wait/attention-message.ts:18-60`, `wait.ts:264`). The result is trimmed and an empty result fails the node (`wait.ts:264-267`).
- Because the message is a template over node outputs, a script/agent node can compute the whole message and the pack passes `attention: "$build.output.message"` (pattern shown at workflow-language.md:804).
- Answer is bound to an `occurrence` so a stale answer is refused (AttentionAnswerPanel.tsx:9-12, 53-58).

## 2. Wait-node attention fields in the YAML schema

`packages/workflows/src/schemas/wait-node.ts` (attention variant, :227-263). The object is `z.strictObject`, so any extra key is a load error. Fields:

- `attention` (string, required, non-empty)
- `form`: `message` (default) | `approval` | `select` | `multi_select` (:15)
- `options`: array of `{id (kebab-case), label?, does?, value?}` (:31-36), or one whole `$node.output.<field>` reference; required for select/multi_select, refused for others (:249-262)
- `recommendation`: `{option, why, confidence?: low|medium|high}` (:43-47), or a whole output reference; select and approval only (:107-111)
- `labels`: flat `string -> string` map, engine ignores it (:62-72)
- `other`: boolean, `select` only (:93, 78-79)

There is NO `details`, `summary`, `links`, `attachments`, `markdown`, `format`, `title`, `body`, `severity` or similar field. Option `value` is carried but "no console, CLI text or chat surface renders it" (workflow-language.md:829). `label` is described as "display text only" (:828). Runtime display shape is the `attention` variant of `RunAttention` (run-attention.ts:96-107).

Answer outputs: message -> `{text}`; approval -> `{decision, text}`; select -> `{decision, text, value?}`; multi_select -> `{decisions, text}` (wait-node.ts:~140-175).

## 3. Artifacts

Writing: scripts write into `$ARTIFACTS_DIR`; the tab does not need an event. The list route walks the on-disk dir: `GET /api/runs/{runId}/artifacts` (`server/src/routes/api.artifacts.ts:40-60`, walk at :163-193). It returns `{files: [{path, size, modifiedAt}]}`, recursive, sorted by path, excluding only the engine's own `.archon` entry (:166-169, :53-55). Dotfiles are listed.

Reading: `GET /api/artifacts/{runId}/{filename}` (api.artifacts.ts:69-88, handler :207-). It reads the file as UTF-8 text (`readFile(realFilePath, 'utf-8')`, ~:331) and returns `Content-Type: text/markdown; charset=utf-8` when the name ends in `.md`, otherwise `text/plain; charset=utf-8` (:344-346). Path escape and symlink escape are blocked (:280-317).

Console tab: `components/ArtifactPanel.tsx`.
- Left sidebar lists basename, dir, size (:108-152). The first file is auto-selected (:34-39). There is no way to pin or order, beyond alphabetical path order.
- `isMarkdown = basename.endsWith('.md') || '.mdx'` (:191). Markdown is rendered with `react-markdown` + `remark-gfm` + `remark-breaks` + `rehype-highlight` (:2-5, :165-166, :214-219), in a `chat-markdown` styled div, `max-w-205` (:215). No `rehype-raw`, so raw HTML in markdown is not rendered as HTML (grep for rehype-raw / sanitize in console and web/package.json: none). Tables, task lists, fenced code with highlighting are available via GFM.
- Every other file type is shown as monospace plain text in a `<pre>` (:220-223). That includes `.html`, `.svg`, `.json`, `.png`. No iframe, no `<img>`, no sandbox anywhere in ArtifactPanel.tsx. Binary files are read through `utf-8` text on both the server and `fetchArtifact` (`skills/runs.ts:125-139`, `res.text()`), so images would be garbled.
- Header link "open raw" opens `/api/artifacts/<runId>/<path>` in a new tab (:197-207). For an `.html` file the server answers `text/plain`, so the browser shows source, not a page.
- URL shape for an artifact: `/api/artifacts/<runId>/<relative/path>` (api.artifacts.ts:70; ArtifactPanel.tsx:198-201). The console tab URL is `/console/p/<project>/r/<run>?view=artifacts` (`lib/use-run-detail-selection.ts:35, 49, 64`; view names from `DETAIL_VIEWS` in `StreamToolbar`, `artifacts` used at RunDetailPage.tsx:121). There is no query param to pre-select a file: selection is local React state, defaulting to the first file (ArtifactPanel.tsx:32-39).
- The tab label shows an artifact count (RunDetailPage.tsx:209-217, 533).

Links in the attention message: the message is a plain text node (see 1), so a URL in it is NOT a clickable link in the console. A link inside a markdown artifact IS rendered as markdown; the `a` renderer with `target="_blank"` exists in `MessageItem.tsx:20-29`, but ArtifactPanel does not pass `components` to ReactMarkdown (:216), so it uses default anchors (clickable, same tab).

## 4. Other surfaces

- Browser push: payload is `{runId, workflowName, kind}` only; body text is one of three fixed strings, "Waiting for your decision", "Needs attention", "Run finished" (`web/public/attention-sw.js:1-23`). In-page alerts also carry "Workflow name and state only: run output and messages stay in the console" (`lib/attention-alerts.ts:141`). Click goes to `/runs/<id>`, which redirects to `/console/r/<id>` (attention-sw.js:25-30; `routes/LegacyRedirect.tsx:3-12`). So no message content can ride in notifications.
- Item tracker (GitHub/forge): `packages/adapters/src/item-tracker/item-tracker-render.ts:119-135` posts a markdown comment: header, `quote(attention.message)`, `Options:` list with `` `id`: label. does ``, `Recommended: \`id\`. why`, and the CLI answer command (:151-175). This is rendered by the forge, so markdown works there, but it is a quote block of the message. Source of truth for tracker comments, not the console.
- Chat / Slack: the engine pause notice is markdown text, `⏸️ **Workflow run ... needs attention**` + message + answer lines (`workflows/src/dag/nodes/wait/wait.ts:466-489`). Slack builds blocks with `mrkdwn` sections and buttons (`chat-slack/src/blocks.ts`, option label truncated to 75 chars at :141, :530; at most 25 buttons per actions block :179, :462; "Too many choices to answer in Slack; answer in Archon." at :588). Chat notice text goes through `chat-contract/src/attention-notices.ts`. The web chat page renders assistant messages with `MessageItem` (markdown) (`components/MessageItem.tsx:180-186`); I did not trace whether the web adapter posts the attention notice there, so treat as unverified.
- `/api/items` (`server/src/routes/api.items.ts:50-66`): JSON read of an item's runs, open questions and answers. I found no console page that consumes it (only referenced in `web/src/lib/api.generated.d.ts`), so it is an API, not a UI.
- `GET /api/runs/attention` and `/api/runs/attention/stream` (SSE) deliver the full attention items (message, options, recommendation) to external consumers (`workflow-language.md:~2456`, `docs-web/.../getting-started/operate.md:304, 422`). A separate viewer or handler can be built on them, and answers go through `POST /api/workflows/runs/{runId}/answer` and `POST /api/attention/answer` (operate.md:422; workflow-language.md:2458).
- No custom page, plugin slot or UI extension for the console. Plugin manifest kinds are only `forge`, `provider`, `chat`, `workflow-pack` (`plugin-manifest/src/index.ts:77, 87, 95, 115`). A workflow pack ships workflows, with `entrypoints` and support workflows (:108-130), no UI assets. Console routes are fixed in `ConsoleApp.tsx:111-126` (index, metrics, settings, builder, `_preview`, `r/:runId`, `p/:projectId[/chat|/metrics|/r/:runId]`). No extension hook.

## 5. What the docs say about presenting gates to humans

- `docs-web/src/content/docs/reference/workflow-language.md:796-843` (Attention waits): "Archon does not route the question or care who answers: a person in the console, an agent through the CLI, or a handler workflow". Lists the shown fields: `does` is "shown with the option" on every surface (:829), the recommendation is shown "ahead of the choices" in console, CLI and the pause notice (:833). `value` is never rendered (:829).
- `guides/approval-nodes.md` examples use multi-line `attention: |` text (lines 37, 173). I found no sentence in the docs promising markdown rendering for the attention message, and nothing describing a layout, summary or details convention. No guidance exists on writing gate content for humans. Docs say the message "can reference node outputs, enclosing loop scopes and `$INPUTS`" (:791).
- Notices: Slack/chat say answer text via `respond <run-id> other <text>` (:830).

## Summary: possible vs not

Possible with the current engine:
- Put a compact, plain-text decision brief in `attention` (templated from a prior node via `$node.output.field`), with `\n` line breaks and blank lines as the only structure (pre-wrap).
- Use `select` with `label` + `does` per option, a `recommendation` with `why` and `confidence`, `other: true`: these get the only structured presentation the console has (bold label, a "(recommended)" ring on the button).
- Write a rich markdown report (headings, GFM tables, code, links) to `$ARTIFACTS_DIR/*.md`; the Artifacts tab renders it properly. Mention the file name in the message.
- Drive an external UI off `/api/runs/attention(/stream)` and answer via the answer API.

Not possible:
- Markdown, bold, lists, links or collapsing in the attention message itself; clickable URLs in it.
- New wait fields (`strictObject` rejects them), a label/summary/detail split, rendering of option `value` or `labels`.
- HTML, SVG or images in the Artifacts tab (text/plain, pre block, no iframe); deep link that opens a specific artifact; auto-open of an artifact from the gate.
- Rich content in push notifications (fixed three strings).
- A pack-supplied console page or panel (no plugin slot).
