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
  orderMergedLikeLocal,
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

  // 8K: испорченное значение замка раньше запирало все ключи НАВСЕГДА — lock/unlock падали
  // на том же JSON.parse и не могли его перезаписать.
  test('испорченный замок: чтение запирает всё до починки (в безопасную сторону)', async () => {
    await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_LOCK_KEY, '{not json');
    expect([...await readFlashcardPagesWriteLocks(KEYS)].sort()).toEqual([...KEYS].sort());
  });

  test('испорченный замок чинит unlock после подтверждённого чтения → пусто, лог lock_value_repaired', async () => {
    await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_LOCK_KEY, '{not json');
    await unlockFlashcardPagesWrite('flashcards_v1', 'read_ok');
    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_LOCK_KEY)).toBeNull();
    expect((await readFlashcardPagesWriteLocks(KEYS)).size).toBe(0);
    expect(logs().some((entry) => entry.includes('write_lock lock_value_repaired key=flashcards_v1 via=unlock'))).toBe(true);
  });

  test('испорченный замок чинит lock → заперт только этот ключ', async () => {
    await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_LOCK_KEY, '[[[');
    await lockFlashcardPagesWrite('flashcards_v1', 'read_error_x');
    expect([...await readFlashcardPagesWriteLocks(KEYS)]).toEqual(['flashcards_v1']);
    expect(logs().some((entry) => entry.includes('write_lock lock_value_repaired key=flashcards_v1 via=lock'))).toBe(true);
  });
});

describe('8J — слияние при снятии замка', () => {
  test('облако + локальные-только по id; удалённые человеком не возвращаются', () => {
    const merge = mergeLockedFlashcardsWithPages(
      JSON.stringify([{ id: 'a' }, { id: 'new' }]),
      JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'gone' }]),
      new Set(['gone']),
      'k',
      { mode: 'active' },
    );
    expect(JSON.parse(merge.value)).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'new' }]);
    expect(merge).toMatchObject({ cloud: 2, localOnly: 1, deletedSkipped: 1, localUnparsable: false });
  });

  test('локального нет → страницы как есть', () => {
    const merge = mergeLockedFlashcardsWithPages(null, JSON.stringify([{ id: 'a' }]), new Set(), 'k', { mode: 'active' });
    expect(JSON.parse(merge.value)).toEqual([{ id: 'a' }]);
  });

  test('локальное не читается → страницы как раньше, флаг в логе', () => {
    const merge = mergeLockedFlashcardsWithPages('{broken', JSON.stringify([{ id: 'a' }]), new Set(), 'k', { mode: 'active' });
    expect(merge).toMatchObject({ localUnparsable: true, localOnly: 0 });
    expect(JSON.parse(merge.value)).toEqual([{ id: 'a' }]);
  });
});

// зачем (долг ревью 8N, S3; TG-622DD6E4BD75): порядок после объединения — как в локальном списке,
// пришедшие только из облака — в конце; состав и версии не меняются.
describe('orderMergedLikeLocal — порядок объединённого списка', () => {
  const ids = (json: string): string[] => (JSON.parse(json) as Array<{ id: string }>).map((card) => card.id);

  it('локальный порядок сохраняется, карточки из облака — в конце в порядке облака', () => {
    const merged = JSON.stringify([{ id: 'x' }, { id: 'a' }, { id: 'y' }, { id: 'b' }, { id: 'd' }]);
    expect(ids(orderMergedLikeLocal(JSON.stringify([{ id: 'b' }, { id: 'a' }, { id: 'd' }]), merged))).toEqual(['b', 'a', 'd', 'x', 'y']);
  });

  it('для общих id берётся версия из объединения, а не из локального списка', () => {
    const out = JSON.parse(orderMergedLikeLocal(
      JSON.stringify([{ id: 'a', en: 'local' }]),
      JSON.stringify([{ id: 'a', en: 'merged' }, { id: 'z' }]),
    )) as Array<{ id: string; en?: string }>;
    expect(out).toEqual([{ id: 'a', en: 'merged' }, { id: 'z' }]);
  });

  it('локальная карточка, отброшенная объединением (журнал удалений), не возвращается', () => {
    expect(ids(orderMergedLikeLocal(
      JSON.stringify([{ id: 'a' }, { id: 'gone' }, { id: 'b' }]),
      JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'n' }]),
    ))).toEqual(['a', 'b', 'n']);
  });

  it('карточки без id различаются по содержимому', () => {
    expect(orderMergedLikeLocal(
      JSON.stringify([{ en: 'two' }, { en: 'one' }]),
      JSON.stringify([{ en: 'one' }, { en: 'two' }, { en: 'three' }]),
    )).toBe(JSON.stringify([{ en: 'two' }, { en: 'one' }, { en: 'three' }]));
  });

  it('битый JSON или не массив → объединение возвращается как есть (данные целы)', () => {
    const merged = JSON.stringify([{ id: 'a' }]);
    expect(orderMergedLikeLocal('{broken', merged)).toBe(merged);
    expect(orderMergedLikeLocal(JSON.stringify({ id: 'a' }), merged)).toBe(merged);
  });
});

