# One tracker seam for GitHub Issues, Jira and others

Research of 2026-11-24. Question: which operations must an engine-neutral tracker seam carry so the same pipeline runs on GitHub Issues, Jira Data Center, Jira Cloud and later GitLab, Linear and YouTrack, and how each tracker does them. The operations come from the pack: `docs/states.md`, decisions 4, 5, 28, 32, 39, 44 in `docs/decisions.md`, and `implementations/archon/.shared/{forge,states,github,trust,rulings,request}.ts`.

All sources were accessed on 2026-11-24 unless a row says otherwise. **V** = verified in a primary source (vendor API reference, OpenAPI spec, vendor docs, source code at the commit named). **S** = secondary source (vendor community forum, bug tracker, search snippet). **I** = inferred, not verified. Jira Cloud facts come from the published OpenAPI spec `dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json`; Jira DC facts from the OpenAPI spec embedded in `developer.atlassian.com/server/jira/platform/rest/v11002/` (spec version 11.2.1).

## Answer

1. **Do not map the 15 states onto Jira statuses as the source of truth.** A status moves only along a workflow transition valid from the current status, transition screens can demand fields, and validators are invisible to the API. Keep the pipeline state in a carrier the pack owns and that any user with *Edit issues* can write: a `state:*` **label** (searchable by JQL, visible, no admin) or an **issue property** (invisible, not JQL-searchable without an app). Project the state onto the Jira status as a best-effort second write along a configured transition map. Labels give the closest parity with today's GitHub code.
2. **Hidden markers:** GitHub and GitLab hide HTML comments in rendered Markdown, so the first-line marker works there. Jira has no hidden text in a comment body, but both Cloud and DC have **comment properties** (key/value JSON on a comment), settable by whoever may edit the comment; Cloud also accepts them on create and returns them through `POST /comment/list?expand=properties`.
3. **Slices and dependencies:** GitHub sub-issues (GA Apr 2025, ≤100 per parent, 8 levels) and dependencies (GA Aug 2025, ≤50 per relation type); Jira sub-tasks or the Cloud `parent` field, plus the default "Blocks" link type; GitLab child tasks (Free), "blocks" links (Premium).
4. **Trust:** GitHub's issue author and Jira's *creator* are fixed; Jira's *reporter* can be changed by anyone with *Modify Reporter*, so the seam must read the creator. The pack's digest-pinned approval works on every tracker; Jira's changelog can also show that the description changed after the approval.
5. **Close with a reason:** GitHub `state_reason` (`completed`, `not_planned`, `duplicate`); Jira `resolution`, only if the field is on the transition screen; GitLab has no reason on close (custom statuses with Done/Canceled categories need Premium).
6. **No engine abstracts a tracker the way the pack needs.** Archon has a GitHub-shaped forge plugin protocol with verified writes and no Jira; Cezar has a two-write tracker seam (comment, transition) for Jira Cloud and Linear only; OpenHands drives Jira through a label poll plus its own KV store. MCP servers expose transitions and comments but lack read-back guarantees, and the official one is Cloud only.
7. **Reach trackers from scripts through REST adapters behind one seam, not through MCP.** Decisions 5 and 44 ("other trackers through MCP") conflict with "scripts act with read-back"; MCP is fine for agents' reads.

## 1. Carrying 15 states in Jira

