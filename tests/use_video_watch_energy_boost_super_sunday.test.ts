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
const mockReportVideoWatchRuneProgress = jest.fn(async (
  _token: unknown,
  _stableId: string,
  _sessionId: string,
  _positionMs: number,
) => ({ ok: true as const, creditedMs: 0, verifiedMs: 0, reason: 'progress_accepted' }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    multiSet: jest.fn(async () => undefined),
  },
}));

jest.mock('../app/energy_system', () => ({
  getEffectiveMaxEnergyValue: jest.fn(async () => 100),
}));

jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({
    isUnlimited: true,
    energyReady: true,
    reload: jest.fn(async () => undefined),
  }),
}));

jest.mock('../app/energy_video_watch_credit', () => ({
  ...jest.requireActual<typeof import('../app/energy_video_watch_credit')>('../app/energy_video_watch_credit'),
  creditVideoWatchSegment: jest.fn(async () => ({ applied: false, reason: 'not_needed' })),
}));

jest.mock('../app/video_watch_runes_client', () => ({
  VIDEO_WATCH_RUNES_PER_MINUTE: 3,
  VIDEO_WATCH_RUNES_DAILY_CAP: 600,
  startVideoWatchRuneSession: (token: unknown, stableId: string) => mockStartVideoWatchRuneSession(token, stableId),
  claimVideoWatchRuneSession: (token: unknown, stableId: string, sessionId: string) => mockClaimVideoWatchRuneSession(token, stableId, sessionId),
  reportVideoWatchRuneProgress: (
    token: unknown,
    stableId: string,
    sessionId: string,
    positionMs: number,
  ) => mockReportVideoWatchRuneProgress(token, stableId, sessionId, positionMs),
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
    hook.result.current.reportPlaybackSample({ playing: true, positionMs: 0 });
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
    hook.result.current.reportPlaybackSample({ playing: true, positionMs: 60_000 });
  });
  const afterFirstMinute = hook.result.current.runesEarned;
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
    hook.result.current.reportPlaybackSample({ playing: true, positionMs: 120_000 });
  });
  const afterSecondMinute = hook.result.current.runesEarned;

  await act(async () => {
    hook.result.current.reportPlaybackSample({ playing: false, positionMs: 120_000 });
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
    mockReportVideoWatchRuneProgress.mockClear();
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
