# Do I Still Understand My Code: candidates

Already in the list and not repeated here: rederive, understanding-map, mindwalk, How AI Impacts Skill Formation (arXiv 2601.20245), Cognitive Debt in the GenAI Era (arXiv 2610.37888), Addy Osmani "Comprehension debt" (Start Here), accountable-review, Showboat.

## Candidates

### Tools

- 🟡 [grokcheck](https://github.com/Tsadoq/grokcheck) - Open source. A Claude Code plugin that turns a change or an area of code into a browser lesson with locked checkpoint questions (predict the output, pick the buggy line, mutation quiz, fix a planted bug) and a closed-book final quiz that shows where your confidence was wrong. Missed questions come back after 1, 3, 7, 21 and 60 days. *Limits: no measurement that the quiz score tracks real understanding or that it changes later decisions.*
  - facts: stars 5, created 2026-09, pushed 2026-10, licence MIT | source opened: yes (README) | from: beyond lists (GitHub keyword search) | suggested sub-group: Tools
- 🟡 [codecall](https://github.com/GAURAV-1313/codecall) - Open source. A skill for Claude Code, Codex, Cursor and others: after the agent changes something, a short session on the 2 to 4 ideas behind it with two checks per idea and a receipt marking each idea "could explain" or "could not". Also traces one request file by file and runs debugging drills with a planted bug. *Limits: no evaluation; the receipt is self-graded by the same agent that wrote the code.*
  - facts: stars 16, created 2026-07, pushed 2026-10, licence MIT | source opened: yes (README) | from: beyond lists | suggested sub-group: Tools
- [Claude Code Explanatory and Learning output styles](https://code.claude.com/docs/en/output-styles) - Built-in modes. Explanatory adds short "Insight" blocks on why the code was written that way; Learning also leaves `TODO(human)` spots at real design decisions for you to write yourself. *Limits: the docs say a style is an instruction, not a guarantee; nothing is measured.*
  - facts: official Anthropic docs, not a repo | source opened: yes | from: beyond lists | suggested sub-group: Tools
- ⚪ [Interactive explanations](https://simonwillison.net/guides/agentic-engineering-patterns/interactive-explanations/) - Simon Willison. A worked pattern for paying down cognitive debt: ask the agent for a linear walkthrough, then for an animated explanation of the part that still does not click. *Limits: one worked example by one author.*
  - facts: chapter of the "Agentic Engineering Patterns" guide | source opened: yes | from: beyond lists | suggested sub-group: Tools (a practice, could also sit under Essays)

### What is measured

- 🟢 [Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task](https://arxiv.org/abs/2506.08872) - 2025. Measured on people: 54 participants wrote essays with an LLM, a search engine or no tool, under EEG. LLM users showed the weakest brain connectivity, the lowest sense of owning their essays and struggled to quote their own work; when switched to no tool in session 4 (18 people) they stayed under-engaged. *Limits: essays, not code; small session 4; a later comment paper (arXiv 2601.00856) critiques it.*
  - facts: arXiv, v2 2025-12, 216 pages | source opened: yes (abstract) | from: beyond lists | suggested sub-group: What is measured
- 🟢 [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089) - 2025. Measured on people: randomized trial, 16 experienced developers, 246 tasks in their own mature repos. With AI allowed tasks took 19% longer, while the same developers believed AI had made them 20% faster. *Limits: measures time, not understanding; METR's 2026 follow-up ([update](https://metr.org/blog/2026-02-24-uplift-update/)) says selection effects now make its newer estimates unreliable and speedup is likely higher with current tools.*
  - facts: METR, arXiv v2 2025-07 | source opened: yes (abstract and 2026 update) | from: beyond lists | suggested sub-group: What is measured
- 🟢 [Programmers Are Poor and Overconfident Judges of LLM-Generated Assertions](https://arxiv.org/abs/2607.08885) - 2026. Measured on people: a controlled experiment with 86 Python programmers. They judged correct generated assertions right 74% of the time and incorrect ones 49%, with the same confidence; natural-language explanations gave no overall benefit, and poor explanations lowered accuracy while raising confidence. *Limits: assertions on small functions, not whole changes.*
  - facts: arXiv 2026-07 | source opened: yes (abstract) | from: beyond lists | suggested sub-group: What is measured
- 🟢 [Feeling Easier, Working Harder: Cognitive Load in AI-Assisted Code Comprehension](https://arxiv.org/abs/2611.12019) - 2026. Measured on people: 20 novice CS students read Java with and without AI, then took a quiz without AI. AI raised measured cognitive load (reaction times up 11.2%) while perceived load stayed the same, and comprehension did not improve; some read the AI's explanation instead of the code. *Limits: 20 students, a ceiling effect on the quiz; accepted to ICSE 2027.*
  - facts: arXiv 2026-11 | source opened: yes (abstract) | from: beyond lists | suggested sub-group: What is measured
- 🟢 [The Widening Gap: The Benefits and Harms of Generative AI for Novice Programmers](https://arxiv.org/abs/2405.17739) - 2024. Measured on people: 21 lab sessions with eye tracking and interviews. 20 of 21 students finished, but those who struggled had their metacognitive problems compounded by AI, thought they did better than they did and ended with an illusion of competence. *Limits: qualitative, one problem, students.*
  - facts: ICER 2024 | source opened: yes (abstract) | from: beyond lists | suggested sub-group: What is measured
- 🟢 [Studying the effect of AI Code Generators on Supporting Novice Learners in Introductory Programming](https://arxiv.org/abs/2302.07427) - 2023. Measured on people: controlled experiment, 69 learners aged 10 to 17. With Codex they scored 1.8 times higher on authoring tasks with no drop on manual modification tasks, and slightly better (not significant) on a test a week later. *Limits: children on intro tasks, 2022 model; a useful counterweight to the loss findings.*
  - facts: CHI 2023 | source opened: yes (abstract) | from: beyond lists | suggested sub-group: What is measured
- 🟢 [The Impact of Generative AI on Critical Thinking](https://www.microsoft.com/en-us/research/publication/the-impact-of-generative-ai-on-critical-thinking-self-reported-reductions-in-cognitive-effort-and-confidence-effects-from-a-survey-of-knowledge-workers/) - 2025. Measured on people (survey): 319 knowledge workers, 936 examples. Higher confidence in the AI went with less critical thinking, higher self-confidence with more. *Limits: self-report, not coding-specific.*
  - facts: Microsoft Research and CMU, CHI 2025 | source opened: yes | from: beyond lists | suggested sub-group: What is measured
- 🟢 [Comprehension Debt in GenAI-Assisted Software Engineering Projects](https://arxiv.org/abs/2604.13277) - 2026. Measured on people (qualitative): 621 reflective diaries from 207 students over eight weeks. Four patterns that build comprehension debt (black-box acceptance, context mismatch, dependency-induced atrophy, skipped verification) and one that reduces it: using AI as a comprehension scaffold. *Limits: student diaries, no effect sizes, 5-page paper.*
  - facts: EASE 2026 companion | source opened: yes (abstract) | from: beyond lists | suggested sub-group: What is measured
- 🟢 [AI Copilot Code Quality: 2025 Look Back](https://www.gitclear.com/ai_assistant_code_quality_2025_research) - 2025. Measured on code: 211 million changed lines, 2020 to 2024. Refactored ("moved") lines fell from 25% of changes in 2021 to under 10% in 2024, copy/pasted lines rose from 8.3% to 12.3%. *Limits: vendor research by a code analytics company; shows code shape, not what anyone understands; links to AI use are by period, not by author.*
  - facts: GitClear report, not peer reviewed | source opened: yes (landing page and abstract) | from: beyond lists | suggested sub-group: What is measured

### Essays worth reading

- ⚪ [Programming as Theory Building](https://pages.cs.wisc.edu/~remzi/Naur.pdf) - Peter Naur, 1985. A program is a theory held in its programmers' heads, not its source text; when the people who hold the theory leave, the program effectively dies. The origin of every cognitive debt argument here.
  - facts: 14-page PDF hosted at wisc.edu | source opened: yes (PDF downloaded) | from: beyond lists | suggested sub-group: Essays
- ⚪ [Comprehension Debt: The Ticking Time Bomb of LLM-Generated Code](https://codemanship.wordpress.com/2025/09/30/comprehension-debt-the-ticking-time-bomb-of-llm-generated-code/) - Jason Gorman, 2025-09. Coins "comprehension debt": the extra time it will take to understand generated code before you can change it, growing as teams ship code nobody has read. *Limits: short opinion post; the "70% of the time" figure has no source.*
  - facts: blog | source opened: yes | from: beyond lists | suggested sub-group: Essays
- ⚪ [How Generative and Agentic AI Shift Concern from Technical Debt to Cognitive Debt](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) - Margaret-Anne Storey, 2026-02. Cognitive debt lives in people, not code; a student team that could no longer change its own app by week 7 or 8; practices such as one human fully understanding each AI change before it ships. Follow-up: [What I'm hearing about cognitive debt](https://margaretstorey.com/blog/2026/02/18/cognitive-debt-revisited/). *Limits: one classroom anecdote.*
  - facts: blog | source opened: yes (both posts) | from: beyond lists | suggested sub-group: Essays
- ⚪ [From Technical Debt to Cognitive and Intent Debt](https://arxiv.org/abs/2603.22106) - Margaret-Anne Storey, 2026. A Triple Debt Model: technical debt in code, cognitive debt in people, intent debt in missing written rationale, with how to diagnose and reduce each. *Limits: a position paper, no data.*
  - facts: arXiv v4 2026-04, 10 pages | source opened: yes (abstract) | from: beyond lists | suggested sub-group: Essays (pick this or the blog post, not both, if space is tight)

## Rejected

- ChatGPT: Friend or Foe When Comprehending and Changing Unfamiliar Code (arXiv 2605.10702): 10 students, exploratory, no outcome on understanding; weaker than the studies above.
- Your Brain on ChatGPT comment paper (arXiv 2601.00856): a critique, mentioned in the Limits of the main study instead.
- METR February 2026 update as its own entry: folded into the METR line.
- GitClear "Maintainability Gap 2026": same vendor series; one report is enough.
- PrincessSats/cognitive-debt, jobrien874/why-plugin, jrjames83/claude-knowledge-plugin, IvanOboth/understand-plugin, ValdoTR/jeo-prd, Aleksa5000/explain-stack: 0 to 1 stars, some unpushed since early 2026; same idea as grokcheck and codecall.
- RonaldSit/comprehension-debt, riko-yyy/comprehension-debt, baokhang83/cognitive-debt-calculator, rajatslakhina/comprehension-debt-article-demo: 0 to 2 stars; doc-to-code ratios or git heuristics with no validation.
- giggsoinc/raven: pre-change "pressure-test" agent, shows nothing about existing code a person must understand.
- Socratic tutor skills (socratiskill, claude-study-mode, myelinate, edu-agent-skills, mentor-skill): teach programming in general, not understanding of your own codebase.
- Augment Code "comprehension debt" guide: vendor SEO page.
- Simon Willison "Linear walkthroughs": same guide as Interactive explanations; one entry is enough (Showboat is already listed).

## Where I searched / where I did not / failed queries

- Awesome-lists: GitHub search for "awesome cognitive debt" and "awesome ai learning programming comprehension" returned nothing. No awesome list on this topic exists that I could find; all candidates are found beyond lists.
- GitHub repository search: "comprehension debt", "cognitive debt claude", "quiz code claude understand", "socratic coding agent", "teach mode claude code", "explain back ai code understanding" (empty), "vibe coding learn understand quiz" (empty).
- Web (fetchira, serper): MIT cognitive debt study, METR RCT and 2026 update, Microsoft/CMU critical thinking, Jason Gorman, Margaret-Anne Storey, GitClear, Prather ICER 2024, Kazemitabaar CHI 2023, Naur, studies of explanations improving comprehension, Simon Willison patterns. All primary pages opened through fetchira read; Naur PDF downloaded with curl.
- Not searched: ACM DL and IEEE full-text search, Google Scholar directly, team practice case studies from companies (none with numbers surfaced), Anthropic's own blog post on the skill formation study (already listed via arXiv), Hacker News threads.
- Not checked: full text of any paper beyond its abstract; all numbers come from abstracts or landing pages.
