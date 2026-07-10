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
import {
  beginInitialAccountGeneration,
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withRestoreApplicationLock,
} from './account_generation';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED, IS_STORE_RELEASE } from './config';
import { getTodayKey, getTodayTasksSafe, loadTodayProgress } from './daily_tasks';
import { clearArenaAuthUidCache, getAuthUserId, getCanonicalUserId, ensureArenaAuthUid } from './user_id_policy';
import { processVipGrantForCelebration } from './vip_celebration_state';
import { invalidatePremiumCache } from './premium_guard';
import { getVipProgressState, parsePremiumProgressMs } from './premium_progress';
import { mergeStreakByActivityDate, normalizeDevSeededStreakValue, repairDevSeededStreakInStorage } from './streak_safety';
import {
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
} from './intro_full_access';
import {
  LOYALTY_GIFT_STARTED_AT_KEY,
  LOYALTY_GIFT_ENDS_AT_KEY,
  LOYALTY_GIFT_CLAIMED_KEY,
} from './loyalty_gift';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { resumePendingDailyTasksAllShardsClaims, resumePendingShardDeltas } from './shards_system';
import { resumePendingReportReplyShardClaims } from './app_messages';
import { getAuthLinkCacheTtlMs } from './remote_flags';
import { ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS, ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS } from './account_delete_timeout';
import { runAccountDeleteEnqueueWithDeadline } from './account_delete_enqueue';
import { resetAppSnapshotForAccountSwitch } from './app_snapshot_store';
import { DIAGNOSIS_TRAINING_IDS } from './personal_practice_training_ids';
import { XP_LEVEL_RESTORE_250_TO_400_KEY } from './xp_level_restore';
import { PERSONAL_PLAN_PENDING_ACTIVATION_KEY } from './personal_plan_activation';
import { COMPLETED_PLAN_TASKS_KEY } from './personal_plan_progress';
import { PERSONAL_PLAN_STATE_KEY } from './personal_plan_state';
import {
  activeRecallItemsKey,
  achievementStateKey,
  achievementLessonPerfectPassesKey,
  comboAchievementCounterKey,
  communityPackCreateDraftKey,
  dailyPhraseAchievementReadCountKey,
  dailyPhraseAchievementSaveCountKey,
  dailyTasksAchievementAllDoneStreakKey,
  dailyTasksAchievementNoRerollStreakKey,
  dailyTasksAdminOverrideKey,
  customFlashcardsKey,
  dailyTaskLessonVisitedKey,
  dailyTasksProgressKey,
  dailyTasksRerollKey,
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
  mistakeLogKey,
  personalPracticeFreeAccessKey,
  personalPracticeTrainingProgressKey,
  posMasteryKey,
  premiumCourseLevelKey,
  prepositionDrillPerfectKey,
  quizAchievementCounterKey,
  quizLifetimeCounterKey,
  quizNavLevelKey,
  quizPerfectLevelsTodayKey,
  quizPerfectStreakKey,
  resolvedPersonalTrainingsKey,
  shareAchievementCounterKey,
  targetKey,
  activeRecallAchievementCorrectCountKey,
  trainerAchievementCorrectCountKey,
  trainerAchievementCorrectStreakKey,
  trainerAchievementPerfectSessionCountKey,
  trainerStoreKey,
  unlockedLessonsKey,
  userStatsKey,
  statsDailyBreakdownKey,
} from './target_storage_keys';

/** Одна строка прогресса по заданию (как TaskProgress в daily_tasks, без лишних импортов). */
type DailyTaskProgressRow = {
  taskId: string;
  current?: number;
  completed?: boolean;
  claimed?: boolean;
  comboPlays?: number;
  comboWins?: number;
};

const taskProgressNum = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

const CLOUD_DAILY_TASKS_PROGRESS_KEY = 'daily_tasks_progress';
const CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY = 'daily_tasks_progress_day';
const FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY = targetKey('cloud_sync', 'fr', 'daily_tasks_progress');
const FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY = targetKey('cloud_sync', 'fr', 'daily_tasks_progress_day');
const FRENCH_SYNC_LESSON_IDS = Array.from({ length: 32 }, (_, index) => index + 1);
const FRENCH_SYNC_EXAM_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
const FRENCH_SYNC_PERFECT_MILESTONES = [5, 10, 15, 20, 25, 30] as const;
const FRENCH_SYNC_SOURCE_LOCALES = ['ru', 'uk'] as const;
const SYNC_STUDY_TARGETS = ['en', 'fr'] as const;
const LESSON_SESSION_FIELDS = ['cellIndex', 'phraseOrder', 'errorReplayQueue', 'errorReplaySince', 'errorReplayOverride'] as const;
const GRAMMAR_HINT_STORAGE_IDS = ['grammar_hint_articles', 'grammar_hint_some_any'] as const;

export const FRENCH_TARGET_SYNC_KEYS = [
  unlockedLessonsKey('fr'),
  premiumCourseLevelKey('fr'),
  lessonUnlockRepairKey('fr'),
  lastOpenedLessonKey('fr'),
  lingmanExamAvailableKey('fr'),
  lingmanCertificateKey('fr'),
  diagnosticLastKey('fr'),
  quizLifetimeCounterKey('lifetime_quiz_easy_v1', 'fr'),
  quizLifetimeCounterKey('lifetime_quiz_medium_v1', 'fr'),
  quizLifetimeCounterKey('lifetime_quiz_hard_v1', 'fr'),
  quizAchievementCounterKey('achievement_quiz_total_count', 'fr'),
  quizAchievementCounterKey('quiz_hard_count', 'fr'),
  quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'fr'),
  quizPerfectLevelsTodayKey('fr'),
  quizPerfectStreakKey('fr'),
  achievementStateKey('fr'),
  comboAchievementCounterKey('fr'),
  dailyPhraseAchievementReadCountKey('fr'),
  dailyPhraseAchievementSaveCountKey('fr'),
  dailyTasksAchievementAllDoneStreakKey('fr'),
  dailyTasksAchievementNoRerollStreakKey('fr'),
  shareAchievementCounterKey('fr'),
  userStatsKey('fr'),
  statsDailyBreakdownKey('fr'),
  irregularVerbsGlobalKey('fr'),
  trainerStoreKey('fr'),
  activeRecallAchievementCorrectCountKey('fr'),
  trainerAchievementCorrectCountKey('fr'),
  trainerAchievementCorrectStreakKey('fr'),
  trainerAchievementPerfectSessionCountKey('fr'),
  mistakeLogKey('fr'),
  activeRecallItemsKey('fr'),
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
  FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY,
  FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY,
  dailyTasksRerollKey('fr'),
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

