# Naming demand: how people search for "understand a codebase / a code change"

Measured 2026-11-21. Raw data: `scratchpad/nd/` (ac.json, ab.json, hn.json, hn2.json, aclist.txt).

## Verdict

| Question | Answer | Evidence |
|---|---|---|
| Most search volume | **ai code review** (by an order of magnitude) | Trends 12-mo avg 49 vs code visualization 4, cognitive debt 3, deepwiki 1, comprehension debt <1; 214 distinct A–Z suggestions |
| Second tier, tool intent | **code visualization / visualizer** | 157 A–Z suggestions, 43 suffix suggestions, YouTube 7; but mostly learning/DSA ("visualizer for python/leetcode") and data-viz noise |
| Clear "understand" intent | **understand (a/any/large) codebase**, "codebase understanding" | 35 A–Z suggestions, 10 "how to understand …codebase" variants, "understand codebase with ai/skill/tool/github" |
| Rising fastest (discussion) | **cognitive debt** (×6.1 on HN 2026 vs 2025; ×3.5 above baseline), **comprehension debt** (×5, ×2.9 above baseline), **code knowledge graph** (0 → 9) | HN Algolia quarterly |
| Falling | deepwiki (HN ×0.41), code visualization (HN flat ~1/quarter), "vibe coding" below baseline | HN Algolia |
| Concept vs tool | "comprehension debt" / "cognitive debt" are *concept* words (meaning, MIT study, Addy Osmani, reddit). Nobody searches "comprehension debt tool". | Autocomplete: 0 tool/github suggestions for comprehension debt |

**Recommendation**
- **Name**: carry the searchable noun, not the concept. Candidates: `awesome-code-understanding`, `awesome-codebase-understanding`, `awesome-understand-code`. "code visualization" is bigger but off-scope (learning visualizers, data viz). "ai code review" is huge but owned by CodeRabbit/Greptile listicles and is about bots, not people.
- **Description** (first ~120 chars, GitHub search indexes it): put both phrasings people type + the rising concept: e.g. "Tools and evidence to understand a codebase or a code change (AI-written code, agent PRs) and decide faster — against comprehension debt."
- **Topics** (20 max), ordered by measured use: `code-review` (11,906 repos), `ai-code-review` (1,123), `code-visualization` (473), `architecture-diagram` (336), `code-understanding` (113), `code-comprehension` (104), `codebase-visualization` (94), `codebase-understanding` (49), `code-map` (69), `codebase-map` (31), `knowledge-graph`, `code-knowledge-graph` (16), `program-comprehension` (27), `software-visualization` (52), `comprehension-debt` (16), `cognitive-debt` (10), `onboarding`, `vibe-coding`, `deepwiki`, `awesome-list`.

## Method

1. Google autocomplete, `suggestqueries.google.com/complete/search?client=firefox`, 19 seeds × 8 variants (seed, + tool/tools/ai/github/open source/visualize, "how to " + seed) + YouTube (`ds=yt`). Then A–Z expansion (seed + " a".." z", distinct union) for 6 seeds.
2. Google Trends: fetchira `read` returned only the regional breakdown (no time series); fetchira `browser` had no account; scrapingant detected; direct API 429. One comparison loaded in a desktop browser pane and its `widgetdata/multiline` JSON was read. A second comparison (understand codebase, code comprehension, codebase visualization, code knowledge graph) got rate-limited (chart blank, 429) — **not measured**.
3. HN Algolia, phrase query, stories+comments, nbHits per calendar quarter 2025Q1–2026Q4 (2026Q4 is partial: to Nov 21). Baseline "code review" for normalisation (HN overall grew: "code review" ×1.73, "claude code" ×2.68).
4. Reddit: reddit.com search JSON → 403. fetchira search with `domains=[reddit.com]` (serper free tier refused the domain filter, router fallback worked); counted phrasing in top results.
5. Homepages: curl `<title>` + meta description; GitHub repo description/topics via `gh api`; GitHub topic repo counts via `search/repositories?q=topic:X` (hit rate limit after 20 topics).

## 1. Google autocomplete

### Suggestion counts per seed

