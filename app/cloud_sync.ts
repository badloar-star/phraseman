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

import { clearAllDialogueV2MemoryDiskCache } from './dialogue_v2_memory_disk_cache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS,
  RETIRED_GIFTS_TO_COINS_ACCOUNT_LOCAL_PREFIXES,
} from './retired_account_local_keys';
import { beginSettingsStorageMutation } from '../lib/startup_settings_read_scope';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED, IS_STORE_RELEASE } from './config';
import { getUtcDayKey } from './local_date';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { getAuthUserId, getCanonicalUserId } from './user_id_policy';
import { isDevFixtureNoUploadActive, omitDevFixtureCardKeys } from './dev_fixture_upload_guard';
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
import {
  GRANDFATHERED_THEMES_KEY,
  OWNED_THEMES_KEY,
  mergeOwnedThemesRestoreValue,
} from './theme_ownership_merge';
import { shardDeltaQueueStorageKey } from './shards_delta_queue';
import { resumePendingReportReplyShardClaims } from './app_messages';
// зачем (PRIVACY_DELTA_R1 п.5): список ключей сообщений аккаунта для шага стирания — отдельной строкой, чтобы не трогать прежний импорт.
import { APP_MESSAGES_ACCOUNT_WIPE_LEGACY_KEYS, APP_MESSAGES_ACCOUNT_WIPE_PREFIXES } from './app_messages';
import { getAuthLinkCacheTtlMs } from './remote_flags';
import { peekStoredItem, readStoredItem, removeStoredItem, writeStoredItem } from './storage_snapshot';
import {
  anonMergeNonceField,
  classifyAnonMergeNonceRejection,
  forgetAnonMergeNonce,
} from '../modules/account-authority-v2/account_authority_anon_merge_nonce';
import { identityErrorCode, identityTag, identityTrace, identityTraceClockMs, redactStorageKey } from './identity_trace';
import {
  clearAccountSwitchBackupMergeAlias,
  readAccountSwitchBackupMergeAlias,
  restoreAccountSwitchEmergencyBackupIfSafe,
} from './account_switch_backup_restore';
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
import { clearStableId, peekStableId, setStableId } from './stable_id';
import {
  assertNoOwnerLevelGiftEffectReceipts,
  removeOwnerLevelGiftEffectReceipts,
} from './level_gift_effect_receipt_cleanup';
import { resetAppSnapshotForAccountSwitch } from './app_snapshot_store';
import { emitAppEvent } from './events';
import { patchAppSnapshotFromAuthoritativeCloudProgress } from './app_snapshot_store';
import {
  cloudSyncSnapshotValueMatches,
  encodeCloudSyncSnapshotValue,
} from './cloud_sync_snapshot_codec';
import {
  filterLegacyProgressForPhoneState,
  isPhoneStateCoreProgressKey,
} from '../modules/phone-state/cloud_boundary';
import { clearScreenSnapshots } from './screen_snapshot_store';
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
import {
  LEARNING_LANGUAGE_TARGETS,
  type LearningLanguageTarget,
} from './learning_language_contour';
import { SOURCE_LOCALES as COMMUNITY_DRAFT_SOURCE_LOCALES } from './source_locales';
import { languageProfileKey } from './study_languages';
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
  flashcardsCommunityOwnedPackTitlesKey,
  flashcardsAchievementFlipCountKey,
  flashcardsAchievementSavedCountKey,
  flashcardsAchievementSourceSetKey,
  flashcardsAchievementViewStreakKey,
  flashcardsDeleteHintSeenKey,
  flashcardsHiddenCommunityPacksKey,
  flashcardsLocalAuthorPacksKey,
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
import { DebugLogger, reportSwallowed, swallowError } from './debug-logger';
import {
  FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY,
  lockFlashcardPagesWrite,
  mergeLockedFlashcardsWithPages,
  readFlashcardPagesResult,
  readFlashcardPagesWriteLocks,
  unlockFlashcardPagesWrite,
} from './flashcard_pages_read_result';
import { buildFlashcardDocFieldMarkers } from './flashcards_doc_field_clear';
import {
  buildDocProgressWithoutFlashcardLists,
  buildForceSyncSnapshot,
  runForceFlashcardUpload,
  uploadFlashcardListsToPages,
} from './flashcards_cloud_upload';
import {
  FLASHCARD_FUTURE_KEPT_STASH_KEY,
  logFutureKeptStashBeforeWipe,
  mergeFutureKeptStashRaw,
  stashForceFutureKeptLocalVersions,
} from './flashcards_future_kept_stash';
import {
  isAccountsV2LegacyDomainKey,
  isAccountsV2LegacySwitchFlagOn,
  omitAccountsV2LegacyDomains,
  resolveAccountsV2LegacySkip,
  ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY,
  logAccountsV2LegacySyncKeys,
} from './accounts_v2_legacy_sync_switch';
import { CARD_DELETION_JOURNAL_KEY, readCardDeletionJournal } from './flashcards/card_deletion_journal';
import type { StudyTarget as FlashcardStudyTarget } from './study_target';
import { rnfbInstance } from './rnfb_modular';
import { noteSwallowed } from './swallow_log';
import { gcDelta, gcSnapshot } from './mem_probe';
import { markMistakeFullRestoreDone, resolveMistakeRestoreTargets } from './mistake_restore_targets';
import { diffAchievementUnlocks, mergeAchievementStatesRaw } from './achievement_restore_diff';
import { mergeNumericMaxRestoreValue } from './restore_numeric_max_merge';
import {
  isDeferredBootRestoreWaiting,
  onDeferredBootRestoreSettled,
  peekBootRestoreDirtyKeys,
  markBootRestoreUserDocRead,
  requestDeferredBootRestoreStart,
  whenDeferredBootRestoreDocRead,
} from './boot_restore_dirty_keys';
import { noteRestoreUserDocBanned } from './boot_user_doc_ban_peek';
import { BOOT_RESTORE_OWNER_KEY } from './boot_restore_defer';
import {
  customCardDeletionsForTarget,
  mergeCustomCardsRestoreValue,
  mergeSwipeMemoryRestoreValue,
  type CustomCardsMergeStats,
} from './flashcards/restore_merge';
import { warmCallableViaFetch } from './auth_warm_fetch';
import { invokeAuthCallable } from './auth_callable_fetch'; // зачем: вызовы входа мимо однопоточной очереди RNFirebase — под флагом auth_callables_fetch_v1 (выкл) // зачем: прогрев входа мимо однопоточной очереди RNFirebase (прогон №5)
import { readTesterFlags } from './tester_premium_override'; // зачем: [COLD-START-IO] — одно чтение флагов тестера

const FRENCH_SYNC_LESSON_IDS = Array.from({ length: 32 }, (_, index) => index + 1);
const FRENCH_SYNC_EXAM_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
const FRENCH_SYNC_PERFECT_MILESTONES = [5, 10, 15, 20, 25, 30] as const;
const FRENCH_SYNC_SOURCE_LOCALES = ['ru', 'uk'] as const;
export const SYNC_STUDY_TARGETS = LEARNING_LANGUAGE_TARGETS;
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

function buildTargetFlashcardSyncKeys(target: Exclude<LearningLanguageTarget, 'en' | 'fr'>): readonly string[] {
  return [
    flashcardsSavedKey(target),
    customFlashcardsKey(target),
    flashcardsCommunityOwnedPacksKey(target),
    flashcardsOwnedPacksKey(target),
    flashcardsProgressKey(target),
    flashcardsPackTrialGiftKey(target),
    flashcardsAchievementSavedCountKey(target),
    flashcardsAchievementFlipCountKey(target),
    flashcardsAchievementViewStreakKey(target),
    flashcardsAchievementSourceSetKey(target),
    flashcardsSwipeSessionDraftKey(target),
    flashcardsSwipeMemoryKey(target),
  ];
}

const OTHER_NON_ENGLISH_TARGET_SYNC_KEYS = SYNC_STUDY_TARGETS
  .filter((target): target is Exclude<LearningLanguageTarget, 'en' | 'fr'> => target !== 'en' && target !== 'fr')
  .flatMap((target) => buildTargetFlashcardSyncKeys(target));
const NON_ENGLISH_TARGET_SYNC_KEYS = [
  ...FRENCH_TARGET_SYNC_KEYS,
  ...OTHER_NON_ENGLISH_TARGET_SYNC_KEYS,
] as const;

// ── Ключи AsyncStorage которые синхронизируются с облаком ────────────────────
// Экспорт: тот же набор должен учитываться при сбросе локали после merge аккаунта (auth_provider).
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

const isTruthyFlag = (raw: string | null | undefined): boolean => raw === '1' || raw === 'true';
function mergeTruthyFlagRestoreValue(localRaw: string | null | undefined, cloudRaw: string): string {
  return !isTruthyFlag(cloudRaw) && isTruthyFlag(localRaw) ? (localRaw as string) : cloudRaw;
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
  // зачем (п.12, координатор 11.10): «было оплачено» не снимается — флаг, поставленный здесь после покупки,
  // переживает облако, где его ещё нет (ИЛИ). Снять оплату может только сервер своим путём, не restore.
  had_premium_ever: mergeTruthyFlagRestoreValue,
  [ACHIEVEMENT_ACCESS_PLUS_PAID_KEY]: mergeTruthyFlagRestoreValue,
  [ACHIEVEMENT_ACCESS_PRO_PAID_KEY]: mergeTruthyFlagRestoreValue,
  // зачем (пп.9–11, координатор 11.10): статистика и время в приложении только растут — по каждому полю
  // (для daily_stats — внутри каждой даты) берём больше. Тратимое (заморозки, бонус входа) сюда не класть.
  daily_stats: mergeNumericMaxRestoreValue,
  phraseman_foreground_usage_ms_v1: mergeNumericMaxRestoreValue,
  phraseman_foreground_daily_ms_v1: mergeNumericMaxRestoreValue,
  ...Object.fromEntries(SYNC_STUDY_TARGETS.map((target) => [userStatsKey(target), mergeNumericMaxRestoreValue])),
};

export const SYNC_KEYS = [
  // ── Идентичность и базовый прогресс ────────────────────────────────────────
  // Server-confirmed survey completion timestamp; restored locally, never uploaded by clients.
  'shard_survey_last_at_ms',
  'user_name',
  'user_avatar',
  'user_frame',
  'user_avatar_aura',
  'custom_avatar_owned_v1',
  'custom_avatar_gift_owned_v1',
  'avatar_aura_owned_v1',
  'avatar_aura_gift_owned_v1',
  // Команда админки на разовое изменение энергии (обнулить/налить). Клиент применяет
  // её один раз по метке at (см. energy_system.applyAdminEnergyCommand) — energy_state
  // остаётся client-owned, команда лишь одноразовый триггер из облака на устройство.
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
  ...SYNC_STUDY_TARGETS.map(languageProfileKey),
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
  'achievement_gift_sent_count',
  ACHIEVEMENT_FOUNDATION_PROGRESS_KEY,
  ACHIEVEMENT_ACCESS_PLUS_PAID_KEY,
  ACHIEVEMENT_ACCESS_PRO_PAID_KEY,
  'onboarding_done',
  'lang',
  'app_lang',

  'login_bonus_v1',
  /** Статистика по дням — без синка теряется на новом устройстве. */
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
  flashcardsPackTrialGiftKey('en'),

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

  // зачем (PM-289, D70/D78): ключи жемчуга (shards_one_time_events,
  // shards_lifetime_*) из синхронизации убраны — валюта удалена, писателей нет.

  // ── UI / поведение ─────────────────────────────────────────────────────────
  // app_theme / app_font_size / haptics_tap — только локально на устройстве (см. wipeLocalAccountData KEEP).
  // Синк с облаком ломал тему: при restore облако перетирало выбор пользователя старым progress.
  // зачем: САМА выбранная тема остаётся локальной (см. выше), но СПИСОК КУПЛЕННЫХ
  // за жемчуг тем синхронизируется — это потраченная валюта, терять её при
  // переустановке/переезде нельзя. Конфликта, который сломал `app_theme`, здесь
  // быть не может: список только растёт и мержится объединением.
  OWNED_THEMES_KEY,
  GRANDFATHERED_THEMES_KEY,
  // зачем (владелец 2026-09-17): уроки, купленные за 100 жемчужин, СЮДА НЕ
  // добавляем намеренно. Их переносит леджер покупок как portable grant
  // (`lesson_pearl_unlock` в client_shard_semantic_reducer) — он материализует
  // покупку на новом устройстве из чека. Через progress их слать нельзя:
  // прогресс уроков серверный, а `unlocked_lessons` прямо запрещён правилами
  // (progressHasNoPremiumWrites), и лишний ключ уронил бы ВЕСЬ пакет прогресса.
  'user_settings',
  /** Last diagnostic result: date, score and recommended level. */
  'diagnostic_last',
  'device_platform',
  'app_version',
  'user_stats_v1',

  // ── Время в приложении (foreground) — график «Время в приложении» ─────────
  'phraseman_foreground_usage_ms_v1',
  'phraseman_foreground_daily_ms_v1',

  // ── Блок «Весь путь» / метрики статистики (локально накапливаются) ─────────
  /** Посуточные счётчики для графиков «Весь путь» (JSON { дата → метрики }). */
  'stats_daily_breakdown_v1',
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
  ...Array.from({ length: 32 }, (_, i) => achievementLessonPerfectPassesKey(i + 1, 'en')),
  ...FRENCH_TARGET_SYNC_KEYS,
  ...OTHER_NON_ENGLISH_TARGET_SYNC_KEYS,
  // ── Подарочный доступ intro: зеркалим срок в облако, чтобы при смене
  //    телефона / переустановке подарок не терялся и восстанавливался (Д2-фикс).
  //    Зеркалим И started, И ends (getIntroFullAccessState требует оба). ВНИМАНИЕ: это
  //    лёгкий вариант (анти-потеря). Это НЕ серверная защита от ручного продления —
  //    клиент всё ещё может переписать срок локально; для бесплатного подарка риск
  //    низкий. Полную защиту (CF-выдача + blocked-ключи) делать отдельно.
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
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
  // зачем: личный план удалён в 2.0 (efe19ae9d), и снимок выкинул его журналы
  // отсюда — они перестали стираться при смене аккаунта и доставались
  // следующему человеку. Возвращены ровно те ключи, что были до снимка.
  'personal_plan_attempt_events_v1',
  'personal_plan_counted_phrases_v1',
  'personal_plan_recovery_applied_actions_v1',
  'personal_plan_onboarding_nickname_pending_v1',
  'personal_plan_pending_activation_v1',
  'plan_day_shard_rewards_v1',
  // Paid/pending shard grants are durable ownership evidence. The legacy
  // singleton and its quarantine-owner proof must travel with the same backup,
  // wipe and residue verification as the owner-scoped grant journals below.
  'pending_shard_grants_v1',
  'pending_shard_grants_v1_quarantine_owner_v1',
] as const;

// Ключи снятых в 2.0 XP/лиги стираются вместе с аккаунтом — см. retired_account_local_keys.ts.
export { RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS };

const ACCOUNT_LOCAL_KEY_PREFIXES = [
  // зачем: снимок 2.0 (efe19ae9d) выкинул эти префиксы вместе с разделом MAX, и
  // журналы голосовой обратной связи (там текст пользователя) перестали
  // стираться при смене аккаунта — доставались следующему человеку на телефоне.
  // MAX законсервирован, но старые журналы на устройствах 1.x остались: они
  // обязаны бэкапиться, стираться и проверяться на остаток вместе с аккаунтом.
  'max_voice_finalize_outbox_v1:',
  'max_voice_feedback_outbox_v1:',
  'max_voice_review_receipt_v1:',
  'max_voice_review_receipts_v1:',
  'mistake_practice_v2::',
  // Журнал дней удалённого личного плана (см. RETIRED_ROUTE_ACCOUNT_LOCAL_FIXED_KEYS).
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
  // A learner-visible Spire report is removed locally before the network
  // confirms quarantine, so its retry WAL must travel with the owning account.
  'spire_task_report_outbox_v1:',
  // One privacy-minimal owner milestone receipt per account + study language.
  // It must travel/wipe with the card library and must never cross accounts.
  'custom_card_milestone_outbox_v1:',
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
  'shards_delta_queue_v2:',
  'shards_delta_queue_v2_quarantine:',
  // Every fixed/dynamic family declared by shards_pending_grants.ts. These may
  // contain unresolved real-money grant proofs and therefore must never be
  // mistaken for a clean anonymous identity or left behind under provider B.
  'pending_shard_grants_v2:',
  'pending_shard_grants_quarantine_v1:',
  'pending_shard_grants_delete_cleanup_v1:',
  'pending_shard_grants_recovery_needed_v1:',
  'pending_shard_grants_correlated_event_v1:',
  // зачем: проекция и очередь рун живут в этих ключах и должны стираться/бэкапиться вместе с аккаунтом (выпали при ретайре Spin)
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
  // зачем (D49/D148, Q109): «Дневной путь» и миграция «Подарки → монеты» удалены
  // вместе с кодом, но на устройствах с 1.x их журналы лежат — стираем вместе с
  // аккаунтом (подчистка старых устройств), чтобы новый вошедший не унаследовал чужое.
  ...RETIRED_GIFTS_TO_COINS_ACCOUNT_LOCAL_PREFIXES,
  'external_economy_result_v1:',
  'external_economy_event_applied_v1:',
  // зачем (PM-210, экономия чтений): курсор «до сюда события применены» — данные
  // аккаунта; переезжает и стирается вместе с маркерами выше, иначе чужой курсор
  // молча пропустил бы события нового владельца.
  'external_economy_event_cursor_v1:',
  // зачем (D70/D84): квитанция обнуления жемчуга пишется в той же операции журнала
  // жемчуга — путешествует и стирается вместе с ним (след для поддержки).
  'pearl_retire_d70_receipt_v1:',
  // зачем (D51, Q12): журнал миграции «Подарки → монеты», учёт потолка спинов и
  // квитанции Plus-дней путешествуют вместе с инвентарём аккаунта; вернувшаяся
  // копия инвентаря без метки = двойная выплата.
  'gifts_to_coins_v1:',
  // Сырые ключи удалённых спинов и сезонного пропуска (были account-local до
  // снимка efe19ae9d): их читает миграция «Подарки → монеты», поэтому они
  // по-прежнему путешествуют и стираются вместе с аккаунтом.
  'local_level_spin_state_v1:',
  'season_pass_gift_inventory_v2:',
  'season_pass_claim_composite_v1:',
  'season_pass_gift_used_v1:',
  // зачем (PM-075/076): ранг монеты куплен за монеты этого аккаунта и пишется одним
  // multiSet с тратой — обязан путешествовать и стираться вместе с рунным кошельком.
  'coin_rank_v1:',
  // зачем (D114): визитка «Про» куплена за монеты этого аккаунта и пишется одним
  // multiSet с тратой; кэш своего текста визитки — тоже данные этого аккаунта.
  'profile_card_pro_v1:',
  'profile_card_bio_cache_v1:',
] as const;

