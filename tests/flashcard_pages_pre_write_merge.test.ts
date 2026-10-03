import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Account V2, Пакет 8N — перед заменой страниц flashcard_pages клиент объединяет локальный
 * список с ТЕКУЩИМИ страницами (тот же col.get() внутри writeFlashcardPages), если облако
 * изменил кто-то другой (сервер 8M, второе устройство). Карточки из облака попадают и в
 * локальный список; удалённые здесь (журнал 7D) не возвращаются; страницы прочитаны не с
 * сервера → запись не идёт (ключ как запертый 8J).
 *
 * Firestore подменён фейком на уровне rnfbInstance — путь writeFlashcardPages настоящий.
 */

type PageDoc = { id: string; data: Record<string, unknown> };
const mockRemote: { pages: PageDoc[]; fromCache: boolean | undefined; commits: number; gets: number } = {
  pages: [],
  fromCache: false,
  commits: 0,
  gets: 0,
};

jest.mock('../app/rnfb_modular', () => {
  const col = {
    get: async () => {
      mockRemote.gets += 1;
      const pages = [...mockRemote.pages];
      return {
        empty: pages.length === 0,
        size: pages.length,
        metadata: mockRemote.fromCache === undefined ? undefined : { fromCache: mockRemote.fromCache },
        forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) =>
          pages.forEach((page) => cb({ id: page.id, data: () => page.data })),
      };
    },
    doc: (id: string) => ({ id }),
  };
  const db = {
    collection: () => ({ doc: () => ({ collection: () => col }) }),
    batch: () => {
      const sets = new Map<string, Record<string, unknown>>();
      const deletes: string[] = [];
      return {
        set: (ref: { id: string }, data: Record<string, unknown>) => { sets.set(ref.id, data); },
        delete: (ref: { id: string }) => { deletes.push(ref.id); },
        commit: async () => {
          mockRemote.commits += 1;
          const kept = mockRemote.pages.filter((page) => !deletes.includes(page.id) && !sets.has(page.id));
          mockRemote.pages = [...kept, ...[...sets].map(([id, data]) => ({ id, data }))];
        },
      };
    },
  };
  return { rnfbInstance: () => db, __esModule: true, default: () => null };
});

// eslint-disable-next-line import/first
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
// eslint-disable-next-line import/first
import {
  DEFAULT_PRE_WRITE_STORE,
  FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY,
  __resetFlashcardPagesWriteLockMemoryForTests,
  fingerprintCardsJson,
  finishFlashcardPagesPreWrite,
  readFlashcardPagesWriteLocks,
  type FlashcardPagesPreWriteStore,
} from '../app/flashcard_pages_read_result';
// eslint-disable-next-line import/first
import { writeFlashcardPages } from '../app/flashcards_cloud_pages';
// eslint-disable-next-line import/first
import {
  buildDocProgressWithoutFlashcardLists,
  runForceFlashcardUpload,
  uploadFlashcardListsToPages,
  type FlashcardCloudUploadDeps,
} from '../app/flashcards_cloud_upload';
// eslint-disable-next-line import/first
import { recordCardDeletions, __resetCardDeletionJournalQueueForTests } from '../app/flashcards/card_deletion_journal';
// eslint-disable-next-line import/first
import { __resetFlashcardCacheForTests, loadFlashcards } from '../hooks/use-flashcards';

const EN = 'flashcards_v1';
const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };
const card = (id: string, en = `phrase ${id}`) => ({ id, en, ru: `фраза ${id}`, uk: `фраза ${id}` });
type Card = ReturnType<typeof card>;

function setRemote(target: string, cards: unknown[], index = 0): void {
  mockRemote.pages.push({
    id: `${target}_${String(index).padStart(4, '0')}`,
    data: { target, index, count: cards.length, cards: JSON.stringify(cards) },
  });
}
function remoteIds(target = 'en'): string[] {
  return mockRemote.pages
    .filter((page) => page.data.target === target)
    .sort((a, b) => Number(a.data.index) - Number(b.data.index))
    .flatMap((page) => (JSON.parse(String(page.data.cards)) as Card[]).map((c) => c.id));
}
async function localIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(EN);
  return raw ? (JSON.parse(raw) as Card[]).map((c) => c.id) : [];
}

