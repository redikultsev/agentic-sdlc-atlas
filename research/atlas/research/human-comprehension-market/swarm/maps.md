# How Does This App Fit Together: candidates beyond the current 9

## Candidates

Studies first (they change the section's main claim), then tools by sub-group, best first within each.

**Studies (suggested home: What the Evidence Says, or a short evidence line at the top of this section).**

- 🟢 [Software Systems as Cities: A Controlled Experiment](https://dl.acm.org/doi/10.1145/1985793.1985868) - 2011. Measured on people: 41 participants from industry and academia, in four locations, answered program comprehension questions about two Java systems. With the CodeCity 3D map, answers were 24% more correct and took 12% less time than with Eclipse plus a spreadsheet of metrics, statistically significant. *Limits: the authors' own tool; on focused tasks that need a precise answer the map did no better; a pre-AI code city, not a model-drawn map, and nothing about code written by agents.*
  - facts: ICSE 2011, pages 551-560; replication kit published at wettel.github.io/codecity-experiment.html | source opened: yes (ACM page and author PDF conclusion) | from: beyond lists | suggested sub-group: What the Evidence Says
- 🟢 [A systematic literature review of software visualization evaluation](https://www.sciencedirect.com/science/article/pii/S0164121218301237) - 2018. Of 181 SOFTVIS/VISSOFT papers with an extractable evaluation, 62% (113) had no evaluation or only a weak one such as anecdotes or usage scenarios; 53 ran experiments, and 37 of those used only students and academics. *Limits: covers research prototypes up to 2018, not today's commercial or model-drawn maps.*
  - facts: Merino, Ghafari, Anslow, Nierstrasz, Journal of Systems and Software vol. 144 | source opened: yes (abstract, highlights, introduction) | from: beyond lists | suggested sub-group: What the Evidence Says

**For people who don't read code.**

- 🟡 [Windsurf Codemaps](https://cognition.com/blog/codemaps) - You type a task or question and an agent draws a nested map of the code involved, as a list or a diagram, where each node jumps to the exact lines and a "trace guide" explains why they belong together. Maps can be shared as links and passed to the agent as context. *Limits: the launch post says they have yet to benchmark it even for agents, and nothing is measured on people; sharing stores the map on the vendor's servers.*
  - facts: closed; launched by Cognition, now documented at docs.devin.ai/desktop/codemaps; off by default for enterprise teams | source opened: yes (blog and docs) | from: beyond lists | suggested sub-group: For people who don't read code
- 🟡 [CodeViz](https://www.codeviz.ai/) - Builds an editable C4 and UML architecture model of a codebase, with every box linked to source, and draws on-demand views of a workflow, API path or data flow. Models are versioned in Git and can be branched for proposed designs. *Limits: the site claims "10 hrs saved monthly" and "40x ROI" with no method behind either number.*
  - facts: closed; VS Code extension, YC S24 | source opened: yes (site) | from: beyond lists | suggested sub-group: For people who don't read code
- 🟡 [CodeScene hotspot maps](https://codescene.io/docs/guides/technical/hotspots.html) - A zoomable circle map of the codebase coloured by change frequency, code health, defects and cost, filterable by team or author, with change-coupling lines between files that change together. Built from git history plus static analysis. *Limits: its "45% of bugs in 1.2% of the code" is an example dashboard, not a study; nothing measures whether the map changes a decision.*
  - facts: closed (free for open source) | source opened: yes (docs page) | from: beyond lists | suggested sub-group: For people who don't read code
- 🟡 [Swimm Auto-docs](https://swimm.io/blog/how-we-automatically-generate-documentation-for-legacy-code) - Generates overview, class and flow documents for a codebase, including COBOL and other legacy languages, with Mermaid diagrams of flows, from deterministic code analysis rather than a model alone. *Limits: claims "no hallucinations, always accurate" with no accuracy numbers; enterprise plans only; closer to Ask the Codebase than to a map.*
  - facts: closed | source opened: yes (CTO blog post, 2024-09) | from: beyond lists | suggested sub-group: For people who don't read code (or Ask the Codebase)

**For people who read code.**

- 🟡 [Sourcetrail](https://github.com/petermost/Sourcetrail) - Open source. An offline source explorer for C, C++ and Java that shows the graph of a symbol's callers, callees and members next to the code, kept buildable by a community fork after the original was archived in 2021. *Limits: says it helps you "get productive on unfamiliar source code" with no data; the maintainer wrote in 2026-08 that development will slow; binaries only for sponsors.*
  - facts: stars 771, created 2022-03, pushed 2026-11, licence GPL-3.0 (original CoatiSoftware/Sourcetrail: 16454 stars, archived) | source opened: yes | from: beyond lists | suggested sub-group: For people who read code
- 🟡 [Visual Studio code maps](https://learn.microsoft.com/en-us/visualstudio/modeling/map-dependencies-across-your-solutions?view=visualstudio) - Generates a map of a .NET or C++ solution from assemblies down to methods, with calls, inheritance and field access as coloured links you expand, filter and drill into. *Limits: claims you see how code fits together "without reading through files" with no data; creating and editing maps needs Visual Studio Enterprise.*
  - facts: closed | source opened: yes | from: beyond lists | suggested sub-group: For people who read code
- 🟡 [NDepend dependency graph and matrix](https://www.ndepend.com/features/dependency-graph-matrix-architecture) - A dependency graph and dependency structure matrix of a .NET codebase, with a query language over the code, layer violations, cycles and a compare-two-versions view. *Limits: calls its graph "the most powerful" in the industry with no comparison; its published eShopOnWeb numbers are about agents fixing issues, not about people reading the map.*
  - facts: closed | source opened: yes | from: beyond lists | suggested sub-group: For people who read code
- [IntelliJ IDEA Dependency Structure Matrix](https://www.jetbrains.com/help/idea/dsm-analysis.html) - A matrix of dependencies between modules, packages and classes, sorted so a clean layering shows as a triangle and mutual dependencies show in red; click a cell to see the code that causes it.
  - facts: closed; free plugin for IntelliJ IDEA | source opened: yes | from: beyond lists | suggested sub-group: For people who read code
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) - Open source. Draws the module dependency graph of a JavaScript or TypeScript project and checks it against rules you write, such as no cycles or no imports from one layer into another, in text for CI and in graphs.
  - facts: stars 7451, created 2016-11, pushed 2026-11, licence MIT | source opened: yes | from: awesome-softvis | suggested sub-group: For people who read code
- 🟡 [Emerge](https://github.com/glato/emerge) - Open source. Scans a codebase in 11 languages and produces an interactive web app of file and class dependency graphs, inheritance, fan-in and fan-out, Louvain modularity clusters and git-based change coupling. *Limits: aims at "a better understanding" of a codebase, with no evaluation.*
  - facts: stars 1185, created 2020-09, pushed 2026-08, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: For people who read code
- [Moose](https://github.com/moosetechnology/Moose) - Open source. A research platform for software analysis, started at the University of Bern in 1996: imports a codebase into a model you query, measure and visualize with your own views. Many published software visualization studies were built on it and its Roassal engine.
  - facts: stars 159, created 2015-08, pushed 2026-11, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: For people who read code

**Classic visualization.**

- 🟡 [CodeCharta](https://github.com/MaibornWolff/codecharta) - Open source. Turns a codebase into a 3D city where size, height and colour are metrics you pick, plus a map of its domain language and a dependency graph, with a live demo in the browser. *Limits: "find the hotspots in minutes" comes with no measurement; the code city idea was measured only on CodeCity in 2011.*
  - facts: stars 585, created 2017-03, pushed 2026-11, licence BSD-3-Clause | source opened: yes | from: beyond lists | suggested sub-group: Classic visualization
- 🟡 [Git Truck](https://github.com/git-truck/git-truck) - Open source. A local, offline view of a repository's structure coloured by commit activity and authorship, so you see who worked where and when, and how it changed over time. *Limits: says it helps you "quickly" answer such questions, with no data.*
  - facts: stars 785, created 2022-01, pushed 2026-11, licence MIT | source opened: yes | from: awesome-softvis | suggested sub-group: Classic visualization
- [Gource](https://github.com/acaudwell/Gource) - Open source. An animation of a repository's history as a growing tree: directories are branches, files are leaves, and contributors fly in to touch the files they change.
  - facts: stars 13216, created 2009-09, pushed 2026-03, licence GPL-3.0 | source opened: yes | from: awesome-softvis | suggested sub-group: Classic visualization

## Rejected

- CodeSee - the company announced it was shutting down commercial operations in 2024 after GitKraken acquired it; no standalone product to link.
- CoatiSoftware/Sourcetrail - archived 2021; replaced by the petermost fork above.
- githubocto/repo-visualizer - archived.
- Swark (swark-io/swark) - LLM architecture diagrams in VS Code, 1698 stars, but no push since 2025-03; a fork "Swark Continued" exists on the marketplace, not checked.
- Structurizr (structurizr/structurizr, old java and cli repos archived) - diagrams as code: a person writes the C4 model; it does not read the codebase to draw it.
- C4-PlantUML, Mermaid, PlantUML, Kroki - notations and renderers for diagrams you write by hand, not maps of code.
- Mermaid Chart VS Code extension - says it generates diagrams from code with AI, but it is a diagram editor first; not opened in depth.
- Sourcegraph - code search and navigation, no whole-codebase map view found.
- Roassal (pharo-graphics/Roassal) - the visualization engine under Moose; listed through Moose instead.
- madge, pydeps - single-language dependency graph tools that overlap dependency-cruiser; fine as "more" entries, READMEs not opened.
- code-maat - command-line mining of git history into CSV, no visual view of its own.
- jQAssistant core framework - archived.
- Software Galaxies (anvaka/pm), npmgraph - graphs of package ecosystems or npm dependency trees, not of your own codebase.
- FlameGraph, speedscope, esbuild analyzer (from awesome-softvis) - runtime profiles and bundle sizes, not codebase structure.
- Archynt, Repowise blog comparison pages - SEO comparisons, not primary sources.

## Where I searched / where I did not / failed queries

- Awesome lists used: cafour/awesome-softvis (small, last push 2023-10; gave dependency-cruiser, Git Truck, Gource, plus rejected items); shubhamgrg04/awesome-diagramming (only hand-written diagram tools, nothing that reads code). mehdihadeli/awesome-software-architecture (11814 stars) found but only its folder list was read, not its diagram pages. analysis-tools-dev/static-analysis found, not harvested.
- GitHub search queries "awesome software visualization", "awesome code visualization", "awesome codebase visualization", "awesome-codevis", "software visualization tools list" found no larger dedicated list. The GitHub search API then hit its rate limit, so the "awesome c4 model" query failed and later discovery used web search.
- Web (fetchira, serper and default router): Windsurf Codemaps, CodeSee status, CodeViz, Swimm diagrams, CodeScene hotspots, Visual Studio code maps, IntelliJ dependency analysis, NDepend, Swark, the CodeCity experiment, the Merino review. An academic search for controlled experiments on LLM-drawn architecture diagrams returned nothing relevant.
- Not searched: Lattix, Structure101 / Sonargraph, Understand by SciTools, Seerene, GitKraken's current code visualization features, VR code cities (CityVR, Merino 2017), newer code city experiments that replicate or contradict Wettel 2011, Google Scholar beyond these two papers.
