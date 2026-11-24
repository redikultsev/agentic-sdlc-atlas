/**
 * Apply the Operator's answer to a release request. The effect is read from the chosen
 * option's `value.effect`, never from the text:
 *
 * - release (release-ask): start the release run with reason `operator`, which releases
 *   what waits without asking again.
 * - not-now (release-ask): nothing moves; the same items are not asked about again.
 * - wait (line-ask): nothing moves; the line clears when the culprit's revert merges.
 * - end-block (line-ask): clear the release line and start the release run.
 * - promote (promote-ask): the gate is passed; start the release run, which goes on from
 *   the next environment.
 * - hold (promote-ask): the release stops at that environment (recorded as failed there,
 *   "held"); its items stay in Releasing for the next release once the base moves.
 * - other: the text is recorded as a ruling and nothing moves; the request is closed, so
 *   the next scheduled run asks again (a gate's request too).
 *
 * The answer's text is recorded as a ruling on the first item in every case (decision 32).
 * Every fire carries a delivery id built from the request, so one answer starts one run.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and
 * INPUTS_UNIFY_DEPLOY_BINDING; INPUTS_GATE (release, line or promote), INPUTS_RELEASE and
 * INPUTS_ITEMS (and INPUTS_ENV for a gate) from the node that asked; INPUTS_DECISION, INPUTS_TEXT and INPUTS_VALUE from
 * the wait.
 */

import { emit, input, runId } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { fireNext } from '../../.shared/fire.ts';
import { nullableJson, record } from '../../.shared/inputs.ts';
import type { ItemKey } from '../../.shared/item.ts';
import { readLine, setEnvStatus, updateLine } from '../../.shared/releases.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { type AskKind, clearGate, readAsk, setGate, writeAsk } from './lib.ts';

function startRelease(repo: ReturnType<typeof runInputs>['repo'], item: ItemKey, delivery: string, reason: string): string {
  return fireNext('unify-deploy', repo, item, delivery, { reason }, 'release');
}

async function main(): Promise<void> {
  const { repo } = runInputs();
  const gate = input('gate').trim();
  const id = input('release').trim();
  const items = (JSON.parse(input('items') || '[]') as ItemKey[]).filter(k => typeof k === 'string');
  const decision = input('decision').trim();
  const text = input('text').trim();
  const value = record(nullableJson(input('value')));
  const effect = decision === 'other' ? 'other' : typeof value?.effect === 'string' ? value.effect : '';
  const first = items[0];
  if (first === undefined) throw new Error('the request names no item');
  const run = runId();
  await recordRuling(first, { gate: `${gate}-ask`, decision, text, project: false });
  const askKind: AskKind | null = gate === 'release' ? 'release' : gate === 'line' ? 'line' : null;
  const subject = readAsk(askKind ?? 'release')?.subject ?? '';
  const mark = (status: 'declined' | 'waiting' | 'answered'): void => {
    if (askKind !== null) writeAsk(askKind, { subject, status, run, at: new Date().toISOString() });
  };

  switch (effect) {
    case 'release': {
      mark('answered');
      const fire = startRelease(repo, first, `pipeline-release-go:${repo.path}:${run}`, 'operator');
      emit({ effect, summary: `the Operator released ${items.join(', ')}; ${fire}` });
      return;
    }
    case 'not-now':
      mark('declined');
      emit({ effect, summary: `${items.join(', ')} stay in Releasing on the Operator's word` });
      return;
    case 'wait':
      mark('waiting');
      emit({ effect, summary: `the release line stays blocked until the culprit's revert or fix merges` });
      return;
    case 'end-block': {
      const blocked = readLine().blocked;
      updateLine(line => {
        line.blocked = null;
      });
      mark('answered');
      const fire = startRelease(repo, first, `pipeline-line-end:${repo.path}:${blocked?.release ?? 'line'}:${run}`, 'schedule');
      emit({ effect, summary: `the Operator ended the block of the release line${blocked === null ? '' : ` (release ${blocked.release})`}; ${fire}` });
      return;
    }
    case 'promote': {
      const env = typeof value?.env === 'string' ? value.env : input('env').trim();
      setGate(id, env, 'passed', text);
      const fire = startRelease(repo, first, `pipeline-promote:${repo.path}:${id}:${env}`, 'schedule');
      emit({ effect, summary: `release ${id} passed the gate of ${env}; ${fire}` });
      return;
    }
    case 'hold': {
      const env = typeof value?.env === 'string' ? value.env : input('env').trim();
      setGate(id, env, 'held', text);
      setEnvStatus(id, env, 'failed', `held at the gate${text === '' ? '' : `: ${text}`}`);
      for (const key of items) {
        await tracker().comment(key, `unify-deploy-held:${id}:${env}`, [`**Release held at ${env}**`, '', `Release ${id} stops at ${env} on the gate's answer; the item stays in Releasing and goes with the next release once the base moves.`, ...(text === '' ? [] : ['', `The answer: ${text}`])].join('\n'));
      }
      emit({ effect, summary: `release ${id} is held at ${env}` });
      return;
    }
    case 'other':
      if (askKind !== null) writeAsk(askKind, null);
      // An open gate with no answer would hold the release for ever: the next run asks again.
      if (gate === 'promote' && input('env').trim() !== '') clearGate(id, input('env').trim());
      emit({ effect, summary: `the text is recorded as a ruling on ${first}; nothing moved` });
      return;
    default:
      throw new Error(`the answer '${decision}' carries no effect this script knows`);
  }
}

await script('unify-deploy decide', main);
