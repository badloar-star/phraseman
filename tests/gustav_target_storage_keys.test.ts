import {
  assertTargetKey,
  activeRecallAchievementCorrectCountKey,
  achievementLessonMarathonDayKey,
  achievementLessonPerfectPassesKey,
  comboAchievementCounterKey,
  activeRecallItemsKey,
  customFlashcardsKey,
  dailyPhraseAchievementReadCountKey,
  dailyPhraseAchievementSaveCountKey,
  dailyTasksAchievementAllDoneStreakKey,
  dailyTasksAchievementNoRerollStreakKey,
  legacyEnglishKey,
  dailyTaskLessonVisitedKey,
  dailyTasksProgressKey,
  dailyTasksRerollKey,
  diagnosticLastKey,
  diagnosticOpenFlagKey,
  fiftyFiftyUsageKey,
  flashcardsAchievementFlipCountKey,
  flashcardsAchievementSavedCountKey,
  flashcardsAchievementSourceSetKey,
  flashcardsAchievementViewStreakKey,
  flashcardsCommunityOwnedPacksKey,
  flashcardsDeleteHintSeenKey,
  flashcardsHiddenCommunityPacksKey,
  communityPackCreateDraftKey,
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
  lessonBestScoreKey,
  lessonBonusHintsKey,
  lessonBonusGrantedKey,
  lessonIntroShownKey,
  lessonIrregularShardsGrantedKey,
  lessonListeningProgressKey,
  lastOpenedLessonKey,
  lessonPassCountKey,
  lessonPerfectMilestoneKey,
  lessonPrepositionProgressKey,
  lessonProgressKey,
  lessonSessionKey,
  lessonWordsShardsGrantedKey,
  lessonTheoryXpClaimedKey,
  lessonTopicShardGrantedKey,
  lessonUnlockRepairKey,
  lessonWordsKey,
  irregularVerbsGlobalKey,
  levelExamKey,
  lingmanExamAvailableKey,
  lingmanCertificateKey,
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
  sourceTargetKey,
  statsDailyBreakdownKey,
  storageSourceLocale,
  storageStudyTarget,
  targetKey,
  trainerAchievementCorrectCountKey,
  trainerAchievementCorrectStreakKey,
  trainerAchievementPerfectSessionCountKey,
  trainerStoreKey,
  type TargetKeyDomain,
  unlockedLessonsKey,
  userStatsKey,
} from '../app/target_storage_keys';

