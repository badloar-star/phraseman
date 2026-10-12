/**
 * п.83 (решение владельца: кнопка языка на настройке тренировки фильтрует наборы): списки ЧУЖИХ языков собираются режимом
 * localOnly — 0 новых чтений Firestore (ни каталога маркета, ни карточек набора сообщества), общий тёплый снимок текущего
 * языка не перетирается, повторный выбор языка отдаётся из памяти (peekFcDeckOptionsLocal).
 */
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const mockFetchCommunityPackCards = jest.fn(async () => []);
const mockLoadPublishedCatalog = jest.fn(async () => []);
jest.mock('../app/community_packs/communityFirestore', () => {
  const actual = jest.requireActual('../app/community_packs/communityFirestore');
  return {
    ...actual,
    fetchCommunityPackCards: (...args: unknown[]) => mockFetchCommunityPackCards(...(args as [])),
    loadPublishedCommunityMarketPacks: (...args: unknown[]) => mockLoadPublishedCatalog(...(args as [])),
    peekPublishedCommunityMarketPacks: () => null,
  };
});
jest.mock('../app/account_scope_key', () => ({ accountScopeKey: () => 'test-user' }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: 'test-user', generation: 1 }),
  isCurrentAccountGeneration: () => true,
  isAccountOperationCurrent: () => true,
  withAccountTransitionLock: async (fn: () => unknown) => fn(),
  withRestoreApplicationLock: async (fn: () => unknown) => fn(),
  beginInitialAccountGeneration: () => {},
  invalidateAccountGeneration: () => {},
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { addCommunityOwnedPackId } from '../app/community_packs/communityOwnedStorage';
import {
  __resetDeckOptionsWarmCacheForTests,
  loadFcDeckOptions,
  peekFcDeckOptions,
  peekFcDeckOptionsLocal,
} from '../app/flashcards/deck_options';

describe('loadFcDeckOptions(..., { localOnly: true })', () => {
  beforeEach(async () => {
    __resetDeckOptionsWarmCacheForTests();
    await (AsyncStorage as unknown as { __reset: () => void }).__reset();
    mockFetchCommunityPackCards.mockClear();
    mockLoadPublishedCatalog.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('не ходит в сеть: ни каталог маркета, ни карточки набора сообщества без локальной копии', async () => {
    await addCommunityOwnedPackId('NoLocalCopyPackId0001', 'es');
    const decks = await loadFcDeckOptions('trainer', 'ru', 'es', { localOnly: true });
    expect(mockFetchCommunityPackCards).not.toHaveBeenCalled();
    expect(mockLoadPublishedCatalog).not.toHaveBeenCalled();
    expect(decks.find((d) => d.deckId === 'pack:NoLocalCopyPackId0001')).toBeUndefined();
  });

  it('набор сообщества с локальной копией — виден, без фонового обновления', async () => {
    await addCommunityOwnedPackId('LocalCopyPackId000002', 'es');
    await AsyncStorage.setItem('fc_community_pack_cards_v1:LocalCopyPackId000002', JSON.stringify([{
      id: 'es1', en: 'hola', ru: 'привет', uk: 'привіт', categoryId: 'custom', isSystem: false, sourceId: 'DEV:LocalCopyPackId000002',
    }]));
    const decks = await loadFcDeckOptions('trainer', 'ru', 'es', { localOnly: true });
    expect(decks.find((d) => d.deckId === 'pack:LocalCopyPackId000002')?.count).toBe(1);
    expect(mockFetchCommunityPackCards).not.toHaveBeenCalled();
  });

  it('не перетирает тёплый снимок текущего языка; повторный выбор — из памяти', async () => {
    const current = await loadFcDeckOptions('trainer', 'ru', 'en');
    await loadFcDeckOptions('trainer', 'ru', 'es', { localOnly: true });
    expect(peekFcDeckOptions('trainer', 'ru', 'en')).toBe(current);
    expect(peekFcDeckOptions('trainer', 'ru', 'es')).toBeNull();
    const es = peekFcDeckOptionsLocal('trainer', 'ru', 'es');
    expect(es).not.toBeNull();
    expect(await loadFcDeckOptions('trainer', 'ru', 'es', { localOnly: true })).toBe(es);
    expect(peekFcDeckOptionsLocal('trainer', 'ru', 'en')).toBe(current);
    expect(peekFcDeckOptionsLocal('trainer', 'ru', 'fr')).toBeNull();
  });
});
