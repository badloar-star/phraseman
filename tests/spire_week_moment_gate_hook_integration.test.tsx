import { act, renderHook } from '@testing-library/react-native';

type Token = Readonly<{ generation: number; stableId: string | null; phase: 'active' }>;

const tokenA: Token = Object.freeze({ generation: 1, stableId: 'stable-a', phase: 'active' });
const tokenB: Token = Object.freeze({ generation: 2, stableId: 'stable-b', phase: 'active' });
let mockCurrentToken: Token = tokenA;
let mockSwitchDuringSubscribe = false;
const mockListeners = new Set<(token: Token) => void>();
const mockLoad = jest.fn();
const mockStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStore[key] ?? null,
    setItem: async (key: string, value: string) => { mockStore[key] = value; },
  },
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockCurrentToken,
  isCurrentAccountGeneration: (token: Token, expected?: string | null) => (
    token.generation === mockCurrentToken.generation
    && token.stableId === mockCurrentToken.stableId
    && (expected === undefined || expected === mockCurrentToken.stableId)
  ),
  subscribeAccountGeneration: (listener: (token: Token) => void) => {
    if (mockSwitchDuringSubscribe) mockCurrentToken = tokenB;
    mockListeners.add(listener);
    return { remove: () => mockListeners.delete(listener) };
  },
}));
jest.mock('../app/first_frame_deferred_warmups', () => ({
  runAfterHomeFirstFrame: (_key: string, task: () => Promise<unknown>) => { void task(); return () => undefined; },
}));
jest.mock('../components/OverlayArbiter', () => ({ useOverlayVisible: (_key: string, requested: boolean) => requested }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: async () => JSON.stringify({ bools: { moments_v3: true } }) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: async () => mockCurrentToken.stableId }));
jest.mock('../app/spire_config_client', () => ({ warmSpireConfigFromDisk: async () => 'disk', peekSpireConfig: () => ({ enabled: true }) }));
jest.mock('../app/spire/spire_live_gate', () => ({ spireOpenLiveGate: () => ({ open: true }) }));
jest.mock('../app/spire/spire_ui_lang_gate', () => ({ spireUiLangDecision: () => ({ allowed: true, reason: 'test' }) }));
jest.mock('../components/spire/spire_home_week', () => ({ asSpireLang: (value: string) => value }));
jest.mock('../app/dev_spire_tier', () => ({ getDevSpireWeekResultOverride: () => null }));
jest.mock('../modules/story_events/story_event_sources', () => ({ recordSpireWeekStory: jest.fn() }));
jest.mock('../app/spire/spire_week_result_client', () => ({
  spirePreviousWeekKey: () => '2026-W44',
  spireLoadWeekResult: (...args: unknown[]) => mockLoad(...args),
}));
jest.mock('../app/spire/spire_week_remind', () => ({
  spireWeekRemindAvailability: jest.fn(async () => ({ available: true })),
  scheduleSpireWeekRemindWithFeedback: jest.fn(async () => true),
}));

import { __resetSpireWeekMomentGateForTests } from '../app/spire/spire_week_moment_gate';
import { useSpireWeekMoment } from '../app/spire/use_spire_week_moment';

const resultFor = (stableId: string) => ({
  weekId: '2026-W44', lang: 'en', steps: 5, roomRank: 2, roomTotal: 20,
  promoted: false, demoted: true, prevTier: 2, newTier: 1,
  placeCoins: 0, promotionCoins: 0, owner: stableId,
});

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('real week-moment hook + resolver integration', () => {
  beforeEach(() => {
    mockCurrentToken = tokenA;
    mockSwitchDuringSubscribe = false;
    mockListeners.clear();
    mockLoad.mockReset();
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
    __resetSpireWeekMomentGateForTests();
  });

  it('reconciles B if the generation changes between render snapshot and subscription, then renders real resolver B', async () => {
    mockSwitchDuringSubscribe = true;
    mockLoad.mockImplementation(async (_gate, input: { uid: string }) => resultFor(input.uid));

    const hook = await renderHook(() => useSpireWeekMoment({ uiLang: 'ru', studyTarget: 'en', tabEnabled: true, active: true }));
    await flush();

    expect(mockCurrentToken).toBe(tokenB);
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad.mock.calls[0]?.[1]).toEqual({ uid: 'stable-b', lang: 'en' });
    expect(hook.result.current.decision).toMatchObject({ uid: 'stable-b', accountToken: tokenB, result: { owner: 'stable-b' } });
    expect(hook.result.current.visible).toBe(true);
    await act(async () => { hook.unmount(); await Promise.resolve(); });
  });

  it('ignores a fresh token object for the same generation instead of cancelling and resolving again', async () => {
    mockLoad.mockResolvedValue(resultFor('stable-a'));
    const hook = await renderHook(() => useSpireWeekMoment({ uiLang: 'ru', studyTarget: 'en', tabEnabled: true, active: true }));
    await flush();
    expect(hook.result.current.visible).toBe(true);
    expect(mockLoad).toHaveBeenCalledTimes(1);

    const sameGeneration = Object.freeze({ ...tokenA });
    await act(async () => { for (const listener of mockListeners) listener(sameGeneration); await Promise.resolve(); });
    await flush();

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(hook.result.current.visible).toBe(true);
    await act(async () => { hook.unmount(); await Promise.resolve(); });
  });

  it('removes the generation subscription on teardown so a later B event starts no resolver', async () => {
    mockLoad.mockResolvedValue(resultFor('stable-a'));
    const hook = await renderHook(() => useSpireWeekMoment({ uiLang: 'ru', studyTarget: 'en', tabEnabled: true, active: true }));
    await flush();
    expect(mockLoad).toHaveBeenCalledTimes(1);

    const subscribed = [...mockListeners][0];
    expect(subscribed).toBeDefined();
    await act(async () => { hook.unmount(); await Promise.resolve(); });
    expect(mockListeners.has(subscribed!)).toBe(false);
    mockCurrentToken = tokenB;
    for (const listener of mockListeners) listener(tokenB);
    await flush();

    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
