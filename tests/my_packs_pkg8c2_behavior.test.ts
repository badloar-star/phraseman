/* eslint-disable @typescript-eslint/no-require-imports -- resetModules: свежее модульное состояние на каждый тест */
/**
 * Пакет 8C-2 (Account V2): «Мои наборы» — ошибка ≠ пусто; запись своего набора при смене аккаунта.
 *
 * Поведенческие проверки:
 *  1. Ошибка чтения своих опубликованных наборов → status=error и последнее известное, а не «пусто».
 *  2. Тренировка (trainingSources) при такой ошибке не теряет авторские наборы.
 *  3. «Мои наборы»: статус чтения авторских идёт в сверку → stale (экран держит показанные данные).
 *  4. Запись своего набора, начатая на аккаунте A, не проходит после смены на B.
 */
import fs from 'fs';
import path from 'path';

type GetImpl = () => Promise<{ docs: { id: string; data: () => Record<string, unknown> }[] }>;

const firestoreState: { authorGet: GetImpl } = {
  authorGet: async () => ({ docs: [] }),
};

function mockFirestoreModule() {
  // Любая цепочка .where/.limit/.orderBy возвращает себя; get() авторского запроса управляется тестом,
  // остальные запросы (каталог и т.п.) — пусто.
  const chain = (isAuthor: boolean): Record<string, unknown> => {
    const self: Record<string, unknown> = {};
    self.where = (field: string) => chain(isAuthor || field === 'authorStableId');
    self.limit = () => self;
    self.orderBy = () => self;
    self.get = () => (isAuthor ? firestoreState.authorGet() : Promise.resolve({ docs: [] }));
    self.doc = () => ({ get: async () => ({ exists: false, data: () => undefined }) });
    return self;
  };
  const firestore = () => ({ collection: () => chain(false) });
  return { __esModule: true, default: firestore };
}

const publishedDoc = (id: string) => ({
  id,
  data: () => ({
    listingStatus: 'published',
    authorStableId: 'author-a',
    titleRu: 'Мой набор',
    cardCount: 10,
    updatedAt: 1,
  }),
});

function loadCommunityFirestore() {
  jest.resetModules();
  jest.doMock('@react-native-firebase/firestore', mockFirestoreModule);
  jest.doMock('../app/community_packs/functionsClient', () => ({
    callCommunityFetchPackCardsIfAccessible: jest.fn(),
    isCommunityPacksCloudEnabled: jest.fn(() => true),
  }));
  // Record<string, any>: файл компилируется и на исходниках до 8C-2 (RED-прогон), где Result-функции ещё нет.
  return require('../app/community_packs/communityFirestore') as typeof import('../app/community_packs/communityFirestore') & Record<string, any>;
}

