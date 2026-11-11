import { act, renderHook } from '@testing-library/react-native';

type Token = Readonly<{ generation: number; stableId: string | null; phase: 'active' | 'transitioning' }>;

const tokenA: Token = Object.freeze({ generation: 1, stableId: 'stable-a', phase: 'active' });
let mockCurrentToken: Token = tokenA;
const mockGenerationListeners = new Set<(token: Token) => void>();
const mockResolve = jest.fn<Promise<Record<string, unknown>>, [Record<string, unknown>]>();
const mockMark = jest.fn(async () => undefined);
const mockAvailability = jest.fn(async () => ({ available: true }));
const mockSchedule = jest.fn(async (..._args: unknown[]) => undefined);

type HookInput = Readonly<{ uiLang: string; studyTarget: string; tabEnabled: boolean; active: boolean }>;
const INPUT: HookInput = { uiLang: 'ru', studyTarget: 'en', tabEnabled: true, active: true };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function switchAccount(stableId: string): void {
  mockCurrentToken = Object.freeze({ generation: mockCurrentToken.generation + 1, stableId, phase: 'active' });
  for (const listener of mockGenerationListeners) listener(mockCurrentToken);
}

function weekDecision(
  token: Token,
  lang: 'en' | 'es' = 'en',
  weekId = '2026-W44',
): Record<string, unknown> {
  const result = { ...resultA, weekId, lang };
  return { show: true, uid: token.stableId, lang, weekId, outcome: 'demoted', result, accountToken: token };
}

async function flushHook(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function resolveHook<T>(pending: ReturnType<typeof deferred<T>>, value: T): Promise<void> {
  await act(async () => {
    pending.resolve(value);
    await pending.promise;
    await Promise.resolve();
  });
}

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockCurrentToken,
  isCurrentAccountGeneration: (token: Token, expected?: string | null) => (
    token.generation === mockCurrentToken.generation
    && token.stableId === mockCurrentToken.stableId
    && token.phase === 'active'
    && mockCurrentToken.phase === 'active'
    && (expected === undefined || expected === mockCurrentToken.stableId)
  ),
  subscribeAccountGeneration: (listener: (token: Token) => void) => {
    mockGenerationListeners.add(listener);
    return { remove: () => mockGenerationListeners.delete(listener) };
  },
}));
jest.mock('../app/first_frame_deferred_warmups', () => ({
  runAfterHomeFirstFrame: (_key: string, task: () => Promise<unknown>) => {
    void task();
    return () => undefined;
  },
}));
jest.mock('../components/OverlayArbiter', () => ({ useOverlayVisible: (_key: string, requested: boolean) => requested }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/spire/spire_week_moment_gate', () => ({
  resolveSpireWeekMoment: (input: Record<string, unknown>) => mockResolve(input),
  markSpireWeekMomentShown: (decision: unknown) => mockMark(decision),
}));
jest.mock('../app/spire/spire_week_remind', () => ({
  spireWeekRemindAvailability: () => mockAvailability(),
  scheduleSpireWeekRemindWithFeedback: (...args: unknown[]) => mockSchedule(...args),
}));

import { useSpireWeekMoment } from '../app/spire/use_spire_week_moment';

const resultA = {
  weekId: '2026-W44', lang: 'en', steps: 40, roomRank: 3, roomTotal: 30,
  promoted: false, demoted: true, prevTier: 2, newTier: 1,
  placeCoins: 0, promotionCoins: 0,
};

