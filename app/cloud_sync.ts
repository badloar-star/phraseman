// ════════════════════════════════════════════════════════════════════════════
// cloud_sync.ts — Синхронизация прогресса с Firebase
//
// АКТИВАЦИЯ: когда добавишь Firebase Auth + Firestore:
//   1. npm install @react-native-firebase/auth @react-native-firebase/firestore
//   2. В config.ts: CLOUD_SYNC_ENABLED = true
//   3. Всё остальное работает автоматически
//
// Пока CLOUD_SYNC_ENABLED = false — все функции тихо возвращают без действий.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED, IS_STORE_RELEASE } from './config';
import { getUtcDayKey } from './local_date';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { getAuthUserId, getCanonicalUserId } from './user_id_policy';
import { processVipGrantForCelebration } from './vip_celebration_state';
import { invalidatePremiumCache } from './premium_guard';
import { getVipProgressState, parsePremiumProgressMs } from './premium_progress';
import { mergeStreakByActivityDate, normalizeDevSeededStreakValue, repairDevSeededStreakInStorage } from './streak_safety';
import { mergeActiveDays } from './friends_together/together_days';
import {
  ACHIEVEMENT_ACCESS_PLUS_PAID_KEY,
  ACHIEVEMENT_ACCESS_PRO_PAID_KEY,
  ACHIEVEMENT_FOUNDATION_PROGRESS_KEY,
  mergeFoundationProgressStorageValue,
} from './achievement_progress_v2';
import {
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
} from './intro_full_access_keys';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  GRANDFATHERED_THEMES_KEY,
  OWNED_THEMES_KEY,
  mergeOwnedThemesRestoreValue,
} from './theme_ownership_merge';
import { resumePendingShardDeltas } from './shards_system';
import { shardDeltaQueueStorageKey } from './shards_delta_queue';
import { resumePendingReportReplyShardClaims } from './app_messages';
import { getAuthLinkCacheTtlMs } from './remote_flags';
import {
  ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS,
  ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS,
} from './account_delete_timeout';
import {
  startAccountDeleteEnqueueWithDeadline,
  type AccountDeleteEnqueueOperation,
} from './account_delete_enqueue';
import {
  isAccountDeleteIdentityQuarantined as readAccountDeleteIdentityQuarantine,
  isAccountDeleteIdentityQuarantinedFromKnownState,
} from './account_delete_quarantine';
import {
  beginAccountGeneration,
  beginInitialAccountGeneration,
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
  withAccountTransitionLock,
  withRestoreApplicationLock,
} from './account_generation';
import { clearStableId, setStableId } from './stable_id';
import { resetAppSnapshotForAccountSwitch } from './app_snapshot_store';
import { emitAppEvent } from './events';
import { patchAppSnapshotFromAuthoritativeCloudProgress } from './app_snapshot_store';
// зачем: сброс кэша множителей XP при смене аккаунта — см. resetMultiplierBreakdownCache
// в xp_manager.ts (защита от утечки предыдущего аккаунта в PlayerProfileModal).
import { resetMultiplierBreakdownCache } from './xp_manager';
// зачем: сброс кэша состояния лиги предыдущего аккаунта при смене юзера — см.
// clearCachedLeagueStateSnapshot в league_open_cache_policy.ts (защита от утечки
// ранга/группы/участников лиги предыдущего аккаунта в club_screen).
import {
  clearCachedLeagueStateSnapshot,
  projectCloudLeagueStateSnapshot,
} from './league_open_cache_policy';
import {
  cloudSyncSnapshotValueMatches,
  encodeCloudSyncSnapshotRecord,
  encodeCloudSyncSnapshotValue,
} from './cloud_sync_snapshot_codec';
import {
  filterLegacyProgressForPhoneState,
  isPhoneStateCoreProgressKey,
} from '../modules/phone-state/cloud_boundary';
import { clearScreenSnapshots } from './screen_snapshot_store';
import {
  invalidatePersonalPlanStateCache,
  withPersonalPlanStateStorageLock,
} from './personal_plan_state';
import { withPlanXpLedgerStorageLock } from './personal_plan_xp_ledger';
import {
  isVipSnapshotStorageKey,
  readVipSnapshotForGeneration,
  VIP_STORAGE_KEYS,
  type VipStorageValues,
  writeVipSnapshotForGeneration,
} from './premium_vip_storage';
import {
  extractExamBestPctOverlay,
  publishExamBestPctOverlay,
} from './exam_best_pct_overlay';
import { DIAGNOSIS_TRAINING_IDS } from './personal_practice_training_ids';
import { XP_LEVEL_RESTORE_250_TO_400_KEY } from './xp_level_restore';
import { LEVEL_UP_ACCOUNT_LOCAL_KEYS } from './level_up_storage_keys';
import {
  CUSTOMIZATION_ACCOUNT_LOCAL_KEYS,
} from '../constants/customization_storage_keys';
import {
  clearCustomizationAccountLocalState,
  customizationAccountLocalKeysFrom,
  isCustomizationAccountLocalKey,
} from './customization_account_cleanup';
import {
  drainCustomizationSelectionOutbox,
  resolveCustomizationSelectionAuthority,
} from './customization_selection_journal';
import {
  commitPhoneStateCustomizationSelection,
  readPhoneStateCustomizationSelection,
} from './phone_state_economy_bridge';
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from '../modules/learning-v2/policies/decision_registry';
// зачем: экран «Сегодня» удалён (2026-08-03) вместе с lib/today, но ключ его
// истории остаётся на устройствах прежних версий. Держим его в списке очистки
// при смене аккаунта — иначе чужие данные переживут выход из аккаунта (тот же
// класс бага, что «чужие пиксели после смены аккаунта»).
const LEGACY_TODAY_ACCOUNT_STORAGE_KEYS = ['today_recommendation_history_v1'] as const;

/**
 * VIP restore is a monotonic entitlement merge. A locally committed Spin Plus
 * receipt is client-authored ordinary gameplay and an older cloud snapshot is
 * never allowed to revoke it. Lifetime access always dominates finite access.
 */
export function mergeCloudVipWithLocalSpinGrant(
  cloud: VipStorageValues,
  local: VipStorageValues | null,
): VipStorageValues {
  if (!local || local.vip_active !== 'true') return cloud;
  const localPlan = local.vip_plan.trim().toLowerCase();
  const localUntil = Math.max(0, Number(local.vip_until) || 0);
  const localLifetimePlan = localPlan === 'lifetime' || localPlan === 'pro_lifetime';
  const localLifetime = localUntil <= 0 || localLifetimePlan;
  const normalizedLocal = localLifetimePlan && localUntil > 0
    ? { ...local, vip_until: '0' }
    : local;
  const localSpinGrant = localPlan === 'level_spin';
  if (!localLifetime && !localSpinGrant) return cloud;

  const cloudPlan = cloud.vip_plan.trim().toLowerCase();
  const cloudUntil = Math.max(0, Number(cloud.vip_until) || 0);
  const cloudActive = cloud.vip_active === 'true';
  const cloudLifetimePlan = cloudPlan === 'lifetime' || cloudPlan === 'pro_lifetime';
  const cloudLifetime = cloudActive && (cloudUntil <= 0 || cloudLifetimePlan);
  if (cloudLifetime) return cloudLifetimePlan && cloudUntil > 0 ? { ...cloud, vip_until: '0' } : cloud;
  if (localLifetime || !cloudActive || localUntil > cloudUntil) return normalizedLocal;
  return cloud;
}

export async function writeMergedCloudVipSnapshot(
  generation: AccountGenerationToken,
  cloud: VipStorageValues,
  dependencies: Readonly<{
    read: typeof readVipSnapshotForGeneration;
    write: typeof writeVipSnapshotForGeneration;
  }> = Object.freeze({ read: readVipSnapshotForGeneration, write: writeVipSnapshotForGeneration }),
): Promise<boolean> {
  const stableId = generation.stableId?.trim();
  if (!stableId || !isCurrentAccountGeneration(generation, stableId)) return false;
  const local = await dependencies.read(generation);
  if (!isCurrentAccountGeneration(generation, stableId)) return false;
  return dependencies.write(generation, mergeCloudVipWithLocalSpinGrant(cloud, local));
}
import {
  achievementStateKey,
  achievementLessonPerfectPassesKey,
  comboAchievementCounterKey,
  communityPackCreateDraftKey,
  dailyPhraseAchievementReadCountKey,
  dailyPhraseAchievementSaveCountKey,
  customFlashcardsKey,
  diagnosticOpenFlagKey,
  diagnosticLastKey,
  fiftyFiftyUsageKey,
  flashcardsCommunityOwnedPacksKey,
  flashcardsAchievementFlipCountKey,
  flashcardsAchievementSavedCountKey,
  flashcardsAchievementSourceSetKey,
  flashcardsAchievementViewStreakKey,
  flashcardsDeleteHintSeenKey,
  flashcardsHiddenCommunityPacksKey,
  flashcardsMarketDevActivePackKey,
  flashcardsMarketDevOwnedPacksKey,
  flashcardsMarketplaceBuiltCardsCacheKey,
  flashcardsOpenedPacksKey,
  flashcardsOwnedPacksKey,
  flashcardsPackTrialGiftKey,
  flashcardsProgressKey,
  flashcardsSavedKey,
  flashcardsSwipeMemoryKey,
  flashcardsSwipeSessionDraftKey,
  grammarHintSeenKey,
  irregularVerbsGlobalKey,
  lastOpenedLessonKey,
  lessonBestScoreKey,
  lessonBonusHintsKey,
  lessonBonusGrantedKey,
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
  lessonIntroShownKey,
  lessonIrregularShardsGrantedKey,
  lessonListeningProgressKey,
  lessonPassCountKey,
  lessonPerfectMilestoneKey,
  lessonPrepositionProgressKey,
  lessonProgressKey,
  lessonSessionKey,
  lessonTheorySectionsSeenKey,
  lessonTheoryXpClaimedKey,
  lessonTopicShardGrantedKey,
  lessonUnlockRepairKey,
  lessonWordsShardsGrantedKey,
  lessonWordsKey,
  lingmanCertificateKey,
  levelExamKey,
  lingmanExamAvailableKey,
  masteryFinishedOnceKey,
  masteryReplayCountKey,
  personalPracticeFreeAccessKey,
  personalPracticeTrainingProgressKey,
  posMasteryKey,
  premiumCourseLevelKey,
  prepositionDrillPerfectKey,
  retiredCompetitiveModeStorageKeysForWipe,
  resolvedPersonalTrainingsKey,
  shareAchievementCounterKey,
  unlockedLessonsKey,
  userStatsKey,
  statsDailyBreakdownKey,
} from './target_storage_keys';
import {
  restoreMistakePracticeEvents,
  uploadMistakePracticeEvents,
} from './mistake_practice_cloud_transport';
import {
  LEGACY_FREE_LESSON_MIGRATION_COMPLETE,
  LEGACY_FREE_LESSON_MIN,
  migrateLegacyFreeLessonAccessForAllTargets,
  normalizeLegacyFreeLessonCap,
} from './legacy_free_lesson_access';
import { DebugLogger } from './debug-logger';

const FRENCH_SYNC_LESSON_IDS = Array.from({ length: 32 }, (_, index) => index + 1);
const FRENCH_SYNC_EXAM_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
const FRENCH_SYNC_PERFECT_MILESTONES = [5, 10, 15, 20, 25, 30] as const;
const FRENCH_SYNC_SOURCE_LOCALES = ['ru', 'uk'] as const;
const SYNC_STUDY_TARGETS = ['en', 'fr'] as const;
const LESSON_SESSION_FIELDS = ['cellIndex', 'phraseOrder', 'errorReplayQueue', 'errorReplaySince', 'errorReplayOverride'] as const;
const GRAMMAR_HINT_STORAGE_IDS = ['grammar_hint_articles', 'grammar_hint_some_any'] as const;

export const FRENCH_TARGET_SYNC_KEYS = [
  unlockedLessonsKey('fr'),
  legacyFreeLessonCapKey('fr'),
  legacyFreeLessonMigrationKey('fr'),
  premiumCourseLevelKey('fr'),
  lessonUnlockRepairKey('fr'),
  lastOpenedLessonKey('fr'),
  lingmanExamAvailableKey('fr'),
  lingmanCertificateKey('fr'),
  diagnosticLastKey('fr'),
  achievementStateKey('fr'),
  comboAchievementCounterKey('fr'),
  dailyPhraseAchievementReadCountKey('fr'),
  dailyPhraseAchievementSaveCountKey('fr'),
  shareAchievementCounterKey('fr'),
  userStatsKey('fr'),
  statsDailyBreakdownKey('fr'),
  irregularVerbsGlobalKey('fr'),
  posMasteryKey('fr'),
  flashcardsSavedKey('fr'),
  customFlashcardsKey('fr'),
  flashcardsCommunityOwnedPacksKey('fr'),
  flashcardsOwnedPacksKey('fr'),
  flashcardsMarketDevOwnedPacksKey('fr'),
  flashcardsProgressKey('fr'),
  flashcardsPackTrialGiftKey('fr'),
  flashcardsAchievementSavedCountKey('fr'),
  flashcardsAchievementFlipCountKey('fr'),
  flashcardsAchievementViewStreakKey('fr'),
  flashcardsAchievementSourceSetKey('fr'),
  flashcardsSwipeSessionDraftKey('fr'),
  flashcardsSwipeMemoryKey('fr'),
  ...FRENCH_SYNC_SOURCE_LOCALES.flatMap((sourceLocale) => [
    personalPracticeFreeAccessKey('fr', sourceLocale),
    resolvedPersonalTrainingsKey('fr', sourceLocale),
    ...DIAGNOSIS_TRAINING_IDS.map((id) => personalPracticeTrainingProgressKey(id, 'fr', sourceLocale)),
  ]),
  ...FRENCH_SYNC_LESSON_IDS.flatMap((lessonId) => [
    lessonBestScoreKey(lessonId, 'fr'),
    lessonPassCountKey(lessonId, 'fr'),
    lessonProgressKey(lessonId, 'fr'),
    lessonListeningProgressKey(lessonId, 'fr'),
    lessonWordsKey(lessonId, 'fr'),
    lessonWordsShardsGrantedKey(lessonId, 'fr'),
    lessonIrregularShardsGrantedKey(lessonId, 'fr'),
    lessonPrepositionProgressKey(lessonId, 'fr'),
    lessonTheorySectionsSeenKey(lessonId, 'fr'),
    lessonTheoryXpClaimedKey(lessonId, 'fr'),
    prepositionDrillPerfectKey(lessonId, 'fr'),
    lessonBonusGrantedKey(lessonId, 'fr'),
    masteryFinishedOnceKey(lessonId, 'fr'),
    masteryReplayCountKey(lessonId, 'fr'),
    achievementLessonPerfectPassesKey(lessonId, 'fr'),
  ]),
  ...FRENCH_SYNC_EXAM_LEVELS.flatMap((level) => [
    levelExamKey(level, 'passed', 'fr'),
    levelExamKey(level, 'available', 'fr'),
    levelExamKey(level, 'pct', 'fr'),
    levelExamKey(level, 'best_pct', 'fr'),
    levelExamKey(level, 'pass_count', 'fr'),
    levelExamKey(level, 'attempt_count', 'fr'),
    levelExamKey(level, 'medal_tier', 'fr'),
    lessonTopicShardGrantedKey(level, 'fr'),
  ]),
  ...FRENCH_SYNC_PERFECT_MILESTONES.map((count) => lessonPerfectMilestoneKey(count, 'fr')),
] as const;

function leagueResultSignature(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  try {
    const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!result || typeof result !== 'object') return null;
    const r = result as Record<string, unknown>;
    return JSON.stringify({
      prevLeagueId: r.prevLeagueId,
      newLeagueId: r.newLeagueId,
      myRank: r.myRank,
      totalInGroup: r.totalInGroup,
      promoted: r.promoted,
      demoted: r.demoted,
    });
  } catch {
    return null;
  }
}

// ── Ключи AsyncStorage которые синхронизируются с облаком ────────────────────
// Экспорт: тот же набор должен учитываться при сбросе локали после merge аккаунта (auth_provider).
const SEASON_COSMETICS_SYNC_KEY = 'season_cosmetics_v1';
/**
 * cards-2.0 (E4): ключи, которые при restore НЕЛЬЗЯ перетирать облаком (LWW) —
 * merge локального и облачного значения кастомной стратегией.
 * Стратегия чистая: (localRaw, cloudRaw) → строка для записи в AsyncStorage.
 */
