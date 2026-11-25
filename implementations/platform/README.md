# A platform of our own: paused start

Started 2026-11-26 as the fallback of `research/atlas/research/2026-11-platform-market.md`: if no product carried the pipeline, build one. Paused the same day when the Kandev trial (`../kandev/`) passed the core checks. Kept as the starting point should that trial fail.

What exists, untested and not wired to a server:

| File | What it holds |
|---|---|
| `src/store.ts` | Durable state in one SQLite file (`bun:sqlite`): items with several repositories, runs (one live run per item and workflow), decision requests carrying a `DecisionCard`, one answer per request, users with roles, events. |
| `src/runner.ts` | Agent roles (prompt, pack skills, model, limits) and session runners: Claude Code headless, and a stub for tests. A session without a JSON verdict fails. |
| `src/engine.ts` | The workflow runtime: agent, per-repository agent, script and gate steps; the next step computed in code from the output; gates answered only by an Operator with an offered option or words for "other". |
| `src/workflows.ts` | Triage with the Accept card, and delivery across repositories with review rounds, a limit of 3 and the merge gate. |

Missing: the web server and inbox drawing `../archon/decision-ui/card.html`, tests, the tracker and code-host connectors, a sandbox.
