# Duplicate check outside GitHub: human-facing code/change comprehension list with evidence levels

Date of check: 2026-11-21. Tools: fetchira `search` (provider serper; one tavily query), fetchira `read`, HN Algolia API via curl. Exa not used. WebSearch not needed.

## Verdict

- **No closeness-3 duplicate found.** Nothing found is a maintained catalog organised by the *decision a person makes* (how does my app fit together / what did the agent change / merge or not / blast radius / onboarding) with an evidence level and stated limits on every entry.
- **Closest (2 = near on frame, not on form):**
  1. Martin Jordanovski, "Archify vs Graphify vs Understand-Anything vs codebase-memory-mcp: Four Bets on Understanding Code Your AI Wrote" (Medium, Nov 2026). Single article, not a list. But it uses almost the same frame: comprehension debt, *who reads the map: person vs agent*, "how to choose" by situation, explicit "nobody has independent evidence" caveat, evidence summary with vendor/correlation labels, mentions Floorplan, CodeGraph, OpenWiki, GitNexus. 4 tools in depth. Promises a Part 2 benchmark on a Java/Spring service.
  2. agentpatterns.ai (site + CC BY 4.0 repo github.com/agentpatterns-ai/website). Agent-written reference of patterns; every page has evidence maturity ("Emerging - single recent source"), "When this backfires" limits, sources, last-reviewed date. Has a Code Review section and a Human Factors section (reviewer habituation, criticality-and-containment "which agent code you read", agent-generated code tours, stated-understanding checks). But it is patterns/practices for engineers building with agents, organised by topic; it is not a tool list for human comprehension.
- Everything else scored 0-1: vendor "best X tools" listicles, generic AI directories, single comprehension-debt essays, one SLR.

## Hits

