import {
  hasAuthoritativeTournamentResults,
  orderTournamentPlayersForDisplay,
  resolveTournamentIntroCountdownValue,
  shouldShowTournamentLocalIntro,
  type RoomPlayer,
  type RoomTaskTiming,
} from '../app/tournament_client';
import { readFileSync } from 'node:fs';
import path from 'node:path';

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

  test('does not render a local intro once a server task schedule has started', () => {
    const timing: RoomTaskTiming = {
      taskId: 'task-1', taskIndex: 0, durationMs: 12_000,
      introEndsAtMs: 9_000, startsAtMs: 10_000, deadlineAtMs: 22_000,
    };

    expect(shouldShowTournamentLocalIntro(timing, 8_999)).toBe(true);
    expect(shouldShowTournamentLocalIntro(timing, 9_000)).toBe(false);
    expect(shouldShowTournamentLocalIntro(timing, 10_000)).toBe(false);
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
});
