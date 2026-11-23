/**
 * Steps every item stage shares: `reconcile` at the start, a state move that raises a
 * request instead of overwriting, a "stop" request, the gate answer of a loop's last
 * round, the waiting count without the item itself, and committing files to the item
 * branch without touching the checkout.
 *
 * The same file sits in each workflow's `scripts/lib/` of the preparation stages
 * (poll, triage, spec, plan); it belongs in `.shared/` once the owner of that folder
 * takes it.
 */

import { outcomes } from 'archon:script';
import { forge } from './forge.ts';
import { git, gitOrThrow } from './git.ts';
import type { IssueRef, Repo } from './repo.ts';
import { buildRequest, type Request } from './request.ts';
import { type From, MARKS, moveState, readState, STATES, type State, StateMismatch } from './states.ts';
import { readWork } from './work.ts';
import { isTrusted, untrusted } from './trust.ts';

/** A request a script emits for a `wait` to take by reference, with whether the stage goes on. */
export interface Card extends Request {
  readonly ok: boolean;
  readonly reason: string;
}

/** The fields a skipped wait still needs from a producer whose `ok` is true. */
export function clear(): Card {
  return { ok: true, reason: '', question: '', options: [], recommendation: { option: '', why: '', confidence: 'low' } };
}

/** A request with one option: end the run and change nothing. Used where a script found a state it did not expect. */
export function stopCard(ref: IssueRef, stage: string, reason: string): Card {
  const request = buildRequest(
    {
      decide: `#${ref.number}: the ${stage} stage stopped instead of overwriting what it found.`,
      why: 'the item is not where this stage expects it, and only you know whether a person or another run moved it.',
      notVerified: ['whether another run of this item is still live'],
      facts: [reason, `https://${ref.repo.host}/${ref.repo.path}/issues/${ref.number}`],
    },
    [
      {
        id: 'stop',
        label: 'Stop this run',
        does: 'Ends this run and changes nothing. Put the label right (or let the live run finish), then start the stage again.',
        effect: 'stop',
      },
    ],
    { option: 'stop', why: 'Nothing else is safe without knowing who moved the item.', confidence: 'high' }
  );
  return { ok: false, reason, ...request };
}

/**
 * The item and its document agree, and its label is one this stage starts from. Returns
 * null when they do, the reason otherwise. A closed issue, two state labels, or a label
 * outside `entry` stops the run.
 */
export function reconcile(ref: IssueRef, entry: readonly From[]): { readonly state: From | null; readonly reason: string | null } {
  const view = forge('workitem.view', { ref });
  if (view.state !== 'open') return { state: null, reason: `#${ref.number} is closed` };
  let current: From;
  try {
    current = readState(ref);
  } catch (error) {
    if (error instanceof StateMismatch) return { state: null, reason: error.message };
    throw error;
  }
  if (!entry.includes(current)) {
    return { state: current, reason: `#${ref.number} is ${current}; this stage starts only from ${entry.join(' or ')}` };
  }
  const { doc } = readWork(ref.number);
  if (doc.clarify > 3 || doc.redo > 3) {
    return { state: current, reason: `work/${ref.number} records ${doc.clarify} clarify and ${doc.redo} redo answers, more than the three a gate allows` };
  }
  return { state: current, reason: null };
}

/** Move the state; a mismatch comes back as its reason, never as an overwrite. */
export function tryMove(ref: IssueRef, expected: readonly From[], to: State): string | null {
  try {
    moveState(ref, expected, to);
    return null;
  } catch (error) {
    if (error instanceof StateMismatch) return error.message;
    throw error;
  }
}

export interface Answer {
  readonly decision: string;
  readonly text: string;
  readonly value: Record<string, unknown> | null;
}

function asAnswer(raw: unknown): Answer | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.decision !== 'string') return null;
  const value = typeof r.value === 'object' && r.value !== null && !Array.isArray(r.value) ? (r.value as Record<string, unknown>) : null;
  return { decision: r.decision, text: typeof r.text === 'string' ? r.text : '', value };
}

/**
 * The answer to a gate that is the only sink of a `loop_group` body, from its last
 * completed round. A node after the group cannot reference a body node, so the answer
 * that ended the loop is read from the run's own node outcomes (`group.gate`).
 */
export function lastAnswer(group: string, gate: string): Answer | null {
  const id = `${group}.${gate}`;
  const entries = outcomes().nodes.filter(n => (n.node_id === id || n.node_id === gate) && n.state === 'completed');
  let best: { iteration: number; answer: Answer } | null = null;
  for (const entry of entries) {
    const answer = asAnswer(entry.output);
    if (answer === null) continue;
    const iteration = entry.loop_group_path?.[entry.loop_group_path.length - 1]?.iteration ?? 0;
    if (best === null || iteration >= best.iteration) best = { iteration, answer };
  }
  return best?.answer ?? null;
}