| # | Name | URL | Owner type | Started / last update | Size | Organisation | Evidence levels / limits | Human vs agent | Closeness |
|---|---|---|---|---|---|---|---|---|---|
| 1 | "Four Bets on Understanding Code Your AI Wrote" (M. Jordanovski) | https://medium.com/@martin.jordanovski/archify-vs-graphify-vs-understand-anything-vs-codebase-memory-mcp-four-bets-on-understanding-code-88703e8ad3f5 | Person | Nov 2026, one-off (Part 2 promised) | 4 tools in depth + 4 "close calls" | By tool, then "how to choose" by situation (design review figure, onboarding, big messy repo, multi-service tracing) | Yes, informally: flags vendor data, correlation, "validated is not true", agents ignoring graphs, self-benchmarks; no per-entry level scheme | Explicit axis person vs agent | **2** |
| 2 | agentpatterns.ai | https://agentpatterns.ai/ (Human Factors: /human/, Code Review: /code-review/) | Project run by autonomous agents, pages can go live without human review | 2026; pages reviewed Jun-Oct 2026 | Hundreds of pages; ~50 in Human Factors | By topic/section (patterns, code review, verification, human factors, tools) | Yes: maturity badge per page, "When this backfires", sources | Mostly engineers working with agents; some human-comprehension pages | **2** (evidence format) / 1 (scope) |
| 3 | agentic-patterns.com | https://agentic-patterns.com/ | Person/community | 2025-2026 | ~190 patterns | By pattern category; maturity labels (best practice, validated in production, established, emerging) | Maturity labels, not claim limits | Building agents | 1 |
| 4 | Repowise "DeepWiki Alternatives 2026" + comparison series | https://repowise.dev/blog/comparisons/deepwiki-alternatives | Vendor (repowise) | Oct 2026 | 6 wiki tools | By tool; "how to choose" by need | Own measurement (freshness: commits behind HEAD on 3 repos), says what was not run, discloses bias | Both (agent MCP access is a column) | 1 |
| 5 | Dosu "Best DeepWiki Alternatives" / "Best tools for AI context" | https://dosu.dev/articles/deepwiki-alternatives | Vendor | 2026 | ~7 | By tool | No | Mostly agent context | 0-1 |
| 6 | Fathohm (comprehension-debt essay, "dark index") | https://fathohm.dev/comprehension-debt , https://fathohm.dev/dark-index | Vendor (a measurement tool) | Aug 2026 | Index of 100 repos | n/a: a product with a reproducible metric, not a list | Strong "what this cannot tell you" limits | Human/team | 0-1 (possible entry, not a duplicate) |
| 7 | Orienteer.ai "Comprehension Debt" guide | https://orienteer.ai/resources/guides/comprehension-debt | Consultancy | 2026 | Essay | Triage advice | No | Org/human | 0 |
| 8 | Fight for the Human, "testable diagnostics for comprehension debt" (Cat Hicks) | https://www.fightforthehuman.com/we-need-more-than-a-metaphor-here-are-testable-diagnostics-for-comprehension-debt/ | Person (researcher) | Aug 2026 | Essay + paywalled measure | n/a | Critiques evidence (flags weak "cognitive debt" study, small n of Anthropic study) | Human | 0-1 (good source on evidence, not a list) |
| 9 | Faros AI "Comprehension debt" blog | https://www.faros.ai/blog/comprehension-debt-in-software-engineering | Vendor | 2026 | Essay with research roundup | By SDLC stage | No | Org | 0-1 |
| 10 | Theresanaiforthat: "Code visualization" task / "Codebase visualization" search | https://theresanaiforthat.com/task/code-visualization/ , https://theresanaiforthat.com/s/codebase+visualization/ | Directory | ongoing | 7 / 24 tools | By task tag | No | Undifferentiated | 0 |
| 11 | AlternativeTo: DeepWiki, Code Wiki | https://alternativeto.net/software/deepwiki/ , https://alternativeto.net/software/code-wiki/ | Directory, crowd | ongoing | 4 / 22 entries | Alternatives graph | No | Undifferentiated | 0 |
| 12 | SolopreneursHub "Understand Anything alternatives" | https://www.solopreneurshub.com/alternatives/understand-anything | Directory | 2026 | 9 (irrelevant: LangChain, vLLM...) | Generic | No | n/a | 0 |
| 13 | SkillsLLM, skillsdirectory.com, mcpmarket.com, ai.dosa.dev, opensourcealternatives.to, nicheloom | e.g. https://skillsllm.com/skill/floorplan , https://ai.dosa.dev/tools/gitdiagram | Directories of skills/tools | ongoing | Large | Tags such as "codebase-visualization" | No | Agent skills | 0 |
| 14 | Product Hunt product pages (ProductMap, RepoLens, Codalogy, Depth AI, Understand Anything launch) | https://www.producthunt.com/products/repolens etc. | Vendors | various | single products | n/a | No | Human | 0 (no curated collection found) |
| 15 | "Best AI code review tools 2026" listicles (Sourcegraph, DeepSource, Greptile, Optimal, LogRocket, Mastra, Unblocked, Aikido, Wiz, Augment) | e.g. https://sourcegraph.com/blog/automated-code-review-tools , https://deepsource.com/resources/ai-code-review-tools | Vendors / media | 2025-2026 | 5-13 tools each | By tool | DeepSource and Augment claim own benchmarks; no levels | Bot finds bugs, not human understanding | 0 |
| 16 | kodustech/awesome-code-review-tools | https://github.com/kodustech/awesome-code-review-tools | Vendor (Kodus) | 2025-2026 | tens | By tool type | No | Review automation | 0-1 (GitHub, likely already seen) |
| 17 | invincible04/awesome-loop-engineering, "risks and the debt trilogy" | https://github.com/invincible04/awesome-loop-engineering/blob/main/docs/09-risks-and-the-debt-trilogy.md | Person | 2026 | doc chapter | Topic | No | Agent loops | 0-1 (GitHub) |
| 18 | SLR "Software Visualization Tools for Program Comprehension" | https://dl.acm.org/doi/10.1007/978-3-032-15538-2_41 | Academic | 2025/2026 (chapter) | SLR | By topic (metrics, dependencies, code structure) | Academic quality, not per-tool claims | Human, pre-LLM focus | 1 |
| 19 | ICPC 2026 "Understanding Codebase like a Professional! Human-AI Collaboration for Code Comprehension" | https://conf.researchr.org/details/icpc-2026/icpc-2026-research/29/ | Academic | 2026 | one paper | n/a | n/a | Human | 0 (possible entry) |
| 20 | "The Comprehension Gap in LLM-Assisted Software Development" | https://arxiv.org/html/2611.24216v1 | Academic | Nov 2026 | paper | n/a | n/a | Human | 0 (possible entry) |
| 21 | Simon Willison tag `cognitive-debt` | https://simonwillison.net/tags/software-engineering/ (tag cognitive-debt exists) | Person | 2026 ongoing | link log | Chronological | No | Human | 0-1 (running link log, not a catalog) |
| 22 | Margaret-Anne Storey blog posts + ACM Queue "From Technical Debt to Cognitive and Intent Debt" | https://margaretstorey.com/blog/2026/02/18/cognitive-debt-revisited/ , https://queue.acm.org/doi/abs/10.1145/3807966 | Academic | Feb-Mar 2026 | essays/paper | n/a | n/a | Human/team | 0 (core source) |
| 23 | Pragmatic Engineer "The Pulse: concern about massive increase in code review load" | https://blog.pragmaticengineer.com/the-pulse-new-trend-concern-about-massive-increase-in-code-review-load/ | Person/newsletter | 2026 | article | n/a | no | Human review load | 0 |

