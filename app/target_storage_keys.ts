import {
  SOURCE_LOCALES,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
  type SourceLocale,
  type StudyTarget,
} from './study_target';

export { assertStudyTarget, defaultStudyTarget, isStudyTarget };

export const TARGET_KEY_DOMAINS = [
  'lesson_progress',
  'lesson_session_local',
  'lesson_rewards',
  'level_exams',
  'trainer_practice',
  'personal_practice',
  'daily_tasks',
  'cloud_sync',
  'daily_phrase',
  'flashcards',
  'quiz_session',
  'quiz_achievements',
  'target_stats',
  'achievements',
] as const;
export type TargetKeyDomain = typeof TARGET_KEY_DOMAINS[number];

export const SOURCE_TARGET_KEY_DOMAINS = ['personal_practice'] as const;
export type SourceTargetKeyDomain = typeof SOURCE_TARGET_KEY_DOMAINS[number];
export type RuntimeStudyTarget = StudyTarget | 'es' | (string & {}) | null | undefined;
export type RuntimeSourceLocale = SourceLocale | (string & {}) | null | undefined;

const SEP = '::';
const FLASHCARDS_MARKET_DEV_STORAGE_PREFIX = ['flashcards', 'market', 'dev'].join('_');
const FLASHCARDS_MARKET_DEV_OWNED_KEY = `${FLASHCARDS_MARKET_DEV_STORAGE_PREFIX}_owned_v1`;
const FLASHCARDS_MARKET_DEV_ACTIVE_PACK_KEY = `${FLASHCARDS_MARKET_DEV_STORAGE_PREFIX}_active_pack_v1`;

const RAW_TARGET_SENSITIVE_PATTERNS = [
  /^lesson\d+_(?:progress|best_score|pass_count|words|listening_progress|preposition_progress|intro_shown|cellIndex|phraseOrder|contentSignature|errorReplayQueue|errorReplaySince|errorReplayOverride|bonus_granted)$/,
  /^lesson\d+_words_shards_granted$/,
  /^lesson\d+_irregular_shards_granted$/,
  /^lesson_finished_once_v1_\d+$/,
  /^lesson_replay_count_v1_\d+$/,
  /^achievement_lesson_\d+_perfect_passes_v1$/,
  /^achievement_lesson_marathon_day_\d{4}-\d{2}-\d{2}$/,
  /^grammar_hint_[a-z0-9_]+$/,
  /^theory_xp_claimed_\d+$/,
  /^prep_drill_perfect_\d+$/,
  /^unlocked_lessons$/,
  /^premium_course_level$/,
  /^lesson_unlock_repair_v3$/,
  /^last_opened_lesson$/,
  /^fifty_fifty_\d{4}-\d{2}-\d{2}$/,
  /^bonus_hints_\d{4}-\d{2}-\d{2}$/,
  /^daily_tasks_\d{4}-\d{2}-\d{2}$/,
  /^daily_tasks_reroll_v1$/,
  /^daily_tasks_admin_override_v1$/,
  /^achievement_all_daily_streak_v1$/,
  /^achievement_daily_no_reroll_streak_v1$/,
  /^daily_phrase_v3$/,
  /^last_phrase_date_v3$/,
  /^daily_phrase_remote_cache_v1$/,
  /^achievement_daily_phrase_read_count$/,
  /^achievement_daily_phrase_save_count$/,
  /^lesson_visited_\d{4}-\d{2}-\d{2}$/,
  /^diagnostic_last$/,
  /^open_diagnostic$/,
  /^quiz_nav_level$/,
  /^lifetime_quiz_(?:easy|medium|hard)_v1$/,
  /^achievement_quiz_total_count$/,
  /^quiz_hard_count$/,
  /^achievement_quiz_hard_perfect_count$/,
  /^achievement_quiz_perfect_levels_today_v1$/,
  /^achievement_quiz_perfect_streak_v1$/,
  /^achievement_combo_best_count$/,
  /^achievements_v1$/,
  /^user_stats_v1$/,
  /^stats_daily_breakdown_v1$/,
  /^irregular_verbs_global$/,
  /^lingman_certificate_v1$/,
  /^custom_flashcards_v2$/,
  /^flashcard_delete_hint_seen$/,
  /^flashcard_pack_trial_gift_v1$/,
  /^achievement_flashcards_saved_count$/,
  /^achievement_flashcards_flip_count$/,
  /^achievement_flashcards_view_streak_v1$/,
  /^achievement_flashcards_source_set_v1$/,
  /^achievement_share_count$/,
  /^achievement_trainer_correct_count$/,
  /^achievement_active_recall_correct_count$/,
  /^achievement_trainer_correct_streak_v1$/,
  /^achievement_trainer_perfect_session_count$/,
  /^community_owned_pack_ids_v1$/,
  new RegExp(`^${FLASHCARDS_MARKET_DEV_OWNED_KEY}$`),
  /^flashcards_owned_packs_v1$/,
  /^flashcards_progress_v1$/,
  /^flashcards_swipe_session_draft_v1$/,
  /^flashcards_swipe_memory_v1$/,
  /^flashcards_market_built_cards_v1$/,
  new RegExp(`^${FLASHCARDS_MARKET_DEV_ACTIVE_PACK_KEY}$`),
  /^flashcards_opened_packs_v1$/,
  /^hidden_community_pack_ids_v1$/,
  /^community_pack_create_draft_v1$/,
  /^lingman_exam_available$/,
  /^level_exam_[^:]+_(?:passed|available|pct|best_pct|pass_count|attempt_count|medal_tier)$/,
  /^shards_5perfect_milestone_.+$/,
  /^shards_topic_[^:]+_granted$/,
  /^(?:lesson_progress|lesson_words|lesson_session|trainer_store|mistake_log|active_recall|flashcards|level_exam|certificate|personal_practice)_v1(?:$|::)/,
  /^active_recall_items$/,
  /^trainer_free_session_v1$/,
  /^trainer_session_entry_v1$/,
  /^diagnosis_training_progress_v1:.+$/,
  /^diagnosis_training_free_access_v1$/,
  /^resolved_personal_trainings_v1$/,
  /^pos_mastery_v1$/,
];
const TARGET_SCOPED_KEY_PATTERN = /^(?:(?:lesson_progress|lesson_session_local|lesson_rewards|level_exams|trainer_practice|daily_tasks|cloud_sync|daily_phrase|flashcards|quiz_achievements|target_stats|achievements)_v2::(?:en|fr)(?:::|$)|personal_practice_v2::(?:en|fr)::(?:ru|uk)(?:::|$))/;