| Carrier | Set and read back | Races with people | Admin needed | Cloud vs DC |
|---|---|---|---|---|
| **Label** `state:x` | `PUT /issue/{key}` with `update.labels: [{add}, {remove}]` in one request, then `GET` (V: DC "Updating an issue via the REST APIs"; edit endpoint in both specs). Two verbs in one request; whether Jira applies them atomically is not documented (I) | Same as GitHub today: a person can add or remove a label; the pack's "exactly one state label, else mismatch" check carries over (I) | No (I: labels are free-form; not verified in a primary source) | Same. JQL `labels = "state:x"` works on both (V: DC JQL fields reference) |
| **Custom field** (single select) | One `fields` set in an edit, atomic per field (I) | People can edit it like any field | Yes: create the field, add options, put it on screens. Cloud's edit endpoint "doesn't check screen configurations" (V: Cloud spec, Edit issue); DC is not documented to skip screens (I) | Natively JQL-searchable on both (I) |
| **Issue property** `pipeline.state` | `PUT /issue/{key}/properties/{key}`, JSON ≤32 KB, key ≤255; needs *Browse projects* + *Edit issues* (V: both specs). Also settable inside a create, edit or **transition** request: the body schema `IssueUpdateDetails` / `IssueUpdateBean` has `properties` (V: both specs) | Invisible in the UI, so people do not touch it (S: entity properties page says nothing about UI display); anyone with *Edit issues* can still change it through REST (V: "not sandboxed on a per-user basis", Cloud entity properties page) | No for read/write. **Yes for JQL**: a property is searchable only when an app declares it (Cloud: Connect `jiraEntityProperties` or Forge `jira:entityProperty`; DC: plugin `index-document-configuration`) (V: Cloud and DC entity-properties pages) | Cloud search can return up to 5 properties per issue (`properties` param of `GET /search/jql`, V); without an index the pack lists by another filter and reads the property per issue |
| **Status** (one status per state) | `POST /issue/{key}/transitions` with a transition id, then `GET` (V) | A person moving the status is the normal case; a transition id is valid only from the current status, so a stale move fails rather than overwrites (I) | Yes: a workflow with 15 statuses, or a per-project map from 15 states to existing statuses | See path discovery below |

**Path to a target status.** `GET /issue/{key}/transitions` lists only the transitions from the issue's current status, and returns nothing without *Transition issues* (V: Cloud spec). `expand=transitions.fields` returns the transition-screen fields with a `required` flag; "Fields hidden from the screen are not returned" (V: Cloud spec; DC: "Fields not in the screen will not be in the metadata"). Workflow **validators** are not reported: a required-by-validator field shows as not required and the POST fails with 400 (S: Atlassian community answers; JRACLOUD-41682 "Won't Fix"). The whole graph is readable in Cloud through `GET /rest/api/3/workflows/search?expand=values.transitions`, which needs *Administer Jira*, or *Administer projects* / *View (read-only) workflow* for project-scoped workflows (V: Cloud spec; the older `/workflow/search` is removed after 2026-06-01). DC REST v2 has `GET /api/2/workflow` (list of workflows) and workflow-scheme endpoints, but **no endpoint returning a workflow's transitions** (V: absence in the DC 11.2.1 spec). So on DC a path cannot be planned from the API; it must be a configured map (state → status → transition id per step), checked at install against live `GET transitions` (I).

**Required fields.** Supply them in `fields` or `update` of the same transition request; a field not on the transition screen gives "a field validation error … if it is submitted" (V: DC spec, Perform a transition). Cezar drops every transition that has a required field without a default and re-reads the status before writing, refusing if it changed (V: `packages/cezar/src/server/tracker/jira.ts` lines 427-441, commit `7db6462`).

**Other trackers (later).** Linear: `issueUpdate(stateId)` sets any workflow state directly (V: linear.app/developers/graphql). YouTrack: a plain State field is set by value; a state-machine State field needs a transition event id from `possibleEvents`, and a value set on it fails (S: jetbrains.com devportal "Update Issue Custom Fields" and troubleshooting, via search snippets). GitLab: scoped labels `state::x` replace each other automatically, Premium only (V: docs.gitlab.com/user/project/labels); custom statuses with categories Triage/To do/In progress/Done/Canceled, Premium, GA in 18.6, documented through the UI only (V: docs.gitlab.com/user/work_items/status).

## 2. Finding a script's own comment again

