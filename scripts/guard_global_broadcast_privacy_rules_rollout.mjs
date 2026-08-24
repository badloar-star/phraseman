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
