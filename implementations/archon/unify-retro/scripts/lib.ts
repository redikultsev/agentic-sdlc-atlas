/**
 * What the Retro's scripts share: the window, the week id that keys every write, the
 * engine's items over the window, and the host CLI.
 */

import { items, type ItemWindow } from 'archon:script';
import { archonCommand } from '../../.shared/host.ts';

export type EngineItem = ItemWindow['items'][number];

/** `2026-W47` for the ISO week holding the time. */
export function weekId(at: number): string {
  const date = new Date(at);
  const day = (date.getUTCDay() + 6) % 7;
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day + 3));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${String(thursday.getUTCFullYear())}-W${String(week).padStart(2, '0')}`;
}

/** Every item with a run in the window, all pages. */
export function engineItems(since: string): EngineItem[] {
  const found: EngineItem[] = [];
  let page = items({ since, limit: 100 });
  for (let pages = 0; pages < 50; pages++) {
    found.push(...page.items);
    if (page.next === null) break;
    page = items({ after: page.next });
  }
  return found;
}

/**
 * The surfaces Archon records for an answer given by a chat agent's tool: `attention_tool`
 * and `manage_run` (decision 65). The console records `api`, the CLI `cli`.
 */
export const CHAT_TOOL_SURFACES: ReadonlySet<string> = new Set(['attention_tool', 'manage_run']);

/** The attention and gate answers among `answers` that came through a chat tool. */
export function chatToolAnswers<A extends { kind: string; via: string | null }>(answers: readonly A[]): A[] {
  return answers.filter(a => (a.kind === 'attention' || a.kind === 'gate') && a.via !== null && CHAT_TOOL_SURFACES.has(a.via));
}

/** One host CLI command that prints JSON; null with the reason when it does not. */
export function hostJson(args: readonly string[]): { json: unknown; error: string | null } {
  const result = Bun.spawnSync([...archonCommand(), ...args], { env: process.env, stdout: 'pipe', stderr: 'pipe' });
  try {
    const json = JSON.parse(result.stdout.toString()) as unknown;
    return { json, error: result.exitCode === 0 ? null : `exit ${String(result.exitCode)}` };
  } catch {
    return { json: null, error: `exit ${String(result.exitCode)}: ${result.stderr.toString().trim().split('\n')[0] ?? ''}` };
  }
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
