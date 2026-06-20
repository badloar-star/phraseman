import {
  applyRemoteConfigSnapshot,
  getRemoteNumber,
  getRemoteBool,
  getFreeLessonLimit,
  getPaywallV2Pct,
  getLeagueXpPromotionThreshold,
  getTrainerAbGroup,
  getOnboardingAbVariant,
  getPaywallVariant,
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
      expect(getRemoteNumber('onboarding_ab_welcome_pct')).toBe(34);
      expect(getRemoteNumber('onboarding_ab_builder_pct')).toBe(33);
      expect(getRemoteNumber('onboarding_ab_quiz_pct')).toBe(33);
      expect(getPaywallV2Pct()).toBe(100);
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
      expect(getRemoteNumber('arena_daily_max')).toBe(5);
    });

    it('applies boolean overrides', () => {
      applyRemoteConfigSnapshot({ bools: { referral_enabled: true, league_xp_promotion_enabled: true } });
      expect(isReferralEnabled()).toBe(true);
      expect(isLeagueXpPromotionEnabled()).toBe(true);
    });

    it('clamps out-of-range values to bounds', () => {
      applyRemoteConfigSnapshot({ numbers: { free_lesson_limit: 999, max_energy: 0, paywall_v2_pct: 250, league_xp_promotion_threshold: 0 } });
      expect(getFreeLessonLimit()).toBe(32);
      expect(getRemoteNumber('max_energy')).toBe(1);
      expect(getPaywallV2Pct()).toBe(100);
      expect(getLeagueXpPromotionThreshold()).toBe(1);
    });

    it('ignores wrong-typed values (keeps default)', () => {
      applyRemoteConfigSnapshot({
        numbers: { free_lesson_limit: 'lots' as unknown as number },
        bools: { league_xp_promotion_enabled: 'yes' as unknown as boolean },
      });
      expect(getFreeLessonLimit()).toBe(8);
      expect(isLeagueXpPromotionEnabled()).toBe(false);
    });

    it('a later snapshot fully replaces an earlier one', () => {
      applyRemoteConfigSnapshot({ numbers: { free_lesson_limit: 12 } });
      expect(getFreeLessonLimit()).toBe(12);
      applyRemoteConfigSnapshot({ numbers: { arena_daily_max: 9 } });
      expect(getFreeLessonLimit()).toBe(8);
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

    it('explain_enabled defaults true (kill-switch), snapshot can disable', () => {
      expect(getRemoteBool('explain_enabled')).toBe(true);
      applyRemoteConfigSnapshot({ bools: { explain_enabled: false } });
      expect(getRemoteBool('explain_enabled')).toBe(false);
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
      expect(a).toBeGreaterThan(800);
      expect(b).toBeGreaterThan(800);
    });
  });

  describe('getPaywallVariant', () => {
    it('is deterministic per user', () => {
      applyRemoteConfigSnapshot({ numbers: { paywall_v2_pct: 50 } });
      expect(getPaywallVariant('u1')).toBe(getPaywallVariant('u1'));
    });

    it('never returns the retired v1 paywall, even when the legacy split is 0%', () => {
      applyRemoteConfigSnapshot({ numbers: { paywall_v2_pct: 0 } });
      expect(getPaywallVariant('x')).toBe('v2');
      applyRemoteConfigSnapshot({ numbers: { paywall_v2_pct: 100 } });
      expect(getPaywallVariant('x')).toBe('v2');
    });
  });

  describe('getOnboardingAbVariant', () => {
    it('is deterministic for the same user', () => {
      const v1 = getOnboardingAbVariant('user-123');
      const v2 = getOnboardingAbVariant('user-123');
      expect(v1).toBe(v2);
      expect(['welcome', 'builder', 'quiz']).toContain(v1);
    });

    it('can force each onboarding entry through remote split', () => {
      applyRemoteConfigSnapshot({ numbers: { onboarding_ab_welcome_pct: 100, onboarding_ab_builder_pct: 0, onboarding_ab_quiz_pct: 0 } });
      expect(getOnboardingAbVariant('x')).toBe('welcome');
      applyRemoteConfigSnapshot({ numbers: { onboarding_ab_welcome_pct: 0, onboarding_ab_builder_pct: 100, onboarding_ab_quiz_pct: 0 } });
      expect(getOnboardingAbVariant('x')).toBe('builder');
      applyRemoteConfigSnapshot({ numbers: { onboarding_ab_welcome_pct: 0, onboarding_ab_builder_pct: 0, onboarding_ab_quiz_pct: 100 } });
      expect(getOnboardingAbVariant('x')).toBe('quiz');
    });
  });
});
