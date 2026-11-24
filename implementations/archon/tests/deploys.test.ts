/**
 * Step 4 of the pack: environments from project.yaml (decision 48), the hold of a shared
 * environment (51, 53), releases and the release line, the rollback plan (52, 61, 26),
 * and the tree check of an approval (49).
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import { fake } from './archon-script.stub.ts';
import { environmentsFor, parseDeploys, sameVersion, servicesOf } from '../.shared/environments.ts';
import { handoverDelivery, holderDelivery, holdsOf, join, queuedFlag, readHold, release, releaseAll } from '../.shared/holds.ts';
import { updateWork } from '../.shared/work.ts';
import { createRelease, lineAllows, previousVerified, readLine, rollbackPlan, setEnvStatus, updateLine } from '../.shared/releases.ts';
import { treeDifference } from '../.shared/candidate.ts';

beforeEach(() => fake.reset());

describe('environments', () => {
  test('no environments key: shape A from the deploy section', () => {
    const d = parseDeploys({ deploy: { hook: './deploy.sh', windowMinutes: 20, signals: ['errors'] } });
    expect(d.legacy).toBe(true);
    expect(d.environments).toHaveLength(1);
    expect(d.environments[0]).toMatchObject({ name: 'production', kind: 'production', stage: 'after-merge', deploy: './deploy.sh', rollback: 'revert', watch: { minutes: 20 } });
    expect(d.release.trigger).toBe('merge');
  });

  test('an empty list: a merge is Done', () => {
    expect(parseDeploys({ environments: [] }).environments).toEqual([]);
  });

  test('shape B: a shared pre-merge environment with a gate, then production', () => {
    const d = parseDeploys({
      services: [{ name: 'api', paths: ['api/**'] }, { name: 'web', paths: ['web/**'] }],
      environments: [
        { name: 'test', kind: 'shared', smoke: './smoke.sh', gate: { answerers: ['Alice'] }, services: ['api'] },
        { name: 'production', kind: 'production', rollback: 'previous', version: './v.sh' },
      ],
    });
    const changed = servicesOf(d, ['api/x.ts', 'README.md']);
    expect(changed.map(s => s.name)).toEqual(['api']);
    expect(environmentsFor(d, 'before-merge', changed).map(f => f.env.name)).toEqual(['test']);
    expect(d.environments[0]).toMatchObject({ stage: 'before-merge', gate: { answerers: ['alice'] }, rollback: 'forward' });
    expect(environmentsFor(d, 'before-merge', servicesOf(d, ['web/y.ts']))).toEqual([]);
  });

  test('wrong declarations are refused at once', () => {
    expect(() => parseDeploys({ environments: [{ name: 'p', kind: 'production', stage: 'before-merge' }] })).toThrow('must be after-merge');
    expect(() => parseDeploys({ environments: [{ name: 't', services: ['nope'] }] })).toThrow('not declared');
    expect(() => parseDeploys({ release: { trigger: 'weekly' } })).toThrow('release.trigger');
  });

  test('a version is the commit or a prefix of it', () => {
    expect(sameVersion('abc1234', 'abc1234def')).toBe(true);
    expect(sameVersion('abc12', 'abc1234def')).toBe(false);
    expect(sameVersion('v1.2 (abc)', 'abc1234def')).toBe(false);
  });
});

/** Put items in a state (a hold is handed only to a queued item in Verifying). */
function inState(state: 'verifying' | 'implementing', ...keys: string[]): void {
  for (const key of keys) updateWork(key as `#${number}`, doc => {
    doc.state = state;
  });
}

