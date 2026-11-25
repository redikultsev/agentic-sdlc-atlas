/**
 * Each agent's skills (decision 67): the pack holds every skill a role names, every agent
 * node gets its role's rendered skills and its command shows them, and the rendering puts
 * the pack's rules before the project's own file from the base.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { body, PACK_ROOT, packSkills, renderSkills, ROLE_SKILLS } from '../.shared/skills.ts';

const workflows = readdirSync(PACK_ROOT).filter(name => name.startsWith('unify-'));

/** Every agent node: its workflow, its command, and the lines of its node. */
function agentNodes(): { workflow: string; role: string; node: string[] }[] {
  const found: { workflow: string; role: string; node: string[] }[] = [];
  for (const workflow of workflows) {
    const lines = readFileSync(join(PACK_ROOT, workflow, `${workflow}.yaml`), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const m = /^(\s*)command: ([a-z-]+)\s*$/.exec(line);
      if (!m) return;
      const node: string[] = [];
      for (let j = i; j < lines.length; j++) {
        const indent = lines[j].search(/\S/);
        if (j > i && indent >= 0 && indent < m[1].length) break;
        node.push(lines[j]);
      }
      found.push({ workflow, role: m[2], node });
    });
  }
  return found;
}

describe('the pack', () => {
  test('holds every skill a role names, each with its name and a description', () => {
    const skills = packSkills();
    for (const name of new Set(Object.values(ROLE_SKILLS).flat())) {
      const text = skills.get(name);
      expect(text, name).toBeDefined();
      expect(text!).toContain(`name: ${name}\n`.replace('\n', text!.includes('\r\n') ? '\r\n' : '\n'));
      expect(text!).toMatch(/\ndescription: \S/);
    }
  });

  test('every agent node gets its role skills, and its command shows them', () => {
    const nodes = agentNodes();
    expect(nodes.length).toBeGreaterThan(10);
    for (const { workflow, role, node } of nodes) {
      expect(Object.keys(ROLE_SKILLS), `${workflow}: ${role}`).toContain(role);
      if (role === 'setup') continue;
      expect(node.some(l => l.trim() === `skills: "$skills-${role}.output.text"`), `${workflow}: ${role}`).toBe(true);
      const yaml = readFileSync(join(PACK_ROOT, workflow, `${workflow}.yaml`), 'utf8');
      expect(yaml, `${workflow}: skills-${role} node`).toMatch(new RegExp(`- id: skills-${role}\\r?\\n    script: skills\\r?\\n[\\s\\S]*?with: \\{ role: ${role} \\}`));
      expect(readFileSync(join(PACK_ROOT, workflow, 'commands', `${role}.md`), 'utf8'), `${role}.md`).toContain('$INPUTS.skills');
      expect(readFileSync(join(PACK_ROOT, workflow, 'scripts', 'skills.ts'), 'utf8')).toContain('renderSkills');
    }
  });
});

describe('rendering', () => {
  let dir = '';
  const saved = process.env.PIPELINE_POLICY_DIR;
  afterEach(() => {
    if (saved === undefined) delete process.env.PIPELINE_POLICY_DIR;
    else process.env.PIPELINE_POLICY_DIR = saved;
    if (dir !== '') rmSync(dir, { recursive: true, force: true });
    dir = '';
  });

  function policy(files: Record<string, string>): void {
    dir = mkdtempSync(join(tmpdir(), 'skills-'));
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    process.env.PIPELINE_POLICY_DIR = dir;
  }

  test('the pack skills in order, without front matter, then the project file', () => {
    policy({ '.pipeline/skills/triage.md': '---\nname: x\n---\nRun the detector with the case input.\n' });
    const r = renderSkills('triage', 'main');
    expect(r.pack).toEqual(['unify-root-cause', 'unify-reproduce']);
    expect(r.project).toBe('.pipeline/skills/triage.md');
    expect(r.text.indexOf('### unify-root-cause')).toBeLessThan(r.text.indexOf('### unify-reproduce'));
    expect(r.text.indexOf('### unify-reproduce')).toBeLessThan(r.text.indexOf("### .pipeline/skills/triage.md (this project's)"));
    expect(r.text).toContain('Run the detector with the case input.');
    expect(r.text).not.toContain('name: unify-root-cause');
  });

  test("the group pass reads Triage's project file; no file means the pack's alone", () => {
    policy({ '.pipeline/skills/triage.md': 'Triage notes.' });
    expect(renderSkills('group', 'main').text).toContain('Triage notes.');
    expect(renderSkills('review', 'main').project).toBeNull();
    expect(renderSkills('watcher', 'main').text).toBe('None for this role.');
  });

  test('an unknown role or a skill missing from the pack stops the session', () => {
    policy({});
    expect(() => renderSkills('nobody', 'main')).toThrow("no agent role 'nobody'");
    const empty = mkdtempSync(join(tmpdir(), 'pack-'));
    try {
      expect(() => renderSkills('triage', 'main', empty)).toThrow('the pack has no skill unify-root-cause');
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  test('front matter goes, the text stays', () => {
    expect(body('---\r\nname: a\r\ndescription: b\r\n---\r\n# Title\r\nText')).toBe('# Title\r\nText');
    expect(body('No front matter')).toBe('No front matter');
  });
});