/**
 * Полное восстановление с облака не должно затирать уже накопленный сегодня локальный прогресс
 * устаревшим daily_tasks_progress (например облако ещё не успело отправить актуальный снимок).
 */
export function mergeDailyTasksProgressForRestore(localRaw: string | null | undefined, cloudRaw: string): string {
  let localArr: DailyTaskProgressRow[] = [];
  let cloudArr: DailyTaskProgressRow[] = [];
  try {
    if (localRaw && localRaw.trim()) {
      const p = JSON.parse(localRaw);
      if (Array.isArray(p)) localArr = p;
    }
  } catch {
    localArr = [];
  }
  try {
    const p = JSON.parse(cloudRaw);
    if (Array.isArray(p)) cloudArr = p;
    else return (localRaw && localRaw.trim()) ? localRaw : cloudRaw;
  } catch {
    return (localRaw && localRaw.trim()) ? localRaw : cloudRaw;
  }
  if (localArr.length === 0) return cloudRaw;
  if (cloudArr.length === 0) return localRaw ?? '[]';

  const byId = new Map<string, DailyTaskProgressRow>();
  for (const row of cloudArr) {
    if (row && typeof row.taskId === 'string' && row.taskId) {
      byId.set(row.taskId, { ...row });
    }
  }
  for (const row of localArr) {
    if (!row || typeof row.taskId !== 'string' || !row.taskId) continue;
    const cloud = byId.get(row.taskId);
    if (!cloud) {
      byId.set(row.taskId, { ...row });
      continue;
    }
    byId.set(row.taskId, {
      ...cloud,
      taskId: row.taskId,
      current: Math.max(taskProgressNum(cloud.current), taskProgressNum(row.current)),
      completed: !!(cloud.completed || row.completed),
      claimed: !!(cloud.claimed || row.claimed),
      comboPlays: Math.max(taskProgressNum(cloud.comboPlays), taskProgressNum(row.comboPlays)),
      comboWins: Math.max(taskProgressNum(cloud.comboWins), taskProgressNum(row.comboWins)),
    });
  }
  return JSON.stringify([...byId.values()]);
}

