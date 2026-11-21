# Brief for every research agent

We maintain a public curated list "Awesome Codebase Understanding": tools and evidence for understanding a codebase or a code change you didn't write (often AI-written code and agent pull requests) and deciding faster. Read the current list first so you don't repeat entries:
`gh api repos/redikultsev/awesome-codebase-understanding/readme -H "Accept: application/vnd.github.raw"`

## What qualifies
- A tool that shows a PERSON something about a codebase or a change (map, wiki, walkthrough, impact, provenance). Agent-only context tools that show nothing to a person do not qualify.
- A study, benchmark, experiment or serious essay about how people understand or review code, especially code written by AI.
- Prefer primary sources: repo, official docs, paper. No resellers, no SEO roundups as entries.

## Evidence marks (one per entry, the strongest the evidence supports)
- 🟢 measured: a published measurement with a method. Say on whom: people or agents.
- 🟡 vendor claim: the maker says it helps, no numbers.
- ⚪ opinion: argument, worked example, experience report.
- no mark: the entry claims nothing, it only does something checkable.

## How to search
- Awesome-lists first: find `awesome-*` lists on the topic (gh search repos / gh api search/repositories) and harvest from them, then search beyond them (GitHub topics, keyword and semantic search, papers). Report which lists you used and mark each candidate "from list X" or "found beyond lists".
- Web: fetchira MCP tools (load with ToolSearch query "select:mcp__fetchira__search,mcp__fetchira__read"). Exa is out of credits: use provider "serper", "tavily" or the default router. If fetchira fails entirely, use WebSearch/WebFetch and say so.
- GitHub facts: `gh api repos/<owner>/<repo>` (stars, created_at, pushed_at, license, archived). Skip archived projects and ones with no push since 2025-06 unless historically important.
- Papers: arxiv abstract pages, ACM/IEEE pages, Google Scholar via search.
- OPEN every candidate's primary source before you write its line. Never write a number you did not see in the source.

## Output
Write to the file path given in your task, in English, markdown:
1. `## Candidates` — one line per candidate in EXACTLY this format, best first:
   `- 🟡 [Name](primary-url) - Open source. What it shows you, one or two plain sentences. *Limits: the strongest claim without data, or what the measurement doesn't cover.*`
   ("Open source." only if the code is open. Studies: `- 🟢 [Title](url) - YYYY. Finding with numbers. *Limits: ...*`)
   After each line, an indented note: `  - facts: stars N, created YYYY-MM, pushed YYYY-MM, licence X | source opened: yes | from: list X / beyond lists | suggested sub-group: ...`
2. `## Rejected` — names you looked at and why they don't fit (one line each).
3. `## Where I searched / where I did not / failed queries`.
Plain English, no em dashes or en dashes, no marketing words. Do not include anything about who is asking.
Return a summary under 200 words: number of candidates by mark, the 5 strongest, and anything that changes the list's main claim ("nothing measures whether maps help people decide").
