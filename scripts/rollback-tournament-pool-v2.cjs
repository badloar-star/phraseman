'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const admin = require('../functions/node_modules/firebase-admin');

const EXPECTED_PROJECT_ID = 'phraseman-ea0b3';
const COLLECTION = 'tournamentTasks';

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
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
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry)]));
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

async function main() {
  if (process.env.PHRASEMAN_TOURNAMENT_POOL_V2_ROLLBACK !== '1') {
    throw new Error('rollback_guard_missing');
  }
  const manifestPath = path.resolve(argValue('manifest') || '');
  const serviceAccountPath = path.resolve(argValue('service-account') || 'service-account.json');
  const expectedBackupSha = String(argValue('expected-backup-sha') || '').toLowerCase();
  const expectedNewSha = String(argValue('expected-new-sha') || '').toLowerCase();
  if (!manifestPath || !/^[a-f0-9]{64}$/.test(expectedBackupSha)
    || !/^[a-f0-9]{64}$/.test(expectedNewSha)) throw new Error('rollback_pins_required');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.projectId, EXPECTED_PROJECT_ID);
  const backupPath = path.join(path.dirname(manifestPath), manifest.artifacts.backupFile);
  const newPath = path.join(path.dirname(manifestPath), manifest.artifacts.newPoolFile);
  const rawBackup = fs.readFileSync(backupPath);
  const rawNew = fs.readFileSync(newPath);
  assert.equal(sha256(rawBackup), expectedBackupSha);
  assert.equal(sha256(rawNew), expectedNewSha);
  assert.equal(manifest.artifacts.backupSha256, expectedBackupSha);
  assert.equal(manifest.artifacts.newPoolSha256, expectedNewSha);
  const oldRows = rawBackup.toString('utf8').trim().split('\n').map(JSON.parse);
  const newRows = rawNew.toString('utf8').trim().split('\n').map(JSON.parse);
  const oldIds = new Set(oldRows.map((row) => row.id));
  const newIds = new Set(newRows.map((row) => row.id));
  assert.equal([...oldIds].some((id) => newIds.has(id)), false);

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

  const missingOld = oldRows.filter((row) => !currentById.has(row.id));
  for (let offset = 0; offset < missingOld.length; offset += 400) {
    const batch = db.batch();
    for (const row of missingOld.slice(offset, offset + 400)) {
      batch.create(collection.doc(row.id), decode(row.data, db));
    }
    await batch.commit();
  }

  const afterRestore = await collection.get();
  const afterRestoreById = new Map(afterRestore.docs.map((doc) => [doc.id, doc]));
  for (const row of oldRows) {
    const doc = afterRestoreById.get(row.id);
    assert.ok(doc, `restore_missing:${row.id}`);
    assert.deepStrictEqual(encode(doc.data()), row.data, `restore_data_mismatch:${row.id}`);
  }
  const stagedNewDocs = afterRestore.docs.filter((doc) => newIds.has(doc.id));
  for (let offset = 0; offset < stagedNewDocs.length; offset += 400) {
    const batch = db.batch();
    for (const doc of stagedNewDocs.slice(offset, offset + 400)) {
      batch.delete(doc.ref, { lastUpdateTime: doc.updateTime });
    }
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
  process.stdout.write(`${JSON.stringify({
    ok: true,
    projectId: EXPECTED_PROJECT_ID,
    restored: missingOld.length,
    removedNew: stagedNewDocs.length,
    finalDocuments: final.size,
    idempotentNoop: missingOld.length === 0 && stagedNewDocs.length === 0,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
