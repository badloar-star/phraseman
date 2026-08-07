import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import {
  getAllItems,
  recordMistake as recordRecallMistake,
} from '../app/active_recall';
import {
  flushMistakeLog,
  loadMistakeLog,
  logMistake,
} from '../app/mistake_log';
import {
  canUseFreeDiagnosisTrainingConsolidation,
  loadDiagnosisTrainingProgress,
  loadResolvedPersonalTrainings,
  markFreeDiagnosisCoachCompleted,
  markPersonalTrainingResolved,
  reserveFreeDiagnosisTraining,
  saveDiagnosisTrainingProgress,
} from '../app/diagnosis_training_progress';
import {
  devSeedTrainerScenario,
  getTrainerDashboard,
  recordPhraseMistake,
} from '../app/trainer_store';
import {
  getPosMasterySnapshot,
  recordPosWorkoutResult,
} from '../app/pos_workout_engine';
import { computeFrenchPhraseAnalytics } from '../app/french_phrase_analytics';
import type { PhraseMistakeInput } from '../app/phrase_analytics';
import {
  activeRecallItemsKey,
  mistakeLogKey,
  personalPracticeFreeAccessKey,
  personalPracticeTrainingProgressKey,
  posMasteryKey,
  resolvedPersonalTrainingsKey,
  trainerStoreKey,
} from '../app/target_storage_keys';
import {
  frenchPersonalPracticeGateCopy,
  personalPracticeCoachEnabledForTarget,
  personalPracticeCoachGateForTarget,
  FRENCH_PERSONAL_PRACTICE_REQUIRED_EVIDENCE,
} from '../app/personal_practice_target_gate';
import { checkCoachToastNeeded, checkCoachToastNeededWithAnalytics } from '../app/coach_toast_trigger';
import { getAllDiagnosisTrainingsForTarget, getDiagnosisTrainingForTarget } from '../app/diagnosis_trainings';
import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';
import {
  __resetAccountGenerationForTests,
  ensureAccountGeneration,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const mockStorage: Record<string, string> = {};
const ROOT = path.join(__dirname, '..');

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  ensureAccountGeneration('gustav-personal-practice-test');
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
});

