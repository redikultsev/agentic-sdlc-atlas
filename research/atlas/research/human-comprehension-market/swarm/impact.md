# What Breaks If I Change This: candidates

## Candidates

### Before you edit

- 🟢 [Visualizing call graphs (REACHER)](https://www.computer.org/csdl/proceedings-article/vlhcc/2011/06070388/12OmNxjjEdP) - 2011. Measured on people: in a lab study with 12 participants answering control flow questions, those using the REACHER interactive call graph were over 5 times more successful than with a standard IDE, in significantly less time. *Limits: 12 participants, lab tasks, a research prototype; it measures answering "what calls what", not deciding whether a change is safe.*
  - facts: VL/HCC 2011, LaToza and Myers | source opened: yes (abstract) | from: beyond lists | suggested sub-group: Before you edit (or What the Evidence Says)
- 🟡 [Sourcegraph code navigation](https://sourcegraph.com/docs/code-search/code-navigation) - Go to definition, find references and find implementations across repositories in the browser, either search-based or precise from compiler indexes (SCIP). *Limits: its docs say it helps in "determining the impact of code changes"; no numbers.*
  - facts: commercial product, docs page | source opened: yes | from: beyond lists | suggested sub-group: Before you edit
- 🟡 [Understand by SciTools](https://docs.scitools.com/help/graphs/open-a-graph.html) - Interactive graphs of what a function calls and what calls it, including a butterfly view that shows both directions around one function or one architecture part, plus a compare variant across versions. *Limits: vendor docs only, no published evaluation.*
  - facts: commercial | source opened: yes | from: list analysis-tools-dev/static-analysis | suggested sub-group: Before you edit
- [Nx affected and graph](https://nx.dev/docs/features/ci-features/affected) - Open source. `nx affected --graph` shows which projects and tasks a branch's changed files reach, and `--explain` prints why each task is affected, file by file. *Limits: works on the declared project and task graph of an Nx monorepo, not on calls inside a project.*
  - facts: stars 29484, created 2017-08, pushed 2026-11, licence MIT | source opened: yes | from: list korfuri/awesome-monorepo | suggested sub-group: Before you edit
- [Madge](https://github.com/pahen/madge) - Open source. Draws a graph of JavaScript and CSS preprocessor module dependencies and finds circular dependencies, so you can see what imports a file before you change it. *Limits: module imports only, no calls or runtime paths.*
  - facts: stars 10187, created 2012-05, pushed 2026-01, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: Before you edit
- 🟢 [Supporting Change Impact Analysis Using a Recommendation System (ImpRec)](https://mrksbrg.com/tse16_borg/) - 2017. A tool that recommends artifacts likely touched by a fix, mined from 12 years of past impact reports at a safety-critical company. It put about 40% of the true impact in its top 10 recommendations, and in deployment with two teams developers said it helped, newcomers most. *Limits: correctness measured by simulation; the human side is logs and interviews, not a controlled test; one company.*
  - facts: IEEE TSE 43(7) 2017, Borg, Wnuk, Regnell, Runeson | source opened: yes (author page with abstract) | from: beyond lists | suggested sub-group: Before you edit (or What the Evidence Says)

### From the history

- 🟢 [Mining Version Histories to Guide Software Changes (ROSE)](https://ieeexplore.ieee.org/document/1463228) - 2005. "Programmers who changed these functions also changed": rules mined from commits suggest what else a change must touch. On the history of eight open source projects, the top three suggestions held a correct location more than 70% of the time. *Limits: measured on replayed history, not on people using it.*
  - facts: IEEE TSE 31(6) 2005, Zimmermann, Zeller, Weissgerber, Diehl | source opened: yes (abstract) | from: beyond lists | suggested sub-group: From the history
- 🟡 [CodeScene](https://codescene.io/docs/guides/technical/hotspots.html) - A hotspot map of the files that change most, coloured by code health and defects, with change coupling lines for files that change together, filterable by team or developer. *Limits: the docs example (45% of bugs in 1.2% of the code) is one dashboard, not a study; the vendor's own study is listed below.*
  - facts: commercial | source opened: yes (hotspots and change coupling docs) | from: list analysis-tools-dev/static-analysis | suggested sub-group: From the history
- 🟢 [Code Red: The Business Impact of Code Quality](https://arxiv.org/abs/2203.04374) - 2022. Across 39 proprietary codebases and 30,737 files, low quality code had 15 times more defects, took 124% more time to resolve issues and had 9 times longer maximum cycle times. *Limits: by the makers of CodeScene, using its own quality score; it shows where changes cost more, not that seeing the map helps a person decide.*
  - facts: TechDebt 2022, Tornhill and Borg | source opened: yes (abstract) | from: beyond lists | suggested sub-group: From the history
- [Code Maat](https://github.com/adamtornhill/code-maat) - Open source. A command line tool that mines git history for change frequency, change coupling, ownership and churn per file, the analyses behind "Your Code as a Crime Scene". *Limits: CSV output, no view of its own; its README says the analyses moved into CodeScene.*
  - facts: stars 2656, created 2013-08, pushed 2025-07, licence GPL-3.0 (stated in README, not detected by GitHub) | source opened: yes | from: beyond lists | suggested sub-group: From the history
- [Git Truck](https://github.com/git-truck/git-truck) - Open source. A local interactive map of a repository's structure coloured by commit activity and authorship: who worked where, when, and which areas changed recently. *Limits: shows history and ownership, not dependencies.*
  - facts: stars 785, created 2022-01, pushed 2026-11, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: From the history
- 🟢 [Don't Touch My Code! Examining the Effects of Ownership on Software Quality](https://www.microsoft.com/en-us/research/publication/dont-touch-my-code-examining-the-effects-of-ownership-on-software-quality/) - 2011. On Windows Vista and Windows 7, ownership measures such as the number of low-expertise contributors and the top owner's share were related to both pre-release faults and post-release failures. *Limits: correlation in two Microsoft products; no tool tested on people.*
  - facts: ESEC/FSE 2011, Bird, Nagappan, Murphy, Gall, Devanbu | source opened: yes (abstract) | from: beyond lists | suggested sub-group: From the history

### Rules that stop it

- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) - Open source. Validates JavaScript and TypeScript dependencies against your own rules, reports violations as text for the build and as graphs for people, and draws the dependency graph. *Limits: JavaScript family only.*
  - facts: stars 7451, created 2016-11, pushed 2026-11, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: Rules that stop it
- [ArchUnit](https://github.com/TNG/ArchUnit) - Open source. Architecture rules as Java or Kotlin unit tests: allowed dependencies between packages, layers and slices, and no cycles, so a forbidden edge fails the build with the offending classes named. *Limits: only checks the rules someone wrote.*
  - facts: stars 3901, created 2017-04, pushed 2026-11, licence Apache-2.0 | source opened: yes | from: list analysis-tools-dev/static-analysis | suggested sub-group: Rules that stop it
- [Tach](https://github.com/tach-org/tach) - Open source. Declares Python modules and their allowed dependencies and public interfaces, and fails on imports outside them and on cycles. *Limits: Python only; the repo moved from gauge-sh to tach-org.*
  - facts: stars 2874, created 2024-01, pushed 2026-10, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: Rules that stop it

### Background study (fits What the Evidence Says)

- 🟢 [How Do Software Engineers Understand Code Changes? An Exploratory Study in Industry](https://yidatao.github.io/paper/tao_fse12.pdf) - 2012. A survey of 180 Microsoft engineers plus follow-up interviews: the risk of a change ("does this change break any code elsewhere?") was among the most important and hardest information to get; 15 of 23 interviewees fully agreed. They asked for a diff with "find caller" and a view of impacted code and affected tests. *Limits: survey and interviews, 16% response rate, one company, before AI-written code.*
  - facts: FSE 2012, Tao, Dang, Xie, Zhang, Kim | source opened: yes (full PDF) | from: beyond lists | suggested sub-group: What the Evidence Says or Before you edit

## Rejected

- Bazel query (rdeps): a text query language over the build graph, overlaps Nx; could replace Nx if the list wants a non-JS example.
- jQAssistant (from analysis-tools-dev/static-analysis): scans code into Neo4j for rule checks; small (301 stars), overlaps ArchUnit; keep as reserve.
- import-linter: Python import contracts, overlaps Tach (Tach has the larger user base).
- NDepend / JArchitect / CppDepend: dependency graphs and matrices, overlap Understand; commercial, vendor claims only.
- Glean (Meta): code indexing backend; the repo path facebook/glean returned 404 and it shows nothing to a person by itself.
- Kythe: cross-reference indexing infrastructure, the person-facing view lives in other products.
- stack-graphs (GitHub): archived.
- hercules (src-d): no push since 2023-02.
- CodeQL: security and dataflow queries; impact use is possible but not what it shows a person by default.
- Infer: a bug finder, not impact analysis.
- Moderne / OpenRewrite: mass automated refactoring; impact analysis is a side feature, vendor claims.
- Predictive Test Selection (Meta, arXiv 1810.05286): measured (half the test cost, over 99.9% of faulty changes still reported), but it is CI infrastructure that shows nothing to a person; could go to What the Evidence Says as "measured on systems".
- emerge, CodeCharta, TangleGuard: architecture and metrics visualizers, better fit "How Does This App Fit Together".
- deptrac: PHP layer rules, overlaps ArchUnit and Tach; a reserve if the list wants PHP.

## Where I searched / where I did not / failed queries

- Awesome lists used: analysis-tools-dev/static-analysis (README, grep for dependency, impact, architecture terms), korfuri/awesome-monorepo. Looked for awesome lists on code visualization, mining software repositories and impact analysis via gh search repos: none with substance (top hits 0 to 5 stars, or none). mehdihadeli/awesome-software-architecture exists but I did not harvest it.
- Web: fetchira with provider serper for papers and docs. Opened arXiv, IEEE abstract pages, the CSDL abstract for REACHER, the author page for ImpRec, Microsoft Research for Bird et al., the full PDF for Tao et al., and vendor docs for CodeScene, Nx, Sourcegraph and Understand.
- Failed: ACM DL blocked by bot check (Tao et al. read from the author PDF instead); SciTools impact-analysis support URL 404 (used the docs graph page); facebook/glean repo lookup 404 (likely facebookincubator/Glean, not rechecked).
- Did not search: Google Scholar directly, systematic reviews of change impact analysis (Lehnert 2011, Li et al. 2013), JRipples and other academic CIA tools, eye-tracking studies of change tasks, Glean UI, CodeScene's newer studies on AI code.
