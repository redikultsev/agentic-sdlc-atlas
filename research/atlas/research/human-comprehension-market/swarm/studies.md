# Research on Human Review: controlled studies with people

## Verdict on the main claim

The current sentence ("No published study checks whether a code map, a wiki or a guided pull request tour makes a person decide both faster and more correctly") **breaks as written**. At least three controlled experiments measured both time and correctness on people and found both improved:

- CodeCity (a 3D code map), ICSE 2011, 41 participants from academia and industry: **+24% correctness and -12% completion time** against Eclipse plus Excel, statistically significant.
- Code Bubbles (a working-set code view), CHI 2010, 20 students: **33.2% faster** over two bug-fixing tasks and significantly more tasks finished.
- Lacy (expert-curated guided code tours), FSE 2026, 5 learners at one company: **83% vs 57% quiz score and about 25 vs 35 minutes** against AI-only tours.

What still holds: none of these tested code written by AI, none tested a current LLM-generated map or wiki (Floorplan, Understand Anything, DeepWiki style), none measured a merge decision on a pull request, and the strongest one (CodeCity) is from 2011 and run by the tool's authors. The only experiment on a guided tour has 5 learners and no no-tour baseline.

Suggested rewording: "Old controlled experiments show code maps can make people both faster and more correct (CodeCity, 2011: +24% correctness, -12% time). No study tests a current AI-generated map, wiki or pull request tour on code written by AI, and the experiments on AI help for review mostly find no time saved and new blind spots."

## Candidates

### Maps and visualization

