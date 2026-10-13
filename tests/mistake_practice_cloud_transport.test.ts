const mockLoadJournal = jest.fn();
const mockMergeEvents = jest.fn();
let mockCurrent = true;
let mockToken: Readonly<{ generation: number; stableId: string; phase: string }> = Object.freeze({ generation: 1, stableId: 'owner-a', phase: 'active' });

jest.mock('../app/mistake_practice_store', () => ({
  loadMistakeEventJournal: (...args: unknown[]) => mockLoadJournal(...args),
  mergeMistakeEvents: (...args: unknown[]) => mockMergeEvents(...args),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockToken,
  isCurrentAccountGeneration: () => mockCurrent,
}));

// Jest mocks must be installed before this runtime import.
// eslint-disable-next-line import/first
import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line import/first
import {
  resetMistakePracticeRestoreThrottleForTests,
  restoreMistakePracticeEvents,
  uploadMistakePracticeEvents,
} from '../app/mistake_practice_cloud_transport';

const makeEvent = (eventId: string, occurredAtMs: number) => ({
  eventId,
  mistakeId: `mistake:${eventId}`,
  cycleId: `cycle:${eventId}`,
  type: 'captured' as const,
  occurredAtMs,
  studyTarget: 'en' as const,
  payload: { canonicalTarget: eventId },
});

