/**
 * Creates or updates the pipeline's automations (`automations.ts`) in a Kandev workspace
 * through the WebSocket actions the settings form uses (`automation.list`, `.create`,
 * `.update`); Kandev has no REST route for them. An automation that already exists (by name)
 * keeps its ids, its repositories and its on/off switch and gets the new prompt and
 * description. Arguments: workspace id, workflow id, its Triage step id, agent profile id,
 * executor profile id, then the repository ids new automations read (none: they read no
 * repository).
 *
 * `KANDEV_URL=http://127.0.0.1:38429 node implementations/kandev/create-automations.ts <ids…>`
 * (Node 24 or Bun).
 */

import { automations } from './automations.ts';

const base = (process.env.KANDEV_URL ?? 'http://127.0.0.1:38429').replace(/\/+$/, '');
const [workspace, workflow, step, profile, executor, ...repos] = process.argv.slice(2);
if (!executor) throw new Error('usage: create-automations.ts <workspace> <workflow> <triage-step> <agent-profile> <executor-profile> [repository…]');

type Message = { id?: string; type: string; payload: unknown };
const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws`, { headers: { Origin: base } } as unknown as string[]);
const pending = new Map<string, (message: Message) => void>();
ws.onmessage = event => {
  const message = JSON.parse(String(event.data)) as Message;
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)!(message);
    pending.delete(message.id);
  }
};
await new Promise(resolve => (ws.onopen = resolve));

const request = (action: string, payload: unknown) =>
  new Promise<Message>(resolve => {
    const id = crypto.randomUUID();
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, type: 'request', action, payload }));
  });

const listed = await request('automation.list', { workspace_id: workspace });
const existing = new Map((Array.isArray(listed.payload) ? (listed.payload as Record<string, unknown>[]) : []).map(a => [String(a.name), a]));

for (const a of automations as Record<string, unknown>[]) {
  const old = existing.get(String(a.name));
  const result = old
    ? await request('automation.update', {
        // Kandev lists unset fields as null and refuses them on update.
        ...Object.fromEntries(Object.entries(old).filter(([, value]) => value !== null)),
        description: a.description,
        prompt: a.prompt,
        task_title_template: a.task_title_template,
      })
    : await request('automation.create', {
        workspace_id: workspace,
        workflow_id: workflow,
        workflow_step_id: step,
        agent_profile_id: profile,
        executor_profile_id: executor,
        repository_mode: repos.length > 0 ? 'selected' : 'none',
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
  const verb = old ? 'updated' : 'created';
  console.log(`${String(a.name)}: ${result.type === 'error' ? `refused, ${JSON.stringify(result.payload)}` : verb}`);
}
ws.close();
