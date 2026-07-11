import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __cloudSyncTestHooks,
  accountLocalDataKeysForToday,
  deriveLastActiveDateForRestore,
  FRENCH_TARGET_SYNC_KEYS,
  mergeDailyTasksProgressForRestore,
  shouldSyncPremiumProgressField,
  SYNC_KEYS,
  wipeLocalAccountData,
} from '../app/cloud_sync';
import * as DailyTasks from '../app/daily_tasks';
import { normalizeDevSeededStreakValue } from '../app/streak_safety';
import { DIAGNOSIS_TRAINING_IDS } from '../app/personal_practice_training_ids';
import {
  activeRecallItemsKey,
  activeRecallAchievementCorrectCountKey,
  achievementLessonPerfectPassesKey,
  communityPackCreateDraftKey,
  customFlashcardsKey,
  dailyPhraseAchievementReadCountKey,
  dailyPhraseAchievementSaveCountKey,
  dailyTasksAchievementAllDoneStreakKey,
  dailyTasksAchievementNoRerollStreakKey,
  dailyTasksAdminOverrideKey,
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
  flashcardsMarketDevActivePackKey,
  flashcardsMarketDevOwnedPacksKey,
  flashcardsMarketplaceBuiltCardsCacheKey,
  flashcardsOpenedPacksKey,
  flashcardsOwnedPacksKey,
  flashcardsProgressKey,
  flashcardsSavedKey,
  flashcardsSwipeMemoryKey,
  flashcardsSwipeSessionDraftKey,
  grammarHintSeenKey,
  irregularVerbsGlobalKey,
  lastOpenedLessonKey,
  lessonBonusHintsKey,
  lessonBestScoreKey,
  lessonIrregularShardsGrantedKey,
  lessonSessionKey,
  lessonPassCountKey,
  lessonProgressKey,
  lessonTheorySectionsSeenKey,
  lessonTheoryXpClaimedKey,
  lingmanCertificateKey,
  levelExamKey,
  mistakeLogKey,
  personalPracticeFreeAccessKey,
  personalPracticeTrainingProgressKey,
  posMasteryKey,
  quizAchievementCounterKey,
  quizLifetimeCounterKey,
  quizNavLevelKey,
  quizPerfectLevelsTodayKey,
  quizPerfectStreakKey,
  shareAchievementCounterKey,
  targetKey,
  resolvedPersonalTrainingsKey,
  trainerAchievementCorrectCountKey,
  trainerAchievementCorrectStreakKey,
  trainerAchievementPerfectSessionCountKey,
  trainerStoreKey,
} from '../app/target_storage_keys';

const makeCloudUserDoc = (progress: Record<string, unknown>) => ({
  exists: true,
  data: () => ({ progress }),
});

describe('mergeDailyTasksProgressForRestore', () => {
  it('returns cloud when local empty', () => {
    const cloud = JSON.stringify([{ taskId: 'a', current: 2, completed: false, claimed: false }]);
    expect(mergeDailyTasksProgressForRestore(null, cloud)).toBe(cloud);
  });

  it('merges counters and flags per taskId', () => {
    const local = JSON.stringify([
      { taskId: 'x', current: 5, completed: true, claimed: false },
    ]);
    const cloud = JSON.stringify([
      { taskId: 'x', current: 2, completed: false, claimed: false },
    ]);
    const out = JSON.parse(mergeDailyTasksProgressForRestore(local, cloud)) as unknown[];
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      taskId: 'x',
      current: 5,
      completed: true,
      claimed: false,
    });
  });

  it('keeps local-only task rows and merges arena combo fields', () => {
    const local = JSON.stringify([
      {
        taskId: 'arena1',
        current: 1,
        completed: false,
        claimed: false,
        comboPlays: 2,
        comboWins: 1,
      },
    ]);
    const cloud = JSON.stringify([]);
    const merged = mergeDailyTasksProgressForRestore(local, cloud);
    expect(JSON.parse(merged)).toEqual(JSON.parse(local));
  });

  it('ORs claimed from either side', () => {
    const local = JSON.stringify([{ taskId: 'y', current: 1, completed: true, claimed: true }]);
    const cloud = JSON.stringify([{ taskId: 'y', current: 0, completed: false, claimed: false }]);
    const out = JSON.parse(mergeDailyTasksProgressForRestore(local, cloud))[0] as { claimed: boolean };
    expect(out.claimed).toBe(true);
  });
});

