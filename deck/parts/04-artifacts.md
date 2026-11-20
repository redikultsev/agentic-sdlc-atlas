---

# What moves and where it lives

Signal → **work item** → spec → plan → **change set** → check results → review → merged change → **deployment** → incident → signal again

| Store | What it holds | Today |
|---|---|---|
| **Work items** | the hub: number, size, risk, state; everything links to the number | GitHub Issues · Jira |
| **Specs and plans** | what "done" means, how we do it | files in the repo or the work item body |
| **Change sets** | PR, reviews, verdicts | PR · MR |
| **Check results** | test output tied to the commit | CI |
| **Deployments** | which version runs where and how it ended | Dokploy |

Artifact names follow the CDEvents standard (CD Foundation): ticket, change, build, release, incident.
