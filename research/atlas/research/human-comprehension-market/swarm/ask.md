# Ask the Codebase: candidates

## Candidates

### How accurate they are

- 🟢 [Questions Before Answers? A Comparison of Codebase Chatbots and Tutorials for Codebase Learning](https://doi.org/10.1184/R1/29086835) - 2025. Measured on people: a between-subjects experiment with 15 experienced programmers (one dropped out) on an unfamiliar Django app, Sourcegraph Cody against a human-written tutorial. The tutorial group took significantly less time to get started (p about 0.0034); chatbot users were more confused and less confident, tutorial users understood the structure better but lacked low-level details. *Limits: 14 people, one app, Cody 0.6.7; one author works at a company that makes onboarding tutorials.*
  - facts: PLATEAU 2025 workshop paper, CC BY 4.0 | source opened: yes (PDF text via search extract; direct PDF returned 403) | from: found beyond lists | suggested sub-group: How accurate they are
- 🟢 [Using an LLM to Help With Code Understanding](https://arxiv.org/abs/2307.08177) - 2024 (ICSE). Measured on people: 32 participants with an in-IDE chat plugin (GILT) against web search. Plugin users completed significantly more sub-tasks (0.47 more), with no significant difference in completion time or code understanding quiz scores; the gain was significant only for professionals, not students. *Limits: explains highlighted code and APIs, not a whole repository; GPT-3.5.*
  - facts: arXiv 2307.08177, ICSE 2024 | source opened: yes | from: found beyond lists | suggested sub-group: How accurate they are
- 🟢 [An LLM Assistant for Software Project Onboarding](https://doi.org/10.1145/3696630.3728719) - 2025. A RAG chatbot (SPAC-B) answering project questions on two open-source projects scored a mean 4.6 of 5 for relevance and 4.3 for completeness and correctness; in an experiment with 10 developers, participants made better implementation plans with it and 8 of 10 found it helpful. *Limits: 10 people, the authors' own tool, answers rated on a Likert scale rather than checked against the code.*
  - facts: FSE Companion 2025, open access | source opened: yes (ACM abstract) | from: found beyond lists | suggested sub-group: How accurate they are
- 🟢 [SWD-Bench: Evaluating Repository-level Software Documentation via Question Answering](https://arxiv.org/abs/2604.06793) - 2026. Grades generated repository docs, DeepWiki among them, by whether a model can find and complete real functionality using them, mined from 4,170 pull request entries. The best method reached only 29.35 MCC on telling whether a feature is documented and 64.90 IoU on locating its files; human-written docs were competitive with the best generator; the best docs raised SWE-agent's issue-solving rate by 20.00%. *Limits: measured on models reading the docs, not on people.*
  - facts: arXiv 2604.06793 | source opened: yes | from: found beyond lists | suggested sub-group: How accurate they are
- 🟢 [DocAgent: A Multi-Agent System for Automated Code Documentation Generation](https://arxiv.org/abs/2504.08725) - 2025. Open source. Checks whether generated docstrings refer to code entities that actually exist: 95.74% for DocAgent with GPT-4o mini against 61.10% for a plain chat baseline with the same model. *Limits: Python docstrings, not repository wikis; the code repo has had no push since 2025-04.*
  - facts: repo facebookresearch/DocAgent stars 457, created 2025-04, pushed 2025-04, licence MIT | source opened: yes | from: list codefuse-ai/Awesome-Code-LLM | suggested sub-group: How accurate they are
- 🟢 [SWE-QA: Can Language Models Answer Repository-level Code Questions?](https://arxiv.org/abs/2509.14635) - 2025. Open source. 576 question and answer pairs from 11 popular repositories, built from developer questions in 77,100 issues: intention, cross-file and multi-hop dependency questions. Agents that explore the repo beat retrieval, which beats answering directly. *Limits: measured on models; answers graded by a model judge, cross-checked by three engineers.*
  - facts: repo peng-weihan/SWE-QA-Bench stars 59, created 2025-09, pushed 2026-08, licence Apache-2.0 | source opened: yes | from: list YerbaPage/Awesome-Repo-Level-Code-Generation | suggested sub-group: How accurate they are
- 🟢 [SWE-QA-Pro](https://arxiv.org/abs/2603.16124) - 2026. Open source. A harder repository question benchmark on long-tail repos, with questions a model can answer from memory filtered out; exploring agents beat direct answers by about 13 points for Claude Sonnet 4.5. *Limits: measured on models; also a training recipe, so the authors' own trained model is among the scored entries.*
  - facts: repo TIGER-AI-Lab/SWE-QA-Pro stars 15, created 2025-10, pushed 2026-06, licence MIT | source opened: yes | from: list YerbaPage/Awesome-Repo-Level-Code-Generation | suggested sub-group: How accurate they are
- 🟢 [CoReQA: Uncovering Potentials of Language Models in Code Repository Question Answering](https://arxiv.org/abs/2501.03447) - 2025. Repository questions from GitHub issues and comments in 176 repositories across four languages; state-of-the-art and long-context models struggle to answer them. *Limits: measured on models; graded by a model judge on five aspects.*
  - facts: arXiv 2501.03447, no code repo found | source opened: yes | from: list YerbaPage/Awesome-Repo-Level-Code-Generation | suggested sub-group: How accurate they are
- 🟢 [RepoQA: Evaluating Long Context Code Understanding](https://arxiv.org/abs/2406.06025) - 2024. Open source. 500 tasks from 50 repositories in 5 languages: find the function that matches a plain-language description; 26 models scored, and models may understand code better without comments. *Limits: finding one function, not answering open questions; no push since 2024-11.*
  - facts: repo evalplus/repoqa stars 137, created 2024-02, pushed 2024-11, licence Apache-2.0 | source opened: yes | from: list codefuse-ai/Awesome-Code-LLM | suggested sub-group: How accurate they are

### Chat over a repo

- 🟡 [Sourcebot](https://docs.sourcebot.dev/docs/features/ask/overview) - Open source. Self-hosted code search with Ask Sourcebot: a model searches and follows code references across your repos and answers with inline citations, diagrams and clickable snippets, using a model provider you configure. *Limits: no published evaluation of answer accuracy.*
  - facts: repo sourcebot-dev/sourcebot stars 4037, created 2024-08, pushed 2026-11, licence MIT | source opened: yes | from: found beyond lists | suggested sub-group: Chat over a repo
- 🟡 [Sourcegraph Deep Search](https://sourcegraph.com/docs/deep-search) - An agent that answers questions across many repositories with Sourcegraph search and code navigation, and lists every search it ran and file it read. *Limits: no accuracy numbers; enterprise plans only; its docs say shared answers do not enforce repository permissions.*
  - facts: proprietary | source opened: yes | from: found beyond lists | suggested sub-group: Chat over a repo
- 🟡 [GitHub Copilot Spaces](https://docs.github.com/en/copilot/concepts/context/spaces) - A shared collection of repos, files, pull requests, issues and notes that Copilot answers from, kept in sync with GitHub and shareable with a team for onboarding. *Limits: "an evergreen expert in your project" with no data.*
  - facts: proprietary, any Copilot licence | source opened: yes | from: found beyond lists | suggested sub-group: Chat over a repo
- 🟡 [Unblocked](https://getunblocked.com/) - Answers questions from code, Slack, issues and docs together, with source links and conflicting sources reconciled by recency and authority. *Limits: the helping claims are customer stories, such as a team taking over a platform in three months instead of six; the page reports a 107-task test on Claude Code without numbers, and the product now leads with agent context.*
  - facts: proprietary | source opened: yes | from: found beyond lists | suggested sub-group: Chat over a repo

### Wikis

- 🟡 [OpenDeepWiki](https://github.com/AIDotNet/OpenDeepWiki) - Open source. Turns a Git repo, ZIP or local folder into a published docs site with overviews, a wiki, mind maps and a chat assistant, updated incrementally. *Limits: no published evaluation; overlaps deepwiki-open, already listed.*
  - facts: stars 3673, created 2025-04, pushed 2026-10, licence MIT | source opened: yes | from: found beyond lists (named as a baseline in the CodeWiki paper) | suggested sub-group: Wikis
- 🟡 [Litho (deepwiki-rs)](https://github.com/sopaco/deepwiki-rs) - Open source. Generates architecture docs in the C4 model from source: context, container and component diagrams plus code-level pages, rerunnable in CI. *Limits: "perfectly in sync" and "save hundreds of hours" come with no data; the author now points to a successor aimed at agents.*
  - facts: stars 3179, created 2025-09, pushed 2026-11, licence MIT | source opened: yes | from: found beyond lists | suggested sub-group: Wikis
- 🟡 [Swimm](https://swimm.io/) - A map of a legacy system's flows, dependencies and business rules in plain English, each traced to lines of code and checked by domain experts, kept in sync with commits. *Limits: "95%+ accurate" and "100% coverage" are stated with no method; now sold mainly as a modernization service.*
  - facts: proprietary | source opened: yes | from: found beyond lists | suggested sub-group: Wikis

### Note on an existing entry

- CodeWiki: the list's 82.23 against 65.06 comes from the README table of a September 2026 re-run (CodeWiki 2.0, 7 repos, 486 rubric items). The paper (arXiv 2510.24428 v6) reports 68.79% against DeepWiki's 64.06%. Both are model-graded. The line could say "README re-run" so readers don't look for 82.23 in the paper.

## Rejected

- bloop (BloopAI/bloop): archived, no push since 2024-12.
- RepoAgent (OpenBMB/RepoAgent): no push since 2024-12; its paper claims quality without numbers in the abstract.
- CodeRepoQA: no push since 2025-02, no licence, 585,687 multi-turn entries mined from issues; overlaps SWE-QA and CoReQA.
- Can Developers Prompt? (arXiv 2408.00686): a people experiment, but about prompting for docstrings of two functions, not understanding a codebase.
- Enhancing Software Development with Context-Aware Conversational Agents (arXiv 2505.08648): 29 developers on which chatbot features they want, not on understanding.
- Onboarding Buddy (FSE Companion 2025): abstract describes the system, no evaluation result.
- Repomix: packs a repo for a model, shows nothing to a person (as the task notes).
- Gemini Code Assist, Augment, Tabnine, Greptile chat, Mintlify, Cody: not opened. General coding assistants, review bots or docs-site tools without a distinct repo-understanding view; Cody's role is now Deep Search, entered above.

## Where I searched / where I did not / failed queries

- Awesome lists used: codefuse-ai/Awesome-Code-LLM (Code QA and benchmark tables), YerbaPage/Awesome-Repo-Level-Code-Generation (Repo-Level Code QA section). GitHub search for "awesome code search", "awesome codebase qa" found nothing on topic.
- Beyond lists: fetchira search (default router and serper) for user studies of codebase chatbots and onboarding, and for DeepWiki accuracy evaluations; arXiv API and arXiv HTML for abstracts and numbers; gh api for repo facts; vendor docs for Sourcebot, Sourcegraph, GitHub, Unblocked, Swimm.
- Failed: CMU KiltHub PDF and page returned 403 (numbers taken from the search provider's text extract of that PDF and the UCSD thesis abstract); ACM page blocked by bot check, abstract read from search extract; firecrawl had no account.
- Did not search: Google Scholar directly, IEEE Xplore, vendor blogs of Augment, Tabnine, Gemini Code Assist, Greptile; LongCodeU, LongCodeBench, CodeQueries were seen in lists but not opened.
