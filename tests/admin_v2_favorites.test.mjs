import assert from 'node:assert/strict';
import {
  FAVORITES_STORAGE_KEY_PREFIX,
  buildFavoritesKey,
  createFavoritesStore,
} from '../admin/v2/scripts/admin-v2-favorites.js';

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
    values,
  };
}

const scopeOne = `uid-sha256-v1_${'a'.repeat(64)}`;
const scopeTwo = `uid-sha256-v1_${'b'.repeat(64)}`;
const badScope = `uid-sha256-v1_${'c'.repeat(64)}`;
const wrongScope = `uid-sha256-v1_${'d'.repeat(64)}`;
const safeScope = `uid-sha256-v1_${'e'.repeat(64)}`;
const missingScope = `uid-sha256-v1_${'f'.repeat(64)}`;

assert.equal(FAVORITES_STORAGE_KEY_PREFIX, 'phraseman.admin.v2.favorites.v1:');
assert.equal(buildFavoritesKey(scopeOne), `phraseman.admin.v2.favorites.v1:${scopeOne}`);
assert.equal(buildFavoritesKey(' account / one '), null);
assert.equal(buildFavoritesKey(''), null);
assert.equal(buildFavoritesKey(null), null);

const storage = createStorage();
const store = createFavoritesStore({ storage, scope: scopeOne, isAllowedId: (id) => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].includes(id) });
assert.equal(store.getScope(), scopeOne);
assert.deepEqual(store.load(), []);
assert.deepEqual(store.replace([' a ', 'b', 'a', 'denied', '', 'c']), ['a', 'b', 'c']);
assert.deepEqual(JSON.parse(storage.values.get(buildFavoritesKey(scopeOne))), { v: 1, ids: ['a', 'b', 'c'] });
assert.deepEqual(store.toggle('b'), ['a', 'c']);
assert.deepEqual(store.toggle('denied'), ['a', 'c']);
assert.deepEqual(store.toggle('d'), ['a', 'c', 'd']);
assert.deepEqual(store.replace(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
assert.deepEqual(store.clear(), []);
assert.equal(storage.values.has(buildFavoritesKey(scopeOne)), false);

store.replace(['a']);
assert.deepEqual(store.setScope(scopeTwo), []);
assert.equal(storage.values.has(buildFavoritesKey(scopeOne)), false);
assert.equal(store.getScope(), scopeTwo);
assert.deepEqual(store.load(), []);
assert.deepEqual(store.setScope(null), []);
assert.equal(store.getScope(), null);
assert.deepEqual(store.replace(['a']), ['a']);
assert.equal(storage.values.size, 0);

const malformed = createStorage({ [buildFavoritesKey(badScope)]: '{bad' });
assert.deepEqual(createFavoritesStore({ storage: malformed, scope: badScope, isAllowedId: () => true }).load(), []);
const wrongVersion = createStorage({ [buildFavoritesKey(wrongScope)]: JSON.stringify({ v: 2, ids: ['a'] }) });
assert.deepEqual(createFavoritesStore({ storage: wrongVersion, scope: wrongScope, isAllowedId: () => true }).load(), []);
const brokenStorage = { getItem() { throw new Error('broken'); }, setItem() { throw new Error('broken'); }, removeItem() { throw new Error('broken'); } };
const safeStore = createFavoritesStore({ storage: brokenStorage, scope: safeScope, isAllowedId: () => true });
assert.deepEqual(safeStore.replace(['a']), ['a']);
assert.deepEqual(safeStore.toggle('a'), []);
assert.deepEqual(safeStore.clear(), []);
assert.deepEqual(createFavoritesStore({ storage: {}, scope: missingScope, isAllowedId: () => true }).replace(['a']), ['a']);

console.log('admin-v2-favorites: PASS');
