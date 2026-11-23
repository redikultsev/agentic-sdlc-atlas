/**
 * Apply the Operator's answer to the weekly summary, by the chosen option's
 * `value.effect`: `hold` labels this week's proposal issues `pipeline:needs-approval`;
 * `noted` changes nothing. Any text, and an "other" answer, is a project ruling: appended
 * to the pinned "Pipeline rulings" issue when there is one (decision 44), and kept in the
 * week's state document either way.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH; INPUTS_WEEK and
 * INPUTS_FILED from the summary; INPUTS_DECISION, INPUTS_TEXT and INPUTS_VALUE from the
 * wait.
 */

import { emit, input, refuse, state } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { nullableJson, record } from '../../.shared/inputs.ts';
import { repoOf } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { message } from './lib.ts';

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const week = input('week').trim();
  const filed = JSON.parse(input('filed') || '[]') as number[];
  const decision = input('decision').trim();
  const text = input('text').trim();
  const value = record(nullableJson(input('value')));
  const effect = decision === 'other' ? 'other' : typeof value?.effect === 'string' ? value.effect : '';
  const done: string[] = [];

  if (effect === 'hold') {
    for (const number of filed) forge('workitem.label.add', { subject: { kind: 'issue', ref: { repo, number } }, name: MARKS.needsApproval });
    done.push(`held ${String(filed.length)} proposals`);
  } else if (effect === 'noted' || effect === 'other') {
    done.push('proposals left for Triage');
  } else {
    throw new Error(`the answer '${decision}' carries no effect this script knows`);
  }

  if (text !== '') {
    const register = forge('workitem.list', { repo, label: MARKS.rulings }).items.find(item => item.kind === 'issue' && item.state === 'open');
    if (register !== undefined) {
      forge('workitem.comment.upsert', {
        subject: { kind: 'issue', ref: register.ref },
        marker: `pipeline-ruling:retro:${week}`,
        body: `**Ruling** (${new Date().toISOString().slice(0, 10)}, weekly summary ${week}: ${decision})\n\n${text}`,
      });
      done.push(`ruling appended to #${String(register.ref.number)}`);
    } else {
      done.push('no rulings register issue yet: the ruling is kept in the week record only');
    }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(`retro/${week}`);
    const prior = record(found.value) ?? {};
    if (state.put(`retro/${week}`, { ...prior, answer: { decision, text, at: new Date().toISOString() } }, { ifRevision: found.revision }).ok) break;
  }
  emit({ effect, summary: done.join('; ') });
}

try {
  main();
} catch (error) {
  refuse(`unify-retro ruling: ${message(error)}`);
}
