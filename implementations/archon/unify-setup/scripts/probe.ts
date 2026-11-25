/**
 * Probe the composed map on the Operator's test item (decision 46): the connector runs
 * over the map with the server line the Operator passed, never one the agent wrote (a
 * map whose server differs is refused), and `probeMap` runs every declared operation
 * that does not change the project: view, comments, a probe label added and removed, a
 * probe comment, list, blockers, label setter. Create, close and the links are reported
 * as not probed.
 *
 * Inputs: server; bound map, test_item. Emits `{ ok, lines }`.
 */

import { emit, input, runId } from 'archon:script';
import { script, useTracker } from '../../.shared/connector.ts';
import { mapAdapter, parseMap } from '../../.shared/map.ts';
import { probeMap } from '../../.shared/probe.ts';
import { parseServer, sameServer } from './lib/server.ts';

async function main(): Promise<void> {
  const server = parseServer(input('server'));
  const map = parseMap(input('map'));
  if (!sameServer(map.server, server)) throw new Error('the map names another server than the one passed; refusing to probe it');
  const t = useTracker(mapAdapter({ ...map, server }));
  if (t === null) throw new Error('the connector did not open');
  const report = await probeMap(t, input('test_item'), runId());
  emit({ ok: report.ok, lines: report.lines });
}

await script('unify-setup probe', main);
