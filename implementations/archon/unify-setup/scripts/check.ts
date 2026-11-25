/**
 * The install check of the composed map, by script (decision 46): it parses, it names the
 * server the Operator passed and no other, every required operation is there, its `key`
 * pattern compiles and matches the test item. A problem fails the round: the card shows
 * it and nothing is probed. Optional operations the map lacks are listed, not refused.
 *
 * Inputs: server; bound map (the agent's YAML text), test_item. Emits
 * `{ ok, problems, missing, lacks }`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { checkMap, parseMap, type TrackerMap } from '../../.shared/map.ts';
import { parseServer, sameServer } from './lib/server.ts';

async function main(): Promise<void> {
  const server = parseServer(input('server'));
  const text = input('map');
  let map: TrackerMap;
  try {
    map = parseMap(text);
  } catch (error) {
    emit({ ok: false, problems: [(error as Error).message], missing: [], lacks: [] });
    return;
  }
  const problems: string[] = [];
  if (!sameServer(map.server, server)) problems.push('the map\'s server differs from the server line you passed: the agent may not change it');
  const { missing, lacks } = checkMap(map);
  if (missing.length > 0) problems.push(`required operation(s) missing: ${missing.join(', ')}`);
  for (const [name, op] of Object.entries(map.operations)) {
    if (typeof op !== 'object' || op === null || typeof (op as { tool?: unknown }).tool !== 'string') problems.push(`operation ${name} names no tool`);
  }
  if (map.key !== undefined) {
    try {
      if (!new RegExp(map.key).test(input('test_item'))) problems.push(`the test item ${input('test_item')} does not match the map's key pattern ${map.key}`);
    } catch (error) {
      problems.push(`key is not a valid pattern: ${(error as Error).message}`);
    }
  }
  emit({ ok: problems.length === 0, problems, missing, lacks });
}

await script('unify-setup check', main);