const readDeletedSpy = jest.fn(DEFAULT_PRE_WRITE_STORE.readDeletedIds);
const store: FlashcardPagesPreWriteStore = { ...DEFAULT_PRE_WRITE_STORE, readDeletedIds: (t) => readDeletedSpy(t) };
const deps = (): FlashcardCloudUploadDeps => ({
  writePages: writeFlashcardPages,
  readLocks: readFlashcardPagesWriteLocks,
  preWriteStore: store,
});

async function sync(localCards: Card[], mode: 'sync' | 'force' = 'sync') {
  const json = JSON.stringify(localCards);
  await AsyncStorage.setItem(EN, json);
  return uploadFlashcardListsToPages({
    uid: 'stable-a', data: { [EN]: json }, previousSnapshot: {}, mode, isCurrent: () => true, deps: deps(),
  });
}

let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  mockRemote.pages = [];
  mockRemote.fromCache = false;
  mockRemote.commits = 0;
  mockRemote.gets = 0;
  readDeletedSpy.mockClear();
  __resetFlashcardPagesWriteLockMemoryForTests();
  __resetCardDeletionJournalQueueForTests();
  __resetFlashcardCacheForTests();
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

describe('8N — объединение с текущими страницами перед записью', () => {
  test('карточка проигравшего есть в страницах, локально её нет → после синка она в страницах и локально', async () => {
    setRemote('en', [card('c1'), card('c2'), card('loser1')]);
    // Локально карточки уже загружены в кэш хука — объединение обязано обновить и кэш.
    await AsyncStorage.setItem(EN, JSON.stringify([card('c1'), card('c2'), card('new3')]));
    expect((await loadFlashcards('en')).map((c) => c.id)).toEqual(['c1', 'c2', 'new3']);

    const plan = await sync([card('c1'), card('c2'), card('new3')]);

    expect(plan?.clearDocField.has(EN)).toBe(true);
    expect(remoteIds().sort()).toEqual(['c1', 'c2', 'loser1', 'new3']);
    expect((await localIds()).sort()).toEqual(['c1', 'c2', 'loser1', 'new3']);
    expect((await loadFlashcards('en')).map((c) => c.id).sort()).toEqual(['c1', 'c2', 'loser1', 'new3']);
    expect(mockRemote.gets).toBe(1);
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge key=flashcards_v1 local=3 remote=3 added_from_remote=1 dropped_by_journal=0 decision=merged reason=no_own_fingerprint');
    // логи без uid
    expect(lines().filter((line) => line.includes('[FLASHCARD-PAGES]')).some((line) => line.includes('stable-a'))).toBe(false);
  });

  // зачем (долг ревью 8N, S3; TG-622DD6E4BD75): после объединения порядок списка не должен «прыгать».
  // Раньше страницы получали порядок «облако, потом локальные» — у локального списка после дозаписи
  // порядок другой («локальные, потом пришедшие из облака»), и два списка расходились навсегда.
  // Теперь страницы и локальный список после синка идентичны по порядку.
  test('порядок после объединения: как в локальном списке, пришедшие из облака — в конце', async () => {
    setRemote('en', [card('x'), card('a'), card('y')]);

    await sync([card('b'), card('a'), card('d')]);

    expect(remoteIds()).toEqual(['b', 'a', 'd', 'x', 'y']);
    expect(await localIds()).toEqual(['b', 'a', 'd', 'x', 'y']);
    expect((await loadFlashcards('en')).map((c) => c.id)).toEqual(['b', 'a', 'd', 'x', 'y']);
  });

  test('карточка удалена здесь (журнал 7D) → из страниц не возвращается', async () => {
    setRemote('en', [card('c1'), card('gone')]);
    await recordCardDeletions('en', 'saved', ['gone']);

    await sync([card('c1')]);

    expect(remoteIds()).toEqual(['c1']);
    expect(await localIds()).toEqual(['c1']);
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge key=flashcards_v1 local=1 remote=2 added_from_remote=0 dropped_by_journal=1 decision=local reason=no_own_fingerprint');
  });

  test('страницы прочитаны из кэша → запись не идёт, ключ ведёт себя как запертый', async () => {
    setRemote('en', [card('c1'), card('c2')]);
    mockRemote.fromCache = true;

    const plan = await sync([card('c1')]);

    expect(mockRemote.commits).toBe(0);
    expect(remoteIds()).toEqual(['c1', 'c2']);
    expect(plan?.lockedNow.has(EN)).toBe(true);
    expect(plan?.clearDocField.has(EN)).toBe(false);
    expect(plan?.sentToDoc.has(EN)).toBe(false);
    // и в документ список не уходит
    expect(buildDocProgressWithoutFlashcardLists({ [EN]: '[]' }, plan!)).toEqual({});
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge key=flashcards_v1 local=1 remote=unknown added_from_remote=0 dropped_by_journal=0 decision=skip_write reason=read_from_cache from=cache');
  });

  test('без метаданных снимка → тоже не пишем', async () => {
    setRemote('en', [card('c1')]);
    mockRemote.fromCache = undefined;
    const plan = await sync([]);
    expect(mockRemote.commits).toBe(0);
    expect(plan?.lockedNow.has(EN)).toBe(true);
  });

  test('в облаке ровно наша прошлая запись → объединения нет, локальное удаление уходит, журнал не читается', async () => {
    setRemote('en', [card('c1'), card('loser1')]);
    await sync([card('c1')]);
    expect(remoteIds().sort()).toEqual(['c1', 'loser1']);
    readDeletedSpy.mockClear();

    // человек удалил loser1 (без журнала) — облако не изменилось с нашей записи
    await sync([card('c1')]);

    expect(remoteIds()).toEqual(['c1']);
    expect(readDeletedSpy).not.toHaveBeenCalled();
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge key=flashcards_v1 local=1 remote=2 added_from_remote=0 dropped_by_journal=0 decision=local reason=remote_is_own_last_write');
    // одно чтение на запись — то же, что было до 8N
    expect(mockRemote.gets).toBe(2);
  });

  test('облако изменило другое устройство после нашей записи → объединяем снова', async () => {
    await sync([card('c1')]);
    // второе устройство дописало карточку
    mockRemote.pages = [];
    setRemote('en', [card('c1'), card('other')]);

    await sync([card('c1'), card('mine')]);

    expect(remoteIds().sort()).toEqual(['c1', 'mine', 'other']);
    expect((await localIds()).sort()).toEqual(['c1', 'mine', 'other']);
    expect(lines().some((line) => line.includes('decision=merged reason=remote_changed_elsewhere'))).toBe(true);
  });

  test('страниц нет (сервер подтвердил) → пишем локальное как есть', async () => {
    await sync([card('c1')]);
    expect(remoteIds()).toEqual(['c1']);
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge key=flashcards_v1 local=1 remote=0 added_from_remote=0 dropped_by_journal=0 decision=local reason=remote_empty');
  });

  test('страницы другого языка не подмешиваются', async () => {
    setRemote('fr', [card('fr1')]);
    await sync([card('c1')]);
    expect(remoteIds('en')).toEqual(['c1']);
    expect(remoteIds('fr')).toEqual(['fr1']);
    expect(await localIds()).toEqual(['c1']);
  });

  test('force: облачные карточки остаются в страницах, локальное не трогаем, отпечаток не сохраняем', async () => {
    setRemote('en', [card('c1'), card('loser1')]);
    await AsyncStorage.setItem(EN, JSON.stringify([card('c1')]));
    const outcome = await runForceFlashcardUpload({
      uid: 'stable-a', data: { [EN]: JSON.stringify([card('c1')]) }, isCurrent: () => true, timeoutMs: 5000, deps: deps(),
    });
    expect(outcome.ok).toBe(true);
    expect(remoteIds().sort()).toEqual(['c1', 'loser1']);
    expect(await localIds()).toEqual(['c1']);
    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY)).toBeNull();
  });

  test('force: страницы из кэша → перенос отказывает (pages_locked)', async () => {
    setRemote('en', [card('c1')]);
    mockRemote.fromCache = true;
    const outcome = await runForceFlashcardUpload({
      uid: 'stable-a', data: { [EN]: JSON.stringify([card('c1')]) }, isCurrent: () => true, timeoutMs: 5000, deps: deps(),
    });
    expect(outcome).toEqual({ ok: false, reason: 'pages_locked' });
    expect(mockRemote.commits).toBe(0);
  });

  test('сбой добавления в локальное → отпечаток не сохраняется (следующий синк объединит снова)', async () => {
    setRemote('en', [card('c1'), card('loser1')]);
    const json = JSON.stringify([card('c1')]);
    await uploadFlashcardListsToPages({
      uid: 'stable-a', data: { [EN]: json }, previousSnapshot: {}, mode: 'sync', isCurrent: () => true,
      deps: { ...deps(), mergeLocal: async () => -1 },
    });
    expect(remoteIds().sort()).toEqual(['c1', 'loser1']);
    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY)).toBeNull();
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge_finish key=flashcards_v1 result=local_merge_failed fingerprint=not_saved');
  });

  test('ревью C1: в облаке карточка с той же фразой и другим id → после двух синков она всё ещё в страницах', async () => {
    // Хук локально отбрасывает дубль по фразе en — отпечаток сохранять нельзя, иначе второй
    // синк запишет локальный список без облачного варианта (перевод/контекст/прогресс).
    setRemote('en', [card('c1'), card('loser-dup', 'phrase c1')]);
    await sync([card('c1')]);
    expect(remoteIds().sort()).toEqual(['c1', 'loser-dup']);
    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY)).toBeNull();
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge_finish key=flashcards_v1 result=ok fingerprint=not_saved reason=local_dedup_dropped=1');

    await sync([card('c1')]);
    expect(remoteIds().sort()).toEqual(['c1', 'loser-dup']);
  });

  test('отпечаток чужого аккаунта не считается своим', async () => {
    setRemote('en', [card('c1'), card('loser1')]);
    const remoteJson = JSON.stringify([card('c1'), card('loser1')]);
    await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY, JSON.stringify({
      owner: 'stable-other', keys: { [EN]: fingerprintCardsJson(remoteJson) },
    }));
    await sync([card('c1')]);
    expect(remoteIds().sort()).toEqual(['c1', 'loser1']);
  });
});