// зачем (S1b, §100 координатора; S1c — одно правило с 8E): одна карточка изменена и локально, и в
// облаке — побеждает более позднее время правки (max(updatedAt, addedAt)), но только если оно новее
// на запас по часам (1 час, как 7E/8E); в пределах запаса или без времени → локальная.
// Раньше при совпадении id всегда побеждало облако: правка между синками откатывалась.
describe('S1b/S1c — конфликт версий одной карточки при объединении (активное устройство, 8N)', () => {
  // Путь 8N (перед записью): правило §100 — без времени / в пределах запаса → локальная.
  const T = 1_800_000_000_000;
  const H = 60 * 60 * 1000;
  const merge = (local: unknown[], cloud: unknown[]) => mergeLockedFlashcardsWithPages(
    JSON.stringify(local), JSON.stringify(cloud), new Set(), 'flashcards_v1', { mode: 'active', target: 'en', now: T + 10 * H },
  );
  const summaries = () => logs().filter((line) => line.includes('merge_conflict'));

  test('локальная новее на ≥ запаса → в объединении локальная версия', () => {
    const out = merge([{ id: 'a', ru: 'новое', updatedAt: T + H }], [{ id: 'a', ru: 'старое', updatedAt: T }, { id: 'b' }]);
    expect(JSON.parse(out.value)).toEqual([{ id: 'a', ru: 'новое', updatedAt: T + H }, { id: 'b' }]);
    expect(out).toMatchObject({ localWon: 1, remoteWon: 0 });
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=1 remote_newer=0 within_margin=0 time_unknown=0']);
  });

  test('облачная новее на ≥ запаса → облачная версия', () => {
    const out = merge([{ id: 'a', ru: 'старое', updatedAt: T }], [{ id: 'a', ru: 'новое', updatedAt: T + H }]);
    expect(JSON.parse(out.value)).toEqual([{ id: 'a', ru: 'новое', updatedAt: T + H }]);
    expect(out).toMatchObject({ localWon: 0, remoteWon: 1 });
    expect(out.remoteWonCards).toEqual([{ id: 'a', ru: 'новое', updatedAt: T + H }]);
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=1 within_margin=0 time_unknown=0']);
  });

  test('облачная новее меньше чем на запас (и равные отметки) → локальная', () => {
    const out = merge(
      [{ id: 'a', ru: 'моё', updatedAt: T }, { id: 'b', ru: 'моё', updatedAt: T }],
      [{ id: 'a', ru: 'облако', updatedAt: T + H - 1 }, { id: 'b', ru: 'облако', updatedAt: T }],
    );
    expect(JSON.parse(out.value)).toEqual([{ id: 'a', ru: 'моё', updatedAt: T }, { id: 'b', ru: 'моё', updatedAt: T }]);
    expect(out).toMatchObject({ localWon: 2, remoteWon: 0 });
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=2 time_unknown=0']);
  });

  test('время правки = max(updatedAt, addedAt): облачная добавлена позже на ≥ запаса → облачная', () => {
    const out = merge([{ id: 'a', ru: 'моё', addedAt: T }], [{ id: 'a', ru: 'облако', addedAt: T + 2 * H }]);
    expect(out).toMatchObject({ localWon: 0, remoteWon: 1 });
  });

  test('нет времени (у одной или обеих), строки/ISO/NaN/дробные → локальная; одна строка time_unknown=N', () => {
    const local = [
      { id: 'a', ru: 'моё' },
      { id: 'b', ru: 'моё' },
      { id: 'c', ru: 'моё', updatedAt: 'x' },
      { id: 'd', ru: 'моё', updatedAt: T },
      { id: 'e', ru: 'моё', updatedAt: T },
    ];
    const cloud = [
      { id: 'a', ru: 'облако' },
      { id: 'b', ru: 'облако', updatedAt: T + 2 * H },
      { id: 'c', ru: 'облако', updatedAt: T + 2 * H },
      { id: 'd', ru: 'облако', updatedAt: '2030-01-01T00:00:00.000Z' },
      { id: 'e', ru: 'облако', updatedAt: T + 2 * H + 0.5 },
    ];
    const out = merge(local, cloud);
    expect(JSON.parse(out.value)).toEqual(local);
    expect(out).toMatchObject({ localWon: 5, remoteWon: 0 });
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=0 time_unknown=5']);
  });

  test('одинаковые версии — не конфликт, сводной строки нет; логи без содержимого и id карточек', () => {
    const out = merge([{ id: 'a', ru: 'x' }], [{ id: 'a', ru: 'x' }]);
    expect(out).toMatchObject({ localWon: 0, remoteWon: 0 });
    expect(summaries()).toEqual([]);
    merge([{ id: 'secret-id', ru: 'тайна', updatedAt: T + H }], [{ id: 'secret-id', ru: 'другое', updatedAt: T }]);
    expect(logs().some((line) => line.includes('secret-id') || line.includes('тайна'))).toBe(false);
  });

  test('ложный конфликт: тот же текст, другой порядок полей / нормализация → не логируется, локальная остаётся', () => {
    const out = merge(
      [{ ru: 'x', id: 'a', en: 'y', updatedAt: T }, { id: 'b', en: 'y', ru: 'x', uk: 'x', updatedAt: T }],
      [{ id: 'a', en: 'y', ru: 'x', updatedAt: T }, { id: 'b', en: 'y', ru: 'x', updatedAt: T }],
    );
    expect(JSON.parse(out.value)).toEqual([{ ru: 'x', id: 'a', en: 'y', updatedAt: T }, { id: 'b', en: 'y', ru: 'x', uk: 'x', updatedAt: T }]);
    expect(summaries()).toEqual([]);
  });

  test('отличие только в SRS (свайп) — не конфликт текста, но версия выбирается так же по времени', () => {
    const out = merge(
      [{ id: 'a', en: 'y', srs: { box: 3 }, updatedAt: T }],
      [{ id: 'a', en: 'y', srs: { box: 1 }, updatedAt: T }],
    );
    expect(JSON.parse(out.value)).toEqual([{ id: 'a', en: 'y', srs: { box: 3 }, updatedAt: T }]);
    expect(summaries()).toEqual([]);
  });

  // зачем: удаление (журнал 7D) отсекается ДО выбора версии — в любом режиме, поэтому проверяем оба.
  test.each(['active', 'restore'] as const)('удалённая журналом карточка не участвует в конфликте и не возвращается (%s)', (mode) => {
    const out = mergeLockedFlashcardsWithPages(
      JSON.stringify([{ id: 'gone', updatedAt: T + H }]), JSON.stringify([{ id: 'gone', updatedAt: T }]), new Set(['gone']), 'k', { mode, now: T + 10 * H },
    );
    expect(JSON.parse(out.value)).toEqual([]);
    expect(summaries()).toEqual([]);
  });
});

