# F1 completeness critic

## Missing stages or themes

- **Codebase onboarding and comprehension (brownfield discovery)** — No stage covers how an agent builds an accurate model of an existing repo before acting: research-then-plan passes, codebase maps, ownership and invariant discovery. X4 covers retrieval mechanics but not this as a lifecycle step, and most failures in brownfield work start here.
- **Release management and change communication** — S9 stops at CI/deploy and S12 at the PR. Nothing covers versioning, changelogs, release notes, and closing the loop with the requester or user once the fix ships, which agents increasingly draft.
- **Data and schema migrations, stateful changes** — DB migrations, backfills and irreversible data operations are where most of the incidents cited (PocketOS, Replit, DataTalks) actually hurt. They are scattered across S9/X2/X3 but never examined as their own stage with expand-contract patterns, dry runs and reversibility gates.
- **Agent pipeline observability and tracing** — Tracing sessions, tool calls, cost and decisions across many parallel agents (OpenTelemetry GenAI conventions, session replay, audit logs) underpins X1, X3, X6 and S13. No area treats it directly, so 'read the event logs' stays folk practice.
- **Provenance, licensing and supply chain of agent output** — Attribution shows up in S12 and X7, but nothing covers license contamination of generated code, SBOM and SLSA attestation of agent commits, package hallucination at install time, or signing agent identity. Agents are now part of the supply chain.
- **Tool and interface design for agents (ACI, MCP servers, CLIs)** — How you shape the tools, CLIs and MCP servers agents call (the agent-computer interface) is a lever in every stage. S10 and X4 hint at it, but nothing studies it: tool count, output truncation, error messages, typed mutation tools.
- **Performance and cost engineering of the product itself** — Profiling, optimization and benchmark-driven agents (evolutionary search, kernel tuning, perf regressions in CI) form a distinct verifier-rich loop that is not in the grid.
- **Human operator role, skills and team shape** — Deskilling comes up only in S10. There is no cross-cutting theme on how the human's job changes (supervisor of fleets, reviewer, spec writer), skill atrophy, junior pipeline, or the attention ceiling of one operator. That is the binding constraint named in X6 and X7.
- **Decommissioning and sunset** — Removing features, services and repos (beyond flag cleanup in S11) is an agent-suitable judgment-plus-mechanics task that no area covers.
- **Accessibility, i18n and non-functional requirements as gates** — The grid treats verification as tests and visual regression. Accessibility, localization, security and perf budgets as automated agent gates are absent.

## Missing sources