function assertMember<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error('Unsupported ' + label + ': ' + value);
}

function encodeKeyPart(id: string | number): string {
  const raw = String(id);
  if (raw.length === 0) throw new Error('Empty target key id is not allowed');
  return encodeURIComponent(raw);
}

export function targetKey(domain: TargetKeyDomain, studyTarget: StudyTarget, id?: string | number): string {
  const safeDomain = assertMember(domain, TARGET_KEY_DOMAINS, 'TargetKeyDomain');
  const safeTarget = assertStudyTarget(studyTarget);
  const base = safeDomain + '_v2' + SEP + safeTarget;
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function storageStudyTarget(studyTarget?: RuntimeStudyTarget): StudyTarget {
  return studyTarget === 'fr' ? 'fr' : defaultStudyTarget();
}

export function storageSourceLocale(sourceLocale?: RuntimeSourceLocale): SourceLocale {
  return sourceLocale === 'uk' ? 'uk' : 'ru';
}

function storageCommunityDraftSourceLocale(sourceLocale?: RuntimeSourceLocale): string {
  const normalized = sourceLocale === 'pt_BR' || String(sourceLocale).toLowerCase() === 'pt-br'
    ? 'pt-BR'
    : sourceLocale;
  return normalized === 'uk' ||
    normalized === 'es' ||
    normalized === 'pt-BR' ||
    normalized === 'vi' ||
    normalized === 'id' ||
    normalized === 'tr' ||
    normalized === 'pl'
    ? normalized
    : 'ru';
}

function scopedOrLegacyKey(
  rawEnglishKey: string,
  domain: TargetKeyDomain,
  studyTarget?: RuntimeStudyTarget,
  id: string | number = rawEnglishKey,
): string {
  const target = storageStudyTarget(studyTarget);
  return target === 'fr' ? targetKey(domain, target, id) : rawEnglishKey;
}

function scopedSourceTargetOrLegacyKey(
  rawEnglishKey: string,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
  id: string | number = rawEnglishKey,
): string {
  const target = storageStudyTarget(studyTarget);
  return target === 'fr'
    ? sourceTargetKey('personal_practice', target, storageSourceLocale(sourceLocale), id)
    : rawEnglishKey;
}

export function lessonProgressKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey(`lesson${lessonId}_progress`, 'lesson_progress', studyTarget, lessonId);
}

