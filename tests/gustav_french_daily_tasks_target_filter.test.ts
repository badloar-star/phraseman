import fs from 'fs';
import path from 'path';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
    multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, null])),
    multiSet: jest.fn(async () => {}),
  },
}));

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => false),
}));

jest.mock('../app/events', () => ({
  actionToastTri: jest.fn((copy) => copy),
  emitAppEvent: jest.fn(),
}));

jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => unknown) => fn()),
}));

jest.mock('../app/shards_system', () => ({
  spendShards: jest.fn(async () => true),
}));

jest.mock('../app/lifetime_profile_stats', () => ({
  bumpDailyTaskClaimed: jest.fn(async () => {}),
}));

import {
  ALL_TASKS,
  dailyTaskAvailableForStudyTarget,
  filterDailyTasksForStudyTarget,
  FRENCH_LESSON_CONTENT_DAILY_TASK_TYPES,
  FRENCH_THEORY_DAILY_TASK_TYPES,
  FRENCH_UNAVAILABLE_DAILY_TASK_TYPES,
  type DailyTask,
  type TaskType,
} from '../app/daily_tasks';

const repoRoot = path.join(__dirname, '..');

const byId = (id: string): DailyTask => {
  const task = ALL_TASKS.find((candidate) => candidate.id === id);
  if (!task) throw new Error(`Missing daily task fixture: ${id}`);
  return task;
};

const hasTaskType = (type: TaskType): boolean => ALL_TASKS.some((candidate) => candidate.type === type);

const existingTasksByType = (types: Iterable<TaskType>): DailyTask[] => (
  [...types]
    .map((type) => ALL_TASKS.find((candidate) => candidate.type === type))
    .filter((task): task is DailyTask => Boolean(task))
);