function mergeActiveDaysRestoreValue(localRaw: string | null | undefined, cloudRaw: string): string {
  // зачем («Вместе», friends_together §2.1): active_days_v1 — история активных дней,
  // видна друзьям для подсчёта общих дней. LWW здесь недопустим — облачное значение
  // с другого устройства НЕ должно стирать дни, отмеченные локально на этом (и наоборот).
  // OR по датам, как и требует спецификация.
  let localState: { anchor: string; bits: string } | null = null;
  let cloudState: { anchor: string; bits: string } | null = null;
  try {
    const parsedLocal = localRaw ? JSON.parse(localRaw) as { anchor?: unknown; bits?: unknown } : null;
    if (parsedLocal && typeof parsedLocal.anchor === 'string' && typeof parsedLocal.bits === 'string') {
      localState = { anchor: parsedLocal.anchor, bits: parsedLocal.bits };
    }
  } catch (e) {
      // локальное значение повреждено — считаем пустым
      DebugLogger.error('cloud_sync:parsedLocal', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  try {
    const parsedCloud = JSON.parse(cloudRaw) as { anchor?: unknown; bits?: unknown };
    if (parsedCloud && typeof parsedCloud.anchor === 'string' && typeof parsedCloud.bits === 'string') {
      cloudState = { anchor: parsedCloud.anchor, bits: parsedCloud.bits };
    }
  } catch (e) {
      // облачное значение повреждено — считаем пустым
      DebugLogger.error('cloud_sync:parsedCloud', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  const merged = mergeActiveDays(localState, cloudState);
  if (!merged.anchor) return localRaw ?? cloudRaw;
  return JSON.stringify(merged);
}

const FC_RESTORE_MERGE_STRATEGIES: Record<
  string,
  (localRaw: string | null | undefined, cloudRaw: string) => string
> = {
  // Cards 2.1 §3: звёзды раздела карточек удалены — ключей `fc_stars_v1` /
  // `fc_deck_best_stars_v1` больше нет ни в SYNC_KEYS, ни в merge-стратегиях.
  // «Вместе»: active_days_v1 мержится OR по датам между устройствами (см. функцию выше).
  active_days_v1: mergeActiveDaysRestoreValue,
  [ACHIEVEMENT_FOUNDATION_PROGRESS_KEY]: mergeFoundationProgressStorageValue,
  // зачем: темы, купленные за жемчуг, и темы «дедушек» — списки, которые только
  // растут. Перезапись облаком стёрла бы покупку, сделанную на другом устройстве
  // (человек потерял бы 200 жемчужин), поэтому мержим объединением.
  [OWNED_THEMES_KEY]: mergeOwnedThemesRestoreValue,
  [GRANDFATHERED_THEMES_KEY]: mergeOwnedThemesRestoreValue,
};

export const SYNC_KEYS = [
  // ── Идентичность и базовый прогресс ────────────────────────────────────────
  'user_total_xp',
  'user_prev_xp',
  // Server-confirmed survey completion timestamp; restored locally, never uploaded by clients.
  'shard_survey_last_at_ms',
  // XP-01: Weekly XP tracking — synced so users/{uid}.progress.weekly_xp matches device.
  'weekly_xp',
  'weekly_xp_period_start',
  'user_name',
  'user_avatar',
  'user_frame',
  'user_avatar_aura',
  'custom_avatar_owned_v1',
  'custom_avatar_gift_owned_v1',
  'avatar_aura_owned_v1',
  'avatar_aura_gift_owned_v1',
  SEASON_COSMETICS_SYNC_KEY,
  // Команда админки на разовое изменение энергии (обнулить/налить). Клиент применяет
  // её один раз по метке at (см. energy_system.applyAdminEnergyCommand) — energy_state
  // остаётся client-owned, команда лишь одноразовый триггер из облака на устройство.
  'admin_energy_command',
  // «Сокровищница»: server-owned (см. SERVER_OWNED_PROGRESS_KEYS) — в SYNC_KEYS
  // только ради restoreFromCloud; в исходящий патч не попадают.
  'collectibles_owned_v1',
  'collectibles_state_v1',
  'profile_card_level',
  'profile_card_theme',
  'profile_card_motion',
  'profile_card_public_focus',
  'gift_xp_bank_v1',
  'streak_count',
  'last_active_date',
  'streak_last_date',
  // «Вместе» (friends_together §2.1): история активных дней (для подсчёта "дней вместе"
  // с друзьями — OR-мерж между устройствами, см. FC_RESTORE_MERGE_STRATEGIES) и
  // настройка пуша "Позвать" (обычный LWW — это просто тумблер с tz).
  'active_days_v1',
  'friends_push_v1',
  // ── Мультиязычность: начатые языки + ответы мини-онбординга языка ─────────
  // (гейт «1 язык фри»; см. app/study_languages.ts)
  'study_languages_started_v1',
  'language_profile_v1::en',
  'language_profile_v1::fr',
  'unlocked_lessons',
  legacyFreeLessonCapKey('en'),
  legacyFreeLessonMigrationKey('en'),
  'flashcards',
  'flashcards_v1',
  'achievements_state',
  // ── Прогресс достижений (отдельные счётчики до момента unlock) ───────────
  'helpful_error_reports_confirmed_v1',
  'achievement_daily_phrase_read_count',
  'achievement_daily_phrase_save_count',
  'achievement_flashcards_saved_count',
  'achievement_flashcards_flip_count',
  'achievement_flashcards_view_streak_v1',
  'achievement_flashcards_source_set_v1',
  'achievement_shards_spent_total',
  'achievement_energy_refill_count',
  'achievement_league_boost_count',
  'achievement_gift_sent_count',
  ACHIEVEMENT_FOUNDATION_PROGRESS_KEY,
  ACHIEVEMENT_ACCESS_PLUS_PAID_KEY,
  ACHIEVEMENT_ACCESS_PRO_PAID_KEY,
  'onboarding_done',
  'lang',
  'app_lang',

  // ── Лига / еженедельные очки ───────────────────────────────────────────────
  'league_state_v3',
  // Server-side weekly rollover writes this so the Monday result modal survives
  // cloud restore before the local league engine has a chance to recalculate.
  'league_result_pending',
  // Tombstone for the exact league result already dismissed on this account.
  'league_result_consumed_sig',
  'week_leaderboard',
  // КРИТИЧНО: реальный счётчик недельных очков для лиги (formula: members.{uid}.points).
  // Если не синкать — после очистки AsyncStorage недельные очки в league_groups
  // обнуляются и юзер падает на дно таблицы. См. leaderboard backfill в
  // functions/src/sync_leaderboard.ts (читает progress.week_points_v2).
  'week_points_v2',
  'login_bonus_v1',
  /** Опыт по дням (график статистики) — без синка теряется на новом устройстве. */
  'daily_stats',
  // ── Премиум и его плюшки (без них юзер теряет купленные/активные бенефиты) ─
  'premium_plan',
  'admin_premium_override',
  /** UNIX ms когда истекает премиум; 0 или отсутствует = без срока (как оплаченная подписка в RC) */
  'premium_expiry',
  'premium_rc_product_id',
  'premium_rc_period_type',
  'premium_rc_store',
  'premium_rc_expiry_ms',
  'premium_rc_purchased_at_ms',
  'premium_rc_updated_at',
  'premium_admin_grant_at',
  'vip_active',
  'vip_plan',
  'vip_from',
  'vip_until',
  'vip_admin_override',
  'vip_admin_grant_at',
  'had_premium_ever',
  'streak_freeze',
  'premium_free_freeze_used',
  'chain_shield',
  'gift_xp_multiplier',
  flashcardsPackTrialGiftKey('en'),
  'club_gift_free_boost_v1',
  // Анти-повтор премиум pack-unlock подарков уровня: без синка при смене
  // устройства один и тот же набор мог выпасть повторно.
  'level_premium_pack_unlock_gifts_v1',
  'level_up_shown_levels_v1',
  'wager_discount',
  'wager_discount_uses_v1',
  'league_chest_energy_override_v1',
  'league_chest_xp_override_v1',
  'league_gold_theme_unlocked_v1',
  'league_gold_theme_unlocked_at',

  // ── Зачёты уровней A1/A2/B1/B2 (без них unlock B1/B2 откатывается) ─────────
  'level_exam_A1_passed',
  'level_exam_A2_passed',
  'level_exam_B1_passed',
  'level_exam_B2_passed',
  'level_exam_A1_pct',
  'level_exam_A2_pct',
  'level_exam_B1_pct',
  'level_exam_B2_pct',
  'level_exam_A1_best_pct',
  'level_exam_A2_best_pct',
  'level_exam_B1_best_pct',
  'level_exam_B2_best_pct',
  'level_exam_A1_pass_count',
  'level_exam_A2_pass_count',
  'level_exam_B1_pass_count',
  'level_exam_B2_pass_count',
  'level_exam_A1_attempt_count',
  'level_exam_A2_attempt_count',
  'level_exam_B1_attempt_count',
  'level_exam_B2_attempt_count',

  // ── Финальный экзамен Лингмана: сертификат (объект JSON c именем, score, certId) ─
  // Без синка после переустановки сертификат пропадёт, и юзер не увидит свой
  // диплом, хотя зачёты A1..B2 и звёзды уроков остаются. См. exam_certificate.ts.
  lingmanCertificateKey('en'),

  // ── Карточки (юзерская библиотека + покупки) ───────────────────────────────
  'custom_flashcards_v2',
  'flashcards_progress_v1',
  'flashcards_owned_packs_v1',
  'community_owned_pack_ids_v1',
  irregularVerbsGlobalKey('en'),

  // ── Осколки: дополнительные ключи (баланс/история — отдельный канал) ───────
  // Сам баланс (shards) живёт в users/{uid}.shards и грузится через
  // loadShardsFromCloud(); здесь только защита от повтора single-time событий
  // и служебные маркеры разовых событий.
  'shards_one_time_events',

  // ── UI / поведение ─────────────────────────────────────────────────────────
  // app_theme / app_font_size / haptics_tap — только локально на устройстве (см. wipeLocalAccountData KEEP).
  // Синк с облаком ломал тему: при restore облако перетирало выбор пользователя старым progress.
  // зачем: САМА выбранная тема остаётся локальной (см. выше), но СПИСОК КУПЛЕННЫХ
  // за жемчуг тем синхронизируется — это потраченная валюта, терять её при
  // переустановке/переезде нельзя. Конфликта, который сломал `app_theme`, здесь
  // быть не может: список только растёт и мержится объединением.
  OWNED_THEMES_KEY,
  GRANDFATHERED_THEMES_KEY,
  'user_settings',
  /** Last diagnostic result: date, score and recommended level. */
  'diagnostic_last',
  'device_platform',
  'app_version',
  'user_stats_v1',
  'xp_migration_v2',
  XP_LEVEL_RESTORE_250_TO_400_KEY,
  'week_points_migrated_v1',

  // ── Время в приложении (foreground) — график «Время в приложении» ─────────
  'phraseman_foreground_usage_ms_v1',
  'phraseman_foreground_daily_ms_v1',

  // ── Блок «Весь путь» / метрики статистики (локально накапливаются) ─────────
  'shards_lifetime_earned_v1',
  'shards_lifetime_spent_v1',
  /** Посуточные счётчики для графиков «Весь путь» (JSON { дата → метрики }). */
  'stats_daily_breakdown_v1',
  // Персональный маршрут — durable account progress. These keys must survive a
  // reinstall/account restore; pending activation and per-device runtime remain local.
  'personal_plan_state_v1',
  'personal_plan_progress_v1',
  'personal_plan_completed_tasks_v1',
  'personal_plan_task_progress_v1',
  'personal_plan_xp_ledger_v1',

  // ── Уроки 1..32 (per-lesson) ───────────────────────────────────────────────
  // КРИТИЧНО: lesson{N}_best_score нужен для медалек уроков и для гейта зачёта
  // A1/A2/B1/B2 (требует ≥4.5★ на каждом уроке уровня) и Лингмана (5.0★).
  // Без синка на новом устройстве у юзера откроются все уроки (через unlocked_lessons),
  // но звёзды/медали будут пустые и зачёт сдать он не сможет.
  // pass_count — счётчик количества прохождений для статистики и медалек.
  // progress / listening / words — чтобы фразы и словарь переживали смену устройства
  // (payload ~десятки–сотни KB; в пределах лимита Firestore merge).
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_best_score`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_pass_count`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_listening_progress`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_words`),
  ...Array.from({ length: 32 }, (_, i) => lessonTheorySectionsSeenKey(i + 1, 'en')),
  ...Array.from({ length: 32 }, (_, i) => lessonTheoryXpClaimedKey(i + 1, 'en')),
  ...Array.from({ length: 32 }, (_, i) => achievementLessonPerfectPassesKey(i + 1, 'en')),
  ...FRENCH_TARGET_SYNC_KEYS,
  // ── Подарочный доступ intro: зеркалим срок в облако, чтобы при смене
  //    телефона / переустановке подарок не терялся и восстанавливался (Д2-фикс).
  //    Зеркалим И started, И ends (getIntroFullAccessState требует оба). ВНИМАНИЕ: это
  //    лёгкий вариант (анти-потеря). Это НЕ серверная защита от ручного продления —
  //    клиент всё ещё может переписать срок локально; для бесплатного подарка риск
  //    низкий. Полную защиту (CF-выдача + blocked-ключи) делать отдельно.
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
  // ── Claim-маркеры модальных бонусов (Mystery Monday / Comeback / Perfect Week).
  //    Зеркалим в облако, чтобы переустановка / смена устройства не давала повторно
  //    забрать недельную/разовую награду (анти-фарм переустановкой, аудит P2 #12).
  //    Это лёгкий вариант: маркер «уже забрано» переживает реинсталл. Полную серверную
  //    идемпотентность (CF reward_claims/{periodId}) делать отдельно.
  'boon_mystery_monday_claimed_v1',
  'boon_comeback_granted_v1',
  'boon_perfect_week_claimed_v1',
  // Day-guard бесплатного streak-saver: чтобы переустановка не давала повторную
  // бесплатную заморозку серии в тот же день (аудит P2 #14).
  'boon_granted_streak_saver_v1',
] as const;

export function getRuntimeSyncKeys(keys: readonly unknown[] = SYNC_KEYS): string[] {
  const safe: string[] = [];
  const bad: Array<{ index: number; key: unknown }> = [];
  keys.forEach((key, index) => {
    if (typeof key === 'string' && key.length > 0) {
      safe.push(key);
    } else {
      bad.push({ index, key });
    }
  });
  if (typeof __DEV__ !== 'undefined' && __DEV__ && bad.length > 0) {
    console.warn('[cloud_sync] skipped invalid sync key(s)', bad);
  }
  return safe;
}

const RETIRED_ROUTE_ACCOUNT_LOCAL_FIXED_KEYS = [
  'personal_plan_attempt_events_v1',
  'personal_plan_counted_phrases_v1',
  'personal_plan_recovery_applied_actions_v1',
  'personal_plan_onboarding_nickname_pending_v1',
  'personal_plan_pending_activation_v1',
  'plan_day_shard_rewards_v1',
] as const;

const ACCOUNT_LOCAL_KEY_PREFIXES = [
  'mistake_practice_v2::',
  'personal_plan_day_runtime_v1:',
  'learning_v2_lesson1_progress:',
  'learning_v2_progress:',
  'v2:outbox:v1:',
  'v2:outbox:v2:',
  'v2:required-session-local-commit:v1:',
  'v2:required-session-local-commit:v2:',
  'v2:required-session-local-commit:v3:',
  'v2:required-session-local-commit-index:v1:',
  'v2:required-session-completion-receipt:v1:',
  'v2:required-session-completion-scheduler:v1:',
  'learning_v2_owner_repository:v1:',
  'learning_v2_coin_exchange_outbox:v1:',
  // Client-authoritative pearl journal and its crash/sync bookkeeping.
  'client_shard_operation_v1:',
  'client_shard_ledger_state_v1:',
  'client_shard_prepared_v1:',
  'client_shard_grant_receipt_v1:',
  'client_shard_cloud_synced_v1:',
  'client_shard_conflict_v1:',
  'client_shard_phone_state_outbox_v1:',
  'client_shard_semantic_paid_v1:',
  // Owner-scoped level-Spin star composite journal and local projection.
  'level_spin_star_grant_outbox_v1:',
  'level_spin_star_projection_v1:',
  'level_spin_star_prepared_v1:',
  'level_spin_star_operation_v1:',
  'paid_level_spin_envelope_v1:',
  'paid_level_spin_outbox_v1:',
  'practice_rune_journal_v1:',
  // Permanent attempt-restore gift journal and crash-safe reservations.
  'attempt_restore_gift_projection_v1:',
  'attempt_restore_gift_outbox_v1:',
  'attempt_restore_gift_prepared_credit_v1:',
  'attempt_restore_gift_prepared_consume_v1:',
  'attempt_restore_gift_operation_v1:',
  'session_attempts_state_v1:',
  'session_attempt_recovery_prepared_v1:',
  'session_attempt_recovery_receipt_v1:',
  'session_attempt_recovery_sync_outbox_v1:',
  'customization_rune_purchase_outbox_v1:',
  'customization_selection_operation_v1:',
  'customization_selection_head_v1:',
  'customization_selection_outbox_v1:',
  'customization_selection_quarantine_v1:',
  'external_economy_result_v1:',
  'external_economy_event_applied_v1:',
] as const;

function isLearningV2AccountLocalKey(key: string): boolean {
  return (RETIRED_ROUTE_ACCOUNT_LOCAL_FIXED_KEYS as readonly string[]).includes(key)
    || ACCOUNT_LOCAL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

async function listAllAccountLocalStorageKeys(): Promise<string[]> {
  try {
    return [...await AsyncStorage.getAllKeys()];
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[cloud_sync] account-local key scan failed', e);
    }
    // Preserve the established fail-closed error contract used by account
    // switch and clean-install recovery callers.
    throw new Error('learning_v2_account_key_scan_failed');
  }
}

function learningV2AccountLocalKeysFrom(allKeys: readonly string[]): string[] {
  return Array.from(new Set([
    ...RETIRED_ROUTE_ACCOUNT_LOCAL_FIXED_KEYS,
    ...allKeys.filter(isLearningV2AccountLocalKey),
  ]));
}

async function listLearningV2AccountLocalKeys(): Promise<string[]> {
  return learningV2AccountLocalKeysFrom(await listAllAccountLocalStorageKeys());
}

async function collectAccountLocalDataKeys(): Promise<string[]> {
  const allKeys = await listAllAccountLocalStorageKeys();
  return Array.from(new Set([
    ...accountLocalDataKeysForToday(),
    ...learningV2AccountLocalKeysFrom(allKeys),
    ...customizationAccountLocalKeysFrom(allKeys),
    ...allKeys.filter(isVipSnapshotStorageKey),
  ]));
}

export function accountLocalDataKeysForToday(todayKey: string = getUtcDayKey()): string[] {
  const localOnlyTargetKeys = SYNC_STUDY_TARGETS.flatMap((target) => [
    fiftyFiftyUsageKey(todayKey, target),
    lessonBonusHintsKey(todayKey, target),
    diagnosticOpenFlagKey(target),
    ...retiredCompetitiveModeStorageKeysForWipe(target),
    irregularVerbsGlobalKey(target),
    lingmanCertificateKey(target),
    flashcardsMarketplaceBuiltCardsCacheKey(target),
    flashcardsMarketDevActivePackKey(target),
    flashcardsCommunityOwnedPacksKey(target),
    flashcardsHiddenCommunityPacksKey(target),
    flashcardsOwnedPacksKey(target),
    flashcardsMarketDevOwnedPacksKey(target),
    flashcardsOpenedPacksKey(target),
    flashcardsPackTrialGiftKey(target),
    flashcardsDeleteHintSeenKey(target),
    communityPackCreateDraftKey(target, 'ru'),
    ...(target === 'fr' ? [communityPackCreateDraftKey(target, 'uk')] : []),
    ...GRAMMAR_HINT_STORAGE_IDS.map((id) => grammarHintSeenKey(id, target)),
    ...Array.from({ length: 32 }, (_, index) => index + 1).flatMap((lessonId) => [
      lessonIntroShownKey(lessonId, target),
      ...LESSON_SESSION_FIELDS.map((field) => lessonSessionKey(lessonId, field, target)),
    ]),
  ]);

  return Array.from(new Set([
    ...getRuntimeSyncKeys(),
    // Доп. ключи которые синкаются под другими именами или субколлекциями:
    'achievements_v1', // мапится на achievements_state
    'shard_survey_done_daykey_v1',
    // Шарды: баланс и служебные (баланс перетянется loadShardsFromCloud,
    // но для нового аккаунта он стартует с 0).
    'shards_balance',
    // Bookkeeping синка (новый stable_id = новая история синка)
    LAST_SYNC_SNAPSHOT_KEY,
    CREATED_AT_SYNC_KEY,
    STABLE_AUTH_LINK_CACHE_KEY,
    'cloud_migration_v1',
    // Кэши лидербордов (содержат предыдущего юзера)
    'global_lb_cache',
    'leaderboard_cache_v1',
    'last_known_league_rank',
    'league_result_pending',
    'week_leaderboard',
    // Прочее account-level
    'last_active_date',
    'user_profile',
    'generated_nickname_pending_v1',
    'generated_name_confirmed_v1',
    // Производный display-флаг реального премиума (НЕ в SYNC_KEYS, пересчитывается
    // резолвером). Чистим при смене/сбросе аккаунта, чтобы старое premium_active='true'
    // не перетекло к новому аккаунту до первого пересчёта доступа.
    'premium_active',
    'comeback_active',
    'comeback_pending',
    'bug_hunt_shown',
    'flashcard_anim_pending',
    'energy_state',
    'energy_onboarding_shown',
    'daily_treasure_state',
    'install_date',
    'login_bonus_v1',
    'last_opened_lesson',
    ...RETIRED_ROUTE_ACCOUNT_LOCAL_FIXED_KEYS,
    ...CUSTOMIZATION_ACCOUNT_LOCAL_KEYS,
    ...LEVEL_UP_ACCOUNT_LOCAL_KEYS,
    ...LEGACY_TODAY_ACCOUNT_STORAGE_KEYS,
    ...localOnlyTargetKeys,
  ]));
}
const CREATED_AT_SYNC_KEY = 'cloud_created_at_synced_v1';
const LAST_SYNC_SNAPSHOT_KEY = 'cloud_last_sync_snapshot_v1';

// Device-owned ключи: принадлежат ТЕКУЩЕМУ устройству, пишутся заново при каждом
// запуске (_layout.tsx) и исключены из restore (см. app_version/device_platform выше).
// Их облачные значения НЕ должны попадать в diff-снапшот при restore: иначе diff
// решит, что версия уже синкнута, и свежая локальная версия НЕ уедет — в админке
// залипает старая app_version. Исключая их из снапшота, мы гарантируем, что
// свежее локальное значение уйдёт ближайшим ОБЫЧНЫМ синком (без лишних записей).
const DEVICE_OWNED_SNAPSHOT_EXCLUDE_KEYS = ['app_version', 'device_platform'] as const;

/**
 * Снапшот diff-базы после restore: копия облачных данных БЕЗ device-owned ключей,
 * чтобы их свежие локальные значения гарантированно попали в следующий diff-патч.
 */
function buildRestoreSnapshot(
  cloudData: Record<string, string | null>,
): Record<string, string | null> {
  const snapshot: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(cloudData)) {
    if ((DEVICE_OWNED_SNAPSHOT_EXCLUDE_KEYS as readonly string[]).includes(key)) continue;
    // undefined в diff-снапшот класть нельзя: Firestore не хранит undefined, но
    // cloudData по пути restore мутируется — защищаемся, чтобы undefined-значение
    // не «залипло» в снапшоте и не сломало последующее сравнение previousSnapshot.
    if (value === undefined) continue;
    snapshot[key] = encodeCloudSyncSnapshotValue(value);
  }
  return snapshot;
}
const STABLE_AUTH_LINK_CACHE_KEY = 'stable_auth_link_cache_v1';
const ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY = 'account_switch_emergency_backup_latest_v1';
const ACCOUNT_SWITCH_BACKUP_PAGE_PREFIX = 'account_switch_emergency_backup_page_v1:';
const ACCOUNT_SWITCH_BACKUP_PAGE_MAX_PAIRS = 64;
const ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES = 512 * 1024;
const ACCOUNT_SWITCH_BACKUP_MAX_PAGES = 512;
const ACCOUNT_SWITCH_BACKUP_MAX_PAIRS =
  ACCOUNT_SWITCH_BACKUP_MAX_PAGES * ACCOUNT_SWITCH_BACKUP_PAGE_MAX_PAIRS;
const ACCOUNT_SWITCH_BACKUP_MAX_TOTAL_UTF8_BYTES = 128 * 1024 * 1024;

type PreviousAccountSwitchBackupIdentity = Readonly<{
  stableId: string;
  backupId: string | null;
}>;

function parsePreviousAccountSwitchBackupIdentity(
  raw: string,
): PreviousAccountSwitchBackupIdentity | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if ((parsed.version === 1 || parsed.version === 2) &&
      typeof parsed.stableId === 'string' && parsed.stableId.length > 0 &&
      Array.isArray(parsed.pairs)) {
      return Object.freeze({ stableId: parsed.stableId, backupId: null });
    }
    if (parsed.version !== 3 ||
      parsed.schemaVersion !== 'account-switch-emergency-backup.v3' ||
      typeof parsed.backupId !== 'string' || !/^[a-z0-9-]{3,80}$/.test(parsed.backupId) ||
      typeof parsed.stableId !== 'string' || parsed.stableId.length === 0 ||
      !Number.isSafeInteger(parsed.createdAt) || Number(parsed.createdAt) < 0 ||
      typeof parsed.reason !== 'string' || parsed.reason.length > 80 ||
      !Number.isSafeInteger(parsed.pageCount) || Number(parsed.pageCount) < 0 ||
      Number(parsed.pageCount) > ACCOUNT_SWITCH_BACKUP_MAX_PAGES ||
      !Number.isSafeInteger(parsed.pairCount) || Number(parsed.pairCount) < 0 ||
      Number(parsed.pairCount) > ACCOUNT_SWITCH_BACKUP_MAX_PAIRS ||
      !Number.isSafeInteger(parsed.totalUtf8Bytes) || Number(parsed.totalUtf8Bytes) < 0 ||
      Number(parsed.totalUtf8Bytes) > ACCOUNT_SWITCH_BACKUP_MAX_TOTAL_UTF8_BYTES ||
      (parsed.lastPageFingerprint !== null &&
        (typeof parsed.lastPageFingerprint !== 'string' ||
          !/^[a-f0-9]{64}$/.test(parsed.lastPageFingerprint))) ||
      !Number.isSafeInteger(parsed.requiredSessionReceiptCount) ||
      Number(parsed.requiredSessionReceiptCount) < 0 ||
      typeof parsed.manifestFingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(parsed.manifestFingerprint) ||
      Reflect.ownKeys(parsed).length !== 12) return null;
    const { manifestFingerprint, ...body } = parsed;
    if (hashCanonicalBody(body) !== manifestFingerprint || canonicalJsonV1(parsed) !== raw ||
      (Number(parsed.pageCount) === 0) !== (parsed.lastPageFingerprint === null)) return null;
    return Object.freeze({ stableId: parsed.stableId, backupId: parsed.backupId });
  } catch {
    return null;
  }
}

async function readAccountSwitchBackupRowsExactly(
  keys: readonly string[],
  errorCode: string,
): Promise<readonly (readonly [string, string | null])[]> {
  const rows = await AsyncStorage.multiGet([...keys]);
  if (rows.length !== keys.length || rows.some((row, index) =>
    !Array.isArray(row) || row.length !== 2 || row[0] !== keys[index] ||
    (row[1] !== null && typeof row[1] !== 'string'))) {
    throw new Error(errorCode);
  }
  return rows;
}
const DEFAULT_STABLE_AUTH_LINK_CACHE_TTL_MS = 7 * 24 * 60 * 60_000;
/** Ожидание чужого syncInFlight без лимита оставляло «Сменить аккаунт» на вечном спиннере при «зависшем» Firestore. */
const FORCE_SYNC_WAIT_INFLIGHT_MS = 25_000;
const FORCE_SYNC_FIRESTORE_WRITE_MS = 35_000;
const RESTORE_FIRESTORE_READ_MS = 15_000;
const ANON_AUTH_READY_TIMEOUT_MS = 20_000;
const SYNC_DEBOUNCE_MS = 5 * 60_000;
const SYNC_HEARTBEAT_MS = 60 * 60_000;
const ACTIVITY_STAMP_INTERVAL_MS = 45 * 60_000;
const STABLE_AUTH_LINK_TIMEOUT_MS = 12_000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;
let pendingSync = false;
let lastSuccessfulSyncAt = 0;
let lastActivityStampAt = 0;

function phoneStateOwnsCoreProgress(stableUid: string | null): boolean {
  if (!stableUid) return false;
  try {
    // Lazy require avoids cloud_sync -> xp_manager -> PhoneState cutover startup cycles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cutover = require('./phone_state_progress_cutover') as
      typeof import('./phone_state_progress_cutover');
    return cutover.isPhoneStateCutoverEnabled(stableUid);
  } catch {
    return false;
  }
}

export type CloudAccessFailureReason =
  | 'app_check_unavailable'
  | 'identity_unavailable'
  | 'transport_unavailable';

export type StableAuthLinkFailure = CloudAccessFailureReason | 'stable_id_mismatch' | 'identity_retired';

export type StableAuthLinkEnsureResult = {
  ok: boolean;
  requestedStableId: string;
  stableUid: string | null;
  authUid: string | null;
  source: 'disabled' | 'cache' | 'callable' | 'unavailable';
  failure?: StableAuthLinkFailure;
  retiredSubject?: 'stable' | 'auth' | 'closure' | 'unknown';
};

export type StableAuthLinkMetadata = {
  provider?: 'google' | 'apple';
  email?: string | null;
  displayName?: string | null;
  lastSignInAt?: number;
  devicePlatform?: 'ios' | 'android' | 'web';
};

let stableAuthLinkPromise: Promise<StableAuthLinkEnsureResult> | null = null;
let stableAuthLinkKey = '';

function classifyCloudAccessFailure(
  error: unknown,
  appCheckReady: boolean,
): StableAuthLinkFailure {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error).toLowerCase();
  const combined = `${code} ${message}`;
  if (combined.includes('identity_retired') || combined.includes('account_delete_pending')) {
    return 'identity_retired';
  }
  if (combined.includes('stable_id_mismatch')) return 'stable_id_mismatch';
  if (combined.includes('auth_required')) return 'identity_unavailable';

  const explicitlyAppCheck = combined.includes('app check') || combined.includes('appcheck');
  const missingAttestationLikely = code.includes('unauthenticated');
  if (explicitlyAppCheck || (!appCheckReady && missingAttestationLikely)) {
    return 'app_check_unavailable';
  }

  if (
    code.includes('unavailable')
    || code.includes('deadline-exceeded')
    || code.includes('network-request-failed')
    || combined.includes('timeout')
    || combined.includes('network')
  ) {
    return 'transport_unavailable';
  }
  return 'identity_unavailable';
}

function classifyRetiredIdentitySubject(
  error: unknown,
): 'stable' | 'auth' | 'closure' | 'unknown' {
  const details = (error as { details?: unknown })?.details;
  const subject = details && typeof details === 'object'
    ? (details as { subject?: unknown }).subject
    : undefined;
  return subject === 'stable' || subject === 'auth' || subject === 'closure'
    ? subject
    : 'unknown';
}

async function readStableAuthLinkCache(key: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STABLE_AUTH_LINK_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { key?: unknown; linkedAt?: unknown };
    const linkedAt = typeof parsed.linkedAt === 'number' ? parsed.linkedAt : 0;
    const ttlMs = Math.max(60_000, getAuthLinkCacheTtlMs() || DEFAULT_STABLE_AUTH_LINK_CACHE_TTL_MS);
    return parsed.key === key && linkedAt > 0 && Date.now() - linkedAt < ttlMs;
  } catch {
    return false;
  }
}

async function writeStableAuthLinkCache(key: string): Promise<void> {
  await AsyncStorage.setItem(STABLE_AUTH_LINK_CACHE_KEY, JSON.stringify({ key, linkedAt: Date.now() }));
}

function isJestRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
}

