// зачем (Сверка 21.10, пункт №39, Galaxy A04 «работа над ошибками тормозит»): журнал ошибок разбивался на куски квадратично и
// перезаписывался целиком на каждый ответ. Здесь доказываем: (1) новое линейное разбиение даёт ПОБАЙТОВО те же куски, что прежний
// алгоритм (id кусков — хеш содержимого, любое расхождение «потеряло бы» старые журналы); (2) дописывание пишет только новое
// и не ходит в getAllKeys; (3) старые журналы читаются и дополняются без потерь; (4) стирание/подмена корня сбрасывает кэш.
jest.mock('../app/phone_state_practice_bridge', () => ({
  commitPhoneStatePracticeFact: jest.fn(async () => undefined),
  mergePhoneStatePracticeFacts: jest.fn(async (_kind: string, facts: Record<string, unknown>) => facts),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: 'uninitialized' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: <T,>(work: () => Promise<T>) => work(),
}));

/* eslint-disable import/first */
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import {
  MISTAKE_EVENT_JOURNAL_CHUNK_MAX_EVENTS,
  MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS,
  chunkMistakeEventJournal,
  planMistakeEventJournalChunks,
  type MistakeEventJournal,
} from '../app/mistake_practice_cloud_merge';
import {
  appendMistakeEvent,
  loadMistakeEventJournal,
  mergeMistakeEvents,
  type MistakePracticeStorage,
} from '../app/mistake_practice_store';
import { mistakePracticeEventsKey } from '../app/target_storage_keys';
/* eslint-enable import/first */

const SCOPE = 'owner-a';
const TARGET = 'en' as const;

const makeEvent = (eventId: string, occurredAtMs: number, padding = 0) => ({
  eventId,
  mistakeId: `mistake:${eventId}`,
  cycleId: `cycle:${eventId}`,
  type: 'captured' as const,
  occurredAtMs,
  studyTarget: TARGET,
  payload: { canonicalTarget: eventId + 'x'.repeat(padding) },
});

const journalOf = (events: ReturnType<typeof makeEvent>[]): MistakeEventJournal => Object.freeze({
  version: 1 as const, accountScope: SCOPE, studyTarget: TARGET, events: Object.freeze(events),
});

// Копия ПРЕЖНЕГО алгоритма (квадратичного) — эталон побайтовой эквивалентности. Не «чинить» вместе с боевым кодом.
const eventSort = (a: { occurredAtMs: number; eventId: string }, b: { occurredAtMs: number; eventId: string }) =>
  a.occurredAtMs - b.occurredAtMs || a.eventId.localeCompare(b.eventId);
function legacyChunk(journal: MistakeEventJournal): string[] {
  const out: string[] = [];
  let events: MistakeEventJournal['events'][number][] = [];
  const flush = () => {
    if (!events.length) return;
    out.push(canonicalJsonV1({ version: 1, accountScope: journal.accountScope, studyTarget: journal.studyTarget, events }));
    events = [];
  };
  for (const event of [...journal.events].sort(eventSort)) {
    const candidate = { version: 1, accountScope: journal.accountScope, studyTarget: journal.studyTarget, events: [...events, event] };
    if (events.length >= MISTAKE_EVENT_JOURNAL_CHUNK_MAX_EVENTS
      || canonicalJsonV1(candidate).length > MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS) flush();
    const single = { version: 1, accountScope: journal.accountScope, studyTarget: journal.studyTarget, events: [event] };
    if (canonicalJsonV1(single).length > MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS) throw new Error('mistake_practice_event_too_large');
    events.push(event);
  }
  flush();
  return out;
}

// детерминированный генератор (без Math.random — тест воспроизводим)
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