describe('the hold of a shared environment', () => {
  test('one holder, the rest queue in order; an urgent item goes to the front', () => {
    expect(join('test', 'api', '#1').holds).toBe(true);
    expect(join('test', 'api', '#2')).toMatchObject({ holds: false, place: 1, holder: '#1' });
    expect(join('test', 'api', '#3').place).toBe(2);
    expect(join('test', 'api', '#4', true).place).toBe(1);
    expect(join('test', 'api', '#1').holds).toBe(true);
    expect(readHold('test', 'api').queue).toEqual(['#4', '#2', '#3']);
  });

  test('a release hands the hold to the next item at once', () => {
    inState('verifying', '#2');
    join('test', 'api', '#1');
    join('test', 'api', '#2');
    expect(release('test', 'api', '#1')).toBe('#2');
    expect(join('test', 'api', '#2').holds).toBe(true);
    expect(release('test', 'api', '#2')).toBeNull();
    expect(readHold('test', 'api').holder).toBeNull();
  });

  test('changes asked: the fixed item is marked returning and comes back first, behind the one that took over', () => {
    inState('verifying', '#2', '#3');
    join('test', 'api', '#1');
    join('test', 'api', '#2');
    join('test', 'api', '#3');
    inState('implementing', '#1');
    expect(release('test', 'api', '#1', true)).toBe('#2');
    expect(readHold('test', 'api')).toMatchObject({ holder: '#2', queue: ['#3'], returning: ['#1'] });
    // Back from the fix: at the front, ahead of the items that waited.
    inState('verifying', '#1');
    expect(join('test', 'api', '#1')).toMatchObject({ holds: false, place: 1 });
    expect(readHold('test', 'api')).toMatchObject({ queue: ['#1', '#3'], returning: [] });
    expect(release('test', 'api', '#2')).toBe('#1');
  });

  test('the hold goes only to a queued item in Verifying; the others stay queued', () => {
    inState('verifying', '#3');
    inState('implementing', '#2');
    join('test', 'api', '#1');
    join('test', 'api', '#2');
    join('test', 'api', '#3');
    expect(release('test', 'api', '#1')).toBe('#3');
    expect(readHold('test', 'api')).toMatchObject({ holder: '#3', queue: ['#2'] });
    expect(release('test', 'api', '#3')).toBeNull();
    expect(readHold('test', 'api')).toMatchObject({ holder: null, queue: ['#2'] });
  });

  test('a fix round leaves every hold; the returning mark of the asking pair stays', () => {
    inState('verifying', '#2', '#3');
    join('test', 'api', '#1');
    join('test', 'web', '#1');
    join('test', 'api', '#2');
    join('test', 'web', '#3');
    inState('implementing', '#1');
    const here = release('test', 'web', '#1', true);
    expect([here, ...releaseAll('#1')]).toEqual(['#3', '#2']);
    expect(holdsOf('#1')).toEqual([]);
    expect(readHold('test', 'web').returning).toEqual(['#1']);
    expect(readHold('test', 'api').returning).toEqual([]);
  });

  test('one delivery id per handover, the same from the merge and from revisit', () => {
    const repo = { host: 'github.com', path: 'o/r' };
    inState('verifying', '#2');
    join('test', 'api', '#1');
    join('test', 'api', '#2');
    updateWork('#2', doc => {
      doc.flags = [queuedFlag('test', 'api')];
    });
    release('test', 'api', '#1');
    const since = readHold('test', 'api').since as string;
    expect(handoverDelivery(repo, '#2')).toBe(holderDelivery(repo, '#2', 'test', 'api', since));
    expect(handoverDelivery(repo, '#1')).toBeNull();
  });

  test('one lock per service, not per environment; leaving every hold at once', () => {
    inState('verifying', '#3');
    join('test', 'api', '#1');
    expect(join('test', 'web', '#2').holds).toBe(true);
    join('test', 'web', '#1');
    expect(holdsOf('#1').map(h => `${h.service}:${h.holder}`).sort()).toEqual(['api:true', 'web:false']);
    join('test', 'api', '#3');
    expect(releaseAll('#1')).toEqual(['#3']);
    expect(holdsOf('#1')).toEqual([]);
  });
});

describe('releases', () => {
  const rel = (id: string, at: string) => createRelease({ id, at, commit: `c${id}`, items: ['#1'], reason: 'normal', urgent: false, envs: {} });

  test('created once; the previous verified version per environment', () => {
    rel('r1', '2026-11-01');
    rel('r2', '2026-11-02');
    expect(createRelease({ id: 'r1', at: 'x', commit: 'other', items: [], reason: 'normal', urgent: false, envs: {} }).commit).toBe('cr1');
    setEnvStatus('r1', 'production', 'verified');
    setEnvStatus('r2', 'production', 'failed');
    expect(previousVerified('production', 'r2')?.id).toBe('r1');
    expect(previousVerified('staging')).toBeNull();
  });

  test('a blocked line refuses production until the base holds the fix', () => {
    updateLine(line => (line.blocked = { release: 'r2', culprit: '#5', since: 'now', clearedBy: null }));
    const contains = (commit: string, ancestor: string) => commit === 'c-after' && ancestor === 'fix';
    expect(lineAllows('c-before', contains).ok).toBe(false);
    updateLine(line => (line.blocked!.clearedBy = 'fix'));
    expect(lineAllows('c-before', contains).ok).toBe(false);
    expect(lineAllows('c-after', contains).ok).toBe(true);
    expect(readLine().blocked).toBeNull();
  });
});

