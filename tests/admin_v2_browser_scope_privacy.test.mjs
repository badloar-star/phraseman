import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import {
  ADMIN_BROWSER_PREFERENCE_SCOPE_NAMESPACE,
  DASHBOARD_WIDGETS_STORAGE_SCAN_LIMIT,
  DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX,
  buildDashboardWidgetsKey,
  deriveAdminBrowserPreferenceScope,
  drainLegacyDashboardWidgetPreferences,
  isValidAdminBrowserPreferenceScope,
  migrateDashboardWidgetPreferences,
  readDashboardWidgetPreferences,
  writeDashboardWidgetPreferences,
} from '../admin/v2/scripts/admin-v2-dashboard-widgets.js';
import {
  FAVORITES_STORAGE_KEY_PREFIX,
  buildFavoritesKey,
  createFavoritesStore,
} from '../admin/v2/scripts/admin-v2-favorites.js';

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(key); },
    values,
  };
}

const permissions = new Set(['diagnostics.read', 'money.read', 'reports.read']);
const can = (permission) => permissions.has(permission);
const defaultWidgetIds = ['operational_state', 'payment_summary', 'decision_queue', 'quick_links'];
const firebaseUidA = 'firebase-user-A_123';
const firebaseUidB = 'firebase-user-B_456';
const rawEmail = 'owner+admin@example.com';

const scopeA = await deriveAdminBrowserPreferenceScope(firebaseUidA, { cryptoProvider: webcrypto });
const scopeARepeat = await deriveAdminBrowserPreferenceScope(firebaseUidA, { cryptoProvider: webcrypto });
const scopeB = await deriveAdminBrowserPreferenceScope(firebaseUidB, { cryptoProvider: webcrypto });
const expectedDigest = createHash('sha256')
  .update(`${ADMIN_BROWSER_PREFERENCE_SCOPE_NAMESPACE}${firebaseUidA}`, 'utf8')
  .digest('hex');

assert.equal(scopeA, `uid-sha256-v1_${expectedDigest}`);
assert.equal(scopeARepeat, scopeA, 'the same Firebase UID has a deterministic browser scope');
assert.notEqual(scopeB, scopeA, 'different Firebase UIDs remain isolated');
assert.equal(isValidAdminBrowserPreferenceScope(scopeA), true);
for (const invalid of [null, '', firebaseUidA, `admin:${rawEmail}`, encodeURIComponent(`admin:${rawEmail}`), 'uid-sha256-v1_short', `uid-sha256-v1_${'A'.repeat(64)}`]) {
  assert.equal(isValidAdminBrowserPreferenceScope(invalid), false, `invalid scope must fail closed: ${String(invalid)}`);
  assert.equal(buildDashboardWidgetsKey(invalid), null);
  assert.equal(buildFavoritesKey(invalid), null);
}

const dashboardKeyA = buildDashboardWidgetsKey(scopeA);
const favoritesKeyA = buildFavoritesKey(scopeA);
assert.equal(dashboardKeyA, `${DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX}${scopeA}`);
assert.equal(favoritesKeyA, `${FAVORITES_STORAGE_KEY_PREFIX}${scopeA}`);
for (const forbidden of [firebaseUidA, rawEmail, encodeURIComponent(firebaseUidA), encodeURIComponent(rawEmail)]) {
  assert.equal(dashboardKeyA.includes(forbidden), false);
  assert.equal(favoritesKeyA.includes(forbidden), false);
}

const cryptoFailure = { subtle: { async digest() { throw new Error('crypto unavailable'); } } };
const cryptoGetterFailure = { get subtle() { throw new Error('crypto unavailable'); } };
assert.equal(await deriveAdminBrowserPreferenceScope('', { cryptoProvider: webcrypto }), null);
assert.equal(await deriveAdminBrowserPreferenceScope(firebaseUidA, { cryptoProvider: null }), null);
assert.equal(await deriveAdminBrowserPreferenceScope(firebaseUidA, { cryptoProvider: cryptoFailure }), null);
assert.equal(await deriveAdminBrowserPreferenceScope(firebaseUidA, { cryptoProvider: cryptoGetterFailure }), null);

