/**
 * The MCP subset the read server speaks: `initialize`, `notifications/initialized`,
 * `ping`, `tools/list`, `tools/call`, and JSON-RPC errors. No SDK: the subset is small,
 * and the pack's own client (`.shared/mcp.ts`) is the other side of the same protocol.
 *
 * A tool call runs under one deadline and one output cap. A refusal, a bad argument, a
 * failed read, a timeout or an output over the cap is a tool error (`isError`) with a
 * message; an unknown method or tool is a JSON-RPC error. Nothing a caller sends ends the
 * process.
 */

import { type Fetcher, type HttpConfig, ReadError, Reader, type Spawner } from './sources.ts';
import { ANNOTATIONS, type Tool } from './tools.ts';

export const SERVER_INFO = { name: 'unify-sdlc-read', title: 'Pipeline state (read-only)', version: '1' } as const;
/** Newest first; an unknown version asked for gets the newest. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;

export interface Settings {
  readonly spawn: Spawner;
  readonly fetcher: Fetcher;
  readonly http: HttpConfig;
  /** Deadline of one tool call, all its reads together. */
  readonly timeoutMs: number;
  /** Bytes of a tool's JSON output; past it the longest lists are cut, then the call fails. */
  readonly maxBytes: number;
  /** Bytes one command's stdout or one HTTP body may have. */
  readonly rawBytes: number;
}

type Id = string | number | null;
type Message = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const bytes = (s: string) => Buffer.byteLength(s, 'utf8');

function reply(id: Id, result: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function error(id: Id, code: number, message: string): string {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

function toolError(message: string) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

// --- the output cap ----------------------------------------------------------------------

type Path = (string | number)[];

/** The largest list (by serialized size) anywhere in `value`, or a long string when no list can shrink. */
function largest(value: unknown, path: Path, best: { size: number; path: Path; kind: 'array' | 'string' } | null): { size: number; best: typeof best } {
  if (Array.isArray(value)) {
    let size = 2;
    value.forEach((v, i) => {
      const inner = largest(v, [...path, i], best);
      best = inner.best;
      size += inner.size + 1;
    });
    if (value.length > 1 && (best === null || best.kind === 'string' || size > best.size)) best = { size, path, kind: 'array' };
    return { size, best };
  }
  if (isObject(value)) {
    let size = 2;
    for (const [k, v] of Object.entries(value)) {
      const inner = largest(v, [...path, k], best);
      best = inner.best;
      size += inner.size + bytes(JSON.stringify(k)) + 2;
    }
    return { size, best };
  }
  const size = bytes(JSON.stringify(value) ?? 'null');
  if (typeof value === 'string' && value.length > 400 && (best === null || (best.kind === 'string' && size > best.size))) best = { size, path, kind: 'string' };
  return { size, best };
}

/** Shrinks `data` under `maxBytes` by halving its largest lists (then cutting long strings); says what it cut. */
export function fitOutput(data: Record<string, unknown>, maxBytes: number): Record<string, unknown> {
  let value = structuredClone(data) as Record<string, unknown>;
  const cut = new Map<string, { of: number; kept: number }>();
  for (let round = 0; round < 64; round++) {
    const withNote = cut.size === 0 ? value : { ...value, truncated: [...cut].map(([path, c]) => ({ path, ...c })) };
    if (bytes(JSON.stringify(withNote)) <= maxBytes) return withNote;
    const { best } = largest(value, [], null);
    if (best === null || best.path.length === 0) break;
    let parent: unknown = value;
    for (const step of best.path.slice(0, -1)) parent = (parent as Record<string | number, unknown>)[step];
    const last = best.path[best.path.length - 1] as string | number;
    const target = (parent as Record<string | number, unknown>)[last];
    const name = best.path.join('.');
    if (Array.isArray(target)) {
      const kept = Math.ceil(target.length / 2);
      cut.set(name, { of: cut.get(name)?.of ?? target.length, kept });
      (parent as Record<string | number, unknown>)[last] = target.slice(0, kept);
    } else if (typeof target === 'string') {
      const kept = Math.floor(target.length / 2);
      cut.set(name, { of: cut.get(name)?.of ?? target.length, kept });
      (parent as Record<string | number, unknown>)[last] = `${target.slice(0, kept)} [cut]`;
    } else break;
  }
  throw new ReadError(`the output stays over ${maxBytes} bytes after cutting its lists; ask for less (a smaller limit)`);
}

// --- the deadline ------------------------------------------------------------------------

async function withDeadline<T>(ms: number, body: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ReadError(`timed out after ${ms} ms; nothing was changed`));
    }, ms);
  });
  try {
    return await Promise.race([body(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

// --- the handler -------------------------------------------------------------------------

export function toolList(tools: readonly Tool[]) {
  return tools.map(t => ({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: { title: t.title, ...ANNOTATIONS } }));
}

export async function callTool(tools: readonly Tool[], settings: Settings, name: string, args: unknown) {
  const tool = tools.find(t => t.name === name);
  if (tool === undefined) return null;
  try {
    const input = tool.parse(args);
    const output = await withDeadline(settings.timeoutMs, signal => tool.run(input, new Reader(settings.spawn, settings.fetcher, settings.http, signal, { rawBytes: settings.rawBytes })));
    const data = fitOutput(output.data, settings.maxBytes);
    const note = Array.isArray(data.truncated) ? ` Output cut to fit ${settings.maxBytes} bytes: see truncated.` : '';
    return { content: [{ type: 'text', text: output.summary + note }, { type: 'text', text: JSON.stringify(data) }], structuredContent: data, isError: false };
  } catch (e) {
    if (e instanceof ReadError) return toolError(e.message);
    return toolError(`internal error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Handles one line from the client; returns the reply line, or null for a notification. */
export async function handleLine(tools: readonly Tool[], settings: Settings, line: string): Promise<string | null> {
  let message: unknown;
  try {
    message = JSON.parse(line);
  } catch {
    return error(null, -32700, 'parse error');
  }
  if (!isObject(message)) return error(null, -32600, 'invalid request: one JSON-RPC object per line (no batches)');
  const m = message as Message;
  const hasId = 'id' in m && (typeof m.id === 'string' || typeof m.id === 'number');
  const id: Id = hasId ? (m.id as string | number) : null;
  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
    // A reply from the client (we send no requests) or a malformed message.
    return 'result' in m || 'error' in m ? null : error(id, -32600, 'invalid request');
  }
  if (!hasId) return null; // notifications: notifications/initialized, cancelled, anything else
  const params = isObject(m.params) ? m.params : {};
  switch (m.method) {
    case 'initialize': {
      const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
      const version = (PROTOCOL_VERSIONS as readonly string[]).includes(asked) ? asked : PROTOCOL_VERSIONS[0];
      return reply(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'Read-only view of the pipeline state in Archon. Every tool names its project. Nothing here can change the pipeline: answers to gates are given in the engine\'s console, commands go elsewhere.',
      });
    }
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: toolList(tools) });
    case 'tools/call': {
      if (typeof params.name !== 'string') return error(id, -32602, 'tools/call needs a tool name');
      const result = await callTool(tools, settings, params.name, params.arguments);
      return result === null ? error(id, -32602, `unknown tool: ${params.name}`) : reply(id, result);
    }
    default:
      return error(id, -32601, `method not found: ${m.method}`);
  }
}
