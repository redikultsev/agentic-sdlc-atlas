# Acceptance criteria or separate scenarios?

Research of 2026-11-20, four parallel searches: spec-driven tools, classic BDD, evidence for LLM agents, arguments against. All web access through the fetchira router (serper).

## Answer

One artifact, not two. Write acceptance criteria as behaviour, each with a few concrete key examples (input → expected outcome, boundary values, what must not happen). That is what the BDD originators meant by scenarios, and it is what the strongest agent pipelines execute. A second, separate scenario document mostly duplicates the criteria, drifts from them and doubles the review. Independence comes from who checks (a separate Validator running the app), not from a second document.

## Why

**Criteria and scenarios are the same thing at two levels of concreteness.**
- Dan North (2006): "A story's behaviour is simply its acceptance criteria"; BDD wrote criteria as Given/When/Then scenarios.
- Liz Keogh (2011): criteria are rules, scenarios are concrete examples of them; keep criteria alone when the examples are obvious.
- Antony Marcano (2011): keeping rule-criteria and scenarios separately means checking both, silos, and "rules expressed in two places"; merge them into scenario-oriented criteria.
- Matt Wynne, Example Mapping (2015): "some rules are so obvious you don't need examples at all"; formal Gherkin in discovery is "generally a bad idea".

**Concrete examples are what helps an agent.**
- Tests or examples in the prompt: +8.5 to +12.8 points on HumanEval/MBPP for GPT-4, also on unseen tests (Mathews & Nagappan, ASE'24).
- Clarifying intent through concrete tests: +46 points pass@1 on average (TiCoder, TSE 2024); clarifying questions: GPT-4 70.96% → 80.80% (ClarifyGPT, FSE'24).
- Executable checks beat reading: reproduction tests double SWE-Agent's precision (SWT-bench, NeurIPS 2024); an agentic judge that inspects the workspace agrees with humans 90–92% vs 60–71% for a plain LLM judge (Agent-as-a-Judge, ICML 2025).
- Anthropic's long-running harness: the evaluator caught bugs against concrete, testable "sprint contract" lines (27 in one sprint), not against high-level prose; n=1, no ablation.
- Limit: no controlled study at product level compares a separate scenario document with concrete criteria.

**Two artifacts cost more than they give.**
- Böckeler (Thoughtworks, Oct 2025): spec-kit markdown "repetitive … very verbose and tedious to review"; Kiro turned a small bug into 4 stories and 16 criteria; "a false sense of control".
- Adzic (2014): many scenarios give "an illusion of precision and completeness"; five boundary examples gave "90% of the value" of twenty pages. Adzic (2020): one document that is both spec and test cannot drift; examples used as criteria correlate with higher quality (22% vs 8% "great", survey of 514, biased sample).
- HumanLayer (2026, secondary summary): plans diverged from code, reviewers had to read both; models reliably follow ~150–200 instructions.
- BDD maintenance survey (SANER 2018, 75 practitioners): duplication makes specs hard to extend (61%), slows suites (49%); .feature files drift from code (MSR 2019).
- Tests are not ground truth either: 59.4% of audited SWE-bench Verified tasks had flawed tests or descriptions; 35.5% tested implementation details (OpenAI, Feb 2026). Criteria must stay at behaviour level.

**How tools do it.**
- Criteria only: Kiro (EARS criteria → property-based tests), Copilot agent, Tessl, Pocock's skills.
- Criteria plus Given/When/Then in one spec, AI-written, not executed: GitHub Spec Kit, OpenSpec.
- A separate executable layer run by a fresh agent: Factory (validation contract), StrongDM (holdout scenarios), Anthropic (sprint contract), Devin (one end-to-end test plan after the PR), BMAD (test architect module).

## What makes a criterion checkable by an agent

1. Observable from outside: status, screen, stored row, file; never intent ("properly implemented").
2. One criterion, one check with an expected result.
3. A few concrete examples inline: input → output, boundary values.
4. Negative and scope criteria: what must not change or happen.
5. Few criteria, grouped by business rule; a long list means a missing concept.
6. Behaviour, not implementation.
7. Written and approved by a human at the spec gate.

## Not verified or not found

- No controlled product-level comparison of scenarios vs concrete criteria.
- Adzic's book, Atlassian guidance, Bill Wake's INVEST original, Kent Beck's own SDD critique: not read.
- HumanLayer's talk: secondary summary only. Anthropic harness: no publication date on the page.
