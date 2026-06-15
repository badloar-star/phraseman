import {
  applyRemoteConfigSnapshot,
  getRemoteNumber,
  getRemoteBool,
  getFreeLessonLimit,
  getPaywallV2Pct,
  getLeagueXpPromotionThreshold,
  getTrainerAbGroup,
  getPaywallVariant,
  getOnboardingColorVariant,
  getRemoteConfigSignature,
  isReferralEnabled,
  isLeagueXpPromotionEnabled,
  isMaintenanceBanner,
  isMaintenanceBlock,
  getMaintenanceText,
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
      expect(isReferralEnabled()).toBe(true);
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
      applyRemoteConfigSnapshot({ numbers: { free_lesson_limit: 'lots' as unknown as number }, bools: { league_xp_promotion_enabled: 'yes' as unknown as boolean } });
      expect(getFreeLessonLimit()).toBe(8);
      // wrong-typed bool ignored -> keeps default (league promo defaults false)
      expect(isLeagueXpPromotionEnabled()).toBe(false);
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

  describe('maintenance + texts (wave 3)', () => {
    it('maintenance flags default off, texts default empty', () => {
      expect(isMaintenanceBanner()).toBe(false);
      expect(isMaintenanceBlock()).toBe(false);
      expect(getMaintenanceText('ru')).toBe('');
      expect(getMaintenanceText('uk')).toBe('');
      expect(getMaintenanceText('es')).toBe('');
    });
    it('snapshot turns on block + applies localized text', () => {
      applyRemoteConfigSnapshot({
        bools: { maintenance_block: true },
        texts: { maintenance_ru: 'Тех. работы', maintenance_uk: 'Тех. роботи', maintenance_es: 'Mantenimiento' },
      });
      expect(isMaintenanceBlock()).toBe(true);
      expect(getMaintenanceText('ru')).toBe('Тех. работы');
      expect(getMaintenanceText('uk-UA')).toBe('Тех. роботи');
      expect(getMaintenanceText('es')).toBe('Mantenimiento');
      // unknown lang → ru
      expect(getMaintenanceText('pl')).toBe('Тех. работы');
    });
    it('a later snapshot without texts reverts to empty (full replace)', () => {
      applyRemoteConfigSnapshot({ texts: { maintenance_ru: 'X' } });
      expect(getMaintenanceText('ru')).toBe('X');
      applyRemoteConfigSnapshot({ bools: { maintenance_banner: true } });
      expect(getMaintenanceText('ru')).toBe('');
      expect(isMaintenanceBanner()).toBe(true);
    });
    it('non-string text values are ignored', () => {
      applyRemoteConfigSnapshot({ texts: { maintenance_ru: 123 as unknown as string } });
      expect(getMaintenanceText('ru')).toBe('');
    });
    it('explain_enabled defaults false, snapshot enables', () => {
      expect(getRemoteBool('explain_enabled')).toBe(false);
      applyRemoteConfigSnapshot({ bools: { explain_enabled: true } });
      expect(getRemoteBool('explain_enabled')).toBe(true);
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

  describe('getOnboardingColorVariant', () => {
    it('defaults to 50% green when no snapshot applied', () => {
      // default onboarding_green_pct = 50 → both colors appear across users
      const colors = new Set<string>();
      for (let i = 0; i < 200; i += 1) colors.add(getOnboardingColorVariant(`user-${i}`));
      expect(colors.has('blue')).toBe(true);
      expect(colors.has('green')).toBe(true);
    });

    it('is deterministic per user (same color across calls)', () => {
      applyRemoteConfigSnapshot({ numbers: { onboarding_green_pct: 50 } });
      expect(getOnboardingColorVariant('u1')).toBe(getOnboardingColorVariant('u1'));
      expect(['blue', 'green']).toContain(getOnboardingColorVariant('u1'));
    });

    it('all blue at 0%, all green at 100%', () => {
      applyRemoteConfigSnapshot({ numbers: { onboarding_green_pct: 0 } });
      expect(getOnboardingColorVariant('x')).toBe('blue');
      expect(getOnboardingColorVariant('y')).toBe('blue');
      applyRemoteConfigSnapshot({ numbers: { onboarding_green_pct: 100 } });
      expect(getOnboardingColorVariant('x')).toBe('green');
      expect(getOnboardingColorVariant('y')).toBe('green');
    });

    it('roughly honors a 50/50 split across many users', () => {
      applyRemoteConfigSnapshot({ numbers: { onboarding_green_pct: 50 } });
      let blue = 0;
      let green = 0;
      for (let i = 0; i < 2000; i += 1) {
        const c = getOnboardingColorVariant(`user-${i}`);
        if (c === 'blue') blue += 1;
        else green += 1;
      }
      // each near 1000; generous tolerance for hash distribution
      expect(blue).toBeGreaterThan(800);
      expect(green).toBeGreaterThan(800);
    });

    it('clamps an out-of-range green pct to bounds', () => {
      applyRemoteConfigSnapshot({ numbers: { onboarding_green_pct: 250 } });
      // 250 clamps to 100 → everyone green
      expect(getOnboardingColorVariant('z')).toBe('green');
    });
  });
});