| Tracker | Hidden marker | Metadata on the comment |
|---|---|---|
| GitHub | HTML comment: "hide content from the rendered Markdown" (V: docs.github.com basic writing syntax). Still in the raw body for API readers | None (I: no comment metadata in the REST issue-comments API) |
| GitLab | HTML comments hidden in the rendered view, visible in source (S: docs.gitlab.com/user/markdown via search snippet) | None found (I) |
| Jira Cloud | No hidden-text construct in wiki markup or ADF found (I) | **Comment properties**: `PUT /comment/{id}/properties/{key}`, JSON ≤32 KB; write needs *Edit All Comments* or *Edit Own Comments* (V: Cloud spec). The `Comment` schema has `properties`: "Optional on create and update" (V: Cloud spec). `GET /issue/{key}/comment` expands only `renderedBody`; `POST /comment/list` (comment ids) accepts `expand=properties` (V: Cloud spec). Find-again = list comments by author, then batch-read their properties (I). Community reports say properties could not be set on create via REST (S, older) |
| Jira DC | Same as Cloud (I) | Comment property GET/PUT/DELETE exist (V: DC 11.2.1 spec); read needs permission to read the comment, delete needs permission to administer it. Comment GET/POST expand only `renderedBody`, so one GET per comment (V) |

The pack's own bot account writes the marked comments, so on Jira "author = pipeline account AND property `pipeline.marker` = key" replaces "first line = marker" (I). Issue properties do the same for whole-item markers (V: endpoints above).

## 3. Parent, children and dependencies

- **GitHub:** sub-issues REST (`/issues/{n}/sub_issues`, `/parent`, `/sub_issues/priority`), body takes the integer `id`, not the number; same owner required (V: docs.github.com/en/rest/issues/sub-issues). Up to 100 sub-issues per parent, 8 nesting levels, other repositories allowed (V: docs "Adding sub-issues"). GA 2025-04-09 (V: github.blog changelog). Dependencies: `/issues/{n}/dependencies/blocked_by` and `/blocking`, body `issue_id`; 422 when flagged as spam; secondary rate limits (V: docs.github.com/en/rest/issues/issue-dependencies). Up to 50 per relation type; GA 2025-08-21, REST, GraphQL and webhooks (V: github.blog changelog 2025-08-21).
- **Jira Cloud:** the `parent` field set by key or id on create or edit; removable with `update.parent.set.none` (V: Cloud spec, Edit issue). Epic Link and Parent Link fields were deprecated in REST and webhooks in favour of `parent` (S: Atlassian developer community announcement; dates of removal not confirmed). Sub-task issue types must exist in the project's scheme (I).
- **Jira DC:** sub-tasks need sub-tasks enabled by an admin (V: DC JQL fields reference, Parent); epics use the Jira Software "Epic Link" field (I).
- **Links (both Jira):** `POST /rest/api/{2,3}/issueLink`; needs *Link issues* and issue linking enabled; a duplicate link request reports success (V: Cloud spec). Default link types are Relates, Duplicates, Blocks, Clones, and an admin can rename or delete them (S: confluence.atlassian.com "Configuring issue linking"), so the seam must resolve the "blocks" type by its inward/outward names at install (I).
- **GitLab:** an issue can have child tasks, Free; up to 5000 direct child issues and epics; epics up to 7 levels (V: docs.gitlab.com/user/work_items/child_items). Issue links `relates_to`, `blocks`, `is_blocked_by` (V: docs.gitlab.com/api/issue_links); "Blocked items" Premium/Ultimate (V: docs.gitlab.com/user/work_items/linked_items).

## 4. Listing candidates, author identity, approval pinned to text

- **GitHub:** `GET /repos/{o}/{r}/issues` filters by `labels`, `creator`, `state`; returns PRs too, recognised by `pull_request` (V: docs.github.com/en/rest/issues/issues). The author (`user`) cannot be changed (I). Edit history: GraphQL `userContentEdits` / `lastEditedAt` on the Comment interface (S: docs.github.com GraphQL interfaces via search snippet).
- **Jira Cloud:** `GET|POST /rest/api/3/search/jql`, bounded query required, token paging, up to 5000 ids per page; **search is eventually consistent** ("Recent updates might not be immediately visible"), `reconcileIssues` (≤50 ids) gives read-after-write (V: Cloud spec). So "move then list by label" can miss the item just moved unless reconciled (I).
- **Jira DC:** `GET|POST /rest/api/2/search` with `startAt` paging (V: DC spec).
- **Author on Jira:** JQL *Creator* = created by; *Reporter* "may be the same as the creator, but can be distinct" (V: DC JQL fields reference). *Modify Reporter* lets a user change the reporter on any issue (S: Atlassian KB "You don't have permission to modify the reporter"). Trust must key on the creator (I).
- **Changelog:** Cloud `GET /issue/{key}/changelog`, paged, oldest first, items with `field`, `from`, `to`, `fromString`, `toString` (V: Cloud spec). DC: `GET /issue/{key}?expand=changelog` (V: DC spec). A description edit after the approval shows there; the pack's digest pin already detects it without the changelog (I).
- **GitLab:** list filters `labels` (AND), `not[labels]`, `author_username` (V: docs.gitlab.com/api/issues).

