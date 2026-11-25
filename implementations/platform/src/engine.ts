/**
 * The workflow runtime. A workflow is code in our repository: steps that are agent
 * sessions, scripts or gates, each with a `next` that code computes from the step's
 * output (decision 36). A run moves one step at a time and saves each step in one write,
 * so a restart resumes it where it stopped; a gate opens a decision request and the run
 * waits until the Operator answers on the card (decisions 11, 38, 68).
 */

import { randomUUID } from 'node:crypto';
import type { DecisionCard } from '../../archon/.shared/card.ts';
import { type Item, type Repo, type Run, type Store } from './store.ts';
import { projectSkillOf, type RoleSpec, type SessionRunner } from './runner.ts';

export const END = 'end';
/** A `next` that fails the run with a reason: a malformed or refused verdict is never a pass. */
export const fail = (reason: string): { fail: string } => ({ fail: reason });
type Next = string | { fail: string };

export interface StepContext {
  readonly item: Item;
  readonly run: Run;
  /** Outputs of the steps so far, by step id. */
  readonly data: Readonly<Record<string, unknown>>;
}

export interface AgentStep {
  readonly kind: 'agent';
  readonly id: string;
  readonly role: RoleSpec;
  readonly input: (ctx: StepContext) => string;
  /** Checks the verdict's shape; a list of problems fails the run. */
  readonly check?: (verdict: Record<string, unknown>) => string[];
  readonly next: (verdict: Record<string, unknown>, ctx: StepContext) => Next;
}

/** The same agent once per repository of the item (decision 10: one item, a PR in each). */
export interface EachRepoStep {
  readonly kind: 'each-repo';
  readonly id: string;
  readonly role: RoleSpec;
  readonly input: (ctx: StepContext, repo: Repo) => string;
  readonly next: (verdicts: Record<string, Record<string, unknown>>, ctx: StepContext) => Next;
}

export interface ScriptStep {
  readonly kind: 'script';
  readonly id: string;
  readonly run: (ctx: StepContext) => Promise<unknown> | unknown;
  readonly next: (output: unknown, ctx: StepContext) => Next;
}

export interface GateAnswer {
  readonly option: string;
  readonly text: string;
  readonly user: string;
}

export interface GateStep {
  readonly kind: 'gate';
  readonly id: string;
  readonly card: (ctx: StepContext) => DecisionCard;
  readonly next: (answer: GateAnswer, ctx: StepContext) => Next;
}

export type Step = AgentStep | EachRepoStep | ScriptStep | GateStep;

export interface Workflow {
  readonly name: string;
  readonly steps: readonly Step[];
}

export class AnswerRefused extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404 | 409) {
    super(message);
  }
}

export class Engine {
  private readonly workflows = new Map<string, Workflow>();
  private readonly busy = new Set<string>();

  constructor(private readonly store: Store, private readonly runner: SessionRunner, workflows: readonly Workflow[]) {
    for (const w of workflows) {
      const ids = new Set<string>();
      for (const s of w.steps) {
        if (ids.has(s.id) || s.id === END) throw new Error(`workflow ${w.name}: step id '${s.id}' is repeated or reserved`);
        ids.add(s.id);
      }
      this.workflows.set(w.name, w);
    }
  }

  /** Starts a workflow on an item; refused while the item has a live run of it. */
  async start(itemKey: string, workflow: string): Promise<Run> {
    const w = this.workflow(workflow);
    if (this.store.item(itemKey) === null) throw new Error(`no item ${itemKey}`);
    const run = this.store.createRun(randomUUID(), itemKey, w.name, w.steps[0].id);
    await this.advance(run.id);
    return this.store.run(run.id)!;
  }

  /** After a restart: every run that was moving moves on; waiting runs keep waiting. */
  async resume(): Promise<number> {
    const moving = this.store.runs('running');
    for (const run of moving) await this.advance(run.id);
    return moving.length;
  }

