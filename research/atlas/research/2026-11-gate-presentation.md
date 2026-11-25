# How a gate should look to the Operator

Question (2026-11-25): in the first live trial the Operator found the Accept gate hard to read in Archon's console: a wall of small plain text, the decision mixed with technical evidence, nothing visual. How should a decision request look so it is quick, pleasant and correct to decide on?

Three studies, read on 2026-11-25, each fact with its source in the study:

- [`gate-presentation/archon-console-gates.md`](gate-presentation/archon-console-gates.md): what Archon's console (commit f9d1d2b) can render, from its source, with file:line.
- [`gate-presentation/comprehension-tools-for-gates.md`](gate-presentation/comprehension-tools-for-gates.md): what tools for understanding a change offer that a gate could borrow, from the list awesome-codebase-understanding and the tools' own pages.
- [`gate-presentation/decision-card-ux.md`](gate-presentation/decision-card-ux.md): how agent products, dev tools and design systems present a decision, and the studies on showing AI recommendations.

Earlier work on the text of a request: [`2026-11-decision-presentation.json`](2026-11-decision-presentation.json) (decision 38).

## What limits us on Archon

- The gate message is plain text with preserved line breaks: no markdown, no clickable links, no folding, no length cap (`archon-console-gates.md` §1).
- A wait node takes only `attention`, `form`, `options`, `recommendation`, `labels`, `other`; another key is a load error (§2).
- The run's Artifacts tab renders `.md` files as GitHub markdown; HTML, SVG and images show as raw text; a file cannot be deep-linked (§3).
- No plugin slot for the console; the attention items and their stream are open JSON APIs, so a separate viewer is possible (§4).

## What the evidence says

- No study measures the layout of an approval card itself; layout rests on product practice (`decision-card-ux.md` gaps).
- Explanations raise acceptance of AI advice, right or wrong, unless checking them is cheaper than redoing the work; a check the reader can do in seconds is what helps (`decision-card-ux.md` §4).
- First-person hedges ("I did not run it on…") reduce overreliance; confidence shown alone calibrates trust but is not enough (§4).
- Reviewers who start from an AI review look where it points and find no more serious problems (`comprehension-tools-for-gates.md` §2, arXiv 2411.11401).
- Order matters: a defect in the last file shown was 64% less likely to be found (arXiv 2208.04259).
- Repeated prompts are accepted more and more by reflex (`decision-card-ux.md` §4).

## Rules for a gate card, in priority order

1. The decision and its stakes first, in one block: what is asked, verdict, size, risk, recommendation with confidence.
2. Every option is named by its exact effect, never yes/no.
3. Beside the recommendation, one check the Operator can do in seconds: the reproduction rate, the control case, the failing test.
4. "Not verified" and assumptions in plain view, in the first person, never folded.
5. Confidence as a category with its meaning; rates as counts ("2 of 3 runs").
6. Technical evidence folded, one step away, labelled with what is inside and how each claim is known (ran it, read the code, assumed).
7. One figure where it carries the decision (the cause chain, a change map, before and after), none when trivial.
8. Irreversible options marked in words and colour; no default option.
9. Risk on a small fixed scale with a one-line reason.
10. Ask only what needs the Operator; never ask twice for the same item.
11. One source, three renderings: the console card, the tracker comment (updated in place), a short chat message.

## Options for the trial

- **A. Within the pack, now.** The message becomes a short brief in fixed blocks (decide, recommendation, the check, not verified, why you), the options carry their effects, and the full case goes to a markdown artifact of the run (tables, folded sections) and to the tracker comment. No change to Archon. Limits: still plain text in the console, no figure, the artifact is one click and a tab away.
- **B. A decision page over Archon's API.** A small read-only page per gate built from the same fields: header with the decision, the check, a figure of the cause chain, rates as dots, folded evidence; the answer still goes through Archon. Visual, but one more thing to run and keep.
- **C. A change to Archon.** Render the gate message as markdown with folding (the console already renders markdown for artifacts). Smallest change for the largest gain, but outside our repository and waits on upstream.

Each starts from the same structured fields, so A comes first in every path; B or C is chosen after A is used on real gates. Test: the Operator's time to decide and how often a decision is reversed, since no study covers this form.
