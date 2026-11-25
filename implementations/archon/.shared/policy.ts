/**
 * The project's policy, read from the base branch on the remote, never from the item's
 * branch: a PR cannot add itself to the trusted list or loosen its own merge rules.
 *
 * Files (owned by the Operator, changed only by an R2 PR):
 *   .pipeline/project.yaml    base branch, check command, toolchain, deploy hook, signals, limits
 *   .pipeline/trusted.json    trusted authors (decision 39)
 *   .pipeline/automerge.yaml  R0 rules: paths, change types, size, never-zones, hours (decision 25)
 */

import { existsSync, readFileSync } from 'node:fs';
import { git } from './git.ts';

export interface ProjectPolicy {
  readonly base: string;
  readonly check: { readonly command: string; readonly timeoutMinutes: number; readonly toolchain: readonly string[] };
  readonly deploy: { readonly hook: string | null; readonly windowMinutes: number; readonly signals: readonly string[] };
  readonly limits: { readonly sessionMinutes: number; readonly sessionUsd: number };
  readonly slices: { readonly maxParallel: number };
}

export interface AutomergeRules {
  readonly paths: readonly string[];
  readonly maxChangedLines: number;
  readonly neverZones: readonly string[];
  readonly hours: { readonly from: number; readonly to: number; readonly tz: string } | null;
  readonly killSwitch: { readonly revertRate: number; readonly days: number };
}

/** Paths a PR may never change on the R0 path, whatever the project's rules say. */
export const ALWAYS_NEVER = ['.pipeline/**', '.archon/**', '.github/workflows/**', 'AGENTS.md', 'CLAUDE.md'] as const;

/**
 * A file from the base branch on the remote, or null when the base has none.
 *
 * `PIPELINE_POLICY_DIR` in the engine's environment, when set, holds the `.pipeline/` files
 * instead: for a trial on a repository where the pipeline's settings are not on the base
 * yet. It is the Operator's folder on the engine's machine, so a PR still cannot change the
 * policy it is judged by.
 */
export function fromBase(base: string, path: string): string | null {
  const local = process.env.PIPELINE_POLICY_DIR;
  if (local && path.startsWith('.pipeline/') && !path.includes('..')) {
    const root = local.replace(/[\\/]+$/, '');
    // One folder per repository (`<dir>/<owner>/<name>/.pipeline/`) when the engine serves several.
    const origin = git('remote', 'get-url', 'origin').stdout.trim();
    const repo = /[/:]([^/:]+\/[^/]+?)(?:\.git)?$/.exec(origin)?.[1] ?? '';
    const own = repo !== '' && existsSync(`${root}/${repo}/.pipeline`) ? `${root}/${repo}` : root;
    const file = `${own}/${path}`;
    return existsSync(file) ? readFileSync(file, 'utf8') : null;
  }
  git('fetch', '--quiet', 'origin', base);
  const shown = git('show', `origin/${base}:${path}`);
  return shown.code === 0 ? shown.stdout : null;
}

function parse<T>(text: string | null, path: string): T | null {
  if (text === null) return null;
  try {
    return (path.endsWith('.json') ? JSON.parse(text) : Bun.YAML.parse(text)) as T;
  } catch (error) {
    throw new Error(`${path} on the base does not parse: ${(error as Error).message}`);
  }
}

const DEFAULT_PROJECT: ProjectPolicy = {
  base: 'main',
  check: { command: '', timeoutMinutes: 30, toolchain: [] },
  deploy: { hook: null, windowMinutes: 30, signals: [] },
  limits: { sessionMinutes: 60, sessionUsd: 10 },
  slices: { maxParallel: 1 },
};

export function projectPolicy(base: string): ProjectPolicy {
  const raw = parse<Partial<ProjectPolicy>>(fromBase(base, '.pipeline/project.yaml'), 'project.yaml');
  if (raw === null) return { ...DEFAULT_PROJECT, base };
  return {
    base: raw.base ?? base,
    check: { ...DEFAULT_PROJECT.check, ...raw.check },
    deploy: { ...DEFAULT_PROJECT.deploy, ...raw.deploy },
    limits: { ...DEFAULT_PROJECT.limits, ...raw.limits },
    slices: { ...DEFAULT_PROJECT.slices, ...raw.slices },
  };
}

export function trustedAuthors(base: string): readonly string[] {
  const list = parse<string[]>(fromBase(base, '.pipeline/trusted.json'), 'trusted.json');
  return Array.isArray(list) ? list.map(s => s.toLowerCase()) : [];
}

/** No rules file means nothing merges as R0: every PR goes to the Operator. */
export function automergeRules(base: string): AutomergeRules | null {
  return parse<AutomergeRules>(fromBase(base, '.pipeline/automerge.yaml'), 'automerge.yaml');
}

/** Minimal glob: `**` any path, `*` within one segment. */
export function globMatch(pattern: string, path: string): boolean {
  const re = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${re}$`).test(path);
}
