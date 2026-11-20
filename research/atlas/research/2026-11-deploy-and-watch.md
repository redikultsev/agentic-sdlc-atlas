# Deploying and watching agent changes

Research of 2026-11-20, three parallel searches: where the approval of risky changes sits, staged rollout and automatic rollback, watching changes after deploy and the follow-up after a rollback. All web access through the fetchira router (serper).

## Answer

1. A separate "deploy?" gate after merge does not hold on a main that deploys itself: the next automatic deploy of main ships the waiting risky change. No source uses that shape. Risky changes are approved before main (GitHub branch deploys, GitHub schema migrations, Meta RADAR), or the merged code stays off behind a flag until someone turns it on (Shopify, Fowler's expand–contract).
2. Every documented system rolls back automatically on a deterministic or statistical check; a human is asked only on an inconclusive result. AWS: the rollback is often running before the on-call engineer is paged.
3. Rollout is staged everywhere: one box or 5–20% of traffic, a bake time, then wider waves.
4. Comparing metrics before and after a deploy is the pattern Google's SRE Workbook calls risky (time of day and traffic confound it). The usual check compares the canary with the stable version at the same time.
5. No source uses an LLM to make the canary pass or fail call. LLMs explain after the fact, find the cause, draft the fix.
6. Database migrations are not rolled back automatically anywhere: roll forward, rename instead of drop, expand–contract.
7. After a rollback the documented follow-up is a notification to the author and a block on redeploying that commit; automated-change fleets also pause the source of bad changes by its revert history. No source creates a ticket, regression test or postmortem automatically from a rollback.

## Where the approval of risky changes sits

| Player | Where | Mechanism | Source | Date |
|---|---|---|---|---|
| GitHub (infrastructure repos) | Before merge | Branch deploy: deploy the PR branch, validate, then merge; main stays deployable | github.blog (branch deployments through IssueOps) | Feb 2023 |
| GitHub (MySQL schema) | Before merge, apart from the code deploy | DB team approves, gh-ost runs the migration, then the developer merges and deploys; DROP becomes RENAME | github.blog (automating MySQL schema migrations) | ~2020 |
| Meta RADAR | Before land | Risk score and eligibility gates; high-risk diffs go to human review; sensitive areas never auto-land | arxiv.org/html/2605.30208 | 2026 |
| Shopify | No human gate | Merge queue, canary 5% for 10 min with automated analysis, then production; risky features behind flags | shopify.engineering (release culture) | Apr 2020 |
| GitLab | After merge, on the environment | Every job deploying to a protected environment waits for approval | docs.gitlab.com (deployment approvals) | current |
| GitHub Actions | After merge, on the environment | Required reviewers; a newer queued run cancels the pending one (snippet) | docs.github.com | current |
| OpenAI Codex harness | Minimal gates | Agents merge their own PRs and escalate only when judgment is needed | openai.com/index/harness-engineering | Feb 2026 |

## Rollout and rollback

| Player | Rollout | Rollback decided by | Metrics, bake time | Source | Date |
|---|---|---|---|---|---|
| Amazon | Pre-production, one box, then waves of ≤33% | Automatic on an aggregate alarm; on-call paged in parallel | Faults, latency p50–p99, errors; bake ≥1 h after one box, ≥12 h after the first wave; no deploys at night or weekends | builder.aws.com (safe hands-off deployments) | Jun 2020 |
| AWS AppConfig | 20% every 6 min, or canary 10% for 20 min | Automatic on an alarm | Bake 10–30 min | docs.aws.amazon.com | current |
| Argo Rollouts | 20/40/60/80% with pauses | Automatic abort on a failed analysis; inconclusive waits for a human | Success rate ≥0.95 every 5 min | argo-rollouts.readthedocs.io | current |
| Flagger | 5% steps up to 50% | Automatic after N failed checks | Success ≥99%, latency ≤500 ms | docs.flagger.app | current |
| Spinnaker / Kayenta | Canary vs a baseline started at the same time | Score; marginal may go to a human | Mann-Whitney U at 98% | spinnaker.io | Feb 2026 |
| Harness CV | Canary vs primary, or before/after | Step fails, rollback runs | Sigma thresholds; warns that before/after gives false positives | developer.harness.io | current |
| Headout (Argo) | 10% → 50% → 100% | Automatic | False rollbacks fell from 5 to 1 a week after switching from "vs the previous hour" to canary vs stable | backstage.headout.com | current |
| Google SRE | Smallest canary first | "Roll back first, diagnose afterwards" | SLIs over CPU; before/after is risky | sre.google/workbook/canarying-releases | book |

## Watching and the follow-up

| Player | Batching | Watch and revert | After a rollback | Source | Date |
|---|---|---|---|---|---|
| Meta RADAR | Per diff, caps per runbook a day, landing windows | Reverts and incidents tracked per diff; a source is paused or denylisted by its record; revert rate 1/3 of other diffs | Eligibility drops | arxiv.org/html/2605.30208 | 2026 |
| Google | Submit queue batches | SafeRevert reverts only at >99% culprit confidence; wrong reverts are "unacceptable toil" | Revert only | ICST 2024 | 2024 |
| Spotify Fleetshift | Bot PRs, owners' working hours only | Each automerged PR correlated with failed deploys; cohorts from least to most critical | Alert to the author | engineering.atspotify.com | May 2023 |
| Uber | Each commit deployed per service | Soak time, deploy window, no firing alerts; tiers 5 → 0 within 24 h | The commit is blocked until a fix is included; author notified | uber.com blog | Aug 2025 |
| Shopify | 8 PRs per deploy | Larger batches are harder to isolate and roll back more | Queue locked during incidents | shopify.engineering | Nov 2019 |
| Sentry | — | Links a production error to the suspect commit | Assigns the issue to its author | docs.sentry.io | current |
| incident.io / Rootly | — | — | Export follow-ups a human wrote; a Jira issue when an incident is declared | vendor docs | current |

## Not verified or not found

- Netflix, Google's internal canary service, Cloudflare and AWS CodeDeploy rollback: snippets only or not read.
- Google, Etsy and Stripe deploy gating; Devin, Factory, Cursor and Copilot on post-deploy monitoring: not found.
- False-rollback rates across the industry: only Headout's numbers.
- Automatic bisection of a bad production batch: not found, only CI culprit finding.
- The race "an automatic deploy of main ships a waiting risky change" is not named by any source; it follows from GitLab's and GitHub's documented gate semantics.
