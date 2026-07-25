import assert from 'node:assert/strict';
import test from 'node:test';
import { createRouteSnapshotStore } from '../admin/v2/scripts/admin-route-snapshots.js';

function memoryStorage() {
  const rows = new Map();
  return {
    getItem: (key) => rows.get(key) ?? null,
    setItem: (key, value) => rows.set(key, value),
    removeItem: (key) => rows.delete(key),
    keys: () => [...rows.keys()],
  };
}

test('isolates snapshots by admin and route', () => {
  const storage = memoryStorage();
  const store = createRouteSnapshotStore({ storage, now: () => 1_000, ttlMs: 500 });
  store.write('admin-a', 'report-center', { items: [{ id: 'r1' }] });
  assert.deepEqual(store.read('admin-a', 'report-center')?.data, { items: [{ id: 'r1' }] });
  assert.equal(store.read('admin-b', 'report-center'), null);
  assert.equal(store.read('admin-a', 'users'), null);
});

test('returns stale data for first paint but marks TTL expiry', () => {
  const storage = memoryStorage();
  let now = 1_000;
  const store = createRouteSnapshotStore({ storage, now: () => now, ttlMs: 500 });
  store.write('admin-a', 'users', { items: [1] });
  now = 1_600;
  assert.deepEqual(store.read('admin-a', 'users'), {
    data: { items: [1] },
    savedAtMs: 1_000,
    stale: true,
  });
});

test('clears only the signing-out admin and rejects unsafe payloads', () => {
  const storage = memoryStorage();
  const store = createRouteSnapshotStore({ storage, now: () => 1_000, ttlMs: 500 });
  store.write('admin-a', 'users', { items: [1] });
  store.write('admin-b', 'users', { items: [2] });
  store.clearAdmin('admin-a');
  assert.equal(store.read('admin-a', 'users'), null);
  assert.deepEqual(store.read('admin-b', 'users')?.data, { items: [2] });
  assert.throws(() => store.write('admin-b', 'users', { secret: undefined }));
});

test('rejects cached privileged data after the same admin is downgraded', () => {
  const storage = memoryStorage();
  const store = createRouteSnapshotStore({ storage, now: () => 1_000, ttlMs: 500 });
  const ownerAccess = { role: 'owner', permissions: ['reports.read', 'reports.reply.send'] };
  const analystAccess = { role: 'analyst', permissions: ['reports.read'] };
  store.write('admin-a', 'report-center', { reports: { items: [{ id: 'private-report' }] } }, ownerAccess);

  assert.equal(store.read('admin-a', 'report-center', analystAccess), null);
  assert.equal(store.read('admin-a', 'report-center', ownerAccess), null,
    'an access mismatch must evict the privileged snapshot instead of leaving it recoverable');
});

test('hydrates a snapshot only for the exact current role and permission set', () => {
  const storage = memoryStorage();
  const store = createRouteSnapshotStore({ storage, now: () => 1_000, ttlMs: 500 });
  const access = { role: 'support', permissions: ['reports.read', 'reports.reply.send'] };
  store.write('admin-a', 'report-center', { reports: { items: [{ id: 'r1' }] } }, access);
  assert.deepEqual(store.read('admin-a', 'report-center', access)?.data, { reports: { items: [{ id: 'r1' }] } });
});
