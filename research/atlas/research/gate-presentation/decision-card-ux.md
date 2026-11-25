# Decision card UX for Operator gates: how products present a decision, and what is measured

All sources read on 2026-11-25. Tags: **[Practice]** = what a product or design system does or recommends (no outcome data); **[Measured]** = a study with participants and an outcome; **[Vendor claim]** = a number reported by the vendor about its own product, not independently checked.
Scope excludes the six-pager, PR/FAQ, BLUF and decision memos in general (covered earlier).

---

## 1. AI agent review and approval surfaces

### GitHub Copilot coding agent (PR sessions)
- [Practice] The agent's PRs are always drafts, need human approval before merge, and workflows the agent triggers do not run until a human clicks "Approve and run workflows" in the merge box. https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/review-copilot-prs
- [Practice] Separation of duties: if the repository requires approvals, the approval of the person who asked Copilot to make the PR does not count; another reviewer must approve. Same page.
- [Practice] The docs tell reviewers to be especially alert to changes in `.github/workflows/` (a risk area named up front). Same page.
- [Practice] Evidence is folded behind the PR: the session log (reasoning, tools used, validation) opens from a "View session" button on the "Copilot started work" timeline event; every agent commit carries an `Agent-Logs-Url` trailer linking back to the log. https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/track-copilot-sessions ; https://github.blog/changelog/2026-03-20-trace-any-copilot-coding-agent-commit-to-its-session-logs
- [Practice] Feedback after the fact: thumbs up/down with a reason. review-copilot-prs page above.

### Devin Review (Cognition)
- [Practice] Review opens on an overview of what behaviour the PR changes; the diff can be shown as a "Guide view" that groups related edits across files with explanations, or a plain file tree. https://docs.devin.ai/work-with-devin/devin-review.md
- [Practice] Findings carry severity by icon and colour: severe bugs red, less severe orange; flags are "Investigate" (check these lines) vs "Informational" (explains, no fix asked); security findings "Critical" (high confidence, fix before merge) vs "Warning". Findings are bucketed by state: "Needs your attention", "Devin is fixing", "Fixed", "Invalidated". Same page.
- [Practice] Questions are asked in place: select diff lines or quote a finding into chat. Same page.

### OpenAI Codex (cloud tasks)
- [Practice] Codex "provides verifiable evidence of its actions through citations of terminal logs and test outputs", and when uncertain or facing test failures "explicitly communicates these issues"; OpenAI states human review of all agent code remains essential. https://openai.com/index/introducing-codex/

### Cursor cloud (background) agents
- [Practice] The agent page shows conversation, code changes and artifacts (screenshots, videos, logs that show how the agent verified its work); a reviewer can take over the agent's remote desktop to test it. https://cursor.com/docs/cloud-agent

### Google Jules (plan approval)
- [Practice] Jules shows a plan before writing code: a natural-language direction, a step list with each step expandable, plus assumptions and setup steps. Two actions: give feedback in chat (plan is revised) or "Approve plan". If the user leaves, the plan is auto-approved on a timer. https://jules.google/docs/review-plan/
- [Vendor claim] A plan-critique step before execution cut task failure rate by 9.5%. https://jules.google/docs/changelog/2026-01-26-1 (via search summary; not opened in full)

### Claude Code plan approval
- [Practice] Plan mode presents the plan and three options that each state their exact effect: "Yes, and use auto mode", "Yes, manually approve edits", "No, keep planning" (stay and say what to change). Ctrl+G opens the plan in an editor before approving. https://code.claude.com/docs/en/permission-modes.md

### Linear agent sessions
- [Practice] Agent output is typed: `thought`, `action` (tool call, later updated with result), `elicitation` (asks for clarification or confirmation), `response`, `error`. Thoughts and actions can be `ephemeral` (replaced by the next activity). Session state (`pending`, `active`, `awaitingInput`, `error`, `complete`, `stale`) is shown to users. https://linear.app/developers/agent-interaction.md
- [Practice] An elicitation can carry a `select` signal with options; the user may still reply in free text instead. https://linear.app/developers/agent-signals
- [Practice] A plan is a checklist of steps with status `pending / inProgress / completed / canceled` (technology preview). agent-interaction page above.

