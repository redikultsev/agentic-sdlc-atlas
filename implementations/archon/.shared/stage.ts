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
import { tracker, TrackerError } from './connector.ts';
import { git, gitOrThrow } from './git.ts';
import type { ItemKey } from './item.ts';
import { buildRequest, type Option, type Request, waitingCount } from './request.ts';
import { type From, MARKS, MOVES, moveState, NONE, readState, resolveDifference, STATES, type State, StateDifference, StateMismatch } from './states.ts';
import { readWork } from './work.ts';
import { rulingsRegister } from './rulings.ts';
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
export function stopCard(key: ItemKey, stage: string, reason: string): Card {
  const request = buildRequest(
    {
      decide: `${key}: the ${stage} stage stopped instead of overwriting what it found.`,
      why: 'the item is not where this stage expects it, and only you know whether a person or another run moved it.',
      notVerified: ['whether another run of this item is still live'],
      facts: [reason, tracker().url(key)],
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
 * A difference between the engine and the tracker (decision 45): one request, outside the
 * waiting cap, with the three answers the model gives it. Bringing the tracker back or
 * adopting its change ends this run all the same: the step starts again from a state both
 * agree on (unify-revisit flags an agent state that nothing works).
 */
export function differenceCard(key: ItemKey, stage: string, difference: StateDifference): Card {
  const single = difference.tracker !== 'conflict';
  const advanced = single && difference.tracker !== NONE && MOVES[difference.engine].includes(difference.tracker as State);
  const options: Option[] = [
    {
      id: 'tracker-back',
      label: `Put the tracker back to ${difference.engine}`,
      does: `Sets the tracker's state label to ${difference.engine}, what the engine holds, and ends this run.`,
      effect: 'keep-engine',
    },
  ];
  if (single) {
    options.push({
      id: 'adopt',
      label: `Adopt ${difference.tracker} from the tracker`,
      does: `The engine takes ${difference.tracker}, as the tracker shows it, and ends this run.`,
      effect: 'keep-tracker',
    });
  }
  options.push({ id: 'stop', label: 'Leave it as it is', does: 'Ends this run and changes nothing; the difference stays until you answer it.', effect: 'stop' });
  const request = buildRequest(
    {
      decide: `${key}: the tracker shows a different state than the engine holds; which one is right?`,
      why: 'someone or something changed the item in the tracker, and only you know whether that was meant; the pipeline overwrites neither.',
      notVerified: ['who changed the tracker, and why'],
      facts: [difference.message, tracker().url(key), `stage: ${stage}`],
    },
    options,
    advanced
      ? { option: 'adopt', why: `${difference.engine} → ${difference.tracker} is a move the pipeline itself could make, so a person likely moved it on purpose.`, confidence: 'low' }
      : { option: 'tracker-back', why: 'the tracker shows a state the pipeline cannot reach from where it is, so the change is more likely a slip.', confidence: 'low' }
  );
  return { ok: false, reason: difference.message, ...request };
}

/** Apply an answer to a difference card; true when the answer was one. */
export async function applyDifference(key: ItemKey, effect: string | undefined): Promise<boolean> {
  if (effect === 'keep-engine') {
    tracker().forgetRefusals(key);
    await resolveDifference(key, 'engine');
  } else if (effect === 'keep-tracker') await resolveDifference(key, 'tracker');
  else return false;
  return true;
}

/**
 * Writes the tracker refused for this item (decision 45): a difference for the Operator,
 * the same request as a moved label. Putting the tracker back writes them again.
 */
export function refusedWrites(key: ItemKey): StateDifference | null {
  const refused = tracker().waiting(key).refused;
  const writes = Object.entries(refused);
  if (writes.length === 0) return null;
  const engine = (readWork(key).doc.state ?? NONE) as From;
  return new StateDifference(key, engine, 'conflict', [], `${key}: the tracker refused ${writes.length} write(s): ${writes.map(([w, r]) => `${w} (${r.message})`).join('; ')}`);
}

/**
 * The item and its document agree, and its state is one this stage starts from. Returns
 * null when they do, the reason otherwise. A closed issue, a difference with the tracker
 * (also given as `difference`, for its own request), or a state outside `entry` stops the run.
 */
export async function reconcile(key: ItemKey, entry: readonly From[]): Promise<{ readonly state: From | null; readonly reason: string | null; readonly difference?: StateDifference }> {
  const refused = refusedWrites(key);
  if (refused !== null) return { state: null, reason: refused.message, difference: refused };
  try {
    if (!(await tracker().view(key)).open) return { state: null, reason: `${key} is closed` };
  } catch (error) {
    // While the tracker is down the engine's state decides (decision 47).
    if (!(error instanceof TrackerError && error.kind === 'outage')) throw error;
  }
  let current: From;
  try {
    current = await readState(key);
  } catch (error) {
    if (error instanceof StateDifference) return { state: null, reason: error.message, difference: error };
    if (error instanceof StateMismatch) return { state: null, reason: error.message };
    throw error;
  }
  if (!entry.includes(current)) {
    return { state: current, reason: `${key} is ${current}; this stage starts only from ${entry.join(' or ')}` };
  }
  const { doc } = readWork(key);
  if (doc.clarify > 3 || doc.redo > 3) {
    return { state: current, reason: `${key} records ${doc.clarify} clarify and ${doc.redo} redo answers, more than the three a gate allows` };
  }
  return { state: current, reason: null };
}

/** Move the state; a mismatch comes back as its reason, never as an overwrite. */
export async function tryMove(key: ItemKey, expected: readonly From[], to: State): Promise<string | null> {
  try {
    await moveState(key, expected, to);
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
export function waitingOthers(own: ItemKey | null): number {
  return waitingCount(own);
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
export async function itemContext(key: ItemKey, trusted: readonly string[], pipelineLogin: string): Promise<string> {
  const t = tracker();
  const view = await t.view(key);
  const allowed = [...trusted, pipelineLogin.toLowerCase()].filter(s => s !== '');
  const comments = await t.comments(key);
  const kept = comments.filter(c => isTrusted(c.author, allowed));
  const left = comments.length - kept.length;
  const parts = [
    `Item ${key}: ${view.url}`,
    untrusted(`item ${key} title`, view.title),
    untrusted(`item ${key} body`, view.body),
    ...kept.map(c => untrusted(`comment by ${c.author ?? 'unknown'} (trusted) ${c.url}`, c.body)),
    left > 0 ? `${left} comment(s) by authors who are not trusted were left out.` : 'No comment was left out.',
  ];
  const register = await rulingsRegister();
  if (register !== null) {
    const rulings = (await t.comments(register)).filter(c => isTrusted(c.author, allowed));
    parts.push(`Project rulings (${t.url(register)}):`, ...rulings.map(c => untrusted(`project ruling ${c.url}`, c.body)));
  } else {
    parts.push('The project has no rulings register yet.');
  }
  return parts.join('\n\n');
}