export function lessonBestScoreKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_best_score`;
  return scopedOrLegacyKey(raw, 'lesson_progress', studyTarget);
}

export function lessonPassCountKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_pass_count`;
  return scopedOrLegacyKey(raw, 'lesson_progress', studyTarget);
}

export function lessonWordsKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_words`;
  return scopedOrLegacyKey(raw, 'lesson_progress', studyTarget);
}

export function lessonListeningProgressKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_listening_progress`;
  return scopedOrLegacyKey(raw, 'lesson_progress', studyTarget);
}

export function lessonWordsShardsGrantedKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_words_shards_granted`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function lessonIrregularShardsGrantedKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_irregular_shards_granted`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function irregularVerbsGlobalKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('irregular_verbs_global', 'lesson_progress', studyTarget);
}

export function lessonPrepositionProgressKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_preposition_progress`;
  return scopedOrLegacyKey(raw, 'lesson_progress', studyTarget);
}

export function lessonIntroShownKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_intro_shown`;
  return scopedOrLegacyKey(raw, 'lesson_session_local', studyTarget);
}

export function lessonSessionKey(
  lessonId: string | number,
  field: 'cellIndex' | 'phraseOrder' | 'contentSignature' | 'errorReplayQueue' | 'errorReplaySince' | 'errorReplayOverride' | 'serverAttemptId',
  studyTarget?: RuntimeStudyTarget,
): string {
  const raw = `lesson${lessonId}_${field}`;
  return scopedOrLegacyKey(raw, 'lesson_session_local', studyTarget);
}

export function lessonCycleEndIntroShownKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('lesson_cycle_end_intro_shown', 'lesson_session_local', studyTarget);
}

export function lastOpenedLessonKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('last_opened_lesson', 'lesson_session_local', studyTarget);
}

export function fiftyFiftyUsageKey(dayKey: string, studyTarget?: RuntimeStudyTarget): string {
  const raw = `fifty_fifty_${dayKey}`;
  return scopedOrLegacyKey(raw, 'lesson_session_local', studyTarget);
}

export function lessonBonusHintsKey(dayKey: string, studyTarget?: RuntimeStudyTarget): string {
  const raw = `bonus_hints_${dayKey}`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function dailyTasksProgressKey(dayKey: string, studyTarget?: RuntimeStudyTarget): string {
  const raw = `daily_tasks_${dayKey}`;
  return scopedOrLegacyKey(raw, 'daily_tasks', studyTarget);
}

export function dailyTasksRerollKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('daily_tasks_reroll_v1', 'daily_tasks', studyTarget);
}

export function dailyTasksAdminOverrideKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('daily_tasks_admin_override_v1', 'daily_tasks', studyTarget);
}

export function dailyTasksAchievementAllDoneStreakKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_all_daily_streak_v1', 'daily_tasks', studyTarget);
}

export function dailyTasksAchievementNoRerollStreakKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_daily_no_reroll_streak_v1', 'daily_tasks', studyTarget);
}