export function isAccountLocalJournalStorageKey(key: string): boolean {
  return (RETIRED_ROUTE_ACCOUNT_LOCAL_FIXED_KEYS as readonly string[]).includes(key)
    || ACCOUNT_LOCAL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function isLearningV2AccountLocalKey(key: string): boolean {
  return isAccountLocalJournalStorageKey(key);
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

/**
 * Ключи аккаунта, которые стирание убирает ОТДЕЛЬНЫМ шагом, вне общего инвентаря (он же — аварийная копия и «проверка чистоты»:
 * кэш сообщений есть у любого гостя, и в общем инвентаре он делал бы каждого гостя «грязным»).
 * зачем (PRIVACY_DELTA_R1 п.5, координатор 12.10): ключи сообщений и отметка полного восстановления ошибок (в имени — stableId/uid)
 * переживали выход и удаление, а политика (§3, §20) обещает удаление локальных данных.
 */
const MISTAKE_RESTORE_FULL_DONE_PREFIX = 'mistake_restore_full_done_v1';
// зачем (п.80, улика account_actions_2026-10-12 «осталось 2»): кэш заблокированных (friend_block.ts) и хвост баланса для проверки
// непрерывности экономики (economy_daily_stats_reporter.ts) — ключи «константа + stableId», их не видел ни инвентарь, ни сторож.
const FRIEND_BLOCKED_CACHE_PREFIX = 'friend_blocked_v1';
const ECONOMY_DAILY_STATS_TAIL_PREFIX = 'economy_daily_stats_tail_v1';
// зачем (координатор 13.10, 1804b52ab): дисковая копия визиток друзей (profile_card_public.ts, до 64 записей) принадлежит аккаунту — после смены аккаунта визитки друзей прошлого не должны остаться.
// Ключ без stableId (одна копия на устройство), поэтому он совпадает с префиксом целиком; память модуля сбрасывается отдельным шагом ниже (clearPublicProfileCardCache).
const PROFILE_CARD_PUBLIC_CACHE_PREFIX = 'profile_card_public_v1';
const WIPE_ONLY_ACCOUNT_KEY_PREFIXES: readonly string[] = [
  ...APP_MESSAGES_ACCOUNT_WIPE_PREFIXES, MISTAKE_RESTORE_FULL_DONE_PREFIX, FRIEND_BLOCKED_CACHE_PREFIX, ECONOMY_DAILY_STATS_TAIL_PREFIX, PROFILE_CARD_PUBLIC_CACHE_PREFIX,
];
const WIPE_ONLY_ACCOUNT_EXACT_KEYS: ReadonlySet<string> = new Set(APP_MESSAGES_ACCOUNT_WIPE_LEGACY_KEYS);

/** Префикс стирания для ключа или null (ключ — `prefix` или `prefix:<владелец>`). Экспорт — для сторожа. */
export function wipeOnlyAccountKeyPrefix(key: string): string | null {
  if (WIPE_ONLY_ACCOUNT_EXACT_KEYS.has(key)) return key;
  for (const prefix of WIPE_ONLY_ACCOUNT_KEY_PREFIXES) {
    if (key === prefix || key.startsWith(`${prefix}:`)) return prefix;
  }
  return null;
}

function countWipeOnlyKeysByPrefix(keys: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of keys) {
    const prefix = wipeOnlyAccountKeyPrefix(key) ?? 'other';
    counts[prefix] = (counts[prefix] ?? 0) + 1;
  }
  return counts;
}

async function collectAccountLocalDataKeys(): Promise<string[]> {
  const allKeys = await listAllAccountLocalStorageKeys();
  return accountOwnedStorageKeysFrom(allKeys);
}

/** Single authoritative account-owned inventory shared by backup, wipe and
 * credential-handoff clean proof. Dynamic WAL keys are discovered from the
 * same storage snapshot; fixed keys are included even when currently absent. */
export function accountOwnedStorageKeysFrom(
  allKeys: readonly string[],
  todayKey: string = getUtcDayKey(),
): string[] {
  return Array.from(new Set([
    ...accountLocalDataKeysForToday(todayKey),
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
    flashcardsCommunityOwnedPackTitlesKey(target),
    flashcardsLocalAuthorPacksKey(target),
    flashcardsHiddenCommunityPacksKey(target),
    flashcardsOwnedPacksKey(target),
    flashcardsMarketDevOwnedPacksKey(target),
    flashcardsOpenedPacksKey(target),
    flashcardsPackTrialGiftKey(target),
    flashcardsDeleteHintSeenKey(target),
    ...COMMUNITY_DRAFT_SOURCE_LOCALES.map((sourceLocale) => (
      communityPackCreateDraftKey(target, sourceLocale)
    )),
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
    'shards_balance_meta_v1',
    'shards_store_purchased_total_v1',
    'shards_delta_queue_v1',
    // Bookkeeping синка (новый stable_id = новая история синка)
    LAST_SYNC_SNAPSHOT_KEY,
    CREATED_AT_SYNC_KEY,
    STABLE_AUTH_LINK_CACHE_KEY,
    // зачем (пункт (а)): метка «этот телефон уже восстанавливался в этот аккаунт» принадлежит аккаунту —
    // после выхода/смены/удаления она не должна разрешать отложенное восстановление чужому uid.
    BOOT_RESTORE_OWNER_KEY,
    // зачем (Account V2, 7A ремонт №2, P1): метка «V2 применена на этой установке»
    // принадлежит аккаунту — после выхода/смены она не должна пропускать restore.
    ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY,
    // зачем (Account V2, 7D): журнал удалений карточек принадлежит аккаунту — стирается
    // вместе с его карточками при выходе/смене/удалении; в старое облако не уходит.
    CARD_DELETION_JOURNAL_KEY,
    // зачем (Account Authority 2.0, S1b, §100): отпечаток записи страниц карточек (8N) хранит
    // stableId владельца и отпечатки его списков — это след аккаунта, стирается вместе с ним.
    // Без отпечатка повторный вход объединяет со страницами (безопасная сторона), не затирает их.
    FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY,
    // зачем (владелец 11.10, журнал 16): проверенная копия срока подарка лояльности принадлежит аккаунту —
    // стирается при выходе и смене (gift_access_local_copy.ts; копия ещё и привязана к id аккаунта).
    'loyalty_gift_verified_copy_v1',
    // зачем (AA 2.0, S1e): локальные версии карточек, уступившие облачной «из будущего» при силовом
    // переносе, — данные аккаунта: едут в его аварийную копию и стираются вместе с ним.
    FLASHCARD_FUTURE_KEPT_STASH_KEY,
    'cloud_migration_v1',
    // Кэши лидербордов (содержат предыдущего юзера)
    'global_lb_cache',
    'leaderboard_cache_v1',
    // Прочее account-level
    'last_active_date',
    'user_profile',
    'generated_nickname_pending_v1',
    'generated_name_confirmed_v1',
    // Производный display-флаг реального премиума (НЕ в SYNC_KEYS, пересчитывается
    // резолвером). Чистим при смене/сбросе аккаунта, чтобы старое premium_active='true'
    // не перетекло к новому аккаунту до первого пересчёта доступа.
    'premium_active',
    'bug_hunt_shown',
    'flashcard_anim_pending',
    'energy_state',
    'energy_onboarding_shown',
    'daily_treasure_state',
    'install_date',
    'login_bonus_v1',
    'last_opened_lesson',
    ...RETIRED_ROUTE_ACCOUNT_LOCAL_FIXED_KEYS,
    ...RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS,
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

/**
 * зачем (владелец 2026-09-02, аудит расходов): временная трассировка лавины
 * вызовов authEnsureStableLink. В dev пишет всегда; в релизной сборке — только
 * когда владелец включит флаг, чтобы снять факты с реального устройства.
 * Снять вместе с логом [AUTH-LOOP] после починки.
 */
// зачем (владелец 2026-09-22, «удалить все замеры и логи»): здесь стояло
// захардкоженное `true` вопреки комментарию выше, обещавшему флаг. Из-за этого
// трассировка работала В РЕЛИЗЕ на каждом вызове authEnsureStableLink — а её и
// завели потому, что вызовов «лавина». Каждый вызов собирал стек через
// new Error().stack (дорогая операция) и склеивал JSON. Теперь молчит везде,
// пока владелец не включит флаг явно.
export const AUTH_LOOP_TRACE_ENABLED = process.env.EXPO_PUBLIC_AUTH_LOOP_TRACE === '1';

/**
 * Счётчик вызовов за сессию приложения — чтобы лавина была видна с первого
 * взгляда, без выуживания отдельных строк. Владелец просто пользуется
 * приложением, а я читаю .expo/metro-console.log сам.
 */
let _authLinkCallNo = 0;
const _authLinkFirstCallAtMs = Date.now();
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
    // Lazy require avoids cloud_sync -> PhoneState cutover startup cycles.
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

export type StableAuthLinkFailure =
  | CloudAccessFailureReason
  | 'stable_id_mismatch'
  | 'identity_retired'
  // зачем отдельный класс (владелец, 2026-09-01): аккаунт на удалении, но
  // 14 дней ещё идут и данные ЦЕЛЫ. Прежде он схлопывался в identity_retired,
  // и вход молча заводил пустой профиль вместо «Восстановить аккаунт?».
  | 'account_delete_pending';

export type StableAuthLinkEnsureResult = {
  ok: boolean;
  requestedStableId: string;
  stableUid: string | null;
  authUid: string | null;
  source: 'disabled' | 'cache' | 'callable' | 'unavailable';
  failure?: StableAuthLinkFailure;
  retiredSubject?: 'stable' | 'auth' | 'closure' | 'unknown';
  /**
   * зачем (AA S2c, L-S2b-4): отказ перепривязки, за которым стоит потерянный
   * nonce M-1 (выдан этому stableId в этом процессе, к вызову истёк/стёрт).
   * failure остаётся прежним — старые ветки ведут себя как раньше; поле лишь
   * даёт различимый код «повторите вход» вместо общего auth_link_failed.
   */
  nonceRejection?: 'anon_merge_nonce_lost';
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

function classifyCloudAccessFailure(error: unknown): StableAuthLinkFailure {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error).toLowerCase();
  const combined = `${code} ${message}`;
  // Порядок важен: pending проверяется ПЕРВЫМ. Оба кода про удаление, но
  // pending обратим (есть кнопка «Восстановить»), а retired — нет.
  if (combined.includes('account_delete_pending')) return 'account_delete_pending';
  if (combined.includes('identity_retired')) return 'identity_retired';
  if (combined.includes('stable_id_mismatch')) return 'stable_id_mismatch';
  if (combined.includes('auth_required')) return 'identity_unavailable';

  // зачем: App Check снят с клиента навсегда (пломба владельца 2026-08-17,
  // E24 2026-10-01). Сервер его не требует, поэтому «unauthenticated» больше
  // не переводится в app_check_unavailable — это честная ошибка входа ниже.

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

// зачем (AA S2b, пункт 12, §122): на холодном старте ключ читали ~16 потребителей
// подряд, и каждое чтение шло мостом в SQLite. Теперь он читается через снапшот:
// из хранилища один раз, дальше синхронно из памяти (peek); запись и удаление идут
// сквозь снапшот, а любая запись мимо него (wipe аккаунта) выбрасывает ключ из памяти.
async function readStableAuthLinkCache(key: string): Promise<boolean> {
  try {
    const peeked = peekStoredItem(STABLE_AUTH_LINK_CACHE_KEY);
    const raw = peeked !== undefined ? peeked : await readStoredItem(STABLE_AUTH_LINK_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { key?: unknown; linkedAt?: unknown };
    const linkedAt = typeof parsed.linkedAt === 'number' ? parsed.linkedAt : 0;
    const ttlMs = Math.max(60_000, getAuthLinkCacheTtlMs() || DEFAULT_STABLE_AUTH_LINK_CACHE_TTL_MS);
    return parsed.key === key && linkedAt > 0 && Date.now() - linkedAt < ttlMs;
  } catch (error) {
    // Битый кэш = промах: пойдём к серверу. Причина — в лог, без значения ключа.
    console.warn(`[AUTH-LINK-CACHE] read:catch kind=${error instanceof Error ? error.name : typeof error}`);
    return false;
  }
}

async function writeStableAuthLinkCache(key: string): Promise<void> {
  await writeStoredItem(STABLE_AUTH_LINK_CACHE_KEY, JSON.stringify({ key, linkedAt: Date.now() }));
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
): [string, string][] => {
  const pairs: [string, string][] = [];
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

// Ключи, которые выдаёт только сервер.
// Клиент их в облако НИКОГДА не шлёт — они в blocklist progressHasNoPremiumWrites
// (firestore.rules), и любая исходящая запись уронит весь set целиком, как с
// premium-ключами. Отличие от PREMIUM_PROGRESS_KEYS: исключение безусловное
// (нет аналога hasLocalPremiumSyncState). Локальная копия обновляется из ответа
// CF и при restoreFromCloud — поэтому ключи ОБЯЗАНЫ оставаться в SYNC_KEYS.
export const SERVER_OWNED_PROGRESS_KEYS = new Set([
  'streak_count',
  'last_active_date',
  'streak_last_date',
  // Exact EN unlock key is protected by Firestore Rules and mutated only by
  // progress_events. Keep it restoreable via SYNC_KEYS, but never include it in
  // an outbound client patch or the rules reject the whole progress update.
  'unlocked_lessons',
  'shard_survey_last_at_ms',
  // PM-275: недельный прогресс Шпиля пишет только spireReportSteps; правила его блокируют,
  // и попавший в исходящий патч ключ уронил бы ВЕСЬ апдейт progress.
  'spire_week_v1',
  ACHIEVEMENT_ACCESS_PLUS_PAID_KEY,
  ACHIEVEMENT_ACCESS_PRO_PAID_KEY,
]);

/**
 * зачем (владелец 2026-09-02): зеркало блок-листов firestore.rules
 * (blockedPremiumProgressKeys + серверные ключи progress). Нужно ТОЛЬКО для
 * диагностики отказа: лог печатает 800 ключей, RN обрезает строку на ~144, и
 * виновника в ней не видно. Эта функция называет нарушителя сама.
 *
 * Список ведётся вручную в двух местах (правила и клиент) и уже расходился —
 * поэтому здесь он полный, включая ключи, которых нет в клиентских фильтрах.
 */
const RULES_BLOCKED_PROGRESS_KEYS: ReadonlySet<string> = new Set([
  'premium_plan', 'premium_expiry', 'premium_rc_product_id', 'premium_rc_period_type',
  'premium_rc_store', 'premium_rc_environment', 'premium_rc_event_type',
  'premium_rc_updated_at', 'premium_rc_expiry_ms', 'premium_rc_purchased_at_ms',
  'premium_rc_cancelled_at', 'premium_rc_active_lineage', 'premium_rc_reconcile_needed',
  'admin_premium_override', 'premium_admin_grant_at', 'had_premium_ever',
  'vip_active', 'vip_plan', 'vip_from', 'vip_until', 'vip_admin_override',
  'vip_admin_grant_at', 'vip_migrated_from_admin_grant_at',
  'intro_access_until_ms', 'intro_access_granted_at_ms',
  'loyalty_gift_until_ms', 'loyalty_gift_granted_at_ms',
  'referral_vip_last_source', 'promo_vip_last_code',
  'lesson1_pass_live', 'lesson_progress_v2::fr::lesson1_pass_live',
  'collectibles_owned_v1', 'collectibles_state_v1',
  'profile_card_level', 'shard_survey_last_at_ms',
  'achievement_access_plus_paid_v1', 'achievement_access_pro_paid_v1',
  // серверные ключи прогресса (тот же update-блок правил)
  'streak_count', 'last_active_date', 'streak_last_date',
  'unlocked_lessons', 'chain_shield', 'club_gift_free_boost_v1',
  // Retired economy/league keys remain blocked from any outbound progress patch.
  'user_total_xp', 'user_prev_xp', 'user_level', 'weekly_xp', 'weekly_xp_period_start',
  'week_points', 'week_points_v2', 'referral_spin_credits', 'level_reward_spin_balance',
  'referral_spins_total', 'referral_spin_ledger_version', 'referral_spin_ledger_migrated_at_ms',
]);

/** Ключи патча, которые правила Firestore запрещают клиенту писать. */
export function findRulesBlockedKeys(keys: readonly string[]): string[] {
  return keys.filter((key) => RULES_BLOCKED_PROGRESS_KEYS.has(key)
    || isServerOwnedProgressKey(key));
}

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
const RESTORE_MERGE_KEY_SET = new Set<string>([
  ...LESSON_RESTORE_MERGE_KEYS,
  ...LEVEL_EXAM_RESTORE_MERGE_KEYS,
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
// retired compatibility values can legitimately drop during cleanup).
export const MONOTONIC_COUNTER_RESTORE_KEYS = [
  'achievement_quiz_total_count',
  'achievement_flashcards_flip_count',
  'achievement_flashcards_saved_count',
  'achievement_daily_phrase_read_count',
  'achievement_daily_phrase_save_count',
  'achievement_energy_refill_count',
  'achievement_gift_sent_count',
  'achievement_shards_spent_total',
  // зачем (п.8, координатор 11.10): сервер только прибавляет (report_replies += 1) — берём больше.
  'helpful_error_reports_confirmed_v1',
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

const TARGET_SCOPED_RESTORE_KEY_PATTERN = new RegExp(
  `^([a-z_]+)_v2::(?:${SYNC_STUDY_TARGETS.join('|')})::(.+)$`,
);

function targetScopedRestoreInfo(key: string): { domain: string; id: string } | null {
  const match = TARGET_SCOPED_RESTORE_KEY_PATTERN.exec(key);
  if (!match) return null;
  try {
    return { domain: match[1], id: decodeURIComponent(match[2]) };
  } catch {
    return { domain: match[1], id: match[2] };
  }
}

// K2: owned/purchased-ключи (покупки за осколки / выдачи), которые restore в ветке
// «облако победило» НЕЛЬЗЯ слепо перезаписывать облаком: офлайн-покупка (пак флешкарт,
// аура или аватар), ещё не доехавшая до облака, исчезала бы.
// Владение строго аддитивно — мержим объединением (union), как mergeOwnedFlagMap
// в sticky-ветке. Базовые имена; матчатся и target-scoped варианты
// (flashcards_v2::fr::flashcards_owned_packs_v1 и т.п.).
const OWNED_UNION_RESTORE_BASE_KEYS = new Set<string>([
  'avatar_aura_owned_v1',          // {[id]: true}
  'custom_avatar_owned_v1',        // {[id]: 'gradient:logoColor'}
  'flashcards_owned_packs_v1',     // ["packId", ...]
  'community_owned_pack_ids_v1',   // ["packId", ...]
  'level_up_shown_levels_v1',      // [2, 3, ...] — acknowledged modals are strictly additive
  // зачем (аудит 2026-08-24): темы, купленные за 200 жемчужин, и темы «дедушек» —
  // такое же владение, как паки и ауры. Одной FC_RESTORE_MERGE_STRATEGIES было
  // МАЛО: она применяется только во французской и sticky-ветках, а ГЛАВНАЯ ветка
  // restore (цикл по getRuntimeSyncKeys) идёт через mergeLessonRestoreValue, где
  // нераспознанный ключ возвращает cloudValue — облако затёрло бы офлайн-покупку,
  // и человек потерял бы жемчуг. Регистрация здесь закрывает все ветки разом.
  OWNED_THEMES_KEY,                // ["ember", ...]
  GRANDFATHERED_THEMES_KEY,        // ["midnight", ...]
  // зачем (пп.6–7, координатор 11.10): списки только растут — начатый здесь язык и источник карточек
  // не должны пропадать из-за облака, где их ещё нет.
  'study_languages_started_v1',            // ["en", "fr", ...]
  'achievement_flashcards_source_set_v1',  // множество источников (и языковые варианты ключа)
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
 * объект-мапа — ключи из обоих источников (числа берут max; прочие конфликты
 * обычно решает облако).
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
  // Владение аддитивно: НЕ роняем реальные локальные покупки (аватары/ауры)
  // в пользу пустого облака — иначе в cloud-wins ветке офлайн-покупки
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

/**
 * #11 multi-device: уроковый прогресс, чей merge в mergeLessonRestoreValue
 * строго МОНОТОНЕН (union множеств / max / OR / лучшее качество ответов) —
 * применение такого merge не может откатить достижения ни на одном устройстве.
 * Поэтому эти семьи ключей restore подмешивает даже в sticky-ветке
 * (localXP ≥ cloudXP), где полный merge запрещён legacy reward-гейтом.
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
  } catch (error: unknown) {
    // зачем (координатор 12.10, «немого catch нет»): испорченная запись выглядела как «записи нет». Значение не печатаем —
    // там личные данные; только длина и причина.
    console.warn('[RESTORE-MERGE]', JSON.stringify({ event: 'record:unparseable', len: raw.length, reason: error instanceof Error ? error.message : String(error) }));
    return null;
  }
}

async function applyPersonalPlanRestorePairs(pairs: readonly (readonly [string, string])[]): Promise<void> {
  const finishSettingsMutation = pairs.some(([key]) => key === 'user_settings')
    ? beginSettingsStorageMutation() : undefined;
  try {
    // Personal Plan is retired and no longer participates in restore. All
    // remaining restore pairs are ordinary account/progress keys.
    await AsyncStorage.multiSet(sanitizeStoragePairs(pairs));
  } finally {
    finishSettingsMutation?.();
  }
}

/**
 * [RESTORE-MERGE] — одна строка на слитый ключ: длины и кто победил (сами значения — личные данные, не печатаем).
 * зачем (координатор 11.10): видно, что слияние сработало и локальное накопление не потеряно.
 */
function logRestoreMerge(key: string, localValue: string | null | undefined, cloudValue: string, merged: string): void {
  const winner = merged === cloudValue ? (merged === localValue ? 'same' : 'cloud') : merged === localValue ? 'local' : 'merged';
  console.log('[RESTORE-MERGE]', JSON.stringify({
    key, winner, localLen: localValue?.length ?? null, cloudLen: cloudValue.length, resultLen: merged.length,
  }));
}

/**
 * Пп.2–3 (координатор 11.10): правила слияния для своих карточек и памяти ответов по всем языкам.
 * Журнал удалений читается ОДИН раз и только если в облаке есть свои карточки хоть одного языка.
 * Сбой чтения журнала → без журнала (удалённая здесь карточка может вернуться — лог об этом).
 */
async function buildCardRestoreMergeStrategies(
  cloudData: Record<string, unknown>,
): Promise<Record<string, (localRaw: string | null | undefined, cloudRaw: string) => string>> {
  const strategies: Record<string, (localRaw: string | null | undefined, cloudRaw: string) => string> = {};
  const customTargets = SYNC_STUDY_TARGETS.filter((target) => cloudData[customFlashcardsKey(target)] != null);
  let journal: ReadonlyMap<string, number> | null = null;
  if (customTargets.length > 0) {
    journal = await readCardDeletionJournal().catch((error: unknown) => {
      console.warn('[RESTORE-MERGE] журнал удалений карточек не прочитан', error instanceof Error ? error.message : String(error));
      return null;
    });
    if (!journal) console.warn('[RESTORE-MERGE] журнала удалений нет или он битый — удалённые здесь карточки не отсеиваются');
  }
  for (const target of customTargets) {
    const deleted = customCardDeletionsForTarget(journal, target);
    strategies[customFlashcardsKey(target)] = (localRaw, cloudRaw) => {
      const stats: CustomCardsMergeStats = { localOnly: 0, cloudOnly: 0, both: 0, localWon: 0, droppedDeleted: 0 };
      const merged = mergeCustomCardsRestoreValue(localRaw, cloudRaw, deleted, stats);
      console.log('[RESTORE-MERGE]', JSON.stringify({ key: customFlashcardsKey(target), cards: stats, journalDeleted: deleted.size }));
      return merged;
    };
  }
  for (const target of SYNC_STUDY_TARGETS) {
    strategies[flashcardsSwipeMemoryKey(target)] = mergeSwipeMemoryRestoreValue;
  }
  return strategies;
}

/**
 * Пп.13–14 (координатор 11.10): заморозки и бонус входа — тратимые значения, правило не меняем (облако),
 * максимум здесь означал бы подарок. Только лог: локальное, облачное (с их датами внутри), кто победил.
 * Значения маленькие и без личных данных ({active, date} / состояние бонуса), печатаем как есть (≤200 знаков).
 */
const SPENDABLE_RESTORE_LOG_KEYS: ReadonlySet<string> = new Set(['streak_freeze', 'login_bonus_v1']);
function logSpendableRestore(key: string, localValue: string | null | undefined, cloudValue: unknown, skippedByPhoneState: boolean): void {
  const tag = key === 'streak_freeze' ? '[FREEZE-RESTORE]' : '[LOGIN-BONUS-RESTORE]';
  const cloud = cloudValue === null || cloudValue === undefined ? null : String(cloudValue);
  const winner = skippedByPhoneState ? 'phone_state' : cloud === null ? 'local_kept_no_cloud' : cloud === localValue ? 'same' : 'cloud';
  console.log(tag, JSON.stringify({
    local: localValue == null ? null : localValue.slice(0, 200),
    cloud: cloud === null ? null : cloud.slice(0, 200),
    winner,
  }));
}

/** Ключи итоговой записи восстановления, которые сами сливаются с локальным — защита «последняя запись» их не трогает. */
const BOOT_DIRTY_GUARD_MERGED_KEYS: ReadonlySet<string> = new Set([
  'achievements_v1', 'flashcards_v1', flashcardsSavedKey('fr'),
  'streak_count', 'last_active_date', 'streak_last_date',
]);

function mergeLessonRestoreValue(
  key: string,
  cloudValue: string,
  localValue: string | null | undefined,
): string {
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

async function buildTargetScopedStickyRestorePairs(cloudData: Record<string, unknown>): Promise<[string, string][]> {
  const restorableKeys = [
    ...SYNC_STUDY_TARGETS.map(languageProfileKey),
    ...NON_ENGLISH_TARGET_SYNC_KEYS,
  ];
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
    ...SYNC_STUDY_TARGETS.flatMap((target) => [
      fiftyFiftyUsageKey(todayKey, target),
      lessonBonusHintsKey(todayKey, target),
    ]),
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

// зачем (координатор §67/§70): модульный геттер вместо .default() — тот же экземпляр,
// но без предупреждения «use getApp()» на КАЖДЫЙ вызов. Гистограмма dev-старта:
// отсюда шло 110 из 204 устаревших вызовов за минуту (getAuth из
// isAccountDeleteIdentityQuarantined — 56, ensureAnonUser — 22, ensureAnonIdentityDetailed — 22).
const getAuth = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return rnfbInstance<any>(require('@react-native-firebase/auth'), 'getAuth');
  } catch (error) {
    noteSwallowed('cloud_sync:get_auth', error);
    return null;
  }
};

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return rnfbInstance<any>(require('@react-native-firebase/firestore'), 'getFirestore');
  } catch (error) {
    noteSwallowed('cloud_sync:get_firestore', error);
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
// первые разрешённые Firestore операции могут падать с PERMISSION_DENIED до готовности auth.
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
  const stableId = String(await getCanonicalUserId().catch((error: unknown) => { reportSwallowed('cloud_sync:ensureAnonIdentityDetailed', error); return ''; }) || '').trim();
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
export function warmAuthSignInCallables(source = 'unknown'): void {
  // зачем ([ACC-SPEED], координатор 14.10, прогон №3): холодные старты authStampAnonOwnership 8,4 с и authMergeStableAccounts
  // 7,6 с — видно, был ли прогрев и когда: каждый исход пишет строку (источник, пропуск, ответ и время).
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    console.log(`[ACC-SPEED] warm skip source=${source} reason=${IS_EXPO_GO ? 'expo_go' : 'cloud_sync_disabled'}`); // guard-ok: ранний выход
    return;
  }
  const nowMs = Date.now();
  if (nowMs - lastAuthWarmupAtMs < AUTH_WARMUP_THROTTLE_MS) {
    console.log(`[ACC-SPEED] warm skip source=${source} reason=throttled sinceLastMs=${nowMs - lastAuthWarmupAtMs}`); // guard-ok: ранний выход
    return;
  }
  lastAuthWarmupAtMs = nowMs;
  console.log(`[ACC-SPEED] warm start source=${source}`); // guard-ok: старт прогрева
  const names = ['authEnsureStableLink', 'authStampAnonOwnership', 'authMergeStableAccounts'];
  // зачем (координатор 14.10, прогон №5 + лог Cloud Run): через callable() прогревы вставали в ОДНОПОТОЧНУЮ очередь RNFirebase
  // (firebase.json android_task_executor_maximum_pool_size: 0 — инвариант утечки потоков, не трогаем) и приходили на сервер
  // по одному: 13,3 / 22,4 / 32,4 с, а реальные вызовы входа ждали за ними. Обычный fetch идёт мимо очереди — параллельно.
  // Итог каждого — строка [WARM-FETCH]; функция никогда не бросает.
  for (const name of names) {
    void warmCallableViaFetch(name, source).catch(swallowError('cloud_sync:warmAuthSignInCallables'));
  }
}

// ── Прогрев accountDeleteEnqueue с экрана удаления ─────────────────────────────
let lastAccountDeleteWarmupAtMs = 0;
const ACCOUNT_DELETE_WARMUP_THROTTLE_MS = 10 * 60_000;

/**
 * зачем (координатор 14.10, удаление гостя №3): ack постановки удаления занял 17,2 с, из них ≈9,5 с — холодный старт функции.
 * Человек проводит в окне удаления больше минуты (вводит слово) — за это время инстанс уже поднят.
 * Безопасность: тело вызова — ТОЛЬКО { warm: true }, без ключа удаления. Новый сервер (выкладка 17.10) отвечает { warm: true }
 * до любой работы с данными; старый (прод с 01.10) отказывает account_delete_credential_pending до любых чтений и записей —
 * удаление поставить нельзя ни там, ни там. Троттл 10 мин, сбой прогрева ни на что не влияет. Лог [ACCOUNT-DELETE-WARM].
 */
export function warmAccountDeleteEnqueue(source: string): void {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    console.log(`[ACCOUNT-DELETE-WARM] skip source=${source} reason=${IS_EXPO_GO ? 'expo_go' : 'cloud_sync_disabled'}`); // guard-ok: ранний выход
    return;
  }
  const nowMs = Date.now();
  if (nowMs - lastAccountDeleteWarmupAtMs < ACCOUNT_DELETE_WARMUP_THROTTLE_MS) {
    console.log(`[ACCOUNT-DELETE-WARM] skip source=${source} reason=throttled sinceLastMs=${nowMs - lastAccountDeleteWarmupAtMs}`); // guard-ok: ранний выход
    return;
  }
  lastAccountDeleteWarmupAtMs = nowMs;
  try {
    const fn = callable<{ warm: true }, { ok?: boolean; warm?: boolean }>('accountDeleteEnqueue', { timeout: 20_000 });
    void fn({ warm: true }).then(
      (res) => console.log(`[ACCOUNT-DELETE-WARM] ok source=${source} warm=${String(res?.data?.warm === true)} ms=${Date.now() - nowMs}`), // guard-ok: итог прогрева
      (error: unknown) => {
        // Старый сервер отвечает permission-denied (account_delete_credential_pending) — это тоже прогрев, не сбой.
        const code = (error as { code?: unknown } | null)?.code;
        console.log(`[ACCOUNT-DELETE-WARM] answered source=${source} code=${typeof code === 'string' ? code : 'none'} ms=${Date.now() - nowMs} reason=${(error instanceof Error ? error.message : String(error)).slice(0, 80)}`); // guard-ok: ответ старого сервера/сеть
      },
    );
  } catch (e) {
    console.warn(`[ACCOUNT-DELETE-WARM] failed source=${source} reason=${e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80)}`); // guard-ok: сбой пишет причину
  }
}

// ── Память подтверждённого сервером ответа ensure_link (координатор 14.10, прогон №4) ───────────────────────────────────
// зачем: перед каждой облачной записью ensureCloudMutationIdentity / ensureAuthoritativeIdentityForCloudMutation зовут
// requireAuthoritative — мимо кэша, сетевым вызовом (3,3–3,6 с на тёплом сервере): 2 на холодном старте, 2–4 при входе.
// Свежий ответ сервера для того же stableId:authUid в ТОМ ЖЕ поколении аккаунта — уже авторитетный: переиспользуем 10 минут.
// Защита «не писать в чужой аккаунт» (инцидент 2026-08-25) остаётся: любая смена личности меняет поколение и сбрасывает
// память; repair после ошибки личности — тоже. Только память процесса, на диск не пишем.
const AUTHORITATIVE_LINK_MEMO_TTL_MS = 10 * 60_000;
let authoritativeLinkMemo: Readonly<{ key: string; generation: number; atMs: number; result: StableAuthLinkEnsureResult }> | null = null;

/** Для тестов и repair: забыть подтверждённый ответ. */
export function forgetAuthoritativeStableAuthLinkMemo(reason: string): void {
  if (authoritativeLinkMemo) console.log(`[ENSURE-LINK] authoritative_memo_cleared reason=${reason}`); // guard-ok: сброс памяти виден
  authoritativeLinkMemo = null;
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
  const cacheHit = await readStableAuthLinkCache(key);
  // зачем (владелец 2026-09-02): в проде видно 105 и 93 вызова authEnsureStableLink
  // за сутки с ОДНОГО устройства, пиками по 6–11 в минуту, все с кодом 200 —
  // то есть клиент ходит в сеть, хотя сервер отвечает нормально. Кэш живёт
  // 7 дней, значит эти вызовы идут МИМО него: единственные два пути —
  // requireAuthoritative и свежие метаданные. Прежде чем ослаблять
  // requireAuthoritative (он защищает от записи в ЧУЖОЙ аккаунт — инцидент
  // подмены stable_id 2026-08-25), нужны факты: кто именно зовёт и почему.
  // Лог печатает САМО значение, решившее ветку, и стек вызывающего.
  // Убрать после починки; строки в catch ниже остаются навсегда.
  // зачем: в тестовой среде глобальной __DEV__ нет, и голая ссылка роняла два
  // контрактных теста синхронизации с ReferenceError. Тот же приём защиты
  // уже применён выше в этом файле. Поведение в приложении не меняется.
  // зачем (владелец 2026-09-22, «всё тормозит И В ДЕВЕ»): здесь стояло
  // `__DEV__ ||`, из-за чего сбор стека и склейка JSON шли в дев-сборке на
  // КАЖДЫЙ вызов. Теперь трассировка только по явному флагу.
  if (AUTH_LOOP_TRACE_ENABLED) {
    _authLinkCallNo += 1;
    const willCallNetwork = options.requireAuthoritative === true || hasFreshMetadata || !cacheHit;
    const caller = new Error().stack?.split('\n').slice(2, 5).join(' <- ').replace(/\s+/g, ' ') ?? 'unknown';
    console.log('[AUTH-LOOP] ensureStableAuthLink', JSON.stringify({
      // Порядковый номер и минуты с запуска: лавину видно сразу по номеру,
      // без выуживания отдельных строк из лога.
      callNo: _authLinkCallNo,
      minSinceStart: Math.round((Date.now() - _authLinkFirstCallAtMs) / 6000) / 10,
      stableId: stableId.slice(0, 8),
      authUid: authUid.slice(0, 8),
      requireAuthoritative: options.requireAuthoritative === true,
      hasFreshMetadata,
      metadataKeys: hasFreshMetadata ? Object.keys(metadata as object) : [],
      cacheHit,
      willUseCache: !options.requireAuthoritative && !hasFreshMetadata && cacheHit,
      willCallNetwork,
      // Почему пошли в сеть, если пошли: сразу видно, какая ветка решила.
      networkReason: !willCallNetwork
        ? 'none'
        : options.requireAuthoritative === true
          ? 'requireAuthoritative'
          : hasFreshMetadata
            ? 'freshMetadata'
            : 'cacheMiss',
      inFlight: stableAuthLinkPromise != null,
      // зачем ([ACC-SPEED] (в), координатор 14.10: ≈35 вызовов за 5 минут): поколение аккаунта — видно, рвёт ли кэш смена поколения.
      accountGeneration: (() => { const g = captureAccountGeneration(); return `${g.generation}:${g.phase}`; })(),
      caller,
    }));
  }
  if (!options.requireAuthoritative && !hasFreshMetadata && cacheHit) {
    return { ok: true, requestedStableId: stableId, stableUid: stableId, authUid, source: 'cache' };
  }
  // зачем (AA S2b, пункт 9, M-1): nonce метки анонимного аккаунта предъявляется
  // серверу, только если он выдан этому же stableId; живёт в памяти процесса.
  const nonceField = anonMergeNonceField('ensure_link', [stableId]);
  const memoGeneration = captureAccountGeneration().generation;
  if (options.requireAuthoritative === true && !hasFreshMetadata && nonceField.anonMergeNonce === undefined) {
    const memo = authoritativeLinkMemo;
    const ageMs = memo ? Date.now() - memo.atMs : -1;
    if (memo && memo.key === key && memo.generation === memoGeneration && ageMs >= 0 && ageMs < AUTHORITATIVE_LINK_MEMO_TTL_MS) {
      console.log(`[ENSURE-LINK] authoritative_memo hit ageMs=${ageMs} generation=${memoGeneration}`); // guard-ok: ответ без сети
      return memo.result;
    }
    console.log(`[ENSURE-LINK] authoritative_memo miss reason=${!memo ? 'empty' : memo.key !== key ? 'other_identity' : memo.generation !== memoGeneration ? 'generation_changed' : 'expired'}`); // guard-ok: почему в сеть
  }
  const promiseKey = [
    key,
    hasFreshMetadata ? 'metadata' : '',
    options.requireAuthoritative ? 'authoritative' : '',
    nonceField.anonMergeNonce !== undefined ? 'nonce' : '',
  ]
    .filter(Boolean)
    .join(':');
  if (stableAuthLinkPromise && stableAuthLinkKey === promiseKey) return stableAuthLinkPromise;

  stableAuthLinkKey = promiseKey;
  stableAuthLinkPromise = (async () => {
    try {
      const fn = callable<
        { stableId: string; linkMetadata?: StableAuthLinkMetadata; anonMergeNonce?: string },
        { ok: boolean; stableUid: string; authUid: string; identityReady: boolean }
      >('authEnsureStableLink');
      const payload = { stableId, ...(hasFreshMetadata ? { linkMetadata: metadata } : {}), ...nonceField };
      const res = await withTimeout(
        invokeAuthCallable('authEnsureStableLink', payload, () => fn(payload), { timeoutMs: STABLE_AUTH_LINK_TIMEOUT_MS }),
        STABLE_AUTH_LINK_TIMEOUT_MS,
        'auth_link_callable',
      );
      const actualStableUid = String(res?.data?.stableUid ?? '').trim();
      const actualAuthUid = String(res?.data?.authUid ?? authUid).trim() || authUid;
      const ok = res?.data?.ok === true && res.data.identityReady === true && actualStableUid.length > 0;
      if (ok) writeStableAuthLinkCache(`${actualStableUid}:${actualAuthUid}`).catch(swallowError('cloud_sync:ensureStableAuthLinkForStableIdDetailed'));
      const result: StableAuthLinkEnsureResult = {
        ok,
        requestedStableId: stableId,
        stableUid: ok ? actualStableUid : null,
        authUid: actualAuthUid,
        source: 'callable',
        ...(ok ? {} : { failure: 'identity_unavailable' as const }),
      };
      // зачем (прогон №4): ответ сервера подтверждён — помним для того же ключа и поколения (только если поколение не сменилось за запрос).
      if (ok && actualStableUid === stableId && actualAuthUid === authUid && captureAccountGeneration().generation === memoGeneration) {
        authoritativeLinkMemo = { key, generation: memoGeneration, atMs: Date.now(), result };
      }
      return result;
    } catch (error) {
      if (__DEV__) console.warn('[cloud_sync] authEnsureStableLink callable failed', error);
      const failure = classifyCloudAccessFailure(error);
      const nonceRejection = classifyAnonMergeNonceRejection('ensure_link', [stableId], failure);
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
        ...(nonceRejection ? { nonceRejection } : {}),
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
  await removeStoredItem(STABLE_AUTH_LINK_CACHE_KEY).catch(swallowError('cloud_sync:repairStableAuthLinkAfterIdentityFailure'));
  stableAuthLinkPromise = null;
  stableAuthLinkKey = '';
  forgetAuthoritativeStableAuthLinkMemo('repair_after_identity_failure');
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
    const fn = callable<
      { stableIdA: string; stableIdB: string; anonMergeNonce?: string },
      MergeStableAccountsResult
    >('authMergeStableAccounts');
    // зачем (AA S2b, пункт 9, M-1): nonce метки анонимного аккаунта — если он
    // выдан одной из сторон слияния; после успешного слияния он больше не нужен.
    const payload = { stableIdA: a, stableIdB: b, ...anonMergeNonceField('merge', [a, b]) };
    const res = await withTimeout(
      invokeAuthCallable('authMergeStableAccounts', payload, () => fn(payload), { timeoutMs: STABLE_AUTH_LINK_TIMEOUT_MS }),
      STABLE_AUTH_LINK_TIMEOUT_MS,
      'auth_merge_callable',
    );
    if (res?.data?.ok === true) forgetAnonMergeNonce([a, b], 'merged');
    return res?.data ?? null;
  } catch (e) {
    if (__DEV__) console.warn('[cloud_sync] mergeStableAccountsViaServer failed', e);
    // зачем (AA S2c, L-S2b-4): слияние, отклонённое из-за потерянного nonce,
    // различимо в логе (контракт возврата null не меняем — вызывающий и так
    // перечитывает якорь авторитетно и не делает разрушительный свап вслепую).
    classifyAnonMergeNonceRejection('merge', [a, b], classifyCloudAccessFailure(e));
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
  removeStoredItem(STABLE_AUTH_LINK_CACHE_KEY).catch(swallowError('cloud_sync:resetAnonAuthCacheForSignOut'));
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
  // зачем (AA S2c, [PROFILE-FLIP]): сервер назвал другой канонический профиль —
  // здесь локальные данные стираются и stable_id переключается. Если на
  // следующем старте stable_id снова старый, этот переход повторится, и профиль
  // будет «прыгать» между двумя на каждом перезапуске.
  if (!isCurrentAccountGeneration(sourceGeneration, localStableId)) {
    identityTrace('[PROFILE-FLIP]', 'adopt skipped', { reason: 'stale_generation_before_lock', from: identityTag(localStableId) });
    return false;
  }
  identityTrace('[PROFILE-FLIP]', 'adopt start', { from: identityTag(localStableId), to: identityTag(authoritativeStableId) }, { persist: true });

  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(sourceGeneration, localStableId)) {
      identityTrace('[PROFILE-FLIP]', 'adopt skipped', { reason: 'stale_generation_in_lock', from: identityTag(localStableId) });
      return false;
    }
    await wipeLocalAccountDataUnsafe();
    if (!isCurrentAccountGeneration(sourceGeneration, localStableId)) {
      identityTrace('[PROFILE-FLIP]', 'adopt skipped', { reason: 'stale_generation_after_wipe', from: identityTag(localStableId) });
      return false;
    }
    await setStableId(authoritativeStableId);
    beginAccountGeneration(authoritativeStableId);
    identityTrace('[PROFILE-FLIP]', 'adopt done', { to: identityTag(authoritativeStableId) });
    stableAuthLinkPromise = null;
    stableAuthLinkKey = '';
    await removeStoredItem(STABLE_AUTH_LINK_CACHE_KEY).catch(swallowError('cloud_sync:adoptAuthoritativeStableIdentity'));
    invalidatePremiumCache();
    return true;
  });
}

export type AuthoritativeCloudIdentityResult = {
  ok: boolean;
  stableUid: string | null;
  adopted: boolean;
  /** AA S2d 🔴2: сервер назвал ДРУГОЙ канонический профиль (adopt мог не выполняться). */
  mismatch?: boolean;
};

export type AuthoritativeCloudIdentityOptions = Readonly<{
  /**
   * false — при расхождении с сервером НЕ стирать локальное и НЕ переключать
   * stable_id (presync входа: там adopt + полное восстановление чужого профиля
   * внутри 20-секундного окна и были причиной H7-1). По умолчанию true.
   */
  adoptOnMismatch?: boolean;
}>;

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
  // account_delete_pending намеренно падает сюда, в 'pending' (владелец,
  // 2026-09-01): grace ещё идёт, и слать identity_retired нельзя — фоновая
  // запись снесла бы живую личность, которую человек ещё может вернуть.
  // Запись просто не проходит, данные на сервере целы, а модал восстановления
  // покажет вход.
  return { status: 'pending' };
}

/**
 * Mandatory precondition for client-initiated cloud mutation. This deliberately
 * bypasses the seven-day local auth-link cache: only the server can establish
 * which stable account the current Firebase credential owns.
 */
export async function ensureAuthoritativeIdentityForCloudMutation(
  stableIdRaw: string,
  options: AuthoritativeCloudIdentityOptions = {},
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

  identityTrace('[PROFILE-FLIP]', 'authoritative mismatch', {
    local: identityTag(localStableId),
    server: identityTag(stableLink.stableUid),
    authUid: identityTag(stableLink.authUid),
    source: stableLink.source,
    adopt: options.adoptOnMismatch !== false,
  }, { persist: true });
  if (options.adoptOnMismatch === false) {
    // зачем (AA S2d 🔴2, H7-1/H7-2): presync входа не имеет права стирать
    // локальный прогресс и тянуть чужой профиль — он только выгружает или
    // честно отказывает; переключение делает сам вход после presync.
    return { ok: false, stableUid: stableLink.stableUid, adopted: false, mismatch: true };
  }
  const adopted = await adoptAuthoritativeStableIdentity(localStableId, stableLink.stableUid);
  if (adopted) {
    // Hydrate the canonical account only after the source-account wipe and id swap.
    await restoreAndMigrateFromCloudResult(false).catch((restoreError: unknown) => {
      // зачем (S2c): прежде немой — после смены профиля не подтянулись его данные.
      identityTrace('[PROFILE-FLIP]', 'adopt restore_failed', { code: identityErrorCode(restoreError) }, { persist: true });
      return failedCloudRestoreAttempt('transport_unavailable');
    });
  }
  // The operation which discovered the mismatch must never continue with its
  // source-generation payload. A later operation will capture the new generation.
  return { ok: false, stableUid: stableLink.stableUid, adopted, mismatch: true };
}

// ── Синхронизировать прогресс в облако ───────────────────────────────────────
// Вызывать после важных событий: завершение урока, изменение legacy reward, streak и т.д.
export function markCloudSyncPending(): void {
  pendingSync = true;
}

export async function syncToCloud(options?: { forceNow?: boolean; deferMs?: number }): Promise<void> {
  pendingSync = true;
  // зачем (AA S2d раунд 2, H-S2d-1): НЕ ждать идущую синхронизацию даже при
  // forceNow. Покупка в «Управлении подпиской» зовёт syncToCloud({forceNow}) под
  // withAccountTransitionLock (commitRevenueCatResultForGeneration →
  // persistStorePremiumLocally), а идущий doSyncToCloud в adopt ждёт тот же
  // замок — ожидание здесь давало взаимную блокировку. pendingSync=true выше
  // гарантирует повтор после идущего такта; presync входа ждёт через
  // forceSyncToCloud с потолком FORCE_SYNC_WAIT_INFLIGHT_MS.
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
      runSyncNow().catch(swallowError('cloud_sync:syncToCloud'));
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
    runSyncNow().catch(swallowError('cloud_sync:syncToCloud'));
  }, waitMs);
}

// зачем (пункт (а), ревью Opus): пока отложенное восстановление ЖДЁТ старта, отправка не уходит — иначе локальная
// версия целиком заменила бы облачную (например, урок, пройденный на другом устройстве) ещё до чтения облака.
// Запрос отправки сам запускает восстановление; отложенная отправка догоняет, когда оно закончилось.
let deferredRestoreSettleSub: (() => void) | null = null;
function holdSyncForDeferredBootRestore(): boolean {
  if (!isDeferredBootRestoreWaiting()) return false;
  pendingSync = true;
  console.log('[BOOT-RESTORE-DEFER]', JSON.stringify({ event: 'sync_held', reason: 'restore_not_started' }));
  if (!deferredRestoreSettleSub) {
    deferredRestoreSettleSub = onDeferredBootRestoreSettled(() => {
      deferredRestoreSettleSub?.();
      deferredRestoreSettleSub = null;
      console.log('[BOOT-RESTORE-DEFER]', JSON.stringify({ event: 'sync_resume', pendingSync }));
      if (!pendingSync) return;
      runSyncNow().catch(swallowError('cloud_sync:deferred_restore_resume'));
    });
  }
  requestDeferredBootRestoreStart('sync_requested');
  return true;
}

async function runSyncNow(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  if (holdSyncForDeferredBootRestore()) return;
  syncInFlight = doSyncToCloud()
    // зачем (ревью 2cdc42fac п.4, «немой catch»): в релизе провал синхронизации не писал ни строки — причина идёт в журнал всегда.
    .catch(swallowError('cloud_sync:runSyncNow.doSyncToCloud'))
    .finally(() => {
      syncInFlight = null;
      if (pendingSync) {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setCloudSyncTimer(() => {
          syncTimer = null;
          runSyncNow().catch(swallowError('cloud_sync:runSyncNow'));
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

async function buildGiftEntitlementStickyPairs(cloudData: Record<string, string | null>): Promise<{
  pairs: [string, string][];
  removeKeys: string[];
}> {
  void cloudData;
  return { pairs: [], removeKeys: ['chain_shield', 'club_gift_free_boost_v1'] };
}

/**
 * Отказ Firestore из-за переполнения документа (жёсткий лимит 1 МБ).
 * зачем: этот отказ роняет ВЕСЬ set целиком — вместе с legacy reward, стриком и уроками,
 * а не только «лишнее» поле. Его нельзя терять в общем catch: 2026-09-01 он
 * молча стоил трём самым активным аккаунтам месяцев прогресса.
 */
function isDocumentTooLargeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /exceeds the maximum allowed size|INVALID_ARGUMENT/i.test(message);
}

/**
 * Записать корневые поля users/{uid} и точечно обновить вложенную карту progress.
 *
 * зачем (владелец 2026-09-02, разбор боевых логов [SYNC-DENY]):
 * `set({ merge: true })` мержит ТОЛЬКО верхний уровень — вложенная карта
 * `progress` заменяется целиком. Для Firestore Rules это значит, что каждый
 * ключ, лежащий в облаке, но отсутствующий в патче, попадает в `removedKeys()`,
 * а `affectedKeys()` = addedKeys ∪ removedKeys ∪ changedKeys. Так запрещённые
 * ключи (`chain_shield`, `club_gift_free_boost_v1`,
 * `user_total_xp`, `streak_count`…) считались «затронутыми» просто потому, что
 * клиент их не прислал, и правила рубили ВЕСЬ set — вместе с legacy reward и аватаром.
 * В логах отказа `blockedKeys: []`: виноваты были не отправленные ключи, а
 * ПОТЕРЯННЫЕ.
 *
 * Здесь progress обновляется по dot-notation: правило видит только реально
 * меняемые ключи, остальные остаются в документе нетронутыми.
 *
 * Возвращает true, если запись прошла. Бросает исходную ошибку наружу —
 * разбор и логирование причины остаются на вызывающем.
 */
/** Минимальная форма ссылки на документ, которой достаточно записи и диагностике. */
type FirebaseDocRefLike = {
  set: (data: unknown, options?: unknown) => Promise<unknown>;
  update: (data: unknown) => Promise<unknown>;
  // зачем: диагностика отказа обязана перечитывать документ С СЕРВЕРА —
  // локальное разрешение промиса записи ничего не доказывает (офлайн-кэш).
  get: (options?: { source?: 'server' | 'cache' | 'default' }) => Promise<{
    data: () => Record<string, unknown> | undefined;
    // hasPendingWrites — единственный честный признак, что снимок содержит
    // ещё не принятую сервером запись (Firestore подмешивает её в любое чтение).
    metadata?: { hasPendingWrites?: boolean };
  }>;
};

async function writeUserDocWithNestedProgress(
  docRef: { set: (data: unknown, options?: unknown) => Promise<unknown>; update: (data: unknown) => Promise<unknown> },
  rootPatch: Readonly<Record<string, unknown>>,
  progressPatch: Readonly<Record<string, string | null>>,
): Promise<boolean> {
  const progressKeys = Object.keys(progressPatch);
  const hasRoot = Object.keys(rootPatch).length > 0;
  if (progressKeys.length === 0) {
    if (!hasRoot) return false;
    // Корневых полей мало и они всегда «свои» — обычный merge тут безопасен:
    // вложенных карт в rootPatch нет, затирать нечего.
    await docRef.set({ ...rootPatch }, { merge: true });
    return true;
  }

  // FieldPath принимает сегмент КАК ЕСТЬ. Строковый путь 'progress.<key>' здесь
  // ненадёжен: имена ключей содержат `::` (`language_profile_v1::en`,
  // `target_stats_v2::fr::pos_mastery_v1`), и парсер пути может их не принять.
  // Проверено по боевой базе: точек внутри имён ключей нет ни одного.
  let FieldPathCtor: (new (...segments: string[]) => unknown) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firestoreModule = require('@react-native-firebase/firestore');
    const firestoreFn = firestoreModule.default ?? firestoreModule;
    FieldPathCtor = firestoreFn?.FieldPath ?? firestoreModule?.FieldPath ?? null;
  } catch (error) {
    // зачем: немой catch уже прятал эту аварию месяцами — причина пишется всегда.
    DebugLogger.warn('cloud_sync:fieldPath', `FieldPath unavailable, falling back to string paths: ${String(error)}`);
  }

  const updatePayload: unknown[] = [];
  const stringPayload: Record<string, unknown> = {};
  for (const key of progressKeys) {
    const value = progressPatch[key];
    if (FieldPathCtor) updatePayload.push(new FieldPathCtor('progress', key), value);
    else stringPayload[`progress.${key}`] = value;
  }
  for (const [key, value] of Object.entries(rootPatch)) {
    if (FieldPathCtor) updatePayload.push(new FieldPathCtor(key), value);
    else stringPayload[key] = value;
  }

  const updateFn = docRef.update as unknown as (...args: unknown[]) => Promise<unknown>;
  if (FieldPathCtor) await updateFn.apply(docRef, updatePayload);
  else await updateFn.call(docRef, stringPayload);
  return true;
}

/**
 * Разобрать отказ users/{uid} по КАЖДОМУ условию правила update.
 *
 * зачем (владелец 2026-09-03): прошлые два круга чинили СОСТАВ патча, а лог
 * печатал только его. Но `blockedKeys: []` при каждом отказе значит, что
 * состав чист, и режет одно из ПЯТИ остальных условий:
 *   userDocOwnerMatchesAuth · authLinkMapsToUser · accountDeletionNotPending
 *   · hasNoServerIdentityWrites · hasNoShardWrites
 * Ни одно из них по составу progress не видно, поэтому дальше без этих фактов
 * диагноз был бы гаданием — а гадать здесь уже дважды стоило круга работы.
 *
 * Читает ровно те документы, которые читает правило (4 чтения, только в момент
 * отказа и не чаще раза в 5 минут — стоимость Firestore пренебрежима).
 * Личных данных не печатает: только наличие/совпадение.
 */
let lastDenyProbeAt = 0;
const DENY_PROBE_THROTTLE_MS = 5 * 60 * 1000;
async function probePermissionDenyReason(stableId: string, authUid: string | null): Promise<void> {
  const now = Date.now();
  if (now - lastDenyProbeAt < DENY_PROBE_THROTTLE_MS) return;
  lastDenyProbeAt = now;
  const db = getFirestore();
  if (!db) {
    console.warn('[SYNC-DENY-PROBE] firestore недоступен — проба пропущена', { stableId, authUid });
    return;
  }
  if (!authUid) {
    console.warn('[SYNC-DENY-PROBE] authUid пуст — правило отклонит по request.auth == null', { stableId });
    return;
  }
  const probe: Record<string, unknown> = { stableId, authUid };
  // 1. auth_links/{authUid}.stable_id == userId  → authLinkMapsToUser
  try {
    const link = await db.collection('auth_links').doc(authUid).get();
    probe.authLinkExists = link.exists;
    const linked = String(link.data()?.stable_id ?? '');
    probe.authLinkStableId = linked;
    probe.authLinkMapsToUser = link.exists && linked === stableId;
  } catch (e) {
    // зачем: немой catch уже прятал эту аварию месяцами — причина пишется всегда.
    // Отказ ЗДЕСЬ — сам по себе улика: правило auth_links пускает владельца только
    // при ОТСУТСТВИИ маркера удаления, поэтому permission-denied на чтении своей
    // же ссылки почти наверняка означает висящий account_deletion_auth_marker.
    probe.authLinkReadError = e instanceof Error ? e.message : String(e);
    probe.authLinkReadDeniedHint = String(e).includes('permission-denied')
      ? 'отказ на своей auth_links → вероятен маркер удаления по authUid'
      : '';
  }
  // 2. маркер удаления по authUid → accountDeletionNotPending / authLinkMapsToUser
  try {
    const marker = await db.collection('account_deletion_auth_markers').doc(authUid).get();
    probe.deletionAuthMarkerExists = marker.exists;
    if (marker.exists) probe.deletionAuthMarkerStatus = String(marker.data()?.status ?? '');
  } catch (e) {
    probe.deletionAuthMarkerReadError = e instanceof Error ? e.message : String(e);
  }
  // 3. надгробие по stableId → accountDeletionNotPending.
  // ВНИМАНИЕ ПРИ ЧТЕНИИ ЛОГА: account_deletion_tombstones закрыт правилом
  // `allow read: if false` — эта проба ВСЕГДА вернёт permission-denied, и это
  // НЕ улика. Существование надгробия отсюда не проверить в принципе, только
  // через серверный вызов. Строка оставлена, чтобы следующий читатель лога не
  // потратил круг на «а вдруг надгробие» — здесь ответ недоступен по дизайну.
  probe.deletionTombstoneCheck = 'недоступно клиенту (rules: read=false), смотреть на сервере';
  // 4. сам документ: firebaseAuthUid (server-owned) и наличие shard-полей
  try {
    const doc = await db.collection('users').doc(stableId).get();
    probe.userDocExists = doc.exists;
    const d = (doc.data() ?? {}) as Record<string, unknown>;
    probe.docFirebaseAuthUid = String(d.firebaseAuthUid ?? '');
    probe.docOwnerMatchesAuth = String(d.firebaseAuthUid ?? '') === authUid;
    probe.docHasShardFields = ['shards', 'stars', 'v2_access_stars', 'practice_runes_daily']
      .filter((k) => Object.prototype.hasOwnProperty.call(d, k));
    probe.docProgressServerAuthoritative = d.progressServerAuthoritative === true;
  } catch (e) {
    probe.userDocReadError = e instanceof Error ? e.message : String(e);
  }
  console.warn('[SYNC-DENY-PROBE] какое условие правила упало', probe);
}

/**
 * Найти ПОЛЕ-виновника отказа делением пополам.
 *
 * зачем (владелец 2026-09-03): проба выше отвечает «личность в порядке», и на
 * этом два прошлых круга упирались в тупик — какое из полей патча роняет запись,
 * из отказа не видно вообще: правило рубит ВЕСЬ update разом, без имени поля.
 * Здесь патч режется пополам и половинки пробуются отдельно; за log2(N) попыток
 * (для 800 ключей — 10) остаётся ровно то поле, на котором правило падает.
 *
 * Пробы пишут РЕАЛЬНЫЕ значения того же патча, который клиент и так пытался
 * записать, — ничего лишнего в облако не попадает: успешная половина это ровно
 * та запись, которая и должна была пройти.
 *
 * Стоимость: не чаще раза в 30 минут и только ПОСЛЕ отказа; максимум ~20 записей
 * вместо одной. Дороже обычной синхронизации, но дешевле ещё одного круга
 * диагностики вслепую, и включается только когда прогресс УЖЕ не сохраняется.
 */
let lastBisectAt = 0;
const DENY_BISECT_THROTTLE_MS = 30 * 60 * 1000;
async function bisectDenyingField(
  docRef: FirebaseDocRefLike,
  rootPatch: Readonly<Record<string, unknown>>,
  progressPatch: Readonly<Record<string, string | null>>,
): Promise<void> {
  const now = Date.now();
  if (now - lastBisectAt < DENY_BISECT_THROTTLE_MS) return;
  lastBisectAt = now;

  // Единый плоский патч в той же форме, в какой его видит правило.
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(progressPatch)) flat['progress.' + k] = v;
  for (const [k, v] of Object.entries(rootPatch)) flat[k] = v;
  const allKeys = Object.keys(flat);
  if (allKeys.length === 0) {
    console.warn('[SYNC-DENY-BISECT] патч пуст — отказ НЕ из-за состава полей; смотри условия личности выше');
    return;
  }

  /**
   * ЛОВУШКА, стоившая первого прогона (03.09): Firestore на клиенте включает
   * офлайн-персистентность, и `await docRef.update(...)` разрешается СРАЗУ,
   * как только запись легла в локальную очередь, — ЗАДОЛГО до ответа сервера.
   * Отказ по правам прилетает потом, отдельным событием, и в промис НЕ попадает.
   * Первый прогон поиска поэтому видел «ok» на каждой половине и уверенно
   * назвал первый ключ списка (`user_frame`) — ложная находка: в облаке после
   * девяти «успешных» записей не появилось НИ ОДНОГО нового ключа, а логи
   * Firestore показали 36 серверных PERMISSION_DENIED.
   *
   * Поэтому успех подтверждается ЧТЕНИЕМ С СЕРВЕРА: пишем поле-маркер со
   * временем попытки и перечитываем документ мимо кэша. Совпало — запись
   * реально прошла; не совпало или отказ — половина виновата.
   */
  const tryKeys = async (keys: readonly string[]): Promise<string> => {
    const payload: Record<string, unknown> = {};
    for (const k of keys) {
      // Служебная контрольная проба: заведомо разрешённое поле, а не часть патча.
      if (k === '__harmless__') payload['last_active_at'] = Date.now();
      // Безобидный ключ ВНУТРИ progress: проверяет, проходит ли вложенная запись
      // как таковая. Имя служебное, ни в одном блок-листе правил его нет.
      else if (k === '__harmless_nested__') payload['progress.sync_probe_at_ms'] = String(Date.now());
      else payload[k] = flat[k];
    }
    try {
      await docRef.update(payload);
    } catch (e) {
      const code = (e as { code?: string } | null)?.code ?? '';
      if (String(code).includes('permission-denied')) return 'denied';
      return 'other:' + (code || (e instanceof Error ? e.message : String(e)));
    }
    /**
     * ВТОРАЯ ЛОВУШКА (прогон 08:01, тот же день): читать `get({source:'server'})`
     * НЕДОСТАТОЧНО. Firestore накладывает незакоммиченные локальные мутации на
     * любой результат чтения (latency compensation), поэтому только что
     * отклонённая запись всё равно подмешивается в снимок — сверка видит «своё»
     * значение и снова засчитывает ложный успех. Прогон это и показал: 11
     * серверных PERMISSION_DENIED, 10 шагов поиска и НИ ОДНОГО `unverified`,
     * при том что в облаке как было 5 ключей, так и осталось.
     *
     * Признак висящей записи — `metadata.hasPendingWrites`. Пока он true, снимок
     * содержит непринятые данные и доверять ему нельзя. Ждём, пока очередь
     * опустеет; если не опустела — запись отклонена (её выбросят), считаем
     * половину виноватой.
     */
    // Firestore умеет сам дождаться, пока очередь разгребётся сервером. Это
    // точнее опроса: промис разрешается ровно тогда, когда все висящие записи
    // приняты ИЛИ отклонены. Ошибку не глушим — она сама по себе улика.
    try {
      const db = getFirestore();
      const waitFn = (db as { waitForPendingWrites?: () => Promise<unknown> } | null)?.waitForPendingWrites;
      if (typeof waitFn === 'function') await waitFn.call(db);
    } catch (e) {
      // зачем: немой catch здесь вернул бы ложные «ok» прошлых прогонов.
      console.warn('[SYNC-DENY-BISECT] waitForPendingWrites не сработал', {
        reason: e instanceof Error ? e.message : String(e),
      });
    }
    const deadline = Date.now() + 8000;
    let lastPending = true;
    while (Date.now() < deadline) {
      try {
        const snap = await docRef.get({ source: 'server' });
        lastPending = snap?.metadata?.hasPendingWrites === true;
        if (lastPending) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        const data = (snap?.data?.() ?? {}) as Record<string, unknown>;
        const progress = (data.progress ?? {}) as Record<string, unknown>;
        // Сверяем ПОСЛЕДНИЙ ключ половины: он записывается позже прочих.
        const probeKey = keys[keys.length - 1];
        if (probeKey === '__harmless__' || probeKey === '__harmless_nested__') {
          // Для контрольной пробы достаточно самого факта: запись без отказа и
          // без висящей очереди означает, что документ клиенту в принципе открыт.
          return 'ok';
        }
        const expected = flat[probeKey];
        const actual = probeKey.startsWith('progress.')
          ? progress[probeKey.slice('progress.'.length)]
          : data[probeKey];
        return String(actual ?? '') === String(expected ?? '') ? 'ok' : 'denied';
      } catch (e) {
        // зачем: немой catch здесь вернул бы нас к ложным «ok» прошлых прогонов.
        const code = (e as { code?: string } | null)?.code ?? '';
        return 'unverified:' + (code || (e instanceof Error ? e.message : String(e)));
      }
    }
    // Очередь так и не опустела за отведённое время — запись сервером не принята.
    return lastPending ? 'denied' : 'unverified:timeout';
  };

  /**
   * КОНТРОЛЬ ОДНОГО БЕЗОБИДНОГО ПОЛЯ (добавлен 03.09 после трёх пустых прогонов).
   *
   * зачем: три поиска подряд назвали первый ключ списка, и каждый раз это была
   * ложь. Причина оказалась не в кэше, а в логике: если запись режет условие,
   * НЕ ЗАВИСЯЩЕЕ от состава патча, то отказывает ЛЮБАЯ половина — и деление
   * пополам всегда сходится к первому ключу, кто бы ни был виноват.
   *
   * Поэтому сначала пробуем записать одно заведомо безобидное поле
   * (`last_active_at` — обычная метка времени, её нет ни в одном блок-листе
   * правил). Отказ на НЁМ доказывает: состав патча ни при чём, режет условие
   * уровня документа, и делить дальше бессмысленно.
   */
  const harmlessProbe = await tryKeys(['__harmless__']);
  if (harmlessProbe === 'ok') {
    /**
     * ВТОРОЙ КОНТРОЛЬ (03.09): корневое поле прошло — значит документ клиенту
     * открыт и условия личности ни при чём. Но патч всё равно режется, и
     * деление пополам упорно сходится к первому ключу progress. Проверяем
     * отдельно, проходит ли ВЛОЖЕННОЕ поле как таковое: пишем безобидный ключ
     * внутрь progress. Отказ на нём означает, что режется сама запись в
     * progress (dot-notation), а не какое-то конкретное поле — и тогда деление
     * снова бессмысленно, сколько бы уверенно оно ни называло виновника.
     */
    const nestedProbe = await tryKeys(['__harmless_nested__']);
    if (nestedProbe === 'denied') {
      /**
       * ТРЕТИЙ КОНТРОЛЬ (03.09): корневое поле проходит, любое `progress.*` —
       * нет, при этом ни один блок-лист правил пробный ключ не содержит. Значит
       * подозрение смещается с ИМЕНИ поля на СПОСОБ записи: dot-notation update
       * и set(merge) формируют разные запросы, и правило может видеть их
       * по-разному. Пробуем то же самое поле через set(merge) — если пройдёт,
       * причина в форме записи, а не в данных, и чинить надо помощник
       * writeUserDocWithNestedProgress.
       */
      let mergeProbe = 'не выполнена';
      try {
        await docRef.set({ progress: { sync_probe_at_ms: String(Date.now()) } }, { merge: true });
        try {
          const db = getFirestore();
          const waitFn = (db as { waitForPendingWrites?: () => Promise<unknown> } | null)?.waitForPendingWrites;
          if (typeof waitFn === 'function') await waitFn.call(db);
          mergeProbe = 'ПРОШЛА';
        } catch (e) {
          mergeProbe = 'не подтверждена: ' + (e instanceof Error ? e.message : String(e));
        }
      } catch (e) {
        const code = (e as { code?: string } | null)?.code ?? '';
        mergeProbe = String(code).includes('permission-denied')
          ? 'ОТКАЗ (та же ошибка, форма записи ни при чём)'
          : 'ошибка: ' + (code || (e instanceof Error ? e.message : String(e)));
      }
      console.warn('[SYNC-DENY-BISECT] проба set(merge) вложенного поля', { результат: mergeProbe });
      console.warn('[SYNC-DENY-BISECT] ОТКАЗ НА ЛЮБОМ ВЛОЖЕННОМ ПОЛЕ: корневое поле проходит, progress.* — нет', {
        вывод: 'режется запись в progress целиком, а не конкретный ключ; вердикт деления недостоверен',
        'что проверять': 'progressHasNoPremiumWrites · hasNoServerGiftPerkWrites · hasNoLevelRewardSpinWrites — они сравнивают diff карты progress',
        'важно': 'на документе без ключа progress diff может вести себя иначе, чем на заполненном',
      });
      return;
    }
    if (nestedProbe !== 'ok') {
      console.warn('[SYNC-DENY-BISECT] вложенный контроль не подтверждён', { result: nestedProbe });
      return;
    }
  }
  if (harmlessProbe === 'denied') {
    console.warn('[SYNC-DENY-BISECT] ОТКАЗ НЕ ИЗ-ЗА СОСТАВА ПАТЧА: безобидная метка времени тоже отклонена', {
      вывод: 'режет условие уровня документа, а не поле; деление пополам бессмысленно',
      'что проверять': 'accountDeletionNotPending · authLinkMapsToUser · hasNoServerIdentityWrites · hasNoShardWrites (корень)',
      подсказка: 'смотри [SYNC-DENY-PROBE] выше — он читает те же документы, что и правило',
    });
    return;
  }
  if (harmlessProbe !== 'ok') {
    console.warn('[SYNC-DENY-BISECT] контроль безобидного поля не подтверждён', { result: harmlessProbe });
    return;
  }

  // Контроль: весь патч обязан отказать — иначе отказ был разовым (гонка), и
  // делить нечего. Без этой проверки поиск назвал бы «виновника» на пустом месте.
  const whole = await tryKeys(allKeys);
  if (whole !== 'denied') {
    console.warn('[SYNC-DENY-BISECT] повтор ВСЕГО патча не отказал — отказ разовый, состав полей ни при чём', {
      result: whole,
      keyCount: allKeys.length,
    });
    return;
  }

  let candidates = allKeys.slice();
  let steps = 0;
  while (candidates.length > 1 && steps < 20) {
    steps += 1;
    const mid = Math.floor(candidates.length / 2);
    const left = candidates.slice(0, mid);
    const leftResult = await tryKeys(left);
    if (leftResult === 'denied') {
      candidates = left;
      continue;
    }
    if (leftResult !== 'ok') {
      // 'unverified:*' — не смогли перечитать с сервера; продолжать нельзя,
      // иначе повторится ложная находка первого прогона.
      console.warn('[SYNC-DENY-BISECT] поиск прерван — половину не удалось подтвердить', {
        result: leftResult,
        step: steps,
        half: left.length,
      });
      return;
    }
    // Левая половина прошла → виновник справа. Она УЖЕ записана — это легальные
    // данные того же патча, повторять её не нужно.
    candidates = candidates.slice(mid);
  }

  console.warn('[SYNC-DENY-BISECT] ПОЛЕ-ВИНОВНИК НАЙДЕНО', {
    field: candidates[0],
    steps,
    valueType: typeof flat[candidates[0]],
    // значение НЕ печатаем: в нём личные данные. Имени поля и типа достаточно.
  });
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
  // зачем: патч объявлен ДО try, чтобы обработчик отказа мог напечатать его
  // состав. Именно списка ключей и не хватало, чтобы понять, какое поле роняет
  // весь set (правило update проверяет шесть условий сразу).
  const progressPatch: Record<string, string | null> = {};
  // зачем: по той же причине, что и progressPatch выше, — обработчик отказа ищет
  // поле-виновника делением пополам и обязан видеть ссылку на документ и корневую
  // часть патча. Объявленные внутри try, они ему недоступны.
  let docRef: FirebaseDocRefLike | null = null;
  const rootPatch: Record<string, unknown> = {};
  try {
    // зачем: облачные мутации выполняем только под подтверждённой каноничной
    // идентичностью — иначе очередь может дописать чужому аккаунту.
    const authoritativeIdentity = await ensureAuthoritativeIdentityForCloudMutation(uid);
    if (!authoritativeIdentity.ok || authoritativeIdentity.stableUid !== uid || !isSyncGenerationCurrent()) return;
    for (const target of SYNC_STUDY_TARGETS) {
      await uploadMistakePracticeEvents({ accountScope: uid, studyTarget: target });
      if (!isSyncGenerationCurrent()) return;
    }
    await resumePendingReportReplyShardClaims().catch(swallowError('cloud_sync:doSyncToCloud'));
    if (!isSyncGenerationCurrent()) return;
    // зачем (PM-289, D70): досылка старой очереди дельт жемчуга со старта снята —
    // строки и так применены локально; их снимает предпроверка выхода из аккаунта.
    await repairDevSeededStreakInStorage();
    if (!isSyncGenerationCurrent()) return;
    // зачем (Account V2, Пакет 7A, OD19; ремонт №1): при выключателе
    // accounts_v2_legacy_sync_disabled (+ клиент V2, платформа с областью, метка
    // гидрации uid, открытая область того же uid) карточки, память свайпов и библиотеку
    // ведёт V2 — в старое облако (progress.* и flashcard_pages) они не уходят.
    // Выключатель false → `&&` не доходит до await, omit отдаёт тот же объект:
    // путь байт-в-байт прежний. Проверка поколения ниже накрывает и это ожидание.
    const legacyV2SkipOnWrite = isAccountsV2LegacySwitchFlagOn()
      && await resolveAccountsV2LegacySkip('write', getAuthUserId());
    const pairs = await AsyncStorage.multiGet(getRuntimeSyncKeys());
    if (!isSyncGenerationCurrent()) return;
    const storedData: Record<string, string | null> = {};
    for (const [key, value] of pairs) {
      storedData[key] = value;
    }
    // зачем (координатор 12.10): карточки/наборы из dev-фикстур на госте в облако не выгружаются (только dev, uid гостя).
    const data = omitDevFixtureCardKeys(
      omitAccountsV2LegacyDomains(storedData, 'write', legacyV2SkipOnWrite),
      await isDevFixtureNoUploadActive(getAuthUserId()),
      'sync',
    );
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
    // зачем (Account V2, 8H): лог решений по V2-ключам (ушёл / пропущен, снимок есть / совпадает).
    logAccountsV2LegacySyncKeys(storedData, data, previousSnapshot, cloudSyncSnapshotValueMatches);
    // ── Карточки: вне документа users/{stableId} ───────────────────────────────
    // зачем: progress.flashcards_v1 хранил весь список карточек одной JSON-строкой
    // и рос без предела. 2026-09-01 он раздул документы трёх самых активных
    // аккаунтов до 1100-1129 КБ при жёстком лимите Firestore в 1 МБ — запись в
    // документ стала отклоняться ЦЕЛИКОМ (INVALID_ARGUMENT), и у этих людей молча
    // перестал сохраняться весь прогресс, а не только карточки. Теперь список
    // уезжает в подколлекцию flashcard_pages страницами, а из патча исключается.
    // Порядок важен: сначала успешная запись страниц, и только потом ключ
    // выбрасывается — иначе при отказе облака карточки исчезли бы из обоих мест.
    // зачем (Account V2, 8K): выгрузка карточек (страницы 8H, обнуление поля 8H-2,
    // замок 8J) вынесена в uploadFlashcardListsToPages — ТОТ ЖЕ путь зовёт
    // forceSyncToCloud, иначе перенос при смене устройства снова клал список в документ.
    // Порядок важен: сначала успешная запись страниц, и только потом ключ
    // выбрасывается — иначе при отказе облака карточки исчезли бы из обоих мест.
    const flashcardUpload = await uploadFlashcardListsToPages({
      uid,
      data,
      previousSnapshot,
      mode: 'sync',
      isCurrent: isSyncGenerationCurrent,
    });
    if (!flashcardUpload) return;
    const offloadedFlashcardKeys = flashcardUpload.offloaded;
    // Страницы записаны в этот такт → поле документа обнуляется в ЭТОМ же патче (8H-2).
    const flashcardDocFieldsToClear = flashcardUpload.clearDocField;
    // Сбой страниц → список уехал в документ, поле снова не null: маркер снимаем.
    const flashcardDocFieldsSentToDoc = flashcardUpload.sentToDoc;
    // Заперт замком 8J → не уходил никуда; снимок не запоминает его значение.
    const flashcardKeysLockedNow = flashcardUpload.lockedNow;


    for (const [key, value] of Object.entries(data)) {
      if (!shouldSyncPremiumProgressField(key, value, data)) continue;
      // Карточки уже в подколлекции — в документ их не дублируем.
      if (offloadedFlashcardKeys.has(key)) continue;
      // Premium/VIP-поля клиент НИКОГДА не пишет в облако: их авторитетный источник —
      // RevenueCat webhook / Telegram / admin-панель (Admin SDK). Firestore rules
      // (progressHasNoPremiumWrites) отклонят такую запись для обычного юзера и уронят
      // весь set целиком (вместе с legacy reward/streak). Поэтому вычищаем их из patch заранее.
      if (PREMIUM_PROGRESS_KEYS.has(key)) continue;
      // Server-owned ключи пишет только CF, исходящая запись
      // была бы отклонена rules и уронила бы весь set.
      if (isServerOwnedProgressKey(key)) continue;
      // зачем (владелец 2026-09-02): последний рубеж — сверка с ПОЛНЫМ зеркалом
      // блок-листов firestore.rules. Два фильтра выше исторически у́же правил:
      // сверка списков 02.09 нашла 13 ключей, которые правила режут, а клиент не
      // фильтровал (referral_spin_*, collectibles_*, lesson1_pass_live,
      // premium_rc_active_lineage и др.), и PREMIUM_PROGRESS_KEYS вдобавок
      // отсеивает premium условно (shouldSyncPremiumProgressField), тогда как
      // правило blockedPremiumProgressKeys режет их ВСЕГДА. Любой такой ключ в
      // патче роняет весь set целиком — вместе с legacy reward, стриком и аватаром, потому
      // что правило update проверяет шесть условий на один документ.
      // Списки ведутся вручную в двух файлах и уже расходились, поэтому сверка
      // идёт здесь, а не только в логе отказа.
      if (findRulesBlockedKeys([key]).length > 0) continue;
      if (!cloudSyncSnapshotValueMatches(previousSnapshot[key], value)) progressPatch[key] = value;
    }
    // зачем (8H-2): страницы только что записаны → устаревшая копия в документе
    // обнуляется в ЭТОМ же патче (точечный update по FieldPath трогает только её).
    for (const key of flashcardDocFieldsToClear) progressPatch[key] = null;

    // Set created_at without per-sync read to reduce Firestore read costs.
    // We keep a local marker and send created_at only once per install/session migration.
    const now = Date.now();
    const needHeartbeat = now - lastSuccessfulSyncAt >= SYNC_HEARTBEAT_MS;
    const needActivityStamp = now - lastActivityStampAt >= ACTIVITY_STAMP_INTERVAL_MS;
    const hasProgressPatch = Object.keys(progressPatch).length > 0;
    if (!needHeartbeat && !needActivityStamp && !hasProgressPatch) return;
    docRef = db.collection('users').doc(uid);
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
    // после смены auth), весь set отклоняется целиком — вместе с progress/legacy reward.
    // Именно это давало permission-denied сериями (26 отказов за вечер 26.08).
    // Авторитетный писатель — authEnsureStableLink (functions/src/auth_identity.ts:737),
    // он сам отслеживает userAuthUidChanged и обновляет поле при каждом расхождении.
    if (!isSyncGenerationCurrent()) return;
    /**
     * зачем (владелец 2026-09-02, разбор по боевым логам [SYNC-DENY]):
     * `set(..., { merge: true })` мержит ТОЛЬКО верхний уровень — вложенная карта
     * `progress` заменяется ЦЕЛИКОМ. Для правил это значит, что каждый ключ,
     * который лежит в облаке, но отсутствует в патче, попадает в removedKeys(),
     * а `affectedKeys()` = addedKeys ∪ removedKeys ∪ changedKeys. Поэтому
     * запрещённые ключи, ЛЕЖАЩИЕ в документе (chain_shield,
     * club_gift_free_boost_v1, user_total_xp, streak_count…), считались
     * «затронутыми» просто потому, что клиент их не прислал — и правила
     * hasNoServerGiftPerkWrites / progressHasNoPremiumWrites рубили ВЕСЬ set.
     *
     * Факты из лога: `blockedKeys: []` при отказе — виноваты были не отправленные
     * ключи, а ПОТЕРЯННЫЕ. Прошлая правка вычищала запрещённые ключи из патча и
     * тем самым делала ровно то, что вызывает отказ.
     *
     * Точечное обновление по dot-notation трогает только реально меняемые ключи:
     * остальные остаются в документе и в affectedKeys() не попадают.
     * FieldPath берётся вместо строки с точками — имена ключей содержат `::`
     * (`language_profile_v1::en`), и парсинг строкового пути на них ненадёжен;
     * FieldPath принимает сегмент как есть, без экранирования.
     */
    Object.assign(rootPatch, {
      ...(data['user_avatar'] ? { user_avatar: data['user_avatar'] } : {}),
      ...(data['user_avatar_frame'] ? { user_avatar_frame: data['user_avatar_frame'] } : {}),
      ...(needActivityStamp || needHeartbeat || shouldSendCreatedAt ? { updatedAt: now, last_active_at: now } : {}),
      ...(shouldSendCreatedAt ? { created_at: now } : {}),
    });
    // зачем: docRef объявлен выше try (диагностике отказа нужна ссылка), поэтому
    // тип допускает null. Сюда мы попадаем только после его присваивания — но
    // молча проглотить теоретический null нельзя, иначе синхронизация умрёт без
    // следа, как уже бывало с немыми catch. Проверка стоит ДО проверки поколения,
    // чтобы не разорвать её соседство с записью (сторож гонки следит именно за ним).
    if (!docRef) {
      console.warn('[SYNC-DENY] docRef не создан — запись пропущена', { uid });
      return;
    }
    // зачем: проверка поколения обязана стоять ВПЛОТНУЮ к записи — иначе между
    // ней и сетевым вызовом открывается окно, в котором успевает смениться
    // аккаунт, и патч уедет чужому. Сторож гонки (cloud_sync_account_race_contract)
    // проверяет именно это соседство.
    if (!isSyncGenerationCurrent()) return;
    const wrote = await writeUserDocWithNestedProgress(docRef, rootPatch, progressPatch);
    if (!wrote) return;
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
    // зачем (8H-2): документ принял null → помним это в снимке, чтобы не слать
    // null повторно; маркер переносится между синками и снимается при сбое страниц.
    Object.assign(snapshotData, buildFlashcardDocFieldMarkers(
      previousSnapshot,
      flashcardUpload.keys,
      flashcardDocFieldsToClear,
      flashcardDocFieldsSentToDoc,
    ));
    for (const key of flashcardDocFieldsToClear) console.log(`[LEGACY-V2-SYNC] doc_field_cleared key=${key}`);
    // зачем (8J): запертый ключ в облако не уходил — снимок не должен «запомнить» его
    // локальное значение как отправленное, иначе после снятия замка синк счёл бы его
    // совпавшим и страницы так и не дописал бы.
    for (const key of flashcardKeysLockedNow) {
      if (previousSnapshot[key] === undefined) delete snapshotData[key];
      else snapshotData[key] = previousSnapshot[key];
    }
    if (!isSyncGenerationCurrent()) return;
    await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(snapshotData)).catch(swallowError('cloud_sync:doSyncToCloud'));
    if (!isSyncGenerationCurrent()) return;
    if (shouldSendCreatedAt) {
      await AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(swallowError('cloud_sync:doSyncToCloud'));
    }

    // leaderboard/{uid} обновляется только через firestore_leaderboard.ts (pushMyScore)
    // + backend reconcile в functions/src/sync_leaderboard.ts.
    // Здесь сознательно НЕ пишем leaderboard, чтобы исключить dual-writer гонки.
  } catch (e) {
    // зачем: раньше здесь была одна строка без контекста, и разбор permission-denied
    // (26 отказов за вечер 26.08) пришлось вести по firestore.rules вместо лога.
    // Переполнение документа (лимит Firestore 1 МБ) — отдельная ветка и critical.
    // зачем: 2026-09-01 именно этот отказ месяцами оставался невидимым (логи стояли
    // под __DEV__, а в сторовой сборке __DEV__ = false), пока у трёх самых активных
    // аккаунтов молча не сохранялся ВЕСЬ прогресс. critical уходит в Firestore
    // через logAppError, поэтому повторение будет видно в админке сразу.
    if (isDocumentTooLargeError(e)) {
      DebugLogger.error(
        'cloud_sync:doc_too_large',
        e instanceof Error ? e : new Error(String(e)),
        'critical',
      );
    }
    // Печатаем uid и состав записи — какое из правил users/{userId} отклонило set,
    // видно сразу, без реконструкции payload по коду.
    const code = (e as { code?: string } | null)?.code ?? '';
    if (String(code).includes('permission-denied')) {
      /**
       * зачем (владелец 2026-09-02): прежний лог печатал только
       * authMatchesStableId, и это ЛОЖНЫЙ след — stableId и authUid разные по
       * определению, они и не должны совпадать. Диагностика 02.09 показала, что
       * личность у отказа была в полном порядке (auth_links и обратная ссылка на
       * месте, маркеров удаления нет), а запись всё равно резалась. Значит режет
       * СОСТАВ патча: правило update для users/{userId} проверяет ещё шесть
       * условий, и любое запрещённое поле роняет весь set целиком — вместе с legacy reward.
       * Без списка ключей причину не найти, поэтому печатаем сами ключи (не
       * значения — в них личные данные).
       *
       * Логи СОЗНАТЕЛЬНО вне __DEV__: ровно из-за `if (__DEV__)` этот отказ
       * месяцами оставался невидимым в сторовой сборке, пока у трёх активных
       * аккаунтов молча не сохранялся весь прогресс.
       */
      console.warn('[SYNC-DENY] users write rejected by rules', {
        uid,
        authUid: getAuthUserId(),
        progressKeyCount: Object.keys(progressPatch).length,
        // Главное поле: ключи, которые правила запрещают. Пусто → причина не в
        // составе патча (смотри размер документа и остальные условия update).
        blockedKeys: findRulesBlockedKeys(Object.keys(progressPatch)),
        // Первые 40 ключей — на случай, если нарушителей нет и нужен контекст.
        progressKeysHead: Object.keys(progressPatch).slice(0, 40),
        sentProgress: Object.keys(progressPatch).length > 0,
        code,
        reason: e instanceof Error ? e.message : String(e),
      });
      DebugLogger.error(
        'cloud_sync:permission_denied',
        e instanceof Error ? e : new Error(String(e)),
        'critical',
      );
      // зачем: состав патча уже доказано чист (blockedKeys пуст в каждом отказе),
      // значит режет одно из условий правила, которого в патче не видно. Проба
      // читает ровно те документы, которые читает правило, и называет виновника —
      // без неё третий круг снова свёлся бы к гаданию.
      void (async () => {
        await probePermissionDenyReason(uid, getAuthUserId());
        // зачем: проба выше отвечает «личность цела», и на этом два прошлых
        // круга вставали. Поиск делением называет САМО поле, на котором правило
        // падает, — без него третий круг снова свёлся бы к перебору гипотез.
        if (docRef) await bisectDenyingField(docRef, rootPatch, progressPatch);
        else console.warn('[SYNC-DENY-BISECT] отказ случился ДО обращения к документу — состав полей ни при чём');
      })().catch((probeError) => {
        console.warn('[SYNC-DENY-PROBE] диагностика не выполнилась', {
          reason: probeError instanceof Error ? probeError.message : String(probeError),
        });
      });
    } else if (String(code).includes('not-found')) {
      /**
       * зачем (владелец 2026-09-02): переход с `set(merge)` на точечный `update`
       * поменял поведение при ОТСУТСТВУЮЩЕМ документе — `set` его создавал,
       * `update` падает с not-found. Данные от этого не теряются: правило
       * `allow create: if false` и раньше запрещало клиенту создавать
       * users/{uid}, документ заводит сервер (authEnsureStableLink). Но без
       * своей ветки отказ выглядел бы безымянным «write failed», и следующий
       * разбор снова начинался бы с нуля.
       *
       * Что это значит на практике: личность ещё не забутстрапана сервером.
       * Прогресс остаётся на устройстве и уедет следующей синхронизацией, как
       * только authEnsureStableLink создаст документ.
       */
      console.warn('[SYNC-DENY] users doc missing — ждём серверный бутстрап личности', {
        uid,
        authUid: getAuthUserId(),
        progressKeyCount: Object.keys(progressPatch).length,
        code,
        reason: e instanceof Error ? e.message : String(e),
      });
      DebugLogger.error(
        'cloud_sync:user_doc_missing',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
    } else {
      console.warn('[SYNC-DENY] users write failed', {
        uid,
        code,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

// ── Восстановить прогресс из документа users/{uid} (без повторного get) ─────
type FlashcardPagesRestoreOutcome = {
  pairs: [string, string][];
  source: Map<string, 'pages' | 'none' | 'error'>;
  unlockKeys: Map<string, string>;
};

const FLASHCARD_PAGES_RESTORE_KEYS: ReadonlyArray<readonly [string, FlashcardStudyTarget]> = [
  ['flashcards_v1', 'en'],
  [flashcardsSavedKey('fr'), 'fr'],
];

/** 8J: id карточек, явно удалённых человеком на этом телефоне (журнал 7D), для языка. */
async function readSavedCardDeletionIds(target: FlashcardStudyTarget): Promise<ReadonlySet<string>> {
  const journal = await readCardDeletionJournal();
  if (!journal) return new Set();
  const prefix = `${target}:saved:`;
  const ids = new Set<string>();
  for (const entryKey of journal.keys()) {
    if (entryKey.startsWith(prefix)) ids.add(entryKey.slice(prefix.length));
  }
  return ids;
}

/**
 * Account V2, Пакет 8J — карточки из подколлекции flashcard_pages для restore.
 * onlyKey=null — все ключи (основной путь restore); иначе только отобранные (sticky-ветка
 * перечитывает лишь запертые ключи — без лишних чтений Firestore у остальных).
 *
 * зачем: у мигрированных аккаунтов поля progress.flashcards_v1 в документе больше нет
 * (см. writeFlashcardPages), и общий цикл restore его не увидит — без этого чтения человек
 * на новом устройстве остался бы без карточек. Документ остаётся источником для ещё не
 * мигрированных аккаунтов. Ключ, запертый ДО этого restore (lockedBefore), при удачном
 * чтении не заменяется страницами, а объединяется с локальным: под замком локальное было
 * единственной правдой о новых карточках. Замок здесь НЕ снимается: его снимает вызывающий
 * ПОСЛЕ записи pairs (unlockFlashcardPagesAfterRestore) — иначе синк между снятием и
 * записью отправил бы в страницы ещё старое локальное значение.
 */
async function restoreFlashcardPagesForKeys(
  cloudData: Record<string, string | null>,
  legacyV2SkipOnRestore: boolean,
  assertCurrent: () => void,
  lockedBefore: ReadonlySet<string>,
  onlyKey: ((key: string) => boolean) | null,
): Promise<FlashcardPagesRestoreOutcome> {
  const outcome: FlashcardPagesRestoreOutcome = { pairs: [], source: new Map(), unlockKeys: new Map() };
  const restoreUid = await getCanonicalUserId().catch((error) => {
    DebugLogger.warn('cloud_sync:flashcards', `restore: uid недоступен (${String(error)})`);
    return null;
  });
  assertCurrent();
  if (!restoreUid) {
    DebugLogger.warn('cloud_sync:flashcards', 'restore: нет canonical uid — страницы карточек пропущены');
    return outcome;
  }
  for (const [key, target] of FLASHCARD_PAGES_RESTORE_KEYS) {
    if (onlyKey && !onlyKey(key)) continue;
    // Документ главнее, только если он ещё содержит карточки (аккаунт не мигрирован).
    if (cloudData[key] !== null && cloudData[key] !== undefined) {
      // зачем (8H, диагностика): поле в документе затеняет страницы — страницы не читаются.
      console.log(`[LEGACY-V2-SYNC] restore key=${key} source=doc_field doc_len=${String(cloudData[key]).length} pages=not_read`);
      // зачем (8J): источник — поле документа (подтверждённое облако), замок снимается.
      // Если ключ был заперт, объединяем поле с локальным: sticky-ветка поле в локальное
      // не кладёт, а синк потом обнулил бы поле — карточки документа пропали бы.
      if (lockedBefore.has(key)) {
        // зачем (S1c R2): сюда попадают только ключи, запертые после сбоя чтения, т.е. АКТИВНОЕ
        // устройство с непустым локальным списком (правки под замком — единственная правда).
        // Режим 'active' (§100): без времени / в пределах запаса остаётся локальная; 'restore'
        // откатил бы свежую правку человека к облачной.
        const merge = mergeLockedFlashcardsWithPages(
          await AsyncStorage.getItem(key),
          String(cloudData[key]),
          await readSavedCardDeletionIds(target),
          key,
          { mode: 'active', target },
        );
        assertCurrent();
        console.log(`[LEGACY-V2-SYNC] restore key=${key} source=doc_field_merged_local cloud=${merge.cloud} local_only=${merge.localOnly} deleted_skipped=${merge.deletedSkipped} local_unparsable=${merge.localUnparsable}`);
        outcome.pairs.push([key, merge.value]);
      }
      outcome.unlockKeys.set(key, 'doc_field');
      continue;
    }
    // зачем (Пакет 7A): V2 ведёт карточки — страницы старого облака не читаем (лог уже в omit).
    if (legacyV2SkipOnRestore && isAccountsV2LegacyDomainKey(key)) continue;
    // зачем (8J): трёхзначный результат — «страниц нет» (сервер подтвердил) ≠ «не прочитали».
    const pagesRead = await readFlashcardPagesResult(restoreUid, target);
    assertCurrent();
    if (pagesRead.status === 'error') {
      // зачем (8J): правды о страницах нет — локальное НЕ трогаем, древнее поле НЕ берём
      // (источник 'error'), и запираем запись страниц этого ключа до удачного чтения:
      // иначе первая же новая карточка перезаписала бы страницы списком из одной карточки.
      console.log(`[LEGACY-V2-SYNC] restore key=${key} source=pages_error code=${pagesRead.code} from=${pagesRead.from} local=untouched`);
      outcome.source.set(key, 'error');
      await lockFlashcardPagesWrite(key, `read_error_${pagesRead.code}`);
      assertCurrent();
      continue;
    }
    let fromPages = pagesRead.status === 'ok' ? pagesRead.value : null;
    if (fromPages && lockedBefore.has(key)) {
      // зачем (8J): ключ был заперт — карточки, добавленные под замком, живут только локально.
      // зачем (S1c R2): ключ был заперт на этом (активном) устройстве — правило §100, см. выше.
      const merge = mergeLockedFlashcardsWithPages(
        await AsyncStorage.getItem(key),
        fromPages,
        await readSavedCardDeletionIds(target),
        key,
        { mode: 'active', target },
      );
      assertCurrent();
      console.log(`[LEGACY-V2-SYNC] restore key=${key} source=pages_merged_local cloud=${merge.cloud} local_only=${merge.localOnly} deleted_skipped=${merge.deletedSkipped} local_unparsable=${merge.localUnparsable}`);
      fromPages = merge.value;
    }
    console.log(`[LEGACY-V2-SYNC] restore key=${key} source=${fromPages ? 'pages' : 'none'} pages_len=${fromPages ? fromPages.length : 0}`);
    outcome.source.set(key, fromPages ? 'pages' : 'none');
    outcome.unlockKeys.set(key, `read_${pagesRead.status}`);
    if (fromPages) outcome.pairs.push([key, fromPages]);
  }
  return outcome;
}

/** 8J: снять замок записи страниц — только ПОСЛЕ того, как pairs restore записаны локально. */
async function unlockFlashcardPagesAfterRestore(
  unlockKeys: ReadonlyMap<string, string>,
  assertCurrent: () => void,
): Promise<void> {
  for (const [key, reason] of unlockKeys) {
    await unlockFlashcardPagesWrite(key, reason);
    assertCurrent();
  }
}

async function applyRestoreFromUserDocTraced(
  doc: { exists: boolean; data: () => Record<string, unknown> | undefined },
  isCurrent: () => boolean,
  afterLegacyRestore: ((root: Record<string, unknown>) => void) | undefined,
  vipGeneration: AccountGenerationToken | undefined,
  applyMark: (point: string) => void,
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
    AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(swallowError('cloud_sync:applyRestoreFromUserDoc'));
  }
  const progressData = root.progress && typeof root.progress === 'object' && !Array.isArray(root.progress)
    ? root.progress as Record<string, unknown>
    : {};
  // зачем (Account V2, Пакет 7A): при активном выключателе старое облако по
  // V2-доменам больше не обновляется — его значения устаревшие и НЕ должны
  // перетирать карточки/свайпы/библиотеку, которые ведёт и гидрирует V2.
  // Неактивно → omit возвращает тот же объект (путь прежний).
  // Ремонт №1: restore НЕ зависит от открытой области (на холодном старте её ещё нет) —
  // только флаг + клиент V2 + платформа с областью + метка гидрации этого uid
  // (resolveAccountsV2LegacySkip). Без метки — старый restore, пустых карточек не будет.
  const legacyV2SkipOnRestore = isAccountsV2LegacySwitchFlagOn()
    && await resolveAccountsV2LegacySkip('restore', getAuthUserId());
  assertCurrent();
  const cloudData = omitAccountsV2LegacyDomains(filterLegacyProgressForPhoneState(
    progressData as Record<string, string | null>,
    phoneStateOwnsCore,
  ), 'restore', legacyV2SkipOnRestore);
  // Raw user_avatar/frame/aura fields are compatibility projections only. A
  // stale cloud snapshot must not revoke a locally committed purchase or a
  // newer PhoneState selection operation.
  if (vipGeneration?.stableId?.trim() && isCurrentAccountGeneration(vipGeneration)) {
    // Retired level field is ignored; customization fallback is deterministic
    // and never derives authority from the removed progression system.
    const selectionLevel = 1;
    applyMark('at:authority');
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
    }).catch(swallowError('cloud_sync:applyRestoreFromUserDoc'));
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
    applyMark('at:stats_import');
    // зачем (координатор 12.10, «сначала логи»): at:stats_en=20335 мс у гостя на холодном dev-старте. applyMark пишет время
    // С ПРЕДЫДУЩЕЙ отметки, то есть at:stats_en — это импорт модуля ниже, а не сверка. Делим: импорт / сверка en / сверка fr.
    const statsImportStartedAt = Date.now();
    const { reconcileStatsDailyBreakdownWithCloud } = await import('./stats_daily_breakdown');
    const statsImportMs = Date.now() - statsImportStartedAt;
    assertCurrent();
    applyMark('at:stats_en');
    const statsEnStartedAt = Date.now();
    cloudData['stats_daily_breakdown_v1'] = await reconcileStatsDailyBreakdownWithCloud(
      cloudData['stats_daily_breakdown_v1'],
      'en',
    );
    const statsEnMs = Date.now() - statsEnStartedAt;
    assertCurrent();
    const frenchStatsKey = statsDailyBreakdownKey('fr');
    applyMark('at:stats_fr');
    const statsFrStartedAt = Date.now();
    cloudData[frenchStatsKey] = await reconcileStatsDailyBreakdownWithCloud(
      cloudData[frenchStatsKey],
      'fr',
    );
    console.warn('[BOOT-STATS]', JSON.stringify({ importMs: statsImportMs, reconcileEnMs: statsEnMs, reconcileFrMs: Date.now() - statsFrStartedAt, dev: __DEV__ })); // guard-ok: одна строка на восстановление
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
    (await readTesterFlags()).noPremium === 'true'; // зачем: [COLD-START-IO] — одно чтение флагов на всех
  const STRIP_SKIP_RESTORE_KEYS = new Set<string>([
    'premium_active', 'premium_plan', 'premium_expiry',
    'premium_rc_product_id', 'premium_rc_period_type', 'premium_rc_store',
    'premium_rc_expiry_ms', 'premium_rc_purchased_at_ms', 'premium_rc_updated_at',
    'premium_admin_grant_at', 'admin_premium_override',
    'vip_active', 'vip_plan', 'vip_from', 'vip_until', 'vip_expiry',
    'vip_admin_override', 'vip_admin_grant_at', 'vip_grant_at',
  ]);

  let localStreakRaw: string | null;
  let localLastActiveRaw: string | null;
  let localStreakLastRaw: string | null;
  // зачем (координатор 12.10, 🔴 streakJump, «сперва логи»): серию читаем здесь, а пишем слитое значение в конце
  // восстановления — на холодном старте это секунды. Возраст чтения в момент записи покажет «записал устаревшее».
  let streakReadAtMs = 0;
  try {
    applyMark('at:streak_reads');
    [localStreakRaw, localLastActiveRaw, localStreakLastRaw] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('last_active_date'),
      AsyncStorage.getItem('streak_last_date'),
    ]);
    streakReadAtMs = Date.now();
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
  const localStreak = parseProgressInt(localStreakRaw);
  const cloudStreak = parseProgressInt(cloudData['streak_count']);
  applyMark('at:pending_events');
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
  const shouldRestoreCloudProgress =
    phoneStateOwnsCore
    || (progressServerAuthoritative && !hasPendingProgressEvents)
    || cloudStreak > localStreak;
  // зачем (баг 01.10, серия 1 при 6 днях): временная трассировка слияния облака.
  console.log(`[STREAK] cloud_restore local=${localStreak}@${String(localLastActiveRaw)} cloud=${cloudStreak}@${String(cloudData['last_active_date'])} merged=${mergedStreak.streak}@${String(mergedStreak.lastActive)} restore=${shouldRestoreCloudProgress} phoneOwns=${phoneStateOwnsCore} serverAuth=${progressServerAuthoritative} pending=${hasPendingProgressEvents}`);

  // зачем (координатор 12.10, 🔴 streakJump; c1a051ae6 + ветка «локальное главнее»): серию восстановление прочитало выше, а
  // пишет слитое значение в конце — на холодном старте это секунды. Если за это время серию записали локально, сливаем
  // заново со свежим значением по дате активности (не max), устаревшее не пишем. Обе ветки записи идут через этот помощник.
  const guardStreakPairs = async (
    pairsIn: readonly (readonly [string, string])[],
    branch: 'cloud_main' | 'local_sticky',
  ): Promise<readonly (readonly [string, string])[]> => {
    if (!pairsIn.some(([key]) => key === 'streak_count' || key === 'last_active_date' || key === 'streak_last_date')) return pairsIn;
    const [nowStreakRaw, nowLastActiveRaw, nowStreakLastRaw] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('last_active_date'),
      AsyncStorage.getItem('streak_last_date'),
    ]);
    assertCurrent();
    const changed = nowStreakRaw !== localStreakRaw || nowLastActiveRaw !== localLastActiveRaw || nowStreakLastRaw !== localStreakLastRaw;
    if (!changed) {
      console.log(`[STREAK] restore_guard ok branch=${branch} — серия не менялась с чтения (${String(localStreakRaw)}), пишем слитое ${mergedStreak.streak}`);
      return pairsIn;
    }
    const fresh = mergeStreakByActivityDate(
      { streak: nowStreakRaw, lastActive: nowLastActiveRaw, streakLast: nowStreakLastRaw },
      { streak: cloudData['streak_count'], lastActive: cloudData['last_active_date'], streakLast: cloudData['streak_last_date'] },
    );
    console.warn(`[STREAK] restore_guard changed_since_read branch=${branch} read=${String(localStreakRaw)}@${String(localLastActiveRaw)} now=${String(nowStreakRaw)}@${String(nowLastActiveRaw)} staleMerged=${mergedStreak.streak} → freshMerged=${fresh.streak}@${String(fresh.lastActive)} readAgoMs=${Date.now() - streakReadAtMs}`);
    return pairsIn.map(([key, value]): readonly [string, string] => {
      if (key === 'streak_count') return [key, String(fresh.streak)];
      if ((key === 'last_active_date' || key === 'streak_last_date') && fresh.lastActive) return [key, fresh.lastActive];
      return [key, value];
    });
  };

  // Откат прогресса назад — потеря данных, и он обязан оставлять след НАВСЕГДА.
  //
  // зачем (жалоба «Издевательство», 2026-09-01): человек сообщил «после урока
  // ничего не поменялось, а после рестарта уровень упал до 12» и «дни со 155 на
  // 52». Здесь ЕДИНСТВЕННОЕ место, где облако может перезаписать локальный
  // прогресс МЕНЬШИМ значением: ветки phoneStateOwnsCore и
  // progressServerAuthoritative не сравнивают числа вообще.
  //
  // Печатаем КАЖДОЕ значение, решившее ветку, а не голое true/false — иначе по
  // логу нельзя понять, почему откатило.
  if (shouldRestoreCloudProgress && progressServerAuthoritative) {
    assertCurrent();
    // Do this before AsyncStorage writes. SQLITE_FULL may reject persistence,
    // but must not make intact server legacy reward/streak render as Level 1 / zero days.
    // зачем (баг 01.10): в снимок — серия, слитая по дате активности, а не голая облачная.
    patchAppSnapshotFromAuthoritativeCloudProgress(root, Date.now(), mergedStreak.streak);
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
    applyMark('at:sticky_keys_loop');
    for (const key of stickyKeys) {
      const val = cloudData[key];
      // Используем premiumValuePresent для premium/vip-ключей: пустая строка '' !== null,
      // но должна трактоваться как «нет данных» — иначе '' затирает локальный выбор.
      if (PREMIUM_PROGRESS_KEYS.has(key) ? premiumValuePresent(val) : (val !== null && val !== undefined)) {
        stickyPairs.push([key, cloudProgressStorageValue(key, val)]);
      }
    }
    // cards-2.0 (E4): merge-ключи применяются и в sticky-ветке («локальный legacy reward
    // выше») — звёзды/клеймы с другого устройства нельзя терять ни в одном
    // направлении (union claimed / max stars).
    applyMark('at:fc_merge_loop');
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
    // Локальный legacy reward ≥ облачного, но ник мог остаться только в облаке (другой девайс / сбой записи).
    applyMark('at:user_name');
    const localNameRaw = await AsyncStorage.getItem('user_name');
    const localName = (localNameRaw ?? '').trim();
    const cloudName = cloudData['user_name'];
    if (!localName && cloudName != null && String(cloudName).trim() !== '') {
      stickyPairs.push(['user_name', String(cloudName).trim()]);
    }
    // #10 multi-device: even when local legacy reward ≥ cloud, a strictly-additive lifetime
    // counter may be higher in cloud (the other device bumped it). Pull the max so
    // the counter never regresses on this device.
    applyMark('at:counters_multiget');
    const localCounterMap = Object.fromEntries(
      await AsyncStorage.multiGet([
        ...getRuntimeSyncKeys().filter(isMonotonicCounterRestoreKey),
      ]),
    ) as Record<string, string | null>;
    assertCurrent();
    applyMark('at:monotonic_loop');
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
      stickyPairs.push(...buildStickyServerProgressPairs(cloudData));
    }
    const cloudLoginBonus = cloudData['login_bonus_v1'];
    applyMark('at:login_bonus');
    const localLoginBonus = await AsyncStorage.getItem('login_bonus_v1');
    assertCurrent();
    const mergedLoginBonus = loginBonusMergeValue(localLoginBonus, cloudLoginBonus);
    if (mergedLoginBonus !== null) {
      stickyPairs.push(['login_bonus_v1', mergedLoginBonus]);
    }

    // Косметика, выданная из админки/облака (аура «Нимб» бета-тестерам, арена-ауры и т.п.),
    // должна догонять устройство ДАЖЕ когда локальный legacy reward ≥ облачного (обычный случай у
    // активного юзера). Иначе owned-ключи не в sticky → админская выдача не появляется, а
    // при следующем пуше клиент затирает её локальным значением. Owned мержим объединением
    // (union), чтобы не потерять локально купленные ауры; активную ауру и gift-флаг из облака
    // применяем как есть (админ авто-надевает выданную).
    applyMark('at:auras');
    const mergedOwnedAuras = mergeOwnedFlagMap(
      await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY),
      cloudData[AVATAR_AURA_OWNED_KEY],
    );
    if (mergedOwnedAuras !== null) stickyPairs.push([AVATAR_AURA_OWNED_KEY, mergedOwnedAuras]);
    // K2: остальные owned-ключи (паки флешкарт, аватары) — тот же принцип:
    // покупка/выдача с другого девайса догоняет устройство и в local-wins ветке. Union;
    // ауры уже обработаны выше, target-scoped ключи идут через buildTargetScopedStickyRestorePairs.
    const stickyOwnedKeys = getRuntimeSyncKeys().filter((k) =>
      isOwnedUnionRestoreKey(k) && k !== AVATAR_AURA_OWNED_KEY && targetScopedRestoreInfo(k) === null,
    );
    if (stickyOwnedKeys.length > 0) {
      applyMark('at:sticky_owned');
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
    // legacy reward-гейт выше навсегда отрезал уроковый прогресс на более активном
    // устройстве: Plus/косметика (sticky выше) ездили между девайсами,
    // а уроки — нет.
    const stickyLessonKeys = getRuntimeSyncKeys().filter(isMonotonicLessonRestoreKey);
    if (stickyLessonKeys.length > 0) {
      applyMark('at:sticky_lessons');
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
    const cloudActiveAura = cloudData[USER_AVATAR_AURA_KEY];
    if (cloudActiveAura != null && String(cloudActiveAura).trim() !== '') {
      stickyPairs.push([USER_AVATAR_AURA_KEY, String(cloudActiveAura)]);
    }
    const cloudGiftAura = cloudData[AVATAR_AURA_GIFT_OWNED_KEY];
    if (cloudGiftAura != null && String(cloudGiftAura).trim() !== '') {
      stickyPairs.push([AVATAR_AURA_GIFT_OWNED_KEY, String(cloudGiftAura)]);
    }
    applyMark('at:target_sticky');
    stickyPairs.push(...await buildTargetScopedStickyRestorePairs(cloudData));
    applyMark('at:daily_helpers_loop');
    for (const key of dailyLessonHelperKeysForToday()) {
      const value = cloudData[key];
      if (value === null || value === undefined) continue;
      const localValue = await AsyncStorage.getItem(key);
      if (!localValue) stickyPairs.push([key, cloudProgressStorageValue(key, value)]);
    }
    applyMark('at:gift_perks');
    const authoritativeGiftPerks = await buildGiftEntitlementStickyPairs(cloudData);
    stickyPairs.push(...authoritativeGiftPerks.pairs);
    // зачем (8J): sticky-ветка (local ≥ cloud — обычный случай активного человека) страниц
    // не читает. Без этого замок, поставленный сбоем чтения, жил бы почти вечно и карточки
    // не уходили бы в облако. Перечитываем ТОЛЬКО запертые ключи: у остальных ни одного
    // лишнего чтения Firestore.
    applyMark('at:fc_locks');
    const stickyFlashcardLocks = await readFlashcardPagesWriteLocks(FLASHCARD_PAGES_RESTORE_KEYS.map(([key]) => key));
    assertCurrent();
    applyMark('at:fc_pages');
    const stickyFlashcardPages = stickyFlashcardLocks.size > 0
      ? await restoreFlashcardPagesForKeys(
        cloudData, legacyV2SkipOnRestore, assertCurrent, stickyFlashcardLocks, (key) => stickyFlashcardLocks.has(key),
      )
      : null;
    if (stickyFlashcardPages) stickyPairs.push(...stickyFlashcardPages.pairs);
    let appliedStickyState = false;
    if (stickyPairs.length > 0) {
      assertCurrent();
      applyMark('at:personal_plan');
      await applyPersonalPlanRestorePairs(await guardStreakPairs(stickyPairs, 'local_sticky'));
      assertCurrent();
      appliedStickyState = true;
    }
    applyMark('at:fc_unlock');
    if (stickyFlashcardPages) await unlockFlashcardPagesAfterRestore(stickyFlashcardPages.unlockKeys, assertCurrent);
    if (authoritativeGiftPerks.removeKeys.length > 0) {
      assertCurrent();
      applyMark('at:gift_remove');
      await AsyncStorage.multiRemove(authoritativeGiftPerks.removeKeys);
      assertCurrent();
      appliedStickyState = true;
    }
    // tester «Снять премиум»: не восстанавливаем VIP-доступ из облака (см. выше).
    if (cloudVipActive !== null && !stripPremiumActive && vipGeneration && vipOwnerStableId) {
      applyMark('at:vip_snapshot');
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
      applyMark('at:snapshot_write');
      await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(buildRestoreSnapshot(cloudData))).catch(swallowError('cloud_sync:applyRestoreFromUserDoc'));
      assertCurrent();
      applyMark('at:complete_true');
      return completeRestore(true);
    }
    return completeRestore(false);
  }

  const pairs: [string, string][] = [];
  // K2: owned-ключи тоже читаем локально — иначе mergeOwnedRestoreValue получит
  // undefined и «union» выродится в слепую перезапись облаком.
  const ownedUnionRuntimeKeys = getRuntimeSyncKeys().filter(isOwnedUnionRestoreKey);
  // зачем (координатор 11.10, «локальное накопление не теряется»): ключи со своим правилом слияния
  // (FC_RESTORE_MERGE_STRATEGIES) читаем локально и здесь — раньше таблица работала только в sticky- и fr-ветках,
  // а основная ветка писала облако поверх (дни активности, прогресс достижений).
  const mergeStrategyRuntimeKeys = getRuntimeSyncKeys().filter((key) => Object.prototype.hasOwnProperty.call(FC_RESTORE_MERGE_STRATEGIES, key));
  // зачем (пп.2–3): свои карточки и память ответов тоже сливаются, а не перезаписываются облаком.
  const cardRestoreStrategies = await buildCardRestoreMergeStrategies(cloudData);
  assertCurrent();
  const localLessonRestoreMap = Object.fromEntries(
    await AsyncStorage.multiGet([
      ...RESTORE_MERGE_KEY_SET,
      ...getRuntimeSyncKeys().filter(isMonotonicCounterRestoreKey),
      ...ownedUnionRuntimeKeys,
      ...mergeStrategyRuntimeKeys,
      ...Object.keys(cardRestoreStrategies),
      ...SPENDABLE_RESTORE_LOG_KEYS,
    ]),
  ) as Record<string, string | null>;
  assertCurrent();
  for (const key of getRuntimeSyncKeys()) {
    if (SPENDABLE_RESTORE_LOG_KEYS.has(key)) logSpendableRestore(key, localLessonRestoreMap[key], cloudData[key], phoneStateOwnsCore && isPhoneStateCoreProgressKey(key));
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
      const storageValue = cloudProgressStorageValue(key, val);
      const mergeStrategy = FC_RESTORE_MERGE_STRATEGIES[key] ?? cardRestoreStrategies[key];
      if (mergeStrategy) {
        const localValue = localLessonRestoreMap[key];
        const merged = mergeStrategy(localValue, storageValue);
        logRestoreMerge(key, localValue, storageValue, merged);
        pairs.push([key, merged]);
        continue;
      }
      const mergedValue = mergeLessonRestoreValue(key, storageValue, localLessonRestoreMap[key]);
      if (isOwnedUnionRestoreKey(key) || isMonotonicCounterRestoreKey(key)) {
        logRestoreMerge(key, localLessonRestoreMap[key], storageValue, mergedValue);
      }
      pairs.push([key, mergedValue]);
    }
  }
  if (!phoneStateOwnsCore && (mergedStreak.streak > 0 || cloudData['streak_count'] != null)) {
    pairs.push(['streak_count', String(mergedStreak.streak)]);
    console.log(`[STREAK] restore_pair streak=${mergedStreak.streak} localRead=${String(localStreakRaw)} cloud=${String(cloudData['streak_count'])} readAgoMs=${Date.now() - streakReadAtMs}`);
  } else {
    console.log(`[STREAK] restore_pair skipped phoneOwns=${phoneStateOwnsCore} merged=${mergedStreak.streak} cloud=${String(cloudData['streak_count'])}`);
  }
  if (!phoneStateOwnsCore && mergedStreak.lastActive) {
    pairs.push(['last_active_date', mergedStreak.lastActive]);
    pairs.push(['streak_last_date', mergedStreak.lastActive]);
  }
  if (cloudData['achievements_state']) {
    // зачем (координатор 11.10, сперва логи): облако пишет достижения целиком — видно, что затёрло бы локальные.
    // п.1: вместо перезаписи — слияние по id (более ранняя дата), локально полученное не теряется.
    const cloudAchievements = String(cloudData['achievements_state']);
    let achievementsValue = cloudAchievements;
    try {
      const localAchievements = await AsyncStorage.getItem('achievements_v1');
      achievementsValue = mergeAchievementStatesRaw(localAchievements, cloudAchievements);
      logRestoreMerge('achievements_v1', localAchievements, cloudAchievements, achievementsValue);
      const diff = diffAchievementUnlocks(localAchievements, String(cloudData['achievements_state']));
      console.log('[ACH-RESTORE]', JSON.stringify({
        localUnlocked: diff.localUnlocked?.length ?? 'unparsed',
        cloudUnlocked: diff.cloudUnlocked?.length ?? 'unparsed',
        wouldLose: diff.wouldLose,
      }));
    } catch (error) {
      console.warn('[ACH-RESTORE] сравнение не удалось', error instanceof Error ? error.message : String(error));
    }
    pairs.push(['achievements_v1', achievementsValue]);
  }
  // ── Карточки из подколлекции flashcard_pages ───────────────────────────────
  // зачем: у мигрированных аккаунтов поля progress.flashcards_v1 в документе
  // больше нет (см. writeFlashcardPages), и общий цикл restore его не увидит —
  // без этого чтения человек на новом устройстве остался бы без карточек.
  // Документ остаётся источником для ещё не мигрированных аккаунтов.
  // зачем (8J): чтение страниц вынесено в restoreFlashcardPagesForKeys — тот же путь нужен
  // sticky-ветке выше, чтобы снять замок и у активного человека (local ≥ cloud).
  const flashcardPagesLocksBefore = await readFlashcardPagesWriteLocks(FLASHCARD_PAGES_RESTORE_KEYS.map(([key]) => key));
  assertCurrent();
  const flashcardPagesRestore = await restoreFlashcardPagesForKeys(
    cloudData, legacyV2SkipOnRestore, assertCurrent, flashcardPagesLocksBefore, null,
  );
  // зачем (8J): объединённое значение заменяет поле документа, уже лежащее в pairs из общего
  // цикла, — без дубля ключа в multiSet (порядок применения дублей не гарантирован).
  const flashcardRestoredKeys = new Set(flashcardPagesRestore.pairs.map(([key]) => key));
  for (let index = pairs.length - 1; index >= 0; index -= 1) {
    if (flashcardRestoredKeys.has(pairs[index][0])) pairs.splice(index, 1);
  }
  pairs.push(...flashcardPagesRestore.pairs);
  // зачем (8H-2, ревью I-1): что дали страницы по каждому ключу — нужно древнему полю
  // progress.flashcards ниже, чтобы оно не перебило страницы после обнуления поля документа.
  const flashcardPagesRestoreSource = flashcardPagesRestore.source;
  // зачем (8H-2, ревью I-1): прежнее условие `!cloudData['flashcards_v1']` срабатывало и на
  // обнулённом поле (null): древний список вставал в pairs ПОСЛЕ страниц, побеждал в multiSet,
  // а следующий синк переписывал им настоящие страницы — потеря карточек. Древнее поле берём,
  // только если ключа flashcards_v1 в документе нет вовсе И страницы прочитаны и пусты.
  // Древний двойник есть только у английского ключа (fr-ключ без legacy-поля).
  if (cloudData['flashcards']) {
    const enPagesSource = flashcardPagesRestoreSource.get('flashcards_v1') ?? 'not_read';
    if (cloudData['flashcards_v1'] === undefined && enPagesSource === 'none') {
      console.log(`[LEGACY-V2-SYNC] restore key=flashcards_v1 source=legacy_flashcards legacy_len=${String(cloudData['flashcards']).length}`);
      pairs.push(['flashcards_v1', String(cloudData['flashcards'])]);
    } else {
      // Ранний выход ветки: древнее поле проигнорировано — печатаем, ЧТО решило.
      console.log(`[LEGACY-V2-SYNC] restore legacy_flashcards ignored doc_field=${cloudData['flashcards_v1'] === undefined ? 'absent' : cloudData['flashcards_v1'] === null ? 'null' : 'present'} pages=${enPagesSource}`);
    }
  }
  if (cloudData['lang']) pairs.push(['app_lang', cloudData['lang']]);
  if (cloudData['user_avatar_frame']) pairs.push(['user_frame', cloudData['user_avatar_frame']]);
  for (const key of dailyLessonHelperKeysForToday()) {
    const value = cloudData[key];
    if (value !== null && value !== undefined) {
      pairs.push([key, cloudProgressStorageValue(key, value)]);
    }
  }
  // зачем (пункт (а), защита «последняя запись», ревью Opus): при отложенном восстановлении ключи, записанные
  // локально за время ожидания, облако не перезаписывает — в том числе язык, рамку и ежедневные ключи после цикла.
  // Не фильтруем ключи со своими правилами слияния (прочитаны в localLessonRestoreMap, достижения, страницы карточек,
  // серия) — они и так сохраняют локальное, а фильтр потерял бы облачные добавления. null — обычное восстановление.
  const bootDirtyKeys = peekBootRestoreDirtyKeys();
  const appliedPairs = bootDirtyKeys ? pairs.filter(([key, value]) => {
    if (!bootDirtyKeys.has(key)) return true;
    if (Object.prototype.hasOwnProperty.call(localLessonRestoreMap, key) || BOOT_DIRTY_GUARD_MERGED_KEYS.has(key)) return true;
    console.log('[RESTORE-DIRTY]', JSON.stringify({ key, action: 'keep_local', cloudLen: value.length }));
    return false;
  }) : pairs;
  if (bootDirtyKeys) console.log('[RESTORE-DIRTY]', JSON.stringify({ event: 'guard', dirtyKeys: bootDirtyKeys.size, kept: pairs.length - appliedPairs.length }));
  const finalPairs = await guardStreakPairs(appliedPairs, 'cloud_main');
  if (finalPairs.length > 0) {
    assertCurrent();
    await applyPersonalPlanRestorePairs(finalPairs);
    assertCurrent();
    if (cloudHasVipEntitlementState) invalidatePremiumCache();
  }
  // зачем (8J): чтение подтвердило облако (или источник — поле документа), локальное уже
  // записано выше — запись страниц этого ключа снова разрешена.
  await unlockFlashcardPagesAfterRestore(flashcardPagesRestore.unlockKeys, assertCurrent);
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
  await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(buildRestoreSnapshot(cloudData))).catch(swallowError('cloud_sync:applyRestoreFromUserDoc'));
  assertCurrent();
  return completeRestore(true);
}

// зачем (координатор 11.10, «сперва логи»): [BOOT-RESTORE-STEP] показал стадию apply 25–44 с при пустом госте.
// Внутри ~40 ожиданий хранилища подряд (часть — по ключу в цикле). Отметки at:<шаг> ставятся ПЕРЕД шагом: число у
// отметки = время, потраченное до неё (на предыдущий шаг). Одна строка на вызов; логика не меняется.
async function applyRestoreFromUserDoc(
  doc: { exists: boolean; data: () => Record<string, unknown> | undefined },
  isCurrent: () => boolean = () => true,
  afterLegacyRestore?: (root: Record<string, unknown>) => void,
  vipGeneration?: AccountGenerationToken,
): Promise<boolean> {
  const startedAt = Date.now();
  const points: Record<string, number> = {};
  // Сборки мусора за шаг (счётчик общий на приложение: у параллельной работы дельта шире самого шага).
  const gcPoints: Record<string, string | null> = {};
  let pointAt = startedAt;
  let gcAt = gcSnapshot();
  let lastPoint = 'start';
  const applyMark = (point: string) => {
    const now = Date.now();
    const gcNow = gcSnapshot();
    points[point] = now - pointAt;
    gcPoints[point] = gcDelta(gcAt, gcNow);
    pointAt = now;
    gcAt = gcNow;
    lastPoint = point;
  };
  let applied: boolean | null = null;
  let thrown: unknown = null;
  try {
    applied = await applyRestoreFromUserDocTraced(doc, isCurrent, afterLegacyRestore, vipGeneration, applyMark);
    return applied;
  } catch (error) {
    thrown = error;
    throw error;
  } finally {
    console.log('[BOOT-RESTORE-APPLY]', JSON.stringify({
      totalMs: Date.now() - startedAt,
      tailMs: Date.now() - pointAt,
      lastPoint,
      points,
      gc: gcPoints,
      tailGc: gcDelta(gcAt, gcSnapshot()),
      applied,
      ...(thrown ? { thrown: String(thrown).slice(0, 160) } : {}),
    }));
  }
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
  await migrateLegacyFreeLessonAccessForAllTargets(attempt.status).catch(swallowError('cloud_sync:completeLegacyLessonMigrationAfterRestore'));
  return attempt;
}

export async function restoreAndMigrateFromCloud(): Promise<boolean> {
  const attempt = await completeLegacyLessonMigrationAfterRestore(
    await restoreAndMigrateFromCloudResult(true),
  );
  return attempt.applied;
}

/**
 * Account V2, Пакет 8I — сброс клиентских ключей снимка синхронизации после затирания 8G.
 *
 * зачем: doSyncToCloud шлёт только разницу против cloud_last_sync_snapshot_v1. Снимок помнит,
 * что карточки/библиотека «уже в облаке», хотя дефект 8G их стёр, — и они не уехали бы, пока
 * человек сам их не изменит. Убираем из снимка только КЛИЕНТСКИЕ ключи, которых в облачном
 * progress нет: следующий обычный синк переотправит ровно их. Серверные ключи не трогаем —
 * клиент их не пишет (их вернёт progressReseedMissing).
 */
async function resetWipedClientKeysInLastSyncSnapshot(
  cloudProgress: Readonly<Record<string, unknown>>,
  isCurrent: () => boolean,
): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_SYNC_SNAPSHOT_KEY);
  // зачем (ревью 8I): пока читали снимок, мог смениться аккаунт — тогда снимок уже чужой, не пишем.
  if (!isCurrent()) {
    console.log('[PROGRESS-RESEED] skip reason=stale_account_generation stage=snapshot_reset');
    return null;
  }
  if (!raw) return 0;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 0;
  const next: Record<string, unknown> = {};
  let removed = 0;
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isServerOwnedProgressKey(key) && !Object.prototype.hasOwnProperty.call(cloudProgress, key)) {
      removed += 1;
      continue;
    }
    next[key] = value;
  }
  if (removed > 0) await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(next));
  return removed;
}

/**
 * Account V2, Пакет 8I — после restore: признак затирания 8G → один вызов дозаливки.
 * Локальная часть (проверка + сброс снимка) ждётся, сетевой вызов — нет: restore и первый кадр
 * не ждут сервер. Ошибки не роняют restore, причина — в логе [PROGRESS-RESEED] (без uid).
 */
async function maybeReseedWipedProgressAfterRestore(
  root: Readonly<Record<string, unknown>>,
  stableId: string,
  isCurrent: () => boolean,
): Promise<'skipped' | 'reseed_started'> {
  if (root.progressServerAuthoritative !== true) {
    console.log(`[PROGRESS-RESEED] skip reason=not_authoritative flag=${String(root.progressServerAuthoritative)}`);
    return 'skipped';
  }
  if (phoneStateOwnsCoreProgress(stableId)) {
    console.log('[PROGRESS-RESEED] skip reason=phone_state_owns_core');
    return 'skipped';
  }
  const cloudProgress = root.progress && typeof root.progress === 'object' && !Array.isArray(root.progress)
    ? root.progress as Record<string, unknown>
    : {};
  const progressEventsClient = await import('./progress_events_client');
  const need = await progressEventsClient.detectProgressReseedNeed(stableId, cloudProgress);
  if (!need) return 'skipped';
  if (!isCurrent()) {
    console.log('[PROGRESS-RESEED] skip reason=stale_account_generation');
    return 'skipped';
  }
  const removed = await resetWipedClientKeysInLastSyncSnapshot(cloudProgress, isCurrent);
  if (removed === null) return 'skipped';
  console.log(`[PROGRESS-RESEED] client_snapshot_reset removed_keys=${removed}`);
  void progressEventsClient.submitProgressReseed(stableId, need.snapshot).catch((error: unknown) => {
    console.warn(`[PROGRESS-RESEED] submit_unexpected_error reason=${String(error).slice(0, 160)}`);
  });
  return 'reseed_started';
}

async function restoreAndMigrateFromCloudResultTraced(
  syncMissingDocument: boolean,
  options: CloudRestoreOptions,
  mark: (stage: string) => void,
): Promise<CloudRestoreAttempt> {
  if (!CLOUD_SYNC_ENABLED) return failedCloudRestoreAttempt('transport_unavailable');
  const db = getFirestore();
  if (!db) return failedCloudRestoreAttempt('transport_unavailable');
  const uid = await ensureAnonUser();
  mark('anon');
  if (!uid) return failedCloudRestoreAttempt('identity_unavailable');
  beginInitialAccountGeneration(uid);
  const accountGeneration = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(accountGeneration, uid);
  if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
  try {
    const stableLink = await ensureStableAuthLinkForStableIdDetailed(uid);
    mark('stable_link');
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
    mark('user_doc_read');
    markBootRestoreUserDocRead();
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    // зачем (п.70 №2): проверка бана берёт `banned` из этого же документа, а не читает users/{uid} второй раз.
    // Та же трактовка, что у проверки бана в корне: любое истинное значение поля = бан.
    noteRestoreUserDocBanned(uid, doc.exists ? !!(doc.data() as { banned?: unknown } | undefined)?.banned : false);
    const migrated = await AsyncStorage.getItem('cloud_migration_v1');
    mark(doc.exists ? 'migration_flag' : 'migration_flag:no_doc');
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    if (!doc.exists) {
      if (!migrated && syncMissingDocument) {
        await syncToCloud();
        mark('sync_missing_doc');
        if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
        await AsyncStorage.setItem('cloud_migration_v1', '1').catch(swallowError('cloud_sync:restoreAndMigrateFromCloudResult'));
      }
      return { status: 'not_found', applied: false, failureReason: null };
    }
    if (!migrated) {
      await AsyncStorage.setItem('cloud_migration_v1', '1').catch(swallowError('cloud_sync:restoreAndMigrateFromCloudResult'));
      if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    }
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    // зачем (владелец 11.10, журнал 16; §CORE-0165): документ users/{uid} уже прочитан — засеваем из него кэш подарков
    // и копию срока лояльности, чтобы проверка доступа не читала тот же документ второй раз (до 4,2 с на холодном старте).
    void import('./gift_access_cloud')
      .then((m) => m.seedGiftAccessCacheFromProgress(uid, (doc.data() as { progress?: unknown } | undefined)?.progress))
      .catch(swallowError('cloud_sync:seedGiftAccess'));
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
    mark('apply');
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    // зачем (Account V2, 8I): затёртый 8G облачный progress дозаливается один раз с телефона.
    // Fail-soft: дозаливка никогда не роняет restore.
    try {
      await maybeReseedWipedProgressAfterRestore(doc.data() ?? {}, uid, isCurrent);
    } catch (error) {
      console.warn(`[PROGRESS-RESEED] restore_hook_failed reason=${String(error).slice(0, 160)}`);
    }
    mark('reseed');
    if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    // зачем (координатор 11.10): серверное восстановление ошибок — только нужные языки (первый раз на устройстве — все,
    // затем активный + языки с локальным журналом; app/mistake_restore_targets.ts). Награды — по всем, как раньше.
    const mistakeRestore = await resolveMistakeRestoreTargets(uid, SYNC_STUDY_TARGETS);
    mark('mistake_restore_select');
    for (const target of SYNC_STUDY_TARGETS) {
      if (mistakeRestore.targets.includes(target)) {
        await restoreMistakePracticeEvents({ accountScope: uid, studyTarget: target });
        mark(`mistake_events:${target}`);
        if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
      }
      // Async import keeps the reward/economy graph outside the cloud-sync and
      // lessons startup bundles while preserving the initialization-cycle guard.
      const { flushPendingMistakeCorrectionRewards } = await import('./mistake_practice_rewards');
      await flushPendingMistakeCorrectionRewards({ accountScope: uid, studyTarget: target });
      mark(`mistake_rewards:${target}`);
      if (!isCurrent()) return failedCloudRestoreAttempt('identity_unavailable');
    }
    if (mistakeRestore.reason === 'full_first_restore') await markMistakeFullRestoreDone(uid);
    return completedCloudRestoreAttempt(applied);
  } catch (error) {
    // Немой переход в «failed» запрещён: текст ошибки — в журнал, иначе причину 70-секундного провала не видно.
    console.warn('[BOOT-RESTORE-STEP] error', String(error).slice(0, 160));
    return failedCloudRestoreAttempt(
      cloudRestoreFailureForStableLink(classifyCloudAccessFailure(error)),
    );
  }
}

// зачем (координатор 11.10, «сперва логи»): [BOOT-RESTORE] показал restoreMs=71551 у ПУСТОГО гостя, а шагов внутри не
// было видно. Одна строка на вызов: время каждой стадии, последняя пройденная стадия (по ней виден ранний выход),
// status и failureReason. Логика восстановления не меняется — только замер.
async function restoreAndMigrateFromCloudResult(
  syncMissingDocument: boolean,
  options: CloudRestoreOptions = {},
): Promise<CloudRestoreAttempt> {
  const startedAt = Date.now();
  const stages: Record<string, number> = {};
  const gcStages: Record<string, string | null> = {};
  let stageAt = startedAt;
  let gcStageAt = gcSnapshot();
  let lastStage = 'start';
  const mark = (stage: string) => {
    const now = Date.now();
    const gcNow = gcSnapshot();
    stages[stage] = now - stageAt;
    gcStages[stage] = gcDelta(gcStageAt, gcNow);
    stageAt = now;
    gcStageAt = gcNow;
    lastStage = stage;
  };
  let attempt: CloudRestoreAttempt | null = null;
  let thrown: unknown = null;
  try {
    attempt = await restoreAndMigrateFromCloudResultTraced(syncMissingDocument, options, mark);
    return attempt;
  } catch (error) {
    thrown = error;
    throw error;
  } finally {
    console.log('[BOOT-RESTORE-STEP]', JSON.stringify({
      totalMs: Date.now() - startedAt,
      syncMissingDocument,
      lastStage,
      stages,
      gc: gcStages,
      status: attempt?.status ?? null,
      failureReason: attempt?.failureReason ?? null,
      ...(thrown ? { thrown: String(thrown).slice(0, 160) } : {}),
    }));
  }
}

// ── Восстановить прогресс из облака ─────────────────────────────────────────
// Вызывается при старте приложения ПОСЛЕ того как определён uid.
// Если локальный legacy reward > облачного — локальные данные побеждают (не перезаписываем).
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
  maybeReseedWipedProgressAfterRestore,
  adoptAuthoritativeStableIdentity,
  classifyCloudAccessFailure,
  cloudRestoreFailureForStableLink,
  completedCloudRestoreAttempt,
  applyRestoreFromUserDoc,
  mergeLessonRestoreValue,
  isMonotonicLessonRestoreKey,
  mergeOwnedFlagMap,
  mergeOwnedRestoreValue,
  isOwnedUnionRestoreKey,
  buildRestoreSnapshot,
  getUtcWeekStartIso,
  getUtcIsoWeekId,
  buildStickyServerProgressPairs,
  buildGiftEntitlementStickyPairs,
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

export type ForceSyncRefusalCode =
  | 'inflight_timeout'
  | 'identity_mismatch'
  | 'identity_unavailable'
  | 'stale_generation'
  | 'flashcards_upload_failed'
  | 'upload_failed';

export type ForceSyncOptions = Readonly<{
  /** AA S2d 🔴2: false — при расхождении личности НЕ делать adopt (presync входа). */
  adoptOnIdentityMismatch?: boolean;
  /** Причина отказа (код без идентификаторов) — для понятного кода в UI и логов. */
  onRefusal?: (code: ForceSyncRefusalCode) => void;
}>;

const FORCE_SYNC_DEFERRED_RESTORE_WAIT_MS = 5_000;

export async function forceSyncToCloud(options: ForceSyncOptions = {}): Promise<boolean> {
  const refuse = (code: ForceSyncRefusalCode): false => {
    try {
      options.onRefusal?.(code);
    } catch (error) {
      noteSwallowed('cloud_sync:force_sync_refusal_report', error);
    }
    return false;
  };
  if (!CLOUD_SYNC_ENABLED) return true; // в Expo Go считаем что "локально и так всё"
  const db = getFirestore();
  if (!db) return refuse('identity_unavailable');
  const uid = await ensureAnonUser();
  if (!uid) return refuse('identity_unavailable');
  beginInitialAccountGeneration(uid);
  const forceGeneration = captureAccountGeneration();
  const isForceGenerationCurrent = () => isCurrentAccountGeneration(forceGeneration, uid);
  if (!isForceGenerationCurrent()) return refuse('stale_generation');
  // зачем (пункт (а), ревью Opus ×2): предотправка (перед выходом/сменой) не должна отправить локальное поверх облака,
  // которое отложенное восстановление ещё не прочитало. Ждём ТОЛЬКО если оно ещё не стартовало, и только до чтения
  // документа (потолок 5 с) — ожидание до конца применения съедало 20 с предотправки и роняло вход через Google.
  if (isDeferredBootRestoreWaiting()) {
    requestDeferredBootRestoreStart('force_sync');
    const deferredWait = await whenDeferredBootRestoreDocRead(FORCE_SYNC_DEFERRED_RESTORE_WAIT_MS);
    console.log('[BOOT-RESTORE-DEFER]', JSON.stringify({ event: 'force_sync_waited', outcome: deferredWait }));
    if (!isForceGenerationCurrent()) return refuse('stale_generation');
  }
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
      } catch (inflightError) {
        pendingSync = false;
        // зачем (AA S2d раунд 2): прежде немой catch под __DEV__ — в релизе отказ
        // принудительной выгрузки (выход/смена аккаунта/presync входа) был невидим.
        console.warn('[SYNC-DENY] forceSyncToCloud inflight_timeout', {
          waitMs: FORCE_SYNC_WAIT_INFLIGHT_MS,
          reason: inflightError instanceof Error ? inflightError.message.slice(0, 80) : typeof inflightError,
        });
        DebugLogger.error(
          'cloud_sync:force_sync_inflight_timeout',
          inflightError instanceof Error ? inflightError : new Error(String(inflightError)),
          'warning',
        );
        return refuse('inflight_timeout');
      }
    }
    const authoritativeIdentity = await ensureAuthoritativeIdentityForCloudMutation(uid, {
      adoptOnMismatch: options.adoptOnIdentityMismatch !== false,
    });
    if (!authoritativeIdentity.ok || authoritativeIdentity.stableUid !== uid || !isForceGenerationCurrent()) {
      pendingSync = false;
      // зачем (AA S2d 🔴2): различимая причина — presync входа превращает её в
      // понятный отказ вместо «молча ничего не выгрузили, но успех».
      if (authoritativeIdentity.mismatch) return refuse('identity_mismatch');
      if (!authoritativeIdentity.ok) return refuse('identity_unavailable');
      return refuse('stale_generation');
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
      // Server-owned ключи — та же причина: пишет только CF.
      else if (isServerOwnedProgressKey(key)) delete data[key];
    }
    // зачем (Account V2, Пакет 7A): как в doSyncToCloud — при активном выключателе
    // V2-домены (карточки/свайпы/библиотека) в старое облако не переносятся; их
    // outbox V2 живёт в области uid и уйдёт сам. Неактивно → тот же объект.
    const forceData = omitDevFixtureCardKeys(
      omitAccountsV2LegacyDomains(data, 'write', isAccountsV2LegacySwitchFlagOn()
        && await resolveAccountsV2LegacySkip('write', getAuthUserId())),
      await isDevFixtureNoUploadActive(getAuthUserId()),
      'force_sync',
    );
    if (!isForceGenerationCurrent()) {
      console.log('[LEGACY-V2-SYNC] force_sync aborted reason=stale_generation stage=before_flashcards');
      pendingSync = false;
      return refuse('stale_generation');
    }
    // зачем (Account V2, 8K): прежде перенос клал progress.flashcards_v1 (и fr) ЦЕЛИКОМ в
    // документ и заново создавал затеняющую копию (8H/8H-2) — restore на другом устройстве
    // брал её вместо страниц. Теперь карточки идут ТЕМ ЖЕ путём, что в doSyncToCloud:
    // страницы → поле документа null; сбой страниц → список в документ как раньше;
    // запертый ключ (8J) — никуда.
    // зачем (ревью 8K, C-1/C-2): выгрузка под тем же потолком, что запись документа
    // (без связи RN Firebase держит commit бесконечно — выход/смена аккаунта зависли бы),
    // а запертый ключ — отказ всего переноса: true означает «прогресс в облаке», после
    // него локальное стирается, и карточки, добавленные под замком, пропали бы.
    const flashcardOutcome = await runForceFlashcardUpload({
      uid,
      data: forceData,
      isCurrent: isForceGenerationCurrent,
      timeoutMs: FORCE_SYNC_FIRESTORE_WRITE_MS,
    });
    if (!flashcardOutcome.ok) {
      // Ранний выход: документ не пишем; вызывающий сделает аварийную копию и отменит смену.
      console.log(`[LEGACY-V2-SYNC] force_sync result=false reason=${flashcardOutcome.reason}`);
      pendingSync = false;
      return refuse('flashcards_upload_failed');
    }
    const flashcardUpload = flashcardOutcome.plan;
    // зачем (AA 2.0, S1e): в страницах осталась облачная правка «из будущего», локальная версия в
    // облако не ушла, а после true телефон сотрут. Кладём её в ключ аккаунта — он едет в аварийную
    // копию того же владельца и возвращается при входе. Не сохранилось → отказ: стирать нельзя.
    if (!await stashForceFutureKeptLocalVersions(uid, flashcardUpload.remoteFutureKept)) {
      console.warn('[LEGACY-V2-SYNC] force_sync result=false reason=future_kept_stash_failed');
      pendingSync = false;
      return refuse('flashcards_upload_failed');
    }
    const forceDocProgress = buildDocProgressWithoutFlashcardLists(forceData, flashcardUpload);

    const now = Date.now();
    const docRef = db.collection('users').doc(uid);
    const createdAtSynced = await AsyncStorage.getItem(CREATED_AT_SYNC_KEY);
    const shouldSendCreatedAt = !createdAtSynced;
    // зачем: firebaseAuthUid — server-owned (см. комментарий в doSyncToCloud).
    // Здесь снятие критичнее: force-sync переносит прогресс при смене устройства,
    // а отклонённый set терял бы всю миграцию, а не один heartbeat.
    if (!isForceGenerationCurrent()) {
      pendingSync = false;
      return refuse('stale_generation');
    }
    // зачем (владелец 2026-09-02): та же авария, что в doSyncToCloud, и здесь она
    // ДОРОЖЕ — это перенос прогресса при смене устройства. `set` с вложенной
    // картой заменял progress ЦЕЛИКОМ, поэтому вырезанные выше запрещённые ключи
    // (chain_shield, user_total_xp, streak_count…) выглядели для правил как
    // УДАЛЁННЫЕ, попадали в affectedKeys() и рубили запись вместе со всей
    // миграцией. Точечное обновление трогает только присланные ключи.
    await withTimeout(
      writeUserDocWithNestedProgress(
        docRef,
        {
          ...(data['user_avatar'] ? { user_avatar: data['user_avatar'] } : {}),
          ...(data['user_avatar_frame'] ? { user_avatar_frame: data['user_avatar_frame'] } : {}),
          updatedAt: now,
          last_active_at: now,
          ...(shouldSendCreatedAt ? { created_at: now } : {}),
        },
        forceDocProgress,
      ),
      FORCE_SYNC_FIRESTORE_WRITE_MS,
      'firestore_set',
    );
    lastSuccessfulSyncAt = now;
    lastActivityStampAt = now;
    pendingSync = false;
    await AsyncStorage.setItem(
      LAST_SYNC_SNAPSHOT_KEY,
      JSON.stringify(buildForceSyncSnapshot(forceData, flashcardUpload)),
    ).catch(swallowError('cloud_sync:forceSyncToCloud'));
    if (shouldSendCreatedAt) {
      await AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(swallowError('cloud_sync:forceSyncToCloud'));
    }
    return true;
  } catch (e) {
    /**
     * зачем (владелец 2026-09-02): под `if (__DEV__)` этот отказ в сторовой
     * сборке не логировался ВООБЩЕ, а это перенос прогресса при смене
     * устройства — цена молчания здесь выше, чем у обычного такта синка.
     * Тот же класс бага, из-за которого отказ doSyncToCloud был невидим
     * месяцами. Логи в catch остаются навсегда.
     */
    const code = (e as { code?: string } | null)?.code ?? '';
    console.warn('[SYNC-DENY] forceSyncToCloud failed', {
      uid,
      code,
      reason: e instanceof Error ? e.message : String(e),
    });
    DebugLogger.error(
      'cloud_sync:force_sync_failed',
      e instanceof Error ? e : new Error(String(e)),
      'critical',
    );
    pendingSync = false;
    return refuse('upload_failed');
  }
}

