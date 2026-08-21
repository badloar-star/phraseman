import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkAchievements,
  loadAchievementStates,
  loadAchievementStatesForTarget,
} from '../app/achievements';
import {
  achievementLessonMarathonDayKey,
  achievementStateKey,
  comboAchievementCounterKey,
  dailyPhraseAchievementReadCountKey,
  dailyPhraseAchievementSaveCountKey,
  flashcardsAchievementFlipCountKey,
  flashcardsAchievementSavedCountKey,
  flashcardsAchievementSourceSetKey,
  flashcardsAchievementViewStreakKey,
  lessonProgressKey,
  shareAchievementCounterKey,
} from '../app/target_storage_keys';
import {
  __resetAccountGenerationForTests,
  ensureAccountGeneration,
} from '../app/account_generation';

describe('Gustav achievement state target isolation', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    __resetAccountGenerationForTests();
    ensureAccountGeneration('gustav-achievement-target-test');
    (globalThis as any).__DEV__ = true;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('does not let legacy English lesson achievements unlock French target achievements', async () => {
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id: 'lesson_1', unlockedAt: '2026-05-22T10:00:00.000Z', notified: true, shardClaimed: false },
    ]));

    const frenchStates = await loadAchievementStatesForTarget('fr');
    expect(frenchStates.find(s => s.id === 'lesson_1')?.unlockedAt).toBeNull();
    expect(await AsyncStorage.getItem(achievementStateKey('fr'))).toContain('"lesson_1"');
  });

  it('stores French target achievement unlock state in the scoped achievement bucket', async () => {
    await AsyncStorage.setItem(
      lessonProgressKey(1, 'fr'),
      JSON.stringify(Array.from({ length: 50 }, () => 'correct')),
    );

    await checkAchievements({
      type: 'lesson_complete',
      lessonCount: 1,
      wasPerfect: true,
      perfectCount: 1,
      lessonId: 1,
      studyTarget: 'fr',
    });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(legacy.find((s: { id: string }) => s.id === 'lesson_1')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'lesson_1')?.unlockedAt).not.toBeNull();
  });

  it('keeps French lesson marathon evidence out of legacy English day storage', async () => {
    const legacyDayKey = 'achievement_lesson_marathon_day_2026-05-22';
    const frenchDayKey = achievementLessonMarathonDayKey('2026-05-22', 'fr');
    jest.useFakeTimers().setSystemTime(new Date('2026-05-22T12:00:00.000Z'));
    await AsyncStorage.setItem(legacyDayKey, JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']));

    await checkAchievements({
      type: 'lesson_complete',
      lessonCount: 1,
      wasPerfect: false,
      lessonId: 1,
      studyTarget: 'fr',
    });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(await AsyncStorage.getItem(legacyDayKey)).toBe(JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']));
    expect(await AsyncStorage.getItem(frenchDayKey)).toBe(JSON.stringify(['1']));
    expect(legacy.find((s: { id: string }) => s.id === 'lesson_marathon_day')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'lesson_marathon_day')?.unlockedAt).toBeNull();
  });

  it('keeps French combo achievement state and best counter out of legacy English storage', async () => {
    await AsyncStorage.setItem('achievement_combo_best_count', '500');

    await checkAchievements({ type: 'combo', count: 3, studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(await AsyncStorage.getItem('achievement_combo_best_count')).toBe('500');
    expect(await AsyncStorage.getItem(comboAchievementCounterKey('fr'))).toBe('3');
    expect(legacy.find((s: { id: string }) => s.id === 'combo_3')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'combo_3')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'combo_500')?.unlockedAt).toBeNull();
  });

  // зачем: раньше здесь проверялась изоляция quiz-достижений между языками.
  // Викторины удалены из приложения вместе со своими достижениями, поэтому
  // контракт перевёрнут: quiz-событие обязано быть НО-ОП и не плодить записи
  // в хранилище — иначе мёртвые счётчики снова начнут уезжать в Firestore.
  it('stores French exam and gem achievements in the scoped target bucket', async () => {
    await checkAchievements({ type: 'exam', pct: 95, studyTarget: 'fr' });
    await checkAchievements({ type: 'gem', level: 'A1', gem: 'ruby', studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(legacy.find((s: { id: string }) => s.id === 'exam_excellent')).toBeUndefined();
    expect(legacy.find((s: { id: string }) => s.id === 'gem_a1_ruby')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'exam_excellent')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'gem_a1_ruby')?.unlockedAt).not.toBeNull();
  });

  it('keeps French flashcard achievement counters and state out of legacy English storage', async () => {
    await AsyncStorage.multiSet([
      ['achievement_flashcards_saved_count', '250'],
      ['achievement_flashcards_flip_count', '1000'],
      ['achievement_flashcards_view_streak_v1', JSON.stringify({ day: '2026-05-22', streak: 30 })],
      ['achievement_flashcards_source_set_v1', JSON.stringify(['lesson', 'word', 'verb', 'daily_phrase'])],
    ]);

    await checkAchievements({ type: 'flashcard_saved', source: 'lesson', studyTarget: 'fr' });
    await checkAchievements({ type: 'flashcard_flipped', count: 1, studyTarget: 'fr' });
    await checkAchievements({ type: 'flashcard_viewed', count: 1, studyTarget: 'fr' });
    await checkAchievements({ type: 'flashcards_session', studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(await AsyncStorage.getItem('achievement_flashcards_saved_count')).toBe('250');
    expect(await AsyncStorage.getItem('achievement_flashcards_flip_count')).toBe('1000');
    expect(await AsyncStorage.getItem(flashcardsAchievementSavedCountKey('fr'))).toBe('1');
    expect(await AsyncStorage.getItem(flashcardsAchievementFlipCountKey('fr'))).toBe('1');
    expect(await AsyncStorage.getItem(flashcardsAchievementSourceSetKey('fr'))).toBe(JSON.stringify(['lesson']));
    expect(JSON.parse(await AsyncStorage.getItem(flashcardsAchievementViewStreakKey('fr')) ?? '{}').streak).toBe(1);
    expect(legacy.find((s: { id: string }) => s.id === 'flashcards_session')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'flashcards_session')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'flashcards_save_25')?.unlockedAt).toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'flashcards_flip_100')?.unlockedAt).toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'flashcards_view_7_days')?.unlockedAt).toBeNull();
  });

  it('keeps French mistake-practice achievements out of English state', async () => {
    await checkAchievements({
      type: 'mistake_practice_progress',
      corrected: 1,
      voiceCorrected: 1,
      independentDays: 7,
      perfectSession: true,
      studyTarget: 'fr',
    });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(legacy.find((s: { id: string }) => s.id === 'mistake_corrected_first')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'mistake_corrected_first')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'mistake_voice_corrected_first')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'mistake_success_7_days')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'mistake_perfect_session')?.unlockedAt).not.toBeNull();
  });

  it('keeps French daily phrase achievement counters out of legacy English storage', async () => {
    await AsyncStorage.multiSet([
      ['achievement_daily_phrase_read_count', '30'],
      ['achievement_daily_phrase_save_count', '100'],
    ]);

    await checkAchievements({ type: 'daily_phrase', action: 'read', studyTarget: 'fr' });
    await checkAchievements({ type: 'daily_phrase', action: 'save', studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(await AsyncStorage.getItem('achievement_daily_phrase_read_count')).toBe('30');
    expect(await AsyncStorage.getItem('achievement_daily_phrase_save_count')).toBe('100');
    expect(await AsyncStorage.getItem(dailyPhraseAchievementReadCountKey('fr'))).toBe('1');
    expect(await AsyncStorage.getItem(dailyPhraseAchievementSaveCountKey('fr'))).toBe('1');
    expect(legacy.find((s: { id: string }) => s.id === 'daily_phrase_read_30')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'daily_phrase_first')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'daily_phrase_save')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'daily_phrase_read_30')?.unlockedAt).toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'daily_phrase_save_100')?.unlockedAt).toBeNull();
  });

  it('keeps French diagnosis achievement state out of legacy English storage', async () => {
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id: 'diagnosis', unlockedAt: '2026-05-22T10:00:00.000Z', notified: true, shardClaimed: true },
    ]));

    const beforeFrench = await loadAchievementStatesForTarget('fr');
    expect(beforeFrench.find(s => s.id === 'diagnosis')?.unlockedAt).toBeNull();

    await checkAchievements({ type: 'diagnosis', studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(legacy.find((s: { id: string }) => s.id === 'diagnosis')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'diagnosis')?.unlockedAt).not.toBeNull();
  });

  it('keeps French pack and share achievements out of legacy English storage', async () => {
    await AsyncStorage.multiSet([
      ['flashcards_owned_packs_v1', JSON.stringify(['en-pack-1', 'en-pack-2', 'en-pack-3', 'en-pack-4', 'en-pack-5'])],
      ['achievement_share_count', '9'],
    ]);

    await checkAchievements({ type: 'pack_purchased', totalPacks: 1, studyTarget: 'fr' });
    await checkAchievements({ type: 'achievement_shared', studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(await AsyncStorage.getItem('achievement_share_count')).toBe('9');
    expect(await AsyncStorage.getItem(shareAchievementCounterKey('fr'))).toBe('1');
    expect(legacy.find((s: { id: string }) => s.id === 'pack_purchased')).toBeUndefined();
    expect(legacy.find((s: { id: string }) => s.id === 'pack_5_purchased')).toBeUndefined();
    expect(legacy.find((s: { id: string }) => s.id === 'share_achievement')).toBeUndefined();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'pack_purchased')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'pack_5_purchased')?.unlockedAt).toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'share_achievement')?.unlockedAt).not.toBeNull();
    expect(french.find((s: { id: string; unlockedAt: string | null }) => s.id === 'share_achievement_10')?.unlockedAt).toBeNull();
  });

  it('aggregates English legacy and French scoped achievement states for shared achievements UI', async () => {
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id: 'streak_3', unlockedAt: '2026-05-22T10:00:00.000Z', notified: true, shardClaimed: true },
    ]));
    await AsyncStorage.setItem(achievementStateKey('fr'), JSON.stringify([
      { id: 'lesson_1', unlockedAt: '2026-05-22T11:00:00.000Z', notified: false, shardClaimed: false },
    ]));

    const states = await loadAchievementStates();
    expect(states.find(s => s.id === 'streak_3')?.unlockedAt).not.toBeNull();
    expect(states.find(s => s.id === 'lesson_1')?.unlockedAt).not.toBeNull();
  });
});
