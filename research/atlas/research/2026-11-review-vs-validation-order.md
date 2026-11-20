# White-box review or black-box validation first?

Research of 2026-11-20, three parallel searches: order in agent products and pipelines, classic delivery practice, cost and trade-offs in agent pipelines. All web access through the fetchira router (serper).

## Answer

Cheap and deterministic first, expensive last, and a check whose findings change code before a check that would then have to be repeated: CI → white-box AI review → black-box validation. Any code change after a pass invalidates that pass; re-run what the change touched. The validator stays blind to the reviewer's verdict. No controlled study compares the two orders; the recommendation rests on cost numbers, classic pipeline practice and what most pipelines with an explicit validation phase do.

## Cost of each check

- White-box LLM review: about $1–25 and 1.5–20 min (Cursor Bugbot ~90 s, $1–1.50 per run, vendor figures via a third party, Jun 2026; Anthropic Code Review $15–25, ~20 min).
- Black-box agentic validation: about $3–30 per pass and 5–10+ min, and flakier. Anthropic harness QA pass $3.09–4.06, 6.8–9.6 min (Mar 2026). Slack Engineering, 200+ agentic E2E runs: $15–30 per run, 5–11 min, 0–20% failures, many from infrastructure; "does not yet fit high-frequency CI" (Jun 2026).
- The expensive part of a failed check is the rebuild round it triggers, not the check itself: QA was ~8% of the Anthropic harness cost.

## Order in practice

| Player | First | Then | Source | Date |
|---|---|---|---|---|
| Factory Missions | Scrutiny validator: tests, types, lint, code review | User-testing validator: black-box run against the validation contract | factory.com/news/missions-architecture (order from an unofficial prompt) | Apr 2026 |
| Devin | CI and Devin Review; review comments addressed | Browser end-to-end test with video, "after CI is green and any review comments are addressed" | docs.devin.ai (testing and recordings) | 2026 |
| Spotify Honk | Format, build, test | LLM judge on the diff, after all verifiers | engineering.atspotify.com | Dec 2025 |
| Google | Analyzers and presubmit tests | Human review, then commit | Software Engineering at Google, ch. 19 | 2020 |
| Fowler / Humble pipeline | Commit stage: fast tests | Acceptance stage, then manual checks, after review and merge | martinfowler.com/bliki/DeploymentPipeline.html | 2013 |
| OpenAI Codex harness | Agent drives the app and validates | Agent-to-agent review | openai.com/index/harness-engineering | Feb 2026 |
| Cursor | Cloud agent tests in its VM | Bugbot reviews the PR | cursor.com/blog/agent-computer-use | Feb 2026 |
| Anthropic harness | One evaluator does both in one pass | — | anthropic.com/engineering/harness-design-long-running-apps | Mar 2026 |

Pipelines with an explicit validation phase put white-box first; pre-PR loops where the coder tests its own work (Codex, Cursor) test behaviour first.

## Trade-offs

- **Anchoring.** Showing a judge a prior verdict blocked 48% of error corrections and flipped 10% of correct judgements; warnings did not help (arXiv 2608.25869, CIKM'26). Keep the validator blind to the reviewer's verdict.
- **Fixes invalidate passes.** Factory re-validates after every fix; practitioners send review fixes back through the validator. Cursor re-reviews only the diff since its last run.
- **Rounds.** Factory's Slack-clone mission: every milestone converged in 2–4 rounds, none passed the first; validation took 37% of runtime.
- **What each catches.** Black-box caught stubbed or display-only features a diff review would miss (Anthropic harness); one case had 6,104 green tests on a feature that never worked. Review comments flag defects in only ~14–15% of cases at Microsoft and mostly small logic issues (Bacchelli & Bird 2013; Czerwonka 2015), so review does not replace functional testing.
- **Review after green CI.** Reviewers engage more on PRs whose builds passed (Rahman & Roy, MSR 2017); CI adoption cut review discussion without cutting PR updates (Cassee et al., SANER 2020).

## When to deviate

- Mostly UI or functional risk and an expensive reviewer: validate first.
- Wall-clock time matters more than tokens: run both in parallel and re-run both after any fix.
- Tasks the model already handles reliably: skip the agentic validator (Anthropic on Opus 4.6).

## Not verified or not found

- No controlled comparison of review-first vs validate-first.
- Factory's strict order comes from an unofficial reverse-engineered prompt.
- Bugbot figures are vendor-stated via a third party; Czerwonka 2015 seen in a snippet only.