function setCloudSyncTimer(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
  const timer = setTimeout(callback, ms);
  (timer as any)?.unref?.();
  return timer;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`forceSyncToCloud:${label}`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

// ── Lazy getters — грузятся только если пакеты установлены ───────────────────
const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseProgressInt = (value: unknown): number => {
  const n = parseInt(String(value ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
};

const parseProgressFloat = (value: unknown): number => {
  const n = parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const msFromDateKey = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  if (!isDateKey(value)) return null;
  const ms = Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  );
  return Number.isFinite(ms) ? ms : null;
};

const dayDiffFromNow = (value: unknown): number | null => {
  const dateMs = msFromDateKey(value);
  if (dateMs == null) return null;
  const todayMs = msFromDateKey(new Date().toISOString().slice(0, 10));
  if (todayMs == null) return null;
  return Math.round((todayMs - dateMs) / DAY_MS);
};

const isSuspiciousLocalXpGap = (
  localXP: number,
  cloudXP: number,
  localLastActive: string | null,
  progressServerAuthoritative = false,
): boolean => {
  if (cloudXP <= 0 || localXP <= cloudXP) return false;
  const xpGap = localXP - cloudXP;
  const gapMult = localXP >= Math.floor(cloudXP * 3);
  const gapAbsolute = xpGap >= 15_000;
  const localAgeDays = dayDiffFromNow(localLastActive);
  const staleLocal = localAgeDays == null || localAgeDays > 4;
  return gapMult && gapAbsolute && (progressServerAuthoritative || staleLocal);
};

const getUtcWeekStartIso = (date = new Date()): string => {
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (dayStart.getUTCDay() + 6) % 7;
  dayStart.setUTCDate(dayStart.getUTCDate() - daysSinceMonday);
  return dayStart.toISOString().slice(0, 10);
};

const getUtcIsoWeekId = (date = new Date()): string => {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((normalized.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${normalized.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

const buildStickyServerProgressPairs = (
  cloudData: Record<string, string | null>,
  now = new Date(),
  hasPendingProgressEvents = false,
  localWeeklyData: Record<string, string | null> = {},
): [string, string][] => {
  if (hasPendingProgressEvents) return [];
  const pairs: [string, string][] = [];
  const currentWeekStart = getUtcWeekStartIso(now);
  const currentWeekId = getUtcIsoWeekId(now);
  const localPeriod = localWeeklyData['weekly_xp_period_start'];
  const localWeeklyXp = Math.max(0, Math.floor(Number(localWeeklyData['weekly_xp'] ?? 0) || 0));
  const localWeekPointsCurrent = (() => {
    if (localPeriod !== currentWeekStart) return null;
    try {
      const parsed = JSON.parse(String(localWeeklyData['week_points_v2'] ?? '')) as { weekKey?: unknown; points?: unknown };
      if (parsed.weekKey !== currentWeekId && parsed.weekKey !== currentWeekStart) return null;
      return Math.max(0, Math.floor(Number(parsed.points ?? 0) || 0));
    } catch {
      return null;
    }
  })();
  const cloudPeriod = cloudData['weekly_xp_period_start'];
  let cloudWeekPointsCurrent = false;
  const cloudWeekPointsV2 = cloudData['week_points_v2'];
  let cloudWeekKey = currentWeekId;
  let cloudWeekPoints = 0;
  if (cloudWeekPointsV2) {
    try {
      const parsed = JSON.parse(cloudWeekPointsV2) as { weekKey?: unknown; points?: unknown };
      cloudWeekKey = typeof parsed.weekKey === 'string' ? parsed.weekKey : currentWeekId;
      cloudWeekPoints = Math.max(0, Math.floor(Number(parsed.points ?? 0) || 0));
      cloudWeekPointsCurrent = parsed?.weekKey === currentWeekId || parsed?.weekKey === currentWeekStart;
    } catch {
      cloudWeekPointsCurrent = false;
    }
  }
  if (cloudPeriod === currentWeekStart || cloudWeekPointsCurrent) {
    if (cloudData['weekly_xp'] != null) {
      const cloudWeeklyXp = Math.max(0, Math.floor(Number(cloudData['weekly_xp']) || 0));
      const weeklyXp = localPeriod === currentWeekStart
        ? Math.max(localWeeklyXp, cloudWeeklyXp)
        : cloudWeeklyXp;
      pairs.push(['weekly_xp', String(weeklyXp)]);
    }
    pairs.push(['weekly_xp_period_start', currentWeekStart]);
    if (cloudWeekPointsCurrent && cloudWeekPointsV2 != null) {
      const weekPoints = localWeekPointsCurrent == null
        ? cloudWeekPoints
        : Math.max(localWeekPointsCurrent, cloudWeekPoints);
      pairs.push(['week_points_v2', JSON.stringify({ weekKey: cloudWeekKey, points: weekPoints })]);
    }
    if (cloudData['week_points'] != null) {
      const cloudWeekPointsLegacy = Math.max(0, Math.floor(Number(cloudData['week_points']) || 0));
      const weekPoints = localWeekPointsCurrent == null
        ? Math.max(cloudWeekPointsLegacy, cloudWeekPoints)
        : Math.max(localWeekPointsCurrent, cloudWeekPoints, cloudWeekPointsLegacy);
      pairs.push(['week_points', String(weekPoints)]);
    }
  }
  if (cloudData['streak_count'] != null) pairs.push(['streak_count', String(cloudData['streak_count'])]);
  const serverLastActive = cloudData['last_active_date'];
  const serverStreakLast = cloudData['streak_last_date'] ?? serverLastActive;
  if (serverLastActive != null) pairs.push(['last_active_date', String(serverLastActive)]);
  if (serverStreakLast != null) pairs.push(['streak_last_date', String(serverStreakLast)]);
  return pairs;
};

// ВАЖНО: этот набор должен быть ЗЕРКАЛОМ чёрного списка premium-ключей в
// firestore.rules (функция progressHasNoPremiumWrites). Если ключ есть в правиле,
// но отсутствует здесь — клиентский фильтр его не вырежет, он уйдёт в progressPatch,
// правило отклонит весь set с PERMISSION_DENIED → цикл падающих синков у платящего
// юзера (эти поля приходят в AsyncStorage из облака при restore). Держать списки в
// синхроне. См. память phraseman_premium_write_paths.
const PREMIUM_PROGRESS_KEYS = new Set([
  'premium_plan',
  'premium_expiry',
  'premium_rc_product_id',
  'premium_rc_period_type',
  'premium_rc_store',
  'premium_rc_environment',
  'premium_rc_event_type',
  'premium_rc_updated_at',
  'premium_rc_expiry_ms',
  'premium_rc_purchased_at_ms',
  'premium_rc_cancelled_at',
  'admin_premium_override',
  'premium_admin_grant_at',
  'had_premium_ever',
  'vip_active',
  'vip_plan',
  'vip_from',
  'vip_until',
  'vip_admin_override',
  'vip_admin_grant_at',
  'vip_migrated_from_admin_grant_at',
  'intro_access_until_ms',
  'intro_access_granted_at_ms',
  'loyalty_gift_until_ms',
  'loyalty_gift_granted_at_ms',
]);

// Ключи, которые ВЫДАЁТ ТОЛЬКО СЕРВЕР (CF collectiblesClaimDrop и т.п.).
// Клиент их в облако НИКОГДА не шлёт — они в blocklist progressHasNoPremiumWrites
// (firestore.rules), и любая исходящая запись уронит весь set целиком, как с
// premium-ключами. Отличие от PREMIUM_PROGRESS_KEYS: исключение безусловное
// (нет аналога hasLocalPremiumSyncState). Локальная копия обновляется из ответа
// CF и при restoreFromCloud — поэтому ключи ОБЯЗАНЫ оставаться в SYNC_KEYS.
export const SERVER_OWNED_PROGRESS_KEYS = new Set([
  'user_total_xp',
  'user_prev_xp',
  'user_level',
  'weekly_xp',
  'weekly_xp_period_start',
  'week_points',
  'week_points_v2',
  'streak_count',
  'last_active_date',
  'streak_last_date',
  // Exact EN unlock key is protected by Firestore Rules and mutated only by
  // progress_events. Keep it restoreable via SYNC_KEYS, but never include it in
  // an outbound client patch or the rules reject the whole progress update.
  'unlocked_lessons',
  'collectibles_owned_v1',
  'collectibles_state_v1',
  'chain_shield',
  'gift_xp_multiplier',
  'club_gift_free_boost_v1',
  // profile_card_level в users.progress — только публичная серверная проекция.
  // Личный permanent result принадлежит client economy journal: restore берёт max
  // и никогда не понижает уже купленный уровень. Исключение из outbound patch
  // не даёт общей синхронизации спорить с отдельным projection callable.
  'profile_card_level',
  'shard_survey_last_at_ms',
  ACHIEVEMENT_ACCESS_PLUS_PAID_KEY,
  ACHIEVEMENT_ACCESS_PRO_PAID_KEY,
]);

export const isServerOwnedProgressKey = (key: string): boolean => {
  if (SERVER_OWNED_PROGRESS_KEYS.has(key)) return true;
  if (/^lesson\d+_(?:best_score|pass_count|progress|cellIndex)$/.test(key)) return true;
  if (/^level_exam_[A-Za-z0-9_-]+_(?:pct|best_pct|passed|pass_count|completed_at)$/.test(key)) return true;
  if (/^lesson_progress_v2::fr::(?:\d+|lesson\d+_(?:best_score|pass_count|progress|cellIndex)|unlocked_lessons)$/.test(key)) return true;
  if (/^level_exams_v2::fr::level_exam_[A-Za-z0-9_-]+_(?:pct|best_pct|passed|pass_count|completed_at)$/.test(key)) return true;
  return false;
};

const premiumValuePresent = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return s !== '' && s !== 'null' && s !== 'undefined';
};

function hasLocalPremiumSyncState(data: Record<string, string | null>): boolean {
  const plan = String(data['premium_plan'] ?? '').trim().toLowerCase();
  if (plan && plan !== 'null' && plan !== 'undefined') return true;
  if (String(data['admin_premium_override'] ?? '').trim() === 'true') return true;
  if (parseProgressInt(data['premium_expiry']) > 0) return true;
  if (String(data['vip_active'] ?? '').trim() === 'true') return true;
  if (String(data['vip_admin_override'] ?? '').trim() === 'true') return true;
  if (String(data['vip_plan'] ?? '').trim()) return true;
  if (parseProgressInt(data['vip_until']) > 0) return true;
  return [
    'premium_rc_product_id',
    'premium_rc_period_type',
    'premium_rc_store',
    'premium_rc_expiry_ms',
    'premium_rc_purchased_at_ms',
    'premium_rc_updated_at',
  ].some((key) => premiumValuePresent(data[key]));
}

function vipActiveFromProgress(data: Record<string, unknown>): boolean | null {
  return getVipProgressState(data)?.active ?? null;
}

function cloudProgressStorageValue(key: string, value: unknown): string {
  if (
    key === 'premium_expiry' ||
    key === 'premium_rc_expiry_ms' ||
    key === 'premium_rc_purchased_at_ms' ||
    key === 'premium_admin_grant_at' ||
    key === 'vip_from' ||
    key === 'vip_until' ||
    key === 'vip_admin_grant_at'
  ) {
    return String(parsePremiumProgressMs(value));
  }
  return String(value);
}

/**
 * Гарантирует, что КАЖДАЯ пара перед AsyncStorage.multiSet — это [string, string].
 *
 * Native AsyncStorage (SQLite) биндит и ключ, и значение как строковый параметр и
 * падает с `IllegalArgumentException: the bind value at index N is null`, если в пару
 * просочился null/undefined. При восстановлении из облака значение собирается из
 * десятков источников (cloudProgressStorageValue / mergeLessonRestoreValue / merge*),
 * поэтому страхуемся на самой границе записи, fail-closed:
 *   - пара с пустым/нестроковым КЛЮЧОМ отбрасывается (писать некуда);
 *   - null/undefined ЗНАЧЕНИЕ нормализуется в '' (пустую строку), а не теряется как краш.
 * Immutable: возвращается новый массив, вход не мутируется.
 */
function sanitizeStoragePairs(pairs: ReadonlyArray<readonly [unknown, unknown]>): [string, string][] {
  const safe: [string, string][] = [];
  for (const pair of pairs) {
    const key = pair?.[0];
    if (typeof key !== 'string' || key.length === 0) continue;
    const rawValue = pair[1];
    const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
    safe.push([key, value]);
  }
  return safe;
}

export function shouldSyncPremiumProgressField(
  key: string,
  value: string | null,
  data: Record<string, string | null>,
): boolean {
  if (!PREMIUM_PROGRESS_KEYS.has(key)) return true;
  if (!hasLocalPremiumSyncState(data)) return false;
  if (key === 'premium_expiry') return value !== null && value !== undefined && String(value).trim() !== '';
  return premiumValuePresent(value);
}

const LESSON_RESTORE_MERGE_KEYS = [
  'unlocked_lessons',
  unlockedLessonsKey('fr'),
  legacyFreeLessonCapKey('en'),
  legacyFreeLessonMigrationKey('en'),
  legacyFreeLessonCapKey('fr'),
  legacyFreeLessonMigrationKey('fr'),
  ...Array.from({ length: 32 }, (_, i) => {
    const lessonId = i + 1;
    return [
      `lesson${lessonId}_best_score`,
      `lesson${lessonId}_pass_count`,
      `lesson${lessonId}_progress`,
      achievementLessonPerfectPassesKey(lessonId, 'en'),
      lessonBestScoreKey(lessonId, 'fr'),
      lessonPassCountKey(lessonId, 'fr'),
      lessonProgressKey(lessonId, 'fr'),
      achievementLessonPerfectPassesKey(lessonId, 'fr'),
    ];
  }).flat(),
];
const LEVEL_EXAM_RESTORE_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
const LEVEL_EXAM_RESTORE_FIELDS = ['passed', 'available', 'pct', 'best_pct', 'pass_count', 'attempt_count', 'medal_tier'] as const;
const LEVEL_EXAM_RESTORE_MERGE_KEYS = LEVEL_EXAM_RESTORE_LEVELS.flatMap((level) => [
  ...LEVEL_EXAM_RESTORE_FIELDS.map((field) => levelExamKey(level, field, 'en')),
  ...LEVEL_EXAM_RESTORE_FIELDS.map((field) => levelExamKey(level, field, 'fr')),
]);
export const PERSONAL_PLAN_RESTORE_KEYS = [
  'personal_plan_state_v1',
  'personal_plan_progress_v1',
  'personal_plan_completed_tasks_v1',
  'personal_plan_task_progress_v1',
  'personal_plan_xp_ledger_v1',
] as const;
const PERSONAL_PLAN_RESTORE_KEY_SET = new Set<string>(PERSONAL_PLAN_RESTORE_KEYS);
const RESTORE_MERGE_KEY_SET = new Set<string>([
  ...LESSON_RESTORE_MERGE_KEYS,
  ...LEVEL_EXAM_RESTORE_MERGE_KEYS,
  ...PERSONAL_PLAN_RESTORE_KEYS,
  SEASON_COSMETICS_SYNC_KEY,
]);
const LEGACY_FREE_LESSON_CAP_RESTORE_KEYS = new Set<string>([
  legacyFreeLessonCapKey('en'),
  legacyFreeLessonCapKey('fr'),
]);
const LEGACY_FREE_LESSON_MIGRATION_RESTORE_KEYS = new Set<string>([
  legacyFreeLessonMigrationKey('en'),
  legacyFreeLessonMigrationKey('fr'),
]);

// #10 multi-device: strictly-additive lifetime counters (bumpStoredCounter only
// ever increases them). On restore they take the max of cloud/local so a
// concurrent lower-value push on another device cannot permanently lose progress.
// EXPLICIT allowlist — deliberately excludes streaks (*_streak_v1, streak_count —
// can reset to 0), dates (streak_last_date, *_period_start), and current-state
// values (gift_xp_multiplier, wager_discount, weekly_xp which resets weekly).
export const MONOTONIC_COUNTER_RESTORE_KEYS = [
  'achievement_quiz_total_count',
  'achievement_flashcards_flip_count',
  'achievement_flashcards_saved_count',
  'achievement_daily_phrase_read_count',
  'achievement_daily_phrase_save_count',
  'achievement_energy_refill_count',
  'achievement_gift_sent_count',
  'achievement_league_boost_count',
  'achievement_shards_spent_total',
  'shards_lifetime_earned_v1',
] as const;
const MONOTONIC_COUNTER_RESTORE_KEY_SET = new Set<string>(MONOTONIC_COUNTER_RESTORE_KEYS);

function isMonotonicCounterRestoreKey(key: string): boolean {
  const scoped = targetScopedRestoreInfo(key);
  return MONOTONIC_COUNTER_RESTORE_KEY_SET.has(scoped?.id ?? key);
}

function parseLessonProgressArray(raw: unknown): string[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

function lessonProgressQuality(raw: unknown): { correct: number; wrong: number; total: number } | null {
  const arr = parseLessonProgressArray(raw);
  if (!arr) return null;
  let correct = 0;
  let wrong = 0;
  for (const x of arr) {
    if (x === 'correct' || x === 'replay_correct') correct++;
    else if (x === 'wrong') wrong++;
  }
  return { correct, wrong, total: arr.length };
}

function parsePositiveNumberSet(raw: unknown): number[] | null {
  if (raw === null || raw === undefined || String(raw).trim() === '') return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map(x => Math.floor(Number(x)))
      .filter(x => Number.isFinite(x) && x > 0);
  } catch {
    return null;
  }
}

function mergeNumberSetRestoreValue(cloudValue: string, localValue: string | null | undefined): string {
  const cloud = parsePositiveNumberSet(cloudValue);
  const local = parsePositiveNumberSet(localValue);
  if (!cloud || !local) return cloudValue;
  return JSON.stringify([...new Set([...cloud, ...local])].sort((a, b) => a - b));
}

function parseProgressBool(value: unknown): boolean {
  const s = String(value ?? '').trim().toLowerCase();
  return value === true || s === 'true' || s === '1' || s === 'yes';
}

function mergeLevelExamRestoreValue(
  restoreId: string,
  cloudValue: string,
  localValue: string | null | undefined,
): string {
  if (/^level_exam_[A-Za-z0-9_-]+_(?:passed|available)$/.test(restoreId)) {
    return parseProgressBool(cloudValue) || parseProgressBool(localValue) ? 'true' : 'false';
  }
  if (/^level_exam_[A-Za-z0-9_-]+_(?:pct|best_pct|pass_count|attempt_count|medal_tier)$/.test(restoreId)) {
    return String(Math.max(parseProgressInt(cloudValue), parseProgressInt(localValue)));
  }
  if (/^level_exam_[A-Za-z0-9_-]+_completed_at$/.test(restoreId)) {
    if (isDateKey(cloudValue) && isDateKey(localValue) && localValue > cloudValue) return localValue;
    return cloudValue;
  }
  return cloudValue;
}

function targetScopedRestoreInfo(key: string): { domain: string; id: string } | null {
  const match = /^([a-z_]+)_v2::(?:en|fr)::(.+)$/.exec(key);
  if (!match) return null;
  try {
    return { domain: match[1], id: decodeURIComponent(match[2]) };
  } catch {
    return { domain: match[1], id: match[2] };
  }
}

// K2: owned/purchased-ключи (покупки за осколки / выдачи), которые restore в ветке
// «облако победило» НЕЛЬЗЯ слепо перезаписывать облаком: офлайн-покупка (пак флешкарт,
// аура, аватар, карточка Сокровищницы), ещё не доехавшая до облака, исчезала бы.
// Владение строго аддитивно — мержим объединением (union), как mergeOwnedFlagMap
// в sticky-ветке. Базовые имена; матчатся и target-scoped варианты
// (flashcards_v2::fr::flashcards_owned_packs_v1 и т.п.).
const OWNED_UNION_RESTORE_BASE_KEYS = new Set<string>([
  'avatar_aura_owned_v1',          // {[id]: true}
  'custom_avatar_owned_v1',        // {[id]: 'gradient:logoColor'}
  'collectibles_owned_v1',         // {[id]: count}
  'flashcards_owned_packs_v1',     // ["packId", ...]
  'community_owned_pack_ids_v1',   // ["packId", ...]
  'flashcards_market_dev_owned_v1',// ["packId", ...]
  'level_up_shown_levels_v1',      // [2, 3, ...] — acknowledged modals are strictly additive
  // зачем (аудит 2026-08-24): темы, купленные за 200 жемчужин, и темы «дедушек» —
  // такое же владение, как паки и ауры. Одной FC_RESTORE_MERGE_STRATEGIES было
  // МАЛО: она применяется только во французской и sticky-ветках, а ГЛАВНАЯ ветка
  // restore (цикл по getRuntimeSyncKeys) идёт через mergeLessonRestoreValue, где
  // нераспознанный ключ возвращает cloudValue — облако затёрло бы офлайн-покупку,
  // и человек потерял бы жемчуг. Регистрация здесь закрывает все ветки разом.
  OWNED_THEMES_KEY,                // ["ember", ...]
  GRANDFATHERED_THEMES_KEY,        // ["midnight", ...]
]);

function isOwnedUnionRestoreKey(key: string): boolean {
  if (OWNED_UNION_RESTORE_BASE_KEYS.has(key)) return true;
  const scoped = targetScopedRestoreInfo(key);
  return scoped !== null && OWNED_UNION_RESTORE_BASE_KEYS.has(scoped.id);
}

function parseOwnedRestoreJson(raw: string | null | undefined): unknown {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Union-merge owned-значения при restore: массив id — объединение множеств;
 * объект-мапа — ключи из обоих источников (числа берут max — счётчик карточек
 * Сокровищницы не должен регрессировать; прочие конфликты обычно решает облако).
 * Для raw-зеркала custom_avatar_owned_v1 локальная версия конфликта авторитетна:
 * облако не содержит operation lineage и потому не может доказать, что его
 * restyle новее локально зафиксированной покупки.
 * При нечитаемом локальном значении возвращает облачное как есть.
 */
function mergeOwnedRestoreValue(
  cloudValue: string,
  localValue: string | null | undefined,
  preferLocalConflicts = false,
): string {
  const local = parseOwnedRestoreJson(localValue);
  if (local === null) return cloudValue;
  const cloud = parseOwnedRestoreJson(cloudValue);
  if (Array.isArray(local) || Array.isArray(cloud)) {
    const isUnionScalar = (value: unknown): value is string | number =>
      typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
    const cloudIds = Array.isArray(cloud) ? cloud.filter(isUnionScalar) : [];
    const localIds = Array.isArray(local) ? local.filter(isUnionScalar) : [];
    return JSON.stringify([...new Set([...cloudIds, ...localIds])]);
  }
  // Сначала валидируем ЛОКАЛЬ по форме: если она не object-мапа (мусорный примитив
  // из повреждённого хранилища — число/строка/boolean), доверять ей нельзя → облако.
  // Порядок важен: проверка local ПЕРЕД проверкой cloud, иначе битый локальный
  // примитив просочился бы в owned-ключ при пустом облаке (аудит фикса K2).
  if (!local || typeof local !== 'object') return cloudValue;
  // Локаль — валидная object-мапа, но облако нечитаемо (пустая строка / битый JSON).
  // Владение аддитивно: НЕ роняем реальные локальные покупки (аватары/ауры/счётчики
  // Сокровищницы) в пользу пустого облака — иначе в cloud-wins ветке офлайн-покупки
  // терялись бы. local тут заведомо непустая строка (прошли local!==null выше).
  if (!cloud || typeof cloud !== 'object') return localValue as string;
  const cloudMap = cloud as Record<string, unknown>;
  const localMap = local as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...cloudMap };
  for (const [id, localVal] of Object.entries(localMap)) {
    if (!(id in merged)) {
      merged[id] = localVal;
      continue;
    }
    if (preferLocalConflicts) {
      merged[id] = localVal;
      continue;
    }
    const cloudNum = merged[id];
    if (typeof localVal === 'number' && typeof cloudNum === 'number' && localVal > cloudNum) {
      merged[id] = localVal;
    }
  }
  return JSON.stringify(merged);
}

type SeasonCosmeticsRestoreState = {
  frames: string[];
  nickColors: string[];
  activeNickColor: string | null;
  nickShimmer: boolean;
  titles: string[];
  auraStages: number[];
  secretAuras: string[];
  customAvatarGrants: number;
};

function parseSeasonCosmeticsRestoreState(raw: string | null | undefined): SeasonCosmeticsRestoreState | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const strings = (field: string): string[] => Array.isArray(value[field])
      ? [...new Set((value[field] as unknown[]).filter((item): item is string => typeof item === 'string' && item.trim().length > 0))]
      : [];
    const stages = Array.isArray(value.auraStages)
      ? [...new Set(value.auraStages
        .map((item) => Math.floor(Number(item)))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 4))].sort((a, b) => a - b)
      : [];
    return {
      frames: strings('frames'),
      nickColors: strings('nickColors'),
      activeNickColor: typeof value.activeNickColor === 'string' && value.activeNickColor.trim()
        ? value.activeNickColor
        : null,
      nickShimmer: value.nickShimmer === true,
      titles: strings('titles'),
      auraStages: stages,
      secretAuras: strings('secretAuras'),
      customAvatarGrants: Math.max(0, Math.floor(Number(value.customAvatarGrants) || 0)),
    };
  } catch {
    return null;
  }
}

/** Permanent Season Pass cosmetics are additive and can never regress on restore. */
function mergeSeasonCosmeticsRestoreValue(
  cloudValue: string,
  localValue: string | null | undefined,
): string {
  const cloud = parseSeasonCosmeticsRestoreState(cloudValue);
  const local = parseSeasonCosmeticsRestoreState(localValue);
  if (!local) return cloud ? JSON.stringify(cloud) : cloudValue;
  if (!cloud) return JSON.stringify(local);
  const union = <T,>(cloudValues: readonly T[], localValues: readonly T[]): T[] => (
    [...new Set([...cloudValues, ...localValues])]
  );
  return JSON.stringify({
    frames: union(cloud.frames, local.frames),
    nickColors: union(cloud.nickColors, local.nickColors),
    activeNickColor: local.activeNickColor ?? cloud.activeNickColor,
    nickShimmer: cloud.nickShimmer || local.nickShimmer,
    titles: union(cloud.titles, local.titles),
    auraStages: union(cloud.auraStages, local.auraStages).sort((a, b) => a - b),
    secretAuras: union(cloud.secretAuras, local.secretAuras),
    customAvatarGrants: Math.max(cloud.customAvatarGrants, local.customAvatarGrants),
  } satisfies SeasonCosmeticsRestoreState);
}

/**
 * #11 multi-device: уроковый прогресс, чей merge в mergeLessonRestoreValue
 * строго МОНОТОНЕН (union множеств / max / OR / лучшее качество ответов) —
 * применение такого merge не может откатить достижения ни на одном устройстве.
 * Поэтому эти семьи ключей restore подмешивает даже в sticky-ветке
 * (localXP ≥ cloudXP), где полный merge запрещён XP-гейтом.
 *
 * Держать СИНХРОННЫМ с монотонными ветками mergeLessonRestoreValue: новое
 * семейство прогресс-ключей (новый тип контента, напр. Learning V2) добавляется
 * ОДНОЙ строкой сюда + соответствующей веткой стратегии в mergeLessonRestoreValue.
 * Ключи с НЕ-монотонной стратегией (lesson*_cellIndex, даты, кап бесплатных
 * уроков, streak/weekly-скаляры) сюда НЕ входят. Контракт поведения —
 * tests/cloud_sync_lesson_union_restore.test.ts.
 */
function isMonotonicLessonRestoreKey(key: string): boolean {
  const scoped = targetScopedRestoreInfo(key);
  const restoreId = scoped?.id ?? key;
  if (restoreId === 'unlocked_lessons') return true;
  if (/^level_exam_[A-Za-z0-9_-]+_(?:passed|available|pct|best_pct|pass_count|attempt_count|medal_tier)$/.test(restoreId)) return true;
  if (/^lesson\d+_(?:pass_count|best_score|progress)$/.test(restoreId)) return true;
  if (scoped?.domain === 'lesson_progress' && /^\d+$/.test(restoreId)) return true;
  if (/^achievement_lesson_\d+_perfect_passes_v1$/.test(restoreId)) return true;
  return false;
}

function parseRestoreRecord(raw: string | null | undefined): Record<string, any> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function restoreTimestamp(value: unknown): number {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergePersonalPlanStateRestoreValue(cloudRaw: string, localRaw: string | null | undefined): string {
  const cloud = parseRestoreRecord(cloudRaw);
  const local = parseRestoreRecord(localRaw);
  if (!local) return cloudRaw;
  if (!cloud) return localRaw ?? cloudRaw;
  const cloudInstance = String(cloud.planInstanceId || cloud.id || '');
  const localInstance = String(local.planInstanceId || local.id || '');
  const cloudTime = Math.max(
    restoreTimestamp(cloud.updatedAt), restoreTimestamp(cloud.activatedAt), restoreTimestamp(cloud.createdAt),
  );
  const localTime = Math.max(
    restoreTimestamp(local.updatedAt), restoreTimestamp(local.activatedAt), restoreTimestamp(local.createdAt),
  );
  if (!cloudInstance || !localInstance || cloudInstance !== localInstance) {
    const cloudActivationTime = Math.max(
      restoreTimestamp(cloud.activatedAt), restoreTimestamp(cloud.createdAt),
    ) || cloudTime;
    const localActivationTime = Math.max(
      restoreTimestamp(local.activatedAt), restoreTimestamp(local.createdAt),
    ) || localTime;
    return localActivationTime >= cloudActivationTime ? (localRaw ?? cloudRaw) : cloudRaw;
  }
  const base = localTime >= cloudTime ? local : cloud;
  const other = base === local ? cloud : local;
  const baseDayIndex = Math.max(1, Math.floor(Number(base.currentDayIndex) || 1));
  const otherDayIndex = Math.max(1, Math.floor(Number(other.currentDayIndex) || 1));
  const furthestDayState = otherDayIndex > baseDayIndex ? other : base;
  const currentDayIndex = Math.max(
    baseDayIndex,
    otherDayIndex,
  );
  const status = base.status === 'completed' || other.status === 'completed' ? 'completed' : base.status;
  const updatedAt = localTime >= cloudTime ? local.updatedAt : cloud.updatedAt;
  return JSON.stringify({
    ...base,
    status,
    currentDayIndex,
    currentDayStartedAt: furthestDayState.currentDayStartedAt ?? base.currentDayStartedAt,
    updatedAt,
  });
}

function mergePersonalPlanTaskProgressRestoreValue(cloudRaw: string, localRaw: string | null | undefined): string {
  const cloud = parseRestoreRecord(cloudRaw);
  const local = parseRestoreRecord(localRaw);
  if (!local) return cloudRaw;
  if (!cloud) return localRaw ?? cloudRaw;
  const merged: Record<string, unknown> = { ...cloud };
  for (const key of new Set([...Object.keys(cloud), ...Object.keys(local)])) {
    const cloudEntry = cloud[key];
    const localEntry = local[key];
    if (!cloudEntry || typeof cloudEntry !== 'object') {
      merged[key] = localEntry;
      continue;
    }
    if (!localEntry || typeof localEntry !== 'object') continue;
    const cloudSequence = Math.max(0, Math.floor(Number(cloudEntry.attemptSequence) || 0));
    const localSequence = Math.max(0, Math.floor(Number(localEntry.attemptSequence) || 0));
    const base = localSequence > cloudSequence || (
      localSequence === cloudSequence && restoreTimestamp(localEntry.updatedAt) >= restoreTimestamp(cloudEntry.updatedAt)
    ) ? localEntry : cloudEntry;
    merged[key] = {
      ...base,
      index: Math.max(0, Math.floor(Number(cloudEntry.index) || 0), Math.floor(Number(localEntry.index) || 0)),
      attemptSequence: Math.max(cloudSequence, localSequence),
      correctIds: [...new Set([
        ...(Array.isArray(cloudEntry.correctIds) ? cloudEntry.correctIds.filter((id: unknown) => typeof id === 'string') : []),
        ...(Array.isArray(localEntry.correctIds) ? localEntry.correctIds.filter((id: unknown) => typeof id === 'string') : []),
      ])],
    };
  }
  return JSON.stringify(merged);
}

function receiptApplied(value: any): boolean {
  return Boolean(value && typeof value === 'object' && value.status !== 'pending');
}

function appliedReceiptTotals(entry: any): { xp: number; phrases: number } {
  const receipts = entry && typeof entry.taskIds === 'object' && entry.taskIds ? Object.values(entry.taskIds) : [];
  return receipts.reduce((totals: { xp: number; phrases: number }, receipt: any) => {
    if (!receiptApplied(receipt)) return totals;
    totals.xp += Math.max(0, Math.floor(Number(receipt.xp) || 0));
    totals.phrases += Math.max(0, Math.floor(Number(receipt.phrases) || 0));
    return totals;
  }, { xp: 0, phrases: 0 });
}

function mergePersonalPlanXpLedgerRestoreValue(cloudRaw: string, localRaw: string | null | undefined): string {
  const cloud = parseRestoreRecord(cloudRaw);
  const local = parseRestoreRecord(localRaw);
  if (!local) return cloudRaw;
  if (!cloud) return localRaw ?? cloudRaw;
  const merged: Record<string, unknown> = {};
  for (const planId of new Set([...Object.keys(cloud), ...Object.keys(local)])) {
    const cloudEntry = cloud[planId] && typeof cloud[planId] === 'object' ? cloud[planId] : {};
    const localEntry = local[planId] && typeof local[planId] === 'object' ? local[planId] : {};
    const cloudTasks = cloudEntry.taskIds && typeof cloudEntry.taskIds === 'object' ? cloudEntry.taskIds : {};
    const localTasks = localEntry.taskIds && typeof localEntry.taskIds === 'object' ? localEntry.taskIds : {};
    const taskIds: Record<string, any> = { ...cloudTasks };
    for (const taskId of Object.keys(localTasks)) {
      const localReceipt = localTasks[taskId];
      const cloudReceipt = cloudTasks[taskId];
      taskIds[taskId] = receiptApplied(localReceipt) || !receiptApplied(cloudReceipt) ? localReceipt : cloudReceipt;
    }
    const mergedApplied = appliedReceiptTotals({ taskIds });
    const cloudApplied = appliedReceiptTotals(cloudEntry);
    const localApplied = appliedReceiptTotals(localEntry);
    const legacyXp = Math.max(
      0,
      Math.max(0, Math.floor(Number(cloudEntry.xp) || 0)) - cloudApplied.xp,
      Math.max(0, Math.floor(Number(localEntry.xp) || 0)) - localApplied.xp,
    );
    const legacyPhrases = Math.max(
      0,
      Math.max(0, Math.floor(Number(cloudEntry.phrases) || 0)) - cloudApplied.phrases,
      Math.max(0, Math.floor(Number(localEntry.phrases) || 0)) - localApplied.phrases,
    );
    const localIsNewer = restoreTimestamp(localEntry.updatedAt) >= restoreTimestamp(cloudEntry.updatedAt);
    merged[planId] = {
      ...(localIsNewer ? cloudEntry : localEntry),
      ...(localIsNewer ? localEntry : cloudEntry),
      xp: mergedApplied.xp + legacyXp,
      phrases: mergedApplied.phrases + legacyPhrases,
      taskIds,
    };
  }
  return JSON.stringify(merged);
}

function mergePersonalPlanRestoreValue(
  key: string,
  cloudValue: string,
  localValue: string | null | undefined,
): string {
  if (!localValue) return cloudValue;
  if (key === 'personal_plan_state_v1') return mergePersonalPlanStateRestoreValue(cloudValue, localValue);
  if (key === 'personal_plan_task_progress_v1') {
    return mergePersonalPlanTaskProgressRestoreValue(cloudValue, localValue);
  }
  if (key === 'personal_plan_xp_ledger_v1') {
    return mergePersonalPlanXpLedgerRestoreValue(cloudValue, localValue);
  }
  if (key === 'personal_plan_progress_v1' || key === 'personal_plan_completed_tasks_v1') {
    const cloud = parseRestoreRecord(cloudValue);
    const local = parseRestoreRecord(localValue);
    if (!cloud) return localValue;
    if (!local) return cloudValue;
    return JSON.stringify({ ...cloud, ...local });
  }
  return cloudValue;
}

async function applyPersonalPlanRestorePairs(pairs: readonly (readonly [string, string])[]): Promise<void> {
  const hasPersonalPlanState = pairs.some(([key]) => PERSONAL_PLAN_RESTORE_KEY_SET.has(key));
  if (!hasPersonalPlanState) {
    await AsyncStorage.multiSet(sanitizeStoragePairs(pairs));
    return;
  }
  await withPersonalPlanStateStorageLock(() => withPlanXpLedgerStorageLock(async () => {
    const nextPairs: [string, string][] = [];
    for (const [key, cloudMergedValue] of pairs) {
      if (!PERSONAL_PLAN_RESTORE_KEY_SET.has(key)) {
        nextPairs.push([key, cloudMergedValue]);
        continue;
      }
      const latestLocalValue = await AsyncStorage.getItem(key);
      nextPairs.push([
        key,
        mergePersonalPlanRestoreValue(key, cloudMergedValue, latestLocalValue),
      ]);
    }
    await AsyncStorage.multiSet(sanitizeStoragePairs(nextPairs));
    if (nextPairs.some(([key]) => key === 'personal_plan_state_v1')) {
      invalidatePersonalPlanStateCache();
    }
  }));
}

function mergeLessonRestoreValue(
  key: string,
  cloudValue: string,
  localValue: string | null | undefined,
): string {
  if (PERSONAL_PLAN_RESTORE_KEY_SET.has(key)) {
    return mergePersonalPlanRestoreValue(key, cloudValue, localValue);
  }
  if (key === SEASON_COSMETICS_SYNC_KEY) {
    return mergeSeasonCosmeticsRestoreValue(cloudValue, localValue);
  }
  if (LEGACY_FREE_LESSON_CAP_RESTORE_KEYS.has(key)) {
    const cloudCap = normalizeLegacyFreeLessonCap(cloudValue);
    const localCap = normalizeLegacyFreeLessonCap(localValue);
    if (cloudCap === null && localCap === null) return String(LEGACY_FREE_LESSON_MIN);
    if (cloudCap === null) return String(localCap);
    if (localCap === null) return String(cloudCap);
    return String(Math.max(cloudCap, localCap));
  }
  if (LEGACY_FREE_LESSON_MIGRATION_RESTORE_KEYS.has(key)) {
    return cloudValue === LEGACY_FREE_LESSON_MIGRATION_COMPLETE ||
      localValue === LEGACY_FREE_LESSON_MIGRATION_COMPLETE
      ? LEGACY_FREE_LESSON_MIGRATION_COMPLETE
      : cloudValue;
  }
  // #10 multi-device: strictly-additive lifetime counters take the max so a
  // concurrent push of a lower value on another device can't lose progress.
  // Allowlist only (never streaks/dates/multipliers — those can legitimately drop).
  if (isMonotonicCounterRestoreKey(key)) {
    return String(Math.max(parseProgressInt(cloudValue), parseProgressInt(localValue)));
  }
  // зачем (аудит 2026-08-24): темы идут ПЕРЕД общим union — их мерж дополнительно
  // отсеивает имена тем, которых в приложении больше нет («coral», «vanilla»).
  // Общий mergeOwnedRestoreValue такой фильтрации не делает, и удалённая тема
  // воскресла бы из старого облака, попав в список «купленных».
  if (key === OWNED_THEMES_KEY || key === GRANDFATHERED_THEMES_KEY) {
    return mergeOwnedThemesRestoreValue(localValue, cloudValue);
  }
  // K2: владение (покупки/выдачи) строго аддитивно — union вместо перезаписи облаком.
  if (isOwnedUnionRestoreKey(key)) {
    return mergeOwnedRestoreValue(cloudValue, localValue, key === 'custom_avatar_owned_v1');
  }
  if (key === 'profile_card_level') {
    return String(Math.max(
      0,
      Math.min(5, parseProgressInt(cloudValue)),
      Math.min(5, parseProgressInt(localValue)),
    ));
  }
  const scoped = targetScopedRestoreInfo(key);
  const restoreId = scoped?.id ?? key;
  const isScopedLessonProgress = scoped?.domain === 'lesson_progress';
  if (restoreId === 'unlocked_lessons') {
    return mergeNumberSetRestoreValue(cloudValue, localValue);
  }
  if (/^level_exam_[A-Za-z0-9_-]+_/.test(restoreId)) {
    return mergeLevelExamRestoreValue(restoreId, cloudValue, localValue);
  }
  if (/^lesson\d+_pass_count$/.test(restoreId)) {
    return String(Math.max(parseProgressInt(cloudValue), parseProgressInt(localValue)));
  }
  if (/^lesson\d+_best_score$/.test(restoreId)) {
    return String(Math.max(parseProgressFloat(cloudValue), parseProgressFloat(localValue)));
  }
  if (/^lesson\d+_progress$/.test(restoreId) || (isScopedLessonProgress && /^\d+$/.test(restoreId))) {
    const cloudQuality = lessonProgressQuality(cloudValue);
    const localQuality = lessonProgressQuality(localValue);
    if (!cloudQuality || !localQuality) return cloudValue;
    if (localQuality.correct > cloudQuality.correct) return localValue ?? cloudValue;
    if (localQuality.correct < cloudQuality.correct) return cloudValue;
    if (localQuality.wrong < cloudQuality.wrong) return localValue ?? cloudValue;
    return cloudValue;
  }
  if (/^achievement_lesson_\d+_perfect_passes_v1$/.test(restoreId)) {
    return mergeNumberSetRestoreValue(cloudValue, localValue);
  }
  return cloudValue;
}

function mergeCurrentWeekProgressRestoreValue(
  key: string,
  cloudValue: string,
  localValue: string | null | undefined,
  cloudPeriod: string | null | undefined,
  localPeriod: string | null | undefined,
  currentWeekStart: string,
  currentWeekId: string,
): string {
  if (key !== 'weekly_xp' && key !== 'week_points' && key !== 'week_points_v2') {
    return mergeLessonRestoreValue(key, cloudValue, localValue);
  }

  const isCurrentWeekToken = (value: unknown) => value === currentWeekStart || value === currentWeekId;
  if (key === 'week_points_v2') {
    let cloud: { weekKey?: unknown; points?: unknown } | null = null;
    let local: { weekKey?: unknown; points?: unknown } | null = null;
    try {
      cloud = JSON.parse(cloudValue) as { weekKey?: unknown; points?: unknown };
    } catch (e) {
      // Keep the original cloud representation unless a valid current local // representation below can safely preserve this week's progress.
      DebugLogger.error('cloud_sync:isCurrentWeekToken', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    try {
      local = localValue ? JSON.parse(localValue) as { weekKey?: unknown; points?: unknown } : null;
    } catch {
      local = null;
    }
    const cloudIsCurrent = isCurrentWeekToken(cloud?.weekKey);
    const localIsCurrent = isCurrentWeekToken(local?.weekKey);
    if (cloudIsCurrent && localIsCurrent) {
      return JSON.stringify({
        weekKey: typeof cloud?.weekKey === 'string' ? cloud.weekKey : currentWeekId,
        points: Math.max(0, Math.floor(Number(cloud?.points ?? 0) || 0), Math.floor(Number(local?.points ?? 0) || 0)),
      });
    }
    if (localIsCurrent) {
      return JSON.stringify({
        weekKey: typeof local?.weekKey === 'string' ? local.weekKey : currentWeekId,
        points: Math.max(0, Math.floor(Number(local?.points ?? 0) || 0)),
      });
    }
    return cloudValue;
  }
  const cloudIsCurrent = isCurrentWeekToken(cloudPeriod);
  const localIsCurrent = isCurrentWeekToken(localPeriod);
  if (cloudIsCurrent && localIsCurrent) {
    return String(Math.max(0, Math.floor(Number(cloudValue) || 0), Math.floor(Number(localValue ?? 0) || 0)));
  }
  if (localIsCurrent) return String(Math.max(0, Math.floor(Number(localValue ?? 0) || 0)));
  return cloudValue;
}

async function buildFrenchTargetStickyRestorePairs(cloudData: Record<string, unknown>): Promise<[string, string][]> {
  const restorableKeys = FRENCH_TARGET_SYNC_KEYS;
  const localMap = Object.fromEntries(
    await AsyncStorage.multiGet([...restorableKeys]),
  ) as Record<string, string | null>;
  const pairs: [string, string][] = [];

  for (const key of restorableKeys) {
    const val = cloudData[key];
    if (val === null || val === undefined) continue;
    const localValue = localMap[key];
    const storageValue = cloudProgressStorageValue(key, val);
    // cards-2.0 (E4): звёзды/клеймы не LWW — merge в обе стороны.
    const fcStrategy = FC_RESTORE_MERGE_STRATEGIES[key];
    if (fcStrategy) {
      const mergedFc = fcStrategy(localValue, storageValue);
      if (mergedFc !== localValue) pairs.push([key, mergedFc]);
      continue;
    }
    // K2: owned-ключи (fr-scoped паки флешкарт и т.п.) мержим union'ом и в sticky-ветке —
    // покупка на другом девайсе догоняет устройство, локальная офлайн-покупка не теряется.
    if (RESTORE_MERGE_KEY_SET.has(key) || isOwnedUnionRestoreKey(key) || isMonotonicCounterRestoreKey(key)) {
      const merged = mergeLessonRestoreValue(key, storageValue, localValue);
      if (merged !== localValue) pairs.push([key, merged]);
      continue;
    }
    if (localValue === null || localValue === undefined || localValue === '') {
      pairs.push([key, storageValue]);
    }
  }

  return pairs;
}

function latestDateKeyFromJsonMap(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const dates = Object.keys(parsed).filter(isDateKey).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  } catch {
    return null;
  }
}

export function deriveLastActiveDateForRestore(cloudData: Record<string, string | null>): string | null {
  if (isDateKey(cloudData['last_active_date'])) return cloudData['last_active_date'];
  if (isDateKey(cloudData['streak_last_date'])) return cloudData['streak_last_date'];
  return (
    latestDateKeyFromJsonMap(cloudData['daily_stats']) ??
    latestDateKeyFromJsonMap(cloudData['stats_daily_breakdown_v1'])
  );
}

function dailyLessonHelperKeysForToday(todayKey: string = getUtcDayKey()): string[] {
  return [
    fiftyFiftyUsageKey(todayKey, 'en'),
    fiftyFiftyUsageKey(todayKey, 'fr'),
    lessonBonusHintsKey(todayKey, 'en'),
    lessonBonusHintsKey(todayKey, 'fr'),
    ...SYNC_STUDY_TARGETS.flatMap((target) =>
      GRAMMAR_HINT_STORAGE_IDS.map((id) => grammarHintSeenKey(id, target)),
    ),
  ];
}

async function addTodayLessonHelperSnapshots(data: Record<string, string | null>): Promise<void> {
  const dailyLessonHelperKeys = dailyLessonHelperKeysForToday();
  const dailyLessonHelperValues = await AsyncStorage.multiGet(dailyLessonHelperKeys);
  for (const [key, value] of dailyLessonHelperValues) {
    if (value !== null && value !== undefined && value !== '') {
      data[key] = value;
    }
  }
}

const getAuth = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/auth').default();
  } catch {
    return null;
  }
};

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

const getFunctionsCallable = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    return httpsCallable(getFunctions(getApp(), 'us-central1'), 'accountDeleteMine');
  } catch {
    return null;
  }
};