- SWE-agent: Agent-Computer Interfaces (Yang et al., NeurIPS 2024) and mini-SWE-agent (S5 / tool design) — The founding evidence that interface design rather than the model drives coding-agent performance. It is the root of the HarnessTax / Scaffold Effect line in S5 but is not cited.
- OpenHands (All Hands AI) platform and OpenHands Index / evaluation harness (S5 / X1 / X7) — The main open-source agent platform and the most-used research harness. It is absent from all areas.
- Anthropic: Building effective agents (Dec 2024) and Writing effective tools for agents (X1 / tool design) — The canonical taxonomy (workflows vs agents, orchestrator-workers, evaluator-optimizer) that most X1 vendor designs reuse, plus the main guidance on tool design.
- HumanLayer / Dex Horthy: 12-Factor Agents and Advanced Context Engineering for Coding Agents (research-plan-implement) (S4 / X4) — A widely adopted practitioner method for frequent intentional compaction and research/plan/implement phases in brownfield repos. HumanLayer appears only for its approval pivot in X3.
- Geoffrey Huntley: original Ralph loop post (S5) — Ralph loops are discussed in S5 without their primary source.
- Anthropic: Claude Code best practices for agentic coding (S5 / X4) — First-party guidance on explore-plan-code-commit, CLAUDE.md and parallel worktrees. The ETH/TDAD findings in S5 contradict it.
- Karpathy: Software 3.0 talk and 'vibe coding' (S3 / framing) — It coined the vocabulary several areas use (vibe architecting, autonomy slider). The autonomy-slider framing is directly relevant to X3.
- OWASP Top 10 for LLM Applications / OWASP Agentic AI threats and mitigations (X2 / S0) — The standard threat taxonomy that X2 and S0 implicitly reinvent (excessive agency, prompt injection, supply chain).
- Model Context Protocol specification (security best practices, authorization) and A2A protocol (X2 / X1) — MCP is the substrate in S0, S9, S10 and X3, but its own spec and authorization model are never examined. A2A is the competing inter-agent protocol and is absent from X1/X5.
- OpenTelemetry GenAI semantic conventions (agent spans) (X1 / X6 / observability) — The emerging standard for tracing agent runs and cost. It is missing although the gaps in X1 and X6 ask for exactly this.
- Terminal-Bench (as its own benchmark) and SWE-bench Multimodal / Multi-SWE-bench (X7) — X7 mentions only a Terminal-Bench audit. The terminal-task and multilingual/multimodal benchmarks are absent although they are the main non-Python, non-issue-fixing evaluations.
- Google DeepMind AlphaEvolve and KernelBench (performance stage) — The key evidence for verifier-driven optimization agents, a loop the grid does not capture.
- Microsoft Magentic-One / AutoGen (X1 / X5) — A major orchestrator-plus-ledger multi-agent architecture. Its task/progress ledger is the same pattern as the 'task ledger outside context' approach in X1.
- Kent Beck: Augmented coding (B+ Tree experiments) (S6 / S5) — Beck appears only on SDD in S2. His documented case of agents deleting or weakening tests during TDD is direct evidence for S6.

## Duplicates across areas

- Cursor 'Scaling long-running autonomous coding' / 'Towards self-driving codebases' appear in S4, S5, X1 and X5. Merge into one X1 entry.
- Cognition 'Multi-Agents: What's Actually Working' and 'Don't Build Multi-Agents' appear in S4, X1 and X5.
- Google 'Towards a Science of Scaling Agent Systems' appears in S4, X1 and X5. MAST appears in X1 and X5.
- Anthropic 'Building a C compiler with parallel Claudes' appears in S4, S5, S8 and X5.
- Gas Town / Beads (Yegge, DoltHub 'A Day in Gas Town', AR Labs) appear in S0, S4, X1, X5 and X6.
- Claude Code agent teams appear in S4, X1 and X5. Simon Willison's parallel coding agent lifestyle and GitHub Agent HQ appear in X1 and X5. Factory Missions appears in S4 and X1.
- Evaluating AGENTS.md (ETH) and the Lulla et al. efficiency study appear in S5, S13 and X4. IFScale and SkillsBench appear in S13 and X4.
- Ambig-SWE and Ask or Assume? appear in S0, S2 and X3.
- METR time horizon work, METR 'Many SWE-bench-passing PRs would not be merged' and the 'estimation and validity of AI time horizons' paper appear in S4 and X7.
- The METR developer RCT and its 2026 redesign appear in S5, X6 and X7. NBER w35275 and Chen & Stratton (Harvard/Jellyfish) appear in X6 and X7. Faros reports appear in X6 and X7. AIDev appears in S12, X6 and X7. LinearB benchmarks appear in S12 and X6. DORA 2025 appears in S9 and X7.
- The PocketOS/Railway DB wipe appears in S5, S9, X2 and X3. The Replit DB deletion appears in S10, X2 and X3. DataTalks.Club terraform destroy appears in S9 and X3. Kiro/AWS appears in S10 and X3. Consolidate into one incident corpus.
- Sentry Seer CVE appears in S0 and S10. The Invariant Labs GitHub MCP exploit appears in S0 and X2.
- ImpossibleBench appears in S5 and S6. METR 'Recent frontier models are reward hacking' appears in S6 and X7.
- Mergify 'Merge Queues Were Built for Humans' appears in S8 and S9. CAID and AgenticFlict appear in S8 and X5.
- Stripe Minions appears in S0 and S5. Aider architect/editor appears in S5 and X6. Augment Intent appears in S2 and X5. Linear Triage/Product Intelligence appears in S0 and S1. Anthropic Code Review for Claude Code appears in S7 and S12. Claude Code auto mode appears in X2 and X3. SWE-Bench Pro appears in S5 and X7.
- Area overlap: X1 (orchestration) and X5 (multi-agent shapes) are near-duplicates. Merge them, or split X1 into durability/runtime only and X5 into topology.
- Area overlap: S4 (planning/decomposition) and X1/X5 share the planner-worker-judge material. S4 should keep plan artifacts and sizing only.
- Area overlap: S5, S13 and X4 all cover context files and skills. X4 should own the evidence, S13 the learning loop, S5 only the harness.
- Area overlap: S6 and S9 both cover agents editing tests to go green. S7 and S12 both cover review (machine vs human). S8 and S9 both cover merge queues. X2 and X3 both cover the sandbox-vs-approval boundary. X6 and X7 share the productivity econometrics. S0 and S10 share telemetry-to-PR pipelines.