| Seed | base (max 10) | sum over 8 variants | YouTube | A–Z distinct |
|---|---|---|---|---|
| ai code review | 10 | **62** | 10 | **214** |
| code map | 10 | 53 (mostly games/zip codes) | 10 (games) | – |
| code visualization | 10 | **43** | 7 | **157** |
| cognitive debt | 10 | 28 | 4 | **99** (36 AI/coding-related) |
| understand codebase | 10 | 28 | 5 | **35** |
| code comprehension | 10 | 22 (interview-round noise) | 6 | – |
| codebase understanding | 10 | 21 | 1 | – |
| code knowledge graph | 10 | 16 | 2 | – |
| codebase map | 10 | 13 | 0 | 7 |
| architecture diagram from code | 10 | 13 | 0 | – |
| codebase wiki | 10 | 12 | 1 | – |
| deepwiki alternative | 10 | 12 | 0 | – |
| comprehension debt | 10 | 11 | 1 | **8** |
| review ai pull requests | 7 | 11 | 0 | – |
| program comprehension | 10 | 10 (academic) | 3 | – |
| codebase visualization | 5 | 10 | 1 | – |
| onboarding codebase | 8 | 10 | 0 | – |
| understand ai generated code | 1 | 3 | 4 | – |
| vibe coding understand code | 0 | 0 | 0 relevant | – |

### What the suggestions say (selected)

- **ai code review**: tools, github, open source, free, reddit, benchmark, agent, skills, prompt, azure devops, gitlab, bitbucket, comparison, "fatigue", "bottleneck". "how to review ai code reddit" appears.
- **code visualization**: tools, tools free, tools open source, github, python/java/c++, online, vscode, "claude code visualization", "codebase visualization", "code architecture visualization", "code structure visualization", "code dependency visualizer", "code city visualization". Many are beginner/DSA visualizers.
- **understand codebase**: "understand codebase skill", "using ai", "github", "cursor understand codebase", "understand anything codebase", "understand any codebase with ai"; how-to: "how to understand large codebases", "new codebase", "a codebase fast", "complex codebase", "… reddit".
- **codebase understanding**: skill, ai, agent, tool, llm, mcp, prompt.
- **code knowledge graph**: github, "for claude code", mcp, skill.
- **codebase map**: mapper, skill, github, mcp, "for ai", "gsd codebase mapper", "claude codebase map".
- **architecture diagram from code**: generate, automatic, "claude code", "skill codex".
- **deepwiki alternative**: github, open source, reddit, local, free.
- **comprehension debt**: meaning, ai, reddit, addyosmani, anthropic, google, "ai coding comprehension debt".
- **cognitive debt**: meaning, mit study, ai coding, "in software engineering", "vs technical debt", "vibe coding", "simon willison", "martin fowler", "storey", "is the new technical debt"; "how to reverse/fix/avoid cognitive debt".
- **review ai pull requests** → reformulated as "ai review pull requests", "ai pull request review tools". People search for AI *doing* review, not humans reviewing AI.
- **understand ai generated code**: only "understanding ai generated code", "how to know ai generated code".

Pattern: the "AI" suffix is attached to the *tool* ("codebase understanding ai/skill/mcp"), not to the *code being understood*. Demand for "understand AI-generated code" as a phrase is near zero.

## 2. Google Trends (worldwide, past 12 months, weekly, web search)

Comparison: code visualization, comprehension debt, ai code review, deepwiki, cognitive debt.

| Term | 12-mo avg | Nov 2025 | Mar 2026 | late May–Jun 2026 peak | Sep 2026 |
|---|---|---|---|---|---|
| ai code review | **49** | 54–64 | 69–78 | **100** (May 31) | 25–35 |
| code visualization | 4 | 4–5 | 4–6 | 8–9 | 2–5 |
| cognitive debt | 3 | 2–3 | 3–4 | 5–6 | 2–4 |
| deepwiki | 1 | 2 | 2 | 2 | 1 |
| comprehension debt | <1 | <1 | <1 | 1 | <1–1 |

