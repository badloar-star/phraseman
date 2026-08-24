'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = require('./apply-tournament-pool-v11.cjs');

const EXPECTED_PROJECT_ID = 'phraseman-ea0b3';

function resolveRollbackIntent(argv = process.argv.slice(2), env = process.env) {
  if (argv.includes('--apply') && !argv.includes('--rollback')) throw new Error('rollback_flag_required');
  if (!argv.includes('--rollback')) return false;
  if (env.PHRASEMAN_TOURNAMENT_V11_ROLLBACK !== '1') throw new Error('rollback_guard_missing');
  return true;
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

function assertTargetOrInterruptedBarrier(actual, artifact) {
  const ready = migration.canonical(actual) === migration.canonical(artifact.targetBarrier)
    && migration.canonicalSha256(actual) === artifact.targetBarrierSha256;
  const interruptedBarrier = migration.migratingBarrier(
    artifact.sourceBarrier,
    { pins: artifact.target },
    artifact.backupSha256,
    artifact.targetBarrier.releasedAt,
  );
  const interrupted = migration.canonical(actual) === migration.canonical(interruptedBarrier);
  if (!ready && !interrupted) throw new Error('rollback_target_barrier_drift');
  return ready ? 'ready' : 'interrupted';
}

function assertNoBlockers(rooms, targetIds, phase, nowMs) {
  const blockers = migration.findBlockingRoomReferences(rooms, targetIds, nowMs);
  if (blockers.length) throw new Error(`${phase}_protected_room_references:${blockers.length}`);
}

function rollbackMigratingBarrier(actual, artifact, now) {
  return Object.freeze({
    ...actual,
    state: 'migrating',
    revision: Number(actual.revision) + 1,
    targetGeneration: artifact.sourceBarrier.generation,
    migrationId: `rollback:${artifact.backupSha256}`,
    acquiredAt: now,
  });
}

function rowMap(rows) {
  return new Map(exactRows(rows, 'rollback_current_rows').map((row) => [row.id, row]));
}

function same(left, right) {
  return migration.canonical(left) === migration.canonical(right);
}

async function readExactRows(adapter, ids, expectedRows, label) {
  const rows = [];
  for (const chunk of migration.chunkItems(ids)) rows.push(...await adapter.readTasks(chunk));
  const expectedById = new Map(expectedRows.map((row) => [row.id, row]));
  if (rows.length !== ids.length || rows.some((row) => !expectedById.has(row.id)
    || !same(row, expectedById.get(row.id)))) throw new Error(`${label}_mismatch`);
  return rows;
}

async function executeRollback(options) {
  const artifact = migration.validateRollbackArtifact(options.artifact, options.expectedBackupSha256);
  const actualBarrier = await options.adapter.readBarrier();
  const barrierMode = assertTargetOrInterruptedBarrier(
    actualBarrier,
    { ...artifact, backupSha256: options.expectedBackupSha256 },
  );
  const targetIds = new Set(artifact.target.taskIds);
  assertNoBlockers(await options.adapter.readRooms(), targetIds, 'rollback_preflight', options.nowMs);
  const currentRows = exactRows(await options.adapter.readAllTasks(), 'rollback_current_rows');
  const current = rowMap(currentRows);
  const knownIds = new Set([
    ...artifact.sourceRows.map((row) => row.id),
    ...artifact.target.taskIds,
  ]);
  if (currentRows.some((row) => !knownIds.has(row.id))) {
    throw new Error('rollback_current_rows_mismatch');
  }
  const missingSource = [];
  for (const source of artifact.sourceRows) {
    const present = current.get(source.id);
    if (!present) missingSource.push(source);
    else if (!same(present, source)) throw new Error(`rollback_source_drift:${source.id}`);
  }
  if (missingSource.length) throw new Error('rollback_source_rows_missing');
  const targetRowsById = new Map(artifact.target.rows.map((row) => [row.id, row]));
  const presentTargetIds = [];
  for (const id of artifact.target.taskIds) {
    const present = current.get(id);
    if (!present) continue;
    if (!same(present, targetRowsById.get(id))) throw new Error(`rollback_target_drift:${id}`);
    presentTargetIds.push(id);
  }
  if (barrierMode === 'ready' && presentTargetIds.length !== artifact.target.taskIds.length) {
    throw new Error('rollback_target_rows_missing');
  }
  if (!options.rollback) {
    return Object.freeze({
      mode: 'preflight', productionWrites: 0,
      proposedRestore: missingSource.length, proposedDelete: presentTargetIds.length,
    });
  }
  const now = options.now || new Date().toISOString();
  const acquired = rollbackMigratingBarrier(actualBarrier, {
    ...artifact, backupSha256: options.expectedBackupSha256,
  }, now);
  await options.adapter.acquireBarrier(actualBarrier, acquired);
  const postAcquireRows = exactRows(
    await options.adapter.readAllTasks(),
    'rollback_post_acquire_rows',
  );
  if (!same(postAcquireRows, currentRows)) throw new Error('rollback_post_acquire_rows_mismatch');
  assertNoBlockers(await options.adapter.readRooms(), targetIds, 'rollback_post_acquire', options.nowMs);
  for (const chunk of migration.chunkItems(missingSource)) await options.adapter.restoreTasks(chunk);
  await readExactRows(
    options.adapter,
    artifact.sourceRows.map((row) => row.id),
    artifact.sourceRows,
    'rollback_source_read_back',
  );
  for (const chunk of migration.chunkItems(presentTargetIds)) await options.adapter.deleteTasks(chunk);
  const targetReadBack = [];
  for (const chunk of migration.chunkItems(artifact.target.taskIds)) {
    targetReadBack.push(...await options.adapter.readTasks(chunk));
  }
  if (targetReadBack.length !== 0) throw new Error('rollback_target_delete_read_back_mismatch');
  const finalRows = exactRows(await options.adapter.readAllTasks(), 'rollback_final_rows');
  if (!same(finalRows, artifact.sourceRows)) throw new Error('rollback_final_rows_mismatch');
  await options.adapter.switchBarrier(acquired, artifact.sourceBarrier);
  const barrierReadBack = await options.adapter.readBarrier();
  if (!same(barrierReadBack, artifact.sourceBarrier)) throw new Error('rollback_source_barrier_read_back_mismatch');
  return Object.freeze({
    mode: 'rollback', restored: missingSource.length, deleted: presentTargetIds.length,
    productionWrites: missingSource.length + presentTargetIds.length + 2,
    sourceBarrier: artifact.sourceBarrier,
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

async function main() {
  const argv = process.argv.slice(2);
  const rollback = resolveRollbackIntent(argv, process.env);
  const artifact = JSON.parse(fs.readFileSync(path.resolve(requiredArg('rollback-artifact', argv)), 'utf8'));
  const expectedBackupSha256 = requiredArg('expected-backup-sha', argv);
  const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(requiredArg('service-account', argv)), 'utf8'));
  assert.equal(serviceAccount.project_id, EXPECTED_PROJECT_ID, 'service_account_project_mismatch');
  const admin = require('../functions/node_modules/firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: EXPECTED_PROJECT_ID });
  const adapter = migration.createFirebaseAdapter(admin, admin.firestore());
  const result = await executeRollback({ adapter, artifact, expectedBackupSha256, rollback });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

module.exports = {
  assertTargetOrInterruptedBarrier,
  executeRollback,
  resolveRollbackIntent,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