export function dailyTaskLessonVisitedKey(dayKey: string, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson_visited_${dayKey}`;
  return scopedOrLegacyKey(raw, 'daily_tasks', studyTarget);
}

export function dailyPhraseKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('daily_phrase_v3', 'daily_phrase', studyTarget);
}

export function dailyPhraseLastDateKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('last_phrase_date_v3', 'daily_phrase', studyTarget);
}

export function dailyPhraseRemoteCacheKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('daily_phrase_remote_cache_v1', 'daily_phrase', studyTarget);
}

export function dailyPhraseAchievementReadCountKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_daily_phrase_read_count', 'daily_phrase', studyTarget);
}

export function dailyPhraseAchievementSaveCountKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_daily_phrase_save_count', 'daily_phrase', studyTarget);
}

export function quizNavLevelKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('quiz_nav_level', 'quiz_session', studyTarget);
}

export function quizLifetimeCounterKey(
  rawEnglishKey: 'lifetime_quiz_easy_v1' | 'lifetime_quiz_medium_v1' | 'lifetime_quiz_hard_v1',
  studyTarget?: RuntimeStudyTarget,
): string {
  return scopedOrLegacyKey(rawEnglishKey, 'quiz_session', studyTarget);
}

export function quizAchievementCounterKey(
  rawEnglishKey: 'achievement_quiz_total_count' | 'quiz_hard_count' | 'achievement_quiz_hard_perfect_count',
  studyTarget?: RuntimeStudyTarget,
): string {
  return scopedOrLegacyKey(rawEnglishKey, 'quiz_achievements', studyTarget);
}

export function quizPerfectLevelsTodayKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_quiz_perfect_levels_today_v1', 'quiz_achievements', studyTarget);
}

export function quizPerfectStreakKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_quiz_perfect_streak_v1', 'quiz_achievements', studyTarget);
}

export function comboAchievementCounterKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_combo_best_count', 'achievements', studyTarget);
}

export function shareAchievementCounterKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_share_count', 'achievements', studyTarget);
}

export function userStatsKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('user_stats_v1', 'target_stats', studyTarget);
}

export function statsDailyBreakdownKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('stats_daily_breakdown_v1', 'target_stats', studyTarget);
}

export function achievementStateKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievements_v1', 'achievements', studyTarget);
}

export function unlockedLessonsKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('unlocked_lessons', 'lesson_progress', studyTarget);
}

export function premiumCourseLevelKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('premium_course_level', 'lesson_progress', studyTarget);
}

export function levelExamKey(
  level: string,
  field: 'passed' | 'available' | 'pct' | 'best_pct' | 'pass_count' | 'attempt_count' | 'medal_tier',
  studyTarget?: RuntimeStudyTarget,
): string {
  const raw = `level_exam_${level}_${field}`;
  return scopedOrLegacyKey(raw, 'level_exams', studyTarget);
}

export function lingmanExamAvailableKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('lingman_exam_available', 'level_exams', studyTarget);
}

export function lingmanCertificateKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('lingman_certificate_v1', 'level_exams', studyTarget);
}

export function diagnosticLastKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('diagnostic_last', 'level_exams', studyTarget);
}

export function diagnosticOpenFlagKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('open_diagnostic', 'level_exams', studyTarget);
}

export function lessonUnlockRepairKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('lesson_unlock_repair_v3', 'lesson_progress', studyTarget);
}

export function lessonBonusGrantedKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson${lessonId}_bonus_granted`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function lessonPerfectMilestoneKey(perfectCount: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `shards_5perfect_milestone_${perfectCount}`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function lessonTopicShardGrantedKey(level: string, studyTarget?: RuntimeStudyTarget): string {
  const raw = `shards_topic_${level}_granted`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function lessonTheoryXpClaimedKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `theory_xp_claimed_${lessonId}`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function prepositionDrillPerfectKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `prep_drill_perfect_${lessonId}`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function masteryFinishedOnceKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson_finished_once_v1_${lessonId}`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function masteryReplayCountKey(lessonId: string | number, studyTarget?: RuntimeStudyTarget): string {
  const raw = `lesson_replay_count_v1_${lessonId}`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function achievementLessonPerfectPassesKey(
  lessonId: string | number,
  studyTarget?: RuntimeStudyTarget,
): string {
  const raw = `achievement_lesson_${lessonId}_perfect_passes_v1`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function achievementLessonMarathonDayKey(dayKey: string, studyTarget?: RuntimeStudyTarget): string {
  const raw = `achievement_lesson_marathon_day_${dayKey}`;
  return scopedOrLegacyKey(raw, 'lesson_rewards', studyTarget);
}

export function grammarHintSeenKey(hintKey: string, studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey(hintKey, 'lesson_session_local', studyTarget);
}

export function trainerStoreKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('trainer_store_v1', 'trainer_practice', studyTarget);
}

export function trainerFreeSessionKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('trainer_free_session_v1', 'trainer_practice', studyTarget);
}

export function trainerSessionEntryKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('trainer_session_entry_v1', 'trainer_practice', studyTarget);
}

export function mistakeLogKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('mistake_log_v1', 'trainer_practice', studyTarget);
}

export function weeklyReviewStorageKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('weekly_review_v1', 'trainer_practice', studyTarget);
}

export function statsInsightsStorageKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('stats_insights_v1', 'trainer_practice', studyTarget);
}

export function activeRecallItemsKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('active_recall_items', 'trainer_practice', studyTarget);
}

export function trainerAchievementCorrectCountKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_trainer_correct_count', 'trainer_practice', studyTarget);
}

export function activeRecallAchievementCorrectCountKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_active_recall_correct_count', 'trainer_practice', studyTarget);
}

export function trainerAchievementCorrectStreakKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_trainer_correct_streak_v1', 'trainer_practice', studyTarget);
}

export function trainerAchievementPerfectSessionCountKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_trainer_perfect_session_count', 'trainer_practice', studyTarget);
}

export function posMasteryKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('pos_mastery_v1', 'trainer_practice', studyTarget);
}

export function personalPracticeTrainingProgressKey(
  id: string | number,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): string {
  const raw = `diagnosis_training_progress_v1:${id}`;
  return scopedSourceTargetOrLegacyKey(raw, studyTarget, sourceLocale);
}

export function personalPracticeFreeAccessKey(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): string {
  return scopedSourceTargetOrLegacyKey('diagnosis_training_free_access_v1', studyTarget, sourceLocale);
}

export function resolvedPersonalTrainingsKey(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): string {
  return scopedSourceTargetOrLegacyKey('resolved_personal_trainings_v1', studyTarget, sourceLocale);
}

export function flashcardsSavedKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcards_v1', 'flashcards', studyTarget);
}

export function customFlashcardsKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('custom_flashcards_v2', 'flashcards', studyTarget);
}

export function flashcardsCommunityOwnedPacksKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('community_owned_pack_ids_v1', 'flashcards', studyTarget);
}

export function flashcardsMarketDevOwnedPacksKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey(FLASHCARDS_MARKET_DEV_OWNED_KEY, 'flashcards', studyTarget);
}

export function flashcardsOwnedPacksKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcards_owned_packs_v1', 'flashcards', studyTarget);
}

export function flashcardsProgressKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcards_progress_v1', 'flashcards', studyTarget);
}

export function flashcardsDeleteHintSeenKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcard_delete_hint_seen', 'flashcards', studyTarget);
}

export function flashcardsPackTrialGiftKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcard_pack_trial_gift_v1', 'flashcards', studyTarget);
}

export function flashcardsAchievementSavedCountKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_flashcards_saved_count', 'flashcards', studyTarget);
}

export function flashcardsAchievementFlipCountKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_flashcards_flip_count', 'flashcards', studyTarget);
}

export function flashcardsAchievementViewStreakKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_flashcards_view_streak_v1', 'flashcards', studyTarget);
}

export function flashcardsAchievementSourceSetKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('achievement_flashcards_source_set_v1', 'flashcards', studyTarget);
}

export function flashcardsSwipeSessionDraftKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcards_swipe_session_draft_v1', 'flashcards', studyTarget);
}

export function flashcardsSwipeMemoryKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcards_swipe_memory_v1', 'flashcards', studyTarget);
}

export function flashcardsMarketplaceBuiltCardsCacheKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcards_market_built_cards_v1', 'flashcards', studyTarget);
}

export function flashcardsMarketDevActivePackKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey(FLASHCARDS_MARKET_DEV_ACTIVE_PACK_KEY, 'flashcards', studyTarget);
}

export function flashcardsOpenedPacksKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('flashcards_opened_packs_v1', 'flashcards', studyTarget);
}

export function flashcardsHiddenCommunityPacksKey(studyTarget?: RuntimeStudyTarget): string {
  return scopedOrLegacyKey('hidden_community_pack_ids_v1', 'flashcards', studyTarget);
}

export function communityPackCreateDraftKey(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): string {
  const raw = 'community_pack_create_draft_v1';
  const target = storageStudyTarget(studyTarget);
  const source = storageCommunityDraftSourceLocale(sourceLocale);
  if (target === 'en' && source === 'ru') return raw;
  return targetKey('flashcards', target, raw + ':' + source);
}

export function sourceTargetKey(
  domain: SourceTargetKeyDomain,
  studyTarget: StudyTarget,
  sourceLocale: SourceLocale,
  id?: string | number,
): string {
  const safeDomain = assertMember(domain, SOURCE_TARGET_KEY_DOMAINS, 'SourceTargetKeyDomain');
  const safeTarget = assertStudyTarget(studyTarget);
  const safeSource = assertMember(sourceLocale, SOURCE_LOCALES, 'SourceLocale');
  const base = safeDomain + '_v2' + SEP + safeTarget + SEP + safeSource;
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function legacyEnglishKey(domain: TargetKeyDomain, id?: string | number): string {
  const safeDomain = assertMember(domain, TARGET_KEY_DOMAINS, 'TargetKeyDomain');
  const base = safeDomain + '_legacy_en';
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function assertTargetKey(key: string): string {
  if (TARGET_SCOPED_KEY_PATTERN.test(key)) return key;
  if (RAW_TARGET_SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
    throw new Error('Raw target-sensitive key is blocked: ' + key);
  }
  return key;
}

export default function __TargetStorageKeysRouteShim() {
  return null;
}
