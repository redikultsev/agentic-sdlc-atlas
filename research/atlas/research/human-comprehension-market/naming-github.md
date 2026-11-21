# Naming a curated list on code understanding: GitHub-side data

Collected 2026-11-21 via `gh api` (REST search, 30 req/min limit, ~2.3–3 s sleep between calls; one rate-limit hit, retried). All counts are `total_count` from GitHub repository search on that day. Raw dumps: `data/*.json`, `top150.tsv`, `new200.tsv`, `topics.tsv`, `terms.tsv`, `classify.out`, `bestmatch.txt`, `nearby2.txt` in this scratchpad folder.

## Not verified / gaps (read first)

- Pattern classification is a regex heuristic (`classify.py`), not hand-coded. Borderline cases: `awesome-design-md` and `awesome-agent-skills` landed in "field noun" though they are close to ecosystem/product names. Treat shares as ±10 pp.
- Search `total_count` for phrases (`"code map" in:name,description`) is GitHub's tokenised phrase match; it is not an exact substring count, and it includes forks-excluded originals only.
- Growth ratios are not normalised for overall GitHub repo growth (no baseline measured). Read ratios relative to each other, not as absolute growth.
- GitHub does not document the best-match ranking formula. The ranking section below combines the documented scope rules with a 3-query empirical probe.
- DeepWiki itself (deepwiki.com, a hosted product) has no public repo; `AsyncFuncAI/deepwiki-open` was used as a proxy. The hosted site was not read.
- `Lum1104/Understand-Anything` now redirects to `Egonex-AI/Understand-Anything`.
- No search-engine (Google) or GitHub traffic data: "supply" here means how many repos use a term, not how many people search for it.

## 1. How successful curated lists are named

Samples: top 150 of `awesome in:name` by stars (all time); top 200 of `awesome in:name created:>2025-01-01` by stars (2025–2026 cohort; total matching 49,279); top 200 of `topic:awesome-list` by stars (to catch non-"awesome" names; topic total 19,569).

### Pattern counts

| Sample | pattern | n | share | median stars | examples |
|---|---|---|---|---|---|
| All-time top 150 | awesome-<tool/product> | 71 | 47% | 27,367 | awesome-python, awesome-go, awesome-selfhosted |
| | awesome-<field noun> | 58 | 38% | 22,695 | awesome-llm-apps, awesome-machine-learning |
| | awesome-<problem/outcome> | 19 | 12% | 27,881 | awesome-for-beginners, awesome-interview-questions, awesome-scalability, awesome-production-machine-learning |
| **2025–26 top 200** | **awesome-<field noun>** | **105** | **52%** | **1,491** | awesome-agent-skills, awesome-harness-engineering, awesome-agentic-patterns, awesome-reverse-engineering |
| | **awesome-<tool/product>** | **79** | **39%** | **2,468** | awesome-claude-code (58.5k), awesome-claude-skills (80k), awesome-openclaw-skills, awesome-copilot |
| | awesome-<problem/outcome> | 15 | 7% | 1,499 | awesome-ai-research-writing (36k), awesome-free-llm-apis |
| | non-awesome (in this sample) | 1 | 0% | 2,302 | code-review-skill |
| topic:awesome-list top 200 | field noun | 76 | 38% | 11,194 | |
| | tool/product | 56 | 28% | 23,219 | |
| | **non-awesome names** | **51** | **25%** | **13,608** | build-your-own-x, the-book-of-secret-knowledge, free-for-dev, public-api-lists, static-analysis |
| | problem/outcome | 16 | 8% | 23,631 | |

Sub-cohorts of 2025–26: names with agent/skill/plugin: 54 lists, median 2,467★; `awesome-ai-*`/`awesome-llm-*` compounds: 24, median 1,574★; prompts/images/videos: 20, median 2,385★.

Reading: in 2025–26 the biggest lists ride a product name (Claude Code, Codex, OpenClaw, Copilot) — highest median. Field nouns are the most common pattern but lower median. Problem/outcome names are rare (7%) but not weaker. A quarter of the strongest topic-tagged lists drop "awesome" entirely and use a phrase (build-your-own-x, free-for-dev).

### Name shape

| Sample | median length (chars) | words after `awesome-` (1 / 2 / 3+) | median ★ by words (1 / 2 / 3+) | ends in plural -s |
|---|---|---|---|---|
| All-time top 150 | 18 | 72 / 59 / 19 | 27.4k / 23.7k / 26.7k | 50/150 (33%) |
| 2025–26 top 200 | 21 | 37 / 98 / 65 | 1.2k / **2.2k** / 1.9k | 89/200 (45%) |
| topic:awesome-list 200 | 18 | 91 / 60 / 49 | 14.2k / 15.8k / 13.8k | 69/200 (35%) |

