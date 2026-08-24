'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_PROJECT_ID = 'phraseman-ea0b3';
const TARGET_VERSION = 'tpool_20260808_v11';
const EXPECTED_TASK_COUNT = 4_000;
const MAX_CHUNK_SIZE = 400;
const TASKS_PER_MODE_SLICE = 40;
const BARRIER_KIND = 'tournament_task_pool_barrier_v1';
const BARRIER_COLLECTION = 'tournamentPrivateState';
const BARRIER_DOC = 'task_pool_generation_v1';
const TASKS_COLLECTION = 'tournamentTasks';
const ROOMS_COLLECTION = 'tournamentRooms';
const HASH = /^[a-f0-9]{64}$/;
const PROVENANCE = /^[^:\s]+:\d+:[^:\s]+$/;
const TARGET_BUCKET_COUNTS = Object.freeze({
  guess_phrase: 38,
  fill_gap: 13,
  find_oddity: 8,
  translate_build: 38,
  speed_match: 5,
});
const MODES = Object.freeze(Object.keys(TARGET_BUCKET_COUNTS));

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('canonical_value_invalid');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function canonicalSha256(value) {
  return sha256Text(canonical(value));
}

function assertHash(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) throw new Error(`${label}_invalid`);
  return value;
}

function tournamentV11TaskId(contentSha256) {
  assertHash(contentSha256, 'target_content_sha256');
  return `tv11_${sha256Text(`${TARGET_VERSION}\n${contentSha256}`)}`;
}

function taskIdsSha256(taskIds) {
  if (!Array.isArray(taskIds) || taskIds.some((id) => typeof id !== 'string')) {
    throw new Error('target_task_ids_invalid');
  }
  return canonicalSha256([...taskIds].sort());
}

function receiptLedgerSha256(receiptIndex) {
  if (!Array.isArray(receiptIndex)) throw new Error('target_receipt_index_invalid');
  const ledger = receiptIndex.map((row) => ({
    id: assertHash(row && row.semanticReceiptId, 'target_receipt_id'),
    sha256: assertHash(row && row.semanticReceiptSha256, 'target_receipt_sha256'),
  })).sort((left, right) => left.id.localeCompare(right.id));
  return canonicalSha256(ledger);
}

function exposureLayoutSha256(rows) {
  return canonicalSha256({
    counts: TARGET_BUCKET_COUNTS,
    entries: [...rows].sort((left, right) => left.id.localeCompare(right.id))
      .map((row) => ({ taskId: row.id, exposureBucket: row.data && row.data.exposureBucket })),
  });
}

function bundleSha256(rows, manifestSha256) {
  return canonicalSha256({
    poolVersion: TARGET_VERSION,
    manifestSha256: assertHash(manifestSha256, 'target_manifest_sha256'),
    tasks: [...rows].sort((left, right) => left.id.localeCompare(right.id)).map((row) => row.data),
  });
}

function finalizedPoolSha256(rows, pins) {
  return canonicalSha256({
    poolVersion: TARGET_VERSION,
    tasks: [...rows].sort((left, right) => left.id.localeCompare(right.id)).map((row) => row.data),
    taskCount: EXPECTED_TASK_COUNT,
    exposureBucketCounts: TARGET_BUCKET_COUNTS,
    exposureLayoutHash: pins.exposureLayoutHash,
    manifestSha256: pins.manifestSha256,
    bundleSha256: pins.bundleSha256,
    receiptLedgerSha256: pins.receiptLedgerSha256,
  });
}

function validateRuntimeAudit(audit, rows, pins) {
  if (!exactKeys(audit, [
    'kind', 'poolVersion', 'days', 'roomSeries', 'roomsSimulated', 'tasksPerRoom', 'taskCount',
    'bucketCount', 'maxAdjacentTaskOverlap', 'maxAdjacentProvenanceOverlap', 'provenanceCollisions',
    'fullTaskCoverage', 'fullBucketCoverage', 'speedBoardsChecked', 'speedBoardsWithSixProvenance',
    'taskIdsSha256', 'bucketIdsSha256', 'manifestSha256', 'bundleSha256', 'receiptLedgerSha256',
    'exposureLayoutHash', 'auditSha256',
  ]) || audit.kind !== 'tournament_pool_v11_runtime_audit_v1'
    || audit.poolVersion !== TARGET_VERSION || audit.days !== 730 || audit.roomSeries !== 2
    || audit.roomsSimulated !== 1_460 || audit.tasksPerRoom !== 16 || audit.taskCount !== EXPECTED_TASK_COUNT
    || audit.bucketCount !== Object.values(TARGET_BUCKET_COUNTS).reduce((sum, value) => sum + value, 0)
    || audit.maxAdjacentTaskOverlap !== 0 || audit.maxAdjacentProvenanceOverlap !== 0
    || audit.provenanceCollisions !== 0 || audit.fullTaskCoverage !== true || audit.fullBucketCoverage !== true
    || !Number.isSafeInteger(audit.speedBoardsChecked) || audit.speedBoardsChecked < 1
    || audit.speedBoardsWithSixProvenance !== audit.speedBoardsChecked
    || audit.taskIdsSha256 !== taskIdsSha256(rows.map((row) => row.id))
    || audit.bucketIdsSha256 !== canonicalSha256([...new Set(rows.map((row) => row.data.exposureBucket))].sort())
    || audit.manifestSha256 !== pins.manifestSha256 || audit.bundleSha256 !== pins.bundleSha256
    || audit.receiptLedgerSha256 !== pins.receiptLedgerSha256
    || audit.exposureLayoutHash !== pins.exposureLayoutHash
    || audit.auditSha256 !== canonicalSha256(Object.fromEntries(
      Object.entries(audit).filter(([key]) => key !== 'auditSha256'),
    ))) throw new Error('target_runtime_audit_invalid');
}