## 5. Closing with a reason

- **GitHub:** `PATCH` with `state: closed` and `state_reason` `completed | not_planned | duplicate | reopened | null`, ignored unless the state changes; `duplicate_issue_id` for duplicates (V: docs.github.com/en/rest/issues/issues).
- **Jira (both):** the `resolution` field set in the transition request into a done status, only if it is on that transition's screen (V: DC spec text on screen fields; I for Cloud, same mechanism). Resolution names ("Won't Do", "Done") are per site (I). sooperset's MCP shows the same call: `fields: {"resolution": {"name": "Fixed"}}` (V: `servers/jira.py`, commit `29518e3`).
- **GitLab:** `state_event: close | reopen`, no reason field (V: docs.gitlab.com/api/issues). Premium custom statuses in Done or Canceled categories close the item (V: work item status docs).
- **CDEvents v0.5.1:** `ticket.closed` requires `uri` and `resolution` ∈ `completed | withdrawn | duplicate` or any string (V: `schemas/ticketclosed.json`, cdevents/spec tag v0.5.1).

## 6. How existing engines and tools abstract the tracker

- **Archon** (coleam00/Archon, `dev` at `bd34eec`): `@archon/forge` is a plugin process protocol ("PLUGIN op OPERATION", JSON on stdin/stdout) with operations `workitem.view|comments|list|search|create|labels.set|label.add|label.remove|comment.upsert|close|edit-body`, `repo.label.ensure`, PR and checks operations (V: `packages/docs-web/.../reference/forge.md`). Every write resolves to one of four outcomes: applied and read back, refused before writing, applied but unverified, unknown; dispatch checks the applied result against the request (V: `packages/forge/README.md`). Marked writes find an item or comment by the exact first line; "no atomic uniqueness for concurrent creates"; single-label add/remove preserves concurrent writers' labels, whole-set replace does not (V: forge.md). `workitem.close` reasons are GitHub's three (V). Plugins declare capabilities and `unsupported_op` refuses before execution (V). **No Jira, Linear or YouTrack** anywhere in the repository (V: code search for "jira" returns nothing). Bundled GitLab and Gitea adapters are chat/webhook adapters (`IPlatformAdapter`), not forge plugins; "new forges ship as plugins" (V: `packages/adapters/src/community/forge/README.md`). A separate **item tracker** keeps one status comment per item edited in place and "never reads a comment back" (V: `packages/adapters/src/item-tracker/item-tracker.ts`). No sub-issue or dependency operations (V: operation list).
- **Cezar** (open-mercato/cezar, `main` at `7db6462`): `TrackerDriver` with `listIssues`, `searchItems`, `getItem`, `context`, `act`, `pollEvents` (V: `packages/cezar/src/server/tracker/types.ts`). `act` has exactly two writes: `comment {body}` and `transition {transitionId, expectedStatusId}` (V: `packages/contract/src/tracker-operations.ts`). Jira **Cloud only**, "Data Center/custom hosts and OAuth are outside this integration"; Linear second (V: `docs/issue-trackers.md`). Status change needs scopes `write:issue:jira` and `write:issue.property:jira` (V: same doc). No label writes, no links, no sub-issues (V: same files; also `research/atlas/research/engine-base/cezar.md`).
- **OpenHands** (OpenHands/extensions at `bbc412d`): Jira skill `jira-issue-to-pr` polls Jira Cloud for open issues with a label, through the Atlassian Rovo MCP server or `POST /rest/api/3/search/jql`; deduplicates in its own KV store, posts "I'm on it" (V: `skills/jira-issue-to-pr/SKILL.md`). The state never goes back to Jira beyond that comment (I). The older `openhands/resolver` package is not in the current OpenHands tree (V: tree at `d5dcd45`); not researched further.
- **Sweep** (sweepai/sweep): now "AI coding assistant for JetBrains", last push 2025-09-18 (V: GitHub API). Not relevant.
- **Atlassian Rovo MCP server (official, remote):** Jira tools include `searchJiraIssuesUsingJql`, `listJiraIssueTransitions`, `transitionJiraIssue`, `editJiraIssue`, `addOrEditJiraIssueComment`, `createJiraIssueLink`, `listJiraIssueChangelogs`, `getJiraEntityProperty`, `editJiraEntityProperty` (work item, comment, worklog, dashboard item, user); delete and workflow/screen tools are off until an admin enables them (V: support.atlassian.com supported tools). Cloud only (I: no DC mention). Headless use needs an API token or service-account key, which an org admin can disable (S: developer.atlassian.com Rovo MCP API-token guide via search snippet).
- **sooperset/mcp-atlassian** (`main` at `29518e3`): Cloud and DC (Jira DC v8.14+) (V: README). Tools include `search`, `get_transitions`, `transition_issue` (id or case-insensitive name, optional `fields`, comment), `add_comment`, `edit_comment`, `create_issue_link`, `link_to_epic`, `batch_get_changelogs`, `update_issue`; **no property tools**; `get_issue` can return properties (V: `src/mcp_atlassian/servers/jira.py`).
- **CDEvents v0.5.1** (released 2026-04-15): `ticket.created`, `ticket.updated`, `ticket.closed` with `summary, ticketType, group, creator, assignees, priority, labels, milestone, updatedBy, uri` and, on close, `resolution` (V: cdevents/spec schemas). A neutral vocabulary for events out of the seam; it has no status, parent or link field (V), so it cannot carry the 15 states except as labels (I).

