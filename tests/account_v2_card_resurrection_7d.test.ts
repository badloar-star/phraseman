import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HydratedCard } from '../modules/account-session-v2/account_v2_hydration';
import { parseHydration, withoutLocallyOwned } from '../modules/account-session-v2/account_v2_hydration';
import { planAccountsV2Change, type EntityMirror } from '../modules/account-session-v2/account_sync_producer_plan';
import {
  CARD_DELETION_JOURNAL_KEY,
  CARD_DELETION_JOURNAL_MAX,
  __resetCardDeletionJournalQueueForTests,
  forgetCardDeletions,
  readCardDeletionJournal,
  recordCardDeletions,
} from '../app/flashcards/card_deletion_journal';
import {
  applyHydratedCardDeletions,
  deletionBeatsLocalCard,
  journalBeatsServerCard,
  planCardDeletions,
} from '../app/accounts_v2_hydration_deletions';
import { applyAccountsV2HydrationLocally, applyHydratedCards, applyHydratedSrs } from '../app/accounts_v2_hydration_apply';
import {
  loadFlashcards,
  removeFlashcardWithSnapshot,
  restoreFlashcard,
  saveFlashcards,
  type Flashcard,
} from '../hooks/use-flashcards';
import { deleteCustomCard, listCustomCards, restoreCustomCard, upsertCustomCard, __resetCustomCardsStoreForTests } from '../app/flashcards/custom_cards_store';
import type { CardItem } from '../app/flashcards/types';
import { flashcardsSwipeMemoryKey } from '../app/target_storage_keys';
import { beginAccountGeneration } from '../app/account_generation';
import { accountOwnedStorageKeysFrom, SYNC_KEYS } from '../app/cloud_sync';
import { hasMeaningfulLocalAccountData } from '../app/local_account_data';

/*
 * Account V2, Пакет 7D — удалённые карточки не воскресают.
 * Закон: удаление побеждает ТОЛЬКО если оно свежее последней известной правки.
 *  (а) удалена до V2 → перенос вернул бы → журнал не даёт добавить + tombstone в V2;
 *  (б) выход/вход → старый restore вернул удалённые при V2 → tombstone V2 убирает;
 *  (в) удалена на другом устройстве → tombstone V2 убирает, если свежее локальной правки.
 */

const T = 1_800_000_000_000;
const storageMock = AsyncStorage as unknown as { __reset: () => void };

function serverCard(id: string, over: Partial<HydratedCard> = {}): HydratedCard {
  return Object.freeze({
    target: 'en', list: 'saved', id, deleted: false,
    fields: { id, en: `phrase ${id}`, ru: 'р', uk: 'у', source: 'lesson', addedAt: T - 50_000 },
    srs: null, revision: 1, updatedAtMs: T + 10_000, ...over,
  }) as HydratedCard;
}

function tomb(id: string, atMs: number | null, list: 'saved' | 'custom' = 'saved'): HydratedCard {
  return Object.freeze({ target: 'en', list, id, deleted: true, fields: {}, srs: null, revision: 3, updatedAtMs: atMs }) as HydratedCard;
}

