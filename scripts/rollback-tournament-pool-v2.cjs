'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const admin = require('../functions/node_modules/firebase-admin');
const {
  EXPECTED_VERSION,
  POOL_BARRIER_COLLECTION,
  POOL_BARRIER_DOC,
  POOL_BARRIER_KIND,
  assertTranslateBuildSemantics,
  findBlockingRoomReferences,
  parsePoolBarrier,
  releasePoolMigrationBarrier,
  resolveSourceGeneration,
} = require('./apply-tournament-pool-v2.cjs');

const EXPECTED_PROJECT_ID = 'phraseman-ea0b3';
const COLLECTION = 'tournamentTasks';
const ROOMS_COLLECTION = 'tournamentRooms';

function argValue(name, argv = process.argv.slice(2)) {
  const prefix = `--${name}=`;
  const arg = argv.find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function pinnedSha(name, argv) {
  const value = String(argValue(name, argv) || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`${name}_pin_required`);
  return value;
}

function resolveRollbackIntent(argv = process.argv.slice(2), env = process.env) {
  if (!argv.includes('--apply')) return false;
  if (env.PHRASEMAN_TOURNAMENT_POOL_V8_ROLLBACK !== '1') throw new Error('rollback_guard_missing');
  return true;
}

function barrierValue(value, fallback = 'none') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function rollbackManualRecoveryError(reason, barrier) {
  const evidence = barrier || {};
  return new Error(`rollback_manual_recovery_required:${reason}`
    + `:state=${barrierValue(evidence.state, barrier ? 'invalid' : 'missing')}`
    + `:generation=${barrierValue(evidence.generation)}`
    + `:target=${barrierValue(evidence.targetGeneration)}`
    + `:migrationId=${barrierValue(evidence.migrationId)}`
    + `:revision=${Number.isSafeInteger(evidence.revision) ? evidence.revision : 'invalid'}`);
}

async function acquirePoolRollbackBarrier(db, options) {
  const expectedGeneration = barrierValue(options.expectedGeneration, '');
  const targetGeneration = barrierValue(options.targetGeneration, '');
  const migrationId = barrierValue(options.migrationId, '');
  const interruptedApply = options.interruptedApply || {};
  if (!expectedGeneration || !targetGeneration || !migrationId
    || !barrierValue(interruptedApply.expectedGeneration, '')
    || !barrierValue(interruptedApply.targetGeneration, '')
    || !barrierValue(interruptedApply.migrationId, '')) {
    throw new Error('rollback_barrier_contract_invalid');
  }
  const acquiredAt = options.acquiredAt || new Date().toISOString();
  const ref = db.collection(POOL_BARRIER_COLLECTION).doc(POOL_BARRIER_DOC);
  return db.runTransaction(async (tx) => {
    let current;
    const snapshot = await tx.get(ref);
    try {
      current = parsePoolBarrier(snapshot);
    } catch (_error) {
      throw rollbackManualRecoveryError('barrier_invalid', snapshot.exists ? snapshot.data() : null);
    }
    if (!current) throw rollbackManualRecoveryError('barrier_missing', null);

    if (current.state === 'migrating'
      && current.generation === expectedGeneration
      && current.targetGeneration === targetGeneration
      && current.migrationId === migrationId) {
      return {
        generation: current.generation,
        revision: current.revision,
        resumed: true,
        recoveredInterruptedApply: false,
      };
    }

    const isInterruptedPinnedApply = current.state === 'migrating'
      && current.generation === interruptedApply.expectedGeneration
      && current.targetGeneration === interruptedApply.targetGeneration
      && current.migrationId === interruptedApply.migrationId;
    if (isInterruptedPinnedApply) {
      const revision = current.revision + 1;
      tx.set(ref, {
        kind: POOL_BARRIER_KIND,
        state: 'migrating',
        generation: expectedGeneration,
        targetGeneration,
        migrationId,
        revision,
        acquiredAt,
        recoveredFromMigrationId: current.migrationId,
        recoveredFromGeneration: current.generation,
        recoveredFromTargetGeneration: current.targetGeneration,
        recoveredFromRevision: current.revision,
      });
      return {
        generation: expectedGeneration,
        revision,
        resumed: false,
        recoveredInterruptedApply: true,
      };
    }

    if (current.state === 'ready' && current.generation === expectedGeneration) {
      const revision = current.revision + 1;
      tx.set(ref, {
        kind: POOL_BARRIER_KIND,
        state: 'migrating',
        generation: expectedGeneration,
        targetGeneration,
        migrationId,
        revision,
        acquiredAt,
      });
      return {
        generation: expectedGeneration,
        revision,
        resumed: false,
        recoveredInterruptedApply: false,
      };
    }

    throw rollbackManualRecoveryError('unknown_barrier_owner', current);
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encode(value) {
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
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry)]));
  }
  throw new Error(`unsupported_firestore_value:${typeof value}`);
}

