# Demand scan: understanding code you did not write (AI-written apps, agent PRs)

Scan date: 2026-11-21. Window: 2025-01-01 to 2026-11-21.

## Not verified / caveats (read first)

- **GitHub stargazer timestamps are unavailable.** `gh api .../stargazers` (REST, star+json) returns 404 for every repo tried, and GraphQL `stargazers` returns `totalCount: 0`. Star velocity below comes from **star-history.com SVG charts** (line read back into numbers) plus star counts quoted in dated third-party articles. Treat weekly numbers as +-10%.
- **Understand-Anything has no star-history chart** (the API returned an empty file twice). Its trajectory is rebuilt only from dated article quotes.
- **Star counts are not users.** In the HN Understand-Anything thread, 2 of 19 top-level comments say outright that the stars are fake. Archify (~98k) and Understand-Anything (~93k) are far above every other tool in this space. Nobody here audited stars.
- **Reddit post dates are estimates.** reddit.com JSON and old.reddit both refused access (login wall / failed). Dates come from the post's base-36 ID, interpolated between two anchor posts. Error is about +-1-2 months. HN dates are exact (Algolia `created_at`).
- **Fetchira:** the `exa` provider was out of credits and `serper` rejected the queries ("Query pattern not allowed for free accounts"). Reddit and blog searches went through fetchira's default router. WebSearch was not used.
- The HN keyword counts are regex counts over comment text. The theme counts for the big threads are my own manual coding of the top-level comments (I read the first 45 of 104 and 45 of 77), so they are judgement, not measurement.

## 1. How strong is demand: summary

| Signal | Measured |
|---|---|
| Largest HN thread on the *problem* | "Comprehension debt: a ticking time bomb of LLM-generated code", 532 pts, 338 comments, 2025-09-30 |
| HN threads >= 200 points on the problem (cognitive/comprehension debt, review bottleneck) | 7 since 2025-06 (sum ~3,300 pts, ~2,400 comments) |
| Largest HN thread on a *tool* for human comprehension | Whiteboard (YC W26), 424 pts, 143 comments, 2026-09-24 |
| HN stories matching "comprehension debt" (2025+) | 36 hits; "cognitive debt" 170 hits |
| Fastest-growing human-facing comprehension repos | Archify ~98.5k stars in 7 months; Understand-Anything ~93.5k in 8 months; Floorplan ~5.8k in 25 days |
| Floorplan weekly star rate | ~2.2k (week 1), then ~1.15k and ~1.3k per week. **Not decaying** as of 2026-11-17 |
| Head-to-head comparisons found | 1 hands-on test (dev.to, ~2026-11-06), 1 vendor comparison (backthread.dev, 2026-09-07), 2-3 vendor/SEO roundups |