// ── Очистка локального прогресса аккаунта ───────────────────────────────────
// Используется во flow "Сменить аккаунт" ПОСЛЕ успешного forceSyncToCloud.
// Удаляет всё что относится к юзеру/прогрессу, но СОХРАНЯЕТ настройки устройства
// (язык, тема, размер шрифта, haptics) — это per-device preferences, а не per-account.
//
// ВАЖНО: stable_id не трогаем тут — это делает clearStableId() в stable_id.ts.
/**
 * Отложить чужую аварийную копию в сторону, чтобы она НЕ блокировала выход.
 *
 * зачем (владелец, 2026-09-22): выход из аккаунта был заблокирован НАВСЕГДА с
 * `account_switch_backup_other_owner_pending` — в хранилище лежала аварийная
 * копия другого аккаунта, а забрать её может только её же владелец при входе
 * (`restoreAccountSwitchEmergencyBackupIfSafe` → `different_account`), либо
 * она протухает через 30 дней. Пока её нет — человек заперт в аккаунте.
 *
 * Копию НЕ удаляем: она может быть единственным следом чужого офлайн-прогресса.
 * Переименовываем ТОЛЬКО корневой ключ; страницы с данными не трогаем вообще
 * (и save ниже их больше не подчищает), поэтому содержимое остаётся целым.
 * Владелец получает её обратно сам: при его входе restoreAccountSwitchEmergencyBackupIfSafe
 * берёт самую свежую его полку, когда слот пуст или чужой (TG-0AE4918142EE).
 * Литерал префикса продублирован в app/account_switch_backup_restore.ts.
 */
