# How AI code review is built

Research of 2026-11-20, three parallel searches: commercial products, in-house systems at large companies, evidence on design choices. All web access through the fetchira router (serper).

## Answer

The common shape is a recall-first finder followed by a precision gate, with the PR summary as a separate output. But the strongest single gains came from a deeper single agent with tools and from removing whole categories of comments, not from adding agents or a judge. A single reviewer agent that reads the code base, verifies its own findings (ideally by running the code) and follows a "what not to flag" list is a sound design; a separate verifier is an upgrade to add when measured noise is high.

## Products

| Product | Agents | Noise filter | Summary | Source | Date |
|---|---|---|---|---|---|
| Cursor Bugbot | v1: 8 parallel passes on shuffled diffs; later one agentic loop with tools | v1: majority vote → category filter → validator model → dedupe. Agentic version needed more aggressive prompts. Resolution rate 52% → 70%+ (later "nearing 80%"); biggest gain from the agentic loop | Bugs only | cursor.com/blog/building-bugbot | Jan 2026 |
| Anthropic Code Review | Parallel bug-finding agents, scaled by PR size | Verification step, then severity ranking; <1% findings marked incorrect; $15–25, ~20 min | One overview comment | claude.com/blog/code-review | 2026 |
| Claude Code ultrareview | Fleet of reviewers in a cloud sandbox | Every finding independently reproduced | None | code.claude.com/docs/en/ultrareview | Nov 2026 |
| Greptile v3/v4 | v3: one agent loop over code search and learned rules; v4: a model per subtask | v3: precision from the agent challenging its own hypotheses; reviewing with a different model family than the code author: ~+10% bugs caught; running the code in a sandbox | — | greptile.com/blog (v3, v4, how to build) | Nov 2025 – Oct 2026 |
| CodeRabbit | Pipeline of agents | Verification layer against code, guidelines, config | Separate: summary, walkthrough, sequence diagrams, ordered change groups | coderabbit.ai/blog; docs.coderabbit.ai | Jun 2026 |
| GitHub Copilot review | One agentic tool-calling reviewer with memory, CodeQL and ESLint | No judge; tuned on production signals; silent on 29% of reviews; agentic switch +8.1% positive feedback | Summary exists, architecture not described | github.blog | Oct 2025 – Mar 2026 |
| Qodo / PR-Agent | Parallel specialists (correctness, standards, architecture, risk) | Judge agent merges, dedupes, drops low confidence; suppresses kinds the team dismisses | Separate tool `/describe` | docs.qodo.ai | 2026 |
| Devin Review | Bug catcher, custom reviewers, chat | Confidence and severity labels; Devin triages | Separate overview and guided tour | docs.devin.ai | 2026 |
| Ellipsis | Many small agents, parallel generators | Confidence → dedupe → hallucination check → similarity to past thumbs-down | — | nsbradford.com/blog/how-we-built-ellipsis | 2025 |

## In-house systems

| Company | Architecture | Filter | Result | What they changed | Source | Date |
|---|---|---|---|---|---|---|
| Uber uReview | Generators (bugs, best practices, security) → grader → dedup → category classifier | Confidence grader with per-category thresholds | 75% useful, 65% addressed (humans 51%) | Pruned readability, style, logging, minor-perf categories | uber.com/blog/ureview | Aug 2025 |
| Cloudflare | Coordinator plus up to 7 specialists; risk tier picks 2, 4 or 7+ | Coordinator dedups, drops speculative findings and nits | 1.2 findings per review; $0.98 median | "What NOT to flag" prompt sections | blog.cloudflare.com/ai-code-review | ~Apr 2026 |
| LinkedIn | Parallel subagents on different models | Agreement of 2+ agents raises confidence; single findings re-verified by another model | 63.9% acceptance (LLM-judged against merged code) | Thumbs-up called a vanity metric | linkedin.com/blog/engineering | 2026 |
| Atlassian Rovo Dev | One generator | Fact-check judge: "minimal impact"; actionability classifier: +15–20 pp | 38.7% resolved (humans 44.45%); PR cycle time −30.8% | Added the actionability filter | arxiv.org/abs/2601.01129 | Jan 2026 |
| Google AutoCommenter | One fine-tuned model | Per-rule thresholds, suppression of 17 rules | Useful 54% → 66% → 80% target | Suppressed rules, rewrote summaries | arxiv.org/abs/2405.13565 | May 2024 |
| Microsoft PRAssistant | One reviewer: comments, fixes, summary, Q&A | None described | 90% of PRs; completion time −10–20% | Fed into Copilot review | devblogs.microsoft.com | Jul 2025 |
| Spotify Honk | Judge on the coding agent's diff | Vetoed ~25% | — | Judge reportedly removed later (secondary source) | engineering.atspotify.com; infoq.com | Dec 2025 / Mar 2026 |
| Datadog BewAIre | One LLM classifier (security) | Suppression rules, shadow mode | False positives >10% → 0.03% | Prompt exclusions mattered more than model choice | datadoghq.com/blog | 2025 |

## Evidence on design choices

- No controlled single vs multi-agent comparison with the same model and budget exists.
- Atlassian ablation: an LLM fact-check judge added almost nothing; a cheap actionability classifier helped (+15–20 pp).
- Cursor: majority voting helped early; the larger gain came from one agentic loop with tools.
- Martian Code Review Bench (16,010 PRs): F1 of top tools sits in a narrow 52–65% band regardless of architecture.
- Single-pass PR-Agent at a company: 73.8% comments resolved, but PR closure time rose from 5h52m to 8h20m and developers complained of noise (ICSE-SEIP 2025).
- Agent-written PR descriptions: 1.7% contradict the code, most often describing changes never made; such PRs are accepted 28% vs 80% (MSR 2026). The summary should be checked against the diff, which favours the reviewer writing it rather than the coder.

## Not verified or not found

- Graphite, Sourcery, Gemini Code Assist internals; Copilot's summary pipeline; Greptile v4's false-positive mechanism.
- Meta, Mozilla, Atlassian numbers from abstracts; Spotify's removed judge from a secondary write-up.
