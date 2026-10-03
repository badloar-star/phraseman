import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Account Authority 2.0, S1b (§100 координатора) — отпечаток записи страниц карточек
 * (8N, flashcard_pages_write_fingerprint_v1) принадлежит аккаунту: в нём stableId владельца и
 * отпечатки его списков. Стирается вместе с данными аккаунта; после стирания повторный вход
 * того же аккаунта с пустым локальным списком ОБЪЕДИНЯЕТ со страницами, а не затирает их.
 */

jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: jest.fn(() => null),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));

// eslint-disable-next-line import/first
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
// eslint-disable-next-line import/first
import { accountOwnedStorageKeysFrom, SYNC_KEYS, wipeLocalAccountData } from '../app/cloud_sync';
// eslint-disable-next-line import/first
import {
  DEFAULT_PRE_WRITE_STORE,
  FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY,
  decideFlashcardPagesPreWrite,
  fingerprintCardsJson,
} from '../app/flashcard_pages_read_result';
// eslint-disable-next-line import/first
import { hasMeaningfulLocalAccountData } from '../app/local_account_data';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };
const EN = 'flashcards_v1';
const cloudCards = [{ id: 'c1', en: 'one' }, { id: 'c2', en: 'two' }];

function serverSnapshot(cards: unknown[]) {
  const docs = [{ id: 'en_0000', data: () => ({ target: 'en', index: 0, count: cards.length, cards: JSON.stringify(cards) }) }];
  return { empty: false, size: 1, metadata: { fromCache: false }, forEach: (cb: (doc: (typeof docs)[number]) => void) => docs.forEach(cb) };
}

let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-a');
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
});
const lines = () => [...logSpy.mock.calls, ...warnSpy.mock.calls].map((call) => String(call[0]));

describe('S1b — отпечаток страниц стирается вместе с данными аккаунта', () => {
  test('ключ в инвентаре аккаунта, не в старом облаке и не «значимые данные»', async () => {
    expect(accountOwnedStorageKeysFrom([])).toContain(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY);
    expect(SYNC_KEYS as readonly string[]).not.toContain(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY);
    await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY, JSON.stringify({ owner: 'stable-a', keys: { [EN]: '1:a' } }));
    await expect(hasMeaningfulLocalAccountData(AsyncStorage as never)).resolves.toBe(false);
  });

  test('после стирания отпечатка нет; повторный вход того же аккаунта с пустым списком → объединение', async () => {
    // До стирания: это устройство последним записало облачный список.
    const cloudJson = JSON.stringify(cloudCards);
    await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY, JSON.stringify({
      owner: 'stable-a', keys: { [EN]: fingerprintCardsJson(cloudJson) },
    }));
    await AsyncStorage.setItem(EN, cloudJson);

    await wipeLocalAccountData();

    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(EN)).toBeNull();

    // Повторный вход того же аккаунта: локальный список пуст, в страницах — карточки.
    const decision = await decideFlashcardPagesPreWrite({
      owner: 'stable-a', key: EN, target: 'en', localJson: '[]', existing: serverSnapshot(cloudCards), store: DEFAULT_PRE_WRITE_STORE,
    });
    expect(decision.kind).toBe('write');
    if (decision.kind !== 'write') return;
    expect(JSON.parse(decision.cardsJson)).toEqual(cloudCards);
    expect(decision.addedFromRemote).toEqual(cloudCards);
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge key=flashcards_v1 local=0 remote=2 added_from_remote=2 dropped_by_journal=0 decision=merged reason=no_own_fingerprint');
  });
});
