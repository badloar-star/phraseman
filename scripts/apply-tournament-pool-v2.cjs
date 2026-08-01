'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const admin = require('../functions/node_modules/firebase-admin');

const EXPECTED_PROJECT_ID = 'phraseman-ea0b3';
const EXPECTED_VERSION = 'tpool_20260801_v7';
const EXPECTED_SOURCE_VERSION = 'tpool_20260731_v6';
const EXPECTED_NEW_COUNT = 4000;
const COLLECTION = 'tournamentTasks';
const ROOMS_COLLECTION = 'tournamentRooms';
const POOL_BARRIER_COLLECTION = 'tournamentPrivateState';
const POOL_BARRIER_DOC = 'task_pool_generation_v1';
const POOL_BARRIER_KIND = 'tournament_task_pool_barrier_v1';
const MODES = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'];
const EXPECTED_EXPOSURE_BUCKET_COUNTS = Object.freeze({
  guess_phrase: 30,
  fill_gap: 13,
  find_oddity: 10,
  translate_build: 38,
  speed_match: 10,
});
const TERMINAL_ROOM_STATES = new Set(['closed', 'cancelled']);

function chunkItems(items, size) {
  if (!Array.isArray(items) || !Number.isSafeInteger(size) || size < 1) {
    throw new Error('chunk_items_invalid');
  }
  const chunks = [];
  for (let offset = 0; offset < items.length; offset += size) chunks.push(items.slice(offset, offset + size));
  return chunks;
}

function tournamentExposureRelease(exposure) {
  const counts = exposure && exposure.modeBucketCounts;
  if (!counts || Object.keys(counts).length !== MODES.length
    || MODES.some((mode) => counts[mode] !== EXPECTED_EXPOSURE_BUCKET_COUNTS[mode])) {
    throw new Error('exposure_bucket_counts_invalid');
  }
  return {
    exposureBucketCounts: Object.fromEntries(MODES.map((mode) => [mode, counts[mode]])),
    exposureLayoutHash: sha256(JSON.stringify(exposure)),
  };
}

function assertExposureLayoutRows(rows, exposure) {
  tournamentExposureRelease(exposure);
  const expectedSizes = exposure && exposure.bucketSizes;
  if (!expectedSizes || typeof expectedSizes !== 'object' || Array.isArray(expectedSizes)) {
    throw new Error('exposure_bucket_sizes_invalid');
  }
  const actualSizes = {};
  for (const row of rows) {
    const task = row && row.data;
    const bucket = task && task.exposureBucket;
    const expectedPrefix = `${EXPECTED_VERSION}:${task && task.mode}:`;
    if (typeof bucket !== 'string' || !bucket.startsWith(expectedPrefix)
      || !/^tpool_20260801_v7:[a-z_]+:\d{3}$/.test(bucket)) {
      throw new Error(`exposure_bucket_task_invalid:${row && row.id}`);
    }
    actualSizes[bucket] = (actualSizes[bucket] || 0) + 1;
  }
  assert.deepStrictEqual(
    Object.fromEntries(Object.entries(actualSizes).sort(([left], [right]) => left.localeCompare(right))),
    Object.fromEntries(Object.entries(expectedSizes).sort(([left], [right]) => left.localeCompare(right))),
    'exposure_bucket_sizes_mismatch',
  );
  assert.equal(Object.values(actualSizes).every((size) => size > 0 && size <= 40), true,
    'exposure_bucket_size_limit');
  for (const mode of MODES) {
    assert.equal(Object.keys(actualSizes).filter((bucket) => bucket.startsWith(`${EXPECTED_VERSION}:${mode}:`)).length,
      EXPECTED_EXPOSURE_BUCKET_COUNTS[mode], `exposure_bucket_count:${mode}`);
  }
}

function poolBarrierRef(db) {
  return db.collection(POOL_BARRIER_COLLECTION).doc(POOL_BARRIER_DOC);
}

function assertPoolBarrierGeneration(value, label) {
  const generation = typeof value === 'string' ? value.trim() : '';
  if (!generation || generation.length > 160) throw new Error(`${label}_invalid`);
  return generation;
}