const ACCOUNT_SWITCH_BACKUP_SHELVED_PREFIX = 'account_switch_emergency_backup_shelved_v1:';

type AccountSwitchBackupShelveReason =
  | 'normal_switch'
  | 'forced_switch'
  | 'merge_unconfirmed'
  | 'merge_fold_failed'
  | 'unspecified';

async function shelveOtherOwnerAccountSwitchBackup(
  previousBackupRaw: string,
  otherOwnerStableId: string,
  reason: AccountSwitchBackupShelveReason,
): Promise<void> {
  const shelvedKey = `${ACCOUNT_SWITCH_BACKUP_SHELVED_PREFIX}${otherOwnerStableId}:${Date.now().toString(36)}`;
  // Сначала пишем копию под новым именем и только потом снимаем старый корень —
  // при обрыве между операциями остаются ОБА, а не ноль.
  await AsyncStorage.setItem(shelvedKey, previousBackupRaw);
  const verify = await AsyncStorage.getItem(shelvedKey);
  if (verify !== previousBackupRaw) {
    throw new Error('account_switch_backup_shelve_verification_failed');
  }
  await AsyncStorage.removeItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
  let inventory: ShelvedBackupInventory = { count: -1, bytes: -1, evicted: 0 };
  try {
    inventory = await enforceShelvedBackupCap(shelvedKey);
  } catch (error) {
    // Потолок — забота о месте, а не о данных: сбой не отменяет уже отложенную копию.
    console.warn(`[ACC-MUT] backup:shelf_cap_failed code=${identityErrorCode(error)}`);
  }
  console.warn(
    // зачем (AA S2d, ревью): без сырого stableId — метка identityTag; ключ несёт id
    // владельца в имени, поэтому в лог идёт только его метка времени.
    `[ACC-MUT] backup:shelved_other_owner reason=${reason} owner=${identityTag(otherOwnerStableId)} stamp=${shelvedKey.slice(shelvedKey.lastIndexOf(':') + 1)} bytes=${previousBackupRaw.length} shelfCount=${inventory.count} shelfBytes=${inventory.bytes} evicted=${inventory.evicted}`,
  );
}

