import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Account V2, Пакет 8J — трёхзначное чтение страниц карточек и замок записи.
 *
 * зачем: readFlashcardPages отдавал null и при «страниц нет», и при ошибке/офлайне.
 * Сторож держит: empty — только по подтверждённому ответу сервера (fromCache === false),
 * кэш без сервера и отсутствие метаданных — error; ошибка сети — error; замок
 * записи ставится/снимается и переживает сбой хранилища (в безопасную сторону).
 */

const mockGetDocs = jest.fn();
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false, IS_STORE_RELEASE: false }));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  getFirestore: jest.fn(() => ({ db: true })),
  collection: jest.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') })),
  where: jest.fn((...args: unknown[]) => ({ where: args })),
  query: jest.fn((...args: unknown[]) => ({ query: args })),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

// eslint-disable-next-line import/first
import {
  __resetFlashcardPagesWriteLockMemoryForTests,
  classifyFlashcardPagesSnapshot,
  FLASHCARD_PAGES_WRITE_LOCK_KEY,
  lockFlashcardPagesWrite,
  mergeLockedFlashcardsWithPages,
  readFlashcardPagesResult,
  readFlashcardPagesWriteLocks,
  unlockFlashcardPagesWrite,
} from '../app/flashcard_pages_read_result';

type Doc = { id: string; data: () => Record<string, unknown> };
function snap(docs: Doc[], metadata: { fromCache?: unknown } | null | undefined) {
  return { empty: docs.length === 0, size: docs.length, metadata, forEach: (cb: (doc: Doc) => void) => docs.forEach(cb) };
}
function page(id: string, index: number, cards: unknown): Doc {
  return { id, data: () => ({ index, cards: typeof cards === 'string' ? cards : JSON.stringify(cards) }) };
}

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };
const KEYS = ['flashcards_v1', 'flashcards_v2::fr::flashcards_v1'];
let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  __resetFlashcardPagesWriteLockMemoryForTests();
  mockGetDocs.mockReset();
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  jest.restoreAllMocks();
});
const logs = () => [...logSpy.mock.calls, ...warnSpy.mock.calls].map((call) => String(call[0]));

describe('8J — разбор снимка страниц', () => {
  test('пустой ответ СЕРВЕРА = empty (обычное поведение)', () => {
    expect(classifyFlashcardPagesSnapshot(snap([], { fromCache: false }))).toEqual({ status: 'empty', from: 'server' });
  });

  test('пустой ответ из КЭША без сервера — не empty, а error', () => {
    expect(classifyFlashcardPagesSnapshot(snap([], { fromCache: true }))).toEqual({ status: 'error', code: 'from_cache', from: 'cache' });
  });

  test('нет метаданных fromCache — подтверждения нет → error', () => {
    expect(classifyFlashcardPagesSnapshot(snap([], undefined))).toMatchObject({ status: 'error', code: 'no_metadata' });
    expect(classifyFlashcardPagesSnapshot(snap([], null))).toMatchObject({ status: 'error', code: 'no_metadata' });
    expect(classifyFlashcardPagesSnapshot(snap([], {}))).toMatchObject({ status: 'error', code: 'no_metadata' });
  });

  test('непустой ответ из кэша (возможно неполный) — тоже error', () => {
    const result = classifyFlashcardPagesSnapshot(snap([page('en_0000', 0, [{ id: 'a' }])], { fromCache: true }));
    expect(result).toMatchObject({ status: 'error', code: 'from_cache' });
  });

  test('страницы сервера собираются по index', () => {
    const result = classifyFlashcardPagesSnapshot(snap([
      page('en_0001', 1, [{ id: 'c' }]),
      page('en_0000', 0, [{ id: 'a' }, { id: 'b' }]),
    ], { fromCache: false }));
    expect(result).toEqual({
      status: 'ok', value: JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'c' }]), pages: 2, cards: 3, from: 'server',
    });
  });

  test('страницы есть, но ни одной годной — error, а не «пусто»', () => {
    const result = classifyFlashcardPagesSnapshot(snap([page('en_0000', 0, '{broken'), page('en_0001', 1, '{"a":1}')], { fromCache: false }));
    expect(result).toMatchObject({ status: 'error', code: 'pages_unusable_2', from: 'server' });
  });

  test('часть страниц битая — годные отдаются (как прежний readFlashcardPages)', () => {
    const result = classifyFlashcardPagesSnapshot(snap([page('en_0000', 0, [{ id: 'a' }]), page('en_0001', 1, '{broken')], { fromCache: false }));
    expect(result).toMatchObject({ status: 'ok', cards: 1 });
  });
});