// зачем (S1b, §100 координатора; S1c — одно правило с 8E): «правка между синками не откатывается».
// Одна и та же карточка изменена локально и лежит в облаке другой версией (сервер 8M, второе
// устройство). Побеждает более позднее время правки, но только с запасом по часам (1 час, как 8E);
// в пределах запаса или без времени → локальная. Раньше всегда облако.
describe('S1b/S1c — версия одной карточки при объединении перед записью', () => {
  const T = 1_800_000_000_000;
  const H = 60 * 60 * 1000;
  const v = (id: string, ru: string, updatedAt?: number) => ({ ...card(id), ru, ...(updatedAt === undefined ? {} : { updatedAt }) });
  function remoteCard(id: string): Record<string, unknown> | undefined {
    return mockRemote.pages
      .flatMap((page) => JSON.parse(String(page.data.cards)) as Array<Record<string, unknown>>)
      .find((c) => c.id === id);
  }
  async function localCard(id: string): Promise<Record<string, unknown> | undefined> {
    const raw = await AsyncStorage.getItem(EN);
    return raw ? (JSON.parse(raw) as Array<Record<string, unknown>>).find((c) => c.id === id) : undefined;
  }

  test('локальная правка новее облака → в страницах и локально новая версия, и после второго синка тоже', async () => {
    setRemote('en', [v('a', 'старое', T), card('b')]);
    await AsyncStorage.setItem(EN, JSON.stringify([v('a', 'новое', T + H)]));

    await sync([v('a', 'новое', T + H)]);

    expect(remoteCard('a')?.ru).toBe('новое');
    expect((await localCard('a'))?.ru).toBe('новое');
    expect(remoteIds().sort()).toEqual(['a', 'b']);
    expect(lines()).toContain('[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=1 remote_newer=0 within_margin=0 time_unknown=0');

    const raw = await AsyncStorage.getItem(EN);
    await sync(JSON.parse(raw!) as Card[]);
    expect(remoteCard('a')?.ru).toBe('новое');
    expect((await localCard('a'))?.ru).toBe('новое');
  });

  test('облачная версия новее → в страницах и локально облачная; следующий синк её не откатывает', async () => {
    setRemote('en', [v('a', 'облако-новое', T + H)]);
    await AsyncStorage.setItem(EN, JSON.stringify([v('a', 'старое', T)]));
    expect((await loadFlashcards('en'))[0]?.ru).toBe('старое');

    await sync([v('a', 'старое', T)]);

    expect(remoteCard('a')?.ru).toBe('облако-новое');
    expect((await localCard('a'))?.ru).toBe('облако-новое');
    expect((await loadFlashcards('en'))[0]?.ru).toBe('облако-новое');
    expect(lines()).toContain('[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=1 within_margin=0 time_unknown=0');
    expect(lines().some((line) => line.includes('pre_write_merge_finish key=flashcards_v1') && line.includes('local_replaced=1'))).toBe(true);

    const raw = await AsyncStorage.getItem(EN);
    await sync(JSON.parse(raw!) as Card[]);
    expect(remoteCard('a')?.ru).toBe('облако-новое');
  });

  test('облако новее меньше чем на запас по часам → локальная версия в страницах', async () => {
    setRemote('en', [v('a', 'облако', T + H - 1)]);
    await sync([v('a', 'моё', T)]);
    expect(remoteCard('a')?.ru).toBe('моё');
    expect((await localCard('a'))?.ru).toBe('моё');
    expect(lines()).toContain('[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=1 time_unknown=0');
  });

  test('карточки без updatedAt → локальная версия в страницах', async () => {
    setRemote('en', [v('a', 'облако')]);
    await sync([v('a', 'моё')]);
    expect(remoteCard('a')?.ru).toBe('моё');
    expect((await localCard('a'))?.ru).toBe('моё');
    expect(lines()).toContain('[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=0 time_unknown=1');
  });
});

