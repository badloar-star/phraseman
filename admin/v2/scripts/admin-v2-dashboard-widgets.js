export const DASHBOARD_WIDGETS_SCHEMA_VERSION = 1;
export const DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX = 'phraseman.admin.v2.dashboard-widgets.v1:';
export const DASHBOARD_WIDGETS_MAX_VISIBLE = 4;
export const DASHBOARD_WIDGETS_STORAGE_SCAN_LIMIT = 512;
export const ADMIN_BROWSER_PREFERENCE_SCOPE_NAMESPACE = 'phraseman:admin-v2:browser-preferences:v1:firebase-uid:';

const ADMIN_BROWSER_PREFERENCE_SCOPE_PATTERN = /^uid-sha256-v1_[0-9a-f]{64}$/;
const sessionOnlyStorages = new WeakSet();

export const DASHBOARD_WIDGET_REGISTRY = Object.freeze([
  Object.freeze({ id: 'operational_state', permission: 'diagnostics.read', critical: true }),
  Object.freeze({ id: 'payment_summary', permission: 'money.read' }),
  Object.freeze({ id: 'decision_queue', permission: 'reports.read', critical: true }),
  Object.freeze({ id: 'quick_links', notice: true }),
]);

export function normalizeFirebaseUid(uid) {
  if (typeof uid !== 'string' || uid.length < 1 || uid.length > 128 || uid.trim() !== uid) return null;
  return /[\u0000-\u001f\u007f]/.test(uid) ? null : uid;
}

export function isValidAdminBrowserPreferenceScope(scope) {
  return typeof scope === 'string' && ADMIN_BROWSER_PREFERENCE_SCOPE_PATTERN.test(scope);
}

export async function deriveAdminBrowserPreferenceScope(firebaseUid, { cryptoProvider = globalThis.crypto } = {}) {
  const uid = normalizeFirebaseUid(firebaseUid);
  if (!uid || typeof TextEncoder !== 'function') return null;
  try {
    const subtle = cryptoProvider?.subtle;
    const digest = subtle?.digest;
    if (typeof digest !== 'function') return null;
    const bytes = new TextEncoder().encode(`${ADMIN_BROWSER_PREFERENCE_SCOPE_NAMESPACE}${uid}`);
    const hash = await digest.call(subtle, 'SHA-256', bytes);
    const hex = [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
    const scope = `uid-sha256-v1_${hex}`;
    return isValidAdminBrowserPreferenceScope(scope) ? scope : null;
  } catch {
    return null;
  }
}

function normalizeId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function includesId(collection, id) {
  return Boolean(collection?.has?.(id));
}

function isPermitted(item, can) {
  if (!item.permission) return true;
  try {
    return can(item.permission) === true;
  } catch {
    return false;
  }
}

function requestedIds(values) {
  const requested = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const id = normalizeId(value);
    if (id) requested.add(id);
  }
  return requested;
}

function defaultVisibleIds(options) {
  return DASHBOARD_WIDGET_REGISTRY
    .filter((item) => !includesId(options.excludedIds, item.id) && isPermitted(item, options.can))
    .map((item) => item.id)
    .slice(0, DASHBOARD_WIDGETS_MAX_VISIBLE);
}

function isStorageObject(storage) {
  return (typeof storage === 'object' && storage !== null) || typeof storage === 'function';
}

function markStorageSessionOnly(storage) {
  if (isStorageObject(storage)) sessionOnlyStorages.add(storage);
}

function canUsePersistentStorage(storage) {
  return isStorageObject(storage) && !sessionOnlyStorages.has(storage);
}

export function buildDashboardWidgetsKey(scope) {
  return isValidAdminBrowserPreferenceScope(scope) ? `${DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX}${scope}` : null;
}

export function sanitizeDashboardWidgetVisibility(visibleIds, { can = () => false, excludedIds = new Set() } = {}) {
  const requested = requestedIds(visibleIds);
  return DASHBOARD_WIDGET_REGISTRY
    .filter((item) => !includesId(excludedIds, item.id) && isPermitted(item, can))
    .filter((item) => item.critical === true || item.notice === true || requested.has(item.id))
    .map((item) => item.id)
    .slice(0, DASHBOARD_WIDGETS_MAX_VISIBLE);
}

export function readDashboardWidgetPreferences({ storage, scope, can = () => false, excludedIds = new Set() } = {}) {
  const key = buildDashboardWidgetsKey(scope);
  const options = { can, excludedIds };
  if (!key || !canUsePersistentStorage(storage)) return defaultVisibleIds(options);
  try {
    if (typeof storage.getItem !== 'function') return defaultVisibleIds(options);
    const raw = storage.getItem(key);
    if (typeof raw !== 'string') return defaultVisibleIds(options);
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== DASHBOARD_WIDGETS_SCHEMA_VERSION || !Array.isArray(parsed.visibleIds)) return defaultVisibleIds(options);
    return sanitizeDashboardWidgetVisibility(parsed.visibleIds, options);
  } catch {
    return defaultVisibleIds(options);
  }
}