describe('streak cloud restore safety', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('syncs the activity date used by updateStreakOnActivity', () => {
    expect(SYNC_KEYS).toContain('streak_count');
    expect(SYNC_KEYS).toContain('last_active_date');
  });

  it('syncs daily login bonus state so another device cannot claim the same day again', () => {
    expect(SYNC_KEYS).toContain('login_bonus_v1');
  });

  it('syncs daily task progress with an explicit calendar day marker', () => {
    expect(SYNC_KEYS).toContain('daily_tasks_progress');
    expect(SYNC_KEYS).toContain('daily_tasks_progress_day');
  });

  it('does not restore untagged cloud daily tasks as today progress', async () => {
    const todaySpy = jest.spyOn(DailyTasks, 'getTodayKey').mockReturnValue('2026-05-20');
    try {
      const staleDaily = JSON.stringify([
        { taskId: 'da4', current: 1, completed: true, claimed: false },
      ]);

      await AsyncStorage.multiSet([
        ['user_total_xp', '10'],
        ['streak_count', '0'],
      ]);

      await expect(__cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
        user_total_xp: '12000',
        streak_count: '14',
        daily_tasks_progress: staleDaily,
      }))).resolves.toBe(true);

      await expect(AsyncStorage.getItem('daily_tasks_2026-05-20')).resolves.toBeNull();
      await expect(AsyncStorage.getItem('daily_tasks_progress')).resolves.toBeNull();
    } finally {
      todaySpy.mockRestore();
    }
  });

  it('restores cloud daily tasks only when the day marker is current', async () => {
    const todaySpy = jest.spyOn(DailyTasks, 'getTodayKey').mockReturnValue('2026-05-20');
    try {
      const currentDaily = JSON.stringify([
        { taskId: 'da4', current: 1, completed: true, claimed: false },
      ]);

      await AsyncStorage.multiSet([
        ['user_total_xp', '10'],
        ['streak_count', '0'],
      ]);

      await expect(__cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
        user_total_xp: '12000',
        streak_count: '14',
        daily_tasks_progress: currentDaily,
        daily_tasks_progress_day: '2026-05-20',
      }))).resolves.toBe(true);

      const saved = JSON.parse(
        await AsyncStorage.getItem('daily_tasks_2026-05-20') ?? '[]',
      ) as Array<{ taskId: string; completed?: boolean }>;
      expect(saved.find((row) => row.taskId === 'da4')?.completed).toBe(true);
    } finally {
      todaySpy.mockRestore();
    }
  });

  it('restores French cloud daily tasks only into the scoped French day row', async () => {
    const todaySpy = jest.spyOn(DailyTasks, 'getTodayKey').mockReturnValue('2026-05-20');
    const frenchCloudProgressKey = targetKey('cloud_sync', 'fr', 'daily_tasks_progress');
    const frenchCloudDayKey = targetKey('cloud_sync', 'fr', 'daily_tasks_progress_day');
    try {
      const currentDaily = JSON.stringify([
        { taskId: 'da4', current: 1, completed: true, claimed: false },
      ]);

      await AsyncStorage.multiSet([
        ['user_total_xp', '10'],
        ['streak_count', '0'],
      ]);

      await expect(__cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
        user_total_xp: '12000',
        streak_count: '14',
        [frenchCloudProgressKey]: currentDaily,
        [frenchCloudDayKey]: '2026-05-20',
      }))).resolves.toBe(true);

      const saved = JSON.parse(
        await AsyncStorage.getItem(dailyTasksProgressKey('2026-05-20', 'fr')) ?? '[]',
      ) as Array<{ taskId: string; completed?: boolean }>;
      expect(saved.find((row) => row.taskId === 'da4')?.completed).toBe(true);
      await expect(AsyncStorage.getItem('daily_tasks_2026-05-20')).resolves.toBeNull();
    } finally {
      todaySpy.mockRestore();
    }
  });

  it('syncs achievement progress counters before they unlock', () => {
    expect(SYNC_KEYS).toEqual(expect.arrayContaining([
      'achievement_trainer_correct_count',
      'achievement_active_recall_correct_count',
      'achievement_trainer_perfect_session_count',
      'achievement_quiz_total_count',
      'quiz_hard_count',
      'achievement_quiz_hard_perfect_count',
      'achievement_quiz_perfect_levels_today_v1',
      'achievement_quiz_perfect_streak_v1',
      'achievement_daily_phrase_read_count',
      'achievement_daily_phrase_save_count',
      'achievement_flashcards_saved_count',
      'achievement_flashcards_flip_count',
      'achievement_shards_spent_total',
      'achievement_league_boost_count',
      'achievement_league_chat_message_count',
      'achievement_all_daily_streak_v1',
      'flashcards_v1',
    ]));
  });

  it('syncs French learning state under scoped target keys without changing shared XP keys', () => {
    expect(SYNC_KEYS).toContain('user_total_xp');
    expect(SYNC_KEYS).toContain('daily_stats');
    expect(SYNC_KEYS).toEqual(expect.arrayContaining([
      lessonProgressKey(1, 'fr'),
      lessonBestScoreKey(1, 'fr'),
      lessonPassCountKey(1, 'fr'),
      levelExamKey('A1', 'passed', 'fr'),
      levelExamKey('A1', 'medal_tier', 'fr'),
      lingmanCertificateKey('fr'),
      diagnosticLastKey('fr'),
      quizAchievementCounterKey('achievement_quiz_total_count', 'fr'),
      quizAchievementCounterKey('quiz_hard_count', 'fr'),
      quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'fr'),
      quizPerfectLevelsTodayKey('fr'),
      quizPerfectStreakKey('fr'),
      dailyPhraseAchievementReadCountKey('fr'),
      dailyPhraseAchievementSaveCountKey('fr'),
      dailyTasksAchievementAllDoneStreakKey('fr'),
      dailyTasksAchievementNoRerollStreakKey('fr'),
      shareAchievementCounterKey('fr'),
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
      flashcardsAchievementSavedCountKey('fr'),
      flashcardsAchievementFlipCountKey('fr'),
      flashcardsAchievementViewStreakKey('fr'),
      flashcardsAchievementSourceSetKey('fr'),
      flashcardsCommunityOwnedPacksKey('fr'),
      flashcardsOwnedPacksKey('fr'),
      flashcardsMarketDevOwnedPacksKey('fr'),
      flashcardsProgressKey('fr'),
      flashcardsSwipeSessionDraftKey('fr'),
      flashcardsSwipeMemoryKey('fr'),
      achievementLessonPerfectPassesKey(1, 'fr'),
      personalPracticeFreeAccessKey('fr', 'ru'),
      personalPracticeFreeAccessKey('fr', 'uk'),
      resolvedPersonalTrainingsKey('fr', 'ru'),
      resolvedPersonalTrainingsKey('fr', 'uk'),
      personalPracticeTrainingProgressKey('article_a_an', 'fr', 'ru'),
      personalPracticeTrainingProgressKey('article_a_an', 'fr', 'uk'),
      quizLifetimeCounterKey('lifetime_quiz_easy_v1', 'fr'),
      quizLifetimeCounterKey('lifetime_quiz_medium_v1', 'fr'),
      quizLifetimeCounterKey('lifetime_quiz_hard_v1', 'fr'),
      lastOpenedLessonKey('fr'),
      irregularVerbsGlobalKey('fr'),
      lessonIrregularShardsGrantedKey(1, 'fr'),
      targetKey('cloud_sync', 'fr', 'daily_tasks_progress'),
      targetKey('cloud_sync', 'fr', 'daily_tasks_progress_day'),
      dailyTasksRerollKey('fr'),
    ]));
    expect(FRENCH_TARGET_SYNC_KEYS.every((key) => key.includes('_v2::fr::') || key.endsWith('_v2::fr'))).toBe(true);
    expect(FRENCH_TARGET_SYNC_KEYS.some((key) => key.includes('::es'))).toBe(false);
    expect(FRENCH_TARGET_SYNC_KEYS).not.toContain(quizAchievementCounterKey('achievement_quiz_total_count', 'en'));
  });

  it('wipes today lesson-visited daily task state per study target on account switch', async () => {
    const todaySpy = jest.spyOn(DailyTasks, 'getTodayKey').mockReturnValue('2026-05-20');
    try {
      const englishVisitedKey = dailyTaskLessonVisitedKey('2026-05-20', 'en');
      const frenchVisitedKey = dailyTaskLessonVisitedKey('2026-05-20', 'fr');
      const englishAdminOverrideKey = dailyTasksAdminOverrideKey('en');
      const frenchAdminOverrideKey = dailyTasksAdminOverrideKey('fr');
      const englishGrammarHintKey = grammarHintSeenKey('grammar_hint_articles', 'en');
      const frenchGrammarHintKey = grammarHintSeenKey('grammar_hint_articles', 'fr');
      const englishLessonCellKey = lessonSessionKey(7, 'cellIndex', 'en');
      const frenchLessonCellKey = lessonSessionKey(7, 'cellIndex', 'fr');
      const englishReplayQueueKey = lessonSessionKey(7, 'errorReplayQueue', 'en');
      const frenchReplayQueueKey = lessonSessionKey(7, 'errorReplayQueue', 'fr');
      const englishFiftyFiftyKey = fiftyFiftyUsageKey('2026-05-20', 'en');
      const frenchFiftyFiftyKey = fiftyFiftyUsageKey('2026-05-20', 'fr');
      const englishBonusHintsKey = lessonBonusHintsKey('2026-05-20', 'en');
      const frenchBonusHintsKey = lessonBonusHintsKey('2026-05-20', 'fr');
      const englishMarketplaceCacheKey = flashcardsMarketplaceBuiltCardsCacheKey('en');
      const frenchMarketplaceCacheKey = flashcardsMarketplaceBuiltCardsCacheKey('fr');
      const englishMarketDevActivePackKey = flashcardsMarketDevActivePackKey('en');
      const frenchMarketDevActivePackKey = flashcardsMarketDevActivePackKey('fr');
      const englishOwnedPacksKey = flashcardsOwnedPacksKey('en');
      const frenchOwnedPacksKey = flashcardsOwnedPacksKey('fr');
      const englishMarketDevOwnedPacksKey = flashcardsMarketDevOwnedPacksKey('en');
      const frenchMarketDevOwnedPacksKey = flashcardsMarketDevOwnedPacksKey('fr');
      const englishOpenedPacksKey = flashcardsOpenedPacksKey('en');
      const frenchOpenedPacksKey = flashcardsOpenedPacksKey('fr');
      const englishCommunityOwnedPacksKey = flashcardsCommunityOwnedPacksKey('en');
      const frenchCommunityOwnedPacksKey = flashcardsCommunityOwnedPacksKey('fr');
      const englishHiddenCommunityPacksKey = flashcardsHiddenCommunityPacksKey('en');
      const frenchHiddenCommunityPacksKey = flashcardsHiddenCommunityPacksKey('fr');
      const englishCommunityDraftKey = communityPackCreateDraftKey('en', 'ru');
      const frenchRuCommunityDraftKey = communityPackCreateDraftKey('fr', 'ru');
      const frenchUkCommunityDraftKey = communityPackCreateDraftKey('fr', 'uk');
      const englishDeleteHintKey = flashcardsDeleteHintSeenKey('en');
      const frenchDeleteHintKey = flashcardsDeleteHintSeenKey('fr');
      const englishPerfectPassEvidenceKey = achievementLessonPerfectPassesKey(1, 'en');
      const frenchPerfectPassEvidenceKey = achievementLessonPerfectPassesKey(1, 'fr');
      const englishQuizTotalCountKey = quizAchievementCounterKey('achievement_quiz_total_count', 'en');
      const frenchQuizTotalCountKey = quizAchievementCounterKey('achievement_quiz_total_count', 'fr');
      const englishQuizHardCountKey = quizAchievementCounterKey('quiz_hard_count', 'en');
      const frenchQuizHardCountKey = quizAchievementCounterKey('quiz_hard_count', 'fr');
      const englishQuizHardPerfectCountKey = quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'en');
      const frenchQuizHardPerfectCountKey = quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'fr');

      expect(accountLocalDataKeysForToday('2026-05-20')).toEqual(expect.arrayContaining([
        englishLessonCellKey,
        frenchLessonCellKey,
        englishReplayQueueKey,
        frenchReplayQueueKey,
        englishAdminOverrideKey,
        frenchAdminOverrideKey,
        englishDeleteHintKey,
        frenchDeleteHintKey,
      ]));

      await AsyncStorage.multiSet([
        [englishVisitedKey, '1'],
        [frenchVisitedKey, '1'],
        [englishAdminOverrideKey, '{"mode":"qa"}'],
        [frenchAdminOverrideKey, '{"mode":"qa_fr"}'],
        [englishGrammarHintKey, '1'],
        [frenchGrammarHintKey, '1'],
        [englishLessonCellKey, '8'],
        [frenchLessonCellKey, '9'],
        [englishReplayQueueKey, '["old-en"]'],
        [frenchReplayQueueKey, '["old-fr"]'],
        [englishFiftyFiftyKey, '2'],
        [frenchFiftyFiftyKey, '1'],
        [englishBonusHintsKey, '3'],
        [frenchBonusHintsKey, '4'],
        [englishMarketplaceCacheKey, '{"epoch":1,"ownedKey":"en","cards":[]}'],
        [frenchMarketplaceCacheKey, '{"epoch":1,"ownedKey":"fr","cards":[]}'],
        [englishMarketDevActivePackKey, 'en_pack'],
        [frenchMarketDevActivePackKey, 'fr_pack'],
        [englishOwnedPacksKey, '["en_owned_pack"]'],
        [frenchOwnedPacksKey, '["fr_owned_pack"]'],
        [englishMarketDevOwnedPacksKey, '["en_dev_pack"]'],
        [frenchMarketDevOwnedPacksKey, '["fr_dev_pack"]'],
        [englishOpenedPacksKey, '["en_pack"]'],
        [frenchOpenedPacksKey, '["fr_pack"]'],
        [englishCommunityOwnedPacksKey, '["en_ugc_pack"]'],
        [frenchCommunityOwnedPacksKey, '["fr_ugc_pack"]'],
        [englishHiddenCommunityPacksKey, '["en_hidden_ugc"]'],
        [frenchHiddenCommunityPacksKey, '["fr_hidden_ugc"]'],
        [englishCommunityDraftKey, '{"title":"English draft"}'],
        [frenchRuCommunityDraftKey, '{"title":"French RU draft"}'],
        [frenchUkCommunityDraftKey, '{"title":"French UK draft"}'],
        [englishDeleteHintKey, '1'],
        [frenchDeleteHintKey, '1'],
        [englishPerfectPassEvidenceKey, '[1,2]'],
        [frenchPerfectPassEvidenceKey, '[1,2]'],
        [englishQuizTotalCountKey, '2'],
        [frenchQuizTotalCountKey, '3'],
        [englishQuizHardCountKey, '4'],
        [frenchQuizHardCountKey, '5'],
        [englishQuizHardPerfectCountKey, '6'],
        [frenchQuizHardPerfectCountKey, '7'],
        [dailyTasksProgressKey('2026-05-20', 'en'), '[]'],
        [dailyTasksProgressKey('2026-05-20', 'fr'), '[]'],
        [quizNavLevelKey('en'), 'hard'],
        [quizNavLevelKey('fr'), 'medium'],
        [diagnosticOpenFlagKey('en'), '1'],
        [diagnosticOpenFlagKey('fr'), '1'],
      ]);

      await wipeLocalAccountData();

      await expect(AsyncStorage.getItem(englishVisitedKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchVisitedKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishAdminOverrideKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchAdminOverrideKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishGrammarHintKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchGrammarHintKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishLessonCellKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchLessonCellKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishReplayQueueKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchReplayQueueKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishFiftyFiftyKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchFiftyFiftyKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishBonusHintsKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchBonusHintsKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishMarketplaceCacheKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchMarketplaceCacheKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishMarketDevActivePackKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchMarketDevActivePackKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishOwnedPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchOwnedPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishMarketDevOwnedPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchMarketDevOwnedPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishOpenedPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchOpenedPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishCommunityOwnedPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchCommunityOwnedPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishHiddenCommunityPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchHiddenCommunityPacksKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishCommunityDraftKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchRuCommunityDraftKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchUkCommunityDraftKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishDeleteHintKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchDeleteHintKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishPerfectPassEvidenceKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchPerfectPassEvidenceKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishQuizTotalCountKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchQuizTotalCountKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishQuizHardCountKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchQuizHardCountKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(englishQuizHardPerfectCountKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(frenchQuizHardPerfectCountKey)).resolves.toBeNull();
      await expect(AsyncStorage.getItem(dailyTasksProgressKey('2026-05-20', 'en'))).resolves.toBeNull();
      await expect(AsyncStorage.getItem(dailyTasksProgressKey('2026-05-20', 'fr'))).resolves.toBeNull();
      await expect(AsyncStorage.getItem(quizNavLevelKey('en'))).resolves.toBeNull();
      await expect(AsyncStorage.getItem(quizNavLevelKey('fr'))).resolves.toBeNull();
      await expect(AsyncStorage.getItem(diagnosticOpenFlagKey('en'))).resolves.toBeNull();
      await expect(AsyncStorage.getItem(diagnosticOpenFlagKey('fr'))).resolves.toBeNull();
    } finally {
      todaySpy.mockRestore();
    }
  });

  it('syncs every French personal-practice training progress row per source locale', () => {
    for (const id of DIAGNOSIS_TRAINING_IDS) {
      expect(FRENCH_TARGET_SYNC_KEYS).toContain(personalPracticeTrainingProgressKey(id, 'fr', 'ru'));
      expect(FRENCH_TARGET_SYNC_KEYS).toContain(personalPracticeTrainingProgressKey(id, 'fr', 'uk'));
    }

    expect(FRENCH_TARGET_SYNC_KEYS).not.toContain('diagnosis_training_progress_v1:article_a_an');
  });

  it('syncs English legacy and French scoped perfect-pass evidence for shared achievements', () => {
    expect(SYNC_KEYS).toContain(achievementLessonPerfectPassesKey(1, 'en'));
    expect(SYNC_KEYS).toContain(achievementLessonPerfectPassesKey(32, 'en'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(achievementLessonPerfectPassesKey(1, 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(achievementLessonPerfectPassesKey(32, 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).not.toContain(achievementLessonPerfectPassesKey(1, 'en'));
  });

  it('syncs theory section progress and XP claim guards per target', () => {
    expect(SYNC_KEYS).toContain(lessonTheorySectionsSeenKey(1, 'en'));
    expect(SYNC_KEYS).toContain(lessonTheorySectionsSeenKey(32, 'en'));
    expect(SYNC_KEYS).toContain(lessonTheoryXpClaimedKey(1, 'en'));
    expect(SYNC_KEYS).toContain(lessonTheoryXpClaimedKey(32, 'en'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(lessonTheorySectionsSeenKey(1, 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(lessonTheorySectionsSeenKey(32, 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(lessonTheoryXpClaimedKey(1, 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(lessonTheoryXpClaimedKey(32, 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).not.toContain(lessonTheorySectionsSeenKey(1, 'en'));
    expect(FRENCH_TARGET_SYNC_KEYS).not.toContain(lessonTheoryXpClaimedKey(1, 'en'));
  });

  it('syncs English legacy and French scoped quiz achievement counters', () => {
    expect(SYNC_KEYS).toContain(quizLifetimeCounterKey('lifetime_quiz_easy_v1', 'en'));
    expect(SYNC_KEYS).toContain(quizLifetimeCounterKey('lifetime_quiz_medium_v1', 'en'));
    expect(SYNC_KEYS).toContain(quizLifetimeCounterKey('lifetime_quiz_hard_v1', 'en'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(quizLifetimeCounterKey('lifetime_quiz_easy_v1', 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(quizLifetimeCounterKey('lifetime_quiz_medium_v1', 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(quizLifetimeCounterKey('lifetime_quiz_hard_v1', 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).not.toContain(quizLifetimeCounterKey('lifetime_quiz_easy_v1', 'en'));
    expect(SYNC_KEYS).toContain(quizAchievementCounterKey('achievement_quiz_total_count', 'en'));
    expect(SYNC_KEYS).toContain(quizAchievementCounterKey('quiz_hard_count', 'en'));
    expect(SYNC_KEYS).toContain(quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'en'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(quizAchievementCounterKey('achievement_quiz_total_count', 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(quizAchievementCounterKey('quiz_hard_count', 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(quizPerfectLevelsTodayKey('fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).toContain(quizPerfectStreakKey('fr'));
    expect(FRENCH_TARGET_SYNC_KEYS).not.toContain(quizAchievementCounterKey('achievement_quiz_total_count', 'en'));
    expect(FRENCH_TARGET_SYNC_KEYS).not.toContain(quizPerfectStreakKey('en'));
  });

  it('restores daily login bonus state with cloud progress', async () => {
    const loginBonus = JSON.stringify({ lastDate: '2026-05-13', consecutiveDays: 12 });

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      login_bonus_v1: loginBonus,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('login_bonus_v1')).resolves.toBe(loginBonus);
  });

  it('keeps cloud daily login sticky when local XP is higher than cloud', async () => {
    const cloudLoginBonus = JSON.stringify({ lastDate: '2026-05-13', consecutiveDays: 2 });
    const staleLocalLoginBonus = JSON.stringify({ lastDate: '2026-05-12', consecutiveDays: 1 });

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['last_active_date', '2026-05-12'],
      ['login_bonus_v1', staleLocalLoginBonus],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      last_active_date: '2026-05-13',
      login_bonus_v1: cloudLoginBonus,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('user_total_xp')).resolves.toBe('13000');
    await expect(AsyncStorage.getItem('last_active_date')).resolves.toBe('2026-05-13');
    await expect(AsyncStorage.getItem('login_bonus_v1')).resolves.toBe(cloudLoginBonus);
  });

  it('does not lower a fresher local streak when cloud XP is higher', async () => {
    await AsyncStorage.multiSet([
      ['user_total_xp', '90000'],
      ['streak_count', '60'],
      ['last_active_date', '2026-06-24'],
      ['streak_last_date', '2026-06-24'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '90762',
      streak_count: '3',
      last_active_date: '2026-06-24',
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('user_total_xp')).resolves.toBe('90762');
    await expect(AsyncStorage.getItem('streak_count')).resolves.toBe('60');
    await expect(AsyncStorage.getItem('last_active_date')).resolves.toBe('2026-06-24');
  });

  it('keeps newer local lesson replay rewards when cloud restore has stale pass counts', async () => {
    const localPerfect = JSON.stringify(new Array(50).fill('correct'));
    const staleCloudProgress = JSON.stringify([
      ...new Array(45).fill('correct'),
      ...new Array(5).fill('wrong'),
    ]);

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
      ['lesson11_best_score', '5'],
      ['lesson11_pass_count', '5'],
      ['lesson11_progress', localPerfect],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      lesson11_best_score: '4.5',
      lesson11_pass_count: '1',
      lesson11_progress: staleCloudProgress,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('lesson11_best_score')).resolves.toBe('5');
    await expect(AsyncStorage.getItem('lesson11_pass_count')).resolves.toBe('5');
    await expect(AsyncStorage.getItem('lesson11_progress')).resolves.toBe(localPerfect);
  });

  it('unions unlocked lessons during full cloud restore instead of relocking local progress', async () => {
    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
      ['unlocked_lessons', JSON.stringify([1, 2, 3, 4])],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      unlocked_lessons: JSON.stringify([1, 2]),
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('unlocked_lessons')).resolves.toBe(JSON.stringify([1, 2, 3, 4]));
  });

  it('keeps stronger local level exam progress during full cloud restore', async () => {
    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
      ['level_exam_A1_pct', '92'],
      ['level_exam_A1_best_pct', '95'],
      ['level_exam_A1_passed', 'true'],
      ['level_exam_A1_pass_count', '2'],
      ['level_exam_A1_completed_at', '2026-06-20'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      level_exam_A1_pct: '70',
      level_exam_A1_best_pct: '80',
      level_exam_A1_passed: 'false',
      level_exam_A1_pass_count: '1',
      level_exam_A1_completed_at: '2026-06-10',
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('level_exam_A1_pct')).resolves.toBe('92');
    await expect(AsyncStorage.getItem('level_exam_A1_best_pct')).resolves.toBe('95');
    await expect(AsyncStorage.getItem('level_exam_A1_passed')).resolves.toBe('true');
    await expect(AsyncStorage.getItem('level_exam_A1_pass_count')).resolves.toBe('2');
    await expect(AsyncStorage.getItem('level_exam_A1_completed_at')).resolves.toBe('2026-06-20');
  });

  it('keeps newer local French lesson state when cloud restore has stale scoped target values', async () => {
    const localPerfect = JSON.stringify(new Array(50).fill('correct'));
    const staleCloudProgress = JSON.stringify([
      ...new Array(45).fill('correct'),
      ...new Array(5).fill('wrong'),
    ]);
    const scoreKey = lessonBestScoreKey(11, 'fr');
    const passKey = lessonPassCountKey(11, 'fr');
    const progressKey = lessonProgressKey(11, 'fr');
    const perfectPassEvidenceKey = achievementLessonPerfectPassesKey(11, 'fr');

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
      [scoreKey, '5'],
      [passKey, '5'],
      [progressKey, localPerfect],
      [perfectPassEvidenceKey, JSON.stringify([1, 2, 3])],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      [scoreKey]: '4.5',
      [passKey]: '1',
      [progressKey]: staleCloudProgress,
      [perfectPassEvidenceKey]: JSON.stringify([1]),
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem(scoreKey)).resolves.toBe('5');
    await expect(AsyncStorage.getItem(passKey)).resolves.toBe('5');
    await expect(AsyncStorage.getItem(progressKey)).resolves.toBe(localPerfect);
    await expect(AsyncStorage.getItem(perfectPassEvidenceKey)).resolves.toBe(JSON.stringify([1, 2, 3]));
    await expect(AsyncStorage.getItem('lesson11_progress')).resolves.toBeNull();
  });

  it('unions French unlocked lessons during restore instead of relocking scoped target progress', async () => {
    const unlockedKey = targetKey('lesson_progress', 'fr', 'unlocked_lessons');

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
      [unlockedKey, JSON.stringify([1, 2, 3, 4])],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      [unlockedKey]: JSON.stringify([1, 2]),
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem(unlockedKey)).resolves.toBe(JSON.stringify([1, 2, 3, 4]));
  });

  it('keeps stronger French level exam progress during scoped restore', async () => {
    const pctKey = targetKey('level_exams', 'fr', 'level_exam_A1_pct');
    const bestKey = targetKey('level_exams', 'fr', 'level_exam_A1_best_pct');
    const passedKey = targetKey('level_exams', 'fr', 'level_exam_A1_passed');
    const passCountKey = targetKey('level_exams', 'fr', 'level_exam_A1_pass_count');

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
      [pctKey, '92'],
      [bestKey, '95'],
      [passedKey, 'true'],
      [passCountKey, '2'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      [pctKey]: '70',
      [bestKey]: '80',
      [passedKey]: 'false',
      [passCountKey]: '1',
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem(pctKey)).resolves.toBe('92');
    await expect(AsyncStorage.getItem(bestKey)).resolves.toBe('95');
    await expect(AsyncStorage.getItem(passedKey)).resolves.toBe('true');
    await expect(AsyncStorage.getItem(passCountKey)).resolves.toBe('2');
  });

  it('restores missing French target rows even when local shared XP wins restore', async () => {
    const cloudTrainer = JSON.stringify([{ key: 'je suis pret', queue: 'phrases', dueAt: 123 }]);
    const localPerfect = JSON.stringify(new Array(50).fill('correct'));
    const staleCloudProgress = JSON.stringify([
      ...new Array(45).fill('correct'),
      ...new Array(5).fill('wrong'),
    ]);
    const scoreKey = lessonBestScoreKey(12, 'fr');
    const passKey = lessonPassCountKey(12, 'fr');
    const progressKey = lessonProgressKey(12, 'fr');
    const rerollState = JSON.stringify({ date: '2026-05-20', replacements: { da1: 'dp1' } });
    const perfectPassEvidenceKey = achievementLessonPerfectPassesKey(12, 'fr');
    const perfectPassEvidence = JSON.stringify([1, 2]);

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      [scoreKey, '5'],
      [passKey, '4'],
      [progressKey, localPerfect],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      [trainerStoreKey('fr')]: cloudTrainer,
      [scoreKey]: '4.5',
      [passKey]: '1',
      [progressKey]: staleCloudProgress,
      [dailyTasksRerollKey('fr')]: rerollState,
      [perfectPassEvidenceKey]: perfectPassEvidence,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem(trainerStoreKey('fr'))).resolves.toBe(cloudTrainer);
    await expect(AsyncStorage.getItem(dailyTasksRerollKey('fr'))).resolves.toBe(rerollState);
    await expect(AsyncStorage.getItem(perfectPassEvidenceKey)).resolves.toBe(perfectPassEvidence);
    await expect(AsyncStorage.getItem(scoreKey)).resolves.toBe('5');
    await expect(AsyncStorage.getItem(passKey)).resolves.toBe('4');
    await expect(AsyncStorage.getItem(progressKey)).resolves.toBe(localPerfect);
    await expect(AsyncStorage.getItem('trainer_store_v1')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('lesson12_progress')).resolves.toBeNull();
  });

  it('syncs pending league results for Monday rollover modals', () => {
    expect(SYNC_KEYS).toContain('league_state_v3');
    expect(SYNC_KEYS).toContain('league_result_pending');
    expect(SYNC_KEYS).toContain('league_result_consumed_sig');
  });

  it('restores pending league result through the real cloud progress restore path', async () => {
    const pendingResult = JSON.stringify({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
      demoted: false,
      group: [{ uid: 'me', name: 'QA Monday', points: 920, isMe: true }],
    });
    const leagueState = JSON.stringify({
      leagueId: 1,
      weekId: '2026-W20',
      group: [{ uid: 'me', name: 'QA Monday', points: 0, isMe: true }],
    });

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      user_name: 'QA Monday',
      league_state_v3: leagueState,
      league_result_pending: pendingResult,
      week_points_v2: JSON.stringify({ weekKey: '2026-W19', points: 920 }),
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('league_result_pending')).resolves.toBe(pendingResult);
    await expect(AsyncStorage.getItem('league_state_v3')).resolves.toBe(leagueState);
  });

  it('keeps Monday league result sticky even when local XP is already higher than cloud', async () => {
    const pendingResult = JSON.stringify({
      prevLeagueId: 2,
      newLeagueId: 3,
      myRank: 2,
      totalInGroup: 10,
      promoted: true,
      demoted: false,
      group: [{ uid: 'me', name: 'QA Monday', points: 760, isMe: true }],
    });
    const leagueState = JSON.stringify({
      leagueId: 3,
      weekId: '2026-W20',
      group: [{ uid: 'me', name: 'QA Monday', points: 0, isMe: true }],
    });

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['league_state_v3', JSON.stringify({ leagueId: 2, weekId: '2026-W19', group: [] })],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      user_name: 'QA Monday',
      league_state_v3: leagueState,
      league_result_pending: pendingResult,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('user_total_xp')).resolves.toBe('13000');
    await expect(AsyncStorage.getItem('league_result_pending')).resolves.toBe(pendingResult);
    await expect(AsyncStorage.getItem('league_state_v3')).resolves.toBe(leagueState);
  });

  it('does not restore a cloud league result that was already dismissed locally', async () => {
    const pendingResult = JSON.stringify({
      prevLeagueId: 3,
      newLeagueId: 3,
      myRank: 5,
      totalInGroup: 10,
      promoted: false,
      demoted: false,
      group: [{ uid: 'me', name: 'QA Monday', points: 520, isMe: true }],
    });
    const consumedSig = JSON.stringify({
      prevLeagueId: 3,
      newLeagueId: 3,
      myRank: 5,
      totalInGroup: 10,
      promoted: false,
      demoted: false,
    });

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['league_result_consumed_sig', consumedSig],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      league_state_v3: JSON.stringify({ leagueId: 3, weekId: '2026-W20', group: [] }),
      league_result_pending: pendingResult,
    }));

    // Other safe cloud fields (for example the current league state) may still
    // be restored; the consumed-result tombstone must only block the modal.
    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('league_result_pending')).resolves.toBeNull();
  });

  it('derives last_active_date from legacy streak_last_date', () => {
    expect(deriveLastActiveDateForRestore({
      last_active_date: null,
      streak_last_date: '2026-05-07',
    })).toBe('2026-05-07');
  });

  it('backfills last_active_date from daily_stats for old cloud profiles', () => {
    expect(deriveLastActiveDateForRestore({
      last_active_date: null,
      streak_last_date: null,
      daily_stats: JSON.stringify({
        '2026-05-05': { points: 20, streak: 9 },
        '2026-05-08': { points: 12, streak: 10 },
      }),
      stats_daily_breakdown_v1: null,
    })).toBe('2026-05-08');
  });

  it('clamps the achievements smoke seed streak to evidenced activity', () => {
    expect(normalizeDevSeededStreakValue(500, {
      user_total_xp: '100000',
      login_bonus_v1: JSON.stringify({ consecutiveDays: 365, lastClaimDate: '2026-05-12T12:00:00.000Z' }),
      achievement_active_recall_correct_count: '50',
      achievement_arena_win_count: '10',
      shards_balance: '100',
      last_active_date: '2026-05-12',
      daily_stats: JSON.stringify({
        '2026-05-10': { points: 8 },
        '2026-05-11': { points: 12 },
        '2026-05-12': { points: 6 },
      }),
      stats_daily_breakdown_v1: null,
    }, '2026-05-12')).toBe(3);
  });

  it('keeps a high streak when the QA seed fingerprint is absent', () => {
    expect(normalizeDevSeededStreakValue(500, {
      user_total_xp: '240000',
      login_bonus_v1: JSON.stringify({ consecutiveDays: 42 }),
      achievement_active_recall_correct_count: '12',
      achievement_arena_win_count: '2',
      shards_balance: '17',
      last_active_date: '2026-05-12',
    }, '2026-05-12')).toBe(500);
  });
});

describe('premium cloud sync safety', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('does not sync empty local premium fields that could overwrite an admin grant in Firestore', () => {
    const local = {
      premium_plan: null,
      admin_premium_override: null,
      premium_expiry: null,
    };

    expect(shouldSyncPremiumProgressField('premium_plan', local.premium_plan, local)).toBe(false);
    expect(shouldSyncPremiumProgressField('admin_premium_override', local.admin_premium_override, local)).toBe(false);
    expect(shouldSyncPremiumProgressField('premium_expiry', local.premium_expiry, local)).toBe(false);
  });

  it('syncs meaningful VIP state, including a zero expiry for forever grants', () => {
    const local = {
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_until: '0',
      vip_admin_override: 'true',
    };

    expect(shouldSyncPremiumProgressField('vip_active', local.vip_active, local)).toBe(true);
    expect(shouldSyncPremiumProgressField('vip_plan', local.vip_plan, local)).toBe(true);
    expect(shouldSyncPremiumProgressField('vip_until', local.vip_until, local)).toBe(true);
    expect(shouldSyncPremiumProgressField('vip_admin_override', local.vip_admin_override, local)).toBe(true);
  });

  it('hydrates admin-granted VIP into local VIP flags when local XP wins restore', async () => {
    const expiry = String(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['premium_active', 'false'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_until: expiry,
      vip_admin_override: 'true',
      vip_admin_grant_at: String(Date.now()),
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('vip_plan')).resolves.toBe('admin_vip');
    await expect(AsyncStorage.getItem('vip_admin_override')).resolves.toBe('true');
    await expect(AsyncStorage.getItem('vip_until')).resolves.toBe(expiry);
    await expect(AsyncStorage.getItem('vip_active')).resolves.toBe('true');
    await expect(AsyncStorage.getItem('premium_active')).resolves.toBe('false');
  });

  it('normalizes Firestore Timestamp legacy admin expiry into VIP during sticky restore', async () => {
    const expiryMs = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['premium_active', 'false'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      premium_plan: 'admin_grant',
      admin_premium_override: 'true',
      premium_expiry: { toMillis: () => expiryMs },
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('premium_expiry')).resolves.toBe(String(Math.floor(expiryMs)));
    await expect(AsyncStorage.getItem('vip_until')).resolves.toBe(String(Math.floor(expiryMs)));
    await expect(AsyncStorage.getItem('vip_active')).resolves.toBe('true');
    await expect(AsyncStorage.getItem('premium_active')).resolves.toBe('false');
  });
});