// ── Ключи AsyncStorage которые синхронизируются с облаком ────────────────────
// Экспорт: тот же набор должен учитываться при сбросе локали после merge аккаунта (auth_provider).
export const SYNC_KEYS = [
  // ── Идентичность и базовый прогресс ────────────────────────────────────────
  'user_total_xp',
  'user_prev_xp',
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
  // ── Мультиязычность: начатые языки + ответы мини-онбординга языка ─────────
  // (гейт «1 язык фри» и сырьё для персонального плана; см. app/study_languages.ts)
  'study_languages_started_v1',
  'language_profile_v1::en',
  'language_profile_v1::fr',
  'unlocked_lessons',
  'flashcards',
  'flashcards_v1',
  'achievements_state',
  // ── Прогресс достижений (отдельные счётчики до момента unlock) ───────────
  'achievement_active_recall_correct_count',
  'achievement_trainer_correct_count',
  'achievement_trainer_correct_streak_v1',
  'achievement_trainer_perfect_session_count',
  'achievement_all_daily_streak_v1',
  'helpful_error_reports_confirmed_v1',
  'achievement_quiz_total_count',
  'quiz_hard_count',
  'achievement_quiz_hard_perfect_count',
  'achievement_quiz_perfect_levels_today_v1',
  'achievement_quiz_perfect_streak_v1',
  'achievement_daily_phrase_read_count',
  'achievement_daily_phrase_save_count',
  'achievement_flashcards_saved_count',
  'achievement_flashcards_flip_count',
  'achievement_flashcards_view_streak_v1',
  'achievement_flashcards_source_set_v1',
  'achievement_shards_spent_total',
  'achievement_energy_refill_count',
  'achievement_league_boost_count',
  'achievement_league_chat_message_count',
  'achievement_gift_sent_count',
  'achievement_arena_win_count',
  'achievement_arena_win_streak',
  'achievement_arena_wager_win_count',
  'active_recall_items',
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
  'daily_tasks_progress',
  'daily_tasks_progress_day',
  'login_bonus_v1',
  /** Опыт по дням (график статистики) — без синка теряется на новом устройстве. */
  'daily_stats',
  PERSONAL_PLAN_STATE_KEY,
  COMPLETED_PLAN_TASKS_KEY,

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
  'arena_daily_gift_bonus_v1',
  flashcardsPackTrialGiftKey('en'),
  'club_gift_free_boost_v1',
  // Анти-повтор премиум pack-unlock подарков уровня: без синка при смене
  // устройства один и тот же набор мог выпасть повторно.
  'level_premium_pack_unlock_gifts_v1',
  'wager_discount',
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
  // и счётчик арены для milestone-бонусов.
  'shards_one_time_events',
  'shards_arena_wins_total',

  // ── UI / поведение ─────────────────────────────────────────────────────────
  // app_theme / app_font_size / haptics_tap — только локально на устройстве (см. wipeLocalAccountData KEEP).
  // Синк с облаком ломал тему: при restore облако перетирало выбор пользователя старым progress.
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
  'lifetime_quiz_easy_v1',
  'lifetime_quiz_medium_v1',
  'lifetime_quiz_hard_v1',
  'lifetime_quiz_counters_migrated_v1',
  'lifetime_daily_tasks_claimed_v1',
  'shards_lifetime_earned_v1',
  'shards_lifetime_spent_v1',
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
  ...Array.from({ length: 32 }, (_, i) => lessonTheoryXpClaimedKey(i + 1, 'en')),
  ...Array.from({ length: 32 }, (_, i) => achievementLessonPerfectPassesKey(i + 1, 'en')),
  ...FRENCH_TARGET_SYNC_KEYS,
  // ── Подарочный доступ (intro / loyalty): зеркалим срок в облако, чтобы при смене
  //    телефона / переустановке подарок не терялся и восстанавливался (Д2-фикс).
  //    Зеркалим И started, И ends (getIntroFullAccessState требует оба). claimed —
  //    чтобы лояльный подарок не выдался повторно на новом устройстве. ВНИМАНИЕ: это
  //    лёгкий вариант (анти-потеря). Это НЕ серверная защита от ручного продления —
  //    клиент всё ещё может переписать срок локально; для бесплатного подарка риск
  //    низкий. Полную защиту (CF-выдача + blocked-ключи) делать отдельно.
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
  LOYALTY_GIFT_STARTED_AT_KEY,
  LOYALTY_GIFT_ENDS_AT_KEY,
  LOYALTY_GIFT_CLAIMED_KEY,
  // ── Claim-маркеры модальных бонусов (Mystery Monday / Comeback / Perfect Week).
  //    Зеркалим в облако, чтобы переустановка / смена устройства не давала повторно
  //    забрать недельную/разовую награду (анти-фарм переустановкой, аудит P2 #12).
  //    Это лёгкий вариант: маркер «уже забрано» переживает реинсталл. Полную серверную
  //    идемпотентность (CF reward_claims/{periodId}) делать отдельно — как в daily_tasks.
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

export function accountLocalDataKeysForToday(todayKey: string = getTodayKey()): string[] {
  const localOnlyTargetKeys = SYNC_STUDY_TARGETS.flatMap((target) => [
    dailyTasksProgressKey(todayKey, target),
    dailyTaskLessonVisitedKey(todayKey, target),
    dailyTasksAdminOverrideKey(target),
    fiftyFiftyUsageKey(todayKey, target),
    lessonBonusHintsKey(todayKey, target),
    quizNavLevelKey(target),
    diagnosticOpenFlagKey(target),
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
    'daily_tasks_progress',
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
    PERSONAL_PLAN_PENDING_ACTIVATION_KEY,
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
    snapshot[key] = value;
  }
  return snapshot;
}
const STABLE_AUTH_LINK_CACHE_KEY = 'stable_auth_link_cache_v1';
const ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY = 'account_switch_emergency_backup_latest_v1';
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
export type StableAuthLinkEnsureResult = {
  ok: boolean;
  requestedStableId: string;
  stableUid: string | null;
  authUid: string | null;
  source: 'disabled' | 'cache' | 'callable' | 'unavailable';
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
  'collectibles_owned_v1',
  'collectibles_state_v1',
  // profile_card_level — публичный престиж-бейдж, поднимает только CF profileCardUpgrade
  // (Admin SDK). В blocklist firestore.rules (стр.94). Без исключения здесь клиент слал бы
  // его в исходящий patch после апгрейда → rules отклонят весь set (PERMISSION_DENIED) →
  // ломается синк XP/streak/прогресса. profile_card_theme/motion/public_focus НЕ сюда —
  // они клиент-выбираемые и синкаются штатно.
  'profile_card_level',
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

// #10 multi-device: strictly-additive lifetime counters (bumpStoredCounter only
// ever increases them). On restore they take the max of cloud/local so a
// concurrent lower-value push on another device cannot permanently lose progress.
// EXPLICIT allowlist — deliberately excludes streaks (*_streak_v1, streak_count —
// can reset to 0), dates (streak_last_date, *_period_start), and current-state
// values (gift_xp_multiplier, wager_discount, weekly_xp which resets weekly).
export const MONOTONIC_COUNTER_RESTORE_KEYS = [
  'achievement_quiz_total_count',
  'achievement_quiz_hard_perfect_count',
  'quiz_hard_count',
  'achievement_trainer_correct_count',
  'achievement_trainer_perfect_session_count',
  'achievement_active_recall_correct_count',
  'achievement_arena_win_count',
  'achievement_arena_wager_win_count',
  'achievement_flashcards_flip_count',
  'achievement_flashcards_saved_count',
  'achievement_daily_phrase_read_count',
  'achievement_daily_phrase_save_count',
  'achievement_energy_refill_count',
  'achievement_gift_sent_count',
  'achievement_league_boost_count',
  'achievement_league_chat_message_count',
  'achievement_shards_spent_total',
  'shards_arena_wins_total',
  'shards_lifetime_earned_v1',
] as const;
const MONOTONIC_COUNTER_RESTORE_KEY_SET = new Set<string>(MONOTONIC_COUNTER_RESTORE_KEYS);

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
 * Сокровищницы не должен регрессировать; прочие конфликты решает облако).
 * При нечитаемом локальном значении возвращает облачное как есть.
 */
function mergeOwnedRestoreValue(cloudValue: string, localValue: string | null | undefined): string {
  const local = parseOwnedRestoreJson(localValue);
  if (local === null) return cloudValue;
  const cloud = parseOwnedRestoreJson(cloudValue);
  if (Array.isArray(local) || Array.isArray(cloud)) {
    const cloudIds = Array.isArray(cloud) ? cloud.filter((x): x is string => typeof x === 'string') : [];
    const localIds = Array.isArray(local) ? local.filter((x): x is string => typeof x === 'string') : [];
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
    const cloudNum = merged[id];
    if (typeof localVal === 'number' && typeof cloudNum === 'number' && localVal > cloudNum) {
      merged[id] = localVal;
    }
  }
  return JSON.stringify(merged);
}

function mergeLessonRestoreValue(
  key: string,
  cloudValue: string,
  localValue: string | null | undefined,
): string {
  // #10 multi-device: strictly-additive lifetime counters take the max so a
  // concurrent push of a lower value on another device can't lose progress.
  // Allowlist only (never streaks/dates/multipliers — those can legitimately drop).
  if (MONOTONIC_COUNTER_RESTORE_KEY_SET.has(key)) {
    return String(Math.max(parseProgressInt(cloudValue), parseProgressInt(localValue)));
  }
  // K2: владение (покупки/выдачи) строго аддитивно — union вместо перезаписи облаком.
  if (isOwnedUnionRestoreKey(key)) {
    return mergeOwnedRestoreValue(cloudValue, localValue);
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

async function buildFrenchTargetStickyRestorePairs(cloudData: Record<string, unknown>): Promise<[string, string][]> {
  const restorableKeys = FRENCH_TARGET_SYNC_KEYS.filter((key) => (
    key !== FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY &&
    key !== FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY
  ));
  const localMap = Object.fromEntries(
    await AsyncStorage.multiGet([...restorableKeys]),
  ) as Record<string, string | null>;
  const pairs: [string, string][] = [];

  for (const key of restorableKeys) {
    const val = cloudData[key];
    if (val === null || val === undefined) continue;
    const localValue = localMap[key];
    const storageValue = cloudProgressStorageValue(key, val);
    // K2: owned-ключи (fr-scoped паки флешкарт и т.п.) мержим union'ом и в sticky-ветке —
    // покупка на другом девайсе догоняет устройство, локальная офлайн-покупка не теряется.
    if (RESTORE_MERGE_KEY_SET.has(key) || isOwnedUnionRestoreKey(key)) {
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

function currentCloudDailyTasksProgress(
  cloudData: Record<string, string | null>,
  progressKey: string = CLOUD_DAILY_TASKS_PROGRESS_KEY,
  dayKeyField: string = CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY,
): string | null {
  const raw = cloudData[progressKey];
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;

  const dayKey = cloudData[dayKeyField];
  if (!isDateKey(dayKey)) return null;
  return dayKey === getTodayKey() ? String(raw) : null;
}

function removeCloudOnlyDailyTaskSnapshots(data: Record<string, string | null>): void {
  delete data[CLOUD_DAILY_TASKS_PROGRESS_KEY];
  delete data[CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY];
  delete data[FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY];
  delete data[FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY];
}

function dailyLessonHelperKeysForToday(todayKey: string = getTodayKey()): string[] {
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

async function addTodayDailyTaskSnapshots(data: Record<string, string | null>): Promise<void> {
  const todayKey = getTodayKey();
  const [englishTodayTasks, frenchTodayTasks] = await Promise.all([
    AsyncStorage.getItem(dailyTasksProgressKey(todayKey, 'en')),
    AsyncStorage.getItem(dailyTasksProgressKey(todayKey, 'fr')),
  ]);
  if (englishTodayTasks) {
    data[CLOUD_DAILY_TASKS_PROGRESS_KEY] = englishTodayTasks;
    data[CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY] = todayKey;
  }
  if (frenchTodayTasks) {
    data[FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY] = frenchTodayTasks;
    data[FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY] = todayKey;
  }
  const dailyLessonHelperKeys = dailyLessonHelperKeysForToday(todayKey);
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

// ── Получить или создать анонимного пользователя ─────────────────────────────
// Возвращает stable ID (переживает переустановку), при наличии Firebase — также входит анонимно.
// ВАЖНО: ждём signInAnonymously чтобы избежать гонки на холодном старте — иначе
// первые Firestore операции (league_groups, leaderboard write) падают с PERMISSION_DENIED.
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

export async function ensureAnonUser(): Promise<string | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  // Всегда используем canonical stable ID как ключ users/*
  const stableId = await getCanonicalUserId();
  await ensureAnonAuthReady();
  return stableId;
}

async function waitForFirebaseAuthUid(): Promise<string | null> {
  let authUid = getAuthUserId();
  if (authUid) return authUid;
  for (let i = 0; i < 4; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
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

export async function ensureStableAuthLinkForStableIdDetailed(
  stableIdRaw: string,
  metadata?: StableAuthLinkMetadata,
): Promise<StableAuthLinkEnsureResult> {
  const requestedStableId = String(stableIdRaw || '').trim();
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    return { ok: true, requestedStableId, stableUid: requestedStableId || null, authUid: null, source: 'disabled' };
  }
  const stableId = String(stableIdRaw || '').trim();
  const authUid = await waitForFirebaseAuthUid();
  if (!stableId || !authUid) {
    return { ok: false, requestedStableId: stableId, stableUid: null, authUid, source: 'unavailable' };
  }

  const key = `${stableId}:${authUid}`;
  const hasFreshMetadata = metadata != null && Object.keys(metadata).length > 0;
  if (!hasFreshMetadata && await readStableAuthLinkCache(key)) {
    return { ok: true, requestedStableId: stableId, stableUid: stableId, authUid, source: 'cache' };
  }
  const promiseKey = hasFreshMetadata ? `${key}:metadata` : key;
  if (stableAuthLinkPromise && stableAuthLinkKey === promiseKey) return stableAuthLinkPromise;

  stableAuthLinkKey = promiseKey;
  stableAuthLinkPromise = (async () => {
    try {
      await initFirebaseAppCheckIfAvailable().catch(() => {});
      const fn = callable<
        { stableId: string; linkMetadata?: StableAuthLinkMetadata },
        { ok: boolean; stableUid: string; authUid: string }
      >('authEnsureStableLink');
      const res = await withTimeout(
        fn({ stableId, ...(hasFreshMetadata ? { linkMetadata: metadata } : {}) }),
        STABLE_AUTH_LINK_TIMEOUT_MS,
        'auth_link_callable',
      );
      const actualStableUid = String(res?.data?.stableUid ?? '').trim();
      const actualAuthUid = String(res?.data?.authUid ?? authUid).trim() || authUid;
      const ok = res?.data?.ok === true && actualStableUid.length > 0;
      if (ok) writeStableAuthLinkCache(`${actualStableUid}:${actualAuthUid}`).catch(() => {});
      return {
        ok,
        requestedStableId: stableId,
        stableUid: ok ? actualStableUid : null,
        authUid: actualAuthUid,
        source: 'callable',
      };
    } catch (error) {
      if (__DEV__) console.warn('[cloud_sync] authEnsureStableLink callable failed', error);
      return { ok: false, requestedStableId: stableId, stableUid: null, authUid, source: 'unavailable' };
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
  return ensureStableAuthLinkForStableId(stableId);
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
  clearArenaAuthUidCache();
}

// ── Получить uid текущего пользователя ───────────────────────────────────────
export function getCurrentUid(): string | null {
  return getAuthUserId();
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

/** Після restore зі snapshot старі taskId у JSON — наступний load підтягує getTodayTasksSafe() і перезаписує ключ. */
async function reconcileRestoredDayDailyStorageIfNeeded(restoredTargets: Array<'en' | 'fr'> | boolean): Promise<void> {
  const targets = restoredTargets === true
    ? ['en' as const]
    : restoredTargets === false
      ? []
      : restoredTargets;
  if (targets.length === 0) return;
  try {
    for (const target of targets) {
      const studyTarget = target === 'fr' ? 'fr' : undefined;
      const list = await getTodayTasksSafe(studyTarget);
      if (list.length > 0) await loadTodayProgress(list, studyTarget);
    }
  } catch { /* empty */ }
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

async function buildGiftEntitlementStickyPairs(cloudData: Record<string, string | null>): Promise<[string, string][]> {
  const pairs: [string, string][] = [];

  const cloudShield = cloudData['chain_shield'];
  if (cloudShield) {
    const [localRaw, cloud] = await Promise.all([
      AsyncStorage.getItem('chain_shield'),
      Promise.resolve(safeParseObject(cloudShield)),
    ]);
    const local = safeParseObject(localRaw);
    if (numField(cloud, 'daysLeft') > numField(local, 'daysLeft')) {
      pairs.push(['chain_shield', String(cloudShield)]);
    }
  }

  const cloudXpBoost = cloudData['gift_xp_multiplier'];
  if (cloudXpBoost) {
    const [localRaw, cloud] = await Promise.all([
      AsyncStorage.getItem('gift_xp_multiplier'),
      Promise.resolve(safeParseObject(cloudXpBoost)),
    ]);
    const local = safeParseObject(localRaw);
    if (numField(cloud, 'expiresAt') > numField(local, 'expiresAt')) {
      pairs.push(['gift_xp_multiplier', String(cloudXpBoost)]);
    }
  }

  const cloudArenaBonus = cloudData['arena_daily_gift_bonus_v1'];
  if (cloudArenaBonus) {
    const [localRaw, cloud] = await Promise.all([
      AsyncStorage.getItem('arena_daily_gift_bonus_v1'),
      Promise.resolve(safeParseObject(cloudArenaBonus)),
    ]);
    const local = safeParseObject(localRaw);
    if (
      typeof cloud.date === 'string' &&
      (cloud.date !== local.date || numField(cloud, 'extra') > numField(local, 'extra'))
    ) {
      pairs.push(['arena_daily_gift_bonus_v1', String(cloudArenaBonus)]);
    }
  }

  return pairs;
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
  const isSyncGenerationCurrent = (): boolean => isCurrentAccountGeneration(syncGeneration, uid);
  try {
    await resumePendingDailyTasksAllShardsClaims().catch(() => {});
    if (!isSyncGenerationCurrent()) return;
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
    // daily_tasks_progress fields are cloud-only snapshots of date-keyed local rows.
    // Never upload stale generic local copies after restore; only real
    // daily_tasks_YYYY-MM-DD / scoped French keys below may populate these cloud fields.
    removeCloudOnlyDailyTaskSnapshots(data);
    // Маппинг: внутренние ключи → ключи Firestore для аналитики
    const achievementsV1 = await AsyncStorage.getItem('achievements_v1');
    if (!isSyncGenerationCurrent()) return;
    if (achievementsV1) data['achievements_state'] = achievementsV1;
    if (data['app_lang']) data['lang'] = data['app_lang'];
    if (data['user_frame']) data['user_avatar_frame'] = data['user_frame'];

    // Дополнительно синхронизируем сегодняшние задания под фиксированными cloud keys.
    await addTodayDailyTaskSnapshots(data);
    if (!isSyncGenerationCurrent()) return;

    // Сравниваем с последним синкнутым снапшотом и отправляем только изменённые поля.
    // Это снижает сетевой шум и частоту "пустых" write-операций.
    let previousSnapshot: Record<string, string | null> = {};
    try {
      const snapRaw = await AsyncStorage.getItem(LAST_SYNC_SNAPSHOT_KEY);
      if (!isSyncGenerationCurrent()) return;
      if (snapRaw) previousSnapshot = JSON.parse(snapRaw);
    } catch {}
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
      if (previousSnapshot[key] !== value) progressPatch[key] = value;
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
    // Дружба / friend_requests rules: ключ в пути users/{stableId}/… но senderUid должен доказать
    // связь с текущей Firebase-сессией — см. firestore.rules canonicalUserMatchesAuth + firebaseAuthUid.
    const firebaseAuthUidRow = getAuthUserId();
    if (!isSyncGenerationCurrent()) return;
    await docRef.set(
      {
        ...(firebaseAuthUidRow ? { firebaseAuthUid: firebaseAuthUidRow } : {}),
        ...(data['user_avatar'] ? { user_avatar: data['user_avatar'] } : {}),
        ...(data['user_avatar_frame'] ? { user_avatar_frame: data['user_avatar_frame'] } : {}),
        ...(hasProgressPatch ? { progress: progressPatch } : {}),
        ...(needActivityStamp || needHeartbeat || shouldSendCreatedAt ? { updatedAt: now, last_active_at: now } : {}),
        ...(shouldSendCreatedAt ? { created_at: now } : {}),
      },
      { merge: true }
    );
    if (!isSyncGenerationCurrent()) return;
    // Снимок уровня/аватара на arena_profiles — топ арены читает всем одну коллекцию.
    if (firebaseAuthUidRow) {
      try {
        const arenaUid = await ensureArenaAuthUid();
        if (!isSyncGenerationCurrent()) return;
        if (arenaUid === firebaseAuthUidRow) {
          const totalXp = parseInt(data['user_total_xp'] ?? '0', 10) || 0;
          const avatar = (data['user_avatar'] ?? '').trim();
          const frame = (data['user_frame'] ?? '').trim();
          const aura = (data['user_avatar_aura'] ?? '').trim();
          const profileCardLevel = Math.max(0, Math.min(1, parseInt(data['profile_card_level'] ?? '0', 10) || 0));
          const profileCardTheme = (data['profile_card_theme'] ?? 'classic').trim() || 'classic';
          const profileCardMotion = (data['profile_card_motion'] ?? 'none').trim() || 'none';
          const profileCardPublicFocus = (data['profile_card_public_focus'] ?? 'balanced').trim() || 'balanced';
          if (!isSyncGenerationCurrent()) return;
          await db
            .collection('arena_profiles')
            .doc(arenaUid)
            .set(
              {
                courseTotalXp: totalXp,
                courseAvatar: avatar || null,
                courseFrame: frame || null,
                courseAura: aura || null,
                courseProfileCardLevel: profileCardLevel,
                courseProfileCardTheme: profileCardTheme,
                courseProfileCardMotion: profileCardMotion,
                courseProfileCardPublicFocus: profileCardPublicFocus,
                courseDisplayAt: now,
                mirrorStableId: uid,
              },
              { merge: true },
            );
          if (!isSyncGenerationCurrent()) return;
        }
      } catch {
        /* ignore */
      }
    }
    lastSuccessfulSyncAt = now;
    if (needActivityStamp || needHeartbeat || shouldSendCreatedAt) {
      lastActivityStampAt = now;
    }
    const snapshotData: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data)) {
      if (isServerOwnedProgressKey(key)) continue;
      if (shouldSyncPremiumProgressField(key, value, data)) snapshotData[key] = value;
    }
    if (!isSyncGenerationCurrent()) return;
    await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(snapshotData)).catch(() => {});
    if (shouldSendCreatedAt) {
      if (!isSyncGenerationCurrent()) return;
      await AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(() => {});
    }

    // leaderboard/{uid} обновляется только через firestore_leaderboard.ts (pushMyScore)
    // + backend reconcile в functions/src/sync_leaderboard.ts.
    // Здесь сознательно НЕ пишем leaderboard, чтобы исключить dual-writer гонки.
  } catch (e) {
    if (__DEV__) console.warn('[cloud_sync] doSyncToCloud failed', e);
  }
}

// ── Восстановить прогресс из документа users/{uid} (без повторного get) ─────
async function applyRestoreFromUserDoc(
  doc: { exists: boolean; data: () => Record<string, unknown> | undefined },
  isCurrent?: () => boolean,
): Promise<boolean> {
  if (!doc.exists) return false;
  const assertCurrent = (): void => {
    if (isCurrent && !isCurrent()) throw new Error('stale_account_generation');
  };
  const root = doc.data() ?? {};
  if (root.created_at) {
    assertCurrent();
    AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(() => {});
  }
  const cloudData: Record<string, string | null> = (root.progress ?? {}) as Record<string, string | null>;
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
    cloudData['stats_daily_breakdown_v1'] = await reconcileStatsDailyBreakdownWithCloud(
      cloudData['stats_daily_breakdown_v1'],
      'en',
    );
    const frenchStatsKey = statsDailyBreakdownKey('fr');
    cloudData[frenchStatsKey] = await reconcileStatsDailyBreakdownWithCloud(
      cloudData[frenchStatsKey],
      'fr',
    );
  } catch {
    /* ignore */
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

  const [localXPRaw, localStreakRaw, localLastActiveRaw, localStreakLastRaw] = await Promise.all([
    AsyncStorage.getItem('user_total_xp'),
    AsyncStorage.getItem('streak_count'),
    AsyncStorage.getItem('last_active_date'),
    AsyncStorage.getItem('streak_last_date'),
  ]);
  const localXP = parseProgressInt(localXPRaw);
  const cloudXP = parseProgressInt(cloudData['user_total_xp']);
  const localStreak = parseProgressInt(localStreakRaw);
  const cloudStreak = parseProgressInt(cloudData['streak_count']);
  const mergedStreak = mergeStreakByActivityDate(
    { streak: localStreakRaw, lastActive: localLastActiveRaw, streakLast: localStreakLastRaw },
    { streak: cloudData['streak_count'], lastActive: cloudData['last_active_date'], streakLast: cloudData['streak_last_date'] },
  );
  const shouldRestoreCloudProgress =
    cloudXP > localXP || (cloudXP === localXP && cloudStreak > localStreak);
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
      // но должна трактоваться как «нет данных» — иначе '' затирает локальный активный план.
      if (PREMIUM_PROGRESS_KEYS.has(key) ? premiumValuePresent(val) : (val !== null && val !== undefined)) {
        stickyPairs.push([key, cloudProgressStorageValue(key, val)]);
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
      await AsyncStorage.multiGet([...MONOTONIC_COUNTER_RESTORE_KEYS]),
    ) as Record<string, string | null>;
    for (const key of MONOTONIC_COUNTER_RESTORE_KEYS) {
      const cloudVal = cloudData[key];
      if (cloudVal === null || cloudVal === undefined) continue;
      const merged = mergeLessonRestoreValue(key, cloudProgressStorageValue(key, cloudVal), localCounterMap[key]);
      if (merged !== localCounterMap[key]) stickyPairs.push([key, merged]);
    }
    const localStreakNormalized = localStreakRaw == null ? null : String(parseProgressInt(localStreakRaw));
    if (String(mergedStreak.streak) !== localStreakNormalized && (mergedStreak.streak > 0 || cloudData['streak_count'] != null)) {
      stickyPairs.push(['streak_count', String(mergedStreak.streak)]);
    }
    if (mergedStreak.lastActive && mergedStreak.lastActive !== localLastActiveRaw) {
      stickyPairs.push(['last_active_date', mergedStreak.lastActive]);
      stickyPairs.push(['streak_last_date', mergedStreak.lastActive]);
    }
    const cloudLoginBonus = cloudData['login_bonus_v1'];
    const localLoginBonus = await AsyncStorage.getItem('login_bonus_v1');
    const mergedLoginBonus = loginBonusMergeValue(localLoginBonus, cloudLoginBonus);
    if (mergedLoginBonus !== null) {
      stickyPairs.push(['login_bonus_v1', mergedLoginBonus]);
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
      for (const key of stickyOwnedKeys) {
        const cloudVal = cloudData[key];
        if (cloudVal === null || cloudVal === undefined || String(cloudVal).trim() === '') continue;
        const merged = mergeOwnedRestoreValue(cloudProgressStorageValue(key, cloudVal), localOwnedMap[key]);
        if (merged !== localOwnedMap[key]) stickyPairs.push([key, merged]);
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
    // Разовая админ-команда на энергию (client-owned energy_state) — тоже мимо sticky не
    // доедет. Тянем её из облака; energy_system применит один раз по метке at.
    const cloudEnergyCmd = cloudData[ADMIN_ENERGY_COMMAND_KEY];
    if (cloudEnergyCmd != null && String(cloudEnergyCmd).trim() !== '') {
      stickyPairs.push([ADMIN_ENERGY_COMMAND_KEY, String(cloudEnergyCmd)]);
    }
    stickyPairs.push(...await buildFrenchTargetStickyRestorePairs(cloudData));
    const cloudDaily = currentCloudDailyTasksProgress(cloudData);
    const restoredDailyTaskTargets: Array<'en' | 'fr'> = [];
    if (cloudDaily) {
      const dk = dailyTasksProgressKey(getTodayKey(), 'en');
      const localDaily = await AsyncStorage.getItem(dk);
      if (!localDaily) {
        stickyPairs.push([dk, cloudDaily]);
        restoredDailyTaskTargets.push('en');
      }
    }
    const cloudFrenchDaily = currentCloudDailyTasksProgress(
      cloudData,
      FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY,
      FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY,
    );
    if (cloudFrenchDaily) {
      const dk = dailyTasksProgressKey(getTodayKey(), 'fr');
      const localDaily = await AsyncStorage.getItem(dk);
      if (!localDaily) {
        stickyPairs.push([dk, cloudFrenchDaily]);
        restoredDailyTaskTargets.push('fr');
      }
    }
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
    stickyPairs.push(...await buildGiftEntitlementStickyPairs(cloudData));
    // tester «Снять премиум»: не восстанавливаем VIP-доступ из облака (см. выше).
    if (cloudVipActive !== null && !stripPremiumActive) {
      stickyPairs.push(
        ['vip_active', cloudVipActive ? 'true' : 'false'],
        ['vip_plan', cloudVipActive ? (cloudVipState?.plan ?? 'admin_vip') : ''],
        ['vip_from', cloudVipActive ? (cloudVipState?.fromValue ?? '0') : '0'],
        ['vip_until', cloudVipActive ? (cloudVipState?.untilValue ?? '0') : '0'],
        ['vip_admin_override', cloudVipActive ? 'true' : 'false'],
      );
      if (cloudVipState?.grantAt) stickyPairs.push(['vip_admin_grant_at', cloudVipState.grantAt]);
    }
    if (stickyPairs.length > 0) {
      assertCurrent();
      await AsyncStorage.multiSet(sanitizeStoragePairs(stickyPairs));
      if (cloudHasVipEntitlementState) invalidatePremiumCache();
      assertCurrent();
      await reconcileRestoredDayDailyStorageIfNeeded(restoredDailyTaskTargets);
      assertCurrent();
      await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(buildRestoreSnapshot(cloudData))).catch(() => {});
      return true;
    }
    return false;
  }

  const pairs: [string, string][] = [];
  // K2: owned-ключи тоже читаем локально — иначе mergeOwnedRestoreValue получит
  // undefined и «union» выродится в слепую перезапись облаком.
  const ownedUnionRuntimeKeys = getRuntimeSyncKeys().filter(isOwnedUnionRestoreKey);
  const localLessonRestoreMap = Object.fromEntries(
    await AsyncStorage.multiGet([...RESTORE_MERGE_KEY_SET, ...MONOTONIC_COUNTER_RESTORE_KEYS, ...ownedUnionRuntimeKeys]),
  ) as Record<string, string | null>;
  const localConsumedSig = await AsyncStorage.getItem('league_result_consumed_sig');
  const cloudConsumedSig = cloudData['league_result_consumed_sig'];
  for (const key of getRuntimeSyncKeys()) {
    if (
      key === CLOUD_DAILY_TASKS_PROGRESS_KEY ||
      key === CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY ||
      key === FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY ||
      key === FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY ||
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
      pairs.push([key, mergeLessonRestoreValue(key, storageValue, localLessonRestoreMap[key])]);
    }
  }
  if (mergedStreak.streak > 0 || cloudData['streak_count'] != null) {
    pairs.push(['streak_count', String(mergedStreak.streak)]);
  }
  if (mergedStreak.lastActive) {
    pairs.push(['last_active_date', mergedStreak.lastActive]);
    pairs.push(['streak_last_date', mergedStreak.lastActive]);
  }
  if (cloudData['achievements_state']) pairs.push(['achievements_v1', cloudData['achievements_state']]);
  if (!cloudData['flashcards_v1'] && cloudData['flashcards']) pairs.push(['flashcards_v1', String(cloudData['flashcards'])]);
  if (cloudData['lang']) pairs.push(['app_lang', cloudData['lang']]);
  if (cloudData['user_avatar_frame']) pairs.push(['user_frame', cloudData['user_avatar_frame']]);
  const dailyBlob = currentCloudDailyTasksProgress(cloudData);
  const fullRestoreDailyTargets: Array<'en' | 'fr'> = [];
  if (dailyBlob != null && dailyBlob !== '') {
    const dk = dailyTasksProgressKey(getTodayKey(), 'en');
    const localDailyForMerge = await AsyncStorage.getItem(dk);
    pairs.push([dk, mergeDailyTasksProgressForRestore(localDailyForMerge, String(dailyBlob))]);
    fullRestoreDailyTargets.push('en');
  }
  const frenchDailyBlob = currentCloudDailyTasksProgress(
    cloudData,
    FRENCH_CLOUD_DAILY_TASKS_PROGRESS_KEY,
    FRENCH_CLOUD_DAILY_TASKS_PROGRESS_DAY_KEY,
  );
  if (frenchDailyBlob != null && frenchDailyBlob !== '') {
    const dk = dailyTasksProgressKey(getTodayKey(), 'fr');
    const localDailyForMerge = await AsyncStorage.getItem(dk);
    pairs.push([dk, mergeDailyTasksProgressForRestore(localDailyForMerge, String(frenchDailyBlob))]);
    fullRestoreDailyTargets.push('fr');
  }
  for (const key of dailyLessonHelperKeysForToday()) {
    const value = cloudData[key];
    if (value !== null && value !== undefined) {
      pairs.push([key, cloudProgressStorageValue(key, value)]);
    }
  }
  if (pairs.length > 0) {
    assertCurrent();
    await AsyncStorage.multiSet(sanitizeStoragePairs(pairs));
    if (cloudHasVipEntitlementState) invalidatePremiumCache();
  }
  if (cloudVipActive !== null) {
    const vipPairs: [string, string][] = [
      ['vip_active', cloudVipActive ? 'true' : 'false'],
      ['vip_plan', cloudVipActive ? (cloudVipState?.plan ?? 'admin_vip') : ''],
      ['vip_from', cloudVipActive ? (cloudVipState?.fromValue ?? '0') : '0'],
      ['vip_until', cloudVipActive ? (cloudVipState?.untilValue ?? '0') : '0'],
      ['vip_admin_override', cloudVipActive ? 'true' : 'false'],
    ];
    if (cloudVipState?.grantAt) vipPairs.push(['vip_admin_grant_at', cloudVipState.grantAt]);
    assertCurrent();
    await AsyncStorage.multiSet(sanitizeStoragePairs(vipPairs));
    if (cloudHasVipEntitlementState) invalidatePremiumCache();
  }
  if (fullRestoreDailyTargets.length > 0) {
    assertCurrent();
    await reconcileRestoredDayDailyStorageIfNeeded(fullRestoreDailyTargets);
  }
  assertCurrent();
  await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(buildRestoreSnapshot(cloudData))).catch(() => {});
  return true;
}

/**
 * Один get users/{uid}: миграция «пустое облако» + мерж прогресса.
 * Снижает чтения Firestore по сравнению с restoreFromCloud + migrateLocalProgressToCloud.
 */
export type CloudRestoreResult = 'restored' | 'not_found' | 'failed';
type CloudRestoreAttempt = { status: CloudRestoreResult; applied: boolean };

function completedCloudRestoreAttempt(applied: boolean): CloudRestoreAttempt {
  return { status: 'restored', applied };
}

export async function restoreAndMigrateFromCloud(): Promise<boolean> {
  return (await restoreAndMigrateFromCloudResult(true)).applied;
}

async function restoreAndMigrateFromCloudResult(syncMissingDocument: boolean): Promise<CloudRestoreAttempt> {
  if (!CLOUD_SYNC_ENABLED) return { status: 'failed', applied: false };
  const db = getFirestore();
  if (!db) return { status: 'failed', applied: false };
  const uid = await ensureAnonUser();
  if (!uid) return { status: 'failed', applied: false };
  beginInitialAccountGeneration(uid);
  const accountGeneration = captureAccountGeneration();
  try {
    await ensureStableAuthLinkForStableId(uid).catch(() => false);
    const doc = await withTimeout<any>(
      db.collection('users').doc(uid).get(),
      RESTORE_FIRESTORE_READ_MS,
      'restore_user_doc',
    );
    const migrated = await AsyncStorage.getItem('cloud_migration_v1');
    if (!doc.exists) {
      if (!isCurrentAccountGeneration(accountGeneration, uid)) {
        return { status: 'failed', applied: false };
      }
      if (!migrated && syncMissingDocument) {
        await syncToCloud();
        if (!isCurrentAccountGeneration(accountGeneration, uid)) {
          return { status: 'failed', applied: false };
        }
        await AsyncStorage.setItem('cloud_migration_v1', '1').catch(() => {});
      }
      return { status: 'not_found', applied: false };
    }
    if (!migrated) {
      if (!isCurrentAccountGeneration(accountGeneration, uid)) {
        return { status: 'failed', applied: false };
      }
      await AsyncStorage.setItem('cloud_migration_v1', '1').catch(() => {});
    }
    if (!isCurrentAccountGeneration(accountGeneration, uid)) {
      return { status: 'failed', applied: false };
    }
    const applied = await withRestoreApplicationLock(() => (
      applyRestoreFromUserDoc(doc, () => isCurrentAccountGeneration(accountGeneration, uid))
    ));
    return completedCloudRestoreAttempt(applied);
  } catch {
    return { status: 'failed', applied: false };
  }
}

// ── Восстановить прогресс из облака ─────────────────────────────────────────
// Вызывается при старте приложения ПОСЛЕ того как определён uid.
// Если локальный XP > облачного — локальные данные побеждают (не перезаписываем).
export async function restoreFromCloud(): Promise<boolean> {
  return restoreAndMigrateFromCloud();
}

/** Auth-safe restore result: distinguishes an empty account from a transport failure. */
export async function restoreFromCloudDetailed(): Promise<CloudRestoreResult> {
  return (await restoreAndMigrateFromCloudResult(false)).status;
}

export const __cloudSyncTestHooks = {
  completedCloudRestoreAttempt,
  applyRestoreFromUserDoc,
  mergeLessonRestoreValue,
  mergeOwnedFlagMap,
  mergeOwnedRestoreValue,
  isOwnedUnionRestoreKey,
  buildRestoreSnapshot,
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
    // doSyncToCloud глотает ошибки внутри, так что обернём напрямую без try-catch фасада:
    // повторим логику записи минимально-инвазивно, ловя ошибки явно.
    await repairDevSeededStreakInStorage();
    const pairs = await AsyncStorage.multiGet(getRuntimeSyncKeys());
    const data: Record<string, string | null> = {};
    for (const [key, value] of pairs) data[key] = value;
    removeCloudOnlyDailyTaskSnapshots(data);
    const achievementsV1 = await AsyncStorage.getItem('achievements_v1');
    if (achievementsV1) data['achievements_state'] = achievementsV1;
    if (data['app_lang']) data['lang'] = data['app_lang'];
    if (data['user_frame']) data['user_avatar_frame'] = data['user_frame'];
    await addTodayDailyTaskSnapshots(data);
    for (const [key, value] of Object.entries({ ...data })) {
      if (!shouldSyncPremiumProgressField(key, value, data)) delete data[key];
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
    const firebaseAuthUidRow = getAuthUserId();
    await withTimeout(
      docRef.set(
        {
          ...(firebaseAuthUidRow ? { firebaseAuthUid: firebaseAuthUidRow } : {}),
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
    if (firebaseAuthUidRow) {
      try {
        const arenaUid = await ensureArenaAuthUid();
        if (arenaUid === firebaseAuthUidRow) {
          const totalXp = parseInt(data['user_total_xp'] ?? '0', 10) || 0;
          const avatar = (data['user_avatar'] ?? '').trim();
          const frame = (data['user_frame'] ?? '').trim();
          const aura = (data['user_avatar_aura'] ?? '').trim();
          const profileCardLevel = Math.max(0, Math.min(1, parseInt(data['profile_card_level'] ?? '0', 10) || 0));
          const profileCardTheme = (data['profile_card_theme'] ?? 'classic').trim() || 'classic';
          const profileCardMotion = (data['profile_card_motion'] ?? 'none').trim() || 'none';
          const profileCardPublicFocus = (data['profile_card_public_focus'] ?? 'balanced').trim() || 'balanced';
          await withTimeout(
            db.collection('arena_profiles').doc(arenaUid).set(
              {
                courseTotalXp: totalXp,
                courseAvatar: avatar || null,
                courseFrame: frame || null,
                courseAura: aura || null,
                courseProfileCardLevel: profileCardLevel,
                courseProfileCardTheme: profileCardTheme,
                courseProfileCardMotion: profileCardMotion,
                courseProfileCardPublicFocus: profileCardPublicFocus,
                courseDisplayAt: now,
                mirrorStableId: uid,
              },
              { merge: true },
            ),
            FORCE_SYNC_FIRESTORE_WRITE_MS,
            'arena_profile_set',
          );
        }
      } catch {
        /* ignore */
      }
    }
    lastSuccessfulSyncAt = now;
    lastActivityStampAt = now;
    pendingSync = false;
    await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(data)).catch(() => {});
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
export async function saveAccountSwitchEmergencyBackup(reason: string): Promise<void> {
  try {
    const keys = accountLocalDataKeysForToday();
    const pairs = (await AsyncStorage.multiGet(keys)).filter(([, value]) => value != null);
    const stableId = await getCanonicalUserId().catch(() => null);
    await AsyncStorage.setItem(ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY, JSON.stringify({
      version: 1,
      createdAt: Date.now(),
      reason: String(reason || 'unknown').slice(0, 80),
      stableId,
      pairs,
    }));
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[cloud_sync] account switch emergency backup failed', e);
    }
  }
}

export async function wipeLocalAccountData(): Promise<void> {
  const accountKeys = new Set<string>(accountLocalDataKeysForToday());
  // Сохраняем НЕ-аккаунтные настройки устройства:
  const KEEP = new Set<string>(['app_theme', 'app_font_size', 'haptics_tap']);
  const toRemove = Array.from(accountKeys).filter((k) => !KEEP.has(k));
  try {
    await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    if (__DEV__) console.warn('[cloud_sync] wipeLocalAccountData partial failure', e);
  }
  // Сбрасываем in-memory bookkeeping синка
  lastSuccessfulSyncAt = 0;
  lastActivityStampAt = 0;
  pendingSync = false;
  resetAppSnapshotForAccountSwitch();
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

// ── Удалить все данные пользователя из облака ────────────────────────────────
// Вызывается при нажатии "Удалить аккаунт" в настройках.
export async function deleteCloudData(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  if (IS_EXPO_GO) return;
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
};

export async function enqueueCloudDeletion(stableId: string | null): Promise<AccountDeleteEnqueueAck> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    throw new Error('account_delete_enqueue_unavailable');
  }
  return runAccountDeleteEnqueueWithDeadline(
    () => initFirebaseAppCheckIfAvailable().catch(() => {}),
    async () => {
      const fn = callable<
        { stableId?: string | null },
        AccountDeleteEnqueueAck
      >('accountDeleteEnqueue', { timeout: ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS });
      const res = await fn({ stableId });
      if (!res.data?.ok || !res.data.jobId) throw new Error('account_delete_enqueue_failed');
      return res.data;
    },
    ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS,
  );
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
