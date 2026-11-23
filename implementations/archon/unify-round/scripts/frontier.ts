/**
 * The slices this round implements (decision 16): planned slices whose blockers are all
 * merged into the item branch, up to the project's `slices.maxParallel` (default 1); an S
 * item is one implicit slice, the issue itself. A round after a fix verdict, "changes" or a
 * land conflict is one fix slice carrying the findings. Request and comment text from
 * anyone reaches the Implementer only as marked data.
 */

import { emit, input } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { projectPolicy } from '../../.shared/policy.ts';
import { itemBranch } from '../../.shared/repo.ts';
import { untrusted } from '../../.shared/trust.ts';
import { readItem, run } from './lib/item.ts';
import { baseName, itemRef, slugBranch } from './lib/facts.ts';

interface SliceTask {
  readonly id: string;
  readonly issue: number;
  readonly title: string;
  readonly brief: string;
  readonly branch: string;
  readonly item_branch: string;
  readonly base: string;
  readonly progress: string;
  readonly work_dir: string;
  readonly fix: boolean;
}

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const base = baseName(input('base'));
  const login = input('pipeline_login').trim().toLowerCase();
  const policy = projectPolicy(base);
  const doc = readItem(ref.number);
  const workDir = `.pipeline/work/${ref.number}`;
  const issue = forge('workitem.view', { ref });
  const { comments } = forge('workitem.comments', { subject: { kind: 'issue', ref } });
  const rulings = comments
    .filter(c => c.body.startsWith('**Ruling**') && (login === '' || c.author?.login?.toLowerCase() === login))
    .map(c => c.body);
  const common = [
    `Work item #${ref.number}: ${issue.title}`,
    untrusted('issue body', issue.body),
    ...(rulings.length > 0 ? ['Rulings of the Operator on this item, newest last (they override the request):', ...rulings] : []),
    `Spec and plan, when the item has them: ${workDir}/spec.md and ${workDir}/plan.md on the branch.`,
  ];
  const task = (id: string, issueNumber: number, title: string, brief: string[], fix: boolean): SliceTask => ({
    id,
    issue: issueNumber,
    title,
    brief: [...common, '', ...brief].join('\n'),
    branch: slugBranch(ref.number, id),
    item_branch: itemBranch(ref.number),
    base: policy.base,
    progress: `${workDir}/progress/${id}.md`,
    work_dir: workDir,
    fix,
  });

  if (doc.fix !== null) {
    const lines = doc.fix.findings.map(f => {
      const text = f.source === 'thread' || f.source === 'operator' ? untrusted(`${f.source} ${f.key}`, f.text) : f.text;
      return `- [${f.key}] (${f.source}${f.repeated ? ', came back after a fix: fix the whole class of this defect in the diff' : ''}) ${text}`;
    });
    const slices = [task('fix', ref.number, `Fix round after ${doc.fix.from}`, ['Fix these findings, nothing else:', ...lines], true)];
    emit({ slices, left: doc.slices.filter(s => s.status !== 'merged').length, fix: true });
    return;
  }

  const planned = doc.slices.length > 0
    ? doc.slices
    : [{ id: 'item', issue: ref.number, status: 'open' as const, branch: null, blockedBy: [] }];
  const merged = new Set(planned.filter(s => s.status === 'merged').map(s => s.id));
  const ready = planned.filter(s => s.status !== 'merged' && s.blockedBy.every(b => merged.has(b)));
  const batch = ready.slice(0, Math.max(1, policy.slices.maxParallel));
  const slices = batch.map(s => {
    if (s.issue === null || s.issue === ref.number) return task(s.id, ref.number, issue.title, ['Implement the whole item.'], false);
    const sub = forge('workitem.view', { ref: { repo: ref.repo, number: s.issue } });
    return task(s.id, s.issue, sub.title, [`Slice ${s.id} (#${s.issue}): ${sub.title}`, untrusted(`slice #${s.issue} body`, sub.body)], false);
  });
  const left = planned.filter(s => s.status !== 'merged').length - slices.length;
  emit({ slices, left, fix: false });
});