describe('target storage key contract', () => {
  it('produces distinct target keys for English and French', () => {
    expect(targetKey('lesson_progress', 'en', '1')).toBe('lesson_progress_v2::en::1');
    expect(targetKey('lesson_progress', 'fr', '1')).toBe('lesson_progress_v2::fr::1');
    expect(targetKey('lesson_progress', 'en', '1')).not.toBe(targetKey('lesson_progress', 'fr', '1'));
  });

  it('keeps sourceLocale as a separate key segment only where required', () => {
    expect(sourceTargetKey('personal_practice', 'fr', 'ru', 'diagnosis-1')).toBe('personal_practice_v2::fr::ru::diagnosis-1');
    expect(sourceTargetKey('personal_practice', 'fr', 'uk', 'diagnosis-1')).toBe('personal_practice_v2::fr::uk::diagnosis-1');
  });

  it('keeps legacy English keys visibly English-only', () => {
    expect(legacyEnglishKey('lesson_progress', '1')).toBe('lesson_progress_legacy_en::1');
    expect(legacyEnglishKey('lesson_progress', '1')).not.toContain('fr');
  });

  it('encodes reserved id characters without leaking separators', () => {
    const key = targetKey('lesson_progress', 'fr', 'lesson::1/a?b=c#d&e=%25');
    expect(key).toBe('lesson_progress_v2::fr::lesson%3A%3A1%2Fa%3Fb%3Dc%23d%26e%3D%2525');
    expect(key.split('::')).toHaveLength(3);
  });

  it('rejects empty ids and raw target-sensitive keys', () => {
    expect(() => targetKey('lesson_progress', 'fr', '')).toThrow(/Empty target key id/);
    expect(() => assertTargetKey('lesson_progress_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('active_recall_items')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('diagnosis_training_progress_v1:article_a_an')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('diagnosis_training_free_access_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('resolved_personal_trainings_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('pos_mastery_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('theory_xp_claimed_1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lesson1_best_score')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lesson1_pass_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lesson1_listening_progress')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lesson1_words_shards_granted')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lesson1_irregular_shards_granted')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lesson1_intro_shown')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_lesson_1_perfect_passes_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_lesson_marathon_day_2026-05-22')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('grammar_hint_articles')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('last_opened_lesson')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('fifty_fifty_2026-05-20')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('bonus_hints_2026-05-20')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('daily_tasks_2026-05-20')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('daily_tasks_reroll_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_all_daily_streak_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_daily_no_reroll_streak_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('daily_phrase_v3')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_daily_phrase_read_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_daily_phrase_save_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lesson_visited_2026-05-20')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('quiz_nav_level')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lifetime_quiz_easy_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lifetime_quiz_medium_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lifetime_quiz_hard_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_quiz_perfect_levels_today_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_quiz_perfect_streak_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_combo_best_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievements_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('diagnostic_last')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('open_diagnostic')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('irregular_verbs_global')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('custom_flashcards_v2')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcard_delete_hint_seen')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcard_pack_trial_gift_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_flashcards_saved_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_flashcards_flip_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_flashcards_view_streak_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_flashcards_source_set_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_share_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('community_owned_pack_ids_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('hidden_community_pack_ids_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('community_pack_create_draft_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcards_market_dev_owned_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcards_owned_packs_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcards_progress_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcards_swipe_session_draft_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcards_swipe_memory_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcards_market_built_cards_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcards_market_dev_active_pack_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('flashcards_opened_packs_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_trainer_correct_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_active_recall_correct_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_trainer_correct_streak_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('achievement_trainer_perfect_session_count')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('prep_drill_perfect_8')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('level_exam_A1_passed')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('level_exam_A1_medal_tier')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('premium_course_level')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lingman_exam_available')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('lingman_certificate_v1')).toThrow(/Raw target-sensitive key/);
    expect(() => assertTargetKey('daily_stats')).not.toThrow();
    expect(() => assertTargetKey('achievements_state')).not.toThrow();
    expect(assertTargetKey(targetKey('flashcards' as TargetKeyDomain, 'fr'))).toBe('flashcards_v2::fr');
    expect(assertTargetKey(lessonTheoryXpClaimedKey(1, 'fr'))).toBe('lesson_rewards_v2::fr::theory_xp_claimed_1');
    expect(assertTargetKey(levelExamKey('A1', 'passed', 'fr'))).toBe('level_exams_v2::fr::level_exam_A1_passed');
  });

  it('keeps the current English app on legacy lesson keys while scoping French', () => {
    expect(storageStudyTarget('es')).toBe('en');
    expect(storageSourceLocale('uk')).toBe('uk');
    expect(storageSourceLocale('es')).toBe('ru');
    expect(lessonProgressKey(1, 'en')).toBe('lesson1_progress');
    expect(lessonProgressKey(1, 'es')).toBe('lesson1_progress');
    expect(lessonProgressKey(1, 'fr')).toBe('lesson_progress_v2::fr::1');
    expect(lessonBestScoreKey(1, 'fr')).toBe('lesson_progress_v2::fr::lesson1_best_score');
    expect(lessonPassCountKey(1, 'fr')).toBe('lesson_progress_v2::fr::lesson1_pass_count');
    expect(lessonListeningProgressKey(1, 'en')).toBe('lesson1_listening_progress');
    expect(lessonListeningProgressKey(1, 'fr')).toBe('lesson_progress_v2::fr::lesson1_listening_progress');
    expect(lessonWordsKey(1, 'fr')).toBe('lesson_progress_v2::fr::lesson1_words');
    expect(lessonWordsShardsGrantedKey(1, 'fr')).toBe('lesson_rewards_v2::fr::lesson1_words_shards_granted');
    expect(lessonIrregularShardsGrantedKey(1, 'en')).toBe('lesson1_irregular_shards_granted');
    expect(lessonIrregularShardsGrantedKey(1, 'fr')).toBe('lesson_rewards_v2::fr::lesson1_irregular_shards_granted');
    expect(irregularVerbsGlobalKey('en')).toBe('irregular_verbs_global');
    expect(irregularVerbsGlobalKey('fr')).toBe('lesson_progress_v2::fr::irregular_verbs_global');
    expect(lessonPrepositionProgressKey(8, 'fr')).toBe('lesson_progress_v2::fr::lesson8_preposition_progress');
    expect(lessonIntroShownKey(1, 'fr')).toBe('lesson_session_local_v2::fr::lesson1_intro_shown');
    expect(lessonSessionKey(1, 'cellIndex', 'fr')).toBe('lesson_session_local_v2::fr::lesson1_cellIndex');
    expect(lastOpenedLessonKey('fr')).toBe('lesson_session_local_v2::fr::last_opened_lesson');
    expect(fiftyFiftyUsageKey('2026-05-20', 'en')).toBe('fifty_fifty_2026-05-20');
    expect(fiftyFiftyUsageKey('2026-05-20', 'fr')).toBe('lesson_session_local_v2::fr::fifty_fifty_2026-05-20');
    expect(lessonBonusHintsKey('2026-05-20', 'en')).toBe('bonus_hints_2026-05-20');
    expect(lessonBonusHintsKey('2026-05-20', 'fr')).toBe('lesson_rewards_v2::fr::bonus_hints_2026-05-20');
    expect(dailyTasksProgressKey('2026-05-20', 'en')).toBe('daily_tasks_2026-05-20');
    expect(dailyTasksProgressKey('2026-05-20', 'es')).toBe('daily_tasks_2026-05-20');
    expect(dailyTasksProgressKey('2026-05-20', 'fr')).toBe('daily_tasks_v2::fr::daily_tasks_2026-05-20');
    expect(dailyTasksRerollKey('fr')).toBe('daily_tasks_v2::fr::daily_tasks_reroll_v1');
    expect(dailyTasksAchievementAllDoneStreakKey('en')).toBe('achievement_all_daily_streak_v1');
    expect(dailyTasksAchievementAllDoneStreakKey('fr')).toBe('daily_tasks_v2::fr::achievement_all_daily_streak_v1');
    expect(dailyTasksAchievementNoRerollStreakKey('fr')).toBe('daily_tasks_v2::fr::achievement_daily_no_reroll_streak_v1');
    expect(shareAchievementCounterKey('en')).toBe('achievement_share_count');
    expect(shareAchievementCounterKey('fr')).toBe('achievements_v2::fr::achievement_share_count');
    expect(dailyTaskLessonVisitedKey('2026-05-20', 'en')).toBe('lesson_visited_2026-05-20');
    expect(dailyTaskLessonVisitedKey('2026-05-20', 'fr')).toBe('daily_tasks_v2::fr::lesson_visited_2026-05-20');
    expect(quizNavLevelKey('en')).toBe('quiz_nav_level');
    expect(quizNavLevelKey('fr')).toBe('quiz_session_v2::fr::quiz_nav_level');
    expect(quizLifetimeCounterKey('lifetime_quiz_easy_v1', 'en')).toBe('lifetime_quiz_easy_v1');
    expect(quizLifetimeCounterKey('lifetime_quiz_easy_v1', 'fr')).toBe('quiz_session_v2::fr::lifetime_quiz_easy_v1');
    expect(quizLifetimeCounterKey('lifetime_quiz_medium_v1', 'fr')).toBe('quiz_session_v2::fr::lifetime_quiz_medium_v1');
    expect(quizLifetimeCounterKey('lifetime_quiz_hard_v1', 'fr')).toBe('quiz_session_v2::fr::lifetime_quiz_hard_v1');
    expect(quizAchievementCounterKey('achievement_quiz_total_count', 'en')).toBe('achievement_quiz_total_count');
    expect(quizAchievementCounterKey('achievement_quiz_total_count', 'fr')).toBe('quiz_achievements_v2::fr::achievement_quiz_total_count');
    expect(quizAchievementCounterKey('quiz_hard_count', 'fr')).toBe('quiz_achievements_v2::fr::quiz_hard_count');
    expect(quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'fr')).toBe('quiz_achievements_v2::fr::achievement_quiz_hard_perfect_count');
    expect(quizPerfectLevelsTodayKey('en')).toBe('achievement_quiz_perfect_levels_today_v1');
    expect(quizPerfectLevelsTodayKey('fr')).toBe('quiz_achievements_v2::fr::achievement_quiz_perfect_levels_today_v1');
    expect(quizPerfectStreakKey('en')).toBe('achievement_quiz_perfect_streak_v1');
    expect(quizPerfectStreakKey('fr')).toBe('quiz_achievements_v2::fr::achievement_quiz_perfect_streak_v1');
    expect(comboAchievementCounterKey('en')).toBe('achievement_combo_best_count');
    expect(comboAchievementCounterKey('fr')).toBe('achievements_v2::fr::achievement_combo_best_count');
    expect(userStatsKey('en')).toBe('user_stats_v1');
    expect(userStatsKey('fr')).toBe('target_stats_v2::fr::user_stats_v1');
    expect(statsDailyBreakdownKey('en')).toBe('stats_daily_breakdown_v1');
    expect(statsDailyBreakdownKey('fr')).toBe('target_stats_v2::fr::stats_daily_breakdown_v1');
    expect(diagnosticLastKey('en')).toBe('diagnostic_last');
    expect(diagnosticLastKey('fr')).toBe('level_exams_v2::fr::diagnostic_last');
    expect(diagnosticOpenFlagKey('en')).toBe('open_diagnostic');
    expect(diagnosticOpenFlagKey('fr')).toBe('level_exams_v2::fr::open_diagnostic');
    expect(lessonTheoryXpClaimedKey(1, 'fr')).toBe('lesson_rewards_v2::fr::theory_xp_claimed_1');
    expect(lessonBonusGrantedKey(1, 'fr')).toBe('lesson_rewards_v2::fr::lesson1_bonus_granted');
    expect(lessonPerfectMilestoneKey(5, 'fr')).toBe('lesson_rewards_v2::fr::shards_5perfect_milestone_5');
    expect(lessonTopicShardGrantedKey('A1', 'fr')).toBe('lesson_rewards_v2::fr::shards_topic_A1_granted');
    expect(masteryFinishedOnceKey(1, 'fr')).toBe('lesson_rewards_v2::fr::lesson_finished_once_v1_1');
    expect(masteryReplayCountKey(1, 'fr')).toBe('lesson_rewards_v2::fr::lesson_replay_count_v1_1');
    expect(achievementLessonPerfectPassesKey(1, 'en')).toBe('achievement_lesson_1_perfect_passes_v1');
    expect(achievementLessonPerfectPassesKey(1, 'fr')).toBe('lesson_rewards_v2::fr::achievement_lesson_1_perfect_passes_v1');
    expect(achievementLessonMarathonDayKey('2026-05-22', 'en')).toBe('achievement_lesson_marathon_day_2026-05-22');
    expect(achievementLessonMarathonDayKey('2026-05-22', 'fr')).toBe('lesson_rewards_v2::fr::achievement_lesson_marathon_day_2026-05-22');
    expect(grammarHintSeenKey('grammar_hint_articles', 'en')).toBe('grammar_hint_articles');
    expect(grammarHintSeenKey('grammar_hint_articles', 'fr')).toBe('lesson_session_local_v2::fr::grammar_hint_articles');
    expect(prepositionDrillPerfectKey(8, 'fr')).toBe('lesson_rewards_v2::fr::prep_drill_perfect_8');
    expect(trainerStoreKey('fr')).toBe('trainer_practice_v2::fr::trainer_store_v1');
    expect(mistakeLogKey('fr')).toBe('trainer_practice_v2::fr::mistake_log_v1');
    expect(activeRecallItemsKey('fr')).toBe('trainer_practice_v2::fr::active_recall_items');
    expect(trainerAchievementCorrectCountKey('en')).toBe('achievement_trainer_correct_count');
    expect(trainerAchievementCorrectCountKey('fr')).toBe('trainer_practice_v2::fr::achievement_trainer_correct_count');
    expect(activeRecallAchievementCorrectCountKey('fr')).toBe('trainer_practice_v2::fr::achievement_active_recall_correct_count');
    expect(trainerAchievementCorrectStreakKey('fr')).toBe('trainer_practice_v2::fr::achievement_trainer_correct_streak_v1');
    expect(trainerAchievementPerfectSessionCountKey('fr')).toBe('trainer_practice_v2::fr::achievement_trainer_perfect_session_count');
    expect(dailyPhraseAchievementReadCountKey('en')).toBe('achievement_daily_phrase_read_count');
    expect(dailyPhraseAchievementReadCountKey('fr')).toBe('daily_phrase_v2::fr::achievement_daily_phrase_read_count');
    expect(dailyPhraseAchievementSaveCountKey('fr')).toBe('daily_phrase_v2::fr::achievement_daily_phrase_save_count');
    expect(posMasteryKey('en')).toBe('pos_mastery_v1');
    expect(posMasteryKey('fr')).toBe('trainer_practice_v2::fr::pos_mastery_v1');
    expect(personalPracticeTrainingProgressKey('article_a_an', 'en', 'uk')).toBe('diagnosis_training_progress_v1:article_a_an');
    expect(personalPracticeTrainingProgressKey('article_a_an', 'fr', 'ru')).toBe('personal_practice_v2::fr::ru::diagnosis_training_progress_v1%3Aarticle_a_an');
    expect(personalPracticeTrainingProgressKey('article_a_an', 'fr', 'uk')).toBe('personal_practice_v2::fr::uk::diagnosis_training_progress_v1%3Aarticle_a_an');
    expect(personalPracticeFreeAccessKey('fr', 'uk')).toBe('personal_practice_v2::fr::uk::diagnosis_training_free_access_v1');
    expect(resolvedPersonalTrainingsKey('fr', 'uk')).toBe('personal_practice_v2::fr::uk::resolved_personal_trainings_v1');
    expect(flashcardsSavedKey('en')).toBe('flashcards_v1');
    expect(flashcardsSavedKey('fr')).toBe('flashcards_v2::fr::flashcards_v1');
    expect(customFlashcardsKey('fr')).toBe('flashcards_v2::fr::custom_flashcards_v2');
    expect(flashcardsDeleteHintSeenKey('en')).toBe('flashcard_delete_hint_seen');
    expect(flashcardsDeleteHintSeenKey('fr')).toBe('flashcards_v2::fr::flashcard_delete_hint_seen');
    expect(flashcardsPackTrialGiftKey('en')).toBe('flashcard_pack_trial_gift_v1');
    expect(flashcardsPackTrialGiftKey('fr')).toBe('flashcards_v2::fr::flashcard_pack_trial_gift_v1');
    expect(flashcardsAchievementSavedCountKey('en')).toBe('achievement_flashcards_saved_count');
    expect(flashcardsAchievementSavedCountKey('fr')).toBe('flashcards_v2::fr::achievement_flashcards_saved_count');
    expect(flashcardsAchievementFlipCountKey('fr')).toBe('flashcards_v2::fr::achievement_flashcards_flip_count');
    expect(flashcardsAchievementViewStreakKey('fr')).toBe('flashcards_v2::fr::achievement_flashcards_view_streak_v1');
    expect(flashcardsAchievementSourceSetKey('fr')).toBe('flashcards_v2::fr::achievement_flashcards_source_set_v1');
    expect(flashcardsCommunityOwnedPacksKey('en')).toBe('community_owned_pack_ids_v1');
    expect(flashcardsCommunityOwnedPacksKey('fr')).toBe('flashcards_v2::fr::community_owned_pack_ids_v1');
    expect(flashcardsHiddenCommunityPacksKey('en')).toBe('hidden_community_pack_ids_v1');
    expect(flashcardsHiddenCommunityPacksKey('fr')).toBe('flashcards_v2::fr::hidden_community_pack_ids_v1');
    expect(communityPackCreateDraftKey('en', 'uk')).toBe('flashcards_v2::en::community_pack_create_draft_v1%3Auk');
    expect(communityPackCreateDraftKey('en', 'ru')).not.toBe(communityPackCreateDraftKey('en', 'uk'));
    expect(communityPackCreateDraftKey('fr', 'ru')).toBe('flashcards_v2::fr::community_pack_create_draft_v1%3Aru');
    expect(communityPackCreateDraftKey('fr', 'uk')).toBe('flashcards_v2::fr::community_pack_create_draft_v1%3Auk');
    expect(communityPackCreateDraftKey('fr', 'ru')).not.toBe(communityPackCreateDraftKey('fr', 'uk'));
    expect(flashcardsMarketDevOwnedPacksKey('en')).toBe('flashcards_market_dev_owned_v1');
    expect(flashcardsMarketDevOwnedPacksKey('fr')).toBe('flashcards_v2::fr::flashcards_market_dev_owned_v1');
    expect(flashcardsOwnedPacksKey('en')).toBe('flashcards_owned_packs_v1');
    expect(flashcardsOwnedPacksKey('fr')).toBe('flashcards_v2::fr::flashcards_owned_packs_v1');
    expect(flashcardsProgressKey('fr')).toBe('flashcards_v2::fr::flashcards_progress_v1');
    expect(flashcardsSwipeSessionDraftKey('fr')).toBe('flashcards_v2::fr::flashcards_swipe_session_draft_v1');
    expect(flashcardsSwipeMemoryKey('fr')).toBe('flashcards_v2::fr::flashcards_swipe_memory_v1');
    expect(flashcardsMarketplaceBuiltCardsCacheKey('en')).toBe('flashcards_market_built_cards_v1');
    expect(flashcardsMarketplaceBuiltCardsCacheKey('fr')).toBe('flashcards_v2::fr::flashcards_market_built_cards_v1');
    expect(flashcardsMarketDevActivePackKey('en')).toBe('flashcards_market_dev_active_pack_v1');
    expect(flashcardsMarketDevActivePackKey('fr')).toBe('flashcards_v2::fr::flashcards_market_dev_active_pack_v1');
    expect(flashcardsOpenedPacksKey('en')).toBe('flashcards_opened_packs_v1');
    expect(flashcardsOpenedPacksKey('fr')).toBe('flashcards_v2::fr::flashcards_opened_packs_v1');
    expect(unlockedLessonsKey('fr')).toBe('lesson_progress_v2::fr::unlocked_lessons');
    expect(premiumCourseLevelKey('fr')).toBe('lesson_progress_v2::fr::premium_course_level');
    expect(lessonUnlockRepairKey('fr')).toBe('lesson_progress_v2::fr::lesson_unlock_repair_v3');
    expect(levelExamKey('A1', 'passed', 'fr')).toBe('level_exams_v2::fr::level_exam_A1_passed');
    expect(levelExamKey('A1', 'medal_tier', 'fr')).toBe('level_exams_v2::fr::level_exam_A1_medal_tier');
    expect(lingmanExamAvailableKey('fr')).toBe('level_exams_v2::fr::lingman_exam_available');
    expect(lingmanCertificateKey('en')).toBe('lingman_certificate_v1');
    expect(lingmanCertificateKey('fr')).toBe('level_exams_v2::fr::lingman_certificate_v1');
  });
});