- From Oct 4, 2026 every series drops ~5× at once (ai code review 25 → 7 → 3–6). Same-week drop across unrelated terms points to a Trends data change (the page shows "Classic Explore is expiring"), not real demand. Treat Oct–Nov 2026 as unreliable.
- Region: ai code review / code visualization / cognitive debt peak in South Korea, Singapore, Netherlands, US; deepwiki is 100 China.
- Rising related query for code visualization: "comprehension debt" (from fetchira read of the same page).

Ratio within the comparison: ai code review ≈ 12× code visualization ≈ 16× cognitive debt ≈ 50×+ comprehension debt.

## 3. Hacker News (Algolia, stories + comments, phrase match)

| Term | 25Q1 | 25Q2 | 25Q3 | 25Q4 | 26Q1 | 26Q2 | 26Q3 | 26Q4* | 2025 | 2026 YTD | ×2026/2025 | vs baseline |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cognitive debt | 0 | 26 | 12 | 1 | 83 | 77 | 64 | 15 | 39 | 239 | **6.1** | **3.5** |
| comprehension debt | 0 | 0 | 5 | 3 | 9 | 15 | 11 | 5 | 8 | 40 | **5.0** | **2.9** |
| code knowledge graph | 0 | 0 | 0 | 0 | 3 | 3 | 1 | 2 | 0 | 9 | new | new |
| code comprehension | 3 | 3 | 3 | 3 | 7 | 8 | 4 | 8 | 12 | 27 | 2.3 | 1.3 |
| understand the codebase | 2 | 9 | 14 | 11 | 32 | 18 | 13 | 13 | 36 | 76 | 2.1 | 1.2 |
| ai generated code | 133 | 205 | 229 | 226 | 541 | 424 | 391 | 225 | 793 | 1581 | 2.0 | 1.15 |
| review ai generated code | 2 | 3 | 9 | 6 | 13 | 8 | 6 | 4 | 20 | 31 | 1.6 | 0.9 |
| ai code review | 20 | 38 | 32 | 50 | 76 | 50 | 55 | 29 | 140 | 210 | 1.5 | 0.9 |
| codebase map | 0 | 0 | 0 | 2 | 1 | 1 | 0 | 1 | 2 | 3 | 1.5 | 0.9 |
| codebase understanding | 6 | 2 | 6 | 1 | 4 | 5 | 3 | 3 | 15 | 15 | 1.0 | 0.6 |
| code visualization | 0 | 0 | 4 | 1 | 3 | 0 | 1 | 0 | 5 | 4 | 0.8 | 0.5 |
| deepwiki | 0 | 43 | 40 | 63 | 29 | 18 | 9 | 4 | 146 | 60 | 0.4 | 0.24 |
| vibe coding | 582 | 1789 | 1930 | 1615 | 2660 | 1934 | 1278 | 889 | 5916 | 6761 | 1.1 | 0.66 |
| *baseline* code review | 428 | 511 | 698 | 600 | 1173 | 1009 | 1092 | 603 | 2237 | 3877 | 1.73 | 1.00 |
| *baseline* claude code | 408 | 1667 | 4653 | 3769 | 11139 | 8430 | 5434 | 3110 | 10497 | 28113 | 2.68 | – |

\*26Q4 to Nov 21 (~57% of quarter).

Read: the debt words are the only candidates growing well above HN's general growth; both peaked 26Q1–Q2 and are still at 2–3× their 2025 level. "cognitive debt" is ~6× more frequent than "comprehension debt" but also covers the non-coding MIT "Your Brain on ChatGPT" study.

## 4. Reddit phrasing (fetchira search, domain reddit.com)

