/**
 * Which skills each agent role loads (decisions 67, 69). One table for the workflow steps and
 * the automations.
 *
 * Two tiers. **Core** skills are inlined in the role's prompt: the role uses them on every
 * task. **On-call** skills are named in the prompt with the situation that calls for them and
 * the path of their file; the agent reads the file when the situation arises.
 *
 * A skill id is `unify-<name>` for the pipeline's own skills (`../archon/skills/`) or
 * `<pack>/<skill>` for a vendored market skill (`../skills/vendor/`, fetched by
 * `../skills/fetch.sh` at pinned commits). An own skill exists only where no published one
 * does the job, and the Operator agrees each one (decision 69).
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const HERE = import.meta.dirname;
const OWN = join(HERE, '..', 'archon', 'skills');
const VENDOR = join(HERE, '..', 'skills', 'vendor');

/**
 * Where the agents find this repository on the machine that runs them: `PIPELINE_REPO`, or
 * the checkout the generator runs from. It appears only in generated prompts, never in a
 * committed file.
 */
const REPO = (process.env.PIPELINE_REPO?.trim() || resolve(HERE, '..', '..')).replace(/\\/g, '/');

interface OnCall {
  skill: string;
  /** The situation that calls for the skill, completing "when ...". */
  when: string;
}

interface RoleSkills {
  core: string[];
  onCall: OnCall[];
}

const ROLES: Record<string, RoleSkills> = {
  triage: {
    core: ['unify-root-cause', 'unify-reproduce', 'pstack/principle-fix-root-causes'],
    onCall: [
      { skill: 'pocock/diagnosing-bugs', when: 'you have no quick pass/fail loop for the symptom yet, or several causes look plausible (phases 1 to 3 only; you change nothing)' },
      { skill: 'unify-evals', when: 'the defect is in a model\'s output: note the failing cases and the neighbouring cases a fix will have to be proven on' },
      { skill: 'pstack/principle-attack-the-premise', when: 'an earlier fix for the same symptom exists or failed' },
      { skill: 'pstack/why', when: 'the code looks deliberate and you need to know why it is that way before calling it a defect' },
      { skill: 'superpowers/systematic-debugging', when: 'several components are involved and you cannot tell which one fails (its phase 1 only, read-only)' },
      { skill: 'pocock/domain-modeling', when: 'the request uses a term loosely, or it is unclear which thing a decision belongs to' },
    ],
  },
  interviewer: {
    core: ['pocock/grilling', 'pocock/domain-modeling'],
    onCall: [
      { skill: 'pstack/reframe', when: 'the request could be two or three different problems (its first paragraph: list them and the sign that tells them apart; skip the term lists)' },
      { skill: 'pocock/to-spec', when: 'the item is a large feature and the criteria need a fuller structure' },
      { skill: 'agent-skills/spec-driven-development', when: 'one request bundles several capabilities and they must be separated' },
      { skill: 'superpowers/brainstorming', when: 'the request is vague and you need the one question that changes what gets built' },
      { skill: 'anthropic-skills/doc-coauthoring', when: 'the spec is long: before the gate, test it on a reader with no context (its reader-testing part)' },
      { skill: 'unify-root-cause', when: 'the item is a defect: keep the cause straight while writing criteria, without choosing the fix' },
    ],
  },
  planner: {
    core: ['unify-root-cause', 'pstack/principle-fix-root-causes', 'pstack/architect', 'pstack/principle-model-the-domain'],
    onCall: [
      { skill: 'superpowers/writing-plans', when: 'you cut the design into slices: what each slice consumes and produces, and what a reviewer should focus on' },
      { skill: 'unify-evals', when: 'the plan changes a prompt, a model or what a model is given: plan the case set before the change' },
      { skill: 'pocock/codebase-design', when: 'the change adds or reshapes an interface between modules; its DESIGN-IT-TWICE.md when the shape is contested and worth parallel designs' },
      { skill: 'pocock/prototype', when: 'a design question can only be answered by running code' },
      { skill: 'pocock/to-tickets', when: 'the work is larger than one implementation session and needs slices with blocking edges' },
      { skill: 'pstack/principle-redesign-from-first-principles', when: 'the requirement would have changed the design had it been known from the start' },
      { skill: 'pstack/principle-subtract-before-you-add', when: 'every option you have adds code or machinery' },
      { skill: 'pstack/principle-foundational-thinking', when: 'the shape of the data is unclear' },
      { skill: 'pstack/principle-attack-the-premise', when: 'earlier fixes of this area failed' },
      { skill: 'pstack/why', when: 'you need the history behind the current design' },
      { skill: 'pstack/blast-radius', when: 'the risk is R2: name the one fact the change is safe because of' },
      { skill: 'agent-skills/documentation-and-adrs', when: 'the design decision is hard to reverse, surprising and a real trade-off' },
    ],
  },
  implementer: {
    core: ['pocock/tdd', 'superpowers/verification-before-completion', 'ponytail/ponytail'],
    onCall: [
      { skill: 'unify-evals', when: 'the change touches a prompt, a model or what a model is given' },
      { skill: 'superpowers/receiving-code-review', when: 'this is a fix round: check each finding against the code before acting on it' },
      { skill: 'unify-root-cause', when: 'a test fails for a reason the plan did not foresee' },
      { skill: 'pocock/diagnosing-bugs', when: 'you are debugging a failure you cannot explain' },
      { skill: 'superpowers/systematic-debugging', when: 'a second fix attempt failed (its rule on three failed fixes: stop, write the premise down, go to Blocked)' },
      { skill: 'pstack/principle-model-the-domain', when: 'the code you are writing grows a chain of branches or flags' },
      { skill: 'pocock/codebase-design', when: 'you need the vocabulary for where a test seam or an interface belongs' },
    ],
  },
  review: {
    core: ['pocock/code-review', 'ponytail/ponytail-review', 'unify-root-cause', 'pstack/principle-fix-root-causes'],
    onCall: [
      { skill: 'anthropic-plugins/silent-failure-hunter', when: 'the diff drops, defaults, retries or swallows anything, a model\'s output above all' },
      { skill: 'unify-evals', when: 'the change touches a prompt, a model or what a model is given: judge its before and after' },
      { skill: 'pocock/tdd', when: 'you judge the new tests (its anti-patterns)' },
      { skill: 'pstack/interrogate', when: 'a finding matters enough that it must be proven by a run' },
      { skill: 'pstack/blast-radius', when: 'the risk is R2' },
      { skill: 'agent-skills/doubt-driven-development', when: 'the change adds branching logic and you doubt the layer it was put in' },
      { skill: 'pstack/principle-model-the-domain', when: 'the diff adds one more branch or flag to an existing chain' },
    ],
  },
  validator: {
    core: ['unify-reproduce', 'superpowers/verification-before-completion'],
    onCall: [
      { skill: 'unify-evals', when: 'a criterion is about a model\'s behaviour' },
      { skill: 'anthropic-skills/webapp-testing', when: 'the application has a web interface to drive' },
    ],
  },
  merge: {
    core: [],
    onCall: [
      { skill: 'pstack/blast-radius', when: 'the risk is R2: state the one fact the change is safe because of and whether a run proved it' },
      { skill: 'pocock/tdd', when: 'you check that the failing-first outputs are real tests of behaviour' },
    ],
  },
  retro: {
    core: ['unify-lessons', 'pocock/retro', 'pstack/correct'],
    onCall: [
      { skill: 'pstack/reflect', when: 'you mine a conversation for a durable lesson' },
      { skill: 'pstack/principle-encode-lessons-in-structure', when: 'a lesson could be a check instead of a sentence' },
      { skill: 'pstack/principle-attack-the-premise', when: 'the same class of fix keeps repeating' },
      { skill: 'unify-root-cause', when: 'a lesson comes from an incident and its cause must be stated' },
    ],
  },
  'skill-review': {
    core: ['unify-lessons'],
    onCall: [
      { skill: 'pstack/reflect', when: 'you mine a conversation for how a skill was used' },
      { skill: 'pstack/correct', when: 'a mistake repeated although a skill covers it' },
    ],
  },
  findings: {
    core: ['ponytail/ponytail-debt'],
    onCall: [{ skill: 'ponytail/ponytail-audit', when: 'a finding needs its place in the code checked' }],
  },
  scout: {
    core: ['ponytail/ponytail-audit', 'unify-reproduce'],
    onCall: [
      { skill: 'pocock/improve-codebase-architecture', when: 'the area is tangled and the finding is about its structure' },
      { skill: 'anthropic-plugins/silent-failure-hunter', when: 'you sweep error handling' },
    ],
  },
};

