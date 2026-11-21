# Market scan: lists and catalogs for "help a human see only what's needed about a codebase or a change"

Scan date: 2026-11-21. Star counts are from the GitHub API on that day. Entry counts are rough: the number of markdown link lines in the README (`](http`), so badges and section links inflate them a little.

Example tools used as the coverage check (7): Floorplan, Understand Anything, Archify, DeepWiki, Google Code Wiki, CodeRabbit, CodeGraph. I also checked for Graphify and GitNexus because they are the biggest neighbours.

## Verdict

**The exact niche is open.** No list is built around a person deciding something: understanding how an app fits together, seeing what an agent just changed, deciding whether to merge, or finding what breaks if X changes. The lists that exist split along other lines:

1. **Code-review lists** (joho, kodustech, ianwieds, furudo-erika): they cover review *bots and tools*. They don't cover understanding or maps.
2. **Codebase-intelligence lists** (chistiq, glue-tools-ai): these are closest in theme, but they have 2 and 4 stars, are one-commit dumps with no activity, and are written for platform teams (software catalogs, SBOMs, Bazel query).
3. **Agent-tooling lists** (Lancetnik, Wellux, jqueryscript, hesreallyhim): they include the 2026 map tools, but as a "context for the agent" section, so they are organised around the agent, not the human.
4. **Diagram lists** (shubhamgrg04, terrastruct, hudsonkit): drawing tools. None of them covers maps generated from code (Archify is the exception, in hudsonkit).

No list has more than 5 of the 7 example tools. No list combines situation-based sections with a check of whether a tool's claims hold.

**The strongest competitor is not a list. It is a 2026 Medium article**, Martin Jordanovski's *"Archify vs Graphify vs Understand-Anything vs codebase-memory-mcp: Four bets on understanding code your AI wrote"* (November 2026). It:
- sorts the tools by who reads the map (a human or the agent) and by who reads the code (a parser or an LLM);
- covers how each tool guards against the model being wrong;
- names an "honest caveat" section: there is no independent evidence any of these tools works, and agents often ignore the map;
- mentions CodeGraph, Floorplan, OpenWiki and GitNexus as close calls.

That is the editorial angle a human-focused awesome-list would take, but it covers only 4 to 8 tools, it is a one-off, and it is not maintained.

The strongest **list** competitor is **Lancetnik/awesome-engineering-ai**: it has evidence marks ("daily driver / tried / not tested"), a 500-star floor, and a "Review, guardrails and forensics" section. But it has 37 stars, is agent-focused, is broad (17 sections), and has had no push since 2026-09-07. The most complete list by coverage is **jqueryscript/awesome-claude-code** (5/7), but the tools are scattered under "Plugins / Tools / Skills" and it covers Claude Code only.

The vendors fill the gap with "comparison" blog posts: Repowise, Dosu, Git2Docs, Backthread, ShipDocs, Moxie Docs, GitDiagram, Sourcegraph, DeepSource and CodeRabbit-adjacent posts. Each one ranks itself first.

## 1. Lists and catalogs found

Example coverage counts these 7: Floorplan, Understand Anything, Archify, DeepWiki, Google Code Wiki, CodeRabbit, CodeGraph.

### A. Closest in theme (codebase understanding / intelligence)

