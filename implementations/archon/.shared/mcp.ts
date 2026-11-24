/**
 * A small MCP client for engine code (decision 46). `archon:script` has no MCP function,
 * and a pack has no node_modules, so the pack speaks the protocol itself: JSON-RPC over a
 * child process's stdio, or over streamable HTTP. No model takes part.
 *
 * A server is described the way MCP config files describe it (the same shape Archon's
 * agent nodes read), so one file can declare a project's servers for agents and for code:
 *   stdio: { command, args?, env? }      http: { type: 'http', url, headers? }
 * Values in `env` and `headers` may name an environment variable as `${NAME}`; it is read
 * from the script's own environment, so a token never sits in the project map.
 *
 * Every call returns a result or a typed failure and never throws: a failure is the
 * connector's to retry or report, never a fix round (decision 47).
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

export type McpServer =
  | { type?: 'stdio'; command: string; args?: readonly string[]; env?: Readonly<Record<string, string>> }
  | { type: 'http'; url: string; headers?: Readonly<Record<string, string>> };

export type McpFailure = {
  ok: false;
  /** transport: could not reach or start the server; protocol: a malformed or error reply; tool: the tool ran and said it failed; timeout: no reply in time. */
  kind: 'transport' | 'protocol' | 'tool' | 'timeout';
  message: string;
};

export type McpToolResult = {
  ok: true;
  /** The text parts of the result joined, for servers that return text only. */
  text: string;
  /** The tool's structured output when it declares one; else the text parsed as JSON when it is JSON; else undefined. */
  data: unknown;
  raw: unknown;
};

export type McpTool = { name: string; description?: string; inputSchema?: unknown };

export interface McpSession {
  readonly server: { name: string; version: string };
  tools(): Promise<{ ok: true; tools: McpTool[] } | McpFailure>;
  call(tool: string, args: Readonly<Record<string, unknown>>): Promise<McpToolResult | McpFailure>;
  close(): Promise<void>;
}

const PROTOCOL_VERSION = '2025-06-18';
const CLIENT = { name: 'unify-sdlc-connector', version: '1' };

/** Opens a session: starts or reaches the server and runs the initialize handshake. */
export async function connect(server: McpServer, options: { timeoutMs?: number } = {}): Promise<McpSession | McpFailure> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const channel = server.type === 'http' ? httpChannel(server, timeoutMs) : stdioChannel(server, timeoutMs);
  if ('ok' in channel) return channel;
  const init = await channel.request('initialize', {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: CLIENT,
  });
  if (!init.ok) {
    await channel.close();
    return init;
  }
  const info = (init.result as { serverInfo?: { name?: string; version?: string }; protocolVersion?: string }) ?? {};
  channel.negotiated(info.protocolVersion ?? PROTOCOL_VERSION);
  await channel.notify('notifications/initialized');
  return {
    server: { name: info.serverInfo?.name ?? '', version: info.serverInfo?.version ?? '' },
    async tools() {
      const all: McpTool[] = [];
      let cursor: string | undefined;
      do {
        const page = await channel.request('tools/list', cursor === undefined ? {} : { cursor });
        if (!page.ok) return page;
        const r = page.result as { tools?: McpTool[]; nextCursor?: string };
        all.push(...(r.tools ?? []));
        cursor = r.nextCursor;
      } while (cursor);
      return { ok: true, tools: all };
    },
    async call(tool, args) {
      const reply = await channel.request('tools/call', { name: tool, arguments: args });
      if (!reply.ok) return reply;
      const r = reply.result as { content?: { type: string; text?: string }[]; structuredContent?: unknown; isError?: boolean };
      const text = (r.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('\n');
      if (r.isError) return { ok: false, kind: 'tool', message: text || 'the tool reported an error' };
      return { ok: true, text, data: unwrap(r.structuredContent) ?? parseJson(text), raw: reply.result };
    },
    close: () => channel.close(),
  };
}

/** Opens a session, runs `body`, and always closes the session. */
export async function withSession<T>(
  server: McpServer,
  body: (session: McpSession) => Promise<T>,
  options: { timeoutMs?: number } = {}
): Promise<T | McpFailure> {
  const session = await connect(server, options);
  if ('ok' in session) return session;
  try {
    return await body(session);
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------------------

type Reply = { ok: true; result: unknown } | McpFailure;

interface Channel {
  request(method: string, params: unknown): Promise<Reply>;
  notify(method: string, params?: unknown): Promise<void>;
  negotiated(version: string): void;
  close(): Promise<void>;
}

/** `${NAME}` in a value reads NAME from the script's environment; a missing one is an empty string. */
export function expand(value: string, env: Readonly<Record<string, string | undefined>> = process.env): string {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name: string) => env[name] ?? '');
}

function expandAll(values: Readonly<Record<string, string>> | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(values ?? {}).map(([k, v]) => [k, expand(v)]));
}