/** Path of a skill's file inside this repository. */
function relPath(id: string): string {
  return id.startsWith('unify-') ? `implementations/archon/skills/${id}/SKILL.md` : `implementations/skills/vendor/${id}/SKILL.md`;
}

function body(id: string): string {
  const file = id.startsWith('unify-') ? join(OWN, id, 'SKILL.md') : join(VENDOR, ...id.split('/'), 'SKILL.md');
  return readFileSync(file, 'utf8')
    .replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .trim();
}

const HOW = `Most of these skills were written for an interactive assistant. Here: "the user" or "the human" is the Operator, reached only through ask_user_question_kandev; ignore slash commands, modes and levels; where a skill says to call another skill, read that skill's file if it is in your lists and skip it otherwise; work a skill assigns to sub-agents you may do yourself. Where a skill disagrees with this step's instructions above, the step's instructions win. In your summary, name the skills you used.`;

/** The skills section of a role's prompt: core skills inlined, on-call skills listed with their files. */
function skills(role: string, projectRole = role): string {
  const r = ROLES[role];
  if (!r) throw new Error(`no skills for role ${role}`);
  const parts = ['## Your skills', '', HOW];
  for (const id of r.core) parts.push('', `### Skill ${id} (always)`, '', body(id));
  if (r.onCall.length > 0) {
    parts.push('', '### Skills for particular situations', '', 'Read the file when the situation arises; do not read them all up front.', '');
    for (const o of r.onCall) {
      body(o.skill); // fails the build when the file is missing
      parts.push(`- \`${o.skill}\`, when ${o.when}: \`${REPO}/${relPath(o.skill)}\``);
    }
  }
  parts.push('', `If the repository has \`.pipeline/skills/${projectRole}.md\` on its base branch, read it first: it is this project's skill for your role.`);
  return parts.join('\n');
}

export { ROLES, skills, relPath };
export type { RoleSkills, OnCall };