describe('линейное разбиение журнала == прежнему', () => {
  test('случайные журналы: куски совпадают побайтово (по числу событий и по размеру)', () => {
    const rand = rng(42);
    for (let round = 0; round < 25; round += 1) {
      const count = Math.floor(rand() * 420);
      const events = Array.from({ length: count }, (_, i) =>
        makeEvent(`e${String(Math.floor(rand() * 1e6)).padStart(7, '0')}-${i}`, Math.floor(rand() * 1e9), Math.floor(rand() * (round % 2 ? 2400 : 40))));
      const journal = journalOf(events);
      expect(planMistakeEventJournalChunks(journal).map((p) => p.encoded)).toEqual(legacyChunk(journal));
      expect(chunkMistakeEventJournal(journal).map((c) => canonicalJsonV1(c))).toEqual(legacyChunk(journal));
    }
  });

  test('граница по числу событий (100) и по размеру (60 000 знаков)', () => {
    const byCount = journalOf(Array.from({ length: 250 }, (_, i) => makeEvent(`c${i}`, i)));
    expect(planMistakeEventJournalChunks(byCount).map((p) => p.chunk.events.length)).toEqual([100, 100, 50]);
    const bySize = journalOf(Array.from({ length: 40 }, (_, i) => makeEvent(`s${i}`, i, 5000)));
    expect(planMistakeEventJournalChunks(bySize).map((p) => p.encoded)).toEqual(legacyChunk(bySize));
    expect(planMistakeEventJournalChunks(bySize).length).toBeGreaterThan(1);
  });

  test('слишком большое событие — та же ошибка', () => {
    const huge = journalOf([makeEvent('big', 1, MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS)]);
    expect(() => planMistakeEventJournalChunks(huge)).toThrow('mistake_practice_event_too_large');
    expect(() => legacyChunk(huge)).toThrow('mistake_practice_event_too_large');
  });

  test('id куска = SHA-256 его текста, текст = canonicalJsonV1(chunk)', () => {
    const journal = journalOf(Array.from({ length: 130 }, (_, i) => makeEvent(`h${i}`, i)));
    for (const planned of planMistakeEventJournalChunks(journal)) {
      expect(planned.encoded).toBe(canonicalJsonV1(planned.chunk));
      expect(sha256Utf8(planned.encoded)).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});

function makeStorage() {
  const data = new Map<string, string>();
  const ops = { get: 0, set: 0, remove: 0, getAllKeys: 0 };
  const storage: MistakePracticeStorage = {
    getItem: async (k) => { ops.get += 1; return data.get(k) ?? null; },
    setItem: async (k, v) => { ops.set += 1; data.set(k, v); },
    removeItem: async (k) => { ops.remove += 1; data.delete(k); },
    getAllKeys: async () => { ops.getAllKeys += 1; return [...data.keys()]; },
  };
  const reset = () => { ops.get = 0; ops.set = 0; ops.remove = 0; ops.getAllKeys = 0; };
  return { storage, data, ops, reset };
}

const scope = (storage: MistakePracticeStorage) => ({ accountScope: SCOPE, studyTarget: TARGET, storage });

describe('дописывание журнала ошибок', () => {
  test('серия ответов: пишется только новое, getAllKeys — один раз, журнал не теряет событий', async () => {
    const { storage, data, ops, reset } = makeStorage();
    for (let i = 0; i < 150; i += 1) await appendMistakeEvent({ ...scope(storage), event: makeEvent(`a${i}`, i) });
    const journal = await loadMistakeEventJournal(scope(storage));
    expect(journal.events).toHaveLength(150);
    expect(ops.getAllKeys).toBe(1); // только самая первая запись (кэша ещё не было)

    reset();
    await appendMistakeEvent({ ...scope(storage), event: makeEvent('next', 1000) });
    expect(ops.getAllKeys).toBe(0);
    // кусок 0 (100 событий) не перезаписан: пишем хвостовой кусок + страницу + корень
    expect(ops.set).toBeLessThanOrEqual(3);
    // и ключей в хранилище ровно столько, сколько достижимо: корень + 1 страница + 2 куска
    expect(data.size).toBe(4);
    const after = await loadMistakeEventJournal(scope(storage));
    expect(after.events).toHaveLength(151);
  });

  test('хранимый граф побайтово совпадает с тем, что строил прежний алгоритм', async () => {
    const { storage, data } = makeStorage();
    const events = Array.from({ length: 230 }, (_, i) => makeEvent(`b${String(i).padStart(3, '0')}`, i, 30));
    for (const event of events) await appendMistakeEvent({ ...scope(storage), event });
    const expected = legacyChunk(journalOf(events));
    const storedChunks = [...data.entries()].filter(([k]) => k.includes('chunk')).map(([, v]) => v);
    expect(storedChunks.sort()).toEqual([...expected].sort());
  });

  test('повторное чтение с тем же корнем не ходит по страницам и кускам', async () => {
    const { storage, ops, reset } = makeStorage();
    for (let i = 0; i < 120; i += 1) await appendMistakeEvent({ ...scope(storage), event: makeEvent(`r${i}`, i) });
    reset();
    const journal = await loadMistakeEventJournal(scope(storage));
    expect(journal.events).toHaveLength(120);
    expect(ops.get).toBe(1); // только корень
  });

  test('повтор того же события ничего не пишет', async () => {
    const { storage, ops, reset } = makeStorage();
    await appendMistakeEvent({ ...scope(storage), event: makeEvent('dup', 5) });
    reset();
    const again = await appendMistakeEvent({ ...scope(storage), event: makeEvent('dup', 5) });
    expect(again.appended).toBe(false);
    expect(ops.set).toBe(0);
  });
});

describe('старые журналы и сброс кэша', () => {
  test('старый журнал v1 (один JSON) читается и дополняется без потерь', async () => {
    const { storage, data } = makeStorage();
    const old = journalOf(Array.from({ length: 5 }, (_, i) => makeEvent(`o${i}`, i)));
    data.set(mistakePracticeEventsKey(SCOPE, TARGET), canonicalJsonV1(old));
    const before = await loadMistakeEventJournal(scope(storage));
    expect(before.events.map((e) => e.eventId)).toEqual(['o0', 'o1', 'o2', 'o3', 'o4']);
    await appendMistakeEvent({ ...scope(storage), event: makeEvent('o5', 99) });
    const after = await loadMistakeEventJournal(scope(storage));
    expect(after.events.map((e) => e.eventId)).toEqual(['o0', 'o1', 'o2', 'o3', 'o4', 'o5']);
  });

  test('граф v2, записанный «чужим» процессом без кэша, читается; затем дописывание не теряет событий', async () => {
    const writer = makeStorage();
    for (let i = 0; i < 210; i += 1) await appendMistakeEvent({ ...scope(writer.storage), event: makeEvent(`w${String(i).padStart(3, '0')}`, i) });
    const reader = makeStorage();
    for (const [k, v] of writer.data) reader.data.set(k, v);
    const loaded = await loadMistakeEventJournal(scope(reader.storage));
    expect(loaded.events).toHaveLength(210);
    await appendMistakeEvent({ ...scope(reader.storage), event: makeEvent('w999', 5000) });
    expect((await loadMistakeEventJournal(scope(reader.storage))).events).toHaveLength(211);
  });

  test('корень стёрт (выход из аккаунта) — кэш сбрасывается, новая запись пишет граф заново', async () => {
    const { storage, data } = makeStorage();
    for (let i = 0; i < 130; i += 1) await appendMistakeEvent({ ...scope(storage), event: makeEvent(`x${i}`, i) });
    data.clear(); // как стирание данных аккаунта
    const empty = await loadMistakeEventJournal(scope(storage));
    expect(empty.events).toHaveLength(0);
    await appendMistakeEvent({ ...scope(storage), event: makeEvent('fresh', 1) });
    const again = await loadMistakeEventJournal(scope(storage));
    expect(again.events.map((e) => e.eventId)).toEqual(['fresh']);
  });

  test('корень подменили снаружи — берём подменённое, лишнего не теряем и не воскрешаем', async () => {
    const { storage, data } = makeStorage();
    for (let i = 0; i < 20; i += 1) await appendMistakeEvent({ ...scope(storage), event: makeEvent(`y${i}`, i) });
    const key = mistakePracticeEventsKey(SCOPE, TARGET);
    const snapshot = new Map(data);
    for (let i = 20; i < 30; i += 1) await appendMistakeEvent({ ...scope(storage), event: makeEvent(`y${i}`, i) });
    // откат корня и графа на прежнее состояние (как восстановление из облака)
    data.clear();
    for (const [k, v] of snapshot) data.set(k, v);
    expect(data.get(key)).toBe(snapshot.get(key));
    const loaded = await loadMistakeEventJournal(scope(storage));
    expect(loaded.events).toHaveLength(20);
    await appendMistakeEvent({ ...scope(storage), event: makeEvent('y-new', 500) });
    expect((await loadMistakeEventJournal(scope(storage))).events).toHaveLength(21);
  });

  test('повреждённый кусок по-прежнему даёт mistake_practice_events_corrupt', async () => {
    const { storage, data } = makeStorage();
    for (let i = 0; i < 5; i += 1) await appendMistakeEvent({ ...scope(storage), event: makeEvent(`z${i}`, i) });
    // свежий процесс без кэша читает испорченный граф
    const fresh = makeStorage();
    for (const [k, v] of data) fresh.data.set(k, k.includes('chunk') ? v.replace('z1', 'zZ') : v);
    await expect(loadMistakeEventJournal(scope(fresh.storage))).rejects.toThrow('mistake_practice_events_corrupt');
  });

  test('пакетная запись нескольких событий', async () => {
    const { storage } = makeStorage();
    const res = await mergeMistakeEvents({ ...scope(storage), events: Array.from({ length: 12 }, (_, i) => makeEvent(`m${i}`, i)) });
    expect(res.appendedCount).toBe(12);
    expect((await loadMistakeEventJournal(scope(storage))).events).toHaveLength(12);
  });
});