### Factory (Droid code review)
- [Practice] Posts a summary comment listing issues found plus inline comments on lines. https://docs.factory.ai/guides/droid-exec/code-review (via search summary)

**Pattern across agents:** the first screen is a short "what changes / what is proposed", evidence (session logs, terminal citations, screenshots) sits one click away, findings are labelled by severity, actions are few and named for their effect, and a human (not the requester) approves.

---

## 2. Approval and evidence UIs in dev tooling

### GitHub environment deployment approvals
- [Practice] A pending job shows "Waiting"; the reviewer clicks "Review deployments", selects environment(s), optionally comments, and clicks "Approve and deploy" or "Reject" (reject fails the workflow). Self-approval can be blocked; secrets stay locked until approval. https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments ; https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- [Practice] An unapproved job fails after 30 days (an explicit expiry, not auto-approve). Enterprise Server 3.6 page: https://docs.github.com/en/enterprise-server@3.6/actions/managing-workflow-runs/reviewing-deployments

### CodeRabbit walkthrough
- [Practice] Walkthrough order: (optional) high-level summary, changed-files table with related files consolidated into one row each with a plain-language description, Mermaid sequence diagrams for changes to interactions (API calls, events, async flows), estimated review effort 1-5, merge risk Minimal..Critical with explanation and the commit it covers, related issues, linked-issue assessment (does the PR address the issue, gaps), related PRs, suggested labels/reviewers. "Review details" (ignored files, context used) is collapsed and off by default; the whole walkthrough is in a `<details>` block by default. https://docs.coderabbit.ai/pr-reviews/walkthroughs.md

### Vercel PR comment
- [Practice] A bot comment with a table of deployments and their status plus the preview URL; the same comment is updated on each push rather than a new one posted. https://vercel.com/changelog/improved-formatting-for-pull-request-comments ; https://vercel.com/docs/ci/guides/github-comments

### Sentry issue details (how a bug's evidence is laid out)
- [Practice] Top to bottom: header (error message, events count, users affected, plus assign / priority / resolve / archive controls); filters and trend graph; a "Recommended" event chosen for most debugging context; event highlights (key tags promoted to the top, admin-editable); stack trace; breadcrumbs (timeline before the error); tags; sidebar with first/last seen, first/last release, the Seer AI section, similar issues. https://docs.sentry.io/product/issues/issue-details/

### Datadog incident details
- [Practice] Global header holds Status and Severity selectors. The Overview groups fields under "What Happened", "Why it Happened", "Attributes" (Root Cause, Services, Teams, Detection Method, Summary), then summary modules: condensed timeline, latest notification, pending tasks, responders, five latest timeline entries with links to the full tabs. Impacts have start, end and a "scope of impact" sentence. https://docs.datadoghq.com/service_management/incident_management/incident_details/

### PagerDuty
- [Practice] Incident Timeline tab: timestamped status changes, actions and notifications, filterable by event type. https://support.pagerduty.com/docs/incidents (via search summary)

**Pattern across tools:** status and severity in a fixed header; a curated summary block (highlights, What/Why, impact) before raw evidence; raw evidence (stack trace, timeline, logs) in its own section or tab with a link from the summary; one comment updated in place.

---

## 3. Design system guidance

