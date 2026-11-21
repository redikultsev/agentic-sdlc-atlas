# Engine research: all candidates

Every candidate read in the engine research of 2026-11-21, one agent per candidate, single read. Scores 0–3 per engine part: O Orchestrator, S Sandbox, D Decision requests, T Session traces. The 12 strongest were re-checked by two skeptics; their corrected scores are in [2026-11-engine-choice.md](2026-11-engine-choice.md), which wins where the two differ.

| Name | Kind | Role | O | S | D | T | License |
|---|---|---|---|---|---|---|---|
| [Kraft (kraft-sdlc)](https://github.com/itsOmidKarami/kraft) | whole_engine | whole_engine | 2 | 2 | 2 | 2 | Apache-2.0 (LICENSE file and GitHub API) |
| [Blazity ai-workflow](https://github.com/Blazity/ai-workflow) | whole_engine | foundation | 2 | 2 | 2 | 2 | MIT (LICENSE.md, GitHub API spdx MIT) |
| [Fabro](https://github.com/fabro-sh/fabro) | whole_engine | foundation | 2 | 2 | 2 | 2 | MIT for Fabro itself. Core dependencies in lithoscomputer/*  |
| [Microsoft Conductor](https://github.com/microsoft/conductor) | workflow_foundation | foundation | 2 | 2 | 2 | 2 | MIT |
| [Tencent/LoopForge](https://github.com/Tencent/LoopForge) | whole_engine | foundation | 2 | 2 | 2 | 2 | MIT for LoopForge code (LICENSE file; GitHub reports NOASSER |
| [agent-swarm (desplega-ai)](https://github.com/desplega-ai/agent-swarm) | coding_agent_platform | foundation | 2 | 1 | 2 | 2 | MIT (GitHub API license SPDX = MIT; README says self-hosted  |
| [fishhawk](https://github.com/kuhlman-labs/fishhawk) | whole_engine | foundation | 2 | 1 | 2 | 2 | Apache-2.0 (LICENSE and NOTICE in the repo; GitHub API spdx_ |
| [Flyte (Flyte 2, flyteorg/flyte + flyteorg/flyte-sdk)](https://github.com/flyteorg/flyte) | workflow_foundation | foundation | 2 | 1 | 2 | 2 | Apache-2.0 (both flyteorg/flyte and flyteorg/flyte-sdk); LF  |
| [MAIster](https://github.com/maister-dev/maister) | whole_engine | foundation | 2 | 1 | 2 | 2 | MIT |
| [open-mercato/cezar](https://github.com/open-mercato/cezar) | coding_agent_platform | foundation | 2 | 1 | 2 | 2 | MIT (GitHub API spdx_id MIT; README: MIT © Patryk Lewczuk) |
| [Temporal (Signals, Updates, Queries, Timers, Workflows)](https://temporal.io/) | workflow_foundation | foundation | 2 | 1 | 2 | 2 | MIT for the server (temporalio/temporal) and the SDKs (sdk-p |
| [Agno (agno-agi/agno, AgentOS)](https://github.com/agno-agi/agno) | agent_framework | foundation | 1 | 2 | 1 | 2 | Apache-2.0 (GitHub API). Telemetry is on by default and turn |
| [Apache Airflow 3 (3.4.0) with the common.ai provider](https://github.com/apache/airflow) | workflow_foundation | foundation | 1 | 1 | 2 | 2 | Apache-2.0 (gh api repos/apache/airflow) |
| [Bernstein](https://github.com/sipyourdrink-ltd/bernstein) | whole_engine | foundation | 2 | 1 | 1 | 2 | Apache-2.0 (the project name is covered separately by TRADEM |
| [centaur (Paradigm)](https://github.com/paradigmxyz/centaur) | coding_agent_platform | foundation | 1 | 2 | 1 | 2 | Apache-2.0 OR MIT (dual license, from the LICENSE file; the  |
| [Claude Managed Agents (Claude Platform, incl. self-hosted sandboxes and self-hosted Managed Agents server)](https://platform.claude.com/docs/en/managed-agents/overview) | coding_agent_platform | foundation | 1 | 2 | 1 | 2 | Proprietary service, Beta (header managed-agents-2026-04-01) |
| [Dagu](https://github.com/dagucloud/dagu) | workflow_foundation | foundation | 2 | 1 | 2 | 1 | GPL-3.0-or-later (LICENSING.md). Running the server or CLI a |
| [Gas City (gastownhall/gascity)](https://github.com/gastownhall/gascity) | workflow_foundation | foundation | 2 | 1 | 1 | 2 | MIT (GitHub API spdx MIT; stewarded by Gas City, Inc.) |
| [KaaS Factory (KaaS-team/factory, formerly KaaS-team/KaaS-factory)](https://github.com/KaaS-team/factory) | whole_engine | foundation | 2 | 1 | 1 | 2 | Apache-2.0 for the core. The ee/ directory (SSO/SAML/SCIM, c |
| [Kandev](https://github.com/kdlbs/kandev) | coding_agent_platform | foundation | 2 | 1 | 1 | 2 | AGPL-3.0 (gh api license.spdx_id). Running it privately and  |
| [Mastra Factory (@mastra/factory + mastra-ai/template-factory / template-factory-self-hosted)](https://mastra.ai/factory) | whole_engine | foundation | 2 | 1 | 1 | 2 | Apache-2.0 for the template repos and the @mastra/factory pa |
| [Open Session (tellahq/opensession)](https://github.com/tellahq/opensession) | coding_agent_platform | foundation | 1 | 2 | 1 | 2 | MIT (GitHub license field and the README) |
| [OpenHands (Agent Canvas + Software Agent SDK + Agent Server + Automation service)](https://github.com/OpenHands/OpenHands) | coding_agent_platform | foundation | 1 | 2 | 1 | 2 | MIT for OpenHands/OpenHands (Agent Canvas), software-agent-s |
| [Pydantic AI (durable execution + Pydantic AI Harness)](https://github.com/pydantic/pydantic-ai) | agent_framework | foundation | 1 | 2 | 1 | 2 | MIT (GitHub API) |
| [Sortie](https://github.com/sortie-ai/sortie) | whole_engine | foundation | 2 | 1 | 1 | 2 | Apache-2.0 (from the GitHub API and the LICENSE file) |
| [SuperPlane](https://github.com/superplanehq/superplane) | workflow_foundation | foundation | 2 | 1 | 1 | 2 | Apache-2.0 for core. Files under /ee (RBAC, GitHub Enterpris |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | workflow_foundation | foundation | 2 | 1 | 1 | 2 | Apache-2.0 (gh api repos/triggerdotdev/trigger.dev) |
| [Zeroshot (the-open-engine/zeroshot)](https://github.com/the-open-engine/zeroshot) | workflow_foundation | foundation | 2 | 1 | 1 | 2 | MIT |
| [Conductor OSS (ex-Netflix Conductor)](https://github.com/conductor-oss/conductor) | workflow_foundation | foundation | 2 | 0 | 1 | 2 | Apache-2.0 (GitHub API license field) |
| [Google ADK (Python) 2.x](https://github.com/google/adk-python) | agent_framework | foundation | 1 | 1 | 1 | 2 | Apache-2.0 |
| [Hatchet](https://github.com/hatchet-dev/hatchet) | workflow_foundation | foundation | 2 | 1 | 1 | 1 | MIT (GitHub API license field). The sdks/typescript-sandbox  |
| [iii (iii-hq/iii, successor of Motia) plus its iii-hq/workers registry](https://github.com/iii-hq/iii) | workflow_foundation | foundation | 1 | 1 | 1 | 2 | Mixed. The engine and CLI (engine/) are under Elastic Licens |
| [Inngest](https://github.com/inngest/inngest) | workflow_foundation | foundation | 2 | 1 | 1 | 1 | Server and CLI: SSPL v1 plus an irrevocable "Apache 2.0 Futu |
| [Kestra](https://github.com/kestra-io/kestra) | workflow_foundation | foundation | 2 | 1 | 1 | 1 | Apache-2.0 for the core (from GitHub API). Some features in  |
| [Mastra (workflows + workspaces + observability)](https://github.com/mastra-ai/mastra) | agent_framework | foundation | 1 | 1 | 1 | 2 | Apache-2.0 outside the ee/ directories. Code under any ee/ d |
| [OpenHands Cloud / Enterprise (with Agent Canvas, Software Agent SDK, Agent Server)](https://docs.openhands.dev/enterprise) | coding_agent_platform | foundation | 1 | 2 | 0 | 2 | Mixed. The core repos are MIT (OpenHands/OpenHands, software |
| [Optio](https://github.com/jonwiggins/optio) | coding_agent_platform | foundation | 1 | 1 | 1 | 2 | MIT (GitHub API license field: MIT) |
| [Strands Agents SDK (strands-agents/harness-sdk)](https://github.com/strands-agents/harness-sdk) | agent_framework | foundation | 1 | 1 | 1 | 2 | Apache-2.0 (LICENSE.APACHE). The companion strands-agents/bo |
| [Temporal Python SDK](https://github.com/temporalio/sdk-python) | workflow_foundation | foundation | 1 | 1 | 1 | 2 | MIT (SDK). Temporal server temporalio/temporal is MIT too. T |
| [Vercel Workflow DevKit (Workflow SDK) + AI SDK 7 WorkflowAgent](https://github.com/vercel/workflow) | workflow_foundation | foundation | 1 | 1 | 1 | 2 | Apache-2.0 (GitHub license field) |
| [Windmill](https://github.com/windmill-labs/windmill) | workflow_foundation | foundation | 2 | 1 | 1 | 1 | Mixed. The binary built from the repo without the 'enterpris |
| [Argo Workflows](https://github.com/argoproj/argo-workflows) | workflow_foundation | foundation | 1 | 1 | 1 | 1 | Apache-2.0 (GitHub API license.spdx_id) |
| [Claude Agent SDK (TypeScript)](https://github.com/anthropics/claude-agent-sdk-typescript) | agent_framework | foundation | 1 | 1 | 0 | 2 | Proprietary. GitHub reports no SPDX license. README and LICE |
| [Dapr Workflows (with Dapr Agents)](https://github.com/dapr/dapr) | workflow_foundation | foundation | 2 | 0 | 1 | 1 | Apache-2.0 (dapr/dapr and dapr/dapr-agents, from GitHub API) |
| [Flowable (flowable-engine)](https://github.com/flowable/flowable-engine) | workflow_foundation | foundation | 2 | 0 | 1 | 1 | Apache-2.0 for the engines (from the GitHub API and README). |
| [LangGraph](https://github.com/langchain-ai/langgraph) | agent_framework | foundation | 2 | 0 | 1 | 1 | Library: MIT (GitHub API). The packaged Agent Server (langgr |
| [Lightspeed (smartcomputer-ai/lightspeed)](https://github.com/smartcomputer-ai/lightspeed) | agent_framework | foundation | 1 | 1 | 1 | 1 | Apache-2.0 |
| [LittleHorse](https://github.com/littlehorse-enterprises/littlehorse) | workflow_foundation | foundation | 2 | 0 | 1 | 1 | Split licence (LICENSES.md). ./server, ./dashboard and all d |
| [Obelisk](https://github.com/obeli-sk/obelisk) | workflow_foundation | foundation | 1 | 1 | 1 | 1 | AGPL-3.0 for the runtime; MIT for the wit/ folder and for WI |
| [pi (earendil-works/pi, formerly badlogic/pi-mono)](https://github.com/earendil-works/pi) | agent_framework | foundation | 1 | 1 | 1 | 1 | MIT (GitHub license field) |
| [Prefect](https://github.com/PrefectHQ/prefect) | workflow_foundation | foundation | 1 | 1 | 1 | 1 | Apache-2.0 (gh api: license.spdx_id = Apache-2.0). Prefect C |
| [Resonate](https://github.com/resonatehq/resonate) | workflow_foundation | foundation | 1 | 1 | 1 | 1 | Apache-2.0 (GitHub API license field and README) |
| [Temporal](https://github.com/temporalio/temporal) | workflow_foundation | foundation | 2 | 0 | 1 | 1 | MIT (GitHub API: license.spdx_id = MIT) |
| [XState (+ Stately Agent)](https://github.com/statelyai/xstate) | workflow_foundation | foundation | 1 | 0 | 1 | 2 | MIT (both statelyai/xstate and statelyai/agent, per GitHub A |
| [Absurd](https://github.com/earendil-works/absurd) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | Apache-2.0 (LICENSE file; the README adds a note that much o |
| [Cadence](https://github.com/cadence-workflow/cadence) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | Apache-2.0 (server, Go/Java/Python SDKs, cadence-web all Apa |
| [DBOS Transact (Python / TypeScript)](https://github.com/dbos-inc/dbos-transact-py) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | Transact library: MIT (GitHub API reports MIT for both the p |
| [Durable Task Framework / durabletask-go (microsoft/durabletask-go; self-hostable engine now lives in the dapr/durabletask-go fork)](https://github.com/microsoft/durabletask-go) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | Apache-2.0 (both microsoft/durabletask-go and dapr/durableta |
| [LangGraph interrupts (with checkpointers)](https://docs.langchain.com/oss/python/langgraph/interrupts) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | MIT (langchain-ai/langgraph repo; gh api license MIT). The c |
| [LlamaIndex Workflows / LlamaAgents (run-llama/llama-agents)](https://github.com/run-llama/llama-agents) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | MIT (GitHub API license field) |
| [Oban (with optional Oban Pro; also oban-py for Python)](https://github.com/oban-bg/oban) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | Core: Apache-2.0 (checked with gh api). Oban Pro, which hold |
| [OpenWorkflow](https://github.com/openworkflowdev/openworkflow) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | Apache-2.0 (GitHub API license field, LICENSE.md, packages/o |
| [Restate](https://github.com/restatedev/restate) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | Server: Business Source License 1.1 (GitHub reports NOASSERT |
| [River (riverqueue/river)](https://github.com/riverqueue/river) | workflow_foundation | foundation | 1 | 0 | 1 | 1 | MPL-2.0 for the core (from the GitHub API). River Pro, which |
| [Vercel AI SDK (vercel/ai)](https://github.com/vercel/ai) | agent_framework | foundation | 1 | 1 | 0 | 1 | Apache-2.0 (LICENSE file reads 'Copyright 2023 Vercel, Inc.  |
| [Apache Burr (incubating)](https://github.com/apache/burr) | workflow_foundation | foundation | 1 | 0 | 0 | 1 | Apache-2.0 (Apache Software Foundation incubating project) |
| [BullMQ](https://github.com/taskforcesh/bullmq) | workflow_foundation | foundation | 1 | 0 | 0 | 1 | MIT (GitHub API). BullMQ Pro is a separate commercial produc |
| [Celery](https://github.com/celery/celery) | workflow_foundation | foundation | 1 | 0 | 0 | 1 | BSD-3-Clause style. The GitHub API reports the license as "O |
| [pg-boss](https://github.com/timgit/pg-boss) | workflow_foundation | foundation | 1 | 0 | 0 | 1 | MIT (GitHub license field, and the README says "MIT licensed |
| [Graphile Worker](https://github.com/graphile/worker) | workflow_foundation | foundation | 1 | 0 | 0 | 0 | MIT. The core is open source. Worker Pro (`@graphile-pro/wor |
| [Amp (ampcode.com)](https://ampcode.com/) | coding_agent_platform | component | 1 | 2 | 1 | 2 | Proprietary commercial SaaS. The agent and server are closed |
| [Coder (Coder Agents)](https://github.com/coder/coder) | sandbox | component | 1 | 2 | 1 | 2 | AGPL-3.0 core (gh api: license AGPL-3.0). Some parts need a  |
| [DeerFlow 2.0 (ByteDance)](https://github.com/bytedance/deer-flow) | agent_framework | component | 1 | 2 | 1 | 2 | MIT |
| [Devin (Cognition) - Devin Cloud with API v3, Automations, Dynamic Workflows and Outposts](https://docs.devin.ai/api-reference/overview) | coding_agent_platform | component | 1 | 2 | 1 | 2 | Proprietary commercial SaaS, billed in ACUs (Agent Compute U |
| [Docker Agent (formerly cagent)](https://github.com/docker/docker-agent) | agent_framework | component | 1 | 2 | 1 | 2 | Apache-2.0 (GitHub API). The CLI collects anonymous product  |
| [ESF (Engineering Software Factory)](https://github.com/mitkox/esf) | sandbox | component | 1 | 2 | 1 | 2 | MIT (Machinist attribution retained). It depends on TencentC |
| [Factory (Droid, Droid Exec, Execute API, Workstreams, Automations)](https://docs.factory.com/droid-exec/execute-api) | coding_agent_platform | component | 1 | 2 | 1 | 2 | Proprietary SaaS. The Factory-AI/factory and Factory-AI/droi |
| [GitHub Agentic Workflows (gh-aw)](https://github.com/github/gh-aw) | workflow_foundation | component | 1 | 2 | 1 | 2 | MIT (gh api repos/github/gh-aw: license.spdx_id = MIT) |
| [LangSmith (LangChain)](https://www.langchain.com/langsmith) | tracing | component | 1 | 2 | 1 | 2 | Proprietary platform. The client SDK langchain-ai/langsmith- |
| [omnigent](https://github.com/omnigent-ai/omnigent) | agent_framework | component | 1 | 2 | 1 | 2 | Apache-2.0 (gh api: license.spdx_id = Apache-2.0; NOTICE + D |
| [OpenAI Agents SDK (JS/TS)](https://github.com/openai/openai-agents-js) | agent_framework | component | 1 | 2 | 1 | 2 | MIT |
| [OpenAI Agents SDK (Python), with a focus on its human-in-the-loop, Sandbox Agents and Tracing](https://openai.github.io/openai-agents-python/human_in_the_loop/) | agent_framework | component | 1 | 2 | 1 | 2 | MIT (the openai-agents-python and openai-agents-js repos, fr |
| [OpenHands Software Agent SDK](https://github.com/OpenHands/software-agent-sdk) | agent_framework | component | 1 | 2 | 1 | 2 | MIT. Checked with gh api: license.spdx_id is MIT. The repo h |
| [Rivet Agents monorepo (Sandbox Agent + @rivet-dev/pi + @rivet-dev/sandbox-adapter)](https://github.com/rivet-dev/agents) | sandbox | component | 1 | 2 | 1 | 2 | Apache-2.0 (repo). The Foundry subfolder README says MIT. Th |
| [Scion (GoogleCloudPlatform/scion)](https://github.com/GoogleCloudPlatform/scion) | sandbox | component | 1 | 2 | 1 | 2 | Apache-2.0 (GitHub API license field and README). README: "T |
| [Amazon Bedrock AgentCore (Runtime, Code Interpreter, Gateway, Identity, Memory, Observability)](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter-tool.html) | sandbox | component | 1 | 2 | 0 | 2 | Proprietary managed AWS service, pay per use. The SDK (aws/b |
| [Claude Agent SDK (Python)](https://github.com/anthropics/claude-agent-sdk-python) | agent_framework | component | 1 | 1 | 1 | 2 | The repo is MIT (GitHub spdx: MIT). The README adds that use |
| [Claude Code on the web (cloud sessions, scheduled tasks / Routines, Auto-fix PRs, self-hosted environments)](https://code.claude.com/docs/en/claude-code-on-the-web) | coding_agent_platform | component | 1 | 2 | 1 | 1 | Proprietary commercial service, billed against a claude.ai P |
| [Claudexor](https://github.com/razzant/claudexor) | coding_agent_platform | component | 1 | 1 | 1 | 2 | MIT |
| [Cursor Cloud Agents (+ Automations, Bugbot / Autofix, PR Routing & Approval, Rollouts)](https://cursor.com/docs/cloud-agent) | coding_agent_platform | component | 1 | 2 | 0 | 2 | Proprietary SaaS. Only small helper pieces are open: cursor/ |
| [GitHub Copilot cloud agent (formerly coding agent) + Agent HQ third-party agents + Agent Merge + automations](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github) | coding_agent_platform | component | 1 | 2 | 1 | 1 | Proprietary, closed-source SaaS. It ships under GitHub's Cop |
| [Haystack (deepset)](https://github.com/deepset-ai/haystack) | agent_framework | component | 1 | 1 | 1 | 2 | Apache-2.0 (GitHub API license.spdx_id) |
| [Inspect AI (UK AI Security Institute)](https://github.com/UKGovernmentBEIS/inspect_ai) | tracing | component | 1 | 2 | 0 | 2 | MIT |
| [Kiro autonomous agent / Kiro Web autonomous mode + cloud sessions + Workflows (AWS)](https://kiro.dev/blog/introducing-kiro-autonomous-agent/) | coding_agent_platform | component | 1 | 2 | 1 | 1 | Proprietary SaaS (Kiro IDE/CLI/Web). The kirodotdev/Kiro Git |
| [Loki Mode (asklokesh/loki-mode)](https://github.com/asklokesh/loki-mode) | coding_agent_platform | component | 1 | 1 | 1 | 2 | BUSL-1.1 (GitHub shows NOASSERTION). Licensor is Autonomi, I |
| [Murmur (Macroscope)](https://macroscope.com/murmur) | coding_agent_platform | component | 1 | 2 | 0 | 2 | Proprietary. The control plane is not public (docs cite a pr |
| [no_human](https://github.com/no-human-ai/no_human) | coding_agent_platform | component | 1 | 1 | 1 | 2 | MIT for the code. The name and logo are restricted by TRADEM |
| [OpenAI Agents SDK (Python)](https://github.com/openai/openai-agents-python) | agent_framework | component | 1 | 1 | 1 | 2 | MIT |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | coding_agent_platform | component | 1 | 1 | 1 | 2 | Apache-2.0 |
| [SWE-AF (AgentField)](https://github.com/Agent-Field/SWE-AF) | coding_agent_platform | component | 1 | 1 | 1 | 2 | Apache-2.0 (SWE-AF and the AgentField control plane). Caveat |
| [Tembo](https://docs.tembo.io/features/agents) | coding_agent_platform | component | 1 | 2 | 0 | 2 | Proprietary. The platform is closed source and self-hosting  |
| [Woodpecker CI / Tekton / Dagger (self-hosted CI and pipeline engines)](https://github.com/dagger/dagger) | sandbox | component | 1 | 2 | 0 | 2 | Apache-2.0 (all three: dagger/dagger, woodpecker-ci/woodpeck |
| [AG2 (ag2ai/ag2, v1.x "AgentOS"; formerly AutoGen fork)](https://github.com/ag2ai/ag2) | agent_framework | component | 1 | 1 | 1 | 1 | Apache-2.0 (the repo also keeps the original AutoGen license |
| [Agent Orchestrator (Orchestrator.inc, OrchestratorInc/agent-orchestrator)](https://github.com/OrchestratorInc/agent-orchestrator) | coding_agent_platform | component | 1 | 1 | 1 | 1 | Apache-2.0 (LICENSE in repo, GitHub API spdx_id Apache-2.0). |
| [AX (Agent Executor, Google)](https://github.com/google/ax) | sandbox | component | 1 | 2 | 0 | 1 | Apache-2.0 (Agent Substrate dependency also Apache-2.0) |
| [Claude Agent for Jira (Atlassian, Beta)](https://support.atlassian.com/jira-software-cloud/docs/set-up-claude-agent-for-jira/) | tracker_bridge | component | 1 | 1 | 1 | 1 | Commercial, closed source. Marketplace lists it as a free ap |
| [Cline (CLI / SDK / core)](https://github.com/cline/cline) | coding_agent_platform | component | 1 | 0 | 1 | 2 | Apache-2.0 (GitHub API license.spdx_id) |
| [Cloudflare Sandbox SDK / Containers](https://github.com/cloudflare/sandbox-sdk) | sandbox | component | 1 | 2 | 0 | 1 | Apache-2.0 for the SDK. The LICENSE file is Apache 2.0, thou |
| [Deep Agents (LangChain)](https://github.com/langchain-ai/deepagents) | agent_framework | component | 1 | 1 | 1 | 1 | MIT. Not verified: whether every partner sandbox package has |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | coding_agent_platform | component | 1 | 1 | 0 | 2 | Apache-2.0 |
| [goose (aaif-goose/goose)](https://github.com/aaif-goose/goose) | coding_agent_platform | component | 1 | 1 | 0 | 2 | Apache-2.0 (GitHub API license.spdx_id) |
| [Happy / HAPI / opcode / claudecodeui (remote clients for Claude Code sessions)](https://github.com/slopus/happy) | human_in_loop | component | 1 | 1 | 1 | 1 | Happy: MIT. HAPI, opcode and claudecodeui: AGPL-3.0. The AGP |
| [mattpocock/sandcastle](https://github.com/mattpocock/sandcastle) | sandbox | component | 1 | 2 | 0 | 1 | MIT |
| [Mistral Vibe CLI](https://github.com/mistralai/mistral-vibe) | coding_agent_platform | component | 1 | 1 | 0 | 2 | Apache-2.0 |
| [n8n human-in-the-loop for tools / Wait node](https://docs.n8n.io/build/integrate-ai/ai-examples/human-in-the-loop-for-tools) | human_in_loop | component | 1 | 0 | 2 | 1 | Sustainable Use License 1.0, which is source-available and n |
| [Open-Inspect background-agents](https://github.com/open-inspect/background-agents) | coding_agent_platform | component | 1 | 1 | 0 | 2 | MIT (GitHub API license field: MIT) |
| [OpenAI Codex CLI + Codex SDK (codex exec)](https://github.com/openai/codex) | coding_agent_platform | component | 1 | 1 | 0 | 2 | Apache-2.0 (GitHub API license.spdx_id) |
| [OpenAI Codex Cloud (Codex web / cloud tasks, incl. @codex review)](https://learn.chatgpt.com/docs/cloud) | coding_agent_platform | component | 1 | 2 | 0 | 1 | Proprietary SaaS (cloud service). The local client openai/co |
| [OpenSandbox](https://github.com/opensandbox-group/OpenSandbox) | sandbox | component | 0 | 3 | 0 | 1 | Apache-2.0 (GitHub API license field) |
| [smolagents](https://github.com/huggingface/smolagents) | agent_framework | component | 1 | 1 | 0 | 2 | Apache-2.0 (GitHub API license.spdx_id) |
| [SWE-agent](https://github.com/SWE-agent/SWE-agent) | agent_framework | component | 1 | 1 | 0 | 2 | MIT (GitHub API). SWE-ReX is MIT as well. |
| [Vercel AI SDK (tool approval / AI SDK UI human-in-the-loop, plus AI SDK 7 HarnessAgent, sandbox interface, otel)](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) | agent_framework | component | 1 | 1 | 1 | 1 | Apache-2.0. The LICENSE file reads "Copyright 2023 Vercel, I |
| [AG-UI protocol / CopilotKit](https://github.com/ag-ui-protocol/ag-ui) | human_in_loop | component | 0 | 0 | 2 | 1 | AG-UI: MIT. CopilotKit SDKs and TypeScript runtime: MIT. Cop |
| [Agent Client Protocol (ACP)](https://github.com/agentclientprotocol/agent-client-protocol) | other | component | 1 | 0 | 1 | 1 | Apache-2.0 (spec repo, TS/Rust/Python SDKs, claude-agent-acp |
| [AgentTier](https://github.com/agenttier/agenttier) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 |
| [Apple container (with Lima as the alternative)](https://github.com/apple/container) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 (apple/container, apple/containerization, and lim |
| [Beads (bd)](https://github.com/gastownhall/beads) | tracker_bridge | component | 1 | 0 | 1 | 1 | MIT (GitHub license API: MIT) |
| [BoxLite](https://github.com/boxlite-ai/boxlite) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 (GitHub license API) |
| [Claude Code GitHub Action (anthropics/claude-code-action)](https://github.com/anthropics/claude-code-action) | coding_agent_platform | component | 1 | 1 | 0 | 1 | MIT (GitHub license field: MIT) |
| [Claude Code GitHub Actions (anthropics/claude-code-action)](https://github.com/anthropics/claude-code-action) | coding_agent_platform | component | 1 | 1 | 0 | 1 | MIT (gh api repos/anthropics/claude-code-action) |
| [Claude Code Remote Control + Channels](https://code.claude.com/docs/en/remote-control) | human_in_loop | component | 1 | 0 | 1 | 1 | Claude Code CLI: proprietary. The GitHub API reports no lice |
| [Cosine (Genie / Lumen agent; Cloud, CLI, Desktop)](https://cosine.sh/docs/) | coding_agent_platform | component | 1 | 1 | 0 | 1 | Proprietary / commercial. The public GitHub org CosineAI has |
| [Daytona](https://github.com/daytonaio/daytona) | sandbox | component | 0 | 2 | 0 | 1 | AGPL-3.0, from the LICENSE and COPYRIGHT files at tag v0.190 |
| [Docker Sandboxes (sbx)](https://docs.docker.com/ai/sandboxes/) | sandbox | component | 0 | 2 | 0 | 1 | Proprietary. The docker/sbx-releases repo holds only LICENSE |
| [E2B (SDK e2b-dev/E2B + open-source runtime e2b-dev/runtime, formerly e2b-dev/infra)](https://github.com/e2b-dev/E2B) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 (SDK repo and runtime repo, read via GitHub API). |
| [GitHub Spec Kit (specify CLI)](https://github.com/github/spec-kit) | workflow_foundation | component | 1 | 0 | 1 | 1 | MIT |
| [JetBrains Koog](https://github.com/JetBrains/koog) | agent_framework | component | 1 | 0 | 0 | 2 | Apache-2.0 |
| [kagent + Agent Substrate (agent-substrate/substrate)](https://github.com/agent-substrate/substrate) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 (both agent-substrate/substrate and kagent-dev/ka |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | coding_agent_platform | component | 1 | 1 | 0 | 1 | MIT (GitHub API license spdx MIT; README License section) |
| [Kubernetes agent-sandbox (kubernetes-sigs/agent-sandbox, SIG Apps)](https://github.com/kubernetes-sigs/agent-sandbox) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 (from gh api, and the LICENSE file in the repo) |
| [microsandbox](https://github.com/superradcompany/microsandbox) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 |
| [Modal Sandboxes](https://modal.com/docs/guide/sandbox) | sandbox | component | 0 | 2 | 0 | 1 | Client SDK modal-labs/modal-client is Apache-2.0. The platfo |
| [NVIDIA OpenShell (now ai-openshell/openshell, CNCF)](https://github.com/ai-openshell/openshell) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 |
| [Plane](https://github.com/makeplane/plane) | tracker_bridge | component | 1 | 0 | 1 | 1 | AGPL-3.0 for the Community Edition (LICENSE.txt, GitHub API  |
| [Strands Box](https://github.com/strands-agents/box) | sandbox | component | 0 | 2 | 0 | 1 | Apache-2.0 |
| [Tracekit Box](https://github.com/Cygnux-Labs/Tracekit-box) | sandbox | component | 0 | 2 | 0 | 1 | MIT (Box). The Tracekit signer it requires (github.com/Cygnu |
| [Vercel Sandbox](https://vercel.com/docs/sandbox) | sandbox | component | 0 | 2 | 0 | 1 | SDK and CLI (github.com/vercel/sandbox): Apache-2.0. The mic |
| [AgentOps](https://github.com/AgentOps-AI/agentops) | tracing | component | 0 | 0 | 0 | 2 | The SDK at the repo root is MIT. The self-hostable dashboard |
| [AIO Sandbox (agent-infra/sandbox, ByteDance)](https://github.com/agent-infra/sandbox) | sandbox | component | 0 | 1 | 0 | 1 | Apache-2.0 on the repo contents: docs, SDKs, examples, evalu |
| [Anthropic Sandbox Runtime (srt)](https://github.com/anthropics/sandbox-runtime) | sandbox | component | 0 | 1 | 0 | 1 | Apache-2.0 |
| [Arize Phoenix](https://github.com/Arize-ai/phoenix) | tracing | component | 0 | 0 | 0 | 2 | Elastic License 2.0 (ELv2). This is source-available, not OS |
| [Asynq](https://github.com/hibiken/asynq) | workflow_foundation | component | 1 | 0 | 0 | 1 | MIT (GitHub API: license MIT) |
| [Braintrust](https://www.braintrust.dev) | tracing | component | 0 | 0 | 0 | 2 | Proprietary SaaS platform. Open parts: SDKs Apache-2.0 (brai |
| [Chainloop (OSS)](https://github.com/chainloop-dev/chainloop) | tracing | component | 0 | 0 | 0 | 2 | Apache-2.0. Separate commercial Chainloop Platform (SaaS or  |
| [Claude Code built-in OpenTelemetry telemetry](https://code.claude.com/docs/en/monitoring-usage) | tracing | component | 0 | 0 | 0 | 2 | Proprietary. Claude Code is under Anthropic commercial terms |
| [claude-replay](https://github.com/es617/claude-replay) | tracing | component | 0 | 0 | 1 | 1 | MIT (GitHub API license.spdx_id = MIT; LICENSE file in repo) |
| [Coze Loop (ByteDance)](https://github.com/coze-dev/coze-loop) | tracing | component | 0 | 0 | 0 | 2 | Apache-2.0 (GitHub license field and README) |
| [Crush (charmbracelet/crush)](https://github.com/charmbracelet/crush) | coding_agent_platform | component | 1 | 0 | 0 | 1 | FSL-1.1-MIT (Functional Source License 1.1, MIT Future Licen |
| [Dagger container-use](https://github.com/dagger/container-use) | sandbox | component | 0 | 1 | 0 | 1 | Apache-2.0 (GitHub API: license.spdx_id = Apache-2.0) |
| [Dash0 / SigNoz / OpenObserve (OTLP backends for agent session telemetry)](https://signoz.io) | tracing | component | 0 | 0 | 0 | 2 | SigNoz: MIT (Expat) for everything outside ee/ and cmd/enter |
| [fanout](https://github.com/Breadstick-Crumbs/fanout) | other | component | 1 | 0 | 0 | 1 | MIT (GitHub license field and README) |
| [Flagger (Flux)](https://github.com/fluxcd/flagger) | other | component | 0 | 0 | 1 | 1 | Apache-2.0 |
| [Fly.io Sprites / Fly Machines](https://fly.io/learn/agent-sandbox-providers/) | sandbox | component | 0 | 2 | 0 | 0 | Proprietary hosted service. The client SDKs are MIT: sprites |
| [GitHub Environments: required reviewers and deployment protection rules](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment) | human_in_loop | component | 1 | 0 | 1 | 0 | Proprietary SaaS feature of GitHub (no source code). Gating  |
| [GitHub merge queue + repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) | other | component | 1 | 1 | 0 | 0 | Proprietary hosted SaaS feature of GitHub. Not open source. |
| [HolmesGPT (CNCF Sandbox)](https://github.com/HolmesGPT/holmesgpt) | other | component | 0 | 0 | 1 | 1 | Apache-2.0 |
| [Jira workflow transitions + Jira Automation (incl. JSM approvals)](https://support.atlassian.com/cloud-automation/docs/jira-cloud-automation/) | tracker_bridge | component | 1 | 0 | 1 | 0 | Proprietary, a commercial Atlassian SaaS feature included in |
| [Kargo (Akuity)](https://github.com/akuity/kargo) | other | component | 1 | 0 | 1 | 0 | Apache-2.0 for the open-source core. Several features are co |
| [Laminar (lmnr-ai/lmnr)](https://github.com/lmnr-ai/lmnr) | tracing | component | 0 | 0 | 0 | 2 | Apache-2.0 for the whole repo (LICENSE.md). Self-hosted Sign |
| [Langfuse](https://github.com/langfuse/langfuse) | tracing | component | 0 | 0 | 0 | 2 | Open core. The LICENSE file (read via gh api) says code outs |
| [LangWatch (with a note on Agenta)](https://github.com/langwatch/langwatch) | tracing | component | 0 | 0 | 0 | 2 | Core is Apache-2.0 (GitHub SPDX Apache-2.0). Modules under e |
| [LLM gateways: agentgateway (primary), with Bifrost and Portkey Gateway compared](https://github.com/agentgateway/agentgateway) | other | component | 0 | 1 | 0 | 1 | agentgateway Apache-2.0; Bifrost Apache-2.0 (multi-node clus |
| [Mergify (Merge Queue, Workflow Automation, CI Insights, Test Engine)](https://mergify.com/) | other | component | 1 | 0 | 0 | 1 | Proprietary SaaS. The old open-source engine repo Mergifyio/ |
| [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) | agent_framework | component | 0 | 1 | 0 | 1 | MIT |
| [MLflow Tracing (part of MLflow)](https://github.com/mlflow/mlflow) | tracing | component | 0 | 0 | 0 | 2 | Apache-2.0 (GitHub API: spdx Apache-2.0) |
| [opencode](https://github.com/anomalyco/opencode) | coding_agent_platform | component | 1 | 0 | 0 | 1 | MIT (GitHub API license.spdx_id = MIT) |
| [OpenLIT](https://github.com/openlit/openlit) | tracing | component | 0 | 0 | 0 | 2 | Apache-2.0 (GitHub license field and README: "Self-host free |
| [Opik (Comet)](https://github.com/comet-ml/opik) | tracing | component | 0 | 0 | 0 | 2 | Apache-2.0, covering the full platform: server, web app, eva |
| [PandaStack](https://github.com/pandastack-io/pandastack-ai) | sandbox | component | 0 | 1 | 0 | 1 | Apache-2.0 (GitHub license field and README). The README say |
| [Playwright MCP (microsoft/playwright-mcp)](https://github.com/microsoft/playwright-mcp) | other | component | 0 | 1 | 0 | 1 | Apache-2.0 (GitHub license field) |
| [Pydantic Logfire](https://github.com/pydantic/logfire) | tracing | component | 0 | 0 | 0 | 2 | The SDK is MIT (GitHub API: license MIT). The platform (UI a |
| [Slack Block Kit + Bolt (interactive messages, modals)](https://docs.slack.dev/block-kit/) | human_in_loop | component | 0 | 0 | 2 | 0 | Bolt SDKs MIT (bolt-js, bolt-python). Block Kit is a proprie |
| [Smokescreen (Stripe)](https://github.com/stripe/smokescreen) | sandbox | component | 0 | 1 | 0 | 1 | MIT (GitHub API license.spdx_id = MIT) |
| [smolvm](https://github.com/smol-machines/smolvm) | sandbox | component | 0 | 2 | 0 | 0 | Apache-2.0 (from the GitHub API and the README). |
| [W&B Weave](https://github.com/wandb/weave) | tracing | component | 0 | 0 | 0 | 2 | Apache-2.0 for the SDK (GitHub license field). The trace ser |
| [Argo Rollouts](https://github.com/argoproj/argo-rollouts) | other | component | 0 | 0 | 1 | 0 | Apache-2.0 (GitHub API) |
| [browser-use (with browserbase/stagehand as the sibling alternative)](https://github.com/browser-use/browser-use) | other | component | 0 | 0 | 0 | 1 | MIT (both). Hosted parts are paid services: Browser Use Clou |
| [bubblewrap (bwrap)](https://github.com/containers/bubblewrap) | sandbox | component | 0 | 1 | 0 | 0 | LGPL-2.0-or-later. GitHub's API reports NOASSERTION, and the |
| [cc_transcript_viewer](https://github.com/tim-hua-01/cc_transcript_viewer) | tracing | component | 0 | 0 | 0 | 1 | MIT (GitHub license field) |
| [ccusage](https://github.com/ccusage/ccusage) | tracing | component | 0 | 0 | 0 | 1 | MIT (GitHub API: license MIT) |
| [Claude API / Managed Agents OpenTelemetry trace export (beta)](https://platform.claude.com/docs/en/manage-claude/opentelemetry) | tracing | component | 0 | 0 | 0 | 1 | Proprietary hosted platform feature under Anthropic's Beta S |
| [claude-code-otel](https://github.com/ColeMurray/claude-code-otel) | tracing | component | 0 | 0 | 0 | 1 | MIT |
| [claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) | tracing | component | 0 | 0 | 0 | 1 | Apache-2.0 (GitHub license field and README badge) |
| [Cloud Hypervisor](https://github.com/cloud-hypervisor/cloud-hypervisor) | sandbox | component | 0 | 1 | 0 | 0 | The LICENSES/ folder holds Apache-2.0.txt, BSD-3-Clause.txt  |
| [Codex plugin for Claude Code (openai/codex-plugin-cc)](https://github.com/openai/codex-plugin-cc) | other | component | 0 | 0 | 0 | 1 | Apache-2.0 (LICENSE and NOTICE at the repo root and in plugi |
| [Conftest (Open Policy Agent / Rego)](https://github.com/open-policy-agent/conftest) | other | component | 1 | 0 | 0 | 0 | Apache-2.0 (the GitHub API reports NOASSERTION, but the LICE |
| [Dev Containers CLI (devcontainers/cli)](https://github.com/devcontainers/cli) | sandbox | component | 0 | 1 | 0 | 0 | MIT (GitHub API license.spdx_id = MIT) |
| [DSPy](https://github.com/stanfordnlp/dspy) | agent_framework | component | 0 | 0 | 0 | 1 | MIT (GitHub API license.spdx_id = MIT) |
| [Firecracker](https://github.com/firecracker-microvm/firecracker) | sandbox | component | 0 | 1 | 0 | 0 | Apache-2.0 |
| [GitHub MCP Server (github/github-mcp-server) + mcp-atlassian (sooperset/mcp-atlassian)](https://github.com/sooperset/mcp-atlassian) | tracker_bridge | component | 1 | 0 | 0 | 0 | MIT (both) |
| [gVisor](https://github.com/google/gvisor) | sandbox | component | 0 | 1 | 0 | 0 | Apache-2.0 (GitHub API) |
| [Helicone](https://github.com/Helicone/helicone) | tracing | component | 0 | 0 | 0 | 1 | Apache-2.0 (main repo, per the GitHub API and the README). T |
| [Kata Containers](https://github.com/kata-containers/kata-containers) | sandbox | component | 0 | 1 | 0 | 0 | Apache-2.0 (GitHub API license field and README) |
| [LiteLLM](https://github.com/BerriAI/litellm) | other | component | 0 | 0 | 0 | 1 | The LICENSE file in the repo says that content under litellm |
| [MCP Apps (modelcontextprotocol/ext-apps)](https://github.com/modelcontextprotocol/ext-apps) | human_in_loop | component | 0 | 0 | 1 | 0 | Apache-2.0 for new code and the spec, with legacy MIT for co |
| [MCP Elicitation (form and URL mode)](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation) | human_in_loop | component | 0 | 0 | 1 | 0 | The spec repo modelcontextprotocol/modelcontextprotocol show |
| [ntfy](https://github.com/binwiederhier/ntfy) | human_in_loop | component | 0 | 0 | 1 | 0 | Apache-2.0 (from the gh api license field; the project descr |
| [Octo STS (Chainguard)](https://github.com/octo-sts/app) | sandbox | component | 0 | 1 | 0 | 0 | Apache-2.0 (GitHub API license field) |
| [OpenLLMetry (Traceloop)](https://github.com/traceloop/openllmetry) | tracing | component | 0 | 0 | 0 | 1 | Apache-2.0 (GitHub license field and README) |
| [OpenSpec (Fission-AI)](https://github.com/Fission-AI/OpenSpec) | other | component | 1 | 0 | 0 | 0 | MIT |
| [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai (moved from https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai)) | tracing | component | 0 | 0 | 0 | 1 | Apache-2.0 |
| [PR-Agent (The-PR-Agent/pr-agent, formerly Qodo/CodiumAI)](https://github.com/The-PR-Agent/pr-agent) | other | component | 0 | 0 | 0 | 1 | MIT (GitHub API license.spdx_id = MIT) |
| [Telegram Bot API inline keyboards (callback buttons)](https://core.telegram.org/bots/api#inlinekeyboardmarkup) | human_in_loop | component | 0 | 0 | 1 | 0 | The Bot API is a proprietary hosted service under the Telegr |
| [CodeRabbit](https://www.coderabbit.ai/) | other | component | 0 | 0 | 0 | 0 | Proprietary SaaS, priced per seat: Essentials $24, Team $48, |
| [Greptile](https://www.greptile.com/) | other | component | 0 | 0 | 0 | 0 | Proprietary SaaS, closed source. The on-prem infra repo grep |
| [Keep (keephq/keep) + k8sgpt (k8sgpt-ai/k8sgpt)](https://github.com/keephq/keep) | other | component | 0 | 0 | 0 | 0 | Keep: MIT except the ee/ directory (identitymanager), which  |
| [Delegatus](https://github.com/Latand/delegatus) | coding_agent_platform | inspiration_only | 2 | 1 | 2 | 2 | MIT (GitHub license field and README) |
| [SWFactory (ariflow-swfactory)](https://github.com/zozo123/ariflow-swfactory) | workflow_foundation | inspiration_only | 2 | 2 | 1 | 2 | Apache-2.0 |
| [ABCA (Autonomous Background Coding Agents on AWS), aws-samples/sample-autonomous-cloud-coding-agents](https://github.com/aws-samples/sample-autonomous-cloud-coding-agents) | coding_agent_platform | inspiration_only | 1 | 2 | 1 | 2 | MIT-0 (GitHub API license field). The README says it is "for |
| [Dify](https://github.com/langgenius/dify) | workflow_foundation | inspiration_only | 1 | 1 | 2 | 2 | The GitHub API reports NOASSERTION. The LICENSE file is "a m |
| [Fusion (Runfusion/Fusion)](https://github.com/Runfusion/Fusion) | coding_agent_platform | inspiration_only | 2 | 1 | 1 | 2 | MIT (GitHub API license spdx_id MIT; README badge) |
| [Kortix CompanyOS (formerly Suna)](https://github.com/kortix-ai/CompanyOS) | whole_engine | inspiration_only | 1 | 2 | 2 | 1 | Elastic License 2.0 (LICENSE file; GitHub reports NOASSERTIO |
| [MindFlock](https://github.com/MindFlock/MindFlock) | whole_engine | inspiration_only | 2 | 1 | 2 | 1 | Apache-2.0 (code); the MindFlock name and logo are trademark |
| [Tale](https://github.com/tale-project/tale) | coding_agent_platform | inspiration_only | 1 | 2 | 1 | 2 | MIT (GitHub license field: MIT; README says Community and En |
| [Warp Oz / Warp Factories (Automation Platform with oz-agent-worker self-hosted execution)](https://www.warp.dev/oz/self-hosting) | coding_agent_platform | inspiration_only | 1 | 2 | 1 | 2 | Proprietary SaaS control plane (Warp Factories / Automation  |
| [Augment Code Cloud Agents / Cosmos (now Harness Cosmos Software Factory Agent)](https://www.augmentcode.com/product/cloud-agents) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 2 | Proprietary SaaS. The CLI repo augmentcode/auggie has licens |
| [aws-samples remote-swe-agents](https://github.com/aws-samples/remote-swe-agents) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 2 | MIT-0 |
| [Cloudflare Agents SDK (agents) with human-in-the-loop patterns](https://developers.cloudflare.com/agents/ (code: https://github.com/cloudflare/agents)) | agent_framework | inspiration_only | 1 | 2 | 1 | 1 | MIT (cloudflare/agents). workerd runtime is Apache-2.0. clou |
| [Gas Town (gastownhall/gastown)](https://github.com/gastownhall/gastown) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 2 | MIT |
| [GitLab Duo Agent Platform (flows, external agents)](https://docs.gitlab.com/user/duo_agent_platform/agents/external/) | coding_agent_platform | inspiration_only | 1 | 2 | 1 | 1 | Proprietary, part of GitLab's paid tiers. External agents ne |
| [Golem](https://github.com/golemcloud/golem) | workflow_foundation | inspiration_only | 1 | 1 | 1 | 2 | Business Source License 1.1 (GitHub shows NOASSERTION). The  |
| [Ona (formerly Gitpod) background agents / Ona Enterprise](https://ona.com/) | coding_agent_platform | inspiration_only | 1 | 2 | 0 | 2 | Proprietary commercial (Enterprise, contact sales). The open |
| [Open SWE (now "Robin"), LangChain](https://github.com/langchain-ai/open-swe) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 2 | MIT for Robin's own code. The README says vendor/ is not lic |
| [Sinatra (sinatra.dev)](https://www.sinatra.dev/) | coding_agent_platform | inspiration_only | 1 | 2 | 1 | 1 | Proprietary SaaS. Only the generated SDKs (sinatra-node, sin |
| [TaskHandoff](https://github.com/edgestorage/task-handoff) | coding_agent_platform | inspiration_only | 1 | 1 | 2 | 1 | Apache-2.0 (GitHub license field and LICENSE/NOTICE in repo) |
| [addyosmani/factory](https://github.com/addyosmani/factory) | whole_engine | inspiration_only | 1 | 1 | 1 | 1 | MIT (LICENSE file; GitHub reports MIT) |
| [Agent Kanban (saltbo)](https://github.com/saltbo/agent-kanban) | human_in_loop | inspiration_only | 1 | 1 | 1 | 1 | FSL-1.1-ALv2 (Functional Source License 1.1, read in LICENSE |
| [AgentScope 2.0 (with former AgentScope Runtime merged in)](https://github.com/agentscope-ai/agentscope) | agent_framework | inspiration_only | 1 | 1 | 1 | 1 | Apache-2.0 (both agentscope and agentscope-runtime, from gh  |
| [Atomic (bastani-inc/atomic)](https://github.com/bastani-inc/atomic) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 1 | The LICENSE file is MIT text plus one extra clause: a produc |
| [AutoGen (microsoft/autogen)](https://github.com/microsoft/autogen) | agent_framework | inspiration_only | 1 | 1 | 1 | 1 | Code under MIT (LICENSE-CODE), docs under CC-BY-4.0. The Git |
| [AWS Step Functions](https://aws.amazon.com/step-functions/) | workflow_foundation | inspiration_only | 1 | 1 | 1 | 1 | Proprietary managed service, pay per use. Standard workflows |
| [BeeAI Framework](https://github.com/i-am-bee/beeai-framework) | agent_framework | inspiration_only | 1 | 0 | 1 | 2 | Apache-2.0 (GitHub API license field; LF AI & Data project,  |
| [CAMEL](https://github.com/camel-ai/camel) | agent_framework | inspiration_only | 1 | 1 | 1 | 1 | Apache-2.0 (gh api) |
| [Camunda 8 / Zeebe (camunda/camunda)](https://github.com/camunda/camunda) | workflow_foundation | inspiration_only | 2 | 0 | 1 | 1 | Source-available, not open source. Zeebe, Operate, Tasklist, |
| [Cloudflare Workflows](https://developers.cloudflare.com/workflows/) | workflow_foundation | inspiration_only | 1 | 1 | 1 | 1 | The service is proprietary and runs only on Cloudflare. Rela |
| [Cyrus](https://github.com/ceedaragents/cyrus) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 1 | Apache-2.0 |
| [FastClaw (fastclaw-ai/fastclaw)](https://github.com/fastclaw-ai/fastclaw) | agent_framework | inspiration_only | 1 | 1 | 1 | 1 | "FastClaw Community License 1.0" is source-available, not OS |
| [Foreman (VisionForge-OU/foreman)](https://github.com/VisionForge-OU/foreman) | whole_engine | inspiration_only | 1 | 0 | 1 | 2 | MIT. The LICENSE file is MIT text with an extra attribution  |
| [Google Antigravity (App, agy CLI, Python SDK)](https://antigravity.google/docs/overview/) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 1 | Proprietary product. The Python SDK repo (google-antigravity |
| [Inngest AgentKit](https://github.com/inngest/agent-kit) | workflow_foundation | inspiration_only | 1 | 0 | 1 | 2 | AgentKit: Apache-2.0. The Inngest server it depends on (inng |
| [jimbobbennett/software-factory](https://github.com/jimbobbennett/software-factory) | tracing | inspiration_only | 1 | 0 | 1 | 2 | MIT |
| [Kander](https://github.com/dualface/kander) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 1 | MIT |
| [Letta / Letta Code](https://github.com/letta-ai/letta-code) | agent_framework | inspiration_only | 1 | 1 | 1 | 1 | Apache-2.0 (letta-code and letta) |
| [Linear cloud coding agent (coding sessions) + Linear Agent API](https://linear.app/docs/linear-cloud-coding-agent) | tracker_bridge | inspiration_only | 1 | 1 | 1 | 1 | Proprietary SaaS, closed source. Only the SDK/tools repo git |
| [Microsoft Agent Framework (Go SDK; .NET/Python upstream not reachable)](https://github.com/microsoft/agent-framework-go) | agent_framework | inspiration_only | 1 | 0 | 1 | 2 | MIT (agent-framework-go; also MIT for microsoft/agent-framew |
| [Mission Control (builderz-labs)](https://github.com/builderz-labs/mission-control) | coding_agent_platform | inspiration_only | 1 | 0 | 1 | 2 | MIT |
| [Multica (multica-ai/multica)](https://github.com/multica-ai/multica) | coding_agent_platform | inspiration_only | 1 | 0 | 1 | 2 | The "Multica License": Apache-2.0 plus extra conditions (Git |
| [Netflix Maestro](https://github.com/Netflix/maestro) | workflow_foundation | inspiration_only | 1 | 1 | 1 | 1 | Apache-2.0 |
| [Open Workflow Specification (formerly CNCF Serverless Workflow)](https://github.com/open-workflow-specification/specification) | workflow_foundation | inspiration_only | 1 | 1 | 1 | 1 | Apache-2.0 (spec repo). Runtimes: sdk-java, quarkus-flow, ko |
| [OpenSRE (Tracer-Cloud/opensre)](https://github.com/Tracer-Cloud/opensre) | other | inspiration_only | 1 | 1 | 1 | 1 | Apache-2.0 |
| [Parallel-agent desktop managers: Paradev (formerly Superset), Emdash, Crystal (now Nimbalyst), Sculptor (Imbue)](https://github.com/ParadevAI/Paradev) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 1 | Paradev MIT; Emdash Apache-2.0; Crystal MIT; Sculptor MIT (R |
| [ralphex](https://github.com/umputun/ralphex) | coding_agent_platform | inspiration_only | 1 | 1 | 1 | 1 | MIT (gh api: license MIT) |
| [render py-software-factory](https://github.com/render-examples/py-software-factory) | workflow_foundation | inspiration_only | 1 | 2 | 0 | 1 | MIT (gh api: license MIT; LICENSE file present) |
| [Ruflo (formerly Claude Flow)](https://github.com/ruvnet/ruflo) | agent_framework | inspiration_only | 1 | 1 | 1 | 1 | MIT |
| [you-agent-factory (portpowered)](https://github.com/portpowered/you-agent-factory) | workflow_foundation | inspiration_only | 2 | 0 | 0 | 2 | MIT (GitHub API license field and README) |
| [A2A (Agent2Agent) protocol](https://github.com/a2aproject/A2A) | other | inspiration_only | 1 | 0 | 1 | 1 | Apache-2.0 (gh api: license.spdx_id = Apache-2.0) |
| [any-agent (Mozilla.ai)](https://github.com/mozilla-ai/any-agent) | agent_framework | inspiration_only | 1 | 0 | 0 | 2 | Apache-2.0 (gh api repos/mozilla-ai/any-agent) |
| [Atlassian Rovo Dev / Jira Coding Agent (with Code Reviewer, Jira Automation)](https://www.atlassian.com/software/rovo-dev) | coding_agent_platform | inspiration_only | 1 | 1 | 0 | 1 | Proprietary commercial SaaS. Billed per use in Rovo credits  |
| [BMAD Method (with its companion orchestrator bmad-loop)](https://github.com/bmad-code-org/BMAD-METHOD) | agent_framework | inspiration_only | 1 | 0 | 1 | 1 | MIT. GitHub shows NOASSERTION only because the LICENSE file  |
| [ChatDev 2.0 (DevAll), with MetaGPT as sibling reference](https://github.com/OpenBMB/ChatDev) | agent_framework | inspiration_only | 1 | 0 | 1 | 1 | ChatDev: Apache-2.0. MetaGPT: MIT. |
| [Compound Engineering plugin (Every)](https://github.com/EveryInc/compound-engineering-plugin) | other | inspiration_only | 1 | 0 | 1 | 1 | MIT (gh api license.spdx_id = MIT) |
| [Cotal](https://github.com/Cotal-AI/Cotal) | agent_framework | inspiration_only | 1 | 0 | 1 | 1 | Apache-2.0 for the whole repo (LICENSING.md). A future hoste |
| [CrewAI](https://github.com/crewAIInc/crewAI) | agent_framework | inspiration_only | 1 | 0 | 1 | 1 | MIT (GitHub API: license MIT). Tracing in the AMP dashboard  |
| [deep-mode (now deepmodebot)](https://github.com/TimothyVang/deepmodebot) | coding_agent_platform | inspiration_only | 1 | 0 | 1 | 1 | MIT according to the README and LICENSE ("MIT License, Copyr |
| [GPT-Pilot (Pythagora) / Sweep](https://github.com/Pythagora-io/gpt-pilot) | whole_engine | inspiration_only | 1 | 0 | 1 | 1 | GPT-Pilot: FSL-1.1-MIT (Functional Source License, turns int |
| [HumanLayer (incl. CodeLayer / "Riptide")](https://github.com/humanlayer/humanlayer) | coding_agent_platform | inspiration_only | 1 | 0 | 1 | 1 | Apache-2.0 (a few vendored folders MIT, per NOTICE) |
| [Mergen (mergen-server) HITL](https://mergen.app/docs/hitl-setup) | human_in_loop | inspiration_only | 0 | 1 | 1 | 1 | Commercial and closed source. The npm package says 'SEE LICE |
| [OpenAI Symphony](https://github.com/openai/symphony) | coding_agent_platform | inspiration_only | 1 | 1 | 0 | 1 | Apache-2.0 (GitHub API license field; LICENSE and NOTICE in  |
| [Orbi](https://github.com/orbi-build/orbi) | whole_engine | inspiration_only | 1 | 0 | 1 | 1 | AGPL-3.0, with the Sustainable Use License v1.0 as an altern |
| [Taskmaster AI (claude-task-master, npm task-master-ai)](https://github.com/eyaltoledano/claude-task-master) | other | inspiration_only | 1 | 1 | 0 | 1 | MIT plus a "Commons Clause" condition (GitHub reports NOASSE |
| [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) | coding_agent_platform | inspiration_only | 1 | 0 | 1 | 1 | Apache-2.0 (from the GitHub API) |
| [wshobson/agents](https://github.com/wshobson/agents) | other | inspiration_only | 1 | 0 | 1 | 1 | MIT for the repo (LICENSE, README). The 2 external marketpla |
| [Zencoder Autonomous Zen Agents for CI (with Zenflow)](https://zencoder.ai/blog/autonomous-zen-agents-for-ci) | coding_agent_platform | inspiration_only | 1 | 1 | 0 | 1 | Proprietary. The agent CLI comes as a binary from download.z |
| [cc-sdd (gotalab) and Agent OS (buildermethods)](https://github.com/gotalab/cc-sdd) | other | inspiration_only | 1 | 0 | 1 | 0 | MIT (both; from the GitHub API) |
| [claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | tracing | inspiration_only | 0 | 0 | 1 | 1 | None. The GitHub API returns license: null and the repo tree |
| [claude-dev-kit (The Agile Monkeys)](https://github.com/theam/claude-dev-kit) | agent_framework | inspiration_only | 1 | 0 | 1 | 0 | Apache-2.0 (gh api) |
| [Coder AgentAPI](https://github.com/coder/agentapi) | other | inspiration_only | 1 | 0 | 0 | 1 | MIT |
| [Contrabass](https://github.com/junhoyeo/contrabass) | whole_engine | inspiration_only | 1 | 0 | 0 | 1 | Apache-2.0 (GitHub API license.spdx_id) |
| [Finn-loop](https://github.com/finna/Finn-loop) | other | inspiration_only | 1 | 0 | 1 | 0 | MIT (GitHub API license.spdx_id = MIT) |
| [gotoHuman](https://www.gotohuman.com/) | human_in_loop | inspiration_only | 0 | 0 | 2 | 0 | The service is proprietary SaaS. The client pieces are MIT o |
| [jinka](https://github.com/yegor256/jinka) | other | inspiration_only | 1 | 0 | 0 | 1 | MIT (LICENSE.txt, REUSE-compliant) |
| [NXTG-Forge Orchestrator (forge-orchestrator)](https://github.com/nxtg-ai/forge-orchestrator) | coding_agent_platform | inspiration_only | 1 | 0 | 0 | 1 | FSL-1.1-ALv2 (Functional Source License): source-available,  |
| [Permit.io (Access Request MCP server permitio/permit-mcp + Permit MCP Gateway HITL approvals)](https://github.com/permitio/permit-mcp) | human_in_loop | inspiration_only | 0 | 0 | 1 | 1 | permit-mcp: MIT. Related open parts: permitio/PDP Apache-2.0 |
| [Research SWE agents: AutoCodeRover (primary), Agentless, Moatless Tools, OpenManus](https://github.com/AutoCodeRoverSG/auto-code-rover) | agent_framework | inspiration_only | 0 | 1 | 0 | 1 | AutoCodeRover: SONAR Source-Available License v1.0 (LICENSE, |
| [Trae Agent (ByteDance)](https://github.com/bytedance/trae-agent) | coding_agent_platform | inspiration_only | 0 | 1 | 0 | 1 | MIT (GitHub license field: MIT) |
| [Turbo (tobihagemann/turbo)](https://github.com/tobihagemann/turbo) | other | inspiration_only | 1 | 0 | 1 | 0 | MIT |
| [YYLO (yylo-dev/yylo)](https://github.com/yylo-dev/yylo) | coding_agent_platform | inspiration_only | 1 | 0 | 0 | 1 | MIT (GitHub license field and README) |
| [Anthropic Claude Code cloud-session git proxy (reference, issue #57356)](https://github.com/anthropics/claude-code/issues/57356) | sandbox | inspiration_only | 0 | 1 | 0 | 0 | Proprietary. The anthropics/claude-code GitHub repo has no S |
| [Arrakis](https://github.com/abshkbh/arrakis) | sandbox | inspiration_only | 0 | 1 | 0 | 0 | AGPL-3.0 (commercial license available from the author by em |
| [Baton (mraza007/baton)](https://github.com/mraza007/baton) | tracker_bridge | inspiration_only | 1 | 0 | 0 | 0 | MIT (GitHub API license.spdx_id = MIT; LICENSE file in repo) |
| [canonical/gh-jira-sync-bot](https://github.com/canonical/gh-jira-sync-bot) | tracker_bridge | inspiration_only | 1 | 0 | 0 | 0 | AGPL-3.0 (from the GitHub API). Network-use copyleft: if we  |
| [cc-remote-approval](https://github.com/Manta-Network/cc-remote-approval) | human_in_loop | inspiration_only | 0 | 0 | 1 | 0 | Unclear. The README says "License: MIT", but the repo has no |
| [Claude Squad](https://github.com/smtg-ai/claude-squad) | coding_agent_platform | inspiration_only | 1 | 0 | 0 | 0 | AGPL-3.0 (LICENSE.md), plus a CLA for contributors (.github/ |
| [Code Conductor](https://github.com/ryanmac/code-conductor) | tracker_bridge | inspiration_only | 1 | 0 | 0 | 0 | MIT (LICENSE file added only in the 2026-03-30 commit; befor |
| [LangChain Agent Inbox](https://github.com/langchain-ai/agent-inbox) | human_in_loop | inspiration_only | 0 | 0 | 1 | 0 | MIT (GitHub license field: MIT) |
| [OpenPipe ART (Agent Reinforcement Trainer)](https://github.com/OpenPipe/ART) | other | inspiration_only | 0 | 0 | 0 | 1 | Apache-2.0 (GitHub API) |
| [Superpowers (obra/superpowers)](https://github.com/obra/superpowers) | other | inspiration_only | 1 | 0 | 0 | 0 | MIT |
| [Trail of Bits claude-code-devcontainer](https://github.com/trailofbits/claude-code-devcontainer) | sandbox | inspiration_only | 0 | 1 | 0 | 0 | Apache-2.0 |
| [awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators) | other | inspiration_only | 0 | 0 | 0 | 0 | CC0-1.0 (list content) |
| [coreos/issue-sync](https://github.com/coreos/issue-sync) | tracker_bridge | inspiration_only | 0 | 0 | 0 | 0 | Apache-2.0 |
| [espressif/sync-jira-actions](https://github.com/espressif/sync-jira-actions) | tracker_bridge | inspiration_only | 0 | 0 | 0 | 0 | Apache-2.0 |
| [GitHits Software Factory Directory](https://githits.com/software-factories/) | other | inspiration_only | 0 | 0 | 0 | 0 | Not applicable. The directory is proprietary site content (© |
| [pi-reflect](https://github.com/jo-inc/pi-reflect) | other | inspiration_only | 0 | 0 | 0 | 0 | MIT (GitHub API license.spdx_id = MIT; package.json "license |
| [Google Jules (+ Jules REST API v1alpha)](https://developers.google.com/jules/api) | coding_agent_platform | not_fit | 1 | 1 | 1 | 1 | Proprietary SaaS (Google Labs). Docs are CC-BY 4.0 and code  |
| [Codegen (codegen.com, codegen-sh)](https://docs.codegen.com/capabilities/claude-code) | coding_agent_platform | not_fit | 1 | 1 | 0 | 1 | The SDK/CLI wrapper repo codegen-sh/codegen is Apache-2.0, b |
| [Dagster](https://github.com/dagster-io/dagster) | workflow_foundation | not_fit | 1 | 1 | 0 | 1 | Apache-2.0 (GitHub API: license.spdx_id = Apache-2.0) |
| [Upstash Workflow (workflow-js)](https://github.com/upstash/workflow-js) | workflow_foundation | not_fit | 1 | 0 | 1 | 1 | The SDK is MIT. The engine underneath, QStash, is proprietar |
| [Aider (scripted / as library)](https://github.com/Aider-AI/aider) | coding_agent_platform | not_fit | 1 | 0 | 0 | 1 | Apache-2.0 (GitHub license API) |
| [Continue (continuedev/continue): CLI `cn`, VS Code and JetBrains extensions, Continuous AI / cloud agents](https://github.com/continuedev/continue) | coding_agent_platform | not_fit | 0 | 0 | 0 | 1 | Apache-2.0 (GitHub API license field; README: Apache 2.0 (c) |
| [google-research/paper-orchestra](https://github.com/google-research/paper-orchestra) | other | not_fit | 0 | 0 | 0 | 1 | Apache-2.0 (GitHub API license field; per-file Apache header |
| [Unito (GitHub-Jira two-way sync)](https://unito.io/integrations/github-jira/) | tracker_bridge | not_fit | 1 | 0 | 0 | 0 | Proprietary commercial SaaS. Priced by "items in sync" and f |
| [Exalate (Jira-GitHub connector, Classic and New Exalate)](https://exalate.com/integrations/jira-github/) | tracker_bridge | not_fit | 0 | 0 | 0 | 0 | Proprietary commercial SaaS/app; no source available. New Ex |
| [Runloop Devboxes](https://docs.runloop.ai/docs/devboxes/overview) | sandbox | not_fit | 0 | 0 | 0 | 0 | Platform is proprietary SaaS. Client SDKs api-client-python  |
