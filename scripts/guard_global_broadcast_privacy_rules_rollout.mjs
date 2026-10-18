import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(repoRoot, 'config', 'global-broadcast-privacy-rollout.json');
const require = createRequire(import.meta.url);
const {
  computeGlobalBroadcastLocalArtifactHashes,
  validateGlobalBroadcastRolloutConfig,
  verifyGlobalBroadcastPrivacyRollout,
} = require('./global_broadcast_privacy_rollout_verifier.cjs');
const {
  MODE: HOME_POLL_MODE,
  verifyHomePollV2RulesOverlay,
} = require('./home_poll_v2_rules_overlay_verifier.cjs');
const stages = [
  '1. Deploy safe functions and admin hosting',
  '2. Owner dry-run and idempotent scrub to zero unsafe documents',
  '3. Release the schema-constrained client query',
  '4. Verify the minimum supported app build/client floor externally',
  '5. Enable and deploy restrictive Firestore Rules',
];

function block(message, details = []) {
  process.stderr.write(`[global-broadcast-privacy] BLOCKED: ${message}\n`);
  if (details.length) process.stderr.write(`Failures: ${details.join('; ')}\n`);
  process.exit(1);
}

async function googleRulesGet(url, projectId) {
  const functionsRequire = createRequire(path.join(repoRoot, 'functions', 'package.json'));
  const { GoogleAuth } = functionsRequire('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const response = await client.request({ url, headers: { 'x-goog-user-project': projectId } });
  return response.data;
}

async function verifyExactHomePollOverlay() {
  const modeArg = process.argv.slice(2).find((arg) => arg.startsWith('--mode='));
  const projectArg = process.argv.slice(2).find((arg) => arg.startsWith('--project='));
  if (modeArg !== `--mode=${HOME_POLL_MODE}`) block('exact Home Poll v2 overlay requires --mode=exact-home-poll-v2-overlay.');
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'home-poll-v2-rules-overlay.json'), 'utf8'));
  const projectId = projectArg?.slice('--project='.length);
  if (projectId !== manifest.projectId) block('exact Home Poll v2 overlay project does not match the bound production project.');
  if (process.env.FIRESTORE_EMULATOR_HOST) block('production Rules overlay cannot run with a Firestore emulator override.');
  const release = await googleRulesGet(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`, projectId);
  const ruleset = await googleRulesGet(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`, projectId);
  const rulesFile = ruleset?.source?.files?.find((file) => file.name === 'firestore.rules') ?? ruleset?.source?.files?.[0];
  if (!rulesFile?.content) block('released Rules API source is missing.');
  const result = verifyHomePollV2RulesOverlay({
    mode: HOME_POLL_MODE,
    projectId,
    manifest,
    release,
    liveSource: rulesFile.content,
  });
  if (!result.ok) block('exact Home Poll v2 overlay does not match the bound live release.', result.errors);
  const outputDir = path.join(repoRoot, '.codex-tmp', 'handoff-134');
  fs.mkdirSync(outputDir, { recursive: true });
  const rulesPath = path.join(outputDir, 'poll-overlay-firestore.rules');
  const configOutputPath = path.join(outputDir, 'poll-overlay-firebase.json');
  fs.writeFileSync(rulesPath, result.overlaySource, 'utf8');
  fs.writeFileSync(configOutputPath, JSON.stringify({ firestore: { rules: 'poll-overlay-firestore.rules' } }, null, 2) + '\n', 'utf8');
  process.stdout.write(`[home-poll-v2-rules] READY: live ruleset=${release.rulesetName} liveSha256=${manifest.expectedLiveSha256} overlaySha256=${manifest.expectedOverlaySha256} addedLines=13 output=${rulesPath}\n`);
}

if (process.argv.slice(2).some((arg) => arg.startsWith('--mode='))) {
  try {
    await verifyExactHomePollOverlay();
    process.exit(0);
  } catch (error) {
    block(`cannot verify exact Home Poll v2 overlay: ${String(error)}`);
  }
}

let readiness;
let localArtifacts;
try {
  readiness = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  localArtifacts = computeGlobalBroadcastLocalArtifactHashes(repoRoot);
} catch (error) {
  block(`cannot load readiness inputs: ${String(error)}`);
}

process.stdout.write(`[global-broadcast-privacy] Mandatory release order:\n${stages.join('\n')}\n`);
const configErrors = validateGlobalBroadcastRolloutConfig(readiness, localArtifacts);
if (configErrors.length > 0) {
  block('restrictive Rules are not release-ready.', configErrors);
}
if (readiness.environment !== 'production' || process.env.FIRESTORE_EMULATOR_HOST) {
  block('Rules release evidence must be bound to production Firestore without an emulator override.');
}

let operation;
let state;
let audit;
try {
  const functionsRequire = createRequire(path.join(repoRoot, 'functions', 'package.json'));
  const { applicationDefault, getApps, initializeApp } = functionsRequire('firebase-admin/app');
  const { getFirestore } = functionsRequire('firebase-admin/firestore');
  const app = getApps().find((candidate) => candidate.name === 'global-broadcast-privacy-rules-guard')
    ?? initializeApp({ credential: applicationDefault(), projectId: readiness.projectId }, 'global-broadcast-privacy-rules-guard');
  const db = getFirestore(app);
  const operationId = readiness.verificationEvidence.operationId;
  const auditId = readiness.verificationEvidence.auditId;
  const [operationSnapshot, stateSnapshot, auditSnapshot] = await Promise.all([
    db.collection('admin_command_operations').doc(operationId).get(),
    db.collection('admin_config').doc('global_broadcast_privacy_state').get(),
    db.collection('admin_log').doc(auditId).get(),
  ]);
  if (!operationSnapshot.exists || !stateSnapshot.exists || !auditSnapshot.exists) {
    block('authoritative verification operation/state/audit is missing from Firestore.');
  }
  operation = operationSnapshot.data();
  state = stateSnapshot.data();
  audit = auditSnapshot.data();
} catch (error) {
  block(`cannot retrieve authoritative verification evidence from Firestore: ${String(error)}`);
}

const result = verifyGlobalBroadcastPrivacyRollout({
  config: readiness,
  operation,
  state,
  audit,
  localArtifacts,
  nowMs: Date.now(),
});
if (!result.ok) block('authoritative rollout evidence does not match current source or chronology.', result.errors);

process.stdout.write('[global-broadcast-privacy] READY: authoritative Firestore receipt, local artifacts, client floor, and approval chronology match. This guard does not deploy anything.\n');
