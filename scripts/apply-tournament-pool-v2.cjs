'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const admin = require('../functions/node_modules/firebase-admin');

const EXPECTED_PROJECT_ID = 'phraseman-ea0b3';
const EXPECTED_VERSION = 'tpool_20260729_v2';
const EXPECTED_NEW_SHA256 = '7109452cb87fd4099f6ad6ec136089bb875e5ec209e4ebff1491b0d59dcd2f86';
const EXPECTED_BACKUP_SHA256 = '1626d0dbb954c0a9e2c2f9ba9158520b2274ac21ad3a15e0c976a17435fba71b';
const EXPECTED_NEW_COUNT = 180;
const EXPECTED_OLD_COUNT = 180;
const COLLECTION = 'tournamentTasks';
const MODES = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'];

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encodeFirestoreValue(value) {
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
  if (Array.isArray(value)) return value.map(encodeFirestoreValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeFirestoreValue(entry)]));
  }
  throw new Error(`unsupported_firestore_value:${typeof value}`);
}

function snapshotBackupRow(doc) {
  return {
    id: doc.id,
    data: encodeFirestoreValue(doc.data()),
    createTime: doc.createTime.toDate().toISOString(),
    updateTime: doc.updateTime.toDate().toISOString(),
  };
}

function backupText(rows) {
  return rows.slice().sort((a, b) => a.id.localeCompare(b.id)).map((row) => JSON.stringify(row)).join('\n') + '\n';
}

function preflightRooms(tasks, core, seeds = 150) {
  let taskSlots = 0;
  for (let roomIndex = 0; roomIndex < seeds; roomIndex += 1) {
    const used = new Set();
    for (let roundIndex = 0; roundIndex < core.TOURNAMENT_ROUND_MODE_PLAN.length; roundIndex += 1) {
      const roundNo = roundIndex + 1;
      for (const mode of core.TOURNAMENT_ROUND_MODE_PLAN[roundIndex]) {
        const selected = core.selectRoundTasks({
          pool: tasks.filter((task) => task.mode === mode && !used.has(task.taskId)),
          roomId: `production-pool-proof-${roomIndex}`,
          roundNo,
          count: 4,
          modeKind: 'mix',
        })[0];
        if (!selected) throw new Error(`preflight_unavailable:${roomIndex}:${roundNo}:${mode}`);
        used.add(selected.taskId);
        taskSlots += 1;
      }
    }
    if (used.size !== 16) throw new Error(`preflight_duplicate:${roomIndex}:${used.size}`);
  }
  return { roomSeeds: seeds, taskSlots };
}

async function readExactNewTasks(db, refs, expectedRows, core) {
  const snapshots = await db.getAll(...refs);
  if (snapshots.length !== EXPECTED_NEW_COUNT || snapshots.some((doc) => !doc.exists)) {
    throw new Error(`new_readback_missing:${snapshots.filter((doc) => doc.exists).length}/${EXPECTED_NEW_COUNT}`);
  }
  const tasks = snapshots.map((doc) => doc.data());
  for (let index = 0; index < tasks.length; index += 1) {
    assert.deepStrictEqual(encodeFirestoreValue(tasks[index]), expectedRows[index].data,
      `new_readback_data_mismatch:${refs[index].id}`);
    const validation = core.validateTournamentTaskForNewRoom(tasks[index]);
    if (!validation.ok) throw new Error(`new_readback_invalid:${refs[index].id}:${validation.reason}`);
  }
  return tasks;
}