let persistentWrites = 0;
const unavailableStorage = {
  getItem() { throw new Error('storage unavailable'); },
  setItem() { persistentWrites += 1; throw new Error('storage unavailable'); },
  removeItem() { throw new Error('storage unavailable'); },
};
assert.deepEqual(readDashboardWidgetPreferences({ storage: unavailableStorage, scope: null, can }), defaultWidgetIds);
assert.deepEqual(writeDashboardWidgetPreferences({ storage: unavailableStorage, scope: null, visibleIds: ['payment_summary'], can }), defaultWidgetIds);
assert.equal(persistentWrites, 0, 'pending/invalid scope must not attempt persistent writes');
assert.deepEqual(writeDashboardWidgetPreferences({ storage: unavailableStorage, scope: scopeA, visibleIds: ['payment_summary'], can }), defaultWidgetIds);
assert.equal(persistentWrites, 1, 'storage failure keeps the sanitized session result');

const legacyCurrentKey = `${DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX}${encodeURIComponent(`admin:${rawEmail}`)}`;
const legacyOtherKey = `${DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX}${encodeURIComponent('admin:other@example.com')}`;
const unrelatedKey = 'phraseman.admin.v2.unrelated:admin%3Akeep-me';
const legacyStorage = createStorage({
  [legacyCurrentKey]: JSON.stringify({ v: 1, visibleIds: ['payment_summary'] }),
  [legacyOtherKey]: JSON.stringify({ v: 1, visibleIds: ['operational_state'] }),
  [dashboardKeyA]: JSON.stringify({ v: 1, visibleIds: ['quick_links'] }),
  [unrelatedKey]: 'unrelated',
});
const drained = drainLegacyDashboardWidgetPreferences({
  storage: legacyStorage,
  legacyScope: `admin:${rawEmail}`,
  can,
});
assert.deepEqual(drained.visibleIds, defaultWidgetIds);
assert.equal(drained.removedKeys, 2);
assert.equal(legacyStorage.values.has(legacyCurrentKey), false);
assert.equal(legacyStorage.values.has(legacyOtherKey), false);
assert.equal(legacyStorage.values.has(dashboardKeyA), true, 'opaque scoped data is not broadly deleted');
assert.equal(legacyStorage.values.has(unrelatedKey), true, 'unrelated V2 storage survives cleanup');

let throwingLengthReads = 0;
let throwingLengthWrites = 0;
const throwingLengthStorage = {
  get length() {
    throwingLengthReads += 1;
    throw new Error('length unavailable');
  },
  key() { throw new Error('key must not be called'); },
  getItem() { return null; },
  setItem() { throwingLengthWrites += 1; },
  removeItem() { throw new Error('remove must not be called'); },
};
assert.doesNotThrow(() => drainLegacyDashboardWidgetPreferences({
  storage: throwingLengthStorage,
  legacyScope: `admin:${rawEmail}`,
  can,
}));
assert.deepEqual(drainLegacyDashboardWidgetPreferences({
  storage: throwingLengthStorage,
  legacyScope: `admin:${rawEmail}`,
  can,
}), { visibleIds: null, removedKeys: 0 });
assert.equal(throwingLengthReads, 1, 'a failed storage is latched session-only without probing it again');
assert.deepEqual(writeDashboardWidgetPreferences({
  storage: throwingLengthStorage,
  scope: scopeA,
  visibleIds: ['payment_summary'],
  can,
}), defaultWidgetIds);
assert.equal(throwingLengthWrites, 0, 'failed legacy enumeration keeps widget preferences session-only');

let throwingKeyWrites = 0;
const throwingKeyStorage = {
  length: 2,
  key(index) {
    if (index === 1) throw new Error('key unavailable');
    return legacyCurrentKey;
  },
  getItem() { return null; },
  setItem() { throwingKeyWrites += 1; },
  removeItem() { throw new Error('partial snapshots must not remove keys'); },
};
assert.doesNotThrow(() => drainLegacyDashboardWidgetPreferences({
  storage: throwingKeyStorage,
  legacyScope: `admin:${rawEmail}`,
  can,
}));
assert.deepEqual(writeDashboardWidgetPreferences({
  storage: throwingKeyStorage,
  scope: scopeA,
  visibleIds: ['payment_summary'],
  can,
}), defaultWidgetIds);
assert.equal(throwingKeyWrites, 0, 'failed key enumeration keeps widget preferences session-only');