describe('the rollback plan', () => {
  const none = () => null;

  test('shape A, one item: revert it; the line stays open', () => {
    expect(rollbackPlan({ items: ['#1'], culprit: '#1', kind: 'revert', toggleOf: none, togglesTried: false })).toMatchObject({ first: 'revert', rolledBack: ['#1'], blockLine: false, ask: false });
  });

  test('a release of three, culprit known, previous version: culprit RolledBack, the others back to Releasing, the line blocked', () => {
    expect(rollbackPlan({ items: ['#1', '#2', '#3'], culprit: '#2', kind: 'previous', toggleOf: none, togglesTried: false })).toMatchObject({
      first: 'previous',
      rolledBack: ['#2'],
      backToReleasing: ['#1', '#3'],
      blockLine: true,
      ask: false,
    });
  });

  test('no culprit in a release of several: previous version, everyone back to Releasing, ask', () => {
    expect(rollbackPlan({ items: ['#1', '#2'], culprit: null, kind: 'revert', toggleOf: none, togglesTried: false })).toMatchObject({ first: 'previous', rolledBack: [], backToReleasing: ['#1', '#2'], ask: true });
  });

  test('a culprit behind a toggle is turned off alone, then the real rollback if that does not help', () => {
    const toggleOf = (k: string) => (k === '#2' ? 'new-search' : null);
    expect(rollbackPlan({ items: ['#1', '#2'], culprit: '#2', kind: 'previous', toggleOf, togglesTried: false })).toMatchObject({ first: 'toggle', toggles: ['new-search'], rolledBack: [], blockLine: false });
    expect(rollbackPlan({ items: ['#1', '#2'], culprit: '#2', kind: 'previous', toggleOf, togglesTried: true }).first).toBe('previous');
  });

  test('forward only: nothing is redeployed and the Operator decides', () => {
    expect(rollbackPlan({ items: ['#1'], culprit: '#1', kind: 'forward', toggleOf: none, togglesTried: false })).toMatchObject({ first: 'none', ask: true });
  });
});

describe('the tree check', () => {
  test('files that differ, split by the insignificant paths', () => {
    const approved = new Map([['api/a.ts', '1'], ['CHANGELOG.md', '1'], ['api/b.ts', '1']]);
    const merged = new Map([['api/a.ts', '1'], ['CHANGELOG.md', '2'], ['api/c.ts', '1']]);
    expect(treeDifference(approved, merged, ['CHANGELOG.md', 'docs/**'])).toEqual({ insignificant: ['CHANGELOG.md'], rest: ['api/b.ts', 'api/c.ts'] });
    expect(treeDifference(approved, approved, [])).toEqual({ insignificant: [], rest: [] });
  });
});

describe('the candidate, on a real git repository', () => {
  test('base + item branch as one commit on the candidate ref; its restricted tree; a conflict is reported', async () => {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join: path } = await import('node:path');
    const { cutCandidate, filesOf, restrictedTree } = await import('../.shared/candidate.ts');
    const root = mkdtempSync(path(tmpdir(), 'candidate-'));
    const sh = (cwd: string, ...args: string[]) => {
      const r = Bun.spawnSync(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
      if (r.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.toString()}`);
      return r.stdout.toString().trim();
    };
    const write = (file: string, text: string) => Bun.write(path(root, 'work', file), text);
    sh(root, 'init', '-q', '--bare', 'origin.git');
    sh(root, 'clone', '-q', 'origin.git', 'work');
    const work = path(root, 'work');
    sh(work, 'checkout', '-q', '-b', 'main');
    await write('api.txt', 'one\n');
    await write('web.txt', 'one\n');
    sh(work, 'add', '.');
    sh(work, 'commit', '-q', '-m', 'base');
    sh(work, 'push', '-q', 'origin', 'main');
    sh(work, 'checkout', '-q', '-b', 'pipeline/7');
    await write('api.txt', 'two\n');
    sh(work, 'commit', '-q', '-am', 'item');
    sh(work, 'push', '-q', 'origin', 'pipeline/7');
    sh(work, 'checkout', '-q', 'main');
    await write('web.txt', 'base moved\n');
    sh(work, 'commit', '-q', '-am', 'other');
    sh(work, 'push', '-q', 'origin', 'main');
    const cwd = process.cwd();
    sh(work, 'config', 'user.name', 'pipeline');
    sh(work, 'config', 'user.email', 'pipeline@example.invalid');
    process.chdir(work);
    try {
      const cut = cutCandidate('main', ['pipeline/7'], 'test', 'api');
      if (!('commit' in cut)) throw new Error(cut.conflict);
      expect(sh(work, 'ls-remote', 'origin', 'refs/heads/pipeline/candidate/test/api').split(/\s+/)[0]).toBe(cut.commit);
      expect([...filesOf(cut.commit, ['api.txt']).keys()]).toEqual(['api.txt']);
      const tree = restrictedTree(cut.commit, ['api.txt']);
      expect(restrictedTree(cut.commit, ['web.txt'])).not.toBe(tree);
      // The same api content merged later reads as the same tree, whatever web did.
      sh(work, 'merge', '-q', '--no-edit', 'origin/pipeline/7');
      expect(restrictedTree('HEAD', ['api.txt'])).toBe(tree);
      sh(work, 'checkout', '-q', '-b', 'pipeline/8', 'HEAD~1');
      await write('api.txt', 'three\n');
      sh(work, 'commit', '-q', '-am', 'clash');
      sh(work, 'push', '-q', 'origin', 'pipeline/8');
      const clash = cutCandidate('main', ['pipeline/7', 'pipeline/8'], 'test', 'api');
      expect('conflict' in clash && clash.conflict).toContain('pipeline/8 conflicts');
    } finally {
      process.chdir(cwd);
    }
  });
});