function local(id: string, addedAt: number): Flashcard {
  return { id, en: `phrase ${id}`, ru: 'р', uk: 'у', source: 'lesson', addedAt } as Flashcard;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 30; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

let log: jest.SpyInstance;
let warn: jest.SpyInstance;
const lines = (): string[] => [...log.mock.calls, ...warn.mock.calls].map((args) => args.join(' '));

beforeEach(() => {
  storageMock.__reset();
  __resetCardDeletionJournalQueueForTests();
  __resetCustomCardsStoreForTests();
  beginAccountGeneration('stable-7d');
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { log.mockRestore(); warn.mockRestore(); });

describe('7D — журнал удалений', () => {
  test('запись, повтор обновляет время, «Вернуть» снимает; предел — вытесняются самые старые', async () => {
    await recordCardDeletions('en', 'saved', ['a', 'b'], T);
    await recordCardDeletions('en', 'saved', ['a'], T + 5);
    await forgetCardDeletions('en', 'saved', ['b']);
    expect([...(await readCardDeletionJournal())!]).toEqual([['en:saved:a', T + 5]]);
    const many = Array.from({ length: CARD_DELETION_JOURNAL_MAX + 3 }, (_, index) => `x${index}`);
    await recordCardDeletions('fr', 'custom', many, T + 9);
    const journal = (await readCardDeletionJournal())!;
    expect(journal.size).toBe(CARD_DELETION_JOURNAL_MAX);
    expect(journal.has('en:saved:a')).toBe(false);
    expect(journal.has('fr:custom:x2')).toBe(false);
    expect(journal.has('fr:custom:x3')).toBe(true);
    expect(lines().some((line) => line.includes('[ACCOUNT-V2] journal evicted count=4'))).toBe(true);
  });

  test('битый журнал: чтение → null (как без журнала), запись начинает заново', async () => {
    await AsyncStorage.setItem(CARD_DELETION_JOURNAL_KEY, '{broken');
    expect(await readCardDeletionJournal()).toBeNull();
    await recordCardDeletions('en', 'saved', ['a'], T);
    expect([...(await readCardDeletionJournal())!]).toEqual([['en:saved:a', T]]);
    expect(lines()).toContain('[ACCOUNT-V2] journal corrupt -> reset label=record');
  });

  test('смена аккаунта до записи: чужому аккаунту журнал не пишется', async () => {
    const pending = recordCardDeletions('en', 'saved', ['a'], T);
    beginAccountGeneration('stable-other');
    await pending;
    expect(await AsyncStorage.getItem(CARD_DELETION_JOURNAL_KEY)).toBeNull();
  });

  test('аккаунтный ключ: в инвентаре (стирается при выходе), не в старом облаке, не «значимые данные»', async () => {
    expect(accountOwnedStorageKeysFrom([])).toContain(CARD_DELETION_JOURNAL_KEY);
    expect(SYNC_KEYS as readonly string[]).not.toContain(CARD_DELETION_JOURNAL_KEY);
    await recordCardDeletions('en', 'saved', ['a'], T);
    await expect(hasMeaningfulLocalAccountData(AsyncStorage as never)).resolves.toBe(false);
  });

  test('сохранённые: удаление пишет журнал, «Вернуть» снимает; удаление отсутствующей — без записи', async () => {
    await saveFlashcards([local('c1', T - 9), local('c2', T - 9)], 'en');
    const snapshot = await removeFlashcardWithSnapshot('c1', 'en');
    await settle();
    expect((await readCardDeletionJournal())!.has('en:saved:c1')).toBe(true);
    await restoreFlashcard(snapshot!.card, snapshot!.index, 'en');
    await settle();
    expect((await readCardDeletionJournal())!.has('en:saved:c1')).toBe(false);
    expect(await removeFlashcardWithSnapshot('nope', 'en')).toBeNull();
    await settle();
    expect((await readCardDeletionJournal())!.size).toBe(0);
  });

  test('свои карточки: deleteCustomCard пишет журнал, restoreCustomCard снимает', async () => {
    const card = { id: 'u1', en: 'mine', ru: 'моя', uk: 'моя', categoryId: 'custom', isSystem: false, addedAt: T - 9 } as CardItem;
    await upsertCustomCard(card, 'en');
    const removed = await deleteCustomCard('u1', 'en');
    await settle();
    expect((await readCardDeletionJournal())!.has('en:custom:u1')).toBe(true);
    await restoreCustomCard(removed!.card, removed!.index, 'en');
    await settle();
    expect((await readCardDeletionJournal())!.has('en:custom:u1')).toBe(false);
    expect(await deleteCustomCard('missing', 'en')).toBeNull();
    await settle();
    expect((await readCardDeletionJournal())!.size).toBe(0);
  });
});

describe('7D — правила решения (чистые)', () => {
  test('журнал против живой карточки сервера', () => {
    // перенос записал карточку один раз, её время раньше удаления → удаление свежее
    expect(journalBeatsServerCard(T, serverCard('a'))).toEqual({ remove: true, reason: 'server_written_once_before_deletion' });
    // сущность не менялась с момента до удаления
    expect(journalBeatsServerCard(T, serverCard('a', { revision: 4, updatedAtMs: T - 1 })).remove).toBe(true);
    // свайп на другом устройстве после удаления → сервер свежее
    expect(journalBeatsServerCard(T, serverCard('a', { revision: 2, srs: { updatedAtMs: T + 5 } })))
      .toEqual({ remove: false, reason: 'server_newer' });
    // правка текста на другом устройстве после удаления (времён в полях нет, ревизия > 1) → сервер свежее
    expect(journalBeatsServerCard(T, serverCard('a', { revision: 3, updatedAtMs: T + 10 })))
      .toEqual({ remove: false, reason: 'server_newer' });
    // создана один раз, но ПОСЛЕ удаления (другое устройство) → сервер свежее
    expect(journalBeatsServerCard(T, serverCard('a', { fields: { addedAt: T + 1 } })).remove).toBe(false);
    // времён нет вовсе → неизвестно → оставить
    expect(journalBeatsServerCard(T, serverCard('a', { fields: {}, updatedAtMs: null })))
      .toEqual({ remove: false, reason: 'server_time_unknown' });
  });

  test('удаление против локальной правки: строго свежее, неизвестное — оставить', () => {
    expect(deletionBeatsLocalCard(T, T - 1).remove).toBe(true);
    expect(deletionBeatsLocalCard(T, T)).toEqual({ remove: false, reason: 'local_edit_newer' });
    expect(deletionBeatsLocalCard(null, T - 1)).toEqual({ remove: false, reason: 'deletion_time_unknown' });
    expect(deletionBeatsLocalCard(T, null)).toEqual({ remove: false, reason: 'local_edit_time_unknown' });
  });

  test('план: tombstone → кандидат; журнал побеждает → не добавлять + tombstone; сервер свежее → снять запись', () => {
    const counts: Record<string, number> = {};
    const journal = new Map([['en:saved:j1', T], ['en:saved:j2', T], ['en:saved:gone', T]]);
    const plan = planCardDeletions([
      tomb('t1', T + 1),
      serverCard('j1'),
      serverCard('j2', { revision: 2, srs: { updatedAtMs: T + 5 } }),
      serverCard('plain'),
    ], journal, counts);
    expect([...plan.blocked]).toEqual(['en:saved:j1']);
    expect(Object.fromEntries(plan.removals)).toEqual({ 'en:saved:t1': T + 1, 'en:saved:j1': T, 'en:saved:gone': T });
    expect([...plan.tombstones.values()].flat().map((item) => item.id)).toEqual(['j1']);
    expect(plan.forget).toEqual(['en:saved:j2']);
  });
});

describe('7D — применение в хранилища', () => {
  type Produced = { target: string; list: string; ids: readonly string[] };
  const ports = (produced: Produced[] = [], forgotten: string[][] = []) => ({
    readJournal: readCardDeletionJournal,
    forgetJournal: async (keys: readonly string[]) => { forgotten.push([...keys]); await forgetCardDeletionKeysReal(keys); },
    readMemory: async (key: string) => {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return {};
      try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
    },
    removeSaved: async (target: 'en', decide: (card: Readonly<{ id: string; addedAt?: unknown }>) => boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('../hooks/use-flashcards') as typeof import('../hooks/use-flashcards')).removeSavedFlashcardsFromAccountsV2(target, decide);
    },
    removeCustom: async (target: 'en', decide: (card: Readonly<{ id: string; addedAt?: unknown }>) => boolean) => {
      let removed = 0;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      await (require('../app/flashcards/custom_cards_store') as typeof import('../app/flashcards/custom_cards_store')).updateCustomCards((current) => {
        const next = current.filter((card) => !decide(card));
        removed = current.length - next.length;
        return removed === 0 ? current : next;
      }, target);
      return removed;
    },
    produceTombstones: (target: string, list: string, ids: readonly string[]) => { produced.push({ target, list, ids }); return true; },
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const forgetCardDeletionKeysReal = (require('../app/flashcards/card_deletion_journal') as typeof import('../app/flashcards/card_deletion_journal')).forgetCardDeletionKeys;

  test('(в) tombstone свежее локальной правки → убрана; свайп после удаления → оставлена; время неизвестно → оставлена', async () => {
    await saveFlashcards([local('old', T - 100), local('swiped', T - 100), local('unknown', T - 100), local('keep', T - 100)], 'en');
    await AsyncStorage.setItem(flashcardsSwipeMemoryKey('en'), JSON.stringify({ 'saved:all:swiped': { correct: 1, lastSeenAt: T + 50 } }));
    const counts: Record<string, number> = {};
    await applyHydratedCardDeletions([tomb('old', T), tomb('swiped', T), tomb('unknown', null)], () => true, counts, ports() as never);
    expect((await loadFlashcards('en')).map((card) => card.id)).toEqual(['swiped', 'unknown', 'keep']);
    expect(counts).toMatchObject({ cards_removed: 1, cards_removal_kept: 2 });
    expect(lines()).toEqual(expect.arrayContaining([
      '[ACCOUNT-V2] hydrate card_deletion decision=remove reason=deletion_newer_than_local_edit list=saved',
      '[ACCOUNT-V2] hydrate card_deletion decision=keep reason=local_edit_newer list=saved',
      '[ACCOUNT-V2] hydrate card_deletion decision=keep reason=deletion_time_unknown list=saved',
    ]));
    // журнал при этом не пишется — это не действие человека
    expect(await AsyncStorage.getItem(CARD_DELETION_JOURNAL_KEY)).toBeNull();
  });

  test('(б) restore вернул удалённую при V2: tombstone убирает; свои карточки тоже', async () => {
    await saveFlashcards([local('restored', T - 100)], 'en');
    await upsertCustomCard({ id: 'u1', en: 'mine', ru: 'm', uk: 'm', categoryId: 'custom', isSystem: false, addedAt: T - 100 } as CardItem, 'en');
    await upsertCustomCard({ id: 'u2', en: 'no time', ru: 'm', uk: 'm', categoryId: 'custom', isSystem: false } as CardItem, 'en');
    const counts: Record<string, number> = {};
    await applyHydratedCardDeletions([tomb('restored', T), tomb('u1', T, 'custom'), tomb('u2', T, 'custom')], () => true, counts, ports() as never);
    expect(await loadFlashcards('en')).toEqual([]);
    // u2 без времени правки — оставлена (неизвестно = не удаляем)
    expect((await listCustomCards('en')).map((card) => card.id)).toEqual(['u2']);
  });

  test('(б) без сервера: журнал + карточка вернулась старым restore → убрана; «Вернуть» (журнал снят) → оставлена', async () => {
    await recordCardDeletions('en', 'saved', ['back'], T);
    await saveFlashcards([local('back', T - 100), local('undone', T - 100)], 'en');
    const counts: Record<string, number> = {};
    await applyHydratedCardDeletions([], () => true, counts, ports() as never);
    expect((await loadFlashcards('en')).map((card) => card.id)).toEqual(['undone']);
  });

  test('(а) журнал свежее переноса: не добавляется, tombstone в V2; сервер свежее → добавляется, запись снята', async () => {
    await recordCardDeletions('en', 'saved', ['migrated', 'touched'], T);
    const produced: Produced[] = [];
    const forgotten: string[][] = [];
    const cards = [serverCard('migrated'), serverCard('touched', { revision: 2, srs: { updatedAtMs: T + 5 } })];
    const counts: Record<string, number> = {};
    const blocked = await applyHydratedCardDeletions(cards, () => true, counts, ports(produced, forgotten) as never);
    await applyHydratedCards(cards, () => true, counts, blocked);
    await applyHydratedSrs(cards, () => true, counts, blocked);
    expect((await loadFlashcards('en')).map((card) => card.id)).toEqual(['touched']);
    expect(produced).toEqual([{ target: 'en', list: 'saved', ids: ['migrated'] }]);
    expect(forgotten).toEqual([['en:saved:touched']]);
    expect([...(await readCardDeletionJournal())!.keys()]).toEqual(['en:saved:migrated']);
    expect(counts).toMatchObject({ cards_blocked_by_journal: 1, cards_journal_blocked: 1, cards_journal_server_newer: 1, cards_tombstones_queued: 1 });
  });

  test('память свайпов нечитаема → ничего не убираем (правку не сравнить)', async () => {
    await saveFlashcards([local('old', T - 100)], 'en');
    await AsyncStorage.setItem(flashcardsSwipeMemoryKey('en'), '{broken');
    const counts: Record<string, number> = {};
    await applyHydratedCardDeletions([tomb('old', T)], () => true, counts, ports() as never);
    expect((await loadFlashcards('en')).map((card) => card.id)).toEqual(['old']);
    expect(counts.cards_removal_memory_unreadable).toBe(1);
  });

  test('смена аккаунта → обрыв без удалений', async () => {
    await saveFlashcards([local('old', T - 100)], 'en');
    await expect(applyHydratedCardDeletions([tomb('old', T)], () => false, {}, ports() as never)).rejects.toThrow('hydration_stale');
    expect((await loadFlashcards('en')).map((card) => card.id)).toEqual(['old']);
  });
});

describe('7D — полное применение (боевые порты)', () => {
  test('tombstone убирает воскресшую, журнал не даёт добавить; флаг V2 выкл → tombstone не ставится (лог)', async () => {
    await saveFlashcards([local('restored', T - 100)], 'en');
    await recordCardDeletions('en', 'saved', ['migrated'], T);
    const result = await applyAccountsV2HydrationLocally({
      lessons: [], libraries: [], cards: [tomb('restored', T), serverCard('migrated'), serverCard('fresh', { fields: { id: 'fresh', en: 'phrase fresh', addedAt: T - 1 } })],
    }, () => true);
    expect((await loadFlashcards('en')).map((card) => card.id)).toEqual(['fresh']);
    expect(result).toMatchObject({ cards_removed: 1, cards_blocked_by_journal: 1, cards_added: 1 });
    expect(lines()).toContain('[ACCOUNT-V2] hydrate card_deletion tombstone_skip reason=no_owner list=saved count=1');
  });
});

describe('7D — гидрация и производитель', () => {
  test('pull: ревизия и время сущности доходят до карточки; tombstone сервера не отфильтрован зеркалом', () => {
    const parsed = parseHydration([
      { entityType: 'flashcard', entityId: 'en:saved:a', revision: 3, updatedAtMs: T, state: { deleted: true, fields: {} } },
      { entityType: 'flashcard', entityId: 'en:saved:b', revision: 1, updatedAtMs: 'x' as never, state: { deleted: false, fields: { id: { value: 'b' } } } },
    ] as never);
    expect(parsed.snapshot.cards).toEqual([
      expect.objectContaining({ id: 'a', deleted: true, revision: 3, updatedAtMs: T }),
      expect.objectContaining({ id: 'b', deleted: false, revision: 1, updatedAtMs: null }),
    ]);
    const kept = new Set(['en:saved:a', 'en:saved:b']);
    expect(withoutLocallyOwned(parsed.snapshot, new Set(), kept).cards.map((card) => card.id)).toEqual(['a']);
  });

  test('card_tombstones: tombstone только для не удалённых в зеркале, индекс сужается', async () => {
    const mirrors: Record<string, EntityMirror> = { 'en:saved:done': { fields: {}, deleted: true }, 'en:saved:live': { fields: { en: '"x"' }, deleted: false } };
    const plan = await planAccountsV2Change(
      { kind: 'card_tombstones', target: 'en', list: 'saved', ids: ['live', 'done', 'fresh', 'live', 7] },
      async (_type, id) => mirrors[id] ?? null,
      async () => ['live', 'keep'],
    );
    expect(plan.operations.map((op) => [op.entityId, op.payload])).toEqual([
      ['en:saved:live', { op: 'tombstone' }],
      ['en:saved:fresh', { op: 'tombstone' }],
    ]);
    expect(plan.listIndex).toEqual({ key: 'en:saved', ids: ['keep'] });
    expect(plan.notes).toContain('card_tombstones_already count=1');
    const noIndex = await planAccountsV2Change({ kind: 'card_tombstones', target: 'en', list: 'saved', ids: ['x'] }, async () => null, async () => null);
    expect(noIndex.listIndex).toBeNull();
  });
});
