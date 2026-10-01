import assert from 'node:assert/strict';
import test from 'node:test';

import { accountScopeKey } from '../app/account_scope_key';
import {
  BoundedScopeCache,
  canCommitAccountScopedResult,
  classifyMyPacksResolution,
  isValidLocalAuthorPackStorageItem,
  MissingPackCache,
  MY_PACKS_MISSING_TTL_MS,
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

// Пакет 8C: «Мои наборы» с id вне каталога висели на скелетоне — несуществующий набор не
// находится никогда, а 'stale' держал экран в загрузке и гонял тихие повторы.
test('8C: definitely-missing pack ids do not hold the screen; outages still do', () => {
  assert.equal(classifyMyPacksResolution({
    sourceStatuses: ['ready', 'ready', 'ready', 'ready', 'ready'],
    ownedIds: ['official-a', 'ugc-deleted', 'test-id'],
    resolvedPackIds: ['official-a'],
    missingPackIds: ['ugc-deleted', 'test-id'],
  }), 'ready');
  // сбой чтения метаданных — не «нет набора»: остаётся stale (тихий повтор)
  assert.equal(classifyMyPacksResolution({
    sourceStatuses: ['ready', 'ready'],
    ownedIds: ['official-a', 'ugc-outage'],
    resolvedPackIds: ['official-a'],
    missingPackIds: [],
  }), 'stale');
  // источник не прочитан — отсутствующие наборы не делают ready
  assert.equal(classifyMyPacksResolution({
    sourceStatuses: ['ready', 'stale'],
    ownedIds: ['ugc-deleted'],
    resolvedPackIds: [],
    missingPackIds: ['ugc-deleted'],
  }), 'stale');
});

test('8C: negative answer is cached for the TTL, then re-checked; bounded', () => {
  const cache = new MissingPackCache(2, MY_PACKS_MISSING_TTL_MS);
  cache.markMissing('en:a', 1_000);
  assert.equal(cache.isMissing('en:a', 1_000 + MY_PACKS_MISSING_TTL_MS - 1), true);
  assert.equal(cache.isMissing('en:a', 1_000 + MY_PACKS_MISSING_TTL_MS), false);
  assert.equal(cache.isMissing('fr:a', 1_000), false);
  cache.markMissing('en:b', 1_000);
  cache.markMissing('en:c', 1_000);
  assert.equal(cache.isMissing('en:a', 1_001), false);
  assert.equal(cache.isMissing('en:c', 1_001), true);
});

test('8C: screen wiring — outcome-aware fetch, negative cache, missing ids in resolution, [MY-PACKS] logs', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const screen = readFileSync(join(__dirname, '..', 'app', 'flashcards_my_packs.tsx'), 'utf8');
  const firestoreSource = readFileSync(join(__dirname, '..', 'app', 'community_packs', 'communityFirestore.ts'), 'utf8');
  const has = (text: string, part: string): void => assert.ok(text.includes(part), `missing: ${part}`);
  has(screen, 'fetchCommunityPackMetaResult(id, studyTarget)');
  has(screen, 'missingPackCache.isMissing(');
  has(screen, 'missingPackCache.markMissing(');
  has(screen, 'missingPackIds: definitelyMissing');
  has(screen, "const ownedOutsideCatalog = catalogResult.status === 'ready'");
  has(screen, '[MY-PACKS] resolve owned=');
  has(screen, '[MY-PACKS] commit status=');
  assert.ok(!screen.includes("if (loadStatus === 'loading') return null"));
  // отсутствие документа — окончательно; сбой — повтор
  has(firestoreSource, "if (!snap.exists) return { status: 'missing', reason: 'not_found' };");
  has(firestoreSource, "return { status: 'error' };");
});
