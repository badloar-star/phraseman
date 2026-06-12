import {
  applyRemoteConfigSnapshot,
  getRemoteNumber,
  getRemoteBool,
  getFreeLessonLimit,
  getPaywallV2Pct,
  getLeagueXpPromotionThreshold,
  getTrainerAbGroup,
  getPaywallVariant,
  getRemoteConfigSignature,
  isReferralEnabled,
  isLeagueXpPromotionEnabled,
  __resetRemoteFlagsForTest,
} from '../app/remote_flags';

describe('remote_flags', () => {
  beforeEach(() => {
    __resetRemoteFlagsForTest();
  });

  describe('defaults', () => {
    it('returns hardcoded defaults before any snapshot', () => {
      expect(getFreeLessonLimit()).toBe(8);
      expect(getRemoteNumber('free_daily_quiz_limit')).toBe(3);
      expect(getRemoteNumber('arena_daily_max')).toBe(5);
      expect(getRemoteNumber('max_energy')).toBe(5);
      expect(getPaywallV2Pct()).toBe(50);
      expect(getLeagueXpPromotionThreshold()).toBe(1000);
      expect(isReferralEnabled()).toBe(false);
      expect(getRemoteBool('speaking_enabled')).toBe(true);
      expect(isLeagueXpPromotionEnabled()).toBe(false);
    });
  });

  describe('snapshot override', () => {
    it('applies numeric overrides', () => {
      applyRemoteConfigSnapshot({ numbers: { free_lesson_limit: 12, free_daily_quiz_limit: 10 } });
      expect(getFreeLessonLimit()).toBe(12);
      expect(getRemoteNumber('free_daily_quiz_limit')).toBe(10);
      // untouched keys keep defaults
      expect(getRemoteNumber('arena_daily_max')).toBe(5);
    });

    it('applies boolean overrides', () => {
      applyRemoteConfigSnapshot({ bools: { referral_enabled: true, league_xp_promotion_enabled: true } });
      expect(isReferralEnabled()).toBe(true);
      expect(isLeagueXpPromotionEnabled()).toBe(true);
    });

    it('clamps out-of-range values to bounds', () => {
      applyRemoteConfigSnapshot({ numbers: { free_lesson_limit: 999, max_energy: 0, paywall_v2_pct: 250, league_xp_promotion_threshold: 0 } });
      expect(getFreeLessonLimit()).toBe(32); // max bound
      expect(getRemoteNumber('max_energy')).toBe(1); // min bound
      expect(getPaywallV2Pct()).toBe(100); // max bound
      expect(getLeagueXpPromotionThreshold()).toBe(1);
    });

    it('ignores wrong-typed values (keeps default)', () => {
      applyRemoteConfigSnapshot({ numbers: { free_lesson_limit: 'lots' as unknown as number }, bools: { referral_enabled: 'yes' as unknown as boolean } });
      expect(getFreeLessonLimit()).toBe(8);
      expect(isReferralEnabled()).toBe(false);
    });

    it('a later snapshot fully replaces an earlier one', () => {
      applyRemoteConfigSnapshot({ numbers: { free_lesson_limit: 12 } });
      expect(getFreeLessonLimit()).toBe(12);
      applyRemoteConfigSnapshot({ numbers: { arena_daily_max: 9 } });
      expect(getFreeLessonLimit()).toBe(8); // reverted to default
      expect(getRemoteNumber('arena_daily_max')).toBe(9);
    });
  });

  describe('signature', () => {
    it('changes when a resolved value changes', () => {
      const before = getRemoteConfigSignature();
      applyRemoteConfigSnapshot({ numbers: { free_lesson_limit: 20 } });
      const after = getRemoteConfigSignature();
      expect(after).not.toBe(before);
    });
  });

  describe('getTrainerAbGroup', () => {
    it('is deterministic for the same user', () => {
      applyRemoteConfigSnapshot({ numbers: { trainer_ab_a_pct: 33, trainer_ab_b_pct: 33, trainer_ab_c_pct: 34 } });
      const g1 = getTrainerAbGroup('user-123');
      const g2 = getTrainerAbGroup('user-123');
      expect(g1).toBe(g2);
      expect(['A', 'B', 'C']).toContain(g1);
    });

    it('defaults to B when all pcts are zero', () => {
      applyRemoteConfigSnapshot({ numbers: { trainer_ab_a_pct: 0, trainer_ab_b_pct: 0, trainer_ab_c_pct: 0 } });
      expect(getTrainerAbGroup('any-user')).toBe('B');
    });

    it('puts everyone in A when a=100', () => {
      applyRemoteConfigSnapshot({ numbers: { trainer_ab_a_pct: 100, trainer_ab_b_pct: 0, trainer_ab_c_pct: 0 } });
      expect(getTrainerAbGroup('u1')).toBe('A');
      expect(getTrainerAbGroup('u2')).toBe('A');
    });

    it('roughly honors the split across many users', () => {
      applyRemoteConfigSnapshot({ numbers: { trainer_ab_a_pct: 50, trainer_ab_b_pct: 50, trainer_ab_c_pct: 0 } });
      let a = 0;
      let b = 0;
      for (let i = 0; i < 2000; i += 1) {
        const g = getTrainerAbGroup(`user-${i}`);
        if (g === 'A') a += 1;
        else if (g === 'B') b += 1;
      }
      // expect each near 1000; allow generous tolerance
      expect(a).toBeGreaterThan(800);
      expect(b).toBeGreaterThan(800);
    });
  });

  describe('getPaywallVariant', () => {
    it('is deterministic per user', () => {
      applyRemoteConfigSnapshot({ numbers: { paywall_v2_pct: 50 } });
      expect(getPaywallVariant('u1')).toBe(getPaywallVariant('u1'));
    });
    it('all v1 at 0%, all v2 at 100%', () => {
      applyRemoteConfigSnapshot({ numbers: { paywall_v2_pct: 0 } });
      expect(getPaywallVariant('x')).toBe('v1');
      applyRemoteConfigSnapshot({ numbers: { paywall_v2_pct: 100 } });
      expect(getPaywallVariant('x')).toBe('v2');
    });
  });
});
