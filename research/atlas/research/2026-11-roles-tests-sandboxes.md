# Who writes code and tests, how tests are kept honest, where code runs

Research of 2026-11-20: three parallel searches over primary sources (company engineering blogs, product docs, papers). All web access through the fetchira router (serper). Pages marked "current" were read in November 2026.

## Findings in one place

1. **One writer.** In production one agent writes the code and its unit tests, usually test-first per slice: Stripe, Spotify, GitHub Copilot, OpenAI Codex, Google Jules, Amp, HumanLayer, Factory workers, Pocock's skills. Cognition (2026): multi-agent works when "writes stay single-threaded"; extra agents add intelligence, not actions.
2. **Independence goes into checking, not writing.** A fresh-context reviewer, judge or validator that never edits code: Spotify's LLM judge (vetoes ~25% of runs), Factory validators ("not their call" for workers), Cognition's no-shared-context reviewer, Jules' critic, Amp's Oracle, Claude Code's reviewer subagent and `/goal`. Reason: self-evaluation "confidently praises" mediocre work (Anthropic harness article); "self-evaluation bias" (Factory).
3. **Hidden acceptance checks are rare but strongest.** StrongDM keeps end-to-end "scenarios" outside the codebase "similar to a holdout set", because "a test, stored in the codebase, can be lazily rewritten to match the code". Factory's orchestrator writes a "validation contract" of behavioural assertions before features are defined; independent validators judge it black-box. SWE-bench hides grading tests from the agent.
4. **Gaming is real and prompts barely help.** Claude 3.7 card: special-casing and editing tests after repeated failures. METR (Jun 2025): o3 hacked in 30.4% of RE-Bench runs; 43× more often when the scorer was visible; "please do not cheat" had "nearly negligible effect". OpenAI (Baker et al., Mar 2025): monitor the chain of thought, do not train against it.
5. **A dedicated test-writer agent is mostly academic.** AgentCoder: separate test designer raised test accuracy from 61% to 88% (HumanEval) — function-level benchmarks only. Against: a second writer makes conflicting assumptions about APIs (Cognition, "actions carry implicit decisions"); multi-agent role-play shows minimal gains and 14 failure modes (Cemri et al., 2025).
6. **Sandbox: one disposable sandbox per task, everything that writes or runs code inside it.** Credentials to push stay outside (proxy or restricted branch); no agent can merge; the authoritative CI runs outside the sandbox. No player documents separate sandboxes per role.
7. **Parallel agents get separate machines, not worktrees.** Stripe: worktrees "wouldn't scale"; Ramp: no "rationing local checkouts or worktrees"; Codex, Cursor, Jules, Devin, Claude Code on the web: one VM or container per task.
8. **Network:** closed by default (Codex, Stripe, Copilot firewall, Claude Code on the web) vs open by default (Cursor, Jules, Modal, Ramp).

## Who writes tests, when, can the coder see them

| Player | Who writes tests | When | Coder sees/edits them | Source | Date |
|---|---|---|---|---|---|
| StrongDM software factory | Humans and agents curate end-to-end scenarios; an LLM judges satisfaction against digital twins of Okta, Jira, Slack | With the specs, before building | No: stored outside the codebase as a holdout | factory.strongdm.ai | Feb 2026 |
| SWE-bench | Upstream PR authors | Fixed before the run | No | openai.com/index/introducing-swe-bench-verified | Aug 2024 |
| AgentCoder (paper) | Separate test designer from requirements; executor runs them | In parallel with the programmer | Programmer sees only feedback | arxiv.org/abs/2312.13010 | May 2024 |
| Anthropic, Claude Code | Claude, test-first; commit tests, then implement "not to modify the tests"; independent subagents check overfitting | Before code | Yes; protected by commit, instruction, separate checker | code.claude.com/docs/en/best-practices | current |
| Factory Missions | Orchestrator: validation contract; workers: unit tests first; validators: black-box runs | Contract before features; tests before code per feature | Contract visible; verdict by independent validators | factory.com/news/missions-architecture | Apr 2026 |
| Kiro (AWS) | Property-based tests from EARS requirements | Design phase, before tasks | Yes | kiro.dev/docs/specs/correctness | Aug 2026 |
| OpenAI Codex | Codex writes code and tests; humans write acceptance criteria | Not test-first by doctrine | Yes | openai.com/index/harness-engineering | Feb 2026 |
| Cognition Devin | Test plan grounded in source, then computer-use testing; expected result annotated before each action | After the PR | Yes | cognition.com/blog/testing-development | 2026 |
| GitHub Copilot agent | Agent, per acceptance criteria in the issue; optional "testing specialist" custom agent | Per issue | Yes; no test-file protection found | docs.github.com (best practices) | current |

## Roles