// ── Получить или создать анонимного пользователя ─────────────────────────────
// Возвращает stable ID (переживает переустановку), при наличии Firebase — также входит анонимно.
// ВАЖНО: ждём signInAnonymously чтобы избежать гонки на холодном старте — иначе
// первые Firestore операции (league_groups, leaderboard write) падают с PERMISSION_DENIED.
async function isAccountDeleteIdentityQuarantined(): Promise<boolean> {
  const auth = getAuth();
  try {
    return await readAccountDeleteIdentityQuarantine(auth?.currentUser);
  } catch {
    return true;
  }
}

let _anonAuthReady: Promise<void> | null = null;
function ensureAnonAuthReady(): Promise<void> {
  if (_anonAuthReady) return _anonAuthReady;
  const auth = getAuth();
  if (!auth) return Promise.resolve();
  if (auth.currentUser) return Promise.resolve();
  _anonAuthReady = (async () => {
    try {
      await initFirebaseAppCheckIfAvailable().catch(() => false);
      await withTimeout(auth.signInAnonymously(), ANON_AUTH_READY_TIMEOUT_MS, 'anon_auth_ready');
    } catch {
      // офлайн / транзиентная ошибка — следующий вызов ensureAnonUser
      // увидит !currentUser и попробует снова.
      _anonAuthReady = null;
    }
  })();
  return _anonAuthReady;
}

export async function waitForAnonAuth(timeoutMs = 20_000): Promise<boolean> {
  const auth = getAuth();
  if (!auth) return false;
  if (auth.currentUser) return true;
  const step = 250;
  const steps = Math.ceil(timeoutMs / step);
  for (let i = 0; i < steps; i++) {
    await new Promise<void>((r) => setTimeout(r, step));
    if (auth.currentUser) return true;
  }
  return false;
}

export async function ensureAnonUser(
  options: { cacheOnly?: boolean } = {},
): Promise<string | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  if (await isAccountDeleteIdentityQuarantined()) return null;
  const auth = getAuth();
  // Existing provider sessions are already authenticated; callers use this
  // legacy helper to obtain their canonical stable key as well.
  if (auth?.currentUser && auth.currentUser.isAnonymous !== true) {
    return getCanonicalUserId();
  }
  const detailed = await ensureAnonIdentityDetailed(options);
  return detailed.ok ? detailed.stableId : null;
}

export type EnsureAnonIdentityDetailedResult =
  | { ok: true; authUid: string; stableId: string; isAnonymous: true }
  | {
      ok: false;
      failure:
        | 'cloud_sync_disabled'
        | 'identity_quarantined'
        | 'anonymous_auth_unavailable'
        | 'stable_identity_unavailable';
    };