describe('8J — readFlashcardPagesResult', () => {
  test('ошибка сети → error с кодом, лог [FLASHCARD-PAGES] без uid', async () => {
    mockGetDocs.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'firestore/unavailable' }));
    const result = await readFlashcardPagesResult('stable-secret-uid', 'en');
    expect(result).toEqual({ status: 'error', code: 'firestore/unavailable', from: 'unknown' });
    const line = logs().find((entry) => entry.startsWith('[FLASHCARD-PAGES] read result=error'));
    expect(line).toMatch(/^\[FLASHCARD-PAGES\] read result=error code=firestore\/unavailable from=unknown target=en ms=\d+$/);
    expect(logs().join('\n')).not.toContain('stable-secret-uid');
  });

  test('пустой ответ сервера → empty; лог result=empty from=server', async () => {
    mockGetDocs.mockResolvedValueOnce(snap([], { fromCache: false }));
    await expect(readFlashcardPagesResult('stable-a', 'fr')).resolves.toEqual({ status: 'empty', from: 'server' });
    expect(logs().some((entry) => entry.startsWith('[FLASHCARD-PAGES] read result=empty code=- from=server target=fr'))).toBe(true);
  });

  test('офлайн-кэш пустой → error from=cache', async () => {
    mockGetDocs.mockResolvedValueOnce(snap([], { fromCache: true }));
    await expect(readFlashcardPagesResult('stable-a', 'en')).resolves.toMatchObject({ status: 'error', from: 'cache' });
  });

  test('ok — лог без содержимого карточек', async () => {
    mockGetDocs.mockResolvedValueOnce(snap([page('en_0000', 0, [{ id: 'a', text: 'secret word' }])], { fromCache: false }));
    const result = await readFlashcardPagesResult('stable-a', 'en');
    expect(result.status).toBe('ok');
    expect(logs().join('\n')).not.toContain('secret word');
  });

  test('пустой stableId → error без обращения к сети', async () => {
    await expect(readFlashcardPagesResult('', 'en')).resolves.toMatchObject({ status: 'error', code: 'empty_stable_id' });
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});

describe('8J — замок записи страниц', () => {
  test('lock → ключ заперт; unlock → снят и запись в хранилище убрана', async () => {
    await lockFlashcardPagesWrite('flashcards_v1', 'read_error_x');
    expect([...await readFlashcardPagesWriteLocks(KEYS)]).toEqual(['flashcards_v1']);
    await unlockFlashcardPagesWrite('flashcards_v1', 'read_ok');
    expect((await readFlashcardPagesWriteLocks(KEYS)).size).toBe(0);
    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_LOCK_KEY)).toBeNull();
  });

  test('замок одного ключа не трогает другой', async () => {
    await lockFlashcardPagesWrite('flashcards_v1', 'e');
    await lockFlashcardPagesWrite('flashcards_v1::fr', 'e');
    await unlockFlashcardPagesWrite('flashcards_v1', 'read_ok');
    expect([...await readFlashcardPagesWriteLocks(KEYS)]).toEqual(['flashcards_v1::fr']);
  });

  test('хранилище не приняло замок → замок держится в памяти процесса', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await lockFlashcardPagesWrite('flashcards_v1', 'e');
    expect((await readFlashcardPagesWriteLocks(KEYS)).has('flashcards_v1')).toBe(true);
    expect(logs().some((entry) => entry.includes('write_lock set_failed key=flashcards_v1'))).toBe(true);
  });

  test('сбой чтения замка → заперты все ключи (в безопасную сторону)', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
    expect([...await readFlashcardPagesWriteLocks(KEYS)].sort()).toEqual([...KEYS].sort());
  });
});

describe('8J — слияние при снятии замка', () => {
  test('облако + локальные-только по id; удалённые человеком не возвращаются', () => {
    const merge = mergeLockedFlashcardsWithPages(
      JSON.stringify([{ id: 'a' }, { id: 'new' }]),
      JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'gone' }]),
      new Set(['gone']),
    );
    expect(JSON.parse(merge.value)).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'new' }]);
    expect(merge).toMatchObject({ cloud: 2, localOnly: 1, deletedSkipped: 1, localUnparsable: false });
  });

  test('локального нет → страницы как есть', () => {
    const merge = mergeLockedFlashcardsWithPages(null, JSON.stringify([{ id: 'a' }]), new Set());
    expect(JSON.parse(merge.value)).toEqual([{ id: 'a' }]);
  });

  test('локальное не читается → страницы как раньше, флаг в логе', () => {
    const merge = mergeLockedFlashcardsWithPages('{broken', JSON.stringify([{ id: 'a' }]), new Set());
    expect(merge).toMatchObject({ localUnparsable: true, localOnly: 0 });
    expect(JSON.parse(merge.value)).toEqual([{ id: 'a' }]);
  });
});
