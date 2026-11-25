/**
 * The engine holds the state (decision 45): moves, adoption of items from before it, a
 * difference with the tracker and its two answers, a lost race, a failed label write,
 * and the moves against docs/states.md. Run: `bun test --preload ./tests/archon-script.stub.ts tests`.
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fake } from './archon-script.stub.ts';
import { fakeTracker } from './fake-tracker.ts';
import { useTracker } from '../.shared/connector.ts';
import { issueKey, issueNumber, keyOfStateSlug, keySlug, parseKey } from '../.shared/item.ts';
import { MOVES, moveState, NONE, readState, resolveDifference, STATES, StateDifference, StateMismatch, type From } from '../.shared/states.ts';
import { differenceCard, applyDifference } from '../.shared/stage.ts';
import { docName, readWork } from '../.shared/work.ts';

const ref = (number: number) => `#${number}`;
const doc = (number: number) => fake.docs.get(docName(number))?.value as { state: string | null; stateAt: { how: string } | null } | undefined;
let tracker = fakeTracker();

beforeEach(() => {
  fake.reset();
  tracker = fakeTracker();
  useTracker(tracker.adapter);
});

describe('item keys', () => {
  test('an issue and a tracker key', async () => {
    expect(parseKey('12')).toBe('#12');
    expect(parseKey(' #12 ')).toBe('#12');
    expect(parseKey('PROJ-123')).toBe('PROJ-123');
    expect(parseKey('proj-123')).toBeNull();
    expect(parseKey('#0')).toBeNull();
    expect(issueNumber('#12')).toBe(12);
    expect(issueNumber('PROJ-123')).toBeNull();
  });
  test('a key names the same document an issue number did', async () => {
    expect(docName(12)).toBe('work/12');
    expect(docName(issueKey(12))).toBe('work/12');
    expect(docName('PROJ-123')).toBe('work/proj-123');
    expect(keyOfStateSlug('proj-123')).toBe('PROJ-123');
    expect(keyOfStateSlug('12')).toBe('#12');
    expect(keyOfStateSlug('../x')).toBeNull();
    expect(() => keySlug('../x')).toThrow();
  });
});

describe('moves', () => {
  test('a new item: the engine first, then the label', async () => {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    expect(doc(7)?.state).toBe('triaging');
    expect(doc(7)?.stateAt?.how).toBe('move');
    expect(tracker.labels('#7')).toEqual(['state:triaging']);
    expect(tracker.calls).toContain('label.add #7');
    expect(await readState(ref(7))).toBe('triaging');
  });

  test('a move from a state the step does not expect is refused and changes nothing', async () => {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    await expect(moveState(ref(7), ['planning'], 'plan-review')).rejects.toThrow(StateMismatch);
    expect(doc(7)?.state).toBe('triaging');
    expect(tracker.labels('#7')).toEqual(['state:triaging']);
  });

  test('a move docs/states.md does not have is refused', async () => {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    await expect(moveState(ref(7), ['triaging'], 'live')).rejects.toThrow('no move triaging → live');
  });

  test('moving to where the item is changes nothing', async () => {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    const revision = readWork(7).revision;
    await moveState(ref(7), ['triaging'], 'triaging');
    expect(readWork(7).revision).toBe(revision);
  });

  test('merged work goes through Releasing to Live', async () => {
    tracker.item('#7', ['state:merge-review']);
    fake.docs.set('work/7', { revision: 1, value: { state: 'merge-review' } });
    await moveState(ref(7), ['merge-review'], 'verifying');
    await moveState(ref(7), ['verifying'], 'releasing');
    await moveState(ref(7), ['releasing'], 'live');
    expect(tracker.labels('#7')).toEqual(['state:live']);
    tracker.item('#8', ['state:merge-review']);
    fake.docs.set('work/8', { revision: 1, value: { state: 'merge-review' } });
    await expect(moveState(ref(8), ['merge-review'], 'live')).rejects.toThrow('no move merge-review → live');
  });

  test('another run that moved the item between the read and the write wins; this move is refused', async () => {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    fake.racePut.set('work/7', () => {
      const current = fake.docs.get('work/7')!;
      fake.docs.set('work/7', { revision: current.revision + 1, value: { ...(current.value as object), state: 'cancelled' } });
    });
    await expect(moveState(ref(7), ['triaging'], 'triage-review')).rejects.toThrow('moved to cancelled by another run');
    expect(doc(7)?.state).toBe('cancelled');
    expect(tracker.labels('#7')).toEqual(['state:triaging']);
  });

  test('a label write that fails leaves the engine moved and the next read sees the difference', async () => {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    tracker.refuse.add('state:triage-review');
    await expect(moveState(ref(7), ['triaging'], 'triage-review')).rejects.toThrow('is required');
    expect(doc(7)?.state).toBe('triage-review');
    tracker.refuse.clear();
    await expect(readState(ref(7))).rejects.toThrow(StateDifference);
    expect(await resolveDifference(ref(7), 'engine')).toBe('triage-review');
    expect(tracker.labels('#7')).toEqual(['state:triage-review']);
    expect(await readState(ref(7))).toBe('triage-review');
  });

  test('while the tracker is down the engine moves on, the label waits, and the next write puts it right', async () => {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    tracker.down = true;
    await moveState(ref(7), ['triaging'], 'triage-review');
    expect(doc(7)?.state).toBe('triage-review');
    expect(await readState(ref(7))).toBe('triage-review');
    await moveState(ref(7), ['triage-review'], 'specifying');
    expect(tracker.labels('#7')).toEqual(['state:triaging']);
    tracker.down = false;
    await moveState(ref(7), ['specifying'], 'spec-review');
    expect(tracker.labels('#7')).toEqual(['state:spec-review']);
    expect(await readState(ref(7))).toBe('spec-review');
  });

  test('a down tracker and no state in the engine: the read fails rather than guess', async () => {
    tracker.item('#7');
    tracker.down = true;
    await expect(readState(ref(7))).rejects.toThrow('tracker unreachable');
  });
});

describe('items from before the engine held states', () => {
  test('a document with no state adopts the label once', async () => {
    tracker.item('#7', ['state:implementing', 'bug']);
    fake.docs.set('work/7', { revision: 4, value: { rounds: 2 } });
    expect(await readState(ref(7))).toBe('implementing');
    expect(doc(7)?.state).toBe('implementing');
    expect(doc(7)?.stateAt?.how).toBe('adopted');
    expect(readWork(7).doc.rounds).toBe(2);
  });

  test('a new issue someone labelled by hand is a difference, not adopted', async () => {
    tracker.item('#7', ['state:plan-review']);
    await expect(readState(ref(7))).rejects.toThrow(StateDifference);
    expect(fake.docs.has('work/7')).toBe(false);
  });
});

describe('a difference with the tracker', () => {
  async function differing(): Promise<StateDifference> {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    await moveState(ref(7), ['triaging'], 'triage-review');
    tracker.items.get('#7')!.labels = ['state:cancelled'];
    try {
      await readState(ref(7));
    } catch (error) {
      if (error instanceof StateDifference) return error;
    }
    throw new Error('no difference');
  }

  test('nothing is overwritten when it is found', async () => {
    const difference = await differing();
    expect(difference.engine).toBe('triage-review');
    expect(difference.tracker).toBe('cancelled');
    expect(doc(7)?.state).toBe('triage-review');
    expect(tracker.labels('#7')).toEqual(['state:cancelled']);
  });

  test('the request offers both answers and leaving it; a move the pipeline could make recommends adopting', async () => {
    const card = differenceCard(ref(7), 'merge', await differing());
    expect(card.options.map(o => o.id)).toEqual(['tracker-back', 'adopt', 'stop']);
    expect(card.recommendation.option).toBe('adopt');
  });

  test('a state the pipeline cannot reach from here recommends putting the tracker back', async () => {
    tracker.item('#8');
    await moveState(ref(8), [NONE], 'triaging');
    tracker.items.get('#8')!.labels = ['state:live'];
    let found: StateDifference | null = null;
    try {
      await readState(ref(8));
    } catch (error) {
      found = error as StateDifference;
    }
    expect(differenceCard(ref(8), 'triage', found!).recommendation.option).toBe('tracker-back');
  });

  test('put the tracker back', async () => {
    await differing();
    expect(await applyDifference(ref(7), 'keep-engine')).toBe(true);
    expect(tracker.labels('#7')).toEqual(['state:triage-review']);
    expect(await readState(ref(7))).toBe('triage-review');
  });

  test('adopt the tracker', async () => {
    await differing();
    expect(await applyDifference(ref(7), 'keep-tracker')).toBe(true);
    expect(doc(7)?.state).toBe('cancelled');
    expect(doc(7)?.stateAt?.how).toBe('operator');
    expect(await readState(ref(7))).toBe('cancelled');
  });

  test('two state labels: only putting the tracker back is offered', async () => {
    tracker.item('#7');
    await moveState(ref(7), [NONE], 'triaging');
    tracker.items.get('#7')!.labels = ['state:triaging', 'state:done'];
    let found: StateDifference | null = null;
    try {
      await readState(ref(7));
    } catch (error) {
      found = error as StateDifference;
    }
    expect(found?.tracker).toBe('conflict');
    expect(differenceCard(ref(7), 'triage', found!).options.map(o => o.id)).toEqual(['tracker-back', 'stop']);
    await expect(resolveDifference(ref(7), 'tracker')).rejects.toThrow(StateMismatch);
    await resolveDifference(ref(7), 'engine');
    expect(tracker.labels('#7')).toEqual(['state:triaging']);
  });

  test('any other answer is not a difference answer', async () => {
    expect(await applyDifference(ref(7), 'stop')).toBe(false);
    expect(await applyDifference(ref(7), undefined)).toBe(false);
  });
});

describe('docs/states.md', () => {
  const names: Record<string, From> = Object.fromEntries(
    Object.keys(STATES).map(s => [s.split('-').map(w => (w === 'for' ? 'For' : w[0].toUpperCase() + w.slice(1))).join(''), s as From])
  );
  names.RolledBack = 'rolled-back';
  const text = readFileSync(join(import.meta.dir, '..', '..', '..', 'docs', 'states.md'), 'utf8');
  const arrows = [...text.matchAll(/^\s*(\[\*\]|\w+) --> (\[\*\]|\w+)/gm)]
    .map(m => [m[1], m[2]] as const)
    .filter(([from, to]) => from !== '[*]' || to === 'Triaging')
    .filter(([, to]) => to !== '[*]');

  test('every state in the doc is a state here', async () => {
    for (const [from, to] of arrows) {
      if (from !== '[*]') expect(names[from]).toBeDefined();
      expect(names[to]).toBeDefined();
    }
  });

  test('every arrow in the doc is a move here', async () => {
    expect(arrows.length).toBeGreaterThan(25);
    for (const [from, to] of arrows) {
      const source: From = from === '[*]' ? NONE : names[from];
      expect(MOVES[source]).toContain(names[to] as never);
    }
  });

  test('moves here beyond the arrows are only the rules the doc states in words', async () => {
    const drawn = new Set(arrows.map(([f, t]) => `${f === '[*]' ? NONE : names[f]}>${names[t]}`));
    const extra = Object.entries(MOVES).flatMap(([from, tos]) => tos.map(to => `${from}>${to}`)).filter(m => !drawn.has(m));
    const words = (m: string) => m.endsWith('>cancelled') || m.endsWith('>for-human') || m === 'implementing>blocked';
    expect(extra.filter(m => !words(m))).toEqual([]);
  });
});
