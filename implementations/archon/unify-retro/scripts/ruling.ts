/**
 * Apply the Operator's answer to the weekly summary, by the chosen option's
 * `value.effect`: `hold` labels this week's proposal items `pipeline:needs-approval`;
 * `noted` changes nothing. Any text, and an "other" answer, is a project ruling: appended
 * to the "Pipeline rulings" register item when there is one (decision 44), and kept in the
 * week's state document either way.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH; INPUTS_WEEK and
 * INPUTS_FILED from the summary; INPUTS_DECISION, INPUTS_TEXT and INPUTS_VALUE from the
 * wait.
 */

import { emit, input, state } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { nullableJson, record } from '../../.shared/inputs.ts';
import type { ItemKey } from '../../.shared/item.ts';
import { rulingsRegister } from '../../.shared/rulings.ts';
import { MARKS } from '../../.shared/states.ts';

async function main(): Promise<void> {
  const week = input('week').trim();
  const filed = JSON.parse(input('filed') || '[]') as ItemKey[];
  const decision = input('decision').trim();
  const text = input('text').trim();
  const value = record(nullableJson(input('value')));
  const effect = decision === 'other' ? 'other' : typeof value?.effect === 'string' ? value.effect : '';
  const done: string[] = [];

  if (effect === 'hold') {
    for (const key of filed) await tracker().label(key, { add: [MARKS.needsApproval] });
    done.push(`held ${String(filed.length)} proposals`);
  } else if (effect === 'noted' || effect === 'other') {
    done.push('proposals left for Triage');
  } else {
    throw new Error(`the answer '${decision}' carries no effect this script knows`);
  }

  if (text !== '') {
    const register = await rulingsRegister();
    if (register !== null) {
      await tracker().comment(
        register,
        `pipeline-ruling:retro:${week}`,
        `**Ruling** (${new Date().toISOString().slice(0, 10)}, weekly summary ${week}: ${decision})\n\n${text}`
      );
      done.push(`ruling appended to ${register}`);
    } else {
      done.push('no rulings register item yet: the ruling is kept in the week record only');
    }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(`retro/${week}`);
    const prior = record(found.value) ?? {};
    if (state.put(`retro/${week}`, { ...prior, answer: { decision, text, at: new Date().toISOString() } }, { ifRevision: found.revision }).ok) break;
  }
  emit({ effect, summary: done.join('; ') });
}

await script('unify-retro ruling', main);
