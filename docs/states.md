# Work item states and transitions

Approved 2026-11-21 (decision 28). The state lives in the tracker (GitHub Issues: a `state:…` label; Jira: a workflow status). The pipeline moves a work item only along the transitions below; a move into a "waits for the Operator" state is a gate. 15 states: 11 on the main line, 4 exits. A state says who holds the work item now: an agent state ends in -ing, an Operator state ends in Review (plus Blocked). A state that lasts seconds is not a state: "accepted" and "merged" are transitions. The Operator can cancel a work item in any state; closing it (Cancelled, ForHuman) tells the requester why.

### Part 1. Preparation: from signal to approved plan

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Triaging: signal from a person, an alert or the Retro
  Triaging --> TriageReview: checked, sized, outcome proposed
  TriageReview --> Implementing: Operator accepts, S
  TriageReview --> Specifying: Operator accepts, M or L
  TriageReview --> ForHuman: Operator, for a human
  TriageReview --> Cancelled: "won't do"
  Specifying --> SpecReview: spec ready
  SpecReview --> Specifying: "clarify"
  SpecReview --> Planning: approved, M or L
  Planning --> PlanReview: plan ready (L: codebase research first)
  PlanReview --> Planning: "redo"
  PlanReview --> Implementing: approved, slice sub-issues created
```

Each slice is a sub-issue of the work item, linked by "blocked by"; a slice is only open or closed. The Orchestrator works the frontier (slices whose blockers are done); the work item stays Implementing until all its slices are merged into its branch.

### Part 2. Execution: from code to production

```mermaid
stateDiagram-v2
  direction LR
  Implementing --> Verifying: change ready
  Verifying --> Implementing: red or fix, round ≤ 3
  Verifying --> Blocked: out of rounds or block verdict
  Verifying --> Live: pass, auto-merge rules match (R0), merged and deployed
  Verifying --> MergeReview: pass, R1/R2
  MergeReview --> Implementing: "changes" + comment (no round spent)
  MergeReview --> Live: "merge", deployed to everyone
  Verifying --> Implementing: merge queue red or conflict
  MergeReview --> Implementing: merge queue red or conflict
  Live --> Done: watch window over, no regression
  Live --> RolledBack: regression, the Watcher rolled back
  Blocked --> Implementing: Operator sorted it out
  Done --> [*]
  RolledBack --> [*]: new work item in Triaging
```

| State | Stage | Meaning | Who moves it on | Waits for the Operator | GitHub Issues | Jira |
|---|---|---|---|---|---|---|
| Triaging | 1 | Signal received; the Triage agent checks duplicates, reproduces, sizes | Triage agent | no | `state:triaging` | To Do |
| TriageReview | 1 | Size, risk and outcome proposed; the Operator accepts, hands to a human or cancels | Operator | **yes** | `state:triage-review` | To Do + label |
| Specifying | 2 | Spec in progress; the Interviewer may ask the Operator business questions | Interviewer | no | `state:specifying` | In Progress |
| SpecReview | 2 | Spec awaiting approval | Operator | **yes** | `state:spec-review` | In Review |
| Planning | 3 | Plan in progress; for L codebase research first | Researcher, Planner | no | `state:planning` | In Progress |
| PlanReview | 3 | Plan awaiting approval | Operator | **yes** | `state:plan-review` | In Review |
| Implementing | 4 | Writing the change, slice by slice | Implementer | no | `state:implementing` | In Progress |
| Verifying | 5 | CI, AI review, then acceptance; for R0 also the merge queue | CI, AI reviewer, Validator | no | `state:verifying` | In Progress |
| MergeReview | 7 | Awaiting merge (R1/R2); merge deploys | Operator | **yes** | `state:merge-review` | In Review |
| Live | 8 | In production, inside the watch window | Watcher | no | `state:live` | Deployed |
| Done | 8 | Done | — | — | closed | Done |
| Blocked | exit | Stuck: 3 fix rounds used up, or a block verdict | Operator | **yes** | `state:blocked` | Blocked |
| RolledBack | exit | Rolled back; the cause goes to a new work item | — | — | closed + `rolled-back` | Done + label |
| ForHuman | exit | A human does it; the pipeline only tracks it | a human | no | `state:for-human` | To Do (human) |
| Cancelled | exit | Cancelled | — | — | closed `not planned` | Won't Do |

The Stage column is the stage number on the overview; stage 6 (Acceptance) shares Verifying with stage 5, stage 9 (Learn) only creates work items in Triaging. The limit "at most 3 work items wait for the Operator" counts items in states where "Waits for the Operator" is yes. The deck's states slide is generated from this table.

## Pull request (PR / MR) states

Draft → checks running → green or red → reviewer verdict (pass / fix / block) → approved by the Operator (R1/R2) → merged or closed. A pull request always links to its work item number.