/** Strict proof used only when post-delete rotation requires a fresh anonymous pair. */
export async function ensureAnonIdentityDetailed(
  options: { cacheOnly?: boolean } = {},
): Promise<EnsureAnonIdentityDetailedResult> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    return { ok: false, failure: 'cloud_sync_disabled' };
  }
  if (await isAccountDeleteIdentityQuarantined()) {
    return { ok: false, failure: 'identity_quarantined' };
  }
  const auth = getAuth();
  if (!auth) return { ok: false, failure: 'anonymous_auth_unavailable' };
  if (!options.cacheOnly && !auth.currentUser) await ensureAnonAuthReady();
  const current = auth.currentUser;
  if (!current || current.isAnonymous !== true || !String(current.uid || '').trim()) {
    return { ok: false, failure: 'anonymous_auth_unavailable' };
  }
  const stableId = String(await getCanonicalUserId().catch(() => '') || '').trim();
  if (!stableId) return { ok: false, failure: 'stable_identity_unavailable' };
  return { ok: true, authUid: current.uid, stableId, isAnonymous: true };
}

async function waitForFirebaseAuthUid(): Promise<string | null> {
  let authUid = getAuthUserId();
  if (authUid) return authUid;
  // Холодный старт (Redmi/Android 10): Firebase Auth/мост поднимаются дольше
  // старых ~1.4с — auth_link обрывался ДО появления uid (инцидент 2026-07-21).
  for (let i = 0; i < 80; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    authUid = getAuthUserId();
    if (authUid) return authUid;
  }
  return null;
}

type CallableOptions = { timeout?: number };

function callable<TReq, TRes>(name: string, options?: CallableOptions) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const typedHttpsCallable = httpsCallable as <Req, Res>(
    functionsInstance: unknown,
    callableName: string,
    callableOptions?: CallableOptions,
  ) => (data: Req) => Promise<{ data: Res }>;
  return typedHttpsCallable<TReq, TRes>(getFunctions(getApp(), 'us-central1'), name, options);
}

// ── Прогрев callable-функций входа ────────────────────────────────────────────
let lastAuthWarmupAtMs = 0;
const AUTH_WARMUP_THROTTLE_MS = 10 * 60_000;

/**
 * зачем: владелец 2026-08-22 — вход через Google висел 10–30 с из-за холодных
 * стартов серверных функций в серийной цепочке входа. Экран входа открыт →
 * юзер ещё читает/выбирает аккаунт в окне Google (5–15 с), а контейнеры трёх
 * функций пути входа уже поднимаются (warmup-ветка на сервере: без auth, без
 * Firestore). У authEnsureStableLink есть minInstances:1 — пинг хеджирует
 * занятый тёплый инстанс. Троттл 10 мин: повторные открытия экрана не жгут
 * вызовы (Firebase-экономия); сам вызов — копейки ($0.40 за миллион).
 * Fire-and-forget: любой сбой прогрева не влияет на вход.
 */
export function warmAuthSignInCallables(): void {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  const nowMs = Date.now();
  if (nowMs - lastAuthWarmupAtMs < AUTH_WARMUP_THROTTLE_MS) return;
  lastAuthWarmupAtMs = nowMs;
  const names = ['authEnsureStableLink', 'authStampAnonOwnership', 'authMergeStableAccounts'];
  for (const name of names) {
    try {
      const fn = callable<{ warmup: true }, { warm?: boolean }>(name);
      void fn({ warmup: true }).catch(() => {});
    } catch (e) {
      // прогрев best-effort
      DebugLogger.error('cloud_sync:fn', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
}

export async function ensureStableAuthLinkForStableIdDetailed(
  stableIdRaw: string,
  metadata?: StableAuthLinkMetadata,
  options: { requireAuthoritative?: boolean } = {},
): Promise<StableAuthLinkEnsureResult> {
  const requestedStableId = String(stableIdRaw || '').trim();
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    return { ok: true, requestedStableId, stableUid: requestedStableId || null, authUid: null, source: 'disabled' };
  }
  const stableId = String(stableIdRaw || '').trim();
  if (await isAccountDeleteIdentityQuarantined()) {
    const authUid = getAuth()?.currentUser?.uid ?? null;
    return { ok: false, requestedStableId: stableId, stableUid: null, authUid, source: 'unavailable', failure: 'identity_unavailable' };
  }
  const authUid = await waitForFirebaseAuthUid();
  if (!stableId || !authUid) {
    return { ok: false, requestedStableId: stableId, stableUid: null, authUid, source: 'unavailable', failure: 'identity_unavailable' };
  }

  const key = `${stableId}:${authUid}`;
  const hasFreshMetadata = metadata != null && Object.keys(metadata).length > 0;
  if (!options.requireAuthoritative && !hasFreshMetadata && await readStableAuthLinkCache(key)) {
    return { ok: true, requestedStableId: stableId, stableUid: stableId, authUid, source: 'cache' };
  }
  const promiseKey = [key, hasFreshMetadata ? 'metadata' : '', options.requireAuthoritative ? 'authoritative' : '']
    .filter(Boolean)
    .join(':');
  if (stableAuthLinkPromise && stableAuthLinkKey === promiseKey) return stableAuthLinkPromise;

  stableAuthLinkKey = promiseKey;
  stableAuthLinkPromise = (async () => {
    const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
    try {
      const fn = callable<
        { stableId: string; linkMetadata?: StableAuthLinkMetadata },
        { ok: boolean; stableUid: string; authUid: string; identityReady: boolean }
      >('authEnsureStableLink');
      const res = await withTimeout(
        fn({ stableId, ...(hasFreshMetadata ? { linkMetadata: metadata } : {}) }),
        STABLE_AUTH_LINK_TIMEOUT_MS,
        'auth_link_callable',
      );
      const actualStableUid = String(res?.data?.stableUid ?? '').trim();
      const actualAuthUid = String(res?.data?.authUid ?? authUid).trim() || authUid;
      const ok = res?.data?.ok === true && res.data.identityReady === true && actualStableUid.length > 0;
      if (ok) writeStableAuthLinkCache(`${actualStableUid}:${actualAuthUid}`).catch(() => {});
      return {
        ok,
        requestedStableId: stableId,
        stableUid: ok ? actualStableUid : null,
        authUid: actualAuthUid,
        source: 'callable',
        ...(ok ? {} : { failure: 'identity_unavailable' as const }),
      };
    } catch (error) {
      if (__DEV__) console.warn('[cloud_sync] authEnsureStableLink callable failed', error);
      const failure = classifyCloudAccessFailure(error, appCheckReady);
      return {
        ok: false,
        requestedStableId: stableId,
        stableUid: null,
        authUid,
        source: 'unavailable',
        failure,
        ...(failure === 'identity_retired'
          ? { retiredSubject: classifyRetiredIdentitySubject(error) }
          : {}),
      };
    } finally {
      stableAuthLinkPromise = null;
    }
  })();

  return stableAuthLinkPromise;
}

export async function ensureStableAuthLinkForStableId(stableIdRaw: string): Promise<boolean> {
  const result = await ensureStableAuthLinkForStableIdDetailed(stableIdRaw);
  return result.ok;
}

export async function ensureStableAuthLink(): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return true;
  const stableId = await ensureAnonUser();
  if (!stableId) return false;
  const first = await ensureStableAuthLinkForStableIdDetailed(stableId);
  if (first.ok || first.failure !== 'stable_id_mismatch') return first.ok;

  // зачем: замкнутая ловушка (инцидент 2026-08-16). После удаления аккаунта
  // на устройстве остаётся stableId, которым владеет уже стёртый uid. Сервер
  // отвечает stable_id_mismatch, привязка не создаётся — и следом отказывает
  // ВСЁ, что её требует: облачная синхронизация, лиги, Арена (та показывала
  // «Арена не включена на сервере»). Само удаление аккаунта тоже идёт через
  // эту привязку, поэтому выйти из ловушки изнутри приложения было нельзя —
  // только переустановкой. Для App Store это блокер.
  //
  // Ротация такая же, как на входе через провайдера (auth_provider.ts): чужой
  // stableId не присваиваем и данные не сливаем — просто заводим свой новый.
  // Прогресс на устройстве остаётся, потому что clearStableId трогает только
  // якорь личности.
  try {
    await clearStableId();
    const rotated = await ensureAnonUser();
    if (!rotated || rotated === stableId) return false;
    const second = await ensureStableAuthLinkForStableIdDetailed(rotated);
    if (__DEV__ && !second.ok) {
      console.warn('[cloud_sync] stale stable id rotated but link still failed:', second.failure);
    }
    return second.ok;
  } catch (e) {
    if (__DEV__) console.warn('[cloud_sync] stale stable id rotation failed', e);
    return false;
  }
}

/**
 * Принудительно пересоздать серверную привязку, игнорируя локальный кэш.
 *
 * зачем (владелец, 2026-08-27, «снова та же ошибка стейбл айдентити»):
 * ensureStableAuthLinkForStableIdDetailed на строке ~2206 возвращает ok:true
 * БЕЗ похода на сервер, если в AsyncStorage лежит свежая отметка
 * `${stableId}:${authUid}`. Отметка живёт по TTL и не стирается, когда сервер
 * на самом деле про эту личность ничего не знает — база могла быть очищена,
 * проект/эмулятор сменился, документ удалён. Тогда получается замкнутая
 * ловушка: ensureStableAuthLink() мгновенно говорит «привязка есть», ничего
 * не создав, а следующий callable с requireKnownIdentity:true честно отвечает
 * stable_id_required → stable_identity_unavailable, и так до истечения TTL.
 * Эта функция стирает отметку и заставляет реальный вызов authEnsureStableLink.
 * Звать ТОЛЬКО как реакцию на уже полученную ошибку личности, не в горячем
 * пути — иначе потеряется весь смысл кэша.
 */
export async function repairStableAuthLinkAfterIdentityFailure(): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return true;
  await AsyncStorage.removeItem(STABLE_AUTH_LINK_CACHE_KEY).catch(() => {});
  stableAuthLinkPromise = null;
  stableAuthLinkKey = '';
  const stableId = await ensureAnonUser();
  if (!stableId) return false;
  const result = await ensureStableAuthLinkForStableIdDetailed(stableId, undefined, {
    requireAuthoritative: true,
  });
  if (result.ok) return true;
  // Тот же выход из ловушки «чужой stableId», что и в ensureStableAuthLink:
  // локальный якорь принадлежит стёртому uid — заводим свой новый.
  if (result.failure !== 'stable_id_mismatch') return false;
  try {
    await clearStableId();
    const rotated = await ensureAnonUser();
    if (!rotated || rotated === stableId) return false;
    return (await ensureStableAuthLinkForStableIdDetailed(rotated, undefined, {
      requireAuthoritative: true,
    })).ok;
  } catch {
    return false;
  }
}

export type AuthRecoveryHint = {
  found: boolean;
  linked: boolean;
  provider?: 'google' | 'apple' | null;
  maskedEmail?: string | null;
};

export type AuthRecoveryCodeRequestResult = {
  ok: true;
  maskedEmail: string;
  expiresInSec: number;
  provider: 'google' | 'apple';
};

export type AuthRecoveryCodeConfirmResult = {
  ok: true;
  stableId: string;
  recoveryEventId: string;
  handoffEligibleUntil: number;
};

export class AuthSessionChangedError extends Error {
  readonly code = 'auth_session_changed' as const;

  constructor() {
    super('auth_session_changed');
    this.name = 'AuthSessionChangedError';
  }
}

function captureRecoveryAuthSession(): string {
  const authUid = getCurrentUid();
  if (!authUid) throw new AuthSessionChangedError();
  return authUid;
}

function assertRecoveryAuthSession(expectedAuthUid: string): void {
  if (getCurrentUid() !== expectedAuthUid) throw new AuthSessionChangedError();
}

/**
 * Подсказка «каким аккаунтом входить» для recovery-модалки: сервер отдаёт
 * только МАСКУ email (usk***@gmail.com) и провайдера по stable_id — полный
 * email никогда не покидает сервер. Best-effort: любой сбой → null, модалка
 * просто показывается без подсказки.
 */
export async function fetchAuthRecoveryHint(stableIdRaw: string): Promise<AuthRecoveryHint | null> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return null;
  const stableId = String(stableIdRaw || '').trim();
  if (!stableId) return null;
  const authUid = await waitForFirebaseAuthUid();
  if (!authUid) return null;
  try {
    const fn = callable<{ stableId: string }, AuthRecoveryHint>('authRecoveryHint');
    const res = await withTimeout(fn({ stableId }), STABLE_AUTH_LINK_TIMEOUT_MS, 'recovery_hint');
    return res?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Запрашивает email-код восстановления. Ошибки callable намеренно не
 * преобразуются: UI должен различать исходные Firebase/HttpsError code и message
 * (`resource-exhausted`, `recovery_no_email`, `account_delete_pending`, ...).
 */
export async function requestAuthRecoveryCode(
  stableIdRaw: string,
): Promise<AuthRecoveryCodeRequestResult> {
  const stableId = String(stableIdRaw || '').trim();
  const expectedAuthUid = captureRecoveryAuthSession();
  await initFirebaseAppCheckIfAvailable().catch(() => false);
  assertRecoveryAuthSession(expectedAuthUid);
  const fn = callable<{ stableId: string }, AuthRecoveryCodeRequestResult>(
    'authRequestRecoveryCode',
    { timeout: STABLE_AUTH_LINK_TIMEOUT_MS },
  );
  const res = await fn({ stableId });
  assertRecoveryAuthSession(expectedAuthUid);
  const data = res?.data;
  if (
    data?.ok !== true
    || typeof data.maskedEmail !== 'string'
    || !data.maskedEmail.trim()
    || typeof data.expiresInSec !== 'number'
    || !Number.isFinite(data.expiresInSec)
    || data.expiresInSec <= 0
    || (data.provider !== 'google' && data.provider !== 'apple')
  ) {
    throw new Error('auth_recovery_request_response_invalid');
  }
  return {
    ok: true,
    maskedEmail: data.maskedEmail.trim(),
    expiresInSec: data.expiresInSec,
    provider: data.provider,
  };
}

/** Подтверждает код, сохраняя исходный HttpsError для точного UI-mapping. */
export async function confirmAuthRecoveryCode(
  stableIdRaw: string,
  codeRaw: string,
): Promise<AuthRecoveryCodeConfirmResult> {
  const stableId = String(stableIdRaw || '').trim();
  const code = String(codeRaw || '').trim();
  const expectedAuthUid = captureRecoveryAuthSession();
  await initFirebaseAppCheckIfAvailable().catch(() => false);
  assertRecoveryAuthSession(expectedAuthUid);
  const fn = callable<
    { stableId: string; code: string },
    AuthRecoveryCodeConfirmResult
  >('authConfirmRecoveryCode', { timeout: STABLE_AUTH_LINK_TIMEOUT_MS });
  const res = await fn({ stableId, code });
  assertRecoveryAuthSession(expectedAuthUid);
  const data = res?.data;
  const recoveryEventId = String(data?.recoveryEventId ?? '').trim();
  if (
    data?.ok !== true
    || String(data.stableId ?? '').trim() !== stableId
    || !recoveryEventId
    || recoveryEventId.length > 160
    || recoveryEventId.includes('/')
    || typeof data.handoffEligibleUntil !== 'number'
    || !Number.isFinite(data.handoffEligibleUntil)
    || data.handoffEligibleUntil <= Date.now()
  ) {
    throw new Error('auth_recovery_confirm_response_invalid');
  }
  return {
    ok: true,
    stableId,
    recoveryEventId,
    handoffEligibleUntil: data.handoffEligibleUntil,
  };
}

export type AuthRecoveryHandoffCompleteResult = Readonly<{
  ok: true;
  recoveryEventId: string;
  completed: true;
}>;

/** Acks an adopted recovery session on the default Auth app with UID drift guards. */
export async function completeAuthRecoveryHandoffViaServer(
  recoveryEventIdRaw: string,
): Promise<AuthRecoveryHandoffCompleteResult> {
  const recoveryEventId = String(recoveryEventIdRaw ?? '').trim();
  if (!recoveryEventId || recoveryEventId.length > 160 || recoveryEventId.includes('/')) {
    throw new Error('auth_recovery_event_id_invalid');
  }
  const expectedAuthUid = captureRecoveryAuthSession();
  await initFirebaseAppCheckIfAvailable().catch(() => false);
  assertRecoveryAuthSession(expectedAuthUid);
  const fn = callable<
    { recoveryEventId: string },
    AuthRecoveryHandoffCompleteResult
  >('authCompleteRecoveryHandoff', { timeout: STABLE_AUTH_LINK_TIMEOUT_MS });
  const res = await fn({ recoveryEventId });
  assertRecoveryAuthSession(expectedAuthUid);
  const data = res?.data;
  if (
    data?.ok !== true
    || data.completed !== true
    || String(data.recoveryEventId ?? '').trim() !== recoveryEventId
  ) {
    throw new Error('auth_recovery_handoff_response_invalid');
  }
  return { ok: true, recoveryEventId, completed: true };
}

export type MergeStableAccountsResult = {
  ok: boolean;
  canonicalStableId: string;
  mergedFromStableId: string | null;
  alreadyMerged: boolean;
};

/**
 * Сливает два stable-id аккаунта на СЕРВЕРЕ (Admin SDK, обходит Firestore rules).
 * Заменяет клиентскую транзакцию слияния, которая падала по правам при чтении
 * чужого users-дока (корень бага расслоения аккаунтов).
 *
 * Возвращает null, если вызов недоступен/упал — вызывающая сторона ОБЯЗАНА в этом
 * случае НЕ переключать stable_id (лучше оставить как есть, чем создать третий
 * профиль).
 */
export async function mergeStableAccountsViaServer(
  stableIdA: string,
  stableIdB: string,
): Promise<MergeStableAccountsResult | null> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return null;
  if (await isAccountDeleteIdentityQuarantined()) return null;
  const a = String(stableIdA || '').trim();
  const b = String(stableIdB || '').trim();
  if (!a || !b) return null;
  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = callable<
      { stableIdA: string; stableIdB: string },
      MergeStableAccountsResult
    >('authMergeStableAccounts');
    const res = await withTimeout(
      fn({ stableIdA: a, stableIdB: b }),
      STABLE_AUTH_LINK_TIMEOUT_MS,
      'auth_merge_callable',
    );
    return res?.data ?? null;
  } catch (e) {
    if (__DEV__) console.warn('[cloud_sync] mergeStableAccountsViaServer failed', e);
    return null;
  }
}

/**
 * Сбросить in-memory кеш ensureAnonAuthReady().
 * Вызывается из auth_provider.signOutCurrentProvider() после auth.signOut(),
 * чтобы следующий ensureAnonUser() заново вызвал signInAnonymously().
 * Без этого после force sign-out + любого Firestore write словим PERMISSION_DENIED
 * до перезапуска приложения (currentUser=null, но закешированный resolved Promise
 * убеждает все вызывающие что "анонимная сессия уже готова").
 */
export function resetAnonAuthCacheForSignOut(): void {
  _anonAuthReady = null;
  stableAuthLinkPromise = null;
  stableAuthLinkKey = '';
  AsyncStorage.removeItem(STABLE_AUTH_LINK_CACHE_KEY).catch(() => {});
}

// ── Получить uid текущего пользователя ───────────────────────────────────────
export function getCurrentUid(): string | null {
  if (isAccountDeleteIdentityQuarantinedFromKnownState(getAuth()?.currentUser)) return null;
  return getAuthUserId();
}

/**
 * Atomically abandons account-scoped local state when the server identity anchor
 * disagrees with the cached stable id. No source-account value may survive into
 * the authoritative account generation.
 */
async function adoptAuthoritativeStableIdentity(
  localStableIdRaw: string,
  authoritativeStableIdRaw: string,
): Promise<boolean> {
  const localStableId = String(localStableIdRaw || '').trim();
  const authoritativeStableId = String(authoritativeStableIdRaw || '').trim();
  if (!localStableId || !authoritativeStableId) return false;
  if (localStableId === authoritativeStableId) return true;

  const sourceGeneration = captureAccountGeneration();
  if (!isCurrentAccountGeneration(sourceGeneration, localStableId)) return false;

  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(sourceGeneration, localStableId)) return false;
    await wipeLocalAccountDataUnsafe();
    if (!isCurrentAccountGeneration(sourceGeneration, localStableId)) return false;
    await setStableId(authoritativeStableId);
    beginAccountGeneration(authoritativeStableId);
    stableAuthLinkPromise = null;
    stableAuthLinkKey = '';
    await AsyncStorage.removeItem(STABLE_AUTH_LINK_CACHE_KEY).catch(() => {});
    invalidatePremiumCache();
    return true;
  });
}

export type AuthoritativeCloudIdentityResult = {
  ok: boolean;
  stableUid: string | null;
  adopted: boolean;
};

export type CloudMutationIdentityResult =
  | { status: 'ready'; stableUid: string; authUid: string }
  | { status: 'retired'; subject: 'stable' | 'auth' | 'closure' | 'unknown' }
  | { status: 'pending' };

export async function ensureCloudMutationIdentity(
  stableIdRaw: string,
): Promise<CloudMutationIdentityResult> {
  const result = await ensureStableAuthLinkForStableIdDetailed(
    stableIdRaw,
    undefined,
    { requireAuthoritative: true },
  );
  if (
    result.ok
    && result.stableUid
    && result.authUid
    && result.stableUid === String(stableIdRaw || '').trim()
  ) {
    return { status: 'ready', stableUid: result.stableUid, authUid: result.authUid };
  }
  if (result.failure === 'identity_retired') {
    const subject = result.retiredSubject ?? 'unknown';
    emitAppEvent('identity_retired', { source: 'cloud_mutation', subject });
    return { status: 'retired', subject };
  }
  return { status: 'pending' };
}

/**
 * Mandatory precondition for client-initiated cloud mutation. This deliberately
 * bypasses the seven-day local auth-link cache: only the server can establish
 * which stable account the current Firebase credential owns.
 */
export async function ensureAuthoritativeIdentityForCloudMutation(
  stableIdRaw: string,
): Promise<AuthoritativeCloudIdentityResult> {
  const localStableId = String(stableIdRaw || '').trim();
  const stableLink = await ensureStableAuthLinkForStableIdDetailed(
    localStableId,
    undefined,
    { requireAuthoritative: true },
  );
  if (!stableLink.ok || !stableLink.stableUid) {
    return { ok: false, stableUid: stableLink.stableUid, adopted: false };
  }
  if (stableLink.stableUid === localStableId) {
    return { ok: true, stableUid: localStableId, adopted: false };
  }

  const adopted = await adoptAuthoritativeStableIdentity(localStableId, stableLink.stableUid);
  if (adopted) {
    // Hydrate the canonical account only after the source-account wipe and id swap.
    await restoreAndMigrateFromCloudResult(false).catch(() => failedCloudRestoreAttempt('transport_unavailable'));
  }
  // The operation which discovered the mismatch must never continue with its
  // source-generation payload. A later operation will capture the new generation.
  return { ok: false, stableUid: stableLink.stableUid, adopted };
}

// ── Синхронизировать прогресс в облако ───────────────────────────────────────
// Вызывать после важных событий: завершение урока, изменение XP, streak и т.д.
export function markCloudSyncPending(): void {
  pendingSync = true;
}

export async function syncToCloud(options?: { forceNow?: boolean; deferMs?: number }): Promise<void> {
  pendingSync = true;
  if (syncInFlight) return;
  if (options?.forceNow) {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    await runSyncNow();
    return;
  }
  if (isJestRuntime()) return;
  if (options?.deferMs !== undefined) {
    if (syncTimer) return;
    const waitMs = Math.max(0, Math.floor(options.deferMs));
    syncTimer = setCloudSyncTimer(() => {
      syncTimer = null;
      runSyncNow().catch(() => {});
    }, waitMs);
    return;
  }
  const now = Date.now();
  const elapsed = now - lastSuccessfulSyncAt;
  if (elapsed >= SYNC_DEBOUNCE_MS) {
    await runSyncNow();
    return;
  }
  if (syncTimer) return;
  const waitMs = Math.max(500, SYNC_DEBOUNCE_MS - elapsed);
  syncTimer = setCloudSyncTimer(() => {
    syncTimer = null;
    runSyncNow().catch(() => {});
  }, waitMs);
}

async function runSyncNow(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = doSyncToCloud()
    .catch((e) => { if (__DEV__) console.warn('[cloud_sync] runSyncNow: sync failed', e); })
    .finally(() => {
      syncInFlight = null;
      if (pendingSync) {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setCloudSyncTimer(() => {
          syncTimer = null;
          runSyncNow().catch(() => {});
        }, SYNC_DEBOUNCE_MS);
      }
    });
  return syncInFlight;
}

function safeParseObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function numField(obj: Record<string, unknown>, key: string): number {
  const n = typeof obj[key] === 'number' ? obj[key] : Number(obj[key]);
  return Number.isFinite(n) ? n : 0;
}

