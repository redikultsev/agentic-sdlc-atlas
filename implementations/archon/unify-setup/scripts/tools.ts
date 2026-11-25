/**
 * Read the project's MCP tools, read-only: connect to the server the Operator passed, list
 * its tools (name, description, input schema, each trimmed) and emit them as marked data
 * for the Setup agent: the descriptions come from the project's server, so they are data,
 * never instructions. A server that cannot be reached ends the run with a refusal: an
 * outage or a wrong server line, which the Operator fixes in the input.
 *
 * In `fix` mode the current map is read from the base (`.pipeline/tracker.yaml`) with the
 * Operator's `problem` text; a base without a map, or an empty problem, is a refusal.
 *
 * Inputs: server, mode, test_item, problem, base. Emits `{ server_name, count, shown,
 * catalog, mode, current, problem, test_item }`.
 */

import { emit, input } from 'archon:script';
import { MAP_PATH, script } from '../../.shared/connector.ts';
import { parseKey } from '../../.shared/item.ts';
import { withSession, type McpTool } from '../../.shared/mcp.ts';
import { fromBase } from '../../.shared/policy.ts';
import { untrusted } from '../../.shared/trust.ts';
import { parseServer } from './lib/server.ts';

const MAX_TOOLS = 200;
const MAX_DESCRIPTION = 1500;
const MAX_SCHEMA = 3000;
const MAX_CATALOG = 150_000;

const cut = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max)} [cut: ${text.length - max} more characters]`);

function entry(tool: McpTool): string {
  const name = /^[\w.:/-]{1,128}$/.test(tool.name) ? tool.name : '(a name with unusual characters, see inside)';
  const schema = tool.inputSchema === undefined ? '(none declared)' : cut(JSON.stringify(tool.inputSchema), MAX_SCHEMA);
  return [`### ${name}`, untrusted(`the project's MCP server, tool ${name}`, [`name: ${tool.name}`, `description: ${cut(tool.description ?? '', MAX_DESCRIPTION)}`, `input schema: ${schema}`].join('\n'))].join('\n');
}

async function main(): Promise<void> {
  const mode = input('mode').trim() || 'compose';
  if (mode !== 'compose' && mode !== 'fix') throw new Error(`mode must be compose or fix, not '${mode}'`);
  const testItem = parseKey(input('test_item'));
  if (testItem === null) throw new Error(`test_item '${input('test_item')}' is no item key (PROJ-123 or #12)`);
  const server = parseServer(input('server'));
  let current = '';
  let problem = '';
  if (mode === 'fix') {
    const base = input('base').trim() || 'main';
    const text = fromBase(base, MAP_PATH);
    if (text === null) throw new Error(`fix mode: ${base} has no ${MAP_PATH}; run in compose mode`);
    problem = input('problem').trim();
    if (problem === '') throw new Error('fix mode: problem is empty; pass the failure text the pipeline reported');
    current = text;
  }
  const listed = await withSession(server, async session => ({ name: session.server.name, result: await session.tools() }), { timeoutMs: 60_000 });
  if ('ok' in listed) throw new Error(`the MCP server could not be reached (${listed.kind}: ${listed.message}); check the server line and that the server is up, then run again`);
  if (!listed.result.ok) throw new Error(`the MCP server did not list its tools (${listed.result.kind}: ${listed.result.message})`);
  const tools = listed.result.tools;
  if (tools.length === 0) throw new Error('the MCP server lists no tools; the map has nothing to name');
  const parts: string[] = [];
  let size = 0;
  for (const tool of tools.slice(0, MAX_TOOLS)) {
    const text = entry(tool);
    if (size + text.length > MAX_CATALOG) break;
    parts.push(text);
    size += text.length;
  }
  const left = tools.length - parts.length;
  const catalog = [
    `The server "${listed.name || 'unnamed'}" lists ${tools.length} tool(s).${left > 0 ? ` ${left} were left out for size; the names left out: ${cut(tools.slice(parts.length).map(t => t.name).join(', '), 5000)}.` : ''}`,
    '',
    ...parts,
  ].join('\n');
  emit({ server_name: listed.name, count: tools.length, shown: parts.length, catalog, mode, current, problem, test_item: testItem });
}

await script('unify-setup tools', main);