/** The option an answer chose, with its effect; `other` has no option and its own effect. */
export function chosenEffect(answer: Answer, otherEffect: string): string {
  if (answer.decision === 'other') return otherEffect;
  const effect = answer.value?.effect;
  if (typeof effect !== 'string' || effect === '') throw new Error(`the answer '${answer.decision}' carries no value.effect`);
  return effect;
}

/** Items with an open request to the Operator, the given item left out. */
export function waitingOthers(repo: Repo, own: number | null): number {
  const numbers = new Set<number>();
  for (const def of Object.values(STATES)) {
    if (!def.operator) continue;
    const listed = forge('workitem.list', { repo, label: def.label });
    for (const found of listed.items) {
      if (found.kind === 'issue' && found.state === 'open' && found.ref.number !== own) numbers.add(found.ref.number);
    }
  }
  return numbers.size;
}

export interface FileWrite {
  readonly path: string;
  readonly text: string;
}

/**
 * Commit files onto `branch` on the remote without touching the checkout: a temporary
 * index on top of the branch tip (or the base tip for a new branch), `commit-tree`, and a
 * push of that commit; then the remote ref is read back. A retry that finds the same
 * content commits nothing.
 */
export function commitFiles(base: string, branch: string, files: readonly FileWrite[], message: string, scratch: string): { readonly commit: string; readonly changed: boolean } {
  git('fetch', '--quiet', 'origin', base);
  const fetched = git('fetch', '--quiet', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`);
  const parent = fetched.code === 0 ? gitOrThrow('rev-parse', `origin/${branch}`) : gitOrThrow('rev-parse', `origin/${base}`);
  const env = { ...process.env, GIT_INDEX_FILE: `${scratch}/pipeline-index-${process.pid}` };
  const run = (args: string[], stdin?: string): string => {
    const r = Bun.spawnSync(['git', ...args], { env, stdin: stdin === undefined ? undefined : new TextEncoder().encode(stdin), stdout: 'pipe', stderr: 'pipe' });
    if (r.exitCode !== 0) throw new Error(`git ${args[0]} failed: ${r.stderr.toString().trim()}`);
    return r.stdout.toString().trim();
  };
  run(['read-tree', parent]);
  for (const file of files) {
    const blob = run(['hash-object', '-w', '--stdin'], file.text.endsWith('\n') ? file.text : `${file.text}\n`);
    run(['update-index', '--add', '--cacheinfo', `100644,${blob},${file.path}`]);
  }
  const tree = run(['write-tree']);
  Bun.spawnSync(['rm', '-f', env.GIT_INDEX_FILE]);
  if (tree === gitOrThrow('rev-parse', `${parent}^{tree}`)) return { commit: parent, changed: false };
  const commit = run(['commit-tree', tree, '-p', parent, '-m', message]);
  gitOrThrow('push', '--quiet', 'origin', `${commit}:refs/heads/${branch}`);
  const remote = gitOrThrow('ls-remote', 'origin', `refs/heads/${branch}`).split(/\s+/)[0] ?? '';
  if (remote !== commit) throw new Error(`origin ${branch} reads ${remote || 'nothing'} after pushing ${commit}`);
  return { commit, changed: true };
}

/**
 * What an agent reads about the item, as one text: the request as marked data (its
 * author is trusted or the text was approved, but a request is never instructions), the
 * comments of trusted authors and of the pipeline's account (rulings are written by it),
 * and the project's rulings. Comments by anyone else are left out and counted.
 */
export function itemContext(ref: IssueRef, trusted: readonly string[], pipelineLogin: string): string {
  const view = forge('workitem.view', { ref });
  const allowed = [...trusted, pipelineLogin.toLowerCase()].filter(s => s !== '');
  const { comments } = forge('workitem.comments', { subject: { kind: 'issue', ref } });
  const kept = comments.filter(c => isTrusted(c.author?.login, allowed));
  const left = comments.length - kept.length;
  const parts = [
    `Item #${ref.number} in ${ref.repo.path}: ${view.url}`,
    untrusted(`issue #${ref.number} title`, view.title),
    untrusted(`issue #${ref.number} body`, view.body),
    ...kept.map(c => untrusted(`comment by ${c.author?.login ?? 'unknown'} (trusted) ${c.url}`, c.body)),
    left > 0 ? `${left} comment(s) by authors who are not trusted were left out.` : 'No comment was left out.',
  ];
  const register = forge('workitem.list', { repo: ref.repo, label: MARKS.rulings }).items.find(i => i.kind === 'issue' && i.state === 'open');
  if (register !== undefined) {
    const rulings = forge('workitem.comments', { subject: { kind: 'issue', ref: register.ref } }).comments.filter(c => isTrusted(c.author?.login, allowed));
    parts.push(`Project rulings (${register.url}):`, ...rulings.map(c => untrusted(`project ruling ${c.url}`, c.body)));
  } else {
    parts.push('The project has no rulings register yet.');
  }
  return parts.join('\n\n');
}