/**
 * Потолок полок на телефоне. зачем (ревью TG-92BAE5BC536D, MEDIUM 2): каждая полка —
 * полная копия аккаунта (до 512 страниц, потолок копии 128 МБ), а база хранилища на
 * Android — 64 МБ (android/gradle.properties AsyncStorage_db_size_in_MB). Без потолка
 * чередование аккаунтов копило бы полки, пока база не упрётся в предел и не начнёт
 * отказывать в записи ЖИВЫМ данным. 3 полки и 16 МБ в сумме оставляют ≥48 МБ живым
 * данным и слоту; только что отложенная полка не вытесняется никогда (её владелец
 * иначе теряет всё) — даже если одна весит больше 16 МБ, вытесняются остальные.
 */
const SHELVED_BACKUP_MAX_COUNT = 3;
const SHELVED_BACKUP_MAX_TOTAL_BYTES = 16 * 1024 * 1024;

type ShelvedBackupInventory = Readonly<{ count: number; bytes: number; evicted: number }>;

/** Что о корне копии нужно для места и страниц (без полной проверки цепочки). */
type LooseBackupRoot = Readonly<{ backupId: string | null; pageCount: number; dataBytes: number }>;

function looseBackupRoot(raw: string | null): LooseBackupRoot {
  if (raw === null) return { backupId: null, pageCount: 0, dataBytes: 0 };
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; backupId?: unknown; pageCount?: unknown; totalUtf8Bytes?: unknown };
    if (parsed.version !== 3 || typeof parsed.backupId !== 'string' || !/^[a-z0-9-]{3,80}$/.test(parsed.backupId)) {
      return { backupId: null, pageCount: 0, dataBytes: 0 };
    }
    return {
      backupId: parsed.backupId,
      pageCount: Number.isSafeInteger(parsed.pageCount)
        ? Math.max(0, Math.min(Number(parsed.pageCount), ACCOUNT_SWITCH_BACKUP_MAX_PAGES)) : 0,
      dataBytes: Number.isSafeInteger(parsed.totalUtf8Bytes) ? Math.max(0, Number(parsed.totalUtf8Bytes)) : 0,
    };
  } catch (error) {
    console.warn(`[ACC-MUT] backup:shelf_root_unparsable code=${identityErrorCode(error)}`);
    return { backupId: null, pageCount: 0, dataBytes: 0 };
  }
}