New lists are longer: two words after the prefix is the modal and best-median shape; 3+ words is common (65/200) and not penalised. Plural nouns are rising (45% in the 2025–26 cohort: skills, agents, plugins, prompts, maps).

### Description and topics

| Sample | description says curated/collection/list/directory/catalog | description contains the name phrase | topics contain the name phrase | has any topic | has awesome/awesome-list topic |
|---|---|---|---|---|---|
| All-time top 150 | 108 (72%) | 86 (57%) | 85 (57%) | 132 (88%) | 109 (73%) |
| 2025–26 top 200 | 116 (58%) | 80 (40%) | 70 (35%) | 155 (78%) | 102 (51%) |

Evidence/quality wording in 2025–26 descriptions ("evidence-led", "verified", "rated", "source-backed/linked", "benchmarks", "reviewed", "honest", "non-BS"): 12/200, e.g. awesome-decomp-games ("Rated, auto-refreshed"), awesome-seedance ("Evidence-led … traced to original posts"), Awesome-CUA ("source-backed catalog"), awesome-jev ("verified"), awesome-evals ("non-BS"), awesome-claude-code-mods ("what each one can access before you install it"). Evidence-level framing is a visible but uncrowded differentiator.

## 2. How GitHub search ranks repos

Documented (docs.github.com, "Searching for repositories"): the `in:` qualifier restricts to name, description, topics, README. **"When you omit this qualifier, only the repository name, description, and topics are searched."** README text is only searched with explicit `in:readme`. The default sort is "best match" (docs "Sorting search results"); the formula is not published. Topic pages (`github.com/topics/X`) list repos tagged with the topic, sorted by stars by default.

Implication: words in name, description and topics are what default repo search sees; README wording does not help default search at all.

Empirical probe (default best-match, top 10):

| query | what ranked | reading |
|---|---|---|
| `code comprehension` | ycmd, CodeCompass, triviaqa, reading-comprehension ML repos | dense term: token match + stars dominate; NLP "reading comprehension" repos pollute it |
| `codebase visualization` | adrenaline, codag-visualizer, mindwalk, gitdiagram (19k), archify (98k), CodeBoarding | stars dominate; none of the top 10 had the exact phrase in name |
| `comprehension debt` | raven, accountable-review, then six 0-star repos named `comprehension-debt*` | sparse term: an exact name match reaches the top 10 with 0 stars |

So: on a sparse term the name wins outright; on a dense term, stars win and the name only helps after the list has stars.

### Topics (repo counts, `topic:X`)

| topic | repos | | topic | repos |
|---|---|---|---|---|
| claude-code | 125,361 | | codebase | 463 |
| developer-tools | 95,420 | | code-graph | 382 |
| awesome-list | 19,569 | | architecture-diagram | 336 |
| awesome | 12,989 | | codebase-analysis | 331 |
| static-analysis | 12,659 | | code-understanding | 113 |
| code-review | 11,906 | | code-comprehension | 104 |
| knowledge-graph | 11,355 | | codebase-visualization | 94 |
| vibe-coding | 8,299 | | code-map | 69 |
| code-analysis | 2,828 | | software-visualization | 52 |
| pull-request | 1,703 | | codebase-understanding | 49 |
| ai-code-review | 1,123 | | program-comprehension | 27 |
| code-intelligence | 954 | | comprehension-debt | 16 |
| code-visualization | 473 | | cognitive-debt | 10 |
| | | | code-maps | 1 |

## 3. Supply per term (`"<term>" in:name,description`)

"Last 6 mo" = created 2026-05-21..2026-11-21; "Year earlier" = created 2025-05-21..2025-11-21 (same-length window); ratio = last 6 mo / year earlier.

