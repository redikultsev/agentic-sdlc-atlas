/**
 * The request server's one seam to the code host: GitHub's REST API, with the token from
 * the environment (decision 66). The server builds every path from an allowlisted project
 * and a number; this seam adds the host, the headers and the token, follows no redirect,
 * caps the body it reads, and never puts the token in a message.
 */

export interface HttpResponse {
  readonly status: number;
  /** The body parsed as JSON; null when empty or not JSON. */
  readonly body: unknown;
}

export interface HttpRequest {
  readonly method: 'GET' | 'POST';
  /** A path under the API root with its query, built by the server: `/repos/o/r/issues?...`. */
  readonly path: string;
  readonly body?: unknown;
  readonly signal: AbortSignal;
}

export type Http = (request: HttpRequest) => Promise<HttpResponse>;

/** Bytes of one response body the server reads at most. */
const MAX_BODY = 4 * 1024 * 1024;

/** Token shapes the code host issues, cut from any text that leaves the server. */
const TOKEN_SHAPES = [/github_pat_[A-Za-z0-9_]{20,}/gu, /gh[opsur]_[A-Za-z0-9]{20,}/gu];

/** `text` with the token, and anything shaped like one, replaced by `[token]`. */
export function redact(text: string, token: string | null): string {
  let out = token !== null && token.length >= 8 ? text.split(token).join('[token]') : text;
  for (const shape of TOKEN_SHAPES) out = out.replace(shape, '[token]');
  return out;
}

/**
 * The API root: https, or http on the loopback address only (a local test double). No query,
 * no fragment, no credentials in the URL. GitHub Enterprise Server: `https://<host>/api/v3`.
 */
export function apiRoot(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('REQUEST_GITHUB_API must be a URL such as https://api.github.com');
  }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new Error('REQUEST_GITHUB_API must use https (http only on the loopback address)');
  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') throw new Error('REQUEST_GITHUB_API takes no credentials, query or fragment');
  return url.toString().replace(/\/+$/u, '');
}

export function githubHttp(root: string, token: string): Http {
  return async ({ method, path, body, signal }) => {
    if (!path.startsWith('/') || path.includes('..') || path.includes('//')) throw new Error(`refused path ${path}`);
    const response = await fetch(`${root}${path}`, {
      method,
      redirect: 'error',
      signal,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'unify-sdlc-request-server',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_BODY) throw new Error(`the code host's answer is over ${MAX_BODY} bytes`);
    let parsed: unknown = null;
    try {
      parsed = text === '' ? null : JSON.parse(text);
    } catch {
      parsed = null;
    }
    return { status: response.status, body: parsed };
  };
}