My read (opinion): demand for the *problem* is strong and has lasted since Sept 2025 (Gorman's "comprehension debt" post). In 2026 it moved from think-pieces to tooling: three agent-skill or plugin tools went viral in 6 months. Practitioners on HN are skeptical of graph/diagram tools. Reddit's non-technical vibe coders are the most explicit about wanting them ("show me my product, not my code").

## 2. Hacker News (Algolia API, stories since 2025-01-01)

### Top stories by points, per theme

**The problem: comprehension / cognitive debt**

| Pts | Comments | Date | Title |
|---|---|---|---|
| 710 | 511 | 2026-01-21 | Your brain on ChatGPT: accumulation of cognitive debt (MIT Media Lab) — essays, not code |
| 545 | 443 | 2026-08-03 | [Prevent cognitive debt by manually retyping LLM-generated code](https://ankursethi.com/blog/prevent-cognitive-debt-by-manually-retyping-llm-gene) |
| 532 | 338 | 2025-09-30 | [Comprehension debt: a ticking time bomb of LLM-generated code](https://codemanship.wordpress.com/2025/09/30/comprehension-debt-the-ticking-time) (HN [45423917](https://news.ycombinator.com/item?id=45423917)) |
| 507 | 223 | 2026-02-28 | [Cognitive Debt: When Velocity Exceeds Comprehension](https://www.rockoder.com/beyondthecode/cognitive-debt-when-velocity-exceeds-comp) (HN [47196582](https://news.ycombinator.com/item?id=47196582)) |
| 224 | 144 | 2026-05-05 | [What I'm Hearing About Cognitive Debt (So Far)](https://margaretstorey.com/blog/2026/02/18/cognitive-debt-revisited/) — M.-A. Storey |
| 135 | 129 | 2026-02-18 | What is happening to writing? Cognitive debt, Claude Code |
| 6 | 3 | 2026-04-14 | [Comprehension Debt: The Hidden Cost of AI-Generated Code](https://www.oreilly.com/radar/comprehension-debt-the-hidden-cost-of-ai-generated) (O'Reilly; Addy Osmani's original is dated 2026-03-14) |

**The problem: review bottleneck**

| Pts | Comments | Date | Title |
|---|---|---|---|
| 351 | 249 | 2026-01-26 | [There is an AI code review bubble](https://www.greptile.com/blog/ai-code-review-bubble) |
| 328 | 464 | 2026-11-17 | Harvard researchers find AI coding agents shifted the bottleneck to code review (HN [50538303](https://news.ycombinator.com/item?id=50538303)) |
| 221 | 108 | 2025-04-15 | Launch HN: mrge.io (YC X25) – Cursor for code review |
| 130 | 111 | 2026-04-16 | [Show HN: Stage – Putting humans back in control of code review](https://stagereview.app/) |
| 89 | 84 | 2025-09-17 | Ask HN: Is anyone else sick of AI splattered code |
| 88 | 59 | 2025-09-10 | [Show HN: Haystack – Review pull requests like you wrote them yourself](https://haystackeditor.com) |
| 94 | 33 | 2025-07-29 | [Show HN: A GitHub Action that quizzes you on a pull request](https://github.com/dkamm/pr-quiz) |
| 20 | 3 | 2025-11-23 | The New Stack: Is AI creating a new code review bottleneck for senior engineers? |

**Tools for human comprehension (maps, wikis, visualizers)**

| Pts | Comments | Date | Title |
|---|---|---|---|
| 424 | 143 | 2026-09-24 | [Show HN: Whiteboard (YC W26) – open-source IDE for thoughtful software design](https://github.com/devdotfast/whiteboard) (HN [49833867](https://news.ycombinator.com/item?id=49833867)) |
| 315 | 119 | 2025-11-04 | [Codemaps: Understand Code, Before You Vibe It](https://cognition.ai/blog/codemaps) (Cognition/Windsurf; HN [45813767](https://news.ycombinator.com/item?id=45813767)) |
| 265 | 68 | 2025-10-30 | [Show HN: heatmap diff viewer for code reviews](https://0github.com) |
| 263 | 62 | 2025-02-25 | Show HN: Tach – Visualize and untangle your Python codebase |
| 244 | 46 | 2026-02-20 | [Untapped Way to Learn a Codebase: Build a Visualizer](https://jimmyhmiller.com/learn-codebase-visualizer) |
| 231 | 53 | 2025-08-24 | DeepWiki: Understand Any Codebase |
| 169 | 127 | 2025-11-11 | [AI documentation you can talk to, for every repo](https://deepwiki.com/) (DeepWiki; HN [45884169](https://news.ycombinator.com/item?id=45884169)) |
| 169 | 49 | 2026-05-01 | [Understand Anything](https://github.com/Lum1104/Understand-Anything) (HN [47977470](https://news.ycombinator.com/item?id=47977470)) |
| 162 | 63 | 2026-07-12 | Show HN: Mindwalk – Replay coding-agent sessions on a 3D map of your codebase |
| 135 | 53 | 2026-01-13 | Show HN: Nogic – VS Code extension that visualizes your codebase as a graph |
| 45 | 23 | 2026-11-04 | Show HN: Codemap – one-page interactive map of any Go repository |
| 25 | 14 | 2026-07-09 | Show HN: Arcaide – explore code with multi-level call graphs |
| 24 | 9 | 2025-05-21 | Show HN: CodeBoarding – interactive map of your codebase for onboarding |
| 10 | 4 | 2026-02-06 | Show HN: Noodles – explore AI-generated codebases through interactive diagrams |
| 7 | 0 | 2026-08-11 | Show HN: Alchemize – Review AI Slop PRs Faster |

**Missing from HN:** no Floorplan story at all ("Floorplan", "floorplan codebase" and "haydenschmitty" all return nothing relevant). No Archify story (one 1-point "Archify" post on 2026-09-07). The two biggest repos in the space went viral off HN, through GitHub Trending, skills.sh, X and the Claude Code plugin channels.

### What commenters actually say (5 biggest relevant threads)

**A. Harvard "bottleneck shifted to code review", 2026-11-17, 464 comments, 104 top-level** (first 45 coded by hand)
- 13 of 45: "obvious / we knew this / needed Harvard for that?" (the pain is taken as given)
- 6 of 45: let AI agents review the code (multi-axis agent review, AI review then ship)
- 4 of 45: nobody reads PRs any more, or drop code review altogether
- 4 of 45: change *what* is reviewed: architecture, schema, risky paths, the prompts or spec, "continuous review of the whole system guided by heuristics"
- 3 of 45: first-person pain ("All I do all day is review AI written code... I really do not enjoy it", bigger MRs)
- 2-3 of 45: "test, don't review"
- **0 of 104** top-level comments name a visual map, diagram or codebase-understanding tool. Regex: "diagram/graph/visual" 1/104 top-level, 7 of 464 overall. CodeRabbit named once, Copilot once.

**B. "Comprehension debt" (Gorman), 2025-09-30, 335 comments, 77 top-level** (first 45 coded)
- 7 of 45: AI will get better, or code becomes write-only/regenerated, so the debt does not matter
- 6 of 45: not new: Naur's "theory building", offshore teams, interns (the top comment, 111 replies)
- 5 of 45: first-hand pain (20k LOC Next app in a month, a non-technical manager's PR that "appeared to work")
- 4 of 45: LLMs help me *understand* code ("how is this code organized", "where does X happen")
- 3 of 45: fix with tests, standards and small modules
- Regex: "understand/comprehen" 34/77 top-level. Tools named: Claude Code 5/77, Cursor 1, DeepWiki 1 (overall). "diagram/graph/visual" 1/77.

**C. Cognition "Codemaps: understand code before you vibe it", 2025-11-04, 116 comments, 26 top-level**
- 7/26 discuss Windsurf/Codemaps itself. Positive: "the right way to tackle this problem", a request for a GitHub Action that regenerates the map on major PRs.
- Skeptical 4/26: no business context ("AI will never know the why"), trust ("if it's wrong your understanding is worse than none"), "So we're back to UML?", a Fortune-500-only fit.
- 3/26 say they already do it with Claude + Mermaid ("just a diagram, no links to the actual code").
- 1/26 notes Codemaps is also in DeepWiki.

**D. DeepWiki "AI documentation you can talk to", 2025-11-11, 127 comments, 36 top-level**
- Negative on accuracy 10/36: the top comment (58 replies) says it is wrong in every section of the poster's own project, plus "diagrams make no sense", "untrustworthy AI slop", "it kept calling everything sophisticated". 3 more blocked the domain in Kagi or DDG search.
- Positive 7/36: "invaluable" on the neondatabase/neon repo, "works pretty well", "great improvement for getting oriented".
- "Why not just ask Claude Code/Codex" 2/36. Access failures (captcha, repo not found) 3/36.

**E. "Understand Anything", 2026-05-01, 48 comments, 19 top-level**
- Hostile or skeptical 11/19: understanding needs your own effort (4), a graph is a pretty hairball like Obsidian's graph view (4), fake stars or vibe-coded (3).
- "What evidence vs just using Claude Code/Codex?" 2/19. "Code graph tools are still navigation tools" 1/19.
- At the time a commenter cited "9.7k" stars.

**F. Whiteboard (YC W26), 2026-09-24, 143 comments, 60 top-level** (first 40 coded)
- Platform or packaging asks 9/40 (Windows, Linux, web, Copilot support, edit files).
- Diagram drifts from code / another source of truth 3/40. Accuracy of a generated diagram 1/40. Data upload to an authoring server 1/40.
- Review pull 3/40: "link to and comment on GitHub PRs — this would be a sweet reviewing tool"; "I review a lot of code these days and it's really hard to understand what changes about and why"; "anything that makes it easier to review generated code".
- Named alternatives: LikeC4, erode.dev (C4), Markdown + Mermaid.

**Pattern across threads (opinion):** HN agrees the problem exists (a 500+ point thread every few months). It is mostly skeptical of AI-generated maps, for three reasons: (1) accuracy and trust, (2) drift, (3) "understanding can't be outsourced". The pull toward *review* use (a map of what a PR changed) shows up in 3-4 places.

## 3. Reddit (via fetchira default router; dates estimated from post ID, +-1-2 mo)

### Vibe coders who don't understand their app (r/vibecoding, r/Anthropic, r/lovable, r/indiehackers)
- [Built a 100% AI coded web app... I don't understand the code, can I deploy?](https://www.reddit.com/r/vibecoding/comments/1nkw1ga/) (~2025-09). Has 30 beta users. "I cannot realistically read or understand my own code."
- [I've accepted that I'll never understand my own vibe-coded apps](https://www.reddit.com/r/vibecoding/comments/1r06y36/) (~2026-02). "Claude did something with tokens and it... works?"
- [How do you keep up the mental model of your vibe coded projects?](https://www.reddit.com/r/vibecoding/comments/1r7totv/) (~2026-02). The clearest statement of the need: **"show me my product, not my code. Translate the codebase into features, user flows, business logic, edge cases — in plain English."** Also: "Everything out there is either made for devs (Cursor, Windsurf) or way too simplified (Lovable, Bolt)."
- [I vibe coded an App and it's making 400$/month... need help with documentation](https://www.reddit.com/r/Anthropic/comments/1srlmf4/) (~2026-04). "60% is like a black box."
- [vibe coded for 6 months. my codebase is a disaster](https://www.reddit.com/r/vibecoding/comments/1su03dk/) (~2026-04). A hired dev "went quiet for like 2 minutes".
- [Best way to study your vibe-coded app well enough to confidently present it?](https://www.reddit.com/r/vibecoding/comments/1woiutt/) (~2026-09 to 11). Advice given: trace one request flow and draw it, an ERD, a PRD.
- Sellers say the same thing from the other side: r/lovable "nobody understands what it's actually doing" (agency post); Pagepro reports 27 audited AI codebases.

### Review overload (r/ExperiencedDevs, r/EngineeringManagers, r/ClaudeCode, r/cscareerquestions, r/codereview)
- [AI slop PRs are burning me and my team out hard](https://www.reddit.com/r/ExperiencedDevs/comments/1kr8clp/) (~2025-05). Team of 6, ~30 PRs/day, 5k-10k LOC PRs, an AuthZ bypass hidden behind mocked tests.
- [AI made writing PRs faster. Reviewing them is now my bottleneck](https://www.reddit.com/r/ClaudeCode/comments/1u93fnp/) (~2026-06). **"The slow part was never reading the code. It's understanding what the author was going for"**; "Diffs show implementation. They rarely show intent."
- [Nobody warned me the bottleneck with coding agents would be *me* reviewing their output](https://www.reddit.com/r/AI_Agents/comments/1usw0mu/) (~2026-07).
- [How do you handle code reviews when 1 dev uses AI to build a massive feature](https://www.reddit.com/r/ChatGPTCoding/comments/1w5f7ig/) (~2026-09). 10k+ lines across 50+ files; uses the phrase "AI Comprehension Debt".
- [Is code review irrelevant now?](https://www.reddit.com/r/ClaudeAI/comments/1wxy764/) (~2026-10). Mod-bot consensus: smaller PRs, AI first pass, review architecture and risk, make the author explain.
- [How do you prevent 90% of your day becoming code review](https://www.reddit.com/r/cscareerquestions/comments/1xgw7i8/) (~2026-10/11). "75 reviews in queue, only 5 of them are less than 1000 lines."
- [Team lead drowning in AI-generated PRs](https://www.reddit.com/r/EngineeringManagers/comments/1xkhxa3/) (~2026-11). A reply describes Greptile + AI risk scorer + AI review bot: "stopped doing human code reviews for 90% of PRs", 15 devs merging 100+ PRs/day.
- [Code review under AI-generated volume: what's actually breaking](https://www.reddit.com/r/EngineeringManagers/comments/1xvpirz/) (~2026-11). "Review bots mostly just add noise"; "What's breaking is re-verification... untangling a diff nobody on the team wrote."
- [Dealing with huge PR culture](https://www.reddit.com/r/ExperiencedDevs/comments/1tc4ufa/) (~2026-05). 300-file PRs.

### Developers losing the mental model (r/cursor, r/ExperiencedDevs, r/ClaudeCode)
- [Anyone else feel like they're slowly losing grip on their own codebase since using Cursor?](https://www.reddit.com/r/cursor/comments/1sxhzvz/) (~2026-04)
- [AI writes my code now. I have no idea why half of it is the way it is](https://www.reddit.com/r/cursor/comments/1tpd3da/) (~2026-05). Can't tell "whether something is load bearing or arbitrary".
- [As agents write more code, how do you maintain your mental model of the system?](https://www.reddit.com/r/ExperiencedDevs/comments/1sm7s9d/) (~2026-04). Answers: event flow, bounded contexts, planning.
- [i keep forgetting code i supposedly wrote last week](https://www.reddit.com/r/cursor/comments/1xgb4dz/) (~2026-10). The "coworker PR" feeling.
- [How do you guys maintain a large AI-written codebase?](https://www.reddit.com/r/ClaudeAI/comments/1plse94/) (~2025-12). Top advice: a human-owned ARCHITECTURE.md with Mermaid. One commenter uses Windsurf Codemaps and DeepWiki for review.

### Self-built tools posted on Reddit (counted as supply that signals demand)
Noodles (r/ClaudeAI ~2026-01; 1,362 stars), Sketchy (r/vibecoding ~2026-11; 492 stars), UnvibeCode (r/coolgithubprojects ~2026-08; 1,895 stars), CodeBoarding (2,692 stars), a React blast-radius graph (r/react ~2026-03), Repo Map (r/ClaudeCode ~2026-10, "monitoring for code bloat generated by coding agents"), a live file tree of what Claude touches (r/SideProject), Vxplain (VS Code), and an architecture-mapping plugin run on Anthropic's repos (r/ClaudeCode ~2026-10). Count: **at least 10 distinct tools in this search alone**, nearly all built with Claude Code.

### What people already use (from Reddit + HN comments, all mentions)
1. **Ask the agent to explain or draw** (Claude/Cursor + Mermaid flowcharts, "explain the diff in 3 lines", "a short tour of the module"). The most common answer by far.
2. **Markdown kept by the agent**: ARCHITECTURE.md, CLAUDE.md, SESSION.md, DECISIONS.md, per-module notes.
3. **Process**: smaller PRs, plan or spec review before code, risk-surface-only review, tests as the gate.
4. **AI reviewers**: Greptile, CodeRabbit, Copilot review, Claude Code Review, Graphite.
5. **Map/wiki tools by name**: DeepWiki, Windsurf Codemaps, Understand-Anything, CodeBoarding, Sourcegraph. Floorplan and Archify appear in articles, not in the Reddit/HN comments I read.

## 4. Viral signal: GitHub repos (measured 2026-11-21 via `gh api repos/...`)

| Repo | Created | Stars | Forks | Last push |
|---|---|---|---|---|
| [tt-a1i/archify](https://github.com/tt-a1i/archify) | 2026-04-15 | 98,461 | 6,728 | 2026-11-21 |
| [Egonex-AI/Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) (was Lum1104/) | 2026-03-15 | 93,494 | 7,958 | 2026-11-18 |
| [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus) (agent-facing code graph) | 2025-08-02 | 48,708 | 5,273 | 2026-11-21 |
| [AsyncFuncAI/deepwiki-open](https://github.com/AsyncFuncAI/deepwiki-open) | 2025-04-30 | 18,469 | 2,036 | 2026-11-15 |
| [haydenschmitty/floorplan](https://github.com/haydenschmitty/floorplan) | 2026-10-27 | 5,781 | 504 | 2026-11-16 |
| [devdotfast/whiteboard](https://github.com/devdotfast/whiteboard) | 2026-08-18 | 3,562 | 181 | 2026-11-21 |
| [CodeBoarding/CodeBoarding](https://github.com/CodeBoarding/CodeBoarding) | 2025-04-08 | 2,692 | 235 | 2026-11-17 |
| tach-org/tach | 2024-01-31 | 2,874 | 100 | 2026-10-29 |
| FinanceFlash/unvibecode | 2026-08-04 | 1,895 | — | — |
| cosmtrek/mindwalk | 2026-07-09 | 1,401 | 120 | 2026-08-10 |
| unslop-xyz/noodles | 2026-01-26 | 1,362 | — | — |
| nilbuild/diffity (review app) | 2026-03-16 | 917 | 70 | 2026-11-20 |
| ddkbs/sketchy | 2026-10-08 | 492 | — | — |

### Star velocity (from star-history.com charts; +-10%)

**Floorplan** (cumulative / gained that week):
2026-11-03: 2,201 (+2,201 first week) → 11-10: 3,355 (+1,154) → 11-17: 4,652 (+1,297) → chart end ~5,600, API 5,781 on 11-21.
Cross-check: explainx.ai says ">2,000 since Oct 27" on 2026-11-02; DLM Magazin says "~2,700" on 2026-11-04. **About 1.2-1.3k/week, flat, not decaying, 3.5 weeks in.** It reached GitHub Trending on 2026-11-02 (explainx).

**Archify** (biweekly):
05-13: 155 · 06-24: 1,456 · 07-22: 6,049 · 08-19: 13,545 · **09-02: 40,014 (+26.5k in 2 weeks)** · 09-16: 62,894 (+22.9k) · 09-30: 74,199 · 10-14: 83,170 · 10-28: 90,356 · 11-11: 95,840 · 11-21: 98,461.
Peak ~13k stars/week in early September 2026, now ~2.5-3k/week. Cross-checks: GearScope "5.7K to 12.8K in a month" (review 2026-08-15); Codearia "75k" (2026-09-04, does not match the chart's ~45k then); Beetlix 91,417 (2026-10-30). The README claims "130K+ installs on skills.sh".

**Understand-Anything** (no chart; dated quotes only):
~9.7k (HN comment, 2026-05-01) → 38.7k (r/WebAfterAI post, ~2026-05-26 by ID) → 81,712 (backthread.dev, 2026-09-07) → 93,494 (API, 2026-11-21).
That is ~29k in ~4 weeks around May (~7k/week), ~43k over the next ~15 weeks (~3k/week), then ~12k over the last 11 weeks (~1.1k/week). Trendshift #1 repository of the day (date not shown).

**Whiteboard:** 128 stars before launch → +1,914 in the week of the Show HN (2026-09-24) → +735 → +349 → ~60-100/week since. A classic HN spike that decays.

**Comparison (opinion):** Floorplan's first 3.5 weeks (~5.8k) are about Archify's first 4 months. Unlike Whiteboard, its weekly rate has not fallen after the launch spike. It reached that with **no HN story**. Its stated audience is "non-technical vibecoders", the same people as the r/vibecoding posts in section 3.

## 5. Head-to-head comparisons of human-facing comprehension tools

1. **[I ran 3 Claude Code architecture diagram tools on my repo](https://dev.to/yahhi/i-ran-3-claude-code-architecture-diagram-tools-on-my-repo-heres-what-each-one-got-right-110n)**, dev.to, early Nov 2026 (comments from Nov 6). Floorplan vs Archify vs Understand-Anything on one 166-file, five-repo app. This is the only hands-on, measured comparison found. Measured results:
   - Time to first result: Floorplan "a few minutes", Archify "about an hour" with 2 failed runs, Understand-Anything 14 min.
   - Cost: Understand-Anything $13.01 at API prices (732 nodes, 1,625 links, 16 helper agents).
   - Three known-answer questions: Floorplan 61 s, UA 91 s ($0.72), Archify-only agent 33 s ($1.18), no-map agent reading code 166 s. No tool made anything up. The no-map agent found an OAuth scope hole that all three maps missed.
   - Failure: Floorplan's flows and Archify's cards were "written from memory" and wrong in 2 places. Floorplan's traced "Request a new flow" fixed this: of 17 re-traced flows, 14 work, 1 partly, 1 untestable, and 1 had been failing silently.
   - The author also notes Floorplan's README has its own comparison table (Floorplan vs Archify vs Understand-Anything: what each answers and for whom). That table has no times, costs or screenshots.
2. **[DeepWiki alternatives for understanding your own codebase (2026)](https://backthread.dev/compare/deepwiki-alternatives)**, backthread.dev, verified 2026-09-07. Covers DeepWiki, Understand-Anything, Sourcebot, Unblocked and Backthread, with prices. Vendor-written (Backthread).
3. **[Best Tools to Understand a Legacy Codebase Fast](https://repowise.dev/blog/comparisons/best-tools-understand-legacy-codebase)**, repowise.dev, prices as of 2026-10-12. Covers Repowise, Sourcegraph, DeepWiki, CodeScene, Aider repo map and IDE call hierarchy. Vendor-written.
4. **[Codebase Intelligence Tools 2026: graphify, codegraph & more](https://pharaoh.so/blog/codebase-intelligence-tool-comparison-2026)**, pharaoh.so. Mostly agent-facing graphs, with a section on Understand-Anything. Vendor-written, undated in the snippet.
5. Lighter "how it differs" sections, not tests: knightli.com (2026-06-07: UA vs Sourcegraph / DeepWiki / Cursor); theroadtoenterprise.com (onboarding tiers); explainx.ai (2026-11-02, Floorplan vs similar).
- **Single-tool reviews:** Archify by GearScope (2026-08-15, hands-on, 4/5), Beetlix (2026-10-30), ThinhDA (archify 3.0.1, 20 crafted diagrams), Botmonster, Better Stack. Floorplan by DLM Magazin (2026-11-04, tested on RealWorld "Conduit", 82 files: found 18 frontend requests to 20 routes unaided).
- **Not found:** any independent comparison that includes Windsurf Codemaps, CodeBoarding or Whiteboard alongside Floorplan/Archify/UA. Also none that measures accuracy on more than one repo.

## 6. Words people use for the need

- **Named concepts:** "comprehension debt" (Gorman 2025-09-30; Osmani 2026-03-14), "cognitive debt" (MIT study; Storey), "cognitive surrender" vs "cognitive offloading" (Osmani/Wharton), "theory building" (Naur, cited as prior art), "AI slop PRs".
- **Builder phrasing (r/vibecoding):** "I don't understand my own code", "black box", "mystery box", "lost the mental model", "show me my product, not my code", "plain English", "what actually happens when a user clicks Save".
- **Engineer phrasing:** "the bottleneck shifted to review", "drowning in AI-generated PRs", "diffs show implementation, not intent", "rebuilding context", "load-bearing or arbitrary", "the coworker PR feeling", "losing grip on my codebase", "re-verification".
- **Tool taglines that match:** "See how your app actually fits together" (Floorplan), "Graphs that teach > graphs that impress" (UA), "Understand code, before you vibe it" (Codemaps), "Review the change, not the diff" (CodeBoarding), "Review pull requests like you wrote them yourself" (Haystack).

## 7. Measured vs opinion: quick separation

- **Measured:** HN points, comment counts and dates; regex mention counts; GitHub star counts and creation dates; star-history curves; counts quoted in dated articles; the dev.to author's timings and costs.
- **My coding (judgement):** the theme counts in section 2 (A-F).
- **Opinion (mine):** "demand is strong and sustained"; "HN is skeptical of maps"; "Floorplan has the strongest current momentum"; the inference that star counts in the 90k range may be inflated.

## Where I searched / where I did not

**Searched**
- HN Algolia API, stories since 2025-01-01, 25 queries: codebase visualization, code map, understand codebase, comprehension debt, vibe coding understand, review AI pull requests, code review bottleneck, DeepWiki, Floorplan, Understand Anything, architecture diagram from code, Show HN code visualization, AI code review, cognitive debt, vibe coded app, reviewing AI code, agent pull requests, codebase map, visualize codebase, understand code AI wrote, floorplan codebase, haydenschmitty, archify, Egonex, codebase diagram, onboarding codebase AI, too many pull requests AI, PR review AI slop, agent PRs.
- Full comment trees of 12 threads: 50538303, 45423917, 45813767, 49833867, 47196582, 47977470, 45884169, 48017298, 45760321, 47796818, 46605675, 47085425.
- GitHub REST `repos/` for 17 repos. star-history.com SVG for Floorplan, Archify, Whiteboard (Understand-Anything failed).
- Reddit via fetchira default router (4 queries, reddit.com domain): vibe-coded app understanding, AI PR review bottleneck, codebase visualization tools, Cursor mental model.
- Blogs and articles via fetchira: comprehension debt (12 results), tool comparisons (12), Floorplan (10), Archify (10). Read in full: the dev.to three-tool comparison.

**Did not search / could not**
- GitHub stargazer timestamps (API 404 / GraphQL 0). OSSInsight API errored.
- Reddit post metadata: scores, comment counts and exact dates (reddit JSON and old.reddit blocked). So Reddit has no upvote counts here.
- X/Twitter, LinkedIn, YouTube, Discord, Product Hunt, Lobsters, dev.to beyond one post, Hacker News comments outside the 12 threads, Google Trends, Stack Overflow survey data.
- r/programming specifically (no hits surfaced in the router results), and r/ClaudeAI or r/cursor beyond the top results.
- The exa provider (out of credits) and serper (free-tier query restriction).
- The Harvard paper itself (HN commenters link a PDF). Only the HN thread was read.
- skills.sh install counts and the Claude plugin marketplace install counts were not checked (only Archify's README claim of 130K+ installs).