| Query | Relevant posts in top results | Phrasing seen in titles |
|---|---|---|
| "comprehension debt" | 17 of 20 | "Comprehension Debt" (r/webdev, r/buildinpublic, r/microsaas, r/antiai, r/LLMDevs), "AI Comprehension Debt"; one post on cognitive debt, one "code comprehension" (r/ExperiencedDevs "Managing code comprehension") |
| "cognitive debt" AI coding | 9 of 10 | "cognitive debt" (r/vibecoding answer "There is a name. It's called cognitive debt", r/developersIndia, r/webdev, r/Frontend "Agentic Coding is a Trap … cognitive debt"); alternative coinages in comments: "intellectual debt", "cognitive surrender", "slop debt" |
| tool to visualize / understand large codebase | 10 of 10 (all launch posts) | "visualize your codebase architecture", "code visualization tool", "codebase diagramming", "maps your codebase into a graph", "Repo Map", "understand any codebase"; one explicitly about monitoring code bloat by agents |
| how do you review AI-generated / agent PRs | 10 of 10 | "agent PRs", "agent-written PRs", "reviewing agent code", "AI generated code", "AI PRs", "Reviewing them is now my bottleneck"; evidence words: "trust brief", "review packet", "evidence", "receipt", "reading order" |

Takeaway: practitioners name the *problem* "comprehension debt"/"cognitive debt", the *object* "agent PRs"/"AI-generated code", and the *tool* "visualize/map/understand the codebase". The evidence-for-a-PR theme ("what evidence would make you trust a PR") is active but has no stable search term.

Not counted: exact Reddit post totals (Reddit API 403; search engines return ≤20 per query).

## 5. How the tools name themselves

| Tool | `<title>` / description | Words used |
|---|---|---|
| CodeRabbit | "Governance & Control for Agentic Development"; "AI code review, PR triage, change explanations" | ai code review, agentic, change explanations |
| Greptile | "AI Code Review \| Greptile \| Catch More Bugs"; "AI Code Reviews that understand your entire codebase" | ai code review, understand codebase |
| Sourcegraph | "The Context Layer for Your Entire Codebase"; "humans and agents … AI-generated code" | codebase context, ai-generated code |
| CodeViz | "CodeViz - Visualize Your Code"; "Understand your codebase at a glance with intelligent code visualization" | understand your codebase, code visualization |
| CodeBoarding | "The system view that makes software risks visible" | system view |
| Understand-Anything (GitHub, 93k★) | "Turn any code into an interactive knowledge graph …"; topics: codebase-analysis, knowledge-graph, understandcode, vibe-coding, claude-code | knowledge graph, understand |
| Graphify (GitHub, 151k★) | "Turn any codebase … into a queryable knowledge graph"; topics: code-analysis, knowledge-graph, graphrag, mcp | knowledge graph |
| Floorplan (haydenschmitty/floorplan, 5.8k★) | "An interactive, plain-English map of your codebase"; topics: codebase-visualization, architecture-diagram, onboarding, vibe-coding | map of your codebase, codebase visualization |
| DeepWiki | **blocked** (Vercel security checkpoint, reader proxy got empty shell) — not checked | – |
| graphify.dev / floorplan.dev | unrelated sites (productivity tool; floor-plan drawing) | – |

None of the tools uses "comprehension debt" or "cognitive debt" in title, description or topics. Tools converge on "understand your codebase", "knowledge graph", "map of your codebase", "code visualization", "AI code review".

## 6. GitHub topic usage (repo counts, 2026-11-21)

code-review 11,906 · knowledge-graph 11,355 · vibe-coding 8,300 · onboarding 1,948 · ai-code-review 1,123 · code-visualization 473 · architecture-diagram 336 · code-understanding 113 · code-comprehension 104 · codebase-visualization 94 · code-map 69 · software-visualization 52 · codebase-understanding 49 · deepwiki 47 · codebase-map 31 · program-comprehension 27 · code-knowledge-graph 16 · comprehension-debt 16 · cognitive-debt 10. Stopped by GitHub API rate limit before code-intelligence and awesome-list name searches.

## Blocked / not measured

- Google Trends time series for the second comparison (understand codebase, code comprehension, codebase visualization, code knowledge graph): 429. Trends Oct–Nov 2026 data looks broken.
- No absolute monthly search volumes: no free keyword-volume source tried successfully (fetchira browser had no account; Ahrefs/Glimpse/Exploding Topics not read). Numbers above are relative.
- Reddit totals: API 403; only top-20 search samples.
- DeepWiki homepage title: Vercel checkpoint.
- GitHub topic counts for code-intelligence and awesome-list search: rate limit.