function parsePoolBarrier(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const revision = Number(data && data.revision);
  if (!data || data.kind !== POOL_BARRIER_KIND
    || !['ready', 'migrating'].includes(data.state)
    || !Number.isSafeInteger(revision) || revision < 0) {
    throw new Error('pool_barrier_invalid');
  }
  return {
    ...data,
    generation: assertPoolBarrierGeneration(data.generation, 'pool_barrier_generation'),
    revision,
  };
}

async function getPoolMigrationBarrier(db) {
  return parsePoolBarrier(await poolBarrierRef(db).get());
}

function isOwnedApplyBarrier(barrier, options) {
  return Boolean(barrier
    && barrier.kind === POOL_BARRIER_KIND
    && barrier.state === 'migrating'
    && barrier.generation === options.sourceGeneration
    && barrier.targetGeneration === options.targetGeneration
    && barrier.migrationId === options.migrationId);
}

function planApplyPoolRecovery(options) {
  const expectedOldById = new Map(options.backupRows.map((row) => [row.id, row]));
  const expectedNewById = new Map(options.newRows.map((row) => [row.id, row]));
  const currentById = new Map();
  for (const row of options.currentRows) {
    if (!row || typeof row.id !== 'string' || currentById.has(row.id)) {
      throw new Error('apply_manual_recovery_required:pool_identity_invalid');
    }
    currentById.set(row.id, row);
    const expectedOld = expectedOldById.get(row.id);
    const expectedNew = expectedNewById.get(row.id);
    if (!expectedOld && !expectedNew) {
      throw new Error(`apply_manual_recovery_required:unexpected_document:${row.id}`);
    }
    if (expectedOld) {
      assert.deepStrictEqual(row.data, expectedOld.data, `apply_old_doc_changed:${row.id}`);
      if (expectedOld.createTime !== undefined) {
        assert.equal(row.createTime, expectedOld.createTime, `apply_old_create_time_changed:${row.id}`);
      }
      if (expectedOld.updateTime !== undefined) {
        assert.equal(row.updateTime, expectedOld.updateTime, `apply_old_update_time_changed:${row.id}`);
      }
    } else {
      assert.deepStrictEqual(row.data, expectedNew.data, `apply_new_doc_changed:${row.id}`);
    }
  }

  const presentOldIds = options.backupRows.filter((row) => currentById.has(row.id)).map((row) => row.id);
  const presentNewIds = options.newRows.filter((row) => currentById.has(row.id)).map((row) => row.id);
  const allOldPresent = presentOldIds.length === options.backupRows.length;
  const allNewPresent = presentNewIds.length === options.newRows.length;
  const noNewPresent = presentNewIds.length === 0;
  const ownedBarrier = isOwnedApplyBarrier(options.barrier, options);

  if (allOldPresent && noNewPresent) {
    if (ownedBarrier) {
      return { phase: 'acquired', createNew: true, remainingOldIds: presentOldIds, resumed: true };
    }
    const barrierAllowsInitial = !options.barrier || (options.barrier.state === 'ready'
      && options.barrier.generation === options.sourceGeneration);
    if (!barrierAllowsInitial) {
      throw new Error('apply_manual_recovery_required:old_pool_barrier_mismatch');
    }
    return { phase: 'initial', createNew: true, remainingOldIds: presentOldIds, resumed: false };
  }

  if (!allNewPresent) {
    throw new Error(`apply_manual_recovery_required:partial_new_pool:${presentNewIds.length}/${options.newRows.length}`);
  }
  if (!ownedBarrier) {
    const phase = allOldPresent ? 'staged' : 'deleting';
    throw new Error(`apply_manual_recovery_required:${phase}_pool_without_owned_barrier`);
  }
  return {
    phase: allOldPresent ? 'staged' : (presentOldIds.length === 0 ? 'finalizing' : 'deleting'),
    createNew: false,
    remainingOldIds: presentOldIds,
    resumed: true,
  };
}

