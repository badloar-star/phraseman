import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DASHBOARD_WIDGETS_SCHEMA_VERSION,
  DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX,
  DASHBOARD_WIDGET_REGISTRY,
  buildDashboardWidgetsKey,
  readDashboardWidgetPreferences,
  resetDashboardWidgetPreferences,
  sanitizeDashboardWidgetVisibility,
  writeDashboardWidgetPreferences,
} from '../admin/v2/scripts/admin-v2-dashboard-widgets.js';

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
    values,
  };
}

const allowed = new Set(['diagnostics.read', 'money.read', 'reports.read']);
const can = (permission) => allowed.has(permission);
const ids = ['operational_state', 'payment_summary', 'decision_queue', 'quick_links'];
const scopeOne = `uid-sha256-v1_${'a'.repeat(64)}`;
const brokenScope = `uid-sha256-v1_${'b'.repeat(64)}`;
const wrongScope = `uid-sha256-v1_${'c'.repeat(64)}`;
const safeScope = `uid-sha256-v1_${'d'.repeat(64)}`;

assert.equal(DASHBOARD_WIDGETS_SCHEMA_VERSION, 1);
assert.equal(DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX, 'phraseman.admin.v2.dashboard-widgets.v1:');
assert(Object.isFrozen(DASHBOARD_WIDGET_REGISTRY));
assert(DASHBOARD_WIDGET_REGISTRY.every((item) => Object.isFrozen(item)));
assert.deepEqual(DASHBOARD_WIDGET_REGISTRY.map((item) => item.id), ids);
assert.equal(DASHBOARD_WIDGET_REGISTRY.length, 4);
assert.equal(buildDashboardWidgetsKey(scopeOne), `phraseman.admin.v2.dashboard-widgets.v1:${scopeOne}`);
assert.equal(buildDashboardWidgetsKey(' account / one '), null);
assert.equal(buildDashboardWidgetsKey(''), null);

assert.deepEqual(
  sanitizeDashboardWidgetVisibility(['payment_summary', 'unknown', 'payment_summary', 'operational_state'], { can }),
  ids,
  'critical and notice widgets remain visible and visible widgets retain registry order',
);
assert.deepEqual(
  sanitizeDashboardWidgetVisibility(['payment_summary', 'quick_links'], { can, excludedIds: new Set(['payment_summary']) }),
  ['operational_state', 'decision_queue', 'quick_links'],
  'excluded widgets are removed while forced widgets remain visible',
);
assert.deepEqual(
  sanitizeDashboardWidgetVisibility(ids, { can: () => false }),
  ['quick_links'],
  'permission-denied widgets are never restored from preferences',
);

const storage = createStorage();
assert.deepEqual(readDashboardWidgetPreferences({ storage, scope: scopeOne, can }), ids);
assert.deepEqual(
  writeDashboardWidgetPreferences({ storage, scope: scopeOne, visibleIds: ['payment_summary'], can }),
  ids,
);
assert.deepEqual(
  JSON.parse(storage.values.get(buildDashboardWidgetsKey(scopeOne))),
  { v: 1, visibleIds: ids },
);
assert.deepEqual(resetDashboardWidgetPreferences({ storage, scope: scopeOne, can }), ids);
assert.equal(storage.values.has(buildDashboardWidgetsKey(scopeOne)), false);
assert.deepEqual(readDashboardWidgetPreferences({ storage, scope: null, can }), ids);

const malformed = createStorage({ [buildDashboardWidgetsKey(brokenScope)]: '{bad' });
assert.deepEqual(readDashboardWidgetPreferences({ storage: malformed, scope: brokenScope, can }), ids);
const wrongVersion = createStorage({ [buildDashboardWidgetsKey(wrongScope)]: JSON.stringify({ v: 2, visibleIds: [] }) });
assert.deepEqual(readDashboardWidgetPreferences({ storage: wrongVersion, scope: wrongScope, can }), ids);
const brokenStorage = { getItem() { throw new Error('broken'); }, setItem() { throw new Error('broken'); }, removeItem() { throw new Error('broken'); } };
assert.deepEqual(readDashboardWidgetPreferences({ storage: brokenStorage, scope: safeScope, can }), ids);
assert.deepEqual(writeDashboardWidgetPreferences({ storage: brokenStorage, scope: safeScope, visibleIds: ids, can }), ids);
assert.deepEqual(resetDashboardWidgetPreferences({ storage: brokenStorage, scope: safeScope, can }), ids);

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '..', 'admin', 'v2', 'scripts', 'admin-v2-dashboard-widgets.js'), 'utf8').toLowerCase();
for (const forbidden of ['document', 'window', 'localstorage', 'fetch(', 'http', 'network']) {
  assert.equal(source.includes(forbidden), false, `forbidden source term: ${forbidden}`);
}

console.log('admin-v2-dashboard-widgets: PASS');