describe('Gustav personal practice target isolation', () => {
  it('keeps French mistake analytics read-only until French personal coach lessons are source-gated', () => {
    expect(personalPracticeCoachEnabledForTarget('en')).toBe(true);
    expect(personalPracticeCoachEnabledForTarget('fr')).toBe(false);
    expect(personalPracticeCoachGateForTarget('fr')).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_personal_training_source_gate',
      blockedRoutes: ['/problem_coach'],
      requiredEvidence: FRENCH_PERSONAL_PRACTICE_REQUIRED_EVIDENCE,
    });
    expect(getDiagnosisTrainingForTarget('article_a_an', 'en')?.id).toBe('article_a_an');
    expect(getDiagnosisTrainingForTarget('article_a_an', 'fr')).toBeNull();
    expect(getAllDiagnosisTrainingsForTarget('fr')).toEqual([]);
    expect(frenchPersonalPracticeGateCopy('ru').body).toContain('Английские персональные тренировки скрыты');
    expect(frenchPersonalPracticeGateCopy('uk').body).toContain('Англійські персональні тренування приховано');
    expect(JSON.stringify(frenchPersonalPracticeGateCopy('ru'))).not.toMatch(/Français|Commencer|Entraîneur/);

    const adminSource = fs.readFileSync(path.join(ROOT, 'app', '_admin_settings_testers.tsx'), 'utf8');
    const trainerSource = fs.readFileSync(path.join(ROOT, 'app', 'trainer.tsx'), 'utf8');
    const analyticsScreenSource = fs.readFileSync(path.join(ROOT, 'app', 'phrase_analytics_screen.tsx'), 'utf8');
    // зачем: строки про app/(tabs)/quizzes.tsx убраны — экран удалён вместе с квизами.
    const problemCoachSource = fs.readFileSync(path.join(ROOT, 'app', 'problem_coach.tsx'), 'utf8');
    const phrasesTrainerSource = fs.readFileSync(path.join(ROOT, 'app', 'trainer_phrases_session.tsx'), 'utf8');
    const lessonWordsSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson_words.tsx'), 'utf8');
    const coachToastSource = fs.readFileSync(path.join(ROOT, 'app', 'coach_toast_trigger.ts'), 'utf8');
    const progressSource = fs.readFileSync(path.join(ROOT, 'app', 'diagnosis_training_progress.ts'), 'utf8');
    expect(adminSource).toContain('personalPracticeCoachEnabledForTarget(studyTarget)');
    expect(adminSource).toContain('frenchPersonalPracticeGateCopy(lang)');
    expect(adminSource).toContain('const diagnosisDevBlocked = !personalPracticeCoachEnabled');
    // зачем: ассерт убран — проверял код, снятый вместе с квизами/Ареной (в репо его нет).
    expect(adminSource).toContain('if (diagnosisDevBlocked) {');
    expect(adminSource).toContain('/problem_coach?category=${category}&microDiagnosisId=${microDiagnosisId}');
    expect(trainerSource).toContain('personalPracticeCoachEnabledForTarget(studyTarget)');
    expect(trainerSource).toContain('devSeedTrainer(studyTarget)');
    expect(trainerSource).toContain('personalTrainingEnabled={personalPracticeCoachEnabled}');
    expect(trainerSource).toContain('prefetchTrainerPracticeSnapshot({ studyTarget, sourceLocale, force: true })');
    const trainerPrefetchSource = fs.readFileSync(path.join(ROOT, 'app', 'trainer_practice_prefetch.ts'), 'utf8');
    expect(trainerPrefetchSource).toContain('loadResolvedPersonalTrainings({ studyTarget, sourceLocale: normalizedSourceLocale })');
    expect(trainerPrefetchSource).not.toContain('ensureFrenchRemotePersonalPractice');
    expect(trainerSource).toContain('trainerSessionContentAvailableForTarget(studyTarget)');
    expect(trainerSource).toContain('trainerSessionEnabled');
    expect(trainerPrefetchSource).toContain('Promise.resolve(null)');
    expect(analyticsScreenSource).toContain('const analyticsSourceGateOpen = personalPracticeCoachEnabled');
    expect(analyticsScreenSource).toContain('!analyticsSourceGateOpen');
    expect(analyticsScreenSource).toContain('frenchPersonalPracticeGateCopy(lang)');
    expect(analyticsScreenSource).toContain('personalPracticeCoachEnabledForTarget(studyTarget)');
    expect(analyticsScreenSource).toContain("import { storageStudyTarget } from './target_storage_keys'");
    expect(analyticsScreenSource).toContain("storageStudyTarget(studyTarget) === 'fr'");
    expect(analyticsScreenSource).not.toContain("studyTarget === 'fr'");
    expect(analyticsScreenSource).toContain('personalTrainingEnabled={personalPracticeCoachEnabled}');
    expect(analyticsScreenSource).toContain('loadResolvedPersonalTrainings({ studyTarget, sourceLocale })');
    expect(problemCoachSource).toContain('useStudyTarget');
    expect(problemCoachSource).toContain('getDiagnosisTrainingForTarget(microDiagnosisId, studyTarget)');
    expect(problemCoachSource).toContain('personalPracticeCoachEnabledForTarget(studyTarget)');
    expect(problemCoachSource).toContain('reserveFreeDiagnosisTraining(diagnosisTraining.id, { studyTarget, sourceLocale })');
    expect(problemCoachSource).toContain('markPersonalTrainingResolved({');
    expect(problemCoachSource).toContain("router.replace('/trainer' as any)");
    expect(problemCoachSource).toContain('}, studyTarget)');
    expect(phrasesTrainerSource).toContain('const trainerGateOpen = trainerSessionContentAvailableForTarget(studyTarget)');
    expect(phrasesTrainerSource).toContain('if (!trainerGateOpen)');
    expect(phrasesTrainerSource).toContain('setDeck(buildTrainerSessionDeck(items))');
    expect(lessonWordsSource).toContain("checkCoachToastNeededWithAnalytics(wrongMistakesRef.current, studyTarget, lang === 'uk' ? 'uk' : 'ru')");
    expect(coachToastSource).toContain("storageStudyTarget(studyTarget) === 'fr'");
    expect(coachToastSource).toContain('computeFrenchPhraseAnalytics({ sourceLocale })');
    expect(progressSource).toContain('personalPracticeCoachEnabledForTarget(scope?.studyTarget)');
    expect(progressSource).toContain('if (!personalPracticeMutationsAllowed(scope)) return false;');

    expect(FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation).toEqual(expect.arrayContaining([
      'french_personal_practice_training_bank',
      'french_personal_practice_mistake_taxonomy_review',
      'french_pos_workout_profile_review',
      'ru_uk_personal_practice_prompt_review',
    ]));
    expect(FRENCH_CONTENT_SOURCE_GATE.hardBlocks).toEqual(expect.arrayContaining([
      'english_personal_training_reuse_without_french_source_gate',
      'english_pos_workout_profile_reuse_without_french_source_gate',
    ]));
  });

  it('blocks English coach toast decisions for French lessons', async () => {
    const repeatedArticleMistakes: PhraseMistakeInput[] = [
      { phrase: 'I am a teacher', tokenText: 'a', rawCategory: 'article', category: 'article' },
      { phrase: 'She has a car', tokenText: 'a', rawCategory: 'article', category: 'article' },
      { phrase: 'This is a book', tokenText: 'a', rawCategory: 'article', category: 'article' },
    ];

    expect(checkCoachToastNeeded(repeatedArticleMistakes, 'en').show).toBe(true);
    expect(checkCoachToastNeeded(repeatedArticleMistakes, 'fr').show).toBe(false);
    await expect(checkCoachToastNeededWithAnalytics(repeatedArticleMistakes, 'fr')).resolves.toEqual({ show: false });

    const lessonSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');
    expect(lessonSource).toContain('checkCoachToastNeededWithAnalytics(');
    expect(lessonSource).toContain('lessonWrongMistakesRef.current,');
    expect(lessonSource).toContain('studyTargetRef.current,');
    expect(lessonSource).toContain("lang === 'uk' ? 'uk' : 'ru'");
  });

  it('source-gates French diagnosis progress writes while preserving English personal practice', async () => {
    const runtimeState = {
      stepIndex: 0,
      correctCount: 0,
      correctStreak: 0,
      hadWrong: false,
      correctAfterWrong: false,
      mixedReviewPassed: false,
      depthByStep: {},
      failedItems: [],
      recoveredItems: [],
      attempts: [],
    };

    await expect(markPersonalTrainingResolved({
      category: 'article',
      microDiagnosisId: 'article_a_an',
      resolvedAt: 123,
      studyTarget: 'fr',
      sourceLocale: 'uk',
    })).resolves.toBe(false);
    await expect(reserveFreeDiagnosisTraining('article_a_an', { studyTarget: 'fr', sourceLocale: 'ru' })).resolves.toBe(false);
    await markFreeDiagnosisCoachCompleted('article_a_an', { studyTarget: 'fr', sourceLocale: 'ru' });
    await saveDiagnosisTrainingProgress('article_a_an', runtimeState, { studyTarget: 'fr', sourceLocale: 'ru' });

    expect(mockStorage[resolvedPersonalTrainingsKey('fr', 'uk')]).toBeUndefined();
    expect(mockStorage[resolvedPersonalTrainingsKey('fr', 'ru')]).toBeUndefined();
    expect(mockStorage[personalPracticeTrainingProgressKey('article_a_an', 'fr', 'ru')]).toBeUndefined();
    expect(mockStorage[personalPracticeFreeAccessKey('fr', 'ru')]).toBeUndefined();
    expect(mockStorage.resolved_personal_trainings_v1).toBeUndefined();
    await expect(loadResolvedPersonalTrainings({ studyTarget: 'fr', sourceLocale: 'ru' })).resolves.toEqual({
      categories: {},
      diagnoses: {},
    });
    await expect(loadResolvedPersonalTrainings({ studyTarget: 'fr', sourceLocale: 'uk' })).resolves.toEqual({
      categories: {},
      diagnoses: {},
    });
    await expect(loadDiagnosisTrainingProgress('article_a_an', { studyTarget: 'fr', sourceLocale: 'ru' })).resolves.toBeNull();
    expect(mockStorage[personalPracticeFreeAccessKey('fr', 'uk')]).toBeUndefined();
    expect(mockStorage.diagnosis_training_free_access_v1).toBeUndefined();
    await expect(canUseFreeDiagnosisTrainingConsolidation('article_a_an', { studyTarget: 'fr', sourceLocale: 'ru' })).resolves.toBe(false);
    await expect(canUseFreeDiagnosisTrainingConsolidation('article_a_an', { studyTarget: 'fr', sourceLocale: 'uk' })).resolves.toBe(false);

    await expect(markPersonalTrainingResolved({
      category: 'article',
      microDiagnosisId: 'article_a_an',
      resolvedAt: 456,
      studyTarget: 'en',
      sourceLocale: 'ru',
    })).resolves.toBe(true);
    await expect(reserveFreeDiagnosisTraining('article_a_an', { studyTarget: 'en', sourceLocale: 'ru' })).resolves.toBe(true);
    await markFreeDiagnosisCoachCompleted('article_a_an', { studyTarget: 'en', sourceLocale: 'ru' });
    await saveDiagnosisTrainingProgress('article_a_an', runtimeState, { studyTarget: 'en', sourceLocale: 'ru' });

    expect(mockStorage.resolved_personal_trainings_v1).toContain('article_a_an');
    expect(mockStorage.diagnosis_training_free_access_v1).toContain('coachCompletedAt');
    expect(mockStorage['diagnosis_training_progress_v1:article_a_an']).toContain('stepIndex');
  });

  it('stores French recall, mistake analytics, and trainer queues outside legacy English keys', async () => {
    await recordRecallMistake('Je suis ici', 'Я здесь', 1, 'Я тут', 'lesson', undefined, undefined, 'fr');
    logMistake('Je suis ici', 1, 'lesson', 'wrong_pick', { tokenText: 'suis', rawCategory: 'verbe_être' }, 'fr');
    await flushMistakeLog();
    await recordPhraseMistake('Je suis ici', 'Я здесь', 'Я тут', 1, 'suis', 'verbe_être', undefined, 'fr');
    await recordPosWorkoutResult('to-be', true, 'fr');
    await recordPosWorkoutResult('to-be', false, 'fr');

    expect(mockStorage[activeRecallItemsKey('fr')]).toContain('Je suis ici');
    expect(mockStorage[mistakeLogKey('fr')]).toContain('Je suis ici');
    expect(mockStorage[trainerStoreKey('fr')]).toContain('Je suis ici');
    expect(mockStorage[posMasteryKey('fr')]).toContain('to-be');

    expect(mockStorage.active_recall_items).toBeUndefined();
    expect(mockStorage.mistake_log_v1).toBeUndefined();
    expect(mockStorage.trainer_store_v1).toBeUndefined();
    expect(mockStorage.pos_mastery_v1).toBeUndefined();

    await recordRecallMistake('I am here', 'Я здесь', 1, 'Я тут');
    await recordPosWorkoutResult('verb', true);
    expect((await getAllItems('fr')).map((item) => item.phrase)).toEqual(['Je suis ici']);
    expect((await getAllItems()).map((item) => item.phrase)).toEqual(['I am here']);
    expect((await loadMistakeLog('fr')).map((entry) => entry.phrase)).toEqual(['Je suis ici']);
    expect((await getPosMasterySnapshot('fr')).map((entry) => entry.category)).toEqual(['to-be']);
    expect((await getPosMasterySnapshot()).map((entry) => entry.category)).toEqual(['verb']);
    expect((await getTrainerDashboard('fr', 'ru')).totalTracked).toBe(1);
    expect((await getTrainerDashboard()).totalTracked).toBe(0);
    const frenchAnalytics = await computeFrenchPhraseAnalytics();
    expect(frenchAnalytics.totalMistakes).toBe(1);
    expect(frenchAnalytics.categoryStats[0]?.category).toBe('to-be');
    expect(frenchAnalytics.categoryStats[0]?.topWords).toContain('suis');
    expect(frenchAnalytics.lessonStats[0]?.lessonNameRU).toMatch(/être|avoir|c’est/i);
    expect(frenchAnalytics.topMistakePhrases[0]?.phrase).toBe('Je suis ici');

    await expect(markPersonalTrainingResolved({
      category: 'to-be',
      resolvedAt: Date.now() + 1000,
      studyTarget: 'fr',
      sourceLocale: 'ru',
    })).resolves.toBe(false);
    expect((await computeFrenchPhraseAnalytics({ sourceLocale: 'ru' })).totalMistakes).toBe(1);

    mockStorage[resolvedPersonalTrainingsKey('fr', 'ru')] = JSON.stringify({
      categories: { 'to-be': Date.now() + 1000 },
      diagnoses: {},
    });
    expect((await computeFrenchPhraseAnalytics({ sourceLocale: 'ru' })).totalMistakes).toBe(0);
    expect((await computeFrenchPhraseAnalytics({ sourceLocale: 'uk' })).totalMistakes).toBe(1);
    expect((await getTrainerDashboard('fr', 'ru')).hardestCategory).toBeNull();
    expect((await getTrainerDashboard('fr', 'uk')).hardestCategory).toBe('to-be');
  });

  it('blocks English dev trainer seeds from populating French personal practice', async () => {
    await expect(devSeedTrainerScenario('weak', 'fr')).resolves.toBe(false);

    expect(mockStorage[trainerStoreKey('fr')]).toBeUndefined();
    expect(mockStorage.trainer_store_v1).toBeUndefined();

    await expect(devSeedTrainerScenario('weak', 'es')).resolves.toBe(true);

    expect(mockStorage.trainer_store_v1).toContain('She went to the store');
    expect(mockStorage[trainerStoreKey('fr')]).toBeUndefined();
  });
});
