/**
 * The server side of the MCP subset the pack's own servers speak (the read server,
 * decision 63; the request server, decision 66): `initialize`, `notifications/initialized`,
 * `ping`, `tools/list`, `tools/call`, and JSON-RPC errors, one JSON object per line over
 * stdio. No SDK: the subset is small, and `mcp.ts` is the other side of the same protocol.
 *
 * A server supplies its name, its instructions, its tool list and a call function; a tool
 * that fails returns a tool error (`isError`) with a message, an unknown tool is a JSON-RPC
 * error, and nothing a caller sends ends the process. No `archon:script`: the servers run
 * outside Archon's runs.
 */

/** Newest first; an unknown version asked for gets the newest. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;

export interface ToolResult {
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
  readonly structuredContent?: Record<string, unknown>;
  readonly isError: boolean;
}

export interface McpHandler {
  readonly info: { readonly name: string; readonly title: string; readonly version: string };
  readonly instructions: string;
  tools(): readonly unknown[];
  /** The tool's result, or null when no tool has that name. */
  call(name: string, args: unknown): Promise<ToolResult | null>;
}

type Id = string | number | null;
type Message = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function reply(id: Id, result: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function error(id: Id, code: number, message: string): string {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

export function toolError(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Runs `body` under a deadline; on timeout aborts its signal and rejects with `onTimeout()`. */
export async function withDeadline<T>(ms: number, body: (signal: AbortSignal) => Promise<T>, onTimeout: () => Error): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(onTimeout());
    }, ms);
  });
  try {
    return await Promise.race([body(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Handles one line from the client; returns the reply line, or null for a notification. */
export async function handleLine(handler: McpHandler, line: string): Promise<string | null> {
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
        serverInfo: handler.info,
        instructions: handler.instructions,
      });
    }
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: handler.tools() });
    case 'tools/call': {
      if (typeof params.name !== 'string') return error(id, -32602, 'tools/call needs a tool name');
      const result = await handler.call(params.name, params.arguments);
      return result === null ? error(id, -32602, `unknown tool: ${params.name}`) : reply(id, result);
    }
    default:
      return error(id, -32601, `method not found: ${m.method}`);
  }
}

/**
 * Serves `handler` over this process's stdio: stdout carries JSON-RPC alone, diagnostics go
 * to stderr under `label`. Calls run concurrently; when the client closes stdin, the calls in
 * flight are answered and the process leaves.
 */
export function serveStdio(handler: McpHandler, label: string): void {
  process.on('uncaughtException', e => process.stderr.write(`${label}: uncaught: ${e instanceof Error ? e.message : String(e)}\n`));
  process.on('unhandledRejection', e => process.stderr.write(`${label}: unhandled: ${e instanceof Error ? e.message : String(e)}\n`));
  const write = (line: string) => process.stdout.write(`${line}\n`);
  let buffer = '';
  const pending = new Set<Promise<void>>();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line === '') continue;
      const done: Promise<void> = handleLine(handler, line)
        .then(out => {
          if (out !== null) write(out);
        })
        .catch(e => {
          process.stderr.write(`${label}: ${e instanceof Error ? e.message : String(e)}\n`);
        })
        .finally(() => pending.delete(done));
      pending.add(done);
    }
    if (buffer.length > 4 * 1024 * 1024) {
      buffer = '';
      write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'request line over 4 MiB' } }));
    }
  });
  // The client closed stdin: answer what is in flight, then leave.
  process.stdin.on('end', () => {
    void Promise.allSettled([...pending]).then(() => process.exit(0));
  });
}
