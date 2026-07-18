import { isValidAdminBrowserPreferenceScope } from './admin-v2-dashboard-widgets.js';

export const FAVORITES_STORAGE_KEY_PREFIX = 'phraseman.admin.v2.favorites.v1:';

function normalizeScope(scope) {
  return isValidAdminBrowserPreferenceScope(scope) ? scope : null;
}

function normalizeId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildFavoritesKey(scope) {
  const normalized = normalizeScope(scope);
  return normalized ? `${FAVORITES_STORAGE_KEY_PREFIX}${normalized}` : null;
}

export function createFavoritesStore({ storage, scope, isAllowedId } = {}) {
  let currentScope = normalizeScope(scope);
  let memoryIds = [];
  const allowed = typeof isAllowedId === 'function' ? isAllowedId : () => false;

  function retain(ids) {
    const retained = [];
    const seen = new Set();
    for (const value of Array.isArray(ids) ? ids : []) {
      const id = normalizeId(value);
      let allowedId = false;
      try { allowedId = id && allowed(id) === true; } catch {}
      if (!allowedId || seen.has(id)) continue;
      seen.add(id);
      retained.push(id);
      if (retained.length === 8) break;
    }
    return retained;
  }

  function currentKey() {
    return buildFavoritesKey(currentScope);
  }

  function write(ids) {
    memoryIds = retain(ids);
    const key = currentKey();
    if (!key || typeof storage?.setItem !== 'function') return [...memoryIds];
    try {
      storage.setItem(key, JSON.stringify({ v: 1, ids: memoryIds }));
    } catch {
      // The in-memory copy is the fail-closed fallback when persistence is unavailable.
    }
    return [...memoryIds];
  }

  function load() {
    const key = currentKey();
    if (!key || typeof storage?.getItem !== 'function') return [...memoryIds];
    try {
      const raw = storage.getItem(key);
      if (typeof raw !== 'string') return [...memoryIds];
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.ids)) return [...memoryIds];
      memoryIds = retain(parsed.ids);
      return [...memoryIds];
    } catch {
      return [...memoryIds];
    }
  }

  function replace(ids) {
    return write(retain(ids));
  }

  function toggle(value) {
    const id = normalizeId(value);
    let allowedId = false;
    try { allowedId = id && allowed(id) === true; } catch {}
    if (!allowedId) return load();
    const ids = load();
    const position = ids.indexOf(id);
    return write(position >= 0 ? ids.filter((item) => item !== id) : retain([...ids, id]));
  }

  function clear() {
    const key = currentKey();
    if (key) {
      try { storage?.removeItem?.(key); } catch {}
    }
    memoryIds = [];
    return [];
  }

  function setScope(nextScope) {
    clear();
    currentScope = normalizeScope(nextScope);
    memoryIds = [];
    return [];
  }

  function getScope() {
    return currentScope;
  }

  return { load, replace, toggle, clear, setScope, getScope };
}
