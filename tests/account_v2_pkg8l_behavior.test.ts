/* eslint-disable @typescript-eslint/no-require-imports -- resetModules: свежее модульное состояние на каждый тест */
/**
 * Пакет 8L (Account V2): хвосты 8C-2 + подтверждение «Сменить без сохранения» при невыгруженных карточках.
 *
 *  1. Последнее известное авторских наборов: забывается при отзыве/удалении набора и целиком
 *     при смене поколения аккаунта / выходе.
 *  2. Немые catch авторских наборов и публикации счётчика — с причиной в логе [MY-PACKS].
 *  5. Решение о подтверждении — чистая функция; причина отказа выгрузки карточек запоминается.
 */
import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

type GetImpl = () => Promise<{ docs: { id: string; data: () => Record<string, unknown> }[] }>;

const firestoreState: { authorGet: GetImpl } = {
  authorGet: async () => ({ docs: [] }),
};

function mockFirestoreModule() {
  const chain = (isAuthor: boolean): Record<string, unknown> => {
    const self: Record<string, unknown> = {};
    self.where = (field: string) => chain(isAuthor || field === 'authorStableId');
    self.limit = () => self;
    self.orderBy = () => self;
    self.get = () => (isAuthor ? firestoreState.authorGet() : Promise.resolve({ docs: [] }));
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

const offline = async (): Promise<never> => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); };

function loadModules() {
  jest.resetModules();
  jest.doMock('@react-native-firebase/firestore', mockFirestoreModule);
  jest.doMock('../app/community_packs/functionsClient', () => ({
    callCommunityFetchPackCardsIfAccessible: jest.fn(),
    isCommunityPacksCloudEnabled: jest.fn(() => true),
  }));
  const generation = require('../app/account_generation') as typeof import('../app/account_generation');
  generation.__resetAccountGenerationForTests();
  generation.beginAccountGeneration('author-a');
  const cf = require('../app/community_packs/communityFirestore') as typeof import('../app/community_packs/communityFirestore') & Record<string, any>;
  return { cf, generation };
}

const ids = (packs: { id: string }[]): string[] => packs.map((pack) => pack.id);

