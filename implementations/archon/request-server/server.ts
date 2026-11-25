#!/usr/bin/env bun
/**
 * The request server over stdio (decision 66): one tool, `file_request`. Run with Bun:
 *   bun implementations/archon/request-server/server.ts
 * Settings come from the environment only (README.md). A setting that is missing or wrong
 * does not stop the server: every call then fails with the reason, so the chat can say it.
 * stdout carries JSON-RPC alone, diagnostics go to stderr.
 */

import { serveStdio } from '../.shared/mcp-serve.ts';
import { apiRoot, githubHttp, type Http } from './github.ts';
import { type Config, parseConfig, requestHandler } from './request.ts';

function main(): void {
  const env = process.env;
  const token = env.REQUEST_GITHUB_TOKEN?.trim() || null;
  let config: Config | string;
  let http: Http | null = null;
  try {
    config = parseConfig(env);
    if (token !== null) http = githubHttp(apiRoot(env.REQUEST_GITHUB_API || 'https://api.github.com'), token);
  } catch (e) {
    config = e instanceof Error ? e.message : String(e);
    process.stderr.write(`unify-sdlc-request: ${config}\n`);
  }
  serveStdio(requestHandler({ config, http, token }), 'unify-sdlc-request');
}

main();