## Where I searched

- Directories: There's An AI For That, AlternativeTo (DeepWiki, Code Wiki), SolopreneursHub, SkillsLLM, skillsdirectory, mcpmarket, ai.dosa.dev, opensourcealternatives.to, nicheloom, Product Hunt (product pages via search).
- Vendor comparison hubs: repowise, dosu, Sourcegraph, DeepSource, Greptile, Augment, and other "best AI code review tools 2026" listicles.
- GitLab / Codeberg / Gitee: site-restricted search for awesome lists on code comprehension, codebase visualization, code review; Gitee search in Chinese.
- Notion / Airtable: search for public databases of code review or codebase understanding tools.
- Newsletters/blogs: Simon Willison tags, Pragmatic Engineer, Latent Space (via citation), LeadDev, InfoQ Trends Report 2026, Addy Osmani / O'Reilly, Storey, Cat Hicks, Faros.
- Academic: SLR on software visualization for program comprehension, ICPC 2026 program, arXiv comprehension-gap paper, Habituation at the Gate citations, Copilot-for-PRs FSE 2024 citations.
- HN Algolia (stories): "awesome list codebase", "list of tools understand codebase", "code comprehension tools", "comprehension debt", "tools to understand a codebase", "codebase visualization", "cognitive debt", "curated list code review AI".
- Frame search: "comprehension debt" / "cognitive debt" + tools list / resources hub / curated list / awesome.

## Where I did not search

- StackShare (no query run).
- Product Hunt collections pages directly (only product pages surfaced; collections are not well indexed).
- Futurepedia, aitools.fyi, agent-orchestrators.com-style niche catalogs by name.
- Notion/Airtable via their own gallery search (only web search; such databases are poorly indexed, so a private-ish Notion list could exist).
- VISSOFT tool-track proceedings and any "SV tools catalogue" site by name; IEEE Xplore and ACM DL full-text search.
- Latent Space, LeadDev, InfoQ article bodies were not read, only search results.
- Reddit / X / LinkedIn / Substack beyond what search surfaced.
- GitHub itself (out of scope; covered by the earlier scan).

## Failed or empty queries

- Springer chapter page for the SLR did not load (client-side script required); details taken from search snippet only.
- First HN curl run failed because of an output-rewriting shell proxy; rerun with raw output worked.
- Notion/Airtable query returned only vendor listicles and Airtable's homepage: no public database found.
- GitLab/Codeberg query returned only GitHub and vendor pages: no list found there.
- Gitee query returned general AI resource lists (AI-Compass, Awesome-Tools), nothing on code comprehension.
- "Habituation at the Gate" citations led only to agentpatterns.ai and blog posts, no catalog.
