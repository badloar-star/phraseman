import {
  advanceRound,
  hasAuthoritativeTournamentResults,
  estimateTournamentServerClockSkew,
  orderTournamentPlayersForDisplay,
  preserveTournamentFreshSnapshot,
  scopeTournamentFreshSnapshot,
  scopeTournamentRoomStatus,
  scopeTournamentSecondsLeft,
  tournamentSharedPlacement,
  shouldAcceptTournamentRoomSnapshot,
  shouldNudgeTournamentDeadline,
  tournamentDeadlineNudgeRetryDelayMs,
  useTournamentRoom,
  resolveTournamentIntroCountdownValue,
  resolveTournamentRoomIdParam,
  shouldShowTournamentLocalIntro,
  type RoomPlayer,
  type RoomTaskTiming,
} from '../app/tournament_client';
import { initFirebaseAppCheckIfAvailable } from '../app/app_check_init';
import { ensureAnonUser } from '../app/cloud_sync';
import { act, cleanup, renderHook } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import path from 'node:path';

let mockRoomSnapshotNext: ((snapshot: unknown) => void) | null = null;
const mockRoomUnsubscribe = jest.fn();
const mockOnRoomSnapshot = jest.fn((...args: unknown[]) => {
  mockRoomSnapshotNext = args.find((value) => typeof value === 'function') as typeof mockRoomSnapshotNext;
  return mockRoomUnsubscribe;
});
const mockDeadlineCallable = jest.fn();
const mockGetFunctions = jest.fn((_app: unknown, region: string) => ({ region }));
const mockHttpsCallableFactory = jest.fn((_functions: unknown, name: string) => {
  if (name === 'tournamentAdvanceRound') return mockDeadlineCallable;
  return jest.fn().mockResolvedValue({ data: { ok: true } });
});

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: () => ({
      doc: () => ({ onSnapshot: (...args: unknown[]) => mockOnRoomSnapshot(...args) }),
    }),
  }),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: (...args: unknown[]) => mockGetFunctions(...args as [unknown, string]),
  httpsCallable: (...args: unknown[]) => mockHttpsCallableFactory(...args as [unknown, string]),
}));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn().mockResolvedValue({ uid: 'auth-user' }) }));
jest.mock('../app/app_check_init', () => ({ initFirebaseAppCheckIfAvailable: jest.fn().mockResolvedValue(undefined) }));

const player = (id: string, score: number, extra: Partial<RoomPlayer> = {}): RoomPlayer => ({
  id,
  name: id,
  avatar: '',
  color: '#000000',
  score,
  streak: 0,
  ...extra,
});

