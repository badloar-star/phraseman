// зачем ([COLD-START-IO], store-release, слабый профиль, 03.10; координатор: «mistake_practice_v# 24 чтения — бери»):
// одновременные чтения журнала ошибок склеиваются в одно, а запись сбрасывает склейку — читатель после записи
// никогда не получает чтение, начатое до неё. Содержимое журнала для вызывающих не меняется.
const storageData = new Map<string, string>();
const getItemCalls: string[] = [];
let getItemGate: Promise<void> | null = null;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      getItemCalls.push(key);
      // значение фиксируется В МОМЕНТ вызова (как у настоящего хранилища: чтение, начатое до записи, видит старое)
      const snapshot = storageData.get(key) ?? null;
      if (getItemGate) {
        const gate = getItemGate;
        getItemGate = null;
        await gate;
      }
      return snapshot;
    }),
    setItem: jest.fn(async (key: string, value: string) => { storageData.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { storageData.delete(key); }),
    getAllKeys: jest.fn(async () => [...storageData.keys()]),
  },
}));
jest.mock('../app/phone_state_practice_bridge', () => ({
  commitPhoneStatePracticeFact: jest.fn(async () => undefined),
  mergePhoneStatePracticeFacts: jest.fn(async (_kind: string, facts: Record<string, unknown>) => facts),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: 'uninitialized' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: <T,>(work: () => Promise<T>) => work(),
}));

// eslint-disable-next-line import/first
import {
  appendMistakeEvent,
  loadMistakeEventJournal,
  mistakeJournalReadStats,
  resetMistakeJournalReadStatsForTests,
} from '../app/mistake_practice_store';

const scope = { accountScope: 'owner-a', studyTarget: 'en' as const };
const makeEvent = (eventId: string, occurredAtMs: number) => ({
  eventId,
  mistakeId: `mistake:${eventId}`,
  cycleId: `cycle:${eventId}`,
  type: 'captured' as const,
  occurredAtMs,
  studyTarget: 'en' as const,
  payload: { canonicalTarget: eventId },
});

describe('склейка чтений журнала ошибок', () => {
  beforeEach(() => {
    storageData.clear();
    getItemCalls.length = 0;
    getItemGate = null;
    resetMistakeJournalReadStatsForTests();
  });

  test('24 одновременных чтения → одно обращение к хранилищу, у всех один и тот же журнал', async () => {
    const results = await Promise.all(Array.from({ length: 24 }, () => loadMistakeEventJournal(scope)));
    expect(getItemCalls).toHaveLength(1);
    expect(mistakeJournalReadStats()).toEqual({ started: 1, shared: 23 });
    for (const r of results) expect(r).toBe(results[0]);
  });

  test('после завершения чтения следующее начинается заново (кэша между запусками нет)', async () => {
    await loadMistakeEventJournal(scope);
    await loadMistakeEventJournal(scope);
    expect(mistakeJournalReadStats()).toEqual({ started: 2, shared: 0 });
    expect(getItemCalls).toHaveLength(2);
  });

  test('читатель после записи не получает чтение, начатое до неё', async () => {
    let release!: () => void;
    getItemGate = new Promise<void>((resolve) => { release = resolve; });
    const before = loadMistakeEventJournal(scope); // зависает на первом getItem
    const write = await appendMistakeEvent({ ...scope, event: makeEvent('e1', 100) });
    expect(write.appended).toBe(true);
    const after = loadMistakeEventJournal(scope);
    release();
    const [oldJournal, newJournal] = await Promise.all([before, after]);
    expect(oldJournal.events).toHaveLength(0);
    expect(newJournal.events.map((e) => e.eventId)).toEqual(['e1']);
    expect(newJournal).not.toBe(oldJournal);
  });

  test('разные аккаунты и языки не склеиваются', async () => {
    await Promise.all([
      loadMistakeEventJournal(scope),
      loadMistakeEventJournal({ accountScope: 'owner-b', studyTarget: 'en' }),
      loadMistakeEventJournal({ accountScope: 'owner-a', studyTarget: 'fr' }),
    ]);
    expect(mistakeJournalReadStats()).toEqual({ started: 3, shared: 0 });
  });

  test('подставленное хранилище (тесты, миграции) читается как раньше — без склейки', async () => {
    const storage = { getItem: jest.fn(async () => null), setItem: jest.fn(), removeItem: jest.fn() };
    await Promise.all([
      loadMistakeEventJournal({ ...scope, storage }),
      loadMistakeEventJournal({ ...scope, storage }),
    ]);
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(mistakeJournalReadStats()).toEqual({ started: 0, shared: 0 });
  });
});