function parseJson(text: string): unknown {
  const t = text.trim();
  if (!(t.startsWith('{') || t.startsWith('['))) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

/**
 * Servers built on FastMCP declare an output schema that only wraps a string,
 * `{ result: string }` (`x-fastmcp-wrap-result`), and put the real JSON inside it as text;
 * the Atlassian server does this for every tool. The data is that text, parsed.
 */
function unwrap(structured: unknown): unknown {
  if (structured === null || typeof structured !== 'object' || Array.isArray(structured)) return structured;
  const keys = Object.keys(structured);
  const result = (structured as { result?: unknown }).result;
  if (keys.length === 1 && typeof result === 'string') return parseJson(result) ?? result;
  return structured;
}

function rpcReply(message: { result?: unknown; error?: { code?: number; message?: string } }): Reply {
  if (message.error) return { ok: false, kind: 'protocol', message: `${message.error.code ?? ''} ${message.error.message ?? 'error'}`.trim() };
  return { ok: true, result: message.result };
}

function stdioChannel(server: Extract<McpServer, { command: string }>, timeoutMs: number): Channel | McpFailure {
  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn(server.command, [...(server.args ?? [])], {
      env: { ...process.env, ...expandAll(server.env) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    return { ok: false, kind: 'transport', message: `cannot start ${server.command}: ${String(err)}` };
  }
  let nextId = 1;
  let buffer = '';
  let stderr = '';
  let exited: string | undefined;
  const pending = new Map<number, (reply: Reply) => void>();
  const failAll = (failure: McpFailure) => {
    for (const resolve of pending.values()) resolve(failure);
    pending.clear();
  };
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let message: { id?: number; result?: unknown; error?: { code?: number; message?: string } };
      try {
        message = JSON.parse(line);
      } catch {
        continue; // a server's stray log line on stdout is not a reply
      }
      if (typeof message.id === 'number' && pending.has(message.id)) {
        const resolve = pending.get(message.id)!;
        pending.delete(message.id);
        resolve(rpcReply(message));
      }
    }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr = (stderr + chunk).slice(-2000);
  });
  child.on('error', err => {
    exited = String(err);
    failAll({ ok: false, kind: 'transport', message: `${server.command}: ${exited}` });
  });
  child.on('exit', code => {
    exited = `exited with ${code}`;
    failAll({ ok: false, kind: 'transport', message: `${server.command} ${exited}${stderr ? `: ${stderr.trim()}` : ''}` });
  });
  const send = (message: unknown) => {
    if (exited === undefined) child.stdin.write(JSON.stringify(message) + '\n');
  };
  return {
    request(method, params) {
      if (exited !== undefined) return Promise.resolve({ ok: false, kind: 'transport', message: `${server.command} ${exited}` });
      const id = nextId++;
      return new Promise<Reply>(resolve => {
        const timer = setTimeout(() => {
          pending.delete(id);
          resolve({ ok: false, kind: 'timeout', message: `${method}: no reply in ${timeoutMs} ms` });
        }, timeoutMs);
        pending.set(id, reply => {
          clearTimeout(timer);
          resolve(reply);
        });
        send({ jsonrpc: '2.0', id, method, params });
      });
    },
    async notify(method, params) {
      send({ jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) });
    },
    negotiated() {},
    async close() {
      if (exited !== undefined) return;
      child.stdin.end();
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          child.kill();
          resolve();
        }, 2_000);
        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    },
  };
}

function httpChannel(server: Extract<McpServer, { type: 'http' }>, timeoutMs: number): Channel {
  const headers = expandAll(server.headers);
  let session: string | undefined;
  let version: string | undefined;
  let nextId = 1;
  const post = async (body: unknown, expectReply: boolean): Promise<Reply> => {
    let res: Response;
    try {
      res = await fetch(server.url, {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...(session ? { 'mcp-session-id': session } : {}),
          ...(version ? { 'mcp-protocol-version': version } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'TimeoutError';
      return { ok: false, kind: timedOut ? 'timeout' : 'transport', message: `${server.url}: ${String(err)}` };
    }
    session = res.headers.get('mcp-session-id') ?? session;
    if (!res.ok) return { ok: false, kind: 'transport', message: `${server.url}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}` };
    if (!expectReply) return { ok: true, result: undefined };
    const text = await res.text();
    const type = res.headers.get('content-type') ?? '';
    const id = (body as { id: number }).id;
    const messages = type.includes('text/event-stream')
      ? text.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => parseJson(l.slice(5)))
      : [parseJson(text)];
    const reply = messages.find(m => (m as { id?: number } | undefined)?.id === id) as Parameters<typeof rpcReply>[0] | undefined;
    return reply ? rpcReply(reply) : { ok: false, kind: 'protocol', message: `${server.url}: no reply to request ${id}` };
  };
  return {
    request: (method, params) => post({ jsonrpc: '2.0', id: nextId++, method, params }, true),
    async notify(method, params) {
      await post({ jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) }, false);
    },
    negotiated(v) {
      version = v;
    },
    async close() {
      if (!session) return;
      try {
        await fetch(server.url, { method: 'DELETE', headers: { ...headers, 'mcp-session-id': session }, signal: AbortSignal.timeout(5_000) });
      } catch {
        // a server that cannot end the session lets it expire
      }
    },
  };
}