export function writeDashboardWidgetPreferences({ storage, scope, visibleIds, can = () => false, excludedIds = new Set() } = {}) {
  const key = buildDashboardWidgetsKey(scope);
  const sanitized = sanitizeDashboardWidgetVisibility(visibleIds, { can, excludedIds });
  if (!key || !canUsePersistentStorage(storage)) return sanitized;
  try {
    if (typeof storage.setItem !== 'function') return sanitized;
    storage.setItem(key, JSON.stringify({ v: DASHBOARD_WIDGETS_SCHEMA_VERSION, visibleIds: sanitized }));
    return sanitized;
  } catch {
    markStorageSessionOnly(storage);
    return sanitized;
  }
}

export function resetDashboardWidgetPreferences({ storage, scope, can = () => false, excludedIds = new Set() } = {}) {
  const key = buildDashboardWidgetsKey(scope);
  const defaults = defaultVisibleIds({ can, excludedIds });
  if (!key || !canUsePersistentStorage(storage)) return defaults;
  try {
    if (typeof storage.removeItem !== 'function') return defaults;
    storage.removeItem(key);
    return defaults;
  } catch {
    markStorageSessionOnly(storage);
    return defaults;
  }
}

function parseDashboardWidgetPreferences(raw, options) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== DASHBOARD_WIDGETS_SCHEMA_VERSION || !Array.isArray(parsed.visibleIds)) return null;
    return sanitizeDashboardWidgetVisibility(parsed.visibleIds, options);
  } catch {
    return null;
  }
}

function storageKeySnapshot(storage) {
  if (!canUsePersistentStorage(storage)) return null;
  try {
    const keyAt = storage.key;
    const length = storage.length;
    if (
      typeof keyAt !== 'function'
      || !Number.isInteger(length)
      || length < 0
      || length > DASHBOARD_WIDGETS_STORAGE_SCAN_LIMIT
    ) {
      markStorageSessionOnly(storage);
      return null;
    }
    const keys = new Set();
    for (let index = 0; index < length; index += 1) {
      const key = keyAt.call(storage, index);
      if (typeof key === 'string') keys.add(key);
    }
    return [...keys];
  } catch {
    markStorageSessionOnly(storage);
    return null;
  }
}

function isLegacyDashboardWidgetPiiKey(key) {
  if (typeof key !== 'string' || !key.startsWith(DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX)) return false;
  const suffix = key.slice(DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX.length);
  return /^admin(?::|%3a)/i.test(suffix);
}

export function drainLegacyDashboardWidgetPreferences({ storage, legacyScope, can = () => false, excludedIds = new Set() } = {}) {
  const normalizedLegacyScope = typeof legacyScope === 'string' && legacyScope.trim() ? legacyScope.trim() : null;
  const currentKeys = normalizedLegacyScope
    ? new Set([
      `${DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX}${normalizedLegacyScope}`,
      `${DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX}${encodeURIComponent(normalizedLegacyScope)}`,
    ])
    : new Set();
  const options = { can, excludedIds };
  let visibleIds = null;
  let removedKeys = 0;
  const keys = storageKeySnapshot(storage);
  if (!keys) return { visibleIds, removedKeys };
  for (const key of keys) {
    if (!isLegacyDashboardWidgetPiiKey(key)) continue;
    if (visibleIds === null && currentKeys.has(key)) {
      try {
        if (typeof storage.getItem !== 'function') {
          markStorageSessionOnly(storage);
        } else {
          const raw = storage.getItem(key);
          if (typeof raw === 'string') visibleIds = parseDashboardWidgetPreferences(raw, options);
        }
      } catch {
        markStorageSessionOnly(storage);
      }
    }
    try {
      if (typeof storage.removeItem !== 'function') {
        markStorageSessionOnly(storage);
        continue;
      }
      storage.removeItem(key);
      removedKeys += 1;
    } catch {
      markStorageSessionOnly(storage);
    }
  }
  return { visibleIds, removedKeys };
}

export function migrateDashboardWidgetPreferences({ storage, scope, visibleIds, can = () => false, excludedIds = new Set() } = {}) {
  const key = buildDashboardWidgetsKey(scope);
  const options = { can, excludedIds };
  const fallback = sanitizeDashboardWidgetVisibility(visibleIds, options);
  if (!key || !canUsePersistentStorage(storage)) return fallback;
  try {
    if (typeof storage.getItem !== 'function') return fallback;
    if (typeof storage.getItem(key) === 'string') return readDashboardWidgetPreferences({ storage, scope, ...options });
  } catch {
    markStorageSessionOnly(storage);
    return fallback;
  }
  return writeDashboardWidgetPreferences({ storage, scope, visibleIds: fallback, ...options });
}
