import { sanitizeArenaProfileForRating } from '../app/arena_rating_cache';

describe('arena rating cache profile sanitizing', () => {
  it('uses legacy dotted arena progress when it has a fresher match count', () => {
    const profile = sanitizeArenaProfileForRating({
      userId: 'auth-1',
      displayName: 'Tester',
      avatarId: '1',
      rank: { tier: 'legend', level: 'II', stars: 2 },
      xp: 4080,
      stats: { matchesPlayed: 78, matchesWon: 60, totalScore: 9000, winStreak: 2, bestWinStreak: 8 },
      updatedAt: 123,
      'rank.tier': 'legend',
      'rank.level': 'III',
      'rank.stars': 1,
      'stats.matchesPlayed': 80,
      'stats.matchesWon': 62,
      'stats.totalScore': 11390,
      'stats.winStreak': 4,
      'stats.bestWinStreak': 8,
    });

    expect(profile?.rank).toEqual({ tier: 'legend', level: 'III', stars: 1 });
    expect(profile?.stats.matchesPlayed).toBe(80);
    expect(profile?.stats.matchesWon).toBe(62);
  });

  it('keeps nested arena progress once it is at least as fresh as legacy dotted fields', () => {
    const profile = sanitizeArenaProfileForRating({
      userId: 'auth-1',
      displayName: 'Tester',
      avatarId: '1',
      rank: { tier: 'legend', level: 'III', stars: 2 },
      xp: 4130,
      stats: { matchesPlayed: 81, matchesWon: 63, totalScore: 12500, winStreak: 5, bestWinStreak: 8 },
      updatedAt: 456,
      'rank.tier': 'legend',
      'rank.level': 'III',
      'rank.stars': 1,
      'stats.matchesPlayed': 80,
      'stats.matchesWon': 62,
    });

    expect(profile?.rank).toEqual({ tier: 'legend', level: 'III', stars: 2 });
    expect(profile?.stats.matchesPlayed).toBe(81);
    expect(profile?.stats.matchesWon).toBe(63);
  });
});
