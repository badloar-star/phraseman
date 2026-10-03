// зачем ([COLD-START-IO], store-release, слабый профиль, 03.10): счётчики ошибок на Главной читали журнал с диска 12–21 раз
// за первые 15 с. Теперь результат живёт HOME_COUNTS_TTL_MS и сбрасывается записью в журнал, сменой аккаунта и отказом.
const storageData = new Map<string, string>();
const getItemCalls: string[] = [];
let failNextRead = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      getItemCalls.push(key);
      if (failNextRead) {
        failNextRead = false;
        throw new Error('disk_read_failed');
      }
      return storageData.get(key) ?? null;
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
let mockStableId = 'owner-a';
let mockGeneration = 1;
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: 'active', generation: mockGeneration, stableId: mockStableId }),
  isCurrentAccountGeneration: (token: { generation: number; stableId: string }, scope: string) => token.generation === mockGeneration && scope === mockStableId,
  withAccountTransitionLock: <T,>(work: () => Promise<T>) => work(),
}));
jest.mock('../app/stable_id', () => ({ getStableId: async () => mockStableId }));
jest.mock('../app/mistake_practice_content_reconciliation', () => ({
  reconcileMutableMistakeContent: async (input: { journal: unknown }) => ({ unavailableCount: 0, journal: input.journal }),
}));

// eslint-disable-next-line import/first
import { getMistakePracticeHomeCounts, resetMistakePracticeHomeCountsCacheForTests } from '../app/mistake_practice_insights';
// eslint-disable-next-line import/first
import { appendMistakeEvent, resetMistakeJournalReadStatsForTests } from '../app/mistake_practice_store';

const makeEvent = (eventId: string, occurredAtMs: number) => ({
  eventId,
  mistakeId: `mistake:${eventId}`,
  cycleId: `mistake-cycle:v1:${eventId.padEnd(64, 'a').slice(0, 64)}`,
  type: 'captured' as const,
  occurredAtMs,
  studyTarget: 'en' as const,
  payload: { canonicalTarget: eventId },
});
const rootReads = (): number => getItemCalls.filter((k) => k.includes('mistake_practice')).length;

describe('кэш счётчиков ошибок на Главной', () => {
  beforeEach(() => {
    storageData.clear();
    getItemCalls.length = 0;
    failNextRead = false;
    mockStableId = 'owner-a';
    mockGeneration = 1;
    resetMistakePracticeHomeCountsCacheForTests();
    resetMistakeJournalReadStatsForTests();
  });

  test('20 последовательных вызовов в пределах срока → одно чтение журнала, одинаковый результат', async () => {
    const first = await getMistakePracticeHomeCounts('en');
    for (let i = 0; i < 19; i += 1) expect(await getMistakePracticeHomeCounts('en')).toBe(first);
    expect(rootReads()).toBe(1);
  });

  test('запись в журнал сбрасывает кэш: следующий вызов читает заново и видит новую ошибку', async () => {
    const before = await getMistakePracticeHomeCounts('en');
    expect(before.active).toBe(0);
    await appendMistakeEvent({ accountScope: 'owner-a', studyTarget: 'en', event: makeEvent('e1', Date.now() - 1000) });
    const readsAfterWrite = rootReads();
    const after = await getMistakePracticeHomeCounts('en');
    expect(after.active).toBe(1);
    expect(rootReads()).toBeGreaterThan(readsAfterWrite);
  });

  test('смена аккаунта или поколения не отдаёт чужой кэш', async () => {
    await getMistakePracticeHomeCounts('en');
    mockStableId = 'owner-b';
    mockGeneration = 2;
    await getMistakePracticeHomeCounts('en');
    expect(rootReads()).toBe(2);
  });

  test('языки не смешиваются', async () => {
    await getMistakePracticeHomeCounts('en');
    await getMistakePracticeHomeCounts('fr');
    expect(rootReads()).toBe(2);
  });

  test('явный nowMs кэш обходит (расчёт «на момент»)', async () => {
    await getMistakePracticeHomeCounts('en');
    await getMistakePracticeHomeCounts('en', Date.now() + 60_000);
    expect(rootReads()).toBe(2);
  });

  test('отказ чтения не кэшируется: следующий вызов пробует заново', async () => {
    failNextRead = true;
    await expect(getMistakePracticeHomeCounts('en')).rejects.toThrow('disk_read_failed');
    const retry = await getMistakePracticeHomeCounts('en');
    expect(retry).toEqual({ active: 0, ready: 0 });
    expect(rootReads()).toBe(2);
  });
});