function chunkItems(items, requestedSize = MAX_CHUNK_SIZE) {
  if (!Array.isArray(items) || !Number.isSafeInteger(requestedSize) || requestedSize < 1) {
    throw new Error('chunk_items_invalid');
  }
  const size = Math.min(requestedSize, MAX_CHUNK_SIZE);
  const chunks = [];
  for (let offset = 0; offset < items.length; offset += size) chunks.push(items.slice(offset, offset + size));
  return chunks;
}

function resolveApplyIntent(argv = process.argv.slice(2), env = process.env) {
  if (!argv.includes('--apply')) return false;
  if (env.PHRASEMAN_TOURNAMENT_V11_APPLY !== '1') throw new Error('apply_guard_missing');
  return true;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0;
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

function validExplanation(explanation, optionCount, correctIndex) {
  return exactKeys(explanation, ['ruleNote', 'example', 'wrongOptionReasons'])
    && nonEmptyString(explanation.ruleNote) && nonEmptyString(explanation.example)
    && Array.isArray(explanation.wrongOptionReasons)
    && explanation.wrongOptionReasons.length === optionCount
    && explanation.wrongOptionReasons.every((reason, index) => (
      index === correctIndex ? reason === '' : nonEmptyString(reason)
    ));
}

function validCompleteRuntimePayload(task) {
  const payload = task.payload;
  const poolTags = Array.isArray(task && task.tags)
    ? task.tags.filter((tag) => typeof tag === 'string' && tag.startsWith('pool:')) : [];
  const parityTags = Array.isArray(task && task.tags)
    ? task.tags.filter((tag) => typeof tag === 'string' && tag.startsWith('provenance-parity:')) : [];
  if (!task || task.isVoice !== false || !Array.isArray(task.tags)
    || poolTags.length !== 1 || poolTags[0] !== `pool:${TARGET_VERSION}`
    || parityTags.length !== 1 || !/^provenance-parity:[01]$/.test(parityTags[0])
    || !payload || typeof payload !== 'object'
    || Array.isArray(payload) || !task.explanation) return false;
  if (task.mode === 'translate_build') {
    return exactKeys(payload, ['phrase', 'wordBank', 'correctTokens', 'correctTokenCount', 'correctAnswer'])
      && nonEmptyString(payload.phrase) && Array.isArray(payload.wordBank) && payload.wordBank.length >= 2
      && payload.wordBank.every(nonEmptyString) && Array.isArray(payload.correctTokens)
      && payload.correctTokens.length >= 1 && payload.correctTokens.every(nonEmptyString)
      && payload.correctTokenCount === payload.correctTokens.length
      && payload.correctAnswer === payload.correctTokens.join(' ')
      && validExplanation(task.explanation, 0, -1);
  }
  if (task.mode === 'speed_match') {
    if (!exactKeys(payload, ['prompt', 'items', 'rightOptions']) || !nonEmptyString(payload.prompt)
      || !Array.isArray(payload.items) || payload.items.length !== 6
      || !Array.isArray(payload.rightOptions) || payload.rightOptions.length !== 6
      || payload.rightOptions.some((value) => !nonEmptyString(value))
      || new Set(payload.rightOptions).size !== 6 || !validExplanation(task.explanation, 0, -1)) return false;
    return payload.items.every((item, index) => exactKeys(item, ['prompt', 'options', 'correctIndex', 'explanation'])
      && nonEmptyString(item.prompt) && Array.isArray(item.options)
      && canonical(item.options) === canonical(payload.rightOptions)
      && item.correctIndex === index && validExplanation(item.explanation, 6, index));
  }
  return exactKeys(payload, ['phrase', 'options', 'correctIndex'])
    && nonEmptyString(payload.phrase) && Array.isArray(payload.options) && payload.options.length === 4
    && payload.options.every(nonEmptyString) && new Set(payload.options).size === 4
    && Number.isInteger(payload.correctIndex) && payload.correctIndex >= 0 && payload.correctIndex < 4
    && validExplanation(task.explanation, 4, payload.correctIndex);
}

function validateTargetArtifacts(input) {
  const manifest = input && input.manifest;
  const rows = input && input.rows;
  const receiptIndex = input && input.receiptIndex;
  const pins = input && input.pins;
  const runtimeAudit = input && input.runtimeAudit;
  if (!manifest || manifest.kind !== 'tournament_pool_v11_dry_run_v1'
    || manifest.poolVersion !== TARGET_VERSION || manifest.reviewedTaskCount !== EXPECTED_TASK_COUNT
    || manifest.receiptCount !== EXPECTED_TASK_COUNT || manifest.productionWrites !== 0
    || manifest.providerCalls !== 0 || !manifest.gates || manifest.gates.exactTaskCount !== true
    || manifest.gates.exactReceiptCoverage !== true || manifest.gates.diversity !== true
    || manifest.gates.exposure730Days !== true || manifest.gates.exactRuntimeAudit !== true
    || manifest.gates.productionWrites !== 0
    || manifest.gates.providerCalls !== 0) {
    throw new Error('target_manifest_invalid');
  }
  for (const key of [
    'manifestSha256', 'bundleSha256', 'receiptLedgerSha256', 'exposureLayoutHash',
    'finalizedPoolSha256', 'runtimeAuditSha256',
  ]) {
    assertHash(pins && pins[key], `target_${key}`);
    if (!manifest.pins || manifest.pins[key] !== pins[key]) throw new Error(`target_${key.replace('Sha256', '_hash')}_mismatch`);
  }
  assertHash(pins && pins.taskIdsSha256, 'target_task_ids_sha256');
  assertHash(pins && pins.taskRowsSha256, 'target_task_rows_sha256');
  if (!Array.isArray(rows) || rows.length !== EXPECTED_TASK_COUNT) throw new Error('target_task_count_mismatch');
  if (!Array.isArray(receiptIndex) || receiptIndex.length !== EXPECTED_TASK_COUNT) {
    throw new Error('target_receipt_count_mismatch');
  }
  const byId = new Map();
  const bucketLoads = new Map();
  for (const row of rows) {
    const task = row && row.data;
    if (!row || typeof row.id !== 'string' || byId.has(row.id) || !task
      || task.taskId !== row.id || task.poolVersion !== TARGET_VERSION || task.verified !== true
      || task.source !== 'ai' || task.lifecycle !== 'published'
      || !validCompleteRuntimePayload(task)
      || !MODES.includes(task.mode) || !Number.isInteger(task.difficulty)
      || task.difficulty < 1 || task.difficulty > 3
      || !HASH.test(String(task.contentSha256 || ''))
      || row.id !== tournamentV11TaskId(task.contentSha256)
      || !HASH.test(String(task.semanticSignature || ''))
      || !HASH.test(String(task.semanticReceiptId || ''))
      || !HASH.test(String(task.semanticReceiptSha256 || ''))
      || !HASH.test(String(task.promptSetSha256 || ''))
      || typeof task.reviewContractVersion !== 'string' || !task.reviewContractVersion.trim()
      || !new RegExp(`^${TARGET_VERSION}:${task.mode}:\\d{3}$`).test(String(task.exposureBucket || ''))
      || !Array.isArray(task.provenanceKeys) || task.provenanceKeys.length < 1
      || task.provenanceKeys.length > 6 || task.provenanceKeys.some((key) => !PROVENANCE.test(key))
      || new Set(task.provenanceKeys).size !== task.provenanceKeys.length) {
      throw new Error(`target_task_invalid:${row && row.id}`);
    }
    byId.set(row.id, row);
    bucketLoads.set(task.exposureBucket, (bucketLoads.get(task.exposureBucket) || 0) + 1);
  }
  const expectedBucketCount = Object.values(TARGET_BUCKET_COUNTS).reduce((sum, count) => sum + count, 0);
  if (bucketLoads.size !== expectedBucketCount
    || [...bucketLoads.values()].some((count) => count > TASKS_PER_MODE_SLICE)) {
    throw new Error('target_exposure_bucket_limit');
  }
  const receiptsByTask = new Map();
  for (const receipt of receiptIndex) {
    if (!receipt || typeof receipt.taskId !== 'string' || receiptsByTask.has(receipt.taskId)
      || !byId.has(receipt.taskId)) throw new Error('target_receipt_index_invalid');
    const task = byId.get(receipt.taskId).data;
    if (receipt.semanticReceiptId !== task.semanticReceiptId
      || receipt.semanticReceiptSha256 !== task.semanticReceiptSha256) {
      throw new Error('target_receipt_binding_mismatch');
    }
    receiptsByTask.set(receipt.taskId, receipt);
  }
  if (receiptLedgerSha256(receiptIndex) !== pins.receiptLedgerSha256) {
    throw new Error('target_receipt_ledger_hash_mismatch');
  }
  const taskIds = [...byId.keys()].sort();
  if (taskIdsSha256(taskIds) !== pins.taskIdsSha256) throw new Error('target_task_ids_hash_mismatch');
  const sortedRows = taskIds.map((id) => byId.get(id));
  if (canonicalSha256(sortedRows) !== pins.taskRowsSha256) {
    throw new Error('target_task_rows_hash_mismatch');
  }
  if (exposureLayoutSha256(sortedRows) !== pins.exposureLayoutHash) {
    throw new Error('target_exposure_layout_hash_mismatch');
  }
  if (bundleSha256(sortedRows, pins.manifestSha256) !== pins.bundleSha256) {
    throw new Error('target_bundle_hash_mismatch');
  }
  if (finalizedPoolSha256(sortedRows, pins) !== pins.finalizedPoolSha256) {
    throw new Error('target_finalized_pool_hash_mismatch');
  }
  validateRuntimeAudit(runtimeAudit, sortedRows, pins);
  if (runtimeAudit.auditSha256 !== pins.runtimeAuditSha256) {
    throw new Error('target_runtime_audit_hash_mismatch');
  }
  return Object.freeze({
    rows: Object.freeze(sortedRows),
    taskIds: Object.freeze(taskIds),
    pins: Object.freeze({ ...pins }),
    runtimeAudit: Object.freeze({ ...runtimeAudit }),
  });
}

function sourceBarrierPin(barrier) {
  if (!barrier || barrier.kind !== BARRIER_KIND || barrier.state !== 'ready'
    || typeof barrier.generation !== 'string' || !barrier.generation.trim()
    || barrier.generation === TARGET_VERSION || !Number.isSafeInteger(barrier.revision)
    || barrier.revision < 0 || !HASH.test(String(barrier.exposureLayoutHash || ''))
    || !barrier.exposureBucketCounts || typeof barrier.exposureBucketCounts !== 'object') {
    throw new Error('source_barrier_invalid');
  }
  return Object.freeze({
    generation: barrier.generation,
    revision: barrier.revision,
    exposureLayoutHash: barrier.exposureLayoutHash,
    exposureBucketCounts: Object.freeze({ ...barrier.exposureBucketCounts }),
    barrierSha256: canonicalSha256(barrier),
  });
}

function assertPinnedSourceBarrier(actual, pin) {
  let parsed;
  try { parsed = sourceBarrierPin(actual); } catch (_error) { throw new Error('source_barrier_drift'); }
  if (!pin || parsed.generation !== pin.generation || parsed.revision !== pin.revision
    || parsed.exposureLayoutHash !== pin.exposureLayoutHash
    || canonical(parsed.exposureBucketCounts) !== canonical(pin.exposureBucketCounts)
    || parsed.barrierSha256 !== pin.barrierSha256) throw new Error('source_barrier_drift');
}

function roomTaskIds(data) {
  if (!data || !Array.isArray(data.rounds)) return [];
  return data.rounds.flatMap((round) => (round && Array.isArray(round.taskIds)
    ? round.taskIds.filter((id) => typeof id === 'string') : []));
}

function findBlockingRoomReferences(roomRows, protectedIds, nowMs = Date.now()) {
  const terminal = new Set(['closed', 'cancelled']);
  const blockers = [];
  for (const row of roomRows || []) {
    const data = row && row.data;
    if (!roomTaskIds(data).some((id) => protectedIds.has(id))) continue;
    const state = typeof data.state === 'string' ? data.state : '';
    const startsAt = Number(data.startsAtMs ?? data.startsAt ?? 0);
    if (!terminal.has(state) || !Number.isFinite(startsAt) || startsAt > nowMs) {
      blockers.push({ roomId: String(row.id || ''), state: state || 'malformed' });
    }
  }
  return blockers;
}

function exactRows(rows, label) {
  if (!Array.isArray(rows)) throw new Error(`${label}_invalid`);
  const byId = new Map();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id || !row.data || byId.has(row.id)) {
      throw new Error(`${label}_invalid`);
    }
    byId.set(row.id, row);
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function createRollbackArtifact(sourceBarrier, sourceRows, target, targetBarrier) {
  const sortedSource = exactRows(sourceRows, 'source_backup_rows');
  const targetIds = new Set(target.taskIds);
  if (sortedSource.some((row) => targetIds.has(row.id))) throw new Error('source_target_id_overlap');
  const body = {
    kind: 'tournament_pool_v11_rollback_artifact_v1',
    sourceBarrier,
    sourceBarrierSha256: canonicalSha256(sourceBarrier),
    sourceRows: sortedSource,
    sourceRowsSha256: canonicalSha256(sortedSource),
    targetBarrier,
    targetBarrierSha256: canonicalSha256(targetBarrier),
    target: {
      poolVersion: TARGET_VERSION,
      taskCount: EXPECTED_TASK_COUNT,
      taskIds: [...target.taskIds],
      taskIdsSha256: target.pins.taskIdsSha256,
      taskRowsSha256: target.pins.taskRowsSha256,
      manifestSha256: target.pins.manifestSha256,
      bundleSha256: target.pins.bundleSha256,
      receiptLedgerSha256: target.pins.receiptLedgerSha256,
      exposureLayoutHash: target.pins.exposureLayoutHash,
      finalizedPoolSha256: target.pins.finalizedPoolSha256,
      runtimeAuditSha256: target.pins.runtimeAuditSha256,
      runtimeAudit: target.runtimeAudit,
      rows: target.rows,
      rowsSha256: canonicalSha256(target.rows),
    },
  };
  return Object.freeze({ ...body, backupSha256: canonicalSha256(body) });
}

function validateRollbackArtifact(artifact, expectedBackupSha256) {
  assertHash(expectedBackupSha256, 'expected_backup_sha256');
  if (!artifact || artifact.kind !== 'tournament_pool_v11_rollback_artifact_v1') {
    throw new Error('rollback_artifact_invalid');
  }
  const { backupSha256, ...body } = artifact;
  if (backupSha256 !== expectedBackupSha256 || canonicalSha256(body) !== expectedBackupSha256) {
    throw new Error('rollback_artifact_hash_mismatch');
  }
  if (canonicalSha256(artifact.sourceBarrier) !== artifact.sourceBarrierSha256
    || canonicalSha256(artifact.sourceRows) !== artifact.sourceRowsSha256
    || canonicalSha256(artifact.targetBarrier) !== artifact.targetBarrierSha256
    || !exactKeys(artifact.targetBarrier, [
      'kind', 'state', 'generation', 'revision', 'exposureBucketCounts', 'exposureLayoutHash',
      'taskCount', 'manifestSha256', 'bundleSha256', 'receiptLedgerSha256',
      'finalizedPoolSha256', 'runtimeAuditSha256', 'releasedAt',
    ])
    || artifact.targetBarrier.kind !== BARRIER_KIND || artifact.targetBarrier.state !== 'ready'
    || artifact.targetBarrier.generation !== TARGET_VERSION
    || !Number.isSafeInteger(artifact.targetBarrier.revision)
    || artifact.targetBarrier.revision !== artifact.sourceBarrier.revision + 2
    || canonical(artifact.targetBarrier.exposureBucketCounts) !== canonical(TARGET_BUCKET_COUNTS)
    || artifact.targetBarrier.taskCount !== EXPECTED_TASK_COUNT
    || !nonEmptyString(artifact.targetBarrier.releasedAt)
    || !artifact.target || artifact.target.poolVersion !== TARGET_VERSION
    || artifact.target.taskCount !== EXPECTED_TASK_COUNT
    || artifact.target.taskIds.length !== EXPECTED_TASK_COUNT
    || new Set(artifact.target.taskIds).size !== EXPECTED_TASK_COUNT
    || taskIdsSha256(artifact.target.taskIds) !== artifact.target.taskIdsSha256
    || artifact.target.taskRowsSha256 !== artifact.target.rowsSha256
    || canonicalSha256(artifact.target.rows) !== artifact.target.rowsSha256
    || finalizedPoolSha256(artifact.target.rows, artifact.target) !== artifact.target.finalizedPoolSha256
    || artifact.target.rows.length !== EXPECTED_TASK_COUNT) {
    throw new Error('rollback_artifact_invalid');
  }
  validateRuntimeAudit(artifact.target.runtimeAudit, artifact.target.rows, artifact.target);
  if (artifact.target.runtimeAudit.auditSha256 !== artifact.target.runtimeAuditSha256) {
    throw new Error('rollback_artifact_invalid');
  }
  if (artifact.targetBarrier.exposureLayoutHash !== artifact.target.exposureLayoutHash
    || artifact.targetBarrier.manifestSha256 !== artifact.target.manifestSha256
    || artifact.targetBarrier.bundleSha256 !== artifact.target.bundleSha256
    || artifact.targetBarrier.receiptLedgerSha256 !== artifact.target.receiptLedgerSha256
    || artifact.targetBarrier.finalizedPoolSha256 !== artifact.target.finalizedPoolSha256
    || artifact.targetBarrier.runtimeAuditSha256 !== artifact.target.runtimeAuditSha256) {
    throw new Error('rollback_artifact_invalid');
  }
  sourceBarrierPin(artifact.sourceBarrier);
  return Object.freeze({
    sourceBarrier: artifact.sourceBarrier,
    sourceRows: exactRows(artifact.sourceRows, 'rollback_source_rows'),
    targetBarrier: artifact.targetBarrier,
    targetBarrierSha256: artifact.targetBarrierSha256,
    target: artifact.target,
    backupSha256,
  });
}

function migratingBarrier(source, target, backupSha256, now) {
  return Object.freeze({
    ...source,
    state: 'migrating',
    revision: source.revision + 1,
    targetGeneration: TARGET_VERSION,
    migrationId: `apply:${backupSha256}`,
    acquiredAt: now,
    taskCount: EXPECTED_TASK_COUNT,
    manifestSha256: target.pins.manifestSha256,
    bundleSha256: target.pins.bundleSha256,
    receiptLedgerSha256: target.pins.receiptLedgerSha256,
    finalizedPoolSha256: target.pins.finalizedPoolSha256,
    runtimeAuditSha256: target.pins.runtimeAuditSha256,
    targetExposureLayoutHash: target.pins.exposureLayoutHash,
  });
}

function targetReadyBarrier(migrating, target, now) {
  return Object.freeze({
    kind: BARRIER_KIND,
    state: 'ready',
    generation: TARGET_VERSION,
    revision: migrating.revision + 1,
    exposureBucketCounts: TARGET_BUCKET_COUNTS,
    exposureLayoutHash: target.pins.exposureLayoutHash,
    taskCount: EXPECTED_TASK_COUNT,
    manifestSha256: target.pins.manifestSha256,
    bundleSha256: target.pins.bundleSha256,
    receiptLedgerSha256: target.pins.receiptLedgerSha256,
    finalizedPoolSha256: target.pins.finalizedPoolSha256,
    runtimeAuditSha256: target.pins.runtimeAuditSha256,
    releasedAt: now,
  });
}

function assertNoBlockers(rooms, ids, phase, nowMs) {
  const blockers = findBlockingRoomReferences(rooms, ids, nowMs);
  if (blockers.length) throw new Error(`${phase}_protected_room_references:${blockers.length}`);
}

function assertRowsEqual(actualRows, expectedRows, label) {
  const actual = exactRows(actualRows, label);
  const expected = exactRows(expectedRows, label);
  if (canonical(actual) !== canonical(expected)) throw new Error(`${label}_mismatch`);
}

async function executeApply(options) {
  const target = validateTargetArtifacts(options.target);
  const actualSource = await options.adapter.readBarrier();
  assertPinnedSourceBarrier(actualSource, options.sourcePin);
  const targetIds = new Set(target.taskIds);
  assertNoBlockers(await options.adapter.readRooms(), targetIds, 'apply_preflight', options.nowMs);
  const currentRows = exactRows(await options.adapter.readAllTasks(), 'current_pool_rows');
  if (currentRows.some((row) => targetIds.has(row.id))) throw new Error('target_ids_already_present');
  if (!options.apply) {
    const now = options.now || new Date().toISOString();
    const plannedReady = targetReadyBarrier({ revision: actualSource.revision + 1 }, target, now);
    const generatedArtifact = createRollbackArtifact(actualSource, currentRows, target, plannedReady);
    return Object.freeze({
      mode: 'preflight', productionWrites: 0, targetTaskCount: EXPECTED_TASK_COUNT,
      rollbackArtifact: generatedArtifact,
    });
  }
  const artifact = validateRollbackArtifact(options.rollbackArtifact, options.expectedBackupSha256);
  const expectedReady = targetReadyBarrier(
    { revision: actualSource.revision + 1 }, target, artifact.targetBarrier.releasedAt,
  );
  if (canonical(artifact.sourceBarrier) !== canonical(actualSource)
    || canonical(artifact.sourceRows) !== canonical(currentRows)
    || canonical(artifact.target.taskIds) !== canonical(target.taskIds)
    || artifact.target.taskRowsSha256 !== target.pins.taskRowsSha256
    || artifact.target.rowsSha256 !== canonicalSha256(target.rows)
    || canonical(artifact.targetBarrier) !== canonical(expectedReady)) {
    throw new Error('apply_rollback_artifact_drift');
  }
  const now = artifact.targetBarrier.releasedAt;
  const acquired = migratingBarrier(actualSource, target, artifact.backupSha256, now);
  await options.adapter.acquireBarrier(actualSource, acquired);
  assertRowsEqual(
    await options.adapter.readAllTasks(),
    currentRows,
    'source_post_acquire',
  );
  assertNoBlockers(await options.adapter.readRooms(), targetIds, 'apply_post_acquire', options.nowMs);
  for (const chunk of chunkItems(target.rows)) await options.adapter.createTasks(chunk);
  const readBack = [];
  for (const ids of chunkItems(target.taskIds)) readBack.push(...await options.adapter.readTasks(ids));
  assertRowsEqual(readBack, target.rows, 'target_read_back');
  assertRowsEqual(
    await options.adapter.readAllTasks(),
    [...currentRows, ...target.rows],
    'apply_final_rows',
  );
  const ready = artifact.targetBarrier;
  await options.adapter.switchBarrier(acquired, ready);
  const barrierReadBack = await options.adapter.readBarrier();
  if (canonical(barrierReadBack) !== canonical(ready)) throw new Error('target_barrier_read_back_mismatch');
  return Object.freeze({
    mode: 'apply', productionWrites: EXPECTED_TASK_COUNT + 2,
    targetBarrier: ready, rollbackArtifact: options.rollbackArtifact,
  });
}

function argValue(name, argv = process.argv.slice(2)) {
  const prefix = `--${name}=`;
  const value = argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

function requiredArg(name, argv) {
  const value = argValue(name, argv);
  if (!value) throw new Error(`${name}_required`);
  return value;
}

function parseNdjson(raw, label) {
  const text = raw.toString('utf8');
  if (!text.endsWith('\n') || !text.trim()) throw new Error(`${label}_invalid`);
  return text.trim().split('\n').map((line, index) => {
    try { return JSON.parse(line); } catch (_error) { throw new Error(`${label}_parse:${index + 1}`); }
  });
}

function sourcePinFromArgs(argv) {
  const revision = Number(requiredArg('expected-source-revision', argv));
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('expected-source-revision_invalid');
  return {
    generation: requiredArg('expected-source-generation', argv),
    revision,
    exposureLayoutHash: assertHash(requiredArg('expected-source-layout-sha', argv), 'expected_source_layout_sha'),
    exposureBucketCounts: JSON.parse(requiredArg('expected-source-bucket-counts', argv)),
    barrierSha256: assertHash(requiredArg('expected-source-barrier-sha', argv), 'expected_source_barrier_sha'),
  };
}

function targetPinsFromArgs(argv) {
  return {
    manifestSha256: assertHash(requiredArg('expected-manifest-sha', argv), 'expected_manifest_sha'),
    bundleSha256: assertHash(requiredArg('expected-bundle-sha', argv), 'expected_bundle_sha'),
    receiptLedgerSha256: assertHash(requiredArg('expected-receipt-ledger-sha', argv), 'expected_receipt_ledger_sha'),
    exposureLayoutHash: assertHash(requiredArg('expected-exposure-layout-sha', argv), 'expected_exposure_layout_sha'),
    finalizedPoolSha256: assertHash(requiredArg('expected-finalized-pool-sha', argv), 'expected_finalized_pool_sha'),
    runtimeAuditSha256: assertHash(requiredArg('expected-runtime-audit-sha', argv), 'expected_runtime_audit_sha'),
    taskIdsSha256: assertHash(requiredArg('expected-task-ids-sha', argv), 'expected_task_ids_sha'),
    taskRowsSha256: assertHash(requiredArg('expected-task-rows-sha', argv), 'expected_task_rows_sha'),
  };
}

function encodeFirestoreValue(value, admin) {
  if (value === null || value === undefined || typeof value === 'string'
    || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Buffer.isBuffer(value)) return { __firestoreType: 'bytes', base64: value.toString('base64') };
  if (value instanceof admin.firestore.Timestamp) {
    return { __firestoreType: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return { __firestoreType: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return { __firestoreType: 'reference', path: value.path };
  }
  if (Array.isArray(value)) return value.map((entry) => encodeFirestoreValue(entry, admin));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeFirestoreValue(entry, admin)]));
  }
  throw new Error('firestore_value_invalid');
}

