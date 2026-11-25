/**
 * The read server's side of the MCP subset; `../.shared/mcp-serve.ts` speaks the protocol
 * (`initialize`, `ping`, `tools/list`, `tools/call`, JSON-RPC errors) for it and for the
 * request server. Here: its name, its instructions, its tools, and how one call runs.
 *
 * A tool call runs under one deadline and one output cap. A refusal, a bad argument, a
 * failed read, a timeout or an output over the cap is a tool error (`isError`) with a
 * message; an unknown method or tool is a JSON-RPC error. Nothing a caller sends ends the
 * process.
 */

import { handleLine as handleRpcLine, type McpHandler, PROTOCOL_VERSIONS, toolError, withDeadline } from '../.shared/mcp-serve.ts';
import { type Fetcher, type HttpConfig, ReadError, Reader, type Spawner } from './sources.ts';
import { ANNOTATIONS, type Tool } from './tools.ts';

export { PROTOCOL_VERSIONS };
export const SERVER_INFO = { name: 'unify-sdlc-read', title: 'Pipeline state (read-only)', version: '1' } as const;
export const INSTRUCTIONS =
  "Read-only view of the pipeline state in Archon. Every tool names its project. Nothing here can change the pipeline: answers to gates are given in the engine's console, commands go elsewhere.";

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

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const bytes = (s: string) => Buffer.byteLength(s, 'utf8');

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

// --- the handler -------------------------------------------------------------------------

export function toolList(tools: readonly Tool[]) {
  return tools.map(t => ({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: { title: t.title, ...ANNOTATIONS } }));
}

export async function callTool(tools: readonly Tool[], settings: Settings, name: string, args: unknown) {
  const tool = tools.find(t => t.name === name);
  if (tool === undefined) return null;
  try {
    const input = tool.parse(args);
    const output = await withDeadline(
      settings.timeoutMs,
      signal => tool.run(input, new Reader(settings.spawn, settings.fetcher, settings.http, signal, { rawBytes: settings.rawBytes })),
      () => new ReadError(`timed out after ${settings.timeoutMs} ms; nothing was changed`)
    );
    const data = fitOutput(output.data, settings.maxBytes);
    const note = Array.isArray(data.truncated) ? ` Output cut to fit ${settings.maxBytes} bytes: see truncated.` : '';
    return { content: [{ type: 'text' as const, text: output.summary + note }, { type: 'text' as const, text: JSON.stringify(data) }], structuredContent: data, isError: false };
  } catch (e) {
    if (e instanceof ReadError) return toolError(e.message);
    return toolError(`internal error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** The read server as the shared protocol code serves it. */
export function readHandler(tools: readonly Tool[], settings: Settings): McpHandler {
  return { info: SERVER_INFO, instructions: INSTRUCTIONS, tools: () => toolList(tools), call: (name, args) => callTool(tools, settings, name, args) };
}

/** Handles one line from the client; returns the reply line, or null for a notification. */
export async function handleLine(tools: readonly Tool[], settings: Settings, line: string): Promise<string | null> {
  return handleRpcLine(readHandler(tools, settings), line);
}