## Top deep dives for F2

1. **Human review cost per merged-and-surviving change for a solo operator running parallel agents** (S12 / X6 / X7) — Every area names review attention as the binding constraint, yet nobody measures it. This is the metric that decides how many agents, what PR size and which summary format are worth it.
2. **Verification out of the agent's reach: holdout/read-only tests, claim-vs-execution checks, evidence bound to a head SHA** (S6 / S8 / S9) — Test tampering, fake 'done' and stale approvals are the shared failure behind S6, S8, S9 and X1. A cheap, solo-scale recipe for this does not exist and would unlock autonomy elsewhere.
3. **Detecting false completion claims from workers (structured verdicts vs text markers, judge design)** (X1 / S4 / X5) — Planner-worker-judge is the consensus shape, but how the judge catches early stopping and fabricated success is untreated. It is the hinge of any unattended pipeline.
4. **Measurement-gated admission and retirement of rules and skills (Cortex-style replay, push-down to hooks/lint)** (S13 / X4) — Context files and self-written skills show no gain and grow without bound. A cheap gate plus a retirement method would directly cut cost and drift in the user's own rule files.
5. **Credential brokering and branch-scoped git rights for many sandboxed agents** (X2 / S8 / X3) — Incidents show blast radius is set by tokens, not prompts. Giving parallel agents push/PR rights with no token in the sandbox is an open, high-leverage design problem.
6. **Earned autonomy: data-driven promotion policies (auto-merge, auto-approve) with rollback** (X3 / S8 / S12) — Vendors ship model approvers and practitioners invent thresholds, but no validated policy exists. This determines how far human gates can be safely removed.
7. **Mechanical plan-before-apply and destructive-op gates without enterprise platforms (single VPS / PaaS)** (S9 / X2) — This is an explicit gap with direct incident evidence, and it applies to small self-hosted setups where Spacelift/HCP-style gates are unavailable.
8. **Model-per-step routing quality on real repos (frontier planner/advisor + cheap executor + cheap reviewer)** (S5 / X6 / S7) — Savings are measured but quality loss and rework are not. A matched-trial comparison on one's own tasks would settle a large share of the cost question.
9. **Untrusted intake isolation and capture of agent-discovered work (dedupe, non-executable tasks, cross-repo separation)** (S0 / X2 / S13) — Issue titles, telemetry and web content are proven injection vectors into privileged agents. Agent-found work also floods the queue, and no false-positive or dedupe data exists.
10. **Asynchronous clarification: batching questions across parallel agents with a late, terse human** (S2 / X3 / S4) — Clarification has strong measured gains in sync settings, but all evidence uses oracle simulators. How unattended fleets should ask, wait or assume is the missing piece for spec quality at scale.
