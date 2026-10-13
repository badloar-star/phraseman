// зачем (координатор 13.10, смета Firebase №6): копия набора сообщества освежается фоном не чаще раза в 6 ч —
// человек по-прежнему сразу видит сохранённую копию; неудача обновления не запоминается.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetCommunityPackRefreshThrottleForTests, loadDeckCards } from '../app/flashcards/deck_sources';
import type { CardItem } from '../app/flashcards/types';

const fetchCommunityPackCardsMock = jest.fn();
jest.mock('../app/community_packs/communityFirestore', () => ({
  fetchCommunityPackCards: (...args: unknown[]) => fetchCommunityPackCardsMock(...args),
}));
jest.mock('../app/account_scope_key', () => ({ accountScopeKey: () => 'test-user' }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: 'test-user', generation: 1 }),
  isCurrentAccountGeneration: () => true,
  isAccountOperationCurrent: () => true,
  withAccountTransitionLock: async (fn: () => unknown) => fn(),
  withRestoreApplicationLock: async (fn: () => unknown) => fn(),
  beginInitialAccountGeneration: () => {},
  invalidateAccountGeneration: () => {},
}));

const card = (id: string): CardItem => ({ id, en: `en ${id}`, ru: `ru ${id}`, uk: `uk ${id}`, categoryId: 'custom', isSystem: false });
const settle = async () => { for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0)); };
const HOUR = 60 * 60 * 1000;

describe('community pack background refresh throttle', () => {
  let now = 1_000_000_000_000;
  beforeEach(async () => {
    await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
    __resetCommunityPackRefreshThrottleForTests();
    fetchCommunityPackCardsMock.mockReset();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await AsyncStorage.setItem('fc_community_pack_cards_v1:pack-a', JSON.stringify([card('old')]));
  });
  afterEach(() => jest.restoreAllMocks());

  test('the saved copy is shown at once; the network refresh runs at most once per 6 hours', async () => {
    fetchCommunityPackCardsMock.mockResolvedValue([card('fresh')]);
    const first = await loadDeckCards({ kind: 'pack', packId: 'pack-a' }, 'ru');
    expect(first.map((c) => c.id)).toEqual(['old']);
    await settle();
    expect(fetchCommunityPackCardsMock).toHaveBeenCalledTimes(1);

    now += 2 * HOUR;
    __resetCommunityPackRefreshThrottleForTests(); // холодный старт: метка читается с диска
    const second = await loadDeckCards({ kind: 'pack', packId: 'pack-a' }, 'ru');
    expect(second.map((c) => c.id)).toEqual(['fresh']);
    await settle();
    expect(fetchCommunityPackCardsMock).toHaveBeenCalledTimes(1);

    now += 5 * HOUR;
    await loadDeckCards({ kind: 'pack', packId: 'pack-a' }, 'ru');
    await settle();
    expect(fetchCommunityPackCardsMock).toHaveBeenCalledTimes(2);
  });

  test('a failed refresh is not remembered — the next open tries again', async () => {
    fetchCommunityPackCardsMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([card('fresh')]);
    await loadDeckCards({ kind: 'pack', packId: 'pack-a' }, 'ru');
    await settle();
    await loadDeckCards({ kind: 'pack', packId: 'pack-a' }, 'ru');
    await settle();
    expect(fetchCommunityPackCardsMock).toHaveBeenCalledTimes(2);
  });

  test('concurrent opens share one refresh', async () => {
    let resolveFetch!: (cards: CardItem[]) => void;
    fetchCommunityPackCardsMock.mockImplementation(() => new Promise<CardItem[]>((resolve) => { resolveFetch = resolve; }));
    await Promise.all([
      loadDeckCards({ kind: 'pack', packId: 'pack-a' }, 'ru'),
      loadDeckCards({ kind: 'pack', packId: 'pack-a' }, 'ru'),
    ]);
    await settle();
    resolveFetch([card('fresh')]);
    await settle();
    expect(fetchCommunityPackCardsMock).toHaveBeenCalledTimes(1);
  });
});