describe('tournament client authority boundaries', () => {
  test('accepts a trimmed roomId and repeated identical route params, but fails closed for invalid params', () => {
    expect(resolveTournamentRoomIdParam(' room-42 ')).toBe('room-42');
    expect(resolveTournamentRoomIdParam(['room-42', 'room-42'])).toBe('room-42');
    expect(resolveTournamentRoomIdParam(['room-42', ' room-42 '])).toBeNull();
    expect(resolveTournamentRoomIdParam(['room-42', 'room-99'])).toBeNull();
    expect(resolveTournamentRoomIdParam(['room-42', ''])).toBeNull();
    expect(resolveTournamentRoomIdParam([])).toBeNull();
    expect(resolveTournamentRoomIdParam('   ')).toBeNull();
    expect(resolveTournamentRoomIdParam(undefined)).toBeNull();
  });

  test('keeps every tournament screen route boundary typed for repeated roomId params', () => {
    for (const screen of ['lobby', 'round', 'table', 'results', 'review']) {
      const source = readFileSync(
        path.join(__dirname, '..', 'app', `tournament_${screen}.tsx`),
        'utf8',
      );
      expect(source).toMatch(/useLocalSearchParams<\{\s*roomId\?: string \| string\[\]/);
      expect(source).toContain('resolveTournamentRoomIdParam(params.roomId)');
    }
  });

  test('derives server clock skew from the request midpoint instead of ignoring a whole task window', () => {
    // Device is 20s slow; a symmetric 1s round trip must not become a 21s skew.
    expect(estimateTournamentServerClockSkew({
      serverNowMs: 120_500,
      requestStartedAtMs: 100_000,
      responseReceivedAtMs: 101_000,
    })).toBe(20_000);
  });

  test('rejects a clock sample whose round trip is too slow for tournament timing', () => {
    expect(estimateTournamentServerClockSkew({
      serverNowMs: 125_000,
      requestStartedAtMs: 100_000,
      responseReceivedAtMs: 110_001,
    })).toBeNull();
  });

  test('preserves final server order while moving a forfeiter behind every active player', () => {
    const ordered = orderTournamentPlayersForDisplay([
      player('server-first', 10, { resultPlace: 1, rewardGems: 24 }),
      player('forfeited-high-score', 999, { resultPlace: 4, forfeitedAtMs: 5_000, rewardGems: 0 }),
      player('server-third', 8, { resultPlace: 2, rewardGems: 9 }),
    ]);

    expect(ordered.map(({ id }) => id)).toEqual([
      'server-first',
      'server-third',
      'forfeited-high-score',
    ]);
    expect(ordered[2].rewardGems).toBe(0);
  });

  test('sorts interim active standings by server score and deterministic tie policy', () => {
    const ordered = orderTournamentPlayersForDisplay([
      player('z-tie', 10),
      player('high-score', 12),
      player('a-tie', 10),
      player('forfeited-high-score', 999, { forfeitedAtMs: 5_000 }),
    ]);

    expect(ordered.map(({ id }) => id)).toEqual([
      'high-score', 'a-tie', 'z-tie', 'forfeited-high-score',
    ]);
  });

  test('uses competition places for an interim tie without merging a forfeiter into it', () => {
    const ordered = orderTournamentPlayersForDisplay([
      player('z-tie', 10),
      player('a-tie', 10),
      player('forfeited-tie', 10, { forfeitedAtMs: 5_000 }),
      player('third', 9),
    ]);

    expect(ordered.map((entry, index) => tournamentSharedPlacement(ordered, index))).toEqual([
      1, 1, 3, 4,
    ]);
  });

  test('requires final server placements before results can award a podium or win effect', () => {
    expect(hasAuthoritativeTournamentResults([
      player('first', 10, { resultPlace: 1 }),
      player('second', 9),
    ])).toBe(false);
    expect(hasAuthoritativeTournamentResults([
      player('first', 10, { resultPlace: 1 }),
      player('second', 9, { resultPlace: 2 }),
    ])).toBe(true);
  });

  test('never rolls an already fresh tournament room back to an older cached version', () => {
    const room = { roomId: 'room', slotId: 'slot', state: 'round4' as const, startsAt: 1, players: [], rounds: [], version: 9 };
    const oldCached = { ...room, state: 'round3' as const, version: 8 };
    expect(shouldAcceptTournamentRoomSnapshot(room, oldCached, true)).toBe(false);
    expect(shouldAcceptTournamentRoomSnapshot(room, { ...room, state: 'final' as const, version: 10 }, false)).toBe(true);
  });

  test('a metadata-only cache event cannot stop a countdown after server freshness was established', () => {
    expect(preserveTournamentFreshSnapshot(false, true)).toBe(false);
    expect(preserveTournamentFreshSnapshot(false, false)).toBe(true);
    expect(preserveTournamentFreshSnapshot(true, true)).toBe(true);
  });

  test('freshness from one room cannot authorize navigation for a newly requested room', () => {
    expect(scopeTournamentFreshSnapshot('room-b', 'room-a', 'room-a', true)).toBe(false);
    expect(scopeTournamentFreshSnapshot('room-b', 'room-b', 'room-a', true)).toBe(false);
    expect(scopeTournamentFreshSnapshot('room-b', 'room-b', 'room-b', true)).toBe(true);
    expect(scopeTournamentFreshSnapshot(null, 'room-b', 'room-b', true)).toBe(false);
  });

  test('countdown and status never leak from the previous room during a route-param switch', () => {
    const staleCountdown = { roomId: 'room-a', deadlineAtMs: 20_000, secondsLeft: 9 };
    expect(scopeTournamentSecondsLeft('room-b', 11_000, staleCountdown, 10_000)).toBe(1);
    expect(scopeTournamentSecondsLeft('room-a', 20_000, staleCountdown, 10_000)).toBe(9);
    expect(scopeTournamentSecondsLeft('room-b', null, staleCountdown, 10_000)).toBe(0);

    expect(scopeTournamentRoomStatus('room-b', 'room-a', 'offline', true)).toBe('ready');
    expect(scopeTournamentRoomStatus('room-b', 'room-a', 'offline', false)).toBe('loading');
    expect(scopeTournamentRoomStatus('room-b', 'room-b', 'error', false)).toBe('error');
  });

  test('does not consume a fresh final-state nudge while its absolute deadline is still in the future', () => {
    expect(shouldNudgeTournamentDeadline(10_000, 9_999)).toBe(false);
    expect(shouldNudgeTournamentDeadline(10_000, 10_000)).toBe(true);
  });

  test('does not render a local intro once a server task schedule has started', () => {
    const timing: RoomTaskTiming = {
      taskId: 'task-1', taskIndex: 0, durationMs: 12_000,
      introEndsAtMs: 9_000, startsAtMs: 10_000, deadlineAtMs: 22_000,
    };

    expect(shouldShowTournamentLocalIntro(timing, 8_999)).toBe(true);
    expect(shouldShowTournamentLocalIntro(timing, 9_000)).toBe(false);
    expect(shouldShowTournamentLocalIntro(timing, 10_000)).toBe(false);
  });

  test('uses corrected server time for both countdown and deadline nudge retry', () => {
    const clientSource = readFileSync(path.join(__dirname, '..', 'app', 'tournament_client.ts'), 'utf8');
    expect(clientSource).toContain('tournamentSecondsUntil(deadline, tournamentNow())');
    expect(clientSource).toContain('nudgeRetryNonce');
    expect(clientSource).toContain("includes('failed-precondition')");
  });

  test('retries an early or transient deadline nudge without retrying permanent failures forever', () => {
    expect(tournamentDeadlineNudgeRetryDelayMs({ code: 'functions/failed-precondition' }, 0)).toBe(650);
    expect(tournamentDeadlineNudgeRetryDelayMs({ code: 'functions/failed-precondition' }, 7)).toBe(650);
    expect(tournamentDeadlineNudgeRetryDelayMs({ code: 'functions/failed-precondition' }, 8)).toBeNull();

    expect(tournamentDeadlineNudgeRetryDelayMs({ code: 'functions/unavailable' }, 0)).toBe(650);
    expect(tournamentDeadlineNudgeRetryDelayMs({ code: 'functions/deadline-exceeded' }, 1)).toBe(1300);
    expect(tournamentDeadlineNudgeRetryDelayMs(new Error('network request failed'), 2)).toBe(2600);
    expect(tournamentDeadlineNudgeRetryDelayMs({ code: 'functions/unavailable' }, 3)).toBeNull();

    expect(tournamentDeadlineNudgeRetryDelayMs({ code: 'functions/permission-denied' }, 0)).toBeNull();
    expect(tournamentDeadlineNudgeRetryDelayMs({ code: 'functions/invalid-argument' }, 0)).toBeNull();
  });

  test('sends the deadline nudge directly with established session auth and unchanged server guards', async () => {
    const ensureAnonUserMock = jest.mocked(ensureAnonUser);
    const appCheckMock = jest.mocked(initFirebaseAppCheckIfAvailable);
    ensureAnonUserMock.mockClear();
    appCheckMock.mockClear();
    mockGetFunctions.mockClear();
    mockHttpsCallableFactory.mockClear();
    mockDeadlineCallable.mockReset().mockResolvedValue({ data: { ok: true, state: 'round4' } });

    try {
      await advanceRound('deadline-room', 'table3', 123_456);

      expect(ensureAnonUserMock).not.toHaveBeenCalled();
      expect(appCheckMock).not.toHaveBeenCalled();
      expect(mockGetFunctions).toHaveBeenCalledWith({}, 'us-central1');
      expect(mockHttpsCallableFactory).toHaveBeenCalledWith(
        { region: 'us-central1' },
        'tournamentAdvanceRound',
      );
      expect(mockDeadlineCallable).toHaveBeenCalledWith({
        roomId: 'deadline-room',
        expectedState: 'table3',
        expectedDeadlineAtMs: 123_456,
      });
    } finally {
      ensureAnonUserMock.mockClear();
      appCheckMock.mockClear();
      mockGetFunctions.mockClear();
      mockHttpsCallableFactory.mockClear();
      mockDeadlineCallable.mockReset();
    }
  });

  test('a transient nudge failure schedules a second callable and room change cancels the pending retry', async () => {
    jest.useFakeTimers().setSystemTime(10_000);
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    mockDeadlineCallable
      .mockRejectedValueOnce({ code: 'functions/unavailable' })
      .mockRejectedValueOnce({ code: 'functions/unavailable' })
      .mockResolvedValue({ data: { ok: true, state: 'table1' } });

    const hook = await renderHook(
      ({ roomId, active }: { roomId: string; active: boolean }) => useTournamentRoom(roomId, active),
      { initialProps: { roomId: 'retry-room', active: true } },
    );
    try {
      await act(async () => {
        for (let turn = 0; turn < 8 && !mockRoomSnapshotNext; turn += 1) await Promise.resolve();
      });
      expect(mockRoomSnapshotNext).not.toBeNull();
      await act(async () => {
        mockRoomSnapshotNext?.({
          exists: true,
          metadata: { fromCache: false },
          data: () => ({
            roomId: 'retry-room', slotId: 'slot', state: 'round1', startsAt: 1,
            players: [], rounds: [], stateDeadlineAtMs: 10_000, version: 1,
          }),
        });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
        for (let turn = 0; turn < 12; turn += 1) await Promise.resolve();
      });
      expect(mockDeadlineCallable).toHaveBeenCalledTimes(1);

      await act(async () => { jest.advanceTimersByTime(649); });
      expect(mockDeadlineCallable).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(1);
        for (let turn = 0; turn < 12; turn += 1) await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
        for (let turn = 0; turn < 12; turn += 1) await Promise.resolve();
      });
      expect(mockDeadlineCallable).toHaveBeenCalledTimes(2);

      await hook.rerender({ roomId: 'cancel-room', active: true });
      await act(async () => { jest.advanceTimersByTime(5_000); });
      expect(mockDeadlineCallable).toHaveBeenCalledTimes(2);
      expect(mockRoomUnsubscribe).toHaveBeenCalled();
    } finally {
      await hook.unmount();
      await cleanup();
      random.mockRestore();
      jest.useRealTimers();
      mockRoomSnapshotNext = null;
      mockOnRoomSnapshot.mockClear();
      mockRoomUnsubscribe.mockClear();
      mockDeadlineCallable.mockReset();
      mockHttpsCallableFactory.mockClear();
    }
  });

  test('derives the visible intro countdown from the absolute server boundary', () => {
    expect(resolveTournamentIntroCountdownValue(10_000, 7_100)).toBe(3);
    expect(resolveTournamentIntroCountdownValue(10_000, 8_100)).toBe(2);
    expect(resolveTournamentIntroCountdownValue(10_000, 10_000)).toBe(0);
  });

  test('resume after the intro boundary does not recreate a local countdown delay', () => {
    jest.useFakeTimers().setSystemTime(7_100);
    try {
      expect(resolveTournamentIntroCountdownValue(10_000)).toBe(3);
      jest.advanceTimersByTime(2_900);
      expect(resolveTournamentIntroCountdownValue(10_000)).toBe(0);
      const introSource = readFileSync(
        path.join(__dirname, '..', 'components', 'tournament', 'TournamentRoundIntro.tsx'),
        'utf8',
      );
      expect(introSource).toContain('if (runtimeActive) setNowMs(tournamentNow());');
    } finally {
      jest.useRealTimers();
    }
  });

  test('an active lobby nudges the server at its exact deadline instead of waiting for the recovery scheduler', () => {
    const clientSource = readFileSync(
      path.join(__dirname, '..', 'app', 'tournament_client.ts'),
      'utf8',
    );
    expect(clientSource).toMatch(/ADVANCEABLE_STATES\s*=\s*\/\^\(lobby\|round\[1-4\]/);
  });
});
