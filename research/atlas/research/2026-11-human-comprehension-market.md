# Seeing only what is needed to decide: market scan

Question: is there room for a public curated list about tools and evidence that help a **person** understand a codebase or a code change and decide faster (how the app fits together, what the agent just changed, merge or not, what breaks if X changes)? Scan of 2026-11-21, three parallel agents; raw reports in [human-comprehension-market/](human-comprehension-market/): [lists](human-comprehension-market/lists.md), [demand](human-comprehension-market/demand.md), [candidates](human-comprehension-market/candidates.md).

## Verdict

The list niche is open, demand is strong, and evidence is the missing piece. Nobody has measured whether a code map or a change walkthrough makes a person decide faster **and** more correctly.

## Supply: lists and catalogs

- No awesome-list or catalog is organised around a person making a decision. Of 7 example tools (Floorplan, Understand-Anything, Archify, DeepWiki, Google Code Wiki, CodeRabbit walkthroughs, CodeGraph), no list holds more than 5.
- Code-review lists cover only bots. joho/awesome-code-review has 5.2k stars and no push since 2024-09.
- "Codebase intelligence" lists are dead, with 2 and 4 stars.
- Agent-tooling lists hold the map tools, but as context for the agent. jqueryscript/awesome-claude-code (555 stars) holds 5 of 7.
- sindresorhus/awesome has no sublist for code visualization or comprehension.
- The closest editorial frame is a one-off article, not a list: Jordanovski, [Four bets on understanding code your AI wrote](https://medium.com/@martin.jordanovski/archify-vs-graphify-vs-understand-anything-vs-codebase-memory-mcp-four-bets-on-understanding-code-88703e8ad3f5) (Medium, 2026-11). It sorts tools by who reads the map (a person or the agent) and who reads the code (a parser or the LLM). It ends with a caveat: there is no independent evidence the tools work.

## Demand

- **Tools.** Star counts checked through the GitHub API on 2026-11-21:

  | Tool | Stars | Created |
  |---|---|---|
  | Graphify | 151k | 2026-04 |
  | Understand-Anything | 93k | 2026-03 |
  | CodeGraph | 78k | 2026-01 |
  | codebase-memory-mcp | 49k | 2026-02 |
  | GitNexus | 49k | 2025-08 |

  Floorplan has 5.8k stars in 25 days, at about 1.2–2.2k a week, and has no HN story.
- **Hacker News.** 7 threads of 200+ points are about the problem itself:
  - "Comprehension debt": 532 points, 338 comments, 2025-09-30 (re-checked);
  - "AI agents shifted the bottleneck to code review": 328 points, 464 comments, 2026-11-17.
- **What HN thinks of maps:** sceptical.

  | Thread | Top-level comments | What they say |
  |---|---|---|
  | Harvard, code review bottleneck | 0 of 104 | name a map or diagram tool |
  | Understand-Anything | 11 of 19 | hostile: hairball, do the understanding yourself, fake stars |
  | DeepWiki | 10 of 36 | output is wrong |

- People who build with AI and do not read code ask for exactly this: "show me my product, not my code".
- **The words people use:** comprehension debt, cognitive debt, lost the mental model, drowning in AI PRs, diffs show implementation, not intent.
- **What people do today:** ask the agent to explain or draw Mermaid, keep ARCHITECTURE.md, open smaller PRs, run AI reviewers. Named map tools come last.

## Evidence

None of the 21 candidates read at source measures human decision speed together with correctness. The human-side numbers that exist:

| Finding | Number | Limits |
|---|---|---|
| AI-written PR summaries, Copilot for PRs ([FSE 2024](https://dl.acm.org/doi/10.1145/3643773)) | review 19.3 h shorter, 1.57× likelier to merge | observational, early adopters, no correctness measure |
| PR description does not match the code ([MSR'26](https://arxiv.org/html/2601.04886v2)) | 1.7% of 23,247 agent PRs; accepted 28.3% vs 80.0%; merge 3.5× slower | a description, not a map |
| [Habituation at the Gate](https://arxiv.org/html/2606.22721v1) | approval of agent PRs 30.1% → 36.8%; inline comments −22% | scrutiny falls with no tool at all |
| [One hands-on comparison](https://dev.to/yahhi/i-ran-3-claude-code-architecture-diagram-tools-on-my-repo-heres-what-each-one-got-right-110n) (dev.to, 2026-11) | Floorplan, Archify, Understand-Anything on one 166-file app; user flows from two tools wrong in 2 places | one app, one author |

For agents, [S14](../areas/s14-codebase-comprehension.md) already shows maps and context files do not raise correctness.

## What follows

- Another list of links would be the fourth place that already holds the same tools. What no one has: **an evidence level on every entry, and sections by the decision a person is making**.
- The format alone does not bring readers: see the sandbox matrix with 32 stars in 4 months. A list needs an outside hook. The cheapest hook the data points to is an own measurement: run 3–4 map tools on one open repository against 10 questions with known answers, and count right and wrong answers and cost.

## Not covered

- **Lists:** GitLab, newsletters and VISSOFT academic surveys were not searched.
- **Web search:** Exa was out of credits; web search ran through the default router and Tavily.
- **Stars over time:** GitHub stargazer timestamps were blocked, so weekly star rates come from star-history charts and dated articles.
- **Reddit:** dates are estimated from post IDs, ±1–2 months.
- **Studies:** four of six were read as abstracts only.
