const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SHA256_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function readConstStringArray(source, name) {
  const match = source.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) throw new Error(`Cannot locate ${name}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function computeGlobalBroadcastLocalArtifactHashes(repoRoot) {
  const schemaSource = fs.readFileSync(path.join(repoRoot, 'functions/src/global_broadcast_public_schema.ts'), 'utf8');
  const versionMatch = schemaSource.match(/GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION\s*=\s*(\d+)/);
  if (!versionMatch) throw new Error('Cannot locate GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION');
  const schemaVersion = Number(versionMatch[1]);
  const fields = readConstStringArray(schemaSource, 'PUBLIC_GLOBAL_BROADCAST_FIELDS');
  const forbidden = readConstStringArray(schemaSource, 'FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS');
  return Object.freeze({
    schemaAllowlistHash: sha256(JSON.stringify({ schemaVersion, fields, forbidden })),
    functionArtifactHashes: Object.freeze({
      globalBroadcastClaimSourceSha256: sha256File(path.join(repoRoot, 'functions/src/global_broadcast_claim.ts')),
      globalBroadcastPublicSourceSha256: sha256File(path.join(repoRoot, 'functions/src/global_broadcast_public.ts')),
      communityPacksSourceSha256: sha256File(path.join(repoRoot, 'functions/src/community_packs.ts')),
    }),
    appQueryArtifact: Object.freeze({
      version: 'global-broadcast-callable-reader-v2',
      sourceSha256: sha256File(path.join(repoRoot, 'app/global_broadcast_modal.ts')),
    }),
  });
}

function isRow(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveFinite(value) {
  return Number.isFinite(value) && value > 0;
}

function exactObject(actual, expected) {
  if (!isRow(actual) || !isRow(expected)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
}

function validateGlobalBroadcastRolloutConfig(config, localArtifacts, nowMs = Date.now()) {
  const errors = [];
  if (!isRow(config) || config.schemaVersion !== 2) errors.push('config.schemaVersion');
  if (!isRow(config) || typeof config.projectId !== 'string' || !config.projectId.trim()) errors.push('config.projectId');
  if (!isRow(config) || config.environment !== 'production') errors.push('config.environment');
  for (const flag of ['functionsStageReady', 'scrubVerificationReady', 'schemaConstrainedClientReleased', 'minimumSupportedClientFloorVerified', 'rulesReleaseApproved']) {
    if (!isRow(config) || config[flag] !== true) errors.push(`config.${flag}`);
  }
  if (!isRow(localArtifacts) || !SHA256_RE.test(String(localArtifacts.schemaAllowlistHash ?? ''))
    || !isRow(localArtifacts.functionArtifactHashes)
    || !SHA256_RE.test(String(localArtifacts.functionArtifactHashes.globalBroadcastClaimSourceSha256 ?? ''))
    || !SHA256_RE.test(String(localArtifacts.functionArtifactHashes.globalBroadcastPublicSourceSha256 ?? ''))
    || !SHA256_RE.test(String(localArtifacts.functionArtifactHashes.communityPacksSourceSha256 ?? ''))
    || !isRow(localArtifacts.appQueryArtifact)
    || localArtifacts.appQueryArtifact.version !== 'global-broadcast-callable-reader-v2'
    || !SHA256_RE.test(String(localArtifacts.appQueryArtifact.sourceSha256 ?? ''))) {
    errors.push('localArtifacts');
    return errors;
  }
  const functionsStage = config.functionsStageEvidence;
  if (!isRow(functionsStage)
    || !isPositiveFinite(functionsStage.deployedAtMs)
    || !SHA256_RE.test(String(functionsStage.deploymentEvidenceSha256 ?? ''))
    || functionsStage.schemaAllowlistHash !== localArtifacts.schemaAllowlistHash
    || !exactObject(functionsStage.functionArtifactHashes, localArtifacts.functionArtifactHashes)) {
    errors.push('config.functionsStageEvidence');
  }
  const verification = config.verificationEvidence;
  if (!isRow(verification) || !TOKEN_RE.test(String(verification.operationId ?? '')) || !TOKEN_RE.test(String(verification.auditId ?? ''))) {
    errors.push('config.verificationEvidence');
  }
  const clientRelease = config.clientReleaseEvidence;
  if (!isRow(clientRelease)
    || !isPositiveFinite(clientRelease.releasedAtMs)
    || !SHA256_RE.test(String(clientRelease.releaseEvidenceSha256 ?? ''))
    || clientRelease.verificationOperationId !== verification?.operationId
    || !exactObject(clientRelease.appQueryArtifact, localArtifacts.appQueryArtifact)) {
    errors.push('config.clientReleaseEvidence');
  }
  const clientFloor = config.clientFloorEvidence;
  if (!isRow(clientFloor)
    || !isPositiveFinite(clientFloor.verifiedAtMs)
    || typeof clientFloor.minimumSupportedBuild !== 'string' || !clientFloor.minimumSupportedBuild.trim()
    || !SHA256_RE.test(String(clientFloor.floorEvidenceSha256 ?? ''))
    || clientFloor.verificationOperationId !== verification?.operationId
    || clientFloor.clientReleaseEvidenceSha256 !== clientRelease?.releaseEvidenceSha256
    || !exactObject(clientFloor.appQueryArtifact, localArtifacts.appQueryArtifact)) {
    errors.push('config.clientFloorEvidence');
  }
  const rulesApproval = config.rulesApprovalEvidence;
  if (!isRow(rulesApproval)
    || !isPositiveFinite(rulesApproval.approvedAtMs)
    || !SHA256_RE.test(String(rulesApproval.approvalEvidenceSha256 ?? ''))
    || rulesApproval.verificationOperationId !== verification?.operationId
    || rulesApproval.verificationAuditId !== verification?.auditId
    || rulesApproval.schemaAllowlistHash !== localArtifacts.schemaAllowlistHash
    || rulesApproval.clientFloorEvidenceSha256 !== clientFloor?.floorEvidenceSha256
    || !exactObject(rulesApproval.functionArtifactHashes, localArtifacts.functionArtifactHashes)
    || !exactObject(rulesApproval.appQueryArtifact, localArtifacts.appQueryArtifact)) {
    errors.push('config.rulesApprovalEvidence');
  }
  const chronology = [
    functionsStage?.deployedAtMs,
    clientRelease?.releasedAtMs,
    clientFloor?.verifiedAtMs,
    rulesApproval?.approvedAtMs,
  ];
  if (chronology.some((value) => !isPositiveFinite(value)) || Number(rulesApproval?.approvedAtMs) > nowMs) {
    errors.push('config.chronology');
  }
  return errors;
}

function verifyGlobalBroadcastPrivacyRollout({ config, operation, state, audit, localArtifacts, nowMs = Date.now() }) {
  const errors = validateGlobalBroadcastRolloutConfig(config, localArtifacts, nowMs);
  if (!isRow(operation)) errors.push('operation.missing');
  if (!isRow(state)) errors.push('state.missing');
  if (!isRow(audit)) errors.push('audit.missing');
  if (!isRow(operation) || !isRow(state) || !isRow(audit) || !isRow(config) || !isRow(localArtifacts)) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  const result = isRow(operation.result) ? operation.result : {};
  const receipt = isRow(result.verificationReceipt) ? result.verificationReceipt : {};
  const verificationEvidence = isRow(config.verificationEvidence) ? config.verificationEvidence : {};
  if (operation.action !== 'global_broadcast_privacy_verify') errors.push('operation.action');
  if (operation.actorUid !== receipt.actorUid || operation.auditId !== receipt.auditId) errors.push('operation.binding');
  if (verificationEvidence.operationId !== receipt.operationId || verificationEvidence.auditId !== receipt.auditId) errors.push('config.verificationBinding');
  if (result.ready !== true || result.complete !== true || result.truncated !== false || result.unsafeCount !== 0 || result.unknownCount !== 0) {
    errors.push('operation.result');
  }
  if (receipt.receiptType !== 'global_broadcast_privacy_final_v1' || receipt.scope !== 'aggregate' || receipt.complete !== true) errors.push('receipt.aggregate');
  if (receipt.projectId !== config.projectId || receipt.environment !== config.environment) errors.push('receipt.projectEnvironment');
  if (receipt.schemaVersion !== 1 || receipt.schemaAllowlistHash !== localArtifacts.schemaAllowlistHash) errors.push('receipt.schema');
  for (const count of ['scannedCount', 'unsafeCount', 'unknownCount', 'forbiddenCount', 'unvalidatedCount', 'wrongSchemaCount']) {
    if (!Number.isSafeInteger(receipt[count]) || receipt[count] < 0) errors.push(`receipt.${count}`);
  }
  for (const count of ['unsafeCount', 'unknownCount', 'forbiddenCount', 'unvalidatedCount', 'wrongSchemaCount']) {
    if (receipt[count] !== 0) errors.push(`receipt.${count}.nonzero`);
  }
  if (!exactObject(receipt.functionArtifactHashes, localArtifacts.functionArtifactHashes)) errors.push('receipt.functionArtifactHashes');
  if (!exactObject(receipt.appQueryArtifact, localArtifacts.appQueryArtifact)) errors.push('receipt.appQueryArtifact');
  if (!Number.isSafeInteger(receipt.generation) || receipt.generation < 0) errors.push('receipt.generation');
  if (state.generation !== receipt.generation || state.lastVerificationReady !== true
    || state.lastVerificationFinishedAtMs !== receipt.finishedAtMs
    || state.lastVerificationOperationId !== receipt.operationId
    || state.latestVerificationOperationId !== receipt.operationId
    || state.latestVerificationAuditId !== receipt.auditId) {
    errors.push('state.binding');
  }
  if (audit.action !== 'global_broadcast_privacy_verify' || audit.actorUid !== receipt.actorUid
    || audit.operationId !== receipt.operationId || audit.entity?.collection !== 'global_broadcast_modals'
    || audit.entity?.id !== 'aggregate' || Date.parse(String(audit.timestamp ?? '')) !== receipt.finishedAtMs) {
    errors.push('audit.binding');
  }
  const functionsAt = Number(config.functionsStageEvidence?.deployedAtMs);
  const startedAt = Number(receipt.startedAtMs);
  const finishedAt = Number(receipt.finishedAtMs);
  const releasedAt = Number(config.clientReleaseEvidence?.releasedAtMs);
  const floorAt = Number(config.clientFloorEvidence?.verifiedAtMs);
  const approvedAt = Number(config.rulesApprovalEvidence?.approvedAtMs);
  if (![functionsAt, startedAt, finishedAt, releasedAt, floorAt, approvedAt].every(isPositiveFinite)
    || !(functionsAt <= startedAt && startedAt <= finishedAt && finishedAt <= releasedAt && releasedAt <= floorAt && floorAt <= approvedAt && approvedAt <= nowMs)
    || Number(operation.createdAtMs) !== finishedAt) {
    errors.push('chronology');
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

module.exports = {
  computeGlobalBroadcastLocalArtifactHashes,
  sha256File,
  validateGlobalBroadcastRolloutConfig,
  verifyGlobalBroadcastPrivacyRollout,
};