| term | all time | last 6 mo | year earlier | ratio | share of all-time made in last 6 mo |
|---|---|---|---|---|---|
| code review | 64,968 | 20,568 | 6,508 | 3.2× | 32% |
| vibe coding | 61,982 | 26,296 | 10,010 | 2.6× | 42% |
| ai code review | 10,880 | 4,819 | 1,487 | 3.2× | 44% |
| architecture diagram | 4,298 | 1,824 | 406 | 4.5× | 42% |
| ai generated code | 2,285 | 1,065 | 251 | 4.2× | 47% |
| **code intelligence** | 2,097 | 1,226 | 86 | **14.3×** | 58% |
| code graph | 1,855 | 978 | 110 | 8.9× | 53% |
| code map | 1,472 | 482 | 156 | 3.1× | 33% |
| understand code | 1,077 | 262 | 152 | 1.7× | 24% |
| code visualization | 965 | 207 | 138 | 1.5× | 21% |
| explain code | 903 | 317 | 136 | 2.3× | 35% |
| **codebase intelligence** | 754 | 507 | 11 | **46×** | 67% |
| code comprehension | 339 | 73 | 25 | 2.9× | 22% |
| codebase understanding | 246 | 139 | 13 | 10.7× | 57% |
| understand codebase | 192 | 97 | 17 | 5.7× | 51% |
| codebase onboarding | 176 | 120 | 1 | 120× | 68% |
| **codebase map** | 147 | 110 | 2 | **55×** | 75% |
| codebase visualization | 105 | 40 | 6 | 6.7× | 38% |
| agent pull request | 86 | 73 | 1 | — | 85% |
| codebase knowledge graph | 80 | 60 | 1 | 60× | 75% |
| cognitive debt | 45 | 26 | 3 | 8.7× | 58% |
| comprehension debt | 26 | 18 | 0 | new | 69% |
| review ai pull requests | 1 | 1 | 0 | — | — |

Reading: biggest supply is in review/vibe-coding words (tens of thousands). Fastest-rising mid-size terms are "codebase …" compounds: codebase intelligence, codebase map, codebase understanding, codebase onboarding, codebase knowledge graph — mostly born in the last 6 months. "Code comprehension"/"code visualization" are older and flat (≈22% recent share), and "code comprehension" collides with NLP reading-comprehension repos in search. "Comprehension debt"/"cognitive debt" are tiny but new.

### Existing awesome lists near the niche (name collisions)