  /**
   * The Operator's answer on a card. Checked before anything is written: the request is
   * open, the person is an Operator, the option is one the card offered, "other" carries
   * words. One answer per request; the run then moves on.
   */
  async answer(requestId: string, token: string, option: string, text: string): Promise<Run> {
    const user = this.store.user(token);
    if (user === null) throw new AnswerRefused('unknown user', 403);
    if (user.role !== 'operator') throw new AnswerRefused(`${user.name} is not an Operator: only an Operator answers a gate`, 403);
    const runId = this.store.tx(() => {
      const request = this.store.request(requestId);
      if (request === null) throw new AnswerRefused(`no request ${requestId}`, 404);
      if (request.status !== 'open') throw new AnswerRefused('this request was already answered', 409);
      const words = text.trim();
      if (option === 'other' ? words === '' : !request.card.options.some(o => o.id === option)) {
        throw new AnswerRefused(option === 'other' ? '"other" needs your words' : `'${option}' is not an option of this card`, 400);
      }
      const run = this.store.run(request.runId)!;
      if (run.status !== 'waiting' || run.step !== request.step) throw new AnswerRefused('the run is no longer waiting on this card', 409);
      const at = new Date().toISOString();
      this.store.recordAnswer({ requestId, option, text: words, user: user.name, role: user.role, at });
      const gate = this.step(this.workflow(run.workflow), run.step) as GateStep;
      const answer: GateAnswer = { option, text: words, user: user.name };
      this.store.saveStep(run.id, gate.id, answer, this.target(gate.next(answer, this.ctx(run))));
      return run.id;
    });
    await this.advance(runId);
    return this.store.run(runId)!;
  }

  private async advance(runId: string): Promise<void> {
    if (this.busy.has(runId)) return;
    this.busy.add(runId);
    try {
      for (;;) {
        const run = this.store.run(runId)!;
        if (run.status !== 'running') return;
        if (run.step === END) {
          this.store.setStatus(runId, 'done');
          return;
        }
        const step = this.step(this.workflow(run.workflow), run.step);
        const ctx = this.ctx(run);
        try {
          await this.execute(step, ctx);
        } catch (error) {
          this.store.setStatus(runId, 'failed', `${step.id}: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }
      }
    } finally {
      this.busy.delete(runId);
    }
  }

  private async execute(step: Step, ctx: StepContext): Promise<void> {
    const { run, item } = ctx;
    if (step.kind === 'gate') {
      const card = step.card(ctx);
      this.store.tx(() => {
        this.store.openRequest(randomUUID(), run.id, step.id, card);
        this.store.setStatus(run.id, 'waiting');
      });
      return;
    }
    if (step.kind === 'script') {
      const output = await step.run(ctx);
      this.store.saveStep(run.id, step.id, output, this.target(step.next(output, ctx)));
      return;
    }
    if (step.kind === 'agent') {
      const repo = item.repos[0];
      if (repo === undefined) throw new Error(`${item.key} names no repository`);
      const result = await this.runner.run({ role: step.role, input: step.input(ctx), cwd: repo.path, projectSkill: projectSkillOf(repo.path, step.role.name) });
      const problems = step.check?.(result.verdict) ?? [];
      if (problems.length > 0) throw new Error(`the ${step.role.name} verdict was refused: ${problems.join('; ')}`);
      const output = { verdict: result.verdict, model: result.model, costUsd: result.costUsd };
      this.store.saveStep(run.id, step.id, output, this.target(step.next(result.verdict, ctx)));
      return;
    }
    const verdicts: Record<string, Record<string, unknown>> = {};
    const meta: Record<string, { model: string | null; costUsd: number | null }> = {};
    for (const repo of item.repos) {
      const result = await this.runner.run({ role: step.role, input: step.input(ctx, repo), cwd: repo.path, projectSkill: projectSkillOf(repo.path, step.role.name) });
      verdicts[repo.name] = result.verdict;
      meta[repo.name] = { model: result.model, costUsd: result.costUsd };
    }
    this.store.saveStep(run.id, step.id, { verdicts, meta }, this.target(step.next(verdicts, ctx)));
  }

  private target(next: Next): { step: string; status: 'running' | 'failed'; reason?: string } {
    return typeof next === 'string' ? { step: next, status: 'running' } : { step: END, status: 'failed', reason: next.fail };
  }

  private ctx(run: Run): StepContext {
    return { item: this.store.item(run.itemKey)!, run, data: run.data };
  }

  private workflow(name: string): Workflow {
    const w = this.workflows.get(name);
    if (w === undefined) throw new Error(`no workflow ${name}`);
    return w;
  }

  private step(w: Workflow, id: string): Step {
    const s = w.steps.find(x => x.id === id);
    if (s === undefined) throw new Error(`workflow ${w.name} has no step ${id}`);
    return s;
  }
}