function decode(value, db) {
  if (value === null || value === undefined || typeof value === 'string'
    || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((entry) => decode(entry, db));
  if (value.__firestoreType === 'bytes') return Buffer.from(value.base64, 'base64');
  if (value.__firestoreType === 'timestamp') {
    return new admin.firestore.Timestamp(value.seconds, value.nanoseconds);
  }
  if (value.__firestoreType === 'geopoint') {
    return new admin.firestore.GeoPoint(value.latitude, value.longitude);
  }
  if (value.__firestoreType === 'reference') return db.doc(value.path);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decode(entry, db)]));
}

function parseNdjson(raw, label) {
  const text = raw.toString('utf8');
  if (!text.endsWith('\n') || text.trim().length === 0) throw new Error(`${label}_ndjson_invalid`);
  return text.trim().split('\n').map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (_error) {
      throw new Error(`${label}_ndjson_parse:${index + 1}`);
    }
  });
}

function assertRollbackTranslateBuildSemantics(rows) {
  assertTranslateBuildSemantics(rows, [1, 2]);
}

async function assertNoProtectedRoomReferences(db, removableIds, phase) {
  const snapshot = await db.collection(ROOMS_COLLECTION).get();
  const rows = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  const blockers = findBlockingRoomReferences(rows, removableIds);
  if (blockers.length > 0) {
    const sample = blockers.slice(0, 5).map((room) => `${room.roomId}:${room.state || 'malformed'}`).join(',');
    throw new Error(`${phase}_protected_room_references:${blockers.length}:${sample}`);
  }
  return snapshot.size;
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = resolveRollbackIntent(argv, process.env);
  const manifestArg = argValue('manifest', argv);
  if (!manifestArg) throw new Error('manifest_required');
  const expectedBackupSha = pinnedSha('expected-backup-sha', argv);
  const expectedNewSha = pinnedSha('expected-new-sha', argv);
  const manifestPath = path.resolve(manifestArg);
  const serviceAccountPath = path.resolve(argValue('service-account', argv) || 'service-account.json');
  const requestedReportPath = argValue('report', argv);
  const rawManifest = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(rawManifest.toString('utf8'));
  assert.equal(manifest.kind, 'tournament_pool_v2_replacement_dry_run_v1');
  assert.equal(manifest.projectId, EXPECTED_PROJECT_ID);
  assert.equal(manifest.generated.poolVersion, EXPECTED_VERSION);
  assert.equal(manifest.gates.oldPoolUntouched, true);
  assert.equal(manifest.gates.productionWritesPerformed, 0);
  const backupPath = path.join(path.dirname(manifestPath), manifest.artifacts.backupFile);
  const newPath = path.join(path.dirname(manifestPath), manifest.artifacts.newPoolFile);
  const rawBackup = fs.readFileSync(backupPath);
  const rawNew = fs.readFileSync(newPath);
  assert.equal(sha256(rawBackup), expectedBackupSha, 'backup_hash_pin_mismatch');
  assert.equal(sha256(rawNew), expectedNewSha, 'new_pool_hash_pin_mismatch');
  assert.equal(manifest.artifacts.backupSha256, expectedBackupSha, 'manifest_backup_hash_mismatch');
  assert.equal(manifest.artifacts.newPoolSha256, expectedNewSha, 'manifest_new_pool_hash_mismatch');
  const oldRows = parseNdjson(rawBackup, 'backup');
  const newRows = parseNdjson(rawNew, 'new_pool');
  const targetGeneration = resolveSourceGeneration(oldRows);
  const sourceReadyBarrier = manifest.productionRead && manifest.productionRead.poolBarrier;
  assert.equal(sourceReadyBarrier && sourceReadyBarrier.generation, targetGeneration,
    'rollback_source_barrier_generation_mismatch');
  assert.equal(oldRows.length, manifest.productionRead.existingDocuments, 'backup_count_mismatch');
  assert.equal(newRows.length, manifest.generated.taskCount, 'new_pool_count_mismatch');
  assert.equal(manifest.generated.taskCount, 4000, 'new_pool_count_pin_mismatch');
  assert.equal(new Set(oldRows.map((row) => row.id)).size, oldRows.length, 'backup_duplicate_ids');
  assert.equal(new Set(newRows.map((row) => row.id)).size, newRows.length, 'new_pool_duplicate_ids');
  assert.equal(newRows.every((row) => row.id === row.data.taskId
    && row.data.poolVersion === EXPECTED_VERSION), true, 'new_pool_version_pin_mismatch');
  assertRollbackTranslateBuildSemantics(newRows);
  const oldIds = new Set(oldRows.map((row) => row.id));
  const newIds = new Set(newRows.map((row) => row.id));
  assert.equal([...oldIds].some((id) => newIds.has(id)), false, 'old_new_id_overlap');
  const manifestSha256 = sha256(rawManifest);

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  assert.equal(serviceAccount.project_id, EXPECTED_PROJECT_ID, 'service_account_project_mismatch');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id });
  assert.equal(admin.app().options.projectId, EXPECTED_PROJECT_ID, 'initialized_project_mismatch');
  const db = admin.firestore();
  const collection = db.collection(COLLECTION);
  const current = await collection.get();
  const unexpected = current.docs.filter((doc) => !oldIds.has(doc.id) && !newIds.has(doc.id));
  assert.equal(unexpected.length, 0, `rollback_unexpected_documents:${unexpected.length}`);
  const currentById = new Map(current.docs.map((doc) => [doc.id, doc]));
  for (const row of oldRows) {
    const existing = currentById.get(row.id);
    if (existing) assert.deepStrictEqual(encode(existing.data()), row.data, `old_doc_changed:${row.id}`);
  }
  for (const row of newRows) {
    const existing = currentById.get(row.id);
    if (existing) assert.deepStrictEqual(encode(existing.data()), row.data, `new_doc_changed:${row.id}`);
  }
  const roomsScanned = await assertNoProtectedRoomReferences(db, newIds, 'rollback_preflight');
  const missingOld = oldRows.filter((row) => !currentById.has(row.id));
  const stagedNewDocs = current.docs.filter((doc) => newIds.has(doc.id));
  const preflightReport = {
    ok: true,
    kind: 'tournament_pool_v8_rollback_preflight_v1',
    mode: apply ? 'apply' : 'dry-run',
    projectId: EXPECTED_PROJECT_ID,
    poolVersion: EXPECTED_VERSION,
    manifestSha256,
    hashes: { backupSha256: expectedBackupSha, newPoolSha256: expectedNewSha },
    proposedMutations: { restoreOld: missingOld.length, removeNew: stagedNewDocs.length },
    protectedRoomsScanned: roomsScanned,
    productionWrites: 0,
  };
  if (!apply) {
    if (requestedReportPath) fs.writeFileSync(path.resolve(requestedReportPath), `${JSON.stringify(preflightReport, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(preflightReport)}\n`);
    return;
  }

  const migrationId = `rollback:${manifestSha256}`;
  const barrierAcquisition = await acquirePoolRollbackBarrier(db, {
    expectedGeneration: EXPECTED_VERSION,
    targetGeneration,
    migrationId,
    interruptedApply: {
      expectedGeneration: targetGeneration,
      targetGeneration: EXPECTED_VERSION,
      migrationId: `apply:${manifestSha256}`,
    },
  });
  const protectedRoomsAfterAcquisition = await assertNoProtectedRoomReferences(
    db, newIds, 'rollback_post_barrier_acquisition',
  );
  const poolAfterAcquisition = await collection.get();
  assert.equal(poolAfterAcquisition.size, current.size, 'rollback_post_barrier_pool_count_changed');
  const poolAfterAcquisitionById = new Map(poolAfterAcquisition.docs.map((doc) => [doc.id, doc]));
  for (const doc of current.docs) {
    const protectedDoc = poolAfterAcquisitionById.get(doc.id);
    assert.ok(protectedDoc, `rollback_post_barrier_doc_missing:${doc.id}`);
    assert.deepStrictEqual(encode(protectedDoc.data()), encode(doc.data()),
      `rollback_post_barrier_doc_changed:${doc.id}`);
  }

  for (let offset = 0; offset < missingOld.length; offset += 400) {
    const batch = db.batch();
    for (const row of missingOld.slice(offset, offset + 400)) batch.create(collection.doc(row.id), decode(row.data, db));
    await batch.commit();
  }
  const afterRestore = await collection.get();
  const afterRestoreById = new Map(afterRestore.docs.map((doc) => [doc.id, doc]));
  for (const row of oldRows) {
    const doc = afterRestoreById.get(row.id);
    assert.ok(doc, `restore_missing:${row.id}`);
    assert.deepStrictEqual(encode(doc.data()), row.data, `restore_data_mismatch:${row.id}`);
  }
  await assertNoProtectedRoomReferences(db, newIds, 'rollback_pre_delete');
  const verifiedNewDocs = newRows.map((row) => afterRestoreById.get(row.id)).filter(Boolean);
  for (const doc of verifiedNewDocs) {
    const row = newRows.find((candidate) => candidate.id === doc.id);
    assert.deepStrictEqual(encode(doc.data()), row.data, `pre_delete_new_doc_changed:${doc.id}`);
  }
  for (let offset = 0; offset < verifiedNewDocs.length; offset += 400) {
    const batch = db.batch();
    for (const doc of verifiedNewDocs.slice(offset, offset + 400)) batch.delete(doc.ref, { lastUpdateTime: doc.updateTime });
    await batch.commit();
  }

  const final = await collection.get();
  assert.equal(final.size, oldRows.length, `rollback_final_count:${final.size}`);
  const finalById = new Map(final.docs.map((doc) => [doc.id, doc]));
  for (const row of oldRows) {
    const doc = finalById.get(row.id);
    assert.ok(doc, `rollback_final_missing:${row.id}`);
    assert.deepStrictEqual(encode(doc.data()), row.data, `rollback_final_data:${row.id}`);
  }
  const barrierRelease = await releasePoolMigrationBarrier(db, {
    expectedGeneration: EXPECTED_VERSION,
    targetGeneration,
    migrationId,
    sourceReadyBarrier,
  });
  const report = {
    ...preflightReport,
    kind: 'tournament_pool_v8_rollback_report_v1',
    completedAt: new Date().toISOString(),
    restored: missingOld.length,
    removedNew: verifiedNewDocs.length,
    finalDocuments: final.size,
    idempotentNoop: missingOld.length === 0 && verifiedNewDocs.length === 0,
    barrier: {
      sourceGeneration: EXPECTED_VERSION,
      targetGeneration,
      migrationId,
      acquisition: barrierAcquisition,
      protectedRoomsAfterAcquisition,
      release: barrierRelease,
    },
    productionWrites: missingOld.length + verifiedNewDocs.length + (barrierAcquisition.resumed ? 1 : 2),
  };
  if (requestedReportPath) fs.writeFileSync(path.resolve(requestedReportPath), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

module.exports = {
  EXPECTED_VERSION,
  POOL_BARRIER_COLLECTION,
  POOL_BARRIER_DOC,
  POOL_BARRIER_KIND,
  acquirePoolRollbackBarrier,
  assertRollbackTranslateBuildSemantics,
  findBlockingRoomReferences,
  resolveRollbackIntent,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