async function acquirePoolMigrationBarrier(db, options) {
  const expectedGeneration = assertPoolBarrierGeneration(
    options.expectedGeneration, 'expected_pool_generation',
  );
  const targetGeneration = assertPoolBarrierGeneration(
    options.targetGeneration, 'target_pool_generation',
  );
  const migrationId = assertPoolBarrierGeneration(options.migrationId, 'migration_id');
  const acquiredAt = options.acquiredAt || new Date().toISOString();
  const ref = poolBarrierRef(db);
  return db.runTransaction(async (tx) => {
    const current = parsePoolBarrier(await tx.get(ref));
    if (!current) {
      if (options.allowCreate !== true) throw new Error('pool_barrier_missing');
      tx.set(ref, {
        kind: POOL_BARRIER_KIND,
        state: 'migrating',
        generation: expectedGeneration,
        targetGeneration,
        migrationId,
        revision: 1,
        acquiredAt,
      });
      return { generation: expectedGeneration, revision: 1, resumed: false };
    }
    if (current.state === 'migrating') {
      if (current.migrationId !== migrationId) throw new Error('pool_barrier_already_acquired');
      if (current.generation !== expectedGeneration || current.targetGeneration !== targetGeneration) {
        throw new Error('pool_barrier_resume_contract_mismatch');
      }
      return { generation: current.generation, revision: current.revision, resumed: true };
    }
    if (current.generation !== expectedGeneration) {
      throw new Error(`pool_barrier_generation_mismatch:${current.generation}`);
    }
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
    return { generation: expectedGeneration, revision, resumed: false };
  });
}

async function releasePoolMigrationBarrier(db, options) {
  const expectedGeneration = assertPoolBarrierGeneration(
    options.expectedGeneration, 'expected_pool_generation',
  );
  const targetGeneration = assertPoolBarrierGeneration(
    options.targetGeneration, 'target_pool_generation',
  );
  const migrationId = assertPoolBarrierGeneration(options.migrationId, 'migration_id');
  const releasedAt = options.releasedAt || new Date().toISOString();
  const exposureRelease = targetGeneration === EXPECTED_VERSION
    ? tournamentExposureRelease(options.exposure)
    : {};
  const ref = poolBarrierRef(db);
  return db.runTransaction(async (tx) => {
    const current = parsePoolBarrier(await tx.get(ref));
    if (!current) throw new Error('pool_barrier_missing');
    if (current.state !== 'migrating' || current.migrationId !== migrationId) {
      throw new Error('pool_barrier_owner_mismatch');
    }
    if (current.generation !== expectedGeneration || current.targetGeneration !== targetGeneration) {
      throw new Error('pool_barrier_release_contract_mismatch');
    }
    const revision = current.revision + 1;
    tx.set(ref, {
      kind: POOL_BARRIER_KIND,
      state: 'ready',
      generation: targetGeneration,
      revision,
      releasedAt,
      ...exposureRelease,
    });
    return { generation: targetGeneration, revision };
  });
}

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