- [Practice] **Apple HIG, Alerts:** button titles are one or two words describing the result, verbs preferred; avoid "OK" unless purely informational, avoid "Yes"/"No" because "the meaning of 'OK' can be unclear"; always "Cancel" for cancel; Cancel never the default; if you want people to read the alert, make no button the default; destructive style for destructive actions the person did not deliberately choose; title describes the situation, no more than two lines; message only if it adds value. https://developer.apple.com/design/human-interface-guidelines/alerts (read via https://developer.apple.com/tutorials/data/design/human-interface-guidelines/alerts.json)
- [Practice] **IBM Carbon, Modal:** danger modal for destructive or irreversible actions, primary button becomes a danger button; titles are brief verb phrases; button labels are action words (Add, Delete, Save), not "Done" or "OK"; title and button both reflect the action; body explains the consequences of the action. https://carbondesignsystem.com/components/modal/usage/
- [Practice] **Atlassian, Modal dialog:** the primary button reflects the title ("Fork repository" title, "Fork repository" button); one task per modal; everything needed to decide is inside it; avoid scrolling; severity must not rely on colour alone (icons need accessible labels). https://atlassian.design/components/modal-dialog/usage
- [Practice] **GitHub Primer, ConfirmationDialog:** for destructive or important actions; title is a brief question; body states what will happen and that it "cannot be undone"; `confirmButtonType="danger"` moves initial focus to Cancel. https://primer.style/product/components/confirmation-dialog/
- [Practice] **Primer, Progressive disclosure:** use sparingly, only when truncation is needed; keep the user's point of focus stable when expanding; pair the chevron with descriptive text ("Show more"). https://primer.style/product/ui-patterns/progressive-disclosure/
- [Practice] **Nielsen Norman Group, Confirmation dialogs:** reserve confirmations for serious consequences or they become habitual click-through; restate the specific action with identifying details (names, counts); label buttons with outcomes ("Delete file" / "Keep file"), not Yes/No; no default "Yes"; prefer undo where possible; heavy friction (typing a word) only for rare, most dangerous actions. The article cites no empirical study. https://www.nngroup.com/articles/confirmation-dialog/
- [Practice] **Google PAIR Guidebook, Explainability + Trust:** show confidence only if it changes the user's decision; categorical levels (High/Medium/Low) need a stated action per level; numeric percentages are "risky" without context; show alternatives mainly when confidence is low; "the best explanation is likely a partial one"; higher stakes need the "why". https://pair.withgoogle.com/chapter/explainability-trust/
- Not read: Material Design dialog pages (m3 and m2) returned no body text to the fetcher; nothing from Material is used here.

---

## 4. Measured evidence on presenting AI recommendations

