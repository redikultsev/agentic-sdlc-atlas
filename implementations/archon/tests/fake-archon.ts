/**
 * A stand-in `archon` binary for the read server's end-to-end test: logs its argv (one JSON
 * line per call, to FAKE_ARCHON_LOG) and prints the canned answer for it.
 */
import { appendFileSync } from 'node:fs';
import { cliOutput } from './read-server-fixtures.ts';

const argv = process.argv.slice(2);
if (process.env.FAKE_ARCHON_LOG) appendFileSync(process.env.FAKE_ARCHON_LOG, `${JSON.stringify({ argv, cwd: process.cwd(), workflowId: process.env.WORKFLOW_ID ?? null, readEnv: Object.keys(process.env).filter(k => k.startsWith('ARCHON_READ_')) })}\n`);
const out = cliOutput(argv);
process.stdout.write(out.stdout);
process.exit(out.code);