function loginBonusMergeValue(localRaw: string | null, cloudRaw: string | null | undefined): string | null {
  if (cloudRaw === null || cloudRaw === undefined || !String(cloudRaw).trim()) return null;
  const cloud = safeParseObject(cloudRaw);
  const local = safeParseObject(localRaw);
  const cloudLastDate = typeof cloud.lastDate === 'string' ? cloud.lastDate : null;
  const localLastDate = typeof local.lastDate === 'string' ? local.lastDate : null;
  if (!isDateKey(cloudLastDate)) return null;
  if (!isDateKey(localLastDate) || cloudLastDate > localLastDate) return String(cloudRaw);
  if (cloudLastDate === localLastDate && numField(cloud, 'consecutiveDays') > numField(local, 'consecutiveDays')) {
    return String(cloudRaw);
  }
  return null;
}

// Ключи косметики/команд, которые админка/облако могут выдать поверх client-owned
// состояния. Строками (а не импортом из constants), чтобы не тянуть лишнюю зависимость.
const AVATAR_AURA_OWNED_KEY = 'avatar_aura_owned_v1';
const USER_AVATAR_AURA_KEY = 'user_avatar_aura';
const AVATAR_AURA_GIFT_OWNED_KEY = 'avatar_aura_gift_owned_v1';
const ADMIN_ENERGY_COMMAND_KEY = 'admin_energy_command';

/**
 * Union-merge двух owned-мап вида {[id]: true} (JSON-строки). Возвращает merged JSON,
 * если облако добавляет хотя бы один id, которого нет локально; иначе null (менять нечего).
 * Так админская выдача ауры догоняет устройство, а локально купленные ауры не теряются.
 */
function mergeOwnedFlagMap(localRaw: string | null, cloudRaw: string | null | undefined): string | null {
  if (cloudRaw === null || cloudRaw === undefined || !String(cloudRaw).trim()) return null;
  const cloud = safeParseObject(cloudRaw);
  const cloudIds = Object.keys(cloud).filter((k) => cloud[k] === true || cloud[k] === 'true');
  if (!cloudIds.length) return null;
  const local = safeParseObject(localRaw);
  const merged: Record<string, true> = {};
  for (const k of Object.keys(local)) {
    if (local[k] === true || local[k] === 'true') merged[k] = true;
  }
  let changed = false;
  for (const id of cloudIds) {
    if (!merged[id]) { merged[id] = true; changed = true; }
  }
  return changed ? JSON.stringify(merged) : null;
}

function canonicalGiftPerkStorageValue(
  rootValue: unknown,
  progressValue: unknown,
  metric: 'daysLeft' | 'expiresAt',
): string | null | undefined {
  const candidates = [rootValue, progressValue].filter((value) => value !== undefined) as unknown[];
  if (candidates.length === 0) return undefined;
  let selected = candidates[0];
  let selectedMetric = numField(safeParseObject(selected), metric);
  for (const candidate of candidates.slice(1)) {
    const candidateMetric = numField(safeParseObject(candidate), metric);
    if (candidateMetric > selectedMetric) {
      selected = candidate;
      selectedMetric = candidateMetric;
    }
  }
  if (selected === null) return null;
  return typeof selected === 'string' ? selected : JSON.stringify(selected);
}

function canonicalGiftCountStorageValue(
  rootValue: unknown,
  progressValue: unknown,
): string | null | undefined {
  const candidates = [rootValue, progressValue].filter((value) => value !== undefined);
  if (candidates.length === 0) return undefined;
  const count = candidates.reduce<number>((highest, value) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) ? Math.max(highest, Math.max(0, parsed)) : highest;
  }, 0);
  return count > 0 ? String(count) : null;
}

async function buildGiftEntitlementStickyPairs(cloudData: Record<string, string | null>): Promise<{
  pairs: [string, string][];
  removeKeys: string[];
}> {
  const pairs: [string, string][] = [];
  const removeKeys: string[] = [];

  const cloudShield = cloudData['chain_shield'];
  const cloudShieldState = safeParseObject(cloudShield);
  if (cloudShield && numField(cloudShieldState, 'daysLeft') > 0) pairs.push(['chain_shield', String(cloudShield)]);
  else removeKeys.push('chain_shield');

  const cloudXpBoost = cloudData['gift_xp_multiplier'];
  const cloudXpState = safeParseObject(cloudXpBoost);
  if (cloudXpBoost && numField(cloudXpState, 'expiresAt') > Date.now()) pairs.push(['gift_xp_multiplier', String(cloudXpBoost)]);
  else removeKeys.push('gift_xp_multiplier');

  const clubGiftFreeBoostCount = Number.parseInt(String(cloudData['club_gift_free_boost_v1'] ?? ''), 10);
  if (Number.isFinite(clubGiftFreeBoostCount) && clubGiftFreeBoostCount > 0) {
    pairs.push(['club_gift_free_boost_v1', String(clubGiftFreeBoostCount)]);
  } else {
    removeKeys.push('club_gift_free_boost_v1');
  }

  return { pairs, removeKeys };
}

async function doSyncToCloud(): Promise<void> {
  if (!pendingSync) return;
  pendingSync = false;
  if (!CLOUD_SYNC_ENABLED) return;
  const db = getFirestore();
  if (!db) return;
  const uid = await ensureAnonUser();
  if (!uid) return;
  beginInitialAccountGeneration(uid);
  const syncGeneration = captureAccountGeneration();
  const isSyncGenerationCurrent = () => isCurrentAccountGeneration(syncGeneration, uid);
  if (!isSyncGenerationCurrent()) return;
  try {
    // зачем: облачные мутации выполняем только под подтверждённой каноничной
    // идентичностью — иначе очередь может дописать чужому аккаунту.
    const authoritativeIdentity = await ensureAuthoritativeIdentityForCloudMutation(uid);
    if (!authoritativeIdentity.ok || authoritativeIdentity.stableUid !== uid || !isSyncGenerationCurrent()) return;
    for (const target of SYNC_STUDY_TARGETS) {
      await uploadMistakePracticeEvents({ accountScope: uid, studyTarget: target });
      if (!isSyncGenerationCurrent()) return;
    }
    await resumePendingReportReplyShardClaims().catch(() => {});
    if (!isSyncGenerationCurrent()) return;
    // K3: проиграть офлайн-очередь атомарных дельт осколков (идемпотентно по opId).
    await resumePendingShardDeltas().catch(() => {});
    if (!isSyncGenerationCurrent()) return;
    await repairDevSeededStreakInStorage();
    if (!isSyncGenerationCurrent()) return;
    const pairs = await AsyncStorage.multiGet(getRuntimeSyncKeys());
    if (!isSyncGenerationCurrent()) return;
    const data: Record<string, string | null> = {};
    for (const [key, value] of pairs) {
      data[key] = value;
    }
    // Маппинг: внутренние ключи → ключи Firestore для аналитики
    const achievementsV1 = await AsyncStorage.getItem('achievements_v1');
    if (!isSyncGenerationCurrent()) return;
    if (achievementsV1) data['achievements_state'] = achievementsV1;
    if (data['app_lang']) data['lang'] = data['app_lang'];
    if (data['user_frame']) data['user_avatar_frame'] = data['user_frame'];

    await addTodayLessonHelperSnapshots(data);
    if (!isSyncGenerationCurrent()) return;
    const phoneStateOwnsCore = phoneStateOwnsCoreProgress(uid);
    if (phoneStateOwnsCore) {
      for (const key of Object.keys(data)) {
        if (isPhoneStateCoreProgressKey(key)) delete data[key];
      }
    }

    // Сравниваем с последним синкнутым снапшотом и отправляем только изменённые поля.
    // Это снижает сетевой шум и частоту "пустых" write-операций.
    let previousSnapshot: Record<string, string | null> = {};
    try {
      const snapRaw = await AsyncStorage.getItem(LAST_SYNC_SNAPSHOT_KEY);
      if (!isSyncGenerationCurrent()) return;
      if (snapRaw) previousSnapshot = JSON.parse(snapRaw);
    } catch (e) {
      DebugLogger.error('cloud_sync:snapRaw', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    const progressPatch: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!shouldSyncPremiumProgressField(key, value, data)) continue;
      // Premium/VIP-поля клиент НИКОГДА не пишет в облако: их авторитетный источник —
      // RevenueCat webhook / Telegram / admin-панель (Admin SDK). Firestore rules
      // (progressHasNoPremiumWrites) отклонят такую запись для обычного юзера и уронят
      // весь set целиком (вместе с XP/streak). Поэтому вычищаем их из patch заранее.
      if (PREMIUM_PROGRESS_KEYS.has(key)) continue;
      // Server-owned ключи (Сокровищница): пишет только CF, исходящая запись
      // была бы отклонена rules и уронила бы весь set.
      if (isServerOwnedProgressKey(key)) continue;
      if (!cloudSyncSnapshotValueMatches(previousSnapshot[key], value)) progressPatch[key] = value;
    }

    // Set created_at without per-sync read to reduce Firestore read costs.
    // We keep a local marker and send created_at only once per install/session migration.
    const now = Date.now();
    const needHeartbeat = now - lastSuccessfulSyncAt >= SYNC_HEARTBEAT_MS;
    const needActivityStamp = now - lastActivityStampAt >= ACTIVITY_STAMP_INTERVAL_MS;
    const hasProgressPatch = Object.keys(progressPatch).length > 0;
    if (!needHeartbeat && !needActivityStamp && !hasProgressPatch) return;
    const docRef = db.collection('users').doc(uid);
    const createdAtSynced = await AsyncStorage.getItem(CREATED_AT_SYNC_KEY);
    if (!isSyncGenerationCurrent()) return;
    const shouldSendCreatedAt = !createdAtSynced;
    if (!hasProgressPatch && !shouldSendCreatedAt) {
      lastSuccessfulSyncAt = now;
      if (needActivityStamp || needHeartbeat) lastActivityStampAt = now;
      return;
    }
    // зачем: firebaseAuthUid — server-owned поле (firestore.rules
    // serverOwnedUserIdentityFields). Клиент его НЕ пишет: правило
    // hasNoServerIdentityWrites считает diff со старым значением, и как только
    // серверное значение расходится с локальным (сервер ещё не проставил поле
    // после смены auth), весь set отклоняется целиком — вместе с progress/XP.
    // Именно это давало permission-denied сериями (26 отказов за вечер 26.08).
    // Авторитетный писатель — authEnsureStableLink (functions/src/auth_identity.ts:737),
    // он сам отслеживает userAuthUidChanged и обновляет поле при каждом расхождении.
    if (!isSyncGenerationCurrent()) return;
    await docRef.set(
      {
        ...(data['user_avatar'] ? { user_avatar: data['user_avatar'] } : {}),
        ...(data['user_avatar_frame'] ? { user_avatar_frame: data['user_avatar_frame'] } : {}),
        ...(hasProgressPatch ? { progress: progressPatch } : {}),
        ...(needActivityStamp || needHeartbeat || shouldSendCreatedAt ? { updatedAt: now, last_active_at: now } : {}),
        ...(shouldSendCreatedAt ? { created_at: now } : {}),
      },
      { merge: true }
    );
    if (!isSyncGenerationCurrent()) return;
    lastSuccessfulSyncAt = now;
    if (needActivityStamp || needHeartbeat || shouldSendCreatedAt) {
      lastActivityStampAt = now;
    }
    if (!isSyncGenerationCurrent()) return;
    const snapshotData: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data)) {
      if (isServerOwnedProgressKey(key)) continue;
      if (shouldSyncPremiumProgressField(key, value, data)) {
        snapshotData[key] = encodeCloudSyncSnapshotValue(value);
      }
    }
    if (!isSyncGenerationCurrent()) return;
    await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(snapshotData)).catch(() => {});
    if (!isSyncGenerationCurrent()) return;
    if (shouldSendCreatedAt) {
      await AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(() => {});
    }

    // leaderboard/{uid} обновляется только через firestore_leaderboard.ts (pushMyScore)
    // + backend reconcile в functions/src/sync_leaderboard.ts.
    // Здесь сознательно НЕ пишем leaderboard, чтобы исключить dual-writer гонки.
  } catch (e) {
    // зачем: раньше здесь была одна строка без контекста, и разбор permission-denied
    // (26 отказов за вечер 26.08) пришлось вести по firestore.rules вместо лога.
    // Печатаем uid и состав записи — какое из правил users/{userId} отклонило set,
    // видно сразу, без реконструкции payload по коду.
    if (__DEV__) {
      const code = (e as { code?: string } | null)?.code ?? '';
      if (String(code).includes('permission-denied')) {
        console.warn(
          '[cloud_sync] doSyncToCloud rejected by rules',
          { uid, authUid: getAuthUserId(), authMatchesStableId: getAuthUserId() === uid },
          e,
        );
      } else {
        console.warn('[cloud_sync] doSyncToCloud failed', e);
      }
    }
  }
}