let snapshotLengthReads = 0;
let duplicateLegacyRemovals = 0;
let unrelatedRemovals = 0;
const duplicateKeyStorage = {
  get length() {
    snapshotLengthReads += 1;
    return 3;
  },
  key(index) {
    return [legacyCurrentKey, legacyCurrentKey, unrelatedKey][index] ?? null;
  },
  getItem() { return null; },
  setItem() {},
  removeItem(key) {
    if (key === legacyCurrentKey) duplicateLegacyRemovals += 1;
    if (key === unrelatedKey) unrelatedRemovals += 1;
  },
};
assert.deepEqual(drainLegacyDashboardWidgetPreferences({
  storage: duplicateKeyStorage,
  legacyScope: `admin:${rawEmail}`,
  can,
}), { visibleIds: null, removedKeys: 1 });
assert.equal(snapshotLengthReads, 1, 'storage length is snapshotted once');
assert.equal(duplicateLegacyRemovals, 1, 'duplicate keys are removed once');
assert.equal(unrelatedRemovals, 0, 'non-dashboard keys are never touched');

let oversizedKeyReads = 0;
let oversizedWrites = 0;
const oversizedStorage = {
  length: DASHBOARD_WIDGETS_STORAGE_SCAN_LIMIT + 1,
  key() {
    oversizedKeyReads += 1;
    return legacyCurrentKey;
  },
  getItem() { return null; },
  setItem() { oversizedWrites += 1; },
  removeItem() {},
};
assert.deepEqual(drainLegacyDashboardWidgetPreferences({
  storage: oversizedStorage,
  legacyScope: `admin:${rawEmail}`,
  can,
}), { visibleIds: null, removedKeys: 0 });
assert.equal(oversizedKeyReads, 0, 'oversized storage enumeration is bounded before key access');
writeDashboardWidgetPreferences({
  storage: oversizedStorage,
  scope: scopeA,
  visibleIds: ['payment_summary'],
  can,
});
assert.equal(oversizedWrites, 0, 'oversized storage remains session-only');

const migrationStorage = createStorage();
assert.deepEqual(migrateDashboardWidgetPreferences({
  storage: migrationStorage,
  scope: scopeA,
  visibleIds: drained.visibleIds,
  can,
}), defaultWidgetIds);
assert.deepEqual(JSON.parse(migrationStorage.values.get(dashboardKeyA)), { v: 1, visibleIds: defaultWidgetIds });
migrationStorage.values.set(dashboardKeyA, JSON.stringify({ v: 1, visibleIds: ['quick_links'] }));
assert.deepEqual(migrateDashboardWidgetPreferences({
  storage: migrationStorage,
  scope: scopeA,
  visibleIds: ['payment_summary'],
  can,
}), ['operational_state', 'decision_queue', 'quick_links'], 'an existing opaque preference wins over stale legacy data');

const favoritesStorage = createStorage();
const sessionFavorites = createFavoritesStore({ storage: favoritesStorage, scope: null, isAllowedId: () => true });
assert.deepEqual(sessionFavorites.replace(['a', 'b']), ['a', 'b']);
assert.deepEqual(sessionFavorites.load(), ['a', 'b']);
assert.equal(favoritesStorage.values.size, 0, 'pre-digest favorites remain session-only');
assert.deepEqual(sessionFavorites.setScope(scopeA), []);
assert.deepEqual(sessionFavorites.load(), [], 'scope transition clears prior in-memory favorites');
assert.deepEqual(sessionFavorites.replace(['a']), ['a']);
assert.equal(favoritesStorage.values.has(favoritesKeyA), true);
assert.deepEqual(sessionFavorites.setScope(null), []);
assert.equal(favoritesStorage.values.has(favoritesKeyA), false, 'sign-out clears the prior scoped key');
assert.deepEqual(sessionFavorites.load(), []);

const serializedStorage = JSON.stringify([
  ...legacyStorage.values.entries(),
  ...migrationStorage.values.entries(),
  ...favoritesStorage.values.entries(),
]);
for (const forbidden of [firebaseUidA, firebaseUidB, rawEmail, encodeURIComponent(firebaseUidA), encodeURIComponent(rawEmail)]) {
  assert.equal(serializedStorage.includes(forbidden), false, `raw identity leaked to V2 storage: ${forbidden}`);
}

console.log('admin-v2-browser-scope-privacy: PASS');
