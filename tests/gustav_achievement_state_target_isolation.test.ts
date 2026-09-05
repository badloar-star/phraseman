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

  // зачем: раньше здесь проверялось, что английское достижение `lesson_1` не
  // открывает французское. Достижения категории `lessons` удалены из
  // приложения (в ALL_ACHIEVEMENTS остались только streak/xp/special/combo),
  // и тест сторожил отменённое правило. Контракт перевёрнут по образцу
  // quiz-достижений ниже: чужая запись в наследном хранилище не должна
  // просачиваться во французский набор ни под каким видом.
  it('does not leak retired legacy lesson achievements into the French bucket', async () => {
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id: 'lesson_1', unlockedAt: '2026-05-22T10:00:00.000Z', notified: true, shardClaimed: false },
    ]));

    const frenchStates = await loadAchievementStatesForTarget('fr');
    expect(frenchStates.find(s => s.id === 'lesson_1')).toBeUndefined();
    const frenchRaw = await AsyncStorage.getItem(achievementStateKey('fr'));
    expect(frenchRaw ?? '[]').not.toContain('"lesson_1"');
    // наследное хранилище нормализуется тем же чтением: запись об удалённом
    // достижении вычищается, а не переезжает во французский набор
    expect(await AsyncStorage.getItem('achievements_v1')).not.toContain('"lesson_1"');
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

  // зачем: достижения категории `lessons` удалены, и событие `lesson_complete`
  // выведено из FOUNDATION_ACHIEVEMENT_EVENT_TYPES — по решению в
  // achievements.ts удалённые награды не пишут счётчиков. Тест требовал записи
  // французского дня марафона и сторожил отменённое правило. Контракт
  // перевёрнут: событие НО-ОП, английский день остаётся нетронутым, новых
  // записей не появляется ни в одном языке.
  it('treats lesson_complete as a no-op and leaves legacy day storage intact', async () => {
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

    // английский день не тронут — французское событие в него не полезло
    expect(await AsyncStorage.getItem(legacyDayKey)).toBe(JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']));
    // и своего дня не завело: награда удалена, писать счётчик больше некому
    expect(await AsyncStorage.getItem(frenchDayKey)).toBeNull();
    // достижение удалено из приложения — его не должно быть ни в одном наборе
    expect(legacy.find((s: { id: string }) => s.id === 'lesson_marathon_day')).toBeUndefined();
    expect(french.find((s: { id: string }) => s.id === 'lesson_marathon_day')).toBeUndefined();
  });

  // зачем: combo-достижения удалены, и событие `combo` больше не входит в
  // FOUNDATION_ACHIEVEMENT_EVENT_TYPES — по прямому решению в achievements.ts
  // («удалённые награды больше не должны ни читать прогресс, ни писать
  // achievement-счётчики»). Тест сторожил отменённое правило и требовал
  // записи счётчика. Контракт перевёрнут по образцу quiz-достижений: событие
  // обязано быть НО-ОП и не плодить записей НИ в одном языке, иначе мёртвые
  // счётчики снова поедут в Firestore.
  it('treats combo events as a no-op and writes nothing for either target', async () => {
    await AsyncStorage.setItem('achievement_combo_best_count', '500');

    await checkAchievements({ type: 'combo', count: 3, studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(await AsyncStorage.getItem('achievement_combo_best_count')).toBe('500');
    expect(await AsyncStorage.getItem(comboAchievementCounterKey('fr'))).toBeNull();
    expect(legacy.find((s: { id: string }) => s.id === 'combo_3')).toBeUndefined();
    expect(french.find((s: { id: string }) => s.id === 'combo_3')).toBeUndefined();
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

  // зачем: flashcard-достижения удалены, события `flashcard_*` выведены из
  // FOUNDATION_ACHIEVEMENT_EVENT_TYPES. Контракт перевёрнут: события НО-ОП,
  // английские счётчики не тронуты, французские не заводятся.
  it('treats flashcard events as a no-op and leaves legacy counters intact', async () => {
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

    // английские счётчики нетронуты — французские события в них не полезли
    expect(await AsyncStorage.getItem('achievement_flashcards_saved_count')).toBe('250');
    expect(await AsyncStorage.getItem('achievement_flashcards_flip_count')).toBe('1000');
    // и своих не завели: награды удалены, писать счётчики больше некому
    expect(await AsyncStorage.getItem(flashcardsAchievementSavedCountKey('fr'))).toBeNull();
    expect(await AsyncStorage.getItem(flashcardsAchievementFlipCountKey('fr'))).toBeNull();
    expect(await AsyncStorage.getItem(flashcardsAchievementSourceSetKey('fr'))).toBeNull();
    expect(await AsyncStorage.getItem(flashcardsAchievementViewStreakKey('fr'))).toBeNull();
    expect(legacy.find((s: { id: string }) => s.id === 'flashcards_session')).toBeUndefined();
    expect(french.find((s: { id: string }) => s.id === 'flashcards_session')).toBeUndefined();
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

  // зачем: daily_phrase-достижения удалены, событие выведено из
  // FOUNDATION_ACHIEVEMENT_EVENT_TYPES. Контракт перевёрнут: НО-ОП, английские
  // счётчики нетронуты, французские не заводятся.
  it('treats daily phrase events as a no-op and leaves legacy counters intact', async () => {
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
    expect(await AsyncStorage.getItem(dailyPhraseAchievementReadCountKey('fr'))).toBeNull();
    expect(await AsyncStorage.getItem(dailyPhraseAchievementSaveCountKey('fr'))).toBeNull();
    expect(legacy.find((s: { id: string }) => s.id === 'daily_phrase_read_30')).toBeUndefined();
    expect(french.find((s: { id: string }) => s.id === 'daily_phrase_first')).toBeUndefined();
    expect(french.find((s: { id: string }) => s.id === 'daily_phrase_save')).toBeUndefined();
  });

  // зачем: достижение `diagnosis` удалено вместе с разделом диагнозов тренера,
  // событие выведено из FOUNDATION_ACHIEVEMENT_EVENT_TYPES. Контракт
  // перевёрнут: наследная запись не переезжает во французский набор, а новое
  // событие не заводит её заново ни в одном языке.
  it('treats diagnosis events as a no-op and keeps the retired record out of both buckets', async () => {
    await AsyncStorage.setItem('achievements_v1', JSON.stringify([
      { id: 'diagnosis', unlockedAt: '2026-05-22T10:00:00.000Z', notified: true, shardClaimed: true },
    ]));

    const beforeFrench = await loadAchievementStatesForTarget('fr');
    expect(beforeFrench.find(s => s.id === 'diagnosis')).toBeUndefined();

    await checkAchievements({ type: 'diagnosis', studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(legacy.find((s: { id: string }) => s.id === 'diagnosis')).toBeUndefined();
    expect(french.find((s: { id: string }) => s.id === 'diagnosis')).toBeUndefined();
  });

  // зачем: pack- и share-достижения удалены, события выведены из
  // FOUNDATION_ACHIEVEMENT_EVENT_TYPES. Контракт перевёрнут: НО-ОП, английский
  // счётчик шеров нетронут, французский не заводится.
  it('treats pack and share events as a no-op and leaves legacy counters intact', async () => {
    await AsyncStorage.multiSet([
      ['flashcards_owned_packs_v1', JSON.stringify(['en-pack-1', 'en-pack-2', 'en-pack-3', 'en-pack-4', 'en-pack-5'])],
      ['achievement_share_count', '9'],
    ]);

    await checkAchievements({ type: 'pack_purchased', totalPacks: 1, studyTarget: 'fr' });
    await checkAchievements({ type: 'achievement_shared', studyTarget: 'fr' });

    const legacy = JSON.parse(await AsyncStorage.getItem('achievements_v1') ?? '[]');
    const french = JSON.parse(await AsyncStorage.getItem(achievementStateKey('fr')) ?? '[]');

    expect(await AsyncStorage.getItem('achievement_share_count')).toBe('9');
    expect(await AsyncStorage.getItem(shareAchievementCounterKey('fr'))).toBeNull();
    expect(legacy.find((s: { id: string }) => s.id === 'pack_purchased')).toBeUndefined();
    expect(legacy.find((s: { id: string }) => s.id === 'share_achievement')).toBeUndefined();
    expect(french.find((s: { id: string }) => s.id === 'pack_purchased')).toBeUndefined();
    expect(french.find((s: { id: string }) => s.id === 'share_achievement')).toBeUndefined();
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