beforeEach(() => {
  firestoreState.authorGet = async () => ({ docs: [] });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('8C-2: author packs load — error is not empty', () => {
  it('a failed read after a good one is an error carrying the last known packs, not authoritative empty', async () => {
    const cf = loadCommunityFirestore();
    firestoreState.authorGet = async () => ({ docs: [publishedDoc('ugc_mine_1')] });
    const first = await cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en');
    expect(first.status).toBe('ok');
    expect(first.packs.map((p: { id: string }) => p.id)).toEqual(['ugc_mine_1']);

    firestoreState.authorGet = async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); };
    const failed = await cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en');
    expect(failed.status).toBe('error');
    expect(failed.packs.map((p: { id: string }) => p.id)).toEqual(['ugc_mine_1']);
    // старая обёртка (её зовут свайп и выбор наборов) тоже больше не превращает сбой в «пусто»
    expect((await cf.loadAuthorCommunityPacksPendingUpdate('author-a', 'en')).map((p) => p.id)).toEqual(['ugc_mine_1']);

    // последнее известное привязано к автору: другой аккаунт его не получает
    const other = await cf.loadAuthorCommunityPacksPendingUpdateResult('author-b', 'en');
    expect(other).toEqual({ status: 'error', packs: [] });
  });

  it('a cold failure is an explicit error (callers must treat it as stale)', async () => {
    const cf = loadCommunityFirestore();
    firestoreState.authorGet = async () => { throw new Error('offline'); };
    expect(await cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en')).toEqual({ status: 'error', packs: [] });
  });
});

describe('8C-2: training sources keep author packs on a read error', () => {
  it('does not drop the author pack when the author query fails after a good read', async () => {
    const cf = loadCommunityFirestore();
    jest.doMock('../app/flashcards_target_gate', () => ({
      flashcardsCommunityPacksAvailableForTarget: () => true,
      flashcardsOfficialPacksAvailableForTarget: () => true,
    }));
    jest.doMock('../app/community_packs/communityOwnedStorage', () => ({
      loadCommunityOwnedPackIds: jest.fn(async () => []),
    }));
    jest.doMock('../app/user_id_policy', () => ({
      getCanonicalUserId: jest.fn(async () => 'author-a'),
    }));
    const { buildCommunitySources } = require('../app/flashcards/trainingSources') as typeof import('../app/flashcards/trainingSources');

    firestoreState.authorGet = async () => ({ docs: [publishedDoc('ugc_mine_1')] });
    // прогрев старой обёрткой: она есть и до 8C-2, поэтому RED падает именно на потере набора
    expect((await cf.loadAuthorCommunityPacksPendingUpdate('author-a', 'en')).map((p: { id: string }) => p.id)).toEqual(['ugc_mine_1']);

    firestoreState.authorGet = async () => { throw new Error('offline'); };
    const sources = await buildCommunitySources('ru', [], 'en');
    expect(sources.map((source) => source.id)).toEqual([expect.stringContaining('ugc_mine_1')]);
  });
});

describe('8C-2: My Packs wiring', () => {
  it('author read status feeds the resolution (error → stale keeps shown data) and uses the Result API', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_my_packs.tsx'), 'utf8');
    expect(screen).toContain('loadAuthorCommunityPacksPendingUpdateResult(myStableId, studyTarget)');
    expect(screen).toContain("const authoredCloudStatus: 'ready' | 'stale' = authoredCloudResult.status === 'ok' ? 'ready' : 'stale';");
    expect(screen).toMatch(/catalogResult\.status,\s*authoredCloudStatus,\s*\],/);
    // stale-ветка коммита не затирает уже показанные наборы
    expect(screen).toContain("setGroups((prev) => prev.added.length + prev.created.length > 0 ? prev : withoutPendingDeletes(next.groups));");

    const { classifyMyPacksResolution } = require('../app/flashcards/myPacksDataIntegrity') as typeof import('../app/flashcards/myPacksDataIntegrity');
    expect(classifyMyPacksResolution({
      sourceStatuses: ['ready', 'ready', 'ready', 'ready', 'ready', 'stale'],
      ownedIds: [],
      resolvedPackIds: [],
    })).toBe('stale');
  });
});

describe('8C-2: own pack write vs account switch', () => {
  it('a local pack save started on account A does not land after switching to B', async () => {
    loadCommunityFirestore();
    const AsyncStorage = require('@react-native-async-storage/async-storage') as { __reset: () => void; getAllKeys: () => Promise<string[]> };
    AsyncStorage.__reset();
    const generation = require('../app/account_generation') as typeof import('../app/account_generation');
    generation.__resetAccountGenerationForTests();
    generation.beginAccountGeneration('owner-a');
    const local = require('../app/community_packs/localAuthorPacks') as typeof import('../app/community_packs/localAuthorPacks');

    let releaseTransition!: () => void;
    const gate = new Promise<void>((resolve) => { releaseTransition = resolve; });
    const transition = generation.withAccountTransitionLock(async () => {
      await gate;
      generation.invalidateAccountGeneration();
      AsyncStorage.__reset();
      generation.beginAccountGeneration('owner-b');
    });

    const save = local.saveLocalAuthorPack({
      title: 'Pack of A',
      description: '',
      cards: Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, en: `Phrase ${i}`, ru: `Фраза ${i}`, uk: `Фраза ${i}` })),
      studyTarget: 'en',
    } as never, { studyTarget: 'en' });
    const saveOutcome = save.then(() => 'saved', (error: unknown) => (error instanceof Error ? error.message : String(error)));
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseTransition();
    await transition;

    expect(await saveOutcome).toBe('Account changed');
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((key) => key.includes('community_local_author_packs'))).toEqual([]);
    expect(await local.loadLocalAuthorPacks()).toEqual([]);
  });
});