function decodeFirestoreValue(value, admin, db) {
  if (value === null || value === undefined || typeof value === 'string'
    || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((entry) => decodeFirestoreValue(entry, admin, db));
  if (value.__firestoreType === 'bytes') return Buffer.from(value.base64, 'base64');
  if (value.__firestoreType === 'timestamp') return new admin.firestore.Timestamp(value.seconds, value.nanoseconds);
  if (value.__firestoreType === 'geopoint') return new admin.firestore.GeoPoint(value.latitude, value.longitude);
  if (value.__firestoreType === 'reference') return db.doc(value.path);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decodeFirestoreValue(entry, admin, db)]));
}

function createFirebaseAdapter(admin, db) {
  const barrierRef = db.collection(BARRIER_COLLECTION).doc(BARRIER_DOC);
  const tasks = db.collection(TASKS_COLLECTION);
  const rooms = db.collection(ROOMS_COLLECTION);
  const encode = (value) => encodeFirestoreValue(value, admin);
  const decode = (value) => decodeFirestoreValue(value, admin, db);
  const readPaged = async (collection, pageSize) => {
    const rows = [];
    let cursor;
    do {
      let query = collection.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      rows.push(...snapshot.docs.map((doc) => ({ id: doc.id, data: encode(doc.data()) })));
      cursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < pageSize) break;
    } while (cursor);
    return rows;
  };
  const exactTransaction = async (expected, next) => db.runTransaction(async (tx) => {
    const snap = await tx.get(barrierRef);
    if (!snap.exists || canonical(encode(snap.data())) !== canonical(expected)) throw new Error('barrier_transaction_drift');
    tx.set(barrierRef, decode(next));
  });
  return {
    async readBarrier() {
      const snap = await barrierRef.get();
      if (!snap.exists) throw new Error('source_barrier_missing');
      return encode(snap.data());
    },
    readAllTasks: () => readPaged(tasks, MAX_CHUNK_SIZE),
    readRooms: () => readPaged(rooms, 200),
    acquireBarrier: exactTransaction,
    switchBarrier: exactTransaction,
    async createTasks(rows) {
      if (rows.length > MAX_CHUNK_SIZE) throw new Error('write_chunk_too_large');
      const batch = db.batch();
      rows.forEach((row) => batch.create(tasks.doc(row.id), decode(row.data)));
      await batch.commit();
    },
    async restoreTasks(rows) {
      if (rows.length > MAX_CHUNK_SIZE) throw new Error('restore_chunk_too_large');
      const batch = db.batch();
      rows.forEach((row) => batch.create(tasks.doc(row.id), decode(row.data)));
      await batch.commit();
    },
    async readTasks(ids) {
      if (ids.length > MAX_CHUNK_SIZE) throw new Error('read_chunk_too_large');
      const snapshots = await db.getAll(...ids.map((id) => tasks.doc(id)));
      return snapshots.filter((snap) => snap.exists).map((snap) => ({ id: snap.id, data: encode(snap.data()) }));
    },
    async deleteTasks(ids) {
      if (ids.length > MAX_CHUNK_SIZE) throw new Error('delete_chunk_too_large');
      const snapshots = await db.getAll(...ids.map((id) => tasks.doc(id)));
      if (snapshots.some((snap) => !snap.exists)) throw new Error('delete_task_disappeared');
      const batch = db.batch();
      snapshots.forEach((snap) => batch.delete(snap.ref, { lastUpdateTime: snap.updateTime }));
      await batch.commit();
    },
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = resolveApplyIntent(argv, process.env);
  const artifactDir = path.resolve(requiredArg('artifact-dir', argv));
  const rollbackPath = path.resolve(requiredArg('rollback-artifact', argv));
  const manifest = JSON.parse(fs.readFileSync(path.join(artifactDir, 'manifest.json'), 'utf8'));
  const tasks = parseNdjson(fs.readFileSync(path.join(artifactDir, 'reviewed-tasks.ndjson')), 'reviewed_tasks')
    .map((reviewed) => {
      if (!reviewed || typeof reviewed.candidateId !== 'string' || !reviewed.task) {
        throw new Error('reviewed_task_artifact_invalid');
      }
      return { id: reviewed.task.taskId, data: reviewed.task };
    });
  const receiptIndex = JSON.parse(fs.readFileSync(path.join(artifactDir, 'receipt-index.json'), 'utf8'));
  const runtimeAudit = JSON.parse(fs.readFileSync(path.join(artifactDir, 'exposure-report.json'), 'utf8'));
  const target = { manifest, rows: tasks, receiptIndex, runtimeAudit, pins: targetPinsFromArgs(argv) };
  const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(requiredArg('service-account', argv)), 'utf8'));
  assert.equal(serviceAccount.project_id, EXPECTED_PROJECT_ID, 'service_account_project_mismatch');
  const admin = require('../functions/node_modules/firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: EXPECTED_PROJECT_ID });
  const adapter = createFirebaseAdapter(admin, admin.firestore());
  const options = { adapter, target, sourcePin: sourcePinFromArgs(argv), apply };
  if (apply) {
    options.rollbackArtifact = JSON.parse(fs.readFileSync(rollbackPath, 'utf8'));
    options.expectedBackupSha256 = assertHash(requiredArg('expected-backup-sha', argv), 'expected_backup_sha');
  }
  const result = await executeApply(options);
  if (!apply) fs.writeFileSync(rollbackPath, `${JSON.stringify(result.rollbackArtifact, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ ...result, rollbackArtifact: undefined })}\n`);
}

module.exports = {
  BARRIER_COLLECTION,
  BARRIER_DOC,
  BARRIER_KIND,
  EXPECTED_TASK_COUNT,
  MAX_CHUNK_SIZE,
  TASKS_PER_MODE_SLICE,
  TARGET_BUCKET_COUNTS,
  TARGET_VERSION,
  assertPinnedSourceBarrier,
  bundleSha256,
  finalizedPoolSha256,
  canonical,
  canonicalSha256,
  chunkItems,
  createFirebaseAdapter,
  createRollbackArtifact,
  executeApply,
  exposureLayoutSha256,
  findBlockingRoomReferences,
  migratingBarrier,
  receiptLedgerSha256,
  resolveApplyIntent,
  sourceBarrierPin,
  targetReadyBarrier,
  taskIdsSha256,
  tournamentV11TaskId,
  validateRollbackArtifact,
  validateTargetArtifacts,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
