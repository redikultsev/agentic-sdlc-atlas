/**
 * Each agent's skills (decision 67): the rules an agent of one role works by, given to it
 * at the start of every session, whatever model runs it.
 *
 * - Pack skills (`skills/unify-*\/SKILL.md` in this pack): how a role works, the same in
 *   every project. `ROLE_SKILLS` says which role gets which.
 * - The project's skill for a role (`.pipeline/skills/<role>.md`): what that role needs to
 *   know about one code base. Read from the base branch like the rest of `.pipeline/`, so a
 *   PR cannot change the rules its own reviewer works by; it never merges as R0.
 *
 * A script node renders both into one text (`skills` in each workflow's scripts) and the
 * agent's command shows it under "Your skills". Archon's own `skills:` field is not used:
 * the Codex provider refuses it, and the AI reviewer runs on Codex by default (decision 22).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromBase } from './policy.ts';

/** Every agent role and the pack skills it gets, in the order it reads them. */
export const ROLE_SKILLS: Readonly<Record<string, readonly string[]>> = {
  triage: ['unify-root-cause', 'unify-reproduce'],
  group: ['unify-root-cause'],
  questions: [],
  interviewer: [],
  researcher: ['unify-root-cause'],
  planner: ['unify-root-cause'],
  implementer: ['unify-root-cause', 'unify-reproduce'],
  review: ['unify-root-cause'],
  validator: ['unify-reproduce'],
  watcher: [],
  scout: ['unify-reproduce'],
  retro: ['unify-lessons'],
  setup: [],
};

/** Which role's project skill a command reads: the group pass is Triage, both spec prompts are the Interviewer's. */
export const PROJECT_ROLE: Readonly<Record<string, string>> = { group: 'triage', questions: 'interviewer' };

/** The pack's own folder: `.shared/` sits in it. */
export const PACK_ROOT = join(import.meta.dir, '..');

/** The pack's skills by name. */
export function packSkills(root: string = PACK_ROOT): Map<string, string> {
  const dir = join(root, 'skills');
  const skills = new Map<string, string>();
  if (!existsSync(dir)) return skills;
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name, 'SKILL.md');
    if (existsSync(file)) skills.set(name, readFileSync(file, 'utf8'));
  }
  return skills;
}

/** A skill's text without its front matter. */
export function body(text: string): string {
  return text.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
}

export interface RenderedSkills {
  readonly text: string;
  readonly pack: readonly string[];
  /** The project file read, or null when the project keeps none for this role. */
  readonly project: string | null;
}

/**
 * The skills of `role` as one text. A pack skill the role names but the pack lacks is an
 * error: the pack is broken, and a session without its rules must not start.
 */
export function renderSkills(role: string, base: string, root: string = PACK_ROOT): RenderedSkills {
  const names = ROLE_SKILLS[role];
  if (names === undefined) throw new Error(`no agent role '${role}'`);
  const pack = packSkills(root);
  const parts: string[] = [];
  for (const name of names) {
    const text = pack.get(name);
    if (text === undefined) throw new Error(`the pack has no skill ${name} (skills/${name}/SKILL.md), which the ${role} role reads`);
    parts.push(`### ${name} (the pipeline's, every project)\n\n${body(text)}`);
  }
  const projectRole = PROJECT_ROLE[role] ?? role;
  const path = `.pipeline/skills/${projectRole}.md`;
  const own = fromBase(base, path);
  if (own !== null && own.trim() !== '') parts.push(`### ${path} (this project's)\n\n${body(own)}`);
  return {
    text: parts.length === 0 ? 'None for this role.' : parts.join('\n\n'),
    pack: names,
    project: own !== null && own.trim() !== '' ? path : null,
  };
}

/** Roles whose project skill file is on the base, for the install report. */
export function projectSkills(base: string): string[] {
  const roles = [...new Set(Object.keys(ROLE_SKILLS).map(r => PROJECT_ROLE[r] ?? r))];
  return roles.filter(role => {
    const text = fromBase(base, `.pipeline/skills/${role}.md`);
    return text !== null && text.trim() !== '';
  });
}