describe('Gustav French daily task target filter', () => {
  it('keeps live source-gated daily task types visible for French without restoring retired challenges', () => {
    const unavailable = existingTasksByType(FRENCH_UNAVAILABLE_DAILY_TASK_TYPES);
    const sourceGatedTypes = [
      ...FRENCH_LESSON_CONTENT_DAILY_TASK_TYPES,
      ...FRENCH_THEORY_DAILY_TASK_TYPES,
    ];
    const sourceGated = existingTasksByType(sourceGatedTypes);
    const targetScoped = [...unavailable, ...sourceGated];

    expect(unavailable.map((task) => task.type)).toEqual(expect.arrayContaining(
      [...FRENCH_UNAVAILABLE_DAILY_TASK_TYPES].filter(hasTaskType),
    ));
    expect(sourceGated.map((task) => task.type)).toEqual(expect.arrayContaining(
      sourceGatedTypes.filter(hasTaskType),
    ));
    expect(FRENCH_LESSON_CONTENT_DAILY_TASK_TYPES).toContain('daily_active');
    expect(targetScoped.every((task) => dailyTaskAvailableForStudyTarget(task, 'en'))).toBe(true);
    expect(targetScoped.every((task) => dailyTaskAvailableForStudyTarget(task, 'es'))).toBe(true);
    expect(unavailable.every((task) => !dailyTaskAvailableForStudyTarget(task, 'fr'))).toBe(true);
    expect(sourceGated.every((task) => dailyTaskAvailableForStudyTarget(task, 'fr'))).toBe(true);
    expect(dailyTaskAvailableForStudyTarget(byId('dpr1'), 'fr')).toBe(false);
    expect(dailyTaskAvailableForStudyTarget(byId('dps1'), 'fr')).toBe(false);
    expect(dailyTaskAvailableForStudyTarget(byId('inv1'), 'fr')).toBe(true);
  });

  it('keeps the French daily task list full without replacing live challenge slots', () => {
    const original = [byId('da1'), byId('ta1'), byId('cs1'), byId('lnm1'), byId('inv1')];
    const filtered = filterDailyTasksForStudyTarget(original, 'fr');

    expect(filtered).toHaveLength(original.length);
    expect(filtered.every((task) => dailyTaskAvailableForStudyTarget(task, 'fr'))).toBe(true);
    expect(new Set(filtered.map((task) => task.id)).size).toBe(filtered.length);
    expect(filtered.map((task) => task.id)).toEqual(original.map((task) => task.id));
    expect(filtered.map((task) => task.type)).toEqual(original.map((task) => task.type));
  });

  it('wires home and the daily task screen to the active study target', () => {
    const home = fs.readFileSync(path.join(repoRoot, 'app', '(tabs)', 'home.tsx'), 'utf8');
    const dailyScreen = fs.readFileSync(path.join(repoRoot, 'app', 'daily_tasks_screen.tsx'), 'utf8');
    const layout = fs.readFileSync(path.join(repoRoot, 'app', '_layout.tsx'), 'utf8');
    const notifications = fs.readFileSync(path.join(repoRoot, 'app', 'notifications.ts'), 'utf8');
    const dailyPhraseCard = fs.readFileSync(path.join(repoRoot, 'components', 'DailyPhraseCard.tsx'), 'utf8');

    expect(home).toContain('getTodayTasksSafe(studyTarget)');
    expect(home).toContain('loadTodayProgress(taskList, studyTarget)');
    expect(home).toContain('visibleQuickItems');
    expect(home).toContain('const visibleQuickItems = quickItems');
    // зачем: ассерт убран — проверял код, снятый вместе с квизами/Ареной (в репо его нет).
    expect(home).not.toContain('const visibleActivityQuickItems = activityQuickItems');
    expect(home).toContain('testID="home-activity-daily"');
    expect(home).not.toContain("key: 'attest'");
    expect(home).not.toContain("activityQuickItems.filter((item) => item.key !== 'attest')");
    expect(home).toContain('<DailyPhraseCard variant="homeAdditional" homeCardVisible={dailyPhraseCardVisible} />');
    expect(home).not.toContain("studyTarget !== 'fr' && <DailyPhraseCard");
    expect(home).not.toContain("studyTarget !== 'fr' ? <DailyPhraseCard");

    // зачем: строки про app/(tabs)/quizzes.tsx убраны — экран удалён вместе с квизами.

    expect(dailyScreen).toContain('useStudyTarget');
    expect(dailyScreen).toContain('getTodayTasksSafe(studyTarget)');
    expect(dailyScreen).toContain('loadTodayProgress(list, studyTarget)');
    expect(dailyScreen).toContain('getDailyRerollsLeftToday(studyTarget)');
    expect(dailyScreen).toContain('const backupTaskList = filterDailyTasksForStudyTarget(getTodayTasks(), studyTarget)');
    expect(dailyScreen).not.toContain('fallbackToEnglish');
    expect(dailyScreen).not.toContain('englishFallback');
    expect(dailyScreen).not.toContain('studyTarget: \'en\'');
    expect(dailyScreen).toContain('rerollDailyTask(target.id, studyTarget)');
    expect(dailyScreen).toContain('dailyTaskAvailableForStudyTarget(task, studyTarget)');
    expect(dailyScreen).toContain('primeLessonScreenFromStorage(lessonId, studyTarget)');
    expect(dailyScreen).not.toContain('quizNavLevelKey(studyTarget)');

    const dailyNavigation = fs.readFileSync(path.join(repoRoot, 'app', 'daily_task_navigation.ts'), 'utf8');
    expect(dailyNavigation).toContain('dailyTaskAvailableForStudyTarget(task, studyTarget)');
    expect(dailyNavigation).not.toContain('openQuizOrFrenchGate');
    expect(dailyNavigation).not.toContain('quizContentAvailableForTarget');
    expect(dailyNavigation).not.toContain("router.replace('/quizzes_screen' as any)");
    expect(dailyNavigation).not.toContain('quizNavLevelKey(studyTarget)');
    expect(dailyNavigation).not.toContain("AsyncStorage.setItem('quiz_nav_level'");

    expect(layout).toContain('primeAllLessonsFromStorageOnAppLaunch(studyTarget)');

    expect(notifications).toContain('getStoredStudyTarget(lang)');
    expect(notifications).toContain("if (storageStudyTarget(studyTarget) === 'fr')");
    expect(notifications).toContain("cancelScheduledNotificationsByType(N, ['phrase_of_day'])");
    expect(notifications).toContain("AsyncStorage.removeItem('phrase_notif_scheduled')");

    expect(dailyPhraseCard).toContain("import { useStudyTarget } from './StudyTargetContext'");
    expect(dailyPhraseCard).toContain("import {\n  dailyPhraseContentAvailableForTarget,\n  frenchDailyPhraseGateCopy,\n} from '../app/daily_phrase_target_gate'");
    expect(dailyPhraseCard).toContain('const dailyPhraseGateOpen = dailyPhraseContentAvailableForTarget(studyTarget)');
    expect(dailyPhraseCard).toContain('getTodayPhraseSyncForTarget(studyTarget, lang)');
    expect(dailyPhraseCard).toContain('getTodayPhraseForTarget(studyTarget, lang)');
    expect(dailyPhraseCard).not.toContain('subscribeTodayPhraseForTarget(');
    expect(dailyPhraseCard).toContain('setPhrase(null)');
    expect(dailyPhraseCard).toContain('const dailyPhraseGateOpen = dailyPhraseContentAvailableForTarget(studyTarget)');
    expect(dailyPhraseCard).not.toContain("if (studyTarget === 'fr')");
    expect(dailyPhraseCard.indexOf('if (!dailyPhraseGateOpen)')).toBeLessThan(
      dailyPhraseCard.indexOf('dailyPhraseCopyForLang(phrase, phraseLang)'),
    );
    expect(dailyPhraseCard).toContain("updateMultipleTaskProgress([{ type: 'daily_phrase_read', increment: 1 }], { studyTarget })");
    expect(dailyPhraseCard).toContain('studyTarget={studyTarget}');
  });

  it('keeps daily task writers aligned with the active study target', () => {
    const dailyTasks = fs.readFileSync(path.join(repoRoot, 'app', 'daily_tasks.ts'), 'utf8');
    const dailyScreen = fs.readFileSync(path.join(repoRoot, 'app', 'daily_tasks_screen.tsx'), 'utf8');
    const lesson = fs.readFileSync(path.join(repoRoot, 'app', 'lesson1.tsx'), 'utf8');
    const review = fs.readFileSync(path.join(repoRoot, 'app', 'review.tsx'), 'utf8');
    const trainerWords = fs.readFileSync(path.join(repoRoot, 'app', 'trainer_words_session.tsx'), 'utf8');
    const trainerPhrases = fs.readFileSync(path.join(repoRoot, 'app', 'trainer_phrases_session.tsx'), 'utf8');
    const flashcards = fs.readFileSync(path.join(repoRoot, 'app', 'flashcards_collection.tsx'), 'utf8');

    expect(dailyTasks).toContain('getTodayTasksSafe(opts?.studyTarget)');
    expect(dailyTasks).toContain('loadTodayProgress(tasks, opts?.studyTarget)');
    expect(dailyTasks).toContain('getTodayTasksSafe(studyTarget)');
    expect(dailyTasks).toContain('dailyTasksProgressKey(getTodayKey(), studyTarget)');
    expect(dailyTasks).toContain('dailyTasksRerollKey(studyTarget)');
    expect(dailyTasks).toContain('loadRerollStateRaw(studyTarget)');
    expect(dailyTasks).toContain('studyTarget?: RuntimeStudyTarget');

    expect(lesson).toContain('{ studyTarget: studyTargetRef.current }');
    expect(lesson).toContain('dailyTaskLessonVisitedKey(');
    expect(lesson).toContain('studyTargetRef.current,');
    expect(lesson).toContain('resetAndUpdateTaskProgress(');
    expect(lesson).toContain('studyTargetRef.current,');
    expect(review).toContain('{ studyTarget }');
    expect(trainerWords).toContain('updateMultipleTaskProgress(updates, { studyTarget })');
    expect(trainerPhrases).toContain('updateMultipleTaskProgress(updates, { studyTarget })');
    expect(flashcards).toContain('updateMultipleTaskProgress(updates, { studyTarget })');
  });
});