async function main() {
  if (process.env.PHRASEMAN_TOURNAMENT_POOL_V2_APPLY !== '1') {
    throw new Error('apply_guard_missing');
  }
  const manifestPath = path.resolve(argValue('manifest') || '');
  const compiledRoot = path.resolve(argValue('compiled-root') || '');
  const serviceAccountPath = path.resolve(argValue('service-account') || 'service-account.json');
  const reportPath = path.resolve(argValue('report') || path.join(path.dirname(manifestPath), 'apply-report.json'));
  if (!manifestPath || !compiledRoot) throw new Error('manifest_and_compiled_root_required');
  const core = require(path.join(compiledRoot, 'functions/src/tournament_core.js'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const backupPath = path.join(path.dirname(manifestPath), manifest.artifacts.backupFile);
  const newPoolPath = path.join(path.dirname(manifestPath), manifest.artifacts.newPoolFile);
  const rawBackup = fs.readFileSync(backupPath);
  const rawNewPool = fs.readFileSync(newPoolPath);

  assert.equal(manifest.generated.poolVersion, EXPECTED_VERSION);
  assert.equal(manifest.projectId, EXPECTED_PROJECT_ID);
  assert.equal(manifest.productionRead.existingDocuments, EXPECTED_OLD_COUNT);
  assert.equal(manifest.generated.taskCount, EXPECTED_NEW_COUNT);
  assert.equal(manifest.gates.strictValidatorInvalid, 0);
  assert.equal(manifest.gates.productionWritesPerformed, 0);
  assert.equal(sha256(rawBackup), EXPECTED_BACKUP_SHA256);
  assert.equal(sha256(rawNewPool), EXPECTED_NEW_SHA256);
  assert.equal(manifest.artifacts.backupSha256, EXPECTED_BACKUP_SHA256);
  assert.equal(manifest.artifacts.newPoolSha256, EXPECTED_NEW_SHA256);

  const backupRows = rawBackup.toString('utf8').trim().split('\n').map(JSON.parse);
  const newRows = rawNewPool.toString('utf8').trim().split('\n').map(JSON.parse);
  assert.equal(backupRows.length, EXPECTED_OLD_COUNT);
  assert.equal(newRows.length, EXPECTED_NEW_COUNT);
  assert.equal(new Set(backupRows.map((row) => row.id)).size, EXPECTED_OLD_COUNT);
  assert.equal(new Set(newRows.map((row) => row.id)).size, EXPECTED_NEW_COUNT);
  assert.equal(backupRows.some((row) => newRows.some((candidate) => candidate.id === row.id)), false);
  for (const row of newRows) {
    assert.equal(row.id, row.data.taskId);
    assert.equal(row.data.poolVersion, EXPECTED_VERSION);
    assert.equal(row.data.source, 'ai');
    assert.equal(row.data.verified, true);
    assert.equal(MODES.includes(row.data.mode), true);
    const validation = core.validateTournamentTaskForNewRoom(row.data);
    if (!validation.ok) throw new Error(`manifest_new_task_invalid:${row.id}:${validation.reason}`);
  }
  preflightRooms(newRows.map((row) => row.data), core);

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  assert.equal(serviceAccount.project_id, EXPECTED_PROJECT_ID, 'service_account_project_mismatch');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id });
  assert.equal(admin.app().options.projectId, EXPECTED_PROJECT_ID, 'initialized_project_mismatch');
  const db = admin.firestore();
  const collection = db.collection(COLLECTION);

  const before = await collection.get();
  assert.equal(before.size, EXPECTED_OLD_COUNT, `pre_stage_count_changed:${before.size}`);
  assert.equal(sha256(backupText(before.docs.map(snapshotBackupRow))), EXPECTED_BACKUP_SHA256,
    'pre_stage_old_pool_changed_since_backup');
  const newIdSet = new Set(newRows.map((row) => row.id));
  assert.equal(before.docs.some((doc) => newIdSet.has(doc.id)), false, 'pre_stage_new_id_collision');

  const createBatch = db.batch();
  for (const row of newRows) createBatch.create(collection.doc(row.id), row.data);
  await createBatch.commit();

  const newRefs = newRows.map((row) => collection.doc(row.id));
  const stagedTasks = await readExactNewTasks(db, newRefs, newRows, core);
  const stagedPreflight = preflightRooms(stagedTasks, core);

  const beforeDelete = await collection.get();
  assert.equal(beforeDelete.size, EXPECTED_OLD_COUNT + EXPECTED_NEW_COUNT,
    `pre_delete_count_invalid:${beforeDelete.size}`);
  const beforeDeleteById = new Map(beforeDelete.docs.map((doc) => [doc.id, doc]));
  const oldDocs = backupRows.map((row) => beforeDeleteById.get(row.id));
  assert.equal(oldDocs.every(Boolean), true, 'pre_delete_old_doc_missing');
  const oldOnlyHash = sha256(backupText(oldDocs.map(snapshotBackupRow)));
  assert.equal(oldOnlyHash, EXPECTED_BACKUP_SHA256, 'pre_delete_old_pool_changed');
  assert.equal(beforeDelete.docs.filter((doc) => !newIdSet.has(doc.id)).length, EXPECTED_OLD_COUNT,
    'pre_delete_unexpected_document');

  for (let offset = 0; offset < oldDocs.length; offset += 450) {
    const batch = db.batch();
    for (const doc of oldDocs.slice(offset, offset + 450)) {
      batch.delete(doc.ref, { lastUpdateTime: doc.updateTime });
    }
    await batch.commit();
  }

  const finalSnapshot = await collection.get();
  assert.equal(finalSnapshot.size, EXPECTED_NEW_COUNT, `final_count_invalid:${finalSnapshot.size}`);
  const finalIds = finalSnapshot.docs.map((doc) => doc.id).sort();
  assert.deepStrictEqual(finalIds, newRows.map((row) => row.id).sort(), 'final_ids_invalid');
  const finalTasks = finalSnapshot.docs.map((doc) => doc.data());
  const finalInvalid = finalTasks.map((task) => core.validateTournamentTaskForNewRoom(task)).filter((x) => !x.ok);
  assert.equal(finalInvalid.length, 0, 'final_invalid_tasks');
  assert.deepStrictEqual([...new Set(finalTasks.map((task) => task.mode))].sort(), [...MODES].sort());
  assert.equal(finalTasks.every((task) => task.poolVersion === EXPECTED_VERSION), true);

  const runtimeSlices = [];
  const runtimeTasks = [];
  for (const mode of MODES) {
    const slice = await collection.where('verified', '==', true).where('source', '==', 'ai')
      .where('mode', '==', mode).limit(40).get();
    const valid = slice.docs.map((doc) => doc.data())
      .filter((task) => core.validateTournamentTaskForNewRoom(task).ok);
    runtimeSlices.push({ mode, read: slice.size, valid: valid.length });
    runtimeTasks.push(...valid);
  }
  assert.equal(runtimeTasks.length, EXPECTED_NEW_COUNT, `runtime_slice_total_invalid:${runtimeTasks.length}`);
  const finalPreflight = preflightRooms(runtimeTasks, core);

  const report = {
    kind: 'tournament_pool_v2_apply_report_v1',
    projectId: serviceAccount.project_id,
    poolVersion: EXPECTED_VERSION,
    completedAt: new Date().toISOString(),
    hashes: { backupSha256: EXPECTED_BACKUP_SHA256, newPoolSha256: EXPECTED_NEW_SHA256 },
    actualMutations: { created: EXPECTED_NEW_COUNT, deleted: EXPECTED_OLD_COUNT, otherCollections: 0 },
    stageGate: { readBack: stagedTasks.length, invalid: 0, ...stagedPreflight },
    finalGate: {
      documents: finalSnapshot.size,
      legacyDocuments: finalSnapshot.docs.filter((doc) => !newIdSet.has(doc.id)).length,
      invalid: finalInvalid.length,
      modes: [...new Set(finalTasks.map((task) => task.mode))].sort(),
      runtimeSlices,
      ...finalPreflight,
    },
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ reportPath, ...report })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
