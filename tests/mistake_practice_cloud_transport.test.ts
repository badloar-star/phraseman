const mockLoadJournal = jest.fn();
const mockMergeEvents = jest.fn();
let mockCurrent = true;
const mockToken = Object.freeze({ generation: 1, stableId: 'owner-a', phase: 'active' });

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
import { restoreMistakePracticeEvents, uploadMistakePracticeEvents } from '../app/mistake_practice_cloud_transport';

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

  test('replays every local event so a late backdated event cannot be skipped', async () => {
    const first = makeEvent('first', 100);
    const late = makeEvent('late', 50);
    mockLoadJournal
      .mockResolvedValueOnce({ version: 1, accountScope: 'owner-a', studyTarget: 'en', events: [first] })
      .mockResolvedValueOnce({ version: 1, accountScope: 'owner-a', studyTarget: 'en', events: [first, late] });
    const invoke = jest.fn(async (request: any) => ({ ok: true as const, appended: request.events.length }));
    await uploadMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke });
    await uploadMistakePracticeEvents({ accountScope: 'owner-a', studyTarget: 'en' }, { invoke });
    expect(invoke.mock.calls[1][0].events).toEqual([late, first]);
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
});
