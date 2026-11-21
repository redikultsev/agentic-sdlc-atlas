# What Did the Agent Just Change: candidates

Already in the list and not repeated here: Linear Diffs, CodeRabbit layer walkthroughs, Devin Review, Plannotator Code Tour, GitHub stacked pull requests, hunk, tuicr, Showboat, Agent Trace, accountable-review.

## Candidates

- 🟢 [Associating Working Memory Capacity and Code Change Ordering with Code Review Performance](https://sback.it/publications/emse2019a.pdf) - 2019. A controlled experiment with 50 participants, mostly professional developers, reviewing changes with seeded defects. Reviews of small changes found significantly more defects; the order in which change parts were shown showed only a tendency to affect efficiency that the authors "cannot conclude reliably". *Limits: pre-AI code, one open source system; tests ordering theory, not a shipping tool.*
  - facts: Empirical Software Engineering 2019, Baum, Schneider, Bacchelli | source opened: yes (author PDF, abstract and intro) | from: beyond lists | suggested sub-group: Read it in a sensible order (or Research on Human Review)
- 🟢 [Helping Developers Help Themselves: Automatic Decomposition of Code Review Changesets](https://www.microsoft.com/en-us/research/publication/helping-developers-help-themselves-automatic-decomposition-of-code-review-changesets/) - 2015. ClusterChanges splits one changeset into independent parts. On 1,000 Microsoft review changesets, about 42% had more than one non-trivial part; in interviews 16 of 20 developers said the split for their own change was correct and complete. *Limits: authors judged their own changes in a qualitative study; no measure of review speed or missed bugs.*
  - facts: ICSE 2015, Barnett, Bird, Brunet, Lahiri | source opened: yes (abstract page and full PDF) | from: awesome-code-review (joho) | suggested sub-group: Read it in a sensible order
- 🟢 [GitHub Copilot pull request summary](https://docs.github.com/en/copilot/how-tos/use-copilot-for-common-tasks/create-a-pr-summary) - Writes a summary of what changed into the pull request description or a comment. The 2024 study already in Research on Human Review measured this feature's predecessor: reviews 19.3 hours faster. *Limits: that study is observational on early adopters; the docs say it ignores the existing description and tell you to review the summary carefully.*
  - facts: closed source, paid Copilot tiers only (not Free) | source opened: yes | from: beyond lists | suggested sub-group: Read it in a sensible order. Note: if the editor prefers vendor-only evidence for tools, mark 🟡 and keep the study link in Limits.
- 🟡 [Sourcery reviewer's guide](https://docs.sourcery.ai/Code-Review/Overview/) - Every review posts a summary of the change's purpose and risk, plus a reviewer's guide comment that maps the change file by file and says how to verify it. *Limits: the docs point to its own analytics on cycle time, no published numbers on understanding.*
  - facts: closed source, hosted | source opened: yes | from: beyond lists | suggested sub-group: Read it in a sensible order
- 🟡 [Greptile PR summary](https://www.greptile.com/docs/code-review/first-pr-review) - A plain-language summary of what the pull request does and who it affects, a diagram picked by what changed (sequence, entity relation, class or flow) and a 0 to 5 merge confidence score. *Limits: the confidence score mixes bug count, complexity and pattern fit, with no accuracy figures.*
  - facts: closed source, hosted | source opened: yes | from: awesome-ai-code-review (kodustech) | suggested sub-group: Read it in a sensible order
- 🟡 [PR-Agent](https://github.com/The-PR-Agent/pr-agent) - Open source. `/describe` writes a pull request description and file walkthrough, `/ask` answers free-text questions about the change. Donated by Qodo and now community-maintained. *Limits: no published evaluation of the descriptions; Qodo's hosted product is a separate thing.*
  - facts: stars 16520, created 2023-07, pushed 2026-11, licence MIT | source opened: yes | from: beyond lists (Qodo Merge named in brief) | suggested sub-group: Read it in a sensible order
- 🟡 [What The Diff](https://whatthediff.ai/) - Writes a plain-English description of each pull request's diff, and short summaries for non-technical teammates by Slack or email. *Limits: support comes from user quotes only; reads the diff alone, not the rest of the codebase.*
  - facts: closed source, hosted | source opened: yes | from: beyond lists | suggested sub-group: Read it in a sensible order
- [ReviewStack](https://sapling-scm.com/docs/addons/reviewstack/) - Open source. Swap github.com for reviewstack.dev in a pull request URL to review a stack one commit at a time, with a dropdown to move through the stack. *Limits: its docs say it is less complete than GitHub's own UI, especially for large pull requests.*
  - facts: part of meta/sapling, stars 7262, created 2016-05, pushed 2026-11, licence GPL-2.0 | source opened: yes | from: beyond lists | suggested sub-group: Read it in a sensible order
- [ghstack](https://github.com/ezyang/ghstack) - Open source. Submits each commit of a local stack as its own GitHub pull request. With `automsg` set, Claude or Codex writes the update note from the interdiff against what was last submitted, so a reviewer sees what changed since the last look.
  - facts: stars 1019, created 2018-10, pushed 2026-11, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: Read it in a sensible order
- [difftastic](https://github.com/Wilfred/difftastic) - Open source. A structural diff that compares syntax trees in 30+ languages, so reformatting and line splits don't show as changes. Works as git's diff tool. *Limits: its README lists poor scaling on files with many changes and a side-by-side view that "can be confusing".*
  - facts: stars 26224, created 2018-12, pushed 2026-11, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: Read the diff yourself
- 🟡 [SemanticDiff](https://semanticdiff.com/) - A language-aware diff for VS Code and GitHub pull requests that hides formatting-only changes and highlights moved code and renames. *Limits: "understand code changes faster" comes with no data; closed source.*
  - facts: closed source, VS Code extension and GitHub App | source opened: yes | from: beyond lists | suggested sub-group: Read the diff yourself
- [diffsitter](https://github.com/afnanenayet/diffsitter) - Open source. A tree-sitter diff that ignores formatting and can filter which kinds of syntax nodes count. *Limits: its README says it is "nowhere close to production ready".*
  - facts: stars 2412, created 2020-06, pushed 2026-11, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: Read the diff yourself
- [Reviewable](https://docs.reviewable.io/files) - A review UI on GitHub pull requests that records which revision of each file each reviewer has seen, so the next diff shows only what is new to you. Survives rebases and auto-groups renamed, vendored and reverted files.
  - facts: closed source, hosted | source opened: yes | from: awesome-code-review (joho) | suggested sub-group: Read the diff yourself
- 🟡 [Git AI](https://github.com/git-ai-project/git-ai) - Open source. Agents report the lines they wrote, and a git extension stores them in git notes, so `git ai blame` shows which lines came from which agent, model and prompt. Attribution survives rebase, squash and cherry-pick. *Limits: "never lose the intent" is a claim; renames are not tracked and the prompt store is in the paid tier.*
  - facts: stars 3003, created 2025-07, pushed 2026-11, licence Apache-2.0 | source opened: yes | from: beyond lists (named in brief) | suggested sub-group: Check what the agent says it did
- 🟡 [Entire CLI](https://github.com/entireio/cli) - Open source. Saves each agent session (prompts, transcript, files touched) as a checkpoint linked to the commit, which `entire checkpoint explain` shows. Its Trails page shows a change with scores from review agents in place of the raw diff. *Limits: Trails need Entire hosting; transcripts are pushed to the remote, public if the repo is.*
  - facts: stars 5354, created 2026-01, pushed 2026-11, licence MIT | source opened: yes | from: beyond lists | suggested sub-group: Check what the agent says it did
- [Copilot cloud agent session logs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/track-copilot-sessions) - Each commit from Copilot's cloud agent links to its session log: the reasoning, tools used, and tests and linters it ran. *Limits: only for Copilot's own agent; the log is the agent's account of itself.*
  - facts: closed source, GitHub | source opened: yes | from: beyond lists | suggested sub-group: Check what the agent says it did
- 🟡 [SpecStory](https://github.com/specstoryai/getspecstory) - Open source CLI. Saves sessions from Claude Code, Codex, Cursor and others as Markdown under `.specstory/history/`, so the conversation behind a change can be read next to it. *Limits: not linked to specific lines or commits; the IDE extensions are closed source.*
  - facts: stars 1377, created 2024-12, pushed 2026-11, licence Apache-2.0 | source opened: yes | from: beyond lists (named in brief) | suggested sub-group: Check what the agent says it did

## Rejected

- Graphite AI reviews: opened docs; a bug finder ("focuses on real bugs"), doesn't explain the change. Its stacking is already covered by the GitHub stacked PRs entry.
- Baz: opened home page; review and severity, nothing about explaining the change.
- Cursor Bugbot, Korbit, Ellipsis, Optibot, Kodus: bug finders; Cursor Bugbot is listed in awesome-ai-code-review. Not opened further.
- AI Change Passport (P-r-e-m-i-u-m/ai-change-passport): opened; a deterministic report on sensitive files and dependency or workflow edits in an agent PR, fits the section, but 1 star and 4 commits. Watch.
- Aviator av: stacked PR CLI (stars 512, MIT, pushed 2026-11); nothing for the reviewer beyond GitHub; ghstack and ReviewStack cover stacks.
- delta (dandavison): a syntax-highlighted line diff pager, not structural or agent-specific.
- GitButler: a branch and commit manager for the author, not a review view.
- Viezly (from joho list): not opened; could not confirm it is alive.
- Gerrit: not opened this pass; patchset-to-patchset compare is the relevant feature, as general as Reviewable.
- h5i, Signum, prpack (kodustech list): agent-side review pipelines or LLM input packers, nothing shown to a person.

## Where I searched / where I did not / failed queries

- Awesome lists used: joho/awesome-code-review (stars 5192, last push 2024-09) and kodustech/awesome-ai-code-review (stars 54, pushed 2026-06, maintained by a vendor). Most candidates came from beyond the lists.
- Opened: every candidate's primary page via fetchira read (default router and serper for search); GitHub facts via `gh api repos/...`.
- Failed: GitHub search API hit its rate limit after the first query, so no topic search for provenance or session replay tools. ACM DL and Semantic Scholar showed bot checks; the Baum paper was read from the author PDF instead. Greptile's older summaries doc required sign-in; the current docs page worked.
- Not searched: Gerrit docs, Korbit and Ellipsis pages, papers on untangling commits after 2015 (for example EpiceaUntangler), JetBrains and VS Code review features.
