import assert from 'node:assert/strict';
import test from 'node:test';

import { accountScopeKey } from '../app/account_scope_key';
import {
  BoundedScopeCache,
  canCommitAccountScopedResult,
  classifyMyPacksResolution,
  isValidLocalAuthorPackStorageItem,
  mergeOwnedIdReads,
  parseStrictArrayJson,
  readArrayWithStatus,
  runAccountScopedStorageTransaction,
} from '../app/flashcards/myPacksDataIntegrity';

test('an account A write cannot survive a queued B transition and wipe', async () => {
  type Lease = { readonly held: true };
  let lockTail = Promise.resolve();
  const withLock = async <T>(work: (lease: Lease) => Promise<T>): Promise<T> => {
    const previous = lockTail;
    let release!: () => void;
    lockTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await work({ held: true });
    } finally {
      release();
    }
  };
  let currentAccount = 'A';
  const storage = new Map<string, string>();
  let signalWriteStarted!: () => void;
  const writeStarted = new Promise<void>((resolve) => { signalWriteStarted = resolve; });
  let allowWrite!: () => void;
  const writeGate = new Promise<void>((resolve) => { allowWrite = resolve; });

  const accountAWrite = runAccountScopedStorageTransaction({
    token: 'A',
    isCurrent: (token) => token === currentAccount,
    withLock,
    work: async () => {
      signalWriteStarted();
      await writeGate;
      storage.set('owned', 'pack-owned-by-A');
    },
  });
  await writeStarted;
  const transitionToB = withLock(async () => {
    currentAccount = 'B';
    storage.clear();
  });
  allowWrite();

  await Promise.all([accountAWrite, transitionToB]);
  assert.equal(currentAccount, 'B');
  assert.equal(storage.has('owned'), false);
});

test('a failed cloud-authored loader is stale rather than authoritative empty', async () => {
  assert.deepEqual(await readArrayWithStatus(async () => ['cloud-pack']), {
    items: ['cloud-pack'],
    status: 'ready',
  });
  assert.deepEqual(await readArrayWithStatus(async () => { throw new Error('offline'); }), {
    items: [],
    status: 'stale',
  });
});

test('local author validation rejects crash-prone partial objects but accepts legacy optionals', () => {
  assert.equal(isValidLocalAuthorPackStorageItem({ id: 'local_pack_bad', cards: [] }), false);
  assert.equal(isValidLocalAuthorPackStorageItem({
    v: 1,
    id: 'local_pack_legacy',
    title: 'Legacy pack',
    description: '',
    cardThemeKey: '',
    cards: [],
    createdAt: 1,
    updatedAt: 1,
  }), true);
});

test('an async account A result cannot commit or publish after switching to B', async () => {
  const accountA = accountScopeKey({ generation: 1, stableId: 'A', phase: 'active' });
  const accountB = accountScopeKey({ generation: 2, stableId: 'B', phase: 'active' });
  const transition = accountScopeKey({ generation: 2, stableId: null, phase: 'transitioning' });
  let release!: (value: string) => void;
  const lateRead = new Promise<string>((resolve) => { release = resolve; });
  let currentScope = accountA;

  currentScope = transition;
  currentScope = accountB;
  release('pack-owned-by-A');
  await lateRead;

  assert.equal(canCommitAccountScopedResult(accountA, currentScope), false);
  assert.equal(canCommitAccountScopedResult(accountA, transition), false);
  assert.equal(canCommitAccountScopedResult(null, accountB), false);
  assert.equal(canCommitAccountScopedResult(accountB, accountB), true);
});

test('warm data is isolated by account scope and evicts the oldest generation', () => {
  const cache = new BoundedScopeCache<string[]>(2);
  cache.set('generation:1:uid:A|target:en', ['pack-a']);
  cache.set('generation:2:uid:B|target:en', ['pack-b']);

  assert.deepEqual(cache.get('generation:1:uid:A|target:en'), ['pack-a']);
  assert.deepEqual(cache.get('generation:2:uid:B|target:en'), ['pack-b']);
  assert.equal(cache.get('generation:2:uid:B|target:fr'), undefined);

  cache.set('generation:3:uid:C|target:en', ['pack-c']);
  assert.equal(cache.get('generation:1:uid:A|target:en'), undefined);
  assert.equal(cache.size, 2);
});

test('malformed or mixed persisted arrays are stale, never ready partial data', () => {
  const isString = (value: unknown): value is string => typeof value === 'string';
  assert.deepEqual(parseStrictArrayJson<string>(null, isString), { items: [], status: 'ready' });
  assert.equal(parseStrictArrayJson<string>('not-json', isString).status, 'stale');
  assert.equal(parseStrictArrayJson<string>('{"id":"pack-a"}', isString).status, 'stale');
  assert.equal(parseStrictArrayJson<string>('["pack-a",42]', isString).status, 'stale');
  assert.deepEqual(parseStrictArrayJson<string>('["pack-a","pack-b"]', isString), {
    items: ['pack-a', 'pack-b'],
    status: 'ready',
  });
});

test('partial ownership reads retain same-account warm rights but remain stale', () => {
  assert.deepEqual(mergeOwnedIdReads(
    [
      { ids: ['pack-current'], status: 'ready' },
      { ids: [], status: 'stale' },
    ],
    ['pack-warm'],
  ), {
    ids: ['pack-warm', 'pack-current'],
    status: 'stale',
  });
});

test('UGC metadata outage leaves an owned id unresolved and prevents false ready/count zero', () => {
  assert.equal(classifyMyPacksResolution({
    sourceStatuses: ['ready', 'ready', 'ready', 'ready'],
    ownedIds: ['official-a', 'ugc-missing'],
    resolvedPackIds: ['official-a'],
  }), 'stale');
  assert.equal(classifyMyPacksResolution({
    sourceStatuses: ['ready', 'ready', 'ready', 'ready'],
    ownedIds: ['official-a', 'ugc-a'],
    resolvedPackIds: ['official-a', 'ugc-a'],
  }), 'ready');
  assert.equal(classifyMyPacksResolution({
    sourceStatuses: ['ready', 'stale'],
    ownedIds: [],
    resolvedPackIds: [],
  }), 'stale');
});
