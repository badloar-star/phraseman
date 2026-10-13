// зачем (координатор 11.10, Optimistic UI): плитка «Мои наборы» показывает последнее известное число мгновенно, без пустого окна;
// число не утекает между аккаунтами и целями обучения, точный счёт (myPacksCountCache.ts, 15 с, без диска) не тронут.
import fs from 'node:fs';
import path from 'node:path';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStore.has(key) ? mockStore.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
  },
}));

import {
  __resetLastKnownMyPacksCountForTests,
  hydrateLastKnownMyPacksCount,
  peekLastKnownMyPacksCount,
  rememberLastKnownMyPacksCount,
} from '../app/flashcards/myPacksCountLastKnown';

const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

describe('myPacksCountLastKnown: последнее известное число плитки «Мои наборы»', () => {
  beforeEach(() => {
    mockStore.clear();
    __resetLastKnownMyPacksCountForTests();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('до первого запоминания — null; потом число читается синхронно', () => {
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBeNull();
    rememberLastKnownMyPacksCount('en', 'u1', 4);
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBe(4);
  });

  it('ключ — цель обучения и аккаунт: чужое число не показывается', () => {
    rememberLastKnownMyPacksCount('en', 'u1', 4);
    expect(peekLastKnownMyPacksCount('en', 'u2')).toBeNull();
    expect(peekLastKnownMyPacksCount('es', 'u1')).toBeNull();
    expect(peekLastKnownMyPacksCount('en', null)).toBeNull();
    rememberLastKnownMyPacksCount('en', null, 2);
    expect(peekLastKnownMyPacksCount('en', null)).toBe(2);
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBe(4);
  });

  it('число переживает перезапуск: запись на диск и подъём с диска', async () => {
    rememberLastKnownMyPacksCount('en', 'u1', 7);
    await flush();
    expect(JSON.parse(mockStore.get('fc_my_packs_count_last_known_v1') ?? 'null')).toEqual([['en|u1', 7]]);
    __resetLastKnownMyPacksCountForTests();
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBeNull();
    await hydrateLastKnownMyPacksCount();
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBe(7);
  });

  it('то, что уже есть в памяти, новее диска — подъём его не затирает', async () => {
    mockStore.set('fc_my_packs_count_last_known_v1', JSON.stringify([['en|u1', 3]]));
    rememberLastKnownMyPacksCount('en', 'u1', 9);
    await hydrateLastKnownMyPacksCount();
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBe(9);
  });

  it('мусор на диске игнорируется с причиной в логе, без падения', async () => {
    mockStore.set('fc_my_packs_count_last_known_v1', '{не json');
    await expect(hydrateLastKnownMyPacksCount()).resolves.toBeUndefined();
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('hydrate FAILED'));
    __resetLastKnownMyPacksCountForTests();
    mockStore.set('fc_my_packs_count_last_known_v1', JSON.stringify([['en|u1', -5], ['en|u2', 1.5], ['en|u3', 'x'], [5, 2], ['en|ok', 2]]));
    await hydrateLastKnownMyPacksCount();
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBeNull();
    expect(peekLastKnownMyPacksCount('en', 'ok')).toBe(2);
  });

  it('не число набора отклоняется с логом; повтор того же числа диск не трогает', async () => {
    rememberLastKnownMyPacksCount('en', 'u1', -1);
    rememberLastKnownMyPacksCount('en', 'u1', Number.NaN);
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('отклонено'));
    rememberLastKnownMyPacksCount('en', 'u1', 3);
    await flush();
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const writes = AsyncStorage.setItem.mock.calls.length;
    rememberLastKnownMyPacksCount('en', 'u1', 3);
    await flush();
    expect(AsyncStorage.setItem.mock.calls.length).toBe(writes);
  });

  it('хранит не больше 8 записей, старые вытесняются первыми', () => {
    for (let i = 0; i < 10; i += 1) rememberLastKnownMyPacksCount('en', `u${i}`, i);
    expect(peekLastKnownMyPacksCount('en', 'u0')).toBeNull();
    expect(peekLastKnownMyPacksCount('en', 'u1')).toBeNull();
    expect(peekLastKnownMyPacksCount('en', 'u9')).toBe(9);
  });
});

describe('хаб: плитка «Мои наборы» берёт последнее известное число, не трогая замок хаба', () => {
  const root = path.join(__dirname, '..');
  const hub = fs.readFileSync(path.join(root, 'app/flashcards/FlashcardsHubScreen.tsx'), 'utf8');
  const exact = fs.readFileSync(path.join(root, 'app/flashcards/myPacksCountCache.ts'), 'utf8');

  it('плитка показывает подтверждённый счёт, а без него — последний известный', () => {
    expect(hub).toContain('count: fmt(myPackCount ?? heldMineCount)');
  });
  it('«хаб новичка» решается только по подтверждённому счёту, а не по последнему известному', () => {
    // зачем (perf-правка cb8997f68): решение вынесено в showFresh, а объект fresh мемоизирован по нему — смысл прежний: только подтверждённые счета, не «последний известный»
    expect(hub).toContain('const showFresh = savedCount === 0 && myPackCount === 0;');
    expect(hub).toContain('const fresh = useMemo(() => showFresh');
    expect(hub).not.toMatch(/showFresh = [^;\n]*heldMineCount/);
  });
  it('логи [HUB-TILES] mine:instant и mine:update на месте; в логе нет uid', () => {
    expect(hub).toContain("'[HUB-TILES] mine:instant'");
    expect(hub).toContain("'[HUB-TILES] mine:update'");
    expect(hub).toContain("userId: userId ? 'есть' : 'нет'");
  });
  it('при смене аккаунта прежний счёт сбрасывается и не запоминается под чужим ключом', () => {
    expect(hub).toContain('subscribeAccountGeneration(() => setMineIdentityEpoch');
    expect(hub).toContain('if (identityChanged) setMyPackCount(null);');
  });
  it('точный счёт по-прежнему без диска (контракт flashcards_my_packs_count_cache_contract)', () => {
    expect(exact).not.toMatch(/AsyncStorage|SecureStore/);
  });
});
