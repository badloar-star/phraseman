import { act, cleanup, renderHook } from '@testing-library/react-native';

const SESSION_ID = 'vws1a2b3c4d5e6';
const mockStartVideoWatchRuneSession = jest.fn(async (_token: unknown, _stableId: string) => ({
  ok: true as const,
  sessionId: SESSION_ID,
  grantedToday: 0,
  carryMs: 0,
}));
const mockClaimVideoWatchRuneSession = jest.fn(async (_token: unknown, _stableId: string, _sessionId: string) => ({
  ok: true as const,
  granted: 6,
  grantedToday: 6,
  reason: 'granted',
}));

jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({
    isUnlimited: true,
    energyReady: true,
    reload: jest.fn(async () => undefined),
  }),
}));

jest.mock('../app/energy_video_watch_credit', () => ({
  creditVideoWatchSegment: jest.fn(async () => ({ applied: false, reason: 'not_needed' })),
}));

jest.mock('../app/video_watch_runes_client', () => ({
  VIDEO_WATCH_RUNES_PER_MINUTE: 3,
  VIDEO_WATCH_RUNES_DAILY_CAP: 600,
  startVideoWatchRuneSession: (token: unknown, stableId: string) => mockStartVideoWatchRuneSession(token, stableId),
  claimVideoWatchRuneSession: (token: unknown, stableId: string, sessionId: string) => mockClaimVideoWatchRuneSession(token, stableId, sessionId),
}));

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: 'stable-user-1', generation: 7 }),
}));

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn() },
}));

// eslint-disable-next-line import/first
import { useVideoWatchEnergyBoost } from '../hooks/use_video_watch_energy_boost';

async function watchAcrossBoundary(startIso: string) {
  jest.setSystemTime(new Date(startIso));
  const hook = await renderHook(() => useVideoWatchEnergyBoost());

  await act(async () => {
    hook.result.current.setPlaying(true);
    await Promise.resolve();
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });
  const afterFirstMinute = hook.result.current.runesEarned;
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });
  const afterSecondMinute = hook.result.current.runesEarned;

  await act(async () => {
    hook.result.current.setPlaying(false);
    await Promise.resolve();
    await Promise.resolve();
  });

  return { afterFirstMinute, afterSecondMinute };
}

describe('video watch optimistic Super Sunday batch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockStartVideoWatchRuneSession.mockClear();
    mockClaimVideoWatchRuneSession.mockClear();
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it('reprices the whole base batch from ×1 to ×2 at Sunday start and claims the server session', async () => {
    const result = await watchAcrossBoundary('2026-09-05T23:58:00.000Z');

    expect(result).toEqual({ afterFirstMinute: 3, afterSecondMinute: 12 });
    expect(mockStartVideoWatchRuneSession).toHaveBeenCalledWith({ stableId: 'stable-user-1', generation: 7 }, 'stable-user-1');
    expect(mockClaimVideoWatchRuneSession).toHaveBeenCalledWith(
      { stableId: 'stable-user-1', generation: 7 },
      'stable-user-1',
      SESSION_ID,
    );
  });

  it('reprices the whole base batch from ×2 to ×1 at Monday start and claims the same session', async () => {
    const result = await watchAcrossBoundary('2026-09-06T23:58:00.000Z');

    expect(result).toEqual({ afterFirstMinute: 6, afterSecondMinute: 6 });
    expect(mockClaimVideoWatchRuneSession).toHaveBeenCalledWith(
      { stableId: 'stable-user-1', generation: 7 },
      'stable-user-1',
      SESSION_ID,
    );
  });
});