- 🟢 [Software Systems as Cities: A Controlled Experiment](https://wettel.github.io/download/Wettel11a-icse.pdf) - 2011. Measured on people: 41 participants (20 industry practitioners) answered program comprehension questions about real Java systems; CodeCity, a 3D city map of the code, gave +24% correctness and -12% completion time against Eclipse plus Excel, statistically significant. *Limits: built and tested by the tool's authors; metric and structure questions on human-written code, not change review; on focused tasks needing precise answers CodeCity did no better.*
  - facts: ICSE 2011, DOI 10.1145/1985793.1985868 | source opened: yes (full PDF, abstract and conclusion) | from: beyond lists (named in task, confirmed) | suggested sub-group: Maps and visualization
- 🟢 [LACY: Simulating Expert Mentoring for Software Onboarding with Code Tours](https://arxiv.org/abs/2603.25391) - 2026. Measured on people: within-subjects study at one company on a 30K+ line legacy system; with expert-curated, AI-assisted code tours, 5 learners scored 83% on quizzes against 57% with AI-only tours and finished in about 25 instead of 35 minutes. Learners did not perceive the difference (3.4 of 5). *Limits: 5 learners, 2 experts, one system; no baseline without tours; built by the authors with the company.*
  - facts: accepted at ACM FSE 2026; code and instruments released | source opened: yes (arXiv PDF) | from: beyond lists | suggested sub-group: Maps and visualization (guided tours)
- 🟢 [Code Bubbles: A Working Set-based Interface for Code Understanding and Maintenance](https://cs.brown.edu/people/spr/codebubbles/CHI-final.pdf) - 2010. Measured on people: 20 students fixed two bugs in a 2,658-line Java app; with Code Bubbles they were 33.2% faster over both tasks, finished significantly more tasks and spent 3.5 instead of 11.6 minutes navigating, against Eclipse. *Limits: students, one small app, task 2 alone not significant; a working-set view, not a whole-codebase map.*
  - facts: CHI 2010 | source opened: yes (full PDF) | from: beyond lists (named in task) | suggested sub-group: Maps and visualization
- 🟢 [CodeCity: A comparison of on-screen and virtual reality](https://www.sciencedirect.com/science/article/pii/S0950584922001732) - 2023. Measured on people: two controlled experiments, 24 and 26 participants from academia and industry; the VR version of CodeCity was much faster than on-screen with comparable correctness. *Limits: compares two versions of the same map, not a map against no map.*
  - facts: Information and Software Technology vol. 153, open access | source opened: yes (abstract and highlights) | from: beyond lists | suggested sub-group: Maps and visualization
- 🟢 [Understanding Codebase like a Professional! Human-AI Collaboration for Code Comprehension](https://arxiv.org/abs/2504.04553) - 2025. Measured on people: CodeMap, an LLM-backed interactive code map, tested with 9 experienced and 6 novice developers; it cut reliance on reading LLM responses by 79% and raised map usage time by 90% against a static visualization tool, and improved perceived understanding. *Limits: 15 people; reports perceived understanding and usage, not correctness of answers or decisions.*
  - facts: arXiv cs.HC, v3 2026-02 | source opened: yes (arXiv PDF abstract) | from: beyond lists | suggested sub-group: Maps and visualization
- 🟢 [A Systematic Literature Review of Software Visualization Evaluation](http://scg.unibe.ch/archive/papers/Meri18a.pdf) - 2018. Of 181 SOFTVIS/VISSOFT papers with an extractable evaluation, 62% of the proposed visualizations had no evaluation or only a weak one. *Limits: covers papers up to 2017; counts evaluation quality, not effect sizes.*
  - facts: Journal of Systems and Software 144, DOI 10.1016/j.jss.2018.06.027 | source opened: yes (full PDF) | from: beyond lists (named in task) | suggested sub-group: Maps and visualization

### AI explanations

- 🟢 [Programmers Are Poor and Overconfident Judges of LLM-Generated Assertions](https://arxiv.org/abs/2607.08885) - 2026. Measured on people: controlled experiment with 86 Python programmers. They judged correct LLM assertions right 74% of the time but incorrect ones only 49%, with the same confidence (OR = 2.94, p < 0.001). Natural-language explanations gave no overall benefit; low-quality explanations lowered accuracy (OR = 0.58, p = 0.037) while raising confidence (3.99 vs 4.25 of 5). *Limits: postcondition assertions, not whole changes or maps.*
  - facts: arXiv 2607.08885, July 2026 | source opened: yes (arXiv PDF) | from: beyond lists | suggested sub-group: AI explanations
- 🟢 [Using an LLM to Help With Code Understanding](https://arxiv.org/abs/2307.08177) - 2024. Measured on people: 32 participants worked on unfamiliar code with an in-IDE GPT-3.5 explainer (GILT) or with web search. With GILT they finished 0.47 more sub-tasks (p < 0.01), but completion time and code understanding quiz scores showed no significant difference; the gain was significant only for professionals. *Limits: progress, not correctness of understanding; GPT-3.5 era.*
  - facts: ICSE 2024, DOI 10.1145/3597503.3639187 | source opened: yes (arXiv PDF, Table 1) | from: beyond lists (named in task) | suggested sub-group: AI explanations
- 🟢 [A Human Study of Comprehension and Code Summarization](https://dijkstra.eecs.umich.edu/kleach/icpc2020-code-summarization.pdf) - 2020. Measured on people: 45 students and professionals answered comprehension questions on Java methods with summaries; they did significantly better with human-written than machine-generated summaries (p = 0.029), yet did not perceive the two as different, and their performance did not correlate with BLEU or ROUGE. *Limits: pre-LLM neural summarizers.*
  - facts: ICPC 2020, DOI 10.1145/3387904.3389258 | source opened: yes (full PDF abstract) | from: beyond lists | suggested sub-group: AI explanations

### Reviewing AI-written changes

- 🟢 [The Effect of Complexity and Provenance on Code Review Decisions](https://www.zora.uzh.ch/server/api/core/bitstreams/a54a1002-e14e-47f4-b957-2279662becde/content) - 2026. Measured on people: between-subjects experiment with 385 participants deciding to accept or reject a suggested code revision. Higher code complexity significantly increased acceptance of incorrect suggestions (p < .05); labelling the suggestion as AI or human had no statistically supported effect, and no supported interaction with complexity. *Limits: one changeset, one suggestion per person.*
  - facts: FSE 2026 (PACMSE 3), DOI 10.1145/3808165, CC BY 4.0 | source opened: yes (published PDF) | from: list mgreiler/awesome-code-review-research (its summary overstates the interaction; the paper says no supported moderation) | suggested sub-group: Reviewing AI-written changes
- 🟢 [Deep Learning-based Code Reviews: A Paradigm Shift or a Double-Edged Sword?](https://arxiv.org/abs/2411.11401) - 2025. Measured on people: 29 professional developers, over 50 hours of recorded reviews, with or without an LLM-generated review as a starting point. Reviewers focused on the locations the LLM pointed at, found more low-severity issues but not more high-severity ones, saved no time and were not more confident. *Limits: seeded issues in small programs.*
  - facts: ICSE 2025, DOI 10.1109/ICSE55347.2025.00060 | source opened: yes (arXiv PDF) | from: list mgreiler/awesome-code-review-research | suggested sub-group: Reviewing AI-written changes
- 🟢 [AI-Assisted Fixes to Code Review Comments at Scale](https://arxiv.org/abs/2507.13499) - 2026. Measured on people at Meta: in a randomized controlled safety trial, showing reviewers AI-suggested patches made reviews take over 5% longer, because reviewers checked the AI patches; showing the suggestions only to authors removed the regression. *Limits: measures review time, not defects caught.*
  - facts: FSE 2026 Industry Track | source opened: yes (arXiv PDF) | from: list mgreiler/awesome-code-review-research | suggested sub-group: Reviewing AI-written changes
- 🟢 [Same Scrutiny, More Time: Eye Tracking Insights into Reviewing LLM-Labelled Code](https://arxiv.org/abs/2606.26505) - 2026. Measured on people with eye tracking: Wizard-of-Oz experiment with 32 software engineers; code labelled as LLM-generated got longer total fixation (95% CI 0.09 to 0.56, up to 15 extra seconds on longer segments) but no change in how thoroughly it was read. *Limits: attention, not defects found.*
  - facts: arXiv 2606.26505 v2, Aug 2026 | source opened: yes (arXiv PDF) | from: beyond lists | suggested sub-group: Reviewing AI-written changes
- 🟢 [A Study on Developer Behaviors for Validating and Repairing LLM-Generated Code Using Eye Tracking and IDE Actions](https://arxiv.org/abs/2405.16081) - 2024. Measured on people: 28 participants validated and repaired Copilot-generated code in three projects. Without being told, they often did not notice the code came from an LLM; the group told the provenance fixed more bugs (success rate 0.577 vs 0.446, p = 0.042), searched more and reported higher workload. *Limits: 28 people; Singh et al. 2026 found no label effect on accept or reject decisions.*
  - facts: VL/HCC 2024 | source opened: yes (arXiv PDF) | from: beyond lists | suggested sub-group: Reviewing AI-written changes
- 🟢 [First Come First Served: The Impact of File Position on Code Review](https://arxiv.org/abs/2208.04259) - 2022. Measured on people: online controlled experiment with 106 participants; for one of two seeded defects, odds of finding it were 64% lower when its file came last rather than first. Supports tools that reorder a diff. *Limits: human-written code; one defect type showed no effect.*
  - facts: ESEC/FSE 2022, Distinguished Paper | source opened: yes (arXiv abstract) | from: list mgreiler/awesome-code-review-research | suggested sub-group: Reviewing AI-written changes
- 🟢 [The effects of change decomposition on code review: a controlled experiment](https://pmc.ncbi.nlm.nih.gov/articles/PMC7924728/) - 2019. Measured on people: 28 professionals and graduate students reviewed one tangled pull request or the same change split in two; splitting reduced wrongly reported issues but changed neither defects found nor understanding of the change rationale. *Limits: relevant to stacked agent pull requests, but human-written code.*
  - facts: PeerJ Computer Science 2019 | source opened: yes (full text) | from: beyond lists | suggested sub-group: Reviewing AI-written changes
- 🟢 [Associating Working Memory Capacity and Code Change Ordering with Code Review Performance](http://tobiasbaum.github.io/rp/memoryCodeOrderAndReview.pdf) - 2019. Measured on people: 50 participants, mostly professionals, reviewed changes with seeded defects; small changes were reviewed significantly more effectively, working memory was moderately linked to finding delocalized defects, and the effect of the order of change parts could not be concluded. *Limits: ordering was the hypothesis a tour tool would rely on, and it was not confirmed.*
  - facts: Empirical Software Engineering 2019, DOI 10.1007/s10664-018-9676-8 | source opened: yes (author PDF) | from: beyond lists | suggested sub-group: Reviewing AI-written changes

## Rejected

- Rethinking Code Review Workflows with LLM Assistance (arXiv 2505.16339, ESEM 2025): field experiment reports preferences only, no time or defect numbers in the abstract.
- ChatGPT: Friend or Foe When Comprehending and Changing Unfamiliar Code (arXiv 2605.10702): exploratory, 10 students, process not outcome.
- AI-Guided Exploration of Large-Scale Codebases (arXiv 2508.05799): proposal, no user evaluation.
- From Preventive to Reactive (arXiv 2605.23130): interviews and observation of 15 engineers, no controlled comparison.
- The Impact of LLMs on Code Review Process (arXiv 2508.11034) and RovoDev Code Reviewer (Atlassian, ICSE SEIP 2026): observational before/after, not controlled; cycle time not correctness. Not opened in full.
- Cihan et al., Automated Code Review in Practice (ICSE SEIP 2025): industrial mixed methods, not controlled. Seen only via list summary.
- Design of an Eye-Tracking Study on AI-assisted code summarization (ACM ETRA 2025 short): study design, no results.
- Debugger Canvas and Sourcetrail: no controlled evaluation with numbers found in this pass; not searched deeply.
- How AI Impacts Skill Formation (arXiv 2601.20245): already in the list.

## Where I searched / where I did not / failed queries

- Awesome lists: mgreiler/awesome-code-review-research (50 stars, pushed 2026-07, same content as awesomecodereviews.com research overview) gave Singh 2026, Tufano 2025, Maddila 2026 and Fregnan 2022. cafour/awesome-softvis (3 stars, pushed 2023-10) had nothing on evaluation. kodustech/awesome-ai-code-review seen in search, not read.
- Web search via fetchira (serper, tavily): CodeCity, GILT, Code Bubbles, Merino SLR, Stapleton, Baum, untangling, eye tracking on LLM code, LLM code review experiments, onboarding with LLMs, VR CodeCity. All primary sources opened from arXiv, author PDFs, ScienceDirect or PMC.
- Not searched: Debugger Canvas (DeLine 2012) and Sourcetrail in depth; ICPC and VISSOFT proceedings beyond the above; Perry et al. 2023 (insecure code with AI assistants) and Kabir et al. 2024 (ChatGPT answers on Stack Overflow) as adjacent work; DeepWiki or other AI wiki evaluations on people (none surfaced).
- Failed: jina read of the GILT HTML returned nothing (used the PDF instead). The Code Bubbles ICSE 2010 paper reports only a qualitative study and simulation; the timed experiment is in the CHI 2010 paper, which is the one cited.
