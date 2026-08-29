import {
  accountScopedLeagueRunesStorageKey,
  canonicalLeagueLocalOverlay,
  leagueEarnedDelta,
  remainingLeagueRunesCatchup,
} from '../app/league_week_runes_delta';

describe('league weekly rune delta', () => {
  it('isolates persisted league state by account owner', () => {
    expect(accountScopedLeagueRunesStorageKey('catchup', 'account-a'))
      .not.toBe(accountScopedLeagueRunesStorageKey('catchup', 'account-b'));
    expect(accountScopedLeagueRunesStorageKey('catchup', 'account/a'))
      .toBe('catchup:account%2Fa');
  });

  it('counts newly earned runes', () => {
    expect(leagueEarnedDelta(120, 145)).toBe(25);
  });

  it('does not count wallet grants when earned total did not change', () => {
    expect(leagueEarnedDelta(120, 120)).toBe(0);
  });

  it('does not subtract league progress when restored data is older', () => {
    expect(leagueEarnedDelta(145, 120)).toBe(0);
  });
});

describe('league weekly rune catchup', () => {
  it('repairs duplicated event sums from canonical lifetime counters', () => {
    expect(canonicalLeagueLocalOverlay(360, 234)).toBe(126);
  });

  it('does not erase local points merely because a server snapshot arrived later', () => {
    expect(remainingLeagueRunesCatchup({
      weekKey: '2026-W35', baseWeekEarned: null, delta: 3,
    }, '2026-W35', 120)).toBe(3);
  });

  it('subtracts only the server-earned advance that demonstrably absorbed local points', () => {
    expect(remainingLeagueRunesCatchup({
      weekKey: '2026-W35', baseWeekEarned: 100, delta: 30,
    }, '2026-W35', 112)).toBe(18);
  });

  it('clears the catchup after the server absorbed all of it', () => {
    expect(remainingLeagueRunesCatchup({
      weekKey: '2026-W35', baseWeekEarned: 100, delta: 30,
    }, '2026-W35', 140)).toBe(0);
  });

  it('drops a catchup from a different ISO week', () => {
    expect(remainingLeagueRunesCatchup({
      weekKey: '2026-W34', baseWeekEarned: null, delta: 30,
    }, '2026-W35', 0)).toBe(0);
  });
});
