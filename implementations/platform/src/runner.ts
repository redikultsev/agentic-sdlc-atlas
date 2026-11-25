/**
 * Agent sessions. A role is a prompt, the skills it works by, a model and its limits
 * (decisions 29, 67); a runner starts one session for a role and returns its JSON verdict.
 * Code reads the verdict, never the prose (decision 36): a session without a JSON object
 * fails, it is never a pass.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface RoleSpec {
  readonly name: string;
  /** The role's own prompt; `{input}` is replaced by the step's input. */
  readonly prompt: string;
  /** Pack skills (`implementations/archon/skills/<name>/SKILL.md`) the role reads first. */
  readonly skills: readonly string[];
  readonly model: string;
  readonly timeoutMs: number;
  readonly budgetUsd: number;
}

export interface SessionRequest {
  readonly role: RoleSpec;
  readonly input: string;
  /** Where the agent works: a repository checkout. */
  readonly cwd: string;
  /** The project's own skill for the role, read from its repository, if any. */
  readonly projectSkill: string | null;
}

export interface SessionResult {
  readonly verdict: Record<string, unknown>;
  readonly model: string | null;
  readonly costUsd: number | null;
}

export interface SessionRunner {
  run(request: SessionRequest): Promise<SessionResult>;
}

const SKILLS_DIR = join(import.meta.dir, '..', '..', 'archon', 'skills');

const stripFrontMatter = (text: string): string => text.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();

/** The skills text a role starts with: the pack's in order, then the project's. A missing pack skill is an error. */
export function skillsText(role: RoleSpec, projectSkill: string | null, dir = SKILLS_DIR): string {
  const parts = role.skills.map(name => {
    const file = join(dir, name, 'SKILL.md');
    if (!existsSync(file)) throw new Error(`role ${role.name} reads skill ${name}, which the pack does not have`);
    return `### ${name}\n\n${stripFrontMatter(readFileSync(file, 'utf8'))}`;
  });
  if (projectSkill?.trim()) parts.push(`### This project's skill for ${role.name}\n\n${stripFrontMatter(projectSkill)}`);
  return parts.join('\n\n');
}

/** The project's skill for a role: `.pipeline/skills/<role>.md` in the checkout, or null. */
export function projectSkillOf(cwd: string, role: string): string | null {
  const file = join(cwd, '.pipeline', 'skills', `${role}.md`);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

export function availableSkills(dir = SKILLS_DIR): string[] {
  return existsSync(dir) ? readdirSync(dir).filter(n => existsSync(join(dir, n, 'SKILL.md'))) : [];
}

/** The last JSON object in a session's final text: a fenced block, or the last balanced `{…}`. */
export function verdictOf(text: string): Record<string, unknown> | null {
  const fenced = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map(m => m[1]);
  const candidates = fenced.length > 0 ? fenced.reverse() : [];
  if (candidates.length === 0) {
    const end = text.lastIndexOf('}');
    for (let start = text.lastIndexOf('{', end); start >= 0; start = text.lastIndexOf('{', start - 1)) {
      candidates.push(text.slice(start, end + 1));
      if (candidates.length > 50) break;
    }
  }
  for (const c of candidates) {
    try {
      const value = JSON.parse(c);
      if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch {
      // not this one
    }
  }
  return null;
}

/**
 * Claude Code headless (`claude -p … --output-format json`): the role's prompt as the task,
 * its skills appended to the system prompt, its model, the time limit enforced by killing
 * the process, and the budget passed as Claude Code's own cap.
 */
export class ClaudeCliRunner implements SessionRunner {
  constructor(private readonly bin = 'claude') {}

  async run(request: SessionRequest): Promise<SessionResult> {
    const { role } = request;
    const prompt = role.prompt.replace('{input}', request.input);
    const system = `You are the ${role.name} of a software delivery pipeline. Work by these skills.\n\n${skillsText(role, request.projectSkill)}\n\nEnd your answer with one JSON object, the verdict, in a \`\`\`json block.`;
    const proc = Bun.spawn(
      [this.bin, '-p', prompt, '--output-format', 'json', '--model', role.model, '--append-system-prompt', system, '--max-budget-usd', String(role.budgetUsd)],
      { cwd: request.cwd, stdout: 'pipe', stderr: 'pipe' }
    );
    const timer = setTimeout(() => proc.kill(), role.timeoutMs);
    const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    clearTimeout(timer);
    if (proc.signalCode) throw new Error(`${role.name} session stopped at its time limit (${role.timeoutMs} ms)`);
    if (code !== 0) throw new Error(`${role.name} session exited ${code}: ${err.slice(0, 500)}`);
    const envelope = JSON.parse(out) as { result?: string; total_cost_usd?: number; modelUsage?: Record<string, unknown>; is_error?: boolean };
    if (envelope.is_error) throw new Error(`${role.name} session ended in error: ${String(envelope.result).slice(0, 500)}`);
    const verdict = verdictOf(envelope.result ?? '');
    if (verdict === null) throw new Error(`${role.name} session returned no JSON verdict`);
    return {
      verdict,
      model: envelope.modelUsage ? Object.keys(envelope.modelUsage)[0] ?? null : null,
      // A session whose cost is not reported is counted as over the limit, never as free (decision 29).
      costUsd: typeof envelope.total_cost_usd === 'number' ? envelope.total_cost_usd : null,
    };
  }
}

/** Scripted verdicts per role, for tests and dry runs (decision 41). */
export class StubRunner implements SessionRunner {
  readonly calls: SessionRequest[] = [];
  constructor(private readonly verdicts: Record<string, (request: SessionRequest) => Record<string, unknown> | Error>) {}

  async run(request: SessionRequest): Promise<SessionResult> {
    this.calls.push(request);
    const make = this.verdicts[request.role.name];
    if (make === undefined) throw new Error(`no stub verdict for ${request.role.name}`);
    const verdict = make(request);
    if (verdict instanceof Error) throw verdict;
    return { verdict, model: 'stub', costUsd: 0 };
  }
}