// зачем (§116 координатора): restore (8J: новое устройство / восстановление из облака) — облако и есть
// правда; локальный список там пустой или только что созданный. Без времени правки или в пределах
// запаса побеждает ОБЛАЧНАЯ; локальная — только если новее на ≥ запаса. Чистое правило: запертые ключи
// restore в cloud_sync.ts — активное устройство и передают 'active' (S1c R2, см. restore_lock тест).
describe('S1c — конфликт версий в режиме restore (чистое правило §116)', () => {
  const T = 1_800_000_000_000;
  const H = 60 * 60 * 1000;
  const restore = (local: unknown[], cloud: unknown[]) => mergeLockedFlashcardsWithPages(
    JSON.stringify(local), JSON.stringify(cloud), new Set(), 'flashcards_v1', { mode: 'restore', target: 'en', now: T + 10 * H },
  );
  const summaries = () => logs().filter((line) => line.includes('merge_conflict'));

  test('restore: облако без updatedAt побеждает свежую локальную', () => {
    const out = restore([{ id: 'a', ru: 'моё', updatedAt: T + 5 * H }], [{ id: 'a', ru: 'облако' }]);
    expect(JSON.parse(out.value)).toEqual([{ id: 'a', ru: 'облако' }]);
    expect(out).toMatchObject({ localWon: 0, remoteWon: 1 });
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=restore local_newer=0 remote_newer=0 within_margin=0 time_unknown=1']);
  });

  test('restore: в пределах запаса (и равные отметки) → облачная', () => {
    const out = restore(
      [{ id: 'a', ru: 'моё', updatedAt: T + H - 1 }, { id: 'b', ru: 'моё', updatedAt: T }],
      [{ id: 'a', ru: 'облако', updatedAt: T }, { id: 'b', ru: 'облако', updatedAt: T }],
    );
    expect(JSON.parse(out.value)).toEqual([{ id: 'a', ru: 'облако', updatedAt: T }, { id: 'b', ru: 'облако', updatedAt: T }]);
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=restore local_newer=0 remote_newer=0 within_margin=2 time_unknown=0']);
  });

  test('restore: локальная новее на ≥ запаса → локальная', () => {
    const out = restore([{ id: 'a', ru: 'моё', updatedAt: T + H }], [{ id: 'a', ru: 'облако', updatedAt: T }]);
    expect(JSON.parse(out.value)).toEqual([{ id: 'a', ru: 'моё', updatedAt: T + H }]);
    expect(out).toMatchObject({ localWon: 1, remoteWon: 0 });
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=restore local_newer=1 remote_newer=0 within_margin=0 time_unknown=0']);
  });

  test('restore: облако новее на ≥ запаса → облачная', () => {
    const out = restore([{ id: 'a', ru: 'моё', updatedAt: T }], [{ id: 'a', ru: 'облако', updatedAt: T + H }]);
    expect(JSON.parse(out.value)).toEqual([{ id: 'a', ru: 'облако', updatedAt: T + H }]);
  });
});

