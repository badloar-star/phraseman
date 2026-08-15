import {
  buildAuthoritativePublicProfileProjection,
  type PublicProfileProjectionInput,
} from './public_profile_projection';

const cosmetic: PublicProfileProjectionInput = {
  reason: 'daily_xp',
  name: '  Learner  ',
  lang: 'ru',
  avatar: 'owl',
  frame: 'gold',
  aura: 'lime',
  leagueId: 999,
  totalXp: 999_999_999,
  level: 60,
  weekPoints: 888_888,
  streak: 777,
  isPremium: true,
  isVip: true,
  isLifetime: true,
  cardWordsLearned: 321,
  cardPhrasesLearned: 123,
  cardAppDays: 44,
  cardLongestStreak: 15,
};

describe('server-authoritative public profile projection', () => {
  it('ignores client progress and entitlement claims', () => {
    const result = buildAuthoritativePublicProfileProjection('stable-a', {
      progressServerAuthoritative: true,
      progressServerState: {
        totalXp: 1_250,
        weekPoints: 45,
        streakCount: 6,
      },
      progress: {
        user_total_xp: '999999999',
        premium_plan: '',
        vip_active: 'false',
      },
    }, cosmetic, 10_000);

    expect(result).toMatchObject({
      uid: 'stable-a',
      name: 'Learner',
      nameLower: 'learner',
      totalXp: 1_250,
      weekPoints: 45,
      streak: 6,
      isPremium: false,
      isVip: false,
      isLifetime: false,
      cardWordsLearned: 321,
      cardPhrasesLearned: 123,
      cardAppDays: 44,
      cardLongestStreak: 15,
      progressAuthority: 'server',
    });
    expect(result.level).toBeGreaterThan(1);
  });

  it('does not project legacy progress when no accepted server state exists', () => {
    const result = buildAuthoritativePublicProfileProjection('stable-a', {
      progressServerAuthoritative: false,
      progress: {
        user_total_xp: '999999999',
        streak_count: '777',
        premium_plan: 'lifetime',
        premium_expiry: '0',
      },
    }, cosmetic, 10_000);

    expect(result).not.toHaveProperty('totalXp');
    expect(result).not.toHaveProperty('level');
    expect(result).not.toHaveProperty('weekPoints');
    expect(result).not.toHaveProperty('streak');
    expect(result).toMatchObject({
      isPremium: true,
      isVip: false,
      isLifetime: true,
      progressAuthority: 'unavailable',
    });
  });
});