- [Measured] **Explanations can increase blind acceptance.** Bansal et al., CHI 2021: across three tasks where human and AI accuracy were comparable, explanations did not improve team accuracy beyond showing AI confidence, and increased acceptance of the AI's advice whether right or wrong. https://arxiv.org/abs/2006.14779
- [Measured / review] **Only verifiable explanations help.** Fok & Weld (2023/2024) review: explanations rarely produce complementary performance except when they let the person efficiently verify whether the recommendation is correct. https://arxiv.org/abs/2305.07722
- [Measured] **Explanations help when they are cheaper to check than the task.** Vasconcelos et al., CSCW 2023, five studies, N=731: overreliance fell when the task was hard and the explanation made verification easy; no effect when both were hard or both easy. https://arxiv.org/abs/2212.06823 ; https://hai.stanford.edu/news/ai-overreliance-problem-are-explanations-solution
- [Measured] **Make the reviewer think before seeing the answer.** Bucinca, Malaya & Gajos, CSCW 2021 (N about 199 per secondary summary): cognitive forcing functions (decide first, then see the AI; slow down; on-demand AI) reduced overreliance more than explanations; participants rated the most effective designs least, and overreliance was reduced, not removed. https://arxiv.org/abs/2102.09692
- [Measured] **Confidence calibrates trust but is not enough.** Zhang, Liao & Bellamy, FAT* 2020: showing confidence helped people calibrate trust, but better decisions also needed the human to bring knowledge that covers the AI's errors; local explanations had problems. https://arxiv.org/abs/2001.02114
- [Measured] **First-person hedges reduce overreliance.** Kim et al., FAccT 2024, pre-registered, N=404: "I'm not sure, but..." in the first person improved accuracy by reducing (not eliminating) reliance on wrong answers; an impersonal hedge ("It's not clear, but...") had weaker, non-significant effects. https://arxiv.org/abs/2405.00623
- [Measured / review] **Automation bias mediators.** Goddard, Roudsari & Wyatt, JAMIA 2012, 74 studies: workload, task complexity and time pressure increase automation bias; mitigators include accountability, where advice is placed on screen, and whether confidence is shown. https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751
- [Measured] **Repeated prompts lose attention.** Ancker et al., BMC Med Inform Decis Mak 2017, 112 clinicians: alert acceptance fell as alert volume rose, more steeply for repeated alerts. (AHRQ PSNet's summary frames the repeat effect differently; read the original before relying on the detail.) https://pmc.ncbi.nlm.nih.gov/articles/PMC5387195
- [Review / practice] Microsoft overreliance literature review (Passi & Vorvoreanu 2022, about 60 papers): overreliance means accepting wrong AI output, usually because the design makes errors hard to spot; mitigations can backfire and must be tested with users. https://www.microsoft.com/en-us/research/?p=854967 ; https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/overreliance-on-ai/overreliance-on-ai
- [Practice, expert-validated] Amershi et al., CHI 2019, 18 Human-AI guidelines, validated with 49 practitioners on 20 products; includes "make clear how well the system can do what it can do" and "support efficient correction". https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/

---

## 5. Rules for our gate card (priority order)

1. **Lead with the decision and its stakes in one block: what is asked, verdict, size, risk, recommendation with confidence.** Everything else is below or folded. Sources: Devin overview-first, Sentry header and highlights, Datadog header (Status/Severity) and What/Why, CodeRabbit summary-first with merge risk and effort (Practice).
2. **Every action button names its exact effect, and the title and primary button match.** "Accept bug and open fix (size S)", "Send back to triage", never Yes/No/OK. Each option line states what happens next. Sources: Apple HIG, Carbon, Atlassian, NN/g; Claude Code plan options; GitHub "Approve and deploy"/"Reject" (Practice).
3. **Put a verification hook next to the recommendation: the one fact the Operator can check in seconds (the reproduction command and its rate "2 of 3 runs", the control case result, the failing test).** Explanations help only when they make checking cheaper than redoing the work, and otherwise raise blind acceptance. Sources: Fok & Weld; Vasconcelos et al.; Bansal et al. (Measured); Codex terminal citations (Practice).
4. **Show "not verified" and assumptions as a first-class, visible section, never folded.** Write the gap in the first person ("I did not run it on Windows"). Sources: Kim et al. first-person hedge (Measured); Codex communicates uncertainty and failures; Jules shows assumptions in the plan (Practice).
5. **Confidence as a category with a stated meaning, not a bare percentage; reproduction rates stay as counts ("2 of 3 runs").** Sources: PAIR Guidebook (Practice); Zhang et al. confidence calibrates trust but is not sufficient (Measured); Goddard et al. displaying confidence as a mitigator (Measured review).
6. **Fold the technical evidence, but one click away and labelled with what is inside** (root-cause chain, logs, diff, session trace). Keep the focus stable when it opens. Sources: Copilot "View session" and Agent-Logs-Url, CodeRabbit `<details>` and collapsed review details, Sentry stack trace and breadcrumbs below highlights, Primer progressive disclosure (Practice).
7. **For high-risk or irreversible gates, ask for the Operator's own read before revealing the recommendation** (e.g. a one-tap "your call first: accept / reject / unsure", or require opening the verification hook). Use only on those gates. Sources: Bucinca et al. cognitive forcing (Measured; disliked by users, so reserve it); NN/g heavy friction only for rare dangerous actions (Practice).
8. **Mark destructive or irreversible options visually and in words, put focus on the safe option, and make no option the default.** Colour plus icon plus text, never colour alone. Sources: Apple HIG (no default to make people read; destructive style), Primer danger focus on Cancel, Carbon danger button, Atlassian not by colour alone (Practice).
9. **Severity and risk labels use a small fixed scale with a one-line reason each.** Sources: CodeRabbit merge risk Minimal..Critical with explanation and effort 1-5; Devin red/orange severity and Investigate vs Informational flags (Practice).
10. **Gate only what needs a human, and do not repeat a prompt for the same item; otherwise approvals become reflex.** Sources: Ancker et al. repeated alerts (Measured); NN/g habituation; Goddard et al. workload and time pressure raise automation bias (Measured review).
11. **The requester never approves its own gate, and an unanswered gate expires rather than auto-approves.** Sources: Copilot approval does not count for the requester; GitHub self-review prevention and 30-day failure (Practice). Contrast: Jules auto-approves on a timer, which we reject for the Operator gate.
12. **One card, one source, three renderings: the same ordered fields render as the console card, a tracker comment updated in place, and a short chat message with the decision block plus a link.** Sources: Vercel updates one PR comment per push; CodeRabbit walkthrough as Markdown with `<details>`; Linear elicitation with `select` options and free-text reply (Practice).

Gaps: no measured study found on card layout itself (field order, folding) for developer approvals; layout rules 1, 6, 9 and 12 rest on product practice only. Microsoft notes mitigations can backfire, so rules 4, 5 and 7 should be checked with the Operator on real gates.