describe('week-result hook account isolation', () => {
  beforeEach(() => {
    mockCurrentToken = tokenA;
    mockGenerationListeners.clear();
    mockResolve.mockReset();
    mockMark.mockClear();
    mockAvailability.mockClear();
    mockSchedule.mockClear();
  });

  it('drops delayed A after A→B and performs no render, shown, story-triggering mark, or reminder side effect', async () => {
    const pending = deferred<Record<string, unknown>>();
    mockResolve.mockResolvedValue({ show: false, reason: 'no_result' });
    mockResolve.mockReturnValueOnce(pending.promise);
    const hook = await renderHook(() => useSpireWeekMoment({ uiLang: 'ru', studyTarget: 'en', tabEnabled: true, active: true }));

    await act(async () => {
      switchAccount('stable-b');
      pending.resolve({
        show: true,
        uid: 'stable-a',
        lang: 'en',
        weekId: resultA.weekId,
        outcome: 'demoted',
        result: resultA,
        accountToken: tokenA,
      });
      await pending.promise;
      await Promise.resolve();
    });

    expect(hook.result.current.decision).toBeNull();
    expect(hook.result.current.visible).toBe(false);
    expect(mockMark).not.toHaveBeenCalled();
    expect(mockAvailability).not.toHaveBeenCalled();

    await act(async () => { hook.result.current.remind.schedule(); });
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('renders a legitimate B decision after A→B and does not let late A replace it', async () => {
    const pendingA = deferred<Record<string, unknown>>();
    const pendingB = deferred<Record<string, unknown>>();
    mockResolve.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise);
    const hook = await renderHook(() => useSpireWeekMoment(INPUT));

    await act(async () => {
      switchAccount('stable-b');
      await Promise.resolve();
    });
    const tokenB = mockCurrentToken;
    await resolveHook(pendingB, weekDecision(tokenB, 'en', '2026-W45'));

    expect(hook.result.current.decision).toMatchObject({ uid: 'stable-b', weekId: '2026-W45' });
    expect(hook.result.current.visible).toBe(true);
    expect(mockMark).toHaveBeenLastCalledWith(expect.objectContaining({ uid: 'stable-b', accountToken: tokenB }));

    await resolveHook(pendingA, weekDecision(tokenA));
    expect(hook.result.current.decision).toMatchObject({ uid: 'stable-b', weekId: '2026-W45' });
  });

  it('clears an already-visible A synchronously on the generation event without waiting for B resolver', async () => {
    const pendingB = deferred<Record<string, unknown>>();
    mockResolve.mockResolvedValueOnce(weekDecision(tokenA)).mockReturnValueOnce(pendingB.promise);
    const hook = await renderHook(() => useSpireWeekMoment(INPUT));
    await flushHook();
    expect(hook.result.current.decision).toMatchObject({ uid: 'stable-a' });
    expect(hook.result.current.visible).toBe(true);

    await act(async () => {
      switchAccount('stable-b');
      await Promise.resolve();
    });

    expect(hook.result.current.decision).toBeNull();
    expect(hook.result.current.visible).toBe(false);
    expect(mockResolve).toHaveBeenCalledTimes(2);
  });

  it('rejects old-generation A after A→B→A while accepting the new A generation', async () => {
    const oldA = deferred<Record<string, unknown>>();
    const pendingB = deferred<Record<string, unknown>>();
    const newA = deferred<Record<string, unknown>>();
    mockResolve.mockReturnValueOnce(oldA.promise).mockReturnValueOnce(pendingB.promise).mockReturnValueOnce(newA.promise);
    const hook = await renderHook(() => useSpireWeekMoment(INPUT));

    await act(async () => { switchAccount('stable-b'); await Promise.resolve(); });
    await act(async () => { switchAccount('stable-a'); await Promise.resolve(); });
    const newTokenA = mockCurrentToken;

    await resolveHook(oldA, weekDecision(tokenA));
    expect(hook.result.current.decision).toBeNull();

    await resolveHook(newA, weekDecision(newTokenA, 'en', '2026-W45'));
    expect(hook.result.current.decision).toMatchObject({ uid: 'stable-a', weekId: '2026-W45', accountToken: newTokenA });
    expect(hook.result.current.visible).toBe(true);
  });

  it('clears an already-visible old study target immediately when studyTarget changes', async () => {
    const pendingEs = deferred<Record<string, unknown>>();
    mockResolve.mockResolvedValueOnce(weekDecision(tokenA, 'en')).mockReturnValueOnce(pendingEs.promise);
    const hook = await renderHook((props: HookInput) => useSpireWeekMoment(props), { initialProps: INPUT });
    await flushHook();
    expect(hook.result.current.decision).toMatchObject({ lang: 'en' });

    await act(async () => {
      hook.rerender({ ...INPUT, studyTarget: 'es' });
      await Promise.resolve();
    });

    expect(hook.result.current.decision).toBeNull();
    expect(hook.result.current.visible).toBe(false);
  });

  it('rejects a late old-target decision and allows the new study target to succeed', async () => {
    const pendingEn = deferred<Record<string, unknown>>();
    const pendingEs = deferred<Record<string, unknown>>();
    mockResolve.mockReturnValueOnce(pendingEn.promise).mockReturnValueOnce(pendingEs.promise);
    const hook = await renderHook((props: HookInput) => useSpireWeekMoment(props), { initialProps: INPUT });

    await act(async () => {
      hook.rerender({ ...INPUT, studyTarget: 'es' });
      await Promise.resolve();
    });
    await resolveHook(pendingEn, weekDecision(tokenA, 'en'));
    expect(hook.result.current.decision).toBeNull();

    await resolveHook(pendingEs, weekDecision(tokenA, 'es', '2026-W45'));
    expect(hook.result.current.decision).toMatchObject({ lang: 'es', weekId: '2026-W45' });
    expect(hook.result.current.visible).toBe(true);
  });

  it('ignores late reminder availability after the owner changes', async () => {
    const availability = deferred<{ available: boolean }>();
    const pendingB = deferred<Record<string, unknown>>();
    mockAvailability.mockReturnValueOnce(availability.promise);
    mockResolve.mockResolvedValueOnce(weekDecision(tokenA)).mockReturnValueOnce(pendingB.promise);
    const hook = await renderHook(() => useSpireWeekMoment(INPUT));
    await flushHook();
    expect(mockAvailability).toHaveBeenCalledTimes(1);

    await act(async () => { switchAccount('stable-b'); await Promise.resolve(); });
    await resolveHook(availability, { available: true });

    expect(hook.result.current.remind.available).toBe(false);
    expect(hook.result.current.decision).toBeNull();
  });

  it('retained schedule callback from stale A performs zero schedule side effect after owner change', async () => {
    const pendingB = deferred<Record<string, unknown>>();
    mockResolve.mockResolvedValueOnce(weekDecision(tokenA)).mockReturnValueOnce(pendingB.promise);
    const hook = await renderHook(() => useSpireWeekMoment(INPUT));
    await flushHook();
    const staleSchedule = hook.result.current.remind.schedule;

    await act(async () => { switchAccount('stable-b'); await Promise.resolve(); });
    await act(async () => { staleSchedule(); await Promise.resolve(); });

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('current demoted decision exposes availability and schedules exactly once on a double tap', async () => {
    mockAvailability.mockResolvedValueOnce({ available: true });
    mockResolve.mockResolvedValueOnce(weekDecision(tokenA));
    const hook = await renderHook(() => useSpireWeekMoment(INPUT));
    await flushHook();

    expect(hook.result.current.decision).toMatchObject({ uid: 'stable-a', outcome: 'demoted' });
    expect(hook.result.current.remind.available).toBe(true);
    const schedule = hook.result.current.remind.schedule;
    await act(async () => {
      schedule();
      schedule();
      await Promise.resolve();
    });

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith('ru', expect.any(Number), tokenA);
    expect(hook.result.current.decision).toBeNull();
    expect(hook.result.current.visible).toBe(false);
  });
});
