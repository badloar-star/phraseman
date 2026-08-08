export const OVERVIEW_CACHE_TTL_MS = 36 * 60 * 60 * 1000;
export const OVERVIEW_CACHE_MAX_ENTRIES = 8;

const OPAQUE_SCOPE_PATTERN = /^uid-sha256-v1_[a-f0-9]{64}$/;

function validScope(scope) {
  return typeof scope === 'string' && OPAQUE_SCOPE_PATTERN.test(scope);
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) result[key] = clone(item);
    return result;
  }
  return value;
}

function equal(left, right) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && equal(left[key], right[key]));
}

function snapshot(entry, nowMs) {
  if (!entry) return null;
  return {
    value: clone(entry.value),
    state: entry.state,
    error: entry.error,
    updatedAtMs: entry.updatedAtMs,
    isStale: nowMs - entry.updatedAtMs > OVERVIEW_CACHE_TTL_MS,
  };
}

export function createOverviewCache({ maxEntries = OVERVIEW_CACHE_MAX_ENTRIES } = {}) {
  const entries = new Map();
  const cap = Number.isInteger(maxEntries) && maxEntries > 0 ? Math.min(maxEntries, OVERVIEW_CACHE_MAX_ENTRIES) : OVERVIEW_CACHE_MAX_ENTRIES;

  function trim() {
    while (entries.size > cap) {
      let oldestKey = null;
      let oldestTouchedAtMs = Infinity;
      for (const [key, entry] of entries) {
        if (entry.touchedAtMs < oldestTouchedAtMs) {
          oldestKey = key;
          oldestTouchedAtMs = entry.touchedAtMs;
        }
      }
      if (oldestKey == null) return;
      entries.delete(oldestKey);
    }
  }

  function peek(scope, nowMs = Date.now()) {
    if (!validScope(scope)) return null;
    const entry = entries.get(scope);
    if (!entry) return null;
    entry.touchedAtMs = nowMs;
    return snapshot(entry, nowMs);
  }

  function write(scope, value, nowMs = Date.now()) {
    if (!validScope(scope) || value == null) return null;
    const existing = entries.get(scope);
    const changed = !existing || !equal(existing.value, value);
    const entry = {
      value: changed ? clone(value) : existing.value,
      state: 'ready',
      error: '',
      updatedAtMs: nowMs,
      touchedAtMs: nowMs,
    };
    entries.set(scope, entry);
    trim();
    return { ...snapshot(entry, nowMs), changed };
  }

  function markLoading(scope, nowMs = Date.now()) {
    const entry = entries.get(scope);
    if (!validScope(scope) || !entry) return null;
    entry.state = 'loading';
    entry.error = '';
    entry.touchedAtMs = nowMs;
    return snapshot(entry, nowMs);
  }

  function markError(scope, error, nowMs = Date.now()) {
    const entry = entries.get(scope);
    if (!validScope(scope) || !entry) return null;
    entry.state = 'error';
    entry.error = typeof error === 'string' ? error : '';
    entry.touchedAtMs = nowMs;
    return snapshot(entry, nowMs);
  }

  function clear(scope) {
    if (!validScope(scope)) return false;
    return entries.delete(scope);
  }

  function clearAll() {
    entries.clear();
  }

  return { peek, write, markLoading, markError, clear, clearAll, size: () => entries.size };
}
