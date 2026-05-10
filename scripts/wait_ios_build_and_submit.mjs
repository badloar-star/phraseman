/**
 * Poll EAS until iOS build finishes, then eas submit to App Store Connect (non-interactive).
 * Usage: node scripts/wait_ios_build_and_submit.mjs <build-uuid>
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const buildId = process.argv[2];
if (!buildId || !/^[a-f0-9-]{36}$/i.test(buildId)) {
  console.error('Usage: node scripts/wait_ios_build_and_submit.mjs <eas-build-uuid>');
  process.exit(1);
}

const POLL_MS = 90_000;
const MAX_POLLS = 120; // ~3h (очередь + сборка)

function getStatus() {
  const out = execSync(`npx eas-cli@latest build:view ${buildId} --json`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in eas build:view output');
  return JSON.parse(m[0]).status;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

for (let i = 0; i < MAX_POLLS; i++) {
  const status = getStatus();
  const s = String(status).toUpperCase();
  console.log(new Date().toISOString(), 'build', buildId, '→', s);
  if (s === 'FINISHED') break;
  if (['ERRORED', 'FAILED', 'CANCELED'].includes(s)) {
    console.error('Build ended with status:', s);
    process.exit(1);
  }
  if (i === MAX_POLLS - 1) {
    console.error('Timeout waiting for FINISHED');
    process.exit(1);
  }
  await sleep(POLL_MS);
}

console.log('Submitting to App Store Connect…');
execSync(
  `npx eas-cli@latest submit -p ios --id ${buildId} -e production --non-interactive --wait`,
  { stdio: 'inherit', cwd: projectRoot },
);