function resolveApplyIntent(argv = process.argv.slice(2), env = process.env) {
  if (!argv.includes('--apply')) return false;
  if (env.PHRASEMAN_TOURNAMENT_POOL_V7_APPLY !== '1') throw new Error('apply_guard_missing');
  return true;
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

function resolveSourceGeneration(backupRows) {
  if (!Array.isArray(backupRows) || backupRows.length === 0
    || backupRows.some((row) => !row || !row.data
      || row.data.poolVersion !== EXPECTED_SOURCE_VERSION)) {
    throw new Error('backup_source_generation_mismatch');
  }
  return EXPECTED_SOURCE_VERSION;
}

function normalizedToken(value) {
  return String(value).trim().toLocaleLowerCase('en');
}

function translateBuildTrapCount(payload, taskId) {
  const correctTokens = payload && payload.correctTokens;
  const wordBank = payload && payload.wordBank;
  if (!Array.isArray(correctTokens) || correctTokens.length === 0
    || correctTokens.some((token) => typeof token !== 'string' || token.trim().length === 0)
    || !Number.isInteger(payload.correctTokenCount)
    || payload.correctTokenCount !== correctTokens.length) {
    throw new Error(`translate_build_correct_token_count:${taskId}`);
  }
  if (!Array.isArray(wordBank) || wordBank.some((token) => typeof token !== 'string' || token.trim().length === 0)) {
    throw new Error(`translate_build_word_bank:${taskId}`);
  }
  const remaining = new Map();
  for (const token of correctTokens) {
    const key = normalizedToken(token);
    remaining.set(key, (remaining.get(key) || 0) + 1);
  }
  let traps = 0;
  for (const token of wordBank) {
    const key = normalizedToken(token);
    const count = remaining.get(key) || 0;
    if (count > 0) remaining.set(key, count - 1);
    else traps += 1;
  }
  if ([...remaining.values()].some((count) => count !== 0)) {
    throw new Error(`translate_build_word_bank_missing_correct_tokens:${taskId}`);
  }
  return traps;
}

function assertTranslateBuildSemantics(rows, allowedTrapCounts = [1]) {
  const allowed = new Set(allowedTrapCounts);
  for (const row of rows) {
    if (!row || !row.data || row.data.mode !== 'translate_build') continue;
    const traps = translateBuildTrapCount(row.data.payload, row.id);
    if (!allowed.has(traps)) throw new Error(`translate_build_trap_count:${row.id}:${traps}`);
  }
}

function roomTaskIds(data) {
  if (!data || !Array.isArray(data.rounds)) return [];
  return data.rounds.flatMap((round) => (round && Array.isArray(round.taskIds)
    ? round.taskIds.filter((taskId) => typeof taskId === 'string') : []));
}

function findBlockingRoomReferences(roomRows, removableIds, nowMs = Date.now()) {
  const blockers = [];
  for (const row of roomRows) {
    const data = row && row.data;
    const referencedTaskIds = [...new Set(roomTaskIds(data).filter((taskId) => removableIds.has(taskId)))];
    if (referencedTaskIds.length === 0) continue;
    const state = data && typeof data.state === 'string' ? data.state : '';
    const startsAt = data && Number.isFinite(data.startsAt) ? Number(data.startsAt) : 0;
    const isFuture = startsAt > nowMs;
    const isActiveOrMalformed = !TERMINAL_ROOM_STATES.has(state);
    if (isFuture || isActiveOrMalformed) blockers.push({ roomId: String(row.id), state, startsAt, taskIds: referencedTaskIds });
  }
  return blockers;
}

async function inspectRoomReferenceSafety(options) {
  const nowMs = options.nowMs === undefined ? Date.now() : options.nowMs;
  const blockers = [];
  const evidence = {
    roomsScanned: options.roomRows.length,
    referencedRoomsScanned: 0,
    retainedRewardsRoomsValidated: 0,
    taskSecretsRead: 0,
    taskSecretsValidated: 0,
  };
  for (const row of options.roomRows) {
    const data = row && row.data;
    const taskIds = [...new Set(roomTaskIds(data).filter((taskId) => options.removableIds.has(taskId)))];
    if (taskIds.length === 0) continue;
    evidence.referencedRoomsScanned += 1;
    const roomId = String(row.id);
    const state = data && typeof data.state === 'string' ? data.state : '';
    const startsAt = data && Number.isFinite(data.startsAt) ? Number(data.startsAt) : 0;
    const isFuture = startsAt > nowMs;
    if (TERMINAL_ROOM_STATES.has(state) && !isFuture) continue;
    if (state !== 'rewards' || isFuture) {
      blockers.push({ roomId, state, startsAt, taskIds, reason: isFuture ? 'future_room' : 'protected_state' });
      continue;
    }
    const roomReferenceShapeValid = data && typeof data === 'object' && !Array.isArray(data)
      && Number.isFinite(data.startsAt)
      && Array.isArray(data.rounds) && data.rounds.length > 0
      && data.rounds.every((round) => round && typeof round === 'object' && !Array.isArray(round)
        && Array.isArray(round.taskIds) && round.taskIds.length > 0
        && round.taskIds.every((taskId) => typeof taskId === 'string' && taskId.trim().length > 0));
    if (!roomReferenceShapeValid) {
      blockers.push({ roomId, state, startsAt, taskIds, reason: 'room_reference_shape_invalid' });
      continue;
    }
    const retentionUntilMs = data && Number.isFinite(data.reviewRetentionUntilMs)
      ? Number(data.reviewRetentionUntilMs) : 0;
    if (retentionUntilMs <= nowMs) {
      blockers.push({ roomId, state, startsAt, taskIds, reason: 'review_retention_invalid' });
      continue;
    }

    let secrets;
    try {
      secrets = await options.readTaskSecrets(roomId, taskIds);
      evidence.taskSecretsRead += taskIds.length;
    } catch (_error) {
      blockers.push({ roomId, state, startsAt, taskIds, reason: 'task_secret_read_failed' });
      continue;
    }
    const secretsById = new Map(Array.isArray(secrets)
      ? secrets.map((secret) => [secret && secret.id, secret]) : []);
    let invalidReason = '';
    for (const taskId of taskIds) {
      const secret = secretsById.get(taskId);
      if (!secret || secret.exists !== true) {
        invalidReason = 'task_secret_missing';
        break;
      }
      const secretData = secret.data;
      if (!secretData || secretData.taskId !== taskId) {
        invalidReason = 'task_secret_identity_invalid';
        break;
      }
      let valid = false;
      try {
        valid = options.validateTaskSecret(taskId, secretData) === true;
      } catch (_error) {
        valid = false;
      }
      if (!valid) {
        invalidReason = 'task_secret_invalid';
        break;
      }
    }
    if (invalidReason) {
      blockers.push({ roomId, state, startsAt, taskIds, reason: invalidReason });
      continue;
    }
    evidence.retainedRewardsRoomsValidated += 1;
    evidence.taskSecretsValidated += taskIds.length;
  }
  return { blockers, evidence };
}

function roomRows(snapshot) {
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

async function assertNoProtectedRoomReferences(db, removableIds, phase, validateTaskSecret) {
  const snapshot = await db.collection(ROOMS_COLLECTION).get();
  const inspection = await inspectRoomReferenceSafety({
    roomRows: roomRows(snapshot),
    removableIds,
    readTaskSecrets: async (roomId, taskIds) => {
      const roomRef = db.collection(ROOMS_COLLECTION).doc(roomId);
      const secrets = await db.getAll(...taskIds.map((taskId) => roomRef.collection('taskSecrets').doc(taskId)));
      return secrets.map((secret) => ({
        id: secret.id,
        exists: secret.exists,
        data: secret.exists ? secret.data() : undefined,
      }));
    },
    validateTaskSecret,
  });
  const { blockers } = inspection;
  if (blockers.length > 0) {
    const sample = blockers.slice(0, 5)
      .map((room) => `${room.roomId}:${room.state || 'malformed'}:${room.reason}`).join(',');
    throw new Error(`${phase}_protected_room_references:${blockers.length}:${sample}`);
  }
  return inspection.evidence;
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

function assertPinnedBundle(manifest, rawManifest, rawBackup, rawNewPool, expectedBackupSha, expectedNewSha) {
  assert.equal(manifest.kind, 'tournament_pool_v2_replacement_dry_run_v1');
  assert.equal(manifest.generated.poolVersion, EXPECTED_VERSION);
  assert.equal(manifest.projectId, EXPECTED_PROJECT_ID);
  assert.equal(manifest.generated.taskCount, EXPECTED_NEW_COUNT);
  tournamentExposureRelease(manifest.generated.exposure);
  assert.equal(manifest.gates.strictValidatorInvalid, 0);
  assert.equal(manifest.gates.oldPoolUntouched, true);
  assert.equal(manifest.gates.productionWritesPerformed, 0);
  assert.equal(manifest.exactProposedMutations.stageNewCreates, EXPECTED_NEW_COUNT);
  assert.equal(manifest.exactProposedMutations.finalDocuments, EXPECTED_NEW_COUNT);
  assert.equal(sha256(rawBackup), expectedBackupSha, 'backup_hash_pin_mismatch');
  assert.equal(sha256(rawNewPool), expectedNewSha, 'new_pool_hash_pin_mismatch');
  assert.equal(manifest.artifacts.backupSha256, expectedBackupSha, 'manifest_backup_hash_mismatch');
  assert.equal(manifest.artifacts.newPoolSha256, expectedNewSha, 'manifest_new_pool_hash_mismatch');
  return sha256(rawManifest);
}

function assertBundleRows(backupRows, newRows, manifest, core) {
  const expectedOldCount = Number(manifest.productionRead.existingDocuments);
  assert.equal(Number.isInteger(expectedOldCount) && expectedOldCount > 0, true, 'backup_count_pin_invalid');
  assert.equal(backupRows.length, expectedOldCount);
  assert.equal(newRows.length, EXPECTED_NEW_COUNT);
  assert.equal(new Set(backupRows.map((row) => row.id)).size, expectedOldCount);
  assert.equal(new Set(newRows.map((row) => row.id)).size, EXPECTED_NEW_COUNT);
  const sourceGeneration = resolveSourceGeneration(backupRows);
  const oldIds = new Set(backupRows.map((row) => row.id));
  assert.equal(newRows.some((row) => oldIds.has(row.id)), false, 'old_new_id_overlap');
  assertTranslateBuildSemantics(newRows);
  assertExposureLayoutRows(newRows, manifest.generated.exposure);
  for (const row of newRows) {
    assert.equal(row.id, row.data.taskId);
    assert.equal(row.data.poolVersion, EXPECTED_VERSION);
    assert.equal(row.data.source, 'ai');
    assert.equal(row.data.lifecycle, 'published');
    assert.equal(row.data.verified, true);
    assert.equal(MODES.includes(row.data.mode), true);
    const validation = core.validateTournamentTaskForNewRoom(row.data);
    if (!validation.ok) throw new Error(`manifest_new_task_invalid:${row.id}:${validation.reason}`);
  }
  return { expectedOldCount, oldIds, sourceGeneration };
}

async function readExactNewTasks(db, refs, expectedRows, core) {
  const snapshots = [];
  for (const chunk of chunkItems(refs, 300)) snapshots.push(...await db.getAll(...chunk));
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
  assertTranslateBuildSemantics(snapshots.map((doc, index) => ({ id: refs[index].id, data: doc.data() })));
  return tasks;
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = resolveApplyIntent(argv, process.env);
  const manifestArg = argValue('manifest', argv);
  const compiledRootArg = argValue('compiled-root', argv);
  if (!manifestArg || !compiledRootArg) throw new Error('manifest_and_compiled_root_required');
  const expectedBackupSha = pinnedSha('expected-backup-sha', argv);
  const expectedNewSha = pinnedSha('expected-new-sha', argv);
  const manifestPath = path.resolve(manifestArg);
  const compiledRoot = path.resolve(compiledRootArg);
  const serviceAccountPath = path.resolve(argValue('service-account', argv) || 'service-account.json');
  const requestedReportPath = argValue('report', argv);
  const core = require(path.join(compiledRoot, 'functions/src/tournament_core.js'));
  const validateTaskSecret = (_taskId, data) => core.validateTournamentTask(data).ok === true;
  const rawManifest = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(rawManifest.toString('utf8'));
  const backupPath = path.join(path.dirname(manifestPath), manifest.artifacts.backupFile);
  const newPoolPath = path.join(path.dirname(manifestPath), manifest.artifacts.newPoolFile);
  const rawBackup = fs.readFileSync(backupPath);
  const rawNewPool = fs.readFileSync(newPoolPath);
  const manifestSha256 = assertPinnedBundle(
    manifest, rawManifest, rawBackup, rawNewPool, expectedBackupSha, expectedNewSha,
  );
  const backupRows = parseNdjson(rawBackup, 'backup');
  const newRows = parseNdjson(rawNewPool, 'new_pool');
  const { oldIds, sourceGeneration } = assertBundleRows(backupRows, newRows, manifest, core);
  const artifactPreflight = preflightRooms(newRows.map((row) => row.data), core);

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  assert.equal(serviceAccount.project_id, EXPECTED_PROJECT_ID, 'service_account_project_mismatch');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id });
  assert.equal(admin.app().options.projectId, EXPECTED_PROJECT_ID, 'initialized_project_mismatch');
  const db = admin.firestore();
  const collection = db.collection(COLLECTION);
  const migrationId = `apply:${manifestSha256}`;
  const recoveryContract = {
    backupRows,
    newRows,
    sourceGeneration,
    targetGeneration: EXPECTED_VERSION,
    migrationId,
  };
  const before = await collection.get();
  const barrierBefore = await getPoolMigrationBarrier(db);
  const recoveryPlan = planApplyPoolRecovery({
    ...recoveryContract,
    currentRows: before.docs.map(snapshotBackupRow),
    barrier: barrierBefore,
  });
  const newIdSet = new Set(newRows.map((row) => row.id));
  const roomReferenceEvidence = await assertNoProtectedRoomReferences(
    db, oldIds, 'pre_stage', validateTaskSecret,
  );

  const preflightReport = {
    ok: true,
    kind: 'tournament_pool_v7_preflight_v1',
    mode: apply ? 'apply' : 'dry-run',
    projectId: EXPECTED_PROJECT_ID,
    poolVersion: EXPECTED_VERSION,
    manifestSha256,
    hashes: { backupSha256: expectedBackupSha, newPoolSha256: expectedNewSha },
    frozenDocuments: before.size,
    recovery: recoveryPlan,
    protectedRoomsScanned: roomReferenceEvidence.roomsScanned,
    roomReferenceEvidence,
    ...artifactPreflight,
    productionWrites: 0,
  };
  if (!apply) {
    if (requestedReportPath) fs.writeFileSync(path.resolve(requestedReportPath), `${JSON.stringify(preflightReport, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(preflightReport)}\n`);
    return;
  }

  const barrierAcquisition = await acquirePoolMigrationBarrier(db, {
    expectedGeneration: sourceGeneration,
    targetGeneration: EXPECTED_VERSION,
    migrationId,
    allowCreate: true,
  });
  const roomReferenceEvidenceAfterAcquisition = await assertNoProtectedRoomReferences(
    db, oldIds, 'post_barrier_acquisition', validateTaskSecret,
  );
  const poolAfterAcquisition = await collection.get();
  assert.equal(
    backupText(poolAfterAcquisition.docs.map(snapshotBackupRow)),
    backupText(before.docs.map(snapshotBackupRow)),
    'post_barrier_pool_changed',
  );
  const barrierAfterAcquisition = await getPoolMigrationBarrier(db);
  const postAcquisitionPlan = planApplyPoolRecovery({
    ...recoveryContract,
    currentRows: poolAfterAcquisition.docs.map(snapshotBackupRow),
    barrier: barrierAfterAcquisition,
  });

  let created = 0;
  if (postAcquisitionPlan.createNew) {
    for (const rows of chunkItems(newRows, 400)) {
      const createBatch = db.batch();
      for (const row of rows) createBatch.create(collection.doc(row.id), row.data);
      await createBatch.commit();
    }
    created = newRows.length;
  }
  const newRefs = newRows.map((row) => collection.doc(row.id));
  const stagedTasks = await readExactNewTasks(db, newRefs, newRows, core);
  const stagedPreflight = preflightRooms(stagedTasks, core);

  const beforeDelete = await collection.get();
  const barrierBeforeDelete = await getPoolMigrationBarrier(db);
  const preDeletePlan = planApplyPoolRecovery({
    ...recoveryContract,
    currentRows: beforeDelete.docs.map(snapshotBackupRow),
    barrier: barrierBeforeDelete,
  });
  const beforeDeleteById = new Map(beforeDelete.docs.map((doc) => [doc.id, doc]));
  const oldDocs = preDeletePlan.remainingOldIds.map((taskId) => beforeDeleteById.get(taskId));
  assert.equal(oldDocs.every(Boolean), true, 'pre_delete_old_doc_missing');
  assert.equal(beforeDelete.docs.filter((doc) => !newIdSet.has(doc.id)).length, oldDocs.length,
    'pre_delete_unexpected_document');
  const roomReferenceEvidenceBeforeDelete = await assertNoProtectedRoomReferences(
    db, oldIds, 'pre_delete', validateTaskSecret,
  );

  for (const docs of chunkItems(oldDocs, 400)) {
    const batch = db.batch();
    for (const doc of docs) batch.delete(doc.ref, { lastUpdateTime: doc.updateTime });
    await batch.commit();
  }

  const finalSnapshot = await collection.get();
  assert.equal(finalSnapshot.size, EXPECTED_NEW_COUNT, `final_count_invalid:${finalSnapshot.size}`);
  assert.deepStrictEqual(finalSnapshot.docs.map((doc) => doc.id).sort(), newRows.map((row) => row.id).sort(),
    'final_ids_invalid');
  const finalTasks = finalSnapshot.docs.map((doc) => doc.data());
  const finalInvalid = finalTasks.map((task) => core.validateTournamentTaskForNewRoom(task)).filter((x) => !x.ok);
  assert.equal(finalInvalid.length, 0, 'final_invalid_tasks');
  assertTranslateBuildSemantics(finalSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
  assert.deepStrictEqual([...new Set(finalTasks.map((task) => task.mode))].sort(), [...MODES].sort());
  assert.equal(finalTasks.every((task) => task.poolVersion === EXPECTED_VERSION), true);
  const finalPreflight = preflightRooms(finalTasks, core);
  const barrierRelease = await releasePoolMigrationBarrier(db, {
    expectedGeneration: sourceGeneration,
    targetGeneration: EXPECTED_VERSION,
    migrationId,
    exposure: manifest.generated.exposure,
  });

  const report = {
    ...preflightReport,
    kind: 'tournament_pool_v7_apply_report_v1',
    completedAt: new Date().toISOString(),
    actualMutations: {
      created,
      deleted: oldDocs.length,
      barrierWrites: barrierAcquisition.resumed ? 1 : 2,
    },
    barrier: {
      sourceGeneration,
      targetGeneration: EXPECTED_VERSION,
      migrationId,
      recoveryPlan,
      acquisition: barrierAcquisition,
      protectedRoomsAfterAcquisition: roomReferenceEvidenceAfterAcquisition.roomsScanned,
      roomReferenceEvidenceAfterAcquisition,
      release: barrierRelease,
    },
    stageGate: {
      readBack: stagedTasks.length,
      invalid: 0,
      roomReferenceEvidenceBeforeDelete,
      ...stagedPreflight,
    },
    finalGate: { documents: finalSnapshot.size, invalid: finalInvalid.length, ...finalPreflight },
    productionWrites: created + oldDocs.length + (barrierAcquisition.resumed ? 1 : 2),
  };
  const reportPath = path.resolve(requestedReportPath || path.join(path.dirname(manifestPath), 'apply-report.json'));
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ reportPath, ...report })}\n`);
}

module.exports = {
  EXPECTED_NEW_COUNT,
  EXPECTED_SOURCE_VERSION,
  EXPECTED_VERSION,
  POOL_BARRIER_COLLECTION,
  POOL_BARRIER_DOC,
  POOL_BARRIER_KIND,
  acquirePoolMigrationBarrier,
  assertNoProtectedRoomReferences,
  assertPinnedBundle,
  assertTranslateBuildSemantics,
  assertExposureLayoutRows,
  chunkItems,
  findBlockingRoomReferences,
  getPoolMigrationBarrier,
  inspectRoomReferenceSafety,
  parsePoolBarrier,
  planApplyPoolRecovery,
  releasePoolMigrationBarrier,
  tournamentExposureRelease,
  resolveApplyIntent,
  resolveSourceGeneration,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
