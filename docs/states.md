# Work item states and transitions

**Draft, awaiting approval.** The state lives in the tracker (GitHub Issues: a `state:…` label; Jira: a workflow status). The pipeline moves a work item only along the transitions below; a move into a "waits for the Operator" state is a gate.

### Part 1. Preparation: from signal to approved plan

```mermaid
stateDiagram-v2
  direction LR
  [*] --> New: signal
  New --> NeedsInfo: unclear, questions to the requester
  NeedsInfo --> New: requester answered
  New --> Triaged: checked, sized, outcome proposed
  Triaged --> Accepted: Operator, for the agent
  Triaged --> ForHuman: Operator, for a human
  Triaged --> Cancelled: "won't do"
  Accepted --> Implementing: S
  Accepted --> Clarifying: M or L
  Clarifying --> SpecReview: spec ready
  SpecReview --> Clarifying: "clarify"
  SpecReview --> Researching: approved, L
  SpecReview --> Planning: approved, M
  Researching --> Planning
  Planning --> PlanReview
  PlanReview --> Planning: "redo"
  PlanReview --> Implementing: approved, slice sub-issues created
```

Each slice is a sub-issue of the work item, linked by "blocked by". The Orchestrator works the frontier (slices whose blockers are done); the work item stays Implementing until all its slices are merged into its branch.

### Part 2. Execution: from code to production

```mermaid
stateDiagram-v2
  direction LR
  Implementing --> Verifying: change ready
  Verifying --> Implementing: red or fix, round ≤ 3
  Verifying --> Blocked: out of rounds
  Verifying --> Merged: pass, R0
  Verifying --> MergeReview: pass, R1/R2
  MergeReview --> Implementing: "changes"
  MergeReview --> Merged: "merge"
  Merged --> Live: R0/R1 right away
  Merged --> DeployReview: R2
  DeployReview --> Live: "deploy"
  Live --> Done: no regression
  Live --> RolledBack: regression, "roll back"
  Blocked --> Accepted: Operator sorted it out
  Blocked --> Cancelled
  Done --> [*]
  RolledBack --> [*]: new work item for the cause
```

| State | Meaning | Who moves it on | Waits for the Operator | GitHub Issues | Jira |
|---|---|---|---|---|---|
| New | Signal recorded, not triaged | Triage agent | no | `state:new` | To Do |
| NeedsInfo | Unclear; questions asked of the requester | Requester answers | no (waits for the requester) | `state:needs-info` | Waiting for info |
| Triaged | Checked, size, risk and outcome proposed | Operator | **yes** | `state:triaged` | To Do + label |
| ForHuman | A human does it; the pipeline only tracks it | a human | no | `state:for-human` | To Do (human) |
| Accepted | Accepted for work | Orchestrator | no | `state:accepted` | Selected |
| Clarifying | Questions on an underspecified item | Interviewer; Operator answers | **yes**, if there are questions | `state:clarifying` | In Progress |
| SpecReview | Spec awaiting approval | Operator | **yes** | `state:spec-review` | In Review |
| Researching | Codebase research (L) | Researcher | no | `state:researching` | In Progress |
| Planning | Plan in progress | Planner | no | `state:planning` | In Progress |
| PlanReview | Plan awaiting approval | Operator | **yes** | `state:plan-review` | In Review |
| Implementing | Writing the change | Implementer | no | `state:implementing` | In Progress |
| Verifying | Checks and AI review | Checks, reviewers, judge | no | `state:verifying` | In Progress |
| MergeReview | Awaiting merge (R1/R2) | Operator | **yes** | `state:merge-review` | In Review |
| Merged | Merged | Deploy | no | `state:merged` | Done (dev) |
| DeployReview | Deployment awaiting approval (R2) | Operator | **yes** | `state:deploy-review` | Awaiting Deploy |
| Live | In production, watched | Watcher | no | `state:live` | Deployed |
| Done | Done | — | — | closed | Done |
| RolledBack | Rolled back | a new work item | — | closed + `rolled-back` | Done + label |
| Blocked | Stuck: fix rounds used up | Operator | **yes** | `state:blocked` | Blocked |
| Cancelled | Cancelled | — | — | closed `not planned` | Won't Do |

The limit "at most 3 work items wait for the Operator" counts items in states where "Waits for the Operator" is yes.

## Change set (PR / MR) states

Draft → checks running → green or red → judge verdict (pass / fix / block) → approved by the Operator (R1/R2) → merged or closed. A change set always links to its work item number.