/**
 * Держит ли ещё какой-то корень (слот или другая полка из `otherShelfKeys`) страницы
 * этого backupId. зачем (ревью TG-2307361A2567, 2б): после обрыва бывают дубли — два
 * корня на одни страницы; снятие старшего дубля не должно оставить младшего оболочкой.
 */
async function backupPagesHeldElsewhere(
  backupId: string,
  otherShelfKeys: readonly string[],
): Promise<'slot' | 'shelf' | 'unreadable' | null> {
  if (looseBackupRoot(await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY)).backupId === backupId) return 'slot';
  for (const key of otherShelfKeys) {
    try {
      if (looseBackupRoot(await AsyncStorage.getItem(key)).backupId === backupId) return 'shelf';
    } catch (error) {
      // Не прочли соседний корень — считаем, что он может делить страницы (безопасная сторона).
      console.warn(`[ACC-MUT] backup:shelf_neighbour_unreadable code=${identityErrorCode(error)}`);
      return 'unreadable';
    }
  }
  return null;
}

/**
 * Снять полку вместе со страницами v3. Страницы, которые делит слот или любая из
 * оставшихся полок (`otherShelfKeys`, тот же backupId), не трогаем.
 */
async function removeShelvedBackupWithPages(key: string, otherShelfKeys: readonly string[]): Promise<number> {
  const root = looseBackupRoot(await AsyncStorage.getItem(key));
  let removedPages = 0;
  if (root.backupId !== null && root.pageCount > 0) {
    const holder = await backupPagesHeldElsewhere(root.backupId, otherShelfKeys.filter((other) => other !== key));
    if (holder !== null) {
      console.warn(`[ACC-MUT] backup:shelf_pages_kept reason=shared_with_${holder}`);
    } else {
      for (let offset = 0; offset < root.pageCount; offset += 128) {
        await AsyncStorage.multiRemove(Array.from(
          { length: Math.min(128, root.pageCount - offset) },
          (_, pageIndex) => `${ACCOUNT_SWITCH_BACKUP_PAGE_PREFIX}${root.backupId}:${offset + pageIndex}`,
        ));
      }
      removedPages = root.pageCount;
    }
  }
  await AsyncStorage.removeItem(key);
  return removedPages;
}

