# Agentic SDLC Atlas

What the world knows about AI agents doing the whole software lifecycle: from the first signal that something should be built to production watch and the process improving itself. Every entry has a primary source, the date of the work itself, and an evidence level.

Stages are listed in lifecycle order; ids are stable and do not change when areas are added.

Status: phase F1 (broad sweep), 964 candidates in 30 areas. Nothing here is verified in depth yet.

## Evidence levels

- **measured**: a published measurement with a method.
- **code**: source code you can read.
- **self-report**: a company's claims about its own system.
- **opinion**: an argument without data.

`Read` column: `primary-read` means the source was opened; `search-snippet` means only a search result was seen.

## Areas

| Id | Area | Candidates | Marked take |
|---|---|---|---|
| [S0](areas/s0-intake-signals.md) | Intake & signals | 30 | 16 |
| [S1](areas/s1-product-discovery.md) | Product discovery | 30 | 5 |
| [S14](areas/s14-codebase-comprehension.md) | Codebase comprehension | 46 | 15 |
| [S2](areas/s2-requirements-spec.md) | Requirements & spec | 31 | 11 |
| [S3](areas/s3-architecture-design.md) | Architecture & design | 32 | 12 |
| [S4](areas/s4-planning-decomposition.md) | Planning & decomposition | 29 | 12 |
| [S5](areas/s5-implementation.md) | Implementation | 28 | 15 |
| [S6](areas/s6-verification-testing.md) | Verification & testing | 65 | 24 |
| [S7](areas/s7-code-review.md) | Code review | 32 | 10 |
| [S8](areas/s8-integration-merge.md) | Integration & merge | 32 | 17 |
| [S15](areas/s15-data-schema-migrations.md) | Data & schema migrations | 28 | 13 |
| [S9](areas/s9-delivery-deploy.md) | Delivery & deploy | 31 | 9 |
| [S16](areas/s16-release-change-communication.md) | Release & change communication | 25 | 9 |
| [S10](areas/s10-operations-incidents.md) | Operations & incidents | 26 | 8 |
| [S18](areas/s18-performance-optimization.md) | Performance optimization | 26 | 13 |
| [S11](areas/s11-maintenance-evolution.md) | Maintenance & evolution | 29 | 12 |
| [S17](areas/s17-decommissioning.md) | Decommissioning | 27 | 12 |
| [S12](areas/s12-reporting-to-humans.md) | Reporting to humans | 32 | 12 |
| [S13](areas/s13-process-self-improvement.md) | Process self-improvement | 30 | 13 |
| [X1](areas/x1-orchestration-runtime.md) | Orchestration runtime | 18 | 8 |
| [X2](areas/x2-isolation-security.md) | Isolation & security | 33 | 18 |
| [X3](areas/x3-human-in-the-loop.md) | Human in the loop | 30 | 11 |
| [X4](areas/x4-context-knowledge.md) | Context & knowledge | 31 | 15 |
| [X5](areas/x5-multi-agent-topology.md) | Multi-agent topology | 37 | 16 |
| [X6](areas/x6-economics.md) | Economics | 32 | 15 |
| [X7](areas/x7-measurement-evidence.md) | Measurement & evidence | 34 | 8 |
| [X8](areas/x8-pipeline-observability.md) | Pipeline observability | 26 | 8 |
| [X9](areas/x9-tool-design-for-agents.md) | Tool design for agents | 33 | 15 |
| [X10](areas/x10-human-operator-role.md) | Human operator role | 34 | 15 |
| [X11](areas/x11-provenance-licensing.md) | Provenance & licensing | 47 | 13 |

Approaches across all areas: [MATRIX.md](MATRIX.md). Gaps in the map itself: [F1-CRITIC.md](F1-CRITIC.md).