describe('mistake practice cloud owner fence', () => {
  beforeEach(() => {
    mockCurrent = true;
    mockToken = Object.freeze({ generation: 1, stableId: 'owner-a', phase: 'active' });
    resetMistakePracticeRestoreThrottleForTests();
    (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
    mockLoadJournal.mockReset();
    mockMergeEvents.mockReset();
    mockMergeEvents.mockResolvedValue({ appendedCount: 0, journal: { events: [] } });
  });

  test('rejects a deferred A upload after an account generation switch', async () => {
    mockLoadJournal.mockResolvedValue({ version: 1, accountScope: 'owner-a', studyTarget: 'en', events: [makeEvent('a', 1)] });
    let resolveInvoke!: (value: { ok: true; appended: number }) => void;
    const invoke = jest.fn(() => new Promise<{ ok: true; appended: number }>((resolve) => { resolveInvoke = resolve; }));
    const pending = uploadMistakePracticeEvents(
      { accountScope: 'owner-a', studyTarget: 'en' },
      { invoke },
    );
    await Promise.resolve();
    mockCurrent = false;
    resolveInvoke({ ok: true, appended: 1 });
    await expect(pending).rejects.toThrow('mistake_practice_cloud_owner_stale');
    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ expectedStableUid: 'owner-a' }));
  });

  // §CORE-0162 (пакет B): отбор по id, а не по времени — событие «задним числом» не пропадает; первая выгрузка
  // в запуске полная (лечит потерю на сервере), дальше — только неподтверждённое.
  test('a late backdated event cannot be skipped; only unconfirmed events go after the first full replay', async () => {
    const first = makeEvent('first', 100);
    const late = makeEvent('late', 50);
    const journalWith = (events: unknown[]) => ({ version: 1, accountScope: 'owner-a', studyTarget: 'en', events });
    mockLoadJournal
      .mockResolvedValueOnce(journalWith([first]))
      .mockResolvedValueOnce(journalWith([first, late]))
      .mockResolvedValueOnce(journalWith([first, late]))
      .mockResolvedValueOnce(journalWith([first, late]));
    const invoke = jest.fn(async (request: any) => ({ ok: true as const, appended: request.events.length }));
    await uploadMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke });
    await uploadMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke });
    expect(invoke.mock.calls[0][0].events).toEqual([first]);
    expect(invoke.mock.calls[1][0].events).toEqual([late]);

    await expect(uploadMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke })).resolves.toBe(0);
    expect(invoke).toHaveBeenCalledTimes(2);

    resetMistakePracticeRestoreThrottleForTests(); // новый запуск
    await uploadMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke });
    expect(invoke.mock.calls[2][0].events).toEqual([late, first]);
  });

  test('an account switch replays the full journal again', async () => {
    const first = makeEvent('first', 100);
    mockLoadJournal.mockResolvedValue({ version: 1, accountScope: 'owner-a', studyTarget: 'en', events: [first] });
    const invoke = jest.fn(async (request: any) => ({ ok: true as const, appended: request.events.length }));
    await uploadMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke });
    mockToken = Object.freeze({ generation: 2, stableId: 'owner-a', phase: 'active' });
    await uploadMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1][0].events).toEqual([first]);
  });

  test('continues deterministic pagination across a mixed-target empty page', async () => {
    const cursor = `mp_${'a'.repeat(64)}`;
    const remote = makeEvent('remote', 7);
    const invoke = jest.fn()
      .mockResolvedValueOnce({ ok: true, events: [], cursor })
      .mockResolvedValueOnce({ ok: true, events: [remote], cursor: null });
    mockMergeEvents.mockResolvedValue({ appendedCount: 1 });
    await expect(restoreMistakePracticeEvents(
      { accountScope: 'owner-a', studyTarget: 'en' }, { invoke },
    )).resolves.toBe(1);
    expect(invoke).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor }));
    expect(mockMergeEvents).toHaveBeenCalledTimes(1);
    expect(mockMergeEvents).toHaveBeenCalledWith(expect.objectContaining({ events: [remote] }));
  });

  test('fails closed on invalid or repeated server cursors', async () => {
    await expect(restoreMistakePracticeEvents(
      { accountScope: 'owner-a', studyTarget: 'en' },
      { invoke: async () => ({ ok: true, events: [], cursor: 'not-a-cursor' }) },
    )).rejects.toThrow('mistake_practice_cloud_cursor_invalid');
    const cursor = `mp_${'b'.repeat(64)}`;
    let calls = 0;
    await expect(restoreMistakePracticeEvents(
      { accountScope: 'owner-a', studyTarget: 'en' },
      { invoke: async () => {
        calls += 1;
        if (calls > 2) throw new Error('unexpected_third_page');
        return { ok: true, events: [], cursor };
      } },
    )).rejects.toThrow('mistake_practice_cloud_cursor_repeated');
  });

  // зачем (аудит стоимости 11.10): восстановление листает весь облачный журнал ошибок для каждого из 5 языков,
  // а запускается и на холодном старте, и при каждом возвращении в приложение после 5 минут. В пределах одного
  // поколения аккаунта повтор раньше 6 часов не ходит в сеть; смена аккаунта (поколения) — всегда идёт.
  describe('restore throttle', () => {
    const okInvoke = () => jest.fn(async () => ({ ok: true as const, events: [], cursor: null }));

    test('a second restore of the same account and language within 6 hours does not call the server', async () => {
      let now = 1_000_000;
      const invoke = okInvoke();
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => now });
      now += 5 * 60 * 60 * 1000;
      await expect(restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => now })).resolves.toBe(0);
      expect(invoke).toHaveBeenCalledTimes(1);
      now += 2 * 60 * 60 * 1000;
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => now });
      expect(invoke).toHaveBeenCalledTimes(2);
    });

    test('another language, an account switch or a failed restore always goes to the server', async () => {
      const invoke = okInvoke();
      const nowMs = () => 5_000_000;
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs });
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'es' }, { invoke, nowMs });
      expect(invoke).toHaveBeenCalledTimes(2);

      mockToken = Object.freeze({ generation: 2, stableId: 'owner-a', phase: 'active' });
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs });
      expect(invoke).toHaveBeenCalledTimes(3);

      const failing = jest.fn(async () => ({ ok: true as const, events: [], cursor: 'bad' }));
      await expect(restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'fr' }, { invoke: failing, nowMs })).rejects.toThrow();
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'fr' }, { invoke, nowMs });
      expect(invoke).toHaveBeenCalledTimes(4);
    });

    // зачем (координатор 13.10, смета Firebase №4): отметка на диске переживает холодный старт — ~300 серверных чтений в день.
    test('a cold start within 6 hours skips the server walk when the local journal is intact', async () => {
      const invoke = okInvoke();
      mockMergeEvents.mockResolvedValue({ appendedCount: 2, journal: { events: [makeEvent('a', 1), makeEvent('b', 2)] } });
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => 1_000_000 });
      expect(invoke).toHaveBeenCalledTimes(1);
      resetMistakePracticeRestoreThrottleForTests(); // холодный старт: память пуста, диск остался
      mockLoadJournal.mockResolvedValue({ events: [makeEvent('a', 1), makeEvent('b', 2)] });
      await expect(restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => 1_000_000 + 60 * 60 * 1000 })).resolves.toBe(0);
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    test('a wiped local journal, a stale mark or a clock moved back always go to the server', async () => {
      const invoke = okInvoke();
      mockMergeEvents.mockResolvedValue({ appendedCount: 2, journal: { events: [makeEvent('a', 1), makeEvent('b', 2)] } });
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => 10_000_000 });
      resetMistakePracticeRestoreThrottleForTests();
      mockLoadJournal.mockResolvedValue({ events: [] }); // журнал стёрт сменой аккаунта
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => 10_000_000 + 1000 });
      expect(invoke).toHaveBeenCalledTimes(2);
      resetMistakePracticeRestoreThrottleForTests();
      mockLoadJournal.mockResolvedValue({ events: [makeEvent('a', 1), makeEvent('b', 2)] });
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => 10_000_000 + 7 * 60 * 60 * 1000 });
      expect(invoke).toHaveBeenCalledTimes(3);
      resetMistakePracticeRestoreThrottleForTests();
      await restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke, nowMs: () => 5_000_000 });
      expect(invoke).toHaveBeenCalledTimes(4);
    });

    test('concurrent restores of the same account and language share one server walk', async () => {
      const invoke = okInvoke();
      await Promise.all([
        restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'de' }, { invoke }),
        restoreMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'de' }, { invoke }),
      ]);
      expect(invoke).toHaveBeenCalledTimes(1);
    });
  });
});