type ShelfDescriptor = Readonly<{
  key: string;
  stampedAt: number;
  backupId: string | null;
  rootBytes: number;
  dataBytes: number;
  /** Корень v3 без первой страницы: восстановить нельзя (оболочка до правки или дубль после долива). */
  shell: boolean;
}>;

async function describeShelf(key: string, raw: string): Promise<ShelfDescriptor> {
  const stamp = parseInt(key.slice(key.lastIndexOf(':') + 1), 36);
  const root = looseBackupRoot(raw);
  const shell = root.backupId !== null && root.pageCount > 0
    && await AsyncStorage.getItem(`${ACCOUNT_SWITCH_BACKUP_PAGE_PREFIX}${root.backupId}:0`) === null;
  return {
    key,
    // Ключ без читаемой метки считаем самым старым.
    stampedAt: Number.isSafeInteger(stamp) ? stamp : 0,
    backupId: root.backupId,
    rootBytes: utf8ByteLengthV1(raw),
    // Оболочка весит только корень: страниц, на которые указывает манифест, нет.
    dataBytes: shell ? 0 : root.dataBytes,
    shell,
  };
}

/**
 * Вытеснить полки сверх потолка (кроме `keepKey`). Порядок (ревью TG-2307361A2567, 2а):
 * оболочки снимаются всегда и первыми — они не восстановимы и не должны держать место
 * вместо живой полки; затем живые — самые старые первыми. Дубли (один backupId)
 * считаются в объёме один раз, а их общие страницы не снимаются, пока жив хоть один корень.
 */
async function enforceShelvedBackupCap(keepKey: string): Promise<ShelvedBackupInventory> {
  const keys = await AsyncStorage.getAllKeys();
  const shelfKeys = keys.filter((key) => key.startsWith(ACCOUNT_SWITCH_BACKUP_SHELVED_PREFIX));
  const shelves: ShelfDescriptor[] = [];
  for (const key of shelfKeys) {
    const raw = await AsyncStorage.getItem(key);
    if (raw !== null) shelves.push(await describeShelf(key, raw));
  }
  // Только что отложенная — первой, затем живые свежие, оболочки — в хвосте.
  shelves.sort((left, right) => (
    (right.key === keepKey ? 1 : 0) - (left.key === keepKey ? 1 : 0)
    || (left.shell ? 1 : 0) - (right.shell ? 1 : 0)
    || right.stampedAt - left.stampedAt
  ));
  let count = 0;
  let bytes = 0;
  const countedBackupIds = new Set<string>();
  const toEvict: Array<Readonly<{ shelf: ShelfDescriptor; reason: 'cap' | 'shell' }>> = [];
  for (const shelf of shelves) {
    const addBytes = shelf.rootBytes
      + (shelf.backupId !== null && countedBackupIds.has(shelf.backupId) ? 0 : shelf.dataBytes);
    const keep = shelf.key === keepKey || (!shelf.shell
      && count + 1 <= SHELVED_BACKUP_MAX_COUNT && bytes + addBytes <= SHELVED_BACKUP_MAX_TOTAL_BYTES);
    if (keep) {
      count += 1;
      bytes += addBytes;
      if (shelf.backupId !== null) countedBackupIds.add(shelf.backupId);
    } else {
      toEvict.push({ shelf, reason: shelf.shell ? 'shell' : 'cap' });
    }
  }
  // Оболочки — первыми (они уже в хвосте сортировки; снимаем их раньше живых).
  toEvict.sort((left, right) => (left.reason === 'shell' ? 0 : 1) - (right.reason === 'shell' ? 0 : 1));
  const present = new Set(shelfKeys);
  let evicted = 0;
  for (const { shelf, reason } of toEvict) {
    const owner = identityTag(shelf.key.slice(ACCOUNT_SWITCH_BACKUP_SHELVED_PREFIX.length, shelf.key.lastIndexOf(':')));
    try {
      const pages = await removeShelvedBackupWithPages(shelf.key, [...present]);
      present.delete(shelf.key);
      evicted += 1;
      // зачем (2в): в постоянный журнал — только метки и числа; человеку ничего не показываем.
      identityTrace('[ACC-SWITCH-WIPE]', `backup:shelf_evicted reason=${reason}`, {
        owner,
        stamp: shelf.stampedAt.toString(36),
        bytes: shelf.rootBytes + shelf.dataBytes,
        pages,
      }, { persist: true });
    } catch (error) {
      // Не смогли снять — она по-прежнему занимает место: учитываем в итоге.
      count += 1;
      bytes += shelf.rootBytes + shelf.dataBytes;
      identityTrace('[ACC-SWITCH-WIPE]', 'backup:shelf_evict_failed', {
        owner, stamp: shelf.stampedAt.toString(36), code: identityErrorCode(error),
      }, { persist: true });
    }
  }
  return { count, bytes, evicted };
}

/**
 * Отложить аварийную копию, только если она принадлежит `ownerStableId`.
 *
 * зачем (AA S2d раунд 3, §135 ❓2, ревью п.2): вход сохранил копию гостя A, но
 * серверный merge(A→B) НЕ подтверждён — долить её в B нельзя (чужие данные), а
 * оставленная в корне она блокировала бы «Сменить аккаунт» (other_owner_pending).
 * Переименование сохраняет содержимое (страницы не трогаются) — его можно вернуть
 * вручную через поддержку; чистит его pruneShelvedAccountSwitchBackups через 30 дней.
 */
export async function shelveAccountSwitchEmergencyBackupOf(ownerStableId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
  if (raw === null) return false;
  const identity = parsePreviousAccountSwitchBackupIdentity(raw);
  if (!identity || identity.stableId !== ownerStableId) {
    identityTrace('[AUTH-LINK-GOOGLE]', 'backup shelve_skipped', {
      reason: identity ? 'other_owner' : 'unparsable',
      owner: identityTag(identity?.stableId ?? null),
    });
    return false;
  }
  await shelveOtherOwnerAccountSwitchBackup(raw, ownerStableId, 'merge_unconfirmed');
  return true;
}

const SHELVED_BACKUP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Удалить отложенные копии старше 30 дней (вместе со страницами v3).
 *
 * зачем (AA S2d раунд 3, ревью п.2 — давняя утечка): отложенные копии
 * `account_switch_emergency_backup_shelved_v1:<owner>:<base36 ms>` жили вечно.
 * Возраст — по метке времени в ключе; ключ без метки не трогаем.
 */
const SHELVED_PRUNE_LAST_RUN_KEY = 'account_switch_shelved_prune_last_run_v1';
const SHELVED_PRUNE_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function pruneShelvedAccountSwitchBackups(
  nowMs: number = Date.now(),
  /**
   * Список ключей, уже прочитанный восстановлением копии в этом же входе.
   * зачем (ревью TG-92BAE5BC536D, LOW): один getAllKeys за вход вместо двух.
   */
  knownKeys?: readonly string[],
): Promise<number> {
  // зачем (AA S2d раунд 4, L-R3-4): getAllKeys по всему хранилищу — не на каждом входе;
  // раз в сутки достаточно для 30-дневного срока.
  try {
    const lastRunAt = parseInt(String(await AsyncStorage.getItem(SHELVED_PRUNE_LAST_RUN_KEY) ?? ''), 10);
    // зачем (ревью раунда 4, LOW-1): часы перевели назад (nowMs < lastRunAt) — порог считаем
    // пройденным, иначе очистка стояла бы, пока время не догонит записанное.
    if (Number.isFinite(lastRunAt) && lastRunAt > 0 && nowMs >= lastRunAt && nowMs - lastRunAt < SHELVED_PRUNE_MIN_INTERVAL_MS) return 0;
    await AsyncStorage.setItem(SHELVED_PRUNE_LAST_RUN_KEY, String(nowMs));
  } catch (error) {
    identityTrace('[AUTH-LINK-GOOGLE]', 'backup shelved_prune_throttle_failed', { code: identityErrorCode(error) });
  }
  let removed = 0;
  let failed = 0;
  let keys: readonly string[];
  try {
    keys = knownKeys ?? await AsyncStorage.getAllKeys();
  } catch (error) {
    identityTrace('[AUTH-LINK-GOOGLE]', 'backup shelved_prune_failed', { code: identityErrorCode(error), removed });
    return removed;
  }
  // TG-2307361A2567 (2б): оставшиеся полки — чтобы не снять страницы, общие с дублем.
  const presentShelves = new Set(keys.filter((key) => key.startsWith(ACCOUNT_SWITCH_BACKUP_SHELVED_PREFIX)));
  for (const [index, key] of keys.entries()) {
    if (!key.startsWith(ACCOUNT_SWITCH_BACKUP_SHELVED_PREFIX)) continue;
    const stampedAt = parseInt(key.slice(key.lastIndexOf(':') + 1), 36);
    if (!Number.isFinite(stampedAt) || stampedAt <= 0 || nowMs - stampedAt <= SHELVED_BACKUP_MAX_AGE_MS) continue;
    // зачем (L-R3-4): битый/нечитаемый ключ не останавливает очистку остальных;
    // ключ несёт id владельца — в лог идёт только его порядковый номер.
    try {
      // TG-92BAE5BC536D: общий помощник с вытеснением по потолку (страницы слота и
      // оставшихся дублей не трогает).
      await removeShelvedBackupWithPages(key, [...presentShelves]);
      presentShelves.delete(key);
      removed += 1;
    } catch (error) {
      failed += 1;
      identityTrace('[AUTH-LINK-GOOGLE]', 'backup shelved_prune_key_failed', { index, code: identityErrorCode(error) });
    }
  }
  if (removed > 0 || failed > 0) identityTrace('[AUTH-LINK-GOOGLE]', 'backup shelved_pruned', { removed, failed });
  return removed;
}

export type AccountSwitchEmergencyBackupSummary = Readonly<{
  stableId: string;
  /** Число сохранённых ключей (без значений). */
  pairCount: number;
  /** Объём копии в байтах UTF-8 (v3 — по манифесту, v1/v2 — по корню). */
  bytes: number;
}>;

/**
 * Сводка последней аварийной копии смены аккаунта (или null).
 *
 * зачем (AA S2d раунд 2, H-S2d-2): вход, не сумевший выгрузить прогресс гостя,
 * имеет право стереть его только ПОСЛЕ проверки, что копия реально лежит на
 * устройстве и принадлежит этому гостю. §134 координатора: в лог входа пишется
 * РАЗМЕР копии (ключи и байты, без значений). Только чтение.
 */
export async function readAccountSwitchEmergencyBackupSummary(): Promise<AccountSwitchEmergencyBackupSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
    if (raw === null) return null;
    const identity = parsePreviousAccountSwitchBackupIdentity(raw);
    if (!identity) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const pairCount = Number.isSafeInteger(parsed.pairCount)
      ? Number(parsed.pairCount)
      : Array.isArray(parsed.pairs) ? parsed.pairs.length : 0;
    const bytes = Number.isSafeInteger(parsed.totalUtf8Bytes)
      ? Number(parsed.totalUtf8Bytes)
      : utf8ByteLengthV1(raw);
    return { stableId: identity.stableId, pairCount, bytes };
  } catch (error) {
    identityTrace('[AUTH-LINK-GOOGLE]', 'backup summary_read_failed', { code: identityErrorCode(error) });
    return null;
  }
}

/** Сколько ждать замок смены аккаунта при доливании копии гостя из save (иначе — отложить). */
const MERGED_GUEST_BACKUP_LOCK_TIMEOUT_MS = 1_500;

/**
 * Копия гостя `owner` с меткой подтверждённого merge {from: owner, to: current}:
 * долить её в текущий аккаунт, а если замок занят (save зовут и под ним) или доливание
 * не удалось — отложить. true — корень копии освобождён (метка снята).
 */
async function foldMergedGuestBackupBeforeNewBackup(
  owner: string,
  current: string,
  previousBackupRaw: string,
): Promise<boolean> {
  const alias = await readAccountSwitchBackupMergeAlias();
  if (!alias || alias.from !== owner || alias.to !== current) return false;
  const restored = await restoreAccountSwitchEmergencyBackupIfSafe(undefined, {
    lockTimeoutMs: MERGED_GUEST_BACKUP_LOCK_TIMEOUT_MS,
    // зачем (TG-0AE4918142EE): посреди выхода нужен только слот с меткой merge —
    // полки текущего владельца в живое хранилище здесь не возвращаем.
    skipShelves: true,
  }).catch((error: unknown) => {
    identityTrace('[ACC-BACKUP-MERGE]', 'save fold_failed', { code: identityErrorCode(error) }, { persist: true });
    return null;
  });
  if (restored?.status === 'restored') {
    identityTrace('[ACC-BACKUP-MERGE]', 'save folded', { restoredKeys: restored.restoredKeys });
    return true;
  }
  if (await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY) === previousBackupRaw) {
    await shelveOtherOwnerAccountSwitchBackup(previousBackupRaw, owner, 'merge_fold_failed');
  }
  await clearAccountSwitchBackupMergeAlias('shelved_before_new_backup');
  identityTrace('[ACC-BACKUP-MERGE]', 'save shelved_instead', {
    status: restored?.status ?? 'failed',
    owner: identityTag(owner),
  }, { persist: true });
  return true;
}

