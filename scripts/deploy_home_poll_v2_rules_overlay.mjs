import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectId = 'phraseman-ea0b3';
const mode = 'exact-home-poll-v2-overlay';
const localRequire = createRequire(import.meta.url);
const { sha256, validateExactHomePollV2DeployArgs } = localRequire('./home_poll_v2_rules_overlay_verifier.cjs');
const actualArgs = process.argv.slice(2);
if (!validateExactHomePollV2DeployArgs(actualArgs)) {
  throw new Error('Deployment requires exactly --apply --confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES.');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: command === 'firebase' && process.platform === 'win32',
  });
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`);
}

// The mandatory guard re-fetches the active Rules API release immediately
// before Firebase CLI receives the fixed project and fixed generated config.
run(process.execPath, [
  path.join(repoRoot, 'scripts', 'guard_global_broadcast_privacy_rules_rollout.mjs'),
  `--mode=${mode}`,
  `--project=${projectId}`,
]);
run(process.execPath, [path.join(repoRoot, 'scripts', 'deploy_lock_guard.mjs')]);
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'home-poll-v2-rules-overlay.json'), 'utf8'));
const preparedRules = fs.readFileSync(path.join(repoRoot, '.codex-tmp', 'handoff-134', 'poll-overlay-firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
if (sha256(preparedRules) !== manifest.expectedOverlaySha256) {
  throw new Error('Pre-deploy prepared Rules hash mismatch.');
}
const generatedConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, '.codex-tmp', 'handoff-134', 'poll-overlay-firebase.json'), 'utf8'));
const exactConfig = { firestore: { rules: 'poll-overlay-firestore.rules' } };
if (JSON.stringify(generatedConfig) !== JSON.stringify(exactConfig)) {
  throw new Error('Pre-deploy Firebase config is not the fixed Rules-only config.');
}
console.log(`[home-poll-v2-rules] PREDEPLOY_ARTIFACT_VERIFIED overlaySha256=${manifest.expectedOverlaySha256}`);
run('firebase', [
  'deploy', '--project', projectId,
  '--config', '.codex-tmp/handoff-134/poll-overlay-firebase.json',
  '--only', 'firestore:rules',
]);

const functionsRequire = createRequire(path.join(repoRoot, 'functions', 'package.json'));
const { GoogleAuth } = functionsRequire('google-auth-library');
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const client = await auth.getClient();
async function get(url) {
  const response = await client.request({ url, headers: { 'x-goog-user-project': projectId } });
  return response.data;
}
const release = await get(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`);
const ruleset = await get(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
const source = ruleset?.source?.files?.find((file) => file.name === 'firestore.rules')?.content ?? ruleset?.source?.files?.[0]?.content;
if (!source || sha256(source.replace(/\r\n/g, '\n')) !== manifest.expectedOverlaySha256) {
  throw new Error(`Post-deploy active Rules hash mismatch for ${release.rulesetName}.`);
}
console.log(`[home-poll-v2-rules] DEPLOYED_AND_VERIFIED project=${projectId} ruleset=${release.rulesetName} overlaySha256=${manifest.expectedOverlaySha256}`);
