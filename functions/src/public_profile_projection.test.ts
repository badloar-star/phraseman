import {
  buildAuthoritativePublicProfileProjection,
  type PublicProfileProjectionInput,
} from './public_profile_projection';

const cosmetic: PublicProfileProjectionInput = {
  reason: 'display_change',
  name: '  Learner  ',
  lang: 'ru',
  avatar: 'owl',
  frame: 'gold',
  aura: 'lime',
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
  it('preserves every supported public profile-card level from base through V', () => {
    for (const profileCardLevel of [0, 1, 2, 3, 4, 5]) {
      const result = buildAuthoritativePublicProfileProjection('stable-a', {}, {
        ...cosmetic,
        profileCardLevel,
      }, 10_000);
      expect(result.profileCardLevel).toBe(profileCardLevel);
    }
  });

  it('clamps malformed public profile-card levels to the supported 0..5 range', () => {
    expect(buildAuthoritativePublicProfileProjection(
      'stable-a', {}, { ...cosmetic, profileCardLevel: -9 }, 10_000,
    ).profileCardLevel).toBe(0);
    expect(buildAuthoritativePublicProfileProjection(
      'stable-a', {}, { ...cosmetic, profileCardLevel: 99 }, 10_000,
    ).profileCardLevel).toBe(5);
    expect(buildAuthoritativePublicProfileProjection(
      'stable-a', {}, { ...cosmetic, profileCardLevel: 'broken' }, 10_000,
    ).profileCardLevel).toBe(0);
  });

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

// зачем (владелец 21.10, Ревизор 🟡): кольцо Plus для других — только настоящий Plus. Вводный 72-часовой доступ даёт функции
// (isPremium=true), но НЕ кольцо (isPlus=false). plusUntilMs — срок, чтобы истёкший Plus гас без открытия приложения.
describe('public profile isPlus (ring for others)', () => {
  const NOW = Date.parse('2026-10-21T12:00:00Z');
  const project = (progress: Record<string, unknown>) =>
    buildAuthoritativePublicProfileProjection('stable-a', { progress }, cosmetic, NOW);

  it('intro 72-hour access: features on (isPremium) but no ring (isPlus=false)', () => {
    const result = project({ intro_access_granted_at_ms: String(NOW - 3_600_000), intro_access_until_ms: String(NOW + 3_600_000) });
    expect(result.isPremium).toBe(true);
    expect(result.isPlus).toBe(false);
    expect(result.plusUntilMs).toBeNull(); // «нет Plus» ≠ «бессрочно» (Ревизор 21.10)
  });

  it('store purchase: ring with its expiry; lifetime: ring without expiry', () => {
    const yearly = project({ premium_plan: 'yearly', premium_expiry: String(NOW + 86_400_000) });
    expect(yearly.isPlus).toBe(true);
    expect(yearly.plusUntilMs).toBe(NOW + 86_400_000);
    const lifetime = project({ premium_plan: 'lifetime', premium_expiry: '0' });
    expect(lifetime.isPlus).toBe(true);
    expect(lifetime.plusUntilMs).toBe(0);
  });

  it('admin grant and VIP give the ring; expired purchase does not', () => {
    expect(project({ premium_plan: 'admin_grant', admin_premium_override: 'true' }).isPlus).toBe(true);
    const vip = project({ vip_plan: 'referral', vip_until: String(NOW + 1_000) });
    expect(vip.isPlus).toBe(true);
    expect(vip.plusUntilMs).toBe(NOW + 1_000);
    const expired = project({ premium_plan: 'monthly', premium_expiry: String(NOW - 1) });
    expect(expired.isPlus).toBe(false);
    expect(expired.plusUntilMs).toBeNull();
  });

  it('two sources: the later expiry wins; one without expiry means no expiry', () => {
    expect(project({ premium_plan: 'yearly', premium_expiry: String(NOW + 10), vip_plan: 'referral', vip_until: String(NOW + 50) }).plusUntilMs).toBe(NOW + 50);
    expect(project({ premium_plan: 'lifetime', premium_expiry: '0', vip_plan: 'referral', vip_until: String(NOW + 50) }).plusUntilMs).toBe(0);
  });
});