| Player | Roles | One agent writes code and tests | Fresh context per step | Source | Date |
|---|---|---|---|---|---|
| Cognition Devin | Single-threaded writer, read-only helpers; Devin Review with no shared context; manager → child Devins | Yes | Reviewer: no shared context | cognition.ai/blog/dont-build-multi-agents; cognition.com/blog/multi-agents-working | Jun 2025; Apr 2026 |
| Anthropic harness | Planner → generator → evaluator (Playwright); ~20× a solo run; evaluator unnecessary within model reach on Opus 4.6 | Yes | Separate agents | anthropic.com/research/harness-design-long-running-apps | ~Mar 2026 |
| HumanLayer | Research → plan → implement, separate sessions; "subagents are about context control" | Yes | Yes | humanlayer.dev/blog/advanced-context-engineering | Aug 2025 |
| Stripe minions | Blueprint state machine: agent nodes "implement", "fix CI"; deterministic lint and push nodes | Yes | Per node | stripe.dev/blog/minions (part 2) | Feb 2026 |
| Spotify Honk | One agent, verifier tools, LLM judge on the diff | Yes | Judge sees diff and prompt only | engineering.atspotify.com (feedback loops, part 3) | Dec 2025 |
| Factory Missions | Orchestrator, workers (tests first, then code), validators (never fix) | Yes (worker) | Fresh worker per feature | factory.com/news/missions-architecture | Apr 2026 |
| AWS AI-DLC | 14 agents; developer agent codes, quality agent builds and tests at the end | Partly | Partly | awslabs.github.io/aidlc-workflows | current |
| Amp | Main agent, Task subagent, Oracle (advises, never edits), Librarian, Finder | Yes | Own context | ampcode.com/docs/models-and-subagents | current |
| Google Jules | Jules plus a critic that flags, never fixes | Yes | n/a | developers.googleblog.com (Jules critic) | Aug 2025 |
| Matt Pocock skills | to-tickets → implement (TDD at seams) → code review | Yes | Context cleared per ticket | github.com/mattpocock/skills | 2026 |

## Sandboxes

| Player | Sandbox | Lifetime | Network | Credentials / merge | Source | Date |
|---|---|---|---|---|---|---|
| Stripe minions | Devbox on EC2, warm pool (~10 s) | Per task | No internet, no prod; curated MCP | Pushes a branch; human reviews; CI outside, ≤ 2 rounds | stripe.dev/blog/minions (part 2) | Feb 2026 |
| Spotify Honk | Container, few binaries | Per job | "Virtually no access to surrounding systems" | Agent cannot push; fleet infra pushes; humans merge | engineering.atspotify.com | Dec 2025 |
| Ramp Inspect | Modal VM from a snapshot rebuilt every 30 min | Per session, snapshotted | Not stated; wired to Sentry, Datadog, Buildkite | Per-clone app token pushes; PR opened outside with the user's token | builders.ramp.com/post/why-we-built-our-background-agent | Jan 2026 |
| OpenAI Codex cloud | Container | Per task | Setup online, agent phase off by default | Secrets removed before the agent phase; output is a diff | developers.openai.com/codex/cloud | current |
| GitHub Copilot agent | Actions runner | Per session, ≤ 59 min | Firewall on by default | One `copilot/` branch, no merge; CI waits for human approval | docs.github.com (risks and mitigations) | current |
| Cursor cloud agents | VM on AWS | Per agent | Open by default | Pushes a branch, opens PRs | cursor.com/docs/cloud-agent | current |
| Google Jules | Fresh VM per task | Per task | Internet on | Result is a PR | jules.google/docs/faq | current |
| Claude Code on the web | Managed VM | Per session | Limited by default | Git credentials never enter the VM; proxy checks scope and branch | code.claude.com/docs/en/claude-code-on-the-web | current |
| Claude Code local | bubblewrap / seatbelt around bash | Session | Proxy with domain allowlist | User's own | anthropic.com/engineering/claude-code-sandboxing | Oct 2025 |
| Factory droids | Prebuilt environment images | Fresh per run | Admin allowlists | As user or service account | factory.com/news/droids-now-have-a-fleet-of-sandboxes | Oct 2026 |
| E2B / Modal / Daytona | Firecracker microVM / gVisor or VM / own kernel | Caller-defined | Modal open by default with allowlists; Daytona per-sandbox firewall | — | vendor docs | current |

## Not verified or not found

- Claude 4 system card figures (hard-coding down ~67–69%) are quoted through Simon Willison, PDF not opened.
- "One Claude writes tests, another writes code" appears only on mirrors of Anthropic's best practices, not on anthropic.com.
- Not found: any production source from GitHub, OpenAI, Cognition or AWS hiding tests from the coding agent; any per-role sandbox; StrongDM's sandbox and egress details; Devin's network defaults; Ramp's and Spotify's egress policy.
- Not searched: GitHub Spec Kit, Google and Meta internal pipelines.
