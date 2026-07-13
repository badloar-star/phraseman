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
  isPaywallTimersEnabled,
  getStreakFreezeCostShards,
  isVersionBelow,
  shouldForceUpdate,
  isForceUpdateEnabled,
  isManualUpdateEnabled,
  getMinAppVersion,
  getManualUpdateCampaignId,
  getManualUpdateMode,
  getManualUpdatePlatform,
  getManualUpdateTargetBuild,
  matchesManualUpdatePlatform,
  normalizeManualUpdateMode,
  normalizeManualUpdatePlatform,
  shouldShowManualUpdate,
  isAiGloballyDisabled,
  isCompassEnabled,
  parsePromoUntilMs,
  shouldShowPromoBanner,
  isPromoBannerEnabled,
  getPromoBannerCampaignId,
  getPromoBannerText,
  getMaintenanceCampaignId,
  getFlagRolloutPct,
  isFlagEnabledForUser,
  isInRolloutBucket,
  matchesPromoSegment,
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
      expect(getRemoteNumber('onboarding_ab_welcome_pct')).toBe(0);
      expect(getRemoteNumber('onboarding_ab_builder_pct')).toBe(0);
      expect(getRemoteNumber('onboarding_ab_quiz_pct')).toBe(0);
      expect(getPaywallV2Pct()).toBe(100);
      expect(getLeagueXpPromotionThreshold()).toBe(1000);
      expect(isReferralEnabled()).toBe(true);
      expect(getRemoteBool('speaking_enabled')).toBe(true);
      expect(getRemoteBool('weekly_review_ai_v2_enabled')).toBe(false);
      expect(isLeagueXpPromotionEnabled()).toBe(false);
      expect(isPaywallTimersEnabled()).toBe(true);
      expect(getStreakFreezeCostShards()).toBe(10);
      expect(isManualUpdateEnabled()).toBe(false);
      expect(getManualUpdateCampaignId()).toBe('');
      expect(getManualUpdateMode()).toBe('optional');
      expect(getManualUpdateTargetBuild()).toBe('');
      expect(getPromoBannerCampaignId()).toBe('');
      expect(getMaintenanceCampaignId()).toBe('');
    });
  });

  describe('snapshot override', () => {
    it('treats weekly review V2 as a boolean kill-switch, not a client rollout bucket', () => {
      applyRemoteConfigSnapshot({
        bools: { weekly_review_ai_v2_enabled: true },
        numbers: { weekly_review_ai_v2_enabled_rollout_pct: 0 },
      });
      expect(getRemoteBool('weekly_review_ai_v2_enabled')).toBe(true);
    });

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

    it('ai_global_disable — над-флаг: выключает весь ИИ, перекрывая compass_enabled', () => {
      // По умолчанию ИИ работает.
      applyRemoteConfigSnapshot({ bools: { ai_global_disable: false, compass_enabled: true } });
      expect(isAiGloballyDisabled()).toBe(false);
      expect(isCompassEnabled()).toBe(true);
      // Рубильник ВКЛ — весь ИИ выключен, даже если compass_enabled=true.
      applyRemoteConfigSnapshot({ bools: { ai_global_disable: true, compass_enabled: true } });
      expect(isAiGloballyDisabled()).toBe(true);
      expect(isCompassEnabled()).toBe(false);
    });

    it('streak_freeze_cost_shards override применяется и клампится', () => {
      applyRemoteConfigSnapshot({ numbers: { streak_freeze_cost_shards: 25 } });
      expect(getStreakFreezeCostShards()).toBe(25);
      applyRemoteConfigSnapshot({ numbers: { streak_freeze_cost_shards: 99999 } });
      expect(getStreakFreezeCostShards()).toBe(9999); // max bound
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

    it('paywall_timers_enabled defaults true (kill-switch), snapshot can disable', () => {
      expect(isPaywallTimersEnabled()).toBe(true);
      applyRemoteConfigSnapshot({ bools: { paywall_timers_enabled: false } });
      expect(isPaywallTimersEnabled()).toBe(false);
      // повторный снапшот без ключа возвращает дефолт (полная замена)
      applyRemoteConfigSnapshot({ bools: { referral_enabled: true } });
      expect(isPaywallTimersEnabled()).toBe(true);
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
      expect(v1).toBe('current');
    });

    it('ignores the retired welcome/builder/quiz split', () => {
      applyRemoteConfigSnapshot({ numbers: { onboarding_ab_welcome_pct: 100, onboarding_ab_builder_pct: 0, onboarding_ab_quiz_pct: 0 } });
      expect(getOnboardingAbVariant('x')).toBe('current');
      applyRemoteConfigSnapshot({ numbers: { onboarding_ab_welcome_pct: 0, onboarding_ab_builder_pct: 100, onboarding_ab_quiz_pct: 0 } });
      expect(getOnboardingAbVariant('x')).toBe('current');
      applyRemoteConfigSnapshot({ numbers: { onboarding_ab_welcome_pct: 0, onboarding_ab_builder_pct: 0, onboarding_ab_quiz_pct: 100 } });
      expect(getOnboardingAbVariant('x')).toBe('current');
    });
  });

  describe('rollout % (поэтапный выкат bool-флагов)', () => {
    describe('isInRolloutBucket (чистый бакетинг)', () => {
      it('100% → все попадают, 0% → никто', () => {
        expect(isInRolloutBucket('u1', 'force_update_enabled', 100)).toBe(true);
        expect(isInRolloutBucket('u1', 'force_update_enabled', 0)).toBe(false);
      });
      it('детерминирован для одного юзера', () => {
        const a = isInRolloutBucket('user-42', 'k', 50);
        const b = isInRolloutBucket('user-42', 'k', 50);
        expect(a).toBe(b);
      });
      it('примерно соблюдает долю на большой выборке (~30%)', () => {
        let hit = 0;
        for (let i = 0; i < 3000; i += 1) if (isInRolloutBucket(`u${i}`, 'flagX', 30)) hit += 1;
        const frac = hit / 3000;
        expect(frac).toBeGreaterThan(0.24);
        expect(frac).toBeLessThan(0.36);
      });
      it('расширение выката монотонно: попавший при 30% остаётся при 60%', () => {
        for (let i = 0; i < 500; i += 1) {
          const u = `mono${i}`;
          if (isInRolloutBucket(u, 's', 30)) expect(isInRolloutBucket(u, 's', 60)).toBe(true);
        }
      });
    });

    describe('getFlagRolloutPct', () => {
      it('по умолчанию 100 (ключа нет)', () => {
        expect(getFlagRolloutPct('force_update_enabled')).toBe(100);
      });
      it('читает <flag>_rollout_pct из numbers, клампит 0..100', () => {
        applyRemoteConfigSnapshot({ numbers: { force_update_enabled_rollout_pct: 25 } });
        expect(getFlagRolloutPct('force_update_enabled')).toBe(25);
        applyRemoteConfigSnapshot({ numbers: { force_update_enabled_rollout_pct: 250 } });
        expect(getFlagRolloutPct('force_update_enabled')).toBe(100);
      });
    });

    describe('isFlagEnabledForUser', () => {
      it('флаг выключен → false для всех, даже при rollout 100', () => {
        applyRemoteConfigSnapshot({ bools: { force_update_enabled: false }, numbers: { force_update_enabled_rollout_pct: 100 } });
        expect(isFlagEnabledForUser('force_update_enabled', 'u1')).toBe(false);
      });
      it('флаг включён + rollout не задан → true для всех (100%)', () => {
        applyRemoteConfigSnapshot({ bools: { force_update_enabled: true } });
        expect(isFlagEnabledForUser('force_update_enabled', 'u1')).toBe(true);
        expect(isFlagEnabledForUser('force_update_enabled', null)).toBe(true);
      });
      it('флаг включён + rollout 0 → false для всех', () => {
        applyRemoteConfigSnapshot({ bools: { force_update_enabled: true }, numbers: { force_update_enabled_rollout_pct: 0 } });
        expect(isFlagEnabledForUser('force_update_enabled', 'u1')).toBe(false);
      });
      it('частичный выкат без userId → false (аноним не в бакете)', () => {
        applyRemoteConfigSnapshot({ bools: { force_update_enabled: true }, numbers: { force_update_enabled_rollout_pct: 50 } });
        expect(isFlagEnabledForUser('force_update_enabled', null)).toBe(false);
      });
      it('частичный выкат с userId → совпадает с бакетом', () => {
        applyRemoteConfigSnapshot({ bools: { force_update_enabled: true }, numbers: { force_update_enabled_rollout_pct: 50 } });
        expect(isFlagEnabledForUser('force_update_enabled', 'u7')).toBe(isInRolloutBucket('u7', 'force_update_enabled', 50));
      });
    });

    it('смена rollout-процента меняет сигнатуру конфига (сброс кэша A/B)', () => {
      const { getRemoteConfigSignature } = require('../app/remote_flags');
      applyRemoteConfigSnapshot({ numbers: { force_update_enabled_rollout_pct: 10 } });
      const a = getRemoteConfigSignature();
      applyRemoteConfigSnapshot({ numbers: { force_update_enabled_rollout_pct: 80 } });
      expect(getRemoteConfigSignature()).not.toBe(a);
    });
  });

  describe('force-update', () => {
    it('флаг по умолчанию выключен, min_app_version пуст', () => {
      expect(isForceUpdateEnabled()).toBe(false);
      expect(getMinAppVersion()).toBe('');
    });

    describe('isVersionBelow (semver)', () => {
      it('строго ниже → true', () => {
        expect(isVersionBelow('1.2.2', '1.2.3')).toBe(true);
        expect(isVersionBelow('1.1.9', '1.2.0')).toBe(true);
        expect(isVersionBelow('0.9', '1.0.0')).toBe(true);
        expect(isVersionBelow('1.2', '1.2.1')).toBe(true); // недостающий сегмент = 0
      });
      it('равно или выше → false', () => {
        expect(isVersionBelow('1.2.3', '1.2.3')).toBe(false);
        expect(isVersionBelow('1.2.4', '1.2.3')).toBe(false);
        expect(isVersionBelow('2.0.0', '1.9.9')).toBe(false);
        expect(isVersionBelow('1.2.0', '1.2')).toBe(false); // 1.2.0 == 1.2
      });
      it('пустой/мусорный ввод → false (не блокируем при мусоре)', () => {
        expect(isVersionBelow('', '1.2.3')).toBe(false);
        expect(isVersionBelow('1.2.3', '')).toBe(false);
        expect(isVersionBelow('abc', '1.0.0')).toBe(false);
      });
    });

    describe('shouldForceUpdate', () => {
      it('блокирует только при enabled + заданной min + версии ниже', () => {
        expect(shouldForceUpdate({ enabled: true, currentVersion: '1.0.0', minVersion: '1.2.0' })).toBe(true);
      });
      it('выключенный флаг → не блокирует, даже если версия ниже', () => {
        expect(shouldForceUpdate({ enabled: false, currentVersion: '1.0.0', minVersion: '1.2.0' })).toBe(false);
      });
      it('пустая min_app_version → не блокирует (защита)', () => {
        expect(shouldForceUpdate({ enabled: true, currentVersion: '1.0.0', minVersion: '' })).toBe(false);
      });
      it('версия не ниже → не блокирует', () => {
        expect(shouldForceUpdate({ enabled: true, currentVersion: '1.3.0', minVersion: '1.2.0' })).toBe(false);
      });
    });

    describe('manual update modal', () => {
      it('normalizes mode to optional unless force is explicit', () => {
        expect(normalizeManualUpdateMode('force')).toBe('force');
        expect(normalizeManualUpdateMode('FORCE')).toBe('force');
        expect(normalizeManualUpdateMode('optional')).toBe('optional');
        expect(normalizeManualUpdateMode('')).toBe('optional');
      });

      it('normalizes platform to ios/android or both', () => {
        expect(normalizeManualUpdatePlatform('ios')).toBe('ios');
        expect(normalizeManualUpdatePlatform('ANDROID')).toBe('android');
        expect(normalizeManualUpdatePlatform('both')).toBe('');
        expect(normalizeManualUpdatePlatform('')).toBe('');
      });

      it('does not show without enabled flag or campaign_id', () => {
        expect(shouldShowManualUpdate({
          enabled: false,
          campaignId: 'upd-1',
          mode: 'optional',
          currentBuild: '1.0.0',
          targetBuild: '',
        })).toBe(false);
        expect(shouldShowManualUpdate({
          enabled: true,
          campaignId: '',
          mode: 'optional',
          currentBuild: '1.0.0',
          targetBuild: '',
        })).toBe(false);
      });

      it('respects optional platform targeting while keeping empty filter as both platforms', () => {
        expect(matchesManualUpdatePlatform({ platformFilter: '', platform: 'ios' })).toBe(true);
        expect(matchesManualUpdatePlatform({ platformFilter: '', platform: 'android' })).toBe(true);
        expect(matchesManualUpdatePlatform({ platformFilter: 'ios', platform: 'ios' })).toBe(true);
        expect(matchesManualUpdatePlatform({ platformFilter: 'ios', platform: 'android' })).toBe(false);
        expect(matchesManualUpdatePlatform({ platformFilter: 'android', platform: 'android' })).toBe(true);

        expect(shouldShowManualUpdate({
          enabled: true,
          campaignId: 'upd-ios',
          mode: 'optional',
          currentBuild: '1.0.0',
          targetBuild: '',
          platformFilter: 'ios',
          platform: 'android',
        })).toBe(false);
      });

      it('optional campaign shows once, force ignores local seen state', () => {
        expect(shouldShowManualUpdate({
          enabled: true,
          campaignId: 'upd-1',
          mode: 'optional',
          currentBuild: '1.0.0',
          targetBuild: '',
          seenCampaignIds: [],
        })).toBe(true);
        expect(shouldShowManualUpdate({
          enabled: true,
          campaignId: 'upd-1',
          mode: 'optional',
          currentBuild: '1.0.0',
          targetBuild: '',
          seenCampaignIds: ['upd-1'],
        })).toBe(false);
        expect(shouldShowManualUpdate({
          enabled: true,
          campaignId: 'upd-1',
          mode: 'force',
          currentBuild: '1.0.0',
          targetBuild: '',
          seenCampaignIds: ['upd-1'],
        })).toBe(true);
      });

      it('target_build stops the modal after the user reaches that build/version', () => {
        expect(shouldShowManualUpdate({
          enabled: true,
          campaignId: 'upd-1',
          mode: 'force',
          currentBuild: '1.5.43',
          targetBuild: '1.5.44',
        })).toBe(true);
        expect(shouldShowManualUpdate({
          enabled: true,
          campaignId: 'upd-1',
          mode: 'force',
          currentBuild: '1.5.44',
          targetBuild: '1.5.44',
        })).toBe(false);
        expect(shouldShowManualUpdate({
          enabled: true,
          campaignId: 'upd-1',
          mode: 'force',
          currentBuild: '81',
          targetBuild: '80',
        })).toBe(false);
      });

      it('snapshot enables manual update fields independently from min_app_version', () => {
        applyRemoteConfigSnapshot({
          bools: { manual_update_enabled: true },
          texts: {
            manual_update_campaign_id: 'upd-2026-06-26',
            manual_update_mode: 'force',
            manual_update_target_build: '1.5.44',
            manual_update_platform: 'ios',
          },
        });
        expect(isManualUpdateEnabled()).toBe(true);
        expect(getManualUpdateCampaignId()).toBe('upd-2026-06-26');
        expect(getManualUpdateMode()).toBe('force');
        expect(getManualUpdateTargetBuild()).toBe('1.5.44');
        expect(getManualUpdatePlatform()).toBe('ios');
        expect(getMinAppVersion()).toBe('');
      });
    });

    it('снапшот включает флаг и задаёт версию/ссылки', () => {
      applyRemoteConfigSnapshot({
        bools: { force_update_enabled: true },
        texts: { min_app_version: '2.0.0', store_url_ios: 'https://apps.apple.com/x', store_url_android: 'https://play.google.com/x' },
      });
      expect(isForceUpdateEnabled()).toBe(true);
      expect(getMinAppVersion()).toBe('2.0.0');
    });
  });

  describe('промо-баннер', () => {
    it('флаг по умолчанию выключен', () => {
      expect(isPromoBannerEnabled()).toBe(false);
    });

    describe('parsePromoUntilMs', () => {
      it('ISO-дата → ms', () => {
        expect(parsePromoUntilMs('2026-07-01')).toBe(Date.parse('2026-07-01'));
      });
      it('числовой ms-таймстамп', () => {
        expect(parsePromoUntilMs('1800000000000')).toBe(1800000000000);
      });
      it('пусто/мусор → null (бессрочно)', () => {
        expect(parsePromoUntilMs('')).toBeNull();
        expect(parsePromoUntilMs('завтра')).toBeNull();
      });
    });

    describe('shouldShowPromoBanner', () => {
      it('выключенный флаг → не показывать', () => {
        expect(shouldShowPromoBanner({ enabled: false, untilRaw: '', nowMs: 1000 })).toBe(false);
      });
      it('включён + срок не задан → показывать (бессрочно)', () => {
        expect(shouldShowPromoBanner({ enabled: true, untilRaw: '', nowMs: 1000 })).toBe(true);
      });
      it('включён + срок ещё не истёк → показывать', () => {
        expect(shouldShowPromoBanner({ enabled: true, untilRaw: '5000', nowMs: 1000 })).toBe(true);
      });
      it('включён + срок истёк → не показывать', () => {
        expect(shouldShowPromoBanner({ enabled: true, untilRaw: '1000', nowMs: 5000 })).toBe(false);
      });
    });

    describe('matchesPromoSegment (таргетинг)', () => {
      it('audience пусто/all → всем', () => {
        expect(matchesPromoSegment({ audience: '', isPremium: true, platformFilter: '', platform: 'ios' })).toBe(true);
        expect(matchesPromoSegment({ audience: 'all', isPremium: false, platformFilter: '', platform: 'ios' })).toBe(true);
      });
      it('free → только не-премиум', () => {
        expect(matchesPromoSegment({ audience: 'free', isPremium: false, platformFilter: '', platform: 'ios' })).toBe(true);
        expect(matchesPromoSegment({ audience: 'free', isPremium: true, platformFilter: '', platform: 'ios' })).toBe(false);
      });
      it('premium → только премиум', () => {
        expect(matchesPromoSegment({ audience: 'premium', isPremium: true, platformFilter: '', platform: 'ios' })).toBe(true);
        expect(matchesPromoSegment({ audience: 'premium', isPremium: false, platformFilter: '', platform: 'ios' })).toBe(false);
      });
      it('фильтр платформы', () => {
        expect(matchesPromoSegment({ audience: '', isPremium: false, platformFilter: 'ios', platform: 'ios' })).toBe(true);
        expect(matchesPromoSegment({ audience: '', isPremium: false, platformFilter: 'ios', platform: 'android' })).toBe(false);
      });
      it('неизвестная аудитория → показать (мягко, опечатка не прячет акцию)', () => {
        expect(matchesPromoSegment({ audience: 'vipx', isPremium: false, platformFilter: '', platform: 'ios' })).toBe(true);
      });
    });

    describe('shouldShowPromoBanner с таргетингом', () => {
      it('audience=free + премиум → не показывать (даже при включённом и в срок)', () => {
        expect(shouldShowPromoBanner({ enabled: true, untilRaw: '', nowMs: 1, audience: 'free', isPremium: true })).toBe(false);
      });
      it('audience=free + не-премиум → показывать', () => {
        expect(shouldShowPromoBanner({ enabled: true, untilRaw: '', nowMs: 1, audience: 'free', isPremium: false })).toBe(true);
      });
      it('platformFilter=android на ios → не показывать', () => {
        expect(shouldShowPromoBanner({ enabled: true, untilRaw: '', nowMs: 1, platformFilter: 'android', platform: 'ios' })).toBe(false);
      });
      it('без сегмент-параметров → как раньше (всем), обратная совместимость', () => {
        expect(shouldShowPromoBanner({ enabled: true, untilRaw: '', nowMs: 1 })).toBe(true);
      });
    });

    it('снапшот включает баннер и задаёт текст', () => {
      applyRemoteConfigSnapshot({
        bools: { promo_banner_enabled: true },
        texts: { promo_banner_text_ru: 'Скидка!', promo_banner_url: 'https://x', promo_banner_until: '' },
      });
      expect(isPromoBannerEnabled()).toBe(true);
    });

    describe('getPromoBannerText — локализация (фикс: не-ru языки НЕ получают русский)', () => {
      beforeEach(() => {
        applyRemoteConfigSnapshot({
          texts: { promo_banner_text_ru: 'Скидка', promo_banner_text_uk: 'Знижка', promo_banner_text_es: 'Oferta' },
        });
      });
      it('ru/uk/es → свой текст', () => {
        expect(getPromoBannerText('ru')).toBe('Скидка');
        expect(getPromoBannerText('uk')).toBe('Знижка');
        expect(getPromoBannerText('es')).toBe('Oferta');
      });
      it('pt-BR/vi/id/tr/pl → пусто (компонент покажет локализованный дефолт, не кириллицу)', () => {
        for (const l of ['pt-BR', 'vi', 'id', 'tr', 'pl']) {
          expect(getPromoBannerText(l)).toBe('');
        }
      });
    });
  });
});
