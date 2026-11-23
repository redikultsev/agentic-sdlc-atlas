/**
 * What the revisit pass's three scripts share: the marks it sets, the engine's view of
 * every item with a run in the last 30 days, open issues by label, the host CLI, and the
 * GitHub "blocked by" read that the forge does not offer.
 */

import { items, type ItemWindow } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { archonCommand } from '../../.shared/host.ts';
import type { Repo } from '../../.shared/repo.ts';

/** Marks this pass sets; not yet in `.shared/states.ts` MARKS (unify-ping ensures them). */
export const MARKS_REVISIT = {
  needsAttention: 'pipeline:needs-attention',
  setAside: 'pipeline:set-aside',
} as const;

export type EngineItem = ItemWindow['items'][number];

/** Every item with a run in the window, by key (`issue-<n>`), all pages. */
export function engineItems(since = '30d'): Map<string, EngineItem> {
  const found = new Map<string, EngineItem>();
  let page = items({ since, limit: 100 });
  for (let pages = 0; pages < 50; pages++) {
    for (const entry of page.items) found.set(entry.item.key, entry);
    if (page.next === null) break;
    page = items({ after: page.next });
  }
  return found;
}

/** Open issues carrying the label, by number. */
export function openWithLabel(repo: Repo, label: string): number[] {
  const listed = forge('workitem.list', { repo, label });
  return listed.items.filter(item => item.kind === 'issue' && item.state === 'open').map(item => item.ref.number);
}

/** One host CLI command that prints JSON; returns it with the exit code. */
export function hostCommand(args: readonly string[]): { code: number; json: unknown; text: string } {
  const result = Bun.spawnSync([...archonCommand(), ...args], { env: process.env, stdout: 'pipe', stderr: 'pipe' });
  const text = result.stdout.toString().trim();
  let json: unknown = null;
  try {
    json = text === '' ? null : (JSON.parse(text) as unknown);
  } catch {
    json = null;
  }
  return { code: result.exitCode, json, text: text || result.stderr.toString().trim() };
}

/** The issues an issue is blocked by (GitHub issue dependencies), with their state. */
export function blockedBy(repo: Repo, number: number): { number: number; state: string }[] {
  const result = Bun.spawnSync(['gh', 'api', `repos/${repo.path}/issues/${String(number)}/dependencies/blocked_by?per_page=100`], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });
  if (result.exitCode !== 0) {
    throw new Error(`gh api blocked_by #${String(number)} failed: ${result.stderr.toString().trim().split('\n')[0] ?? ''}`);
  }
  const list = JSON.parse(result.stdout.toString()) as { number: number; state: string }[];
  return list.map(issue => ({ number: issue.number, state: issue.state }));
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