// зачем (S1d, TG-4AC6243A1836): часы устройства убежали вперёд больше чем на запас — такое время
// правки «неизвестно»: active → локальная, restore → облачная (как без времени).
describe('S1d — время правки «из будущего» при объединении', () => {
  const T = 1_800_000_000_000;
  const H = 60 * 60 * 1000;
  const NOW = T + 10 * H;
  const run = (mode: 'active' | 'restore', local: unknown[], cloud: unknown[]) => mergeLockedFlashcardsWithPages(
    JSON.stringify(local), JSON.stringify(cloud), new Set(), 'flashcards_v1', { mode, target: 'en', now: NOW },
  );
  const summaries = () => logs().filter((line) => line.includes('merge_conflict'));

  test('облако из будущего: active → локальная, restore → облачная; в сводке time_unknown', () => {
    const local = [{ id: 'a', ru: 'моё', updatedAt: T }];
    const cloud = [{ id: 'a', ru: 'облако', updatedAt: NOW + H + 1 }];
    expect(JSON.parse(run('active', local, cloud).value)).toEqual(local);
    expect(JSON.parse(run('restore', local, cloud).value)).toEqual(cloud);
    expect(summaries()).toEqual([
      '[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=0 time_unknown=1',
      '[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=restore local_newer=0 remote_newer=0 within_margin=0 time_unknown=1',
    ]);
  });

  test('локальная из будущего: restore → облачная (раньше побеждала локальная)', () => {
    const local = [{ id: 'a', ru: 'моё', updatedAt: NOW + 100 * H }];
    const cloud = [{ id: 'a', ru: 'облако', updatedAt: T }];
    expect(JSON.parse(run('restore', local, cloud).value)).toEqual(cloud);
    expect(JSON.parse(run('active', local, cloud).value)).toEqual(local);
  });

  test('ровно на границе now + запас — время ещё действует', () => {
    const out = run('active', [{ id: 'a', ru: 'моё', updatedAt: T }], [{ id: 'a', ru: 'облако', updatedAt: NOW + H }]);
    expect(out).toMatchObject({ localWon: 0, remoteWon: 1 });
  });

  test('без now — часы устройства (Date.now) в точке вызова', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(NOW);
    const out = mergeLockedFlashcardsWithPages(
      JSON.stringify([{ id: 'a', ru: 'моё', updatedAt: T }]), JSON.stringify([{ id: 'a', ru: 'облако', updatedAt: NOW + H + 1 }]),
      new Set(), 'k', { mode: 'restore' },
    );
    expect(now).toHaveBeenCalled();
    expect(out).toMatchObject({ localWon: 0, remoteWon: 1 });
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=k mode=restore local_newer=0 remote_newer=0 within_margin=0 time_unknown=1']);
  });
});