| List | Stars | Created | Last push | ~Entries | Format | Human / agent | Alive? | Example coverage |
|---|---|---|---|---|---|---|---|---|
| [chistiq/awesome-workspace-intelligence](https://github.com/chistiq/awesome-workspace-intelligence) | 2 | 2026-07-31 | 2026-07-31 | ~68 | Plain links by technical layer (catalogs, graphs, **Change and Impact Intelligence**, policies, AI context, benchmarks) | Platform engineers, both | Single dump, no activity | 1/7 (Understand Anything) + Graphify |
| [glue-tools-ai/awesome-codebase-intelligence](https://github.com/glue-tools-ai/awesome-codebase-intelligence) | 4 | 2026-02-16 | 2026-02-16 | ~72 | Plain links; sections: analysis, AI assistants, **Code Visualization & Mapping**, docs, tech debt, onboarding, dependencies | Human (eng orgs) | Abandoned (vendor-made, 1 day) | 0/7 (has dead CodeSee/Sourcetrail) |
| [jyck613/awesome-codebase-intelligence](https://github.com/jyck613/awesome-codebase-intelligence) | 0 | 2026-07-02 | 2026-07-04 | ~0 | Stub | n/a | Dead | 0/7 |
| [cipher387/code-understanding-tools](https://github.com/cipher387/code-understanding-tools) | 149 | 2022-03-30 | 2023-09-07 | ~45 tools | Tables (name / link / price): online IDEs, code explainers | Human | Abandoned, pre-agent | 0/7 |
| [tthtlc/awesome-source-analysis](https://github.com/tthtlc/awesome-source-analysis) | 137 | 2018-06-19 | 2026-01-18 | ~59 URLs | Research links on ML source analysis | Researchers | Barely alive | 0/7 |
| [ishandutta2007/Awesome-Code-Visualization-Platform](https://github.com/ishandutta2007/Awesome-Code-Visualization-Platform) | 1 | 2026-08-07 | 2026-08-07 | ~24 | Auto-generated "Top X" list (author makes hundreds) | n/a | Spam-like | 0/7 |
| [cafour/awesome-softvis](https://github.com/cafour/awesome-softvis) | 3 | 2023-10-11 | 2023-10-11 | ~12 | Plain links, academic softvis | Researchers | Abandoned | 0/7 |
| [irresi/awesome-agentic-knowledge-base](https://github.com/irresi/awesome-agentic-knowledge-base) | 8 | 2026-04-30 | 2026-05-14 | 47 repos | **Empirical matrix**: code-verified components (storage, MCP, graph) ranked by adoption | Agent builders | Stale since May | 1/7 (Understand Anything) + DeepWiki-open, Graphify, GitNexus |
| [looptech-ai/understand-quickly](https://github.com/looptech-ai/understand-quickly) | 48 | 2026-05-07 | 2026-09-17 | registry | "Awesome-list 2.0": a machine-readable registry of code-knowledge graphs (Understand-Anything, GitNexus, code-review-graph formats), with MCP | **Agent** | Slowing | 2/7 (UA, DeepWiki mention) + GitNexus, Graphify |

### B. Code review lists

| List | Stars | Created | Last push | ~Entries | Format | Human / agent | Alive? | Example coverage |
|---|---|---|---|---|---|---|---|---|
| [joho/awesome-code-review](https://github.com/joho/awesome-code-review) (in sindresorhus/awesome) | 5,193 | 2018-01-31 | 2024-09-09 | ~67 | Plain links: papers, articles, books, talks, tools (incl. Softagram, Viezly "PR visualization") | Human reviewers | **Stale 2+ years**, pre-AI | 0/7 |
| [kodustech/awesome-ai-code-review](https://github.com/kodustech/awesome-ai-code-review) | 54 | 2025-12-17 | 2026-06-28 | ~56 | Plain links: PR agents, IDE, research, security, CLI, benchmarks | Team leads choosing a bot | Vendor-run (Kodus), slowing | 1/7 (CodeRabbit) |
| [kodustech/awesome-code-review-tools](https://github.com/kodustech/awesome-code-review-tools) | 15 | 2026-03-18 | 2026-03-18 | ~40 | Plain links | Same | Abandoned | 1/7 |
| [ianwieds/awesome-ai-code-review](https://github.com/ianwieds/awesome-ai-code-review) | 2 | 2026-10-03 | 2026-11-21 | ~111 | Plain links by delivery (platforms, code host, OSS bots, Actions, CLI, security, skills/MCP, benchmarks); includes **PR Lens** ("draws each PR as an architecture walkthrough") and Mira ("walkthroughs") | Human, tool-picking | **Active daily** | 1/7 (CodeRabbit) |
| [furudo-erika/awesome-ai-code-review-tools](https://github.com/furudo-erika/awesome-ai-code-review-tools) | 2 | 2025-10-10 | 2026-10-18 | ~44 | Plain links | Human | Alive, low | 1/7 |
| [zhuyansen/awesome-claude-code-review](https://github.com/zhuyansen/awesome-claude-code-review) | 2 | 2026-10-10 | 2026-11-20 | ~209 (claims 186 repos, "security-graded") | Links with a security grade | Agent users | Active | 0/7 |
| [mgreiler/awesome-code-review-research](https://github.com/mgreiler/awesome-code-review-research) | 50 | 2022-06-10 | 2026-07-25 | papers | Research papers | Researchers | Alive | 0/7 |
| [coderabbitai/awesome-coderabbit](https://github.com/coderabbitai/awesome-coderabbit) (in sindresorhus/awesome) | 592 | 2024-09-24 | 2026-09-29 | n/a | Vendor's own resources | n/a | Vendor | 1/7 |

### C. Agent / AI coding tool lists that contain the map tools

| List | Stars | Created | Last push | ~Entries | Format | Human / agent | Alive? | Example coverage |
|---|---|---|---|---|---|---|---|---|
| [jqueryscript/awesome-claude-code](https://github.com/jqueryscript/awesome-claude-code) | 555 | 2025-07-13 | 2026-11-19 | ~835 | Plain links by artifact type (Plugins, Tools, Skills) | Claude Code users | Active | **5/7** (Floorplan, UA, Archify, CodeGraph + Graphify), scattered across 3 sections |
| [Wellux/awesome-coding-agents](https://github.com/Wellux/awesome-coding-agents) | 4 | 2026-10-29 | 2026-11-16 | ~578 | Links; has a **"Code graphs and intelligence"** and a "Repo packers and live docs" subsection | Agent users | Active | 3/7 (UA, DeepWiki, CodeGraph) + Graphify, GitNexus |
| [Lancetnik/awesome-engineering-ai](https://github.com/Lancetnik/awesome-engineering-ai) | 37 | 2026-08-01 | 2026-09-07 | ~108 | **Evidence marks** (daily driver / tried / tried-no / untested), 500-star floor, one opinionated line each; sections include "Context, retrieval and memory" and **"Review, guardrails and forensics"** (tuicr, Mindwalk, open-code-review) | Developer + agent ("tools you use with your agent") | Quiet since Sept | 2/7 (UA, CodeGraph) + Graphify, GitNexus |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 58,501 | 2025-04-19 | 2026-11-21 | ~254 | Plain links by type | Claude Code users | Very active | 1/7 (Archify) |
| [ai-for-developers/awesome-ai-coding-tools](https://github.com/ai-for-developers/awesome-ai-coding-tools) | 2,302 | 2025-06-27 | 2026-09-18 | ~534 | Plain links by tool type | Human buyers | Alive | 1/7 (CodeRabbit) |
| [sourcegraph/awesome-code-ai](https://github.com/sourcegraph/awesome-code-ai) | 1,690 | 2023-02-07 | 2026-02-23 | ~81 | Plain links | Human | Slowing | 0/7 |
| [launchapp-dev/awesome-ai-coding-tools](https://github.com/launchapp-dev/awesome-ai-coding-tools) | 12 | 2026-04-13 | 2026-11-21 | ~179 | Plain links | Human | Active | 1/7 |
| [mahmoudsajjadi/awesome-ai-coding-tools](https://github.com/mahmoudsajjadi/awesome-ai-coding-tools) | 19 | 2026-10-08 | 2026-11-21 | ~87 | "Verified" catalog | Human | Active | 1/7 |
| [jiji262/awesome-vibe-coding-tools](https://github.com/jiji262/awesome-vibe-coding-tools) | 100 | 2025-09-06 | 2026-11-17 | ~195 | Plain links | Vibe coders | Active | 1/7 |
| [filipecalegario/awesome-vibe-coding](https://github.com/filipecalegario/awesome-vibe-coding) | 5,454 | 2025-03-13 | 2026-04-16 | ~132 | Plain links | Vibe coders | Slowing | 0/7 |
| [justxor/awesome-ai-devtools-ru](https://github.com/justxor/awesome-ai-devtools-ru) | 30 | 2026-10-18 | 2026-10-19 | ~251 | Russian-language catalog | Human | New | 2/7 (DeepWiki, CodeRabbit) |
| [fatihkc/awesome-agentic-engineering](https://github.com/fatihkc/awesome-agentic-engineering) | 32 | 2026-07-09 | 2026-11-15 | ~63 | Learning resources | Human | Active | 0/7 |
| [QiushiSun/Awesome-Code-Intelligence](https://github.com/QiushiSun/Awesome-Code-Intelligence) | 281 | 2023-07-11 | 2025-07-24 | ~75 | Survey reading list (neural code models) | Researchers | Stale | 0/7 |

### D. Diagram / architecture lists

| List | Stars | Created | Last push | ~Entries | Format | Alive? | Example coverage |
|---|---|---|---|---|---|---|---|
| [shubhamgrg04/awesome-diagramming](https://github.com/shubhamgrg04/awesome-diagramming) | 3,287 | 2022-09-19 | 2024-08-25 | ~44 | Plain links: diagram tools | Stale | 0/7 |
| [terrastruct/awesome-diagrams](https://github.com/terrastruct/awesome-diagrams) | 114 | 2024-05-20 | 2026-10-01 | ~161 | Gallery of real architecture diagrams | Alive | 0/7 |
| [hudsonkit/awesome-architecture-diagrams](https://github.com/hudsonkit/awesome-architecture-diagrams) | 1 | 2026-09-28 | 2026-09-28 | ~22 | Links + searchable directory site; diagrams-as-code, models, editors, renderers | New, vendor-linked | 1/7 (Archify) |
| [mehdihadeli/awesome-software-architecture](https://github.com/mehdihadeli/awesome-software-architecture) | 11,814 | 2021-02-06 | 2026-11-19 | large | Learning articles | Active | n/a (learning, not tools) |
| [workos/awesome-developer-experience](https://github.com/workos/awesome-developer-experience) | 2,263 | 2021-07-12 | 2024-07-12 | ~131 | DX resources | Stale | 0/7 |

### E. sindresorhus/awesome (the root list)

Relevant sublists: Code Review (joho), CodeRabbit (vendor), Static Analysis & Code Quality (analysis-tools-dev, 14,913 stars), Software Architecture, Empirical Software Engineering, Algorithm Visualizations, GitHub Wiki, Domain-Driven Design. **It has no sublist for code visualization, codebase comprehension, code maps, or "understanding agent changes".**

### F. Outside GitHub: catalogs, directories, comparison articles

| Source | What it is | Human-focused? | Notes |
|---|---|---|---|
| [Medium, Jordanovski, "Four bets on understanding code your AI wrote"](https://medium.com/@martin.jordanovski/archify-vs-graphify-vs-understand-anything-vs-codebase-memory-mcp-four-bets-on-understanding-code-88703e8ad3f5) (Nov 2026) | Long comparison: who reads the map (human/agent), who reads the code (parser/LLM), how it guards against model error, plus an "honest caveat" on evidence (agents ignore the map; no independent proof) | Both, explicitly split | **Closest to the proposed angle.** 4 tools + 4 close calls. One-off. |
| [Repowise blog comparisons](https://repowise.dev/blog/comparisons/best-codebase-visualization-tools) (visualization, DeepWiki alternatives, docs for agents) | Vendor comparisons with tables and their own 195-repo measurement | Human | Vendor ranks itself first; strong SEO |
| [backthread.dev/compare/deepwiki-alternatives](https://backthread.dev/compare/deepwiki-alternatives), [dosu.dev](https://dosu.dev/articles/deepwiki-alternatives), [git2docs](https://git2docs.com/blog/alternatives-to-deepwiki), [shipdocs.sh](https://shipdocs.sh/blog/codewiki-alternatives-7-tools-for-private-repos/), [moxiedocs](https://moxiedocs.com/vs/codewiki), [gitdiagram.com/visualize-codebase](https://gitdiagram.com/visualize-codebase) | Vendor "alternatives" pages for code wikis and diagrams | Human | All self-serving |
| [Sourcegraph AI dev tools guide](https://sourcegraph.com/blog/ai-developer-tools), [DeepSource](https://deepsource.com/resources/ai-code-review-tools), [LogRocket](https://blog.logrocket.com/ai-code-review-tools-2026/), [Optimal AI](https://getoptimal.ai/blog/best-ai-code-review-tools), [Mastra](https://mastra.ai/articles/ai-code-review-tools), [Codegen](https://codegen.com/ai-code-review-tools/), [gitautoreview](https://gitautoreview.com/blog/diff-bots-vs-agentic-review) | 2026 AI code review comparisons | Human buyers | Review bots only; no maps or understanding |
| [skillsllm.com](https://skillsllm.com/skill/floorplan) | Generic skill catalog with security scan; puts Floorplan under "IDE Extensions" | n/a | Has no theme category; Floorplan's own README table compares Floorplan / Archify / Understand Anything |
| [ai-tldr.dev](https://ai-tldr.dev/tools/archify/) | Tool pages | n/a | Generic |
| Product Hunt | Individual launches (CodeViz, Codemap, Codalogy, GitProbe, ProductMap) | Human | No curated category for codebase visualization found |
| [theroadtoenterprise.com onboarding guide](https://theroadtoenterprise.com/blog/onboarding-to-new-codebase-with-ai-tools) | Onboarding methodology using UA, DeepWiki, etc. | Human | Tutorial, not a catalog |
| Comprehension-debt writing (Osmani, Storey, fathohm.dev, augmentcode guide, arXiv 2611.24216) | The **problem** framing the theme rests on | Human | No catalog of tools attached; [wyeworks/accountable-review](https://github.com/wyeworks/accountable-review) (42 stars) is a tool framed exactly on comprehension debt (PR → HTML review map) |

## 2. Top 25 tools in the theme (created or active in 2026), by stars

From GitHub topics (codebase-visualization, code-visualization, code-graph, code-knowledge-graph, deepwiki, code-wiki, change-impact-analysis, blast-radius, pull-request-review, diff-viewer, code-review) plus the named examples. All of them were pushed in 2026.

| # | Tool | Stars | Created | What it shows a human |
|---|---|---|---|---|
| 1 | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | 151,391 | 2026-04-03 | Clickable graph of code + docs + PDFs, a report of "god nodes" and surprising links; edges tagged extracted/inferred/ambiguous |
| 2 | [tt-a1i/archify](https://github.com/tt-a1i/archify) | 98,461 | 2026-04-15 | One validated interactive diagram (10 types) of a slice of the system, with source receipts; before/after architecture delta for PRs |
| 3 | [Egonex-AI/Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) | 93,494 | 2026-03-15 | Knowledge graph with plain-English summaries, layer and domain views, guided tours, diff impact |
| 4 | [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) | 78,281 | 2026-01-18 | Mostly agent-side: pre-indexed symbol graph; for humans, call paths and blast-radius per query |
| 5 | [alibaba/open-code-review](https://github.com/alibaba/open-code-review) | 54,936 | 2026-05-18 | Line-level review comments from deterministic pipelines + LLM |
| 6 | [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | 48,970 | 2026-02-24 | Agent-first graph; diff → affected symbols with risk; Lens browser view (beta) |
| 7 | [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus) | 48,708 | 2025-08-02 | Browser graph of symbols, calls, execution flows (non-commercial licence) |
| 8 | [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | 32,896 | 2026-02-26 | Blast radius, affected tests and risk-scored review context for a change |
| 9 | [yamadashy/repomix](https://github.com/yamadashy/repomix) | 29,362 | 2024-07-13 | Not a view: packs a repo into one file for an LLM (adjacent) |
| 10 | [ahmedkhaleel2004/gitdiagram](https://github.com/ahmedkhaleel2004/gitdiagram) | 19,049 | 2024-12-15 | Interactive architecture diagram of any GitHub repo + 1-minute explainer video |
| 11 | [AsyncFuncAI/deepwiki-open](https://github.com/AsyncFuncAI/deepwiki-open) | 18,469 | 2025-04-30 | Self-hosted DeepWiki: generated wiki + diagrams + chat |
| 12 | [langchain-ai/openwiki](https://github.com/langchain-ai/openwiki) | 18,047 | 2026-06-22 | Maintained Markdown wiki of the repo (agent-oriented, readable by humans) |
| 13 | [The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge](https://github.com/The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge) | 12,768 | 2025-04-02 | Beginner tutorial generated from a repo |
| 14 | [trailhq/Trail-Code](https://github.com/trailhq/Trail-Code) | 11,391 | 2026-07-03 | Shared team memory + code map for agents |
| 15 | [modem-dev/hunk](https://github.com/modem-dev/hunk) | 9,864 | 2026-03-17 | Review-first terminal diff viewer for agent-written changes |
| 16 | [repowise-dev/repowise](https://github.com/repowise-dev/repowise) | 8,189 | 2026-03-23 | Parsed graph, architecture/C4 view, blast radius, ownership, hotspots, dead code |
| 17 | [haydenschmitty/floorplan](https://github.com/haydenschmitty/floorplan) | 5,782 | 2026-10-27 | Plain-English zoomable app map, "what your AI just changed" highlights, health check, ask-the-map |
| 18 | [braedonsaunders/codeflow](https://github.com/braedonsaunders/codeflow) | 5,504 | 2025-12-16 | Paste a GitHub URL → architecture map, "what breaks if you change this" |
| 19 | [AIDotNet/OpenDeepWiki](https://github.com/AIDotNet/OpenDeepWiki) | 3,673 | 2025-04-27 | Open-source DeepWiki clone |
| 20 | [agavra/tuicr](https://github.com/agavra/tuicr) | 3,643 | 2026-01-08 | Terminal code reviewer for the human half of the agent loop, per-hunk "seen" tracking |
| 21 | [Ataraxy-Labs/sem](https://github.com/Ataraxy-Labs/sem) | 3,461 | 2026-02-05 | Entity-level diffs, blame and impact analysis over git |
| 22 | [oh-my-mermaid/oh-my-mermaid](https://github.com/oh-my-mermaid/oh-my-mermaid) | 3,398 | 2026-03-22 | Navigable Mermaid architecture diagrams generated with Claude Code |
| 23 | [giancarloerra/SocratiCode](https://github.com/giancarloerra/SocratiCode) | 3,382 | 2026-02-26 | Codebase intelligence for very large repos (agent/MCP) |
| 24 | [sopaco/deepwiki-rs](https://github.com/sopaco/deepwiki-rs) | 3,179 | 2025-09-05 | Generated technical docs (C4-style) for humans and agents |
| 25 | [CodeBoarding/CodeBoarding](https://github.com/CodeBoarding/CodeBoarding) | 2,692 | 2025-04-08 | Interactive architecture diagrams for codebases |

Smaller, strongly on-theme (human + change): [cosmtrek/mindwalk](https://github.com/cosmtrek/mindwalk) (1,401; replays an agent session on a 3D code map), [EricJujianZou/rederive](https://github.com/EricJujianZou/rederive) (1,257; quizzes you on code the AI wrote), [ix-infrastructure/Ix](https://github.com/ix-infrastructure/Ix) (1,158), [FinanceFlash/unvibecode](https://github.com/FinanceFlash/unvibecode) (1,895; traces business workflows in vibe code), [reviu-dev/reviu](https://github.com/reviu-dev/reviu) (109; review app for agent code), [data-goblin/claude-code-filetree](https://github.com/data-goblin/claude-code-filetree) (468; live pane of files the agent reads/edits), [wyeworks/accountable-review](https://github.com/wyeworks/accountable-review) (42; PR → review map), PR Lens (in ianwieds list), [FSoft-AI4Code/CodeWiki](https://github.com/FSoft-AI4Code/CodeWiki) (1,868; ACL 2026 research). Hosted, not open source: DeepWiki (Cognition), Google Code Wiki, CodeRabbit walkthroughs, Greptile, CodeViz (YC S24), CodeScene.

## 3. Where I searched / where I did not

**Searched:**
- `gh search repos` (sorted by stars, 12 results each): 28 queries on "awesome" + code visualization, software visualization, codebase understanding, code comprehension, program comprehension, code map, architecture diagram, diagrams as code, code review, AI code review, pull request, change impact analysis, code intelligence, code search, code wiki, repo documentation AI, developer experience, cognitive load, vibe coding, devtools, codebase, code graph, repository understanding, AI coding tools, code to diagram, codebase knowledge graph, claude code, code agents.
- `gh api search/repositories`: 30 more "awesome …" queries (code-understanding, deepwiki, code wiki, knowledge graph, impact analysis, code-review in:name, software architecture, code-map, git visualization, codebase rag, code context, static analysis, code-graph, mcp code, repository analysis, pr summary, developer onboarding, agentic coding, cognitive load, diagrams).
- GitHub topics (28 queries): codebase-visualization, code-visualization, software-visualization, code-comprehension, program-comprehension, codebase-understanding, code-understanding, code-map, codemap, architecture-diagram, code-review (created 2026), ai-code-review, code-knowledge-graph, code-graph, knowledge-graph+codebase, deepwiki, code-wiki, change-impact-analysis, impact-analysis, blast-radius, awesome-list+code-review, awesome-list+visualization, awesome+code-analysis, code-intelligence, repository-visualization, dependency-graph (2026), pull-request-review, diff-viewer (2026).
- READMEs downloaded and grepped for the 7 example tools + Graphify/GitNexus: 37 lists.
- The sindresorhus/awesome README, grepped for relevant sublists.
- Web via the fetchira MCP: `serper` (about 12 queries: DeepWiki alternatives, catalogs of code review / visualization tools, Understand-Anything/Floorplan/Archify lists, reviewing agent diffs, Google Code Wiki comparisons, Product Hunt categories, skillsllm, comprehension debt); `tavily` (2 queries); `read` of the Medium comparison, the Repowise visualization comparison and the skillsllm Floorplan page.

**Not searched / limits:**
- **Exa (semantic search) failed every time:** `rate limited: exa: account 'exa-1' is cooling down` on 6 attempts. I used Tavily as the semantic fallback. Some semantic hits may be missing.
- **GitHub API rate limit:** the first batch of 29 `search/repositories` queries hit `API rate limit exceeded` (HTTP 403) after the first one. I re-ran all of them throttled, so nothing was lost, but each query returned at most the top 15 by stars. Lists below roughly 1 star ranked low and may be missed.
- `gh search repos` with multi-word queries returned 0 for several phrasings (code wiki, cognitive load, code to diagram, repository understanding). I covered those with topic queries and `in:` variants, but "0" there means "no match for that phrasing", not "none exists".
- Not checked: GitLab, Codeberg, Hacker News "Ask HN" threads, Reddit beyond search snippets, X/LinkedIn posts, newsletters (TLDR, Pointer), academic softvis surveys (VISSOFT), Chinese-language catalogs beyond what surfaced, paid analyst reports (Gartner/Forrester), awesome lists named in other languages.
- Entry counts are link-line approximations, not hand counts. "Alive" is judged from the last push date only, not from issue or PR activity.
- Not checked: whether CodeRabbit walkthroughs or Google Code Wiki appear under other names (for example "Code Wiki" by Google is matched only as "code wiki|codewiki").