| query (`in:name`) | total | strongest hits |
|---|---|---|
| awesome code review | 27 | joho/awesome-code-review 5,193★ (last push 2024-09); kodustech/awesome-ai-code-review 54★ |
| awesome ai code review | 7 | kodustech 54★; ianwieds/awesome-ai-code-review 2★; awesome-ai-code-review-tools 2★ |
| awesome vibe coding | 68 | filipecalegario/awesome-vibe-coding 5,454★; awesome-vibe-coding/awesome-vibe-coding 897★ |
| awesome code intelligence | 6 | QiushiSun/Awesome-Code-Intelligence 281★ (academic neural-code survey); glue-tools-ai/**awesome-codebase-intelligence** 4★ |
| awesome codebase | 26 | alan2207/awesome-codebases 1,014★ (codebases to read, not tools) |
| awesome code visualization | 1 | Awesome-Code-Visualization-Platform 1★ |
| awesome code understanding | 0 | — |
| awesome code comprehension | 1 | unrelated (referring-expression NLP) |
| awesome code map | 0 | — |
| awesome code graph | 1 | unrelated |
| awesome pr review | 17 | awesome-code-review-prompts 33★, awesome-ai-pr-review 4★ |
| awesome review (created 2025+) | 78 | baz-scm/awesome-reviewers 155★ (review prompts) |

## 4. Words the analogues use

| repo | ★ | created | description / tagline | topics (selected) | first H1/H2 |
|---|---|---|---|---|---|
| haydenschmitty/floorplan | 5,793 | 2026-10-27 | "See how your app actually fits together. An interactive, plain-English map of your codebase, drawn by Claude or Codex." | ai-coding, architecture-diagram, claude-code, codebase-visualization, developer-tools, onboarding, vibe-coding | # Floorplan; ## Why Floorplan?; ## Floorplan, Archify or Understand Anything? |
| Egonex-AI/Understand-Anything | 93,497 | 2026-03-15 | "Graphs that teach > graphs that impress. Turn any code into an interactive knowledge graph you can explore, search, and ask questions about." | codebase-analysis, knowledge-graph, knowledge-base, understandcode, vibe-coding, claude-code | H1 Understand Anything; ## Features; ## Quick Start |
| Graphify-Labs/graphify | 151,402 | 2026-04-03 | "Turn any codebase … into a queryable knowledge graph … every edge explained" | code-analysis, code-search, knowledge-graph, graphrag, developer-tools, claude-code | ## See it in action; ## What it does; ## When to reach for Graphify; ## Benchmarks |
| colbymchenry/codegraph | 78,280 | 2026-01-18 | "Pre-indexed code knowledge graph … fewer tokens, fewer tool calls, 100% local"; H3 "… with Semantic Code Intelligence" | (none) | # CodeGraph; ## Get Started |
| DeusData/codebase-memory-mcp | 48,970 | 2026-02-24 | "Local code intelligence for developers and AI agents … change-aware test selection" | code-intelligence, code-analysis, knowledge-graph, graph-visualization, mcp | # codebase-memory-mcp: local code intelligence for AI agents via MCP |
| abhigyanpatwari/GitNexus | 48,709 | 2025-08-02 | "The Zero-Server Code Intelligence Engine"; README: "indexes a codebase into a knowledge graph" | (none) | # GitNexus; ## What you can do |
| tt-a1i/archify | 98,464 | 2026-04-15 | "Turn any idea, plan, or codebase into a beautiful interactive diagram."; H3 "Turn anything you want to understand, plan, or share into an interactive visual." | architecture-diagram, diagrams, software-architecture, system-design, visualization | ## See Archify in action; ## Ask a question, get a one-page answer |
| wyeworks/accountable-review | 42 | 2026-08-26 | "A Claude Code plugin to deal with comprehension debt. Turns a pull request into a published HTML review map a reviewer can read before judging the change."; tagline "AI-assisted code review for teams that want to move faster with coding agents without losing control of their codebase." | (none) | H1 logo; ## Motivation; ### Comprehension debt; ## What is a Review Map? |
| AsyncFuncAI/deepwiki-open (DeepWiki proxy) | 18,469 | 2025-04-30 | "AI-Powered Wiki Generator for GitHub/Gitlab/Bitbucket Repositories" | ai, wiki, self-hosted | # DeepWiki-Open (Grok-Wiki) |

Repeating noun phrases (count of the 9):
- **knowledge graph** — 5 (Graphify, codegraph, codebase-memory-mcp, GitNexus, Understand-Anything)
- **interactive** map/graph/diagram/visual/wiki — 5 (Floorplan, Understand-Anything, Archify, DeepWiki, accountable-review's HTML map)
- agent roster "Claude Code, Codex, Cursor, …" — 7
- **code intelligence** — 3 (codebase-memory-mcp, GitNexus, codegraph)
- **"Turn any codebase/code/idea into …"** — 3 (Graphify, Understand-Anything, Archify)
- **understand** (verb) — 3 (Understand-Anything, Archify H3, Floorplan "to understand and check an app you own")
- **map** — 2 (Floorplan "map of your codebase", accountable-review "review map")
- **comprehension debt** — 1 (accountable-review, citing Addy Osmani)

Tools speak in "knowledge graph / code intelligence" (machine-facing, for agents). The person-facing ones (Floorplan, Archify, accountable-review) speak in "see how it fits together / understand / map / review before judging". That person-facing vocabulary is the gap a list for humans can own.

## 5. Name ideas the data supports

| name | free? (`in:name` search) | supply / growth behind it | risk |
|---|---|---|---|
| **awesome-code-understanding** | 0 lists | topics code-understanding 113 + codebase-understanding 49; "codebase understanding" 10.7×, "understand codebase" 5.7×; analogues' own verb | generic, not AI-specific; say AI/agent PRs in description |
| **awesome-codebase-maps** | 0 (`awesome code map`) | "code map" 1,472; "codebase map" 55× (75% born in 6 mo); Floorplan and accountable-review say "map"; plural fits 2025–26 trend | narrows to visual tools; PR-review tools fit less |
| awesome-understanding-ai-code | 0 | "ai generated code" 2,285, 4.2×; "understand code" 1,077 | 3 words, fine per cohort (3+ words median 1.9k★) |
| awesome-comprehension-debt | 0 lists (repos with the term: 26) | sparse → name match ranks top-10 at 0★; 0 → 18 repos year-on-year; term has a known origin article | tiny search supply; jargon to newcomers |
| awesome-ai-code-review-evidence / awesome-reviewing-agent-prs | not checked by name search | "ai code review" 10.9k (largest pool) but awesome-ai-code-review is taken ×4 | crowded; evidence angle is the differentiator |
| non-awesome phrase, e.g. `merge-or-not`, `read-the-diff` | not checked | 25% of top topic:awesome-list repos skip "awesome" | no search term in the name; relies on topics + description |

Avoid: awesome-codebase-intelligence (taken, glue-tools-ai, 4★); awesome-code-intelligence (taken, academic 281★); awesome-code-comprehension (term collides with NLP reading-comprehension in search; flat growth 2.9×, 22% recent share).

Packaging the search phrases regardless of name: description should contain the hot phrases verbatim (only ~40% of the 2025–26 top lists do this — cheap edge): "understand a codebase", "AI code review", "agent pull requests", "comprehension debt", "evidence level". Topics (max 20): awesome-list, awesome, code-review (11.9k), ai-code-review (1.1k), vibe-coding (8.3k), claude-code (125k), developer-tools, code-understanding, codebase-understanding, code-comprehension, codebase-visualization, code-visualization, architecture-diagram, code-map, knowledge-graph, code-intelligence, comprehension-debt, cognitive-debt, pull-request.