/**
 * AA 2.0, S1e: значение одного ключа из аварийной копии ЭТОГО владельца (v3 — по страницам,
 * v1/v2 — из корня). null — ключа нет / копия чужая / не читается (причина в логе).
 *
 * зачем: новая копия того же владельца заменяет прежнюю целиком, а прежняя может нести локальные
 * версии карточек S1e, ещё не долитые обратно. Читаем только этот ключ — без проверки цепочки
 * хешей: значение лишь объединяется с живым, ничего не перезаписывает.
 */
export async function readOwnAccountSwitchBackupValue(
  previousBackupRaw: string,
  ownerStableId: string,
  key: string,
): Promise<string | null> {
  try {
    const root = JSON.parse(previousBackupRaw) as Record<string, unknown>;
    if (root.stableId !== ownerStableId) {
      identityTrace('[ACC-SWITCH-WIPE]', 'backup carry_skipped', { reason: 'other_owner' });
      return null;
    }
    if (root.version === 1 || root.version === 2) {
      const pair = (Array.isArray(root.pairs) ? root.pairs : []).find((item: unknown) => (
        Array.isArray(item) && item[0] === key && typeof item[1] === 'string'
      )) as [string, string] | undefined;
      return pair?.[1] ?? null;
    }
    const pageCount = Number(root.pageCount);
    if (root.version !== 3 || typeof root.backupId !== 'string' || !Number.isSafeInteger(pageCount)
      || pageCount < 0 || pageCount > ACCOUNT_SWITCH_BACKUP_MAX_PAGES) {
      identityTrace('[ACC-SWITCH-WIPE]', 'backup carry_skipped', { reason: 'root_shape' });
      return null;
    }
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const pageRaw = await AsyncStorage.getItem(`${ACCOUNT_SWITCH_BACKUP_PAGE_PREFIX}${root.backupId}:${pageIndex}`);
      if (pageRaw === null) {
        identityTrace('[ACC-SWITCH-WIPE]', 'backup carry_skipped', { reason: 'page_missing', pageIndex });
        return null;
      }
      const page = JSON.parse(pageRaw) as { backupId?: unknown; stableId?: unknown; pairs?: unknown };
      if (page.backupId !== root.backupId || page.stableId !== ownerStableId || !Array.isArray(page.pairs)) {
        identityTrace('[ACC-SWITCH-WIPE]', 'backup carry_skipped', { reason: 'page_shape', pageIndex });
        return null;
      }
      const pair = page.pairs.find((item: unknown) => Array.isArray(item) && item[0] === key) as unknown[] | undefined;
      if (pair !== undefined) return typeof pair[1] === 'string' ? pair[1] : null;
    }
    return null;
  } catch (error) {
    identityTrace('[ACC-SWITCH-WIPE]', 'backup carry_read_failed', { code: identityErrorCode(error) });
    return null;
  }
}

/**
 * AA 2.0, S1e-2 (п.2): перед стиранием аккаунта — лежит ли непустой ключ S1e в аварийной копии
 * владельца. Нет (presync гостя с успешной выгрузкой: свап без копии) → лог числа записей.
 * Только наблюдение: стирание не останавливает, сбой проверки — в лог.
 */
async function noteFutureKeptStashBeforeWipe(ownerStableId: string | null): Promise<void> {
  try {
    const stashRaw = await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY);
    // Ключа нет — обычный случай, проверять нечего.
    if (stashRaw === null) return;
    const backupRaw = await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
    const inBackup = backupRaw !== null && ownerStableId !== null
      && await readOwnAccountSwitchBackupValue(backupRaw, ownerStableId, FLASHCARD_FUTURE_KEPT_STASH_KEY) !== null;
    logFutureKeptStashBeforeWipe(stashRaw, inBackup);
  } catch (error) {
    identityTrace('[ACC-SWITCH-WIPE]', 'future_kept_stash_check_failed', { code: identityErrorCode(error) });
  }
}

export async function saveAccountSwitchEmergencyBackup(
  reason: string,
  expectedStableId?: string,
  options?: {
    /**
     * Разрешить отложить чужую копию на полку. Передаёт выход из аккаунта
     * (signOutAndWipeForAccountSwitch) — и штатный, и форсированный.
     * зачем (TG-0AE4918142EE): раньше штатный выход отказывал
     * (`account_switch_backup_other_owner_pending`), AccountLogoutFlow тут же шёл в
     * форсированный выход БЕЗ синхронизации, а полку никто не доставал. Теперь полку
     * возвращает её владельцу restoreAccountSwitchEmergencyBackupIfSafe, поэтому
     * откладывать безопасно. Без флага (вход с копией гостя, clean-install) — прежний отказ.
     */
    allowShelveOtherOwnerBackup?: boolean;
    /** Для лога `backup:shelved_other_owner reason=…`: какой путь отложил копию. */
    shelveReason?: 'normal_switch' | 'forced_switch';
  },
): Promise<boolean> {
  if (await isAccountDeleteIdentityQuarantined()) return false;
  const stableId = await getCanonicalUserId();
  if (!stableId || (expectedStableId && stableId !== expectedStableId)) {
    throw new Error('account_switch_backup_identity_unavailable');
  }
  let previousBackupRaw = await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
  // зачем (AA S2d раунд 4, L-R3-3): копия гостя A с меткой подтверждённого merge
  // {from: A, to: текущий} не чужая — сначала доливаем её (или откладываем), потом пишем новую.
  if (previousBackupRaw !== null && previousBackupRaw.length <= ACCOUNT_SWITCH_BACKUP_PAGE_MAX_BYTES) {
    const owner = parsePreviousAccountSwitchBackupIdentity(previousBackupRaw)?.stableId ?? null;
    if (owner && owner !== stableId && await foldMergedGuestBackupBeforeNewBackup(owner, stableId, previousBackupRaw)) {
      previousBackupRaw = await AsyncStorage.getItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY);
    }
  }
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
  // Копию другого владельца отложили на полку: её страницы теперь принадлежат полке.
  let shelvedPreviousBackup = false;
  if (previousBackupRaw !== null && previousBackupIdentity !== null
    && previousBackupIdentity.stableId !== stableId) {
    // Ранний выход: копия принадлежит ДРУГОМУ аккаунту. Без разрешения (вход с копией
    // гостя, clean-install) — отказ; выход из аккаунта откладывает её на полку, откуда
    // её вернёт себе владелец при входе (TG-0AE4918142EE).
    if (options?.allowShelveOtherOwnerBackup !== true) {
      console.warn(
        // зачем (AA S2d, ревью): без сырых stableId — только метки identityTag.
        `[ACC-MUT] backup:other_owner_blocked owner=${identityTag(previousBackupIdentity.stableId)} current=${identityTag(stableId)} reason=${reason}`,
      );
      throw new Error('account_switch_backup_other_owner_pending');
    }
    await shelveOtherOwnerAccountSwitchBackup(
      previousBackupRaw,
      previousBackupIdentity.stableId,
      options?.shelveReason ?? 'unspecified',
    );
    shelvedPreviousBackup = true;
  }
  // зачем (AA 2.0, S1e): прежняя копия ТОГО ЖЕ владельца заменяется целиком — её локальные версии
  // карточек (ещё не долитые) объединяем с живыми в новой копии, а не затираем.
  const carriedFutureKeptStash = previousBackupRaw !== null && previousBackupIdentity?.stableId === stableId
    ? await readOwnAccountSwitchBackupValue(previousBackupRaw, stableId, FLASHCARD_FUTURE_KEPT_STASH_KEY)
    : null;
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
      for (const [key, liveValue] of rows) {
        // S1e: ключ локальных версий карточек — живое значение + записи прежней копии владельца.
        const value = key === FLASHCARD_FUTURE_KEPT_STASH_KEY
          ? mergeFutureKeptStashRaw(liveValue, carriedFutureKeptStash)
          : liveValue;
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
    // зачем (TG-0AE4918142EE): страницы ОТЛОЖЕННОЙ чужой копии не трогаем — их корень
    // теперь на полке, и без страниц полка v3 не восстановима (так полка A оставалась
    // пустой оболочкой после выхода Б).
    if (shelvedPreviousBackup) {
      console.warn(`[ACC-MUT] backup:previous_pages_kept reason=shelved owner=${identityTag(previousBackupIdentity?.stableId ?? null)}`);
    } else if (previousBackupRaw !== null) {
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
      // зачем (TG-0AE4918142EE): отложенная чужая копия уже проверенно лежит на полке —
      // возвращать её корень ещё и в слот значит держать дубль с теми же страницами
      // (долив слота снял бы страницы, и полка стала бы пустой оболочкой).
      if (previousBackupRaw == null || shelvedPreviousBackup) {
        if (shelvedPreviousBackup) console.warn('[ACC-MUT] backup:rollback_slot_cleared reason=previous_shelved');
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

// зачем (прогон 11.10, «сперва логи»): стирание держало замок аккаунта 32 с из 74 с смены аккаунта,
// а по какому шагу — не видно. Каждая стадия пишет длительность и число ключей; одна итоговая строка
// [ACC-SWITCH-WIPE] wipe_stages на всё стирание (и при сбое — с последней дошедшей стадией).
type WipeStageTimings = Record<string, number>;
let activeWipeStages: WipeStageTimings | null = null;
let activeWipeStageAt = 0;
function markWipeStage(stage: string, count?: number): void {
  if (!activeWipeStages) return;
  const now = identityTraceClockMs();
  activeWipeStages[`${stage}Ms`] = now - activeWipeStageAt;
  if (typeof count === 'number') activeWipeStages[`${stage}Keys`] = count;
  activeWipeStageAt = now;
}

/**
 * Заранее подгрузить модули цепочки стирания аккаунта (выход / смена аккаунта).
 * зачем (прогон Сверки 11.10, п.2): выход упал с wipe_failed «Could not load bundle» — стирание делало ленивый import
 * в момент перезапуска сборщика. В релизе это обычный require, но цепочка стирания не должна зависеть от подгрузки в
 * критический момент: экран аккаунта и смена в онбординге греют модули заранее. Ошибки не бросает — пишет в лог.
 */
export function prewarmAccountWipeModules(source: string): void {
  const startedAtMs = Date.now();
  void Promise.allSettled([
    import('./phone_state_bootstrap'),
    import('./nickname_guard'),
    import('./personal_progress_store'),
    import('./friends_tab_swr_warm'),
  ]).then((results) => {
    const failed = results.flatMap((result, index) => (result.status === 'rejected' ? [index] : []));
    const log = failed.length > 0 ? console.warn : console.log;
    log('[ACC-SWITCH-WIPE] prewarm', JSON.stringify({ source, failed, tookMs: Date.now() - startedAtMs }));
  });
}

async function wipeLocalAccountDataUnsafe(): Promise<void> {
  const startedAt = identityTraceClockMs();
  activeWipeStages = {};
  activeWipeStageAt = startedAt;
  let failure: string | null = null;
  try {
    const { closePhoneStateBeforeLocalWipe } = await import('./phone_state_bootstrap');
    await closePhoneStateBeforeLocalWipe();
    markWipeStage('closePhoneState');
    await wipeLocalAccountDataUnsafeBody();
  } catch (error) {
    failure = identityErrorCode(error);
    throw error;
  } finally {
    const stages = activeWipeStages ?? {};
    activeWipeStages = null;
    identityTrace('[ACC-SWITCH-WIPE]', 'wipe_stages', {
      ...stages,
      totalMs: identityTraceClockMs() - startedAt,
      failure,
    });
  }
}

async function wipeLocalAccountDataUnsafeBody(): Promise<void> {
  const receiptOwnerStableId = captureAccountGeneration().stableId?.trim()
    || peekStableId()?.trim()
    || null;
  const { cancelPendingGeneratedNicknameRetry } = await import('./nickname_guard');
  cancelPendingGeneratedNicknameRetry();
  const accountKeys = await collectAccountLocalDataKeys();
  markWipeStage('collectKeys', accountKeys.length);
  // зачем (AA 2.0, S1e-2 п.2): непустой ключ S1e, не попавший в копию, стирается — делаем это видимым.
  await noteFutureKeptStashBeforeWipe(receiptOwnerStableId);
  markWipeStage('noteStash');
  // Сохраняем НЕ-аккаунтные настройки устройства:
  const KEEP = new Set<string>([
    'app_theme',
    'app_font_size',
    'haptics_tap',
    // Non-secret point-of-no-return journal. Removing it during the account
    // wipe would make a crash after this await indistinguishable from success.
    'account_switch_quarantine_v1',
    'account_switch_completion_receipt_v1',
    'account_provider_handoff_v1',
  ]);
  const removeExactly = async (keys: readonly string[]): Promise<void> => {
    const unique = Array.from(new Set(keys)).filter((key) => !KEEP.has(key));
    const chunkSize = 128;
    for (let offset = 0; offset < unique.length; offset += chunkSize) {
      const chunk = unique.slice(offset, offset + chunkSize);
      const finishSettingsMutation = chunk.includes('user_settings')
        ? beginSettingsStorageMutation() : undefined;
      try {
        await AsyncStorage.multiRemove(chunk);
      } finally {
        finishSettingsMutation?.();
      }
      const residue = (await AsyncStorage.multiGet(chunk))
        .filter(([, value]) => value != null)
        .map(([key]) => key);
      if (residue.length > 0) {
        // зачем (AA S2c, случай 1.6.19 AccountLogoutFlow:wipe_failed): какой ключ
        // переписал живой писатель между удалением и проверкой. Только ИМЕНА
        // ключей (не значения) — по ним видно, чей таймер не остановлен.
        identityTrace('[ACC-SWITCH-WIPE]', 'residue', {
          stage: 'chunk',
          count: residue.length,
          keys: residue.slice(0, 5).map(redactStorageKey).join(','),
        }, { persist: true });
        throw new Error('account_wipe_incomplete');
      }
    }
  };
  const toRemove = accountKeys.filter((key) => (
    !KEEP.has(key) && !isCustomizationAccountLocalKey(key)
  ));
  await removeExactly(toRemove);
  markWipeStage('removeKeys', toRemove.length);
  if (receiptOwnerStableId) {
    await removeOwnerLevelGiftEffectReceipts(receiptOwnerStableId);
  }
  markWipeStage('giftReceipts');
  await clearCustomizationAccountLocalState();
  markWipeStage('customization');
  // зачем (04.10, политика fe079cd49): копия «Памяти диалогов» на устройстве стирается при выходе и смене
  // аккаунта. Функция никогда не бросает — общую чистку не ломает.
  await clearAllDialogueV2MemoryDiskCache();
  markWipeStage('dialogueMemory');
  // зачем (координатор 13.10): память и дисковая копия визиток друзей — вместе (иначе отложенная запись или поздний ответ вернули бы чужие визитки). Не бросает; сбой импорта — в журнал, чистка выхода идёт дальше.
  try {
    const { clearPublicProfileCardCache } = await import('./profile_card_public');
    await clearPublicProfileCardCache('account_wipe');
  } catch (error: unknown) {
    console.warn(`[ACC-WIPE] profile_card_public clear_failed code=${identityErrorCode(error)}`); // guard-ok: catch пишет причину
  }
  markWipeStage('profileCardPublic');
  // зачем (PRIVACY_DELTA_R1 п.5): ключи сообщений аккаунта и отметка восстановления ошибок — тем же removeExactly (с проверкой
  // остатка), отдельным шагом после основного; порядок прежних шагов не тронут. Денежные очереди сюда не входят.
  const wipeOnlyKeys = (await listAllAccountLocalStorageKeys())
    .filter((key) => !KEEP.has(key) && wipeOnlyAccountKeyPrefix(key) !== null);
  await removeExactly(wipeOnlyKeys);
  markWipeStage('appMessages', wipeOnlyKeys.length);
  console.log(`[ACC-WIPE] app_messages ${JSON.stringify(countWipeOnlyKeysByPrefix(wipeOnlyKeys))}`); // guard-ok: одна строка на стирание, только префиксы и числа
  // Generation-bound writers are the primary barrier. This final scan is
  // defense-in-depth for a callback that committed during the first removal.
  const lateLearningV2Keys = (await listLearningV2AccountLocalKeys())
    .filter((key) => !KEEP.has(key));
  await removeExactly(lateLearningV2Keys);
  markWipeStage('lateLearningV2', lateLearningV2Keys.length);
  if (receiptOwnerStableId) {
    await removeOwnerLevelGiftEffectReceipts(receiptOwnerStableId);
  }
  markWipeStage('giftReceipts2');
  const knownAccountKeys = new Set(accountLocalDataKeysForToday());
  const finalResidue = (await listAllAccountLocalStorageKeys()).filter((key) =>
    !KEEP.has(key) && (
      knownAccountKeys.has(key)
      || isLearningV2AccountLocalKey(key)
      || isCustomizationAccountLocalKey(key)
      || isVipSnapshotStorageKey(key)
    ));
  markWipeStage('finalScan');
  // зачем (PRIVACY_DELTA_R1 п.5): живой загрузчик сообщений мог дописать кэш старого владельца во время выхода — убираем тихо,
  // БЕЗ броска account_wipe_incomplete (новая причина отказа выхода недопустима), с логом.
  const lateWipeOnlyKeys = (await listAllAccountLocalStorageKeys())
    .filter((key) => !KEEP.has(key) && wipeOnlyAccountKeyPrefix(key) !== null);
  if (lateWipeOnlyKeys.length > 0) {
    try {
      await AsyncStorage.multiRemove(lateWipeOnlyKeys);
      console.warn(`[ACC-WIPE] app_messages late ${JSON.stringify(countWipeOnlyKeysByPrefix(lateWipeOnlyKeys))}`); // guard-ok: редкая строка, только префиксы
    } catch (error: unknown) {
      console.warn(`[ACC-WIPE] app_messages late_remove_failed count=${lateWipeOnlyKeys.length} code=${identityErrorCode(error)}`); // guard-ok: catch пишет причину
    }
  }
  // зачем (п.80): какие ключи с stableId прежнего владельца пережили стирание — по факту, а не по списку. Только префиксы (id → <owner>);
  // намеренно сохранённые денежные очереди здесь видны и ожидаемы. Лог не меняет исход стирания.
  if (receiptOwnerStableId) {
    try {
      const ownerResidue = (await listAllAccountLocalStorageKeys())
        .filter((key) => !KEEP.has(key) && key.includes(receiptOwnerStableId));
      const byPrefix: Record<string, number> = {};
      for (const key of ownerResidue) {
        const shape = key.split(receiptOwnerStableId).join('<owner>');
        byPrefix[shape] = (byPrefix[shape] ?? 0) + 1;
      }
      console.log(`[ACC-WIPE] owner_residue count=${ownerResidue.length} ${JSON.stringify(byPrefix)}`); // guard-ok: одна строка на стирание, без id
    } catch (error: unknown) {
      console.warn(`[ACC-WIPE] owner_residue scan_failed code=${identityErrorCode(error)}`); // guard-ok: catch пишет причину
    }
  }
  if (finalResidue.length > 0) {
    identityTrace('[ACC-SWITCH-WIPE]', 'residue', {
      stage: 'final_scan',
      count: finalResidue.length,
      keys: finalResidue.slice(0, 5).map(redactStorageKey).join(','),
    }, { persist: true });
    throw new Error('account_wipe_incomplete');
  }
  if (receiptOwnerStableId) {
    await assertNoOwnerLevelGiftEffectReceipts(receiptOwnerStableId);
  }
  // Сбрасываем in-memory bookkeeping синка
  lastSuccessfulSyncAt = 0;
  lastActivityStampAt = 0;
  pendingSync = false;
  resetAppSnapshotForAccountSwitch();
  const { resetPersonalProgressForAccountTransition } = await import('./personal_progress_store');
  resetPersonalProgressForAccountTransition();
  // зачем: PM-213 — список друзей и кэш профилей (память + диск, общий ключ без uid) прошлого
  // владельца не должны попасть на первый кадр нового аккаунта; ошибка не блокирует смену, но
  // пишется в лог с префиксом [FRIENDS-WARM].
  try {
    const { resetFriendsTabSwrWarmForAccountSwitch } = await import('./friends_tab_swr_warm');
    await resetFriendsTabSwrWarmForAccountSwitch();
  } catch (e) {
    console.warn('[FRIENDS-WARM] сброс при смене аккаунта не выполнен', JSON.stringify({ reason: e instanceof Error ? e.message : String(e) }));
  }
  // зачем: без этого PlayerProfileModal мог мгновенно отрендерить множители
  // зачем: без этого club_screen мог мгновенно отрендерить ранг/группу лиги
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
  markWipeStage('resetMemory');
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

export type AccountDeleteDirectAck = { ok: true; authDeleted: boolean };

/**
 * Запасной путь удаления серверных данных ГОСТЯ — прямой accountDeleteMine.
 *
 * зачем (TG-20707BD701DC, живой прогон 10.10): гостю, у которого не записался
 * замок удаления (нет ключа), постановка accountDeleteEnqueue заведомо падала
 * `account_delete_credential_proof_missing` — серверные данные гостя не
 * удалялись никогда. accountDeleteMine требует только входа, поэтому его шлют,
 * ПОКА гость ещё вошедший. В отличие от deleteCloudData() здесь нет
 * getCanonicalUserId/ensureAnonUser: к этому моменту телефон уже стёрт, и они
 * могли бы выдать НОВУЮ личность — удаляем ровно тот stableId, что прочитан до
 * стирания. Форма та же, что у постановки: вызывающий ждёт только отправки.
 */
export function startCloudDeletionDirect(
  stableId: string | null,
): AccountDeleteEnqueueOperation<AccountDeleteDirectAck> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    return startAccountDeleteEnqueueWithDeadline(
      async () => { throw new Error('account_delete_direct_unavailable'); },
      async () => { throw new Error('account_delete_direct_unavailable'); },
      ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS,
      'direct',
    );
  }
  return startAccountDeleteEnqueueWithDeadline(
    async () => undefined,
    async () => {
      const fn = callable<{ stableId?: string | null }, { ok: boolean; authDeleted?: boolean }>(
        'accountDeleteMine',
        { timeout: ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS },
      );
      const res = await fn(stableId ? { stableId } : {});
      if (!res.data?.ok) throw new Error('account_delete_failed');
      return { ok: true, authDeleted: res.data.authDeleted === true };
    },
    ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS,
    'direct',
  );
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
  // зачем (Account V2, Пакет 6B): ключ удаления V2 (base64url 32 байта) — отдельным
  // полем accountsV2Deletion; без него (флаг V2 выключен) запрос байт-в-байт прежний.
  accountsV2Deletion?: AccountDeleteCredentialProof | null,
  // зачем (координатор 12.10): только фоновая ветка гостя передаёт свой дедлайн (25 с); прочие вызовы — без аргумента, 8 с.
  options?: Readonly<{ timeoutMs?: number; label?: string }>,
): AccountDeleteEnqueueOperation<AccountDeleteEnqueueAck> {
  const enqueueTimeoutMs = options?.timeoutMs ?? ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS;
  const enqueueLabel = options?.label ?? 'enqueue';
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    return startAccountDeleteEnqueueWithDeadline(
      async () => { throw new Error('account_delete_enqueue_unavailable'); },
      async () => { throw new Error('account_delete_enqueue_unavailable'); },
      enqueueTimeoutMs,
      enqueueLabel,
    );
  }
  return startAccountDeleteEnqueueWithDeadline(
    async () => undefined,
    async () => {
      if (!proof?.operationId || !proof.capability) {
        throw new Error('account_delete_credential_proof_missing');
      }
      const fn = callable<{
        stableId?: string | null;
        operationId: string;
        capability: string;
        accountsV2Deletion?: AccountDeleteCredentialProof;
      }, AccountDeleteEnqueueAck>(
        'accountDeleteEnqueue',
        { timeout: enqueueTimeoutMs },
      );
      const res = await fn(accountsV2Deletion
        ? { stableId, ...proof, accountsV2Deletion: { operationId: accountsV2Deletion.operationId, capability: accountsV2Deletion.capability } }
        : { stableId, ...proof });
      if (
        !res.data?.ok
        || !res.data.jobId
        || res.data.authReleased !== true
        || res.data.credentialSafe !== true
      ) throw new Error('account_delete_enqueue_failed');
      return res.data;
    },
    enqueueTimeoutMs,
    enqueueLabel,
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
  const startedAt = Date.now();
  const deadline = startedAt + Math.max(1, timeoutMs);
  // зачем (координатор 12.10, «сперва логи»): после таймаута постановки — сколько попыток квитанции, сколько ждали, последний код.
  let attempts = 0;
  let lastCode = 'none';
  const fn = callable<AccountDeleteCredentialProof, { status: 'credential_safe' }>(
    'accountDeleteCredentialStatus',
    { timeout: Math.min(timeoutMs, ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS) },
  );
  while (Date.now() < deadline) {
    try {
      const remaining = Math.max(1, deadline - Date.now());
      attempts += 1;
      const response = await withTimeout(
        fn(proof),
        remaining,
        'account_delete_credential_status',
      );
      if (response.data?.status === 'credential_safe') {
        console.log(`[ACC-MUT] receipt credential_safe=1 attempts=${attempts} waitedMs=${Date.now() - startedAt}`); // guard-ok: итог ожидания
        return true;
      }
      lastCode = `status_${String(response.data?.status ?? 'none').slice(0, 40)}`;
    } catch (e) {
      // A closure may be committed while its first response is lost. Retry the // capability receipt within the bounded foreground deadline.
      DebugLogger.error('cloud_sync:response', e instanceof Error ? e : new Error(String(e)), 'warning');
      const code = (e as { code?: unknown } | null)?.code;
      lastCode = typeof code === 'string' && code ? code.slice(0, 80) : (e instanceof Error ? e.name : typeof e);
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(400, remaining)));
  }
  console.warn(`[ACC-MUT] receipt credential_safe=0 attempts=${attempts} waitedMs=${Date.now() - startedAt} lastCode=${lastCode}`); // guard-ok: итог ожидания без квитанции
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
