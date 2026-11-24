/**
 * The slices this round implements (decision 16): planned slices whose blockers are all
 * merged into the item branch, up to the project's `slices.maxParallel` (default 1); an S
 * item is one implicit slice, the item itself. A round after a fix verdict, "changes" or a
 * land conflict is one fix slice carrying the findings. Request and comment text from
 * anyone reaches the Implementer only as marked data.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { issueKey, issueNumber, keySlug } from '../../.shared/item.ts';
import { projectPolicy } from '../../.shared/policy.ts';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { untrusted } from '../../.shared/trust.ts';
import { readItem } from './lib/item.ts';
import { baseName, slugBranch } from './lib/facts.ts';

interface SliceTask {
  readonly id: string;
  readonly issue: number | null;
  readonly title: string;
  readonly brief: string;
  readonly branch: string;
  readonly item_branch: string;
  readonly base: string;
  readonly progress: string;
  readonly work_dir: string;
  readonly fix: boolean;
}

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const base = baseName(input('base'));
  const login = input('pipeline_login').trim().toLowerCase();
  const policy = projectPolicy(base);
  const doc = readItem(key);
  const own = issueNumber(key);
  const workDir = `.pipeline/work/${keySlug(key)}`;
  const item = await tracker().view(key);
  const comments = await tracker().comments(key);
  const rulings = comments
    .filter(c => c.body.startsWith('**Ruling**') && (login === '' || c.author?.toLowerCase() === login))
    .map(c => c.body);
  const common = [
    `Work item ${key}: ${item.title}`,
    untrusted('item body', item.body),
    ...(rulings.length > 0 ? ['Rulings of the Operator on this item, newest last (they override the request):', ...rulings] : []),
    `Spec and plan, when the item has them: ${workDir}/spec.md and ${workDir}/plan.md on the branch.`,
  ];
  const task = (id: string, issue: number | null, title: string, brief: string[], fix: boolean): SliceTask => ({
    id,
    issue,
    title,
    brief: [...common, '', ...brief].join('\n'),
    branch: slugBranch(key, id),
    item_branch: itemBranch(key),
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
    const slices = [task('fix', own, `Fix round after ${doc.fix.from}`, ['Fix these findings, nothing else:', ...lines], true)];
    emit({ slices, left: doc.slices.filter(s => s.status !== 'merged').length, fix: true });
    return;
  }

  const planned = doc.slices.length > 0
    ? doc.slices
    : [{ id: 'item', issue: own, status: 'open' as const, branch: null, blockedBy: [] as string[] }];
  const merged = new Set(planned.filter(s => s.status === 'merged').map(s => s.id));
  const ready = planned.filter(s => s.status !== 'merged' && s.blockedBy.every(b => merged.has(b)));
  const batch = ready.slice(0, Math.max(1, policy.slices.maxParallel));
  const slices: SliceTask[] = [];
  for (const s of batch) {
    if (s.issue === null || s.issue === own) {
      slices.push(task(s.id, own, item.title, ['Implement the whole item.'], false));
      continue;
    }
    const subKey = issueKey(s.issue);
    const sub = await tracker().view(subKey);
    slices.push(task(s.id, s.issue, sub.title, [`Slice ${s.id} (${subKey}): ${sub.title}`, untrusted(`slice ${subKey} body`, sub.body)], false));
  }
  const left = planned.filter(s => s.status !== 'merged').length - slices.length;
  emit({ slices, left, fix: false });
}

await script('unify-round frontier', main);
