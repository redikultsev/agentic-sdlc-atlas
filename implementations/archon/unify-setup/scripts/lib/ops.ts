/** What the pipeline loses when the project's tracker lacks an optional operation (decision 46). */

import type { OptionalOp } from '../../../.shared/connector.ts';

export const TURNS_OFF: Readonly<Record<Exclude<OptionalOp, 'label-ensure'>, string>> = {
  create: 'no item can be created: approving a plan (slice items), the rulings register, a rollback report and retro proposals are refused',
  close: 'no item can be closed: won\'t do, cancel and done leave the item open in the tracker',
  list: 'nothing can be listed: the intake poll finds no new item, and the rulings and rejected registers are not read',
  slice: 'slices are not linked in the tracker (the engine holds them anyway)',
  'blocked-by': '"blocked by" links are not made in the tracker (the engine holds them anyway)',
  blockers: 'revisit cannot see that a blocker was closed',
  'label-set-by': 'an approval label never counts, since its setter cannot be read (decision 39)',
  'comment-edit': 'a retried comment is left as first written instead of updated',
};

export function turnsOff(op: string): string {
  return (TURNS_OFF as Record<string, string>)[op] ?? 'not used by the pipeline';
}
