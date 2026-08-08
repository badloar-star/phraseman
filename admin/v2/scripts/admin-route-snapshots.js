const SNAPSHOT_PREFIX = 'phraseman_admin_v2_route_snapshot_v1';
const TOKEN_RE = /^[A-Za-z0-9@._:-]{1,200}$/;

function storageKeys(storage) {
  if (typeof storage.keys === 'function') return storage.keys();
  const keys = [];
  for (let index = 0; index < Number(storage.length || 0); index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }
  return keys;
}

function safeJson(value, maxBytes) {
  const ancestors = [];
  const json = JSON.stringify(value, function (_key, entry) {
    if (entry === undefined || typeof entry === 'function' || typeof entry === 'symbol' || typeof entry === 'bigint') {
      throw new TypeError('admin_route_snapshot_unsafe_value');
    }
    if (typeof entry === 'number' && !Number.isFinite(entry)) throw new TypeError('admin_route_snapshot_non_finite');
    if (entry && typeof entry === 'object') {
      while (ancestors.length && ancestors.at(-1) !== this) ancestors.pop();
      if (ancestors.includes(entry)) throw new TypeError('admin_route_snapshot_cycle');
      ancestors.push(entry);
    }
    return entry;
  });
  if (new TextEncoder().encode(json).byteLength > maxBytes) throw new RangeError('admin_route_snapshot_too_large');
  return json;
}

function token(value, label) {
  const normalized = String(value || '').trim();
  if (!TOKEN_RE.test(normalized)) throw new TypeError(`admin_route_snapshot_invalid_${label}`);
  return normalized;
}

function accessContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('admin_route_snapshot_access_required');
  }
  const role = token(value.role, 'role');
  if (!Array.isArray(value.permissions)) throw new TypeError('admin_route_snapshot_permissions_required');
  const permissions = [...new Set(value.permissions.map((permission) => token(permission, 'permission')))].sort();
  return Object.freeze({ role, permissions });
}

function sameAccessContext(left, right) {
  return left.role === right.role
    && left.permissions.length === right.permissions.length
    && left.permissions.every((permission, index) => permission === right.permissions[index]);
}

export function createRouteSnapshotStore({
  storage = globalThis.localStorage,
  now = () => Date.now(),
  ttlMs = 30 * 60 * 1000,
  maxBytes = 1_000_000,
} = {}) {
  if (!storage) throw new TypeError('admin_route_snapshot_storage_required');
  const keyFor = (adminUid, route) => `${SNAPSHOT_PREFIX}:${encodeURIComponent(token(adminUid, 'admin'))}:${encodeURIComponent(token(route, 'route'))}`;
  return Object.freeze({
    read(adminUid, route, expectedAccess) {
      const key = keyFor(adminUid, route);
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || ![1, 2].includes(parsed.schemaVersion) || !Number.isFinite(parsed.savedAtMs) || !('data' in parsed)) throw new Error('invalid');
        if (expectedAccess !== undefined) {
          const currentAccess = accessContext(expectedAccess);
          if (parsed.schemaVersion !== 2 || !sameAccessContext(accessContext(parsed.access), currentAccess)) {
            storage.removeItem(key);
            return null;
          }
        } else if (parsed.schemaVersion === 2) {
          accessContext(parsed.access);
        }
        return Object.freeze({ data: parsed.data, savedAtMs: parsed.savedAtMs, stale: now() - parsed.savedAtMs > ttlMs });
      } catch {
        storage.removeItem(key);
        return null;
      }
    },
    write(adminUid, route, data, currentAccess) {
      const savedAtMs = now();
      const access = currentAccess === undefined ? null : accessContext(currentAccess);
      storage.setItem(keyFor(adminUid, route), safeJson({
        schemaVersion: access ? 2 : 1,
        savedAtMs,
        data,
        ...(access ? { access } : {}),
      }, maxBytes));
      return savedAtMs;
    },
    clearAdmin(adminUid) {
      const prefix = `${SNAPSHOT_PREFIX}:${encodeURIComponent(token(adminUid, 'admin'))}:`;
      storageKeys(storage).filter((key) => key.startsWith(prefix)).forEach((key) => storage.removeItem(key));
    },
  });
}

export const ADMIN_ROUTE_SNAPSHOT_TTL_MS = 30 * 60 * 1000;