describe('S1b — замена локальной версии облачной: сбой и гонка', () => {
  const T = 1_800_000_000_000;
  const H = 60 * 60 * 1000;
  const decision = (remote: unknown[]) => ({
    kind: 'write' as const, cardsJson: '[]', merged: true, addedFromRemote: [], replacedFromRemote: remote, fingerprint: 'fp',
  });

  test('замена не прошла → отпечаток не сохраняется (следующий синк объединит снова)', async () => {
    await finishFlashcardPagesPreWrite({
      owner: 'stable-a', key: EN, target: 'en', decision: decision([{ id: 'a', updatedAt: T }]), pagesWritten: 1, mode: 'sync',
      store, mergeLocal: async () => 0, replaceLocal: async () => -1,
    });
    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY)).toBeNull();
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge_finish key=flashcards_v1 result=local_replace_failed fingerprint=not_saved');
  });

  test('человек успел изменить карточку новее облака → локальную не заменяем, отпечаток не сохраняем', async () => {
    await AsyncStorage.setItem(EN, JSON.stringify([{ ...card('a'), ru: 'свежая правка', updatedAt: T + 2 * H }]));
    await finishFlashcardPagesPreWrite({
      owner: 'stable-a', key: EN, target: 'en', decision: decision([{ ...card('a'), ru: 'облако', updatedAt: T + H }]), pagesWritten: 1, mode: 'sync',
      store, mergeLocal: async () => 0,
    });
    expect((await loadFlashcards('en'))[0]?.ru).toBe('свежая правка');
    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY)).toBeNull();
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge_finish key=flashcards_v1 result=ok fingerprint=not_saved reason=local_replace_skipped=1');
  });

  // зачем (S1c R4): облако было новее ИСХОДНОЙ локальной на ≥ запаса (решение «заменить»), но человек
  // успел поправить карточку — свежая правка всего на минуту новее облака (в пределах запаса). На
  // активном устройстве это правило §100: остаётся локальная; в режиме 'restore' её бы затёрло облаком.
  test('свежая правка в пределах запаса от облака → локальную не заменяем, отпечаток не сохраняем', async () => {
    const remote = { ...card('a'), ru: 'облако', updatedAt: T + H };
    await AsyncStorage.setItem(EN, JSON.stringify([{ ...card('a'), ru: 'свежая правка', updatedAt: T + H + 60_000 }]));
    await finishFlashcardPagesPreWrite({
      owner: 'stable-a', key: EN, target: 'en', decision: decision([remote]), pagesWritten: 1, mode: 'sync',
      store, mergeLocal: async () => 0,
    });
    expect((await loadFlashcards('en'))[0]?.ru).toBe('свежая правка');
    expect(await AsyncStorage.getItem(FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY)).toBeNull();
    expect(lines()).toContain('[FLASHCARD-PAGES] pre_write_merge_finish key=flashcards_v1 result=ok fingerprint=not_saved reason=local_replace_skipped=1');
  });
});