// зачем (S1d R2, решение AA): на пути записи страниц (8N, active) отсечка «будущего» у ОБЛАЧНОЙ
// стороны означает, что у ЭТОГО телефона часы отстают — его версия не должна затереть облачную
// правку: в страницы идёт облачная, локальная на телефоне остаётся. Отсечка у локальной (свои
// часы спешат) — прежнее правило режима. Без флага (restore запертых ключей — значение кладётся
// в локальное хранилище) поведение прежнее.
describe('S1d R2 — облачная правка «из будущего» на пути записи страниц', () => {
  const T = 1_800_000_000_000;
  const H = 60 * 60 * 1000;
  const NOW = T + 10 * H;
  const run = (local: unknown[], cloud: unknown[], keepRemoteFromFuture: boolean) => mergeLockedFlashcardsWithPages(
    JSON.stringify(local), JSON.stringify(cloud), new Set(), 'flashcards_v1',
    { mode: 'active', target: 'en', now: NOW, keepRemoteFromFuture },
  );
  const summaries = () => logs().filter((line) => line.includes('merge_conflict'));

  test('отстающие часы: облачная «из будущего» остаётся в объединении, локальная не заменяется', () => {
    const cloud = { id: 'a', ru: 'облако', updatedAt: NOW + 3 * H };
    const out = run([{ id: 'a', ru: 'моё', updatedAt: T }], [cloud], true);
    expect(JSON.parse(out.value)).toEqual([cloud]);
    expect(out).toMatchObject({ localWon: 0, remoteWon: 0, remoteFutureKept: 1, remoteWonCards: [] });
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=0 time_unknown=1 remote_future_kept=1']);
  });

  test('обе стороны «из будущего» — облачную всё равно не затираем', () => {
    const cloud = { id: 'a', ru: 'облако', updatedAt: NOW + 3 * H };
    const out = run([{ id: 'a', ru: 'моё', updatedAt: NOW + 5 * H }], [cloud], true);
    expect(JSON.parse(out.value)).toEqual([cloud]);
    expect(out.remoteFutureKept).toBe(1);
  });

  test('спешащие часы (будущее у локальной) не побеждают: прежнее правило active, без remote_future_kept', () => {
    const local = { id: 'a', ru: 'моё', updatedAt: NOW + 3 * H };
    const out = run([local], [{ id: 'a', ru: 'облако', updatedAt: T }], true);
    expect(JSON.parse(out.value)).toEqual([local]);
    expect(out).toMatchObject({ localWon: 1, remoteWon: 0, remoteFutureKept: 0 });
    expect(summaries()).toEqual(['[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=0 time_unknown=1']);
  });

  test('без флага (restore запертых ключей → локальное хранилище) — прежнее правило: локальная', () => {
    const local = { id: 'a', ru: 'моё', updatedAt: T };
    const out = run([local], [{ id: 'a', ru: 'облако', updatedAt: NOW + 3 * H }], false);
    expect(JSON.parse(out.value)).toEqual([local]);
    expect(out).toMatchObject({ localWon: 1, remoteFutureKept: 0 });
  });

  test('облачная ровно на границе now + запас и локальная в пределах запаса — не «будущее»: локальная', () => {
    const local = { id: 'a', ru: 'моё', updatedAt: NOW + H - 1000 };
    const out = run([local], [{ id: 'a', ru: 'облако', updatedAt: NOW + H }], true);
    expect(JSON.parse(out.value)).toEqual([local]);
    expect(out).toMatchObject({ localWon: 1, remoteFutureKept: 0 });
  });

  test('облачная ровно на границе now + запас — обычное сравнение (облако новее)', () => {
    const cloud = { id: 'a', ru: 'облако', updatedAt: NOW + H };
    const out = run([{ id: 'a', ru: 'моё', updatedAt: T }], [cloud], true);
    expect(out).toMatchObject({ remoteWon: 1, remoteFutureKept: 0 });
  });
});