beforeEach(() => {
  firestoreState.authorGet = async () => ({ docs: [] });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('8L-1: author packs last-known cache', () => {
  it('a withdrawn/deleted pack is forgotten: a later failed read does not resurrect it', async () => {
    const { cf } = loadModules();
    firestoreState.authorGet = async () => ({ docs: [publishedDoc('ugc_keep'), publishedDoc('ugc_gone')] });
    expect(ids((await cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en')).packs)).toEqual(['ugc_keep', 'ugc_gone']);

    cf.forgetAuthorPackLastKnown('ugc_gone');

    firestoreState.authorGet = offline;
    const failed = await cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en');
    expect(failed.status).toBe('error');
    expect(ids(failed.packs)).toEqual(['ugc_keep']);
  });

  it('an account generation change (switch / sign-out) clears the whole cache', async () => {
    const { cf, generation } = loadModules();
    firestoreState.authorGet = async () => ({ docs: [publishedDoc('ugc_mine_1')] });
    await cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en');

    generation.invalidateAccountGeneration();
    generation.beginAccountGeneration('author-a');

    firestoreState.authorGet = offline;
    expect(await cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en')).toEqual({ status: 'error', packs: [] });
  });

  it('a read that started before the switch does not refill the cache for the new generation', async () => {
    const { cf, generation } = loadModules();
    let releaseRead!: () => void;
    const readGate = new Promise<void>((resolve) => { releaseRead = resolve; });
    firestoreState.authorGet = async () => { await readGate; return { docs: [publishedDoc('ugc_mine_1')] }; };
    const lateRead = cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en');
    await new Promise((resolve) => setTimeout(resolve, 0));

    generation.invalidateAccountGeneration();
    generation.beginAccountGeneration('author-a');
    releaseRead();
    await lateRead;

    firestoreState.authorGet = offline;
    expect(await cf.loadAuthorCommunityPacksPendingUpdateResult('author-a', 'en')).toEqual({ status: 'error', packs: [] });
  });

  it('wiring: both withdraw/delete paths forget the pack', () => {
    const publish = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app', 'community_packs', 'publishLocalPack.ts'), 'utf8'));
    const screen = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_my_packs.tsx'), 'utf8'));
    const withdrawBody = publish.slice(publish.indexOf('export async function withdrawLocalAuthorPack'));
    expect(withdrawBody).toMatch(/forgetAuthorPackLastKnown\(local\.cloudPackId\)/);
    expect(withdrawBody).toMatch(/forgetAuthorPackLastKnown\(local\.id\)/);
    expect(screen).toMatch(/callCommunityAuthorRemovePack\(\{ authorStableId, packId: pack\.id \}\);\s*forgetAuthorPackLastKnown\(pack\.id\);/);
  });
});

describe('8L-2: no silent catch around author packs and the count publication', () => {
  const read = (file: string): string => normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app', file), 'utf8'));

  it('author packs reads log the reason instead of returning [] silently', () => {
    for (const file of ['flashcards_packs.tsx', 'flashcards_swipe.tsx']) {
      const source = read(file);
      expect(source).not.toMatch(/loadAuthorCommunityPacksPendingUpdate\([^)]*\)\.catch\(\(\) =>/);
      expect(source).toContain('[MY-PACKS] author_packs caller_failed');
    }
  });

  it('the my-packs count publication logs the reason', () => {
    const source = read('flashcards_my_packs.tsx');
    expect(source).not.toMatch(/publishMyPacksCount\([^;]*\n\s*\}\)\.catch\(\(\) => \{\}\);/);
    expect(source).toContain('[MY-PACKS] count_publish failed');
  });
});

describe('8L-5: confirm before «switch without saving» when cards are not uploaded', () => {
  const load = () => {
    jest.resetModules();
    return require('../app/account_switch_unsaved_cards') as typeof import('../app/account_switch_unsaved_cards');
  };

  it('locked flashcard keys require the confirmation', () => {
    const { decideAccountSwitchWithoutSaveConfirm } = load();
    expect(decideAccountSwitchWithoutSaveConfirm({ lockedFlashcardKeyCount: 1, lastForceFailure: null, attemptStartedAtMs: 100 }))
      .toEqual({ kind: 'confirm_unsaved_cards', reason: 'pages_locked' });
  });

  it('a fresh force-sync refusal because of pages_locked / pages_timeout requires the confirmation', () => {
    const { decideAccountSwitchWithoutSaveConfirm } = load();
    for (const reason of ['pages_locked', 'pages_timeout'] as const) {
      expect(decideAccountSwitchWithoutSaveConfirm({
        lockedFlashcardKeyCount: 0,
        lastForceFailure: { reason, atMs: 150 },
        attemptStartedAtMs: 100,
      })).toEqual({ kind: 'confirm_unsaved_cards', reason });
    }
  });

  it('other or stale failures switch right away (old path)', () => {
    const { decideAccountSwitchWithoutSaveConfirm } = load();
    expect(decideAccountSwitchWithoutSaveConfirm({ lockedFlashcardKeyCount: 0, lastForceFailure: null, attemptStartedAtMs: 100 }))
      .toEqual({ kind: 'switch_now' });
    expect(decideAccountSwitchWithoutSaveConfirm({
      lockedFlashcardKeyCount: 0, lastForceFailure: { reason: 'upload_error', atMs: 150 }, attemptStartedAtMs: 100,
    })).toEqual({ kind: 'switch_now' });
    // отказ из прошлой попытки не считается
    expect(decideAccountSwitchWithoutSaveConfirm({
      lockedFlashcardKeyCount: 0, lastForceFailure: { reason: 'pages_locked', atMs: 50 }, attemptStartedAtMs: 100,
    })).toEqual({ kind: 'switch_now' });
  });

  it('runForceFlashcardUpload remembers the refusal reason and clears it on success', async () => {
    jest.resetModules();
    const upload = require('../app/flashcards_cloud_upload') as typeof import('../app/flashcards_cloud_upload');
    const lockedDeps = {
      writePages: jest.fn(async () => 1),
      readLocks: jest.fn(async () => new Set(['flashcards_v1']) as ReadonlySet<string>),
    };
    const outcome = await upload.runForceFlashcardUpload({
      uid: 'u', data: { flashcards_v1: '[]' }, isCurrent: () => true, timeoutMs: 1_000, deps: lockedDeps,
    });
    expect(outcome).toEqual({ ok: false, reason: 'pages_locked' });
    expect(upload.peekLastForceFlashcardFailure()).toEqual({ reason: 'pages_locked', atMs: expect.any(Number) });

    const openDeps = {
      writePages: jest.fn(async () => 1),
      readLocks: jest.fn(async () => new Set<string>() as ReadonlySet<string>),
    };
    const ok = await upload.runForceFlashcardUpload({
      uid: 'u', data: { flashcards_v1: '[]' }, isCurrent: () => true, timeoutMs: 1_000, deps: openDeps,
    });
    expect(ok.ok).toBe(true);
    expect(upload.peekLastForceFlashcardFailure()).toBeNull();
  });

  it('settings wiring: the forced path asks first, «save and switch» retries the normal attempt', () => {
    const source = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'), 'utf8'));
    expect(source).toContain('readAccountSwitchUnsavedCardsDecision(');
    expect(source).toContain("decision.kind === 'confirm_unsaved_cards'");
    expect(source).toContain('Несохранённые карточки будут удалены с этого телефона');
    expect(source).toContain("'Сохранить и сменить'");
    expect(source).toMatch(/onPress: \(\) => \{ void runAccountSwitchAttempt\(\); \}/);
  });
});
