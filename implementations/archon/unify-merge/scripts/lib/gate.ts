/**
 * Facts the merge gate and land read: the item's PR at its head, the fingerprint of its
 * diff, which recorded verdicts are current for it (decision 33), and the revert rate the
 * R0 kill switch reads (decision 25), through the host's `gh`.
 */

import { forge } from '../../../.shared/forge.ts';
import { fingerprint } from '../../../.shared/fingerprint.ts';
import { currentVerdicts } from '../../../.shared/work.ts';
import type { Repo } from '../../../.shared/repo.ts';
import type { ItemDoc } from './item.ts';
import { fetchBranch } from './facts.ts';

export interface PrAt {
  readonly number: number;
  readonly head: string;
  readonly branch: string;
  readonly draft: boolean;
  readonly state: string;
}

export function prAt(repo: Repo, number: number): PrAt {
  const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number } } });
  if (view === null) throw new Error(`PR #${number} does not exist`);
  return { number, head: view.pr.head_revision ?? '', branch: view.pr.head, draft: view.pr.is_draft, state: view.pr.state };
}

/** The diff fingerprint of a head against the latest base on origin. */
export function printAt(base: string, branch: string, head: string): string {
  fetchBranch(base);
  const fetched = fetchBranch(branch);
  if (fetched !== head) throw new Error(`origin has ${fetched ?? 'no'} ${branch}, the PR reports ${head}`);
  return fingerprint(`origin/${base}`, head);
}

/** Verdict kinds a merge needs at the current fingerprint; the ones missing are stale. */
export function staleKinds(doc: ItemDoc, print: string, needOperator: boolean): string[] {
  const current = currentVerdicts(doc, print);
  const has = (kind: string, ok: (v: string) => boolean): boolean => current.some(v => v.kind === kind && ok(v.verdict));
  const stale: string[] = [];
  if (!has('ci', v => v === 'green' || v === 'none')) stale.push('ci');
  if (!has('review', v => v === 'pass')) stale.push('review');
  if (doc.verdicts.some(v => v.kind === 'validator') && !has('validator', v => v === 'pass')) stale.push('validator');
  if (needOperator && !has('operator', v => v === 'merge')) stale.push('operator');
  return stale;
}

function ghCount(query: string): number {
  const result = Bun.spawnSync(['gh', 'api', `search/issues?q=${encodeURIComponent(query)}&per_page=1`], { stdout: 'pipe', stderr: 'pipe', env: process.env });
  if (result.exitCode !== 0) throw new Error(`gh api search failed: ${result.stderr.toString().trim().split('\n')[0] ?? ''}`);
  return (JSON.parse(result.stdout.toString()) as { total_count: number }).total_count;
}

/** Merged PRs reverted over the window, as a share of merged PRs (titles starting "Revert"). */
export function revertRate(repo: Repo, days: number): { rate: number; reverts: number; merged: number } {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const merged = ghCount(`repo:${repo.path} is:pr is:merged merged:>=${since}`);
  const reverts = ghCount(`repo:${repo.path} is:pr is:merged merged:>=${since} Revert in:title`);
  return { rate: merged === 0 ? 0 : reverts / merged, reverts, merged };
}

/** Whether now falls inside the working hours of the rules file. */
export function inHours(hours: { from: number; to: number; tz: string } | null, now = new Date()): boolean {
  if (hours === null) return true;
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: hours.tz }).format(now));
  return hours.from <= hours.to ? hour >= hours.from && hour < hours.to : hour >= hours.from || hour < hours.to;
}
