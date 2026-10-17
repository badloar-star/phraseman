const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

require('tsx/cjs');

const target = path.join(process.cwd(), 'app', 'community_packs', 'communityFirestore.ts');
const originalModuleLoad = Module._load;

let remoteReadCount = 0;
let nextRemoteRead = async () => ({ docs: [] });

function stubFirestore() {
  const query = {
    where() { return query; },
    limit() { return query; },
    async get() {
      remoteReadCount += 1;
      return nextRemoteRead();
    },
  };
  return { collection: () => query };
}

Module._load = function loadVideoCatalogWithStubs(request, parent, isMain) {
  if (request === '@react-native-firebase/firestore') {
    return { __esModule: true, default: stubFirestore };
  }
  if (request === '../config') return { CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false };
  if (request === '../flashcards/marketplace') {
    return { derivePackCodeName: (id) => `pack-${id}` };
  }
  if (request === './schema') return { COMMUNITY_PACKS_COLLECTION: 'community_packs' };
  if (request === './packSocial') {
    return {
      comparePacksBySocial: (a, b) => (b.likesCount - a.likesCount) || (b.addedCount - a.addedCount),
      readPackSocialCounts: (data) => ({
        likesCount: Number(data.likesCount ?? 0),
        addedCount: Number(data.addedCount ?? 0),
      }),
    };
  }
  if (request === './packComments') return { readPackCommentsCount: () => 0 };
  if (request === './functionsClient') {
    return {
      callCommunityFetchPackCardsIfAccessible: async () => ({ cards: [] }),
      isCommunityPacksCloudEnabled: () => true,
    };
  }
  if (request === '../user_id_policy') return { getCanonicalUserId: async () => null };
  if (request === './ugcCardThemePresets') return { UGC_CARD_THEME_DEFAULT_ID: 'default' };
  if (request === '../target_storage_keys') {
    return { storageStudyTarget: (value) => String(value ?? 'en') };
  }
  if (request === '../flashcards/pack_languages') {
    return {
      isPackLanguage: (value) => ['en', 'fr', 'de', 'es'].includes(value),
      normalizePackCardTexts: (value) => value,
      normalizePackLanguage: (value) => ['en', 'fr', 'de', 'es'].includes(value) ? value : 'en',
    };
  }
  // зачем (10.10): d16c86212 (accounts-v2 8L) — кэш наборов сбрасывается при смене аккаунта; стенд — один активный аккаунт.
  if (request === '../account_generation') {
    return {
      captureAccountGeneration: () => ({ phase: 'active', stableId: 'stable-a', token: 1 }),
      subscribeAccountGeneration: () => ({ remove() {} }),
    };
  }
  if (request === '../debug-logger') {
    return { DebugLogger: { error() {}, info() {}, warn() {} } };
  }
  // зачем (17.10, red-tests-head): communityFirestore давно тянет hub_lifecycle_probe (импортирует react-native с Flow-синтаксисом — esbuild в node:test не собирает) и dev_cards_state; заглушки нового импорта не было — тест падал на загрузке, а не на поведении кэша.
  if (request === '../hub_lifecycle_probe') return { registerHubCacheProbe() {} };
  if (request === '../dev_cards_state') return { getDevCommunityPack: () => null, isDevCommunityPackId: () => false };
  return originalModuleLoad.call(this, request, parent, isMain);
};

test.after(() => {
  Module._load = originalModuleLoad;
});

function loadFreshVideoCatalog() {
  delete require.cache[require.resolve(target)];
  remoteReadCount = 0;
  nextRemoteRead = async () => ({ docs: [] });
  return require(target).loadVideoMarketPacks;
}

function videoDoc(id, language = 'en') {
  return {
    id,
    data: () => ({
      listingStatus: 'published',
      titleRu: `Набор ${id}`,
      videoId: id.padEnd(11, 'x').slice(0, 11),
      packLanguage: language,
      likesCount: 3,
      addedCount: 2,
      updatedAt: 1,
    }),
  };
}

test('an index failure without a usable cache rejects instead of reporting an empty catalog', async () => {
  const loadVideoMarketPacks = loadFreshVideoCatalog();
  const missingIndex = Object.assign(new Error('The query requires an index'), {
    code: 'firestore/failed-precondition',
  });
  nextRemoteRead = async () => { throw missingIndex; };

  await assert.rejects(
    () => loadVideoMarketPacks('en'),
    (error) => error === missingIndex,
  );
  assert.equal(remoteReadCount, 1);
});

test('a successful remote query with no documents remains a legitimate empty catalog', async () => {
  const loadVideoMarketPacks = loadFreshVideoCatalog();

  assert.deepEqual(await loadVideoMarketPacks('en'), []);
  assert.equal(remoteReadCount, 1);
});

test('a successful catalog is cached for the same target', async () => {
  const loadVideoMarketPacks = loadFreshVideoCatalog();
  nextRemoteRead = async () => ({ docs: [videoDoc('video-one')] });

  assert.deepEqual((await loadVideoMarketPacks('en')).map((pack) => pack.id), ['video-one']);
  nextRemoteRead = async () => { throw new Error('must not read warm cache remotely'); };
  assert.deepEqual((await loadVideoMarketPacks('en')).map((pack) => pack.id), ['video-one']);
  assert.equal(remoteReadCount, 1);
});

test('a cached catalog for another target is never returned after a failed query', async () => {
  const loadVideoMarketPacks = loadFreshVideoCatalog();
  nextRemoteRead = async () => ({ docs: [videoDoc('video-en', 'en')] });
  await loadVideoMarketPacks('en');
  const failure = new Error('fr catalog unavailable');
  nextRemoteRead = async () => { throw failure; };

  await assert.rejects(
    () => loadVideoMarketPacks('fr'),
    (error) => error === failure,
  );
  assert.equal(remoteReadCount, 2);
});

test('forceRemote bypasses a warm cache and retries the Firestore query', async () => {
  const loadVideoMarketPacks = loadFreshVideoCatalog();
  nextRemoteRead = async () => ({ docs: [videoDoc('video-old')] });
  await loadVideoMarketPacks('en');
  nextRemoteRead = async () => ({ docs: [videoDoc('video-new')] });

  assert.deepEqual(
    (await loadVideoMarketPacks('en', { forceRemote: true })).map((pack) => pack.id),
    ['video-new'],
  );
  assert.equal(remoteReadCount, 2);
});

test('a nonempty same-target cache remains usable when a forced refresh fails', async () => {
  const loadVideoMarketPacks = loadFreshVideoCatalog();
  nextRemoteRead = async () => ({ docs: [videoDoc('video-safe')] });
  await loadVideoMarketPacks('en');
  nextRemoteRead = async () => { throw new Error('temporary network failure'); };

  assert.deepEqual(
    (await loadVideoMarketPacks('en', { forceRemote: true })).map((pack) => pack.id),
    ['video-safe'],
  );
  assert.equal(remoteReadCount, 2);
});