## 7. MCP or REST adapters for scripts

For REST adapters behind the seam:
- MCP tools are "model-controlled", and the spec says there SHOULD always be a human able to deny invocations (V: modelcontextprotocol.io spec 2025-11-25, Tools). The pipeline's writes are deterministic scripts, which is the opposite use.
- MCP results are text unless a tool declares `outputSchema` (V: same spec). Neither Jira server documents structured outputs (I). Read-back then means parsing text.
- The engines that write trackers from code do it over REST with a compare-before-write: Archon's four-outcome writes (V), Cezar's `expectedStatusId` (V).
- Coverage gaps: Rovo MCP is Cloud only and admin-gated (V/S); sooperset lacks properties (V). Either gap breaks one of the pack's operations.

For MCP:
- One server per tracker already exists, which was the reason for decision 5. A script can be an MCP client and still be deterministic (I).
- Rovo MCP covers entity properties (V), which sooperset does not.

Conclusion (I): the seam is a small TypeScript interface implemented by REST adapters (GitHub through the engine's forge plus `gh api`; Jira one adapter with Cloud/DC switches); agents may read the tracker through MCP. Decisions 5 and 44 need revising to say this.

## Operation → tracker

| Operation the pack needs | GitHub Issues | Jira DC | Jira Cloud | GitLab |
|---|---|---|---|---|
| Read state (`readState`) | Labels of the issue; exactly one `state:*` | Labels (or issue property `pipeline.state`) from `GET /issue/{key}` | Same as DC; `properties` param on search returns ≤5 per issue | Labels; Premium: scoped label `state::x` |
| Move state with compare and read-back (`moveState`) | Label add, label remove, re-read (today) | `PUT` edit with `update.labels` add+remove in one request, re-read. Optional status projection: configured transition map, `POST transitions` per step | Same; search needs `reconcileIssues` to see the move at once | `PUT` with `add_labels`/`remove_labels`, re-read; scoped labels swap themselves |
| Ensure the state vocabulary at install | `repo.label.ensure` | Labels need nothing (I); for a status projection, check the map against `GET transitions` | Same; full graph readable with workflow-read permission | Create labels (project or group) |
| Mark flags (`pipeline:*`) | Labels | Labels | Labels | Labels |
| List candidates by state/flag, oldest first | `GET /issues?labels=&state=open&sort=created` | JQL `labels = "…" AND statusCategory != Done ORDER BY created` via `/api/2/search` | Same via `/api/3/search/jql` (bounded query) | `GET /projects/:id/issues?labels=&state=opened` |
| Create item idempotently | Body first line = marker, search all states | Issue property `pipeline.marker` set in the create request; find by JQL only with an indexing app, else by summary/label filter then property read (I) | Same | Description first line (HTML comment) |
| Upsert marked comment | First-line HTML-comment marker | Comment by the pipeline account + comment property; one GET per comment | Same; batch read via `POST /comment/list?expand=properties` | First-line HTML-comment marker |
| Read comments with author | `workitem.comments` | `GET /issue/{key}/comment` | Same (v3 bodies are ADF) | Notes API (I) |
| Slice as child | Sub-issue (≤100, by `id`) | Sub-task (enabled by admin; type in scheme) | `parent` field (sub-task or child type) | Child task (Free) |
| "Blocked by" edge | Dependencies API (≤50) | `issueLink` type "Blocks", resolved by name at install | Same | `is_blocked_by` link, **Premium**; Free: not possible |
| Close with reason | `state_reason` | Transition to a done status with `resolution`, if on the screen | Same | Close only, no reason; Premium status in Done/Canceled |
| Author for trust | `user.login` | `creator` (not `reporter`) | `creator` (account id) | `author` |
| Approval pinned to exact text | Digest in a trusted marked comment (today) | Same, digest in a comment property; changelog (`expand=changelog`) as a cross-check | Same; `GET /changelog` | Same as GitHub; description history not researched |
| Registers (rejected items, rulings issue) | Closed issues with a label; pinned issue with comments | Label + JQL; one issue with comments | Same | Same as GitHub |
| Waiting count (items in Operator states) | Count by label | JQL count by label | Same | Count by label |

## Risks

- **Jira workflow drift:** an admin renames a status, adds a validator or a screen field; transitions then fail with 400 and the API cannot predict it (S). Mitigation: the state lives in a label or property; the status projection is best-effort and a failure becomes a decision request, not a lost state (I).
- **Two writers of the status:** if a person moves the Jira status, the label and status disagree. The pack must say which wins; the label should, because the status is a projection (I).
- **Cloud search lag:** listing right after a write can miss items unless `reconcileIssues` is used (V).
- **Reporter spoofing:** trust keyed on the reporter can be changed by users with *Modify Reporter* (S).
- **Properties need an app for JQL:** without one, listing by property means scanning; keep anything the pack lists by in labels (V/I).
- **Paid-tier gaps on GitLab:** blocked-by links, scoped labels and custom statuses are Premium (V); a Free GitLab adapter must refuse "blocked by" at install, the way Archon's `unsupported_op` refuses (I).
- **Concurrent creates:** no tracker enforces marker uniqueness (V for GitHub per Archon forge.md; I for others).

## Not verified or still open

- Whether Jira applies `labels` add+remove in one edit atomically; whether labels need any admin setting on DC.
- Cloud: whether properties on comment create actually work (schema says yes, older community reports say no). Run a probe before relying on it.
- DC search: whether `/api/2/search` accepts a `properties` parameter.
- GitHub `labels` filter semantics with several labels (AND or OR) are not stated in the REST docs.
- GitLab: description edit history, notes metadata, REST/GraphQL access to custom statuses, whether issue authors can change.
- Linear and YouTrack: only the state-setting call was checked; parent, links, labels and comment metadata were not.
- Whether the Rovo MCP tools return structured output, and whether they work against Jira DC (no mention found).
- Validator-required transition fields: based on community answers and a closed bug, not on current Atlassian reference text.
