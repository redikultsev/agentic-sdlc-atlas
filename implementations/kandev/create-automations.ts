/**
 * Creates the pipeline's automations (`automations.ts`) in a Kandev workspace through the
 * WebSocket action the settings form uses (`automation.create`); Kandev has no REST route
 * for it. Arguments: workspace id, workflow id, its Triage step id, agent profile id,
 * executor profile id, then the repository ids the automations read.
 *
 * `KANDEV_URL=http://127.0.0.1:38429 bun implementations/kandev/create-automations.ts <ids…>`
 */

import { automations } from './automations.ts';

const base = (process.env.KANDEV_URL ?? 'http://127.0.0.1:38429').replace(/\/+$/, '');
const [workspace, workflow, step, profile, executor, ...repos] = process.argv.slice(2);
if (!executor) throw new Error('usage: create-automations.ts <workspace> <workflow> <triage-step> <agent-profile> <executor-profile> <repository…>');

const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws`, { headers: { Origin: base } } as unknown as string[]);
const pending = new Map<string, (message: { type: string; payload: unknown }) => void>();
ws.onmessage = event => {
  const message = JSON.parse(String(event.data));
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)!(message);
    pending.delete(message.id);
  }
};
await new Promise(resolve => (ws.onopen = resolve));

const request = (action: string, payload: unknown) =>
  new Promise<{ type: string; payload: unknown }>(resolve => {
    const id = crypto.randomUUID();
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, type: 'request', action, payload }));
  });

for (const a of automations as Record<string, unknown>[]) {
  const result = await request('automation.create', {
    workspace_id: workspace,
    workflow_id: workflow,
    workflow_step_id: step,
    agent_profile_id: profile,
    executor_profile_id: executor,
    repository_mode: 'selected',
    repository_ids: repos,
    name: a.name,
    description: a.description,
    enabled: a.enabled,
    prompt: a.prompt,
    task_title_template: a.task_title_template,
    max_concurrent_runs: a.max_concurrent_runs,
    continuation_policy: a.continuation_policy,
    task_mode: a.task_mode,
    retry_policy: a.retry_policy,
    triggers: a.triggers,
  });
  console.log(`${String(a.name)}: ${result.type === 'error' ? `refused, ${JSON.stringify(result.payload)}` : 'created'}`);
}
ws.close();