// ── Восстановить прогресс из документа users/{uid} (без повторного get) ─────
async function applyRestoreFromUserDoc(
  doc: { exists: boolean; data: () => Record<string, unknown> | undefined },
  isCurrent: () => boolean = () => true,
  afterLegacyRestore?: (root: Record<string, unknown>) => void,
  vipGeneration?: AccountGenerationToken,
): Promise<boolean> {
  const assertCurrent = () => {
    if (!isCurrent()) throw new Error('stale_account_generation');
  };
  assertCurrent();
  if (!doc.exists) return false;
  const root = doc.data() ?? {};
  const vipOwnerStableId = vipGeneration?.stableId?.trim();
  const phoneStateOwnsCore = phoneStateOwnsCoreProgress(vipOwnerStableId ?? null);
  const completeRestore = (applied: boolean): boolean => {
    try { afterLegacyRestore?.(root); } catch (e) {
      // visual overlay must never alter restore
      DebugLogger.error('cloud_sync:completeRestore', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    return applied;
  };
  const progressServerAuthoritative = !phoneStateOwnsCore && root.progressServerAuthoritative === true;
  if (root.created_at) {
    assertCurrent();
    AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(() => {});
  }
  const progressData = root.progress && typeof root.progress === 'object' && !Array.isArray(root.progress)
    ? root.progress as Record<string, unknown>
    : {};
  const cloudData = filterLegacyProgressForPhoneState(
    progressData as Record<string, string | null>,
    phoneStateOwnsCore,
  );
  // Raw user_avatar/frame/aura fields are compatibility projections only. A
  // stale cloud snapshot must not revoke a locally committed purchase or a
  // newer PhoneState selection operation.
  if (vipGeneration?.stableId?.trim() && isCurrentAccountGeneration(vipGeneration)) {
    const selectionLevel = Math.max(1, Math.floor(Number(cloudData.user_level) || 1));
    const authority = await resolveCustomizationSelectionAuthority({
      token: vipGeneration,
      cloudSelection: {
        avatarValue: String(cloudData.user_avatar ?? '').trim() || getBestAvatarForLevel(selectionLevel),
        frameId: String(cloudData.user_avatar_frame ?? '').trim() || getBestFrameForLevel(selectionLevel).id,
        storedAuraSelection: String(cloudData.user_avatar_aura ?? '').trim() || null,
        level: selectionLevel,
      },
    }, {
      storage: AsyncStorage,
      mirror: commitPhoneStateCustomizationSelection,
      readPhoneState: readPhoneStateCustomizationSelection,
    });
    assertCurrent();
    cloudData.user_avatar = authority.selection.avatarValue;
    cloudData.user_avatar_frame = authority.selection.frameId;
    cloudData.user_avatar_aura = authority.selection.storedAuraSelection ?? '';
    // Selection authority may legitimately prefer the local journal, but a
    // DEV-only preview must remain device-local and must never be restored or
    // uploaded as the account's active customization.
    void drainCustomizationSelectionOutbox({
      token: vipGeneration,
      lineage: authority.lineage,
    }, {
      storage: AsyncStorage,
      mirror: commitPhoneStateCustomizationSelection,
    }).catch(() => {});
  }
  // Keep league recovery independent from SQLite capacity. The account cache is
  // cleared on sign-out/switch and this projection never overwrites a state that
  // the current account already loaded into memory.
  projectCloudLeagueStateSnapshot(cloudData['league_state_v3']);
  const canonicalShield = canonicalGiftPerkStorageValue(
    root.chain_shield,
    progressData.chain_shield,
    'daysLeft',
  );
  const canonicalXpBoost = canonicalGiftPerkStorageValue(
    root.gift_xp_multiplier,
    progressData.gift_xp_multiplier,
    'expiresAt',
  );
  const canonicalClubGiftFreeBoostCount = canonicalGiftCountStorageValue(
    root.club_gift_free_boost_v1,
    progressData.club_gift_free_boost_v1,
  );
  if (canonicalShield !== undefined) cloudData.chain_shield = canonicalShield;
  if (canonicalXpBoost !== undefined) cloudData.gift_xp_multiplier = canonicalXpBoost;
  if (canonicalClubGiftFreeBoostCount !== undefined) {
    cloudData.club_gift_free_boost_v1 = canonicalClubGiftFreeBoostCount;
  }
  const restoredLastActiveDate = deriveLastActiveDateForRestore(cloudData);
  if (restoredLastActiveDate && !isDateKey(cloudData['last_active_date'])) {
    cloudData['last_active_date'] = restoredLastActiveDate;
  }
  const normalizedCloudStreak = normalizeDevSeededStreakValue(parseProgressInt(cloudData['streak_count']), cloudData);
  if (String(cloudData['streak_count'] ?? '') !== String(normalizedCloudStreak)) {
    cloudData['streak_count'] = String(normalizedCloudStreak);
  }

  try {
    const { reconcileStatsDailyBreakdownWithCloud } = await import('./stats_daily_breakdown');
    assertCurrent();
    cloudData['stats_daily_breakdown_v1'] = await reconcileStatsDailyBreakdownWithCloud(
      cloudData['stats_daily_breakdown_v1'],
      'en',
    );
    assertCurrent();
    const frenchStatsKey = statsDailyBreakdownKey('fr');
    cloudData[frenchStatsKey] = await reconcileStatsDailyBreakdownWithCloud(
      cloudData[frenchStatsKey],
      'fr',
    );
    assertCurrent();
  } catch (e) {
      // ignore
      DebugLogger.error('cloud_sync:frenchStatsKey', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  const cloudHasVipEntitlementState =
    cloudData['vip_active'] !== undefined ||
    cloudData['vip_plan'] !== undefined ||
    cloudData['vip_until'] !== undefined ||
    cloudData['vip_admin_override'] !== undefined ||
    cloudData['vip_admin_grant_at'] !== undefined ||
    cloudData['premium_plan'] !== undefined ||
    cloudData['admin_premium_override'] !== undefined ||
    cloudData['premium_expiry'] !== undefined;

  // VIP issued by admin via admin/index.html. Legacy admin premium grants are
  // interpreted as VIP so real RevenueCat Premium state remains untouched.
  const cloudVipState = getVipProgressState(cloudData);
  const cloudVipActive = vipActiveFromProgress(cloudData);
  void processVipGrantForCelebration(
    cloudVipActive ? cloudVipState?.grantAt : null,
  );

  // Тестер «Снять премиум» (tester_no_premium) в dev/preview: НЕ воскрешать из
  // облака премиум/VIP/admin-grant ключи. Иначе после strip'а restoreFromCloud
  // тянет старый admin-grant обратно, VIP пересчитывается активным и доступ
  // «возвращается» сразу. В стор-сборке флаг недоступен — облако главный
  // источник истины. Серверный грант не трогаем: убрать флаг / «Без лимитов»
  // вернёт всё как было.
  const stripPremiumActive =
    !IS_STORE_RELEASE &&
    (await AsyncStorage.getItem('tester_no_premium').catch(() => null)) === 'true';
  const STRIP_SKIP_RESTORE_KEYS = new Set<string>([
    'premium_active', 'premium_plan', 'premium_expiry',
    'premium_rc_product_id', 'premium_rc_period_type', 'premium_rc_store',
    'premium_rc_expiry_ms', 'premium_rc_purchased_at_ms', 'premium_rc_updated_at',
    'premium_admin_grant_at', 'admin_premium_override',
    'vip_active', 'vip_plan', 'vip_from', 'vip_until', 'vip_expiry',
    'vip_admin_override', 'vip_admin_grant_at', 'vip_grant_at',
  ]);

  let localXPRaw: string | null;
  let localStreakRaw: string | null;
  let localLastActiveRaw: string | null;
  let localStreakLastRaw: string | null;
  try {
    [localXPRaw, localStreakRaw, localLastActiveRaw, localStreakLastRaw] = await Promise.all([
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('last_active_date'),
      AsyncStorage.getItem('streak_last_date'),
    ]);
  } catch (error) {
    assertCurrent();
    // If persisted reads are unavailable, the authenticated server ledger is
    // the only validated display source. Hydrate memory, then preserve the
    // existing restore failure so no caller mistakes persistence for success.
    if (progressServerAuthoritative) {
      patchAppSnapshotFromAuthoritativeCloudProgress(root);
    }
    throw error;
  }
  assertCurrent();
  const localXP = parseProgressInt(localXPRaw);
  const cloudXP = parseProgressInt(cloudData['user_total_xp']);
  const localStreak = parseProgressInt(localStreakRaw);
  const cloudStreak = parseProgressInt(cloudData['streak_count']);
  const hasPendingProgressEvents = phoneStateOwnsCore ? false : await (async () => {
    try {
      const progressEventsClient = await import('./progress_events_client');
      if (typeof progressEventsClient.hasPendingProgressServerEvents !== 'function') return false;
      return await progressEventsClient.hasPendingProgressServerEvents();
    } catch (error) {
      if (__DEV__) console.warn('[cloud_sync] pending-progress-events check failed', error);
      return false;
    }
  })();
  assertCurrent();
  const mergedStreak = mergeStreakByActivityDate(
    { streak: localStreakRaw, lastActive: localLastActiveRaw, streakLast: localStreakLastRaw },
    { streak: cloudData['streak_count'], lastActive: cloudData['last_active_date'], streakLast: cloudData['streak_last_date'] },
  );
  const shouldPreferCloudOnSuspiciousGap = isSuspiciousLocalXpGap(
    localXP,
    cloudXP,
    localLastActiveRaw,
    progressServerAuthoritative,
  );
  if (typeof __DEV__ !== 'undefined' && __DEV__ && shouldPreferCloudOnSuspiciousGap && hasPendingProgressEvents) {
    console.warn('[cloud_sync] skipping suspicious-cloud restore due pending progress queue', {
      localXP,
      cloudXP,
      localLastActiveRaw: localLastActiveRaw ?? null,
    });
  }
  const shouldRestoreCloudProgress =
    phoneStateOwnsCore
    || (progressServerAuthoritative && !hasPendingProgressEvents)
    || (shouldPreferCloudOnSuspiciousGap && !hasPendingProgressEvents)
    || cloudXP > localXP
    || (cloudXP === localXP && cloudStreak > localStreak);
  if (shouldRestoreCloudProgress && progressServerAuthoritative) {
    assertCurrent();
    // Do this before AsyncStorage writes. SQLITE_FULL may reject persistence,
    // but must not make intact server XP/streak render as Level 1 / zero days.
    patchAppSnapshotFromAuthoritativeCloudProgress(root);
  }
  if (!shouldRestoreCloudProgress) {
    const stickyKeys = [
      'premium_plan',
      'admin_premium_override',
      'premium_expiry',
      'premium_rc_product_id',
      'premium_rc_period_type',
      'premium_rc_store',
      'premium_rc_expiry_ms',
      'premium_rc_purchased_at_ms',
      'premium_rc_updated_at',
      'premium_admin_grant_at',
      'vip_active',
      'vip_plan',
      'vip_from',
      'vip_until',
      'vip_admin_override',
      'vip_admin_grant_at',
    ] as const;
    const stickyPairs: [string, string][] = [];
    for (const key of stickyKeys) {
      const val = cloudData[key];
      // Используем premiumValuePresent для premium/vip-ключей: пустая строка '' !== null,
      // но должна трактоваться как «нет данных» — иначе '' затирает локальный выбор.
      if (PREMIUM_PROGRESS_KEYS.has(key) ? premiumValuePresent(val) : (val !== null && val !== undefined)) {
        stickyPairs.push([key, cloudProgressStorageValue(key, val)]);
      }
    }
    // cards-2.0 (E4): merge-ключи применяются и в sticky-ветке («локальный XP
    // выше») — звёзды/клеймы с другого устройства нельзя терять ни в одном
    // направлении (union claimed / max stars).
    for (const [fcKey, fcStrategy] of Object.entries(FC_RESTORE_MERGE_STRATEGIES)) {
      const cloudVal = cloudData[fcKey];
      if (cloudVal === null || cloudVal === undefined) continue;
      try {
        const localVal = await AsyncStorage.getItem(fcKey);
        const mergedFc = fcStrategy(localVal, String(cloudVal));
        if (mergedFc !== localVal) stickyPairs.push([fcKey, mergedFc]);
      } catch (e) {
      // fail-soft: ключ останется локальным
      DebugLogger.error('cloud_sync:mergedFc', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
    // Локальный XP ≥ облачного, но ник мог остаться только в облаке (другой девайс / сбой записи).
    const localNameRaw = await AsyncStorage.getItem('user_name');
    const localName = (localNameRaw ?? '').trim();
    const cloudName = cloudData['user_name'];
    if (!localName && cloudName != null && String(cloudName).trim() !== '') {
      stickyPairs.push(['user_name', String(cloudName).trim()]);
    }
    // #10 multi-device: even when local XP ≥ cloud, a strictly-additive lifetime
    // counter may be higher in cloud (the other device bumped it). Pull the max so
    // the counter never regresses on this device.
    const localCounterMap = Object.fromEntries(
      await AsyncStorage.multiGet([
        ...getRuntimeSyncKeys().filter(isMonotonicCounterRestoreKey),
        'weekly_xp',
        'weekly_xp_period_start',
        'week_points',
        'week_points_v2',
      ]),
    ) as Record<string, string | null>;
    assertCurrent();
    for (const key of getRuntimeSyncKeys().filter(isMonotonicCounterRestoreKey)) {
      const cloudVal = cloudData[key];
      if (cloudVal === null || cloudVal === undefined) continue;
      const merged = mergeLessonRestoreValue(key, cloudProgressStorageValue(key, cloudVal), localCounterMap[key]);
      if (merged !== localCounterMap[key]) stickyPairs.push([key, merged]);
    }
    if (hasPendingProgressEvents) {
      const localStreakNormalized = localStreakRaw == null ? null : String(parseProgressInt(localStreakRaw));
      if (String(mergedStreak.streak) !== localStreakNormalized && (mergedStreak.streak > 0 || cloudData['streak_count'] != null)) {
        stickyPairs.push(['streak_count', String(mergedStreak.streak)]);
      }
      if (mergedStreak.lastActive && mergedStreak.lastActive !== localLastActiveRaw) {
        stickyPairs.push(['last_active_date', mergedStreak.lastActive]);
        stickyPairs.push(['streak_last_date', mergedStreak.lastActive]);
      }
    } else {
      const localWeeklyData = Object.fromEntries(
        await AsyncStorage.multiGet(['weekly_xp', 'weekly_xp_period_start', 'week_points', 'week_points_v2']),
      ) as Record<string, string | null>;
      assertCurrent();
      stickyPairs.push(...buildStickyServerProgressPairs(cloudData, new Date(), false, localWeeklyData));
    }
    const cloudLoginBonus = cloudData['login_bonus_v1'];
    const localLoginBonus = await AsyncStorage.getItem('login_bonus_v1');
    assertCurrent();
    const mergedLoginBonus = loginBonusMergeValue(localLoginBonus, cloudLoginBonus);
    if (mergedLoginBonus !== null) {
      stickyPairs.push(['login_bonus_v1', mergedLoginBonus]);
    }

    // Season Pass status rewards are permanent ownership. Pull their union even
    // when local XP wins, otherwise a reward earned on another device vanishes.
    const cloudSeasonCosmetics = cloudData[SEASON_COSMETICS_SYNC_KEY];
    if (cloudSeasonCosmetics !== null && cloudSeasonCosmetics !== undefined && String(cloudSeasonCosmetics).trim()) {
      const localSeasonCosmetics = await AsyncStorage.getItem(SEASON_COSMETICS_SYNC_KEY);
      assertCurrent();
      const mergedSeasonCosmetics = mergeSeasonCosmeticsRestoreValue(
        cloudProgressStorageValue(SEASON_COSMETICS_SYNC_KEY, cloudSeasonCosmetics),
        localSeasonCosmetics,
      );
      if (mergedSeasonCosmetics !== localSeasonCosmetics) {
        stickyPairs.push([SEASON_COSMETICS_SYNC_KEY, mergedSeasonCosmetics]);
      }
    }

    // Косметика, выданная из админки/облака (аура «Нимб» бета-тестерам, арена-ауры и т.п.),
    // должна догонять устройство ДАЖЕ когда локальный XP ≥ облачного (обычный случай у
    // активного юзера). Иначе owned-ключи не в sticky → админская выдача не появляется, а
    // при следующем пуше клиент затирает её локальным значением. Owned мержим объединением
    // (union), чтобы не потерять локально купленные ауры; активную ауру и gift-флаг из облака
    // применяем как есть (админ авто-надевает выданную).
    const mergedOwnedAuras = mergeOwnedFlagMap(
      await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY),
      cloudData[AVATAR_AURA_OWNED_KEY],
    );
    if (mergedOwnedAuras !== null) stickyPairs.push([AVATAR_AURA_OWNED_KEY, mergedOwnedAuras]);
    // K2: остальные owned-ключи (паки флешкарт, аватары, Сокровищница) — тот же принцип:
    // покупка/выдача с другого девайса догоняет устройство и в local-wins ветке. Union;
    // ауры уже обработаны выше, fr-scoped ключи идут через buildFrenchTargetStickyRestorePairs.
    const stickyOwnedKeys = getRuntimeSyncKeys().filter((k) =>
      isOwnedUnionRestoreKey(k) && k !== AVATAR_AURA_OWNED_KEY && targetScopedRestoreInfo(k) === null,
    );
    if (stickyOwnedKeys.length > 0) {
      const localOwnedMap = Object.fromEntries(
        await AsyncStorage.multiGet(stickyOwnedKeys),
      ) as Record<string, string | null>;
      assertCurrent();
      for (const key of stickyOwnedKeys) {
        const cloudVal = cloudData[key];
        if (cloudVal === null || cloudVal === undefined || String(cloudVal).trim() === '') continue;
        const merged = mergeOwnedRestoreValue(
          cloudProgressStorageValue(key, cloudVal),
          localOwnedMap[key],
          key === 'custom_avatar_owned_v1',
        );
        if (merged !== localOwnedMap[key]) stickyPairs.push([key, merged]);
      }
    }
    // #11 multi-device: уроки с другого устройства догоняют этот девайс даже
    // когда localXP ≥ cloudXP (обычный случай у активного юзера на втором
    // устройстве). Уроковый прогресс строго монотонен (union/max/OR — см.
    // isMonotonicLessonRestoreKey), поэтому подмешивание не может откатить
    // локальные достижения, а следующий исходящий sync увезёт объединённое
    // состояние обратно в облако — устройства сходятся. Без этого блока
    // XP-гейт выше навсегда отрезал уроковый прогресс на более активном
    // устройстве: Plus/косметика (sticky выше) ездили между девайсами,
    // а уроки — нет.
    const stickyLessonKeys = getRuntimeSyncKeys().filter(isMonotonicLessonRestoreKey);
    if (stickyLessonKeys.length > 0) {
      const localLessonStickyMap = Object.fromEntries(
        await AsyncStorage.multiGet(stickyLessonKeys),
      ) as Record<string, string | null>;
      assertCurrent();
      for (const key of stickyLessonKeys) {
        const cloudVal = cloudData[key];
        if (cloudVal === null || cloudVal === undefined) continue;
        const merged = mergeLessonRestoreValue(key, cloudProgressStorageValue(key, cloudVal), localLessonStickyMap[key]);
        if (merged !== localLessonStickyMap[key]) stickyPairs.push([key, merged]);
      }
    }
    // Personal-plan completion/progress/receipts are account-owned monotonic
    // journals too. They must converge even when local XP keeps the restore in
    // this sticky branch.
    const localPersonalPlanMap = Object.fromEntries(
      await AsyncStorage.multiGet([...PERSONAL_PLAN_RESTORE_KEYS]),
    ) as Record<string, string | null>;
    assertCurrent();
    for (const key of PERSONAL_PLAN_RESTORE_KEYS) {
      const cloudVal = cloudData[key];
      if (cloudVal === null || cloudVal === undefined) continue;
      const merged = mergePersonalPlanRestoreValue(
        key,
        cloudProgressStorageValue(key, cloudVal),
        localPersonalPlanMap[key],
      );
      if (merged !== localPersonalPlanMap[key]) stickyPairs.push([key, merged]);
    }
    const cloudActiveAura = cloudData[USER_AVATAR_AURA_KEY];
    if (cloudActiveAura != null && String(cloudActiveAura).trim() !== '') {
      stickyPairs.push([USER_AVATAR_AURA_KEY, String(cloudActiveAura)]);
    }
    const cloudGiftAura = cloudData[AVATAR_AURA_GIFT_OWNED_KEY];
    if (cloudGiftAura != null && String(cloudGiftAura).trim() !== '') {
      stickyPairs.push([AVATAR_AURA_GIFT_OWNED_KEY, String(cloudGiftAura)]);
    }
    // Разовая админ-команда на энергию (client-owned energy_state) — тоже мимо sticky не
    // доедет. Тянем её из облака; energy_system применит один раз по метке at.
    const cloudEnergyCmd = cloudData[ADMIN_ENERGY_COMMAND_KEY];
    if (cloudEnergyCmd != null && String(cloudEnergyCmd).trim() !== '') {
      stickyPairs.push([ADMIN_ENERGY_COMMAND_KEY, String(cloudEnergyCmd)]);
    }
    stickyPairs.push(...await buildFrenchTargetStickyRestorePairs(cloudData));
    for (const key of dailyLessonHelperKeysForToday()) {
      const value = cloudData[key];
      if (value === null || value === undefined) continue;
      const localValue = await AsyncStorage.getItem(key);
      if (!localValue) stickyPairs.push([key, cloudProgressStorageValue(key, value)]);
    }
    const cloudLeaguePending = cloudData['league_result_pending'];
    const cloudLeaguePendingSig = leagueResultSignature(cloudLeaguePending);
    const localConsumedSig = await AsyncStorage.getItem('league_result_consumed_sig');
    const cloudConsumedSig = cloudData['league_result_consumed_sig'];
    const shouldRestoreLeaguePending =
      cloudLeaguePending !== null &&
      cloudLeaguePending !== undefined &&
      cloudLeaguePendingSig !== null &&
      cloudLeaguePendingSig !== localConsumedSig &&
      cloudLeaguePendingSig !== cloudConsumedSig;
    if (shouldRestoreLeaguePending) {
      stickyPairs.push(['league_result_pending', String(cloudLeaguePending)]);
      const cloudLeagueState = cloudData['league_state_v3'];
      if (cloudLeagueState !== null && cloudLeagueState !== undefined) {
        stickyPairs.push(['league_state_v3', String(cloudLeagueState)]);
      }
    }
    const authoritativeGiftPerks = await buildGiftEntitlementStickyPairs(cloudData);
    stickyPairs.push(...authoritativeGiftPerks.pairs);
    let appliedStickyState = false;
    if (stickyPairs.length > 0) {
      assertCurrent();
      await applyPersonalPlanRestorePairs(stickyPairs);
      assertCurrent();
      appliedStickyState = true;
    }
    if (authoritativeGiftPerks.removeKeys.length > 0) {
      assertCurrent();
      await AsyncStorage.multiRemove(authoritativeGiftPerks.removeKeys);
      assertCurrent();
      appliedStickyState = true;
    }
    // tester «Снять премиум»: не восстанавливаем VIP-доступ из облака (см. выше).
    if (cloudVipActive !== null && !stripPremiumActive && vipGeneration && vipOwnerStableId) {
      await writeMergedCloudVipSnapshot(vipGeneration, {
        vip_active: cloudVipActive ? 'true' : 'false',
        vip_plan: cloudVipActive ? (cloudVipState?.plan ?? 'admin_vip') : '',
        vip_from: cloudVipActive ? (cloudVipState?.fromValue ?? '0') : '0',
        vip_until: cloudVipActive ? (cloudVipState?.untilValue ?? '0') : '0',
        vip_admin_override: cloudVipActive ? 'true' : 'false',
        vip_admin_grant_at: cloudVipState?.grantAt ?? '',
      });
      assertCurrent();
      appliedStickyState = true;
    }
    if (appliedStickyState) {
      if (cloudHasVipEntitlementState) invalidatePremiumCache();
      await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(buildRestoreSnapshot(cloudData))).catch(() => {});
      assertCurrent();
      return completeRestore(true);
    }
    return completeRestore(false);
  }

  const pairs: [string, string][] = [];
  // K2: owned-ключи тоже читаем локально — иначе mergeOwnedRestoreValue получит
  // undefined и «union» выродится в слепую перезапись облаком.
  const ownedUnionRuntimeKeys = getRuntimeSyncKeys().filter(isOwnedUnionRestoreKey);
  const localLessonRestoreMap = Object.fromEntries(
    await AsyncStorage.multiGet([
      ...RESTORE_MERGE_KEY_SET,
      ...getRuntimeSyncKeys().filter(isMonotonicCounterRestoreKey),
      ...ownedUnionRuntimeKeys,
      'weekly_xp',
      'weekly_xp_period_start',
      'week_points',
      'week_points_v2',
    ]),
  ) as Record<string, string | null>;
  assertCurrent();
  const localConsumedSig = await AsyncStorage.getItem('league_result_consumed_sig');
  assertCurrent();
  const cloudConsumedSig = cloudData['league_result_consumed_sig'];
  const currentRestoreWeekStart = getUtcWeekStartIso(new Date());
  const currentRestoreWeekId = getUtcIsoWeekId(new Date());
  for (const key of getRuntimeSyncKeys()) {
    if (phoneStateOwnsCore && isPhoneStateCoreProgressKey(key)) continue;
    if (
      key === 'streak_count' ||
      key === 'last_active_date' ||
      key === 'streak_last_date' ||
      // app_version / device_platform принадлежат ТЕКУЩЕМУ устройству и пишутся
      // заново при каждом запуске (_layout.tsx). Их нельзя воскрешать из облака:
      // иначе restore перетирает свежую версию старой, boot-sync уезжает обратно
      // старым значением, и в админке залипает неактуальная версия приложения.
      key === 'app_version' ||
      key === 'device_platform'
    ) {
      continue;
    }
    if ((VIP_STORAGE_KEYS as readonly string[]).includes(key) || key === 'vip_expiry' || key === 'vip_grant_at') {
      continue;
    }
    // tester «Снять премиум»: не воскрешаем премиум/VIP/admin-grant из облака.
    if (stripPremiumActive && STRIP_SKIP_RESTORE_KEYS.has(key)) continue;
    const val = cloudData[key];
    if (val !== null && val !== undefined) {
      if (key === 'league_result_pending') {
        const pendingSig = leagueResultSignature(val);
        if (pendingSig && (pendingSig === localConsumedSig || pendingSig === cloudConsumedSig)) {
          continue;
        }
      }
      const storageValue = cloudProgressStorageValue(key, val);
      pairs.push([key, mergeCurrentWeekProgressRestoreValue(
        key,
        storageValue,
        localLessonRestoreMap[key],
        cloudData['weekly_xp_period_start'],
        localLessonRestoreMap['weekly_xp_period_start'],
        currentRestoreWeekStart,
        currentRestoreWeekId,
      )]);
    }
  }
  if (!phoneStateOwnsCore && (mergedStreak.streak > 0 || cloudData['streak_count'] != null)) {
    pairs.push(['streak_count', String(mergedStreak.streak)]);
  }
  if (!phoneStateOwnsCore && mergedStreak.lastActive) {
    pairs.push(['last_active_date', mergedStreak.lastActive]);
    pairs.push(['streak_last_date', mergedStreak.lastActive]);
  }
  if (cloudData['achievements_state']) pairs.push(['achievements_v1', cloudData['achievements_state']]);
  if (!cloudData['flashcards_v1'] && cloudData['flashcards']) pairs.push(['flashcards_v1', String(cloudData['flashcards'])]);
  if (cloudData['lang']) pairs.push(['app_lang', cloudData['lang']]);
  if (cloudData['user_avatar_frame']) pairs.push(['user_frame', cloudData['user_avatar_frame']]);
  for (const key of dailyLessonHelperKeysForToday()) {
    const value = cloudData[key];
    if (value !== null && value !== undefined) {
      pairs.push([key, cloudProgressStorageValue(key, value)]);
    }
  }
  if (pairs.length > 0) {
    assertCurrent();
    await applyPersonalPlanRestorePairs(pairs);
    assertCurrent();
    if (cloudHasVipEntitlementState) invalidatePremiumCache();
  }
  if (cloudVipActive !== null && !stripPremiumActive) {
    assertCurrent();
    if (vipGeneration && vipOwnerStableId) {
      await writeMergedCloudVipSnapshot(vipGeneration, {
        vip_active: cloudVipActive ? 'true' : 'false',
        vip_plan: cloudVipActive ? (cloudVipState?.plan ?? 'admin_vip') : '',
        vip_from: cloudVipActive ? (cloudVipState?.fromValue ?? '0') : '0',
        vip_until: cloudVipActive ? (cloudVipState?.untilValue ?? '0') : '0',
        vip_admin_override: cloudVipActive ? 'true' : 'false',
        vip_admin_grant_at: cloudVipState?.grantAt ?? '',
      });
    }
    assertCurrent();
    if (cloudHasVipEntitlementState) invalidatePremiumCache();
  }
  assertCurrent();
  await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(buildRestoreSnapshot(cloudData))).catch(() => {});
  assertCurrent();
  return completeRestore(true);
}

/**
 * Один get users/{uid}: миграция «пустое облако» + мерж прогресса.
 * Снижает чтения Firestore по сравнению с restoreFromCloud + migrateLocalProgressToCloud.
 */
export type CloudRestoreResult = 'restored' | 'not_found' | 'failed';
export type CloudRestoreFailureReason = CloudAccessFailureReason | 'provider_reauth_required';
type CloudRestoreAttempt = { status: CloudRestoreResult; applied: boolean } & {
  failureReason: CloudRestoreFailureReason | null;
};
export type CloudRestoreRecoveryDetails = Pick<CloudRestoreAttempt, 'status' | 'failureReason'>;
type CloudRestoreOptions = Readonly<{
  canPublishExamBestPctOverlay?: () => boolean;
}>;

function tryPublishExamBestPctOverlay(
  root: Record<string, unknown>,
  stableId: string,
  isCurrent: () => boolean,
  canPublish: (() => boolean) | undefined,
): void {
  try {
    if (phoneStateOwnsCoreProgress(stableId)) return;
    if (!canPublish || !isCurrent() || !canPublish()) return;
    if (root.progressServerAuthoritative !== true) return;
    const progress = root.progress;
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return;
    const values = extractExamBestPctOverlay(progress as Record<string, unknown>);
    if (Object.keys(values).length === 0 || !isCurrent() || !canPublish()) return;
    publishExamBestPctOverlay(stableId, values);
  } catch (e) {
      // legacy restore remains authoritative if the render-only overlay rejects input
      DebugLogger.error('cloud_sync:values', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

function completedCloudRestoreAttempt(applied: boolean): CloudRestoreAttempt {
  return { status: 'restored', applied, failureReason: null };
}

function failedCloudRestoreAttempt(failureReason: CloudRestoreFailureReason): CloudRestoreAttempt {
  return { status: 'failed', applied: false, failureReason };
}

function cloudRestoreFailureForStableLink(
  failure: StableAuthLinkFailure | undefined,
): CloudRestoreFailureReason {
  if (failure === 'stable_id_mismatch') return 'provider_reauth_required';
  if (failure === 'app_check_unavailable') return 'app_check_unavailable';
  if (failure === 'transport_unavailable') return 'transport_unavailable';
  return 'identity_unavailable';
}

async function completeLegacyLessonMigrationAfterRestore(
  attempt: CloudRestoreAttempt,
): Promise<CloudRestoreAttempt> {
  await migrateLegacyFreeLessonAccessForAllTargets(attempt.status).catch(() => {});
  return attempt;
}

export async function restoreAndMigrateFromCloud(): Promise<boolean> {
  const attempt = await completeLegacyLessonMigrationAfterRestore(
    await restoreAndMigrateFromCloudResult(true),
  );
  return attempt.applied;
}

async function restoreAndMigrateFromCloudResult(
  syncMissingDocument: boolean,
  options: CloudRestoreOptions = {},
): Promise<CloudRestoreAttempt> {
  if (!CLOUD_SYNC_ENABLED) return failedCloudRestoreAttempt('transport_unavailable');
  const db = getFirestore();
  if (!db) return failedCloudRestoreAttempt('transport_unavailable');
  const uid = await ensureAnonUser();
  if (!uid) return failedCloudRestoreAttempt('identity_unavailable');
  beginInitialAccountGeneration(uid);
  const accountGeneration = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(accountGeneration, uid);
  if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
  try {
    const stableLink = await ensureStableAuthLinkForStableIdDetailed(uid);
    if (!stableLink.ok || stableLink.stableUid !== uid) {
      return {
        status: 'failed',
        applied: false,
        failureReason: cloudRestoreFailureForStableLink(stableLink.failure),
      };
    }
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    const doc = await withTimeout<any>(
      db.collection('users').doc(uid).get(),
      RESTORE_FIRESTORE_READ_MS,
      'restore_user_doc',
    );
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    const migrated = await AsyncStorage.getItem('cloud_migration_v1');
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    if (!doc.exists) {
      if (!migrated && syncMissingDocument) {
        await syncToCloud();
        if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
        await AsyncStorage.setItem('cloud_migration_v1', '1').catch(() => {});
      }
      return { status: 'not_found', applied: false, failureReason: null };
    }
    if (!migrated) {
      await AsyncStorage.setItem('cloud_migration_v1', '1').catch(() => {});
      if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    }
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    const applied = await withRestoreApplicationLock(() => (
      applyRestoreFromUserDoc(doc, isCurrent, options.canPublishExamBestPctOverlay
        ? (root) => tryPublishExamBestPctOverlay(
          root,
          uid,
          isCurrent,
          options.canPublishExamBestPctOverlay,
        )
        : undefined, accountGeneration)
    ));
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    for (const target of SYNC_STUDY_TARGETS) {
      await restoreMistakePracticeEvents({ accountScope: uid, studyTarget: target });
      if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
      // Lazy require avoids cloud_sync -> rewards -> xp_manager -> cloud_sync initialization cycle.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { flushPendingMistakeCorrectionRewards } = require('./mistake_practice_rewards') as
        typeof import('./mistake_practice_rewards');
      await flushPendingMistakeCorrectionRewards({ accountScope: uid, studyTarget: target });
      if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    }
    return completedCloudRestoreAttempt(applied);
  } catch (error) {
    return failedCloudRestoreAttempt(
      cloudRestoreFailureForStableLink(classifyCloudAccessFailure(error, appCheckReady)),
    );
  }
}

// ── Восстановить прогресс из облака ─────────────────────────────────────────
// Вызывается при старте приложения ПОСЛЕ того как определён uid.
// Если локальный XP > облачного — локальные данные побеждают (не перезаписываем).
export async function restoreFromCloud(): Promise<boolean> {
  return restoreAndMigrateFromCloud();
}

/** Auth-safe restore result: distinguishes an empty account from a transport failure. */
export async function restoreFromCloudWithRecoveryDetails(
  options: CloudRestoreOptions = {},
): Promise<CloudRestoreRecoveryDetails> {
  const attempt = await completeLegacyLessonMigrationAfterRestore(
    await restoreAndMigrateFromCloudResult(false, options),
  );
  return { status: attempt.status, failureReason: attempt.failureReason };
}

export async function restoreFromCloudDetailed(options: CloudRestoreOptions = {}): Promise<CloudRestoreResult> {
  const attempt = await completeLegacyLessonMigrationAfterRestore(
    await restoreAndMigrateFromCloudResult(false, options),
  );
  return attempt.status;
}

export const __cloudSyncTestHooks = {
  adoptAuthoritativeStableIdentity,
  classifyCloudAccessFailure,
  cloudRestoreFailureForStableLink,
  completedCloudRestoreAttempt,
  applyRestoreFromUserDoc,
  mergeLessonRestoreValue,
  isMonotonicLessonRestoreKey,
  mergeOwnedFlagMap,
  mergeOwnedRestoreValue,
  mergeSeasonCosmeticsRestoreValue,
  isOwnedUnionRestoreKey,
  buildRestoreSnapshot,
  isSuspiciousLocalXpGap,
  getUtcWeekStartIso,
  getUtcIsoWeekId,
  buildStickyServerProgressPairs,
  buildGiftEntitlementStickyPairs,
  mergeCurrentWeekProgressRestoreValue,
  mergePersonalPlanRestoreValue,
  applyPersonalPlanRestorePairs,
};

// ── Одноразовая миграция локального прогресса в облако ──────────────────────
// Запускается один раз при первом запуске после обновления.
// Пушит локальные данные в Firestore только если облако пустое.
export async function migrateLocalProgressToCloud(): Promise<void> {
  await restoreAndMigrateFromCloud();
}

// ── Принудительный синк с проверкой результата ───────────────────────────────
// В отличие от syncToCloud({forceNow:true}), эта функция возвращает true/false:
//   true  — данные действительно ушли в облако (или нечего отправлять).
//   false — Firestore недоступен / нет интернета / ошибка записи.
//
// Используется во flow "Сменить аккаунт" перед очисткой локального кеша,
// чтобы не потерять прогресс при отсутствии связи.
/**
 * Хвост D: дождаться завершения текущего фонового sync и погасить отложенный таймер.
 * Вызывается из auth_provider перед setStableId(canonical) в свап-ветках: иначе
 * debounce-sync, взведённый ДО смены stable_id, мог записать СТАРЫЙ локальный прогресс
 * в users/{новый canonical} (getCanonicalUserId уже вернул бы новый id) и затереть
 * чужой/слитый аккаунт. После этого вызова безопасно менять stable_id.
 */
export async function quiesceSyncBeforeStableIdSwap(): Promise<void> {
  pendingSync = false;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  if (syncInFlight) {
    try {
      await withTimeout(syncInFlight, FORCE_SYNC_WAIT_INFLIGHT_MS, 'wait_inflight_before_swap');
    } catch {
      if (__DEV__) console.warn('[cloud_sync] quiesceSyncBeforeStableIdSwap: inflight timeout');
    }
  }
}

export async function quiesceCloudSyncForAccountTransition(
  timeoutMs: number,
): Promise<boolean> {
  pendingSync = false;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  let drained = true;
  if (syncInFlight) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      drained = await Promise.race([
        syncInFlight.then(() => true),
        new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  pendingSync = false;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  return drained;
}

export async function forceSyncToCloud(): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED) return true; // в Expo Go считаем что "локально и так всё"
  const db = getFirestore();
  if (!db) return false;
  const uid = await ensureAnonUser();
  if (!uid) return false;
  beginInitialAccountGeneration(uid);
  const forceGeneration = captureAccountGeneration();
  const isForceGenerationCurrent = () => isCurrentAccountGeneration(forceGeneration, uid);
  if (!isForceGenerationCurrent()) return false;
  try {
    pendingSync = true;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    // Дожидаемся завершения текущего синка (если он в полёте), затем запускаем свой.
    if (syncInFlight) {
      try {
        await withTimeout(syncInFlight, FORCE_SYNC_WAIT_INFLIGHT_MS, 'wait_inflight');
      } catch {
        pendingSync = false;
        if (__DEV__) console.warn('[cloud_sync] forceSyncToCloud: inflight sync timeout');
        return false;
      }
    }
    const authoritativeIdentity = await ensureAuthoritativeIdentityForCloudMutation(uid);
    if (!authoritativeIdentity.ok || authoritativeIdentity.stableUid !== uid || !isForceGenerationCurrent()) {
      pendingSync = false;
      return false;
    }
    // doSyncToCloud глотает ошибки внутри, так что обернём напрямую без try-catch фасада:
    // повторим логику записи минимально-инвазивно, ловя ошибки явно.
    await repairDevSeededStreakInStorage();
    const pairs = await AsyncStorage.multiGet(getRuntimeSyncKeys());
    const data: Record<string, string | null> = {};
    for (const [key, value] of pairs) data[key] = value;
    const achievementsV1 = await AsyncStorage.getItem('achievements_v1');
    if (achievementsV1) data['achievements_state'] = achievementsV1;
    if (data['app_lang']) data['lang'] = data['app_lang'];
    if (data['user_frame']) data['user_avatar_frame'] = data['user_frame'];
    await addTodayLessonHelperSnapshots(data);
    const phoneStateOwnsCore = phoneStateOwnsCoreProgress(uid);
    for (const [key, value] of Object.entries({ ...data })) {
      if (phoneStateOwnsCore && isPhoneStateCoreProgressKey(key)) delete data[key];
      else if (!shouldSyncPremiumProgressField(key, value, data)) delete data[key];
      // Premium/VIP-поля клиент в облако не пишет (авторитет — RevenueCat/Admin SDK).
      // Иначе Firestore rules отклонят force-sync целиком при смене устройства/аккаунта
      // и юзер не сможет завершить миграцию прогресса. См. progressHasNoPremiumWrites.
      else if (PREMIUM_PROGRESS_KEYS.has(key)) delete data[key];
      // Server-owned ключи (Сокровищница) — та же причина: пишет только CF.
      else if (isServerOwnedProgressKey(key)) delete data[key];
    }

    const now = Date.now();
    const docRef = db.collection('users').doc(uid);
    const createdAtSynced = await AsyncStorage.getItem(CREATED_AT_SYNC_KEY);
    const shouldSendCreatedAt = !createdAtSynced;
    // зачем: firebaseAuthUid — server-owned (см. комментарий в doSyncToCloud).
    // Здесь снятие критичнее: force-sync переносит прогресс при смене устройства,
    // а отклонённый set терял бы всю миграцию, а не один heartbeat.
    if (!isForceGenerationCurrent()) {
      pendingSync = false;
      return false;
    }
    await withTimeout(
      docRef.set(
        {
          progress: data,
          ...(data['user_avatar'] ? { user_avatar: data['user_avatar'] } : {}),
          ...(data['user_avatar_frame'] ? { user_avatar_frame: data['user_avatar_frame'] } : {}),
          updatedAt: now,
          last_active_at: now,
          ...(shouldSendCreatedAt ? { created_at: now } : {}),
        },
        { merge: true },
      ),
      FORCE_SYNC_FIRESTORE_WRITE_MS,
      'firestore_set',
    );
    lastSuccessfulSyncAt = now;
    lastActivityStampAt = now;
    pendingSync = false;
    await AsyncStorage.setItem(
      LAST_SYNC_SNAPSHOT_KEY,
      JSON.stringify(encodeCloudSyncSnapshotRecord(data)),
    ).catch(() => {});
    if (shouldSendCreatedAt) {
      await AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(() => {});
    }
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[cloud_sync] forceSyncToCloud failed', e);
    pendingSync = false;
    return false;
  }
}

// ── Очистка локального прогресса аккаунта ───────────────────────────────────
// Используется во flow "Сменить аккаунт" ПОСЛЕ успешного forceSyncToCloud.
// Удаляет всё что относится к юзеру/прогрессу, но СОХРАНЯЕТ настройки устройства
// (язык, тема, размер шрифта, haptics) — это per-device preferences, а не per-account.
//
// ВАЖНО: stable_id не трогаем тут — это делает clearStableId() в stable_id.ts.
export async function saveAccountSwitchEmergencyBackup(
  reason: string,
  expectedStableId?: string,
): Promise<boolean> {
  if (await isAccountDeleteIdentityQuarantined()) return false;
  const stableId = await getCanonicalUserId();
  if (!stableId || (expectedStableId && stableId !== expectedStableId)) {
    throw new Error('account_switch_backup_identity_unavailable');
  }
  const previousBackupRaw = await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
  // A historical monolithic backup above the V3 parser budget cannot be
  // silently replaced: it may contain the only copy of offline work. Account
  // switch remains blocked until an explicit upgrader can preserve it.
  if (previousBackupRaw !== null &&
    previousBackupRaw.length > ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES) {
    throw new Error('account_switch_backup_history_upgrade_required');
  }
  const previousBackupIdentity = previousBackupRaw === null
    ? null
    : parsePreviousAccountSwitchBackupIdentity(previousBackupRaw);
  if (previousBackupRaw !== null && previousBackupIdentity === null) {
    throw new Error('account_switch_backup_history_upgrade_required');
  }
  if (previousBackupIdentity !== null && previousBackupIdentity.stableId !== stableId) {
    throw new Error('account_switch_backup_other_owner_pending');
  }
  const shardQueueKey = shardDeltaQueueStorageKey(stableId);
  const keySet = new Set([
    ...await collectAccountLocalDataKeys(),
    shardQueueKey,
  ]);
  // Reject before the potentially expensive sort. The underlying native
  // getAllKeys allocation remains a platform boundary, but this function never
  // creates another unbounded sorted copy or starts a partial backup.
  if (keySet.size > ACCOUNT_SWITCH_BACKUP_MAX_PAIRS) {
    throw new Error('account_switch_backup_capacity');
  }
  const keys = Array.from(keySet).sort();
  const createdAt = Date.now();
  const previousBackupId = previousBackupIdentity?.backupId ?? null;
  const backupIdBase = `${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  let backupId: string | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? backupIdBase : `${backupIdBase}-${attempt.toString(36)}`;
    if (candidate === previousBackupId) continue;
    if (await AsyncStorage.getItem(`${ACCOUNT_SWITCH_BACKUP_PAGE_PREFIX}${candidate}:0`) !== null) {
      continue;
    }
    backupId = candidate;
    break;
  }
  if (backupId === null) throw new Error('account_switch_backup_namespace_conflict');
  let pageCount = 0;
  let pairCount = 0;
  let totalUtf8Bytes = 0;
  let lastPageFingerprint: string | null = null;
  let requiredSessionReceiptCount = 0;
  let queueRaw: string | null = null;
  const writePage = async (pairs: readonly (readonly [string, string])[]): Promise<void> => {
    if (pageCount >= ACCOUNT_SWITCH_BACKUP_MAX_PAGES) {
      throw new Error('account_switch_backup_capacity');
    }
    const body = {
      schemaVersion: 'account-switch-emergency-backup-page.v1' as const,
      backupId,
      stableId,
      pageIndex: pageCount,
      previousPageFingerprint: lastPageFingerprint,
      pairs,
    };
    const pageFingerprint = hashCanonicalBody(body);
    const raw = canonicalJsonV1({ ...body, pageFingerprint });
    if (raw.length > ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES ||
      utf8ByteLengthV1(raw) > ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES) {
      throw new Error('account_switch_backup_value_upgrade_required');
    }
    const key = `${ACCOUNT_SWITCH_BACKUP_PAGE_PREFIX}${backupId}:${pageCount}`;
    if (await AsyncStorage.getItem(key) !== null) {
      throw new Error('account_switch_backup_namespace_conflict');
    }
    // Count the attempted page before native I/O so rollback also removes a
    // silently corrupted/partially written page whose readback fails.
    pageCount += 1;
    await AsyncStorage.setItem(key, raw);
    if (await AsyncStorage.getItem(key) !== raw) {
      throw new Error('account_switch_backup_verification_failed');
    }
    pairCount += pairs.length;
    lastPageFingerprint = pageFingerprint;
  };
  try {
    for (let offset = 0; offset < keys.length; offset += ACCOUNT_SWITCH_BACKUP_PAGE_MAX_PAIRS) {
      const requestedKeys = keys.slice(offset, offset + ACCOUNT_SWITCH_BACKUP_PAGE_MAX_PAIRS);
      const rows = await readAccountSwitchBackupRowsExactly(
        requestedKeys,
        'account_switch_backup_verification_failed',
      );
      let pagePairs: [string, string][] = [];
      for (const [key, value] of rows) {
        if (value == null) continue;
        if (key.length > ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES ||
          value.length > ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES) {
          throw new Error('account_switch_backup_value_upgrade_required');
        }
        const pairBytes = utf8ByteLengthV1(key) + utf8ByteLengthV1(value);
        if (pairBytes > ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES) {
          throw new Error('account_switch_backup_value_upgrade_required');
        }
        const candidate = [...pagePairs, [key, value] as [string, string]];
        const candidateBody = {
          schemaVersion: 'account-switch-emergency-backup-page.v1' as const,
          backupId,
          stableId,
          pageIndex: pageCount,
          previousPageFingerprint: lastPageFingerprint,
          pairs: candidate,
        };
        const candidateRaw = canonicalJsonV1({
          ...candidateBody,
          pageFingerprint: hashCanonicalBody(candidateBody),
        });
        if (candidateRaw.length > ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES ||
          utf8ByteLengthV1(candidateRaw) > ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES) {
          if (pagePairs.length === 0) {
            throw new Error('account_switch_backup_value_upgrade_required');
          }
          await writePage(pagePairs);
          pagePairs = [[key, value]];
        } else {
          pagePairs = candidate;
        }
        totalUtf8Bytes += pairBytes;
        if (!Number.isSafeInteger(totalUtf8Bytes) ||
          totalUtf8Bytes > ACCOUNT_SWITCH_BACKUP_MAX_TOTAL_UTF8_BYTES) {
          throw new Error('account_switch_backup_capacity');
        }
        if (key === shardQueueKey) queueRaw = value;
        if (key.startsWith('v2:required-session-completion-receipt:v1:')) {
          requiredSessionReceiptCount += 1;
        }
      }
      if (pagePairs.length > 0) await writePage(pagePairs);
    }
    const body = {
      version: 3 as const,
      schemaVersion: 'account-switch-emergency-backup.v3' as const,
      backupId,
      stableId,
      createdAt,
      reason: String(reason || 'unknown').slice(0, 80),
      pageCount,
      pairCount,
      totalUtf8Bytes,
      lastPageFingerprint,
      requiredSessionReceiptCount,
    };
    const raw = canonicalJsonV1({ ...body, manifestFingerprint: hashCanonicalBody(body) });
    await AsyncStorage.setItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY, raw);
    const verifiedRaw = await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
    if (verifiedRaw !== raw) throw new Error('account_switch_backup_verification_failed');
    const verified = JSON.parse(verifiedRaw) as typeof body & { manifestFingerprint: string };
    if (verified.stableId !== stableId || verified.pageCount !== pageCount ||
      verified.pairCount !== pairCount || verified.lastPageFingerprint !== lastPageFingerprint ||
      hashCanonicalBody(body) !== verified.manifestFingerprint) {
      throw new Error('account_switch_backup_verification_failed');
    }
    // The owner-bound shard queue is included in the same verified page set;
    // retaining the local observation here prevents accidental omission.
    if (queueRaw !== null && pairCount === 0) {
      throw new Error('account_switch_backup_verification_failed');
    }
    // Root-last publication makes prior pages unreachable. Reclaim them in
    // bounded chunks after the new root is verified; a cleanup failure never
    // invalidates the new snapshot and can be retried by later storage GC.
    if (previousBackupRaw !== null) {
      try {
        const previous = JSON.parse(previousBackupRaw) as Record<string, unknown>;
        if (previous.version === 3 && typeof previous.backupId === 'string' &&
          /^[a-z0-9-]{3,80}$/.test(previous.backupId) &&
          Number.isSafeInteger(previous.pageCount) && Number(previous.pageCount) >= 0 &&
          Number(previous.pageCount) <= ACCOUNT_SWITCH_BACKUP_MAX_PAGES &&
          previous.backupId !== backupId) {
          for (let offset = 0; offset < Number(previous.pageCount); offset += 128) {
            await AsyncStorage.multiRemove(Array.from(
              { length: Math.min(128, Number(previous.pageCount) - offset) },
              (_, index) => `${ACCOUNT_SWITCH_BACKUP_PAGE_PREFIX}${previous.backupId}:${offset + index}`,
            ));
          }
        }
      } catch (e) {
      // New root remains the only authority; orphan cleanup is best-effort.
      DebugLogger.error('cloud_sync:offset', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
  } catch (e) {
    try {
      if (previousBackupRaw == null) {
        await AsyncStorage.removeItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
        if (await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY) !== null) {
          throw new Error('account_switch_backup_rollback_failed');
        }
      } else {
        await AsyncStorage.setItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY, previousBackupRaw);
        if (await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY) !== previousBackupRaw) {
          throw new Error('account_switch_backup_rollback_failed');
        }
      }
      for (let offset = 0; offset < pageCount; offset += 64) {
        const chunk = Array.from(
          { length: Math.min(64, pageCount - offset) },
          (_, index) => `${ACCOUNT_SWITCH_BACKUP_PAGE_PREFIX}${backupId}:${offset + index}`,
        );
        await AsyncStorage.multiRemove(chunk);
        if ((await readAccountSwitchBackupRowsExactly(
          chunk,
          'account_switch_backup_rollback_failed',
        )).some(([, value]) => value != null)) {
          throw new Error('account_switch_backup_rollback_failed');
        }
      }
    } catch {
      throw new Error('account_switch_backup_rollback_failed');
    }
    throw e;
  }
  return true;
}

async function wipeLocalAccountDataUnsafe(): Promise<void> {
  const { closePhoneStateBeforeLocalWipe } = await import('./phone_state_bootstrap');
  await closePhoneStateBeforeLocalWipe();
  await withPersonalPlanStateStorageLock(() =>
    withPlanXpLedgerStorageLock(wipeLocalAccountDataUnsafeBody));
}

async function wipeLocalAccountDataUnsafeBody(): Promise<void> {
  const { cancelPendingGeneratedNicknameRetry } = await import('./nickname_guard');
  cancelPendingGeneratedNicknameRetry();
  const accountKeys = await collectAccountLocalDataKeys();
  // Сохраняем НЕ-аккаунтные настройки устройства:
  const KEEP = new Set<string>(['app_theme', 'app_font_size', 'haptics_tap']);
  const removeExactly = async (keys: readonly string[]): Promise<void> => {
    const unique = Array.from(new Set(keys)).filter((key) => !KEEP.has(key));
    const chunkSize = 128;
    for (let offset = 0; offset < unique.length; offset += chunkSize) {
      const chunk = unique.slice(offset, offset + chunkSize);
      await AsyncStorage.multiRemove(chunk);
      const residue = (await AsyncStorage.multiGet(chunk))
        .filter(([, value]) => value != null)
        .map(([key]) => key);
      if (residue.length > 0) throw new Error('account_wipe_incomplete');
    }
  };
  const toRemove = accountKeys.filter((key) => (
    !KEEP.has(key) && !isCustomizationAccountLocalKey(key)
  ));
  await removeExactly(toRemove);
  await clearCustomizationAccountLocalState();
  // Generation-bound writers are the primary barrier. This final scan is
  // defense-in-depth for a callback that committed during the first removal.
  const lateLearningV2Keys = (await listLearningV2AccountLocalKeys())
    .filter((key) => !KEEP.has(key));
  await removeExactly(lateLearningV2Keys);
  const knownAccountKeys = new Set(accountLocalDataKeysForToday());
  const finalResidue = (await listAllAccountLocalStorageKeys()).filter((key) =>
    !KEEP.has(key) && (
      knownAccountKeys.has(key)
      || isLearningV2AccountLocalKey(key)
      || isCustomizationAccountLocalKey(key)
      || isVipSnapshotStorageKey(key)
    ));
  if (finalResidue.length > 0) throw new Error('account_wipe_incomplete');
  // Сбрасываем in-memory bookkeeping синка
  lastSuccessfulSyncAt = 0;
  lastActivityStampAt = 0;
  pendingSync = false;
  resetAppSnapshotForAccountSwitch();
  const { resetPersonalProgressForAccountTransition } = await import('./personal_progress_store');
  resetPersonalProgressForAccountTransition();
  invalidatePersonalPlanStateCache();
  // зачем: без этого PlayerProfileModal мог мгновенно отрендерить множители
  // XP предыдущего аккаунта (см. комментарий у resetMultiplierBreakdownCache).
  resetMultiplierBreakdownCache();
  // зачем: без этого club_screen мог мгновенно отрендерить ранг/группу лиги
  // предыдущего аккаунта (см. комментарий у clearCachedLeagueStateSnapshot).
  clearCachedLeagueStateSnapshot();
  // зачем: ключ снапшота практики содержит только target+язык, БЕЗ uid — без сброса
  // следующий вошедший увидел бы на первом кадре чужую статистику ошибок.
  // зачем: общий снапшот экранов (стрик, рефералы, топ, аналитика и др.) поднимается
  // в память при старте и синхронно рисует первый кадр — при wipe его надо стереть
  // вместе с остальным, иначе на диске останутся чужие цифры.
  clearScreenSnapshots();
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

export async function wipeLocalAccountData(
  inheritedLease?: AccountTransitionLockLease,
): Promise<void> {
  await withAccountTransitionLock(wipeLocalAccountDataUnsafe, inheritedLease);
}

const CLEAN_INSTALL_RECOVERY_PRESERVED_KEYS = [
  'auth_clean_install_recovery_v1',
  'auth_clean_install_recovery_adoption_v1',
] as const;

/**
 * Wipes only account-scoped source data during an authoritative clean-install
 * L→S adoption. Both nonsecret recovery journals are verified before and after
 * the wipe so a crash remains resumable and source data is never merged into S.
 */
export async function wipeLocalAccountDataForCleanInstallRecovery(): Promise<void> {
  await withAccountTransitionLock(wipeLocalAccountDataForCleanInstallRecoveryWhileLocked);
}

/** Internal recovery primitive: caller must already own the account-transition lock. */
export async function wipeLocalAccountDataForCleanInstallRecoveryWhileLocked(): Promise<void> {
  const before = await AsyncStorage.multiGet([...CLEAN_INSTALL_RECOVERY_PRESERVED_KEYS]);
  if (before.some(([, raw]) => raw === null)) {
    throw new Error('clean_recovery_journal_required_for_wipe');
  }
  const sourceAccountKeys = await collectAccountLocalDataKeys();
  await wipeLocalAccountDataUnsafe();
  const residualSourceRows = await AsyncStorage.multiGet(sourceAccountKeys);
  if (residualSourceRows.some(([, raw]) => raw !== null)) {
    throw new Error('clean_recovery_source_wipe_incomplete');
  }
  for (const [key, expectedRaw] of before) {
    if (await AsyncStorage.getItem(key) !== expectedRaw) {
      throw new Error('clean_recovery_journal_changed_during_wipe');
    }
  }
}

// ── Удалить все данные пользователя из облака ────────────────────────────────
// Вызывается при нажатии "Удалить аккаунт" в настройках.
export async function deleteCloudData(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  if (IS_EXPO_GO) return;
  if (await isAccountDeleteIdentityQuarantined()) return;
  const canonicalUid = await getCanonicalUserId();
  await ensureAnonUser();
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<
    { stableId?: string | null },
    {
      ok: boolean;
      stableUid: string;
      authUid: string;
      docsDeleted: number;
      docsUpdated: number;
      queriesRun: number;
      authDeleted: boolean;
    }
  >('accountDeleteMine', { timeout: ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS });
  const res = await withTimeout(fn({ stableId: canonicalUid }), ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS, 'account_delete_callable');
  if (!res.data?.ok) throw new Error('account_delete_failed');
}

export type AccountDeleteEnqueueAck = {
  ok: true;
  jobId: string;
  status: 'queued' | 'running' | 'completed';
  created: boolean;
  authReleased: true;
  credentialSafe: true;
};

export type AccountDeleteCredentialProof = {
  operationId: string;
  capability: string;
};

export function startCloudDeletionEnqueue(
  stableId: string | null,
  proof?: AccountDeleteCredentialProof,
): AccountDeleteEnqueueOperation<AccountDeleteEnqueueAck> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    return startAccountDeleteEnqueueWithDeadline(
      async () => { throw new Error('account_delete_enqueue_unavailable'); },
      async () => { throw new Error('account_delete_enqueue_unavailable'); },
      ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS,
    );
  }
  return startAccountDeleteEnqueueWithDeadline(
    () => initFirebaseAppCheckIfAvailable().catch(() => {}),
    async () => {
      if (!proof?.operationId || !proof.capability) {
        throw new Error('account_delete_credential_proof_missing');
      }
      const fn = callable<{
        stableId?: string | null;
        operationId: string;
        capability: string;
      }, AccountDeleteEnqueueAck>(
        'accountDeleteEnqueue',
        { timeout: ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS },
      );
      const res = await fn({ stableId, ...proof });
      if (
        !res.data?.ok
        || !res.data.jobId
        || res.data.authReleased !== true
        || res.data.credentialSafe !== true
      ) throw new Error('account_delete_enqueue_failed');
      return res.data;
    },
    ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS,
  );
}

const ACCOUNT_DELETE_CREDENTIAL_SAFE_WAIT_MS = 15_000;

/**
 * Repairs a lost enqueue response after the old Auth UID has already been
 * deleted. The callable is deliberately unauthenticated; possession of the
 * SecureStore-only capability is the sole bounded proof.
 */
export async function waitForAccountDeletionCredentialSafe(
  proof: AccountDeleteCredentialProof,
  timeoutMs = ACCOUNT_DELETE_CREDENTIAL_SAFE_WAIT_MS,
): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO || !proof.operationId || !proof.capability) return false;
  const deadline = Date.now() + Math.max(1, timeoutMs);
  const fn = callable<AccountDeleteCredentialProof, { status: 'credential_safe' }>(
    'accountDeleteCredentialStatus',
    { timeout: Math.min(timeoutMs, ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS) },
  );
  while (Date.now() < deadline) {
    try {
      const remaining = Math.max(1, deadline - Date.now());
      const response = await withTimeout(
        fn(proof),
        remaining,
        'account_delete_credential_status',
      );
      if (response.data?.status === 'credential_safe') return true;
    } catch (e) {
      // A closure may be committed while its first response is lost. Retry the // capability receipt within the bounded foreground deadline.
      DebugLogger.error('cloud_sync:response', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(400, remaining)));
  }
  return false;
}

export async function enqueueCloudDeletion(
  stableId: string | null,
  proof?: AccountDeleteCredentialProof,
): Promise<AccountDeleteEnqueueAck> {
  return startCloudDeletionEnqueue(stableId, proof).acknowledgment;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
